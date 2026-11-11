// Generator 7, the biome ground (V2): the stills for the art director. One walking-size frame (48 px a tile, 450 x 532) of each of the nine biomes, each centred on a spot inside the biome whose low ground shows
// what the biome is (a window with the least raised land that has the most of its signature ground), and one border frame where two biomes blend. Baked and rendered by the places bake and renderer alone.
//   node tools/biome-stills.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { windowIR, cellTerrain, biomeAtTile, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { slotBiomes } from '../src/gen7/world.mjs';
import { ATLAS } from '../src/regions.mjs';
import { MW, MH } from '../src/world.mjs';
import { renderIR } from './gen7-render.mjs';
import { encodePng } from '../../places/src/png.mjs';

const FW = 450, FH = 532, TW = Math.ceil(FW / 48), TH = Math.ceil(FH / 48);   // a frame is about 10 x 12 tiles
// what each biome should show, as [terrains, wanted share of the frame]
const SIGN = { mixed: [[TV.GRASS], 0.8], downs: [[TV.SCRUB], 0.25], woods: [[TV.EARTH], 0.5], tallwood: [[TV.EARTH, TV.THICKET], 0.6], thickets: [[TV.THICKET, TV.SCRUB], 0.4],
  marsh: [[TV.WATER], 0.28], meres: [[TV.WATER, TV.SAND], 0.5], fells: [[TV.SAND], 0.45], tarns: [[TV.SAND, TV.WATER], 0.5] };

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

// a border where two biomes blend: the vertical edge between two slots of different biomes, on low ground
function pickBorder(seeds) {
  let best = null;
  for (const seed of seeds) {
    const sb = slotBiomes(seed);
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS - 1; ax++) {
      const a = sb[ay * ATLAS + ax], b = sb[ay * ATLAS + ax + 1]; if (a === b) continue;
      const bx = (ax + 1) * MW * CW;
      for (let j = 1; j < MH - 1; j++) {
        const Y = ay * MH + j, X = (ax + 1) * MW - 1, terr = terrainOf(seed, X, Y, 2, 2), w = 2 * CW, h = 2 * CH, tx = CW, ty = CH;   // the two cells either side of the slot edge
        const x0 = Math.max(0, Math.min(w - TW, tx - (TW >> 1))), y0 = Math.max(0, Math.min(h - TH, ty - (TH >> 1)));
        let raised = 0; const kinds = new Set(); for (let y = y0; y < y0 + TH; y++) for (let x = x0; x < x0 + TW; x++) { const v = terr[y * w + x]; if (v === TV.CLIFF) raised++; else kinds.add(v); }
        const pair = [a, b].sort().join('+'), want = ['mixed+woods', 'mixed+thickets', 'fells+mixed', 'marsh+woods', 'downs+woods'].includes(pair) ? 1 : 0;
        const s = -raised / (TW * TH) + 0.08 * kinds.size + want + (kinds.has(TV.EARTH) ? 1 : 0) + (kinds.has(TV.SAND) || kinds.has(TV.WATER) ? 0.5 : 0);
        if (!best || s > best.s) best = { s, seed, X, Y, tx, ty, a, b, bx, ay };
      }
    }
  }
  if (best) best.ir = windowIR(best.seed, best.X, best.Y, 2, 2);
  return best;
}

if (process.argv[2]) {
  mkdirSync(process.argv[2], { recursive: true });
  const seeds = [7, 13, 42], report = [];
  for (const biome of Object.keys(SIGN)) {
    const p = pick(biome, seeds); if (!p) { report.push(`${biome}: none on seeds ${seeds}`); continue; }
    const name = `biome-${biome}-seed${p.seed}-cells${p.X}-${p.Y}-48px.png`;
    writeFileSync(process.argv[2] + '/' + name, encodePng(renderIR(p.ir, 48, frameAt(p.ir, p.tx, p.ty)).img));
    report.push(`${name}  raised ${p.raised}  signature ${p.sig}`);
  }
  const b = pickBorder(seeds);
  if (b) { const name = `border-${b.a}-${b.b}-seed${b.seed}-cells${b.X}-${b.Y}-48px.png`; writeFileSync(process.argv[2] + '/' + name, encodePng(renderIR(b.ir, 48, frameAt(b.ir, b.tx, b.ty)).img)); report.push(name); }
  console.log(report.join('\n'));
}
void biomeAtTile; void RW; void RH;
