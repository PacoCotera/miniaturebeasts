// The sitting (M6): the held right, the research moments that earn it and their warnings, the welcome sitting at the first walk home, the ceremony, the crate and its timer,
// the portrait that stays; and what the dock records (habits, places). Every transition and every refusal. Nothing here draws.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds, chapterLooks } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import * as T from "../src/sitting.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", sittingWait: "hours" };
const H = 3600000, T0 = 1000000;
const sv = (mibis, turn = 4) => ({ v: 8, seed: 7, wid: "w1", turn, bay: [], mibis, with: null, tier: 1, shield: 3 });   // the Companion's save part, as a dock reads it
const world = (n = 2) => { const st = S.freshSt("w1", 3, T0); S.normalize(st); S.seedAdults(st, "S01", 7, n, settings); return st; };
const walked = (st, m, habit = "calm", place = "wood") => { T.recordHabit(st, m, habit); T.recordWalk(st, m, place); return m; };
const money = (st) => [st.e, st.d, st.s];

test("the frames list the habits of the first three species; a later one has none yet", () => {
  assert.deepEqual(frameOf("S01").habits, ["shake-dry", "calm", "sleep-curled"]); assert.deepEqual(frameOf("S02").habits, ["sniff", "puff", "sleep-curled"]); assert.deepEqual(frameOf("S03").habits, ["dig", "glow", "sleep-curled"]);
  for (const id of frameIds()) assert.ok(Array.isArray(frameOf(id).habits), id);
});

test("habits seen and places walked are recorded once, from the frame's list; a mibi's places are where its pod came from and every place it walked to", () => {
  const st = world(1), m = st.mibis[0];
  assert.deepEqual(T.habitsOf(m), []); assert.deepEqual(T.placesOf(m), ["meadow"], "its pod's place, from birth");
  assert.ok(T.recordHabit(st, m, "calm").ok); assert.ok(T.recordHabit(st, m, "calm").again); assert.ok(T.recordWalk(st, m, "wood").ok); assert.ok(T.recordWalk(st, m, "wood").again); assert.ok(T.recordWalk(st, m, "meadow").again, "its own place is not a walk");
  assert.deepEqual(T.habitsOf(m), ["calm"]); assert.deepEqual(T.placesOf(m), ["meadow", "wood"]);
  assert.match(T.recordHabit(st, m, "dig").msg, /not a habit of Loika/, "a Tuikis habit is not a Loika's");
  assert.ok(!T.recordHabit(st, null, "calm").ok && !T.recordHabit(st, m, "").ok && !T.recordWalk(st, m, "").ok);
  const k = world(0); S.seedAdults(k, "S04", 3, 1, settings); assert.ok(!T.recordHabit(k, k.mibis[0], "dig").ok, "a species with no list yet records no habit");
});

test("the bench's watch: a resident in focus for a minute of its routine records the habit it was doing; under a minute, nothing", () => {
  const st = world(1), m = st.mibis[0];
  assert.ok(T.watchResident(st, m, "sleep-curled", 30000).short); assert.deepEqual(T.habitsOf(m), []);
  assert.ok(T.watchResident(st, m, "sleep-curled", T.WATCH_MS).ok); assert.deepEqual(T.habitsOf(m), ["sleep-curled"]); assert.ok(T.watchResident(st, m, "sleep-curled", 5 * T.WATCH_MS).again);
  m.released = true; assert.ok(!T.watchResident(st, m, "calm", T.WATCH_MS).ok);
});

test("the dock records what came home with the Companion: the habit the mibi did and each place it entered, once; the mibi is listed as home only when its outings went up", () => {
  const st = world(1), m = st.mibis[0], S1 = sv([{ id: m.id, outings: 1, habitsDone: ["calm"], placesEntered: ["wood", "pond"] }]);
  const r = T.dock(st, S1, settings, T0); assert.ok(r.ok && r.docked); assert.deepEqual(r.home, [m.id]); assert.deepEqual(T.habitsOf(m), ["calm"]); assert.deepEqual(m.walked, ["wood", "pond"]); assert.equal(m.outings, 1);
  T.dock(st, S1, settings, T0 + 1);   // lift
  const r2 = T.dock(st, S1, settings, T0 + 2); assert.deepEqual(r2.home, [], "the same outings: nobody came home"); assert.deepEqual(m.walked, ["wood", "pond"]);
  S1.mibis = [{ id: m.id, outings: 2, habitsDone: ["calm", "nope"], placesEntered: ["wood", "rock"] }]; T.dock(st, S1, settings, T0 + 3); const r3 = T.dock(st, S1, settings, T0 + 4);
  assert.deepEqual(r3.home, [m.id]); assert.deepEqual(m.walked, ["wood", "pond", "rock"]); assert.deepEqual(T.habitsOf(m), ["calm"], "an unknown habit is not recorded");
});

test("one slot, one frame: a sitting is held, and a second earned meanwhile is not given and does not wait; a moment pays once", () => {
  const st = world(1);
  const a = T.grantSitting(st, "moment", "guide:S01", T0); assert.ok(a.ok); assert.equal(st.sitting.source, "moment"); assert.equal(st.moments["guide:S01"], T0);
  assert.ok(T.grantSitting(st, "moment", "guide:S01", T0 + 1).again, "the same moment pays once");
  const b = T.grantSitting(st, "moment", "guide:S02", T0 + 2); assert.ok(!b.ok && b.lost && /held/.test(b.msg), "earned while one is held: not given"); assert.equal(st.sitting.key, "guide:S01");
  st.sitting = null; assert.ok(T.grantSitting(st, "moment", "guide:S02", T0 + 3).again, "it does not wait: the slot is free and the moment is spent");
  assert.deepEqual(money(st), [0, 0, 0], "a sitting costs and pays no material");
  const d = world(1); assert.ok(T.devGrantSitting(d, T0).ok); assert.deepEqual(d.moments, {}, "the developer's sitting leaves the ledger alone"); assert.ok(!T.devGrantSitting(d, T0).ok);
});

test("the research moments: a sealed chapter read, then the guide filled with the sealed chapter's looks, then a deep line; each found when true and paid once", () => {
  const id = ["S02", "S09", "S11", "S15", "S16"].find((s) => frameOf(s).chapters.some((c) => c.sealed)), fr = frameOf(id), sealed = fr.chapters.find((c) => c.sealed);
  const st = world(1); st.knownIds.push(id);
  assert.deepEqual(T.collectMoments(st, settings, T0), [], "nothing earned yet");
  for (const ch of fr.chapters) for (const t of ch.traits) if (ch !== sealed) S.guideAdd(st, id, t.id, L.possibleLooks(fr, t));
  assert.ok(!L.fieldGuide(st, id, settings).complete, "the guide is not complete while the sealed chapter's looks are unseen"); assert.deepEqual(T.collectMoments(st, settings, T0), []);
  st.readOnce[id] = [sealed.id]; assert.deepEqual(T.collectMoments(st, settings, T0).map((x) => [x.key, x.ok]), [["sealed:" + id + ":" + sealed.id, true]], "the sealed chapter's own moment");
  st.sitting = null; for (const t of sealed.traits) S.guideAdd(st, id, t.id, L.possibleLooks(fr, t));
  assert.deepEqual(T.collectMoments(st, settings, T0 + 1).map((x) => [x.key, x.ok]), [["guide:" + id, true]], "the guide's comes after"); assert.deepEqual(T.collectMoments(st, settings, T0 + 2), [], "paid once");
  assert.deepEqual(T.momentsEarned(st, settings).map((m) => m.kind), ["sealed", "guide"], "in that order");
  // a deep line: four crosses on the longest path of a mibi's recorded tree
  const s3 = world(1), chain = []; for (let i = 0; i < T.DEEP_LINE + 1; i++) chain.push({ id: 100 + i, name: "m" + i, species: "S01", parents: i === 0 ? null : [{ id: 100 + i - 1 }, { id: 9 }], genome: {}, read: [] });
  s3.mibis.push(...chain); assert.equal(T.lineDepth(s3, chain[T.DEEP_LINE]), T.DEEP_LINE); assert.equal(T.lineDepth(s3, chain[T.DEEP_LINE - 1]), T.DEEP_LINE - 1);
  const r3 = T.collectMoments(s3, settings, T0); assert.deepEqual(r3.filter((x) => x.kind === "line").map((x) => x.mibi), [chain[T.DEEP_LINE].id]);
  chain[T.DEEP_LINE - 1].released = true; assert.equal(T.lineDepth(s3, chain[T.DEEP_LINE]), T.DEEP_LINE, "released ancestors count");
  assert.equal(T.lineDepth(s3, { id: 1, parents: [{ id: 1 }] }), 1, "a loop in a recorded tree ends");
});

test("the warnings, before the act that pays a moment, only while a sitting is held: a guide one look short, the first read of a sealed chapter, a cross that completes a deep line", () => {
  const st = world(2), [a, b] = st.mibis; st.knownIds.push("S01"); const fr = frameOf("S01");
  assert.deepEqual(T.sittingWarning(st, settings), []); assert.equal(T.readWarning(st, "S09", "x"), ""); assert.equal(T.crossWarning(st, a, b), "");
  T.devGrantSitting(st, T0);
  for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, "S01", t.id, L.possibleLooks(fr, t));
  const t0 = fr.chapters[0].traits[0]; st.guide.S01[t0.id].pop();
  assert.deepEqual(T.sittingWarning(st, settings), ["S01"]);
  const id = ["S02", "S09", "S11", "S15", "S16"].find((s) => frameOf(s).chapters.some((c) => c.sealed)), sealed = frameOf(id).chapters.find((c) => c.sealed), open = frameOf(id).chapters.find((c) => !c.sealed);
  assert.equal(T.readWarning(st, id, sealed.id), T.WARNING, "before the first read of a sealed chapter"); assert.equal(T.readWarning(st, id, open.id), "", "an ordinary chapter: nothing"); st.readOnce[id] = [sealed.id]; assert.equal(T.readWarning(st, id, sealed.id), "", "read once: nothing more to pay");
  a.parents = [{ id: 50 }, { id: 51 }]; st.mibis.push({ id: 50, parents: [{ id: 60 }, { id: 61 }] }, { id: 60, parents: [{ id: 70 }, { id: 71 }] }, { id: 70, parents: [{ id: 80 }, { id: 81 }] });
  assert.equal(T.lineDepth(st, a), 4); assert.equal(T.crossWarning(st, a, b), T.WARNING, "the child would be the fifth generation");
  assert.equal(T.crossWarning(st, b, b), "", "two founders make a child of one generation");
  st.sitting = null; assert.deepEqual(T.sittingWarning(st, settings), []); assert.equal(T.crossWarning(st, a, b), "", "no sitting held, nothing to say");
});

test("the welcome sitting: at the first dock at which a mibi comes home from a walk; the bench alone never gives it; one per player; it waits for the slot and is never lost", () => {
  const st = world(1), m = st.mibis[0];
  T.recordHabit(st, m, "calm"); assert.ok(T.checkWelcome(st, T0, []).early, "a watched habit at the bench: no welcome"); assert.ok(!st.welcomeGiven);
  const r = T.dock(st, sv([{ id: m.id, outings: 1, habitsDone: ["calm"], placesEntered: ["wood"] }]), settings, T0); assert.ok(r.welcome.ok); assert.equal(st.sitting.source, "welcome"); assert.ok(st.welcomeGiven);
  const sv2 = sv([{ id: m.id, outings: 2 }], 5); T.dock(st, sv2, settings, T0 + 1); assert.ok(T.dock(st, sv2, settings, T0 + 2).welcome.again, "one per player");
  // a walk home with no habit recorded still gives it: the dock is the trigger
  const w = world(1), wm = w.mibis[0]; assert.ok(T.dock(w, sv([{ id: wm.id, outings: 1 }]), settings, T0).welcome.ok);
  // a sitting held: the welcome waits, and comes when the slot is free
  const h = world(1), hm = h.mibis[0]; walked(h, hm); T.devGrantSitting(h, T0);
  const r2 = T.dock(h, sv([{ id: hm.id, outings: 1 }]), settings, T0); assert.ok(r2.welcome.waits && !h.welcomeGiven && h.welcomePending);
  assert.ok(T.beginSitting(h, hm, "calm", "wood", settings, T0 + 5).welcome.ok, "the slot is free: the waiting welcome is given"); assert.ok(h.welcomeGiven && !h.welcomePending); assert.equal(h.sitting.source, "welcome");
  const rel = world(1); rel.mibis[0].released = true; assert.ok(T.checkWelcome(rel, T0, [rel.mibis[0].id]).early, "a released mibi does not count");
});

test("the offer and its refusals: no sitting, a mibi that needs a walk, a pose it has not done, a place it has not been, one sitting each", () => {
  const st = world(2), [a, b] = st.mibis; walked(st, a);
  assert.match(T.beginSitting(st, a, "calm", "wood", settings, T0).msg, /no sitting held/); T.devGrantSitting(st, T0);
  assert.match(T.beginSitting(st, b, "calm", "meadow", settings, T0).msg, /no pose seen yet/, "no habit seen");
  assert.match(T.beginSitting(st, a, "sniff", "wood", settings, T0).msg, /pick a pose/); assert.match(T.beginSitting(st, a, "calm", "cave", settings, T0).msg, /pick a place/);
  assert.match(T.beginSitting(st, null, "calm", "wood", settings, T0).msg, /pick a mibi/);
  const o = T.offer(st, a); assert.deepEqual([o.held, o.poses, o.places, o.block], [true, ["calm"], ["meadow", "wood"], ""]); assert.match(T.offer(st, b).block, /no pose seen yet/);
  assert.ok(st.sitting, "a refusal keeps the sitting"); assert.deepEqual(money(st), [0, 0, 0]);
  assert.ok(T.beginSitting(st, a, "calm", "wood", settings, T0).ok);
  T.devGrantSitting(st, T0); assert.match(T.beginSitting(st, a, "calm", "wood", settings, T0).msg, /one sitting each, ever/); assert.ok(T.offer(st, a).portrayed);
});

test("begin: the frame leaves the slot, the crate goes to the bay, the mibi is marked, nothing is spent; a juvenile may sit; a second sitting may begin while a crate waits", () => {
  const st = world(2), m = walked(st, st.mibis[0]); m.born = st.turn;   // a juvenile
  assert.equal(S.mibiStage(st, m), "juvenile"); T.devGrantSitting(st, T0);
  const r = T.beginSitting(st, m, "calm", "wood", settings, T0); assert.ok(r.ok); assert.equal(st.sitting, null); assert.equal(m.portrait.stage, S.mibiStage(st, m, settings), "the stage it sat at"); assert.equal(st.sittingCrates.length, 1);
  assert.deepEqual({ ...st.sittingCrates[0] }, { id: "sit1", mibiId: m.id, pose: "calm", place: "wood", start: T0, source: "dev", painted: false, opened: false });
  assert.deepEqual({ ...m.portrait }, { state: "painting", pose: "calm", place: "wood", crate: "sit1", start: T0, stage: "juvenile" }); assert.deepEqual(money(st), [0, 0, 0]);
  const n = walked(st, st.mibis[1], "shake-dry", "pond"); T.devGrantSitting(st, T0 + 1); assert.ok(T.beginSitting(st, n, "shake-dry", "pond", settings, T0 + 1).ok); assert.equal(st.sittingCrates.length, 2, "two crates wait");
});

test("the crate: the lamp fills with the start and the rule; in the first build the wait alone binds; ready at the later of the wait and the landing; the bay lamp goes amber", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "calm", "wood", settings, T0).crate, sv = { bay: [] };
  const at = (ms, s = settings) => T.crateState(c, s, T0 + ms);
  assert.equal(T.crateLamp(c, settings, T0), 0); assert.equal(T.crateLamp(c, settings, T0 + 1.5 * H), 0.5); assert.equal(at(H), "filling"); assert.equal(T.bayState(st, sv, settings, T0 + H).amber, false);
  assert.equal(T.openSittingCrate(st, c.id, settings, T0 + H).msg, "the crate is still filling");
  assert.equal(at(3 * H), "ready", "no portrait is painted in the first build: the wait alone binds"); assert.equal(T.crateLamp(c, settings, T0 + 3 * H), 1);
  const bay = T.bayState(st, sv, settings, T0 + 3 * H); assert.deepEqual([bay.sitting, bay.total, bay.amber, bay.label], [1, 1, true, "Open the bay"]);
  // the rule is the developer's: a minute, or now, recomputed from the same start
  assert.equal(at(61000, { ...settings, sittingWait: "minute" }), "ready"); assert.equal(at(59000, { ...settings, sittingWait: "minute" }), "filling"); assert.equal(at(0, { ...settings, sittingWait: "now" }), "ready");
  assert.equal(T.sittingWaitMs(settings), 3 * H); assert.equal(T.sittingWaitMs({}), 3 * H, "three hours without a setting");
});

test("a painted portrait is a second wait: with the wait over and the painting not landed the lamp holds just short of full and says nothing; waiting for the cloud only when the Caddy is unreachable", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "calm", "wood", settings, T0).crate;
  const painting = { ...settings, paintPortraits: true };
  assert.equal(T.crateState(c, painting, T0 + 3 * H), "painting"); assert.equal(T.crateLamp(c, painting, T0 + 3 * H), T.LAMP_SHORT); assert.ok(T.LAMP_SHORT < 1 && T.LAMP_SHORT > 0.9);
  assert.equal(T.crateLamp(c, painting, T0 + 100 * H), T.LAMP_SHORT, "a late painting only makes the crate later"); assert.match(T.openSittingCrate(st, c.id, painting, T0 + 4 * H).msg, /still filling/);
  assert.ok(T.crateLamp(c, painting, T0 + 1 * H) < T.LAMP_SHORT, "the lamp fills as before");
  assert.equal(T.crateState(c, { ...painting, caddyReachable: false }, T0 + 3 * H), "waiting for the cloud", "the Caddy is unreachable"); assert.equal(T.crateState(c, { ...settings, painter: "off" }, T0 + 3 * H), "waiting for the cloud", "the developer's painter is off");
  assert.equal(T.crateState(c, { ...settings, caddyReachable: false }, T0 + 1 * H), "filling", "it says nothing while it is still filling");
  assert.ok(T.landPortrait(st, c.id).ok); assert.ok(T.landPortrait(st, c.id).again); assert.ok(!T.landPortrait(st, "nope").ok);
  assert.equal(T.crateState(c, painting, T0 + 1 * H), "filling", "landed early, still not before its time"); assert.equal(T.crateState(c, painting, T0 + 3 * H), "ready"); assert.equal(T.crateLamp(c, painting, T0 + 3 * H), 1);
});

test("open the crate: the portrait is delivered, the crate leaves the bay, the mibi may not sit again, and a walk crate and a sitting crate share the lamp", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "calm", "wood", settings, T0).crate;
  st.dock = { docked: true, at: T0 }; const sv = { bay: [{ id: "x1", n: 1, turn: 3, pods: [] }] };
  assert.equal(T.bayState(st, sv, settings, T0 + 4 * H).total, 2, "one walk crate and one sitting crate");
  const r = T.openSittingCrate(st, c.id, settings, T0 + 4 * H); assert.ok(r.ok); assert.equal(r.ribbon, m.name + "'s portrait"); assert.equal(m.portrait.state, "delivered"); assert.equal(m.portrait.at, T0 + 4 * H);
  assert.deepEqual(st.sittingCrates, []); assert.equal(T.bayState(st, sv, settings, T0 + 4 * H).total, 1);
  assert.match(T.openSittingCrate(st, c.id, settings, T0 + 4 * H).msg, /no such crate/);
  T.devGrantSitting(st, T0); assert.match(T.beginSitting(st, m, "calm", "wood", settings, T0).msg, /one sitting each/);
});

test("a portrayed mibi may be returned to the wild; its portrait stays in the book and it keeps its place as the face", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "calm", "wood", settings, T0).crate; T.openSittingCrate(st, c.id, settings, T0 + 4 * H);
  assert.ok(L.makeFace(st, m).ok); const s0 = st.s, r = S.returnMibi(st, { with: null }, m, settings);
  assert.ok(r.ok); assert.equal(st.s, s0 + 2); assert.ok(m.released); assert.equal(m.portrait.state, "delivered", "released, the portrait stays"); assert.equal(L.faceOf(st, "S01"), m.id);
});

test("an older save loads: the sitting's fields default; a mibi has no habits, no walks and no portrait yet", () => {
  const st = { ...S.freshSt("w1", 3, T0) }; delete st.sittingCrates; delete st.face; delete st.moments; st.mibis = [{ id: 1, name: "Old", sp: 0, species: "S01", from: { g: "meadow" } }];
  S.normalize(st); assert.deepEqual([st.sittingCrates, st.face, st.moments], [[], {}, {}]); assert.deepEqual([st.mibis[0].habits, st.mibis[0].walked, st.mibis[0].portrait], [[], [], null]);
});

test("a deep line pays once: siblings at depth four, and every later child of the line, earn one moment between them", () => {
  const st = world(1), mk = (id, parents) => ({ id, name: "m" + id, species: "S01", parents, genome: {}, read: [] });
  st.mibis.push(mk(201, null), mk(202, null));   // the two founders of the line
  let prev = [{ id: 201 }, { id: 202 }]; const gens = [];
  for (let g = 1; g <= T.DEEP_LINE - 1; g++) { const m = mk(210 + g, prev); st.mibis.push(m); gens.push(m); prev = [{ id: m.id }, { id: 202 }]; }
  const sib1 = mk(230, prev), sib2 = mk(231, prev); st.mibis.push(sib1, sib2);
  assert.equal(T.lineDepth(st, sib1), T.DEEP_LINE); assert.equal(T.lineKey(st, sib1), T.lineKey(st, sib2), "siblings share the line");
  assert.equal(T.momentsEarned(st, settings).filter((m) => m.kind === "line").length, 1, "one moment between the siblings");
  assert.equal(T.collectMoments(st, settings, T0).filter((r) => r.kind === "line" && r.ok).length, 1); st.sitting = null;
  const later = mk(240, [{ id: 230 }, { id: 202 }]); st.mibis.push(later); assert.equal(T.lineDepth(st, later), T.DEEP_LINE + 1);
  assert.deepEqual(T.collectMoments(st, settings, T0 + 1), [], "a later, deeper child of the same line earns nothing more");
  const other = mk(250, null), other2 = mk(251, null); st.mibis.push(other, other2); let p2 = [{ id: 250 }, { id: 251 }];
  for (let g = 0; g < T.DEEP_LINE; g++) { const m = mk(260 + g, p2); st.mibis.push(m); p2 = [{ id: m.id }, { id: 251 }]; }
  assert.equal(T.collectMoments(st, settings, T0 + 2).filter((r) => r.kind === "line" && r.ok).length, 1, "another line, its own moment");
});

test("an act that would earn two moments at once warns first, held or not: S02's sealed read that also fills the guide", () => {
  const id = "S02", fr = frameOf(id), sealed = fr.chapters.find((c) => c.sealed), st = S.freshSt("w1", 3, T0); S.normalize(st);
  const x = S.seedAdults(st, id, 11, 1, settings).mibis[0]; st.sitting = null; st.moments = {};
  for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, id, t.id, L.possibleLooks(fr, t));
  for (const [t, ls] of chapterLooks(fr, sealed, x.genome)) st.guide[id][t] = st.guide[id][t].filter((l) => !ls.includes(l));
  assert.ok(!L.fieldGuide(st, id, settings).complete, "the guide lacks what the sealed chapter shows");
  assert.equal(T.readWarning(st, id, sealed.id, x, settings), T.WARNING, "no sitting held: the sealed read and the guide would both pay, and the slot holds one");
  st.sitting = { source: "dev", key: null, at: T0 }; assert.equal(T.readWarning(st, id, sealed.id, x, settings), T.WARNING, "held: both would be lost");
  st.readOnce[id] = [sealed.id]; st.sitting = null; assert.equal(T.readWarning(st, id, sealed.id, x, settings), "", "already read: nothing to pay");
  const lone = S.freshSt("w1", 3, T0); S.normalize(lone); assert.equal(T.readWarning(lone, id, sealed.id, x, settings), "", "a lone sealed read with nothing held: one moment, no loss");
});

test("a painted portrait is never 'waiting for the cloud', and a released mibi cannot sit", () => {
  const st = world(1), m = walked(st, st.mibis[0]); T.devGrantSitting(st, T0); const c = T.beginSitting(st, m, "calm", "wood", { ...settings, paintPortraits: true }, T0).crate;
  const offline = { ...settings, paintPortraits: true, caddyReachable: false };
  assert.equal(T.crateState(c, offline, T0 + 3 * H), "waiting for the cloud", "not painted, Caddy unreachable");
  T.landPortrait(st, c.id); assert.equal(T.crateState(c, offline, T0 + 3 * H), "ready", "painted: the Caddy no longer matters"); assert.equal(T.crateLamp(c, offline, T0 + 3 * H), 1);
  const g = world(1), r = walked(g, g.mibis[0]); r.released = true; T.devGrantSitting(g, T0); assert.match(T.portraitBlock(g, r), /gone/); assert.ok(!T.beginSitting(g, r, "calm", "wood", settings, T0).ok);
});
