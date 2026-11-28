// W4: the wild Loika's habits that play, the note a habit gives by range, the card line, the sample (walk-design-1 W4; plan v6 S3 Release A; canon: the editorial page on her habits).
// Pure: everything here is a function of its arguments; the page keeps the state (c.hb on the live creature, S.habits per named Loika, S.day.hab per day).
// The range rule is G1's as round 4 tested it (the range rule 3 A and B); every number is *greybox* (the designer's to tune).
//   a habit: shake (after rain, the moment it stops), calm (a wary one comes near her), sleep (curled at her bed, from dusk)
//   a play: tell (2 to 4 actions, the individual's), then four beats; ✓ facing her in sight during a play is a note
import { hash, rnd } from '../world.mjs';
import { haunt as hauntOf } from '../gen7/haunts.mjs';
import { DAY } from '../data/words.mjs';

export const HABITS = Object.freeze(['shake', 'calm', 'sleep']);
export const BEATS = 4;
// what each habit leaves when she is watched from near, and the Station chapter it answers (the walk design, section 8: a tuft is the Coat's, a whisker the Face's, a shed claw the Legs & Tail's)
export const SAMPLE = Object.freeze({ calm: Object.freeze({ item: 'whisker', chapter: 'face' }), sleep: Object.freeze({ item: 'claw', chapter: 'legs-tail' }) });
const WANTS = Object.freeze(['coat', 'face', 'place']);   // the three things a note can give (the range rule 2), in the order the card asks for them: her coat, her face, where she goes
export const SATCHEL = 8;                                         // satchel slots for samples, drops, packs, materials and food (the walk design, section 8)
export const STACK = 9;                                           // one slot holds one kind, up to 9 (owner 2026-11-25: you fill up your inventory too fast)
// the satchel's slots: like kinds share one slot, in the order each kind first came; each stack keeps its things whole (name, find, day)
export function stacks(samples) {
  const out = [], by = new Map();
  for (const s of samples || []) { let st = by.get(s.item); if (!st) { st = { item: s.item, list: [] }; by.set(s.item, st); out.push(st); } st.list.push(s); }
  return out;
}
export function stackRoom(samples, item) {   // true when one more of this kind fits: its stack under 9, or a free slot for a new kind
  const sts = stacks(samples), st = sts.find(q => q.item === item);
  return st ? st.list.length < STACK : sts.length < SATCHEL;
}
export function capStacks(samples) {   // a save's samples: like kinds merged into stacks, no stack over 9, no more than 8 slots (flat list, grouped order)
  const out = []; for (const st of stacks(samples).slice(0, SATCHEL)) out.push(...st.list.slice(0, STACK)); return out;
}

// far: more than 5 tiles; mid: 3 to 5; near: 2 or closer
export const rangeOf = d => d > 5 ? 'far' : d >= 3 ? 'mid' : 'near';
export const RANK = Object.freeze({ far: 0, mid: 1, near: 2 });
// the tell comes a few actions before the habit; its length is the individual's: 2 to 4 (a wary one waits longer, a steady one is slower to start)
export const tellOf = doings => 2 + (doings && doings.wary >= .5 ? 1 : 0) + (doings && doings.drive < 1 ? 1 : 0);
// clear air is weather only: no rain, no fog; the hour is tested apart (givesAt's byDay)
export const clearAir = ({ raining, fog }) => !raining && !fog;
// what a note gives by range (the range rule 3A, with the mid clause out): far where she goes in clear air, else the shape only; mid her coat, in any air; near her face, all four beats and the keepsake
// byDay: false from dusk on (night step 4: a far note's "where she goes" is a clear-air, by-day note; her leave has not happened yet at dusk). The hour is its own test, clear air stays weather only.
export function givesAt(range, clear, byDay = true) {
  if (range === 'far') return clear && byDay ? ['place'] : [];
  if (range === 'mid') return ['coat'];
  return ['face'];
}
// night step 5: what a note on a SLEEPER (curled at her bed, from dusk through the night) gives (w4-kill-lines-design-1 section 5, slip N3 and N4). The habit is always noted (it counts once a day for each Loika).
// Never her face (her nose is under her tail); her coat from mid while it is still dusk, never by night (lamplight takes the colour); never "where she sleeps" as the card's line (her bed goes on her page from any sighting).
// The keepsake from near (2 tiles or closer), by dusk and by night; not while she is stirred (N4: near is not the easy range). part: 'dusk' | 'night'; stirred: her ease is ears up.
export function sleeperGives(range, part, stirred = false) {
  return { gives: part === 'dusk' && range !== 'far' ? ['coat'] : [], keepsake: range === 'near' && !stirred };
}
// a sleeper at her bed: her bedding-down was played, missed or lost (the day holds a state for it) and she is at ease again or only stirred; not gone, not mid-play
export const isSleeper = ({ part, atBed, played, hasPlay, gone, ease }) => !!atBed && sleepPart(part) && !!played && !hasPlay && !gone && (ease | 0) <= 1;

// the card line for a habit (the range rule 3B, slip W5): what is still missing, the first want for a wild one being her coat, then her face, then where she goes.
// Sleep-curled's last line is where she goes at first light, which the dew's prints at her bed give in the morning (night step 4). null when nothing is left to ask.
export const wantOf = got => WANTS.find(w => !(got && got[w])) ?? null;

// ---------- her prints (the walk design, W4 round 2, 3A) ----------
// A named wild one who leaves a haunt leaves her prints at its stand tile until the end of the next morning. The routine says where she was at each part of day, so the prints are read off it:
// the haunts she kept earlier today and has moved on from, last night's and yesterday's while the dew's morning lasts, and the haunt she bolted from.
export const PARTS = Object.freeze(DAY.parts.map(p => p[0]));   // the parts of day by name, from the day's table
const sameSite = (a, b) => !!a && !!b && a.x === b.x && a.y === b.y;
// The dew lies from the start of dusk to the end of the morning.
export function dewLies(part) {
  const i = PARTS.indexOf(part);
  return i >= PARTS.indexOf('dusk') || i <= PARTS.indexOf('morning');
}
// hs: her haunts; doings: her individual's; part: now; gone: she has bolted. Returns [{ h, part, yday, gone, to, toPart }], the latest leave of each haunt first.
// to: the haunt she went to, when the print was made in the dew and still lies in it (the dew's prints point); null by dry day or after a bolt.
// first: day 1, there is no yesterday, so no yesterday's prints.
export function leftHaunts(hs, doings, part, gone, first) {
  if (!hs) return [];
  const now = PARTS.indexOf(part), at = p => hauntOf(hs, doings, p), cur = at(part), out = [], dewNow = dewLies(part);
  const add = (h, p, yday) => { if (h && !sameSite(h, cur) && !out.some(q => sameSite(q.h, h))) { const nx = PARTS[(PARTS.indexOf(p) + 1) % PARTS.length], to = dewNow && dewLies(nx) ? at(nx) : null; out.push({ h, part: p, yday, gone: false, to: to && !sameSite(to, h) ? to : null, toPart: to && !sameSite(to, h) ? nx : null }); } };
  if (gone && cur) out.push({ h: cur, part, yday: false, gone: true, to: null });   // she bolted: the haunt she was keeping is the one she left
  for (let i = now - 1; i >= 0; i--) if (!sameSite(at(PARTS[i]), at(PARTS[i + 1]))) add(at(PARTS[i]), PARTS[i], false);
  if (now <= 1 && !first) for (let i = PARTS.length - 1; i >= 3; i--) if (!sameSite(at(PARTS[i]), at(PARTS[(i + 1) % PARTS.length]))) add(at(PARTS[i]), PARTS[i], true);   // until the end of the next morning: yesterday's afternoon, dusk and night
  return out;
}
// the key of one read: one for each haunt each day
export const readKey = (id, h) => 'read:' + id + ':' + h.x + ',' + h.y;

// ---------- when a habit comes ----------
// Rain: the band's core passes a column in so many actions (the same step the page's advance() takes: it crawls .2 a tick while it covers the column, else v). st: { x, w, dir, v }.
// Returns 0 when the core is not over the column now (or never leaves within n), else the lights until it has passed (1..n).
export function rainEndsIn(st, col, n) {
  if (!st) return 0;
  let x = st.x; const off = () => Math.abs(col + .5 - (x + st.w / 2));
  if (off() >= 1.5) return 0;
  for (let i = 1; i <= n; i++) { const over = col + 1 > x && col < x + st.w; x += (over ? .2 : st.v) * st.dir; if (off() >= 1.5) return i; }
  return 0;
}
// Calm: a wary one comes near her haunt in a ten-light window of the day, from the seed: the window of a part of day she is not at her bed (the part and the light are the seed's).
// parts: DAY.parts ([name, length]); slots: the routine by part ('W','G','S','B'). Returns { from, to } in light of the day (spent), or null with no part free.
export function calmWindow(seed, id, day, parts, slots) {
  const free = []; let at = 0;
  for (const [n, len] of parts) { if ((slots[n] || 'B') !== 'B' && n !== 'night' && len >= 14) free.push({ from: at + 2, to: at + len - 12 }); at += len; }
  if (!free.length) return null;
  const p = free[Math.floor(rnd(seed, 'calmp', id, day) * free.length)], from = p.from + Math.floor(rnd(seed, 'calmt', id, day) * Math.max(1, p.to - p.from));
  return { from, to: from + 12 };
}
// Sleep: curled at her bed, from dusk: the part is dusk or night and the haunt she keeps then is her bed
export const sleepPart = part => part === 'dusk' || part === 'night';

// ---------- what a Loika has learned, per named Loika and habit (S.habits[id][k]) ----------
export const blank = () => ({ ranges: {}, got: {}, best: null, plays: 0, sample: null, sights: 0 });
export function record(H, id, k) { const o = H[id] || (H[id] = {}); return o[k] || (o[k] = blank()); }
// a note taken: returns what it gave, whether it was the habit's first, and whether the card's wanted thing is filled
export function noteIn(rec, range, clear, want, byDay = true, given = null) {   // given: what a sleeper's note gives (sleeperGives), in place of the range rule's
  const first = !Object.keys(rec.ranges).length, gives = given || givesAt(range, clear, byDay), newly = gives.filter(g => !rec.got[g]);
  rec.ranges[range] = (rec.ranges[range] || 0) + 1;
  if (!rec.best || RANK[range] > RANK[rec.best]) rec.best = range;
  for (const g of gives) rec.got[g] = 1;
  return { first, gives, newly, filled: !!want && gives.includes(want) };
}
// a seeded id for a sample, stable per Loika and habit
export const sampleId = (seed, id, k) => 's' + (hash(seed, 'sample', id, k) >>> 0).toString(36);
