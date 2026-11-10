// The dual grid (place design A2), by terrain. Terrain lives on the world grid W x H; tiles live on the grid offset by half a tile, (W+1) x (H+1),
// each picked by its four corners. Used by the bake only: the device never autotiles.
//
// Dual tile (i, j), 0 <= i <= W, 0 <= j <= H, is drawn at pixel (i*S - S/2, j*S - S/2); its corners are the cells
// NW (i-1, j-1), NE (i, j-1), SW (i-1, j), SE (i, j). Cells outside the place read as the nearest edge cell (clamp).
//
// Corner index = NW*8 + NE*4 + SW*2 + SE*1; a set bit means the corner holds the layer's terrain or a higher one.
// 0 is all lower, 15 all upper; 6 (NE+SW) and 9 (NW+SE) are the two diagonal tiles.
//
// A tile code is local to its terrain layer (see terrainLayers below); EMPTY (0xFFFF) draws nothing. The bake maps codes to atlas tile ids.

export const EMPTY = 0xFFFF;
export const FULL_BASE = 16;
export const NW = 8, NE = 4, SW = 2, SE = 1;

export class DualGridError extends Error {
  constructor(rule, message, info = {}) {
    super(message);
    this.name = 'DualGridError';
    this.rule = rule;
    Object.assign(this, info);
  }
}

// FNV-1a over the place id, then x and y: stable across runs and machines, the variant choice never changes unless the set's list does.
export function hash32(placeId, x, y) {
  let h = 0x811c9dc5;
  const mix = (b) => { h ^= b & 0xff; h = Math.imul(h, 0x01000193) >>> 0; };
  for (let k = 0; k < placeId.length; k++) mix(placeId.charCodeAt(k));
  for (const v of [x, y]) { mix(v); mix(v >> 8); mix(v >> 16); mix(v >> 24); }
  return h >>> 0;
}

export function cell(terrain, w, h, x, y) {
  const cx = x < 0 ? 0 : x >= w ? w - 1 : x;
  const cy = y < 0 ? 0 : y >= h ? h - 1 : y;
  return terrain[cy * w + cx];
}

// The four corner terrain values of dual tile (i, j): [NW, NE, SW, SE].
export function corners(terrain, w, h, i, j) {
  return [cell(terrain, w, h, i - 1, j - 1), cell(terrain, w, h, i, j - 1), cell(terrain, w, h, i - 1, j), cell(terrain, w, h, i, j)];
}

// ---- The dual grid by terrain (one layer per terrain) ----
// One fill per terrain plus one transparent 16-slot layer per upper terrain, drawn in terrain.json z order. A tile code of a terrain layer is
//   FILL_CODE + k      the k-th fill variant of the terrain (the lowest terrain of the tile),
//   KIND_STRIDE * kind + m   the over sheet of the terrain's `kind`-th kind, slot m = 1..14, or FULL_BASE + v for the v-th all-upper variant (a terrain with a ground).
// EMPTY (0xFFFF) draws nothing. The bake maps codes to atlas tile ids; openedges rewrites cliff, scrub and reed codes afterwards.
export const FILL_CODE = 0x2000;
export const KIND_STRIDE = 64;

export function splitCode(c) {
  if (c >= FILL_CODE && c !== EMPTY) return { fill: c - FILL_CODE };
  const kind = (c / KIND_STRIDE) | 0, m = c % KIND_STRIDE;
  return m >= FULL_BASE ? { kind, full: m - FULL_BASE } : { kind, slot: m };
}

// level:    { id, w, h, terrain: Uint8Array(w*h), tone?: Uint8Array(w*h) of 0/1, origin? }
// terrains: [{ id, value, z }]
// layers:   Map or object keyed by terrain VALUE -> { fillCount, kinds: [{ kind, lowers: Set(values), fullCount }], ground?: value, drawAs?: value } (setload.layerDescriptors)
// tone:     null, or { of: value } the terrain whose cells may carry tone; level.tone marks them. The tone layer is drawn last, at mask = the tone corners.
// Returns { w1, h1, layers: [{ terrain: value | null, tone?: true, tiles: Uint16Array((w+1)*(h+1)) }] } sorted by z, the tone layer last.
// Throws DualGridError: 'terrain-value' (a value terrain.json lacks), 'no-edge' (a lower terrain that no kind of the upper lists), 'no-layer' (a terrain the set has no layer for),
// 'tone-ground' (a tone corner on a tile that is not wholly the tone terrain).
export function terrainLayers(level, terrains, layers, tone = null) {
  const { id, w, h, terrain } = level;
  const vh = (i, j) => (level.origin ? hash32('', level.origin.x + i, level.origin.y + j) : hash32(id, i, j));
  const byValue = new Map(terrains.map((t) => [t.value, t]));
  const lay = layers instanceof Map ? layers : new Map(Object.entries(layers).map(([k, v]) => [+k, v]));
  for (let k = 0; k < terrain.length; k++) {
    if (!byValue.has(terrain[k])) throw new DualGridError('terrain-value', `${id}: cell (${k % w}, ${(k / w) | 0}) holds value ${terrain[k]}, which terrain.json does not define`, { level: id, cell: { x: k % w, y: (k / w) | 0 } });
  }
  const z = (v) => byValue.get(v).z;
  const resolve = (v) => { for (let n = 0; lay.get(v)?.drawAs !== undefined; n++) { if (n > 8) throw new DualGridError('no-layer', `${id}: drawAs loops at ${byValue.get(v).id}`, { level: id }); v = lay.get(v).drawAs; } return v; };
  const w1 = w + 1, h1 = h + 1;
  const out = new Map();   // terrain value -> Uint16Array
  const layerOf = (v) => { if (!out.has(v)) out.set(v, new Uint16Array(w1 * h1).fill(EMPTY)); return out.get(v); };
  const cellName = (i, j) => `dual tile (${i}, ${j}), cells (${Math.max(i - 1, 0)}..${Math.min(i, w - 1)}, ${Math.max(j - 1, 0)}..${Math.min(j, h - 1)})`;
  const toneLayer = tone ? new Uint16Array(w1 * h1).fill(EMPTY) : null;
  const toneAt = (x, y) => (level.tone ? level.tone[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))] : 0);

  for (let j = 0; j < h1; j++) for (let i = 0; i < w1; i++) {
    const cs = corners(terrain, w, h, i, j).map((v) => { const r = resolve(v); if (!lay.has(r)) throw new DualGridError('no-layer', `${id}: ${cellName(i, j)}: the set has no layer for ${byValue.get(r).id}`, { level: id, cell: { i, j } }); return r; });
    const present = new Set(cs);
    for (const v of [...present]) for (let g = lay.get(v).ground, n = 0; g !== undefined && n < 8; g = lay.get(g)?.ground, n++) present.add(g);
    const order = [...present].sort((a, b) => z(a) - z(b));
    const idx = j * w1 + i;
    const B = order[0], fill = lay.get(B);
    layerOf(B)[idx] = FILL_CODE + (vh(i, j) % Math.max(1, fill.fillCount || 1));
    for (const T of order.slice(1)) {
      const d = lay.get(T), zT = z(T);
      let mask = 0;
      [NW, NE, SW, SE].forEach((bit, k) => { if (z(cs[k]) >= zT) mask |= bit; });
      if (mask === 0) continue;
      if (mask === 15) {
        const kind = Math.max(0, d.kinds.findIndex((k) => k.fullCount > 0));
        layerOf(T)[idx] = KIND_STRIDE * kind + FULL_BASE + (vh(i, j) % Math.max(1, d.kinds[kind].fullCount || 1));
        continue;
      }
      const lowers = cs.filter((c) => z(c) < zT);
      for (const c of lowers) if (!d.kinds.some((k) => k.lowers.has(c))) throw new DualGridError('no-edge', `${id}: ${cellName(i, j)}: ${byValue.get(T).id} has no edge over ${byValue.get(c).id}`, { level: id, cell: { i, j }, terrains: [byValue.get(c).id, byValue.get(T).id] });
      const kind = d.kinds.findIndex((k) => lowers.some((c) => k.lowers.has(c)));
      layerOf(T)[idx] = KIND_STRIDE * kind + mask;
    }
    if (toneLayer) {
      const tm = (toneAt(i - 1, j - 1) ? NW : 0) | (toneAt(i, j - 1) ? NE : 0) | (toneAt(i - 1, j) ? SW : 0) | (toneAt(i, j) ? SE : 0);
      if (tm) {
        const onTone = [tone.of, ...(tone.also || [])];   // a tone tile is wholly one terrain that carries tone (grass, or the raised top)
        if (!onTone.includes(cs[0]) || !cs.every((c) => c === cs[0])) throw new DualGridError('tone-ground', `${id}: ${cellName(i, j)}: tone on a tile that is not all ${onTone.map((v) => byValue.get(v).id).join(' or ')}`, { level: id, cell: { i, j } });
        toneLayer[idx] = tm;
      }
    }
  }
  const res = [...out].sort((a, b) => z(a[0]) - z(b[0])).map(([terrainValue, tiles]) => ({ terrain: terrainValue, tiles }));
  if (toneLayer) res.push({ terrain: null, tone: true, tiles: toneLayer });
  return { w1, h1, layers: res };
}

// Pack by depth: dual tiles never overlap, so draw order matters only inside one tile. The k-th drawn entry of every tile goes to layer k
// (0xFFFF where its list is shorter). `layers` are in draw order with final tile ids (EMPTY draws nothing); returns [Uint16Array] of length max depth.
export function packDepth(layers, w1, h1) {
  const n = w1 * h1, packed = [];
  const depth = new Uint8Array(n);
  for (const l of layers) {
    for (let t = 0; t < n; t++) {
      const c = l.tiles[t];
      if (c === EMPTY) continue;
      if (depth[t] === packed.length) packed.push(new Uint16Array(n).fill(EMPTY));
      packed[depth[t]++][t] = c;
    }
  }
  return packed;
}
