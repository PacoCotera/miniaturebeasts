/**
 * Provisional local discovery classifier, NOT authentication or reward eligibility.
 * Call only after resolving/validating a record. No points, ownership or permissions.
 * IDs must be stable and globally scoped by the caller (including instance namespace
 * where needed). Display labels never identify discoveries.
 *
 * Trait novelty is provisionally GLOBAL per [traitId, valueId] pair, not family
 * scoped. Absent/plain variants count only if callers explicitly supply them as
 * expressed values. carriedTraits never become observed discoveries here.
 * This freezes an individual's first expression snapshot; changed snapshots reject.
 * Aging, revised expression, identity migration and federated trust are out of scope.
 * No persistence or UI integration is provided.
 */
const fail = message => { throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const id = value => typeof value === 'string' && /^[A-Za-z0-9:._/-]{1,256}$/.test(value);
function keys(value, allowed) {
  if (!object(value) || Object.keys(value).some(key => !allowed.includes(key))) fail('Unsupported discovery fields');
}
function traits(values) {
  if (!Array.isArray(values) || values.length > 128) fail('Expected bounded trait list');
  const seen = new Set();
  return values.map(value => {
    keys(value, ['traitId', 'valueId', 'label']);
    if (!id(value.traitId) || !id(value.valueId) || seen.has(value.traitId)) fail('Invalid or duplicate trait identity');
    seen.add(value.traitId);
    return { traitId: value.traitId, valueId: value.valueId };
  }).sort((a, b) => a.traitId < b.traitId ? -1 : a.traitId > b.traitId ? 1 : 0);
}
function canonical(record) {
  keys(record, ['individualId', 'familyId', 'expressedTraits', 'carriedTraits', 'individualLabel', 'familyLabel']);
  if (!id(record.individualId) || !id(record.familyId)) fail('Invalid individual or family identity');
  if (record.carriedTraits !== undefined) traits(record.carriedTraits); // Validate shape, never observe.
  return { individualId: record.individualId, familyId: record.familyId, expressedTraits: traits(record.expressedTraits) };
}
const traitKey = value => JSON.stringify([value.traitId, value.valueId]);

export function createDiscoveryState() { return { schemaVersion: 1, individuals: [] }; }

/**
 * classifyDiscovery(state, {individualId, familyId, expressedTraits,
 *   carriedTraits?, individualLabel?, familyLabel?}) -> {state, novelty}
 * Trait items: {traitId, valueId, label?}; labels are ignored, unknown fields reject.
 * novelty = {newIndividual:boolean, newFamily:boolean, newExpressedTraits:[...]}
 * Returns immutable new state for a discovery; same-input replay returns original
 * state and empty novelty. Distinct individuals with matching looks remain distinct.
 */
export function classifyDiscovery(state, resolvedRecord) {
  keys(state, ['schemaVersion', 'individuals']);
  if (state.schemaVersion !== 1 || !Array.isArray(state.individuals)) fail('Unsupported discovery state');
  const records = state.individuals.map(canonical);
  if (new Set(records.map(record => record.individualId)).size !== records.length) fail('Duplicate stored individual');
  const record = canonical(resolvedRecord);
  const previous = records.find(item => item.individualId === record.individualId);
  if (previous) {
    if (JSON.stringify(previous) !== JSON.stringify(record)) fail('Conflicting immutable individual snapshot');
    return { state, novelty: { newIndividual: false, newFamily: false, newExpressedTraits: [] } };
  }
  const seenTraits = new Set(records.flatMap(item => item.expressedTraits.map(traitKey)));
  const newTraits = record.expressedTraits.filter(value => !seenTraits.has(traitKey(value)));
  return {
    state: { schemaVersion: 1, individuals: [...records, record] },
    novelty: { newIndividual: true, newFamily: !records.some(item => item.familyId === record.familyId), newExpressedTraits: newTraits.map(value => ({ ...value })) },
  };
}
