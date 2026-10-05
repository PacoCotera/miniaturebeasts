import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { generatedFixtures } from '../transfer/browser/generate.mjs';
import { createPresentation, updatePresentation } from '../transfer/presentation-controller.mjs';
import { mapPresentation } from '../transfer/presentation-view.mjs';
import { validateObservation } from '../transfer/presentation-data.mjs';
import { renderTransfer, slots, wrap } from '../transfer/browser/render.mjs';
import { glyph, supported } from '../transfer/browser/font.mjs';
import { createInputGate } from '../transfer/browser/input.mjs';
import { createPrototypeServer } from '../server.mjs';

const fixtures = generatedFixtures();
function stateFor(name) {
  const context = name.startsWith('preview') ? 'preview' : name === 'requested' ? 'requested' : 'neutral';
  let state = createPresentation({ instanceId: 'test', key: fixtures.key, context, caller: 'collection' });
  for (const step of ['unavailable', 'unreadable'].includes(name) ? ['confirmed', name] : [name]) {
    const request = updatePresentation(state, { type: 'refresh' });
    state = updatePresentation(request.state, { type: 'observe', key: fixtures.key, requestToken: request.state.requestToken, observation: fixtures.observations[step] }).state;
  }
  return state;
}

test('generated lab-only observations are deterministic, supported and match checked-in fixture', async () => {
  assert.deepEqual(generatedFixtures(), fixtures);
  const saved = JSON.parse(await readFile(new URL('../transfer/browser/observations.json', import.meta.url), 'utf8'));
  assert.deepEqual(saved, fixtures);
  Object.values(saved.observations).forEach(validateObservation);
  assert.equal(saved.key.transferId.length, 64);
  assert.match(saved.key.transferId, /[a-z].*[A-Z]/);
});

test('all states/pages/caller render deterministic native indexed pixels with full glyph coverage', () => {
  for (const name of Object.keys(fixtures.observations)) {
    let state = stateFor(name);
    const frames = [mapPresentation(state)];
    if (frames[0].actions.some(action => action.id === 'details')) {
      state = updatePresentation(state, { type: 'action', action: 'details', revision: state.revision, key: state.key }).state;
      while (true) {
        const view = mapPresentation(state);
        frames.push(view);
        if (!view.actions.some(action => action.id === 'next' && action.enabled)) break;
        state = updatePresentation(state, { type: 'action', action: 'next', revision: state.revision, key: state.key }).state;
      }
    }
    for (const view of frames) {
      for (const profile of ['color', 'mono']) {
        for (const caller of [false, true]) {
          const frame = renderTransfer(view, profile, caller);
          assert.equal(frame.pixels.length, 307200);
          assert.deepEqual(frame.pixels, renderTransfer(view, profile, caller).pixels);
          assert.ok(frame.pixels.every(value => value < frame.palette.length));
          for (const item of frame.texts) {
            assert.ok([...item.value].every(supported), item.value);
            assert.ok(item.x + item.value.length * 12 <= 640);
            assert.ok(item.y + 14 <= 480);
          }
        }
      }
    }
    if (frames.length > 1 && name !== 'unreadable') {
      const firstDetails = renderTransfer(frames[1]);
      const chunks = firstDetails.texts.filter(item => item.y === 110 || item.y === 132).map(item => item.value).join('');
      assert.equal(chunks, fixtures.key.transferId, '64-character identity must retain every case-sensitive character');
    }
  }
});

test('fixed slots, lossless wrapping, lowercase and unsupported glyph behavior remain explicit', () => {
  const confirmed = mapPresentation(stateFor('confirmed'));
  assert.deepEqual(slots(confirmed).map(action => action?.id ?? null), ['back', null, 'details']);
  assert.deepEqual(slots(confirmed, true).map(action => action?.id ?? null), [null, 'reenter', null]);
  assert.equal(wrap(fixtures.key.transferId, 32).join(''), fixtures.key.transferId);
  assert.notDeepEqual(glyph('a'), glyph('A'));
  assert.equal(supported('λ'), false);
  assert.deepEqual(glyph('λ'), glyph('☃'));
  assert.throws(() => renderTransfer({ ...confirmed, explanation: 'Word '.repeat(90) }), /overflows/);
  for (const [samples, resourceLots, expected] of [[1, 1, '1 sample / 1 supply lot'], [0, 2, '0 samples / 2 supply lots'], [2, 1, '2 samples / 1 supply lot']]) {
    const summary = { label: 'Recorded haul', samples, resourceLots };
    const frame = renderTransfer({ ...confirmed, summary, lastKnown: { label: 'Last confirmed status', status: 'confirmed', summary } });
    assert.ok(frame.texts.some(item => item.y === 288 && item.value === expected));
    assert.ok(frame.texts.some(item => item.y === 370 && item.value === expected + ' in this haul'));
  }
});

test('whole-gesture gate rejects stale readiness, held/blocked repeats and suspended input', () => {
  const gate = createInputGate();
  gate.request(1);
  assert.equal(gate.down('key:Enter', { keyboard: true }), false);
  gate.ready(1);
  assert.equal(gate.down('key:Enter', { keyboard: true, repeat: true }), false);
  gate.up('key:Enter');
  assert.equal(gate.down('key:Enter', { keyboard: true }), true);
  gate.request(2);
  gate.ready(1);
  assert.equal(gate.isReady(), false);
  assert.equal(gate.down('key:Escape', { keyboard: true, back: true }), true);
  gate.suspend();
  gate.ready(2);
  gate.resume();
  assert.equal(gate.down('key:Enter', { keyboard: true, repeat: true }), false);
  assert.equal(gate.down('key:Enter', { keyboard: true }), true, 'fresh nonrepeat recovers lost outside keyup');
  assert.equal(gate.down('pointer:1'), true);
  gate.suspend();
  gate.resume();
  assert.equal(gate.down('pointer:1'), true, 'cancelled pointer token does not swallow next fresh press');
});

test('explicit server closure serves only browser modules/data, rejects tools and mutation methods', async t => {
  const server = createPrototypeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const seen = new Set();
  async function inspect(path) {
    if (seen.has(path)) return;
    seen.add(path);
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const source = await response.text();
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('.'), 'No Node/external imports: ' + match[1]);
      await inspect(new URL(match[1], origin + path).pathname);
    }
  }
  await inspect('/transfer/browser/host.mjs');
  for (const path of ['/transfer/', '/transfer/browser/style.css', '/transfer/browser/observations.json']) {
    assert.equal((await fetch(origin + path)).status, 200);
    const head = await fetch(origin + path, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
    assert.equal((await fetch(origin + path, { method: 'POST' })).status, 405);
  }
  for (const path of ['/transfer/browser/generate.mjs', '/transfer/browser/browser-check.mjs', '/transfer/presentation-host.mjs', '/transfer/repository.mjs', '/transfer/lab.mjs', '/transfer/probe.json', '/transfer/browser/../manifest.mjs']) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
});
