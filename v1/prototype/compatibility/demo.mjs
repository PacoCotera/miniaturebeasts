import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { copySavedRecord, readSavedRecord, readPortraits, sha256 } from './files.mjs';

if (process.argv.length !== 3) throw new Error('Usage: node prototype/compatibility/demo.mjs <new-output-directory>');
const output = resolve(process.argv[2]);
await mkdir(output); // Exclusive directory: do not reset prior records.
const capabilities = { envelopes: ['saved-specimen-fixture-1'], rules: ['draft-genetics-1'], content: ['founder-demo-1'], outcome: ['authored-founder-1'] };
for (const name of ['founder', 'sibling-101', 'sibling-102', 'unknown-ancestry']) {
  const original = await readSavedRecord(new URL(`fixtures/${name}.json`, import.meta.url), capabilities);
  const destination = join(output, name + '.json');
  await copySavedRecord(original, destination);
  const reopened = await readSavedRecord(destination, capabilities);
  const portraits = await readPortraits(reopened.assessment);
  console.log(JSON.stringify({
    id: reopened.assessment.saved?.id, availability: reopened.assessment.availability,
    ancestry: reopened.assessment.saved?.ancestry.kind,
    exactBytes: original.rawBytes.equals(reopened.rawBytes), recordHash: sha256(reopened.rawBytes),
    portraits: Object.fromEntries(Object.entries(portraits).map(([name, art]) => [name, art.available ? art.sha256 : 'Portrait unavailable'])),
  }));
}
console.log('Read/copy fixture only; no creation, care, printing or scan authority. Output: ' + output);
