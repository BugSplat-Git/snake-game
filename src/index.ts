// Add type declaration for webpack hot module replacement
declare const module: {
    hot: {
        accept(path: string, callback: () => void): void;
    };
};

import { SnakeGame } from './game';

// Initialize game when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Starting Snake Game');
    
    try {
        const game = new SnakeGame('game-canvas');
        game.start();
        
        console.log('Game initialized and started');
        
        // For hot module replacement
        if (module.hot) {
            module.hot.accept('./game', () => {
                console.log('Updating game module');
                game.stop();
                const newGame = new SnakeGame('game-canvas');
                newGame.start();
            });
        }
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}); 