// The world's edges laid on a baked place (owner, 2026-11-08: "the map, the reach view and the cell must show the same land"). A cell's edges are the world's (src/world.mjs
// sideKind: open, stair, cliff, scree, bank, water, the map's end) and every view draws them, so a template is adapted to the cell it stands in:
//   - the cliff lips, faces and sides, the water bands, the stairs and the scree and bank crossings come from world.mjs edgeLayer, the same code that lays a generated place's edges;
//     they sit where the template has an opening (a stair on the opening's span) or, with no opening on that side, near the middle;
//   - an open edge the template has no opening on gets one (the tree wall's gap); an opening on a side the world closes is plugged with the wall's own trees;
//   - the trees the bands cover are not drawn (`cut`: the props and canopy this cell shows).
// Pure: the world, the seed, the cell and the template in; plain data out. Tiles are in the template's own cells (the layout of a generator 6 place is the template's size).
import { T, TERR, hash, stairPos, edgeLayer, sideKind, BANK_IN } from '../../exploration/src/world.mjs';

export const SIDE_OF = { up: 'N', down: 'S', left: 'W', right: 'E' };
export const DIR_OF = { N: 'up', S: 'down', W: 'left', E: 'right' };
const DIRS = ['up', 'down', 'left', 'right'];
const BAND_TERR = new Set([TERR.LIP, TERR.FACE, TERR.SIDE, TERR.STAIR, TERR.LANDING, TERR.FOOT, TERR.APRON_TOP]);
const BAND_TILE = new Set([T.WATER, T.DEEP, T.ISLE, T.REEDS, T.SAND, T.SCREE, T.BANK]);

// The cell (x, y) at `depth` tiles in from `dir`'s border, `k` along it.
export const sideXY = (dir, k, depth, w, h) => ({ x: dir === 'left' ? depth : dir === 'right' ? w - 1 - depth : k, y: dir === 'up' ? depth : dir === 'down' ? h - 1 - depth : k });

// The tiles of the place's biggest dry stretch, from `walk0` (1 where the terrain and the template's props leave a tile free): where a stair, crossing or new opening may lead to.
function mainStretch(walk0, w, h) {
  const lab = new Int32Array(w * h).fill(-1), size = []; let best = -1;
  for (let s = 0; s < w * h; s++) {
    if (!walk0[s] || lab[s] >= 0) continue;
    const id = size.length; size.push(0); const st = [s]; lab[s] = id;
    while (st.length) { const i = st.pop(), x = i % w, y = (i / w) | 0; size[id]++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= w || Y >= h) continue; const j = Y * w + X; if (walk0[j] && lab[j] < 0) { lab[j] = id; st.push(j); } } }
  }
  for (let k = 0; k < size.length; k++) if (best < 0 || size[k] > size[best]) best = k;
  return i => lab[i] === best;
}

// walk0: Uint8Array(w * h), 1 where the template's ground and props leave a tile free (the adapter builds it).
export function shapeEdges(G, seed, cell, place, ts, walk0) {
  const w = place.w, h = place.h, NP = w * h, I = (x, y) => y * w + x, inb = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const tilesE = new Uint8Array(NP).fill(T.GRASS), terr = new Uint8Array(NP), tmask = new Uint8Array(NP);
  const opening = {}; for (const o of place.openings) opening[o.side] = o;
  const lenOf = d => d === 'up' || d === 'down' ? w : h;
  const main = walk0 ? mainStretch(walk0, w, h) : () => true;
  // A stair, crossing or gap starts at the template's opening (or the middle, by seed) and moves along the side until the ground behind it (depth `d`) is dry stretch both tiles wide.
  const led = (dir, k, d) => { for (const kk of [k, k + 1]) for (let dd = d - 2; dd <= d; dd++) { const p = sideXY(dir, kk, dd, w, h); if (!inb(p.x, p.y) || !main(I(p.x, p.y))) return false; } return true; };
  const place2 = (dir, len, want, d) => { for (let o = 0; o < len; o++) for (const k of o ? [want + o, want - o] : [want]) if (k >= 3 && k <= len - 5 && led(dir, k, d)) return k; return want; };
  const wantAt = (dir, ei, len) => { const o = opening[SIDE_OF[dir]]; return o ? o.from + ((o.to - o.from - 1) >> 1) : Math.max(3, Math.min(len - 5, stairPos(seed, ei, len))); };   // on the template's opening
  const at = (dir, ei, len) => place2(dir, len, wantAt(dir, ei, len), 4);
  const atCross = (dir, ei, len) => place2(dir, len, wantAt(dir, ei, len), (!(G.soft && G.soft.scree[ei]) && G.banks && G.banks[ei] ? BANK_IN : 0) + 4);
  const { stairs, cross } = edgeLayer(G, seed, cell, { w, h, tiles: tilesE, terr, tmask, stairAt: at, crossAt: atCross, waterDepth: { min: 2, span: 1 }, swimDepth: { min: 5, span: 1 } });
  const R = new Uint8Array(NP), rim = [];
  for (let i = 0; i < NP; i++) if (terr[i] || tilesE[i] !== T.GRASS) { R[i] = 1; rim.push(i); }
  // which sides carry a band that replaces the tree wall (a bare shadow strip does not)
  const kind = {}, band = {};
  for (const d of DIRS) {
    kind[d] = sideKind(G, cell, d); const len = lenOf(d); band[d] = false;
    for (let k = 4; k < len - 4 && !band[d]; k++) for (let dep = 0; dep < 2; dep++) { const p = sideXY(d, k, dep, w, h), i = I(p.x, p.y); if (BAND_TERR.has(terr[i]) || BAND_TILE.has(tilesE[i])) { band[d] = true; break; } }
  }
  // the cells whose trees are not drawn
  const H = new Uint8Array(NP); for (const i of rim) if (terr[i] !== TERR.SHADOW) H[i] = 1;   // a bare shadow strip leaves the wall standing
  const zone = (dir, k0, k1, depth) => { for (let k = k0; k <= k1; k++) for (let d = 0; d <= depth; d++) { const p = sideXY(dir, k, d, w, h); if (inb(p.x, p.y)) H[I(p.x, p.y)] = 1; } };
  for (const d of DIRS) if (band[d]) zone(d, 1, lenOf(d) - 2, 1);
  for (const q of stairs) zone(q.dir, q.s - 1, q.s + 2, 3);
  for (const q of cross) zone(q.dir, q.s - 1, q.s + 2, q.off + 3);
  // the openings the world keeps: the template's on an open side, and a new one (the wall's gap) on an open side the template has none on
  const openings = [];
  for (const o of place.openings) if (kind[DIR_OF[o.side]] === 'open') openings.push({ side: o.side, from: o.from, to: o.to });   // the template's own, in its order (the first is the way in)
  for (const d of DIRS) {
    if (kind[d] !== 'open' || opening[SIDE_OF[d]]) continue;
    const len = lenOf(d), want = Math.max(3, Math.min(len - 7, (len >> 1) - 2 + (hash(seed, 'gap', cell, d) % 5) - 2));
    let m = want; search: for (let o = 0; o < len; o++) for (const k of o ? [want + o, want - o] : [want]) if (k >= 3 && k <= len - 7 && led(d, k + 1, 4)) { m = k; break search; }
    zone(d, m + 1, m + 2, 2); openings.push({ side: SIDE_OF[d], from: m + 1, to: m + 2 });   // two tiles wide, as the templates' narrowest
  }
  // the props this cell shows: a tree whose trunk or footprint stands in a hidden cell is not drawn; a closed opening is plugged with clones of the wall's trees
  const landmarks = new Set(place.landmarks.map(l => l.y * w + l.x)), cellOf = p => ({ cx: Math.floor(p.x / 48), cy: Math.floor(p.y / 48) });
  const hid = p => { const { cx, cy } = cellOf(p); if (landmarks.has(cy * w + cx)) return false; if (inb(cx, cy) && H[I(cx, cy)]) return true;
    const fp = ts.sprites[p.kind].footprint; for (let i = 0; i + 1 < fp.length; i += 2) { const x = cx + fp[i], y = cy + fp[i + 1]; if (inb(x, y) && H[I(x, y)]) return true; } return false; };
  const props = place.props.filter(p => !hid(p)), canopy = place.canopy.filter(c => { const { cx, cy } = cellOf(c); return !(inb(cx, cy) && H[I(cx, cy)]); });
  const isTree = p => ts.sprites[p.kind].footprint.length > 0;   // a tree, a boulder: what the wall is made of
  const plugged = [], occ = new Set();
  const stand = p => { const { cx, cy } = cellOf(p), fp = ts.sprites[p.kind].footprint; for (let i = 0; i + 1 < fp.length; i += 2) occ.add(I(cx + fp[i], cy + fp[i + 1])); };
  for (const p of props) stand(p);
  for (const d of DIRS) {
    const o = opening[SIDE_OF[d]]; if (!o || kind[d] === 'open' || band[d]) continue;
    const vertical = d === 'up' || d === 'down', len = lenOf(d);
    const wall = props.filter(p => { if (!isTree(p)) return false; const { cx, cy } = cellOf(p), dep = d === 'up' ? cy : d === 'down' ? h - 1 - cy : d === 'left' ? cx : w - 1 - cx; return dep === 0; });
    for (let k = Math.max(0, o.from - 2); k <= Math.min(len - 1, o.to + 2); k++) {   // every gap of the wall about the opening (the metadata's span can be a tile off)
      const p0 = sideXY(d, k, 0, w, h), i0 = I(p0.x, p0.y); if (occ.has(i0) || (R[i0] && terr[i0] !== TERR.SHADOW)) continue;
      let best = null, bd = 1e9; for (const p of wall) { const { cx, cy } = cellOf(p), kk = vertical ? cx : cy, dd = Math.abs(kk - k); if (dd < bd) { bd = dd; best = p; } }
      if (!best) continue;
      const { cx, cy } = cellOf(best), dk = (vertical ? k - cx : k - cy) * 48;
      const q = vertical ? { ...best, x: best.x + dk } : { ...best, y: best.y + dk, sortY: best.sortY + dk }; props.push(q); plugged.push(q); stand(q);
    }
  }
  return { tilesE, terr, tmask, rim, R, stairs, cross, openings, props, canopy, kind, band, plugged };
}
