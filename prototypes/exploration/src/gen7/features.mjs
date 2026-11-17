// The realm's named features, read off the realm's arrays (world-topdown-spec-1 section 2). Pure, whole numbers, no imports, so it runs in Node and on the small engine.
// so it runs in Node and on the small engine. NOT game code: the spec's realm rule written out so it can be measured.
//
// What it makes (spec section 2.1), in order, each reading only what is above it:
//   water bodies  rivers (water, kind 1) and lakes / ponds (kind 2), 4-connected, off the coast ring
//   streams       flow lines below the river threshold: acc >= STREAM_ACC, followed down the realm's D4 flow (world.mjs rawRealm `down`) to water or another stream
//   drops         where a stream leaves raised land: a south face -> falls; any other side -> a ravine, cut by planCuts (world-f3 F3) up the stream as far as the water cuts: RAV_MAX cells at most, further for a bigger flow
//   ranges        raised components of RANGE_MIN cells or more; hills are the smaller ones
//   passes        a range spanning PASS_SPAN+ cells with no cut through it gets one straight cut of 1..PASS_MAX raised cells, lowest first, every PASS_EVERY cells of span
//   cliff lines   the contour between the levels traced as loops on the cell corners; escarpments are the stretches of a loop with no back rim and ESC_MIN+ south-face edges
//   destinations  from the features (section 2.4)
export const P = {
  STREAM_ACC: 20,   // flow (catchment, humidity-weighted) at which a dry cell carries a stream
  STREAM_MIN: 4,    // cells: shorter streams are dropped
  RAV_MAX: 6,       // cells a stream ravine cuts back into raised land, at most (the first cell is always cut)
  RAV_K: 40,        // x 1000: the water cuts on while the raised land is under this many thousandths of height over the raise line per root of the flow (so a bigger stream cuts further)
  RANGE_LIFT: 320,  // height above the raising height (x 1000) of a range's cells: about the top 15% of the raised land
  RANGE_MIN: 12,    // cells: a range (smaller crest patches are not named)
  PASS_LIFT: 200,   // a pass stands on raised land at least this high (x 1000)
  PASS_MAX: 4,      // raised cells a through-ravine may cut, at most
  PASS_GAP: 8,      // cells between two passes, or two through-ravines, at least
  DETOUR_MIN: 30,   // cells: a through-ravine is cut only where the low land at its two ends is further apart than this on foot (one a region at most)
  ESC_MIN: 4,       // south-face edges: an escarpment
  LAKE_MIN: 5,      // water cells: a lake (under it a pond)
  DEST_GAP: 3,      // cells (Chebyshev) between two destinations, at least
  SPRING_MIN: 8,    // W4: an escarpment of this many south faces or more has water at its foot (else a spring is made)
  SPRING_NEAR: 2,   // W4: water coming out within this many cells (Chebyshev) of its foot counts
  SPRING_RUN: 8,    // W4: a long foot (SPRING_MIN+ faces) with a dry stretch of this many faces gets another spring in the stretch (second try; the first, one spring a dry foot, left 33% of faces with water)
};
const WATER = 4;    // world.mjs L.WATER

const geom = (RW, RH) => { const NR = RW * RH, X = c => c % RW, Y = c => (c / RW) | 0, inR = (x, y) => x >= 0 && y >= 0 && x < RW && y < RH;
  const nb4 = c => { const x = X(c), o = []; if (c >= RW) o.push(c - RW); if (x < RW - 1) o.push(c + 1); if (c < NR - RW) o.push(c + RW); if (x > 0) o.push(c - 1); return o; };
  return { NR, X, Y, inR, nb4 }; };
// water bodies and streams: read off the land, the flow and the level (a stream follows the realm's D4 flow to water, the coast or another stream)
function waterOf(J, level) {
  const { RW } = J, { NR, nb4 } = geom(RW, J.RH), land = J.land, coast = J.coast, down = J.down, acc = J.acc, wet = c => land[c] === WATER;
  const body = new Int32Array(NR).fill(-1), bodies = [];
  for (let s = 0; s < NR; s++) { if (!wet(s) || coast[s] || body[s] >= 0) continue; const id = bodies.length, cells = [s]; body[s] = id;
    for (let h = 0; h < cells.length; h++) for (const n of nb4(cells[h])) if (wet(n) && !coast[n] && body[n] < 0) { body[n] = id; cells.push(n); }
    const river = cells.filter(c => J.wkind[c] === 1).length * 2 >= cells.length;
    bodies.push({ id, kind: river ? 'river' : cells.length >= P.LAKE_MIN ? 'lake' : 'pond', cells, fords: cells.filter(c => J.ford[c]) }); }
  const ex = new Set(), isStream = c => !wet(c) && !coast[c] && acc[c] >= P.STREAM_ACC && !ex.has(c);
  const sid = new Int32Array(NR).fill(-1), streams = [];
  const hasUp = c => nb4(c).some(m => down[m] === c && isStream(m));
  let sources;
  // a lake lets out one stream: of the lines that start on its shore (a lake or pond is not a river), the one with the most flow stays and the others start one cell on
  for (let round = 0; round < 8; round++) {
    sources = []; for (let c = 0; c < NR; c++) if (isStream(c) && !hasUp(c)) sources.push(c);
    const byBody = new Map(); for (const s of sources) for (const n of nb4(s)) { const b = body[n]; if (b >= 0 && bodies[b].kind !== 'river') { if (!byBody.has(b)) byBody.set(b, new Set()); byBody.get(b).add(s); } }
    let moved = false;
    for (const set of byBody.values()) { if (set.size < 2) continue; const all = [...set].sort((p, q) => acc[q] - acc[p] || p - q); for (const s of all.slice(1)) { ex.add(s); moved = true; } }
    if (!moved) break;
  }
  sources.sort((a, b) => acc[b] - acc[a] || a - b);   // not needed for the result (each line is followed to its end), kept for a stable order
  let uphill = 0;
  for (const s of sources) {
    const cells = []; let c = s, mouth = { kind: 'end', c: -1 };
    while (c >= 0) {
      if (wet(c) || coast[c]) { mouth = { kind: coast[c] ? 'coast' : bodies[body[c]] ? bodies[body[c]].kind : 'water', c, body: body[c] }; break; }
      if (sid[c] >= 0) { mouth = { kind: 'stream', c, stream: sid[c] }; break; }
      if (cells.length && level[c] > level[cells[cells.length - 1]]) { uphill++; cells.length = 0; }   // the flow climbs a level (the raising height differs by biome): the stream starts again above it
      cells.push(c); c = down[c];
    }
    if (cells.length < P.STREAM_MIN) continue;
    const id = streams.length; for (const k of cells) sid[k] = id;
    streams.push({ id, cells, source: cells[0], mouth });
  }
  return { body, bodies, sid, streams, uphill };
}

// ---- the cuts (build step F3): stream ravines and through-ravines, planned on the realm's levels before the raising heights are written ----
// J: RW, RH, level, land, ford, wkind, acc, down, slot (per cell), coast (the rim ring), lift (the worn height over the raise line, thousandths), seat(c) (a stair could stand on the face under c).
// Returns the levels with the cuts made, the cuts and their counts. Whole numbers and no engine maths beyond + - * /, so Node and the small engine agree.
export function planCuts(J) {
  const { RW, RH } = J, { NR, X, Y, inR, nb4 } = geom(RW, RH), land = J.land, coast = J.coast, acc = J.acc, wet = c => land[c] === WATER;
  const work = Uint8Array.from(J.level), W = waterOf(J, work), stats = { ravinesRefused: 0, ravinesShortened: 0, gapsRefused: 0, strandRefused: 0 };
  // a cut never strands raised land: every raised part beside it keeps a south face a stair can stand on
  const pass = c => !wet(c) || J.ford[c] === 1;
  const stairOk = (lv, c) => lv[c] === 1 && c + RW < NR && lv[c + RW] === 0 && pass(c) && pass(c + RW) && J.seat(c);
  const strands = (lv, cut) => { const seen = new Uint8Array(NR);
    for (const k of cut) for (const s of nb4(k)) { if (!lv[s] || seen[s]) continue; const cells = [s]; seen[s] = 1; let has = false;
      for (let h = 0; h < cells.length; h++) { const u = cells[h]; if (stairOk(lv, u)) { has = true; break; } for (const n of nb4(u)) if (lv[n] && !seen[n]) { seen[n] = 1; cells.push(n); } }
      if (!has) return true; }
    return false; };
  const saddleAt = (lv, c) => { const x = X(c), y = Y(c); for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) { const a = (y + oy) * RW + x + ox; if (!inR(x + ox, y + oy) || !inR(x + ox + 1, y + oy + 1)) continue;
    const b = a + 1, d = a + RW, e = a + RW + 1; if (lv[a] === lv[e] && lv[b] === lv[d] && lv[a] !== lv[b]) return true; } return false; };
  const refused = (lv, cut) => cut.some(c => saddleAt(lv, c) || nb4(c).some(n => coast[n]) || X(c) <= 1 || Y(c) <= 1 || X(c) >= RW - 2 || Y(c) >= RH - 2);
  // ---- stream ravines: a stream that leaves raised land through a side wall or the back rim cuts back up its own line; it cuts on while the land over it is low for its flow (a bigger stream cuts further) ----
  const ravines = [];
  for (const st of W.streams) {
    const cs = st.cells; for (let firstLow = 1; firstLow < cs.length; firstLow++) { if (!work[cs[firstLow - 1]] || work[cs[firstLow]]) continue;   // every place the stream comes out of raised land
    const a = cs[firstLow - 1], b = cs[firstLow]; if (b === a + RW) continue;   // a south face: falls
    let n = 1; while (n < P.RAV_MAX && firstLow - n - 1 >= 0) { const c = cs[firstLow - n - 1]; if (!work[c]) break; const lf = J.lift[c] > 0 ? J.lift[c] : 0; if (lf * lf > P.RAV_K * P.RAV_K * acc[c]) break; n++; }
    let done = false, shrunk = false, why = 0;
    for (; n >= 1 && !done; n--) { const cut = cs.slice(firstLow - n, firstLow), lv = work.slice(); for (const c of cut) lv[c] = 0;
      if (refused(lv, cut)) { why = 1; shrunk = true; continue; }
      if (strands(lv, cut)) { why = 2; shrunk = true; continue; }
      for (const c of cut) work[c] = 0; ravines.push({ cells: cut, head: cut[0], mouth: b, flow: acc[cut[cut.length - 1]] }); done = true; if (shrunk) stats.ravinesShortened++; }
    if (!done) { stats.ravinesRefused++; if (why === 2) stats.strandRefused++; } }
  }
  // ---- through-ravines: a dry cut of 1..PASS_MAX raised cells across a neck of the raised land, where the low land on its two ends is far apart on foot ----
  // (one height: the raised land is mostly one terrace entered only up its south faces, so a neck cut is the way through it)
  const lowWalk = c => !work[c] && pass(c) && !coast[c];
  const walkDist = (a, b, lim) => { const d = new Map([[a, 0]]), q = [a]; for (let h = 0; h < q.length; h++) { const u = q[h], k = d.get(u); if (u === b) return k; if (k >= lim) continue;
    for (const n of nb4(u)) if (!d.has(n) && lowWalk(n)) { d.set(n, k + 1); q.push(n); } } return 9999; };
  const necks = [];
  for (let c = 0; c < NR; c++) { if (!work[c]) continue; for (const [d, ax] of [[1, 'x'], [RW, 'y']]) {
    const back = c - d; if ((ax === 'x' && X(c) === 0) || back < 0 || !lowWalk(back)) continue;
    const run = [c]; let k = c;
    while (run.length <= P.PASS_MAX) { const n = k + d; if (n >= NR || (ax === 'x' && X(n) === 0)) break; if (work[n]) { run.push(n); k = n; continue; } if (lowWalk(n)) necks.push({ cells: run.slice(), a: back, b: n, axis: ax, e: run.reduce((s, q) => s + J.lift[q], 0) }); break; } } }
  necks.sort((p, q) => p.cells.length - q.cells.length || p.e - q.e || p.cells[0] - q.cells[0]);
  const gaps = [], gapSlot = new Set();
  for (const k of necks) {
    const m = k.cells[k.cells.length >> 1], s = J.slot[m]; if (gapSlot.has(s)) continue;
    if (gaps.some(g => Math.max(Math.abs(X(g.mid) - X(m)), Math.abs(Y(g.mid) - Y(m))) < P.PASS_GAP)) continue;
    if (walkDist(k.a, k.b, P.DETOUR_MIN) < P.DETOUR_MIN) continue;   // the low land already joins round it: no cut
    const lv = work.slice(); for (const c of k.cells) lv[c] = 0; if (refused(lv, k.cells)) { stats.gapsRefused++; continue; }
    if (strands(lv, k.cells)) { stats.gapsRefused++; stats.strandRefused++; continue; }
    for (const c of k.cells) work[c] = 0;
    gaps.push({ cells: k.cells, mid: m, axis: k.axis }); gapSlot.add(s);
  }
  return { level: work, ravines, gaps, stats };
}

// The realm's named features. J.cuts (planCuts's) says which cells the realm already lowered; they are listed here, the level is read as it stands.
export function realmFeatures(J) {
  const { RW, RH } = J, { NR, X, Y, inR, nb4 } = geom(RW, RH), level = Uint8Array.from(J.level), land = J.land, coast = J.coast, wet = c => land[c] === WATER;
  const stats = {}, cuts = J.cuts || { ravines: [], gaps: [], stats: {} };
  const { bodies, sid, streams, uphill } = waterOf(J, level);
  stats.uphillRestarts = uphill;
  // ---- drops: falls on a south face, a ravine where the realm cut one ----
  // On raised land a stream runs unseen (one height: no water on raised tops); it comes out where its line leaves the raised land (or at its ravine's head).
  const falls = [], ravines = [], ravHead = new Map(cuts.ravines.map(r => [r.head, r]));
  for (const st of streams) {
    const cs = st.cells, firstLow = cs.findIndex(c => !level[c]);
    st.seen = firstLow < 0 ? cs.length : firstLow;   // cells hidden under raised land before the stream comes out
    if (firstLow <= 0) continue;
    const r = ravHead.get(cs[firstLow]);
    if (r) { st.drop = 'ravine'; continue; }
    const a = cs[firstLow - 1], b = cs[firstLow];
    if (b === a + RW) { falls.push({ stream: st.id, lip: a, foot: b }); st.drop = 'falls'; continue; }
    st.drop = 'spill';
  }
  for (const r of cuts.ravines) if (sid[r.head] >= 0) ravines.push({ stream: sid[r.head], cells: r.cells, head: r.head, mouth: r.mouth });
  const gaps = cuts.gaps;
  stats.ravinesRefused = cuts.stats.ravinesRefused || 0; stats.ravinesShortened = cuts.stats.ravinesShortened || 0; stats.gapsRefused = cuts.stats.gapsRefused || 0; stats.cutsRefusedStrand = cuts.stats.strandRefused || 0;
  // ---- ranges: the crest belts of the height field on the raised land; passes are the saddles of the field between and along them ----
  // One height: a range is walked over (its ground is rock); it is where the land is highest, and its passes are where a trail goes over. Three heights: the belt is the next level up and the passes its gaps.
  const lift = c => J.E[c] - J.e0[c], inRange = new Uint8Array(NR);
  for (let c = 0; c < NR; c++) if (level[c] && !wet(c) && lift(c) >= P.RANGE_LIFT) inRange[c] = 1;
  const rid = new Int32Array(NR).fill(-1), ranges = [];
  for (let s = 0; s < NR; s++) { if (!inRange[s] || rid[s] >= 0) continue; const cells = [s]; rid[s] = -2;
    for (let h = 0; h < cells.length; h++) for (const n of nb4(cells[h])) if (inRange[n] && rid[n] === -1) { rid[n] = -2; cells.push(n); }
    const id = cells.length >= P.RANGE_MIN ? ranges.length : -3; for (const c of cells) rid[c] = id; if (id < 0) continue;
    let x0 = RW, x1 = 0, y0 = RH, y1 = 0; for (const c of cells) { x0 = Math.min(x0, X(c)); x1 = Math.max(x1, X(c)); y0 = Math.min(y0, Y(c)); y1 = Math.max(y1, Y(c)); }
    const crest = cells.filter(c => { const x = X(c), y = Y(c), e = J.E[c], E = (a, b) => (inR(a, b) ? J.E[b * RW + a] : -1e9); return (e >= E(x - 1, y) && e >= E(x + 1, y)) || (e >= E(x, y - 1) && e >= E(x, y + 1)); });
    ranges.push({ id, cells, crest, box: [x0, y0, x1, y1], span: Math.max(x1 - x0, y1 - y0) + 1 }); }
  const NB8 = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
  const saddleE = c => { const x = X(c), y = Y(c); let ch = 0, prev = null, first = null;
    for (const [dx, dy] of NB8) { if (!inR(x + dx, y + dy)) return false; const s = J.E[(y + dy) * RW + x + dx] > J.E[c]; if (first === null) first = s; else if (s !== prev) ch++; prev = s; }
    if (prev !== first) ch++; return ch >= 4; };
  // a pass is a saddle: range cells (within 2) on both sides across it, and lower ground on the other two sides
  const acrossRange = c => { const x = X(c), y = Y(c), rg = (a, b) => { for (let k = 1; k <= 2; k++) if (inR(a * k + x, b * k + y) && rid[(y + b * k) * RW + x + a * k] >= 0) return true; return false; }, lo = (a, b) => inR(x + a, y + b) && J.E[(y + b) * RW + x + a] < J.E[c];
    return (rg(1, 0) && rg(-1, 0) && lo(0, 1) && lo(0, -1)) || (rg(0, 1) && rg(0, -1) && lo(1, 0) && lo(-1, 0)); };
  const passCand = [];
  for (let c = 0; c < NR; c++) { if (!level[c] || wet(c) || coast[c] || lift(c) < P.PASS_LIFT || !saddleE(c)) continue;
    const near = new Set(); const x = X(c), y = Y(c); for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { if (!inR(x + dx, y + dy)) continue; const r = rid[(y + dy) * RW + x + dx]; if (r >= 0) near.add(r); }
    if (!near.size || !acrossRange(c)) continue; passCand.push({ c, e: J.E[c], ranges: [...near] }); }
  passCand.sort((p, q) => p.e - q.e || p.c - q.c);
  const passes = [];
  for (const k of passCand) if (passes.every(p => Math.max(Math.abs(X(p.c) - X(k.c)), Math.abs(Y(p.c) - Y(k.c))) >= P.PASS_GAP)) passes.push({ c: k.c, ranges: k.ranges });
  const natural = [], raisedParts = ranges;
  // ---- cliff lines: the level contour on the cell corners, as loops; escarpments are the stretches without a back rim ----
  // An edge is [kind, corner a, corner b]: S south face (raised north of low), N back rim, E / W side walls. Corners are (x, y) of the cell grid's points, index y * (RW + 1) + x.
  const CW1 = RW + 1, edges = [];
  for (let y = 0; y < RH; y++) for (let x = 0; x < RW; x++) { const c = y * RW + x;
    if (x < RW - 1 && level[c] !== level[c + 1]) edges.push({ k: level[c] ? 'E' : 'W', a: y * CW1 + x + 1, b: (y + 1) * CW1 + x + 1, cell: level[c] ? c : c + 1 });
    if (y < RH - 1 && level[c] !== level[c + RW]) edges.push({ k: level[c] ? 'S' : 'N', a: (y + 1) * CW1 + x, b: (y + 1) * CW1 + x + 1, cell: level[c] ? c : c + RW }); }
  const at = new Map(); edges.forEach((e, i) => { for (const p of [e.a, e.b]) { if (!at.has(p)) at.set(p, []); at.get(p).push(i); } });
  const used = new Uint8Array(edges.length), loops = [];
  for (let i = 0; i < edges.length; i++) { if (used[i]) continue; const seq = [i]; used[i] = 1; let p = edges[i].b;
    for (;;) { const nx = (at.get(p) || []).find(j => !used[j]); if (nx === undefined) break; used[nx] = 1; seq.push(nx); p = edges[nx].a === p ? edges[nx].b : edges[nx].a; }
    loops.push(seq); }
  const escarpments = [];
  for (const seq of loops) {
    // rotate so the loop starts after a back rim edge, then cut at back rims
    const n = seq.length, r = seq.findIndex(i => edges[i].k === 'N'), order = r < 0 ? seq : seq.slice(r).concat(seq.slice(0, r));
    let cur = [];
    const flush = () => { const s = cur.filter(i => edges[i].k === 'S'); if (s.length >= P.ESC_MIN) escarpments.push({ edges: cur.slice(), south: s.length, faces: s.map(i => edges[i].cell) }); cur = []; };
    for (const i of order) { if (edges[i].k === 'N') flush(); else cur.push(i); }
    flush();
  }
  const stairCells = []; for (let c = 0; c < NR; c++) if (J.stair[c] && level[c] && c + RW < NR && !level[c + RW]) stairCells.push(c);
  for (const e of escarpments) { const fs = new Set(e.faces); e.stairs = stairCells.filter(c => fs.has(c)); e.falls = falls.filter(f => fs.has(f.lip)).map(f => f.foot); }
  // ---- the features, named by id (names are slots for the copywriter), with their cells in order and their links ----
  const list = [], byId = new Map(), add = f => { list.push(f); byId.set(f.id, f); return f; };
  for (const b of bodies) add({ id: b.kind + '-' + b.id, kind: b.kind, cells: b.cells, links: { fords: b.fords.slice() } });
  for (const st of streams) add({ id: 'stream-' + st.id, kind: 'stream', cells: st.cells, links: { mouth: st.mouth, drop: st.drop || null, seen: st.seen } });
  falls.forEach((f, i) => { f.id = 'falls-' + i; add({ id: f.id, kind: 'falls', cells: [f.lip, f.foot], links: { stream: 'stream-' + f.stream, lip: f.lip, foot: f.foot } }); });
  ravines.forEach((r, i) => { r.id = 'ravine-' + i; add({ id: r.id, kind: 'ravine', cells: r.cells, links: { stream: 'stream-' + r.stream, head: r.head, mouth: r.mouth, cut: 1 } }); });
  gaps.forEach((g, i) => { g.id = 'gap-' + i; add({ id: g.id, kind: 'through-ravine', cells: g.cells, links: { mid: g.mid, axis: g.axis, cut: 1 } }); });
  ranges.forEach(r => { r.fid = 'range-' + r.id; add({ id: r.fid, kind: 'range', cells: r.crest, links: { area: r.cells.length, box: r.box, passes: [] } }); });
  passes.forEach((p, i) => { p.id = 'pass-' + i; add({ id: p.id, kind: 'pass', cells: [p.c], links: { ranges: p.ranges.map(r => 'range-' + r) } }); for (const r of p.ranges) byId.get('range-' + r).links.passes.push(p.id); });
  escarpments.forEach((e, i) => { e.id = 'escarpment-' + i; add({ id: e.id, kind: 'escarpment', cells: e.faces, links: { south: e.south, stairs: e.stairs, falls: e.falls } }); });
  // ---- destinations (section 2.3): kind, cell, the feature it belongs to and its index along it, the heart it asks for ----
  const dest = [];
  const D = (kind, c, feature, heart) => dest.push({ kind, c, feature, index: Math.max(0, byId.get(feature).cells.indexOf(c)), heart });
  for (const k of passes) D('pass', k.c, k.id, 'post yard');
  // a ravine is a destination only where it reads as one (F4, designer on F3): raised land on both sides of most of its cut cells, across the stream's line or across the gap
  const reads = (cells, along) => { const d = along === 1 ? RW : 1; let n = 0; for (const c of cells) if (c - d >= 0 && c + d < NR && level[c - d] && level[c + d] && !wet(c - d) && !wet(c + d)) n++; return n * 3 >= 2 * cells.length; };
  stats.ravinesNotRead = 0;
  for (const g of gaps) { if (reads(g.cells, g.axis === 'x' ? 1 : RW)) D('ravine', g.mid, g.id, 'overhang'); else stats.ravinesNotRead++; }
  for (const f of falls) D('falls', f.foot, 'stream-' + f.stream, 'overhang');
  for (const r of ravines) { const along = r.cells.length > 1 ? Math.abs(r.cells[1] - r.cells[0]) : Math.abs(r.mouth - r.cells[0]); if (reads(r.cells, along === 1 ? 1 : RW)) D('ravine head', r.head, 'stream-' + r.stream, 'overhang'); else stats.ravinesNotRead++; }
  for (const st of streams) { if (st.drop) continue; const s = st.cells[st.seen]; if (s !== undefined && nb4(s).some(n => level[n])) D('spring', s, 'stream-' + st.id, 'sleepers\' bed'); }
  for (const st of streams) if (st.mouth.kind === 'river' || st.mouth.kind === 'lake') D('stream mouth', st.cells[st.cells.length - 1], 'stream-' + st.id, 'herd ground');
  for (const b of bodies) if (b.kind === 'river') for (const f of b.fords) D('ford', f, 'river-' + b.id, 'herd ground');
  // the lakes' far shores and the trails' ends are chosen once the trails exist (a later step)
  const order = ['pass', 'ravine', 'falls', 'ravine head', 'ford', 'spring', 'stream mouth'], kept = [];
  dest.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.c - b.c);
  for (const d of dest) if (kept.every(k => Math.max(Math.abs(X(k.c) - X(d.c)), Math.abs(Y(k.c) - Y(d.c))) >= P.DEST_GAP)) kept.push(d);
  stats.destDropped = dest.length - kept.length;
  // ---- W4 (map-making-research-1): water comes out along the cliff foot. An escarpment of SPRING_MIN+ faces with no water coming out within 2 of its foot gets a spring at its lowest foot cell ----
  // Water coming out is what the map measures: a falls' foot, the cell a stream comes out of the raised land, a ravine's head, a spring. The spring asks for the sleepers' bed, as the others do.
  const emerge = [];
  for (const f of falls) emerge.push(f.foot);
  for (const st of streams) if (st.seen > 0 && st.seen < st.cells.length) emerge.push(st.cells[st.seen]);
  for (const k of kept) if (k.kind === 'spring' || k.kind === 'ravine head') emerge.push(k.c);
  const cheb = (a, b) => Math.max(Math.abs(X(a) - X(b)), Math.abs(Y(a) - Y(b)));
  let springsAdded = 0, springsRefused = 0;
  const springOk = c => !wet(c) && !coast[c] && land[c] !== 1 && !level[c] && (!J.walk || J.walk[c]) && (!J.comp || J.comp[c]) && X(c) > 1 && Y(c) > 1 && X(c) < RW - 2 && Y(c) < RH - 2;
  const springAt = (e, cells) => {   // the lowest of these foot cells a spring may stand on (a destination keeps DEST_GAP from the others)
    const at = cells.filter(springOk).sort((a, b) => J.E[a] - J.E[b] || a - b).find(c => kept.every(k => cheb(k.c, c) >= P.DEST_GAP));
    if (at === undefined) { springsRefused++; return false; }
    kept.push({ kind: 'spring', c: at, feature: e.id, index: 0, heart: 'sleepers\' bed', foot: true }); emerge.push(at); springsAdded++; return true; };
  for (const e of escarpments) {
    if (e.faces.length < P.SPRING_MIN) continue;
    const feet = e.faces.map(c => c + RW), dryAt = i => i < feet.length && !emerge.some(w => cheb(feet[i], w) <= P.SPRING_NEAR);
    if (feet.every((_, i) => dryAt(i))) { if (!springAt(e, feet.filter(c => c < NR))) continue; }   // no water along the whole foot: a spring at its lowest cell
    // a spring line: water comes out along a long foot at intervals, so a dry stretch of SPRING_RUN faces or more (in the loop's order) gets one at the lowest cell of its middle
    for (let round = 0; round < 8; round++) {
      let run = null; for (let i = 0; i < feet.length && !run; i++) { if (!dryAt(i)) continue; let j = i; while (j + 1 < feet.length && dryAt(j + 1)) j++; if (j - i + 1 >= P.SPRING_RUN) run = [i, j]; i = j; }
      if (!run || !springAt(e, feet.slice(run[0] + 2, run[1] - 1).filter(c => c < NR))) break;
    }
  }
  kept.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.c - b.c);
  stats.springsAtFoot = springsAdded; stats.springsAtFootRefused = springsRefused;
  return { P, level, list, bodies, streams, sid, falls, ravines, gaps, ranges, rid, passes, escarpments, loops: loops.length, dest: kept, stats };
}
