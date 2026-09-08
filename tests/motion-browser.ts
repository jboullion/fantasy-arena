import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ArenaRoom } from '../apps/server/src/ArenaRoom';

const server=new Server({transport:new WebSocketTransport(),greet:false,gracefullyShutdown:false});
server.define('arena',ArenaRoom);await server.listen(2569,'127.0.0.1');
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5176','--strictPort','--host','127.0.0.1'],{env:{...process.env,VITE_MULTIPLAYER_URL:'http://127.0.0.1:2569'},stdio:'ignore',windowsHide:true});
const installed=`${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser=await chromium.launch({headless:true,...(existsSync(installed)?{executablePath:installed}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[],report:unknown[]=[];
// tsx preserves nested function names through this helper in serialized evaluate callbacks.
await page.addInitScript({content:'window.__name = fn => fn;'});
page.on('pageerror',e=>errors.push(e.message));mkdirSync('test-results',{recursive:true});
try {
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5176')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  // Exercise limited attachment motion locally, including a rapid stop/reversal.
  await page.goto('http://127.0.0.1:5176/?sandbox=1');await page.waitForFunction(()=>(window as any).arena?.physics);
  for(const character of ['warrior','guardian','archer','mage']) {
    await page.evaluate(character=>{const a=(window as any).arena;a.sim.reset([{id:0,name:character,character}]);a.sim.enemies=[];a.sim.spawnClock=999;a.sim.config.cameraHeight=7;a.sim.config.cameraDistance=6;a.useUI.setState((s:any)=>({revision:s.revision+1}));},character);
    await page.waitForTimeout(500);
    await page.evaluate(()=>{
      const a=(window as any).arena;(window as any).attachmentSamples=[];(window as any).sampling=true;
      function sample(){if(!(window as any).sampling)return;a.physics.forEachRigidBody((b:any)=>{if(b.userData?.role==='accessory'){const q=b.rotation();(window as any).attachmentSamples.push({part:b.userData.part,angle:2*Math.acos(Math.min(1,Math.abs(q.y))),q:{...q},facing:a.sim.player.facing});}});requestAnimationFrame(sample);}requestAnimationFrame(sample);
    });
    await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');
    await page.keyboard.down('s');await page.waitForTimeout(350);await page.keyboard.up('s');await page.waitForTimeout(900);
    const samples=await page.evaluate(()=>{(window as any).sampling=false;return (window as any).attachmentSamples as {part:string;angle:number}[];});
    const max=Math.max(...samples.map(s=>s.angle));
    assert.ok(max<.29,character+' stays within restrained motion, radians='+max);
    assert.ok(max>.002,character+' retains some secondary motion');
    if(character==='mage')assert.ok(samples.every(s=>s.part==='hat_tip'),'Only hat tip has an accessory body');
    await page.screenshot({path:'test-results/motion-'+character+'.png'});report.push({character,maxRadians:max});
  }
  // Real server snapshots at 20 Hz; compare GPU-instance motion with unchanged raw packets.
  for(const [character,kind] of [['archer','arrow'],['mage','magic_missile']]) {
    await page.goto('http://127.0.0.1:5176/');
    await page.getByRole('button',{name:new RegExp(character==='archer'?'Archer':'Mage')}).click();
    await page.getByRole('button',{name:'Create lobby',exact:true}).click();await page.getByTestId('room-code').waitFor();
    const code=(await page.getByTestId('room-code').textContent())!;
    await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Launch Level 1'}).click();
    await page.waitForFunction(()=>(window as any).arena?.scene);
    const room=matchMaker.getLocalRoomById(code) as ArenaRoom,s=room.simulation;
    s.config.enemySpeed=0;s.config.knockback=0;s.spawnClock=999;s.enemies=s.enemies.slice(0,1);s.player.cooldown=0;
    Object.assign(s.enemies[0],{x:0,z:8,hp:10000,maxHealth:10000});
    await page.waitForFunction(kind=>(window as any).arena.scene.getObjectByName('projectiles-'+kind)?.count>0,kind);
    const samples=await page.evaluate(async kind=>{
      const samples:{id:number;raw:number;visual:number}[]=[];const start=performance.now();
      await new Promise<void>(resolve=>{function frame(){const a=(window as any).arena,shot=a.sim.projectiles.find((p:any)=>p.kind===kind),mesh=a.scene.getObjectByName('projectiles-'+kind);if(shot&&mesh?.count)samples.push({id:shot.id,raw:shot.z,visual:mesh.instanceMatrix.array[14]});if(performance.now()-start<2500)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
      return samples;
    },kind);
    let heldRaw=0,smooth=0;
    for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(a.id===b.id&&a.raw===b.raw){heldRaw++;if(b.visual-a.visual>.001)smooth++;}}
    assert.ok(heldRaw>8,'Sampled multiple frames between server packets');
    assert.ok(smooth/heldRaw>.8,kind+' should move while raw snapshot position is unchanged: '+smooth+'/'+heldRaw);
    report.push({kind,heldRaw,smooth});await page.screenshot({path:'test-results/smooth-'+kind+'.png'});
  }
  assert.deepEqual(errors,[]);writeFileSync('test-results/motion-browser.json',JSON.stringify({report,errors},null,2));console.log(report);
}catch(error){await page.screenshot({path:'test-results/motion-failure.png'});console.log(errors);throw error;}
finally{await browser.close();vite.kill();await server.gracefullyShutdown(false);}
