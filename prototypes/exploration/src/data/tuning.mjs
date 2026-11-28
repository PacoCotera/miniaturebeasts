// The field's numbers (data): what is carried, what a strike mark is worth, what the field charges, the storm's stray odds, warm stones, shedding; and the pod shell's colour by ground.
// Numbers only: the rules that read them are in logic.
export const BAY = 3;   // the sealed bay holds three consignments, one per expedition
export const CAP = 20;   // each material caps at 20 carried
// Data from a strike mark is fixed by the tier of the place it lies in: 2 / 3 / 4 / 5 (starter / early / mid / late); the hold (CAP) is the only limit on a trip.
// A place's tier follows its land (PLACE_TIER, by land): meadow and pond edge are starter places (1), wood and rock field mid places (3),
// the cave behind the burrow a late place (4, behind a gate); no land is an early place (2) yet.
export const STRIKE_DATA = [0, 2, 3, 4, 5], PLACE_TIER = [1, 1, 3, 3, 0, 0], CAVE_TIER = 4;
// What the field charges in Energy: an outpost and its mending, a beacon, a pin, a shield patch; and the Probe's tier 2 as the Probe screen quotes it (Energy and Data).
export const PRICE = { depot: 1, depotMend: 1, beacon: 1, tier2E: 12, tier2D: 4, patch: 3, pin: 1 };
export const SAFE_AFTER_HIT = 24;   // actions of quiet after a strike: more than a pass of rain lasts, so one hit a pass at most
export const STRAY = { strong: 1 / 20, peak: 1 / 10 };   // stray strike odds per action in the open
// Warm stones: at each world turn the sun warms a few of the stones lightning didn't strike (+1 each, never more): 6 to 8 in the Probe's reach,
// chosen when the expedition sets out, so a calm walk earns about 3 Energy.
export const WARM_MIN = 6, WARM_MAX = 8, WARM_NEAR = 0.25;   // the seeded pick leans toward cells near the start
// Shedding is rare unless the creature is special: a kind's shedP is a plain creature's chance at its moment; a creature fed or settled this expedition
// sheds at SHED_BOND; one of a species not yet known always does; at most SHED_MAX pods from creature moments an expedition (a returned line's pod is apart).
export const SHED_BOND = .5, SHED_MAX = 1;
// A pod's shell colour (a palette name) by the ground it came from.
export const POD_SHELL = { meadow: 'lime', pond: 'ice', rock: 'sand', wood: 'sprout', cave: 'lavender' };
