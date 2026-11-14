// Settings' intents (settings.json keys): ← goes Home with the ring on the Settings knob. ✓ does nothing on any row yet: the plates that Put this realm to sleep opens come with the sleep's own screens.
// The pad is the face's (focus.graph); the host keeps the ring (`focus`).

// The ring moved to a row (the face says `realm`, `companion`, `sleeping` or `sleep`): Settings keeps it.
export function focus(h, target) { h.ui.settings.f = target; }

// `target`: realm | companion | sleeping | sleep.
export function intent(h, target, verb) {
  if (verb === "back") { h.ui.home.f = "settings"; h.goto("home"); return; }
}
