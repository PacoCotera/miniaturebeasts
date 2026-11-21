// bug #97: a quick Call at a place's edge lifts the veil on the cells next to that edge in the neighbouring place(s), kept in the save (S.veilPre).
// The owner's spot: patch 2,3 (cell 3 * MW + 2), tile 3,0.
//   node --test prototypes/exploration/tests/call-edge-reveals-cells.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const CELL = 50;   // patch 2,3
const SETUP = `TEST.calm = true; newWorld(7, 2); startExpedition('weather', ${CELL}); S.exp.fog = null; S.exp.storm = null; S.exp.pos = ${CELL}; enterPatch(); RT.caddy = { podHome: true };`;

function setup(x, y) {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run(`{ const P = S.exp.patch; P.x = ${x}; P.y = ${y}; }`);
  return p;
}
const lit = (p, nk, x, y) => p.run(`!!(S.veilPre && S.veilPre[${nk}] && (S.veilPre[${nk}][${y}] >>> ${x} & 1))`);
const call = p => p.run("press('call'); release('call');");

test("a quick Call on his spot (tile 3,0) lifts the cells of the place above next to that edge", () => {
  const p = setup(3, 0);
  p.run("S.exp.reach = [S.exp.patch.key * 1]; for (const d of [-1, 1, -MW, MW, -MW - 1, -MW + 1, MW - 1, MW + 1]) delete S.revealed[S.exp.patch.key * 1 + d];");   // the place above is outside the Probe's reach: the edge still reveals
  call(p);
  const nk = p.run("String(S.exp.patch.key * 1 - MW)");
  const h = p.run(`layout(${nk}).h`);
  assert.equal(lit(p, nk, 3, h - 1), true, "bottom row of the place above, at the player's column");
  assert.equal(p.run(`!!S.revealed[${nk}]`), true, "and its map cell is revealed, so the hold view draws it");
});

test("a Call in a corner lifts cells in all three neighbouring places", () => {
  const p = setup(0, 0);
  p.run("S.exp.reach = [S.exp.patch.key * 1]; for (const d of [-1, 1, -MW, MW, -MW - 1, -MW + 1, MW - 1, MW + 1]) delete S.revealed[S.exp.patch.key * 1 + d];");
  call(p);
  const k = p.run("S.exp.patch.key * 1");
  const W = p.run("MW");
  const up = k - W, left = k - 1, diag = k - W - 1;
  assert.equal(lit(p, up, 0, p.run(`layout(${up}).h`) - 1), true, "above");
  assert.equal(lit(p, left, p.run(`layout(${left}).w`) - 1, 0), true, "left");
  assert.equal(lit(p, diag, p.run(`layout(${diag}).w`) - 1, p.run(`layout(${diag}).h`) - 1), true, "diagonal");
  for (const c of [up, left, diag]) assert.equal(p.run(`!!S.revealed[${c}]`), true, "map cell " + c + " is revealed");
});
