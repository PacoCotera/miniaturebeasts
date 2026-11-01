// The head in the stand view (AD review): its silhouette's breadth and how far the far eye sits inside it. Both read the head's own field (skull, muzzle,
// nose, carved sockets) in the house camera, so they need no body and are cheap enough for a clamp to call. Plain JavaScript, no node: imports.
import { Rz, Ry, Rx, mul3, frameOf, toLocal, dot3 } from "./sdf.mjs";
import { march } from "./sdf.mjs";
import { buildHead } from "./head.mjs";
import { cameraBasis } from "./render.mjs";

const rad = (d) => (d * Math.PI) / 180;
// the head alone, at the origin, turned by the pose
export function headWorld(house, plan, kinds, fp, pose) {
  const head = buildHead(house, plan, kinds, fp), R = mul3(Rz(rad(pose.headYawSigned)), mul3(Ry(-rad(pose.pitch)), Rx(rad(pose.rollSigned)))), hf = frameOf([0, 0, 0], R);
  return { head, hf, d: (x, y, z) => { const q = toLocal(hf, x, y, z); return head.d(q[0], q[1], q[2]); } };
}
const hitAt = (d, B, a, b) => march(d, B.right[0] * a + B.up[0] * b + B.toward[0] * 3, B.right[1] * a + B.up[1] * b + B.toward[1] * 3, B.right[2] * a + B.up[2] * b + B.toward[2] * 3, -B.toward[0], -B.toward[1], -B.toward[2], 0, 6, 0.002, 60) >= 0;
const world = (hf, v) => { const R = hf.R; return [R[0] * v[0] + R[1] * v[1] + R[2] * v[2], R[3] * v[0] + R[4] * v[1] + R[5] * v[2], R[6] * v[0] + R[7] * v[1] + R[8] * v[2]]; };

// the far eye's margin: the least distance, in H, from the eye's outer ring to the head's silhouette (radially outward on the screen)
export function farEyeInside(hw, camera, detail = null) {
  const B = cameraBasis(camera), { head, hf, d } = hw, eyes = head.eyes;
  const facing = eyes.map((e) => dot3(world(hf, e.n), B.toward)), far = facing[0] < facing[1] ? 0 : 1, e = eyes[far];
  const cw = world(hf, e.c), ca = dot3(cw, B.right), cb = dot3(cw, B.up);
  let best = Infinity;
  for (let k = 0; k < 24; k++) {
    const th = (k / 24) * 2 * Math.PI, v = [e.lat[0] * Math.cos(th) + e.up[0] * Math.sin(th), e.lat[1] * Math.cos(th) + e.up[1] * Math.sin(th), e.lat[2] * Math.cos(th) + e.up[2] * Math.sin(th)];
    const base = [e.c[0] + v[0] * e.Reye, e.c[1] + v[1] * e.Reye, e.c[2] + v[2] * e.Reye]; // the ring lies on the head's surface: slide the point along the normal onto it
    let lo = -0.25, hi = 0.25; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (head.d(base[0] + e.n[0] * m, base[1] + e.n[1] * m, base[2] + e.n[2] * m) < 0) lo = m; else hi = m; }
    const pw = world(hf, [base[0] + e.n[0] * lo, base[1] + e.n[1] * lo, base[2] + e.n[2] * lo]), a = dot3(pw, B.right), b = dot3(pw, B.up), dx = a - ca, dy = b - cb, l = Math.hypot(dx, dy);
    if (l < 1e-6) continue;
    let t = 0; while (t < 0.5 && hitAt(d, B, a + (dx / l) * t, b + (dy / l) * t)) t += 0.01;
    best = Math.min(best, t); if (detail) detail.push([k, +t.toFixed(3), +a.toFixed(3), +b.toFixed(3)]);
  }
  return best;
}
// the head's breadth on screen in H, from the front of the muzzle or cheek to the nape: the extents of the head's silhouette
export function headBreadth(hw, camera) {
  const B = cameraBasis(camera), d = hw.d, n = 70, L = 1.7; let lo = Infinity, hi = -Infinity, rowLo = 0, rowHi = 0;
  for (let j = 0; j < n; j++) { const b = -0.9 + (1.8 * (j + 0.5)) / n; for (let i = 0; i < n; i++) { const a = -L + (2 * L * (i + 0.5)) / n; if (hitAt(d, B, a, b)) { if (a < lo) { lo = a; rowLo = b; } if (a > hi) { hi = a; rowHi = b; } } } }
  const cell = (2 * L) / n, rows = (r0) => Array.from({ length: 21 }, (_, i) => r0 - 0.1 + i * 0.01);
  const left = Math.min(...rows(rowLo).map((b) => { if (!hitAt(d, B, lo, b)) return Infinity; let h = lo, m = lo - cell; for (let i = 0; i < 9; i++) { const c = (m + h) / 2; if (hitAt(d, B, c, b)) h = c; else m = c; } return h; }));
  const right = Math.max(...rows(rowHi).map((b) => { if (!hitAt(d, B, hi, b)) return -Infinity; let m = hi, h = hi + cell; for (let i = 0; i < 9; i++) { const c = (m + h) / 2; if (hitAt(d, B, c, b)) m = c; else h = c; } return m; }));
  return right - left;
}
