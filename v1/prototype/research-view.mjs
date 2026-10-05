import { forecast, RULESET_VERSION } from './genetics.mjs';

// Presentation selector for the one existing research fixture. It preserves the
// finding after consumption and delegates every probability to the domain rules.
export function getResearchFinding(state) {
  const sample = state.samples[0];
  if (!sample) return null;

  const consumed = sample.status === 'consumed';
  const event = consumed
    ? state.events.find(item => item.id === sample.consumedBy && item.sampleId === sample.id)
    : null;
  const savedSample = event?.sampleSnapshot || sample;
  const finding = {
    id: sample.id,
    name: savedSample.name,
    evidence: savedSample.evidence,
    origin: savedSample.origin,
    effectVersion: savedSample.effectVersion,
    status: sample.status,
    consumedBy: sample.consumedBy,
    comparison: null,
    comparisonUnavailable: null,
  };

  if (consumed && (!event?.sampleSnapshot || event.sampleSnapshot.id !== sample.id || event.request?.sampleId !== sample.id)) {
    finding.comparisonUnavailable = 'The saved breeding context is incomplete. No comparison was recalculated.';
    return finding;
  }

  const rulesetVersion = consumed ? event.request.rulesetVersion : RULESET_VERSION;
  if (rulesetVersion !== RULESET_VERSION || savedSample.effectVersion !== 'draft:mist-expression:1' || sample.effectVersion !== savedSample.effectVersion) {
    finding.comparisonUnavailable = 'This saved ruleset or sample effect is unsupported. No comparison was recalculated.';
    return finding;
  }

  const parents = consumed ? event.request.parentSnapshots : state.parents;
  try {
    if (!Array.isArray(parents) || parents.length !== 2) throw new Error('Missing parent pair');
    finding.comparison = {
      before: forecast(parents[0], parents[1], false),
      after: forecast(parents[0], parents[1], true),
      parentIds: parents.map(parent => parent.id),
      rulesetVersion,
      context: consumed ? 'saved-breeding' : 'current-parents',
    };
  } catch {
    finding.comparisonUnavailable = 'The saved parent data cannot be compared with the supported rules.';
  }
  return finding;
}
