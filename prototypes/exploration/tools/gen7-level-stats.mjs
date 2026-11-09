// Generator 7, the terrain levels at tile scale: numbers over a block of cells of a seed (default the home region, slot 2,2: cells 32..47, 40..59).
//   node tools/gen7-level-stats.mjs <seed> [x0 y0 nx ny]
// Prints: share of raised tiles, cell-centre agreement, open edges with a run of four, cell changes with a change of level, the straight cliff runs (histogram, longest, share of
// cliff tiles in runs longer than 8) and the seam check (the cell as the neighbour's window sees it).
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, levelCell, tileLevel, CW, CH } from '../src/gen7/levels.mjs';

export function levelStats(seed, x0 = 32, y0 = 40, nx = 16, ny = 20) {
  const L = levelsOf(realm7(seed).realm), lv = (X, Y) => L.realm.level[Y * 80 + X];
  const st = { cells: nx * ny, raisedShare: 0, centreWrong: 0, openNoRun: 0, changeNoCliff: 0, edgeRuns: 0, runs: 0, hist: {}, longest: 0, tilesInLong: 0, cliffTiles: 0, seam: 0 };
  const W = nx * CW, H = ny * CH, R = new Uint8Array(W * H); let raised = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const X = x0 + i, Y = y0 + j, c = levelCell(L, X, Y);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { R[(j * CH + y) * W + i * CW + x] = c[y * CW + x]; raised += c[y * CW + x]; }
    if (tileLevel(L, X * CW + CW / 2, Y * CH + CH / 2) !== lv(X, Y)) st.centreWrong++;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const X2 = X + dx, Y2 = Y + dy; if (X2 >= 80 || Y2 >= 100) continue;
      if (lv(X, Y) === lv(X2, Y2)) {
        let run = 0, best = 0;
        for (let k = 0; k < (dx ? CH : CW); k++) {
          const a = dx ? [X2 * CW - 1, Y * CH + k] : [X * CW + k, Y2 * CH - 1], b = dx ? [X2 * CW, a[1]] : [a[0], Y2 * CH];
          if (tileLevel(L, a[0], a[1]) === lv(X, Y) && tileLevel(L, b[0], b[1]) === lv(X, Y)) { if (++run > best) best = run; } else run = 0;
        }
        if (best < 4) st.openNoRun++;
      } else {
        const ax = X * CW + CW / 2, ay = Y * CH + CH / 2, bx = X2 * CW + CW / 2, by = Y2 * CH + CH / 2, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)); let prev = tileLevel(L, ax, ay), ch = false;
        for (let k = 1; k <= n; k++) { const l = tileLevel(L, ax + Math.round((bx - ax) * k / n), ay + Math.round((by - ay) * k / n)); if (l !== prev) ch = true; prev = l; }
        if (!ch) st.changeNoCliff++;
      }
    }
  }
  st.raisedShare = +(raised / (W * H)).toFixed(3);
  const at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && R[y * W + x] === 1;
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
    const horiz = dy !== 0, lines = horiz ? H : W, len = horiz ? W : H;
    for (let l = 0; l < lines; l++) {
      let run = 0;
      for (let k = 0; k <= len; k++) {
        const x = horiz ? k : l, y = horiz ? l : k, b = k < len && at(x, y) && x + dx >= 0 && y + dy >= 0 && x + dx < W && y + dy < H && !at(x + dx, y + dy);
        if (b) { run++; continue; }
        if (!run) continue;
        if (k - run > 1 && k < len - 1 && l > 1 && l < lines - 2) {
          st.runs++; st.hist[run] = (st.hist[run] || 0) + 1; st.cliffTiles += run; if (run > 8) st.tilesInLong += run; if (run > st.longest) st.longest = run;
          const onEdge = horiz ? (dy > 0 ? (l + 1) % CH === 0 : l % CH === 0) : (dx > 0 ? (l + 1) % CW === 0 : l % CW === 0);
          if (onEdge && run >= 4) st.edgeRuns++;
        }
        run = 0;
      }
    }
  }
  st.shareInLongRuns = +(st.tilesInLong / Math.max(1, st.cliffTiles)).toFixed(3);
  return st;
}
if (process.argv[2] && /gen7-level-stats/.test(process.argv[1])) {
  const a = process.argv.slice(2).map(Number), t0 = Date.now(), st = levelStats(...a);
  const h = Object.keys(st.hist).map(Number).sort((p, q) => p - q).map(k => k + ':' + st.hist[k]).join(' ');
  console.log(JSON.stringify({ ...st, hist: undefined }), '\nrun lengths (length:count) ' + h + '\n' + (Date.now() - t0) + ' ms');
}
