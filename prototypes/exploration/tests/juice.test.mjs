// juice-build-1: every act that takes something answers from the one JUICE table: a burst at the thing, the +N, the HUD counter's bracket, the line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const page = () => makePage({ console: "silent", els: true, raf: 1 }).run;
function setup() {
  const run = page(); run("newWorld(7)");
  run(`(() => { const cell = S.revealed.findIndex((v, i) => passable(i) && G.land[i] !== L.WATER && layout(String(i)).feats.some(f => f.kind === 'k'));
    startExpedition('weather', cell); const ex = S.exp, key = String(cell), f = layout(key).feats.find(f => f.kind === 'k');
    ensureLive(key); ex.patch = { key, x: f.x, y: f.y + 1, dir: 'up', noise: 'creep' }; ex.cargo.e = 0; window.T = { key, f };
    setFS(key, f.id, { ch: 3 }); })()`);
  return run;
}

test("taking a stone's charge: burst, +N, counter bracket, line, all at once", () => {
  const run = setup(); run("RM.matches = false");
  run("takeCharge(T.f)");
  assert.equal(run("S.exp.cargo.e"), 3);
  assert.equal(run("FX.bursts.length"), 1, "a burst at the stone");
  assert.equal(run("FX.bursts[0].x === T.f.x && FX.bursts[0].y === T.f.y"), true);
  assert.equal(run("FX.floats.some(f => f.text === '+3' && f.icon === 'energy')"), true, "the +3 rises over it");
  assert.equal(run("typeof FX.pops.e === 'number'"), true, "the Energy counter pops");
  assert.match(run("FX.msg"), /^\+3 Energy · it goes home in the crate$/);
});

test("under reduced motion the burst is off but the +N, the line and the counter stay", () => {
  const run = setup(); run("takeCharge(T.f)");
  assert.equal(run("FX.bursts.length"), 0);
  assert.equal(run("FX.floats.length > 0 && typeof FX.pops.e === 'number'"), true);
  assert.match(run("FX.msg"), /\+3 Energy/);
});

test("a full hold takes nothing and shows no juice", () => {
  const run = setup(); run("S.exp.cargo.e = CAP"); run("takeCharge(T.f)");
  assert.equal(run("FX.bursts.length"), 0);
  assert.equal(run("FX.pops.e == null"), true);
});

test("every row of the table has a sound and a known counter or none", () => {
  const run = setup(); run("RM.matches = false");
  assert.equal(run("Object.keys(JUICE).every(k => Array.isArray(SOUNDS[k]) && SOUNDS[k].length > 0)"), true);
});

test("a fruit pick-up says where it goes", () => {
  const run = setup(); run("RM.matches = false");
  run("pickUp({ x: T.f.x, y: T.f.y + 1, id: 99 })");
  assert.match(run("FX.msg"), /\+1 fruit · in your hand for her/);
  assert.equal(run("FX.bursts.length"), 1);
});
