// F6 checks (world-topdown-spec-1 section 4 and F6): streams, fords, bridges, falls, destination hearts, on sampled places of ONE seed (rule 12: one seed at a time).
//   node f6-checks.mjs <seed> [maxCells=140] [root=<this tree>]       prints one JSON line (and the cells that fail, with --list)
// The sample: every place a stream, a bridge or a falls touches (up to maxCells, spread over the realm), then plain places by the hash to fill it; the same cells on every tree, so a base tree (without F6) can be run for pockets.
//   C3  contour tiles (raised land beside low land) within 7 tiles of the sector's level line, % (none past 24)
//   C4  the trail and each stream cross every edge at the shared port tile: stream ports whose tiles (the port's width) are water, ford or bridge on both sides of the edge, broken ones counted
//   C5  the destination's heart: places where the destination asks for an overhang and the plan's heart is the overhang (of those where the walls give a south face run of 2+)
//   fords per stream place; walk pockets: a stream place whose low walkable tiles fall in two parts of 10+ tiles each (a place cut in two); place time (Node, ms)
import path from 'node:path';
const [seedS, maxS, rootArg] = process.argv.slice(2).filter(a => !a.startsWith('--')), seed = +seedS, maxCells = +(maxS || 140), list = process.argv.includes('--list');
const root = rootArg || path.resolve(new URL('../../..', import.meta.url).pathname);
const imp = f => import(path.join(root, 'prototypes/exploration/src/gen7', f));
const P = await imp('place.mjs'), { realm7 } = await imp('region.mjs'), PL = await imp('places.mjs'), { CW, CH } = P;
let ST = null; try { ST = await imp('streams.mjs'); } catch { /* a tree without F6 */ }
const RW = 80, re = realm7(seed).realm, S = {};
globalThis.F6_STATS = { routes: [], seen: new Set() };
// ---- the sample ----
const want = new Map();   // cell -> why
const add = (c, why) => { if (!want.has(c)) want.set(c, why); };
const feats = (re.features || []);
for (const f of feats) if (f.kind === 'stream') for (const c of f.cells) add(c, 'stream');
for (const f of feats) if (f.kind === 'bridge') for (const c of f.cells) add(c, 'bridge');
for (const f of feats) if (f.kind === 'falls') { add(f.links.foot, 'falls'); add(f.links.lip, 'falls'); }
for (const d of re.destinations || []) add(d.c, 'dest');
const keys = [...want.keys()].filter(c => { const X = c % RW, Y = (c / RW) | 0; return X > 1 && Y > 1 && X < RW - 2 && Y < 98; }).sort((a, b) => a - b);
const step = Math.max(1, Math.ceil(keys.length / maxCells)), cells = keys.filter((_, i) => i % step === 0).slice(0, maxCells);
S.cells = cells.length; S.candidates = keys.length;
const WALK = new Set([3, 5, 6, 10, 11, 12, 13, 14, 20, 21, 7]);   // sand, path, grass, scrub, litter, dry, turf, scree, ford, bridge, earth
let t0 = Date.now(), ms = [];
const info = new Map();
for (const c of cells) {
  const X = c % RW, Y = (c / RW) | 0, tt = Date.now(); const ct = P.cellTerrain(seed, X, Y); ms.push(Date.now() - tt); info.set(c, ct);
}
S.msMean = Math.round(ms.reduce((a, b) => a + b, 0) / ms.length); S.msMax = Math.max(...ms);
// ---- pockets and fords ----
let streamPlaces = 0, cut = 0, noFord = 0, ford1 = 0; const cutList = [], noFordList = [];
const streamCells = new Set(); for (const f of feats) if (f.kind === 'stream') for (const c of f.cells) streamCells.add(c);
const comps = (ct) => {
  const { terrain, w } = ct, seen = new Uint8Array(terrain.length), out = [];
  for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { const k = y * w + x; if (seen[k] || !WALK.has(terrain[k])) continue; let n = 0; const q = [k]; seen[k] = 1;
    for (let h = 0; h < q.length; h++) { const i = q[h]; n++; const ix = i % w, iy = (i / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X2 = ix + dx, Y2 = iy + dy; if (X2 < 1 || Y2 < 1 || X2 > CW || Y2 > CH) continue; const j = Y2 * w + X2; if (!seen[j] && WALK.has(terrain[j])) { seen[j] = 1; q.push(j); } } }
    out.push(n); }
  return out.sort((a, b) => b - a);
};
for (const c of cells) {
  if (!streamCells.has(c)) continue;
  const ct = info.get(c); streamPlaces++;
  const k = comps(ct); if (k.length > 1 && k[1] >= 10) { cut++; cutList.push(c % RW + ',' + ((c / RW) | 0)); }
  let fords = 0; for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) if (ct.terrain[y * ct.w + x] === 20) fords++;
  if (ST) { const pcs = ST.streamPieces(S2()).get(c) || []; if (pcs.some(p => p.in && p.out)) { if (fords < 2) { noFord++; noFordList.push(c % RW + ',' + ((c / RW) | 0)); } else ford1++; } }
}
function S2() { return globalThis.__S || (globalThis.__S = P.contextOf ? P.contextOf(seed) : null); }
S.streamPlaces = streamPlaces; S.cutPlaces = cut; S.cutList = cutList.slice(0, 20); S.throughNoFord = noFord; S.throughNoFordList = noFordList.slice(0, 20); S.throughWithFord = ford1;
// ---- C4 (streams): the tiles of every stream port, both sides of the edge ----
if (ST && P.contextOf) {
  const SS = P.contextOf(seed), pcs = ST.streamPieces(SS); let ports = 0, broken = 0, brokenRaised = 0; const brokenList = [];
  const wet = v => v === 2 || v === 20 || v === 21 || v === 1;
  for (const [c, ps] of pcs) for (const p of ps) {
    if (!p.out) continue;
    const X = c % RW, Y = (c / RW) | 0, ct = info.get(c); if (!ct) continue;
    ports++;
    const o = p.out, w = p.wOut, a = (w - 1) >> 1; let bad = 0;
    for (let k = 0; k < w; k++) {
      let ix, iy, jx, jy;   // the tile on this side and the one across, in the cell's array with its apron (own tiles 1..CW, 1..CH)
      if (o.side === 'e') { ix = CW; iy = o.off + k + 1; jx = CW + 1; jy = iy; } else if (o.side === 'w') { ix = 1; iy = o.off + k + 1; jx = 0; jy = iy; } else if (o.side === 's') { ix = o.off + k + 1; iy = CH; jx = ix; jy = CH + 1; } else { ix = o.off + k + 1; iy = 1; jx = ix; jy = 0; }
      if (!wet(ct.terrain[iy * ct.w + ix]) || !wet(ct.terrain[jy * ct.w + jx])) bad++;
    }
    if (bad) { broken++; const raisedPort = ST.edgeId && (globalThis.F6_STATS.portRaised || new Set()).has(ST.edgeId(X, Y, o.side)); if (raisedPort) brokenRaised++; if (brokenList.length < 12) brokenList.push(X + ',' + Y + o.side + (raisedPort ? ':raised' : ':?')); }
  }
  S.c4BrokenOnRaised = brokenRaised;
  S.c4Ports = ports; S.c4Broken = broken; S.c4BrokenList = brokenList;
}
// ---- falls ----
{ let n = 0, sites = 0, held = 0, tier2 = 0, none = [];
  for (const f of feats.filter(x => x.kind === 'falls')) { const fx = f.links.foot % RW, fy = (f.links.foot / RW) | 0; n++; const found = [];
    for (const [X, Y] of [[fx, fy], [fx, fy - 1]]) for (const s of P.cellTerrain(seed, X, Y).falls || []) if (!found.some(q => q.x === s.x && q.y === s.y)) found.push(s);
    if (found.length) { sites++; if (found.some(s => s.run < 6)) held++; if (found.some(s => s.run < 4)) tier2++; } else none.push(fx + ',' + fy); }
  S.falls = n; S.fallsSites = sites; S.fallsRunUnder6 = held; S.fallsRunUnder4 = tier2; S.fallsNoSite = none; }
// ---- bridges ----
{ let n = 0, laid = 0; for (const f of feats.filter(x => x.kind === 'bridge')) { n++; const c = f.cells[0], X = c % RW, Y = (c / RW) | 0, ct = P.cellTerrain(seed, X, Y); let b = 0; for (let i = 0; i < ct.terrain.length; i++) if (ct.terrain[i] === 21) b++; if (b >= 2) laid++; } S.bridges = n; S.bridgesLaid = laid; }
// ---- C5: the destination's heart ----
{ let asked = 0, got = 0, allowed = 0, allowedGot = 0, faceOnly = 0; const miss = [];
  for (const d of re.destinations || []) { if (d.heart !== 'overhang') continue; const X = d.c % RW, Y = (d.c / RW) | 0; if (X < 1 || Y < 1 || X >= RW - 1 || Y >= 99) continue; if (!cells.includes(d.c) && cells.length >= maxCells && !process.argv.includes('--allDest')) continue;
    const ct = P.cellTerrain(seed, X, Y), plan = PL.planOf(seed, X, Y); if (!plan) continue; asked++;
    const heart = plan.spots.find(s => s.role === 'heart'), ok = !!(heart && heart.id === 'overhang');
    // the walls give a face: two side by side raised tiles over low ground with raised land above (the overhang's roof), in the cell
    let face = false; const { terrain: T, w } = ct; for (let y = 3; y < CH - 4 && !face; y++) for (let x = 2; x < CW - 3 && !face; x++) { const r = (xx, yy) => T[yy * w + xx] === 8; if (r(x, y) && r(x + 1, y) && r(x, y - 1) && r(x + 1, y - 1) && !r(x, y + 1) && !r(x + 1, y + 1)) face = true; }
    if (ok) got++; if (face) faceOnly++; if ((plan.overhangCandidates || 0) > 0) { allowed++; if (ok) allowedGot++; else if (miss.length < 10) miss.push(X + "," + Y + ":" + d.kind); } }
  S.c5Asked = asked; S.c5FaceOnly = faceOnly; S.c5Got = got; S.c5Allowed = allowed; S.c5AllowedGot = allowedGot; S.c5Miss = miss; }
// ---- R15: at least half of the 5 x 5 tiles round a heart or an outpost walk, at its own level ----
{ let n = 0, ok = 0; const bad = [];
  for (const c of cells.filter((_, i) => i % 3 === 0)) { const X = c % RW, Y = (c / RW) | 0, plan = PL.planOf(seed, X, Y); if (!plan) continue; const ct = P.cellTerrain(seed, X, Y), T = ct.terrain, w = ct.w;
    const pts = []; const heart = plan.spots.find(s => s.role === 'heart'); if (heart) pts.push([heart.anchor[0], heart.anchor[1], 'heart']);
    for (const t of P.cellIR(seed, X, Y).traces || []) if (t.kind === 'outpost') pts.push([t.x, t.y, 'outpost']);
    for (const [px, py, kind] of pts) { const lv = T[py * w + px] === 8; let walk = 0, tot = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = px + dx, y = py + dy; if (x < 0 || y < 0 || x >= w || y >= ct.h) continue; tot++; const v = T[y * w + x]; if (lv ? v === 8 : WALK.has(v)) walk++; } n++; if (walk * 2 >= 25) ok++; else if (bad.length < 8) bad.push(X + ',' + Y + ':' + kind + ' ' + walk + '/25'); } }
  S.r15 = n; S.r15Ok = ok; S.r15Bad = bad; }
// ---- C3: contour tiles within 7 tiles of the sector's level line ----
if (P.sectorOf) { let tiles = 0, near = 0, far = 0, worst = 0;
  for (const c of cells.filter((_, i) => i % 2 === 0)) {
    const X = c % RW, Y = (c / RW) | 0, ct = P.cellTerrain(seed, X, Y), sec = P.sectorOf(seed, X, Y), { terrain: T, w } = ct;
    const nb = { e: P.sectorOf(seed, X + 1, Y), w: P.sectorOf(seed, X - 1, Y), s: P.sectorOf(seed, X, Y + 1), n: P.sectorOf(seed, X, Y - 1) };
    const BX = 6, BY = 7, lv = (bx, by) => bx < 0 ? nb.w.lv[by * 4 + 3] : bx > 3 ? nb.e.lv[by * 4] : by < 0 ? nb.n.lv[12 + bx] : by > 3 ? nb.s.lv[bx] : sec.lv[by * 4 + bx];
    const seg = [];   // the level line: block edges where the level differs, as [x0, y0, x1, y1] in cell tiles
    for (let by = 0; by < 4; by++) for (let bx = 0; bx < 4; bx++) { if (lv(bx, by) !== lv(bx + 1, by)) seg.push([(bx + 1) * BX, by * BY, (bx + 1) * BX, (by + 1) * BY]); if (lv(bx, by) !== lv(bx, by + 1)) seg.push([bx * BX, (by + 1) * BY, (bx + 1) * BX, (by + 1) * BY]); }
    for (let by = 0; by < 4; by++) { if (lv(-1, by) !== lv(0, by)) seg.push([0, by * BY, 0, (by + 1) * BY]); }
    for (let by = 0; by < 4; by++) { if (lv(3, by) !== lv(4, by)) seg.push([CW, by * BY, CW, (by + 1) * BY]); }
    for (let bx = 0; bx < 4; bx++) { if (lv(bx, -1) !== lv(bx, 0)) seg.push([bx * BX, 0, (bx + 1) * BX, 0]); if (lv(bx, 3) !== lv(bx, 4)) seg.push([bx * BX, CH, (bx + 1) * BX, CH]); }
    const dist = (px, py) => { let m = 1e9; for (const [x0, y0, x1, y1] of seg) { const dx = Math.max(x0 - px, 0, px - x1), dy = Math.max(y0 - py, 0, py - y1); m = Math.min(m, Math.max(dx, dy)); } return m; };
    for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) { if (T[y * w + x] !== 8) continue; const edge = T[(y + 1) * w + x] !== 8 || T[(y - 1) * w + x] !== 8 || T[y * w + x + 1] !== 8 || T[y * w + x - 1] !== 8; if (!edge) continue; tiles++; const d = seg.length ? dist(x - 1 + 0.5, y - 1 + 0.5) : 99; if (d <= 7) near++; else far++; if (d > worst && d < 99) worst = d; }
  }
  S.c3Tiles = tiles; S.c3Within7Pct = tiles ? +(100 * near / tiles).toFixed(1) : null; S.c3Worst = worst; }
// ---- R16: the stream's drawn length over the straight distance between its ports ----
{ const r = globalThis.F6_STATS.routes, flat = r.filter(q => !q.slope), slope = r.filter(q => q.slope), mean = a => a.length ? +(a.reduce((s, q) => s + q.len / q.straight, 0) / a.length).toFixed(2) : null; S.r16Flat = mean(flat); S.r16FlatN = flat.length; S.r16Slope = mean(slope); S.r16SlopeN = slope.length; }
// ---- splits (F6 try 2): the places the stream cut in two that got a ford (water) and the ones cut by something else (listed, not fixed) ----
{ const sp = globalThis.F6_STATS.splits || new Map(), w = [], o = []; for (const c of cells) { if (!streamCells.has(c)) continue; const r = sp.get(c % RW + ',' + ((c / RW) | 0)); if (!r) continue; if (r.w) w.push(c % RW + ',' + ((c / RW) | 0) + (r.w > 1 ? 'x' + r.w : '')); if (r.o) o.push(c % RW + ',' + ((c / RW) | 0)); }
  S.splitWater = w.length; S.splitWaterList = w; S.splitOther = o.length; S.splitOtherList = o; }
S.springs = globalThis.F6_STATS.springs || 0; S.springsKept = globalThis.F6_STATS.kept || 0; S.springsMoved = globalThis.F6_STATS.moved || 0; S.springsNoHollow = globalThis.F6_STATS.noHollow || 0;
S.totalMs = Date.now() - t0;
console.log(JSON.stringify({ seed, ...S }));
