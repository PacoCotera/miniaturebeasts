// The Companion's care and carried set (the care save shape, C0): the real functions are read out of index.html and run
// in a sandbox with the rest of the page stubbed, as in trips.test.mjs. Where a check needs the Station's side
// (prototypes/station/src/state.mjs: stageAt, carriedIds, carryAdd, mergeCare, tripCarried), it runs once that side has
// landed and is skipped until then, so the agreement tests switch on by themselves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const FIXTURE = () => JSON.parse(readFileSync(new URL("./fixtures/save-v8-care-before.json", import.meta.url), "utf8"));

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
  "carryApply", "canWalk", "walkAll", "tripRecord", "TRIP_KINDS", "tripsWith"];
// The care functions over a world: S, docked or not, on a given day. ctx.S, ctx.Date and the flags can change between calls.
function world(S, o = {}) {
  const env = { docked: !!o.docked, log: [] };
  const ctx = vm.createContext({ console, S, Date: clockAt(o.day || "2026-10-09"), JUVENILE_TURNS: 2, ELDER_TURNS: 6, CARRY_MAX: 3, BOND_TENDS: 3, BOND_OUTINGS: 1,
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
test("the bond: three Tends and an outing, never walks alone; bondCare = care; checked after Tend and Walk", () => {
  const S = save({ carried: [1, 2], turn: 1 }), t = world(S), [dot, moss] = S.mibis;
  for (let turn = 1; turn <= 6; turn++) { S.turn = turn; t.walkAll(); }
  assert.equal(moss.care, 6); assert.equal(moss.bonded, false, "walks grow but never bond");
  S.turn = 1; dot.care = 0; dot.outings = 0; dot.tends = 0; S.walkTurn = -1;
  ["2026-10-09", "2026-10-10", "2026-10-11"].forEach((d, i) => { t.setDay(d); const r = t.tend(dot); assert.equal(r.bonded, false, "no outing yet, Tend " + (i + 1)); });
  assert.equal(dot.tends, 3); assert.equal(dot.bonded, false);
  const evs = t.walkAll(); assert.equal(evs[0].bonded, true, "the Walk that gives the first outing bonds it");
  assert.equal(dot.bonded, true); assert.equal(dot.bondCare, 4); assert.equal(dot.grownTurn, null, "a juvenile when it bonds: it waits for care");
  assert.equal(t.bondCheck(dot), false, "once");
  assert.ok(t.env.log.includes("Dot is bonded with you"));
  assert.match(source("tend"), /bondCheck\(m\)[^]*growCheck\(m\)/, "bond, then growth");
  assert.match(source("walkAll"), /q\.care = \(q\.care \|\| 0\) \+ 1; out\.push\(\{ m: q, bonded: bondCheck\(q\), grown: growCheck\(q\) \}\)/);
});

// ---- T6: growth through care (rulings 1 and 3) ----
test("T6: bonded at turn 1, at home until 6, carried: juvenile after the expedition to 7; the first Walk at 7 grows it; elder at 13", () => {
  const S = save({ carried: [1], turn: 1 }), t = world(S, { day: "2026-10-01" }), dot = S.mibis[0];
  dot.tends = 2; dot.outings = 1;
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
  moss.born = 3; moss.tends = 2; moss.outings = 1; moss.care = 5;
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
  assert.match(source("worldTurn"), /const grown = S\.mibis\.filter\(grownNow\), aged = S\.mibis\.filter\(agedNow\)/);
  for (const fn of ["worldTurn", "endExpedition"]) assert.ok(!/growCheck\(|bondCheck\(|grownTurn =/.test(source(fn)), fn + " never grows or bonds");
  // an unbonded mibi grows on the clock as built: the line at born + 2, elder at born + 8
  const fig = S.mibis[2]; S.turn = 2; assert.equal(t.grownNow(fig), true); S.turn = 8; assert.equal(t.agedNow(fig), true);
});
test("T6: born 0, bonded at turn 5 gets grownTurn 2 (the constant), elder at 8; a juvenile bonded at turn 1 gets none", () => {
  const S = save({ carried: [1, 2], turn: 5 }), t = world(S), [dot, moss] = S.mibis;
  dot.tends = 3; dot.outings = 1; assert.equal(t.bondCheck(dot), true);
  assert.equal(dot.grownTurn, 2); S.turn = 7; assert.equal(t.mibiStage(dot), "adult"); S.turn = 8; assert.equal(t.mibiStage(dot), "elder");
  assert.match(source("bondCheck"), /m\.grownTurn = \(m\.born \|\| 0\) \+ JUVENILE_TURNS/, "the constant, never a developer setting");
  if (!station("stageAt", "mibiStage")) for (const adultTurns of [2, 1, 0]) for (let turn = 5; turn <= 14; turn++) {
    S.turn = turn; assert.equal(ST.mibiStage({ turn }, dot, { adultTurns }), t.mibiStage(dot), "adultTurns " + adultTurns + ", turn " + turn); }
  S.turn = 1; moss.tends = 3; moss.outings = 1; assert.equal(t.bondCheck(moss), true); assert.equal(moss.grownTurn, null);
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
function ending(S, ex) {
  const t = vm.createContext({ console, S, G: { land: [] }, LAND_NAME: ["meadow"], TIER_NAME: ["", "starter"], BAY: 3, JUVENILE_TURNS: 2, ELDER_TURNS: 6,
    exploredAny: () => true, reachCounts: () => ({ surveyed: 1, total: 9 }), walkTier: () => 1, walkYield: () => 2, addMat: (k, n) => n, passable: () => true, dropPods: () => {},
    worldTurn: () => { S.turn++; S.expN++; return []; }, logEv: () => {}, CARE_TEXT: { notch: n => n + " gains a skill notch" }, transition: () => {}, save: () => {} });
  const names = ["endExpedition", "holdEmpty", "carriedMibis", "mibiById", "tripRecord", "tripsWith", "TRIP_KINDS"];
  vm.runInContext(names.map(source).join("\n") + "\n;endExpedition('home');", Object.assign(t, { __ex: ex }));
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
  dot.bonded = true; dot.bondCare = 0; S.exp = Object.assign(ex(6), { pt: { id: 1 } }); ending(S, S.exp);
  assert.equal(dot.notches, 1, "the bonded partner"); assert.equal(moss.notches, 0);
  moss.bonded = true; S.exp = Object.assign(ex(7), { pt: { id: 1 } }); ending(S, S.exp); assert.equal(moss.notches, 0, "a bonded mibi that is not the partner");
  const t = world(save()); const rec = t.tripRecord({ n: 3 }, S.carried); S.carried.push(9);
  assert.deepEqual(plain(rec.carried), [1, 2, 3], "a copy"); assert.deepEqual(plain(t.tripRecord({ n: 3 }).carried), []);
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
  assert.match(source("save"), /syncStation\(\); normalizeCare\(S, releasedIds\(\)\);/, "after every dock read, with the Station's released ids");
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
  assert.match(source("newWorld"), /mibis: \[\], carried: \[\], lead: null, carrySeen: 0, carryRefused: \[\]/);
  assert.ok(!/\bwith: null\b|withSeen: 0, probeSeen/.test(source("newWorld")));
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
function dock(S, st, docked) {
  const notes = [];
  const ctx = vm.createContext({ console, S, CARRY_MAX: 3, SPECIES: [{ name: "Loika" }, { name: "Tuikis" }, { name: "Untuva" }], LAND_NAME: [], G: { land: [] },
    stPart: () => st, isDocked: () => docked, clamp: (v, a, b) => Math.max(a, Math.min(b, v)), reveil: () => {}, logEv: () => {}, fxMsg: t => notes.push(t),
    CARE_TEXT: { left: n => n + " stays home", took: n => n + " is with you", fullRefused: n => n + " stays home · full" } });
  const names = ["syncStation", "carryApply", "mibiById", "normalizeCare"];
  vm.runInContext(names.map(source).join("\n") + "\n;syncStation(); normalizeCare(S);", Object.assign(ctx, { JUVENILE_TURNS: 2 }));
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
test("one strings table for care; the heart is registered as a missing asset and never drawn", () => {
  assert.match(PAGE, /^const CARE_TEXT = \{$/m);
  const reg = PAGE.match(/^const CARE_ASSETS = \[[^]*?^\];$/m); assert.ok(reg, "the register");
  const entries = vm.runInContext(reg[0] + "\n;CARE_ASSETS", vm.createContext({}));
  assert.deepEqual(plain(entries.map(e => [e.id, e.w, e.h, e.status])), [["c-heart-24", 24, 24, "empty"], ["c-heart-16", 16, 16, "empty"]]);
  for (const e of entries) { assert.deepEqual(Object.keys(e).slice(0, 3), ["id", "what", "until"], "the Station register's keys first"); assert.ok(e.what && e.until); }
  assert.equal(PAGE.split("c-heart").length - 1, 2, "named only in the register");
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
