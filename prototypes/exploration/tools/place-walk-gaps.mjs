// place-walk-2: the thicket gaps' shape over a hashed sample of windows: width along each gap and the longest straight thicket edge along it.
//   node place-walk-gaps.mjs <treeRoot> <windows a seed> [seed ...]
// A gap tile is a tile the gap cut marks (window `gaps`). Width: for each gap tile, the run of gap tiles across it (the shorter of its row run and column run). Straight edge: a run of gap tiles with thicket
// across them (the same scan the cut uses), the longest of the four directions. Prints one JSON line.
import { pathToFileURL } from 'node:url';

const [root, per, ...seedArgs] = process.argv.slice(2), seeds = seedArgs.length ? seedArgs.map(Number) : [7, 13, 42], N = Number(per || 40);
const M = n => import(pathToFileURL(root + '/prototypes/exploration/src/' + n).href);
const { windowGaps, TV, CW, CH, RW, RH } = await M('gen7/place.mjs'), { hash } = await M('world.mjs');
const res = { windows: 0, gapTiles: 0, widthHist: {}, longest: 0, longestHist: {}, runsOver4: 0, ms: 0 };
for (const seed of seeds) {
  const picks = []; for (let Y = 3; Y < RH - 3; Y++) for (let X = 3; X < RW - 3; X++) picks.push([X, Y, hash(seed, 'place-walk-gaps', X, Y)]);
  picks.sort((a, b) => a[2] - b[2]);
  // GAPS_AT="7:635,406;13:404,2236": the cells holding named world tiles (a seed's tiles) instead of the hashed sample
  const named = process.env.GAPS_AT ? process.env.GAPS_AT.split(';').filter(s => +s.split(':')[0] === seed).map(s => { const [wx, wy] = s.split(':')[1].split(',').map(Number); return [Math.floor(wx / CW), Math.floor(wy / CH)]; }) : null;
  for (const [X, Y] of named || picks.slice(0, N)) {
    const t0 = performance.now(), win = windowGaps(seed, X, Y); res.ms += performance.now() - t0; res.windows++;
    // only the centre cell and 6 tiles round it count: the window's fringe is never the final ground (each cell reads its own window's middle)
    const { t, W, H, gaps } = win, cx0 = (W - CW) / 2 - 6, cx1 = (W + CW) / 2 + 6, cy0 = (H - CH) / 2 - 6, cy1 = (H + CH) / 2 + 6, g = (x, y) => x >= cx0 && y >= cy0 && x < cx1 && y < cy1 && gaps[y * W + x] === 1;
    if (process.env.GAPS_MAP) { const [mx, my] = process.env.GAPS_MAP.split(',').map(Number); for (let yy = my - 16; yy <= my + 16; yy++) { let s = ''; for (let xx = mx - 26; xx <= mx + 26; xx++) { const lx = xx - win.gx0, ly = yy - win.gy0, v = win.t[ly * W + lx]; s += xx === mx && yy === my ? 'X' : gaps[ly * W + lx] ? 'G' : v === TV.THICKET ? 'T' : v === TV.CLIFF ? '#' : v === TV.WATER || v === TV.DEEP ? '~' : '.'; } console.log(s); } }
    if (process.env.GAPS_COMPS) { const seen = new Uint8Array(W * H); for (let s = 0; s < W * H; s++) { if (seen[s] || !g(s % W, (s / W) | 0)) continue; const q = [s]; seen[s] = 1; for (let h = 0; h < q.length; h++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = (q[h] % W) + dx, b = ((q[h] / W) | 0) + dy; if (g(a, b) && !seen[b * W + a]) { seen[b * W + a] = 1; q.push(b * W + a); } }
      if (q.length >= 15) { const mid = q[q.length >> 1]; console.log(`seed ${seed} gap of ${q.length} tiles, a tile at ${win.gx0 + (mid % W)},${win.gy0 + ((mid / W) | 0)}`); } } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g(x, y)) {
      res.gapTiles++;
      let a = 1, b = 1; for (let k = 1; g(x - k, y); k++) a++; for (let k = 1; g(x + k, y); k++) a++; for (let k = 1; g(x, y - k); k++) b++; for (let k = 1; g(x, y + k); k++) b++;
      const w = Math.min(a, b); res.widthHist[w] = (res.widthHist[w] || 0) + 1;
    }
    for (const [ex, ey] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const ax = ey !== 0 ? 1 : 0, ay = ey !== 0 ? 0 : 1, edgeAt = (x, y) => g(x, y) && x + ex >= 0 && y + ey >= 0 && x + ex < W && y + ey < H && t[(y + ey) * W + x + ex] === TV.THICKET;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (!edgeAt(x, y) || edgeAt(x - ax, y - ay)) continue; let n = 0; while (edgeAt(x + ax * n, y + ay * n)) n++; res.longestHist[n] = (res.longestHist[n] || 0) + 1; if (n > res.longest) res.longest = n; if (n > 4) { res.runsOver4++; if (process.env.GAPS_SHOW) console.log(`run ${n} seed ${seed} cell ${X},${Y} tile ${win.gx0 + x},${win.gy0 + y} dir ${ex},${ey} window ${x},${y}/${W}x${H}`); for (let yy = y - 8; yy <= y + 8; yy++) { let s = ''; for (let xx = x - 12; xx <= x + 14; xx++) { const v = xx < 0 || yy < 0 || xx >= W || yy >= H ? 0 : t[yy * W + xx]; s += xx === x && yy === y ? 'X' : g(xx, yy) ? 'G' : gaps[yy * W + xx] === 1 ? 'g' : v === TV.THICKET ? 'T' : v === TV.CLIFF ? '#' : v === TV.WATER || v === TV.DEEP ? '~' : '.'; } console.log(s); } } }
    }
  }
}
res.msPerWindow = +(res.ms / Math.max(1, res.windows)).toFixed(1);
console.log(JSON.stringify(res));
