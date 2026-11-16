// place-walk-3: the decor figures of one seed (every cell), the trees per biome and the totals: PW_REGROW=0.3 node place-walk-decor-seed.mjs <seed>
import { decorProps } from './gen7-decor-props.mjs';
const s = decorProps(+process.argv[2]);
const out = {}; for (const [b, o] of Object.entries(s.perBiome)) if (o.trees) out[b] = o.trees;
console.log(JSON.stringify({ regrow: process.env.PW_REGROW, trees: out }));
