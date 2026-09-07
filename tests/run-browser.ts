import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { chromium, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { ArenaRoom } from '../apps/server/src/ArenaRoom';

// Isolated test server: fixture control is in this process, never a public game command.
const server = new Server({ transport: new WebSocketTransport(), greet: false, gracefullyShutdown: false });
server.define('arena', ArenaRoom); await server.listen(2568, '127.0.0.1');
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5174', '--host', '127.0.0.1'], { env: { ...process.env, VITE_MULTIPLAYER_URL: 'http://127.0.0.1:2568' }, stdio: 'ignore', windowsHide: true });
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
const pages: Page[] = [], errors: string[] = [], checks: unknown[] = [];
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
mkdirSync('test-results', {recursive:true});
try {
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:5174')).ok)break;}catch{}await wait(100);}
  for(let i=0;i<4;i++) {
    const page=await browser.newPage({viewport:{width:1440,height:1000}});pages.push(page);page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5174');await page.getByRole('textbox',{name:'Your name'}).fill(`Hero ${i+1}`);
    if(i%2)await page.getByRole('button',{name:/Dwarf Guardian/}).click();
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
  for(let round=1;round<=10;round++) {
    await pages[0].waitForFunction(r=>(window as any).arena.sim.roundNumber===r || document.querySelector('.round-banner')?.textContent?.includes(`Round ${r} /`),round);
    assert.equal(room.round,round);assert.equal(room.stage,'game');
    const s=room.simulation;
    const types=[...new Set(s.enemies.map(e=>e.enemyType))];
    if([3,6,9].includes(round))assert.ok(types.includes(round===3?'runner':round===6?'brute':'revenant'));
    assert.equal(s.enemies.some(e=>e.enemyType==='boss'),round%5===0);
    if(round>1){assert.equal(s.players[0].weaponLevel,1);assert.equal(s.players[1].armorLevel,1);assert.equal(s.players[1].maxHealth,165);}
    // Run real attacks in short deterministic encounters instead of a ten-minute soak.
    const target=s.enemies.find(e=>e.enemyType==='boss') ?? s.enemies[0];
    s.enemies=[target];s.spawnClock=999;
    if(round%5===0){
      Object.assign(target,{x:0,z:7});s.time=s.config.duration;
      await wait(200);assert.equal(room.stage,'game');
      if(round===5)await pages[0].screenshot({path:'test-results/round-5-boss.png'});
    }
    Object.assign(target,{x:s.players[0].x,z:s.players[0].z+2,hp:30,vx:0,vz:0});
    s.players[0].cooldown=0;s.time=s.config.duration-1.2;
    if(round===10) { await pages[0].evaluate(()=>{(window as any).combatCanvas=document.querySelector('canvas');}); s.players[3].hp=0; s.spawn(12, 'goblin'); s.enemies.filter(e=>e!==target).forEach((e,i)=>Object.assign(e,{x:-6+(i%4)*3,z:5+Math.floor(i/4)*2})); }
    // Keep boss deadline elapsed; it must be killed to end the round.
    if(round%5===0)s.time=s.config.duration;
    for(const page of pages)await page.getByRole('heading',{name:round===10?'You win!':'Rest. Reforge. Return.'}).waitFor();
    assert.equal(room.run!.summary.roundsCompleted,round);
    assert.equal(room.run!.summary.players.length,4);
    checks.push({round,types,result:room.stage,damage:room.run!.summary.players.map(p=>p.stats.totalDamage)});
    assert.ok(room.run!.summary.players.reduce((n,p)=>n+p.stats.totalDamage,0)>=30*round);
    if(round===1){
      for(const p of room.run!.summary.players)assert.equal(p.gold,100);
      await pages[0].getByRole('button',{name:'Buy Honed longsword'}).click();
      await pages[1].getByRole('button',{name:'Buy Forged plate'}).click();
      await pages[0].waitForFunction(()=>document.querySelector('[data-testid="gold"]')?.textContent==='20 gold');
      await pages[1].waitForFunction(()=>document.querySelector('[data-testid="gold"]')?.textContent==='30 gold');
      assert.equal(room.run!.summary.players[0].weaponLevel,1);assert.equal(room.run!.summary.players[1].armorLevel,1);
      await pages[0].screenshot({path:'test-results/shop-round-1.png'});
      await pages[0].setViewportSize({width:640,height:950});
      await pages[0].screenshot({path:'test-results/campfire-narrow.png'});
      assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await pages[0].setViewportSize({width:1440,height:1000});
    }
    if(round<10){
      for(const page of pages){await page.getByRole('button',{name:'Ready for next round',exact:true}).click();await page.getByRole('button',{name:'Unready',exact:true}).waitFor();}
      await pages[0].getByRole('button',{name:`Start round ${round+1}`,exact:true}).click();
    }
  }
  assert.equal(room.stage,'won');assert.equal(room.run!.summary.result,'won');
  for(const page of pages) assert.equal(await page.locator('canvas').count(),1);
  await pages[0].getByRole('button',{name:'View player stats',exact:true}).click();
  const before=JSON.stringify(room.run!.summary);assert.equal(room.run!.buy(room.members[0].actorId,'weapon'),false);assert.equal(JSON.stringify(room.run!.summary),before);
  await pages[0].waitForTimeout(1500);
  const victoryPhysics = await pages[0].evaluate(()=>{ const w=(window as any).arena.physics; const bodies:any[]=[]; w.forEachRigidBody((b:any)=>{if(b.userData?.role==='ragdoll') bodies.push(b.translation());}); return bodies; });
  assert.ok(victoryPhysics.length >= 12 * 8, 'Every surviving enemy becomes an articulated ragdoll');
  assert.equal(await pages[0].evaluate(()=>(window as any).combatCanvas===document.querySelector('canvas')),true,'Victory retains the combat canvas');
  const jumpSample = () => pages[0].evaluate(()=>{const ys:number[]=[];(window as any).arena.physics.forEachRigidBody((b:any)=>{if(b.isKinematic())ys.push(b.translation().y);});return ys;});
  const jumpBefore=await jumpSample(); await pages[0].waitForTimeout(170); const jumpAfter=await jumpSample();
  assert.equal(jumpAfter.length,4,'All players celebrate, including fallen teammates');
  assert.ok(jumpAfter.some((y,i)=>Math.abs(y-jumpBefore[i])>.01),'Celebration jumps animate');
  assert.ok(victoryPhysics.every((p:any)=>Number.isFinite(p.y)));
  await pages[0].screenshot({path:'test-results/run-victory.png'});
  const downloaded=pages[0].waitForEvent('download');await pages[0].getByRole('button',{name:'Export run statistics'}).click();const download=await downloaded;await download.saveAs('test-results/exported-run.json');
  await pages[0].getByRole('button',{name:'Saved runs',exact:true}).click();await pages[0].getByText('Hero 1 · Victory',{exact:true}).waitFor();
  await pages[0].setViewportSize({width:640,height:950});await pages[0].screenshot({path:'test-results/shop-saved-narrow.png',fullPage:true});
  assert.equal(await pages[0].evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const stored=await pages[0].evaluate(()=>localStorage.getItem('fantasy-arena.run-reports.v1'));assert.equal(JSON.parse(stored!)[0].run.result,'won');
  await pages[0].getByRole('button',{name:'Back to lobby',exact:true}).click();
  for(const page of pages){await page.getByRole('heading',{name:'Gather your party.'}).waitFor();await page.getByRole('button',{name:'Ready up',exact:true}).click();await page.getByRole('button',{name:'Unready',exact:true}).waitFor();}
  await pages[0].getByRole('button',{name:'Launch Level 1'}).click();
  await pages[0].waitForFunction(()=>!!document.querySelector('canvas'));
  assert.equal(room.round,1);assert.ok(room.run!.summary.players.every(p=>p.gold===0 && p.weaponLevel===0 && p.stats.totalDamage===0));
  await pages[0].setViewportSize({width:1440,height:1000});
  room.simulation.players.forEach(p=>p.hp=0);
  for(const page of pages)await page.getByRole('heading',{name:'The party has fallen.'}).waitFor();
  assert.equal(room.stage,'lost');assert.equal(await pages[0].locator('canvas').count(),1);
  await pages[0].waitForTimeout(1600);
  await pages[0].screenshot({path:'test-results/run-defeat.png'});
  await pages[0].getByRole('button',{name:'Retry level 1',exact:true}).click();
  await pages[0].getByText('Round 1 / 10',{exact:true}).waitFor();
  assert.equal(room.stage,'game'); assert.ok(room.simulation.players.every(p=>p.hp===p.maxHealth));
  room.simulation.players.forEach(p=>p.hp=0);
  await pages[0].getByRole('heading',{name:'The party has fallen.'}).waitFor();
  const finalStored=await pages[0].evaluate(()=>localStorage.getItem('fantasy-arena.run-reports.v1'));
  assert.equal(JSON.parse(finalStored!).length,2);assert.equal(JSON.parse(finalStored!)[1].run.result,'won');
  await pages[0].reload();assert.equal(await pages[0].evaluate(()=>localStorage.getItem('fantasy-arena.run-reports.v1')),finalStored);
  assert.deepEqual(errors,[]);
  writeFileSync('test-results/ten-round-report.json',JSON.stringify({checks,errors,mode:'accelerated server fixtures with real combat and browser purchases'},null,2));
  console.log('Ten-round four-client flow, enemies, bosses, purchases, stats, victory, export and saved persistence passed.');
} catch(error){console.log(errors);for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:`test-results/run-failure-${i}.png`}).catch(()=>{});throw error;}
finally{await browser.close();vite.kill();await server.gracefullyShutdown(false);}
