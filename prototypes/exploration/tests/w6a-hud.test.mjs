// W6a (Release B): the HUD light follows the game's part of day, the carry ring is the carry rule's number, the target line's arrow is the last-seen cell.
//   node --test prototypes/exploration/tests/w6a-hud.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, partOfDay } from "../src/words.mjs";

const start = (seed = 13) => { const p = makePage({ gen: 7, store: {}, console: "collect", els: true, canvas: true, raf: "count" }); p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`); return p; };

test("the light frame is lit(6 - part) at rest through a whole day: lit6 at dawn, red lit2 at dusk, lit1 at night, lit0 once the light is spent", () => {
  const p = start();
  let now = 0, last = null;
  const seen = new Set();
  for (let sp = 0; sp <= DAY.light; sp++) {
    p.run(`LIGHT_SPEND.last = ${sp}; LIGHT_SPEND.at = -1e9;`);   // at rest: no act in the last beat
    now += 10000; const fr = p.run(`lightFrame(${sp}, ${now})`);
    const i = DAY.parts.findIndex(([n]) => n === partOfDay(sp));
    assert.equal(fr, sp >= DAY.light ? "light-lit0" : "light-lit" + (6 - i), "light " + sp);
    seen.add(fr); last = fr;
  }
  assert.deepEqual([...seen].sort(), ["light-lit0", "light-lit1", "light-lit2", "light-lit3", "light-lit4", "light-lit5", "light-lit6"]);
  assert.equal(last, "light-lit0");
  p.run("LIGHT_SPEND.last = 0; LIGHT_SPEND.at = -1e9;"); assert.equal(p.run("lightFrame(0, 1e9)"), "light-lit6", "dawn is lit6");
  p.run("LIGHT_SPEND.last = DAY.light - 1; LIGHT_SPEND.at = -1e9;"); assert.equal(p.run("lightFrame(DAY.light - 1, 2e9)"), "light-lit1", "the night is lit1, not yet lit0");
});

test("an act that spends light shows spend(6 - part) for one beat, then the lit frame again", () => {
  const p = start();
  p.run("LIGHT_SPEND.last = null; LIGHT_SPEND.at = -1e9;"); p.run("lightFrame(100, 1000)");   // first sight of the clock: no act yet
  assert.equal(p.run("lightFrame(100, 1100)"), "light-lit5", "morning at rest");
  assert.equal(p.run("lightFrame(101, 1200)"), "light-spend5", "one light spent in the morning: the morning goes half dark");
  assert.equal(p.run("lightFrame(101, 1200 + HUD_BEAT - 1)"), "light-spend5", "for the whole beat");
  assert.equal(p.run("lightFrame(101, 1200 + HUD_BEAT)"), "light-lit5", "then back");
  p.run("lightFrame(525, 5000)");
  assert.equal(p.run("lightFrame(526, 5100)"), "light-spend2", "dusk spends from the red frame");
  p.run("LIGHT_SPEND.last = 574; LIGHT_SPEND.at = -1e9;"); assert.equal(p.run("lightFrame(574, 9000)"), "light-lit1");
  assert.equal(p.run("lightFrame(575, 9100)"), "light-spend1", "night");
  assert.equal(p.run("lightFrame(DAY.light, 20000)"), "light-lit0", "the light spent is lit0, never a spend frame");
});

test("a scripted day on seed 13 (Wait after Wait): a spend frame on each act, the lit frame at rest, red from dusk, lit0 at the end", () => {
  const p = start(13);
  p.run("LIGHT_SPEND.last = null; NOW = 1000; lightFrame(S.day.spent, NOW);");
  let acts = 0, spends = 0, red = null, prev = p.run("S.day.spent");
  for (let k = 0; k < 700 && p.run("!!S.exp && S.day.spent < DAY.light"); k++) {
    p.run("NOW += 2000; waitTick('map');");
    const sp = p.run("S.day.spent"); if (sp <= prev) { p.run("lightFrame(S.day.spent, NOW)"); prev = sp; continue; }   // a new day: the page draws every frame, so the clock is read at once
    if (sp >= DAY.light) { p.run("lightFrame(S.day.spent, NOW)"); prev = sp; continue; }   // the act that spends the last light shows lit0
    acts++; const fr = p.run("lightFrame(S.day.spent, NOW)"), i = DAY.parts.findIndex(([n]) => n === partOfDay(prev));
    if (fr === "light-spend" + (6 - i)) spends++; else console.log("MISS", prev, sp, fr, k);
    p.run("NOW += 600;"); const rest = p.run("lightFrame(S.day.spent, NOW)"), j = DAY.parts.findIndex(([n]) => n === partOfDay(sp));
    assert.equal(rest, sp >= DAY.light ? "light-lit0" : "light-lit" + (6 - j), "at rest after light " + sp);
    if (partOfDay(sp) === "dusk" && red == null) red = rest;
    prev = sp;
  }
  assert.ok(acts > 100, "the day ran: " + acts + " acts");
  assert.equal(spends, acts, "a spend frame after every act that spent light");
  assert.equal(red, "light-lit2", "dusk is the first red frame");
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
