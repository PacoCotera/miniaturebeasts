// The Companion's kinds (logic), by the game's species index (regions.mjs SP_ORDER): how each lives in the field, what a partner of it can do, its words and its colours.
//   notice [creep, walk]: tiles at which the kind notices you; how: the shed trigger; ab: what a partner of this kind can do.
// The walking fields (drinks, settle, shed, wander, and a newer kind's notice, flee, eats, shedP, how) are src/walk-data.mjs's rows.
import { ROSTER } from "../world.mjs";
import { KIND_INFO } from "../regions.mjs";
import { BUILT, walkRow } from "../walk-data.mjs";

// What a partner of a newer kind can do, for the kinds that have an ability yet: Rupar digs earth banks, Tuliko crosses mud and scree and walks farther.
// The other newer kinds' abilities wait for the game designer, so no line about one is shown (ab, abText null).
const NEWER_AB = {
  7: { ab: 'bank', abText: 'digs a way up or down earth banks', abCard: 'digs up or down banks' },
  19: { ab: 'sure', abText: 'crosses mud and scree; reaches one ring further', abCard: 'mud and scree · one ring further', abCardShort: 'one ring further' },
};
export const SPECIES = [
  { name: 'Loika', plural: 'Loikas', hab: ROSTER[0].hab, notice: [2, 5], flee: 2, eats: true, shedP: .1, how: 'shake',
    ab: 'calm', abText: 'calms wary creatures', born: 'a long-eared Loika', learn: 'Loikas sometimes shed when they shake dry, more often for someone they trust.',
    col: { body: 'lilac', light: 'lavender', shade: 'plum', dark: 'plumD' }, ...BUILT[0] },
  { name: 'Tuikis', plural: 'Tuikis', hab: ROSTER[1].hab, notice: [2, 4], flee: 2, eats: false, shedP: .1, how: 'calm',
    ab: 'dig', abText: 'digs out narrow burrows', abCard: 'digs out burrows', born: 'a small burrower', learn: 'Tuikis sometimes shed when they feel safe by their burrow, more often for someone they trust.', learnCurl: 'Tuikis sometimes shed when they curl up out of the rain, more often for someone they trust.',
    col: { body: 'aqua', light: 'mint', shade: 'teal', dark: 'tealD' }, ...BUILT[1] },
  { name: 'Untuva', plural: 'Untuvas', hab: ROSTER[2].hab, notice: [1, 3], flee: 1, eats: true, shedP: .1, how: 'meal',
    ab: 'nose', abText: 'sniffs out buried pods', born: 'a round Untuva', learn: 'Untuvas sometimes shed after a full meal, more often for someone they trust.',
    col: { body: 'coral', light: 'peach', shade: 'red', dark: 'wine' }, ...BUILT[2] },
  // The seventeen newer kinds: name and plural from the language frame, ground from the family, the walk row, plain colours until the Companion has its own art for them.
  ...KIND_INFO.slice(3).map((k, i) => ({ name: k.name, plural: k.plural, hab: k.hab, ...walkRow(i + 3),
    ab: null, abText: null, born: null, learn: null, col: { body: 'bone', light: 'bone', shade: 'bone', dark: 'bone' }, ...NEWER_AB[i + 3] })),
];
// A species the Companion has no entry for (the Station's sp -1): no habitat, no diet, no ability, no art.
export const SP_OTHER = Object.freeze({ other: true, name: null, plural: null, hab: [], notice: [2, 4], flee: 2, eats: false, shedP: 0, how: null, drinks: false, settle: null, shed: null, wander: .4,
  ab: null, abText: null, born: null, learn: null, col: null });
// The one lookup into SPECIES: any other value is SP_OTHER.
export const spOf = sp => (Number.isInteger(sp) && sp >= 0 && sp < SPECIES.length ? SPECIES[sp] : SP_OTHER);
