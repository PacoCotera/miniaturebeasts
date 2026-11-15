// The key tray's geometry (ui-keys-1, signed by the UI desk): one measure, a = the D-pad's arm, and every other size a fixed multiple of it, so the keys are one family at every size.
// Pure (no DOM), so the plans are unit-tested (tests/keyplan.test.mjs). Lengths are CSS px. The play page's three layouts:
//   "laptop"    a tray as wide as its shell, one row (a second row when the width is short): the D-pad at the left, the actions at the right, the Station's four room keys between
//   "portrait"  a phone held upright: the tray fills the width; the Station's room keys in a row under everything
//   "landscape" a phone held sideways: the tray is the whole area, a column each side of the screen; the Station's room keys in a 2 × 2 square under the D-pad, the Dock key under the actions
// D-pad 3a across (a cross: four arms round a hub); Call, ← and the room keys 1.2a; ✓ 1.7a: the D-pad is 1.74 to 1.8 times ✓ at every size, as on the devices' own pages (1.70, 1.82; the hardware study 1.67).
// Arrangement (both devices): Call above ←, ✓ to their right, centred on that column.

export const STEPS = [44, 48, 56];
const r4 = (x) => Math.round(x / 4) * 4;
export const EDGE = 12, EDGE_X_LAPTOP = 16, EDGE_SIDE = 4, DOCK_H = 44, MIN_TOUCH = 44;
export const IDS = { station: ["up", "left", "right", "down", "home", "research", "vivarium", "library", "call", "back", "confirm"], companion: ["up", "left", "right", "down", "call", "back", "confirm"] };
export const ROOMS = ["home", "research", "vivarium", "library"];

export function sizes(a) {
  const mid = r4(1.2 * a), big = r4(1.7 * a), gap = Math.max(8, r4(a / 4)), group = r4(a / 2), rowGap = r4(a / 3);
  return { a, cross: 3 * a, mid, big, gap, group, rowGap,
    clusterW: mid + gap + big, clusterH: Math.max(2 * mid + gap, big),   // Call above ←, ✓ to their right
    roomsRowW: 4 * mid + 3 * gap, roomsGrid: 2 * mid + gap };
}

// the tray height of a one-row-of-groups tray (laptop; portrait): the D-pad and its edges, plus the Station's room row when it stands under (portrait)
export const laptopRowH = (a = 44) => 3 * a + 2 * EDGE;
export const portraitTrayH = (dev, a) => { const s = sizes(a); return 2 * EDGE + s.cross + (dev === "station" ? s.rowGap + s.mid : 0); };
// the two columns of a phone held sideways: the D-pad's, the actions' (and the Dock key's)
export const sideCols = (a) => { const s = sizes(a); return { LW: EDGE_SIDE + Math.max(s.cross, s.roomsGrid) + EDGE_SIDE, RW: EDGE_SIDE + s.clusterW + EDGE_SIDE }; };

// the largest step that fits both devices in the window (the same a for both, so switching devices never resizes the D-pad); a laptop is always 44
export function pickA(layout, W, H) {
  if (layout === "laptop") return 44;
  let best = 44;
  for (const a of STEPS) {
    const s = sizes(a);
    const fitsW = 2 * EDGE + s.cross + s.group + s.clusterW <= W;   // portrait: the D-pad and the actions side by side
    const fitsH = s.cross + s.group + s.roomsGrid <= H - 2 * EDGE_SIDE && s.clusterH + s.group + DOCK_H <= H - 2 * EDGE_SIDE;   // landscape: the columns
    if (layout === "portrait" ? fitsW : fitsH) best = a;
  }
  return best;
}

// the Dock key's words by the width it has (never an ellipsis): the full words and the ⇧D hint, the short word, the mark alone
export const dockWords = (w) => (w >= 196 ? "full" : w >= 96 ? "short" : "mark");

const box = (x, y, w, h) => [x, y, w, h];
// the cluster: Call above ←, ✓ to their right centred on that column; (x0, y0) its top left
function cluster(s, x0, y0) {
  const out = {}, colH = 2 * s.mid + s.gap, H = Math.max(colH, s.big), cy = y0 + (H - colH) / 2;
  out.call = box(x0, cy, s.mid, s.mid); out.back = box(x0, cy + s.mid + s.gap, s.mid, s.mid);
  out.confirm = box(x0 + s.mid + s.gap, y0 + (H - s.big) / 2, s.big, s.big);
  return out;
}
// the D-pad: the four arms and the hub round (x, y), the cross's top left
function pad(a, x, y) { return { up: box(x + a, y, a, a), left: box(x, y + a, a, a), right: box(x + 2 * a, y + a, a, a), down: box(x + a, y + 2 * a, a, a), hub: [x + a, y + a, a], pad: box(x, y, 3 * a, 3 * a) }; }
const centreY = (y, h, hh) => y + (h - hh) / 2;

// plan(dev, layout, W, H, a?): W × H is the tray's box (laptop, portrait: W is the width and H is ignored, the tray's height is returned) or the whole area (landscape).
// Returns { a, h, rows, keys: { id: [x, y, w, h] }, hub: [x, y, a], pad: [x, y, w, h], zones, padZone, dock, LW, RW }.
// zones: each key's touch area, its box grown by half the gap round it, kept inside the tray, never under 44 × 44; the D-pad is one zone (padZone) split into four wedges by padDir.
export function plan(dev, layout, W, H, aGiven) {
  const a = aGiven || pickA(layout, W, H), s = sizes(a), st = dev === "station", keys = {};
  let h, rows = 1, dock = null, padAt, cl, roomsAt = null, LW = 0, RW = 0;
  if (layout === "landscape") {
    ({ LW, RW } = sideCols(a)); h = H;
    const leftH = s.cross + (st ? s.group + s.roomsGrid : 0), top = Math.round(centreY(0, H, leftH));
    padAt = [EDGE_SIDE + Math.round((LW - 2 * EDGE_SIDE - s.cross) / 2), top];
    if (st) { const rx = EDGE_SIDE + Math.round((LW - 2 * EDGE_SIDE - s.roomsGrid) / 2), ry = top + s.cross + s.group; roomsAt = ROOMS.map((id, i) => [id, rx + (i % 2) * (s.mid + s.gap), ry + Math.floor(i / 2) * (s.mid + s.gap)]); }
    const rightH = s.clusterH + s.group + DOCK_H, rtop = Math.round(centreY(0, H, rightH)), rx0 = W - RW + EDGE_SIDE;
    cl = cluster(s, rx0, rtop); dock = box(rx0, rtop + s.clusterH + s.group, s.clusterW, DOCK_H);
  } else if (layout === "portrait") {
    h = portraitTrayH(dev, a);
    padAt = [EDGE, EDGE]; cl = cluster(s, W - EDGE - s.clusterW, EDGE + Math.round((s.cross - s.clusterH) / 2));   // the actions at the right edge: a narrow phone closes the gap between the groups
    if (st) { const x0 = Math.round((W - s.roomsRowW) / 2), y = EDGE + s.cross + s.rowGap; roomsAt = ROOMS.map((id, i) => [id, x0 + i * (s.mid + s.gap), y]); }
  } else {   // laptop
    const m = EDGE_X_LAPTOP, need = (list) => list.reduce((t, w) => t + w, 0) + (list.length - 1) * g + 2 * m, list1 = st ? [s.cross, s.roomsRowW, s.clusterW] : [s.cross, s.clusterW];
    let g = s.group, oneRow = need(list1) <= W;
    if (!oneRow) { g = s.gap; oneRow = need(list1) <= W; if (!oneRow) g = s.group; }   // a tight tray closes the gaps between the groups to the gap inside one before it takes a second row
    const rowH = laptopRowH(a);
    if (oneRow) {
      h = rowH; padAt = [m, EDGE]; cl = cluster(s, W - m - s.clusterW, EDGE + Math.round((s.cross - s.clusterH) / 2));
      if (st) { const lo = m + s.cross + g, hi = W - m - s.clusterW - g - s.roomsRowW, x0 = Math.round(Math.min(Math.max((W - s.roomsRowW) / 2, lo), hi)); roomsAt = ROOMS.map((id, i) => [id, x0 + i * (s.mid + s.gap), EDGE + Math.round((s.cross - s.mid) / 2)]); }
    } else if (st) {   // row 1 the D-pad and the actions, row 2 the room keys centred
      rows = 2; h = rowH + 2 * EDGE + s.mid - EDGE; const wide = need([s.cross, s.clusterW]) <= W;
      padAt = [wide ? m : Math.max(0, Math.round((W - s.cross) / 2)), EDGE]; cl = cluster(s, W - (wide ? m : Math.max(0, Math.round((W - s.clusterW) / 2))) - s.clusterW, EDGE + Math.round((s.cross - s.clusterH) / 2));
      const x0 = Math.round((W - s.roomsRowW) / 2); roomsAt = ROOMS.map((id, i) => [id, x0 + i * (s.mid + s.gap), rowH]);
    } else {   // the Companion, short of width: the D-pad centred, the actions centred under it
      rows = 2; h = EDGE + s.cross + s.rowGap + s.clusterH + EDGE;
      padAt = [Math.round((W - s.cross) / 2), EDGE]; cl = cluster(s, Math.round((W - s.clusterW) / 2), EDGE + s.cross + s.rowGap);
    }
  }
  const p = pad(a, padAt[0], padAt[1]);
  for (const id of ["up", "left", "right", "down"]) keys[id] = p[id];
  Object.assign(keys, cl); if (roomsAt) for (const [id, x, y] of roomsAt) keys[id] = box(x, y, s.mid, s.mid);
  // touch areas: half the gap round each key (the D-pad: round its square), inside the tray, never under 44 × 44
  const bw = W, bh = h, hg = s.gap / 2, grow = ([x, y, w, hh], e) => { let x0 = Math.max(0, x - e), y0 = Math.max(0, y - e), x1 = Math.min(bw, x + w + e), y1 = Math.min(bh, y + hh + e);
    if (x1 - x0 < MIN_TOUCH) { x0 = Math.max(0, x + w / 2 - MIN_TOUCH / 2); x1 = x0 + MIN_TOUCH; } if (y1 - y0 < MIN_TOUCH) { y0 = Math.max(0, y + hh / 2 - MIN_TOUCH / 2); y1 = y0 + MIN_TOUCH; } return box(x0, y0, x1 - x0, y1 - y0); };
  const zones = {}; for (const id of Object.keys(keys)) if (!["up", "left", "right", "down"].includes(id)) zones[id] = grow(keys[id], hg);
  const padZone = grow(p.pad, hg);
  return { a, h, rows, keys, hub: p.hub, pad: p.pad, zones, padZone, dock, LW, RW };
}

// the D-pad's one touch zone, split by its diagonals into four wedges: (x, y) a point in the same coordinates as zone; a dead centre of radius a/3 presses nothing
export function padDir(x, y, zone, a) {
  const dx = x - (zone[0] + zone[2] / 2), dy = y - (zone[1] + zone[3] / 2);
  if (Math.hypot(dx, dy) < a / 3) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

// the Dock key's size and the keyboard names for the laptop hover hint
export const KEYBOARD = { up: "Arrow up", down: "Arrow down", left: "Arrow left", right: "Arrow right", call: "C", back: "Esc", confirm: "Enter", home: "H", research: "R", vivarium: "B", library: "L" };
