// The namer as an overlay's props (namer.json; lvgl-switch.md §2.2): the field, the say line, the keys in the grid's case, the three modifier keys and the two actions, with the ring's targets and the bottom line (the frame's, built here from
// namer.json bottomLine). Props name *what*, never *where*: strings, states, one-character labels in the right case (the host maps the case: the face has no Unicode case mapping), flags and the targets by id.
// Runs in Node, tested there (tests/namer-props.test.mjs); the shape is namer.props.json.
//   m: { st, mibi (the mibi being named), ui: UI.hab.namer { mode: "meet" | "rename", text, fs: "selected" | "typed" | "empty", page: "letters" | "accents", shift, f, say: { text, tone } | null, sugg } }
import * as S from "../state.mjs";
import { fill } from "./words.mjs";
import { req as reqOf, slot as slotOf, plateDevice } from "./requests.mjs";

export const MARKS = [" ", "-", "’"];
// The grid's case: capitals while the field is empty or selected (a name starts with a capital), small letters after; Aa gives the next letter in the other case. The hyphen and ’ have no case.
export const capsOf = (ui) => (ui.fs === "typed" ? !!ui.shift : true);
export const gridOf = (spec, ui) => spec.keys.pages[ui.page].map((c) => (c == null ? null : capsOf(ui) ? c.toUpperCase() : c));
export const length = (ui) => [...ui.text].length;
// The field is full when a letter would be refused: at NAME_MAX typed characters (a selection is replaced by a key, never full).
export const full = (ui) => ui.fs !== "selected" && length(ui) >= S.NAME_MAX;
// What the say line gives while the name cannot be saved (the reason, not the mark last, which only Done refuses), in words.
export function reasonOf(spec, st, mibi, text) {
  const why = S.nameProblem(st, mibi, text, false); if (!why) return null;
  return fill(spec.strings.refuse[why.key], { holder: why.holder ?? "" });
}

export function namerBuild(m, spec) {
  const { st, mibi, ui } = m, Sg = spec.strings, sk = Sg.keys, caps = capsOf(ui), labels = gridOf(spec, ui), isFull = full(ui);
  const problem = S.nameProblem(st, mibi, ui.text, true), species = S.spName(mibi);
  const reason = ui.say ? ui.say.text : reasonOf(spec, st, mibi, ui.text);
  const names = S.peekNames(st, mibi, 12), startOfName = ui.fs !== "typed";
  const requests = [], req = reqOf(requests), slot = slotOf(req, "the device plate (fix 2: placed 1:1)");
  const regions = {
    panel: { plate: req(plateDevice(416, 424)) },
    field: { plate: slot("plate-well-328x48", [328, 48]), name: ui.text, state: ui.fs },
    say: { text: reason ?? "", tone: ui.say?.tone === "refused" ? "refused" : "reason" },
    keys: { page: ui.page, caps, dim: isFull, labels },
    shift: { on: ui.fs === "typed" && !!ui.shift },
    space: { dim: isFull },
    page: { label: ((l) => (caps ? l.toUpperCase() : l))(ui.page === "letters" ? sk.accents : sk.letters) },   // the other page's label, in the grid's case
    done: { dim: !!problem },
    suggest: {},
  };
  // the targets in the order the spec gives: the keys the page draws, then shift, space, page, done, suggest
  const targets = [];
  labels.forEach((c, i) => { if (c != null) targets.push({ id: "key." + i, enabled: !isFull }); });
  targets.push({ id: "mod.shift", enabled: ui.fs === "typed" }, { id: "mod.space", enabled: !isFull }, { id: "mod.page", enabled: true }, { id: "act.done", enabled: !problem }, { id: "act.suggest", enabled: names.length > 0 });
  const cur = ui.f && targets.some((t) => t.id === ui.f) ? ui.f : "act.done";
  // the bottom line (namer.json bottomLine): the action and the context of the ring's target, the way back by the field's state (an empty field leaves with the mibi's saved name; the frame reads Back when it does not fit, frame.json nameBack)
  const back = ui.fs === "selected" ? Sg.backClear : ui.fs === "typed" ? Sg.backDelete : fill(Sg.backLeave, { name: mibi.name }), ctx = fill(Sg.context, { Species: species });
  let line = { ok: null, subject: ctx, back, need: null };
  if (cur.startsWith("key.")) { const c = labels[+cur.slice(4)], word = c === " " ? Sg.typeSpace : c === "-" ? Sg.typeDash : c === "’" ? Sg.typeApostrophe : fill(Sg.type, { c }); line = { ok: word, ...(isFull ? { dim: true } : {}), subject: ctx, back, need: null }; }
  else if (cur === "mod.shift") line = startOfName ? { ok: null, subject: Sg.startCapital, back, need: null } : { ok: caps ? Sg.smallLetters : Sg.capitals, subject: ctx, back, need: null };
  else if (cur === "mod.space") line = { ok: Sg.typeSpace, ...(isFull ? { dim: true } : {}), subject: ctx, back, need: null };
  else if (cur === "mod.page") line = { ok: ui.page === "letters" ? Sg.accents : Sg.letters, subject: ctx, back, need: null };
  else if (cur === "act.suggest") line = names.length ? { ok: ui.sugg >= 0 ? Sg.suggestAgain : Sg.suggest, subject: ctx, back, need: null } : { ok: null, subject: Sg.noSuggest, back, need: null };
  else if (cur === "act.done") line = { ok: problem ? null : ui.text === mibi.name ? fill(Sg.keep, { name: ui.text }) : fill(Sg.name, { name: ui.text }), subject: ctx, back, need: null };
  return { overlay: { id: "namer", state: "open", regions, focus: { cur, targets } }, line, requests };
}
