// owner-notes-fix-105 (#105, #106): a set-out never ends seconds in. A camp made late in the day, and a night's end, each leave a set-out with at least 30 actions before any night's end.
//   node --test prototypes/exploration/tests/set-out-light.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = () => makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
const start = () => { const p = page(); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };
const spend = (p, n) => { for (let i = 0; i < n && p.run("!!S.exp"); i++) { p.run("advance('map')"); p.pass(1200); } };
// actions the new set-out gets before the night's end ends it
const runLength = (p, max = 400) => { const turn = p.run("S.turn"); let n = 0; while (p.run("!!S.exp") && n < max) { spend(p, 1); n++; } return { n, turned: p.run("S.turn") > turn }; };

test("a camp made late in the day: the next set-out runs the night's end first and has a whole day", () => {
  const p = start(); const turn = p.run("S.turn");
  p.run("S.day.spent = 590; S.ui.lastPos = S.exp.pos; endExpedition('sent')");
  assert.equal(p.run("S.turn"), turn, "the camp turns nothing");
  p.run("startExpedition('weather', G.spawns[0])");
  assert.ok(p.run("!!S.exp"), "the set-out lifts");
  assert.equal(p.run("S.turn"), turn + 1, "the night's end ran first: the world turned once");
  assert.equal(p.run("S.day.spent"), 0, "the day starts at dawn");
  assert.equal(p.run("S.exp.actions"), 0);
  assert.equal(p.run("S.phase"), "map");
  assert.ok(p.run("FX.msg").includes("A new day"), "the bottom line says so: " + p.run("FX.msg"));
  const r = runLength(p);
  assert.ok(r.n >= 30, "ran " + r.n + " actions");
  assert.deepEqual(p.errors, []);
});

test("the night does not end the walk: it stays open, the world turned once, a new day at the same place", () => {
  const p = start(); const turn = p.run("S.turn"), pos = p.run("S.exp.pos");
  spend(p, 600);
  assert.ok(p.run("!!S.exp"), "the walk is still open"); assert.equal(p.run("S.turn"), turn + 1);
  assert.equal(p.run("S.day.spent"), 0); assert.equal(p.run("S.exp.pos"), pos);
  assert.ok(p.run("FX.msg").includes("Night passed. A new day: dawn."), p.run("FX.msg"));
  const r = runLength(p, 60);
  assert.equal(r.n, 60, "no end on its own"); assert.deepEqual(p.errors, []);
});

test("a camp made in the afternoon sets out again at the same light, with no night's end", () => {
  const p = start(); const turn = p.run("S.turn");
  p.run("S.day.spent = 400; S.ui.lastPos = S.exp.pos; endExpedition('sent')");
  p.run("startExpedition('weather', G.spawns[0])");
  assert.equal(p.run("S.day.spent"), 400); assert.equal(p.run("S.turn"), turn);
});
