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
    { base: '#c92f70', mid: '#f16b9e', tip: '#ffd0e2', center: '#fff0a8', glow: '#ff8dbb' },
    { base: '#74429b', mid: '#b77ad0', tip: '#f2d8ff', center: '#ffe7a1', glow: '#d8a0ff' },
    { base: '#d87542', mid: '#f5a16e', tip: '#ffe0ad', center: '#fff3c0', glow: '#ffc18a' },
    { base: '#b84c78', mid: '#e98eaf', tip: '#ffe0eb', center: '#fff0a8', glow: '#f5a9ca' },
    { base: '#557eae', mid: '#85b8dc', tip: '#e0f5ff', center: '#fff0a8', glow: '#a8dcff' },
    { base: '#a64d67', mid: '#dc8293', tip: '#ffe0d9', center: '#fff0a8', glow: '#ffb2bd' }
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
      this.startX = x + (Math.random() - .5) * Math.min(42, width * .06);
      this.startY = height + 16;
      this.growth = 0;
      this.bloom = 0;
      this.sway = Math.random() * Math.PI * 2;
      this.palette = palettes[Math.floor(Math.random() * palettes.length)];
      this.petalCount = 6 + Math.floor(Math.random() * 3);
      this.length = 22 + Math.random() * 15;
      this.petalWidth = this.length * .56;
      this.curve = (Math.random() - .5) * Math.min(78, width * .1);

      this.leaves = [
        { at: .36 + Math.random() * .1, size: 14 + Math.random() * 7, side: -1 },
        { at: .63 + Math.random() * .1, size: 13 + Math.random() * 7, side: 1 }
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

      return {
        x: px,
        y: py,
        angle: Math.atan2(dy, dx)
      };
    }

    update(dt, time) {
      if (this.growth < 1) {
        this.growth = Math.min(1, this.growth + .018 * dt);
      } else if (this.bloom < 1) {
        this.bloom = Math.min(1, this.bloom + .023 * dt);

        if (!this.pollenDone && this.bloom > .35) {
          this.pollenDone = true;

          for (let i = 0; i < 9; i++) {
            particles.push(new Pollen(this.x, this.y, this.palette.tip));
          }
        }
      }

      this.sway = time * .00055 + this.x * .008;
    }

    draw(time) {
      const t = this.growth;
      const tip = this.point(t);
      const controlX = (this.startX + this.x) / 2 + this.curve;
      const controlY = (this.startY + this.y) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);
      ctx.quadraticCurveTo(controlX, controlY, tip.x, tip.y);

      const stem = ctx.createLinearGradient(
        this.startX, this.startY, tip.x, tip.y
      );

      stem.addColorStop(0, '#173d31');
      stem.addColorStop(1, '#73b879');

      ctx.strokeStyle = stem;
      ctx.lineWidth = 3.3 - 1.3*t;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      this.leaves.forEach(leaf => {
        if (t > leaf.at) {
          const p = this.point(leaf.at);
          this.drawLeaf(
            p.x,
            p.y,
            p.angle + leaf.side * .92,
            leaf.size
          );
        }
      });

      if (t >= 1 && this.bloom > 0) {
        const eased = Math.sin(this.bloom * Math.PI / 2);

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.sway) * .045);

        const len = this.length * eased;
        const wid = this.petalWidth * eased;

        for (let i = 0; i < this.petalCount; i++) {
          this.drawPetal(i * Math.PI * 2 / this.petalCount, len, wid);
        }

        for (let i = 0; i < this.petalCount; i++) {
          this.drawPetal(
            i * Math.PI * 2 / this.petalCount + Math.PI / this.petalCount,
            len * .72,
            wid * .66,
            .9
          );
        }

        this.drawCenter(len * .27);
        ctx.restore();
      }
    }

    drawLeaf(x, y, angle, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.bezierCurveTo(
        size*.45, -size*.55,
        size*1.05, -size*.28,
        size*1.25, 0
      );
      ctx.bezierCurveTo(
        size*1.05, size*.28,
        size*.45, size*.55,
        0, 0
      );

      const g = ctx.createLinearGradient(0,0,size*1.25,0);
      g.addColorStop(0,'#286747');
      g.addColorStop(.65,'#65a86d');
      g.addColorStop(1,'#b3d69b');

      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.quadraticCurveTo(size*.6,-size*.04,size*1.1,0);
      ctx.strokeStyle = 'rgba(235,255,224,.45)';
      ctx.lineWidth = .8;
      ctx.stroke();

      ctx.restore();
    }

    drawPetal(angle, length, w, alpha = 1) {
      ctx.save();
      ctx.rotate(angle);
      ctx.globalAlpha = alpha;

      const g = ctx.createLinearGradient(0,0,0,length);
      g.addColorStop(0,this.palette.base);
      g.addColorStop(.55,this.palette.mid);
      g.addColorStop(1,this.palette.tip);

      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.bezierCurveTo(
        -w*.9, length*.32,
        -w, length*.82,
        0, length
      );
      ctx.bezierCurveTo(
        w, length*.82,
        w*.9, length*.32,
        0, 0
      );

      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.glow;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.restore();
    }

    drawCenter(r) {
      if (r <= 0) return;

      ctx.save();
      ctx.beginPath();
      ctx.arc(0,0,r,0,Math.PI*2);

      const g = ctx.createRadialGradient(
        -r*.25, -r*.3, 0,
        0, 0, r
      );

      g.addColorStop(0,'#fffef0');
      g.addColorStop(.55,this.palette.center);
      g.addColorStop(1,'#d98b4b');

      ctx.fillStyle = g;
      ctx.shadowColor = this.palette.center;
      ctx.shadowBlur = 12;
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        const d = r * 1.28;

        ctx.beginPath();
        ctx.arc(
          Math.cos(a)*d,
          Math.sin(a)*d,
          1.25,
          0,
          Math.PI*2
        );

        ctx.fillStyle = '#fff9e6';
        ctx.shadowBlur = 5;
        ctx.fill();
      }

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
