// Generator 7, chunk G2: the goldens for the art director. Five pictures, each baked and rendered by the places bake and renderer alone (no compositing, no overlays), where the cell borders must not be findable:
//   three 3 x 3 windows of cells at 16 px a tile (seeds 7, 13 and 42), and two 48 px walking frames (450 x 532) straddling cell borders.
// Which windows: fixed 3 x 3 blocks, seed 7 cells 41-55 (the owner's window), seed 13 cells 33-48 and seed 42 cells 37-50. The frames: the 3 x 3 window's border crossing where a cliff and another edge meet.
//   node tools/gen7-goldens.mjs <outDir>      writes the PNGs and prints their names
import { mkdirSync, writeFileSync } from 'node:fs';
import { windowIR, decorOf, biomeAtTile, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { renderIR } from './gen7-render.mjs';
import { encodePng } from '../../places/src/png.mjs';

// The three windows are fixed: the blocks G2 showed (seed 7 cells 41-55 is the owner's window), so before and after are the same land. A block of 3 x 3 cells at (X, Y).
const WINDOWS = { 7: [41, 55], 13: [33, 48], 42: [37, 50] };
const GROVE_SEEDS = [13];   // the seed whose grove-and-reeds frame is the golden (the search picks the spot)
const home = seed => { const [X, Y] = WINDOWS[seed]; return { X, Y, ir: windowIR(seed, X, Y, 3, 3) }; };

// a 450 x 532 px frame of an IR at 48 px: the tile (tx, ty) at its centre, clamped to the picture
const frameAt = (ir, tx, ty) => ({ x: Math.max(0, Math.min(ir.w * 48 - 450, tx * 48 + 24 - 225)), y: Math.max(0, Math.min(ir.h * 48 - 532, ty * 48 + 24 - 266)), w: 450, h: 532 });

// the tile of a window, within the middle cell's border lines, with a raised edge and another terrain edge round it: where a frame would show the borders if they could be found
function borderSpot(ir) {
  const t = ir.terrain, w = ir.w, h = ir.h, at = (x, y) => t[y * w + x];
  let best = null;
  for (const [vertical, lines] of [[true, [CW, 2 * CW]], [false, [CH, 2 * CH]]]) for (const b of lines) {
    for (let k = 8; k < (vertical ? h : w) - 8; k++) {
      let cliff = 0, other = 0;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = (vertical ? b : k) + dx, y = (vertical ? k : b) + dy; if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
        const v = at(x, y), e = at(x + 1, y), s = at(x, y + 1);
        if ((v === TV.CLIFF) !== (e === TV.CLIFF) || (v === TV.CLIFF) !== (s === TV.CLIFF)) cliff++;
        else if (v !== e || v !== s) other++;
      }
      const s = Math.min(cliff, 14) + Math.min(other, 14) + (cliff && other ? 20 : 0);
      if (!best || s > best.s) best = { s, x: vertical ? b : k, y: vertical ? k : b };
    }
  }
  return best;
}

// G3: a 48 px frame across a cell border with a grove and a reed bank on it. Searched over the cells of a seed that lie in Woods, Tallwood, Marsh or Lakes: a vertical or a horizontal border,
// a frame of 450 x 532 (9.4 x 11.1 tiles) centred on a point of the border; wanted: trees on both sides of the border (at least 3, the grove) and a reed bank on both sides, on shore.
// The best score wins (ties: the first in scan order), so the frame is fixed for a seed.
function groveReedFrame(seed) {
  const D = decorOf(seed); let best = null;
  for (let Y = 1; Y < RH - 2; Y++) for (let X = 1; X < RW - 2; X++) {
    const b = biomeAtTile(seed, X * CW + 12, Y * CH + 14); if (!['woods', 'tallwood', 'marsh', 'meres'].includes(b)) continue;
    for (const vertical of [true, false]) for (const k of [0.3, 0.5, 0.7]) {
      const bx = vertical ? (X + 1) * CW : Math.floor((X + k) * CW), by = vertical ? Math.floor((Y + k) * CH) : (Y + 1) * CH;
      const x0 = bx - 5, x1 = bx + 4, y0 = by - 5, y1 = by + 5;
      const trees = D.propsIn(x0, y0, x1, y1).filter(p => p.fam === 'trees'), reeds = D.reedsIn(x0, y0, x1 + 1, y1 + 1);
      const side = p => (vertical ? p.x < bx : p.y < by), rside = r => (vertical ? r.bx * 4 + 3 < bx : r.by * 4 + 3 < by), rsideB = r => (vertical ? r.bx * 4 >= bx : r.by * 4 >= by);
      const tA = trees.filter(side).length, tB = trees.length - tA, rA = reeds.filter(rside).length, rB = reeds.filter(rsideB).length;
      if (tA < 1 || tB < 1 || trees.length < 4 || rA < 1 || rB < 1) continue;
      const s = Math.min(trees.length, 9) + 3 * Math.min(rA + rB, 4);
      if (!best || s > best.s) best = { s, X, Y, vertical, bx, by };
    }
  }
  return best;
}

// Returns [{ name, img }]: the goldens.
export function goldenImages() {
  const out = [], picks = {};
  for (const seed of [7, 13, 42]) {
    const p = home(seed); picks[seed] = p;
    out.push({ name: `window-seed${seed}-cells${p.X}-${p.Y}-16px.png`, img: renderIR(p.ir, 16).img });
  }
  // G2c: a second window of seed 7, centred on the nearest spot to the owner's window with a cliff, a lake and a trail (cells 38-40 across, 57-59 down): the owner's window is now all plateau top
  const near = { X: 38, Y: 57 }; out.push({ name: `window-seed7-cells${near.X}-${near.Y}-16px.png`, img: renderIR(windowIR(7, near.X, near.Y, 3, 3), 16).img });
  for (const seed of [13, 7]) {
    const p = picks[seed], spot = borderSpot(p.ir), W = frameAt(p.ir, spot.x, spot.y);
    out.push({ name: `frame-seed${seed}-border-at-tile${p.X * CW + spot.x}-${p.Y * CH + spot.y}-48px.png`, img: renderIR(p.ir, 48, W).img });
  }
  // G3: a grove and a reed bank across a cell border, at 48 px, rendered from the two cells beside the border
  for (const seed of GROVE_SEEDS) {
    const f = groveReedFrame(seed); if (!f) continue;
    const X0 = f.vertical ? f.X : Math.floor(f.bx / CW), Y0 = f.vertical ? Math.floor(f.by / CH) : f.Y, nx = 2, ny = 2, ir = windowIR(seed, X0 - (f.vertical ? 0 : 0), Y0 - (f.vertical ? 0 : 0), nx, ny);
    const W = frameAt(ir, f.bx - ir.origin.x, f.by - ir.origin.y);
    out.push({ name: `frame-seed${seed}-grove-and-reeds-at-tile${f.bx}-${f.by}-48px.png`, img: renderIR(ir, 48, W).img });
  }
  return out;
}

if (process.argv[2] && /gen7-goldens/.test(process.argv[1])) {
  mkdirSync(process.argv[2], { recursive: true });
  for (const { name, img } of goldenImages()) { writeFileSync(process.argv[2] + '/' + name, encodePng(img)); console.log(name); }
}
