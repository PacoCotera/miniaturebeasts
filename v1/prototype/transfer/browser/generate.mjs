import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { makeManifest, message } from '../manifest.mjs';
import { initialLab, transitionLab } from '../lab.mjs';
import { projectLabObservation } from '../presentation-host.mjs';

export function generatedFixtures() {
  const id = 'Haul_aB09_'.repeat(8).slice(0, 64);
  const cargo = {
    samples: [{ id: 'Sample_aB09_'.repeat(6).slice(0, 64), historyRef: 'Trip_aB09_'.repeat(8).slice(0, 64) }],
    resources: [{ id: 'Lot_aB09_'.repeat(8).slice(0, 64), historyRef: 'Trip_aB09_'.repeat(8).slice(0, 64), quantity: 3 }],
  };
  const manifest = makeManifest(id, 'Probe_aB09', 'Lab_aB09', cargo);
  const key = { labId: manifest.destination, source: manifest.source, destination: manifest.destination, transferId: id, digest: manifest.digest };
  const empty = initialLab(key.labId);
  const pending = transitionLab(empty, { type: 'receive', message: message('offer', manifest) }).state;
  pending.revision = 1;
  const confirmed = transitionLab(pending, { type: 'receive', message: message('cleared', manifest) }).state;
  confirmed.revision = 2;
  function project(read, context = 'neutral', preview = null, allow = true) {
    return projectLabObservation({ key, context, read, manifest: preview, capability: allow ? { key, allowed: true } : null });
  }
  return {
    label: 'Authored read-only lab observations; no live probe or inventory operation.', key,
    observations: {
      unknown: project({ kind: 'valid', snapshot: empty }),
      requested: project({ kind: 'valid', snapshot: empty }, 'requested'),
      pending: project({ kind: 'valid', snapshot: pending }),
      confirmed: project({ kind: 'valid', snapshot: confirmed }),
      unavailable: project({ kind: 'unavailable' }),
      unreadable: project({ kind: 'valid', snapshot: { ...confirmed, version: 999 } }),
      preview: project({ kind: 'valid', snapshot: empty }, 'preview', manifest),
      'preview-unavailable': project({ kind: 'valid', snapshot: empty }, 'preview'),
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('observations.json', import.meta.url), JSON.stringify(generatedFixtures(), null, 2) + '\n');
}
