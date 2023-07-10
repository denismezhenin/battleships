export interface User {
name: string,
password: string,
socket: WebSocket
}

export interface Rooms {
  roomId : number,
  roomUsers: {name: string, index: number}[]
}

export interface Winner {
name: string;
wins: number;
} 