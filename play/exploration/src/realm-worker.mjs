// Generator 7, made off the page's thread (src/realm-store.mjs starts this as a module worker). It is plain data in, plain data out (typed arrays, sets, numbers), so everything crosses as it is.
//   { seed }                       the realm (the Hollow Tree sites are made per region, later);
//   { op: 'sites', seed, slots }   the Hollow Tree sites of these regions [[ax, ay], ...], answered { op: 'sites', sites } with the ones not yet sent;
//   { op: 'sector', seed, slot, realm, cells? }  that region's sector (4 x 4 blocks of ground and level a place, and the realm's lines: world7.mjs sectorOfRegion), made from the realm alone, so no place is built; with cells, only those cells (the places in view), answered at once;
//   { op: 'init', ctx }            the places kit (tile set, terrain table, layer descriptors) the cells are baked with: kept for the worker's life;
//   { op: 'seed', seed, realm, sites }  the realm this worker bakes cells of (the page has it already);
//   { op: 'bake', seed, slot, v, cells }  each cell's IR and baked place (world7.mjs bakedCell), one reply a cell, in the order asked;
//   { op: 'ground', id }           a baked place's ground, rendered: its 48 px frames (one a clock step) and the whole-place picture's (places/src/ground.mjs), the pixel work the page would do a frame at a time.
//   { op: 'land', id, inp }        the painted land of the maps (src/landpaint.mjs paintLand): the pixels of one painting.
// This file imports the generator and nothing of the page.
import { paintLand } from './landpaint.mjs';
import { realm7, setRealm7 } from './gen7/region.mjs';
import { decorOf, presetHollowSites, banksOfRegion, madeBanks, presetBanks } from './gen7/place.mjs';
import { bakedCell, sectorOfRegion } from './world7.mjs';
import { renderGround, PlaceGroundCache, wholeScale } from '../../places/src/ground.mjs';

let CTX = null, SEEDED = null;
const SENT = new Set();   // 'seed|ax,ay' of the Hollow Tree sites the page has (given by it or sent to it)
// the sites this worker has made that the page does not yet have: [{ slot, x, y }] or [{ slot, none: true }]
const newSites = seed => { const out = []; for (const s of decorOf(seed).madeSites()) { const k = seed + '|' + s.slot[0] + ',' + s.slot[1]; if (!SENT.has(k)) { SENT.add(k); out.push(s); } } return out; };
const SENT_B = new Set();   // 'seed|ra,rb' of the bank lists the page has (given by it or sent to it)
const newBanks = seed => { const out = []; for (const r of madeBanks(seed)) { const k = seed + '|' + r.ra + ',' + r.rb; if (!SENT_B.has(k)) { SENT_B.add(k); out.push(r); } } return out; };
const KEEP = new Map();   // the baked places made here (by id), the newest few: a ground is asked for after its cell
const KEEP_MAX = 24;

const QUEUE = []; let pumping = false;
function enqueue(seed, items0, first) {
  const items = items0.map(i => ({ ...i, seed }));
  if (first) { const keys = new Set(items.map(i => i.key).filter(Boolean)); for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].key && keys.has(QUEUE[i].key)) QUEUE.splice(i, 1); QUEUE.unshift(...items); } else QUEUE.push(...items);
  if (!pumping) pump();
}
async function pump() {
  pumping = true;
  while (QUEUE.length) {
    const it = QUEUE.shift();
    try { it.run(); } catch (err) { self.postMessage({ error: String((err && err.message) || err) }); }
    await new Promise(res => setTimeout(res, 0));   // a turn between jobs: the messages that came meanwhile are read before the next one
  }
  pumping = false;
}

self.onmessage = e => {
  const m = e.data || {}, seed = m.seed, slot = m.slot;
  try {
    if (m.op === 'init') { CTX = m.ctx; return; }
    if (m.op === 'seed') { if (SEEDED !== seed) { for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].seed !== seed) QUEUE.splice(i, 1);   /* jobs of the old seed are not made over the new realm */ setRealm7(seed, m.realm); presetHollowSites(seed, m.sites); for (const s of m.sites || []) SENT.add(seed + '|' + s.slot[0] + ',' + s.slot[1]); if (m.banks && m.banks.length) presetBanks(seed, m.banks); for (const r of m.banks || []) SENT_B.add(seed + '|' + r.ra + ',' + r.rb); SEEDED = seed; } return; }
    // The slow work (warm, banks, sites, bake) is a queue, one cell or slice a turn, so a message that arrives meanwhile is read at once: a bake with first: true (the set-out's reach, which the player waits for) goes
    // ahead of everything queued, and the same cell asked earlier in the background list is not made twice. The rest keeps its order (the nearest cells are never held behind a slice).
    if (m.op === 'warm') { enqueue(seed, [{ run: () => { decorOf(seed); } }]); return; }   // the seed's decor, built ahead (the first place of a seed waited on it)
    if (m.op === 'banks') {   // a background slice: the Rupar's earth banks of these regions [[ra, rb], ...], made and sent (the lists not yet sent)
      enqueue(seed, [{ run: () => { for (const [ra, rb] of m.slots) banksOfRegion(seed, ra, rb); self.postMessage({ op: 'banks', seed, banks: newBanks(seed) }); } }]); return;
    }
    if (m.op === 'sites') {   // a background slice: the sites of these regions [[ax, ay], ...], made and sent
      enqueue(seed, [{ run: () => { const D = decorOf(seed); for (const [ax, ay] of m.slots) D.hollowSiteOf(ax, ay); self.postMessage({ op: 'sites', seed, sites: newSites(seed) }); } }]); return;
    }
    if (m.op === 'bake') {
      enqueue(seed, m.cells.map(cell => ({ key: seed + '|' + slot + '|' + m.v + '|' + cell, run: () => {
        try {
          const b = bakedCell(CTX, seed, slot, cell, m.v);
          KEEP.delete(b.place.id); KEEP.set(b.place.id, b.place); while (KEEP.size > KEEP_MAX) KEEP.delete(KEEP.keys().next().value);
          self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, ir: b.ir, place: b.place, sites: newSites(seed), banks: newBanks(seed) });
        } catch (err) { self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, error: String((err && err.message) || err) }); }
      } })), !!m.first);
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
    if (m.op === 'sector') { if (SEEDED !== seed) { setRealm7(seed, m.realm); SEEDED = seed; } const sector = sectorOfRegion(seed, slot, m.cells || undefined); self.postMessage({ seed, slot, sector, part: !!m.cells }, [sector.cls.buffer, sector.lv.buffer, ...(sector.have ? [sector.have.buffer] : [])]); return; }
    const realm = realm7(seed, (step, of) => self.postMessage({ seed, step, of }));   // each real stage, for the first-load wait's pips (src/waitpips.mjs); the last, the Hollow Tree sites, comes with the realm itself
    self.postMessage({ seed, realm, sites: [] });   // the sites are made per region, when a place asks or a background slice (op 'sites') comes: not with the realm
  } catch (err) { self.postMessage({ seed, error: String((err && err.message) || err) }); }
};
