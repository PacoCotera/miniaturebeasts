// The intents of every screen (see README.md): the rule call behind a key on a focused target, DOM-free, for the page's host and the Node host.
import * as frame from "./frame.mjs";
import * as home from "./home.mjs";
import * as cargo from "./cargo.mjs";
import * as incubator from "./incubator.mjs";
import * as library from "./library.mjs";
import * as habitat from "./habitat.mjs";
import * as namer from "./namer.mjs";
import * as vivarium from "./vivarium.mjs";
import * as create from "./create.mjs";
import * as pods from "./pods.mjs";
import * as bench from "./bench.mjs";
import * as panel from "./panel.mjs";
import * as sitting from "./sitting.mjs";
import * as settings from "./settings.mjs";
import * as cross from "./cross.mjs";

export const INTENTS = { frame, home, cargo, incubator, library, "library.species": library.species, "library.family": library.family, habitat, namer, vivarium, create, pods, bench, panel, sitting, settings, cross };
// A face intent { screen, target, verb } (all that is on the wire) to its screen's function; the frame's verbs (the room keys and the wake) are the same on every screen. The Dock key is not a face verb: the host calls frame.dock(h).
export function dispatch(h, { screen, target, verb }) {
  if (h.ui.answer) {   // Call's answer: ← puts it away and does nothing else; ✓ or a colour key puts it away and then acts as usual (the pad's moves and steps leave it on)
    if (verb === "back") { h.ui.answer = false; return true; }
    if (verb === "confirm" || (verb && verb.startsWith("room:"))) h.ui.answer = false;
  }
  const c = h.ui.carry;   // a carry (carry.mjs) lasts while the player is on the screen it landed on: ← there goes back to where it started; ✓ and any room key end it (a room key sets its own)
  if (c) {
    if (h.ui.screen !== c.to) h.ui.carry = null;
    else if (verb === "back" && !h.ui.panel && !h.ui.hab?.namer) return frame.uncarry(h);
    else if (verb === "confirm") h.ui.carry = null;
  }
  if (verb && (verb.startsWith("room:") || verb === "wake")) return frame.intent(h, target, verb);
  const m = INTENTS[screen]; return m ? m.intent(h, target, verb) : undefined;
}
// The hold ring is full (the face's `confirm:held`): what a held ✓ was asking for, on the screen the ring was on: a panel's Return card, else Pods' Let go.
export function heldKey(h) { return h.ui.panel ? panel.held(h) : h.ui.screen === "pods" ? pods.held(h) : false; }
