// Walk content B5, rule A: an edge that refuses a step looks closed, by its reason, and an open-looking edge never refuses. For a place in the open style (Windstep, 24 x 28, no wall of trees):
//   - the map's end is a dense thicket over the two outer rows (the set's own thicket ground, stamped as a patch), blocked;
//   - a cliff side has its two outer rows closed behind the world's cliff lip;
//   - an open side is walkable all along its two outer rows;
//   - water, scree, bank and stair sides are the world's bands and crossings (the views audit, tests/views-agree.test.mjs, sweeps every seed).
// The audit's own checks are held here on real cells, and shown to fire when the closed look is taken away.
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { sideKind, ALL_BIOMES, T_BLOCK, T } from "../src/world.mjs";
import { sideMismatches, placeCells, SIDES } from "../tools/views-audit.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));
const found = {};   // kind -> { seed, c, dir }
const page = makePage({ gen: 6, console: "silent" });
for (let seed = 1; seed <= 60 && Object.keys(found).length < 3; seed++) {
  page.run(`(() => { G = worldOf(${seed}, 6, ${JSON.stringify(ALL_BIOMES[seed % ALL_BIOMES.length])}); S.seed = ${seed}; S.gen = 6; layoutCache.clear(); startExpedition('weather', G.spawns[0]); S.exp.range = 99; })()`);
  const G = page.run("G");
  for (const c of placeCells(G)) {
    const lay = page.run(`layout('${c}')`);
    if (!lay.baked || lay.w !== 24) continue;
    for (const dir of SIDES) { const k = sideKind(G, c, dir); if ((k === "mapend" || k === "cliff" || k === "open") && !found[k]) found[k] = { seed, c, dir }; }
  }
}

for (const kind of ["mapend", "cliff", "open"]) {
  test(`${kind}: a side of a Windstep is drawn as the world says, and the audit holds it`, () => {
    const f = found[kind]; assert.ok(f, "a Windstep cell with a " + kind + " side among seeds 1-60");
    page.run(`(() => { G = worldOf(${f.seed}, 6, ${JSON.stringify(ALL_BIOMES[f.seed % ALL_BIOMES.length])}); S.seed = ${f.seed}; S.gen = 6; layoutCache.clear(); startExpedition('weather', G.spawns[0]); S.exp.range = 99; })()`);
    const G = page.run("G"), lay = page.run(`layout('${f.c}')`);
    assert.deepEqual(sideMismatches(G, lay, f.c, f.dir), [], `${kind} side of cell ${f.c} (seed ${f.seed})`);
    const along = f.dir === "up" || f.dir === "down" ? lay.w : lay.h, at = (k, d) => f.dir === "up" ? d * lay.w + k : f.dir === "down" ? (lay.h - 1 - d) * lay.w + k : f.dir === "left" ? k * lay.w + d : k * lay.w + lay.w - 1 - d;
    for (let d = 0; d < 2; d++) for (let k = 2; k < along - 2; k++) {
      const refuses = T_BLOCK[lay.tiles[at(k, d)]] !== 0;
      if (kind === "open") assert.equal(refuses, false, `an open side walks at depth ${d}, along ${k}`);
      else assert.equal(refuses, true, `a ${kind} side refuses at depth ${d}, along ${k}`);
    }
    if (kind === "mapend") for (let d = 0; d < 2; d++) for (let k = 0; k < along; k++) assert.ok(lay.closure.patches.some((p) => p.y * lay.w + p.x === at(k, d)), `the map's end is a thicket at depth ${d}, along ${k}`);
  });
}

test("the audit fires when the closed look is taken away: a map's end with no thicket, an open side that refuses", () => {
  const f = found.mapend, g = found.open; assert.ok(f && g);
  for (const [fx, fn, text] of [[f, (lay) => { lay.closure = { patches: [], id: "" }; }, /not drawn closed/], [g, (lay) => { const i = fx2(lay, g.dir); lay.tiles[i] = T.ROCK; }, /refuses a step/]]) {
    page.run(`(() => { G = worldOf(${fx.seed}, 6, ${JSON.stringify(ALL_BIOMES[fx.seed % ALL_BIOMES.length])}); S.seed = ${fx.seed}; S.gen = 6; layoutCache.clear(); startExpedition('weather', G.spawns[0]); S.exp.range = 99; })()`);
    const G = page.run("G"), lay = plain(page.run(`layout('${fx.c}')`)); lay.tiles = Array.from(lay.tiles); fn(lay);
    assert.match(sideMismatches(G, lay, fx.c, fx.dir).join(), text);
  }
  function fx2(lay, dir) { const k = 10; return dir === "up" ? k : dir === "down" ? (lay.h - 1) * lay.w + k : dir === "left" ? k * lay.w : k * lay.w + lay.w - 1; }
});
