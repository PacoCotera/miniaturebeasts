// The cliff's piece choice, run as rules (art/places/rules/: a tileset and seven rule maps, applied in rules.txt's order by src/automap.mjs). relief.mjs's land is the one input: its raised cells, its way-up cells and the
// south column under each cell; the rules decide every piece (the south columns, the corner cells, the end pieces, the side cells, the raised fill beside them) and, on the dual grid, which tiles of the cliff layer the pieces draw
// instead. What the code keeps: the working map's layers, the piece table's size, overlap and foot line, and the draw order (by foot line, from art/places/pieces.json).
// Pure over a level IR: no art, no drawing. Every pick reads world tiles only, so two places that draw the same world cell place the same piece there.
import { Tiles, bindMap, parseRules, applyRules, workMap } from '../automap.mjs';
import { hash32 } from '../dualgrid.mjs';
import { COLUMNS, PIECES, footLineOf, tallOf, topOf } from './relief.mjs';
import TILES from '../../../../art/places/rules/cliff-tiles.json' with { type: 'json' };
import LIP from '../../../../art/places/rules/cliff-1-lip.json' with { type: 'json' };
import ENDS from '../../../../art/places/rules/cliff-2-ends.json' with { type: 'json' };
import CORNERS from '../../../../art/places/rules/cliff-3-corners.json' with { type: 'json' };
import COLS from '../../../../art/places/rules/cliff-4-columns.json' with { type: 'json' };
import WAY from '../../../../art/places/rules/cliff-5-way.json' with { type: 'json' };
import SIDES from '../../../../art/places/rules/cliff-6-sides.json' with { type: 'json' };
import RIM from '../../../../art/places/rules/cliff-7-rim.json' with { type: 'json' };

export const RULE_FILES = ['cliff-1-lip.json', 'cliff-2-ends.json', 'cliff-3-corners.json', 'cliff-4-columns.json', 'cliff-5-way.json', 'cliff-6-sides.json', 'cliff-7-rim.json'];
const SET = TILES.name, tiles = new Tiles();
tiles.addSet(TILES);
const parse = (m) => parseRules(bindMap(m, tiles, { json: () => TILES }), tiles);
const [R_LIP, R_ENDS, R_CORNERS, R_COLS, R_WAY, R_SIDES, R_RIM] = [LIP, ENDS, CORNERS, COLS, WAY, SIDES, RIM].map(parse);
const T = (cls) => tiles.named(SET, cls);
const CELL = PIECES.cell;
const WAYUP_U = 'cliff-way-up-u';   // the way up U's decal (southruns.mjs WAYUP_U_KIND)

// draw-order class of a piece, for ties on the foot line: sides and fill 0, columns 1, corner cells 2, end pieces 3
const clsOf = (kind) => (/^cliff-south-/.test(kind) ? 1 : /^cliff-corner-[ew]-[0-4]$/.test(kind) ? 2 : /^cliff-(corner-[ew]-5|end\d-[ew])$/.test(kind) ? 3 : 0);

// The working map of a place's land (relief.mjs's accessor A over the level IR): the window A reads, one tile a cell.
function workOf(ir, A) {
  const m = A.m, W = ir.w + 2 * m, H = ir.h + 2 * m, hs = (wy) => (ir.origin ? hash32(`${ir.seed}/south`, 0, wy) : hash32(`${ir.id}/south`, 0, wy));
  const x0w = ir.origin ? ir.origin.x : 0, y0w = ir.origin ? ir.origin.y : 0;
  const work = workMap(W, H, { x: x0w - m, y: y0w - m }), land = new Uint32Array(W * H), way = new Uint32Array(W * H), phase = new Uint32Array(W * H);
  const raised = T('raised'), wayT = T('way'), cols = Array.from({ length: COLUMNS }, (_, k) => T(`col-${k}`));
  for (let y = 0; y < H; y++) {
    const h = hs(y0w + y - m);
    for (let x = 0; x < W; x++) {
      const px = x - m, py = y - m, i = y * W + x;
      if (A.raised(px, py)) land[i] = raised;
      if (A.way(px, py)) way[i] = wayT;
      phase[i] = cols[((h + x0w + px) % COLUMNS + COLUMNS) % COLUMNS];
    }
  }
  work.layers.set('land', land); work.layers.set('way', way); work.layers.set('phase', phase);
  return { work, W, H, m };
}

// Every cliff piece of a level as [{ kind, x, y, line, cls }] (game px; line: the foot line), the raised fill cells as a Set of 'x,y' (place cells), in no order; cached by the level.
const CACHE = new WeakMap();
export function cliffPieces(ir, A) {
  const hit = CACHE.get(ir); if (hit) return hit;
  const { work, W, H, m } = workOf(ir, A), seed = ir.origin ? ir.seed : ir.id;
  for (const r of [R_LIP, R_ENDS, R_CORNERS, R_COLS, R_WAY, R_SIDES]) applyRules(r, work, { seed });
  const L = (n) => work.layers.get(n) || new Uint32Array(W * H), at = (l, x, y) => (x >= 0 && y >= 0 && x < W && y < H ? l[y * W + x] : 0);
  const out = [], fill = new Set(), face = L('face'), endE = L('end_e'), endW = L('end_w'), sideE = L('side_e'), sideW = L('side_w'), fl = L('fill'), phase = L('phase');
  const piece = (canon, x, y, row) => { const kind = tiles.clsOf(canon); return { kind, x: x * CELL, y: (row + topOf(kind)) * CELL, line: footLineOf(kind, row), cls: clsOf(kind) }; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, px = x - m, py = y - m;
    if (fl[i]) { fill.add(px + ',' + py); out.push({ kind: tiles.clsOf(fl[i]), x: px * CELL, y: py * CELL, line: footLineOf('cliff-fill', 0), cls: 0 }); }
    for (const [layer, hand] of [[sideE, 'e'], [sideW, 'w']]) if (layer[i]) {
      let r = y; while (at(layer, x, r + 1)) r++;   // the southmost row of this side run: its foot line is counted from there
      const kind = tiles.clsOf(layer[i]); out.push({ kind, x: px * CELL, y: py * CELL, line: footLineOf(kind, r - m), cls: 0 });
    }
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, px = x - m, py = y - m;
    for (const layer of [face, endE, endW]) if (layer[i]) out.push(piece(layer[i], px, py, py));
    // the foot overlay under every face cell (a column or a corner cell: the cell's own column phase) and under every end piece (its hand), from the lip row L, before the face of its line
    for (const [layer, hand] of [[face, null], [endE, 'e'], [endW, 'w']]) if (layer[i]) {
      const kind = hand ? `cliff-foot-${hand}` : `cliff-foot-${tiles.clsOf(phase[i]).replace('col-', '') * 1 + 1}`;
      out.push({ kind, x: px * CELL, y: py * CELL, line: footLineOf(kind, py), cls: -1 });
    }
  }
  // the way up U (a WayUp area with `u`): one canvas piece at the area's lip row, drawn at the foot line of its lip row plus 3 after every piece of that line (class 4: after the columns, corner cells and end pieces)
  for (const a of ir.wayups || []) if (a.u) out.push({ kind: WAYUP_U, x: a.x * CELL, y: a.y * CELL, line: footLineOf(WAYUP_U, a.y), cls: 4 });
  const res = { items: out, fill }; CACHE.set(ir, res); return res;
}

// Every cliff decal of a level in draw order: [{ kind, x, y }] in game px, keeping only those that reach the place's picture (the bake's one entry)
export function cliffDecals(ir, A, cell = CELL) {
  const items = cliffPieces(ir, A).items.slice().sort((a, b) => a.line - b.line || a.cls - b.cls || a.x - b.x || a.y - b.y), W = ir.w * cell, H = ir.h * cell;
  return items.filter((d) => d.x + cell > 0 && d.x < W && d.y + tallOf(d.kind) * cell > 0 && d.y < H).map(({ kind, x, y }) => ({ kind, x, y }));
}

// The dual grid's decision for every tile of the cliff layer: a Uint8Array of (w + 1) x (h + 1), 0 keep the tile, 1 the pieces draw it (empty), 2 the raised fill only. `isCliff(x, y)` reads the place's own terrain, clamped at its edge.
export function rimOf(ir, A, isCliff) {
  const W = ir.w + 1, H = ir.h + 1, work = workMap(W, H), land = new Uint32Array(W * H), fill = new Uint32Array(W * H), raised = T('raised'), laid = T('cliff-fill'), { fill: cells } = cliffPieces(ir, A);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (isCliff(x, y)) land[y * W + x] = raised; if (cells.has(x + ',' + y)) fill[y * W + x] = laid; }
  work.layers.set('land', land); work.layers.set('fill', fill);
  applyRules(R_RIM, work, {});
  const rim = work.layers.get('rim'), out = new Uint8Array(W * H), empty = T('rim-empty'), fillT = T('rim-fill');
  if (rim) for (let i = 0; i < out.length; i++) out[i] = rim[i] === empty ? 1 : rim[i] === fillT ? 2 : 0;
  // A straight side wall: the fill-only tile at the vertex between two raised cells and two low cells reaches half a cell (24 px) over the low ground, past the wall's outer edge where the wall's rock is narrower. The tile is not drawn there (the wall's pieces draw the edge; the low ground shows beyond it); the raised cells keep their own fill.
  const low = (x, y) => !isCliff(x, y), high = (x, y) => isCliff(x, y);
  for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) if (out[y * W + x] === 2) {
    if ((high(x - 1, y - 1) && high(x - 1, y) && low(x, y - 1) && low(x, y)) || (high(x, y - 1) && high(x, y) && low(x - 1, y - 1) && low(x - 1, y))) out[y * W + x] = 1;
  }
  return out;
}
