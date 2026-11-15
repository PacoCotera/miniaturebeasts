// The cliff system's template (pixel desk spec cliff-system.md section 3): ONE schematic sheet, 16 art px a cell, laid out as mock places T1-T7, every piece of the set drawn as a GREYBOX of flat value
// zones in the art director's values, placed by the game's own piece table and pick (src/bake/cliffsystem.mjs) over each mock place's land. A schematic, made in code (rules.md 18: diagrams and schematics may be
// code); never shipped: it is the paint calls' init and mask source, and the greybox set the designer signs for shape. The same cut step cuts the painted sheet later.
//   node tools/cliff-template.mjs <outDir>
// Writes <outDir>/template.png (the clean greybox, the paint init), template-4x.png (4x with the marks: cut boxes, shared edge columns, no-crack bands, strata and lip underside, locked joints, overhangs),
// template-tags.json (each pixel's piece instance and role, run-length rows; the instances' piece ids, zones and boxes; the contract flags), cut-list.json (every piece: id, zone, box in the sheet, the case it
// serves), cut/<id>.png (each piece cut back out of template.png along its box and its own tag mask; level 2 by the table's colour map) and zones.json (the zones' place in the sheet, for the legend).
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { encodePng, newImage, scaleNearest } from '../src/png.mjs';
import { TABLE, BY_ID, placeBoundary, middleOf } from '../src/bake/cliffsystem.mjs';

const OUT = process.argv[2];
if (!OUT) throw new Error('usage: node tools/cliff-template.mjs <outDir>');
const C = 16;

// ---- the values (map-look.md, ramps.md rock rev 2; level 1) and the roles ----
export const VALUES = {
  // AD 11-15: the top is the ground one step up its own ramp, its edges a lit band at the ramp's lightest (#a8d082). The game's meadow ground measures #74a65d (143), so the top is #82b266 (155, +12) and the band +44;
  // the ruling's example (#82b266 -> #8cba68) would be two steps over the measured ground (reported in final.md)
  meadow: '#74a65d', top: '#82b266', rimlit: '#a9d082', drop: '#5e9357',   // rimlit: the top's band, a colour of its own (a day twin of #a8d082, which signed live art also uses)
  mosslight: '#cde38a', moss: '#aac46e', mossdark: '#52753a',
  edge: '#9eadb9', lit: '#8497a5', shade: '#6c7682', crack: '#474d55',
  foot1: '#4a814e', foot2: '#36603a', tread: '#9eadb9', riser: '#6c7682',
};
const ROLES = ['ground', 'top', 'lip', 'rock', 'foot', 'rim', 'side', 'stair'];
const FLAG = { edge: 1, band: 2, strata: 4, underside: 8, joint: 16, over: 32 };

// ---- a piece raster: value name and role per pixel, contract flags ----
const P = (w, h) => ({ w, h, v: new Array(w * h).fill(null), r: new Array(w * h).fill(null), f: new Uint8Array(w * h) });
const put = (p, x, y, v, r, f = 0) => { if (x < 0 || y < 0 || x >= p.w || y >= p.h) return; const i = y * p.w + x; p.v[i] = v; p.r[i] = r; p.f[i] |= f; };
const flag = (p, x, y, f) => { if (x >= 0 && y >= 0 && x < p.w && y < p.h) p.f[y * p.w + x] |= f; };
const mirror = (p) => { const q = P(p.w, p.h); for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) { const i = y * p.w + x, j = y * p.w + (p.w - 1 - x); q.v[j] = p.v[i]; q.r[j] = p.r[i]; q.f[j] = p.f[i]; } return q; };
const swapLight = (p) => { for (let i = 0; i < p.v.length; i++) if (p.v[i] === 'lit') p.v[i] = 'shade'; else if (p.v[i] === 'edge' && p.r[i] !== 'stair') p.v[i] = 'lit'; return p; };

// The face column: 16 x 80 from the lip row's top. yt: the lip's top edge (6 on a straight column); the strata and the lip underside sit at fixed offsets from it (the edge contract).
// rock(x, yy): the value of rock pixel (x, yy = rows below the lip top), so a diagonal shares the straight column's strata.
const LIP = { top: 0, light: 0, moss: [1, 5], dark: 6, under: 7, rock0: 8, s1: 24, s2: 41, rock1: 57, foot: [58, 61], end: 73 };
function rockValue(yy, x, cracks) {
  if (yy === LIP.under) return 'crack';
  if (yy === LIP.s1 || yy === LIP.s2) return 'crack';
  const s = yy < LIP.s1 ? 0 : yy < LIP.s2 ? 1 : 2, first = s === 0 ? LIP.rock0 : s === 1 ? LIP.s1 + 1 : LIP.s2 + 1;
  if (cracks && cracks[s] === x && yy > first) return 'crack';
  if (yy === first) return 'edge';
  if (s === 0) return yy < first + 11 ? 'lit' : 'shade';
  if (s === 1) return yy < first + 11 ? 'lit' : 'shade';
  return yy < first + 6 ? 'lit' : 'shade';   // the lowest stratum is darker: its lower two thirds in shade
}
// the lit band of a top's edge: 2-3 art px, uneven along the edge (3 px at about a third of the columns)
const bandOf = (x) => 2 + (((x * 7 + 3) % 16) % 3 === 0 ? 1 : 0);
function columnPixel(p, x, y, yt, cracks, opts = {}) {
  const yy = y - yt;
  if (yy < 0) return put(p, x, y, -yy <= bandOf(x) ? 'rimlit' : 'top', 'top');
  if (yy === LIP.light) return put(p, x, y, 'mosslight', 'lip');
  if (yy <= LIP.moss[1]) return put(p, x, y, 'moss', 'lip');
  if (yy === LIP.dark) return put(p, x, y, 'mossdark', 'lip');
  if (yy <= LIP.rock1) return put(p, x, y, rockValue(yy, x, cracks), 'rock', yy === LIP.under ? FLAG.underside : yy === LIP.s1 || yy === LIP.s2 ? FLAG.strata : 0);
  if (yy <= LIP.foot[1]) return put(p, x, y, yy <= LIP.foot[0] + 1 ? 'foot2' : 'foot1', 'foot');
  if (yy <= LIP.end && !opts.noFootMask) return put(p, x, y, null, 'foot');
}
// the slabs: one vertical crack per stratum (or none) inside the tile, never in the 3 px bands at its edges (look 1); different for each middle
const cracksOf = (set, letter) => [0, 1, 2].map((s) => ((set + letter + s) % 3 === 0 ? -1 : 3 + ((set * 7 + letter * 5 + s * 3) % 10)));

function middle(set, letter) {
  const p = P(16, 80), cracks = cracksOf(set, letter);
  for (let y = 0; y < 80; y++) for (let x = 0; x < 16; x++) columnPixel(p, x, y, 6, cracks);
  for (let y = 6 + LIP.rock0; y <= 6 + LIP.rock1; y++) {
    for (const x of [0, 15]) flag(p, x, y, FLAG.edge);
    for (const x of [0, 1, 2, 13, 14, 15]) flag(p, x, y, FLAG.band);
  }
  for (const x of [0, 15]) for (let y = 0; y < 6 + LIP.foot[1] + 1; y++) flag(p, x, y, FLAG.edge);
  if (letter === 0) for (let y = 0; y < 80; y++) flag(p, 0, y, FLAG.joint);
  if (letter === 5) for (let y = 0; y < 80; y++) flag(p, 15, y, FLAG.joint);
  return p;
}

// A side wall's rock, edge-on: SIDE px of the 16 px flank tile (GD 11-15 b: 12-16, replacing the 6-8 px strip of G0, which read as a fence), two planes of its own: the corner plane (5 px, the lighter) next to the run it
// belongs to, then the far plane; the last 2 px of the tile are the wall's drop shade on the ground. lit: the west-facing wall.
const SIDE = 14;
const wallPx = (c, lit) => (c < 5 ? (lit ? 'edge' : 'lit') : (lit ? 'lit' : 'shade'));
// The wall's top end where it meets the back rim (GD 11-15 fix-2, rule 5): a vertical wall whose outer top corner rounds (radius 8 px, the rim's own rounding), never a slope leaning outward. arcInset(y): the px the
// outer edge sits in from the full width on row y of the head (5, 3, 2, 1, 1, then 0).
const arcInset = (y, R = 8) => (y >= R ? 0 : Math.round(R - Math.sqrt(R * R - (R - y - 0.5) ** 2)));

// End cap, east hand (on the low cell east of a run; cols 0-3 overhang the run's last column): k rows of step, convex (the side wall continues above) or not.
function cap(k, convex, lit = false) {
  const ly = (k - 1) * 16, p = P(20, 80 + ly), cracks = [-1, -1, -1];
  // the overhang over the run's last column: its rock turning away from the light, under the crease (col 0)
  for (let y = ly; y < ly + 80; y++) for (let x = 0; x < 4; x++) {
    const yy = y - ly - 6;
    if (yy < 0) continue;   // the lip cell's top stays the column's own
    columnPixel(p, x, y, ly + 6, cracks, { noFootMask: true });
    const i = y * p.w + x;
    if (p.r[i] === 'rock') p.v[i] = x === 0 && yy > LIP.under ? 'crack' : p.v[i] === 'lit' || p.v[i] === 'edge' ? 'shade' : p.v[i];
    if (p.v[i] !== null) p.f[i] |= FLAG.over;
  }
  // with a side above (k >= 2) the side lip's moss turns down the column's corner to meet the face's lip (look 3: the lip wraps onto the side)
  if (k >= 2) for (let y = ly; y < ly + 6; y++) for (let x = 0; x < 4; x++) put(p, x, y, x === 0 ? 'mosslight' : x === 3 ? 'mossdark' : 'moss', 'lip', FLAG.over);
  // GD 11-15 (a): the run's end wraps round: its lip turns down the end (the moss follows the rock's edge, one row to a step), the end's side rock shows as a strip SIDE px wide with its own two planes
  // (the corner plane and the far plane, no crease line), and the foot under it. The strip is the same as the wall pieces' (wallPx), so a wall runs into the cap with no step.
  const sideRock = (yy, c, reach) => wallPx(c, lit);
  for (let y = ly; y < ly + 80; y++) {
    const yy = y - ly - 6;
    if (yy < 0) {   // GD 11-15 (b): the side wall comes down flush to the lip corner: the 6 px above the lip row's moss are wall too (they were left empty: the wall stopped 20 px short of the lip)
      if (k >= 2 && y >= ly) { for (let c = 0; c < SIDE; c++) put(p, 4 + c, y, wallPx(c, lit), 'side'); for (let c = SIDE; c < SIDE + 2; c++) put(p, 4 + c, y, 'drop', 'side'); }
      continue;
    }
    if (yy <= LIP.dark) {   // the lip row wraps: moss across the strip, its light edge on top, its dark edge underneath
      const reach = Math.min(SIDE, 3 + yy);
      for (let c = 0; c < reach; c++) put(p, 4 + c, y, yy === 0 ? 'mosslight' : yy === LIP.dark ? 'mossdark' : 'moss', 'lip');
      continue;
    }
    if (yy <= LIP.rock1) {
      const reach = yy <= LIP.under + 3 ? SIDE - 1 : SIDE;   // the rock's edge rounds under the lip by a pixel
      for (let c = 0; c < reach; c++) put(p, 4 + c, y, yy === LIP.under || yy === LIP.s1 || yy === LIP.s2 ? 'crack' : sideRock(yy, c, reach), 'side');
      continue;
    }
    if (yy <= LIP.foot[1]) for (let c = 0; c < SIDE + 2; c++) put(p, 4 + c, y, yy <= LIP.foot[0] + 1 ? 'foot2' : 'foot1', 'foot');
  }
  // above the lip row: the run's side seen edge-on (k >= 2); the lip's moss turns down the strip's top edge into the cap (a step-down's wall ends under the back run's lip, a convex corner's runs on up)
  for (let y = 0; y < ly; y++) {
    const reach = convex ? SIDE : SIDE - arcInset(y);   // a step-down's wall: upright, its top corner rounded (no slope leaning out)
    for (let c = 0; c < reach; c++) put(p, 4 + c, y, wallPx(c, lit), 'side');
    for (let c = reach; c < Math.min(reach + 2, SIDE + 2); c++) put(p, 4 + c, y, 'drop', 'side');
  }
  return p;
}

// Concave, east hand: the run's last column, the wall of the land to the east standing in front of it, the crease in shadow between.
// GD 11-15 fix-2 (1): the wall is the same 14 of 16 px as every flank (the corner plane 5 px, the lit plane, and the crease in shadow inside the 14: its 2 darkest columns), never a 5 px strip; only the 2 px on the
// face's side keep the face's own rock. The wall runs on through the foot rows (the land's wall goes on south). The lip row across the cell is the face's own.
function concave() {
  const p = middle(1, 2);
  for (let y = 0; y < 80; y++) {
    const yy = y - 6;
    if (yy <= LIP.dark) continue;
    if (yy > LIP.under && yy <= LIP.rock1) for (let x = 0; x < 16 - SIDE; x++) put(p, x, y, 'shade', 'rock');   // the 2 px on the face's side are the crease's shadow: no strata ticks, so the corner reads the same beside a face and beside a steep wall
    // GD 11-15 fix-3 (1): the crease is only where the face's rock is beside the wall; below the face's rock the wall is the flank's own (14 px, its two planes, the 2 px drop shade on the ground side), so the
    // flank's outer edge is one straight line from the corner to the wall's end, never a dark strip and then a wider wall one cell lower
    const crease = yy <= LIP.rock1;
    for (let x = 16 - SIDE; x < 16; x++) put(p, x, y, crease && x === 16 - SIDE ? 'crack' : crease && x === 17 - SIDE ? 'shade' : wallPx(15 - x, true), 'side');
    if (yy > LIP.foot[1]) for (let x = 0; x < 16 - SIDE; x++) put(p, x, y, 'drop', 'side');
  }
  return p;
}

// Side pieces. The wall of a block's east side (flank cell east of raised land) faces away from the light: shade; the west side faces it: lit.
function lipSide() {   // east hand: the ring cell with low ground to its east
  const p = P(16, 16);
  // the lip seen from above is 3 px of moss (light, mid, dark) on the cell's far edge, the rock of the wall follows in the flank cell: no lime strip
  // GD/AD 11-15 fix-2 (4): no lit edge (the band's lime, #cde38a) down the inside of a side wall: the side lip is moss over a dark moss shadow on the wall's edge
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(p, x, y, x < 13 ? 'top' : x === 15 ? 'mossdark' : 'moss', x < 13 ? 'top' : 'lip');
  return p;
}
// east hand: the flank cell east of raised land. head: the wall starts thin under the rounded back corner; band; tail: the last wall cell, over the corner cap or the land it meets (the greybox draws it as the band:
// the cap carries the turn). lit: a west-facing wall (toward the light) is lit, an east-facing one in shade.
const HEAD_TOP = 9;   // the rim's arc ends on row 8 of the ring cell (rim(): centre row 8.5, radius 7.5); the straight side lip starts on row 9
function wall(part, lit) {
  const p = P(16, 16);
  for (let y = part === 'head' ? HEAD_TOP : 0; y < 16; y++) {   // GD 11-15 fix-3 (3): a head starts below the back corner's arc (the rim's lip turns there and runs down the wall's inner edge): the rock starts under the lip, never up at the rim line as a cap
    const reach = part === 'head' ? SIDE - arcInset(y - HEAD_TOP) : SIDE;
    for (let x = 0; x < reach; x++) put(p, x, y, wallPx(x, lit), 'side');
    for (let x = reach; x < Math.min(reach + 2, 16); x++) put(p, x, y, 'drop', 'side');
  }
  return p;
}
// The back rim: the ring cell (rows 16-31) with its thin lit edge, the drop shade on the low cell north of it (rows 12-15). Rounded back corners cut the ring cell's outer corner round.
function rim(corner) {
  const p = P(16, 32);
  for (let y = 12; y < 16; y++) for (let x = 0; x < 16; x++) put(p, x, y, y < 14 ? 'drop' : 'foot1', 'rim');
  for (let y = 16; y < 32; y++) for (let x = 0; x < 16; x++) put(p, x, y, y - 16 < bandOf(x) ? 'rimlit' : 'top', y - 16 < bandOf(x) ? 'rim' : 'top');
  if (corner) {   // east hand: round the north-east corner of the ring cell (radius 7)
    const cx = 8.5, cy = 24.5, r = 7.5;
    for (let y = 12; y < 32; y++) for (let x = 0; x < 16; x++) {
      if (x <= cx || y >= cy) continue;
      const d = Math.hypot(x - cx, y - cy);
      if (y >= 16 && d > r + 1) put(p, x, y, 'meadow', 'rim');
      else if (y >= 16 && d > r) put(p, x, y, (cy - y) > 0.7 * (x - cx) ? 'rimlit' : 'mossdark', 'rim');   // the lit edge of the back rim turns into the side lip where the corner faces east (no lit band down a side wall)
      else if (y >= 16 && d > r - 2.5 && (cy - y) <= 0.7 * (x - cx)) put(p, x, y, 'moss', 'lip');
      if (y < 16 && x > 12) put(p, x, y, null, null);
    }
    // the side lip carries on down the east edge below the arc (the lip-side pieces' own 3 px: moss, moss, dark moss), so the lip runs along the top's edge to the corner and rounds with it
    for (let y = 25; y < 32; y++) for (let x = 13; x < 16; x++) put(p, x, y, x === 15 ? 'mossdark' : 'moss', 'lip');
    for (let y = 17; y < 32; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - cx, y - cy); if (x > cx && y < cy && d > r + 1 && d <= r + 3) put(p, x, y, 'drop', 'rim'); }
  }
  return p;
}
const topPiece = () => { const p = P(16, 16); for (let i = 0; i < 256; i++) { p.v[i] = 'top'; p.r[i] = 'top'; } return p; };

// cliff-contour-1: the back rim on a slope (16 x 32 from the low cell north of the ring cell, as rim()): the rim line (the top's north edge) runs from the west edge at row 16 + 8 vL to the east edge at
// 16 + 8 vR (vL, vR: -1 half a row up, +1 half a row down), the drop shade's 4 rows above it, the lit band under it, the top below; the ring cell's pixels above the line are the meadow (the low ground shows).
function rimSlope(vL, vR) {
  const p = P(16, 32);
  for (let x = 0; x < 16; x++) {
    const yb = Math.round(16 + 8 * vL + (vR - vL) * (x + 0.5) / 2);
    for (let y = 0; y < 32; y++) {
      if (y < yb - 4) { if (y >= 16) put(p, x, y, 'meadow', 'rim'); continue; }
      if (y < yb) { put(p, x, y, y < yb - 2 ? 'drop' : 'foot1', 'rim'); continue; }
      if (y - yb < bandOf(x)) put(p, x, y, 'rimlit', 'rim'); else put(p, x, y, 'top', 'top');
    }
  }
  return p;
}

// cliff-contour-1: a lean, west hand (the wall's outside to the west, raised land to the east; 32 x 32 from the upper wall's last flank cell, rows: the lip row and the row under it). The wall's edge e(y) (the
// raised land's west edge, px from the box's west side) moves from 16 (the upper wall: the flank is the west cell) to 32 (the lower wall: the flank is the lip's own column) at 45 degrees between rows 8 and 24:
// east of e the top with the side lip's 3 px of moss on its edge (as lip-side), west of e the wall's SIDE px of rock in its two planes and the 2 px drop shade, as the wall pieces, so the upper wall runs into
// the lean and the lean into the lower wall with no step. lit: the west-facing wall is lit.
function leanIn(lit = true) {
  const p = P(32, 32);
  for (let y = 0; y < 32; y++) {
    const e = 16 + Math.max(0, Math.min(16, y - 8));
    for (let x = 0; x < 32; x++) {
      if (x >= e) { const d = x - e; put(p, x, y, d === 0 ? 'mossdark' : d < 3 ? 'moss' : 'top', d < 3 ? 'lip' : 'top'); continue; }
      const c = e - 1 - x;
      if (c < SIDE) put(p, x, y, wallPx(c, lit), 'side'); else if (c < SIDE + 2) put(p, x, y, 'drop', 'side');
    }
  }
  return p;
}
// an outward lean, west hand (32 x 32 from the row above the corner: the upper wall's last flank cell and the corner's row; columns: the lower wall's flank cell, the corner's column): the edge moves from 32 to 16
function leanOut(lit = true) {
  const p = P(32, 32);
  for (let y = 0; y < 32; y++) {
    const e = 32 - Math.max(0, Math.min(16, y - 8));
    for (let x = 0; x < 32; x++) {
      if (x >= e) { const d = x - e; put(p, x, y, d === 0 ? 'mossdark' : d < 3 ? 'moss' : 'top', d < 3 ? 'lip' : 'top'); continue; }
      const c = e - 1 - x;
      if (c < SIDE) put(p, x, y, wallPx(c, lit), 'side'); else if (c < SIDE + 2) put(p, x, y, 'drop', 'side');
    }
  }
  return p;
}

// The way up, west half (16 x 96 from the landing row): the cheek (cols 0-2) is face rock with the lip, the stair cut through lip and rock, its cap on the lip line, its foot inside its footprint.
function wayHalf() {
  const p = P(16, 96);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) put(p, x, y, 'top', 'top');
  for (let y = 16; y < 96; y++) for (let x = 0; x < 3; x++) columnPixel(p, x, y, 22, [-1, -1, -1]);
  for (let y = 22; y < 96; y++) put(p, 2, y, y < 29 ? 'mossdark' : y <= 79 ? 'crack' : null, y <= 79 ? 'rock' : 'foot');
  for (let y = 16; y < 22; y++) for (let x = 3; x < 16; x++) put(p, x, y, 'top', 'stair');   // the landing runs to the lip line
  for (let y = 22; y < 25; y++) for (let x = 3; x < 16; x++) put(p, x, y, 'edge', 'stair');  // the stair's top cap, on the lip line
  for (let y = 25; y < 80; y++) {
    const s = (y - 25) % 13, last = y === 79;
    for (let x = 3; x < 16; x++) put(p, x, y, last || s === 12 ? 'crack' : s < 4 ? 'tread' : 'riser', 'stair');
  }
  for (let y = 80; y < 82; y++) for (let x = 0; x < 16; x++) put(p, x, y, 'foot1', 'foot');
  return p;
}

// Diagonal, down to the east (16 x 112 from the row above the lip): the lip's top on the slope, the strata and lip underside at the straight column's offsets from it.
// cliff-contour-1, the slope rule: the lip line runs from the column's west edge to its east edge through the half rows between its lip and its neighbours': mid (-8 -> +8 px, the 45 degree line);
// start (0 -> +8 px) and end (-8 -> 0 px) are the two halves of a 2:1 slope, one even line (a column's lip falls 1 px every 2 px), so a 2:1 stretch (end, start, end, start ...) is one straight line and
// a 2:1 half beside a 45 degree column bends the line, never a right angle.
function diagonal(role) {
  const p = P(16, 112);
  const yt = (x) => 16 + (role === 'start' ? 6 + Math.round(x / 2) : role === 'mid' ? -2 + x : -2 + Math.round(x / 2));
  for (let x = 0; x < 16; x++) for (let y = 0; y < 112; y++) {
    // GD 11-15 fix-3 (2): a start piece leaves the west 3 px of the row above its lip alone: that is the side lip of the wall above (lip-side), which runs on down to the start's own lip, never cut off by a plain top
    if (role === 'start' && x < 3 && y < 16) continue;
    columnPixel(p, x, y, yt(x), [-1, -1, -1]);
  }
  return p;
}

// A steep run's column (GD 11-15, rule 6, steep runs; down to the east): one side wall running down at an angle, never a slab to a step. d: the rows this column's lip lies above the next one's (0 = the run's last column,
// which takes the slope 2). Edge-on rock in two planes (the lit corner plane under the lip, the lit plane, the shade plane under the crease) with no strata and no cracks; the crease runs down the slope, from 22 px under
// the lip at the column's west edge, d rows (d x 16 px) lower at its east edge, where the next column's lip lies: so the crease is one line along the whole run. The lip steps down along the top (flat per column, the vertical
// lip piece beside the next column joins them), no lit band along it (the wall's own lit plane is the edge), and the foot follows below at each column's foot row.
function steepCol(d) {
  // the relief blocks this column down to the next column's foot row (its end rows), so the wall runs d rows lower than a face: its foot is d rows lower, where the pawn can stand
  const p = P(16, 80 + 16 * d), slope = d || 2, ext = 16 * d;
  for (let x = 0; x < 16; x++) for (let y = 0; y < p.h; y++) {
    const yy = y - 6;
    if (yy < 0) { put(p, x, y, 'top', 'top'); continue; }
    if (yy === LIP.light) { put(p, x, y, 'mosslight', 'lip'); continue; }
    if (yy <= LIP.moss[1]) { put(p, x, y, 'moss', 'lip'); continue; }
    if (yy === LIP.dark) { put(p, x, y, 'mossdark', 'lip'); continue; }
    if (yy <= LIP.rock1 + ext) { put(p, x, y, yy === LIP.under ? 'crack' : yy <= LIP.under + 3 ? 'edge' : yy < 22 + slope * x ? 'lit' : 'shade', 'rock', yy === LIP.under ? FLAG.underside : 0); continue; }
    if (yy <= LIP.foot[1] + ext) { put(p, x, y, yy <= LIP.foot[0] + 1 + ext ? 'foot2' : 'foot1', 'foot'); continue; }
    if (yy <= LIP.end + ext) put(p, x, y, null, 'foot');
  }
  return p;
}

// every piece of the table, drawn (level 1)
const LET = TABLE.pick.letters;
const DRAW = new Map();
for (let s = 0; s < 3; s++) for (let l = 0; l < 6; l++) DRAW.set(`mid-${s + 1}${LET[l]}`, middle(s, l));
for (const k of [1, 2, 3]) { DRAW.set(`end-e-${k}`, cap(k, false)); DRAW.set(`end-w-${k}`, mirror(cap(k, false, true))); }
DRAW.set('convex-e', cap(3, true)); DRAW.set('convex-w', mirror(cap(3, true, true)));
DRAW.set('concave-e', concave()); DRAW.set('concave-w', swapLight(mirror(concave())));
for (const r of ['start', 'mid', 'end']) { DRAW.set(`dr-${r}`, diagonal(r)); DRAW.set(`dl-${r}`, swapLight(mirror(diagonal(r)))); }
for (const d of [1, 2, 3, 0]) { DRAW.set(`steep-r-${d || 'end'}`, steepCol(d)); DRAW.set(`steep-l-${d || 'end'}`, swapLight(mirror(steepCol(d)))); }
DRAW.set('way-l', wayHalf()); DRAW.set('way-r', swapLight(mirror(wayHalf())));
DRAW.set('lip-side-e', lipSide()); DRAW.set('lip-side-w', mirror(lipSide()));
for (const part of ['head', 'band', 'tail']) { DRAW.set(`wall-e-${part}`, wall(part, false)); DRAW.set(`wall-w-${part}`, mirror(wall(part, true))); }
DRAW.set('rim-n', rim(false)); DRAW.set('rim-ne', rim(true)); DRAW.set('rim-nw', mirror(rim(true)));
for (const [r, vl, vr] of [['start', 0, 1], ['mid', -1, 1], ['end', -1, 0]]) { DRAW.set(`rim-dr-${r}`, rimSlope(vl, vr)); DRAW.set(`rim-dl-${r}`, mirror(rimSlope(vl, vr))); }
DRAW.set('lean-w', leanIn(true)); DRAW.set('lean-e', mirror(leanIn(false)));
DRAW.set('lean-out-w', leanOut(true)); DRAW.set('lean-out-e', mirror(leanOut(false)));
DRAW.set('top', topPiece());
for (const p of TABLE.pieces) if (!DRAW.has(p.id)) throw new Error(`no greybox for ${p.id}`);
for (const [id, d] of DRAW) { const b = BY_ID.get(id).box; if (b[2] !== d.w || b[3] !== d.h) throw new Error(`${id}: drawn ${d.w} x ${d.h}, table box ${b[2]} x ${b[3]}`); }

// ---- the zones: mock places (rows of the land: . low, 1 level 1, 2 level 2, w raised way cell, v low way cell); the land past a zone's edge is its edge row or column ----
const rep = (s, n) => s.repeat(n);
const ZONES = [
  { id: 'T1', label: 'T1 long run: W end k1 | F3 | 18 middles A1..F3 | A1 | E end k1', at: [16, 16],
    rows: [rep('1', 26), rep('1', 26), rep('1', 26), '...' + rep('1', 20) + '...', ...Array(5).fill(rep('.', 26))],
    pick: (x, y) => (y === 3 && x >= 4 && x <= 21 ? `mid-${((x - 4) / 6 | 0) + 1}${LET[(x - 4) % 6]}` : y === 3 && x === 3 ? 'mid-3F' : y === 3 && x === 22 ? 'mid-1A' : y === 2 ? ['mid-1D', 'mid-1E', 'mid-1F'][x % 3] : null) },
  { id: 'T2a', label: 'T2a step-down k1 (W and E ends against the back run)', at: [16, 192],
    rows: [rep('1', 10), rep('1', 10), rep('1', 10), '...1111...', ...Array(5).fill(rep('.', 10))] },
  { id: 'T2b', label: 'T2b step-down k2', at: [192, 192],
    rows: [rep('1', 10), rep('1', 10), rep('1', 10), '...1111...', '...1111...', ...Array(5).fill(rep('.', 10))] },
  { id: 'T2c', label: 'T2c step-down k3', at: [368, 192],
    rows: [rep('1', 10), rep('1', 10), rep('1', 10), '...1111...', '...1111...', '...1111...', ...Array(5).fill(rep('.', 10))] },
  { id: 'T3a', label: 'T3a convex SW and SE', at: [16, 400],
    rows: [...Array(6).fill('.1111.'), ...Array(5).fill('......')] },
  { id: 'T3b', label: 'T3b concave SW and SE (walls run on south)', at: [128, 400],
    rows: [...Array(3).fill(rep('1', 8)), ...Array(6).fill('11....11')] },
  { id: 'T4', label: 'T4 block 8 x 6: back rim, rounded back corners, side walls, south face', at: [272, 400],
    rows: [rep('.', 12), ...Array(6).fill('..' + rep('1', 8) + '..'), ...Array(5).fill(rep('.', 12))] },
  { id: 'T5', label: 'T5 the way up: 2 wide, plain middles each side', at: [16, 624],
    rows: [rep('1', 10), '1111ww1111', '1111ww1111', '1111ww1111', '....vv....', '....vv....', '....vv....', rep('.', 10), rep('.', 10)] },
  { id: 'T6a', label: 'T6a diagonal down to the east: start, 3 middles, end', at: [192, 624],
    rows: Array.from({ length: 12 }, (_, y) => Array.from({ length: 11 }, (_, x) => (y <= [2, 2, 2, 2, 3, 4, 5, 6, 6, 6, 6][x] ? '1' : '.')).join('')) },
  { id: 'T6b', label: 'T6b diagonal down to the west: end, 3 middles, start', at: [384, 624],
    rows: Array.from({ length: 12 }, (_, y) => Array.from({ length: 11 }, (_, x) => (y <= [6, 6, 6, 6, 5, 4, 3, 2, 2, 2, 2][x] ? '1' : '.')).join('')) },
  { id: 'T7', label: 'T7 stacked: level 0, 1, 2 with the ledge', at: [16, 848],
    rows: [...Array(3).fill(rep('2', 8)), ...Array(6).fill(rep('1', 8)), ...Array(5).fill(rep('.', 8))] },
  { id: 'T8a', label: 'T8a steep run down to the east: drops 2, 3, 1, 2 (one wall, no slab to a step)', at: [176, 848],
    rows: Array.from({ length: 14 }, (_, y) => Array.from({ length: 8 }, (_, x) => (y <= (x >= 5 ? 9 : [1, 3, 6, 7, 9][x]) ? '1' : '.')).join('')) },   // the last column meets the next face (a front run on the same lip row): the steep end ends in step-down form (GD fix-2 (3)); the case where the land's wall runs on south is the concave corner's (placeBoundary)
  { id: 'T8b', label: 'T8b steep run down to the west', at: [336, 848],
    rows: Array.from({ length: 14 }, (_, y) => Array.from({ length: 8 }, (_, x) => (y <= (x <= 2 ? 9 : [9, 7, 6, 3, 1][x - 3]) ? '1' : '.')).join('')) },
  // cliff-contour-1: a hill whose back rim climbs and falls in one-row steps (rim slopes: 45 degree in the middle, 2:1 halves at the turns), its south face with a 2:1 stretch and a 45 degree stretch
  { id: 'T9a', label: 'T9a slopes: back rim up and down in one-row steps; south face 2:1 and 45 degrees', at: [16, 1088],
    rows: ['................', '.......11.......', '......1111......', '.....111111.....', '....11111111....', '1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111', '1111111111111...', '111111111111....', '1111111111......', '11111111........', '................', '................', '................'] },
  // a block whose west wall moves in going south (lean-w) and out again (lean-out-w), and whose east wall moves out (lean-out-e) and in (lean-e)
  { id: 'T9b', label: 'T9b leans: side walls moving one column in and out', at: [304, 1088],
    rows: ['...11111111...', '...11111111...', '...11111111...', '....11111111..', '....11111111..', '....11111111..', '....11111111..', '...11111111...', '...11111111...', '...11111111...', '...11111111...', '...11111111...', '...11111111...', '..............', '..............', '..............', '..............'] },
];
const SHEET_W = 576, SHEET_H = 1360;

// the land of a zone for the boundary below `level`: relief.mjs's accessor
function landOfZone(z, level) {
  const H = z.rows.length, Wd = z.rows[0].length;
  const ch = (x, y) => z.rows[Math.max(0, Math.min(H - 1, y))][Math.max(0, Math.min(Wd - 1, x))];
  const lv = (x, y) => { const c = ch(x, y); return c === '2' ? 2 : c === '1' || c === 'w' ? 1 : 0; };
  return { raised: (x, y) => lv(x, y) >= level, low: (x, y) => lv(x, y) < level, way: (x, y) => ch(x, y) === 'w' || ch(x, y) === 'v', inside: () => true, lv, W: Wd, H };
}

// ---- composite ----
const sheet = { v: new Array(SHEET_W * SHEET_H).fill(null), inst: new Int32Array(SHEET_W * SHEET_H).fill(-1), role: new Int8Array(SHEET_W * SHEET_H).fill(-1), f: new Uint8Array(SHEET_W * SHEET_H), level: new Uint8Array(SHEET_W * SHEET_H) };
const instances = [], zonesOut = [], allMissing = [];
for (const z of ZONES) {
  const A1 = landOfZone(z, 1), Wd = A1.W, H = A1.H, [ox, oy] = z.at;
  zonesOut.push({ id: z.id, label: z.label, x: ox, y: oy, w: Wd * C, h: H * C, rows: z.rows });
  for (let y = 0; y < H * C; y++) for (let x = 0; x < Wd * C; x++) { const i = (oy + y) * SHEET_W + ox + x; sheet.v[i] = 'meadow'; sheet.role[i] = 0; }
  const items = [];
  for (const level of [1, 2]) {
    const A = landOfZone(z, level);
    let any = false; for (let y = 0; y < H && !any; y++) for (let x = 0; x < Wd; x++) if (A.raised(x, y)) { any = true; break; }
    if (!any) continue;
    const r = placeBoundary(A, { x0: 0, y0: 0, x1: Wd - 1, y1: H - 1, key: `template/${z.id}`, level, pick: z.pick ? (x, y) => z.pick(x, y) : null });
    items.push(...r.items);
    for (const m of r.missing) allMissing.push({ zone: z.id, level, ...m });
  }
  items.sort((a, b) => a.line - b.line || a.cls - b.cls || a.level - b.level || a.x - b.x || a.y - b.y);
  for (const it of items) {
    const d = DRAW.get(it.id); if (!d) continue;
    const [bx, by] = it.box, X = it.x * C + bx, Y = it.y * C + by, n = instances.length;
    instances.push({ n, id: it.id, level: it.level, zone: z.id, x: ox + X, y: oy + Y, w: d.w, h: d.h, cell: [it.x, it.y], inside: X >= 0 && Y >= 0 && X + d.w <= Wd * C && Y + d.h <= H * C, own: 0 });
    for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
      const zx = X + x, zy = Y + y; if (zx < 0 || zy < 0 || zx >= Wd * C || zy >= H * C) continue;
      const k = y * d.w + x; if (d.v[k] === null && d.r[k] === null) continue;
      const i = (oy + zy) * SHEET_W + ox + zx;
      if (d.v[k] !== null) { sheet.v[i] = d.v[k]; sheet.inst[i] = n; sheet.role[i] = ROLES.indexOf(d.r[k]); sheet.level[i] = it.level; sheet.f[i] = d.f[k]; instances[n].own++; }
      else if (sheet.inst[i] < 0 || sheet.role[i] <= 0) { sheet.role[i] = ROLES.indexOf(d.r[k]); }   // a masked but unpainted pixel (the foot strip's room) tags its role over plain ground only
    }
  }
}
// a piece instance is clean when every pixel it painted is still its own on the sheet (nothing drawn after it covered it)
const seen = new Int32Array(instances.length);
for (let i = 0; i < sheet.inst.length; i++) if (sheet.inst[i] >= 0) seen[sheet.inst[i]]++;
for (const it of instances) it.clean = seen[it.n] === it.own;

// ---- colours: level 1 values, level 2 through the table's map ----
const L2 = TABLE.levelMap['2'];
const hexOf = (v, level) => { const h = VALUES[v]; return level === 2 && L2[h] ? L2[h] : h; };
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const img = newImage(SHEET_W, SHEET_H);
for (let i = 0; i < sheet.v.length; i++) {
  if (sheet.v[i] === null) continue;
  const lev = sheet.inst[i] >= 0 ? sheet.level[i] : 1, c = rgb(sheet.v[i] === 'meadow' && sheet.inst[i] < 0 ? VALUES.meadow : hexOf(sheet.v[i], lev));
  img.data.set([...c, 255], i * 4);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(path.join(OUT, 'template.png'), encodePng(img));

// ---- the cut list: each piece's canonical instance (clean, inside its zone; its table zone first), cut back out of template.png by its box and its own tag mask ----
mkdirSync(path.join(OUT, 'cut'), { recursive: true });
const cut = [];
for (const p of TABLE.pieces) {
  const cands = instances.filter((it) => it.id === p.id && it.level === 1 && it.clean && it.inside);
  const it = cands.filter((c) => c.zone === p.zone).pop() || cands[0];   // the last drawn in its zone: T1's front run holds the 18 middles in order
  if (!it) { cut.push({ id: p.id, zone: null, box: null, note: 'no clean instance in the template' }); continue; }
  const out = newImage(it.w, it.h), out2 = newImage(it.w, it.h);
  for (let y = 0; y < it.h; y++) for (let x = 0; x < it.w; x++) {
    const i = (it.y + y) * SHEET_W + it.x + x; if (sheet.inst[i] !== it.n) continue;
    out.data.set(img.data.subarray(i * 4, i * 4 + 4), (y * it.w + x) * 4);
    const h = '#' + [0, 1, 2].map((c) => img.data[i * 4 + c].toString(16).padStart(2, '0')).join(''), h2 = L2[h] || h;
    out2.data.set([...rgb(h2), 255], (y * it.w + x) * 4);
  }
  writeFileSync(path.join(OUT, 'cut', `${p.id}.png`), encodePng(out));
  writeFileSync(path.join(OUT, 'cut', `${p.id}@2.png`), encodePng(out2));
  cut.push({ id: p.id, family: p.family, zone: it.zone, box: [it.x, it.y, it.w, it.h], cell: it.cell, serves: { part: p.part, hand: p.hand || null, k: p.k || null, level: '1; 2 by the colour map' }, instances: instances.filter((c) => c.id === p.id).length });
}
writeFileSync(path.join(OUT, 'cut-list.json'), JSON.stringify(cut, null, 1) + '\n');
// --from <sheet.png>: cut a painted sheet (the template's size, the painted canvases laid back in place) along the same boxes, whole boxes only, into <outDir>/cut-from/<id>.png; see-through parts are keyed after, by poststeps
const FROM = process.argv.indexOf('--from');
if (FROM > 0) {
  const { decodePng, crop } = await import('../src/png.mjs');
  const { readFileSync } = await import('node:fs');
  const painted = decodePng(readFileSync(process.argv[FROM + 1]));
  if (painted.w !== SHEET_W || painted.h !== SHEET_H) throw new Error(`--from: ${painted.w} x ${painted.h}, the template is ${SHEET_W} x ${SHEET_H}`);
  mkdirSync(path.join(OUT, 'cut-from'), { recursive: true });
  for (const c of cut) if (c.box) writeFileSync(path.join(OUT, 'cut-from', `${c.id}.png`), encodePng(crop(painted, ...c.box)));
  console.log(`cut ${cut.filter((c) => c.box).length} boxes from ${process.argv[FROM + 1]}`);
}

// ---- the tag map: run-length rows of [count, instance, role, flags] (instance -1 = ground) ----
const rowsOut = [];
for (let y = 0; y < SHEET_H; y++) {
  const row = []; let prev = null;
  for (let x = 0; x < SHEET_W; x++) {
    const i = y * SHEET_W + x, key = [sheet.inst[i], sheet.role[i], sheet.f[i]];
    if (prev && prev[1] === key[0] && prev[2] === key[1] && prev[3] === key[2]) prev[0]++; else { prev = [1, ...key]; row.push(prev); }
  }
  rowsOut.push(row);
}
writeFileSync(path.join(OUT, 'template-tags.json'), JSON.stringify({
  description: 'cliff-system template tags: per pixel the piece instance on top (instance -1: the zone\'s low ground or nothing), its role and the edge-contract flags; rows run-length coded as [count, instance, role, flags]. Roles index `roles` (-1 none). Flags: bit values in `flags`. Instances: piece id, level, zone, box (sheet px), anchor cell (zone cells), clean = no later piece covers any of its pixels.',
  w: SHEET_W, h: SHEET_H, cell: C, roles: ROLES, flags: FLAG, values: VALUES, levelMap: TABLE.levelMap,
  zones: zonesOut, instances: instances.map(({ n, id, level, zone, x, y, w, h, cell, clean }) => ({ n, id, level, zone, box: [x, y, w, h], cell, clean })), rows: rowsOut,
}) + '\n');
writeFileSync(path.join(OUT, 'zones.json'), JSON.stringify(zonesOut, null, 1) + '\n');

// ---- template-4x: the sheet at 4x with the marks ----
const K = 4, big = scaleNearest(img, K);
const mark = (x, y, c) => { if (x < 0 || y < 0 || x >= SHEET_W * K || y >= SHEET_H * K) return; big.data.set([...c, 255], (y * SHEET_W * K + x) * 4); };
const MARK = { grid: [255, 255, 255], cut: [230, 40, 40], edge: [40, 220, 230], band: [40, 120, 230], strata: [250, 210, 40], underside: [250, 130, 30], joint: [230, 40, 230], over: [40, 60, 230] };
for (const z of zonesOut) {   // the 16 px grid, dotted
  for (let y = z.y; y <= z.y + z.h; y += C) for (let x = z.x * K; x < (z.x + z.w) * K; x += 2) mark(x, y * K, MARK.grid);
  for (let x = z.x; x <= z.x + z.w; x += C) for (let y = z.y * K; y < (z.y + z.h) * K; y += 2) mark(x * K, y, MARK.grid);
}
for (let y = 0; y < SHEET_H; y++) for (let x = 0; x < SHEET_W; x++) {   // the contract flags, as small marks inside each 4 x 4 pixel
  const f = sheet.f[y * SHEET_W + x]; if (!f) continue;
  const bx = x * K, by = y * K;
  if (f & FLAG.strata) for (let d = 0; d < K; d++) mark(bx + d, by + 1, MARK.strata);
  if (f & FLAG.underside) for (let d = 0; d < K; d++) mark(bx + d, by + 1, MARK.underside);
  if (f & FLAG.band) mark(bx + 1, by + 1, MARK.band);
  if (f & FLAG.edge) { mark(bx + 2, by + 2, MARK.edge); mark(bx + 2, by + 1, MARK.edge); }
  if (f & FLAG.joint) for (let d = 0; d < K; d++) mark(bx + 3, by + d, MARK.joint);
  if (f & FLAG.over) mark(bx, by + 3, MARK.over);
}
for (const c of cut) if (c.box) {   // the cut boxes of the canonical instances
  const [x, y, w, h] = c.box.map((v) => v * K);
  for (let d = 0; d < w; d++) { mark(x + d, y, MARK.cut); mark(x + d, y + h - 1, MARK.cut); }
  for (let d = 0; d < h; d++) { mark(x, y + d, MARK.cut); mark(x + w - 1, y + d, MARK.cut); }
}
writeFileSync(path.join(OUT, 'template-4x.png'), encodePng(big));
writeFileSync(path.join(OUT, 'marks.json'), JSON.stringify(MARK) + '\n');

// ---- the paint calls' canvases up to GATE A (cliff-system.md section 5, as corrected in cliff-system-1's report): the greybox init (the paint job pastes the F0 top's real pixels and the locked
// columns into it first), the mask (white = paint: every lip, rock, foot, side or stair pixel of the pieces the call paints; black = keep), and the list of what each call paints and keeps ----
const T1 = zonesOut.find((z) => z.id === 'T1');
const CALLS = [
  { id: 'F1a', box: [T1.x, T1.y, 256, T1.h], paints: (it) => it.zone === 'T1' && it.cell[0] <= 15, note: 'T1 columns 0-15: the back run and the west k1 cap, the context F3, middles A1-F1 and A2-F2; paints the joints F3|A1 and F1|A2 and the W end' },
  { id: 'F1b', box: [T1.x + 160, T1.y, 256, T1.h], paints: (it) => it.zone === 'T1' && it.cell[0] >= 16, keepCols: [10, 15],
    joints: [{ fromCall: 'F1a', fromX: 4 * C, toX: [6 * C, 12 * C] }, { fromCall: 'F1a', fromX: 9 * C + 15, toX: [11 * C + 15] }], jointRows: [3 * C, 8 * C - 1], note:'T1 columns 10-25: A2-F2 kept from F1a (black), A3-F3, the context A1, the east k1 cap and the back run; the joint columns are pasted from F1a: A1 x=0 into A3 x=0 and context A1 x=0, F1 x=15 into F3 x=15' },
];
mkdirSync(path.join(OUT, 'calls'), { recursive: true });
const callsOut = [];
for (const call of CALLS) {
  const [cx, cy, cw, ch] = call.box, init = newImage(cw, ch), mask = newImage(cw, ch), painted = new Set(), kept = new Set();
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = (cy + y) * SHEET_W + cx + x, o = (y * cw + x) * 4, n = sheet.inst[i], role = ROLES[sheet.role[i]] || 'ground';
    init.data.set(img.data.subarray(i * 4, i * 4 + 4), o);
    const it = n >= 0 ? instances[n] : null, paintRole = role !== 'top' && role !== 'ground';
    const paint = it && call.paints(it) && paintRole && !(it.id.startsWith('mid-') && call.keepCols && it.cell[0] >= call.keepCols[0] && it.cell[0] <= call.keepCols[1]);
    if (paint) painted.add(`${it.id}@${it.cell.join(',')}`); else if (it && it.id !== 'top') kept.add(`${it.id}@${it.cell.join(',')}`);
    const joint = call.joints && y >= call.jointRows[0] && y <= call.jointRows[1] && call.joints.some((j) => j.toX.includes(x));
    mask.data.set(paint && !joint ? [255, 255, 255, 255] : [0, 0, 0, 255], o);
  }
  writeFileSync(path.join(OUT, 'calls', `${call.id}-init.png`), encodePng(init));
  writeFileSync(path.join(OUT, 'calls', `${call.id}-mask.png`), encodePng(mask));
  callsOut.push({ id: call.id, canvas: [cw, ch], sheetBox: call.box, note: call.note, paints: [...painted].sort(), keeps: [...kept].filter((k) => !painted.has(k)).sort(), lockedColumns: call.joints ? { rows: call.jointRows, paste: call.joints } : null });
}
writeFileSync(path.join(OUT, 'calls', 'calls.json'), JSON.stringify(callsOut, null, 1) + '\n');

const counts = {}; for (const p of TABLE.pieces) counts[p.family] = (counts[p.family] || 0) + 1;
console.log(`template ${SHEET_W} x ${SHEET_H}; ${instances.length} instances; pieces ${TABLE.pieces.length} ${JSON.stringify(counts)}; cut ${cut.filter((c) => c.box).length}; no clean instance: ${cut.filter((c) => !c.box).map((c) => c.id).join(' ') || 'none'}`);
console.log(`template parts with no piece: ${allMissing.length ? JSON.stringify(allMissing) : 'none'}`);
void middleOf;
