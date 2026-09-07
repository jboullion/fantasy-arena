import { Client, type Room } from '@colyseus/sdk';
import { create } from 'zustand';
import type { CharacterId } from '@arena/game-data';
import type { LobbyState, WorldSnapshot } from '../../../packages/game-core/src/multiplayer';

export const networked = !new URLSearchParams(location.search).has('sandbox');
export const useNetwork = create<{
  status: 'offline' | 'connecting' | 'connected'; lobby: LobbyState | null; sessionId: string; error: string; menu: boolean;
}>(() => ({ status: 'offline', lobby: null, sessionId: '', error: '', menu: false }));
let room: Room | undefined;
let generation = 0;
let onWorld: (world: WorldSnapshot) => void = () => {};
export const receiveWorld = (callback: typeof onWorld) => { onWorld = callback; };
export function send(type: string, data?: unknown) { if (room && useNetwork.getState().status === 'connected') room.send(type, data); }
export async function connect(name: string, character: CharacterId, code?: string) {
  if (useNetwork.getState().status !== 'offline') return;
  const attempt = ++generation;
  useNetwork.setState({ status: 'connecting', error: '' });
  try {
    const endpoint = import.meta.env.VITE_MULTIPLAYER_URL || `${location.origin}/multiplayer`;
    const client = new Client(endpoint);
    const joined = code ? await client.joinById(code.trim(), { name, character }) : await client.create('arena', { name, character });
    if (attempt !== generation) { await joined.leave(); return; }
    room = joined;
    joined.reconnection.enabled = false;
    useNetwork.setState({ status: 'connected', sessionId: joined.sessionId, menu: false });
    joined.onMessage('lobby', (lobby: LobbyState) => { if (attempt === generation) useNetwork.setState(s => ({ lobby, error: '', menu: lobby.stage !== s.lobby?.stage ? false : s.menu })); });
    joined.onMessage('world', (world: WorldSnapshot) => { if (attempt === generation) onWorld(world); });
    joined.onMessage('notice', (error: string) => { if (attempt === generation) useNetwork.setState({ error }); });
    joined.onLeave(() => {
      if (attempt !== generation) return;
      room = undefined; useNetwork.setState({ status: 'offline', lobby: null, sessionId: '', menu: false, error: 'Disconnected from the lobby. Create or join a lobby to play again.' });
    });
    joined.onError((_code, message) => { if (attempt === generation) useNetwork.setState({ error: message || 'Connection interrupted.' }); });
    joined.send('sync');
  } catch (error) {
    if (attempt !== generation) return;
    room = undefined;
    const detail = error instanceof Error ? error.message : String(error);
    useNetwork.setState({ status: 'offline', error: code ? `Could not join that lobby. Check the code; it may be full, closed, or already playing. (${detail})` : 'Could not reach the game server. It may be waking up; wait about a minute, then try again.' });
  }
}
export function leave() {
  ++generation;
  const previous = room; room = undefined;
  useNetwork.setState({ status: 'offline', lobby: null, sessionId: '', menu: false, error: '' });
  void previous?.leave();
}
