export interface Point {
    x: number;
    y: number;
}

export enum Direction {
    Up,
    Down,
    Left,
    Right
}

export interface GameState {
    snake: Point[];
    food: Point;
    direction: Direction;
    gridSize: number;
    score: number;
    gameOver: boolean;
} 