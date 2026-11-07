// The play page's size: z, a whole number of device pixels per lp, and the tier it lays out in. Pure (no DOM), so the fit choice is unit-tested (tests/fit.test.mjs).
//
// One lp is f = z / devicePixelRatio CSS px, so every face pixel is a z × z block of device pixels at every size. Today's k = max(1, floor(dpr)) is the floor of the fit and its layout:
// at z = k the tiers are exactly today's (narrow under 1064 wide, the row from 1878 × 800, the stack between). A larger z fits when the layout does not scroll sideways and each
// device's block (its shell and its one-row key tray) fits the window's height under the bar, so the page can show each device whole; the stack is taken whenever it gives a larger z
// than the row. Lengths are CSS px of the window, the bar included.

export const BAR = 40, TOP = 16, BOT = 16, GAPV = 24, ROWH = 72, Z_MAX = 8;
export const SHELL_W = 1040, SHELL_H = 616, COMPANION_W = 466, DEV_COLUMN = 348;   // lp (the shells), CSS px (the developer column's room beside the row, as the 1878 threshold keeps it)

export const baseK = (dpr) => Math.max(1, Math.floor(dpr || 1));

// today's tiers, at z = k
export const baseTier = (W, H) => (W < 1064 ? "narrow" : W >= 1878 && H >= 800 ? "row" : "stack");

// the width a tier needs at f CSS px per lp
const needW = (tier, f) => (tier === "row" ? (SHELL_W + COMPANION_W) * f + GAPV + DEV_COLUMN : SHELL_W * f + GAPV);
// the height a device's block needs: the shell, a one-row tray (any z above k gives f > 1, where both trays hold one row), the margins and the bar
const needH = (f) => BAR + TOP + SHELL_H * f + ROWH + BOT;

export function fits(tier, z, W, H, dpr) {
  const f = z / (dpr || 1);
  return needW(tier, f) <= W && needH(f) <= H;
}

// fit: the largest z that fits, the stack whenever it gives a larger z than the row; never below k, where the tier is today's
export function fitChoice(W, H, dpr) {
  const k = baseK(dpr);
  for (let z = Z_MAX; z > k; z--) {
    if (fits("row", z, W, H, dpr)) return { tier: "row", z };
    if (fits("stack", z, W, H, dpr)) return { tier: "stack", z };
  }
  return { tier: baseTier(W, H), z: k };
}

// a chosen z (the − and + of the size control): the faces keep it and the page scrolls when it does not fit; the row when it fits at that z, else today's tier for the window,
// the stack in place of the row
export function chosen(z, W, H, dpr) {
  z = clampZ(z);
  if (z === baseK(dpr)) return { tier: baseTier(W, H), z };
  if (fits("row", z, W, H, dpr)) return { tier: "row", z };
  return { tier: W < 1064 ? "narrow" : "stack", z };
}

export const clampZ = (z) => Math.min(Z_MAX, Math.max(1, Math.round(Number(z) || 1)));
