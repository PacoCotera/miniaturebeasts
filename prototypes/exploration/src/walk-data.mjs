// L2b: how the Companion's wild kinds walk, notice, flee, eat or drink, settle and shed, and which field habit each kind's partner brings home.
// Pure data and two small pure helpers: the page builds its SPECIES rows from it (kinds are by the Companion's species index, the game's list order), the tests read it in Node.
//   notice [creep, walk]: tiles at which the kind notices you; flee: tiles it runs; eats: takes fruit; drinks: takes dew (a drinker does not eat fruit);
//   settle: where a quiet settle can happen ('burrow' in the cave or by a hole, 'any' anywhere in the place, 'fog' only while the place is in a fog bank, null never);
//   shed: the kind's moment (null: it never sheds from a moment); how: the pod's `how` (the shed moment's key); wander: the chance of a random step per action.

// The row the seventeen newer kinds shared before this ticket (S04 to S20), plus the new fields at their plain values.
export const WALK_DEFAULT = Object.freeze({ notice: [2, 4], flee: 2, eats: true, shedP: .1, how: 'calm', drinks: false, settle: null, shed: null, wander: .4 });

// The three built kinds keep every value they had; only the new fields are named here.
export const BUILT = Object.freeze({
  0: Object.freeze({ drinks: false, settle: null, shed: 'shake', wander: .4 }),     // Loika
  1: Object.freeze({ drinks: true, settle: 'burrow', shed: 'calm', wander: .4 }),   // Tuikis
  2: Object.freeze({ drinks: false, settle: null, shed: 'meal', wander: .25 }),     // Untuva
});

// The six tuned newer kinds, by species index.
export const WALK = Object.freeze({
  3: Object.freeze({ notice: [2, 5], flee: 2, eats: true, drinks: false, settle: null, shed: 'grab', how: 'grab', wander: .25 }),    // S04 Hiljan
  4: Object.freeze({ notice: [2, 5], flee: 3, eats: true, drinks: false, settle: null, shed: 'warm', how: 'warm', wander: .55 }),    // S05 Tepor
  7: Object.freeze({ notice: [1, 3], flee: 1, eats: true, drinks: false, settle: null, shed: 'dig', how: 'dig', wander: .5 }),      // S08 Rupar
  11: Object.freeze({ notice: [3, 6], flee: 3, eats: false, drinks: true, settle: 'fog', shed: 'fog', how: 'fog', wander: .5 }),    // S12 Peplos
  16: Object.freeze({ notice: [1, 3], flee: 1, eats: false, drinks: true, settle: 'any', shed: 'still', how: 'still', wander: .2 }), // S17 Wickle
  19: Object.freeze({ notice: [1, 4], flee: 1, eats: true, drinks: false, settle: null, shed: 'air', how: 'air', wander: .5 }),     // S20 Tuliko
});

// The field habit each partner kind brings home (the Station's frame habit keys), by species index.
export const FIELD = Object.freeze({ 0: 'calm', 1: 'dig', 3: 'tiptoe', 4: 'stone-sense', 7: 'bank-dig', 11: 'dew-find', 16: 'beacon-sit', 19: 'hop-down' });

// The routine base per kind (walk W2, by species index): a kind with a row keeps individuals with haunts, a bed and a routine by part of day (src/gen7/haunts.mjs); pace: tiles it walks an action to its haunt.
// Loikas first; each further kind is its own release (walk-design-1, "more kinds").
export const ROUTINE_BASE = Object.freeze({ 0: Object.freeze({ haunts: 3, bed: true, pace: 2 }) });
export const routineBase = sp => ROUTINE_BASE[sp] || null;

// A newer kind's SPECIES fields (S04 and on): the shared default under the kind's own values.
export const walkRow = sp => ({ ...WALK_DEFAULT, ...(WALK[sp] || {}) });

// Whether a creature that settles that way can settle where it is. ctx: { cave, hole (a hole within 2 tiles), fog (the place is in a fog bank) }.
export function settlesAt(settle, ctx) {
  if (settle === 'burrow') return !!(ctx.cave || ctx.hole);
  if (settle === 'any') return true;
  if (settle === 'fog') return !!ctx.fog;
  return false;
}

// The fog never raises a kind's notice: the walking range the page uses, in tiles.
export function noticeRange(row, { curious = false, fog = false, calm = false } = {}) {
  let n = row.notice[1]; if (curious) n--; if (fog) n -= 2; if (calm) n -= 2; return n;
}

// A creeping step is noticed within this many tiles: the row's creep notice less one (the shared row's 2 is today's 1 tile), never under 1.
export const creepRange = row => Math.max(1, row.notice[0] - 1);
// A run covers flee + 1 tiles (the shared row's 2 is today's 3), at most 2 tiles an action.
export const fleeTiles = row => row.flee + 1;

// The 2-frame step slot's shape check: both frames of an age non-empty means the step is drawn.
export const stepFrames = (art, juv) => { const e = art && art[juv ? 'juvenile' : 'adult']; return e && e[0] && e[1] ? e : null; };

// How far the veil lifts in a place (tiles): a Call's round, 4 in a fog bank, 6 with a glowing partner; walking lifts WALK_R, and on raised land WALK_R_HIGH (plain seeing: height lets you see further).
export const CALL_R_PLACE = 7;     // [tune]
export const CALL_R_FOG_PLACE = 4, CALL_R_FOG_GLOW = 6;
export const WALK_R = 4, WALK_R_HIGH = 6;   // [tune]
// The map's fog over places: night dots out of 16 on a cell you have never been into, and on one you have been into but not explored. An explored place is clear. [tune]
// Chosen at 1x on a lime meadow cell and a dark wood cell (6/3 greyed the land; 3/1 left not-been and been 11 luma apart on lime): 4/1 keeps lime olive-green and the three states about 22 luma apart.
export const FOG_NOT_BEEN = 0, FOG_BEEN = 2;   // night-dot levels of 16: never been into is drawn one step darker (the dark table) with no dots; been in, light dots

// ---------- W3: the carry table (G1's numbers as round 4 tested them; every number *greybox*, the designer's to tune) ----------
// What a step carries, in tiles: how far a wild one hears it. Cover takes a tile off (the ground row); never below 1 tile.
export const CARRY = Object.freeze({
  gait: Object.freeze({ creep: 2, walk: 4 }),
  ground: Object.freeze({ cover: -1, open: 1, plain: 0 }),    // tall grass and reeds: cover; open sand and shallow water: +1
  wind: Object.freeze({ down: -1, across: 0, up: 2 }),        // downwind: from it to you; upwind: from you to it
  rain: -1,
  fog: -2,                                                    // the Built fog: wild ones see 2 tiles less
  wary: Object.freeze({ calm: -1, steady: 0, wary: 1 }),      // the wild one's wariness, from its genes
  partner: Object.freeze({}),                                 // each kind's cost (not yet designed): 0 until the designer fills it
});
export const partnerCost = sp => CARRY.partner[sp] || 0;
// a wariness (the individual's doings.wary, 0 to 1) as its row of the table
export const wariness = w => (w >= .67 ? 'wary' : w < .34 ? 'calm' : 'steady');
export const wariness1 = w => CARRY.wary[wariness(w)];
// the wind blows toward one of four ways; the row is read off the angle between where it blows and the line from the wild one to the explorer
export const WIND_DIRS = Object.freeze(['N', 'E', 'S', 'W']);
export const WIND_VEC = Object.freeze({ N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] });
export const windRow = (dir, from, to) => {   // 'down' | 'across' | 'up' for a step at `to` heard by a wild one at `from`
  const vx = to.x - from.x, vy = to.y - from.y, m = Math.hypot(vx, vy); if (!m || !dir) return 'across';
  const w = WIND_VEC[dir], cos = (w[0] * vx + w[1] * vy) / m; return cos > .5 ? 'down' : cos < -.5 ? 'up' : 'across';
};
// ground: 'cover' | 'open' | 'plain'; returns { v: tiles, parts }
export function carryOf({ gait = 'creep', ground = 'plain', wind = 'across', rain = false, fog = false, wary = 0, partner = 0 } = {}) {
  const p = { gait: CARRY.gait[gait === 'walk' ? 'walk' : 'creep'], ground: CARRY.ground[ground] || 0, wind: CARRY.wind[wind] || 0, rain: rain ? CARRY.rain : 0, fog: fog ? CARRY.fog : 0, wary, partner };
  return { v: Math.max(1, p.gait + p.ground + p.wind + p.rain + p.fog + p.wary + p.partner), parts: p };
}
