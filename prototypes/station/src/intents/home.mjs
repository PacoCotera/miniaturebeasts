// Home's intents (home.json: the keys, the line): the rule calls behind ✓ on the room, the Vivarium, a resident, a module of the column and the rest knob. The pad is the face's (focus.graph); ← does nothing on Home.
import * as S from "../state.mjs";
import { needOf } from "../views/home-props.mjs";

export const ARRIVE_MS = 3000;
// The bay opens, one crate at a time: the rule opens every crate, the host plays an `arrival` per crate and holds input while they play; what came is the report that follows. Cargo's (cargo.json, L2.2's second PR).
export function openBay(h) {
  const r = S.openBay(h.st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  h.ui.report = { plays: r.plays, at: h.now() + r.plays.length * ARRIVE_MS };
  h.lock(r.plays.length * ARRIVE_MS + 200);
  r.plays.forEach((p, i) => h.play({ kind: "arrival", target: "bay", ms: ARRIVE_MS, from: i * ARRIVE_MS }));
  h.save(); return r;
}
const toPods = (h) => { const p = S.neediestPod(h.st); if (p) h.ui.pods.cur = p.id; h.ui.pods.view = "collection"; h.ui.pods.focus.set(null); h.goto("pods"); };
const toVivarium = (h, id) => { const ui = h.ui; if (id != null && S.mibiById(h.st, id)) ui.hab.id = id; ui.hab.f = "stage"; if (ui.meet === ui.hab.id) ui.meet = null; h.goto("habitat"); };
const toLibrary = (h) => { const l = h.ui.lib; if (l.page == null) { l.page = 0; l.i = 0; } l.f = "spread"; h.goto("library"); };
// The room's ✓: what needs the player (the notice's own action).
export function doNeed(h, nd) {
  if (!nd) return;
  if (nd.act === "cargo") h.goto("cargo");
  else if (nd.act === "incubator") h.goto("incubator");
  else if (nd.act === "meet") { toVivarium(h, h.ui.meet); }
  else if (nd.act === "pods") toPods(h);
}
// ✓ on a target of Home: room | vivarium | resident.<mibi id> | cargo | pods | incubator | probe | library | knob. `back` does nothing on Home (the top).
export function intent(h, target, verb) {
  if (verb !== "confirm") return;
  const ui = h.ui;
  if (target === "room") doNeed(h, needOf({ st: h.st, sv: h.sv, settings: h.settings, docked: S.docked(h.st), ui }, h.specs.home));
  else if (target === "vivarium") toVivarium(h, ui.hab.id ?? S.homeMibis(h.st, h.sv)[0]?.id ?? null);
  else if (typeof target === "string" && target.startsWith("resident.")) toVivarium(h, +target.slice(9));
  else if (target === "cargo") h.goto("cargo");
  else if (target === "pods") toPods(h);
  else if (target === "incubator") h.goto("incubator");
  else if (target === "probe") { ui.bench.f = 0; h.goto("bench"); }
  else if (target === "library") toLibrary(h);
  else if (target === "knob") {   // the rest: the knob settles, the screen dithers to Idle over the hold; with reduced motion the event is a cut to its end and Idle comes on the frame of the key
    if (h.motion ? h.motion() : true) h.play({ kind: "rest", target: "knob", ms: h.specs.home.events.rest.hold, hold: true }); else ui.idle = true;
  }
}
