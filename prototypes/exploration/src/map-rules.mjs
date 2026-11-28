// The map rules both pages agree on, in one place (map-room build, rule 21: moved out of exploration/index.html, never copied).
// The Companion's page and the Station's map room call these; neither keeps a copy. Pure: the world (G), the save's parts and the
// partner's abilities are passed in, nothing is read from a page.
import { MW, MH, DIRS, canStepIn, cxy } from './logic/world.mjs';

// Probe tiers: range in cells from the expedition's start, pods carried, shield bars.
export const TIER = { 1: { range: 2, hold: 2, shield: 3 }, 2: { range: 4, hold: 3, shield: 4 } };
export const tierOf = (t) => TIER[t === 2 ? 2 : 1];

// The cells an expedition can reach on foot without leaving the range square. opts: what the partner can cross ({ sure, bank }).
export function reachCellsIn(G, start, range, opts = {}) {
  const s0 = cxy(start), seen = new Set([start]), q = [start];
  while (q.length) {
    const c = q.shift(), p = cxy(c);
    for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
      const x = p.x + dx, y = p.y + dy; if (x < 0 || y < 0 || x >= MW || y >= MH) continue;
      const d = y * MW + x;
      if (seen.has(d) || !canStepIn(G, c, dir, opts) || G.island[d] || Math.max(Math.abs(x - s0.x), Math.abs(y - s0.y)) > range) continue;
      seen.add(d); q.push(d);
    }
  }
  return [...seen];
}

// No cell of the land is known yet: a new world's first set-out.
export const firstPlacementOf = (revealed) => !revealed.some(v => v);
// Where a start may go. first: the lights (startPlaces) alone; after that any cell he has seen that can be walked on and is not sealed off.
// passable: a function of a cell (the page's own, world.mjs passableIn over G).
export function placeValidIn({ G, revealed, passable, starts }, c) {
  if (firstPlacementOf(revealed)) return !!starts && starts.includes(c);
  return !!revealed[c] && passable(c) && !G.island[c] && (!G.gen || !!G.comp[c]);   // never on a sealed plateau
}

// The marks of the Companion's map: the kinds, in the order the page says them, and how many it signs.
export const SIGN_ORDER = ['skull', 'depot', 'b', 'pod', 't', 'k', 'kw', 'pin', 'beacon', 'burrow', 'water', 'soft', 'bank', 'deep'];
// One book of signs: add(c, kind, pri, extra) merges kinds per cell and keeps the highest priority; pick(revealedCount) is what is signed:
// every mark of priority 9 or more, then the rest down to about 40% of the revealed cells (at least 3).
export function signBook() {
  const out = new Map();
  const add = (c, kind, pri, extra) => {
    let e = out.get(c); if (!e) { e = { c, pri: 0, list: [] }; out.set(c, e); }
    if (e.list.some(q => q.kind === kind)) return;
    e.list.push(Object.assign({ kind }, extra || {})); e.pri = Math.max(e.pri, pri);
  };
  return { out, add, entry: (c) => out.get(c), pick: (revealedCount) => pickSigns([...out.values()], revealedCount) };
}
export function pickSigns(entries, revealedCount) {
  const cap = Math.max(3, Math.floor(revealedCount * .4));
  const all = [...entries].sort((a, b) => b.pri - a.pri || a.c - b.c);
  return all.filter((e, i) => e.pri >= 9 || i < cap);
}

// A wild one's known places by part of day: where she was seen to keep, from the Companion's part of the save. `seenAt` is the save's record of
// where each was last seen ({ k: place key, x, y, sp, t }); `keeps` (her page's record, when the save has it) is { id: { <part of day>: place key } }.
// Returns [{ id, place, part }] with part null when only the sighting is known. A place he has not seen her keep is never returned.
export function keptPlacesOf({ seenAt, keeps, revealed }) {
  const out = [];
  if (keeps) for (const id of Object.keys(keeps).sort()) for (const part of Object.keys(keeps[id]).sort()) { const place = +keeps[id][part]; if (revealed[place]) out.push({ id, place, part }); }
  const have = new Set(out.map(o => o.id + ':' + o.place));
  if (seenAt) for (const id of Object.keys(seenAt).sort()) { const place = +seenAt[id].k; if (Number.isInteger(place) && revealed[place] && !have.has(id + ':' + place)) out.push({ id, place, part: null }); }
  return out;
}
