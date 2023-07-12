import { User } from '../constants/types';
import { rooms, users, winners } from '../db/db';
import { WebSocket } from 'ws';
import { createStringifiedMessage } from '../helpers/helpers';

export const userRegistration = (data: string, socket: WebSocket) => {
    const parsedData = JSON.parse(data);
    parsedData.socket = socket;
    const messageData = validateUser(parsedData);
    const response = JSON.stringify({ type: 'reg', data: messageData, id: 0 });
    socket.send(response);
    const winnersData = JSON.stringify(winners);
    const updateWinnersMessage = createStringifiedMessage({
        type: 'update_winners',
        data: winnersData,
    });
    socket.send(updateWinnersMessage);
    if (rooms.length > 0) {
        const data = JSON.stringify(rooms);
        const response2 = { type: 'update_room', data, id: 0 };
        const stringifyResponse = JSON.stringify(response2);
        socket.send(stringifyResponse);
    }
};

const validateUser = (data: User) => {
    const isValidName = data.name.length > 4 ? true : false;
    const isValidPassword = data.password.length > 4 ? true : false;
    const isUserHasExistAlready = users.some((el) => el.name === data.name);
    let isRightPassword = true;
    if (isUserHasExistAlready) {
        const user = users.find((el) => el.name === data.name);
        isRightPassword = user && user.password === data.password ? true : false;
        isRightPassword && user ? (user.socket = data.socket) : null;
    }
    const valid = isValidName && isValidPassword && isRightPassword;
    if (valid && !isUserHasExistAlready) {
        users.push(data);
    }
    const message = JSON.stringify({
        name: data.name,
        index: valid ? users.findIndex((el) => el.name === data.name) : 0,
        error: !valid,
        errorText: !isValidName
            ? 'name too short'
            : !isValidPassword
            ? 'password too short'
            : !isRightPassword
            ? 'wrong password'
            : '',
    });
    return message;
};
