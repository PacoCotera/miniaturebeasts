// The sprite pass and the canopy pass (place design A4.1 passes 3 and 4): pure functions over an indexed buffer, the same on the web and on the device.
// Positions are place pixels at 48 px (the foot of the sprite); at 24 px they are halved. A `win` is { x, y, w, h }: the place pixels (at the drawn
// size) the buffer covers, so a camera view and the whole place use the same code.
import { blitRle } from './blit.mjs';
import { BAYER4 } from '../../exploration/src/view.mjs';

export const CUT_RADIUS = 22;        // pixels at 48 px: the explorer's cut-out in a canopy
export const CUT_THRESHOLD = 8;      // the 4 x 4 Bayer matrix below this drops the pixel: a 50% dither disc

export const scaleTo = (size, v48) => (size === 48 ? v48 : v48 >> 1);

// Blit sprite `kind` (index in the tile set's sprites) with its foot at (x48, y48), frame `frame`, into a buffer covering win.
export function blitPlaced(buf, win, ts, size, kind, x48, y48, frame = 0, remap, cut) {
  const s = ts.sprites[kind];
  const a = size === 48 ? s.anchor48 : s.anchor24;
  const [sw, sh, frames, rle] = size === 48 ? [s.w48, s.h48, s.frames48, ts.spriteAtlas48] : [s.w24, s.h24, s.frames24, ts.spriteAtlas24];
  const f = frames.length > 1 ? frame % frames.length : 0;
  blitRle(buf, win.w, win.h, scaleTo(size, x48) - a[0] - win.x, scaleTo(size, y48) - a[1] - win.y, rle, frames[f], sw, sh, remap, cut);
  return s;
}

// Animation frame of a sprite on the shared clock.
export const spriteFrame = (sprite, clockMs) => (sprite.frames48.length > 1 && sprite.frameMs ? Math.floor(clockMs / sprite.frameMs) : 0);

const cellOf = (size, x48, y48) => ({ cx: Math.floor(scaleTo(size, x48) / size), cy: Math.floor(scaleTo(size, y48) / size) });

// The props of a place as sorted-list items: { sortY, x, draw(buf, win) }. A prop takes the remap of the cell under its anchor.
//   o.remapAt(cx, cy) -> Uint8Array(256) | null;  o.visible(cx, cy) -> boolean (default true: the survey veil hides what stands on a veiled tile);
//   o.clockMs: the shared animation clock.
export function propItems(ts, place, size, o = {}) {
  const items = [];
  for (const p of place.props) {
    const { cx, cy } = cellOf(size, p.x, p.y);
    if (o.visible && !o.visible(cx, cy)) continue;
    const remap = o.remapAt ? o.remapAt(cx, cy) : null;
    items.push({ sortY: p.sortY, x: p.x, draw: (buf, win) => blitPlaced(buf, win, ts, size, p.kind, p.x, p.y, spriteFrame(ts.sprites[p.kind], o.clockMs || 0), remap) });
  }
  return items;
}

// Foot y first, then x; equal keys keep their order.
export function sortItems(items) {
  return items.map((it, i) => [it, i]).sort((a, b) => a[0].sortY - b[0].sortY || a[0].x - b[0].x || a[1] - b[1]).map((e) => e[0]);
}
export function drawItems(buf, win, items) { for (const it of items) it.draw(buf, win); }

// The cut-out: a pixel at (px, py) (place pixels at the drawn size) is dropped when it lies within 22 px (at 48) of a pawn's centre and the Bayer
// matrix there is below the threshold. pawns: [{ x, y }] centres in place pixels at 48 px.
export function cutOut(size, pawns) {
  if (!pawns.length) return null;
  const r = scaleTo(size, CUT_RADIUS), r2 = r * r;
  const cs = pawns.map((p) => [scaleTo(size, p.x), scaleTo(size, p.y)]);
  return (px, py) => {
    if (BAYER4[(py & 3) * 4 + (px & 3)] >= CUT_THRESHOLD) return false;
    for (const [cx, cy] of cs) if ((px - cx) * (px - cx) + (py - cy) * (py - cy) < r2) return true;
    return false;
  };
}

// The canopy pass: every prop's crown (the canopy sprite its set entry names), then the free canopy pieces, over everything.
// Only the pawn's disc is cut; the rest of a crown stays solid.
//   o.pawns, o.remapAt, o.visible as above.
export function canopyPass(buf, win, ts, place, size, o = {}) {
  const cut = cutOut(size, o.pawns || []);
  const draw = (kind, x, y) => {
    const { cx, cy } = cellOf(size, x, y);
    if (o.visible && !o.visible(cx, cy)) return;
    const frame = spriteFrame(ts.sprites[kind], o.clockMs || 0);
    blitPlaced(buf, win, ts, size, kind, x, y, frame, o.remapAt ? o.remapAt(cx, cy) : null, cut ? (dx, dy) => cut(dx + win.x, dy + win.y) : undefined);
  };
  for (const p of place.props) { const c = ts.sprites[p.kind].canopy; if (c >= 0) draw(c, p.x, p.y); }
  for (const c of place.canopy) draw(c.kind, c.x, c.y);
}
