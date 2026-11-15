// cliff-contour-1, step 1: where the straightness comes from. For a sample of cells with a cliff, the window's raster after each pass of the land rule (levels.mjs info.stages: threshold, cleanup,
// pockets, gaps, jogs, final), measured on the cell's own tiles against the smooth contour:  node land-contour-stages.mjs <seed> <cells> <out.json> [--model old|new]
globalThis.LAND_STAGES = true;
const { writeFileSync } = await import('node:fs');
const { realm7 } = await import('../src/gen7/region.mjs');
const { levelsOf, windowLevels, qCell, wetCell, inlandOf, RAISE_OFF, CW, CH } = await import('../src/gen7/levels.mjs');
const { RW, RH } = await import('../src/gen7/world.mjs');
const { L: LAND } = await import('../src/world.mjs');
const { measureLand, summary } = await import('./contour-lib.mjs');

const args = process.argv.slice(2), seed = Number(args[0]), N = Number(args[1]), OUT = args[2], opt = (n, d) => { const i = args.indexOf('--' + n); return i < 0 ? d : args[i + 1]; }, model = opt('model', 'old');
const { setLandRule } = await import('../src/gen7/levels.mjs');
if (opt('set', '')) setLandRule(Object.fromEntries(opt('set').split(',').map((p) => { const [k, v] = p.split('='); return [k, Number(v)]; })));
const L = levelsOf(realm7(seed).realm), o = L.rule.window, STAGES = ['threshold', 'openclose1', 'patterns1', 'loop', 'small', 'cleanup', 'pockets', 'gaps', 'jogs', 'final', 'blur'];
const acc = Object.fromEntries(STAGES.map((s) => [s, []]));
let picked = 0;
for (let k = 0; picked < N && k < 20000; k++) {
  const X = 3 + ((k * 7919 + seed * 31) % (RW - 6)), Y = 3 + ((k * 104729 + seed * 17) % (RH - 6));
  const win = windowLevels(L, X, Y), W = win.W, H = win.H, st = win.info.stages; if (!st) continue;
  // a cell with an outline in it
  let raised = 0; for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) raised += win.R[(o * CH + ty) * W + o * CW + tx] > 0 ? 1 : 0;
  if (raised < 40 || raised > CW * CH - 40) continue;
  const q = new Int32Array(W * H), wet = new Uint8Array(W * H), gx0 = (X - o) * CW, gy0 = (Y - o) * CH;
  for (let j = 0; j <= 2 * o; j++) for (let i = 0; i <= 2 * o; i++) {
    const cx = X - o + i, cy = Y - o + j, qc = qCell(L, cx, cy), wc = wetCell(L, cx, cy), inR = cx >= 0 && cy >= 0 && cx < RW && cy < RH, water = inR && L.realm.land[cy * RW + cx] === LAND.WATER && !L.realm.ford[cy * RW + cx];
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CW; tx++) { const t = (j * CH + ty) * W + i * CW + tx; q[t] = qc[ty * CW + tx]; wet[t] = wc[ty * CW + tx] || water ? 1 : 0; }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let held = inlandOf(gx0 + x, gy0 + y) < RAISE_OFF + 1; for (let dy = -1; dy <= 1 && !held; dy++) for (let dx = -1; dx <= 1 && !held; dx++) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < W && b < H && wet[b * W + a]) held = true; } if (held && q[y * W + x] >= 0) q[y * W + x] = -1; }
  const inside = (x, y) => x >= o * CW && y >= o * CH && x < (o + 1) * CW && y < (o + 1) * CH;
  // the reference: the raw field's contour, or (--ref smooth) the field's mean over the 5 x 5 rounded element (the minimum feature's own scale)
  const qs = new Int32Array(W * H), RAD = Number(opt('rad', 2));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, c = 0; for (let dy = -RAD; dy <= RAD; dy++) for (let dx = -RAD; dx <= RAD; dx++) { if (dx * dx + dy * dy > RAD * RAD + RAD) continue; const a = Math.max(0, Math.min(W - 1, x + dx)), b = Math.max(0, Math.min(H - 1, y + dy)); s += q[b * W + a]; c++; } qs[y * W + x] = Math.round(s / c); }
  for (let i = 0; i < W * H; i++) if (q[i] === -1 && qs[i] >= 0) qs[i] = -1;
  const ref = opt('ref', 'raw') === 'smooth' ? qs : q;
  const ras = { ...st, final: Uint8Array.from(win.R, (v) => (v > 0 ? 1 : 0)), blur: Uint8Array.from(qs, (v) => (v >= 0 ? 1 : 0)) };
  for (const s of STAGES) { const r = ras[s] || ras.final; acc[s].push(measureLand(r, W, H, ref, model, inside)); }
  picked++;
}
// sums over the sample
const out = { seed, model, cells: picked, stages: {} };
for (const s of STAGES) {
  const all = acc[s], m = { runs: { south: [], rim: [], side: [] }, noise5: { south: 0, rim: 0, side: 0 }, rule5: { south: 0, rim: 0, side: 0 }, stairs: 0, stairs1: 0, stairs2: 0, stairsAt: [], jogs: 0, jogsAt: [], longAt: [], tile: { n: 0, sum: 0, max: 0, far: 0 }, drawn: { n: 0, sum: 0, max: 0, far: 0 } };
  for (const a of all) {
    for (const k of ['south', 'rim', 'side']) { m.runs[k].push(...a.runs[k]); m.noise5[k] += a.noise5[k]; m.rule5[k] += a.rule5[k]; }
    m.stairs += a.stairs; m.stairs1 += a.stairs1; m.stairs2 += a.stairs2; m.jogs += a.jogs;
    for (const k of ['tile', 'drawn']) { m[k].n += a[k].n; m[k].sum += a[k].sum; m[k].far += a[k].far; m[k].max = Math.max(m[k].max, a[k].max); }
  }
  out.stages[s] = summary(m);
  const z = out.stages[s];
  console.log(s.padEnd(10), 'runs5+ S/rim/side', z.south.ge5, z.rim.ge5, z.side.ge5, ' >10', z.south.over10 + z.rim.over10 + z.side.over10, ' max', z.south.max, z.rim.max, z.side.max, ' noise5', JSON.stringify(z.noise5), ' stairs', z.stairs, z.stairs1, z.stairs2, ' jogs', z.jogs, ' dist tile', z.tileDist.mean, z.tileDist.max, ' drawn', z.drawnDist.mean);
}
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
