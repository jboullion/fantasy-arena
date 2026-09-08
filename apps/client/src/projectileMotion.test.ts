import { expect, it } from 'vitest';
import type { Projectile } from '@arena/game-core';
import { ProjectileMotion } from './projectileMotion';
const owner=[{id:1,x:0,z:0}];
const shot=(z:number,facing=0):Projectile=>({id:2,ownerId:1,targetId:3,kind:'arrow',x:0,z,facing,speed:18,damage:50,life:1});
it('turns 20 Hz snapshots into continuous 60 Hz flight without mutating authoritative positions',()=>{
  const motion=new ProjectileMotion(), first=shot(.9), second=shot(1.8);
  motion.receive([first],1,owner);motion.receive([second],1.05,owner);
  const positions=[1.05,1.05+1/60,1.05+2/60,1.10].map(t=>motion.sample(2,t)!.z);
  for(let i=1;i<positions.length;i++) expect(positions[i]-positions[i-1]).toBeCloseTo(.3);
  expect(first.z).toBe(.9);expect(second.z).toBe(1.8);
});
it('starts near the owner, removes hits immediately and clears reused IDs on a new round',()=>{
  const motion=new ProjectileMotion();motion.receive([shot(.15)],1,owner);
  expect(motion.sample(2,1)!.z).toBeCloseTo(0);
  motion.receive([],1.05,owner);expect(motion.sample(2,1.06)).toBeUndefined();
  motion.receive([shot(.2)],2,owner);motion.clear();expect(motion.sample(2,2)).toBeUndefined();
});
it('bounds late-packet extrapolation and takes the short path across angle wrapping',()=>{
  const motion=new ProjectileMotion();motion.receive([shot(1,Math.PI-.1)],1,owner);motion.receive([shot(2,-Math.PI+.1)],1.05,owner);
  expect(Math.abs(motion.sample(2,1.075)!.facing)).toBeCloseTo(Math.PI);
  expect(motion.sample(2,5)).toEqual(motion.sample(2,6));
});
