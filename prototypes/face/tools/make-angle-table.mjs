#!/usr/bin/env node
// Writes the 360-entry angle table of the composed op `anglePick` (specs/face-arc-and-shadow.md §1), in C (src/prim/angle_table.h) and in JavaScript with the op's reference (station/src/angle-table.mjs):
// S[a] = round(32767 sin a), C[a] = round(-32767 cos a), a whole degrees clockwise from 12 o'clock, y down. Generated once and checked in, never computed at run time, so the sandbox (WebAssembly), the Pi (native) and the reference
// give the same bytes.
//   node prototypes/face/tools/make-angle-table.mjs          (writes both files)     --check   (fails when either is not current)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url)), H = path.resolve(here, "../src/prim/angle_table.h"), J = path.resolve(here, "../../station/src/angle-table.mjs");
const S = [], C = []; for (let a = 0; a < 360; a++) { const r = a * Math.PI / 180; S.push(Math.round(32767 * Math.sin(r)) || 0); C.push(Math.round(-32767 * Math.cos(r)) || 0); }
const rows = (v) => Array.from({ length: 36 }, (_, i) => "  " + v.slice(i * 10, i * 10 + 10).join(", ") + ",").join("\n");
const h = `/* The angle table of the composed op anglePick (specs/face-arc-and-shadow.md §1), made by tools/make-angle-table.mjs and never computed at run time: ANGLE_S[a] = round(32767 sin a), ANGLE_C[a] = round(-32767 cos a), a = 0..359 whole degrees clockwise from 12 o'clock. */
#ifndef ANGLE_TABLE_H
#define ANGLE_TABLE_H
static const short ANGLE_S[360] = {\n${rows(S)}\n};
static const short ANGLE_C[360] = {\n${rows(C)}\n};
#endif
`;
const rows2 = (v) => Array.from({ length: 36 }, (_, i) => "  " + v.slice(i * 10, i * 10 + 10).join(", ") + ",").join("\n");
const j = `// The angle table of the composed op anglePick and the op's JavaScript reference (specs/face-arc-and-shadow.md §1), made by prototypes/face/tools/make-angle-table.mjs: S[a] = round(32767 sin a), C[a] = round(-32767 cos a), a whole degrees clockwise from
// 12 o'clock, y down. Never computed at run time: the C op (face/src/prim/angle_table.h) holds the same numbers, and tests/angle-table.test.mjs holds the two equal.
export const ANGLE_S = [\n${rows2(S)}\n];
export const ANGLE_C = [\n${rows2(C)}\n];

// The op: for each pixel (x, y) of a w × h picture, the pixel of \`to\` (read at tsx + x, tsy + y) when the pixel's centre lies in the angular span [a0, a1) clockwise from 12 o'clock about (cx, cy), else the pixel of \`from\` (at fsx + x, fsy + y), or
// clear when \`from\` is null. \`from\` and \`to\` are { w, h, px } (RGBA bytes). The span is a1 - a0 mod 360 and must be under 180 (null otherwise); an equal pair is all \`from\`. The test is integer-only: P is the pixel centre doubled, the pixel is in the span when
// cross(D(a0), P) >= 0 and cross(D(a1), P) < 0 (the pixel exactly on a0's ray is in, on a1's out).
export function anglePick({ w, h, cx, cy, a0, a1, from, to, fsx = 0, fsy = 0, tsx = 0, tsy = 0 }) {
  const m = (a) => ((a % 360) + 360) % 360, A0 = m(a0), span = m(a1 - a0); if (span >= 180) return null;
  if (!to || tsx + w > to.w || tsy + h > to.h || (from && (fsx + w > from.w || fsy + h > from.h))) return null;
  const out = new Uint8Array(w * h * 4), A1 = m(a1), d0x = ANGLE_S[A0], d0y = ANGLE_C[A0], d1x = ANGLE_S[A1], d1y = ANGLE_C[A1];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = 2 * (x - cx) + 1, py = 2 * (y - cy) + 1, inside = span > 0 && d0x * py - d0y * px >= 0 && d1x * py - d1y * px < 0, o = (y * w + x) * 4;
    if (inside) out.set(to.px.subarray(((tsy + y) * to.w + tsx + x) * 4, ((tsy + y) * to.w + tsx + x) * 4 + 4), o);
    else if (from) out.set(from.px.subarray(((fsy + y) * from.w + fsx + x) * 4, ((fsy + y) * from.w + fsx + x) * 4 + 4), o);
  }
  return out;
}
`;
if (process.argv.includes("--check")) { const bad = []; for (const [f, t] of [[H, h], [J, j]]) { let cur = ""; try { cur = readFileSync(f, "utf8"); } catch { /* missing */ } if (cur !== t) bad.push(path.basename(f)); } if (bad.length) { console.error("not current: " + bad.join(", ") + " (run tools/make-angle-table.mjs)"); process.exit(1); } console.log("angle tables current"); }
else { writeFileSync(H, h); writeFileSync(J, j); console.log("wrote " + H + " and " + J); }
