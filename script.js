(() => {
  const gardenCanvas = document.getElementById('gardenCanvas');
  const natureCanvas = document.getElementById('natureCanvas');
  const ctx = gardenCanvas.getContext('2d');
  const nctx = natureCanvas.getContext('2d');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const enterBtn = document.getElementById('enterBtn');
  const gardenUI = document.getElementById('gardenUI');
  const instruction = document.getElementById('instruction');
  const clearBtn = document.getElementById('clearBtn');
  const autoBtn = document.getElementById('autoBtn');
  const soundBtn = document.getElementById('soundBtn');

  let flowers = [];
  let particles = [];
  let fireflies = [];
  let butterflies = [];
  let autoBloomTimer = null;
  let autoBlooming = false;
  let entered = false;
  let width = 0, height = 0, dpr = 1, lastTime = 0;

  const palettes = [
    { base: '#ff315f', mid: '#ff694f', tip: '#ffb15f', center: '#ffdc68', glow: '#ff5578', shade: '#a91654' },
    { base: '#a52cff', mid: '#d34cff', tip: '#f39bff', center: '#ffd86b', glow: '#c04cff', shade: '#6415ad' },
    { base: '#f02b9a', mid: '#ff5cbb', tip: '#ffb1dc', center: '#ffe17b', glow: '#ff65c2', shade: '#9b1b75' },
    { base: '#ff4b36', mid: '#ff8050', tip: '#ffd078', center: '#ffe17b', glow: '#ff704d', shade: '#a92736' },
    { base: '#7435dc', mid: '#a95bff', tip: '#e1a5ff', center: '#ffdf72', glow: '#a96aff', shade: '#45209a' },
    { base: '#ff3f78', mid: '#ff7e9c', tip: '#ffd0d9', center: '#ffe27a', glow: '#ff789e', shade: '#a91d59' },
    { base: '#ec5b24', mid: '#ff9840', tip: '#ffda78', center: '#ffe77e', glow: '#ff9b4d', shade: '#a83a24' }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;

    [gardenCanvas, natureCanvas].forEach(canvas => {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
    });

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedNature();
  }

  window.addEventListener('resize', resize, { passive: true });

  class Pollen {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - .5) * 1.1;
      this.vy = -Math.random() * 1.2 - .35;
      this.size = Math.random() * 2 + .7;
      this.alpha = 1;
      this.color = color;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.alpha -= .012 * dt;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 9;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Flower {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.startX = x + (Math.random() - .5) * Math.min(58, width * .075);
      this.startY = height + 18;
      this.growth = 0;
      this.bloom = 0;
      this.sway = Math.random() * Math.PI * 2;
      this.palette = palettes[Math.floor(Math.random() * palettes.length)];

      // Each click grows a tall, delicate wildflower instead of a tiny round rosette.
      this.form = Math.random();
      this.petalCount = 5 + Math.floor(Math.random() * 2);
      this.length = 35 + Math.random() * 19;
      this.petalWidth = 13 + Math.random() * 7;
      this.headTilt = (Math.random() - .5) * .55;
      this.curve = (Math.random() - .5) * Math.min(105, width * .13);
      this.seed = Math.random() * 10;
      this.leaves = [
        { at: .24 + Math.random() * .08, size: 20 + Math.random() * 11, side: -1 },
        { at: .43 + Math.random() * .09, size: 22 + Math.random() * 12, side: 1 },
        { at: .64 + Math.random() * .08, size: 16 + Math.random() * 10, side: -1 }
      ];
      this.pollenDone = false;
    }

    point(t) {
      const cx = (this.startX + this.x) / 2 + this.curve;
      const cy = (this.startY + this.y) / 2;
      const u = 1 - t;
      const px = u*u*this.startX + 2*u*t*cx + t*t*this.x;
      const py = u*u*this.startY + 2*u*t*cy + t*t*this.y;
      const dx = 2*u*(cx-this.startX) + 2*t*(this.x-cx);
      const dy = 2*u*(cy-this.startY) + 2*t*(this.y-cy);
      return { x: px, y: py, angle: Math.atan2(dy, dx) };
    }

    update(dt, time) {
      if (this.growth < 1) {
        this.growth = Math.min(1, this.growth + .016 * dt);
      } else if (this.bloom < 1) {
        this.bloom = Math.min(1, this.bloom + .022 * dt);
        if (!this.pollenDone && this.bloom > .45) {
          this.pollenDone = true;
          for (let i = 0; i < 8; i++) {
            particles.push(new Pollen(this.x, this.y, this.palette.tip));
          }
        }
      }
      this.sway = time * .00055 + this.seed;
    }

    draw(time) {
      const t = this.growth;
      const tip = this.point(t);
      const controlX = (this.startX + this.x) / 2 + this.curve;
      const controlY = (this.startY + this.y) / 2;

      // Thin, naturally bending stem with a light-catching edge.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.quadraticCurveTo(controlX, controlY, tip.x, tip.y);
      const stem = ctx.createLinearGradient(this.startX, this.startY, tip.x, tip.y);
      stem.addColorStop(0, '#173d2b');
      stem.addColorStop(.48, '#347a42');
      stem.addColorStop(1, '#83b96c');
      ctx.strokeStyle = stem;
      ctx.lineWidth = 2.1;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.startX - 1, this.startY);
      ctx.quadraticCurveTo(controlX - 1, controlY, tip.x - 1, tip.y);
      ctx.strokeStyle = 'rgba(190,229,154,.24)';
      ctx.lineWidth = .7;
      ctx.stroke();
      ctx.restore();

      this.leaves.forEach(leaf => {
        if (t > leaf.at) {
          const p = this.point(leaf.at);
          this.drawLeaf(p.x, p.y, p.angle + leaf.side * 1.05, leaf.size);
        }
      });

      if (t >= 1 && this.bloom > 0) {
        const eased = Math.sin(this.bloom * Math.PI / 2);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.sway) * .055 + this.headTilt);
        const len = this.length * eased;
        const wid = this.petalWidth * eased;

        // A tiny green calyx joins the flower head naturally to its stem.
        ctx.fillStyle = '#477d43';
        ctx.beginPath();
        ctx.ellipse(0, 5 * eased, 7 * eased, 3 * eased, 0, 0, Math.PI * 2);
        ctx.fill();

        const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, len * 1.8);
        halo.addColorStop(0, this.rgba(this.palette.glow, .2));
        halo.addColorStop(1, this.rgba(this.palette.glow, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, len * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Five or six broad, softly pointed petals create the loose flower shape
        // seen in the reference: bright, open and slightly irregular.
        for (let i = 0; i < this.petalCount; i++) {
          const angle = (i - (this.petalCount - 1) / 2) * .43;
          this.drawWildPetal(angle, len, wid, i);
        }

        // A smaller inner layer adds a little fullness without making a rosette.
        for (let i = 0; i < 3; i++) {
          this.drawWildPetal((i - 1) * .48 + .12, len * .68, wid * .66, i + 2, true);
        }

        this.drawCenter(Math.max(2.2, len * .075));
        ctx.restore();
      }
    }

    rgba(hex, alpha) {
      const n = parseInt(hex.replace('#', ''), 16);
      return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
    }

    drawLeaf(x, y, angle, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.shadowColor = 'rgba(12,55,28,.28)';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size*.35, -size*.72, size*1.1, -size*.46, size*1.55, 0);
      ctx.bezierCurveTo(size*1.1, size*.42, size*.35, size*.55, 0, 0);
      const g = ctx.createLinearGradient(0, -size*.4, size*1.5, size*.2);
      g.addColorStop(0, '#17472c');
      g.addColorStop(.5, '#438c4c');
      g.addColorStop(1, '#a4cc79');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size*.75, -size*.05, size*1.45, 0);
      ctx.strokeStyle = 'rgba(224,255,207,.62)';
      ctx.lineWidth = .85;
      ctx.stroke();
      ctx.restore();
    }

    drawWildPetal(angle, length, w, index, inner = false) {
      ctx.save();
      ctx.rotate(angle);
      const lean = (index % 2 ? 1 : -1) * length * .07;
      const g = ctx.createLinearGradient(0, -length*.12, lean, length);
      g.addColorStop(0, this.palette.shade);
      g.addColorStop(.3, this.palette.base);
      g.addColorStop(.72, this.palette.mid);
      g.addColorStop(1, this.palette.tip);

      // Slightly uneven petal tips keep the bloom from looking mechanically perfect.
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.bezierCurveTo(-w*.95, -length*.16, -w*1.05 + lean, length*.43, lean, length);
      ctx.bezierCurveTo(w*1.05 + lean, length*.48, w*.9, -length*.14, 0, 1);
      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.glow;
      ctx.shadowBlur = inner ? 5 : 9;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Soft central vein and a glossy highlight on every petal.
      ctx.beginPath();
      ctx.moveTo(0, length*.08);
      ctx.quadraticCurveTo(lean*.25, length*.48, lean, length*.88);
      ctx.strokeStyle = 'rgba(255,255,255,.32)';
      ctx.lineWidth = .8;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-w*.2, length*.38, w*.13, length*.2, -.12, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.12)';
      ctx.fill();
      ctx.restore();
    }

    drawCenter(r) {
      ctx.save();
      const g = ctx.createRadialGradient(-r*.3, -r*.3, .2, 0, 0, r*1.4);
      g.addColorStop(0, '#fff6bd');
      g.addColorStop(.55, this.palette.center);
      g.addColorStop(1, '#d98532');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.center;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  class Firefly {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.phase = Math.random() * Math.PI * 2;
      this.speed = .12 + Math.random() * .25;
      this.size = 1 + Math.random() * 1.5;
      this.drift = (Math.random() - .5) * .22;

      if (!initial && this.y < -10) {
        this.y = height + 10;
      }
    }

    update(dt) {
      this.phase += .035 * dt;
      this.x += this.drift * dt;
      this.y -= this.speed * dt;

      if (
        this.y < -12 ||
        this.x < -15 ||
        this.x > width + 15
      ) {
        this.reset();
      }
    }

    draw() {
      const glow = .35 + (Math.sin(this.phase) + 1) * .3;

      nctx.save();
      nctx.globalAlpha = glow;
      nctx.fillStyle = '#ffe9a5';
      nctx.shadowColor = '#ffdf83';
      nctx.shadowBlur = 15;

      nctx.beginPath();
      nctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      nctx.fill();

      nctx.restore();
    }
  }

  class Butterfly {
    constructor() {
      this.x = Math.random() * width;
      this.y = height*.25 + Math.random() * height*.5;
      this.phase = Math.random() * 6;
      this.speed = .25 + Math.random() * .28;
      this.scale = .65 + Math.random() * .45;
      this.hue = Math.random() > .5 ? '#f6b6d6' : '#cbb7f3';
    }

    update(dt) {
      this.phase += .09 * dt;
      this.x += Math.cos(this.phase*.25)*.55*dt + this.speed*dt;
      this.y += Math.sin(this.phase*.7)*.34*dt;

      if (this.x > width + 45) {
        this.x = -35;
        this.y = height*.25 + Math.random()*height*.5;
      }
    }

    draw() {
      const flap = Math.abs(Math.sin(this.phase))*7 + 2;

      nctx.save();
      nctx.translate(this.x,this.y);
      nctx.scale(this.scale,this.scale);
      nctx.fillStyle = this.hue;
      nctx.shadowColor = this.hue;
      nctx.shadowBlur = 10;

      nctx.beginPath();
      nctx.ellipse(-flap*.45,0,flap,5,-.35,0,Math.PI*2);
      nctx.fill();

      nctx.beginPath();
      nctx.ellipse(flap*.45,0,flap,5,.35,0,Math.PI*2);
      nctx.fill();

      nctx.strokeStyle = 'rgba(255,245,255,.8)';
      nctx.lineWidth = 1.2;
      nctx.beginPath();
      nctx.moveTo(0,-3);
      nctx.lineTo(0,4);
      nctx.stroke();

      nctx.restore();
    }
  }

  function seedNature() {
    fireflies = Array.from(
      {
        length: Math.min(
          42,
          Math.max(18, Math.floor(width*height/26000))
        )
      },
      () => new Firefly()
    );

    butterflies = Array.from(
      { length: width < 600 ? 2 : 4 },
      () => new Butterfly()
    );
  }

  function addFlower(x,y) {
    flowers.push(new Flower(x,y));

    instruction.textContent = flowers.length === 1
      ? 'Your first flower is beginning to bloom. Keep going.'
      : `${flowers.length} little blooms are growing in your garden.`;

    document.getElementById('gardenTip').classList.add('tip-faded');
  }

  function stopAutoBloom() {
    autoBlooming = false;
    clearInterval(autoBloomTimer);
    autoBloomTimer = null;

    autoBtn.classList.remove('active');
    autoBtn.setAttribute('aria-pressed','false');
    autoBtn.querySelector('span:last-child').textContent = 'Auto bloom';
  }

  gardenCanvas.addEventListener('pointerdown', event => {
    if (!entered) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    addFlower(event.clientX, event.clientY);
  });

  enterBtn.addEventListener('click', () => {
    entered = true;
    welcomeScreen.classList.add('is-hidden');
    gardenUI.classList.add('is-visible');

    setTimeout(() => {
      welcomeScreen.setAttribute('aria-hidden','true');
    },950);
  });

  autoBtn.addEventListener('click', () => {
    if (autoBlooming) {
      stopAutoBloom();
      return;
    }

    autoBlooming = true;
    autoBtn.classList.add('active');
    autoBtn.setAttribute('aria-pressed','true');
    autoBtn.querySelector('span:last-child').textContent = 'Pause bloom';

    autoBloomTimer = setInterval(() => {
      const margin = Math.min(55,width*.12);

      addFlower(
        margin + Math.random() * (width-margin*2),
        height*.38 + Math.random() * height*.42
      );
    },520);
  });

  clearBtn.addEventListener('click', () => {
    flowers = [];
    particles = [];

    instruction.textContent = 'A fresh little beginning. Tap anywhere to plant a flower.';
    document.getElementById('gardenTip').classList.remove('tip-faded');

    stopAutoBloom();
  });

  // No audio file is bundled in this version.
  soundBtn.addEventListener('click', () => {
    soundBtn.title = 'Ambient music is not included in this version.';
    soundBtn.innerHTML = '♫ <span>Sound off</span>';
  });

  function drawAtmosphere(time) {
    nctx.clearRect(0,0,width,height);

    // Tiny stars
    for (let i = 0; i < 46; i++) {
      const x = (i*197.3) % width;
      const y = (i*113.7) % Math.max(1,height*.72);
      const twinkle = .18 + (Math.sin(time*.001+i*2)*.5+.5)*.35;

      nctx.globalAlpha = twinkle;
      nctx.fillStyle = '#f8eaff';
      nctx.beginPath();
      nctx.arc(x,y,(i%4===0)?1.15:.65,0,Math.PI*2);
      nctx.fill();
    }

    nctx.globalAlpha = 1;

    fireflies.forEach(f => {
      f.update(frameDelta);
      f.draw();
    });

    butterflies.forEach(b => {
      b.update(frameDelta);
      b.draw();
    });
  }

  let frameDelta = 1;

  function animate(time = 0) {
    frameDelta = Math.min(
      2.2,
      Math.max(.35,(time-lastTime)/16.67 || 1)
    );

    lastTime = time;

    ctx.clearRect(0,0,width,height);

    flowers.forEach(f => {
      f.update(frameDelta,time);
      f.draw(time);
    });

    particles = particles.filter(p => p.alpha > 0);

    particles.forEach(p => {
      p.update(frameDelta);
      p.draw();
    });

    drawAtmosphere(time);
    requestAnimationFrame(animate);
  }

  resize();
  requestAnimationFrame(animate);
})();
