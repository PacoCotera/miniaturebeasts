// A v8 save that passes load()'s guard never throws: load() fills every field a new world has and the save lacks, from
// the new world's own values (worldFields), and a save that still cannot draw its screen opens read-only and is never
// written. The whole page script is read out of index.html and run in a sandbox with the browser stubbed, as in
// freeze.test.mjs, so the boot runs as the page runs it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import * as W from "../src/world.mjs";
import * as A from "../src/atlas.mjs";

const PAGE = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const MODULE = PAGE.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const MODS = { world: W, atlas: A };
const IMPORT_RE = /^import \{([^}]*)\} from "\.\/src\/(\w+)\.mjs";$/gm;
const BINDINGS = [...MODULE.matchAll(IMPORT_RE)].flatMap(m => m[1].split(",").map(s => s.trim().split(/\s+as\s+/)).map(([f, t = f]) => [m[2], f, t]));
const SCRIPT = MODULE.replace(IMPORT_RE, "");
const SCHEMA = readFileSync(new URL("../../station/tests/fixtures/save-v8-schema1.json", import.meta.url), "utf8");

// The page in a sandbox: every DOM and canvas call lands on an inert stub; localStorage is `store`, its writes counted.
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const clock = { t: 1000, timers: [] }, writes = [], errors = [];
  const ctx = { console: { log() {}, warn() {}, error: e => errors.push(e) }, URLSearchParams, Date, fetch: () => new Promise(() => {}), document: any, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => 0, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { writes.push(k); store[k] = String(v); }, removeItem: k => { writes.push(k); delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  const p = { ctx, run, store, writes, errors, KEY: run("SAVE_KEY"),
    pass(ms) { const end = clock.t + ms; for (;;) { clock.timers.sort((a, b) => a.at - b.at); const n = clock.timers[0]; if (!n || n.at > end) break; clock.timers.shift(); clock.t = n.at; n.f(); } clock.t = end; } };
  return p;
}
// A saved new world (seed 7), as the page writes it.
function newSave() { const p = page(); p.run("newWorld(7)"); return p.store[p.KEY]; }
const plain = x => JSON.parse(JSON.stringify(x));

test("the Station's schema fixture loads through load() and drawSetup draws once with no throw", () => {
  const p = page({ "mb-save-v8": SCHEMA });
  assert.equal(p.KEY, "mb-save-v8");
  assert.equal(p.run("RT.readOnly"), undefined, "the fixture is not read-only");
  assert.equal(p.run("S.seed"), 123456, "the fixture's world was adopted");
  assert.equal(p.run("S.phase"), "setup");
  assert.doesNotThrow(() => p.run("drawSetup(0)"));
  assert.deepEqual(plain(p.run("S.ui")), plain(p.run("worldFields(1, 1).ui")), "ui is the new world's");
  assert.deepEqual(p.errors, [], "nothing was logged");
});

test("a full new-world save is byte-unchanged by the fill", () => {
  const raw = newSave(), p = page({ "mb-save-v8": raw });
  assert.equal(p.store[p.KEY], raw, "the boot wrote it back unchanged");
  p.store[p.KEY] = raw; assert.equal(p.run("load()"), true);
  assert.equal(p.run("JSON.stringify(S)"), raw);
});

test("a save missing several fields gains exactly the new world's values for them, and nothing else changes", () => {
  const raw = newSave(), o = JSON.parse(raw);
  const gone = ["ui", "phase", "revealed", "visited", "signs", "pins", "cells", "veil", "firsts", "opened", "log", "hist", "exp", "report", "nextId", "totalActions", "lastStorm", "deepRead", "probeSeen"];
  o.ui.sel = 1; o.turn = 3; o.expN = 4;   // present fields that differ from a new world's
  const kept = Object.assign({}, o); for (const k of gone) delete o[k];
  const p = page({ "mb-save-v8": JSON.stringify(o) });
  assert.equal(p.run("RT.readOnly"), undefined);
  const S = plain(p.run("S")), nw = plain(p.run("worldFields(7, 2)"));
  for (const k of gone) assert.deepEqual(S[k], nw[k], k + " is the new world's");
  for (const k of Object.keys(kept)) if (!gone.includes(k)) assert.deepEqual(S[k], kept[k], k + " is kept as saved");
  assert.equal(S.revealed.length, p.run("MW * MH")); assert.ok(S.revealed.every(v => v === 0) && S.visited.every(v => v === 0));
  assert.doesNotThrow(() => p.run("drawSetup(0)"));
});

test("a save without gen is not given one: it stays generator 1", () => {
  const o = JSON.parse(newSave()); delete o.gen;
  const p = page({ "mb-save-v8": JSON.stringify(o) });
  assert.equal(p.run("Object.hasOwn(S, 'gen')"), false);
  assert.equal(Object.hasOwn(JSON.parse(p.store[p.KEY]), "gen"), false);
});

test("a save forced to throw (ui present but null, kept as it is) opens read-only and is never written back", () => {
  const o = JSON.parse(SCHEMA); o.ui = null; const raw = JSON.stringify(o);
  const p = page({ "mb-save-v8": raw });
  assert.equal(p.run("RT.readOnly"), true);
  assert.equal(p.run("S.ui"), null, "the wrong-typed field is not fixed");
  assert.equal(p.errors.length, 1, "the failed draw was logged once");
  assert.doesNotThrow(() => p.run("render(0)"), "the read-only screen draws");
  for (const k of ["confirm", "back", "down", "up", "left", "right"]) p.run("act(" + JSON.stringify(k) + ")");
  p.run("save()"); p.pass(5000);
  assert.equal(p.store[p.KEY], raw, "the save is byte-unchanged");
  assert.deepEqual(p.writes.filter(k => k === p.KEY), [], "nothing wrote the save");
});
