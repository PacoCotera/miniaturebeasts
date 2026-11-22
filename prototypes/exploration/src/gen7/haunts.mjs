// Haunts and routines of the wild Loika (walk-design-1 W2; canon: editorial's loika-routines.md, taken as given). Pure: everything here is a function of the realm seed, a place's
// layout (as a plain view) and the ids given; nothing is stored and nothing is drawn. The land freeze holds: this is an overlay read after a place is mounted, it never touches the land's own lists.
//
//   a view of a place (what the page builds from its layout): { w, h, props: [{ fam, kind, x, y }] (tiles of the layout), reeds: [{ x, y, w, h }], water(x, y), land(x, y) }
//   a site: { k: 'reed' | 'shore' | 'sweep' | 'grove' | 'outcrop', x, y, hollow? }   the tile the thing stands on (the Loika stands beside it)
//   a Loika's doings: { wary (0..1: from Attitude), drive (cycle rate, .6 steady .. 1.4 bursts), late (0..1: from the Stamina chapter's efficiency, low is late) }
import { hash, rnd } from '../world.mjs';

export const HAUNT_KINDS = ['reed', 'shore', 'sweep', 'grove', 'outcrop'];
export const HOLLOW_KIND = 'tree-hollow';

// The wild Loika's open doings pools, as its frame states them (species/frames/language/species-S01.json: appearance.attitude, movement.cycle-rate, energy.action-efficiency). A test holds this to the frame.
export const LOIKA_POOL = Object.freeze({
  attitude: Object.freeze({ content: .3675, curious: .6325 }),   // a curious pair is bold, a content pair wary (its weights, as the frame draws them)
  drive: Object.freeze({ low: .6, high: 1.4 }),                  // movement.cycle-rate: "steady, bursts"
  efficiency: Object.freeze({ low: .6, high: 1 }),               // energy.action-efficiency: the Stamina chapter
});

// ---------- the sites a place offers ----------
const gridOf = (view, items, minCount = 1) => {   // a coarse bin of items by 4x4 tiles, for clusters
  const g = new Map(); for (const it of items) { const k = (it.x >> 2) + ',' + (it.y >> 2); (g.get(k) || g.set(k, []).get(k)).push(it); } return [...g.values()].filter(l => l.length >= minCount);
};
// The sites of one place, in a fixed order (kind, then position). Reed banks and tall-grass sweeps and rocks are the land's own lists; a grove is trees standing together (the Hollow Tree among them); a shore is a land tile
// beside water with no reeds near it.
export function sitesOf(view) {
  const out = [], { w, h } = view;
  const inside = (x, y) => x >= 1 && y >= 1 && x < w - 1 && y < h - 1;
  for (const r of view.reeds || []) { const x = Math.floor(r.x + r.w / 2), y = Math.floor(r.y + r.h / 2); if (inside(x, y)) out.push({ k: 'reed', x, y }); }
  for (const l of gridOf(view, view.props.filter(p => p.fam === 'reeds' && inside(p.x, p.y)))) { const p = l[0]; if (!out.some(s => s.k === 'reed' && Math.abs(s.x - p.x) <= 3 && Math.abs(s.y - p.y) <= 3)) out.push({ k: 'reed', x: p.x, y: p.y }); }
  const sweeps = view.props.filter(p => p.fam === 'sweeps' && inside(p.x, p.y));
  for (const l of gridOf(view, sweeps)) { const p = l[0]; out.push({ k: 'sweep', x: p.x, y: p.y }); }
  const trees = view.props.filter(p => p.fam === 'trees' && inside(p.x, p.y)), hollows = trees.filter(p => p.kind === HOLLOW_KIND);
  for (const l of gridOf(view, trees, 2)) { const hol = l.find(p => p.kind === HOLLOW_KIND), p = hol || l[0]; out.push({ k: 'grove', x: p.x, y: p.y, ...(hol ? { hollow: true } : {}) }); }
  for (const p of hollows) if (!out.some(s => s.k === 'grove' && s.x === p.x && s.y === p.y)) out.push({ k: 'grove', x: p.x, y: p.y, hollow: true });
  const rocks = view.props.filter(p => p.fam === 'rocks' && inside(p.x, p.y));
  for (const l of gridOf(view, rocks)) { const p = l[0]; out.push({ k: 'outcrop', x: p.x, y: p.y }); }
  // shores: every fifth land tile that touches water with no reed bank within 3 tiles of it
  const nearReed = (x, y) => (view.reeds || []).some(r => x >= r.x - 3 && x <= r.x + r.w + 3 && y >= r.y - 3 && y <= r.y + r.h + 3);
  let n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (!view.land(x, y) || view.water(x, y)) continue;
    if (!(view.water(x + 1, y) || view.water(x - 1, y) || view.water(x, y + 1) || view.water(x, y - 1))) continue;
    if (nearReed(x, y) || (n++ % 5)) continue;
    out.push({ k: 'shore', x, y });
  }
  return out.map((s, i) => ({ ...s, i }));
}

// ---------- the front and the side spot (E8): where the pawn can stand to watch a site, 3 to 5 tiles off ----------
// stand(x, y): the tile can be stood on and is reached from the place's ways in. Front: below the site (the pawn faces up to it) within a tile either side; side: level with it, to its left or right.
export function spotsFor(site, stand) {
  const find = (cands) => cands.find(([x, y]) => stand(x, y)) || null;
  const front = [], side = [];
  for (let d = 3; d <= 5; d++) for (const dx of [0, -1, 1]) { front.push([site.x + dx, site.y + d]); }
  for (let d = 3; d <= 5; d++) for (const dy of [0, -1, 1]) { side.push([site.x - d, site.y + dy]); side.push([site.x + d, site.y + dy]); }
  return { front: find(front), side: find(side) };
}

// ---------- an individual ----------
// Its doings, drawn from the species' pools by its own genome seed (the seed and the id): two copies of each of the three open doings.
export function doingsOf(seed, id) {
  const copy = (loc, p) => rnd(seed, 'loika', id, loc, p);
  const A = LOIKA_POOL.attitude, curious = [0, 1].filter(p => copy('attitude', p) < A.curious / (A.curious + A.content)).length;   // 0, 1 or 2 curious copies
  const mean = (loc, pool) => [0, 1].map(p => copy(loc, p) < .5 ? pool.low : pool.high).reduce((a, b) => a + b) / 2;
  const drive = mean('drive', LOIKA_POOL.drive), eff = mean('efficiency', LOIKA_POOL.efficiency);
  const r2 = v => Math.round(v * 100) / 100;
  return { wary: 1 - curious / 2, drive: r2(drive), late: r2(1 - (eff - LOIKA_POOL.efficiency.low) / (LOIKA_POOL.efficiency.high - LOIKA_POOL.efficiency.low)) };
}
export const isLate = d => d.late >= .5;
export const isRestless = d => d.drive >= 1;
export const isWary = d => d.wary >= .5;

const byKind = (sites, ...ks) => sites.filter(s => ks.includes(s.k));
const pick = (list, seed, id, tag) => list.length ? list[Math.floor(rnd(seed, 'pick', id, tag) * list.length)] : null;
const farthest = (list, from, restless, seed, id, tag) => {   // a restless one takes the far ones, a homebody the near ones
  if (!list.length) return null; const d = s => Math.hypot(s.x - from.x, s.y - from.y);
  const sorted = list.slice().sort((a, b) => (restless ? d(b) - d(a) : d(a) - d(b)) || a.i - b.i), top = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  return pick(top, seed, id, tag);
};

// Three haunts and a bed, on day 0: the water (a reed bank, or a shore), the grass (a tall-grass sweep), and a third: the lookout (an outcrop) for a wary one that has one, else the shade (a grove).
// The bed is a grove or a sweep, a hollow before any other, never the third haunt. A land short of a kind takes the nearest it has, so a Loika always has three.
export function haunts0(seed, id, sites, doings) {
  const water = byKind(sites, 'reed', 'shore'), reeds = byKind(sites, 'reed');
  const w = pick(reeds.length ? reeds : water, seed, id, 'water') || pick(sites, seed, id, 'water');
  if (!w) return null;
  const near = (list, tag, not) => farthest(list.filter(s => !not.includes(s)), w, isRestless(doings), seed, id, tag);
  const pool = (kinds, not) => { const l = byKind(sites, ...kinds).filter(s => !not.includes(s)); return l.length ? l : sites.filter(s => !not.includes(s)); };
  const g = near(pool(['sweep'], [w]), 'grass', [w]) || w;
  const third = (isWary(doings) && byKind(sites, 'outcrop').length ? near(pool(['outcrop'], [w, g]), 'third', [w, g]) : near(pool(['grove'], [w, g]), 'third', [w, g])) || g;
  const strict = byKind(sites, 'grove', 'sweep').filter(s => s !== third && s !== w && s !== g), bedPool = strict.length ? strict : byKind(sites, 'grove', 'sweep').filter(s => s !== third && s !== w), hol = bedPool.filter(s => s.hollow);
  const bed = pick(hol.length ? hol : bedPool, seed, id, 'bed') || pick(sites.filter(s => s !== third), seed, id, 'bed') || third;
  return { water: w, grass: g, third, bed };
}

// A night's change (canon 4): one or two of the three haunts change, her bed now and then. A pure step from the last night's haunts; the sites of the place are the only ones to choose from.
export function nightStep(seed, id, hs, sites, night) {
  const out = { ...hs }, nChange = 1 + (rnd(seed, 'nchg', id, night) < .4 ? 1 : 0), slots = ['water', 'grass', 'third'];
  const order = slots.slice().sort((a, b) => rnd(seed, 'ord', id, night, a) - rnd(seed, 'ord', id, night, b));
  const kinds = { water: ['reed', 'shore'], grass: ['sweep'], third: [hs.third && hs.third.k === 'outcrop' ? 'outcrop' : 'grove'] };
  for (const slot of order.slice(0, nChange)) {
    const used = [out.water, out.grass, out.third, out.bed], cands = byKind(sites, ...kinds[slot]).filter(s => !used.includes(s));
    const c = pick(cands, seed, id, 'n' + night + slot); if (c) out[slot] = c;
  }
  if (rnd(seed, 'bedchg', id, night) < .25) {
    const used = [out.water, out.grass, out.third, out.bed], cands = byKind(sites, 'grove', 'sweep').filter(s => !used.includes(s)), hol = cands.filter(s => s.hollow), c = pick(hol.length ? hol : cands, seed, id, 'nb' + night);
    if (c) out.bed = c;
  }
  return out;
}
// Her haunts after `night` nights (the realm's world turns): walked from day 0, a pure function of the seed and the id.
export function hauntsOn(seed, id, sites, doings, night) {
  let hs = haunts0(seed, id, sites, doings); if (!hs) return null;
  for (let n = 1; n <= night; n++) hs = nightStep(seed, id, hs, sites, n);
  return hs;
}

// ---------- the routine ----------
// Where she is by part of day (canon 2): W water, G grass, S the third haunt, B her bed. An early one is up and bedded before the dusk is done; a late one wakes slow and walks to her bed in the dusk.
// Never the same haunt at the same part for the two (night: both at their own beds).
export const ROUTINE = Object.freeze({
  early: Object.freeze({ dawn: 'W', morning: 'G', midday: 'S', afternoon: 'G', dusk: 'B', night: 'B' }),
  late:  Object.freeze({ dawn: 'B', morning: 'W', midday: 'B', afternoon: 'S', dusk: 'W', night: 'B' }),
});
const SLOT = { W: 'water', G: 'grass', S: 'third', B: 'bed' };
export const routineOf = d => ROUTINE[isLate(d) ? 'late' : 'early'];
// The haunt she keeps at a part of day, or null with no haunts.
export function haunt(hs, doings, part) { if (!hs) return null; return hs[SLOT[routineOf(doings)[part] || 'B']]; }
// The stand tile for a haunt: the site's own tile if free, else the nearest of the ring round it (free(x, y): standable and unoccupied).
export function standAt(site, free) {
  if (!site) return null; if (free(site.x, site.y)) return { x: site.x, y: site.y };
  for (let r = 1; r <= 3; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(site.x + dx, site.y + dy)) return { x: site.x + dx, y: site.y + dy };
  return null;
}

// ---------- names (canon 5): 44, drawn without repeat within a realm ----------
export const NAMES = Object.freeze(['Alder', 'Burr', 'Clover', 'Dunnock', 'Fennel', 'Gorse', 'Heron', 'Ivy', 'Juniper', 'Kestrel', 'Linnet', 'Maple', 'Nettle', 'Oriole', 'Poppy', 'Quill', 'Rowan', 'Sedge', 'Teasel', 'Umber', 'Vetch', 'Willow', 'Yarrow', 'Aster', 'Bracken', 'Cinder', 'Drizzle', 'Elm', 'Fern', 'Gale', 'Hazel', 'Ash', 'Lark', 'Mallow', 'Nut', 'Osier', 'Pebble', 'Reed', 'Sorrel', 'Tansy', 'Wren', 'Plover', 'Pollen', 'Flint']);
// The realm's order of the names (a shuffle by the seed), and a Loika's name by its rank among the realm's Loikas (ids in order): no repeat until the 45th, which takes the order again.
export function nameOf(seed, rank) {
  const order = NAMES.map((n, i) => [rnd(seed, 'loika-names', i), n]).sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : 1)).map(q => q[1]);
  return order[rank % order.length];
}
export { hash };
