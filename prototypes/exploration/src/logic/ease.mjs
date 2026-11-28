// W3, ease and keeping still (walk-design-1 W3; G1's rules, round 4, moved into the realm). Pure: the page gives a small view of the place (`env`) and the wild one's state; nothing is stored here.
//   env: { ground(x, y): 'cover' | 'open' | 'plain', blocks(x, y): a prop or a raised edge (blocks sight), wind: 'N'|'E'|'S'|'W'|null, rain, fog }
//   a wild one (a named Loika): { x, y, ease: 0 grazing | 1 ears up | 2 watching | 3 gone, quiet, crowd, wary (the table's -1, 0, 1) }
import { carryOf, windRow, WIND_DIRS, partnerCost } from '../walk-data.mjs';
import { DAY, partOfDay } from '../words.mjs';

export const EASE = Object.freeze({ grazing: 0, ears: 1, watching: 2, gone: 3 });
export const STAY = 10;   // light a still explorer may stay within 2 tiles, less twice the creeping carry there
export const STAY_NEAR = 2;
export const HOLD_MAX = 10;
export const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

// a straight line between two tiles' centres is blocked by a prop or a raised edge on a tile between them (never the two ends)
export function los(env, a, b) {
  const n = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); if (n <= 1) return true;
  for (let i = 1; i < n; i++) { const x = Math.round(a.x + (b.x - a.x) * i / n), y = Math.round(a.y + (b.y - a.y) * i / n); if (env.blocks(x, y)) return false; }
  return true;
}
// what a step at (x, y) carries to a wild one at `from`, by gait ('creep' | 'walk'); the ground is the explorer's own
export function carryAt(env, from, x, y, gait, wary = 0, sp) {
  return carryOf({ gait, ground: env.ground(x, y), wind: windRow(env.wind, from, { x, y }), rain: !!env.rain, fog: !!env.fog, wary, partner: sp == null ? 0 : partnerCost(sp) });
}
export const heardAt = (env, from, x, y, gait, wary = 0) => { const v = carryAt(env, from, x, y, gait, wary).v, dx = x - from.x, dy = y - from.y; return dx * dx + dy * dy <= v * v && los(env, { x, y }, from); };   // round, like the drawn carry ring (radius v tiles from the tile's centre)
export const stayAt = (env, from, x, y, wary = 0) => Math.max(0, STAY - 2 * carryAt(env, from, x, y, 'creep', wary).v);

// the wind of a land for a part of day, from the realm seed: steady through a part, it may turn at the next (the day strip shows it). A tiny hash of its own, so the land's freeze is untouched.
const mix = (...a) => { let h = 2166136261 >>> 0; for (const v of a) { const s = String(v); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; h = Math.imul(h ^ 0x9e37, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; };
export function windOf(seed, land, part) {
  const idx = Math.max(0, DAY.parts.findIndex(([n]) => n === part)); let w = Math.floor(mix(seed, 'wind', land) * 4);
  for (let i = 1; i <= idx; i++) if (mix(seed, 'wind-turn', land, i) < .35) w = (w + 1 + Math.floor(mix(seed, 'wind-to', land, i) * 3)) % 4;
  return WIND_DIRS[w];
}
export const windAt = (seed, land, spent) => windOf(seed, land, partOfDay(spent));

// One light goes by for a wild one: `heard` is a heard step (or the stay running out). Mutates `c` (ease, quiet) and returns the events: 'heard' (to watching), 'gone', 'settled'.
// Two quiet actions in a row lower ears up to grazing; three lower watching to ears up (the built settle); a first heard step is watching, a second is gone.
// Night step 5: `asleep` (curled at her bed, grazing): the first heard step only stirs her (ears up, ev 'stirred'); after that she is heard as awake, so the next wakes her and she watches, the next she is gone.
export function easeTick(c, heard, asleep = false) {
  const ev = [];
  if (c.ease >= 3) return ev;
  if (heard && asleep && !(c.ease >= 1)) { c.ease = 1; c.quiet = 0; ev.push('stirred'); }
  else if (heard) { c.ease = c.ease >= 2 ? 3 : 2; c.quiet = 0; ev.push(c.ease >= 3 ? 'gone' : 'heard'); }
  else { c.quiet = (c.quiet || 0) + 1; if (c.ease === 1 && c.quiet >= 2) { c.ease = 0; c.quiet = 0; ev.push('settled'); } else if (c.ease === 2 && c.quiet >= 3) { c.ease = 1; c.quiet = 0; ev.push('settled'); } }
  return ev;
}
// The stay: each light the explorer ends within 2 tiles adds one; reset beyond 2 tiles; past STAY less twice the creeping carry there, it is a heard step. Returns true when the stay runs out.
export function stayTick(env, c, P) {
  if (c.ease >= 3) return false;
  if (cheb(P, c) > STAY_NEAR) { c.crowd = 0; return false; }
  c.crowd = (c.crowd || 0) + 1;
  if (c.crowd > stayAt(env, c, P.x, P.y, c.wary || 0)) { c.crowd = 0; return true; }
  return false;
}
// how long she lets you stay here: the light left on the count (within 2 tiles only), else null
export const stayLeft = (env, c, P) => (c.ease >= 3 || cheb(P, c) > STAY_NEAR ? null : Math.max(0, stayAt(env, c, P.x, P.y, c.wary || 0) - (c.crowd || 0)));

// Keeping still as one act (hold ✓): Waits run until her ease changes, a tell starts, the weather or the part of day turns, or ten light have gone. `wait()` spends one light and returns what turned:
// { tell, weather, part, over }. Returns { n, why }.
export function holdRun(wait, easeOf, max = HOLD_MAX) {
  const e0 = easeOf(); let n = 0;
  for (;;) {
    const r = wait() || {}; n++;
    if (r.over) return { n, why: 'over' };
    if (easeOf() !== e0) return { n, why: 'ease' };
    if (r.tell) return { n, why: 'tell' };
    if (r.weather) return { n, why: 'weather' };
    if (r.part) return { n, why: 'part' };
    if (r.warn) return { n, why: 'warn' };   // rest at camp: a strike warned in the place or on the map cell
    if (r.plate) return { n, why: 'plate' };   // rest at camp: a plate was lost
    if (n >= max) return { n, why: 'ten' };
  }
}
