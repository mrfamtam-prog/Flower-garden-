/* ==========================================
   MOONLIT BLOOM — COMPLETE GARDEN SCRIPT
   ========================================== */

const gardenCanvas = document.getElementById("gardenCanvas");
const natureCanvas = document.getElementById("natureCanvas");

const ctx = gardenCanvas.getContext("2d");
const natureCtx = natureCanvas.getContext("2d");

const welcomeScreen = document.getElementById("welcomeScreen");
const enterBtn = document.getElementById("enterBtn");
const gardenUI = document.getElementById("gardenUI");
const instruction = document.getElementById("instruction");
const gardenTip = document.getElementById("gardenTip");

const clearBtn = document.getElementById("clearBtn");
const autoBtn = document.getElementById("autoBtn");
const soundBtn = document.getElementById("soundBtn");

// Canvas settings
let width = 0;
let height = 0;
let dpr = 1;

let entered = false;
let lastTime = 0;

let flowers = [];
let pollen = [];
let fireflies = [];
let butterflies = [];
let grass = [];

let autoBloomTimer = null;
let autoBlooming = false;
let soundEnabled = true;

// Color palettes
const flowerPalettes = [
    {
        petals: ["#ff8fb1", "#ffb4cf", "#ff6f9f"],
        center: "#ffd66b",
        stem: "#75b879",
        leaf: "#69aa72"
    },
    {
        petals: ["#a78bfa", "#c4a8ff", "#8b72e8"],
        center: "#ffe28a",
        stem: "#70ae78",
        leaf: "#5f9e70"
    },
    {
        petals: ["#ffb45e", "#ffd08b", "#ff994c"],
        center: "#ffe27a",
        stem: "#78b87c",
        leaf: "#69a975"
    },
    {
        petals: ["#f5a6e6", "#ffc7ef", "#e98bd8"],
        center: "#ffe08a",
        stem: "#70aa75",
        leaf: "#65a575"
    },
    {
        petals: ["#8fd8ed", "#b7edfa", "#70c7df"],
        center: "#ffe18a",
        stem: "#72b27b",
        leaf: "#64a676"
    },
    {
        petals: ["#fff0a6", "#fff8c9", "#f8d96c"],
        center: "#f5b94d",
        stem: "#78b87c",
        leaf: "#6aa875"
    }
];


// ==========================================
// CANVAS RESIZE
// ==========================================

function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    width = window.innerWidth;
    height = window.innerHeight;

    [gardenCanvas, natureCanvas].forEach(canvas => {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        const context = canvas.getContext("2d");
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
    });

    makeNature();
}

window.addEventListener("resize", resizeCanvas);


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function choose(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function easeOut(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
}


// ==========================================
// FLOWER CLASS
// ==========================================

class Flower {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.scale = random(0.78, 1.12);
        this.palette = choose(flowerPalettes);

        this.growth = 0;
        this.growthSpeed = random(0.006, 0.009);

        this.bloom = 0;
        this.bloomSpeed = random(0.012, 0.018);

        this.sway = random(0, Math.PI * 2);
        this.swaySpeed = random(0.0007, 0.0012);

        this.stemHeight = Math.min(
            random(105, 185) * this.scale,
            Math.max(75, height * 0.28)
        );

        this.stemWidth = random(2.2, 3.2) * this.scale;

        this.headX = this.x;
        this.headY = this.y - this.stemHeight;

        this.petalCount = Math.floor(random(8, 11));
        this.petalSize = random(12, 18) * this.scale;

        this.centerSize = random(6, 9) * this.scale;

        this.leaves = [];

        // Alternate leaves on both sides of the stem.
        const leafCount = Math.floor(random(5, 8));

        for (let i = 0; i < leafCount; i++) {
            this.leaves.push({
                at: 0.19 + i * (0.65 / leafCount),
                side: i % 2 === 0 ? 1 : -1,
                length: random(17, 27) * this.scale,
                angle: random(-0.17, 0.17),
                width: random(5, 8) * this.scale
            });
        }
    }

    point(t) {
        const startX = this.x;
        const startY = this.y + 10;

        const endX = this.headX;
        const endY = this.headY;

        const swayAmount = Math.sin(this.sway) * 7 * this.scale;

        const cp1x = startX - swayAmount * 0.25;
        const cp1y = startY - this.stemHeight * 0.35;

        const cp2x = endX + swayAmount;
        const cp2y = endY + this.stemHeight * 0.35;

        const mt = 1 - t;

        const px =
            mt * mt * mt * startX +
            3 * mt * mt * t * cp1x +
            3 * mt * t * t * cp2x +
            t * t * t * endX;

        const py =
            mt * mt * mt * startY +
            3 * mt * mt * t * cp1y +
            3 * mt * t * t * cp2y +
            t * t * t * endY;

        return { x: px, y: py };
    }

    drawStem() {
        const progress = easeOut(this.growth);

        const currentEnd = this.point(progress);

        ctx.save();

        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const gradient = ctx.createLinearGradient(
            this.x,
            this.y,
            currentEnd.x,
            currentEnd.y
        );

        gradient.addColorStop(0, "#416c4d");
        gradient.addColorStop(0.55, this.palette.stem);
        gradient.addColorStop(1, "#a3d28e");

        ctx.strokeStyle = gradient;
        ctx.lineWidth = this.stemWidth;

        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 10);

        const p1 = this.point(progress * 0.34);
        const p2 = this.point(progress * 0.67);

        ctx.quadraticCurveTo(
            p1.x,
            p1.y,
            p2.x,
            p2.y
        );

        ctx.lineTo(currentEnd.x, currentEnd.y);
        ctx.stroke();

        ctx.restore();
    }

    // Leaves are drawn in two opposite directions.
    drawLeaf(x, y, leaf) {
        const size = leaf.length;
        const sideAngle = leaf.side === 1
            ? -0.40
            : Math.PI + 0.40;

        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(sideAngle + leaf.angle);

        const gradient = ctx.createLinearGradient(
            0, 0,
            size * 1.5, 0
        );

        gradient.addColorStop(0, "#477e53");
        gradient.addColorStop(0.5, this.palette.leaf);
        gradient.addColorStop(1, "#a0ce83");

        // Main leaf shape
        ctx.beginPath();
        ctx.moveTo(0, 0);

        ctx.quadraticCurveTo(
            size * 0.45,
            -leaf.width * 1.3,
            size * 1.5,
            -leaf.width * 0.08
        );

        ctx.quadraticCurveTo(
            size * 0.75,
            leaf.width * 1.05,
            0,
            0
        );

        ctx.fillStyle = gradient;
        ctx.fill();

        // Leaf center vein
        ctx.beginPath();
        ctx.moveTo(2, 0);
        ctx.quadraticCurveTo(
            size * 0.65,
            -leaf.width * 0.02,
            size * 1.42,
            -leaf.width * 0.08
        );

        ctx.strokeStyle = "rgba(225,255,205,0.48)";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
    }

    drawLeaves() {
        this.leaves.forEach(leaf => {
            if (this.growth < leaf.at) return;

            const p = this.point(leaf.at);

            const swayAmount =
                Math.sin(this.sway + leaf.at * 4) *
                2.5 * this.scale;

            const leafProgress = clamp(
                (this.growth - leaf.at) * 7,
                0,
                1
            );

            ctx.save();
            ctx.globalAlpha = leafProgress;

            this.drawLeaf(
                p.x + swayAmount,
                p.y,
                leaf
            );

            ctx.restore();
        });
    }

    drawFlowerHead() {
        const bloomProgress = easeOut(this.bloom);

        if (bloomProgress <= 0) return;

        const centerX = this.headX +
            Math.sin(this.sway) * 4 * this.scale;

        const centerY = this.headY;

        const petalSize = this.petalSize * bloomProgress;

        ctx.save();
        ctx.translate(centerX, centerY);

        // Soft flower glow
        const glow = ctx.createRadialGradient(
            0, 0, 1,
            0, 0, petalSize * 2.5
        );

        glow.addColorStop(0, "rgba(255,220,180,0.20)");
        glow.addColorStop(1, "rgba(255,220,180,0)");

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, petalSize * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Petals
        for (let i = 0; i < this.petalCount; i++) {
            const angle =
                (Math.PI * 2 / this.petalCount) * i;

            ctx.save();
            ctx.rotate(angle);

            const petalGradient = ctx.createLinearGradient(
                0,
                -petalSize * 0.2,
                0,
                -petalSize * 1.7
            );

            petalGradient.addColorStop(
                0,
                this.palette.petals[0]
            );

            petalGradient.addColorStop(
                0.55,
                this.palette.petals[1]
            );

            petalGradient.addColorStop(
                1,
                this.palette.petals[2]
            );

            ctx.beginPath();
            ctx.ellipse(
                0,
                -petalSize * 0.9,
                petalSize * 0.48,
                petalSize * 0.95,
                0,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = petalGradient;
            ctx.fill();

            ctx.restore();
        }

        // Flower center
        const centerGradient = ctx.createRadialGradient(
            -2, -2, 1,
            0, 0, this.centerSize
        );

        centerGradient.addColorStop(0, "#fff2ae");
        centerGradient.addColorStop(0.6, this.palette.center);
        centerGradient.addColorStop(1, "#d99743");

        ctx.beginPath();
        ctx.arc(
            0,
            0,
            this.centerSize * bloomProgress,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = centerGradient;
        ctx.fill();

        // Tiny details on the flower center
        ctx.fillStyle = "rgba(150,90,35,0.45)";

        for (let i = 0; i < 7; i++) {
            const angle = i * Math.PI * 2 / 7;
            const dx = Math.cos(angle) * this.centerSize * 0.48;
            const dy = Math.sin(angle) * this.centerSize * 0.48;

            ctx.beginPath();
            ctx.arc(dx, dy, 1.1 * this.scale, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    update(delta) {
        if (this.growth < 1) {
            this.growth = Math.min(
                1,
                this.growth + this.growthSpeed * delta
            );
        }

        if (this.growth > 0.72 && this.bloom < 1) {
            this.bloom = Math.min(
                1,
                this.bloom + this.bloomSpeed * delta
            );
        }

        this.sway += this.swaySpeed * delta;
    }

    draw() {
        this.drawStem();
        this.drawLeaves();
        this.drawFlowerHead();
    }
}


// ==========================================
// POLLEN PARTICLES
// ==========================================

class Pollen {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.vx = random(-0.6, 0.6);
        this.vy = random(-1.1, -0.3);

        this.size = random(1.2, 3);
        this.life = 1;
        this.decay = random(0.006, 0.014);
    }

    update(delta) {
        this.x += this.vx * delta;
        this.y += this.vy * delta;

        this.vx += random(-0.01, 0.01);
        this.life -= this.decay * delta;
    }

    draw() {
        ctx.save();

        ctx.globalAlpha = clamp(this.life, 0, 1) * 0.75;
        ctx.fillStyle = "#ffe7a6";
        ctx.shadowColor = "#ffe7a6";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}


// ==========================================
// FIRE FLY CLASS
// ==========================================

class Firefly {
    constructor() {
        this.x = random(0, width);
        this.y = random(0, height * 0.8);

        this.baseX = this.x;
        this.baseY = this.y;

        this.phase = random(0, Math.PI * 2);
        this.speed = random(0.3, 0.9);
        this.size = random(1.3, 2.5);
    }

    update(time) {
        this.x = this.baseX +
            Math.sin(time * 0.0004 * this.speed + this.phase) * 25;

        this.y = this.baseY +
            Math.cos(time * 0.0005 * this.speed + this.phase) * 16;
    }

    draw(time) {
        const brightness =
            0.3 + (Math.sin(time * 0.002 + this.phase) + 1) * 0.3;

        natureCtx.save();

        natureCtx.globalAlpha = brightness;
        natureCtx.fillStyle = "#f8e8a0";
        natureCtx.shadowColor = "#f8d978";
        natureCtx.shadowBlur = 12;

        natureCtx.beginPath();
        natureCtx.arc(
            this.x,
            this.y,
            this.size,
            0,
            Math.PI * 2
        );

        natureCtx.fill();
        natureCtx.restore();
    }
}


// ==========================================
// BUTTERFLY CLASS
// ==========================================

class Butterfly {
    constructor() {
        this.x = random(0, width);
        this.y = random(height * 0.2, height * 0.7);

        this.baseY = this.y;
        this.speed = random(0.25, 0.65);
        this.phase = random(0, Math.PI * 2);

        this.size = random(3, 5);
        this.color = choose([
            "#f6a9d5",
            "#b9a5ff",
            "#f9d88b",
            "#a5d9e9"
        ]);
    }

    update(delta, time) {
        this.x += this.speed * delta;

        this.y = this.baseY +
            Math.sin(time * 0.001 + this.phase) * 15;

        if (this.x > width + 20) {
            this.x = -20;
            this.baseY = random(height * 0.2, height * 0.7);
        }
    }

    draw(time) {
        const wingMove = Math.sin(time * 0.012 + this.phase);

        natureCtx.save();
        natureCtx.translate(this.x, this.y);

        natureCtx.fillStyle = this.color;
        natureCtx.globalAlpha = 0.8;

        natureCtx.beginPath();

        natureCtx.ellipse(
            -this.size * 0.65,
            0,
            this.size * 0.65,
            this.size * (0.65 + Math.abs(wingMove) * 0.35),
            -0.35,
            0,
            Math.PI * 2
        );

        natureCtx.ellipse(
            this.size * 0.65,
            0,
            this.size * 0.65,
            this.size * (0.65 + Math.abs(wingMove) * 0.35),
            0.35,
            0,
            Math.PI * 2
        );

        natureCtx.fill();

        natureCtx.restore();
    }
}


// ==========================================
// NATURAL GRASS GENERATION
// ==========================================

function makeNature() {
    grass = [];
    fireflies = [];
    butterflies = [];

    // Create grass clusters along the bottom edges.
    const clusterCount = Math.max(
        9,
        Math.floor(width / 105)
    );

    for (let i = 0; i < clusterCount; i++) {
        const edge = i % 2 === 0 ? "left" : "right";

        const baseX = edge === "left"
            ? random(-15, width * 0.22)
            : random(width * 0.78, width + 15);

        const baseY = height + random(-2, 9);

        const bladeCount = Math.floor(random(9, 17));

        for (let j = 0; j < bladeCount; j++) {
            grass.push({
                x: baseX + random(-24, 24),
                y: baseY + random(-2, 7),
                height: random(27, 92),
                width: random(2.5, 6),
                lean: random(-24, 24),
                phase: random(0, Math.PI * 2),
                speed: random(0.0005, 0.0011),
                color: choose([
                    "#315e42",
                    "#3b754d",
                    "#477f50",
                    "#568c58",
                    "#65965d"
                ]),
                opacity: random(0.55, 0.9)
            });
        }
    }

    // A few shorter grass blades near the center bottom.
    for (let i = 0; i < Math.floor(width / 30); i++) {
        grass.push({
            x: random(0, width),
            y: height + random(0, 5),
            height: random(12, 34),
            width: random(2, 4),
            lean: random(-12, 12),
            phase: random(0, Math.PI * 2),
            speed: random(0.0005, 0.001),
            color: choose([
                "#315e42",
                "#3b754d",
                "#477f50",
                "#568c58"
            ]),
            opacity: random(0.25, 0.48)
        });
    }

    for (let i = 0; i < 32; i++) {
        fireflies.push(new Firefly());
    }

    for (let i = 0; i < 4; i++) {
        butterflies.push(new Butterfly());
    }
}


// Draw a single curved, tapered grass blade.
function drawGrassBlade(blade, time) {
    const sway =
        Math.sin(time * blade.speed + blade.phase) * 3.5;

    const tipX = blade.x + blade.lean + sway;
    const tipY = blade.y - blade.height;

    const midX = blade.x + blade.lean * 0.45 + sway * 0.45;
    const midY = blade.y - blade.height * 0.52;

    const w = blade.width;

    natureCtx.save();
    natureCtx.globalAlpha = blade.opacity;

    const gradient = natureCtx.createLinearGradient(
        blade.x,
        blade.y,
        tipX,
        tipY
    );

    gradient.addColorStop(0, "#254d38");
    gradient.addColorStop(0.55, blade.color);
    gradient.addColorStop(1, "#8bbd77");

    natureCtx.beginPath();

    natureCtx.moveTo(blade.x - w * 0.55, blade.y);

    natureCtx.quadraticCurveTo(
        midX - w,
        midY,
        tipX,
        tipY
    );

    natureCtx.quadraticCurveTo(
        midX + w * 0.55,
        midY + blade.height * 0.12,
        blade.x + w * 0.55,
        blade.y
    );

    natureCtx.closePath();

    natureCtx.fillStyle = gradient;
    natureCtx.fill();

    natureCtx.restore();
}


// ==========================================
// DRAW NATURE
// ==========================================

function drawNature(time, delta) {
    natureCtx.clearRect(0, 0, width, height);

    // Soft ground shadow at the bottom.
    const groundGradient = natureCtx.createLinearGradient(
        0,
        height - 55,
        0,
        height
    );

    groundGradient.addColorStop(0, "rgba(29,65,45,0)");
    groundGradient.addColorStop(1, "rgba(25,63,42,0.35)");

    natureCtx.fillStyle = groundGradient;
    natureCtx.fillRect(0, height - 55, width, 55);

    // Grass blades.
    grass.forEach(blade => {
        drawGrassBlade(blade, time);
    });

    // Fireflies.
    fireflies.forEach(firefly => {
        firefly.update(time);
        firefly.draw(time);
    });

    // Butterflies.
    butterflies.forEach(butterfly => {
        butterfly.update(delta, time);
        butterfly.draw(time);
    });
}


// ==========================================
// PLANT FLOWER
// ==========================================

function addFlower(x, y) {
    const safeX = clamp(x, 18, width - 18);
    const safeY = clamp(y, height * 0.27, height - 12);

    const flower = new Flower(safeX, safeY);
    flowers.push(flower);

    // Small pollen particles around the new flower.
    for (let i = 0; i < 9; i++) {
        pollen.push(
            new Pollen(
                safeX + random(-12, 12),
                safeY - random(5, 25)
            )
        );
    }

    if (instruction) {
        instruction.textContent = "Your garden is blooming ✨";
    }
}


// ==========================================
// CANVAS CLICK / TOUCH
// ==========================================

function plantFromPointer(event) {
    if (!entered || autoBlooming) return;

    const rect = gardenCanvas.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    addFlower(x, y);
}

gardenCanvas.addEventListener("pointerdown", plantFromPointer);


// ==========================================
// ENTER GARDEN — FIXED
// ==========================================

enterBtn?.addEventListener("click", () => {
    entered = true;

    // Hide welcome screen using the correct CSS class.
    if (welcomeScreen) {
        welcomeScreen.classList.add("is-hidden");
    }

    // Show garden interface using the correct CSS class.
    if (gardenUI) {
        gardenUI.classList.add("is-visible");
    }

    // Start with an empty garden.
    flowers = [];
    pollen = [];

    if (instruction) {
        instruction.textContent =
            "Tap anywhere to plant your first flower";
    }

    if (gardenTip) {
        gardenTip.textContent =
            "Every flower begins with a little touch 🌱";
    }
});


// ==========================================
// CLEAR GARDEN
// ==========================================

clearBtn?.addEventListener("click", () => {
    flowers = [];
    pollen = [];

    stopAutoBloom();

    if (instruction) {
        instruction.textContent =
            "Your garden is empty. Plant a new flower!";
    }

    if (gardenTip) {
        gardenTip.textContent =
            "Tap anywhere to grow something beautiful 🌱";
    }
});


// ==========================================
// AUTO BLOOM
// ==========================================

function startAutoBloom() {
    if (!entered || autoBlooming) return;

    autoBlooming = true;

    if (autoBtn) {
        autoBtn.textContent = "Stop Auto Bloom";
    }

    if (instruction) {
        instruction.textContent =
            "Watch your magical garden grow ✨";
    }

    autoBloomTimer = setInterval(() => {
        const x = random(width * 0.15, width * 0.85);
        const y = random(height * 0.48, height * 0.88);

        addFlower(x, y);
    }, 1100);
}

function stopAutoBloom() {
    autoBlooming = false;

    if (autoBloomTimer) {
        clearInterval(autoBloomTimer);
        autoBloomTimer = null;
    }

    if (autoBtn) {
        autoBtn.textContent = "Auto Bloom";
    }
}

autoBtn?.addEventListener("click", () => {
    if (autoBlooming) {
        stopAutoBloom();

        if (instruction) {
            instruction.textContent =
                "Tap anywhere to plant a flower";
        }
    } else {
        startAutoBloom();
    }
});


// ==========================================
// SOUND BUTTON
// ==========================================

soundBtn?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;

    soundBtn.textContent = soundEnabled
        ? "Sound: On"
        : "Sound: Off";
});


// ==========================================
// MAIN ANIMATION LOOP
// ==========================================

function animate(time = 0) {
    const delta = lastTime
        ? Math.min((time - lastTime) / 16.67, 2.5)
        : 1;

    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    // Update and draw flowers.
    flowers.forEach(flower => {
        flower.update(delta);
        flower.draw();
    });

    // Update and draw pollen.
    pollen = pollen.filter(particle => particle.life > 0);

    pollen.forEach(particle => {
        particle.update(delta);
        particle.draw();
    });

    // Nature animation.
    drawNature(time, delta);

    requestAnimationFrame(animate);
}


// ==========================================
// INITIALIZE
// ==========================================

resizeCanvas();

// No starter flowers are planted here.
// The garden stays empty until the user clicks.

requestAnimationFrame(animate);
