// The Incubator's intents (incubator.json keys, events, handoff): ✓ on an empty one chooses a pod (a jump to Pods' collection), on a growing bud hatches it now (events.growNow, then events.hatch: pay, end the wait and open in one press), on a ready one opens it (the hatch, then a jump to one mibi up close, in
// the meet); ← goes Home. The screen's own state is `h.ui.inc.hatch` while the hatch holds: { mibi, species, code, read } of the bud that was opened (the rule has already made the mibi and emptied the chamber).
import * as S from "../state.mjs";
import { toPods } from "./create.mjs";
import { knownChapters } from "../views/incubator-props.mjs";
import { openPanel } from "./panel.mjs";
import { readyCrates } from "../sitting.mjs";

// The pod Choose a pod lands on: the first identified pod in rack order, else the first pod (frame.json navigation.jumps); only when the rack holds a pod and a bay is free.
export function choosePod(h) {
  if (!h.st.tray.length || S.vivFull(h.st, h.settings)) return null;
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
  if (S.budReady(h.st, h.settings, h.now())) {
    const B = h.st.bud, r = S.openBud(h.st, h.sv, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
    startHatch(h, B, r.mibi); return r;
  }
  const above = h.settings.growNowAbove ?? h.specs.panel?.growNowAbove ?? 4;   // a large Hatch now asks first (decision panel spec §1.6); at or below the threshold ✓ acts as before
  const cost = S.instantGrowCost(h.st, h.settings, h.now());
  if (cost.s > above && S.canPay(h.st, cost.e, cost.d, cost.s) && !S.vivFull(h.st, h.settings)) { openPanel(h, "incubator", "growNow"); if (h.motion ? h.motion() : true) h.play({ kind: "dither", target: "stage", ms: 180, hold: 180 }); return; }   // a large Hatch now asks first: the Hatch now | Wait panel, by the 180 ms stage dither (a cut with reduced motion); short of Essence or with no bay free the refusal plate shows (as Open's words) and the panel does not open
  return growNow(h);
}
// The hatch both presses play: Open (a ready bud) at once, Hatch now after the leaves have turned. The rule has already made the mibi and emptied the chamber.
function startHatch(h, B, mibi) {
  const spec = h.specs.incubator, motion = h.motion ? h.motion() : true;
  {
    // a juvenile with a moving set (Station M1 §2.5, R2, R5): the longer hatch, held to the stand (to the stand after the first hop on a save's first hatch, bud.firstEver, kept on the hatch: the bud is cleared at the hand-off), then a key cuts to the meet
    const moving = false, ev = spec.events.hatch, id = mibi.id, hold = ev.hold;   // the moving-set hatch (Station M1 section 2.5) is not built on the capsule: its close atlas is 304 x 312 and the capsule's mibi is 146 tall (open question, T-20261016-222)
    h.ui.meet = id; S.seeRoom(h.st, mibi); h.ui.inc.hatch = { mibi: id, species: B.species, code: B.code, read: B.read, kind: B.kind, moving, hold, cuttable: moving && !!ev.cut, over: false }; h.save();
    const over = (cut = false) => { const hh = h.ui.inc.hatch; if (!hh || hh.over) return; hh.over = true; h.ui.inc.hatch = null; h.ui.hab.id = id; h.ui.hab.f = "resident"; h.goto("habitat", 0, cut ? { cut: true, meetHold: spec.events.hatch.moving.cutMeetHold ?? 300 } : {}); };   // the hatch is over: meet the mibi, the ring on the resident (habitat.json focus.targets.resident); a cut landing draws no dither and the meet holds input 300 ms
    h.ui.inc.hatch.land = () => over(true);
    const sk = ev.skip === true;   // a skippable hold (lvgl-switch.md §2.1): ✓ Skip ends the hold and the hatch goes on to its end, the meet
    if (motion) { h.play({ kind: "hatch", target: "room", ms: ev.ms, hold, ...(moving && ev.cut ? { cut: true } : {}), ...(sk ? { skip: true } : {}) }); h.at(ev.ms, () => over(false), sk); } else over();   // reduced motion: a cut, the meet on the frame of ✓
  }
}
// Hatch now (and the panel's Hatch now card): pay, end the wait and open, in one press. The bar fills in 8 cuts and the door opens (events.growNow, 580 ms), then the hatch plays as on Open.
export function growNow(h) {
  const spec = h.specs.incubator, motion = h.motion ? h.motion() : true;
  const B = h.st.bud, before = { known: knownChapters(h.st, B, h.settings, h.now()), cost: S.instantGrowCost(h.st, h.settings, h.now()), need: S.need(h.st, h.sv, h.settings, h.ui, readyCrates(h.st, h.settings, h.now()).length).text ?? "", progress: S.budProgress(h.st, h.settings, h.now()), left: S.budMinutesLeft(h.st, h.settings, h.now()), bud: B };
  const r = S.instantGrow(h.st, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  if (motion) {   // the screen shows the bud as it was (the snapshot, `bud` included: the chamber is already empty) until the event is done; the hatch starts when it ends
    const ev = spec.events.growNow; h.ui.inc.grow = { ...before, until: h.now() + ev.ms }; h.ui.meet = r.mibi.id; S.seeRoom(h.st, r.mibi); h.save();
    h.play({ kind: "growNow", target: "room", ms: ev.ms, hold: ev.hold }); h.at(ev.ms, () => { h.ui.inc.grow = null; startHatch(h, B, r.mibi); });
  } else startHatch(h, B, r.mibi);
  return r;
}

// The Incubator's tabs, once a frame: while a founder's bud grows its unread chapters clear one at a time; each tab that turns read plays the wipe (incubator.json events.wipe), which fills its pips over 1000 ms. The first look at a screen plays none, nor do growNow's cut or reduced motion.
export function incubatorTick(h) {
  const inc = h.ui.inc;
  if (h.ui.screen !== "incubator" || !h.st.bud || inc.grow || (h.motion && !h.motion())) { inc.seen = null; return; }
  const known = knownChapters(h.st, h.st.bud, h.settings, h.now()), prev = inc.seen; inc.seen = known;
  if (prev) for (const id of known) if (!prev.includes(id)) { const ev = h.specs.incubator.events.wipe; h.play({ kind: "wipe", target: id, ms: ev.ms, hold: ev.hold }); }
}
