// The map, the reach view and the cell show the same land (owner, 2026-11-08: "i entered this cell, once inside, there's no stair to go to the terrace north. the map generation has serious
// problems. it's not consistent across its different zoom levels"). The world has one truth for each edge of a cell (open, stair, cliff, scree or bank, water, the map's end; src/world.mjs
// sideKind). Generator 7: the cell's terrain is the land itself, and a side the map calls open or a stair holds a way in while a cliff, water or the map's end holds none (tools/views-audit.mjs
// auditGen7, on the IR). The full sweep of seeds 1-200 is `node prototypes/exploration/tools/views-audit-run.mjs 1 200` (200 realms: an hour, in shards); the test runs seeds 1-3.
//   node --test prototypes/exploration/tests/views-agree.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { genWorld, softGround, bankEdges, genPlace, ALL_BIOMES } from "../src/world.mjs";
import { newTally, auditGenerated, setGenPlace, report } from "../tools/views-audit.mjs";

// The generator 7 audit of seeds 1-3 is views-agree-seed1, -seed2 and -seed3 (one file a seed, so the CI shards share the 9 minutes it took in one file).

test("the audit: the generated places of the frozen generators 2 and 5 agree with the map too, seeds 1-40", () => {
  setGenPlace((G, seed, c) => genPlace(G, seed, String(c)));
  for (const gen of [2, 5]) {
    const t = newTally();
    for (let seed = 1; seed <= 40; seed++) { const biome = ALL_BIOMES[seed % ALL_BIOMES.length], G = genWorld(seed, gen, biome); G.soft = softGround(G, seed); G.banks = bankEdges(G, seed); auditGenerated(G, seed, biome, t); }
    assert.equal(t.bad, 0, "\n" + report(t, "generator " + gen));
  }
});

test("a layout is one thing however it was got: built cold, from the cache, or again after the cache is cleared", () => {
  const p = makePage({ gen: 7, console: "silent" });
  p.run("newWorld(7)");
  const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c += 7) if (G.comp[c] && G.land[c] !== L.WATER) out.push(String(c)); return out; })()");
  const sig = (k) => p.run(`(() => { const l = layout('${k}'); return [l.tiles.join(), JSON.stringify(l.openings), JSON.stringify(l.feats), l.name, l.spawnPt.x + ',' + l.spawnPt.y, l.compId.join()].join('|'); })()`);
  const first = new Map(keys.map((k) => [k, sig(k)]));
  for (const k of keys.slice(0, 20)) assert.equal(p.run(`layout('${k}') === layout('${k}')`), true, "the cache hands out the one layout");
  p.run("layoutCache.clear()");
  for (const k of keys) assert.equal(sig(k), first.get(k), `cell ${k}: the layout built again is the first`);
});
