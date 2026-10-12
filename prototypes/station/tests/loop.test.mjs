// The whole journey, headless: from a fresh world a walk's crate docks, a pod is identified and read, a founder is shaped and grown, a second pod comes, the founder opens and goes out
// with you, and the first dock at which it comes home gives the welcome sitting, begun at once so its wait runs while the second founder grows, two adults are crossed and the child is read;
// the crate opens when its wait is over. It calls only the rules, never the drawing, and asserts every price against the decided economy (research-economy.md §2, §5;
// research-loop.md §4, §5; the-cross.md; the-portrait.md §8). It runs in CI with the other Station tests.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { playJourney, MIN, WALK, WALK_MS } from "../tools/headless.mjs";
import * as S from "../src/state.mjs";
import * as T from "../src/sitting.mjs";
import * as L from "../src/library.mjs";

const J = playJourney({ seed: 4242 }), { P, a, b, child, podA, choices } = J, st = P.st, steps = P.steps;
const by = (re) => steps.filter((x) => re.test(x.name));
const one = (re) => { const r = by(re); assert.equal(r.length, 1, String(re) + " " + r.length); return r[0]; };

test("every step of the journey was accepted by the rules, and no stock went below zero", () => {
  assert.ok(steps.every((s) => s.ok), steps.filter((s) => !s.ok).map((s) => s.name).join(", "));
  for (const s of steps) assert.ok(s.stock.every((v) => v >= 0), s.name + " left a negative stock: " + s.stock);
});

test("a walk's crate docks once and pays the decided yield; the field spends its Energy; the pod lands in a well; no top-up under the decided prices", () => {
  const w = by(/^a walk \(S01\)/); assert.ok(w.length >= 3);
  for (const s of w) assert.deepEqual([s.e, s.d, s.s], [WALK.e, WALK.d, WALK.s], "the starter place's yield");
  assert.equal(st.accepted.length, P.walks, "each crate accepted exactly once"); assert.equal(new Set(st.accepted).size, st.accepted.length);
  const f = by(/^the field:/); assert.equal(f.length, Math.floor(P.walks / 2), "a beacon every other walk (a Call inside a place is free; only a map pin costs Energy)"); for (const s of f) assert.deepEqual([s.e, s.d, s.s], [-1, 0, 0], "a beacon, 1 Energy");
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
  assert.equal(a.shaped.length, 1); assert.equal(a.parents, null); assert.equal(a.read.length, J.chapters.length, "a founder opens fully known");
});

test("the second founder: 2 Energy and 4 Essence; a bud of twenty minutes; both open into bays fully known", () => {
  const g = one(/^grow the second founder/); assert.deepEqual([g.e, g.d, g.s], [-2, 0, -4]);
  for (const m of [a, b]) { assert.ok(S.mibiFullyRead(m, P.settings)); assert.ok(m.bay >= 0 && m.bay < S.BAYS); }
  assert.notEqual(a.bay, b.bay);
});

test("the welcome sitting comes at the first dock where a mibi comes home from a walk: the founder goes out with you, the dock records its habit and place, and the sitting is begun at once", () => {
  assert.ok(J.welcome && J.welcome.ok, "the welcome came at that dock"); assert.equal(J.held.source, "welcome"); assert.ok(st.welcomeGiven);
  assert.ok(by(/^a walk .* with /).length >= 1); assert.equal(a.outings, by(/^a walk .* with /).length, "one outing for every walk with you"); assert.ok(T.habitsOf(a).length >= 1 && S.frameFor(a).habits.includes(T.habitsOf(a)[0]), "a habit from the frame's list was recorded at the dock");
  assert.ok(S.placesOf(a).includes("wood"), "the place it entered with you");
  const walks = by(/^a walk \(S01\)( with)?/), firstWith = walks.findIndex((s) => / with /.test(s.name)); assert.ok(firstWith > 0, "the founder's first walk is after it opened");
  assert.equal(P.marks.welcome, steps.find((s) => /^the welcome sitting/.test(s.name)).t, "the welcome step is that walk's");
  const begin = one(/^begin the sitting/); assert.deepEqual([begin.e, begin.d, begin.s], [0, 0, 0], "the ceremony costs nothing"); assert.equal(begin.t, P.marks.welcome, "begun at once");
});

test("two adults of one species are crossed: 2 Energy and 4 Essence, kinship 0 for two founders, twenty minutes; the child has its real parents", () => {
  assert.ok(S.isAdult(st, a, P.settings) && S.isAdult(st, b, P.settings));
  const c = one(/^cross /); assert.deepEqual([c.e, c.d, c.s], [-2, 0, -4]);
  assert.deepEqual(child.parents.map((p) => p.id).sort(), [a.id, b.id].sort()); assert.equal(S.kinshipOf(st, a, b), 0, "wild founders");
  assert.ok(by(/^the bud grows \(20 min/).length >= 2);
});

test("the child is known only where its switch parents matched; reading the rest costs the decided prices", () => {
  const fc = S.forecastOf({ ...st, bud: null, mibis: st.mibis }, a, b, P.settings), known = S.childKnownChapters(S.frameFor(a), fc);
  const reads = by(/^read /).filter((s) => s.name.endsWith(" on " + child.name));
  assert.equal(reads.length, J.chapters.length - known.length, "a read for every chapter the child was not sure of");
  assert.ok(S.mibiFullyRead(child, P.settings), "after the reads the child is fully read");
  assert.ok(reads.length > 0, "the child had chapters left to read");
  for (const s of reads) { const ch = S.frameFor(child).chapters.find((c) => s.name === "read " + c.id + " on " + child.name); assert.ok(ch, s.name); assert.equal(s.d, -Math.ceil(ch.traits.length / 2) * S.PRICE.readTrait, "a chapter already read on a pod of the species is half price, rounded up"); }
});

test("the sitting's wait overlaps the rest of the journey: it started at the welcome, and only what was left of it was waited for; the crate opens to the mibi", () => {
  const wait = one(/^the crate fills/), full = T.sittingWaitMs(P.settings);
  assert.ok(wait.ms < full, "the wait ran while the cross and the reads happened"); assert.equal(wait.t - P.marks.welcome, full, "the crate opened exactly when its three hours were over");
  assert.equal(P.marks.crate, P.marks.welcome + full); assert.equal(st.sitting, null); assert.deepEqual(st.sittingCrates, []);
  assert.equal(a.portrait.state, "delivered"); assert.equal(a.portrait.pose, T.habitsOf(a)[0]); assert.equal(a.portrait.place, "wood"); assert.match(T.portraitBlock(st, a), /one sitting each/);
});

test("the library after the journey: a plate for the species, looks found, a face to choose", () => {
  const fg = L.fieldGuide(st, "S01", P.settings); assert.ok(fg.found > 0);
  assert.deepEqual(L.book(st, "S01", P.settings).faceChoices, [a.id]); assert.ok(L.makeFace(st, a).ok);
});

test("Probe tier 2 is bought at the first dock that can afford it, or not at all: the Energy the field spends decides", () => {
  const withProbe = by(/^Probe tier 2/); assert.ok(withProbe.length <= 1);
  if (withProbe.length) assert.deepEqual([withProbe[0].e, withProbe[0].d], [-12, -4]);
  const rich = playJourney({ seed: 4242, field: { calls: 0, beacons: 0, patches: 0 } }); const t2 = rich.P.steps.filter((s) => /^Probe tier 2/.test(s.name)); assert.equal(t2.length, 1, "with no field spending the Probe is affordable"); assert.deepEqual([t2[0].e, t2[0].d, t2[0].s], [-12, -4, 0]);
  assert.equal(rich.P.st.probe.tier, 2);
  const none = playJourney({ seed: 4242, probe: false, field: { calls: 0, beacons: 0, patches: 0 } }); assert.equal(none.P.steps.filter((s) => /^Probe tier 2/.test(s.name)).length, 0);
});

test("the save round-trips: JSON out and in, normalized, the same record", () => {
  S.normalize(st); const back = S.normalize(JSON.parse(JSON.stringify(st))); assert.deepEqual(back, st);
});

test("the clock only moves by the rules: the walks (fifteen minutes) and what was left of the waits", () => {
  const spent = steps.reduce((n, s) => n + s.ms, 0); assert.equal(spent, P.now - P.start);
  assert.equal(by(/^a walk/).length * WALK_MS + by(/^the (bud|crate) /).reduce((n, s) => n + s.ms, 0), spent);
});

test("the journey holds from other worlds: five seeds, every step accepted, the welcome and the crate both come", () => {
  for (const seed of [1, 2, 3, 99, 12345]) {
    const R = playJourney({ seed }); assert.ok(R.P.steps.every((x) => x.ok && x.stock.every((v) => v >= 0)), "seed " + seed + ": " + R.P.steps.filter((x) => !x.ok).map((x) => x.name));
    assert.equal(R.a.portrait.state, "delivered", "seed " + seed); assert.ok(R.welcome.ok, "seed " + seed);
  }
});
