// G1, the watch in one place (plan v6 3a; owner 2026-11-22 07:3x). One hand-made place, one Loika with her three habits, one day of light (W1): W3's rules (the carry table, ease in four stages,
// sight blocked by props and raised edges, wind per part of day, keeping still as one act) and W4's (a note carries its range; the first note of a habit pays +1 Data and, near, a sample) here only.
// Pure and headless: the page draws this state and the bot (tools/g1-bot.mjs) plays it. Every number is *greybox* (the designer's to tune).// Nothing here brings a habit on: a habit plays when its cause comes in her day (rain stops, a wary one comes near, dusk). No way to bring one on is designed.
import { DAY, partOfDay, G1 } from "./words.mjs";
import { INDIVIDUALS } from "./g1-individuals.mjs";

export const W = 14, H = 16;
export const START = { x: 7, y: 14 }, HAUNT = { x: 7, y: 4 }, BED = { x: 6, y: 3 };
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIR_KEYS = Object.keys(DIRS);
const WIND = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };   // the way it blows toward
const WIND_KEYS = ['N', 'E', 'S', 'W'];
// ground: '.' grass, ',' open sand, 't' tall grass, 'r' reeds (cover), '#' a prop (blocks steps and sight), '^' a raised edge (blocks steps and sight)
export const GRID = (() => {
  const g = [];
  for (let y = 0; y < H; y++) { g.push([]); for (let x = 0; x < W; x++) {
    let c = '.';
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c = '^';
    else if (x >= 1 && x <= 4 && y >= 1 && y <= 8) c = 'r';                // the reed bank on her west side
    else if (x >= 5 && x <= 6 && y >= 3 && y <= 9) c = 't';                // tall grass between the reeds and her
    else if (x >= 1 && x <= 4 && y >= 9 && y <= 12) c = 't';               // tall grass running down to the start
    else if (x >= 8 && x <= 12 && y >= 1 && y <= 12) c = ',';              // open sand on her east side
    g[y].push(c); } }
  for (const [x, y] of [[7, 7], [7, 8], [7, 9], [4, 11], [5, 11]]) g[y][x] = '#';   // a stone wall south of the haunt; a boulder cut at the reeds' foot
  return g;
})();
export const tileAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '^' : GRID[y][x]);
const blocksStep = c => c === '#' || c === '^';
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
// the two approach routes, start to her side: through the reeds (cover) and over the sand (open)
const line = pts => { const out = [{ ...pts[0] }]; for (let i = 1; i < pts.length; i++) { let { x, y } = out[out.length - 1]; const t = pts[i]; while (x !== t.x || y !== t.y) { if (x !== t.x) x += Math.sign(t.x - x); else y += Math.sign(t.y - y); out.push({ x, y }); } } return out; };
export const ROUTES = {
  cover: line([START, { x: 3, y: 14 }, { x: 3, y: 4 }, { x: 6, y: 4 }]),
  open: line([START, { x: 10, y: 14 }, { x: 10, y: 4 }, { x: 8, y: 4 }]),
};

function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rngFor = (seed, tag) => { let h = 2166136261 ^ seed; for (const c of tag) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return mulberry(h >>> 0); };
export const individual = seed => { const r = INDIVIDUALS[((seed - 1) % INDIVIDUALS.length + INDIVIDUALS.length) % INDIVIDUALS.length]; return { wary: r[0], tell: r[1], late: !!r[2] }; };

// where the wary one enters (all within four of her haunt, so it can come near her): north-east sand, east sand, north-west reeds, west reeds
const MIBI_FROM = [[10, 2], [10, 7], [4, 1], [3, 6]];
// a day for a seed: the wind of each part, the rain, when the wary one passes, when she beds down. All from the seed.
export function makeDay(seed) {
  const r = rngFor(seed, 'g1-day'), ind = individual(seed);
  const wind = []; let w = Math.floor(r() * 4);
  for (let i = 0; i < DAY.parts.length; i++) { if (i && r() < .35) w = (w + 1 + Math.floor(r() * 3)) % 4; wind.push(WIND_KEYS[w]); }
  let rain = null;
  if (r() < .8) { const s = 20 + Math.floor(r() * 65), len = 15 + Math.floor(r() * 21), e = Math.min(s + len, 120); if (e - s >= 10) rain = { s, e }; }
  const ma = 125 + Math.floor(r() * 16);                                    // the wary one comes near at ma and stays 14 light
  const sleepAt = 150 + (ind.late ? 6 + Math.floor(r() * 5) : Math.floor(r() * 4));   // dusk starts at 150
  const from = MIBI_FROM[Math.floor(rngFor(seed, 'g1-mibi-from')() * MIBI_FROM.length)];   // where the wary one enters the place: the seed sets it
  return { seed, ind, light: 0, over: false, wind, rain, ma, sleepAt,
    P: { x: START.x, y: START.y, dir: 'up' }, L: { x: HAUNT.x, y: HAUNT.y, ease: 0, quiet: 0, gone: false, habit: null, asleep: false },
    M: { x: from[0], y: from[1], fx: from[0], fy: from[1], here: false }, done: {}, notes: {}, data: 0, samples: [], events: [], lastAt: -1,
    log: { holds: 0, waits: 0, steps: 0, notes: 0, heard: 0, goneAt: null, lostHabits: 0 } };
}
export const raining = (S, l = S.light) => !!S.rain && l >= S.rain.s && l < S.rain.e;
export const windNow = (S, l = S.light) => S.wind[DAY.parts.findIndex(([n]) => n === partOfDay(l))];
// the wary one's coming is named to within ten light: mibiFrom is the start of the ten-light window that holds it (its routine fixes it from the seed)
export const forecast = S => ({ rain: S.rain ? [S.rain.s, S.rain.e] : null, mibiPart: partOfDay(S.ma), mibiFrom: Math.floor(S.ma / 10) * 10, mibiAt: { x: S.M.fx, y: S.M.fy }, wind: S.wind.slice(), sleepPart: 'dusk' });

// ---- W3: sight and the carry ----
// a straight line between two tiles' centres is blocked by a prop or a raised edge on a tile between them
export function los(a, b) {
  let n = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); if (!n) return true;
  for (let i = 1; i < n; i++) { const x = Math.round(a.x + (b.x - a.x) * i / n), y = Math.round(a.y + (b.y - a.y) * i / n); if (blocksStep(tileAt(x, y))) return false; }
  return true;
}
// what this step carries, in tiles, with its parts; at a tile, for a gait ('creep' or 'walk')
export function carryAt(S, x, y, gait) {
  const c = tileAt(x, y), L = S.L, p = { gait: gait === 'walk' ? 4 : 2, ground: c === 't' || c === 'r' ? -1 : c === ',' ? 1 : 0, wind: 0, rain: raining(S) ? -1 : 0, wary: S.ind.wary };
  const vx = x - L.x, vy = y - L.y, m = Math.hypot(vx, vy);
  if (m > 0) { const w = WIND[windNow(S)], cos = (w[0] * vx + w[1] * vy) / m; p.wind = cos > .5 ? -1 : cos < -.5 ? 2 : 0; }   // blowing from her to you: downwind; from you to her: upwind
  return { v: Math.max(1, p.gait + p.ground + p.wind + p.rain + p.wary), parts: p };
}
export const heardAt = (S, x, y, gait) => !S.L.gone && cheb({ x, y }, S.L) <= carryAt(S, x, y, gait).v && los({ x, y }, S.L);
// the wary one's notice (round 3): the same carry table and reach as any wild one, from where it comes in, with its own wariness (the individual's "wary"); a stood or creeping explorer is a creep's carry
export function noticeAt(S, x, y, gait = 'creep') {
  const c = tileAt(x, y), o = { x: S.M.fx, y: S.M.fy }, p = { gait: gait === 'walk' ? 4 : 2, ground: c === 't' || c === 'r' ? -1 : c === ',' ? 1 : 0, wind: 0, rain: raining(S) ? -1 : 0, wary: S.ind.wary };
  const vx = x - o.x, vy = y - o.y, m = Math.hypot(vx, vy);
  if (m > 0) { const w = WIND[windNow(S)], cos = (w[0] * vx + w[1] * vy) / m; p.wind = cos > .5 ? -1 : cos < -.5 ? 2 : 0; }
  const v = Math.max(1, p.gait + p.ground + p.wind + p.rain + p.wary);
  return { v, noticed: cheb({ x, y }, o) <= v && los({ x, y }, o), parts: p };
}
export const rangeOf = d => d > 5 ? 'far' : d >= 3 ? 'mid' : 'near';
const passable = (S, x, y) => !blocksStep(tileAt(x, y)) && !(!S.L.gone && S.L.x === x && S.L.y === y) && !(S.M.here && S.M.x === x && S.M.y === y);
export const canStep = (S, dir, n = 1) => { const [dx, dy] = DIRS[dir]; return passable(S, S.P.x + dx, S.P.y + dy); };

// the line under her: would the next step be heard, creeping and walking
export function hearLine(S) {
  if (S.L.gone) return G1.gone;
  if (!los(S.P, S.L) && cheb(S.P, S.L) > 8) return G1.hearNone;
  const [dx, dy] = DIRS[S.P.dir], free = passable(S, S.P.x + dx, S.P.y + dy), x = free ? S.P.x + dx : S.P.x, y = free ? S.P.y + dy : S.P.y;
  return G1.hear(heardAt(S, x, y, 'creep'), heardAt(S, x, y, 'walk'));
}

// ---- the world's tick: one light spent ----
const HABITS = ['shake', 'calm', 'sleep'];
function spend(S, heard) {
  const L = S.L;
  if (!L.gone) {
    if (heard) { L.ease = L.ease >= 2 ? 3 : 2; L.quiet = 0; S.log.heard++; S.events.push(L.ease >= 3 ? 'gone' : 'heard'); if (L.ease >= 3) { L.gone = true; L.habit = null; L.x = -9; L.y = -9; S.log.goneAt = S.light; } }
    else { L.quiet++; if (L.ease === 1 && L.quiet >= 2) { L.ease = 0; L.quiet = 0; S.events.push('settled'); } else if (L.ease === 2 && L.quiet >= 3) { L.ease = 1; L.quiet = 0; S.events.push('settled'); } }
  }
  S.light++;
  if (S.light >= DAY.light) { S.over = true; return; }
  const was = S.light - 1;
  if (raining(S) !== raining(S, was)) S.events.push('weather');
  if (partOfDay(S.light) !== partOfDay(was)) S.events.push('part');
  // her day
  if (S.light === 150 && !L.gone) { L.x = BED.x; L.y = BED.y; }   // dusk: she goes to her bed
  if (!L.gone && L.habit) {
    const h = L.habit; if (L.ease >= 2) { S.done[h.k] = 'lost'; L.habit = null; S.log.lostHabits++; S.events.push('lost'); }
    else { h.n++; if (h.n >= S.ind.tell + 4) { S.done[h.k] = 'played'; L.habit = null; if (h.k === 'sleep') L.asleep = true; S.events.push('end'); } else if (h.n - S.ind.tell === 3 && h.k === 'calm') { S.M.x += Math.sign(L.x - S.M.x); S.M.y += Math.sign(L.y - S.M.y); } }
  }
  // the wary mibi: it comes near at ma and goes 14 light on; while the explorer is inside its notice it does not come near her (calm does not play)
  if (S.light === S.ma) { S.M.here = true; S.M.x = S.M.fx; S.M.y = S.M.fy; }
  if (S.M.here && !L.gone && L.habit && L.habit.k === 'calm' && noticeAt(S, S.P.x, S.P.y).noticed) { S.done.calm = 'lost'; L.habit = null; S.log.lostHabits++; S.events.push('lost'); }
  if (S.light === S.ma + 14 || (S.done.calm === 'played' && S.M.here && !L.habit)) { S.M.here = false; if (!S.done.calm) S.done.calm = 'missed'; }
  // a habit starts when its cause is there and she is at ease enough to show it
  if (!L.gone && !L.habit) {
    let k = null;
    if (S.rain && S.light >= S.rain.e && S.light < S.rain.e + 3 && !S.done.shake) k = 'shake';
    else if (S.M.here && cheb(S.M, L) <= 4 && !S.done.calm && !noticeAt(S, S.P.x, S.P.y).noticed) k = 'calm';
    else if (S.light >= S.sleepAt && S.light < S.sleepAt + 6 && !S.done.sleep) k = 'sleep';
    if (k && L.ease <= 1) { L.habit = { k, n: 0 }; S.events.push('tell'); }
    else if (k === 'shake' && S.light === S.rain.e + 2) S.done.shake = 'missed';
  }
}

// ---- the player's acts: each spends one light (a held-still act spends one per Wait it runs) ----
export function face(S) { const L = S.L; if (L.gone) return false; const dx = L.x - S.P.x, dy = L.y - S.P.y; S.P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); return true; }
// a step: creep moves one tile, walk a stride of two (the same light); heard at any tile it lands on. A step into something only turns.
export function step(S, dir, gait = 'creep') {
  if (S.over) return { ok: false };
  const [dx, dy] = DIRS[dir]; S.P.dir = dir; let moved = 0, heard = false;
  for (let i = 0; i < (gait === 'walk' ? 2 : 1); i++) {
    const x = S.P.x + dx, y = S.P.y + dy; if (!passable(S, x, y)) break;
    S.P.x = x; S.P.y = y; moved++; if (heardAt(S, x, y, gait)) heard = true;
  }
  if (!moved) return { ok: false, blocked: true };
  S.log.steps++; spend(S, heard); return { ok: true, heard };
}
export function wait(S) { if (S.over) return { ok: false }; S.log.waits++; spend(S, false); return { ok: true }; }
// keeping still, ONE act: Waits that run until her ease changes, a tell starts, the weather or the part of day turns, or ten light have gone. Each Wait spends light.
export function hold(S) {
  if (S.over) return { ok: false };
  S.log.holds++;
  if (S.L.habit) { wait(S); return { ok: true, n: 1, why: 'habit' }; }   // while she plays a habit a hold is one beat
  const e0 = S.L.ease; let n = 0, why = 'ten';
  for (;;) {
    const from = S.events.length; wait(S); n++;
    const ev = S.events.slice(from);
    if (S.over) { why = 'over'; break; }
    if (S.L.ease !== e0) { why = 'ease'; break; }
    if (ev.includes('tell')) { why = 'tell'; break; }
    if (ev.includes('weather')) { why = 'weather'; break; }
    if (ev.includes('part')) { why = 'part'; break; }
    if (n >= 10) break;
  }
  return { ok: true, n, why };
}
// ---- W4: notes ----
export function noteState(S) {
  const L = S.L; if (S.over) return { ok: false, why: 'habit' };
  if (L.gone) return { ok: false, why: 'gone' };
  if (!L.habit) return { ok: false, why: 'habit' };
  const dx = L.x - S.P.x, dy = L.y - S.P.y, [fx, fy] = DIRS[S.P.dir], fwd = dx * fx + dy * fy, lat = Math.abs(dx * fy - dy * fx);
  if (!(fwd > 0 && lat <= fwd + 1)) return { ok: false, why: 'face' };
  if (!los(S.P, L)) return { ok: false, why: 'sight' };
  const d = cheb(S.P, L), range = rangeOf(d), rec = S.notes[L.habit.k];
  if (rec && rec.ranges[range]) return { ok: false, why: 'dup', range };
  return { ok: true, range, k: L.habit.k, d };
}
export function note(S) {
  const st = noteState(S); if (!st.ok) return st;
  const rec = S.notes[st.k] || (S.notes[st.k] = { first: st.range, best: st.range, ranges: {}, at: S.light, sample: null, order: Object.keys(S.notes).length });
  const rank = { far: 0, mid: 1, near: 2 }; rec.ranges[st.range] = S.light; if (rank[st.range] > rank[rec.best]) rec.best = st.range;
  const first = Object.keys(rec.ranges).length === 1; if (first) { S.data += 1; S.events.push('note1'); }
  if (st.range === 'near' && !rec.sample) { rec.sample = G1.sample[st.k]; S.samples.push(rec.sample); S.events.push('sample'); }
  S.log.notes++; S.lastAt = S.light; spend(S, false);
  return { ...st, first, sample: st.range === 'near' ? rec.sample : null, text: G1.seen[st.k][st.range] };
}
// ✓: a note when she plays a habit in front of you, else keeping still
export const confirm = S => (noteState(S).ok ? note(S) : hold(S));

// words for the line under her and the ease
export const easeWord = S => G1.ease[S.L.ease];
export const habitName = S => (S.L.habit ? G1.habit[S.L.habit.k].name : null);
// the beat or tell playing now, in words ([copy])
export function habitNow(S) {
  const h = S.L.habit; if (!h) return null; const w = G1.habit[h.k];
  return h.n < S.ind.tell ? w.tell : w.beats[Math.min(3, h.n - S.ind.tell)];
}
export const HABIT_KEYS = HABITS;
