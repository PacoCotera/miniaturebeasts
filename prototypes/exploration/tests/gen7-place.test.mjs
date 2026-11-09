// Generator 7, chunk G2: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the 2 x 2 minimum
// feature, straight cliffs off the cell edges, the apron, the map's edges agreeing with the land (scheme Rule 5.2), reaching every walkable tile, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, TV, CW, CH } from '../src/gen7/place.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';

for (const seed of [7, 13, 42]) {
  test(`seed ${seed}: every cell holds the scheme's rules for tiles, cliffs, edges and the bake`, { timeout: 600000 }, () => {
    const s = placeProps(seed);
    console.log(`# seed ${seed}: ${JSON.stringify(s)}`);
    assert.equal(s.cells, 8000);
    assert.equal(s.pairBreaks, 0, 'no 2 x 2 block breaks the pair table');
    assert.equal(s.loneTiles, 0, 'every tile sits in a 2 x 2 block of its own terrain');
    assert.equal(s.cliffRunsUnder4, 0, 'no cliff run under 4 tiles');
    assert.equal(s.cliffRunsOnCellEdge, 0, 'no cliff run on a cell edge');
    assert.equal(s.apronMismatch, 0, 'the apron of every cell equals its neighbours\' edge tiles');
    assert.equal(s.centreWrong, 0, 'a cell\'s level is the land\'s level at its centre');
    assert.equal(s.openNoRun, 0, 'an open edge meets the same level on both sides along at least 4 tiles');
    assert.equal(s.changeNoCliff, 0, 'a level change between two cells is a level change in the land');
    assert.equal(s.unreachedCells, 0, 'every walkable tile is reached from the cell\'s sides');
    assert.equal(s.bakeFails, 0, s.bakeMessages.join('\n'));
    assert.ok(s.bandWalkable * 100 < s.bandTiles, 'the map\'s end is shut: ' + s.bandWalkable + ' of ' + s.bandTiles + ' end tiles walk (a river\'s mouth)');
    assert.ok(s.cliffRuns > 1000 && s.cliffRunsUnder8 * 100 < s.cliffRuns, 'cliffs run in long stretches: ' + s.cliffRunsUnder8 + ' of ' + s.cliffRuns + ' under 8');
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
