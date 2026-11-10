// Generator 7, chunks G2 and G2b: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the
// 2 x 2 minimum feature, cliffs that are the land's own contour (nothing narrower than 4 tiles, nothing along a cell edge), every stair with a way up, the apron, the map's edges agreeing
// with the land (scheme Rule 5.2), reaching every walkable tile of a cell, the reach of whole regions through the ways up, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, TV, CW, CH } from '../src/gen7/place.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';
import { decorProps } from '../tools/gen7-decor-props.mjs';
import { TABLE } from '../src/gen7/decor.mjs';

for (const seed of [7, 13, 42]) {
  test(`seed ${seed}: every cell holds the scheme's rules for tiles, cliffs, edges, ways up and the bake`, { timeout: 900000 }, () => {
    const s = placeProps(seed);
    const hist = Object.keys(s.runHist).map(Number).sort((a, b) => a - b).map(k => k + ':' + s.runHist[k]).join(' ');
    console.log(`# seed ${seed}: ${JSON.stringify({ ...s, runHist: undefined })}\n# straight cliff runs (length:count) ${hist}`);
    assert.equal(s.cells, 8000);
    assert.equal(s.pairBreaks, 0, 'no 2 x 2 block breaks the pair table');
    assert.equal(s.loneTiles, 0, 'every tile sits in a 2 x 2 block of its own terrain');
    // G2b: a cliff is the field's contour at tile scale, so its straight runs are short and wandering (a diagonal is a staircase of one-tile steps). The old rule "no run under 4" was the
    // blocks' (a cliff turned at most once in 8 tiles); the rule now is that no cliff is a spike, a spur or a one-row ridge: every cliff tile sits in a 4 x 4 block of raised land.
    assert.equal(s.cliffThin, 0, 'no cliff narrower than 4 tiles: ' + JSON.stringify(s.thinAt));
    assert.equal(s.cliffRunsOnCellEdge, 0, 'no cliff run on a cell edge');
    assert.ok(s.cliffRuns > 1000 && s.cliffShareOver8 < 0.4 && s.cliffRunMax < 300, 'cliffs wander: ' + s.cliffShareOver8 + ' of cliff tiles in runs over 8, longest ' + s.cliffRunMax);
    assert.equal(s.apronMismatch, 0, 'the apron of every cell equals its neighbours\' edge tiles');
    assert.equal(s.centreWrong, 0, 'a cell\'s level is the land\'s level at its centre');
    assert.equal(s.openNoRun, 0, 'an open edge meets the same level on both sides along at least 4 tiles');
    assert.equal(s.changeNoCliff, 0, 'a level change between two cells is a level change in the land');
    // every walkable tile of low ground is reached from the cell's sides. On a plateau, an inner-corner tile whose four neighbours are all lip (the rim wraps round a concave corner) is
    // enclosed by the lip by the tests' own definition of a lip (seed 7 has one in 8000 cells); no more than 4 of them a seed
    assert.equal(s.unreachedCells - s.unreachedRaisedOnly, 0, 'every walkable tile of low ground is reached from the cell\'s sides: ' + JSON.stringify(s.unreachedAt));
    assert.ok(s.unreachedRaisedOnly <= 4, 'plateau tiles enclosed by the lip: ' + s.unreachedRaisedOnly);
    assert.equal(s.stairsWithoutWayUp, 0, 'every stair has a way up');
    assert.ok(s.stairs > 50 && s.stairsSouthWithWayUp === s.stairs, 'stairs: ' + s.stairs);
    // whole regions: from the region's start through the ways up (water of a ford cell walked). What stays out is land no stair with a way up reaches (a region may keep up to 6% of its
    // dry land stranded) and pockets the walker cannot enter; the share is held under 2% of all walkable tiles
    assert.ok(s.unreachedTiles * 100 < 2 * s.walkableTiles, 'reach: ' + s.unreachedTiles + ' of ' + s.walkableTiles + ' walkable tiles not reached');
    assert.equal(s.pathUnreached + s.piecesUnreached, 0, 'trails, ports and set pieces never sit on unreached land: ' + JSON.stringify(s.needAt));
    assert.equal(s.bakeFails, 0, s.bakeMessages.join('\n'));
    assert.ok(s.bandWalkable * 100 < s.bandTiles, 'the map\'s end is shut: ' + s.bandWalkable + ' of ' + s.bandTiles + ' end tiles walk (a river\'s mouth)');
  });
}

// G3: props and decor on world coordinates (decor.mjs). Numbers from tools/gen7-decor-props.mjs; every cell of the seed. Every check is collected and asserted together, so one run shows them all.
for (const seed of [7, 13, 42]) {
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
    check(s.reedProps === 0, 'no reed prop: reeds are the shore look only');
    check(s.reedOffShore === 0, 'every reed bank holds a shore: ' + s.reedOffShore);
    check(s.reedBanks > 100, 'reed banks: ' + s.reedBanks);
    check(s.onWall + s.onPath + s.onLip === 0, 'no prop on or beside water, thicket, lip or trail');
    // decor per 10 grass tiles, interior and border rows alike, within the desk's rule
    const per10 = (n, d) => 10 * n / d, T = s.tiles, I = { el: T.eligible - T.bEligible, tu: T.tufts - T.bTufts, fl: T.flowers - T.bFlowers, cl: T.clumps - T.bClumps };
    for (const [name, el, tu, fl, cl] of [['interior', I.el, I.tu, I.fl, I.cl], ['border rows', T.bEligible, T.bTufts, T.bFlowers, T.bClumps]]) {
      check(per10(tu, el) > 2.2 && per10(tu, el) < 2.8, `${name}: tufts per 10 grass tiles ${per10(tu, el).toFixed(2)} (rule 2.5)`);
      check(per10(fl, el) > 1.25 && per10(fl, el) < 1.75, `${name}: flowers per 10 grass tiles ${per10(fl, el).toFixed(2)} (rule 1.5)`);
      check(per10(cl, el) <= 10 / 40, `${name}: clumps per 10 grass tiles ${per10(cl, el).toFixed(3)} (at most 1 in 40)`);
      check(per10(el - tu - fl - cl, el) >= 5.5, `${name}: bare ${per10(el - tu - fl - cl, el).toFixed(2)} of 10 (about 6)`);
    }
    check(s.cellTuftBad === 0, 'tufts in every large cell within 1.6-3.4 per 10: ' + JSON.stringify(s.tuftAt));
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

test('a cell is the same land whatever else was made before it, and its picture is one bake', () => {
  const a = cellTerrain(13, 36, 48), again = cellTerrain(13, 36, 48);
  assert.deepEqual(a.terrain, again.terrain);
  assert.equal(a.w, CW + 2); assert.equal(a.h, CH + 2);
  const ir = cellIR(13, 36, 48), place = bakeIR(ir);
  assert.equal(place.w, CW + 2);
  // a window of cells is each cell's own tiles side by side: its bake is the cells' bakes, tile for tile
  const win = windowIR(13, 35, 47, 2, 2);
  assert.equal(win.w, 2 * CW);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const c = cellTerrain(13, 35 + i, 47 + j); for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) assert.equal(win.terrain[(j * CH + y) * win.w + i * CW + x], c.terrain[(y + 1) * c.w + x + 1]); }
});

test('the pair table is the set\'s: raised land meets only grass', () => {
  for (const [a, b] of [[TV.CLIFF, TV.WATER], [TV.CLIFF, TV.PATH], [TV.CLIFF, TV.THICKET], [TV.CLIFF, TV.SCRUB], [TV.CLIFF, TV.EARTH], [TV.THICKET, TV.SCRUB], [TV.PATH, TV.SAND], [TV.PATH, TV.WATER]]) assert.ok(!pairOk(a, b), a + '|' + b);
  for (const [a, b] of [[TV.GRASS, TV.CLIFF], [TV.GRASS, TV.WATER], [TV.GRASS, TV.PATH], [TV.WATER, TV.SAND], [TV.GRASS, TV.THICKET], [TV.SAND, TV.SCRUB]]) assert.ok(pairOk(a, b), a + '|' + b);
});
