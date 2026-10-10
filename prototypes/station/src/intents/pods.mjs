// Pods' intents: the rule call behind each ✓, ←, ◀ ▶ of a state, the state it moves to and where the ring goes. The pad's moves are the face's (the focus graph, run in C); the keys that reach the host are
// the intents: ✓ (confirm) on a focused target, ← (back), the room keys, and Compare's ◀ ▶ (step:left, step:right on the open tab).
//   h.ui.pods: { view, cur, ci, cmp, wildArm, focus }; the spec's strings (hatchAgain) and the kin's maximum come from `h.specs.pods`.
import * as S from "../state.mjs";
import { frameOf } from "../genome.mjs";
import { compareBackFocus } from "../views/pods-props.mjs";
import { openCreate } from "./create.mjs";

export const ID_MS = 2000, READ_MS = 2000, RIBBON_MS = 6000;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const chaptersOf = (p) => (p && p.idd ? frameOf(S.speciesOf(p)).chapters : []);
const placeOf = (st, id) => "place." + Math.max(0, st.tray.findIndex((q) => q.id === id));
// The kin the overview lists for a pod: the same species, identified, that can be compared, at most the spec's maximum.
export const kinOf = (h, cur) => (cur && cur.idd ? h.st.tray.filter((q) => q !== cur && q.idd && S.canCompare(h.st, cur, q)).slice(0, h.specs.pods.regions.overview.kin.max) : []);
const initialFocus = (h, view) => (view === "collection" ? placeOf(h.st, h.ui.pods.cur) : view === "chapter" ? "rail." + (h.ui.pods.ci || 0) : "pod");
// Going to a state puts the ring where the spec's graph says it starts, or on a named target.
function go(h, view, focus) { const p = h.ui.pods; p.view = view; p.focusView = view; p.focus.set(focus ?? initialFocus(h, view)); }

function identify(h, p) {
  const r = S.identify(h.st, p, h.settings); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  h.play({ kind: "seal", target: p.id, ms: ID_MS, hold: true });   // the seal clears over 2 s, whether or not the species is new
  if (r.newSp) h.play({ kind: "ribbon", target: p.id, ms: RIBBON_MS + Math.round(ID_MS * 0.7), from: Math.round(ID_MS * 0.7) });
  h.save(); return r;
}
function read(h, p, ch) {
  const r = S.read(h.st, p, ch.id, h.settings); if (!r.ok) { if (r.msg) h.say(r.msg); return r; }
  h.play({ kind: "wipe", target: p.id, chapter: ch.id, ms: READ_MS, hold: true }); h.save(); return r;
}
// ✓ on a target, by its group.
const CONFIRM = {
  place: (h, q, id) => { const p = h.ui.pods; p.cur = h.st.tray[+id.slice(6)].id; go(h, "overview", "pod"); },   // Open: the pod's overview
  // ✓ on the pod: before Identify it identifies; once identified it opens Create (the line reads "Shape a founder", dimmed by what stops it), whatever has been read
  pod: (h, q) => { if (!q.idd) return identify(h, q); openCreate(h, q); },
  rail: (h, q, id) => {
    const p = h.ui.pods, ch = chaptersOf(q)[+id.slice(5)]; if (!ch) return;
    p.ci = +id.slice(5);
    if (p.view === "overview") return go(h, "chapter", id);   // ✓ on a tab opens its page, free
    return read(h, q, ch);   // on the page, ✓ reads an unread chapter (a read chapter has no ✓)
  },
  kin: (h, q, id) => { const k = kinOf(h, q)[+id.slice(4)]; if (k) h.ui.pods.cmp = { a: q.id, b: k.id, ci: 0 }; },
  hatch: (h, q) => {   // ✓ ✓: the first arms, the second returns; any other key disarms
    const p = h.ui.pods;
    if (!p.wildArm) { p.wildArm = 1; h.say(h.specs.pods.strings.hatchAgain); return; }
    p.wildArm = 0; S.returnPod(h.st, q, h.settings, h.now()); p.cur = null; go(h, "collection"); h.save();
  },
};
// `target`: the focused target's id; `verb`: confirm | back | step:left | step:right (the pad's other directions are the face's, and nothing reaches the host).
export function intent(h, target, verb) {
  const p = h.ui.pods;
  if (p.cmp) {   // Compare: ◀ ▶ step the chapters on both pages and the ring follows to the tab; ← closes it and the ring lands on the kin that opened it (else the pod); nothing else
    if (verb === "back") {
      const m = { st: h.st, settings: h.settings, ui: { ...h.ui.pods }, focus: null }, to = compareBackFocus(m, h.specs.pods, h.specs.frame) ?? "pod";
      p.cmp = null; go(h, "overview", to);
    } else if (verb === "step:left" || verb === "step:right") {
      const n = chaptersOf(h.st.tray.find((q) => q.id === p.cmp.a)).length;
      p.cmp.ci = clamp(p.cmp.ci + (verb === "step:right" ? 1 : -1), 0, Math.max(0, n - 1)); p.focus.set("rail." + p.cmp.ci);
    }
    return;
  }
  if (verb !== "confirm") p.wildArm = 0;   // any other key disarms the hatch
  if (verb === "back") {   // ← always goes up one level
    if (p.view === "collection") h.goto("home");
    else if (p.view === "overview") go(h, "collection", placeOf(h.st, p.cur));
    else go(h, "overview", "rail." + (p.ci || 0));
    return;
  }
  const q = h.st.tray.find((x) => x.id === p.cur); if (verb !== "confirm" || !q || !target) return;
  return CONFIRM[target.split(".")[0]]?.(h, q, target);
}
