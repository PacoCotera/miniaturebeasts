// The map's painting: landPaint (the opening's painting as a generator), cellMark (a place's mark on the land), cellSignAt (a sign's spot in its cell), openFrame (the land the opening frame holds).
// The page's state (S, G, the layout and the walk pictures) is not owned here: the page hands it in once as `env`, an object of getters
// (env.S reads the page's S every time, so a new world or a loaded save is seen at once).
import { MW, MH, L, clamp, cxy } from "../logic/world.mjs";

// the map mark of each landmark kind
const LM_MARK = { windstep: 'windstep', 'hollow-tree': 'hollowtree', 'split-stone': 'splitstone', reedpool: 'reedpool' };
// The size of a place's mark in a cell of cs px: 26 on the reach view's 72 px cells, 18 on its 48 px cells, 12 on the full map.
export const markSizeFor = cs => cs >= 72 ? 26 : cs >= 48 ? 18 : 12;
// Where a piece size px long starts along a cell that starts at c0 and is cs long: centred on the fraction f of the cell, kept 2 px inside it.
const inCell = (c0, cs, size, f) => Math.round(Math.max(c0 + 2, Math.min(c0 + cs - size - 2, c0 + f * cs - size / 2)));

export function makeMapPaint(env) {
  // The opening's painting as a generator (a screen waits for it across frames): each next() is one frame of waiting; the last returns the canvas.
  function* landPaint(spec) { let cv; while (!(cv = env.landTry(spec))) yield; return cv; }
  // A place's mark on the land at its landmark's real spot in the cell (a mirrored place puts it on the other side); been in: the slate silhouette, found: full colour; never been in: none.
  // (fx, fy): the spot as fractions of the cell. Returns { mk, x, y } for a cell at (cx, cy) of size cs, or null.
  function cellMark(c, cx, cy, cs, size, open) {   // open: the opening screen draws them between expeditions
    const S = env.S, G = env.G;
    if ((!S.exp && !open) || !S.seen.rev[c] || !env.passable(c) || G.land[c] === L.WATER) return null;
    const found = env.walkedCell(c), been = !!S.seen.into[c]; if (!found && !been) return null;
    if (!env.placeHave(String(c))) return null;   // its place is still being made: no mark yet
    const lay = env.layout(String(c)), bk = lay.baked; if (!bk || !lay.landmark) return null;   // a mark stands only at a landmark: the land holds few
    const lm = { x: lay.landmark.x - bk.ox, y: lay.landmark.y - bk.oy }, mk = env.walkPB(`mark-${LM_MARK[lay.landmark.kind]}-${found ? 'found' : 'been'}-${size}`, size, size);
    return { mk, x: inCell(cx, cs, mk.w, (lm.x + .5) / bk.w), y: inCell(cy, cs, mk.h, (lm.y + .5) / bk.h) };
  }
  // A sign's spot in its cell: at the heart's spot in the place (the others beside it), not in corner slots.
  function cellSignAt(c, cx, cy, cs, w, h, n) { return { x: inCell(cx, cs, w, .5 + n * .3), y: inCell(cy, cs, h, .5) }; }
  // The land you know, as the frame holds it (430 × 316 at (10, 40) inside the panel): the Probe's reach round the last start plus half a cell each side (the first time, the five lights and half a cell round them),
  // at the largest whole cell size up to 72 that fits, centred and clamped to the world.
  function openFrame() {
    const S = env.S, G = env.G, F = env.openRect(), WX = F.x + 2, WY = F.y + 2, WW = F.w - 4, WH = F.h - 4, first = env.firstPlacement();
    let x0 = MW, y0 = MH, x1 = -1, y1 = -1;
    if (first) for (const c of env.startPlaces()) { const p = cxy(c); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    else { const s = cxy(S.ui.lastPos != null ? S.ui.lastPos : G.spawns[0]), r = env.tierOf().range; x0 = s.x - r; x1 = s.x + r; y0 = s.y - r; y1 = s.y + r; }
    const bw = x1 - x0 + 2, bh = y1 - y0 + 2, cs = Math.max(1, Math.min(72, Math.floor(Math.min(WW / bw, WH / bh))));
    let px0 = Math.round((x0 + x1 + 1) / 2 * cs - WW / 2), py0 = Math.round((y0 + y1 + 1) / 2 * cs - WH / 2);
    px0 = MW * cs > WW ? clamp(px0, 0, MW * cs - WW) : Math.round((MW * cs - WW) / 2); py0 = MH * cs > WH ? clamp(py0, 0, MH * cs - WH) : Math.round((MH * cs - WH) / 2);
    const X0 = Math.floor(px0 / cs), Y0 = Math.floor(py0 / cs), ox = WX - (px0 - X0 * cs), oy = WY - (py0 - Y0 * cs);
    return { first, WX, WY, WW, WH, cs, X0, Y0, ox, oy, glimpse: first ? env.startPlaces().slice() : null, at: c => { const p = cxy(c); return { x: ox + (p.x - X0) * cs, y: oy + (p.y - Y0) * cs }; } };
  }
  return { landPaint, cellMark, cellSignAt, openFrame };
}
