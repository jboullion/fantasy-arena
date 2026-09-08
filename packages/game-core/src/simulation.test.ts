import { describe, expect, it } from 'vitest';
import { Simulation } from './index';
const tick = (s: Simulation, seconds: number, x = 0, z = 0) => { for (let n = 0; n < Math.round(seconds * 60); n++) s.step(1 / 60, { x, z }); };
const empty = () => { const s = new Simulation(); s.enemies = []; s.spawnClock = 999; return s; };
describe('combat sandbox', () => {
  it('moves multiple players independently and applies their selected character stats', () => {
    const s = empty(); s.reset([{id:10000,name:'A',character:'warrior'},{id:10001,name:'B',character:'guardian'}]);
    s.enemies = []; s.spawnClock = 999;
    const start = s.players.map(p => ({x:p.x,z:p.z}));
    for (let i=0;i<60;i++) s.stepMultiplayer(1/60,new Map([[10000,{x:1,z:0}],[10001,{x:0,z:1}]]));
    expect(s.players[0].x-start[0].x).toBeCloseTo(7);
    expect(s.players[1].z-start[1].z).toBeCloseTo(5.8);
    expect(s.players.map(p=>p.hp)).toEqual([100,140]);
  });
  it('lets both players damage one shared enemy without double-counting its death', () => {
    const s = new Simulation({enemySpeed:0,knockback:0}); s.reset([{id:10000,name:'A',character:'warrior'},{id:10001,name:'B',character:'guardian'}]);
    s.spawnClock=999; s.enemies=[s.enemies[0]]; Object.assign(s.enemies[0],{x:0,z:0,hp:50});
    for(let i=0;i<20;i++) s.stepMultiplayer(1/60,new Map());
    expect(s.kills).toBe(1); expect(s.enemies).toHaveLength(0);
    expect(s.events.filter(e=>e.type==='hit').map(e=>e.amount)).toEqual([25,35]);
  });
  it('keeps the round alive after one death and directs goblins at a living teammate', () => {
    const s = new Simulation({enemySpeed:2}); s.reset([{id:10000,name:'A',character:'warrior'},{id:10001,name:'B',character:'guardian'}]);
    s.spawnClock=999; s.players[0].hp=0; Object.assign(s.players[1],{x:7,z:0}); s.enemies=[s.enemies[0]]; Object.assign(s.enemies[0],{x:0,z:0});
    s.stepMultiplayer(1/60,new Map()); expect(s.phase).toBe('playing'); expect(s.enemies[0].x).toBeGreaterThan(0);
    s.players[1].hp=0; s.stepMultiplayer(1/60,new Map()); expect(s.phase).toBe('dead');
  });
  it('faces distant enemies while moving without swinging out of range', () => {
    const s = new Simulation({ enemySpeed: 0 }); s.spawnClock = 999; s.enemies = [s.enemies[0]];
    Object.assign(s.enemies[0], { x: 8, z: 0 }); tick(s, .3, 0, 1);
    expect(s.targetId).toBe(s.enemies[0].id);
    expect(s.player.facing).toBeCloseTo(Math.atan2(8 - s.player.x, -s.player.z));
    expect(s.events.some(e => e.type === 'swing')).toBe(false);
    const facing = s.player.facing; s.enemies = []; tick(s, .2, -1, 0);
    expect(s.player.facing).toBe(facing);
  });
  it('retains the committed direction through the swing even after a kill', () => {
    const s = new Simulation({ enemySpeed: 0, swordDamage: 50 }); s.spawnClock = 999; s.enemies = s.enemies.slice(0, 2);
    Object.assign(s.enemies[0], { x: 0, z: 2 }); Object.assign(s.enemies[1], { x: 8, z: 0 });
    tick(s, .2); expect(s.kills).toBe(1); expect(s.player.facing).toBe(0);
    tick(s, .1); expect(s.player.facing).toBe(0);
    tick(s, .2); expect(s.player.facing).toBeCloseTo(Math.PI / 2);
  });
  it('records damage and target for every cleaved goblin including killing blows', () => {
    const s = new Simulation({ enemySpeed: 0, swordDamage: 35 }); s.spawnClock = 999; s.enemies = s.enemies.slice(0, 2);
    Object.assign(s.enemies[0], { x: 0, z: 2, hp: 10 }); Object.assign(s.enemies[1], { x: 1, z: 2 });
    const ids = s.enemies.map(e => e.id); tick(s, .2);
    expect(s.events.filter(e => e.type === 'hit').map(e => [e.targetId, e.amount])).toEqual(ids.map(id => [id, 35]));
  });
  it('normalizes diagonal input and confines the warrior to the arena', () => { const a = empty(), b = empty(); tick(a, 1, 1); tick(b, 1, 1, 1); expect(Math.hypot(b.player.x, b.player.z)).toBeCloseTo(a.player.x); tick(a, 10, 1); expect(a.player.x).toBe(a.config.arenaWidth / 2 - .5); });
  it('freezes the entire game when paused', () => { const s = new Simulation(); s.phase = 'paused'; const before = JSON.stringify(s); tick(s, 4, 1); expect(JSON.stringify(s)).toBe(before); });
  it('goblins pursue the player', () => { const s = new Simulation(); s.spawnClock = 999; s.enemies = [s.enemies[0]]; const e = s.enemies[0], before = Math.hypot(e.x, e.z); tick(s, 1); expect(Math.hypot(e.x, e.z)).toBeLessThan(before); });
  it('cleaves multiple enemies in the forward arc but excludes enemies behind', () => { const s = new Simulation({ enemySpeed: 0, knockback: 0 }); s.spawnClock = 999; s.enemies = s.enemies.slice(0, 3); Object.assign(s.enemies[0], { x: 0, z: 2 }); Object.assign(s.enemies[1], { x: 1, z: 2 }); Object.assign(s.enemies[2], { x: 0, z: -2.2 }); tick(s, .2); expect(s.enemies.map(e => e.hp)).toEqual([25, 25, 50]); });
  it('removes dead enemies immediately and emits presentation events', () => { const s = new Simulation({ enemySpeed: 0, swordDamage: 50 }); s.spawnClock = 999; s.enemies = [s.enemies[0]]; Object.assign(s.enemies[0], { x: 0, z: 2 }); tick(s, .2); expect(s.enemies).toHaveLength(0); expect(s.kills).toBe(1); expect(s.events.some(e => e.type === 'kill')).toBe(true); });
  it('telegraphs contact damage and permits moving away', () => { const s = new Simulation({ enemySpeed: 0, swordRange: .1 }); s.spawnClock = 999; s.enemies = [s.enemies[0]]; Object.assign(s.enemies[0], { x: 0, z: 1, cooldown: 0 }); tick(s, .2); expect(s.player.hp).toBe(100); tick(s, .6, 1); expect(s.player.hp).toBe(100); });
  it('can kill the player and reset all round state', () => { const s = new Simulation({ enemySpeed: 0, swordRange: .1, enemyDamage: 100 }); s.spawnClock = 999; s.enemies = [s.enemies[0]]; Object.assign(s.enemies[0], { x: 0, z: 1, cooldown: 0 }); tick(s, 1); expect(s.phase).toBe('dead'); s.reset(); expect(s.player.hp).toBe(100); expect(s.phase).toBe('playing'); expect(s.time).toBe(0); expect(s.kills).toBe(0); });
  it('completes a full 60-second round', () => { const s = empty(); tick(s, 60); expect(s.phase).toBe('complete'); expect(s.time).toBe(60); });
  it('spawns away from the player, respects cap, and escalates density', () => { const s = new Simulation({ enemySpeed: 0 }); s.player.x = 15; s.spawn(300); expect(s.enemies.length).toBe(200); expect(s.enemies.slice(4).every(e => Math.hypot(e.x - 15, e.z) >= 8)).toBe(true); const a = new Simulation({ enemySpeed: 0 }), b = new Simulation({ enemySpeed: 0 }); b.time = 45; a.spawnClock = b.spawnClock = 0; tick(a, 10); tick(b, 10); expect(b.enemies.length).toBeGreaterThan(a.enemies.length); });
  it('is reproducible from the same seed and action sequence', () => { const a = new Simulation(), b = new Simulation(); tick(a, 12, .2, -.1); tick(b, 12, .2, -.1); expect(a).toEqual(b); });
});
