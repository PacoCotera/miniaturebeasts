// One-off: the kit's sunflowers (flower-sun, flower-sun-small), out of proportion to the explorer, give way to the art desk's small flowers (mibi-art 5734abc5) in the levels that still carry them.
// One-for-one, same cell; the kind is picked by the cell, mostly daisies and buttercups, a pair or three now and then. Run once, then bake.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), dir = path.join(here, '..', '..', '..', 'art', 'places', 'ldtk', 'places');
const KINDS = ['flower-daisy', 'flower-buttercup', 'flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three'];
for (const f of readdirSync(dir).filter((n) => n.endsWith('.ldtkl'))) {
  const file = path.join(dir, f), L = JSON.parse(readFileSync(file, 'utf8')); let n = 0;
  for (const l of L.layerInstances) for (const e of l.entityInstances || []) {
    if (e.__identifier !== 'Decal') continue;
    const fi = e.fieldInstances.find((q) => q.__identifier === 'kind'); if (!/^flower-sun/.test(fi.__value)) continue;
    const k = KINDS[(e.__grid[0] * 7 + e.__grid[1] * 3) % KINDS.length]; fi.__value = k; fi.realEditorValues = [{ id: 'V_String', params: [k] }]; n++;
  }
  if (n) { writeFileSync(file, JSON.stringify(L, null, '\t') + '\n'); console.log(f, n, 'sunflowers retired'); }
}
