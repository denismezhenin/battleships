import { WebSocketServer } from 'ws';
import { games, winners } from '../db/db';

export const sendWinnersResponseToAll = (ws: WebSocketServer) => {
    const updateWinnersMessage = JSON.stringify({
        type: 'update_winners',
        data: JSON.stringify(winners),
        id: 0,
    });
    ws.clients.forEach((client) => {
        client.send(updateWinnersMessage);
    });
};

export const sendResponseToTwoClients = (gameId: number, message: string) => {
    games[String(gameId)].players.playerOne.socket.send(message);
    games[String(gameId)].players.playerTwo.socket.send(message);
};

export const createStringifiedMessage = ({ type, data }) => {
  const message = JSON.stringify({
      type,
      data,
      id: 0,
  });
  return message;
};