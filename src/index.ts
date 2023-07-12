import { httpServer as server } from './http_server/index';
import { WebSocketServer } from 'ws';
import { wsListener } from './controllers/ws-controller';

const HTTP_PORT = 8181;

console.log(`Start static http server on the ${HTTP_PORT} port!`);

server.listen(HTTP_PORT);

export const ws = new WebSocketServer({ port: 3000 });

ws.on('connection', wsListener);
