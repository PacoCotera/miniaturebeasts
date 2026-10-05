import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, unlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeManifest, message } from '../transfer/manifest.mjs';
import { initialLab, transitionLab } from '../transfer/lab.mjs';
import { initialProbe } from '../transfer/probe.mjs';
import { simulator } from '../transfer/simulator.mjs';
import { firstCargo } from '../transfer/fixtures.mjs';
import { projectLabObservation } from '../transfer/presentation-host.mjs';
import { createPresentation, updatePresentation } from '../transfer/presentation-controller.mjs';
import { mapPresentation } from '../transfer/presentation-view.mjs';

const manifest = makeManifest('HAUL_A', 'PROBE', 'LAB', firstCargo);
const key = { labId: 'LAB', transferId: manifest.transferId, source: manifest.source, destination: manifest.destination, digest: manifest.digest };
const capability = { key, allowed: true };

function snapshot(status, revision = 1) {
  let lab = initialLab('LAB');
  if (status !== 'absent') lab = transitionLab(lab, { type: 'receive', message: message('offer', manifest) }).state;
  if (status === 'confirmed') lab = transitionLab(lab, { type: 'receive', message: message('cleared', manifest) }).state;
  lab.revision = revision;
  return lab;
}

function project(status, { revision = 1, context = 'neutral', canCheck = true, selected = key, preview = null } = {}) {
  const read = ['unavailable', 'unreadable'].includes(status) ? { kind: status } : { kind: 'valid', snapshot: snapshot(status, revision) };
  return projectLabObservation({ key: selected, context, read, manifest: preview, capability: canCheck ? { key: selected, allowed: true } : null });
}

function initial(context = 'neutral') {
  return createPresentation({ instanceId: 'SESSION_A', key, context, caller: 'collection' });
}

function observe(state, observation) {
  const requested = updatePresentation(state, { type: 'refresh' });
  return updatePresentation(requested.state, { type: 'observe', key: state.key, requestToken: requested.effects[0].requestToken, observation }).state;
}

function action(state, name) {
  return updatePresentation(state, { type: 'action', action: name, revision: state.revision, key: state.key });
}

test('receipt absence stays unknown; requested and read-only preview require explicit context', () => {
  const neutral = observe(initial(), project('absent'));
  assert.equal(mapPresentation(neutral).status, 'absent');
  assert.equal(mapPresentation(neutral).summary, null);
  const requested = observe(initial('requested'), project('absent', { context: 'requested' }));
  assert.equal(mapPresentation(requested).status, 'requested');
  assert.equal(requested.focus, 'reconcile');
  const preview = observe(initial('preview'), project('absent', { context: 'preview', preview: manifest }));
  assert.equal(mapPresentation(preview).status, 'preview');
  assert.equal(mapPresentation(preview).summary.samples, 2);
  assert.deepEqual(mapPresentation(preview).actions.map(item => item.id), ['back', 'details']);
  const unavailable = observe(initial('preview'), project('absent', { context: 'preview' }));
  assert.equal(mapPresentation(unavailable).status, 'preview-unavailable');
  assert.equal(mapPresentation(unavailable).summary, null);
  assert.deepEqual(mapPresentation(unavailable).actions.map(item => item.id), ['back']);
});

test('pending and confirmed counts are historical haul facts, with no remote-empty or next-step authority', () => {
  const pending = observe(initial(), project('pending'));
  assert.equal(mapPresentation(pending).status, 'pending');
  assert.equal(mapPresentation(pending).summary.label, 'Recorded haul');
  const confirmed = observe(pending, project('confirmed', { revision: 2 }));
  const view = mapPresentation(confirmed);
  assert.equal(view.status, 'confirmed');
  assert.equal(view.focus, 'back', 'background progress falls back, never steals focus');
  assert.deepEqual(view.actions.map(item => item.id), ['back', 'details']);
  assert.doesNotMatch(JSON.stringify(view), /probe empty|ready to gather|open sample|current inventory/i);
  assert.equal(observe(initial(), project('confirmed')).focus, 'details');
});

test('unavailable reads retain labeled last-known facts; unreadable inputs never permit reconciliation', () => {
  let state = observe(initial(), project('pending'));
  state = observe(state, project('unavailable'));
  assert.equal(mapPresentation(state).status, 'unavailable');
  assert.equal(mapPresentation(state).summary, null);
  assert.equal(mapPresentation(state).lastKnown.label, 'Last confirmed status');
  assert.equal(action(state, 'reconcile').effects[0].type, 'reconcile');
  state = observe(state, project('unavailable', { canCheck: false }));
  assert.equal(action(state, 'reconcile').effects.length, 0);
  assert.doesNotMatch(mapPresentation(state).explanation, /try checking again/);
  state = observe(state, project('unreadable'));
  assert.equal(mapPresentation(state).lastKnown.status, 'pending');
  assert.equal(action(state, 'reconcile').effects.length, 0);
  const details = action(state, 'details').state;
  assert.equal(mapPresentation(details).details.rows.length, 1);
  assert.equal(mapPresentation(details).details.rows[0].value, 'This transfer record could not be read.');
});

test('projection rejects cross-key capabilities, malformed records and contradictory selected identities', () => {
  for (const field of ['labId', 'source', 'destination', 'transferId', 'digest']) {
    const changed = { ...key, [field]: field === 'digest' ? 'f'.repeat(64) : 'OTHER' };
    const result = projectLabObservation({ key, context: 'neutral', read: { kind: 'valid', snapshot: snapshot('pending') }, capability: { key: changed, allowed: true } });
    assert.equal(result.kind, 'unreadable');
    assert.equal(result.canReconcile, false);
  }
  const selected = { ...key, source: 'OTHER' };
  assert.equal(project('pending', { selected }).kind, 'unreadable');
  const corrupt = snapshot('pending');
  corrupt.inventory.samples = [];
  const rejected = projectLabObservation({ key, context: 'neutral', read: { kind: 'valid', snapshot: corrupt }, capability });
  assert.equal(rejected.kind, 'unreadable');
  assert.equal(rejected.facts, null);
  assert.doesNotMatch(JSON.stringify(rejected), /stack|mismatch|samples/);
});

test('older success cannot regress; equal conflict and newer receipt disappearance become unreadable', () => {
  const pending = observe(initial(), project('pending', { revision: 4 }));
  const older = observe(pending, project('absent', { revision: 3 }));
  assert.equal(mapPresentation(older).status, 'pending');
  for (const revision of [4, 5]) {
    const conflicting = observe(pending, project('absent', { revision }));
    assert.equal(mapPresentation(conflicting).status, 'unreadable');
    assert.equal(conflicting.lastKnown.labRevision, 4);
  }
  const confirmed = observe(pending, project('confirmed', { revision: 5 }));
  const regression = observe(confirmed, project('pending', { revision: 6 }));
  assert.equal(mapPresentation(regression).status, 'unreadable');
  assert.equal(regression.lastKnown.status, 'confirmed');
  const unrelated = observe(confirmed, project('confirmed', { revision: 9 }));
  assert.equal(mapPresentation(unrelated).status, 'confirmed');
  assert.equal(unrelated.lastKnown.labRevision, 9);
});

test('superseded success and errors cannot clear new loading across A-B-A and Back/reentry', () => {
  let state = initial();
  const first = updatePresentation(state, { type: 'refresh' });
  const oldToken = first.effects[0].requestToken;
  const other = { ...key, transferId: 'HAUL_B', digest: 'b'.repeat(64) };
  state = updatePresentation(first.state, { type: 'select', key: other, context: 'neutral', caller: 'history' }).state;
  state = updatePresentation(state, { type: 'select', key, context: 'neutral', caller: 'history' }).state;
  for (const observation of [project('confirmed'), project('unavailable'), project('unreadable')]) {
    const ignored = updatePresentation(state, { type: 'observe', key, requestToken: oldToken, observation });
    assert.deepEqual(ignored.state, state);
    assert.equal(ignored.state.loading, true);
  }
  const hidden = action(state, 'back');
  assert.equal(hidden.effects[0].type, 'navigate-back');
  const reopened = updatePresentation(hidden.state, { type: 'select', key, context: 'neutral', caller: 'history' });
  assert.notEqual(reopened.state.requestToken, state.requestToken);
  assert.deepEqual(updatePresentation(reopened.state, { type: 'observe', key, requestToken: state.requestToken, observation: project('confirmed') }).state, reopened.state);
});

test('observations require a live non-null request token, including after completion', () => {
  const empty = initial();
  assert.deepEqual(updatePresentation(empty, { type: 'observe', key, requestToken: null, observation: project('confirmed') }).state, empty);
  const requested = updatePresentation(empty, { type: 'refresh' });
  const event = { type: 'observe', key, requestToken: requested.state.requestToken, observation: project('pending') };
  const accepted = updatePresentation(requested.state, event).state;
  assert.equal(accepted.requestToken, null);
  assert.deepEqual(updatePresentation(accepted, event).state, accepted);
  assert.deepEqual(updatePresentation(accepted, { ...event, requestToken: null, observation: project('confirmed') }).state, accepted);
});

test('reentry and older results do not deny storage established by retained receipt history', () => {
  for (const context of ['neutral', 'requested']) {
    const known = observe(initial(), project('confirmed', { revision: 5 }));
    const selected = updatePresentation(known, { type: 'select', key, context, caller: 'history' });
    assert.equal(mapPresentation(selected.state).status, 'unavailable');
    assert.equal(mapPresentation(selected.state).lastKnown.status, 'confirmed');
    const result = updatePresentation(selected.state, {
      type: 'observe', key, requestToken: selected.state.requestToken,
      observation: project('absent', { revision: 4, context }),
    });
    const view = mapPresentation(result.state);
    assert.equal(view.status, 'unavailable');
    assert.equal(view.lastKnown.status, 'confirmed');
    assert.doesNotMatch(view.explanation, /no confirmed result|not confirmed storage/);
  }
});

test('same selected digest cannot change preview cargo, while manifest availability is independent of lab revision', () => {
  const unavailable = observe(initial('preview'), project('absent', { context: 'preview' }));
  const available = observe(unavailable, project('absent', { context: 'preview', preview: manifest }));
  assert.equal(mapPresentation(available).status, 'preview');
  const contradictory = structuredClone(project('absent', { context: 'preview', preview: manifest }));
  contradictory.facts.cargo.samples[0].id = 'OTHER';
  const rejected = observe(available, contradictory);
  assert.equal(mapPresentation(rejected).status, 'unreadable');
  assert.equal(rejected.lastKnown.cargo.samples[0].id, 'SAMPLE_A');
  const lostPreview = observe(available, project('absent', { context: 'preview' }));
  assert.equal(mapPresentation(lostPreview).status, 'preview-unavailable');
  const laterConflict = observe(lostPreview, contradictory);
  assert.equal(mapPresentation(laterConflict).status, 'unreadable');
  assert.equal(laterConflict.knownManifestCargo.samples[0].id, 'SAMPLE_A');
  const validAgain = observe(lostPreview, project('absent', { context: 'preview', preview: manifest }));
  assert.equal(mapPresentation(validAgain).status, 'preview');
});

test('preview loss while inspecting retains a bounded unavailable Details page', () => {
  const available = observe(initial('preview'), project('absent', { context: 'preview', preview: manifest }));
  const details = action(available, 'details').state;
  const lost = observe(details, project('absent', { context: 'preview' }));
  const view = mapPresentation(lost);
  assert.equal(lost.page, 'details');
  assert.equal(view.details.page, 1);
  assert.equal(view.details.total, 1);
  assert.equal(view.details.rows[0].value, 'The haul list is not available right now.');
  assert.equal(view.focus, 'back');
  assert.ok(view.actions.filter(item => item.id !== 'back').every(item => !item.enabled));
  const restored = observe(lost, project('absent', { context: 'preview', preview: manifest }));
  assert.equal(restored.page, 'details');
  assert.equal(restored.focus, 'back');
  assert.ok(mapPresentation(restored).details.total > 1);
  const other = updatePresentation(restored, { type: 'select', key: { ...key, transferId: 'HAUL_B', digest: 'b'.repeat(64) }, context: 'neutral', caller: 'history' });
  assert.equal(other.state.knownManifestCargo, null);
  assert.equal(action(lost, 'back').state.page, 'status');
});

test('same-key reconcile is coalesced; stale, disabled and unsupported semantic commands emit nothing', () => {
  const state = observe(initial(), project('pending'));
  const requested = action(state, 'reconcile');
  assert.equal(requested.effects[0].type, 'reconcile');
  assert.deepEqual(requested.effects[0].key, key);
  assert.equal(mapPresentation(requested.state).actions.find(item => item.id === 'reconcile').enabled, false);
  assert.equal(action(requested.state, 'reconcile').effects.length, 0);
  assert.equal(updatePresentation(requested.state, { type: 'action', action: 'reconcile', key, revision: state.revision }).effects.length, 0);
  for (const name of ['start', 'transfer', 'open', 'cancel', 'reset']) assert.equal(action(state, name).effects.length, 0);
  const supplied = structuredClone(project('pending'));
  const copied = observe(initial(), supplied);
  supplied.facts.cargo.samples[0].id = 'MUTATED';
  supplied.canReconcile = false;
  assert.notEqual(copied.lastKnown.cargo.samples[0].id, 'MUTATED');
  assert.equal(mapPresentation(copied).actions.find(item => item.id === 'reconcile').enabled, true);
});

test('Details preserves identities on bounded pages and Back returns to latest state without navigation effects', () => {
  let state = observe(initial(), project('pending'));
  state = updatePresentation(state, { type: 'focus', action: 'details', key, revision: state.revision }).state;
  const entered = action(state, 'details');
  assert.equal(entered.effects.length, 0);
  state = entered.state;
  const rows = [];
  while (true) {
    const view = mapPresentation(state);
    assert.ok(view.details.rows.length <= 4);
    rows.push(...view.details.rows);
    if (!view.actions.find(item => item.id === 'next').enabled) break;
    state = action(state, 'next').state;
  }
  assert.equal(rows.find(item => item.label === 'Haul').value, key.transferId);
  assert.deepEqual(rows.filter(item => item.label === 'Sample').map(item => item.value), ['SAMPLE_A', 'SAMPLE_B']);
  const page = state.detailPage;
  state = observe(state, project('confirmed', { revision: 2 }));
  assert.equal(state.page, 'details');
  assert.equal(state.detailPage, page);
  const back = action(state, 'back');
  assert.equal(back.effects.length, 0);
  assert.equal(back.state.page, 'status');
  assert.equal(back.state.focus, 'details');
  assert.equal(mapPresentation(back.state).status, 'confirmed');
});

test('host projection reads real saved lab facts with probe repository unavailable', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'critter-presentation-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const probePath = join(directory, 'probe.json');
  const labPath = join(directory, 'lab.json');
  const session = simulator(probePath, labPath);
  await session.probeStore.create(initialProbe('PROBE', firstCargo, ['TRIP_A']));
  await session.labStore.create(initialLab('LAB'));
  await session.act({ type: 'seal', transferId: 'HAUL_A', destination: 'LAB' });
  await session.drain();
  await unlink(probePath);
  const lab = await session.labStore.read();
  const observation = projectLabObservation({ key, context: 'neutral', read: { kind: 'valid', snapshot: lab }, capability });
  assert.equal(observation.facts.status, 'confirmed');
  assert.equal(observation.canReconcile, false);
  const view = mapPresentation(observe(initial(), observation));
  assert.equal(view.summary.label, 'Recorded haul');
  assert.equal(view.status, 'confirmed');
});

test('pure controller/mapper dependency graph has no Node/browser dependencies and mapper rejects malformed facts', async () => {
  for (const file of ['presentation-data.mjs', 'presentation-controller.mjs', 'presentation-view.mjs']) {
    const source = await readFile(new URL('../transfer/' + file, import.meta.url), 'utf8');
    for (const dependency of source.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(['./presentation-data.mjs', './presentation-view.mjs'].includes(dependency[1]), dependency[1]);
    }
    assert.doesNotMatch(source, /\b(?:window|document|fetch|indexedDB)\b/);
  }
  const state = initial();
  state.observation = { kind: 'valid', facts: { status: 'confirmed' } };
  assert.throws(() => mapPresentation(state));
});
