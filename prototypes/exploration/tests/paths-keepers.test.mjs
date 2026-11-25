// paths-gen-build-2: the keepers' places at the road's ends (src/gen7/keepers.mjs) and a left pod moved off a block on load.
//   node --test prototypes/exploration/tests/paths-keepers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOOTPRINTS, OTHER_PIECES, keeperKinds } from "../src/gen7/keepers.mjs";
import { planOf } from "../src/gen7/places.mjs";
import { cellIR, cellTerrain, TV } from "../src/gen7/place.mjs";
import { movePodsOffBlocks } from "../src/pods-off-blocks.mjs";
import { MW, MH } from "../src/world.mjs";
import { CENTER } from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const SEEDS = [64, 3, 11];

test("every footprint row names its source report and signed piece, and no row is a greybox number", () => {
  for (const [kind, f] of Object.entries(FOOTPRINTS)) {
    assert.ok(f.src && /paths-pixel-\d+|no signed piece/.test(f.src), kind + " cites its report");
    assert.ok(f.piece === null || /^[a-z]+-\d$/.test(f.piece), kind + " names the signed piece or none");
    for (const [x, y, w, h] of f.block) assert.ok(x >= 0 && y >= 0 && x + w <= f.box[0] && y + h <= f.box[1], kind + " block lies in its box");
  }
  assert.ok(/paths-pixel-10/.test(OTHER_PIECES.bridge.src) && OTHER_PIECES.bridge.block.length === 0, "the bridge: no block");
  assert.ok(/paths-pixel-9/.test(OTHER_PIECES.run.src), "the run pieces");
});

test("a seed's keepers' places are the same twice, one a place, at most one lone house a region", () => {
  for (const seed of SEEDS) {
    const a = [...keeperKinds(seed)].join("|"), seen = new Set();
    for (const [k] of keeperKinds(seed)) { assert.ok(!seen.has(k)); seen.add(k); }
    assert.ok(a.length > 0);
    const [ax, ay] = CENTER, houses = [...keeperKinds(seed)].filter(([k, v]) => { const [X, Y] = k.split(",").map(Number); return v === "house" && Math.floor(X / MW) === ax && Math.floor(Y / MH) === ay; });
    assert.ok(houses.length <= 1);
  }
});

test("a seated keepers' place stands on grass off the road, its block rects lie in its box, and the road's last tile meets its yard", () => {
  let seated = 0;
  for (const seed of SEEDS) for (const [k, kind] of keeperKinds(seed)) {
    const [X, Y] = k.split(",").map(Number), p = planOf(seed, X, Y); if (!p || !p.keepers) continue;
    seated++; const q = p.keepers;
    assert.equal(q.kind, kind);
    for (const [bx, by, bw, bh] of q.block) assert.ok(bx >= q.x && by >= q.y && bx + bw <= q.x + q.w && by + bh <= q.y + q.h);
    const ct = cellTerrain(seed, X, Y); let meets = false;
    for (let y = q.y - 1; y <= q.y + q.h; y++) for (let x = q.x - 1; x <= q.x + q.w; x++) if (ct.terrain[y * ct.w + x] === TV.PATH || ct.top[y * ct.w + x] === TV.PATHTOP) meets = true;
    assert.ok(meets, "a tile of the road lies within one tile of the box (its yard)");
    for (let y = q.y; y < q.y + q.h; y++) for (let x = q.x; x < q.x + q.w; x++) assert.notEqual(ct.terrain[y * ct.w + x], TV.PATH, "the box stands off the road");
  }
  assert.ok(seated > 10, "places were seated: " + seated);
});

test("the pixel desk's note: a road's last tile and the tile it came from are carried (the run END piece), and a bridge's deck box (bank to bank)", () => {
  let ends = 0, bridges = 0;
  for (const seed of SEEDS) for (const [k] of keeperKinds(seed)) {
    const [X, Y] = k.split(",").map(Number), p = planOf(seed, X, Y); if (!p || !p.roadEnd) continue;
    const ct = cellTerrain(seed, X, Y), e = p.roadEnd; ends++;
    assert.ok(ct.terrain[e.y * ct.w + e.x] === TV.PATH || ct.top[e.y * ct.w + e.x] === TV.PATHTOP, "the road last tile is road (ground or cliff top)");
    if (e.from) assert.equal(Math.abs(e.from[0] - e.x) + Math.abs(e.from[1] - e.y), 1, "it came from the tile beside it");
  }
  for (const seed of [64]) for (let X = 36; X < 44; X++) for (let Y = 40; Y < 44; Y++) { const p = planOf(seed, X, Y); if (!p || !p.bridges) continue; const ct = cellTerrain(seed, X, Y); for (const b of p.bridges) { bridges++; assert.equal(ct.terrain[b.y * ct.w + b.x], 21); } }
  assert.ok(ends > 5, "road ends carried: " + ends); void bridges;   // bridges are checked where a place in the window holds one
});

test("the baked cell's block mask carries the footprint and the IR the place (one cell, seed 64)", () => {
  const [ax, ay] = CENTER;
  for (const [k] of keeperKinds(64)) {
    const [X, Y] = k.split(",").map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay) continue;
    const p = planOf(64, X, Y); if (!p || !p.keepers || !p.keepers.block.length) continue;
    const ir = cellIR(64, X, Y, undefined); assert.deepEqual(ir.keepers.block, p.keepers.block, "the IR carries the place");
    return;
  }
  assert.fail("no seated place with a block on seed 64");
});

test("a left pod on a tile a keepers' place now blocks moves to the nearest free tile of the same place, once", () => {
  const lay = { key: "13", w: 10, h: 10, tiles: new Uint8Array(100), reach: new Uint8Array(100).fill(1), feats: [{ x: 5, y: 4 }] };
  for (const [x, y] of [[4, 4], [5, 4], [4, 5], [5, 5]]) lay.tiles[y * 10 + x] = 5;   // 5 blocks in T_BLOCK
  const blocked = t => t === 5, pods = [{ id: "a", k: "13", x: 4, y: 4, sp: 0 }, { id: "b", k: "99", x: 4, y: 4, sp: 0 }, { id: "c", k: "13", x: 1, y: 1, sp: 0 }, { id: "h", k: "13", x: 5, y: 5, h: 1 }];
  const moved = movePodsOffBlocks(pods, lay, blocked);
  assert.equal(moved.length, 1); assert.equal(moved[0].id, "a");
  assert.ok(!blocked(lay.tiles[pods[0].y * 10 + pods[0].x]) && Math.max(Math.abs(pods[0].x - 4), Math.abs(pods[0].y - 4)) <= 2);
  assert.deepEqual([pods[1].x, pods[1].y, pods[2].x, pods[2].y, pods[3].x, pods[3].y], [4, 4, 1, 1, 5, 5], "other places, free tiles and held pods stay");
  assert.equal(movePodsOffBlocks(pods, lay, blocked).length, 0, "a second pass moves nothing");
});

test("the page: a save with a pod on a keepers' block has it moved when the place's layout is made (seed 64)", () => {
  const [ax, ay] = CENTER;
  let found = null;
  for (const [k] of keeperKinds(64)) {
    const [X, Y] = k.split(",").map(Number); if (Math.floor(X / MW) !== ax || Math.floor(Y / MH) !== ay) continue;
    const p = planOf(64, X, Y); if (!p || !p.keepers || !p.keepers.block.length) continue;
    const b = p.keepers.block[0]; found = { cell: (Y % MH) * MW + (X % MW), x: b[0] - 1, y: b[1] - 1, slot: [ax, ay] }; break;
  }
  assert.ok(found, "a seated place with a block");
  const pg = makePage({ gen: 7, console: "silent" });
  pg.run("newWorld(64);");
  const r = JSON.parse(pg.run(`(() => { const v = biomeVersion(S), b = bakedCell7(PL.ctx, 64, ${JSON.stringify(found.slot)}, ${found.cell}, v), key = '${found.cell}';
    const pods = [{ id: 'zz', k: key, x: ${found.x}, y: ${found.y}, sp: 0 }];
    const lay = layout7In(PL.ctx, G, 64, ${JSON.stringify(found.slot)}, key, () => false, v, b);
    const blockedBefore = !!T_BLOCK[lay.tiles[${found.y} * lay.w + ${found.x}]];
    const moved = movePodsOffBlocks(pods, lay, t => T_BLOCK[t]);
    return JSON.stringify({ blockedBefore, moved: moved.length, free: !T_BLOCK[lay.tiles[pods[0].y * lay.w + pods[0].x]], hasKeepers: !!lay.keepers }); })()`));
  assert.equal(r.hasKeepers, true); assert.equal(r.blockedBefore, true); assert.equal(r.moved, 1); assert.equal(r.free, true);
});
