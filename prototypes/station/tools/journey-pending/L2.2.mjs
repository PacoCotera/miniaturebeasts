// The journey steps of slot L2.2 that are still PENDING (lvgl-switch.md §4): Idle's. Home's steps (home-pad, home-rack, home-dock-arrival, home-lamp) moved into the journey on the face with the Home PR, and Cargo's (home-bay) with the Cargo PR;
// they are held to prototypes/face/golden/journey-home.json. The step below is written against frame.json `idle`, and is re-pointed at the face by keys and intents when its screen lands.
export const milestone = "L2.2 Idle (frame.json idle)";
export const steps = [
  { id: "idle-vivarium", what: "Idle is the whole 1024×600 with the idle line (frame.json idle): the Vivarium's whole without the frame, its residents walking and the bed's sleepers (idle-docked, idle-away, idle-none); the rest knob and the 60 s timer enter it; the first press only wakes (`wake`); the Dock key on Idle wakes, docks and lands on Home with the ring on the room, the crates sliding into the Cargo module" },
]
