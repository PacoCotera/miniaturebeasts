import { fields, identifier, list, validateCargo, canonicalCargo, makeManifest, validateManifest, validateMessage, message, match, equalCargo, mergeCargo } from './manifest.mjs';

export function initialProbe(id, cargo, history = []) {
  const state = { version: 1, kind: 'probe', id, revision: 0, cargo: canonicalCargo(cargo), history, settings: { label: id }, transfers: [] };
  validateProbe(state);
  return state;
}

export function validateProbe(state) {
  fields(state, ['version', 'kind', 'id', 'revision', 'cargo', 'history', 'settings', 'transfers']);
  if (state.version !== 1 || state.kind !== 'probe' || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error('Invalid probe envelope');
  identifier(state.id);
  fields(state.settings, ['label']);
  identifier(state.settings.label);
  list(state.history);
  state.history.forEach(identifier);
  validateCargo(state.cargo);
  list(state.transfers);
  const ids = new Set();
  let delivered = { samples: [], resources: [] };
  let active = null;
  for (const transfer of state.transfers) {
    fields(transfer, ['manifest', 'phase']);
    validateManifest(transfer.manifest);
    if (transfer.manifest.source !== state.id || ids.has(transfer.manifest.transferId)) throw new Error('Invalid probe transfer identity');
    ids.add(transfer.manifest.transferId);
    if (!['sealed', 'cleared', 'complete'].includes(transfer.phase)) throw new Error('Invalid probe phase');
    if (transfer.phase !== 'complete') {
      if (active) throw new Error('Multiple active probe transfers');
      active = transfer;
    }
    if (transfer.phase !== 'sealed') delivered = mergeCargo(delivered, transfer.manifest.cargo);
  }
  mergeCargo(delivered, state.cargo);
  for (const entry of [...state.cargo.samples, ...state.cargo.resources, ...delivered.samples, ...delivered.resources]) {
    if (!state.history.includes(entry.historyRef)) throw new Error('Missing collection history');
  }
  if (active?.phase === 'sealed' && !equalCargo(state.cargo, active.manifest.cargo)) throw new Error('Sealed cargo mismatch');
  if (active?.phase === 'cleared' && (state.cargo.samples.length || state.cargo.resources.length)) throw new Error('Cleared probe has new cargo before completion');
}

export function resumeProbe(state) {
  validateProbe(state);
  return state.transfers.filter(item => item.phase !== 'complete').map(item => message(item.phase === 'sealed' ? 'offer' : 'cleared', item.manifest));
}

export function transitionProbe(state, event) {
  validateProbe(state);
  const next = structuredClone(state);
  const active = next.transfers.find(item => item.phase !== 'complete');
  let messages = [];
  if (event.type === 'seal') {
    if (active) throw new Error('Probe transfer locked');
    if (next.transfers.some(item => item.manifest.transferId === event.transferId)) throw new Error('Transfer identity already used');
    const manifest = makeManifest(event.transferId, next.id, event.destination, next.cargo);
    next.transfers.push({ manifest, phase: 'sealed' });
    messages = [message('offer', manifest)];
  } else if (event.type === 'gather') {
    if (active) throw new Error('Probe transfer locked');
    next.cargo = mergeCargo(next.cargo, event.cargo);
    list(event.history);
    event.history.forEach(identifier);
    next.history = [...new Set([...next.history, ...event.history])];
  } else if (event.type === 'receive') {
    const incoming = event.message;
    validateMessage(incoming);
    if (!['receipt', 'completion'].includes(incoming.type)) throw new Error('Unexpected probe message');
    const transfer = next.transfers.find(item => item.manifest.transferId === incoming.transferId);
    if (!transfer) throw new Error('Unsolicited probe acknowledgment');
    match(incoming, transfer.manifest);
    if (incoming.type === 'receipt') {
      if (transfer.phase === 'sealed') {
        next.cargo = { samples: [], resources: [] };
        transfer.phase = 'cleared';
      }
      messages = [message('cleared', transfer.manifest)];
    } else {
      if (transfer.phase === 'sealed') throw new Error('Completion before durable probe clearance');
      transfer.phase = 'complete';
    }
  } else {
    throw new Error('Unsupported probe action; cancellation, spending and retargeting are unavailable');
  }
  validateProbe(next);
  return { state: next, messages };
}
