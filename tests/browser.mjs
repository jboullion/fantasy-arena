import { chromium } from '@playwright/test';
import { mkdir, writeFile, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import assert from 'node:assert/strict';
const dir = 'test-results'; await promisify(mkdir)(dir, { recursive: true });
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}), args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const metrics = [];
try {
  await page.goto('http://127.0.0.1:5173/?sandbox=1');
  await page.waitForFunction(() => window.arena && document.querySelector('canvas'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.arena.restart());
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 1);
  const paused = await page.evaluate(() => window.arena.sim.time);
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(() => window.arena.sim.time), paused);
  await page.keyboard.press('Escape');
  const start = await page.evaluate(() => window.arena.sim.player.x);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(600); await page.keyboard.up('KeyD');
  assert.ok((await page.evaluate(() => window.arena.sim.player.x)) > start + 1);
  await page.keyboard.press('KeyR');
  await page.screenshot({ path: `${dir}/arena-desktop.png` });
  // Exercise combat through real elapsed browser frames with a controlled encounter.
  await page.evaluate(() => { const s = window.arena.sim; s.enemies = s.enemies.slice(0, 1); Object.assign(s.enemies[0], { x: 0, z: 2, hp: 25 }); s.spawnClock = 999; });
  await page.waitForFunction(() => window.arena.sim.kills > 0);
  assert.ok(await page.evaluate(() => window.arena.sim.events.length < 10));
  await page.evaluate(() => { const s = window.arena.sim; s.reset(); s.config.swordRange = .1; s.config.enemyDamage = 100; s.enemies = s.enemies.slice(0, 1); Object.assign(s.enemies[0], { x: 0, z: 1, cooldown: 0 }); s.spawnClock = 999; });
  await page.getByRole('heading', { name: 'You died' }).waitFor();
  await page.screenshot({ path: `${dir}/arena-death.png` });
  await page.getByRole('button', { name: 'Try again' }).click();
  assert.equal(await page.evaluate(() => window.arena.sim.player.hp), 100);
  await page.evaluate(() => { const s = window.arena.sim; s.time = 59.7; s.enemies = []; s.spawnClock = 999; });
  await page.getByRole('heading', { name: 'Round complete' }).waitFor();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Tune' }).click();
  await page.getByRole('button', { name: 'Reset defaults & restart' }).click();
  for (const count of [25, 50, 100, 200]) {
    await page.getByRole('button', { name: String(count), exact: true }).click();
    await page.evaluate(() => { const s = window.arena.sim; s.config.enemyDamage = 0; s.spawnClock = 999; s.config.swordDamage = 0; });
    await page.waitForTimeout(1200);
    const measurement = await page.evaluate(async () => {
      const deltas = [], steps = []; let last = performance.now();
      for (let i = 0; i < 120; i++) { await new Promise(requestAnimationFrame); const now = performance.now(); deltas.push(now - last); last = now; steps.push(window.arena.useUI.getState().simulationMs); }
      deltas.sort((a,b) => a-b); steps.sort((a,b) => a-b);
      const canvas = document.querySelector('canvas'), gl = canvas.getContext('webgl2'), info = gl.getExtension('WEBGL_debug_renderer_info');
      return { enemies: window.arena.sim.enemies.length, meanFps: 1000 / (deltas.reduce((a,b) => a+b,0) / deltas.length), frameP95Ms: deltas[114], simulationP95Ms: steps[114], renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    });
    metrics.push({ requested: count, ...measurement });
  }
  await page.screenshot({ path: `${dir}/arena-stress.png` });
  await page.getByRole('button', { name: 'Reset defaults & restart' }).click();
  await page.getByRole('button', { name: 'Close tuning' }).click();
  await page.setViewportSize({ width: 640, height: 740 });
  await page.screenshot({ path: `${dir}/arena-narrow.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  await promisify(writeFile)(`${dir}/browser-report.json`, JSON.stringify({ errors, metrics }, null, 2));
  console.log(JSON.stringify({ checks: 'movement, pause, combat, death, restart, completion, tuning, stress, narrow layout', errors, metrics }, null, 2));
} finally { await browser.close(); }

