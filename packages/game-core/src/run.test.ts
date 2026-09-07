import { describe, expect, it } from 'vitest';
import { RunProgress } from './run';
import { Simulation } from './index';
const roster = [{ id: 10000, name: 'Hero', character: 'warrior' as const }];
const advance = (s: Simulation, seconds: number) => { for(let i=0;i<Math.round(seconds*60);i++)s.stepMultiplayer(1/60,new Map()); };
describe('ten-round run', () => {
  it('caps equipment ranks and rejects duplicate purchases beyond the cap', () => {
    const run=new RunProgress('run',roster),s=new Simulation();s.reset(roster);run.finish(s.players,true);run.summary.players[0].gold=10000;
    for(let i=0;i<5;i++)expect(run.buy(10000,'weapon')).toBe(true);
    const balance=run.summary.players[0].gold;expect(run.buy(10000,'weapon')).toBe(false);expect(run.summary.players[0].gold).toBe(balance);
  });
  it('grants one reward per clear, charges personal currency, and applies carried equipment', () => {
    const run=new RunProgress('run',roster), s=new Simulation();s.reset(roster);
    expect(run.buy(10000,'weapon')).toBe(false);
    expect(run.finish(s.players,true)).toBe(true);expect(run.finish(s.players,true)).toBe(false);
    expect(run.summary.players[0].gold).toBe(100);
    expect(run.buy(10000,'weapon')).toBe(true);expect(run.summary.players[0].gold).toBe(20);
    expect(run.buy(10000,'armor')).toBe(false);expect(run.buy(123,'weapon')).toBe(false);
    expect(run.next()).toBe(true);s.reset(run.summary.players,run.summary.round);
    expect(s.player.weaponLevel).toBe(1);expect(s.player.hp).toBe(s.player.maxHealth);
    run.finish(s.players,true);expect(run.buy(10000,'armor')).toBe(true);run.next();s.reset(run.summary.players,3);
    expect(s.player.maxHealth).toBe(125);expect(s.player.armorLevel).toBe(1);
  });
  it('wins only after ten clears and rejects further purchases or rounds', () => {
    const run=new RunProgress('run',roster), s=new Simulation();
    for(let round=1;round<=10;round++){s.reset(run.summary.players,round);run.finish(s.players,true);expect(run.summary.roundsCompleted).toBe(round);if(round<10){expect(run.summary.result).toBe('active');expect(run.next()).toBe(true);}}
    expect(run.summary.result).toBe('won');expect(run.next()).toBe(false);expect(run.buy(10000,'weapon')).toBe(false);expect(run.summary.players[0].gold).toBe(1000);
  });
  it('does not pay for failed rounds and preserves final stats', () => {
    const run=new RunProgress('run',roster),s=new Simulation();s.reset(roster);s.player.stats.totalDamage=123;s.player.stats.damageByWeapon['weapon.longsword']=123;
    run.finish(s.players,false);expect(run.summary.result).toBe('lost');expect(run.summary.players[0].gold).toBe(0);expect(run.summary.players[0].stats.totalDamage).toBe(123);expect(run.next()).toBe(false);
  });
  it('introduces cumulative enemy types at rounds 3, 6, and 9 and bosses at 5 and 10', () => {
    const s=new Simulation();
    for(let round=1;round<=10;round++){s.reset(roster,round);s.spawn(190);const types=new Set(s.enemies.map(e=>e.enemyType));expect(types.has('runner')).toBe(round>=3);expect(types.has('brute')).toBe(round>=6);expect(types.has('revenant')).toBe(round>=9);expect(types.has('boss')).toBe(round%5===0);}
  });
  it('requires the boss to die even after the timer expires', () => {
    const s=new Simulation();s.reset(roster,5);s.time=59.99;s.stepMultiplayer(1/60,new Map());expect(s.phase).toBe('playing');
    s.enemies=s.enemies.filter(e=>e.enemyType!=='boss');s.stepMultiplayer(1/60,new Map());expect(s.phase).toBe('complete');
  });
  it('counts effective damage by weapon, excludes overkill, and carries totals without duplication', () => {
    const s=new Simulation({enemySpeed:0,knockback:0});s.reset([{...roster[0],weaponLevel:1}]);s.spawnClock=999;s.enemies=[s.enemies[0]];Object.assign(s.enemies[0],{x:0,z:2,hp:30});advance(s,.2);
    expect(s.player.stats.totalDamage).toBe(30);expect(s.player.stats.damageByWeapon['weapon.longsword']).toBe(30);expect(s.player.stats.kills).toBe(1);expect(s.events.find(e=>e.type==='hit')?.amount).toBe(35);
    const run=new RunProgress('run',roster);run.finish(s.players,true);run.next();s.reset(run.summary.players,2);expect(s.player.stats.totalDamage).toBe(30);
  });
  it('armor reduces incoming damage and records only health removed', () => {
    const s=new Simulation({enemySpeed:0,swordRange:.1});s.reset([{...roster[0],armorLevel:1}]);s.spawnClock=999;s.enemies=[s.enemies[0]];Object.assign(s.enemies[0],{x:0,z:1,cooldown:0});advance(s,.6);expect(s.player.hp).toBe(117);expect(s.player.stats.damageTaken).toBe(8);
  });
});
