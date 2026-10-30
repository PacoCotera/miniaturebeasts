// Home's intents (home.json: the keys, the line): the rule calls behind ✓ on the room (the first need in the line), on a bezel and on a station, and the rest. The pad is the face's (focus.graph); ← does nothing on Home.
import * as S from "../state.mjs";
import { openBay } from "./cargo.mjs";
import { homeNeeds, librarySpecies } from "../views/home-props.mjs";
import { intent as incubatorIntent } from "./incubator.mjs";
import { openAt } from "./library.mjs";

export const toPods = (h, id = null) => { const p = id != null && S.podById(h.st, id) ? S.podById(h.st, id) : S.neediestPod(h.st); if (p) h.ui.pods.cur = p.id; h.ui.pods.view = "collection"; h.ui.pods.focus.set(null); h.goto("pods"); };
const toVivarium = (h, id) => { const ui = h.ui; if (id != null && S.mibiById(h.st, id)) ui.hab.id = id; ui.hab.f = "resident"; h.goto("habitat"); };   // the ring on the resident; a new mibi opens in its meet (ui.meet), ended by the first press there
const toLibrary = (h) => openAt(h, librarySpecies(h.st, h.settings));   // Level 1 with the ring on Home's species: the one its Library module is for
// The room's ✓: what needs the player (the notice's own action).
export function doNeed(h, nd) {
  if (!nd) return;
  if (nd.act === "cargo") { h.goto("cargo"); if (nd.key === "crates") openBay(h); }   // the crates need: ✓ Open the bay goes through Cargo on the same key (decision panel spec, cut 1)
  else if (nd.act === "incubator") { h.goto("incubator"); if (nd.key === "budReady") incubatorIntent(h, "room", "confirm"); }   // the bud-ready need: ✓ Open the bud, the hatch on the same key (cut 2); a growing bud only looks
  else if (nd.act === "meet") { toVivarium(h, h.ui.meet); }
  else if (nd.act === "pods") toPods(h);
  else if (nd.act === "vivarium") { h.goto("vivarium"); const first = S.inRoom(h.st, h.st.face?.room ?? 0)[0]; h.ui.viv.f = nd.ring === "room.new" ? "room.new" : first ? "resident." + first.id : null; }   // the full need: ✓ Add a room puts the ring on the new-room chip, ✓ Make room on the first resident of the room shown (home.json strings.needs.full)
}
// ✓ on a target of Home: room | vivarium | library | pods | incubator | companion | bay. A bezel opens full screen, a station opens its room; the Companion opens the Probe bench while docked and does nothing away (the line says it is on a trip).
// `back` does nothing on Home (the top).
export function intent(h, target, verb) {
  if (verb !== "confirm") return;
  const ui = h.ui;
  if (target === "room") doNeed(h, homeNeeds(h.st, h.sv, h.settings, ui, h.now())[0]);   // at rest ✓ does the first need in the line, and nothing when there is none
  else if (target === "vivarium") h.goto("vivarium");   // the Vivarium's whole: the ring on the mibi last seen up close, its resident else its tile (vivarium.json focus.entry.homePanel)
  else if (target === "library") toLibrary(h);
  else if (target === "pods") toPods(h);
  else if (target === "incubator") h.goto("incubator");
  else if (target === "companion") { if (S.docked(h.st)) { ui.bench.f = null; h.goto("bench"); } }
  else if (target === "bay") h.goto("cargo");
}
// The Home room key pressed at rest: the Station rests (events.rest: the ring is already gone, then the 180 ms dither to Idle, which holds 380); with reduced motion it is a cut and Idle shows on the frame of the key.
export function rest(h) {
  const ui = h.ui, ev = h.specs.home.events.rest, step = ev.steps[1];
  h.pendingRoom = null;   // a room key kept during an earlier wake never fires at the end of this rest
  if (h.motion ? h.motion() : true) {
    ui.resting = true; h.play({ kind: "rest", target: ev.target, ms: ev.ms, hold: ev.hold });
    h.at(step.at, () => h.play({ kind: "dither", target: "stage", ms: step.ms, from: 0, to: 16 }));
    h.at(ev.hold, () => { ui.resting = false; ui.idle = true; h.pendingRoom = null; });   // Idle: where the first press only wakes; a room key pressed in the hold was dropped (events.rest.keys)
  } else ui.idle = true;
}
