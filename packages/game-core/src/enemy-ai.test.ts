import { describe, expect, it } from 'vitest';
import { Simulation } from './index';
import type { EnemyType } from '@arena/game-data';

const tick=(s:Simulation,seconds:number,x=0,z=0)=>{for(let i=0;i<Math.round(seconds*60);i++)s.step(1/60,{x,z});};
function encounter(type:EnemyType,z:number) {
  const s=new Simulation({swordRange:0,knockback:0,duration:999});s.enemies=[];s.spawnClock=999;s.spawn(1,type);
  const e=s.enemies[0];Object.assign(e,{x:0,z,cooldown:999,ai:{mode:'idle',remaining:0,cooldown:0,x:0,z,facing:0,hitIds:[],pulse:0}});
  return {s,e};
}

describe('goblin encounters', () => {
  it('starts with one compact group of 5–10 and schedules a breathing interval', () => {
    const s = new Simulation();
    expect(s.enemies.length).toBeGreaterThanOrEqual(5);
    expect(s.enemies.length).toBeLessThanOrEqual(10);
    expect(s.enemies.every(e => e.enemyType === 'goblin')).toBe(true);
    for (const a of s.enemies) for (const b of s.enemies) expect(Math.hypot(a.x-b.x,a.z-b.z)).toBeLessThan(5);
    const count = s.enemies.length;
    s.step(1/60,{x:0,z:0}); expect(s.enemies).toHaveLength(count);
    expect(s.spawnClock).toBeGreaterThan(10);
  });
  it('adds complete packs during normal play, with varied sizes and safe footprints', () => {
    const s = new Simulation({enemySpeed:0,enemyDamage:0,swordRange:0});
    const sizes = new Set<number>();
    for(let i=0;i<40;i++) {
      s.enemies=[];s.spawnClock=0;s.step(1/60,{x:0,z:0});sizes.add(s.enemies.length);
      expect(s.enemies.length).toBeGreaterThanOrEqual(5);expect(s.enemies.length).toBeLessThanOrEqual(10);
      for(const e of s.enemies) {
        expect(Math.hypot(e.x-s.player.x,e.z-s.player.z)).toBeGreaterThanOrEqual(8);
        for(const o of s.terrain.obstacles)expect(Math.hypot(e.x-o.x,e.z-o.z)).toBeGreaterThanOrEqual(o.radius+.5);
      }
    }
    expect(sizes.size).toBeGreaterThan(3);
  });
  it('defers packs rather than exceeding the cap or spawning fewer than five', () => {
    const s = new Simulation();s.config.maxEnemies=s.enemies.length+4;
    const before=s.enemies.length;expect(s.spawnGoblinPack()).toBe(0);expect(s.enemies).toHaveLength(before);
    s.config.maxEnemies=before+5;expect(s.spawnGoblinPack()).toBe(5);expect(s.enemies).toHaveLength(before+5);
  });
});

describe('distinct enemy actions',()=>{
  it('runners warn, commit a straight dash, hit once and recover',()=>{
    const {s,e}=encounter('runner',6);tick(s,.3);expect(e.ai?.mode).toBe('warning');expect(e.z).toBe(6);expect(s.player.hp).toBe(100);
    tick(s,1.1);expect(e.ai?.mode).toBe('recovery');expect(e.z).toBeLessThan(2);expect(s.player.hp).toBe(92);
    expect(s.player.stats.damageTaken).toBe(8);
  });
  it('a runner dash can be sidestepped after its direction locks',()=>{
    const {s,e}=encounter('runner',6);tick(s,.1);const facing=e.ai!.facing;tick(s,1.4,1,0);
    expect(e.ai!.facing).toBe(facing);expect(s.player.hp).toBe(100);
  });
  it('brutes warn before area damage and can hit multiple living players',()=>{
    const {s,e}=encounter('brute',2.5);s.players.push({...structuredClone(s.player),id:10001,x:1,stats:{totalDamage:0,damageByWeapon:{},kills:0,damageTaken:0}});
    tick(s,.7);expect(e.ai?.mode).toBe('warning');expect(s.players.map(p=>p.hp)).toEqual([100,100]);
    tick(s,.6);expect(s.players.map(p=>p.hp)).toEqual([82,82]);expect(e.ai?.mode).toBe('recovery');
  });
  it('brute ground warnings stay fixed and allow escape',()=>{
    const {s,e}=encounter('brute',2.5);tick(s,.1);tick(s,1.3,1,0);expect(e.ai?.x).toBe(0);expect(s.player.hp).toBe(100);
  });
  it('revenants cast at the locked position, slow inside the active zone, and release the slow outside',()=>{
    const {s,e}=encounter('revenant',6);tick(s,.1);expect(e.ai?.x).toBe(0);expect(e.ai?.z).toBe(0);expect(s.player.chilled).toBe(0);
    tick(s,1.3);expect(e.ai?.mode).toBe('active');expect(s.player.chilled).toBeGreaterThan(0);expect(s.player.hp).toBe(94);
    const x=s.player.x;tick(s,.2,1,0);expect(s.player.x-x).toBeCloseTo(7*.65*.2,2);
    tick(s,1,1,0);expect(s.player.chilled).toBe(0);
  });
  it('bosses summon one complete pack after a warning and respect cooldown and capacity',()=>{
    const {s,e}=encounter('boss',6);tick(s,.8);expect(s.enemies).toHaveLength(1);expect(e.ai?.mode).toBe('warning');
    tick(s,.8);expect(s.enemies.length).toBeGreaterThanOrEqual(6);expect(s.enemies.length).toBeLessThanOrEqual(11);const count=s.enemies.length;
    tick(s,2);expect(s.enemies).toHaveLength(count);
    const capped=encounter('boss',6);capped.s.config.maxEnemies=4;tick(capped.s,1.7);expect(capped.s.enemies).toHaveLength(1);
  });
  it('special actions freeze on pause and disappear with dead enemies and reset',()=>{
    const {s,e}=encounter('revenant',6);tick(s,.1);s.phase='paused';const ai=structuredClone(e.ai);tick(s,3);expect(e.ai).toEqual(ai);
    s.phase='playing';e.hp=0;tick(s,2);expect(s.player.hp).toBe(100);expect(s.enemies).toHaveLength(0);
    s.reset();expect(s.player.chilled).toBeUndefined();expect(s.enemies.every(e=>!e.ai)).toBe(true);
  });
  it('runner charges cannot cross terrain obstacles',()=>{
    const {s,e}=encounter('runner',6);const o=s.terrain.obstacles.find(o=>o.model.startsWith('rock'))!;
    e.x=o.x;e.z=o.z+o.radius+1;s.player.x=o.x;s.player.z=o.z-o.radius-2;
    tick(s,1.5);expect(e.z).toBeGreaterThan(o.z);expect(Math.hypot(e.x-o.x,e.z-o.z)).toBeGreaterThanOrEqual(o.radius+.39);
  });
});
