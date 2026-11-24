// mean luminance by distance from the hero in a fogged still: node fog-edge-lum.mjs <still.png> [pxPerRing]
// finds the hero (orange 242,103,27) in the game window and prints the mean lum (0-255, Rec.709) of each ring; clear / band / fog are read off the profile.
import { readFileSync } from "node:fs";
import { decodePNG } from "../../ui/png.mjs";
const img = decodePNG(readFileSync(process.argv[2])), step = +(process.argv[3] || 24);
const { width: W, height: H, data } = img, ch = data.length / (W * H);
const px = (x, y) => { const o = (y * W + x) * ch; return [data[o], data[o + 1], data[o + 2]]; };
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
let sx = 0, sy = 0, n = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = px(x, y); if (c[0] === 242 && c[1] === 103 && c[2] === 27 && y > 132 && y < 588) { sx += x; sy += y; n++; } }
if (!n && !process.argv[4]) { console.log("no hero found"); process.exit(1); }
const hx = process.argv[4] ? +process.argv[4] : sx / n, hy = process.argv[5] ? +process.argv[5] : sy / n, rings = new Map();
// the game window: below the top HUD (y 130..590) and between the screen edges (x 56..464 at 522 wide; scan the middle 400 px)
const x0 = Math.round(W / 2 - 204), x1 = Math.round(W / 2 + 204);
for (let y = 132; y < 588; y++) for (let x = x0; x < x1; x++) { const d = Math.hypot(x - hx, y - hy), k = Math.floor(d / step); const r = rings.get(k) || [0, 0]; r[0] += lum(px(x, y)); r[1]++; rings.set(k, r); }
console.log("hero", hx.toFixed(0), hy.toFixed(0));
for (const k of [...rings.keys()].sort((a, b) => a - b)) { const [s, c] = rings.get(k); console.log(`${k * step}-${(k + 1) * step}px  lum ${(s / c).toFixed(1)}  (${c} px)`); }
