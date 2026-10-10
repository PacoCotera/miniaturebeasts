// The journey steps of slot 9 (The Sitting), PENDING until its screens are on the LVGL face (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "slot 9 (The Sitting)";
export const steps = [
  { id: "sitting-first-screen", what: "the Sitting's first screen, when its spec lands" },
]
