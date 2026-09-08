import { describe, it, expect } from 'vitest';
import { Simulation, createTerrain } from './index';
describe('terrain',()=>{
  it('quadruples area and reproduces scenery independently of combat RNG',()=>{const s=new Simulation();expect(s.config.arenaWidth*s.config.arenaLength).toBe(32*28*4);const terrain=s.terrain;s.spawn(20);expect(s.terrain).toEqual(terrain);expect(createTerrain(64,56)).toEqual(terrain);expect(terrain.obstacles.every(o=>Math.hypot(o.x,o.z)>7+o.radius)).toBe(true);});
  it('blocks movement through rocks even for a long movement step',()=>{const s=new Simulation({duration:999});s.enemies=[];s.spawnClock=999;const o=s.terrain.obstacles.find(o=>o.model.startsWith('rock'))!;s.player.x=o.x-o.radius-1;s.player.z=o.z;s.step(.8,{x:1,z:0});expect(s.player.x).toBeLessThanOrEqual(o.x-o.radius-.49);});
  it('routes enemies around an obstacle to their target',()=>{const s=new Simulation({duration:999,enemyDamage:0,swordDamage:0});const o=s.terrain.obstacles[0];s.enemies=s.enemies.slice(0,1);const e=s.enemies[0];e.x=o.x-o.radius-3;e.z=o.z;s.player.x=o.x+o.radius+3;s.player.z=o.z;s.spawnClock=999;for(let i=0;i<600;i++){s.step(1/60,{x:0,z:0});expect(Math.hypot(e.x-o.x,e.z-o.z)).toBeGreaterThanOrEqual(o.radius+.49);}expect(Math.hypot(e.x-s.player.x,e.z-s.player.z)).toBeLessThan(2);});
});
