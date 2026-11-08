// Generator 6 (the four places reach play): the same world map as generator 5; each land cell's template, mirror, heart kind, finds and name are a pure function of the seed.
//   node --test prototypes/exploration/tests/world6-vectors.test.mjs         (UPDATE_VECTORS=1 rewrites world6-vectors.json)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { genWorld, genWorld5, templateFor, TEMPLATES6, L, MW, MH } from "../src/world.mjs";
import { fillPlace6, HEART_KINDS6 } from "../src/fill6.mjs";
import { readPlace } from "../../places/src/format/read.mjs";

const baked = (id) => readPlace(new Uint8Array(readFileSync(new URL(`../../places/baked/${id}.mbplace`, import.meta.url))));
const FILE = new URL("./world6-vectors.json", import.meta.url);
const SEEDS = [7, 13, 42];

function vectors(seed) {
  const G = genWorld(seed, 6), out = {};
  for (let c = 0; c < MW * MH; c++) {
    const t = templateFor(G, seed, c); if (!t) continue;
    const f = fillPlace6(G, seed, c, baked(t.id));
    out[c] = [t.id, f.heart.kind, f.heart.second ? 1 : 0, f.feats.map((e) => e.id + "@" + e.x + "," + e.y).join(" "), f.podSlots.map((s) => (s.on ? "+" : "-") + s.x + "," + s.y).join(" "), f.name];
  }
  return out;
}

if (process.env.UPDATE_VECTORS) writeFileSync(FILE, JSON.stringify(Object.fromEntries(SEEDS.map((s) => [s, vectors(s)]))) + "\n");

test("generator 6's world is generator 5's world, tagged 6", () => {
  for (const seed of SEEDS) {
    const a = genWorld5(seed), b = genWorld(seed, 6);
    assert.equal(b.gen, 6);
    assert.deepEqual({ ...b, gen: 5 }, a);
  }
});

test("a land cell gets its land type's template; the mirror is half the cells; water and cliff get none", () => {
  let mirrored = 0, total = 0;
  for (const seed of SEEDS) {
    const G = genWorld(seed, 6);
    for (let c = 0; c < MW * MH; c++) {
      const t = templateFor(G, seed, c);
      if (!TEMPLATES6[G.land[c]]) { assert.equal(t, null); continue; }
      assert.equal(t.base, TEMPLATES6[G.land[c]]); assert.equal(t.id, t.mirror ? t.base + "~x" : t.base);
      total++; if (t.mirror) mirrored++;
    }
  }
  assert.ok(mirrored > total * 0.35 && mirrored < total * 0.65, mirrored + " of " + total);
  assert.ok(new Set([L.POND, L.ROCK, L.WOOD, L.MEADOW].map((l) => TEMPLATES6[l])).size === 4);
});

test("template, mirror, heart kind, finds and name per cell for seeds 7, 13 and 42 match the vectors", () => {
  const want = JSON.parse(readFileSync(FILE, "utf8"));
  for (const seed of SEEDS) assert.deepEqual(vectors(seed), want[seed], "seed " + seed);
});

test("every heart kind is one the page plays; a stone heart carries its stone; names rotate with no repeat while one is free", () => {
  for (const seed of SEEDS) {
    const G = genWorld(seed, 6), names = {};
    for (let c = 0; c < MW * MH; c++) {
      const t = templateFor(G, seed, c); if (!t) continue;
      const p = baked(t.id), f = fillPlace6(G, seed, c, p);
      assert.ok(HEART_KINDS6.includes(f.heart.kind)); assert.ok(p.heart.kinds.includes(f.heart.kind) || f.heart.kind === "spring");
      assert.equal(f.feats.some((e) => e.id === "kh" && e.x === p.heart.x && e.y === p.heart.y), f.heart.kind === "stone");
      assert.ok(p.names.includes(f.name));
      (names[t.base] ||= []).push(f.name);
    }
    for (const list of Object.values(names)) for (let i = 0; i + 3 <= list.length; i += 1) assert.equal(new Set(list.slice(i, i + 3)).size, 3, "three in a row differ: " + list.slice(i, i + 3));
  }
});

test("the first find slot of every template is certain, and generator 6 never gives a find on the heart", () => {
  for (const seed of SEEDS) {
    const G = genWorld(seed, 6);
    for (let c = 0; c < MW * MH; c++) {
      const t = templateFor(G, seed, c); if (!t) continue;
      const p = baked(t.id), f = fillPlace6(G, seed, c, p);
      assert.ok(f.podSlots.length > 0 && f.podSlots[0].on, "a pod slot is on first");
      for (const e of f.feats) if (e.id !== "kh") assert.ok(!(e.x === p.heart.x && e.y === p.heart.y));
    }
  }
});
