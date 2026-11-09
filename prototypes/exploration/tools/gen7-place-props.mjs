// Generator 7, chunk G2: the property numbers of the place layer over every cell of a seed (80 x 100 cells). Used by tests/gen7-place.test.mjs; run alone to print them:
//   node tools/gen7-place-props.mjs 13
import { cellTerrain, cellIR, TV, pairOk, levelAt, stairsInfo, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/world.mjs';
import { bakeIR } from './gen7-render.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const stat = () => ({ cells: 0, pairBreaks: 0, loneTiles: 0, apronMismatch: 0, bakeFails: 0, bakeMessages: [], unreachedCells: 0, unreachedRaisedOnly: 0,
  centreWrong: 0, edges: 0, openNoRun: 0, changeNoCliff: 0, steps01: 0, steps12: 0, bandTiles: 0, bandWalkable: 0,
  cliffRuns: 0, cliffRunsUnder4: 0, cliffRunsUnder8: 0, cliffRunMin: 999, cliffRunsOnCellEdge: 0,
  stairs: 0, stairsSouth: 0, stairsSouthWithWayUp: 0, stairsNorth: 0, stairsEastWest: 0, ms: 0 });

// Every cell of the seed. Returns the numbers; the test asserts them.
export function placeProps(seed) {
  const t0 = Date.now(), st = stat();
  const lvOfCell = (X, Y) => genRegion7(seed, Math.floor(X / MW), Math.floor(Y / MH)).level[(Y % MH) * MW + (X % MW)];
  for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) {
    const cx0 = ax * MW, cy0 = ay * MH, SW = MW * CW, SH = MH * CH, R = new Uint8Array(SW * SH);   // the region's tiles stitched, for the cliff runs
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      const X = cx0 + i, Y = cy0 + j, c = cellTerrain(seed, X, Y), w = c.w, h = c.h, t = c.terrain;
      st.cells++;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) R[(j * CH + y) * SW + i * CW + x] = t[(y + 1) * w + x + 1];
      // no 2 x 2 block breaks the pair table (over the cell and its apron)
      for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) {
        const v = new Set([t[y * w + x], t[y * w + x + 1], t[(y + 1) * w + x], t[(y + 1) * w + x + 1]]);
        if (v.size > 2 || (v.size === 2 && !pairOk(...v))) st.pairBreaks++;
      }
      // every tile of the cell sits in a 2 x 2 block of its own terrain
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const v = t[y * w + x]; let ok = false;
        for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (a >= 0 && b >= 0 && a + 1 < w && b + 1 < h && t[b * w + a] === v && t[b * w + a + 1] === v && t[(b + 1) * w + a] === v && t[(b + 1) * w + a + 1] === v) ok = true; }
        if (!ok) st.loneTiles++;
      }
      // the apron of every cell equals its neighbours' tiles
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (X + dx < 0 || X + dx >= RW || Y + dy >= RH) continue;
        const n = cellTerrain(seed, X + dx, Y + dy);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const nx = c.x0 + x - n.x0, ny = c.y0 + y - n.y0; if (nx >= 0 && ny >= 0 && nx < n.w && ny < n.h && t[y * w + x] !== n.terrain[ny * n.w + nx]) st.apronMismatch++; }
      }
      // every walkable tile is reached from the cell's open sides (a way up joins its top and its foot)
      const inner = (x, y) => t[(y + 1) * w + x + 1];
      const lip = (x, y) => inner(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => t[(y + dy + 1) * w + x + dx + 1] !== TV.CLIFF);
      const wu = new Set(); for (const a of c.wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wu.add((y - c.y0 - 1) * CW + (x - c.x0 - 1));
      const pass = (x, y) => { const v = inner(x, y); return !(v === TV.WATER || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && lip(x, y) && !wu.has(y * CW + x))); };
      const seen = new Uint8Array(CW * CH), q = [];
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if ((x === 0 || y === 0 || x === CW - 1 || y === CH - 1) && pass(x, y)) { seen[y * CW + x] = 1; q.push(y * CW + x); }
      for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const a = (q[k] % CW) + dx, b = ((q[k] / CW) | 0) + dy; if (a < 0 || b < 0 || a >= CW || b >= CH || seen[b * CW + a] || !pass(a, b)) continue; seen[b * CW + a] = 1; q.push(b * CW + a); }
      let un = 0, onlyRaised = true; for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (!seen[y * CW + x] && pass(x, y)) { un++; if (inner(x, y) !== TV.CLIFF) onlyRaised = false; }
      if (un) { st.unreachedCells++; if (onlyRaised) st.unreachedRaisedOnly++; }
      // the bake runs
      try { bakeIR(cellIR(seed, X, Y)); } catch (e) { st.bakeFails++; if (st.bakeMessages.length < 3) st.bakeMessages.push(e.message.slice(0, 200)); }
      // the map's cell level is the land's level at its centre; edges agree with the land (Rule 5.2)
      const lv = lvOfCell(X, Y);
      if (levelAt(seed, X * CW + CW / 2, Y * CH + CH / 2) !== lv) st.centreWrong++;
      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        const X2 = X + dx, Y2 = Y + dy; if (X2 >= RW || Y2 >= RH) continue;
        st.edges++; const lv2 = lvOfCell(X2, Y2);
        if (lv === lv2) {   // open: the same level meets on both sides along at least 4 tiles
          let run = 0, best = 0;
          for (let k = 0; k < (dx ? CH : CW); k++) {
            const x1 = dx ? X2 * CW - 1 : X * CW + k, y1 = dx ? Y * CH + k : Y2 * CH - 1, x2 = dx ? X2 * CW : x1, y2 = dx ? y1 : Y2 * CH;
            if (levelAt(seed, x1, y1) === lv && levelAt(seed, x2, y2) === lv) { if (++run > best) best = run; } else run = 0;
          }
          if (best < 4) st.openNoRun++;
        } else {   // a cliff or stair: the land changes level between the two centres
          if (Math.min(lv, lv2) === 1) st.steps12++; else st.steps01++;
          const x0 = X * CW + CW / 2, y0 = Y * CH + CH / 2, x1 = X2 * CW + CW / 2, y1 = Y2 * CH + CH / 2, n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          let prev = levelAt(seed, x0, y0), changed = false;
          for (let k = 1; k <= n; k++) { const l = levelAt(seed, x0 + Math.round((x1 - x0) * k / n), y0 + Math.round((y1 - y0) * k / n)); if (l !== prev) changed = true; prev = l; }
          if (!changed) st.changeNoCliff++;
        }
      }
      // the map's end closes itself
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
        const gx = X * CW + x, gy = Y * CH + y;
        if (Math.min(gx, gy, RW * CW - 1 - gx, RH * CH - 1 - gy) < 4) { st.bandTiles++; const v = inner(x, y); if (v !== TV.WATER && v !== TV.THICKET) st.bandWalkable++; }
      }
    }
    // cliff runs: maximal straight stretches of the raised land's edge, in the region's stitched tiles (a run that touches the stitched edge is cut by it and left out)
    const isC = (x, y) => x >= 0 && y >= 0 && x < SW && y < SH && R[y * SW + x] === TV.CLIFF;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const horiz = dy !== 0, lines = horiz ? SH : SW, len = horiz ? SW : SH;
      for (let l = 0; l < lines; l++) {
        let run = 0, start = 0;
        for (let k = 0; k <= len; k++) {
          const x = horiz ? k : l, y = horiz ? l : k;
          const b = k < len && isC(x, y) && x + dx >= 0 && y + dy >= 0 && x + dx < SW && y + dy < SH && !isC(x + dx, y + dy);
          if (b) { if (!run) start = k; run++; continue; }
          if (!run) continue;
          if (start > 1 && k < len - 1 && l > 1 && l < lines - 2) {
            st.cliffRuns++; if (run < st.cliffRunMin) st.cliffRunMin = run; if (run < 4) st.cliffRunsUnder4++; if (run < 8) st.cliffRunsUnder8++;
            const onEdge = horiz ? (dy > 0 ? (l + 1) % CH === 0 : l % CH === 0) : (dx > 0 ? (l + 1) % CW === 0 : l % CW === 0);
            if (onEdge && run >= 4) st.cliffRunsOnCellEdge++;
          }
          run = 0;
        }
      }
    }
  }
  for (const s of stairsInfo(seed)) { st.stairs++; if (s.kind === 'south') { st.stairsSouth++; if (s.wayup) st.stairsSouthWithWayUp++; } else if (s.kind === 'north') st.stairsNorth++; else st.stairsEastWest++; }
  st.ms = Date.now() - t0;
  return st;
}
if (process.argv[2] && /gen7-place-props/.test(process.argv[1])) console.log(JSON.stringify(placeProps(+process.argv[2]), null, 1));
