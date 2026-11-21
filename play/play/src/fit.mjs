// The play page's size choice: z, device pixels per lp, for the laptop size control (− / fit / +). Pure (no DOM), so it is unit-tested (tests/fit.test.mjs).
// The layout itself (one device in view, its panel centred, whole-number steps for the laptop Companion) is src/layout.mjs; this file keeps only the size control's bounds.
// One lp is f = z / devicePixelRatio CSS px, so every face pixel is a z × z block of device pixels at every whole z.

export const Z_MAX = 8;
export const baseK = (dpr) => Math.max(1, Math.floor(dpr || 1));   // the faces' own scale (each device draws its screen at this many device px per CSS px)
export const clampZ = (z) => Math.min(Z_MAX, Math.max(1, Math.round(Number(z) || 1)));
