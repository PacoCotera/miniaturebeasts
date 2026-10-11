// The one way a suite reads the area a frame redrew (the sum of the rectangles the face lists), with two gates on it. LVGL keeps LV_INV_BUF_SIZE invalid areas a refresh and redraws the whole screen on one more (lv_refr.c lv_inv_area):
// the face counts those overflows (face_inv_overflows), and `dirty` throws when the count has advanced since this face was last read, so a frame that overflowed is a failure whatever its area says. A sum of the whole screen (614,400)
// is a full-screen redraw: it throws too unless the frame is declared a full cut (`{ fullCut: true }`), so an overflow in disguise cannot pass as a measurement.
//   import { dirty } from "./dirty.mjs";   dirty(f) → px; dirty(f, { fullCut: true }) when the frame is meant to redraw everything
export const FULL = 1024 * 600;
export function dirty(f, { fullCut = false } = {}) {
  const M = f.M, n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let s = 0;
  for (let i = 0; i < n; i++) s += a[i * 4 + 2] * a[i * 4 + 3];
  const o = f.invOverflows(), seen = f._invSeen ?? 0; f._invSeen = o;
  if (o > seen) throw new Error(`the invalid-area buffer overflowed (${o - seen} time${o - seen > 1 ? "s" : ""}, cap ${f.invCap()}): LVGL redrew the whole screen`);
  if (s === FULL && !fullCut) throw new Error(`the frame redrew the whole screen (${FULL} px) and is not declared a full cut`);
  return s;
}
