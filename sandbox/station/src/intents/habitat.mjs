// The Vivarium's intents (the habitat identifier stays): ✓ on the stage, the strip, the door, the gate, Cross or a chapter plate. The first ✓ on the gate arms; the second does it; any other key disarms.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";

export const MOMENT_MS = 300;
const list = (h) => h.st.mibis.filter((m) => !m.released);
// The resident the screen shows: the chosen one, else the first the Companion does not carry, else the first.
export const shown = (h) => { const l = list(h), c = S.carriedIds(h.st, h.sv); return l.find((m) => m.id === h.ui.hab.id) || l.find((m) => !c.includes(m.id)) || l[0] || null; };
// What a refused request says (the copywriter's, signed); "full" has its own plate.
const WHY = { carried: (n) => n + " already goes with you", "not-carried": (n) => n + " already comes home", released: (n) => n + " is back in the wild", unknown: (n) => n + " is not in the Vivarium" };
export function openCross(h, a) { h.ui.cross = { aId: a.id, bId: null, state: 0, fc: null, clash: [] }; const ps = S.crossPartners(h.st, h.sv, a, h.settings); if (ps.length) h.ui.cross.bId = ps[0].id; h.goto("cross"); }
// `target`: stage | s<mibi id> (the strip) | door | wild | cross | ch<i>.
export function intent(h, target, verb) {
  const a = h.ui.hab, m = shown(h); if (verb !== "confirm") a.wildArm = 0;
  if (verb === "back") { h.goto("home"); return; }
  if (verb !== "confirm" || !m) return;
  a.f = target;
  if (target === "stage" || (target[0] === "s" && target !== "stage")) { h.play({ kind: "moment", target: String(m.id), ms: MOMENT_MS }); h.say(m.name + " leans on the glass · " + (m.mem ? "it remembers the " + m.mem : m.from.g ? "it came from the " + (S.PLACE_WORD[m.from.g] || m.from.g) : "it hasn’t been out yet")); }
  else if (target === "door") {   // ✓ takes the resident with you or brings it home, whichever the set as it will be offers; a request for it already waits: nothing
    if (S.pendingCarry(h.st, h.sv).some((r) => r.id === m.id)) return;
    const bring = S.projectCarried(h.st, h.sv).includes(m.id), r = bring ? S.carryHome(h.st, h.sv, m) : S.carryAdd(h.st, h.sv, m), dk = S.docked(h.st);
    if (r.ok) { h.say(bring ? (dk ? m.name + " comes home now" : m.name + " comes home when you dock") : (dk ? m.name + " goes with you now" : m.name + " goes at the next dock")); h.save(); } else h.say(r.why === "full" ? "The Companion takes three at most" : WHY[r.why](m.name));
  }
  else if (target === "wild") {
    if (S.returnMibiBlock(h.st, h.sv, m)) return;   // the block is the Wild module's context (bottomLine.wild.blocked): the intent says nothing
    if (!a.wildArm) { a.wildArm = 1; h.say("Return " + m.name + " to the wild? Never taken back · ✓ again"); }
    else { a.wildArm = 0; const r = S.returnMibi(h.st, h.sv, m, h.settings); if (r.ok) { h.say(r.msg); a.id = null; a.f = "stage"; h.save(); } }
  }
  else if (target === "cross") { if (S.crossPartners(h.st, h.sv, m, h.settings).length) openCross(h, m); else h.say("No other adult " + S.spName(m) + " to pair with " + m.name); }
  else if (target.startsWith("ch")) {
    const fr = frameOf(S.speciesOf(m)), ch = fr?.chapters[+target.slice(2)]; if (!ch) return;
    const r = S.readMibi(h.st, m, ch.id, h.settings);
    if (r.ok) { h.say((r.first ? "The first read is free · " : "") + ch.name + " read" + (r.newLooks.length ? " · new: " + r.newLooks.slice(0, 3).join(", ") : "")); h.save(); } else if (r.msg) h.say(r.msg);
  }
}
