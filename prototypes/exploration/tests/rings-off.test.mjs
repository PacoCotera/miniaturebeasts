// rings-off-140 (owner #140): the place view draws no carry ring (the hearing circle), and the map draws no amber dashed reach square on the start pick.
//   node --test prototypes/exploration/tests/rings-off.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage, PAGE } from "./page-harness.mjs";

// The harness has no tile atlas, so the 48 px place view (where the ring was drawn) cannot run here: the ring is checked by its drawing being gone, its rule being kept.
test("#140 the place view draws no carry ring: no drawing function, no call, the rule's measure kept", () => {
  const p = makePage({ console: "silent", canvas: true });
  assert.equal(p.run("typeof drawCarryRing"), "undefined", "the ring's drawing function is gone");
  assert.ok(!/drawCarryRing\s*\(/.test(PAGE), "nothing calls it");
  assert.ok(!/HUD_ART\[\s*'ring-'/.test(PAGE), "nothing draws a ring frame");
  assert.equal(p.run("typeof carryRing"), "function", "the rule's number (carryRing, carryAt, heard) is untouched");
});

test("#140 the start pick on the map draws no amber dashed reach square", () => {
  const p = makePage({ console: "silent", canvas: true });
  p.run("TEST.calm = true; newWorld(7, 2); ensureMap();");
  const cells = p.run("[...Array(MW * MH).keys()].filter(c => { const q = cxy(c); return q.x >= 3 && q.y >= 3 && q.x < MW - 3 && q.y < MH - 3; }).slice(0, 40)");
  p.run(`S.ui.cur = ${cells[0]}; S.ui.type = 'weather'; scr.px().fill(-1); drawMap('place', 0);`);
  const g = p.run("(() => { const s0 = cxy(S.ui.cur), r = TIER[S.tier].range; return { x0: MAP_X + (s0.x - r) * CELL, y0: MAP_Y + (s0.y - r) * CELL, x1: MAP_X + (s0.x + r + 1) * CELL - 2, y1: MAP_Y + (s0.y + r + 1) * CELL - 2 }; })()");
  const am = p.run("HEX.indexOf(HEX[C.amber])"), W = p.run("scr.width"), data = p.run("scr").px();
  // the old square was dashes 3 px long every 6 px along each side of the range: look for amber along the top edge and the left edge
  const row = (y, x0, x1) => { let n = 0; for (let x = x0; x <= x1; x++) if (data[y * W + x] === am) n++; return n; };
  const col = (x, y0, y1) => { let n = 0; for (let y = y0; y <= y1; y++) if (data[y * W + x] === am) n++; return n; };
  assert.ok(row(g.y0, g.x0, g.x1) < 4 && row(g.y0 + 1, g.x0, g.x1) < 4, "no dashed amber line along the top of the reach square");
  assert.ok(col(g.x0, g.y0, g.y1) < 4 && col(g.x0 + 1, g.y0, g.y1) < 4, "no dashed amber line down the left of the reach square");
});
