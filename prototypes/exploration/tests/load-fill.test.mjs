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

// The page in a sandbox: every DOM and canvas call lands on an inert stub, except that an element keeps what is set on it
// (els[id].hidden); localStorage is `store`, its writes counted; requestAnimationFrame calls are counted.
function page(store = {}) {
  const any = new Proxy(function () {}, { get: (t, k) => k === Symbol.toPrimitive ? () => "" : k === Symbol.iterator ? function* () {} : k === "then" ? undefined : any,
    apply: () => any, construct: () => any, set: () => true });
  const els = {}, elStub = () => new Proxy({}, { get: (t, k) => k in t ? t[k] : any, set: (t, k, v) => { t[k] = v; return true; } });
  const document = new Proxy(any, { get: (t, k) => k === "getElementById" ? id => els[id] || (els[id] = elStub()) : any });
  const clock = { t: 1000, timers: [] }, writes = [], errors = [], raf = { n: 0 };
  const ctx = { console: { log() {}, warn() {}, error: e => errors.push(e) }, URLSearchParams, Date, fetch: () => new Promise(() => {}), document, location: any, navigator: any,
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }), requestAnimationFrame: () => ++raf.n, addEventListener: () => {}, innerWidth: 450, innerHeight: 600,
    performance: { now: () => clock.t }, setTimeout: (f, ms) => { clock.timers.push({ f, at: clock.t + (ms || 0) }); return clock.timers.length; }, clearTimeout: () => {},
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { writes.push(k); store[k] = String(v); }, removeItem: k => { writes.push(k); delete store[k]; } } };
  ctx.window = ctx; for (const [mod, from, to] of BINDINGS) ctx[to] = MODS[mod][from]; vm.createContext(ctx); vm.runInContext(SCRIPT, ctx);
  const run = src => vm.runInContext(src, ctx);
  const p = { ctx, run, store, writes, errors, els, raf, KEY: run("SAVE_KEY"),
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

// The line drawn on the read-only screen: every text() call of one render.
function drawnText(p) { p.run("var __said = []; { const t0 = text; text = (s, ...a) => { __said.push(s); return t0(s, ...a); }; render(0); text = t0; }"); return plain(p.run("__said")); }
const BROKEN_LINE = "This save can’t be shown · kept untouched", NEWER_LINE = "This page is out of date · reload to play", PAGE_LINE = "Reset game erases this save and starts fresh";

test("nextId: missing, it is 1 + the highest r/p/b/n pod id held anywhere in the save; a valid one is kept, an invalid one is counted", () => {
  const p = page(), o = JSON.parse(SCHEMA);
  o.pods = [{ id: "b7", k: "4", x: -1, y: -1, sp: 0, h: 1, bur: 1, g: "meadow", how: "ground" }];
  o.exp = { cargo: { pods: [{ id: "n12", sp: 1 }] } }; delete o.nextId;
  const at = x => { p.store[p.KEY] = JSON.stringify(x); assert.equal(p.run("load()"), true); return p.run("S.nextId"); };
  assert.equal(at(o), 13);
  assert.equal(at(Object.assign({}, o, { nextId: 3 })), 3, "a valid nextId is kept, even lower");
  for (const bad of [0, -2, 1.5, "9", null]) assert.equal(at(Object.assign({}, o, { nextId: bad })), 13, "nextId " + JSON.stringify(bad) + " is counted");
  assert.equal(at(Object.assign({}, o, { pods: [], exp: null, bay: [] })), 1, "no pod ids: 1");
});

test("pods: missing, the world's life is regenerated, minus any id the save already holds; a present list, even empty, is kept", () => {
  const p = page(), o = JSON.parse(SCHEMA); delete o.pods;
  o.bay[0].pods.push({ id: "w0", sp: 0, g: "meadow", how: "ground", gs: 5 });   // a world pod already taken
  p.store[p.KEY] = JSON.stringify(o); assert.equal(p.run("load()"), true);
  const life = plain(p.run("genLife(123456).pods")), got = plain(p.run("S.pods"));
  assert.ok(life.some(q => q.id === "w0"));
  assert.deepEqual(got, life.filter(q => q.id !== "w0"));
  assert.equal(p.run("S.nextId"), 1, "generated ids are not r/p/b/n: nextId 1");
  p.store[p.KEY] = SCHEMA; assert.equal(p.run("load()"), true);
  assert.deepEqual(plain(p.run("S.pods")), [], "the fixture's empty pods is kept");
});

test("a loaded save whose break throws (endExpedition) opens read-only, is byte-identical, and the frames still run", () => {
  const o = JSON.parse(SCHEMA); o.exp = { shield: 0, n: 1 }; const raw = JSON.stringify(o);
  const p = page({ "mb-save-v8": raw });
  assert.equal(p.run("RT.readOnly"), true);
  assert.equal(p.errors.length, 1, "the throw was logged once"); assert.match(String(p.errors[0].stack), /at endExpedition/, "it was the break that threw");
  p.pass(5000); p.run("save()");
  assert.equal(p.store[p.KEY], raw); assert.deepEqual(p.writes.filter(k => k === p.KEY), []);
  assert.ok(p.raf.n >= 1, "requestAnimationFrame was called");
});

test("the read-only line: a broken save says it is kept untouched, with the page line beside Reset game; a newer page's save keeps its own line", () => {
  assert.match(PAGE, new RegExp('<button class="btn" id="resetGame" type="button">Reset game</button></div>\\s*<p class="obs-note" id="resetNote" hidden>' + PAGE_LINE + "</p>"));
  const o = JSON.parse(SCHEMA); o.ui = null;
  const b = page({ "mb-save-v8": JSON.stringify(o) });
  assert.equal(b.run("RT.readOnly"), true);
  const said = drawnText(b); assert.ok(said.includes(BROKEN_LINE)); assert.ok(!said.includes(NEWER_LINE));
  assert.equal(b.els.resetNote.hidden, false, "the page line shows");
  const n = page({ "mb-save-v8": JSON.stringify(Object.assign(JSON.parse(SCHEMA), { gen: 99 })) });
  assert.equal(n.run("RT.readOnly"), true); assert.equal(n.run("S"), null);
  const saidN = drawnText(n); assert.ok(saidN.includes(NEWER_LINE)); assert.ok(!saidN.includes(BROKEN_LINE));
  assert.notEqual(n.els.resetNote && n.els.resetNote.hidden, false, "no page line for a newer page's save");
  const ok = page({ "mb-save-v8": SCHEMA }); assert.notEqual(ok.els.resetNote && ok.els.resetNote.hidden, false, "none for a save that draws");
});
