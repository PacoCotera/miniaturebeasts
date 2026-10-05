import { createHash } from 'node:crypto';

export function fields(value, names) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== [...names].sort().join(',')) {
    throw new Error('Unsupported record fields');
  }
}

export function identifier(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) throw new Error('Invalid identity');
}

export function list(value, limit = 128) {
  if (!Array.isArray(value) || value.length > limit) throw new Error('Invalid or full collection');
}

export function validateCargo(cargo) {
  fields(cargo, ['samples', 'resources']);
  for (const category of ['samples', 'resources']) {
    list(cargo[category]);
    const identities = new Set();
    for (const entry of cargo[category]) {
      fields(entry, category === 'samples' ? ['id', 'historyRef'] : ['id', 'historyRef', 'quantity']);
      identifier(entry.id);
      identifier(entry.historyRef);
      if (identities.has(entry.id)) throw new Error('Duplicate cargo identity');
      identities.add(entry.id);
      if (category === 'resources' && (!Number.isSafeInteger(entry.quantity) || entry.quantity <= 0)) {
        throw new Error('Invalid resource quantity');
      }
    }
  }
}

export function canonicalCargo(cargo) {
  validateCargo(cargo);
  const byIdentity = (left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
  const samples = cargo.samples.map(({ id, historyRef }) => ({ id, historyRef })).sort(byIdentity);
  const resources = cargo.resources.map(({ id, historyRef, quantity }) => ({ id, historyRef, quantity })).sort(byIdentity);
  return { samples, resources };
}

export function makeManifest(transferId, source, destination, cargo) {
  for (const id of [transferId, source, destination]) identifier(id);
  if (source === destination) throw new Error('Transfer peers must differ');
  const body = { version: 1, transferId, source, destination, cargo: canonicalCargo(cargo) };
  if (!body.cargo.samples.length && !body.cargo.resources.length) throw new Error('Cannot seal empty cargo');
  return { ...body, digest: createHash('sha256').update(JSON.stringify(body)).digest('hex') };
}

export function validateManifest(manifest) {
  fields(manifest, ['version', 'transferId', 'source', 'destination', 'cargo', 'digest']);
  if (manifest.version !== 1) throw new Error('Unsupported manifest version');
  const expected = makeManifest(manifest.transferId, manifest.source, manifest.destination, manifest.cargo);
  if (manifest.digest !== expected.digest) throw new Error('Manifest digest mismatch');
  return expected;
}

export function message(type, manifest) {
  const { version, transferId, source, destination, digest } = manifest;
  const result = { type, version, transferId, source, destination, digest };
  if (type === 'offer') result.manifest = structuredClone(manifest);
  return result;
}

export function validateMessage(value) {
  const keys = ['type', 'version', 'transferId', 'source', 'destination', 'digest'];
  if (value?.type === 'offer') keys.push('manifest');
  fields(value, keys);
  if (!['offer', 'receipt', 'cleared', 'completion'].includes(value.type) || value.version !== 1) throw new Error('Unsupported message');
  for (const id of [value.transferId, value.source, value.destination]) identifier(id);
  if (value.source === value.destination || !/^[a-f0-9]{64}$/.test(value.digest)) throw new Error('Invalid message peers or digest');
  if (value.type === 'offer') match(value, validateManifest(value.manifest));
}

export function match(value, manifest) {
  for (const field of ['version', 'transferId', 'source', 'destination', 'digest']) {
    if (value[field] !== manifest[field]) throw new Error('Transfer identity or payload conflict');
  }
}

export function equalCargo(left, right) {
  return JSON.stringify(canonicalCargo(left)) === JSON.stringify(canonicalCargo(right));
}

export function mergeCargo(existing, incoming) {
  const merged = {
    samples: [...existing.samples, ...incoming.samples],
    resources: [...existing.resources, ...incoming.resources],
  };
  return canonicalCargo(merged);
}
