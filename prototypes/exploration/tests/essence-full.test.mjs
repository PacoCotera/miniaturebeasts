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
  run(`(() => { const cell = S.seen.rev.findIndex((v, i) => passable(i) && G.land[i] !== L.WATER);
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

test("one free place: pressing fills to 20, the extra is lost and the line says so", () => {
  const run = setup(19); run("S.exp.carry = 'fruit'");
  run("pressFruit()");
  assert.equal(state(run).s, 20);
  assert.equal(state(run).carry, null);
  assert.equal(run("WORDS.pressLost(CAP)"), "Essence full (20 of 20) · the rest is lost");
});

test("at the cap: a fruit is refused and stays in hand", () => {
  const run = setup(20); run("S.exp.carry = 'fruit'");
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

// The bar (drawCounter) counts a gain up one per 90 ms; after the press at 19 it reaches 20 (the line and the bar agree) within a few frames.
test("the Essence bar goes 19 to 20 with the press and settles on the hold", () => {
  const run = setup(19); run("S.exp.carry = 'fruit'");
  run("NOW = 1000; drawCounter(0, 'xs', 'essence', S.exp.cargo.s)");
  assert.equal(run("CNT.xs.v"), 19);
  run("pressFruit()");
  for (let t = 1100; t <= 1400; t += 100) run(`NOW = ${t}; drawCounter(0, 'xs', 'essence', S.exp.cargo.s)`);
  assert.equal(run("CNT.xs.v"), 20);
  assert.equal(state(run).s, 20);
});

// #80: the find marker sits whole below the goal band (24 px under the HUD), never a sliver under it.
test("a find marker is placed whole below the goal line; other tabs are left alone", () => {
  const run = page();
  assert.equal(run("findTabY({ kind: 'find', cy: 49 })"), 68);
  assert.equal(run("findTabY({ kind: 'find', cy: 300 })"), 300);
  assert.equal(run("findTabY({ kind: '!', cy: 49 })"), 49);
});
