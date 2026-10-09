// Create's intents: ◀ ▶ walk the read traits, ▲ ▼ roll a trait's look, ✓ Grows the founder, ← goes up to the pod's overview. The roll is the screen's state (`h.ui.create`).
import * as S from "../state.mjs";
import { codeText } from "../genome.mjs";

export const STAMP_MS = 900;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
// The traits a pod can be shaped on: the read ones, in chapter order, with their chapter.
export const reviewTraits = (p, frame) => frame.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits.map((t) => ({ c, t })));
export function intent(h, target, verb, { pod, frame }) {
  const cr = h.ui.create, p = pod; if (!p || !cr) return;
  const list = reviewTraits(p, frame);
  if (verb === "step:left" || verb === "step:right") cr.f = clamp(cr.f + (verb === "step:right" ? 1 : -1), 0, Math.max(0, list.length - 1));
  else if (verb === "step:up" || verb === "step:down") {
    const cur = list[clamp(cr.f, 0, list.length - 1)]; if (!cur) return; const opts = S.rollOptions(p, cur.t.id);
    if (opts.length <= 1) { h.say(cur.t.nature === "doing" ? "Only through breeding" : !p.read.includes(cur.c.id) ? "Read it first to choose" : "This pod carries one look here"); return; }
    const i = cr.choices[cur.t.id] || 0, n = (i + (verb === "step:down" ? 1 : opts.length - 1)) % opts.length; if (n) cr.choices[cur.t.id] = n; else delete cr.choices[cur.t.id];
    cr.clash = S.clashTraits(p, cr.choices);
  }
  else if (verb === "confirm") {
    const r = S.grow(h.st, p, cr.choices, h.settings, h.now()); if (!r.ok) { h.say(r.msg); return r; }
    h.lock(STAMP_MS); h.play({ kind: "stamp", target: r.bud.code, ms: 1500 }); h.ui.create = null; h.ui.pods.cur = null; h.save(); h.goto("incubator");
    h.say("Grown · " + codeText(r.bud.code) + " · the pod is in the incubator"); return r;
  }
  else if (verb === "back") { h.ui.create = null; h.ui.pods.cur = p.id; h.ui.pods.view = "overview"; h.ui.pods.focus.set("pod"); h.goto("pods"); }
}
// Create opens on a pod: nothing chosen, the first read trait.
export function openCreate(h, p) { h.ui.create = { podId: p.id, choices: {}, f: 0, clash: [] }; h.goto("create"); }
