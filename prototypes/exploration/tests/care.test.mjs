// The Companion's care and carried set (the care save shape, C0): the real functions are read out of index.html and run
// in a sandbox with the rest of the page stubbed, as in trips.test.mjs. Where a check needs the Station's side
// (prototypes/station/src/state.mjs: stageAt, carriedIds, carryAdd, mergeCare, tripCarried), it runs once that side has
// landed and is skipped until then, so the agreement tests switch on by themselves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import vm from "node:vm";
import { decodePNG } from "../tools/atlas-check.mjs";
import { decodeExact } from "../src/atlas.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const FIXTURE = () => JSON.parse(readFileSync(new URL("../../station/tests/fixtures/save-v8-care-before.json", import.meta.url), "utf8"));

// The source of one top-level declaration: a function (to its closing brace) or a one-line const.
function source(name) {
  const fn = PAGE.match(new RegExp("^function " + name + "\\(", "m"));
  if (fn) {
    let i = PAGE.indexOf("{", fn.index), depth = 0, q = null;
    for (; i < PAGE.length; i++) {
      const c = PAGE[i];
      if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
      if (c === "'" || c === '"' || c === "`") q = c;
      else if (c === "/" && PAGE[i + 1] === "/") i = PAGE.indexOf("\n", i);
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) return PAGE.slice(fn.index, i + 1);
    }
  }
  const k = PAGE.match(new RegExp("^const " + name + " = .*$", "m"));
  if (k) return k[0];
  throw new Error("not found in index.html: " + name);
}
const plain = x => JSON.parse(JSON.stringify(x));
// The one species accessor (SP_OTHER, spOf, mibiSpName, abTextOf), for the checks that run a few functions on their own.
const ACCESSOR = () => PAGE.match(/^const SP_OTHER = [^]*?\n(?=\/\/)/m)[0] + ["spOf", "mibiSpName", "abTextOf"].map(source).join("\n") + "\n";

// The Station's side, when it has landed.
const ST = await import("../../station/src/state.mjs");
const station = (...names) => names.every(n => typeof ST[n] === "function") ? false : "the Station's side (" + names.join(", ") + ") has not landed on main";
{ const { setFrames } = await import("../../station/src/genome.mjs"), dir = new URL("../../workbench/frames/", import.meta.url).pathname;
  setFrames(readdirSync(dir).filter(f => f.startsWith("species-")).map(f => JSON.parse(readFileSync(path.join(dir, f), "utf8")))); }

// A clock the sandbox reads through `new Date()`: day "YYYY-MM-DD" at noon local time.
function clockAt(day) { const [y, m, d] = day.split("-").map(Number), at = new Date(y, m - 1, d, 12).getTime();
  return class extends Date { constructor(...a) { super(...(a.length ? a : [at])); } }; }

const CARE = ["mibiById", "listWords", "localDay", "stageAt", "mibiStage", "isAdult", "isCarried", "carriedMibis", "homeMibis", "partnerMibi",
  "grownNow", "agedNow", "rosterList", "canSwap", "releasedIds", "takeMibi", "leaveMibi", "canTend", "tend", "bondCheck", "growCheck", "migrateCarried", "normalizeCare",
  "carryApply", "canWalk", "walkAll", "tripRecord", "TRIP_KINDS", "tripsWith", "liveMibis", "setLead", "nextLead", "LEAD_Y", "rosterAt", "rosterCount", "rosterRect", "rosterOff"];
// The care functions over a world: S, docked or not, on a given day. ctx.S, ctx.Date and the flags can change between calls.
function world(S, o = {}) {
  const env = { docked: !!o.docked, log: [] };
  const ctx = vm.createContext({ console, S, Date: clockAt(o.day || "2026-10-09"), JUVENILE_TURNS: 2, ELDER_TURNS: 6, CARRY_MAX: 3, BOND_TENDS: 3,
    isDocked: () => env.docked, stPart: () => env.st || null, logEv: t => env.log.push(t) });
  const names = CARE.filter(n => !["JUVENILE_TURNS", "CARRY_MAX"].includes(n));
  const out = vm.runInContext(names.map(source).join("\n") + "\n;({ " + names.join(", ") + " })", ctx);
  return Object.assign(out, { ctx, env, setDay: d => { ctx.Date = clockAt(d); }, setS: s => { ctx.S = s; } });
}
const mibi = (id, name, o = {}) => Object.assign({ id, name, sp: (id - 1) % 3, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }, o);
const save = (o = {}) => Object.assign({ v: 8, turn: 3, exp: null, walkTurn: -1, mibis: [mibi(1, "Dot"), mibi(2, "Moss"), mibi(3, "Fig"), mibi(4, "Pip")], carried: [], lead: null, carrySeen: 0, carryRefused: [], trips: [] }, o);
const stageCases = function* () { for (const born of [0, 1, 2, 3]) for (const bonded of [false, true]) for (const grownTurn of [null, 2, 5]) for (let turn = 0; turn <= 14; turn++) yield { born, bonded, grownTurn, turn }; };

// ---- §3: one definition of the stage ----
const STAGE_AT = `function stageAt(m, turn, j, e) {
  if (m.grownTurn != null) return turn >= m.grownTurn + e ? 'elder' : 'adult';
  if (m.bonded) return 'juvenile';                       // a bonded juvenile waits (14)
  const age = turn - (m.born || 0); return age < j ? 'juvenile' : age >= j + e ? 'elder' : 'adult';
}`;
test("stageAt is the C0 text exactly, and mibiStage reads it with the constants", () => {
  assert.equal(source("stageAt"), STAGE_AT);
  assert.match(source("mibiStage"), /stageAt\(m, S\.turn, JUVENILE_TURNS, ELDER_TURNS\)/);
  const t = world(save());
  assert.equal(t.stageAt({ born: 0 }, 1, 2, 6), "juvenile"); assert.equal(t.stageAt({ born: 0 }, 2, 2, 6), "adult"); assert.equal(t.stageAt({ born: 0 }, 8, 2, 6), "elder");
  assert.equal(t.stageAt({ born: 0, bonded: true }, 30, 2, 6), "juvenile", "a bonded juvenile waits");
  assert.equal(t.stageAt({ born: 0, bonded: true, grownTurn: 7 }, 12, 2, 6), "adult"); assert.equal(t.stageAt({ born: 0, bonded: true, grownTurn: 7 }, 13, 2, 6), "elder");
});
test("T1 parity: the Companion's stageAt and the Station's agree on every case", { skip: station("stageAt") }, () => {
  const t = world(save());
  for (const c of stageCases()) { const m = { born: c.born, bonded: c.bonded, grownTurn: c.grownTurn };
    assert.equal(t.stageAt(m, c.turn, 2, 6), ST.stageAt(m, c.turn, 2, 6), JSON.stringify(c)); }
});

// ---- Tend ----
test("Tend: a carried mibi, once per local day; same day refused; the clock moved back refused and resets nothing; next day allowed", () => {
  const S = save({ carried: [1] }), t = world(S, { day: "2026-10-09" }), dot = S.mibis[0];
  assert.equal(t.localDay(), "2026-10-09");
  assert.equal(t.canTend(dot), true);
  assert.deepEqual(plain(t.tend(dot)), { bonded: false, grown: false });
  assert.equal(dot.care, 1); assert.equal(dot.tends, 1); assert.equal(dot.tendDay, "2026-10-09");
  assert.equal(t.canTend(dot), false); assert.equal(t.tend(dot), null, "refused the same day");
  assert.equal(dot.care, 1); assert.equal(dot.tends, 1);
  t.setDay("2026-10-08"); assert.equal(t.tend(dot), null, "the clock moved back");
  assert.equal(dot.tendDay, "2026-10-09", "tendDay unchanged"); assert.equal(dot.care, 1);
  t.setDay("2026-10-10"); assert.ok(t.tend(dot)); assert.equal(dot.care, 2); assert.equal(dot.tends, 2); assert.equal(dot.tendDay, "2026-10-10");
  t.setDay("2027-01-01"); assert.ok(t.tend(dot), "a new year is a later day (string order)");
});
test("Tend: never a mibi at home, never mid-expedition; any carried mibi, bonded or not, gains care (Spend time is gone)", () => {
  const S = save({ carried: [1] }), t = world(S), [dot, moss] = S.mibis;
  assert.equal(t.tend(moss), null, "at home"); assert.equal(moss.care, 0);
  S.exp = { n: 5 }; assert.equal(t.tend(dot), null, "mid-expedition"); assert.equal(dot.care, 0);
  S.exp = null; assert.equal(dot.bonded, false); t.tend(dot); assert.equal(dot.care, 1, "unbonded: care counts");
  assert.ok(!/spendTime|Spend time/.test(PAGE), "no Spend time anywhere");
  assert.match(source("tendPress"), /tend\(m\)/);
});
test("localDay is the local date, never UTC", () => {
  assert.match(source("localDay"), /getFullYear\(\).*getMonth\(\).*getDate\(\)/);
  assert.ok(!/toISOString/.test(source("localDay")));
  const t = world(save(), { day: "2026-03-05" }); assert.equal(t.localDay(), "2026-03-05");
});

// ---- The Walk ----
test("Walk: all carried together, +1 outing and +1 care each, once per world turn, undocked, between expeditions", () => {
  const S = save({ carried: [1, 2, 3] }), t = world(S), [dot, moss, fig, pip] = S.mibis;
  const evs = t.walkAll();
  assert.equal(evs.length, 3); assert.deepEqual(plain(evs.map(e => e.m.id)), [1, 2, 3], "carried order");
  for (const m of [dot, moss, fig]) { assert.equal(m.outings, 1); assert.equal(m.care, 1); assert.equal(m.tends, 0, "a walk is not a Tend"); }
  assert.equal(pip.outings, 0); assert.equal(pip.care, 0, "a mibi at home does not walk");
  assert.equal(t.walkAll(), null, "once per world turn"); assert.equal(dot.care, 1);
  S.turn = 4; t.env.docked = true; assert.equal(t.walkAll(), null, "docked: no walk");
  t.env.docked = false; S.exp = { n: 6 }; assert.equal(t.walkAll(), null, "mid-expedition: no walk");
  S.exp = null; S.carried = []; assert.equal(t.canWalk(), false, "no one with you");
  S.carried = [1]; assert.ok(t.walkAll()); assert.equal(dot.care, 2);
});

// ---- The bond ----
test("the bond: three Tends, no outing needed; the third Tend bonds, bondCare = care then; checked after a Tend only", () => {
  const S = save({ carried: [1, 2], turn: 1 }), t = world(S), [dot, moss] = S.mibis;
  for (let turn = 1; turn <= 6; turn++) { S.turn = turn; t.walkAll(); }
  assert.equal(moss.care, 6); assert.equal(moss.bonded, false, "walks grow but never bond");
  S.turn = 1; dot.care = 0; dot.outings = 0; dot.tends = 0; S.walkTurn = -1;
  ["2026-10-09", "2026-10-10", "2026-10-11"].forEach((d, i) => { t.setDay(d); const r = t.tend(dot); assert.equal(r.bonded, i === 2, "Tend " + (i + 1)); });
  assert.equal(dot.tends, 3); assert.equal(dot.outings, 0); assert.equal(dot.bonded, true, "three Tends and no outing: bonded");
  assert.equal(dot.bondCare, 3, "bondCare = care at the third Tend"); assert.equal(dot.grownTurn, null, "a juvenile when it bonds: it waits for care");
  assert.equal(t.bondCheck(dot), false, "once");
  assert.ok(t.env.log.includes("Dot is bonded with you"));
  assert.match(source("tend"), /bondCheck\(m\)[^]*growCheck\(m\)/, "bond, then growth");
  assert.match(source("walkAll"), /q\.care = \(q\.care \|\| 0\) \+ 1; out\.push\(\{ m: q, bonded: false, grown: growCheck\(q\) \}\)/);
  assert.ok(!/bondCheck\(/.test(source("walkAll")), "a Walk never checks the bond");
});
test("the bond: a carried mibi with 3 Tends and 0 outings bonds on the 3rd Tend; a Walk alone never bonds, even with tends >= 3", () => {
  const S = save({ carried: [1, 2], turn: 1 }), t = world(S), [dot, moss] = S.mibis;
  ["2026-10-09", "2026-10-10"].forEach(d => { t.setDay(d); assert.equal(t.tend(dot).bonded, false); });
  t.setDay("2026-10-11"); const r = t.tend(dot); assert.equal(r.bonded, true, "the 3rd Tend bonds"); assert.equal(dot.outings, 0);
  moss.tends = 3; moss.outings = 0; moss.care = 3;
  for (let turn = 1; turn <= 4; turn++) { S.turn = turn; const evs = t.walkAll(); for (const e of evs) assert.equal(e.bonded, false, "a Walk never returns bonded: true"); }
  assert.equal(moss.bonded, false, "Walks alone never bond"); assert.equal(moss.outings, 4); assert.equal(moss.care, 7);
});

// ---- T6: growth through care (rulings 1 and 3) ----
test("T6: bonded at turn 1, at home until 6, carried: juvenile after the expedition to 7; the first Walk at 7 grows it; elder at 13", () => {
  const S = save({ carried: [1], turn: 1 }), t = world(S, { day: "2026-10-01" }), dot = S.mibis[0];
  dot.tends = 2;
  const r = t.tend(dot); assert.equal(r.bonded, true); assert.equal(r.grown, false);
  assert.equal(dot.grownTurn, null); assert.equal(t.mibiStage(dot), "juvenile");
  S.carried = [];   // left at home
  for (let turn = 2; turn <= 6; turn++) { S.turn = turn;
    assert.equal(t.grownNow(dot), false); assert.equal(t.agedNow(dot), false); assert.equal(t.mibiStage(dot), "juvenile", "turn " + turn);
    assert.equal(t.growCheck(dot), false, "at home: no growth"); }
  S.carried = [1]; assert.equal(t.mibiStage(dot), "juvenile", "carried at 6");
  S.turn = 7; assert.equal(t.mibiStage(dot), "juvenile", "after the expedition that ends at turn 7");
  const evs = t.walkAll(); assert.equal(evs[0].grown, true); assert.equal(dot.grownTurn, 7);
  for (const [turn, stage] of [[7, "adult"], [12, "adult"], [13, "elder"]]) { S.turn = turn; assert.equal(t.mibiStage(dot), stage, "turn " + turn); }
  S.turn = 13; assert.equal(t.agedNow(dot), true, "the elder line at grownTurn + 6");
  if (!station("stageAt")) for (const turn of [6, 7, 12, 13]) assert.equal(ST.stageAt(dot, turn, 2, 6), t.stageAt(dot, turn, 2, 6));
});
test("T6: the bonding Tend leaves it juvenile (care == bondCare); the next day's Tend grows it", () => {
  const S = save({ carried: [2], turn: 4 }), t = world(S, { day: "2026-10-09" }), moss = S.mibis[1];
  moss.born = 3; moss.tends = 2; moss.care = 5;
  let r = t.tend(moss); assert.deepEqual(plain(r), { bonded: true, grown: false });
  assert.equal(moss.bondCare, 6); assert.equal(moss.care, 6); assert.equal(t.mibiStage(moss), "juvenile");
  t.setDay("2026-10-10"); r = t.tend(moss); assert.deepEqual(plain(r), { bonded: false, grown: true });
  assert.equal(moss.grownTurn, 4); assert.equal(t.mibiStage(moss), "adult");
  assert.equal(t.growCheck(moss), false, "once");
});
test("T6: a bonded juvenile never grows on the clock: no grownTurn, no clock grow or elder line, carried or at home", () => {
  const S = save({ carried: [1] }), t = world(S), [dot, moss] = S.mibis;
  Object.assign(dot, { bonded: true, bondCare: 0 }); Object.assign(moss, { bonded: true, bondCare: 0 });
  for (let turn = 0; turn <= 20; turn++) { S.turn = turn;
    for (const m of [dot, moss]) { assert.equal(t.grownNow(m), false); assert.equal(t.agedNow(m), false); assert.equal(t.mibiStage(m), "juvenile"); assert.equal(m.grownTurn, null); } }
  // the world-turn advance writes its lines from grownNow and agedNow, and nothing on the turn or at the expedition's end grows a mibi
  assert.match(source("worldTurn"), /const grown = liveMibis\(\)\.filter\(grownNow\), aged = liveMibis\(\)\.filter\(agedNow\)/);
  for (const fn of ["worldTurn", "endExpedition"]) assert.ok(!/growCheck\(|bondCheck\(|grownTurn =/.test(source(fn)), fn + " never grows or bonds");
  // an unbonded mibi grows on the clock as built: the line at born + 2, elder at born + 8
  const fig = S.mibis[2]; S.turn = 2; assert.equal(t.grownNow(fig), true); S.turn = 8; assert.equal(t.agedNow(fig), true);
});
test("T6: born 0, bonded at turn 5 gets grownTurn 2 (the constant), elder at 8; a juvenile bonded at turn 1 gets none", () => {
  const S = save({ carried: [1, 2], turn: 5 }), t = world(S), [dot, moss] = S.mibis;
  dot.tends = 3; assert.equal(t.bondCheck(dot), true);
  assert.equal(dot.grownTurn, 2); S.turn = 7; assert.equal(t.mibiStage(dot), "adult"); S.turn = 8; assert.equal(t.mibiStage(dot), "elder");
  assert.match(source("bondCheck"), /m\.grownTurn = \(m\.born \|\| 0\) \+ JUVENILE_TURNS/, "the constant, never a developer setting");
  if (!station("stageAt", "mibiStage")) for (const adultTurns of [2, 1, 0]) for (let turn = 5; turn <= 14; turn++) {
    S.turn = turn; assert.equal(ST.mibiStage({ turn }, dot, { adultTurns }), t.mibiStage(dot), "adultTurns " + adultTurns + ", turn " + turn); }
  S.turn = 1; moss.tends = 3; assert.equal(t.bondCheck(moss), true); assert.equal(moss.grownTurn, null);
});

// ---- The carried set: Take, Leave, the roster ----
test("Take and Leave: docked between expeditions only; Take refused at three; leaving the lead clears it", () => {
  const S = save({ carried: [1] }), t = world(S, { docked: false }), [dot, moss, fig, pip] = S.mibis;
  assert.deepEqual(plain(t.takeMibi(moss)), { ok: false, why: "swap" }, "undocked: no swap"); assert.deepEqual(plain(S.carried), [1]);
  assert.equal(t.leaveMibi(dot).ok, false, "undocked: no leave");
  t.env.docked = true; S.exp = { n: 4 }; assert.deepEqual(plain(t.takeMibi(moss)), { ok: false, why: "swap" }, "mid-expedition, even docked"); assert.equal(t.leaveMibi(dot).ok, false);
  S.exp = null;
  assert.equal(t.takeMibi(fig).ok, true); assert.equal(t.takeMibi(moss).ok, true); assert.deepEqual(plain(S.carried), [1, 3, 2], "the end of the carried order");
  assert.deepEqual(plain(t.takeMibi(pip)), { ok: false, why: "full" }); assert.equal(S.carried.length, 3);
  S.lead = 3; assert.equal(t.leaveMibi(fig).ok, true); assert.equal(S.lead, null); assert.deepEqual(plain(S.carried), [1, 2]);
  assert.equal(t.takeMibi(pip).ok, true); assert.deepEqual(plain(S.carried), [1, 2, 4]);
});
test("the roster: undocked or mid-expedition only the carried; docked the carried first, then home in hatch order", () => {
  const S = save({ carried: [3, 1] }), t = world(S, { docked: false });
  assert.deepEqual(t.rosterList().map(m => m.id), [3, 1]);
  t.env.docked = true; assert.deepEqual(t.rosterList().map(m => m.id), [3, 1, 2, 4]);
  S.exp = { n: 2 }; assert.deepEqual(t.rosterList().map(m => m.id), [3, 1]);
  S.exp = null; S.carried = []; t.env.docked = false; assert.deepEqual(t.rosterList(), []);
});
test("partner: the lead if carried and grown; else the first grown carried; else none", () => {
  const S = save({ turn: 3, carried: [2, 1, 3], lead: null }), t = world(S), [dot, moss, fig] = S.mibis;
  moss.born = 3;   // a juvenile, first in carried order
  assert.equal(t.partnerMibi().id, 1, "the first grown");
  S.lead = 3; assert.equal(t.partnerMibi().id, 3, "the lead");
  S.lead = 2; assert.equal(t.partnerMibi().id, 1, "a juvenile lead does not lead");
  S.lead = 4; assert.equal(t.partnerMibi().id, 1, "a lead at home is treated as none");
  dot.born = 3; fig.born = 3; assert.equal(t.partnerMibi(), null, "no one grown");
  S.carried = []; assert.equal(t.partnerMibi(), null);
});

// ---- The expedition: outings, notches, the trip ----
function ending(S, ex, reason = "home") {
  const t = vm.createContext({ console, S, G: { land: [] }, LAND_NAME: ["meadow"], TIER_NAME: ["", "starter"], BAY: 3, JUVENILE_TURNS: 2, ELDER_TURNS: 6,
    reachCounts: () => ({ surveyed: 1, total: 9 }), walkTier: () => 1, walkYield: () => 2, addMat: (k, n) => n, passable: () => true, canStep: () => true, dropPods: () => {},
    worldTurn: () => { S.turn++; S.expN++; return ["The world turned."]; }, logEv: () => {}, CARE_TEXT: { notch: n => n + " gains a skill notch" }, transition: () => {}, save: () => {} });
  const names = ["endExpedition", "exploredAny", "holdEmpty", "carriedMibis", "mibiById", "tripRecord", "tripsWith", "TRIP_KINDS"];
  vm.runInContext(names.map(source).join("\n") + "\n;endExpedition(" + JSON.stringify(reason) + ");", Object.assign(t, { __ex: ex }));
}
test("an expedition: an outing to every carried mibi, notches to the bonded partner only, no care; the trip carries `carried`", () => {
  const ex = n => ({ n, pos: 0, trail: [0], cargo: { e: 0, d: 0, s: 0, pods: [] }, stats: { calls: 1 }, stormCells: {}, entered: [0], met: [], moments: [], abUsed: true, tripPlaces: ["meadow"] });
  const S = save({ carried: [1, 2, 3], expN: 5, shield: 3, hist: [], bay: [], hold: null, ui: {}, visited: [] });
  S.exp = Object.assign(ex(5), { pt: { id: 1 } });
  ending(S, S.exp);
  const [dot, moss, fig, pip] = S.mibis;
  for (const m of [dot, moss, fig]) { assert.equal(m.outings, 1); assert.equal(m.care, 0, "an expedition is not care"); }
  assert.equal(pip.outings, 0); assert.equal(dot.notches, 0, "an unbonded partner earns no notch");
  assert.deepEqual(plain(S.trips.at(-1)), { v: 1, n: 5, partner: 1, places: ["meadow"], storm: false, carried: [1, 2, 3] });
  dot.bonded = true; dot.bondCare = 0; S.exp = Object.assign(ex(6), { pt: { id: 1 }, cargo: { e: 1, d: 0, s: 0, pods: [] } }); ending(S, S.exp);
  assert.equal(dot.notches, 1, "the bonded partner"); assert.equal(moss.notches, 0);
  assert.deepEqual(plain(S.report.notch), { id: 1, name: "Dot", sp: 0 }, "named on End expedition as the outcome block's row, with no count");
  assert.deepEqual(plain(S.report.lines), ["The world turned."], "never among the world lines");
  assert.deepEqual(plain(S.bay.at(-1).lines), ["The world turned."], "the crate keeps the world's lines only");
  moss.bonded = true; S.exp = Object.assign(ex(7), { pt: { id: 1 } }); ending(S, S.exp); assert.equal(moss.notches, 0, "a bonded mibi that is not the partner");
  const t = world(save()); const rec = t.tripRecord({ n: 3 }, S.carried); S.carried.push(9);
  assert.deepEqual(plain(rec.carried), [1, 2, 3], "a copy"); assert.deepEqual(plain(t.tripRecord({ n: 3 }).carried), []);
});
// ---- The notch rule (ruling 17:33): only on an expedition that explored something; a break keeps it ----
const notchExp = (calls, o = {}) => Object.assign({ n: 5, pos: 0, trail: [0], cargo: { e: 0, d: 0, s: 0, pods: [] }, stats: { calls }, stormCells: {}, entered: [0], met: [], moments: [],
  abUsed: 1, pt: { id: 1 }, tripPlaces: ["meadow"] }, o);
const notchSave = () => save({ carried: [1], expN: 5, shield: 3, hist: [], bay: [], hold: null, ui: {}, visited: [] });
const NOTCH_LINE = "Dot gains a skill notch";
test("notch: a bonded partner digs, makes no Call, End expedition: notches unchanged, no notch line", () => {
  const S = notchSave(), dot = S.mibis[0]; dot.bonded = true; dot.notches = 1;
  S.exp = notchExp(0); ending(S, S.exp, "home");
  assert.equal(dot.notches, 1); assert.ok(S.report.waited, "nothing explored");
  assert.ok(!S.report.lines.includes(NOTCH_LINE)); assert.equal(S.report.notch, null, "no notch row");
});
test("notch: a bonded partner digs, makes a Call, then the Probe breaks: +1 and the line", () => {
  const S = notchSave(), dot = S.mibis[0]; dot.bonded = true; dot.notches = 1;
  S.exp = notchExp(1); ending(S, S.exp, "break");
  assert.equal(dot.notches, 2);
  assert.equal(S.report.notch && S.report.notch.name, "Dot", "the notch row"); assert.ok(!S.report.lines.includes(NOTCH_LINE), "never a world line");
});
test("notch: an unbonded partner makes a Call and digs: no notch", () => {
  const S = notchSave(), dot = S.mibis[0];
  S.exp = notchExp(1); ending(S, S.exp, "home");
  assert.equal(dot.notches, 0);
  assert.ok(!S.report.lines.includes(NOTCH_LINE)); assert.equal(S.report.notch, null, "no notch row");
});
test("notch: already at 3 stays 3, no line", () => {
  const S = notchSave(), dot = S.mibis[0]; dot.bonded = true; dot.notches = 3;
  S.exp = notchExp(1); ending(S, S.exp, "home");
  assert.equal(dot.notches, 3);
  assert.ok(!S.report.lines.includes(NOTCH_LINE)); assert.equal(S.report.notch, null, "no notch row");
});
test("T5: a trip record without `carried` reads as [partner] on the Station; with it, every id", { skip: station("tripCarried") }, () => {
  assert.deepEqual(ST.tripCarried({ v: 1, n: 1, partner: 2, places: [], storm: false }), [2]);
  assert.deepEqual(ST.tripCarried({ v: 1, n: 1, partner: null, places: [], storm: false }), []);
  const t = world(save()); assert.deepEqual(plain(ST.tripCarried(t.tripRecord({ n: 2, pt: { id: 1 } }, [1, 3]))), [1, 3]);
});

// ---- §5: the save ----
test("migration from `with`: the fixture's Companion part, and a second run changes nothing", () => {
  const sv = FIXTURE(), t = world(sv);
  t.migrateCarried(sv); t.normalizeCare(sv);
  assert.deepEqual(plain(sv.carried), [1]); assert.equal(sv.lead, 1); assert.equal(sv.carrySeen, 0);
  assert.ok(!("with" in sv)); assert.equal(sv.withSeen, 1, "withSeen kept, frozen, for the Station's step"); assert.deepEqual(plain(sv.carryRefused), []);
  const [dot, moss, fig] = sv.mibis;
  assert.deepEqual([dot.bondCare, dot.grownTurn], [0, 2], "Dot: adult, elder at 8");
  assert.deepEqual([moss.bondCare, moss.grownTurn], [0, null], "Moss: a juvenile that waits");
  assert.equal(fig.grownTurn, null); assert.equal(fig.bondCare, undefined);
  for (const m of sv.mibis) { assert.equal(m.care, 0); assert.equal(m.tends, 0); assert.equal(m.tendDay, null); }
  assert.deepEqual([t.mibiStage(dot), t.mibiStage(moss), t.mibiStage(fig)], ["adult", "juvenile", "adult"]);
  sv.turn = 8; assert.equal(t.mibiStage(dot), "elder"); sv.turn = 4;
  const once = JSON.stringify(sv); t.migrateCarried(sv); t.normalizeCare(sv); assert.equal(JSON.stringify(sv), once, "idempotent");
  // `with` naming no mibi of the Companion's: nothing carried
  const lost = { mibis: [mibi(1, "Dot")], with: 9, withSeen: 2, turn: 0 }; t.migrateCarried(lost); assert.deepEqual(plain(lost.carried), []);
  const none = { mibis: [], with: null, turn: 0 }; t.migrateCarried(none); assert.deepEqual(plain(none.carried), []); assert.equal(none.lead, null);
  assert.match(source("load"), /migrateCarried\(S\); normalizeCare\(S\);/);
  assert.match(source("save"), /syncStation\(\); normalizeCare\(S\);/, "after every dock read, defaults only");
  assert.ok(!/releasedIds/.test(source("save")), "save never drops released ids: only the dock gate does");
});
test("ruling 2 on the fixture: Moss at home stays juvenile through 14; carried, one Walk at turn 5 grows it; Dot elder at 8", () => {
  const sv = FIXTURE(), t = world(sv); t.migrateCarried(sv); t.normalizeCare(sv);
  const [dot, moss] = sv.mibis;
  for (let turn = 4; turn <= 14; turn++) { sv.turn = turn; assert.equal(t.mibiStage(moss), "juvenile"); assert.equal(t.grownNow(moss), false); }
  sv.turn = 5; sv.carried = [2]; const evs = t.walkAll();
  assert.equal(moss.care, 1); assert.equal(moss.grownTurn, 5); assert.equal(evs[0].grown, true);
  sv.turn = 8; assert.equal(t.mibiStage(dot), "elder");
});
test("normalizeCare: defaults for the additive fields; ids not in S.mibis dropped; old bonds back-filled once", () => {
  const S = { turn: 6, mibis: [{ id: 1, name: "Dot", born: 0, bonded: true, care: 2 }, { id: 2, name: "Moss", born: 5, bonded: true }, { id: 3, name: "Fig", born: 0 }], carried: [1, 7, 1, 2] };
  const t = world(S); t.normalizeCare(S);
  assert.deepEqual(plain(S.carried), [1, 2]); assert.equal(S.lead, null); assert.equal(S.carrySeen, 0); assert.deepEqual(plain(S.carryRefused), []);
  assert.deepEqual([S.mibis[0].bondCare, S.mibis[0].grownTurn], [2, 2]); assert.deepEqual([S.mibis[1].bondCare, S.mibis[1].grownTurn], [0, null]);
  assert.deepEqual(plain(S.mibis[2]), { id: 3, name: "Fig", born: 0, care: 0, tends: 0, outings: 0, notches: 0, tendDay: null, grownTurn: null });
  const once = JSON.stringify(S); t.normalizeCare(S); assert.equal(JSON.stringify(S), once);
});
test("a new world: the carried set, no `with`; SAVE_V stays 8", () => {
  assert.match(source("worldFields"), /mibis: \[\], carried: \[\], lead: null, carrySeen: 0, carryRefused: \[\]/);
  assert.ok(!/\bwith: null\b|withSeen: 0, probeSeen/.test(source("worldFields")));
  assert.match(PAGE, /SAVE_KEY = 'mb-save-v8', SAVE_V = 8/);
});

// ---- §1: the Station's requests, applied at the dock (T3 and T7, the Companion's half) ----
test("carryApply: in seq order, each once; full, carried, released and unknown refused and kept; home removes; twice changes nothing", () => {
  const S = save({ carried: [1], lead: 1 }), t = world(S);
  const st = { mibis: S.mibis.map(m => ({ id: m.id, name: m.name, released: false })), carryReqs: [{ seq: 2, op: "add", id: 3 }, { seq: 1, op: "add", id: 2 }] };
  assert.deepEqual(plain(t.carryApply(S, st)), [{ op: "add", id: 2, ok: true }, { op: "add", id: 3, ok: true }]);
  assert.deepEqual(plain(S.carried), [1, 2, 3]); assert.equal(S.carrySeen, 2); assert.deepEqual(plain(S.carryRefused), [], "an applied add appends nothing");
  const after = JSON.stringify(S); t.carryApply(S, st); assert.equal(JSON.stringify(S), after, "apply twice: nothing");
  st.carryReqs.push({ seq: 3, op: "add", id: 4 });
  assert.deepEqual(plain(t.carryApply(S, st)), [{ op: "add", id: 4, ok: false, why: "full" }]);
  assert.equal(S.carrySeen, 3, "a refusal advances carrySeen"); assert.deepEqual(plain(S.carryRefused), [{ seq: 3, id: 4, why: "full" }]);
  st.carryReqs.push({ seq: 4, op: "home", id: 1 }, { seq: 5, op: "home", id: 4 });
  t.carryApply(S, st); assert.deepEqual(plain(S.carried), [2, 3]); assert.equal(S.lead, null, "the lead went home"); assert.equal(S.carrySeen, 5);
  assert.equal(S.carryRefused.length, 1, "a home that is a no-op appends nothing");
  st.mibis[3].released = true;
  st.carryReqs.push({ seq: 6, op: "add", id: 2 }, { seq: 7, op: "add", id: 4 }, { seq: 8, op: "add", id: 99 });
  t.carryApply(S, st);
  assert.deepEqual(plain(S.carryRefused), [{ seq: 6, id: 2, why: "carried" }, { seq: 7, id: 4, why: "released" }, { seq: 8, id: 99, why: "unknown" }], "the last three; the oldest dropped");
  assert.equal(S.carrySeen, 8);
});
test("carryApply waits mid-expedition: carrySeen unchanged until the expedition ends", () => {
  const S = save({ carried: [1], exp: { n: 4 } }), t = world(S), st = { mibis: [], carryReqs: [{ seq: 1, op: "add", id: 2 }] };
  assert.deepEqual(plain(t.carryApply(S, st)), []); assert.equal(S.carrySeen, 0); assert.deepEqual(plain(S.carried), [1]);
  S.exp = null; t.carryApply(S, st); assert.deepEqual(plain(S.carried), [1, 2]); assert.equal(S.carrySeen, 1);
});
test("T7, the Companion's half: it takes a third mibi while a Station add is queued; a full and then a released refusal in one dock", () => {
  const S = save({ carried: [1, 2] }), t = world(S, { docked: true });
  const st = { mibis: S.mibis.map(m => ({ id: m.id, released: m.id === 4 })), carryReqs: [{ seq: 1, op: "add", id: 3 }] };
  t.takeMibi(S.mibis[3]);   // Pip: the Companion is full before the request applies
  t.carryApply(S, st); assert.deepEqual(plain(S.carryRefused), [{ seq: 1, id: 3, why: "full" }]);
  const S2 = save({ carried: [1, 2, 3] }), st2 = { mibis: S2.mibis.map(m => ({ id: m.id, released: m.id === 4 })), carryReqs: [{ seq: 1, op: "add", id: 4 }, { seq: 2, op: "home", id: 1 }, { seq: 3, op: "add", id: 4 }] };
  t.setS(S2); t.carryApply(S2, st2);
  assert.deepEqual(plain(S2.carryRefused), [{ seq: 1, id: 4, why: "released" }, { seq: 3, id: 4, why: "released" }]);
  const S3 = save({ carried: [1, 2, 4] }), st3 = { mibis: S3.mibis.map(m => ({ id: m.id, released: m.id === 1 })), carryReqs: [{ seq: 1, op: "add", id: 3 }, { seq: 2, op: "add", id: 1 }] };
  t.setS(S3); t.carryApply(S3, st3);
  assert.deepEqual(plain(S3.carryRefused), [{ seq: 1, id: 3, why: "full" }, { seq: 2, id: 1, why: "released" }], "a later refusal never hides the full one");
});

// ---- syncStation: the dock gate, the bond OR, nothing read but the bond ----
function dock(S, st, docked, log = []) {
  const notes = [];
  const ctx = vm.createContext({ console, S, CARRY_MAX: 3, SPECIES: [{ name: "Loika" }, { name: "Tuikis" }, { name: "Untuva" }], LAND_NAME: [], G: { land: [] },
    stPart: () => st, isDocked: () => docked, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), reveil: () => {}, logEv: t => log.push(t), fxMsg: t => notes.push(t),
    CARE_TEXT: { left: n => n + " stays home", took: n => n + " is with you", fullRefused: n => n + " stays home · full" } });
  const names = ["syncStation", "carryApply", "mibiById", "normalizeCare", "releasedIds"];
  vm.runInContext(ACCESSOR() + names.map(source).join("\n") + "\n;syncStation(); normalizeCare(S);", Object.assign(ctx, { JUVENILE_TURNS: 2 }));
  return notes;
}
test("the dock: today's Station (no carryReqs) changes nothing; a request made away applies at the next dock, between expeditions", () => {
  const S = save({ carried: [1], bay: [], known: [], retSeen: [], pods: [], dockSeen: 0, probeSeen: 0 });
  const st = { wid: "w", accepted: [], known: [], mibis: S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born, bonded: m.bonded })), dock: { docked: true }, dockN: 1, returned: [], withReq: { id: 2, seq: 1 } };
  dock(S, st, true); assert.deepEqual(plain(S.carried), [1], "no carryReqs (and the old withReq) change nothing"); assert.equal(S.carrySeen, 0);
  st.carryReqs = [{ seq: 1, op: "add", id: 2 }];
  dock(S, st, false); assert.deepEqual(plain(S.carried), [1], "away, the dock already seen: it waits");
  S.exp = { n: 3 }; st.dockN = 2; dock(S, st, true); assert.deepEqual(plain(S.carried), [1], "mid-expedition: it waits"); assert.equal(S.carrySeen, 0);
  S.exp = null; st.dockN = 3; const notes = dock(S, st, true);
  assert.deepEqual(plain(S.carried), [1, 2]); assert.equal(S.carrySeen, 1); assert.ok(notes.includes("Moss is with you"));
  const once = JSON.stringify(S); dock(S, st, true); assert.equal(JSON.stringify(S), once, "a repeated dock changes nothing");
});
test("the dock: `bonded` flows in by OR; no care field is read from the Station; a new mibi starts with the defaults", () => {
  const S = save({ carried: [1], bay: [], known: [], retSeen: [], pods: [], dockSeen: 0 });
  S.mibis[0].bonded = true; S.mibis[0].bondCare = 1; S.mibis[0].care = 1;
  const st = { accepted: [], known: [], dock: { docked: true }, dockN: 1, returned: [], mibis: [
    { id: 1, name: "Dot", sp: 0, born: 0, bonded: false, care: 9, tends: 9, grownTurn: 1 },
    { id: 2, name: "Moss", sp: 1, born: 0, bonded: true, care: 9 },
    { id: 5, name: "Kit", sp: 2, born: 3, bonded: false, care: 4, outings: 4 }] };
  dock(S, st, true);
  const [dot, moss] = S.mibis, kit = S.mibis.find(m => m.id === 5);
  assert.equal(dot.bonded, true, "the Station never unsets a bond"); assert.equal(dot.care, 1); assert.equal(dot.tends, 0); assert.equal(dot.grownTurn, null);
  assert.equal(moss.bonded, true, "a legacy bond made on the Station flows in"); assert.equal(moss.care, 0); assert.equal(moss.bondCare, 0, "back-filled");
  assert.deepEqual([kit.care, kit.tends, kit.outings, kit.notches, kit.tendDay, kit.grownTurn], [0, 0, 0, 0, null, null]);
  assert.match(source("syncStation"), /q\.bonded = !!q\.bonded \|\| !!m\.bonded/);
});

// ---- The agreement tests that need the Station's side ----
test("T2 fixture: both migrations; the carried set and every stage agree for turns 4–14", { skip: station("carriedIds", "stageAt", "normalize", "migrate") }, () => {
  const sv = FIXTURE(), t = world(sv); t.migrateCarried(sv); t.normalizeCare(sv);
  const st = ST.normalize(ST.migrate(sv.st, 1000, sv), 1000);
  const twice = JSON.stringify(st); assert.equal(JSON.stringify(ST.normalize(ST.migrate(st, 1000, sv), 1000)), twice, "the Station's migration run twice gives the same JSON");
  assert.deepEqual(plain(ST.carriedIds(st, sv)), plain(sv.carried));
  assert.deepEqual(plain(st.carryReqs), [{ seq: 1, op: "add", id: 3 }]); assert.ok(!("withReq" in st));
  for (let turn = 4; turn <= 14; turn++) { sv.turn = turn; st.turn = turn;
    for (const m of sv.mibis) assert.equal(ST.mibiStage(st, st.mibis.find(q => q.id === m.id)), t.mibiStage(m), m.name + " at " + turn); }
});
test("T3 round trip: two Station adds apply; a third is refused on the Station", { skip: station("carryAdd", "carriedIds") }, () => {
  const S = save({ carried: [1], v: 8 }), t = world(S, { docked: true });
  const st = ST.normalize(Object.assign(ST.freshSt("w", 3, 1000), { mibis: S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born, gs: m.id, bonded: false, released: false })) }), 1000);
  assert.equal(ST.carryAdd(st, S, st.mibis[1]).ok, true); assert.equal(ST.carryAdd(st, S, st.mibis[2]).ok, true);
  assert.deepEqual(plain(ST.carryAdd(st, S, st.mibis[3])), { ok: false, why: "full" });
  t.carryApply(S, st); assert.equal(S.carried.length, 3); assert.equal(S.carrySeen, 2);
});
test("T4 merge: Companion care writes reach the Station by max and OR, and a second merge changes nothing", { skip: station("mergeCare") }, () => {
  const S = save({ carried: [1], turn: 3 }), t = world(S);
  const dot = S.mibis[0]; dot.tends = 2; dot.outings = 1; t.tend(dot); t.walkAll();
  const st = { turn: 3, mibis: S.mibis.map(m => ({ id: m.id, name: m.name, outings: 0, notches: 0, bonded: m.id === 2 })), dock: { docked: true } };
  ST.mergeCare(st, S); const once = JSON.stringify(st); ST.mergeCare(st, S); assert.equal(JSON.stringify(st), once);
  const q = st.mibis[0]; assert.equal(q.care, dot.care); assert.equal(q.bonded, true); assert.equal(q.bondCare, dot.bondCare);
  assert.equal(st.mibis[1].bonded, true, "the Station's true stays true");
});

// ---- The words and the heart ----
test("one strings table for care; the heart, the 24 px face and the 48 px token are missing assets in the register, drawn only as labelled placeholders", () => {
  assert.match(PAGE, /^const CARE_TEXT = \{$/m);
  const reg = PAGE.match(/^const CARE_ASSETS = \[[^]*?^\];$/m); assert.ok(reg, "the register");
  const entries = vm.runInContext(reg[0] + "\n;CARE_ASSETS", vm.createContext({}));
  assert.deepEqual(plain(entries.map(e => [e.id, e.w, e.h, e.status])), [["c-heart-24", 24, 24, "placeholder"], ["c-heart-16", 16, 16, "placeholder"], ["c-face-24", 24, 24, "placeholder"], ["c-token-48", 48, 48, "placeholder"], ["c-sprite-other-32", 32, 32, "placeholder"], ["c-mini-other-12", 12, 12, "placeholder"], ["c-moment-tend-S01-280x300", 280, 300, "stand-in"], ["c-moment-tend-S02-280x300", 280, 300, "stand-in"], ["c-moment-tend-S03-280x300", 280, 300, "stand-in"], ["c-moment-walk-S01-280x300", 280, 300, "stand-in"], ["c-moment-walk-S02-280x300", 280, 300, "stand-in"], ["c-moment-walk-S03-280x300", 280, 300, "stand-in"], ...["LIP", "FACE", "SIDE", "SHADOW", "STAIR", "LANDING", "FOOT", "APRON_TOP"].map(id => [id, 32, 32, "stand-in"])]);
  for (const e of entries) { assert.deepEqual(Object.keys(e).slice(0, 3), ["id", "what", "until"], "the Station register's keys first"); assert.ok(e.what && e.until); }
  // every missing asset on a screen goes through placeholderPlate, which reads its size from the register: a flat plate and its label, no drawn art
  const ids = ["c-heart-24", "c-heart-16", "c-face-24", "c-token-48"], calls = [...PAGE.matchAll(/placeholderPlate\('(c-[a-z-]+-\d+)'/g)].map(x => x[1]);
  for (const id of ids) { assert.ok(calls.includes(id), id + " is drawn as its placeholder"); assert.equal(PAGE.split("'" + id + "'").length - 1, 2 + calls.filter(c => c === id).length, id + ": named in the register, the plate table and placeholderPlate calls only"); }
  const hp = source("placeholderPlate"); assert.match(hp, /CARE_ASSETS\.find/); assert.ok(!/ell\(|poly\(|pline\(|blit\(/.test(hp), "no drawn shape");
  assert.ok(!/upArt\('mini'/.test(source("ringFace")) && /placeholderPlate\('c-face-24'/.test(source("ringFace")), "the 24 px face is its placeholder, never the HUD icon enlarged");
  assert.ok(!/creatureArt\([^)]*1\.5\)/.test(PAGE), "no token drawn at 1.5× for the 48 px slot");
});

// ---- No count on the Companion (game designer, 16:24; the approved copy) ----
test("no Companion line carries a skill count; the status line is exactly one listed line", () => {
  assert.ok(!/of 3'|\(' \+ \w+\.notches|skill ' \+/.test(PAGE), "no 'N of 3' and no skill number in any line");
  assert.match(source("endExpedition"), /logEv\(CARE_TEXT\.notch\(w\.name\)\)/);
  const S = save({ carried: [1, 2, 3], lead: 2, turn: 3 }), t = world(S);
  const ctx = vm.createContext({ console, S, JUVENILE_TURNS: 2, ELDER_TURNS: 6, isDocked: () => false });
  const names = ["mibiById", "stageAt", "mibiStage", "isAdult", "isCarried", "carriedMibis", "partnerMibi", "activeStatus"];
  const a = vm.runInContext(names.map(source).join("\n") + "\n;({ activeStatus })", ctx);
  const LINES = ["with you · leads the Probe", "with you · can lead the Probe", "with you · too young for the Probe", "with you · grows with care", "at home", "at home · grows on the Companion"];
  ctx.CARE_TEXT = { stLeads: LINES[0], stCanLead: LINES[1], stTooYoung: LINES[2], stGrowsWithCare: LINES[3], stHome: LINES[4], stHomeBonded: LINES[5] };
  const [dot, moss, fig, pip] = S.mibis; S.mibis.forEach(m => { m.notches = 3; });
  fig.born = 2; pip.born = 3; pip.bonded = true; pip.bondCare = 0;
  assert.equal(a.activeStatus(moss), LINES[0]); assert.equal(a.activeStatus(dot), LINES[1]); assert.equal(a.activeStatus(fig), LINES[2]);
  S.carried = [1, 2, 3, 4]; assert.equal(a.activeStatus(pip), LINES[3]); S.carried = [1, 2, 3]; assert.equal(a.activeStatus(pip), LINES[5]);
  pip.bonded = false; assert.equal(a.activeStatus(pip), LINES[4]);
  for (const k of ["stLeads", "stCanLead", "stTooYoung", "stGrowsWithCare", "stHome", "stHomeBonded"]) assert.match(PAGE, new RegExp(k + ": '" + ctx.CARE_TEXT[k] + "'"), "the page's table holds the approved line");
});
test("the approved strings: Tend's line from the species moment and the place; the grow-up and full lines", () => {
  const src = PAGE.match(/^const CARE_TEXT = \{$[^]*?^\};$/m)[0], tm = source("TEND_MOMENT");
  const T = vm.runInContext(tm + "\n" + source("listWords") + "\n" + src + "\n;CARE_TEXT", vm.createContext({}));
  assert.equal(T.tended({ name: "Dot", sp: 0, mem: "meadow" }), "Dot leans on the glass · it remembers the meadow");
  assert.equal(T.tended({ name: "Fig", sp: 1, mem: null }), "Fig glows softly · it hasn’t been out yet");
  assert.equal(T.walked(["Dot", "Moss", "Fig"]), "Dot, Moss and Fig walk together"); assert.equal(T.walked(["Dot", "Moss"]), "Dot and Moss walk together");
  assert.equal(T.grownLeads("Moss"), "Moss is grown · it leads the Probe now"); assert.equal(T.clockGrownHome("Fig"), "Fig is grown · at home");
  assert.equal(T.fullRefused("Pip"), "Pip stays home: the Companion is full · leave one at home first");
  assert.equal(T.tendMidExp("Dot"), "Tend Dot when the expedition is over"); assert.equal(T.notch("Dot"), "Dot gains a skill notch");
  assert.equal(T.noOneWith, "no one with you"); assert.equal(T.noOneGrown, "no one grown yet");
  // the expedition choice's partner card, bottom-line context (companion-screens.md, "Expedition choice: the partner card")
  const S = save({ carried: [], turn: 1 }), ctx = vm.createContext({ console, S, CARE_TEXT: T, JUVENILE_TURNS: 2, ELDER_TURNS: 6, SPECIES: [{ abText: "calms wary creatures" }, { abText: "sniffs out pods" }, { abText: "digs narrow burrows" }] });
  const pr = vm.runInContext(ACCESSOR() + ["partnerRow", "partnerMibi", "carriedMibis", "liveMibis", "mibiById", "isAdult", "mibiStage", "stageAt"].map(source).join("\n") + "\n;partnerRow", ctx);
  assert.equal(pr(), "no one with you");
  S.carried = [1]; assert.equal(pr(), "no one grown yet", "a juvenile with you, no one grown");
  S.turn = 3; assert.equal(pr(), "Partner: Dot · calms wary creatures", "as built");
  for (const k of Object.keys(T)) { const v = typeof T[k] === "function" ? T[k](k.startsWith("walk") ? ["Abcdefghij"] : k === "tended" ? { name: "Abcdefghij", sp: 0, mem: "meadow" } : "Abcdefghij") : T[k];
    assert.ok(!/[{}]/.test(v), k + ": no placeholder braces"); }
});

// ---- Released mibis (C0 amendment) ----
test("Take refuses a mibi the Station has released; a carried mibi already a duplicate refuses as carried", () => {
  const S = save({ carried: [1] }), t = world(S, { docked: true }), [dot, moss, fig] = S.mibis;
  t.env.st = { mibis: [{ id: 1, released: false }, { id: 2, released: true }, { id: 3, released: false }] };
  assert.deepEqual(plain(t.takeMibi(moss)), { ok: false, why: "released" }); assert.deepEqual(plain(S.carried), [1]);
  assert.deepEqual(plain(t.takeMibi(dot)), { ok: false, why: "carried" });
  assert.equal(t.takeMibi(fig).ok, true, "a mibi the Station still houses");
  t.env.st = null; assert.equal(t.takeMibi(moss).ok, true, "no Station part: nothing known as released");
});
test("after a dock, normalizeCare drops released ids from the carried set; without the Station's ids it keeps them", () => {
  const S = save({ carried: [1, 2, 3], lead: 2 }), t = world(S);
  t.normalizeCare(S); assert.deepEqual(plain(S.carried), [1, 2, 3]);
  t.normalizeCare(S, new Set([2])); assert.deepEqual(plain(S.carried), [1, 3]);
  const once = JSON.stringify(S); t.normalizeCare(S, new Set([2])); assert.equal(JSON.stringify(S), once, "idempotent");
  // the page passes the released ids of the Station's part after every dock read
  t.env.st = { mibis: [{ id: 3, released: true }, { id: 1, released: false }] };
  t.normalizeCare(S, t.releasedIds()); assert.deepEqual(plain(S.carried), [1]);
});

test("a released mibi stays carried undocked with no new dock and mid-expedition; at the next dock between expeditions it is dropped", () => {
  const S = save({ carried: [1, 2], bay: [], known: [], retSeen: [], pods: [], dockSeen: 1, probeSeen: 0 });
  const st = { wid: "w", accepted: [], known: [], mibis: S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born, bonded: m.bonded, released: m.id === 2 })), dock: { docked: false }, dockN: 1, returned: [] };
  dock(S, st, false); assert.deepEqual(plain(S.carried), [1, 2], "undocked, no new dock: no drop");
  S.exp = { n: 3 }; st.dockN = 2; dock(S, st, true); assert.deepEqual(plain(S.carried), [1, 2], "mid-expedition, docked: no drop");
  st.dockN = 3; dock(S, st, false); assert.deepEqual(plain(S.carried), [1, 2], "mid-expedition, a new dock read after the lift: no drop");
  S.exp = null; dock(S, st, false); assert.deepEqual(plain(S.carried), [1, 2], "between expeditions, undocked, that dock already seen: no drop");
  st.dockN = 4; dock(S, st, true); assert.deepEqual(plain(S.carried), [1], "the next dock between expeditions: dropped");
  const once = JSON.stringify(S); dock(S, st, true); assert.equal(JSON.stringify(S), once, "a repeated dock changes nothing");
});
test("the dock gate, run: mid-expedition or lifted with the dock seen, a released id changes nothing; docked between expeditions it is dropped, marked and the lead clears", () => {
  const S = save({ carried: [1, 2], lead: 2, exp: { n: 3 }, bay: [], known: [], retSeen: [], pods: [], dockSeen: 1, probeSeen: 0 });
  const st = { wid: "w", accepted: [], known: [], mibis: S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born, bonded: m.bonded, released: m.id === 2 })), dock: { docked: true }, dockN: 2, returned: [] };
  const held = () => [plain(S.carried), S.lead, S.mibis[1].released];
  dock(S, st, true); assert.deepEqual(held(), [[1, 2], 2, undefined], "docked mid-expedition: carried, lead and the mark unchanged");
  S.exp = null; assert.ok(st.dockN <= S.dockSeen);
  dock(S, st, false); assert.deepEqual(held(), [[1, 2], 2, undefined], "lifted, that dock already seen: carried, lead and the mark unchanged");
  st.dockN = 3; dock(S, st, true);
  assert.deepEqual(plain(S.carried), [1], "dropped"); assert.equal(S.mibis[1].released, true, "marked"); assert.equal(S.lead, null, "the lead clears");
});
test("the dock: a Station mibi already released and new to the Companion is not created or logged", () => {
  const S = save({ carried: [1], bay: [], known: [], retSeen: [], pods: [], dockSeen: 0, probeSeen: 0 });
  const st = { wid: "w", accepted: [], known: [], dock: { docked: true }, dockN: 1, returned: [], mibis: [
    ...S.mibis.map(m => ({ id: m.id, name: m.name, sp: m.sp, born: m.born, bonded: m.bonded, released: false })),
    { id: 5, name: "Kit", sp: 2, born: 1, bonded: false, released: true },
    { id: 6, name: "Ash", sp: 0, born: 1, bonded: false, released: false }] };
  const log = []; dock(S, st, true, log);
  assert.equal(S.mibis.find(m => m.id === 5), undefined, "not created"); assert.ok(!log.some(t => /Kit/.test(t)), "not logged");
  assert.ok(S.mibis.find(m => m.id === 6), "a new live mibi still arrives"); assert.ok(log.some(t => /^Ash /.test(t)));
  const once = JSON.stringify(S); dock(S, st, true); assert.equal(JSON.stringify(S), once, "a repeated dock changes nothing");
});

// ---- Undocked, a mibi at home is never named (K3) ----
test("the expedition choice never names a mibi at home: no list, no count, no digger to fetch", () => {
  const S = save({ carried: [], turn: 3, expN: 2, tier: 1, bay: [], revealed: [0], ui: { sel: 1, lastPos: null }, shield: 3 });
  S.mibis[1].sp = 2;   // a grown digger at home
  const said = [], noop = () => {}, id = x => x;
  const ctx = vm.createContext({ console, S, SCR_W: 450, MW: 1, MH: 1, JUVENILE_TURNS: 2, ELDER_TURNS: 6, C: new Proxy({}, { get: () => 0 }), ICON: new Proxy({}, { get: () => noop }),
    SPECIES: [{ ab: "calm", abText: "calms wary creatures" }, { ab: "sniff", abText: "sniffs out pods" }, { ab: "dig", abText: "digs narrow burrows" }],
    FX: {}, shownMsg: () => "", viewBg: noop, drawTop: noop, motion: () => false, tierOf: () => ({ shield: 3 }), wTurn: () => 4, clipText: id, text: t => said.push(String(t)), wrapText: t => [t], isDocked: () => false,
    panel: noop, card: noop, disc: noop, blit: noop, R: noop, shieldBars: noop, RING: noop, creatureArt: noop, chip: () => 0, emptyPodSmall: noop, drawWorldInset: noop, explored: () => false,
    CARRY_MAX: 3, textW: () => 0, placeholderPlate: noop, dashedCircleArt: noop, ringFace: noop, stageFill: () => "stone", CARE_TEXT: { noPartner: "No partner", noOneWithT: "No one with you", takeOne: "dock to take one along", youngCare: "young · grows with care", youngTime: "young · grows in time" } });
  const names = ["drawSetup", "digPartner", "partnerMibi", "carriedMibis", "liveMibis", "leadWhy", "mibiById", "isAdult", "mibiStage", "stageAt"];
  vm.runInContext(names.map(source).join("\n") + "\n;drawSetup(0);", ctx);
  const home = S.mibis.map(m => m.name);
  for (const line of said) for (const n of home) assert.ok(!line.includes(n), "names " + n + ": " + line);
  assert.ok(said.includes("No one with you") && said.includes("dock to take one along") && said.includes("Caves · needs a digging partner"), "none carried: No one with you (ruling 19:21)");
  assert.ok(!said.includes("No partner"), "No partner only when juveniles are carried");
  assert.ok(!said.some(l => /at home/.test(l)), "no at-home list or count");
  for (const fn of ["lineFor", "drawSetup"]) assert.ok(!/mibiWith|homeMibis/.test(source(fn)));
  assert.ok(!/take ' \+ d\.name/.test(PAGE), "the digger at home is never named on a refusal");
});
test("the page's help: the carried set, Walk together and Tend; no Spend time and no Habitat", () => {
  const help = PAGE.slice(0, PAGE.indexOf("<script type=\"module\">"));   // the page before its script (the ?embed line in <head> is a classic script)
  assert.match(help, /Up to three mibis are <b>with you<\/b>/); assert.match(help, /<b>Tend<\/b> each one once a day/);
  assert.ok(!/spends time|One mibi is|Habitat/.test(PAGE), "retired words");
});

// ---- The Station's half, switched on when it lands ----
const stationWorld = (S, docked = true) => { S.seed = 7; S.wid = "w7"; S.cr = []; S.bay = []; S.v = 8;
  const st = ST.normalize(Object.assign(ST.freshSt("w7", S.turn, 1000), { mibis: S.mibis.map((m, i) => ({ id: m.id, name: m.name, sp: m.sp, gs: 100 + m.id, born: m.born, bonded: !!m.bonded, outings: 0, notches: 0, from: { n: 0, g: "", how: "" }, bay: i, released: false })) }), 1000);
  if (docked) ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 1000); return st; };
const reload = x => JSON.parse(JSON.stringify(x));
test("T7, the Station's half: a full refusal shows once, null after it is seen, after a lift and redock and after a reload; other reasons show nothing",
  { skip: station("carryRefusal", "seenCarryRefusal", "carryAdd", "dockKey") }, () => {
  const S = save({ carried: [1, 2], turn: 3 }), t = world(S, { docked: true }); let st = stationWorld(S);
  assert.equal(ST.carryAdd(st, S, st.mibis[2]).ok, true);   // Fig queued on the Station
  t.takeMibi(S.mibis[3]);                                    // the Companion takes Pip first: full
  t.carryApply(S, st); assert.deepEqual(plain(S.carryRefused), [{ seq: 1, id: 3, why: "full" }]);
  assert.deepEqual(plain(ST.carryRefusal(st, S)), { seq: 1, id: 3, name: "Fig" });
  ST.seenCarryRefusal(st, S); assert.equal(ST.carryRefusal(st, S), null);
  ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 2000); ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 3000); assert.equal(ST.carryRefusal(st, S), null, "a lift and a redock");
  st = ST.normalize(reload(st), 4000); assert.equal(ST.carryRefusal(st, reload(S)), null, "a reload of either page");
  for (const why of ["carried", "released", "unknown"]) { const sv = reload(S); sv.carryRefused = [{ seq: 9, id: 1, why }]; assert.equal(ST.carryRefusal(st, sv), null, why); }
  const sv = reload(S); sv.carryRefused = [{ seq: 10, id: 2, why: "full" }, { seq: 11, id: 4, why: "released" }];
  assert.equal(ST.carryRefusal(st, sv).id, 2, "a later refusal never hides the full one"); ST.seenCarryRefusal(st, sv); assert.equal(ST.carryRefusal(st, sv), null, "both seen");
});
test("T4 with a lift, a redock and a reload: the Station's care mirror does not move", { skip: station("mergeCare", "dockKey", "normalize") }, () => {
  const S = save({ carried: [1], turn: 3 }), t = world(S); const dot = S.mibis[0]; dot.tends = 2; dot.outings = 1; t.tend(dot); t.walkAll();
  let st = stationWorld(S); ST.mergeCare(st, S); const care = s => JSON.stringify(s.mibis.map(q => [q.id, q.care, q.tends, q.outings, q.notches, q.bonded, q.bondCare ?? null, q.grownTurn ?? null]));
  const once = care(st);
  ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 2000); ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 3000); ST.mergeCare(st, S); assert.equal(care(st), once, "lift and redock");
  st = ST.normalize(reload(st), 4000); ST.mergeCare(st, reload(S)); assert.equal(care(st), once, "reload");
});
test("T5: C8 marks only the partner; a carried mibi that is not the partner gets none", { skip: station("tripCarried", "dockKey") || (!("tripSeen" in ST.freshSt("w", 0, 0)) && "C8 has not landed on main") }, () => {
  const S = save({ carried: [1, 2, 3], turn: 4 }); S.trips = [{ v: 1, n: 3, partner: 1, places: ["cave", "wood", "meadow"], storm: true, carried: [1, 2, 3] }];
  const st = stationWorld(S, false); ST.dockKey(st, S, ST.DEFAULT_SETTINGS, 1000);
  for (const q of st.mibis.filter(q => q.id !== 1)) assert.ok(!q.marks || Object.values(q.marks).every(k => !k.steps), q.name + " gets no marks");
});

// ---- The care screens (companion-screens.md at 2c5044a: Mibis, the Lead card, released mibis, End expedition's notch row) ----
test("setLead: a grown mibi with you, between expeditions only; nextLead cycles the grown ones with you after the partner, wrapping", () => {
  const S = save({ turn: 3, carried: [1, 2, 3] }), t = world(S), [dot, moss, fig, pip] = S.mibis;
  moss.born = 3;   // a juvenile with you
  assert.equal(t.partnerMibi().id, 1); assert.equal(t.nextLead().id, 3, "the next grown after the partner, skipping the juvenile");
  assert.equal(t.setLead(fig), true); assert.equal(S.lead, 3); assert.equal(t.partnerMibi().id, 3);
  assert.equal(t.nextLead().id, 1, "wrapping to the first");
  assert.equal(t.setLead(moss), false, "never a juvenile"); assert.equal(S.lead, 3);
  assert.equal(t.setLead(pip), false, "never a mibi at home"); assert.equal(S.lead, 3);
  S.exp = { n: 4 }; assert.equal(t.setLead(dot), false, "never mid-expedition"); assert.equal(S.lead, 3); S.exp = null;
  S.carried = [1, 2]; assert.equal(t.nextLead(), null, "one grown: nothing to cycle");
  dot.born = 3; assert.equal(t.nextLead(), null, "none grown");
});
test("the roster's focus order and rects: the Lead card, the mibis with you, then docked the mibis at home; the scroll keeps the foot on row 526", () => {
  const S = save({ carried: [3, 1] }), t = world(S, { docked: true });
  assert.equal(t.rosterAt(0), null, "index 0 is the Lead card");
  assert.deepEqual([1, 2, 3, 4].map(i => t.rosterAt(i).id), [3, 1, 2, 4]); assert.equal(t.rosterCount(), 5);
  assert.deepEqual(plain([0, 1, 2, 3, 4].map(i => t.rosterRect(i))), [[44, 92], [172, 64], [244, 64], [416, 64], [488, 64]], "places from 172, home rows from 416, 72 apart");
  assert.deepEqual([0, 1, 2, 3, 4].map(i => t.rosterOff(i)), [0, 0, 0, 0, 25], "the second home row (foot 551) is the first to scroll, by 25");
  S.carried = [1, 2, 3]; assert.deepEqual(plain(t.rosterRect(4)), [416, 64], "with three, the first home row");
  t.env.docked = false; assert.equal(t.rosterCount(), 4, "undocked: the Lead card and the three with you"); assert.equal(t.rosterOff(3), 0, "undocked nothing scrolls");
});
test("released mibis: hidden from every list and count; the dock read marks them, drops them and clears the lead; Take refuses them", () => {
  const S = save({ carried: [1, 2], lead: 2 }), t = world(S, { docked: true });
  t.normalizeCare(S, new Set([2, 4]));
  assert.deepEqual(plain(S.carried), [1]); assert.equal(S.lead, null, "the lead clears");
  assert.equal(S.mibis[1].released, true); assert.equal(S.mibis[3].released, true); assert.equal(S.mibis[0].released, undefined);
  assert.deepEqual(plain(t.liveMibis().map(m => m.id)), [1, 3]); assert.deepEqual(plain(t.homeMibis().map(m => m.id)), [3]);
  assert.deepEqual(plain(t.rosterList().map(m => m.id)), [1, 3], "the roster closes up"); assert.equal(t.rosterCount(), 3);
  t.env.st = null; assert.deepEqual(plain(t.takeMibi(S.mibis[3])), { ok: false, why: "released" }, "the Companion's own mark refuses it");
  const once = JSON.stringify(S); t.normalizeCare(S, new Set([2, 4])); assert.equal(JSON.stringify(S), once, "idempotent");
  t.normalizeCare(S); assert.equal(S.mibis[1].released, true, "without the Station's ids nothing is un-released");
  // the world turn's lines never name a released mibi; the screens count only the others
  assert.match(source("worldTurn"), /liveMibis\(\)\.filter\(grownNow\)/);
  for (const fn of ["drawMibis", "drawActive", "partnerRow", "drawSetup"]) assert.match(source(fn), /liveMibis\(\)/, fn + " counts only the mibis not released");
  assert.ok(!/S\.mibis\.length/.test(source("drawMibis") + source("drawSetup") + source("partnerRow")), "no count over released mibis");
});
test("the active screen: a page gone goes to the page now at that index, or the last", () => {
  const S = save({ carried: [1, 2, 3], ui: { aId: 3, aIdx: 2 } }), t = world(S, { docked: false });
  const sh = vm.runInContext(source("shownMibi") + ";shownMibi", t.ctx);
  assert.equal(sh().id, 3); t.normalizeCare(S, new Set([3])); assert.equal(sh().id, 2, "the last page");
  S.ui.aId = 1; sh(); t.normalizeCare(S, new Set([1])); assert.equal(sh().id, 2, "the page now at index 0");
});
// End expedition: the outcome block, the notch row, the crates and the world lines, as drawn (text and pictures recorded).
function sealed(rep, lines, bay = 1) {
  const said = [], faces = [], crates = [], dots = [], noop = () => {};
  const ctx = vm.createContext({ console, S: { report: Object.assign({ n: 4, lines }, rep), bay: Array.from({ length: bay }, (_, i) => ({ id: "c" + i })) }, NOW: 0, FX: { transAt: 0 }, BAY: 3, TIER_NAME: ["", "starter", "early", "mid"],
    NUM_WORD: ["no", "one", "two", "three"], C: new Proxy({}, { get: (o, k) => k }), viewBg: noop, drawTop: noop, motion: () => false, clamp: (v, a, b) => Math.min(b, Math.max(a, v)), clipText: (x, w) => x,
    text: (str, x, y, col, s) => said.push({ str: String(str), x, y, s: s || 2 }), ringFace: (x, y, sp, p) => faces.push({ x, y, sp, p }), crateIcon: (x, y) => crates.push({ x, y }), R: (x, y, w, h, c) => dots.push({ x, y, w, h, c }),
    bayLine: () => "1 crate sealed · dock to transfer", isDocked: () => false, turnLine: () => "World turn 5", wrapText: l => l.length > 40 ? [l.slice(0, 40), l.slice(40)] : [l], CARE_TEXT: { notch: n => n + " gains a skill notch" } });
  const names = ["drawSealed", "drawTurnLines", "worldLineRows", "WORLD_FOOT", "yieldLine", "numWord", "sealedWords"];
  vm.runInContext(names.map(source).join("\n") + "\n;drawSealed(0);", ctx);
  return { said, faces, crates, at: s2 => said.find(q => q.str === s2), world: dots.filter(d => d.c === "orange" && d.w === 4) };
}
test("End expedition: the notch is its own row under the outcome's last 2× line, the crates move down 28, no world line repeats it", () => {
  const W = ["The Loikas moved north.", "The outpost in the wood burns low.", "A storm charged stones in the east."];
  const y = { data: 6, tier: 3, moments: 2 };
  let d = sealed({ sealed: { id: "c0", pods: [1, 2] }, yield: y, notch: { id: 1, name: "Pip", sp: 0 } }, W);
  assert.equal(d.at("Pip gains a skill notch").y, 128); assert.equal(d.at("Pip gains a skill notch").x, 54);
  assert.deepEqual(plain(d.faces), [{ x: 22, y: 125, sp: 0, p: true }], "the partner's ring face, teal, at (22, row top − 3)");
  assert.equal(d.crates[0].y, 156); assert.equal(d.at("Meanwhile, the world turned").y, 156 + 142);
  assert.deepEqual(d.world.map(q => q.y - 6), [346, 372, 398], "the first world line at c + 190 (wireframe 17)");
  assert.equal(d.said.filter(q => /skill notch/.test(q.str)).length, 1, "one row, never a world line");
  // every outcome in the table: crates without and with the notch
  const cases = [[{ reason: "break", dropped: 2, lost: [] }, 162, 152, 190], [{ sealed: { id: "c0", pods: [] }, yield: y }, 128, 128, 156], [{ sealed: { id: "c0", pods: [] } }, 106, 104, 134],
    [{ kept: true, yield: y }, 162, 152, 190], [{ kept: true }, 138, 128, 166], [{ empty: true }, 114, 104, 142]];
  for (const [r, c0, top, c1] of cases) {
    assert.equal(sealed(r, W).crates[0].y, c0, JSON.stringify(r) + ": crates, no notch");
    const n = sealed(Object.assign({ notch: { id: 1, name: "Pip", sp: 0 } }, r), W);
    assert.equal(n.at("Pip gains a skill notch").y, top, JSON.stringify(r) + ": notch row"); assert.equal(n.faces[0].y, top - 3); assert.equal(n.crates[0].y, c1, JSON.stringify(r) + ": crates, notch");
  }
  assert.equal(sealed({ waited: true, notch: { id: 1, name: "Pip", sp: 0 } }, W).faces.length, 0, "nothing explored: no notch row");
  assert.equal(sealed({ waited: true }, W).crates[0].y, 138);
});
test("End expedition: world lines draw only while their foot stays on or above row 476; the first that fails ends the list", () => {
  const wrap = l => l.length > 40 ? [l.slice(0, 40), l.slice(40)] : [l], long = "x".repeat(60), short = "A storm charged stones.";
  const rows = vm.runInContext(source("worldLineRows") + "\n" + source("WORLD_FOOT") + ";worldLineRows", vm.createContext({}));
  assert.deepEqual(plain(rows([long, long, short], 380, wrap).map(r => [r.y, r.foot])), [[380, 417], [426, 463]], "a break with a notch, two wrapped lines: the third, at 472, is cut");
  assert.deepEqual(plain(rows([short, short, short], 380, wrap).map(r => r.foot)), [397, 423, 449], "three one-line world lines always fit");
  assert.deepEqual(plain(rows([short, long, short], 406, wrap).map(r => r.y)), [406, 432], "a line fits at 432 only if its foot ≤ 476");
  assert.equal(rows([long, short], 450, wrap).length, 0, "the first fails: nothing after it, no mark");
  assert.equal(rows([short, short, short, short], 100, wrap).length, 3, "three at most");
  // on the screen: a break with a notch and a full bay of wrapped lines (wireframe 19's case) keeps every foot on or above 476
  const d = sealed({ kept: true, yield: { data: 6, tier: 3, moments: 2 }, notch: { id: 1, name: "Pip", sp: 0 } }, ["The Loikas spread out.", "Fig is grown · take Fig to bring it on expeditions.", "Moss is an elder now · slower, with keener senses."]);
  assert.deepEqual(d.world.map(q => q.y - 6), [380, 406], "the third (foot 489) is cut");
  for (const q of d.said.filter(q => q.x === 40)) assert.ok(q.y + 17 <= 476, "foot " + (q.y + 17));
});
test("End expedition after a break: the pods line in the copywriter's words (19:03)", () => {
  for (const [n, line] of [[1, "One pod lies where it broke."], [2, "Two pods lie where it broke."], [3, "Three pods lie where it broke."], [0, "Nothing was in the hold."]])
    assert.ok(sealed({ reason: "break", dropped: n, lost: [] }, []).at(line), line);
});
test("End expedition, Sealed: the trip line is built from what was sealed (pods and supplies, or supplies only)", () => {
  assert.ok(sealed({ sealed: { id: "c0", pods: [], d: 2 } }, []).at("Expedition 4 · supplies"), "supplies only");
  assert.ok(sealed({ sealed: { id: "c0", pods: [1], d: 2 } }, []).at("Expedition 4 · one pod and supplies"), "one pod and supplies");
  assert.ok(sealed({ sealed: { id: "c0", pods: [1, 2], d: 4 } }, []).at("Expedition 4 · two pods and supplies"), "two pods and supplies");
  assert.ok(!sealed({ sealed: { id: "c0", pods: [1], d: 1 } }, []).said.some(q => /what you carried|no pods/.test(q.str)), "never the old words");
});
test("End expedition, the hold-empty branch (an old save): main's line, and no yield line even when one is passed", () => {
  const d = sealed({ empty: true, yield: { data: 0, tier: 0, moments: 0 } }, []);
  assert.ok(d.at("Nothing to seal this time."), "main's line");
  assert.ok(!d.said.some(q => /Data ·|No crate|crate this time/.test(q.str)), "no yield line, no new string");
  assert.equal(d.crates[0].y, 114, "the crates stay where they were");
});
test("End expedition after a break: 'Docking mends the Probe for free.'", () => {
  assert.ok(sealed({ reason: "break", dropped: 0, lost: [] }, []).at("Docking mends the Probe for free."));
});
test("Cargo's preview predicts End: the hold plus the yield still to come, always a seal when an explored walk has room", () => {
  const run = (cargo, bay = [], yld = 2, dField = 0) => vm.runInContext(["sealPreview", "sealedWords", "numWord", "holdEmpty", "exploredAny"].map(source).join("\n") + "\n;sealPreview()",
    vm.createContext({ S: { exp: { cargo, stats: { calls: 1 }, shield: 3, smax: 3, dField }, bay }, BAY: 3, CAP: 20, walkYield: () => yld, NUM_WORD: ["no", "one", "two", "three"] }));
  assert.deepEqual(plain(run({ e: 0, d: 0, s: 0, pods: [] })), ["Seals the supplies · crate 1 of 3", "The Station opens it when you dock"], "an empty hold still seals the walk's Data");
  assert.equal(run({ e: 0, d: 0, s: 0, pods: [1, 2] })[0], "Seals two pods + supplies · crate 1 of 3", "pods only in the hold: pods and supplies");
  assert.equal(run({ e: 1, d: 2, s: 0, pods: [1] }, [{}])[0], "Seals one pod + supplies · crate 2 of 3");
  assert.equal(run({ e: 0, d: 6, s: 0, pods: [] }, [], 6, 6)[0], "Seals the supplies · crate 1 of 3", "the yield already in the hold");
  assert.deepEqual(plain(run({ e: 0, d: 0, s: 0, pods: [] }, [{}, {}, {}])), ["Bay full · your finds stay in the hold", "dock to free it"], "bay full, hold empty: the bay-full lines");
  assert.deepEqual(plain(run({ e: 0, d: 0, s: 0, pods: [] }, [], 0)), [], "an old save with no yield and no hold: no line");
  for (const o of [run({ e: 0, d: 0, s: 0, pods: [] }), run({ e: 0, d: 0, s: 0, pods: [] }, [{}, {}, {}])]) assert.ok(!o.some(l => /no crate|you still earn/.test(l)));
  assert.doesNotMatch(source("sealPreview"), /no crate|you still earn/);
});
test("chips are 22 high, the label at top + 3, 8 px in from each side", () => {
  assert.equal(source("chip"), "function chip(x, y, label, fill, col) { const w = textW(label, 2) + 16; panel(x, y, w, 22, C[fill]); text(label, x + 8, y + 3, C[col]); return w; }");
});

// ---- The UI designer's rulings (19:21) and the docking copy (c7cbfa4) ----
test("careQueue: bonds first in carried order, 2400 ms each; then one grow-up cut per mibi, 1200 ms apart; input held to 300 ms after the last cut", () => {
  const q = vm.runInContext(source("careQueue") + "\n" + source("GROW_MS") + ";careQueue", vm.createContext({ BOND_MS: 2400 }));
  const ev = (id, o) => Object.assign({ m: { id }, bonded: false, grown: false }, o);
  // a Walk where three grow: cuts at 2400, 3600, 4800, held to 5100
  let r = q([ev(1, { grown: true }), ev(2, { grown: true }), ev(3, { grown: true })], 2400);
  assert.deepEqual(plain(r.cuts), [{ kind: "grow", id: 1, at: 2400 }, { kind: "grow", id: 2, at: 3600 }, { kind: "grow", id: 3, at: 4800 }]); assert.equal(r.lock, 5100);
  // bonds play first, in carried order, then the grow cuts follow at 1200 ms steps
  r = q([ev(1, { grown: true }), ev(2, { bonded: true }), ev(3, { bonded: true }), ev(4, { grown: true })], 2400);
  assert.deepEqual(plain(r.cuts), [{ kind: "bond", id: 2, at: 2400 }, { kind: "bond", id: 3, at: 4800 }, { kind: "grow", id: 1, at: 7200 }, { kind: "grow", id: 4, at: 8400 }]);
  assert.equal(r.lock, 8700);
  // a Tend that bonds: after the 1.8 s moment, held to the end of the bond
  r = q([ev(1, { bonded: true })], 1800); assert.deepEqual(plain(r.cuts), [{ kind: "bond", id: 1, at: 1800 }]); assert.equal(r.lock, 4200);
  r = q([ev(1, { grown: true })], 1800); assert.equal(r.lock, 2100, "one grow: 300 ms after its cut");
  assert.equal(q([ev(1)], 1800).cuts.length, 0); assert.equal(q([ev(1)], 1800).lock, 300);
  // the page applies them in turn, each from a timer the press set (never from a frame): each cut moves the view; a mibi shows juvenile until its own cut
  assert.match(source("careLines"), /for \(const c of FX\.cuts\) setTimeout\(\(\) => \{ if \(!c\.done\) \{ c\.done = 1; S\.ui\.aId = c\.id; \} \}, c\.at - NOW\);/);
  assert.doesNotMatch(source("drawActive"), /S\.ui\.aId =/, "the render reads the shown page only");
  assert.match(source("careLines"), /careQueue\(evs, dur\)/);
});
test("the docking copy (c7cbfa4): the Companion docks; it is never told to go to the Station", () => {
  const T = vm.runInContext(source("TEND_MOMENT") + "\n" + source("listWords") + "\n" + PAGE.match(/^const CARE_TEXT = \{$[^]*?^\};$/m)[0] + "\n;CARE_TEXT", vm.createContext({}));
  assert.equal(T.takeOne, "dock to take one along"); assert.equal(T.takeAlong, "take mibis along"); assert.equal(T.whenDocked, "when docked");
  assert.ok(!/'[^'\n]*(take one at the Station|dock at the Station|lift at the Station|consignment)[^'\n]*'/.test(PAGE), "no retired docking words in any string");
});
test("the Lead card's context: docked with no one carried reads 'no one with you'", () => {
  assert.match(source("lineBase"), /!carriedMibis\(\)\.length \? CARE_TEXT\.noOneWith : g === 1 \? CARE_TEXT\.onlyGrown : CARE_TEXT\.noOneGrown/);
});

// ---- X1: a Station species the Companion does not know (design/proposals/station-build.md §2.3, spName) ----
// The whole page script in a sandbox (as freeze.test.mjs runs it), with the Station's real code and frames: seedAdults S05 and S10
// (sp -1 on the Station: a species beyond the Companion's three), then dockKey, then the Companion reads the save.
const X1 = await (async () => {
  const W = await import("../src/world.mjs"), A = await import("../src/atlas.mjs"), V = await import("../src/view.mjs"), { frameOf } = await import("../../station/src/genome.mjs");
  // every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports
  const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1], MODS = { world: W, view: V, atlas: A };
  const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
  const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
  const SCRIPT = MODULE.replace(IMPORT_RE, "");
  function page(store = {}) {
    const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
      apply: () => any, construct: () => any, set: () => true });
    const clock = { t: 1000, timers: [] };
    const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
      matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
      performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
      localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
    ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
    const run = src => vm.runInContext(src, ctx), KEY = run("SAVE_KEY");
    const p = { run, store, KEY, get S() { return run("S"); },
      pass(ms) { const end = clock.t + ms; for (;;) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers[0]; if (!n || n.at > end) break; clock.timers.shift(); clock.t = n.at; n.f(); } clock.t = end; },
      key(k, n = 1) { for (let i = 0; i < n; i++) { p.pass(400); run("act(" + JSON.stringify(k) + ")"); } },
      sv: () => JSON.parse(store[KEY]),
      putSt(st) { const o = JSON.parse(store[KEY]); o.st = JSON.parse(JSON.stringify(st)); store[KEY] = JSON.stringify(o); } };
    return p;
  }
  // The Companion's world, the Station's write (S05 Dot and Moss, S10 Bean and Fig, docked), normalized as the Station does before every save,
  // so each mibi carries the spName the Station's own normalize writes; `oldSave` drops it (a Station save from before the field).
  function docked({ oldSave = false, seed = true } = {}) {
    const p = page(); p.run("newWorld(1); save();");
    const st = ST.normalize(ST.freshSt(p.S.wid, p.S.turn));
    if (seed) assert.ok(ST.seedAdults(st, "S05", 3).ok && ST.seedAdults(st, "S10", 4).ok);
    assert.ok(ST.dockKey(st, p.sv()).docked);
    ST.normalize(st);
    for (const m of st.mibis) assert.equal(m.spName, frameOf(m.species).species.name, "the Station's normalize writes spName");
    if (oldSave) for (const m of st.mibis) delete m.spName;
    p.putSt(st);
    return { p, st, before: p.store[p.KEY] };
  }
  return { page, docked, frameOf };
})();
const COMPANION_NEW = ["mibis", "dockSeen", "log"];
const without = (o, keys) => { const c = JSON.parse(JSON.stringify(o)); for (const k of keys) delete c[k]; return JSON.stringify(c); };

test("X1 1: a save holding S05 and S10 mibis (sp -1) loads: save() does not throw, and a page built from the result boots", () => {
  const { p } = X1.docked();
  assert.deepEqual(plain(p.sv().st.mibis.map(m => [m.name, m.sp, m.species])), [["Dot", -1, "S05"], ["Moss", -1, "S05"], ["Bean", -1, "S10"], ["Fig", -1, "S10"]], "the Station's real seeds");
  assert.doesNotThrow(() => p.run("save()"));
  assert.deepEqual(plain(p.S.mibis.map(m => [m.id, m.name, m.sp, m.species])), [[1, "Dot", -1, "S05"], [2, "Moss", -1, "S05"], [3, "Bean", -1, "S10"], [4, "Fig", -1, "S10"]], "no mibi hidden or dropped");
  let q; assert.doesNotThrow(() => { q = X1.page({ ...p.store }); });
  assert.equal(q.S.mibis.length, 4);
});

test("X1 2: every screen renders with S05 and S10 mibis carried and leading; Tend, Walk and the skills run; no line reads undefined or null", () => {
  const { p, st } = X1.docked(); p.run("save()");
  // every labelled plate drawn, recorded as id@x,y×k
  p.run("var __plates = []; (() => { const real = placeholderPlate; placeholderPlate = (id, x, y, k) => { __plates.push([id, x, y, k || 1]); return real(id, x, y, k); }; })()");
  const drawn = () => p.run("__plates.splice(0).map(a => a[0] + '@' + a[1] + ',' + a[2] + 'x' + a[3])");
  assert.ok(p.run("takeMibi(mibiById(1)).ok && takeMibi(mibiById(3)).ok"), "taken while docked");
  assert.equal(p.run("setLead(mibiById(1))"), true, "an S05 mibi can lead (game designer, 2026-10-11)");
  assert.equal(p.run("partnerMibi().id"), 1, "Dot is the partner");
  assert.equal(p.run("canDig()"), false); assert.equal(p.run("digPartner()"), null, "no gate opens");
  assert.equal(p.run("partnerRow()"), "Partner: Dot · " + p.run("CARE_TEXT.abOther"), "the partner line reads abOther");
  const render = phase => { p.run(`S.phase = ${JSON.stringify(phase)}; render(0)`); return drawn(); };
  let d = render("mibis"); assert.ok(d.some(x => /^c-sprite-other-32@28,\d+x2$/.test(x)), "the Lead card: the plate at 2× in the sprite's rect: " + d);
  for (let i = 0; i < 4; i++) { p.run(`S.ui.aId = null; S.ui.aIdx = ${i};`); d = render("active");
    assert.ok(d.includes("c-sprite-other-32@97,52x8"), "the stage: the 256×256 plate at (97, 52), page " + i + ": " + d); }
  render("menu");
  d = render("setup"); assert.ok(d.includes("c-sprite-other-32@28,264x2"), "the partner card: the plate at 2×: " + d);
  assert.doesNotThrow(() => p.run("tendPress(mibiById(1))"));
  assert.match(p.run("FX.notes.map(n => n.text).join('\\n')"), /^Dot settles · it hasn’t been out yet$/m, "Tend's line takes tendMomentOther");
  p.pass(3000); assert.doesNotThrow(() => p.run("tendPress(mibiById(3))"));
  assert.equal(p.run("mibiSpName(mibiById(1))"), "Tepor"); assert.equal(p.run("mibiSpName(mibiById(3))"), "Igara");
  // lift, Walk with Dot alone, then an expedition
  assert.ok(ST.dockKey(st, p.sv()).lifted); p.putSt(st); p.run("save()");
  p.run("S.carried = [1]; S.walkTurn = -1;");
  assert.doesNotThrow(() => p.run("walk(mibiById(1))"));
  assert.match(p.run("FX.notes.map(n => n.text).join('\\n') + S.log.join('\\n')"), /Dot walks the path/, "the Walk line takes walkedOther");
  p.run("S.carried = [1, 3]; S.phase = 'setup';");
  p.key("confirm"); p.key("confirm"); assert.ok(p.S.exp, "an expedition started with Dot leading");
  assert.equal(p.run("S.exp.pt && S.exp.pt.sp"), -1);
  assert.equal(p.run("canDig()"), false);
  d = render("map"); assert.ok(d.some(x => x.startsWith("c-mini-other-12@")), "the HUD mini is its plate: " + d);
  p.key("confirm"); assert.equal(p.S.phase, "patch", "into a place");
  d = render("patch"); assert.ok(d.some(x => x.startsWith("c-sprite-other-32@") && x.endsWith("x1")), "the field partner: the plate at 1×: " + d);
  assert.ok(d.some(x => x.startsWith("c-mini-other-12@")), "the HUD mini in a place");
  assert.doesNotThrow(() => p.run("ptCtx()")); assert.equal(p.run("ptCtx().ptAb"), null); assert.equal(p.run("ptCtx().ptSp"), -1, "never matches a wild species");
  assert.equal(p.run("canDig()"), false); assert.equal(p.run("digPartner()"), null);
  assert.doesNotThrow(() => p.run("onStateChanged(); notesText();"));
  const lines = p.run("FX.notes.map(n => n.text).concat(S.log).join('\\n')");
  assert.ok(!/undefined|null/.test(lines), "no line reads undefined or null:\n" + lines);
  assert.ok(!/undefined|null/.test(p.run("notesText()") || ""), "the debug lines");
});

test("X1 3: the dock changes only the Companion's mibis, dockSeen and log; the Station's part is byte-identical", () => {
  const { p, before } = X1.docked(); p.run("save()");
  const a = JSON.parse(before), b = p.sv();
  const moved = (x, y) => Object.keys({ ...x, ...y }).filter(k => JSON.stringify(x[k]) !== JSON.stringify(y[k])).sort();
  // the dock's own fields, with no mibi at all (the Probe's mend: probeSeen, shield), move as before; the four mibis add only `mibis`, `dockSeen` and `log`
  const c = X1.docked({ seed: false }); c.p.run("save()"); const own = moved(JSON.parse(c.before), c.p.sv());
  assert.deepEqual(own, ["dockSeen", "probeSeen", "shield"], "the dock without mibis");
  const keys = [...new Set(COMPANION_NEW.concat(own))];
  assert.deepEqual(moved(a, b), keys.slice().sort(), "the four mibis add only mibis and log to what the dock moves");
  assert.equal(without(b, keys), without(a, keys), "nothing else in the save moved");
  assert.equal(JSON.stringify(b.st), JSON.stringify(a.st), "st is what the Station wrote");
  assert.deepEqual(a.mibis, []); assert.equal(b.mibis.length, 4); assert.equal(b.dockSeen, 1);
  for (const m of b.mibis) for (const k of ["id", "name", "sp", "born", "from", "species", "spName"]) assert.ok(k in m, m.name + " has " + k);
  assert.deepEqual(plain(b.mibis.map(m => [m.sp, m.species, m.spName])), [[-1, "S05", "Tepor"], [-1, "S05", "Tepor"], [-1, "S10", "Igara"], [-1, "S10", "Igara"]], "sp copied as given");
  assert.ok(b.log.some(l => /Dot \(Tepor\) is home at the Station/.test(l)));
});

test("X1 4: the round trip: a fresh page saves the same string; the Station still resolves S05 and S10", () => {
  const { p } = X1.docked(); p.run("save()");
  const once = p.store[p.KEY], q = X1.page({ [p.KEY]: once }); q.run("save()");
  assert.equal(q.store[q.KEY], once, "byte-identical");
  const st2 = ST.normalize(ST.migrate(q.sv().st));
  assert.deepEqual(st2.mibis.map(m => ST.speciesOf(m)), ["S05", "S05", "S10", "S10"]);
  assert.deepEqual(plain(q.run("S.mibis.map(mibiSpName)")), ["Tepor", "Tepor", "Igara", "Igara"]);
});

test("X1 5: with no spName in the save (a Station save from before it), the name is CARE_TEXT.spOther", () => {
  const { p } = X1.docked({ oldSave: true }); p.run("save()");
  assert.equal(p.run("CARE_TEXT.spOther"), "a Station species");
  // the copywriter's signed strings (2026-10-11 14:42)
  assert.equal(p.run("CARE_TEXT.abOther"), "no field ability yet"); assert.equal(p.run("CARE_TEXT.tendMomentOther"), "settles");
  assert.equal(p.run("CARE_TEXT.walkedOther('Dot', 'meadow')"), "Dot walks the meadow"); assert.equal(p.run("CARE_TEXT.walkedOther('Dot', null)"), "Dot walks the path");
  assert.deepEqual(plain(p.run("S.mibis.map(mibiSpName)")), Array(4).fill("a Station species"));
  assert.ok(p.S.log.some(l => /Dot \(a Station species\) is home at the Station/.test(l)));
});

test("X1 6: every SPECIES lookup goes through spOf; the two plates are in the register and the plate table", () => {
  const script = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  const hits = script.split("\n").filter(l => /SPECIES\[/.test(l));
  assert.equal(hits.length, 1, "SPECIES[ appears once: " + hits.join("\n")); assert.match(hits[0], /^const spOf = sp => /);
  assert.match(source("spOf"), /: SP_OTHER\);$/);
  const reg = vm.runInContext(PAGE.match(/^const CARE_ASSETS = \[[^]*?^\];$/m)[0] + "\n;CARE_ASSETS", vm.createContext({}));
  const plate = vm.runInContext(PAGE.match(/^const PLATE = \{[^]*?\};/m)[0] + "\n;PLATE", vm.createContext({}));
  for (const [id, w] of [["c-sprite-other-32", 32], ["c-mini-other-12", 12]]) {
    const e = reg.find(x => x.id === id); assert.ok(e, id); assert.equal(e.status, "placeholder"); assert.equal(e.w, w); assert.equal(e.h, w);
    assert.ok(plate[id], id + " has a plate entry"); assert.equal(plate[id][0], "stone"); }
  assert.match(source("mibiSprite"), /spOf\(sp\)\.other \? placeholderPlate\('c-sprite-other-32'|if \(spOf\(sp\)\.other\) placeholderPlate\('c-sprite-other-32', x, y, k\)/);
  assert.match(source("miniOf"), /if \(spOf\(sp\)\.other\) placeholderPlate\('c-mini-other-12', x, y\)/);
});

test("X1 7: a returned S05 pod keeps its species and genome seed through every rebuild: the field, take, swap, a break's drop and the crate; it lands unidentified and unread", async () => {
  const { podGenome, frameOf } = await import("../../station/src/genome.mjs");
  const p = X1.page(); p.run("newWorld(1); save();");
  const st = ST.normalize(ST.freshSt(p.S.wid, p.S.turn)), cell = p.run("G.land.findIndex((l, i) => i > 0 && passable(i))");
  // the Station's returned records: one with species and gs (the Station lead's fix), one from before it (neither)
  st.returned = [{ id: "dev-1-9:p0", sp: -1, species: "S05", g: "meadow", gs: 12345, k: String(cell) }, { id: "old", sp: 0, g: "meadow", k: String(cell) }];
  assert.ok(ST.dockKey(st, p.sv()).docked); p.putSt(st); p.run("save()");
  const back = () => p.run("S.pods.filter(q => q.id[0] === 'r').map(q => ({ sp: q.sp, species: q.species, gs: q.gs }))");
  assert.deepEqual(plain(back()), [{ sp: -1, species: "S05", gs: 12345 }, { sp: 0 }], "the field pod is the same individual; an older record keeps today's bytes (no species, no gs)");
  assert.ok(ST.dockKey(st, p.sv()).lifted); p.putSt(st); p.run("save()");
  p.run("S.phase = 'setup'"); p.key("confirm"); p.key("confirm"); assert.ok(p.S.exp); p.key("confirm"); assert.equal(p.S.phase, "patch");
  p.key("call"); p.pass(2000);   // one Call: the place counts as explored, so the expedition seals a crate
  const pod = "S.pods.find(q => q.species === 'S05')", held = () => p.run("S.exp.cargo.pods.map(q => ({ id: q.id, species: q.species, gs: q.gs }))");
  // take
  p.run(`takePod(${pod})`); assert.deepEqual(plain(held()).map(q => [q.species, q.gs]), [["S05", 12345]], "take");
  // swap: the hold full, a field pod taken in its place: it goes back to the field with its species
  p.run("while (S.exp.cargo.pods.length < S.exp.hold) S.exp.cargo.pods.push({ id: 'f' + S.exp.cargo.pods.length, sp: 0, g: 'meadow', how: 'ground', bur: 0, gs: 1, k: S.exp.patch.key });");
  p.run("S.pods.push({ id: 'z', k: S.exp.patch.key, x: 3, y: 3, sp: 0, h: 0, g: 'meadow', how: 'ground' }); takePod(S.pods.find(q => q.id === 'z'), 0);");
  assert.deepEqual(plain(p.run(`(${pod})`)).species, "S05", "swapped back to the field"); assert.equal(p.run(`(${pod}).gs`), 12345);
  // take it again, then a break drops the hold
  p.run(`S.exp.cargo.pods = []; takePod(${pod});`);
  p.run("dropPods(S.exp, {})");
  const dropped = p.run("S.pods.filter(q => q.id[0] === 'b').map(q => [q.species, q.gs])");
  assert.deepEqual(plain(dropped), [["S05", 12345]], "a break's drop");
  // take the dropped pod and end the expedition: the crate carries it
  p.run("S.exp.cargo.pods = []; takePod(S.pods.find(q => q.id[0] === 'b')); endExpedition('sent');");
  const crate = p.S.bay.at(-1); assert.ok(crate, "sealed: " + JSON.stringify(p.run("[S.report, S.bay.length, S.hold]"))); assert.deepEqual(plain(crate.pods.map(q => [q.sp, q.species, q.gs])), [[-1, "S05", 12345]], "the crate");
  // the Station opens it: the same genome, species S05, unidentified and unread
  p.run("save()"); assert.ok(ST.dockKey(st, p.sv()).docked); const o = ST.openBay(st, p.sv());
  assert.equal(o.plays[0].ids.length, 1, "the pod lands");
  const landed = st.tray.concat(st.waiting).find(t => t.id === o.plays[0].ids[0]);
  assert.equal(landed.species, "S05"); assert.equal(landed.gs, 12345); assert.equal(landed.idd, 0); assert.deepEqual(plain(landed.read), []);
  assert.deepEqual(plain(landed.genome), plain(podGenome(frameOf("S05"), 12345)), "the same individual");
});

// ---- X26: the juvenile rides in the Companion (option A: no field token, no partner role; ex.rider beside an unchanged ex.pt) ----
// The whole page in the sandbox, undocked, with the given mibis carried; draw calls recorded by wrapping the page's own
// functions (text, panel, miniOf, mibiSprite, placeholderPlate, and art for the rings: RING is 'ptring2', RING_S 'ptrings2').
const X26 = (() => {
  const mib = (id, name, sp, o = {}) => Object.assign({ id, name, sp, born: 0, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null, mem: null }, o);
  function world(mibis, carried, { motion = false } = {}) {
    const p = X1.page(); p.run("newWorld(1); save();");
    p.run(`S.mibis = ${JSON.stringify(mibis)}; S.carried = ${JSON.stringify(carried)}; S.phase = 'setup'; S.ui.sel = 0; RM.matches = ${!motion};`);
    p.run(`var __d = []; (() => {
      const w = (name, f) => { const real = globalThis[name]; globalThis[name] = (...a) => { __d.push(f(...a)); return real(...a); }; };
      w('text', (s, x, y, col, k) => ['text', String(s), x, y, col, k || 2]);
      w('panel', (x, y, ww, h, fill, border) => ['panel', x, y, ww, h, fill, border]);
      w('miniOf', (sp, x, y, juv) => ['mini', sp, x, y, !!juv]);
      w('mibiSprite', (sp, pose, fr, x, y, k, flip, juv) => ['sprite', sp, pose, fr, x, y, k || 1, !!flip, !!juv]);
      w('placeholderPlate', (id, x, y, k, sp, fr, juv) => ['plate', id, x, y, k || 1, sp, fr || 0, !!juv]);
      w('art', key => ['art', key]);
    })();`);
    return Object.assign(p, {
      draw(phase, t = 0) { p.run(`__d.length = 0; S.phase = ${JSON.stringify(phase)}; NOW = ${t}; render(${t / 1000});`); return plain(p.run("__d")); },
      setOut() { p.run("S.phase = 'setup'; S.ui.sel = 0;"); p.key("confirm"); p.key("confirm"); assert.ok(p.S.exp, "set out"); },
    });
  }
  return { mib, world };
})();
const dot = (o = {}) => X26.mib(1, "Dot", 1, o), pip = (o = {}) => X26.mib(2, "Pip", 0, Object.assign({ grownTurn: 0 }, o));

test("X26 §5.1: with only juvenile Dot carried, ex.pt is null and ex.rider is Dot's { id, name, sp }; with grown Pip too, Pip is the partner and there is no rider", () => {
  let p = X26.world([dot()], [1]); p.setOut();
  assert.equal(p.S.exp.pt, null); assert.deepEqual(plain(p.S.exp.rider), { id: 1, name: "Dot", sp: 1 });
  p = X26.world([pip(), dot()], [1, 2]); p.setOut();
  assert.equal(p.S.exp.pt.id, 2); assert.equal(p.S.exp.rider, null);
  p = X26.world([dot()], []); p.setOut(); assert.equal(p.S.exp.pt, null); assert.equal(p.S.exp.rider, null, "nobody carried: no rider");
  p = X26.world([dot(), X26.mib(3, "Moss", 2)], [3, 1]); p.setOut(); assert.equal(p.S.exp.rider.id, 3, "the first in carried order");
});

test("X26 §5.2: with a rider no field token, no dig, no calm, no glow and no flinch", () => {
  // a juvenile Tuikis: no token in any place, no dig, the fog sight and the fog Call reach as with no partner
  let p = X26.world([dot()], [1]); p.setOut(); p.key("confirm"); assert.equal(p.S.phase, "patch");
  assert.ok(Object.keys(p.S.exp.live).length > 0); for (const k in p.S.exp.live) assert.equal(p.S.exp.live[k].pt, null, "live.pt in " + k);
  assert.equal(p.run("canDig()"), false); assert.equal(p.run("digPartner()"), null);
  assert.equal(p.run("ptCtx().ptAb"), null); assert.equal(p.run("ptCtx().ptSp"), -1);
  p.run("inFog = () => true;");
  assert.equal(p.run("sightR(curLay())"), p.run("SIGHT_FOG"), "the fog sight");
  p.run("callPlace()"); assert.ok(p.run("FX.notes.some(n => n.once === 'muffled')"), "the Call muffled: its reach is CALL_R_FOG = " + p.run("CALL_R_FOG"));
  p.run("S.exp.pt = { id: 1, name: 'Dot', sp: 1, elder: false };"); assert.equal(p.run("sightR(curLay())"), p.run("SIGHT_GLOW"), "control: a Tuikis partner glows");
  // a juvenile Loika beside a wary wild Loika: not calmed
  p = X26.world([X26.mib(1, "Dot", 0)], [1]); p.setOut(); p.key("confirm");
  const wild = "({ sp: 0, x: S.exp.patch.x + 1, y: S.exp.patch.y })";
  assert.equal(p.run(`calmedBy(${wild}, ptCtx())`), false, "the rider calms no one");
  p.run("curLive().pt = { x: S.exp.patch.x, y: S.exp.patch.y }; S.exp.pt = { id: 1, name: 'Dot', sp: 0, elder: false };");
  assert.equal(p.run(`calmedBy(${wild}, ptCtx())`), true, "control: a Loika partner beside it calms it");
  // a juvenile Untuva in a strong storm with a stray strike rolled: no flinch line
  p = X26.world([X26.mib(1, "Dot", 2)], [1]); p.setOut();
  const storm = "stormLevel = () => 2; stormRain = () => true; S.exp.storm = null; sheltered = () => false; inFog = () => false; depotShelter = () => false; rnd = () => 0; S.exp.passWarned = 1; S.exp.hitAt = -99; S.exp.stray = null; S.exp.shield = 9; FX.notes = [];";
  p.run(storm + " advance('map');"); assert.ok(p.run("!!S.exp.stray"), "the stray strike was rolled");
  assert.ok(!p.run("FX.notes.some(n => /flinches/.test(n.text))"), "no flinch line");
  p.run(storm + " S.exp.pt = { id: 1, name: 'Dot', sp: 2, elder: false }; advance('map');");
  assert.ok(p.run("FX.notes.some(n => /flinches/.test(n.text))"), "control: an Untuva partner flinches");
});

test("X26 §5.3: the HUD draws the rider's mini in a slate window at the partner's rect, no RING_S, its name in fog clipped to the room; nobody carried, the slot is empty", () => {
  let p = X26.world([dot()], [1]); p.setOut();
  let d = p.draw("map");
  const mini = d.find(c => c[0] === "mini"); assert.ok(mini, "the rider's mini"); const [, sp, x, y] = mini;
  assert.equal(sp, 1); assert.equal(y, 10);
  assert.ok(d.some(c => c[0] === "panel" && c[1] === x - 2 && c[2] === 8 && c[3] === 16 && c[4] === 16 && c[5] === p.run("C.night") && c[6] === p.run("C.slate")), "the window (x − 2, 8, 16, 16), night in slate");
  assert.ok(!d.some(c => c[0] === "art" && c[1] === "ptrings2"), "no RING_S");
  const nm = d.find(c => c[0] === "text" && c[1] === "Dot"); assert.ok(nm, "the name"); assert.equal(nm[2], x + 17); assert.equal(nm[3], 9);
  assert.equal(nm[4], p.run("C.fog")); assert.notEqual(nm[4], p.run("C.amber"), "never amber");
  // a long name is clipped to rx − 4, never dropped
  p.run("S.exp.rider.name = 'Abcdefghijklmnopqrstuvwxyz'"); d = p.draw("map");
  const lng = d.find(c => c[0] === "text" && /^Abc/.test(c[1])); assert.ok(lng && lng[1].endsWith("…"), "clipped: " + (lng && lng[1]));
  // a save from before ex.rider: the slot is empty and nothing throws
  p.run("delete S.exp.rider"); assert.doesNotThrow(() => { d = p.draw("map"); }); assert.ok(!d.some(c => c[0] === "mini"), "no rider record: empty");
  p = X26.world([dot()], []); p.setOut(); d = p.draw("map"); assert.ok(!d.some(c => c[0] === "mini" || (c[0] === "text" && c[1] === "Dot")), "nobody carried: empty");
  p = X26.world([pip(), dot()], [2, 1]); p.setOut(); d = p.draw("map");
  assert.ok(d.some(c => c[0] === "art" && c[1] === "ptrings2") && d.some(c => c[0] === "text" && c[1] === "Pip" && c[4] === p.run("C.amber")), "a grown partner: as built");
});

test("X26 §5.4: the partner card with only Dot: its sprite without RING, its name, the juvenile chip and one 2× line, no 'No partner'; two juveniles show the first carried", () => {
  const T = X1.page().run("CARE_TEXT");
  let p = X26.world([dot()], [1]); let d = p.draw("setup");
  assert.ok(d.some(c => c[0] === "sprite" && c[1] === 1 && c[2] === "idle" && c[4] === 28 && c[5] === 264 && c[6] === 2), "Dot's sprite at 2× in the face place");
  assert.ok(!d.some(c => c[0] === "art" && (c[1] === "ptring2" || c[1] === "dcirc64")), "no RING() and no dashed circle");
  assert.ok(d.some(c => c[0] === "text" && c[1] === "Dot" && c[2] === 112 && c[3] === 260 && c[5] === 3), "its name at (112, 260), 3×");
  assert.ok(d.some(c => c[0] === "text" && c[1] === "juvenile" && c[2] === 120 && c[3] === 295), "the juvenile chip at (112, 292)");
  const lines = d.filter(c => c[0] === "text" && c[3] === 320 && c[2] === 112); assert.deepEqual(lines.map(c => c[1]), [T.riderTime], "one 2× line, unbonded");
  assert.equal(lines[0][4], p.run("C.stone"));
  for (const no of ["No partner", "young · grows in time", "young · grows with care"]) assert.ok(!d.some(c => c[0] === "text" && c[1] === no), "no " + no);
  assert.ok(!d.some(c => c[0] === "plate" && c[1] === "c-heart-16"), "no heart unbonded");
  p = X26.world([dot({ bonded: true })], [1]); d = p.draw("setup");
  assert.ok(d.some(c => c[0] === "text" && c[1] === T.riderCare && c[3] === 320), "bonded: riderCare");
  assert.ok(d.some(c => c[0] === "plate" && c[1] === "c-heart-16" && c[3] === 266), "bonded: the heart");
  p = X26.world([dot(), X26.mib(3, "Moss", 2)], [3, 1]); d = p.draw("setup");
  assert.ok(d.some(c => c[0] === "sprite" && c[1] === 2 && c[4] === 28) && d.some(c => c[0] === "text" && c[1] === "Moss" && c[3] === 260), "the first in S.carried");
  assert.equal(d.filter(c => c[0] === "plate" && c[1] === "c-face-24").length, 2, "both as ring faces on the right");
  assert.ok(!d.some(c => c[0] === "art" && c[1] === "rf24t"), "every ring stone: there is no partner");
  // unchanged: none carried, a grown partner
  p = X26.world([dot()], []); d = p.draw("setup"); assert.ok(d.some(c => c[0] === "text" && c[1] === "No one with you"));
  p = X26.world([pip()], [2]); d = p.draw("setup"); assert.ok(d.some(c => c[0] === "art" && c[1] === "ptring2"), "a partner keeps its ring");
});

test("X26 §5.5: one set-out message names the rider, once per expedition; no Dig or ability prompt at the burrow with a juvenile Tuikis", () => {
  const T = X1.page().run("CARE_TEXT"), say = T.riderSetOut("Dot");
  const p = X26.world([dot()], [1]); p.setOut();
  const shown = () => p.run("FX.msg").includes(say);
  let seen = 0; for (let i = 0; i < 6; i++) { if (shown()) seen++; p.key(["right", "left", "down", "up"][i % 4]); }
  assert.equal(seen, 1, "shown once in the expedition (on expedition 1, on the first move after mapintro)");
  assert.equal(p.run("S.exp.once.rider"), 1);
  assert.ok(p.S.log.some(l => /Set out · .* · Dot rides along · tier 1$/.test(l)), "the set-out log line names it as riding: " + p.S.log.join(" | "));
  p.run("S.ui.from = 'map'; S.phase = 'menu'"); p.key("back"); p.key("confirm");
  // the burrow: the gate and the narrow hole in front of the player
  p.key("confirm"); assert.equal(p.S.phase, "patch");
  for (const kind of ["g", "n"]) { p.run(`occupant = () => ({ type: 'feat', f: { kind: '${kind}', id: 0, x: 0, y: 0 } }); S.opened[G.gate] = 0;`);
    const a = p.run("patchAction()"); assert.ok(!/dig|Dig|Ask/.test(a.label || ""), kind + ": " + a.label); }
  // a second expedition: the message again, once
  p.run("endExpedition('sent'); S.phase = 'setup';"); p.setOut();
  seen = 0; for (let i = 0; i < 6; i++) { if (shown()) seen++; p.key(["right", "left", "down", "up"][i % 4]); }
  assert.equal(seen, 1, "once in the next expedition too");
});

test("X26 §5.6: endExpedition gives the rider +1 outing and its mem, no notch; the trip's partner is null and carried holds Dot", () => {
  const p = X26.world([dot({ bonded: true })], [1]); p.setOut(); p.key("confirm"); p.key("call"); p.pass(2000);
  p.run("S.exp.abUsed = 1; endExpedition('sent');");
  const m = p.S.mibis[0]; assert.equal(m.outings, 1); assert.ok(m.mem, "its memory: " + m.mem); assert.equal(m.notches, 0, "no notch");
  const tr = p.S.trips.at(-1); assert.equal(tr.partner, null); assert.deepEqual(plain(tr.carried), [1]);
  assert.equal(p.run("tripRecord({ n: 9, pt: null, rider: { id: 1, name: 'Dot', sp: 1 } }, [1]).partner"), null);
});

test("X26 §5.7: the Walk adds no Data at any stage: nothing in the save moves but the mibis, walkTurn and the log", () => {
  for (const [label, m] of [["juvenile", dot()], ["bonded juvenile", dot({ bonded: true, bondCare: 0, care: 0 })], ["adult", dot({ grownTurn: 0 })], ["elder", dot({ grownTurn: 0 })]]) {
    const p = X26.world([m], [1]); if (label === "elder") p.run("S.turn = 6");
    p.run("S.hold = { e: 1, d: 2, s: 3, pods: [] }; save();"); const before = p.sv();
    p.run("walk(mibiById(1)); save();"); const after = p.sv();
    assert.equal(after.mibis[0].outings, 1, label + ": walked");
    assert.equal(without(after, ["mibis", "walkTurn", "log"]), without(before, ["mibis", "walkTurn", "log"]), label + ": no Data, nothing else");
  }
  const T = X1.page().run("CARE_TEXT");
  assert.equal(T.walkedYoung("Dot", "meadow"), "Dot walks the meadow"); assert.equal(T.walkedYoung("Dot", null), "Dot walks the path");
  const p = X26.world([X26.mib(1, "Dot", 0, { mem: "meadow" })], [1]); p.run("walk(mibiById(1))");
  const said = p.run("FX.notes.map(n => n.text).join('\\n')");
  assert.match(said, /^Dot walks the meadow$/m, "a juvenile Loika's Walk line names no field result"); assert.ok(!/calms a wary Loika/.test(said));
  const q = X26.world([X26.mib(1, "Dot", 0, { grownTurn: 0, mem: "meadow" })], [1]); q.run("walk(mibiById(1))");
  assert.match(q.run("FX.notes.map(n => n.text).join('\\n')"), /calms a wary Loika/, "a grown Loika's line as built");
});

test("X26 §5.8: activeStatus with you: an unbonded juvenile exactly stTooYoung, a bonded one exactly stGrowsWithCare, mid-expedition too", () => {
  const p = X26.world([dot(), X26.mib(3, "Moss", 2, { bonded: true })], [1, 3]);
  assert.equal(p.run("activeStatus(mibiById(1))"), p.run("CARE_TEXT.stTooYoung")); assert.equal(p.run("activeStatus(mibiById(3))"), p.run("CARE_TEXT.stGrowsWithCare"));
  p.setOut();
  assert.equal(p.run("activeStatus(mibiById(1))"), "with you · too young for the Probe"); assert.equal(p.run("activeStatus(mibiById(3))"), "with you · grows with care");
});

test("X26 §5.9: a save made before this change loads and plays; an expedition in progress without ex.rider shows the empty slot and does not throw", () => {
  const p = X26.world([dot()], [1]); p.setOut(); p.run("delete S.exp.rider; save();");
  const q = X1.page({ ...p.store }); assert.equal(q.S.exp.rider, undefined);
  for (const ph of ["map", "menu", "mibis", "active", "cargo"]) assert.doesNotThrow(() => q.run(`S.phase = '${ph}'; S.ui.from = 'map'; render(0); lineFor();`), ph);
  q.run("S.phase = 'map'"); assert.doesNotThrow(() => { q.key("right"); q.key("confirm"); q.key("call"); });
  q.run("S.phase = 'mibis'; S.ui.rSel = 0;"); assert.equal(q.run("lineFor().ctx"), "no one grown yet", "the Lead card with no partner never says 'leads this expedition'");
});

test("X26 bottom line: mid-expedition with a rider the menu's Mibis row reads riderMenu and the Lead card 'no one grown yet'; with a partner as built", () => {
  const p = X26.world([dot()], [1]); p.setOut();
  p.run("S.ui.from = 'map'; S.phase = 'menu'; S.ui.menuSel = menuItems().findIndex(it => it.id === 'mibis');");
  assert.equal(p.run("lineFor().ctx"), "Dot rides along"); assert.equal(p.run("lineFor().ok"), "Open Mibis");
  p.run("S.phase = 'mibis'; S.ui.rSel = 0;"); assert.equal(p.run("lineFor().ctx"), p.run("CARE_TEXT.noOneGrown"));
  const q = X26.world([pip(), dot()], [2, 1]); q.setOut();
  q.run("S.ui.from = 'map'; S.phase = 'menu'; S.ui.menuSel = menuItems().findIndex(it => it.id === 'mibis');"); assert.equal(q.run("lineFor().ctx"), "");
  q.run("S.phase = 'mibis'; S.ui.rSel = 0;"); assert.equal(q.run("lineFor().ctx"), "leads this expedition");
});

test("X26 copy: the copywriter's signed strings, within their widths", () => {
  const p = X1.page(), T = p.run("CARE_TEXT"), N = "Abcdefghij";
  assert.equal(T.riderTime, "grows in time in the Companion"); assert.equal(T.riderCare, "grows with care in the Companion");
  assert.equal(T.riderSetOut("Dot"), "Dot rides along until it’s grown"); assert.equal(T.riderMenu("Dot"), "Dot rides along");
  assert.equal(T.walkedYoung("Dot", "pond"), T.walkedOther("Dot", "pond"), "walkedYoung shares walkedOther's string");
  const w = (s, f = "textW") => p.run(`${f}(${JSON.stringify(s)}, 2)`), wide = "W".repeat(10), nm = w(wide) <= 118 ? wide : N;
  assert.ok(w(T.riderTime) <= 306 && w(T.riderCare) <= 306, "the card line fits 306");
  assert.ok(w(T.riderSetOut(nm)) <= 400, "the set-out note fits one line"); assert.ok(w(T.riderMenu(nm), "textWT") <= 249, "the menu context fits 249");
  // the stage species line for a juvenile: '‹Species› · ‹abText› once grown'; an unknown-species juvenile keeps abOther; an adult as built
  const q = X26.world([dot(), X26.mib(3, "Bean", -1), pip()], [1, 3, 2]);
  const line = id => { q.run(`S.ui.aId = ${id}`); return q.draw("active").find(c => c[0] === "text" && c[2] === 30 && c[3] === 370)[1]; };
  assert.equal(line(1), "Tuikis · digs narrow burrows once grown");
  assert.equal(line(3), q.run("mibiSpName(mibiById(3))") + " · no field ability yet");
  assert.equal(line(2), "Loika · calms wary creatures");
});

test("X26 placeholder plates: no label unless the observer panel is open; a mibi's face and token plates carry its own mini and sprite", () => {
  const p = X26.world([dot(), X26.mib(3, "Bean", -1)], [1, 3]);
  p.run("var __obs = { hidden: true }; (() => { const d = document; globalThis.document = new Proxy({}, { get: (t, k) => k === 'getElementById' ? (id => id === 'obs' ? __obs : d.getElementById(id)) : d[k] }); })();");
  const labels = ["face", "f", "token", "t", "heart", "h", "mibi", "m"], lettered = d => d.filter(c => c[0] === "text" && c[5] === 1 && labels.includes(c[1]));
  let d = p.draw("setup");
  assert.ok(d.some(c => c[0] === "plate" && c[1] === "c-face-24" && c[5] === 1), "Dot's face plate");
  const f = d.find(c => c[0] === "plate" && c[1] === "c-face-24" && c[5] === 1); assert.ok(d.some(c => c[0] === "mini" && c[1] === 1 && c[2] === f[2] + 6 && c[3] === f[3] + 6), "its mini centred at (x + 6, y + 6)");
  assert.deepEqual(lettered(d), [], "the observer closed: no label");
  d = p.draw("mibis"); assert.ok(d.some(c => c[0] === "sprite" && c[1] === 1 && c[2] === "idle" && c[4] === 36 && c[6] === 1), "the token plate carries the 32 px sprite at (x + 8, y + 8)");
  assert.deepEqual(lettered(d), [], "the roster: no label");
  p.run("__obs.hidden = false"); d = p.draw("mibis");
  assert.ok(lettered(d).some(c => c[1] === "token"), "the observer open: the labels, as before"); assert.ok(lettered(d).some(c => c[1] === "mibi" || c[1] === "m"), "X1's plates too");
});

test("X26 look-out on a virtual clock: seeded 5000–8000 ms apart, held 960 ms, alert frame 0 at (97, 52), where idle stands; every second one flipped and the turn sticks; a page change restarts it; reduced motion holds idle frame 0", () => {
  // the pure schedule
  const s = X1.page(); assert.deepEqual(plain(s.run("[LOOK_MIN, LOOK_MAX, LOOK_HOLD]")), [5000, 8000, 960]);
  const sched = seed => { const on = [], flips = []; let was = false; for (let a = 0; a <= 40000; a += 10) { const o = s.run(`lookOut(${seed}, ${a})`); if (o.on && !was) { on.push(a); flips.push(o.flip); } was = o.on; } return { on, flips }; };
  for (const seed of [1, 2, 3, 99]) { const { on, flips } = sched(seed);
    assert.ok(on[0] >= 5000 && on[0] <= 8000, "the first after 5000–8000: " + on[0]);
    for (let i = 1; i < on.length; i++) assert.ok(on[i] - on[i - 1] >= 5000 && on[i] - on[i - 1] <= 8000, "apart " + (on[i] - on[i - 1]));
    assert.deepEqual(flips.slice(0, 4), [false, true, false, true], "every second flipped");
    assert.equal(s.run(`lookOut(${seed}, ${on[0] + 950}).on`), true); assert.equal(s.run(`lookOut(${seed}, ${on[0] + 960}).on`), false, "held 960 ms");
    assert.equal(s.run(`lookOut(${seed}, ${on[1] + 2000}).flip`), true, "the turn sticks after the second");
    assert.equal(s.run(`lookOut(${seed}, ${on[2] + 2000}).flip`), false, "the third turns it back"); }
  const seeds = new Set([1, 2, 3, 4, 5, 6].map(sd => sched(sd).on[0])); assert.ok(seeds.size > 1, "seeded, not a metronome");
  // on the stage, mid-expedition, undocked: 20 s at 20 ms a frame
  const p = X26.world([dot()], [1], { motion: true }); p.setOut(); p.run("S.ui.aId = 1");
  const frames = (t0, ms) => { const out = []; for (let t = t0; t < t0 + ms; t += 20) { const sp = p.draw("active", t).find(c => c[0] === "sprite"); assert.ok(sp, "drawn every frame, t " + t); out.push([t, ...sp]); } return out; };
  let f = frames(1000, 20000);
  const alerts = f.filter(x => x[3] === "alert");
  assert.ok(alerts.length, "it looks out");
  for (const x of alerts) { assert.equal(x[4], 0, "frame 0"); assert.equal(x[5], 97); assert.equal(x[6], 52, "the place of idle"); }
  for (const x of f.filter(x => x[3] === "idle")) { assert.equal(x[5], 97); assert.equal(x[6], 52, "idle at (97, 52)"); }
  const runs = []; for (let i = 0; i < f.length; i++) if (f[i][3] === "alert" && (i === 0 || f[i - 1][3] !== "alert")) { let j = i; while (j + 1 < f.length && f[j + 1][3] === "alert") j++; runs.push({ at: f[i][0], len: f[j][0] - f[i][0] + 20, flip: f[i][8], after: f[Math.min(j + 10, f.length - 1)][8] }); }
  assert.ok(runs.length >= 2, "at least two look-outs in 20 s: " + JSON.stringify(runs));
  assert.ok(runs[0].at - 1000 >= 5000 && runs[0].at - 1000 <= 8020, "the first 5000–8000 ms after the page opens: " + (runs[0].at - 1000));
  for (const r of runs) assert.ok(Math.abs(r.len - 960) <= 20, "held 960 ms: " + r.len);
  assert.equal(runs[0].flip, false); assert.equal(runs[1].flip, true, "the second flipped");
  assert.equal(runs[1].after, true, "the turn sticks in the idle afterwards"); assert.equal(runs[0].after, false);
  assert.ok(f.every(x => x[3] !== "curl"), "never asleep undocked");
  // a page change restarts it: Mibis one frame, then the stage again
  p.draw("mibis", 30000); f = frames(30020, 4980); assert.ok(f.every(x => x[3] === "idle"), "no look-out within 5000 ms of the page opening again");
  // a mibi grown with you, or the stage between expeditions: no look-out
  const q = X26.world([dot()], [1], { motion: true }); q.run("S.ui.aId = 1");
  for (let t = 0; t < 12000; t += 40) assert.equal(q.draw("active", t).find(c => c[0] === "sprite")[2], "idle", "between expeditions: no look-out");
  // reduced motion: idle frame 0 throughout, never flipped
  const r = X26.world([dot()], [1]); r.setOut(); r.run("S.ui.aId = 1");
  for (let t = 0; t < 12000; t += 40) { const sp = r.draw("active", t).find(c => c[0] === "sprite"); assert.deepEqual([sp[2], sp[3], sp[7]], ["idle", 0, false], "t " + t); }
});

test("X26 the foot row: in a 10 s virtual-clock run with a look-out, the lowest visible sprite row is the idle foot row in every frame (299 on the stage for all three species, on the signed tokens), for all three species; the sprite never moves", () => {
  for (const sp of [0, 1, 2]) {
    const p = X26.world([X26.mib(1, "Dot", sp)], [1], { motion: true }); p.setOut(); p.run("S.ui.aId = 1");
    // the lowest source row holding a pixel visible on the stage's ink, for a pose and frame, at 8× from the drawn y
    const low = (pose, fr, y) => p.run(`(() => { const a = creatureArt(${sp}, ${JSON.stringify(pose)}, ${fr}); let r = -1; for (let j = 0; j < a.h; j++) for (let i = 0; i < a.w; i++) { const v = a.p[j * a.w + i]; if (v >= 0 && v !== C.ink) r = j; } return ${y} + r * 8 + 7; })()`);
    const foot = low("idle", 0, 52); if (sp === 1) assert.equal(foot, 299, "Tuikis: the visible feet end on row 299");
    let alerts = 0;
    for (let t = 1000; t < 11000; t += 20) { const s = p.draw("active", t).find(c => c[0] === "sprite"); assert.ok(s, "drawn, t " + t);
      const [, , pose, fr, x, y] = s; if (pose === "alert") alerts++;
      assert.deepEqual([x, y], [97, 52], "the sprite never moves: t " + t + " " + pose);
      assert.equal(low(pose, fr, y), foot, "sp " + sp + " t " + t + " " + pose + ": the idle foot row"); }
    assert.ok(alerts > 0, "sp " + sp + ": a look-out in the 10 s run");
  }
});

// ---- Species art: the signed tokens and minis, used as they are ----
// page species, token name, the signed file under art/companion-48/species/, and the file's sha256 (S01 = species 0, S03 = 1, S02 = 2)
const SPECIES_FILES = [
  // page species 0, S01
  [0, "alert", "S01/c-token-S01-alert-32x32.png", "f45a9f86dd0ad14bb8c131cf67a3a687903b6f7ba14db3c06fd5742358ed5ab6"],
  [0, "eat0", "S01/c-token-S01-eat-f0-32x32.png", "cb8960484fc767bbc98de2b8b4a7cc5bad629f1c746877c01e7c4c09390afccd"],
  [0, "eat1", "S01/c-token-S01-eat-f1-32x32.png", "5856782f5dcebf2d953ec74c113c77037fd406c5b47be04a6a5e2f158eb00b82"],
  [0, "flee", "S01/c-token-S01-flee-32x32.png", "4b16555b9e0ec4ff55bd58e750fd23ba3031af761765c123633b3a1e616e7128"],
  [0, "huddle", "S01/c-token-S01-huddle-32x32.png", "7d9cd6bcba1f9967209d617ad66b53b612870d6e992ec1817a02d4f48ebf260f"],
  [0, "idle", "S01/c-token-S01-idle-32x32.png", "9f869e8bac7bea8d13f0653af617244d47a1d9f14ed2df3c7bda7c440dccdba4"],
  [0, "shake0", "S01/c-token-S01-shake-f0-32x32.png", "3e6f156c4ea1e5bc7f2c1d9a35c0d04aeda06ec754ac7842eda676169d16ba41"],
  [0, "shake1", "S01/c-token-S01-shake-f1-32x32.png", "385ed5dea381b4fa8e0f83b3b2767725ec9b2a5e43c60e9768678a168b9f0c76"],
  [0, "mini", "S01/c-mini-S01-12x12.png", "0e058cc4df269a52406afaa1e9847d991677b0efb8a0c1086a0a6d7259dddb02"],
  // page species 1, S03
  [1, "alert", "S03/c-token-S03-alert-32x32.png", "f6097462b67c6720628784d3f1572900d0bdb11c9af9b61e16b27f8051d545e0"],
  [1, "curl", "S03/c-token-S03-curl-32x32.png", "9a10b4f20c9366d9a02cd3ecdb45cfcb9b68dfacf95c206b625dc7e6aa88321f"],
  [1, "eat0", "S03/c-token-S03-eat-f0-32x32.png", "9606ad293d7b108da8e0a3581da00148332716022d13940b5c91d79a3e703fe5"],
  [1, "eat1", "S03/c-token-S03-eat-f1-32x32.png", "b02295fd894fefb6fddf5ceb9dad6879a57da53330953d5618b64306d31fd5dc"],
  [1, "flee", "S03/c-token-S03-flee-32x32.png", "cac0850f30359e5d1c0be4b39e46d7fb58d10a7ec02161ac1ca0839ce8592f5e"],
  [1, "huddle", "S03/c-token-S03-huddle-32x32.png", "0647fef5582491e2d585b43ce9b324f1a0add71ecc4aedc5b303db96c65d6cb5"],
  [1, "idle", "S03/c-token-S03-idle-32x32.png", "474f9be9f02db55b125495fda3afbd0b995dc23b2486faf5a9f37662a18fcf9e"],
  [1, "settle", "S03/c-token-S03-settle-32x32.png", "a6d789a5f7d2a9903c393b3504ad70fba2148e5f4ee27fe5b52f8a6d3441515d"],
  [1, "shake0", "S03/c-token-S03-shake-f0-32x32.png", "946fe35215d1c408ff7e48371041955f7ac8c17bd2bf674419c3db28b6c8ba2d"],
  [1, "shake1", "S03/c-token-S03-shake-f1-32x32.png", "e5111454999459eaeb01cfd7aacab3c466ee93b2acfde9c0b8ae4cfd061b84b3"],
  [1, "mini", "S03/c-mini-S03-12x12.png", "57e75627530901af35d858d96b6df0b98a432f8bf364305fbdf43c9e1fc7db4e"],
  // page species 2, S02
  [2, "alert", "S02/c-token-S02-alert-32x32.png", "c60bdf85036b7636513250c49d29961c34bdd3cba0e4525b4dc88b22d32bc0c5"],
  [2, "eat0", "S02/c-token-S02-eat-f0-32x32.png", "7afedb1bfade2ce7ba8ca97d0f35e97cb8c7506e0b34106751577175342e5c2d"],
  [2, "eat1", "S02/c-token-S02-eat-f1-32x32.png", "f516fd1e885c0470e8114faabb7b6bcb54323bf09141e0f84ddb7ec6342a29f7"],
  [2, "flee", "S02/c-token-S02-flee-32x32.png", "e633b40e257fdf62830c1b1e310b86d2d5c5992b898248a502a9af4e47b7f961"],
  [2, "huddle", "S02/c-token-S02-huddle-32x32.png", "af14fec42ec265a6cfa9865b974c6e7e05a7d55ce2ef986424334286a41eea7b"],
  [2, "idle", "S02/c-token-S02-idle-32x32.png", "9a633d709e1d419262fc02214bf76e180a09f253e29db28397ed6b661e7ab3d9"],
  [2, "shake0", "S02/c-token-S02-shake-f0-32x32.png", "38d9a3e481fc55284c13351525032bbfb947fe12b605a530f0b4fd9242e35456"],
  [2, "shake1", "S02/c-token-S02-shake-f1-32x32.png", "327f8d68a89a7d95397ab0a2be34f8bec12baa82edd1bff4d58f73a4084ae0bc"],
  [2, "mini", "S02/c-mini-S02-12x12.png", "fda0c37ecf036a87a3d1260cbc3afe9ed4a3aa75ed30bb7f0fafc150cfecc6c2"],
];
test("species art: the page's embedded pictures are the signed PNGs, pixel for pixel (when the files are in the tree), 0 off-palette", () => {
  const p = X1.page(), rgb = p.run("RGB"), art = p.run("SPECIES_ART.map(t => Object.fromEntries(Object.entries(t).map(([n, r]) => [n, tokenPB(r, n === 'mini' ? 12 : 32).p])))");
  assert.deepEqual(plain(art.map(t => Object.keys(t).length)), [9, 11, 9], "S01 8 tokens and a mini, S03 10 and a mini, S02 8 and a mini");
  assert.deepEqual(SPECIES_FILES.map(f => f[0] + f[1]).sort(), plain(art.flatMap((t, i) => Object.keys(t).map(n => i + n))).sort(), "every picture has its file, and every file its picture");
  let compared = 0;
  for (const [sp, name, file, sha] of SPECIES_FILES) {
    const px = Array.from(art[sp][name]), w = name === "mini" ? 12 : 32;
    assert.equal(px.length, w * w, file + " fills its square"); assert.ok(px.every(v => v >= -1 && v < 48), file + " is on the 48 colours");
    const url = new URL("../../../art/companion-48/species/" + file, import.meta.url);
    if (!existsSync(url)) continue;
    const buf = readFileSync(url), img = decodePNG(buf), d = decodeExact(img.rgba, img.width ?? img.w, img.height ?? img.h, rgb);
    assert.equal(createHash("sha256").update(buf).digest("hex"), sha, file + ": the signed file"); assert.equal(d.bad, 0, file + ": 0 off-palette");
    assert.deepEqual(px, Array.from(d.px), file + ": the embedded rows are the signed pixels"); compared++;
  }
  assert.ok(compared === 0 || compared === SPECIES_FILES.length, "all of the signed files or none");
});

test("species art: each state uses its own master, the cards show it at whole pixels, glow and nest are the idle, and the silhouette is derived", () => {
  const p = X1.page(), tok = (sp, pose, fr = 0) => p.run(`tokenOf(${sp}, '${pose}', ${fr})`), key = (sp, pose, fr) => { const t = tok(sp, pose, fr); return t && p.run(`SPECIES_ART[${sp}]`) && Array.from(t.p).join(); };
  for (const sp of [0, 1, 2]) {
    for (const pose of ["idle", "alert", "flee", "huddle", "shake", "eat"]) assert.ok(tok(sp, pose, 0) && tok(sp, pose, 1), sp + " " + pose);
    for (const pose of ["shake", "eat"]) assert.notEqual(key(sp, pose, 0), key(sp, pose, 1), sp + " " + pose + ": two frames");
    assert.equal(key(sp, "approach", 0), key(sp, "alert", 0), "approach is the alert pose, as it was drawn");
    assert.equal(key(sp, "idle", 1), key(sp, "idle", 0), "one idle picture");
  }
  assert.equal(key(0, "glow", 0), key(0, "idle", 0)); assert.equal(key(2, "glow", 0), key(2, "idle", 0), "a Loika and an Untuva glow as their idle, as drawn");
  assert.ok(tok(1, "curl") && tok(1, "settle") && !tok(0, "curl") && !tok(2, "settle"), "curl and settle are the Tuikis'");
  assert.equal(key(1, "glow", 0), key(1, "idle", 0)); assert.equal(key(1, "nest", 0), key(1, "idle", 0), "a Tuikis' glow and nest are the signed idle, no halo");
  assert.equal(p.run("creatureArt(1, 'nest', 0, 2).w"), 64);
  for (const sp of [0, 1, 2]) assert.equal(p.run(`(() => { const a = tokenOf(${sp}, 'idle', 0), s = silhouette(${sp}); return a.p.every((v, i) => s.p[i] === (v >= 0 ? C.slate : -1)); })()`), true, "the silhouette is the signed idle's alpha in slate");
  assert.ok(!/function buildCreature|haloArt/.test(PAGE), "no creature or halo drawn in code");
  // the lowest opaque row of every signed token, as a table: every pose of every species stands on its idle's row (31)
  const FOOT = { 0: 31, 1: 31, 2: 31 };
  for (const sp of [0, 1, 2]) for (const name of plain(p.run(`Object.keys(SPECIES_ART[${sp}]).filter(n => n !== 'mini')`))) {
    const row = p.run(`(() => { const a = tokenOf(${sp}, '${name.replace(/[01]$/, "")}', ${/1$/.test(name) ? 1 : 0}); let r = -1; for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) { const v = a.p[j * 32 + i]; if (v >= 0) r = j; } return r; })()`);
    assert.equal(row, FOOT[sp], "foot row of species " + sp + " " + name); }
  for (const sp of [0, 1, 2]) {   // 1×: the token itself; 2×: each pixel twice, nothing else; the mini 12 px
    assert.equal(p.run(`creatureArt(${sp}, 'alert', 0) === tokenOf(${sp}, 'alert', 0)`), true);
    assert.equal(p.run(`(() => { const a = tokenOf(${sp}, 'flee', 0), b = creatureArt(${sp}, 'flee', 0, 2); if (b.w !== 64) return false;
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (b.p[y * 64 + x] !== a.p[(y >> 1) * 32 + (x >> 1)]) return false; return true; })()`), true, sp + " at 2×");
    assert.deepEqual(plain(p.run(`[ICON.mini(${sp}).w, ICON.mini(${sp}).h]`)), [12, 12]);
  }
  assert.ok(!/ell\(|poly\(/.test(source("tokenPB") + source("tokenOf")), "the token path draws no shape");
  assert.equal(p.run("miniOf.toString().includes('c-mini-other-12') && mibiSprite.toString().includes('c-sprite-other-32')"), true, "the unknown species' labelled placeholders are intact");
});

// ---- Juvenile pictures: where they go, how they are looked up, and the rules the signed set must meet ----
// JUVENILE_ART holds the signed juvenile pictures (all three species); a species without an entry shows the adult's picture. The checks
// below are written against the studio's ids and rules, so they run on the real table as soon as it holds pictures, and on
// stand-in fixtures (adult pictures, or generated shapes) to prove the lookup and the rules themselves.
const JUV_NAMES = ["idle", "alert", "huddle", "eat0", "eat1", "mini"];
const JUV_S = { 0: "S01", 1: "S03", 2: "S02" };   // page species -> the studio's species id
const juvFile = (sp, n) => JUV_S[sp] + "/" + (n === "mini" ? "c-mini-" + JUV_S[sp] + "-juv-12x12.png" : "c-token-" + JUV_S[sp] + "-juv-" + (n === "eat0" ? "eat-f0" : n === "eat1" ? "eat-f1" : n) + "-32x32.png");
// species, piece, file, and the file's sha256
const JUV_SHA = {   // the three signed sets (2026-10-15), as listed in the species README
  "S01/c-token-S01-juv-alert-32x32.png": "a66cb8c5e457b2adb6ee1230895c52a0cee392de818256973880daf237c9cacb",
  "S01/c-token-S01-juv-eat-f0-32x32.png": "e16be5c15cbd060ee708a38aa4bff3b1e72cbc5748e8d5115108794284f9f6e4",
  "S01/c-token-S01-juv-eat-f1-32x32.png": "f11b35001f9d0f5dd20c0e4d3c828c80996d14e6aad757d2f7ed6edf34cd952b",
  "S01/c-token-S01-juv-huddle-32x32.png": "04b21c0ec8ccaf89b303ad90961c798beab5e1438146614cb171ebafc2a3aa97",
  "S01/c-token-S01-juv-idle-32x32.png": "11a417f5fa774686a8d951e5a3c45431f4bd13c1b8c5b501cfb6350606bbafe4",
  "S01/c-mini-S01-juv-12x12.png": "8f8cf745ca1525d281d708b0fa4dc3219b5691f23dc593699faf27012c710a96",
  "S02/c-token-S02-juv-alert-32x32.png": "797c55cb99c442d72e403a9b7c731c8df6d31a45e539c2eba461d6d1c6078fb2",
  "S02/c-token-S02-juv-eat-f0-32x32.png": "16917dec7d62ef50da428d8f19af2386a97543443f3c2c7b86b2c5dc8ae03f49",
  "S02/c-token-S02-juv-eat-f1-32x32.png": "ccf48be513b8ea4a448ce64b4fad7af1fc963a028d6bc654d87d222397ec72b0",
  "S02/c-token-S02-juv-huddle-32x32.png": "f858506536f6282e16dd0b472d9a2d29d3f7ba2125854e77d0f92c4eb0275faf",
  "S02/c-token-S02-juv-idle-32x32.png": "d4776650d605c46b58be94c2eed3033f71979822e59045d0993672e5072fe16d",
  "S02/c-mini-S02-juv-12x12.png": "b60ff4ec467c9287fd95b94fdaf06938f45e5f92737a7750e96c5fe88a5f7efd",
  "S03/c-token-S03-juv-idle-32x32.png": "2e30a2f514968440bd0e4c673dec8fd599195a473760001a84fb49e9c27cb8b8",
  "S03/c-token-S03-juv-alert-32x32.png": "002a4ead03ef563833f39d9d9200237ca2ab3f3391e7825225d78431f2ce337a",
  "S03/c-token-S03-juv-huddle-32x32.png": "5f086fcbfbeb455dd983ab8f4ee380f7245e69dc3d79d27d1f0889d069e87d89",
  "S03/c-token-S03-juv-eat-f0-32x32.png": "9d605405c97178dd616de76d336108b68fa685b4ac607455aa549470f70858bb",
  "S03/c-token-S03-juv-eat-f1-32x32.png": "c6dc88e6ed393307ef8ea4107e4c916684fde0bec0eee4f0a7660b22a81f0975",
  "S03/c-mini-S03-juv-12x12.png": "fa5037914614b1342a3d9c7a33fa3cd941d6ba0b9732773ba9da91344b0a7dc8" };
const JUVENILE_FILES = [0, 1, 2].flatMap(sp => JUV_NAMES.map(n => [sp, n, juvFile(sp, n), JUV_SHA[juvFile(sp, n)] ?? null]));
const RUN48 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuv";
const inkOf = p => p.run("C.ink"), voidOf = p => p.run("C.void");

// The rules for one species' juvenile set (an object of six picture strings), read against the adult pictures in the page.
// Returns the list of problems (empty: the set meets the brief).
function juvProblems(p, sp, entry) {
  const bad = [], tag = JUV_S[sp] + " ";
  if (Object.keys(entry).sort().join() !== [...JUV_NAMES].sort().join()) return [tag + "needs exactly " + JUV_NAMES.join(", ")];
  const heightOf = px => { let top = -1, low = -1; const w = Math.sqrt(px.length); px.forEach((v, i) => { if (v >= 0) { if (top < 0) top = i / w | 0; low = i / w | 0; } }); return { top, low, h: low - top + 1 }; };
  const adult = (n, w) => heightOf(p.run(`Array.from(tokenPB(SPECIES_ART[${sp}].${n}, ${w}).p)`));
  const info = {};
  for (const n of JUV_NAMES) {
    const s = entry[n], w = n === "mini" ? 12 : 32;
    if (typeof s !== "string" || !/^(?:[.A-Za-z]\d*)+$/.test(s)) { bad.push(tag + n + ": not a picture string"); continue; }
    let total = 0, offPalette = false;
    for (const [, ch, r] of s.matchAll(/([.A-Za-z])(\d*)/g)) { total += r ? +r : 1; if (ch !== "." && !RUN48.includes(ch)) offPalette = true; }
    if (offPalette) bad.push(tag + n + ": a colour outside the 48");
    if (total !== w * w) { bad.push(tag + n + ": " + total + " pixels, not " + w * w); continue; }
    const px = p.run(`Array.from(tokenPB(${JSON.stringify(s)}, ${w}).p)`), g = heightOf(px);
    info[n] = { px, ...g };
    if (g.top < 0) { bad.push(tag + n + ": empty"); continue; }
    if (g.low !== w - 1) bad.push(tag + n + ": lowest opaque row " + g.low + ", not " + (w - 1));
    if (px.some(v => v < -1 || v > 47)) bad.push(tag + n + ": off the 48");
    if (sp !== 0 && px.includes(voidOf(p))) bad.push(tag + n + ": void is only in S01's pupils");
    if (!px.includes(inkOf(p))) bad.push(tag + n + ": no ink outline");
  }
  if (info.idle) {
    const want = Math.round(adult("idle", 32).h * 0.8);
    if (Math.abs(info.idle.h - want) > 1) bad.push(tag + "idle is " + info.idle.h + " px high, 80% of the adult idle is " + want + " (1 px either way allowed)");
    for (const n of ["alert", "huddle", "eat0", "eat1"]) if (info[n] && (info[n].h > info.idle.h + 2 || info[n].h < info.idle.h - (n === "huddle" ? 9 : 6))) bad.push(tag + n + " is " + info[n].h + " px high against the idle's " + info.idle.h);
    for (const n of ["alert", "huddle", "eat0", "eat1"]) if (info[n] && info[n].px.join() === info.idle.px.join()) bad.push(tag + n + " is the idle picture");
    if (info.eat0 && info.eat1 && info.eat0.px.join() === info.eat1.px.join()) bad.push(tag + "eat has two frames");
    for (const n of ["idle", "alert", "huddle", "eat0", "eat1"]) { const an = n === "eat0" ? "eat0" : n === "eat1" ? "eat1" : n; if (info[n] && p.run(`SPECIES_ART[${sp}].${an}`) === entry[n]) bad.push(tag + n + " is the adult's picture"); }
  }
  if (info.mini) { const want = Math.round(adult("mini", 12).h * 0.8); if (Math.abs(info.mini.h - want) > 1) bad.push(tag + "mini is " + info.mini.h + " px high, about " + want + " expected"); }
  return bad;
}
// Generated shapes (not art): an ink box with a lighter body, for the rules' own tests. The tokens stand on the foot row.
function synthJuvenile(p, sp, o = {}) {
  const ink = inkOf(p), body = 2, eye = 8, enc = px => { let out = "", i = 0; while (i < px.length) { let j = i; while (j < px.length && px[j] === px[i]) j++; out += (px[i] < 0 ? "." : RUN48[px[i]]) + (j - i > 1 ? j - i : ""); i = j; } return out; };
  const draw = (w, h, width, foot, k) => { const px = new Array(w * w).fill(-1), x0 = (w - width) >> 1;
    for (let y = foot - h + 1; y <= foot; y++) for (let x = x0; x < x0 + width; x++) px[y * w + x] = y === foot - h + 1 || y === foot || x === x0 || x === x0 + width - 1 ? ink : body;
    px[(foot - h + 3) * w + x0 + 2 + (k || 0)] = eye; return px; };
  const adultH = n => p.run(`(() => { const a = tokenPB(SPECIES_ART[${sp}].${n}, ${n === "mini" ? 12 : 32}), w = ${n === "mini" ? 12 : 32}; let t = -1; a.p.forEach((v, i) => { if (v >= 0 && t < 0) t = i / w | 0; }); return w - t; })()`);
  const ih = o.idleH ?? Math.round(adultH("idle") * 0.8), mh = o.miniH ?? Math.round(adultH("mini") * 0.8), foot = o.foot ?? 31;
  const set = { idle: enc(draw(32, ih, 14, foot)), alert: enc(draw(32, ih + 1, 14, foot, 1)), huddle: enc(draw(32, ih - 2, 16, foot)), eat0: enc(draw(32, ih - 1, 15, foot)), eat1: enc(draw(32, ih - 2, 15, foot, 1)), mini: enc(draw(12, mh, 8, o.miniFoot ?? 11)) };
  if (o.voidPixel) { const px = draw(32, ih, 14, foot); px[(foot - 2) * 32 + 16] = voidOf(p); set.idle = enc(px); }
  return set;
}

test("juvenile pictures: the table has one entry per species; a non-empty entry meets the brief's rules (all three are embedded)", () => {
  const p = X1.page(), J = plain(p.run("JUVENILE_ART"));
  assert.equal(J.length, 3, "one entry per species, in SPECIES_ART's order");
  assert.deepEqual(J.map(e => Object.keys(e).length), [6, 6, 6], "all three signed sets are embedded: six pictures each");
  assert.equal(p.run("JUVENILE_ART.length === SPECIES_ART.length"), true);
  let filled = 0;
  for (const sp of [0, 1, 2]) {
    assert.equal(typeof J[sp], "object");
    if (!Object.keys(J[sp]).length) continue;     // not embedded yet: the adult's picture is shown
    filled++; assert.deepEqual(juvProblems(p, sp, J[sp]), [], JUV_S[sp] + " meets the rules");
  }
  assert.equal(filled, 3);
});

test("juvenile pictures: the rules catch what the brief forbids (generated shapes: a valid set passes; wrong foot, height, mini row, void, a short string, an adult picture fail)", () => {
  const p = X1.page();
  for (const sp of [0, 1, 2]) {
    assert.deepEqual(juvProblems(p, sp, synthJuvenile(p, sp)), [], JUV_S[sp] + ": a set of the right size on the right rows passes");
    assert.ok(juvProblems(p, sp, synthJuvenile(p, sp, { foot: 30 })).some(m => /lowest opaque row 30, not 31/.test(m)), "foot row 30 fails");
    assert.ok(juvProblems(p, sp, synthJuvenile(p, sp, { miniFoot: 10 })).some(m => /mini: lowest opaque row 10, not 11/.test(m)), "mini row 10 fails");
    const adultIdle = p.run(`(() => { const a = tokenPB(SPECIES_ART[${sp}].idle, 32); let t = -1; a.p.forEach((v, i) => { if (v >= 0 && t < 0) t = i >> 5; }); return 32 - t; })()`);
    assert.ok(juvProblems(p, sp, synthJuvenile(p, sp, { idleH: adultIdle })).some(m => /80% of the adult idle/.test(m)), "an adult-height idle fails");
    assert.ok(juvProblems(p, sp, synthJuvenile(p, sp, { idleH: Math.round(adultIdle * 0.8) + 2 })).some(m => /80% of the adult idle/.test(m)), "two pixels too tall fails");
    assert.ok(juvProblems(p, sp, synthJuvenile(p, sp, { miniH: 4 })).some(m => /mini is 4 px high/.test(m)), "a mini far off 80% fails");
    assert.ok(juvProblems(p, sp, { ...synthJuvenile(p, sp), idle: "A5" }).some(m => /5 pixels, not 1024/.test(m)), "a short string fails");
    assert.ok(juvProblems(p, sp, { ...synthJuvenile(p, sp), mini: "w144" }).some(m => /outside the 48/.test(m)), "a letter outside the 48 fails");
    assert.ok(juvProblems(p, sp, { ...synthJuvenile(p, sp), eat1: p.run(`SPECIES_ART[${sp}].eat1`) }).some(m => /eat1 is the adult's picture/.test(m)), "an adult picture fails");
    assert.ok(juvProblems(p, sp, (({ mini, ...r }) => r)(synthJuvenile(p, sp))).some(m => /needs exactly/.test(m)), "a missing piece fails");
    assert.equal(juvProblems(p, sp, synthJuvenile(p, sp, { voidPixel: true })).some(m => /void is only in S01/.test(m)), sp !== 0, "void only for S01 (the pupils)");
  }
  assert.deepEqual([0, 1, 2].map(sp => p.run(`(() => { const a = tokenPB(SPECIES_ART[${sp}].idle, 32); let t = -1; a.p.forEach((v, i) => { if (v >= 0 && t < 0) t = i >> 5; }); return Math.round((32 - t) * 0.8); })()`)), [24, 24, 22], "the brief's heights: S01 24, S03 24, S02 22");
});

test("juvenile pictures: the signed files (S0n/c-token-S0n-juv-*-32x32.png, c-mini-S0n-juv-12x12.png), when in the tree, are what the page embeds, pixel for pixel and by sha256, 0 off-palette; a species has all six or none", () => {
  const p = X1.page(), rgb = p.run("RGB"), here = JUVENILE_FILES.filter(([, , file]) => existsSync(new URL("../../../art/companion-48/species/" + file, import.meta.url)));
  assert.ok(here.length === 0 || here.length === 18, "the signed files are all in the tree or none: " + here.length + " of 18");
  for (const sp of [0, 1, 2]) { const n = here.filter(f => f[0] === sp).length; assert.ok(n === 0 || n === 6, JUV_S[sp] + ": " + n + " of 6 files in the tree"); }
  for (const [sp, name, file, sha] of here) {
    const buf = readFileSync(new URL("../../../art/companion-48/species/" + file, import.meta.url)), img = decodePNG(buf), w = name === "mini" ? 12 : 32;
    const d = decodeExact(img.rgba, img.width ?? img.w, img.height ?? img.h, rgb);
    assert.equal(d.bad, 0, file + ": 0 off-palette, alpha 0 and 255 only");
    assert.deepEqual([img.width ?? img.w, img.height ?? img.h], [w, w], file + ": its size");
    assert.ok(sha, file + " is in the tree: record its sha256 in JUVENILE_FILES and embed it in JUVENILE_ART");
    assert.equal(createHash("sha256").update(buf).digest("hex"), sha, file + ": the signed file");
    const str = p.run(`JUVENILE_ART[${sp}].${name}`); assert.ok(str, file + " is in the tree: embed it in JUVENILE_ART");
    assert.deepEqual(Array.from(p.run(`Array.from(tokenPB(${JSON.stringify(str)}, ${w}).p)`)), Array.from(d.px), file + ": the embedded string is the signed pixels");
  }
  for (const sp of [0, 1, 2]) if (here.some(f => f[0] === sp)) assert.deepEqual(juvProblems(p, sp, plain(p.run(`JUVENILE_ART[${sp}]`))), [], JUV_S[sp] + ": the rules");
});

// Stand-in pictures to prove the routing: each juvenile slot of Loika (page species 0) holds a different adult picture, so a juvenile asking
// for a pose can be told from the adult's own. Tuikis (1) keeps an empty entry; Untuva (2) holds only a mini.
function withStandIns() {
  const p = X1.page();
  p.run(`for (const e of JUVENILE_ART) for (const k of Object.keys(e)) delete e[k];   // whatever is embedded, the fixture starts empty
    Object.assign(JUVENILE_ART[0], { idle: SPECIES_ART[0].alert, alert: SPECIES_ART[0].huddle, huddle: SPECIES_ART[0].eat0, eat0: SPECIES_ART[0].shake0, eat1: SPECIES_ART[0].shake1, mini: SPECIES_ART[1].mini });
    JUVENILE_ART[2].mini = SPECIES_ART[0].mini;`);
  return p;
}
const px = (p, expr) => { const a = p.run(expr); return a && Array.from(a.p).join(); };

test("juvenile pictures: with no juvenile entry a juvenile shows exactly the adult's picture, at every size (a species whose entry is emptied here; the signed ones differ)", () => {
  const p = X1.page();
  for (const sp of [0, 2]) for (const k of Object.keys(plain(p.run(`JUVENILE_ART[${sp}]`)))) p.run(`delete JUVENILE_ART[${sp}].${k}`);   // S01 and S02 as if unsigned
  for (const sp of [0, 2]) {
    for (const pose of ["idle", "alert", "flee", "huddle", "shake", "eat", "approach", "glow", "nest"]) for (const fr of [0, 1])
      assert.equal(px(p, `tokenOf(${sp}, '${pose}', ${fr}, true)`), px(p, `tokenOf(${sp}, '${pose}', ${fr})`), sp + " " + pose + " " + fr);
    assert.equal(px(p, `ICON.mini(${sp}, true)`), px(p, `ICON.mini(${sp})`));
    assert.equal(px(p, `creatureArt(${sp}, 'idle', 0, 2, true)`), px(p, `creatureArt(${sp}, 'idle', 0, 2)`), "2×");
    assert.equal(px(p, `bigArt(${sp}, 'alert', 0, true)`), px(p, `bigArt(${sp}, 'alert', 0)`), "8×");
  }
  for (const pose of ["idle", "alert", "huddle", "eat"]) assert.notEqual(px(p, `tokenOf(1, '${pose}', 0, true)`), px(p, `tokenOf(1, '${pose}', 0)`), "S03's signed juvenile " + pose + " is not the adult's");
  assert.notEqual(px(p, "ICON.mini(1, true)"), px(p, "ICON.mini(1)"));
  const q = X1.page();   // the real table: every species' signed juvenile differs from its adult, in every picture
  for (const sp of [0, 1, 2]) {
    for (const pose of ["idle", "alert", "huddle", "eat"]) for (const fr of [0, 1]) assert.notEqual(px(q, `tokenOf(${sp}, '${pose}', ${fr}, true)`), px(q, `tokenOf(${sp}, '${pose}', ${fr})`), sp + " " + pose);
    assert.notEqual(px(q, `ICON.mini(${sp}, true)`), px(q, `ICON.mini(${sp})`), sp + " mini");
  }
  assert.equal(p.run("tokenOf(5, 'idle', 0, true)"), null, "an unknown species is still null (its labelled plate)");
});

test("juvenile pictures: a juvenile asks for its own entry (stand-ins), the adult's pictures do not move, a species without an entry falls back to the adult's", () => {
  const p = withStandIns(), A = n => `SPECIES_ART[0].${n}`;
  const same = (expr, str, w = 32) => assert.equal(px(p, expr), p.run(`Array.from(tokenPB(${str}, ${w}).p).join()`), expr);
  same("tokenOf(0, 'idle', 0, true)", A("alert")); same("tokenOf(0, 'alert', 0, true)", A("huddle")); same("tokenOf(0, 'huddle', 0, true)", A("eat0"));
  same("tokenOf(0, 'eat', 0, true)", A("shake0")); same("tokenOf(0, 'eat', 1, true)", A("shake1")); same("ICON.mini(0, true)", "SPECIES_ART[1].mini", 12);
  same("tokenOf(0, 'approach', 0, true)", A("huddle")); same("tokenOf(0, 'glow', 0, true)", A("alert")); same("tokenOf(0, 'nest', 1, true)", A("alert"));
  // the poses a juvenile has no picture for show its own idle, never the adult's
  for (const pose of ["flee", "shake", "curl", "settle", "dive", "nothing"]) for (const fr of [0, 1]) same(`tokenOf(0, '${pose}', ${fr}, true)`, A("alert"));
  // the adult: untouched, in either order of asking
  for (const pose of ["idle", "alert", "flee", "huddle"]) assert.equal(px(p, `tokenOf(0, '${pose}', 0)`), px(p, `tokenOf(0, '${pose}', 0, false)`));
  same("tokenOf(0, 'idle', 0)", A("idle")); same("tokenOf(0, 'eat', 1)", A("eat1")); same("ICON.mini(0)", A("mini"), 12);
  assert.notEqual(px(p, "tokenOf(0, 'idle', 0, true)"), px(p, "tokenOf(0, 'idle', 0)"), "a juvenile is not the adult picture");
  // 2× and 8×: whole blocks of the juvenile's picture, cached apart from the adult's
  assert.equal(p.run("(() => { const a = creatureArt(0, 'idle', 0, 2, true), t = tokenOf(0, 'idle', 0, true); if (a.w !== 64) return false; for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) if (a.p[y * 64 + x] !== t.p[(y >> 1) * 32 + (x >> 1)]) return false; return true; })()"), true);
  assert.equal(p.run("(() => { const a = bigArt(0, 'idle', 0, true), t = tokenOf(0, 'idle', 0, true); if (a.w !== 256) return false; for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if (a.p[y * 256 + x] !== t.p[(y >> 3) * 32 + (x >> 3)]) return false; return true; })()"), true);
  assert.equal(px(p, "creatureArt(0, 'idle', 0, 2)"), p.run("Array.from(creatureArt(0, 'idle', 0, 2).p).join()"));
  assert.notEqual(px(p, "creatureArt(0, 'idle', 0, 2)"), px(p, "creatureArt(0, 'idle', 0, 2, true)"));
  assert.notEqual(px(p, "bigArt(0, 'idle', 0)"), px(p, "bigArt(0, 'idle', 0, true)"));
  // Tuikis: no entry, the adult's picture for every pose; Untuva: a mini only, so the mini is its own and the tokens are the adult's
  for (const pose of ["idle", "alert", "huddle", "eat", "curl", "settle", "flee"]) assert.equal(px(p, `tokenOf(1, '${pose}', 1, true)`), px(p, `tokenOf(1, '${pose}', 1)`), "Tuikis " + pose);
  assert.equal(px(p, "ICON.mini(1, true)"), px(p, "ICON.mini(1)"));
  for (const pose of ["idle", "alert", "huddle", "eat"]) assert.equal(px(p, `tokenOf(2, '${pose}', 0, true)`), px(p, `tokenOf(2, '${pose}', 0)`), "Untuva tokens " + pose);
  same("ICON.mini(2, true)", "SPECIES_ART[0].mini", 12); assert.notEqual(px(p, "ICON.mini(2, true)"), px(p, "ICON.mini(2)"));
  // the species-level pictures (Cargo, the Probe's field guide, the silhouette) stay the adult's
  assert.equal(px(p, "silhouette(0)"), px(p, "(() => { const a = tokenOf(0, 'idle', 0), s = new PB(a.w, a.h); for (let i = 0; i < a.p.length; i++) if (a.p[i] >= 0) s.p[i] = C.slate; return s; })()"));
  assert.equal(px(p, "creatureArt(0, 'idle', 0)"), p.run("Array.from(tokenPB(SPECIES_ART[0].idle, 32).p).join()"));
});

test("juvenile pictures: only the places that draw a mibi ask for the juvenile (no wild creature, no partner in the field, no species list)", () => {
  const lines = PAGE.split("\n").filter(l => /JUVENILE_ART/.test(l) && !/^\s*\/\//.test(l));
  assert.equal(lines.length, 3, "the table, tokenOf and miniArt read it: " + lines.map(l => l.trim().slice(0, 40)).join(" | "));
  for (const fn of ["drawCreature", "drawPartner", "silhouette"]) assert.ok(!/juv|JUVENILE/i.test(source(fn)), fn + " never asks for a juvenile");
  assert.ok(!/creatureArt\([^)]*true\)|bigArt\([^)]*true\)/.test(PAGE), "no species list or portrait asks for a juvenile");
  assert.match(source("drawActive"), /mibiSprite\(m\.sp, pose, fr, x, y, BIG, flip, st === 'juvenile'\)/, "the stage follows its chip (st), not the stage the clock has reached");
});

test("juvenile pictures: no site draws a juvenile in huddle or eat (Tend, the Walk, the Call, 20 s of look-out, every card, face, mini, row), while the routing still sends both to its own pictures", () => {
  const bad = new Set(["huddle", "eat", "eat0", "eat1"]), seen = [];
  const scan = (p, pages, ts, tag) => { for (const pg of pages) for (const t of ts) for (const c of p.draw(pg, t)) { seen.push(1); if (c[c.length - 1] === true && c.some(v => bad.has(v))) assert.fail(tag + " " + pg + " t " + t + ": " + JSON.stringify(c)); } };
  for (const sp of [0, 1, 2]) {
    const m = () => X26.mib(1, "Kit", sp), pal = () => X26.mib(2, "Pal", (sp + 1) % 3);
    let p = X26.world([m(), pal()], [1, 2]); p.run("S.ui.aId = 1");
    scan(p, ["setup", "mibis", "active"], [0, 400], "rest sp " + sp);
    p.run("FX.moment = { id: 1, at: 0 }"); scan(p, ["active", "mibis"], [0, 300, 900, 1500, 2400], "Tend sp " + sp);                       // Tend
    p.run("FX.moment = { id: 1, at: 0 }; FX.walk = { id: 1, at: 0, others: [2] }"); scan(p, ["active", "mibis"], [0, 300, 900, 1500, 2400], "Walk sp " + sp);   // the Walk
    p.run("FX.moment = null; FX.walk = null; FX.callMibi = { id: 1, at: 0, wrong: false }"); scan(p, ["active", "mibis"], [0, 300, 700, 1200], "Call sp " + sp);   // the Call
    p = X26.world([m()], [1], { motion: true }); p.setOut(); p.run("S.ui.aId = 1"); scan(p, ["active", "map"], Array.from({ length: 1000 }, (_, i) => 1000 + i * 20), "look-out sp " + sp);   // 20 s of look-out
    p = X26.world([m()], [1]); scan(p, ["setup"], [0], "rider sp " + sp);
    p.setOut(); scan(p, ["map", "place"], [0], "field sp " + sp);
  }
  assert.ok(seen.length > 1000, "the recorder saw the draw calls");
  // the pictures stay embedded and routable: huddle and both eat frames are the juvenile's own, not the idle, not the adult's
  const q = X1.page();
  for (const sp of [0, 1, 2]) {
    const jt = (pose, fr) => px(q, `tokenOf(${sp}, '${pose}', ${fr}, true)`);
    for (const [pose, fr, key] of [["huddle", 0, "huddle"], ["eat", 0, "eat0"], ["eat", 1, "eat1"]]) {
      assert.equal(jt(pose, fr), q.run(`Array.from(tokenPB(JUVENILE_ART[${sp}].${key}, 32).p).join()`), sp + " " + key + " is the juvenile's own picture");
      assert.notEqual(jt(pose, fr), jt("idle", 0), sp + " " + key + " is not its idle"); assert.notEqual(jt(pose, fr), px(q, `tokenOf(${sp}, '${pose}', ${fr})`), sp + " " + key + " is not the adult's");
    }
  }
});

test("juvenile Loika's Tend paws are drawn 6 source rows (48 px) lower than the adult's, in y only; the adult's, the Tuikis' sparks and the Untuva's ring are unchanged", () => {
  const pawY = (sp, adult, st) => { const p = X26.world([X26.mib(1, "Kit", sp, adult ? { grownTurn: 0 } : {})], [1]); p.run("S.ui.aId = 1");
    p.run(`var __p = []; (() => { const real = stagePawY; stagePawY = j => { const y = real(j); __p.push([j, y]); return y; }; })();`);
    p.run("FX.moment = { id: 1, at: 0 }"); p.draw("active", 700); return plain(p.run("__p")); };
  assert.deepEqual(pawY(0, true), [[false, 78], [false, 78]], "the adult Loika's two paws: y 78, as before");
  assert.deepEqual(pawY(0, false), [[true, 126], [true, 126]], "the juvenile Loika's paws: y 78 + 48");
  assert.equal(p0().run("LOIKA_JUV_PAW_DROP"), 6 * 8, "6 source rows at 8x");
  for (const sp of [1, 2]) for (const adult of [true, false]) assert.deepEqual(pawY(sp, adult), [], "no paws for species " + sp);
  assert.match(source("drawActive"), /for \(const px of \[250, 300\]\) blit\(upArt\('paw', ICON\.paw\('blush'\), 3\), px, stagePawY\(st === 'juvenile'\)\)/, "x stays 250 and 300; y by the chip");
  assert.match(source("drawActive"), /R\(225 \+ Math\.round\(Math\.cos\(a\) \* r \* 1\.2\) - 4, 178 \+ Math\.round\(Math\.sin\(a\) \* r \* \.8\) - 4, 8, 8, C\.fog\)/, "the Untuva ring is as it was");
  assert.match(source("drawActive"), /\[\[90, 88\], \[340, 118\], \[120, 248\], \[320, 238\]\]/, "the Tuikis' sparks are as they were");
});
function p0() { return X1.page(); }

test("juvenile pictures at the sites: setup card and faces, header mini, roster, stage, look-out and the Walk's side tokens ask for the juvenile exactly when the mibi is one", () => {
  // setup: Dot (Tuikis, juvenile) alone rides: its card at 2×, no ring; its face plate; with Pip (Loika, grown) the partner card is Pip's, an adult picture
  let p = X26.world([dot()], [1]); let d = p.draw("setup");
  assert.deepEqual(d.find(c => c[0] === "sprite" && c[6] === 2).slice(1, 9), [1, "idle", 0, 28, 264, 2, false, true].slice(0, 8), "the rider card: Dot's idle at 2×");
  assert.equal(d.find(c => c[0] === "sprite" && c[6] === 2)[8], true, "juvenile");
  assert.equal(d.find(c => c[0] === "plate" && c[1] === "c-face-24")[7], true, "Dot's ring face plate asks for the juvenile");
  assert.equal(d.find(c => c[0] === "mini")[4], true, "and so does the mini inside it");
  p = X26.world([pip(), dot()], [1, 2]); d = p.draw("setup");
  assert.equal(d.find(c => c[0] === "sprite" && c[6] === 2)[8], false, "the partner card shows Pip, an adult");
  assert.deepEqual(d.filter(c => c[0] === "plate" && c[1] === "c-face-24").map(c => [c[5], c[7]]), [[1, true], [0, false]], "faces in carried order: Dot (id 1) juvenile, Pip (id 2) adult");
  // header: the rider's mini asks for the juvenile; a partner's does not
  p = X26.world([dot()], [1]); p.setOut(); d = p.draw("map"); assert.deepEqual(d.filter(c => c[0] === "mini").map(c => [c[1], c[4]]), [[1, true]], "the rider's mini");
  p = X26.world([pip(), dot()], [1, 2]); p.setOut(); d = p.draw("map"); assert.deepEqual(d.filter(c => c[0] === "mini").map(c => [c[1], c[4]]), [[0, false]], "the partner's mini");
  d = p.draw("place"); assert.ok(d.filter(c => c[0] === "mini").every(c => c[4] === false), "in a place too");
  // roster rows (one token plate each) and the Lead card
  p = X26.world([pip(), dot(), X26.mib(3, "Moss", 2)], [1, 2, 3]); d = p.draw("mibis");
  assert.deepEqual(d.filter(c => c[0] === "plate" && c[1] === "c-token-48").map(c => [c[5], c[7]]), [[1, true], [0, false], [2, true]], "rows in carried order: Dot juvenile, Pip adult, Moss juvenile");
  assert.equal(d.find(c => c[0] === "sprite" && c[6] === 2)[8], false, "the Lead card shows the partner, an adult");
  assert.deepEqual(d.filter(c => c[0] === "sprite" && c[6] === 1).map(c => [c[1], c[8]]), [[1, true], [0, false], [2, true]], "the sprites in the plates");
  // stage: the shown mibi; a grown mibi keeps the juvenile picture until its cut
  p = X26.world([pip(), dot()], [1, 2]); p.run("S.ui.aId = 1"); assert.equal(p.draw("active").find(c => c[0] === "sprite")[8], true, "Dot on the stage");
  p.run("S.ui.aId = 2"); assert.equal(p.draw("active").find(c => c[0] === "sprite")[8], false, "Pip on the stage");
  p.run("FX.cuts = [{ kind: 'grow', id: 2, at: 5000 }]"); assert.equal(p.draw("active", 1000).find(c => c[0] === "sprite")[8], true, "Pip before its grow cut: the chip and the picture are the juvenile's");
  assert.equal(p.draw("active", 5200).find(c => c[0] === "sprite")[8], false, "after the cut: the adult's");
  // look-out and the Call's alert: still the juvenile's
  p = X26.world([dot()], [1], { motion: true }); p.setOut(); p.run("S.ui.aId = 1"); let alerts = 0;
  for (let t = 1000; t < 21000; t += 20) { const s = p.draw("active", t).find(c => c[0] === "sprite"); assert.equal(s[8], true, "t " + t + " " + s[2]); if (s[2] === "alert") alerts++; }
  assert.ok(alerts > 0, "a look-out happened");
  p = X26.world([dot()], [1]); p.run("S.ui.aId = 1"); p.run("FX.callMibi = { id: 1, at: 0, wrong: false }"); assert.deepEqual(p.draw("active", 700).find(c => c[0] === "sprite").slice(2, 3).concat(p.draw("active", 700).find(c => c[0] === "sprite")[8]), ["alert", true], "Call: the juvenile's alert");
  // the Walk's side tokens: the other mibis with you at the foot of the stage
  p = X26.world([pip(), dot(), X26.mib(3, "Moss", 2)], [1, 2, 3]); p.run("S.ui.aId = 1; FX.walk = { id: 1, at: 0, others: [2, 3] }");
  d = p.draw("active", 100); assert.deepEqual(d.filter(c => c[0] === "plate" && c[1] === "c-token-48").map(c => [c[2], c[5], c[7]]), [[36, 0, false], [366, 2, true]], "left Pip (adult), right Moss (juvenile)");
});
