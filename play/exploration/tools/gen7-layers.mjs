// Writes art/gen7/layers.json: the dual grid's layer descriptors of the tile set generator 7 bakes with (places/src/setload.mjs layerDescriptors), which read the set's pictures and so run in Node only.
// The page bakes a cell in the browser (src/gen7/bake7.mjs) from this file and the tile set's .mbtiles. Run when the set changes:  node tools/gen7-layers.mjs
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { bakeCtx } from './gen7-render.mjs';

const SET = 'ninja-test', ctx = bakeCtx(), desc = ctx.layersOf.get(SET);
// the one table of ground pairs (set.json groundPairs, which the generator reads) must be drawable by the layers: for each pair the higher ground has an edge over the lower
const val = new Map(ctx.terrains.map(t => [t.id, t.value])), z = new Map(ctx.terrains.map(t => [t.value, t.z])), name = new Map(ctx.terrains.map(t => [t.value, t.id]));
const drawn = v => { while (desc.layers.get(v)?.drawAs !== undefined) v = desc.layers.get(v).drawAs; return v; };   // a ground drawn as another (path-top as the path) is checked as that one
for (const [a, b] of JSON.parse(readFileSync(new URL('../../../art/places/sets/ninja-test/set.json', import.meta.url), 'utf8')).groundPairs) {
  const va = drawn(val.get(a)), vb = drawn(val.get(b)); if (va === vb) continue;   // two grounds drawn as one (a ford beside the path) need no edge
  const [hi, lo] = z.get(va) > z.get(vb) ? [va, vb] : [vb, va];
  if (!desc.layers.get(hi)?.kinds.some(k => k.lowers.has(lo))) throw new Error(`groundPairs: ${name.get(hi)} has no edge over ${name.get(lo)} in the set's layers`);
}
const out = { set: SET, layers: [...desc.layers].map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: [...k.lowers], ...(k.mix ? { mix: { sw: [...k.mix.sw], se: [...k.mix.se] } } : {}) })) }]), tone: desc.tone };
mkdirSync(new URL('../art/gen7/', import.meta.url), { recursive: true });
writeFileSync(new URL('../art/gen7/layers.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('layers', out.layers.length);
