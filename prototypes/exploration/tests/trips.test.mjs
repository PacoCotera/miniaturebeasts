// The Companion's trips (top-level `trips` in the shared save): the real functions are read out of index.html and run
// in a sandbox with the rest of the page stubbed, so the test follows the page as it changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");

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
// Run the named declarations with the given stubs; returns the sandbox and the declared names.
function load(names, stubs) {
  const ctx = vm.createContext(Object.assign({ console }, stubs));
  const out = vm.runInContext(names.map(source).join("\n") + "\n;({ " + names.join(", ") + " })", ctx);
  return { ctx, ...out };
}

// values made in the sandbox carry its own Array and Object, so they are compared as plain data
const plain = x => JSON.parse(JSON.stringify(x));
const TRIP = ["TRIP_KINDS", "tripPlace", "tripRecord", "tripsWith"];
const LAND = ["groundName"];

// endExpedition with the world stubbed: `explored` decides the branch, worldTurn moves the counter as the page does.
function ending({ explored, trips, ex }) {
  const S = { exp: ex, expN: ex.n, turn: 3, trips, shield: 3, hist: [], bay: [], hold: null, ui: {}, visited: [], mibis: [], carried: [] };
  const turned = [];
  const t = load(["endExpedition", "holdEmpty", ...TRIP], {
    S, G: { land: [] }, LAND_NAME: [], TIER_NAME: ["", "starter"], BAY: 3,
    carriedMibis: () => [], exploredAny: () => explored, reachCounts: () => ({ surveyed: explored ? 1 : 0, total: 9 }),
    walkTier: () => 1, walkYield: () => 2, addMat: (k, n) => n, passable: () => true, dropPods: () => {},
    worldTurn: () => { turned.push(S.expN); S.turn++; S.expN++; return []; },
    logEv: () => {}, transition: () => {}, save: () => {},
  });
  t.endExpedition(ex.reason || "home");
  return { S, turned };
}
const expedition = (o = {}) => Object.assign({ n: 5, pos: 0, trail: [0], cargo: { e: 0, d: 0, s: 0, pods: [] }, stats: { calls: 1 }, stormCells: {}, entered: [0], met: [], moments: [], pt: null }, o);

test("a trip is recorded only when the world turns", () => {
  const home = ending({ explored: true, trips: [], ex: expedition({ pt: { id: 2 }, tripPlaces: ["wood"] }) });
  assert.equal(home.turned.length, 1);
  assert.deepEqual(plain(home.S.trips), [{ v: 1, n: 5, partner: 2, places: ["wood"], storm: false, carried: [] }]);

  const none = ending({ explored: false, trips: [], ex: expedition({ tripPlaces: ["wood"] }) });
  assert.equal(none.turned.length, 0);
  assert.deepEqual(plain(none.S.trips), [], "nothing explored: no record");
});

test("a Probe break that explored is a trip", () => {
  const { S } = ending({ explored: true, trips: [], ex: expedition({ reason: "break", tripStorm: true }) });
  assert.deepEqual(plain(S.trips), [{ v: 1, n: 5, partner: null, places: [], storm: true, carried: [] }]);
});

test("the walk with the mibi writes no trip", () => {
  const m = { id: 1, sp: 0, name: "Dot", outings: 0 };
  const S = { exp: null, carried: [1], turn: 2, walkTurn: -1, trips: [{ v: 1, n: 1, partner: 1, places: [], storm: false }], mibis: [m], ui: {} };
  const before = JSON.stringify(S.trips);
  const t = load(["walk", "canWalk", "walkAll", "careLines", "carriedMibis", "mibiById", "bondCheck", "growCheck", "listWords", "partnerMibi", "isAdult", "mibiStage", "stageAt"],
    { S, isDocked: () => false, isCarried: q => S.carried.includes(q.id), FX: {}, NOW: 0, lockInput: () => {}, fxMsg: () => {}, logEv: () => {}, CARE_TEXT: { walked: () => "" }, BOND_TENDS: 3, JUVENILE_TURNS: 2, ELDER_TURNS: 6 });
  t.walk(m);
  assert.equal(m.outings, 1, "the walk happened");
  assert.equal(JSON.stringify(S.trips), before);
});

test("partner: a juvenile is never the Probe partner; no partner gives null", () => {
  const juvenile = { id: 4, born: 3 }, adult = { id: 7, born: 0 };
  const S = { turn: 3, carried: [4], lead: null, mibis: [juvenile, adult] };
  const t = load(["partnerMibi", "carriedMibis", "mibiById", "isAdult", "mibiStage", "stageAt", ...TRIP], { S, JUVENILE_TURNS: 2, ELDER_TURNS: 10 });
  assert.equal(t.partnerMibi(), null, "a juvenile with you is not the partner");
  S.carried = [7]; assert.equal(t.partnerMibi().id, 7);
  assert.equal(t.tripRecord(expedition({ pt: null })).partner, null);
  assert.equal(t.tripRecord(expedition({ pt: { id: 7, elder: false } })).partner, 7);
});

test("places: the kinds entered, each once, only the five", () => {
  const t = load([...TRIP, ...LAND], {});
  assert.deepEqual(plain(t.TRIP_KINDS), ["meadow", "pond", "rock", "wood", "cave"]);
  // every land the page has (meadow, pond edge, rock field, wood, shallows, cliff) names one of the five
  for (let land = 0; land < 6; land++) assert.ok(t.TRIP_KINDS.includes(t.groundName(land, false)), "land " + land);
  const ex = expedition();
  for (const land of [3, 0, 3, 1, 4, 2, 5]) t.tripPlace(ex, t.groundName(land, false));
  t.tripPlace(ex, "cave"); t.tripPlace(ex, "cave"); t.tripPlace(ex, "shallows"); t.tripPlace(ex, undefined);
  assert.deepEqual(plain(t.tripRecord(ex).places), ["wood", "meadow", "pond", "rock", "cave"]);
  assert.deepEqual(plain(t.tripRecord(expedition({ tripPlaces: ["wood", "wood", "lava"] })).places), ["wood"]);
});

test("entering a place or the cave adds its kind", () => {
  assert.match(source("enterPatch"), /tripPlace\(ex, groundName\(G\.land\[ex\.pos\], false\)\)/);
  assert.match(source("enterCave"), /tripPlace\(ex, 'cave'\)/);
  assert.match(source("advance"), /tripStormTick\(ex\)/);
});

test("storm: over the Probe outside the cave on any action; never in the cave", () => {
  const ex = expedition({ pos: 4, storm: { x: 3.5, w: 2 }, patch: null });
  const S = { exp: ex };
  const t = load(["tripStormTick", "stormOverProbe", "stormCovers", ...TRIP], {
    S, cxy: c => ({ x: c % 16, y: Math.floor(c / 16) }), layout: key => ({ cave: key[0] === "c" }),
  });
  ex.patch = { key: "c4" };
  assert.equal(t.tripStormTick(ex), false, "the band covers the column but the Probe is in the cave");
  assert.equal(t.tripRecord(ex).storm, false);
  ex.patch = { key: "4" };
  assert.equal(t.tripStormTick(ex), true, "the same column, in a place under the open sky");
  ex.patch = { key: "c4" }; t.tripStormTick(ex);
  assert.equal(t.tripRecord(ex).storm, true, "once on any action is enough");
  const away = expedition({ pos: 10, storm: { x: 3.5, w: 2 } }); S.exp = away;
  t.tripStormTick(away); assert.equal(t.tripRecord(away).storm, false, "the band elsewhere");
  S.exp = expedition({ storm: null }); assert.equal(t.tripStormTick(S.exp), false, "no storm");
});

test("the last 40 trips are kept, oldest first", () => {
  const t = load(TRIP, {});
  let trips = [];
  for (let n = 1; n <= 45; n++) trips = t.tripsWith(trips, t.tripRecord(expedition({ n })));
  assert.equal(trips.length, 40);
  assert.equal(trips[0].n, 6); assert.equal(trips[39].n, 45);
});

test("old saves: no trips list, an expedition without the new fields", () => {
  const t = load(TRIP, {});
  assert.deepEqual(plain(t.tripRecord({ n: 3 })), { v: 1, n: 3, partner: null, places: [], storm: false, carried: [] });
  assert.equal(t.tripsWith(undefined, t.tripRecord({ n: 3 })).length, 1);
  // the page's load gives a save without `trips` an empty list
  const saved = { v: 8, seed: 7, cr: [], mibis: [], wid: "w7", retSeen: [], bay: [] }, store = { "mb-save-v8": JSON.stringify(saved) };
  const ctx = { localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } },
    SAVE_KEY: "mb-save-v8", SAVE_V: 8, V7_KEY: "v7", OLD_SAVE_KEYS: [], migrate7: o => o,
    layoutCache: { clear() {} }, genWorld() {}, indexCreatures() {}, S: null, CARRY_MAX: 3, JUVENILE_TURNS: 2 };
  const l = load(["load", "migrateCarried", "normalizeCare"], ctx);
  assert.equal(l.load(), true);
  assert.deepEqual(plain(vm.runInContext("S.trips", l.ctx)), []);
});

test("a new world starts with no trips and expedition 1", () => {
  assert.match(source("newWorld"), /expN: 1, trips: \[\]/);
});
