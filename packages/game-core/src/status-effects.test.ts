import { it, expect } from 'vitest';
import { Simulation } from './index';
import type { Element, Config } from '@arena/game-data';
const tick=(s:Simulation,t:number)=>{for(let i=0;i<Math.round(t*60);i++)s.stepMultiplayer(1/60,new Map());};
function hit(element:Element,config:Partial<Config>={}) {
  const s=new Simulation({enemySpeed:0,knockback:0,...config});
  s.reset([{id:0,name:'Hero',character:'warrior',equippedWeapon:`warrior_${element}`}]);
  s.spawnClock=999;s.enemies=s.enemies.slice(0,1);
  Object.assign(s.enemies[0],{x:0,z:2,hp:100,facing:Math.PI});
  tick(s,.2);s.player.cooldown=999;return s;
}
it('fire ticks five times, expires, and credits its original weapon after replacement',()=>{
  const s=hit('fire');s.player.equippedWeapon='warrior_ice';
  tick(s,.8);expect(s.enemies[0].hp).toBe(75);
  tick(s,.2);expect(s.enemies[0].hp).toBe(70);
  tick(s,5);expect(s.enemies[0].hp).toBe(50);expect(s.enemies[0].burn).toBeUndefined();
  expect(s.player.stats.damageByWeapon.warrior_fire).toBe(50);
  expect(s.player.stats.damageByType?.fire).toBe(25);
});
it('fire is configurable, pauses, and gives one kill without overkill',()=>{
  const s=hit('fire',{fireTickDamage:7,fireTickInterval:.5,fireDuration:2});s.enemies[0].hp=3;
  s.phase='paused';tick(s,1);expect(s.enemies[0].hp).toBe(3);s.phase='playing';tick(s,.6);
  expect(s.enemies).toHaveLength(0);expect(s.kills).toBe(1);expect(s.player.stats.totalDamage).toBe(28);
  tick(s,2);expect(s.kills).toBe(1);
});
it('lightning splashes nearby enemies once, including on a lethal direct hit, without chaining',()=>{
  const s=new Simulation({enemySpeed:0,knockback:0});
  s.reset([{id:0,name:'Hero',character:'mage',equippedWeapon:'mage_lightning'}]);s.spawnClock=999;
  s.enemies=s.enemies.slice(0,3);
  s.enemies.forEach((e,i)=>Object.assign(e,{x:i*1.5,z:5,hp:i===0?10:100}));
  tick(s,.7);
  expect(s.enemies.map(e=>e.hp)).toEqual([95,100]);
  expect(s.player.stats.damageByType?.lightning).toBe(5);expect(s.kills).toBe(1);
});
it('poison halves outgoing contact damage and expires',()=>{
  const s=hit('poison');const e=s.enemies[0];Object.assign(e,{z:1,windup:.01,attackTargetId:0});tick(s,.02);
  expect(s.player.hp).toBe(95);
  e.z=5;tick(s,5);Object.assign(e,{z:1,windup:.01,attackTargetId:0});tick(s,.02);
  expect(s.player.hp).toBe(85);
});
it('ice halves movement speed then restores it',()=>{
  const s=hit('ice',{enemySpeed:2});const e=s.enemies[0];e.z=8;e.vx=e.vz=0;
  tick(s,1);expect(e.z).toBeCloseTo(7,5);
  tick(s,4);e.z=8;tick(s,1);expect(e.z).toBeCloseTo(6,5);
});
it('repeated hits refresh durations without stacking burn ticks or slow strength',()=>{
  const s=hit('fire');tick(s,.6);s.player.cooldown=0;tick(s,.2);
  expect(s.enemies[0].burn!.remaining).toBeGreaterThan(4.8);
  tick(s,.2);expect(s.player.stats.damageByType?.fire).toBe(5);
});
it('death preserves victim facing independently of the impact direction',()=>{
  const s=hit('ice');const e=s.enemies[0];e.hp=1;e.facing=1.2;s.player.cooldown=0;s.player.windup=.001;
  tick(s,1/60);const death=s.events.find(e=>e.type==='kill')!;
  expect(death.facing).toBe(1.2);expect(death.knockbackFacing).toBeCloseTo(0);
});
