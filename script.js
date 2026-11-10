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
    { base: '#a91e59', mid: '#e94f89', tip: '#ffd9e8', center: '#ffdc78', glow: '#ff8fbd', shade: '#68163d' },
    { base: '#70409b', mid: '#b47bd4', tip: '#f3e0ff', center: '#ffe18a', glow: '#d8a0ff', shade: '#452365' },
    { base: '#c95835', mid: '#f39a68', tip: '#ffe8c4', center: '#ffe58a', glow: '#ffb17d', shade: '#81341f' },
    { base: '#b93670', mid: '#e982ad', tip: '#ffe5f0', center: '#ffe58a', glow: '#f5a9cb', shade: '#762044' },
    { base: '#477baa', mid: '#83b9df', tip: '#e5f6ff', center: '#ffe58a', glow: '#a9dcff', shade: '#254b70' },
    { base: '#bd625b', mid: '#ed9b91', tip: '#ffe9df', center: '#ffe58a', glow: '#ffb6ae', shade: '#783b3b' },
    { base: '#c18b27', mid: '#f2c65e', tip: '#fff4cc', center: '#a85b2d', glow: '#ffe59a', shade: '#805719' }
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
      this.startX = x + (Math.random() - .5) * Math.min(34, width * .05);
      this.startY = height + 16;
      this.growth = 0;
      this.bloom = 0;
      this.sway = Math.random() * Math.PI * 2;
      this.palette = palettes[Math.floor(Math.random() * palettes.length)];

      // Different flower silhouettes make the garden feel less repetitive.
      this.form = ['dahlia', 'wildflower', 'peony'][Math.floor(Math.random() * 3)];
      this.petalCount = this.form === 'dahlia' ? 11 : this.form === 'peony' ? 9 : 7;
      this.length = this.form === 'peony'
        ? 25 + Math.random() * 15
        : 23 + Math.random() * 13;
      this.petalWidth = this.length * (this.form === 'wildflower' ? .43 : .57);
      this.curve = (Math.random() - .5) * Math.min(72, width * .09);
      this.rotation = Math.random() * Math.PI * 2;
      this.seed = Math.random() * 100;
      this.leaves = [
        { at: .31 + Math.random() * .1, size: 16 + Math.random() * 8, side: -1 },
        { at: .58 + Math.random() * .12, size: 15 + Math.random() * 9, side: 1 }
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
        this.growth = Math.min(1, this.growth + .017 * dt);
      } else if (this.bloom < 1) {
        this.bloom = Math.min(1, this.bloom + .019 * dt);
        if (!this.pollenDone && this.bloom > .42) {
          this.pollenDone = true;
          for (let i = 0; i < 13; i++) {
            particles.push(new Pollen(this.x, this.y, this.palette.tip));
          }
        }
      }
      this.sway = time * .00048 + this.seed;
    }

    draw(time) {
      const t = this.growth;
      const tip = this.point(t);
      const controlX = (this.startX + this.x) / 2 + this.curve;
      const controlY = (this.startY + this.y) / 2;

      // Stem with a soft highlight.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.quadraticCurveTo(controlX, controlY, tip.x, tip.y);
      const stem = ctx.createLinearGradient(this.startX, this.startY, tip.x, tip.y);
      stem.addColorStop(0, '#173b2b');
      stem.addColorStop(.5, '#397e4b');
      stem.addColorStop(1, '#91c77b');
      ctx.strokeStyle = stem;
      ctx.lineWidth = 3.5 - 1.2 * t;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(75,145,83,.25)';
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.restore();

      this.leaves.forEach(leaf => {
        if (t > leaf.at) {
          const p = this.point(leaf.at);
          this.drawLeaf(p.x, p.y, p.angle + leaf.side * .95, leaf.size);
        }
      });

      if (t >= 1 && this.bloom > 0) {
        const eased = Math.sin(this.bloom * Math.PI / 2);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.sway) * .045 + this.rotation * .04);

        const len = this.length * eased;
        const wid = this.petalWidth * eased;

        this.drawCalyx(len);

        // A soft halo behind each bloom gives it depth without looking neon.
        const halo = ctx.createRadialGradient(0, 0, 1, 0, 0, len * 2.2);
        halo.addColorStop(0, this.hexToRgba(this.palette.glow, .22));
        halo.addColorStop(1, this.hexToRgba(this.palette.glow, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(0, 0, len * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Back petals: slightly darker and broader.
        for (let i = 0; i < this.petalCount; i++) {
          const a = i * Math.PI * 2 / this.petalCount;
          this.drawPetal(a, len, wid, .92, true);
        }

        // Front petals overlap the back layer for a fuller flower.
        for (let i = 0; i < this.petalCount; i++) {
          const a = i * Math.PI * 2 / this.petalCount + Math.PI / this.petalCount;
          this.drawPetal(a, len * .79, wid * .76, 1, false);
        }

        if (this.form === 'peony') {
          for (let i = 0; i < 6; i++) {
            this.drawPetal(i * Math.PI * 2 / 6 + .25, len * .48, wid * .48, .96, false);
          }
        }

        this.drawCenter(len * (this.form === 'wildflower' ? .22 : .25));
        ctx.restore();
      }
    }

    hexToRgba(hex, alpha) {
      const value = hex.replace('#', '');
      const n = parseInt(value, 16);
      const r = (n >> 16) & 255;
      const g = (n >> 8) & 255;
      const b = n & 255;
      return `rgba(${r},${g},${b},${alpha})`;
    }

    drawCalyx(len) {
      ctx.save();
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-5, -len * .17, 0, -len * .4);
        ctx.quadraticCurveTo(5, -len * .17, 0, 0);
        const g = ctx.createLinearGradient(0, 0, 0, -len * .4);
        g.addColorStop(0, '#24563a');
        g.addColorStop(1, '#91bd72');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    drawLeaf(x, y, angle, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.shadowColor = 'rgba(15,65,34,.35)';
      ctx.shadowBlur = 7;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size*.4, -size*.65, size*1.05, -size*.4, size*1.35, 0);
      ctx.bezierCurveTo(size*1.05, size*.4, size*.4, size*.65, 0, 0);

      const g = ctx.createLinearGradient(0, -size*.4, size*1.35, size*.3);
      g.addColorStop(0, '#194a30');
      g.addColorStop(.48, '#4d9859');
      g.addColorStop(1, '#add88c');
      ctx.fillStyle = g;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size*.65, -size*.04, size*1.25, 0);
      ctx.strokeStyle = 'rgba(235,255,224,.62)';
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 1; i <= 3; i++) {
        const px = size * i * .27;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.16, -size*.17);
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.16, size*.17);
        ctx.strokeStyle = 'rgba(230,255,220,.28)';
        ctx.lineWidth = .7;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawPetal(angle, length, w, alpha = 1, backLayer = false) {
      ctx.save();
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(0, 0, 0, length);
      g.addColorStop(0, backLayer ? this.palette.shade : this.palette.base);
      g.addColorStop(.28, this.palette.base);
      g.addColorStop(.68, this.palette.mid);
      g.addColorStop(1, this.palette.tip);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-w*.78, length*.18, -w*1.05, length*.68, 0, length);
      ctx.bezierCurveTo(w*1.05, length*.68, w*.78, length*.18, 0, 0);
      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.glow;
      ctx.shadowBlur = backLayer ? 8 : 12;
      ctx.fill();

      // A fine vein and a translucent highlight make the petals feel softer.
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(0, length*.12);
      ctx.quadraticCurveTo(w*.04, length*.5, 0, length*.9);
      ctx.strokeStyle = 'rgba(255,255,255,.34)';
      ctx.lineWidth = .8;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-w*.17, length*.46, w*.15, length*.22, -.15, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.10)';
      ctx.fill();
      ctx.restore();
    }

    drawCenter(r) {
      if (r <= 0) return;
      ctx.save();

      const glow = ctx.createRadialGradient(0, 0, r*.2, 0, 0, r*2);
      glow.addColorStop(0, 'rgba(255,220,120,.42)');
      glow.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, r*2, 0, Math.PI*2);
      ctx.fill();

      const g = ctx.createRadialGradient(-r*.28, -r*.32, r*.06, 0, 0, r);
      g.addColorStop(0, '#fffbe3');
      g.addColorStop(.36, this.palette.center);
      g.addColorStop(.76, '#e7a34a');
      g.addColorStop(1, '#a65e31');
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.center;
      ctx.shadowBlur = 12;
      ctx.fill();

      // Fine pollen grains arranged in a natural spiral.
      ctx.shadowBlur = 0;
      for (let i = 0; i < 30; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i / 30) * r * .82;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*d, Math.sin(a)*d, .8 + (i%3)*.35, 0, Math.PI*2);
        ctx.fillStyle = i%2 ? '#fff5c7' : '#a96635';
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(-r*.18, -r*.2, r*.15, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,.62)';
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
