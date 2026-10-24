// The Station's navigation, as plain data and pure functions (design/style-guide/station-screens.md "Keys and navigation"; the numbers are frame.json `navigation`).
// Nothing here draws or reads the live game: the screens ask it where ← goes and what it is called and what each room key opens. The pads are the face's: each screen's `focus` graph is data in its spec.

// --- the tree -------------------------------------------------------------------------------------------------------------------
// A place is a screen or a state of one: home, pods.collection, pods.overview, pods.chapter, pods.compare, create, incubator, probe, library, library.species, vivarium, habitat, cross.
// The live screen id for the Probe bench is "bench"; Idle is a state of the screen, not a place.
export const SCREEN_PLACE = { bench: "probe" };
export function placeOf({ screen, podsView, compare }) {
  if (screen === "pods") return compare ? "pods.compare" : "pods." + (podsView || "collection");
  return SCREEN_PLACE[screen] || screen;
}
export const parentOf = (nav, place) => nav.screens[place]?.parent ?? null;
// The word the way back carries (the parent's title), or null where there is none: Home has no way back. `label` is the pod's label ("Loika") for "{pod}", the mibi's name for "{name}" or the species' name for "{Species}";
// a name wider than the way back's room reads "Back" (the caller measures; `fits` says whether it does).
export function backWord(nav, place, label = "", fits = () => true) {
  const w = nav.screens[place]?.back; if (w == null) return null;
  if (w !== "{pod}" && w !== "{name}" && w !== "{Species}") return w;
  return label && fits(label) ? label : "Back";
}
// Up one level is the parent, never the history: after a jump the parent is still the parent in this tree.
export const upFrom = (nav, place) => parentOf(nav, place);

// --- the doors -------------------------------------------------------------------------------------------------------------------
// The screens the face draws with words. Every other screen is drawn by the face's notBuilt composition (a developer jump and the journey's not-built steps reach it; no target in play does).
export const BUILT = ["home", "cargo", "pods", "create", "incubator", "vivarium", "habitat", "library", "library.species", "bench", "sitting"];
export const isBuilt = (screen) => BUILT.includes(screen);
// A door is open when the screen it leads to is built: cross and sitting open when listed in BUILT. A shut door is shut in place (no ✓ cap, its screen's shut line).
const DOOR_SCREEN = { cross: "cross", sitting: "sitting" };
export const doorOpen = (id) => !!DOOR_SCREEN[id] && isBuilt(DOOR_SCREEN[id]);

// --- the room keys -----------------------------------------------------------------------------------------------------------------
// Each opens the top of its room from anywhere, even from inside it. `leaving` lists the places whose unpaid choices a room key drops.
export const ROOM_KEYS = { home: "home", research: "pods.collection", library: "library.all", habitat: "vivarium" };   // each is the room key's screen and state in frame.json navigation.roomKeys
export const DROPS_ON_ROOM_KEY = ["create", "cross", "sitting"];
export const roomTop = (key) => ROOM_KEYS[key] || null;

// Home's pad is the face's: focus.graph in home.json (order, nearestIn, ahead), walked by the face's focus port; the vectors are in face/tests (focus.json).
