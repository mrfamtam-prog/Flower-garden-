
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

  let flowers = [], pollen = [], fireflies = [], butterflies = [];
  let autoBloomTimer = null, autoBlooming = false, entered = false;
  let width = 0, height = 0, dpr = 1, lastTime = 0, frameDelta = 1;

  const varieties = [
    { type: 'rose', petals: ['#9d315b', '#d96f91', '#f7c2ce'], center: '#e8b56d', leaf: '#47794d' },
    { type: 'sunflower', petals: ['#c47a17', '#edb83d', '#ffe28a'], center: '#704323', leaf: '#477d45' },
    { type: 'daisy', petals: ['#f7e8df', '#fffaf3', '#ffffff'], center: '#e9b64f', leaf: '#4b8051' },
    { type: 'cosmos', petals: ['#8b4caa', '#bd83d1', '#ead1f0'], center: '#e9b94e', leaf: '#47794d' },
    { type: 'rose', petals: ['#bd5578', '#ed9bb0', '#ffe0e6'], center: '#e8b56d', leaf: '#47794d' },
    { type: 'daisy', petals: ['#d66c91', '#f2a8bf', '#ffe3ec'], center: '#e9b64f', leaf: '#4b8051' },
    { type: 'cosmos', petals: ['#a45d91', '#d99ac4', '#f6d9e9'], center: '#e9b94e', leaf: '#47794d' }
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
      this.x = x; this.y = y;
      this.vx = (Math.random() - .5) * .9;
      this.vy = -.25 - Math.random() * .85;
      this.r = .7 + Math.random() * 1.2;
      this.alpha = .9; this.color = color;
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
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Flower {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.baseX = x + (Math.random() - .5) * Math.min(48, width * .07);
      this.baseY = height + 15;
      this.growth = 0; this.open = 0;
      this.phase = Math.random() * Math.PI * 2;
      this.curve = (Math.random() - .5) * Math.min(70, width * .09);
      this.size = Math.min(48 + Math.random() * 23, Math.max(37, width * .09));
      this.variety = varieties[Math.floor(Math.random() * varieties.length)];
      this.rotation = Math.random() * Math.PI * 2;
      this.leaves = [
        { at: .22 + Math.random() * .08, side: -1, size: 19 + Math.random() * 10 },
        { at: .43 + Math.random() * .09, side: 1, size: 22 + Math.random() * 11 },
        { at: .65 + Math.random() * .08, side: -1, size: 17 + Math.random() * 9 }
      ];
      this.pollenMade = false;
    }

    stemPoint(t) {
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.y) / 2;
      const u = 1 - t;
      const px = u*u*this.baseX + 2*u*t*cx + t*t*this.x;
      const py = u*u*this.baseY + 2*u*t*cy + t*t*this.y;
      const dx = 2*u*(cx-this.baseX) + 2*t*(this.x-cx);
      const dy = 2*u*(cy-this.baseY) + 2*t*(this.y-cy);
      return { x: px, y: py, angle: Math.atan2(dy, dx) };
    }

    update(dt, time) {
      if (this.growth < 1) this.growth = Math.min(1, this.growth + .014 * dt);
      else if (this.open < 1) {
        this.open = Math.min(1, this.open + .016 * dt);
        if (!this.pollenMade && this.open > .65) {
          this.pollenMade = true;
          for (let i = 0; i < 10; i++)
            pollen.push(new Pollen(this.x, this.y, this.variety.petals[2]));
        }
      }
      this.phase = time * .00042 + this.rotation;
    }

    draw() {
      const t = this.growth;
      const tip = this.stemPoint(t);
      const cx = (this.baseX + this.x) / 2 + this.curve;
      const cy = (this.baseY + this.y) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(this.baseX, this.baseY);
      ctx.quadraticCurveTo(cx, cy, tip.x, tip.y);
      const stem = ctx.createLinearGradient(this.baseX, this.baseY, tip.x, tip.y);
      stem.addColorStop(0, '#254b30');
      stem.addColorStop(.55, '#477d49');
      stem.addColorStop(1, '#739d5e');
      ctx.strokeStyle = stem;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.baseX - 1, this.baseY);
      ctx.quadraticCurveTo(cx - 1, cy, tip.x - 1, tip.y);
      ctx.strokeStyle = 'rgba(218,239,185,.24)';
      ctx.lineWidth = .75;
      ctx.stroke();
      ctx.restore();

      this.leaves.forEach(leaf => {
        if (t > leaf.at) {
          const p = this.stemPoint(leaf.at);
          this.drawLeaf(p.x, p.y, p.angle + leaf.side * 1.05, leaf.size);
        }
      });

      if (t >= 1 && this.open > 0) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.sin(this.phase) * .035);
        const s = Math.sin(this.open * Math.PI / 2);
        this.drawCalyx(s);

        if (this.variety.type === 'rose') this.drawRose(s);
        else if (this.variety.type === 'sunflower') this.drawSunflower(s);
        else this.drawDaisy(s, this.variety.type === 'cosmos');

        ctx.restore();
      }
    }

    drawLeaf(x, y, angle, size) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      const g = ctx.createLinearGradient(0, -size*.5, size*1.6, size*.25);
      g.addColorStop(0, '#244b31');
      g.addColorStop(.48, this.variety.leaf);
      g.addColorStop(1, '#a2bd76');

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size*.38, -size*.68, size*1.15, -size*.48, size*1.55, 0);
      ctx.bezierCurveTo(size*1.12, size*.43, size*.35, size*.55, 0, 0);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size*.75, -size*.04, size*1.48, 0);
      ctx.strokeStyle = 'rgba(231,245,208,.68)';
      ctx.lineWidth = .9;
      ctx.stroke();

      for (let i = 1; i <= 3; i++) {
        const px = size * i * .31;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.17, -size*.15);
        ctx.moveTo(px, 0);
        ctx.lineTo(px + size*.17, size*.15);
        ctx.strokeStyle = 'rgba(231,245,208,.3)';
        ctx.lineWidth = .65;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCalyx(s) {
      ctx.save();
      ctx.scale(s, s);
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI * 2 / 5);
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.quadraticCurveTo(-4, 10, 0, 17);
        ctx.quadraticCurveTo(4, 10, 0, 3);
        ctx.fillStyle = '#47794a';
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    petal(angle, length, width, colors, tilt = 0) {
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, -length*.43);
      ctx.rotate(tilt);

      const g = ctx.createLinearGradient(-width, -length*.5, width, length*.55);
      g.addColorStop(0, colors[0]);
      g.addColorStop(.5, colors[1]);
      g.addColorStop(1, colors[2]);

      ctx.beginPath();
      ctx.moveTo(0, length*.58);
      ctx.bezierCurveTo(-width*1.05, length*.34, -width*.9, -length*.36, 0, -length*.55);
      ctx.bezierCurveTo(width*.9, -length*.36, width*1.05, length*.34, 0, length*.58);
      ctx.fillStyle = g;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, length*.43);
      ctx.quadraticCurveTo(width*.04, 0, 0, -length*.43);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = .75;
      ctx.stroke();
      ctx.restore();
    }

    drawDaisy(s, cosmos = false) {
      const r = this.size * s;
      const count = cosmos ? 8 : 12;
      const colors = this.variety.petals;

      for (let i = 0; i < count; i++) {
        const a = this.rotation + i * Math.PI * 2 / count;
        this.petal(a, r * (cosmos ? .95 : 1.05),
          r * (cosmos ? .24 : .19), colors, Math.sin(i*3.7)*.035);
      }

      const centerR = r * (cosmos ? .18 : .23);
      const center = ctx.createRadialGradient(-centerR*.3, -centerR*.3, 1, 0, 0, centerR*1.3);
      center.addColorStop(0, '#fff0b6');
      center.addColorStop(.55, this.variety.center);
      center.addColorStop(1, '#a96d35');

      ctx.beginPath();
      ctx.arc(0, 0, centerR, 0, Math.PI*2);
      ctx.fillStyle = center;
      ctx.fill();

      for (let i = 0; i < 38; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i/38) * centerR*.8;
        ctx.beginPath();
        ctx.arc(Math.cos(a)*d, Math.sin(a)*d, .65, 0, Math.PI*2);
        ctx.fillStyle = i%2 ? '#fff1b5' : '#9a642f';
        ctx.fill();
      }
    }

    drawSunflower(s) {
      const r = this.size * s;

      for (let ring = 0; ring < 2; ring++) {
        const count = ring === 0 ? 22 : 18;
        for (let i = 0; i < count; i++) {
          const a = this.rotation + i * Math.PI*2/count + ring*.13;
          ctx.save();
          ctx.rotate(a);
          this.petal(0, r*(ring === 0 ? 1.22 : 1.02), r*.145,
            ring === 0
              ? ['#b87518','#eeb43c','#ffe18a']
              : ['#d18b20','#f5c951','#ffeb9e'], 0);
          ctx.restore();
        }
      }

      const cr = r*.48;
      const disk = ctx.createRadialGradient(-cr*.25, -cr*.28, 1, 0, 0, cr*1.2);
      disk.addColorStop(0, '#a56c3c');
      disk.addColorStop(.5, '#704526');
      disk.addColorStop(1, '#39271e');

      ctx.beginPath();
      ctx.arc(0, 0, cr, 0, Math.PI*2);
      ctx.fillStyle = disk;
      ctx.fill();

      for (let i = 0; i < 185; i++) {
        const a = i * 2.399;
        const d = Math.sqrt(i/185) * cr*.91;
        const x = Math.cos(a)*d;
        const y = Math.sin(a)*d;
        ctx.beginPath();
        ctx.ellipse(x, y, 1.15, 1.65, a, 0, Math.PI*2);
        ctx.fillStyle = i%3 === 0 ? '#d7a65a' : i%3 === 1 ? '#493020' : '#986033';
        ctx.fill();
      }
    }

    drawRose(s) {
      const r = this.size * s;
      const rings = [
        { count: 10, radius: r*.48, length: r*.84, width: r*.34, offset: 0 },
        { count: 8, radius: r*.29, length: r*.69, width: r*.33, offset: .22 },
        { count: 6, radius: r*.12, length: r*.52, width: r*.3, offset: .42 }
      ];

      rings.forEach(ring => {
        for (let i = 0; i < ring.count; i++) {
          const a = this.rotation + i*Math.PI*2/ring.count + ring.offset;
          ctx.save();
          ctx.rotate(a);
          ctx.translate(0, -ring.radius);
          this.petal(0, ring.length, ring.width, this.variety.petals, i%2 ? .07 : -.035);
          ctx.restore();
        }
      });

      const inner = ctx.createRadialGradient(-r*.08, -r*.12, 1, 0, 0, r*.22);
      inner.addColorStop(0, '#ffe1d8');
      inner.addColorStop(.65, this.variety.petals[1]);
      inner.addColorStop(1, this.variety.petals[0]);

      ctx.beginPath();
      ctx.arc(0, 0, r*.2, 0, Math.PI*2);
      ctx.fillStyle = inner;
      ctx.fill();
    }
  }

  class Firefly {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random()*width;
      this.y = Math.random()*height;
      this.phase = Math.random()*Math.PI*2;
      this.speed = .1+Math.random()*.2;
      this.size = .8+Math.random()*1.1;
      this.drift = (Math.random()-.5)*.18;
    }
    update(dt) {
      this.phase += .03*dt;
      this.x += this.drift*dt;
      this.y -= this.speed*dt;
      if (this.y < -12 || this.x < -15 || this.x > width+15) {
        this.reset();
        this.y = height+8;
      }
    }
    draw() {
      nctx.save();
      nctx.globalAlpha = .15+(Math.sin(this.phase)+1)*.2;
      nctx.fillStyle = '#ffe9b2';
      nctx.shadowColor = '#ffe9b2';
      nctx.shadowBlur = 8;
      nctx.beginPath();
      nctx.arc(this.x,this.y,this.size,0,Math.PI*2);
      nctx.fill();
      nctx.restore();
    }
  }

  class Butterfly {
    constructor() {
      this.x = Math.random()*width;
      this.y = height*.2+Math.random()*height*.5;
      this.phase = Math.random()*6;
      this.speed = .16+Math.random()*.2;
      this.scale = .55+Math.random()*.4;
      this.color = Math.random()>.5 ? '#e9b2c9' : '#c9b8e5';
    }
    update(dt) {
      this.phase += .075*dt;
      this.x += this.speed*dt+Math.cos(this.phase*.25)*.35*dt;
      this.y += Math.sin(this.phase*.7)*.28*dt;
      if (this.x > width+35) {
        this.x=-30;
        this.y=height*.2+Math.random()*height*.5;
      }
    }
    draw() {
      const flap=2+Math.abs(Math.sin(this.phase))*5;
      nctx.save();
      nctx.translate(this.x,this.y);
      nctx.scale(this.scale,this.scale);
      nctx.fillStyle=this.color;
      nctx.beginPath();
      nctx.ellipse(-flap*.45,0,flap,4.5,-.35,0,Math.PI*2);
      nctx.ellipse(flap*.45,0,flap,4.5,.35,0,Math.PI*2);
      nctx.fill();
      nctx.strokeStyle='rgba(255,245,255,.8)';
      nctx.lineWidth=1;
      nctx.beginPath();
      nctx.moveTo(0,-3);
      nctx.lineTo(0,4);
      nctx.stroke();
      nctx.restore();
    }
  }

  function seedNature() {
    fireflies = Array.from(
      {length:Math.min(30,Math.max(12,Math.floor(width*height/34000)))},
      ()=>new Firefly()
    );
    butterflies = Array.from(
      {length:width<600?2:4},
      ()=>new Butterfly()
    );
  }

  function addFlower(x,y) {
    flowers.push(new Flower(x,y));
    if (instruction) instruction.textContent = flowers.length === 1
      ? 'A little flower is blooming just for you.'
      : `${flowers.length} lovely flowers are growing in your garden.`;
    const tip=document.getElementById('gardenTip');
    if(tip) tip.classList.add('tip-faded');
  }

  function stopAutoBloom() {
    autoBlooming=false;
    clearInterval(autoBloomTimer);
    autoBloomTimer=null;
    if (!autoBtn) return;
    autoBtn.classList.remove('active');
    autoBtn.setAttribute('aria-pressed','false');
    const label=autoBtn.querySelector('span:last-child');
    if(label) label.textContent='Auto bloom';
  }

  gardenCanvas.addEventListener('pointerdown', event => {
    if (!entered) return;
    if (event.pointerType==='mouse' && event.button!==0) return;
    addFlower(event.clientX,event.clientY);
  });

  if (enterBtn) enterBtn.addEventListener('click', () => {
    entered=true;
    welcomeScreen.classList.add('is-hidden');
    gardenUI.classList.add('is-visible');
    setTimeout(()=>welcomeScreen.setAttribute('aria-hidden','true'),950);
  });

  if (autoBtn) autoBtn.addEventListener('click', () => {
    if(autoBlooming){stopAutoBloom();return;}
    autoBlooming=true;
    autoBtn.classList.add('active');
    autoBtn.setAttribute('aria-pressed','true');
    const label=autoBtn.querySelector('span:last-child');
    if(label) label.textContent='Pause bloom';
    autoBloomTimer=setInterval(()=>{
      const margin=Math.min(55,width*.12);
      addFlower(
        margin+Math.random()*(width-margin*2),
        height*.38+Math.random()*height*.42
      );
    },850);
  });

  if (clearBtn) clearBtn.addEventListener('click', () => {
    flowers=[];
    pollen=[];
    if(instruction) instruction.textContent='A fresh little beginning. Tap anywhere to plant a flower.';
    const tip=document.getElementById('gardenTip');
    if(tip) tip.classList.remove('tip-faded');
    stopAutoBloom();
  });

  if (soundBtn) soundBtn.addEventListener('click', () => {
    soundBtn.title='Add an audio file to enable garden music.';
    soundBtn.innerHTML='♫ <span>Sound off</span>';
  });

  function drawAtmosphere(time) {
    nctx.clearRect(0,0,width,height);
    for(let i=0;i<42;i++){
      const x=(i*197.3)%width;
      const y=(i*113.7)%Math.max(1,height*.72);
      nctx.globalAlpha=.12+(Math.sin(time*.001+i*2)*.5+.5)*.22;
      nctx.fillStyle='#fff0d8';
      nctx.beginPath();
      nctx.arc(x,y,i%4===0?1:.6,0,Math.PI*2);
      nctx.fill();
    }
    nctx.globalAlpha=1;
    fireflies.forEach(f=>{f.update(frameDelta);f.draw();});
    butterflies.forEach(b=>{b.update(frameDelta);b.draw();});
  }

  function animate(time=0) {
    frameDelta=Math.min(2.2,Math.max(.35,(time-lastTime)/16.67||1));
    lastTime=time;
    ctx.clearRect(0,0,width,height);
    flowers.forEach(f=>{f.update(frameDelta,time);f.draw();});
    pollen=pollen.filter(p=>p.alpha>0);
    pollen.forEach(p=>{p.update(frameDelta);p.draw();});
    drawAtmosphere(time);
    requestAnimationFrame(animate);
  }

  resize();
  requestAnimationFrame(animate);
})();
