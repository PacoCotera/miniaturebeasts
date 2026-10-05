import test from 'node:test';
import assert from 'node:assert/strict';

let scenarioId = 0;
async function withTransport(failDown, scenario, hook = () => undefined) {
  class Element extends EventTarget {
    constructor() { super(); this.textContent = ''; this.classList = { add() {}, remove() {} }; this.style = {}; }
    getBoundingClientRect() { return { left: 0, right: 100, top: 0, bottom: 100, width: 100, height: 100 }; }
    setPointerCapture() {}
    setAttribute(name, value) { this[name] = value; }
    querySelector() { return new Element(); }
    decode() { return Promise.resolve(); }
  }
  const elements = Object.fromEntries(['frame', 'status', 'release', 'up', 'down', 'left', 'right', 'research', 'critters', 'library', 'habitat', 'confirm', 'back'].map(name => [`#${name}`, new Element()]));
  for (const device of ['lab','companion','dock']) {
    for (const name of ['frame','status','up','down','left','right','research','critters','library','habitat','confirm','back']) {
      elements[`#${device}-${name}`] = device === 'lab' ? elements[`#${name}`] : new Element();
    }
  }
  for (const name of ['companion-link','dock-link','link-status']) elements[`#${name}`] = new Element();
  const document = new EventTarget();
  document.hidden = false;
  document.querySelector = selector => elements[selector];
  document.querySelectorAll = () => Object.entries(elements).filter(([name]) => !['#frame', '#status', '#release'].includes(name)).map(([, element]) => element);
  const requests = [];
  let heldInNative = false;
  let nativeRevision = 1;
  const state = () => ({ revision: nativeRevision, page: 'study', focus: 'start', ready: true, boundary: 'test transport' });
  const timers = [];
  const originals = Object.fromEntries(['document', 'window', 'Image', 'fetch', 'requestAnimationFrame', 'setInterval'].map(key => [key, globalThis[key]]));
  Object.assign(globalThis, {
    document,
    window: new EventTarget(),
    Image: Element,
    requestAnimationFrame: callback => queueMicrotask(callback),
    setInterval: callback => { timers.push(callback); return { unref() {} }; },
    fetch: async (url, options) => {
      if (url.includes('/lab/') || (options && JSON.parse(options.body).device === 'lab')) {
        const replacement = hook(url, options, state());
        if (replacement !== undefined) return replacement;
      }
      if (url.endsWith('/status')) return { ok: true, json: async () => state() };
      if (url.includes('/frame')) return { ok: true, status: 200, blob: async () => new Blob() };
      const input = JSON.parse(options.body);
      if (input.device !== 'lab') return { ok: true, json: async () => state() };
      requests.push(input.event);
      if (input.event === 'resume') ++nativeRevision;
      if (input.event === 'down-up' || input.event === 'up-up') ++nativeRevision;
      if (input.event === 'confirm-down' && failDown) {
        heldInNative = true;
        throw new Error('Response lost after native down');
      }
      if (input.event === 'cancel') heldInNative = false;
      return { ok: true, json: async () => state() };
    }
  });
  async function until(predicate) {
    for (let index = 0; index < 100 && !predicate(); ++index) await new Promise(resolve => setImmediate(resolve));
    assert(predicate(), 'Transport test did not reach its expected boundary');
  }
  const pointer = (type, pointerId = 1) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { button: 0, pointerId, clientX: 50, clientY: 50 });
    return event;
  };
  try {
    await import(`../presenter/app.js?scenario=${++scenarioId}`);
    await until(() => requests.includes('ready'));
    await scenario({ elements, pointer, requests, until, poll: () => timers[0](),
      advanceRevision: () => ++nativeRevision, heldInNative: () => heldInNative });
  } finally {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
}

test('lost down response cancels native hold and discards queued release', async () => {
  await withTransport(true, async ({ elements, pointer, requests, until, heldInNative }) => {
    elements['#confirm'].dispatchEvent(pointer('pointerdown'));
    elements['#confirm'].dispatchEvent(pointer('pointerup'));
    await until(() => requests.includes('cancel'));
    assert.equal(heldInNative(), false);
    assert(!requests.includes('confirm-up'), 'Queued release reached C after failed down response');
    const count = requests.length;
    elements['#confirm'].dispatchEvent(pointer('pointerdown'));
    elements['#confirm'].dispatchEvent(pointer('pointerup'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(requests.length, count, 'Input resumed without an explicit reload after failure');
    assert.match(elements['#status'].textContent, /activation stopped/);
  });
});

test('overlapping panel presses cancel every gesture until all pointers release', async () => {
  await withTransport(false, async ({ elements, pointer, requests, until }) => {
    elements['#research'].dispatchEvent(pointer('pointerdown', 1));
    elements['#confirm'].dispatchEvent(pointer('pointerdown', 2));
    elements['#library'].dispatchEvent(pointer('pointerdown', 3));
    elements['#research'].dispatchEvent(pointer('pointerup', 1));
    elements['#confirm'].dispatchEvent(pointer('pointerup', 2));
    elements['#library'].dispatchEvent(pointer('pointerup', 3));
    await until(() => requests.includes('cancel'));
    await new Promise(resolve => setImmediate(resolve));
    assert(!requests.includes('research-up'));
    assert(!requests.includes('confirm-down'));
    assert(!requests.includes('confirm-up'));
    assert(!requests.includes('library-down'));
    assert(!requests.includes('library-up'));
    elements['#down'].dispatchEvent(pointer('pointerdown', 4));
    elements['#down'].dispatchEvent(pointer('pointerup', 4));
    await until(() => requests.includes('down-up'));
  });
});

test('one delayed background poll cannot queue ahead of inputs or regress the frame', async () => {
  let delayPoll = false;
  let resolvePoll;
  let pollCount = 0;
  await withTransport(false, async ({ elements, pointer, requests, until, poll }) => {
    delayPoll = true;
    poll();
    await until(() => resolvePoll);
    for (let index = 0; index < 10; ++index) poll();
    elements['#down'].dispatchEvent(pointer('pointerdown'));
    elements['#down'].dispatchEvent(pointer('pointerup'));
    await until(() => requests.includes('down-up'));
    await until(() => elements['#frame']['data-visible-revision'] === '3');
    assert.equal(pollCount, 1);
    resolvePoll({ ok: true, json: async () => ({ revision: 2, focus: 'obsolete', transfer: '' }) });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements['#frame']['data-visible-revision'], '3');
    assert(!elements['#status'].textContent.includes('obsolete'));
  }, (url, options, state) => {
    if (delayPoll && url.endsWith('/status')) {
      ++pollCount;
      return new Promise(resolve => { resolvePoll = resolve; });
    }
  });
});

test('a stale frame rejection clears the sentinel and permits same-revision retry', async () => {
  let rejectNext = false;
  let rejected = false;
  await withTransport(false, async ({ elements, pointer, requests, until, poll }) => {
    rejectNext = true;
    elements['#down'].dispatchEvent(pointer('pointerdown'));
    elements['#down'].dispatchEvent(pointer('pointerup'));
    await until(() => rejected);
    await new Promise(resolve => setImmediate(resolve));
    poll();
    await until(() => elements['#frame']['data-visible-revision'] === '3');
    assert(requests.includes('ready'));
  }, url => {
    if (rejectNext && url.includes('/frame')) {
      rejectNext = false;
      rejected = true;
      return { ok: false, status: 409 };
    }
  });
});

test('blur discards an unsent release behind a delayed down acknowledgement', async () => {
  let resolveDown;
  await withTransport(false, async ({ elements, pointer, requests, until }) => {
    elements['#confirm'].dispatchEvent(pointer('pointerdown'));
    await until(() => resolveDown);
    elements['#confirm'].dispatchEvent(pointer('pointerup'));
    window.dispatchEvent(new Event('blur'));
    resolveDown();
    await until(() => requests.includes('suspend'));
    assert(!requests.includes('confirm-up'));
  }, (url, options, state) => {
    if (options && JSON.parse(options.body).event === 'confirm-down') {
      return new Promise(resolve => { resolveDown = () => resolve({ ok: true, json: async () => state }); });
    }
  });
});

test('time-only repaint permits a fresh painted gesture and fetches only the latest result', async () => {
  let delayFrame = false;
  let resolveFrame;
  let inputFrame;
  let frameRequests = [];
  await withTransport(false, async ({ elements, pointer, requests, until, poll, advanceRevision }) => {
    advanceRevision();
    delayFrame = true;
    poll();
    await until(() => resolveFrame);
    elements['#down'].dispatchEvent(pointer('pointerdown'));
    elements['#down'].dispatchEvent(pointer('pointerup'));
    await until(() => requests.includes('down-up'));
    assert.equal(inputFrame, 2, 'Gesture must carry painted revision, never status-only revision');
    assert.deepEqual(frameRequests, [3], 'Obsolete native view fetches must not overlap');
    delayFrame = false;
    resolveFrame({ ok: true, status: 200, blob: async () => new Blob() });
    await until(() => elements['#frame']['data-visible-revision'] === '4');
    assert.deepEqual(frameRequests, [3, 4]);
  }, (url, options) => {
    if (delayFrame && options && JSON.parse(options.body).event === 'down-down') {
      inputFrame = JSON.parse(options.body).revision;
    }
    if (url.includes('/frame') && (delayFrame || resolveFrame)) {
      frameRequests.push(Number(new URL(url, 'http://fixture').searchParams.get('revision')));
      if (delayFrame) return new Promise(resolve => { resolveFrame = resolve; });
    }
  });
});

test('painted readiness is prefixed only to a real down, never its release', async () => {
  const inputs = [];
  await withTransport(false, async ({ elements, pointer, requests, until }) => {
    elements['#down'].dispatchEvent(pointer('pointerdown'));
    elements['#down'].dispatchEvent(pointer('pointerup'));
    await until(() => requests.includes('down-up'));
    const down = inputs.find(input => input.event === 'down-down');
    const up = inputs.find(input => input.event === 'down-up');
    assert.equal(down.ready, true);
    assert.equal(down.revision, 2);
    assert.equal(up.revision, down.revision);
    assert(!Object.hasOwn(up, 'ready'));
  }, (url, options) => {
    if (options) inputs.push(JSON.parse(options.body));
  });
});
