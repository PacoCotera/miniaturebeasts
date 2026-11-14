// Writes art/gen7/layers.json: the dual grid's layer descriptors of the tile set generator 7 bakes with (places/src/setload.mjs layerDescriptors), which read the set's pictures and so run in Node only.
// The page bakes a cell in the browser (src/bake7.mjs) from this file and the tile set's .mbtiles. Run when the set changes:  node tools/gen7-layers.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { bakeCtx } from './gen7-render.mjs';

const SET = 'ninja-test', ctx = bakeCtx(), desc = ctx.layersOf.get(SET);
// the one table of ground pairs (set.json groundPairs, which the generator reads) must be drawable by the layers: for each pair the higher ground has an edge over the lower
const val = new Map(ctx.terrains.map(t => [t.id, t.value])), z = new Map(ctx.terrains.map(t => [t.value, t.z]));
for (const [a, b] of JSON.parse(readFileSync(new URL('../../../art/places/sets/ninja-test/set.json', import.meta.url), 'utf8')).groundPairs) {
  const [hi, lo] = z.get(val.get(a)) > z.get(val.get(b)) ? [a, b] : [b, a];
  if (!desc.layers.get(val.get(hi))?.kinds.some(k => k.lowers.has(val.get(lo)))) throw new Error(`groundPairs: ${hi} has no edge over ${lo} in the set's layers`);
}
const out = { set: SET, layers: [...desc.layers].map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: [...k.lowers] })) }]), tone: desc.tone };
mkdirSync(new URL('../art/gen7/', import.meta.url), { recursive: true });
writeFileSync(new URL('../art/gen7/layers.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('layers', out.layers.length);
