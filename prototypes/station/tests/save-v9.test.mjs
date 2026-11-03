// Save v9 on the Station: the Companion's save is a realm of regions; the Station reads it, writes only `st`, keeps every other byte (the regions above all),
// and never writes over a save whose v is above what it knows.
//   node --test prototypes/station/tests/save-v9.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const store = new Map(); let writes = [];
globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => { writes.push(k); store.set(k, String(v)); }, removeItem: (k) => { writes.push(k); store.delete(k); } };
const S = await import("../src/state.mjs");
const game = await import("../src/game.mjs");
const { migrate8 } = await import("../../exploration/src/regions.mjs");
const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/save-v8-${name}.json`, import.meta.url), "utf8"));
const key = () => game.saveKey();
const realm = () => migrate8(fixture("played-g2"), { now: Date.UTC(2026, 10, 3) });
const put = (o) => { store.clear(); writes = []; const raw = JSON.stringify(o); store.set(key(), raw); return raw; };
const without = (o, k) => { const c = { ...o }; delete c[k]; return c; };

test("the Station knows v9 and v8, and its own writes are v9", () => {
  assert.equal(S.SAVE_V, 9); assert.deepEqual(S.SAVE_VS, [8, 9]);
});

test("a v9 save is read, not replaced by a blank Station; its `st` is the Station's", () => {
  const o = realm(); put(o); game.load();
  assert.equal(game.G.sv.v, 9); assert.equal(game.G.sv.wid, o.wid); assert.equal(game.G.st.wid, o.wid);
  assert.equal(game.G.st.mibis.length, o.st.mibis.length, "the Station's mibis are the ones the save holds");
});

test("a v9 save written back by the Station keeps `regions` byte for byte, and every field but `st`", () => {
  const o = realm(), raw = put(o), regionsText = JSON.stringify(o.regions);
  game.load(); game.G.st.log.push({ t: 1, s: "a line the Station added" }); game.save();
  const out = store.get(key());
  assert.notEqual(out, raw, "the Station wrote (its part changed)");
  assert.ok(out.includes('"regions":' + regionsText), "the regions are the same bytes");
  const back = JSON.parse(out);
  assert.equal(back.v, 9);
  assert.equal(JSON.stringify(without(back, "st")), JSON.stringify(without(o, "st")), "nothing but `st` changed");
  assert.equal(JSON.stringify(back.regions[0].map), JSON.stringify(o.regions[0].map), "region 1's map");
  assert.deepEqual(writes, [key()], "one write, to the Companion's own key");
});

test("a v8 save is still read, and stays v8 when the Station writes it", () => {
  const o = fixture("played-g2"); put(o); game.load();
  assert.equal(game.G.sv.v, 8); game.G.st.log.push({ t: 1, s: "x" }); game.save();
  assert.equal(JSON.parse(store.get(key())).v, 8);
});

test("a save whose v is above 9 is never written over: save() leaves the bytes, a reset is the only way out", () => {
  const o = { ...realm(), v: 10, extra: { from: "a newer page" } }, raw = put(o);
  game.load();
  assert.equal(game.G.sv.wid, null, "read as no save: a blank Station in memory");
  game.G.st.log.push({ t: 1, s: "x" }); game.save();
  assert.equal(store.get(key()), raw, "the bytes are the newer page's");
  assert.deepEqual(writes, [], "nothing was written");
  game.storageChanged();
  assert.equal(store.get(key()), raw); assert.deepEqual(writes, []);
});

test("a reset removes the save and its .pre9 copy", () => {
  put(realm()); store.set(key() + ".pre9", "v8 bytes"); game.G.resetting = false;
  game.resetSave(); game.G.resetting = false;
  assert.equal(store.has(key()), false); assert.equal(store.has(key() + ".pre9"), false);
});
