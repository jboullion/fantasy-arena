import { chromium } from '@playwright/test';
import { existsSync, writeFileSync } from 'node:fs';
const executablePath = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(executablePath) ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await page.goto('http://127.0.0.1:5173/?sandbox=1'); await page.waitForFunction(() => window.arena); await page.waitForTimeout(1500); await page.keyboard.press('KeyR');
  let held = [], screenshot = false;
  const started = Date.now();
  while (Date.now() - started < 85000) {
    const s = await page.evaluate(() => ({ phase: window.arena.sim.phase, time: window.arena.sim.time, hp: window.arena.sim.player.hp, kills: window.arena.sim.kills, x: window.arena.sim.player.x, z: window.arena.sim.player.z, enemies: window.arena.sim.enemies.length }));
    if (s.phase !== 'playing') { writeFileSync('test-results/round-report.json', JSON.stringify(s, null, 2)); console.log(s); break; }
    // Follow a loop using only keyboard movement; gameplay values remain untouched.
    const angle = s.time * .6, tx = Math.cos(angle) * 10, tz = Math.sin(angle) * 8;
    const desired = [];
    if (Math.abs(tx - s.x) > .4) desired.push(tx > s.x ? 'KeyD' : 'KeyA');
    if (Math.abs(tz - s.z) > .4) desired.push(tz > s.z ? 'KeyS' : 'KeyW');
    for (const key of held) if (!desired.includes(key)) await page.keyboard.up(key);
    for (const key of desired) if (!held.includes(key)) await page.keyboard.down(key);
    held = desired;
    if (s.time > 35 && !screenshot) { await page.screenshot({ path: 'test-results/arena-combat.png' }); screenshot = true; }
    await page.waitForTimeout(150);
  }
  await page.screenshot({ path: 'test-results/arena-round-end.png' });
} finally { await browser.close(); }

