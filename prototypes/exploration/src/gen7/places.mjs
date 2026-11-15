// Generator 7: what a place holds, in three steps (scheme: design/desk boards/gdd/places.md; the job's proposal sections 3 and 4). Pure: a function of the realm seed and a cell.
//   1. Structure. From the terrain alone (no prop exists yet): the ways in, the walking-distance map from them, and the spine (the shortest paths joining the ways in and the way up).
//   2. Set pieces, from the stamps (art/places/ldtk/stamps, baked to stamps.json): the overhang under a south face run, the heart (a sleepers' bed, or the Split Stone's ground where the region put that
//      landmark), and a smaller spot besides, each placed by distance to the spine and the ways in and by sight from a way in.
//   3. Scenery last: `maskFn` gives decor.mjs, for any world tile, the quiet ring round each spot, the spine and the heart's sight line to keep clear.
// Every plan is in the cell's IR frame (the cell and its one-tile apron: (CW + 2) x (CH + 2) tiles, tile (lx, ly) = world (x0 + lx, y0 + ly); the cell's own tiles are 1 .. CW by 1 .. CH).
import FlatQueue from 'flatqueue';
import { hash, L, MW, MH, groundName } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { realm7 } from './region.mjs';
import { CW, CH } from './world.mjs';
import { cellTerrain, decorOf } from './place.mjs';
import { openingsOf } from './hold.mjs';
import { landmarksOf } from './landmarks.mjs';
import { ROCK_KINDS } from './decor.mjs';
import { RULES } from './rules.mjs';
import STAMPS from './stamps.json' with { type: 'json' };

const TV = { SAND: 3, PATH: 5, GRASS: 6, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14 };
const WALKT = new Uint8Array(16); for (const t of [TV.SAND, TV.PATH, TV.GRASS, TV.LITTER, TV.DRY, TV.TURF, TV.SCREE, TV.SCRUB, TV.CLIFF]) WALKT[t] = 1;
export const ZM = 4;                         // the zone's margin round the frame, tiles
export const QUIET = 3;                      // no tall scenery within this many tiles of a spot
const EDGE = QUIET + 1;                      // a spot keeps this far in from the frame's edge (the frame's first and last tile are the apron), so its quiet ground stays inside its own cell and a tile's mask asks one plan only
const SIGHT = 16, GAP = 2;                   // a heart is seen from a way in within SIGHT tiles; GAP clear tiles between two spots
const SIDES8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];
const unit = (seed, X, Y, ...k) => (hash(seed, 'gen7', 'places', X, Y, ...k) % 100000) / 100000;

// ---- the stamps ----
export const stampById = Object.fromEntries(STAMPS.stamps.map(s => [s.id, s]));
const stampsOfKind = (kind, land) => STAMPS.stamps.filter(s => s.kind === kind && s.lands.includes(land));
const flipped = (s, f) => (f ? { ...s, rows: s.rows.map(r => [...r].reverse().join('')), anchor: [s.w - 1 - s.anchor[0], s.anchor[1]] } : s);
export const LAND_WORD = land => groundName(land, false);

// ---- the plan of a cell ----
const PLANS = new Map();   // by seed, then by cell number: a plan is made once a cell (the decor asks for it for every tile)
export function planOf(seed, X, Y) {
  let m = PLANS.get(seed); if (!m) { if (PLANS.size > 3) PLANS.clear(); m = new Map(); PLANS.set(seed, m); }
  const key = Y * 4096 + X, hit = m.get(key);
  if (hit !== undefined) return hit;
  const p = X < 0 || Y < 0 || X >= MW * ATLAS || Y >= MH * ATLAS ? null : build(seed, X, Y);
  if (m.size > 6000) m.clear();
  m.set(key, p); return p;
}

function build(seed, X, Y) {  const R = realm7(seed), G = R.regions[Math.floor(Y / MH) * ATLAS + Math.floor(X / MW)], c = (Y % MH) * MW + (X % MW), land = G.land[c];
  if (land === L.WATER || G.island[c]) return null;
  const ct = cellTerrain(seed, X, Y), { x0, y0, w, h, terrain } = ct, D = decorOf(seed), N = w * h, I = (x, y) => y * w + x;
  const word = LAND_WORD(land), U = (...k) => unit(seed, X, Y, ...k);
  const plan = { seed, X, Y, x0, y0, w, h, land: word, entries: [], samples: [], spine: new Uint8Array(N), spots: [], sightLine: [], zone: null, dent: null, dsp: null };
  const openings = openingsOf({ seed, X, Y, x0, y0, w, h, terrain, D });
  // ---- 1. structure ----
  const walk = new Uint8Array(N), lvl = new Uint8Array(N), way = new Set();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = terrain[I(x, y)]; walk[I(x, y)] = WALKT[t] === 1 && !(D.flags(x0 + x, y0 + y) & 1) ? 1 : 0; lvl[I(x, y)] = t === TV.CLIFF ? 1 : 0; }
  const wayups = ct.wayups.map(a => ({ x: a.x - x0, y: a.y - y0, w: a.w, h: a.h }));
  for (const a of wayups) for (let i = 0; i < a.w; i++) way.add(I(a.x + i, a.y));
  plan.wayups = wayups;
  const incell = (x, y) => x >= 1 && y >= 1 && x <= w - 2 && y <= h - 2;
  const stepOk = (x, y, X2, Y2) => {   // a step between two tiles: both walk, inside the cell; between two levels only up or down a way up
    if (!incell(X2, Y2) || !walk[I(X2, Y2)]) return false;
    if (lvl[I(x, y)] === lvl[I(X2, Y2)]) return true;
    return x === X2 && way.has(I(x, Math.min(y, Y2)));
  };
  const pt = (side, k) => (side === 'N' ? [k, 1] : side === 'S' ? [k, CH] : side === 'W' ? [1, k] : [CW, k]);
  for (const o of openings) {
    const m = (o.from + o.to) >> 1, e = pt(o.side, m);
    if (walk[I(e[0], e[1])]) plan.entries.push({ side: o.side, at: e, run: [o.from, o.to] });
    for (const k of (o.to - o.from >= 9 ? [o.from + ((o.to - o.from) >> 2), m, o.to - ((o.to - o.from) >> 2)] : [m])) { const q = pt(o.side, k); if (walk[I(q[0], q[1])]) plan.samples.push(q); }
  }
  const nodes = plan.entries.map(e => e.at);
  for (const a of wayups) { nodes.push([a.x, a.y + 1]); nodes.push([a.x, a.y]); }
  const nodeOk = nodes.filter(([x, y]) => walk[I(x, y)]);
  const stepCost = (n) => (terrain[n] === TV.PATH ? 0.5 : 1);
  // one distance map a way in (four ways of stepping, with the parent of every tile), each pair's path read off it: a flood a node, not a route search a pair
  const paths = {}, dist = {}, SIDES4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let i = 0; i < nodeOk.length; i++) {
    const s = I(nodeOk[i][0], nodeOk[i][1]), Dm = new Float32Array(N).fill(Infinity), par = new Int32Array(N).fill(-1), q = new FlatQueue();
    Dm[s] = 0; q.push(s, 0);
    while (q.length) {
      const d = q.peekValue(), cc = q.pop(); if (d > Dm[cc]) continue;
      const x = cc % w, y = (cc / w) | 0;
      for (const [dx, dy] of SIDES4) {
        const X2 = x + dx, Y2 = y + dy; if (!stepOk(x, y, X2, Y2)) continue;
        const n = I(X2, Y2), nd = d + stepCost(n); if (nd < Dm[n]) { Dm[n] = nd; par[n] = cc; q.push(n, nd); }
      }
    }
    for (let j = i + 1; j < nodeOk.length; j++) {
      const t = I(nodeOk[j][0], nodeOk[j][1]); if (Dm[t] === Infinity) continue;
      const r = []; for (let n = t; n !== -1; n = par[n]) r.push(n);
      r.reverse(); paths[i + ',' + j] = r; dist[i + ',' + j] = Dm[t];
    }
  }
  // a minimum spanning forest over the nodes by path length (a place whose levels never meet has one tree a level), each edge drawn as its shortest path
  const parent = nodeOk.map((_, i) => i), find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  for (const k of Object.keys(dist).sort((a, b) => dist[a] - dist[b] || (a < b ? -1 : 1))) {
    const [i, j] = k.split(',').map(Number), a = find(i), b = find(j); if (a === b) continue;
    parent[a] = b; for (const t of paths[k]) plan.spine[t] = 1;
  }
  for (const [x, y] of nodeOk) plan.spine[I(x, y)] = 1;   // a node alone in its part of the ground is on the spine too
  const flood = (srcs) => {   // walking distance from some tiles, 8 ways, a step on a region trail costing half (the spine) or full (the entries)
    const Dm = new Float32Array(N).fill(Infinity), q = new FlatQueue();
    for (const s of srcs) { Dm[s] = 0; q.push(s, 0); }
    while (q.length) {
      const d = q.peekValue(), cc = q.pop(); if (d > Dm[cc]) continue;
      const x = cc % w, y = (cc / w) | 0;
      for (const [dx, dy, k] of SIDES8) {
        const X2 = x + dx, Y2 = y + dy; if (!stepOk(x, y, X2, Y2)) continue;
        if (dx && dy && !(stepOk(x, y, x + dx, y) && stepOk(x, y, x, y + dy))) continue;
        const nd = d + k, n = I(X2, Y2); if (nd < Dm[n]) { Dm[n] = nd; q.push(n, nd); }
      }
    }
    return Dm;
  };
  const dent = flood(plan.entries.map(e => I(e.at[0], e.at[1])));
  const spineTiles = []; for (let i = 0; i < N; i++) if (plan.spine[i]) spineTiles.push(i);
  const dsp = flood(spineTiles);
  plan.dent = dent; plan.dsp = dsp;
  // ---- 2. set pieces ----
  const lm = landmarksOf(seed, D.hollowSites()).at.get(X + ',' + Y);
  const placed = [];   // rectangles [x, y, w, h] of the spots so far; plus what stands in the way
  const blocks = [];
  for (const a of wayups) blocks.push([a.x - 1, a.y - 1, a.w + 2, 5, 1]);
  const HO = RULES.props.hollow.keepOff.tree;
  for (const s of D.hollowSites()) { const hx = s.x - x0, hy = s.y - y0; if (hx > -12 && hy > -12 && hx < w + 12 && hy < h + 12) blocks.push([hx - HO.left, hy - HO.up, HO.left + HO.right + 1, HO.up + HO.down + 1, 1]); }
  if (lm && lm.kind === 'reedpool') blocks.push([7, 9, 11, 12, 1]);
  if (lm && lm.kind === 'windstep') for (const a of wayups) blocks.push([a.x - 3, a.y - 5, a.w + 6, 5, 1]);
  const rectOk = (sx, sy, fw, fh, level, anyLevel = false) => {
    for (const [bx, by, bw, bh, gp] of blocks) if (sx < bx + bw + gp && bx < sx + fw + gp && sy < by + bh + gp && by < sy + fh + gp) return false;
    for (const [bx, by, bw, bh] of placed) if (sx < bx + bw + GAP && bx < sx + fw + GAP && sy < by + bh + GAP && by < sy + fh + GAP) return false;
    for (let y = sy; y < sy + fh; y++) for (let x = sx; x < sx + fw; x++) {
      if (x < EDGE || y < EDGE || x > w - 1 - EDGE || y > h - 1 - EDGE || !walk[I(x, y)] || plan.spine[I(x, y)]) return false;
      if (!anyLevel && lvl[I(x, y)] !== level) return false;
    }
    return true;
  };
  const far = (cx, cy) => placed.every(([bx, by, bw, bh]) => Math.max(Math.abs(cx - (bx + (bw >> 1))), Math.abs(cy - (by + (bh >> 1)))) >= 8);
  const raised = (x, y) => x >= 0 && y >= 0 && x < w && y < h && lvl[I(x, y)] === 1;
  const sight = (a, b) => {
    const [ax, ay] = a, [bx, by] = b, n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    if (n === 0 || Math.hypot(bx - ax, by - ay) > SIGHT) return false;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(ax + (bx - ax) * k / n), y = Math.round(ay + (by - ay) * k / n);
      if (x < 0 || y < 0 || x >= w || y >= h) return false;
      if (terrain[I(x, y)] === TV.THICKET) return false;                         // thicket blocks sight
      if (lvl[I(x, y)] !== lvl[I(ax, ay)] && lvl[I(ax, ay)] === 0) return false;   // a raised face blocks a viewer below it
    }
    return true;
  };
  const instantiate = (s0, sx, sy, extra) => {
    const flip = U('flip', sx, sy) < 0.5 && s0.flip === 'ew', s = flipped(s0, flip), cells = [];
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
      let k = s.rows[j][i]; if (k === '.') continue;
      if (k === 'r') k = U('wall', sx + i, sy + j) < 0.5 ? 'R' : '.'; if (k === '.') continue;
      cells.push({ x: sx + i, y: sy + j, k });
    }
    return { id: s0.id, kind: s0.kind, flip, x: sx, y: sy, w: s.w, h: s.h, anchor: [sx + s.anchor[0], sy + s.anchor[1]], cells, ...extra };
  };
  const pickStamp = (kind) => { const list = stampsOfKind(kind, word); return list.length ? list[Math.floor(U('layout', kind) * list.length) % list.length] : null; };
  const addSpot = (spot) => { plan.spots.push(spot); placed.push([spot.x, spot.y, spot.w, spot.h]); };
  if (plan.entries.length) {
    // the overhang: a 4 x 4 whose top row lies on a south face (the face row above its middle two is raised land's edge), shelter below it, 3+ tiles off the spine
    const oh = stampById.overhang;
    if (oh) {
      const cand = [];
      for (let sy = EDGE; sy <= h - 6; sy++) for (let sx = EDGE; sx <= w - 6; sx++) {
        if (!(raised(sx + 1, sy - 1) && raised(sx + 2, sy - 1) && (D.flags(x0 + sx + 1, y0 + sy) & 1) && (D.flags(x0 + sx + 2, y0 + sy) & 1))) continue;   // the roof on the face
        let ok = true;
        for (let i = 0; i < 4 && ok; i++) for (let j = 1; j < 4; j++) { const x = sx + i, y = sy + j; if (!walk[I(x, y)] || lvl[I(x, y)] || plan.spine[I(x, y)] || (D.flags(x0 + x, y0 + y) & 1)) ok = false; }
        if (!ok || !(dsp[I(sx + 1, sy + 1)] >= 3)) continue;
        // the roof row's own cells are the face (blocked); the rows below it keep the usual margins
        if (!rectOk(sx, sy + 1, 4, 3, 0)) continue;
        cand.push({ sx, sy, sc: Math.min(dent[I(sx + 1, sy + 1)], 14) + 4 * U('oh', sx, sy) });
      }
      cand.sort((a, b) => b.sc - a.sc || a.sy - b.sy || a.sx - b.sx);
      if (cand.length) { const b = cand[0]; addSpot(instantiate(oh, b.sx, b.sy, { role: 'spot', spineDist: +dsp[I(b.sx + 1, b.sy + 1)].toFixed(1), entryDist: +dent[I(b.sx + 1, b.sy + 1)].toFixed(1), candidates: cand.length })); }
    }
    // the heart: 7 x 5, in tiers. Tier 1: 2-6 off the spine, 6+ walking tiles from every way in, seen from a way in. Tier 2 (a cramped place): 1-6 off the spine, 4+ from the ways in, no sight needed.
    // Tier 3: the 5 x 3 bed, as tier 2. Among a tier's spots one is drawn by the cell's hash, weighted toward the far ones.
    const heartKind = lm && lm.kind === 'split-stone' && land === L.ROCK ? 'split-stone-ground' : 'sleepers-bed';
    const tiers = [[heartKind, 2, 6, 6, true], [heartKind, 1, 6, 4, false], ['sleepers-bed-cramped', 1, 6, 4, false], ['sleepers-bed-cramped', 0, 9, 2, false]];
    for (const [kind, dmin, dmax, demin, needSight] of tiers) {
      const s0 = kind === heartKind && kind !== 'sleepers-bed' ? stampById['split-stone-ground'] : kind === 'sleepers-bed-cramped' ? stampById['bed-cramped'] : pickStamp('sleepers-bed');
      if (!s0) continue;
      const hc = []; let tot = 0;
      for (let cy = 2; cy <= h - 3; cy++) for (let cx = 2; cx <= w - 3; cx++) {
        const i = I(cx, cy), de = dent[i], ds = dsp[i];
        if (!(ds >= dmin && ds <= dmax) || !(de >= demin) || de === Infinity) continue;
        const sx = cx - (s0.w >> 1), sy = cy - (s0.h >> 1);
        if (!rectOk(sx, sy, s0.w, s0.h, lvl[i]) || !far(cx, cy)) continue;
        const seen = plan.samples.find(s => sight(s, [cx, cy]));
        if (needSight && !seen) continue;
        hc.push({ sx, sy, cx, cy, de, seen: seen || null }); tot += de;
      }
      if (!hc.length) continue;
      let u = U('heart', hc.length) * tot, pick = hc[hc.length - 1];
      for (const c1 of hc) { u -= c1.de; if (u <= 0) { pick = c1; break; } }
      const s = instantiate(s0, pick.sx, pick.sy, { role: 'heart', tier: kind === 'sleepers-bed-cramped' ? 3 : (needSight ? 1 : 2), entryDist: +pick.de.toFixed(1), spineDist: +dsp[I(pick.cx, pick.cy)].toFixed(1), seenFrom: pick.seen, candidates: hc.length });
      addSpot(s);
      if (pick.seen) {   // the sight line from the way in to the heart's middle, for the quiet mask
        const [ax, ay] = pick.seen, n = Math.max(Math.abs(pick.cx - ax), Math.abs(pick.cy - ay));
        for (let k = 0; k <= n; k++) plan.sightLine.push([Math.round(ax + (pick.cx - ax) * k / n), Math.round(ay + (pick.cy - ay) * k / n)]);
      }
      break;
    }
    // a smaller spot besides: the nook (slab, moss, a stone), 3+ tiles off the spine, 8+ from the other spots
    const nk = stampById['bed-nook'];
    if (plan.spots.length && nk) {
      const hc = [];
      for (let cy = 2; cy <= h - 3; cy++) for (let cx = 2; cx <= w - 3; cx++) {
        const i = I(cx, cy); if (!(dsp[i] >= 3) || dent[i] === Infinity) continue;
        const sx = cx - (nk.w >> 1), sy = cy - (nk.h >> 1);
        if (!far(cx, cy) || !rectOk(sx, sy, nk.w, nk.h, lvl[i])) continue;
        hc.push({ sx, sy, cx, cy, sc: Math.min(dent[i], 14) + 6 * U('nook', cx, cy) });
      }
      hc.sort((a, b) => b.sc - a.sc || a.cy - b.cy || a.cx - b.cx);
      if (hc.length) { const b = hc[0]; addSpot(instantiate(nk, b.sx, b.sy, { role: 'spot', entryDist: +dent[I(b.cx, b.cy)].toFixed(1), spineDist: +dsp[I(b.cx, b.cy)].toFixed(1), candidates: hc.length })); }
    }
  }
  // ---- 3. the zone the scenery keeps off: 2 = nothing at all (a spot, one tile round it, the spine); 1 = nothing tall (three tiles round a spot, the heart's sight line and a tile either side) ----
  const zw = w + 2 * ZM, zh = h + 2 * ZM, zone = new Uint8Array(zw * zh), Z = (x, y) => (y + ZM) * zw + x + ZM;
  const mark = (x, y, v) => { if (x < -ZM || y < -ZM || x >= w + ZM || y >= h + ZM) return; const k = Z(x, y); if (zone[k] < v) zone[k] = v; };
  for (const s of plan.spots) {
    for (let y = s.y - QUIET; y < s.y + s.h + QUIET; y++) for (let x = s.x - QUIET; x < s.x + s.w + QUIET; x++) mark(x, y, 1);
    for (let y = s.y - 1; y <= s.y + s.h; y++) for (let x = s.x - 1; x <= s.x + s.w; x++) mark(x, y, 2);
  }
  for (const [x, y] of plan.sightLine) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) mark(x + dx, y + dy, 1);
  for (const i of spineTiles) mark(i % w, (i / w) | 0, 2);
  plan.zone = zone; plan.zw = zw;
  return plan;
}

// ---- the mask the decor reads: (world x, world y) -> 0 free, 1 nothing tall, 2 nothing at all ----
const MASKS = new Map();
export function maskFn(seed) {
  let f = MASKS.get(seed); if (f) return f;
  const memo = new Map();
  f = (gx, gy) => {
    const mk = gy * 65536 + gx, got = memo.get(mk); if (got !== undefined) return got;
    const r = maskAtTile(gx, gy); if (memo.size > 400000) memo.clear(); memo.set(mk, r); return r;
  };
  // a plan marks only its own cell's tiles (spots keep EDGE in from the frame, the spine stays in the cell): a tile asks the plan of its own cell, and no neighbour's
  const maskAtTile = (gx, gy) => {
    const p = planOf(seed, Math.floor(gx / CW), Math.floor(gy / CH)); if (!p) return 0;
    return p.zone[(gy - p.y0 + ZM) * p.zw + gx - p.x0 + ZM];
  };
  if (MASKS.size > 3) MASKS.clear();
  MASKS.set(seed, f); return f;
}

// ---- what a plan adds to a cell's IR: the wall props, pieces, shelter tiles and find slots (hold.mjs reads this) ----
const WALL = { meadow: ROCK_KINDS, rock: ROCK_KINDS, pond: ROCK_KINDS.filter(k => /^boulder-d/.test(k)), wood: ['stump'] };
export function contentOf(plan, seed) {
  const out = { setProps: [], pieces: [], shelter: [], slots: [], roof: [], bare: [], patches: [], landmark: null, spots: [] };
  if (!plan) return out;
  const word = plan.land, kinds = WALL[word] && WALL[word].length ? WALL[word] : ROCK_KINDS, rank = { p: 0, k: 1, m: 2, c: 3 };
  for (const s of plan.spots) {
    out.spots.push({ id: s.id, kind: s.kind, role: s.role, x: s.x, y: s.y, w: s.w, h: s.h, tier: s.tier, entryDist: s.entryDist, spineDist: s.spineDist, seenFrom: s.seenFrom || null, cells: s.cells.map(c => [c.x, c.y, c.k]) });
    if (s.kind === 'sleepers-bed' || s.kind === 'sleepers-bed-cramped' || s.kind === 'sleepers-bed-nook') out.patches.push({ kind: 'bed-ground', rect: [s.x, s.y, s.w, s.h] });   // the heart's patch: a ground of its own over the stamp's footprint
    else if (s.kind === 'split-stone-ground') out.patches.push({ kind: 'split-stone-ground', rect: [s.x, s.y, s.w, s.h] });
    for (const c of s.cells) {
      if (c.k === 'R') out.setProps.push({ kind: kinds[(hash(seed, 'gen7', 'wallkind', plan.X, plan.Y, c.x, c.y) >>> 0) % kinds.length], x: c.x, y: c.y, fam: word === 'wood' ? 'stumps' : 'rocks', spot: s.id });
      else if (c.k === 'S') { const lp = out.pieces.find(p => p.spot === s.id); if (lp) lp.w = Math.max(lp.w, c.x - lp.x + 1); else out.pieces.push({ piece: 'heart-slab', x: c.x, y: c.y, w: 1, spot: s.id }); }   // the 2 x 1 slab: one piece on its left tile, both tiles block
      else if (c.k === 'L') { out.landmark = { x: c.x, y: c.y }; out.setProps.push({ kind: 'split-stone', x: c.x, y: c.y, fam: 'landmark', spot: s.id }); }
      else if (c.k === 'h') out.shelter.push([c.x, c.y]);
      else if (c.k === 'O') out.roof.push([c.x, c.y]);
      else if (c.k === 'x') out.bare.push([c.x, c.y]);
      else if (c.k in rank) out.slots.push({ k: c.k, x: c.x, y: c.y, spot: s.id, heart: s.role === 'heart' });
    }
  }
  // the order slots are filled in: the heart's pod, then the other spots' pods and stones, then the land's kind, then the chance stones
  out.slots.sort((a, b) => rank[a.k] - rank[b.k] || (b.heart ? 1 : 0) - (a.heart ? 1 : 0) || a.y - b.y || a.x - b.x);
  return out;
}
