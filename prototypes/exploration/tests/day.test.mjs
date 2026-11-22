// The realm's day (walk-design-1 W1, owner 2026-11-19 16:2x): 200 light in six parts, every action spends one (Wait and Call too), End expedition makes camp (the day waits, the world does not turn),
// the night's end turns the world once and the next day starts at dawn; the part of day is named in the bottom line; a save with no day starts at dawn.
//   node --test prototypes/exploration/tests/day.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, partOfDay } from "../src/words.mjs";

const page = store => makePage({ gen: 7, store, console: "collect", els: true, canvas: true, raf: "count" });
const start = () => { const p = page({}); p.run("newWorld(7); TEST.calm = true; startExpedition('weather', G.spawns[0]);"); return p; };
const spend = (p, n) => { for (let i = 0; i < n; i++) { p.run("advance('map')"); p.pass(1200); } };

test("six parts of day add up to the day's 200 light, and name the part of every light", () => {
  assert.equal(DAY.light, 200);
  assert.equal(DAY.parts.reduce((s, [, n]) => s + n, 0), DAY.light);
  const at = n => partOfDay(n);
  assert.deepEqual([0, 19, 20, 69, 70, 109, 110, 149, 150, 174, 175, 199].map(at),
    ["dawn", "dawn", "morning", "morning", "midday", "midday", "afternoon", "afternoon", "dusk", "dusk", "night", "night"]);
});

test("every action spends one light: a step, a Wait, a Call", () => {
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
  spend(p, 199); assert.ok(p.run("!!S.exp"), "light is left at 199");
  assert.equal(p.run("S.turn"), turn);
  spend(p, 1);
  assert.ok(p.run("!!S.exp"), "the walk is still open");
  assert.equal(p.run("S.exp.pos"), pos);
  assert.equal(p.run("S.turn"), turn + 1, "the world turned once");
  assert.equal(p.run("S.day.spent"), 0, "the next day starts at dawn");
  assert.deepEqual(p.errors, []);
});

test("dusk and the last light are news; the light number warns from 10 left", () => {
  const p = start(); p.run("S.day.spent = 149"); p.run("advance('map')");
  assert.ok(p.run("FX.msg").includes("Dusk: 50 light left today."), p.run("FX.msg"));
  p.run("FX.notes = []; FX.held = []; FX.msg = ''; S.day.spent = 189"); p.run("advance('map')");
  assert.ok(p.run("FX.msg").includes("Night soon: 10 light left today."), p.run("FX.msg"));
  assert.ok(p.run("!!S.exp"));
});

test("a trip that gains nothing does not turn the world: ten trips of 20 light turn it exactly as often as one of 200", () => {
  const camps = start(), day = start();
  for (let t = 0; t < 10; t++) { if (!camps.run("S.exp")) camps.run("startExpedition('weather', G.spawns[0])"); spend(camps, 20); if (camps.run("S.exp")) camps.run("S.ui.lastPos = S.exp.pos; endExpedition('sent')"); }
  spend(day, 200);
  assert.equal(camps.run("S.turn"), day.run("S.turn"), "same world turns for the same light");
  assert.equal(camps.run("S.turn"), 1);
  assert.equal(camps.run("S.totalActions"), 200); assert.equal(day.run("S.totalActions"), 200);
});

test("the camps of one day leave their trails and charged stones for the night's turn", () => {
  const p = start(); spend(p, 10);
  p.run("S.exp.trail.push(5); S.exp.stormCells[7] = 1; S.ui.lastPos = S.exp.pos; endExpedition('sent')");
  assert.ok(p.run("S.day.pend.trail.includes(5)") && p.run("S.day.pend.storm.includes(7)"), "the day holds what the camp left");
  p.run("startExpedition('weather', G.spawns[0])"); spend(p, 189);
  assert.equal(p.run("S.turn"), 0); spend(p, 1); assert.equal(p.run("S.turn"), 1);
  assert.equal(JSON.stringify(p.run("S.day.pend")), JSON.stringify({ trail: [], storm: [] }), "the turn took them");
});

test("the part of day is named in the bottom line's middle: morning and dusk", () => {
  const p = start(); p.run("S.day.spent = 30");
  const ctx = c => (Array.isArray(c) ? c : [c]);
  const line = () => p.run("lineBase()");
  assert.ok(ctx(line().ctx)[0].startsWith("morning · "), "morning on the map: " + ctx(line().ctx)[0]);
  p.run("S.day.spent = 160"); assert.ok(ctx(line().ctx)[0].startsWith("dusk · "), "dusk on the map");
  assert.ok(ctx(line().ctx).includes("dusk · 40 light"), "the day and its light alone are a form too, so the narrowest line still names it");
  p.run("S.exp.pos = S.exp.start; enterPatch(S.exp.pos)"); assert.equal(p.run("S.phase"), "patch");
  assert.ok(ctx(p.run("lineBase()").ctx)[0].startsWith("dusk · "), "dusk in a place");
  p.run("S.day.spent = 5"); assert.ok(ctx(p.run("lineBase()").ctx)[0].startsWith("dawn · "), "dawn");
});

test("a save with no day starts it at dawn; a day in a save is kept", () => {
  const a = start(); spend(a, 12); a.run("save(true)");
  const kept = page({ ...a.store }); assert.equal(kept.run("S.day.spent"), 12, "the day in the save is kept");
  const o = JSON.parse(a.store[a.KEY]); delete o.day; for (const r of o.regions || []) delete r.day;
  const old = page({ ...a.store, [a.KEY]: JSON.stringify(o) });
  assert.equal(old.run("RT.readOnly"), undefined);
  assert.ok(old.run("!!S.exp"), "a save mid-expedition plays on");
  assert.equal(old.run("S.day.spent"), 0, "its day starts at dawn");
  assert.deepEqual(old.errors, []);
});
