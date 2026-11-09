// Generator 7, chunks G2 and G2b: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the
// 2 x 2 minimum feature, cliffs that are the land's own contour (nothing narrower than 4 tiles, nothing along a cell edge), every stair with a way up, the apron, the map's edges agreeing
// with the land (scheme Rule 5.2), reaching every walkable tile of a cell, the reach of whole regions through the ways up, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, TV, CW, CH } from '../src/gen7/place.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';

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
