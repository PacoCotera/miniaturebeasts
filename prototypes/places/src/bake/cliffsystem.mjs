// The cliff system (pixel desk spec cliff-system.md section 6; the designer's rules cliff-rules.md): which piece of the one cliff set draws each cell, read from relief.mjs's land, picked in WORLD coordinates only,
// so two places that draw the same world cell place the same piece there. Pure: no art, no drawing. The pieces, their boxes, the cells they account for and their draw lines are the rows of art/places/cliff-system.json.
//   face column  every south lip cell (ring, low below): lip row 0, rock rows 1-3, foot strip row 4; a middle, a concave corner, a diagonal piece or a way up half
//   middles      s = hash(face world row, level) mod 6; t = world x + s; letter A-F = t mod 6; block = floor(t / 6); set = hash(block, face world row, level) mod 3 (the GD's condition, 11-15)
//   end cap      on the low cell beyond a run's end: end-{hand}-{k} (k = rows low upward from the lip row, 1-3), convex-{hand} when the side stays low a row more (a side wall above)
//   concave      the run's last column when the land beside it runs 2 or more rows further south (a wall in front of the face)
//   diagonal     every column of a run of 3 or more 1-tile steps (the GD's rule 6): start, mid, end; the steps' end caps are not drawn
//   steep        every column of a run (relief.mjs runAt names it) of 3 or more 1-column steps averaging over 1.25 rows down: steep-{r,l}-{1,2,3,end}, one wall running down at an angle, tall to the next column's foot row; no caps inside the run
//   side, rim    ring cells with low to the east or west (lip seen from above), flank cells left over (the wall edge-on: head, band, tail), ring cells with low to the north (the back rim)
//   top          every raised cell (the greybox set draws its own top; the painted set's top comes from the ground's tile set)
// A cell of any part but low that no piece accounts for gets the fallback piece (magenta in the stills), and is listed: the GD's check "no part drawn by a fallback" is mechanical.
// The set switch: cliffSet() is 'live' unless a tool calls useCliffSet(); the live set (cliffrules.mjs) is untouched while it is 'live'.
import TABLE from '../../../../art/places/cliff-system.json' with { type: 'json' };
import { hash32 } from '../dualgrid.mjs';
import { encodeRle } from '../blit.mjs';
import { halve } from '../bakeset.mjs';
import { PART, partAt, runAt } from './relief.mjs';

export { TABLE };
export const ART = TABLE.cell, SCALE = TABLE.scale, CELL48 = ART * SCALE;
export const FALLBACK = 'cs-fallback';
export const BY_ID = new Map(TABLE.pieces.map((p) => [p.id, p]));
const LETTERS = TABLE.pick.letters;

// ---- the switch ----
const STATE = { set: 'live', kinds: new Set() };
export const cliffSet = () => STATE.set;
// Turn the system on for this process: name (e.g. 'system-greybox'), the kinds installed in the tile sets (installPieces). 'live' turns it off.
export function useCliffSet(name) { STATE.set = name; }
// The ground pass's own tiles (stills tool only, paint-1 F0a): on, the top and the back rim are not pieces of the set but the dual grid's 16 tiles (cs-gt-<NW><NE><SW><SE>, 1 = upper) laid on the cell corners
export function useGroundTiles(on) { STATE.gt = !!on; }
export const gtKind = (code, level = 1, hi = false) => `cs-gt-${code}${level > 1 ? '@' + level : ''}${hi ? '~hi' : ''}`;
// The tile decals of one level boundary: [{ kind, x, y }] in game px, drawn first. The upper terrain is the raised cells and the cells the set's own pieces stand on (face, flank, way): the face's lip is painted
// over the top in the piece, so no edge is drawn under a face or a side wall.
export function groundTileItems(A, o) {
  const { x0, y0, x1, y1, level = 1, hiBand = () => false } = o;
  const U = (x, y) => (A.raised(x, y) || [PART.FACE, PART.FLANK, PART.WAY].includes(partAt(A, x, y)) ? 1 : 0);
  const out = [];
  for (let vy = y0; vy <= y1 + 1; vy++) for (let vx = x0; vx <= x1 + 1; vx++) {
    const code = `${U(vx - 1, vy - 1)}${U(vx, vy - 1)}${U(vx - 1, vy)}${U(vx, vy)}`;
    if (code === '0000') continue;
    const hi = [[vx - 1, vy - 1], [vx, vy - 1], [vx - 1, vy], [vx, vy]].some(([x, y], i) => code[i] === '0' && hiBand(x, y));
    out.push({ code, level, hi, kind: gtKind(code, level, hi), x: (vx * ART - ART / 2) * SCALE, y: (vy * ART - ART / 2) * SCALE });
  }
  return out;
}
// the decal kind of a piece at a level ('mid-1A' at level 1, 'mid-1A@2' at level 2)
export const kindOf = (id, level = 1) => (level > 1 ? `cs-${id}@${level}` : `cs-${id}`);

// Add the set's pieces to a baked tile set as decal sprites (once per tile set): pieces [{ kind, img }] with img an RGBA image at 48 px a cell ({ w, h, data }), every colour in the set's palette;
// and the fallback (16 x 16 art px of the one palette index the set leaves unassigned: magenta by day and by night). Returns the kinds installed.
export function installPieces(ts, pieces) {
  if (ts.csInstalled) return ts.csInstalled;
  const indexOf = new Map(ts.palette.map((c, k) => ['#' + c.toString(16).padStart(6, '0'), 48 + k]));
  const lum = new Array(256).fill(0); ts.palette.forEach((c, k) => { lum[48 + k] = 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255); });
  const rgbPal = { rgb: Array.from({ length: 256 }, (_, i) => [lum[i], lum[i], lum[i]]) };
  const add48 = [], add24 = [];
  let off48 = ts.spriteAtlas48.length, off24 = ts.spriteAtlas24.length;
  const push = (kind, px, w, h) => {
    const small = halve(px, w, h, rgbPal), r48 = encodeRle(px, w, h), r24 = encodeRle(small.data, small.w, small.h);
    ts.sprites.push({ kind, group: 'decal', w48: w, h48: h, w24: small.w, h24: small.h, anchor48: [0, 0], anchor24: [0, 0], footprint: [], frames48: [off48], frames24: [off24], frameMs: 0, canopy: -1 });
    add48.push(r48); add24.push(r24); off48 += r48.length; off24 += r24.length;
  };
  const kinds = new Set();
  for (const { kind, img } of pieces) {
    const px = new Uint8Array(img.w * img.h);
    for (let p = 0; p < px.length; p++) {
      if (img.data[p * 4 + 3] === 0) continue;
      const hex = '#' + [0, 1, 2].map((c) => img.data[p * 4 + c].toString(16).padStart(2, '0')).join('');
      const i = indexOf.get(hex); if (i === undefined) throw new Error(`${kind}: colour ${hex} is not in the set's palette`);
      px[p] = i;
    }
    push(kind, px, img.w, img.h); kinds.add(kind);
  }
  const free = 48 + ts.palette.length <= 255 ? 255 : 0;   // an index past the set's colours: paletteRgb leaves it magenta and the light tables keep it
  push(FALLBACK, new Uint8Array(CELL48 * CELL48).fill(free), CELL48, CELL48); kinds.add(FALLBACK);
  const cat = (a, extra) => { const n = extra.reduce((s, r) => s + r.length, a.length), out = new Uint8Array(n); out.set(a, 0); let o = a.length; for (const r of extra) { out.set(r, o); o += r.length; } return out; };
  ts.spriteAtlas48 = cat(ts.spriteAtlas48, add48); ts.spriteAtlas24 = cat(ts.spriteAtlas24, add24);
  for (const k of kinds) STATE.kinds.add(k);
  ts.csInstalled = kinds;
  return kinds;
}

// the lighter lit band (TABLE.band.hi): a piece's kind with this suffix is the piece with its band one step lighter; used where the ground beside the band is more than ownLuma - clear in luma
export const HI = '~hi';
const BAND = TABLE.band;
export function hiBandOf(ir, x, y) {
  const g = ir.terrain && ir.terrain[Math.max(0, Math.min(ir.h - 1, y)) * ir.w + Math.max(0, Math.min(ir.w - 1, x))];
  const l = g === undefined ? undefined : BAND.groundLuma[g];
  return l !== undefined && l > BAND.ownLuma - BAND.clear;
}

// ---- the middle pick (world coordinates only) ----
export function middleOf(key, wx, wy, level) {
  const s = hash32(`${key}/cs-row/${level}`, wy, 0) % 6, t = wx + s, letter = ((t % 6) + 6) % 6, block = Math.floor(t / 6);
  const set = hash32(`${key}/cs-set/${level}`, block, wy) % 3;
  return { id: `mid-${set + 1}${LETTERS[letter]}`, letter, block, set };
}

// ---- placement over one level boundary ----
// A: relief.mjs's land accessor for the boundary (raised = this level or higher), in the place's tile coordinates; o: { x0, y0, x1, y1 } the cells to account for (inclusive), { wx0, wy0 } the world tile of
// the place's (0, 0), key (the world's seed, or a hand-set place's id), level (the upper level of the boundary: 1 or 2), pick(x, L) an optional override of the middles (the template), tops (default true).
// Returns { items: [{ id, x, y, box, line, cls, level }], missing: [{ part, x, y }] }: x, y the anchor cell; box the piece's box (art px from the anchor cell's top-left); line, cls the draw order.
export function placeBoundary(A, o) {
  const { x0, y0, x1, y1, wx0 = 0, wy0 = 0, key = '', level = 1, pick = null, tops = true } = o;
  const R = (x, y) => A.raised(x, y), Lo = (x, y) => A.low(x, y), W = (x, y) => A.way(x, y);
  const lip = (x, y) => R(x, y) && Lo(x, y + 1);
  const up = (x, y) => { let k = 0; while (k < 3 && Lo(x, y - k)) k++; return k; };
  const stepDR = (x, y) => lip(x, y) && lip(x + 1, y + 1) && R(x + 1, y);   // the next column east has its lip one row lower
  const stepDL = (x, y) => lip(x, y) && lip(x - 1, y + 1) && R(x - 1, y);   // the next column west has its lip one row lower
  const chain = (before, after) => { let b = 0, f = 0; while (b < 3 && before(b)) b++; while (f < 3 && after(f)) f++; return b + f >= 3 ? (b === 0 ? 'start' : f === 0 ? 'end' : 'mid') : null; };
  const drRole = (x, y) => chain((b) => stepDR(x - 1 - b, y - 1 - b), (f) => stepDR(x + f, y + f));
  const dlRole = (x, y) => chain((b) => stepDL(x + 1 + b, y - 1 - b), (f) => stepDL(x - f, y + f));
  const items = [], covered = new Set(), ck = (x, y) => `${x},${y}`;
  const hiAt = o.hiBand || (() => false);   // hiBand(x, y): the low cell beside a lit band is so light that the band of the ground's own ramp would not clear it by 25 luma (AD 11-15): the piece takes the lighter band
  const gt = o.gt ?? STATE.gt;   // the ground pass's own tiles draw the top and the back rim: those pieces account for their cells but draw nothing
  const emit = (id, x, y, hi = false) => {
    const p = BY_ID.get(id);
    if (gt && /^rim-/.test(id)) { for (const [dx, dy] of p.covers) covered.add(ck(x + dx, y + dy)); return; }
    items.push({ id, x, y, box: p ? p.box : [0, 0, ART, ART], line: y + (p ? p.line : 0), cls: p ? p.cls : 9, level, ...(hi ? { hi: true } : {}) });
    for (const [dx, dy] of p ? p.covers : [[0, 0]]) covered.add(ck(x + dx, y + dy));
  };
  // the face columns and the end caps: every south lip whose picture reaches the window (rows y0 - 5 .. y1 + 2)
  for (let y = y0 - 5; y <= y1 + 2; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (!lip(x, y)) continue;
    if (W(x, y)) { emit(W(x - 1, y) && lip(x - 1, y) ? 'way-r' : 'way-l', x, y, hiAt(x, y + 1)); continue; }
    const run = runAt(A, x, y), steep = run && run.kind === 'steep' ? run : null;   // a steep run (rule 6): one side wall running down at an angle, no front slab per step
    const dr = steep ? null : drRole(x, y), dl = steep ? null : dlRole(x, y);
    const westEnd = !lip(x - 1, y), eastEnd = !lip(x + 1, y);
    const concaveW = westEnd && R(x - 1, y) && R(x - 1, y + 1) && !lip(x - 1, y + 1), concaveE = eastEnd && R(x + 1, y) && R(x + 1, y + 1) && !lip(x + 1, y + 1);
    let id;
    // a steep run's last column that meets the wall of the land running on (a concave corner) ends as the concave corner does (GD 11-15 fix-2 (3)): no end piece of its own, the wall goes on down the land's flank
    if (steep && steep.i >= steep.n && (steep.hand === 'r' ? concaveE : concaveW)) id = steep.hand === 'r' ? 'concave-e' : 'concave-w';
    else if (steep) id = `steep-${steep.hand}-${steep.i < steep.n ? Math.min(3, steep.ds[steep.i]) : 'end'}`;
    else if (dr) id = `dr-${dr}`; else if (dl) id = `dl-${dl}`;
    else if (concaveE) id = 'concave-e'; else if (concaveW) id = 'concave-w';
    else id = pick ? pick(x, y) || middleOf(key, wx0 + x, wy0 + y, level).id : middleOf(key, wx0 + x, wy0 + y, level).id;
    emit(id, x, y, hiAt(x, y + 1));
    // the caps on the low cell beyond each open end; a diagonal's own steps draw none
    for (const [hand, xn, open, skip] of [['w', x - 1, westEnd, dr === 'mid' || dr === 'end' || (steep && steep.hand === 'r' && steep.i > 0)], ['e', x + 1, eastEnd, dl === 'mid' || dl === 'end' || (steep && steep.hand === 'l' && steep.i > 0)]]) {
      if (!open || skip || !Lo(xn, y) || W(xn, y)) continue;
      const k = up(xn, y);
      emit(k === 3 && Lo(xn, y - 3) ? `convex-${hand}` : `end-${hand}-${k}`, xn, y);
    }
  }
  // ring cells that are no south lip: the back rim (low to the north) and the side lips (low to the east or west)
  const ringRows = [y0 - 1, y1 + 1];
  for (let y = ringRows[0]; y <= ringRows[1]; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    if (!R(x, y) || Lo(x, y + 1) || W(x, y)) continue;
    const n = Lo(x, y - 1), e = Lo(x + 1, y), w = Lo(x - 1, y);
    if (!n && !e && !w) continue;
    if (n) { if (e && w) continue; emit(e ? 'rim-ne' : w ? 'rim-nw' : 'rim-n', x, y, hiAt(x, y - 1)); continue; }
    if (e && w) continue;   // a ridge one cell wide: no piece (the check lists it)
    emit(e ? 'lip-side-e' : 'lip-side-w', x, y);
  }
  // the flank cells nothing above has drawn: the wall seen edge-on, by hand (raised to the west: the block's east wall), head (north end), band, tail (south end)
  const drawn = new Set(covered);   // the cells the faces, caps, rims and side lips account for, fixed before any wall is placed
  const wallHand = (x, y) => (drawn.has(ck(x, y)) || partAt(A, x, y) !== PART.FLANK ? null : R(x - 1, y) && !R(x + 1, y) ? 'e' : R(x + 1, y) && !R(x - 1, y) ? 'w' : null);
  for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) {
    const h = wallHand(x, y); if (!h) continue;
    // the wall goes on from the cell above when that one is also a flank or face cell of the same wall (a concave corner's, or a steep run's end): it is a band, never a new head (GD 11-15 fix-2 (3): no lone end piece)
    const sameWall = (xx, yy) => { const p = partAt(A, xx, yy); return (p === PART.FLANK || p === PART.FACE) && (h === 'e' ? R(xx - 1, yy) : R(xx + 1, yy)) && !R(xx, yy); };
    const north = wallHand(x, y - 1) === h || sameWall(x, y - 1), south = wallHand(x, y + 1) === h;
    // GD 11-15 (paint-1 step 0, cliff-rules section 7): a side wall shorter than 2 rows on a back-rim step draws no rock, only the rim's rounded corner and its lip (the same as the back rim): a lone head with low ground or the next step's rim below it
    if (!north && !south && (partAt(A, x, y + 1) === PART.LOW || partAt(A, x, y + 1) === PART.RING) && Lo(x, y - 1)) { covered.add(ck(x, y)); continue; }
    emit(`wall-${h}-${!north ? 'head' : !south ? 'tail' : 'band'}`, x, y);
  }
  if (tops && !gt) for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) if (R(x, y)) items.push({ id: 'top', x, y, box: [0, 0, ART, ART], line: -1e6, cls: 0, level });
  // the check: every cell of the window with a part other than low and top is accounted for
  const missing = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const p = partAt(A, x, y);
    if (p === PART.LOW || p === PART.TOP || covered.has(ck(x, y))) continue;
    missing.push({ part: Object.keys(PART).find((k) => PART[k] === p), x, y });
    items.push({ id: FALLBACK, x, y, box: [0, 0, ART, ART], line: 1e6, cls: 0, level });
  }
  return { items, missing };
}

// draw order: foot line, class, west to east, north to south
export const sortItems = (items) => items.sort((a, b) => a.line - b.line || a.cls - b.cls || a.x - b.x || a.y - b.y);

// The cells decor keeps off when the system draws the cliff (spec section 6, decor-off-cliff-face-1): ring, face, flank, foot and way cells, the foot strip (row 4 under a south lip) and the one top cell behind a south lip.
export function decorOff(A) {
  const lip = (x, y) => A.raised(x, y) && A.low(x, y + 1);
  return (x, y) => {
    const p = partAt(A, x, y);
    if (p === PART.RING || p === PART.FACE || p === PART.FLANK || p === PART.FOOT || p === PART.WAY) return true;
    if (p === PART.TOP && lip(x, y + 1)) return true;
    return p === PART.LOW && lip(x, y - 4) && A.low(x, y - 3) && A.low(x, y - 2) && A.low(x, y - 1);
  };
}

// Every cliff decal of a level IR when the system is on: [{ kind, x, y }] in game px (48 a cell), in draw order, keeping those that reach the place's picture; a piece whose kind is not installed draws the fallback.
// `A` is relief.mjs's landOf(ir, cliffs). The result's `missing` lists the parts no piece accounts for.
export function systemDecals(ir, A) {
  const key = ir.origin ? `${ir.seed}` : ir.id, wx0 = ir.origin ? ir.origin.x : 0, wy0 = ir.origin ? ir.origin.y : 0;
  const hiBand = (x, y) => hiBandOf(ir, x, y);
  const { items, missing } = placeBoundary(A, { x0: 0, y0: 0, x1: ir.w - 1, y1: ir.h - 1, wx0, wy0, key, level: 1, hiBand });
  const W = ir.w * CELL48, H = ir.h * CELL48, out = [];
  for (const it of sortItems(items)) {
    let kind = kindOf(it.id, it.level), [bx, by, bw, bh] = it.box;
    if (it.hi && STATE.kinds.has(kind + HI)) kind += HI;   // the lighter band beside a light low ground (installed by the tools that have the pieces in two bands)
    if (!STATE.kinds.has(kind)) { kind = FALLBACK; bx = 0; by = 0; bw = ART; bh = ART; }
    const x = (it.x * ART + bx) * SCALE, y = (it.y * ART + by) * SCALE;
    if (x + bw * SCALE <= 0 || y + bh * SCALE <= 0 || x >= W || y >= H) continue;
    out.push({ kind, x, y });
  }
  if (STATE.gt) out.unshift(...groundTileItems(A, { x0: 0, y0: 0, x1: ir.w - 1, y1: ir.h - 1, hiBand }).filter((t) => STATE.kinds.has(t.kind) || STATE.kinds.has(gtKind(t.code))).map((t) => ({ kind: STATE.kinds.has(t.kind) ? t.kind : gtKind(t.code), x: t.x, y: t.y })));
  out.missing = missing;
  return out;
}
