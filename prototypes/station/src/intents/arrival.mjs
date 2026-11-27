// The Companion's dock at the Station (cargo.json; bay-design-1 design.md 2.2): the crates cross (the rule, state.mjs dockKey) and the Bay shows them, the first on the table and up to two on the ledge, over the screen the player is on.
//   h.ui.cargo.arrival: { crates, shown, newCrates, plates, broke, back, leaving, habits } (arrival.mjs arrivalOf); h.ui.cargo.state stays "bay".
// An empty trip says "Nothing came back" and stays where it is. Docked mid-decision (a decision panel, the namer, Create or Cross open) the Bay waits for the player's next screen change: the plate says so for 2000 ms.
import * as S from "../state.mjs";
import { arrivalOf } from "../arrival.mjs";

// The screens whose open work the arrival never interrupts (frame.json navigation.dock): Home and Cargo are in `stays` for navigation only.
export function interrupted(h) {
  const ui = h.ui, d = h.specs.frame.navigation.dock;
  if (ui.panel || (d.namerStays && ui.screen === "habitat" && ui.hab?.namer)) return true;
  const open = { create: !!ui.create, cross: !!ui.cross, sitting: true };
  return d.stays.some((s) => s !== "home" && s !== "cargo" && s === ui.screen && open[s]);
}

// Shows the Bay over the screen the player is on (or, from Idle, over Home): the crates and the Probe are the rules' (the dock already ran), this only goes to them.
export function startShow(h, r, over) {
  const c = h.ui.cargo, a = { ...arrivalOf(h.st, h.sv, r), from: over };
  c.arrival = a; c.state = "bay"; c.open = false; c.sum = null; c.portrait = null;
  if (!a.crates) { h.say(h.specs.cargo.strings.empty, 2500); habitPlates(h, a); return true; }   // an empty trip, or the Probe broke: the Companion's line says it, nothing is shown
  if (h.ui.screen !== "cargo") h.goto("cargo");   // the dither, 180 ms; on Cargo itself no transition
  habitPlates(h, a);
  return true;
}

// The field habits the Companion's mibis did on the walk: once, after the show, the home watch's own plate ("{name} is seen {habit}"), no new words. At most two at a time.
export function habitPlates(h, a) {
  if (!(a.habits || []).length) return;
  const hs = h.specs.habitat.strings, lines = [];
  for (const q of (a.habits || []).slice(0, 2)) { const m = S.mibiById(h.st, q.id), habit = hs.watchHabits[q.habit]; if (m && habit) lines.push(hs.watchPlate.replace("{name}", m.name).replace("{habit}", habit)); }
  a.habits = []; if (lines.length) h.say(lines.join("\n"));
}

// The arrival is over without going anywhere (a room key, a screen change): Cargo is as it was.
export function endArrival(h) { h.ui.cargo.arrival = null; }
export function later(h) { endArrival(h); }

// The dock while docked: the Bay now, or waits for the player's next screen change when they are mid-decision (the plate says so for 2000 ms).
export function arrive(h, r, fromIdle) {
  if (fromIdle) { h.ui.home.f = "room"; if (h.ui.screen !== "home") h.goto("home"); }
  if (interrupted(h)) { h.ui.pendingArrival = r; h.say(h.specs.cargo.strings.ribbon, 2000); return false; }
  h.ui.pendingArrival = null;
  return startShow(h, r, h.ui.screen);
}
// The player's next screen change shows a waiting arrival over the screen they arrive on.
export function arrivePending(h) {
  const r = h.ui.pendingArrival; if (!r || interrupted(h)) return false;
  h.ui.pendingArrival = null; return startShow(h, r, h.ui.screen);
}
