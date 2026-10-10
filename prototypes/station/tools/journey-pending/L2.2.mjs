// The journey steps of L2.2 (Home, Rest, Dock and arrival, Idle), PENDING until its screens are on the LVGL face (lvgl-switch.md §4). They ran on the JavaScript face until B4a-2 (see tools/journey.mjs in git before that PR, steps named below);
// until then the rules behind them are driven through the screens' intents in journey.mjs, and the screens say that they are not built yet. Each is a step to re-point at the face by keys and intents when its screen lands.
export const milestone = "L2.2 (Home, Rest, Dock and arrival, Idle)";
export const steps = [
  { id: "home-pad", what: "▶ from the room is the bay; ▼ walks the column Bay, Rack, Incubator, Cradle, Lamp; the Home key on Home puts the ring back on the room; ← on Home does nothing: no plate, no cap" },
  { id: "home-rack", what: "✓ on the rack opens the collection with the ring on the pod that most needs the player; ← from the collection is Home" },
  { id: "home-bay", what: "✓ on the bay opens its crates one at a time, an arrival each with input held; an empty or closed bay says why in the plate" },
  { id: "home-dock-arrival", what: "the Dock key docks while Home plays the crates sliding in; the counters and the turn count up with the arrival, the notice names the crates" },
  { id: "home-lamp", what: "✓ on the lamp rests the screen: Idle plays the Vivarium alone; the first press wakes and does nothing else" },
  { id: "idle-vivarium", what: "Idle is the whole 1024×600 with the idle line (frame.json idle): residents walk, nap and look about; the Dock key on Idle wakes and acts" },
]
