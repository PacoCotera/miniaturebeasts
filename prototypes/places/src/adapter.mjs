// A baked place -> the exploration page's layout `lay` (place design A6, "layout() branches"). Pure: no page state.
// The page's grid is PW x PH (28 x 32) until places of two sizes land in the page, so the 18 x 22 place is centred in it: the cells around it are
// rock (never walked), and `lay.baked.ox/oy` say where it sits. Terrain becomes the page's tile T, prop footprints become TRUNK (a tree, which has
// a canopy) or ROCK, tall grass becomes T.TALL; the heart, its clue marks and the openings come from the place's entities.
import { T, T_BLOCK, L, PW, PH, hash } from '../../exploration/src/world.mjs';
import { heartPath } from '../../exploration/src/hearts.mjs';

const LAND = { pond: L.POND, rock: L.ROCK, wood: L.WOOD, meadow: L.MEADOW };
export const HEART_KINDS = ['nest', 'stone', 'spring'];   // what the page's rules know today; "moment" waits for its own chunk

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
  for (const p of place.props) {
    const s = ts.sprites[p.kind], cx = Math.floor(p.x / 48), cy = Math.floor(p.y / 48);
    if (s.kind === 'tall-grass' && !s.footprint.length) { if (tiles[I(cx, cy)] === T.GRASS) tiles[I(cx, cy)] = T.TALL; continue; }
    for (let i = 0; i + 1 < s.footprint.length; i += 2) {
      const x = cx + s.footprint[i], y = cy + s.footprint[i + 1];
      if (x >= 0 && y >= 0 && x < w && y < h) tiles[I(x, y)] = s.canopy >= 0 ? T.TRUNK : T.ROCK;
    }
  }
  const openings = place.openings.map((op) => ({ side: op.side, from: op.from, to: op.to }));
  const arrive = openings.length ? arrivalCell(openings[0], w, h) : { x: w >> 1, y: h >> 1 };
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
    w: pw, h: ph, openings, findSlots: place.finds.map((f) => ({ x: f.x + ox, y: f.y + oy, kinds: f.kinds, chance: f.chance })),
    baked: { id: place.id, ox, oy, w, h },
  };
  const hh = place.heart, fill = o.fill, kind = fill ? fill.heart.kind : hh.kinds.find((k) => HEART_KINDS.includes(k)) || hh.kinds[0];
  const x = hh.x + ox, y = hh.y + oy;
  if (fill) {   // generator 6: the seeded fills (exploration/src/fill6.mjs) become the page's features, in the page's tiles
    const nextTo = (f) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = f.x + dx, Y = f.y + dy; return X >= 0 && Y >= 0 && X < pw && Y < ph && reach[Y * pw + X]; });
    lay.feats = fill.feats.map((f) => ({ ...f, x: f.x + ox, y: f.y + oy })).filter((f) => f.id === 'kh' || nextTo(f));   // a find nobody could stand beside is dropped
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
    lay.podSlots = fill.podSlots.map((s) => ({ x: s.x + ox, y: s.y + oy, on: s.on }));
    lay.spawns = place.spawns.map((s) => ({ x: s.x + ox, y: s.y + oy, w: s.w, h: s.h, species: s.species }));
    if (kind === 'nest') lay.heartPods = fill.heart.second ? 2 : 1;
  }
  const wp = heartPath(lay, x, y);
  const clues = place.clues.length ? place.clues[0].points.map((p) => ({ x: p.x + ox, y: p.y + oy })) : wp.clues;
  lay.heart = { x, y, kind, reachBy: hh.reachBy === 'none' ? null : hh.reachBy, path: wp.path, clues };
  return lay;
}
