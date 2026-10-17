#!/usr/bin/env node
// Writes tests/vectors/anglepick.json (specs/face-arc-and-shadow.md §1, its test 1): 24 cases of the composed op `anglePick`, each its picture's bytes (hex RGBA) from the JavaScript reference (station/src/angle-table.mjs), over two fixed
// patterned pictures; face_test and tests/anglepick.test.mjs hold the C op to them byte for byte. The cases cross 0/360, take 1°, 22° and 179° spans, put pixels exactly on each ray, equal a0 and a1, clear `from` and read windows.
//   node prototypes/face/tools/make-anglepick-vectors.mjs          (writes)     --check   (fails when the file is not current)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { anglePick } from "../../station/src/angle-table.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.resolve(here, "../tests/vectors/anglepick.json"), palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgb = (n) => { const h = palette.find((c) => c[0] === n)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
// the two pictures every case reads: 48 × 48, each pixel one of four colours by (x + 2y) mod 4 (`to`) or (3x + y) mod 4 (`from`), so a window offset changes the picture
export const SIZE = 48, TO = ["clay", "ice", "mist", "bark"], FROM = ["bone", "teal", "plum", "sand"];
export const picture = (names, f) => { const px = new Uint8Array(SIZE * SIZE * 4); for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px.set([...rgb(names[f(x, y)]), 255], (y * SIZE + x) * 4); return { w: SIZE, h: SIZE, px }; };
export const TOP = () => picture(TO, (x, y) => (x + 2 * y) % 4), FROMP = () => picture(FROM, (x, y) => (3 * x + y) % 4);
const hex = (u) => Buffer.from(u).toString("hex");
// w, h, cx, cy, a0, a1, from (false: clear), fs, ts
const C = [
  ["a quarter, 0 to 90", 16, 16, 8, 8, 0, 90], ["22 degrees from 12 o'clock", 16, 16, 8, 8, 0, 22], ["22 degrees from 228", 24, 24, 12, 12, 228, 250], ["across 0/360 (350 to 10)", 16, 16, 8, 8, 350, 10], ["across 0/360, 340 to 22", 20, 20, 10, 10, 340, 22],
  ["one degree, 0 to 1", 32, 32, 16, 16, 0, 1], ["one degree, 100 to 101", 32, 32, 16, 16, 100, 101], ["179 degrees, 0 to 179", 16, 16, 8, 8, 0, 179], ["179 degrees, 181 to 360", 16, 16, 8, 8, 181, 360], ["a1 = a0 (all from)", 16, 16, 8, 8, 77, 77],
  ["exactly on the 45° ray, a0 = 45", 9, 9, 4, 4, 45, 90], ["exactly on the 45° ray, a1 = 45", 9, 9, 4, 4, 0, 45], ["exactly on the 135° ray, a0 = 135", 9, 9, 4, 4, 135, 180], ["exactly on the 225° ray, a1 = 225", 9, 9, 4, 4, 180, 225], ["exactly on the 315° ray, a0 = 315", 9, 9, 4, 4, 315, 360],
  ["on the vertical ray, a0 = 0 (no pixel centre is on it)", 8, 8, 4, 4, 0, 30], ["a centre off the picture's middle", 20, 20, 3, 15, 200, 300], ["a centre outside the picture", 16, 16, -4, 8, 60, 120], ["to alone, from clear", 16, 16, 8, 8, 0, 120, false], ["to alone, across 0/360", 16, 16, 8, 8, 300, 40, false],
  ["a window of `to` at (5, 3)", 16, 16, 8, 8, 10, 100, true, [0, 0], [5, 3]], ["a window of `from` at (7, 9)", 16, 16, 8, 8, 10, 100, true, [7, 9], [0, 0]], ["both windows", 20, 20, 10, 10, 180, 350, true, [11, 4], [3, 17]], ["the 22 degree segment 3 of the ring (228 + 66)", 30, 30, 15, 15, 294, 316],
].map(([name, w, h, cx, cy, a0, a1, from = true, fs = [0, 0], ts = [0, 0]]) => ({ name, w, h, cx, cy, a0, a1, from, fs, ts }));
const cases = C.map((c) => { const r = anglePick({ w: c.w, h: c.h, cx: c.cx, cy: c.cy, a0: c.a0, a1: c.a1, from: c.from ? FROMP() : null, to: TOP(), fsx: c.fs[0], fsy: c.fs[1], tsx: c.ts[0], tsy: c.ts[1] }); if (!r) throw new Error(c.name); return { ...c, expect: hex(r) }; });
const text = JSON.stringify({ note: "Made by tools/make-anglepick-vectors.mjs: each case is the op's arguments over the two 48 × 48 patterned pictures of that tool and its picture's bytes (hex RGBA) from the JavaScript reference; the C op must match byte for byte.", cases }, null, 1) + "\n";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) { let cur = ""; try { cur = readFileSync(out, "utf8"); } catch { /* missing */ } if (cur !== text) { console.error("tests/vectors/anglepick.json is not current: run tools/make-anglepick-vectors.mjs"); process.exit(1); } console.log("anglepick vectors current (" + cases.length + " cases)"); }
  else { writeFileSync(out, text); console.log("wrote " + cases.length + " cases"); }
}
