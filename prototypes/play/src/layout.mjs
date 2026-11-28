// The play page's layout (ui-play-layout-2; the owner's 2026-11-14 line "i don't like the devices sitting next to each other, they are too big. and i use it mostly on mobile", and 2026-11-15 "good").
// Pure (no DOM), so it is unit-tested (tests/layout.test.mjs); shell.mjs only places what plan() returns. Boxes are [x, y, w, h] objects in CSS px of the window (y = 0 at the window's top).
//
// One device in view, everywhere: its PANEL (its screen and its keys) centred with room round it; the other device keeps running, hidden. Never a second device beside it, never a scroll.
//  - upright phone: the keys under the screen; the D-pad row at one height for both devices (the thumbs never move when you switch); the Station's rooms in a row above it. Panel 24 from each side.
//  - phone on its side, and a laptop: a key column each side of the screen (keyplan "landscape"). The laptop shows the Companion at a whole number of device pixels per lp where one fits, and the Station at its fit scale (never above 1), the panel at most 1040 wide.
//  - the dock: the Dock key and the dock's-screen button in one row under the panel (upright), or at the foot of the right key column (sideways, laptop).
// Tokens: 24 phone sides, 48 laptop sides, 16 between attached blocks, 12 inside the panel (space-12), 8 between the Dock key and the dock's-screen button; the bar is 52.

import { sizes, plan as keyPlan, pickA, portraitTrayH, sideCols, leftColH, EDGE, DOCK_H, DOCK_GAP, EPAPER_GAP } from "./keyplan.mjs";

export const BAR = 52, GAP = 16, NOTE_H = 56, STAMP_H = 12, EPAPER_W = 104, SIDE_PHONE = 24, SIDE_LAPTOP = 48, LAPTOP_MAX_W = 1040, LAPTOP_TOP = 16, UPRIGHT_STAMP_BOTTOM = 16;
export const FACE = { companion: [450, 600], station: [1024, 600] };   // the faces, in lp
export const SWITCH_LAPTOP_W = 320;
// The Station on a phone (ui-station-phone-1; the AD 11-16: a card and its heart shrink to a dot): its 1024 x 600 screen fitted whole is about x0.31 held upright and x0.44 on its side. Where the whole fit is under
// ZOOM the screen is drawn at ZOOM in a window as wide as the panel allows (out.view: the part of the screen in view, in lp), and the window pans to keep the focused target whole (panFor). Wherever x0.6 fits, the whole screen.
// On a phone's side (and a window like 1024 x 600) the whole screen shows where its fit is at least ZOOM_WHOLE of ZOOM (1024 x 600: the fit x0.566 against x0.6): a window there cut the right 47 lp of every wide screen, the Bay's ledge and the top bar's clock.
export const ZOOM = 0.6, PAN_PAD = 12, ZOOM_WHOLE = 0.9;
// The upright phone's window is NARROW_W lp wide at most (530 lp is 318 CSS px at ZOOM: a 390 wide phone's 342 less the panel's own edge): Home draws its narrow form there (home.json "narrow", 530 lp wide), never more of the screen than that form fills.
export const NARROW_W = 530;
const PAGE_W_H = [530, 600];   // her page's window of the face (pods.json regions.page.rect), lp
// The window's top left (lp) that shows `box` (the focus ring's target, [x, y, w, h] in lp) whole with PAN_PAD round it, moving as little as it can from `at`; a box larger than the window keeps its top left in view.
// box null (no ring on the screen): `at` as it is. Always inside the screen.
export function panFor(view, box, at = { x: 0, y: 0 }, face = FACE.station) {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v)), axis = (p, b0, bl, vl, fl) => {
    const lo = b0 - PAN_PAD, hi = b0 + bl + PAN_PAD;
    if (hi - lo > vl) p = lo; else if (hi <= vl) p = 0;   /* the target fits from the screen's own edge: the window rests there, never part way across a screen whose left side then shows cut (the partner list opened at the pan the screen before it left) */
    else if (lo < p) p = lo; else if (hi > p + vl) p = hi - vl;
    return clamp(Math.round(p), 0, Math.max(0, fl - vl));
  };
  if (!view) return { x: 0, y: 0 };
  if (!box) return { x: clamp(at.x, 0, Math.max(0, face[0] - view.w)), y: clamp(at.y, 0, Math.max(0, face[1] - view.h)) };
  return { x: axis(at.x, box[0], box[2], view.w, face[0]), y: axis(at.y, box[1], box[3], view.h, face[1]) };
}

// One focus message (the screen shown, its ring box or null) against what was last heard, st {screen, settling}: top = the window goes to the screen's top left (a new screen with no ring on it).
// A new screen's first message can still carry the ring box of the screen before it (the face has not drawn the new one yet), so the empty box that follows is also an arrival: a screen's first two messages count.
export function focusStep(st, screen, box) {
  const moved = screen !== st.screen;
  return { st: { screen, settling: moved }, top: (moved || st.settling) && !box };
}

// 'up' a phone held upright, 'side' a phone on its side, 'laptop' everything else
// A coarse pointer on a small screen is a phone. Any other pointer gets the laptop form only where it fits: the Companion at ×1 under the laptop plan, and the bar's controls in one row, apart. Otherwise the phone form for the orientation.
export function laptopFits(W, H) {
  const K = sizes(44), lw = EDGE + K.cross + EDGE, rw = EDGE + K.clusterW + EDGE, maxW = Math.min(W - 2 * SIDE_LAPTOP, LAPTOP_MAX_W), maxH = H - BAR - 2 * LAPTOP_TOP;
  if ((maxW - lw - rw) / FACE.companion[0] < 1 || (maxH - 2 * EDGE) / FACE.companion[1] < 1) return false;
  const b = barPlan({ W, form: "laptop", size: true }), left = Math.min(b.size[0][0], b.keys[0]);
  return b.switch[0] + b.switch[2] + BAR_GAP <= left;
}
export const form = (W, H, coarse) => (coarse ? (Math.min(W, H) < 600 ? (H >= W ? "up" : "side") : "laptop") : laptopFits(W, H) ? "laptop" : H >= W ? "up" : "side");

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const box = (x, y, w, h) => ({ x, y, w, h });
const abs = (b, dx, dy) => b && [b[0] + dx, b[1] + dy, b[2], b[3]];
const bx = (b) => (b ? box(b[0], b[1], b[2], b[3]) : null);

// the laptop's two scales, in CSS px per lp: the Companion's (a whole number of device pixels where one fits) and the Station's (the fit, never above 1); zSet: the size control's choice, device px per lp for the Companion
// The largest whole z (device px per lp) at which the Companion's whole panel fits the window: nothing cut, nothing scrolled. Never below 1.
export function zCap(W, H, dpr = 1) {
  const K = sizes(44), lw = EDGE + K.cross + EDGE, rw = EDGE + K.clusterW + EDGE, byH = (H - BAR - 2 * EDGE) / FACE.companion[1], byW = (W - lw - rw) / FACE.companion[0];
  return Math.max(1, Math.floor(Math.min(byH, byW) * dpr + 1e-9));
}
// The Companion on a phone: the largest whole number of device pixels per lp that fits (play-scale-1); below one device pixel per lp the fit stays as it was.
export const wholeC = (s, dpr) => (Math.floor(s * dpr + 1e-6) >= 1 ? Math.floor(s * dpr + 1e-6) / dpr : s);
function laptopScales(W, H, dpr, zSet) {
  const K = sizes(44), lw = EDGE + K.cross + EDGE, rw = EDGE + K.clusterW + EDGE, avail = H - BAR, maxW = Math.min(W - 2 * SIDE_LAPTOP, LAPTOP_MAX_W), maxH = avail - 2 * LAPTOP_TOP;
  const fitOf = (dev) => Math.max(1 / 16, Math.min((maxW - lw - rw) / FACE[dev][0], (maxH - 2 * EDGE) / FACE[dev][1]));
  const fitC = fitOf("companion"), zFit = Math.floor(fitC * dpr), sC = zFit >= 1 ? zFit / dpr : fitC, fitS = Math.min(1, fitOf("station"));
  if (zSet == null) return { companion: sC, station: fitS, zFit: zFit >= 1 ? zFit : fitC * dpr };
  const z = Math.min(Math.max(1, Math.round(zSet)), zCap(W, H, dpr)), ratio = z / (zFit >= 1 ? zFit : fitC * dpr);
  return { companion: z / dpr, station: fitS * ratio, zFit: zFit >= 1 ? zFit : fitC * dpr };
}

// plan({ W, H, dpr, coarse, dev, asleep, zSet }): dev 'companion' | 'station'; asleep: the Station has no pod home yet; zSet: the laptop size control's choice (null = fit)
// -> { form, W, H, dev, a, scale, bar, panel, screen, tray: { box, layout, plan }, dock, epaper, note, stamp, view, margins, content }
// scale: CSS px per lp. tray.plan is keyplan's plan for tray.box; dock and epaper are in window CSS px. note and stamp are null where not shown; stamp.where: 'foot', 'bar' (sideways) or 'barLeft' (laptop).
export function plan({ W, H, dpr = 1, coarse = false, dev, asleep = false, zSet = null, page = false }) {
  // the one 1/64 floor (code-audit step 6): every scale is a whole number of 1/64 device px per lp, so plan().screen.w is what the shell draws (it takes p.scale * dpr as given)
  const snap64 = (v) => Math.floor(v * dpr * 64 + 1e-6) / 64 / dpr;
  const f = form(W, H, coarse), st = dev === "station", [fw, fh] = FACE[dev];
  const out = { form: f, W, H, dev, asleep, bar: box(0, 0, W, BAR), note: null, stamp: null, view: null };   // view: the Station's window on a phone (lp), null where the whole screen shows
  if (f === "up") {
    // the keys row is placed once, from the Companion (the taller panel): its panel and the dock row centred between the bar and the build line; the Station's panel ends on the same line
    const M = SIDE_PHONE, bw = W - 2 * M, a = pickA("portrait", bw, H), stampY = H - UPRIGHT_STAMP_BOTTOM - STAMP_H;
    // The Companion is drawn whole at the width's fit, or smaller where the height runs short (ui-short-phone-1): the group (panel, GAP, dock row) then fills the zone between the bar and the build line less GAP at each end,
    // so its panel keeps the GAP under the bar, the dock row ends GAP above the build line, and the keys (signed sizes) never meet the screen. Where the height is enough nothing changes.
    const zone = stampY - 12 - BAR, trayC = portraitTrayH("companion", a), fitH = (zone - 2 * GAP - GAP - DOCK_H - EDGE - trayC - 1e-6) / FACE.companion[1];
    const fitOf = (d) => (bw - 2 * EDGE) / FACE[d][0], scOf = (d) => (d === "station" ? snap64(Math.max(ZOOM, fitOf(d))) : wholeUp(d)), bhOf = (d) => EDGE + FACE[d][1] * scOf(d) + portraitTrayH(d, a);
    // bug 134: a whole multiple that misses the panel's inner width by a few px (1.98 device px per lp at 412 wide, dpr 2.625) may use half the panel's edge each side, not drop to one device px per lp (a third of the width)
    // bug 135: where the whole multiple is under 95% of the fit (522 x 935, dpr 3: 2 of a possible 2.73 device px per lp, 300 of 410 CSS px; 390 x 844: 300 of 330), the screen takes the fit (the pixelated iframe stays sharp at a fraction)
    // one scale (code-audit step 6, owner #27/#134/#135): out.screen.w is what is drawn. The shell draws the frame at the scale floored to 1/64 device px per lp (shell.mjs kOf), so the plan says that scale: never 2 CSS px more than the screen shows (2.2 asked, 2.1875 drawn, at 390 wide).
    const wholeUp = (d) => snap64(wholeUp0(d)), wholeUp0 = (d) => { const wide = Math.max(1 / 16, Math.min((bw - EDGE) / FACE[d][0], fitH)); if (Math.floor(wide * dpr + 1e-6) < 1) return Math.max(1 / 16, Math.min(fitOf(d), fitH)); const w = wholeC(wide, dpr); return w < 0.95 * wide ? wide : w; };
    const bhC = bhOf("companion"), group = bhC + GAP + DOCK_H, bodyBottom = BAR + Math.floor((zone - group) / 2) + bhC, dockY = bodyBottom + GAP;
    const s = scOf(dev), trayH = portraitTrayH(dev, a), sw = Math.min(fw * s, bw - (st ? 2 : 1) * EDGE, st ? NARROW_W * s : Infinity);   // the Station's window is never wider than the narrow Home (centred in the panel when the phone is wider)
    // the Station's window: as tall as the screen at s, or what is left under the bar (and the asleep note) above the keys; the window pans up and down when it is shorter. The Companion's screen is always whole.
    const topMin = BAR + GAP + (st && asleep ? NOTE_H + GAP : 0), sh = st ? Math.max(0, Math.min(fh * s, Math.floor(bodyBottom - trayH - EDGE - topMin))) : fh * s;
    const bh = EDGE + sh + trayH, by = bodyBottom - bh;
    out.a = a; out.scale = s; out.panel = box(M, by, bw, bh);
    out.screen = box(M + EDGE + (bw - 2 * EDGE - sw) / 2, by + EDGE, sw, sh);   // centred in the panel when it is narrower than the panel (the Companion on a short phone)
    out.view = sw < fw * s - 1e-6 || sh < fh * s - 1e-6 ? { w: sw / s, h: sh / s } : null;
    out.narrow = !!(st && out.view && out.view.w <= NARROW_W + 1e-6);   // Home's narrow form: only the upright phone's window (sideways and the laptop never)
    const trayBox = [M, by + bh - trayH, bw, trayH];
    out.tray = { box: trayBox, layout: "portrait", plan: keyPlan(dev, "portrait", bw, 0, a) };
    out.dock = box(M, dockY, bw - EPAPER_GAP - EPAPER_W, DOCK_H); out.epaper = box(M + bw - EPAPER_W, dockY, EPAPER_W, DOCK_H);
    out.stamp = { box: box(M, stampY, bw, STAMP_H), where: "foot" };
    if (st && asleep) out.note = box(M, by - GAP - NOTE_H, bw, NOTE_H);
    out.keysLineY = trayBox[1] + out.tray.plan.keys.down[1] + out.tray.plan.a;   // the D-pad's centre row: the same y on both devices
    out.margins = { side: M, top: by - BAR, bottom: H - (dockY + DOCK_H) };
    const top0 = Math.min(by, out.note ? out.note.y : by);
    out.content = [M, top0, bw, dockY + DOCK_H - top0];
    return out;
  }
  // a key column each side of the screen
  const a = f === "side" ? pickA("landscape", 0, H - BAR) : 44, K = sizes(a), { LW, RW } = sideCols(a), leftH = leftColH(a);
  let s, bh, by, bxx, sw, sh, bw;
  if (f === "side") {
    const M = SIDE_PHONE, avail = H - BAR;
    bh = EDGE + leftH + EDGE;
    const maxW = W - 2 * M - LW - RW, maxH = bh - 2 * EDGE;
    s = Math.min(maxW / fw, maxH / fh);
    s = st ? snap64(s) : snap64(wholeC(s, dpr));
    if (st && s < snap64(ZOOM * ZOOM_WHOLE)) { s = snap64(ZOOM); sw = Math.min(fw * s, maxW); sh = Math.min(fh * s, maxH); out.view = { w: sw / s, h: sh / s }; }   // the Station's window at ZOOM, as large as the side allows
    else { sw = fw * s; sh = fh * s; }
    bw = LW + sw + RW;
    if (st && page) { const ps = snap64(Math.min(maxH / PAGE_W_H[1], sw / PAGE_W_H[0])); s = ps; out.view = { w: PAGE_W_H[0], h: PAGE_W_H[1] }; out.pageForm = { x: (sw - PAGE_W_H[0] * ps) / 2, w: PAGE_W_H[0] * ps, h: PAGE_W_H[1] * ps }; }   // her page (a 530 x 600 window of the face) on a phone's side: the whole page at the height's fit, as wide as the page itself, centred between the key columns (the panel and its keys stay where they are)
    by = BAR + Math.floor((avail - bh) / 2); bxx = Math.round((W - bw) / 2);
    out.margins = { side: bxx, top: by - BAR, bottom: H - by - bh };
    out.stamp = { box: null, where: "bar" };
    if (st && asleep) out.note = null;   // no room above the panel: the note takes the build line's place in the bar (shell.mjs)
  } else {
    const sc = laptopScales(W, H, dpr, zSet), avail = H - BAR;
    s = snap64(st ? sc.station : sc.companion); sw = fw * s; sh = fh * s;
    if (st && page) { out.view = { w: PAGE_W_H[0], h: PAGE_W_H[1] }; out.pageForm = { x: (sw - PAGE_W_H[0] * s) / 2, w: PAGE_W_H[0] * s, h: PAGE_W_H[1] * s }; }   // her page, the nursery and a pod's page (530 x 600 windows of the 1024 face) on the laptop: the page whole, centred in the screen's place, not the left half of a blank screen (station-fix-2)
    bh = Math.max(sh, leftH) + 2 * EDGE; bw = LW + sw + RW;
    const lift = st && asleep ? NOTE_H + GAP : 0, blockH = bh + lift;
    const y0 = BAR + Math.max(LAPTOP_TOP, Math.floor((avail - blockH) / 2));
    by = y0 + lift; bxx = Math.max(SIDE_LAPTOP, Math.round((W - bw) / 2));
    out.margins = { side: bxx, top: y0 - BAR, bottom: H - by - bh };
    out.stamp = { box: null, where: "barLeft" };
    if (lift) out.note = box(bxx, y0, Math.min(bw, 400), NOTE_H);
    if (!coarse && dpr >= 1) assert(sc.zFit >= 1 - 1e-9, `layout: the laptop fit is ×${sc.zFit} at ${W} × ${H}; the laptop form is only chosen where it fits at ×1`);
    out.zFit = sc.zFit;
  }
  out.a = a; out.scale = s; out.panel = box(bxx, by, bw, bh);
  out.screen = out.pageForm ? box(bxx + LW + out.pageForm.x, by + (bh - out.pageForm.h) / 2, out.pageForm.w, out.pageForm.h) : box(bxx + LW, by + (bh - sh) / 2, sw, sh);
  const kp = keyPlan(dev, "landscape", bw, bh, a);
  out.tray = { box: [bxx, by, bw, bh], layout: "landscape", plan: kp };
  out.dock = bx(abs(kp.dock, bxx, by)); out.epaper = bx(abs(kp.epaper, bxx, by));
  out.keysLineY = by + kp.keys.down[1] + a;
  out.content = [bxx, out.note ? out.note.y : by, bw, by + bh - (out.note ? out.note.y : by)];
  return out;
}

// The bar (52 tall everywhere; its controls 44 tall, `space-16` padding, `space-8` between): the switch, and at the right Options and, on a laptop, Keys ? and the size control (and the developer tools' button when the option is on).
// Upright the switch fills the bar left of Options; on its side the build line sits between them; on a laptop the build line is the bar's left end and the switch is 320 wide, centred.
// barPlan({ W, form, tools, size }) -> { switch, options, keys, size: [down, fit, up] | null, tools, stamp } (boxes [x, y, w, h]; null where not shown)
export const BAR_PAD = 16, BAR_GAP = 8, CTL_H = 44, OPTIONS_W = 92, KEYS_W = 64, SIZE_W = 152, TOOLS_W = 100, STAMP_W = 360, SWITCH_SIDE_W = 280;
export function barPlan({ W, form: f, tools = false, size = false }) {
  const y = (BAR - CTL_H) / 2, b = (x, w) => [x, y, w, CTL_H], out = { switch: null, options: b(W - BAR_PAD - OPTIONS_W, OPTIONS_W), keys: null, size: null, tools: null, stamp: null };
  if (f !== "laptop") {
    const sw = f === "up" ? W - 2 * BAR_PAD - OPTIONS_W - BAR_GAP : SWITCH_SIDE_W;
    out.switch = b(BAR_PAD, sw);
    if (f === "side") { const x = BAR_PAD + sw + BAR_PAD, w = out.options[0] - BAR_GAP - x; out.stamp = w >= 120 ? [x, y, w, CTL_H] : null; }
    return out;
  }
  let x = out.options[0] - BAR_GAP; out.keys = b(x - KEYS_W, KEYS_W); x -= KEYS_W + BAR_GAP;
  if (size) { out.size = [b(x - SIZE_W, 40), b(x - SIZE_W + 44, 64), b(x - SIZE_W + 112, 40)]; x -= SIZE_W + BAR_GAP; }
  if (tools) { out.tools = b(x - TOOLS_W, TOOLS_W); x -= TOOLS_W + BAR_GAP; }
  const left = x + BAR_GAP, sx = Math.max(BAR_PAD, Math.min(Math.round((W - SWITCH_LAPTOP_W) / 2), left - BAR_PAD - SWITCH_LAPTOP_W));
  out.switch = b(sx, SWITCH_LAPTOP_W);
  const sw = sx - 2 * BAR_PAD; out.stamp = sw >= 150 ? [BAR_PAD, y, Math.min(STAMP_W, sw), CTL_H] : null;
  return out;
}


// the dock's screen opened: a bottom sheet on a phone (the e-paper across the sheet's width, 808 : 288), the same dialog centred on a laptop
export function dockSheet(W, H, coarse) {
  const f = form(W, H, coarse), pad = 16, w = Math.min(W - (f === "laptop" ? 96 : 0), 480), ew = w - 2 * pad, eh = ew * 288 / 808;
  const h = pad + 4 + pad + eh + GAP + 16 + 24 + 44 + pad;
  return { form: f, x: (W - w) / 2, y: f === "laptop" ? Math.max(BAR, (H - h) / 2) : H - h, w, h, epaper: { w: ew, h: eh } };
}
