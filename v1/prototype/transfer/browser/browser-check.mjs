import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createPrototypeServer } from '../../server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const directory = new URL('artifacts/', import.meta.url);
await mkdir(directory, { recursive: true });
const server = createPrototypeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 960 } });
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push({ url: request.url(), method: request.method() }));
  await page.goto(`http://127.0.0.1:${server.address().port}/transfer/`);
  const snapshot = () => page.evaluate(() => window.transferStudy.snapshot());
  async function ready() {
    await page.waitForFunction(() => {
      const state = window.transferStudy?.snapshot();
      return state && state.drawnFrame === state.frameId && state.input.ready === state.frameId;
    });
  }
  async function reset(name = 'pending') {
    await page.locator('#render-delay').fill('0');
    await page.locator('#read-delay').fill('0');
    await page.selectOption('#scenario', name);
    await ready();
    await page.locator('#device').focus();
  }
  async function press(key) { await page.keyboard.press(key); await ready(); }
  async function hash() {
    return page.evaluate(() => {
      const bytes = document.querySelector('canvas').getContext('2d').getImageData(0, 0, 640, 480).data;
      let hash = 2166136261;
      for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
      return hash;
    });
  }
  async function checkPixels() {
    const evidence = await page.evaluate(() => {
      const indices = window.transferStudy.pixels();
      const rgba = document.querySelector('canvas').getContext('2d').getImageData(0, 0, 640, 480).data;
      const colors = new Set();
      const mapping = new Map();
      let consistent = true;
      for (let index = 0; index < indices.length; index++) {
        const color = [...rgba.slice(index * 4, index * 4 + 4)].join(',');
        colors.add(color);
        if (mapping.has(indices[index]) && mapping.get(indices[index]) !== color) consistent = false;
        mapping.set(indices[index], color);
      }
      return { length: indices.length, colors: colors.size, indices: new Set(indices).size, consistent };
    });
    assert.equal(evidence.length, 307200);
    assert.equal(evidence.consistent, true);
    assert.equal(evidence.colors, evidence.indices);
    assert.ok(evidence.colors >= 2 && evidence.colors <= 8);
    return evidence;
  }

  await ready();
  await page.locator('#device').focus();
  for (const name of ['pending', 'confirmed', 'unknown', 'requested', 'unavailable', 'unreadable', 'preview', 'preview-unavailable']) {
    await reset(name);
    assert.equal(await page.locator('#response').inputValue(), name);
    await page.locator('#refresh').click();
    await page.waitForFunction(() => !window.transferStudy.snapshot().state.loading);
    await ready();
    assert.equal((await snapshot()).state.observation.kind, name === 'unavailable' ? 'unavailable' : name === 'unreadable' ? 'unreadable' : 'valid');
  }
  checks.push('Every scenario, including requested, supplies a supported subsequent background read.');
  await reset();
  let before = (await snapshot()).counts.reconciles;
  await page.keyboard.down('2');
  await ready();
  await page.keyboard.down('2');
  await page.keyboard.up('2');
  assert.equal((await snapshot()).counts.reconciles, before + 1);
  await page.keyboard.down('3');
  await ready();
  assert.equal((await snapshot()).state.page, 'details');
  await page.keyboard.down('3');
  await page.keyboard.up('3');
  assert.equal((await snapshot()).state.detailPage, 0);
  checks.push('Native keyboard repeat and held contextual key cannot activate changed frame actions.');

  await reset();
  await page.locator('#render-delay').fill('250');
  await page.selectOption('#palette', 'mono');
  await page.locator('#device').focus();
  await page.keyboard.down('3');
  await ready();
  await page.keyboard.down('3');
  await page.keyboard.up('3');
  assert.equal((await snapshot()).state.page, 'status');
  await press('3');
  assert.equal((await snapshot()).state.page, 'details');
  checks.push('Press begun before readiness remains consumed through ready/repeat/release; fresh press works.');

  await page.locator('#render-delay').fill('400');
  await page.selectOption('#palette', 'color');
  await page.locator('#render-delay').fill('0');
  await page.selectOption('#palette', 'mono');
  await ready();
  const newestHash = await hash();
  await page.waitForTimeout(450);
  assert.equal(await hash(), newestHash);
  assert.ok((await snapshot()).counts.cancelledDraws > 0);
  assert.equal((await snapshot()).pendingDraws, 0);
  checks.push('Delayed stale draw after palette replacement cannot repaint or unlock the current canvas.');
  await page.locator('#render-delay').fill('1000');
  for (let index = 0; index < 12; index++) {
    await page.selectOption('#palette', index % 2 ? 'mono' : 'color');
    assert.equal((await snapshot()).pendingDraws, 1);
  }
  await ready();
  assert.equal((await snapshot()).pendingDraws, 0);
  checks.push('Rapid palette changes retain one replaceable delayed draw, not a framebuffer backlog.');

  await reset();
  await page.locator('#render-delay').fill('200');
  await page.selectOption('#palette', 'color');
  await page.locator('#device').focus();
  await page.keyboard.press('Escape');
  await page.keyboard.down('2');
  await ready();
  await page.keyboard.up('2');
  assert.equal((await snapshot()).caller, true);
  await page.locator('#screen').screenshot({ path: fileURLToPath(new URL('caller-color.png', directory)) });
  await press('2');
  assert.equal((await snapshot()).caller, false);
  checks.push('Back escapes pending frame to guarded pixel caller; blocked reentry is not replayed.');

  await reset();
  await page.keyboard.down('3');
  await ready();
  await page.locator('#read-delay').focus();
  await page.locator('#device').focus();
  await page.keyboard.down('3'); // Native repeat, key still held across blur.
  assert.equal((await snapshot()).state.detailPage, 0);
  await page.locator('#read-delay').focus();
  await page.keyboard.up('3'); // Release outside device: its keyup is not observed.
  await page.locator('#device').focus();
  await press('3');
  assert.equal((await snapshot()).state.detailPage, 1);
  before = (await snapshot()).counts.reconciles;
  await page.locator('#read-delay').focus();
  await page.keyboard.press('2');
  assert.equal((await snapshot()).counts.reconciles, before);
  checks.push('Native blur/refocus rejects held repeat, accepts first fresh press after outside keyup; external controls keep keys.');

  await reset();
  const button = page.locator('[data-slot="2"]');
  let bounds = await button.boundingBox();
  await page.mouse.move(bounds.x + 20, bounds.y + 15);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width + 50, bounds.y);
  await page.mouse.up();
  assert.equal((await snapshot()).state.page, 'status');
  await page.mouse.move(bounds.x + 20, bounds.y + 15);
  await page.mouse.down();
  await button.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  assert.equal((await snapshot()).state.page, 'status');
  await button.click();
  await ready();
  assert.equal((await snapshot()).state.page, 'details');
  await button.dispatchEvent('click');
  assert.equal((await snapshot()).state.detailPage, 0);
  checks.push('Native pointer down/up/outside release plus injected pointercancel cannot activate; synthesized click does not duplicate.');
  await reset();
  bounds = await button.boundingBox();
  await page.mouse.move(bounds.x + 20, bounds.y + 15);
  await page.mouse.down();
  await page.locator('#read-delay').focus(); // Native focusout cancels the pending pointer.
  await page.mouse.move(10, 10);
  await page.mouse.up();
  assert.equal((await snapshot()).state.page, 'status');
  await button.click();
  await ready();
  assert.equal((await snapshot()).state.page, 'details');
  checks.push('Pointer suspension cancels the old press and the first fresh click succeeds after outside release.');

  await reset();
  await page.selectOption('#response', 'unavailable');
  await page.locator('#read-delay').fill('300');
  await page.locator('#refresh').click();
  await page.selectOption('#response', 'confirmed');
  await page.locator('#read-delay').fill('0');
  await page.locator('#refresh').click();
  await page.waitForFunction(() => window.transferStudy.snapshot().state.observation?.facts?.status === 'confirmed');
  await ready();
  const confirmedHash = await hash();
  await page.waitForTimeout(350);
  assert.equal((await snapshot()).state.observation.facts.status, 'confirmed');
  assert.equal(await hash(), confirmedHash);
  await page.selectOption('#response', 'drop');
  await page.locator('#refresh').click();
  await ready();
  assert.equal((await snapshot()).state.loading, true);
  await page.locator('#device').focus();
  await press('Escape');
  await page.selectOption('#response', 'confirmed');
  await page.locator('#device').focus();
  await press('2');
  assert.equal((await snapshot()).state.observation.facts.status, 'confirmed');
  checks.push('Out-of-order error cannot replace newer confirmed pixels; dropped read permits Back and same-haul reentry.');

  await reset();
  await page.keyboard.down('3');
  await ready();
  // Browser visibility dispatch is an explicitly injected host event, not physical hardware evidence.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.keyboard.down('3');
  await page.keyboard.up('3');
  assert.equal((await snapshot()).state.detailPage, 0);
  checks.push('Injected browser visibility interruption consumes held native key repeat.');
  await page.evaluate(() => { delete document.hidden; });
  const anotherTab = await browser.newPage();
  await anotherTab.bringToFront();
  const nativeTabHidden = await page.evaluate(() => document.hidden);
  await page.bringToFront();
  await anotherTab.close();

  const captures = [];
  for (const profile of ['color', 'mono']) {
    await page.selectOption('#palette', profile);
    for (const scenario of ['pending', 'confirmed', 'unavailable', 'unreadable', 'preview']) {
      await reset(scenario);
      if (scenario === 'preview') await press('3');
      await ready();
      const name = `${scenario === 'preview' ? 'mixed-case-details' : scenario}-${profile}.png`;
      const path = new URL(name, directory);
      await page.locator('#screen').screenshot({ path: fileURLToPath(path) });
      const evidence = await checkPixels();
      if (profile === 'mono') assert.equal(evidence.colors, 2);
      captures.push({ file: name, native: '640x480', pixelEvidence: evidence });
    }
  }
  assert.deepEqual(errors, []);
  assert.ok(requests.every(request => request.method === 'GET' && !request.url.includes('/api/')));
  assert.deepEqual(await page.evaluate(async () => ({ local: Object.keys(localStorage), databases: await indexedDB.databases() })), { local: [], databases: [] });
  const sheet = await browser.newPage({ viewport: { width: 688, height: 960 } });
  const selected = ['pending-color.png', 'confirmed-color.png', 'unavailable-color.png', 'mixed-case-details-mono.png'];
  const panels = [];
  for (const name of selected) {
    const { readFile } = await import('node:fs/promises');
    const bytes = await readFile(new URL(name, directory));
    panels.push(`<section><h2>${name.replace('.png', '')}</h2><img width="640" height="480" src="data:image/png;base64,${bytes.toString('base64')}"></section>`);
  }
  await sheet.setContent(`<body style="margin:24px;background:#e7e0d3;font:18px system-ui"><h1>Transfer screen study</h1><p>Provisional fixtures — no hardware or final UI approval.</p>${panels.join('')}</body>`);
  await sheet.screenshot({ path: fileURLToPath(new URL('review-sheet.png', directory)), fullPage: true });
  await sheet.close();
  const report = { fixtureOnly: true, node: process.version, browser: browser.version(), playwright: require((process.argv[2] || 'playwright') + '/package.json').version, checks, captures, nativeTabHidden, requests: requests.length, limitations: 'Visibility and pointercancel were injected DOM events. Native tab visibility is recorded separately; headless tab switching may not hide pages. Timing is a host fault simulation, not panel evidence. No firmware or owner visual approval.' };
  await writeFile(new URL('browser-validation.json', directory), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
