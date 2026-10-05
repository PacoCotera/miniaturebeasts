import { fields, identifier, list, validateCargo, validateManifest, validateMessage, message, match, mergeCargo, equalCargo } from './manifest.mjs';

export function initialLab(id) {
  return { version: 1, kind: 'lab', id, revision: 0, inventory: { samples: [], resources: [] }, receipts: [] };
}

export function validateLab(state) {
  fields(state, ['version', 'kind', 'id', 'revision', 'inventory', 'receipts']);
  if (state.version !== 1 || state.kind !== 'lab' || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error('Invalid lab envelope');
  identifier(state.id);
  validateCargo(state.inventory);
  list(state.receipts);
  const ids = new Set();
  let credited = { samples: [], resources: [] };
  for (const receipt of state.receipts) {
    fields(receipt, ['manifest', 'confirmed']);
    validateManifest(receipt.manifest);
    if (receipt.manifest.destination !== state.id || typeof receipt.confirmed !== 'boolean' || ids.has(receipt.manifest.transferId)) throw new Error('Invalid lab receipt');
    ids.add(receipt.manifest.transferId);
    credited = mergeCargo(credited, receipt.manifest.cargo);
  }
  if (!equalCargo(credited, state.inventory)) throw new Error('Lab receipt/inventory mismatch');
}

export function resumeLab(state) {
  validateLab(state);
  return state.receipts.map(receipt => message(receipt.confirmed ? 'completion' : 'receipt', receipt.manifest));
}

export function transitionLab(state, event) {
  validateLab(state);
  if (event.type !== 'receive') throw new Error('Unsupported lab action');
  const incoming = event.message;
  validateMessage(incoming);
  if (!['offer', 'cleared'].includes(incoming.type) || incoming.destination !== state.id) throw new Error('Unexpected lab message or destination');
  const next = structuredClone(state);
  let receipt = next.receipts.find(item => item.manifest.transferId === incoming.transferId);
  if (receipt) match(incoming, receipt.manifest);
  if (incoming.type === 'offer') {
    if (!receipt) {
      receipt = { manifest: validateManifest(incoming.manifest), confirmed: false };
      next.inventory = mergeCargo(next.inventory, receipt.manifest.cargo);
      next.receipts.push(receipt);
    }
  } else {
    if (!receipt) throw new Error('Clearance before lab receipt');
    receipt.confirmed = true;
  }
  validateLab(next);
  return { state: next, messages: [message(incoming.type === 'offer' ? 'receipt' : 'completion', receipt.manifest)] };
}
