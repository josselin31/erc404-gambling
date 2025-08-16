// Game Constants
const CANVAS_WIDTH = 2000;
const CANVAS_HEIGHT = 2000;
const BALL_RADIUS = 10;
const PIN_RADIUS = 8;
const PIN_SPACING = 50;
const START_Y = 50;
const MULTIPLIERS = {
    coinflip: 1.98,
    diceroll: 5.94,
    numberguess: 99,
    pachinko: [2, 3, 5, 7, 10]
};

// Game State
let currentGame = null;
let canvas, ctx;
let balls = [];
let pins = [];
let bins = [];
let binCounters = Array(29).fill(0);
let isPlaying = false;
let paused = false;
let pauseTriggered = false;
let currentMultiplier = 1;
let selectedPath = null;
let autoStopEnabled = false;
let walletConnected = false;
let userBalance = 10000;

// Bin values from your implementation
const binValues = [
    1000, 250, 75, 10, 6, 4, 2, 1.5, 1.2, 1, 0.8, 0.5, 0.2, 0, -0.5,
    0, 0.2, 0.5, 0.8, 1, 1.2, 1.5, 2, 4, 6, 10, 75, 250, 1000
];

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setupWalletConnection();
});

// Event Listeners Setup
function initializeEventListeners() {
    // Game Selection
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const game = card.dataset.game;
            showGameInterface(game);
        });
    });

    // Back Button
    const backButton = document.getElementById('backToGames');
    if (backButton) {
        backButton.addEventListener('click', () => {
            document.getElementById('gameSelection').classList.remove('hidden');
            document.getElementById('gameInterface').classList.add('hidden');
            currentGame = null;
        });
    }

    // Bet Controls
    document.querySelectorAll('.bet-control').forEach(control => {
        control.addEventListener('click', () => handleBetControl(control));
    });

    // Game Controls
    setupGameControls();

    // Modal Controls
    setupModalControls();

    // Pachinko Controls
    setupPachinkoControls();
}

// Game Interface Management
function showGameInterface(game) {
    currentGame = game;
    document.getElementById('gameSelection').classList.add('hidden');
    document.getElementById('gameInterface').classList.remove('hidden');
    document.getElementById('currentGame').textContent = game.charAt(0).toUpperCase() + game.slice(1);

    // Hide all game controls
    document.getElementById('standardGames').classList.add('hidden');
    document.getElementById('pachinkoGame').classList.add('hidden');

    if (game === 'pachinko') {
        document.getElementById('pachinkoGame').classList.remove('hidden');
        initializePachinko();
    } else {
        document.getElementById('standardGames').classList.remove('hidden');
        document.querySelectorAll('.game-specific-controls').forEach(control => {
            control.classList.add('hidden');
        });
        document.getElementById(`${game}Controls`).classList.remove('hidden');
    }
}

// Bet Controls
function handleBetControl(control) {
    const action = control.dataset.action;
    const betInput = document.getElementById(currentGame === 'pachinko' ? 'pachinkoBetAmount' : 'betAmount');
    let currentValue = parseFloat(betInput.value) || 0;

    switch(action) {
        case 'half':
            betInput.value = (currentValue / 2).toFixed(2);
            break;
        case 'double':
            betInput.value = Math.min((currentValue * 2), 100).toFixed(2);
            break;
        case 'max':
            betInput.value = Math.min(userBalance, 100).toFixed(2);
            break;
    }
}

// Game Controls Setup
function setupGameControls() {
    // Choice Buttons (Coinflip, Dice)
    document.querySelectorAll('.choice-btn, .dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.classList.contains('choice-btn') ? '.choice-btn' : '.dice-btn';
            document.querySelectorAll(group).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('placeBet').disabled = false;
        });
    });

    // Number Guess Input
    const numberGuessInput = document.getElementById('numberGuess');
    if (numberGuessInput) {
        numberGuessInput.addEventListener('input', () => {
            const value = parseInt(numberGuessInput.value);
            document.getElementById('placeBet').disabled = !(value >= 0 && value <= 99);
        });
    }

    // Place Bet Button
    const placeBetBtn = document.getElementById('placeBet');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', handleBet);
    }
}

// Bet Handling
async function handleBet() {
    if (!walletConnected) {
        alert('Please connect your wallet first!');
        return;
    }

    const betAmount = parseFloat(document.getElementById('betAmount').value);
    if (betAmount <= 0 || betAmount > userBalance) {
        alert('Invalid bet amount!');
        return;
    }

    let choice;
    switch(currentGame) {
        case 'coinflip':
            choice = document.querySelector('.choice-btn.selected')?.dataset.choice;
            break;
        case 'diceroll':
            choice = document.querySelector('.dice-btn.selected')?.dataset.choice;
            break;
        case 'numberguess':
            choice = document.getElementById('numberGuess').value;
            break;
    }

    if (choice === undefined) {
        alert('Please make a selection!');
        return;
    }

    // Simulate bet result (replace with actual contract call)
    const result = await simulateBetResult(currentGame, betAmount, choice);
    showResultModal(result);
}

// Pachinko Game Implementation
function initializePachinko() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    createPegs();
    createBins();
    animate();
}

function createPegs() {
    const rows = 30; // Number of rows of pegs
    const offsetX = canvas.width / 2; // Offset to center the pyramid

    for (let row = 2; row <= rows; row++) { // Start from second row to remove top peg
        const numPegsInRow = row;
        const y = 50 + row * 50; // Vertical spacing between peg rows
        const startX = offsetX - (numPegsInRow - 1) * 25; // Adjust horizontal peg spacing

        for (let peg = 0; peg < numPegsInRow; peg++) {
            const x = startX + peg * 50; // Adjust horizontal peg spacing
            pins.push({ x: x, y: y });
        }
    }
}

function createBins() {
    const numBins = 29; // Number of bins, reduced to 29
    const lastRowPegs = 30; // Number of pegs in last row
    const offsetX = canvas.width / 2 - (lastRowPegs - 1) * 25; // Offset to center pyramid
    const lastRowY = 50 + 30 * 50; // Y position of last peg row
    const binWidth = 40; // Bin width
    const binHeight = 50; // Bin height

    for (let i = 0; i < numBins; i++) {
        const x = offsetX + (i + 0.5) * 50; // Center bins between pegs
        const y = lastRowY + 25; // Position bins just below last peg row
        bins.push({ x: x - binWidth / 2, y: y, width: binWidth, height: binHeight, number: i + 1 });
    }
}

function drawPegs() {
    ctx.fillStyle = 'black';
    pins.forEach(peg => {
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PIN_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawBins() {
    bins.forEach(bin => {
        ctx.fillStyle = 'grey';
        ctx.fillRect(bin.x, bin.y, bin.width, bin.height);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(bin.number, bin.x + bin.width / 2 - 5, bin.y + bin.height / 2 + 5);
    });
}

function drawLine() {
    const y = 50 + 20 * 50; // Line position at 2/3 height of pyramid
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function allBallsCaptured() {
    return balls.every(ball => ball.captured);
}

function createBall() {
    balls.push({ x: canvas.width / 2, y: 0, dx: 0, dy: 0, captured: false });
}

function createBalls(count) {
    const costPerBall = 10;
    const totalCost = count * costPerBall;

    if (userBalance >= totalCost && allBallsCaptured()) {
        for (let i = 0; i < count; i++) {
            createBall();
        }
        userBalance -= totalCost;
        updateBalanceDisplay();
        pauseTriggered = false;
    }
}

function drawBalls() {
    ctx.fillStyle = 'blue';
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    });
}

function updateBalls() {
    const lineY = 50 + 20 * 50; // Red line Y position
    const gravity = 0.2;

    balls.forEach(ball => {
        if (!ball.captured) {
            ball.dy += gravity;
            ball.x += ball.dx;
            ball.y += ball.dy;

            // Collision with pegs
            pins.forEach(peg => {
                const dx = ball.x - peg.x;
                const dy = ball.y - peg.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < PIN_RADIUS + BALL_RADIUS) {
                    const angle = Math.atan2(dy, dx);
                    const randomAngle = (Math.random() - 0.5) * Math.PI / 6;
                    const newAngle = angle + randomAngle;
                    ball.dx = Math.cos(newAngle) * 2;
                    ball.dy = Math.sin(newAngle) * 2;
                }
            });

            // Bottom wall collision
            if (ball.y + BALL_RADIUS > canvas.height) {
                ball.dy = -ball.dy * 0.9;
            }

            // Bin collision detection
            bins.forEach((bin, index) => {
                if (ball.x > bin.x && ball.x < bin.x + bin.width && ball.y + BALL_RADIUS > bin.y) {
                    ball.dy = 0;
                    ball.dx = 0;
                    ball.y = bin.y + bin.height / 2 - BALL_RADIUS;
                    ball.captured = true;
                    binCounters[index]++;
                    updateCounterDisplay();
                    updateWallet(binValues[index]);
                }
            });

            // Auto-stop at red line
            if (autoStopEnabled && !pauseTriggered && ball.y + BALL_RADIUS >= lineY) {
                paused = true;
                pauseTriggered = true;
                document.getElementById('pausePlayButton').textContent = 'Play';
            }
        }
    });
}

function updateCounterDisplay() {
    const counterContainer = document.getElementById('counterContainer');
    if (counterContainer) {
        counterContainer.innerHTML = '';
        binCounters.forEach((count, index) => {
            const counter = document.createElement('div');
            counter.textContent = `Bin ${index + 1}: ${count} balls`;
            counterContainer.appendChild(counter);
        });
    }
}

function animate() {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPegs();
    drawBins();
    drawLine();
    if (!paused) {
        updateBalls();
    }
    drawBalls();
    requestAnimationFrame(animate);
}

function setupPachinkoControls() {
    const generateBallButton = document.getElementById('generateBallButton');
    const pausePlayButton = document.getElementById('pausePlayButton');
    const ballCountRange = document.getElementById('ballCountRange');
    const autoStopCheckbox = document.getElementById('autoStopCheckbox');

    if (generateBallButton) {
        generateBallButton.addEventListener('click', () => {
            if (!walletConnected) {
                alert('Please connect your wallet first!');
                return;
            }

            const values = [1, 10, 100, 1000];
            createBalls(values[ballCountRange.value]);
            isPlaying = true;
            animate();
        });
    }

    if (pausePlayButton) {
        pausePlayButton.addEventListener('click', () => {
            paused = !paused;
            pausePlayButton.textContent = paused ? 'Play' : 'Pause';
            if (!paused) animate();
        });
    }

    if (ballCountRange) {
        ballCountRange.addEventListener('input', (e) => {
            const values = [1, 10, 100, 1000];
            document.getElementById('ballCountDisplay').textContent = values[e.target.value];
        });
    }

    if (autoStopCheckbox) {
        autoStopCheckbox.addEventListener('change', (e) => {
            autoStopEnabled = e.target.checked;
        });
    }
}

// Result Handling
function calculatePachinkoResult(ball) {
    const finalX = ball.x;
    const pathIndex = Math.floor((finalX - CANVAS_WIDTH / 2) / (CANVAS_WIDTH / 5));
    const multiplier = MULTIPLIERS.pachinko[Math.min(Math.max(pathIndex + 2, 0), 4)];
    
    const betAmount = parseFloat(document.getElementById('pachinkoBetAmount').value);
    const winnings = betAmount * multiplier;
    
    showResultModal({
        success: true,
        multiplier,
        winnings
    });
}

async function simulateBetResult(game, amount, choice) {
    // Replace with actual contract calls
    const random = Math.random();
    let success = false;
    let multiplier = 0;

    switch(game) {
        case 'coinflip':
            success = (random > 0.5 && choice === '1') || (random <= 0.5 && choice === '0');
            multiplier = success ? MULTIPLIERS.coinflip : 0;
            break;
        case 'diceroll':
            success = Math.floor(random * 6) + 1 === parseInt(choice);
            multiplier = success ? MULTIPLIERS.diceroll : 0;
            break;
        case 'numberguess':
            success = Math.floor(random * 100) === parseInt(choice);
            multiplier = success ? MULTIPLIERS.numberguess : 0;
            break;
    }

    return {
        success,
        multiplier,
        winnings: amount * multiplier
    };
}

function showResultModal(result) {
    const resultModal = document.getElementById('resultModal');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');

    resultTitle.textContent = result.success ? 'Congratulations!' : 'Better luck next time!';
    resultMessage.textContent = `You ${result.success ? 'won' : 'lost'} ${result.winnings.toFixed(2)} GAMB`;
    
    if (result.success) {
        userBalance += result.winnings;
    } else {
        userBalance -= parseFloat(document.getElementById(currentGame === 'pachinko' ? 'pachinkoBetAmount' : 'betAmount').value);
    }
    
    updateBalanceDisplay();
    resultModal.classList.add('active');
}

// Modal Controls
function setupModalControls() {
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            document.getElementById('resultModal').classList.remove('active');
            if (currentGame === 'pachinko') {
                balls = [];
                isPlaying = false;
                document.getElementById('pausePlayButton').textContent = 'Play';
            }
        });
    }
}

// Wallet Connection
function setupWalletConnection() {
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
}

async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            document.getElementById('connectWallet').textContent = 
                `${account.slice(0, 6)}...${account.slice(-4)}`;
            
            walletConnected = true;
            userBalance = 10000; // Replace with actual balance from contract
            updateBalanceDisplay();
        } catch (error) {
            console.error('User denied account access');
        }
    } else {
        alert('Please install MetaMask!');
    }
}

function updateBalanceDisplay() {
    document.getElementById('tokenBalance').textContent = userBalance.toFixed(2);
} 