// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commit (git show), never the desk's live folder, copied
// byte for byte (or, where the desk has not re-issued a piece in the map palette, with the desk's own colour map applied, tools/recolour.mjs), and listed with their sha256 in the set's DESK.json.
//   Map palette (art director, mibi-art f1a9fe54e; commit 633e4d641 carries it): every map picture is the desk's recoloured copy in art-jobs/2026-11-10-art-recolour-map-palette/out/applied/<job>/<same path>.
//   Way up (mibi-art 1158b9710, art-jobs/2026-11-10-art-paint-wayup/out/): the way-up pieces of the cliff, wayup-cliff-grass and wayup-cliff-sand, painted in the map palette.
//   Water bits (mibi-art 3323aa85d): the pebbles and the lily pads.
//   Map decor, the walk's sprites (art director mb-74, mibi-art 75f1ff195, the p2 folder): every sprite at its signed 1x size with the manifest's foot (see deskArt); the kit's names stay in the set and draw these pieces,
//   so the hand-set places and the generator need no new names.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng, crop, paste, newImage, scaleNearest } from '../src/png.mjs';
import { recolour } from './recolour.mjs';
import { CORNER_HANDS, END_ROWS, FILL_KIND, RIM_N, cornerKind, endKind, rimKind, sideKind } from '../src/bake/southruns.mjs';

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
// the plant slots the meadow scatter draws, by the manifest's slot names (each in three steps: young, the middle signed piece, grown)
export const PLANTS = ['flowers-1', 'flowers-2', 'flowers-3', 'flowers-blue-pair', 'tufts-1', 'tufts-2', 'tufts-3', 'clump-tall', 'clump-tall-s', 'shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'bush-round'];
// the plain stone set (art director, mibi-art art/art-fix-map-pieces 9c902c7ec, art-jobs/2026-11-11-art-fix-map-pieces/out/a2 and a2b; reports runs/art-fix-map-pieces-a2 and -a2b): the two small stones and the stump (walk-over,
// 11 px or less; they take the names rock-a, rock-b and stump), and the three boulders A, D and E. The files are the desk's bytes (every mirror is the file flipped left to right by the post-step tool, flip h);
// size and foot are set here from the files (the desk's manifests do not list them): the foot is the last opaque row, centred (a mirror's foot is across the picture).
export const STONES = { commit: '9c902c7ec', dir: 'art-jobs/2026-11-11-art-fix-map-pieces/out' };
export const STONE_SET = {
  'rock-a': { path: 'a2/stone-small-plain@16.png', size: [16, 16], foot: [8, 15] },
  'rock-b': { path: 'a2/stone-small-b@16.png', size: [16, 16], foot: [8, 15] },
  stump: { path: 'a2/stump@16.png', size: [12, 11], foot: [6, 10] },
  'boulder-a': { path: 'a2/rock-big.png', size: [23, 23], foot: [11, 22] },
  'boulder-d': { path: 'a2b/boulder-d.png', size: [24, 13], foot: [12, 12] },
  'boulder-e': { path: 'a2b/boulder-e.png', size: [24, 18], foot: [12, 17] },
};
export const BOULDERS = ['boulder-a', 'boulder-d', 'boulder-e'];
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
// what blocks (owner notes 6 and 7; lead call 11-11 20:4x): every boulder (A, D, E and their mirrors) blocks, whatever its height, because a boulder looks solid; the split stone and the trunks block too. The small stones, the stump and the plants are stepped over or pushed through: no footprint.
export const STEP_OVER = ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'bush-big', 'bush-round', 'bush-small', 'rock-a', 'rock-a-m', 'rock-b', 'rock-b-m', 'boulder-grey', 'boulder-brown', 'stump', 'stump-m'];
export const STONE_DECALS = ['rock-a', 'rock-a-m', 'rock-b', 'rock-b-m', 'rock-turf', 'rock-turf-m'];
// the stone states' colour tables (art director's ruling 2026-11-12; the colour moves of the signed stone files, from the job scripts remapA2b, remapA3, remapA3b, remapA3c of
// art-jobs/2026-11-11-art-fix-map-pieces): [from, to] rows, every target a colour of the set palette. They go to palette.json as `stoneTables`; no file's pixels change.
export const STONE_TABLES = {
  'stone-tall-grey': { note: 'the plain tall stone onto the small stone\'s grey (remapA2b)', rows: [['#baa48e', '#beb2a2'], ['#a29686', '#8a937e'], ['#82796f', '#56634d'], ['#584b46', '#584b46']] },
  'stone-charged': { note: 'charged small and tall stone: one step darker and cooler, the painted cracks kept (remapA2b)', rows: [['#56634d', '#6c7682'], ['#5e6e60', '#6c7682'], ['#51574f', '#5a6470'], ['#3e422f', '#5a6470'], ['#2a3834', '#3e444e'], ['#242626', '#3e444e'], ['#141b1b', '#242626'], ['#9cc4f4', '#9cc4f4'], ['#cdeee6', '#cdeee6']] },
  'stone-charged-b': { note: 'charged small stone b, from the plain b; the cracks of small a\'s charged frame are copied by position where b has body (remapA3)', rows: [['#beb2a2', '#6c7682'], ['#c9b28c', '#6c7682'], ['#a29686', '#5a6470'], ['#82796f', '#3e444e'], ['#584b46', '#242626']] },
  'stone-warm-1': { note: 'warm small stones a and b, first frame: the lit tone only (remapA3b)', rows: [['#beb2a2', '#d2b37d'], ['#c9b28c', '#d2b37d']] },
  'stone-warm-2': { note: 'warm small stones a and b, second frame: the lit tone only (remapA3b)', rows: [['#beb2a2', '#e7cd86'], ['#c9b28c', '#e7cd86']] },
  'stone-tall-warm-1': { note: 'warm tall stone, first frame: the upper 8 of 24 rows only (remapA3c)', rows: [['#beb2a2', '#d2b37d'], ['#8a937e', '#b08a63']] },
  'stone-tall-warm-2': { note: 'warm tall stone, second frame: the upper 8 of 24 rows only (remapA3c)', rows: [['#beb2a2', '#e7cd86'], ['#8a937e', '#bd9460']] },
};
// Held back by the set's palette (208 colours, 171 pinned or in use, the pieces above take the last 37): shrub-thorn-b (+10 colours), clump-seed (+10), dry-rock (+5). Each is a signed piece with its own straw tones
// outside the map palette; the art desk can snap them to it (or free colours) and they join by adding their names here.
export const SUNLIT ='#82b266';   // the map palette's `grass`, one sunlit step above the grass base #74a65d: the grass tone patches
export const SUNLIT_FROM = '#5e9357';
// the scrub ground (the desk's olive #589054, darker than the grass #74a65d, read as a hollow): the same value as the grass (luminance 143), drier and yellower (hue 80 degrees against the grass's 99)
export const SCRUB_FROM = '#589054', SCRUB_GROUND = '#82a05a';
// the raised meadow ground (the art director's cliff-plateau-raised-1, mibi-art 2bc909714): the signed meadow fill and tone through the "raised" light table, day files, byte for byte
export const RAISED = { commit: '2bc909714', dir: 'art-jobs/2026-11-13-cliff-plateau-raised-1/work' };
// the south-face columns: the paid seam edit of cliff-fill-trial-2 (work/raw/step3-seam.png) -> six columns of the seamless strip, through the plain post-step chain; the files sit in the set folder with their sidecars
export const CORNER_FROM = 'art-jobs/2026-11-13-cliff-corner-scaffold-2/work/raw/corner-1.png';
export const SOUTH_COLUMNS = 6,SOUTH_FROM = 'art-jobs/2026-11-13-cliff-strip-angular-3/work/raw/step2-seam.png';
const SET_DIR = path.join(here, '..', '..', '..', 'art', 'places', 'sets', 'ninja-test');
const sha = (b) => createHash('sha256').update(b).digest('hex');
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

// THE table of which grounds may meet (set.json `groundPairs`): the pairs the generator may make (exploration/src/gen7/place.mjs reads it from set.json), each drawn by the layers' `lowers` below
// (tools/gen7-layers.mjs and the bake test refuse a pair the layers cannot draw). Sand under raised land is not in it: a raised region that meets both grass and sand is drawn two ways, which the bake refuses.
export const GROUND_PAIRS = [
  ['water', 'grass'], ['water', 'sand'], ['sand', 'grass'], ['path', 'grass'], ['water', 'mud'], ['grass', 'cliff'], ['grass', 'thicket'], ['grass', 'scrub'],
  ['sand', 'thicket'], ['sand', 'scrub'], ['deep', 'water'], ['grass', 'litter'], ['sand', 'litter'], ['thicket', 'litter'], ['grass', 'drygrass'], ['thicket', 'drygrass'], ['scrub', 'drygrass'],
  ['grass', 'turf'], ['thicket', 'turf'], ['scrub', 'turf'], ['grass', 'scree'], ['sand', 'scree'], ['thicket', 'scree'], ['scrub', 'scree'], ['water', 'scree'],
  ['litter', 'drygrass'], ['litter', 'turf'], ['litter', 'scree'], ['scrub', 'litter'], ['drygrass', 'turf'], ['drygrass', 'scree'], ['turf', 'scree'],
  ['cliff', 'litter'], ['cliff', 'drygrass'], ['cliff', 'turf'], ['cliff', 'scree'],
];

// Returns { files: Map(name -> Buffer), images: Map(name -> image), layers: the set.json `layers` block, tone, pairs: GROUND_PAIRS, desk: the DESK.json entries } for the terrain layers.
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
      fill: { sheets: [place(RAISED, 'fill-grass-raised-day.png', 'fill-cliff.png')] },   // the raised meadow ground: every raised cell that is no old face
      over: [{
        kind: 'bank', lowers: ['earth', 'sand', 'path', 'grass', 'litter', 'drygrass', 'turf', 'scree'], sheets: [recut('over-cliff.png', 'over-cliff.png')],
        tall: { 1: [recut('over-cliff~s1.png', 'over-cliff~s1.png')], 2: [recut('over-cliff~s2.png', 'over-cliff~s2.png')], 3: ['over-cliff~s3.png', 'over-cliff-face2~s3.png', 'over-cliff-face3~s3.png'].map((n) => recut(n, n)) },
        wayup: { grass: keyed(WAYUP, 'wayup-cliff-grass.png', 'wayup-cliff-grass.png'), sand: keyed(WAYUP, 'wayup-cliff-sand.png', 'wayup-cliff-sand.png') },   // keyed as the cliff sheets are (the soft cast shade made transparent, art director ruling 2026-11-09)
      }],
    },
  };
  // the tone layer: the desk's signed lipless grass tone, one colour map (its dark #5e9357 to the sunlit #82b266: a patch is lighter than the grass, never a hollow)
  const toneImg = mapColour(decodePng(show(MEADOW1, 'layers/grass-tone.png')), SUNLIT_FROM, SUNLIT);
  const tone = { of: 'grass', also: ['cliff'], sheets: [rec(MEADOW1, 'tone-grass.png', `${MEADOW1.dir}/layers/grass-tone.png sunlit (${SUNLIT_FROM} to ${SUNLIT})`, Buffer.from(encodePng(toneImg)))], raised: place(RAISED, 'tone-grass-raised-day.png', 'tone-grass-raised.png') };
  const images = new Map([...files].map(([n, b]) => [n, decodePng(b)]));
  return { files, images, layers, tone, pairs: GROUND_PAIRS, desk };
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
    ...Object.fromEntries([...BOULDERS, 'rock-a', 'rock-b'].flatMap((b) => [[b, b], [`${b}-m`, `${b}-m`]])),   // the three signed boulders and the two small stones, each with its mirror: the boulders are what the generator's rocks are; the hand-set places' two kit names draw the two small stones
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
  const man = { p3: JSON.parse(show(P3, 'manifest.json')), steps: JSON.parse(show(STEPS, 'manifest.json')) };
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  // where a desk file lives: a step (young, grown) in the steps folder, the nine re-cut flowers and tufts in p3, the stones, stump and boulders in the plain stone set, every other piece in p2
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
    const se = STONE_SET[key.replace(/-m$/, '')];   // the plain stone set (rock-a, rock-b, stump, boulders A, D, E): a mirror is the flip below
    if (se) {
      const mir = key.endsWith('-m');
      if (!mir) return { S: STONES, m: { size: se.size, foot: se.foot }, path: se.path };
      if (se.mirror) return { S: STONES, m: { size: se.size, foot: [se.size[0] - 1 - se.foot[0], se.foot[1]] }, path: se.mirror };
      return null;
    }
    const be = biomeEntry(key); if (be) return be;
    if (man.steps[key]) return { S: STEPS, m: man.steps[key], path: path.posix.basename(man.steps[key].file) };
    if (P3_KEYS.includes(key)) return { S: P3, m: man.p3[key], path: path.posix.basename(man.p3[key].file) };
    if (manifest[key]) return { S: P2, m: manifest[key], path: path.posix.basename(manifest[key].file) };
    return null;
  };
  const flipX = (im) => { const o = newImage(im.w, im.h); for (let y = 0; y < im.h; y++) for (let x = 0; x < im.w; x++) o.data.set(im.data.subarray((y * im.w + x) * 4, (y * im.w + x) * 4 + 4), (y * im.w + (im.w - 1 - x)) * 4); return o; };
  // the stones' mirrors are the signed picture flipped left to right by the art post-step tool (poststeps.py, step flip h; the one tool art pixels may pass through), never by code of this file
  const POSTSTEPS = process.env.MB_POSTSTEPS || '/home/mb/mb/miniaturebeasts-internal/tools/art/poststeps.py';
  const flipBytes = (bytes) => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'mb-flip-'));
    try {
      writeFileSync(path.join(tmp, 'in.png'), bytes); writeFileSync(path.join(tmp, 'steps.json'), JSON.stringify([['flip', 'h']]));
      execFileSync('python3', [POSTSTEPS, 'replay', path.join(tmp, 'in.png'), path.join(tmp, 'steps.json'), '--out', path.join(tmp, 'out.png')], { stdio: ['ignore', 'pipe', 'inherit'] });
      return readFileSync(path.join(tmp, 'out.png'));
    } finally { rmSync(tmp, { recursive: true, force: true }); }
  };
  const piece = (key) => {   // one signed piece: its bytes (written once, under the manifest key), the image and the foot
    const file = `${key}.png`;
    if (seen.has(key)) return seen.get(key);
    const e = entryOf(key);
    if (e) {
      const b = show(e.S, e.path), im = decodePng(b), m = e.m;
      if (im.w !== m.size[0] || im.h !== m.size[1]) throw new Error(`${key}: the file is ${im.w} x ${im.h}, the manifest says ${m.size.join(' x ')}`);
      files.set(file, b); desk[file] = { commit: e.S.commit, from: `${e.S.dir}/${e.path}`, size: m.size, foot: m.foot, sha256: sha(b) };
      seen.set(key, { image: im, anchor: [m.foot[0], m.foot[1]] });
    } else if (key.endsWith('-m') && entryOf(key.slice(0, -2))) {   // a piece the desk has no mirror file for (the stones, stump and boulders): the signed picture flipped left to right by the post-step tool, the foot across the picture (the desk's manifests do the same for their -m pieces)
      const base = piece(key.slice(0, -2)), d = desk[`${key.slice(0, -2)}.png`], viaTool = !!STONE_SET[key.slice(0, -2)];
      const b = viaTool ? flipBytes(files.get(`${key.slice(0, -2)}.png`)) : Buffer.from(encodePng(flipX(base.image))), im = viaTool ? decodePng(b) : flipX(base.image);
      files.set(file, b); desk[file] = { commit: d.commit, from: `${d.from} flipped left to right (${viaTool ? 'post-step flip h' : 'layout'})`, size: d.size, foot: [im.w - 1 - base.anchor[0], base.anchor[1]], sha256: sha(b) };
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
    else props[n] = { ...p, footprint: STEP_OVER.includes(n) ? [] : [[0, 0]] };   // the low stones, the stump and the bushes block nothing: stepped over, pushed through (owner notes 6 and 7)
  }
  // The tall tree (leaf litter job, tree-tall-crown and tree-tall-trunk) is NOT placed: the pieces are full-colour paint (1412 and 339 colours) and the set's palette holds 208; fitting them would mean recolouring
  // the signed art, which is the art desk's call. Named empty slot: tree-tall (Tallwood, about one grove tree in three).
  for (const k of Object.values(BIOME_ROCKS).flat()) props[k] = { ...piece(k), footprint: [] };
  for (const k of STONE_DECALS) decals[k] = { ...piece(k) };   // the low stones are also ground decals: the scatter lays them walk-over (art/places/map-rules.json ground)
  for (const k of Object.values(BIOME_DECALS).flat()) decals[k] = { ...piece(k) };
  for (const [n, key] of Object.entries(DECOR_SOURCES.sweeps)) props[n] = { ...piece(key), footprint: [] };   // sweeps of tall grass block nothing
  for (const [n, key] of Object.entries(DECOR_SOURCES.decals)) decals[n] = { ...piece(key) };
  for (const [n, key] of Object.entries(DECOR_SOURCES.reeds)) props[n] = { ...piece(key), footprint: [] };   // a prop with no footprint: it sorts with the walkers and blocks nothing
  // the six south-face columns (the art director's seamless strip S; the files are the build job's regenerated plain-chain columns, read from the set folder as placed, with their sidecars beside them)
  for (let k = 1; k <= SOUTH_COLUMNS; k++) {
    const file = `cliff-south-${k}.png`, b = readFileSync(path.join(SET_DIR, file)), im = decodePng(b);
    if (im.w !== 48 || im.h !== 288) throw new Error(`${file}: a south column is 48 x 288, this is ${im.w} x ${im.h}`);
    files.set(file, b); decals[`cliff-south-${k}`] = { image: im, anchor: [0, 0] };
    desk[file] = { commit: 'local', from: `${SOUTH_FROM} (the plain chain; the whole chain is in ${file.replace(/\.png$/, '.steps.json')})`, size: [48, 288], foot: [0, 0], sha256: sha(b) };
  }
  // the outer-corner strip (cells 0..5, both hands; the east hand is the art director's cells, the west hand their mirror; each file's .steps.json replays it from the paid raw)
  for (const hand of CORNER_HANDS) for (let k = 0; k < 6; k++) {
    const file = `${cornerKind(hand, k)}.png`, b = readFileSync(path.join(SET_DIR, file)), im = decodePng(b);
    if (im.w !== 48 || im.h !== 288) throw new Error(`${file}: a corner cell is 48 x 288, this is ${im.w} x ${im.h}`);
    files.set(file, b); decals[cornerKind(hand, k)] = { image: im, anchor: [0, 0] };
    desk[file] = { commit: 'local', from: `${CORNER_FROM} (the whole chain is in ${file.replace(/\.png$/, '.steps.json')})`, size: [48, 288], foot: [0, 0], sha256: sha(b) };
  }
  // the side cells (whole-cell crops of the signed corner cell cliff-corner-e-5; the west hand its flip; each file's .steps.json holds the cut and the whole list from the paid raw)
  for (const hand of CORNER_HANDS) {
    const file = `${sideKind(hand)}.png`, b = readFileSync(path.join(SET_DIR, file)), im = decodePng(b);
    if (im.w !== 48 || im.h !== 48) throw new Error(`${file}: a side cell is 48 x 48, this is ${im.w} x ${im.h}`);
    files.set(file, b); decals[sideKind(hand)] = { image: im, anchor: [0, 0] };
    desk[file] = { commit: 'local', from: `${CORNER_FROM} (cut of the signed cell cliff-corner-e-5; the whole chain is in ${file.replace(/\.png$/, '.steps.json')})`, size: [48, 48], foot: [0, 0], sha256: sha(b) };
  }
  // the straight back rim N: three whole-cell looks (the art director's cliff-rim-1 cells N-1..3, bytes unchanged; each file's .steps.json replays it from the paid raw)
  for (let k = 0; k < RIM_N; k++) {
    const file = `${rimKind(k)}.png`, b = readFileSync(path.join(SET_DIR, file)), im = decodePng(b);
    if (im.w !== 48 || im.h !== 48) throw new Error(`${file}: a back rim cell is 48 x 48, this is ${im.w} x ${im.h}`);
    files.set(file, b); decals[rimKind(k)] = { image: im, anchor: [0, 0] };
    desk[file] = { commit: 'local', from: `art-jobs/2026-11-14-cliff-rim-1/work/cells/rim-N-${k + 1}.png (the whole chain is in ${file.replace(/\.png$/, '.steps.json')})`, size: [48, 48], foot: [0, 0], sha256: sha(b) };
  }
  // the raised fill as one whole cell decal (spec 3.3): the signed fill-cliff.png scaled to a cell, no file of its own (the sprite sheet carries it)
  const fillSrc = decodePng(readFileSync(path.join(SET_DIR, 'fill-cliff.png')));
  decals[FILL_KIND] = { image: scaleNearest(fillSrc, 48 / fillSrc.w), anchor: [0, 0] };
  // the face ends for a step of 2 rows (E2, 48 x 240) and of 1 row (E1, 48 x 192): whole-cell crops of the signed end cell cliff-corner-e-5 (rows 48..288 and 96..288; the west hand the crop flipped, step flip h); each file's .steps.json
  // holds the cut and the whole list from the paid raw and replays to the placed bytes (tools/art/poststeps.py replay)
  for (const rows of END_ROWS) for (const hand of CORNER_HANDS) {
    const file = `${endKind(rows, hand)}.png`, b = readFileSync(path.join(SET_DIR, file)), im = decodePng(b);
    if (im.w !== 48 || im.h !== 48 * (3 + rows)) throw new Error(`${file}: an end piece for a step of ${rows} is 48 x ${48 * (3 + rows)}, this is ${im.w} x ${im.h}`);
    files.set(file, b); decals[endKind(rows, hand)] = { image: im, anchor: [0, 0] };
    desk[file] = { commit: 'local', from: `${CORNER_FROM} (cut of the signed cell cliff-corner-e-5; the whole chain is in ${file.replace(/\.png$/, '.steps.json')})`, size: [48, im.h], foot: [0, 0], sha256: sha(b) };
  }
  return { files, props, canopy, decals, desk };
}
