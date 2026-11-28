// The Library's face pictures are cut from the kinds' painted stands (release 21d): none of the twenty kinds, at either stage and every size, is the flat stand-in square, and the window holds the figure.
//   node --test prototypes/station/tests/face-painted.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG } from "../../ui/png.mjs";
import { readIndex } from "../../ui/tools/index-io.mjs";
import { RGB, C } from "../src/pixels.mjs";
import { facePicture, windowOf } from "../src/face-pictures.mjs";
import { setJuvenileFacing, juvenileMirrored, mirrorRGBA, adultFacing, youngFacing } from "../src/facing.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../../ui/assets/masters");
const index = readIndex(root), lib = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/library.json"), "utf8")).faces;
setJuvenileFacing(index.juvenileFacing);
const load = (id) => { const d = decodePNG(readFileSync(path.join(root, index.masters[id].file))); return { w: d.width, h: d.height, rgba: juvenileMirrored(id) ? mirrorRGBA(d.data, d.width, d.height) : d.data }; };
const rgb = (n) => RGB[C[n]], stone = RGB[C.stone];
const KINDS = Array.from({ length: 20 }, (_, i) => "S" + String(i + 1).padStart(2, "0"));

test("every kind's face, adult and young, at every size, is cut from its painted stand: never the stand-in square, the window full of figure", () => {
  for (const k of KINDS) for (const stage of ["adult", "juvenile"]) {
    const adult = load(`mibi-adult-${k}-304x312`), pm = stage === "juvenile" ? load(`mibi-juvenile-${k}-304x312`) : adult, win = windowOf(k, stage, lib, adult, pm, adultFacing(k) === youngFacing(k));
    assert.ok(win && win[2] >= 40, `${k} ${stage}: a window`);
    let inFigure = 0; for (let y = 0; y < win[2]; y++) for (let x = 0; x < win[2]; x++) { const sx = win[0] + x, sy = win[1] + y; if (sx >= 0 && sy >= 0 && sx < 304 && sy < 312 && pm.rgba[(sy * 304 + sx) * 4 + 3] >= 128) inFigure++; }
    assert.ok(inFigure / (win[2] * win[2]) >= 0.35, `${k} ${stage}: the window holds the figure (${(inFigure / (win[2] * win[2])).toFixed(2)})`);
    for (const size of lib.sizes) {
      const p = facePicture({ species: k, stage, size, faded: false, art: pm.rgba, window: win }, lib, rgb);
      assert.equal(p.standIn, false, `${k} ${stage} ${size}: not the stand-in`);
      let flat = 0; for (let i = 0; i < size * size; i++) if (p.rgba[i * 4] === stone[0] && p.rgba[i * 4 + 1] === stone[1] && p.rgba[i * 4 + 2] === stone[2]) flat++;
      assert.ok(flat < size * size * 0.15, `${k} ${stage} ${size}: no flat stone square (${flat} stone pixels)`);
    }
  }
});
test("a kind with no window and no stand still gets the labelled stand-in, so a golden can refuse it", () => {
  assert.equal(facePicture({ species: "S99", stage: "adult", size: 56, faded: false }, lib, rgb).standIn, true);
});
