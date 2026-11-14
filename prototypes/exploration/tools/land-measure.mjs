// Measures the land rule on the fixed windows (land-windows.json: 4 x 3 cells each, seeds 7, 13, 42 and twelve more), for one or more settings, and prints the table.
//   node land-measure.mjs [--out DIR] [--d 4000,5200,6500] [--face 3,2] [--min 4] [--reach 6] [--seam] [--today FILE ...]
// Per seed and setting: the mean straight face (bends excluded), the share of faces that are one-tile bends, the longest straight run per edge kind (south face, side wall, back rim),
// and the hard checks: fewest low rows under a lip (at least faceRows + 1), lone faces, pinches, square corners. --seam also checks the cell as each neighbour's window sees it.
// --out writes each setting's rasters (rasters-D<d>-f<face>.json, one entry per window) for the stills and overviews. --today reads rasters made by today's map maker (the same windows) for the beside-it row.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { realm7 } from '../src/gen7/region.mjs';
import { levelsOf, setLandRule, landRule, raised, windowLevels, CW, CH } from '../src/gen7/levels.mjs';

const WINDOWS = JSON.parse(readFileSync(new URL('./land-windows.json', import.meta.url), 'utf8'));

export function measure(w, h, bits, faceRows) {
  const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x] === '1' ? 1 : 0);
  const lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0;
  const south = [], rim = [], side = []; let lone = 0, saddle = 0, square = 0;
  const runsOf = (get, along, lines, len) => { const out = []; for (let l = 1; l < lines - 1; l++) { let n = 0, from = 0; for (let k = 0; k <= len; k++) { if (k < len && get(along ? k : l, along ? l : k)) { if (!n) from = k; n++; } else { if (n && from > 0 && k < len) out.push(n); n = 0; } } } return out; };
  south.push(...runsOf(lip, true, h - 1, w));
  rim.push(...runsOf((x, y) => R(x, y) && !R(x, y - 1), true, h, w));
  side.push(...runsOf((x, y) => R(x, y) && !R(x - 1, y), false, w, h), ...runsOf((x, y) => R(x, y) && !R(x + 1, y), false, w, h));
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (lip(x, y) && !lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1))) lone++;
  }
  for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) { const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) saddle++; }
  // a square corner: a face of 2+ ending beside a side wall 3+ rows high
  for (let y = 3; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (lip(x, y)) for (const dx of [-1, 1]) {
    if (lip(x + dx, y) || !lip(x - dx, y)) continue;
    if (!R(x + dx, y) && !R(x + dx, y - 1) && !R(x + dx, y - 2)) square++;
  }
  let loneBlk = 0;   // a tile with no 2 x 2 block of its own level (a sliver one tile wide, raised or low): the ground layers cannot draw it
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const v = R(x, y); let ok = false; for (let oy = -1; oy <= 0 && !ok; oy++) for (let ox = -1; ox <= 0 && !ok; ox++) ok = R(x + ox, y + oy) === v && R(x + ox + 1, y + oy) === v && R(x + ox, y + oy + 1) === v && R(x + ox + 1, y + oy + 1) === v; if (!ok) loneBlk++; }
  let minBelow = 99; for (let y = 0; y < h - faceRows - 3; y++) for (let x = 0; x < w; x++) if (lip(x, y)) { let k = 0; while (k < faceRows + 1 && !R(x, y + 1 + k)) k++; if (k < minBelow) minBelow = k; }
  const straight = south.filter(n => n >= 2), mean = straight.reduce((a, b) => a + b, 0) / Math.max(1, straight.length);
  const mx = a => Math.max(0, ...a), big = a => a.filter(n => n >= 9).length;
  return { faces: south.length, meanStraight: +mean.toFixed(2), bendShare: +(south.filter(n => n === 1).length / Math.max(1, south.length)).toFixed(2), maxSouth: mx(south), maxSide: mx(side), maxRim: mx(rim), long9: big(south) + big(side) + big(rim), minBelow, lone, saddle, square, loneBlk };
}

export function rasterOf(seed, X, Y, w, h) {
  const L = levelsOf(realm7(seed).realm), gx0 = X * CW, gy0 = Y * CH; let bits = '';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) bits += raised(L, gx0 + x, gy0 + y) ? '1' : '0';
  return { seed, X, Y, gx0, gy0, w, h, raised: bits };
}
// the cell as each neighbour's window sees it, against the cell's own: the number of tiles that differ
export function seamDiff(seed, X, Y, w, h) {
  const L = levelsOf(realm7(seed).realm); let bad = 0, checked = 0;
  for (let j = 0; j < h / CH; j++) for (let i = 0; i < w / CW; i++) {
    const cx = X + i, cy = Y + j, own = windowLevels(L, cx, cy);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 0], [0, -1], [-1, -1], [1, -1], [-1, 1]]) {
      const nb = windowLevels(L, cx + dx, cy + dy);   // the neighbour's window covers cells cx+dx-1 .. cx+dx+1; compare the overlap of the two windows
      const o = landRule().window; for (let y = o * CH; y < (o + 1) * CH; y++) for (let x = o * CW; x < (o + 1) * CW; x++) {   // the cell's own tiles, as the neighbour's window has them in its ring
        const nx = x - dx * CW, ny = y - dy * CH; if (nx < 0 || ny < 0 || nx >= nb.W || ny >= nb.H) continue;
        checked++; if (own.R[y * own.W + x] !== nb.R[ny * nb.W + nx]) bad++;
      }
    }
  }
  return { bad, checked };
}

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const only = arg('seeds', null), WIN = only ? WINDOWS.filter(w => only.split(',').map(Number).includes(w.seed)) : WINDOWS;
  const ds = arg('d', '5200').split(',').map(Number), faces = arg('face', '3').split(',').map(Number), min = +arg('min', 4), reach = +arg('reach', 6), wob = +arg('wobble', 3), win = +arg('window', 1), out = arg('out', null), seam = process.argv.includes('--seam');
  const row = (name, m) => console.log(name.padEnd(22), String(m.meanStraight).padStart(5), String(m.bendShare).padStart(5), String(m.maxSouth).padStart(4), String(m.maxSide).padStart(4), String(m.maxRim).padStart(4), String(m.long9).padStart(4), String(m.minBelow).padStart(3), m.lone, m.saddle, m.square, 'blk', m.loneBlk);
  console.log('setting / seed'.padEnd(22), 'mean  bend  S    side rim  9+   low lone pinch sq');
  const sums = (name, ms) => { const a = f => ms.reduce((s, m) => s + f(m), 0), n = ms.length; return { meanStraight: +(a(m => m.meanStraight) / n).toFixed(2), bendShare: +(a(m => m.bendShare) / n).toFixed(2), maxSouth: Math.max(...ms.map(m => m.maxSouth)), maxSide: Math.max(...ms.map(m => m.maxSide)), maxRim: Math.max(...ms.map(m => m.maxRim)), long9: a(m => m.long9), minBelow: Math.min(...ms.map(m => m.minBelow)), lone: a(m => m.lone), saddle: a(m => m.saddle), square: a(m => m.square), loneBlk: a(m => m.loneBlk) }; };
  const today = process.argv.indexOf('--today');
  if (today >= 0) { const ms = []; for (const f of process.argv.slice(today + 1).filter(a => !a.startsWith('--'))) for (const wv of JSON.parse(readFileSync(f, 'utf8'))) { const m = measure(wv.w, wv.h, wv.raised, 3); ms.push(m); row('today ' + wv.seed, m); } row('today ALL', sums('today', ms)); }
  for (const face of faces) for (const D of ds) {
    setLandRule({ ...Object.fromEntries([['detail', D], ['faceRows', face], ['minFeature', min], ...(arg('reach', null) ? [['warpReach', reach]] : []), ...(arg('wobble', null) ? [['wobbleReach', wob]] : []), ...(arg('window', null) ? [['window', win]] : []), ...(arg('set', '') ? arg('set').split(',').map(p => { const [k, v] = p.split('='); return [k, Number(v)]; }) : [])]) });
    const ms = [], rs = [], t0 = Date.now(); let seamBad = 0, seamN = 0;
    for (const wv of WIN) {
      const r = rasterOf(wv.seed, wv.X, wv.Y, wv.w, wv.h), m = measure(wv.w, wv.h, r.raised, face); rs.push(r); ms.push(m);
      if (seam) { const s = seamDiff(wv.seed, wv.X, wv.Y, wv.w, wv.h); seamBad += s.bad; seamN += s.checked; }
      if (process.argv.includes('-v')) row(`D${D} f${face} s${wv.seed}`, m);
    }
    row(`D${D} f${face} min${min} ALL`, sums('all', ms));
    for (const s of [7, 13, 42]) { const i = WIN.findIndex(w => w.seed === s); if (i < 0) continue; row(`  seed ${s}`, ms[i]); }
    if (seam) console.log('  seam: differing tiles', seamBad, 'of', seamN);
    console.log('  ' + (Date.now() - t0) + ' ms');
    if (out) { mkdirSync(out, { recursive: true }); writeFileSync(`${out}/rasters-D${D}-f${face}.json`, JSON.stringify(rs)); }
  }
}
