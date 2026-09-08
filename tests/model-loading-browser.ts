import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { equipment } from '../packages/game-data/src/index';
import { ArenaRoom } from '../apps/server/src/ArenaRoom';

// Isolated test server: fixture control is in this process, never a public game command.
const server = new Server({ transport: new WebSocketTransport(), greet: false, gracefullyShutdown: false });
server.define('arena', ArenaRoom); await server.listen(2574, '127.0.0.1');
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5187', '--host', '127.0.0.1'], { env: { ...process.env, VITE_MULTIPLAYER_URL: 'http://127.0.0.1:2574' }, stdio: 'ignore', windowsHide: true });
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
const pages: Page[] = [], errors: string[] = [], checks: unknown[] = [];
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync('test-results', {recursive:true});
try {
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5187')).ok)break;}catch{}await wait(100);}
  for(let i=0;i<4;i++) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});pages.push(page);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5187');await page.getByRole('textbox',{name:'Your name'}).fill(`Hero ${i+1}`);
    if(i===0) {
      await page.waitForTimeout(1000);
      await page.evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');(window as any).loadingScene=_roots.get(document.querySelector('canvas')).store.getState().scene;(window as any).loadingCanvas=document.querySelector('canvas');});
      const before=await page.evaluate(()=>{const o=(window as any).loadingScene.getObjectByName('Bar_counter002');(window as any).keptEnvironment=o;return o.uuid;});
      let release!:()=>void;const gate=new Promise<void>(r=>release=r);let requested!:()=>void;const request=new Promise<void>(r=>requested=r);
      await page.route('**/models/roster/mage.glb',async route=>{requested();await gate;await route.continue();});
      await page.getByRole('button',{name:/Mage/}).click();await request;await page.waitForTimeout(350);
      assert.ok(await page.evaluate(()=>{let o=(window as any).keptEnvironment;while(o){if(!o.visible)return false;o=o.parent;}return document.querySelector('canvas')===(window as any).loadingCanvas;}));
      assert.equal(await page.evaluate(()=>(window as any).loadingScene.getObjectByName('Bar_counter002').uuid),before);
      await page.screenshot({path:'test-results/class-loading-room.png'});release();
      await page.waitForFunction(()=>{const g=(window as any).loadingScene.getObjectByName('social-player-0');return g?.visible && g.getObjectByName('social-hat_tip');});
      await page.getByRole('button',{name:/Human Warrior/}).click();
    }
    if(i>0)await page.getByRole('button',{name: new RegExp(['Human Warrior','Dwarf Guardian','Archer','Mage'][i])}).click();
  }
  await pages[0].getByRole('button',{name:'Create lobby',exact:true}).click();await pages[0].getByTestId('room-code').waitFor();
  const code=(await pages[0].getByTestId('room-code').textContent())!;
  for(const page of pages.slice(1)){await page.getByRole('textbox',{name:'Lobby code'}).fill(code);await page.getByRole('button',{name:'Join lobby',exact:true}).click();await page.getByTestId('room-code').waitFor();}
  const room=matchMaker.getLocalRoomById(code) as ArenaRoom;
  await pages[0].waitForTimeout(1800);
  await pages[0].screenshot({path:'test-results/tavern-lobby.png'});
  assert.equal(await pages[0].getByTestId('tavern-scene').count(),1);
  for(const page of pages){await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Unready',exact:true}).waitFor();}
  await pages[0].getByRole('button',{name:'Launch Level 1'}).click();
  await pages[0].getByText('Round 1 / 6',{exact:true}).waitFor();
  room.simulation.enemies=[];room.simulation.spawnClock=999;room.simulation.time=room.simulation.config.duration;
  await pages[0].getByRole('heading',{name:'Rest. Reforge. Return.'}).waitFor();await pages[0].waitForTimeout(800);
  await pages[0].evaluate(async()=>{const {_roots}=await import('/node_modules/.vite/deps/@react-three_fiber.js');const scene=_roots.get(document.querySelector('canvas')).store.getState().scene;(window as any).loadingScene=scene;(window as any).loadingCanvas=document.querySelector('canvas');(window as any).keptEnvironment=scene.getObjectByName('Clearing002');});
  const id=room.run!.summary.players[0].offers[0];
  let release!:()=>void;const gate=new Promise<void>(r=>release=r);let requested!:()=>void;const request=new Promise<void>(r=>requested=r);
  await pages[0].route('**/models/weapons/'+id+'.glb',async route=>{requested();await gate;await route.continue();});
  await pages[0].getByRole('button',{name:'Buy '+equipment[id].name}).click();await request;await pages[0].waitForTimeout(350);
  assert.ok(await pages[0].evaluate(()=>{let o=(window as any).keptEnvironment;while(o){if(!o.visible)return false;o=o.parent;}return document.querySelector('canvas')===(window as any).loadingCanvas;}));
  for(const member of room.members.slice(1)) assert.ok(await pages[0].evaluate(id=>{let o=(window as any).loadingScene.getObjectByName(`social-player-${id}`);if(!o)return false;while(o){if(!o.visible)return false;o=o.parent;}return true;},member.actorId));
  await pages[0].screenshot({path:'test-results/weapon-loading-camp.png'});release();
  await pages[0].waitForFunction(()=>(window as any).loadingScene.getObjectByName('weapon-particles-fire'));
  assert.deepEqual(errors,[]);console.log('Delayed class and weapon downloads preserve the same canvas, environment and unaffected party members.');
} finally {await browser.close();vite.kill();await server.gracefullyShutdown(false);}
