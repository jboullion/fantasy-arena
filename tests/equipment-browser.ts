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
server.define('arena', ArenaRoom); await server.listen(2572, '127.0.0.1');
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5183', '--host', '127.0.0.1'], { env: { ...process.env, VITE_MULTIPLAYER_URL: 'http://127.0.0.1:2572' }, stdio: 'ignore', windowsHide: true });
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
const pages: Page[] = [], errors: string[] = [], checks: unknown[] = [];
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync('test-results', {recursive:true});
try {
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5183')).ok)break;}catch{}await wait(100);}
  for(let i=0;i<4;i++) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});pages.push(page);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5183');await page.getByRole('textbox',{name:'Your name'}).fill(`Hero ${i+1}`);
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
  const elements=['fire','ice','lightning','poison'];
  for(let round=1;round<=5;round++) {
    await pages[0].waitForFunction(r=>document.querySelector('.round-banner')?.textContent?.includes(`Round ${r} /`) && !!(window as any).arena?.scene,round);
    const sim=room.simulation;
    sim.spawnClock=999;sim.enemies=[];
    if(round>1) {
      const expected=room.run!.summary.players.map(p=>p.equippedWeapon);
      await pages[0].waitForFunction(ids=>{const found:string[]=[];(window as any).arena.scene.traverse((o:any)=>{if(o.userData.equipment)found.push(o.userData.equipment);});return ids.every(id=>found.includes(id!));},expected);
      const particles=await pages[0].evaluate(()=>{const names:string[]=[];(window as any).arena.scene.traverse((o:any)=>{if(o.name.startsWith('weapon-particles-'))names.push(o.name);});return names;});
      assert.equal(particles.length,4);assert.ok(particles.every(n=>n===`weapon-particles-${elements[round-2]}`));
      await pages[0].screenshot({path:`test-results/equipment-combat-${round-1}.png`});
    }
    if(round===5)break;
    sim.time=sim.config.duration;
    for(const page of pages)await page.getByRole('heading',{name:'Rest. Reforge. Return.'}).waitFor();
    for(let i=0;i<4;i++) {
      const p=room.run!.summary.players[i],id=`${p.character}_${elements[round-1]}` as keyof typeof equipment;
      assert.ok(p.offers.includes(id));
      await pages[i].getByRole('button',{name:'Buy '+equipment[id].name}).click();
      await pages[i].waitForFunction(name=>document.querySelector('.equipped-weapon')?.textContent?.includes(name),equipment[id].name);
      assert.equal(p.equippedWeapon,id);
    }
    await pages[0].waitForTimeout(700);
    await pages[0].screenshot({path:`test-results/equipment-camp-${round}.png`});
    for(const page of pages){await page.getByRole('button',{name:'Ready for next round',exact:true}).click();await page.getByRole('button',{name:'Unready',exact:true}).waitFor();}
    await pages[0].getByRole('button',{name:`Start round ${round+1}`,exact:true}).click();
  }
  assert.deepEqual(errors,[]);
  console.log('All 16 purchases, four-class replacement meshes and four elemental particle systems passed in real multiplayer browsers.');
} finally {await browser.close();vite.kill();await server.gracefullyShutdown(false);}
