// W6a (Release B): the carry ring is the carry rule's number, the target line's arrow is the last-seen cell. The HUD light strip was cut (the day bar is the one clock).
//   node --test prototypes/exploration/tests/w6a-hud.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";

const start = (seed = 13) => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); return p; };

test("the HUD light strip is gone: no light frame is loaded or drawn, the day bar is the clock", () => {
  const src = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(!/light-lit|light-spend|lightFrame|LIGHT_SPEND|drawLight/.test(src), "no light strip code is left");
  const p = start();
  assert.equal(p.run("typeof lightFrame"), "undefined");
  assert.equal(p.run("typeof drawLight"), "undefined");
});

test("the ring is the carry table's number for her gait: creep 2, walk 4 on plain ground with a steady wild one across the wind", () => {
  const p = start(7);
  // a bare place of plain ground, no wild one: the table's plain row
  p.run("enterPatch(String(S.exp.pos)); S.phase = 'patch';");
  const lay = p.run("curLay()");
  if (lay.cave) return;
  const env = p.run("easeEnvNow()");
  const P = p.run("S.exp.patch");
  const g = env.ground(P.x, P.y), base = (gait) => Math.max(1, { creep: 2, walk: 4 }[gait] + { cover: -1, open: 1, plain: 0 }[g] + (env.rain ? -1 : 0) + (env.fog ? -2 : 0));
  for (const gait of ["creep", "walk"]) { p.run(`S.exp.patch.noise = '${gait}';`); assert.equal(p.run("carryRing().tiles"), Math.min(8, base(gait)), gait + " on " + g); }
});

test("the target line: the arrow points from the explorer to the last-seen cell; cream today, mist on an earlier day; here on her cell; none without a sighting", () => {
  const p = start(7);
  p.run("HUD.ok = true; enterPatch(String(S.exp.pos)); S.phase = 'patch';");
  const P = p.run("S.exp.patch");
  assert.equal(p.run("targetLine()"), null, "no one met: the goal's own words, no arrow");
  p.run("S.named = { 5: 'Bramble' }; S.metIds = ['5'];");
  assert.equal(p.run("targetLine()"), null, "met but never seen since this build: no arrow");
  const key = JSON.stringify(P.key);
  const at = (dx, dy, t) => p.run(`S.seenAt = { '5': { k: ${key}, x: S.exp.patch.x + (${dx}), y: S.exp.patch.y + (${dy}), sp: 0, t: ${t} } }; targetLine()`);
  const cases = [[0, -3, "n"], [3, -3, "ne"], [4, 0, "e"], [2, 2, "se"], [0, 5, "s"], [-3, 3, "sw"], [-6, 0, "w"], [-2, -2, "nw"]];
  for (const [dx, dy, d] of cases) { const t = at(dx, dy, p.run("S.turn")); assert.equal(t.dir, d, `${dx},${dy}`); assert.equal(t.seen, true); }
  const old = at(0, -3, p.run("S.turn") - 1); assert.equal(old.dir, "n"); assert.equal(old.seen, false, "an earlier day is last seen (mist)");
  const here = at(0, 0, p.run("S.turn")); assert.equal(here.dir, "here"); assert.match(here.text, /Bramble/);
  // her live place never decides it: move her somewhere else, the arrow keeps the record
  p.run("S.exp.patch.x += 1;"); const moved = p.run("targetLine()"); assert.equal(moved.dir, "w", "she was last seen one tile west of where the explorer stands now");
});
