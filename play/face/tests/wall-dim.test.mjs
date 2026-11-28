// The dimmed portraits of the Wall (the tucked, and the partners who cannot breed now) at both size steps: in the goldens every channel of the body is at most round(0.55 x 255) = 140, while an undimmed portrait reaches 255.
//   node --test prototypes/face/tests/wall-dim.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodePNG } from "../../ui/png.mjs";

const png = (n) => decodePNG(readFileSync(new URL(`../golden/vivarium/vivarium-wall-${n}.png`, import.meta.url)));
const top = (img, x, y, w, h) => { let m = 0; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const o = (j * img.width + i) * 4; m = Math.max(m, img.data[o], img.data[o + 1], img.data[o + 2]); } return m; };
const DIM = Math.round(0.55 * 255);
// the body of the portrait in cell (col, row): below the corner where a mark's disc sits, clear of the ring; 100/304 on 98 x 129, 64/304 on 70 x 83 from [196, 84]
const body = (img, c, r, step) => (step === 100 ? top(img, 196 + 98 * c + 12, 84 + 129 * r + 60, 76, 50) : top(img, 196 + 70 * c + 12, 84 + 83 * r + 40, 40, 24));

test("100/304: the tucked and the partners who cannot be picked draw at 0.55, those who can at full", () => {
  const t = png("filter-tucked"); for (let c = 0; c < 4; c++) assert.ok(body(t, c, 0, 100) <= DIM, "tucked " + c);
  const r = png("pair-rest"); assert.ok(body(r, 0, 1, 100) <= DIM, "on a breather"); assert.ok(body(r, 1, 1, 100) <= DIM, "young"); assert.ok(body(r, 0, 0, 100) > DIM, "a partner who can breed");
  const y = png("pair-young"); assert.ok(body(y, 0, 1, 100) <= DIM && body(y, 1, 1, 100) <= DIM);
});
test("64/304: the same in the partner pick of 23", () => {
  const p = png("pair-64"); assert.ok(body(p, 0, 3, 64) <= DIM, "on a breather"); assert.ok(body(p, 1, 3, 64) <= DIM, "tucked"); assert.ok(body(p, 0, 0, 64) > DIM, "a partner who can breed"); assert.ok(body(p, 2, 1, 64) > DIM);
});
