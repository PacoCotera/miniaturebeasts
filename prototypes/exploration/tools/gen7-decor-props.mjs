// Generator 7, chunk G3: the numbers of the props and decor over every cell of a seed (80 x 100 cells). Used by tests/gen7-place.test.mjs; run alone to print them:
//   node tools/gen7-decor-props.mjs 13
// Counted: grove sizes by biome, outcrops of one colour, the grove-lattice rule per cell, reed banks on shores only, decor per 10 grass tiles in border rows and in the interior, no crown near the
// Hollow Tree, a prop near a cell border the same from both cells, props per 100 tiles by biome against the table, and what the props block that the terrain alone did not.
import { cellTerrain, decorOf, cellIR, biomeAtTile, TV, CW, CH, RW, RH } from '../src/gen7/place.mjs';
import { TABLE, FAMS, BIOME_IDS, expectedPer100, HOLLOW, TUFTS, FLOWERS, TREE_KINDS, ROCK_KINDS } from '../src/gen7/decor.mjs';
import { groveStats, GROVE } from '../../places/src/bake/rules.mjs';
import { MW, MH } from '../src/world.mjs';

const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const SAMPLES = 40000;   // random tiles per region slot for the per-biome density
const DENSE = 40;   // trees and boulders in one cell from which the cell is a stand of wood, not a place of groves
const hist = (o, k) => { o[k] = (o[k] || 0) + 1; };

export function decorProps(seed, { every = 1 } = {}) {
  const t0 = Date.now(), D = decorOf(seed);
  const st = { cells: 0, groveHist: {}, groveHistByBiome: {}, outcropMixed: 0, outcrops: 0, latticeCells: 0, latticeFails: 0, latticeAt: [], latticeDense: 0, latticeWood: 0, latticeOpen: 0, latticeOpenFails: 0, latticeWhy: { touching: 0, cv: 0, lone: 0 }, latticeWhyDense: { cv: 0, lone: 0 },
    reedBanks: 0, reedOffShore: 0, reedProps: 0, tiles: { eligible: 0, tufts: 0, flowers: 0, clumps: 0, bEligible: 0, bTufts: 0, bFlowers: 0, bClumps: 0 }, cellTuftBad: 0, cellFlowerBad: 0, tuftAt: [],
    hollow: 0, hollowCrownNear: 0, hollowAt: [], seamProps: 0, seamMismatch: 0, seamAt: [], stranded: 0, strandedCells: 0, strandedAt: [], onWall: 0, onPath: 0, onWay: 0, onLip: 0, noKind: 0, propOnEdge: 0, decalOnEdge: 0, edgeAt: [],
    perBiome: {}, ms: 0 };
  const groups = new Map();   // cluster -> { fam, biome, n, kinds }
  const biomeOfK = k => BIOME_IDS[Math.floor(k / 1e9) % 16];
  const own = new Map();      // world tile of every prop -> kind (for the seam check)
  for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) {
    const x0 = X * CW, y0 = Y * CH, x1 = x0 + CW - 1, y1 = y0 + CH - 1, props = D.propsIn(x0, y0, x1, y1);
    st.cells++;
    const trees = [];
    for (const p of props) {
      if (p.cluster >= 0) { const g = groups.get(p.fam + ':' + p.cluster) || { fam: p.fam, biome: biomeOfK(p.cluster), n: 0, kinds: new Set() }; g.n++; g.kinds.add(p.kind); groups.set(p.fam + ':' + p.cluster, g); }
      if (p.fam === 'trees' || p.fam === 'rocks') trees.push({ kind: p.kind, cx: p.x - x0, cy: p.y - y0 });
      if (p.kind === 'reeds') st.reedProps++;
      if (p.kind === HOLLOW) { st.hollow++; if (st.hollowAt.length < 4) st.hollowAt.push([p.x, p.y]); }
      // props stand where props may: not on or beside water, thicket, lip, path; not at a way up
      if (p.fam !== 'sweeps' && p.fam !== 'landmark') { const f = D.flags(p.x, p.y); if (f & 1) st.onWall++; if (f & 2) st.onPath++; if (f & 4) st.onLip++; }
    }
    // the grove-lattice rule of the places bake, on the cell's trees and boulders
    { const g = groveStats({ props: trees.map(t => ({ kind: t.kind, cx: t.cx, cy: t.cy })) });
      if (g.trees >= GROVE.minTrees) {
        // the places bake's rule is for a place of a few groves; a cell of a wood holds 40 or more trees in one closed stand, where "a few stand alone" has no room. Counted apart.
        // a cell of Woods or Tallwood is a stand of wood (groves with clearings of a few tiles, no room for a tree four tiles from any other): there only the grove clause (40% of the trees touch
        // another) is asked; the clauses against an even lattice (spacing varies, a few trees stand alone) are asked of every other cell
        const wooded = ['woods', 'tallwood'].includes(biomeAtTile(seed, x0 + CW / 2, y0 + CH / 2)), dense = g.trees >= DENSE, bad = []; st.latticeCells++; if (wooded) st.latticeWood++;
        if (g.touching < Math.ceil(g.trees * GROVE.minTouching)) { bad.push('touching'); st.latticeWhy.touching++; }
        if (g.cv < GROVE.minCv) { bad.push('cv'); (wooded ? st.latticeWhyDense : st.latticeWhy).cv++; }
        if (g.lone < GROVE.minLone) { bad.push('lone'); (wooded ? st.latticeWhyDense : st.latticeWhy).lone++; }
        if (dense) st.latticeDense++;
        // not held, and said so in the report: the bake rule's other two clauses (spacing varies by 0.35, two trees stand alone) are those of a hand-made place of a few groves; on scattered cells
        // they fail in most cells that hold 12 or more (a boulder outcrop and a pair of trees leave nothing four tiles from everything else). Counted, not asserted.
        if (!wooded) { st.latticeOpen++; if (bad.some(b => b !== 'touching')) st.latticeOpenFails++; }
        if (bad.includes('touching')) { st.latticeFails++; if (st.latticeAt.length < 6) st.latticeAt.push([X, Y, g.trees, bad.join('+'), +g.cv.toFixed(2), g.lone, biomeAtTile(seed, x0 + CW / 2, y0 + CH / 2)]); }
      } }
    // decor per 10 grass tiles
    { const occ = new Set(); for (const p of D.propsIn(x0 - 1, y0 - 1, x1 + 1, y1 + 1)) for (const [a, b] of D.footprint(p)) occ.add(a + ',' + b);
      const dec = D.decalsIn(x0, y0, x1, y1), by = new Map(dec.map(d => [d.x + ',' + d.y, d.kind]));
      let el = 0, tu = 0, fl = 0, cl = 0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        if (!D.grassTile(x, y) || occ.has(x + ',' + y)) continue;
        const border = x - x0 < 2 || y - y0 < 2 || x1 - x < 2 || y1 - y < 2, k = by.get(x + ',' + y);
        el++; st.tiles.eligible++; if (border) st.tiles.bEligible++;
        if (k && TUFTS.includes(k)) { tu++; st.tiles.tufts++; if (border) st.tiles.bTufts++; }
        else if (k && FLOWERS.includes(k)) { fl++; st.tiles.flowers++; if (border) st.tiles.bFlowers++; }
        else if (k && k.startsWith('clump-tall')) { cl++; st.tiles.clumps++; if (border) st.tiles.bClumps++; }
      }
      // the art director's scatter rule: every prop's foot tile and every tuft, flower and clump sits on a plain tile (the tile and its eight neighbours one terrain)
      { const ct = cellTerrain(seed, X, Y), at = (x, y) => ct.terrain[(y - y0 + 1) * ct.w + (x - x0 + 1)];
        const plain = (x, y) => { const v = at(x, y); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) !== v) return false; return true; };
        // (the scrub shrubs have their own rule, tests/gen7-place.test.mjs: a shrub of a patch one or two cells across stands on the patch's own edge)
        for (const p of props) if (p.fam !== 'landmark' && p.fam !== 'shrubs' && !plain(p.x, p.y)) { st.propOnEdge++; if (st.edgeAt.length < 4) st.edgeAt.push(['prop', p.kind, p.x, p.y]); }
        for (const d of dec) if ((TUFTS.includes(d.kind) || FLOWERS.includes(d.kind) || d.kind.startsWith('clump-tall') || d.kind.startsWith('fleck-')) && !plain(d.x, d.y)) { st.decalOnEdge++; if (st.edgeAt.length < 4) st.edgeAt.push(['decal', d.kind, d.x, d.y]); } }
      if (el >= 250) { if (tu * 10 / el < 0.5 || tu * 10 / el > 2.5) { st.cellTuftBad++; if (st.tuftAt.length < 4) st.tuftAt.push([X, Y, +(tu * 10 / el).toFixed(2), el]); } if (fl * 10 / el < 0.35 || fl * 10 / el > 1.2) st.cellFlowerBad++; }
    }
    // reed banks only on shores
    { const ir = cellIR(seed, X, Y);
      for (const r of ir.reedbanks) { st.reedBanks++; let shore = false; for (let j = r.y; j <= r.y + r.h && !shore; j++) for (let i = r.x; i <= r.x + r.w; i++) if (D.shoreCorner(ir.origin.x + i, ir.origin.y + j)) { shore = true; break; } if (!shore) st.reedOffShore++; }
      // what the props block that the terrain alone did not: low-ground tiles reached from the cell's sides without props and not with them
      if ((X + Y) % every === 0) {
        const w = CW, h = CH, t = cellTerrain(seed, X, Y), at = (x, y) => t.terrain[(y + 1) * t.w + x + 1], blocked = new Uint8Array(w * h);
        for (const p of props) for (const [a, b] of D.footprint(p)) if (a >= x0 && a <= x1 && b >= y0 && b <= y1) blocked[(b - y0) * w + a - x0] = 1;
        for (const p of D.propsIn(x0 - 4, y0 - 4, x1 + 4, y1 + 4)) for (const [a, b] of D.footprint(p)) if (a >= x0 && a <= x1 && b >= y0 && b <= y1) blocked[(b - y0) * w + a - x0] = 1;
        const lipAt = (x, y) => at(x, y) === TV.CLIFF && NB4.some(([dx, dy]) => at(x + dx, y + dy) !== TV.CLIFF) && !t.wayups.some(a => x0 + x >= a.x && x0 + x < a.x + a.w && y0 + y >= a.y && y0 + y < a.y + a.h);
        const pass = (x, y, useProps) => { const v = at(x, y); return !(v === TV.WATER || v === TV.THICKET || v === TV.DEEP || lipAt(x, y) || (useProps && blocked[y * w + x])); };
        const flood = useProps => { const seen = new Uint8Array(w * h), q = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && pass(x, y, useProps)) { seen[y * w + x] = 1; q.push(y * w + x); }
          for (let k = 0; k < q.length; k++) for (const [dx, dy] of NB4) { const a = (q[k] % w) + dx, b = ((q[k] / w) | 0) + dy; if (a < 0 || b < 0 || a >= w || b >= h || seen[b * w + a] || !pass(a, b, useProps)) continue; seen[b * w + a] = 1; q.push(b * w + a); } return seen; };
        const a = flood(false), b = flood(true); let n = 0;
        for (let i = 0; i < w * h; i++) if (a[i] && !b[i] && !blocked[i]) n++;
        if (n) { st.strandedCells++; st.stranded += n; if (st.strandedAt.length < 5) st.strandedAt.push([X, Y, n]); }
      } }
    for (const p of props) own.set(p.x + ',' + p.y, p.kind);
  }
  // groves by size and biome; outcrops by colour
  for (const g of groups.values()) {
    if (g.fam === 'trees') { hist(st.groveHist, g.n); const b = (st.groveHistByBiome[g.biome] ||= {}); hist(b, g.n); }
    if (g.fam === 'rocks') { st.outcrops++; if (g.kinds.size > 1) st.outcropMixed++; }
  }
  // the Hollow Tree: no crown within two tiles (a crown is 3 wide and 3 up from its foot; two tiles round the tree's own box), no other prop within two tiles
  for (const h of D.hollowSites()) {
    for (let y = h.y - 12; y <= h.y + 12; y++) for (let x = h.x - 12; x <= h.x + 12; x++) {
      const k = own.get(x + ',' + y); if (!k || k === HOLLOW) continue;
      // a tree's crown is 3 wide and 3 up from its foot, and must keep two tiles from the Hollow Tree's own box (5 wide, rows y-2 .. y); any other prop keeps two tiles from its footprint
      const tree = TREE_KINDS.includes(k), crown = tree ? [x - 1 - 2, x + 1 + 2, y - 3 - 2, y - 1 + 2] : [x - 2, x + 2, y, y], box = tree ? [h.x - 2, h.x + 2, h.y - 2, h.y] : [h.x - 2 - 2, h.x + 2 + 2, h.y - 1 - 2, h.y + 2];
      if (crown[0] <= box[1] && crown[1] >= box[0] && crown[2] <= box[3] && crown[3] >= box[2] && (tree || (x >= box[0] && x <= box[1] && y >= box[2] && y <= box[3]))) { st.hollowCrownNear++; if (st.hollowAt.length < 8) st.hollowAt.push(['near', k, x, y]); }
    }
  }
  // a prop that straddles a cell border is the same from both cells: the cells' IR lists, restricted to what both show
  for (let n = 0; n < 400; n++) {
    const X = 1 + Math.floor(U32(seed, n, 1) % (RW - 2)), Y = 1 + Math.floor(U32(seed, n, 2) % (RH - 2)), dx = n % 2, dy = 1 - dx;
    const a = cellIR(seed, X, Y), b = cellIR(seed, X + dx, Y + dy);
    const inB = p => p.tx >= b.origin.x - 2 && p.tx <= b.origin.x + b.w + 1 && p.ty >= b.origin.y && p.ty <= b.origin.y + b.h + 2, inA = p => p.tx >= a.origin.x - 2 && p.tx <= a.origin.x + a.w + 1 && p.ty >= a.origin.y && p.ty <= a.origin.y + a.h + 2;
    const key = p => p.kind + ',' + p.tx + ',' + p.ty + ',' + (p.x + a.origin.x * 48) + ',' + (p.y + a.origin.y * 48);
    const keyB = p => p.kind + ',' + p.tx + ',' + p.ty + ',' + (p.x + b.origin.x * 48) + ',' + (p.y + b.origin.y * 48);
    const sa = new Set(a.props.filter(inB).map(key)), sb = new Set(b.props.filter(inA).map(keyB));
    st.seamProps += sa.size;
    for (const k of sa) if (!sb.has(k)) { st.seamMismatch++; if (st.seamAt.length < 4) st.seamAt.push([X, Y, dx, dy, k]); }
    for (const k of sb) if (!sa.has(k)) { st.seamMismatch++; if (st.seamAt.length < 4) st.seamAt.push([X, Y, dx, dy, k]); }
  }
  // props per 100 tiles by biome: every 3rd tile of the interior of each region slot (12 tiles in from the slot's edge), against the table
  const cnt = {};
  for (let ay = 0; ay < RH / MH; ay++) for (let ax = 0; ax < RW / MW; ax++) {
    const gx0 = ax * MW * CW + 24, gy0 = ay * MH * CH + 24, gx1 = (ax + 1) * MW * CW - 25, gy1 = (ay + 1) * MH * CH - 25, b = biomeAtTile(seed, gx0 + 20, gy0 + 20), c = (cnt[b] ||= { tiles: 0, el: [0, 0, 0, 0, 0], got: [0, 0, 0, 0, 0] });   // 24 tiles in from the slot's edge: a neighbour biome's groves reach 12
    const mem = (fi, x, y) => D.memberOf(fi, x, y);
    // random tiles of the slot's interior (a regular step lines up with the blocks and biases the count)
    for (let n = 0; n < SAMPLES; n++) {
      const x = gx0 + (U32(seed, n + ax * 100000, 11 + ay) % (gx1 - gx0 + 1)), y = gy0 + (U32(seed, n + ay * 100000, 97 + ax) % (gy1 - gy0 + 1));
      c.tiles++;
      for (let fi = 0; fi < 5; fi++) { if (!TABLE[b][FAMS[fi]]) continue; if (D.free(fi, x, y)) { c.el[fi]++; if (mem(fi, x, y)) c.got[fi]++; } }
    }
  }
  for (const [b, c] of Object.entries(cnt)) {
    const o = st.perBiome[b] = {};
    FAMS.forEach((f, fi) => { if (!TABLE[b][f]) return; o[f] = { per100: +(100 * c.got[fi] / Math.max(1, c.el[fi])).toFixed(2), table: +expectedPer100(b, f).toFixed(2), tiles: c.el[fi] }; });
  }
  st.ms = Date.now() - t0;
  return st;
}
const U32 = (seed, n, k) => { let h = Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(n + 1, 40503) ^ Math.imul(k, 2246822519); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return h >>> 0; };
if (process.argv[2] && /gen7-decor-props/.test(process.argv[1])) console.log(JSON.stringify(decorProps(+process.argv[2], { every: +(process.argv[3] || 1) }), null, 1));
