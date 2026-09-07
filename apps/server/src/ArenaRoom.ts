import { Room, type Client } from '@colyseus/core';
import { Simulation, type Input } from '@arena/game-core';
import { characters, type CharacterId } from '@arena/game-data';
import { RunProgress } from '../../../packages/game-core/src/run';
import { randomUUID } from 'node:crypto';
import type { LobbyMember, LobbyState, WorldSnapshot } from '../../../packages/game-core/src/multiplayer';

export class ArenaRoom extends Room {
  maxClients = 4;
  members: LobbyMember[] = [];
  hostId = '';
  stage: LobbyState['stage'] = 'lobby';
  round = 0;
  run: RunProgress | null = null;
  simulation = new Simulation();
  inputs = new Map<number, Input>();
  lastInput = new Map<number, number>();
  private actorId = 10000;
  private accumulator = 0;
  private ticks = 0;

  onCreate() {
    this.maxMessagesPerSecond = 90;
    this.onMessage('sync', client => { client.send('lobby', this.lobby()); if (this.stage === 'game') client.send('world', this.snapshot([])); });
    this.onMessage('profile', (client, data: unknown) => {
      if (this.stage !== 'lobby' || !data || typeof data !== 'object') return;
      const member = this.members.find(m => m.sessionId === client.sessionId); if (!member) return;
      const profile = data as Record<string, unknown>;
      const name = typeof profile.name === 'string' ? profile.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20) : member.name;
      const character = typeof profile.character === 'string' && Object.hasOwn(characters, profile.character) ? profile.character as CharacterId : member.character;
      if (!name) { client.send('notice', 'Choose a name with at least one character.'); return; }
      if (name !== member.name || character !== member.character) { member.name = name; member.character = character; member.ready = false; this.publishLobby(); }
    });
    this.onMessage('ready', (client, ready: unknown) => {
      if ((this.stage !== 'lobby' && this.stage !== 'shop') || typeof ready !== 'boolean') return;
      const member = this.members.find(m => m.sessionId === client.sessionId);
      if (member) { member.ready = ready; this.publishLobby(); }
    });
    this.onMessage('launch', client => {
      if (client.sessionId !== this.hostId || (this.stage !== 'lobby' && this.stage !== 'shop')) return;
      if (!this.members.length || !this.members.every(m => m.ready)) { client.send('notice', 'Everyone must be ready before launching.'); return; }
      if (this.stage === 'lobby') this.run = new RunProgress(randomUUID(), this.members.map(m => ({ id: m.actorId, name: m.name, character: m.character })));
      else if (!this.run?.next()) return;
      this.stage = 'game'; void this.lock(); this.round = this.run!.summary.round;
      this.simulation.reset(this.run!.summary.players, this.round);
      this.inputs.clear(); this.lastInput.clear(); this.accumulator = 0;
      this.publishLobby(); this.broadcast('world', this.snapshot([]));
    });
    this.onMessage('buy', (client, item: unknown) => {
      if (this.stage !== 'shop' || (item !== 'weapon' && item !== 'armor')) return;
      const member = this.members.find(m => m.sessionId === client.sessionId); if (!member) return;
      if (!this.run?.buy(member.actorId, item)) { client.send('notice', 'Cannot purchase: not enough gold or already at maximum rank.'); return; }
      member.ready = false; this.publishLobby();
    });
    this.onMessage('input', (client, data: unknown) => {
      if (this.stage !== 'game' || !data || typeof data !== 'object') return;
      const member = this.members.find(m => m.sessionId === client.sessionId); if (!member) return;
      const { x, z } = data as Record<string, unknown>;
      if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return;
      this.inputs.set(member.actorId, { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) });
      this.lastInput.set(member.actorId, performance.now());
    });
    this.onMessage('retry', client => {
      if (client.sessionId !== this.hostId || this.stage !== 'lost' || !this.run?.retry()) return;
      this.stage = 'game';
      this.simulation.reset(this.run.summary.players, this.round);
      this.inputs.clear(); this.lastInput.clear(); this.accumulator = 0;
      this.members.forEach(m => { m.ready = false; });
      this.publishLobby(); this.broadcast('world', this.snapshot([]));
    });
    this.onMessage('return', client => {
      if (client.sessionId !== this.hostId || (this.stage !== 'won' && this.stage !== 'lost')) return;
      this.stage = 'lobby'; this.members.forEach(m => { m.ready = false; }); this.inputs.clear();
      this.run = null; this.round = 0;
      void this.unlock(); this.publishLobby();
    });
    this.setSimulationInterval(delta => this.update(delta), 1000 / 60);
  }
  onJoin(client: Client, options: Record<string, unknown> = {}) {
    if (this.stage !== 'lobby') { void client.leave(4000); return; }
    const name = typeof options.name === 'string' ? options.name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 20) : '';
    const character = typeof options.character === 'string' && Object.hasOwn(characters, options.character) ? options.character as CharacterId : 'warrior';
    this.members.push({ sessionId: client.sessionId, actorId: this.actorId++, name: name || `Adventurer ${this.members.length + 1}`, character, ready: false });
    this.hostId ||= client.sessionId;
    this.publishLobby();
  }
  onLeave(client: Client) {
    const member = this.members.find(m => m.sessionId === client.sessionId);
    if (!member) return;
    this.members = this.members.filter(m => m !== member);
    this.inputs.delete(member.actorId); this.lastInput.delete(member.actorId);
    if (this.run) this.run.summary.players = this.run.summary.players.filter(p => p.id !== member.actorId);
    if (this.stage === 'game') this.simulation.players = this.simulation.players.filter(p => p.id !== member.actorId);
    if (this.hostId === client.sessionId) this.hostId = this.members[0]?.sessionId ?? '';
    // Colyseus automatically unlocks a room when a seat opens; running games stay closed.
    if (this.stage !== 'lobby') void this.lock();
    this.publishLobby();
  }
  private lobby(): LobbyState { return { roomId: this.roomId, hostId: this.hostId, stage: this.stage, members: this.members, round: this.round, run: this.run?.summary ?? null }; }
  private publishLobby() { this.broadcast('lobby', this.lobby()); }
  private snapshot(events: WorldSnapshot['events']): WorldSnapshot {
    const s = this.simulation;
    return { players: s.players, enemies: s.enemies, time: s.time, kills: s.kills, phase: s.phase, config: s.config, events, round: this.round };
  }
  private update(milliseconds: number) {
    if (this.stage !== 'game' || !this.members.length) return;
    const now = performance.now();
    for (const [id, time] of this.lastInput) if (now - time > 300) this.inputs.set(id, { x: 0, z: 0 });
    this.accumulator += Math.min(milliseconds / 1000, .1);
    while (this.accumulator >= 1 / 60) { this.simulation.stepMultiplayer(1 / 60, this.inputs); this.accumulator -= 1 / 60; }
    if (this.simulation.phase === 'complete' || this.simulation.phase === 'dead') {
      this.run!.finish(this.simulation.players, this.simulation.phase === 'complete');
      this.broadcast('world', this.snapshot(this.simulation.events.splice(0)));
      this.stage = this.run!.summary.result === 'active' ? 'shop' : this.run!.summary.result;
      this.members.forEach(m => { m.ready = false; }); this.inputs.clear(); this.publishLobby(); return;
    }
    if (++this.ticks % 3 === 0) this.broadcast('world', this.snapshot(this.simulation.events.splice(0)));
  }
}
