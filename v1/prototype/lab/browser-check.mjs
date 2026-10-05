// Optional integration check: pass an installed Playwright package directory.
// Uses a disposable browser profile and ephemeral loopback server only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createPrototypeServer } from '../server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const server = createPrototypeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const checks = [];
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/lab/?run=browser-check');
  await page.waitForFunction(() => document.querySelector('#transcript').textContent.includes('NO SAMPLES'));
  async function ready(title) {
    await page.waitForFunction(title => JSON.parse(document.querySelector('#transcript').textContent).view.title === title, title);
    // Let the two animation-frame visible acknowledgments complete.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  async function action(index, title) {
    await page.locator(`[data-key="action${index}"]`).click();
    await ready(title);
  }
  await ready('LAB');
  await action(2, 'CHOOSE QUESTION');
  await action(1, 'RESEARCH');
  await page.locator('#advance').click();
  await page.waitForFunction(() => JSON.parse(document.querySelector('#transcript').textContent).saved.research?.finding);
  await ready('RESEARCH');
  await action(1, 'FINDING');
  await action(1, 'PURSUE A DIRECTION');
  await action(1, 'CREATION PREVIEW');
  await page.selectOption('#fault', 'after');
  await action(1, 'CHECK RESULT');
  const beforeReload = await page.evaluate(async () => {
    const { openRepository } = await import('/lab/repository.mjs');
    const repository = await openRepository(indexedDB, 'critter-lab-founder-demo-v1-browser-check');
    const saved = await repository.read(); repository.close(); return saved.envelope;
  });
  await page.reload();
  await ready('READY');
  await action(1, 'MEET');
  const saved = await page.locator('#transcript').textContent().then(JSON.parse);
  assert.equal(Object.keys(saved.saved.collection).length, 1);
  assert.deepEqual(saved.saved, beforeReload);
  await action(2, 'COLLECTION 1 / 1');
  await action(2, 'MEET');
  await mkdir(new URL('./artifacts/', import.meta.url), { recursive: true });
  await page.locator('canvas').screenshot({ path: fileURLToPath(new URL('./artifacts/browser-meet.png', import.meta.url)) });
  checks.push('Actual UI console route, lost response after commit, reload to Ready, Open and Collection return');

  // Two independent tabs/connections contend on one real IndexedDB envelope.
  const other = await context.newPage();
  await other.goto(origin + '/lab/?run=unused');
  async function connect(target) {
    await target.evaluate(async () => {
      const { openRepository } = await import('/lab/repository.mjs');
      window.checkRepository = await openRepository(indexedDB, 'critter-browser-concurrency');
    });
  }
  await connect(page);
  await connect(other);
  const request = await page.evaluate(async () => {
    const { sources } = await import('/lab/content.mjs');
    const { creationRequest } = await import('/lab/domain.mjs');
    for (const command of [{ type: 'receive' }, { type: 'start', sampleId: sources.probe.id, question: 'structure' }, { type: 'advance' }, { type: 'direction', direction: 'shape' }]) await checkRepository.execute(command);
    const request = creationRequest((await checkRepository.read()).envelope);
    await checkRepository.execute({ type: 'intent', id: 'BROWSER-OP', request });
    return request;
  });
  await Promise.all([page, other].map(target => target.evaluate(() => checkRepository.execute({ type: 'resolve', id: 'BROWSER-OP' }))));
  const committed = await page.evaluate(() => checkRepository.read());
  assert.equal(Object.keys(committed.envelope.collection).length, 1);
  const conflict = await other.evaluate(async request => {
    try { await checkRepository.execute({ type: 'intent', id: 'BROWSER-OP', request: { ...request, direction: 'different' } }); return false; }
    catch { return true; }
  }, request);
  assert.equal(conflict, true);
  assert.deepEqual(await page.evaluate(() => checkRepository.read()), committed);
  checks.push('Two real IndexedDB connections resolve once; conflicting transaction abort preserves committed state');
  const abortedWrite = await page.evaluate(async () => {
    const before = (await checkRepository.read()).envelope;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = originalPut.apply(this, args);
      this.transaction.abort();
      return request;
    };
    let rejected = false;
    try { await checkRepository.execute({ type: 'receive' }); } catch { rejected = true; }
    finally { IDBObjectStore.prototype.put = originalPut; }
    return { rejected, before, after: (await checkRepository.read()).envelope };
  });
  assert.equal(abortedWrite.rejected, true);
  assert.deepEqual(abortedWrite.after, abortedWrite.before);
  checks.push('Injected actual IndexedDB abort after queued put rejects adapter result and preserves envelope');
  // Start a second scenario and race genuinely different intents in separate tabs.
  for (const target of [page, other]) await target.evaluate(async () => {
    const { openRepository } = await import('/lab/repository.mjs');
    window.racingRepository = await openRepository(indexedDB, 'critter-browser-intents');
  });
  const racingRequest = await page.evaluate(async () => {
    const { sources } = await import('/lab/content.mjs');
    const { creationRequest } = await import('/lab/domain.mjs');
    for (const command of [{ type: 'console' }, { type: 'start', sampleId: sources.console.id, question: 'structure' }, { type: 'advance' }, { type: 'direction', direction: 'shape' }]) await racingRepository.execute(command);
    return creationRequest((await racingRepository.read()).envelope);
  });
  const contenders = await Promise.allSettled([page, other].map((target, index) => target.evaluate(({ request, index }) => racingRepository.execute({ type: 'intent', id: 'RACE-' + index, request }), { request: racingRequest, index })));
  assert.equal(contenders.filter(result => result.status === 'fulfilled').length, 1);
  const intents = (await page.evaluate(() => racingRepository.read())).envelope.operations;
  assert.equal(Object.keys(intents).length, 1);
  checks.push('Distinct competing intent IDs in two tabs produce one durable intent and one rejection');
  // Deliberately corrupt only this disposable browser test database.
  const corruption = await page.evaluate(async () => {
    await checkRepository.close();
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('critter-browser-concurrency');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve, reject) => {
      const tx = database.transaction('experiment', 'readwrite');
      const store = tx.objectStore('experiment'); const read = store.get('state');
      read.onsuccess = () => { const value = read.result; value.collection = {}; store.put(value, 'state'); };
      tx.oncomplete = resolve; tx.onabort = () => reject(tx.error);
    });
    database.close();
    const { openRepository } = await import('/lab/repository.mjs');
    window.checkRepository = await openRepository(indexedDB, 'critter-browser-concurrency');
    let rejected = false;
    try { await checkRepository.read(); } catch { rejected = true; }
    const raw = await new Promise((resolve, reject) => {
      const request = indexedDB.open('critter-browser-concurrency');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const read = database.transaction('experiment').objectStore('experiment').get('state');
        read.onsuccess = () => { resolve(read.result); database.close(); };
        read.onerror = () => reject(read.error);
      };
    });
    return rejected && Object.keys(raw.collection).length === 0 && raw.operations['BROWSER-OP'].status === 'committed';
  });
  assert.equal(corruption, true);
  checks.push('Actual IndexedDB rejects damaged current-version save without treating it as empty');
  assert.deepEqual(errors, []);
  const report = { browser: browser.version(), checks, limitations: ['No physical hardware or phone validation', 'Quota exhaustion not exercised', 'Baseline predates homecoming and revised higher-resolution UX'] };
  await writeFile(new URL('./artifacts/browser-validation.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
