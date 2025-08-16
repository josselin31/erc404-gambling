// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const BALL_RADIUS = 10;
const PIN_RADIUS = 5;
const PIN_SPACING = 40;
const START_Y = 50;
const MULTIPLIERS = [2, 3, 5, 7, 10];

// Game State
let canvas, ctx;
let balls = [];
let isPlaying = false;
let currentMultiplier = 1;
let selectedPath = null;
let autoStopEnabled = false;

// DOM Elements
const betAmountInput = document.getElementById('betAmount');
const ballCountRange = document.getElementById('ballCountRange');
const ballCountDisplay = document.getElementById('ballCountDisplay');
const generateBallButton = document.getElementById('generateBallButton');
const pausePlayButton = document.getElementById('pausePlayButton');
const autoStopCheckbox = document.getElementById('autoStopCheckbox');
const currentMultiplierDisplay = document.getElementById('currentMultiplier');
const resultModal = document.getElementById('resultModal');
const resultMultiplier = document.getElementById('resultMultiplier');
const resultWinnings = document.getElementById('resultWinnings');
const closeModal = document.getElementById('closeModal');

// Initialize Canvas
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Set canvas style size
    canvas.style.width = '100%';
    canvas.style.height = '100%';
}

// Ball Class
class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = BALL_RADIUS;
        this.dx = 0;
        this.dy = 0;
        this.speed = 2;
        this.active = true;
        this.path = [];
    }

    update() {
        if (!this.active) return;

        // Apply gravity
        this.dy += 0.1;

        // Update position
        this.x += this.dx;
        this.y += this.dy;

        // Check pin collisions
        checkPinCollisions(this);

        // Check if ball reached bottom
        if (this.y > CANVAS_HEIGHT - this.radius) {
            this.active = false;
            calculateResult(this);
        }

        // Record path
        this.path.push({ x: this.x, y: this.y });
    }

    draw() {
        if (!this.active) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#6C5CE7';
        ctx.fill();
        ctx.closePath();
    }
}

// Pin Class
class Pin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = PIN_RADIUS;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#A8A4FF';
        ctx.fill();
        ctx.closePath();
    }
}

// Game Functions
function createPins() {
    const pins = [];
    const rows = 10;
    const pinsPerRow = 5;

    for (let row = 0; row < rows; row++) {
        const y = START_Y + row * PIN_SPACING;
        const startX = CANVAS_WIDTH / 2 - (pinsPerRow - 1) * PIN_SPACING / 2;

        for (let i = 0; i < pinsPerRow; i++) {
            const x = startX + i * PIN_SPACING;
            pins.push(new Pin(x, y));
        }
    }

    return pins;
}

function checkPinCollisions(ball) {
    pins.forEach(pin => {
        const dx = ball.x - pin.x;
        const dy = ball.y - pin.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < ball.radius + pin.radius) {
            // Calculate collision response
            const angle = Math.atan2(dy, dx);
            const targetX = pin.x + Math.cos(angle) * (ball.radius + pin.radius);
            const targetY = pin.y + Math.sin(angle) * (ball.radius + pin.radius);
            const ax = (targetX - ball.x) * 0.05;
            const ay = (targetY - ball.y) * 0.05;
            ball.dx -= ax;
            ball.dy -= ay;
        }
    });
}

function calculateResult(ball) {
    const finalX = ball.x;
    const pathIndex = Math.floor((finalX - CANVAS_WIDTH / 2) / (CANVAS_WIDTH / 5));
    const multiplier = MULTIPLIERS[Math.min(Math.max(pathIndex + 2, 0), 4)];
    
    showResult(multiplier);
}

function showResult(multiplier) {
    const betAmount = parseFloat(betAmountInput.value);
    const winnings = betAmount * multiplier;
    
    resultMultiplier.textContent = `${multiplier}x`;
    resultWinnings.textContent = `${winnings.toFixed(2)} GAMB`;
    resultModal.classList.add('active');
}

// Animation Loop
function animate() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pins
    pins.forEach(pin => pin.draw());

    // Update and draw balls
    balls.forEach(ball => {
        ball.update();
        ball.draw();
    });

    // Draw path for selected ball
    if (balls.length > 0 && balls[0].path.length > 1) {
        ctx.beginPath();
        ctx.moveTo(balls[0].path[0].x, balls[0].path[0].y);
        balls[0].path.forEach(point => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = 'rgba(108, 92, 231, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    requestAnimationFrame(animate);
}

// Event Listeners
generateBallButton.addEventListener('click', () => {
    const count = parseInt(ballCountRange.value);
    const startX = CANVAS_WIDTH / 2;
    
    for (let i = 0; i < count; i++) {
        balls.push(new Ball(startX, START_Y));
    }
    
    isPlaying = true;
    animate();
});

pausePlayButton.addEventListener('click', () => {
    isPlaying = !isPlaying;
    pausePlayButton.textContent = isPlaying ? 'Pause' : 'Play';
});

ballCountRange.addEventListener('input', (e) => {
    ballCountDisplay.textContent = e.target.value;
});

autoStopCheckbox.addEventListener('change', (e) => {
    autoStopEnabled = e.target.checked;
});

closeModal.addEventListener('click', () => {
    resultModal.classList.remove('active');
    balls = [];
    isPlaying = false;
    pausePlayButton.textContent = 'Play';
});

// Initialize game
const pins = createPins();
initCanvas();
animate(); 