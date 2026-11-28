// The day bar (day-bar-1, owner 2026-11-23): a 66x17 window (glass 64) on the six pictures, 1 px per light, the strip at the day's light spent (mod 200); the segment under the marker is dayPart().
//   node --test prototypes/exploration/tests/day-bar.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, partOfDay } from "../src/data/words.mjs";

const p0 = () => makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" });
const start = () => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };

test("the segments are the DAY table at 1 px per light: the segment under the marker is dayPart() at every light 0-199", () => {
  assert.deepEqual(DAY.parts.map(p => p[1]), [50, 150, 150, 150, 50, 50]);   // day-pace-build-1: 600 light, drawn at 1 px per 3 light (the 200 px loop)
  assert.equal(p0().run("DB.K"), 200 / DAY.light);
  const bounds = []; let at = 0; for (const [n, len] of DAY.parts) { bounds.push([n, at, at + len]); at += len; }
  for (let sp = 0; sp < DAY.light; sp++) { const seg = bounds.find(([, a, b]) => sp >= a && sp < b)[0]; assert.equal(seg, partOfDay(sp), "light " + sp); }
});

test("the strip is at the light spent, a step glides its true distance, and the position stays under the loop", () => {
  const p = start();
  p.run("RM.matches = false; S.day.spent = 37; DB.pos = null; NOW = 1000;"); assert.equal(p.run("dayBarPos()"), 37, "starts where the day is");
  p.run("S.day.spent = 47; NOW = 2000;"); p.run("dayBarPos()");
  assert.equal(p.run("DB.dur"), 404, "a 10 light step glides 10 px over min(600, 260+16*9)");
  assert.equal(p.run("DB.tgt - DB.from"), 10);
  p.run("NOW = 2000 + 404;"); assert.equal(p.run("dayBarPos()"), 47, "it comes to rest on the light spent");
  p.run("S.day.spent = 48; DB.wait = 1; NOW = 3000;"); p.run("dayBarPos()"); assert.equal(p.run("DB.dur"), 450, "a Wait glides 450 ms");
  p.run("NOW = 4000; dayBarPos(); S.day.spent = 49; NOW = 5000;"); p.run("dayBarPos()"); assert.equal(p.run("DB.dur"), 260, "any other action 260 ms");
  p.run("NOW = 6000; dayBarPos(); S.day.spent = 5; NOW = 7000;"); p.run("dayBarPos()");
  assert.equal(p.run("DB.tgt - DB.from"), DAY.light - 44, "the day's end wraps: forward only, 49 -> 5 is the loop less 44 light");
  assert.equal(p.run("DB.dur"), 600, "capped at 600 ms");
  p.run("NOW = 8000;"); assert.equal(p.run("dayBarPos()"), 5);
});

test("reduced motion: the strip is instant", () => {
  const p = start();
  p.run("RM.matches = false; S.day.spent = 10; DB.pos = null; NOW = 1000; dayBarPos(); S.day.spent = 40; NOW = 1001; RM.matches = true;");
  assert.equal(p.run("dayBarPos()"), 40);
  assert.equal(p.run("DB.dur"), 0);
});

test("day-bar-2: the current part swaps at the glide's midpoint (130 ms of 260); instant with reduced motion", () => {
  const p = start();
  p.run("RM.matches = false; S.day.spent = 49; DB.pos = null; NOW = 1000; dayBarPos();");
  assert.equal(p.run("partOfDay(DB.shown)"), "dawn");
  p.run("S.day.spent = 50; NOW = 2000;"); p.run("dayBarPos()");
  assert.equal(p.run("DB.dur"), 260);
  assert.equal(p.run("partOfDay(DB.shown)"), "dawn", "at the start of the glide the old part is still current");
  p.run("NOW = 2100;"); p.run("dayBarPos()"); assert.equal(p.run("partOfDay(DB.shown)"), "dawn", "100 ms: before the midpoint");
  p.run("NOW = 2131;"); p.run("dayBarPos()"); assert.equal(p.run("partOfDay(DB.shown)"), "morning", "after the midpoint: the new part");
  p.run("NOW = 3000; dayBarPos(); RM.matches = true; S.day.spent = 75; NOW = 3001;"); p.run("dayBarPos()");
  assert.equal(p.run("DB.shown"), 75, "reduced motion: instant");
});
