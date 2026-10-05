// Loads every page of the assembled site in a headless browser and fails on console errors.
import { createRequire } from 'node:module';
const require = createRequire(process.env.PW_DIR ? process.env.PW_DIR + '/' : import.meta.url);
const { chromium } = require('playwright');
const pages = ['/', '/sandbox/exploration/'];
const browser = await chromium.launch();
let failed = false;
for (const path of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8000' + path, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  if (path.includes('exploration')) {
    await page.keyboard.press('Enter'); await page.waitForTimeout(200);
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200);
  }
  const text = (await page.textContent('body')) || '';
  if (path === '/' && !/build/.test(text)) errors.push('home: build stamp missing');
  console.log(path, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'ok');
  if (errors.length) failed = true;
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
