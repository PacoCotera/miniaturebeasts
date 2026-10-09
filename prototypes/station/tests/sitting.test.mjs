// The sitting (M6): the held right, the research moments that earn it, the welcome sitting, the ceremony, the crate and its timer, the portrait that stays.
// Every transition and every refusal. Nothing here draws.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import * as T from "../src/sitting.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", sittingWait: "hours" };
const H = 3600000, T0 = 1000000;
const world = (n = 2) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); S.seedAdults(st, "S01", 7, n, settings); return st; };
const walked = (st, m, habit = "dig", place = "wood") => { T.recordHabit(st, m, habit); T.recordWalk(st, m, place); return m; };
const money = (st) => [st.e, st.d, st.s];

test("habits watched and places walked are recorded once; a mibi's places are where its pod came from and every place it walked to", () => {
  const st = world(1), m = st.mibis[0];
  assert.deepEqual(T.habitsOf(m), []); assert.deepEqual(T.placesOf(m), ["meadow"], "its pod's place");
  assert.ok(T.recordHabit(st, m, "dig").ok); assert.ok(T.recordHabit(st, m, "dig").again); assert.ok(T.recordWalk(st, m, "wood").ok); assert.ok(T.recordWalk(st, m, "wood").again);
  assert.deepEqual(T.habitsOf(m), ["dig"]); assert.deepEqual(T.placesOf(m), ["meadow", "wood"]);
  assert.ok(!T.recordHabit(st, null, "x").ok && !T.recordHabit(st, m, "").ok && !T.recordWalk(st, m, "").ok);
});

test("one slot, one frame: a sitting is held, and a second earned meanwhile is not given; a moment pays once", () => {
  const st = world(1);
  const a = T.grantSitting(st, "moment", "guide:S01", T0); assert.ok(a.ok); assert.equal(st.sitting.source, "moment"); assert.equal(st.moments["guide:S01"], T0);
  assert.ok(T.grantSitting(st, "moment", "guide:S01", T0 + 1).again, "the same moment pays once");
  const b = T.grantSitting(st, "moment", "guide:S02", T0 + 2); assert.ok(!b.ok && b.lost && /held/.test(b.msg), "earned while one is held: not given"); assert.equal(st.sitting.key, "guide:S01");
  assert.ok(st.moments["guide:S02"], "the moment passed and is spent, so the warning matters"); assert.ok(T.grantSitting(st, "moment", "guide:S02", T0 + 3).again);
  assert.deepEqual(money(st), [0, 0, 0], "a sitting costs and pays no material");
  const d = world(1); assert.ok(T.devGrantSitting(d, T0).ok); assert.deepEqual(d.moments, {}, "the developer's sitting leaves the ledger alone"); assert.ok(!T.devGrantSitting(d, T0).ok);
});

test("the research moments: a guide filled, a sealed chapter read, a deep line; each found when true and paid once", () => {
  const st = world(1); st.knownIds.push("S01"); const fr = frameOf("S01");
  assert.deepEqual(T.collectMoments(st, settings, T0), [], "nothing earned yet");
  for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, "S01", t.id, L.possibleLooks(fr, t));
  const r = T.collectMoments(st, settings, T0); assert.deepEqual(r.map((x) => [x.key, x.ok]), [["guide:S01", true]]); assert.equal(st.sitting.key, "guide:S01");
  assert.deepEqual(T.collectMoments(st, settings, T0 + 1), [], "paid once");
  // a sealed chapter read
  const id = ["S02", "S09", "S11", "S15", "S16"].find((s) => frameOf(s).chapters.some((c) => c.sealed)), sealed = frameOf(id).chapters.find((c) => c.sealed);
  const s2 = world(1); s2.knownIds.push(id); s2.readOnce[id] = [sealed.id]; const r2 = T.collectMoments(s2, settings, T0); assert.ok(r2.some((x) => x.key === "sealed:" + id + ":" + sealed.id && x.ok));
  // a deep line: a mibi whose recorded tree runs four crosses
  const s3 = world(1), chain = []; for (let i = 0; i < T.DEEP_LINE + 1; i++) chain.push({ id: 100 + i, name: "m" + i, species: "S01", parents: i === 0 ? null : [{ id: 100 + i - 1 }, { id: 9 }], genome: {}, read: [] });
  s3.mibis.push(...chain); assert.equal(T.lineDepth(s3, chain[T.DEEP_LINE]), T.DEEP_LINE); assert.equal(T.lineDepth(s3, chain[T.DEEP_LINE - 1]), T.DEEP_LINE - 1);
  const r3 = T.collectMoments(s3, settings, T0); assert.deepEqual(r3.filter((x) => x.kind === "line").map((x) => x.mibi), [chain[T.DEEP_LINE].id]);
  assert.equal(T.lineDepth(s3, { id: 1, parents: [{ id: 1 }] }), 1, "a loop in a recorded tree ends");
});

test("the warning: while a sitting is held, a guide one look from full says so, so the moment is not wasted", () => {
  const st = world(1); st.knownIds.push("S01"); const fr = frameOf("S01"); T.devGrantSitting(st, T0);
  assert.deepEqual(T.sittingWarning(st, settings), []);
  for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, "S01", t.id, L.possibleLooks(fr, t));
  const t0 = fr.chapters[0].traits[0]; st.guide.S01[t0.id].pop();
  assert.deepEqual(T.sittingWarning(st, settings), ["S01"]); st.sitting = null; assert.deepEqual(T.sittingWarning(st, settings), [], "no sitting held, nothing to warn about");
});

test("the welcome sitting: given once, the first moment any mibi has a habit and a place; it waits for the slot", () => {
  const st = world(1), m = st.mibis[0];
  assert.ok(T.checkWelcome(st, T0).early, "a mibi with no habit has nothing to sit for yet"); assert.ok(!st.welcomeGiven);
  T.recordHabit(st, m, "dig"); const r = T.checkWelcome(st, T0); assert.ok(r.ok); assert.equal(st.sitting.source, "welcome"); assert.ok(st.welcomeGiven);
  assert.ok(T.checkWelcome(st, T0 + 1).again, "one per player"); st.sitting = null; assert.ok(T.checkWelcome(st, T0 + 2).again, "and not again after it is used");
  const w = world(1); T.recordHabit(w, w.mibis[0], "dig"); T.devGrantSitting(w, T0); assert.ok(T.checkWelcome(w, T0).waits && !w.welcomeGiven, "a held sitting: the welcome waits");
  const rel = world(1); T.recordHabit(rel, rel.mibis[0], "dig"); rel.mibis[0].released = true; assert.ok(T.checkWelcome(rel, T0).early, "a released mibi does not count");
});

test("the offer and its refusals: no sitting, a mibi that needs a walk, a pose it has not done, a place it has not been, one sitting each", () => {
  const st = world(2), [a, b] = st.mibis; walked(st, a);
  assert.match(T.beginSitting(st, a, "dig", "wood", settings, T0).msg, /no sitting held/); T.devGrantSitting(st, T0);
  assert.match(T.beginSitting(st, b, "dig", "meadow", settings, T0).msg, /needs a walk first/, "no habit watched");
  assert.match(T.beginSitting(st, a, "glow", "wood", settings, T0).msg, /pick a pose/); assert.match(T.beginSitting(st, a, "dig", "cave", settings, T0).msg, /pick a place/);
  assert.match(T.beginSitting(st, null, "dig", "wood", settings, T0).msg, /pick a mibi/);
  const o = T.offer(st, a); assert.deepEqual([o.held, o.poses, o.places, o.block], [true, ["dig"], ["meadow", "wood"], ""]); assert.match(T.offer(st, b).block, /needs a walk/);
  assert.ok(st.sitting, "a refusal keeps the sitting"); assert.deepEqual(money(st), [0, 0, 0]);
  assert.ok(T.beginSitting(st, a, "dig", "wood", settings, T0).ok);
  T.devGrantSitting(st, T0); assert.match(T.beginSitting(st, a, "dig", "wood", settings, T0).msg, /one sitting each, ever/); assert.ok(T.offer(st, a).portrayed);
});

test("begin: the frame leaves the slot, the crate goes to the bay, the mibi is marked, nothing is spent; a juvenile may sit", () => {
  const st = world(1), m = walked(st, st.mibis[0]); m.born = st.turn;   // a juvenile
  assert.equal(S.mibiStage(st, m), "juvenile"); T.devGrantSitting(st, T0);
  const r = T.beginSitting(st, m, "dig", "wood", settings, T0); assert.ok(r.ok); assert.equal(st.sitting, null); assert.equal(st.sittingCrates.length, 1);
  assert.deepEqual({ ...st.sittingCrates[0] }, { id: "sit1", mibiId: m.id, pose: "dig", place: "wood", start: T0, source: "dev", painted: false, opened: false });
  assert.deepEqual({ ...m.portrait }, { state: "painting", pose: "dig", place: "wood", crate: "sit1", start: T0 }); assert.deepEqual(money(st), [0, 0, 0]);
});

test("the crate: the lamp fills with the start and the rule, never a countdown; ready needs the wait over and the painting landed; the bay lamp goes amber", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "dig", "wood", settings, T0).crate, sv = { bay: [] };
  const at = (ms, s = settings) => T.crateState(c, s, T0 + ms);
  assert.equal(T.crateLamp(c, settings, T0), 0); assert.equal(T.crateLamp(c, settings, T0 + 1.5 * H), 0.5); assert.equal(at(H), "filling"); assert.equal(T.bayState(st, sv, settings, T0 + H).amber, false);
  assert.equal(at(3 * H), "waiting for the cloud", "the wait is over, the painting has not landed"); assert.match(T.openSittingCrate(st, c.id, settings, T0 + 3 * H).msg, /waiting for the cloud/);
  assert.equal(T.openSittingCrate(st, c.id, settings, T0 + H).msg, "the crate is still filling");
  assert.ok(T.landPortrait(st, c.id).ok); assert.ok(T.landPortrait(st, c.id).again); assert.ok(!T.landPortrait(st, "nope").ok);
  assert.equal(at(H), "filling", "landed early, still not before its time"); assert.equal(at(3 * H), "ready");
  const bay = T.bayState(st, sv, settings, T0 + 3 * H); assert.deepEqual([bay.sitting, bay.total, bay.amber, bay.label], [1, 1, true, "Open the bay · 1 crate"]);
  // the rule is the developer's: a minute, or now, recomputed from the same start
  assert.equal(at(61000, { ...settings, sittingWait: "minute" }), "ready"); assert.equal(at(59000, { ...settings, sittingWait: "minute" }), "filling"); assert.equal(at(0, { ...settings, sittingWait: "now" }), "ready");
  assert.equal(T.sittingWaitMs(settings), 3 * H); assert.equal(T.sittingWaitMs({}), 3 * H, "three hours without a setting");
});

test("open the crate: the portrait is delivered, the crate leaves the bay, the mibi may not sit again, and a walk crate and a sitting crate share the lamp", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "dig", "wood", settings, T0).crate; T.landPortrait(st, c.id);
  st.dock = { docked: true, at: T0 }; const sv = { bay: [{ id: "x1", n: 1, turn: 3, pods: [] }] };
  assert.equal(T.bayState(st, sv, settings, T0 + 4 * H).total, 2, "one walk crate and one sitting crate");
  const r = T.openSittingCrate(st, c.id, settings, T0 + 4 * H); assert.ok(r.ok); assert.equal(r.ribbon, m.name + "'s portrait"); assert.equal(m.portrait.state, "delivered"); assert.equal(m.portrait.at, T0 + 4 * H);
  assert.deepEqual(st.sittingCrates, []); assert.equal(T.bayState(st, sv, settings, T0 + 4 * H).total, 1);
  assert.match(T.openSittingCrate(st, c.id, settings, T0 + 4 * H).msg, /no such crate/);
  T.devGrantSitting(st, T0); assert.match(T.beginSitting(st, m, "dig", "wood", settings, T0).msg, /one sitting each/);
});

test("a portrayed mibi may be returned to the wild; its portrait stays in the book and it keeps its place as the face", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "dig", "wood", settings, T0).crate; T.landPortrait(st, c.id); T.openSittingCrate(st, c.id, settings, T0 + 4 * H);
  assert.ok(L.makeFace(st, m).ok); const s0 = st.s, r = S.returnMibi(st, { with: null }, m, settings);
  assert.ok(r.ok); assert.equal(st.s, s0 + 2); assert.ok(m.released); assert.equal(m.portrait.state, "delivered", "released, the portrait stays"); assert.equal(L.faceOf(st, "S01"), m.id);
});

test("an older save loads: the sitting's fields default; a mibi has no habits, no walks and no portrait yet", () => {
  const st = { ...S.freshSt("w1", 3, T0) }; delete st.sittingCrates; delete st.face; delete st.moments; st.mibis = [{ id: 1, name: "Old", sp: 0, species: "S01", from: { g: "meadow" } }];
  S.normalize(st); assert.deepEqual([st.sittingCrates, st.face, st.moments], [[], {}, {}]); assert.deepEqual([st.mibis[0].habits, st.mibis[0].walked, st.mibis[0].portrait], [[], [], null]);
});
