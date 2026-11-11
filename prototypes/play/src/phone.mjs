// The play page on a phone (owner 2026-11-09): one device at a time, always whole, scaled to the viewport's width AND free height; its key tray fills the width (portrait) or stands in two columns
// beside the screen (landscape). Pure (no DOM), so the fit and the key plans are unit-tested (tests/phone.test.mjs). Lengths are CSS px unless a name ends in Lp.
//
// z is the device pixels one lp takes: a whole number whenever one fits (crisp), below 1 a smooth step (the faces are nearest-neighbour either way: no smoothing, never cropped).

export const PHONE_BAR = 52, PHONE_PAD = 6, TOUCH = 44, Z_MAX = 8, SHELL_H_LP = 616;
export const SHELL_W_LP = { station: 1040, companion: 466 };
const GAP = 10, EDGE = 12;

// a phone: a coarse pointer (touch) on a window whose short side is under 600 CSS px
export const isPhone = (coarse, W, H) => !!coarse && Math.min(W, H) < 600;
export const isPortrait = (W, H) => H >= W;

const stationRoom = (W) => Math.floor((W - 2 * EDGE - 3 * GAP) / 4);

// the least height a portrait tray needs, with every key at the 44 minimum
export function trayMin(dev) { return dev === "station" ? 2 * EDGE + 3 * TOUCH + GAP + TOUCH : 2 * 8 + 3 * TOUCH; }
// the most one is worth: the keys stop growing (arm 64, room keys 88)
export function trayMax(dev) { return dev === "station" ? 2 * EDGE + 3 * 64 + GAP + 88 : 2 * 8 + 3 * 64; }

// landscape, the columns each side of the screen. Station: left the D-pad with Call, Back, Confirm under it, right the four room keys in a column (slim, so the screen keeps the width);
// Companion: left the D-pad, right the three actions in a column. The Companion's arm grows with the height to 56.
const ST_ARM = 48, ST_ACT = [48, 48, 52];
export function sides(dev, areaH) {
  if (dev === "station") return { A: ST_ARM, LW: 8 + ST_ACT[0] + ST_ACT[1] + ST_ACT[2] + 12 + 8, RW: 72 };
  const A = Math.max(TOUCH, Math.min(56, Math.floor((areaH - 16) / 3)));
  return { A, LW: 3 * A + 16, RW: 80 };
}

export const DOCK_KEY_H = 44, DOCK_KEY_GAP = 8;   // the Dock key under a portrait Companion's tray: its height and the gap above it
export const dockReserve = (dev, portrait) => (portrait ? DOCK_KEY_H + DOCK_KEY_GAP : 0);   // both devices: a docked Companion is lifted from either
export const areaHeight = (portrait, H, reserve = 0) => H - PHONE_BAR - (portrait ? 2 : 1) * PHONE_PAD - reserve;   // landscape keeps only the top pad: the screen may stand on the window's bottom edge, which a turned phone has no spare height for; `reserve`: height kept for the Dock key
// z for a device in a W × H window at dpr: the area under the bar, a pad round it
export function phoneFit(dev, W, H, dpr) {
  const portrait = isPortrait(W, H), areaW = W - 2 * PHONE_PAD, areaH = areaHeight(portrait, H, dockReserve(dev, portrait)), lp = SHELL_W_LP[dev];
  let zw, zh;
  if (portrait) { zw = (areaW * dpr) / lp; zh = ((areaH - trayMin(dev)) * dpr) / SHELL_H_LP; }
  else { const s = sides(dev, areaH); zw = ((areaW - s.LW - s.RW - 16) * dpr) / lp; zh = (areaH * dpr) / SHELL_H_LP; }
  const z = Math.min(zw, zh);
  return { portrait, z: z >= 1 ? Math.min(Z_MAX, Math.floor(z)) : Math.max(1 / 16, Math.floor(z * 64) / 64) };
}

// the Station is bigger turned: the landscape fit of the same phone is a larger z than the portrait one
export const biggerTurned = (W, H, dpr) => { const here = phoneFit("station", W, H, dpr).z, turned = phoneFit("station", Math.max(W, H), Math.min(W, H), dpr).z; return isPortrait(W, H) && turned > here; };

// the actions row: Call, Back, Confirm (56, 56, 64 at scale sc) from the right edge
function actions(right, cy, sc, gap) {
  const sz = [Math.round(56 * sc), Math.round(56 * sc), Math.round(64 * sc)], total = sz[0] + sz[1] + sz[2] + 2 * gap, out = {}; let x = right - total;
  ["call", "back", "confirm"].forEach((id, i) => { out[id] = [x, Math.round(cy - sz[i] / 2), sz[i], sz[i]]; x += sz[i] + gap; });
  return { out, total };
}

// portrait: the tray is W × T under the screen. Returns { pos: id -> [x, y, w, h], hub: [x, y, size], arm }
export function planPortrait(dev, W, T) {
  const pos = {}, st = dev === "station";
  const rw = stationRoom(W);
  const R = st ? Math.max(TOUCH, Math.min(88, rw, T - 2 * EDGE - GAP - 3 * TOUCH)) : 0;
  const A = Math.max(TOUCH, Math.min(64, Math.floor((st ? T - 2 * EDGE - GAP - R : T - 16) / 3), Math.floor((W - 2 * EDGE - 12 - 156) / 3)));   // and the actions keep their 44 each beside it
  const cy = st ? EDGE + (3 * A) / 2 : T / 2, cx = EDGE, top = Math.round(cy - (3 * A) / 2);
  pos.up = [cx + A, top, A, A]; pos.left = [cx, top + A, A, A]; pos.right = [cx + 2 * A, top + A, A, A]; pos.down = [cx + A, top + 2 * A, A, A];
  const aw = W - EDGE - (cx + 3 * A) - EDGE, sc = Math.max(TOUCH / 56, Math.min(1.2, (aw - 16) / 176));
  Object.assign(pos, actions(W - EDGE, cy, sc, 8).out);
  if (st) {
    const y = T - EDGE - R, s = Math.min(R, rw); ["home", "research", "vivarium", "library"].forEach((id, i) => { pos[id] = [EDGE + i * (rw + GAP) + Math.floor((rw - s) / 2), y, s, s]; });
  }
  return { pos, hub: [cx + A, top + A, A], arm: A };
}

// landscape: the tray's box is the whole area W × H, keys in a left and a right column (the shell sits between them)
export function planLandscape(dev, W, H) {
  const { A, RW } = sides(dev, H), pos = {}, cy = H / 2, st = dev === "station", cx = 8;
  const top = Math.round(st ? cy - (3 * A + 14 + ST_ACT[2]) / 2 : cy - (3 * A) / 2);   // the Station's left column is the cross and the actions row under it, centred together
  pos.up = [cx + A, top, A, A]; pos.left = [cx, top + A, A, A]; pos.right = [cx + 2 * A, top + A, A, A]; pos.down = [cx + A, top + 2 * A, A, A];
  if (st) {
    const rx = W - RW + Math.floor((RW - 56) / 2), ry = Math.round(cy - 124);
    ["home", "research", "vivarium", "library"].forEach((id, i) => { pos[id] = [rx, ry + i * 64, 56, 56]; });
    let x = cx; ["call", "back", "confirm"].forEach((id, i) => { pos[id] = [x, top + 3 * A + 14 + Math.floor((ST_ACT[2] - ST_ACT[i]) / 2), ST_ACT[i], ST_ACT[i]]; x += ST_ACT[i] + 6; });
  } else {
    const sz = [56, 56, 64]; let y = Math.round(cy - 98);
    ["call", "back", "confirm"].forEach((id, i) => { pos[id] = [W - RW + Math.floor((RW - sz[i]) / 2), y, sz[i], sz[i]]; y += sz[i] + 10; });
  }
  return { pos, hub: [cx + A, top + A, A], arm: A };
}
