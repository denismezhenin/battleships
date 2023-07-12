import { WebSocket } from 'ws';

export interface User {
    name: string;
    password: string;
    socket: WebSocket;
}

export interface Rooms {
    roomId: number;
    roomUsers: { name: string; index: number }[];
}

export interface Winner {
    name: string;
    wins: number;
}

export type Coordinate = { x: number; y: number };

export type Ship = {
    shipCells: Coordinate[];
    surroundingCells: Coordinate[];
    originShipCoord: Coordinate[];
};

export interface Game {
    idGame: number;
    players: {
        [key: string]: {
            socket: WebSocket;
            strikes: Coordinate[];
            name: string;
            ships: Ship[];
        };
    };
    turn: number;
    isFinished: boolean;
}

export interface Games {
    [key: string]: Game;
}

export interface IncomingShipsData {
    position: {
        x: number;
        y: number;
    };
    direction: boolean;
    length: number;
    type: 'small' | 'medium' | 'large' | 'huge';
}

export interface IncomingData {
    gameId: number;
    message: string;
    x: number;
    y: number;
    indexPlayer: number;
}
