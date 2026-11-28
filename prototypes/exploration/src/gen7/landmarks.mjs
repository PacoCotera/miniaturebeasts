// Generator 7, G4a: the landmarks (scheme section 5), placed by the region layer over the whole realm. Pure: a function of the realm seed.
// Four rule sets: Windstep (a meadow cell on a level edge with a stair), the Hollow Tree (a wood cell: the decor's clearing in each Woods or Tallwood region), the Split Stone (a rock cell,
// trails first), Reedpool (a pond-edge cell by open water). Each region holds at least one of each kind it has a cell for; the rest follow in a hashed order while the spacing allows.
// SPACING: no two landmarks within two cells of each other (Chebyshev distance 3 or more), and none of one kind within five places (6 or more; R3, below). Each region holds one landmark kind of its own
// (several, spaced) and one of each other kind it has a cell for. The names are editorial's lists (landmark-names.mjs, parsed from their file), none twice in a region.
import { hash, L, MW, MH } from '../world.mjs';
import { ATLAS } from '../logic/regions.mjs';
import { realm7, NC } from './region.mjs';
import { ringDist } from './roads.mjs';
import { RW, RH } from './world.mjs';
import { LANDMARK_NAMES } from './landmark-names.mjs';

// R3 (map-making-research-1): a landmark is the only one of its kind in view. Two of one kind stand at least LM_KIND_SPACING apart (more than the 11 x 11 reach: Chebyshev 6 or more), and the
// other kinds' landmarks keep LM_SPACING from it. Across a region's edge the same holds because a landmark stands LM_KIND_EDGE or more cells in from its region's edge (3 + 3 + 1 = 7 apart at least).
// Each region has one landmark kind of its own (LM_SIGNATURE: a lattice over the regions, so neighbours differ, turned by the seed): it holds as many as the share and the spacing allow; of every
// other kind it has a cell for it holds one. The cells this frees are the land's: spots and destinations.
export const LM_SPACING = 3;       // Chebyshev distance between two landmarks of different kinds, at least
export const LM_KIND_SPACING = 6;  // between two of one kind: more than the widest reach (5 places each way)
export const LM_KIND_EDGE = 3;     // cells in from the region's edge a landmark (not the Hollow Tree) stands: two regions' landmarks of one kind are then 7 apart at least
export const LM_SHARE = 1 / 40;    // the target share of land cells a region's own kind takes (was 1/8) [tune]; the spacing, not the share, is what limits it today (1/15 gave the same count)
// a name that promises a find is left out (editorial's own rule, 11-09): the list has "Fruitfall"
const PROMISES = /fruit|pearl|dew|pod|stone fruit/i;
const NAMES = Object.fromEntries(Object.entries(LANDMARK_NAMES).map(([k, v]) => [k, v.filter(n => !PROMISES.test(n))]));
export const LM_PROP = { 'hollow-tree': 'tree-hollow', windstep: null, 'split-stone': null, reedpool: null };   // the prop that has signed art; the others are named empty slots for the art desk
export const LM_SLOT = { 'hollow-tree': 'landmark-hollow-tree', windstep: 'landmark-windstep-tree', 'split-stone': 'landmark-split-stone', reedpool: 'landmark-reedpool-island-stone' };

const LM_SIGNATURE = ['split-stone', 'windstep', 'reedpool'];   // the kinds a region may call its own (the Hollow Tree has its own rule: the decor's sites)
const MEMO = new Map();   // seed -> Map('ax,ay' -> that region's landmarks, named)
export const forgetLandmarks = seed => { MEMO.delete(seed); };
// A region's landmarks are a function of the realm and of the Hollow Tree sites of its own slot and the eight slots round it, and of nothing else: the other kinds stand on cells at least LM_KIND_EDGE in from
// their region's edge (LM_KIND_EDGE = 3), so those of two regions are always seven or more apart, and only a Hollow Tree (placed first, on any cell of its region) can crowd another region's cell. So they are made per region, when asked.
// D: the seed's decor (hollowSiteOf). slots: the regions asked, [[ax, ay], ...]; none given: every region. Returns { list: [{ kind, X, Y, name, slot, tile? }] by row then column, at: Map('X,Y' -> entry) }.
export function landmarksOf(seed, D, slots) {
  const R = realm7(seed), all = [];
  for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) all.push([ax, ay]);
  let memo = MEMO.get(seed); if (!memo) { if (MEMO.size > 3) MEMO.clear(); memo = new Map(); MEMO.set(seed, memo); }
  let d0 = null;
  const list = [];
  for (const [ax, ay] of slots || all) {
    const k = ax + ',' + ay; let mine = memo.get(k);
    if (!mine) { mine = regionLandmarks(seed, D, R, ax, ay, () => d0 || (d0 = ringDist(R.realm.roads.on, RW, RH))); memo.set(k, mine); }
    for (const p of mine) list.push(p);
  }
  list.sort((a, b) => a.Y - b.Y || a.X - b.X);
  return { list, at: new Map(list.map(p => [p.X + ',' + p.Y, p])) };
}
function regionLandmarks(seed, D, R, ax, ay, d0Of) {
  const placed = [], mineSlot = p => p.slot[0] === ax && p.slot[1] === ay;
  const ok = (X, Y, kind) => placed.every(p => Math.max(Math.abs(p.X - X), Math.abs(p.Y - Y)) >= (p.kind === kind ? LM_KIND_SPACING : LM_SPACING));
  const add = (kind, X, Y, slot, tile) => { placed.push({ kind, X, Y, slot, tile }); };
  // the Hollow Tree first: its clearing is the decor's, one a Woods or Tallwood region
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const nx = ax + dx, ny = ay + dy; if (nx < 0 || ny < 0 || nx >= ATLAS || ny >= ATLAS) continue;
    if (dx || dy) {   // a neighbour's tree matters only if it can stand within two cells of this region (its search box, in cells, widened by two, meets the region's): else it is not made here
      const r = D.hollowReach(nx, ny); if (!r) continue;
      if (Math.floor(r.x1 / 24) + LM_SPACING - 1 < ax * MW || Math.floor(r.x0 / 24) - LM_SPACING + 1 > ax * MW + MW - 1 || Math.floor(r.y1 / 28) + LM_SPACING - 1 < ay * MH || Math.floor(r.y0 / 28) - LM_SPACING + 1 > ay * MH + MH - 1) continue;
    }
    const h = D.hollowSiteOf(nx, ny); if (h) add('hollow-tree', Math.floor(h.x / 24), Math.floor(h.y / 28), h.slot, { x: h.x, y: h.y });
  }
  const cap = G => Math.max(1, Math.ceil(LM_SHARE * landCells(G)));
  const G = R.regions.find(g => g.slot[0] === ax && g.slot[1] === ay);
  if (G) {
    const wc = c => [ax * MW + (c % MW), ay * MH + ((c / MW) | 0)], d0 = d0Of();
    const cand = { windstep: [], 'split-stone': [], reedpool: [] };
    const byTrail = c => { const [X, Y] = wc(c); return d0[Y * RW + X] <= 2 ? 0 : 1; };   // within 2 places of the realm's trail first
    const E = LM_KIND_EDGE, edgeCell = c => { const x = c % MW, y = (c / MW) | 0; return x < E || y < E || x >= MW - E || y >= MH - E; };
    for (const cr of G.cross) {
      if (cr.side !== 's') continue;
      const lo = cr.c + MW; let c = G.land[cr.c] === L.MEADOW && G.comp[cr.c] ? cr.c : G.land[lo] === L.MEADOW && G.comp[lo] ? lo : -1;
      if (c >= 0 && !edgeCell(c)) cand.windstep.push(c);
    }
    for (let c = 0; c < NC; c++) {
      if (!G.comp[c] || G.island[c] || edgeCell(c)) continue;
      if (G.land[c] === L.ROCK && c !== G.gate && c !== G.deep) cand['split-stone'].push(c);
      if (G.land[c] === L.POND && [-1, 1, -MW, MW].some(d => G.land[c + d] === L.WATER && !G.ford[c + d])) cand.reedpool.push(c);
    }
    const key = (kind, c) => hash(seed, 'gen7', 'landmark', kind, ax, ay, c);
    cand['split-stone'].sort((a, b) => byTrail(a) - byTrail(b) || key('split-stone', a) - key('split-stone', b) || a - b);
    cand.reedpool.sort((a, b) => byTrail(a) - byTrail(b) || key('reedpool', a) - key('reedpool', b) || a - b);
    cand.windstep.sort((a, b) => key('windstep', a) - key('windstep', b) || a - b);
    const have = () => placed.filter(p => p.slot[0] === ax && p.slot[1] === ay).length;
    const done = { windstep: new Set(), 'split-stone': new Set(), reedpool: new Set() };
    const take = kind => { for (const c of cand[kind]) { if (done[kind].has(c)) continue; const [X, Y] = wc(c); if (ok(X, Y, kind)) { done[kind].add(c); add(kind, X, Y, G.slot, null); return true; } } return false; };
    // the region's own kind: the lattice kind of its slot, turned by the seed; the next kind in turn if the region has no cell for it
    const turn = (hash(seed, 'gen7', 'landmark', 'signature') >>> 0) % 3, order = [0, 1, 2].map(i => LM_SIGNATURE[(ax + 2 * ay + turn + i) % 3]);
    // a kind can be the region's own only if the region holds at least two of it, spaced (greedy over its cells); else the next in turn; else the first it has a cell for
    const fit = kind => { const at = []; for (const c of cand[kind]) { const [X, Y] = wc(c); if (at.every(q => Math.max(Math.abs(q[0] - X), Math.abs(q[1] - Y)) >= LM_KIND_SPACING)) at.push([X, Y]); } return at.length; };
    const own = order.find(k => fit(k) >= 2) || order.find(k => cand[k].length) || order[0];
    for (const kind of order) take(kind);   // one of each kind the region has a cell for
    // then every kind the region can hold, the own kind first, each up to the share while the spacing allows (a twin still stands 6 or more apart, so twins stay at 0)
    const haveKind = kind => placed.filter(p => p.kind === kind && mineSlot(p)).length;
    // the extras pack tight: of the cells that still fit, the one that shuts out the fewest other cells of its kind (min-degree greedy), ties by the hashed order
    const takeTight = kind => {
      const fits = cand[kind].filter(c => !done[kind].has(c) && ok(...wc(c), kind)); if (!fits.length) return false;
      const P = fits.map(wc); let best = -1, bestN = 1e9;
      fits.forEach((c, i) => { let n = 0; for (let j = 0; j < fits.length; j++) if (j !== i && Math.max(Math.abs(P[i][0] - P[j][0]), Math.abs(P[i][1] - P[j][1])) < LM_KIND_SPACING) n++; if (n < bestN) { bestN = n; best = i; } });
      done[kind].add(fits[best]); add(kind, P[best][0], P[best][1], G.slot, null); return true;
    };
    for (const kind of [own, ...order.filter(k => k !== own)]) while (haveKind(kind) < cap(G) && takeTight(kind));
  }
  // names: per region and kind, editorial's list in a hashed order from a hashed start, none twice in a region
  const cnt = new Map(), list = [];
  for (const p of placed.filter(mineSlot).sort((a, b) => a.Y - b.Y || a.X - b.X)) {
    const i = cnt.get(p.kind) || 0; cnt.set(p.kind, i + 1);
    const names = NAMES[p.kind], order = names.map((n, j) => j).sort((a, b) => hash(seed, 'gen7', 'lmname', p.slot[0], p.slot[1], p.kind, a) - hash(seed, 'gen7', 'lmname', p.slot[0], p.slot[1], p.kind, b) || a - b);
    p.name = i < names.length ? names[order[i]] : null;   // a region never holds more of a kind than the list has
    if (p.name) list.push(p);
  }
  return list;
}
const landCells = G => { let n = 0; for (let c = 0; c < NC; c++) if (G.land[c] !== L.WATER && !G.island[c]) n++; return n; };
