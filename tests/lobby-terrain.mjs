import {chromium} from '@playwright/test';import assert from 'node:assert/strict';import {mkdirSync}from'node:fs';
const browser=await chromium.launch({headless:true,executablePath:`${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`});const page=await browser.newPage({viewport:{width:1440,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
await page.goto('http://localhost:5173/');await page.getByLabel('Your name',{exact:true}).fill('Terrain check');await page.getByRole('button',{name:'Create lobby'}).click();await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Launch Level 1'}).click();await page.waitForFunction(()=>window.arena?.sim.config.arenaWidth===64);
const obstacle=await page.evaluate(()=>{const s=window.arena.sim;return [...s.terrain.obstacles].sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z))[0];});
const distance=Math.hypot(obstacle.x,obstacle.z);
const held=new Set();
for(let i=0;i<45;i++){
 const delta=await page.evaluate(o=>({x:o.x-window.arena.sim.player.x,z:o.z-window.arena.sim.player.z}),obstacle);
 const wanted=new Set([...(Math.abs(delta.x)>.12?[delta.x>0?'KeyD':'KeyA']:[]),...(Math.abs(delta.z)>.12?[delta.z>0?'KeyS':'KeyW']:[])]);
 for(const key of held)if(!wanted.has(key))await page.keyboard.up(key);
 for(const key of wanted)if(!held.has(key))await page.keyboard.down(key);
 held.clear();wanted.forEach(key=>held.add(key));await page.waitForTimeout(100);
}
for(const key of held)await page.keyboard.up(key);await page.waitForTimeout(150);
const state=await page.evaluate(o=>{const s=window.arena.sim;return{width:s.config.arenaWidth,length:s.config.arenaLength,distance:Math.hypot(s.player.x-o.x,s.player.z-o.z),projection:s.player.x*o.x/Math.hypot(o.x,o.z)+s.player.z*o.z/Math.hypot(o.x,o.z)};},obstacle);
assert.equal(state.width,64);assert.equal(state.length,56);assert.ok(state.distance>=obstacle.radius+.48);assert.ok(state.distance<obstacle.radius+.8);assert.ok(state.projection<distance);assert.deepEqual(errors,[]);mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/lobby-terrain.png'});console.log('Lobby launch, 64x56 server map and authoritative obstacle collision passed',state);
}finally{await browser.close();}
