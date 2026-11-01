// The profile measures of plan A (AD fix round 1, must-fix 3): how far the chin overhangs the chest, and the nape dip between the crown and the back. They read the
// scene's own fields in the body's side plane (y = 0), so they are rules over the built form, not constants: the bands are in the house file (R-chin, R-nape).
// Plain JavaScript, no node: imports.
import { march } from "./sdf.mjs";

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
// nape dip: the profile of the core (head and body, no headgear) from the crown back to the back's peak; the dip is how far the outline falls in between, under the
// lower of the two peaks
export function napeDip(scene) {
  const f = scene.parts.core, S = scene.S, xs = [], zs = [];
  for (let x = scene.kc[0] + 0.5; x >= scene.kc[0] - 2.0; x -= 0.02) { xs.push(x); zs.push(topAt(f, x, S + 0.6) ?? 0); }
  let ci = 0; for (let i = 0; i < zs.length && xs[i] > scene.kc[0] - 0.45; i++) if (zs[i] > zs[ci]) ci = i; // the crown: the highest point over the head
  const rear = scene.kc[0] - scene.head.D / 2 - 0.05; let bi = -1; for (let i = ci + 1; i < zs.length; i++) if (xs[i] < rear && (bi < 0 || zs[i] >= zs[bi])) bi = i; // the back's peak: the highest point behind the skull
  if (bi < 0) return 0;
  const dipZ = Math.min(...zs.slice(ci, bi + 1));
  return Math.max(0, Math.min(zs[ci], zs[bi]) - dipZ);
}
