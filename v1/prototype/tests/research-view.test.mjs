import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast, RULESET_VERSION } from '../genetics.mjs';
import { createInitialState, developSample, createBreeding, hatch, serializeState, restoreState } from '../store.mjs';
import { getResearchFinding } from '../research-view.mjs';

function consumedFixture() {
  const ready = developSample(createInitialState());
  return createBreeding(ready, {
    eventId: 'research-finding-event',
    seed: 'research-finding-seed',
    sampleId: ready.samples[0].id,
  });
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test('no research means no finding, including breeding without a sample', () => {
  const initial = createInitialState();
  assert.equal(getResearchFinding(initial), null);
  const incubating = createBreeding(initial, { eventId: 'no-sample', seed: 'no-sample' });
  assert.equal(getResearchFinding(hatch(incubating, 'no-sample')), null);
});

test('ready finding uses saved evidence and domain forecasts for current parents', () => {
  const state = developSample(createInitialState());
  const finding = getResearchFinding(state);
  assert.equal(finding.evidence, state.samples[0].evidence);
  assert.equal(finding.origin, state.samples[0].origin);
  assert.equal(finding.status, 'ready');
  assert.equal(finding.consumedBy, null);
  assert.equal(finding.comparison.context, 'current-parents');
  assert.equal(finding.comparison.rulesetVersion, RULESET_VERSION);
  assert.deepEqual(finding.comparison.before, forecast(...state.parents, false));
  assert.deepEqual(finding.comparison.after, forecast(...state.parents, true));
});

test('consumed finding preserves event snapshots through hatch and JSON restore', () => {
  const consumed = consumedFixture();
  const event = consumed.events[0];
  const finding = getResearchFinding(consumed);
  assert.equal(finding.status, 'consumed');
  assert.equal(finding.consumedBy, event.id);
  assert.equal(finding.comparison.context, 'saved-breeding');
  assert.equal(finding.evidence, event.sampleSnapshot.evidence);
  assert.deepEqual(finding.comparison.parentIds, event.parentIds);
  assert.deepEqual(finding.comparison.before, forecast(...event.request.parentSnapshots, false));
  assert.deepEqual(finding.comparison.after, forecast(...event.request.parentSnapshots, true));
  const hatched = hatch(consumed, event.id);
  assert.deepEqual(getResearchFinding(restoreState(serializeState(hatched))), finding);

  // A later parent selection or metadata change must not rewrite the old finding.
  consumed.parents[0].genome.pale = 'pp';
  consumed.parents[1].genome.pale = 'pp';
  consumed.samples[0].evidence = 'Later inventory label';
  assert.deepEqual(getResearchFinding(consumed), finding);
});

test('unavailable historical context never falls back to the current rules or parents', () => {
  for (const mutate of [
    state => { state.events = []; },
    state => { state.events[0].request.rulesetVersion = 'future-rules'; },
    state => { state.events[0].sampleSnapshot.effectVersion = 'future-effect'; },
    state => { delete state.events[0].sampleSnapshot; },
    state => { state.events[0].request.parentSnapshots = []; },
  ]) {
    const state = consumedFixture();
    mutate(state);
    const finding = getResearchFinding(state);
    assert.equal(finding.comparison, null);
    assert.equal(typeof finding.comparisonUnavailable, 'string');
    assert.equal(finding.status, 'consumed');
  }
  const ready = developSample(createInitialState());
  ready.samples[0].effectVersion = 'future-effect';
  assert.equal(getResearchFinding(ready).comparison, null);
});

test('selector leaves frozen state intact and returns detached comparison arrays', () => {
  for (const state of [developSample(createInitialState()), consumedFixture()]) {
    const before = serializeState(state);
    freezeDeep(state);
    const finding = getResearchFinding(state);
    finding.comparison.parentIds.push('not-a-parent');
    finding.comparison.before.pale = -1;
    assert.equal(serializeState(state), before);
  }
});
