import { STARTER_PARENTS, RULESET_VERSION, RANDOM_VERSION, BODY_PLAN_ID, inherit, validateParent } from './genetics.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const SAMPLE_ID = 'sample:mist-thread:1';
const SAMPLE_EFFECT = 'draft:mist-expression:1';

/** Local single-authority state only. JSON-safe; all operations leave inputs intact. */
export function createInitialState() {
  return { schemaVersion: 1, parents: copy(STARTER_PARENTS), samples: [], events: [], specimens: [], research: { status: 'available' } };
}

/** Explicit accelerated research action; one pack, safely retryable. */
export function developSample(state) {
  if (state.samples.some(sample => sample.id === SAMPLE_ID)) return state;
  const next = copy(state);
  next.samples.push({ id: SAMPLE_ID, name: 'Mist Thread', origin: 'accelerated-lab-research', effectVersion: SAMPLE_EFFECT, evidence: 'Prototype research finding; no physical sensor readings.', status: 'ready', consumedBy: null });
  next.research.status = 'collected';
  return next;
}

/** Reserve the resolved child and consume the pack atomically at incubation creation. */
export function createBreeding(state, { eventId, seed, sampleId = null }) {
  if (typeof eventId !== 'string' || !eventId.length || typeof seed !== 'string' || !seed.length) throw new Error('Event ID and seed must be nonempty strings');
  if (sampleId !== null && typeof sampleId !== 'string') throw new Error('Invalid sample ID');
  const parentSnapshots = copy(state.parents);
  const request = { seed, sampleId, parentSnapshots, rulesetVersion: RULESET_VERSION, randomVersion: RANDOM_VERSION };
  const previous = state.events.find(event => event.id === eventId);
  if (previous) {
    if (JSON.stringify(previous.request) !== JSON.stringify(request)) throw new Error('Event ID already belongs to different breeding inputs');
    return state;
  }
  const sample = sampleId === null ? null : state.samples.find(item => item.id === sampleId);
  if (sampleId !== null && (!sample || sample.status !== 'ready' || sample.consumedBy || sample.effectVersion !== SAMPLE_EFFECT)) throw new Error('Sample is unavailable or already consumed');
  if (parentSnapshots.length !== 2) throw new Error('Exactly two parents required');
  const resolved = inherit(parentSnapshots[0], parentSnapshots[1], { seed, withSample: sample !== null });
  const next = copy(state);
  next.events.push({ id: eventId, seed, sampleId, offspringId: `specimen:${eventId}`, parentIds: parentSnapshots.map(parent => parent.id), request, sampleSnapshot: copy(sample), status: 'incubating', resolved });
  if (sample) Object.assign(next.samples.find(item => item.id === sampleId), { status: 'consumed', consumedBy: eventId });
  return next;
}

/** Developer-advanced hatch; retries return the same saved individual without rerolling. */
export function hatch(state, eventId) {
  const event = state.events.find(item => item.id === eventId);
  if (!event) throw new Error('Unknown incubation');
  if (event.status === 'hatched') return state;
  const next = copy(state);
  next.events.find(item => item.id === eventId).status = 'hatched';
  next.specimens.push({ id: event.offspringId, name: `Specimen ${state.specimens.length + 1}`, bodyPlanId: BODY_PLAN_ID, parentIds: [...event.parentIds], birthEventId: event.id, genome: copy(event.resolved.genome), expression: copy(event.resolved.expression), lifeStage: 'hatchling', rulesetVersion: event.request.rulesetVersion, artVersion: 'draft-svg-1' });
  return next;
}

export function serializeState(state) { return JSON.stringify(state); }

/** Validate persistence boundaries; errors leave the original saved text recoverable. */
export function restoreState(json) {
  const state = JSON.parse(json);
  if (!state || state.schemaVersion !== 1 || !Array.isArray(state.parents) || state.parents.length !== 2 || !['samples', 'events', 'specimens'].every(key => Array.isArray(state[key])) || !['available', 'collected'].includes(state.research?.status)) throw new Error('Unsupported or malformed saved experiment');
  state.parents.forEach(validateParent);
  for (const key of ['samples', 'events', 'specimens']) {
    const ids = state[key].map(item => item?.id);
    if (ids.some(id => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(`Invalid or duplicate ${key} IDs`);
  }
  for (const event of state.events) {
    if (!['incubating', 'hatched'].includes(event.status) || !event.request || !Array.isArray(event.request.parentSnapshots) || event.request.parentSnapshots.length !== 2) throw new Error('Invalid birth event');
    const req = event.request;
    const resolved = inherit(req.parentSnapshots[0], req.parentSnapshots[1], { seed: req.seed, withSample: req.sampleId !== null, rulesetVersion: req.rulesetVersion, randomVersion: req.randomVersion });
    if (JSON.stringify(resolved) !== JSON.stringify(event.resolved) || event.seed !== req.seed || event.sampleId !== req.sampleId || event.offspringId !== `specimen:${event.id}` || JSON.stringify(event.parentIds) !== JSON.stringify(req.parentSnapshots.map(parent => parent.id))) throw new Error('Inconsistent birth event');
    const sample = state.samples.find(item => item.id === event.sampleId);
    if (event.sampleId !== null && (!sample || sample.consumedBy !== event.id || sample.status !== 'consumed' || sample.effectVersion !== SAMPLE_EFFECT)) throw new Error('Inconsistent sample consumption');
    const child = state.specimens.find(item => item.id === event.offspringId);
    if (event.status === 'hatched' ? !child || child.birthEventId !== event.id || JSON.stringify(child.parentIds) !== JSON.stringify(event.parentIds) || child.rulesetVersion !== req.rulesetVersion || JSON.stringify(child.genome) !== JSON.stringify(resolved.genome) || JSON.stringify(child.expression) !== JSON.stringify(resolved.expression) : Boolean(child)) throw new Error('Inconsistent saved specimen');
  }
  for (const sample of state.samples) {
    if (sample.id !== SAMPLE_ID || sample.effectVersion !== SAMPLE_EFFECT || !['ready', 'consumed'].includes(sample.status) || (sample.status === 'ready' ? sample.consumedBy !== null : !state.events.some(event => event.id === sample.consumedBy && event.sampleId === sample.id))) throw new Error('Invalid saved sample');
  }
  for (const child of state.specimens) {
    validateParent(child);
    if (!state.events.some(event => event.id === child.birthEventId && event.offspringId === child.id && event.status === 'hatched')) throw new Error('Orphan saved specimen');
  }
  return state;
}
