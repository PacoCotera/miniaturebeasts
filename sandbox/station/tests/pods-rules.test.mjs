// The pod inventory's rules (the owner's rulings of 2026-10-28 20:26 to 23:16), in Node: no rack and no waiting, letting a pod go and releasing a mibi pay nothing,
// freshness (12 world turns that move only with expeditions, the bench pausing it, a dried pod a husk shown once with its reads kept and nothing paid), freshening for Essence (1 for 4 turns, up to full),
// the one guard on letting go, the goal on a pod, and the read bar's four blocks.
//   node --test prototypes/station/tests/pods-rules.test.mjs
// PRE-LANGUAGE FIXTURE (release 21a): these rules are frame-independent, but their cases are the S01, S02 and S03 chapters of the form frames (versions 2 to 6, kept on disk beside the language frames), with their sealed chapters; the game itself loads the version 8 frames (frames-twenty.test.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { miniRail, miniWidths } from "../src/views/pods-props.mjs";
S.useNameList("en-short-1");

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))).filter((f) => !f.species.draft));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const crate = (n, pods, extra = {}) => ({ id: "x" + n, n, turn: n, at: 0, e: 3, d: 3, s: 4, pods, met: [], explored: 5, of: 20, lines: [], ...extra });
const pod = (i, gs, sp = 0) => ({ id: "p" + i, sp, g: "pond", how: "calm", gs, k: null });
const world = (crates, turn = 1) => { const sv = { v: 8, seed: 7, wid: "w7", turn, bay: crates, mibis: [], with: null, tier: 1, shield: 3 }; const st = S.freshSt("w7", turn, 1000); S.normalize(st); return { sv, st }; };
// A trip: the Companion comes home at `turn` (the world turn moves only with expeditions) with the crates given.
const trip = (st, sv, turn, crates = []) => { S.dockKey(st, sv, settings, 1000); sv.turn = turn; sv.bay = crates; const d = S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000); return d; };
const home = (n, turn = 1) => { const { sv, st } = world([crate(turn, Array.from({ length: n }, (_, i) => pod(i, 40 + i)))], turn); S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000); return { sv, st }; };

test("no rack: every pod brought home is kept, in the order it came; nothing waits, however many come", () => {
  const { st } = home(20);
  assert.equal(st.tray.length, 20); assert.deepEqual(st.waiting, []); assert.deepEqual(st.tray.map((p) => p.id), Array.from({ length: 20 }, (_, i) => "x1:p" + i));
  assert.equal("RACK" in S, false, "no rack constant"); assert.equal("rackSize" in S, false); assert.equal("rack" in S.DEFAULT_SETTINGS, false, "no developer rack");
  for (let i = 0; i < 12; i++) S.seedPodFromGenome(st, podGenome(frameOf("S01"), 900 + i), settings, 1000);
  assert.equal(st.tray.length, 32, "a developer pod comes home too"); assert.deepEqual(st.waiting, []);
});

test("an older save's waiting pods join the inventory on load, after the ones at home; nothing is lost", () => {
  const { st } = home(6); st.waiting = [{ id: "w1", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 3, idd: 0, read: [] }, { id: "w2", species: "S01", sp: 0, g: "meadow", how: "calm", gs: 4, idd: 0, read: [] }];
  S.normalize(st); assert.deepEqual(st.waiting, []); assert.deepEqual(st.tray.slice(-2).map((p) => p.id), ["w1", "w2"]);
  assert.ok(st.tray.every((p) => Number.isInteger(p.dryAt)), "each with a life"); assert.equal(st.tray.at(-1).dryAt, st.turn + S.POD_LIFE, "a pod from before freshness keeps a full life from now");
});

test("letting a shed pod go keeps its line in the record; a wild pod keeps only its seed", () => {
  const { st } = home(2); const [a, b] = st.tray; a.shed = 5; a.of = "Fig"; a.genome = { ...a.genome, origin: { kind: "shed", parents: ["d", "d"], parentIds: [9, 9] } };
  S.returnPod(st, a); S.returnPod(st, b);
  const [ra, rb] = st.returned.slice(-2); assert.deepEqual([ra.shed, ra.of, ra.genome.origin.parentIds], [5, "Fig", [9, 9]]); assert.deepEqual(a.genome.origin.parentIds, [9, 9]);
  assert.ok(!("shed" in rb) && !("genome" in rb), "a wild pod comes back as itself from its seed");
});
test("letting a pod go pays nothing and keeps its reads on the species; the Companion's record stays", () => {
  const { st } = home(2); st.d = 20; const [a] = st.tray; S.identify(st, a, settings); S.read(st, a, "coat", settings);
  const looks = JSON.stringify(st.guide.S01), s0 = st.s, e0 = st.e, d0 = st.d, r = S.returnPod(st, a);
  assert.equal(r.ok, true); assert.deepEqual([st.s, st.e, st.d], [s0, e0, d0], "nothing paid"); assert.equal(st.tray.length, 1);
  assert.equal(JSON.stringify(st.guide.S01), looks, "every read stays in the field guide"); assert.equal(st.returned.at(-1).id, a.id);
  assert.equal("wild" in S.PRICE || "wildMibi" in S.PRICE, false, "no price for letting go or releasing");
});

test("releasing a mibi pays no Essence; the shed pod of its line stays its only gift", () => {
  const { st } = home(0); st.firstMibi = false; S.seedAdults(st, "S01", 5, 2, settings); const m = st.mibis[0], s0 = st.s;
  const r = S.returnMibi(st, { with: null }, m, settings); assert.equal(r.ok, true); assert.equal(st.s, s0, "no Essence"); assert.equal(st.sheds.at(-1).id, m.id, "the shed pod of its line is due"); assert.doesNotMatch(r.msg, /❀|Essence/);
});

test("the one guard on letting go: the only identified pod of its species, or a pod that carries the goal, asks once; any other pod goes at once", () => {
  const { st } = home(3); st.d = 20; const [a, b, c] = st.tray;
  assert.equal(S.letGoGuard(st, a), null, "an unidentified pod: no guard");
  S.identify(st, a, settings); assert.equal(S.letGoGuard(st, a), "only", "the only Loika identified");
  S.identify(st, b, settings); assert.equal(S.letGoGuard(st, a), null, "two Loikas: no guard");
  S.read(st, a, "coat", settings); const fr = frameOf("S01"), ch = fr.chapters.find((x) => x.id === "coat");
  const t = ch.traits[0], look = (S.guideLooks(st, "S01", t.id) || [])[0]; st.wish.S01 = { [t.id]: look };
  assert.equal(S.letGoGuard(st, a), "goal", "the goal's look read on it"); assert.deepEqual(S.podGoalTraits(st, a), [t.id]);
  void c;
});

test("the goal on a pod: a goal look read on it, or a glint on a goal chapter; none without a goal", () => {
  const { st } = home(2); st.d = 20; const [a, b] = st.tray; S.identify(st, a, settings); S.identify(st, b, settings);
  assert.equal(S.podGoal(st, a), false, "no goal set");
  const fr = frameOf("S01"), coat = fr.chapters.find((x) => x.id === "coat"), t = coat.traits[0];
  st.wish.S01 = { [t.id]: "a look no pod carries" }; assert.equal(S.podGoal(st, a), false, "unread and no glint: nothing known");
  S.read(st, a, "coat", settings); assert.equal(S.podGoal(st, a), false, "read, and it does not show the goal look");
  st.wish.S01 = { [t.id]: S.guideLooks(st, "S01", t.id)[0] }; assert.equal(S.podGoal(st, a), true, "read, and the goal look is there");
  const glints = S.glint(st, b, "coat"); assert.equal(S.podGoal(st, b), glints, "an unread pod carries the goal only where it glints on the goal's chapter");
});

test("freshness: a pod keeps 12 world turns from the turn it came home; the clock moves only with expeditions, never with time at home", () => {
  const { sv, st } = home(1, 3), p = st.tray[0];
  assert.equal(p.dryAt, 3 + S.POD_LIFE); assert.equal(S.turnsLeft(st, p), 12); assert.deepEqual(S.podFreshness(st, p), { left: 12, life: 12, full: true, amber: false, bench: false, words: "fresh for 12 turns" });
  S.dockKey(st, sv, settings, 1000); S.dockKey(st, sv, settings, 1e12); assert.equal(S.turnsLeft(st, p), 12, "a dock with no trip, a year later: nothing moved");
  trip(st, sv, 10); assert.equal(S.turnsLeft(st, p), 5, "seven turns out");
  trip(st, sv, 11); assert.deepEqual([S.turnsLeft(st, p), S.podFreshness(st, p).amber, S.podFreshness(st, p).words], [4, true, "dries out in 4 turns"], "amber from four turns left, with its words");
  assert.equal(S.dryingSoon(st, p), true);
  trip(st, sv, 14); assert.deepEqual([S.turnsLeft(st, p), S.podFreshness(st, p).words], [1, "dries out next turn"]);
});

test("a pod that dries is a husk: it leaves home paying nothing, its reads stay on the species, its origin is kept, and it is shown once", () => {
  const { sv, st } = home(2, 1); st.d = 20; const [a, b] = st.tray; S.identify(st, a, settings); S.read(st, a, "coat", settings);
  const guide = JSON.stringify(st.guide), s0 = st.s, e0 = st.e;
  const d = trip(st, sv, 13);
  assert.deepEqual(d.dried.map((r) => r.id), [a.id, b.id], "both dried as the turn moved"); assert.equal(st.tray.length, 0);
  assert.equal(st.s, s0, "a dried pod pays nothing"); assert.equal(st.e, e0); assert.equal(JSON.stringify(st.guide), guide, "its reads stay");
  const rec = st.dried.find((r) => r.id === a.id); assert.deepEqual([rec.species, rec.g, rec.how, rec.read, rec.turn, rec.shown], ["S01", "pond", "calm", ["coat"], 13, false], "the origin and the reads are kept");
  assert.deepEqual(S.unshownHusks(st).map((r) => r.id), [a.id, b.id], "the husks wait for the screen"); S.husksShown(st); assert.deepEqual(S.unshownHusks(st), [], "shown once, then gone");
  assert.match(st.log.at(-2), /dried out · its reads stay/);
});

test("the pod on the reading-room bench does not dry; it keeps its turns while it sits there and they run again from where they stopped when it leaves", () => {
  const { sv, st } = home(2, 1), [a, b] = st.tray;
  trip(st, sv, 5); assert.equal(S.turnsLeft(st, a), 8);
  assert.deepEqual(S.putOnBench(st, a), { ok: true, old: null }); assert.equal(st.readingPod, a.id); assert.equal(S.benchPod(st), a);
  assert.deepEqual(S.podFreshness(st, a), { left: 8, life: 12, full: false, amber: false, bench: true, words: "kept fresh on the bench" });
  trip(st, sv, 13); assert.equal(st.tray.includes(a), true, "the bench pod is kept"); assert.equal(st.tray.includes(b), false, "the other dried"); assert.equal(S.turnsLeft(st, a), 8, "paused");
  trip(st, sv, 20); assert.equal(S.turnsLeft(st, a), 8);
  const c = S.seedPodFromGenome(st, podGenome(frameOf("S01"), 77), settings, 1000).pod; assert.equal(S.turnsLeft(st, c), 12);
  assert.deepEqual(S.putOnBench(st, c), { ok: true, old: a.id }, "taking a new pod in sends the old one back"); assert.equal(S.turnsLeft(st, a), 8, "its clock starts again from where it stopped");
  trip(st, sv, 23); assert.deepEqual([S.turnsLeft(st, a), S.turnsLeft(st, c)], [5, 12]);
  assert.equal(S.putOnBench(st, c).again, true, "the same pod again: nothing changes");
  S.returnPod(st, c); assert.equal(st.readingPod, null, "a pod let go leaves the bench bare");
});

test("freshening: 1 Essence for every 4 turns down, rounded up, the press brings it to full; held when already fresh or Essence is short", () => {
  const { sv, st } = home(1, 1), p = st.tray[0];
  assert.equal(S.freshenCost(st, p, settings), 0); assert.equal(S.freshenBlock(st, p, settings), "already fresh"); assert.deepEqual(S.freshen(st, p, settings), { ok: false, why: "already fresh" });
  trip(st, sv, 2); assert.equal(S.freshenCost(st, p, settings), 1, "one turn down: ❀1");
  trip(st, sv, 7); assert.equal(S.freshenCost(st, p, settings), 2, "six turns down: ❀2 (two steps of 4, capped at full)");
  trip(st, sv, 12); assert.equal(S.freshenCost(st, p, settings), 3, "eleven down: ❀3, under one cross (4)");
  st.s = 2; assert.equal(S.freshenBlock(st, p, settings), "needs ❀ 3 · you have ❀ 2"); assert.equal(S.freshen(st, p, settings).ok, false); assert.equal(st.s, 2, "nothing spent");
  st.s = 5; const r = S.freshen(st, p, settings); assert.deepEqual(r, { ok: true, cost: 3 }); assert.equal(st.s, 2); assert.equal(S.turnsLeft(st, p), 12, "to full, never fresher than new");
  S.putOnBench(st, p); trip(st, sv, 20); assert.equal(S.freshenCost(st, p, settings), 0, "the bench pod lost nothing");
});

test("freshen these: every pod named to full, in the order given, while the Essence lasts; the plan names the cost first", () => {
  const { sv, st } = home(3, 1); trip(st, sv, 7); const pods = st.tray;   // each six down: ❀2 each
  st.s = 5; assert.deepEqual(S.freshenPlan(st, pods, settings), { cost: 4, n: 2, of: 3, total: 6 }, "two of three can be paid");
  const r = S.freshenAll(st, pods, settings); assert.deepEqual(r.ids, [pods[0].id, pods[1].id]); assert.equal(st.s, 1); assert.deepEqual(pods.map((p) => S.turnsLeft(st, p)), [12, 12, 6]);
});

test("the mini rail under a card: a block a chapter across 88 px, 2 apart, wide as its traits are many; read lit, unread an inlay, none lit when nothing is read; an unidentified pod one bare inlay", () => {
  const { st } = home(1); st.d = 40; const p = st.tray[0];
  assert.deepEqual(miniRail(p, settings), { lanes: [{ ch: "", n: 1, state: "unread" }], lock: false }, "unidentified: one bare inlay");
  S.identify(st, p, settings); let r = miniRail(p, settings);
  assert.deepEqual(r.lanes.map((l) => l.state), ["unread", "unread", "unread", "unread"]); assert.equal(r.lock, false);
  const w = miniWidths(r.lanes.map((l) => l.n)); assert.equal(w.reduce((a, b) => a + b, 0) + 2 * (w.length - 1), 88, "the lanes fill the bar, 2 px apart"); assert.ok(w.every((x) => x >= 4)); assert.deepEqual(miniWidths([2, 2, 1, 1]), [27, 27, 14, 14], "wide as the traits are many");
  ["coat", "face", "movement", "stamina"].forEach((c, i) => { S.read(st, p, c, settings); r = miniRail(p, settings); assert.deepEqual(r.lanes.map((l) => l.state === "read"), [0, 1, 2, 3].map((k) => k <= i), c); });
  assert.deepEqual(r.lanes.map((l) => l.ch), ["coat", "face", "movement", "stamina"], "in frame order");
});

test("the mini rail on a species with a sealed chapter: an inlay with no colour line stays, the lock after the bar while it is shut", () => {
  const { st } = home(0); st.d = 40; const p = S.seedPodFromGenome(st, podGenome(frameOf("S02"), 5), settings, 1000).pod; S.identify(st, p, settings);
  let r = miniRail(p, settings); assert.deepEqual([r.lock, r.lanes.map((l) => l.state)], [true, ["unread", "unread", "unread", "sealed"]], "the Untuva: four chapters, Character sealed");
  for (const c of ["coat", "shape", "movement"]) S.read(st, p, c, settings);
  r = miniRail(p, settings); assert.deepEqual([r.lock, r.lanes.filter((l) => l.state !== "sealed").every((l) => l.state === "read"), r.lanes.at(-1).state], [true, true, "sealed"], "every open page read: all lit, the shut one stays an inlay, the lock stays beside it");
  assert.equal(miniRail(p, { ...settings, sealedOpen: true }).lock, false, "opened: no lock");
});

// ---- the pod's store: Data put in, read while the Companion is out (the pods-reading scheme §2) ----
const benched = (n = 2) => { const { sv, st } = home(n); const p = st.tray[0]; S.skipIdentify(st, p); S.putOnBench(st, p); st.readEver = true; st.d = 100; return { sv, st, p }; };
const price = (st, p, settings2 = settings) => S.readQueue(st, p, settings2).map((c) => c.cost);

test("deposit: only on the bench pod, never more than the pocket, never more than is left to read", () => {
  const { st, p } = benched(); const all = price(st, p).reduce((a, b) => a + b, 0), other = st.tray[1]; S.skipIdentify(st, other);
  assert.equal(S.deposit(st, other, 3, settings).ok, false, "a pod off the bench takes none");
  assert.deepEqual([S.deposit(st, p, 4, settings).put, st.d, p.store.d], [4, 96, 4]);
  assert.equal(S.deposit(st, p, 999, settings).put, all - 4, "the rest of the price and no more"); assert.equal(p.store.d, all); assert.equal(st.d, 100 - all);
  assert.equal(S.storeLeft(st, p, settings), 0); assert.equal(S.deposit(st, p, 1, settings).ok, false, "nothing left to read, nothing goes in");
});

test("deposit is limited by the pocket", () => {
  const { st, p } = benched(); st.d = 3; assert.deepEqual([S.deposit(st, p, 50, settings).put, st.d, p.store.d], [3, 0, 3]);
});

test("tickReading: whole chapters only, partial time kept, out-time sums across outings", () => {
  const { st, p } = benched(); const [c1, c2] = price(st, p); S.deposit(st, p, c1 + c2, settings);
  assert.deepEqual(S.tickReading(st, 6 * 60000, settings).read, [], "six minutes read nothing"); assert.equal(p.store.ms, 6 * 60000);
  let r = S.tickReading(st, 4 * 60000, settings); assert.equal(r.read.length, 1, "a 6 and a 4 minute outing read one chapter"); assert.equal(p.store.d, c2); assert.equal(p.store.ms, 0);
  r = S.tickReading(st, 25 * 60000, settings); assert.equal(r.read.length, 1, "only what the store holds"); assert.equal(p.store.d, 0); assert.equal(p.store.ms, 0, "time while the store is short is not banked");
  assert.equal(p.read.length, 2); assert.equal(st.d, 100 - c1 - c2, "the pocket paid once, at the deposit");
});

test("tickReading: a long outing reads several chapters at once; a backwards clock counts as zero", () => {
  const { st, p } = benched(); const q = price(st, p); S.deposit(st, p, q[0] + q[1] + q[2], settings);
  assert.deepEqual(S.tickReading(st, -90 * 60000, settings).read, [], "backwards is zero"); assert.deepEqual(S.tickReading(st, NaN, settings).read, []); assert.equal(p.store.ms, 0);
  assert.equal(S.tickReading(st, 25 * 60000, settings).read.length, 2, "twenty-five minutes: two whole chapters, five minutes kept"); assert.equal(p.store.ms, 5 * 60000);
});

test("tickReading: the developer timer scales it; the first chapter ever is free and reads at once", () => {
  const { st, p } = benched(); const x10 = { ...settings, budScale: 10 }; S.deposit(st, p, price(st, p, x10)[0], x10);
  assert.equal(S.tickReading(st, 60000, x10).read.length, 1, "×10: one minute reads a chapter"); assert.equal(S.readNeedMs({ ...settings, budScale: "instant" }), 0);
  const f = benched(); f.st.readEver = false; f.st.d = 0; const r = S.tickReading(f.st, 0, settings);
  assert.deepEqual([r.read.length, r.read[0].cost, f.st.readEver, f.p.read.length], [1, 0, true, 1], "the first chapter ever, free, no waiting, no Data");
  assert.equal(S.tickReading(f.st, 0, settings).read.length, 0, "the next one is priced and waits");
});

test("tickReading reads through read()'s bookkeeping: p.first, the guide and the half price on a later pod", () => {
  const { st, p } = benched(); const c = S.readQueue(st, p, settings)[0]; S.deposit(st, p, c.cost, settings); const r = S.tickReading(st, S.READ_MS, settings).read[0];
  assert.equal(r.id, c.id); assert.ok(st.readOnce[S.speciesOf(p)].includes(c.id), "read-once kept");
  const q = st.tray[1]; S.skipIdentify(st, q); S.putOnBench(st, q); assert.ok(S.readQueue(st, q, settings)[0].cost <= Math.ceil(c.cost) && S.readQueue(st, q, settings)[0].cost >= 1, "half price (rounded up) on a later pod of the kind");
  const twin = S.readQueue(st, q, settings).find((x) => x.id === c.id); assert.equal(twin.cost, Math.ceil(frameOf(S.speciesOf(q)).chapters.find((x) => x.id === c.id).traits.length / 2));
});

test("the store's Data comes back whole: let go, grown, and the bench swap", () => {
  let { st, p } = benched(); S.deposit(st, p, 7, settings); assert.equal(st.d, 93);
  assert.equal(S.returnPod(st, p).ok, true); assert.equal(st.d, 100, "let go: whole"); assert.equal(p.store, undefined);
  ({ st, p } = benched()); S.deposit(st, p, 5, settings); const other = st.tray[1]; S.skipIdentify(st, other); S.putOnBench(st, other);
  assert.equal(st.d, 100, "swap: the old pod's store is back"); assert.equal(p.store, undefined);
  ({ st, p } = benched()); for (const c of frameOf(S.speciesOf(p)).chapters) if (!c.sealed) S.read(st, p, c.id, settings); st.d = 100; st.e = 50; st.s = 50;
  const q = st.tray[1]; S.skipIdentify(st, q); S.putOnBench(st, q); S.deposit(st, q, 4, settings); const before = st.d; const g = S.grow(st, q, {}, settings); if (g.ok) assert.equal(st.d, before + 4 - S.growCost(st, {}, settings).d, "grown: the store came back before the grow's own price");
  assert.equal(q.store, undefined);
});

test("a save: a store off the bench goes back to the pocket on load", () => {
  const { st, p } = benched(); S.deposit(st, p, 6, settings); const other = st.tray[1]; other.store = { d: 3, ms: 0 }; const d0 = st.d;
  S.normalize(st); assert.equal(other.store, undefined); assert.equal(st.d, d0 + 3); assert.equal(p.store.d, 6);
});

test("out-time at the dock: lift to seat, summed across outings, a backwards clock is zero, the chapters owed finish at the dock", () => {
  const { sv, st, p } = benched(); const q = price(st, p); S.deposit(st, p, q[0] + q[1], settings);
  sv.turn = 3; sv.bay = [];
  S.dockKey(st, sv, settings, 10 * 60000);   // lift (the Companion was seated at home)
  assert.equal(st.dock.docked, false);
  let d = S.dockKey(st, sv, settings, 10 * 60000 + 6 * 60000); assert.deepEqual(d.reading.read, [], "a six-minute outing"); assert.equal(p.store.ms, 6 * 60000);
  S.dockKey(st, sv, settings, 20 * 60000);
  d = S.dockKey(st, sv, settings, 24 * 60000); assert.equal(d.reading.read.length, 1, "six and four minutes: one chapter, at the dock"); assert.equal(st.readHome.length, 1);
  assert.deepEqual(S.readHomeFacts(st)[0].chapters.map((c) => c.id), [S.readQueue(st, p, settings).length ? p.read[0] : null]);
  S.dockKey(st, sv, settings, 30 * 60000);
  d = S.dockKey(st, sv, settings, 5 * 60000); assert.deepEqual(d.reading.read, [], "a clock gone back counts zero"); assert.equal(p.store.ms, 0);
  assert.equal(S.takeReadHome(st).length, 1); assert.deepEqual(st.readHome, []);
});
