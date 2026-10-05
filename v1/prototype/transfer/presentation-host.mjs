import { validateLab } from './lab.mjs';
import { validateManifest, match, canonicalCargo } from './manifest.mjs';
import { validateKey, sameKey, validateObservation } from './presentation-data.mjs';

// The caller supplies a lab read result. No repository, probe or simulator access.
export function projectLabObservation({ key, context, read, manifest = null, capability = null }) {
  validateKey(key);
  if (!['preview', 'requested', 'neutral'].includes(context)) throw new Error('Invalid observation context');
  const base = { schema: 1, key: structuredClone(key), kind: 'unreadable', facts: null, canReconcile: false, reason: 'record-unreadable' };
  try {
    if (capability !== null && (!sameKey(capability.key, key) || capability.allowed !== true)) throw new Error('Mismatched capability');
    const allowed = capability !== null && context !== 'preview';
    if (read?.kind === 'unavailable') return { ...base, kind: 'unavailable', canReconcile: allowed, reason: 'read-unavailable' };
    if (read?.kind === 'unreadable') return base;
    if (read?.kind !== 'valid') throw new Error('Unsupported read outcome');
    validateLab(read.snapshot);
    if (read.snapshot.id !== key.labId) throw new Error('Wrong lab snapshot');
    const receipt = read.snapshot.receipts.find(item => item.manifest.transferId === key.transferId);
    const selected = { version: 1, ...key };
    let status = 'absent';
    let cargo = null;
    if (receipt) {
      match(selected, receipt.manifest);
      status = receipt.confirmed ? 'confirmed' : 'pending';
      cargo = canonicalCargo(receipt.manifest.cargo);
    } else if (context === 'preview') {
      status = 'preview-unavailable';
      if (manifest !== null) {
        const validated = validateManifest(manifest);
        match(selected, validated);
        status = 'preview';
        cargo = canonicalCargo(validated.cargo);
      }
    }
    const result = {
      ...base, kind: 'valid', reason: null,
      canReconcile: allowed && ['absent', 'pending'].includes(status),
      facts: { labRevision: read.snapshot.revision, status, cargo },
    };
    validateObservation(result);
    return result;
  } catch {
    return base; // Never leak raw exception text, stack or rejected payload.
  }
}
