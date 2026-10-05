import test from 'node:test';
import assert from 'node:assert/strict';

let scenario = 0;
async function exercise(resetLocally, acceptance = false) {
  const painted = [];
  class Element extends EventTarget {
    constructor() { super(); this.classList = { add() {}, remove() {} }; }
    setAttribute(name, value) {
      if (name === 'data-visible-revision') painted.push(`${this.selector}:${value}`);
    }
    setPointerCapture() {}
    getBoundingClientRect() { return { left: 0, right: 100, top: 0, bottom: 100 }; }
    decode() { return Promise.resolve(); }
  }
  const elements = new Map();
  const document = new EventTarget();
  document.hidden = false;
  document.querySelector = selector => {
    if (!elements.has(selector)) {
      const element = new Element();
      element.selector = selector;
      elements.set(selector, element);
    }
    return elements.get(selector);
  };
  const window = new EventTarget();
  let confirmations = 0;
  let reloads = 0;
  window.confirm = () => { ++confirmations; return true; };
  window.location = { reload() { ++reloads; } };
  const calls = [];
  const polls = [];
  let sandbox = 'a'.repeat(32);
  let finishDown;
  let accepted = false;
  let finishCompanionFrame;
  const originals = Object.fromEntries(['document', 'window', 'Image', 'fetch', 'requestAnimationFrame', 'setInterval'].map(key => [key, globalThis[key]]));
  const state = (device = 'lab') => ({ sandbox,
    revision: accepted && device !== 'dock' ? 2 : 1,
    phase: acceptance ? accepted ? 4 : 2 : undefined,
    haul: acceptance ? 'test-haul' : undefined,
    workspace: 0, focus: 'fresh', transfer: '' });
  Object.assign(globalThis, {
    document, window, Image: Element,
    requestAnimationFrame: callback => queueMicrotask(callback),
    setInterval: callback => { polls.push(callback); return { unref() {} }; },
    fetch: async (url, options) => {
      if (url === '/api/release') return { ok: false };
      if (url.endsWith('/status')) {
        const device = url.split('/')[3];
        return { ok: true, json: async () => state(device) };
      }
      if (url.includes('/frame')) {
        const frame = { ok: true, headers: { get: () => sandbox }, blob: async () => new Blob() };
        if (acceptance && url.includes('/companion/frame?revision=2'))
          return new Promise(resolve => { finishCompanionFrame = () => resolve(frame); });
        return frame;
      }
      const body = JSON.parse(options.body);
      calls.push({ url, ...body });
      if (!acceptance && body.device === 'lab' && body.event === 'confirm-down') {
        return new Promise(resolve => { finishDown = () => resolve({ ok: true, json: async () => ({ ...state(), sandbox: 'a'.repeat(32) }) }); });
      }
      if (acceptance && body.device === 'lab' && body.event === 'confirm-up') accepted = true;
      if (url === '/api/reset') {
        sandbox = 'b'.repeat(32);
        return { ok: true, json: async () => ({ sandbox, backup: 'world.reset-backup' }) };
      }
      return { ok: true, json: async () => state(body.device) };
    }
  });
  async function until(predicate) {
    for (let count = 0; count < 100 && !predicate(); ++count) await new Promise(resolve => setImmediate(resolve));
    assert(predicate(), 'Reset test did not reach expected boundary');
  }
  const pointer = type => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: 1, button: 0, clientX: 50, clientY: 50 });
    return event;
  };
  try {
    await import(`./app.js?resetScenario=${++scenario}`);
    await until(() => calls.some(call => call.device === 'lab' && call.event === 'ready'));
    const confirm = elements.get('#lab-confirm');
    confirm.dispatchEvent(pointer('pointerdown'));
    if (acceptance) {
      await until(() => calls.some(call => call.device === 'lab' && call.event === 'confirm-down'));
      confirm.dispatchEvent(pointer('pointerup'));
      await until(() => finishCompanionFrame);
      assert(!painted.includes('#lab-frame:2'), 'Lab accepted stock painted before Companion cleared');
      const companionConfirm = elements.get('#companion-confirm');
      companionConfirm.dispatchEvent(pointer('pointerdown'));
      companionConfirm.dispatchEvent(pointer('pointerup'));
      assert.match(elements.get('#companion-status').textContent, /Input not applied/);
      finishCompanionFrame();
      await until(() => painted.includes('#lab-frame:2'));
      assert(painted.indexOf('#companion-frame:2') < painted.indexOf('#lab-frame:2'));
      assert(!calls.some(call => call.device === 'companion' && call.event === 'confirm-down'));
      await new Promise(resolve => setImmediate(resolve));
      companionConfirm.dispatchEvent(pointer('pointerdown'));
      companionConfirm.dispatchEvent(pointer('pointerup'));
      await until(() => calls.some(call => call.device === 'companion' && call.event === 'confirm-up'));
      assert.equal(calls.filter(call => call.device === 'companion' && call.event === 'confirm-up').length, 1);
      return;
    }
    await until(() => finishDown);
    confirm.dispatchEvent(pointer('pointerup')); // Release queued behind old down.
    if (resetLocally) {
      elements.get('#reset-sandbox').dispatchEvent(new Event('click'));
      elements.get('#reset-sandbox').dispatchEvent(new Event('click'));
    } else {
      sandbox = 'b'.repeat(32); // A separate client replaced the native world.
      polls[1]();
    }
    await until(() => reloads === 1);
    finishDown();
    await new Promise(resolve => setImmediate(resolve));
    assert(!calls.some(call => call.event === 'confirm-up'), 'Old queued release escaped into fresh world');
    confirm.dispatchEvent(pointer('pointerdown'));
    confirm.dispatchEvent(pointer('pointerup'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.filter(call => call.event === 'confirm-down').length, 1);
    assert.equal(calls.filter(call => call.url === '/api/reset').length, resetLocally ? 1 : 0);
    assert.equal(confirmations, resetLocally ? 1 : 0);
    assert.equal(reloads, 1);
    if (resetLocally) assert.equal(elements.get('#reset-sandbox').disabled, true);
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
}

test('confirmed reset discards held/queued input and prevents duplicate reset', async () => exercise(true));
test('another browser reset discards this client input and reconnects without resetting again', async () => exercise(false));
test('accepted Lab stock waits for cleared Companion frame; consumed press never queues', async () => exercise(false, true));
