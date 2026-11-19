// The micromap (the reach grid, top-left of the status bar) marks the player's own cell: the cell is the player's orange, whatever the cell's state.
// OWNER 11-17 15:16 (#39) and 17:46 (#53): "the micromap is not showing where i'm standing."
import { test } from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./walk-fixture.mjs";

// the pixels of the player's cell in the grid, and the page's orange index
const hereCell = (run) => run(`(() => {
  scr.px().fill(-1); drawReachGrid(7);
  const ex = S.exp, r = ex.range, n = r * 2 + 1, big = n <= 5, d = big ? 3 : 2, pitch = d + 1, s0 = cxy(ex.start), p = cxy(ex.pos);
  const gw = n * pitch - 1, y0 = HUD_T + Math.max(0, Math.floor((HUD_H - 2 * HUD_T - 1 - gw) / 2));
  const px = 7 + (p.x - (s0.x - r)) * pitch, py = y0 + (p.y - (s0.y - r)) * pitch, out = [];
  for (let y = py; y < py + d; y++) for (let x = px; x < px + d; x++) out.push(scr.px()[y * SCR_W + x]);
  return { out, orange: C.orange };
})()`);

for (const state of ["not explored", "explored"]) {
  test("the micromap marks the player's cell in the player's orange (" + state + ")", () => {
    const f = fixture({ canvas: true }), run = f.run;
    if (state === "explored") run("S.visited[S.exp.pos] = 1; (S.called = S.called || {})[S.exp.pos] = 1;");
    const { out, orange } = hereCell(run);
    assert.ok(out.length >= 4);
    const hits = out.filter(v => v === orange).length;
    assert.ok(hits >= out.length - 1, `the player's cell is orange: ${hits} of ${out.length} pixels`);
  });
}
