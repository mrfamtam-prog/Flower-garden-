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

// Aesthetic Flower Color Palettes
const flowerColors = [
    { petal: '#ff69b4', center: '#fff176' }, // Pink
    { petal: '#ea80fc', center: '#ffff8d' }, // Soft Purple
    { petal: '#ffd54f', center: '#ffffff' }, // Yellow
    { petal: '#ff8a80', center: '#ffe082' }, // Coral
    { petal: '#80d8ff', center: '#ffffff' }, // Sky Blue
    { petal: '#f48fb1', center: '#ffe082' }, // Rose Pink
    { petal: '#ffffff', center: '#ffd54f' }  // Pure White
];

// Flower Class
class Flower {
    constructor(targetX, targetY) {
        this.startX = targetX + (Math.random() - 0.5) * 30;
        this.startY = canvas.height + 10;
        this.targetX = targetX;
        this.targetY = targetY;

        this.growth = 0; // Stem growth progress (0 to 1)
        this.bloom = 0;  // Petal bloom progress (0 to 1)

        this.color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
        this.petalCount = Math.floor(Math.random() * 3) + 5; // 5 to 7 petals
        this.maxPetalRadius = Math.random() * 12 + 18;
        this.stemCurve = (Math.random() - 0.5) * 60; // Curve factor for natural stem

        // Leaves along the stem
        this.leafOffset1 = Math.random() * 0.2 + 0.3; // position on stem
        this.leafOffset2 = Math.random() * 0.2 + 0.6;
    }

    update() {
        if (this.growth < 1) {
            this.growth += 0.02; // Stem growth speed
        } else if (this.bloom < 1) {
            this.bloom += 0.03; // Blooming speed
        }
    }

    draw() {
        // Calculate current stem tip position
        const currentX = this.startX + (this.targetX - this.startX) * this.growth;
        const currentY = this.startY + (this.targetY - this.startY) * this.growth;
        const controlX = (this.startX + this.targetX) / 2 + this.stemCurve;
        const controlY = (this.startY + this.targetY) / 2;

        // 1. Draw Stem
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.quadraticCurveTo(
            controlX,
            controlY,
            currentX,
            currentY
        );
        ctx.strokeStyle = '#4caf50';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 2. Draw Leaves (when stem reaches them)
        if (this.growth > this.leafOffset1) {
            this.drawLeaf(this.startX, this.startY, controlX, controlY, this.targetX, this.targetY, this.leafOffset1, -1);
        }
        if (this.growth > this.leafOffset2) {
            this.drawLeaf(this.startX, this.startY, controlX, controlY, this.targetX, this.targetY, this.leafOffset2, 1);
        }

        // 3. Draw Blooming Petals
        if (this.growth >= 1) {
            ctx.save();
            ctx.translate(this.targetX, this.targetY);

            const currentPetalRadius = this.maxPetalRadius * this.bloom;

            // Petal Glow / Shadow Effect
            ctx.shadowColor = this.color.petal;
            ctx.shadowBlur = 10;

            for (let i = 0; i < this.petalCount; i++) {
                const angle = (i * 2 * Math.PI) / this.petalCount;
                ctx.save();
                ctx.rotate(angle);

                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(
                    currentPetalRadius * 0.6,
                    currentPetalRadius * 0.8,
                    0,
                    currentPetalRadius * 1.5
                );
                ctx.quadraticCurveTo(
                    -currentPetalRadius * 0.6,
                    currentPetalRadius * 0.8,
                    0,
                    0
                );
                ctx.fillStyle = this.color.petal;
                ctx.fill();
                ctx.restore();
            }

            // Draw Flower Center Disc
            ctx.beginPath();
            ctx.arc(0, 0, currentPetalRadius * 0.35, 0, Math.PI * 2);
            ctx.fillStyle = this.color.center;
            ctx.shadowBlur = 5;
            ctx.shadowColor = '#ffffff';
            ctx.fill();

            ctx.restore();
        }
    }

    drawLeaf(sx, sy, cx, cy, tx, ty, t, side) {
        // Bezier point interpolation for leaf placement
        const lx = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
        const ly = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;

        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate((side * Math.PI) / 4);

        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fillStyle = '#66bb6a';
        ctx.fill();
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

// Click and Touch Events for Canvas
canvas.addEventListener('click', (e) => {
    addFlower(e.clientX, e.clientY);
});

// Auto Bloom Toggle
autoBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isAutoBlooming = !isAutoBlooming;

    if (isAutoBlooming) {
        autoBtn.classList.add('active');
        autoBloomInterval = setInterval(() => {
            const randomX = Math.random() * (canvas.width - 100) + 50;
            const randomY = Math.random() * (canvas.height * 0.5) + canvas.height * 0.35;
            addFlower(randomX, randomY);
        }, 400);
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