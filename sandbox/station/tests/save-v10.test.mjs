// Save v10 on the Station: the Companion's save is a realm of regions; the Station reads it, writes only `st`, keeps every other byte (the regions above all),
// never writes over a save whose v is above what it knows, and resets a v8 or v9 save once (kept whole in <key>.pre10, a fresh v10 save in its place).
//   node --test prototypes/station/tests/save-v10.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const store = new Map(); let writes = [], dropCopy = false;
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { if (dropCopy && String(k).endsWith(".pre10")) throw new Error("full"); writes.push(k); store.set(k, String(v)); }, removeItem: (k) => { writes.push(k); store.delete(k); } };
const S = await import("../src/state.mjs");
const game = await import("../src/game.mjs");
const { migrate8 } = await import("../../exploration/src/regions.mjs");
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/save-v8-${name}.json`, import.meta.url), "utf8"));
const key = () => game.saveKey();
const realm = () => migrate8({ ...fixture("played-g2"), gen: 5 }, { now: Date.UTC(2026, 10, 3) });   // a played realm as v10: generator 5, two mibis, two crates
const put = (o) => { store.clear(); writes = []; dropCopy = false; const raw = typeof o === "string" ? o : JSON.stringify(o); store.set(key(), raw); return raw; };
const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };

test("the Station knows v10 only, and its own writes are v10", () => {
  assert.equal(S.SAVE_V, 10); assert.deepEqual(S.SAVE_VS, [10]);
});

test("a v10 save is read, not replaced by a blank Station; its `st` is the Station's", () => {
  const o = realm(); put(o); game.load();
  assert.equal(game.G.sv.v, 10); assert.equal(game.G.sv.wid, o.wid); assert.equal(game.G.st.wid, o.wid);
  assert.equal(game.G.st.mibis.length, o.st.mibis.length, "the Station's mibis are the ones the save holds");
});

test("a v10 save written back by the Station keeps `regions` byte for byte, and every field but `st`", () => {
  const o = realm(), raw = put(o), regionsText = JSON.stringify(o.regions);
  game.load(); game.G.st.log.push({ t: 1, s: "a line the Station added" }); game.save();
  const out = store.get(key());
  assert.notEqual(out, raw, "the Station wrote (its part changed)");
  assert.ok(out.includes('"regions":' + regionsText), "the regions are the same bytes");
  const back = JSON.parse(out);
  assert.equal(back.v, 10);
  assert.equal(JSON.stringify(without(back, "st")), JSON.stringify(without(o, "st")), "nothing but `st` changed");
  assert.equal(JSON.stringify(back.regions[0].map), JSON.stringify(o.regions[0].map), "region 1's map");
  assert.deepEqual(writes, [key()], "one write, to the Companion's own key");
});

test("a v9 or v8 save is reset once: the old bytes are kept whole in <key>.pre10, and a fresh v10 save with no world stands in its place", () => {
  for (const [from, o] of [[9, { ...realm(), v: 9 }], [8, fixture("played-g2")]]) {
    const raw = put(o); game.UI.panel = null; game.load();
    assert.equal(store.get(key() + ".pre10"), raw, "the old bytes, untouched");
    const sv = JSON.parse(store.get(key()));
    assert.equal(sv.v, 10); assert.equal(sv.resetFrom, from); assert.ok(sv.wid && sv.wid !== o.wid, "a new world id"); assert.equal(sv.st.wid, sv.wid); assert.equal(sv.regions, undefined, "no world: the Companion starts one");
    assert.deepEqual(sv.st.mibis, [], "no mibi"); assert.deepEqual(sv.st.tray, [], "no pod");
    assert.equal(game.G.sv.resetFrom, from); assert.equal(game.G.st.mibis.length, 0);
    assert.equal(game.UI.panel && game.UI.panel.id, "reset", "the notice is up over Home"); assert.equal(sv.st.resetSeen, true, "its flag is written as it shows");
    game.UI.panel = null; game.load();
    assert.equal(game.UI.panel, null, "and not again"); assert.equal(JSON.parse(store.get(key())).wid, sv.wid, "no second reset"); assert.equal(store.get(key() + ".pre10"), raw);
  }
});

test("a save copy that fails: the Station keeps the old bytes where they are, writes nothing, and a save() leaves them", () => {
  const raw = put({ ...realm(), v: 9 }); dropCopy = true; game.G.lockedKey = null; game.UI.panel = null; game.load();
  assert.equal(store.get(key()), raw, "the old bytes stay"); assert.equal(store.has(key() + ".pre10"), false); assert.deepEqual(writes, [], "nothing written");
  assert.equal(game.G.sv.wid, null, "a blank Station in memory"); assert.equal(game.UI.panel, null);
  game.G.st.log.push({ t: 1, s: "x" }); game.save(); game.storageChanged();
  assert.equal(store.get(key()), raw); assert.deepEqual(writes, []);
  dropCopy = false; game.G.lockedKey = null;
});

test("a save whose v is above 10 is never written over: save() leaves the bytes, a reset is the only way out", () => {
  const o = { ...realm(), v: 11, extra: { from: "a newer page" } }, raw = put(o);
  game.load();
  assert.equal(game.G.sv.wid, null, "read as no save: a blank Station in memory");
  game.G.st.log.push({ t: 1, s: "x" }); game.save();
  assert.equal(store.get(key()), raw, "the bytes are the newer page's");
  assert.deepEqual(writes, [], "nothing was written");
  game.storageChanged();
  assert.equal(store.get(key()), raw); assert.deepEqual(writes, []);
});

test("a reset removes the save and its .pre9 and .pre10 copies", () => {
  put(realm()); store.set(key() + ".pre9", "v8 bytes"); store.set(key() + ".pre10", "v9 bytes"); game.G.resetting = false;
  game.resetSave(); game.G.resetting = false;
  assert.equal(store.has(key()), false); assert.equal(store.has(key() + ".pre9"), false); assert.equal(store.has(key() + ".pre10"), false);
});
