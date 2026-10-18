// X10 (station-x10-economy.md, the game designer): Identify in Data always, the dock spends nothing, the loose refill, loop 2 never stalls, the next goal (goalKey), where a short comes from (shortFrom) and the
// pre-spend warning (goalSpendWarn).
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import { traitLooks } from "../../workbench/framework/describe.mjs";
import * as L from "../src/library.mjs";
import * as S from "../src/state.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "loose" }, decided = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const crate = (n, pods, extra = {}) => ({ id: "x" + n, n, turn: n, at: 0, e: 2, d: 2, s: 0, pods, met: [], explored: 5, of: 20, lines: [], ...extra });
const loikaPod = (i, gs, sp = 0) => ({ id: "p" + i, sp, g: "meadow", how: "calm", gs, k: null });
const sv0 = (crates = []) => ({ v: 8, seed: 7, wid: "w7", turn: 3, bay: crates, mibis: [], carried: [], tier: 1, shield: 3 });
const fresh = () => { const st = S.freshSt("w7", 3, 1000); S.normalize(st); return st; };
const dock = (st, sv, set = settings) => { S.dockKey(st, sv, set, 1000); return S.openBay(st, sv, set, 1000); };
const adults = (st, n, seed = 31) => S.seedAdults(st, "S01", seed, n, settings).mibis;

test("the dock spends nothing, and a fresh save's switch is off", () => {
  const st = fresh(); assert.equal(st.mendFull, false);
  const sv = sv0(); st.probe = { tier: 1, shield: 2, smax: 3 }; st.e = 5; st.dock = { docked: false, at: 1 };
  const r = S.dockKey(st, sv, settings, 1000); assert.equal(r.ok, true); assert.equal(r.mend.paid, 0, "the dock charged nothing for a plate"); assert.equal(st.e, 5);
});

test("the loose refill is { e: 2, d: 3, s: 4 }", () => { assert.deepEqual(S.DEFAULT_SETTINGS.topUp, { e: 2, d: 3, s: 4 }); });

test("loop 2 never stalls: two crates of (2,2,0) and (0,2,0) a trip, a plate lost each trip, Identify in Data, Grow twice", () => {
  const st = fresh(), sv = sv0([crate(1, [loikaPod(1, 11)])]); st.probe = { tier: 1, shield: 2, smax: 3 };
  dock(st, sv); assert.equal(st.e, 4, "crate 1: the walk's ⚡2 and the loose refill's 2"); assert.equal(st.d, 5, "◆2 and the refill's 3");
  const a = st.tray[0]; assert.equal(S.identify(st, a, settings).ok, true); assert.equal(st.d, 4, "Identify costs ◆1");
  assert.equal(S.read(st, a, frameOf("S01").chapters[0].id, settings).ok, true, "the first read ever is free"); assert.equal(st.d, 4);
  assert.equal(S.grow(st, a, {}, settings, 1000).ok, true); assert.equal(st.e, 2, "Grow ⚡2");
  // the first bud is out of the way: loop 2's second crate follows with the incubator free
  st.accepted.push("x1"); sv.bay = [crate(2, [loikaPod(2, 12)], { e: 0, d: 2, s: 0 })]; st.dock = { docked: false, at: 1 }; st.bud = null;
  dock(st, sv); assert.equal(st.e, 4, "crate 2 (0,2,0): the refill's ⚡2 on the 2 left");
  const b = st.tray.find((p) => !p.idd); assert.equal(S.identify(st, b, settings).ok, true);
  assert.equal(S.growBlockKey(st, b, {}, settings), null, "Grow can be paid after the Identify: loop 2 does not stall");
  assert.equal(S.grow(st, b, {}, settings, 2000).ok, true); assert.equal(st.e, 2); assert.ok(st.s >= 0);
});

// ---- where a short comes from ----
test("shortFrom: ⚡ or ❀ short is the field; ❀ alone with a pod in a well is the field or a returned pod; ◆ short is the bench; ◆ with ⚡ or ❀ is both", () => {
  const st = fresh(); st.e = 0; st.d = 0; st.s = 0;
  assert.equal(S.shortFrom(st, 1, 0, 0), "field"); assert.equal(S.shortFrom(st, 0, 0, 4), "field", "no pod in a well: the field alone");
  assert.equal(S.shortFrom(st, 0, 1, 0), "bench"); assert.equal(S.shortFrom(st, 2, 1, 0), "fieldAndBench"); assert.equal(S.shortFrom(st, 0, 1, 4), "fieldAndBench");
  st.tray.push({ id: "p", species: "S01", sp: 0, idd: 1, read: [] }); assert.equal(S.shortFrom(st, 0, 0, 4), "fieldOrPod", "❀ alone short, a pod in a well"); assert.equal(S.shortFrom(st, 2, 0, 4), "field");
  st.e = 9; st.d = 9; st.s = 9; assert.equal(S.shortFrom(st, 1, 1, 1), null, "nothing short");
});

// ---- the next goal ----
const named = (ms, names, borns) => ms.forEach((m, i) => { m.name = names[i]; if (borns) m.born = borns[i]; });
test("goalKey, loops 1 to 3 as named: firstPod, firstMibi with the pod chain, pair, growUp, cross", () => {
  const sv = sv0(), st = fresh(); assert.equal(S.goalKey(st, sv).key, "firstPod"); assert.deepEqual(S.goalKey(st, sv).step, { key: "goOut" });
  // trip 1 docked: firstMibi, openBay, identify, grow, bud
  const sv1 = sv0([crate(1, [loikaPod(1, 11)])]), t = fresh(); S.dockKey(t, sv1, settings, 1000);
  let g = S.goalKey(t, sv1); assert.equal(g.key, "firstMibi"); assert.deepEqual(g.step, { key: "openBay" });
  S.openBay(t, sv1, settings, 1000); g = S.goalKey(t, sv1); assert.equal(g.key, "firstMibi"); assert.deepEqual(g.step, { key: "identify", species: null }, "a fresh game: the goal names no species before the first Identify");
  assert.equal(S.identify(t, t.tray[0], settings).ok, true); assert.deepEqual(S.goalKey(t, sv1).step, { key: "grow", species: "S01" }, "identified: the species is known and named");
  t.d = 0; const u = fresh(); S.dockKey(u, sv0([crate(1, [loikaPod(1, 11)])]), settings, 1000); u.tray.push({ id: "q", sp: 0, species: "S01", g: "meadow", how: "calm", gs: 5, k: null, n: 0, idd: 0, read: [], fresh: 1 }); u.d = 0;
  assert.deepEqual(S.goalKey(u, sv0()).step, { key: "short", icons: "◆", from: "bench" }, "Identify short: the bench's Data");
  assert.equal(S.grow(t, t.tray[0], {}, settings, 1000).ok, true); g = S.goalKey(t, sv1); assert.equal(g.key, "firstMibi"); assert.equal(g.step.key, "bud");
});
test("goalKey: pair with the first living mibi, then growUp counting the bud and the walks, then cross when Cross is open", () => {
  const st = fresh(); const [dot] = adults(st, 1); dot.name = "Dot"; st.dock = { docked: false, at: 1 };
  assert.deepEqual(S.goalKey(st, sv0()), { key: "pair", name: "Dot", species: "S01", step: { key: "findPod", species: "S01" }, probe: null, meanwhile: null });
  // Dot (born 1) + Moss (born 2) at turn 2: two walks; at turn 3: one
  const w = fresh(); const [a, b] = adults(w, 2); named([a, b], ["Dot", "Moss"], [1, 2]); w.turn = 2; w.dock = { docked: false, at: 1 };
  let g = S.goalKey(w, sv0()); assert.equal(g.key, "growUp"); assert.deepEqual(g.names, ["Dot", "Moss"]); assert.equal(g.walks, 2); assert.equal(g.bondedWaits, false); assert.deepEqual(g.step, { key: "goOut" });
  w.turn = 3; assert.equal(S.goalKey(w, sv0()).walks, 1);
  // the bud is the second member
  const x = fresh(); const [d] = adults(x, 1); d.name = "Dot"; x.bud = { kind: "founder", species: "S01", start: 1000, minutes: 5 }; x.dock = { docked: false, at: 1 };
  g = S.goalKey(x, sv0()); assert.equal(g.key, "growUp"); assert.equal(g.step.key, "bud");
  // a bonded juvenile with no grownTurn grows with care
  const y = fresh(); const [p, q] = adults(y, 2); named([p, q], ["Dot", "Moss"], [1, 2]); q.bonded = true; q.grownTurn = null; y.turn = 2; y.dock = { docked: false, at: 1 };
  assert.equal(S.goalKey(y, sv0()).bondedWaits, true);
});
test("goalKey: both adult, no cross → cross (when Cross is open), a short step when ⚡ is short, a block when crossBlock refuses", () => {
  const st = fresh(); const [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"]); st.dock = { docked: true, at: 1 }; st.e = 9; st.s = 9; st.d = 9;
  assert.equal(S.goalKey(st, sv0(), settings, { cross: true }).key, "cross"); assert.deepEqual(S.goalKey(st, sv0(), settings, { cross: true }).step, { key: "cross" });
  st.e = 1; assert.deepEqual(S.goalKey(st, sv0(), settings, { cross: true }).step, { key: "short", icons: "⚡", from: "field" });
  st.e = 9; st.bud = { kind: "founder", species: "S03", start: 1000, minutes: 5 };
  const g = S.goalKey(st, sv0(), settings, { cross: true }); assert.equal(g.key, "cross"); assert.equal(g.step.key, "blocked"); assert.match(g.step.why, /busy/);
});
test("goalKey while Cross is shut: no doors (or cross false) skips cross and readChild and names the guide; growUp stays; the probe is as without the door", () => {
  const st = fresh(); const [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"]); a.read = []; st.dock = { docked: true, at: 1 }; st.e = 9; st.s = 9; st.d = 9; st.probe = { tier: 1, shield: 3, smax: 3 };
  assert.equal(S.goalKey(st, sv0()).key, "guide", "no doors: shut"); assert.equal(S.goalKey(st, sv0(), settings, { cross: false }).key, "guide"); assert.equal(S.goalKey(st, sv0(), settings, { cross: true }).key, "cross");
  // a crossed child on the save and the door shut: readChild is skipped too
  b.from = { how: "cross", of: ["x", "y"] }; b.read = [];
  assert.equal(S.goalKey(st, sv0(), settings, { cross: true }).key, "readChild"); assert.equal(S.goalKey(st, sv0()).key, "guide");
  // growUp is still named while shut, and the probe goal is unchanged
  const w = fresh(); const [c, d] = adults(w, 2); named([c, d], ["Dot", "Moss"], [1, 2]); w.turn = 2; w.dock = { docked: false, at: 1 }; w.probe = { tier: 1, shield: 3, smax: 3 };
  const g = S.goalKey(w, sv0(), settings, { cross: false }); assert.equal(g.key, "growUp"); assert.equal(g.walks, 2); assert.equal(g.probe.key, "save");
  // nothing left to name: every guide is complete
  const z = fresh(); adults(z, 2); fillGuide(z, "S01"); z.probe = { tier: 2, shield: 3, smax: 3 }; assert.equal(S.goalKey(z, sv0()), null, "every guide complete and the Probe at tier 2: no goal");
});

// ---- the guide rung: the first living species whose field guide is not complete ----
const fillGuide = (st, id) => { const fr = frameOf(id); st.readOnce[id] = fr.chapters.map((c) => c.id); for (const ch of fr.chapters) for (const t of ch.traits) S.guideAdd(st, id, t.id, traitLooks(fr, t)); };
test("guideComplete is the Library's own complete, for a fresh, a half-filled and a filled guide", () => {
  const st = fresh(); assert.equal(S.guideComplete(st, "S01"), L.fieldGuide(st, "S01").complete);
  const fr = frameOf("S01"), t = fr.chapters[0].traits[0]; S.guideAdd(st, "S01", t.id, traitLooks(fr, t)); assert.equal(S.guideComplete(st, "S01"), L.fieldGuide(st, "S01").complete); assert.equal(S.guideComplete(st, "S01"), false);
  fillGuide(st, "S01"); assert.equal(S.guideComplete(st, "S01"), true); assert.equal(L.fieldGuide(st, "S01").complete, true);
});
test("the guide rung names the first living species with an incomplete guide and walks read, then identify, then find; null when every guide is complete", () => {
  const st = fresh(); st.e = 9; st.s = 9; st.d = 9; st.dock = { docked: false, at: 1 }; st.probe = { tier: 2, shield: 3, smax: 3 };
  adults(st, 2); S.seedAdults(st, "S04", 41, 1, settings); fillGuide(st, "S01");
  let g = S.goalKey(st, sv0()); assert.equal(g.key, "guide"); assert.equal(g.species, "S04", "S01's guide is complete, S04's is not"); assert.deepEqual(g.step, { key: "findPod", species: "S04" }, "no pod of it: find one");
  const r = S.seedPodFromGenome(st, podGenome(frameOf("S04"), 7), settings, 1000); assert.equal(r.ok, true);
  g = S.goalKey(st, sv0()); assert.equal(g.step.key, "identify"); assert.equal(g.step.species, "S04");
  const pod = st.tray.find((p) => S.speciesOf(p) === "S04"); S.skipIdentify(st, pod);
  g = S.goalKey(st, sv0()); assert.equal(g.step.key, "read"); assert.equal(g.step.pod, pod.id); assert.ok(frameOf("S04").chapters.some((c) => c.id === g.step.chapter));
  st.readEver = true; st.d = 0; const cost = S.readCost(st, pod, g.step.chapter, settings); g = S.goalKey(st, sv0());
  assert.ok(cost > 0, "the first read ever is free; after it a read costs"); assert.equal(g.step.key, "short"); assert.equal(g.step.icons, "◆");
  fillGuide(st, "S04"); assert.equal(S.goalKey(st, sv0()), null, "every guide complete");
});
test("goalKey: the meanwhile read, the probe goal (save, fit) and its outranking", () => {
  const st = fresh(); const [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"], [1, 2]); st.turn = 2; st.dock = { docked: false, at: 1 }; st.readEver = true; st.d = 5;
  const fr = frameOf("S01"), pod = { id: "m", sp: 0, species: "S01", g: "meadow", how: "calm", gs: 7, k: null, n: 0, idd: 1, read: [], fresh: 0 };
  st.tray.push(pod);
  assert.equal(S.goalKey(st, sv0()).key, "growUp");
  const g = S.goalKey(st, sv0()); assert.ok(g.meanwhile, "a read the player can pay for"); assert.equal(g.meanwhile.pod, pod); assert.ok(fr.chapters.some((c) => c.id === g.meanwhile.chapter));
  st.d = 0; assert.equal(S.goalKey(st, sv0()).meanwhile, null, "◆0: nothing can be paid");
  // the probe: null before the pair; save with the figures; fit when docked and tier2Ready, which outranks goOut
  const lone = fresh(); adults(lone, 1); lone.probe = { tier: 1, shield: 3, smax: 3 }; assert.equal(S.goalKey(lone, sv0()).probe, null, "not before growUp");
  st.probe = { tier: 1, shield: 3, smax: 3 }; st.e = 3; assert.deepEqual(S.goalKey(st, sv0()).probe, { key: "save", e: [3, 12], d: [0, 4] });
  st.e = 12; st.d = 4; st.dock = { docked: true, at: 1 }; const f = S.goalKey(st, sv0()); assert.equal(f.probe.key, "fit"); assert.deepEqual(f.step, { key: "fit" }, "fit outranks goOut");
});

// ---- the pre-spend warning ----
test("goalSpendWarn: a spend that would leave the step's next price short warns once; the step itself, an unpriced step and an unpayable next do not", () => {
  const st = fresh(); const [a] = adults(st, 1); a.name = "Dot"; st.dock = { docked: true, at: 1 }; st.e = 2; st.d = 5; st.s = 9;
  const loika = { id: "l", sp: 0, species: "S01", g: "meadow", how: "calm", gs: 3, k: null, n: 0, idd: 1, read: [], fresh: 0 }, tuik = { id: "t", sp: 2, species: "S03", g: "meadow", how: "calm", gs: 4, k: null, n: 0, idd: 0, read: [], fresh: 1 };
  st.tray.push(loika, tuik); assert.deepEqual(S.goalKey(st, sv0()).step, { key: "grow", species: "S01" });
  // a paid mend at the bench (⚡1) with ⚡2 and a Grow of ⚡2 next: short ⚡
  assert.deepEqual(S.goalSpendWarn(st, sv0(), settings, { e: 1 }, { key: "mend" }), { step: "grow", species: "S01", icons: "⚡" });
  assert.equal(S.goalSpendWarn(st, sv0(), settings, { e: 1 }, { key: "grow", pod: loika }), null, "the step's own pod");
  assert.equal(S.goalSpendWarn(st, sv0(), settings, { d: 1 }, { key: "identify", pod: tuik }), null, "◆1 leaves the grow's price payable");
  st.e = 1; assert.equal(S.goalSpendWarn(st, sv0(), settings, { e: 1 }, { key: "mend" }), null, "⚡1 before the spend: the step's own short says so");
  // the step is identify (the pod is unidentified): spending ◆ on another pod's Identify leaves it short of the pair
  const w = fresh(); const [b] = adults(w, 1); b.name = "Dot"; w.dock = { docked: true, at: 1 }; w.e = 9; w.s = 9; w.d = 2;
  const lk = { ...loika, idd: 0, fresh: 1 }, tk = { ...tuik }; w.tray.push(lk, tk); assert.deepEqual(S.goalKey(w, sv0()).step, { key: "identify", species: "S01" });
  assert.deepEqual(S.goalSpendWarn(w, sv0(), settings, { d: 2 }, { key: "read", pod: lk }), { step: "identify", species: "S01", icons: "◆" });
  assert.equal(S.goalSpendWarn(w, sv0(), settings, { d: 1 }, { key: "identify", pod: lk }), null, "the step itself");
  // a step that is a wait is never priced
  const f = fresh(); assert.equal(S.goalSpendWarn(f, sv0(), settings, { d: 1 }, { key: "identify", pod: tuik }), null, "firstPod: goOut");
  const p = fresh(); const [c] = adults(p, 1); c.name = "Dot"; p.dock = { docked: false, at: 1 }; assert.equal(S.goalSpendWarn(p, sv0(), settings, { e: 1 }, { key: "mend" }), null, "findPod");
});

// ---- the guide rung over held species, the Probe stand-in, and where fit stands ----
const seedPods = (st, species, n, seed = 9) => { for (let i = 0; i < n; i++) assert.equal(S.seedPodFromGenome(st, podGenome(frameOf(species), seed + i), settings, 1000 + i).ok, true); };
test("QA trip 4: two adult Loikas with a complete guide, Cross shut: the held Tuikis is the guide's species; fit replaces its step docked and affordable; the Probe stands in when nothing is held; tier 2 and nothing held is the only null", () => {
  const sv = sv0(), st = fresh(); adults(st, 2); fillGuide(st, "S01"); st.dock = { docked: true, at: 0 }; st.probe = { tier: 1, shield: 3, smax: 3 }; st.e = 13; st.d = 14; st.s = 9;
  seedPods(st, "S03", 3); st.knownIds.push("S03");   // a known species (a pod of it was identified before)
  let g = S.goalKey(st, sv, settings, { cross: false });
  assert.equal(g.key, "guide"); assert.equal(g.species, "S03");
  assert.deepEqual(g.step, { key: "fit" }, "fit replaces the guide's identify step while docked and affordable");
  st.dock = { docked: false, at: 0 }; g = S.goalKey(st, sv, settings, { cross: false });
  assert.equal(g.step.key, "identify"); assert.equal(g.probe.key, "save");
  st.tray = []; st.waiting = []; st.dock = { docked: true, at: 0 }; g = S.goalKey(st, sv, settings, { cross: false });
  assert.equal(g.key, "probe"); assert.deepEqual(g.step, { key: "fit" });
  st.e = 3; g = S.goalKey(st, sv, settings, { cross: false });
  assert.equal(g.key, "probe"); assert.equal(g.step.key, "goOut"); assert.deepEqual(g.e, [3, 12]);
  st.probe.tier = 2; assert.equal(S.goalKey(st, sv, settings, { cross: false }), null, "the only null");
});
test("a held species counts for the guide rung whether the pod is identified or waiting, after the living species", () => {
  const sv = sv0(), st = fresh(); adults(st, 2); fillGuide(st, "S01"); st.probe = { tier: 2, shield: 3, smax: 3 }; st.dock = { docked: false, at: 0 };
  st.waiting.push({ id: "w1", species: "S04", sp: 0, g: "meadow", how: "calm", gs: 3, idd: 0, read: [] });
  assert.equal(S.goalKey(st, sv, settings, { cross: false }), null, "an unknown held species is never the guide's (game designer, 2026-10-15)");
  st.knownIds.push("S04"); const g = S.goalKey(st, sv, settings, { cross: false }); assert.equal(g.key, "guide"); assert.equal(g.species, "S04"); assert.deepEqual(g.step, { key: "findPod", species: "S04" }, "a waiting pod is not in a well: find one");
});
test("the goal leak: a fresh game names no species; identifying a pod of S names it; the guide never names an unknown species; no warning when the goal names none and the pod is unknown", () => {
  const sv = sv0(), st = fresh(); st.dock = { docked: false, at: 0 }; st.d = 5; st.e = 20; st.s = 20; seedPods(st, "S01", 1); assert.deepEqual(st.knownIds, []);
  let g = S.goalKey(st, sv, settings, { cross: false }); assert.equal(g.key, "firstMibi"); assert.deepEqual(g.step, { key: "identify", species: null });
  seedPods(st, "S03", 1); g = S.goalKey(st, sv, settings, { cross: false }); assert.equal(g.step.species, null, "two unknown pods: still no species");
  const other = st.tray.find((p) => p.species === "S03" && !p.idd); st.d = 1;
  assert.equal(S.goalSpendWarn(st, sv, settings, { d: 1 }, { key: "identify", pod: other }), null, "identifying another unknown pod with ◆ 1 left: no warning");
  assert.equal(S.goalSpendWarn(st, sv, settings, { d: 1 }, { key: "read" }), null, "no nameless warning string for any act");
  st.d = 5; const first = st.tray.find((p) => p.species === "S01"); assert.equal(S.identify(st, first, settings).ok, true); assert.ok(st.knownIds.includes("S01"));
  g = S.goalKey(st, sv, settings, { cross: false }); assert.equal(g.step.key, "grow"); assert.equal(g.step.species, "S01", "the goal for a known species names it");
  st.tray = st.tray.filter((p) => p.species !== "S01"); g = S.goalKey(st, sv, settings, { cross: false }); assert.ok(g.key !== "guide" || g.species !== "S03", "the guide never names the unknown S03");
});
test("careful: Dot and Moss growing up, one unidentified Tuikis pod in a well: the goal is growUp, not the pod", () => {
  const sv = sv0(), st = fresh(); const [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"], [1, 2]); st.turn = 2; st.dock = { docked: false, at: 0 }; st.probe = { tier: 1, shield: 3, smax: 3 };
  seedPods(st, "S03", 1); assert.equal(S.goalKey(st, sv, settings, { cross: false }).key, "growUp");
});
test("a Loika pod while the goal is the pair (Dot) gives the identify step", () => {
  const sv = sv0(), st = fresh(); const [a] = adults(st, 1); named([a], ["Dot"]); st.dock = { docked: false, at: 0 }; st.d = 5; seedPods(st, "S01", 1);
  const g = S.goalKey(st, sv, settings, { cross: false }); assert.equal(g.key, "pair"); assert.deepEqual(g.step, { key: "identify", species: "S01" });
});
test("with Cross shut at the cross moment (two adults, a Probe below tier 2) the second goal is save or fit", () => {
  const st = fresh(); adults(st, 2); st.dock = { docked: false, at: 0 }; st.probe = { tier: 1, shield: 3, smax: 3 }; st.e = 2; st.d = 0;
  const g = S.goalKey(st, sv0(), settings, { cross: false }); assert.ok(g.probe && ["save", "fit"].includes(g.probe.key), "the probe goal stands beside the guide");
});
test("goalSpendWarn: a read that leaves ◆ under the crossed child's read price warns ◆ (Cross open); an Identify of another pod warns ◆ when it leaves the goal's Identify short", () => {
  const st = fresh(), [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"]); b.from = { how: "cross", of: ["x", "y"] }; b.read = []; st.dock = { docked: false, at: 0 }; st.e = 9; st.s = 9;
  st.readEver = true;   // the first read ever is free: after it a read costs
  st.d = 9;
  const doors = { cross: true }, g = S.goalKey(st, sv0(), settings, doors); assert.equal(g.key, "readChild"); assert.equal(g.step.key, "read");
  const ch = frameOf("S01").chapters.find((c) => !b.read.includes(c.id)), cost = S.mibiReadCost(st, b, ch.id, settings); assert.ok(cost > 0, "a read costs once the first is done"); st.d = cost;
  const w = S.goalSpendWarn(st, sv0(), settings, { d: 1 }, { key: "other" }, doors); assert.equal(w.step, "read"); assert.equal(w.name, "Moss"); assert.equal(w.icons, "◆");
  // Identify in ◆: the goal's next price is an Identify, and another pod's Identify leaves it short
  const s2 = fresh(); const [dot] = adults(s2, 1); named([dot], ["Dot"]); s2.dock = { docked: false, at: 0 }; s2.d = 1; seedPods(s2, "S01", 1); seedPods(s2, "S04", 1, 33);
  const other = s2.tray.find((p) => S.speciesOf(p) === "S04"), warn = S.goalSpendWarn(s2, sv0(), settings, { d: S.identifyCost(s2, settings) }, { key: "identify", pod: other });
  assert.equal(warn.step, "identify"); assert.equal(warn.icons, "◆");
  const mine = s2.tray.find((p) => S.speciesOf(p) === "S01"); assert.equal(S.goalSpendWarn(s2, sv0(), settings, { d: 1 }, { key: "identify", pod: mine }), null, "identifying the goal's own pod warns of nothing");
});

// ---- GD Q2: the tier is read through tierNow (a save with no Probe takes the world's tier); a null Probe with an empty ladder goes out, never fits ----
test("a null Probe with an empty ladder: sv tier 1 is the Probe goal with step goOut (never fit); sv tier 2 is the only null; growUp with a null Probe saves up", () => {
  const sv = (tier) => ({ ...sv0(), tier }), mk = () => { const st = fresh(); adults(st, 2); fillGuide(st, "S01"); st.probe = null; st.dock = { docked: true, at: 0 }; st.e = 20; st.d = 20; st.s = 9; return st; };
  const g = S.goalKey(mk(), sv(1), settings, { cross: false }); assert.equal(g.key, "probe"); assert.equal(g.step.key, "goOut", "never fit without a Probe"); assert.deepEqual(g.e, [20, 12]);
  assert.equal(S.goalKey(mk(), sv(2), settings, { cross: false }), null, "tier 2 from the world: nothing left to name");
  const st = fresh(), [a, b] = adults(st, 2); named([a, b], ["Dot", "Moss"], [1, 2]); st.turn = 2; st.dock = { docked: false, at: 0 }; st.probe = null;
  const w = S.goalKey(st, sv(1), settings, { cross: false }); assert.equal(w.key, "growUp"); assert.equal(w.probe.key, "save");
});
