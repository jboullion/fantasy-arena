import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5175','--strictPort','--host','127.0.0.1'],{stdio:'ignore',windowsHide:true});
const installed=`${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser=await chromium.launch({headless:true,...(existsSync(installed)?{executablePath:installed}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));mkdirSync('test-results',{recursive:true});
const sample=()=>page.evaluate(()=>{const bodies=[];window.arena.physics.forEachRigidBody(b=>bodies.push({...b.userData,p:b.translation(),q:b.rotation()}));return bodies;});
async function reset(character){
  await page.evaluate(character=>{const a=window.arena,s=a.sim;s.reset([{id:0,name:character,character}]);s.enemies=[];s.spawnClock=999;s.config.cameraHeight=6;s.config.cameraDistance=5;a.useUI.setState(s=>({revision:s.revision+1}));},character);
  await page.waitForTimeout(700);
}
try{
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5175')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  await page.goto('http://127.0.0.1:5175/?sandbox=1');await page.waitForFunction(()=>window.arena?.scene);
  for(const [character,part] of [['archer','quiver'],['mage','hat_tip']]){
    await reset(character);
    const before=(await sample()).find(b=>b.part===part);assert.ok(before);
    const motion=page.evaluate(async ({part,initial})=>{
      const start=performance.now();let peak=0;
      await new Promise(resolve=>{function frame(){window.arena.physics.forEachRigidBody(b=>{if(b.userData?.part===part){const q=b.rotation();peak=Math.max(peak,Math.abs(q.x-initial.x)+Math.abs(q.y-initial.y)+Math.abs(q.z-initial.z));}});if(performance.now()-start<500)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
      return peak;
    },{part,initial:before.q});
    await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');
    assert.ok(await motion>.005,part+' responds during the movement, even if settled by the end');
    await page.screenshot({path:'test-results/'+character+'-roster.png'});
    await page.evaluate(()=>{window.arena.sim.player.hp=0;window.arena.useUI.setState(s=>({revision:s.revision+1}));});
    await page.waitForTimeout(850);const bodies=await sample();
    assert.equal(bodies.filter(b=>b.role==='dropped').length,1);
    const torso=bodies.find(b=>b.part==='torso'),weapon=bodies.find(b=>b.role==='dropped');
    assert.ok(Math.hypot(torso.p.x-weapon.p.x,torso.p.z-weapon.p.z)>1,'Weapon separates');
    assert.ok(bodies.every(b=>Object.values(b.p).every(Number.isFinite)));
    await page.screenshot({path:'test-results/'+character+'-dropped-weapon.png'});
    checks.push({character,accessory:part,motion:true,detached:true});
    await reset(character);
    await page.evaluate(()=>{const s=window.arena.sim;s.config.cameraHeight=12;s.config.cameraDistance=10;s.config.enemySpeed=0;s.config.knockback=0;s.config.arrowSpeed=4;s.config.missileSpeed=4;s.spawn(2);Object.assign(s.enemies[0],{x:0,z:6,hp:500});Object.assign(s.enemies[1],{x:1,z:7,hp:500});s.player.cooldown=0;});
    const kind=character==='archer'?'arrow':'magic_missile';
    await page.waitForFunction(kind=>window.arena.scene.getObjectByName('projectiles-'+kind)?.count>0,kind);
    await page.waitForFunction(()=>window.arena.sim.projectiles.some(p=>p.z>2));
    await page.screenshot({path:'test-results/'+kind+'-flight.png'});
    await page.waitForFunction(()=>window.arena.sim.player.stats.totalDamage>=25);
    const result=await page.evaluate(()=>({hp:window.arena.sim.enemies.map(e=>e.hp),damage:window.arena.sim.player.stats.totalDamage}));
    assert.equal(result.hp[1],500);checks.push({kind,instanced:true,singleTarget:true});
  }
  await reset('warrior');
  await page.evaluate(()=>{const s=window.arena.sim;s.config.enemySpeed=0;s.player.cooldown=999;s.config.cameraHeight=12;s.config.cameraDistance=10;for(const [i,type] of ['goblin','runner','brute','revenant','boss'].entries()){s.spawn(1,type);Object.assign(s.enemies.at(-1),{x:(i-2)*3,z:-3,hp:99999});}});
  await page.waitForTimeout(500);
  const types=await page.evaluate(()=>['goblin','runner','brute','revenant','boss'].map(t=>({type:t,count:window.arena.scene.getObjectByName('horde-'+t+'-torso').count})));
  assert.ok(types.every(t=>t.count===1));await page.screenshot({path:'test-results/all-enemy-models.png'});
  assert.deepEqual(errors,[]);writeFileSync('test-results/roster-browser.json',JSON.stringify({checks,types,errors},null,2));
  console.log('Roster browser checks passed: ranged accessories, weapon drops, projectile instances and five enemy models.');
}catch(e){await page.screenshot({path:'test-results/roster-failure.png'});console.log(errors);throw e;}
finally{await browser.close();vite.kill();}
