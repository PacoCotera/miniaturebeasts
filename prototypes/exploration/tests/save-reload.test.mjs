// A save made mid-expedition by this page loads back and plays on (Preview 6 renamed the page's wantOverview to wantSector and left a call to the old name in load():
// every stored save threw a ReferenceError there, was swallowed as 'broken' and opened read-only). The page is run as the browser runs it (page-harness.mjs): set out, save,
// then a second page opened on the same storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = store => makePage({ gen: 7, store, console: "collect", els: true, canvas: true, raf: "count" });

test("a save made mid-expedition reloads, plays on, and is not read-only", () => {
  const a = page({}); a.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);");
  a.run("save()");
  const raw = a.store[a.KEY]; assert.ok(raw, "the first page wrote its save");
  assert.ok(JSON.parse(raw).regions, "a realm save");
  const b = page({ ...a.store });
  assert.equal(b.run("RT.readOnly"), undefined, "the reloaded save is not read-only");
  assert.equal(b.run("RT.broken"), undefined);
  assert.deepEqual(b.errors, [], "nothing was logged by the load or the first draw");
  assert.ok(b.run("!!S.exp"), "the expedition is still under way");
  assert.equal(b.run("S.exp.pos"), a.run("S.exp.pos"), "at the same place");
  assert.equal(b.run("S.seed"), a.run("S.seed"));
  assert.doesNotThrow(() => b.run("render(0)"), "the screen draws");
  b.key("up"); b.key("right"); b.run("save()");
  assert.equal(b.run("RT.readOnly"), undefined, "and it plays on");
  assert.deepEqual(b.errors, []);
});

test("a save with a bonded mibi and notches loads, and the mibi is kept", () => {
  const a = page({}); a.run("newWorld(7)");
  a.run("S.mibis.push({ id: 1, name: 'Dot', sp: 0, born: -9, outings: 3, notches: 2, bonded: true, plays: 0, grownTurn: null }); S.carried = [1]; save();");
  const b = page({ ...a.store });
  assert.equal(b.run("RT.readOnly"), undefined);
  assert.equal(b.run("S.mibis.length"), 1, "the mibi is kept");
  assert.equal(b.run("S.mibis[0].notches"), 2);
  assert.deepEqual(b.errors, []);
});

test("load() logs the cause when it cannot read a save, and still gives a screen", () => {
  const a = page({}); a.run("newWorld(7)");
  const o = JSON.parse(a.store[a.KEY]); o.here = "zz";   // a region in use that the realm does not hold: load() throws
  const b = page({ "mb-save-v8": JSON.stringify(o) });
  assert.equal(b.run("RT.readOnly"), true, "kept read-only, never written");
  assert.ok(b.errors.length >= 1, "the cause was logged (console.error), not swallowed");
  assert.doesNotThrow(() => b.run("render(0)"), "a working screen: Start a new world is offered");
});

test("a kept Companion that cannot be read: the page starts as a new one, says why, and leaves the bytes as they are", () => {
  const BYTES = "{not an identity";
  const p = page({ "mb-companion-A": BYTES });
  assert.match(p.run("COMPANION.id"), /^c[0-9a-z]{12}$/, "a new Companion for this page load");
  assert.equal(p.run("SAVE_KEY"), "mb-save-v8@" + p.run("COMPANION.id"), "and its own save key");
  assert.ok(p.errors.some(e => /kept Companion could not be read/.test(e)), "the read said why: " + p.errors.join(" | "));
  p.run("newWorld(7)");
  assert.ok(p.store[p.run("SAVE_KEY")], "the game plays and saves");
  assert.equal(p.store["mb-companion-A"], BYTES, "the bytes are never written over");
  assert.ok(p.errors.some(e => /Companion could not be kept/.test(e)), "the first write said it was not kept");
  const fresh = page({});
  assert.deepEqual(fresh.errors, [], "control: a first boot logs nothing");
  assert.deepEqual(JSON.parse(fresh.store["mb-companion-A"]), JSON.parse(JSON.stringify(fresh.run("COMPANION"))), "and keeps its new identity with its first write");
});
