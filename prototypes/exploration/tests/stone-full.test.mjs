// A stone keeps its storm charge or its warmth while the Energy hold is full: drawing it then does nothing to the stone,
// takes no turn, and says so. With room, it discharges as before. The page runs in the same sandbox as load-fill.test.mjs.
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

// A new world with a patch open on a place that has a stone; returns the runner. The stone is made storm-charged (+3) or warm.
function setup(kind, energy) {
  const run = page(); run("newWorld(7)");
  run(`(() => { const cell = S.revealed.findIndex((v, i) => passable(i) && G.land[i] !== L.WATER && layout(String(i)).feats.some(f => f.kind === 'k'));
    startExpedition('weather', cell); const ex = S.exp, key = String(cell), f = layout(key).feats.find(f => f.kind === 'k');
    ensureLive(key); ex.patch = { key, x: f.x, y: f.y + 1, dir: 'up', noise: 'creep' }; ex.cargo.e = ${energy}; window.T = { key, f };
    if (${kind === "storm"}) setFS(key, f.id, { ch: 3 }); else { setFS(key, f.id, { ws: S.turn }); } })()`);
  return run;
}
const state = run => JSON.parse(run(`JSON.stringify({ e: S.exp.cargo.e, act: S.exp.actions, cell: fs(T.key, T.f.id), charge: stoneCharge(T.key, T.f), storm: stormCharge(T.key, T.f) })`));

for (const kind of ["storm", "warm"]) {
  test(`a ${kind} stone keeps its charge when the Energy hold is full`, () => {
    const run = setup(kind, 20), before = state(run);
    assert.ok(before.charge > 0, "the stone holds something");
    run("takeCharge(T.f)");
    const after = state(run);
    assert.deepEqual(after, before, "the stone, the hold and the turn count are untouched");
    assert.match(run("FX.msg"), /Energy full/, "it says so");
  });
  test(`a ${kind} stone still discharges into a hold with room`, () => {
    const run = setup(kind, 10), before = state(run);
    run("takeCharge(T.f)");
    const after = state(run);
    assert.equal(after.e, 10 + before.charge, "the Energy was taken");
    assert.equal(after.charge, 0, "the stone is spent");
  });
}
test("a storm stone with room for only some of its charge keeps the rest", () => {
  const run = setup("storm", 19); run("takeCharge(T.f)");
  const s = state(run); assert.equal(s.e, 20); assert.equal(s.storm, 2);
});
