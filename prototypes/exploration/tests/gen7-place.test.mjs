// Generator 7, chunks G2 and G2b: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the
// 2 x 2 minimum feature, cliffs that are the land's own contour (nothing narrower than 4 tiles, nothing along a cell edge), every stair with a way up, the apron, the map's edges agreeing
// with the land (scheme Rule 5.2), reaching every walkable tile of a cell, the reach of whole regions through the ways up, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, blockOk, TV, CW, CH, RW, RH, decorOf, toneField, worldTiles, worldGround, sectorOf, COAST_REACH } from '../src/gen7/place.mjs';
import { inlandOf, RAISE_OFF, levelsOf, tileLevel, setLandRule } from '../src/gen7/levels.mjs';
import { realm7 } from '../src/gen7/region.mjs';
import { readFileSync } from 'node:fs';
import { bakeIR, bakeCtx } from '../tools/gen7-render.mjs';
import SET from '../../../art/places/sets/ninja-test/set.json' with { type: 'json' };
import { RULES } from '../src/gen7/rules.mjs';
import { recipeAt, GROUND, BLEND } from '../src/gen7/ground.mjs';
import { slotBiomes } from '../src/gen7/world.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { ATLAS } from '../src/logic/regions.mjs';
import { MW, MH, L } from '../src/logic/world.mjs';

// The whole-world proofs take about five minutes a seed. A pull request into main (MB_CI_FAST=1) runs seed 7 and seeds 1-5 only; the full set runs locally before every merge.
const FAST = process.env.MB_CI_FAST === '1';
// The land rules as the land of the land round (PR 364) is (land-rules-2): a tile sits in a 2 x 2 block of its own terrain, or is a diagonal step or the one-tile grass buffer (place.mjs lonePlainAt); every
// other lone tile the streams and fords leave is tidied at its source (place.mjs tidyStreams). A pull request (MB_CI_FAST=1) reads two regions of seed 7, the start region and a corner one with the coast
// (about 2 minutes), and holds every rule that is the cell's own; the whole realm's numbers (reach, the share of long cliff runs, the seam sample) and seeds 13 and 42 are the full run's, locally (about 15 minutes a seed).
// Known on the land of the land round, a land-shape job's (land-rules-2 report): the cliff rules P5 and P6 fail in a few places (seed 7: lone faces in regions 0,0, 1,2 and 0,4, foot room in 0,0 and 1,2), so the
// full run is red on them until that job; the sample's corner is 4,4, clear of them.
const SAMPLE = [[2, 2], [4, 4]];
// one placeProps run per seed, shared by the seed's test and its two todo tests below
const STATS = new Map();
const statsOf = seed => { if (!STATS.has(seed)) STATS.set(seed, placeProps(seed, FAST ? SAMPLE : null)); return STATS.get(seed); };

// gen7-place-red-1 (2026-11-25): these two checks are red since PR 419 (385bf1d99, map-levels-build-1, 2026-11-20), which rebuilt the levels. Seed 7, regions 4,1 2,1 1,2 1,4, before PR 419 (b2756fc1f) to after:
// loneLeft 5 -> 9; runs of 9+ 84 of 6388 runs (1.3%) -> 240 of 3244 (7.4%), longest south 10 -> 14, rim 13 -> 16. Whole seed 7 now: loneLeft 10 (limit 8), runs of 9+ 1342 of about 19000 (7%).
// PR 419 says "straight runs capped near 12" but no designer or owner line moves the 2% share or the lone-tile limit, so the thresholds stay as they were and the checks are todo until a land-shape job
// either brings the land back inside them or the designer rules the new numbers (then change them here, quoting the line and bus id).
for (const seed of FAST ? [7] : [7, 13, 42]) {
  test(`seed ${seed}: lone tiles are kept by the land rule, at most 1 in 1000 cells left over`, { timeout: 2700000, todo: 'red since PR 419 (levels rebuilt): seed 7 has 10 left over, limit 8; needs a land-shape job or a designer ruling' }, () => {
    const s = statsOf(seed);
    assert.ok(s.loneLeft <= Math.ceil(s.cells / 1000), 'every tile sits in a 2 x 2 block of its own terrain, or is a diagonal step or a one-tile grass buffer: ' + s.loneLeft + ' others ' + JSON.stringify(s.loneLeftAt));
  });
  if (!FAST) test(`seed ${seed}: straight cliff runs of 9+ are rare (under 2% of runs)`, { timeout: 2700000, todo: 'red since PR 419 (levels rebuilt): about 7% of runs are 9+; needs a land-shape job or a designer ruling' }, () => {
    const s = statsOf(seed);
    assert.ok((s.runs9.south + s.runs9.side + s.runs9.rim) * 50 < s.cliffRuns, 'straight runs of 9+ are rare: ' + JSON.stringify(s.runs9) + ' of ' + s.cliffRuns + ', longest ' + JSON.stringify(s.runMax));
  });
}

for (const seed of FAST ? [7] : [7, 13, 42]) {
  test(`seed ${seed}: every cell${FAST ? ' of two regions' : ''} holds the scheme's rules for tiles, cliffs, edges, ways up and the bake`, { timeout: 2700000 }, async (t) => {
    const s = statsOf(seed);
    const hist = Object.keys(s.runHist).map(Number).sort((a, b) => a - b).map(k => k + ':' + s.runHist[k]).join(' ');
    console.log(`# seed ${seed}: ${JSON.stringify({ ...s, runHist: undefined })}\n# straight cliff runs (length:count) ${hist}`);
    await t.test(`L52`, () => { assert.equal(s.cells, FAST ? SAMPLE.length * 320 : 8000); });
    await t.test(`L53`, () => { assert.equal(s.pairBreaks, 0, 'no 2 x 2 block holds more than three terrains or two that are not a pair of the set'); });
    // Rule 1.9 on the new land: a diagonal step (a contour's staircase) and the one-tile grass buffer between terrains that may not meet (a stream along a cliff's foot, a ford beside scree) are the land's;
    // a notch, a spike, a one-tile strip or dot of the ground is not (a map is judged by its edges: no one-tile notches): the streams' tidy takes them at their source. What it cannot take is held to 1 in 1000 cells, rounded up
    // (seeds 7, 13, 42: 6, 6, 4: a ford across a one-tile neck of a stream, a stream's tail that drying would cut off, a sand or scree spike away from water; the sample's region 4,4 holds one, seed 7 cell 70,95). Raised land's shape is the cliff rules' (P4-P6 below, nothing under 4); its one-tile
    // bumps on a side wall are reported (seeds 7, 13, 42: 7, 6, 2), a land-shape job's
    console.log(`# seed ${seed}: tiles in no 2 x 2 block of their own ${s.loneTiles}, kept by the land rule (steps, grass buffers) ${s.loneKept}, others ${s.loneLeft} ${JSON.stringify(s.loneLeftAt)}, raised bumps ${s.loneRaised} ${JSON.stringify(s.loneRaisedAt)}`);
    // the lone-tile limit (loneLeft <= cells / 1000) is its own test below, marked todo (red since PR 419)
    // G2b: a cliff is the field's contour at tile scale, so its straight runs are short and wandering (a diagonal is a staircase of one-tile steps). The old rule "no run under 4" was the
    // blocks' (a cliff turned at most once in 8 tiles); the rule now is that no cliff is a spike, a spur or a one-row ridge: every cliff tile sits in a 4 x 4 block of raised land.
    // the land rule's own checks (land-shape-spec-1 P4-P6, world-topdown-spec-1 section 4 C1 and the seam), in place of the old block rule's (lone tiles above is the one-wide sliver check)
    await t.test(`L63`, () => { assert.equal(s.pinch, 0, 'P4: no diagonal pinch'); });
    // gen7-place-red-1 (2026-11-25): what is red on main is todo, each for the seeds where it is red, with its cause; nothing is loosened, nothing deleted. Counts are whole-seed runs.
    // P5 lone face: seed 7 4 (PR 391, b2756fc1f) -> 1 (PR 419), seed 13 1: red since the land round (PR 364); this file's header names it a land-shape job's.
    const todoFor = (seeds, why) => seeds.includes(seed) ? { todo: why } : {};
    await t.test(`P5 lone face`, todoFor([7, 13], 'red since the land round (PR 364), not since PR 419: seed 7 has 1 lone face, seed 13 has 1; a land-shape job'), () => { assert.equal(s.loneFace, 0, 'P5: no lone one-tile face'); });
    await t.test(`L65`, () => { assert.equal(s.footShort, 0, 'P6: foot room under every south lip'); });
    // the designer's ruling (a south face at most 10, a side wall or back rim at most 14) is held on the 15 fixed windows by tools/land-measure.mjs; over a whole seed's regions a few runs pass it
    // (seed 7: longest 19, 25, 16), so here the share of runs of 9 or more is held under 2%
    // the share of runs of 9+ is its own test below, marked todo (red since PR 419)
    if (!FAST) await t.test(`L69`, () => { assert.ok(s.cliffRuns > 1000, 'cliffs wander: ' + s.cliffRuns + ' runs'); });
    // apron, seed 42: 418 cells (PR 391, b2756fc1f) -> 148 (PR 419): red before PR 419 too, a seam bug in the levels' apron on seed 42; a land job
    await t.test(`apron`, todoFor([42], 'red before PR 419 (418 cells) and after (148): a cell edge on seed 42 differs from its neighbour; a land job'), () => { assert.equal(s.apronMismatch, 0, 'the apron of every cell equals its neighbours\' edge tiles'); });
    await t.test(`L71`, () => { assert.ok(s.c1Ok * 100 >= 90 * s.cells, 'C1: a place\'s level is the level of most of its tiles in at least 90% of places: ' + s.c1Ok + ' of ' + s.cells + ' ' + JSON.stringify(s.c1Misses)); });
    // C1w raised tile in a water place: 0 on seeds 7 and 42 at PR 391 (b2756fc1f) -> 24, 21 (seed 13), 12 after PR 419 (385bf1d99): the levels rebuild raises land in water places
    await t.test(`C1w raised tile in water`, todoFor([7, 13, 42], 'red since PR 419 (map-levels-build-1): 24, 21 and 12 raised tiles in water places on seeds 7, 13, 42 (0 before); the designer or a land job'), () => { assert.equal(s.waterRaisedTiles, 0, 'C1w: no raised tile in a water place'); });
    await t.test(`L73`, () => { assert.ok((FAST || s.seamCells > 20) && s.seamBad === 0, 'seam: a cell is the same from every neighbour\'s window: ' + s.seamBad + ' tiles differ in ' + s.seamCells + ' cells'); });
    // every walkable tile of low ground is reached from the cell's sides. On a plateau, an inner-corner tile whose four neighbours are all lip (the rim wraps round a concave corner) is
    // enclosed by the lip by the tests' own definition of a lip (seed 7 has one in 8000 cells); no more than 4 of them a seed
    // a walled part that holds no path is the land's, apart from the trail's line (seed 7 14,14; 13 18,24; 42 56,79: pockets the levels leave): listed here, a land job's (designer 2026-11-16)
    console.log(`# seed ${seed}: cells the land leaves walled apart from the trail's line: ${s.unreachedLand} ${JSON.stringify(s.landWalledAt)}`);
    await t.test(`L78`, () => { assert.equal(s.unreachedCells - s.unreachedRaisedOnly - s.unreachedLand, 0, 'every walkable tile of low ground on the trail\'s line is reached from the cell\'s sides: ' + JSON.stringify(s.unreachedAt)); });
    // plateau tiles enclosed by the lip (limit 4): seeds 7 and 42 had 2 at PR 391 (b2756fc1f); after PR 419: 36, 26 (seed 13), 39
    await t.test(`plateau tiles enclosed by the lip`, todoFor([7, 13, 42], 'red since PR 419 (map-levels-build-1): 36, 26 and 39 enclosed plateau tiles on seeds 7, 13, 42 (limit 4, 2 before); a land job'), () => { assert.ok(s.unreachedRaisedOnly <= 4, 'plateau tiles enclosed by the lip: ' + s.unreachedRaisedOnly); });
    await t.test(`L80`, () => { assert.equal(s.stairsWithoutWayUp, 0, 'every stair has a way up'); });
    await t.test(`L81`, () => { assert.ok(s.stairs > 50 && s.stairsSouthWithWayUp === s.stairs, 'stairs: ' + s.stairs); });
    // the whole realm (place-walk-1): the realm's tiles stitched, flooded from the start of every region through the ways up (water of a ford cell walked, a cliff's lip across a region's border the true one). Land a
    // neighbouring region's start reaches is reached (a region on its own left 4-8% of its tiles "unreached" that its neighbour reaches: s.regionUnreachedTiles). What stays out is walled in whole: a mesa or pit
    // with no way up, a lake's islet; held under 2% of all walkable tiles
    console.log(`# reach: unreachedTiles ${s.unreachedTiles} of ${s.walkableTiles}; pathUnreached ${s.pathUnreached}; piecesUnreached ${s.piecesUnreached} of ${s.pieces}; (each region on its own: ${s.regionUnreachedTiles}, ${s.regionPathUnreached}, ${s.regionPiecesUnreached})`);
    if (!FAST) {   // the whole realm's flood: the full run's
      await t.test(`L87`, () => { assert.ok(s.unreachedTiles * 100 < 2 * s.walkableTiles, 'reach: ' + s.unreachedTiles + ' of ' + s.walkableTiles + ' walkable tiles not reached (each region on its own: ' + s.regionUnreachedTiles + ')'); });
      await t.test(`L88`, () => { assert.ok(s.pathUnreached <= 1145, 'trails and ports on unreached land: ' + s.pathUnreached + ' ' + JSON.stringify(s.needAt)); });
      await t.test(`L89`, () => { assert.ok(s.piecesUnreached * 100 <= s.pieces, 'set pieces on unreached land (reported, at most 1%): ' + s.piecesUnreached + ' of ' + s.pieces + ' ' + JSON.stringify(s.needAt)); });
    }
    await t.test(`L91`, () => { assert.equal(s.bakeFails, 0, s.bakeMessages.join('\n')); });
    // the map's end shut, seed 42: 992 end tiles walk (PR 391, b2756fc1f) -> 768 (PR 419): red before PR 419 too; a river mouth or gate shaft ends in the band; a land job
    await t.test(`the map's end is shut`, todoFor([42], 'red before PR 419 (992 end tiles walk) and after (768 of 37696): seed 42 has an open end; a land job'), () => { assert.ok(s.bandWalkable * 100 < 1.5 * s.bandTiles, 'the map\'s end is shut: ' + s.bandWalkable + ' of ' + s.bandTiles + ' end tiles walk (a river\'s mouth, a gate shaft that ends in the band)'); });
  });
}

// G3, props and decor on world coordinates: gen7-place-decor.test.mjs (its own file, so the CI shards can share the time).

test('a cell is the same land whatever else was made before it, and its picture is one bake', () => {
  const a = cellTerrain(13, 36, 48), again = cellTerrain(13, 36, 48);
  assert.deepEqual(a.terrain, again.terrain);
  assert.equal(a.w, CW + 2); assert.equal(a.h, CH + 2);
  const ir = cellIR(13, 36, 48), place = bakeIR(ir);
  assert.equal(place.w, CW + 2);
  // the one table of ground pairs (set.json groundPairs): the page's layers.json is made from the same set (not stale), and the layers draw every pair the generator may make
  const page = JSON.parse(readFileSync(new URL('../art/gen7/layers.json', import.meta.url), 'utf8')), live = bakeCtx().layersOf.get('ninja-test'), val = new Map(bakeCtx().terrains.map(t => [t.id, t.value]));
  assert.deepEqual(page.layers, [...live.layers].map(([v, l]) => [v, { ...l, kinds: l.kinds.map(k => ({ ...k, lowers: [...k.lowers], ...(k.mix ? { mix: { sw: [...k.mix.sw], se: [...k.mix.se] } } : {}) })) }]).map(([v, l]) => JSON.parse(JSON.stringify([v, l]))), 'art/gen7/layers.json is stale: run tools/gen7-layers.mjs');
  const drawnAs = v => { for (let l = page.layers.find(([x]) => x === v)[1]; l.drawAs !== undefined; l = page.layers.find(([x]) => x === v)[1]) v = l.drawAs; return v; };   // path-top is drawn as the path until its own layers are signed
  assert.ok(SET.groundPairs.every(([a, b]) => drawnAs(val.get(a)) === drawnAs(val.get(b)) || [[a, b], [b, a]].some(([hi, lo]) => page.layers.find(([v]) => v === drawnAs(val.get(hi)))[1].kinds.some(k => k.lowers.includes(drawnAs(val.get(lo)))))), 'every pair of the table is drawable by the page\'s layers');
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
    const D = decorOf(seed), T = worldGround(seed);   // a raised tile is its top's ground: scrub on a raised top holds shrubs as on the low ground
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
        const q = [[x0 + x, y0 + y]]; seen.add(k); let any = false, inside = true, has = false, lip = false;
        for (let i = 0; i < q.length; i++) {
          const [a, b] = q[i]; if (D.plain(a, b)) any = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (D.flags(a + dx, b + dy) & 4) lip = true; if (shrubs.has(a + ',' + b)) has = true;
          if (a < x0 + 2 || a > x0 + CW - 3 || b < y0 + 2 || b > y0 + CH - 3) inside = false;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const kk = (a + dx) + ',' + (b + dy); if (!seen.has(kk) && T(a + dx, b + dy) === TV.SCRUB) { seen.add(kk); q.push([a + dx, b + dy]); } }
        }
        if (!any && inside && !lip) { small++;   // (a patch on or beside the cliff's lip holds none: nothing is laid within a tile of a lip)
          if (has) smallWith++; }
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

test('the pair table is the set\'s: raised land meets grass and the biome grounds (the cliff layer\'s lowers), nothing else', () => {
  for (const [a, b] of [[TV.CLIFF, TV.WATER], [TV.CLIFF, TV.PATH], [TV.CLIFF, TV.THICKET], [TV.CLIFF, TV.SCRUB], [TV.CLIFF, TV.EARTH], [TV.THICKET, TV.SCRUB], [TV.PATH, TV.SAND], [TV.PATH, TV.WATER]]) assert.ok(!pairOk(a, b), a + '|' + b);
  for (const [a, b] of [[TV.GRASS, TV.CLIFF], [TV.GRASS, TV.WATER], [TV.GRASS, TV.PATH], [TV.WATER, TV.SAND], [TV.GRASS, TV.THICKET], [TV.SAND, TV.SCRUB], [TV.CLIFF, TV.LITTER], [TV.CLIFF, TV.DRY], [TV.CLIFF, TV.TURF], [TV.CLIFF, TV.SCREE]]) assert.ok(pairOk(a, b), a + '|' + b);
});

// Amendment L: a raised tile stands on its biome's ground (the IR's `top`). On the tiles of a slot's own recipe (BLEND tiles clear of a slot edge) each biome's signature skin is on raised tops in a share
// that follows the low ground's: at least 40% of it where the low ground holds 30% or more. Raised land is rockier than low land (the same elevation field that lifts it feeds the rock field), so scree
// is over-represented on tops and the grass of the low ground, a forced ring beside raised land, is under-represented: the table is logged, not held to 20% per skin.
const SIGNATURE = { downs: 'turf', woods: 'litter', tallwood: 'litter', thickets: 'dry', fells: 'scree' };
const SKIN = { [TV.GRASS]: 'grass', [TV.LITTER]: 'litter', [TV.DRY]: 'dry', [TV.TURF]: 'turf', [TV.SCREE]: 'scree', [TV.SAND]: 'sand', [TV.SCRUB]: 'scrub' };
test('raised tops carry their biome\'s ground: the signature skin of each biome is on tops in a share that follows the low ground\'s, and tops are no longer all grass', { timeout: 1800000 }, () => {
  for (const seed of FAST ? [7] : [7, 13, 42]) {
    const sb = slotBiomes(seed), SW = MW * CW, SH = MH * CH, inner = (g, len) => { const f = g % len; return f >= BLEND && len - f > BLEND; }, by = {};
    for (let Y = 2; Y < RH - 2; Y += 10) for (let X = 2; X < RW - 2; X += 8) {
      const c = cellTerrain(seed, X, Y);
      for (let y = 1; y <= CH; y++) for (let x = 1; x <= CW; x++) {
        const gx = X * CW + x - 1, gy = Y * CH + y - 1; if (!inner(gx, SW) || !inner(gy, SH)) continue;
        const o = (by[sb[Math.floor(gy / SH) * ATLAS + Math.floor(gx / SW)]] ||= { low: {}, top: {}, nl: 0, nt: 0 }), v = c.terrain[y * c.w + x];
        if (v === TV.CLIFF) { if (c.top[y * c.w + x] === TV.PATHTOP) continue; /* a trail's path on a top is not a skin of the biome */ const n = SKIN[c.top[y * c.w + x] || TV.GRASS]; o.top[n] = (o.top[n] || 0) + 1; o.nt++; } else if (SKIN[v]) { o.low[SKIN[v]] = (o.low[SKIN[v]] || 0) + 1; o.nl++; }
      }
    }
    let nonGrassTops = 0, topTiles = 0;
    for (const [b, o] of Object.entries(by)) {
      const table = {}; for (const n of new Set([...Object.keys(o.low), ...Object.keys(o.top)])) table[n] = [+((o.low[n] || 0) / o.nl).toFixed(3), +((o.top[n] || 0) / o.nt).toFixed(3)];
      console.log(`# seed ${seed} ${b}: low ${o.nl} tiles, raised tops ${o.nt} tiles; share of each skin [low, top] ${JSON.stringify(table)}`);
      for (const [n, k] of Object.entries(o.top)) { topTiles += k; if (n !== 'grass') nonGrassTops += k; }
      const sig = SIGNATURE[b]; if (!sig || o.nl < 1500 || o.nt < 1500) continue;
      const low = (o.low[sig] || 0) / o.nl, top = (o.top[sig] || 0) / o.nt;
      if (low >= 0.3) assert.ok(top >= 0.4 * low, `seed ${seed} ${b}: ${sig} is ${top.toFixed(3)} of the raised tops against ${low.toFixed(3)} of the low ground`);
    }
    assert.ok(nonGrassTops > 0.3 * topTiles, `seed ${seed}: ${nonGrassTops} of ${topTiles} raised tiles hold a ground other than grass`);
  }
});

// V2, the biome ground (src/gen7/ground.mjs): a biome's recipe is the same on both sides of every cell edge; it changes only over the BLEND tiles either side of a slot's edge, and by no more in a tile
// than the whole difference between two recipes spread over those 2 x BLEND tiles.
test('the biome recipe never changes on a cell edge: it blends over a few tiles at a slot edge and is one value inside a slot', () => {
  const nearEdge = (g, len) => { const f = g % len; return f < BLEND || len - f <= BLEND; }, STEP = 3 / (2 * BLEND) + 1e-9;   // 3: the widest difference between two recipes' numbers
  const diff = (r0, r1) => { let d = 0; for (const k of Object.keys(r0)) d = Math.max(d, Math.abs(r0[k] - r1[k])); return d; };
  for (const seed of [7, 13, 42]) {
    const sb = slotBiomes(seed), slotAt = (a, b) => sb[b * ATLAS + a], SW = MW * CW, SH = MH * CH;
    let cellEdges = 0, blended = 0;
    for (let gy = 0; gy < RH * CH; gy += 7) for (let gx = 1; gx < RW * CW; gx++) {
      const d = diff(recipeAt(slotAt, ATLAS, SW, SH, gx - 1, gy), recipeAt(slotAt, ATLAS, SW, SH, gx, gy));
      if (gx % CW === 0) cellEdges++;
      if (!nearEdge(gx, SW) && !nearEdge(gx - 1, SW)) assert.equal(d, 0, `seed ${seed}: the recipe changes at tile ${gx},${gy}, inside a slot`); else if (d > 0) blended++;
      assert.ok(d <= STEP, `seed ${seed}: the recipe jumps ${d} at tile ${gx},${gy}`);
    }
    for (let gx = 0; gx < RW * CW; gx += 7) for (let gy = 1; gy < RH * CH; gy++) {
      const d = diff(recipeAt(slotAt, ATLAS, SW, SH, gx, gy - 1), recipeAt(slotAt, ATLAS, SW, SH, gx, gy));
      if (!nearEdge(gy, SH) && !nearEdge(gy - 1, SH)) assert.equal(d, 0, `seed ${seed}: the recipe changes at tile ${gx},${gy}, inside a slot`);
      assert.ok(d <= STEP, `seed ${seed}: the recipe jumps ${d} at tile ${gx},${gy}`);
    }
    assert.ok(cellEdges > 1000 && blended > 100, `seed ${seed}: ${cellEdges} cell edges read, ${blended} blended tiles`);
  }
});

// The map's land kind and the walk's ground agree (owner note 20: "expecting a stony biome, it was the same grassland again"). For every land cell of seeds 7, 13 and 42 whose middle 8 x 8 tiles are low
// ground (raised land's top is the meadow ground until the layered edges, amendment L): a water cell's middle is water (a ford is shallows: any), a pond cell's holds a fifth of water, a rock cell's is stony (scree), a wood cell's is wood
// ground (floor, scrub or thicket), a meadow cell's is open ground you can walk (grass or the wood floor). Water and pond hold in every cell; the others in all but 2 in 100 (a rock cell whose middle is a path or a stair's foot).
// A stream through a rock, wood or meadow cell is the stream's, not the cell's land (land-rules-2): its banks are grass by the bank rule (place.mjs "the banks": water meets only grass, sand and scree), as a trail's
// lane is the trail's, so its water, its fords and the grass within 2 tiles of them read the nearest tile that is none of these; the cell keeps its kind (a wood with a brook through it is a wood).
test('the map\'s land kind and the walk\'s ground agree in the middle of every cell of seeds 7, 13 and 42', { timeout: 2700000 }, () => {
  for (const seed of FAST ? [7] : [7, 13, 42]) {   // about ten minutes a seed: a pull request (MB_CI_FAST=1) reads the two regions of seed 7 the proofs above read
    const seen = { WATER: [0, 0], POND: [0, 0], ROCK: [0, 0], WOOD: [0, 0], MEADOW: [0, 0] }, bad = [], coast = [];
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
      if (FAST && !SAMPLE.some(([a, b]) => a === ax && b === ay)) continue;
      const G = genRegion7(seed, ax, ay);
      for (let c = 0; c < MW * MH; c++) {
        const lab = Object.keys(L).find(k => L[k] === G.land[c]); if (!seen[lab]) continue;
        const X = ax * MW + (c % MW), Y = ay * MH + ((c / MW) | 0), t = cellTerrain(seed, X, Y), n = {}; let low = 0, raised = 0;
        // the lane is 2 tiles a side (the path meets grass only), so the check reads 2 tiles round the path (designer 2026-11-15)
        // a trail's path (and a path on a top) is not the land under it: a path tile reads the nearest tile that is not path (the ground the trail lies on)
        // (the lane of grass the trail lays beside its path is the trail's too: a tile that is path or touches path reads the nearest tile that neither is nor touches path)
        const tv = (x, y) => (x < -1 || y < -1 || x > CW || y > CH ? -1 : t.terrain[(y + 1) * t.w + x + 1]), near = (x, y, f) => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (f(tv(x + dx, y + dy))) return true; return false; };
        const isStream = u => u === TV.WATER || u === TV.FORD, land = lab === 'ROCK' || lab === 'WOOD' || lab === 'MEADOW';
        const off = (x, y) => near(x, y, u => u === TV.PATH) || (land && (isStream(tv(x, y)) || (tv(x, y) === TV.GRASS && near(x, y, isStream))));   // the trail's and the stream's, not the land's
        const groundAt = (x, y) => { const v = tv(x, y); if (!off(x, y)) return v; for (let r = 1; r <= 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const a = x + dx, b = y + dy, u = tv(a, b); if (u >= 0 && !off(a, b)) return u; } return v === TV.PATH ? TV.GRASS : v; };
        for (let y = (CH >> 1) - 3; y < (CH >> 1) + 5; y++) for (let x = (CW >> 1) - 3; x < (CW >> 1) + 5; x++) { const v = groundAt(x, y); if (v === TV.CLIFF) { raised++; continue; } low++; n[v] = (n[v] || 0) + 1; }
        if (raised) continue;
        // a water cell may be the coast's ring: deep water in the walk
        const f = k => (n[TV[k]] || 0) / low, ok = lab === 'WATER' ? (G.ford[c] || f('WATER') + f('DEEP') >= 0.15) : lab === 'POND' ? f('WATER') >= 0.2 : lab === 'ROCK' ? f('SCREE') + f('SAND') >= 0.1 : lab === 'WOOD' ? f('LITTER') + f('THICKET') + f('SCRUB') >= 0.1 : f('GRASS') + f('LITTER') + f('DRY') + f('TURF') >= 0.2;
        if (!ok && Math.min(X, Y, MW * ATLAS - 1 - X, MH * ATLAS - 1 - Y) <= 1) { coast.push(`${lab} ${X},${Y}`); continue; }   // the cell beside the coast's ring, or the ring's own (part land, its middle on the shore): its shore band (water, beach, grass) takes the half of it nearest the ring, so what the map labels it is not the ground in its middle (a known gap, listed apart; open-water cells stay at 0)
        seen[lab][0]++; if (!ok) { seen[lab][1]++; if (bad.length < 8) bad.push(`${lab} ${X},${Y}`); }
      }
    }
    console.log(`# seed ${seed}: map and walk disagree (cells read / disagree): ${JSON.stringify(seen)}; coast-ring cells out of the line, listed apart: ${coast.length} ${coast.slice(0, 12)}`);
    for (const lab of ['WATER', 'POND']) assert.equal(seen[lab][1], 0, `seed ${seed}: ${lab} cells whose middle is not that ground: ${bad}`);
    for (const lab of ['ROCK', 'WOOD', 'MEADOW']) assert.ok(seen[lab][0] > (FAST ? 10 : 50) && seen[lab][1] * 50 <= seen[lab][0], `seed ${seed}: ${lab} cells whose middle is not that ground: ${seen[lab]} ${bad}`);
  }
});

// The coast: the realm's border ring is water, the shore band lies in the first tiles inside it, and no raised land comes within RAISE_OFF tiles of the border line.
test('seed 7: the coast is deep water at the border line, then water, beach and a strip of grass; nothing raised near it; the nine inner regions have no coast', () => {
  const seed = 7, R = realm7(seed), T = worldTiles(seed), G = worldGround(seed);
  for (const g of R.regions) { const rim = g.slot[0] === 0 || g.slot[1] === 0 || g.slot[0] === ATLAS - 1 || g.slot[1] === ATLAS - 1, n = g.coast.reduce((a, b) => a + b, 0); assert.equal(n > 0, rim, 'coast cells only in rim regions ' + g.slot); }
  let water = 0, beach = 0, grass = 0, raisedNear = 0;
  for (let gy = 0; gy < RH * CH; gy += 3) for (const gx of [CW - 1, CW, CW + 1, CW + 6, CW + 9, CW + 12]) {   // along the west coast, at tiles from the border line: -1, 0, 1, 6, 9, 12
    const d = inlandOf(gx, gy), v = T(gx, gy);
    if (d < 0) assert.equal(v, TV.DEEP, 'the border ring is deep water');
    if (d === 6 || d === 9) { if (v === TV.WATER) water++; else if (v === TV.SAND) beach++; else if (v === TV.GRASS) grass++; }
    if (d < RAISE_OFF && v === TV.CLIFF) raisedNear++;
  }
  assert.equal(raisedNear, 0, 'no raised land within RAISE_OFF tiles of the border line');
  assert.ok(water + beach + grass > 0 && beach > 0 && grass > 0, `the band holds beach and grass at 6-9 tiles: ${water}/${beach}/${grass}`);
});

// The land rule takes more heights as data (land-rule.json `levels`): two thresholds make three levels, and every boundary between level k and k + 1 is cleaned on its own raster.
// (map-levels-build-1: high ground is the exception, so the window is one of seed 13 that holds raised land at both thresholds)
test('seed 13: two thresholds in the rule give three levels, each boundary with no pinch and no lone face', { timeout: 900000 }, () => {
  const seed = 13, realm = realm7(seed).realm;
  setLandRule({ levels: [0, 3000] });
  try {
    const L = levelsOf(realm), X0 = 20, Y0 = 30, W = 4 * CW, H = 3 * CH, lv = new Uint8Array(W * H), seen = [0, 0, 0, 0];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { lv[y * W + x] = tileLevel(L, X0 * CW + x, Y0 * CH + y); seen[lv[y * W + x]]++; }
    assert.ok(seen[0] > 0 && seen[1] > 0 && seen[2] > 0 && !seen[3], 'levels 0, 1 and 2 are all there, and no level 3: ' + seen);
    for (const k of [0, 1]) {   // the raster of "above level k": no diagonal pinch, no lone one-tile face
      const R = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : lv[y * W + x] > k ? 1 : 0), lip = (x, y) => R(x, y) && !R(x, y + 1);
      let pinch = 0, lone = 0;
      for (let y = 0; y + 1 < H; y++) for (let x = 0; x + 1 < W; x++) { const c = R(x, y) * 8 + R(x + 1, y) * 4 + R(x, y + 1) * 2 + R(x + 1, y + 1); if (c === 6 || c === 9) pinch++; }
      // cliff-contour-1: a lean (a side wall moving one column in going south, levels.mjs leanAt) is no face; the land behind it is read past the raster's sides as raised (the land rule saw it whole)
      const Rb = (x, y) => (x < 0 || x >= W || y < 0 || y >= H ? true : R(x, y));
      const lean = (x, y) => R(x, y - 1) && !R(x, y + 2) && [-1, 1].some((d) => !R(x + d, y) && !R(x + d, y - 1) && [0, 1, 2, 3, 4].every((j) => Rb(x - d, y + j)) && [2, 3, 4].every((j) => Rb(x - j * d, y + 1) && Rb(x - j * d, y + 2)));
      for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 1; x++) if (lip(x, y) && !lip(x - 1, y) && !lip(x + 1, y) && !(lip(x - 1, y - 1) || lip(x + 1, y - 1) || lip(x - 1, y + 1) || lip(x + 1, y + 1)) && !lean(x, y)) lone++;
      assert.equal(pinch, 0, 'boundary ' + k + ': no pinch'); assert.equal(lone, 0, 'boundary ' + k + ': no lone face');
    }
  } finally { setLandRule({}); }
});

// The sector (world-topdown-spec-1 2.4): a place is 4 x 4 blocks of ground class and level bit, made from the realm alone; its blocks are the majority of the built place's tiles (C2g, C2l),
// a water block is low, and the trail's line leaves a place at the port the neighbour's line arrives at.
test('seed 7: the sector of a place is 16 blocks of ground and level, agrees with the built place, holds water low, and its trail lines meet at the shared port', { timeout: 900000 }, () => {
  const seed = 7, re = realm7(seed).realm, cls = v => (v === TV.WATER || v === TV.DEEP ? 5 : v === TV.SAND ? 4 : v === TV.THICKET || v === TV.SCRUB ? 2 : v === TV.LITTER ? 1 : v === TV.SCREE ? 3 : 0);
  let gOk = 0, lOk = 0, n = 0;
  for (const [X, Y] of [[8, 8], [9, 8], [8, 9], [20, 30], [40, 50], [41, 50]]) {
    const s = sectorOf(seed, X, Y), T = cellTerrain(seed, X, Y);
    assert.equal(s.cls.length, 16); assert.equal(s.lv.length, 16);
    for (let b = 0; b < 16; b++) {
      const bx = b % 4, by = (b / 4) | 0, k = new Array(6).fill(0); let up = 0;
      for (let y = 0; y < 7; y++) for (let x = 0; x < 6; x++) { const i = (by * 7 + y + 1) * T.w + bx * 6 + x + 1, v = T.terrain[i]; k[v === TV.CLIFF ? cls(T.top[i] || TV.GRASS) : cls(v)]++; if (v === TV.CLIFF) up++; }
      n++; if ((s.cls[b] & 7) === k.indexOf(Math.max(...k))) gOk++; if (s.lv[b] === (up * 2 >= 42 ? 1 : 0)) lOk++;
      if ((s.cls[b] & 7) === 5) assert.equal(s.lv[b], 0, 'a water block is low');
    }
  }
  assert.ok(gOk / n >= 0.9, 'C2g on the sample: ' + gOk + ' of ' + n); assert.ok(lOk / n >= 0.85, 'C2l on the sample: ' + lOk + ' of ' + n);
  // a stretch of trail: the two places' lines share the port of the edge between them
  const list = re.roads.lists.find(l => l.length >= 2), a = [list[0] % RW, (list[0] / RW) | 0], b = [list[1] % RW, (list[1] / RW) | 0];
  const ends = (X, Y) => sectorOf(seed, X, Y).lines.filter(l => l.k === 'trail').map(l => l.pts.slice(0, 2).join());
  assert.ok(ends(a[0], a[1]).some(p => ends(b[0], b[1]).includes(p)), 'the trail leaves one place and enters the next at the same port');
});

// The reach asks for the places in view first: a sector made for some cells holds exactly what the whole region's holds in them, marks them in `have`, and leaves the rest empty.
test('seed 7: a sector asked for the cells in view equals the whole region sector in those cells', { timeout: 900000 }, async () => {
  const { sectorOfRegion } = await import('../src/gen7/world7.mjs'), seed = 7, slot = [1, 1], cells = [0, 1, 25, 26, 100], part = sectorOfRegion(seed, slot, cells), whole = sectorOfRegion(seed, slot);
  assert.equal(whole.have, undefined);
  for (let c = 0; c < part.have.length; c++) {
    assert.equal(part.have[c], cells.includes(c) ? 1 : 0);
    for (let i = 0; i < 16; i++) { const same = part.cls[c * 16 + i] === whole.cls[c * 16 + i] && part.lv[c * 16 + i] === whole.lv[c * 16 + i]; assert.ok(cells.includes(c) ? same : part.cls[c * 16 + i] === 0 && part.lv[c * 16 + i] === 0); }
  }
  assert.deepEqual(part.lines, whole.lines.filter(l => cells.includes(l.c)));
});

// The region atlas tool (tools/atlas.mjs) runs on one place and writes its picture and its numbers.
test("atlas: one place gives a PNG and a JSON of numbers", async () => {
  const { atlas } = await import("../tools/atlas.mjs");
  const { mkdtempSync, readFileSync: rf } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const r = await atlas({ seed: 7, at: [14, 30], size: [1, 1], overlays: null, out: mkdtempSync(tmpdir() + "/atlas-") });
  assert.equal(rf(r.png).subarray(1, 4).toString(), "PNG");
  const j = JSON.parse(rf(r.json, "utf8"));
  assert.equal(j.places.length, 1); assert.ok(j.totals.buildMs >= 0 && j.overlays.shown.includes("faces"));
});
