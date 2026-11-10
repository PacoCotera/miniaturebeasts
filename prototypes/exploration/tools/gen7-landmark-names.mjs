// Reads the landmark names list (a markdown file) and writes src/gen7/landmark-names.mjs, which the generator reads. Run when the list changes:
//   node tools/gen7-landmark-names.mjs [path to the names list]
// The markdown stays the one source; the json is its parsed form (a page and the Station cannot read the markdown folder).
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2] || '/home/mb/mb/editorial/book/lore/drafts/landmark-names.md';
const KINDS = { Windstep: 'windstep', 'Hollow Tree': 'hollow-tree', 'Split Stone': 'split-stone', Reedpool: 'reedpool' };
const out = {};
let kind = null;
for (const line of readFileSync(src, 'utf8').split('\n')) {
  const h = /^## (.+?) \(/.exec(line);
  if (h) { kind = KINDS[h[1]] || null; continue; }
  if (kind && line.includes(' · ')) out[kind] = line.split(' · ').map(s => s.trim()).filter(Boolean);
}
for (const k of Object.values(KINDS)) if (!out[k] || out[k].length < 12) throw new Error('names for ' + k + ': ' + (out[k] ? out[k].length : 0));
writeFileSync(new URL('../src/gen7/landmark-names.mjs', import.meta.url), '// Parsed from editorial\'s landmark-names.md by tools/gen7-landmark-names.mjs; do not edit by hand.\nexport const LANDMARK_NAMES = ' + JSON.stringify(out, null, 1) + ';\n');
