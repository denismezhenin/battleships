import { WebSocket } from 'ws';
import { Coordinate, IncomingShipsData, Ship } from '../constants/types';
import { games } from '../db/db';
import { createStringifiedMessage, sendResponseToTwoClients } from '../helpers/helpers';

export const addSHips = (data: string, socket: WebSocket) => {
    const parsedData = JSON.parse(data);
    const ships = createShipsArray(parsedData.ships);
    const player = parsedData.indexPlayer === 0 ? 'playerOne' : 'playerTwo';
    games[String(parsedData.gameId)].players[player].ships = ships;
    socket.send(
        JSON.stringify({
            type: 'start_game',
            data: JSON.stringify({ ships: parsedData.ships, currentPlayerIndex: 0 }),
            id: 0,
        })
    );
    if (
        games[String(parsedData.gameId)].players.playerOne.ships &&
        games[String(parsedData.gameId)].players.playerTwo.ships
    ) {
        const messageData = JSON.stringify({ currentPlayer: 0 });
        const message = createStringifiedMessage({ type: 'turn', data: messageData });
        sendResponseToTwoClients(parsedData.gameId, message);
    }
};

const createShipsArray = (arr: IncomingShipsData[]) => {
    const shipArr: Ship[] = [];

    for (const ship of arr) {
        const oneShip: Ship = { shipCells: [], surroundingCells: [], originShipCoord: [] };
        for (let i = 0; i < ship.length; i++) {
            ship.direction
                ? oneShip.shipCells.push({ x: ship.position.x, y: ship.position.y + i })
                : oneShip.shipCells.push({ x: ship.position.x + i, y: ship.position.y });
        }
        oneShip.originShipCoord = [...oneShip.shipCells];
        oneShip.surroundingCells = getSurroundingCells(oneShip.shipCells);
        shipArr.push(oneShip);
    }

    return shipArr;
};

const getSurroundingCells = (shipCoordinates: Coordinate[]) => {
    const surroundingCells: Coordinate[] = [];

    for (const coordinate of shipCoordinates) {
        const { x, y } = coordinate;
        if (y - 1 >= 0) {
            const leftCell: Coordinate = { x, y: y - 1 };
            if (
                !shipCoordinates.some((coord) => coord.x === leftCell.x && coord.y === leftCell.y)
            ) {
                surroundingCells.push(leftCell);
            }
        }

        if (y + 1 < 10) {
            const rightCell: Coordinate = { x, y: y + 1 };
            if (
                !shipCoordinates.some((coord) => coord.x === rightCell.x && coord.y === rightCell.y)
            ) {
                surroundingCells.push(rightCell);
            }
        }

        if (x - 1 >= 0) {
            const aboveCell: Coordinate = { x: x - 1, y };
            if (
                !shipCoordinates.some((coord) => coord.x === aboveCell.x && coord.y === aboveCell.y)
            ) {
                surroundingCells.push(aboveCell);
            }
        }

        if (x + 1 < 10) {
            const belowCell: Coordinate = { x: x + 1, y };
            if (
                !shipCoordinates.some((coord) => coord.x === belowCell.x && coord.y === belowCell.y)
            ) {
                surroundingCells.push(belowCell);
            }
        }
    }

    return surroundingCells;
};
