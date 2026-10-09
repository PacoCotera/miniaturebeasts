// Home's intents: the rule calls behind ✓ on the room, a resident, the bay, the rack, the incubator, the Probe cradle and the lamp.
import * as S from "../state.mjs";

export const ARRIVE_MS = 3000;
// The bay opens, one crate at a time: the rule opens every crate, the host plays an `arrival` per crate and holds input while they play; what came is the report that follows.
export function openBay(h) {
  const r = S.openBay(h.st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  h.ui.report = { plays: r.plays, at: h.now() + r.plays.length * ARRIVE_MS };
  h.lock(r.plays.length * ARRIVE_MS + 200);
  r.plays.forEach((p, i) => h.play({ kind: "arrival", target: "bay", ms: ARRIVE_MS, from: i * ARRIVE_MS }));
  h.save(); return r;
}
const toPods = (h) => { const p = S.neediestPod(h.st); if (p) h.ui.pods.cur = p.id; h.ui.pods.view = h.pods?.initial ?? "collection"; h.ui.pods.focus.set(null); h.goto("pods"); };
// The notice's own action, from ✓ on the room.
export function doNeed(h, nd) {
  if (nd.act === "bay") openBay(h);
  else if (nd.act === "inc") h.goto("incubator");
  else if (nd.act === "meet") { h.ui.hab.id = h.ui.meet; h.ui.hab.f = "stage"; h.ui.meet = null; h.goto("habitat"); }
  else if (nd.act === "pods") toPods(h);
  else if (nd.act === "hab") { h.ui.hab.id = nd.id; h.ui.hab.f = "heart"; h.goto("habitat"); }
}
// ✓ on a target of Home: room | r:<mibi id> | bay | tray | inc | cradle | lamp. `back` does nothing on Home (the top).
export function intent(h, target, verb) {
  if (verb === "back" || verb !== "confirm") return;
  const ui = h.ui, docked = S.docked(h.st);
  if (target === "room") doNeed(h, S.need(h.st, h.sv, h.settings, ui));
  else if (typeof target === "string" && target.startsWith("r:")) { ui.hab.id = +target.slice(2); ui.hab.f = "stage"; if (ui.meet === ui.hab.id) ui.meet = null; h.goto("habitat"); }
  else if (target === "bay") { if (docked && S.bayCrates(h.st, h.sv).length) openBay(h); else h.say(docked ? "The bay is empty" : "Dock the Companion to open its crates"); }
  else if (target === "tray") toPods(h);
  else if (target === "inc") h.goto("incubator");
  else if (target === "cradle") { ui.bench.f = 0; h.goto("bench"); }
  else if (target === "lamp") { ui.idle = true; ui.home.f = "room"; h.play({ kind: "rest", target: "lamp", ms: 0 }); }
}
