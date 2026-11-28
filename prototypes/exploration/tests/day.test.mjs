// The realm's day (walk-design-1 W1, owner 2026-11-19 16:2x): 600 light in six parts (day-pace-build-1), every action spends one (Wait and Call too), End expedition makes camp (the day waits, the world does not turn),
// the night's end turns the world once and the next day starts at dawn; the part of day is named in the bottom line; a save with no day starts at dawn.
//   node --test prototypes/exploration/tests/day.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, DAY_TEXT, partOfDay, clockToNext } from "../src/data/words.mjs";

const page = store => makePage({ gen: 7, store, console: "collect", els: true, canvas: true, raf: "count" });
const start = () => { const p = page({}); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };
const spend = (p, n) => { for (let i = 0; i < n; i++) { p.run("advance('map')"); p.pass(1200); } };

test("six parts of day add up to the day's 600 light, and name the part of every light", () => {
  assert.equal(DAY.light, 600);
  assert.deepEqual(DAY.parts, [["dawn", 50], ["morning", 150], ["midday", 150], ["afternoon", 150], ["dusk", 50], ["night", 50]]);
  assert.equal(DAY.parts.reduce((s, [, n]) => s + n, 0), DAY.light);
  let from = 0; for (const [name, len] of DAY.parts) { assert.equal(partOfDay(from), name); assert.equal(partOfDay(from + len - 1), name); from += len; }
});

test("every action moves the clock one: a step in a place, a Wait, a Call", () => {
  const p = start();
  assert.equal(p.run("S.day.spent"), 0, "the day starts at dawn");
  p.run("advance('map')"); assert.equal(p.run("S.day.spent"), 1);
  p.run("waitTick('map')"); assert.equal(p.run("S.day.spent"), 2, "Wait spends light");
  p.run("S.exp.pos = S.exp.start; enterPatch(S.exp.pos)"); const before = p.run("S.day.spent");
  p.key("call"); assert.equal(p.run("S.day.spent"), before + 1, "Call spends light");
});

test("End expedition makes camp: the world does not turn, the day waits, and the next lift resumes the same light", () => {
  const p = start(); spend(p, 30);
  const turn = p.run("S.turn"), pos = p.run("S.exp.pos");
  p.run("S.ui.lastPos = S.exp.pos; endExpedition('sent')");
  assert.equal(p.run("S.turn"), turn, "no world turn at camp");
  assert.equal(p.run("S.day.spent"), 30, "the light spent stays spent");
  assert.equal(p.run("S.day.camp"), pos, "the camp is where the walk ended");
  p.run("startExpedition('weather', G.spawns[0])");
  assert.equal(p.run("S.day.spent"), 30, "the next lift resumes at the same light");
  assert.equal(p.run("S.turn"), turn);
});

test("the night's end does not end the walk: the world turns once, the next day starts at dawn where you stand", () => {
  const p = start(); const turn = p.run("S.turn"), pos = p.run("S.exp.pos");
  spend(p, DAY.light - 1); assert.ok(p.run("!!S.exp"), "light is left at the last one");
  assert.equal(p.run("S.turn"), turn);
  spend(p, 1);
  assert.ok(p.run("!!S.exp"), "the walk is still open");
  assert.equal(p.run("S.exp.pos"), pos);
  assert.equal(p.run("S.turn"), turn + 1, "the world turned once");
  assert.equal(p.run("S.day.spent"), 0, "the next day starts at dawn");
  assert.deepEqual(p.errors, []);
});

test("dusk and night are news once each, in terms of the night: no amount left, no warning", () => {
  const p = start(); p.run("S.day.spent = " + (DAY.light - 101)); p.run("advance('map')");
  assert.ok(p.run("FX.msg").includes("Dusk. Night in " + DAY.parts[4][1] + "."), p.run("FX.msg"));
  p.run("FX.notes = []; FX.held = []; FX.msg = ''; S.day.spent = " + (DAY.light - 55)); p.run("advance('map', { clock: 10 })");
  assert.ok(p.run("FX.msg").includes("Night. Dawn in " + (DAY.parts[5][1] - 5) + "."), p.run("FX.msg"));
  p.run("FX.notes = []; FX.held = []; FX.msg = ''"); p.run("advance('map')");
  assert.ok(!/Dusk|Night\./.test(p.run("FX.msg")), "once each a day: " + p.run("FX.msg"));
  assert.ok(!/light/i.test(DAY_TEXT.duskNews(25) + DAY_TEXT.nightNews(25) + DAY_TEXT.nightPassed("dawn") + DAY_TEXT.line("night", 5)), "no word of light spent or left");
  assert.ok(p.run("!!S.exp"));
});

test("a scripted four-cell crossing moves the clock 40", () => {
  const p = start(); assert.equal(p.run("S.day.spent"), 0);
  p.run("{ let n = 0; for (let i = 0; i < 40 && n < 4; i++) { const was = S.exp.pos; mapStep(Object.keys(DIRS)[i % 4]); if (S.exp.pos !== was) n++; } S.test_n = n; }");
  assert.equal(p.run("S.test_n"), 4, "four cells crossed"); assert.equal(p.run("S.day.spent"), 40, "ten a cell");
});

test("the bottom line at each of the six parts: the part and how far the night is", () => {
  const p = start(); const ctx = c => (Array.isArray(c) ? c : [c]);
  const want = [[0, "dawn · night in 550"], [80, "morning · night in 470"], [250, "midday · night in 300"], [400, "afternoon · night in 150"], [520, "dusk · night in 30"], [570, "night · dawn in 30"]];
  for (const [spent, text] of want) { p.run("S.day.spent = " + spent); assert.ok(ctx(p.run("lineBase()").ctx).includes(text), text + " in " + JSON.stringify(p.run("lineBase()").ctx)); }
  assert.equal(clockToNext(550), 50);
});

test("a trip that gains nothing does not turn the world: ten trips of 60 light turn it exactly as often as one of 600", () => {
  const camps = start(), day = start();
  for (let t = 0; t < 10; t++) { if (!camps.run("S.exp")) camps.run("startExpedition('weather', G.spawns[0])"); spend(camps, 60); if (camps.run("S.exp")) camps.run("S.ui.lastPos = S.exp.pos; endExpedition('sent')"); }
  spend(day, DAY.light);
  assert.equal(camps.run("S.turn"), day.run("S.turn"), "same world turns for the same light");
  assert.equal(camps.run("S.turn"), 1);
  assert.equal(camps.run("S.totalActions"), 600); assert.equal(day.run("S.totalActions"), 600);
});

test("the camps of one day leave their trails and charged stones for the night's turn", () => {
  const p = start(); spend(p, 10);
  p.run("S.exp.trail.push(5); S.exp.stormCells[7] = 1; S.ui.lastPos = S.exp.pos; endExpedition('sent')");
  assert.ok(p.run("S.day.pend.trail.includes(5)") && p.run("S.day.pend.storm.includes(7)"), "the day holds what the camp left");
  p.run("startExpedition('weather', G.spawns[0])"); spend(p, DAY.light - 11);
  assert.equal(p.run("S.turn"), 0); spend(p, 1); assert.equal(p.run("S.turn"), 1);
  assert.equal(JSON.stringify(p.run("S.day.pend")), JSON.stringify({ trail: [], storm: [] }), "the turn took them");
});

test("the part of day is named in the bottom line's middle: morning and dusk", () => {
  const p = start(); p.run("S.day.spent = 80");
  const ctx = c => (Array.isArray(c) ? c : [c]);
  const line = () => p.run("lineBase()");
  assert.ok(ctx(line().ctx)[0].startsWith("morning · "), "morning on the map: " + ctx(line().ctx)[0]);
  p.run("S.day.spent = 520"); assert.ok(ctx(line().ctx)[0].startsWith("dusk · "), "dusk on the map");
  assert.ok(ctx(line().ctx).includes("dusk · night in 30"), "the day and its night alone are a form too, so the narrowest line still names it");
  p.run("S.exp.pos = S.exp.start; enterPatch(S.exp.pos)"); assert.equal(p.run("S.phase"), "patch");
  assert.ok(ctx(p.run("lineBase()").ctx)[0].startsWith("dusk · "), "dusk in a place");
  p.run("S.day.spent = 5"); assert.ok(ctx(p.run("lineBase()").ctx)[0].startsWith("dawn · "), "dawn");
});

test("a save with no day starts it at dawn; a day in a save is kept", () => {
  const a = start(); spend(a, 12); a.run("save()");
  const kept = page({ ...a.store }); assert.equal(kept.run("S.day.spent"), 12, "the day in the save is kept");
  const o = JSON.parse(a.store[a.KEY]); delete o.day; for (const r of o.regions || []) delete r.day;
  const old = page({ ...a.store, [a.KEY]: JSON.stringify(o) });
  assert.equal(old.run("RT.readOnly"), undefined);
  assert.ok(old.run("!!S.exp"), "a save mid-expedition plays on");
  assert.equal(old.run("S.day.spent"), 0, "its day starts at dawn");
  assert.deepEqual(old.errors, []);
});
