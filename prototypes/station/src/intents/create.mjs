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
    const r = S.grow(h.st, p, cr.choices, h.settings, h.now()); if (!r.ok) { h.say(r.msg); return r; }
    const ev = spec.events.grow, motion = h.motion ? h.motion() : true;
    cr.grown = { code: r.bud.code, cost: r.cost, pod: p }; h.ui.pods.cur = null; h.save();
    const jump = () => { h.ui.create = null; h.goto("incubator"); };   // Grow it is a jump: the Incubator, growing; ← there reads Home
    if (motion) { h.play({ kind: "grow", target: "pod", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, jump); } else jump();   // reduced motion: the event is a cut, so the jump is on the frame of ✓
    return r;
  }
  else if (verb === "back") { h.ui.create = null; h.ui.pods.cur = p.id; h.ui.pods.view = "overview"; h.ui.pods.focus.set("pod"); h.goto("pods"); }
}
// Create opens on a pod: nothing chosen, the first read trait.
export function openCreate(h, p) { h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [], grown: null }; h.goto("create"); }
