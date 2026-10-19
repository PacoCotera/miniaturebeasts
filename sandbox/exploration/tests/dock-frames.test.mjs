// The Companion's dock frames (specs/companion-dock-frames-spec.md, T-20261016-93): "home" when seated, "Off we go" when lifted. The page script is read out of
// index.html and run in a sandbox with the browser stubbed (the freeze test's), so the frames run as the page runs them. A show: no key is pressed in any test here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { freshSt, dockKey } from "../../station/src/state.mjs";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";
import * as V from "../src/view.mjs";
import { syntheticPieces, SYNTH_TONE } from "../tools/world-vectors.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");

// The page in a sandbox: every DOM and canvas call lands on an inert stub; localStorage is `store`.
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  const KEY = run("SAVE_KEY");
  const p = {
    ctx, run, clock, store, KEY,
    get S() { return run("S"); },
    // real time passes: the timers due run in order
    pass(ms) { const end = clock.t + ms; for (;;) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers[0]; if (!n || n.at > end) break; clock.timers.shift(); clock.t = n.at; n.f(); } clock.t = end; },
    // one key press, after any input lock has run out
    key(k, n = 1) { for (let i = 0; i < n; i++) { p.pass(400); run("act(" + JSON.stringify(k) + ")"); } },
    sv: () => JSON.parse(store[KEY]),
    // the Station writes its part of the shared save, and the Companion reads it (the page's storage event calls save())
    writeSt(st) { const o = JSON.parse(store[KEY]); o.st = JSON.parse(JSON.stringify(st)); store[KEY] = JSON.stringify(o); run("save()"); },
  };
  return p;
}

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
