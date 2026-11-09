// Generator 7, chunk G2: the property numbers of the place layer over every cell of a seed (80 x 100 cells). Used by tests/gen7-place.test.mjs; run alone to print them:
//   node tools/gen7-place-props.mjs 13
// G2b: levels come from the field at tile scale (no blocks), one raised level, every stair has a way up. Added: the straight cliff runs (every length, the longest, the share of cliff
// tiles in runs longer than 8), cliff chains (a stretch of the contour that may step one tile, so a diagonal counts as one), and whole-region reach through the ways up.
import { cellTerrain, cellIR, TV, pairOk, levelAt, stairsInfo, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { MW, MH } from '../src/world.mjs';
import { bakeIR } from './gen7-render.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const stat = () => ({ cells: 0, pairBreaks: 0, loneTiles: 0, apronMismatch: 0, bakeFails: 0, bakeMessages: [], unreachedCells: 0, unreachedRaisedOnly: 0,
  centreWrong: 0, edges: 0, openNoRun: 0, changeNoCliff: 0, steps: 0, bandTiles: 0, bandWalkable: 0,
  cliffRuns: 0, cliffRunsUnder4: 0, cliffRunsUnder8: 0, cliffRunMin: 999, cliffRunMax: 0, cliffRunsOnCellEdge: 0, cliffTiles: 0, cliffTilesInRunsOver8: 0, runHist: {},
  cliffThin: 0, thinAt: [], loneAt: [], unreachedAt: [],
  pathUnreached: 0, pieces: 0, piecesUnreached: 0, needAt: [],
  stairs: 0, stairsSouthWithWayUp: 0, stairsWithoutWayUp: 0, regions: 0, regionsWholeReach: 0, walkableTiles: 0, reachedTiles: 0, unreachedTiles: 0, unreachedInMain: 0, zonesNotJoined: 0, ms: 0 });

// Every cell of the seed. Returns the numbers; the test asserts them.
export function placeProps(seed) {
  const t0 = Date.now(), st = stat();
  const lvOfCell = (X, Y) => genRegion7(seed, Math.floor(X / MW), Math.floor(Y / MH)).level[(Y % MH) * MW + (X % MW)];
  for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) {
    const cx0 = ax * MW, cy0 = ay * MH, SW = MW * CW, SH = MH * CH, R = new Uint8Array(SW * SH), G = genRegion7(seed, ax, ay), wayups = [];   // the region's tiles stitched
    for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) {
      const X = cx0 + i, Y = cy0 + j, c = cellTerrain(seed, X, Y), w = c.w, h = c.h, t = c.terrain;
      st.cells++;
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) R[(j * CH + y) * SW + i * CW + x] = t[(y + 1) * w + x + 1];
      for (const a of c.wayups) if (!wayups.some(b => b.x === a.x && b.y === a.y)) wayups.push({ x: a.x - cx0 * CW, y: a.y - cy0 * CH, w: a.w, h: a.h });
      // no 2 x 2 block breaks the pair table (over the cell and its apron)
      for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) {
        const v = new Set([t[y * w + x], t[y * w + x + 1], t[(y + 1) * w + x], t[(y + 1) * w + x + 1]]);
        if (v.size > 2 || (v.size === 2 && !pairOk(...v))) st.pairBreaks++;
      }
      // every tile of the cell sits in a 2 x 2 block of its own terrain
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const v = t[y * w + x]; let ok = false;
        for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) { const a = x + ox, b = y + oy; if (a >= 0 && b >= 0 && a + 1 < w && b + 1 < h && t[b * w + a] === v && t[b * w + a + 1] === v && t[(b + 1) * w + a] === v && t[(b + 1) * w + a + 1] === v) ok = true; }
        if (!ok) { st.loneTiles++; if (st.loneAt.length < 6) st.loneAt.push([X, Y, x - 1, y - 1, v]); }
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
      if (un) { st.unreachedCells++; if (onlyRaised) st.unreachedRaisedOnly++; if (st.unreachedAt.length < 6) st.unreachedAt.push([X, Y, un, onlyRaised]); }
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
          st.steps++;
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
            st.cliffRuns++; st.cliffTiles += run; st.runHist[run] = (st.runHist[run] || 0) + 1;
            if (run < st.cliffRunMin) st.cliffRunMin = run; if (run > st.cliffRunMax) st.cliffRunMax = run; if (run < 4) st.cliffRunsUnder4++; if (run < 8) st.cliffRunsUnder8++; if (run > 8) st.cliffTilesInRunsOver8 += run;
            const onEdge = horiz ? (dy > 0 ? (l + 1) % CH === 0 : l % CH === 0) : (dx > 0 ? (l + 1) % CW === 0 : l % CW === 0);
            if (onEdge && run >= 4) st.cliffRunsOnCellEdge++;
          }
          run = 0;
        }
      }
    }
    // nothing narrow: a cliff tile that sits in no 4 x 4 block of raised land (a spike, a ridge, a spur); tiles within 4 of the stitched edge are left out
    for (let y = 4; y < SH - 4; y++) for (let x = 4; x < SW - 4; x++) {
      if (!isC(x, y)) continue; let ok = false;
      for (let oy = -3; oy <= 0 && !ok; oy++) for (let ox = -3; ox <= 0 && !ok; ox++) { let all = true; for (let j = 0; j < 4 && all; j++) for (let i = 0; i < 4; i++) if (!isC(x + ox + i, y + oy + j)) { all = false; break; } if (all) ok = true; }
      if (!ok) { st.cliffThin++; if (st.thinAt.length < 4) st.thinAt.push([ax, ay, x, y]); }
    }
    // whole-region reach through the ways up: every walkable tile of the region, from the region's start (the first start glint's cell); water, thicket and a cliff's lip block, a way up joins
    { const t = R, isLip = (x, y) => isC(x, y) && NB4.some(([dx, dy]) => !isC(x + dx, y + dy)), wu = new Set();
      for (const a of wayups) for (let y = a.y; y < a.y + a.h; y++) for (let x = a.x; x < a.x + a.w; x++) wu.add(y * SW + x);
      // the water of a ford cell is the ford: shallow, walked
      const pass = (x, y) => { const v = t[y * SW + x]; return !((v === TV.WATER && !G.ford[((y / CH) | 0) * MW + ((x / CW) | 0)]) || v === TV.THICKET || v === TV.DEEP || (v === TV.CLIFF && isLip(x, y) && !wu.has(y * SW + x))); };
      const sp = G.spawns[0], sx = (sp % MW) * CW + CW / 2, sy = ((sp / MW) | 0) * CH + CH / 2;
      let start = -1; for (let r = 0; r < 12 && start < 0; r++) for (let dy = -r; dy <= r && start < 0; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && pass(sx + dx, sy + dy)) { start = (sy + dy) * SW + sx + dx; break; }
      const seen = new Uint8Array(SW * SH), q = [start]; if (start >= 0) seen[start] = 1;
      for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const x = (q[k] % SW) + dx, y = ((q[k] / SW) | 0) + dy; if (x < 0 || y < 0 || x >= SW || y >= SH || seen[y * SW + x] || !pass(x, y)) continue; seen[y * SW + x] = 1; q.push(y * SW + x); }
      let walk = 0, un = 0, unMain = 0;
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (pass(x, y)) { walk++; if (!seen[y * SW + x]) { un++; if (G.comp[((y / CH) | 0) * MW + ((x / CW) | 0)]) unMain++; } }
      // what a player needs never sits on unreached land: every trail tile (ports are trail ends) and the centre tile of every set-piece cell (starts, glints, gate, deep stone, swim gate, beacons, depots)
      for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (t[y * SW + x] === TV.PATH && !seen[y * SW + x]) { st.pathUnreached++; if (st.needAt.length < 6) st.needAt.push(['path', ax, ay, x, y]); }
      const pieces = [...G.spawns, ...G.glow, G.gate, G.deep, G.swim, ...G.beacons.set, ...G.depots.set].filter(c => c >= 0);
      for (const c of pieces) { const x = (c % MW) * CW + (CW >> 1), y = ((c / MW) | 0) * CH + (CH >> 1); st.pieces++; if (pass(x, y) && !seen[y * SW + x]) { st.piecesUnreached++; if (st.needAt.length < 6) st.needAt.push(['piece', ax, ay, x, y]); } }
      st.regions++; st.walkableTiles += walk; st.unreachedTiles += un; st.reachedTiles += walk - un; st.unreachedInMain += unMain; if (!un) st.regionsWholeReach++;
      if (!G.zonesJoined) st.zonesNotJoined++;
    }
  }
  for (const s of stairsInfo(seed)) { st.stairs++; if (s.kind === 'south' && s.wayup) st.stairsSouthWithWayUp++; else st.stairsWithoutWayUp++; }
  st.cliffShareOver8 = +(st.cliffTilesInRunsOver8 / Math.max(1, st.cliffTiles)).toFixed(3);
  st.ms = Date.now() - t0;
  return st;
}
if (process.argv[2] && /gen7-place-props/.test(process.argv[1])) console.log(JSON.stringify(placeProps(+process.argv[2]), null, 1));
