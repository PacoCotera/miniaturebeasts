// Generator 7, G4a: the landmarks (scheme section 5), placed by the region layer over the whole realm. Pure: a function of the realm seed.
// Four rule sets: Windstep (a meadow cell on a level edge with a stair), the Hollow Tree (a wood cell: the decor's clearing in each Woods or Tallwood region), the Split Stone (a rock cell,
// trails first), Reedpool (a pond-edge cell by open water). Each region holds at least one of each kind it has a cell for; the rest follow in a hashed order while the spacing allows.
// SPACING: no two landmarks within two cells of each other (Chebyshev distance 3 or more) - see the report: "never two within three cells" and "one cell in eight" cannot both hold
// (a landmark needs a 3 x 3 block to itself, so at most one cell in nine). The names are editorial's lists (landmark-names.mjs, parsed from their file), none twice in a region.
import { hash, L, MW, MH } from '../world.mjs';
import { ATLAS } from '../regions.mjs';
import { realm7, NC } from './region.mjs';
import { LANDMARK_NAMES } from './landmark-names.mjs';

export const LM_SPACING = 3;       // Chebyshev distance between two landmarks, at least
export const LM_SHARE = 1 / 8;     // the target share of land cells [tune]
// a name that promises a find is left out (editorial's own rule, 11-09): the list has "Fruitfall"
const PROMISES = /fruit|pearl|dew|pod|stone fruit/i;
const NAMES = Object.fromEntries(Object.entries(LANDMARK_NAMES).map(([k, v]) => [k, v.filter(n => !PROMISES.test(n))]));
export const LM_PROP = { 'hollow-tree': 'tree-hollow', windstep: null, 'split-stone': null, reedpool: null };   // the prop that has signed art; the others are named empty slots for the art desk
export const LM_SLOT = { 'hollow-tree': 'landmark-hollow-tree', windstep: 'landmark-windstep-tree', 'split-stone': 'landmark-split-stone', reedpool: 'landmark-reedpool-island-stone' };

const MEMO = new Map();
// hollow: the decor's hollow-tree sites [{ x, y (world tiles), slot: [ax, ay] }]. Returns { list: [{ kind, X, Y, name, slot, tile? }], at: Map('X,Y' -> entry) }.
export function landmarksOf(seed, hollow) {
  if (MEMO.has(seed)) return MEMO.get(seed);
  const R = realm7(seed), list = [], placed = [];
  const ok = (X, Y) => placed.every(p => Math.max(Math.abs(p.X - X), Math.abs(p.Y - Y)) >= LM_SPACING);
  const add = (kind, X, Y, slot, tile) => { placed.push({ kind, X, Y, slot, tile }); };
  // the Hollow Tree first: its clearing is the decor's, one a Woods or Tallwood region
  for (const h of hollow) add('hollow-tree', Math.floor(h.x / 24), Math.floor(h.y / 28), h.slot, { x: h.x, y: h.y });
  const cap = G => Math.max(1, Math.ceil(LM_SHARE * landCells(G)));
  for (const G of R.regions) {
    const [ax, ay] = G.slot, wc = c => [ax * MW + (c % MW), ay * MH + ((c / MW) | 0)];
    const cand = { windstep: [], 'split-stone': [], reedpool: [] };
    const trailN = new Int16Array(NC); for (const t of G.trails) for (const c of t.cells) trailN[c]++;
    const edgeCell = c => { const x = c % MW, y = (c / MW) | 0; return x < 1 || y < 1 || x >= MW - 1 || y >= MH - 1; };
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
    cand['split-stone'].sort((a, b) => trailN[b] - trailN[a] || key('split-stone', a) - key('split-stone', b) || a - b);
    cand.windstep.sort((a, b) => key('windstep', a) - key('windstep', b) || a - b);
    cand.reedpool.sort((a, b) => key('reedpool', a) - key('reedpool', b) || a - b);
    const have = () => placed.filter(p => p.slot[0] === ax && p.slot[1] === ay).length;
    const done = { windstep: new Set(), 'split-stone': new Set(), reedpool: new Set() };
    const take = kind => { for (const c of cand[kind]) { if (done[kind].has(c)) continue; const [X, Y] = wc(c); if (ok(X, Y)) { done[kind].add(c); add(kind, X, Y, G.slot, null); return true; } } return false; };
    for (const kind of ['windstep', 'split-stone', 'reedpool']) take(kind);   // at least one of each kind the region has a cell for
    // the rest, kinds in turn, while the spacing and the share allow
    for (let round = 0; round < 200 && have() < cap(G); round++) {
      let any = false;
      for (const kind of ['split-stone', 'reedpool', 'windstep']) { if (have() >= cap(G)) break; if (take(kind)) any = true; }
      if (!any) break;
    }
  }
  // names: per region and kind, editorial's list in a hashed order from a hashed start, none twice in a region
  const cnt = new Map();
  for (const p of placed.sort((a, b) => a.Y - b.Y || a.X - b.X)) {
    const k = p.slot[1] * ATLAS + p.slot[0] + ':' + p.kind, i = cnt.get(k) || 0; cnt.set(k, i + 1);
    const names = NAMES[p.kind], order = names.map((n, j) => j).sort((a, b) => hash(seed, 'gen7', 'lmname', p.slot[0], p.slot[1], p.kind, a) - hash(seed, 'gen7', 'lmname', p.slot[0], p.slot[1], p.kind, b) || a - b);
    p.name = i < names.length ? names[order[i]] : null;   // a region never holds more of a kind than the list has
    if (p.name) list.push(p);
  }
  const at = new Map(list.map(p => [p.X + ',' + p.Y, p]));
  const out = { list, at };
  if (MEMO.size > 3) MEMO.clear();
  MEMO.set(seed, out); return out;
}
const landCells = G => { let n = 0; for (let c = 0; c < NC; c++) if (G.land[c] !== L.WATER && !G.island[c]) n++; return n; };
