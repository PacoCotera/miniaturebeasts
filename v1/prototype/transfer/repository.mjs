import { open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// One process only. Handles for the same absolute file share a transaction queue.
const pending = new Map();

function serialized(path, operation) {
  const previous = pending.get(path) ?? Promise.resolve();
  const result = previous.catch(() => {}).then(operation);
  pending.set(path, result);
  result.finally(() => { if (pending.get(path) === result) pending.delete(path); }).catch(() => {});
  return result;
}

async function syncDirectory(path) {
  // Windows Node cannot reliably open directories for fsync. No power-loss
  // durability claim is made there; other platforms must propagate failures.
  if (process.platform === 'win32') return;
  const handle = await open(path, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}

export function repository(file, validate, { fault = async () => {}, maxBytes = 1024 * 1024 } = {}) {
  const path = resolve(file);
  async function readSaved() {
    const bytes = await readFile(path);
    if (bytes.length > maxBytes) throw new Error('Snapshot exceeds storage capacity');
    const state = JSON.parse(bytes.toString('utf8'));
    validate(state);
    return state;
  }
  async function create(initial) {
    return serialized(path, async () => {
      validate(initial);
      const bytes = JSON.stringify(initial, null, 2) + '\n';
      if (Buffer.byteLength(bytes) > maxBytes) throw new Error('Snapshot exceeds storage capacity');
      const handle = await open(path, 'wx', 0o600);
      try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
      await syncDirectory(dirname(path));
    });
  }
  async function transact(transition) {
    return serialized(path, async () => {
      const saved = await readSaved();
      const result = transition(structuredClone(saved));
      validate(result.state);
      if (JSON.stringify(result.state) === JSON.stringify(saved)) return structuredClone(result);
      result.state.revision = saved.revision + 1;
      validate(result.state);
      const bytes = JSON.stringify(result.state, null, 2) + '\n';
      if (Buffer.byteLength(bytes) > maxBytes) throw new Error('Snapshot exceeds storage capacity');
      const temporary = path + '.' + randomUUID() + '.tmp';
      try {
        await fault('before-write');
        const handle = await open(temporary, 'wx', 0o600);
        try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
        await fault('after-write');
        await fault('before-commit');
        await rename(temporary, path);
        await syncDirectory(dirname(path));
        await fault('after-commit');
        return structuredClone(result);
      } finally {
        await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; });
      }
    });
  }
  return { create, read: () => serialized(path, readSaved), transact };
}
