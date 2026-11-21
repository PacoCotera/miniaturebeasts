// edge-glint-1 (owner bug 2026-11-20): the gold edge tab keeps pointing at one target until reached; walking to it arrives at the buried pod.
//   node --test prototypes/exploration/tests/edge-glint-pinned.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const SETUP = "TEST.calm = true; newWorld(7, 2); startExpedition('weather', 176); S.exp.fog = null; S.exp.storm = null; S.exp.pos = 176; enterPatch(); RT.caddy = { podHome: true };";

test("the tab's target is the buried pod's own tile and holds while walking toward it", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run(SETUP);
  p.run("{ const P = S.exp.patch, k = P.key, lay = layout(k); S.exp.callsAt = { [lay.cell]: 1 }; S.veil[k] = new Array(PH).fill(0);"
    + " globalThis.__tx = Math.min(lay.w - 2, P.x + 20); globalThis.__ty = P.y;"
    + " S.pods = [{ id: 'z', k, x: __tx, y: __ty, sp: 0, h: 1, g: 'grass', how: 'ground' }]; RT.lead = null; RT.leadPin = null; }");
  const way = () => p.run("leadWay(S.exp.patch, layout(S.exp.patch.key))");
  const w0 = way();
  assert.ok(w0, "a buried pod here: a way");
  assert.equal(w0.tx, p.run("__tx"), "the target is the pod's own tile (x)");
  assert.equal(w0.ty, p.run("__ty"), "the target is the pod's own tile (y)");
  // walk toward it, then past its row: the target does not slide or flip to another direction
  for (const [dx, dy] of [[5, 0], [3, 8], [2, -16]]) {
    p.run(`{ const P = S.exp.patch, lay = layout(P.key); P.x = Math.max(0, Math.min(lay.w - 1, P.x + ${dx})); P.y = Math.max(0, Math.min(lay.h - 1, P.y + ${dy})); S.exp.actions++; }`);
    const w = way();
    assert.ok(w && w.tx === w0.tx && w.ty === w0.ty, "same target after the step");
    assert.equal(w.dir, w0.dir, "same pointing word");
  }
  // reached: the pod is taken, the pin lets go
  p.run("S.pods = []; RT.lead = null;");
  const w1 = way();
  assert.ok(!w1 || w1.tx === undefined, "a taken pod is not pointed at any more");
});
