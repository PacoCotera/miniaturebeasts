// The Companion's dock frames (specs/companion-dock-frames-spec.md, T-20261016-93): "home" when seated, "Off we go" when lifted. The page script is read out of
// index.html and run in a sandbox with the browser stubbed (the freeze test's), so the frames run as the page runs them. A show: no key is pressed in any test here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { freshSt, dockKey } from "../../station/src/state.mjs";
import { regionRecord, blankMap } from "../src/regions.mjs";
import { hash } from "../src/world.mjs";
import { syntheticPieces, SYNTH_TONE } from "../tools/world-vectors.mjs";


// The page in a sandbox: every DOM and canvas call lands on an inert stub; localStorage is `store`.
const page = (store = {}) => makePage({ store });

const world = (crates, withMibi = true) => {
  const p = page();
  p.run(`newWorld(1); S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }); S.carried = ${withMibi ? "[1]" : "[]"}; S.bay = ${JSON.stringify(Array.from({ length: crates }, (_, i) => ({ id: "c" + i, pods: [] })))}; S.phase = 'setup'; save();`);
  const st = freshSt(p.S.wid, p.S.turn); st.mibis = [{ id: 1, name: "Dot", sp: 0, born: -9 }]; p.writeSt(st);
  p.run("RM.matches = false; trackDock()");   // moving (the sandbox says reduced motion otherwise); the first look: nothing happens on load
  return { p, st };
};
const seat = (p, st) => { const r = dockKey(st, p.sv()); assert.ok(r.ok && r.docked); p.writeSt(st); p.run("NOW = 10000; trackDock()"); };
const lift = (p, st) => { const r = dockKey(st, p.sv()); assert.ok(r.ok && r.lifted); p.writeSt(st); p.run("NOW = 20000; trackDock()"); };
const flashes = (p, n) => p.run(`(() => { let on = 0, was = false; for (let a = 0; a < 2000; a++) { const v = crateFlashOn(${n}, a); if (v && !was) on++; was = v; } return on; })()`);

test("seated: the Companion goes to the lead's page by itself (no key), the crates flash once each in the Station's beat", () => {
  for (const n of [0, 1, 3]) {
    const { p, st } = world(n); assert.equal(p.run("FX.seated || null"), null, "nothing on load");
    seat(p, st);
    assert.equal(p.S.phase, "active", n + " crates: a cut to the active page"); assert.equal(p.S.ui.aId, 1);
    assert.equal(flashes(p, n), n, n + " crates: " + n + " flashes");
    if (n) { assert.equal(p.run("crateFlashOn(1, 499)"), false); assert.equal(p.run("crateFlashOn(1, 500)"), true); assert.equal(p.run("crateFlashOn(1, 619)"), true); assert.equal(p.run("crateFlashOn(1, 620)"), false); }
    if (n === 3) assert.deepEqual([500, 833, 1166].map((a) => p.run(`crateFlashOn(3, ${a})`)), [true, true, true], "one every 333 ms");
  }
});
test("seated: with reduced motion the flashes are steady for their span", () => {
  const { p, st } = world(3); seat(p, st); p.run("RM.matches = true");
  assert.deepEqual([499, 500, 900, 1285, 1286].map((a) => p.run(`crateFlashOn(3, ${a})`)), [false, true, true, true, false]);
});
test("seated: the count steps down by one as the Station confirms each crate, and at zero the icon goes", () => {
  const { p, st } = world(3); seat(p, st);
  // the Station opens all three: they leave the bay at once, the count shows them until each is confirmed (+800, +3800, +6800)
  p.run("S.bay = []; FX.crateDown = { at: NOW, total: 3 };");
  const at = (ms) => p.run(`NOW = 10000 + ${ms}; bayShown()`);
  assert.deepEqual([0, 799, 800, 3799, 3800, 6799, 6800, 9000].map(at), [3, 3, 2, 2, 1, 1, 0, 0]);
  assert.equal(p.run("FX.crateDown"), null, "spent");
});
test("seated mid-expedition is unchanged: no frame, no cut", () => {
  const { p, st } = world(1); p.run("S.phase = 'map'; S.exp = { shield: 3, smax: 3, hold: 2, cargo: { pods: [], e: 0, d: 0, s: 0 }, actions: 0 };");
  seat(p, st);
  assert.equal(p.S.phase, "map"); assert.equal(p.run("FX.seated || null"), null);
});
test("lifted on the active page: 'Off we go' for 1500 ms from 0.2 s and one quiet hop; off it, nothing", () => {
  const { p, st } = world(0); seat(p, st); assert.equal(p.S.phase, "active");
  lift(p, st);
  assert.equal(p.run("FX.lifted.at"), 20000); assert.deepEqual(JSON.parse(p.run("JSON.stringify({ id: FX.callMibi.id, at: FX.callMibi.at, quiet: FX.callMibi.quiet, wrong: FX.callMibi.wrong })")), { id: 1, at: 20200, quiet: true, wrong: false });
  assert.equal(p.run("NOW = 20100; callAnim(mibiById(1))"), null, "the hop starts at 0.2 s");
  assert.ok(p.run("NOW = 20300; callAnim(mibiById(1))").a === 100);
  const q = world(0); seat(q.p, q.st); q.p.run("S.phase = 'mibis'"); lift(q.p, q.st);
  assert.equal(q.p.run("FX.lifted || null"), null, "on another screen only the Shield flash plays, as built"); assert.equal(q.p.run("FX.callMibi || null"), null);
});
test("a dock with no mibi with you stays on its screen; no key is needed anywhere", () => {
  const { p, st } = world(2, false); seat(p, st); assert.equal(p.S.phase, "setup"); assert.equal(p.run("FX.seated.crates"), 2);
});

const region2 = (seed) => JSON.stringify(regionRecord({ n: 2, kind: "home", biome: "woods", slot: [2, 1], seed: hash(seed, "region", 2), gen: 3, opened: 1, map: blankMap() }));

// ---- save v9: crates and returned pods name their region ----
test("a crate sealed in region 1 names no region; one sealed elsewhere names it; the expedition under way names it", () => {
  const p = page(); p.run("newWorld(1)");
  p.run("S.expN = 1; startExpedition('weather')");
  assert.equal(p.run("S.exp.rg"), undefined, "region 1: none");
  p.run("S.exp = null; S.phase = 'setup'; S.expN = 2");
  p.run(`S.regions.push(${region2(p.run("S.seed"))}); mountRegion('g2')`);
  p.run("startExpedition('weather')");
  assert.equal(p.run("S.exp.rg"), "g2"); assert.equal(p.run("S.here"), "g2");
  assert.equal(JSON.parse(p.store[p.KEY]).here, "g2");
});
test("a shed pod the Station returns is buried again with its line: shed, of and genome", () => {
  const { p, st } = world(0);
  const genome = { schema: "mb-genome/2", species: "S01", loci: {}, origin: { kind: "shed", parents: ["d", "d"], parentIds: [4, 4] } };
  st.returned = [{ id: "c9:s0", sp: 0, species: null, g: "meadow", gs: 77, k: String(p.run("G.spawns[0]")), shed: 3, of: "Fig", genome }];
  seat(p, st);
  const q = p.sv().regions[0].map.pods.find((x) => x.id[0] === "r"); assert.ok(q, "buried again");
  assert.deepEqual([q.shed, q.of, q.genome], [3, "Fig", genome]);
});
test("a pod the Station returns goes back to the region it came from, with the realm's next id; the region in hand is put back", () => {
  const { p, st } = world(0);
  p.run(`S.regions.push(${region2(p.run("S.seed"))})`);
  const g2cell = p.run("(() => { mountRegion('g2'); const c = G.spawns[0]; mountRegion('g1'); return String(c); })()");
  const before = JSON.stringify(p.run("S.pods"));
  st.returned = [{ id: "c9:p0", sp: 0, species: null, g: "meadow", gs: 77, k: g2cell, rg: "g2" }, { id: "c9:p1", sp: 0, species: null, g: "meadow", gs: 78, k: String(p.run("G.spawns[0]")) }];
  seat(p, st);
  assert.equal(p.run("S.here"), "g1"); assert.equal(p.run("S.seed"), p.run("S.regions[0].seed"), "region 1 is back in hand");
  assert.equal(JSON.stringify(p.run("S.regions[1].map.pods")).includes('"r1"'), true, "the pod is in region 2");
  const sv = p.sv(); assert.deepEqual(sv.regions[1].map.pods.map((q) => q.id), ["r1"]); assert.equal(sv.regions[1].map.pods[0].k, g2cell);
  assert.deepEqual(sv.regions[0].map.pods.map((q) => q.id).filter((i) => i[0] === "r"), ["r2"], "no rg: region 1");
  assert.equal(JSON.stringify(sv.regions[0].map.pods.filter((q) => q.id[0] !== "r")), JSON.stringify(JSON.parse(before).filter((q) => q.id[0] !== "r")), "region 1's own pods are as they were");
  assert.equal(sv.nextId, 3);
});
