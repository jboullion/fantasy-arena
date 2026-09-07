import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { ArenaRoom } from './ArenaRoom';

const server = new Server({ transport: new WebSocketTransport({ maxPayload: 4096, pingInterval: 3000, pingMaxRetries: 2 }), greet: false });
server.define('arena', ArenaRoom);
const port = Number(process.env.ARENA_SERVER_PORT || 2567);
await server.listen(port, '0.0.0.0');
console.log(`Fantasy Arena multiplayer server listening on ${port}`);
