// The namer as an overlay (namer.json; lvgl-switch.md §2.2), in Node: the view's props (views/namer-props.mjs) validate against namer.props.json in every field state, on both pages and in both cases, name no rectangle, and list the targets as the spec's graph
// expects (the keys the page draws, then shift, space, page, done, suggest); the intents (intents/namer.mjs) type, delete, clear, suggest, refuse in words and save by the rules: Keep writes nothing, a rename follows its references.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { namerBuild } from "../src/views/namer-props.mjs";
import { INTENTS } from "../src/intents/index.mjs";
import { openNamer } from "../src/intents/namer.mjs";
import { validate } from "./habitat-props.test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("namer.json"), frameSpec = J("frame.json"), schema = J("namer.props.json");
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 8 };
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; S.seedAdults(st, "S01", 5, 3, settings); return st; };
function host(st) {
  const h = { st, sv: { v: 8, carried: [], carryReqs: [] }, settings, ui: { hab: { id: null, f: "resident", wildArm: 0, namer: null, prev: null }, screen: "habitat" }, specs: { namer: spec, frame: frameSpec }, said: [], played: [], timers: [], saved: 0, now: () => T0, moving: true };
  Object.assign(h, { motion: () => h.moving, say: (t) => h.said.push(t), goto: () => {}, play: (e) => h.played.push(e), at: (ms, fn) => h.timers.push({ ms, fn }), save: () => { h.saved++; } });
  return h;
}
const press = (h, target, verb = "confirm") => INTENTS.namer.intent(h, target, verb);
const view = (h) => namerBuild({ st: h.st, mibi: h.st.mibis[0], ui: h.ui.hab.namer }, spec);

test("the overlay's props validate against namer.props.json in every field state, on both pages and in both cases, name no rectangle and fit the budget", () => {
  const st = world(), h = host(st), m = st.mibis[0]; openNamer(h, m, "meet");
  for (const [fs, text, page, shift] of [["selected", m.name, "letters", false], ["typed", "Mo", "letters", false], ["typed", "Mo", "letters", true], ["typed", "Mo", "accents", false], ["empty", "", "letters", false], ["empty", "", "accents", false], ["typed", "Wwwwwwwwww", "letters", false]]) {
    Object.assign(h.ui.hab.namer, { fs, text, page, shift }); const v = view(h), bad = validate(v.overlay, schema, schema);
    assert.deepEqual(bad, [], `${fs} ${page}: ${bad.slice(0, 3).join("; ")}`);
    const json = JSON.stringify(v.overlay); assert.ok(!/"(x|y|w|h|rect|at|size|box|pitch)"\s*:/.test(json), "props name what, never where"); assert.ok(json.length + JSON.stringify(v.line).length < 4 * 1024, `${json.length} bytes`);
    assert.deepEqual(v.overlay.focus.targets.map((t) => t.id), [...v.overlay.regions.keys.labels.flatMap((c, i) => (c == null ? [] : ["key." + i])), "mod.shift", "mod.space", "mod.page", "act.done", "act.suggest"], "the keys the page draws, then the modifiers and the actions");
  }
});

test("the grid's case: capitals while the field is empty or selected, small letters when typed, Aa gives the next letter in the other case; the accents page has its null slots and Œ Ÿ in capitals; the page key shows the other page in the grid's case", () => {
  const st = world(), h = host(st), m = st.mibis[0]; openNamer(h, m, "rename"); const n = h.ui.hab.namer;
  let k = view(h).overlay.regions.keys; assert.equal(k.caps, true); assert.deepEqual(k.labels.slice(0, 3), ["A", "B", "C"]); assert.equal(k.labels[26], "-"); assert.equal(k.labels[27], "’"); assert.equal(view(h).overlay.regions.page.label, "ÀÉÑ");
  Object.assign(n, { fs: "typed", text: "Mo" }); k = view(h).overlay.regions.keys; assert.equal(k.caps, false); assert.deepEqual(k.labels.slice(0, 3), ["a", "b", "c"]); assert.equal(view(h).overlay.regions.page.label, "àéñ");
  n.shift = true; assert.equal(view(h).overlay.regions.keys.labels[0], "A"); assert.equal(view(h).overlay.regions.shift.on, true);
  Object.assign(n, { page: "accents", shift: false }); k = view(h).overlay.regions.keys; assert.deepEqual(k.labels.slice(0, 7), ["á", "é", "í", "ó", "ú", "ç", null]); assert.equal(k.labels[19], "œ"); assert.equal(view(h).overlay.regions.page.label, "abc");
  n.shift = true; k = view(h).overlay.regions.keys; assert.equal(k.labels[19], "Œ"); assert.equal(k.labels[26], "Ÿ"); assert.equal(view(h).overlay.focus.targets.filter((t) => t.id.startsWith("key.")).length, 24, "the empty seventh column is not drawn and not a target");
  Object.assign(n, { fs: "selected", shift: true }); assert.equal(view(h).overlay.regions.shift.on, false, "at the start of a name Aa shows off and does nothing");
});

test("typing: a key replaces a selection and appends to typed text, the first letter a capital, the grid then small letters; ← clears a selection, deletes the last letter, and closes an empty field writing nothing", () => {
  const st = world(), h = host(st), m = st.mibis[0], was = m.name; openNamer(h, m, "meet"); const n = h.ui.hab.namer;
  press(h, "key.12"); assert.deepEqual([n.text, n.fs], ["M", "typed"], "M: the grid was capitals"); press(h, "key.14"); assert.equal(n.text, "Mo", "o: small letters now");
  press(h, "mod.shift"); press(h, "key.14"); assert.equal(n.text, "MoO", "Aa then a letter: the other case once"); assert.equal(n.shift, false, "after one letter the grid returns");
  press(h, "mod.page"); assert.equal(n.page, "accents"); press(h, "key.0"); assert.equal(n.text, "MoOá", "the accents page"); press(h, "mod.page"); assert.equal(n.page, "letters");
  press(h, "x", "back"); assert.equal(n.text, "MoO"); press(h, "x", "back"); press(h, "x", "back"); press(h, "x", "back"); assert.deepEqual([n.text, n.fs], ["", "empty"]);
  press(h, "x", "back"); assert.equal(h.ui.hab.namer, null, "an empty field closes the namer"); assert.equal(m.name, was, "writing nothing"); assert.deepEqual([h.saved, h.played], [0, []]); assert.equal(h.ui.hab.f, "resident", "after the meet: the ring on the resident");
  openNamer(h, m, "rename"); press(h, "x", "back"); assert.deepEqual([h.ui.hab.namer.text, h.ui.hab.namer.fs], ["", "empty"], "a selection is cleared"); press(h, "x", "back"); assert.equal(h.ui.hab.f, "name", "after a rename: the ring on the name");
});

test("refusals in words: a mark first or beside another mark, a character past the limit; the say line turns amber for the plate's time; Done refuses a short name, a species' or a clan's name and a holder's, a mark last", () => {
  const st = world(), h = host(st), m = st.mibis[0], other = st.mibis[1]; openNamer(h, m, "rename"); const n = h.ui.hab.namer, R = spec.strings.refuse;
  press(h, "mod.space"); assert.deepEqual([n.say.text, n.say.tone, n.text], [R.first, "refused", m.name], "a mark on a selection: refused, nothing typed"); assert.deepEqual(h.timers.map((t) => t.ms), [frameSpec.regions.plate.showMs]); h.timers[0].fn(); assert.equal(n.say, null, "back to the reason after 4 s");
  Object.assign(n, { fs: "typed", text: "Ab-" }); press(h, "key.26"); assert.equal(n.say.text, R.twice); n.say = null;
  Object.assign(n, { fs: "typed", text: "Wwwwwwwwww" }); press(h, "key.0"); assert.equal(n.say.text, R.full); assert.equal(view(h).overlay.regions.keys.dim, true); assert.equal(view(h).overlay.regions.space.dim, true);
  Object.assign(n, { fs: "typed", text: "A", say: null }); assert.equal(view(h).overlay.regions.say.text, R.short, "shown while the name has fewer than two letters"); assert.equal(view(h).overlay.regions.done.dim, true); press(h, "act.done"); assert.equal(n.say.tone, "refused"); assert.equal(h.ui.hab.namer, n, "nothing closes");
  for (const [text, why] of [["Loika", R.species], ["Lophessa", R.clan], [other.name, R.taken.replace("{holder}", other.name)], ["Ab c-", R.last]]) { Object.assign(n, { fs: "typed", text, say: null }); press(h, "act.done"); assert.equal(n.say.text, why, text); assert.equal(m.name === text, false); }
});

test("Suggest: the next name of the pool each press, selected, nothing consumed, the first again after the twelfth; Done: Keep writes nothing, a new name is saved with the flash and the ring handed back, a change of case alone is a rename", () => {
  const st = world(), h = host(st), m = st.mibis[0]; openNamer(h, m, "meet"); const n = h.ui.hab.namer, used = [...st.namesUsed], pool = S.peekNames(st, m, 12);
  press(h, "act.suggest"); assert.deepEqual([n.text, n.fs], [pool[0], "selected"]); press(h, "act.suggest"); assert.equal(n.text, pool[1]); for (let i = 0; i < 11; i++) press(h, "act.suggest"); assert.equal(n.text, pool[0], "after the last the first"); assert.deepEqual(st.namesUsed, used, "nothing is consumed");
  Object.assign(n, { text: m.name, fs: "selected" }); const before = st.log?.length ?? 0; press(h, "act.done"); assert.equal(h.ui.hab.namer, null); assert.equal(m.name, S.mibiById(st, m.id).name); assert.deepEqual([h.saved, h.played, (st.log?.length ?? 0) - before], [0, [], 0], "Keep writes and logs nothing");
  openNamer(h, m, "rename"); Object.assign(h.ui.hab.namer, { text: "Zinnia", fs: "typed" }); press(h, "act.done"); assert.equal(m.name, "Zinnia"); assert.equal(h.saved, 1); assert.deepEqual(h.played.at(-1), { kind: "flash", target: "nameTag", ms: 240, hold: 240 }); assert.equal(h.ui.hab.f, "name");
  openNamer(h, m, "rename"); Object.assign(h.ui.hab.namer, { text: "ZINNIA", fs: "typed" }); press(h, "act.done"); assert.equal(m.name, "ZINNIA", "a change of case only is a rename");
  h.moving = false; openNamer(h, m, "rename"); Object.assign(h.ui.hab.namer, { text: "Opal", fs: "typed" }); press(h, "act.done"); assert.equal(h.played.at(-1).hold, 0, "reduced motion: no hold");
});

test("the bottom line follows the ring: ✓ Type c (the mark's words), Capitals / Small letters (none at the start), Accents / Letters, Suggest a name / Another name, Name it {name} / Keep {name}; the way back by the field's state; the context names the species", () => {
  const st = world(), h = host(st), m = st.mibis[0]; openNamer(h, m, "meet"); const n = h.ui.hab.namer, L = (f) => { n.f = f; return view(h).line; };
  assert.deepEqual([L("act.done").ok, L("act.done").subject, L("act.done").back], [`Keep ${m.name}`, "a name for your Loika", "Clear"]);
  assert.equal(L("key.0").ok, "Type A"); assert.equal(L("mod.space").ok, "Type a space"); assert.equal(L("mod.shift").ok, null); assert.equal(L("mod.shift").subject, "a name starts with a capital");
  assert.equal(L("mod.page").ok, "Accents"); assert.equal(L("act.suggest").ok, "Suggest a name"); n.sugg = 0; assert.equal(L("act.suggest").ok, "Another name");
  Object.assign(n, { fs: "typed", text: "Zinnia" }); assert.equal(L("act.done").ok, "Name it Zinnia"); assert.equal(L("act.done").back, "Delete"); assert.equal(L("mod.shift").ok, "Capitals"); n.shift = true; assert.equal(L("mod.shift").ok, "Small letters");
  Object.assign(n, { fs: "typed", text: "A" }); assert.equal(L("act.done").dim, true, "the name cannot be saved"); Object.assign(n, { fs: "empty", text: "" }); assert.equal(L("act.done").back, spec.strings.backLeave);
  Object.assign(n, { fs: "typed", text: "Wwwwwwwwww" }); assert.equal(L("key.1").dim, true, "a full field dims the letter's ✓ cap");
});
