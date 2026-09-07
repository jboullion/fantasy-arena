import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/?sandbox=1'); await page.waitForFunction(() => window.arena); await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const s = window.arena.sim; window.arena.restart(); s.config.enemySpeed = 0; s.spawnClock = 999;
    s.enemies = s.enemies.slice(0, 2); Object.assign(s.enemies[0], {x: 0, z: 2, hp: 25}); Object.assign(s.enemies[1], {x: 1, z: 2});
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.damage-numbers span')].filter(e => e.style.display === 'block' && e.textContent === '25').length === 2).catch(async error => {
    console.log(await page.evaluate(() => ({ phase: window.arena.sim.phase, time: window.arena.sim.time, kills: window.arena.sim.kills, labels: document.querySelector('.damage-numbers')?.outerHTML.slice(0, 1000), enemies: window.arena.sim.enemies })), errors); throw error;
  });
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => window.arena.sim.kills), 1);
  // Hide only the pause presentation for a frozen combat-feedback screenshot.
  await page.addStyleTag({ content: '.scrim{display:none!important}' });
  mkdirSync('test-results', {recursive:true}); await page.screenshot({path:'test-results/damage-numbers.png'});
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000);
  assert.equal(await page.locator('.damage-numbers span:visible').count(), 0);
  await page.keyboard.press('KeyR'); assert.equal(await page.locator('.damage-numbers span:visible').count(), 0);
  assert.deepEqual(errors, []); console.log('Damage values, cleave, lethal hit, fade, restart cleanup and browser errors: passed.');
} finally { await browser.close(); }

