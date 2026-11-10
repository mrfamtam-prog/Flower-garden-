
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
  let pollen = [];
  let fireflies = [];
  let butterflies = [];
  let autoBloomTimer = null;
  let autoBlooming = false;
  let entered = false;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastTime = 0;
  let frameDelta = 1;

  // Soft botanical colors: less neon, more like real garden flowers.
  const flowerStyles = [
    { type: 'rose', name: 'rose', petals: ['#a92f63', '#d85b88', '#f2a5bd'], center: '#e9a84f', leaf: '#39754a' },
    { type: 'sunflower', name: 'sunflower', petals: ['#d99020', '#f2bd45', '#ffdf83'], center: '#704326', leaf: '#397849' },
    { type: 'daisy', name: 'daisy', petals: ['#fff4e8', '#ffffff', '#ffe8ed'], center: '#e9a83d', leaf: '#438052' },
    { type: 'cosmos', name: 'cosmos', petals: ['#9856b7', '#c38bd4', '#ead0ef'], center: '#e8b84d', leaf: '#39754a' },
    { type: 'rose', name: 'blush rose', petals: ['#c85b79', '#ed91a8', '#ffd0d9'], center: '#e9ae61', leaf: '#477b50' },
    { type: 'daisy', name: 'pink daisy', petals: ['#df739b', '#f4a9c2', '#ffe0e9'], center: '#e7b044', leaf: '#438052' }
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

  function rgba(hex, alpha) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
  }

  class PollenParticle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      this.vx = (Math.random() - .5) * .75;
      this.vy = -.25 - Math.random() * .75;
      this.size = .7 + Math.random() * 1.1;
      this.alpha = .9;
      this.color = color;
    }
    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.alpha -= .009 * dt;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.alpha);
      ctx.fillStyle = this.color;
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
      this.baseX = x + (Math.random() - .5) * Math.min(46, width * .07);
      this.baseY = height + 12;
      this.growth = 0;
      this.open = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.curve = (Math.random() - .5) * Math.min(75, width * .1);
      this.height = Math.max(115, Math.min(height * (.30 + Math.random() * .16), 265));
      this.headSize = Math.min(25 + Math.random() * 13, width * .055);
      this.style = flowerStyles[Math.floor(Math.random() * flowerStyles.length)];
      this.petalRotation = Math.random() * Math.PI * 2;
      this.petalCount = this.style.type === 'sunflower' ? 18 : this.style.type === 'rose' ? 13 : 9;
      this.leaves = [
        { at: .25 + Math.random() * .07, side: Math.random() > .5 ? 1 : -1, size: 19 + Math.random() * 9 },
        { at: .48 + Math.random() * .08, side: Math.random() > .5 ? 1 : -1, size: 17 + Math.random() * 10 },
        { at: .69 + Math.random() * .06, side: Math.random() > .5 ? 1 : -1, size: 14 + Math.random() * 8 }
      ];
      this.pollenMade = false;
    }

    stemPoint(t) {
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.y + this.height * .12) / 2;
      const u = 1 - t;
      const px = u*u*this.baseX + 2*u*t*cx + t*t*this.x;
      const py = u*u*this.baseY + 2*u*t*cy + t*t*(this.y + this.height * .12);
      const dx = 2*u*(cx-this.baseX) + 2*t*(this.x-cx);
      const dy = 2*u*(cy-this.baseY) + 2*t*(this.y + this.height*.12-cy);
      return { x: px, y: py, angle: Math.atan2(dy, dx) };
    }

    update(dt, time) {
      if (this.growth < 1) this.growth = Math.min(1, this.growth + .012 * dt);
      else if (this.open < 1) {
        this.open = Math.min(1, this.open + .018 * dt);
        if (!this.pollenMade && this.open > .6) {
          this.pollenMade = true;
          for (let i = 0; i < 7; i++) pollen.push(new PollenParticle(this.x, this.y, this.style.petals[2]));
        }
      }
      this.phase = time * .00038 + this.petalRotation;
    }

    draw(time) {
      const t = this.growth;
      const tip = this.stemPoint(t);
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.y + this.height * .12) / 2;

      // A slim curved stem, with a subtle light edge.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.baseX, this.baseY);
      ctx.quadraticCurveTo(cx, cy, tip.x, tip.y);
      const stemGrad = ctx.createLinearGradient(this.baseX, this.baseY, tip.x, tip.y);
      stemGrad.addColorStop(0, '#244d32');
      stemGrad.addColorStop(.55, '#477e4b');
      stemGrad.addColorStop(1, '#6d9b59');
      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 2.3;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.restore();

      this.leaves.forEach(leaf => {
        if (t > leaf.at) {
          const p = this.stemPoint(leaf.at);
          this.drawLeaf(p.x, p.y, p.angle + leaf.side * 1.15, leaf.size);
        }
      });

      if (t >= 1 && this.open > 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.phase) * .035);
        const bloom = Math.sin(this.open * Math.PI / 2);
        this.drawSepals(bloom);
        if (this.style.type === 'sunflower') this.drawSunflower(bloom);
        else if (this.style.type === 'rose') this.drawRose(bloom);
        else this.drawDaisy(bloom);
        ctx.restore();
      }
    }

    drawLeaf(x, y, angle, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      const grad = ctx.createLinearGradient(0, -size*.45, size*1.55, size*.3);
      grad.addColorStop(0, '#245536');
      grad.addColorStop(.48, this.style.leaf);
      grad.addColorStop(1, '#8eb66e');
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size*.38, -size*.62, size*1.12, -size*.43, size*1.55, 0);
      ctx.bezierCurveTo(size*1.12, size*.42, size*.38, size*.55, 0, 0);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size*.75, -size*.04, size*1.48, 0);
      ctx.strokeStyle = 'rgba(225,244,202,.62)';
      ctx.lineWidth = .85;
      ctx.stroke();
      for (let i = 1; i <= 3; i++) {
        const px = size * i * .31;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.17, -size*.14);
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.17, size*.14);
        ctx.strokeStyle = 'rgba(225,244,202,.28)';
        ctx.lineWidth = .65;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSepals(scale) {
      ctx.save();
      ctx.scale(scale, scale);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.quadraticCurveTo(-4, 10, 0, 16);
        ctx.quadraticCurveTo(4, 10, 0, 3);
        ctx.fillStyle = '#47794a';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    // Soft oval petals with rounded tips and subtle tonal variation.
    drawRoundedPetal(angle, length, width, colors, tilt = 0) {
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -length * .42);
      ctx.rotate(tilt);
      const grad = ctx.createLinearGradient(-width, -length*.55, width, length*.55);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(.52, colors[1]);
      grad.addColorStop(1, colors[2]);
      ctx.beginPath();
      ctx.moveTo(0, length*.58);
      ctx.bezierCurveTo(-width*.92, length*.32, -width*.92, -length*.32, 0, -length*.55);
      ctx.bezierCurveTo(width*.92, -length*.32, width*.92, length*.32, 0, length*.58);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, length*.42);
      ctx.quadraticCurveTo(width*.04, 0, 0, -length*.42);
      ctx.strokeStyle = 'rgba(255,255,255,.23)';
      ctx.lineWidth = .65;
      ctx.stroke();
      ctx.restore();
    }

    drawDaisy(scale) {
      const r = this.headSize * scale;
      const petalLength = r * 1.13;
      const petalWidth = r * .35;
      const colors = this.style.petals;
      for (let i = 0; i < this.petalCount; i++) {
        const a = this.petalRotation + i * Math.PI * 2 / this.petalCount;
        this.drawRoundedPetal(a, petalLength, petalWidth, colors, Math.sin(i*4.1)*.045);
      }
      const centerGrad = ctx.createRadialGradient(-r*.22, -r*.24, 1, 0, 0, r*.42);
      centerGrad.addColorStop(0, '#fff0a8');
      centerGrad.addColorStop(.55, this.style.center);
      centerGrad.addColorStop(1, '#b8752d');
      ctx.beginPath();
      ctx.arc(0, 0, r*.36, 0, Math.PI*2);
      ctx.fillStyle = centerGrad;
      ctx.fill();
      for (let i = 0; i < 24; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i / 24) * r * .28;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*d, Math.sin(a)*d, .45 + (i%3)*.18, 0, Math.PI*2);
        ctx.fillStyle = i%2 ? '#fff0ad' : '#9e642e';
        ctx.fill();
      }
    }

    drawSunflower(scale) {
      const r = this.headSize * scale;
      for (let i = 0; i < 20; i++) {
        const a = this.petalRotation + i * Math.PI * 2 / 20;
        this.drawRoundedPetal(a, r*1.35, r*.25, ['#c9811b', '#f3bd43', '#ffe18a'], Math.sin(i*3.7)*.035);
      }
      const disk = ctx.createRadialGradient(-r*.22, -r*.24, 1, 0, 0, r*.63);
      disk.addColorStop(0, '#a36a37');
      disk.addColorStop(.55, '#704525');
      disk.addColorStop(1, '#3f2a20');
      ctx.beginPath();
      ctx.arc(0, 0, r*.62, 0, Math.PI*2);
      ctx.fillStyle = disk;
      ctx.fill();
      for (let i = 0; i < 115; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i / 115) * r * .55;
        const x = Math.cos(a)*d;
        const y = Math.sin(a)*d;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.05, 1.45, a, 0, Math.PI*2);
        ctx.fillStyle = i%3 === 0 ? '#d6a052' : i%3 === 1 ? '#3b261b' : '#8e592d';
        ctx.fill();
      }
    }

    drawRose(scale) {
      const r = this.headSize * scale;
      const rings = [
        { count: 9, radius: r*.79, length: r*.93, width: r*.42, alpha: 1 },
        { count: 7, radius: r*.48, length: r*.75, width: r*.39, alpha: .98 },
        { count: 5, radius: r*.22, length: r*.56, width: r*.35, alpha: .96 }
      ];
      rings.forEach((ring, ringIndex) => {
        for (let i = 0; i < ring.count; i++) {
          const a = this.petalRotation + i * Math.PI * 2 / ring.count + ringIndex*.28;
          ctx.save();
          ctx.rotate(a);
          ctx.translate(0, -ring.radius);
          ctx.globalAlpha = ring.alpha;
          this.drawRoundedPetal(0, ring.length, ring.width, this.style.petals, (i%2 ? .07 : -.04));
          ctx.restore();
        }
      });
      const center = ctx.createRadialGradient(-r*.12, -r*.12, 1, 0, 0, r*.27);
      center.addColorStop(0, '#f8c5a5');
      center.addColorStop(.65, this.style.petals[1]);
      center.addColorStop(1, this.style.petals[0]);
      ctx.beginPath();
      ctx.arc(0, 0, r*.24, 0, Math.PI*2);
      ctx.fillStyle = center;
      ctx.fill();
    }
  }

  class Firefly {
    constructor() { this.reset(true); }
    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = Math.random() * height;
      this.phase = Math.random() * Math.PI * 2;
      this.speed = .1 + Math.random() * .22;
      this.size = .8 + Math.random() * 1.2;
      this.drift = (Math.random() - .5) * .18;
      if (!initial && this.y < -10) this.y = height + 10;
    }
    update(dt) {
      this.phase += .03 * dt;
      this.x += this.drift * dt;
      this.y -= this.speed * dt;
      if (this.y < -12 || this.x < -15 || this.x > width + 15) this.reset();
    }
    draw() {
      nctx.save();
      nctx.globalAlpha = .2 + (Math.sin(this.phase) + 1) * .24;
      nctx.fillStyle = '#ffe8a8';
      nctx.shadowColor = '#ffe8a8';
      nctx.shadowBlur = 9;
      nctx.beginPath();
      nctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      nctx.fill();
      nctx.restore();
    }
  }

  class Butterfly {
    constructor() {
      this.x = Math.random() * width;
      this.y = height*.22 + Math.random()*height*.48;
      this.phase = Math.random()*6;
      this.speed = .18 + Math.random()*.22;
      this.scale = .55 + Math.random()*.4;
      this.color = Math.random() > .5 ? '#e8a9c5' : '#c6b2e8';
    }
    update(dt) {
      this.phase += .075*dt;
      this.x += this.speed*dt + Math.cos(this.phase*.25)*.35*dt;
      this.y += Math.sin(this.phase*.7)*.28*dt;
      if (this.x > width+35) {
        this.x = -30;
        this.y = height*.2 + Math.random()*height*.5;
      }
    }
    draw() {
      const flap = 2 + Math.abs(Math.sin(this.phase))*5;
      nctx.save();
      nctx.translate(this.x, this.y);
      nctx.scale(this.scale, this.scale);
      nctx.fillStyle = this.color;
      nctx.shadowColor = this.color;
      nctx.shadowBlur = 6;
      nctx.beginPath();
      nctx.ellipse(-flap*.45, 0, flap, 4.5, -.35, 0, Math.PI*2);
      nctx.ellipse(flap*.45, 0, flap, 4.5, .35, 0, Math.PI*2);
      nctx.fill();
      nctx.strokeStyle = 'rgba(255,245,255,.8)';
      nctx.lineWidth = 1;
      nctx.beginPath();
      nctx.moveTo(0, -3);
      nctx.lineTo(0, 4);
      nctx.stroke();
      nctx.restore();
    }
  }

  function seedNature() {
    fireflies = Array.from(
      { length: Math.min(35, Math.max(14, Math.floor(width*height/30000))) },
      () => new Firefly()
    );
    butterflies = Array.from(
      { length: width < 600 ? 2 : 4 },
      () => new Butterfly()
    );
  }

  function addFlower(x, y) {
    flowers.push(new Flower(x, y));
    instruction.textContent = flowers.length === 1
      ? 'A little flower is blooming just for you.'
      : `${flowers.length} lovely flowers are growing in your garden.`;
    const tip = document.getElementById('gardenTip');
    if (tip) tip.classList.add('tip-faded');
  }

  function stopAutoBloom() {
    autoBlooming = false;
    clearInterval(autoBloomTimer);
    autoBloomTimer = null;
    autoBtn.classList.remove('active');
    autoBtn.setAttribute('aria-pressed', 'false');
    const label = autoBtn.querySelector('span:last-child');
    if (label) label.textContent = 'Auto bloom';
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
    setTimeout(() => welcomeScreen.setAttribute('aria-hidden', 'true'), 950);
  });

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
      const margin = Math.min(55, width*.12);
      addFlower(
        margin + Math.random()*(width-margin*2),
        height*.38 + Math.random()*height*.42
      );
    }, 680);
  });

  clearBtn.addEventListener('click', () => {
    flowers = [];
    pollen = [];
    instruction.textContent = 'A fresh little beginning. Tap anywhere to plant a flower.';
    const tip = document.getElementById('gardenTip');
    if (tip) tip.classList.remove('tip-faded');
    stopAutoBloom();
  });

  // This version keeps the existing sound control; an audio file is needed for music playback.
  soundBtn.addEventListener('click', () => {
    soundBtn.title = 'Add an audio file to enable garden music.';
    soundBtn.innerHTML = '♫ <span>Sound off</span>';
  });

  function drawAtmosphere(time) {
    nctx.clearRect(0, 0, width, height);
    for (let i = 0; i < 42; i++) {
      const x = (i*197.3) % width;
      const y = (i*113.7) % Math.max(1, height*.72);
      nctx.globalAlpha = .12 + (Math.sin(time*.001+i*2)*.5+.5)*.24;
      nctx.fillStyle = '#fff0d5';
      nctx.beginPath();
      nctx.arc(x, y, i%4===0 ? 1.05 : .6, 0, Math.PI*2);
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

  function animate(time = 0) {
    frameDelta = Math.min(2.2, Math.max(.35, (time-lastTime)/16.67 || 1));
    lastTime = time;
    ctx.clearRect(0, 0, width, height);
    flowers.forEach(f => {
      f.update(frameDelta, time);
      f.draw(time);
    });
    pollen = pollen.filter(p => p.alpha > 0);
    pollen.forEach(p => {
      p.update(frameDelta);
      p.draw();
    });
    drawAtmosphere(time);
    requestAnimationFrame(animate);
  }

  resize();
  requestAnimationFrame(animate);
})();
