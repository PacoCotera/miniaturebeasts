// The face pictures, face:{mibi}:{size} and face:{mibi}:{size}:faded (library.json faces): a mibi's face for the Library, made once in the logic process at each size it is asked for. Each size is rendered straight from the mibi's
// own picture (the layered stand's variant for its drawn looks, composed at the close art's 304 x 312) through the species' face window, a square in the art's pixels, resampled once to the size and laid on the ground; then a 1 px
// frame and, at the sizes the spec names, corner ticks; the faded variant mixes every channel toward the ground (frame included). Never one size faded and scaled to another. Opaque. A species with no layered stand, or no window,
// gets a labelled stand-in: the ground, the frame and the ticks round a flat inner square. Pure: the same request gives the same bytes.
import { layeredStand, composeStand, resample } from "./layered-stand.mjs";

const ART = [304, 312];
// { w, h, rgba, ms, standIn } for a face request { species, stage, looks, size, faded }; spec: library.json `faces`; rgb: a palette name to [r, g, b].
export function facePicture(r, spec, rgb) {
  const t0 = performance.now(), n = r.size, ground = rgb(spec.ground), line = rgb(spec.frame), out = new Uint8ClampedArray(n * n * 4);
  const stage = r.stage === "elder" ? "adult" : r.stage, win = spec.windows?.[r.species]?.[stage], stand = win ? layeredStand(r.species, stage, ART, "default") : null;
  for (let i = 0; i < n * n; i++) out.set([...ground, 255], i * 4);
  if (stand) {
    const art = composeStand(stand, r.looks ?? {}).rgba(), [wx, wy, side] = win, crop = new Uint8ClampedArray(side * side * 4);
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
  return { w: n, h: n, rgba: out, ms: performance.now() - t0, standIn: !stand };
}
// The id a face request names: face:{mibi}:{size}, with :faded for a released mibi.
export const faceId = (mibi, size, faded) => `face:${mibi}:${size}${faded ? ":faded" : ""}`;
