import type { CharacterId, Config } from '@arena/game-data';
import type { Actor, GameEvent, Player, Projectile } from './index';
import type { RunSummary } from './run';
export type LobbyMember = { sessionId: string; actorId: number; name: string; character: CharacterId; ready: boolean };
export type LobbyState = { roomId: string; hostId: string; stage: 'lobby' | 'game' | 'shop' | 'won' | 'lost'; members: LobbyMember[]; round: number; run: RunSummary | null };
export type WorldSnapshot = { players: Player[]; enemies: Actor[]; projectiles: Projectile[]; time: number; kills: number; phase: 'playing' | 'paused' | 'dead' | 'complete'; config: Config; events: GameEvent[]; round: number };
