// Loads every page of the assembled site in a headless browser and fails on console errors.
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
// the LVGL face the station boots must be in the assembled site
for (const f of ['_site/sandbox/face/dist/face.mjs', '_site/sandbox/face/dist/face.wasm']) if (!existsSync(f)) { console.log('missing from the assembled site: ' + f); process.exit(1); }
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright');
const pages = ['/', '/roadmap/', '/sandbox/exploration/', '/sandbox/station/', '/sandbox/play/', '/sandbox/test/'];
const browser = await chromium.launch();
let failed = false;
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://127.0.0.1:' + (process.env.PORT || 8000) + path, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  if (path.includes('exploration')) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  }
  if (path.includes('station')) {
    for (const k of ['KeyR', 'ArrowRight', 'Enter', 'KeyL', 'KeyB', 'KeyD', 'KeyH']) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  }
  if (path.includes('play') && page.frames().length < 3) errors.push('play: the Station and Companion frames did not load');
  if (path === '/sandbox/test/' && page.frames().length < 3) errors.push('test: the Station and Companion frames did not load');
  const text = (await page.textContent('body')) || '';
  const foot = path === '/' ? '#build' : path === '/sandbox/test/' ? '#foot' : /\/sandbox\/(station|exploration)\/$/.test(path) ? '#buildFoot' : null;
  if (foot) await page.waitForFunction((s) => /^© 2026 Dirty Pawz Press · [0-9a-f]{7} · \d\d\/\d\d \d\d:\d\d( · save v\d+ · Caddy (online|offline))?$/.test(document.querySelector(s)?.textContent || ''), foot, { timeout: 5000 }).catch(() => errors.push(path + ': build footer missing or local'));
  if (path === '/roadmap/' && (await page.locator('#modules details').count()) === 0) errors.push('roadmap: no items rendered from /roadmap.json');
  console.log(path, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
  if (errors.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
