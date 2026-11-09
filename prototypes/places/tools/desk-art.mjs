// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commits (git show), never the desk's live folder, copied
// byte for byte, and listed with their sha256 in the set's DESK.json.
//   Open edges (mibi-art abb33a65b, art-jobs/2026-11-09-open-edges/out/): the cliff, thicket, scrub and deep-water pairs, the cliff's tall sheets (~s1..~s3) and way-up pieces, the scrub variants,
//   the reed-bank look of the two shores.
//   Meadow decor (mibi-art 5734abc5, art-jobs/2026-11-09-meadow-decor/out/): the small flowers and tufts, which replace the kit's sunflowers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng } from '../src/png.mjs';

const DESK = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
export const EDGES = { commit: 'abb33a65b', dir: 'art-jobs/2026-11-09-open-edges/out' }, DECOR = { commit: '5734abc5', dir: 'art-jobs/2026-11-09-meadow-decor/out' };
export const DECOR_NAMES = ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'tuft-fan', 'tuft-lean', 'tuft-small', 'clump-tall'];
const show = (c, p) => execFileSync('git', ['-C', DESK, 'show', `${c.commit}:${c.dir}/${p}`], { maxBuffer: 1 << 26 });

// Returns { files: Map(name -> Buffer) the placed files, images: Map(name -> image), pairs, looks, decals: { name: image }, desk } (desk: the DESK.json object).
export function deskArt() {
  const files = new Map(), desk = {};
  const place = (c, name, as = name) => { const b = show(c, name); files.set(as, b); desk[as] = { commit: c.commit, from: `${c.dir}/${name}`, sha256: createHash('sha256').update(b).digest('hex') }; return as; };
  const pairs = [], pair = (id, upper, lower, o = {}) => ({ id, lower, upper, mode: 'opaque', sheets: [place(EDGES, `pair-${id}.png`)], ...o, fullSheet: place(EDGES, `pair-${id}-full.png`) });
  for (const g of ['grass', 'sand']) {
    pairs.push({ ...pair(`cliff-${g}`, 'cliff', g), tall: { 1: place(EDGES, `pair-cliff-${g}~s1.png`), 2: place(EDGES, `pair-cliff-${g}~s2.png`), 3: place(EDGES, `pair-cliff-${g}~s3.png`) }, wayup: place(EDGES, `wayup-cliff-${g}.png`) });
    pairs.push(pair(`thicket-${g}`, 'thicket', g));
    pairs.push({ ...pair(`scrub-${g}`, 'scrub', g), variants: [1, 2, 3].map((v) => place(EDGES, `pair-scrub-${g}~v${v}.png`)) });
  }
  const frames = (base) => [place(EDGES, `${base}.png`), ...[1, 2, 3].map((f) => place(EDGES, `${base}@${f}.png`))];
  pairs.push({ id: 'deep-water', lower: 'water', upper: 'deep', mode: 'opaque', sheets: frames('pair-deep-water'), frameMs: 250, fullSheet: place(EDGES, 'pair-deep-water-full.png') });
  // the reed bank: an alternate look of the kit's two shores, three variants each (the bake picks one per dual tile by hash)
  const looks = [{ id: 'reeds', of: Object.fromEntries(['grass-water', 'sand-water'].map((p) => [p, ['', '~v1', '~v2'].map((v) => frames(`pair-${p}~reeds${v}`))])) }];
  const decals = {};
  for (const n of DECOR_NAMES) decals[n] = decodePng(show(DECOR, `${n}@16.png`)), place(DECOR, `${n}@16.png`, `desk-decor-${n}@16.png`);
  const images = new Map([...files].filter(([n]) => n.endsWith('.png') && !n.startsWith('desk-decor-')).map(([n, b]) => [n, decodePng(b)]));
  return { files, images, pairs, looks, decals, desk };
}
