
(() => {
  const gardenCanvas = document.getElementById('gardenCanvas');
  const natureCanvas = document.getElementById('natureCanvas');
  if (!gardenCanvas || !natureCanvas) return;

  const ctx = gardenCanvas.getContext('2d');
  const nctx = natureCanvas.getContext('2d');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const enterBtn = document.getElementById('enterBtn');
  const gardenUI = document.getElementById('gardenUI');
  const instruction = document.getElementById('instruction');
  const clearBtn = document.getElementById('clearBtn');
  const autoBtn = document.getElementById('autoBtn');
  const soundBtn = document.getElementById('soundBtn');

  let width = 0, height = 0, dpr = 1, lastTime = 0, dt = 1;
  let flowers = [], fireflies = [], grass = [], autoBloomTimer = null;
  let autoBlooming = false, entered = false;

  const cyan = {
    deep: '#087b83', mid: '#36c3c2', light: '#9af5e9',
    edge: '#d4fff4', stem: '#247e62',
    leafDark: '#07565a', leaf: '#128b83', leafLight: '#5bd4b0'
  };

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
    makeGrass();
    makeFireflies();
  }

  window.addEventListener('resize', resize, { passive: true });

  function makeGrass() {
    grass = [];
    const count = Math.max(38, Math.floor(width / 13));

    for (let i = 0; i < count; i++) {
      const side = i % 2 ? -1 : 1;
      const edgeX = side < 0
        ? Math.random() * width * .24
        : width * (.76 + Math.random() * .24);

      grass.push({
        x: edgeX,
        y: height + 8,
        h: 38 + Math.random() * Math.min(145, height * .22),
        bend: (Math.random() - .5) * 55,
        w: .8 + Math.random() * 1.3,
        phase: Math.random() * 6.28,
        color: ['#155d43', '#1c805b', '#347d50', '#0d5148'][i % 4]
      });
    }
  }

  function drawGrass(time) {
    nctx.save();

    grass.forEach(g => {
      const sway = Math.sin(time * .00055 + g.phase) * 5;

      nctx.beginPath();
      nctx.moveTo(g.x, g.y);
      nctx.quadraticCurveTo(
        g.x + g.bend + sway,
        g.y - g.h * .55,
        g.x + g.bend * .55 + sway,
        g.y - g.h
      );

      nctx.strokeStyle = g.color;
      nctx.lineWidth = g.w;
      nctx.lineCap = 'round';
      nctx.shadowColor = '#1d8d65';
      nctx.shadowBlur = 5;
      nctx.stroke();
    });

    nctx.restore();
  }

  class Firefly {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height * .82;
      this.phase = Math.random() * 6.28;
      this.speed = .08 + Math.random() * .18;
      this.size = .7 + Math.random() * 1.25;
    }

    update() {
      this.phase += .025 * dt;
      this.y -= this.speed * dt;
      this.x += Math.sin(this.phase * .4) * .12 * dt;

      if (this.y < -8) {
        this.y = height + 5;
        this.x = Math.random() * width;
      }
    }

    draw() {
      const a = .15 + (Math.sin(this.phase) + 1) * .2;

      nctx.save();
      nctx.globalAlpha = a;
      nctx.fillStyle = '#b7ffe8';
      nctx.shadowColor = '#8affd8';
      nctx.shadowBlur = 9;
      nctx.beginPath();
      nctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      nctx.fill();
      nctx.restore();
    }
  }

  function makeFireflies() {
    fireflies = Array.from(
      { length: Math.min(34, Math.max(15, Math.floor(width * height / 30000))) },
      () => new Firefly()
    );
  }

  class Flower {
    constructor(x, headY, scale = 1) {
      this.x = x;
      this.headY = headY;
      this.scale = scale;
      this.baseY = height + 12;
      this.baseX = x + (Math.random() - .5) * 24;
      this.curve = (Math.random() - .5) * Math.min(34, width * .045);
      this.growth = 0;
      this.open = 0;
      this.phase = Math.random() * 6.28;
      this.rotation = (Math.random() - .5) * .25;

      this.leafCount = 8 + Math.floor(Math.random() * 5);

      this.leafData = Array.from({ length: this.leafCount }, (_, i) => ({
        t: .18 + i * (.66 / this.leafCount) + Math.random() * .035,
        side: i % 2 ? 1 : -1,
        size: (12 + Math.random() * 14) * scale,
        angle: (Math.random() - .5) * .35
      }));
    }

    stem(t) {
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.headY) / 2;
      const u = 1 - t;

      return {
        x: u*u*this.baseX + 2*u*t*cx + t*t*this.x,
        y: u*u*this.baseY + 2*u*t*cy + t*t*this.headY
      };
    }

    update(time) {
      this.growth = Math.min(1, this.growth + .012 * dt);

      if (this.growth >= 1) {
        this.open = Math.min(1, this.open + .018 * dt);
      }

      this.phase = time * .00048 + this.rotation;
    }

    draw(time) {
      const tip = this.stem(this.growth);
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.headY) / 2;
      const sway = Math.sin(this.phase) * 3.5;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.baseX, this.baseY);
      ctx.quadraticCurveTo(cx + sway, cy, tip.x + sway, tip.y);

      const stemGrad = ctx.createLinearGradient(
        this.baseX, this.baseY, tip.x, tip.y
      );

      stemGrad.addColorStop(0, '#124d3d');
      stemGrad.addColorStop(.55, '#258363');
      stemGrad.addColorStop(1, '#57b68c');

      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 2.7 * this.scale;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      this.leafData.forEach(leaf => {
        if (this.growth > leaf.t) {
          const p = this.stem(leaf.t);
          this.drawLeaf(
            p.x + sway * leaf.t,
            p.y,
            leaf.side,
            leaf.size,
            leaf.angle
          );
        }
      });

      if (this.open > 0) {
        ctx.save();
        ctx.translate(this.x + sway, this.headY);
        ctx.rotate(Math.sin(this.phase) * .035);
        this.drawFlowerHead(this.open);
        ctx.restore();
      }
    }

    drawLeaf(x, y, side, size, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(side * (0.65 + angle));

      const g = ctx.createLinearGradient(0, 0, size * 1.65, 0);
      g.addColorStop(0, cyan.leafDark);
      g.addColorStop(.52, cyan.leaf);
      g.addColorStop(1, cyan.leafLight);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        size*.45, -size*.72,
        size*1.25, -size*.52,
        size*1.65, 0
      );
      ctx.bezierCurveTo(
        size*1.25, size*.52,
        size*.45, size*.72,
        0, 0
      );

      ctx.fillStyle = g;
      ctx.shadowColor = '#0b8c83';
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(size*.8, -size*.05, size*1.58, 0);
      ctx.strokeStyle = 'rgba(174,255,225,.58)';
      ctx.lineWidth = .85;
      ctx.stroke();

      ctx.restore();
    }

    drawFlowerHead(amount) {
      const s = this.scale * Math.sin(amount * Math.PI / 2);
      const r = 28 * s;

      // Three wide, rounded cyan petals.
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(this.rotation + i * Math.PI * 2 / 3 - Math.PI / 2);
        ctx.translate(0, -r * .34);

        const grad = ctx.createLinearGradient(0, -r*.8, 0, r*.55);
        grad.addColorStop(0, '#c8fff2');
        grad.addColorStop(.42, '#75e6dc');
        grad.addColorStop(1, '#249eaa');

        ctx.beginPath();
        ctx.moveTo(0, r*.45);
        ctx.bezierCurveTo(-r*.95, r*.18, -r*.96, -r*.55, -r*.32, -r*.73);
        ctx.bezierCurveTo(-r*.05, -r*.83, 0, -r*.55, 0, -r*.43);
        ctx.bezierCurveTo(0, -r*.55, r*.05, -r*.83, r*.32, -r*.73);
        ctx.bezierCurveTo(r*.96, -r*.55, r*.95, r*.18, 0, r*.45);
        ctx.closePath();

        ctx.fillStyle = grad;
        ctx.shadowColor = '#63e9df';
        ctx.shadowBlur = 13;
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,255,247,.5)';
        ctx.lineWidth = .8;
        ctx.stroke();
        ctx.restore();
      }

      const center = ctx.createRadialGradient(-3*s, -5*s, 1, 0, 0, 9*s);
      center.addColorStop(0, '#f4fff0');
      center.addColorStop(.5, '#c9f5bd');
      center.addColorStop(1, '#e9c95f');

      ctx.beginPath();
      ctx.ellipse(0, 1*s, 7*s, 5*s, 0, 0, Math.PI*2);
      ctx.fillStyle = center;
      ctx.shadowColor = '#c9fff0';
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, -1*s, 2.5*s, 0, Math.PI*2);
      ctx.fillStyle = '#fff4a8';
      ctx.fill();
    }
  }

  function addFlower(x, y, scale) {
    flowers.push(new Flower(
      x, y, scale || (.82 + Math.random() * .32)
    ));

    if (instruction) {
      instruction.textContent = flowers.length === 1
        ? 'A little blue flower is blooming for you.'
        : `${flowers.length} little flowers are glowing in your garden.`;
    }

    const tip = document.getElementById('gardenTip');
    if (tip) tip.classList.add('tip-faded');
  }

  function plantReferenceGarden() {
    flowers = [];
    const mobile = width < 600;
    const baseY = height * (mobile ? .43 : .40);

    addFlower(width * .37, baseY + 12, mobile ? .78 : .9);
    addFlower(width * .50, baseY - 18, mobile ? .92 : 1.08);
    addFlower(width * .64, baseY + 4, mobile ? .82 : .96);

    if (instruction) {
      instruction.textContent = 'A little garden made just for you.';
    }
  }

  function stopAutoBloom() {
    autoBlooming = false;
    clearInterval(autoBloomTimer);
    autoBloomTimer = null;

    if (autoBtn) {
      autoBtn.classList.remove('active');
      autoBtn.setAttribute('aria-pressed', 'false');
      const label = autoBtn.querySelector('span:last-child');
      if (label) label.textContent = 'Auto bloom';
    }
  }

  gardenCanvas.addEventListener('pointerdown', event => {
    if (!entered) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    addFlower(event.clientX, event.clientY);
  });

  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      entered = true;
      welcomeScreen.classList.add('is-hidden');
      gardenUI.classList.add('is-visible');
      plantReferenceGarden();

      setTimeout(() => {
        welcomeScreen.setAttribute('aria-hidden', 'true');
      }, 950);
    });
  }

  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      if (autoBlooming) {
        stopAutoBloom();
        return;
      }

      autoBlooming = true;
      autoBtn.classList.add('active');
      autoBtn.setAttribute('aria-pressed', 'true');

      const label = autoBtn.querySelector('span:last-child');
      if (label) label.textContent = 'Pause bloom';

      autoBloomTimer = setInterval(() => {
        const margin = Math.min(45, width * .1);
        addFlower(
          margin + Math.random() * (width - margin * 2),
          height * (.36 + Math.random() * .28)
        );
      }, 950);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      flowers = [];

      if (instruction) {
        instruction.textContent = 'A quiet little garden. Tap anywhere to grow a flower.';
      }

      const tip = document.getElementById('gardenTip');
      if (tip) tip.classList.remove('tip-faded');

      stopAutoBloom();
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundBtn.title = 'Add an audio file to enable garden music.';
      soundBtn.innerHTML = '♫ <span>Sound off</span>';
    });
  }

  function drawAtmosphere(time) {
    nctx.clearRect(0, 0, width, height);
    drawGrass(time);

    for (let i = 0; i < 48; i++) {
      const x = (i * 197.3) % width;
      const y = (i * 113.7) % Math.max(1, height * .76);

      nctx.globalAlpha = .12 + (Math.sin(time * .001 + i * 2) * .5 + .5) * .25;
      nctx.fillStyle = '#a9ffe4';
      nctx.beginPath();
      nctx.arc(x, y, i % 5 === 0 ? 1.1 : .6, 0, Math.PI * 2);
      nctx.fill();
    }

    nctx.globalAlpha = 1;
    fireflies.forEach(f => {
      f.update();
      f.draw();
    });
  }

  function animate(time = 0) {
    dt = Math.min(2.2, Math.max(.35, (time - lastTime) / 16.67 || 1));
    lastTime = time;

    ctx.clearRect(0, 0, width, height);
    flowers.forEach(f => {
      f.update(time);
      f.draw(time);
    });

    drawAtmosphere(time);
    requestAnimationFrame(animate);
  }

  resize();
  requestAnimationFrame(animate);
})();
