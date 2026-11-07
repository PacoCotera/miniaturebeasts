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

// The 2-frame step slot's shape check: both frames of an age non-empty means the step is drawn.
export const stepFrames = (art, juv) => { const e = art && art[juv ? 'juvenile' : 'adult']; return e && e[0] && e[1] ? e : null; };
