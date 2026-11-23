// The day bar (day-bar-1, owner 2026-11-23): a 66x17 window (glass 64) on the six pictures, 1 px per light, the strip at the day's light spent (mod 200); the segment under the marker is dayPart().
//   node --test prototypes/exploration/tests/day-bar.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, partOfDay } from "../src/words.mjs";

const start = () => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };

test("the segments are the DAY table at 1 px per light: the segment under the marker is dayPart() at every light 0-199", () => {
  assert.deepEqual(DAY.parts.map(p => p[1]), [20, 50, 40, 40, 25, 25]);
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
  assert.equal(p.run("DB.tgt - DB.from"), 156, "the day's end wraps: forward only, 49 -> 5 is 156 light round the loop");
  assert.equal(p.run("DB.dur"), 600, "capped at 600 ms");
  p.run("NOW = 8000;"); assert.equal(p.run("dayBarPos()"), 5);
});

test("reduced motion: the strip is instant", () => {
  const p = start();
  p.run("RM.matches = false; S.day.spent = 10; DB.pos = null; NOW = 1000; dayBarPos(); S.day.spent = 40; NOW = 1001; RM.matches = true;");
  assert.equal(p.run("dayBarPos()"), 40);
  assert.equal(p.run("DB.dur"), 0);
});
