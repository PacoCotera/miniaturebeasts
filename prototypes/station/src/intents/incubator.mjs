// The Incubator's intents (incubator.json keys, events, handoff): ✓ on an empty one chooses a pod (a jump to Pods' collection), on a growing bud grows it now (events.growNow), on a ready one opens it (the hatch, then a jump to one mibi up close, in
// the meet); ← goes Home. The screen's own state is `h.ui.inc.hatch` while the hatch holds: { mibi, species, code, read } of the bud that was opened (the rule has already made the mibi and emptied the chamber).
import * as S from "../state.mjs";
import { toPods } from "./create.mjs";
import { knownChapters } from "../views/incubator-props.mjs";
import { plays } from "../moving.mjs";

// The pod Choose a pod lands on: the first identified pod in rack order, else the first pod (frame.json navigation.jumps); only when the rack holds a pod and a bay is free.
export function choosePod(h) {
  if (!h.st.tray.length || S.bayFull(h.st, h.settings)) return null;
  const i = h.st.tray.findIndex((q) => q.idd); return i >= 0 ? i : 0;
}
// The hatch's cutting key (UI/UX "Hatch cutting key"): on a hatch with a moving set, the first key after the hold and before its end only lands the meet: ✓ opens no namer, ← does not leave, the pad does not end the meet, a room key is used up.
// The face ends its event at that key (its `done`) or the host's kept room key does at the hold's end; the Dock is not a cutting key.
export const cuttingHatch = (h) => { const hh = h.ui.inc?.hatch; return !!(hh && hh.cuttable && !hh.over); };
export function landHatch(h) { const hh = h.ui.inc?.hatch; if (hh && hh.land) hh.land(); }
export function intent(h, target, verb) {
  if (verb === "back") { if (h.ui.inc.hatch) return; const ar = h.ui.arrival; if (ar) { h.ui.arrival = null; toPods(h, ar.place); return; } h.ui.home.f = "incubator"; h.goto("home"); return; }   // ← reads Home; after a Grow it jump (the arrival mode) it returns to Pods, this pod's place, until another key   // ← Home with the ring on Home's Incubator module
  if (verb !== "confirm") return;
  if (!h.st.bud) {   // empty: Choose a pod
    const i = choosePod(h); if (i === null) return;
    const q = h.st.tray[i]; h.ui.pods.view = "collection"; h.ui.pods.cur = q.id; h.ui.pods.focusView = null; h.ui.pods.focus.set("place." + i); h.goto("pods"); return;
  }
  const spec = h.specs.incubator, motion = h.motion ? h.motion() : true;
  if (S.budReady(h.st, h.settings, h.now())) {
    const B = h.st.bud, r = S.openBud(h.st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
    // a juvenile with a moving set (Station M1 §2.5, R2, R5): the longer hatch, held to the stand (to the stand after the first hop on a save's first hatch, bud.firstEver, kept on the hatch: the bud is cleared at the hand-off), then a key cuts to the meet
    const moving = plays(B.species, "juvenile", h.settings.motionSets), ev = moving ? spec.events.hatch.moving : spec.events.hatch, id = r.mibi.id, hold = moving && B.firstEver ? ev.firstHold : ev.hold;
    h.ui.meet = id; h.ui.inc.hatch = { mibi: id, species: B.species, code: B.code, read: B.read, kind: B.kind, moving, hold, cuttable: moving && !!ev.cut, over: false }; h.save();
    const over = (cut = false) => { const hh = h.ui.inc.hatch; if (!hh || hh.over) return; hh.over = true; h.ui.inc.hatch = null; h.ui.hab.id = id; h.ui.hab.f = "resident"; h.goto("habitat", 0, cut ? { cut: true, meetHold: spec.events.hatch.moving.cutMeetHold ?? 300 } : {}); };   // the hatch is over: meet the mibi, the ring on the resident (habitat.json focus.targets.resident); a cut landing draws no dither and the meet holds input 300 ms
    h.ui.inc.hatch.land = () => over(true);
    const sk = ev.skip === true;   // a skippable hold (lvgl-switch.md §2.1): ✓ Skip ends the hold and the hatch goes on to its end, the meet
    if (motion) { h.play({ kind: "hatch", target: "room", ms: ev.ms, hold, ...(moving && ev.cut ? { cut: true } : {}), ...(sk ? { skip: true } : {}) }); h.at(ev.ms, () => over(false), sk); } else over();   // reduced motion: a cut, the meet on the frame of ✓
    return r;
  }
  const B = h.st.bud, L = S.budLeaves(h.st, h.settings, h.now(), spec.regions.leaves.max, spec.regions.leaves.leaf[1]), before = { known: knownChapters(h.st, B, h.settings, h.now()), leaves: L, cost: S.instantGrowCost(h.st, h.settings, h.now()), need: S.need(h.st, h.sv, h.settings, h.ui).text ?? "", left: S.budMinutesLeft(h.st, h.settings, h.now()) };
  const r = S.instantGrow(h.st, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  if (motion) {   // the leaves still to fill (the filling one first) turn whole one by one over 400 ms; the screen shows the bud as it was until the event ends, then ready on one refresh
    const ev = spec.events.growNow; h.ui.inc.grow = { ...before, until: h.now() + ev.ms };
    h.play({ kind: "growNow", target: "room", from: L.full, to: L.total, ms: ev.ms, hold: ev.hold }); h.at(ev.ms, () => { h.ui.inc.grow = null; });
  }
  h.save(); return r;
}

// The Incubator's tabs, once a frame: while a founder's bud grows its unread chapters clear one at a time; each tab that turns read plays the wipe (incubator.json events.wipe), which fills its pips over 1000 ms. The first look at a screen plays none, nor do growNow's cut or reduced motion.
export function incubatorTick(h) {
  const inc = h.ui.inc;
  if (h.ui.screen !== "incubator" || !h.st.bud || inc.grow || (h.motion && !h.motion())) { inc.seen = null; return; }
  const known = knownChapters(h.st, h.st.bud, h.settings, h.now()), prev = inc.seen; inc.seen = known;
  if (prev) for (const id of known) if (!prev.includes(id)) { const ev = h.specs.incubator.events.wipe; h.play({ kind: "wipe", target: id, ms: ev.ms, hold: ev.hold }); }
}
