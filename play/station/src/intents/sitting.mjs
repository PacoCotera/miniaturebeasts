// The sitting (sitting.json): ✓ on a card goes a step forward (pose, place, confirm), ← a step back keeping the choice (from the pose step and from the portrait, Habitat with the ring on Portrait), the confirm
// step arms on the first ✓ and begins on the second (events.begin: the lit gilt dithers out, then beginSitting and the screen change to Habitat with the plate). The window's changes are the host's dither events:
// the backdrop on the place step (events.backdrop, the resident's light change riding it or cut at its end, events.backdrop.resident) and the pose step's stand/curl change. Nothing is spent before the second ✓;
// UI.sit is the visit's memory ({ step, pose, place, focus, armed, from, prev: { glass, resident, cut } }), the mibi is Habitat's shown one (ui.hab.id), and a room key drops it (intents/frame.mjs).
import * as S from "../state.mjs";
import { offer, beginBlock, beginSitting } from "../sitting.mjs";
import { poseFor } from "../layered-stand.mjs";
import { sittingBuild } from "../views/sitting-props.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
// A fresh visit: no choice made, the ring on the first card (or the room).
export const newSit = (from = "habitat", step = "pose") => ({ step, pose: null, place: null, focus: null, armed: null, from, prev: { glass: null, resident: null, cut: false } });
const cardAt = (target) => (typeof target === "string" && /^card\.[0-5]$/.test(target) ? +target.slice(5) : -1);
const mibi = (h) => S.mibiById(h.st, h.ui.hab.id);
// The props as the face is given them now (the window's pictures before and after a change): the host's light, Habitat's shown mibi.
export const sittingLook = (h) => (h.ui.sit ? sittingBuild({ st: h.st, sv: h.sv, settings: h.settings, light: h.light ? h.light() : "day", mibiId: h.ui.hab.id, ui: h.ui.sit }, h.specs.sitting, h.specs.habitat) : null);
const curled = (h, r) => { const m = mibi(h); return !!(m && r.pose && poseFor(S.speciesOf(m), r.stage, r.pose).pose === "curl"); };

// The window's change from `before` to the props now: the glass cross-dithers between two pictures of habitat.json light.size; on a step change (into the place step, or back to the pose step) the resident's
// light change rides the backdrop's 16 levels on its clock ("dither") or waits for its end ("cut"); on the pose step a change to or from the curl dithers (events.pose; a press cuts it to its end form), any other change is a cut. Reduced motion: every change is a cut.
function windowChange(h, before, stepChange) {
  const s = h.ui.sit, after = sittingLook(h); if (!s || !before || !after || !h.motion()) return;
  const ev = h.specs.sitting.events.backdrop, size = "-" + h.specs.habitat.light.size.join("x"), B = before.props.regions, A = after.props.regions;
  const g0 = B.glass.picture, g1 = A.glass.picture;
  if (g0 && g1 && g0 !== g1 && g0.endsWith(size) && g1.endsWith(size)) { s.prev.glass = g0; h.play({ kind: ev.kind, target: ev.target, from: g0, ms: ev.ms, hold: ev.hold, levels: ev.levels }); h.at(ev.ms, () => { if (s.prev.glass === g0) s.prev.glass = null; }); }
  const r0 = B.resident.picture, r1 = A.resident.picture; if (!r0 || !r1 || r0 === r1) return;
  const keep = (ms) => h.at(ms, () => { if (s.prev.resident === r0) { s.prev.resident = null; s.prev.cut = false; } });
  if (stepChange) { s.prev.resident = r0; s.prev.cut = ev.resident !== "dither"; if (!s.prev.cut) h.play({ kind: "dither", target: "resident", from: r0, ms: ev.ms, hold: ev.hold, levels: ev.levels }); keep(ev.ms); }
  else if (curled(h, B.resident) !== curled(h, A.resident)) { const p = h.specs.sitting.events.pose; s.prev.resident = r0; s.prev.cut = false; h.play({ kind: p.kind, target: p.target, from: r0, ms: p.ms, hold: p.hold, levels: p.levels, cut: true }); keep(p.ms); }
}

// The ring moved to a card (the face says `card.<i>`): the visit keeps it; on the place step the backdrop follows it, on the pose step the resident's form.
export function focus(h, target) {
  const s = h.ui.sit; if (!s || cardAt(target) < 0 || (s.step !== "pose" && s.step !== "place")) return;
  const before = sittingLook(h); s.focus = target; windowChange(h, before, false);
}
// Leaving the screen: the choices are dropped, nothing is spent; Habitat with the ring on Portrait (habitat.json focus.entry.backFromSitting, backFromPortrait).
function leave(h) { h.ui.sit = null; h.ui.hab.f = "portrait"; h.goto("habitat"); }
// The second ✓: the lit gilt dithers out (events.begin steps[0]), and at the screen change's start (steps[1]) the sitting begins (beginSitting), Habitat shows the plate (strings.beganPlate) with the ring on Portrait.
// Input is held for the whole of events.begin; reduced motion: all on the frame of the key, the screen change a cut.
function begin(h, m) {
  const s = h.ui.sit, e = h.specs.sitting.events.begin, [out, change] = e.steps, moving = h.motion();
  s.step = "begin"; s.armed = null;
  const go = () => {
    if (h.ui.sit !== s) return;
    const r = beginSitting(h.st, m, s.pose, s.place, h.settings, h.now(), h.sv);
    if (!r.ok) { s.step = "confirm"; h.say(r.msg); return; }
    h.save(); h.ui.sit = null; h.ui.hab.f = change.focus; h.say(fill(h.specs.sitting.strings.beganPlate, { name: m.name })); h.goto("habitat", 0, moving ? {} : { cut: true });
  };
  if (!moving) { go(); return; }
  h.play({ kind: out.kind, target: out.target, from: out.from, ms: out.ms, hold: e.hold, levels: out.levels });
  h.at(change.at, go);
}
// `target`: card.<i> on the pose and place steps; room on the confirm step and the portrait.
export function intent(h, target, verb) {
  const s = h.ui.sit, m = mibi(h);
  if (!s || !m) { if (verb === "back") leave(h); return; }
  if (verb === "back") {
    if (s.step === "pose" || s.step === "portrait") leave(h);
    else if (s.step === "place") { const before = sittingLook(h); s.step = "pose"; s.focus = null; windowChange(h, before, true); }
    else if (s.step === "confirm") { s.step = "place"; s.focus = null; s.armed = null; }
    return;
  }
  if (verb !== "confirm") return;
  const o = offer(h.st, m, h.sv), i = cardAt(target);
  if (s.step === "pose") { const habit = o.poses[i]; if (!habit) return; const before = sittingLook(h); s.pose = habit; s.step = "place"; s.focus = null; windowChange(h, before, true); }
  else if (s.step === "place") { const place = o.places[i]; if (!place || !s.pose) return; s.place = place; s.step = "confirm"; s.focus = null; s.armed = null; }
  else if (s.step === "confirm") {
    if (!s.pose || !s.place || beginBlock(h.st, m, s.pose, s.place, h.sv)) return;
    if (s.armed !== "room") { s.armed = "room"; return; }
    begin(h, m);
  }
}
