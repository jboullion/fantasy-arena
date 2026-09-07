import { upgrades, runRules, type UpgradeId } from '@arena/game-data';
import { emptyStats, type CombatStats, type Player, type PlayerSetup } from './index';
export type RunPlayer = PlayerSetup & { gold: number; weaponLevel: number; armorLevel: number; stats: CombatStats };
export type RunSummary = { id: string; round: number; roundsCompleted: number; result: 'active' | 'won' | 'lost'; players: RunPlayer[] };
export class RunProgress {
  summary: RunSummary;
  settledRound = 0;
  constructor(id: string, roster: PlayerSetup[]) { this.summary = { id, round: 1, roundsCompleted: 0, result: 'active', players: roster.map(p => ({ ...p, gold: 0, weaponLevel: 0, armorLevel: 0, stats: emptyStats() })) }; }
  finish(players: Player[], completed: boolean) {
    const s = this.summary;
    if (this.settledRound === s.round || s.result !== 'active') return false;
    this.settledRound = s.round;
    for (const p of s.players) { const actor = players.find(a => a.id === p.id); if (actor) p.stats = structuredClone(actor.stats); if (completed) p.gold += runRules.reward; }
    if (completed) s.roundsCompleted = s.round;
    s.result = !completed ? 'lost' : s.round === runRules.rounds ? 'won' : 'active';
    return true;
  }
  buy(playerId: number, item: UpgradeId) {
    const s = this.summary, p = s.players.find(p => p.id === playerId);
    if (!p || s.result !== 'active' || this.settledRound !== s.round || !Object.hasOwn(upgrades, item)) return false;
    const key = item === 'weapon' ? 'weaponLevel' : 'armorLevel', definition = upgrades[item];
    const price = definition.baseCost + p[key] * definition.costStep;
    if (p[key] >= definition.maxLevel || p.gold < price) return false;
    p.gold -= price; p[key]++; return true;
  }
  next() { const s = this.summary; if (s.result !== 'active' || this.settledRound !== s.round || s.round >= runRules.rounds) return false; s.round++; return true; }
}
