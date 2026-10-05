// Plain serializable boundary only. Cryptographic/domain validation belongs to host.
export const reasons = Object.freeze({
  'read-unavailable': 'The latest status could not be checked.',
  'record-unreadable': 'This transfer record could not be read.',
  'conflicting-record': 'The saved transfer information is inconsistent.',
});

function record(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) throw new Error('Invalid presentation record');
}

function id(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new Error('Invalid presentation identity');
}

export function validateKey(key) {
  record(key, ['labId', 'source', 'destination', 'transferId', 'digest']);
  for (const field of ['labId', 'source', 'destination', 'transferId']) id(key[field]);
  if (key.labId !== key.destination || key.source === key.destination || !/^[a-f0-9]{64}$/.test(key.digest)) throw new Error('Invalid presentation selection');
}

export function sameKey(left, right) {
  return ['labId', 'source', 'destination', 'transferId', 'digest'].every(field => left?.[field] === right?.[field]);
}

export function validateObservation(value) {
  record(value, ['schema', 'key', 'kind', 'facts', 'canReconcile', 'reason']);
  validateKey(value.key);
  if (value.schema !== 1 || !['valid', 'unavailable', 'unreadable'].includes(value.kind) || typeof value.canReconcile !== 'boolean') throw new Error('Unsupported observation');
  if (value.kind !== 'valid') {
    if (value.facts !== null || !Object.hasOwn(reasons, value.reason) || (value.kind === 'unreadable' && value.canReconcile)) throw new Error('Unsafe error observation');
    return;
  }
  if (value.reason !== null) throw new Error('Unexpected observation reason');
  const facts = value.facts;
  record(facts, ['labRevision', 'status', 'cargo']);
  if (!Number.isSafeInteger(facts.labRevision) || facts.labRevision < 0 || !['absent', 'pending', 'confirmed', 'preview', 'preview-unavailable'].includes(facts.status)) throw new Error('Invalid observation facts');
  if (['absent', 'preview-unavailable'].includes(facts.status)) {
    if (facts.cargo !== null) throw new Error('Unknown cargo cannot be empty cargo');
  } else {
    record(facts.cargo, ['samples', 'resources']);
    for (const category of ['samples', 'resources']) {
      const entries = facts.cargo[category];
      if (!Array.isArray(entries) || entries.length > 128) throw new Error('Invalid presentation cargo');
      const seen = new Set();
      for (const item of entries) {
        record(item, category === 'samples' ? ['id', 'historyRef'] : ['id', 'historyRef', 'quantity']);
        id(item.id);
        id(item.historyRef);
        if (seen.has(item.id)) throw new Error('Duplicate presentation identity');
        seen.add(item.id);
        if (category === 'resources' && (!Number.isSafeInteger(item.quantity) || item.quantity <= 0)) throw new Error('Invalid presentation quantity');
      }
    }
    if (!facts.cargo.samples.length && !facts.cargo.resources.length) throw new Error('Known haul cannot be empty');
  }
  if (['preview', 'preview-unavailable', 'confirmed'].includes(facts.status) && value.canReconcile) throw new Error('Unsafe reconciliation capability');
}
