// The silhouette tools of the back-line sheet: the top of the body per pixel column of a render or a signed master (leaves and the grey cast shadow skipped), the same
// numbers the AD read off the master (ad-gate-crops/measure.py): the top at fractions of the width, in stature units.
import { loadImage } from "./imgtools.mjs";

const isLeaf = (r, g, b) => g >= r - 8 && g > b + 25;
// per column: the highest body pixel row and the lowest; body = opaque, not a leaf, not the light cast shadow
export function columnTops(img, { leaves = true } = {}) {
  const { width: W, height: H, data } = img, top = new Array(W).fill(null), bot = new Array(W).fill(null);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const i = (y * W + x) * 4, r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a <= 240 || (leaves && isLeaf(r, g, b)) || r + g + b >= 600) continue;
    if (top[x] === null) top[x] = y; bot[x] = y;
  }
  return { top, bot };
}
// the profile: { x0, x1, crown, floor, stature, at: { fraction: top in S } }. `crown` is set by the caller when the leaves hide it (the master's leaf pixels pass the mask)
export function imageProfile(img, { fractions = [0.7, 0.85, 0.95], crown = null } = {}) {
  const { top, bot } = columnTops(img), cols = top.map((t, x) => (t === null ? null : x)).filter((x) => x !== null), x0 = cols[0], x1 = cols[cols.length - 1];
  const floor = Math.max(...bot.filter((v) => v !== null)), cr = crown ?? Math.min(...top.filter((v) => v !== null)), S = floor - cr, at = {};
  for (const f of fractions) { const x = Math.floor(x0 + f * (x1 - x0)); at[f] = top[x] === null ? null : (floor - top[x]) / S; }
  return { x0, x1, crown: cr, floor, stature: S, at, top };
}
export const masterProfile = (file, crown = 85) => imageProfile(loadImage(file), { crown });
