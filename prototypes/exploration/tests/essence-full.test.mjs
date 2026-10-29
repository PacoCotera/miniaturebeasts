// At a full Essence hold a dew cup keeps its dew, a tuft stays, and a fruit is not pressed: each says so and takes no turn.
// With room, each still gives Essence. The page runs in the same sandbox as stone-full.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as V from "../src/view.mjs";
import * as A from "../src/atlas.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const MODS = { world: W, view: V, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");

function page() {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const els = {}, elStub = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : any, set: (t, k, v) => { t[k] = v; return true; } });
  const document = new Proxy(any, { get: (t, k) => k === "getElementById" ? id => els[id] || (els[id] = elStub()) : any });
  const store = {};
  const ctx = { console: { log() {}, warn() {}, error() {} }, URLSearchParams, Date, fetch: () => new Promise(() => {}), document, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 1, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => 1000 }, setTimeout: () => 1, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  return src => vm.runInContext(src, ctx);
}

// A world with a patch open on a passable cell, the Essence hold set to `s`.
function setup(s) {
  const run = page(); run("newWorld(7)");
  run(`(() => { const cell = S.revealed.findIndex((v, i) => passable(i) && G.land[i] !== L.WATER);
    startExpedition('weather', cell); const ex = S.exp, key = String(cell); ensureLive(key);
    ex.patch = { key, x: 5, y: 5, dir: 'up', noise: 'creep' }; ex.cargo.s = ${s}; window.T = { key }; })()`);
  return run;
}
const state = run => JSON.parse(run(`JSON.stringify({ s: S.exp.cargo.s, actions: S.exp.actions, carry: S.exp.carry })`));

test("a full hold: the cup keeps its dew and no turn passes", () => {
  const run = setup(20); run(`setFS(T.key, 'cup1', { full: true }); window.F = { id: 'cup1', x: 5, y: 4 }`);
  const before = state(run); run("takeDew(F)");
  assert.deepEqual(state(run), before);
  assert.equal(run("fs(T.key, 'cup1').full"), true);
});

test("with room, the cup gives 1 Essence and empties", () => {
  const run = setup(5); run(`setFS(T.key, 'cup1', { full: true }); window.F = { id: 'cup1', x: 5, y: 4 }`);
  run("takeDew(F)");
  assert.equal(state(run).s, 6);
  assert.equal(run("fs(T.key, 'cup1').full"), false);
});

test("a full hold: a tuft stays where it is and no turn passes", () => {
  const run = setup(20); run(`(() => { const live = curLive(); window.TF = { x: 5, y: 4 }; live.tf = [TF]; })()`);
  const before = state(run); run("takeTuft(TF)");
  assert.deepEqual(state(run), before);
  assert.equal(run("curLive().tf.length"), 1);
});

test("one free place: a fruit is not pressed and stays in hand", () => {
  const run = setup(19); run("S.exp.carry = 'fruit'");
  const before = state(run); run("pressFruit()");
  assert.deepEqual(state(run), before);
  assert.equal(state(run).carry, "fruit");
});

test("with two free places, pressing a fruit gives 2 Essence", () => {
  const run = setup(18); run("S.exp.carry = 'fruit'");
  run("pressFruit()");
  assert.equal(state(run).s, 20);
  assert.equal(state(run).carry, null);
});
