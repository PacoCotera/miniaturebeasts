// The Companion is the player's identity (companions.mjs, game.mjs): the shared save of earlier builds moves under Companion A's id with nothing lost; bytes no page can
// load stay where they are; the id is made once and kept; the Station's map holds the active id and the known ones; docking Companion B switches the Station to B's world,
// and docking A again switches it back, both saves whole.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as C from "../src/companions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const RAW = readFileSync(path.join(here, "fixtures/save-v8-schema1.json"), "utf8");
const memStore = (init = {}) => { const m = new Map(Object.entries(init)); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
let n = 0; const rand = () => ((n = (n * 9301 + 49297) % 233280) / 233280);

test("the shared save moves under Companion A's id, byte for byte; the old key goes; a second load changes nothing", () => {
  const st = memStore({ [C.LEGACY_KEY]: RAW, "mb-station-dev": "{}" });
  const r = C.migrateLegacy(st, { rand });
  assert.equal(r.moved, true); assert.match(r.id, /^c[0-9a-z]{12}$/);
  assert.equal(st.getItem(C.saveKeyOf(r.id)), RAW, "nothing lost: the same bytes under the Companion's key");
  assert.equal(st.getItem(C.LEGACY_KEY), null, "the old key is gone");
  assert.deepEqual(JSON.parse(st.getItem("mb-companion-A")).id, r.id, "the id is kept as Companion A's");
  assert.equal(st.getItem("mb-station-dev"), "{}", "nothing else touched");
  const keys = [...st.m.keys()].sort(); assert.deepEqual(C.migrateLegacy(st, { rand }), { moved: false }); assert.deepEqual([...st.m.keys()].sort(), keys, "a second load changes nothing");
  assert.equal(C.companionOf(st, "A").id, r.id, "the id is stable");
  assert.notEqual(C.companionOf(st, "B", { rand }).id, r.id, "Companion B has its own");
  assert.equal(C.companionOf(st, "B").id, C.companionOf(st, "B").id);
});

test("bytes no page can load stay where they are; a Companion A that already holds a save is never written over", () => {
  for (const bad of ["{not json", "[]", '{"v":8}', '{"v":9,"seed":1,"cr":[],"mibis":[]}']) {
    const st = memStore({ [C.LEGACY_KEY]: bad }); assert.equal(C.migrateLegacy(st).moved, false, bad); assert.equal(st.getItem(C.LEGACY_KEY), bad, bad);
  }
  const st = memStore({ [C.LEGACY_KEY]: RAW }), a = C.companionOf(st, "A", { rand }); st.setItem(C.saveKeyOf(a.id), "{\"v\":8,\"mine\":1}");
  const r = C.migrateLegacy(st); assert.equal(r.moved, false); assert.equal(st.getItem(C.saveKeyOf(a.id)), "{\"v\":8,\"mine\":1}"); assert.equal(st.getItem(C.LEGACY_KEY), RAW, "both kept");
});

test("the Station's map: made at its first load with Companion A active; the last Companion docked becomes active and joins the known list once", () => {
  const st = memStore({ [C.LEGACY_KEY]: RAW }), map = C.stationMap(st, { rand });
  const a = C.companionOf(st, "A"); assert.equal(map.active, a.id); assert.deepEqual(map.known.map((k) => [k.id, k.name]), [[a.id, "Companion A"]]);
  assert.equal(C.activeSaveKey(st), C.saveKeyOf(a.id)); assert.equal(st.getItem(C.saveKeyOf(a.id)), RAW, "the Station's first load moved the save");
  const b = C.companionOf(st, "B", { rand });
  assert.equal(C.companionDocked(st, b).switched, true); assert.equal(C.activeId(st), b.id);
  assert.equal(C.companionDocked(st, b).switched, false, "the same Companion again: no switch");
  assert.equal(C.companionDocked(st, a).switched, true); assert.deepEqual(C.stationMap(st).known.map((k) => k.name), ["Companion A", "Companion B"]);
  assert.equal(C.companionDocked(st, { id: "nope" }).switched, false, "a malformed id is ignored");
  assert.throws(() => C.replaceCompanion(st, a.id, b.id), /not built/, "replacing a lost Companion is a seam, not built");
});

test("docking Companion B switches the Station to B's world; docking A again switches it back, both saves whole", async () => {
  const st = memStore({ [C.LEGACY_KEY]: RAW }); globalThis.localStorage = st;
  const S = await import("../src/state.mjs"), game = await import("../src/game.mjs"), { G } = game;
  game.load(); const wA = G.sv.wid, stA = JSON.stringify(G.st.mibis), keyA = game.saveKey();
  assert.ok(wA && keyA.startsWith(C.SAVE_PREFIX)); assert.equal(st.getItem(C.LEGACY_KEY), null, "moved at the Station's first load");
  const b = C.companionOf(st, "B"), svB = { v: 8, seed: 99, wid: "wB99", turn: 2, bay: [], mibis: [], cr: [], carried: [] };
  st.setItem(C.saveKeyOf(b.id), JSON.stringify(svB));   // Companion B's own save, as its page writes it: no Station part yet
  G.st.e = 41; game.save();
  assert.equal(game.switchCompanion({ id: b.id, name: b.name }), true);
  assert.deepEqual([G.sv.wid, G.st.wid, game.saveKey()], ["wB99", "wB99", C.saveKeyOf(b.id)], "the Station shows B's world, a fresh Station part for it");
  assert.equal(JSON.parse(st.getItem(C.saveKeyOf(b.id))).st.wid, "wB99", "and writes it under B's key");
  assert.equal(game.activeCompanion().name, "Companion B");
  const a = C.companionOf(st, "A"); assert.equal(game.switchCompanion({ id: a.id, name: a.name }), true);
  assert.deepEqual([G.sv.wid, game.saveKey(), G.st.e, JSON.stringify(G.st.mibis)], [wA, keyA, 41, stA], "back to A's world as it was");
  assert.equal(JSON.parse(st.getItem(C.saveKeyOf(b.id))).seed, 99, "B's save is kept");
  assert.equal(game.switchCompanion({ id: a.id, name: a.name }), false, "the same Companion: nothing switches");
  assert.ok(S.SAVE_V === 8);
});
