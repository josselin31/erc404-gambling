// Game Selection and Navigation
document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
        const game = card.dataset.game;
        if (game === 'pachinko') {
            window.location.href = 'pachinko.html';
        } else {
            // Handle other games
            showGameInterface(game);
        }
    });
}); 