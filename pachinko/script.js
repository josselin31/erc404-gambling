const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 2000;
canvas.height = 2000;

// UI Elements
const generateBallButton = document.getElementById('generateBallButton');
const ballCountRange = document.getElementById('ballCountRange');
const ballCountDisplay = document.getElementById('ballCountDisplay');
const counterContainer = document.getElementById('counterContainer');
const pausePlayButton = document.getElementById('pausePlayButton');
const walletAmount = document.getElementById('tokenBalance');
const autoStopCheckbox = document.getElementById('autoStopCheckbox');
const betAmount = document.getElementById('betAmount');
const currentMultiplier = document.getElementById('currentMultiplier');

// Game state
let wallet = 10000;
const pegs = [];
const balls = [];
const bins = [];
const binCounters = Array(29).fill(0);
const pegRadius = 8;
const ballRadius = 10;
const binWidth = 40;
const binHeight = 50;
const gravity = 0.2;
let paused = false;
let pauseTriggered = false;
let currentBet = 1.00;
let gameActive = false;

// Sound effects
const sounds = {
    ballDrop: new Audio('sounds/ball-drop.mp3'),
    win: new Audio('sounds/win.mp3'),
    lose: new Audio('sounds/lose.mp3'),
    pegHit: new Audio('sounds/peg-hit.mp3')
};

// Bin values with better distribution
const binValues = [
    1000, 250, 75, 10, 6, 4, 2, 1.5, 1.2, 1, 0.8, 0.5, 0.2, 0, -0.5,
    0, 0.2, 0.5, 0.8, 1, 1.2, 1.5, 2, 4, 6, 10, 75, 250, 1000
];

// Particle effects
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }

    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

let particles = [];

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push(new Particle(x, y, color));
    }
}

const binImage = document.createElement('img');
binImage.src = 'C:/Users/Jbros/OneDrive/Documents/PERSO/meme coin projet/pachinko/bin.png';
binImage.onload = function() {
    console.log('Bin image loaded');
};

// Données du graphique
let walletHistory = [wallet];
let ballCountHistory = [0];

// Initialisation des chevilles (pegs) en forme de pyramide, sans le peg au sommet
function createPegs() {
    const rows = 30; // Nombre de rangées de chevilles
    const offsetX = canvas.width / 2; // Décalage pour centrer la pyramide

    for (let row = 2; row <= rows; row++) { // Commencer à la deuxième rangée pour supprimer le peg au sommet
        const numPegsInRow = row;
        const y = 50 + row * 50; // Espacement vertical entre les rangées de chevilles
        const startX = offsetX - (numPegsInRow - 1) * 25; // Ajuster l'espacement horizontal des chevilles

        for (let peg = 0; peg < numPegsInRow; peg++) {
            const x = startX + peg * 50; // Ajuster l'espacement horizontal des chevilles
            pegs.push({ x: x, y: y });
        }
    }
    console.log("Pegs created:", pegs);
}

function createBins() {
    const numBins = 29; // Nombre de bacs, réduit à 29
    const lastRowPegs = 30; // Nombre de chevilles dans la dernière rangée
    const offsetX = canvas.width / 2 - (lastRowPegs - 1) * 25; // Décalage pour centrer la pyramide
    const lastRowY = 50 + 30 * 50; // Position Y de la dernière rangée de pegs

    for (let i = 0; i < numBins; i++) {
        const x = offsetX + (i + 0.5) * 50; // Centrer les bacs entre les pegs
        const y = lastRowY + 25; // Positionnement vertical des bacs, juste en dessous de la dernière rangée de pegs
        bins.push({ x: x - binWidth / 2, y: y, width: binWidth, height: binHeight, number: i + 1 });
    }
    console.log("Bins created:", bins);
}

function drawPegs() {
    ctx.fillStyle = 'black';
    pegs.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, pegRadius, 0, Math.PI * 2);
        ctx.fill();
    });
    console.log("Pegs drawn.");
}

function drawBins() {
    bins.forEach(bin => {
        ctx.fillStyle = 'grey';
        ctx.fillRect(bin.x, bin.y, bin.width, bin.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(bin.number, bin.x + bin.width / 2 - 5, bin.y + bin.height / 2 + 5);
    });
    console.log("Bins drawn.");
}

function drawLine() {
    const y = 50 + 20 * 50; // Position Y de la ligne à 2/3 de la hauteur de la pyramide
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
    console.log("Line drawn at 2/3 height.");
}

// vérification des billes capturées
function allBallsCaptured() {
    return balls.every(ball => ball.captured);
}

// Initialisation des balles
function createBall() {
    balls.push({ x: canvas.width / 2, y: 0, dx: 0, dy: 0, captured: false });
    console.log("Ball created:", balls);
}

function createBalls(count) {
    const costPerBall = 10;
    const totalCost = count * costPerBall;

    if (wallet >= totalCost && allBallsCaptured()) {
        for (let i = 0; i < count; i++) {
            createBall();
        }
        wallet -= totalCost; // Déduire les jetons du wallet
        updateWalletDisplay(); // Mettre à jour l'affichage du wallet
        pauseTriggered = false; // Réinitialiser le flag de pause pour la nouvelle vague de billes
    }
}

function updateWalletDisplay() {
    walletAmount.textContent = wallet;
}

function drawBalls() {
    ctx.fillStyle = 'blue';
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
    });
    console.log("Balls drawn.");
}

function updateBalls() {
    const lineY = 50 + 20 * 50;

    balls.forEach(ball => {
        if (!ball.captured) {
            ball.dy += gravity;
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Peg collisions with improved physics
            pegs.forEach(peg => {
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < pegRadius + ballRadius) {
                    sounds.pegHit.currentTime = 0;
                    sounds.pegHit.play();
                    createParticles(ball.x, ball.y, '#4a90e2');
                    
                    const angle = Math.atan2(dy, dx);
                    const randomAngle = (Math.random() - 0.5) * Math.PI / 6;
                    const newAngle = angle + randomAngle;
                    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    ball.dx = Math.cos(newAngle) * speed * 1.1;
                    ball.dy = Math.sin(newAngle) * speed * 1.1;
                }
            });

            // Bin collisions with effects
            bins.forEach((bin, index) => {
                if (ball.x > bin.x && ball.x < bin.x + bin.width && ball.y + ballRadius > bin.y) {
                    ball.dy = 0;
                    ball.dx = 0;
                    ball.y = bin.y + bin.height / 2 - ballRadius;
                    ball.captured = true;
                    binCounters[index]++;
                    
                    const multiplier = binValues[index];
                    if (multiplier > 0) {
                        sounds.win.currentTime = 0;
                        sounds.win.play();
                        createParticles(ball.x, ball.y, '#4CAF50');
                    } else {
                        sounds.lose.currentTime = 0;
                        sounds.lose.play();
                        createParticles(ball.x, ball.y, '#f44336');
                    }
                    
                    updateCounterDisplay();
                    updateWallet(multiplier);
                    showResultModal(multiplier);
                }
            });

            if (autoStopCheckbox.checked && !pauseTriggered && ball.y + ballRadius >= lineY) {
                paused = true;
                pauseTriggered = true;
                pausePlayButton.innerHTML = '<i class="fas fa-play"></i> Play';
            }
        }
    });

    // Update particles
    particles = particles.filter(particle => particle.life > 0);
    particles.forEach(particle => {
        particle.update();
        particle.draw();
    });
}

function updateCounterDisplay() {
    counterContainer.innerHTML = '';
    binCounters.forEach((count, index) => {
        const counter = document.createElement('div');
        counter.textContent = `Bin ${index + 1}: ${count} balls`;
        counterContainer.appendChild(counter);
    });
}

function updateWallet(multiplier) {
    const ballValue = 10;
    const totalValue = ballValue * multiplier;
    wallet += totalValue;
    updateWalletDisplay();
    updateChart(totalValue);
}

// Mise à jour du graphique
function updateChart(value) {
    walletHistory.push(wallet);
    ballCountHistory.push(ballCountHistory.length);
    walletChart.data.labels = ballCountHistory;
    walletChart.data.datasets[0].data = walletHistory;
    walletChart.update();
}

// Initialisation du graphique
const walletChart = new Chart(walletChartCtx, {
    type: 'line',
    data: {
        labels: ballCountHistory,
        datasets: [{
            label: 'Wallet Value',
            data: walletHistory,
            borderColor: 'blue',
            fill: false,
        }]
    },
    options: {
        scales: {
            x: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Ball Count'
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Wallet Value'
                }
            }
        }
    }
});

// Mise à jour de l'affichage du nombre de billes sélectionné
ballCountRange.addEventListener('input', () => {
    const values = [1, 10, 100, 1000];
    ballCountDisplay.textContent = values[ballCountRange.value];
});

// Boucle de jeu
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPegs();
    drawBins();
    drawLine();
    if (!paused) {
        updateBalls();
    }
    drawBalls();
    requestAnimationFrame(gameLoop);
    console.log("Game loop running.");
}

// Gestion du bouton Play
pausePlayButton.addEventListener('click', () => {
    if (paused) {
        paused = false;
        console.log('Game resumed.');
    }
});

// Ajout de l'écouteur d'événement pour le bouton
generateBallButton.addEventListener('click', () => {
    const values = [1, 10, 100, 1000];
    createBalls(values[ballCountRange.value]);
});

function showResultModal(multiplier) {
    const modal = document.getElementById('resultModal');
    const resultMultiplier = document.getElementById('resultMultiplier');
    const resultWinnings = document.getElementById('resultWinnings');
    
    const winnings = currentBet * multiplier;
    resultMultiplier.textContent = `${multiplier}x`;
    resultWinnings.textContent = `${winnings.toFixed(2)} GAMB`;
    
    modal.style.display = 'block';
}

// Event Listeners
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('resultModal').style.display = 'none';
});

betAmount.addEventListener('input', (e) => {
    currentBet = parseFloat(e.target.value);
    if (currentBet > wallet) {
        currentBet = wallet;
        e.target.value = wallet;
    }
});

document.querySelectorAll('.bet-control').forEach(button => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        switch(action) {
            case 'half':
                currentBet = Math.max(0.01, currentBet / 2);
                break;
            case 'double':
                currentBet = Math.min(wallet, currentBet * 2);
                break;
            case 'max':
                currentBet = wallet;
                break;
        }
        betAmount.value = currentBet.toFixed(2);
    });
});

// Initialisation
createPegs();
createBins();
updateWalletDisplay(); // Mettre à jour l'affichage du wallet à l'initialisation
gameLoop(); // Démarrer la boucle de jeu