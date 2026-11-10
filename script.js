
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

  // Botanical flower palettes based on your reference illustration.
  const palettes = [
    {
      petals: ['#70447d', '#a76bb0', '#d2a0d5'],
      line: 'rgba(83,44,94,.38)',
      center: '#efa32d',
      leaf: ['#174d25','#4e9b36','#a6c96a']
    },
    {
      petals: ['#a92b78', '#e94caa', '#ff91d1'],
      line: 'rgba(112,24,83,.38)',
      center: '#f6a52e',
      leaf: ['#174d25','#4e9b36','#a6c96a']
    },
    {
      petals: ['#e8dfc4', '#fff8e8', '#fffdf5'],
      line: 'rgba(157,139,104,.34)',
      center: '#efa32d',
      leaf: ['#174d25','#4e9b36','#a6c96a']
    },
    {
      petals: ['#d95b91', '#f58db5', '#ffc1d4'],
      line: 'rgba(153,55,94,.34)',
      center: '#f4a52e',
      leaf: ['#174d25','#4e9b36','#a6c96a']
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
      {
        length: Math.min(
          34,
          Math.max(15, Math.floor(width * height / 30000))
        )
      },
      () => new Firefly()
    );
  }

  class Flower {
    constructor(x, headY, scale = 1) {
      this.x = x;
      this.headY = headY;
      this.scale = scale;
      this.baseY = height + 8;

      // Stems begin close together like a botanical bouquet.
      this.baseX = width * .50 + (x - width * .50) * .34;
      this.curve = (x - this.baseX) * .22 + (Math.random() - .5) * 12;

      this.growth = 0;
      this.open = 0;
      this.phase = Math.random() * 6.28;
      this.rotation = (Math.random() - .5) * .12;
      this.palette = palettes[flowers.length % palettes.length];

      this.leafData = Array.from({ length: 9 }, (_, i) => ({
        t: .16 + i * .075 + Math.random() * .025,
        side: i % 2 ? 1 : -1,
        size: (17 + Math.random() * 13) * scale,
        angle: (Math.random() - .5) * .22
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

      this.phase = time * .00038 + this.rotation;
    }

    draw(time) {
      const tip = this.stem(this.growth);
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.headY) / 2;
      const sway = Math.sin(this.phase) * 2.2;

      // Curved green stem with a soft highlight.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.baseX, this.baseY);

      ctx.quadraticCurveTo(
        cx + sway, cy,
        tip.x + sway, tip.y
      );

      const stemGrad = ctx.createLinearGradient(
        this.baseX, this.baseY, tip.x, tip.y
      );

      stemGrad.addColorStop(0, '#285b25');
      stemGrad.addColorStop(.48, '#579331');
      stemGrad.addColorStop(1, '#83a94b');

      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 2.8 * this.scale;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.baseX - .7, this.baseY);

      ctx.quadraticCurveTo(
        cx - .7 + sway, cy,
        tip.x - .7 + sway, tip.y
      );

      ctx.strokeStyle = 'rgba(230,245,180,.45)';
      ctx.lineWidth = .8;
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
        ctx.rotate(Math.sin(this.phase) * .018);
        this.drawFlowerHead(this.open);
        ctx.restore();
      }
    }

    drawLeaf(x, y, side, size, angle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(side * (.62 + angle));

      const colors = this.palette.leaf;
      const g = ctx.createLinearGradient(0, 0, size * 1.65, 0);

      g.addColorStop(0, colors[0]);
      g.addColorStop(.5, colors[1]);
      g.addColorStop(1, colors[2]);

      ctx.beginPath();
      ctx.moveTo(0, 0);

      ctx.bezierCurveTo(
        size*.38, -size*.42,
        size*1.08, -size*.48,
        size*1.65, 0
      );

      ctx.bezierCurveTo(
        size*1.08, size*.48,
        size*.38, size*.42,
        0, 0
      );

      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = 'rgba(28,78,28,.55)';
      ctx.lineWidth = .8;
      ctx.stroke();

      // Leaf midrib.
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.quadraticCurveTo(size*.78, -.5, size*1.58, 0);

      ctx.strokeStyle = 'rgba(226,245,181,.75)';
      ctx.lineWidth = .9;
      ctx.stroke();

      // Fine side veins.
      for (let i = 1; i <= 3; i++) {
        const vx = size * i * .34;

        ctx.beginPath();
        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + size*.18, -size*.13);

        ctx.moveTo(vx, 0);
        ctx.lineTo(vx + size*.18, size*.13);

        ctx.strokeStyle = 'rgba(226,245,181,.42)';
        ctx.lineWidth = .55;
        ctx.stroke();
      }

      ctx.restore();
    }

    drawPetal(angle, length, width, layer) {
      const colors = this.palette.petals;

      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -length * .34);

      const g = ctx.createLinearGradient(
        -width*.3, -length*.58,
        width*.25, length*.52
      );

      g.addColorStop(0, colors[2]);
      g.addColorStop(.48, colors[1]);
      g.addColorStop(1, colors[0]);

      // Broad, rounded flower petal.
      ctx.beginPath();
      ctx.moveTo(0, length*.52);

      ctx.bezierCurveTo(
        -width*.48, length*.35,
        -width*.62, -length*.12,
        -width*.39, -length*.43
      );

      ctx.bezierCurveTo(
        -width*.23, -length*.66,
        -width*.08, -length*.62,
        0, -length*.54
      );

      ctx.bezierCurveTo(
        width*.08, -length*.62,
        width*.23, -length*.66,
        width*.39, -length*.43
      );

      ctx.bezierCurveTo(
        width*.62, -length*.12,
        width*.48, length*.35,
        0, length*.52
      );

      ctx.closePath();
      ctx.fillStyle = g;
      ctx.fill();

      ctx.strokeStyle = this.palette.line;
      ctx.lineWidth = .85;
      ctx.stroke();

      // Fine petal veins.
      ctx.beginPath();
      ctx.moveTo(0, length*.43);
      ctx.quadraticCurveTo(-width*.04, -length*.04, 0, -length*.49);

      ctx.strokeStyle = 'rgba(255,255,255,.52)';
      ctx.lineWidth = .85;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, length*.28);
      ctx.quadraticCurveTo(-width*.2, -length*.05, -width*.28, -length*.34);

      ctx.moveTo(0, length*.28);
      ctx.quadraticCurveTo(width*.2, -length*.05, width*.28, -length*.34);

      ctx.strokeStyle = 'rgba(255,255,255,.25)';
      ctx.lineWidth = .65;
      ctx.stroke();

      ctx.restore();
    }

    drawFlowerHead(amount) {
      const s = this.scale * Math.sin(amount * Math.PI / 2);
      const r = 31 * s;
      const count = 10;

      // Two offset layers of petals.
      for (let layer = 0; layer < 2; layer++) {
        const n = layer === 0 ? count : 9;

        for (let i = 0; i < n; i++) {
          const a = this.rotation +
            i * Math.PI * 2 / n +
            (layer ? .17 : 0);

          ctx.save();
          ctx.rotate(a);

          this.drawPetal(
            0,
            r * (layer ? .91 : 1.05),
            r * (layer ? .43 : .39),
            layer
          );

          ctx.restore();
        }
      }

      // Orange-yellow textured flower centre.
      const cr = r * .24;

      const center = ctx.createRadialGradient(
        -cr*.25, -cr*.3, 1,
        0, 0, cr*1.25
      );

      center.addColorStop(0, '#ffe58b');
      center.addColorStop(.58, this.palette.center);
      center.addColorStop(1, '#d97818');

      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI*2);
      ctx.fillStyle = center;
      ctx.fill();

      for (let i = 0; i < 38; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i / 38) * cr * .88;

        ctx.beginPath();
        ctx.arc(
          Math.cos(a)*d,
          Math.sin(a)*d,
          Math.max(1, cr*.105),
          0,
          Math.PI*2
        );

        ctx.fillStyle = i % 2 ? '#ffd46b' : '#f49a25';
        ctx.fill();

        ctx.strokeStyle = 'rgba(180,99,22,.28)';
        ctx.lineWidth = .35;
        ctx.stroke();
      }
    }
  }

  function addFlower(x, y, scale) {
    flowers.push(
      new Flower(x, y, scale || (.82 + Math.random() * .32))
    );

    if (instruction) {
      instruction.textContent = flowers.length === 1
        ? 'A little flower is blooming for you.'
        : `${flowers.length} lovely flowers are growing in your garden.`;
    }

    const tip = document.getElementById('gardenTip');
    if (tip) tip.classList.add('tip-faded');
  }

  function plantReferenceGarden() {
    flowers = [];

    const mobile = width < 600;
    const top = height * (mobile ? .30 : .27);

    addFlower(width * .18, top + height*.17, mobile ? .78 : .92);
    addFlower(width * .39, top - height*.08, mobile ? .92 : 1.08);
    addFlower(width * .76, top + height*.04, mobile ? .88 : 1.02);
    addFlower(width * .72, top + height*.29, mobile ? .82 : .96);

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
        instruction.textContent =
          'A quiet little garden. Tap anywhere to grow a flower.';
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

      nctx.globalAlpha =
        .12 + (Math.sin(time * .001 + i * 2) * .5 + .5) * .25;

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
    dt = Math.min(
      2.2,
      Math.max(.35, (time - lastTime) / 16.67 || 1)
    );

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
