// The play page on a phone (owner 2026-11-09): one device at a time, always whole, scaled to the viewport's width AND free height; its key tray fills the width (portrait) or stands in two columns
// beside the screen (landscape). Pure (no DOM), so the fit is unit-tested (tests/phone.test.mjs); the key plans are keyplan.mjs (tests/keyplan.test.mjs). Lengths are CSS px unless a name ends in Lp.
//
// z is the device pixels one lp takes: a whole number whenever one fits (crisp), below 1 a smooth step (the faces are nearest-neighbour either way: no smoothing, never cropped).

import { pickA, portraitTrayH, sideCols, STEPS, DOCK_H } from "./keyplan.mjs";

export const PHONE_BAR = 52, PHONE_PAD = 6, TOUCH = 44, Z_MAX = 8, SHELL_H_LP = 616;
export const SHELL_W_LP = { station: 1040, companion: 466 };
const FILL = 0.9;

// a phone: a coarse pointer (touch) on a window whose short side is under 600 CSS px
export const isPhone = (coarse, W, H) => !!coarse && Math.min(W, H) < 600;
export const isPortrait = (W, H) => H >= W;

export const DOCK_KEY_H = DOCK_H, DOCK_KEY_GAP = 8;   // the Dock key under a portrait tray: its height and the gap above it (a phone held sideways has it in the right column, keyplan.mjs)
export const dockReserve = (dev, portrait) => (portrait ? DOCK_KEY_H + DOCK_KEY_GAP : 0);   // both devices: a docked Companion is lifted from either
export const areaHeight = (portrait, H, reserve = 0) => H - PHONE_BAR - (portrait ? 2 : 1) * PHONE_PAD - reserve;   // landscape keeps only the top pad: the screen may stand on the window's bottom edge, which a turned phone has no spare height for; `reserve`: height kept for the Dock key
// z for a device in a W × H window at dpr, its keys at the step a: the area under the bar, a pad round it
function fitAt(dev, W, H, dpr, a) {
  const portrait = isPortrait(W, H), areaW = W - 2 * PHONE_PAD, areaH = areaHeight(portrait, H, dockReserve(dev, portrait)), lp = SHELL_W_LP[dev];
  let zw, zh;
  if (portrait) { zw = (areaW * dpr) / lp; zh = ((areaH - portraitTrayH(dev, a)) * dpr) / SHELL_H_LP; }
  else { const s = sideCols(a); zw = ((areaW - s.LW - s.RW - 16) * dpr) / lp; zh = (areaH * dpr) / SHELL_H_LP; }
  const z = Math.min(zw, zh);
  // the Companion fills the phone (owner 2026-11-13): a whole z when it uses at least FILL of the room, else the largest smooth step that still fits (nearest-neighbour, never cropped)
  if (dev === "companion" && z >= 1 && Math.floor(z) < FILL * z) return { portrait, z: Math.min(Z_MAX, Math.floor(z * 64) / 64) };
  return { portrait, z: z >= 1 ? Math.min(Z_MAX, Math.floor(z)) : Math.max(1 / 16, Math.floor(z * 64) / 64) };
}
// the key step for this phone: the largest of 44, 48, 56 that fits both devices (keyplan.pickA) and takes nothing from either device's screen: a bigger D-pad is never bought with a smaller screen (the owner's turned Station stays 2×)
export function phoneKeyA(W, H, dpr) {
  const portrait = isPortrait(W, H), cap = pickA(portrait ? "portrait" : "landscape", W - 2 * PHONE_PAD, areaHeight(portrait, H));
  const base = ["station", "companion"].map((d) => fitAt(d, W, H, dpr, 44).z);
  let best = 44;
  for (const a of STEPS) if (a <= cap && ["station", "companion"].every((d, i) => fitAt(d, W, H, dpr, a).z >= base[i])) best = a;
  return best;
}
export const phoneFit = (dev, W, H, dpr) => fitAt(dev, W, H, dpr, phoneKeyA(W, H, dpr));

// the Station is bigger turned: the landscape fit of the same phone is a larger z than the portrait one
export const biggerTurned = (W, H, dpr) => { const here = phoneFit("station", W, H, dpr).z, turned = phoneFit("station", Math.max(W, H), Math.min(W, H), dpr).z; return isPortrait(W, H) && turned > here; };
