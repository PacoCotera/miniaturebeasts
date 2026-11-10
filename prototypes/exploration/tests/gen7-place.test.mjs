// Generator 7, chunks G2 and G2b: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the
// 2 x 2 minimum feature, cliffs that are the land's own contour (nothing narrower than 4 tiles, nothing along a cell edge), every stair with a way up, the apron, the map's edges agreeing
// with the land (scheme Rule 5.2), reaching every walkable tile of a cell, the reach of whole regions through the ways up, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, blockOk, TV, CW, CH, decorOf, toneField, worldTiles } from '../src/gen7/place.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';
import { RULES } from '../src/gen7/rules.mjs';

// The whole-world proofs take about five minutes a seed. A pull request into main (MB_CI_FAST=1) runs seed 7 and seeds 1-5 only; the full set runs locally before every merge.
const FAST = process.env.MB_CI_FAST === '1';

for (const seed of FAST ? [7] : [7, 13, 42]) {
  test(`seed ${seed}: every cell holds the scheme's rules for tiles, cliffs, edges, ways up and the bake`, { timeout: 900000 }, () => {
    const s = placeProps(seed);
    const hist = Object.keys(s.runHist).map(Number).sort((a, b) => a - b).map(k => k + ':' + s.runHist[k]).join(' ');
    console.log(`# seed ${seed}: ${JSON.stringify({ ...s, runHist: undefined })}\n# straight cliff runs (length:count) ${hist}`);
    assert.equal(s.cells, 8000);
    assert.equal(s.pairBreaks, 0, 'no 2 x 2 block holds more than three terrains or two that are not a pair of the set');
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

// G3, props and decor on world coordinates: gen7-place-decor.test.mjs (its own file, so the CI shards can share the time).

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

// L3 (terrain layers): the sunlit grass tone is in patches on plain grass, a FULL CELL clear of every edge (the 5 x 5 block round each tone tile is that one ground; a patch that would come closer is dropped whole,
// never clipped), and a cell and its neighbour agree on the tiles they share
for (const seed of [7, 13, 42]) {
  test(`seed ${seed}: tone sits only on grass with two tiles of grass all round it`, () => {
    let tone = 0, cells = 0;
    for (const [X, Y] of [[36, 48], [37, 48], [20, 30], [50, 70], [10, 90], [60, 20], [40, 40], [41, 40]]) {
      const ir = cellIR(seed, X, Y), { w, h } = ir; cells++;
      assert.equal(ir.tone.length, w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (!ir.tone[y * w + x]) continue;
        tone++;
        const v = ir.terrain[y * w + x];
        assert.ok(v === TV.GRASS || v === TV.CLIFF, 'tone sits on grass or the raised top');
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X2 = x + dx, Y2 = y + dy; if (X2 >= 0 && Y2 >= 0 && X2 < w && Y2 < h) assert.equal(ir.terrain[Y2 * w + X2], v, `tone at ${x},${y} of ${seed}:${X},${Y} has another terrain at ${X2},${Y2}`); }
      }
      bakeIR(ir);   // the bake refuses a tone corner on a tile that is not all grass
    }
    assert.ok(RULES.tone.enabled === false ? tone === 0 : tone > 50, 'tone tiles over the sampled cells of seed ' + seed + ': ' + tone);
    const a = cellIR(seed, 36, 48), b = cellIR(seed, 37, 48);   // the east neighbour: the two columns of apron and edge tiles they share are the same tiles
    for (let y = 0; y < a.h; y++) for (let k = 0; k < 2; k++) assert.equal(a.tone[y * a.w + a.w - 2 + k], b.tone[y * b.w + k], `tone agrees across the border at row ${y}`);
  });
}

// The map decor swap: over seeds 1-50 (six cells each) the reed beds keep to the shore, no sunlit patch comes within a full cell of an edge, and the scrub shrubs never touch.
test('seeds 1-50: reed clumps stand on the shore and in the shallows (never on deep water), tone patches keep a full cell off every edge', { timeout: 1800000 }, () => {
  const CELLS = [[36, 48], [20, 30], [50, 70], [10, 90], [60, 20], [40, 40]], land = v => v === TV.GRASS || v === TV.SAND;
  let inWater = 0, onDeep = 0, notShallow = 0, farFromLand = 0, shore = 0, shoreNoWater = 0, patchTiles = 0, patchNear = 0;
  for (let seed = 1; seed <= (FAST ? 5 : 50); seed++) {
    const D = decorOf(seed), T = worldTiles(seed);
    for (const [X, Y] of CELLS) {
      const x0 = X * CW, y0 = Y * CH;
      for (const c of D.reedClumpsIn(x0, y0, x0 + CW - 1, y0 + CH - 1)) {
        const v = T(c.tx, c.ty);
        if (c.water) {
          inWater++; if (v === TV.DEEP) onDeep++; if (v !== TV.WATER) notShallow++;
          let near = false; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && land(T(c.tx + dx, c.ty + dy))) near = true;
          if (!near) farFromLand++;
        } else { shore++; let wet = false; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (T(c.tx + dx, c.ty + dy) === TV.WATER) wet = true; if (!wet) shoreNoWater++; }
      }
      const tone = toneField(seed, x0, y0, CW, CH);
      for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (tone[y * CW + x]) {
        patchTiles++; const v = T(x0 + x, y0 + y);
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (T(x0 + x + dx, y0 + y + dy) !== v) patchNear++;
      }
    }
  }
  console.log(`# reeds over seeds 1-${FAST ? 5 : 50}: ${shore} shore clumps, ${inWater} in the shallows, ${onDeep} on deep water; tone: ${patchTiles} tiles, ${patchNear} within two tiles of another ground`);
  const SEEDS = FAST ? 5 : 50; // the floors are per seed: 0.6 clumps in the shallows and 6 on the shore
  assert.ok(inWater > 0.6 * SEEDS && shore > 6 * SEEDS, 'reed clumps found: ' + shore + ' shore, ' + inWater + ' in the water');
  assert.equal(onDeep, 0, 'no reed clump on deep water');
  assert.equal(notShallow, 0, 'every in-water clump is on shallow water');
  assert.equal(farFromLand, 0, 'every in-water clump is within two tiles of land');
  assert.equal(shoreNoWater, 0, 'every shore clump has water beside its tile');
  assert.ok(RULES.tone.enabled === false ? patchTiles === 0 : patchTiles > 500, 'tone tiles: ' + patchTiles);
  assert.equal(patchNear, 0, 'no tone patch pixel within a cell of another ground');
});

test('scrub shrubs never touch, take the most the rule allows, and every patch of one or two cells has one', () => {
  for (const seed of [7, 13, 42]) {
    const D = decorOf(seed), T = worldTiles(seed);
    let eligible = 0, taken = 0, small = 0, smallWith = 0;
    const scrubCells = [];   // up to six cells of the seed that hold scrub shrubs (found on a coarse grid of cells)
    for (let Y = 15; Y < 90 && scrubCells.length < 6; Y += 2) for (let X = 15; X < 70 && scrubCells.length < 6; X += 2) if (D.propsIn(X * CW, Y * CH, X * CW + CW - 1, Y * CH + CH - 1).filter(p => p.fam === 'shrubs').length >= 4) scrubCells.push([X, Y]);
    if (!scrubCells.length) continue;
    for (const [X, Y] of scrubCells) {
      const x0 = X * CW, y0 = Y * CH, shrubs = new Set(D.propsIn(x0, y0, x0 + CW - 1, y0 + CH - 1).filter(p => p.fam === 'shrubs').map(p => p.x + ',' + p.y));
      for (const k of shrubs) { const [x, y] = k.split(',').map(Number); for (const [dx, dy] of [[1, 0], [0, 1]]) assert.ok(!shrubs.has((x + dx) + ',' + (y + dy)), `shrubs touch at ${k}`); }
      for (let y = 1; y < CH - 1; y++) for (let x = 1; x < CW - 1; x++) if (D.plain(x0 + x, y0 + y) && T(x0 + x, y0 + y) === TV.SCRUB) { eligible++; if (shrubs.has((x0 + x) + ',' + (y0 + y))) taken++; }
      // a scrub patch with no tile that has a full cell of scrub round it (a patch one or two cells across) holds a shrub
      const seen = new Set();
      for (let y = 2; y < CH - 2; y++) for (let x = 2; x < CW - 2; x++) {
        const k = (x0 + x) + ',' + (y0 + y); if (seen.has(k) || T(x0 + x, y0 + y) !== TV.SCRUB) continue;
        const q = [[x0 + x, y0 + y]]; seen.add(k); let any = false, inside = true, has = false;
        for (let i = 0; i < q.length; i++) {
          const [a, b] = q[i]; if (D.plain(a, b)) any = true; if (shrubs.has(a + ',' + b)) has = true;
          if (a < x0 + 2 || a > x0 + CW - 3 || b < y0 + 2 || b > y0 + CH - 3) inside = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = (a + dx) + ',' + (b + dy); if (!seen.has(kk) && T(a + dx, b + dy) === TV.SCRUB) { seen.add(kk); q.push([a + dx, b + dy]); } }
        }
        if (!any && inside) { small++; if (has) smallWith++; }
      }
    }
    console.log(`# seed ${seed}: ${taken} shrubs on ${eligible} eligible scrub tiles (${(100 * taken / Math.max(1, eligible)).toFixed(0)}%); small patches ${smallWith} of ${small} hold one`);
    assert.ok(eligible > 5 && taken / eligible >= 0.3, `shrub share of the eligible tiles: ${taken} of ${eligible}`);
    assert.equal(smallWith, small, 'every small scrub patch holds a shrub');
  }
});

test('a 2 x 2 block holds at most three terrains and every two are a pair of the set (terrain layers)', () => {
  assert.ok(blockOk([TV.GRASS, TV.SAND, TV.WATER, TV.SAND]), 'grass, sand and water meet at a corner');
  assert.ok(blockOk([TV.GRASS, TV.GRASS, TV.THICKET, TV.SAND]), 'grass, sand and thicket');
  assert.ok(!blockOk([TV.CLIFF, TV.GRASS, TV.PATH, TV.GRASS]), 'cliff never touches path');
  assert.ok(!blockOk([TV.GRASS, TV.SAND, TV.WATER, TV.THICKET]), 'four terrains in a block');
  assert.ok(blockOk([TV.GRASS]) && blockOk([TV.WATER, TV.GRASS]));
});

test('the pair table is the set\'s: raised land meets only grass', () => {
  for (const [a, b] of [[TV.CLIFF, TV.WATER], [TV.CLIFF, TV.PATH], [TV.CLIFF, TV.THICKET], [TV.CLIFF, TV.SCRUB], [TV.CLIFF, TV.EARTH], [TV.THICKET, TV.SCRUB], [TV.PATH, TV.SAND], [TV.PATH, TV.WATER]]) assert.ok(!pairOk(a, b), a + '|' + b);
  for (const [a, b] of [[TV.GRASS, TV.CLIFF], [TV.GRASS, TV.WATER], [TV.GRASS, TV.PATH], [TV.WATER, TV.SAND], [TV.GRASS, TV.THICKET], [TV.SAND, TV.SCRUB]]) assert.ok(pairOk(a, b), a + '|' + b);
});
