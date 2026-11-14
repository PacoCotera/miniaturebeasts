// Generator 7, made off the page's thread (src/realm-store.mjs starts this as a module worker). It is plain data in, plain data out (typed arrays, sets, numbers), so everything crosses as it is.
//   { seed }                       the realm and the Hollow Tree sites (the two things the first cell would otherwise make on the page);
//   { seed, slot }                 that region's overview (the one byte a tile the maps are drawn from), which takes the cells of the whole region about fifteen seconds;
//   { op: 'init', ctx }            the places kit (tile set, terrain table, layer descriptors) the cells are baked with: kept for the worker's life;
//   { op: 'seed', seed, realm, sites }  the realm this worker bakes cells of (the page has it already);
//   { op: 'bake', seed, slot, v, cells }  each cell's IR and baked place (world7.mjs bakedCell), one reply a cell, in the order asked;
//   { op: 'ground', id }           a baked place's ground, rendered: its 48 px frames (one a clock step) and the whole-place picture's (places/src/ground.mjs), the pixel work the page would do a frame at a time.
//   { op: 'land', id, inp }        the painted land of the maps (src/landpaint.mjs paintLand): the pixels of one painting.
// This file imports the generator and nothing of the page.
import { paintLand } from './landpaint.mjs';
import { realm7, setRealm7 } from './gen7/region.mjs';
import { decorOf, overviewOf, presetHollowSites } from './gen7/place.mjs';
import { bakedCell } from './world7.mjs';
import { renderGround, PlaceGroundCache, wholeScale } from '../../places/src/ground.mjs';

let CTX = null, SEEDED = null;
const KEEP = new Map();   // the baked places made here (by id), the newest few: a ground is asked for after its cell
const KEEP_MAX = 24;

self.onmessage = e => {
  const m = e.data || {}, seed = m.seed, slot = m.slot;
  try {
    if (m.op === 'init') { CTX = m.ctx; return; }
    if (m.op === 'seed') { if (SEEDED !== seed) { setRealm7(seed, m.realm); presetHollowSites(seed, m.sites); SEEDED = seed; } return; }
    if (m.op === 'bake') {
      for (const cell of m.cells) {
        try {
          const b = bakedCell(CTX, seed, slot, cell, m.v);
          KEEP.delete(b.place.id); KEEP.set(b.place.id, b.place); while (KEEP.size > KEEP_MAX) KEEP.delete(KEEP.keys().next().value);
          self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, ir: b.ir, place: b.place });
        } catch (err) { self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, error: String((err && err.message) || err) }); }
      }
      return;
    }
    if (m.op === 'land') { const u = paintLand(m.inp); self.postMessage({ op: 'land', id: m.id, u }, [u.buffer]); return; }
    if (m.op === 'ground') {
      const place = KEEP.get(m.id) || m.place;
      if (!place) { self.postMessage({ op: 'ground', id: m.id, error: 'no such place' }); return; }
      const pc = new PlaceGroundCache(CTX.ts, place, 48), frames = [], seen = new Set();
      for (const clock of pc.frameClocks()) { const k = pc.frameKey(clock); if (seen.has(k)) continue; seen.add(k); frames.push([clock, renderGround(CTX.ts, place, 48, { x: 0, y: 0, w: place.w * 48, h: place.h * 48 }, clock, false)]); }
      const s = wholeScale(place), half = renderGround(CTX.ts, place, s, { x: 0, y: 0, w: place.w * s, h: place.h * s }, 0, false);
      self.postMessage({ op: 'ground', id: m.id, frames, half, size: s }, [...frames.map(f => f[1].buffer), half.buffer]);
      return;
    }
    if (slot) { const bytes = overviewOf(seed, slot[0], slot[1]); self.postMessage({ seed, slot, overview: bytes }, [bytes.buffer]); return; }
    const realm = realm7(seed); self.postMessage({ seed, realm, sites: decorOf(seed).hollowSites() });
  } catch (err) { self.postMessage({ seed, error: String((err && err.message) || err) }); }
};
