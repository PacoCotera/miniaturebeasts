// Create's intents (create.json keys, events): ◀ ▶ walk the read traits, ▲ ▼ roll a trait's look, ✓ Grows the founder, ← goes up to the pod's overview. The roll is the screen's state (`h.ui.create`):
//   { podId, choices, f, clash, grown }   grown: what ✓ Grow it made ({ code, cost, pod }) while the screen holds, until the jump to the Incubator
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { reviewTraits, createPod, founderPicture } from "../views/create-props.mjs";

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
    const block = S.growBlockKey(h.st, p, cr.choices, h.settings, cr.clash); if (block && (block.key === "busy" || block.key === "noBay" || block.key === "clash")) return;   // blocked: ✓ does nothing, no plate (the bottom line says why); only short keeps its plate
    const r = S.grow(h.st, p, cr.choices, h.settings, h.now());
    if (!r.ok) { h.say(block && block.key === "short" ? h.specs.create.strings.notices.shortFrom[block.from].replace("{icons}", block.short) : r.msg); return r; }   // a short ✓: the plate names the notice's words (where the shortfall comes from)
    const ev = spec.events.grow, motion = h.motion ? h.motion() : true;
    cr.grown = { code: r.bud.code, cost: r.cost, pod: p, minutes: r.bud.minutes }; h.ui.pods.cur = null; h.save();   // the bud's own minutes: grow() clears firstMibi, so recomputing them after Grow would show 20 for the first founder
    const jump = () => { h.ui.create = null; h.goto("incubator"); };   // Grow it is a jump: the Incubator, growing; ← there reads Home
    if (motion) { h.play({ kind: "grow", target: "pod", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, jump); } else jump();   // reduced motion: the event is a cut, so the jump is on the frame of ✓
    return r;
  }
  else if (verb === "back") { h.ui.create = null; h.ui.pods.cur = p.id; h.ui.pods.view = "overview"; h.ui.pods.focus.set("pod"); h.goto("pods"); }
}
// Create opens on a pod: nothing chosen, the first read trait.
export function openCreate(h, p) { h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; h.goto("create"); }

// The Grow, from a card of the Grow this founder? panel (`act`: grow | watch | read): the rule pays and the bud starts, the event plays, and the jump lands where the card said. grow and watch land in the Incubator (grow: with the arrival plate in
// the arrival mode of the jump flag, settings.jump); read lands in Pods' collection with the ring on the next pod.
export function growFounder(h, act = "grow") {
  const cr = h.ui.create, p = cr && createPod(h.st, cr); if (!p || cr.grown) return;
  const spec = h.specs.create, place = Math.max(0, h.st.tray.findIndex((q) => q.id === p.id));
  const r = S.grow(h.st, p, cr.choices, h.settings, h.now());
  if (!r.ok) { h.say(r.msg); return r; }
  const ev = spec.events.grow, motion = h.motion ? h.motion() : true;
  cr.grown = { code: r.bud.code, cost: r.cost, pod: p, minutes: r.bud.minutes }; h.ui.pods.cur = null; h.save();   // the bud's own minutes: grow() clears firstMibi, so recomputing them after Grow would show 20 for the first founder
  const jump = () => { h.ui.create = null; if (act === "read") toPods(h, place); else toIncubator(h, p, place, act === "grow"); };   // Grow it is a jump (both cards that grow play the same event; only the landing differs)
  if (motion) { h.play({ kind: "grow", target: "pod", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, jump); } else jump();   // reduced motion: the event is a cut, so the jump is on the frame of ✓
  return r;
}
// Pods' collection, the ring on the next pod: the one now at the grown pod's place in the rack (the last when it was the last), else nothing.
export function toPods(h, place) {
  const t = h.st.tray, i = Math.min(place, t.length - 1), p = h.ui.pods; p.view = "collection"; p.focusView = null; p.cmp = null;
  if (i >= 0) { p.cur = t[i].id; p.focus.set("place." + i); } else { p.cur = null; p.focus.set(null); }
  h.goto("pods");
}
// The Incubator, growing; ← there reads Home. Arrival mode: the plate says where we are for its time with no press, and ← goes back to Pods, this pod's place, until another key.
function toIncubator(h, p, place, arrival) {
  h.goto("incubator");
  if (arrival && h.settings.jump !== "fork") { const a = h.specs.panel.strings.arrival; h.ui.arrival = { place }; h.say(a.text.replace("{Species}", S.cap(S.spName(p))), a.ms); }
}
