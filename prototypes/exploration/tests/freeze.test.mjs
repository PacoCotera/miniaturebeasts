// The dock freeze (game designer's ruling, its tests in ruling 6; the UI designer's chip and refusal): docked mid-expedition,
// field input is refused and the expedition resumes at Lift as it was. The whole page script is read out of index.html and
// run in a sandbox with the browser stubbed (no drawing to a screen, a virtual clock for performance.now and setTimeout),
// so the rules run as the page runs them. The Station's dock is its own dockKey (prototypes/station/src/state.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { freshSt, dockKey } from "../../station/src/state.mjs";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
// every `import { … } from "./src/<module>.mjs"` line of the page, bound to that module's exports (view.mjs joins MODS in C2a M2)
const MODS = { world: W, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");

// The page in a sandbox: every DOM and canvas call lands on an inert stub; localStorage is `store`.
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] };
  const ctx = { console, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
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
// The field, as ruling 6 hashes it: S.exp without its Shield, and the world the expedition can change.
const FIELD = "JSON.stringify((() => { const e = Object.assign({}, S.exp); delete e.shield; return [e, S.pods, S.veil, S.svy, S.pins, S.cells, S.opened, S.cr, S.revealed, S.totalActions, S.turn]; })())";
const field = p => p.run(FIELD);
const SEED = 1;   // a Weather expedition with the storm and a fog bank from its first action

// A world with one grown mibi with you, an expedition started at the first glint (undocked), and the Station's part.
function begin(store) {
  const p = page(store);
  p.run(`newWorld(${SEED}); S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 0, notches: 0, bonded: false, care: 0, tends: 0, tendDay: null, grownTurn: null }); S.carried = [1]; save();`);
  const st = freshSt(p.S.wid, p.S.turn); st.mendFull = false;
  st.mibis = [{ id: 1, name: "Dot", sp: 0, born: -9 }];
  p.writeSt(st);
  p.key("confirm"); p.key("confirm");
  assert.ok(p.S.exp, "the expedition started");
  return { p, st };
}
const dock = (p, st) => { const r = dockKey(st, p.sv()); assert.ok(r.ok && r.docked, "docked"); p.writeSt(st); assert.equal(p.run("fieldFrozen()"), true); return r; };
const lift = (p, st) => { const r = dockKey(st, p.sv()); assert.ok(r.ok && r.lifted, "lifted"); p.writeSt(st); assert.equal(p.run("fieldFrozen()"), false); return r; };
// into a place where a creature is in sight (undocked): step around until one shows
function intoPlaceWithCreature(p) {
  for (const dir of ["", "right", "down", "left", "up", "right", "right", "down", "down"]) {
    if (dir) { p.run("if (S.exp.patch) leavePatch(); S.phase = 'map';"); p.key(dir); }
    p.key("confirm"); if (p.S.phase !== "patch") continue;
    for (let i = 0; i < 14; i++) {
      if (p.run("(curLive().cr || []).some(c => inSight(c.x, c.y))")) return true;
      p.key(["up", "left", "down", "right"][i % 4]);
      if (p.S.phase !== "patch") break;
    }
  }
  return false;
}

// ---- ruling 6, test 1 ----
test("1. freeze hash: docked mid-expedition, every refused press, a held walk and 5 s of real time change nothing", () => {
  const { p, st } = begin();
  p.key("right"); p.key("down");   // a few actions in, with the storm and a fog bank over the reach
  assert.ok(p.S.exp.storm && p.S.exp.fog, "a storm and a fog bank this expedition");
  dock(p, st);
  const h = field(p), acts = p.S.exp.actions;
  // the map: each direction ×5, ✓ Go down, Call, then ← and ✓ on every menu row
  for (const d of ["up", "down", "left", "right"]) p.key(d, 5);
  p.key("confirm"); p.key("call");
  assert.equal(p.S.phase, "map");
  p.key("back"); assert.equal(p.S.phase, "menu");
  const rows = p.run("menuItems().map(i => i.id)");
  for (let i = 0; i < rows.length; i++) {
    p.run(`S.phase = 'menu'; S.ui.from = 'map'; S.ui.menuSel = ${i}; S.ui.waiting = 0;`); p.key("confirm");
    if (p.S.phase !== "menu") p.key("back");   // a view opened (End expedition opens Cargo): straight back
    assert.equal(field(p), h, "menu row " + rows[i]);
  }
  p.run("S.phase = 'map';");
  assert.equal(field(p), h, "the map");
  // Cargo, Mibis, the active page, Call a mibi
  p.run("openMenu(); S.ui.menuSel = menuItems().findIndex(i => i.id === 'cargo');"); p.key("confirm"); assert.equal(p.S.phase, "cargo"); p.key("back");
  p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'mibis');"); p.key("confirm"); assert.equal(p.S.phase, "mibis");
  p.key("call"); p.key("right"); assert.equal(p.S.phase, "active"); p.key("call"); p.key("back"); p.key("back"); p.key("back");
  assert.equal(p.S.phase, "map");
  assert.equal(field(p), h, "the views");
  // 5 s of real time
  p.pass(5000);
  assert.equal(field(p), h, "5 s later");
  assert.equal(p.S.exp.actions, acts);
  lift(p, st);
});

test("1. freeze hash in a place: a creature in sight, the Waiting strip, Wait, a held walk, the Probe patch", () => {
  const { p, st } = begin();
  assert.ok(intoPlaceWithCreature(p), "a place with a creature in sight");
  p.run("S.exp.cargo.e = Math.max(S.exp.cargo.e, 3); S.exp.shield = 1;");   // the Probe's patch would be possible
  p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'wait');"); p.key("confirm");   // Wait once, undocked: the strip is open
  assert.equal(p.S.ui.waiting, 1);
  dock(p, st);
  const h = field(p), acts = p.S.exp.actions;
  p.key("confirm", 5); assert.equal(p.S.ui.waiting, 1, "the strip's Confirm is refused");
  assert.equal(field(p), h, "Confirm on the Waiting strip ×5");
  p.key("back"); assert.equal(p.S.ui.waiting, 0);
  p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'wait');"); p.key("confirm", 5);
  p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'leave');"); p.key("confirm");
  assert.equal(field(p), h, "Wait ×5 and Leave");
  p.key("back"); assert.equal(p.S.phase, "patch");
  for (const d of ["up", "down", "left", "right"]) p.key(d, 3);
  p.key("confirm"); p.key("call");
  assert.equal(field(p), h, "directions, ✓ and Call in a place");
  // ← on a finished place opens the menu instead of leaving
  p.run("doneEmpty = () => true;"); p.key("back"); assert.equal(p.S.phase, "menu"); assert.ok(p.S.exp.patch, "still in the place"); p.key("back");
  // a direction held for 2 s
  p.pass(400); p.run("press('right')"); p.pass(2000); p.run("release('right')");
  assert.equal(field(p), h, "held for 2 s");
  // the Probe screen: Patch shield, both presses
  p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'probe');"); p.key("confirm"); assert.equal(p.S.phase, "probe");
  const e = p.S.exp.cargo.e, sh = p.S.exp.shield; assert.ok(p.run("canPatch()"), "a patch is possible (the free mend took it to 2 of 3)");
  p.key("confirm"); p.key("confirm");
  assert.equal(p.S.exp.cargo.e, e); assert.equal(p.S.exp.shield, sh, "the patch is refused");
  p.key("back"); p.key("back");
  p.pass(5000);
  assert.equal(field(p), h, "every press");
  assert.equal(p.S.exp.actions, acts);
});

// ---- ruling 6, test 2 ----
test("2. the dock interlude is invisible: 20 actions after it, the same state as without it (the Shield aside)", () => {
  const path = ["right", "down", "right", "confirm", "call", "up", "left", "up", "back"];
  const after = ["call", "down", "right", "down", "left", "call", "up", "up", "right", "confirm", "left", "down", "call", "right", "up", "left", "down", "call", "right", "up"];
  const play = interlude => {
    const { p, st } = begin();
    for (const k of path) p.key(k);
    if (p.S.phase === "menu") p.key("back");
    if (interlude) {
      dock(p, st);
      for (const d of ["up", "down", "left", "right"]) p.key(d, 2);
      p.key("confirm"); p.key("call"); p.pass(400); p.run("press('left')"); p.pass(2000); p.run("release('left')"); p.pass(5000);
      lift(p, st);
    }
    for (const k of after) { p.key(k); if (p.S.phase === "menu") p.key("back"); }
    return { field: field(p), exp: p.S.exp };
  };
  const a = play(false), b = play(true);
  assert.ok(a.exp && b.exp, "both expeditions still running");
  assert.equal(b.exp.actions, a.exp.actions);
  assert.equal(b.field, a.field);
  assert.ok(b.exp.shield >= a.exp.shield, "the Shield follows the mend rule");
});

// ---- ruling 6, test 3 ----
test("3. mend at Lift: Shield 1 of 3 docks to 2 (free), or 3 with mendFull and Energy; phase and position unchanged", () => {
  for (const [mendFull, e, want] of [[false, 0, 2], [true, 10, 3]]) {
    const { p, st } = begin();
    p.key("right"); p.run("S.exp.shield = 1; save();");
    const pos = p.S.exp.pos, phase = p.S.phase, smax = p.S.exp.smax;
    assert.equal(smax, 3);
    st.mendFull = mendFull; st.e = e;
    dock(p, st);
    assert.equal(p.S.exp.shield, want, "mended while docked");
    assert.equal(p.run("FX.shieldAtDock"), 1, "the Shield as it docked, for the flash at Lift");
    lift(p, st);
    assert.equal(p.S.exp.shield, want);
    assert.equal(p.S.exp.pos, pos); assert.equal(p.S.phase, phase);
    assert.deepEqual(JSON.parse(JSON.stringify(p.run("FX.shieldFlash"))), { from: 1, at: p.clock.t }, "the mended bars flash at Lift");
    assert.equal(p.run("FX.dockSaid"), 0);
  }
});

// ---- ruling 6, test 4 ----
test("4. break in flight: the break completes, then the dock's mend applies", () => {
  const { p, st } = begin();
  p.run("S.exp.cargo.pods.push({ id: 'p1', sp: 0, g: 0, how: 'ground', gs: 7 }); S.exp.shield = 0;");
  p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'wait');"); p.key("confirm");   // the action that finds the Shield at 0: the break is under way (1100 ms)
  assert.equal(p.S.exp.ending, 1);
  const r = dock(p, st);
  assert.equal(r.mend.broke, true, "the Station mends a break free");
  assert.ok(p.S.exp, "the break is still in flight");
  assert.equal(p.S.probeSeen || 0, 0, "the Probe from the dock waits for the break");
  p.pass(1200);
  assert.equal(p.S.exp, null);
  assert.equal(p.S.report.reason, "break");
  assert.equal(p.S.report.dropped, 1); assert.ok(Object.keys(p.S.skulls || {}).length, "a skull where it broke");
  assert.equal(p.S.shield, st.probe.shield, "mended, as the Station shows it");
  assert.equal(p.S.probeSeen, st.probe.seq);
});

// ---- ruling 6, test 5 ----
test("5. End expedition docked at the start: allowed, the crate sealed, the world turned", () => {
  const { p, st } = begin();
  p.key("confirm"); p.key("call"); p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'leave');"); p.key("confirm");   // a Call in the start's place, back on the map
  p.run("S.exp.cargo.e += 1;");
  assert.equal(p.run("canSend()"), true);
  dock(p, st);
  const turn = p.S.turn, bay = p.S.bay.length;
  p.key("back"); assert.equal(p.S.phase, "menu"); assert.equal(p.run("menuItems()[S.ui.menuSel].id"), "send", "focus on End expedition, not frozen");
  p.key("confirm"); assert.equal(p.S.phase, "cargo"); p.key("confirm");
  assert.equal(p.S.exp, null); assert.equal(p.S.phase, "sealed");
  assert.equal(p.S.bay.length, bay + 1, "a crate sealed");
  assert.equal(p.S.turn, turn + 1, "the world turned");
});

// ---- ruling 6, test 6 ----
test("6. reload docked mid-expedition: the field as it was, and the first press refused", () => {
  const store = {};
  const { p, st } = begin(store);
  p.key("right"); p.key("down");
  dock(p, st);
  const h = field(p), acts = p.S.exp.actions;
  const q = page(store);   // the page reloads on the same save
  assert.equal(q.run("fieldFrozen()"), true);
  assert.equal(field(q), h);
  const before = JSON.stringify(q.S);
  q.key("left");
  assert.equal(JSON.stringify(q.S), before, "the first press is refused");
  assert.equal(q.S.exp.actions, acts);
  assert.equal(q.run("FX.msg"), q.run("DOCK_TEXT.first"));
});

// ---- ruling 6, test 7 ----
test("7. pods returned while docked mid-expedition wait; they apply once when the expedition ends", () => {
  const { p, st } = begin();
  p.key("confirm"); p.key("call"); p.key("back"); p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'leave');"); p.key("confirm");
  const key = String(p.S.exp.pos), veil = JSON.stringify(p.S.veil[key] ?? null), svy = JSON.stringify(p.S.svy[key] ?? null);
  assert.notEqual(veil, "null", "the place has a veil to lose");
  st.returned = [{ id: "ret-1", k: key, sp: 0, g: 0 }];
  dock(p, st);
  p.run("save()");
  assert.equal(JSON.stringify(p.S.veil[key] ?? null), veil, "the veil unchanged");
  assert.equal(JSON.stringify(p.S.svy[key] ?? null), svy, "the survey unchanged");
  assert.equal(p.S.retSeen.includes("ret-1"), false, "not marked seen");
  assert.equal(p.S.pods.filter(q => q.how === "ground" && q.k === key && q.x === -1).length, 0);
  p.key("back"); p.key("confirm"); p.key("confirm");   // End expedition, docked at the start
  assert.equal(p.S.exp, null);
  p.run("save()"); p.run("save()");
  assert.equal(p.S.retSeen.filter(id => id === "ret-1").length, 1);
  assert.equal(p.S.pods.filter(q => q.how === "ground" && q.k === key && q.x === -1).length, 1, "applied once");
  assert.equal(p.S.veil[key], undefined, "the place's veil is back");
});

// ---- the UI designer's ruling ----
test("a refusal writes nothing to S and nothing to the save; the first says why, the later ones are short", () => {
  const { p, st } = begin();
  p.key("right");
  dock(p, st);
  const saved = p.store[p.KEY];
  for (const [i, k] of ["up", "confirm", "call", "left"].entries()) {
    const before = JSON.stringify(p.S);
    p.key(k);
    assert.equal(JSON.stringify(p.S), before, k);
    assert.equal(p.run("FX.msg"), p.run(i ? "DOCK_TEXT.again" : "DOCK_TEXT.first"), k);
    assert.equal(p.run("FX.bumpAt"), p.clock.t, "the bump");
  }
  assert.equal(p.store[p.KEY], saved, "nothing saved");
  lift(p, st); dock(p, st);
  p.key("up"); assert.equal(p.run("FX.msg"), p.run("DOCK_TEXT.first"), "each dock says why once");
});

test("the docked chip shows only while docked mid-expedition", () => {
  const { p, st } = begin();
  p.run("var __chip; text = (o => function (s, ...a) { if (s === DOCK_TEXT.chip && a[1] === 9) __chip = a; return o.call(this, s, ...a); })(text);");
  const chip = () => { p.run("__chip = null; drawHUD();"); return p.run("__chip ? [__chip[2], __chip[0]] : null"); };
  const MINT = p.run("C.mint");
  assert.equal(chip(), null, "undocked mid-expedition");
  dock(p, st);
  const c = chip(); assert.ok(c, "docked mid-expedition"); assert.equal(c[0], MINT);
  assert.equal(p.run("C.mint"), p.run("PALETTE.find(x => x[0] === 'mint')[1] === '#adf6e0' ? C.mint : null"), "mint is #adf6e0");
  p.run("S.ui.from = 'map'; S.phase = 'menu';"); assert.ok(chip(), "the menu over the field");
  p.run("S.phase = 'map';");
  lift(p, st);
  assert.equal(chip(), null, "lifted");
  // between expeditions, docked: no chip (the top bar shows no field)
  p.run("S.exp = null; S.phase = 'setup'; save();"); dockKey(st, p.sv()); p.writeSt(st);
  assert.equal(p.run("isDocked()"), true); assert.equal(p.run("fieldFrozen()"), false);
  assert.equal(chip(), null, "docked between expeditions");
});

test("docked, the crate count gives way to the chip when both do not fit; the counters stay as they are", () => {
  const { p, st } = begin();
  p.run("S.tier = 2; S.exp.smax = 4; S.exp.hold = 3; S.exp.range = 4; S.exp.cargo.e = 20; S.exp.cargo.d = 20; S.exp.cargo.s = 20; S.turn = 11; S.bay = [{ id: 'a', pods: [] }, { id: 'b', pods: [] }, { id: 'c', pods: [] }]; save();");
  p.run("var __crate = 0; drawCrateCount = (o => function (x) { __crate++; return o(x); })(drawCrateCount);");
  p.run("__crate = 0; drawHUD();"); assert.equal(p.run("__crate"), 1, "undocked: the crate count");
  dock(p, st);
  p.run("__crate = 0; drawHUD();"); assert.equal(p.run("__crate"), 0, "docked, tier 2 worst case: the chip takes its place");
  assert.doesNotMatch(p.run("drawCounters.toString() + drawCounter.toString()"), /fieldFrozen|isDocked/, "the counters do not change while docked");
});

test("docked: the menu dims Wait and Leave and keeps End expedition; ✓ is dimmed on the map and in a place; ← reads menu", () => {
  const { p, st } = begin();
  p.key("confirm"); assert.equal(p.S.phase, "patch");
  assert.notEqual(p.run("lineFor().back"), "menu");
  dock(p, st);
  const l = p.run("lineFor()"); assert.equal(l.dim, true); assert.equal(l.back, "menu");
  p.key("back");
  const items = p.run("menuItems().map(i => i.id + (i.frz ? '*' : ''))");
  assert.deepEqual([...items], ["leave*", "send", "wait*", "probe", "cargo", "mibis"]);
  assert.equal(p.run("S.ui.menuSel"), 1, "focus on the first row not frozen: End expedition");
  p.run("S.ui.menuSel = 0;"); assert.equal(p.run("lineFor().dim"), true);
  p.key("back"); assert.equal(p.S.phase, "patch"); p.key("back"); assert.equal(p.S.phase, "menu");
  p.run("S.ui.menuSel = 0;"); p.key("confirm");   // Leave is refused while docked
  assert.equal(p.S.phase, "menu"); assert.ok(p.S.exp.patch, "still in the place");
  lift(p, st);
  p.run("S.ui.menuSel = 0;"); p.key("confirm"); assert.equal(p.S.phase, "map", "lifted: Leave works");
  dock(p, st);
  assert.equal(p.run("lineFor().dim"), true, "the map's ✓ Go down is dimmed");
});

test("the Probe screen mid-expedition reads the Probe the expedition set out with; a docked upgrade applies from the next one", () => {
  const { p, st } = begin();
  p.run("S.exp.shield = 3;");
  st.probe = { shield: 4, smax: 4, tier: 2, seq: 1 }; st.dock = { docked: true, at: 0 }; st.dockN = (st.dockN || 0) + 1;
  p.writeSt(st);
  assert.equal(p.S.tier, 2);
  assert.ok(p.run("FX.notes.some(n => n.text === DOCK_TEXT.tierMid && n.pri === 3)"), "the mid-expedition tier line, priority 3");
  assert.ok(!p.run("FX.notes.some(n => /reaches further/.test(n.text))"), "not the between-expeditions line");
  assert.deepEqual([p.S.exp.range, p.S.exp.hold, p.S.exp.smax], [2, 2, 3], "the expedition keeps tier 1");
  const src = p.run("drawProbe.toString()");
  assert.match(src, /range: ex\.range, hold: ex\.hold, shield: ex\.smax/);
  p.run("var __t = []; text = (o => function (s, ...a) { __t.push(s); return o.call(this, s, ...a); })(text); drawTop = (o => function (a, b) { __t.push(b); return o.apply(this, arguments); })(drawTop);");
  p.run("__t = []; drawProbe(0);");
  const t = p.run("__t");
  assert.ok(t.includes("tier 1"), "tier 1 in the top bar");
  assert.ok(t.includes("Reaches 2 cells each way · 2 pods"));
  assert.ok(t.includes("Shield is whole"), "Shield is whole at 3 of 3");
  p.run("S.exp.shield = 2; __t = []; drawProbe(0);");
  assert.ok(p.run("__t").includes(p.run("DOCK_TEXT.probe")), "docked and hurt: the Station mends it");
});

test("Expedition ended, docked: the bay lines say the Companion is in the Caddy", () => {
  const { p, st } = begin();
  p.run("var __t = []; text = (o => function (s, ...a) { __t.push(s); return o.call(this, s, ...a); })(text); clipText = s => s;");
  p.run("S.exp = null; S.report = { reason: 'home', n: 1, empty: true, lines: [], items: [], lost: [] }; S.phase = 'sealed'; S.bay = [{ id: 'a', n: 1, pods: [] }]; save();");
  dockKey(st, p.sv()); p.writeSt(st); assert.equal(p.run("isDocked()"), true);
  p.run("__t = []; drawSealed(0);");
  assert.ok(p.run("__t").includes("1 crate sealed · ready for the Station"));
  assert.ok(p.run("__t").includes("In the Caddy · open Cargo on the Station"));
  p.run("S.bay = []; __t = []; drawSealed(0);");
  assert.ok(p.run("__t").includes("In the Caddy"), "an empty bay: In the Caddy alone");
});

test("bayLine(): the docked variant while docked, today's line undocked", () => {
  const { p, st } = begin();
  p.run("S.exp = null; S.phase = 'setup'; S.bay = [{ id: 'a', n: 1, pods: [] }]; save();");
  assert.equal(p.run("isDocked()"), false);
  assert.equal(p.run("bayLine()"), "1 crate sealed · dock to transfer", "undocked: unchanged");
  p.run("S.bay.push({ id: 'b', n: 2, pods: [] });");
  assert.equal(p.run("bayLine()"), "2 crates sealed · dock to transfer");
  dockKey(st, p.sv()); p.writeSt(st); assert.equal(p.run("isDocked()"), true);
  assert.equal(p.run("bayLine()"), p.run("DOCK_TEXT.bay(2)"), "docked: the dock freeze's own string");
  assert.equal(p.run("bayLine()"), "2 crates sealed · ready for the Station");
  p.run("S.bay = [S.bay[0]];");
  assert.equal(p.run("bayLine()"), "1 crate sealed · ready for the Station");
  p.run("S.bay = [];");
  assert.equal(p.run("bayLine()"), "", "an empty bay: no line");
});

// ---- the game designer's ruling on hints while docked (QA D1) ----
test("docked: no one-time hint shows or is spent; after Lift the first press shows the Call hint and spends it", () => {
  const CALL = "The teal CALL button pulses: it lifts the veil and finds things";
  const { p, st } = begin();
  p.key("right"); p.key("down"); p.key("right");
  let inPlace = false;
  for (const d of ["", "right", "down", "left", "up"]) {
    if (d) { p.run("if (S.exp.patch) leavePatch(); S.phase = 'map';"); p.key(d); }
    p.key("confirm"); if (p.S.phase === "patch") { inPlace = true; break; }
  }
  assert.ok(inPlace, "in a place");
  assert.equal(p.S.found.includes("callplace"), false, "the Call hint not yet spent");
  dock(p, st);
  p.key("back"); assert.equal(p.S.phase, "menu");
  p.run("S.ui.menuSel = menuItems().findIndex(i => i.id === 'cargo');"); p.key("confirm"); assert.equal(p.S.phase, "cargo");
  p.key("back"); p.key("back"); assert.equal(p.S.phase, "patch");
  assert.equal(p.S.found.includes("callplace"), false, "not spent while docked");
  assert.notEqual(p.run("FX.msg"), CALL, "the Call hint does not show while docked");
  lift(p, st);
  p.key("left"); assert.equal(p.S.phase, "patch");
  assert.equal(p.run("FX.msg"), CALL, "the first press after Lift shows the Call hint");
  assert.equal(p.S.found.includes("callplace"), true, "and spends it");
});
