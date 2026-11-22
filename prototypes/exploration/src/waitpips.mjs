// The first-load wait's measure (ui-play-layout-1, option A): ten pips on the Companion's own screen that fill as REAL steps finish: the realm worker's stages, then the art and place files the loaders count.
// Never a timed or looping fake. Pure (no DOM), so it is unit-tested (tests/waitpips.test.mjs).
export const PIPS = 10, REALM_SHARE = 0.6;   // the realm's share of the wait; the files' share is the rest (measure the split on the first build)

const part = (done, of) => (of > 0 ? Math.max(0, Math.min(1, done / of)) : 0);
// waitPips(realmDone, realmOf, filesDone, filesOf) -> 0..10 pips lit. A step count of 0 owed is no progress yet (the caller passes 1 of 1 for a part that is not being made, e.g. a realm already in the generator's cache).
// fracPips(done, of): the pips for a wait that is one measured thing (the reach's places being made): 0 when nothing is done, never more than PIPS - 1 while the wait is on (the screen goes away when it is over, so the bar is
// never full before the land is ready), and never a guess: an `of` of 0 owed is no progress.
export const fracPips = (done, of) => Math.min(PIPS - 1, Math.floor(part(done, of) * PIPS + 1e-9));
// A place wait starting on RT (#104): a new wait starts empty, but a wait that comes while a set-out's wait is still on (the first pods asking for a few more places) goes on under the set-out's count, so the pips
// never go back to 0 and the count of one cell never takes over from the nine of the reach.
export function startPlaceWait(RT, wait, now) {
  if (RT.making && RT.placeWait) return false;   // inside a wait that is on: its pips go on
  RT.making = true; RT.makingAt = now; RT.wait = null; RT.pips = 0; RT.placeWait = wait;
  return true;
}
// A place is made in BAKE_STAGES real stages in the worker: the terrain window's WINDOW_STAGES (place.mjs windowOf's own labelled stages), its IR, its bake. The worker tells each (op 'stage') as it finishes and the pips
// count them (#104: the first place took ~8 s of a 12 s wait and told nothing). The first place of a wait does the one-time work (the seed's terrain context, land and decor), the rest are cached after it: it is
// FIRST_SHARE of the bar when there are others (measured, seed 45 set out at 5,14: ~8 s of 12.4 s; a later build may re-measure), the whole bar when it is the only place.
// placeWaitPips(stages, laid, laying): stages = the stages done of each cell asked, in the order asked (0..BAKE_STAGES), laid = cells laid out, laying = the wait also lays each out.
export const WINDOW_STAGES = 15, BAKE_STAGES = WINDOW_STAGES + 2, FIRST_SHARE = 0.6;
export function placeWaitPips(stages, laid, laying) {
  const n = stages.length, frac = s => Math.min(BAKE_STAGES, s) / BAKE_STAGES, first = frac(stages[0] || 0);
  if (n <= 1) return fracPips((first + laid) / (laying ? 2 : 1), 1);
  const rest = (stages.slice(1).reduce((a, s) => a + frac(s), 0) + laid) / ((n - 1) + (laying ? n : 0));
  return fracPips(FIRST_SHARE * first + (1 - FIRST_SHARE) * rest, 1);
}
export function waitPips(realmDone, realmOf, filesDone, filesOf) {
  const f = REALM_SHARE * part(realmDone, realmOf) + (1 - REALM_SHARE) * part(filesDone, filesOf);
  return Math.min(PIPS, Math.floor(f * PIPS + 1e-9));
}
