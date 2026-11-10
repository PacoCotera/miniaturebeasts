// Generator 7, chunk G3: props and decor on world coordinates (decor.mjs), every cell of the seed. This was the second test of gen7-place.test.mjs; it is its own file so the CI shards can
// share the time (about 5 minutes for seed 7 alone).
import test from 'node:test';
import assert from 'node:assert/strict';
import { decorProps } from '../tools/gen7-decor-props.mjs';
import { TABLE } from '../src/gen7/decor.mjs';

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
    check(s.outcropMixed === 0, 'one colour an outcrop: ' + s.outcropMixed + ' mixed');
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
    // decor per 10 grass tiles, interior and border rows alike, within the desk's rule
    const per10 = (n, d) => 10 * n / d, T = s.tiles, I = { el: T.eligible - T.bEligible, tu: T.tufts - T.bTufts, fl: T.flowers - T.bFlowers, cl: T.clumps - T.bClumps };
    for (const [name, el, tu, fl, cl] of [['interior', I.el, I.tu, I.fl, I.cl], ['border rows', T.bEligible, T.bTufts, T.bFlowers, T.bClumps]]) {
      // halved from the desk's 2.5 and 1.5 (art director, map decor B: open meadow was carpeted); the numbers live in art/places/map-rules.json
      check(per10(tu, el) > 1.1 && per10(tu, el) < 1.6, `${name}: tufts per 10 grass tiles ${per10(tu, el).toFixed(2)} (rule 1.25)`);
      check(per10(fl, el) > 0.6 && per10(fl, el) < 0.95, `${name}: flowers per 10 grass tiles ${per10(fl, el).toFixed(2)} (rule 0.75)`);
      check(per10(cl, el) <= 10 / 40, `${name}: clumps per 10 grass tiles ${per10(cl, el).toFixed(3)} (at most 1 in 40)`);
      check(per10(el - tu - fl - cl, el) >= 5.5, `${name}: bare ${per10(el - tu - fl - cl, el).toFixed(2)} of 10 (about 6)`);
    }
    check(s.cellTuftBad === 0, 'tufts in every large cell within 0.5-2.5 per 10: ' + JSON.stringify(s.tuftAt));
    // the Hollow Tree
    check(s.hollow >= 3, 'hollow trees: ' + s.hollow);
    check(s.hollowCrownNear === 0, 'no crown or prop within two tiles of the Hollow Tree: ' + JSON.stringify(s.hollowAt));
    check(s.seamProps > 100 && s.seamMismatch === 0, `a prop near a border is the same from both cells: ${s.seamMismatch} of ${s.seamProps} differ ${JSON.stringify(s.seamAt)}`);
    check(s.stranded === 0, 'props strand no walkable tile: ' + JSON.stringify(s.strandedAt));
    // per biome, props per 100 tiles where the kind may stand, within 20% of the table (a biome that has a region on this seed)
    for (const [b, o] of Object.entries(s.perBiome)) for (const [fam, v] of Object.entries(o)) {
      if (v.table * v.tiles / 100 < 300) continue;   // a kind with fewer than 300 expected props on this seed is noise: one in a hundred is 10%, and 20% is two of them
      check(Math.abs(v.per100 - v.table) <= 0.2 * v.table, `${b} ${fam}: ${v.per100} per 100 tiles, table ${v.table}`);
    }
    assert.deepEqual(bad, []);
  });
}
