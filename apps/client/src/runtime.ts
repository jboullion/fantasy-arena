import { Simulation, type GameEvent } from '@arena/game-core';
import { create } from 'zustand';
import { InputManager } from './input';
import { AudioSystem } from './audio';
import { networked, useNetwork, send, receiveWorld } from './network';
import type { WorldSnapshot } from '../../../packages/game-core/src/multiplayer';
export const sim = new Simulation();
export const audio = new AudioSystem();
export const useUI = create(() => ({ revision: 0, debug: false, muted: false, fps: 0, simulationMs: 0, device: 'keyboard' }));
export const refresh = () => useUI.setState(s => ({ revision: s.revision + 1 }));
export const effects: (GameEvent & { life: number; id: number })[] = [];
let effectId = 0;
export const restart = () => { if (networked) return; sim.reset(); effects.length = 0; input.clear(); refresh(); };
export const pause = () => {
  if (networked) { useNetwork.setState(s => ({ menu: !s.menu })); send('input', { x: 0, z: 0 }); }
  else if (sim.phase === 'playing') sim.phase = 'paused'; else if (sim.phase === 'paused') sim.phase = 'playing';
  input.clear(); refresh();
};
export const input = new InputManager(key => {
  audio.unlock();
  if (networked) { if (key === 'Escape') pause(); return; }
  if (key === 'Escape') pause();
  if (key === 'KeyR' || (key === 'Enter' && ['dead', 'complete'].includes(sim.phase))) restart();
  if (key === 'Enter' && sim.phase === 'paused') pause();
  if (key === 'Backquote' || key === 'F2') useUI.setState(s => ({ debug: !s.debug }));
  if (key === 'KeyK') sim.killAll();
  if (key === 'KeyH') { sim.player.hp = sim.config.playerHealth; sim.assisted = true; }
  if (key === 'Equal' || key === 'NumpadAdd') { sim.spawnScale = Math.min(8, sim.spawnScale * 1.25); sim.assisted = true; }
  if (key === 'Minus' || key === 'NumpadSubtract') { sim.spawnScale = Math.max(.1, sim.spawnScale / 1.25); sim.assisted = true; }
});
let accumulator = 0, hudClock = 0, frameCount = 0, frameTime = 0, simMs = 0;
let latest: WorldSnapshot | undefined, receivedRound = -1, sendClock = 0;
receiveWorld(world => {
  const network = useNetwork.getState();
  const me = network.lobby?.members.find(m => m.sessionId === network.sessionId);
  const fresh = receivedRound !== world.round;
  receivedRound = world.round;
  if (fresh) { effects.length = 0; sim.events = []; input.clear(); }
  const oldPlayers = sim.players, oldEnemies = sim.enemies;
  sim.players = world.players.map(p => { const old = !fresh && oldPlayers.find(other => other.id === p.id); return { ...p, x: old ? old.x : p.x, z: old ? old.z : p.z }; });
  sim.enemies = world.enemies.map(e => { const old = !fresh && oldEnemies.find(other => other.id === e.id); return { ...e, x: old ? old.x : e.x, z: old ? old.z : e.z }; });
  if (me) sim.localPlayerId = me.actorId;
  sim.phase = world.phase; sim.time = world.time; sim.kills = world.kills; sim.config = world.config;
  sim.events.push(...world.events); latest = world;
  refresh();
});
useNetwork.subscribe((state, previous) => {
  if (state.lobby?.stage !== 'game' && previous.lobby?.stage === 'game') { latest = undefined; receivedRound = -1; effects.length = 0; sim.events = []; input.clear(); }
});
export function advance(delta: number) {
  const actions = input.read();
  if (networked) {
    sendClock += delta;
    if (sendClock >= 1 / 30) {
      const stopped = useNetwork.getState().menu || document.hidden || sim.player.hp <= 0;
      send('input', stopped ? { x: 0, z: 0 } : actions); sendClock = 0;
    }
    if (latest) {
      const alpha = 1 - Math.exp(-25 * delta);
      for (const actor of [...sim.players, ...sim.enemies]) {
        const target = actor.id >= 10000 ? latest.players.find(p => p.id === actor.id) : latest.enemies.find(e => e.id === actor.id);
        if (target) { actor.x += (target.x - actor.x) * alpha; actor.z += (target.z - actor.z) * alpha; }
      }
    }
  } else if (sim.phase === 'playing') {
    accumulator += Math.min(delta, .1);
    const start = performance.now();
    while (accumulator >= 1 / 60) { sim.step(1 / 60, actions); accumulator -= 1 / 60; }
    simMs = performance.now() - start;
  } else accumulator = 0;
  if (sim.phase === 'playing' || networked) {
    for (const effect of effects) effect.life -= delta;
    for (let i = effects.length - 1; i >= 0; i--) if (effects[i].life <= 0) effects.splice(i, 1);
  }
  const events = sim.events.splice(0); audio.play(events);
  for (const event of events) if (event.type === 'kill' || event.type === 'hit') effects.push({ ...event, life: event.type === 'kill' ? 5 : .9, id: effectId++ });
  if (effects.length > 128) effects.splice(0, effects.length - 128);
  hudClock += delta; frameCount++; frameTime += delta;
  if (hudClock >= .1) { useUI.setState(s => ({ revision: s.revision + 1, fps: Math.round(frameCount / frameTime), simulationMs: simMs, device: input.device })); hudClock = 0; }
  if (frameTime >= 1) { frameCount = 0; frameTime = 0; }
}
// Explicit development-only observation hook for repeatable browser playtests.
if (import.meta.env.DEV) Object.assign(window, { arena: { sim, restart, useUI } });
