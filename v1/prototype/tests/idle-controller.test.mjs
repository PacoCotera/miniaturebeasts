import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdleController } from '../idle-controller.mjs';

function fakeClock() {
  let now = 0;
  let nextId = 0;
  const jobs = new Map();
  const canceled = [];
  return {
    schedule(callback, delay) {
      const id = ++nextId;
      jobs.set(id, { callback, at: now + delay });
      return id;
    },
    cancel(id) {
      if (jobs.has(id)) canceled.push(jobs.get(id).callback);
      jobs.delete(id);
    },
    runCanceled() {
      for (const callback of canceled.splice(0)) callback();
    },
    advance(milliseconds) {
      const until = now + milliseconds;
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > until) break;
        const [id, job] = next;
        now = job.at;
        jobs.delete(id);
        job.callback();
      }
      now = until;
    },
    get pending() {
      return jobs.size;
    },
  };
}

function setup() {
  const clock = fakeClock();
  const changes = [];
  const idle = createIdleController({
    schedule: clock.schedule,
    cancel: clock.cancel,
    onChange: state => changes.push(state),
  });
  return { idle, clock, changes };
}

test('manual entry cycles every 12 seconds; repeated entry does not duplicate timers', () => {
  const { idle, clock } = setup();
  clock.advance(60000);
  assert.equal(idle.snapshot().running, false);
  assert.equal(clock.pending, 0);
  idle.enter();
  idle.enter();
  assert.equal(clock.pending, 1);
  clock.advance(11999);
  assert.equal(idle.snapshot().index, 0);
  clock.advance(1);
  assert.equal(idle.snapshot().index, 1);
  clock.advance(24000);
  assert.equal(idle.snapshot().index, 0);
  idle.exit();
  assert.equal(clock.pending, 0);
});

test('hidden pages pause; becoming visible starts one fresh interval without catch-up', () => {
  const { idle, clock } = setup();
  idle.enter();
  clock.advance(12000);
  idle.setHidden(true);
  assert.equal(clock.pending, 0);
  clock.advance(60000);
  assert.equal(idle.snapshot().index, 1);
  idle.setHidden(false);
  idle.setHidden(false);
  assert.equal(clock.pending, 1);
  clock.advance(11999);
  assert.equal(idle.snapshot().index, 1);
  clock.advance(1);
  assert.equal(idle.snapshot().index, 2);
});

test('Escape and arrows wake even on the toggle; repeats consumed until matching keyup', () => {
  const { idle } = setup();
  for (const key of ['Escape', 'ArrowLeft', 'ArrowRight']) {
    idle.enter();
    assert.equal(idle.keyDown({ key, onToggle: true }), true);
    assert.equal(idle.snapshot().running, false);
    assert.equal(idle.keyDown({ key, repeat: true, onToggle: true }), true);
    assert.equal(idle.keyUp({ key: 'Shift' }), false);
    assert.equal(idle.keyDown({ key, repeat: true }), true);
    assert.equal(idle.keyUp({ key }), true);
    assert.equal(idle.keyDown({ key }), false);
  }
});

test('Enter/Space wake gestures cannot activate controls, but fresh toggle activation works', () => {
  const { idle } = setup();
  for (const key of ['Enter', ' ']) {
    idle.enter();
    assert.equal(idle.keyDown({ key, onToggle: false }), true);
    assert.equal(idle.click({ pointerOrigin: false }), true);
    assert.equal(idle.keyDown({ key, repeat: true, onToggle: true }), true);
    // The adapter cancels this keyup too, preventing native Space activation.
    assert.equal(idle.keyUp({ key }), true);
    assert.equal(idle.keyDown({ key, onToggle: true }), false);
    assert.equal(idle.click({ pointerOrigin: false }), false);
    idle.toggle();
    assert.equal(idle.snapshot().running, true);
    assert.equal(idle.keyDown({ key, onToggle: true }), false);
    assert.equal(idle.click({ pointerOrigin: false }), false);
    idle.toggle();
    assert.equal(idle.snapshot().running, false);
  }
});

test('wake pointer click is consumed; cancel and fresh pointer/keyboard gestures remain usable', () => {
  const { idle } = setup();
  idle.enter();
  assert.equal(idle.pointerDown({ pointerId: 1 }), true);
  assert.equal(idle.snapshot().running, false);
  assert.equal(idle.click({ pointerId: 1, pointerOrigin: true }), true);
  assert.equal(idle.click({ pointerId: 1, pointerOrigin: true }), false);

  idle.enter();
  idle.pointerDown({ pointerId: 2 });
  idle.pointerCancel({ pointerId: 2 });
  assert.equal(idle.click({ pointerOrigin: false }), false);
  assert.equal(idle.keyDown({ key: 'Enter', onToggle: true }), false);
  assert.equal(idle.pointerDown({ pointerId: 3 }), false);
  assert.equal(idle.click({ pointerId: 3, pointerOrigin: true }), false);
});

test('automatic entry is opt-in and repeated enable keeps one 30-second deadline', () => {
  const { idle, clock } = setup();
  assert.equal(idle.snapshot().automaticEnabled, false);
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  idle.setAutomatic(true);
  clock.advance(10000);
  idle.setAutomatic(true);
  assert.equal(clock.pending, 1);
  clock.advance(19999);
  assert.equal(idle.snapshot().running, false);
  clock.advance(1);
  assert.equal(idle.snapshot().running, true);
  assert.equal(idle.snapshot().index, 0);
  clock.advance(12000);
  assert.equal(idle.snapshot().index, 1);
});

test('active activity resets entry and obsolete callbacks cannot enter early', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  clock.advance(29000);
  idle.activity();
  clock.runCanceled();
  assert.equal(idle.snapshot().running, false);
  clock.advance(29999);
  assert.equal(idle.snapshot().running, false);
  clock.advance(1);
  assert.equal(idle.snapshot().running, true);
  idle.activity();
  clock.advance(12000);
  assert.equal(idle.snapshot().index, 1, 'movement while idle neither wakes nor delays cycling');
});

test('disabling automatic entry cancels its timer without stopping a manual cycle', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  idle.setAutomatic(false);
  clock.runCanceled();
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  assert.equal(clock.pending, 0);
  idle.enter();
  idle.setAutomatic(true);
  idle.setAutomatic(false);
  clock.advance(12000);
  assert.equal(idle.snapshot().running, true);
  assert.equal(idle.snapshot().index, 1);
  idle.exit();
  assert.equal(clock.pending, 0);
});

test('hidden and blurred active pages cancel entry and resume a full fresh interval', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  clock.advance(29000);
  idle.setHidden(true);
  clock.runCanceled();
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  idle.setHidden(false);
  clock.advance(29000);
  idle.setFocused(false);
  clock.runCanceled();
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  idle.setFocused(true);
  clock.advance(29999);
  assert.equal(idle.snapshot().running, false);
  clock.advance(1);
  assert.equal(idle.snapshot().running, true);
});

test('held keys and pointers defer entry until all are released or canceled', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  clock.advance(29000);
  idle.keyDown({ key: 'a', code: 'KeyA' });
  idle.pointerDown({ pointerId: 4 });
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  assert.equal(clock.pending, 0);
  idle.keyUp({ key: 'a', code: 'KeyA' });
  assert.equal(clock.pending, 0);
  idle.pointerUp({ pointerId: 4 });
  clock.advance(29999);
  assert.equal(idle.snapshot().running, false);
  idle.pointerDown({ pointerId: 5 });
  idle.pointerCancel({ pointerId: 5 });
  clock.advance(30000);
  assert.equal(idle.snapshot().running, true);
});

test('consumed wake and held repeats rearm auto entry only after release', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  clock.advance(30000);
  assert.equal(idle.keyDown({ key: 'Escape' }), true);
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  assert.equal(idle.keyDown({ key: 'Escape', repeat: true }), true);
  assert.equal(idle.keyUp({ key: 'Escape' }), true);
  clock.advance(30000);
  assert.equal(idle.snapshot().running, true);
  assert.equal(idle.pointerDown({ pointerId: 8 }), true);
  clock.advance(90000);
  assert.equal(idle.snapshot().running, false);
  idle.pointerUp({ pointerId: 8 });
  assert.equal(idle.click({ pointerId: 8, pointerOrigin: true }), true);
  clock.advance(30000);
  assert.equal(idle.snapshot().running, true);
});

test('visibility loss clears lost releases and wake suppression without trapping input', () => {
  const { idle, clock } = setup();
  idle.setAutomatic(true);
  idle.enter();
  idle.keyDown({ key: 'Enter' });
  idle.pointerDown({ pointerId: 9 });
  idle.setHidden(true);
  idle.setFocused(false);
  idle.setHidden(false);
  assert.equal(clock.pending, 0, 'still unfocused');
  idle.setFocused(true);
  assert.equal(idle.click({ pointerOrigin: false }), false);
  assert.equal(idle.keyUp({ key: 'Enter' }), false);
  clock.advance(30000);
  assert.equal(idle.snapshot().running, true);
  idle.setFocused(false);
  clock.advance(90000);
  assert.equal(idle.snapshot().index, 0);
  idle.setFocused(true);
  clock.advance(12000);
  assert.equal(idle.snapshot().index, 1);
});
