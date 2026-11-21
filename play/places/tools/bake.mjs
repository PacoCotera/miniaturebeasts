// The place bake (place design A1.4).
//   node tools/bake.mjs                 rebake everything and write baked/ and golden/places/
//   node tools/bake.mjs --check         rebake in memory and compare with what is committed (CI); exits 1 naming the first differing files
//   node tools/bake.mjs --place <id>    bake one place (and its mirror) and write only its files; the index is left alone
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bakeAll, writeOutputs, checkOutputs, paths } from '../src/bake/bake.mjs';

const placesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const check = args.includes('--check');
const pi = args.indexOf('--place');
const only = pi >= 0 ? args[pi + 1] : undefined;
if (pi >= 0 && !only) { console.error('bake: --place needs a place id'); process.exit(2); }

const t0 = Date.now();
const { files, errors } = bakeAll(paths(placesDir), { only });
if (errors.length) {
  for (const e of errors) console.error(e);
  console.error(`bake: ${errors.length} problem${errors.length === 1 ? '' : 's'}; nothing written`);
  process.exit(1);
}
if (check) {
  const diffs = checkOutputs(files, placesDir, { complete: !only });
  if (diffs.length) {
    for (const d of diffs) console.error(d);
    console.error(`bake --check: ${diffs.length} file${diffs.length === 1 ? '' : 's'} out of date; run node prototypes/places/tools/bake.mjs and commit the result`);
    process.exit(1);
  }
  console.log(`bake --check: ${files.size} files match (${Date.now() - t0} ms)`);
} else {
  writeOutputs(files, placesDir);
  console.log(`bake: wrote ${files.size} files (${Date.now() - t0} ms)`);
}
