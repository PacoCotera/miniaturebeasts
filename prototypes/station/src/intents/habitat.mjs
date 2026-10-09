// The Vivarium's intents (the habitat identifier stays): ✓ on the stage, the strip, the door, the gate, Cross, a chapter plate or the heart. The first ✓ on the gate and on the heart arms; the second does it; any other key disarms.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

export const MOMENT_MS = 300;
const list = (h) => h.st.mibis.filter((m) => !m.released);
// The resident the screen shows: the chosen one, else the first not out with you, else the first.
export const shown = (h) => { const l = list(h); return l.find((m) => m.id === h.ui.hab.id) || l.find((m) => m.id !== S.effWithId(h.st, h.sv)) || l[0] || null; };
export function openCross(h, a) { h.ui.cross = { aId: a.id, bId: null, state: 0, fc: null, clash: [] }; const ps = S.crossPartners(h.st, h.sv, a, h.settings); if (ps.length) h.ui.cross.bId = ps[0].id; h.goto("cross"); }
// `target`: stage | s<mibi id> (the strip) | door | wild | cross | ch<i> | heart.
export function intent(h, target, verb) {
  const a = h.ui.hab, m = shown(h); if (verb !== "confirm") { a.bondArm = 0; a.wildArm = 0; }
  if (verb === "back") { h.goto("home"); return; }
  if (verb !== "confirm" || !m) return;
  a.f = target;
  if (target === "stage" || (target[0] === "s" && target !== "stage")) { h.lock(MOMENT_MS); h.play({ kind: "moment", target: String(m.id), ms: MOMENT_MS }); h.say(m.name + " leans on the glass · " + (m.mem ? "it remembers the " + m.mem : m.from.g ? "it came from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "it hasn’t been out yet")); }
  else if (target === "door") { if (m.id !== S.effWithId(h.st, h.sv)) { const r = S.takeWith(h.st, h.sv, m); if (r.ok) { h.say(r.msg); h.save(); } } }
  else if (target === "wild") {
    if (S.returnMibiBlock(h.st, h.sv, m)) { h.say(S.returnMibi(h.st, h.sv, m, h.settings).msg); return; }
    if (!a.wildArm) { a.wildArm = 1; h.say("Return " + m.name + " to the wild? Never taken back · ✓ again"); }
    else { a.wildArm = 0; const r = S.returnMibi(h.st, h.sv, m, h.settings); h.say(r.msg); if (r.ok) { a.id = null; a.f = "stage"; h.save(); } }
  }
  else if (target === "cross") { if (S.crossPartners(h.st, h.sv, m, h.settings).length) openCross(h, m); else h.say("No other adult " + S.spName(m) + " to pair with " + m.name); }
  else if (target.startsWith("ch")) {
    const fr = frameOf(S.speciesOf(m)), ch = fr?.chapters[+target.slice(2)]; if (!ch) return;
    const r = S.readMibi(h.st, m, ch.id, h.settings);
    if (r.ok) { h.say((r.first ? "The first read is free · " : "") + ch.name + " read" + (r.newLooks.length ? " · new: " + r.newLooks.slice(0, 3).join(", ") : "")); h.save(); } else if (r.msg) h.say(r.msg);
  }
  else if (target === "heart" && S.bondOffered(m)) { if (!a.bondArm) { a.bondArm = 1; h.say("Bond with " + m.name + "? A deliberate choice · ✓ again"); } else { a.bondArm = 0; h.say(S.bond(h.st, m).msg); h.save(); } }
}
