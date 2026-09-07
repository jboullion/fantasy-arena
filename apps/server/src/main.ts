import { Server } from '@colyseus/core';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom } from './ArenaRoom';

const transport = new WebSocketTransport({ maxPayload: 4096, pingInterval: 3000, pingMaxRetries: 2 });
transport.getExpressApp().get('/health', (_request: IncomingMessage, response: ServerResponse) => {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ status: 'ok' }));
});
const server = new Server({ transport, greet: false });
server.define('arena', ArenaRoom);
const port = Number(process.env.PORT || process.env.ARENA_SERVER_PORT || 2567);
await server.listen(port, '0.0.0.0');
console.log(`Fantasy Arena multiplayer server listening on ${port}`);
