import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const installed=`${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser=await chromium.launch({headless:true,...(existsSync(installed)?{executablePath:installed}:{})});
const page=await browser.newPage({viewport:{width:1200,height:800}});
try {
  await page.goto('http://127.0.0.1:5174/?sandbox=1');
  await page.waitForFunction(()=>window.arena?.physics);
  await page.evaluate(()=>{const a=window.arena;a.sim.enemies=[];a.sim.spawnClock=999;a.sim.phase='paused';a.sim.player.windup=.2;a.useUI.setState(s=>({revision:s.revision+1}));});
  await page.waitForTimeout(150);
  const before=await page.evaluate(()=>{
    const a=window.arena,g=a.scene.getObjectByName(`player-model-${a.sim.player.id}`);
    g.updateMatrixWorld(true);
    return Object.fromEntries(['upper_arm_r','forearm_r','head'].map(n=>{const m=g.getObjectByName(`equipped-${n}`).matrixWorld.elements;return [n,[m[12],m[13]+.07,m[14]]];}));
  });
  await page.evaluate(()=>{const a=window.arena;a.sim.player.hp=0;a.useUI.setState(s=>({revision:s.revision+1}));});
  await page.waitForTimeout(150);
  const after=await page.evaluate(()=>{const out={};window.arena.physics.forEachRigidBody(b=>{if(b.userData?.role==='ragdoll')out[b.userData.part]={p:b.translation(),v:b.linvel()};});return out;});
  for(const [name,p] of Object.entries(before)) assert.ok(Math.hypot(after[name].p.x-p[0],after[name].p.y-p[1],after[name].p.z-p[2])<.015,`${name} preserves animated position`);
  assert.notDeepEqual(after.upper_arm_l.v,after.upper_arm_r.v,'Independent arm impulses');
  await page.evaluate(()=>{document.querySelectorAll('.scrim').forEach(e=>e.style.display='none');});
  await page.screenshot({path:'test-results/ragdoll-pose-handoff.png'});
  console.log('Animated head and arm positions preserved at handoff; independent arm impulses verified.');
} finally {await browser.close();}
