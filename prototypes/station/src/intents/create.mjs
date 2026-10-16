// Create's intents (create.json keys, events): ◀ ▶ move the ring along the drums (the face's focus graph; the host keeps the drum in `ui.create.f`), ▲ ▼ turn the focused drum's face, ✓ Grows the founder, ← goes up to the pod's overview.
// A turn is the shape intent on that trait. The screen's own state is `h.ui.create`:
//   { podId, choices, order, f, first, clash, grown }   order: the traits turned, the newest last (the slip lists them newest first); f the focused drum and first the bank's first shown drum; grown: what ✓ Grow it made ({ code, cost, pod }) while the screen holds, until the jump to the Incubator
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { drumsOf, firstDrum, createPod, founderPicture } from "../views/create-props.mjs";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const drumIndex = (target) => { const m = /^drum\.(\d+)$/.exec(target ?? ""); return m ? +m[1] : null; };
// The face moved the ring onto a drum (a `focus` message): the host keeps it, and the bank slides at the next props.
export function focus(h, target) { const cr = h.ui.create, i = drumIndex(target); if (cr && !cr.grown && i !== null) cr.f = i; }
// The screen's own state names the pod (h.ui.create.podId); its frame is the species'. Nothing else is on the wire: { screen, target, verb }.
export function intent(h, target, verb) {
  const cr = h.ui.create, p = cr && createPod(h.st, cr); if (!p || cr.grown) return;
  const frame = frameOf(S.speciesOf(p)), drums = drumsOf(frame), spec = h.specs.create;
  if (verb === "step:up" || verb === "step:down") {
    const i = drumIndex(target) ?? cr.f, d = drums[clamp(i, 0, drums.length - 1)]; if (!d) return; cr.f = drums.indexOf(d);
    if (!p.read.includes(d.c.id)) return;   // a capped drum: an unread chapter's trait stays a surprise
    const opts = S.rollOptions(p, d.t.id); if (opts.length <= 1) return;   // a doing, one look or a trait that cannot be shaped: nothing, no plate (the context line says why)
    const size = spec.regions.founder.rect.slice(2), was = founderPicture(p, cr.choices, size).id;
    const at = cr.choices[d.t.id] || 0, n = (at + (verb === "step:up" ? 1 : opts.length - 1)) % opts.length;   // ▲ the next face, ▼ the previous, wrapping
    cr.order = (cr.order ?? []).filter((id) => id !== d.t.id); if (n) { cr.choices[d.t.id] = n; cr.order.push(d.t.id); } else delete cr.choices[d.t.id];
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
// Create opens on a pod: nothing chosen, the ring on the first drum whose chapter is read, the bank at its start.
export function openCreate(h, p) { h.ui.create = { podId: p.id, choices: {}, order: [], f: firstDrum(p, frameOf(S.speciesOf(p))), first: 0, clash: [], grown: null }; h.goto("create"); }
