// The realm's day (walk-design-1 W1, owner 2026-11-19 16:2x): 200 light in six parts, every action spends one (Wait and Call too), End expedition makes camp (the day waits, the world does not turn),
// the night's end turns the world once and the next day starts at dawn; the part of day is named in the bottom line; a save with no day starts at dawn.
//   node --test prototypes/exploration/tests/day.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY, DAY_TEXT, partOfDay, clockToNext } from "../src/words.mjs";

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
  spend(p, 199); assert.ok(p.run("!!S.exp"), "light is left at 199");
  assert.equal(p.run("S.turn"), turn);
  spend(p, 1);
  assert.ok(p.run("!!S.exp"), "the walk is still open");
  assert.equal(p.run("S.exp.pos"), pos);
  assert.equal(p.run("S.turn"), turn + 1, "the world turned once");
  assert.equal(p.run("S.day.spent"), 0, "the next day starts at dawn");
  assert.deepEqual(p.errors, []);
});

test("dusk and night are news once each, in terms of the night: no amount left, no warning", () => {
  const p = start(); p.run("S.day.spent = 149"); p.run("advance('map')");
  assert.ok(p.run("FX.msg").includes("Dusk. Night in 25."), p.run("FX.msg"));
  p.run("FX.notes = []; FX.held = []; FX.msg = ''; S.day.spent = 170"); p.run("advance('map', { clock: 10 })");
  assert.ok(p.run("FX.msg").includes("Night. Dawn in 20."), p.run("FX.msg"));
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

test("the map's bottom line says the part of day a step lands in, before each press of a four-cell crossing", () => {
  const p = start(); const ctx = () => { const c = p.run("lineBase()").ctx; return Array.isArray(c) ? c : [c]; };
  p.run("S.day.spent = 105");
  let n = 0, seen = [];
  for (let i = 0; i < 60 && n < 4; i++) {
    const dir = ["right", "down", "left", "up"][i % 4]; p.run(`S.exp.face = ${JSON.stringify(dir)}`);
    const was = p.run("S.exp.pos"), spent = p.run("S.day.spent"), steppable = p.run("canStep(S.exp.pos, S.exp.face) && inRange(aheadCell())");
    if (steppable) { const want = spent + 10 >= 110 ? "afternoon" : "midday"; assert.ok(ctx()[0].startsWith("→ ") && ctx()[0].endsWith(" · arrive " + want), ctx()[0]); seen.push(ctx()[0]); }
    p.run("mapStep(S.exp.face)"); if (p.run("S.exp.pos") !== was) { n++; assert.equal(p.run("S.day.spent"), spent + 10); }
  }
  assert.equal(n, 4); assert.equal(seen.length >= 4, true); assert.equal(p.run("S.day.spent"), 145);
});

test("a step stops once at a warned strike on the cell ahead; the second press crosses", () => {
  const p = start(); let dir = null;
  for (const d of ["right", "down", "left", "up"]) { p.run(`S.exp.face = ${JSON.stringify(d)}`); if (p.run("canStep(S.exp.pos, S.exp.face) && inRange(aheadCell())")) { dir = d; break; } }
  assert.ok(dir, "a steppable neighbour");
  const was = p.run("S.exp.pos"), ahead = p.run("aheadCell()");
  p.run(`S.exp.mstrike = { c: ${ahead}, at: S.exp.actions + 1 }`);
  p.run(`mapStep(${JSON.stringify(dir)})`);
  assert.equal(p.run("S.exp.pos"), was, "the first press does not cross"); assert.equal(p.run("S.day.spent"), 0);
  assert.ok(p.run("FX.msg").includes("Strike warned there"), p.run("FX.msg"));
  const c = p.run("lineBase()").ctx; assert.ok((Array.isArray(c) ? c : [c])[0].includes("Strike warned there"), JSON.stringify(c));
  p.run(`mapStep(${JSON.stringify(dir)})`);
  assert.equal(p.run("S.exp.pos"), ahead, "the second press crosses"); assert.equal(p.run("S.day.spent"), 10);
});

test("the bottom line at each of the six parts: the part and how far the night is", () => {
  const p = start(); const ctx = c => (Array.isArray(c) ? c : [c]);
  const want = [[0, "dawn · night in 175"], [30, "morning · night in 145"], [80, "midday · night in 95"], [115, "afternoon · night in 60"], [160, "dusk · night in 15"], [180, "night · dawn in 20"]];
  for (const [spent, text] of want) { p.run("S.day.spent = " + spent); assert.ok(ctx(p.run("lineBase()").ctx).includes(text), text + " in " + JSON.stringify(p.run("lineBase()").ctx)); }
  assert.equal(clockToNext(175), 25);
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
  const day = () => ctx(line().ctx).find(c => !c.startsWith("→ ") && !c.startsWith("arrive "));   // the arrival form leads on the map when a neighbour can be stepped into
  assert.ok(day().startsWith("morning · "), "morning on the map: " + day());
  p.run("S.day.spent = 160"); assert.ok(day().startsWith("dusk · "), "dusk on the map");
  assert.ok(ctx(line().ctx).includes("dusk · night in 15"), "the day and its night alone are a form too, so the narrowest line still names it");
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
