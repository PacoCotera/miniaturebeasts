// Create's intents (create.json keys, events): ◀ ▶ walk the read traits, ▲ ▼ roll a trait's look, ✓ Grows the founder, ← goes up to the pod's overview. The roll is the screen's state (`h.ui.create`):
//   { podId, choices, f, clash, grown }   grown: what ✓ Grow it made ({ code, cost, pod }) while the screen holds, until the jump to the Incubator
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { reviewTraits, createPod, founderPicture } from "../views/create-props.mjs";
import { capLine } from "../views/words.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// The screen's own state names the pod (h.ui.create.podId); its frame is the species'. Nothing else is on the wire: { screen, target, verb }.
export function intent(h, target, verb) {
  const cr = h.ui.create, p = cr && createPod(h.st, cr); if (!p || cr.grown) return;
  const frame = frameOf(S.speciesOf(p)), list = reviewTraits(p, frame), spec = h.specs.create;
  if (verb === "step:left" || verb === "step:right") cr.f = clamp(cr.f + (verb === "step:right" ? 1 : -1), 0, Math.max(0, list.length - 1));
  else if (verb === "step:up" || verb === "step:down") {
    const cur = list[clamp(cr.f, 0, list.length - 1)]; if (!cur) return; const opts = S.rollOptions(p, cur.t.id);
    if (opts.length <= 1) return;   // a doing, one look or a trait that cannot be shaped: nothing, no plate (the trait line says why)
    const size = spec.regions.founder.rect.slice(2), was = founderPicture(p, cr.choices, size).id;
    const i = cr.choices[cur.t.id] || 0, n = (i + (verb === "step:down" ? 1 : opts.length - 1)) % opts.length; if (n) cr.choices[cur.t.id] = n; else delete cr.choices[cur.t.id];
    cr.clash = S.clashTraits(p, cr.choices);
    const now = founderPicture(p, cr.choices, size).id; if (now !== was) { cr.prev = was; h.play({ kind: "dither", target: spec.events.roll.target, from: was, ms: spec.events.roll.ms, hold: spec.events.roll.hold }); h.at(spec.events.roll.ms, () => { cr.prev = null; }); }   // the founder cross-dithers to the new picture
  }
  else if (verb === "confirm") {
    const block = S.growBlockKey(h.st, p, cr.choices, h.settings, cr.clash);
    if (block && (block.key === "busy" || block.key === "full" || block.key === "clash")) { h.say(block.key === "full" ? S.fullWords(h.st).plate.join("\n") : capLine(spec.strings.notices[block.key])); return; }   // blocked: the verb is dimmed and ✓ plays its plate, never silent (the house rule): the Vivarium full its three lines (C10), busy and clash the notice's own sentence
    if (block && block.key === "short") { h.say(spec.strings.notices.shortFrom[block.from].replace("{icons}", block.short)); return; }   // refused as before: the plate, and the panel does not open (build spec 6a.1)
    openIncubatePanel(h);   // the 180 ms dither (16 levels) from Create to the Incubate | Keep shaping panel; nothing is spent until its ✓ Incubate
  }
  else if (verb === "back") { h.ui.create = null; h.ui.pods.cur = p.id; h.ui.pods.view = "overview"; h.ui.pods.focus.set("pod"); h.goto("pods"); }
}
// Create opens on a pod: nothing chosen, the first read trait.
export function openCreate(h, p) { h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; h.goto("create"); }

// The Incubate | Keep shaping panel (build spec 6a; Create's `confirm` state): `h.ui.panel = { screen: "create", id: "incubate", focus }`. It opens with the stage dither (a cut with reduced motion), which holds input, so ✓ Incubate is
// taken only once the dither in has ended: Incubate uses the pod and cannot be undone, so a double press of Create's ✓ never passes through the panel.
export function openIncubatePanel(h) {
  h.ui.panel = { screen: "create", id: "incubate", focus: "card.incubate" };
  if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 });
}
// Keep shaping and ←: the dither back to Create as it was, nothing spent.
export function keepShaping(h) { h.ui.panel = null; if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 }); }
// ✓ Incubate: the panel goes as a cut and Create's grow runs exactly as ✓ did before (the same checks, price and log line); refused now (the state changed while the panel stood): Create shows its refusal plate and nothing is spent.
export function incubateNow(h) {
  const cr = h.ui.create, p = cr && createPod(h.st, cr); h.ui.panel = null; if (!p || cr.grown) return;
  const spec = h.specs.create, r = S.grow(h.st, p, cr.choices, h.settings, h.now());
  if (!r.ok) { const block = S.growBlockKey(h.st, p, cr.choices, h.settings, cr.clash); h.say(block && block.key === "short" ? spec.strings.notices.shortFrom[block.from].replace("{icons}", block.short) : r.msg); return r; }
  const ev = spec.events.grow, motion = h.motion ? h.motion() : true;
  cr.grown = { code: r.bud.code, cost: r.cost, pod: p, minutes: r.bud.minutes }; h.ui.pods.cur = null; h.save();   // the bud's own minutes: grow() clears firstMibi, so recomputing them after Grow would show 20 for the first founder
  const jump = () => { h.ui.create = null; toIncubator(h); };   // Incubate is a jump: the Incubator's incubate moment, then growing; ← there reads Home
  if (motion) { h.play({ kind: "grow", target: "pod", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, jump); } else jump();   // reduced motion: the event is a cut, so the jump is on the frame of ✓
  return r;
}

// Pods' collection, the ring on the next pod: the one now at the grown pod's place in the rack (the last when it was the last), else nothing.
export function toPods(h, place) {
  const t = h.st.tray, i = Math.min(place, t.length - 1), p = h.ui.pods; p.view = "collection"; p.focusView = null; p.cmp = null;
  if (i >= 0) { p.cur = t[i].id; p.focus.set("place." + i); } else { p.cur = null; p.focus.set(null); }
  h.goto("pods");
}
// The Incubator, the incubate moment (incubator.json events.incubate: dusk, sealed, then the dither to growing); ← there reads Home. Also Cross's Cross them.
export function toIncubator(h) {
  h.goto("incubator");
  if (h.motion ? h.motion() : true) { const ev = h.specs.incubator.events.incubate; h.play({ kind: "incubate", target: "room", ms: ev.ms, hold: ev.hold }); }
}
