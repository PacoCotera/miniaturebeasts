import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, developSample, createBreeding, hatch } from '../store.mjs';
import { publicSnapshot } from '../share.mjs';
import { getAncestryView } from '../ancestry-view.mjs';

function fixture({ sample = false, paleSource } = {}) {
  for (let index = 0; index < 100; index++) {
    const initial = sample ? developSample(createInitialState()) : createInitialState();
    const state = hatch(createBreeding(initial, {
      eventId: 'ancestry-test',
      seed: `ancestry-${index}`,
      sampleId: sample ? initial.samples[0].id : null,
    }), 'ancestry-test');
    const record = publicSnapshot({ specimen: state.specimens[0], birthEvent: state.events[0] });
    const expression = record.specimen.expression;
    const actualSource = expression.sampleInfluenced ? 'sample-activation' : expression.pale ? 'inherited' : 'not-expressed';
    if (!paleSource || actualSource === paleSource) return record;
  }
  throw new Error('Could not generate requested domain fixture');
}

function freezeDeep(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test('ancestry exposes the saved genotype pair and offspring without inventing parental appearance', () => {
  const record = fixture();
  const view = getAncestryView(record);
  assert.equal(view.available, true);
  assert.equal(view.sampleApplied, false);
  assert.deepEqual(view.parents, record.birth.parentSnapshots.map(parent => ({ id: parent.id, bodyPlanId: parent.bodyPlanId })));
  for (const row of view.rows) {
    assert.equal(row.parentAAlleles, record.birth.parentSnapshots[0].genome[row.traitId]);
    assert.equal(row.parentBAlleles, record.birth.parentSnapshots[1].genome[row.traitId]);
    assert.equal(row.childAlleles, record.specimen.genome[row.traitId]);
  }
  assert.equal(view.parents[0].expression, undefined);
  assert.equal(view.rows[0].donor, undefined);
});

test('natural pale inheritance remains distinct from sample activation', () => {
  for (const sample of [false, true]) {
    const natural = fixture({ sample, paleSource: 'inherited' });
    assert.equal(natural.specimen.genome.pale, 'pp');
    assert.equal(getAncestryView(natural).paleSource, 'inherited');
    assert.equal(getAncestryView(natural).sampleApplied, sample);
  }
  const activated = fixture({ sample: true, paleSource: 'sample-activation' });
  assert.equal(activated.specimen.genome.pale, 'Pp');
  assert.equal(getAncestryView(activated).paleSource, 'sample-activation');
  const dark = fixture({ sample: true, paleSource: 'not-expressed' });
  assert.equal(getAncestryView(dark).paleSource, 'not-expressed');
});

test('missing or mismatched lineage never substitutes a current starter or partial comparison', () => {
  for (const mutate of [
    record => { delete record.birth; },
    record => { record.birth.parentSnapshots.pop(); },
    record => { record.birth.parentSnapshots.reverse(); },
    record => { record.birth.parentSnapshots[0].id = 'someone-else'; },
    record => { record.specimen.parentIds.reverse(); },
    record => { record.birth.id = 'different-birth'; },
    record => { record.specimen.birthEventId = 'different-birth'; },
    record => { record.specimen.id = 'specimen:different-birth'; },
    record => { record.birth.seed = ''; },
    record => { record.birth.parentSnapshots[0].genome.crown = 'XX'; },
    record => { record.birth.parentSnapshots[0].bodyPlanId = 'another-family'; },
    record => { record.specimen.bodyPlanId = 'another-family'; },
  ]) {
    const record = fixture();
    mutate(record);
    const view = getAncestryView(record);
    assert.equal(view.available, false);
    assert.equal(typeof view.reason, 'string');
    assert.equal(view.rows, undefined);
  }
  assert.equal(getAncestryView(null).available, false);
});

test('unsupported versions and birth result inconsistency are rejected', () => {
  for (const mutate of [
    record => { record.schemaVersion = 2; },
    record => { record.specimen.rulesetVersion = 'future'; },
    record => { record.birth.rulesetVersion = 'future'; },
    record => { record.birth.randomVersion = 'future'; },
    record => { record.birth.sampleEffectVersion = 'future'; },
    record => { record.specimen.genome.eyes = record.specimen.genome.eyes === 'rr' ? 'Rr' : 'rr'; },
    record => { record.birth.resolved.genome.pale = 'XX'; },
    record => { record.birth.resolved.activation = !record.birth.resolved.activation; },
    record => { record.specimen.expression.pale = !record.specimen.expression.pale; },
    record => { record.birth.resolved.expression.sampleInfluenced = !record.birth.resolved.expression.sampleInfluenced; },
  ]) {
    const record = fixture({ sample: true });
    mutate(record);
    assert.equal(getAncestryView(record).available, false);
  }
});

test('frozen public record stays unchanged and returned arrays are independent', () => {
  const record = freezeDeep(fixture({ sample: true }));
  const before = JSON.stringify(record);
  const first = getAncestryView(record);
  first.parents[0].id = 'changed';
  first.rows[0].childAlleles = 'changed';
  first.rows.pop();
  const second = getAncestryView(record);
  assert.equal(second.rows.length, 3);
  assert.equal(second.parents[0].id, record.specimen.parentIds[0]);
  assert.equal(JSON.stringify(record), before);
});
