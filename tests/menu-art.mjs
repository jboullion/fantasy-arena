import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('test-results/menu-art', { recursive: true });
const installed = `${process.env.LOCALAPPDATA}/ms-playwright/chromium-1228/chrome-win64/chrome.exe`;
const browser = await chromium.launch({ headless: true, ...(existsSync(installed) ? { executablePath: installed } : {}), args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  for (const [width,height] of [[1440,900],[390,844],[844,390]]) {
    await page.setViewportSize({width,height});
    await page.goto('http://127.0.0.1:5173/?ui-preview=1');
    await page.getByRole('heading',{name:'Adventure awaits.'}).waitFor();
    await page.waitForTimeout(1200);
    for (const screen of ['Welcome','Adventurer','Party','Camp shop','Pause','Victory','Defeat','Statistics']) {
      await page.getByRole('button',{name:screen,exact:true}).click();
      const panel = page.getByRole('region',{name:screen,exact:true});
      await panel.waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x+bounds.width <= width+1);
      await page.screenshot({path:`test-results/menu-art/${width}-${screen.replaceAll(' ','-')}.png`,fullPage:true});
    }
  }
  await page.getByRole('button',{name:'Party',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Enter the forest'}).isDisabled());
  await page.getByRole('button',{name:'Ready up',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Enter the forest'}).isEnabled());
  await page.getByRole('button',{name:'Camp shop',exact:true}).click();
  await page.getByRole('button',{name:'75 gold',exact:true}).click();
  assert.ok(await page.getByRole('button',{name:'Equipped',exact:true}).isDisabled());
  await page.goto('http://127.0.0.1:5173/');
  await page.getByRole('button',{name:'Create lobby'}).waitFor();
  await page.screenshot({path:'test-results/menu-art/live-lobby.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('24 menu viewport checks, ready/purchase interactions, and live lobby passed.');
} finally { await browser.close(); }
