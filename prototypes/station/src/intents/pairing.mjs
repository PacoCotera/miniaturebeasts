// The pairing screen's intents (station step 8-3; picture 6): ◀ ▶ pick the second mibi (the examples and the chances follow at once, nothing is kept), ✓ Pair them (`state.pairPod`: the pod goes to the nursery's shelf with
// its green, and the player is taken to the shelf), ← the mibi's page. The screen is a view of the Pods screen (`h.ui.pods.view === "pair"`, `h.ui.pods.pair`: { aId, bId }); the rules are state.mjs's and the words are
// the model's (pairing-model.mjs). A room key leaves it as every Pods view does.
import * as S from "../state.mjs";
import { partnersOf } from "../views/pairing-props.mjs";
import { fill } from "../views/words.mjs";
import { openNursery } from "./nursery.mjs";

const pods = (h) => h.ui.pods;

// The way in: the mibi's pairing door (Habitat's cross key). The first pick is that mibi; the second starts on its first pairable partner.
export function openPair(h, a) {
  const p = pods(h), ps = partnersOf(h.st, h.sv, a, h.settings);
  p.page = null; p.cmp = null; p.view = "pair"; p.from = "habitat"; p.pair = { aId: a.id, bId: ps[0] ?? null };
  h.goto("pods");
}
const leave = (h) => { const p = pods(h), a = p.pair && S.mibiById(h.st, p.pair.aId); p.view = "nursery"; p.pair = null; if (a) h.ui.hab.id = a.id; h.goto(a ? "habitat" : "vivarium"); };

export function pairIntent(h, target, verb) {
  const p = pods(h), x = p.pair, a = x && S.mibiById(h.st, x.aId); if (!a) { if (verb === "back") leave(h); return; }
  if (verb === "back") return leave(h);
  const ps = partnersOf(h.st, h.sv, a, h.settings);
  if (verb === "step:left" || verb === "step:right") { if (!ps.length) return; const i = Math.max(0, ps.indexOf(x.bId)); x.bId = ps[(i + (verb === "step:right" ? 1 : ps.length - 1)) % ps.length]; return; }
  if (verb !== "confirm") return;
  const b = S.mibiById(h.st, x.bId); if (!b || !ps.includes(b.id)) { h.say(h.specs.pods.strings.nursery.empty); return; }
  const r = S.pairPod(h.st, h.sv, a, b, h.settings, h.now()); if (!r.ok) { h.say(r.msg); return; }
  h.save(); p.pair = null; openNursery(h, { from: "habitat", pod: r.pod.id });
  h.say(fill(h.specs.pods.strings.pairing.crossed, { A: a.name, B: b.name }));
}
export function focus() {}
