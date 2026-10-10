// The journey steps of L2.5 (Vivarium and the Probe bench), PENDING until its screens are on the LVGL face (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "L2.5 (Vivarium and the Probe bench)";
export const steps = [
  { id: "vivarium-pad", what: "the fixed pad: the stage, the species row, the chapter plates, Cross, the door row, the strip; ▲ from the door row is Cross; the Vivarium key puts the ring on the resident" },
  { id: "vivarium-card", what: "the door takes the resident with the Companion; a chapter plate reads a chapter at its price; the gate returns a mibi to the wild for +2 Essence (✓ twice), and a juvenile stays" },
  { id: "vivarium-meet", what: "after a hatch the meet view shows the new mibi with the ring on the door" },
  { id: "vivarium-trickle", what: "a resident watched on the Vivarium for the timer earns +1 Data once a day" },
  { id: "probe-bench", what: "the Probe bench opens on a target that has an action; the shield is mended or upgraded at its price" },
  { id: "sitting-first-screen", what: "the Sitting's first screen, when its spec lands" },
]
