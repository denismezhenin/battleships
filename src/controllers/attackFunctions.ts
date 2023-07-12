import { Coordinate, IncomingData } from '../constants/types';
import { games, winners } from '../db/db';
import {
    createStringifiedMessage,
    sendResponseToTwoClients,
    sendWinnersResponseToAll,
} from '../helpers/helpers';
import { ws } from '../index';

export const attack = (data: string) => {
    const parsedData = JSON.parse(data);
    if (games[String(parsedData.gameId)].turn === parsedData.indexPlayer) {
        const isStruck = checkStrike(parsedData);
        isStruck ? null : strike(parsedData);
    }
};

const checkStrike = (data: Pick<IncomingData, 'x' | 'y' | 'indexPlayer' | 'gameId'>) => {
    const player = data.indexPlayer === 0 ? 'playerOne' : 'playerTwo';
    const stringifyStrike = JSON.stringify({ x: data.x, y: data.y });
    const isStruck = games[String(data.gameId)].players[player].strikes.some(
        (el) => JSON.stringify(el) === stringifyStrike
    );
    if (isStruck) {
        const message = JSON.stringify({
            type: 'turn',
            data: JSON.stringify({ currentPlayer: games[String(data.gameId)].turn }),
            id: 0,
        });
        games[String(data.gameId)].players[player].socket.send(message);
        return true;
    }
    games[String(data.gameId)].players[player].strikes.push({ x: data.x, y: data.y });
    return false;
};

export const makeRandomAttack = (data: Pick<IncomingData, 'indexPlayer' | 'gameId'>) => {
    const randomCoord = { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) };
    const isStruck = checkStrike({
        ...randomCoord,
        gameId: data.gameId,
        indexPlayer: data.indexPlayer,
    });
    isStruck
        ? makeRandomAttack(data)
        : strike({ ...randomCoord, gameId: data.gameId, indexPlayer: data.indexPlayer });
};

const strike = (data: Pick<IncomingData, 'x' | 'y' | 'indexPlayer' | 'gameId'>) => {
    const stringifyStrike = JSON.stringify({ x: data.x, y: data.y });
    const strike = { x: data.x, y: data.y };
    const player = data.indexPlayer === 0 ? 'playerTwo' : 'playerOne';
    const oppositePlayer = data.indexPlayer === 0 ? 'playerOne' : 'playerTwo';
    const oppositePlayerIndex = data.indexPlayer === 0 ? 1 : 0;
    let changeTurn = true;
    games[String(data.gameId)].players[player].ships = games[String(data.gameId)].players[
        player
    ].ships
        .map((el) => {
            return {
                shipCells: el.shipCells.filter((e) => {
                    if (JSON.stringify(e) !== stringifyStrike) {
                        return true;
                    }
                    changeTurn = false;
                    const messageData = JSON.stringify({
                        position: strike,
                        currentPlayer: data.indexPlayer,
                        status: 'shot',
                    });
                    const message = createStringifiedMessage({ type: 'attack', data: messageData });
                    sendResponseToTwoClients(data.gameId, message);
                    return false;
                }),
                surroundingCells: el.surroundingCells,
                originShipCoord: el.originShipCoord,
            };
        })
        .filter((el) => {
            if (el.shipCells.length > 0) {
                return true;
            }
            changeTurn = false;
            el.originShipCoord.forEach((cord) => {
                games[String(data.gameId)].players[player];
                const messageData = JSON.stringify({
                    position: cord,
                    currentPlayer: data.indexPlayer,
                    status: 'killed',
                });
                const message = createStringifiedMessage({ type: 'attack', data: messageData });
                sendResponseToTwoClients(data.gameId, message);
            });
            el.surroundingCells.forEach((cord) => {
                games[String(data.gameId)].players[oppositePlayer].strikes.push(cord);
                const messageData = JSON.stringify({
                    position: cord,
                    currentPlayer: data.indexPlayer,
                    status: 'miss',
                });
                const message = createStringifiedMessage({ type: 'attack', data: messageData });
                sendResponseToTwoClients(data.gameId, message);
            });
            return false;
        });
    sendTurnMessage(changeTurn, data.gameId, oppositePlayerIndex, data.indexPlayer, strike);
    isWin(data.gameId, player, oppositePlayer, data.indexPlayer);
};

const sendTurnMessage = (
    changeTurn: boolean,
    gameId: number,
    oppositePlayerIndex: number,
    indexPlayer: number,
    strike: Coordinate
) => {
    if (changeTurn) {
        const data = JSON.stringify({
            position: strike,
            currentPlayer: indexPlayer,
            status: 'miss',
        });
        const missShotMessage = createStringifiedMessage({ type: 'attack', data });
        sendResponseToTwoClients(gameId, missShotMessage);
    }
    games[String(gameId)].turn = changeTurn ? oppositePlayerIndex : indexPlayer;
    const changeTurnMessage = JSON.stringify({
        type: 'turn',
        data: JSON.stringify({ currentPlayer: games[String(gameId)].turn }),
        id: 0,
    });
    sendResponseToTwoClients(gameId, changeTurnMessage);
};

const isWin = (gameId: number, player: string, oppositePlayer: string, indexPlayer: number) => {
    if (games[String(gameId)].players[player].ships.length === 0) {
        const winnerName = games[String(gameId)].players[oppositePlayer].name;
        const findWinner = winners.find((el) => el.name === winnerName);
        if (findWinner) {
            findWinner.wins = findWinner.wins + 1;
        } else {
            const winner = {
                name: winnerName,
                wins: 1,
            };
            winners.push(winner);
        }
        const data = JSON.stringify({ winPlayer: indexPlayer });
        const changeTurnMessage = createStringifiedMessage({ type: 'finish', data });
        sendResponseToTwoClients(gameId, changeTurnMessage);
        sendWinnersResponseToAll(ws);
        games[String(gameId)].isFinished = true;
    }
};
