import { WebSocket } from 'ws';
import { Game } from '../constants/types';
import { games, rooms, users } from '../db/db';
import { createStringifiedMessage } from '../helpers/helpers';
import { ws } from '../index';

export const createRoom = (socket: WebSocket) => {
    const roomId = rooms.length;
    const user = users.find((el) => el.socket === socket);
    if (!user) return;
    const room = {
        roomId,
        roomUsers: [{ name: user.name, index: 0 }],
    };
    rooms.push(room);
    const data = JSON.stringify(rooms);
    const response = createStringifiedMessage({ type: 'update_room', data });
    ws.clients.forEach((client) => {
        client.send(response);
    });
};

export const addUserToRoom = (data: string, socket: WebSocket) => {
    const parsedData = JSON.parse(data);
    const user1 = users.find((el) => el.socket === socket);
    const user2Name = rooms[parsedData.indexRoom].roomUsers[0].name;
    const user2 = users.find((el) => el.name === user2Name);
    if (!user1 || !user2) return;
    rooms[parsedData.indexRoom].roomUsers.push({ name: user1.name, index: 1 });

    const newGame: Game = {
        idGame: Object.keys(games).length,
        players: {
            playerOne: {
                socket: user1.socket,
                strikes: [],
                name: user1.name,
                ships: [],
            },
            playerTwo: {
                socket: user2.socket,
                strikes: [],
                name: user2.name,
                ships: [],
            },
        },
        turn: 0,
        isFinished: false,
    };
    games[String(newGame.idGame)] = newGame;
    const user1Data = JSON.stringify({ idGame: newGame.idGame, idPlayer: 0 });
    const user2Data = JSON.stringify({ idGame: newGame.idGame, idPlayer: 1 });
    user1.socket.send(JSON.stringify({ type: 'create_game', data: user1Data, id: 0 }));
    user2.socket.send(JSON.stringify({ type: 'create_game', data: user2Data, id: 0 }));
};
