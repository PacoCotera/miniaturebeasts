// Generator 7: the background scheduler (realm-time-spec-1 section 4, T3). The whole cell realm and the start place block play; everything after that, the places' tiles and the sectors, is cut into SLICES:
// one slice is one pure call, a place's cell terrain (cellTerrain) or a place's sector (sectorOf), and nothing yields inside it. Between slices the scheduler looks at a pause flag and at the front list
// (the place the player is walking into, a reach just shown): a front request is always served before the next background slice. Pure: no clock, DOM, storage or Math.random; the clock is the caller's `now`.
// A slice is a function of the realm and its cell alone (the seam rule: a place reads its 5 x 7 window of the realm's cells), so the same places made in any order, or with pauses, are the same tiles.
//   const s = createScheduler(seed, [X, Y], { now, keep })     the start place [X, Y] (a world cell) and its plan
//   s.step()           runs one slice (front first, else the next of the plan); returns { kind, X, Y, ms, digest, front } or null when nothing is left or the scheduler is paused
//   s.pause() / s.resume() / s.paused
//   s.front(kind, X, Y)  puts a slice at the head of the line (a front request); a slice already made is not made again
//   s.run(budgetMs)    steps until the budget is spent (checked between slices), the plan is done or a pause; returns the slices made
//   s.digests          Map of 'p:X,Y' / 's:X,Y' to the slice's digest; s.log every slice made, in order, with its ms
import { cellTerrain, sectorOf, decorOf, banksOfRegion, CW, CH, RW, RH } from './place.mjs';
import { ATLAS } from '../regions.mjs';

const H0 = 2166136261;
const fnvBytes = (h, a) => { const b = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); for (let i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 16777619); } return h >>> 0; };
const fnvText = (h, s) => { for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) & 255; h = Math.imul(h, 16777619); } return h >>> 0; };
// the tile digest of a place: its terrain and top layers (the cell and one tile of apron), its ways up and falls
export function placeDigest(c) { let h = fnvBytes(H0, c.terrain); h = fnvBytes(h, c.top); return fnvText(h, JSON.stringify([c.x0, c.y0, c.w, c.h, c.wayups, c.falls])); }
// the digest of a sector: its blocks and lines
export function sectorDigest(s) { let h = fnvBytes(H0, s.cls); h = fnvBytes(h, s.lv); return fnvText(h, JSON.stringify([s.lines, s.marks, s.dest, s.ramps])); }

const SLICE = {
  p: { make: (seed, X, Y) => cellTerrain(seed, X, Y), digest: placeDigest },
  s: { make: (seed, X, Y) => sectorOf(seed, X, Y), digest: sectorDigest },
  h: { make: (seed, ax, ay) => decorOf(seed).hollowSiteOf(ax, ay), digest: site => fnvText(H0, JSON.stringify(site)) },   // a Hollow Tree site: X, Y are the region's slot (ax, ay)
  b: { make: (seed, ax, ay) => banksOfRegion(seed, ax, ay), digest: banks => fnvText(H0, JSON.stringify(banks)) }   // a region's Rupar earth banks (rupar-banks-slice-2): X, Y are the region's slot (ax, ay)
};
const key = (k, X, Y) => k + ':' + X + ',' + Y;
const kindCode = kind => (kind === 'place' ? 'p' : kind === 'sector' ? 's' : kind === 'site' ? 'h' : kind === 'banks' ? 'b' : null);
const kindName = c => (c === 'p' ? 'place' : c === 's' ? 'sector' : c === 'b' ? 'banks' : 'site');

// The plan, as a lazy list: the start place's 8 neighbours, the start region's sectors (the reach view), then the places outward by walking distance, then the other regions' sectors (by distance too).
// Distance is the walk's: the king's step count, ties by the plain step count and the cell number, so the order is one fixed order.
export function* plan(start, MWx, MHy, siteSlots = []) {
  const [sx, sy] = start, dist = (X, Y) => Math.max(Math.abs(X - sx), Math.abs(Y - sy)) * 100000 + (Math.abs(X - sx) + Math.abs(Y - sy)) * 1000 + Y * 40 + X;
  const cells = []; for (let Y = 0; Y < RH; Y++) for (let X = 0; X < RW; X++) cells.push([X, Y]);
  cells.sort((a, b) => dist(a[0], a[1]) - dist(b[0], b[1]));
  const ax0 = Math.floor(sx / MWx) * MWx, ay0 = Math.floor(sy / MHy) * MHy, inStart = (X, Y) => X >= ax0 && X < ax0 + MWx && Y >= ay0 && Y < ay0 + MHy;
  for (const [X, Y] of cells) if ((X !== sx || Y !== sy) && Math.max(Math.abs(X - sx), Math.abs(Y - sy)) === 1) yield ['p', X, Y];
  for (const [X, Y] of cells) if (inStart(X, Y)) yield ['s', X, Y];
  // one banks slice for each region (the Rupar's earth banks: a place reads the lists of the regions its window touches), the start region first, then by the regions' distance from it
  const sa = Math.floor(sx / MWx), sb = Math.floor(sy / MHy), byDist = (a, b) => Math.max(Math.abs(a[0] - sa), Math.abs(a[1] - sb)) - Math.max(Math.abs(b[0] - sa), Math.abs(b[1] - sb)) || Math.abs(a[0] - sa) + Math.abs(a[1] - sb) - Math.abs(b[0] - sa) - Math.abs(b[1] - sb) || a[1] - b[1] || a[0] - b[0];
  const regs = []; for (let ay = 0; ay < ATLAS; ay++) for (let ax = 0; ax < ATLAS; ax++) regs.push([ax, ay]);
  for (const [ax, ay] of regs.sort(byDist)) yield ['b', ax, ay];
  // one site slice for each Woods or Tallwood region, the start region first, then by the regions' distance from it (a place reads only the sites of the regions it touches, so these are made before the player gets there)
  for (const [ax, ay] of siteSlots.slice().sort(byDist)) yield ['h', ax, ay];
  for (const [X, Y] of cells) if (Math.max(Math.abs(X - sx), Math.abs(Y - sy)) > 1) yield ['p', X, Y];
  for (const [X, Y] of cells) if (!inStart(X, Y)) yield ['s', X, Y];
}

export function createScheduler(seed, start, { now = () => 0, keep = false, MW: MWx = 16, MH: MHy = 20 } = {}) {
  const digests = new Map(), log = [], products = keep ? new Map() : null, fronts = [], it = plan(start, MWx, MHy, decorOf(seed).hollowSlots());
  let paused = false, total = 0;
  const made = k => digests.has(k);
  function nextPlanned() { for (;;) { const n = it.next(); if (n.done) return null; if (!made(key(n.value[0], n.value[1], n.value[2]))) return n.value; } }
  const self = {
    digests, log, products,
    get paused() { return paused; },
    pause() { paused = true; }, resume() { paused = false; },
    front(kind, X, Y) { const c = kindCode(kind); if (!c) throw new Error('slice kind ' + kind); if (!made(key(c, X, Y))) fronts.push([c, X, Y]); },
    has: (kind, X, Y) => made(key(kindCode(kind), X, Y)),
    get pending() { return fronts.length; },
    step() {
      if (paused) return null;
      let n = null, front = false;
      while (fronts.length) { const f = fronts.shift(); if (!made(key(f[0], f[1], f[2]))) { n = f; front = true; break; } }
      if (!n) n = nextPlanned();
      if (!n) return null;
      const [c, X, Y] = n, t0 = now(), prod = SLICE[c].make(seed, X, Y), ms = now() - t0, digest = SLICE[c].digest(prod);
      digests.set(key(c, X, Y), digest); if (products) products.set(key(c, X, Y), prod);
      const rec = { kind: kindName(c), X, Y, ms, digest, front }; log.push(rec); total++;
      return rec;
    },
    run(budgetMs) { const t0 = now(), out = []; for (;;) { if (paused || now() - t0 >= budgetMs) break; const r = self.step(); if (!r) break; out.push(r); } return out; },
    get made() { return total; }
  };
  return self;
}
export { CW, CH };
