// check-imports.mjs <tree>: the realm imports no tile code. Walks the import graph from gen7/region.mjs (relative imports only) and fails if it reaches levels.mjs, place.mjs, places.mjs, hold.mjs, decor.mjs or world7.mjs.
import fs from 'node:fs';
import path from 'node:path';
const root = process.argv[2] + '/prototypes/exploration/src/gen7/';
const bad = /(^|\/)(levels|place|places|hold|decor|world7)\.mjs$/;
const seen = new Set(), hits = [], q = [root + 'region.mjs'];
while (q.length) {
  const f = q.pop(); if (seen.has(f)) continue; seen.add(f);
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|^\s*import\s+['"](\.[^'"]+)['"]/gm)) {
    const spec = m[1] || m[2]; if (!spec.endsWith('.mjs')) continue; const t = path.resolve(path.dirname(f), spec);
    if (bad.test(t)) hits.push(path.basename(f) + ' -> ' + path.basename(t)); else q.push(t);
  }
}
console.log(JSON.stringify({ visited: [...seen].map(f => path.relative(root, f)), tileImports: hits }));
process.exit(hits.length ? 1 : 0);
