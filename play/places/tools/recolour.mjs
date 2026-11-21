// The map palette's colour map (the art director's recolour, mibi-art f1a9fe54e; tools/recolour-palette.json is its out/palette.json): every pixel of a signed picture that is still in the old map palette
// is replaced by its new colour, exact colour to exact colour. No pixel is drawn or moved; alpha is kept. The art desk's own recoloured copies (out/applied/) are used where they exist; this map
// brings the pieces the desk has not re-issued (the style test's route-a props, the hollow tree and split stone, the cliff re-cut) to the same palette.
//   reeds: the reed ramp (grass_mid, grass_line, leaf_line -> reed_light, reed_mid, reed_dark) applies only to the reed sprites, which the desk painted in the new ramp already; it is not in this map.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PALETTE = JSON.parse(readFileSync(path.join(here, 'recolour-palette.json'), 'utf8'));
const key = (r, g, b) => (r << 16) | (g << 8) | b;
const parse = (h) => parseInt(h.slice(1), 16);
const MAP = new Map();
for (const group of ['map', 'extra']) for (const [oldC, newC] of Object.values(PALETTE[group])) if (parse(oldC) !== parse(newC)) MAP.set(parse(oldC), parse(newC));
// the colours of the new palette (a picture whose every colour is in it is already recoloured)
export const NEW_COLOURS = new Set([...Object.values(PALETTE.map), ...Object.values(PALETTE.extra)].map((v) => parse(v[1])).concat(Object.values(PALETTE.reed_ramp).map(parse)));

// A new image with the colour map applied. `left`: the colours it found that are in neither palette (a piece with some is not fully recoloured; the caller decides).
export function recolour(img) {
  const out = { w: img.w, h: img.h, data: new Uint8Array(img.data) }, left = new Set();
  for (let i = 0; i < out.data.length; i += 4) {
    if (!out.data[i + 3]) continue;
    const k = key(out.data[i], out.data[i + 1], out.data[i + 2]), to = MAP.get(k);
    if (to !== undefined) { out.data[i] = to >> 16; out.data[i + 1] = (to >> 8) & 255; out.data[i + 2] = to & 255; } else if (!NEW_COLOURS.has(k)) left.add('#' + k.toString(16).padStart(6, '0'));
  }
  out.left = [...left];
  return out;
}
