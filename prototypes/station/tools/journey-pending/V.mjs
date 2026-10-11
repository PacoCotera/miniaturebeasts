// The journey steps of slot V (the Vivarium, whole and up close), PENDING until its screens are on the LVGL face (vivarium-pad and vivarium-whole moved to journey.mjs with the whole, V1; the card, the meet and the trickle are slot V's second PR) (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "V (the Vivarium, whole and up close)";
export const steps = [
  { id: "vivarium-card", what: "the door takes the resident with the Companion; a chapter plate reads a chapter at its price; the gate returns a mibi to the wild for +2 Essence (✓ twice), and a juvenile stays" },
  { id: "vivarium-meet", what: "after a hatch the meet view shows the new mibi with the ring on the door" },
  { id: "vivarium-trickle", what: "a resident watched on the Vivarium for the timer earns +1 Data once a day" },
]
