// The face pictures, face:{mibi}:{size} and face:{mibi}:{size}:faded (library.json faces): a mibi's face for the Library, made once in the logic process at each size it is asked for. Each size is rendered straight from the mibi's
// own picture (the layered stand's variant for its drawn looks, composed at the close art's 304 x 312) through the species' face window, a square in the art's pixels, resampled once to the size and laid on the ground; then a 1 px
// frame and, at the sizes the spec names, corner ticks; the faded variant mixes every channel toward the ground (frame included). Never one size faded and scaled to another. Opaque. A species with no layered stand, or no window,
// gets a labelled stand-in: the ground, the frame and the ticks round a flat inner square. Pure: the same request gives the same bytes.
import { layeredStand, composeStand, resample } from "./layered-stand.mjs";

const ART = [304, 312];
// { w, h, rgba, ms, standIn } for a face request { species, stage, looks, size, faded }; spec: library.json `faces`; rgb: a palette name to [r, g, b].
// The figure's box [x0, y0, x1, y1] over the pixels at alpha >= 128 (a contact shadow is fainter), or null.
export function figureBoxOf({ w, h, rgba }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rgba[(y * w + x) * 4 + 3] >= 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1, y1];
}
// A kind's face window [x, y, side] in the 304 x 312 painted stand of its stage as it is drawn: the art desk's crop of the adult (spec.windows.crop, centre x, centre y, side, as painted), moved with the picture when the kind
// is placed mirrored (spec.windows.flipped), and for a young carried over by the figure boxes (the young is 0.8 of the adult, on the same ground; `same` is whether both face the same way on screen).
export function windowOf(species, stage, spec, adult, young, same) {
  const c = spec.windows?.crop?.[species]; if (!c) return null; const side = c[2], cx = spec.windows.flipped?.includes(species) ? ART[0] - c[0] : c[0], cy = c[1];
  if (stage !== "juvenile") return [Math.round(cx - side / 2), Math.round(cy - side / 2), side];
  const A = figureBoxOf(adult), J = figureBoxOf(young); if (!A || !J) return null;
  const s = (J[3] - J[1] + 1) / (A[3] - A[1] + 1); let fx = (cx - A[0]) / (A[2] - A[0] + 1); if (!same) fx = 1 - fx;
  const jx = J[0] + fx * (J[2] - J[0] + 1), jy = J[3] + 1 - (A[3] + 1 - cy) * s, js = Math.round(side * s);
  return [Math.round(jx - js / 2), Math.round(jy - js / 2), js];
}
export function facePicture(r, spec, rgb) {
  const t0 = performance.now(), n = r.size, ground = rgb(spec.ground), line = rgb(spec.frame), out = new Uint8ClampedArray(n * n * 4);
  const stage = r.stage === "elder" ? "adult" : r.stage, win = r.window ?? spec.windows?.[r.species]?.[stage], stand = win && !r.art ? layeredStand(r.species, stage, ART, "default") : null;
  for (let i = 0; i < n * n; i++) out.set([...ground, 255], i * 4);
  if (stand || (win && r.art)) {
    const art = r.art ? r.art : composeStand(stand, r.looks ?? {}).rgba(), [wx, wy, side] = win, crop = new Uint8ClampedArray(side * side * 4);
    for (let y = 0; y < side; y++) { const sy = wy + y; if (sy < 0 || sy >= ART[1]) continue; for (let x = 0; x < side; x++) { const sx = wx + x; if (sx < 0 || sx >= ART[0]) continue; crop.set(art.subarray((sy * ART[0] + sx) * 4, (sy * ART[0] + sx) * 4 + 4), (y * side + x) * 4); } }
    const px = resample(crop, side, side, n, n);
    for (let i = 0; i < n * n; i++) { const a = px[i * 4 + 3] / 255; for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(px[i * 4 + c] * a + ground[c] * (1 - a)); }
  } else {   // the labelled stand-in: a flat inner square, a quarter of the size in from each side
    const k = Math.max(2, Math.floor(n / 4)), fill = rgb("stone");
    for (let y = k; y < n - k; y++) for (let x = k; x < n - k; x++) out.set(fill, (y * n + x) * 4);
  }
  for (let i = 0; i < n; i++) for (const [x, y] of [[i, 0], [i, n - 1], [0, i], [n - 1, i]]) out.set(line, (y * n + x) * 4);   // the 1 px frame
  if (spec.ticks.sizes.includes(n)) { const tick = rgb(spec.ticks.colour), arm = spec.ticks.arm;   // a tick at each corner, on the frame: arm px along each side from the corner
    for (let k = 0; k < arm; k++) for (const [x, y] of [[k, 0], [0, k], [n - 1 - k, 0], [n - 1, k], [k, n - 1], [0, n - 1 - k], [n - 1 - k, n - 1], [n - 1, n - 1 - k]]) out.set(tick, (y * n + x) * 4); }
  if (r.faded) { const keep = spec.faded.keep, fg = rgb(spec.faded.ground); for (let i = 0; i < n * n; i++) for (let c = 0; c < 3; c++) out[i * 4 + c] = Math.round(keep * out[i * 4 + c] + (1 - keep) * fg[c]); }
  return { w: n, h: n, rgba: out, ms: performance.now() - t0, standIn: !(stand || (win && r.art)) };
}
// The id a face request names: face:{mibi}:{size}, with :faded for a released mibi.
export const faceId = (mibi, size, faded) => `face:${mibi}:${size}${faded ? ":faded" : ""}`;
