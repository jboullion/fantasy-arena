import { writeFileSync, mkdirSync } from 'node:fs';
import { Simulation, type Actor } from '../packages/game-core/src/index';
import { RunProgress } from '../packages/game-core/src/run';
import { createTerrain } from '../packages/game-core/src/terrain';
import type { CharacterId, WeaponId } from '../packages/game-data/src/index';

const cases = [];
for (const character of ['warrior','guardian','archer','mage'] as CharacterId[]) {
  for (const element of ['', 'fire','lightning','ice','poison']) {
    const sim = new Simulation({maxEnemies:0,enemySpeed:0,enemyDamage:0,knockback:0});
    const weapon = element ? `${character}_${element}` as WeaponId : undefined;
    sim.reset([{id:0,name:'Fixture',character,equippedWeapon:weapon}]);
    const z = character==='archer'||character==='mage' ? 7 : 2;
    const enemy: Actor = {id:1,x:0,z,hp:500,maxHealth:500,enemyType:'goblin',facing:0,flash:0,vx:0,vz:0,cooldown:.7,windup:0};
    sim.enemies=[enemy];
    for(let i=0;i<180;i++)sim.step(1/60,{x:0,z:0});
    cases.push({character,element,z,ticks:180,hp:enemy.hp,damage:sim.player.stats.totalDamage,shots:sim.projectiles.length,kills:sim.player.stats.kills,playerHp:sim.player.hp,enemyX:enemy.x,enemyZ:enemy.z,knockback:0,enemySpeed:0,enemyDamage:0,armor:0,disableAttack:false,poison:false,ice:false,moveAfter:-1});
  }
}
for(const name of ['knockback','contact','armor','poison','dodge','ice']) {
  const knockback=name==='knockback'?7:0,enemySpeed=name==='ice'?2.8:0;
  const z=name==='knockback'?2:name==='ice'?7:.95,armor=name==='armor'?2:0;
  const sim=new Simulation({maxEnemies:0,enemySpeed,enemyDamage:10,knockback});
  sim.reset([{id:0,name:'Fixture',character:'warrior',armorLevel:armor}]);
  if(name!=='knockback')sim.player.cooldown=999;
  const enemy:Actor={id:1,x:0,z,hp:500,maxHealth:500,enemyType:'goblin',facing:0,flash:0,vx:0,vz:0,cooldown:.7,windup:0,poisoned:name==='poison'?5:0,chilled:name==='ice'?5:0};
  sim.enemies=[enemy];const ticks=name==='knockback'||name==='ice'?30:90;
  for(let i=0;i<ticks;i++)sim.step(1/60,{x:name==='dodge'&&i>=54?1:0,z:0});
  cases.push({character:'warrior',element:'',z,ticks,hp:enemy.hp,damage:sim.player.stats.totalDamage,shots:sim.projectiles.length,kills:sim.player.stats.kills,playerHp:sim.player.hp,enemyX:enemy.x,enemyZ:enemy.z,knockback,enemySpeed,enemyDamage:10,armor,disableAttack:name!=='knockback',poison:name==='poison',ice:name==='ice',moveAfter:name==='dodge'?54:-1});
}
const run = new RunProgress('fixture',[{id:0,name:'Fixture',character:'warrior'}]);
const sim = new Simulation({maxEnemies:0});
run.finish(sim.players,true);
const offer=run.summary.players[0].offers[0];
const bought=run.buy(0,offer);
const duplicate=run.buy(0,run.summary.players[0].offers[1]);
const gold=run.summary.players[0].gold;
run.next();run.finish(sim.players,false);run.retry();
mkdirSync('unity/Assets/FantasyArena/Editor/Fixtures',{recursive:true});
writeFileSync('unity/Assets/FantasyArena/Editor/Fixtures/browser-parity.json',JSON.stringify({cases,run:{offer,bought,duplicate,gold,round:run.summary.round},obstacles:createTerrain(64,56).obstacles},null,2)+'\n');
console.log(`Exported ${cases.length} browser combat cases, run rules and terrain layout.`);
