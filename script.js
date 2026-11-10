(() => {
  'use strict';

  const gardenCanvas = document.getElementById('gardenCanvas');
  const natureCanvas = document.getElementById('natureCanvas');
  const welcomeScreen = document.getElementById('welcomeScreen');
  const enterBtn = document.getElementById('enterBtn');
  const gardenUI = document.getElementById('gardenUI');
  const instruction = document.getElementById('instruction');
  const clearBtn = document.getElementById('clearBtn');
  const autoBtn = document.getElementById('autoBtn');
  const soundBtn = document.getElementById('soundBtn');

  if (!gardenCanvas || !natureCanvas) {
    console.error('Moonlit Bloom: Canvas not found.');
    return;
  }

  const ctx = gardenCanvas.getContext('2d');
  const nctx = natureCanvas.getContext('2d');

  if (!ctx || !nctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = 0;
  let frameDelta = 1;
  let entered = false;

  let flowers = [];
  let pollen = [];
  let fireflies = [];
  let butterflies = [];
  let grass = [];

  let autoBloomTimer = null;
  let autoBlooming = false;

  // Cosmos-inspired colours based on your reference image.
  const palettes = [
    {
      base: '#a92d78',
      mid: '#e653a5',
      light: '#ffacd7',
      line: 'rgba(126,28,87,.42)',
      center: '#f4a52c'
    },
    {
      base: '#70447e',
      mid: '#a66db0',
      light: '#d9a8dc',
      line: 'rgba(83,45,95,.42)',
      center: '#efa12b'
    },
    {
      base: '#e9dfc5',
      mid: '#fff8e8',
      light: '#fffdf6',
      line: 'rgba(165,145,105,.40)',
      center: '#eda02b'
    },
    {
      base: '#d85b91',
      mid: '#f28bb4',
      light: '#ffc4d8',
      line: 'rgba(151,53,94,.40)',
      center: '#f3a32b'
    }
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

    makeNature();
  }

  window.addEventListener('resize', resize, {
    passive: true
  });

  // Pollen particles
  class PollenParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;

      this.vx = (Math.random() - 0.5) * 1.0;
      this.vy = -0.35 - Math.random() * 1.0;

      this.size = 0.8 + Math.random() * 1.5;
      this.alpha = 0.9;
      this.color = color;
    }

    update() {
      this.x += this.vx * frameDelta;
      this.y += this.vy * frameDelta;
      this.alpha -= 0.012 * frameDelta;
    }

    draw() {
      ctx.save();

      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 7;

      ctx.beginPath();
      ctx.arc(
        this.x,
        this.y,
        this.size,
        0,
        Math.PI * 2
      );

      ctx.fill();
      ctx.restore();
    }
  }

  // Main botanical flower
  class Flower {
    constructor(x, y, paletteIndex, scale = 1) {
      this.x = x;
      this.y = y;
      this.scale = scale;

      this.startX =
        x + (Math.random() - 0.5) *
        Math.min(35, width * 0.045);

      this.startY = height + 18;

      this.growth = 0;
      this.bloom = 0;

      this.phase = Math.random() * Math.PI * 2;

      this.curve =
        (Math.random() - 0.5) *
        Math.min(58, width * 0.075);

      this.palette =
        palettes[
          (paletteIndex == null
            ? Math.floor(Math.random() * palettes.length)
            : paletteIndex) % palettes.length
        ];

      this.petalCount = 8 + Math.floor(Math.random() * 2);

      this.headSize =
        (30 + Math.random() * 5) * scale;

      this.pollenReleased = false;

      // Multiple narrow leaves along the stem.
      this.leaves = [];

      const leafCount = 7 + Math.floor(Math.random() * 3);

      for (let i = 0; i < leafCount; i++) {
        this.leaves.push({
          at:
            0.20 +
            i * (0.65 / leafCount) +
            Math.random() * 0.025,

          side: i % 2 === 0 ? -1 : 1,

          length:
            (17 + Math.random() * 12) * scale,

          angle: (Math.random() - 0.5) * 0.35
        });
      }
    }

    point(t) {
      const cx =
        (this.startX + this.x) / 2 + this.curve;

      const cy =
        (this.startY + this.y) / 2;

      const u = 1 - t;

      const px =
        u * u * this.startX +
        2 * u * t * cx +
        t * t * this.x;

      const py =
        u * u * this.startY +
        2 * u * t * cy +
        t * t * this.y;

      const dx =
        2 * u * (cx - this.startX) +
        2 * t * (this.x - cx);

      const dy =
        2 * u * (cy - this.startY) +
        2 * t * (this.y - cy);

      return {
        x: px,
        y: py,
        angle: Math.atan2(dy, dx)
      };
    }

    update() {
      if (this.growth < 1) {
        this.growth = Math.min(
          1,
          this.growth + 0.014 * frameDelta
        );
      } else if (this.bloom < 1) {
        this.bloom = Math.min(
          1,
          this.bloom + 0.025 * frameDelta
        );

        if (
          !this.pollenReleased &&
          this.bloom > 0.55
        ) {
          this.pollenReleased = true;

          for (let i = 0; i < 7; i++) {
            pollen.push(
              new PollenParticle(
                this.x,
                this.y,
                this.palette.light
              )
            );
          }
        }
      }

      this.phase += 0.004 * frameDelta;
    }

    draw() {
      const tip = this.point(this.growth);

      const controlX =
        (this.startX + this.x) / 2 + this.curve;

      const controlY =
        (this.startY + this.y) / 2;

      const sway =
        Math.sin(this.phase) * 1.7 * this.scale;

      // Curved green stem.
      ctx.save();

      ctx.beginPath();
      ctx.moveTo(this.startX, this.startY);

      ctx.quadraticCurveTo(
        controlX + sway,
        controlY,
        tip.x + sway,
        tip.y
      );

      const stemGradient = ctx.createLinearGradient(
        this.startX,
        this.startY,
        tip.x,
        tip.y
      );

      stemGradient.addColorStop(0, '#315c28');
      stemGradient.addColorStop(0.48, '#5e9639');
      stemGradient.addColorStop(1, '#88a94c');

      ctx.strokeStyle = stemGradient;
      ctx.lineWidth = 2.4 * this.scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.startX - 0.7, this.startY);

      ctx.quadraticCurveTo(
        controlX - 0.7 + sway,
        controlY,
        tip.x - 0.7 + sway,
        tip.y
      );

      ctx.strokeStyle = 'rgba(224,242,174,.42)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      ctx.restore();

      // Draw leaves.
      this.leaves.forEach(leaf => {
        if (this.growth > leaf.at) {
          const p = this.point(leaf.at);

          this.drawLeaf(
            p.x + sway * leaf.at,
            p.y,
            leaf
          );
        }
      });

      // Draw flower head.
      if (this.growth >= 1 && this.bloom > 0) {
        const open = Math.sin(
          this.bloom * Math.PI / 2
        );

        ctx.save();

        ctx.translate(
          this.x + sway,
          this.y
        );

        ctx.rotate(
          Math.sin(this.phase) * 0.018
        );

        this.drawFlowerHead(open);

        ctx.restore();
      }
    }

    // Natural green leaves with veins.
    drawLeaf(x, y, leaf) {
      const size = leaf.length;

      ctx.save();

      ctx.translate(x, y);

      ctx.rotate(
        leaf.side * (0.52 + leaf.angle)
      );

      const gradient = ctx.createLinearGradient(
        0, 0, size * 1.55, 0
      );

      gradient.addColorStop(0, '#24552d');
      gradient.addColorStop(0.48, '#4e9138');
      gradient.addColorStop(1, '#a4c86b');

      ctx.beginPath();

      ctx.moveTo(0, 0);

      ctx.quadraticCurveTo(
        size * 0.38,
        -size * 0.38,
        size * 1.55,
        -size * 0.05
      );

      ctx.quadraticCurveTo(
        size * 0.65,
        size * 0.19,
        0,
        0
      );

      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(28,75,30,.62)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Main leaf vein.
      ctx.beginPath();

      ctx.moveTo(1, 0);

      ctx.quadraticCurveTo(
        size * 0.75,
        -size * 0.015,
        size * 1.48,
        -size * 0.05
      );

      ctx.strokeStyle = 'rgba(231,245,190,.72)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // Small side veins.
      for (let i = 1; i <= 3; i++) {
        const vx = size * i * 0.34;

        ctx.beginPath();

        ctx.moveTo(vx, -size * 0.015);

        ctx.lineTo(
          vx + size * 0.16,
          -size * 0.12
        );

        ctx.strokeStyle = 'rgba(232,245,190,.38)';
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }

      ctx.restore();
    }

    // Rounded flower petals with fine details.
    drawPetal(angle, length, petalWidth, alpha = 1) {
      ctx.save();

      ctx.rotate(angle);
      ctx.globalAlpha = alpha;

      const gradient = ctx.createLinearGradient(
        0, 0, 0, -length
      );

      gradient.addColorStop(0, this.palette.base);
      gradient.addColorStop(0.48, this.palette.mid);
      gradient.addColorStop(1, this.palette.light);

      ctx.beginPath();

      ctx.moveTo(0, -2);

      ctx.bezierCurveTo(
        -petalWidth * 0.48,
        -length * 0.20,
        -petalWidth * 0.62,
        -length * 0.78,
        0,
        -length
      );

      ctx.bezierCurveTo(
        petalWidth * 0.62,
        -length * 0.78,
        petalWidth * 0.48,
        -length * 0.20,
        0,
        -2
      );

      ctx.closePath();

      ctx.fillStyle = gradient;
      ctx.shadowColor = this.palette.mid;
      ctx.shadowBlur = 3;
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.strokeStyle = this.palette.line;
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // Central petal vein.
      ctx.beginPath();

      ctx.moveTo(0, -4);

      ctx.quadraticCurveTo(
        -1,
        -length * 0.48,
        0,
        -length * 0.91
      );

      ctx.strokeStyle = 'rgba(255,255,255,.62)';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Side petal veins.
      ctx.beginPath();

      ctx.moveTo(-1, -length * 0.25);

      ctx.quadraticCurveTo(
        -petalWidth * 0.22,
        -length * 0.48,
        -petalWidth * 0.34,
        -length * 0.69
      );

      ctx.moveTo(1, -length * 0.25);

      ctx.quadraticCurveTo(
        petalWidth * 0.22,
        -length * 0.48,
        petalWidth * 0.34,
        -length * 0.69
      );

      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 0.6;
      ctx.stroke();

      ctx.restore();
    }

    drawFlowerHead(open) {
      const radius = this.headSize * open;

      const petalLength = radius * 0.94;
      const petalWidth = radius * 0.43;

      // Back layer.
      for (let i = 0; i < this.petalCount; i++) {
        this.drawPetal(
          (i * Math.PI * 2) / this.petalCount,
          petalLength * 0.88,
          petalWidth * 0.92,
          0.96
        );
      }

      // Front layer.
      for (let i = 0; i < this.petalCount; i++) {
        this.drawPetal(
          (i * Math.PI * 2) / this.petalCount +
            Math.PI / this.petalCount,
          petalLength,
          petalWidth,
          1
        );
      }

      this.drawCenter(radius * 0.27);
    }

    // Textured golden flower centre.
    drawCenter(radius) {
      if (radius <= 0) return;

      const gradient = ctx.createRadialGradient(
        -radius * 0.25,
        -radius * 0.3,
        0,
        0,
        0,
        radius * 1.12
      );

      gradient.addColorStop(0, '#fff0a4');
      gradient.addColorStop(0.55, this.palette.center);
      gradient.addColorStop(1, '#d98222');

      ctx.save();

      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);

      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(174,102,23,.35)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      for (let i = 0; i < 42; i++) {
        const angle = i * 2.399;

        const distance =
          Math.sqrt(i / 42) * radius * 0.86;

        ctx.beginPath();

        ctx.arc(
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          Math.max(0.65, radius * 0.095),
          0,
          Math.PI * 2
        );

        ctx.fillStyle =
          i % 2 ? '#ffd76c' : '#f6b33d';

        ctx.fill();
      }

      ctx.restore();
    }
  }

  // Fireflies.
  class Firefly {
    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * width;
      this.y = Math.random() * height;

      this.phase = Math.random() * Math.PI * 2;

      this.speed = 0.12 + Math.random() * 0.25;
      this.size = 0.8 + Math.random() * 1.3;

      this.drift = (Math.random() - 0.5) * 0.22;
    }

    update() {
      this.phase += 0.035 * frameDelta;

      this.x += this.drift * frameDelta;
      this.y -= this.speed * frameDelta;

      if (
        this.y < -12 ||
        this.x < -15 ||
        this.x > width + 15
      ) {
        this.reset();
      }
    }

    draw() {
      const glow =
        0.25 + (Math.sin(this.phase) + 1) * 0.28;

      nctx.save();

      nctx.globalAlpha = glow;
      nctx.fillStyle = '#ffe9a5';
      nctx.shadowColor = '#ffdf83';
      nctx.shadowBlur = 13;

      nctx.beginPath();

      nctx.arc(
        this.x,
        this.y,
        this.size,
        0,
        Math.PI * 2
      );

      nctx.fill();
      nctx.restore();
    }
  }

  // Butterflies.
  class Butterfly {
    constructor() {
      this.x = Math.random() * width;

      this.y =
        height * 0.25 +
        Math.random() * height * 0.45;

      this.phase = Math.random() * 6;

      this.speed = 0.18 + Math.random() * 0.22;
      this.scale = 0.55 + Math.random() * 0.35;

      this.color =
        Math.random() > 0.5
          ? '#f6b6d6'
          : '#cbb7f3';
    }

    update() {
      this.phase += 0.09 * frameDelta;

      this.x += this.speed * frameDelta;

      this.y +=
        Math.sin(this.phase * 0.7) *
        0.34 * frameDelta;

      if (this.x > width + 35) {
        this.x = -30;

        this.y =
          height * 0.22 +
          Math.random() * height * 0.48;
      }
    }

    draw() {
      const flap =
        Math.abs(Math.sin(this.phase)) * 5 + 2;

      nctx.save();

      nctx.translate(this.x, this.y);
      nctx.scale(this.scale, this.scale);

      nctx.fillStyle = this.color;
      nctx.shadowColor = this.color;
      nctx.shadowBlur = 8;

      nctx.beginPath();

      nctx.ellipse(
        -flap * 0.42,
        0,
        flap,
        4.5,
        -0.35,
        0,
        Math.PI * 2
      );

      nctx.ellipse(
        flap * 0.42,
        0,
        flap,
        4.5,
        0.35,
        0,
        Math.PI * 2
      );

      nctx.fill();
      nctx.restore();
    }
  }

  function makeNature() {
    fireflies = Array.from(
      {
        length: Math.min(
          38,
          Math.max(16, Math.floor(width * height / 28000))
        )
      },
      () => new Firefly()
    );

    butterflies = Array.from(
      { length: width < 600 ? 2 : 3 },
      () => new Butterfly()
    );

    grass = [];

    const blades = Math.max(
      26,
      Math.floor(width / 18)
    );

    for (let i = 0; i < blades; i++) {
      const onLeft = i % 2 === 0;

      grass.push({
        x: onLeft
          ? Math.random() * width * 0.18
          : width * (0.82 + Math.random() * 0.18),

        h: 35 + Math.random() * Math.min(105, height * 0.17),

        bend: (Math.random() - 0.5) * 38,

        phase: Math.random() * Math.PI * 2,

        color: ['#164d35', '#24734a', '#39844d'][i % 3]
      });
    }
  }

  function drawNature(time) {
    nctx.clearRect(0, 0, width, height);

    // Grass at the bottom edges.
    grass.forEach(blade => {
      const sway =
        Math.sin(time * 0.0006 + blade.phase) * 3;

      nctx.save();

      nctx.beginPath();

      nctx.moveTo(blade.x, height + 3);

      nctx.quadraticCurveTo(
        blade.x + blade.bend + sway,
        height - blade.h * 0.55,
        blade.x + blade.bend * 0.55 + sway,
        height - blade.h
      );

      nctx.strokeStyle = blade.color;
      nctx.lineWidth = 1.25;
      nctx.lineCap = 'round';

      nctx.stroke();
      nctx.restore();
    });

    // Tiny stars.
    for (let i = 0; i < 44; i++) {
      const x = (i * 197.3) % Math.max(1, width);

      const y =
        (i * 113.7) %
        Math.max(1, height * 0.73);

      nctx.globalAlpha =
        0.16 +
        (Math.sin(time * 0.001 + i * 2) * 0.5 + 0.5) * 0.27;

      nctx.fillStyle = '#f8eaff';

      nctx.beginPath();

      nctx.arc(
        x,
        y,
        i % 4 === 0 ? 1.1 : 0.65,
        0,
        Math.PI * 2
      );

      nctx.fill();
    }

    nctx.globalAlpha = 1;

    fireflies.forEach(f => {
      f.update();
      f.draw();
    });

    butterflies.forEach(b => {
      b.update();
      b.draw();
    });
  }

  function updateInstruction(message) {
    if (instruction) {
      instruction.textContent = message;
    }

    const tip = document.getElementById('gardenTip');

    if (tip) {
      tip.classList.add('tip-faded');
    }
  }

  function addFlower(x, y, paletteIndex, scale = 1) {
    flowers.push(
      new Flower(x, y, paletteIndex, scale)
    );

    updateInstruction(
      flowers.length === 1
        ? 'Your first flower is beginning to bloom. Keep going.'
        : `${flowers.length} little blooms are growing in your garden.`
    );
  }

  // Initial four-flower bouquet.
  function plantStarterBouquet() {
    flowers = [];

    const mobile = width < 600;

    const top = Math.max(
      height * 0.32,
      205
    );

    const positions = mobile
      ? [
          {
            x: width * 0.18,
            y: top + 65,
            p: 1,
            s: 0.78
          },
          {
            x: width * 0.43,
            y: top - 28,
            p: 0,
            s: 0.90
          },
          {
            x: width * 0.72,
            y: top + 8,
            p: 2,
            s: 0.82
          },
          {
            x: width * 0.82,
            y: top + 112,
            p: 3,
            s: 0.76
          }
        ]
      : [
          {
            x: width * 0.20,
            y: top + 90,
            p: 1,
            s: 0.90
          },
          {
            x: width * 0.41,
            y: top - 25,
            p: 0,
            s: 1.02
          },
          {
            x: width * 0.69,
            y: top + 10,
            p: 2,
            s: 0.98
          },
          {
            x: width * 0.81,
            y: top + 125,
            p: 3,
            s: 0.92
          }
        ];

    positions.forEach(item => {
      addFlower(
        item.x,
        item.y,
        item.p,
        item.s
      );
    });

    if (instruction) {
      instruction.textContent =
        'A little garden made just for you.';
    }

    const tip = document.getElementById('gardenTip');

    if (tip) {
      tip.classList.add('tip-faded');
    }
  }

  function stopAutoBloom() {
    autoBlooming = false;

    if (autoBloomTimer) {
      clearInterval(autoBloomTimer);
    }

    autoBloomTimer = null;

    if (autoBtn) {
      autoBtn.classList.remove('active');

      autoBtn.setAttribute(
        'aria-pressed',
        'false'
      );

      const label =
        autoBtn.querySelector('span:last-child');

      if (label) {
        label.textContent = 'Auto bloom';
      }
    }
  }

  // Click or tap to grow a new flower.
  gardenCanvas.addEventListener('pointerdown', event => {
    if (!entered) return;

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    const y = Math.min(
      height - 105,
      Math.max(150, event.clientY)
    );

    addFlower(event.clientX, y);
  });

  // Enter garden.
  if (enterBtn) {
    enterBtn.addEventListener('click', () => {
      entered = true;

      if (welcomeScreen) {
        welcomeScreen.classList.add('is-hidden');
      }

      if (gardenUI) {
        gardenUI.classList.add('is-visible');
      }

      plantStarterBouquet();

      window.setTimeout(() => {
        if (welcomeScreen) {
          welcomeScreen.setAttribute(
            'aria-hidden',
            'true'
          );
        }
      }, 950);
    });
  }

  // Auto Bloom button.
  if (autoBtn) {
    autoBtn.addEventListener('click', () => {
      if (autoBlooming) {
        stopAutoBloom();
        return;
      }

      autoBlooming = true;

      autoBtn.classList.add('active');

      autoBtn.setAttribute(
        'aria-pressed',
        'true'
      );

      const label =
        autoBtn.querySelector('span:last-child');

      if (label) {
        label.textContent = 'Pause bloom';
      }

      autoBloomTimer = window.setInterval(() => {
        const margin = Math.min(
          55,
          width * 0.12
        );

        const x =
          margin +
          Math.random() *
          Math.max(1, width - margin * 2);

        const y =
          height * (0.39 + Math.random() * 0.30);

        addFlower(x, y);
      }, 850);
    });
  }

  // Clear Garden button.
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      flowers = [];
      pollen = [];

      if (instruction) {
        instruction.textContent =
          'A fresh little beginning. Tap anywhere to plant a flower.';
      }

      const tip = document.getElementById('gardenTip');

      if (tip) {
        tip.classList.remove('tip-faded');
      }

      stopAutoBloom();
    });
  }

  // Sound button.
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundBtn.title =
        'Ambient music is not included yet.';

      soundBtn.innerHTML =
        '♫ <span>Sound off</span>';
    });
  }

  // Main animation loop.
  function animate(time = 0) {
    frameDelta = Math.min(
      2.2,
      Math.max(
        0.35,
        (time - lastTime) / 16.67 || 1
      )
    );

    lastTime = time;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    flowers.forEach(flower => {
      flower.update();
      flower.draw();
    });

    pollen = pollen.filter(
      particle => particle.alpha > 0
    );

    pollen.forEach(particle => {
      particle.update();
      particle.draw();
    });

    drawNature(time);

    window.requestAnimationFrame(animate);
  }

  resize();
  window.requestAnimationFrame(animate);

})();
