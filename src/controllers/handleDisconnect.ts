import { User } from '../constants/types';
import { games, rooms, users, winners } from '../db/db';
import { createStringifiedMessage, sendWinnersResponseToAll } from '../helpers/helpers';
import { ws } from '../index';

export const handleDisconnect = (user: User) => {
    console.log('user disconnected');
    const room = user
        ? rooms.find((el) => el.roomUsers.filter((el) => el.name === user.name))
        : null;
    console.log(user.name);
    if (room) {
        room.roomUsers = room.roomUsers.filter((el) => el.name !== user.name);
    }
    const user2 = room && user ? room.roomUsers.find((el) => el.name !== user.name) : null;
    const user2socket = user2 ? users.filter((el) => el.name === user2.name)[0].socket : null;
    const game =
        user && user2
            ? Object.values(games).find(
                  (el) =>
                      (el.players.playerOne.name === user.name ||
                          el.players.playerTwo.name === user.name) &&
                      (el.players.playerOne.name === user2.name ||
                          el.players.playerTwo.name === user2.name)
              )
            : null;
    console.log(game);
    if (user2socket && user2 && game && !game.isFinished) {
        game.isFinished = true;
        console.log('yes');
        const indexPlayer = user2.index === 0 ? 1 : 0;
        const messageData = JSON.stringify({ winPlayer: indexPlayer });
        const winMessage = createStringifiedMessage({ type: 'finish', data: messageData });
        user2socket.send(winMessage);
        const findWinner = winners.find((el) => el.name === user2.name);
        if (findWinner) {
            findWinner.wins = findWinner.wins + 1;
        } else {
            const winner = {
                name: user2.name,
                wins: 1,
            };
            winners.push(winner);
        }
        sendWinnersResponseToAll(ws);
        if (user2.index === 1) {
            const roomIndex = rooms.findIndex((el) => el.roomId === room?.roomId);
            rooms.splice(roomIndex, 1);
        }
        const data = JSON.stringify(rooms);
        const response = createStringifiedMessage({ type: 'update_room', data });
        ws.clients.forEach((client) => {
            client.send(response);
        });
    }
};
