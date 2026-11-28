// The place view's edge cues, the part that is geometry only: the tabs for what is off screen and the name tag. No page state, no drawing.

// The tabs: the order they are kept in, each kind's border colour, how many show, how near two on one side merge, the gap kept to the message box, the first-show flash.
export const TAB = { order: ['!', '?', 'find'], border: { '!': 'yellow', '?': 'sprout', find: 'cream' }, max: 4, merge: 24, clear: 4, flashMs: 160 };
const TOP_LINE_B = 56;   // the bottom of the goal line drawn over the view's top (VIEW_Y + GOAL_BAND_H)
export const findTabY = t => t.kind === 'find' ? Math.max(t.cy, TOP_LINE_B + 12) : t.cy;   // the find marker sits whole below the goal line, never a sliver under it
export const rectsMeet = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
// a tab's pointer: three rows in its border colour, outside the tab on the side the ray leaves by
export function tabPointer(t) { const { cx, cy } = t;
  if (t.side === 'E') return [[cx + 11, cy - 2, 1, 5], [cx + 12, cy - 1, 1, 3], [cx + 13, cy, 1, 1]];
  if (t.side === 'W') return [[cx - 12, cy - 2, 1, 5], [cx - 13, cy - 1, 1, 3], [cx - 14, cy, 1, 1]];
  if (t.side === 'N') return [[cx - 2, cy - 12, 5, 1], [cx - 1, cy - 13, 3, 1], [cx, cy - 14, 1, 1]];
  return [[cx - 2, cy + 11, 5, 1], [cx - 1, cy + 12, 3, 1], [cx, cy + 13, 1, 1]]; }
// the tab and its pointer as one rect (what the name tag refuses)
export function tabRect(t) { const r = { x: t.cx - 11, y: t.cy - 11, w: 22, h: 22 };
  if (t.side === 'E') r.w += 3; else if (t.side === 'W') { r.x -= 3; r.w += 3; } else if (t.side === 'N') { r.y -= 3; r.h += 3; } else r.h += 3; return r; }

// The name tag: a 20 px ink panel with a border and a 2×5 (5×2 sideways) pointer on the side facing its creature.
// Its clear zone is the cell, the ring's foot rows below it, and a 4 px margin that stays empty; the pointer sits just outside the margin.
// Positions in order: below, right, left, above (from the species' highest row), below slid by ±4, ±8 …; none clear, no tag.
export const TAG = { h: 20, ptr: 5, margin: 4, view: { x0: 6, y0: 38, x1: 444, y1: 558 }, slide: 4, slideIn: 6 };
