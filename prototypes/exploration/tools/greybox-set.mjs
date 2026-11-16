// The greybox piece set (internal only, never deployed, never listed as art): a schematic of the cliff's classes, one flat colour per class, drawn by this code in the game's standard layout.
// It rewrites the cliff pieces of ONE checkout of the game (a scratch worktree of the branch; never the working tree) so that the game's own bake and place view draw the land rule flat:
//   node greybox-set.mjs <tree> <faceRows 2|3>
// Classes (relief.mjs parts): low ground and raised top are the game's own ground (the raised top is the lighter one); back rim, side wall, lip row, face row, foot rows, bend (the end pieces that
// stand in for the bend and the jog), way up. The 2 rows above the lip stay clear so the raised top shows through. faceRows 2 rewrites the table (art/places/pieces.json) and the set's rects.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readPng, writePng } from '../../places/src/png.mjs';

export const COLOURS = { rim: [92, 120, 52], side: [150, 98, 70], lip: [214, 128, 44], face: [104, 116, 140], foot: [70, 140, 206], bend: [236, 78, 140], way: [252, 236, 90] };
const CELL = 48;
const [TREE, FR] = process.argv.slice(2), FACE = Number(FR || 3);
if (!TREE || (FACE !== 2 && FACE !== 3)) throw new Error('usage: greybox-set.mjs <tree> <2|3>');
const SET = path.join(TREE, 'art/places/sets/ninja-test'), SETJSON = path.join(SET, 'set.json'), PIECES = path.join(TREE, 'art/places/pieces.json');
const set = JSON.parse(readFileSync(SETJSON, 'utf8')), pieces = JSON.parse(readFileSync(PIECES, 'utf8'));
// the bake takes only the set's own palette: every class colour is snapped to the nearest of it (rule 18: map colours to the set palette)
const PAL = JSON.parse(readFileSync(path.join(SET, set.palette), 'utf8')).colours.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const snap = (c) => PAL.reduce((b, p) => (((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2) < b.d ? { p, d: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 } : b), { p: null, d: 1e12 }).p;
for (const k of Object.keys(COLOURS)) COLOURS[k] = snap(COLOURS[k]);
console.log(Object.entries(COLOURS).map(([k, c]) => k + '=#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')).join(' '));
const cut = (FACE === 3 ? 0 : CELL);   // rows lost at the foot of a tall piece when the face is 2 rows

// a piece's picture as rows of cells: each row is [class | null] (null: clear)
const rowsOf = (name) => {
  // land-b3f-foot-1: the lip row and the FACE rock rows under it all block (relief.mjs), so the picture is lip then FACE rows of face; the foot is the first walkable row, L + FACE + 1, under the picture (ground shows there)
  if (/^cliff-south-\d$/.test(name) || /^cliff-corner-[ew]-[0-4]$/.test(name)) return [null, null, 'lip', ...Array(FACE).fill('face')];
  if (/^cliff-corner-[ew]-5$/.test(name)) return [null, null, 'bend', 'bend', ...Array(FACE - 1).fill('bend')];
  if (/^cliff-end2-[ew]$/.test(name)) return [null, 'bend', 'bend', ...Array(FACE - 1).fill('bend')];
  if (/^cliff-end1-[ew]$/.test(name)) return ['bend', 'bend', ...Array(FACE - 1).fill('bend')];
  return null;
};
// one piece: { w, h, data } flat. Wide pieces (flank bands, the foot overlay, the way up) are drawn by their own rules below.
function flat(w, h, fn) { const data = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x, y); if (c) data.set([...c, 255], (y * w + x) * 4); } return { w, h, data }; }
function paintPiece(name, w, h) {
  const rows = rowsOf(name);
  if (rows) return flat(w, h, (x, y) => { const k = rows[Math.floor(y / CELL)]; return k ? COLOURS[k] : null; });
  const side = /^cliff-flank-(head|band|tail)-([ew])$/.exec(name);
  if (side) {   // the low cell's whole 48 px and the 14 px of the raised cell beside it: the east hand's raised cell is the left half, the west hand's the right half
    const east = side[2] === 'e';
    return flat(w, h, (x) => (east ? x >= CELL - 14 : x < CELL + 14) ? COLOURS.side : null);
  }
  if (/^cliff-foot-/.test(name)) return flat(w, h, () => null);   // the foot rows are drawn by the face pieces' lower rows (the picture reaches the foot)
  if (name === 'cliff-way-up-u') return flat(w, h, (x, y) => (x >= 93 && x < 189 && y >= 30 && y < 126 + (FACE + 1) * CELL - cut ? COLOURS.way : null));
  return undefined;
}

// the atlas: every cliff decal of the set is cut out and drawn again at its rect
const atlas = readPng(path.join(SET, 'sprites.png')), decals = set.decals;
let n = 0;
for (const [name, d] of Object.entries(decals)) {
  if (!/^cliff-/.test(name) || name === 'cliff-fill') continue;
  const [x0, y0, w, h] = d.rect, hh = (h === 288 || h === 240 || h === 192 || h === 348) && cut ? h - cut : h;   // face 2: the tall pieces lose a row at the foot
  const img = paintPiece(name, w, h); if (!img) continue;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) atlas.data.set(y < hh && img.data[(y * w + x) * 4 + 3] ? img.data.slice((y * w + x) * 4, (y * w + x) * 4 + 4) : [0, 0, 0, 0], ((y0 + y) * atlas.w + x0 + x) * 4);
  if (hh !== h) d.rect = [x0, y0, w, hh];
  n++;
}
writePng(path.join(SET, 'sprites.png'), atlas);

// the back rim tiles (16 x 16, the dual grid's cases): raised quadrants flat, the rim colour within 3 px of a low quadrant
const BITS = { 1: [0, 0, 0, 1], 2: [0, 0, 1, 0], 3: [0, 0, 1, 1], 7: [0, 1, 1, 1], 11: [1, 0, 1, 1] };   // NW NE SW SE
for (const [c, bits] of Object.entries(BITS)) {
  const quad = (x, y) => bits[(y >= 8 ? 2 : 0) + (x >= 8 ? 1 : 0)];
  const img = flat(16, 16, (x, y) => {
    if (!quad(x, y)) return null;
    for (let d = 1; d <= 3; d++) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const a = x + dx, b = y + dy; if (a >= 0 && b >= 0 && a < 16 && b < 16 && !quad(a, b)) return COLOURS.rim; }
    return [153, 181, 98];
  });
  writePng(path.join(SET, `cliff-back-${c}.png`), img);
}
// the old way-up tiles (the unsigned dual-grid piece that stands in for the way up where the U is not drawn): the way colour
for (const nme of ['wayup-cliff-grass', 'wayup-cliff-sand']) { const p = readPng(path.join(SET, nme + '.png')); writePng(path.join(SET, nme + '.png'), flat(p.w, p.h, () => COLOURS.way)); }

// face 2: the table and the set's rects follow
if (FACE === 2) {
  pieces.faceRows = 2;
  for (const p of pieces.pieces) {
    if (p.footLine && p.footLine.plus === 3) p.footLine.plus = 2;
    if (p.id === 'way-up' || /^(south-column|corner-cell-[ew]|end-[123]|foot-overlay)$/.test(p.id)) { const e = p.extent; if ([288, 240, 192, 348].includes(e[3])) e[3] -= CELL; }
  }
  writeFileSync(PIECES, JSON.stringify(pieces, null, 2) + '\n');
  writeFileSync(SETJSON, JSON.stringify(set, null, 2) + '\n');
}
console.log('greybox set written into', TREE, 'face rows', FACE, 'pieces', n);
