// The bottom line's words and the top bar's titles (content): the ✓ and ← labels, the middle words each screen has of its own,
// the start pick, the map's middle part, a faced creature's diet. Lookups only.
// [copy] placeholders for the copywriter, all in these tables (a change of wording never touches code).
import { DEPOT_NAME } from "./field-words.mjs";
import { PRICE } from "./tuning.mjs";

const plural = n => n === 1 ? '' : 's';

// The ✓ labels.
export const LINE_OK = {
  openMibis: 'Open Mibis', lift: 'Lift to explore', broken: 'Probe broken', start: 'Start here', goIn: 'Go in', end: 'End expedition',
  waitAgain: 'Wait again', waitOne: 'Wait one action', open: label => 'Open ' + label, newWorld: 'New world', newWorldKeep: 'New world, keep mibis', keepWorld: 'Keep this world',
  patch: 'Patch shield · ' + PRICE.patch + ' Energy', patchConfirm: 'Confirm: patch, ' + PRICE.patch + ' Energy', next: 'Next expedition',
};

// The ← labels.
export const LINE_BACK = { menu: 'menu', back: 'back', close: 'close', field: 'field', end: 'End expedition', leave: 'Leave', climbOut: 'Climb out' };

// The middle of the line, where a screen has words of its own.
export const LINE_MID = {
  deep: 'Deep ground', weather: 'Weather', docked: 'docked', mendFree: 'dock: mended free', cave: 'cave', lull: ' · lull', overcast: ' · overcast', waiting: 'Waiting', sendShows: 'shows what it does',
  dockedLift: 'docked · lift to explore', probeBroken: 'the Probe is broken', kept: 'finds in the hold',
};

// The start pick: why a cell cannot be the start, how far the storm is from the cursor, and the top bar's note.
export const START_TEXT = {
  pickGlint: 'Pick a glint', unseen: 'Not seen yet', island: 'Out of reach', sealed: 'No stairs out · can’t start', cliff: 'Cliff · can’t start', water: 'Wide water · can’t start',
  stormIn: 'in the storm', stormBehind: 'storm moving away', stormActions: n => 'storm here in ' + n + ' action' + plural(n),
  noteFirst: 'pick a start', noteDeep: 'any seen cell', noteWeather: 'storm start',
};

// The map's line: a cell's land where its ground's name alone does not say it, the signs that say their own state, the edge you face and what lies beyond it,
// the two views over the map, the two control hints.
export const MAP_TEXT = {
  ford: 'ford', wade: 'muddy water', fastWater: 'fast water', wideWater: 'wide water', underCliff: ' under the cliff', byIsland: ' by the island',
  depotLit: n => DEPOT_NAME + ' · lit ' + n + ' turn' + plural(n), depotDark: DEPOT_NAME + ' (dark)', beaconLit: 'beacon (lit)', beaconUnlit: 'beacon (unlit)',
  narrow: 'burrow too narrow', caveNarrow: 'cave · burrow too narrow', toTake: n => n + ' to take',
  scree: 'loose scree', dugUp: 'dug way up', dugDown: 'dug way down', bank: 'earth bank', cliff: 'cliff', stairsUp: 'stairs up', stairsDown: 'stairs down',
  moreLand: 'more land', highCliffs: 'high cliffs', shore: 'shore', rangeEdge: 'edge of range', fog: 'fog', ahead: 'Ahead: ',
  beaconView: 'the land around the beacon', whole: 'the whole map',
  hintCall: 'CALL here drops a pin', hintPin: 'Your pin · ))) takes it away',
};

// A faced creature's diet; that it settles is added only in the long form.
export const DIET_TEXT = {
  unknown: 'Unknown creature · watch what it does', eats: ' · eats fruit', drinks: ' · drinks dew', neither: ' · doesn’t eat fruit',
  settles: ' · settles when you keep still', settlesFog: ' · settles in fog when you keep still',
};

// The top bar's titles.
export const TITLE_TEXT = { expedition: n => 'Expedition ' + n, menu: 'Menu', fullMap: 'Full map', turn: n => 'world turn ' + n };
