// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commit (git show), never the desk's live folder, copied
// byte for byte (or, where the desk has not re-issued a piece in the map palette, with the desk's own colour map applied, tools/recolour.mjs), and listed with their sha256 in the set's DESK.json.
//   Map palette (art director, mibi-art f1a9fe54e; commit 633e4d641 carries it): every map picture is the desk's recoloured copy in art-jobs/2026-11-10-art-recolour-map-palette/out/applied/<job>/<same path>.
//   Way up (mibi-art 1158b9710, art-jobs/2026-11-10-art-paint-wayup/out/): the way-up pieces of the cliff, wayup-cliff-grass and wayup-cliff-sand, painted in the map palette.
//   Water bits (mibi-art 3323aa85d): the pebbles and the lily pads.
//   Map decor, the walk's sprites (art director mb-74, mibi-art 75f1ff195, the p2 folder): every sprite at its signed 1x size with the manifest's foot (see deskArt); the kit's names stay in the set and draw these pieces,
//   so the hand-set places and the generator need no new names.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, crop, paste, newImage } from '../src/png.mjs';
import { recolour } from './recolour.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DESK = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
const DC = '633e4d641';   // mibi-art art/desk: the map palette (f1a9fe54e), the decor, the reeds, the grass flecks and the hollow tree and split stone
const APPLIED = 'art-jobs/2026-11-10-art-recolour-map-palette/out/applied';
const applied = (job, sub) => ({ commit: DC, dir: `${APPLIED}/${job}/out${sub ? '/' + sub : ''}` });
export const WAYUP = { commit: '704373a58', dir: `${APPLIED}/art-paint-wayup/out` };   // the way-up pieces (art director signed 2026-11-09 22:1x; the applied copies, art/desk 704373a58), 48 x 32, in the map palette; the sand one keeps its one painted sand tone #dfd387
// the walk's sprites at their signed 1x sizes (art director mb-74, mibi-art art/desk 75f1ff195, art-jobs/2026-11-10-art-fix-decor-edges/out/p2/, 77 pieces with mirrors): manifest.json gives each piece's file, size and foot
export const P2 = { commit: '75f1ff195', dir: 'art-jobs/2026-11-10-art-fix-decor-edges/out/p2' };
// the middle sizes of the flowers (14 tall) and tufts (10 tall), re-cut (art director, mibi-art art/desk cc712a83e, art-jobs/2026-11-10-art-recut-flowers-tufts-up/out/p3/): only the nine pieces its changed.json lists; every other p3 piece is the p2 piece
export const P3 = { commit: 'cc712a83e', dir: 'art-jobs/2026-11-10-art-recut-flowers-tufts-up/out/p3' };
export const P3_KEYS = ['flowers-1', 'flowers-2', 'flowers-3', 'flowers-blue-pair', 'tufts-1', 'tufts-2', 'tufts-2-m', 'tufts-3', 'tufts-3-m'];
// the young and grown steps of the plants (same commit, art-jobs/2026-11-10-art-quiet-ground/out/steps/, manifest.json there): <slot>-young and <slot>-grown, each with a -m mirror
export const STEPS = { commit: 'cc712a83e', dir: 'art-jobs/2026-11-10-art-quiet-ground/out/steps' };
// the signed rock family (art director, mibi-art art/desk ffa823829, art-jobs/2026-11-10-art-paint-rock-family/out/): the three boulder shapes (rock-a, rock-b, rock-big, each with a -m mirror), sizes and feet in out/manifest.json
export const ROCKS = { commit: 'ffa823829', dir: 'art-jobs/2026-11-10-art-paint-rock-family/out' };
// the plant slots the meadow scatter draws, by the manifest's slot names (each in three steps: young, the middle signed piece, grown)
export const PLANTS = ['flowers-1', 'flowers-2', 'flowers-3', 'flowers-blue-pair', 'tufts-1', 'tufts-2', 'tufts-3', 'clump-tall', 'clump-tall-s', 'shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'bush-round'];
export const BOULDERS = ['rock-a', 'rock-b', 'rock-big'];
export const SAND = applied('art-paint-terrain-sand', ''), MEADOW1 = applied('art-paint-terrain-meadow', ''), MEADOW2 = MEADOW1, THICKET = applied('art-paint-terrain-thicket', 'tiles');
export const CLIFF3 = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-terrain-cliff/out/tiles' };   // the cliff sheets are the re-cut ones (tools/recut); the commit and folder are the label of their source
export const SCRUBJOB = applied('art-paint-terrain-thicket', 'tiles'), RIPPLE = applied('art-paint-water-ripple', 'tiles');
// the biome grounds (art director, mibi-art art/desk 8c0ddc470, art-jobs/2026-11-10-art-biome-<family>/out/tiles/): leaf litter (Woods, Tallwood), dry grass (Thickets), short turf (Hills), scree (Cliffs, Highpools).
// Each is a 64 x 64 corner sheet over the grass and three 16 x 16 fills (v0, v1 and the rare detail v2), the desk's files byte for byte; the over sheet's name is the manifest's (dry grass: the phase 2 sheet).
export const BIOME_COMMIT = '8c0ddc470';
export const BIOMES = {
  litter: { job: 'leaflitter', stem: 'leaflitter', over: 'over-leaflitter.png' },
  drygrass: { job: 'drygrass', stem: 'drygrass', over: 'over-drygrass-p2.png' },
  turf: { job: 'turf', stem: 'turf', over: 'over-turf.png' },
  scree: { job: 'scree', stem: 'scree', over: 'over-scree.png' },
};
export const biomeDir = (b) => ({ commit: BIOME_COMMIT, dir: `art-jobs/2026-11-10-art-biome-${BIOMES[b].job}/out/tiles` });
// the biome decor (art director, mibi-art art/desk a6d2e0be4, art-jobs/2026-11-10-art-biome-<job>/out/p2/manifest.json, signed 2026-11-10): the files byte for byte; a piece's mirror is the manifest's own `mirror` file
// (named <piece>-m here), its foot flipped across the picture. Lichen and the cushion plant (scree) are not painted yet, and the tall tree is full-colour (over the palette): named empty slots, nothing is placed for them.
export const BIOME_DECOR = { commit: 'a6d2e0be4', jobs: { leaflitter: 'art-jobs/2026-11-10-art-biome-leaflitter/out/p2', drygrass: 'art-jobs/2026-11-10-art-biome-drygrass/out/p2', turf: 'art-jobs/2026-11-10-art-biome-turf/out/p2' } };
export const BIOME_DECALS = {
  leaflitter: ['leaf-loose-0', 'leaf-loose-1', 'leaf-loose-2', 'leaf-loose-3', 'leaf-loose-4', 'leaf-loose-5'],
  drygrass: ['dry-tufts-1', 'dry-tufts-2', 'dry-tufts-3', 'dry-tufts-1-m', 'dry-tufts-2-m', 'dry-tufts-3-m', 'shrub-thorn-a', 'shrub-thorn-a-m'],
  turf: ['tuft-wind', 'tuft-wind-m', 'shrub-heather', 'shrub-heather-m'],
};
export const BIOME_ROCKS = { turf: ['rock-turf', 'rock-turf-m'] };
// Held back by the set's palette (208 colours, 171 pinned or in use, the pieces above take the last 37): shrub-thorn-b (+10 colours), clump-seed (+10), dry-rock (+5). Each is a signed piece with its own straw tones
// outside the map palette; the art desk can snap them to it (or free colours) and they join by adding their names here.
export const SUNLIT ='#82b266';   // the map palette's `grass`, one sunlit step above the grass base #74a65d: the grass tone patches
export const SUNLIT_FROM = '#5e9357';
// the scrub ground (the desk's olive #589054, darker than the grass #74a65d, read as a hollow): the same value as the grass (luminance 143), drier and yellower (hue 80 degrees against the grass's 99)
export const SCRUB_FROM = '#589054', SCRUB_GROUND = '#82a05a';
const show = (c, p) => execFileSync('git', ['-C', DESK, 'show', `${c.commit}:${c.dir}/${p}`], { maxBuffer: 1 << 26 });
// the cliff re-cut sheets are the old-palette cut run again (tools/recut); the colour map brings them to the map palette
const T = 16;

// The sheet with every pixel of alpha under 255 made fully transparent (colour cleared too).
export function keyShade(img) {
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3] < 255) out.data.fill(0, i, i + 4);
  return out;
}
// The picture with colours replaced by others (a colour map: the tone layer's sunlit step, the scrub ground, the cattail browns). pairs: [[fromHex, toHex], ...]
export function mapColours(img, pairs) {
  const m = new Map(pairs.map(([f, t]) => [parseInt(f.slice(1), 16), parseInt(t.slice(1), 16)])), out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) {
    if (!out.data[i + 3]) continue;
    const t = m.get((out.data[i] << 16) | (out.data[i + 1] << 8) | out.data[i + 2]);
    if (t !== undefined) { out.data[i] = t >> 16; out.data[i + 1] = (t >> 8) & 255; out.data[i + 2] = t & 255; }
  }
  return out;
}
export const mapColour = (img, fromHex, toHex) => mapColours(img, [[fromHex, toHex]]);
// The pixels of slot 15 (the all-upper tile) of a 4 x 4 sheet, as a 16 x 16 image.
export function slot15(img) { return crop(img, 3 * T, 3 * T, T, T); }

// Returns { files: Map(name -> Buffer), images: Map(name -> image), layers: the set.json `layers` block, tone, desk: the DESK.json entries } for the terrain layers.
// Thicket and cliff come keyed (the soft shade pixels, alpha 70 and 90, which the set contract of alpha 0 or 255 does not allow, are made transparent).
export function deskLayers() {
  const files = new Map(), desk = {};
  const rec = (c, name, from, b) => { files.set(name, b); desk[name] = { commit: c.commit, from, sha256: createHash('sha256').update(b).digest('hex') }; return name; };
  const place = (c, src, as) => rec(c, as, `${c.dir}/${src}`, show(c, src));
  const scrubPlace = (src, as) => rec(SCRUBJOB, as, `${SCRUBJOB.dir}/${src} scrub ground (${SCRUB_FROM} to ${SCRUB_GROUND})`, Buffer.from(encodePng(mapColour(decodePng(show(SCRUBJOB, src)), SCRUB_FROM, SCRUB_GROUND))));
  const keyed = (c, src, as) => rec(c, as, `${c.dir}/${src} keyed`, Buffer.from(encodePng(keyShade(decodePng(show(c, src))))));
  // the cliff sheets re-cut from the desk's painted island (tools/recut/README.md), then the map palette's colour map, shade keyed as the desk's own are
  const recutImg = (src) => recolour(decodePng(readFileSync(path.join(here, 'recut', src))));
  const recut = (src, as) => rec(CLIFF3, as, `${CLIFF3.dir}/${src} recut (prototypes/places/tools/recut) recoloured keyed`, Buffer.from(encodePng(keyShade(recutImg(src)))));
  const fillFrom = (c, src, as) => rec(c, as, `${c.dir}/${src}#15`, Buffer.from(encodePng(slot15(decodePng(show(c, src))))));
  // water: four frames, each a strip of the four fill variants v0..v3 (v0 and v2 blank, v1 and v3 glinted), laid side by side, no pixel changed
  const frameStrip = (c, f, as) => {
    const srcs = [0, 1, 2, 3].map((v) => `fill-water-v${v}@${f}.png`), out = newImage(srcs.length * T, T);
    srcs.forEach((s, v) => paste(out, decodePng(show(c, s)), v * T, 0));
    return rec(c, as, srcs.map((s) => `${c.dir}/${s}`).join(' + '), Buffer.from(encodePng(out)));
  };
  // a biome ground: the fill is a strip of eight 16 x 16 tiles (v0 and v1 alternate, the rare detail v2 once: the dual grid picks a variant by hash, so v2 is one fill in eight), the over sheet the desk's file
  const BIOME_STRIP = [0, 1, 0, 1, 0, 1, 0, 2];
  const biome = (b, lowers) => {
    const c = biomeDir(b), s = BIOMES[b].stem, vs = ['', '~v1', '~v2'].map((v) => `fill-${s}${v}.png`), out = newImage(BIOME_STRIP.length * T, T);
    BIOME_STRIP.forEach((v, k) => paste(out, decodePng(show(c, vs[v])), k * T, 0));
    const fill = rec(c, `fill-${b}.png`, vs.map((v) => `${c.dir}/${v}`).join(' + ') + ` as the strip ${BIOME_STRIP.join(' ')} (layout)`, Buffer.from(encodePng(out)));
    return { fill: { sheets: [fill] }, over: [{ kind: 'flat', lowers, sheets: [place(c, BIOMES[b].over, `over-${b}.png`)] }] };
  };
  const ON = ['earth', 'sand', 'mud', 'path', 'grass'], ABOVE = ['litter', 'drygrass', 'turf', 'scree'];
  const layers = {
    deep: { fill: { sheets: [fillFrom(SAND, 'sets/pair-deep-water.png', 'fill-deep.png')] } },
    water: { fill: { sheets: [frameStrip(RIPPLE, 0, 'fill-water.png'), ...[1, 2, 3].map((f) => frameStrip(RIPPLE, f, `fill-water@${f}.png`))], frameMs: 250 }, over: [{ kind: 'step', lowers: ['deep'], sheets: [place(SAND, 'layers/water-over.png', 'over-water.png')] }] },
    earth: { fill: { sheets: [place(SAND, 'layers/fill-earth.png', 'fill-earth.png')] }, over: [{ kind: 'flat', lowers: ['deep', 'water'], sheets: [place(SAND, 'layers/earth-over.png', 'over-earth.png')] }] },
    sand: {
      fill: { sheets: [fillFrom(SAND, 'layers/sand_beach-over.png', 'fill-sand.png')] },
      over: [
        { kind: 'beach', lowers: ['deep', 'water'], sheets: [place(SAND, 'layers/sand_beach-over.png', 'over-sand-beach.png')] },
        { kind: 'flat', lowers: ['earth'], sheets: [place(SAND, 'layers/sand_flat-over.png', 'over-sand-flat.png')] },
      ],
    },
    mud: { fill: { sheets: [place(SAND, 'layers/fill-mud.png', 'fill-mud.png')] }, over: [{ kind: 'flat', lowers: ['deep', 'water', 'earth', 'sand'], sheets: [place(SAND, 'layers/mud-over.png', 'over-mud.png')] }] },
    path: { fill: { sheets: [fillFrom(MEADOW2, 'layers/path-over.png', 'fill-path.png')] }, over: [{ kind: 'bank', lowers: ['deep', 'water'], sheets: [place(MEADOW2, 'layers/path-over.png', 'over-path.png')] }] },
    grass: {
      fill: { sheets: [fillFrom(MEADOW1, 'layers/grass-over.png', 'fill-grass.png')] },
      over: [
        { kind: 'bank', lowers: ['deep', 'water'], sheets: [place(MEADOW1, 'layers/grass-over.png', 'over-grass-bank.png')] },
        { kind: 'flat', lowers: ['earth', 'sand', 'mud', 'path'], sheets: [place(MEADOW2, 'layers/grass-flat.png', 'over-grass-flat.png')] },
      ],
    },
    // the biome grounds, each a flat patch over the grass (and the other low ground)
    // draw order: dry grass, turf, then litter (the litter's frayed edge lies over them), then scree
    drygrass: biome('drygrass', ['grass']),
    turf: biome('turf', ['grass', 'drygrass']),
    litter: biome('litter', ['sand', 'grass', 'drygrass', 'turf']),
    scree: biome('scree', ['water', 'sand', 'grass', 'litter', 'drygrass', 'turf']),
    // scrub (mibi-art 34a8dc49c): the olive flat ground over the grass beneath it (its paint has gaps; the grass fill shows through), three variants of the sheet and the slot-15 strip
    scrub: {
      ground: 'grass',
      over: [{
        kind: 'flat', lowers: [...ON, ...ABOVE], sheets: [scrubPlace('over-scrub.png', 'over-scrub.png')],
        full: scrubPlace('over-scrub-full.png', 'over-scrub-full.png'),
        variants: ['~v1', '~v2', '~v3'].map((v) => scrubPlace(`over-scrub${v}.png`, `over-scrub${v}.png`)),
      }],
    },
    thicket: {
      fill: { sheets: [place(THICKET, 'over-thicket-full.png', 'fill-thicket.png')] },
      over: [{ kind: 'rim', lowers: [...ON, ...ABOVE, 'scrub'], sheets: [keyed(THICKET, 'over-thicket.png', 'over-thicket.png')] }],
    },
    cliff: {
      fill: { sheets: [rec(CLIFF3, 'fill-cliff.png', `${CLIFF3.dir}/over-cliff.png#15 recut recoloured`, Buffer.from(encodePng(slot15(keyShade(recutImg('over-cliff.png'))))))] },
      over: [{
        kind: 'bank', lowers: ['earth', 'sand', 'path', 'grass'], sheets: [recut('over-cliff.png', 'over-cliff.png')],
        tall: { 1: [recut('over-cliff~s1.png', 'over-cliff~s1.png')], 2: [recut('over-cliff~s2.png', 'over-cliff~s2.png')], 3: ['over-cliff~s3.png', 'over-cliff-face2~s3.png', 'over-cliff-face3~s3.png'].map((n) => recut(n, n)) },
        wayup: { grass: keyed(WAYUP, 'wayup-cliff-grass.png', 'wayup-cliff-grass.png'), sand: keyed(WAYUP, 'wayup-cliff-sand.png', 'wayup-cliff-sand.png') },   // keyed as the cliff sheets are (the soft cast shade made transparent, art director ruling 2026-11-09)
      }],
    },
  };
  // the tone layer: the desk's signed lipless grass tone, one colour map (its dark #5e9357 to the sunlit #82b266: a patch is lighter than the grass, never a hollow)
  const toneImg = mapColour(decodePng(show(MEADOW1, 'layers/grass-tone.png')), SUNLIT_FROM, SUNLIT);
  const tone = { of: 'grass', also: ['cliff'], sheets: [rec(MEADOW1, 'tone-grass.png', `${MEADOW1.dir}/layers/grass-tone.png sunlit (${SUNLIT_FROM} to ${SUNLIT})`, Buffer.from(encodePng(toneImg)))] };
  const images = new Map([...files].map(([n, b]) => [n, decodePng(b)]));
  return { files, images, layers, tone, desk };
}

// The walk's sprites, each at its signed 1x size (one art pixel to one screen pixel) with the foot the manifest names (art director mb-74, mibi-art 75f1ff195; manifest.json beside the files). Files are the desk's bytes,
// nothing is repainted, rescaled or recoloured; the mirrored copies are the desk's own files (`-m`, each with its own foot).
// Returns { files: Map(name -> Buffer) the placed files, props, canopy, decals: { name: { image, anchor, footprint?, canopy? } }, desk: the DESK.json object }.
//   The kit's names stay so the hand-set places and the generator are unchanged: tree-broad and tree-autumn (and their crowns) draw the one signed tree, cut in two at the manifest's split row (the crown keeps its canopy
//   role and its sort, the trunk stands on the ground); bush-big, bush-round and bush-small the round bush; boulder-brown and boulder-grey the rock; tuft-fan and tuft the first tuft, tuft-lean and tall-grass the second,
//   tuft-small and tall-grass-b the third (the sweeps of tall grass are still pictures, each as it is and mirrored); the five flowers the signed flowers; clump-tall the four signed tall clumps; shrub-1..4 the scrub
//   shrubs; fleck-0..5 (and fleck-Nm) the grass flecks; reed-* the reed sprites (and reed-*m); the water bits; the stump, the hollow tree and the split stone.
export const DECOR_SOURCES = {
  props: {
    'tree-broad': 'tree-trunk', 'tree-autumn': 'tree-trunk', 'bush-big': 'bush-round', 'bush-round': 'bush-round', 'bush-small': 'bush-round', 'boulder-brown': 'rock-b', 'boulder-grey': 'rock-a', stump: 'stump',
    ...Object.fromEntries(BOULDERS.flatMap((b) => [[b, b], [`${b}-m`, `${b}-m`]])),   // the three signed boulder shapes and their mirrors: what the generator's rocks are; the hand-set places' two kit names draw the first two
    'tree-hollow': 'hollow-tree', 'split-stone': 'split-stone', 'shrub-1': 'shrub-1', 'shrub-2': 'shrub-2', 'shrub-3': 'shrub-3', 'shrub-4': 'shrub-4',
  },
  sweeps: { 'tall-grass': 'tufts-2', 'tall-grass-m': 'tufts-2-m', 'tall-grass-b': 'tufts-3', 'tall-grass-bm': 'tufts-3-m' },
  decals: {
    'tuft-fan': 'tufts-1', tuft: 'tufts-1', 'tuft-lean': 'tufts-2', 'tuft-small': 'tufts-3',
    'flower-pink-three': 'flowers-1', 'flower-daisy': 'flowers-2', 'flower-daisy-pair': 'flowers-2', 'flower-buttercup': 'flowers-3', 'flower-blue-pair': 'flowers-blue-pair',
    'clump-tall': 'clump-tall', 'clump-tall-m': 'clump-tall-m', 'clump-tall-s': 'clump-tall-s', 'clump-tall-sm': 'clump-tall-s-m',
    'pebbles-a': 'pebbles-a', 'pebbles-b': 'pebbles-b', 'pebbles-c': 'pebbles-c', 'lily-pad': 'lily-pad', 'lily-pad-flower': 'lily-pad-flower',
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].flatMap((k) => [[`fleck-${k}`, `fleck-${k}`], [`fleck-${k}m`, `fleck-${k}-m`]])),
    // the meadow scatter's pieces (map-rules.json meadow.scatter): every plant slot in its three sizes, each with its mirror; named sc-<slot>[-young|-grown][-m] (the middle size is the signed p3 / p2 piece)
    ...Object.fromEntries(PLANTS.flatMap((s) => ['', '-young', '-grown'].flatMap((st) => ['', '-m'].map((m) => [`sc-${s}${st}${m}`, `${s}${st}${m}`])))),
  },
  reeds: Object.fromEntries(['shore-1', 'shore-2', 'shore-3', 'shore-4', 'water-1', 'water-2'].flatMap((n) => [[`reed-${n}`, `reed-${n}`], [`reed-${n}m`, `reed-${n}-m`]])),
};
export function deskArt() {
  const files = new Map(), desk = {}, manifest = JSON.parse(show(P2, 'manifest.json')), seen = new Map();
  const man = { p3: JSON.parse(show(P3, 'manifest.json')), steps: JSON.parse(show(STEPS, 'manifest.json')), rocks: JSON.parse(show(ROCKS, 'manifest.json')) };
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  // where a desk file lives: a step (young, grown) in the steps folder, the nine re-cut flowers and tufts in p3, the boulders in the rock family, every other piece in p2
  const bman = Object.fromEntries(Object.entries(BIOME_DECOR.jobs).map(([j, dir]) => [j, { S: { commit: BIOME_DECOR.commit, dir }, m: JSON.parse(show({ commit: BIOME_DECOR.commit, dir }, 'manifest.json')) }]));
  const biomeEntry = (key) => {   // a biome decor piece by name; a -m name is the manifest's own mirror file with the foot flipped across the picture
    const mir = key.endsWith('-m'), base = mir ? key.slice(0, -2) : key;
    for (const { S, m } of Object.values(bman)) {
      const r = m[base]; if (!r || !r.size) continue;
      if (mir && !r.mirror) return null;
      return { S, m: { size: r.size, foot: mir ? [r.size[0] - 1 - r.foot[0], r.foot[1]] : r.foot }, path: path.posix.basename(mir ? r.mirror : r.file) };
    }
    return null;
  };
  const entryOf = (key) => {
    const be = biomeEntry(key); if (be) return be;
    if (man.steps[key]) return { S: STEPS, m: man.steps[key], path: path.posix.basename(man.steps[key].file) };
    if (P3_KEYS.includes(key)) return { S: P3, m: man.p3[key], path: path.posix.basename(man.p3[key].file) };
    if (manifest[key]) return { S: P2, m: manifest[key], path: path.posix.basename(manifest[key].file) };
    const base = key.replace(/-m$/, ''), r = man.rocks[base];
    if (BOULDERS.includes(base) && r) {   // a boulder: its file (out/boulders/...); its mirror is the desk's own -m file, the foot flipped across the picture
      const mir = base !== key;
      return { S: ROCKS, m: { size: r.size, foot: mir ? [r.size[0] - 1 - r.foot[0], r.foot[1]] : r.foot }, path: (mir ? r.mirror : r.file).replace(/^out\//, '') };
    }
    return null;
  };
  const flipX = (im) => { const o = newImage(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) o.data.set(im.data.subarray((y * im.w + x) * 4, (y * im.w + x) * 4 + 4), (y * im.w + (im.w - 1 - x)) * 4); return o; };
  const piece = (key) => {   // one signed piece: its bytes (written once, under the manifest key), the image and the foot
    const file = `${key}.png`;
    if (seen.has(key)) return seen.get(key);
    const e = entryOf(key);
    if (e) {
      const b = show(e.S, e.path), im = decodePng(b), m = e.m;
      if (im.w !== m.size[0] || im.h !== m.size[1]) throw new Error(`${key}: the file is ${im.w} x ${im.h}, the manifest says ${m.size.join(' x ')}`);
      files.set(file, b); desk[file] = { commit: e.S.commit, from: `${e.S.dir}/${e.path}`, size: m.size, foot: m.foot, sha256: sha(b) };
      seen.set(key, { image: im, anchor: [m.foot[0], m.foot[1]] });
    } else if (key.endsWith('-m') && entryOf(key.slice(0, -2))) {   // a middle step the desk has no mirror file for: the signed picture flipped left to right (layout), the foot across the picture (the desk's manifests do the same for their -m pieces)
      const base = piece(key.slice(0, -2)), d = desk[`${key.slice(0, -2)}.png`], im = flipX(base.image), b = Buffer.from(encodePng(im));
      files.set(file, b); desk[file] = { commit: d.commit, from: `${d.from} flipped left to right (layout)`, size: d.size, foot: [im.w - 1 - base.anchor[0], base.anchor[1]], sha256: sha(b) };
      seen.set(key, { image: im, anchor: [im.w - 1 - base.anchor[0], base.anchor[1]] });
    } else throw new Error(`the desk's manifests have no piece ${key}`);
    return seen.get(key);
  };
  const props = {}, canopy = {}, decals = {};
  // the tree: the trunk (with its ground shadow) below the manifest's split row is the prop, the crown above it the canopy; the crown's foot is the foot in the whole tree
  const trunk = piece('tree-trunk'), crown = piece('tree-crown'), crownFoot = manifest['tree-crown'].canopy_anchor_in_full_tree;
  if (manifest['tree-trunk'].split_row !== crown.image.h) throw new Error('the tree is not cut at the split row');
  for (const [n, c] of [['tree-broad', 'tree-broad-crown'], ['tree-autumn', 'tree-autumn-crown']]) {
    props[n] = { ...trunk, footprint: [[0, 0]], canopy: c };
    canopy[c] = { image: crown.image, anchor: crownFoot };
  }
  for (const [n, key] of Object.entries(DECOR_SOURCES.props)) {
    if (n === 'tree-broad' || n === 'tree-autumn') continue;
    const p = piece(key);
    if (n === 'tree-hollow') props[n] = { ...p, footprint: [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1]] };   // footprints as the kit's
    else if (n === 'split-stone') props[n] = { ...p, footprint: [[-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]] };
    else props[n] = { ...p, footprint: [[0, 0]] };
  }
  // The tall tree (leaf litter job, tree-tall-crown and tree-tall-trunk) is NOT placed: the pieces are full-colour paint (1412 and 339 colours) and the set's palette holds 208; fitting them would mean recolouring
  // the signed art, which is the art desk's call. Named empty slot: tree-tall (Tallwood, about one grove tree in three).
  for (const k of Object.values(BIOME_ROCKS).flat()) props[k] = { ...piece(k), footprint: [[0, 0]] };
  for (const k of Object.values(BIOME_DECALS).flat()) decals[k] = { ...piece(k) };
  for (const [n, key] of Object.entries(DECOR_SOURCES.sweeps)) props[n] = { ...piece(key), footprint: [] };   // sweeps of tall grass block nothing
  for (const [n, key] of Object.entries(DECOR_SOURCES.decals)) decals[n] = { ...piece(key) };
  for (const [n, key] of Object.entries(DECOR_SOURCES.reeds)) props[n] = { ...piece(key), footprint: [] };   // a prop with no footprint: it sorts with the walkers and blocks nothing
  return { files, props, canopy, decals, desk };
}
