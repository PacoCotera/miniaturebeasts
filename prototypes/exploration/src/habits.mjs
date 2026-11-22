// W4: the wild Loika's habits that play, the note a habit gives by range, the card line, the sample (walk-design-1 W4; plan v6 S3 Release A; canon: book/plan/loika-habits.md).
// Pure: everything here is a function of its arguments; the page keeps the state (c.hb on the live creature, S.habits per named Loika, S.day.hab per day).
// The range rule is G1's as round 4 tested it (runs/g1-range-design-2/range.md 3 A and B); every number is *greybox* (the designer's to tune).
//   a habit: shake (after rain, the moment it stops), calm (a wary one comes near her), sleep (curled at her bed, from dusk)
//   a play: tell (2 to 4 actions, the individual's), then four beats; ✓ facing her in sight during a play is a note
import { hash, rnd } from './world.mjs';

export const HABITS = Object.freeze(['shake', 'calm', 'sleep']);
export const BEATS = 4;
// what each habit leaves when she is watched from near, and the Station chapter it answers (walk.md section 8: a tuft is the Coat's, a whisker the Face's, a shed claw the Legs & Tail's)
export const SAMPLE = Object.freeze({ shake: Object.freeze({ item: 'tuft', chapter: 'coat' }), calm: Object.freeze({ item: 'whisker', chapter: 'face' }), sleep: Object.freeze({ item: 'claw', chapter: 'legs-tail' }) });
export const WANTS = Object.freeze(['place', 'coat', 'face']);   // the three things a note can give (range.md 2): where she goes, her coat, her face
export const SATCHEL = 8;                                         // satchel slots for samples, drops, packs, materials and food (walk.md section 8)

// far: more than 5 tiles; mid: 3 to 5; near: 2 or closer
export const rangeOf = d => d > 5 ? 'far' : d >= 3 ? 'mid' : 'near';
export const RANK = Object.freeze({ far: 0, mid: 1, near: 2 });
// the tell comes a few actions before the habit; its length is the individual's: 2 to 4 (a wary one waits longer, a steady one is slower to start)
export const tellOf = doings => 2 + (doings && doings.wary >= .5 ? 1 : 0) + (doings && doings.drive < 1 ? 1 : 0);
// clear air: no rain, no fog, before dusk (range.md 3A)
export const clearAir = ({ raining, fog, part }) => !raining && !fog && part !== 'dusk' && part !== 'night';
// what a note gives by range (range.md 3A): far where she goes in clear air, else the shape only; mid the coat (and where she goes in dim air); near her face, all four beats and the keepsake
export function givesAt(range, clear) {
  if (range === 'far') return clear ? ['place'] : [];
  if (range === 'mid') return clear ? ['coat'] : ['coat', 'place'];
  return ['face'];
}
// the card line for a habit (range.md 3B): in the realm what is still missing, not a draw. Her face when the Station holds no sample for the habit's chapter (a player with no keepsake is sent close first);
// otherwise the seed draws among what is not yet got for that habit. null when all three are got.
export function wantOf(seed, id, k, got, haveSample) {
  const left = WANTS.filter(w => !(got && got[w]));
  if (!left.length) return null;
  if (!haveSample && left.includes('face')) return 'face';
  return left[Math.floor(rnd(seed, 'want', id, k, left.length) * left.length)];
}
// the vantage a note is taken from: the side she faces is the front (Face), any other is the side (Coat); she faces left (-1) or right (1)
export const vantageOf = (c, P) => (Math.sign(P.x - c.x) || 0) === (c.face || 1) ? 'front' : 'side';

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
export function noteIn(rec, range, clear, want) {
  const first = !Object.keys(rec.ranges).length, gives = givesAt(range, clear), newly = gives.filter(g => !rec.got[g]);
  rec.ranges[range] = (rec.ranges[range] || 0) + 1;
  if (!rec.best || RANK[range] > RANK[rec.best]) rec.best = range;
  for (const g of gives) rec.got[g] = 1;
  return { first, gives, newly, filled: !!want && gives.includes(want) };
}
// a seeded id for a sample, stable per Loika and habit
export const sampleId = (seed, id, k) => 's' + (hash(seed, 'sample', id, k) >>> 0).toString(36);
