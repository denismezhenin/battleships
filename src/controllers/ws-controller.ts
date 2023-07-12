import { WebSocket } from 'ws';
import { users } from '../db/db';
import { userRegistration } from './registrationFunctions';
import { handleDisconnect } from './handleDisconnect';
import { addUserToRoom, createRoom } from './roomsFunctions';
import { addSHips } from './shipsFunctions';
import { attack, makeRandomAttack } from './attackFunctions';

export const wsListener = (socket: WebSocket) => {
    console.log('user connected');
    socket.on('message', async (message) => {
        const data = await JSON.parse(message.toString());

        switch (data.type) {
            case 'reg': {
                userRegistration(data.data, socket);
                break;
            }
            case 'create_room': {
                createRoom(socket);

                break;
            }
            case 'add_user_to_room': {
                addUserToRoom(data.data, socket);
                break;
            }
            case 'add_ships': {
                addSHips(data.data, socket);
                break;
            }
            case 'attack': {
                attack(data.data);
                break;
            }
            case 'randomAttack': {
                const parsedData = JSON.parse(data.data);
                makeRandomAttack(parsedData);
                break;
            }
        }
    });

    socket.on('close', () => {
        const user = users.find((el) => el.socket === socket);
        if (user) {
            handleDisconnect(user);
        }
    });
};
