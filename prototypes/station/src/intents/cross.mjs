// The Cross screen's intents (cross.json keys): ◀ ▶ pick the partner (the wires re-route at once, the state is kept), ▲ ▼ walk the overview and the chapters (▲ on the first chapter returns to the overview, ▼ on the
// last does nothing), ✓ Cross them exactly as the bottom line says, ← the mibi up close. The pad is a stepper on the one target (`partner`): the face says step:<key>, the ring stays. The screen's state is the UI's
// (`h.ui.cross`: { aId, bId, state, clash }): the partner's id and the open state, 0 the overview and n the nth chapter in ring order. A room key drops it (intents/frame.mjs).
import * as S from "../state.mjs";
import { codeText } from "../genome.mjs";
import { crossBuild } from "../views/cross-props.mjs";
import { capLine } from "../views/words.mjs";
import { toIncubator } from "./create.mjs";

const view = (h) => crossBuild({ st: h.st, sv: h.sv, settings: h.settings, ui: h.ui.cross }, h.specs.cross, h.specs.pods);
// The screen with no one to cross (the mibi was let go, or the visit is gone): the mibi up close, or the whole.
export function leave(h) { const x = h.ui.cross; h.ui.cross = null; if (x && S.mibiById(h.st, x.aId)) h.ui.hab.id = x.aId; h.goto(x && S.mibiById(h.st, x.aId) ? "habitat" : "vivarium"); }

// `target`: partner.
export function intent(h, target, verb) {
  const x = h.ui.cross, a = x && S.mibiById(h.st, x.aId); if (!a) { if (verb === "back") leave(h); return; }
  const v = view(h), n = v.nav;
  if (verb === "step:left" || verb === "step:right") {
    if (!n.partners.length) return;
    const i = Math.max(0, n.partners.indexOf(x.bId)); x.bId = n.partners[(i + (verb === "step:right" ? 1 : n.partners.length - 1)) % n.partners.length]; x.clash = []; return;
  }
  if (verb === "step:down") { x.state = Math.min(n.last, (x.state ?? 0) + 1); return; }
  if (verb === "step:up") { x.state = Math.max(0, (x.state ?? 0) - 1); return; }
  if (verb === "back") { leave(h); return; }
  if (verb !== "confirm") return;
  const b = n.b != null ? S.mibiById(h.st, n.b) : null;
  if (!b) { h.say(capLine(h.specs.cross.strings.noPartner)); return; }
  if (n.block) { h.say(capLine(n.block)); return; }   // refused before cost: the reason, no ✓ cap
  const cost = S.crossCost(h.settings);
  if (!n.can) { h.say(capLine(S.shortText(h.st, cost.e, cost.d, cost.s))); return; }
  const r = S.doCross(h.st, h.sv, a, b, h.settings, h.now());
  if (!r.ok) { x.clash = r.clash || []; h.say(r.msg); return; }
  h.ui.cross = null; h.save(); toIncubator(h);
  h.say("Crossed · " + codeText(r.bud.code) + " · the child grows in the bud");   // carried over from the retired screen: the copywriter's words are open ([copy])
}

// The ring moved: the pad is a stepper, so the face never says `focus` on Cross.
export function focus() {}
