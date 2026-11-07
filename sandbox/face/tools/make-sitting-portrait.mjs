#!/usr/bin/env node
// The Sitting goldens' portrait (release 21h, art desk 21g CALLS 2): what the painter would hand back for "Dot, calm, at the pond", composed from the game's own pictures, with no drawn shape and no tint pass.
//   the chosen PLACE picture (sitting-backdrop-pond-544x408) fills the frame's opening (528 x 392: the glass's centre), the chosen POSE picture (calm, adult, in Dot's coat redder-between) stands on it at the
//   kind's one scale (sittingKindScale: 0.55 of the glass's width, 0.65 of its height, over every Loika picture), its feet on the glass's ground line (sitting.json: feet y 380, axis x 296), and a soft contact shadow
//   (a faint dark oval, feathered) sits under the feet, so the pose and the place share one light.
//   node prototypes/face/tools/make-sitting-portrait.mjs [--check]     writes prototypes/face/tools/fixtures/sitting-portrait-dot.png (deterministic)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import { figureBox, scaleInto } from "../../ui/tools/game-masters.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), masters = path.resolve(here, "../../ui/assets/masters"), out = path.join(here, "fixtures/sitting-portrait-dot.png");
export const COAT = "redder-between", POSE = "calm", GLASS = [544, 408], OPENING = [528, 392], AXIS = 264, FEET = 316;   // sitting.json: the opening is 8 px inside the glass; axis 296 and feet 380 in the screen's frame, minus the opening's origin (32, 64)
const index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")).masters;
const pic = (id) => { const m = index[id]; if (!m) throw new Error("no master " + id); const im = decodePNG(readFileSync(path.join(masters, m.file))); return { w: im.width, h: im.height, data: im.data }; };
// the kind's one scale: the same rule as home-props.mjs sittingKindScale, over the painted pictures of the kind
export function loikaScale() {
  const re = /^mibi-(?:(?:adult|juvenile)-S01(?:-(?:curl|shake|calm|puff|sniff|dig|glow))?|adult-S01-between-dark-lay-[a-z]+)-304x312$/; let k = 1;
  for (const id of Object.keys(index)) { if (!re.test(id)) continue; const p = pic(id), b = figureBoxAt(p, 1); if (b) k = Math.min(k, 0.55 * GLASS[0] / (b[2] - b[0] + 1), 0.65 * GLASS[1] / (b[3] - b[1] + 1)); }
  return Math.floor(k * 1000) / 1000;
}
const figureBoxAt = (p, t) => figureBox(p, t);
export function compose() {
  const back = pic(`sitting-backdrop-pond-${GLASS.join("x")}`), W = OPENING[0], H = OPENING[1], data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = ((y + 8) * back.w + x + 8) * 4, o = (y * W + x) * 4; data.set(back.data.subarray(s, s + 3), o); data[o + 3] = 255; }
  const k = loikaScale(), p = pic(`mibi-adult-S01-${COAT}-${POSE}-304x312`), box = figureBox(p, 128), feetRow = box[3], cx = (box[0] + box[2] + 1) / 2;
  const sc = scaleInto(p, k, cx - k * cx, (feetRow + 1) - k * (feetRow + 1)), sb = figureBox(sc, 128), left = Math.round(AXIS - (sb[0] + sb[2] + 1) / 2), top = FEET + 1 - (sb[3] + 1);
  const rx = (sb[2] - sb[0] + 1) * 0.46, ry = 11, cy = FEET + 1;   // the contact shadow: a feathered dark oval at the feet
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(AXIS - rx); x <= AXIS + rx; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue; const d = ((x - AXIS) / rx) ** 2 + ((y - cy) / ry) ** 2; if (d >= 1) continue;
    const a = 0.42 * (1 - d) ** 2, o = (y * W + x) * 4; for (let c = 0; c < 3; c++) data[o + c] = Math.round(data[o + c] * (1 - a) + 18 * a);
  }
  for (let y = 0; y < sc.h; y++) for (let x = 0; x < sc.w; x++) {
    const X = x + left, Y = y + top, a = sc.data[(y * sc.w + x) * 4 + 3] / 255; if (!a || X < 0 || Y < 0 || X >= W || Y >= H) continue;
    const o = (Y * W + X) * 4; for (let c = 0; c < 3; c++) data[o + c] = Math.round(sc.data[(y * sc.w + x) * 4 + c] * a + data[o + c] * (1 - a));
  }
  return { w: W, h: H, data, k };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const c = compose(), png = encodePNG(c.w, c.h, c.data);
  if (process.argv.includes("--check")) { if (!existsSync(out) || Buffer.compare(readFileSync(out), png) !== 0) { console.error("the Sitting portrait fixture is out of date: run make-sitting-portrait.mjs"); process.exit(1); } console.log("sitting portrait fixture ok (scale " + c.k + ")"); }
  else { mkdirSync(path.dirname(out), { recursive: true }); writeFileSync(out, png); console.log("wrote " + path.relative(process.cwd(), out) + " (scale " + c.k + ")"); }
}
