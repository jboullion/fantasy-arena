import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const browser=await chromium.launch({headless:true,executablePath:`${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));mkdirSync('test-results',{recursive:true});
try{
 await page.goto('http://localhost:5173/');await page.getByLabel('Your name',{exact:true}).fill('AI test');await page.getByRole('button',{name:'Create lobby'}).click();await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Launch Level 1'}).click();await page.waitForFunction(()=>window.arena?.scene && window.arena.sim.time>0);
 const pack=await page.evaluate(()=>window.arena.sim.enemies.map(e=>({x:e.x,z:e.z,type:e.enemyType})));assert.ok(pack.length>=5&&pack.length<=10);assert.ok(pack.every(e=>e.type==='goblin'));for(const a of pack)for(const b of pack)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<6);checks.push({lobbyPack:pack.length});
 await page.goto('http://localhost:5173/?sandbox=1');await page.waitForFunction(()=>window.arena?.scene);
 for(const type of ['runner','brute','revenant','boss']){
  await page.evaluate(type=>{const s=window.arena.sim;s.reset();s.enemies=[];s.spawnClock=999;s.config.duration=999;s.config.swordRange=0;s.player.hp=100;s.player.cooldown=999;s.spawn(1,type);const e=s.enemies[0];Object.assign(e,{x:0,z:type==='brute'?2.5:6,cooldown:999,ai:{mode:'idle',remaining:0,cooldown:0,x:0,z:6,facing:0,hitIds:[],pulse:0}});},type);
  await page.waitForFunction(()=>window.arena.sim.enemies[0]?.ai?.mode==='warning');
  const warning=await page.evaluate(type=>window.arena.scene.getObjectByName(type==='runner'?'enemy-charge-warnings':'enemy-area-warnings').count,type);assert.equal(warning,1);
  await page.screenshot({path:`test-results/ai-${type}-warning.png`});
  if(type==='boss'){await page.waitForFunction(()=>window.arena.sim.enemies.length>1);const count=await page.evaluate(()=>window.arena.sim.enemies.length);assert.ok(count>=6&&count<=11);}
  else if(type==='revenant'){await page.waitForFunction(()=>window.arena.sim.player.chilled>0);await page.screenshot({path:'test-results/ai-frost-active.png'});}
  else await page.waitForFunction(()=>window.arena.sim.player.hp<100);
  checks.push({type,warning:true,action:true});
 }
 assert.deepEqual(errors,[]);writeFileSync('test-results/enemy-ai-browser.json',JSON.stringify({checks,errors},null,2));console.log({checks,errors});
}finally{await browser.close();}
