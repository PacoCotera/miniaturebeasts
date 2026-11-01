// The profile measures of plan A (AD fix round 1, must-fix 3): how far the chin overhangs the chest, and the nape dip between the crown and the back. They read the
// scene's own fields in the body's side plane (y = 0), so they are rules over the built form, not constants: the bands are in the house file (R-chin, R-nape).
// Plain JavaScript, no node: imports.
import { march } from "./sdf.mjs";
import { cameraBasis } from "./render.mjs";

// the front-most x of a field f at height z in the plane y = 0, searching forward from an inside point x0; null when x0 is not inside
function frontAt(f, z, x0) {
  if (f(x0, 0, z) >= 0) return null;
  let a = x0, b = x0 + 2.5; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (f(m, 0, z) < 0) a = m; else b = m; }
  return (a + b) / 2;
}
// the highest z of a field at x in the plane y = 0: march down from above
function topAt(f, x, zFrom) { const t = march(f, x, 0, zFrom, 0, 0, -1, 0, zFrom + 0.5, 0.0015, 120, 0.9); return t < 0 ? null : zFrom - t; }

// chin overhang: the head's front minus the chest's front, at the jaw's height (jaw-height-of-H above the head's bottom), in H. The chest's front is taken at the
// same height, or at the nearest height the chest reaches when it does not rise that high (it then does not stand in front of the chin at all).
export function chinOverhang(scene, jawHeight = 0.12) {
  const { head, kc } = scene, c = scene.extra.chest, z = kc[2] - 0.5 + jawHeight, hf = frontAt(scene.parts.head, z, kc[0]);
  if (hf === null) return null;
  const zc = Math.min(Math.max(z, c.c[2] - c.r[2] * 0.9), c.c[2] + c.r[2] * 0.9), cf = frontAt(scene.parts.chest, zc, c.c[0]);
  return cf === null ? null : hf - cf;
}
// nape step: the profile of the core (head and body, no headgear) in the body's side plane. The back falls from the crown (AD fix round 2: the back rail), so the head has an
// outline of its own: the step is how far the outline has fallen from the crown at `behind` (H) behind the skull's rear edge
export function napeStep(scene, behind = 0.3) {
  const f = scene.parts.core, S = scene.S, xs = [], zs = [];
  for (let x = scene.kc[0] + 0.5; x >= scene.kc[0] - 2.2; x -= 0.02) { xs.push(x); zs.push(topAt(f, x, S + 0.6) ?? 0); }
  let ci = 0; for (let i = 0; i < zs.length && xs[i] > scene.kc[0] - 0.45; i++) if (zs[i] > zs[ci]) ci = i; // the crown: the highest point over the head
  const rear = scene.kc[0] - scene.head.D / 2 - behind; let bi = ci; for (let i = ci; i < zs.length; i++) if (xs[i] >= rear) bi = i;
  return Math.max(0, zs[ci] - zs[bi]);
}

// The back line in the stand view (AD fix round 2, ruling 1a): the top of the core silhouette (head and body, no headgear) in the house camera, at fractions of its width
// from the front, in stature units, where the stature is the screen height from the floor to the crown. The master Loika: 0.79, 0.72 and 0.54 S at 0.7, 0.85 and 0.95.
export function backLine(scene, camera, fractions = [0.7, 0.85, 0.95], { n = 150 } = {}) {
  const B = cameraBasis(camera), f = scene.parts.core ?? scene.d, bb = scene.bounds, c = [0, 1, 2].map((i) => (bb.lo[i] + bb.hi[i]) / 2), R = Math.hypot(bb.hi[0] - bb.lo[0], bb.hi[1] - bb.lo[1], bb.hi[2] - bb.lo[2]) / 2;
  const hit = (a, b) => march(f, c[0] + B.right[0] * a + B.up[0] * b + B.toward[0] * R, c[1] + B.right[1] * a + B.up[1] * b + B.toward[1] * R, c[2] + B.right[2] * a + B.up[2] * b + B.toward[2] * R, -B.toward[0], -B.toward[1], -B.toward[2], 0, 2 * R, 0.003, 80) >= 0;
  // the extents: columns over the screen, the top of each by a coarse scan down and a bisection
  const cell = (2 * R) / n, tops = [];
  for (let i = 0; i < n; i++) {
    const a = -R + (i + 0.5) * cell; let top = null;
    for (let j = n - 1; j >= 0; j--) { const b = -R + (j + 0.5) * cell; if (hit(a, b)) { let lo = b, hi = b + cell; for (let q = 0; q < 8; q++) { const m = (lo + hi) / 2; if (hit(a, m)) lo = m; else hi = m; } top = lo; break; } }
    tops.push(top);
  }
  const cols = tops.map((t, i) => (t === null ? null : i)).filter((i) => i !== null), i0 = cols[0], i1 = cols[cols.length - 1], crown = Math.max(...tops.filter((t) => t !== null));
  // the floor: the lowest hit on the left, middle and right (the feet): the creature stands at world z 0, so the screen height of z 0 under each column is the same on all of them
  const floorB = (a) => { for (let j = 0; j < n; j++) { const b = -R + (j + 0.5) * cell; if (hit(a, b)) { let lo = b - cell, hi = b; for (let q = 0; q < 8; q++) { const m = (lo + hi) / 2; if (hit(a, m)) hi = m; else lo = m; } return hi; } } return null; };
  const floor = Math.min(...cols.filter((_, k) => k % 3 === 0).map((i) => floorB(-R + (i + 0.5) * cell)).filter((v) => v !== null)), stature = crown - floor, a0 = -R + i0 * cell, a1 = -R + (i1 + 1) * cell, out = { stature, crown, floor, a0, a1, at: {} };
  for (const fr of fractions) { const i = Math.min(n - 1, Math.max(0, Math.round(((a0 + fr * (a1 - a0)) + R) / cell - 0.5))); out.at[fr] = tops[i] === null ? null : (tops[i] - floor) / stature; }
  return out;
}
