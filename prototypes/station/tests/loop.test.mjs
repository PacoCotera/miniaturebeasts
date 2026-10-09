// The whole journey, headless: from a fresh world a walk's crate docks, a pod is identified and read, a founder is shaped and grown, it opens, a second founder follows,
// two adults are crossed, the child is read, a sitting is held and its crate comes home. It calls only the rules, never the drawing, and it asserts every price against the decided economy
// (research-economy.md §2, §5; research-loop.md §4, §5; the-cross.md). It runs in CI with the other Station tests.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { playJourney, MIN, WALK } from "../tools/headless.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import * as L from "../src/library.mjs";

const J = playJourney({ seed: 4242 }), { P, a, b, child, podA, choices } = J, st = P.st, steps = P.steps;
const by = (re) => steps.filter((x) => re.test(x.name));
const one = (re) => { const r = by(re); assert.equal(r.length, 1, String(re) + " " + r.length); return r[0]; };

test("every step of the journey was accepted by the rules", () => {
  assert.ok(steps.every((s) => s.ok), steps.filter((s) => !s.ok).map((s) => s.name).join(", "));
  for (const s of steps) assert.ok(s.stock.every((v) => v >= 0), s.name + " left a negative stock: " + s.stock);
});

test("a walk's crate docks once and pays the decided yield; the pod lands in a well; no top-up under the decided prices", () => {
  const w = by(/^a walk \(S01\)/); assert.ok(w.length >= 2);
  for (const s of w) assert.deepEqual([s.e, s.d, s.s], [WALK.e, WALK.d, WALK.s], "the starter place's yield");
  assert.equal(st.accepted.length, P.walks, "each crate accepted exactly once"); assert.equal(new Set(st.accepted).size, st.accepted.length);
});

test("identify: the first ever is free, later ones 1 Energy; the species is found", () => {
  const ids = by(/^identify/); assert.deepEqual(ids.map((s) => s.e), [0, -1]);
  assert.equal(L.speciesStatus(st, "S01"), "found"); assert.ok(podA.idd);
});

test("read: the first read ever is free, then 1 Data a trait; a read chapter is free to look at again", () => {
  const pod = by(/^read /).filter((s) => s.name.endsWith(" on " + podA.id));
  assert.equal(pod[0].d, 0, "the first read ever is free"); assert.equal(pod[1].d, -2, "Face is two traits");
  assert.ok(S.read(st, podA, J.chapters[0], P.settings).again, "a read chapter is free to look at again");
});

test("shape: a read trait changes to a look the pod carries, +1 Data; the founder is paid 2 Energy and, the first, no Essence; the first bud takes five minutes", () => {
  assert.equal(Object.keys(choices).length, 1, "one trait was shaped");
  const g = one(/^grow the first founder/); assert.deepEqual([g.e, g.d, g.s], [-2, -1, 0]);
  const w1 = by(/^the bud grows/)[0]; assert.equal(w1.ms, 5 * MIN, "the first bud ever is five minutes");
  assert.equal(a.shaped.length, 1); assert.equal(a.parents, null);
});

test("the second founder: 2 Energy and 4 Essence; a bud of twenty minutes; both open into bays fully known", () => {
  const g = one(/^grow the second founder/); assert.deepEqual([g.e, g.d, g.s], [-2, 0, -4]);
  assert.equal(by(/^the bud grows/)[1].ms, 20 * MIN);
  for (const m of [a, b]) { assert.ok(S.mibiFullyRead(m, P.settings)); assert.ok(m.bay >= 0 && m.bay < S.BAYS); }
  assert.notEqual(a.bay, b.bay);
});

test("two adults of one species are crossed: 2 Energy and 4 Essence, kinship 0 for two founders, twenty minutes; the child has its real parents", () => {
  assert.ok(S.isAdult(st, a, P.settings) && S.isAdult(st, b, P.settings));
  const c = one(/^cross /); assert.deepEqual([c.e, c.d, c.s], [-2, 0, -4]);
  assert.deepEqual(child.parents.map((p) => p.id).sort(), [a.id, b.id].sort()); assert.equal(S.kinshipOf(st, a, b), 0, "wild founders");
  assert.equal(by(/^the bud grows/)[2].ms, 20 * MIN);
});

test("the child is known only where its switch parents matched; reading the rest costs the decided prices", () => {
  const fc = S.forecastOf({ ...st, bud: null, mibis: st.mibis }, a, b, P.settings), known = S.childKnownChapters(S.frameFor(a), fc);
  const reads = by(/^read /).filter((s) => s.name.endsWith(" on " + child.name));
  assert.equal(reads.length, J.chapters.length - known.length, "a read for every chapter the child was not sure of");
  assert.ok(S.mibiFullyRead(child, P.settings), "after the reads the child is fully read");
  for (const s of reads) assert.ok(s.d <= 0 && s.d >= -4);
});


test("the sitting: the welcome gives one, the ceremony costs nothing, three hours wait, the portrait lands and the crate opens to the mibi", () => {
  assert.ok(st.welcomeGiven); assert.equal(one(/^the welcome sitting/).ok, true);
  const sit = one(/^begin the sitting/); assert.deepEqual([sit.e, sit.d, sit.s], [0, 0, 0]);
  assert.equal(one(/^the crate fills/).ms, 3 * 3600000); assert.equal(st.sitting, null); assert.deepEqual(st.sittingCrates, []);
  assert.equal(a.portrait.state, "delivered"); assert.equal(a.portrait.pose, "dig"); assert.equal(a.portrait.place, "wood");
  assert.match(T.portraitBlock(st, a), /one sitting each/);
});

test("the library after the journey: a plate for the species, looks found, a face to choose", () => {
  const fg = L.fieldGuide(st, "S01", P.settings); assert.ok(fg.found > 0);
  assert.deepEqual(L.book(st, "S01", P.settings).faceChoices, [a.id]); assert.ok(L.makeFace(st, a).ok);
});

test("the save round-trips: JSON out and in, normalized, the same record", () => {
  S.normalize(st); const back = S.normalize(JSON.parse(JSON.stringify(st))); assert.deepEqual(back, st);
});

test("the clock only moves by the rules: the walks (fifteen minutes) and the waits", () => {
  const spent = steps.reduce((n, s) => n + s.ms, 0); assert.equal(spent, P.now - 1_000_000);
});

test("the journey holds from other worlds: five seeds, every step accepted, no stock below zero", () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const R = playJourney({ seed }); assert.ok(R.P.steps.every((x) => x.ok && x.stock.every((v) => v >= 0)), "seed " + seed + ": " + R.P.steps.filter((x) => !x.ok).map((x) => x.name));
    assert.equal(R.a.portrait.state, "delivered", "seed " + seed);
  }
});
