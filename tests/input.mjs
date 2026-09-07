import { chromium } from '@playwright/test';
import { existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:5173/?sandbox=1'); await page.waitForFunction(() => window.arena); await page.waitForTimeout(1000);
  await page.evaluate(() => { window.arena.restart(); window.pad = { connected: true, axes: [.1, .1], buttons: Array.from({length: 16}, () => ({pressed: false})) }; Object.defineProperty(navigator, 'getGamepads', { value: () => [window.pad], configurable: true }); });
  await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.arena.sim.player.x), 0);
  await page.evaluate(() => window.pad.axes = [1, 0]); await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => window.arena.sim.player.x > 1));
  await page.getByText('LEFT STICK', { exact: true }).waitFor();
  await page.evaluate(() => { window.pad.axes = [0,0]; window.pad.buttons[9].pressed = true; });
  await page.getByRole('dialog').waitFor();
  const t = await page.evaluate(() => window.arena.sim.time); await page.waitForTimeout(300); assert.equal(await page.evaluate(() => window.arena.sim.time), t);
  await page.evaluate(() => { window.pad.buttons[9].pressed = false; window.pad.buttons[0].pressed = true; });
  await page.waitForFunction(() => window.arena.sim.phase === 'playing');
  await page.evaluate(() => { window.pad.buttons[0].pressed = false; window.dispatchEvent(new Event('blur')); });
  assert.equal(await page.evaluate(() => window.arena.sim.phase), 'paused');
  console.log('Gamepad adapter: dead zone, analog movement, prompts, pause edge, confirm, focus-loss pause passed. Physical controller not tested.');
} finally { await browser.close(); }

