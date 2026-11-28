// The lab bench's rules on the real genetics engine (lab-greybox-1): the world, an expedition, the bench, the cross preview and a hatch that proves a parent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newGame, expedition, questionsFor, startSample, tickBench, previewCross, startCross, openBud, squareOf, goal, propagate, START, COST } from "../src/rules.mjs";
import { countOn } from "../src/engine.mjs";

const frame = JSON.parse(readFileSync(new URL("../../species/frames/species-S01.json", import.meta.url), "utf8"));

test("the world: four wild Loikas, one hides pale, at most one shows it; one home Loika", () => {
  for (const seed of ["a", "b", "c", "d", "e"]) {
    const st = newGame(frame, seed);
    assert.equal(st.wildIds.length, 4);
    const m = st.wildIds.map((id) => countOn(st.recs[id].genome, "M"));
    assert.ok(m.some((n) => n === 1) && m.filter((n) => n === 2).length <= 1);
    assert.equal(st.adults.length, 1);
    assert.deepEqual(st.supplies, START);
  }
});

test("an expedition meets someone, sees its looks, pays supplies and can hand over samples; a sample answers one question and inks", () => {
  const st = newGame(frame, "exp");
  let rep = null;
  for (let land = 0, i = 0; i < 6 && !(st.pouch.length); i++, land = 1 - land) rep = expedition(frame, st, land);
  assert.ok(rep.met.length >= 1);
  assert.ok(st.supplies.E > START.E && st.supplies.Es > START.Es);
  assert.ok(st.pouch.length >= 1, "six expeditions gave at least one sample");
  const s = st.pouch[0], qs = questionsFor(st, s.wild);
  assert.ok(qs.length >= 1);
  const T = qs[0], before = squareOf(st, s.wild, T);
  assert.notEqual(before.st, "known");
  assert.equal(startSample(st, s.id, T, 0, 1000).ok, true);
  assert.equal(startSample(st, "x", T, 0, 1000).ok, false, "one at a time");
  assert.equal(tickBench(frame, st, 500), null, "30 minutes (here 1 s) not over");
  assert.deepEqual(tickBench(frame, st, 1000), { wild: s.wild, T });
  assert.equal(squareOf(st, s.wild, T).st, "known");
  assert.ok(st.why[s.wild + ":" + T].t.length > 0);
});

// Two home Loikas that each hide one pale copy (look: not pale), crossed; a pale child proves both parents hide pale.
function carriers() {
  const st = newGame(frame, "carry");
  const home = st.recs[st.adults[0]];
  home.genome.loci["appearance.marking-switch"] = ["on", "off"];
  st.K[home.id].M = [0, 1];
  const b = JSON.parse(JSON.stringify(home)); b.id = st.nextId++; b.name = "Wren"; b.genome.loci["appearance.marking-switch"] = ["off", "on"];
  st.recs[b.id] = b; st.K[b.id] = { M: [0, 1], C: [0, 1], E: true, D: true, F: true, shown: true, habits: [] }; st.adults.push(b.id);
  return { st, a: home.id, b: b.id };
}

test("the cross preview: a pale child proves both parents hide pale; two unproven parents give under 1 in 4 pale, and a plain child still tells something", () => {
  const { st, a, b } = carriers();
  const p = previewCross(frame, st, a, b);
  assert.deepEqual(p.yes.map((x) => x.id).sort(), [a, b].sort());
  assert.ok(p.yes.every((x) => x.word === "hides pale"));
  assert.ok(p.pPale < 0.25, "weighed over what each Markings may still be: below 1 in 4");
  assert.ok(Math.abs(p.pPale + p.pPlain - 1) < 1e-9);
  assert.equal(p.no.length, 0);
  assert.deepEqual(p.less.sort(), [a, b].sort(), "not 'nothing new': both are less likely to hide pale");
  assert.equal(p.bothPale, false);
});

test("a cross costs 2 Energy + 4 Essence, fills the incubator, and a pale hatch inks both parents with the reason", () => {
  const { st, a, b } = carriers();
  st.supplies = { E: 2, Es: 4 };
  const r = startCross(frame, st, a, b, 0, 100);
  assert.equal(r.ok, true);
  assert.deepEqual(st.supplies, { E: 2 - COST.E, Es: 4 - COST.Es });
  assert.equal(startCross(frame, st, a, b, 0, 100).ok, false, "one bud at a time");
  assert.equal(openBud(frame, st, 50).ok, false, "not ready");
  st.bud.genome.loci["appearance.marking-switch"] = ["on", "on"];   // the draw: this child is the one in four that is pale
  const o = openBud(frame, st, 100);
  assert.equal(o.ok, true);
  assert.deepEqual(st.K[a].M, [1]);
  assert.deepEqual(st.K[b].M, [1]);
  assert.match(st.why[a + ":M"].t, /^Hides pale: .*came out pale\.$/);
  assert.equal(squareOf(st, o.child, "M").word, "pale");
  assert.equal(goal(frame, st).got, 1, "one pale parent of two");
});

test("the kin logic never leaves a child's looks contradicting its parents", () => {
  const { st, a, b } = carriers();
  st.supplies = { E: 9, Es: 9 };
  for (let i = 0; i < 4; i++) { st.bud = null; startCross(frame, st, a, b, 0, 0); openBud(frame, st, 0); }
  const before = JSON.stringify(st.K);
  propagate(frame, st);
  assert.equal(JSON.stringify(st.K), before, "propagate is already at its fixed point");
  for (const id of st.adults) assert.ok(st.K[id].M.includes(countOn(st.recs[id].genome, "M")), "the truth is never ruled out");
});
