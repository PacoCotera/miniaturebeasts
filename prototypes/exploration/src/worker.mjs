// Generator 7, made off the page's thread (src/store/realm-store.mjs and src/store/place-store.mjs start this as a module worker). It is plain data in, plain data out (typed arrays, sets, numbers), so everything crosses as it is.
//   { seed }                       the realm (the Hollow Tree sites are made per region, as its places ask);
//   { op: 'sector', seed, slot, realm, cells? }  that region's sector (4 x 4 blocks of ground and level a place, and the realm's lines: world7.mjs sectorOfRegion), made from the realm alone, so no place is built; with cells, only those cells (the places in view), answered at once;
//   { op: 'init', ctx }            the places kit (tile set, terrain table, layer descriptors) the cells are baked with: kept for the worker's life;
//   { op: 'seed', seed, realm, sites, banks }  the realm this worker bakes cells of, and the sites and bank lists the page has made (the page has them already);
//   { op: 'warm', seed }           the seed's decor, built ahead of its first place;
//   { op: 'banks', seed, slots }   the Rupar's earth banks of these regions [[ra, rb], ...], answered { op: 'banks', banks } with the lists not yet sent;
//   { op: 'bake', seed, slot, v, cells, first }  each cell's IR and baked place (world7.mjs bakedCell), one reply a cell, in the order asked;
//   { op: 'ground', id, place }    a baked place's ground, rendered: its 48 px frames (one a clock step) and the whole-place picture's (places/src/ground.mjs), the pixel work the page would do a frame at a time;
//   { op: 'land', id, inp }        the painted land of the maps (src/render/landpaint.mjs paintLand): the pixels of one painting.
// A ground or a land that fails is answered { op, id, error }, so the page stops waiting for it and makes it itself.
import { paintLand } from './render/landpaint.mjs';
import { realm7, setRealm7 } from './gen7/region.mjs';
import { decorOf, presetHollowSites, banksOfRegion, madeBanks, presetBanks } from './gen7/place.mjs';
import { bakedCell, sectorOfRegion } from './world7.mjs';
import { BAKE_STAGES, WINDOW_STAGES } from './logic/waitpips.mjs';
import { renderGround, PlaceGroundCache, wholeScale } from '../../places/src/ground.mjs';

let CTX = null, SEEDED = null;
const why = err => String((err && err.message) || err);
// What the page has of this worker's makings (given by it or sent to it): a region's Hollow Tree site [{ slot, x, y }] or [{ slot, none: true }], and a region's bank list.
const SENT = new Set(), siteKey = (seed, s) => 's|' + seed + '|' + s.slot[0] + ',' + s.slot[1], bankKey = (seed, r) => 'b|' + seed + '|' + r.ra + ',' + r.rb;
const unsent = (seed, list, keyOf) => list.filter(x => { const k = keyOf(seed, x); if (SENT.has(k)) return false; SENT.add(k); return true; });
const newSites = seed => unsent(seed, decorOf(seed).madeSites(), siteKey), newBanks = seed => unsent(seed, madeBanks(seed), bankKey);

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
    try { it.run(); } catch (err) { self.postMessage({ error: why(err) }); }
    await new Promise(res => setTimeout(res, 0));   // a turn between jobs: the messages that came meanwhile are read before the next one
  }
  pumping = false;
}

self.onmessage = e => {
  const m = e.data || {}, seed = m.seed, slot = m.slot;
  try {
    if (m.op === 'init') { CTX = m.ctx; return; }
    if (m.op === 'seed') {
      if (SEEDED === seed) return;
      for (let i = QUEUE.length - 1; i >= 0; i--) if (QUEUE[i].seed !== seed) QUEUE.splice(i, 1);   // jobs of the old seed are not made over the new realm
      setRealm7(seed, m.realm); presetHollowSites(seed, m.sites); if (m.banks.length) presetBanks(seed, m.banks);
      for (const s of m.sites) SENT.add(siteKey(seed, s));
      for (const r of m.banks) SENT.add(bankKey(seed, r));
      SEEDED = seed; return;
    }
    // The slow work (warm, banks, bake) is a queue, one cell or slice a turn, so a message that arrives meanwhile is read at once: a bake with first: true (the set-out's reach, which the player waits for) goes
    // ahead of everything queued, and the same cell asked earlier in the background list is not made twice. The rest keeps its order (the nearest cells are never held behind a slice).
    if (m.op === 'warm') { enqueue(seed, [{ run: () => { decorOf(seed); } }]); return; }
    if (m.op === 'banks') {
      enqueue(seed, [{ run: () => { for (const [ra, rb] of m.slots) banksOfRegion(seed, ra, rb); self.postMessage({ op: 'banks', seed, banks: newBanks(seed) }); } }]); return;
    }
    if (m.op === 'bake') {
      enqueue(seed, m.cells.map(cell => ({ key: seed + '|' + slot + '|' + m.v + '|' + cell, run: () => {
        // each real stage but the last (the baked reply is that) is told to the page, for the wait's pips: the terrain window's own labelled stages (place.mjs F6_STAGE, a window already made tells none), then the IR
        let win = 0; const tell = n => self.postMessage({ op: 'stage', seed, slot, v: m.v, cell, n }), was = globalThis.F6_STAGE;
        globalThis.F6_STAGE = label => { if (label !== 'start' && win < WINDOW_STAGES) tell(++win); };
        try {
          const b = bakedCell(CTX, seed, slot, cell, m.v, n => { if (n < BAKE_STAGES) tell(n); });
          self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, ir: b.ir, place: b.place, sites: newSites(seed), banks: newBanks(seed) });
        } catch (err) { self.postMessage({ op: 'baked', seed, slot, v: m.v, cell, error: why(err) }); }
        finally { globalThis.F6_STAGE = was; }
      } })), !!m.first);
      return;
    }
    if (m.op === 'land') { const u = paintLand(m.inp); self.postMessage({ op: 'land', id: m.id, u }, [u.buffer]); return; }
    if (m.op === 'ground') {
      const place = m.place, pc = new PlaceGroundCache(CTX.ts, place, 48), frames = [], seen = new Set();
      for (const clock of pc.frameClocks()) { const k = pc.frameKey(clock); if (seen.has(k)) continue; seen.add(k); frames.push([clock, renderGround(CTX.ts, place, 48, { x: 0, y: 0, w: place.w * 48, h: place.h * 48 }, clock, false)]); }
      const s = wholeScale(place), half = renderGround(CTX.ts, place, s, { x: 0, y: 0, w: place.w * s, h: place.h * s }, 0, false);
      self.postMessage({ op: 'ground', id: m.id, frames, half, size: s }, [...frames.map(f => f[1].buffer), half.buffer]);
      return;
    }
    if (m.op === 'sector') { if (SEEDED !== seed) { setRealm7(seed, m.realm); SEEDED = seed; } const sector = sectorOfRegion(seed, slot, m.cells || undefined); self.postMessage({ seed, slot, sector, part: !!m.cells }, [sector.cls.buffer, sector.lv.buffer, ...(sector.have ? [sector.have.buffer] : [])]); return; }
    self.postMessage({ seed, realm: realm7(seed, (step, of) => self.postMessage({ seed, step, of })) });   // each real stage, for the first-load wait's pips (src/logic/waitpips.mjs)
  } catch (err) { self.postMessage({ op: m.op, id: m.id, seed, error: why(err) }); }
};
