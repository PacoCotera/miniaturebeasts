// The master's alpha height at 304 (the framing's ref.height) and its bounding rows/columns, for the mesh camera.
import { loadImage } from "../../foundation/imgtools.mjs";
import { MASTER } from "../../foundation/paths.mjs";
const im = loadImage(MASTER(process.argv[2] ?? "S01", 304));
let r0 = 1e9, r1 = -1, c0 = 1e9, c1 = -1;
for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) if (im.data[(y * im.width + x) * 4 + 3] >= 128) { r0 = Math.min(r0, y); r1 = Math.max(r1, y); c0 = Math.min(c0, x); c1 = Math.max(c1, x); }
console.log(JSON.stringify({ width: im.width, height: im.height, rows: [r0, r1], cols: [c0, c1] }));
