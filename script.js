const canvas = document.getElementById('gardenCanvas');
const ctx = canvas.getContext('2d');

const instruction = document.getElementById('instruction');
const clearBtn = document.getElementById('clearBtn');
const autoBtn = document.getElementById('autoBtn');

let flowers = [];
let autoBloomInterval = null;
let isAutoBlooming = false;

// Resize Canvas to fit Window
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// High-Aesthetic Color Palettes (Core glow -> Main petal -> Outer tip)
const flowerPalettes = [
    { base: '#ff2a7a', main: '#ff6097', tip: '#ffb3d1', center: '#fff176' }, // Neon Rose Pink
    { base: '#8e24aa', main: '#ba68c8', tip: '#f3e5f5', center: '#ffd54f' }, // Soft Lavender/Purple
    { base: '#ff6d00', main: '#ff9100', tip: '#ffe082', center: '#ffffff' }, // Golden Peach
    { base: '#d50000', main: '#ff5252', tip: '#ff8a80', center: '#ffecb3' }, // Coral Red
    { base: '#00b0ff', main: '#80d8ff', tip: '#e0f7fa', center: '#ffff8d' }, // Electric Sky
    { base: '#c2185b', main: '#e91e63', tip: '#f8bbd0', center: '#fff59d' }  // Deep Magenta
];

// Flower Class
class Flower {
    constructor(targetX, targetY) {
        this.startX = targetX + (Math.random() - 0.5) * 40;
        this.startY = canvas.height + 10;
        this.targetX = targetX;
        this.targetY = targetY;

        this.growth = 0; // Stem growth progress (0 to 1)
        this.bloom = 0;  // Petal bloom progress (0 to 1)

        this.palette = flowerPalettes[Math.floor(Math.random() * flowerPalettes.length)];
        this.petalCount = Math.floor(Math.random() * 2) + 6; // 6 or 7 petals
        this.maxPetalLength = Math.random() * 10 + 26;
        this.maxPetalWidth = this.maxPetalLength * 0.65;
        this.stemCurve = (Math.random() - 0.5) * 70;

        // Leaves setup (2 leaves per stem at different heights)
        this.leaf1Ratio = Math.random() * 0.2 + 0.35;
        this.leaf2Ratio = Math.random() * 0.2 + 0.65;
        this.leaf1Size = Math.random() * 6 + 18;
        this.leaf2Size = Math.random() * 6 + 16;
    }

    update() {
        if (this.growth < 1) {
            this.growth += 0.022; // Stem growth speed
        } else if (this.bloom < 1) {
            this.bloom += 0.028; // Blooming speed
        }
    }

    // Quadratic Bezier Interpolation to find point (x,y) along stem at factor 't'
    getStemPoint(t) {
        const controlX = (this.startX + this.targetX) / 2 + this.stemCurve;
        const controlY = (this.startY + this.targetY) / 2;

        const x = (1 - t) * (1 - t) * this.startX + 2 * (1 - t) * t * controlX + t * t * this.targetX;
        const y = (1 - t) * (1 - t) * this.startY + 2 * (1 - t) * t * controlY + t * t * this.targetY;

        // Derivative tangent angle for leaf rotation alignment
        const dx = 2 * (1 - t) * (controlX - this.startX) + 2 * t * (this.targetX - controlX);
        const dy = 2 * (1 - t) * (controlY - this.startY) + 2 * t * (this.targetY - controlY);
        const angle = Math.atan2(dy, dx);

        return { x, y, angle };
    }

    draw() {
        const currentT = Math.min(this.growth, 1);
        const currentTip = this.getStemPoint(currentT);
        const controlX = (this.startX + this.targetX) / 2 + this.stemCurve;
        const controlY = (this.startY + this.targetY) / 2;

        // 1. Draw Tapered Stem
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.quadraticCurveTo(controlX, controlY, currentTip.x, currentTip.y);

        let stemGrad = ctx.createLinearGradient(this.startX, this.startY, currentTip.x, currentTip.y);
        stemGrad.addColorStop(0, '#1b5e20');
        stemGrad.addColorStop(1, '#4caf50');

        ctx.strokeStyle = stemGrad;
        ctx.lineWidth = 3.8 - (1.8 * currentT); // Tapering stem thickness
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // 2. Draw Leaves
        if (this.growth > this.leaf1Ratio) {
            const leaf1 = this.getStemPoint(this.leaf1Ratio);
            this.drawLeaf(leaf1.x, leaf1.y, leaf1.angle - Math.PI / 3, this.leaf1Size);
        }
        if (this.growth > this.leaf2Ratio) {
            const leaf2 = this.getStemPoint(this.leaf2Ratio);
            this.drawLeaf(leaf2.x, leaf2.y, leaf2.angle + Math.PI / 3, this.leaf2Size);
        }

        // 3. Draw Bloom
        if (this.growth >= 1) {
            ctx.save();
            ctx.translate(this.targetX, this.targetY);

            const b = this.bloom;
            const pLength = this.maxPetalLength * b;
            const pWidth = this.maxPetalWidth * b;

            // Outer Layer Petals
            for (let i = 0; i < this.petalCount; i++) {
                const angle = (i * 2 * Math.PI) / this.petalCount;
                this.drawPetal(angle, pLength, pWidth, 1.0);
            }

            // Inner Layer Petals (Rotated for density)
            for (let i = 0; i < this.petalCount; i++) {
                const angle = (i * 2 * Math.PI) / this.petalCount + (Math.PI / this.petalCount);
                this.drawPetal(angle, pLength * 0.75, pWidth * 0.7, 0.9);
            }

            // Stamen & Glowing Center Disc
            this.drawCenter(pLength * 0.3);

            ctx.restore();
        }
    }

    // Detailed Organic Leaf Drawing
    drawLeaf(x, y, angle, size) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(size * 0.5, -size * 0.5, size, -size * 0.25, size * 1.2, 0);
        ctx.bezierCurveTo(size, size * 0.25, size * 0.5, size * 0.5, 0, 0);

        let leafGrad = ctx.createLinearGradient(0, 0, size * 1.2, 0);
        leafGrad.addColorStop(0, '#2e7d32');
        leafGrad.addColorStop(0.7, '#66bb6a');
        leafGrad.addColorStop(1, '#aed581');

        ctx.fillStyle = leafGrad;
        ctx.fill();

        // White/Bright Center Vein for crisp details
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(size * 0.6, -size * 0.05, size * 1.05, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
    }

    // Detailed Petal Drawing
    drawPetal(angle, length, width, opacity) {
        ctx.save();
        ctx.rotate(angle);
        ctx.globalAlpha = opacity;

        // Radial Gradient across the petal
        let grad = ctx.createRadialGradient(0, 0, 0, 0, length * 0.7, length);
        grad.addColorStop(0, this.palette.base);
        grad.addColorStop(0.5, this.palette.main);
        grad.addColorStop(1, this.palette.tip);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(-width * 0.8, length * 0.3, -width, length * 0.8, 0, length);
        ctx.bezierCurveTo(width, length * 0.8, width * 0.8, length * 0.3, 0, 0);

        ctx.fillStyle = grad;
        ctx.shadowColor = this.palette.main;
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.restore();
    }

    // Flower Center Core & Stamen Dots
    drawCenter(radius) {
        if (radius <= 0) return;

        // Center Disc
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        let centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
        centerGrad.addColorStop(0, '#ffffff');
        centerGrad.addColorStop(0.6, this.palette.center);
        centerGrad.addColorStop(1, '#f57f17');
        ctx.fillStyle = centerGrad;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.fill();

        // Surrounding Stamen Dots
        const stamenCount = 8;
        for (let i = 0; i < stamenCount; i++) {
            const stamenAngle = (i * 2 * Math.PI) / stamenCount;
            const dist = radius * 1.3;
            const sx = Math.cos(stamenAngle) * dist;
            const sy = Math.sin(stamenAngle) * dist;

            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 4;
            ctx.fill();
        }

        ctx.restore();
    }
}

// Add Flower on Click/Tap
function addFlower(x, y) {
    if (instruction) {
        instruction.classList.add('hidden');
    }
    flowers.push(new Flower(x, y));
}

// Click and Mobile Touch Events
canvas.addEventListener('click', (e) => {
    addFlower(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    addFlower(touch.clientX, touch.clientY);
}, { passive: false });

// Auto Bloom Toggle
autoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isAutoBlooming = !isAutoBlooming;

    if (isAutoBlooming) {
        autoBtn.classList.add('active');
        autoBloomInterval = setInterval(() => {
            const randomX = Math.random() * (canvas.width - 120) + 60;
            const randomY = Math.random() * (canvas.height * 0.5) + canvas.height * 0.35;
            addFlower(randomX, randomY);
        }, 380);
    } else {
        autoBtn.classList.remove('active');
        clearInterval(autoBloomInterval);
    }
});

// Clear Garden
clearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    flowers = [];
    if (instruction) {
        instruction.classList.remove('hidden');
    }
});

// Animation Loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    flowers.forEach((flower) => {
        flower.update();
        flower.draw();
    });

    requestAnimationFrame(animate);
}

animate();
