// The journey steps of slot 7 (Cross with the splice), PENDING until its screens are on the LVGL face (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "slot 7 (Cross with the splice)";
export const steps = [
  { id: "cross-open", what: `✓ on the cross mark opens Cross on its overview: the pair, "a × b · species", the forecast of four seeds for each switch and a range for each blend; ✓ "Cross them" at 2 Energy 4 Essence` },
  { id: "cross-splice", what: "▼ opens the first chapter under the rail, ▲ goes back, ◀ ▶ keep the state; the first compare of a pair on the Cross earns +1 Data (the bench trickle), ▲ ▼ again earns nothing" },
  { id: "cross-siblings", what: "siblings at kinship a quarter: the notice says close kin and the forecast narrows" },
  { id: "cross-room-key", what: "a room key on Cross drops the unpaid choices; coming back starts fresh" },
]
