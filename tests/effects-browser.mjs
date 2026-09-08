import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5186','--strictPort','--host','127.0.0.1'],{stdio:'ignore',windowsHide:true});
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
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5186')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  await page.goto('http://127.0.0.1:5186/?sandbox=1');await page.waitForFunction(()=>window.arena?.scene);
  await page.evaluate(async()=>{
    const a=window.arena;a.sim.enemies=[];a.sim.spawnClock=999;a.sim.phase='paused';
    const {effects}=await import('/src/runtime.ts');
    effects.push({type:'kill',x:0,z:2,facing:1.2,knockbackFacing:0,enemyType:'goblin',id:999,life:5});
    a.useUI.setState(s=>({revision:s.revision+1}));
  });
  await page.waitForFunction(()=>{let found=false;window.arena.physics.forEachRigidBody(b=>{if(b.userData?.seed===999)found=true;});return found;});
  const bodies=await page.evaluate(()=>{const out=[];window.arena.physics.forEachRigidBody(b=>{if(b.userData?.seed===999)out.push({...b.userData,q:b.rotation(),v:b.linvel()});});return out;});
  const torso=bodies.find(b=>b.part==='torso');assert.ok(torso);
  assert.ok(Math.abs(torso.q.y-Math.sin(.6))<.01);assert.ok(Math.abs(torso.q.w-Math.cos(.6))<.01);
  assert.ok(torso.v.z>0);assert.ok(Math.abs(torso.v.x)<.01);
  await page.getByRole('heading',{name:'Take a breath'}).evaluate(e=>e.closest('.scrim').style.display='none');
  await page.screenshot({path:'test-results/death-facing.png'});
  await page.evaluate(()=>{
    const s=window.arena.sim;s.spawn(3);s.enemies.forEach((e,i)=>Object.assign(e,{x:(i-1)*2,z:0,burn:i===0?{remaining:5,nextTick:1,ownerId:0,weaponId:'warrior_fire'}:undefined,poisoned:i===1?5:0,chilled:i===2?5:0}));
  });
  await page.waitForFunction(()=>window.arena.scene.getObjectByName('status-particles')?.count===18);
  await page.screenshot({path:'test-results/enemy-status-particles.png'});
  assert.deepEqual(errors,[]);console.log('Preserved ragdoll yaw, separate backward impulse and all three persistent status particle effects passed.');
} finally {await browser.close();vite.kill();}
