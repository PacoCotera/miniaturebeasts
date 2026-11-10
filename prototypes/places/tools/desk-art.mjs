// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commits (git show), never the desk's live folder, copied
// byte for byte, and listed with their sha256 in the set's DESK.json.
//   Open edges (mibi-art abb33a65b, art-jobs/2026-11-09-open-edges/out/): the way-up pieces of the cliff (the kit's opaque 3 x 2 sheets, wayup-cliff-grass and wayup-cliff-sand).
//   Meadow decor (mibi-art 5734abc5, art-jobs/2026-11-09-meadow-decor/out/): the small flowers and tufts, which replace the kit's sunflowers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { decodePng, encodePng, crop } from '../src/png.mjs';

const DESK = process.env.MIBI_ART_REPO || '/home/mb/mb/mibi-art';
export const EDGES = { commit: 'abb33a65b', dir: 'art-jobs/2026-11-09-open-edges/out' }, DECOR = { commit: '5734abc5', dir: 'art-jobs/2026-11-09-meadow-decor/out' };
export const DECOR_NAMES = ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three', 'tuft-fan', 'tuft-lean', 'tuft-small', 'clump-tall'];
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
  const fillFrom = (c, src, as) => rec(c, as, `${c.dir}/${src}#15`, Buffer.from(encodePng(slot15(decodePng(show(c, src))))));
  const reeds = (suffix, as) => rec(SAND, as, `${SAND.dir}/sets/pair-sand-water~reeds${suffix}.png minus ${SAND.dir}/sets/pair-sand-water.png`,
    Buffer.from(encodePng(reedPixels(decodePng(show(SAND, `sets/pair-sand-water~reeds${suffix}.png`)), decodePng(show(SAND, 'sets/pair-sand-water.png'))))));
  const layers = {
    deep: { fill: { sheets: [fillFrom(SAND, 'sets/pair-deep-water.png', 'fill-deep.png')] } },
    water: { fill: { sheets: [fillFrom(SAND, 'layers/water-over.png', 'fill-water.png')] }, over: [{ kind: 'step', lowers: ['deep'], sheets: [place(SAND, 'layers/water-over.png', 'over-water.png')] }] },
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
    scrub: { drawAs: 'grass' },
    thicket: {
      fill: { sheets: [place(THICKET, 'over-thicket-full.png', 'fill-thicket.png')] },
      over: [{ kind: 'rim', lowers: ['earth', 'sand', 'mud', 'path', 'grass', 'scrub'], sheets: [keyed(THICKET, 'over-thicket.png', 'over-thicket.png')] }],
    },
    cliff: {
      fill: { sheets: [rec(CLIFF3, 'fill-cliff.png', `${CLIFF3.dir}/over-cliff.png#15`, Buffer.from(encodePng(slot15(keyShade(decodePng(show(CLIFF3, 'over-cliff.png')))))))] },
      over: [{
        kind: 'bank', lowers: ['earth', 'sand', 'path', 'grass'], sheets: [keyed(CLIFF3, 'over-cliff.png', 'over-cliff.png')],
        tall: { 1: [keyed(CLIFF3, 'over-cliff~s1.png', 'over-cliff~s1.png')], 2: [keyed(CLIFF3, 'over-cliff~s2.png', 'over-cliff~s2.png')], 3: ['over-cliff~s3.png', 'over-cliff-face2~s3.png', 'over-cliff-face3~s3.png'].map((n) => keyed(CLIFF3, n, n)) },
        wayup: { grass: place(EDGES, 'wayup-cliff-grass.png', 'wayup-cliff-grass.png'), sand: place(EDGES, 'wayup-cliff-sand.png', 'wayup-cliff-sand.png') },
      }],
    },
  };
  const tone = { of: 'grass', sheets: [place(MEADOW1, 'layers/grass-tone.png', 'tone-grass.png')] };
  const images = new Map([...files].map(([n, b]) => [n, decodePng(b)]));
  return { files, images, layers, tone, desk };
}

// Returns { files: Map(name -> Buffer) the placed files, decals: { name: image }, desk } (desk: the DESK.json object): the meadow decor.
export function deskArt() {
  const files = new Map(), desk = {};
  const place = (c, name, as = name) => { const b = show(c, name); files.set(as, b); desk[as] = { commit: c.commit, from: `${c.dir}/${name}`, sha256: createHash('sha256').update(b).digest('hex') }; return as; };
  const decals = {};
  for (const n of DECOR_NAMES) decals[n] = decodePng(show(DECOR, `${n}@16.png`)), place(DECOR, `${n}@16.png`, `desk-decor-${n}@16.png`);
  return { files, decals, desk };
}
