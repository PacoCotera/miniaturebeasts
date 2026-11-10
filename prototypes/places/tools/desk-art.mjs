// The art desk's signed pieces that prepare-set adds to the set when the recipe says `"desk": true`. Files are read from the pinned desk commit (git show), never the desk's live folder, copied
// byte for byte (or, where the desk has not re-issued a piece in the map palette, with the desk's own colour map applied, tools/recolour.mjs), and listed with their sha256 in the set's DESK.json.
//   Map palette (art director, mibi-art f1a9fe54e; commit 633e4d641 carries it): every map picture is the desk's recoloured copy in art-jobs/2026-11-10-art-recolour-map-palette/out/applied/<job>/<same path>.
//   Way up (mibi-art 1158b9710, art-jobs/2026-11-10-art-paint-wayup/out/): the way-up pieces of the cliff, wayup-cliff-grass and wayup-cliff-sand, painted in the map palette.
//   Water bits (mibi-art 3323aa85d): the pebbles and the lily pads.
//   Map decor (art director route A and the map-decor job): the tree, bush, rock, tufts, flowers, stump of the signed map look (see deskArt); the kit's names stay in the set and draw these pieces, so the
//   hand-set places and the generator need no new names.
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
export const WAYUP = { commit: '1158b9710', dir: 'art-jobs/2026-11-10-art-paint-wayup/out' };   // the way-up pieces (art director signed 2026-11-09 22:1x), 48 x 32, in the map palette
// the map look (art director route A): tree and bush from style test 3, rock, tufts and flowers from the style test's route A props (not re-issued: the colour map is applied), shrubs and scrub from the thicket job
export const TEST3 = applied('art-style-test-3', 'tiles'), ROUTE_A = { commit: DC, dir: 'art-jobs/2026-11-10-art-style-test/out/route-a/props', recolour: true };
export const SAND = applied('art-paint-terrain-sand', ''), MEADOW1 = applied('art-paint-terrain-meadow', ''), MEADOW2 = MEADOW1, THICKET = applied('art-paint-terrain-thicket', 'tiles');
export const CLIFF3 = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-terrain-cliff/out/tiles' };   // the cliff sheets are the re-cut ones (tools/recut); the commit and folder are the label of their source
export const SCRUBJOB = applied('art-paint-terrain-thicket', 'tiles'), RIPPLE = applied('art-paint-water-ripple', 'tiles');
// the map-decor job (stump, blue flowers: the desk's applied copies), the hollow tree and split stone (not re-issued: colour map), the grass flecks and the reeds (painted in the new palette)
export const MAPDECOR = applied('art-paint-map-decor', 'props'), HOLLOW = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-hollow-tree-split-stone/out', recolour: true };
// the water bits (art director signed 2026-11-09 21:05, art/desk 3323aa85d): pebbles-a/b/c and the lily pad, and the pad with a flower (a variant the generator picks about one in four)
export const WATERBITS = { commit: '3323aa85d', dir: 'art-jobs/2026-11-10-art-paint-water-bits/out/props' };
export const WATERBIT_NAMES = ['pebbles-a', 'pebbles-b', 'pebbles-c', 'lily-pad', 'lily-pad-flower'];
export const FLECKS = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-grass-flecks/out/flecks' }, REEDS = { commit: DC, dir: 'art-jobs/2026-11-10-art-paint-reeds/out/reeds' };
// the flecks the art director keeps (single blades, pale pairs, 2-blade flicks; boards/briefs/art-paint-grass-flecks.md): 00 blades3-dark, 01 blades4-dark, 02 blade1-dark, 03 pair-pale, 04 tuft-pale, 07 sprout-pale
export const FLECK_FILES = ['fleck-00-blades3-dark', 'fleck-01-blades4-dark', 'fleck-02-blade1-dark', 'fleck-03-pair-pale', 'fleck-04-tuft-pale', 'fleck-07-sprout-pale'];
export const FLECK_NAMES = FLECK_FILES.map((_, k) => `fleck-${k}`);
// reed sprites (the desk's phase 3b, manifest.json "sprites"): the four marked for use, and the optional ones the scatter rule picks from
export const REED_SHORE = ['shore-1', 'shore-3', 'shore-2', 'shore-4'], REED_WATER = ['water-1', 'water-2'];   // shore pick: 37.5 / 37.5 / 12.5 / 12.5 %, in this order
export const REED_NAMES = [...REED_SHORE, ...REED_WATER].map((n) => `reed-${n}`);
export const TALL_GRASS = ['tall-grass', 'tall-grass-b', 'tall-grass-m', 'tall-grass-bm'];   // the signed tufts-2 and tufts-3, each as it is and mirrored (the sweeps of tall grass)
// the tall clump (mibi-art art/desk 86d239e96): decal name -> file; the generator picks one by hash (decor.mjs CLUMP_KINDS)
export const CLUMP = { commit: '86d239e96', dir: 'art-jobs/2026-11-10-art-paint-tall-clump/out' };
export const CLUMP_PIECES = [['clump-tall', 'clump-tall-26.png'], ['clump-tall-m', 'clump-tall-26-mirror.png'], ['clump-tall-s', 'clump-tall-17.png'], ['clump-tall-sm', 'clump-tall-17-mirror.png']];
export const SUNLIT ='#82b266';   // the map palette's `grass`, one sunlit step above the grass base #74a65d: the grass tone patches
export const SUNLIT_FROM = '#5e9357';
export const FLOWER_BLUE_SIZE = [24, 22];   // the blue pair is drawn at the size of the route A flowers (flowers-1)
// the scrub ground (the desk's olive #589054, darker than the grass #74a65d, read as a hollow): the same value as the grass (luminance 143), drier and yellower (hue 80 degrees against the grass's 99)
export const SCRUB_FROM = '#589054', SCRUB_GROUND = '#82a05a';
// the cattail heads of the reed sprites: the applied ramp (#6f4a37 to the palette's trunk line, #8a6444 to its earth line)
export const CATTAIL_MAP = [['#6f4a37', '#664330'], ['#8a6444', '#7c5a3d']];
export const FLOWER_NAMES = ['flower-daisy', 'flower-buttercup', 'flower-daisy-pair', 'flower-blue-pair', 'flower-pink-three'];
export const TUFT_NAMES = ['tuft-fan', 'tuft-lean', 'tuft-small'], SHRUBS = ['shrub-1', 'shrub-2', 'shrub-3', 'shrub-4'];
const show = (c, p) => execFileSync('git', ['-C', DESK, 'show', `${c.commit}:${c.dir}/${p}`], { maxBuffer: 1 << 26 });
// a picture of a source: with the colour map applied when the source is flagged (pieces the desk has not re-issued in the map palette)
const pic = (c, p) => { const img = decodePng(show(c, p)); return c.recolour ? recolour(img) : img; };
const picBytes = (c, p) => (c.recolour ? Buffer.from(encodePng(recolour(decodePng(show(c, p))))) : show(c, p));
const fromOf = (c, p) => `${c.dir}/${p}${c.recolour ? ' recoloured' : ''}`;
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
// The picture area-reduced to w x h and pixel-snapped: each target pixel averages its box of the source (alpha-weighted), then takes the nearest colour the source itself uses; opaque when
// half the box or more is opaque, else clear. No colour outside the source's own palette is made.
export function areaReduce(img, w, h) {
  const pal = new Map();
  for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3] === 255) pal.set((img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2], 1);
  const cols = [...pal.keys()].map((c) => [c, c >> 16, (c >> 8) & 255, c & 255]), out = newImage(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = (x * img.w) / w, x1 = ((x + 1) * img.w) / w, y0 = (y * img.h) / h, y1 = ((y + 1) * img.h) / h;
    let a = 0, area = 0, r = 0, g = 0, b = 0;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const wgt = (Math.min(sx + 1, x1) - Math.max(sx, x0)) * (Math.min(sy + 1, y1) - Math.max(sy, y0)), k = (sy * img.w + sx) * 4, al = img.data[k + 3] / 255;
      area += wgt; a += wgt * al; r += wgt * al * img.data[k]; g += wgt * al * img.data[k + 1]; b += wgt * al * img.data[k + 2];
    }
    if (a * 2 < area) continue;
    r /= a; g /= a; b /= a;
    let best = cols[0], bd = Infinity;
    for (const c of cols) { const d = (c[1] - r) ** 2 + (c[2] - g) ** 2 + (c[3] - b) ** 2; if (d < bd) { bd = d; best = c; } }
    out.data.set([best[1], best[2], best[3], 255], (y * w + x) * 4);
  }
  return out;
}
// The picture flipped left to right (a layout change, no pixel made).
export function mirror(img) {
  const out = newImage(img.w, img.h);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) out.data.set(img.data.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4), (y * img.w + (img.w - 1 - x)) * 4);
  return out;
}

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
  // the tone layer: the desk's signed lipless grass tone, one colour map (its dark #5e9357 to the sunlit #82b266, art director ruling 2026-11-09 20:4x: a patch is lighter than the grass, never a hollow), 0 MXN
  const toneImg = mapColour(decodePng(show(MEADOW1, 'layers/grass-tone.png')), SUNLIT_FROM, SUNLIT);
  const tone = { of: 'grass', also: ['cliff'], sheets: [rec(MEADOW1, 'tone-grass.png', `${MEADOW1.dir}/layers/grass-tone.png sunlit (${SUNLIT_FROM} to ${SUNLIT})`, Buffer.from(encodePng(toneImg)))] };
  const images = new Map([...files].map(([n, b]) => [n, decodePng(b)]));
  return { files, images, layers, tone, desk };
}

// The tree is cut in two at this row of the signed 36 x 41 picture: the crown above (the canopy, drawn over the explorer) and the trunk with its ground shadow below (the prop). A crop, no pixel changed.
export const TREE_SPLIT = 32;
// Returns { files: Map(name -> Buffer) the placed files, props, canopy, decals: { name: { image, anchor, footprint?, canopy? } }, desk } (desk: the DESK.json object): the map decor.
//   tree-broad and tree-autumn (and their crowns) both draw the signed tree, bush-big, bush-round and bush-small the signed bush, boulder-brown and boulder-grey the signed rock, tuft-fan, tuft-lean, tuft-small
//   (and the kit's `tuft`) the three signed tufts, the five flowers the signed flowers, the stump the signed stump, the sweeps of tall grass (tall-grass and its three variants) the signed tufts-2 and tufts-3
//   (each mirrored too), clump-tall the signed tufts-3, tree-hollow and split-stone the signed hollow tree and split stone: the names stay so the hand-set places and the generator are unchanged.
//   shrub-1..4 are the scrub shrubs, fleck-0..5 (and the mirrored fleck-Nm) the grass flecks, reed-* the reed sprites.
export function deskArt() {
  const files = new Map(), desk = {};
  const rec = (c, as, from, b) => { files.set(as, b); desk[as] = { commit: c.commit, from, sha256: createHash('sha256').update(b).digest('hex') }; return decodePng(b); };
  const place = (c, name, as) => rec(c, as, fromOf(c, name), picBytes(c, name));
  const cut = (c, name, as, y, h, what) => { const src = pic(c, name); return rec(c, as, `${fromOf(c, name)} rows ${y}..${y + h - 1} (${what}, a crop)`, Buffer.from(encodePng(crop(src, 0, y, src.w, h)))); };
  const foot = (img, x = (img.w - 1) >> 1) => [x, img.h - 1];
  const props = {}, canopy = {}, decals = {};
  const tree = pic(TEST3, 'tree.png'), trunk = cut(TEST3, 'tree.png', 'tree-trunk.png', TREE_SPLIT, tree.h - TREE_SPLIT, 'trunk and shadow'), crown = cut(TEST3, 'tree.png', 'tree-crown.png', 0, TREE_SPLIT, 'crown');
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
  // the accent clump: four signed pieces (art director, mibi-art 86d239e96), picked by the generator's hash: 26 rows tall and 17 rows tall, each as it is and mirrored; anchors from the job's manifest
  const clumpMan = JSON.parse(show(CLUMP, 'manifest.json'));
  for (const [name, file] of CLUMP_PIECES) { const im = place(CLUMP, file, file), a = clumpMan[file].anchor; decals[name] = { image: im, anchor: a }; }
  // flowers: the signed route A flowers and the blue pair; each drawn bottom-centre on its tile
  const flowers = [1, 2, 3].map((k) => place(ROUTE_A, `flowers-${k}.png`, `flowers-${k}.png`)), blue = (() => { const b = decodePng(picBytes(MAPDECOR, 'flowers-blue-pair.png')); return rec(MAPDECOR, 'flowers-blue-pair.png', `${MAPDECOR.dir}/flowers-blue-pair.png area-reduced ${b.w}x${b.h} to ${FLOWER_BLUE_SIZE[0]}x${FLOWER_BLUE_SIZE[1]}, pixel-snapped`, Buffer.from(encodePng(areaReduce(b, ...FLOWER_BLUE_SIZE)))); })();
  const flowerOf = { 'flower-daisy': flowers[1], 'flower-daisy-pair': flowers[1], 'flower-buttercup': flowers[2], 'flower-pink-three': flowers[0], 'flower-blue-pair': blue };
  for (const n of FLOWER_NAMES) decals[n] = { image: flowerOf[n], anchor: foot(flowerOf[n]) };
  // the stump
  const stump = place(MAPDECOR, 'stump-1.png', 'stump-1.png');
  props.stump = { image: stump, anchor: foot(stump), footprint: [[0, 0]] };
  // the sweeps of tall grass: the signed tufts-2 and tufts-3, as they are and mirrored (a layout flip); still pictures, no sway
  props['tall-grass'] = { image: tufts[1], anchor: [6, 12], footprint: [] };
  props['tall-grass-b'] = { image: tufts[2], anchor: [6, 12], footprint: [] };
  props['tall-grass-m'] = { image: mirror(tufts[1]), anchor: [5, 12], footprint: [] };
  props['tall-grass-bm'] = { image: mirror(tufts[2]), anchor: [5, 12], footprint: [] };
  // the hollow tree (64 x 64, the slot changed from 64 x 47, accepted by the art director, signed d01396672) and the split stone: footprints as the kit's
  const hollow = place(HOLLOW, 'hollow-tree-1b-tree1b-1.png', 'hollow-tree.png'), splitStone = place(HOLLOW, 'split-stone-p2.png', 'split-stone.png');
  props['tree-hollow'] = { image: hollow, anchor: [32, 63], footprint: [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-1, -1], [0, -1], [1, -1]] };
  props['split-stone'] = { image: splitStone, anchor: [30, 43], footprint: [[-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]] };
  for (const n of SHRUBS) { const im = place(SCRUBJOB, `${n}.png`, `${n}.png`); props[n] = { image: im, anchor: foot(im, 7), footprint: [[0, 0]] }; }
  // grass flecks: tiny texture on open grass (the desk's scatter rule, out/scatter-rule.md); each as it is and mirrored, anchor the foot centre so the generator places by the top-left corner
  FLECK_FILES.forEach((f, k) => {
    const im = place(FLECKS, `${f}.png`, `${f}.png`);
    decals[`fleck-${k}`] = { image: im, anchor: [im.w >> 1, im.h - 1] };
    decals[`fleck-${k}m`] = { image: mirror(im), anchor: [(im.w - 1) - (im.w >> 1), im.h - 1] };
  });
  // the water bits: the kit's names stay (lily-pad-flower is the one new name, a variant of the pad); the anchor is the centre of the picture, as the kit's was of its own
  for (const n of WATERBIT_NAMES) { const im = place(WATERBITS, `${n}.png`, `${n}.png`); decals[n] = { image: im, anchor: [im.w >> 1, im.h >> 1] }; }
  // the reed sprites (phase 3b): the foot point is the desk's anchor (manifest.json)
  const manifest = JSON.parse(show({ commit: DC, dir: 'art-jobs/2026-11-10-art-paint-reeds/out' }, 'manifest.json'));
  const reedDefs = { ...manifest.sprites, ...manifest.extras };
  for (const n of [...REED_SHORE, ...REED_WATER]) {
    const d = reedDefs[n], im = rec(REEDS, `reed-${n}.png`, `${REEDS.dir}/${n}.png cattail browns (${CATTAIL_MAP.map(([f, t]) => `${f} to ${t}`).join(', ')})`, Buffer.from(encodePng(mapColours(decodePng(show(REEDS, `${n}.png`)), CATTAIL_MAP))));
    props[`reed-${n}`] = { image: im, anchor: d.anchor, footprint: [] };   // a prop with no footprint: it sorts with the walkers and blocks nothing
    props[`reed-${n}m`] = { image: mirror(im), anchor: [(im.w - 1) - d.anchor[0], d.anchor[1]], footprint: [] };
  }
  return { files, props, canopy, decals, desk };
}
