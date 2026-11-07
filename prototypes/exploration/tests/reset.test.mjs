// The save reset (release 21b): what a page does with what it finds (pure), the .pre10 copy, and the two pages through it: a v9 or v8 save is kept whole and a new realm starts,
// whichever page opens first; each page shows its own notice once; a save that cannot be copied or is newer is left alone.
//   node --test prototypes/exploration/tests/reset.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resetPlan, keepPre10, RESET_V, migrate8 } from "../src/regions.mjs";
import { makePage } from "./page-harness.mjs";

const store = (init = {}, { failSet = false } = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (failSet) throw new Error("full"); m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };

test("what a page finds: nothing, a v10 save, a v8 or v9 save, a newer save, bytes it cannot read", () => {
  assert.equal(RESET_V, 10);
  assert.deepEqual(resetPlan(null), { action: "none" }); assert.deepEqual(resetPlan(""), { action: "none" });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 10, seed: 1 })), { action: "play" });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 9, seed: 1 })), { action: "reset", from: 9 });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 8, seed: 1 })), { action: "reset", from: 8 });
  assert.deepEqual(resetPlan(JSON.stringify({ v: 11 })), { action: "newer" });
  for (const raw of ["{not json", "[]", "7", JSON.stringify({ v: 3 }), JSON.stringify({ seed: 1 })]) assert.deepEqual(resetPlan(raw), { action: "broken" }, raw);
});

test("the copy: <key>.pre10 holds the old bytes exactly, once; an older .pre9 goes; a copy already there is kept", () => {
  const raw = JSON.stringify({ v: 9, seed: 5, mibis: [{ id: 1 }] }), st = store({ k: raw, "k.pre9": "old" });
  assert.equal(keepPre10(st, "k", raw), true); assert.equal(st.getItem("k.pre10"), raw); assert.equal(st.getItem("k.pre9"), null); assert.equal(st.getItem("k"), raw, "the save itself is untouched here");
  assert.equal(keepPre10(st, "k", "other bytes"), true); assert.equal(st.getItem("k.pre10"), raw, "the oldest bytes are kept");
});

test("a copy that cannot be made: false, nothing written (the page opens read-only)", () => {
  const raw = JSON.stringify({ v: 9, seed: 5 }), st = store({ k: raw }, { failSet: true });
  assert.equal(keepPre10(st, "k", raw), false); assert.equal(st.getItem("k.pre10"), null);
});

// ---- the Companion page ----
const NOW = Date.UTC(2026, 10, 6, 9, 0, 0);
const fixture = (name) => JSON.parse(readFileSync(new URL(`../../station/tests/fixtures/save-v8-${name}.json`, import.meta.url), "utf8"));
const v8Raw = () => JSON.stringify(fixture("played-g2"));
const v9Obj = () => ({ ...migrate8({ ...fixture("played-g2"), gen: 3 }, { now: NOW }), v: 9 });   // a played v9 realm: generator 3, two mibis, two crates
const page = (init = {}) => makePage({ store: init, console: "collect", els: true, raf: "count" });
const plain = (x) => JSON.parse(JSON.stringify(x));
// every text() call of one render
const said = (p) => { p.run("var __said = []; { const t0 = text; text = (s, ...a) => { __said.push(s); return t0(s, ...a); }; render(0); text = t0; }"); return plain(p.run("__said")); };

test("1. a v9 save: after load the old bytes are in <key>.pre10, the save is v10 with resetFrom 9, no mibi, no crate, a new generator 5 world; the notice shows once and not after a reload", () => {
  const old = v9Obj(), raw = JSON.stringify(old), init = { "mb-save-v8": raw }, p = page(init);
  assert.equal(p.store[p.KEY + ".pre10"], raw, "the old bytes, untouched, in the copy");
  const now = JSON.parse(p.store[p.KEY]);
  assert.equal(now.v, 10); assert.equal(now.resetFrom, 9); assert.deepEqual(now.mibis, []); assert.deepEqual(now.bay, []); assert.equal(now.regions.length, 1); assert.equal(now.regions[0].gen, 5);
  assert.notEqual(now.seed, old.seed, "a new world"); assert.equal(old.mibis.length, 2, "(the old one had mibis)");
  assert.equal(p.store["mb-save-v8"], undefined, "the shared key is not left behind to be reset again");
  assert.equal(p.run("RT.notice"), true, "the notice is up");
  const t = said(p); assert.ok(t.includes("The world has changed.") && t.includes("New mibis live in it now.") && t.includes("Explore"), t.join("|"));
  assert.ok(!t.some((s) => /\d|save|version/i.test(s)), "no numbers, no talk of versions or saves: " + t.join("|"));
  p.key("up"); assert.equal(p.run("RT.notice"), true, "only its button goes on");
  p.key("confirm"); assert.equal(p.run("RT.notice"), false); assert.equal(JSON.parse(p.store[p.KEY]).resetSeen, 1);
  const q = page(p.store);
  assert.ok(!q.run("RT.notice"), "not again after a reload"); assert.equal(q.store[q.KEY + ".pre10"], raw, "the copy is still the old bytes"); assert.equal(q.run("S.resetFrom"), 9);
});

test("1b. a v8 save: the same, resetFrom 8", () => {
  const raw = v8Raw(), p = page({ "mb-save-v8": raw });
  assert.equal(p.store[p.KEY + ".pre10"], raw); const now = JSON.parse(p.store[p.KEY]);
  assert.equal(now.v, 10); assert.equal(now.resetFrom, 8); assert.deepEqual(now.mibis, []); assert.equal(now.regions[0].gen, 5); assert.equal(p.run("RT.notice"), true);
});

test("3. a save copy that fails: read-only, nothing written, the bytes stay where they were", () => {
  const raw = JSON.stringify(v9Obj());
  const back = new Proxy({ "mb-save-v8": raw }, { set: (t, k, v) => { if (!String(k).endsWith(".pre10")) t[k] = v; return true; } });   // storage that drops the copy
  const p = makePage({ store: back, console: "collect", els: true, raf: "count" });
  assert.equal(p.run("RT.readOnly"), true); assert.equal(p.run("RT.broken"), true); assert.ok(!p.run("RT.notice"));
  assert.equal(back["mb-save-v8"], raw, "the old bytes stay where they were"); assert.equal(p.writes.filter((k) => k === "mb-save-v8" || k === p.KEY).length, 0, "nothing wrote the save");
  p.run("save()"); p.pass(5000); assert.equal(back["mb-save-v8"], raw);
});

test("4. a v11 save: read-only, untouched (a newer page's save is never reset)", () => {
  const raw = JSON.stringify({ ...migrate8({ ...fixture("played-g2"), gen: 5 }, { now: NOW }), v: 11 }), p = page({ "mb-save-v8": raw });
  assert.equal(p.run("RT.readOnly"), true); assert.ok(!p.run("RT.broken")); assert.ok(!p.run("RT.notice"));
  assert.equal(p.store["mb-save-v8"], raw, "the bytes are the newer page's"); assert.equal(Object.keys(p.store).filter((k) => /pre10/.test(k)).length, 0, "no copy made");
  assert.equal(p.writes.filter((k) => !k.startsWith("mb-companion")).length, 0, "nothing written but the Companion's own identity");
});

// ---- both pages: the Station and the Companion on one storage ----
globalThis.localStorage = (() => { let box = {}; return { __use: (o) => { box = o; }, getItem: (k) => (k in box ? box[k] : null), setItem: (k, v) => { box[k] = String(v); }, removeItem: (k) => { delete box[k]; } }; })();
const game = await import("../../station/src/game.mjs");
const ID = "cstationfirst", KEY = "mb-save-v8@" + ID;
const seeded = (raw) => ({ "mb-companion-A": JSON.stringify({ id: ID, name: "Companion A", slot: "A", at: 1 }), [KEY]: raw });

test("2. the Station opens first: it keeps the v9 bytes and writes a fresh v10 save; the Companion then starts its world under that world id; each page shows its notice once", () => {
  const raw = JSON.stringify(v9Obj()), box = seeded(raw); globalThis.localStorage.__use(box);
  game.UI.panel = null; game.load();
  assert.equal(box[KEY + ".pre10"], raw, "the Station kept the old bytes");
  const sv = JSON.parse(box[KEY]);
  assert.equal(sv.v, 10); assert.equal(sv.resetFrom, 9); assert.ok(sv.wid); assert.equal(sv.st.wid, sv.wid); assert.equal(sv.regions, undefined, "no world yet: the Companion starts one"); assert.equal(sv.seed, undefined);
  assert.equal(game.UI.panel && game.UI.panel.id, "reset", "the Station's notice is up"); assert.equal(game.G.st.resetSeen, true, "and is spent as it shows");
  const p = page(box);   // the Companion opens second, on the same storage
  assert.equal(p.KEY, KEY);
  const now = JSON.parse(box[KEY]);
  assert.equal(now.v, 10); assert.equal(now.wid, sv.wid, "the realm takes the world id the Station wrote"); assert.equal(now.st.wid, sv.wid, "and the Station's part stays"); assert.equal(now.st.resetSeen, true);
  assert.equal(now.resetFrom, 9); assert.deepEqual(now.mibis, []); assert.equal(now.regions[0].gen, 5); assert.equal(box[KEY + ".pre10"], raw, "one copy, the old bytes");
  assert.equal(p.run("RT.notice"), true, "the Companion's own notice"); p.key("confirm"); assert.equal(p.run("RT.notice"), false);
  game.UI.panel = null; game.load();   // the Station again: nothing to show
  assert.equal(game.UI.panel, null, "the Station's notice is not shown again"); assert.equal(game.G.sv.wid, sv.wid);
});

test("2b. the Companion opens first, then the Station: the Station shows its notice once", () => {
  const raw = JSON.stringify(v9Obj()), box = seeded(raw); globalThis.localStorage.__use(box);
  const p = page(box); assert.equal(p.KEY, KEY); assert.equal(box[KEY + ".pre10"], raw); const c = JSON.parse(box[KEY]); assert.equal(c.resetFrom, 9);
  game.UI.panel = null; game.load();
  assert.equal(game.G.sv.wid, c.wid); assert.equal(game.UI.panel && game.UI.panel.id, "reset", "the Station's notice");
  assert.equal(box[KEY + ".pre10"], raw, "the Station made no second copy");
  game.UI.panel = null; game.load(); assert.equal(game.UI.panel, null, "once");
});
