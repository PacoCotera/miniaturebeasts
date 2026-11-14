// A baked place -> the exploration page's layout `lay` (place design A6, "layout() branches"). Pure: no page state.
// The page's grid is PW x PH (28 x 32) until places of two sizes land in the page, so the 18 x 22 place is centred in it: the cells around it are
// rock (never walked), and `lay.baked.ox/oy` say where it sits. Terrain becomes the page's tile T, prop footprints become TRUNK (a tree, which has
// a canopy) or ROCK, tall grass becomes T.TALL; the heart and the openings come from the place's entities.
import { T, T_BLOCK, L, PW, PH, TERR } from '../../exploration/src/world.mjs';
import { shapeEdges, sideXY, DIR_OF } from './edges.mjs';
import { thicketDonor } from './bake/openedges.mjs';

const LAND = { pond: L.POND, rock: L.ROCK, wood: L.WOOD, meadow: L.MEADOW };
const CROWN_MARGIN = 6;   // pixels at 48 px round a crown's box that still count as under it

export function arrivalCell(o, w, h) {
  const mid = (o.from + o.to) >> 1;
  return o.side === 'N' ? { x: mid, y: 0 } : o.side === 'S' ? { x: mid, y: h - 1 } : o.side === 'W' ? { x: 0, y: mid } : { x: w - 1, y: mid };
}

// The closed looks (walk content B8): every opening of a place in the open style carries a second look for the day its side is refused by the land (wide water, a cliff, the map's edge):
// the set's own dense thicket, stamped as ground patches over the two outer rows of the opening's span and one cell either side, and blocked. The donor is a cell with a thicket
// all round it, found in the level (the bake rule `closed-look` holds that every level in the open style has one). null for a place that is not in the open style (its walls close it).
export const CLOSED_DEPTH = 2;
export function closedLooks(place, terrains) {
  if (place.w !== 24 || place.h !== 28) return null;
  const donor = thicketDonor(place, terrains), w = place.w, h = place.h;
  return place.openings.map((op) => {
    const len = op.side === 'N' || op.side === 'S' ? w : h, cells = [];
    for (let d = 0; d < CLOSED_DEPTH; d++) for (let k = Math.max(0, op.from - 1); k <= Math.min(len - 1, op.to + 1); k++) cells.push(sideXY(DIR_OF[op.side], k, d, w, h));
    return { side: op.side, from: op.from, to: op.to, look: donor ? 'thicket' : null, donor, cells };
  });
}

// The props fruit may be pressed on, besides every tree's trunk (never a bush, thicket, reed or crown).
export const PRESS_PROPS = ['boulder-a', 'boulder-a-m', 'split-stone'];
// terrains: art/places/terrain.json's list. o: { key, cell, pw, ph, closed } (closed: the sides the land refuses, 'N' 'S' 'W' 'E').
export function adaptPlace(place, ts, terrains, o = {}) {
  const pw = o.pw || PW, ph = o.ph || PH, w = place.w, h = place.h;
  const ox = (pw - w) >> 1, oy = (ph - h) >> 1, NP = pw * ph, I = (x, y) => (y + oy) * pw + x + ox;
  const tileOf = new Map(terrains.map((t) => [t.value, T[t.T]]));
  const tiles = new Uint8Array(NP).fill(T.ROCK), press = new Uint8Array(NP);   // press: where fruit may be pressed: 1 a stone prop or blocked cliff, 2 a tree's trunk, 0 nowhere (never read from T.ROCK)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[I(x, y)] = tileOf.get(place.terrain[y * w + x]) ?? T.GRASS;
  // what the bake blocks beyond the terrain's own play: the cliff's lip and face (the open edges); thicket, scrub, water and prop footprints already map to blocked tiles
  const cliffV = (terrains.find((t) => t.id === 'cliff') || {}).value;
  // (a set bit on a walkable tile that is no cliff is the cell under a south lip, which blocks too; a prop's footprint cell is overwritten below)
  if (cliffV && place.blockMask) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const b = y * w + x; if (!((place.blockMask[b >> 3] >> (b & 7)) & 1)) continue;
    if (place.terrain[b] === cliffV) { tiles[I(x, y)] = T.ROCK; press[I(x, y)] = 1; } else if (!T_BLOCK[tiles[I(x, y)]]) tiles[I(x, y)] = T.ROCK;
  }
  // the world's edges on this cell (o.G: the world; a place that fills the page's grid exactly, never the dev switch's padded one): the bands, stairs and crossings, the openings, the trees that stay
  let sh = null;
  if (o.G && o.G.edge && o.cell != null && pw === w && ph === h) {
    const t0 = tiles.slice(), walk0 = new Uint8Array(NP);   // the template as it stands: its ground and every prop, to tell which stretch of it a stair or a new opening must lead to
    for (const p of place.props) { const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48);
      for (let i = 0; i + 1 < s.footprint.length; i += 2) { const x = cx + s.footprint[i], y = cy + s.footprint[i + 1]; if (x >= 0 && y >= 0 && x < w && y < h) t0[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK; } }
    for (let i = 0; i < NP; i++) walk0[i] = T_BLOCK[t0[i]] ? 0 : 1;
    sh = shapeEdges(o.G, o.seed ?? 0, o.cell, place, ts, walk0);
  }
  const props = sh ? sh.props : place.props, canopyList = sh ? sh.canopy : place.canopy;
  for (const p of props) {
    const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48);
    if (String(s.kind).startsWith('tall-grass') && !s.footprint.length) { if (tiles[I(cx, cy)] === T.GRASS) tiles[I(cx, cy)] = T.TALL; continue; }
    for (let i = 0; i + 1 < s.footprint.length; i += 2) {
      const x = cx + s.footprint[i], y = cy + s.footprint[i + 1];
      if (x >= 0 && y >= 0 && x < w && y < h) { tiles[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK; if (PRESS_PROPS.includes(s.kind)) press[I(x, y)] = 1; else if (String(s.kind).startsWith('tree-')) press[I(x, y)] = 2; }
    }
  }
  if (sh) for (const i of sh.rim) { if (sh.terr[i] !== TERR.SHADOW) tiles[i] = sh.tilesE[i]; }   // the bands, stairs and crossings stand over the ground and the trees
  // The open style (a 24 x 28 place has no wall of trees): a side the world closes with no band of its own, a cliff or the map's end, is closed in the land. Its two outer rows block (a cliff's lip
  // and face are the world's rim; the rows beyond it are the raised land nobody reaches) and the map's end is a dense thicket, the set's own thicket ground stamped over them (a patch, as the
  // closed openings' path is). Never an open-looking edge that refuses a step.
  let closure = null;
  // The world's own bands (water, cliff lip, the map's thicket) already close the sides it draws; the closed look serves a refused side that has no band of its own.
  const looks = closedLooks(place, terrains), closedSides = new Set([...(o.closed || [])].filter((s) => !sh || sh.kind[DIR_OF[s]] === 'open'));
  if ((sh || closedSides.size) && w === 24 && h === 28) {
    const donor = thicketDonor(place, terrains), patches = [];
    if (sh) for (const d of ['up', 'down', 'left', 'right']) {
      const kind = sh.kind[d]; if (kind !== 'mapend' && kind !== 'cliff') continue;
      const len = d === 'up' || d === 'down' ? w : h;
      for (let depth = 0; depth < 2; depth++) for (let k = 0; k < len; k++) { const p = sideXY(d, k, depth, w, h), i = I(p.x, p.y); if (!T_BLOCK[tiles[i]]) tiles[i] = T.ROCK; if (kind === 'mapend' && donor) patches.push({ x: p.x, y: p.y, from: donor }); }
    }
    // an opening on a side the land refuses shows its closed look: the thicket over its span, blocked (never a path that runs into a wall of nothing)
    for (const lk of looks) if (closedSides.has(lk.side)) for (const p of lk.cells) { const i = I(p.x, p.y); if (!T_BLOCK[tiles[i]]) tiles[i] = T.ROCK; if (lk.donor && !patches.some((q) => q.x === p.x && q.y === p.y)) patches.push({ x: p.x, y: p.y, from: lk.donor }); }
    closure = { patches, id: patches.map((p) => p.x + ',' + p.y).join(';') };
  }
  // the tiles no crown hangs over (the explorer arrives on one of these, never hidden under a canopy): a crown's box at 48 px, a tile's pawn as its centre and a margin round it
  const clear = new Uint8Array(NP).fill(1);
  { const crowns = [];
    for (const p of props) { const c = ts.sprites[p.kind].canopy; if (c >= 0) crowns.push([c, p.x, p.y]); }
    for (const c of canopyList) crowns.push([c.kind, c.x, c.y]);
    for (const [k, fx, fy] of crowns) {
      const s = ts.sprites[k], left = fx - s.anchor48[0], top = fy - s.anchor48[1];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const px = x * 48 + 24, py = y * 48 + 28; if (px > left - CROWN_MARGIN && px < left + s.w48 + CROWN_MARGIN && py > top - CROWN_MARGIN && py < top + s.h48 + CROWN_MARGIN) clear[I(x, y)] = 0; }
    } }
  const openings = (sh ? sh.openings : place.openings.map((op) => ({ side: op.side, from: op.from, to: op.to }))).filter((op) => !closedSides.has(op.side));   // never an arrival at a closed opening
  const arrive = openings.length ? arrivalCell(openings[0], w, h) : sh && sh.stairs.length ? sh.stairs[0].entry : sh && sh.cross.length ? sh.cross[0].entry : { x: w >> 1, y: h >> 1 };
  const spawnPt = { x: arrive.x + ox, y: arrive.y + oy };
  const reach = new Uint8Array(NP), stack = [spawnPt.y * pw + spawnPt.x];
  if (!T_BLOCK[tiles[stack[0]]]) reach[stack[0]] = 1; else stack.length = 0;
  while (stack.length) {
    const i = stack.pop(), x = i % pw, y = (i / pw) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= pw || Y >= ph) continue;
      const j = Y * pw + X;
      if (!reach[j] && !T_BLOCK[tiles[j]]) { reach[j] = 1; stack.push(j); }
    }
  }
  const lay = {
    key: o.key ?? place.id, cell: o.cell ?? 0, cave: false, land: LAND[place.type] ?? L.MEADOW, base: T.GRASS, tiles, shelter: new Uint8Array(NP), feats: [],
    terr: new Uint8Array(NP), tmask: new Uint8Array(NP), stairs: [], reach, spawnPt, sdist: new Int16Array(NP).fill(999), trees: {}, shade: false,
    w: pw, h: ph, openings, closedLooks: looks, clear, findSlots: place.finds.map((f) => ({ x: f.x + ox, y: f.y + oy, kinds: f.kinds, chance: f.chance })).filter((f) => !sh || !T_BLOCK[tiles[f.y * pw + f.x]]),
    baked: { id: place.id, ox, oy, w, h },
  };
  lay.press = press;
  if (closure) lay.closure = closure;
  if (sh) {   // the world's edges: the terrain layer the page draws over the baked ground, the stairs and crossings that walk, the trees this cell shows
    lay.terr = sh.terr; lay.tmask = sh.tmask; lay.stairs = sh.stairs; if (sh.cross.length) lay.cross = sh.cross;
    lay.rim = sh.rim; lay.cut = { props, canopy: canopyList, patches: closure ? closure.patches : [] };
    if (place.type === 'wood') lay.base = T.DARK; else if (place.type === 'rock') lay.base = T.SAND;
  }
  return lay;
}
