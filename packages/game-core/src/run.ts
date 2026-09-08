import { upgrades, runRules, getWeapon, weaponOffers, type WeaponId } from '@arena/game-data';
import { emptyStats, type CombatStats, type Player, type PlayerSetup } from './index';
export type RunPlayer = PlayerSetup & { gold: number; weaponLevel: number; armorLevel: number; stats: CombatStats; offers: WeaponId[]; purchasedWeapon: boolean };
export type RunSummary = { id: string; round: number; roundsCompleted: number; result: 'active' | 'won' | 'lost'; players: RunPlayer[] };
export class RunProgress {
  summary: RunSummary;
  settledRound = 0;
  constructor(id: string, roster: PlayerSetup[]) { this.summary = { id, round: 1, roundsCompleted: 0, result: 'active', players: roster.map(p => ({ ...p, equippedWeapon: undefined, offers: [], purchasedWeapon:false, gold: 0, weaponLevel: 0, armorLevel: 0, stats: emptyStats(p.character) })) }; }
  finish(players: Player[], completed: boolean) {
    const s = this.summary;
    if (this.settledRound === s.round || s.result !== 'active') return false;
    this.settledRound = s.round;
    for (const p of s.players) {
      const actor = players.find(a => a.id === p.id); if (actor) p.stats = structuredClone(actor.stats);
      p.purchasedWeapon=false;
      p.offers=completed && s.round<runRules.rounds ? weaponOffers(p.character,s.round,p.equippedWeapon) : [];
      if (completed) p.gold += runRules.reward;
    }
    if (completed) s.roundsCompleted = s.round;
    s.result = !completed ? 'lost' : s.round === runRules.rounds ? 'won' : 'active';
    return true;
  }
  buy(playerId: number, item: string) {
    const s = this.summary, p = s.players.find(p => p.id === playerId);
    if (!p || s.result !== 'active' || this.settledRound !== s.round) return false;
    if (item !== 'armor') {
      const weapon=getWeapon(item);
      if (!weapon || weapon.character!==p.character || !p.offers.includes(weapon.id) || p.purchasedWeapon || p.equippedWeapon===weapon.id || p.gold<weapon.price) return false;
      p.gold-=weapon.price;p.equippedWeapon=weapon.id;p.weaponLevel=0;p.purchasedWeapon=true;return true;
    }
    const key = 'armorLevel', definition = upgrades.armor;
    const price = definition.baseCost + p[key] * definition.costStep;
    if (p[key] >= definition.maxLevel || p.gold < price) return false;
    p.gold -= price; p[key]++; return true;
  }
  retry() {
    if (this.summary.result !== 'lost') return false;
    this.summary.result = 'active'; this.settledRound = this.summary.round - 1;
    return true;
  }
  next() { const s = this.summary; if (s.result !== 'active' || this.settledRound !== s.round || s.round >= runRules.rounds) return false; s.round++; return true; }
}
