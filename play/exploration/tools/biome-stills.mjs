// Generator 7, the biome ground (V2): the stills for the art director. For each biome the grounds swap skinned (Woods, Tallwood, Thickets, Hills, Cliffs, Highpools): one walking-size frame (48 px a tile, 450 x 532) on low
// ground (a window with the least raised land that has the most of its signature ground) and one at a border where the biome blends into the next, each by day, at night and in a storm (the walk's own light levels,
// through the set's light tables). Baked and rendered by the places bake and renderer, the code the page draws a place with.
//   node tools/biome-stills.mjs <outDir> [biomes] [lights] [places] [--swap slot=file]... [--both]
//   --swap draws that file in the art slot instead of the shipped one (not copied into the game tree); --both makes day and night; each still gets a <still>.json sidecar (sha256 of every sheet drawn, slots, zoom, light, time)
import { mkdirSync, writeFileSync } from 'node:fs';
import { windowIR, cellTerrain, biomeAtTile, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { slotBiomes } from '../src/gen7/world.mjs';
import { ATLAS } from '../src/regions.mjs';
import { MW, MH } from '../src/world.mjs';
import { renderIR } from './gen7-render.mjs';
import { encodePng } from '../../places/src/png.mjs';
import { artHooks } from '../../places/src/setload.mjs';
import { takeFlags, fileList, writeSidecar } from './still-art.mjs';

const FW = 450, FH = 532, TW = Math.ceil(FW / 48), TH = Math.ceil(FH / 48);   // a frame is about 10 x 12 tiles
// what each biome should show, as [terrains, wanted share of the frame]
const SIGN = { downs: [[TV.TURF], 0.5], woods: [[TV.LITTER], 0.5], tallwood: [[TV.LITTER, TV.THICKET], 0.6], thickets: [[TV.THICKET, TV.DRY], 0.4], fells: [[TV.SCREE], 0.45], tarns: [[TV.SCREE, TV.WATER], 0.5] };

// the best frame of a biome over the seeds: a window of 2 x 2 cells inside one slot; the frame is centred on a tile of it
function pick(biome, seeds) {
  let best = null;
  for (const seed of seeds) {
    const sb = slotBiomes(seed);
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
      if (sb[ay * ATLAS + ax] !== biome) continue;
      for (let j = 1; j < MH - 2; j += 2) for (let i = 1; i < MW - 2; i += 2) {
        const X = ax * MW + i, Y = ay * MH + j, terr = terrainOf(seed, X, Y, 2, 2), w = 2 * CW, h = 2 * CH;
        for (const [tx, ty] of [[w >> 1, h >> 1]]) {
          const x0 = Math.max(0, Math.min(w - TW, tx - (TW >> 1))), y0 = Math.max(0, Math.min(h - TH, ty - (TH >> 1)));
          let raised = 0, sig = 0, n = 0;
          for (let y = y0; y < y0 + TH; y++) for (let x = x0; x < x0 + TW; x++) { const v = terr[y * w + x]; n++; if (v === TV.CLIFF) raised++; if (SIGN[biome][0].includes(v)) sig++; }
          const s = -Math.abs(sig / n - SIGN[biome][1]) - 1.5 * (raised / n);
          if (!best || s > best.s) best = { s, seed, X, Y, tx, ty, raised: +(raised / n).toFixed(2), sig: +(sig / n).toFixed(2) };
        }
      }
    }
  }
  if (best) best.ir = windowIR(best.seed, best.X, best.Y, 2, 2);
  return best;
}
// the terrain of nx x ny cells side by side (what windowIR holds, without its props)
function terrainOf(seed, X0, Y0, nx, ny) {
  const w = nx * CW, out = new Uint8Array(w * ny * CH);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = cellTerrain(seed, X0 + i, Y0 + j); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) out[(j * CH + y) * w + i * CW + x] = c.terrain[(y + 1) * c.w + x + 1]; }
  return out;
}
const frameAt = (ir, tx, ty) => ({ x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH });

// a border where the biome blends into another: the vertical edge between two slots, one of them the biome, on low ground
function pickBorder(seeds, biome) {
  let best = null;
  for (const seed of seeds) {
    const sb = slotBiomes(seed);
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS - 1; ax++) {
      const a = sb[ay * ATLAS + ax], b = sb[ay * ATLAS + ax + 1]; if (a === b || (a !== biome && b !== biome)) continue;
      const bx = (ax + 1) * MW * CW;
      for (let j = 1; j < MH - 1; j++) {
        const Y = ay * MH + j, X = (ax + 1) * MW - 1, terr = terrainOf(seed, X, Y, 2, 2), w = 2 * CW, h = 2 * CH, tx = CW, ty = CH;   // the two cells either side of the slot edge
        const x0 = Math.max(0, Math.min(w - TW, tx - (TW >> 1))), y0 = Math.max(0, Math.min(h - TH, ty - (TH >> 1)));
        let raised = 0, sig = 0, n = 0; const kinds = new Set(); for (let y = y0; y < y0 + TH; y++) for (let x = x0; x < x0 + TW; x++) { const v = terr[y * w + x]; n++; if (v === TV.CLIFF) raised++; else kinds.add(v); if (SIGN[biome][0].includes(v)) sig++; }
        const s = -2 * raised / n + 0.08 * kinds.size + Math.min(1, 2 * sig / n);   // low ground, a mix of grounds, and the biome's own ground showing
        if (!best || s > best.s) best = { s, seed, X, Y, tx, ty, a, b, bx, ay };
      }
    }
  }
  if (best) best.ir = windowIR(best.seed, best.X, best.Y, 2, 2);
  return best;
}

// flags first: --swap slot=file (repeatable; slot is "<set id>/<file>" or the bare file name in the set, e.g. ninja-test/fill-cliff.png) and --both (day and night only)
const FLAGS = takeFlags(process.argv.slice(2)), ARGV = [null, null, ...FLAGS.rest];
if (FLAGS.swaps.size) artHooks.swap = FLAGS.swaps;
artHooks.seen = new Map();

if (ARGV[2]) {
  mkdirSync(ARGV[2], { recursive: true });
  // each biome of the grounds swap, as the player names it: a place on low ground and one at a border with the next biome, each by day, at night and in a storm (the walk's own light levels 0, 2 and 1)
  // optional narrowing: argv[3] biomes (woods,thickets,...), argv[4] lights (day,night,storm), argv[5] places (low,border); with none, every biome in both places and all three lights
  const seeds = [7, 13, 42], report = [], NAMES = { woods: 'woods', tallwood: 'tallwood', thickets: 'thickets', downs: 'hills', fells: 'cliffs', tarns: 'highpools' }, LIGHTS = [['day', 0], ['night', 2], ['storm', 1]];
  const only = (i) => (ARGV[i] ? ARGV[i].split(',') : null), pickB = only(3), pickL = only(4) || (FLAGS.both ? ['day', 'night'] : null), pickW = only(5);
  for (const biome of Object.keys(NAMES).filter((b) => !pickB || pickB.includes(b))) for (const [where, p] of [['low', pick(biome, seeds)], ['border', pickBorder(seeds, biome)]].filter(([w]) => !pickW || pickW.includes(w))) {
    if (!p) { report.push(`${biome} ${where}: none on seeds ${seeds}`); continue; }
    for (const [light, level] of LIGHTS.filter(([l]) => !pickL || pickL.includes(l))) {
      const name = `${NAMES[biome]}-${where}-${light}-seed${p.seed}-cells${p.X}-${p.Y}-48px.png`;
      const png = ARGV[2] + '/' + name;
      writeFileSync(png, encodePng(renderIR(p.ir, 48, frameAt(p.ir, p.tx, p.ty), { level }).img));
      // every sheet the bake read (the whole set loads before the first still, so the list is the set's art in this still's place)
      writeSidecar(png, { tool: 'biome-stills', zoom: 48, light, level, biome, place: where, seed: p.seed, cells: [p.X, p.Y], files: fileList([...artHooks.seen].map(([slot, v]) => ({ slot, ...v }))), swaps: [...FLAGS.swaps].map(([slot, file]) => ({ slot, file })) });
      report.push(name + (where === 'border' ? `  ${p.a} / ${p.b}` : `  raised ${p.raised}  signature ${p.sig}`));
    }
  }
  // a swap that no sheet read is a typo, not a quiet no-op
  for (const slot of FLAGS.swaps.keys()) if (![...artHooks.seen.keys()].some((k) => k === slot || k.endsWith('/' + slot))) throw new Error(`--swap ${slot}: no art slot of that name was read (slots look like ninja-test/fill-cliff.png)`);
  console.log(report.join('\n'));
}
void biomeAtTile; void RW; void RH;
