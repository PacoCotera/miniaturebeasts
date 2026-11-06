// At a full Essence hold a dew cup keeps its dew, a tuft stays, and a fruit is not pressed: each says so and takes no turn.
// With room, each still gives Essence. The page runs in the same sandbox as stone-full.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import * as A from "../src/atlas.mjs";


const page = () => makePage({ console: "silent", els: true, raf: 1 }).run;

// A world with a patch open on a passable cell, the Essence hold set to `s`.
function setup(s) {
  const run = page(); run("newWorld(7)");
  run(`(() => { const cell = S.revealed.findIndex((v, i) => passable(i) && G.land[i] !== L.WATER);
    startExpedition('weather', cell); const ex = S.exp, key = String(cell); ensureLive(key);
    ex.patch = { key, x: 5, y: 5, dir: 'up', noise: 'creep' }; ex.cargo.s = ${s}; window.T = { key }; })()`);
  return run;
}
const state = run => JSON.parse(run(`JSON.stringify({ s: S.exp.cargo.s, actions: S.exp.actions, carry: S.exp.carry })`));

test("a full hold: the cup keeps its dew and no turn passes", () => {
  const run = setup(20); run(`setFS(T.key, 'cup1', { full: true }); window.F = { id: 'cup1', x: 5, y: 4 }`);
  const before = state(run); run("takeDew(F)");
  assert.deepEqual(state(run), before);
  assert.equal(run("fs(T.key, 'cup1').full"), true);
});

test("with room, the cup gives 1 Essence and empties", () => {
  const run = setup(5); run(`setFS(T.key, 'cup1', { full: true }); window.F = { id: 'cup1', x: 5, y: 4 }`);
  run("takeDew(F)");
  assert.equal(state(run).s, 6);
  assert.equal(run("fs(T.key, 'cup1').full"), false);
});

test("a full hold: a tuft stays where it is and no turn passes", () => {
  const run = setup(20); run(`(() => { const live = curLive(); window.TF = { x: 5, y: 4 }; live.tf = [TF]; })()`);
  const before = state(run); run("takeTuft(TF)");
  assert.deepEqual(state(run), before);
  assert.equal(run("curLive().tf.length"), 1);
});

test("one free place: a fruit is not pressed and stays in hand", () => {
  const run = setup(19); run("S.exp.carry = 'fruit'");
  const before = state(run); run("pressFruit()");
  assert.deepEqual(state(run), before);
  assert.equal(state(run).carry, "fruit");
});

test("with two free places, pressing a fruit gives 2 Essence", () => {
  const run = setup(18); run("S.exp.carry = 'fruit'");
  run("pressFruit()");
  assert.equal(state(run).s, 20);
  assert.equal(state(run).carry, null);
});
