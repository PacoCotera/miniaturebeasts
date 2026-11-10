// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commits (git show), never the desk's live folder, copied
// byte for byte, and listed with their sha256 in the set's DESK.json.
//   Open edges (mibi-art abb33a65b, art-jobs/2026-11-09-open-edges/out/): the way-up pieces of the cliff (the kit's opaque 3 x 2 sheets, wayup-cliff-grass and wayup-cliff-sand).
//   Map decor (terrain-layers-c, art director route A): the tree, bush, rock and tufts of the signed map look (see deskArt); the kit's tree, bush, boulder and tuft names stay in the set and draw these
//   pieces, so the hand-set places and the generator need no new names. The flowers and the tall clump are named empty slots (a transparent sprite) until the desk's decor job paints them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, crop, paste, newImage } from '../src/png.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const DESK = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
export const EDGES = { commit: 'abb33a65b', dir: 'art-jobs/2026-11-09-open-edges/out' };
// the map look (art director route A): tree and bush from style test 3 (mibi-art 662fca36d), rock and tufts from the style test's route A props (003ee9598), shrubs and scrub from the thicket job (34a8dc49c)
export const TEST3 = { commit: '662fca36d', dir: 'art-jobs/2026-11-10-art-style-test-3/out/tiles' }, ROUTE_A = { commit: '003ee9598', dir: 'art-jobs/2026-11-10-art-style-test/out/route-a/props' };
export const SCRUBJOB = { commit: '34a8dc49c', dir: 'art-jobs/2026-11-10-art-paint-terrain-thicket/out/tiles' }, RIPPLE = { commit: 'af25a3017', dir: 'art-jobs/2026-11-10-art-paint-water-ripple/out/tiles' };
export const EMPTY_SLOTS = ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'clump-tall'];
export const TUFT_NAMES = ['tuft-fan', 'tuft-lean', 'tuft-small'], SHRUBS = ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4'];
const show = (c, p) => execFileSync('git', ['-C', DESK, 'show', `${c.commit}:${c.dir}/${p}`], { maxBuffer: 1 << 26 });

//   Terrain layers (set.json `layers`; sand job mibi-art 4e21bd68f, meadow 386ed11fa and b60587b26): the water, earth, sand, mud, path and grass layers, the grass tone layer and the fills. A
//   fill is slot 15 of a signed sheet, cropped without a changed pixel and recorded as `from: <sheet>#15`; the reed look of the sand beach is the pixels of the signed reed composites that differ from the
//   signed plain beach composite (`from: <reeds> minus <plain>`), transparent elsewhere. The builder makes no pixel.
export const SAND = { commit: '4e21bd68f', dir: 'art-jobs/2026-11-10-art-paint-terrain-sand/out' }, MEADOW1 = { commit: '386ed11fa', dir: 'art-jobs/2026-11-10-art-paint-terrain-meadow/out' }, MEADOW2 = { commit: 'b60587b26', dir: 'art-jobs/2026-11-10-art-paint-terrain-meadow/out' };
//   Thicket (mibi-art e43e480ac) and cliff (mibi-art c335654cc), art director's ruling 2026-11-09: every pixel with alpha under 255 in their over sheets becomes transparent (the soft cast shade goes; the
//   opaque undersides and face shading stay), recorded as `from: <sheet> keyed`. The thicket fill is its full strip (4 variants); the cliff top is slot 15 of the plain over-cliff sheet.
export const THICKET = { commit: 'e43e480ac', dir: 'art-jobs/2026-11-10-art-paint-terrain-thicket/out/tiles' }, CLIFF3 = { commit: 'c335654cc', dir: 'art-jobs/2026-11-10-art-paint-terrain-cliff/out/tiles' };
const T = 16;

// The sheet with every pixel of alpha under 255 made fully transparent (colour cleared too).
export function keyShade(img) {
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) };
  for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3] < 255) out.data.fill(0, i, i + 4);
  return out;
}

// The pixels of slot 15 (the all-upper tile) of a 4 x 4 sheet, as a 16 x 16 image.
export function slot15(img) { return crop(img, 3 * T, 3 * T, T, T); }
// The pixels of `reeds` that differ from `plain` (both signed composites of one size), transparent where they agree.
export function reedPixels(reeds, plain) {
  const out = { w: reeds.w, h: reeds.h, data: new Uint8Array(reeds.data.length) };
  for (let i = 0; i < reeds.data.length; i += 4) {
    if (reeds.data[i] !== plain.data[i] || reeds.data[i + 1] !== plain.data[i + 1] || reeds.data[i + 2] !== plain.data[i + 2] || reeds.data[i + 3] !== plain.data[i + 3]) out.data.set(reeds.data.subarray(i, i + 4), i);
  }
  return out;
}

// Returns { files: Map(name -> Buffer), images: Map(name -> image), layers: the set.json `layers` block, tone, desk: the DESK.json entries } for the terrain layers.
// Thicket and cliff come keyed (the soft shade pixels, alpha 70 and 90, which the set contract of alpha 0 or 255 does not allow, are made transparent); scrub is drawn as grass until its over sheet is signed.
export function deskLayers() {
  const files = new Map(), desk = {};
  const rec = (c, name, from, b) => { files.set(name, b); desk[name] = { commit: c.commit, from, sha256: createHash('sha256').update(b).digest('hex') }; return name; };
  const place = (c, src, as) => rec(c, as, `${c.dir}/${src}`, show(c, src));
  const keyed = (c, src, as) => rec(c, as, `${c.dir}/${src} keyed`, Buffer.from(encodePng(keyShade(decodePng(show(c, src))))));
  // the cliff sheets re-cut from the desk's painted island (tools/recut/README.md), shade keyed as the desk's own are
  const recutImg = (src) => decodePng(readFileSync(path.join(here, 'recut', src)));
  const recut = (src, as) => rec(CLIFF3, as, `${CLIFF3.dir}/${src} recut (prototypes/places/tools/recut) keyed`, Buffer.from(encodePng(keyShade(recutImg(src)))));
  const fillFrom = (c, src, as) => rec(c, as, `${c.dir}/${src}#15`, Buffer.from(encodePng(slot15(decodePng(show(c, src))))));
  const reeds = (suffix, as) => rec(SAND, as, `${SAND.dir}/sets/pair-sand-water~reeds${suffix}.png minus ${SAND.dir}/sets/pair-sand-water.png`,
    Buffer.from(encodePng(reedPixels(decodePng(show(SAND, `sets/pair-sand-water~reeds${suffix}.png`)), decodePng(show(SAND, 'sets/pair-sand-water.png'))))));
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
        { kind: 'beach', lowers: ['deep', 'water'], sheets: [place(SAND, 'layers/sand_beach-over.png', 'over-sand-beach.png')], looks: { reeds: ['', '~v1', '~v2'].map((v) => [reeds(v, `looks-reeds-sand-beach${v}.png`)]) } },
        { kind: 'flat', lowers: ['earth'], sheets: [place(SAND, 'layers/sand_flat-over.png', 'over-sand-flat.png')] },
      ],
    },
    mud: { fill: { sheets: [place(SAND, 'layers/fill-mud.png', 'fill-mud.png')] }, over: [{ kind: 'flat', lowers: ['deep', 'water', 'earth', 'sand'], sheets: [place(SAND, 'layers/mud-over.png', 'over-mud.png')] }] },
    path: { fill: { sheets: [fillFrom(MEADOW2, 'layers/path-over.png', 'fill-path.png')] }, over: [{ kind: 'bank', lowers: ['deep', 'water'], sheets: [place(MEADOW2, 'layers/path-over.png', 'over-path.png')] }] },
    grass: {
      fill: { sheets: [fillFrom(MEADOW1, 'layers/grass-over.png', 'fill-grass.png')] },
      over: [
        { kind: 'bank', lowers: ['deep', 'water'], sheets: [place(MEADOW1, 'layers/grass-over.png', 'over-grass-bank.png')], looks: { reeds: [] } },
        { kind: 'flat', lowers: ['earth', 'sand', 'mud', 'path'], sheets: [place(MEADOW2, 'layers/grass-flat.png', 'over-grass-flat.png')] },
      ],
    },
    // scrub (mibi-art 34a8dc49c): the olive flat ground over the grass beneath it (its paint has gaps; the grass fill shows through), three variants of the sheet and the slot-15 strip
    scrub: {
      ground: 'grass',
      over: [{
        kind: 'flat', lowers: ['earth', 'sand', 'mud', 'path', 'grass'], sheets: [place(SCRUBJOB, 'over-scrub.png', 'over-scrub.png')],
        full: place(SCRUBJOB, 'over-scrub-full.png', 'over-scrub-full.png'),
        variants: ['~v1', '~v2', '~v3'].map((v) => place(SCRUBJOB, `over-scrub${v}.png`, `over-scrub${v}.png`)),
      }],
    },
    thicket: {
      fill: { sheets: [place(THICKET, 'over-thicket-full.png', 'fill-thicket.png')] },
      over: [{ kind: 'rim', lowers: ['earth', 'sand', 'mud', 'path', 'grass', 'scrub'], sheets: [keyed(THICKET, 'over-thicket.png', 'over-thicket.png')] }],
    },
    cliff: {
      fill: { sheets: [rec(CLIFF3, 'fill-cliff.png', `${CLIFF3.dir}/over-cliff.png#15 recut`, Buffer.from(encodePng(slot15(keyShade(recutImg('over-cliff.png'))))))] },
      over: [{
        kind: 'bank', lowers: ['earth', 'sand', 'path', 'grass'], sheets: [recut('over-cliff.png', 'over-cliff.png')],
        tall: { 1: [recut('over-cliff~s1.png', 'over-cliff~s1.png')], 2: [recut('over-cliff~s2.png', 'over-cliff~s2.png')], 3: ['over-cliff~s3.png', 'over-cliff-face2~s3.png', 'over-cliff-face3~s3.png'].map((n) => recut(n, n)) },
        wayup: { grass: place(EDGES, 'wayup-cliff-grass.png', 'wayup-cliff-grass.png'), sand: place(EDGES, 'wayup-cliff-sand.png', 'wayup-cliff-sand.png') },
      }],
    },
  };
  const tone = { of: 'grass', also: ['cliff'], sheets: [place(MEADOW1, 'layers/grass-tone.png', 'tone-grass.png')] };
  const images = new Map([...files].map(([n, b]) => [n, decodePng(b)]));
  return { files, images, layers, tone, desk };
}

// The tree is cut in two at this row of the signed 36 x 41 picture: the crown above (the canopy, drawn over the explorer) and the trunk with its ground shadow below (the prop). A crop, no pixel changed.
export const TREE_SPLIT = 32;
// Returns { files: Map(name -> Buffer) the placed files, props, canopy, decals: { name: { image, anchor, footprint?, canopy? } }, desk } (desk: the DESK.json object): the map decor.
//   tree-broad and tree-autumn (and their crowns) both draw the signed tree, bush-big, bush-round and bush-small the signed bush, boulder-brown and boulder-grey the signed rock, tuft-fan, tuft-lean, tuft-small
//   (and the kit's `tuft`) the three signed tufts: the names stay so the hand-set places and the generator are unchanged. shrub-1..4 are the scrub shrubs. EMPTY_SLOTS are transparent sprites until painted.
export function deskArt() {
  const files = new Map(), desk = {};
  const rec = (c, as, from, b) => { files.set(as, b); desk[as] = { commit: c.commit, from, sha256: createHash('sha256').update(b).digest('hex') }; return decodePng(b); };
  const place = (c, name, as) => rec(c, as, `${c.dir}/${name}`, show(c, name));
  const cut = (c, name, as, y, h, what) => { const src = decodePng(show(c, name)); return rec(c, as, `${c.dir}/${name} rows ${y}..${y + h - 1} (${what}, a crop)`, Buffer.from(encodePng(crop(src, 0, y, src.w, h)))); };
  const foot = (img, x = (img.w - 1) >> 1) => [x, img.h - 1];
  const props = {}, canopy = {}, decals = {};
  const tree = decodePng(show(TEST3, 'tree.png')), trunk = cut(TEST3, 'tree.png', 'tree-trunk.png', TREE_SPLIT, tree.h - TREE_SPLIT, 'trunk and shadow'), crown = cut(TEST3, 'tree.png', 'tree-crown.png', 0, TREE_SPLIT, 'crown');
  const footY = 37;   // the trunk's foot row in the whole picture
  for (const [n, c] of [['tree-broad', 'tree-broad-crown'], ['tree-autumn', 'tree-autumn-crown']]) {
    props[n] = { image: trunk, anchor: [18, footY - TREE_SPLIT], footprint: [[0, 0]], canopy: c };
    canopy[c] = { image: crown, anchor: [18, footY] };
  }
  const bush = place(TEST3, 'bush.png', 'bush.png');
  for (const n of ['bush-big', 'bush-round', 'bush-small']) props[n] = { image: bush, anchor: [12, 22], footprint: [[0, 0]] };
  const rock = place(ROUTE_A, 'rock-1.png', 'rock-1.png');
  for (const n of ['boulder-brown', 'boulder-grey']) props[n] = { image: rock, anchor: [11, 15], footprint: [[0, 0]] };
  const tufts = [1, 2, 3].map((k) => place(ROUTE_A, `tufts-${k}.png`, `tufts-${k}.png`));
  TUFT_NAMES.forEach((n, k) => { decals[n] = { image: tufts[k], anchor: [6, 12] }; });
  decals.tuft = { image: tufts[0], anchor: [6, 12] };
  for (const n of SHRUBS) { const im = place(SCRUBJOB, `${n}.png`, `${n}.png`); props[n] = { image: im, anchor: foot(im, 7), footprint: [[0, 0]] }; }
  for (const n of EMPTY_SLOTS) decals[n] = { image: newImage(16, 16), anchor: [8, 15] };
  return { files, props, canopy, decals, desk };
}
