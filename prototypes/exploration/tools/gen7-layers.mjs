// Writes art/gen7/layers.json: the dual grid's layer descriptors of the tile set generator 7 bakes with (places/src/setload.mjs layerDescriptors), which read the set's pictures and so run in Node only.
// The page bakes a cell in the browser (src/bake7.mjs) from this file and the tile set's .mbtiles. Run when the set changes:  node tools/gen7-layers.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { bakeCtx } from './gen7-render.mjs';

const SET = 'ninja-test', desc = bakeCtx().layersOf.get(SET);
const out = { set: SET, layers: [...desc.layers].map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: [...k.lowers] })) }]), tone: desc.tone };
mkdirSync(new URL('../art/gen7/', import.meta.url), { recursive: true });
writeFileSync(new URL('../art/gen7/layers.json', import.meta.url), JSON.stringify(out) + '\n');
console.log('layers', out.layers.length);
