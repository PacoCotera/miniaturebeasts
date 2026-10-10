// The rules fixes (the game designer's brief): bred buds keep their unread chapters, sealed founders, ... Each section is a fix with its tests.   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome, forecast as crossForecast } from "../src/genome.mjs";
import * as S from "../src/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const lcg = (seed) => { let x = seed >>> 0; return () => { x = (Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (x >>> 8) / 16777216; }; };
const MIN = 60000, T0 = 1000;
const rich = (st) => { st.e = 99; st.d = 99; st.s = 99; return st; };
const fresh = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); return rich(st); };
// a pod of the species, identified, with its read chapters
function podOf(st, id, read = [], gs = 5) { S.seedPodFromGenome(st, podGenome(frameOf(id), gs), settings, T0); const p = st.tray[st.tray.length - 1]; S.skipIdentify(st, p); p.read = [...read]; return p; }
const chapters = (id) => frameOf(id).chapters.map((c) => c.id);
const known = (st, id, s, now) => chapters(id).filter((c) => S.budChapterKnown(st, c, s, now));

// ---- 1. bred buds keep their unread chapters ----
test("B1 a founder clears its unread chapters at (k + 1) / (n + 1) of the wait; the first bud at 75, 150 and 225 s; at the hatch it is read in full", () => {
  const st = fresh(); st.firstMibi = false; const p = podOf(st, "S01", ["coat"]);
  assert.equal(S.grow(st, p, {}, settings, T0).ok, true); assert.equal(st.bud.minutes, 20);
  const [coat, face, movement, stamina] = chapters("S01"); assert.deepEqual([coat, face, movement, stamina].length, 4);
  for (const [ch, at] of [[face, 5], [movement, 10], [stamina, 15]]) { assert.equal(S.budChapterKnown(st, ch, settings, T0 + at * MIN - 1), false, ch + " 1 ms before"); assert.equal(S.budChapterKnown(st, ch, settings, T0 + at * MIN), true, ch + " at +" + at); }
  assert.equal(S.budChapterKnown(st, coat, settings, T0), true);
  const o = S.openBud(st, null, settings, T0 + 20 * MIN); assert.deepEqual(o.mibi.read, chapters("S01"), "a founder opens known in every chapter");
  const f = fresh(); const q = podOf(f, "S01", ["coat"]); assert.equal(f.firstMibi, true); S.grow(f, q, {}, settings, T0); assert.equal(f.bud.minutes, 5);
  for (const [ch, ms] of [[face, 75000], [movement, 150000], [stamina, 225000]]) { assert.equal(S.budChapterKnown(f, ch, settings, T0 + ms - 1), false); assert.equal(S.budChapterKnown(f, ch, settings, T0 + ms), true); }
});
function crossed(seedAdultsSeed = 3, rngSeed = 7) {
  const st = fresh(), r = S.seedAdults(st, "S01", seedAdultsSeed, 2, settings), [a, b] = r.mibis, c = S.doCross(st, { with: null }, a, b, settings, T0, lcg(rngSeed));
  assert.equal(c.ok, true, c.msg); return st;
}
test("B2 a cross: the chapters the Station could be sure of are known from the start and the rest never, while it grows, at ready and after", () => {
  const st = crossed(), B = st.bud; assert.equal(B.kind, "cross"); assert.deepEqual(B.read, ["coat"], "the pair's firm chapters");
  const [coat, ...rest] = chapters("S01"); assert.equal(S.budChapterKnown(st, coat, settings, T0), true);
  for (const m of [0, 5, 10, 15, 20, 60]) { for (const ch of rest) assert.equal(S.budChapterKnown(st, ch, settings, T0 + m * MIN), false, `${ch} at +${m} min`); assert.deepEqual(known(st, "S01", settings, T0 + m * MIN), ["coat"], `+${m}`); }
  assert.equal(S.budReady(st, settings, T0 + 20 * MIN), true);
  const o = S.openBud(st, null, settings, T0 + 20 * MIN); assert.deepEqual(o.mibi.read, ["coat"]);
});
test("B3 a cross with Grow now: ready at once, the unread chapters still unknown, Open gives the same read", () => {
  const st = crossed(); const c = S.instantGrowCost(st, settings, T0 + MIN); assert.equal(c.s, 10, "19 minutes left: 10 Essence");
  assert.equal(S.instantGrow(st, settings, T0 + MIN).ok, true); assert.equal(S.budReady(st, settings, T0 + MIN), true);
  assert.equal(S.budChapterKnown(st, chapters("S01")[1], settings, T0 + MIN), false); assert.deepEqual(known(st, "S01", settings, T0 + MIN), ["coat"]);
  assert.deepEqual(S.openBud(st, null, settings, T0 + MIN).mibi.read, ["coat"]);
});
test("B4 a cross with skipBud mid and ready: as B2", () => {
  for (const how of ["mid", "ready"]) { const st = crossed(); S.skipBud(st, settings, how); const now = Date.now() + 5; assert.deepEqual(known(st, "S01", settings, now), ["coat"], how); if (how === "ready") assert.deepEqual(S.openBud(st, null, settings, now).mibi.read, ["coat"]); }
});
test("B5 a cross with nothing known: nothing is ever known and the child is read in nothing", () => {
  const st = crossed(31); st.bud.read = []; for (const m of [0, 10, 20, 60]) assert.deepEqual(known(st, "S01", settings, T0 + m * MIN), [], `+${m}`);
  assert.deepEqual(S.openBud(st, null, settings, T0 + 20 * MIN).mibi.read, []);
});
test("B6 a founder with Grow now: every chapter is known right after", () => {
  const st = fresh(); st.firstMibi = false; const p = podOf(st, "S01", ["coat"]); S.grow(st, p, {}, settings, T0); assert.equal(S.instantGrow(st, settings, T0 + MIN).ok, true);
  assert.deepEqual(known(st, "S01", settings, T0 + MIN), chapters("S01"));
});

// ---- 6. sealed founders ----
test("a founder of a species with a sealed chapter opens without it while it is shut, and with it when sealedOpen; the Incubator's chapters agree with the hatch", () => {
  const sealed = frameOf("S02").chapters.find((c) => c.sealed); assert.ok(sealed);
  for (const open of [false, true]) {
    const s = { ...settings, sealedOpen: open }, st = fresh(); st.firstMibi = false; const p = podOf(st, "S02", []); S.grow(st, p, {}, s, T0);
    const all = chapters("S02"), want = open ? all : all.filter((c) => c !== sealed.id);
    assert.deepEqual(known(st, "S02", s, T0 + 60 * MIN), want, "sealedOpen " + open + ": the chapters the bud shows known when ready");
    const o = S.openBud(st, null, s, T0 + 60 * MIN); assert.deepEqual(o.mibi.read, want, "the hatch agrees");
  }
});

// ---- 3. names never carry a digit ----
test("N1 the first two names are Dot and Moss; a fresh save has no names used", () => {
  const st = S.freshSt("w1", 1, T0); assert.deepEqual(st.namesUsed, []); assert.equal(S.drawName(st), "Dot"); assert.equal(S.drawName(st), "Moss"); assert.deepEqual(st.namesUsed, ["dot", "moss"]);
});
test("N2 no name carries a digit over 5,000 draws; N4 the pool's order: names, heads × tails, head + tail + tail, all unique", () => {
  const st = S.freshSt("w1", 1, T0), pool = { names: ["Dot", "Moss", "Bean"], heads: ["Ka", "Lo", "Mi", "Ne", "Pu", "Ro", "Su", "Te", "Va", "Wi", "Xe", "Yo"], tails: ["ri", "sa", "mo", "vu", "li", "po", "ke", "na", "do", "fi", "gu", "ha"] };
  const seen = new Set(); for (let i = 0; i < 5000; i++) { const n = S.drawName(st, pool); assert.ok(!/\d/.test(n), n); assert.ok([...n].length <= S.NAME_MAX, n); assert.ok(!seen.has(S.nameKey(n)), "unique " + n); seen.add(S.nameKey(n)); }
  const s2 = S.freshSt("w1", 1, T0), p2 = { names: ["A", "B"], heads: ["Ka", "Lo"], tails: ["ri", "sa"] };
  assert.deepEqual(Array.from({ length: 12 }, () => S.drawName(s2, p2)), ["A", "B", "Kari", "Lori", "Kasa", "Losa", "Kariri", "Loriri", "Kasari", "Losari", "Karisa", "Lorisa"]);
});
test("N3 a released name is never redrawn, and a migrated name blocks its look-alike", () => {
  const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); const [dot] = st.mibis; assert.equal(dot.name, "Dot"); dot.released = true; assert.ok(st.namesUsed.includes("dot"));
  assert.equal(S.drawName(st), "Bean", "Dot and Moss are used, the third name is next"); st.mibis.push({ ...dot, id: 99, name: "Fíg", released: false }); S.normalize(st); assert.ok(st.namesUsed.includes("fig"));
  assert.notEqual(S.drawName(st), "Fig", "FIG blocks Fig");
  const s2 = S.freshSt("w1", 1, T0); s2.mibis.push({ ...dot, id: 5, name: "DOT" }); S.normalize(s2); assert.equal(S.drawName(s2), "Moss", "a migrated DOT blocks Dot");
});
test("nameKey: lowercase, accents and the separators (space, hyphen, ’) gone, the apostrophe folded", () => {
  assert.equal(S.nameKey("Mo-Mo"), "momo"); assert.equal(S.nameKey("Mómo"), "momo"); assert.equal(S.nameKey("Mo Mo"), "momo"); assert.equal(S.nameKey("Œuf"), "oeuf"); assert.equal(S.nameKey("ŒUF"), "oeuf");
  assert.equal(S.nameKey("Mo'Mo"), "momo"); assert.equal(S.nameKey("Mo’Mo"), "momo");
  const st = S.freshSt("w1", 1, T0); st.namesUsed = ["momo"];
  assert.equal(S.drawName(st, { names: ["Mo Mo", "Nib"] }), "Nib", "a used key blocks the pool's look-alike");
});
test("the safety-net name tier gives capitalised names, never 'aa'", () => {
  const g = S.namePool({ names: [], heads: [], tails: [] }); const first = [g.next().value, g.next().value, g.next().value];
  assert.deepEqual(first, ["Aa", "Ba", "Ca"]); assert.ok(first.every((n) => /^[A-Z]/.test(n)));
});
test("N5 a save with digit names: renamed in id order, the references follow, and a second normalize changes nothing", () => {
  const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); const [a, b] = st.mibis;
  a.name = "Pebble 2"; b.name = "Moss 2"; a.code = "CODEAAAAA"; b.code = "CODEBBBBB";
  const child = { ...a, id: 7, name: "Wren", parents: [{ id: a.id, name: "Pebble 2" }, { id: b.id, name: "Moss 2" }], from: { n: 0, g: "meadow", how: "cross", podId: null, of: ["Pebble 2", "Moss 2"] } }; st.mibis.push(child);
  st.releases.push({ id: a.id, name: "Pebble 2", species: "S01" }); st.guideNotes.S01 = [{ name: "Pebble 2", code: "CODEAAAAA", turn: 1 }, { name: "Other", code: "ZZZ", turn: 1 }];
  delete st.namesUsed; st.log = [];   // an old save: no names used yet
  S.normalize(st); const names = st.mibis.map((m) => m.name); assert.ok(names.every((n) => !/\d/.test(n)), names.join());
  assert.equal(a.name, "Dot", "id order, first of the pool that is free (Dot and Moss are free: their holders were Pebble 2 and Moss 2)"); assert.equal(b.name, "Moss");
  assert.deepEqual(child.parents.map((q) => q.name), [a.name, b.name]); assert.deepEqual(child.from.of, [a.name, b.name]); assert.equal(st.releases[0].name, a.name); assert.equal(st.guideNotes.S01[0].name, a.name); assert.equal(st.guideNotes.S01[1].name, "Other");
  assert.equal(st.log.filter((l) => / · Renamed /.test(l)).length, 2);
  const once = JSON.stringify(st); S.normalize(st); assert.equal(JSON.stringify(st), once, "idempotent");
});
test("N6 the three callers draw as drawName does", () => {
  const st = fresh(); const names = []; for (let i = 0; i < 3; i++) { const p = podOf(st, "S01", chapters("S01")); st.firstMibi = false; S.grow(st, p, {}, settings, T0); names.push(S.openBud(st, null, settings, T0 + 60 * MIN).mibi.name); }
  S.seedAdults(st, "S01", 5, 2, settings); names.push(...st.mibis.slice(3).map((m) => m.name)); S.seedSiblings(st, "S01", 9, settings); names.push(...st.mibis.slice(5).map((m) => m.name));
  const ref = S.freshSt("w1", 1, T0); assert.deepEqual(names, names.map(() => S.drawName(ref)), "the same sequence"); assert.equal(new Set(names.map(S.nameKey)).size, names.length);
});

// ---- 4. the bench Data trickle ----
import { watchFrame, compareAfterKey, habitatShown } from "../src/trickle.mjs";
const NOON = new Date(2026, 9, 9, 12, 0).getTime(), sv0 = { with: null, wid: "w1", seed: 7 };
const watchFor = (st, m, ms, s = settings, now = NOON) => { let r, left = ms; while (left > 0) { const dt = Math.min(250, left); r = S.benchWatch(st, sv0, m, dt, s, now); left -= dt; } return r; };
const bench = () => { const st = fresh(); S.seedAdults(st, "S01", 3, 2, settings); st.d = 0; return st; };
test("T1 a minute earns +1 Data once a resident a day: 59,999 ms nothing, 60,000 earns, a second minute nothing", () => {
  const st = bench(), [m] = st.mibis; let r = watchFor(st, m, 59999); assert.equal(r.earned, 0); assert.equal(st.d, 0);
  r = S.benchWatch(st, sv0, m, 1, settings, NOON); assert.equal(r.earned, 1); assert.equal(st.d, 1); assert.match(st.log.at(-1), /Bench · watched Dot · \+1 Data/);
  r = watchFor(st, m, 60000); assert.equal(r.earned, 0); assert.equal(st.d, 1); assert.deepEqual(S.benchToday(st, NOON, settings), { d: 1, cap: 2, full: false });
});
test("T2 a minute split over two visits earns; T3 a released or with-you resident earns nothing; T4 dt is clamped to 250 ms", () => {
  const st = bench(), [a, b] = st.mibis; watchFor(st, a, 30000); watchFor(st, b, 1000); assert.equal(st.d, 0); assert.equal(watchFor(st, a, 30000).earned, 1, "30 s and 30 s");
  const s2 = bench(), [c, d] = s2.mibis; d.released = true; assert.equal(watchFor(s2, d, 120000).earned, 0); const sv = { with: c.id }; let e = 0; for (let i = 0; i < 400; i++) e += S.benchWatch(s2, sv, c, 250, settings, NOON).earned; assert.equal(e, 0);
  const s3 = bench(); S.benchWatch(s3, sv0, s3.mibis[0], 10000, settings, NOON); assert.equal(s3.bench.watchMs[s3.mibis[0].id], 250);
});
test("T5 and T6 a compare: state 0 nothing, state 1 +1, B × A the same day nothing; a pair with nothing read on both earns nothing", () => {
  const st = bench(), [a, b] = st.mibis, mk = (x, y, state) => ({ st, sv: sv0, settings, cross: { aId: x.id, bId: y.id, state }, now: NOON });
  assert.equal(compareAfterKey(mk(a, b, 0)), null); assert.equal(st.d, 0); assert.equal(compareAfterKey(mk(a, b, 1)).earned, 1); assert.equal(st.d, 1); assert.match(st.log.at(-1), /Bench · compared/);
  assert.equal(compareAfterKey(mk(b, a, 1)).earned, 0, "B × A is the same pair"); assert.equal(compareAfterKey(mk(a, b, 2)).earned, 0); assert.equal(st.d, 1);
  const s2 = bench(), [c, d] = s2.mibis; c.read = ["coat"]; d.read = ["face"]; assert.equal(S.benchCompare(s2, sv0, c, d, settings, NOON).earned, 0, "nothing read on both"); d.read = ["coat"]; assert.equal(S.benchCompare(s2, sv0, c, d, settings, NOON).earned, 1);
});
test("T7 the cap stops a third earn, and then nothing is earned; T9 a cap of 0 is off", () => {
  const st = bench(); S.seedAdults(st, "S01", 4, 2, settings); const [a, b, c] = st.mibis; assert.equal(watchFor(st, a, 60000).earned, 1); assert.equal(S.benchCompare(st, sv0, a, b, settings, NOON).earned, 1);
  assert.deepEqual(S.benchToday(st, NOON, settings), { d: 2, cap: 2, full: true }); assert.equal(watchFor(st, c, 60000).earned, 0); assert.equal(st.d, 2);
  const off = bench(), s0 = { ...settings, trickleCap: 0 }; assert.equal(watchFor(off, off.mibis[0], 120000, s0).earned, 0); assert.equal(off.d, 0); assert.equal(S.benchCompare(off, sv0, off.mibis[0], off.mibis[1], s0, NOON).earned, 0);
});
test("T8 the day is the local date: 23:59 then 00:00 resets; moving the clock back keeps the ledger", () => {
  const st = bench(), [a] = st.mibis, late = new Date(2026, 9, 9, 23, 59).getTime(), next = new Date(2026, 9, 10, 0, 0).getTime();
  watchFor(st, a, 60000, settings, late); assert.equal(st.bench.d, 1); assert.equal(S.benchToday(st, late, settings).d, 1);
  assert.equal(S.benchToday(st, next, settings).d, 0, "a new day"); assert.equal(st.bench.day, "2026-10-10");
  assert.equal(watchFor(st, a, 60000, settings, next).earned, 1, "earns again on the new day");
  assert.equal(S.benchToday(st, late, settings).d, 1, "an earlier date keeps the ledger"); assert.equal(st.bench.day, "2026-10-10");
});
test("T10 to T12 the watch records the first unseen habit at the minute; with every habit seen it still earns; a full cap still records it", () => {
  const st = bench(), [a] = st.mibis, fr = frameOf("S01"); assert.ok(fr.habits.length >= 2); a.habits = [];
  watchFor(st, a, 59000); assert.deepEqual(a.habits, []); const r = watchFor(st, a, 1000); assert.equal(r.earned, 1); assert.deepEqual(a.habits, [fr.habits[0]], "the first unseen, in frame order");
  const s2 = bench(), [b] = s2.mibis; b.habits = [...fr.habits]; assert.equal(watchFor(s2, b, 60000).earned, 1); assert.deepEqual(b.habits, fr.habits, "all seen: nothing to record");
  const s3 = bench(); s3.bench = { day: "2026-10-09", d: 2, watchMs: {}, watched: [], compared: [] }; const [c] = s3.mibis; c.habits = [fr.habits[0]]; const f = watchFor(s3, c, 60000); assert.equal(f.earned, 0); assert.equal(s3.d, 0); assert.deepEqual(c.habits, [fr.habits[0], fr.habits[1]], "a full cap still records the habit");
});
test("the frame hook watches only the shown resident, on Habitat, awake; Idle and other screens accumulate nothing", () => {
  const st = bench(), [a, b] = st.mibis, base = { st, sv: sv0, settings, habId: null, dt: 250, now: NOON };
  assert.equal(habitatShown(st, sv0, null).id, a.id); assert.equal(habitatShown(st, sv0, b.id).id, b.id); assert.equal(habitatShown(st, { with: a.id }, null).id, b.id, "the first not with you");
  assert.equal(watchFrame({ ...base, screen: "home", idle: false }), null); assert.equal(watchFrame({ ...base, screen: "habitat", idle: true }), null); assert.equal(st.bench, undefined);
  for (let i = 0; i < 240; i++) watchFrame({ ...base, screen: "habitat", idle: false }); assert.equal(st.d, 1); assert.deepEqual(Object.keys(st.bench.watchMs), [String(a.id)]);
});

// ---- 5. who may cross: adults and elders, never a juvenile ----
test("each stage at the cross: a juvenile is barred, an adult and an elder may cross, and partners list the adults and elders", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis;
  assert.equal(S.mibiStage(st, a, settings), "adult");
  assert.equal(S.crossBlock(st, null, a, b, settings), "", "two adults cross");
  b.born = st.turn; assert.equal(S.mibiStage(st, b, settings), "juvenile"); assert.equal(S.crossBlock(st, null, a, b, settings), "not adult", "a juvenile does not");
  assert.deepEqual(S.crossPartners(st, null, a, settings), [], "and is not a partner");
  b.born = st.turn - S.JUVENILE_TURNS - S.ELDER_TURNS; assert.equal(S.mibiStage(st, b, settings), "elder"); assert.equal(S.crossBlock(st, null, a, b, settings), "", "an elder crosses");
  assert.deepEqual(S.crossPartners(st, null, a, settings), [b]);
});

// ---- 7. twelve mibis a vivarium ----
test("the bays clamp to 12 (1 at least), whatever the setting or the save holds", () => {
  const st = fresh();
  for (const [bays, want] of [[6, 6], [12, 12], [20, 12], [99, 12], [1, 1]]) assert.equal(S.bayCount(st, { ...settings, bays }), want, "bays " + bays);
  st.bays = 30; assert.equal(S.bayCount(st, { ...settings, bays: 0 }), 12, "a save that holds more than 12");
});
test("the forms: gains read '❀ +1', spends '⚡ −1 ❀ −2' with a true minus on the figure", () => {
  assert.equal(S.gainText(2), "❀ +2"); assert.equal(S.spendText(1, 0, 2), "⚡ −1 ❀ −2"); assert.equal(S.spendText(0, 3, 0), "◆ −3"); assert.equal(S.spendText(0, 0, 0), "free");
});

// ---- 8. elder age follows the juvenile span ----
test("a mibi is an elder at j + ELDER_TURNS, where j is the adultTurns setting (2 and 4)", () => {
  const st = fresh(); const m = { born: 0 };
  for (const j of [2, 4]) {
    const s = { ...settings, adultTurns: j };
    for (const [age, want] of [[j - 1, "juvenile"], [j, "adult"], [j + S.ELDER_TURNS - 1, "adult"], [j + S.ELDER_TURNS, "elder"]]) { st.turn = age; assert.equal(S.mibiStage(st, m, s), want, "j " + j + " age " + age); }
  }
});

// ---- 9. the copywriter's need() strings ----
test("need(): counts spelled out, dropped above the picture, shortfalls as icon + figure", () => {
  const st = fresh(); st.firstMibi = false;
  const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
  const fake = (n) => Array.from({ length: n }, (_, i) => ({ id: "x" + i, idd: 0, read: [], g: "meadow" }));
  for (const [n, want] of [[1, "a new pod waits"], [2, "two new pods wait"], [6, "six new pods wait"], [7, "new pods wait"]]) { st.tray = fake(n); assert.equal(S.need(st, sv, settings).text, want, "fresh " + n); assert.equal(S.need(st, sv, settings).label, "Look at the pods"); }
  st.tray = []; for (const [n, want] of [[1, "a pod waits for a well"], [3, "three pods wait for a well"], [7, "pods wait for a well"]]) { st.waiting = fake(n); assert.equal(S.need(st, sv, settings).text, want, "waiting " + n); }
  st.waiting = [];
  st.docked = true; st.dock = { docked: true, at: 0 };
  const crates = (n) => { sv.bay = Array.from({ length: n }, (_, i) => ({ id: "c" + i, n: i + 1, turn: 1, at: 0, e: 0, d: 0, s: 0, pods: [] })); };
  for (const [n, want] of [[1, "a crate waits in the bay"], [2, "two crates wait in the bay"], [3, "three crates wait in the bay"], [4, "crates wait in the bay"]]) { crates(n); const r = S.need(st, sv, settings); assert.equal(r.text, want, "crates " + n); assert.equal(r.label, "Open the bay"); }
});
test("need(): a pod that cannot yet grow or be read says what is short, with no dot", () => {
  const st = fresh(); st.firstMibi = false; const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
  const p = podOf(st, "S01", ["coat"]); st.e = 0; st.s = 0;
  const c = S.growCost(st, {}, settings);
  const short = S.need(st, sv, settings).text; assert.ok(/^a pod grows with ⚡ \d+ ❀ \d+ more$/.test(short) || /^a pod grows with (⚡|❀) \d+ more$/.test(short), short); assert.ok(!/·/.test(short));
  st.e = 99; st.s = 99; assert.match(S.need(st, sv, settings).text, /^(a|an) \w+ pod could grow$/); void c; void p;
});

// ---- 10. sitting order ----
import * as T from "../src/sitting.mjs";
test("poses are offered in the frame's habit order, however they were seen", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const m = st.mibis[0], hs = frameOf("S01").habits;
  assert.ok(hs.length >= 2); m.habits = [];
  for (const h of hs.slice().reverse()) S.recordHabit(st, m, h);
  assert.deepEqual(S.habitsOf(m), hs.slice().reverse(), "seen in reverse"); assert.deepEqual(T.offer(st, m).poses, hs, "offered in frame order");
});
test("a bred mibi's places are only the ones it walked to; a founder keeps its pod's place first", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis;
  const child = { ...a, id: 99, from: { n: 0, g: a.from.g, how: "cross", podId: null, of: [a.name, b.name] }, walked: [] };
  assert.deepEqual(S.placesOf(child), [], "no walks, no places"); child.walked = ["pond"]; assert.deepEqual(S.placesOf(child), ["pond"]);
  const f = { from: { g: "meadow", how: "ground" }, walked: ["pond", "meadow", "wood"] }; assert.deepEqual(S.placesOf(f), ["meadow", "pond", "wood"]);
});

// ---- 11. who may sit ----
test("a juvenile may sit, and its portrait keeps the stage it sat at after it grows", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const m = st.mibis[0];
  m.born = st.turn; assert.equal(S.mibiStage(st, m, settings), "juvenile");
  S.recordHabit(st, m, S.frameFor(m).habits[0]); S.recordWalk(st, m, "wood"); T.devGrantSitting(st, T0);
  assert.equal(T.portraitBlock(st, m), "", "no stage check");
  const r = T.beginSitting(st, m, S.habitsOf(m)[0], "wood", settings, T0); assert.ok(r.ok, r.msg); assert.equal(m.portrait.stage, "juvenile");
  st.turn += 5; assert.equal(S.mibiStage(st, m, settings), "adult"); assert.equal(m.portrait.stage, "juvenile", "the portrait shows that stage forever");
});
test("a mibi out with the Companion sits only while the Companion is docked; at home, undocked, it sits; a sitting begun docked goes on after undocking", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const [a, b] = st.mibis;
  for (const m of [a, b]) { S.recordHabit(st, m, S.frameFor(m).habits[0]); S.recordWalk(st, m, "wood"); }
  const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: [], mibis: [], with: a.id, tier: 1, shield: 3 };
  T.devGrantSitting(st, T0);
  st.dock = { docked: false, at: T0 };
  assert.equal(T.portraitBlock(st, a, sv), "sits when you dock", "carried and undocked is refused");
  assert.match(T.beginSitting(st, a, S.habitsOf(a)[0], "wood", settings, T0, sv).msg, /sits when you dock/); assert.match(T.offer(st, a, sv).block, /sits when you dock/);
  assert.equal(T.portraitBlock(st, b, sv), "", "at home and undocked passes");
  st.dock = { docked: true, at: T0 }; assert.equal(T.portraitBlock(st, a, sv), "", "carried and docked passes");
  const r = T.beginSitting(st, a, S.habitsOf(a)[0], "wood", settings, T0, sv); assert.ok(r.ok, r.msg);
  st.dock = { docked: false, at: T0 + 1 }; assert.equal(a.portrait.state, "painting", "a sitting begun while docked continues after undocking");
});

// ---- review fixes ----
test("seedSiblings: each sibling's read is the list doCross gives a child at kinship 0", () => {
  const st = fresh(); st.settings = undefined; const r = S.seedSiblings(st, "S01", 4242, { ...settings, bays: 12 }); assert.ok(r.ok, r.msg);
  const [a, b] = r.parents, fr = frameOf("S01");
  for (const m of r.mibis) { assert.deepEqual(m.read, S.childKnownChapters(fr, crossForecast(fr, a.genome, b.genome, { kinship: 0 }))); assert.ok(m.read.length < fr.chapters.length, "not every chapter is firm"); }
});
test("a sitting is refused for want of a pose, and separately for want of a walk", () => {
  const st = fresh(); S.seedAdults(st, "S01", 5, 2, settings); const m = st.mibis[0]; T.devGrantSitting(st, T0);
  m.habits = []; m.walked = []; m.from = { ...m.from, g: null };
  assert.match(T.portraitBlock(st, m), /no pose seen yet/); S.recordHabit(st, m, S.frameFor(m).habits[0]);
  assert.match(T.portraitBlock(st, m), new RegExp(m.name + " needs a walk first"));
});
