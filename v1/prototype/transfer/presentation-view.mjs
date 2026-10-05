import { reasons, validateKey, validateObservation, sameKey } from './presentation-data.mjs';

const copy = {
  preview: ['Review your haul.', 'These are the samples and supplies listed for this haul.'],
  'preview-unavailable': ['Haul unavailable.', 'The haul list is not available yet.'],
  absent: ['Status not yet known.', 'The lab has no confirmed result for this haul yet.'],
  requested: ['Checking this haul.', 'The transfer was requested. The lab has not confirmed storage yet.'],
  pending: ['Stored. Confirmation pending.', 'This haul was stored in the lab. Confirmation that it was cleared from the probe is still pending.'],
  confirmed: ['Haul transfer confirmed.', 'This haul was stored in the lab and cleared from the probe.'],
  unavailable: ['Status unavailable.', 'The latest status could not be checked. You can try checking again.'],
  unreadable: ['Record unavailable.', 'This transfer record could not be read.'],
};

function statusFor(state) {
  const observation = state.observation;
  if (!observation && ['pending', 'confirmed'].includes(state.lastKnown?.status)) return 'unavailable';
  if (observation?.kind && observation.kind !== 'valid') return observation.kind;
  const status = observation?.facts?.status ?? (state.context === 'preview' ? 'preview-unavailable' : 'absent');
  return status === 'absent' && state.context === 'requested' ? 'requested' : status;
}

function summary(facts) {
  if (!facts?.cargo) return null;
  return { label: facts.status === 'preview' ? 'Listed haul' : 'Recorded haul', samples: facts.cargo.samples.length, resourceLots: facts.cargo.resources.length };
}

function detailPages(state) {
  if (state.observation?.kind === 'unreadable') return [[{ label: 'Record', value: reasons[state.observation.reason] }]];
  if (state.observation?.facts?.status === 'preview-unavailable' || (!state.observation && state.context === 'preview')) {
    return state.page === 'details' ? [[{ label: 'Haul', value: 'The haul list is not available right now.' }]] : [];
  }
  const facts = state.observation?.kind === 'valid' ? state.observation.facts : state.lastKnown;
  const rows = [
    { label: 'Haul', value: state.key.transferId },
    { label: 'Source', value: state.key.source },
    { label: 'Destination', value: state.key.destination },
  ];
  if (state.observation?.kind === 'unavailable') rows.push({ label: 'Latest check', value: reasons['read-unavailable'] });
  if (facts?.cargo) {
    if (state.observation?.kind !== 'valid') rows.push({ label: 'History', value: 'Last confirmed status' });
    for (const item of facts.cargo.samples) rows.push({ label: 'Sample', value: item.id }, { label: 'Collection history', value: item.historyRef });
    for (const item of facts.cargo.resources) rows.push({ label: 'Supply lot', value: item.id }, { label: 'Recorded quantity', value: String(item.quantity) }, { label: 'Collection history', value: item.historyRef });
  }
  const pages = [];
  for (let index = 0; index < rows.length; index += 4) pages.push(rows.slice(index, index + 4));
  return pages;
}

export function mapPresentation(state) {
  validateKey(state.key);
  if (state.observation) {
    validateObservation(state.observation);
    if (!sameKey(state.key, state.observation.key)) throw new Error('Observation belongs to another selection');
  }
  if (state.lastKnown) validateObservation({ schema: 1, key: state.key, kind: 'valid', facts: state.lastKnown, canReconcile: false, reason: null });
  const status = statusFor(state);
  const [heading, defaultExplanation] = copy[status];
  const pages = detailPages(state);
  const mayCheck = Boolean(state.observation?.canReconcile) && !['preview', 'preview-unavailable', 'confirmed', 'unreadable'].includes(status);
  const explanation = status === 'unavailable' && !mayCheck ? 'The latest status could not be checked.' : defaultExplanation;
  const actions = [{ id: 'back', label: 'Back', enabled: true }];
  if (state.page === 'details') {
    actions.push({ id: 'previous', label: 'Previous', enabled: state.detailPage > 0 });
    actions.push({ id: 'next', label: 'Next', enabled: state.detailPage + 1 < pages.length });
  } else {
    if (mayCheck) actions.push({ id: 'reconcile', label: state.loading ? 'Checking…' : 'Check status', enabled: !state.loading });
    if (pages.length) actions.push({ id: 'details', label: 'Details', enabled: true });
  }
  const currentFacts = state.observation?.kind === 'valid' ? state.observation.facts : null;
  return {
    revision: state.revision, key: structuredClone(state.key), visible: state.visible,
    page: state.page, status, heading, explanation, loading: state.loading,
    summary: summary(currentFacts),
    lastKnown: !currentFacts && state.lastKnown ? { label: 'Last confirmed status', status: state.lastKnown.status, summary: summary(state.lastKnown) } : null,
    actions, focus: state.focus,
    details: state.page === 'details' ? { page: state.detailPage + 1, total: pages.length, rows: pages[state.detailPage] ?? [] } : null,
    detailPageCount: pages.length,
  };
}
