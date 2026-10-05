import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTER_PARENTS, forecast, inherit, resolveExpression, TRAITS } from '../genetics.mjs';
import { createInitialState, developSample, createBreeding, hatch, serializeState, restoreState } from '../store.mjs';

test('exact enumeration matches forecast, including overlapping traits', () => {
  const [a, b] = STARTER_PARENTS;
  for (const withSample of [false, true]) {
    const totals = { crown: 0, eyes: 0, pale: 0 };
    let all = 0;
    for (let path = 0; path < 128; path++) {
      const genome = Object.fromEntries(TRAITS.map((trait, index) => [trait, [a.genome[trait][path >> (2 * index) & 1], b.genome[trait][path >> (2 * index + 1) & 1]].sort().join('')]));
      const expression = resolveExpression(genome, withSample, Boolean(path & 64));
      TRAITS.forEach(trait => { totals[trait] += Number(expression[trait]) / 128; });
      if (TRAITS.every(trait => expression[trait])) all += 1 / 128;
    }
    assert.deepEqual(totals, { crown: 0.75, eyes: 0.5, pale: withSample ? 0.5 : 0.25 });
    assert.deepEqual(forecast(a, b, withSample), totals);
    assert.equal(all, withSample ? 0.1875 : 0.09375);
  }
});

test('sample only activates carriers; parents and alleles stay intact', () => {
  assert.equal(resolveExpression({ crown: 'cc', eyes: 'rr', pale: 'PP' }, true, true).pale, false);
  assert.equal(resolveExpression({ crown: 'cc', eyes: 'rr', pale: 'pp' }, false, false).pale, true);
  const [a, b] = STARTER_PARENTS;
  const before = JSON.stringify(STARTER_PARENTS);
  for (let i = 0; i < 100; i++) {
    const plain = inherit(a, b, { seed: `${i}` });
    const sampled = inherit(a, b, { seed: `${i}`, withSample: true });
    assert.deepEqual(plain.genome, sampled.genome);
    assert.equal(plain.expression.crown, sampled.expression.crown);
    assert.equal(plain.expression.eyes, sampled.expression.eyes);
    assert.deepEqual(sampled, inherit(a, b, { seed: `${i}`, withSample: true }));
  }
  assert.equal(JSON.stringify(STARTER_PARENTS), before);
  assert.throws(() => inherit(a, b, { seed: 'x', rulesetVersion: 'future' }), /Unsupported/);
});

test('versioned random algorithm preserves a golden birth fixture', () => {
  assert.deepEqual(inherit(...STARTER_PARENTS, { seed: 'golden-1', withSample: true }), {
    genome: { crown: 'cc', eyes: 'rr', pale: 'PP' },
    expression: { crown: false, eyes: false, pale: false, sampleInfluenced: false },
    activation: true,
  });
});

test('atomic incubation survives reload, retries, and hatch without double spend', () => {
  const empty = createInitialState();
  const ready = developSample(empty);
  assert.equal(empty.samples.length, 0);
  assert.equal(developSample(ready), ready);
  const request = { eventId: 'first', seed: 'fixed-seed', sampleId: ready.samples[0].id };
  const incubating = createBreeding(ready, request);
  assert.equal(ready.samples[0].status, 'ready');
  assert.equal(incubating.samples[0].consumedBy, 'first');
  assert.equal(incubating.specimens.length, 0);
  const reloaded = restoreState(serializeState(incubating));
  assert.deepEqual(reloaded, incubating);
  assert.equal(createBreeding(reloaded, request), reloaded);
  assert.throws(() => createBreeding(reloaded, { ...request, seed: 'different' }), /different breeding inputs/);
  assert.throws(() => createBreeding(reloaded, { ...request, sampleId: null }), /different breeding inputs/);
  assert.throws(() => createBreeding(reloaded, { ...request, eventId: 'another' }), /consumed/);
  const born = hatch(reloaded, 'first');
  assert.equal(born.specimens.length, 1);
  assert.deepEqual(born.specimens[0].genome, incubating.events[0].resolved.genome);
  assert.deepEqual(born.specimens[0].expression, incubating.events[0].resolved.expression);
  assert.equal(hatch(born, 'first'), born);
  assert.equal(createBreeding(born, request), born);
  assert.equal(developSample(born), born);
  assert.deepEqual(restoreState(serializeState(born)), born);
});

test('without sample works; unknown packs/events and altered parent replay fail', () => {
  const initial = createInitialState();
  const request = { eventId: 'plain', seed: 'plain' };
  const state = createBreeding(initial, request);
  assert.equal(state.samples.length, 0);
  assert.equal(hatch(state, 'plain').specimens[0].expression.sampleInfluenced, false);
  assert.throws(() => createBreeding(initial, { ...request, sampleId: 'missing' }), /unavailable/);
  assert.throws(() => hatch(state, 'missing'), /Unknown/);
  const altered = structuredClone(state);
  altered.parents[0].genome.crown = 'cc';
  assert.throws(() => createBreeding(altered, request), /different breeding inputs/);
});

test('restore rejects malformed, conflicting, or tampered records', () => {
  assert.throws(() => restoreState('{'), SyntaxError);
  assert.throws(() => restoreState('{"schemaVersion":2}'), /Unsupported/);
  const ready = developSample(createInitialState());
  const state = hatch(createBreeding(ready, { eventId: 'birth', seed: 'seed', sampleId: ready.samples[0].id }), 'birth');
  const variants = [
    s => { s.events.push(structuredClone(s.events[0])); },
    s => { s.specimens[0].expression.pale = !s.specimens[0].expression.pale; },
    s => { s.specimens[0].parentIds = ['other']; },
    s => { s.samples[0].consumedBy = 'other'; },
    s => { s.events[0].request.rulesetVersion = 'future'; },
    s => { s.events = []; },
  ];
  for (const mutate of variants) {
    const broken = structuredClone(state); mutate(broken);
    assert.throws(() => restoreState(JSON.stringify(broken)));
  }
});
