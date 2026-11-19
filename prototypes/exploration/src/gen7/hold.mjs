// Generator 7, G4a: what a cell holds (scheme sections 4 and 5). Pure: a function of the realm seed and a cell, never of the order cells were made in.
// A cell's IR carries (all positions are IR tiles, the same frame as props and wayups: the cell's own tiles are 1 .. 24 by 1 .. 28, the apron is the ring round them):
//   names      [string]                                   the landmark's name, else the land's word ("meadow", "wood", "rock", "pond")
//   openings   [{ side: 'N'|'S'|'W'|'E', from, to, at }]  the ways in: runs (2 tiles or more) along the cell's edge where the ground on both sides of the border walks; at = the edge's tile line
//   finds      [{ x, y, kinds: [kind], chance: 1, ... }]  fruit on bushes and fruit trees, dew cups in damp hollows, stones on rock flats and ridges, pods where canon puts the old sleep,
//                                                         holes in hollow trunks and a pearl by the reeds; extras: herd (a pod set near a herd),
//                                                         hollow (an index into signs: the moss hollow it belongs to), what: 'pearl', forced (a start's guarantee)
//   spawns     [{ x, y, w, h, species: [name], count }]   creature areas by land (genLife5 / regionKinds)
//   landmarks  [{ kind, name, label, prop, slot, x, y }]  the cell's landmark (scheme section 5)
//   signs      [{ kind: 'tracks'|'reedline'|'moss-hollow' ... }]  the land's own clues (section 4.3)
//   traces     [{ kind: 'outpost'|'beacon', x, y }]       explorers' traces, only where the region already places them
//   strikes    [{ x, y, age, glass, read: false }]        strike marks (section 4.7a); age = world turns since the strike, glass = storm glass lies in it (sand only)
// No hearts, springs or clue gleams: section 4 replaces them.
import { hash, L, MW, MH, HERD, groundName, genLife5, sideKind, softGround, bankEdges, canStepIn, edgeIndex } from '../world.mjs';
import { ATLAS, regionKinds, KIND_INFO } from '../regions.mjs';
import { realm7, route, NC } from './region.mjs';
import { CW, CH } from './world.mjs';
import { landmarksOf, LM_PROP, LM_SLOT } from './landmarks.mjs';
import { planOf, contentOf } from './places.mjs';
import SPRITES from '../../../../art/places/sets/ninja-test/set.json' with { type: 'json' };   // the props' sizes and feet: a stone or strike mark never lies under a prop's picture (bug #17)
import { cliffInfo } from '../../../places/src/bake/openedges.mjs';

const TV = { DEEP: 1, WATER: 2, SAND: 3, MUD: 4, PATH: 5, GRASS: 6, EARTH: 7, CLIFF: 8, THICKET: 9, SCRUB: 10, LITTER: 11, DRY: 12, TURF: 13, SCREE: 14 };
const WALKT = new Uint8Array(32); for (const t of [TV.SAND, TV.PATH, TV.GRASS, TV.LITTER, TV.DRY, TV.TURF, TV.SCREE, TV.SCRUB, 20, 21]) WALKT[t] = 1;   // 20, 21: the ford and the bridge (F6)
export const FIND_MEAN = 5.5;                                            // finds a place, the realm's average (today's templates)
const KIND_SHARE = { pod: 1.35, fruit: 0.9, dew: 1.1, stone: 1.1, material: 0.35 };   // today's template mix, with 0.7 cups a cell from the spring's budget added to dew below
const SPRING_CUPS = 0.7;
const MIX_FIX = { pod: 1.14, fruit: 0.84, dew: 1.18, stone: 1.04, material: 1.15 };   // the last trim of each kind's mean to today's (tools/gen7-places-check.mjs)
const SUPPLY_FULL = { pod: 4.5, fruit: 2.7, dew: 1.5, stone: 4.5, material: 2 };   // a kind's pool weight at which its draw is at full share (6 for all before the set pieces; the scenery they keep clear leaves less supply, this keeps each kind's mean what it was: tools/gen7-places-check.mjs)
export const STRIKE_PER_CELL = 0.28;                                     // marks a land cell, on average
const STRIKE_BIOME = { fells: 1.8, tarns: 1.8, woods: 0.45, tallwood: 0.35, thickets: 0.7, marsh: 0.6, meres: 0.7, mixed: 1, downs: 1.1 };
export const STRIKE_GLASS_PCT = 12;                                      // of the marks on sand, a few hold storm glass
export const STRIKE_START_AGE = 3;                                       // marks of a new land are 0 .. 2 turns old

// ---- life: genLife5 on each region, with a seed of the slot ----
const LIFE = new Map();
function lifeOf(seed, v) {   // v: the realm's kind version (biomeVersion); the lists a region's kinds come from
  const key = seed + ':' + (v ?? '');
  if (LIFE.has(key)) return LIFE.get(key);
  const R = realm7(seed), out = new Map();
  for (const G of R.regions) {
    const [ax, ay] = G.slot, kinds = regionKinds({ n: ax === 2 && ay === 2 ? 1 : 2, biome: G.biome }, v);
    const cr = genLife5(G, hash(seed, 'gen7', 'life', ax, ay), kinds).cr, by = Array.from({ length: NC }, () => new Map());
    for (const x of cr) if (!x.cv) by[x.c].set(x.sp, (by[x.c].get(x.sp) || 0) + 1);
    out.set(ay * ATLAS + ax, { kinds, by });
  }
  if (LIFE.size > 3) LIFE.clear();
  LIFE.set(key, out); return out;
}

// ---- starts and the strike mark within one cell of each ----
const STARTS = new Map();
function startsOf(seed) {
  if (STARTS.has(seed)) return STARTS.get(seed);
  const R = realm7(seed), by = new Map();
  for (const G of R.regions) for (const c of G.spawns) { const X = G.slot[0] * MW + (c % MW), Y = G.slot[1] * MH + ((c / MW) | 0); by.set(X * 1000 + Y, { X, Y, slot: G.slot }); }
  if (STARTS.size > 3) STARTS.clear();
  STARTS.set(seed, by); return by;
}
const HOSTS = new Map();
// the cell that holds the strike mark guaranteed to a start: the cell of its 3 x 3 with the most bare ground (the start's own on a tie); bareOf(X, Y) counts it.
// Only a cell the Probe can walk to is named: inside the start's region, reached from the start by steps over open or ramp sides within one cell of it (the walk's own reach, no partner skill).
function hostOf(seed, st, bareOf) {
  const key = seed + ':' + st.X + ',' + st.Y, hit = HOSTS.get(key); if (hit) return hit;
  const G = realm7(seed).regions[st.slot[1] * ATLAS + st.slot[0]], c0 = (st.Y % MH) * MW + (st.X % MW), x0 = c0 % MW, y0 = (c0 / MW) | 0;
  const seen = new Set([c0]), q = [c0];
  while (q.length) { const c = q.shift(), x = c % MW, y = (c / MW) | 0;
    for (const [dir, dx, dy] of [['up', 0, -1], ['right', 1, 0], ['down', 0, 1], ['left', -1, 0]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= MW || Y >= MH || Math.max(Math.abs(X - x0), Math.abs(Y - y0)) > 1) continue;
      const d = Y * MW + X; if (seen.has(d) || G.island[d] || !canStepIn(G, c, dir)) continue; seen.add(d); q.push(d); } }
  let best = [st.X, st.Y], bn = G.land[c0] !== L.WATER && !G.island[c0] ? bareOf(st.X, st.Y) * 1.01 : -1;
  for (const d of seen) { if (d === c0) continue; const X = st.X + (d % MW) - x0, Y = st.Y + ((d / MW) | 0) - y0, n = bareOf(X, Y); if (G.land[d] !== L.WATER && n > bn) { bn = n; best = [X, Y]; } }
  if (HOSTS.size > 5000) HOSTS.clear();
  HOSTS.set(key, best); return best;
}
export const hostsStrike = (seed, X, Y, bareOf) => {
  const by = startsOf(seed);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const st = by.get((X + dx) * 1000 + Y + dy); if (st) { const h = hostOf(seed, st, bareOf); if (h[0] === X && h[1] === Y) return st; } }
  return null;
};
export const isStartCell = (seed, X, Y) => startsOf(seed).has(X * 1000 + Y);

// ---- the cell ----
// a: { seed, v (the realm's kind version), X, Y, x0, y0, w, h, terrain, props, reedbanks, wayups, D (decor), hollow (the decor's sites), bareOf }
// The cell holds its finds on one ground (see mainGrounds): the biggest part a way in leads to; where that part is too bare to hold two finds (a plain meadow beside a bare ridge), the next part.
export function holdOf(a) {
  let best = holdOn(a, 0);
  for (let k = 1; k < best.grounds && best.finds.length < 2; k++) { const alt = holdOn(a, k); if (alt.finds.length > best.finds.length) best = alt; }
  delete best.grounds;
  return best;
}
function holdOn(a, pick) {
  const { seed, X, Y, x0, y0, w, h, terrain, props, D } = a, R = realm7(seed);
  const ax = Math.floor(X / MW), ay = Math.floor(Y / MH), G = R.regions[ay * ATLAS + ax], c = (Y % MH) * MW + (X % MW), land = G.land[c];
  const H = (...k) => hash(seed, 'gen7', 'hold', X, Y, ...k), U = (...k) => (H(...k) % 100000) / 100000;
  const tt = (lx, ly) => (lx < 0 || ly < 0 || lx >= w || ly >= h ? TV.THICKET : terrain[ly * w + lx]);
  const lip = (lx, ly) => D.isLip(x0 + lx, y0 + ly);
  const out = { inner: { x: 1, y: 1, w: CW, h: CH }, names: [], openings: openingsOf(a), finds: [], spawns: [], landmarks: [], signs: [], traces: [], strikes: [], pieces: [], setProps: [], shelter: [], stamps: [] };
  const walk = (lx, ly) => { const t = tt(lx, ly); return WALKT[t] === 1 || (t === TV.CLIFF && !lip(lx, ly)); };
  const lm = a.landmarks.at.get(X + ',' + Y);
  const isLand = land !== L.WATER && !G.island[c];
  out.soft = softOf(seed, G, c, X, Y, { tt, walk, lip, openings: out.openings, w, h, x0, y0, terrain, D, wayups: a.wayups, terrainOf: a.terrainOf });
  if (!isLand) return out;
  out.names = [lm ? lm.name : groundName(land, false)];
  // ---- the cell's tiles ----
  const occ = new Uint8Array(w * h), trees = [], rocks = [], bushes = [], hollowT = [];
  for (const p of props) {
    for (const [fx, fy] of D.footprint({ kind: p.kind, x: p.tx, y: p.ty, fam: p.fam })) { const lx = fx - x0, ly = fy - y0; if (lx >= 0 && ly >= 0 && lx < w && ly < h) occ[ly * w + lx] = 1; }
    const q = { x: p.tx - x0, y: p.ty - y0 };
    if (p.fam === 'trees') trees.push(q); else if (p.fam === 'rocks') rocks.push(q); else if (p.fam === 'bushes') bushes.push(q); else if (p.fam === 'landmark') hollowT.push(q);
  }
  // the tiles a prop's picture covers (a crown reaches over the tiles beside its trunk): a stone or a strike mark placed there would be drawn under it (bug #17). A tile is covered when a prop's
  // sprite rectangle meets the tile's own rectangle, 4 px in from its edge.
  const pics = [];
  for (const p of props) { const s = SPRITES.props[p.kind]; if (s) pics.push([p.tx * 48 + 24 - s.anchor[0], p.ty * 48 + 47 - s.anchor[1], s.rect[2], s.rect[3]]); }
  const covered = (lx, ly) => { const l = (x0 + lx) * 48 + 4, t = (y0 + ly) * 48 + 4; return pics.some(r => r[0] < l + 40 && l < r[0] + r[2] && r[1] < t + 40 && t < r[1] + r[3]); };
  // what the place's set pieces stand on (places.mjs): their walls are rocks, and they and the slab and the Split Stone take their tiles
  const content = contentOf(planOf(seed, X, Y), seed);
  // owner note #34: no wall stone or stump on a road tile or the tile beside it (a way stone or a sign belongs on the road; a wall boulder does not)
  const roadNear = (lx, ly) => { for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tt(lx + dx, ly + dy) === TV.PATH) return true; return false; };
  // (only the drawn prop goes: the tile stays taken below, so no find, pod or mark moves and the digests move props only)
  const drawnSetProps = content.setProps.filter(p => p.fam === 'landmark' || !roadNear(p.x, p.y));
  for (const p of content.setProps) {
    if (p.kind === 'split-stone') { for (const [dx, dy] of [[-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1]]) { const lx = p.x + dx, ly = p.y + dy; if (lx >= 0 && ly >= 0 && lx < w && ly < h) occ[ly * w + lx] = 1; } continue; }
    if (p.x >= 0 && p.y >= 0 && p.x < w && p.y < h && p.fam === 'rocks') { occ[p.y * w + p.x] = 1; }   // a wall takes its tile but adds no pod or stone supply: the set pieces give finds from the place's count, never more supply
  }
  for (const p of content.pieces) for (let i = 0; i < (p.w || 1); i++) if (p.x + i >= 0 && p.y >= 0 && p.x + i < w && p.y < h) occ[p.y * w + p.x + i] = 1;
  out.patches = content.patches; out.setProps = drawnSetProps; out.pieces = content.pieces; out.shelter = content.shelter; out.stamps = content.spots;
  // The cell's MAIN ground: the biggest part of the free ground that a way in leads to (the page floods from each opening's middle tile, as adapt7 does). Everything the cell holds lies on it, so no find,
  // strike mark or pod slot sits in a cut-off part. A cell with no way in uses its biggest part.
  const open = (lx, ly) => lx >= 1 && ly >= 1 && lx <= CW && ly <= CH && !occ[ly * w + lx] && walk(lx, ly) && !lip(lx, ly);
  const gs = mainGrounds(open, out.openings), gr = gs[Math.min(pick, gs.length - 1)], main = gr ? gr.mask : new Uint8Array(CW * CH);
  out.grounds = gs.length; if (gr) out.ground = { x: gr.x, y: gr.y };   // `ground`: a tile of the ground the cell's finds lie on (the page starts a walk there)
  const free = (lx, ly) => lx >= 1 && ly >= 1 && lx <= CW && ly <= CH && main[(ly - 1) * CW + lx - 1] === 1;
  const within = (arr, lx, ly, r) => { let n = 0; for (const q of arr) if (Math.abs(q.x - lx) <= r && Math.abs(q.y - ly) <= r) n++; return n; };
  const nearTerr = (lx, ly, r, set) => { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (set.has(tt(lx + dx, ly + dy))) return true; return false; };
  const WET = new Set([TV.WATER, TV.MUD, TV.DEEP]), SOLID = new Set([TV.THICKET, TV.SCRUB]);
  const reeds = a.reedbanks, nearReed = (lx, ly) => reeds.some(r => lx >= r.x - 1 && lx <= r.x + r.w && ly >= r.y - 1 && ly <= r.y + r.h);
  const tiles = []; for (let ly = 1; ly <= CH; ly++) for (let lx = 1; lx <= CW; lx++) if (free(lx, ly)) tiles.push([lx, ly]);
  if (!tiles.length) return out;
  const pools = { fruit: [], dew: [], stone: [], pod: [], material: [] }, bare = [];
  const add = (k, lx, ly, wt) => pools[k].push({ x: lx, y: ly, wt });
  for (const q of bushes) { if (free(q.x, q.y + 1)) add('fruit', q.x, q.y + 1, 1); else if (free(q.x - 1, q.y)) add('fruit', q.x - 1, q.y, 1); }
  for (const q of trees) if (free(q.x, q.y + 1) && within(trees, q.x, q.y, 3) <= 4) add('fruit', q.x, q.y + 1, 0.5);   // fruit trees stand at a wood's edge
  for (const [lx, ly] of tiles) {
    const t = tt(lx, ly), wet = nearTerr(lx, ly, 2, WET), reed = nearReed(lx, ly), shade = within(trees, lx, ly, 3) >= 3, nearRock = within(rocks, lx, ly, 2) > 0;
    if (wet || reed || shade) add('dew', lx, ly, (wet ? 1 : 0) + (reed ? 1 : 0) + (shade ? 0.5 : 0));
    if ((t === TV.SAND || t === TV.SCREE) && !wet) add("stone", lx, ly, 1.5); else if (nearRock) add('stone', lx, ly, 1); else if (t === TV.CLIFF) add('stone', lx, ly, 0.4);
    const slab = within(rocks, lx, ly, 1) > 0, roots = within(trees, lx, ly, 1) > 0 && within(trees, lx, ly, 3) >= 3, burrow = nearTerr(lx, ly, 1, SOLID) && t !== TV.SAND && t !== TV.SCREE;
    if (slab || roots || burrow) add('pod', lx, ly, (slab ? 1.5 : 0) + (roots ? 1 : 0) + (burrow ? 0.7 : 0));
    if (within(hollowT, lx, ly, 4) > 0 || (within(trees, lx, ly, 1) > 0 && within(trees, lx, ly, 3) >= 3)) add('material', lx, ly, 1);
    if (t === TV.SAND || t === TV.SCREE || t === TV.LITTER || t === TV.PATH || t === TV.CLIFF) bare.push([lx, ly, t]);
  }
  // ---- the landmark ----
  let lmTile = null;
  if (lm) {
    const cx = 12.5, cy = 14.5, near = pred => { let best = null, bd = 1e9; for (const [lx, ly] of tiles) if (pred(lx, ly)) { const d = (lx - cx) ** 2 + (ly - cy) ** 2; if (d < bd) { bd = d; best = [lx, ly]; } } return best; };
    if (lm.kind === 'hollow-tree' && lm.tile) lmTile = [lm.tile.x - x0, lm.tile.y - y0];
    else if (lm.kind === 'windstep') { const wu = a.wayups.map(q => ({ ...q, d: (q.x - cx) ** 2 + (q.y - cy) ** 2 })).sort((p, q) => p.d - q.d)[0]; lmTile = wu && free(wu.x + (wu.w >> 1), wu.y - 2) ? [wu.x + (wu.w >> 1), wu.y - 2] : near(() => true); }
    else if (lm.kind === 'split-stone' && content.landmark) lmTile = [content.landmark.x, content.landmark.y];
    else if (lm.kind === 'split-stone') lmTile = near((lx, ly) => tt(lx, ly) === TV.SAND || tt(lx, ly) === TV.SCREE) || near(() => true);
    else lmTile = near((lx, ly) => nearTerr(lx, ly, 1, WET)) || near(() => true);
    if (lmTile) out.landmarks.push({ kind: lm.kind, name: lm.name, label: lm.name, prop: LM_PROP[lm.kind], slot: LM_SLOT[lm.kind], x: lmTile[0], y: lmTile[1] });
  }
  // ---- life ----
  const slotLife = lifeOf(seed, a.v).get(ay * ATLAS + ax), counts = slotLife.by[c];
  const mine = slotLife.kinds.filter(k => k.hab.includes(land)), kinds = mine.length ? mine : slotLife.kinds;
  const herds = [];
  for (const k of kinds) {
    const wet = k.hab.includes(L.POND), shady = k.hab.includes(L.WOOD), n = counts.get(k.sp) || 0, big = n >= HERD.SIZE;
    const pickT = tiles.map(([lx, ly]) => ({ x: lx, y: ly, wt: 1 + (wet && nearTerr(lx, ly, 2, WET) ? 2 : 0) + (shady && within(trees, lx, ly, 3) >= 2 ? 2 : 0) }));
    const t0 = roulette(pickT, U('spawn', k.sp)); if (!t0) continue;
    const rw = big ? 6 : 4, rh = big ? 4 : 3, rx = Math.max(1, Math.min(CW - rw + 1, t0.x - (rw >> 1))), ry = Math.max(1, Math.min(CH - rh + 1, t0.y - (rh >> 1)));
    out.spawns.push({ x: rx, y: ry, w: rw, h: rh, species: [(KIND_INFO[k.sp].name || '').toLowerCase()], count: n });
    if (big) herds.push({ sp: k.sp, x: t0.x, y: t0.y, n });
  }
  pools.stone = pools.stone.filter(p => !covered(p.x, p.y));
  // ---- finds ----
  const count =findCount(seed, X, Y, land, G.biome, tiles.length, Object.values(pools).reduce((s, p) => s + p.length, 0), H);
  const chosen = [];
  const apart = (lx, ly, d) => chosen.every(f => Math.max(Math.abs(f.x - lx), Math.abs(f.y - ly)) >= d) && (!lmTile || Math.max(Math.abs(lmTile[0] - lx), Math.abs(lmTile[1] - ly)) >= 2);
  const take = (kind, tag, near) => {
    const pool = pools[kind].filter(p => apart(p.x, p.y, 2)), use = pool.length ? pool : pools[kind].filter(p => apart(p.x, p.y, 1));
    let t = null;
    if (near && use.length) { const d = use.map(p => ({ ...p, d: Math.abs(p.x - near.x) + Math.abs(p.y - near.y) })).sort((p, q) => p.d - q.d || p.y - q.y || p.x - q.x)[0]; t = d.d <= 8 ? d : null; }
    if (!t) t = roulette(use, U('tile', tag, kind)); if (!t) return null;
    const f = { x: t.x, y: t.y, kinds: [kind], chance: 1 }; chosen.push(f); out.finds.push(f);
    pools[kind] = pools[kind].filter(p => p.x !== t.x || p.y !== t.y); return f;
  };
  // the set pieces' find slots take finds from the place's count and from its kind shares, never add: the tiles are kept for them (out of every pool), the herds' pods, the moss and the pearl are taken as before,
  // then the rest of the count is planned as a list of kinds drawn by today's mix (`plan`); a slot takes its kind off that list, or stays bare when the list holds none of it. What is left of the list fills the rest.
  const SLOT_KIND = { p: 'pod', k: 'stone', c: 'stone', m: land === L.MEADOW ? 'fruit' : land === L.ROCK ? 'stone' : 'dew' };
  const slotTiles = content.slots.filter(s => free(s.x, s.y));
  if (slotTiles.length) for (const k of Object.keys(pools)) pools[k] = pools[k].filter(p => !slotTiles.some(s => s.x === p.x && s.y === p.y));
  // a pod near each herd (the awake creatures set pods by their herds), at most two a cell
  herds.slice(0, 2).forEach((hd, i) => { const f = take('pod', 'herd' + i, hd) || nearTile(hd, free, chosen, out, apart); if (f) f.herd = hd.sp; });
  // a moss hollow in damp shade, kept as two readings: full cups, and a pod asleep under the moss
  if (count >= 5 && U('moss') < 0.3) {
    const spots = pools.dew.filter(p => within(trees, p.x, p.y, 3) >= 2); const m = roulette(spots, U('mosspick'));
    if (m) {
      const idx = [], cups = pools.dew.filter(p => Math.abs(p.x - m.x) <= 2 && Math.abs(p.y - m.y) <= 2), under = pools.pod.filter(p => Math.abs(p.x - m.x) <= 2 && Math.abs(p.y - m.y) <= 2);
      const g = [];
      for (let k = 0; k < 2; k++) { const t = cups[k * 2 % Math.max(1, cups.length)]; if (t && apart(t.x, t.y, 1)) { const f = { x: t.x, y: t.y, kinds: ['dew'], chance: 1 }; chosen.push(f); out.finds.push(f); g.push(f); pools.dew = pools.dew.filter(p => p !== t); } }
      const u = under.find(p => apart(p.x, p.y, 1)); if (u) { const f = { x: u.x, y: u.y, kinds: ['pod'], chance: 1 }; chosen.push(f); out.finds.push(f); g.push(f); pools.pod = pools.pod.filter(p => p !== u); }
      if (g.length >= 2) { const si = out.signs.length; out.signs.push({ kind: 'moss-hollow', x: m.x, y: m.y, r: 2 }); g.forEach(f => { f.hollow = si; idx.push(out.finds.indexOf(f)); }); out.signs[si].finds = idx; }
    }
  }
  // a pearl may lie in the shallows by the reeds
  if (reeds.length) {
    const shore = tiles.filter(([lx, ly]) => nearReed(lx, ly) && nearTerr(lx, ly, 1, new Set([TV.WATER]))).map(([lx, ly]) => ({ x: lx, y: ly, wt: 1 }));
    const p = U('pearl') < 0.4 ? roulette(shore.filter(t => apart(t.x, t.y, 2)), U('pearlpick')) : null;
    if (p) { const f = { x: p.x, y: p.y, kinds: ['material'], chance: 1, what: 'pearl' }; chosen.push(f); out.finds.push(f); }
    out.signs.push({ kind: 'reedline', banks: reeds.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h })), pearl: p ? out.finds.length - 1 : -1 });
  }
  // the rest, by the mix of today's templates (the spring's cups added to dew)
  // a kind's draw follows its supply: scarce ground (a sand strip, one bush) gets fewer of its kind than the mix says
  const kindWts = () => Object.keys(pools).map(k => ({ k, wt: pools[k].length ? (KIND_SHARE[k] + (k === 'dew' ? SPRING_CUPS : 0)) * MIX_FIX[k] * Math.min(1, pools[k].reduce((s, p) => s + p.wt, 0) / SUPPLY_FULL[k]) : 0 }));
  const plan = [], w0 = kindWts();
  for (let i = 0; i < count - out.finds.length; i++) { const k = roulette(w0, U('kind', i))?.k; if (k) plan.push(k); }
  for (const s of slotTiles) {
    if (out.finds.length >= count) break;
    const kind = SLOT_KIND[s.k], at = plan.indexOf(kind);
    if (at < 0 || !apart(s.x, s.y, 1)) continue;   // over the place's share of the kind: left bare
    plan.splice(at, 1);
    const f = { x: s.x, y: s.y, kinds: [kind], chance: 1, spot: s.spot };
    chosen.push(f); out.finds.push(f);
  }
  for (let guard = 0; out.finds.length < count && guard < 40; guard++) {
    const k = (plan.length ? plan.shift() : roulette(kindWts(), U('kind', 100 + guard))?.k); if (!k) break;
    take(k, 'f' + guard);
  }
  // a start's guarantees: a stone in reach and a pod (the page's ensureCharge and firstPods read them)
  if (isStartCell(seed, X, Y)) for (const k of ['stone', 'pod']) if (!out.finds.some(f => f.kinds[0] === k)) {
    const f = take(k, 'start-' + k); if (f) f.forced = true; else { const t = roulette(tiles.map(([x, y]) => ({ x, y, wt: 1 })).filter(q => apart(q.x, q.y, 1)), U('start', k)); if (t) { const g = { x: t.x, y: t.y, kinds: [k], chance: 1, forced: true }; chosen.push(g); out.finds.push(g); } }
  }
  // ---- clues from the land: tracks along a herd's real path to where it beds down ----
  for (const hd of herds.slice(0, 2)) {
    const bed = out.finds.find(f => f.herd === hd.sp), to = bed ? [bed.x, bed.y] : [hd.x, hd.y], op = out.openings.slice().sort((p, q) => (q.to - q.from) - (p.to - p.from))[0];
    if (!op) continue;
    const mid = (op.from + op.to) >> 1, e = op.side === 'N' ? [mid, 1] : op.side === 'S' ? [mid, CH] : op.side === 'W' ? [1, mid] : [CW, mid];
    const idx = (x, y) => (y - 1) * CW + x - 1, fromI = idx(e[0], e[1]), toI = idx(to[0], to[1]);
    const r = route(CW, CH, fromI, toI, (cc, n) => { const x = n % CW + 1, y = ((n / CW) | 0) + 1; return n === toI || free(x, y) ? 1 + 0.4 * U('trk', x, y) : null; });
    if (r && r.length >= 4) out.signs.push({ kind: 'tracks', species: (KIND_INFO[hd.sp].name || '').toLowerCase(), path: r.filter((_, i) => i % 2 === 0 || i === r.length - 1).map(n => [n % CW + 1, ((n / CW) | 0) + 1]), to });
  }
  // ---- explorers' traces, only where the region already places them ----
  const spot = () => roulette(tiles.filter(([lx, ly]) => apart(lx, ly, 2)).map(([x, y]) => ({ x, y, wt: 1 })), U('trace'));
  for (const [set, kind] of [[G.depots.set, 'outpost'], [G.beacons.set, 'beacon']]) if (set.has(c)) { const t = spot(); if (t) out.traces.push({ kind, x: t.x, y: t.y }); }
  // ---- strike marks (section 4.7a), by the land: bare ground and ridges ----
  const exp = STRIKE_PER_CELL * (STRIKE_BIOME[G.biome] ?? 1) * Math.min(2, bare.length / 40);
  let nm = Math.floor(exp) + (U('strikes') < exp - Math.floor(exp) ? 1 : 0);
  const host = a.bareOf ? hostsStrike(seed, X, Y, a.bareOf) : null;
  if (host && nm < 1) nm = 1;
  const markAll = bare.length ? bare.map(([x, y, t]) => ({ x, y, t, wt: 1 })) : tiles.map(([x, y]) => ({ x, y, t: tt(x, y), wt: 1 })), markClear = markAll.filter(p => !covered(p.x, p.y));
  const markPool = markClear.length ? markClear : markAll;   // a cell with no tile clear of a prop keeps its mark on the old pool (counted, never dropped)
  for (let i = 0; i < Math.min(nm, 2); i++) {
    const t = roulette(markPool.filter(p => out.strikes.every(s => Math.abs(s.x - p.x) + Math.abs(s.y - p.y) >= 4) && out.finds.every(f => f.x !== p.x || f.y !== p.y) && (!lmTile || p.x !== lmTile[0] || p.y !== lmTile[1])), U('strike', i));
    if (t) out.strikes.push({ x: t.x, y: t.y, age: H('age', i) % STRIKE_START_AGE, glass: (t.t === TV.SAND || t.t === TV.SCREE) && H('glass', i) % 100 < STRIKE_GLASS_PCT, read: false });
  }
  return out;
}

// The ways in of a cell: runs along each side where the tile and the one across the border both walk, minus the sides the world calls shut. a: { seed, X, Y, x0, y0, w, h, terrain, D }.
// Terrain only (no prop is read), so the place's structure pass (places.mjs) can use it before any prop exists.
export function openingsOf(a) {
  const { seed, X, Y, x0, y0, w, h, terrain, D } = a, R = realm7(seed);
  const ax = Math.floor(X / MW), ay = Math.floor(Y / MH), G = R.regions[ay * ATLAS + ax], c = (Y % MH) * MW + (X % MW);
  const tt = (lx, ly) => (lx < 0 || ly < 0 || lx >= w || ly >= h ? TV.THICKET : terrain[ly * w + lx]);
  const lip = (lx, ly) => D.isLip(x0 + lx, y0 + ly);
  const walk = (lx, ly) => { const t = tt(lx, ly); return WALKT[t] === 1 || (t === TV.CLIFF && !lip(lx, ly)); };
  const openings = [];
  for (const [side, vert, at, across] of [['N', false, 1, 0], ['S', false, CH, CH + 1], ['W', true, 1, 0], ['E', true, CW, CW + 1]]) {
    const n = vert ? CH : CW; let from = -1;
    for (let k = 1; k <= n + 1; k++) {
      const ok = k <= n && (vert ? walk(at, k) && walk(across, k) : walk(k, at) && walk(k, across));
      if (ok && from < 0) from = k;
      if (!ok && from >= 0) { if (k - from >= 2) openings.push({ side, from, to: k - 1, at: vert ? (side === 'W' ? 1 : CW) : (side === 'N' ? 1 : CH) }); from = -1; }
    }
  }
  // The world's truth for a side rules (views agree): no way in on a side the map calls water, or on the map's end (a cliff side keeps the runs its tiles walk). A side on a region's border is the realm's: the terrain decides there.
  return openings.length ? openings.filter(op => !shutSide(seed, G, c, X, Y, op.side)) : openings;
}

// the count of finds in a cell: the realm mean FIND_MEAN, 2 to 9, from the cell's fields (how much cover and wet ground and rock it has) and a hashed spread
function findCount(seed, X, Y, land, biome, walkable, supply, H) {
  const z = ((H('n1') % 1000) + (H('n2') % 1000) + (H('n3') % 1000)) / 1500 - 1;   // about -1 .. 1, bell-shaped
  const rich = Math.max(-1, Math.min(1, (supply - 260) / 300)), room = walkable < 120 ? -1.5 : 0, lean = land === L.WOOD || land === L.ROCK ? 0.25 : land === L.POND ? 0.15 : 0;
  const v = FIND_MEAN + FIND_OFFSET + 3.6 * z + 1.3 * rich + lean + room;
  return Math.max(2, Math.min(9, Math.round(v), Math.floor(walkable / 8)));
}
export const FIND_OFFSET = -1.1;

// ---- soft ground (tuliko-soft-7-1): the tiles the Tuliko crosses, laid on the ground the place already draws where softGround (world.mjs) names the cell or edge ----
// ir.soft = { wade: [[x, y] ...] }: IR tiles (the cell's own are 1 .. 24 by 1 .. 28). A wade cell is water with land on its west and east: a two-row crossing at the narrowest stretch of water
// (6 tiles or so) between ground the west way in leads to and ground the east way in leads to becomes mud (adapt7 lays T.WADE on it).
const MUD_MAX = 30;
function softOf(seed, G, c, X, Y, k) {
  const out = { wade: [], scree: [] };
  G.soft = G.soft || softGround(G, seed);
  if (G.soft.wade[c] === 1) out.wade = wadeTiles(seed, X, Y, k);
  for (const side of ['N', 'S', 'W', 'E']) { const dir = SIDE_DIR[side], [dx, dy] = SIDE_STEP[side], x = (c % MW) + dx, y = ((c / MW) | 0) + dy;
    if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
    const ei = edgeIndex(c, dir); if (!G.soft.scree[ei]) continue;
    const s = screeSite(seed, ei, side, X, Y, k); if (s != null) out.scree.push({ side, ei, s }); }   // s: the crossing's first column (row, on a west or east side) in IR tiles; the page's two tiles are s and s + 1
  return out;
}
// A scree edge is crossed by two tiles side by side along the border, the same pair from either cell (chosen from both cells' tiles and the edge's number). In each cell the crossing runs from the border
// inwards over the steep rock (lip and face tiles, which block) to the first ground that walks; adapt7 lays it. A pair qualifies when, in both cells, both its lines meet walking ground within SCREE_RUN tiles and
// the steep rock holds at least one tile somewhere.
const SCREE_RUN = 5, CLIFF_ONLY = [{ id: 'cliff', value: TV.CLIFF }];
function screeSite(seed, ei, side, X, Y, k) {
  const [dx, dy] = SIDE_STEP[side], nb = k.terrainOf(X + dx, Y + dy); if (!nb) return null;
  const D = k.D, OPP = { N: 'S', S: 'N', W: 'E', E: 'W' }, vertical = side === 'N' || side === 'S', len = vertical ? CW : CH;
  // the steep rock is what the bake blocks round a raised land (openedges.mjs cliffInfo: the lip, the face and the flanks), the same cells adapt7 reads from the baked place
  const mk = (T, wayups, sd) => { const tt2 = (lx, ly) => (lx < 0 || ly < 0 || lx >= T.w || ly >= T.h ? TV.THICKET : T.terrain[ly * T.w + lx]), blocks = cliffInfo({ w: T.w, h: T.h, terrain: T.terrain, wayups }, CLIFF_ONLY).blockCells;
    const at = (j, d) => sd === 'S' ? [j, CH - d] : sd === 'N' ? [j, 1 + d] : sd === 'E' ? [CW - d, j] : [1 + d, j];
    // the line j from the border: the steep rock tiles it crosses, or -1 when it meets no walking ground within SCREE_RUN
    return j => { let n = 0; for (let d = 0; d <= SCREE_RUN; d++) { const [lx, ly] = at(j, d), t = tt2(lx, ly), steep = blocks.has(ly * T.w + lx) && (t === TV.CLIFF || WALKT[t] === 1);
      if (steep) { n++; continue; } return WALKT[t] === 1 || t === TV.CLIFF ? n : -1; } return -1; }; };
  const mine = mk({ terrain: k.terrain, w: k.w, h: k.h }, k.wayups, side), theirs = mk(nb, nb.wayups.map(a => ({ x: a.x - nb.x0, y: a.y - nb.y0, w: a.w, h: a.h })), OPP[side]);
  let best = null;
  for (let j = 1; j < len; j++) { const a = mine(j), b = mine(j + 1), c = theirs(j), d = theirs(j + 1);
    if (a < 0 || b < 0 || c < 0 || d < 0 || a + b + c + d < 1) continue;
    const key = hash(seed, 'gen7', 'scree', ei, j); if (!best || key < best.key) best = { key, j }; }
  return best ? best.j : null;
}
function wadeTiles(seed, X, Y, { tt, walk, lip, openings }) {
  const open = (x, y) => x >= 1 && y >= 1 && x <= CW && y <= CH && walk(x, y) && !lip(x, y);
  const flood = side => {
    const seen = new Set(), st = [];
    for (const op of openings) if (op.side === side) for (let q = op.from; q <= op.to; q++) { const x = side === 'W' ? 1 : CW; if (open(x, q) && !seen.has(q * 100 + x)) { seen.add(q * 100 + x); st.push([x, q]); } }
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x2 = x + dx, y2 = y + dy; if (open(x2, y2) && !seen.has(y2 * 100 + x2)) { seen.add(y2 * 100 + x2); st.push([x2, y2]); } } }
    return seen;
  };
  // the shortest run of water tiles from ground the west way in leads to, to ground the east way in leads to (east first on ties, so a straight crossing wins); then a second row beside it
  const west = flood('W'), east = flood('E'), water = (x, y) => x >= 1 && y >= 1 && x <= CW && y <= CH && tt(x, y) === TV.WATER;
  const DIRS4 = [[1, 0], [0, 1], [0, -1], [-1, 0]], prev = new Map(), q = [];
  for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) if (water(x, y) && DIRS4.some(([dx, dy]) => west.has((y + dy) * 100 + x + dx))) { prev.set(y * 100 + x, -1); q.push([x, y]); }
  let goal = null;
  for (let h = 0; h < q.length && !goal; h++) { const [x, y] = q[h];
    if (DIRS4.some(([dx, dy]) => east.has((y + dy) * 100 + x + dx))) { goal = [x, y]; break; }
    for (const [dx, dy] of DIRS4) { const x2 = x + dx, y2 = y + dy; if (water(x2, y2) && !prev.has(y2 * 100 + x2)) { prev.set(y2 * 100 + x2, y * 100 + x); q.push([x2, y2]); } } }
  if (!goal) return [];
  const path = []; for (let k = goal[1] * 100 + goal[0]; k !== -1; k = prev.get(k)) path.push([k % 100, (k / 100) | 0]);
  if (path.length > MUD_MAX) return [];
  const have = new Set(path.map(([x, y]) => y * 100 + x)), tiles = path.slice();
  for (const [x, y] of path) for (const [dx, dy] of [[0, 1], [1, 0]]) { const k = (y + dy) * 100 + x + dx; if (!have.has(k) && water(x + dx, y + dy)) { have.add(k); tiles.push([x + dx, y + dy]); break; } }
  return tiles;
}

// Is this side of the cell shut by the world's own edge kind (water that is not the cell's own, the map's end)? c: the cell's number in its region G; X, Y: its realm cell.
const SIDE_DIR = { N: 'up', S: 'down', W: 'left', E: 'right' }, SIDE_STEP = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
function shutSide(seed, G, c, X, Y, side) {
  const [dx, dy] = SIDE_STEP[side], x = (c % MW) + dx, y = ((c / MW) | 0) + dy;
  if (X + dx < 0 || Y + dy < 0 || X + dx >= MW * ATLAS || Y + dy >= MH * ATLAS) return true;
  if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
  G.soft = G.soft || softGround(G, seed); G.banks = G.banks || bankEdges(G, seed);
  const k = sideKind(G, c, SIDE_DIR[side]);
  return k === 'water' && G.land[c] !== L.WATER;   // a cliff side is not shut whole: its ways in are the runs where the tiles walk on both sides
}


// The grounds a cell's finds may lie on, the biggest first: the parts of open ground that an opening's middle tile lies in (the page floods from the same tiles), each as a CW x CH mask
// (index (y - 1) * CW + x - 1) with the tile its flood began at; a cell with no way in has its parts, biggest first.
function mainGrounds(open, openings) {
  const id = new Int16Array(CW * CH), size = [0], at = [null], I = (x, y) => (y - 1) * CW + x - 1;
  let n = 0;
  const flood = (sx, sy) => {
    const stack = [[sx, sy]]; id[I(sx, sy)] = ++n; size[n] = 0; at[n] = { x: sx, y: sy };
    while (stack.length) { const [x, y] = stack.pop(); size[n]++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (open(X, Y) && !id[I(X, Y)]) { id[I(X, Y)] = n; stack.push([X, Y]); } } }
  };
  const seeds = openings.map(op => { const mid = (op.from + op.to) >> 1; return op.side === 'N' ? [mid, 1] : op.side === 'S' ? [mid, CH] : op.side === 'W' ? [1, mid] : [CW, mid]; });
  const ids = [];
  for (const [x, y] of seeds) { if (!open(x, y)) continue; if (!id[I(x, y)]) flood(x, y); if (!ids.includes(id[I(x, y)])) ids.push(id[I(x, y)]); }
  if (!ids.length) { for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) if (open(x, y) && !id[I(x, y)]) flood(x, y); for (let k = 1; k <= n; k++) ids.push(k); }
  return ids.sort((p, q) => size[q] - size[p] || p - q).map(k => ({ x: at[k].x, y: at[k].y, mask: id.map(v => (v === k ? 1 : 0)) }));
}

function roulette(arr, u) {
  if (!arr.length) return null;
  let tot = 0; for (const a of arr) tot += a.wt; if (tot <= 0) return null;
  let r = u * tot; for (const a of arr) { r -= a.wt; if (r < 0) return a; }
  return arr[arr.length - 1];
}
function nearTile(hd, free, chosen, out, apart) {
  for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const x = hd.x + dx, y = hd.y + dy; if (free(x, y) && apart(x, y, 1)) { const f = { x, y, kinds: ['pod'], chance: 1 }; chosen.push(f); out.finds.push(f); return f; } }
  return null;
}
export { landmarksOf };
