// ui-call-reach-1 (owner #49): the Call is cut by the Probe's reach, not by the place's edge.
//   node --test prototypes/exploration/tests/call-reach-next-door.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

// Stand 2 tiles from the east edge; one buried pod just over the edge inside the Call's circle, one in the same place past the circle.
function setup(nearInReach = true) {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run("{ const P = S.exp.patch, lay = layout(P.key); P.x = lay.w - 2; P.y = lay.h >> 1; }");
  const nk = p.run("String(S.exp.patch.key * 1 + 1)");
  p.run(`S.exp.reach = S.exp.reach.filter(c => c !== ${nk}); ${nearInReach ? `S.exp.reach.push(${nk});` : ""} S.pods = [];`);
  p.run(`{ const P = S.exp.patch, R = CALL_R; S.pods.push({ id: 'in', k: '${nk}', x: 1, y: P.y, sp: 0, h: 1, g: 'grass', how: 'ground' }, { id: 'out', k: '${nk}', x: R + 4, y: P.y, sp: 0, h: 1, g: 'grass', how: 'ground' }); }`);
  return p;
}

test("a Call 2 tiles from the edge shows the find next door inside the Probe's reach, not the one outside it", () => {
  const p = setup();
  p.run("callPlace();");
  assert.equal(p.run("S.pods.find(q => q.id === 'in').h"), 0, "the find inside the Call's circle is shown");
  assert.equal(p.run("S.pods.find(q => q.id === 'out').h"), 1, "the find past the circle stays buried");
  assert.equal(p.run("FX.cue.finds.some(f => f.nk && f.ax === 1)"), true, "and it has its edge tab");
  assert.equal(p.run("FX.cue.finds.length"), 1);
  assert.equal(p.run("findThere(S.exp.patch.key, layout(S.exp.patch.key), FX.cue.finds[0])"), true);
});

test("the Call lifts the neighbour's veil inside its circle, not outside it, and it holds on arrival", () => {
  const p = setup();
  p.run("callPlace();");
  const nk = p.run("String(S.exp.patch.key * 1 + 1)"), y = p.run("S.exp.patch.y");
  assert.equal(p.run(`!!(S.seen.tile[${nk}][${y}] & 1)`), true, "tile 0 next door (1 tile from the Call) is lifted");
  assert.equal(p.run(`!!((S.seen.tile[${nk}][${y}] >>> (CALL_R + 4)) & 1)`), false, "a tile past the circle stays veiled");
  assert.equal(p.run(`!!S.seen.been[${nk}]`), false, "the map still reads the place as never entered (been-in is its own flag)");
  assert.equal(p.run(`!!(S.seen.tile[${nk}][${y}] & 1)`), true, "the same rows a walk would write: they are already there on entering");
});

test("a neighbour outside the Probe's reach keeps its veil", () => {
  const p = setup(false);
  p.run("callPlace();");
  const nk = p.run("String(S.exp.patch.key * 1 + 1)");
  assert.equal(p.run(`!!(S.seen.tile && S.seen.tile[${nk}])`), false);
});

test("a place outside the Probe's reach is not lit", () => {
  const p = setup(false);
  p.run("callPlace();");
  assert.equal(p.run("S.pods.find(q => q.id === 'in').h"), 1, "the Probe does not reach that place: the find stays buried");
});
