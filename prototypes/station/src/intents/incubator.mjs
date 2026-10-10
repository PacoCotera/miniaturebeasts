// The incubator's intents: ✓ opens a ready bud (the hatch) or grows a growing one now; ← goes Home.
import * as S from "../state.mjs";

export const HATCH_MS = 2800;
export function intent(h, target, verb) {
  if (verb === "back") { h.goto("home"); return; }
  if (verb !== "confirm" || !h.st.bud) return;
  if (S.budReady(h.st, h.settings, h.now())) {
    const r = S.openBud(h.st, h.sv, h.settings, h.now()); if (!r.ok) { h.say(r.msg); return r; }
    h.ui.meet = r.mibi.id; h.play({ kind: "hatch", target: String(r.mibi.id), ms: HATCH_MS, hold: HATCH_MS }); h.save();
    const id = r.mibi.id; h.at(HATCH_MS, () => { h.ui.hab.id = id; h.ui.hab.f = "door"; h.goto("habitat"); });   // the hatch is over: meet the mibi, the ring on the door
    return r;
  }
  const r = S.instantGrow(h.st, h.settings, h.now()); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  h.say("The bud grows now"); h.save(); return r;
}
