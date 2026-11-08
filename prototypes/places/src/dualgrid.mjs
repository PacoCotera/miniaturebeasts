// The dual grid (place design A2). Terrain lives on the world grid W x H; tiles live on the grid offset by half a tile, (W+1) x (H+1),
// each picked by its four corners. Used by the bake only: the device never autotiles.
//
// Dual tile (i, j), 0 <= i <= W, 0 <= j <= H, is drawn at pixel (i*S - S/2, j*S - S/2); its corners are the cells
// NW (i-1, j-1), NE (i, j-1), SW (i-1, j), SE (i, j). Cells outside the place read as the nearest edge cell (clamp).
//
// Corner index = NW*8 + NE*4 + SW*2 + SE*1; a set bit means the corner holds the pair's UPPER terrain.
// 0 is all lower, 15 all upper; 6 (NE+SW) and 9 (NW+SE) are the two diagonal tiles.
//
// A layer tile code is local to its pair: 0..15 a corner tile, FULL_BASE + k the k-th variant of the all-upper tile,
// EMPTY_BASE + k the k-th variant of the all-lower tile; EMPTY (0xFFFF) draws nothing. The bake maps codes to atlas slots.

export const EMPTY = 0xFFFF;
export const FULL_BASE = 16;
export const EMPTY_BASE = 128;
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

// inUpper(terrainValue) -> boolean. Returns the corner index of dual tile (i, j).
export function cornerIndex(terrain, w, h, i, j, inUpper) {
  return (inUpper(cell(terrain, w, h, i - 1, j - 1)) ? NW : 0)
       | (inUpper(cell(terrain, w, h, i, j - 1)) ? NE : 0)
       | (inUpper(cell(terrain, w, h, i - 1, j)) ? SW : 0)
       | (inUpper(cell(terrain, w, h, i, j)) ? SE : 0);
}

// The four corner terrain values of dual tile (i, j): [NW, NE, SW, SE].
export function corners(terrain, w, h, i, j) {
  return [cell(terrain, w, h, i - 1, j - 1), cell(terrain, w, h, i, j - 1), cell(terrain, w, h, i - 1, j), cell(terrain, w, h, i, j)];
}

// Build the ground layers of a place.
//   level:    { id, w, h, terrain: Uint8Array(w*h) of IntGrid values }
//   terrains: [{ id, value, z }]  (art/places/terrain.json)
//   pairs:    [{ lower, upper, mode: 'opaque'|'over', fullCount, emptyCount, upperLook?, lowerLook? }] in the set's order; ids are terrain ids.
//             upperLook / lowerLook: strings equal for two pairs exactly when their all-upper (all-lower) tiles draw identical pixels.
// Returns { w1, h1, layers: [{ pair: index into pairs, tiles: Uint16Array((w+1)*(h+1)) }] } in draw order (upper z, then lower z).
// Throws DualGridError for the rules of A3.2: a three-terrain corner where a pair is opaque, a terrain pair the set has no pair for,
// a terrain the set cannot draw as ground, a lower region that would meet itself with two looks.
export function dualGrid(level, terrains, pairs) {
  const { id, w, h, terrain } = level;
  const byValue = new Map(terrains.map((t) => [t.value, t]));
  const byId = new Map(terrains.map((t) => [t.id, t]));
  for (let k = 0; k < terrain.length; k++) {
    if (!byValue.has(terrain[k])) throw new DualGridError('terrain-value', `${id}: cell (${k % w}, ${(k / w) | 0}) holds value ${terrain[k]}, which terrain.json does not define`, { level: id, cell: { x: k % w, y: (k / w) | 0 } });
  }
  const z = (value) => byValue.get(value).z;
  const order = pairs.map((p, k) => k).sort((a, b) => {
    const pa = pairs[a], pb = pairs[b];
    return byId.get(pa.upper).z - byId.get(pb.upper).z || byId.get(pa.lower).z - byId.get(pb.lower).z || a - b;
  });
  const w1 = w + 1, h1 = h + 1;
  const layers = new Map(); // pair index -> Uint16Array
  const layerOf = (k) => { if (!layers.has(k)) layers.set(k, new Uint16Array(w1 * h1).fill(EMPTY)); return layers.get(k); };
  const pairFor = (idA, idB) => order.find((k) => (pairs[k].lower === idA && pairs[k].upper === idB) || (pairs[k].lower === idB && pairs[k].upper === idA));
  const cellName = (i, j) => `dual tile (${i}, ${j}), cells (${Math.max(i - 1, 0)}..${Math.min(i, w - 1)}, ${Math.max(j - 1, 0)}..${Math.min(j, h - 1)})`;

  const uniform = []; // [i, j, terrain id]: all four corners alike; resolved after the two-terrain tiles
  const idx = (i, j) => j * w1 + i;

  for (let j = 0; j < h1; j++) for (let i = 0; i < w1; i++) {
    const cs = corners(terrain, w, h, i, j);
    const set = [...new Set(cs)];
    if (set.length === 1) { uniform.push([i, j, byValue.get(set[0]).id]); continue; }
    const ids = set.map((v) => byValue.get(v).id).sort((a, b) => z(byId.get(a).value) - z(byId.get(b).value));
    if (set.length === 2) {
      const k = pairFor(ids[0], ids[1]);
      if (k === undefined) throw new DualGridError('no-pair', `${id}: ${cellName(i, j)}: the set has no pair for ${ids[0]} and ${ids[1]}`, { level: id, cell: { i, j }, terrains: ids });
      const p = pairs[k], up = byId.get(p.upper).value;
      layerOf(k)[idx(i, j)] = cornerIndex(terrain, w, h, i, j, (v) => v === up);
      continue;
    }
    // three or more terrains at one corner: only pairs in `over` mode stack
    const involved = pairs.filter((p) => ids.includes(p.lower) || ids.includes(p.upper));
    const opaque = involved.find((p) => p.mode === 'opaque');
    if (opaque || involved.length === 0) {
      throw new DualGridError('three-terrain', `${id}: ${cellName(i, j)}: three terrains (${ids.join(', ')}) meet at one corner and the pair ${opaque ? opaque.upper + '|' + opaque.lower : 'set'} is opaque`, { level: id, cell: { i, j }, terrains: ids });
    }
    for (const k of order) {
      const p = pairs[k];
      if (!ids.includes(p.upper)) continue;
      const u = byId.get(p.upper).z;
      const index = cornerIndex(terrain, w, h, i, j, (v) => z(v) >= u);
      if (index === 0) continue;
      layerOf(k)[idx(i, j)] = index === 15 ? FULL_BASE + (hash32(id, i, j) % Math.max(1, p.fullCount || 1)) : index;
    }
  }


  // Uniform tiles (all four corners alike). A region of one terrain takes its look from the pair of the nearest two-terrain tile that
  // touches it (8-neighbour seeds in raster order, then breadth-first over the region's uniform tiles): as the pair's upper terrain it
  // draws the pair's full tile (variant by hash), as the lower terrain its all-lower tile (index 0, or a variant from emptySheet). A region no
  // shore touches takes the first pair listing the terrain, upper role first. A region two of whose neighbouring tiles would draw
  // different pixels shows a seam inside itself and is refused ('two-looks'). Looks: pairs[k].upperLook / lowerLook, strings equal
  // exactly when the tiles are pixel-identical.
  const isUniform = new Map(uniform.map(([i, j, tid]) => [idx(i, j), tid]));
  const state = new Map(); // tile -> { k, role }
  const near8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  const roleIn = (k, tid) => (pairs[k].upper === tid ? 'upper' : pairs[k].lower === tid ? 'lower' : null);
  const queue = [];
  for (const [i, j, tid] of uniform) {
    for (const [dx, dy] of near8) {
      const ni = i + dx, nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= w1 || nj >= h1 || isUniform.has(idx(ni, nj))) continue;
      const k = order.find((kk) => roleIn(kk, tid) && layers.has(kk) && layers.get(kk)[idx(ni, nj)] !== EMPTY);
      if (k !== undefined && !state.has(idx(i, j))) { state.set(idx(i, j), { k, role: roleIn(k, tid) }); queue.push([i, j]); }
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const [i, j] = queue[q], st = state.get(idx(i, j)), tid = isUniform.get(idx(i, j));
    for (const [dx, dy] of near8.slice(0, 4)) {
      const ni = i + dx, nj = j + dy;
      if (ni < 0 || nj < 0 || ni >= w1 || nj >= h1 || isUniform.get(idx(ni, nj)) !== tid || state.has(idx(ni, nj))) continue;
      state.set(idx(ni, nj), st); queue.push([ni, nj]);
    }
  }
  for (const [i, j, tid] of uniform) {
    let st = state.get(idx(i, j));
    if (!st) {
      const k = order.find((kk) => pairs[kk].upper === tid) ?? order.find((kk) => pairs[kk].lower === tid);
      if (k === undefined) throw new DualGridError('no-ground', `${id}: ${cellName(i, j)}: the set cannot draw ${tid} as ground`, { level: id, cell: { i, j }, terrains: [tid] });
      st = { k, role: roleIn(k, tid) };
      state.set(idx(i, j), st);
    }
    const p = pairs[st.k];
    let code;
    if (st.role === 'upper') code = FULL_BASE + (hash32(id, i, j) % Math.max(1, p.fullCount || 1));
    else code = p.emptyCount ? EMPTY_BASE + (hash32(id, i, j) % p.emptyCount) : 0;
    layerOf(st.k)[idx(i, j)] = code;
  }
  const look = (st) => (st.role === 'upper' ? pairs[st.k].upperLook : pairs[st.k].lowerLook) ?? `${st.k}/${st.role}`;
  for (const [i, j, tid] of uniform) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const ni = i + dx, nj = j + dy;
      if (isUniform.get(idx(ni, nj)) !== tid) continue;
      const a = state.get(idx(i, j)), b = state.get(idx(ni, nj));
      if (look(a) !== look(b)) {
        throw new DualGridError('two-looks', `${id}: ${cellName(i, j)}: ${tid} is drawn two ways here (next to ${cellName(ni, nj)}; it touches shores of ${pairs[a.k].upper}|${pairs[a.k].lower} and ${pairs[b.k].upper}|${pairs[b.k].lower} whose ${tid} differs)`, { level: id, cell: { i, j }, terrains: [tid] });
      }
    }
  }

  return { w1, h1, layers: order.filter((k) => layers.has(k)).map((k) => ({ pair: k, tiles: layers.get(k) })) };
}
