import type { Actor, Player } from './index';

/** These values describe distinct actions, independent of basic contact combat. */
export const enemyBehaviors = {
  runner: { windup: .65, active: .65, recovery: 1, cooldown: 4, range: 8, radius: .9, damage: 8 },
  brute: { windup: 1.05, active: .18, recovery: 1.1, cooldown: 5, range: 3.4, radius: 3, damage: 18 },
  revenant: { windup: 1.2, active: 2.8, recovery: .5, cooldown: 6, range: 10, radius: 2.2, damage: 6 },
  boss: { windup: 1.4, active: .2, recovery: .7, cooldown: 14, range: Infinity, radius: 3, damage: 0 },
};
export type EnemyAI = {
  mode: 'idle' | 'warning' | 'active' | 'recovery';
  remaining: number; cooldown: number; x: number; z: number; facing: number;
  hitIds: number[]; pulse: number;
};
type Context = {
  players: Player[];
  move: (e: Actor, dx: number, dz: number) => void;
  hurt: (e: Actor, p: Player, damage: number) => void;
  summon: () => void;
  slowMultiplier: number;
};

/** Returns true while a special action owns movement/contact attacks. State travels in world snapshots. */
export function stepEnemyAction(e: Actor, target: Player, dt: number, ctx: Context) {
  const type = e.enemyType;
  if (!type || type === 'goblin') return false;
  const tuning = enemyBehaviors[type];
  const ai = e.ai ??= {mode:'idle',remaining:0,cooldown:type==='boss'?7:2+(e.id%3)*.4,x:e.x,z:e.z,facing:e.facing,hitIds:[],pulse:0};
  ai.cooldown = Math.max(0,ai.cooldown-dt);
  if(ai.mode==='idle') {
    const distance=Math.hypot(target.x-e.x,target.z-e.z);
    if(ai.cooldown>0 || e.windup>0 || distance>tuning.range || (type==='runner' && distance<3))return false;
    ai.mode='warning';ai.remaining=tuning.windup;ai.hitIds=[];ai.pulse=0;
    ai.x=type==='revenant'?target.x:e.x;ai.z=type==='revenant'?target.z:e.z;
    ai.facing=Math.atan2(target.x-e.x,target.z-e.z);
    e.windup=0;e.vx=e.vz=0;
    return true;
  }
  e.facing=ai.facing;
  ai.remaining-=dt;
  if(ai.mode==='warning') {
    if(ai.remaining<=0){ai.mode='active';ai.remaining=tuning.active;if(type==='boss')ctx.summon();}
    return true;
  }
  if(ai.mode==='active') {
    if(type==='runner') {
      const speed=10*((e.chilled??0)>0?ctx.slowMultiplier:1);
      const before={x:e.x,z:e.z};ctx.move(e,Math.sin(ai.facing)*speed*dt,Math.cos(ai.facing)*speed*dt);
      if(Math.hypot(e.x-before.x,e.z-before.z)<speed*dt*.4)ai.remaining=0;
    }
    ai.pulse-=dt;
    for(const p of ctx.players)if(p.hp>0) {
      const x=type==='runner'?e.x:ai.x,z=type==='runner'?e.z:ai.z;
      if(Math.hypot(p.x-x,p.z-z)>tuning.radius+.45)continue;
      if(type==='revenant') {
        p.chilled=Math.max(p.chilled??0,.25);
        if(ai.pulse<=0)ctx.hurt(e,p,tuning.damage);
      } else if(type!=='boss' && !ai.hitIds.includes(p.id)) {ctx.hurt(e,p,tuning.damage);ai.hitIds.push(p.id);}
    }
    if(ai.pulse<=0)ai.pulse=1;
    if(ai.remaining<=0){ai.mode='recovery';ai.remaining=tuning.recovery;ai.cooldown=tuning.cooldown;}
    return true;
  }
  if(ai.remaining<=0){ai.mode='idle';e.cooldown=Math.max(e.cooldown,.3);}
  return true;
}
