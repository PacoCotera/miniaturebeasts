// The painted land of the reach view and the full map, as plain data in and pixels out: the page gathers what it knows (which cells are seen, in fog, under a storm; the art desk's seamless tiles; the palette
// and its dark and light tables) and src/realm-worker.mjs paints it off the page's thread (src/place-store.mjs landAsk); a page without a worker paints it here with the same function.
// One continuous painting: each pixel takes the land of the cell under it (from the region's overview raster, one byte a world tile; else after a soft displacement of value noise, ±11 px at 72 px cells
// and ±2.5 px fine), so cell borders become coastlines, wood edges and field edges and no grid lines are drawn. Fog keeps its three states on the same soft borders. Pure: no page state.
import { hash, L, MW, MH } from './world.mjs';

const VN_LAT = new Map();   // the lattice values of the value noise, by (s, a, b): the same numbers as hash gives, found once (a painting asks for each of them thousands of times)
const vnLat = (s, a, b) => { if (a < 0 || b < 0 || a > 8191 || b > 8191 || s < 0 || s > 15) return (hash(9, s, a, b) % 1000) / 1000; const k = ((s * 8192 + a) * 8192) + b; let v = VN_LAT.get(k); if (v === undefined) { v = (hash(9, s, a, b) % 1000) / 1000; VN_LAT.set(k, v); } return v; };
export function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => vnLat(s, a, b), sm = t => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), u = sm(xf), w = sm(yf); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; }
// The painting's cell borders: the cell under a world pixel (-1 off the map). straight: the region's overview is there, so the borders are the straight lines its tiles fall on; else displaced by value noise.
export function landCellOf(cs, straight) {
  if (straight) return (wx, wy) => { const X = Math.floor(wx / cs), Y = Math.floor(wy / cs); return (X < 0 || Y < 0 || X >= MW || Y >= MH) ? -1 : Y * MW + X; };
  const k = cs / 72;
  const disp = (wx, wy) => [wx + (vnoise(wx / (13 * k), wy / (13 * k), 1) - .5) * 22 * k + (vnoise(wx / (5 * k), wy / (5 * k), 3) - .5) * 5 * k,
                            wy + (vnoise(wx / (13 * k), wy / (13 * k), 2) - .5) * 22 * k + (vnoise(wx / (5 * k), wy / (5 * k), 4) - .5) * 5 * k];
  return (wx, wy) => { const [a, b] = disp(wx, wy), X = Math.floor(a / cs), Y = Math.floor(b / cs); return (X < 0 || Y < 0 || X >= MW || Y >= MH) ? -1 : Y * MW + X; };
}
// inp: { X0, Y0, N, NH (pixels), cs, ovr (Uint8Array | null), OCW, OCH, land (Uint8Array a cell), seen, fog (0 none, 1 been, 2 dark: Uint8Array a cell), stormCol (Uint8Array a column), stormOn,
//        mist (Uint32Array of the opening's tile | null), mistTile, tiles { name: { p, w, h } | null }, tcs, pond { cell: { x, y, r } }, pal (Uint32Array palette index -> ABGR), DARK, LIGHT, WOOD_DARK,
//        K { ink, night, void, deep, stone, slate }, FOGV { n, b }, BAYER }
// Returns the ABGR pixels, N x NH.
export function paintLand(inp) {
  const { X0, Y0, N, NH, cs, ovr, OCW, OCH, land, seen, fog, stormCol, stormOn, mist, mistTile, tiles, tcs, pond, pal, DARK, LIGHT, WOOD_DARK, K, FOGV, BAYER } = inp, k = cs / 72;
  const u = new Uint32Array(N * NH), cellOf = landCellOf(cs, !!ovr), MWT = MW * OCW, MHT = MH * OCH;
  const tile = (n, wx, wy) => { const t = tiles[n]; return t ? t.p[(((wy % t.h) + t.h) % t.h) * t.w + (((wx % t.w) + t.w) % t.w)] : K.ink; };   // no art yet: a named empty slot (ink)
  const landOf = c => c < 0 ? -1 : land[c];
  const put = (i, c) => { u[i] = pal[c]; };
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < N; x++) {
      const wx = X0 * cs + x, wy = Y0 * cs + y, c = cellOf(wx, wy), b = BAYER[(y & 3) * 4 + (x & 3)];
      if (c < 0) { put(y * N + x, K.void); continue; }
      if (mist && !seen[c]) { u[y * N + x] = mist[(wy % mistTile) * mistTile + (wx % mistTile)]; continue; }
      if (!seen[c]) { const c2 = cellOf(wx + 4 * k, wy + 3 * k), edge = c2 >= 0 && seen[c2]; put(y * N + x, edge ? (b < 8 ? K.night : K.ink) : (b < 3 ? K.night : K.ink)); continue; }
      let ld = landOf(c), col, wood = false;
      const lx = (wx - (c % MW) * cs) / cs, ly = (wy - ((c / MW) | 0) * cs) / cs;
      // near water: a beach on the land side, foam on the water side
      const nearW = (d) => { for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const c3 = cellOf(wx + ox, wy + oy); if (c3 >= 0 && seen[c3] && (landOf(c3) === L.WATER) !== (ld === L.WATER)) return true; } return false; };
      if (ovr) {   // the tile under the pixel: its ground class, lighter where the land is raised. the deep sea is the desk's signed map-tex-deep (26 px); the raised tone is the signed layered-ground ruling (the next palette step up)
        const v = ovr[Math.min(MHT - 1, Math.floor(wy * OCH / cs)) * MWT + Math.min(MWT - 1, Math.floor(wx * OCW / cs))], k8 = v & 7;
        col = k8 === 2 ? tile('water', wx, wy) : k8 === 3 ? DARK[tile('water', wx, wy)] : k8 === 1 ? tile('beach', wx, wy) : k8 === 4 || k8 === 5 ? tile('wood', wx, wy) : k8 === 6 ? tile('rock', wx, wy) : tile('meadow', wx, wy);
        wood = k8 === 4 || k8 === 5; if (v & 8) col = LIGHT[col];
        if (k8 === 3 && tcs === 26) col = K.deep;   // NAMED EMPTY SLOT map-tex-deep-26 (the deep-sea tile, art desk to paint after a palette add): one flat fill of the darkest palette blue
      }
      if (!ovr && ld === L.POND) { const p = pond[c] || { x: .5, y: .5, r: .3 }, dx = (lx - p.x) / (p.r * 1.25), dy = (ly - p.y) / p.r, rr = dx * dx + dy * dy + (vnoise(wx / (6 * k), wy / (6 * k), 7) - .5) * .5;
        if (rr < 1) ld = L.WATER; else if (rr < 1.35) col = tile('pondrim', wx, wy); }
      if (col == null) {
        if (ld === L.WATER) col = nearW(3 * k) ? tile('foam', wx, wy) : tile('water', wx, wy);
        else if (nearW(2 * k)) col = tile('beach', wx, wy);
        else if (ld === L.WOOD) { col = tile('wood', wx, wy); wood = true; }
        else if (ld === L.ROCK) col = tile('rock', wx, wy);
        else if (ld === L.CLIFF) col = (wy % 5 === 0) ? K.stone : K.slate;
        else col = tile('meadow', wx, wy);
      }
      // the storm's dark over the cells it covers, then the fog states on the same soft borders
      const fs = fog[c];
      if (fs === 2 || (stormOn && stormCol[c % MW])) col = wood ? WOOD_DARK[col] : DARK[col];   // the wood's ground stays the wood's ground in the dark (one step down on the crowns): never the ink the unseen land is drawn in
      if (fs === 2) { if (b < FOGV.n) col = K.night; } else if (fs === 1 && b < FOGV.b) col = K.night;
      put(y * N + x, col);
    }
  }
  return u;
}
