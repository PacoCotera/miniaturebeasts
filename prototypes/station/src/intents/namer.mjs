// The namer, an overlay over one mibi up close (namer.json): the state is `h.ui.hab.namer` while it is open, null otherwise. The keys, the modifier keys and the two actions are targets of its own graph (the face walks it);
// ✓ and ← on them are the intents here, with `screen: "namer"`. Nothing is written until Done; a room key or Idle closes it, writing nothing (intents/frame.mjs). The only event is `named`, the flash.
import * as S from "../state.mjs";
import { MARKS, gridOf, full } from "../views/namer-props.mjs";

const fill = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => (k in o ? o[k] : "{" + k + "}"));
// Opens over the mibi up close: the field holds its name selected, capitals, the letters page, the ring on Done (focus.initial). `mode`: "meet" (the first ✓ of the meet) or "rename" (✓ on the name tag).
export function openNamer(h, mibi, mode) {
  h.ui.hab.namer = { mode, id: mibi.id, text: mibi.name, fs: "selected", page: "letters", shift: false, f: "act.done", say: null, sugg: -1 };
}
// Closes: nothing written. The ring goes back to the screen beneath: the resident after the meet, the name after a rename (habitat.json focus.entry.namerClosed).
export function closeNamer(h) {
  const n = h.ui.hab.namer; if (!n) return; h.ui.hab.namer = null; h.ui.hab.f = n.mode === "meet" ? "resident" : "name";
}
const mibiOf = (h, n) => S.mibiById(h.st, n.id);
// A refused press: the reason in amber for the message plate's time (frame.json regions.plate.showMs), then the line returns to what the field says.
function refuse(h, n, text) {
  const say = { text, tone: "refused" }; n.say = say;
  h.at(h.specs.frame.regions.plate.showMs, () => { if (h.ui.hab.namer === n && n.say === say) n.say = null; });
}
// A character typed: it replaces a selection, is appended to typed text and starts an empty field; a mark first or beside another mark and anything past NAME_MAX is refused in words.
function type(h, n, c) {
  const Sg = h.specs.namer.strings.refuse, mark = MARKS.includes(c), typed = n.fs === "typed" ? n.text : "";
  if (mark && (!typed.length)) return refuse(h, n, Sg.first);
  if (mark && MARKS.includes([...typed].at(-1))) return refuse(h, n, Sg.twice);
  if (n.fs === "typed" && full(n)) return refuse(h, n, Sg.full);
  n.text = typed + c; n.fs = "typed"; n.shift = false; n.say = null; n.sugg = -1;   // after one letter the grid returns to small letters
}

// `target`: key.<i> | mod.shift | mod.space | mod.page | act.done | act.suggest.
export function intent(h, target, verb) {
  const n = h.ui.hab.namer; if (!n) return;
  const spec = h.specs.namer, m = mibiOf(h, n); if (!m) { closeNamer(h); return; }
  n.f = target;
  if (verb === "back") {   // a selection is cleared, typed text loses its last character, an empty field closes the namer writing nothing
    if (n.fs === "selected") { n.text = ""; n.fs = "empty"; n.say = null; n.sugg = -1; }
    else if (n.fs === "typed") { n.text = [...n.text].slice(0, -1).join(""); n.fs = n.text.length ? "typed" : "empty"; n.say = null; n.sugg = -1; }
    else closeNamer(h);
    return;
  }
  if (verb !== "confirm") return;
  if (target.startsWith("key.")) { const c = gridOf(spec, n)[+target.slice(4)]; if (c != null) type(h, n, c); }
  else if (target === "mod.shift") { if (n.fs === "typed") n.shift = !n.shift; }   // at the start of a name it does nothing
  else if (target === "mod.space") type(h, n, " ");
  else if (target === "mod.page") n.page = n.page === "letters" ? "accents" : "letters";
  else if (target === "act.suggest") {
    const names = S.peekNames(h.st, m, 12); if (!names.length) return;
    n.sugg = (n.sugg + 1) % names.length; n.text = names[n.sugg]; n.fs = "selected"; n.say = null;
  }
  else if (target === "act.done") {
    const why = S.nameProblem(h.st, m, n.text, true);
    if (why) { const R = spec.strings.refuse; refuse(h, n, fill(R[why.key], { holder: why.holder ?? "" })); return; }
    const r = S.renameMibi(h.st, m, n.text); if (!r.ok) return;
    closeNamer(h);
    if (!r.kept) { h.save(); const e = h.specs.namer.events.named; h.play({ kind: e.kind, target: h.specs.habitat.events.named.target, ms: e.ms, hold: h.motion() ? e.hold : 0 }); }   // the name stands with the frame's 240 ms flash behind it; reduced motion: no flash
  }
}
