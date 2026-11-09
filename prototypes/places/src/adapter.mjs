// A baked place -> the exploration page's layout `lay` (place design A6, "layout() branches"). Pure: no page state.
// The page's grid is PW x PH (28 x 32) until places of two sizes land in the page, so the 18 x 22 place is centred in it: the cells around it are
// rock (never walked), and `lay.baked.ox/oy` say where it sits. Terrain becomes the page's tile T, prop footprints become TRUNK (a tree, which has
// a canopy) or ROCK, tall grass becomes T.TALL; the heart, its clue marks and the openings come from the place's entities.
import { T, T_BLOCK, L, PW, PH, TERR, hash } from '../../exploration/src/world.mjs';
import { shapeEdges, sideXY } from './edges.mjs';
import { heartPath } from '../../exploration/src/hearts.mjs';

const LAND = { pond: L.POND, rock: L.ROCK, wood: L.WOOD, meadow: L.MEADOW };
export const HEART_KINDS = ['moment', 'nest', 'stone', 'spring'];   // what the page's rules know
const CROWN_MARGIN = 6;   // pixels at 48 px round a crown's box that still count as under it

export function arrivalCell(o, w, h) {
  const mid = (o.from + o.to) >> 1;
  return o.side === 'N' ? { x: mid, y: 0 } : o.side === 'S' ? { x: mid, y: h - 1 } : o.side === 'W' ? { x: 0, y: mid } : { x: w - 1, y: mid };
}

// terrains: art/places/terrain.json's list. o: { key, cell, pw, ph }.
export function adaptPlace(place, ts, terrains, o = {}) {
  const pw = o.pw || PW, ph = o.ph || PH, w = place.w, h = place.h;
  const ox = (pw - w) >> 1, oy = (ph - h) >> 1, NP = pw * ph, I = (x, y) => (y + oy) * pw + x + ox;
  const tileOf = new Map(terrains.map((t) => [t.value, T[t.T]]));
  const tiles = new Uint8Array(NP).fill(T.ROCK);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) tiles[I(x, y)] = tileOf.get(place.terrain[y * w + x]) ?? T.GRASS;
  // what the bake blocks beyond the terrain's own play: the cliff's lip and face (the open edges); thicket, scrub, water and prop footprints already map to blocked tiles
  const cliffV = (terrains.find((t) => t.id === 'cliff') || {}).value;
  if (cliffV && place.blockMask) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const b = y * w + x; if (place.terrain[b] === cliffV && (place.blockMask[b >> 3] >> (b & 7)) & 1) tiles[I(x, y)] = T.ROCK; }
  // the world's edges on this cell (o.G: the world; a place that fills the page's grid exactly, never the dev switch's padded one): the bands, stairs and crossings, the openings, the trees that stay
  let sh = null;
  if (o.G && o.G.edge && o.cell != null && pw === w && ph === h) {
    const t0 = tiles.slice(), walk0 = new Uint8Array(NP);   // the template as it stands: its ground and every prop, to tell which stretch of it a stair or a new opening must lead to
    for (const p of place.props) { const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48);
      for (let i = 0; i + 1 < s.footprint.length; i += 2) { const x = cx + s.footprint[i], y = cy + s.footprint[i + 1]; if (x >= 0 && y >= 0 && x < w && y < h) t0[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK; } }
    for (let i = 0; i < NP; i++) walk0[i] = T_BLOCK[t0[i]] ? 0 : 1;
    sh = shapeEdges(o.G, o.seed ?? 0, o.cell, place, ts, walk0, place.heart);
  }
  const props = sh ? sh.props : place.props, canopyList = sh ? sh.canopy : place.canopy;
  for (const p of props) {
    const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48);
    if (s.kind === 'tall-grass' && !s.footprint.length) { if (tiles[I(cx, cy)] === T.GRASS) tiles[I(cx, cy)] = T.TALL; continue; }
    for (let i = 0; i + 1 < s.footprint.length; i += 2) {
      const x = cx + s.footprint[i], y = cy + s.footprint[i + 1];
      if (x >= 0 && y >= 0 && x < w && y < h) tiles[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK;
    }
  }
  if (sh) for (const i of sh.rim) { if (sh.terr[i] !== TERR.SHADOW) tiles[i] = sh.tilesE[i]; }   // the bands, stairs and crossings stand over the ground and the trees
  // The open style (a 24 x 28 place has no wall of trees): a side the world closes with no band of its own, a cliff or the map's end, is closed in the land. Its two outer rows block (a cliff's lip
  // and face are the world's rim; the rows beyond it are the raised land nobody reaches) and the map's end is a dense thicket, the set's own thicket ground stamped over them (a patch, as the
  // closed openings' path is). Never an open-looking edge that refuses a step.
  let closure = null;
  if (sh && w === 24 && h === 28) {
    const thick = (terrains.find((t) => t.id === 'thicket') || {}).value; let donor = null;
    for (let y = 1; y < h - 1 && !donor && thick; y++) for (let x = 1; x < w - 1; x++) { let all = true; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (place.terrain[(y + dy) * w + x + dx] !== thick) all = false; if (all) { donor = { x, y }; break; } }
    const patches = [];
    for (const d of ['up', 'down', 'left', 'right']) {
      const kind = sh.kind[d]; if (kind !== 'mapend' && kind !== 'cliff') continue;
      const len = d === 'up' || d === 'down' ? w : h;
      for (let depth = 0; depth < 2; depth++) for (let k = 0; k < len; k++) { const p = sideXY(d, k, depth, w, h), i = I(p.x, p.y); if (!T_BLOCK[tiles[i]]) tiles[i] = T.ROCK; if (kind === 'mapend' && donor) patches.push({ x: p.x, y: p.y, from: donor }); }
    }
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
  const openings = sh ? sh.openings : place.openings.map((op) => ({ side: op.side, from: op.from, to: op.to }));
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
    w: pw, h: ph, openings, clear, findSlots: place.finds.map((f) => ({ x: f.x + ox, y: f.y + oy, kinds: f.kinds, chance: f.chance })).filter((f) => !sh || !T_BLOCK[tiles[f.y * pw + f.x]]),
    baked: { id: place.id, ox, oy, w, h },
  };
  if (sh) {   // the world's edges: the terrain layer the page draws over the baked ground, the stairs and crossings that walk, the trees this cell shows
    lay.terr = sh.terr; lay.tmask = sh.tmask; lay.stairs = sh.stairs; if (sh.cross.length) lay.cross = sh.cross;
    lay.rim = sh.rim; lay.cut = { props, canopy: canopyList, patches: closure ? closure.patches : [] }; if (closure) lay.closure = closure;
    if (place.type === 'wood') lay.base = T.DARK; else if (place.type === 'rock') lay.base = T.SAND;
  }
  const hh = place.heart, fill = o.fill, kind = fill ? fill.heart.kind : hh.kinds.find((k) => HEART_KINDS.includes(k)) || hh.kinds[0];
  const x = hh.x + ox, y = hh.y + oy;
  if (fill) {   // generator 6: the seeded fills (exploration/src/fill6.mjs) become the page's features, in the page's tiles
    const nextTo = (f) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = f.x + dx, Y = f.y + dy; return X >= 0 && Y >= 0 && X < pw && Y < ph && reach[Y * pw + X]; });
    lay.feats = fill.feats.map((f) => ({ ...f, x: f.x + ox, y: f.y + oy })).filter((f) => f.id === 'kh' || (nextTo(f) && (!sh || !T_BLOCK[tiles[f.y * pw + f.x]])));   // a find nobody could stand beside is dropped
    const taken = new Set(lay.feats.map((f) => f.y * pw + f.x));
    for (const s of fill.specials) {   // the burrow and the deep stone: on reachable ground, far from the way in, by seed
      let best = null, bs = -1;
      for (let i = 0; i < NP; i++) {
        const sx = i % pw, sy = (i / pw) | 0;
        if (!reach[i] || taken.has(i) || (sx === x && sy === y) || Math.abs(sx - spawnPt.x) + Math.abs(sy - spawnPt.y) < 6 || !nextTo({ x: sx, y: sy })) continue;
        if (lay.findSlots.some((f) => f.x === sx && f.y === sy)) continue;
        const sc = hash(o.seed ?? 0, 'special6', lay.cell, s.id, sx, sy); if (sc > bs) { bs = sc; best = { x: sx, y: sy }; }
      }
      if (best) { lay.feats.push({ ...s, ...best }); taken.add(best.y * pw + best.x); }
    }
    lay.name = fill.name;
    lay.podSlots = fill.podSlots.map((s) => ({ x: s.x + ox, y: s.y + oy, on: s.on })).filter((s) => !sh || !T_BLOCK[tiles[s.y * pw + s.x]]);
    lay.spawns = place.spawns.map((s) => ({ x: s.x + ox, y: s.y + oy, w: s.w, h: s.h, species: s.species }));
    if (kind === 'nest') lay.heartPods = fill.heart.second ? 2 : 1;
  }
  const wp = heartPath(lay, x, y);
  const clues = place.clues.length ? place.clues[0].points.map((p) => ({ x: p.x + ox, y: p.y + oy })) : wp.clues;
  lay.heart = { x, y, kind, reachBy: hh.reachBy === 'none' ? null : hh.reachBy, path: wp.path, clues };
  if (kind === 'moment') { lay.heart.species = (fill && fill.heart.species) || hh.species || []; lay.heart.line = (fill && fill.heart.line) || hh.revealLine || ''; }
  return lay;
}
