// Region atlas: one top-down overview of land and places, with numbers. It reads the generator through its own modules (whatever branch it runs on); it re-implements nothing.
//   node prototypes/exploration/tools/atlas.mjs --seed 7 --at 30,40 --size 4x3 [--overlays levels,faces,ways,spine,pieces,finds,wayup,crossings] [--out DIR]
// --at is the window's first place (cell X,Y), --size its places across x down. Writes atlas-<seed>-<X>-<Y>-<n>x<m>.png and .json to --out (default ./atlas-out).
// A schematic (rule 18: diagrams may be code), never shown as art. 5 px a tile.
// Overlays are the OVERLAYS table below: name, what it reads, colour, key label. An overlay whose data the branch lacks is skipped with a note in the key.
// The measures (south faces, side runs, ends, low rows under lips, way-up sites) are measure() of land-shape-spec-1/scripts/measure.mjs, moved here; the face kinds and square corners are outlines.py's analyse(), moved here;
// the finds, plan and border numbers are from place-content-2/scripts/survey.mjs, gen7-places-check.mjs and border-measure.mjs, which this tool replaces.
import { mkdirSync, createWriteStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import PImage from 'pureimage';
import { cellIR, stairsInfo, raisedAt, levelAt, worldTiles, TV } from '../src/gen7/place.mjs';
import { CW, CH, RW, RH } from '../src/gen7/world.mjs';
import { realm7 } from '../src/gen7/region.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), S = 5;   // pixels a tile
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';

// ---- the measures (moved from land-shape-spec-1/scripts/measure.mjs; outlines.py analyse; a back rim added) ----
export function measure(w, h, bits) {
  const R = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : bits[y * w + x] === '1' ? 1 : 0);
  const lip = (x, y) => R(x, y) === 1 && R(x, y + 1) === 0;
  const runs = [], cases = new Array(16).fill(0);
  let diag = 0, lone = 0, saddle = 0;
  for (let y = 0; y < h - 1; y++) { let n = 0; for (let x = 0; x <= w; x++) { if (x < w && lip(x, y)) n++; else { if (n) runs.push(n); n = 0; } } }
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (lip(x, y) && !lip(x - 1, y) && !lip(x + 1, y)) {
    const d = lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1); if (d) diag++; else lone++;
  }
  for (let y = 0; y + 1 < h; y++) for (let x = 0; x + 1 < w; x++) { const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); cases[c]++; if (c === 6 || c === 9) saddle++; }
  const sides = [];
  for (const dx of [-1, 1]) for (let x = 1; x < w - 1; x++) { let n = 0, edge = false; for (let y = 0; y <= h; y++) { if (y < h && R(x, y) && !R(x + dx, y)) { n++; if (y === 0 || y === h - 1) edge = true; } else { if (n && !edge) sides.push(n); n = 0; edge = false; } } }
  const rims = [];   // the back rim: runs of raised cells with low ground just north of them
  for (let y = 1; y < h; y++) { let n = 0; for (let x = 0; x <= w; x++) { if (x < w && R(x, y) && !R(x, y - 1)) n++; else { if (n) rims.push(n); n = 0; } } }
  const ends = { tuck: 0, s1: 0, s2: 0, s3: 0 };
  for (let y = 4; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (lip(x, y)) for (const dx of [-1, 1]) {
    if (lip(x + dx, y)) continue;
    if (R(x + dx, y)) { ends.tuck++; continue; }
    let k = 0; while (k < 3 && !R(x + dx, y - k)) k++; ends['s' + k]++;
    if (k === 3) { const one = !lip(x - dx, y); ends[one ? 'jog' : 'square'] = (ends[one ? 'jog' : 'square'] || 0) + 1; }
  }
  let minBelow = 99; for (let y = 0; y < h - 7; y++) for (let x = 0; x < w; x++) if (lip(x, y)) { let k = 0; while (k < 6 && !R(x, y + 1 + k)) k++; if (k < minBelow) minBelow = k; }
  let sites = 0, sites4 = 0; for (let y = 3; y < h - 5; y++) for (let x = 1; x + 2 < w; x++) {
    let ok = lip(x, y) && lip(x + 1, y);
    for (let k = 1; k <= 3 && ok; k++) ok = R(x, y - k) && R(x + 1, y - k);
    for (let k = 1; k <= 4 && ok; k++) ok = !R(x, y + k) && !R(x + 1, y + k);
    if (ok) { sites++; if (lip(x - 1, y) && lip(x + 2, y)) sites4++; }
  }
  // face kinds and square corners (outlines.py analyse): a one-tile run is a bend, 8+ a ruler; a square corner is a face of 2+ ending at a side with three low rows beside it
  const kind = new Map(), square = [];
  for (let y = 0; y < h - 1; y++) { let x = 0; while (x < w) {
    if (!lip(x, y)) { x++; continue; }
    const x0 = x; while (x < w && lip(x, y)) x++;
    const n = x - x0, k = n === 1 ? 'bend' : n >= 8 ? 'ruler' : 'straight';
    for (let xx = x0; xx < x; xx++) kind.set(xx + ',' + y, k);
    for (const [xe, dx] of [[x0, -1], [x - 1, 1]]) { const xb = xe + dx; if (n >= 2 && xb >= 0 && xb < w && y >= 3 && !R(xb, y) && !R(xb, y - 1) && !R(xb, y - 2)) square.push([xe, y]); }
  } }
  const bends = [...kind.values()].filter(k => k === 'bend').length;
  const hist = {}; for (const r of runs) { const k = r >= 12 ? '12+' : String(r); hist[k] = (hist[k] || 0) + 1; }
  const long = runs.filter(r => r >= 8).length, mean = runs.reduce((a, b) => a + b, 0) / Math.max(1, runs.length);
  return { faces: { count: runs.length, mean: +mean.toFixed(2), longest: Math.max(0, ...runs), long8: long, hist }, longestSide: Math.max(0, ...sides), longestBackRim: Math.max(0, ...rims), bends, squareCorners: square.length,
    lowRowsUnderLips: minBelow === 99 ? null : minBelow, diagSteps: diag, loneOne: lone, saddle, wayupSites: sites, wayupStraight4: sites4, ends, cases, _kind: kind, _square: square };
}

// ---- the options ----
function args(argv) {
  const o = { seed: 7, at: [30, 40], size: [4, 3], overlays: null, out: './atlas-out' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (a === '--seed') { o.seed = +v; i++; } else if (a === '--at') { o.at = v.split(',').map(Number); i++; } else if (a === '--size') { o.size = v.split('x').map(Number); i++; }
    else if (a === '--overlays') { o.overlays = v.split(',').filter(Boolean); i++; } else if (a === '--out') { o.out = v; i++; } else throw new Error('unknown option ' + a);
  }
  return o;
}

// the optional plan module (the places structure pass): absent on a branch without it
async function planModule() { try { return await import('../src/gen7/places.mjs'); } catch { return null; } }

// ---- the window's data, read once ----
async function windowData(o) {
  const [X0, Y0] = o.at, [nx, ny] = o.size, w = nx * CW, h = ny * CH, gx0 = X0 * CW, gy0 = Y0 * CH, W = w + 2, H = h + 2;   // a one-tile margin for the faces at the window's edge
  const T = worldTiles(o.seed), t0 = performance.now();
  const ter = new Uint8Array(w * h), raised = new Uint8Array(W * H), level = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { ter[y * w + x] = T(gx0 + x, gy0 + y); level[y * w + x] = levelAt(o.seed, gx0 + x, gy0 + y); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) raised[y * W + x] = raisedAt(o.seed, gx0 + x - 1, gy0 + y - 1) ? 1 : 0;
  const bits = []; for (let y = 0; y < h; y++) { let r = ''; for (let x = 0; x < w; x++) r += raised[(y + 1) * W + x + 1] ? '1' : '0'; bits.push(r); }
  const places = [], pm = await planModule();
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const X = X0 + i, Y = Y0 + j, t1 = performance.now();
    let ir = null, plan = null;
    try { ir = cellIR(o.seed, X, Y); } catch { /* a water cell or outside the realm */ }
    if (pm && pm.planOf) { try { plan = pm.planOf(o.seed, X, Y); } catch { plan = null; } }
    places.push({ X, Y, i, j, ir, plan, ms: performance.now() - t1 });
  }
  return { o, w, h, gx0, gy0, ter, raised, W, level, rows: bits.join(''), places, stairs: stairsInfo(o.seed), pm, realm: realm7(o.seed).realm, ms: performance.now() - t0 };
}

// the destination kinds, each in its own colour (the key lists them one row a kind; white ford has a grey outline so it shows on the white sheet)
const DEST = { pass: '#d9a400', ravine: '#d62828', falls: '#00a0b4', 'ravine head': '#f0961e', ford: '#ffffff', spring: '#1c9a3c', 'stream mouth': '#1e3cc8' };
// ---- the overlays: a table. Each: name, what it reads, colour, key label, and draw(ctx, d, px) which returns false when the branch lacks the data ----
const rect = (g, x, y, w, h) => g.fillRect(x, y, w, h);
const box = (g, x, y, w, h, c, t) => { g.fillStyle = c; g.fillRect(x, y, w, t); g.fillRect(x, y + h - t, w, t); g.fillRect(x, y, t, h); g.fillRect(x + w - t, y, t, h); };
const inWin =(d, x, y) => x >= 0 && y >= 0 && x < d.w && y < d.h;
const OVERLAYS = [
  { name: 'levels', reads: 'levelAt per tile (place.mjs)', colour: '#6f9a4a', label: 'land above the lowest level, darker green the higher', draw(g, d) {
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) { const l = d.level[y * d.w + x]; if (l > 0 && d.raised[(y + 1) * d.W + x + 1]) { g.fillStyle = l > 1 ? '#5d8a3a' : '#7fa85a'; rect(g, x * S, y * S, S, S); } }
    return true; } },
  { name: 'faces', reads: 'raisedAt per tile (place.mjs), measured as measure.mjs', colour: '#805230', label: 'south rock face by kind (brown 2-7, red 8+ ruler, orange bend), black box = square corner', draw(g, d) {
    const m = d.meas, col = { bend: '#f0961e', straight: '#805230', ruler: '#d62828' };
    for (const [k, v] of m._kind) { const [x, y] = k.split(',').map(Number); g.fillStyle = col[v]; rect(g, x * S, (y + 1) * S - 1, S, 3 * S); }
    for (const [x, y] of m._square) box(g, x * S + S / 2 - 4, (y + 1) * S - 4, 9, 9, '#141414', 2);
    return true; } },
  { name: 'ways', reads: 'cellIR openings per place (the ways in)', colour: '#1c9a3c', label: 'place border stretches: green open, dark red closed', draw(g, d) {
    for (const p of d.places) {
      if (!p.ir) continue;
      const ox = p.i * CW * S, oy = p.j * CH * S, len = { N: CW, S: CW, W: CH, E: CH };
      for (const side of ['N', 'S', 'W', 'E']) {
        const open = new Uint8Array(len[side]); for (const op of p.ir.openings) if (op.side === side) for (let k = op.from; k <= op.to; k++) open[k - 1] = 1;
        for (let k = 0; k < len[side]; k++) {
          g.fillStyle = open[k] ? '#1c9a3c' : '#7a1818';
          const t = open[k] ? 3 : 1;
          if (side === 'N') rect(g, ox + k * S, oy, S, t); else if (side === 'S') rect(g, ox + k * S, oy + CH * S - t, S, t);
          else if (side === 'W') rect(g, ox, oy + k * S, t, S); else rect(g, ox + CW * S - t, oy + k * S, t, S);
        }
      }
    }
    return true; } },
  { name: 'spine', reads: 'planOf spine per place (places.mjs)', colour: '#1e50c8', label: 'shortest paths between the ways in and the way up', draw(g, d) {
    if (!d.pm || !d.pm.planOf) return false; let any = false;
    for (const p of d.places) { if (!p.plan) continue; any = true; const pl = p.plan; g.fillStyle = '#1e50c8';
      for (let y = 0; y < pl.h; y++) for (let x = 0; x < pl.w; x++) if (pl.spine[y * pl.w + x]) { const wx = pl.x0 + x - d.gx0, wy = pl.y0 + y - d.gy0; if (inWin(d, wx, wy)) rect(g, wx * S + 1, wy * S + 1, S - 2, S - 2); } }
    return any; } },
  { name: 'pieces', reads: 'planOf spots, landmarks per place (places.mjs, hold.mjs)', colour: '#9b30c8', label: 'set pieces: purple box = spot, gold ring = heart, star = landmark', draw(g, d) {
    let any = false;
    for (const p of d.places) {
      if (p.plan) for (const s of p.plan.spots) { any = true; const wx = p.plan.x0 + s.x - d.gx0, wy = p.plan.y0 + s.y - d.gy0; box(g, wx * S, wy * S, s.w * S, s.h * S, s.role === 'heart' ? '#d9a400' : '#9b30c8', 2); }
      if (p.ir) for (const l of p.ir.landmarks) { any = true; const wx = p.ir.origin.x + l.x - d.gx0, wy = p.ir.origin.y + l.y - d.gy0; g.fillStyle = '#e08a00'; g.fillRect(wx * S - 2, wy * S - 2, S + 4, S + 4); }
    }
    return any; } },
  { name: 'finds', reads: 'cellIR finds per place (hold.mjs)', colour: '#e0b000', label: 'pod (yellow), stone (grey), other kinds (orange)', draw(g, d) {
    const col = { pod: '#e0b000', stone: '#555555' };
    for (const p of d.places) if (p.ir) for (const f of p.ir.finds) { const wx = p.ir.origin.x + f.x - d.gx0, wy = p.ir.origin.y + f.y - d.gy0; g.fillStyle = col[f.kinds[0]] || '#e06000'; g.fillRect(wx * S - 1, wy * S - 1, S + 2, S + 2); box(g, wx * S - 1, wy * S - 1, S + 2, S + 2, '#000', 1); }
    return true; } },
  { name: 'wayup', reads: 'stairsInfo wayup rectangles (place.mjs)', colour: '#00a0b4', label: 'way up (cyan bar on the south face)', draw(g, d) {
    for (const st of d.stairs) if (st.wayup) { const wx = st.wayup.x - d.gx0, wy = st.wayup.y - d.gy0; if (wx + st.wayup.w > 0 && wy > -1 && wx < d.w && wy < d.h) { g.fillStyle = '#00a0b4'; rect(g, wx * S, wy * S, st.wayup.w * S, S * 2); } }
    return true; } },
  { name: 'crossings', reads: 'stairsInfo stairs between cells (place.mjs; the region\'s crossings)', colour: '#c81e78', label: 'stair between two places (magenta bar)', draw(g, d) {
    for (const st of d.stairs) {
      const [ax, ay] = st.A, [bx, by] = st.B; const mx = st.south ? ax * CW + st.port : bx * CW, my = st.south ? by * CH : ay * CH + CH / 2;
      const wx = mx - d.gx0, wy = my - d.gy0; if (wx < -3 || wy < -3 || wx > d.w + 3 || wy > d.h + 3) continue;
      g.fillStyle = '#c81e78'; if (st.south) rect(g, wx * S - 6, wy * S - 1, 14, 3); else rect(g, wx * S - 1, wy * S - 6, 3, 14);
    }
    return true; } },
  { name: 'features', reads: 'realm.features and realm.destinations (gen7/features.mjs)', colour: '#0a3cff', label: 'the realm cell by cell (the lines below are the key)', extra: [['#0a3cff', 'stream line (thin where it runs under raised land)'], ['#00a0b4', 'falls: bar on the foot cell'], ['#d62828', 'red box: a ravine cut into the land (stream ravine thick, through-ravine thin)'], ['#141414', 'black bar: escarpment south face'], ['#7a4a1e', 'brown dot: range crest'], ['#1c9a3c', 'green triangle: pass'], ['#888888', 'small square beside a cell centre = a destination; one row a kind, each in its own colour:'], ...Object.entries(DEST).map(([k, c]) => [c, '  destination: ' + k])], draw(g, d) {
    const re = d.realm; if (!re || !re.features) return false;
    const [X0, Y0] = d.o.at, cw = CW * S, ch = CH * S, cx = c => ((c % RW) - X0) * cw + cw / 2, cy = c => (((c / RW) | 0) - Y0) * ch + ch / 2;
    const near = c => { const x = (c % RW) - X0, y = ((c / RW) | 0) - Y0; return x >= -1 && y >= -1 && x <= d.o.size[0] && y <= d.o.size[1]; };
    const seg = (a, b, t) => { const x0 = cx(a), y0 = cy(a), x1 = cx(b), y1 = cy(b); g.fillRect(Math.min(x0, x1) - t / 2, Math.min(y0, y1) - t / 2, Math.abs(x1 - x0) + t, Math.abs(y1 - y0) + t); };
    for (const f of re.features) {
      if (f.kind === 'stream') for (let i = 1; i < f.cells.length; i++) { const a = f.cells[i - 1], b = f.cells[i]; if (!near(a) && !near(b)) continue; g.fillStyle = '#0a3cff'; seg(a, b, i <= f.links.seen ? 2 : 5); }
      else if (f.kind === 'escarpment') for (const c of f.cells) { if (!near(c)) continue; g.fillStyle = '#141414'; g.fillRect(((c % RW) - X0) * cw, (((c / RW) | 0) - Y0 + 1) * ch - 2, cw, 4); }
      else if (f.kind === 'range') for (const c of f.cells) { if (!near(c)) continue; g.fillStyle = '#7a4a1e'; g.fillRect(cx(c) - 4, cy(c) - 4, 9, 9); }
      else if (f.kind === 'ravine') for (const c of f.cells) { if (!near(c)) continue; box(g, cx(c) - 14, cy(c) - 14, 29, 29, '#d62828', 3); }
      else if (f.kind === 'through-ravine') for (const c of f.cells) { if (!near(c)) continue; box(g, cx(c) - 14, cy(c) - 14, 29, 29, '#d62828', 1); }
      else if (f.kind === 'falls') { if (!near(f.links.foot)) continue; g.fillStyle = '#00a0b4'; g.fillRect(cx(f.links.foot) - 16, cy(f.links.foot) - ch / 2 - 3, 33, 7); }
      else if (f.kind === 'pass') { const c = f.cells[0]; if (!near(c)) continue; g.fillStyle = '#1c9a3c'; for (let k = 0; k < 10; k++) g.fillRect(cx(c) - k, cy(c) - 10 + 2 * k, 2 * k + 1, 2); }
    }
    for (const t of re.destinations) { if (!near(t.c)) continue; g.fillStyle = '#000'; g.fillRect(cx(t.c) + 14, cy(t.c) - 28, 19, 19); g.fillStyle = DEST[t.kind] || '#888'; g.fillRect(cx(t.c) + 16, cy(t.c) - 26, 15, 15); }
    return true; } },
];
const ALL = OVERLAYS.map(o => o.name);

// ---- the numbers ----
function numbers(d) {
  const { o } = d, m = d.meas, kinds = {}, setPieces = {}, per = [];
  let finds = 0, openT = 0, closedT = 0, hearts = 0, seen = 0, noWay = 0;
  for (const p of d.places) {
    const pn = { place: [p.X, p.Y], land: !!p.ir, ms: Math.round(p.ms) };
    if (p.ir) {
      const f = {}; for (const x of p.ir.finds) { f[x.kinds[0]] = (f[x.kinds[0]] || 0) + 1; kinds[x.kinds[0]] = (kinds[x.kinds[0]] || 0) + 1; finds++; }
      pn.finds = f; let open = 0; for (const op of p.ir.openings) open += op.to - op.from + 1;
      const total = 2 * CW + 2 * CH; pn.openTiles = open; pn.closedTiles = total - open; openT += open; closedT += total - open;
      for (const l of p.ir.landmarks) setPieces['landmark:' + l.kind] = (setPieces['landmark:' + l.kind] || 0) + 1;
    }
    if (p.plan) {
      const heart = p.plan.spots.find(s => s.role === 'heart');
      for (const s of p.plan.spots) setPieces[s.kind] = (setPieces[s.kind] || 0) + 1;
      pn.heart = heart ? { kind: heart.kind, tier: heart.tier, seenFromWay: !!heart.seenFrom } : null;
      if (heart) { hearts++; if (heart.seenFrom) seen++; }
      if (!p.plan.entries.length) noWay++;
    }
    per.push(pn);
  }
  const strip = ({ _kind, _square, cases, ...rest }) => rest;
  return { seed: o.seed, window: { at: o.at, size: o.size, tiles: [d.w, d.h] }, totals: { ...strip(m), finds, findsByKind: kinds, setPiecesByKind: setPieces, heartsSeenFromAWay: { hearts, seen }, borderTiles: { open: openT, closed: closedT }, placesWithNoWayIn: noWay, buildMs: Math.round(d.ms) }, places: per };
}

// the realm's features that touch the window's cells (streams, falls, ravines found, through-ravines found, ranges, passes, escarpments) and its destinations by kind
function featureCounts(d) {
  const re = d.realm; if (!re || !re.features) return null;
  const [X0, Y0] = d.o.at, [nx, ny] = d.o.size, inW = c => { const x = (c % RW) - X0, y = ((c / RW) | 0) - Y0; return x >= 0 && y >= 0 && x < nx && y < ny; };
  const kinds = {}, dest = {};
  for (const f of re.features) if (f.cells.some(inW)) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  for (const t of re.destinations) if (inW(t.c)) dest[t.kind] = (dest[t.kind] || 0) + 1;
  return { inWindow: kinds, destinations: dest };
}

// ---- the picture ----
const BASE = { [TV.WATER]: '#8cb4dc', [TV.DEEP]: '#5a86bc', [TV.SAND]: '#e6d6a0', [TV.CLIFF]: '#a8c47c' };
function commit() {
  const run = a => { try { return execFileSync('git', ['-C', HERE, ...a], { encoding: 'utf8' }).trim(); } catch { return '?'; } };
  return run(['rev-parse', '--abbrev-ref', 'HEAD']) + ' ' + run(['rev-parse', '--short', 'HEAD']);
}
export async function atlas(opts) {
  const o = { ...opts }; o.overlays = o.overlays || ALL;
  const d = await windowData(o);
  d.meas = measure(d.w, d.h, d.rows);
  const shown = [], skipped = [];
  const PAD = 12, top = 52, PW = d.w * S, PH = d.h * S, keyH = 24 * (6 + OVERLAYS.reduce((n, v) => n + 1 + (v.extra || []).length, 0)), IW = Math.max(PW + PAD * 2, 900);
  const img = PImage.make(IW, top + PH + keyH + PAD), g = img.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, img.width, img.height);
  const map = PImage.make(PW, PH), gm = map.getContext('2d');   // the map on its own layer, laid on the sheet below the title
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const raised = d.raised[(y + 1) * d.W + x + 1]; gm.fillStyle = raised ? '#a8c47c' : (BASE[d.ter[y * d.w + x]] || '#eae6d6'); gm.fillRect(x * S, y * S, S, S);
  }
  gm.fillStyle = '#2a2a2a';   // place borders
  for (let i = 0; i <= o.size[0]; i++) gm.fillRect(Math.min(i * CW * S, PW - 1), 0, 1, PH);
  for (let j = 0; j <= o.size[1]; j++) gm.fillRect(0, Math.min(j * CH * S, PH - 1), PW, 1);
  for (const name of o.overlays) {
    const ov = OVERLAYS.find(v => v.name === name); if (!ov) { skipped.push([name, 'no such overlay']); continue; }
    let ok = false, err = ''; try { ok = ov.draw(gm, d); } catch (e) { ok = false; err = String(e.message).slice(0, 60); }
    (ok ? shown : skipped).push(ok ? ov : [name, err || 'this branch lacks its data']);
  }
  g.drawImage(map, PAD, top);
  const f = PImage.registerFont(FONT, 'Dej'); f.loadSync();
  g.fillStyle = '#000'; g.font = '18pt Dej';
  g.fillText('Atlas: seed ' + o.seed + ', places ' + o.at.join(',') + ', ' + o.size.join(' x ') + ' places (' + d.w + ' x ' + d.h + ' tiles)', PAD, 24);
  g.font = '11pt Dej'; g.fillStyle = '#444'; g.fillText('commit ' + commit() + '; 5 px a tile; a schematic from the generator, not art', PAD, 44);
  let ky = top + PH + 24; g.font = '12pt Dej';
  g.fillStyle = '#000'; g.fillText('Key', PAD, ky); ky += 24;
  for (const [c, t] of [['#a8c47c', 'raised land'], ['#eae6d6', 'low ground (blue water, tan sand)']]) { g.fillStyle = c; g.fillRect(PAD, ky - 12, 22, 14); g.fillStyle = '#000'; g.fillText(t, PAD + 32, ky); ky += 22; }
  for (const ov of shown) { g.fillStyle = ov.colour; g.fillRect(PAD, ky - 12, 22, 14); g.fillStyle = '#000'; g.fillText(ov.name + ': ' + ov.label, PAD + 32, ky); ky += 22; for (const [c, t] of ov.extra || []) { g.fillStyle = "#777"; g.fillRect(PAD + 23, ky - 11, 16, 12); g.fillStyle = c; g.fillRect(PAD + 24, ky - 10, 14, 10); g.fillStyle = '#000'; g.fillText(t, PAD + 46, ky); ky += 20; } }
  for (const [n, why] of skipped) { g.fillStyle = '#888'; g.fillText(n + ': skipped, ' + why, PAD + 32, ky); ky += 22; }
  const stem = path.join(o.out, 'atlas-' + o.seed + '-' + o.at.join('-') + '-' + o.size.join('x'));
  mkdirSync(o.out, { recursive: true });
  await PImage.encodePNGToStream(img, createWriteStream(stem + '.png'));
  const json = { ...numbers(d), features: featureCounts(d), overlays: { shown: shown.map(v => v.name), skipped: skipped.map(([n, why]) => n + ': ' + why) }, commit: commit() };
  const { writeFileSync } = await import('node:fs'); writeFileSync(stem + '.json', JSON.stringify(json, null, 1) + '\n');
  return { png: stem + '.png', json: stem + '.json', numbers: json };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const r = await atlas(args(process.argv.slice(2)));
  console.log(r.png); console.log(r.json); console.log(JSON.stringify(r.numbers.totals.faces), 'build ms', r.numbers.totals.buildMs);
}
