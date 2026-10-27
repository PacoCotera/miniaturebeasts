// The test page's layouts, as numbers. Pure (no DOM): the page applies the rectangles, and tests/layout.test.mjs holds them to the signed tables.
// All lengths are CSS px, [x, y, w, h]. The face is 1024 x 600 (the Station) or 450 x 600 (the Companion).
//
// Three layouts: "portrait" (a phone held upright: W < 600 and H >= W), "landscape" (a phone on its side: H < 500 and W > H) and "desktop" (everything else).
// A phone is always the full-screen view: no shell, the face and its keys. The desktop is the full-screen view or the hardware view (hardware() below gives its scales).

export const SIZES = {
  // key sizes in CSS px, by layout and device (the control kit)
  desktop: { station: { pad: 60, room: 56, back: 64, confirm: 96 }, companion: { pad: 56, call: 60, back: 60, confirm: 92 } },
  portrait: { station: { pad: 56, room: 56, back: 60, confirm: 88 }, companion: { pad: 56, call: 60, back: 60, confirm: 88 } },
  landscape: { station: { padW: 88, padH: 44, padKey: 44, room: 56, back: 52, confirm: 72 }, companion: { pad: 48, call: 56, back: 56, confirm: 84 } },
  hardware: { station: { pad: 68, room: 64, back: 76, confirm: 112 }, companion: { pad: 52, call: 60, back: 60, confirm: 92 } },
};
export const FACE = { station: [1024, 600], companion: [450, 600] };

export const classify = (W, H) => (W < 600 && H >= W ? "portrait" : H < 500 && W > H ? "landscape" : "desktop");
const rd = (v) => Math.round(v + 1e-9);

// the Station's whole-pixel snap (the desktop only): s becomes k / dpr when that is within 15 % below s
export function snap(s, dpr) { const k = Math.floor(s * dpr + 1e-6); return k >= 1 && k / dpr >= s * 0.85 ? k / dpr : s; }

// How the face is drawn. The Station: smooth, except when one face pixel covers a whole number of device pixels. The Companion: pixelated from one device pixel per face pixel up, smooth below.
export function render(device, s, dpr) {
  const p = s * dpr;
  if (device === "companion") return p >= 1 - 1e-6 ? "pixelated" : "auto";
  return p >= 1 - 1e-6 && Math.abs(p - Math.round(p)) < 1e-3 ? "pixelated" : "auto";
}

const plus = (x, y, k) => ({ up: [x + k, y, k, k], left: [x, y + k, k, k], right: [x + 2 * k, y + k, k, k], down: [x + k, y + 2 * k, k, k] });

// The layout of one screen. opts: W, H, dpr, safe {t, r, b, l}, device ("station" | "companion"), touch (the pointer is coarse; only the desktop bar changes), dev.
export function layout({ W, H, dpr = 1, safe = {}, device = "station", touch = false, dev = false }) {
  const S = { t: safe.t || 0, r: safe.r || 0, b: safe.b || 0, l: safe.l || 0 };
  const kind = classify(W, H);
  const out = kind === "portrait" ? portrait(W, H, S, device, dev) : kind === "landscape" ? landscape(W, H, S, device, dev) : desktop(W, H, dpr, device, dev, touch);
  out.kind = kind; out.device = device;
  out.render = render(device, out.s, dpr);
  return out;
}

// ---- phone, portrait: the bar, the face, the lines, then the keys centred in what is left ----
function portrait(W, H, S, device, dev) {
  const bw = W - S.l - S.r, x0 = S.l, y0 = S.t, [fw, fh] = FACE[device];
  const station = device === "station";
  const s = station ? (bw - 16) / 1024 : Math.min((bw - 16) / 450, (H - S.t - S.b - 52 - 46 - 168 - 24) / 600);
  const w = fw * s, h = fh * s, fx = x0 + (bw - w) / 2, fy = y0 + 52;
  const menuX = W - S.r - 8 - 44;
  const R = {
    bar: [0, y0, W, 44],
    switch: [x0 + 8, y0, 168, 44], switchStation: [x0 + 8, y0, 84, 44], switchCompanion: [x0 + 92, y0, 84, 44],
    dock: [x0 + 184, y0, 88, 44], flag: [menuX - 44, y0, 44, 44], menu: [menuX, y0, 44, 44],
  };
  const lastY = rd(fy + h) + 6, footY = lastY + 18;
  R.last = [x0 + 8, lastY, bw - 16, 16]; R.foot = [x0 + 8, footY, bw - 16, 14];
  R.hint = [x0 + 8, footY + 14 + 8, bw - 16, 16];   // "Turn the phone for a larger Station": the free band between the footer and the keys
  const top = footY + 14, bottom = H - S.b - 16, padY = rd((top + bottom) / 2 - 84), padX = x0 + 16;
  const z = SIZES.portrait[device], K = {};
  const confirmX = W - S.r - 16 - z.confirm;
  if (station) {
    Object.assign(K, plus(padX, padY, z.pad));
    K.confirm = [confirmX, padY + 40, z.confirm, z.confirm]; K.back = [confirmX - 76, padY + 92, z.back, z.back];
  } else {
    Object.assign(K, plus(padX, padY, z.pad));
    K.call = [confirmX - 72, padY + 18, z.call, z.call]; K.back = [confirmX - 72, padY + 90, z.back, z.back]; K.confirm = [confirmX, padY + 40, z.confirm, z.confirm];
  }
  return { s, face: [fx, fy, w, h], regions: R, keys: K, padBlock: [padX, padY, 168, 168] };
}

// ---- phone, landscape: the thumbs at the sides, the face between ----
function landscape(W, H, S, device, dev) {
  const [fw, fh] = FACE[device], station = device === "station";
  const eL = S.l >= 16 ? 0 : 8, eR = S.r >= 16 ? 0 : 8;
  const cL = S.l + eL, cR = W - S.r - eR - 88, Hs = H - S.b;
  const bandL = cL + 96, bandR = cR - 8;
  const s = station ? Math.min((bandR - bandL) / 1024, (Hs - 12) / 600) : (Hs - 12) / 600;
  const w = fw * s, h = fh * s, fx = bandL + (bandR - bandL - w) / 2, fy = Math.max(6, (Hs - h) / 2);
  const padY = Hs - 8 - 132;   // the Station's compact pad; the Companion keeps its place for the footer too
  const R = {
    bar: null,
    switch: [cL, 8, 88, 44], switchStation: [cL, 8, 44, 44], switchCompanion: [cL + 44, 8, 44, 44],
    last: [cL, 64, 88, 48], foot: [cL, padY - 12 - 42, 88, 42],
    dock: [cR, 8, 88, 44], menu: [cR, 60, 88, 44], flag: [cR, 112, 88, 44],
  };
  const K = {}, z = SIZES.landscape[device];
  if (station) {
    K.up = [cL, padY, 88, 44]; K.left = [cL, padY + 44, 44, 44]; K.right = [cL + 44, padY + 44, 44, 44]; K.down = [cL, padY + 88, 88, 44];
    K.confirm = [cR + 16, Hs - 8 - z.confirm, z.confirm, z.confirm]; K.back = [cR, Hs - 8 - z.confirm - 60, z.back, z.back];
  } else {
    const px = rd((fx - 144 + Math.max(0, S.l - 8)) / 2), py = Hs - 8 - 144;
    Object.assign(K, plus(px, py, z.pad));
    K.confirm = [cR + 4, Hs - 8 - z.confirm, z.confirm, z.confirm];
    K.call = [K.confirm[0] - 68, Hs - 140, z.call, z.call]; K.back = [K.confirm[0] - 68, Hs - 72, z.back, z.back];
  }
  return { s, face: [fx, fy, w, h], regions: R, keys: K, padBlock: station ? [cL, padY, 88, 132] : null };
}

// ---- desktop, the full-screen view ----
function desktop(W, H, dpr, device, dev, touch) {
  const [fw, fh] = FACE[device], station = device === "station", bar = touch ? 52 : 40, ch = touch ? 44 : 32, cy = (bar - ch) / 2;
  const z = SIZES.desktop[device];
  let s;
  if (station) s = Math.max(0.25, Math.min(1, (W - 2 * 208) / 1024, (H - bar - 32 - 80 - 28) / 600));
  else s = Math.max(0.25, Math.min(1, (H - bar - 80) / 600, (W - 2 * (32 + 168 + 14)) / 450));
  s = snap(s, dpr);
  const w = fw * s, h = fh * s;
  const block = station ? h + 24 + z.room : h;   // the face and, for the Station, the room keys under it
  const fy = bar + (H - bar - 40 - block) / 2, fx = (W - w) / 2, mid = fy + h / 2;
  const R = { bar: [0, 0, W, bar], switch: [16, cy, 240, ch], switchStation: [16, cy, 120, ch], switchCompanion: [136, cy, 120, ch] };
  // the right cluster, right-aligned to W - 16, from the right: Full screen / Exit, Drawer (dev), Flag (dev), Dock
  let x = W - 16 - 76; R.fullscreen = [x, cy, 76, ch];
  if (dev) { x -= 8 + 40; R.drawer = [x, cy, 40, ch]; x -= 8 + 96; R.flag = [x, cy, 96, ch]; }
  x -= 12 + 168; R.dock = [x, cy, 168, ch];
  R.last = [276, rd(bar / 2 - 9), Math.max(0, R.dock[0] - 120 - 276), 18];
  R.foot = [0, H - 28, W, 20];
  const K = {};
  if (station) {
    const p = z.pad, px = 14, py = rd(mid - 1.5 * p);
    Object.assign(K, plus(px, py, p));
    K.confirm = [W - 16 - z.confirm, rd(mid - z.confirm / 2), z.confirm, z.confirm];
    K.back = [K.confirm[0] - 16 - z.back, K.confirm[1] + z.confirm - z.back, z.back, z.back];
    const rx = rd((W - (4 * z.room + 48)) / 2), ry = rd(fy + h + 24);
    ["home", "habitat", "research", "library"].forEach((id, i) => { K[id] = [rx + i * (z.room + 16), ry, z.room, z.room]; });
  } else {
    const p = z.pad, gap = 32, px = rd(fx - gap - 3 * p), py = rd(mid - 1.5 * p);
    Object.assign(K, plus(px, py, p));
    const ax = rd(fx + w + gap);
    K.call = [ax, rd(mid - 66), z.call, z.call]; K.back = [ax, rd(mid + 6), z.back, z.back]; K.confirm = [ax + 60 + 16, rd(mid - z.confirm / 2), z.confirm, z.confirm];
  }
  return { s, face: [fx, fy, w, h], regions: R, keys: K, padBlock: null };
}

// ---- the hardware view (desktop): the shell around the face; only the face scales ----
// Station shell at s: top 30, bezel (face + 24), the key block 236, bottom 18. Companion shell 522 x 832 at 1x.
export const HW_MIN = 800;
export function hardware({ W, H, dpr = 1, device = "station", touch = false }) {
  const bar = touch ? 52 : 40;
  if (device === "station") {
    const s0 = Math.max(0.25, Math.min(1, (W - 32 - 52) / 1024, (H - bar - 16 - 308 - 28) / 600)), s = snap(s0, dpr);
    const inner = Math.max(1024 * s + 24, HW_MIN);   // the key block needs its width: a short window narrows the face, never the keys
    return { s, inner, shellW: inner + 28, shellH: 30 + 600 * s + 24 + 236 + 18, top: bar + 16 };
  }
  const s = Math.max(44 / 52, Math.min(1, (W - 32) / 522, (H - bar - 28) / 832));   // never below the scale that keeps the 52 px keys at 44; a short window scrolls
  return { s, shellW: 522 * s, shellH: 832 * s, top: bar };
}

// ---- the menu (phones): the panel and what is in it, in CSS px ----
// opts: kind ("portrait" | "landscape"), regions (the layout's), device, dev, fullscreen (the Fullscreen API exists)
export function menuLayout({ kind, regions, device, dev, fullscreen, W }) {
  const wd = 284, m = regions.menu;
  const px = kind === "portrait" ? m[0] + m[2] - wd : m[0] - 8 - wd, py = kind === "portrait" ? m[1] + 44 + 4 - 0 : 8;
  const items = {}; let y = 12;
  if (device === "station") {
    ["home", "habitat", "research", "library"].forEach((id, i) => { items[id] = [px + 12 + i * 68, py + y, 56, 56]; });
    y += 56 + 12;
    if (fullscreen || dev) { items.rule = [px + 12, py + y - 0, 260, 1]; y += 8; }
  }
  if (fullscreen) { items.fullscreen = [px + 12, py + y, 260, 44]; y += 44; }
  if (dev) { items.tools = [px + 12, py + y, 260, 44]; y += 44; }
  const h = y + 12;
  return { panel: [px, py, wd, h], items, empty: device === "companion" && !fullscreen && !dev };
}
