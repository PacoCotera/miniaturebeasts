// The key tray's geometry (ui-keys-1, signed by the UI desk; moved to the one-device layout by ui-play-layout-2): one measure, a = the D-pad's arm, and every other size a fixed multiple of it, so the keys are one family at every size.
// Pure (no DOM), so the plans are unit-tested (tests/keyplan.test.mjs). Lengths are CSS px. Two layouts:
//   "portrait"  a phone held upright: the tray fills the panel's width under the screen; the D-pad and the actions on the tray's last row (the same line for both devices), the Station's four room keys in one row above it
//   "landscape" a phone on its side, and a laptop: the tray is the whole panel, a column each side of the screen; the D-pad at the left with the Station's rooms 2 × 2 under it (kept empty on the Companion, so the D-pad never moves),
//               the actions at the right with the Dock key and the dock's-screen button under them
// D-pad 3a across (a cross: four arms round a hub); Call, ← and the room keys 1.2a; ✓ 1.7a: the D-pad is 1.74 to 1.8 times ✓ at every size, as on the devices' own pages (1.70, 1.82; the hardware study 1.67).
// Arrangement (both devices): Call above ←, ✓ to their right, centred on that column.

export const STEPS = [44, 48, 56];
const r4 = (x) => Math.round(x / 4) * 4;
export const EDGE = 12, DOCK_H = 44, MIN_TOUCH = 44, DOCK_GAP = 16, EPAPER_GAP = 8;   // EDGE: the panel's edge (space-12)
export const IDS = { station: ["up", "left", "right", "down", "home", "research", "vivarium", "library", "call", "back", "confirm"], companion: ["up", "left", "right", "down", "call", "back", "confirm"] };
export const ROOMS = ["home", "research", "vivarium", "library"];

export function sizes(a) {
  const mid = r4(1.2 * a), big = r4(1.7 * a), gap = Math.max(8, r4(a / 4)), group = r4(a / 2), rowGap = r4(a / 3);
  return { a, cross: 3 * a, mid, big, gap, group, rowGap,
    clusterW: mid + gap + big, clusterH: Math.max(2 * mid + gap, big),   // Call above ←, ✓ to their right
    roomsRowW: 4 * mid + 3 * gap, roomsGrid: 2 * mid + gap };
}

// a portrait tray's height: the Companion's is the D-pad row; the Station's has its room row above it (so the D-pad's line is the same for both)
export const portraitTrayH = (dev, a) => { const s = sizes(a); return 2 * EDGE + s.cross + (dev === "station" ? s.rowGap + s.mid : 0); };
// the two columns of the sideways layout: the D-pad's, the actions' (and the Dock key's)
export const sideCols = (a) => { const s = sizes(a); return { LW: EDGE + Math.max(s.cross, s.roomsGrid) + EDGE, RW: EDGE + s.clusterW + EDGE }; };
// the height of the columns' content: the left (D-pad, group, rooms 2 × 2; the same for both devices), the right (actions, the Dock key, the dock's-screen button)
export const leftColH = (a) => { const s = sizes(a); return s.cross + s.group + s.roomsGrid; };

// the largest step that fits both devices in the area (the same a for both, so switching devices never resizes the D-pad). portrait: W is the panel's width; landscape: H is the panel's height; a laptop is always 44
export function pickA(layout, W, H) {
  if (layout === "laptop") return 44;
  let best = 44;
  for (const a of STEPS) {
    const s = sizes(a);
    const fitsW = 2 * EDGE + s.cross + s.group + s.clusterW <= W;   // portrait: the D-pad and the actions side by side
    const fitsH = leftColH(a) <= H - 2 * EDGE;   // landscape: the columns
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

// plan(dev, layout, W, H, a?): W × H is the tray's box (portrait: W is the width and H is ignored, the tray's height is returned; landscape: the whole panel).
// Returns { a, h, keys: { id: [x, y, w, h] }, hub: [x, y, a], pad: [x, y, w, h], zones, padZone, dock, epaper, LW, RW }.
// zones: each key's touch area, its box grown by half the gap round it, kept inside the tray, never under 44 × 44; the D-pad is one zone (padZone) split into four wedges by padDir.
export function plan(dev, layout, W, H, aGiven) {
  const a = aGiven || pickA(layout, W, H), s = sizes(a), st = dev === "station", keys = {};
  let h, dock = null, epaper = null, padAt, cl, roomsAt = null, LW = 0, RW = 0;
  if (layout === "landscape") {
    ({ LW, RW } = sideCols(a)); h = H;
    const top = Math.round(centreY(0, H, leftColH(a)));   // the left column is placed from the Station's height for both devices: the D-pad never moves
    padAt = [EDGE + Math.round((LW - 2 * EDGE - s.cross) / 2), top];
    if (st) { const rx = EDGE + Math.round((LW - 2 * EDGE - s.roomsGrid) / 2), ry = top + s.cross + s.group; roomsAt = ROOMS.map((id, i) => [id, rx + (i % 2) * (s.mid + s.gap), ry + Math.floor(i / 2) * (s.mid + s.gap)]); }
    const rx0 = W - RW + EDGE, cy0 = top + Math.round((s.cross - s.clusterH) / 2);
    cl = cluster(s, rx0, cy0);
    dock = box(rx0, cy0 + s.clusterH + DOCK_GAP, s.clusterW, DOCK_H); epaper = box(rx0, dock[1] + DOCK_H + EPAPER_GAP, s.clusterW, DOCK_H);
  } else {   // portrait: the D-pad and the actions on the last row, the Station's rooms in one row above it
    h = portraitTrayH(dev, a);
    const py = h - EDGE - s.cross;
    padAt = [EDGE, py]; cl = cluster(s, W - EDGE - s.clusterW, py + Math.round((s.cross - s.clusterH) / 2));   // the actions at the right edge: a narrow phone closes the gap between the groups
    if (st) { const x0 = Math.round((W - s.roomsRowW) / 2); roomsAt = ROOMS.map((id, i) => [id, x0 + i * (s.mid + s.gap), EDGE]); }
  }
  const p = pad(a, padAt[0], padAt[1]);
  for (const id of ["up", "left", "right", "down"]) keys[id] = p[id];
  Object.assign(keys, cl); if (roomsAt) for (const [id, x, y] of roomsAt) keys[id] = box(x, y, s.mid, s.mid);
  // touch areas: half the gap round each key (the D-pad: round its square), inside the tray, never under 44 × 44
  const bw = W, bh = h, hg = s.gap / 2, grow = ([x, y, w, hh], e) => { let x0 = Math.max(0, x - e), y0 = Math.max(0, y - e), x1 = Math.min(bw, x + w + e), y1 = Math.min(bh, y + hh + e);
    if (x1 - x0 < MIN_TOUCH) { x0 = Math.max(0, x + w / 2 - MIN_TOUCH / 2); x1 = x0 + MIN_TOUCH; } if (y1 - y0 < MIN_TOUCH) { y0 = Math.max(0, y + hh / 2 - MIN_TOUCH / 2); y1 = y0 + MIN_TOUCH; } return box(x0, y0, x1 - x0, y1 - y0); };
  const zones = {}; for (const id of Object.keys(keys)) if (!["up", "left", "right", "down"].includes(id)) zones[id] = grow(keys[id], hg);
  const padZone = grow(p.pad, hg);
  return { a, h, keys, hub: p.hub, pad: p.pad, zones, padZone, dock, epaper, LW, RW };
}

// the D-pad's one touch zone, split by its diagonals into four wedges: (x, y) a point in the same coordinates as zone; a dead centre of radius a/3 presses nothing
export function padDir(x, y, zone, a) {
  const dx = x - (zone[0] + zone[2] / 2), dy = y - (zone[1] + zone[3] / 2);
  if (Math.hypot(dx, dy) < a / 3) return null;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

// the keyboard names for the laptop hover hint
export const KEYBOARD = { up: "Arrow up", down: "Arrow down", left: "Arrow left", right: "Arrow right", call: "C", back: "Esc", confirm: "Enter", home: "H", research: "R", vivarium: "B", library: "L" };
