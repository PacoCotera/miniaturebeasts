// The journey steps of slot P (the Probe bench), PENDING until its screens are on the LVGL face (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "P (the Probe bench)";
export const steps = [
  { id: "probe-bench", what: "the Probe bench opens on a target that has an action; the shield is mended or upgraded at its price" },
]
