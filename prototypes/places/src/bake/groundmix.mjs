// Ground patches (scheme Rule 1.6, the art director's round 4: the swirl repeat is not OK). Every full grass tile of a baked place, whichever pair it belongs to (grass's full tiles, grass as a lower
// side, the raised top's fill), takes one of three of the set's own ground tiles: the plain fill or one of the two swirl variants. Which one is the IR's `groundMix` (0, 1 or 2 per dual tile, a noise
// field at world position, made by the generator), so the ground forms patches of a few tiles. Only tile ids change; no pixel is touched and nothing is drawn.
const PATH = 5, GRASS = 6, CLIFF = 8, T48 = 2304;
const cache = new Map();

// { mix: [plain, swirl, swirl] tile ids, full: Set of tile ids that are plain full grass in some pair } for a baked tile set
export function groundSet(ts) {
  if (cache.has(ts)) return cache.get(ts);
  const slotOf = (id) => ts.tiles[id].frames[0], tile = (id) => ts.atlas48.subarray(slotOf(id) * T48, (slotOf(id) + 1) * T48);
  const busy = (id) => { const n = new Map(); for (const v of tile(id)) n.set(v, (n.get(v) || 0) + 1); return T48 - Math.max(...n.values()); };   // pixels off the main colour: the swirl
  const pg = ts.pairs.find((p) => p.lower === PATH && p.upper === GRASS).fullVariants.slice().sort((a, b) => busy(a) - busy(b));
  const mix = [pg[0], pg[pg.length - 2], pg[pg.length - 1]];
  const mainCliff = ts.pairs.find((p) => p.lower === GRASS && p.upper === CLIFF), full = new Set(), seen = new Set();
  for (const p of ts.pairs) {
    const key = p.lower + '|' + p.upper; if (seen.has(key)) continue; seen.add(key);   // main pairs only: the extras (tall sheets, way up, variants, looks) are faces and pieces, not ground
    if (p.upper === GRASS) for (const id of p.fullVariants) full.add(id);
    if (p.lower === GRASS) { if (p.tiles[0] !== 0xFFFF) full.add(p.tiles[0]); for (const id of p.emptyVariants || []) full.add(id); }
    if (p === mainCliff) { for (const id of p.fullVariants) full.add(id); if (p.tiles[15] !== 0xFFFF) full.add(p.tiles[15]); }   // the main pair only: the tall sheets' tile 15 is a face, not ground
  }
  const out = { mix, full }; cache.set(ts, out); return out;
}

// place.ground: layers of dual tiles ((w+1) x (h+1)); mixOf: Uint8Array of 0..2 per dual tile
export function applyGroundMix(place, mixOf, ts) {
  const { mix, full } = groundSet(ts);
  for (const layer of place.ground) for (let k = 0; k < layer.tiles.length; k++) if (full.has(layer.tiles[k])) layer.tiles[k] = mix[mixOf[k]];
}
