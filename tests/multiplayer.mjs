import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
const errors = [], pages = [];
mkdirSync('test-results', { recursive: true });
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
try {
  for (let i = 0; i < 5; i++) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); pages.push(page);
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:5173/');
    await page.getByRole('heading', { name: 'Gather your party.' }).waitFor();
    await page.getByRole('textbox', {name:'Your name'}).fill(`Player ${i + 1}`);
    if (i % 2) await page.getByRole('button', {name:/Dwarf Guardian/}).click();
  }
  const host = pages[0];
  await host.getByRole('button', {name:'Create lobby',exact:true}).click();
  await host.getByTestId('room-code').waitFor();
  const code = await host.getByTestId('room-code').textContent();
  for (const page of pages.slice(1,4)) {
    await page.getByRole('textbox',{name:'Lobby code'}).fill(code);
    await page.getByRole('button',{name:'Join lobby',exact:true}).click();
    await page.getByTestId('room-code').waitFor();
  }
  await host.waitForFunction(() => document.querySelectorAll('.party-slot:not(.empty)').length === 4);
  assert.equal(await host.getByRole('button', {name:'Launch Level 1'}).isEnabled(),false);
  await pages[4].getByRole('textbox',{name:'Lobby code'}).fill(code);
  await pages[4].getByRole('button',{name:'Join lobby',exact:true}).click();
  await pages[4].getByRole('alert').waitFor();
  assert.match(await pages[4].getByRole('alert').textContent(), /full/);
  // Character/profile changes clear readiness on the server.
  await pages[1].getByRole('button',{name:'Ready up',exact:true}).click();
  await pages[1].getByRole('button',{name:'Unready',exact:true}).waitFor();
  await pages[1].getByRole('textbox',{name:'Your name'}).fill('Borin');
  await pages[1].getByRole('textbox',{name:'Your name'}).press('Tab');
  await pages[1].getByRole('button',{name:'Ready up',exact:true}).waitFor();
  await host.getByText('Borin',{exact:true}).waitFor();
  for (const page of pages.slice(0,4)) { await page.getByRole('button',{name:'Ready up',exact:true}).click(); await page.getByRole('button',{name:'Unready',exact:true}).waitFor(); }
  await host.waitForFunction(() => ![...document.querySelectorAll('button')].find(b => b.textContent.includes('Launch Level 1')).disabled);
  await host.screenshot({path:'test-results/lobby-four-players.png'});
  await host.getByRole('button',{name:'Launch Level 1'}).click();
  for (const page of pages.slice(0,4)) await page.waitForFunction(() => document.querySelector('canvas') && window.arena.sim.players.length === 4);
  const ids = await Promise.all(pages.slice(0,4).map(page => page.evaluate(() => window.arena.sim.localPlayerId)));
  assert.equal(new Set(ids).size,4);
  const rosters = await Promise.all(pages.slice(0,4).map(page => page.evaluate(() => window.arena.sim.players.map(p => [p.id,p.name,p.character]))));
  rosters.forEach(roster => assert.deepEqual(roster,rosters[0]));
  assert.ok(rosters[0].some(p => p[1] === 'Borin' && p[2] === 'guardian'));
  await host.bringToFront();
  if (await host.getByRole('button',{name:'Return to game'}).count()) await host.getByRole('button',{name:'Return to game'}).click();
  const start = await host.evaluate(() => window.arena.sim.player.x);
  await host.keyboard.down('KeyD'); await wait(700); await host.keyboard.up('KeyD'); await wait(200);
  const observed = await Promise.all(pages.slice(0,4).map(page => page.evaluate(id => window.arena.sim.players.find(p=>p.id===id).x,ids[0])));
  observed.forEach(x => assert.ok(x > start + 2));
  assert.ok(Math.max(...observed)-Math.min(...observed) < 1);
  // A client cannot locally restart, heal, or clear the shared world with debug shortcuts.
  const before = await host.evaluate(() => window.arena.sim.time); await host.keyboard.press('KeyR'); await wait(200);
  assert.ok(await host.evaluate(t => window.arena.sim.time >= t,before));
  await host.waitForFunction(() => window.arena.sim.kills > 0, {timeout:20000});
  await host.screenshot({path:'test-results/multiplayer-arena.png'});
  const sharedKills = await Promise.all(pages.slice(0,4).map(page=>page.evaluate(()=>window.arena.sim.kills)));
  assert.ok(Math.max(...sharedKills)-Math.min(...sharedKills)<=2);
  // Leaving transfers host and removes that avatar on the other clients.
  await host.getByRole('button',{name:'Menu',exact:false}).click(); await host.getByRole('button',{name:'Leave game',exact:true}).click();
  await pages[1].waitForFunction(() => window.arena.sim.players.length === 3);
  await pages[1].screenshot({path:'test-results/multiplayer-after-leave.png'});
  // The new host carries the remaining party into the inter-round shop.
  await pages[1].getByRole('heading',{name:'Rest. Reforge. Return.'}).waitFor({timeout:75000});
  for(const page of pages.slice(1,4)) await page.getByRole('heading',{name:'Rest. Reforge. Return.'}).waitFor();
  assert.equal(await pages[1].getByRole('button',{name:'Start round 2'}).isEnabled(),false);
  await pages[1].setViewportSize({width:640,height:900}); await pages[1].screenshot({path:'test-results/lobby-narrow.png'});
  assert.equal(await pages[1].evaluate(()=>document.documentElement.scrollWidth > innerWidth),false);
  assert.deepEqual(errors,[]);
  writeFileSync('test-results/multiplayer-report.json',JSON.stringify({code, ids, rosters:rosters[0], movementObserved:observed, sharedKills, errors, checks:'4-player join, capacity, profile, readiness, launch, shared movement/combat, leave/host transfer, shop, narrow layout'},null,2));
  console.log('Four-browser multiplayer flow passed.');
} catch(error) {
  console.log('Browser errors:',errors);
  for(let i=0;i<pages.length;i++){console.log(i,await pages[i].locator('body').innerText().catch(()=>''));await pages[i].screenshot({path:`test-results/multiplayer-failure-${i}.png`}).catch(()=>{});}
  throw error;
} finally { await browser.close(); }

