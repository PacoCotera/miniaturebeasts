import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscoveryState, classifyDiscovery } from '../discovery.mjs';
const fixture = () => ({
  individualId: 'instance:a/specimen:1', familyId: 'draft:quadruped',
  expressedTraits: [{ traitId: 'draft:crown', valueId: 'draft:present', label: 'Crown frill' }, { traitId: 'draft:eyes', valueId: 'draft:ringed' }],
  carriedTraits: [{ traitId: 'draft:markings', valueId: 'draft:pale' }],
  individualLabel: 'Specimen 1', familyLabel: 'Working family',
});
function freeze(value) { Object.freeze(value); Object.values(value).filter(v => v && typeof v === 'object').forEach(freeze); return value; }

test('first discovery classifies expressed values, never carried traits; input stays immutable', () => {
  const state = freeze(createDiscoveryState()), record = freeze(fixture());
  const result = classifyDiscovery(state, record);
  assert.equal(state.individuals.length, 0);
  assert.deepEqual(result.novelty, { newIndividual: true, newFamily: true, newExpressedTraits: [{ traitId: 'draft:crown', valueId: 'draft:present' }, { traitId: 'draft:eyes', valueId: 'draft:ringed' }] });
  assert.equal(JSON.stringify(result.state).includes('draft:pale'), false);
  result.novelty.newExpressedTraits[0].valueId = 'edited-result';
  assert.equal(result.state.individuals[0].expressedTraits[0].valueId, 'draft:present');
});

test('replays, copies and renamed labels do not create new discoveries', () => {
  const state = classifyDiscovery(createDiscoveryState(), fixture()).state;
  const copy = JSON.parse(JSON.stringify(fixture()));
  copy.individualLabel = 'Renamed'; copy.familyLabel = 'Localized';
  copy.expressedTraits.reverse(); copy.expressedTraits[1].label = 'Different words';
  const again = classifyDiscovery(freeze(state), copy);
  assert.equal(again.state, state);
  assert.deepEqual(again.novelty, { newIndividual: false, newFamily: false, newExpressedTraits: [] });
});

test('matching-looking sibling is a new individual only; family does not scope trait novelty', () => {
  let state = classifyDiscovery(createDiscoveryState(), fixture()).state;
  const sibling = { ...fixture(), individualId: 'instance:a/specimen:2' };
  const result = classifyDiscovery(state, sibling);
  assert.deepEqual(result.novelty, { newIndividual: true, newFamily: false, newExpressedTraits: [] });
  state = result.state;
  const otherFamily = { ...fixture(), individualId: 'instance:b/specimen:1', familyId: 'draft:crawler' };
  assert.deepEqual(classifyDiscovery(state, otherFamily).novelty, { newIndividual: true, newFamily: true, newExpressedTraits: [] });
});

test('previously carried value becomes new only when explicitly expressed by another individual', () => {
  const state = classifyDiscovery(createDiscoveryState(), fixture()).state;
  const pale = { ...fixture(), individualId: 'instance:a/specimen:3', expressedTraits: [{ traitId: 'draft:markings', valueId: 'draft:pale' }], carriedTraits: [] };
  assert.deepEqual(classifyDiscovery(state, pale).novelty.newExpressedTraits, pale.expressedTraits);
});

test('same individual with changed family or expressed values rejects without minting novelty', () => {
  const state = freeze(classifyDiscovery(createDiscoveryState(), fixture()).state);
  assert.throws(() => classifyDiscovery(state, { ...fixture(), familyId: 'draft:new' }), /Conflicting/);
  assert.throws(() => classifyDiscovery(state, { ...fixture(), expressedTraits: [] }), /Conflicting/);
  const altered = fixture(); altered.expressedTraits[0].valueId = 'draft:absent';
  assert.throws(() => classifyDiscovery(state, altered), /Conflicting/);
  assert.equal(state.individuals.length, 1);
});

test('points/ownership payloads, duplicate traits and malformed state reject', () => {
  const state = createDiscoveryState();
  for (const extra of [{ points: 100 }, { owner: 'me' }, { rewards: [] }]) assert.throws(() => classifyDiscovery(state, { ...fixture(), ...extra }), /Unsupported/);
  const duplicate = fixture(); duplicate.expressedTraits.push(duplicate.expressedTraits[0]);
  assert.throws(() => classifyDiscovery(state, duplicate), /duplicate/);
  assert.throws(() => classifyDiscovery(state, { ...fixture(), individualId: '' }), /Invalid/);
  assert.throws(() => classifyDiscovery(state, { individualId: 'instance:a/specimen:1', familyId: 'draft:quadruped' }), /trait list/);
  assert.throws(() => classifyDiscovery(state, { ...fixture(), expressedTraits: [{ traitId: 'draft:crown' }] }), /Invalid/);
  assert.throws(() => classifyDiscovery(state, { ...fixture(), familyId: undefined }), /Invalid/);
  assert.throws(() => classifyDiscovery({ schemaVersion: 2, individuals: [] }, fixture()), /Unsupported/);
  const first = classifyDiscovery(state, fixture()).state;
  assert.throws(() => classifyDiscovery({ ...first, individuals: [...first.individuals, ...first.individuals] }, fixture()), /Duplicate/);
});
