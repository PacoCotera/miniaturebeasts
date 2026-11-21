// The first-load wait's measure (ui-play-layout-1, option A): ten pips on the Companion's own screen that fill as REAL steps finish: the realm worker's stages, then the art and place files the loaders count.
// Never a timed or looping fake. Pure (no DOM), so it is unit-tested (tests/waitpips.test.mjs).
export const PIPS = 10, REALM_SHARE = 0.6;   // the realm's share of the wait; the files' share is the rest (measure the split on the first build)

const part = (done, of) => (of > 0 ? Math.max(0, Math.min(1, done / of)) : 0);
// waitPips(realmDone, realmOf, filesDone, filesOf) -> 0..10 pips lit. A step count of 0 owed is no progress yet (the caller passes 1 of 1 for a part that is not being made, e.g. a realm already in the generator's cache).
// fracPips(done, of): the pips for a wait that is one measured thing (the reach's places being made): 0 when nothing is done, never more than PIPS - 1 while the wait is on (the screen goes away when it is over, so the bar is
// never full before the land is ready), and never a guess: an `of` of 0 owed is no progress.
export const fracPips = (done, of) => Math.min(PIPS - 1, Math.floor(part(done, of) * PIPS + 1e-9));
export function waitPips(realmDone, realmOf, filesDone, filesOf) {
  const f = REALM_SHARE * part(realmDone, realmOf) + (1 - REALM_SHARE) * part(filesDone, filesOf);
  return Math.min(PIPS, Math.floor(f * PIPS + 1e-9));
}
