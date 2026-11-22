// G2: the grey pairing screen's logic runs on the real engine: a group, an aim, a pair's view (four young, the green, vigour), a hatch that joins the group, ten generations.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setFrames } from "../src/genome.mjs";
import * as G from "../src/g2.mjs";

const dir = path.join(import.meta.dirname, "../../species/frames");
const frame = JSON.parse(readFileSync(path.join(dir, "species-S01.json"), "utf8"));
setFrames([frame]);

// a pair the screen would let through: the first two who are not direct kin
const firstPair = (g) => { for (const a of g.group) for (const b of g.group) if (a.id < b.id && !G.refusal(g, a, b)) return [a, b]; return null; };
// the newest two who may pair
const newestPair = (g) => { const ms = [...g.group].reverse(); for (const a of ms) for (const b of ms) if (a.id !== b.id && !G.refusal(g, a, b)) return [a, b]; return null; };

test("a new game: six wild Loikas, an aim of one set look and two scale ends", () => {
  const g = G.newGame(frame, "t1");
  assert.equal(g.group.length, G.GROUP_SIZE);
  assert.ok(g.group.every((m) => m.parents.length === 0 && m.gen === 0));
  assert.equal(g.aim.scales.length, 2);
  assert.equal(G.aimWords(frame, g.aim).length, 3);
  assert.deepEqual([g.hatches, g.generation], [0, 0]);
});

test("a pair's view: every trait has its green; a set's fractions only where the forecast keeps them; vigour is full for strangers", () => {
  const g = G.newGame(frame, "t1"), [a, b] = firstPair(g), v = G.pairView(g, a, b);
  assert.ok(v.traits.length >= 5);
  for (const t of v.traits) {
    if (t.shape === "set") { assert.ok(t.looks.some((l) => l.green), t.id); for (const l of t.looks) assert.ok(l.fraction === null || (l.fraction >= 0 && l.fraction <= 1)); }
    else { assert.ok(t.green[0] <= t.green[1] && t.green[1] < t.steps, t.id); assert.equal(t.steps, 7); }
  }
  assert.equal(v.vigour, 1);
  assert.equal(G.fourYoung(g, a, b).length, G.YOUNG_SHOWN);
});

test("a hatch is one young at once: it joins the group, the counters move, the pick clears", () => {
  let g = G.newGame(frame, "t1");
  const [a, b] = firstPair(g);
  g = G.pick(G.pick(g, a.id), b.id);
  const h = G.hatch(g);
  assert.equal(h.group.length, g.group.length + 1);
  assert.deepEqual([h.hatches, h.generation, h.picked.length], [1, 1, 0]);
  const y = h.group.at(-1);
  assert.deepEqual(y.parents, [a.id, b.id]);
  assert.ok(h.last.vigour > 0 && h.last.vigour <= 1);
});

test("direct kin is refused by the engine: a parent and its young cannot pair", () => {
  let g = G.newGame(frame, "t1");
  const [a, b] = firstPair(g);
  g = G.hatch(G.pick(G.pick(g, a.id), b.id));
  const y = g.group.at(-1);
  assert.match(G.refusal(g, a, y), /direct kin/);
  assert.match(G.pairView(g, a, y).refusal, /direct kin/);
});

test("kin costs vigour: the young of two close relatives is below full", () => {
  let g = G.newGame(frame, "t2"), seen = false;
  for (let i = 0; i < 14 && !seen; i++) {
    const [a, b] = newestPair(g);
    g = G.hatch(G.pick(G.pick(g, a.id), b.id));
    if (g.last.vigour < 1) seen = true;
  }
  assert.ok(seen, "within fourteen hatches two relatives paired and the young's vigour fell");
});

test("round 2: one held, the partner changes; each parent's shown step; the aim marked; the hatch is one of the four; looks in words", () => {
  let g = G.hold(G.newGame(frame, "t1"), "L1");
  assert.equal(g.picked[0], "L1"); assert.equal(g.picked.length, 2);
  const seen = new Set(); for (let i = 0; i < 5; i++) { g = G.nextPartner(g, 1); seen.add(g.picked[1]); assert.notEqual(g.picked[1], "L1"); }
  assert.equal(seen.size, 5);
  const [a, b] = G.pickedMembers(g), v = G.pairView(g, a, b);
  if (!v.refusal) {
    for (const t of v.traits.filter((x) => x.shape === "scale")) assert.ok(Number.isInteger(t.a) && Number.isInteger(t.b));
    assert.equal(v.traits.filter((t) => t.shape === "scale" && t.aimStep !== null).length, 2);
    assert.equal(v.traits.flatMap((t) => t.looks ?? []).filter((l) => l.aim).length, 1);
    const four = G.fourYoung(g, a, b), h = G.hatch(g), y = h.group.at(-1);
    assert.ok(four.some((f) => JSON.stringify(f.genome) === JSON.stringify(y.genome)), "the hatch is one of the four");
  }
  assert.ok(G.looksOf(g, a).length >= 5);
});

test("ten generations can be played: the newest two pair ten times, every step on the engine", () => {
  let g = G.newGame(frame, "t3");
  for (let i = 0; i < 10; i++) {
    const p = newestPair(g); assert.ok(p, "a pair is always possible");
    g = G.hatch(G.pick(G.pick(g, p[0].id), p[1].id));
    assert.ok(g.last.young, g.last.refused);
  }
  assert.equal(g.hatches, 10);
  assert.ok(g.generation >= 2);
});
