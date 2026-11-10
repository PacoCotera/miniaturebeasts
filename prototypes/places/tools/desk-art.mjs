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
export const SAND = applied('art-paint-terrain-sand', ''), MEADOW1 = applied('art-paint-terrain-meadow', ''), MEADOW2 = MEADOW1, THICKET = applied('art-paint-terrain-thicket', 'tiles');
export const CLIFF3 = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-terrain-cliff/out/tiles' };   // the cliff sheets are the re-cut ones (tools/recut); the commit and folder are the label of their source
export const SCRUBJOB = applied('art-paint-terrain-thicket', 'tiles'), RIPPLE = applied('art-paint-water-ripple', 'tiles');
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
    // scrub (mibi-art 34a8dc49c): the olive flat ground over the grass beneath it (its paint has gaps; the grass fill shows through), three variants of the sheet and the slot-15 strip
    scrub: {
      ground: 'grass',
      over: [{
        kind: 'flat', lowers: ['earth', 'sand', 'mud', 'path', 'grass'], sheets: [scrubPlace('over-scrub.png', 'over-scrub.png')],
        full: scrubPlace('over-scrub-full.png', 'over-scrub-full.png'),
        variants: ['~v1', '~v2', '~v3'].map((v) => scrubPlace(`over-scrub${v}.png`, `over-scrub${v}.png`)),
      }],
    },
    thicket: {
      fill: { sheets: [place(THICKET, 'over-thicket-full.png', 'fill-thicket.png')] },
      over: [{ kind: 'rim', lowers: ['earth', 'sand', 'mud', 'path', 'grass', 'scrub'], sheets: [keyed(THICKET, 'over-thicket.png', 'over-thicket.png')] }],
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
    'tree-broad': 'tree-trunk', 'tree-autumn': 'tree-trunk', 'bush-big': 'bush-round', 'bush-round': 'bush-round', 'bush-small': 'bush-round', 'boulder-brown': 'rock', 'boulder-grey': 'rock', stump: 'stump',
    'tree-hollow': 'hollow-tree', 'split-stone': 'split-stone', 'shrub-1': 'shrub-1', 'shrub-2': 'shrub-2', 'shrub-3': 'shrub-3', 'shrub-4': 'shrub-4',
  },
  sweeps: { 'tall-grass': 'tufts-2', 'tall-grass-m': 'tufts-2-m', 'tall-grass-b': 'tufts-3', 'tall-grass-bm': 'tufts-3-m' },
  decals: {
    'tuft-fan': 'tufts-1', tuft: 'tufts-1', 'tuft-lean': 'tufts-2', 'tuft-small': 'tufts-3',
    'flower-pink-three': 'flowers-1', 'flower-daisy': 'flowers-2', 'flower-daisy-pair': 'flowers-2', 'flower-buttercup': 'flowers-3', 'flower-blue-pair': 'flowers-blue-pair',
    'clump-tall': 'clump-tall', 'clump-tall-m': 'clump-tall-m', 'clump-tall-s': 'clump-tall-s', 'clump-tall-sm': 'clump-tall-s-m',
    'pebbles-a': 'pebbles-a', 'pebbles-b': 'pebbles-b', 'pebbles-c': 'pebbles-c', 'lily-pad': 'lily-pad', 'lily-pad-flower': 'lily-pad-flower',
    ...Object.fromEntries([0, 1, 2, 3, 4, 5].flatMap((k) => [[`fleck-${k}`, `fleck-${k}`], [`fleck-${k}m`, `fleck-${k}-m`]])),
  },
  reeds: Object.fromEntries(['shore-1', 'shore-2', 'shore-3', 'shore-4', 'water-1', 'water-2'].flatMap((n) => [[`reed-${n}`, `reed-${n}`], [`reed-${n}m`, `reed-${n}-m`]])),
};
export function deskArt() {
  const files = new Map(), desk = {}, manifest = JSON.parse(show(P2, 'manifest.json')), seen = new Map();
  const piece = (key) => {   // one signed piece: its bytes (written once, under the manifest key), the image and the foot
    const m = manifest[key];
    if (!m) throw new Error(`p2 manifest has no piece ${key}`);
    const file = `${key}.png`;
    if (!seen.has(key)) {
      const b = show(P2, path.posix.basename(m.file)), im = decodePng(b);
      if (im.w !== m.size[0] || im.h !== m.size[1]) throw new Error(`${key}: the file is ${im.w} x ${im.h}, the manifest says ${m.size.join(' x ')}`);
      files.set(file, b); desk[file] = { commit: P2.commit, from: `${P2.dir}/${path.posix.basename(m.file)}`, size: m.size, foot: m.foot, sha256: createHash('sha256').update(b).digest('hex') };
      seen.set(key, { image: im, anchor: [m.foot[0], m.foot[1]] });
    }
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
  for (const [n, key] of Object.entries(DECOR_SOURCES.sweeps)) props[n] = { ...piece(key), footprint: [] };   // sweeps of tall grass block nothing
  for (const [n, key] of Object.entries(DECOR_SOURCES.decals)) decals[n] = { ...piece(key) };
  for (const [n, key] of Object.entries(DECOR_SOURCES.reeds)) props[n] = { ...piece(key), footprint: [] };   // a prop with no footprint: it sorts with the walkers and blocks nothing
  return { files, props, canopy, decals, desk };
}
