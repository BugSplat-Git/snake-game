import { Direction, GameState, Point } from './types';

export class SnakeGame {
    private state: GameState;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private cellSize: number;
    private gameLoopId: number | null = null;
    private lastRenderTime: number = 0;
    private gameSpeed: number = 10; // Frames per second

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        const ctx = this.canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }
        
        this.ctx = ctx;
        this.cellSize = 20; // Size of each grid cell in pixels
        
        // Initialize state first with initial snake position
        this.state = {
            snake: [{ x: 5, y: 5 }], // Starting position
            food: { x: 10, y: 10 }, // Temporary food position
            direction: Direction.Right,
            gridSize: Math.floor(this.canvas.width / this.cellSize),
            score: 0,
            gameOver: false
        };
        
        // Now generate food after state is initialized
        this.state.food = this.generateFood();

        this.setupEventListeners();
        this.updateScore();
    }

    private generateFood(): Point {
        const max = Math.floor(this.canvas.width / this.cellSize) - 1;
        const foodPosition = {
            x: Math.floor(Math.random() * max),
            y: Math.floor(Math.random() * max)
        };

        // Ensure food doesn't appear on the snake
        const isOnSnake = this.state.snake.some(
            segment => segment.x === foodPosition.x && segment.y === foodPosition.y
        );

        if (isOnSnake) {
            return this.generateFood();
        }

        return foodPosition;
    }

    private updateScore(): void {
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = this.state.score.toString();
        }
    }

    private setupEventListeners(): void {
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (this.state.direction !== Direction.Down) {
                        this.state.direction = Direction.Up;
                    }
                    break;
                case 'ArrowDown':
                    if (this.state.direction !== Direction.Up) {
                        this.state.direction = Direction.Down;
                    }
                    break;
                case 'ArrowLeft':
                    if (this.state.direction !== Direction.Right) {
                        this.state.direction = Direction.Left;
                    }
                    break;
                case 'ArrowRight':
                    if (this.state.direction !== Direction.Left) {
                        this.state.direction = Direction.Right;
                    }
                    break;
            }
        });

        // Restart button
        const restartButton = document.getElementById('restart-button');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restart());
        }
    }

    private update(): void {
        if (this.state.gameOver) return;

        const head = { ...this.state.snake[0] };

        // Move the head based on the current direction
        switch (this.state.direction) {
            case Direction.Up:
                head.y -= 1;
                break;
            case Direction.Down:
                head.y += 1;
                break;
            case Direction.Left:
                head.x -= 1;
                break;
            case Direction.Right:
                head.x += 1;
                break;
        }

        // Check if the snake hit a wall
        if (
            head.x < 0 || 
            head.y < 0 || 
            head.x >= this.state.gridSize || 
            head.y >= this.state.gridSize
        ) {
            let wallHit = "";
            if (head.x < 0) wallHit = "left";
            else if (head.x >= this.state.gridSize) wallHit = "right";
            else if (head.y < 0) wallHit = "top";
            else if (head.y >= this.state.gridSize) wallHit = "bottom";
            
            throw new Error(`CRASH: Snake collided with ${wallHit} wall at position (${head.x}, ${head.y}) with score ${this.state.score}`);
        }

        // Check if the snake hit itself
        const collidingSegment = this.state.snake.find(segment => segment.x === head.x && segment.y === head.y);
        if (collidingSegment) {
            this.state.gameOver = true;
            return;
        }

        // Add the new head to the beginning of the snake array
        this.state.snake.unshift(head);

        // Check if the snake ate the food
        if (head.x === this.state.food.x && head.y === this.state.food.y) {
            // Increase score
            this.state.score += 1;
            this.updateScore();
            
            // Generate new food
            this.state.food = this.generateFood();
        } else {
            // Remove the last segment of the snake if it didn't eat food
            this.state.snake.pop();
        }
    }

    private render(): void {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw the snake
        this.state.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#333' : '#555'; // Different color for the head
            this.ctx.fillRect(
                segment.x * this.cellSize, 
                segment.y * this.cellSize, 
                this.cellSize, 
                this.cellSize
            );
            
            // Add a small border to make segments more visible
            this.ctx.strokeStyle = '#ddd';
            this.ctx.strokeRect(
                segment.x * this.cellSize, 
                segment.y * this.cellSize, 
                this.cellSize, 
                this.cellSize
            );
        });

        // Draw the food
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(
            this.state.food.x * this.cellSize + this.cellSize / 2,
            this.state.food.y * this.cellSize + this.cellSize / 2,
            this.cellSize / 2 - 2,
            0,
            Math.PI * 2
        );
        this.ctx.fill();

        // Draw game over message if game is over
        if (this.state.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.font = '30px Arial';
            this.ctx.fillStyle = 'white';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                'Game Over', 
                this.canvas.width / 2, 
                this.canvas.height / 2
            );
            
            this.ctx.font = '20px Arial';
            this.ctx.fillText(
                `Score: ${this.state.score}`, 
                this.canvas.width / 2, 
                this.canvas.height / 2 + 40
            );
            
            this.ctx.fillText(
                'Press Restart to play again', 
                this.canvas.width / 2, 
                this.canvas.height / 2 + 80
            );
        }
    }

    private gameLoop(currentTime: number): void {
        if (this.gameLoopId === null) return;

        // Set up the next animation frame first
        this.gameLoopId = window.requestAnimationFrame(this.gameLoop.bind(this));

        const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
        if (secondsSinceLastRender < 1 / this.gameSpeed) return;

        this.lastRenderTime = currentTime;
        
        try {
            this.update();
            this.render();
        } catch (error) {
            // Stop the game loop if an error occurs
            this.stop();
            // Re-throw the error to be caught by the global error handler
            throw error;
        }
    }

    public start(): void {
        if (this.gameLoopId === null) {
            this.gameLoopId = window.requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    public stop(): void {
        if (this.gameLoopId !== null) {
            window.cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
    }

    public restart(): void {
        this.state = {
            snake: [{ x: 5, y: 5 }],
            food: this.generateFood(),
            direction: Direction.Right,
            gridSize: Math.floor(this.canvas.width / this.cellSize),
            score: 0,
            gameOver: false
        };
        
        this.updateScore();
        
        if (this.gameLoopId === null) {
            this.start();
        }
    }
} 