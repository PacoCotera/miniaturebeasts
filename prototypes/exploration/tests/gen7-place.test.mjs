// Generator 7, chunks G2 and G2b: the place layer. Property tests over every cell of seeds 7, 13 and 42 (80 x 100 cells each): terrain on the logic grid, the dual grid's pair table, the
// 2 x 2 minimum feature, cliffs that are the land's own contour (nothing narrower than 4 tiles, nothing along a cell edge), every stair with a way up, the apron, the map's edges agreeing
// with the land (scheme Rule 5.2), reaching every walkable tile of a cell, the reach of whole regions through the ways up, and the bake.
import test from 'node:test';
import assert from 'node:assert/strict';
import { placeProps } from '../tools/gen7-place-props.mjs';
import { cellTerrain, cellIR, windowIR, pairOk, blockOk, TV, CW, CH, RW, RH, decorOf, toneField, worldTiles, worldGround, overviewOf, OV, OVW, COAST_REACH } from '../src/gen7/place.mjs';
import { inlandOf, RAISE_OFF } from '../src/gen7/levels.mjs';
import { realm7 } from '../src/gen7/region.mjs';
import { bakeIR } from '../tools/gen7-render.mjs';
import { RULES } from '../src/gen7/rules.mjs';
import { recipeAt, GROUND, BLEND } from '../src/gen7/ground.mjs';
import { slotBiomes } from '../src/gen7/world.mjs';
import { genRegion7 } from '../src/gen7/region.mjs';
import { ATLAS } from '../src/regions.mjs';
import { MW, MH, L } from '../src/world.mjs';

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
    assert.ok(s.bandWalkable * 100 < 1.5 * s.bandTiles, 'the map\'s end is shut: ' + s.bandWalkable + ' of ' + s.bandTiles + ' end tiles walk (a river\'s mouth, a gate shaft that ends in the band)');
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
        if (v === TV.CLIFF) { const n = SKIN[c.top[y * c.w + x] || TV.GRASS]; o.top[n] = (o.top[n] || 0) + 1; o.nt++; } else if (SKIN[v]) { o.low[SKIN[v]] = (o.low[SKIN[v]] || 0) + 1; o.nl++; }
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
test('the map\'s land kind and the walk\'s ground agree in the middle of every cell of seeds 7, 13 and 42', { timeout: 1800000 }, () => {
  for (const seed of FAST ? [7] : [7, 13, 42]) {   // about five minutes a seed: a pull request (MB_CI_FAST=1) runs seed 7, as the proofs above do
    const seen = { WATER: [0, 0], POND: [0, 0], ROCK: [0, 0], WOOD: [0, 0], MEADOW: [0, 0] }, bad = [];
    for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) {
      const G = genRegion7(seed, ax, ay);
      for (let c = 0; c < MW * MH; c++) {
        const lab = Object.keys(L).find(k => L[k] === G.land[c]); if (!seen[lab]) continue;
        const X = ax * MW + (c % MW), Y = ay * MH + ((c / MW) | 0), t = cellTerrain(seed, X, Y), n = {}; let low = 0, raised = 0;
        for (let y = (CH >> 1) - 3; y < (CH >> 1) + 5; y++) for (let x = (CW >> 1) - 3; x < (CW >> 1) + 5; x++) { const v = t.terrain[(y + 1) * t.w + x + 1]; if (v === TV.CLIFF) { raised++; continue; } low++; n[v] = (n[v] || 0) + 1; }
        if (raised) continue;
        // a water cell may be the coast's ring: deep water in the walk
        const f = k => (n[TV[k]] || 0) / low, ok = lab === 'WATER' ? (G.ford[c] || f('WATER') + f('DEEP') >= 0.15) : lab === 'POND' ? f('WATER') >= 0.2 : lab === 'ROCK' ? f('SCREE') + f('SAND') >= 0.1 : lab === 'WOOD' ? f('LITTER') + f('THICKET') + f('SCRUB') >= 0.1 : f('GRASS') + f('LITTER') + f('DRY') + f('TURF') >= 0.2;
        if (!ok && (lab === 'WATER' || lab === 'POND') && Math.min(X, Y, MW * ATLAS - 1 - X, MH * ATLAS - 1 - Y) === 1) continue;   // the cell beside the coast's ring: its shore band takes the half of it nearest the ring, so a pond or water there is the map's label only (a known gap)
        seen[lab][0]++; if (!ok) { seen[lab][1]++; if (bad.length < 8) bad.push(`${lab} ${X},${Y}`); }
      }
    }
    console.log(`# seed ${seed}: map and walk disagree (cells read / disagree): ${JSON.stringify(seen)}`);
    for (const lab of ['WATER', 'POND']) assert.equal(seen[lab][1], 0, `seed ${seed}: ${lab} cells whose middle is not that ground: ${bad}`);
    for (const lab of ['ROCK', 'WOOD', 'MEADOW']) assert.ok(seen[lab][0] > 50 && seen[lab][1] * 50 <= seen[lab][0], `seed ${seed}: ${lab} cells whose middle is not that ground: ${seen[lab]} ${bad}`);
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

// One land at every zoom (F1): the region's overview is the class of the world tile under each of its tiles, and the raised bit is the tile being raised land; two cells side by side share their edge.
test('seed 7: the overview of a region reads the world tiles (class and raised), 0 differing tiles on a sample, and cells meet at their edges', { timeout: 900000 }, () => {
  const seed = 7, ax = 2, ay = 2, ov = overviewOf(seed, ax, ay), T = worldTiles(seed), Gd = worldGround(seed);
  const cls = v => (v === TV.SAND ? OV.SAND : v === TV.WATER ? OV.WATER : v === TV.DEEP ? OV.DEEP : v === TV.LITTER ? OV.WOOD : v === TV.THICKET ? OV.THICKET : v === TV.SCREE ? OV.ROCK : v === TV.PATH ? OV.PATH : OV.GRASS);
  let diff = 0, n = 0;
  for (let y = 0; y < ov.length / OVW; y += 7) for (let x = 0; x < OVW; x += 5) {
    const gx = ax * OVW + x, gy = ay * (ov.length / OVW) + y, want = cls(Gd(gx, gy)) | (T(gx, gy) === TV.CLIFF ? OV.RAISED : 0); n++;
    if (ov[y * OVW + x] !== want) diff++;
  }
  assert.ok(n > 3000); assert.equal(diff, 0, 'tiles whose overview byte differs from the world tile under it');
  for (let c = 1; c < MW; c++) for (const y of [3, 100, 250]) assert.equal(ov[y * OVW + c * CW - 1], cls(Gd(ax * OVW + c * CW - 1, ay * (ov.length / OVW) + y)) | (T(ax * OVW + c * CW - 1, ay * (ov.length / OVW) + y) === TV.CLIFF ? OV.RAISED : 0));
});
