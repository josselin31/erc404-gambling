// Game Selection and Navigation
document.addEventListener('DOMContentLoaded', () => {
    // Game Selection
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => {
            const game = card.dataset.game;
            if (game === 'pachinko') {
                window.location.href = 'pachinko.html';
            } else {
                showGameInterface(game);
            }
        });
    });

    // Bet Controls
    document.querySelectorAll('.bet-control').forEach(control => {
        control.addEventListener('click', () => {
            const action = control.dataset.action;
            const betInput = document.getElementById('betAmount');
            let currentValue = parseFloat(betInput.value) || 0;

            switch(action) {
                case 'half':
                    betInput.value = (currentValue / 2).toFixed(2);
                    break;
                case 'double':
                    betInput.value = (currentValue * 2).toFixed(2);
                    break;
                case 'max':
                    betInput.value = '100.00';
                    break;
            }
        });
    });

    // Game Controls
    document.querySelectorAll('.choice-btn, .dice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove selected class from all buttons
            document.querySelectorAll('.choice-btn, .dice-btn').forEach(b => {
                b.classList.remove('selected');
            });
            // Add selected class to clicked button
            btn.classList.add('selected');
            // Enable place bet button
            document.getElementById('placeBet').disabled = false;
        });
    });

    // Number Guess Input
    const numberGuessInput = document.getElementById('numberGuess');
    if (numberGuessInput) {
        numberGuessInput.addEventListener('input', () => {
            const value = parseInt(numberGuessInput.value);
            if (value >= 0 && value <= 99) {
                document.getElementById('placeBet').disabled = false;
            } else {
                document.getElementById('placeBet').disabled = true;
            }
        });
    }

    // Place Bet Button
    const placeBetBtn = document.getElementById('placeBet');
    if (placeBetBtn) {
        placeBetBtn.addEventListener('click', () => {
            const betAmount = parseFloat(document.getElementById('betAmount').value);
            const currentGame = document.getElementById('currentGame').textContent;
            
            // Simulate bet placement (replace with actual contract interaction)
            showResultModal(currentGame, betAmount);
        });
    }

    // Modal Controls
    const resultModal = document.getElementById('resultModal');
    const closeModal = document.getElementById('closeModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            resultModal.classList.remove('active');
        });
    }

    // Wallet Connection
    const connectWalletBtn = document.getElementById('connectWallet');
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', connectWallet);
    }
});

// Show Game Interface
function showGameInterface(game) {
    // Hide all game controls
    document.querySelectorAll('.game-specific-controls').forEach(control => {
        control.classList.add('hidden');
    });

    // Show selected game controls
    const gameControls = document.getElementById(`${game}Controls`);
    if (gameControls) {
        gameControls.classList.remove('hidden');
    }

    // Update current game title
    document.getElementById('currentGame').textContent = game.charAt(0).toUpperCase() + game.slice(1);
}

// Show Result Modal
function showResultModal(game, amount) {
    const resultModal = document.getElementById('resultModal');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');

    // Simulate random result (replace with actual contract result)
    const isWin = Math.random() > 0.5;
    const multiplier = isWin ? 2 : 0;
    const winnings = amount * multiplier;

    resultTitle.textContent = isWin ? 'Congratulations!' : 'Better luck next time!';
    resultMessage.textContent = `You ${isWin ? 'won' : 'lost'} ${winnings.toFixed(2)} GAMB`;
    resultModal.classList.add('active');
}

// Wallet Connection
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const account = accounts[0];
            document.getElementById('connectWallet').textContent = 
                `${account.slice(0, 6)}...${account.slice(-4)}`;
            
            // Update token balance (replace with actual contract call)
            document.getElementById('tokenBalance').textContent = '1000.00';
        } catch (error) {
            console.error('User denied account access');
        }
    } else {
        alert('Please install MetaMask!');
    }
} 