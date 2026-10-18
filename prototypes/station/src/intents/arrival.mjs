// The Companion's dock as a show on the bay, then one choice (specs/station-dock-arrival-spec.md, T-20261016-48, amended T-67 and T-112; cargo.json regions.arrival, events.show; panel.json strings.dock, form strip).
//   h.ui.cargo.arrival: { from, phase: "show" | "choice", crates, shown, newCrates, plates, broke, back, leaving, choice }; h.ui.cargo.state is "arrival" while it stands.
// The show is 3500 ms from the dock, any key skips it to the choice; Open the bay runs today's opening, Later dithers back to the screen the arrival came over. An empty trip and a broken Probe have no choice and close by themselves at 2500.
// Docked mid-decision (a decision panel, the namer, Create or Cross open) the arrival waits: the plate says so for 2000 ms and the show plays after the player's next screen change.
import { arrivalOf } from "../arrival.mjs";
import { openPanel } from "./panel.mjs";
import { openBay } from "./cargo.mjs";

// The screens whose open work the arrival never interrupts (frame.json navigation.dock): Home and Cargo are in `stays` for navigation only.
export function interrupted(h) {
  const ui = h.ui, d = h.specs.frame.navigation.dock;
  if (ui.panel || (d.namerStays && ui.screen === "habitat" && ui.hab?.namer)) return true;
  const open = { create: !!ui.create, cross: !!ui.cross, sitting: true };
  return d.stays.some((s) => s !== "home" && s !== "cargo" && s === ui.screen && open[s]);
}

// The beats' times, from the spec (cargo.json events.show and regions.arrival), in ms from the dock.
export function timesOf(spec, a) {
  const A = spec.regions.arrival, ev = spec.events.show, M = A.mibis;
  const choice = a.crates > 0, end = choice ? A.end.at : A.autoClose.at;
  const beats = [200, A.crates.at, A.band.probe.from, A.band.probe.mend.at];
  for (let i = 0; i < a.shown; i++) beats.push(A.crates.at + A.crates.stagger * i, A.crates.at + A.crates.stagger * i + A.crates.ms);
  for (let i = 0; i < Math.min(a.back.length, 3); i++) beats.push(M.at + M.each * i, M.at + M.each * i + M.dither.ms, M.at + M.each * i + M.dither.ms + M.hop.ms);
  for (let k = 0; k < a.plates.mended; k++) beats.push(A.band.probe.mend.at + A.band.probe.mend.each * k);
  for (let k = 0; k < 4; k++) beats.push(A.light.at + A.light.each * k);
  return { end, ms: end, hold: end, beats: [...new Set(beats)].filter((t) => t < end).sort((x, y) => x - y), skip: ev.skip === true };
}

// Starts the show over the screen the player is on (or, from Idle, over Home). The crates and the Probe are the rules' (the dock already ran): this only draws them.
export function startShow(h, r, over) {
  const c = h.ui.cargo; if (c.state === "opening" || c.state === "report") return false;   // the opening's own hold keeps the Dock, the report card stands until closed
  const a = { ...arrivalOf(h.st, h.sv, r), from: over, phase: "show" }; a.choice = a.crates > 0;
  c.arrival = a; c.state = "arrival"; c.at = 0; c.run = null; c.drawn = null;
  if (h.ui.screen !== "cargo") h.goto("cargo");   // the dither, 180 ms; on Cargo itself no transition
  const T = timesOf(h.specs.cargo, a), motion = h.motion ? h.motion() : true;
  if (motion) {
    h.play({ kind: "arrival", target: "show", ms: T.ms, hold: T.hold, skip: true });
    h.at(T.end, () => finish(h), true);   // ✓ Skip runs it at once
  } else {   // reduced motion: each beat is a cut on its time, the host's stage; keys reach Cargo, which skips (intent below)
    for (const t of T.beats) h.at(t, () => { if (c.state === "arrival" && c.arrival === a && a.phase === "show") c.at = t; });
    h.at(T.end, () => finish(h));
  }
  return true;
}

// The show's end: with a choice, one cut to the rack and the strip; without one (an empty trip, a broken Probe) the arrival dithers back by itself.
export function finish(h) {
  const c = h.ui.cargo, a = c.arrival; if (!a || c.state !== "arrival" || a.phase !== "show") return;
  if (!a.choice) { later(h); return; }
  a.phase = "choice"; c.at = h.specs.cargo.regions.arrival.end.at;
  openPanel(h, "cargo", "dock");
}
// Any key during the show (reduced motion, or after the face's hold ended): the show cuts to its end.
export function skipShow(h) { const a = h.ui.cargo.arrival; if (a && a.phase === "show") finish(h); }

// The arrival is over without going anywhere (a room key, a screen change): Cargo is as it was.
export function endArrival(h) {
  const c = h.ui.cargo; if (c.state === "arrival") { c.state = "bay"; c.arrival = null; c.at = 0; } if (h.ui.panel?.id === "dock") h.ui.panel = null;
}
// Later: back to the screen the arrival came over, as it was (a dither); on Cargo itself the bay shows as a cut.
export function later(h) {
  const a = h.ui.cargo.arrival, from = a ? a.from : "home"; endArrival(h);
  if (h.ui.screen !== from) h.goto(from);
}
// Open the bay: the strip goes (a cut) and today's opening runs, its report after it.
export function openFromArrival(h) { endArrival(h); return openBay(h); }

// The dock while docked: the arrival now, or waits for the player's next screen change when they are mid-decision (the plate says so for 2000 ms).
export function arrive(h, r, fromIdle) {
  if (fromIdle) { h.ui.home.f = "room"; if (h.ui.screen !== "home") h.goto("home"); }
  if (interrupted(h)) { h.ui.pendingArrival = r; h.say(h.specs.cargo.strings.arrival.ribbon, 2000); return false; }
  h.ui.pendingArrival = null;
  return startShow(h, r, h.ui.screen);
}
// The player's next screen change plays a waiting arrival over the screen they arrive on.
export function arrivePending(h) {
  const r = h.ui.pendingArrival; if (!r || interrupted(h)) return false;
  h.ui.pendingArrival = null; return startShow(h, r, h.ui.screen);
}
