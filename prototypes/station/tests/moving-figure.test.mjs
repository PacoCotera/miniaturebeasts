// T-20261018-235: a moving set's figure is measured once per atlas, as the union of the ink bbox (alpha >= 128) over its grounded cells (not the hop's air frame, not the curls),
// its lowest ink row the feet line; the contact shadow is its own atlas and is never in it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setMoving, atlasFigure, cellsOf, movingIds, compose } from "../src/moving.mjs";
import { loadStandSizesFs, unloadStands } from "../tools/stand-layers-fs.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), S01 = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/moving/S01.json"), "utf8"));
test("the figure of a walk atlas is the union over the grounded cells, without the air frame and the curls", () => {
  setMoving({ S01 });
  try {
    const id = movingIds("S01", "adult").walk, cells = cellsOf("S01", "adult", "walk", 144, 152), W = 1 + cells.length * 144, px = new Uint8ClampedArray(W * 152 * 4);
    const ink = (name, x0, y0, x1, y1, a = 255) => { const i = cells.findIndex((c) => c.name === name && !c.mirror); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px[(y * W + 1 + i * 144 + x) * 4 + 3] = a; };
    ink("stand", 30, 40, 100, 140); ink("stand-b1", 31, 38, 99, 140); ink("crouch", 30, 60, 101, 145); ink("air", 0, 0, 143, 20); ink("curl", 0, 100, 143, 151); ink("stand-b2", 10, 10, 20, 20, 127);   // alpha 127 is not ink
    assert.deepEqual(atlasFigure(id, { w: W, h: 152, rgba: () => px }), [30, 38, 72, 108], "x 30..101, y 38..145: the lowest ink row is 145");
  } finally { setMoving({}); }
});

// the atlas at world size: a moving figure stands as tall as the standing one (the view's 54 and 40), reduced offline
test("a moving atlas is reduced offline: the figure's height is the standing figure's, to a pixel", () => {
  loadStandSizesFs(); setMoving({ S01 });
  try {
    for (const [stage, [w, h], target] of [["adult", [144, 152], 54], ["juvenile", [104, 112], 40]]) {
      const blob = (ww, hh) => { const d = new Uint8ClampedArray(ww * hh * 4); for (let y = 6; y < hh - 3; y++) for (let x = 12; x < ww - 12; x++) d.set([90, 80, 70, 255], (y * ww + x) * 4); return { w: ww, h: hh, rgba: () => d, data: d }; };   // a body about as tall as the cell: twice the world size
      const src = { stand: (sp, st, ww, hh) => blob(ww, hh), nap: () => blob(96, 88), shadowInk: { rgb: [0, 0, 0], alpha: 110 } };
      const id = movingIds("S01", stage).walk, atlas = compose(id, src), fig = atlasFigure(id, atlas);
      assert.ok(Math.abs(fig[3] - target) <= 1, `${stage}: the moving figure is ${fig[3]} px tall, the standing one ${target}`);
      assert.ok(fig[1] + fig[3] - 1 <= h - 1 && fig[0] + fig[2] <= w, "in its own cell, feet at the foot");
    }
  } finally { setMoving({}); unloadStands(); }
});
