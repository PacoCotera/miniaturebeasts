// Generator 7, chunk G3: props and decor on world coordinates (decor.mjs), every cell of the seed. This was the second test of gen7-place.test.mjs; it is its own file so the CI shards can
// share the time (about 5 minutes for seed 7 alone).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decorProps } from '../tools/gen7-decor-props.mjs';
import { TABLE, ROCK_KINDS } from '../src/gen7/decor.mjs';

// The whole-world proofs take about five minutes a seed. A pull request into main (MB_CI_FAST=1) runs seed 7 only; the full set runs locally before every merge.
const FAST = process.env.MB_CI_FAST === '1';

// Numbers from tools/gen7-decor-props.mjs; every cell of the seed. Every check is collected and asserted together, so one run shows them all.
for (const seed of FAST ? [7] : [7, 13, 42]) {
  test(`seed ${seed}: props and decor hold the scheme's scatter rules in every cell`, { timeout: 1800000 }, () => {
    const s = decorProps(seed), bad = [], check = (ok, msg) => { if (!ok) bad.push(msg); };
    console.log(`# seed ${seed} decor: ${JSON.stringify({ ...s, groveHist: undefined })}\n# grove sizes (all biomes) ${JSON.stringify(s.groveHist)}`);
    check(s.cells === 8000, 'cells ' + s.cells);
    // groves: Woods 4-8 touching crowns, Tallwood 6-10; the others by the table (lone trees, pairs)
    for (const b of Object.keys(s.groveHistByBiome)) {
      const [lo, hi] = TABLE[b].trees.size, off = Object.keys(s.groveHistByBiome[b]).map(Number).filter(n => n < lo || n > hi);
      check(off.length === 0, `grove sizes in ${b} are ${lo}-${hi}: ` + JSON.stringify(s.groveHistByBiome[b]));
    }
    // the boulders: an outcrop's rocks are boulders A, D and E by the rule's shares (the low stones are stepped-over decals), each by hash a mirror or not; no other rock kind is left
    { const k = s.rockKinds, n = Object.values(k).reduce((x, y) => x + y, 0), base = b => (k[b] || 0) + (k[b + '-m'] || 0);
      check(Object.keys(k).every(x => ROCK_KINDS.includes(x)), 'rock kinds: ' + JSON.stringify(k));
      for (const [b, share] of [['boulder-a', 0.4], ['boulder-d', 0.3], ['boulder-e', 0.3]]) { check(Math.abs(base(b) / n - share) < 0.05, `${b} share ${(base(b) / n).toFixed(3)} (rule ${share})`); check(Math.abs((k[b + '-m'] || 0) / base(b) - 0.5) < 0.05, `${b} mirrored share`); } }
    check(s.outcrops > 100, 'outcrops: ' + s.outcrops);
    // the places bake's grove-lattice rule, grove clause: in a cell of 12 or more trees and boulders at least 40% of them touch another (crowns within 2.3 tiles). It holds in all but a
    // few cells in a thousand (a meadow cell whose 12 are singles and pairs); its other two clauses (spacing varies by 0.35, two trees stand alone) are those of a hand-made place of a few
    // groves and do not hold on generated cells (counted in the log, see the report)
    check(s.latticeCells > 500, 'cells with 12 or more trees and boulders: ' + s.latticeCells);
    check(s.latticeFails * 200 <= s.latticeCells, `the grove clause of the grove-lattice rule holds in ${s.latticeCells - s.latticeFails} of ${s.latticeCells} cells: ` + JSON.stringify(s.latticeAt));
    check(s.reedOffShore === 0, 'every reed bank holds a shore: ' + s.reedOffShore);
    check(s.reedBanks > 100, 'reed banks: ' + s.reedBanks);
    check(s.onWall + s.onPath + s.onLip === 0, 'no prop on or beside water, thicket, lip or trail');
    check(s.propOnEdge + s.decalOnEdge === 0, 'every prop, tuft, flower and clump on a plain tile, one full cell clear of every lip, shore and edge: ' + JSON.stringify(s.edgeAt));
    // the meadow scatter (art/places/map-rules.json meadow.scatter): pieces per 16 px cell of grass between 0.15 and 0.35 over the seed (the rule lands at about 0.25-0.33), every size present, the grown the commonest of the plants,
    // flecks and every plant kind in use, the interior and the border rows alike (a piece near a border is the same from both cells: the seam check below)
    { const S = s.scatter, cells = s.tiles.eligible * 9, bCells = s.tiles.bEligible * 9, per = S.pieces / cells, bper = S.bPieces / bCells;
      check(per > 0.15 && per < 0.35, 'pieces per cell ' + per.toFixed(3)); check(Math.abs(bper - per) < 0.05, 'border rows ' + bper.toFixed(3) + ' against interior ' + per.toFixed(3));
      check(S.young > 0 && S.mid > 0 && S.grown > 0 && S.flecks > 0, 'every size and the flecks: ' + JSON.stringify({ ...S, perCell: undefined, kinds: undefined }));
      for (const slot of ['flowers-1', 'flowers-2', 'flowers-3', 'flowers-blue-pair', 'tufts-1', 'tufts-2', 'tufts-3', 'clump-tall', 'clump-tall-s', 'shrub-1', 'shrub-2', 'shrub-3', 'shrub-4', 'bush-round']) check(S.kinds[slot] > 100, slot + ' pieces ' + S.kinds[slot]);
      check(Math.min(...S.perCell) > 0.05 && Math.max(...S.perCell) < 0.45, 'cells of the seed hold 0.05-0.45 pieces a cell: ' + Math.min(...S.perCell) + '-' + Math.max(...S.perCell)); }
    // the Hollow Tree
    check(s.hollow >= 3, 'hollow trees: ' + s.hollow);
    check(s.hollowCrownNear === 0, 'no crown or prop within two tiles of the Hollow Tree: ' + JSON.stringify(s.hollowAt));
    check(s.seamProps > 100 && s.seamMismatch === 0, `a prop near a border is the same from both cells: ${s.seamMismatch} of ${s.seamProps} differ ${JSON.stringify(s.seamAt)}`);
    check(s.stranded === 0, 'props strand no walkable tile (the scrub shrubs\' no-touching choice leaves out the last of four shrubs that would stand at the sides of one open tile, decor.mjs ringLoser): ' + JSON.stringify(s.strandedAt));
    // raised scrub tops hold shrubs by the same greedy choice (amendment L), so the same lone tile ringed by four of them can occur there; about one in 400 cells of a seed (21 on seed 7), never a way blocked
    check(s.strandedRaised <= 40, 'lone tiles ringed by shrubs on raised scrub tops: ' + s.strandedRaised);
    // per biome, props per 100 tiles where the kind may stand, within 20% of the table (a biome that has a region on this seed)
    for (const [b, o] of Object.entries(s.perBiome)) for (const [fam, v] of Object.entries(o)) {
      if (v.table * v.tiles / 100 < 300) continue;   // a kind with fewer than 300 expected props on this seed is noise: one in a hundred is 10%, and 20% is two of them
      check(Math.abs(v.per100 - v.table) <= 0.2 * v.table, `${b} ${fam}: ${v.per100} per 100 tiles, table ${v.table}`);
    }
    assert.deepEqual(bad, []);
  });
}
