// The playtest preset (plan row 3.13, GD L4b): ONE place for every wait cut so an outside tester finishes the whole loop (walk, carry home, read, grow, hatch, care, cross, out again with a
// partner) in about an hour. The play page's Options panel turns it on (options.mjs; both devices read it); the game's own defaults (state.mjs DEFAULT_SETTINGS, the Companion's constants)
// are untouched for normal play. Both devices read this file: the Station through game.mjs (loadSettings), the Companion through exploration/src/playtest.mjs.
//   settings   what the Station's developer settings become while the preset is on (in memory only; never written to the settings key)
//   careDayMs  the Companion's "care day": a Tend is once per care day (a real day in play), so the three Tends of a bond take two of these in a row
// A wait nobody can cut (an expedition itself, a Dock) is not here; Probe prices and the economy stay the game's own.
import { readOptions } from "./options.mjs";
export const PLAYTEST = Object.freeze({
  settings: Object.freeze({
    playtest: true,        // the Settings screen reads this to say the preset is on
    sittingWait: "minute", // the Sitting's wait: 3 hours in play, one minute
    budScale: 10,          // the Incubator's bud runs ten times as fast: the first bud 30 s (5 min), the later ones about 2 to 3 minutes (20 + n minutes)
    adultTurns: 1,         // juvenile to adult: one world turn (two in play); the Companion reads the same number
    elderTurns: 4,         // adult to elder: four world turns (sixteen in play); the Companion reads the same number
    watchMs: 5000,         // the bench's habit watch: 5 s (a minute in play)
    mockDelay: 5,          // the mock painter's delay: 5 s (20 s in play)
  }),
  careDayMs: 60000,        // a Tend is allowed once a minute (once a day in play)
});
// Is the preset on? It is the Playtest waits switch of the Options panel (options.mjs): `options` is an options object; with none it reads this browser's (no browser, as in a Node run: off).
export const playtestOn = (options) => (options ?? readOptions()).playtest === true;
// The settings object with the preset laid over it when it is on (a copy; `settings` itself is not changed).
export const withPlaytest = (settings, on = playtestOn()) => (on ? { ...settings, ...PLAYTEST.settings } : settings);
