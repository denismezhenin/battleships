import { httpServer as server } from './http_server/index';
import { WebSocketServer, WebSocket } from 'ws';
import { Rooms, Winner } from './constants/types';

const HTTP_PORT = 8181;

interface User {
  name: string,
  password: string,
  socket: WebSocket
  }

console.log(`Start static http server on the ${HTTP_PORT} port!`);
server.listen(HTTP_PORT);
const ws = new WebSocketServer({ port: 3000 });

const users: User[] = [];
const rooms: Rooms[] = [];
const games = {};
const winners: Winner[] = []

ws.on('connection', function connection(socket: WebSocket) {

    socket.on('message', async (message) => {
        const data = await JSON.parse(message.toString());

        switch (data.type) {
            case 'reg': {
                const parsedData = JSON.parse(data.data);
                parsedData.socket = socket;
                const messageData = validateUser(parsedData)
                const response = JSON.stringify({ type: 'reg', data: messageData, id: 0 });
                socket.send(response);
                sendWinnersResponseToAll(ws)
                if (rooms.length > 0) {

                  const data = JSON.stringify(rooms);
                  const response2 = { type: 'update_room', data, id: 0 };
                  const stringifyResponse = JSON.stringify(response2);
  
                  ws.clients.forEach((client) => {
                      client.send(stringifyResponse);
                  });
                }
                break;
            }
            case 'create_room': {
                const roomId = rooms.length;
                const user: User = users.filter((el) => el.socket === socket)[0];
                const room = {
                    roomId,
                    roomUsers: [{ name: user.name, index: 0 }],
                };
                rooms.push(room);
                const data = JSON.stringify(rooms);
                const response = { type: 'update_room', data, id: 0 };
                const stringifyResponse = JSON.stringify(response);

                ws.clients.forEach((client) => {
                    client.send(stringifyResponse);
                });

                break;
            }
            case 'add_user_to_room': {
                const parsedData = JSON.parse(data.data);
                const user1: User = users.filter((el) => el.socket === socket)[0];
                const user2Name = rooms[parsedData.indexRoom].roomUsers[0].name;
                const user2: User = users.filter((el) => el.name === user2Name)[0];
                rooms[parsedData.indexRoom].roomUsers.push({ name: user2.name, index: 1 });

                const newGame = {
                    idGame: Object.keys(games).length,
                    players: {
                        playerOne: {
                            socket: user1.socket,
                            strikes: [],
                            name: user1.name
                        },
                        playerTwo: {
                            socket: user2.socket,
                            strikes: [],
                            name: user2.name
                        },
                    },
                    turn: 0,
                };
                games[newGame.idGame] = newGame;
                // const id
                const user1Data = JSON.stringify({ idGame: newGame.idGame, idPlayer: 0 });
                const user2Data = JSON.stringify({ idGame: newGame.idGame, idPlayer: 1 });
                user1.socket.send(JSON.stringify({ type: 'create_game', data: user1Data, id: 0 }));
                user2.socket.send(JSON.stringify({ type: 'create_game', data: user2Data, id: 0 }));
                break;
            }
            case 'add_ships': {
                const parsedData = JSON.parse(data.data);
                const ships = createShipsArray(parsedData.ships)
                const player = parsedData.indexPlayer === 0 ? "playerOne" : "playerTwo";
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
                      const message = JSON.stringify({
                                    type: 'turn',
                                    data: JSON.stringify({ currentPlayer: 0 }),
                                    id: 0,
                                  })
                       sendResponseToTwoClients(parsedData.gameId, message)           
                    }
              
                break;
            }
            case 'attack': {
              const parsedData = JSON.parse(data.data); 
              if (games[String(parsedData.gameId)].turn === parsedData.indexPlayer) {
                const isStruck = checkStrike(parsedData)
                isStruck ? null :  strike(parsedData)
              }
                break;
            }
            case 'randomAttack': {
              const parsedData = JSON.parse(data.data); 
              makeRandomAttack(parsedData)
                break;
            }
        }
    });
});

const validateUser = (data) => {
const isValidName = data.name.length > 4 ? true : false;
const isValidPassword = data.password.length > 4 ? true : false;
const isUserHasExistAlready = users.some(el => el.name === data.name)
const valid = (isValidName && isValidPassword && !isUserHasExistAlready)
valid ? users.push(data) : null
const message = JSON.stringify({
  name: data.name,
  index: valid ? users.findIndex((el) => el.name === data.name) : 0,
  error: !valid,
  errorText: !isValidName ? "name too short" : !isValidPassword ? "password too short" : isUserHasExistAlready ? "user a already exist" : "",
});
return message
}

const makeRandomAttack = (data) => {
const randomCoord = {x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10)} 
const isStruck = checkStrike({...randomCoord, gameId: data.gameId, indexPlayer: data.indexPlayer})
isStruck ? makeRandomAttack(data) : strike({...randomCoord, gameId: data.gameId, indexPlayer: data.indexPlayer})
}

const checkStrike = (data: {x: number, y: number, gameId: number, indexPlayer: number}) => {
  const player = data.indexPlayer === 0 ? "playerOne" : "playerTwo";
  const stringifyStrike = JSON.stringify({x: data.x, y: data.y});
  const isStruck =  games[String(data.gameId)].players[player].strikes.some(el => JSON.stringify(el) === stringifyStrike)
  if (isStruck) {
    const message = JSON.stringify({
      type: 'turn',
      data: JSON.stringify({ currentPlayer: games[String(data.gameId)].turn}),
      id: 0,
    })
    games[String(data.gameId)].players[player].socket.send(message)
    return true
  }
  games[String(data.gameId)].players[player].strikes.push({x: data.x, y: data.y})
  return false
}

type Coordinate = {x: number, y: number}

type Ship = {
  shipCells: Coordinate[],
  surroundingCells: Coordinate[],
  originShipCoord: Coordinate[]
}

const createShipsArray = (arr) => {
  const shipArr: Ship[] = []

  for (const ship of arr) {
    const oneShip: Ship = {shipCells: [], surroundingCells: [], originShipCoord: []}
    for (let i =0; i < ship.length; i++ ) {
      ship.direction ?  oneShip.shipCells.push({x: ship.position.x, y: ship.position.y + i}) : oneShip.shipCells.push({x: ship.position.x + i, y: ship.position.y}) 
    }
    oneShip.originShipCoord = [...oneShip.shipCells]
    oneShip.surroundingCells = getSurroundingCells(oneShip.shipCells)
    shipArr.push(oneShip)
  }

  return shipArr
}

const getSurroundingCells = (shipCoordinates) => {
  const surroundingCells: Coordinate[] = [];

  for (const coordinate of shipCoordinates) {
    const {x, y} = coordinate;
    if (y - 1 >= 0) {
      const leftCell: Coordinate = {x, y: y - 1};
      if (!shipCoordinates.some(coord => coord.x === leftCell.x && coord.y === leftCell.y)) {
        surroundingCells.push(leftCell);
      }
    }

    if (y + 1 < 10) {
      const rightCell: Coordinate = {x, y: y + 1};
      if (!shipCoordinates.some(coord => coord.x === rightCell.x && coord.y === rightCell.y)) {
        surroundingCells.push(rightCell);
      }
    }

    if (x - 1 >= 0) {
      const aboveCell: Coordinate = {x: x - 1, y};
      if (!shipCoordinates.some(coord => coord.x === aboveCell.x && coord.y === aboveCell.y)) {
        surroundingCells.push(aboveCell);
      }
    }

    if (x + 1 < 10) {
      const belowCell: Coordinate = {x: x + 1, y};
      if (!shipCoordinates.some(coord => coord.x === belowCell.x && coord.y === belowCell.y)) {
        surroundingCells.push(belowCell);
      }
    }
  }

  return surroundingCells;
}


const strike = (data: {x: number, y: number, gameId: number, indexPlayer: number}) => {
    const stringifyStrike = JSON.stringify({x: data.x, y: data.y});
    const strike = {x: data.x, y: data.y}
    const player = data.indexPlayer === 0 ? "playerTwo" : "playerOne";
    const oppositePlayer = data.indexPlayer === 0 ? "playerOne" : "playerTwo";
    const oppositePlayerIndex = data.indexPlayer === 0 ? 1 : 0;
    let changeTurn = true

    games[String(data.gameId)].players[player].ships = games[String(data.gameId)].players[player].ships
        .map((el) => {
          return {

            shipCells: el.shipCells.filter((e) => {
                if (JSON.stringify(e) !== stringifyStrike) {
                    return true;
                }
                changeTurn = false
                const message =  JSON.stringify({
                  type: 'attack',
                  data: JSON.stringify({position: strike, currentPlayer: data.indexPlayer, status: "shot" }),
                  id: 0,
              })
              sendResponseToTwoClients(data.gameId, message)
                return false;
            }),
            surroundingCells: el.surroundingCells,
            originShipCoord: el.originShipCoord
          }
        }
        )
        .filter((el) => {
          if (el.shipCells.length > 0){
            return true
          }
          changeTurn = false
          el.originShipCoord.forEach(cord => {
            games[String(data.gameId)].players[player]
            const message =  JSON.stringify({
              type: 'attack',
              data: JSON.stringify({position: cord, currentPlayer: data.indexPlayer, status: "killed" }),
              id: 0,
          })
          sendResponseToTwoClients(data.gameId, message)
          })
          el.surroundingCells.forEach(cord => {
            games[String(data.gameId)].players[oppositePlayer].strikes.push(cord)
            const message =  JSON.stringify({
              type: 'attack',
              data: JSON.stringify({position: cord, currentPlayer: data.indexPlayer, status: "miss" }),
              id: 0,
          })
          sendResponseToTwoClients(data.gameId, message)
          })
          return false
        });
        if (changeTurn) {
          const missShotMessage = JSON.stringify({
            type: 'attack',
            data: JSON.stringify({position: strike, currentPlayer: data.indexPlayer, status: "miss" }),
            id: 0,
        })
    
        sendResponseToTwoClients(data.gameId, missShotMessage)
        }
        games[String(data.gameId)].turn = changeTurn ? oppositePlayerIndex : data.indexPlayer
        const changeTurnMessage = JSON.stringify({
          type: 'turn',
          data: JSON.stringify({ currentPlayer: games[String(data.gameId)].turn}),
          id: 0,
        })
        sendResponseToTwoClients(data.gameId, changeTurnMessage)
        if (games[String(data.gameId)].players[player].ships.length === 0) {
          const winnerName = games[String(data.gameId)].players[oppositePlayer].name;
          const findWinner =  winners.find(el => el.name === winnerName) 
          if (findWinner) {
            findWinner.wins = findWinner.wins + 1
          } else {
            const winner = {
              name: winnerName,
              wins: 1
            }
            winners.push(winner)
          }

          const changeTurnMessage = JSON.stringify({
            type: 'finish',
            data: JSON.stringify({ winPlayer: data.indexPlayer}),
            id: 0,
          })
          sendResponseToTwoClients(data.gameId, changeTurnMessage)

          sendWinnersResponseToAll(ws)
        }
};

const sendWinnersResponseToAll = (ws: WebSocketServer) => {
  const updateWinnersMessage = JSON.stringify({
    type: 'update_winners',
    data: JSON.stringify(winners),
    id: 0,
  })
  ws.clients.forEach((client) => {
    client.send(updateWinnersMessage);
});
}


const sendResponseToTwoClients = (gameId, message) => {
  games[String(gameId)].players.playerOne.socket.send(message)
  games[String(gameId)].players.playerTwo.socket.send(message)
}
