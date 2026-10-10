// The Incubator's intents (incubator.json keys, events, handoff): ✓ on an empty one chooses a pod (a jump to Pods' collection), on a growing bud grows it now (events.growNow), on a ready one opens it (the hatch, then a jump to one mibi up close, in
// the meet); ← goes Home. The screen's own state is `h.ui.inc.hatch` while the hatch holds: { mibi, species, code, read } of the bud that was opened (the rule has already made the mibi and emptied the chamber).
import * as S from "../state.mjs";

// The pod Choose a pod lands on: the first identified pod in rack order, else the first pod (frame.json navigation.jumps); only when the rack holds a pod and a bay is free.
export function choosePod(h) {
  if (!h.st.tray.length || S.bayFull(h.st, h.settings)) return null;
  const i = h.st.tray.findIndex((q) => q.idd); return i >= 0 ? i : 0;
}
export function intent(h, target, verb) {
  if (verb === "back") { if (h.ui.inc.hatch) return; h.ui.home.f = "incubator"; h.goto("home"); return; }   // ← Home with the ring on Home's Incubator module
  if (verb !== "confirm") return;
  if (!h.st.bud) {   // empty: Choose a pod
    const i = choosePod(h); if (i === null) return;
    const q = h.st.tray[i]; h.ui.pods.view = "collection"; h.ui.pods.cur = q.id; h.ui.pods.focusView = null; h.ui.pods.focus.set("place." + i); h.goto("pods"); return;
  }
  const spec = h.specs.incubator, motion = h.motion ? h.motion() : true;
  if (S.budReady(h.st, h.settings, h.now())) {
    const B = h.st.bud, r = S.openBud(h.st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
    const ev = spec.events.hatch, id = r.mibi.id; h.ui.meet = id; h.ui.inc.hatch = { mibi: id, species: B.species, code: B.code, read: B.read, kind: B.kind, parents: B.parents ?? null }; h.save();
    const over = () => { h.ui.inc.hatch = null; h.ui.hab.id = id; h.ui.hab.f = "stage"; h.goto("habitat"); };   // the hatch is over: meet the mibi, the ring on the resident
    if (motion) { h.play({ kind: "hatch", target: "room", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, over); } else over();   // reduced motion: a cut, the meet on the frame of ✓
    return r;
  }
  const full = (() => { const t = h.st.bud.minutes, n = Math.min(t, spec.regions.leaves.max); return Math.floor(S.budProgress(h.st, h.settings, h.now()) * n); })(), total = Math.min(h.st.bud.minutes, spec.regions.leaves.max);
  const r = S.instantGrow(h.st, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  if (motion) { const ev = spec.events.growNow; h.play({ kind: "growNow", target: "room", from: full, to: total, ms: ev.ms, hold: ev.hold }); }   // the leaves still to fill fill one a step over 400 ms; the state is ready
  h.save(); return r;
}
