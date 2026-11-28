// A wide-water cell's ground (render-window-1a; owner 2026-11-27 "separation of concerns. logic, ui, interaction, rendering, sound, etc", #178 "very long straight shores", #141).
// A land place lays its coast from shoreValue (src/shore7.mjs), the one coast line, through the generator's passes (cellTerrain). A sea cell is laid from the same terrain, so the coast is the
// same tiles on both sides of a border: sand strip (2 or 3) then meadow on the land side of the line, shallows along it. The one thing added is the deep sea: the shallows are SHORE_SHALLOW tiles
// wide along the line (the same width the map paints, landpaint.mjs) and the water beyond is deep. Deep is by distance from the line (a tile with no land within SHORE_SHALLOW tiles of it), not by
// shoreValue's own number, which stops holding the sea back SHORE_A + 1 tiles from a seam and would cut the deep along a straight line there: deep water follows the line and never fills a cell.
// The terrain values are the signed ones (TV); the bake lays the signed layers for them (fill-sand + over-sand-beach, fill-water + over-water, fill-deep), the same layers and order as a land place's
// shore. No piece is drawn here. Pure: a function of the seed's realm and the cell.
import { contextOf, cellTerrain, TV } from './place.mjs';
import { shoreValue, SHORE_SHALLOW } from '../shore7.mjs';

// is the cell a wide-water cell (a map cell of water that is no ford)?
export const isSeaCell = (seed, X, Y) => contextOf(seed).wideAt(X, Y);

// the cell's terrain with its one-tile apron (the shape cellTerrain gives a land cell): { x0, y0, w, h, terrain }
export function seaTerrain(seed, X, Y) {
  const S = contextOf(seed), c = cellTerrain(seed, X, Y), { w, h, x0, y0 } = c, t = c.terrain, terrain = new Uint8Array(t), R = SHORE_SHALLOW, ew = w + 2 * R, eh = h + 2 * R;
  // where the coast line says land (or a ford's shallows) over the window and R tiles round it: a function of the world tile alone, so both sides of every border see the same
  const dry = new Uint8Array(ew * eh);
  for (let y = 0; y < eh; y++) for (let x = 0; x < ew; x++) { const v = shoreValue(seed, S.shoreCells, x0 - R + x, y0 - R + y); dry[y * ew + x] = v === null || v <= 0 ? 1 : 0; }
  // every tile a neighbouring land cell's window covers takes that land cell's own terrain value, exactly (land cells do not change), so a tile is the same value from both sides of a border
  const given = new Uint8Array(w * h);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if ((di || dj) && !isSeaCell(seed, X + di, Y + dj)) {
      const l = cellTerrain(seed, X + di, Y + dj);
      for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
        const sx = l.x0 + x - x0, sy = l.y0 + y - y0; if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        terrain[sy * w + sx] = l.terrain[y * l.w + x]; given[sy * w + sx] = 1;
      }
    }
  }
  const wet = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return true; const v = terrain[y * w + x]; return v === TV.WATER || v === TV.DEEP; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (given[y * w + x] || terrain[y * w + x] !== TV.WATER) continue;
    let deep = true;
    for (let j = -R; j <= R && deep; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= R * R && dry[(y + R + j) * ew + x + R + i]) { deep = false; break; }   // land within R tiles keeps it shallow
    for (let j = -1; j <= 1 && deep; j++) for (let i = -1; i <= 1; i++) if (!wet(x + i, y + j)) { deep = false; break; }   // and so does land beside it in the generator's own terrain (deep meets water only)
    if (deep) terrain[y * w + x] = TV.DEEP;
  }
  return { x0, y0, w, h, terrain };
}

// the IR the bake takes (bake7.mjs bakeCell): ground only, no props, decor, finds, openings or spawns: the sea holds nothing
export function seaIR(seed, X, Y) {
  const c = seaTerrain(seed, X, Y);
  return { origin: { x: c.x0, y: c.y0 }, seed, id: `g7-${X}-${Y}`, w: c.w, h: c.h, type: 'meadow', names: [], tileset: 'ninja-test', mirror: false, mood: '', terrain: c.terrain, props: [], decals: [], canopy: [], hearts: [], clues: [],
    finds: [], landmarks: [], openings: [], spawns: [], wayups: [], reedbanks: [], tone: new Uint8Array(c.w * c.h), inner: null, ground: null, signs: [], traces: [], strikes: [], pieces: [], shelter: [], stamps: [], soft: null, falls: [] };
}
