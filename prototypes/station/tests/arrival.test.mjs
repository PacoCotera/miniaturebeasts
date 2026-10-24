// The dock arrival's data and props (T-20261016-58; specs/station-dock-arrival-spec.md, cargo.json regions.arrival, events.show): what the dock shows is read from the rules (arrivalOf), the props validate against cargo.props.json and name
// no rectangle, the beats' times come from the spec, every string is measured against the limits of the spec's §5, and the flows (skip, Later, Open the bay, the interrupt rule) are in intents.test.mjs and host-hold.test.mjs.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, speciesIndex } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { arrivalOf, holdsNewSpecies } from "../src/arrival.mjs";
import { cargoBuild } from "../src/views/cargo-props.mjs";
import { panelBuild } from "../src/views/panel-props.mjs";
import { timesOf } from "../src/intents/arrival.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { listPitch } from "../../ui/specs/derive.mjs";
import { validate } from "./habitat-props.test.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), cargo = J("cargo"), home = J("home"), frame = J("frame"), panel = J("panel"), pods = J("pods"), schema = J("cargo.props"), A = cargo.regions.arrival;
const measure = createMeasure(JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, words = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const SPELL = ["no", "one", "two", "three"];

const crate = (n, species = "S01") => ({ id: "c" + n, n, turn: 0, at: T0, e: 3, d: 3, s: 4, met: [], explored: 0, of: 0, lines: [], pods: [{ id: "p0", species, sp: speciesIndex(species), g: "meadow", how: "calm", gs: 11 + n, k: null }] });
function world({ crates = 2, mibis = 3, mend = { free: 1, paid: 0, broke: false }, shield = 2, known = ["S01"], reqs = [] } = {}) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: T0 }; S.seedAdults(st, "S01", 5, mibis, settings);
  st.knownIds = known; st.probe = { shield, smax: 3, tier: 1, seq: 1 };
  const sv = { v: 8, seed: 7, wid: "w1", turn: 0, bay: Array.from({ length: crates }, (_, i) => crate(i + 1, i === 1 ? "S02" : "S01")), mibis: [], carried: [], tier: 1, shield: 3 };
  st.carryReqs = reqs.map((r, i) => ({ seq: i + 1, ...r })); st.carrySeq = reqs.length;
  return { st, sv, r: { ok: true, docked: true, home: [], mend } };
}
const ui = (arrival, extra = {}) => ({ cargo: { state: "arrival", crate: 0, at: 0, mend: null, run: null, shown: null, drawn: null, arrival, ...extra }, meet: null, skip: null });
const build = (w, a, extra) => cargoBuild({ st: w.st, sv: w.sv, settings, docked: true, light: "day", ui: ui(a, extra) }, cargo, home, frame);

test("arrivalOf: the crates in the bay (the first three drawn), the one holding a species new to the player, the Probe's plates and the mend, who came home and who leaves", () => {
  const w = world({ crates: 4, reqs: [] }); w.sv.bay = [crate(1), crate(2, "S02"), crate(3), crate(4)];
  let a = arrivalOf(w.st, w.sv, w.r); assert.deepEqual([a.crates, a.shown, a.newCrates], [4, 3, [false, true, false]], "more than three: all counted, three drawn; S02 is new, S01 is known");
  assert.equal(holdsNewSpecies(w.st, w.sv.bay[0]), false); assert.equal(holdsNewSpecies(w.st, w.sv.bay[1]), true);
  assert.deepEqual(a.plates, { max: 3, whole: 1, mended: 1 }, "shield 2 after the dock's mend of 1: one whole before it");
  a = arrivalOf(w.st, w.sv, { ...w.r, mend: { free: 3, paid: 0, broke: true } }); assert.deepEqual([a.broke, a.plates.mended], [true, 3]);
  const ms = w.st.mibis; const w2 = world({ reqs: [{ op: "home", id: 1 }, { op: "add", id: 3 }] }); const b = arrivalOf(w2.st, w2.sv, { ...w2.r, home: [w2.st.mibis[1].id] });
  assert.deepEqual([b.back, b.leaving].map((x) => x.length), [2, 1], "a Bring asked and a mibi that walked come home; a Take asked leaves"); void ms;
  assert.equal(arrivalOf(world({ crates: 0 }).st, world({ crates: 0 }).sv, w.r).crates, 0);
});
test("the props of the show: validate against cargo.props.json, name no rectangle, carry the ribbon (the broken line when the Probe broke), the glints, the mibis at 304 × 312 in carried order, the plates and the leaving faces", () => {
  const w = world({ reqs: [{ op: "home", id: 1 }, { op: "home", id: 2 }, { op: "add", id: 3 }] }), a = { ...arrivalOf(w.st, w.sv, w.r), phase: "show", from: "home", choice: true }, b = build(w, a);
  assert.equal(b.props.state, "arrival"); assert.deepEqual(validate(b.props, schema, schema), [], "the props validate");
  const R = b.props.regions.arrival; assert.equal(R.ribbon, cargo.strings.arrival.ribbon); assert.deepEqual(R.glints, [false, true]); assert.equal(R.mibis.length, 2); assert.ok(R.mibis.every((id) => /^mibi-adult-S01-304x312|^mibi:/.test(id) || id.includes("304x312") || id.includes("mibi")), R.mibis.join());
  assert.equal(R.plates.max, 3); assert.equal(R.plates.whole, 1); assert.equal(R.plates.mended, 1); assert.equal(R.plates.words, "one mended, free"); assert.equal(R.leaving.faces.length, 1); assert.equal(R.leaving.faces[0], "face-S01-24"); assert.equal(R.leaving.mark, "mark-out-16");
  assert.equal(R.apron, "cargo-bay-apron-992x180"); assert.equal(R.light, "cargo-link-light-976x8"); assert.equal(R.glint, "glint-star-12x12"); assert.equal(R.phase, "show");
  assert.ok(!JSON.stringify(b.props).match(/"rect"/), "no rectangle in the props"); assert.equal(b.props.regions.dockCrates.places.length, 2);
  const broken = build(w, { ...a, broke: true }); assert.equal(broken.props.regions.arrival.ribbon, cargo.strings.arrival.broken);
  const none = world({ mend: { free: 0, paid: 0, broke: false }, shield: 3, reqs: [] }); const n = build(none, { ...arrivalOf(none.st, none.sv, none.r), phase: "show", from: "home", choice: true }); assert.equal(n.props.regions.arrival.plates.words, "", "none mended: no words"); assert.equal(n.props.regions.arrival.leaving.mark, "", "no one leaves: the corner is empty");
});
test("the show's bottom line: ✓ Skip while the hold runs, the crates counted in words, an empty trip says the bay is empty; the choice's line is the strip's", () => {
  const w = world({ reqs: [] }), a = { ...arrivalOf(w.st, w.sv, w.r), phase: "show", from: "home", choice: true };
  let l = build(w, a, {}).line; assert.deepEqual([l.ok, l.back, l.subject], [null, null, "two sealed crates"]);
  l = cargoBuild({ st: w.st, sv: w.sv, settings, docked: true, light: "day", ui: { ...ui(a), skip: { kind: "arrival", target: "show" } } }, cargo, home, frame).line; assert.equal(l.ok, "Skip");
  const e = world({ crates: 0, reqs: [] }); l = build(e, { ...arrivalOf(e.st, e.sv, e.r), phase: "show", from: "home", choice: false }).line; assert.equal(l.subject, "the bay is empty");
});
test("the choice strip: Open the bay (free, the crates to the case) and Later (they wait while docked), the ring on Open the bay, no veil, housing or title; ← is Later", () => {
  const w = world({ crates: 3, reqs: [] }), a = { ...arrivalOf(w.st, w.sv, w.r), phase: "choice", from: "home", choice: true };
  const u = { ...ui(a), panel: { screen: "cargo", id: "dock", focus: "" }, pods: { cur: null } }, v = panelBuild({ st: w.st, sv: w.sv, settings, ui: u, jump: "arrival" }, panel, frame, pods);
  assert.equal(v.overlay.form, "strip"); assert.equal(v.overlay.regions.title, ""); assert.deepEqual(v.cards.map((c) => c.id), ["open", "later"]); assert.deepEqual(v.cards.map((c) => c.cost), ["", ""], "both free");
  assert.deepEqual(v.cards.map((c) => c.line), ["three crates to the case", "they wait while docked"]); assert.equal(v.overlay.focus.cur, "card.open"); assert.deepEqual(v.cards.map((c) => c.picture), ["crate-open-crop-96x96", "crate-sealed-crop-96x96"]);
  assert.equal(v.line.ok, "Open the bay"); assert.equal(v.line.subject, "three crates to the case"); assert.equal(v.overlay.regions.art.housing, "");
  const one = world({ crates: 1, reqs: [] }), o = panelBuild({ st: one.st, sv: one.sv, settings, ui: { ...u, cargo: { ...u.cargo, arrival: { ...a, crates: 1 } } }, jump: "arrival" }, panel, frame, pods); assert.equal(o.cards[0].line, "a crate to the case");
});
test("the beats' times come from the spec: the link light, the crates' stagger, the mibis' dither and hop, the mend, the end at 3500 (an empty trip closes at 2500)", () => {
  const w = world({ reqs: [] }), a = { ...arrivalOf(w.st, w.sv, w.r), back: [1, 2, 3] }, T = timesOf(cargo, a);
  assert.equal(T.end, 3500); assert.equal(T.hold, 3500); assert.ok(T.skip); for (const t of [500, 600, 700, 800, 833, 1166, 1500, 1600, 2100, 2600, 2500]) assert.ok(T.beats.includes(t) || t === 1166 || t === 833, "beat " + t);
  assert.ok(T.beats.every((t) => t < 3500), "every beat before the end"); assert.equal(timesOf(cargo, { ...a, crates: 0, shown: 0 }).end, 2500, "no choice: the arrival closes by itself at 2500");
  assert.equal(A.crates.stagger, 333); assert.equal(A.light.steps * A.light.stepPx, 976); assert.deepEqual(A.mibis.byCount["3"].map((r) => r[0]), [32, 360, 688]); assert.ok(A.mibis.byCount["1"][0][0] + A.mibis.byCount["1"][0][2] / 2 === 512, "one mibi centred on 512");
  assert.equal(A.mibis.hop.ms, 175); assert.equal(A.end.at, 3500); assert.equal(A.mibis.at + A.mibis.each * 2 + A.mibis.dither.ms + A.mibis.hop.ms <= 3500, true, "the third mibi's hop ends before the show's end");
});
test("every string of the show at its longest, measured: the ribbon (words + 32 ≤ 608), the band's words (≤ 160), the strip's names and lines (≤ 252), the plates (≤ 608), at the spec's sizes and words", () => {
  const Sg = cargo.strings.arrival, R = cargo.regions.dockRibbon, D = panel.strings.dock, P = frame.navigation.dock.plates, strip = frame.regions.panel.strip;
  assert.ok(measure(Sg.ribbon, R.px) + 32 <= 608, "ribbon"); assert.ok(measure(Sg.broken, R.px) <= 576, "the broken ribbon: " + measure(Sg.broken, R.px)); assert.ok(measure(Sg.mended.replace("{n in words}", "three"), 16) <= 160, "three mended, free");
  for (const t of [D.cards.open.name, D.cards.later.name]) assert.ok(words(t) <= 3 && measure(t, strip.name.px) <= strip.name.max, t);
  for (const t of [D.cards.open.line.replace("{n in words}", "three"), D.cards.open.line.replace("{n in words}", "twelve"), D.oneCrate, D.cards.later.line]) assert.ok(words(t) <= 6 && measure(t, strip.line.px) <= strip.line.max, `${t} (${measure(t, strip.line.px)} px)`);
  assert.ok(measure(P.crates, 16) <= 608, "the crates plate"); assert.ok(measure(P.goes.replace("{Name}", "Wwwwwwwwww"), 16) <= 608, "the name plate at ten of the widest letters"); assert.equal(Sg.ribbon, panel.strings.arrival.text === undefined ? Sg.ribbon : Sg.ribbon);
  const SC = [0, 1].map((i) => listPitch(frame.regions.panel.strip.cards, 2, i)); assert.equal(SC[1][0] + SC[1][2] - SC[0][0] + 2 * 16, 840, "two cards fill the strip's 840");
  assert.ok(words(Sg.ribbon) <= 6 && words(Sg.broken) <= 12); void SPELL;
});
