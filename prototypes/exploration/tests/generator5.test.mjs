// Generator 5, life by land (release 21b): a region spawns its land's kinds on their families' grounds; the home region keeps the three starters.
//   node --test prototypes/exploration/tests/generator5.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { genWorld, genWorld5, genLife, genLife5, HERD, MW, MH, L } from "../src/world.mjs";
import { regionKinds, SP_ORDER, STARTERS, BIOMES, BIOME_KINDS } from "../src/regions.mjs";

const SEEDS = Array.from({ length: 50 }, (_, i) => 1000 + i * 7919);
const worlds = new Map(), worldOf = (seed, biome) => { const k = seed + biome; if (!worlds.has(k)) worlds.set(k, genWorld5(seed, biome)); return worlds.get(k); };
const lifeOf = (seed, biome, n) => { const kinds = regionKinds({ n, biome }), G = worldOf(seed, biome); return { kinds, G, life: genLife(G, seed, kinds) }; };

test("generator 5's ground is generator 4's, tagged gen 5; genWorld(…, 5) gives it", () => {
  const a = genWorld(77, 5, "woods"), b = genWorld(77, 4, "woods");
  assert.equal(a.gen, 5); assert.equal(b.gen, 4);
  assert.deepEqual({ ...a, gen: 0 }, { ...b, gen: 0 });
});

test("for 50 seeds and all nine lands: a region other than the home holds only its land's kinds, the home region holds only the three starters", () => {
  for (const biome of BIOMES) for (const seed of SEEDS) {
    const away = lifeOf(seed, biome, 2), land = new Set(BIOME_KINDS[biome].map((id) => SP_ORDER.indexOf(id)));
    assert.ok(land.size >= 1 && land.size <= 3, `${biome} has one to three kinds`);
    for (const w of away.life.cr) assert.ok(land.has(w.sp), `${biome} seed ${seed}: sp ${w.sp} is not a kind of the land`);
    for (const p of away.life.pods) assert.ok(land.has(p.sp), `${biome} seed ${seed}: a pod of sp ${p.sp}`);
    const home = lifeOf(seed, biome, 1);
    for (const w of home.life.cr) assert.ok([0, 1, 2].includes(w.sp), `home on ${biome}: sp ${w.sp}`);
    assert.deepEqual([...new Set(home.life.cr.map((w) => w.sp))].sort(), [0, 1, 2], `the home region holds all three starters (${biome} ${seed})`);
  }
});

test("every kind of a region has at least two herds of three or more on the reachable part", () => {
  for (const biome of BIOMES) for (const seed of SEEDS.slice(0, 20)) for (const n of [1, 2]) {
    const { kinds, G, life } = lifeOf(seed, biome, n);
    for (const k of kinds) {
      const per = new Map(); for (const w of life.cr) if (w.sp === k.sp && !w.cv && G.comp[w.c] === 1) per.set(w.c, (per.get(w.c) ?? 0) + 1);
      assert.ok([...per.values()].filter((v) => v >= HERD.SIZE).length >= HERD.FLOOR, `${biome} ${seed} region ${n}: ${k.id} has under ${HERD.FLOOR} herds`);
      assert.equal(life.pods.filter((p) => p.sp === k.sp && p.id !== "cv").length, HERD.PODS, `${k.id} has ${HERD.PODS} buried pods`);
    }
  }
});

test("the same seed, land and region number give the same life, byte for byte", () => {
  for (const [seed, biome, n] of [[11, "mixed", 1], [4242, "tarns", 3], [90210, "meres", 2]]) {
    const a = lifeOf(seed, biome, n).life, b = { ...lifeOf(seed, biome, n) }.life;
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.equal(JSON.stringify(genLife(genWorld5(seed, biome), seed, regionKinds({ n, biome }))), JSON.stringify(a));
  }
});

test("adding a kind to a land in a test registry moves no other kind's herds", () => {
  const seed = 31337, biome = "downs", G = worldOf(seed, biome), kinds = regionKinds({ n: 2, biome });
  const extra = { id: "S99", sp: 19, hab: [L.MEADOW, L.WOOD] };
  const a = genLife5(G, seed, kinds), b = genLife5(G, seed, [...kinds, extra]);
  for (const k of kinds) {
    const pick = (life) => JSON.stringify(life.cr.filter((w) => w.sp === k.sp).map((w) => [w.sp, w.c, w.cv, w.b]));
    assert.equal(pick(a), pick(b), `${k.id}'s creatures did not move`);
    const pods = (life) => JSON.stringify(life.pods.filter((p) => p.sp === k.sp));
    assert.equal(pods(a), pods(b), `${k.id}'s pods did not move`);
  }
});

test("Tuikis keeps its nest wherever it is the home region's kind: the cave creatures at the gate and the glow cells", () => {
  const { G, life } = lifeOf(5, "mixed", 1);
  assert.ok(life.cr.some((w) => w.sp === 1 && w.cv === 1), "the nest under the cliff");
  assert.equal(life.pods.find((p) => p.id === "cv").sp, 0, "the cave pod takes the region's first kind, Loika at home");
  for (const c of G.glow) assert.ok(life.cr.filter((w) => w.sp === 1 && w.c === c).length >= 3, "a glow cell holds three Tuikis");
});

test("Tuikis keeps its nest wherever it spawns: in a Cliffs region too, the glow cells hold three of them and the gate holds the cave creatures", () => {
  let nests = 0;
  for (const seed of SEEDS.slice(0, 20)) {
    const { G, life, kinds } = lifeOf(seed, "fells", 2);
    assert.ok(kinds.some((k) => k.sp === 1 && k.nest), "Tuikis in a Cliffs region is the nest's kind");
    for (const c of G.glow) assert.ok(life.cr.filter((w) => w.sp === 1 && w.c === c).length >= 3, "a glow cell holds three Tuikis");
    if (G.gate >= 0) { assert.ok(life.cr.some((w) => w.sp === 1 && w.cv === 1), "the nest under the cliff"); nests++; }
  }
  assert.ok(nests > 0, "some Cliffs world has its gate");
});

test("a kind whose ground has no walkable cell on the reachable part takes every walkable cell that is not water", () => {
  const seed = 8, G = worldOf(seed, "mixed"), none = { id: "S98", sp: 18, hab: [L.CLIFF] };
  const life = genLife5(G, seed, [none]);
  assert.ok(life.cr.length > 0, "it still lives somewhere");
  for (const w of life.cr.filter((x) => !x.cv)) assert.ok(G.land[w.c] !== L.WATER && G.land[w.c] !== L.CLIFF, "never on water");
});

test("the species list: the three starters keep their places and the Station's list is this one", async () => {
  assert.deepEqual(STARTERS, ["S01", "S03", "S02"]); assert.deepEqual(SP_ORDER.slice(0, 3), STARTERS);
  const { SP_INDEX } = await import("../../station/src/genome.mjs");
  assert.deepEqual(SP_ORDER, SP_INDEX);
  assert.equal(MW * MH, 320);
});
