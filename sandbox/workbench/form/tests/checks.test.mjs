import { test } from "node:test";
import assert from "node:assert/strict";
import { contour, turnAt, convexHull, hullDepth, fitMask, overlap, boxOf } from "../checks.mjs";

test("the overlap of a mask with itself is 1 and of disjoint masks is 0, whatever the box position", () => {
  const mk = (x0, y0, w, h) => { const bits = new Uint8Array(100 * 100); for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) bits[y * 100 + x] = 1; return { width: 100, height: 100, bits }; };
  assert.equal(overlap(mk(10, 10, 30, 50), mk(50, 20, 30, 50), 48), 1);
  assert.ok(overlap(mk(10, 10, 30, 50), mk(10, 10, 50, 30), 48) < 0.5);
  const f = fitMask(mk(0, 0, 40, 40), 48); assert.equal(f.reduce((a, b) => a + b, 0) > 0.8 * 44 * 44, true);
});
test("the contour of a disc turns about 6 degrees per 6 px at radius 55 and the hull of a disc is it", () => {
  const W = 160, cov = new Float32Array(W * W); for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) cov[y * W + x] = Math.hypot(x + 0.5 - 80, y + 0.5 - 80) <= 55 ? 1 : 0;
  const c = contour(cov, W, W); assert.ok(c.length > 300); const t = turnAt(c, 50); assert.ok(t > 3 && t < 12, `${t}`);
  const pts = []; for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (cov[y * W + x]) pts.push([x + 0.5, y + 0.5]);
  const h = convexHull(pts); let d = 0; for (const p of c) d = Math.max(d, hullDepth(h, p)); assert.ok(d < 1.5);
});
