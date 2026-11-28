// The painted land of the reach view and the full map, as plain data in and pixels out: the page gathers what it knows (which cells are seen, in fog, under a storm; the art desk's seamless tiles; the palette
// and its dark and light tables) and src/worker.mjs paints it off the page's thread (src/store/place-store.mjs landAsk); a page without a worker paints it here with the same function.
// One continuous painting: each pixel takes the ground and tone of the block under it (the region's sector, world-topdown-spec-1 2.4: 4 x 4 blocks a place, each a ground class and a level bit, made from the realm
// before any place is built); until the sector is here, the land of the cell under it after a soft displacement of value noise (±11 px at 72 px cells and ±2.5 px fine), so cell borders become coastlines, wood edges
// and field edges and no grid lines are drawn. Fog keeps its three states on the same borders. Pure: no page state.
import { hash, L, MW, MH } from '../logic/world.mjs';
import { shoreValue, SHORE_SHALLOW, SHORE_BEACH } from '../gen7/shore7.mjs';
import { fogEdges } from './fogedge.mjs';
import { CW as CWT, CH as CHT } from '../gen7/world.mjs';   // the tiles of a cell

const VN_LAT = new Map();   // the lattice values of the value noise, by (s, a, b): the same numbers as hash gives, found once (a painting asks for each of them thousands of times)
const vnLat = (s, a, b) => { if (a < 0 || b < 0 || a > 8191 || b > 8191 || s < 0 || s > 15) return (hash(9, s, a, b) % 1000) / 1000; const k = ((s * 8192 + a) * 8192) + b; let v = VN_LAT.get(k); if (v === undefined) { v = (hash(9, s, a, b) % 1000) / 1000; VN_LAT.set(k, v); } return v; };
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, h = (a, b) => vnLat(s, a, b), sm = t => t * t * (3 - 2 * t);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), u = sm(xf), w = sm(yf); return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w; }
// The painting's cell borders: the cell under a world pixel (-1 off the map). straight: the region's sector is there, so the borders are the straight lines its blocks fall on; else displaced by value noise.
function landCellOf(cs, straight) {
  if (straight) return (wx, wy) => { const X = Math.floor(wx / cs), Y = Math.floor(wy / cs); return (X < 0 || Y < 0 || X >= MW || Y >= MH) ? -1 : Y * MW + X; };
  const k = cs / 72;
  const disp = (wx, wy) => [wx + (vnoise(wx / (13 * k), wy / (13 * k), 1) - .5) * 22 * k + (vnoise(wx / (5 * k), wy / (5 * k), 3) - .5) * 5 * k,
                            wy + (vnoise(wx / (13 * k), wy / (13 * k), 2) - .5) * 22 * k + (vnoise(wx / (5 * k), wy / (5 * k), 4) - .5) * 5 * k];
  return (wx, wy) => { const [a, b] = disp(wx, wy), X = Math.floor(a / cs), Y = Math.floor(b / cs); return (X < 0 || Y < 0 || X >= MW || Y >= MH) ? -1 : Y * MW + X; };
}
// inp: { X0, Y0, N, NH (pixels), cs, sec ({ cls, lv: Uint8Array(cells * 16) } | null), land (Uint8Array a cell), seen, fog (0 none, 1 been, 2 dark: Uint8Array a cell), stormCol (Uint8Array a column), stormOn,
//        mist (Uint32Array of the opening's tile | null), mistTile, tiles { name: { p, w, h } | null }, tcs, pal (Uint32Array palette index -> ABGR), DARK, LIGHT, WOOD_DARK,
//        K { ink, night, void, deep, stone, slate }, FOGV { n, b }, BAYER, shore ({ seed, slot, ford: Uint8Array a cell } | null) }
// Returns the ABGR pixels, N x NH.
export function paintLand(inp) {
  const { X0, Y0, N, NH, cs, sec, land, seen, fog, stormCol, stormOn, mist, mistTile, tiles, tcs, pal, DARK, LIGHT, WOOD_DARK, K, FOGV, BAYER } = inp, k = cs / 72;
  // owner #141, #178 (water is not a box): the sector's blocks are 6 x 7 tiles, so a sea cell beside land met it on a ruler line a cell long. Where a wide-water cell (no ford) has a land cell beside it, the coast is the one line
  // the places lay (shore7.mjs shoreValue, read at the pixel's tile): sea one side, beach the other, shallows along it; away from land the block's own ground and deep sea stand.
  const sh = sec && inp.shore ? inp.shore : null; let shoreCells = null, seamC = null;
  if (sh) {
    const rx = sh.slot[0] * MW, ry = sh.slot[1] * MH, cl = (cx, cy) => Math.min(MH - 1, Math.max(0, cy - ry)) * MW + Math.min(MW - 1, Math.max(0, cx - rx));
    shoreCells = { wide: (cx, cy) => { const c = cl(cx, cy); return land[c] === L.WATER && !sh.ford[c]; }, water: (cx, cy) => land[cl(cx, cy)] === L.WATER };
    seamC = new Uint8Array(MW * MH);
    for (let Y = 0; Y < MH; Y++) for (let X = 0; X < MW; X++) { const w0 = shoreCells.wide(rx + X, ry + Y); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (shoreCells.wide(rx + X + i, ry + Y + j) !== w0) seamC[Y * MW + X] = 1; }
  }
  const u = new Uint32Array(N * NH), cellOf = landCellOf(cs, !!sec);
  // owner #178 / #141: where the cells are straight (the sector is here) the dark's edge is the art desk's signed soft one, laid on the seen side (src/render/fogedge.mjs), not the cell's straight line
  const fe = inp.fogEdge, softEdge = !!(fe && sec && !mist);
  const tile = (n, wx, wy) => { const t = tiles[n]; return t ? t.p[(((wy % t.h) + t.h) % t.h) * t.w + (((wx % t.w) + t.w) % t.w)] : K.ink; };   // no art yet: a named empty slot (ink)
  const landOf = c => c < 0 ? -1 : land[c];
  const put = (i, c) => { u[i] = pal[c]; };
  for (let y = 0; y < NH; y++) {
    for (let x = 0; x < N; x++) {
      const wx = X0 * cs + x, wy = Y0 * cs + y, c = cellOf(wx, wy), b = BAYER[(y & 3) * 4 + (x & 3)];
      if (c < 0) { put(y * N + x, K.void); continue; }
      if (mist && !seen[c]) { u[y * N + x] = mist[(wy % mistTile) * mistTile + (wx % mistTile)]; continue; }
      if (!seen[c]) { const c2 = cellOf(wx + 4 * k, wy + 3 * k), edge = !softEdge && c2 >= 0 && seen[c2]; put(y * N + x, edge ? (b < 8 ? K.night : K.ink) : (b < 3 ? K.night : K.ink)); continue; }
      let ld = landOf(c), col, wood = false;
      const lx = (wx - (c % MW) * cs) / cs, ly = (wy - ((c / MW) | 0) * cs) / cs;
      // near water: a beach on the land side, foam on the water side
      const nearW = (d) => { for (const [ox, oy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const c3 = cellOf(wx + ox, wy + oy); if (c3 >= 0 && seen[c3] && (landOf(c3) === L.WATER) !== (ld === L.WATER)) return true; } return false; };
      if (sec) {   // the block under the pixel: its ground class (0 grass, 1 wood floor, 2 thicket or scrub, 3 rock, 4 sand, 5 water; +8 the deep sea), lighter where its level bit says raised. The deep sea is the desk's signed map-tex-deep (26 px); the raised tone is the signed layered-ground ruling (the next palette step up)
        const b = c * 16 + Math.min(3, Math.floor(ly * 4)) * 4 + Math.min(3, Math.floor(lx * 4)), v = sec.cls[b], k8 = v & 7;
        col = k8 === 5 ? (v & 8 ? DARK[tile('water', wx, wy)] : tile('water', wx, wy)) : k8 === 4 ? tile('beach', wx, wy) : k8 === 1 || k8 === 2 ? tile('wood', wx, wy) : k8 === 3 ? tile('rock', wx, wy) : tile('meadow', wx, wy);
        wood = k8 === 1 || k8 === 2;
        let sv = null; if (sh && seamC[c]) sv = shoreValue(sh.seed, shoreCells, sh.slot[0] * MW * CWT + Math.floor(wx / cs * CWT), sh.slot[1] * MH * CHT + Math.floor(wy / cs * CHT));
        if (sv !== null && sv > 0) { wood = false; col = sv >= SHORE_SHALLOW && (v & 8) ? (tcs === 26 ? K.deep : DARK[tile('water', wx, wy)]) : tile('water', wx, wy); }   // the sea: shallows along the line
        else {
          if (sv !== null && (k8 === 5 || k8 === 0 || k8 === 4)) { wood = false; col = sv > -SHORE_BEACH ? tile('beach', wx, wy) : tile('meadow', wx, wy); }   // the land the line leaves: beach beside the water, then the meadow
          if (sec.lv[b]) col = LIGHT[col];
          if ((v & 8) && tcs === 26 && sv === null) col = K.deep;
        }   // NAMED EMPTY SLOT map-tex-deep-26 (the deep-sea tile, art desk to paint after a palette add): one flat fill of the darkest palette blue
      }
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
  if (softEdge) {
    const set = cs === 26 ? fe.map.runs : fe.peek.runs, px0 = X0 * cs, py0 = Y0 * cs;   // the map's own cell (26 px) has the map's runs; the reach view's larger cells, the look-around's
    for (const it of fogEdges({ dark: (i, j) => !seen[j * MW + i], I0: 0, I1: MW - 1, J0: 0, J1: MH - 1, csx: cs, csy: cs, runs: set, outer: fe.map.outer, inner: fe.map.inner })) {
      for (let yy = 0; yy < it.ch; yy++) { const y = it.y + yy - py0; if (y < 0 || y >= NH) continue;
        for (let xx = 0; xx < it.cw; xx++) { const x = it.x + xx - px0, v = it.m[yy * it.w + xx]; if (v && x >= 0 && x < N) put(y * N + x, v === 1 ? K.ink : K.night); } }
    }
  }
  return u;
}
