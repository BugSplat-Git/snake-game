// Add type declaration for webpack hot module replacement
declare const module: {
    hot: {
        accept(path: string, callback: () => void): void;
    };
};

import { SnakeGame } from './game';
import { BugSplat } from 'bugsplat';

// Initialize BugSplat with your database, application, and version
// Replace these values with your actual BugSplat database, application, and version
const bugsplat = new BugSplat('fred', 'snake-game', '1.0.0');

// Configure BugSplat (optional)
bugsplat.setDefaultAppKey('snake-game-key');
bugsplat.setDefaultUser('player');
bugsplat.setDefaultDescription('Snake Game Crash Report');

// Console log capture - store the last 50 logs
const consoleHistory = {
    logs: [] as {type: string, args: any[], timestamp: string}[],
    maxLogs: 50,
    
    add(type: string, args: any[]) {
        this.logs.push({
            type,
            args: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ),
            timestamp: new Date().toISOString()
        });
        
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    },
    
    getAll() {
        return this.logs;
    },
    
    clear() {
        this.logs = [];
    },
    
    getAsFile() {
        const logText = this.logs.map((log: {timestamp: string, type: string, args: string[]}) => 
            `[${log.timestamp}] [${log.type}] ${log.args.join(' ')}`
        ).join('\n');
        
        return new File([logText], 'ConsoleLogs.txt', { type: 'text/plain' });
    }
};

// Monkey patch console methods
(function() {
    const methods = ['log', 'info', 'warn', 'error', 'debug'];
    
    methods.forEach(method => {
        const originalMethod = console[method as keyof Console];
        console[method as keyof Console] = function(...args: any[]) {
            // Call the original method
            originalMethod.apply(console, args);
            
            // Store in our history
            consoleHistory.add(method, args);
        } as any;
    });
})();

// Global error handler with BugSplat integration
window.addEventListener('error', async (event) => {
    console.error('CAPTURED ERROR EVENT:', event.error);
    
    // Take a screenshot of the game canvas
    const screenshot = await captureScreenshot();
    
    // Display a user-friendly error message
    const errorDisplay = document.createElement('div');
    errorDisplay.style.position = 'fixed';
    errorDisplay.style.top = '0';
    errorDisplay.style.left = '0';
    errorDisplay.style.width = '100%';
    errorDisplay.style.backgroundColor = '#ff4444';
    errorDisplay.style.color = 'white';
    errorDisplay.style.padding = '20px';
    errorDisplay.style.zIndex = '1000';
    errorDisplay.style.textAlign = 'center';
    
    errorDisplay.innerHTML = `
        <h3>Oops! The snake crashed!</h3>
        <p>${event.error.message}</p>
        <p>This error has been reported to BugSplat.</p>
        <button id="restart-after-error">Restart Game</button>
    `;
    
    document.body.appendChild(errorDisplay);
    
    // Add event listener to restart button
    document.getElementById('restart-after-error')?.addEventListener('click', () => {
        window.location.reload();
    });

    // Create attributes
    const attributes = `<?xml version="1.0" encoding="UTF-8"?>
        <crash>
            <userAgent>${navigator.userAgent}</userAgent>
            <timestamp>${new Date().toISOString()}</timestamp>
            <resolution>${window.innerWidth}x${window.innerHeight}</resolution>
            <url>${window.location.href}</url>
        </crash>`
    const attributesFile = new File([attributes], 'CrashContext.xml', { type: 'text/xml' });
    
    // Get console logs as a file
    const consoleLogsFile = consoleHistory.getAsFile();
    
    // Report the error to BugSplat
    await bugsplat.post(event.error, {
        description: `Snake game crash: ${event.error.message}`,
        // Additional metadata about the game state
        additionalFormDataParams: [
            {
                key: 'file0',
                value: attributesFile,
                filename: 'CrashContext.xml',
            },
            {
                key: 'file1',
                value: consoleLogsFile,
                filename: 'ConsoleLogs.txt',
            },
            ...(screenshot ? [{
                key: 'file2',
                value: screenshot,
                filename: 'GameScreenshot.png',
            }] : [])
        ]
    });
    
    // Clear console history after posting
    consoleHistory.clear();
    
    return false; // Prevents the default browser error handling
});

// Function to capture a screenshot of the game canvas
async function captureScreenshot(): Promise<File | null> {
    try {
        const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
        if (!canvas) return null;
        
        // Convert canvas to blob
        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/png');
        });
        
        if (!blob) return null;
        
        // Create a file from the blob
        return new File([blob], 'GameScreenshot.png', { type: 'image/png' });
    } catch (error) {
        console.error('Failed to capture screenshot:', error);
        return null;
    }
}

// Also handle unhandled promise rejections
window.onunhandledrejection = async (rejection) => {
    // Get console logs as a file
    const consoleLogsFile = consoleHistory.getAsFile();
    
    await bugsplat.post(rejection.reason, {
        description: 'Unhandled promise rejection',
        additionalFormDataParams: [
            {
                key: 'file0', 
                value: consoleLogsFile,
                filename: 'ConsoleLogs.txt',
            }
        ]
    });
    
    // Clear console history after posting
    consoleHistory.clear();
};

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
        
        // Also report initialization errors to BugSplat
        bugsplat.post(error, {
            description: 'Error initializing game'
        });
    }
}); 