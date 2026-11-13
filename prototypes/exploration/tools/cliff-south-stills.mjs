// Stills of the straight south cliff faces (the walking zoom, 48 px a tile, 450 x 532), day and night, 1x and 4x, drawn by the game's own bake and renderer.
//   node tools/cliff-south-stills.mjs find <spec.json>           scans seeds 7 and 13 for the longest straight south run (view 7a on seed 7, 13b on seed 13) and writes the views
//   node tools/cliff-south-stills.mjs count <seed> [<seed> ...]  counts the straight south runs on each seed and the ones whose low ground under the lip is shorter than the face (the face needs 3 low rows)
//   node tools/cliff-south-stills.mjs shoot <outDir> <spec.json> [a|b|c]  draws each view (with the side cell variant named, its name goes in each still's name)
// Each still gets a <still>.json sidecar (the art files drawn, zoom, light, time).
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { windowIR } from '../src/gen7/place.mjs';
import { ATLAS } from '../src/regions.mjs';
import { MW, MH } from '../src/world.mjs';
import { bakeCtx, bakeIR } from './gen7-render.mjs';
import { paletteRgb } from '../../places/src/bake/build.mjs';
import { cliffInfo } from '../../places/src/bake/openedges.mjs';
import { SIDE, SIDE_VARIANTS, southRuns, shortRuns } from '../../places/src/bake/southruns.mjs';
import { renderView, lightState } from '../../places/src/ground.mjs';
import { indexedToRgba } from '../../places/src/indexed.mjs';
import { encodePng, scaleNearest } from '../../places/src/png.mjs';
import { artHooks } from '../../places/src/setload.mjs';
import { fileList, writeSidecar } from './still-art.mjs';

const [WHICH, A, B, C] = process.argv.slice(2);
const FW = 450, FH = 532, LIGHTS = [['day', 0], ['night', 2]];
const CORE = JSON.parse(readFileSync(new URL('../../../art/companion-48/terrain/meadow/meadow-palette.json', import.meta.url), 'utf8')).entries.slice(0, 48);
const frameAt = (ir, tx, ty) => ({ x: Math.max(0, Math.min(ir.w * 48 - FW, tx * 48 + 24 - FW / 2)), y: Math.max(0, Math.min(ir.h * 48 - FH, ty * 48 + 24 - FH / 2)), w: FW, h: FH });
const worldW = ATLAS * MW, worldH = ATLAS * MH;
const scan = function* (seed) {
  const ctx = bakeCtx();
  for (let Y = 0; Y + 2 <= worldH; Y += 2) for (let X = 0; X + 2 <= worldW; X += 2) {
    const ir = windowIR(seed, X, Y, 2, 2), cliffs = cliffInfo(ir, ctx.terrains), runs = southRuns(ir, cliffs);
    if (runs.length) yield { ir, X, Y, cliffs, runs };
  }
};

if (WHICH === 'find') {
  const views = [];
  for (const [seed, tag] of [[7, 'a'], [13, 'b']]) {
    const cands = [];
    for (const { ir, X, Y, runs } of scan(seed)) for (const r of runs) {
      const n = r.x1 - r.x0 + 1, mid = (r.x0 + r.x1) >> 1;
      const inside = mid >= 5 && mid < ir.w - 5 && r.y >= 6 && r.y < ir.h - 6 && r.x0 > 0 && r.x1 < ir.w - 1;   // the frame stays inside the window and the run's ends are in view
      if (inside && n >= 6) cands.push({ name: `seed${seed}${tag}`, seed, X0: X, Y0: Y, tx: mid, ty: r.y + 1, n, col0: r.col0 });
    }
    cands.sort((p, q) => q.n - p.n);
    const best = cands.find((v) => { try { bakeIR(windowIR(v.seed, v.X0, v.Y0, 2, 2)); return true; } catch (e) { console.log(`${v.name} (${v.X0},${v.Y0}) skipped: ${e.message.split('\n')[0]}`); return false; } });   // a window the bake refuses (cliff beside litter has no edge sheet) is no view
    if (!best) throw new Error(`seed ${seed}: no run of 6 cells inside a window that bakes`);
    views.push(best);
  }
  writeFileSync(A, JSON.stringify(views, null, 1) + '\n'); console.log(views.map((v) => `${v.name}: cells (${v.X0},${v.Y0}) tile (${v.tx},${v.ty}) run ${v.n} cells from column ${v.col0 + 1}`).join('\n'));
} else if (WHICH === 'findcorner') {
  // a view showing both corner hands: a run of 6 or 7 cells with an outer corner at each end (the strip's cells fit the frame), low ground under the lip of 3 rows or more
  const views = JSON.parse(readFileSync(A, 'utf8')).filter((v) => !v.name.endsWith('-corners'));
  const cands = [];
  for (const seed of [7, 13]) for (const { ir, X, Y, cliffs, runs } of scan(seed)) for (const r of runs) {
    const n = r.x1 - r.x0 + 1, mid = (r.x0 + r.x1) >> 1;
    if (!(r.west && r.east && n >= 6 && n <= 7 && mid >= 5 && mid < ir.w - 5 && r.y >= 6 && r.y < ir.h - 6 && r.x0 > 1 && r.x1 < ir.w - 2)) continue;
    if (shortRuns(ir, cliffs, [r]).length) continue;
    cands.push({ name: 'seed7c-corners', seed, X0: X, Y0: Y, tx: mid, ty: r.y + 1, n });
  }
  const best = cands.find((v) => { try { bakeIR(windowIR(v.seed, v.X0, v.Y0, 2, 2)); return true; } catch (e) { return false; } });
  if (!best) throw new Error('no run of 6-7 cells with a corner at each end in a window that bakes');
  best.name = `seed${best.seed}c-corners`; views.push(best);
  writeFileSync(A, JSON.stringify(views, null, 1) + '\n'); console.log(`${best.name}: cells (${best.X0},${best.Y0}) tile (${best.tx},${best.ty}) run ${best.n} cells`);
} else if (WHICH === 'findinner') {
  // a view showing an inner corner: a run of 4 to 8 cells with an inner corner at an end, the other end an inner or outer corner if possible, low ground under the lip of 3 rows or more
  const views = JSON.parse(readFileSync(A, 'utf8')).filter((v) => !v.name.endsWith('-inner'));
  const cands = [];
  for (const seed of [7, 13]) for (const { ir, X, Y, cliffs, runs } of scan(seed)) for (const r of runs) {
    const n = r.x1 - r.x0 + 1, mid = (r.x0 + r.x1) >> 1;
    if (!((r.innerEast || r.innerWest) && n >= 4 && n <= 8 && mid >= 5 && mid < ir.w - 5 && r.y >= 6 && r.y < ir.h - 6 && r.x0 > 1 && r.x1 < ir.w - 2)) continue;
    if (shortRuns(ir, cliffs, [r]).length) continue;
    cands.push({ name: 'x-inner', seed, X0: X, Y0: Y, tx: mid, ty: r.y + 1, n, score: (r.innerEast && r.innerWest ? 3 : 0) + ((r.innerEast || r.innerWest) && (r.east || r.west) ? 2 : 0) });
  }
  cands.sort((p, q) => q.score - p.score);
  const best = cands.find((v) => { try { bakeIR(windowIR(v.seed, v.X0, v.Y0, 2, 2)); return true; } catch (e) { return false; } });
  if (!best) throw new Error('no run of 4-8 cells with an inner corner in a window that bakes');
  delete best.score; best.name = `seed${best.seed}i-inner`; views.push(best);
  writeFileSync(A, JSON.stringify(views, null, 1) + '\n'); console.log(`${best.name}: cells (${best.X0},${best.Y0}) tile (${best.tx},${best.ty}) run ${best.n} cells (${cands.length} candidates)`);
} else if (WHICH === 'count') {
  for (const seed of process.argv.slice(3).map(Number)) {
    let runs = 0, cells = 0; const shortBy = { 0: [0, 0], 1: [0, 0], 2: [0, 0] };
    for (const { ir, cliffs, runs: rs } of scan(seed)) {
      runs += rs.length; for (const r of rs) cells += r.x1 - r.x0 + 1;
      for (const s of shortRuns(ir, cliffs, rs)) { shortBy[s.low][0]++; shortBy[s.low][1] += s.x1 - s.x0 + 1; }
    }
    console.log(`seed ${seed}: ${runs} straight south runs (${cells} cells); low rows under the lip fewer than 3: ` + [0, 1, 2].map((k) => `${k} low rows: ${shortBy[k][0]} runs (${shortBy[k][1]} cells)`).join('; '));
  }
} else if (WHICH === 'shoot') {
  mkdirSync(A, { recursive: true });
  artHooks.seen = new Map();
  if (C) { if (!(C in SIDE_VARIANTS)) throw new Error(`side variant ${C}: one of ${Object.keys(SIDE_VARIANTS).join(', ')}`); SIDE.variant = C; }   // the side cell variant drawn (southruns.mjs); the name of each still carries it
  for (const v0 of JSON.parse(readFileSync(B, 'utf8'))) {
    const v = C ? { ...v0, name: `${v0.name}-side-${C}` } : v0;
    const ir = windowIR(v.seed, v.X0, v.Y0, 2, 2), win = frameAt(ir, v.tx, v.ty);
    for (const [light, level] of LIGHTS) {
      const place = bakeIR(ir), ts = bakeCtx().sets.get(ir.tileset), lit = level ? lightState(place, { level: new Uint8Array(place.w * place.h).fill(level) }) : null, pal = paletteRgb(ts);
      CORE.forEach((e) => { pal.rgb[e.i] = [parseInt(e.hex.slice(1, 3), 16), parseInt(e.hex.slice(3, 5), 16), parseInt(e.hex.slice(5, 7), 16)]; });
      const img = indexedToRgba(renderView(ts, place, 48, win, { ...(lit ? { light: lit } : {}) }), win.w, win.h, pal);
      for (const [suffix, im, scale] of [['-1x', img, 1], ['-4x', scaleNearest(img, 4), 4]]) {
        const png = `${A}/${v.name}-${light}${suffix}.png`; writeFileSync(png, encodePng(im));
        writeSidecar(png, { tool: 'cliff-south-stills', files: fileList([...artHooks.seen].map(([slot, x]) => ({ slot, ...x }))), swaps: [], view: v.name, seed: v.seed, cells: [v.X0, v.Y0], tile: [v.tx, v.ty], zoom: 48, light, level, scale });
        console.log(png);
      }
    }
  }
} else throw new Error('usage: find <spec.json> | count <seed> ... | shoot <outDir> <spec.json>');
