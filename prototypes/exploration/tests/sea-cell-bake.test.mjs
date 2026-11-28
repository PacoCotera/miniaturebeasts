// render-window-1a: a wide-water cell has a baked ground from the one coast line (shoreValue), so the coast is the same tiles on both sides of a border; nothing draws it yet
//   node --test prototypes/exploration/tests/sea-cell-bake.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PLACES, makePage } from "./page-harness.mjs";
import { bakedCell, genWorld7, cellWorldXY } from "../src/gen7/world7.mjs";
import { cellTerrain, contextOf, TV } from "../src/gen7/place.mjs";
import { seaTerrain, isSeaCell } from "../src/gen7/sea.mjs";
import { MW, MH, L, softGround, bankEdges } from "../src/logic/world.mjs";
import { reachCellsIn, TIER } from "../src/logic/map-rules.mjs";

const ctx = PLACES.ctx, v = 3;
// seeds 13 and 7, and the seed of his 178 save (seed 20, region 2,2)
function borders(seed) {
  const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed});`); const slot = JSON.parse(p.run("JSON.stringify(G.slot)")), G = genWorld7(seed, slot), out = [];
  for (let c = 0; c < MW * MH; c++) {
    const [X, Y] = cellWorldXY(slot, c); if (!isSeaCell(seed, X, Y)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const cx = c % MW + dx, cy = ((c / MW) | 0) + dy; if (cx < 0 || cy < 0 || cx >= MW || cy >= MH) continue;
      const c2 = cy * MW + cx, [X2, Y2] = cellWorldXY(slot, c2); if (isSeaCell(seed, X2, Y2) || G.ford[c2]) continue;
      out.push({ slot, c, X, Y, X2, Y2 });
    }
  }
  return out;
}

for (const seed of [13, 7, 20]) {
  test(`seed ${seed}: along every coast border the tiles are the same terrain value (shallows stay shallows, deep stays deep) from both sides`, () => {
    const list = borders(seed); assert.ok(list.length >= 5, "the region has coast borders");
    let tiles = 0, shore = 0;
    for (const b of list) {
      const s = seaTerrain(seed, b.X, b.Y), l = cellTerrain(seed, b.X2, b.Y2);
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        const lx = s.x0 + x - l.x0, ly = s.y0 + y - l.y0; if (lx < 0 || ly < 0 || lx >= l.w || ly >= l.h) continue;
        const a = s.terrain[y * s.w + x], c = l.terrain[ly * l.w + lx]; tiles++; if (a === TV.WATER || a === TV.DEEP || a === TV.SAND) shore++;
        assert.equal(a, c, `seed ${seed} cells ${b.X},${b.Y} / ${b.X2},${b.Y2} tile ${s.x0 + x},${s.y0 + y}`);
      }
    }
    assert.ok(tiles > 500 && shore > 100, "tiles were compared, with sea and sand among them");
  });
}

test("a sea cell bakes: shallows along the line, deep beyond it, deep never beside land; a land cell's bake is the one it was", () => {
  const seed = 13, list = borders(seed), b = list[0], slot = b.slot, sea = bakedCell(ctx, seed, slot, b.c, v);
  const t = sea.ir.terrain, w = sea.ir.w, h = sea.ir.h;
  assert.ok(sea.place.ground.length > 0, "the ground is baked");
  assert.ok(sea.ir.props.length === 0 && sea.ir.spawns.length === 0, "the sea holds nothing");
  let deep = 0, shallow = 0, bad = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = t[y * w + x]; if (k === TV.WATER) shallow++;
    if (k !== TV.DEEP) continue; deep++;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const x2 = x + i, y2 = y + j; if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue; const n = t[y2 * w + x2]; if (n !== TV.WATER && n !== TV.DEEP) bad++; }
  }
  assert.ok(shallow > 0, "shallows lie along the line"); assert.equal(bad, 0, "deep meets water only");
  // a cell wholly beyond the line's reach is deep
  let someDeep = false; for (const bb of list) { const s = seaTerrain(seed, bb.X, bb.Y); if (s.terrain.some(k => k === TV.DEEP)) { someDeep = true; break; } }
  assert.ok(someDeep, "deep water follows the line beyond the shallows");
  const land = bakedCell(ctx, seed, slot, ((b.Y2 - slot[1] * MH) * MW + (b.X2 - slot[0] * MW)), v);
  assert.ok(land.ir.hearts && land.ir.terrain.length === cellTerrain(seed, b.X2, b.Y2).terrain.length && land.ir.terrain.every(k => k !== TV.DEEP || cellTerrain(seed, b.X2, b.Y2).terrain.includes(TV.DEEP)), "a land cell is baked through its own IR (cellIR), as before");
});

// the sea route changes no place he can walk: every cell a reach (the worker's list, the Station's package) can name, from every spawn and both tiers, with no partner and with a
// swimmer riding, keeps its own place (cellIR). A wide-water wade cell (water with land on two opposite sides, the Tuliko's crossing) is the case: it is wide water, and it stays a place.
const wadesNamed = {};
for (const seed of [13, 7, 20]) {
  test(`seed ${seed}: no reach list names a sea cell, with no partner or with a swimmer; the swimmer's wide-water wades keep their place`, () => {
    const p = makePage({ gen: 7, console: "silent" }); p.run(`newWorld(${seed});`); const slot = JSON.parse(p.run("JSON.stringify(G.slot)")), G = genWorld7(seed, slot), seen = new Set();
    // opts {} (no partner), and the opts the page passes with a swimmer riding (abOpts: sure + bank 'all', over the soft ground and banks the page attaches in worldOf)
    G.soft = softGround(G, seed); G.banks = bankEdges(G, seed);
    const wide = contextOf(seed).wideAt, wades = new Set(), keysOf = opts => { const out = new Set(); for (const s of G.spawns) for (const t of [1, 2]) for (const c of reachCellsIn(G, s, TIER[t].range, opts)) { seen.add(c); const [X, Y] = cellWorldXY(slot, c); if (isSeaCell(seed, X, Y)) out.add(c); else if (wide(X, Y)) wades.add(c); } return [...out]; };
    const sea = keysOf({});
    assert.ok(seen.size > 5, "reach cells were listed");
    assert.deepEqual(sea, [], "sea-routed keys in the reach with no partner");
    const swim = keysOf({ sure: true, bank: "all" });
    assert.deepEqual(swim, [], "sea-routed keys in a swimmer's reach");
    for (const c of wades) {
      assert.ok(G.soft.wade[c] === 1 && G.land[c] === L.WATER && !G.ford[c], `cell ${c}: a wide-water cell a reach names is a wade`);
      const b = bakedCell(ctx, seed, slot, c, v); assert.ok(b.ir.openings.length > 0, `cell ${c}: the wade is baked as its own place (cellIR: its ways in), not as sea`);
    }
    wadesNamed[seed] = wades.size;
    console.log(`seed ${seed}: wide-water cells a reach names (all wades, all on cellIR) ${wades.size} [${[...wades].join(",")}]`);
  });
}
test("the case is reached: a swimmer's reach names a wide-water wade on seed 13 or 20 (fix-2 found 1 and 2)", () => {
  assert.ok((wadesNamed[13] || 0) + (wadesNamed[20] || 0) > 0, `wades named: ${JSON.stringify(wadesNamed)}`);
});
