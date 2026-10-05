import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assessRecord } from './record.mjs';

const assetFiles = Object.freeze({
  'critter-color-pixel-01': 'critter-color.png',
  'critter-mono-pixel-01': 'critter-mono.png',
});
export function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

export async function readSavedRecord(path, capabilities) {
  const rawBytes = await readFile(path);
  let parsed;
  try { parsed = JSON.parse(rawBytes.toString('utf8')); } catch { parsed = null; }
  return { rawBytes, assessment: assessRecord(parsed, capabilities) };
}

export async function copySavedRecord(readResult, destination) {
  if (!Buffer.isBuffer(readResult.rawBytes)) throw new Error('Original bytes required');
  await writeFile(destination, readResult.rawBytes, { flag: 'wx' });
}

export async function readPortraits(assessment, directory = fileURLToPath(new URL('assets/', import.meta.url))) {
  if (!assessment.saved) return { color: { available: false }, mono: { available: false } };
  const result = {};
  for (const treatment of ['color', 'mono']) {
    const reference = assessment.saved.art[treatment];
    try {
      if (!Object.hasOwn(assetFiles, reference.id)) throw new Error('Unsupported art reference');
      const bytes = await readFile(join(directory, assetFiles[reference.id]));
      if (sha256(bytes) !== reference.sha256) throw new Error('Art hash mismatch');
      result[treatment] = { available: true, bytes, sha256: reference.sha256 };
    } catch {
      result[treatment] = { available: false, reason: 'Portrait unavailable' };
    }
  }
  return result;
}
