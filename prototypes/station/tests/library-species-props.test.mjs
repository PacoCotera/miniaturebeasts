// The Library's Level 2 as props (library.json l2): views/library-props.mjs speciesBuild, in Node. Plain JSON that names what and never where (the only positions are the generator's facts in sheet or page coordinates):
// it validates against library-species.props.json; the targets are the open plates then the shelf (sheet) or the lit chapter's found looks (lit), none on met-only; the ring starts on ui.lib.l2[species] or the first open
// chapter; the line's verbs and subjects are library.json l2.strings, the carried-by ladder measured with the face's metrics; the props never name a picture that is not made (the Library 3 gate's P1): the species' last sheet
// or the quiet stand-in for a sheet, the unlit sheet for a lit variant, nothing for a page. Level 1's cells the same way (the Library 2 gate's F5). The face of a portrayed mibi keeps its portrait's stage (F4).
//   node --test prototypes/station/tests/library-species-props.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import { currentLooks } from "../../workbench/framework/describe.mjs";
import * as S from "../src/state.mjs";
import * as Lib from "../src/library.mjs";
import { speciesBuild, libraryBuild, carriedLine } from "../src/views/library-props.mjs";
import { sheetInput } from "../src/views/specimen-props.mjs";
import { sheetFacts, speciesFacts } from "../src/library-sheet.mjs";
import { sheetId, quietId, litId, pageId } from "../src/views/requests.mjs";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { INTENTS } from "../src/intents/index.mjs";
import { moveFocus } from "../../ui/focus.mjs";
import { targetBox } from "../../face/tools/library-species-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("library.json"), frameSpec = J("frame.json"), schema = J("library-species.props.json"), Sg = spec.l2.strings;
const metrics = JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")), measure = createMeasure(metrics);
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12, sealedOpen: false };

function validate(v, sc, at = "$", out = []) {
  if (v === null && sc.nullable) return out;
  if (sc.$ref) return validate(v, schema.$defs[sc.$ref], at, out);
  if ("const" in sc && v !== sc.const) out.push(`${at}: ${JSON.stringify(v)} is not ${JSON.stringify(sc.const)}`);
  if (sc.enum && !sc.enum.includes(v)) { out.push(`${at}: ${JSON.stringify(v)} is not one of ${JSON.stringify(sc.enum)}`); return out; }
  if (sc.type) { const ts = [].concat(sc.type), ty = v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v; if (!ts.includes(ty) && !(ty === "integer" && ts.includes("number"))) { out.push(`${at}: a ${ty}, wanted ${ts.join(" or ")}`); return out; } }
  if (typeof v === "string" && sc.pattern && !new RegExp(sc.pattern).test(v)) out.push(`${at}: ${JSON.stringify(v)} does not match ${sc.pattern}`);
  if (Array.isArray(v) && sc.maxItems !== undefined && v.length > sc.maxItems) out.push(`${at}: more than ${sc.maxItems}`);
  if (Array.isArray(v) && sc.minItems !== undefined && v.length < sc.minItems) out.push(`${at}: fewer than ${sc.minItems}`);
  if (Array.isArray(v) && sc.items) v.forEach((x, i) => validate(x, sc.items, `${at}[${i}]`, out));
  if (v && typeof v === "object" && !Array.isArray(v)) { for (const k of sc.required ?? []) if (!(k in v)) out.push(`${at}: ${k} is required`); for (const [k, x] of Object.entries(v)) { const p = sc.properties?.[k]; if (p) validate(x, p, `${at}.${k}`, out); else if (sc.additionalProperties === false) out.push(`${at}: ${k} is not a prop`); } }
  return out;
}
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; return st; };
const SV = { v: 8, wid: "w1", turn: 0, bay: [], mibis: [], with: null, tier: 1, shield: 3 };
const ui = (o = {}) => ({ species: "S01", state: "sheet", lit: null, cur: null, l2: {}, ...o });
const build = (st, u = ui(), extra = {}) => speciesBuild({ st, sv: SV, settings, ui: u, metrics, ...extra }, spec, frameSpec);
const findLooks = (st, id, n) => { let left = n; for (const ch of frameOf(id).chapters) for (const t of ch.traits) for (const l of currentLooks(frameOf(id), t)) { if (left <= 0) return; if (S.guideLooks(st, id, t.id).includes(l)) continue; S.guideAdd(st, id, t.id, [l]); left--; } };
const loika = (n = 3) => { const st = world(); S.seedAdults(st, "S01", 5, n, settings); st.libSeen = S.libSnapshot(st); return st; };

test("a met-only species: the met sheet, no targets and no ring, no ✓, the met subject; every shelf node, glint and the page hidden; the readout is the mark and the name", () => {
  const st = world(); st.metIds = ["S04"]; const b = build(st, ui({ species: "S04" }));
  assert.deepEqual(validate(b.props, schema), [], "validates");
  assert.deepEqual(b.props.focus, { cur: "", targets: [] }); assert.equal(b.props.state, "sheet");
  assert.deepEqual(b.line, { ok: null, subject: Sg.metOnly, back: Sg.back, need: null });
  assert.deepEqual(b.top, { readout: { text: frameOf("S04").species.name, mark: "species-mark-S04-10" } });
  const R = b.props.regions; assert.equal(R.sheet.met, true); assert.deepEqual([R.sheet.glints, R.sheet.plates, R.shelf.shown, R.page.picture], [[], [], false, ""]);
  assert.equal(R.sheet.picture, sheetId(sheetInput(st, "S04", settings), speciesFacts(frameOf("S04"))), "the met sheet, the same for every player");
  assert.throws(() => build(world(), ui({ species: "S06" })), /a met or found species/, "an unmet species has no Level 2");
});

test("a found species in sheet: the open plates are the targets (a shut one is not), then the wish, the face and the family faces, sent as the shelf; the plates and the glints are the generator's facts; no other position", () => {
  const st = loika(3); const [a] = st.mibis; a.portrait = { state: "delivered", stage: "adult" }; assert.ok(Lib.makeFace(st, a).ok);
  const tr = Object.keys(st.guide.S01)[0]; assert.ok(Lib.wishPin(st, "S01", tr, st.guide.S01[tr][0], settings).ok); findLooks(st, "S01", 3);
  const b = build(st), R = b.props.regions, input = sheetInput(st, "S01", settings), facts = sheetFacts(frameOf("S01"), input);
  assert.deepEqual(validate(b.props, schema), [], "validates");
  const open = frameOf("S01").chapters.filter((ch) => !input.shut.includes(ch.id)).map((ch) => "chapter." + ch.id);
  assert.deepEqual(R.sheet.plates, open.map((id) => ({ id, rect: facts.plates[id.slice(8)] })), "the open plates, at the generator's facts (sheet coordinates)");
  assert.deepEqual(R.sheet.glints, facts.glints, "the glints: the looks new this visit, at most 8");
  assert.ok(R.sheet.glints.length > 0 && R.sheet.glints.length <= 8);
  assert.deepEqual(b.props.focus.targets.map((t) => [t.id, t.group]), [...open.map((id) => [id, "chapter"]), ["wish", "shelf"], ["face", "shelf"], ...st.mibis.map((m) => ["family." + m.id, "shelf"])]);
  assert.equal(b.props.focus.cur, open[0], "the first open chapter in frame order");
  assert.equal(build(st, ui({ l2: { S01: "face" } })).props.focus.cur, "face", "the ring starts on ui.lib.l2[species]");
  assert.equal(build(st, ui({ l2: { S01: "family.99" } })).props.focus.cur, open[0], "a memory that is not a target: the first open chapter");
  const ch = frameOf("S01").chapters[0], g = Lib.fieldGuide(st, "S01", settings).chapters[0];
  assert.deepEqual(b.line, { ok: `Show ${ch.name}`, subject: `${ch.name}, ${g.more ? "more to find" : "all found"}`, back: "Library", need: null });
  assert.equal(R.shelf.face.picture, `face:${a.id}:64`); assert.equal(R.shelf.families.length, 3);
  const plain = JSON.parse(JSON.stringify(b.props)); delete plain.regions.sheet.plates; delete plain.regions.sheet.glints; delete plain.regions.page.discs;
  assert.ok(!/"(rect|x|y|w|h|colour|color|at)":/.test(JSON.stringify(plain)), "no rectangle, no colour outside the generator's facts");
  assert.equal(new Set(b.requests.map((r) => r.id)).size, b.requests.length, "one request an id");
});

test("lit: the lit variant and the page, the lit chapter's found looks as targets in page order, the ring on the plate; Clear {Chapter} on it, Show on another, the carried-by ladder on a look; ← reads Clear", () => {
  const st = loika(2); findLooks(st, "S01", 6); const coat = frameOf("S01").chapters.find((c) => c.id === "coat");
  const b = build(st, ui({ state: "lit", lit: "coat", cur: "chapter.coat" })), R = b.props.regions, input = sheetInput(st, "S01", settings), sp = speciesFacts(frameOf("S01"));
  assert.deepEqual(validate(b.props, schema), []); assert.equal(b.props.state, "lit");
  assert.deepEqual([R.sheet.picture, R.page.picture, R.page.chapter, R.shelf.shown], [litId(input, sp, "coat"), pageId(input, sp, "coat"), "coat", false]);
  const discs = Object.keys(sheetFacts(frameOf("S01"), input, "coat").page.discs); assert.deepEqual(R.page.discs.map((d) => d.id), discs);
  assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "look").map((t) => t.id), discs, "the lit chapter's found looks, in page order");
  assert.ok(!b.props.focus.targets.some((t) => t.group === "shelf"), "no shelf target while lit");
  assert.deepEqual([b.props.focus.cur, b.line.ok, b.line.back], ["chapter.coat", `Clear ${coat.name}`, "Clear"]);
  const other = frameOf("S01").chapters.find((c) => c.id !== "coat"); assert.equal(build(st, ui({ state: "lit", lit: "coat", cur: "chapter." + other.id })).line.ok, `Show ${other.name}`);
  const look = build(st, ui({ state: "lit", lit: "coat", cur: discs[0] })); assert.equal(look.line.ok, null, "a look disc: no ✓");
  const [, t, l] = discs[0].match(/^look\.([a-z-]+)\.(.+)$/), carriers = Lib.lookCarriers(st, "S01", t, l); assert.equal(look.line.subject, carriedLine((s) => measure(s, 16) <= 208 && s.split(" ").length <= 6, Sg, carriers));
  const met = world(); met.metIds = ["S01"]; assert.equal(build(met, ui({ state: "lit", lit: "coat" })).props.state, "sheet", "a met sheet is never lit");
});

test("the carried-by ladder: the first step within 208 px and six words; none, one, two, three or more carriers", () => {
  const fit = (s) => measure(s, 16) <= 208 && s.split(" ").length <= 6, C = (...names) => names.map((name, id) => ({ id, name }));
  assert.equal(carriedLine(fit, Sg, []), "none of yours carries it yet");
  assert.equal(carriedLine(fit, Sg, C("Dot")), "carried by Dot"); assert.equal(carriedLine(fit, Sg, C("W".repeat(30))), "carried by one of yours");
  assert.equal(carriedLine(fit, Sg, C("Dot", "Moss")), "carried by Dot and Moss");
  { const two = C("Bartholomew", "Wilhelmina"), got = carriedLine(fit, Sg, two), steps = Sg.carried.two.map((s) => s.replace("{A}", "Bartholomew").replace("{B}", "Wilhelmina")); assert.equal(got, steps.find(fit), "two long names: the first step that fits (" + got + ")"); assert.ok(!fit(steps[0]), "the first step does not fit"); }
  assert.equal(carriedLine(fit, Sg, C("W".repeat(30), "Moss")), "carried by more than one");
  assert.equal(carriedLine(fit, Sg, C("Dot", "Moss", "Bean")), "carried by Dot and more");
  for (const n of [[], C("Dot"), C("Dot", "Moss"), C("Dot", "Moss", "Bean"), C("Abcdefghijkl", "Mnopqrstuvwx")]) { const s = carriedLine(fit, Sg, n); assert.ok(fit(s) && !/\d/.test(s) && !s.endsWith("…"), s); }
});

test("the shelf: the wish pieces in frame order (the found disc when a read carrier has the look, else the open disc; the word bone when carried), the face, the sittings record and the family faces", () => {
  const st = loika(10); const fr = frameOf("S01"), traits = fr.chapters.flatMap((c) => c.traits).filter((t) => st.guide.S01[t.id]);
  for (const t of traits.slice(0, 2)) assert.ok(Lib.wishPin(st, "S01", t.id, st.guide.S01[t.id][0], settings).ok);
  for (const m of st.mibis) m.read = [];   // no read carrier: every piece open
  let w = build(st).props.regions.shelf.wish; assert.deepEqual(w.map((p) => [p.trait, p.disc, p.carried]), traits.slice(0, 2).map((t) => [t.id, "look-disc-open-16", false]));
  for (const m of st.mibis) m.read = fr.chapters.map((c) => c.id); w = build(st).props.regions.shelf.wish;
  assert.deepEqual(w.map((p) => p.carried), [true, true]); assert.match(w[0].disc, /^look-disc-S01-/);
  st.moments = { "guide:S01": 1, "sealed:S01:face": 2, "guide:S02": 3, "line:1": 4 }; assert.equal(build(st).props.regions.shelf.sittings, 2, "the sittings of this species' moments");
  st.mibis[0].released = true; st.mibis[1].released = true; const ids = st.mibis.map((m) => m.id).sort((a, b) => b - a).slice(0, 8);
  const fam = build(st).props.regions.shelf.families; assert.equal(fam.length, 8, "at most eight");
  assert.deepEqual(fam.map((f) => f.id).sort((a, b) => a - b), ids.sort((a, b) => a - b), "the eight most recent");
  assert.deepEqual(fam.map((f) => f.where), fam.map((f) => f.where).slice().sort((a, b) => ["home", "trip", "wild"].indexOf(a) - ["home", "trip", "wild"].indexOf(b)), "home first, then on a trip, then released");
  const one = world(); S.seedAdults(one, "S01", 5, 1, settings); one.mibis[0].released = true; const f1 = build(one).props.regions.shelf.families[0];
  assert.deepEqual([f1.where, f1.picture], ["wild", `face:${one.mibis[0].id}:56:faded`]);
  const L = build(one, ui({ cur: "family." + one.mibis[0].id })).line; assert.deepEqual([L.ok, L.subject], ["See the family", `${S.cap(one.mibis[0].name)}, in the wild`]);
});

test("the face: Look at {name} while it lives; released: no ✓ and the in-the-wild subject; its picture keeps the portrait's stage (F4)", () => {
  const st = loika(1); const [a] = st.mibis; a.portrait = { state: "delivered", stage: "juvenile" }; assert.ok(Lib.makeFace(st, a).ok);
  let b = build(st, ui({ cur: "face" })); assert.deepEqual([b.line.ok, b.line.subject], [`Look at ${a.name}`, ""]);
  assert.equal(b.requests.find((r) => r.id === `face:${a.id}:64`).stage, "juvenile", "the portrait's stage, though the mibi is adult now");
  assert.equal(S.mibiStage(st, a, settings), "adult");
  a.released = true; b = build(st, ui({ cur: "face" })); assert.deepEqual([b.line.ok, b.line.subject], [null, `${S.cap(a.name)}, in the wild`]);
  assert.ok(b.requests.some((r) => r.id === `face:${a.id}:64:faded` && r.faded));
});

test("F1: the wish has no ✓ until pinning has a screen: on the wish the line names no verb and no subject, and ✓ there leaves the screen and the wish as they were", () => {
  const st = loika(2); const tr = Object.keys(st.guide.S01)[0]; assert.ok(Lib.wishPin(st, "S01", tr, st.guide.S01[tr][0], settings).ok);
  const b = build(st, ui({ cur: "wish" })); assert.equal(b.props.focus.cur, "wish", "the wish stays a target");
  assert.deepEqual([b.line.ok, b.line.subject], [null, ""], "shut in place: no ✓ named, no subject"); assert.equal(typeof Sg.wish, "string", "the wish's verb is kept for when pinning lands");
  const UI = { screen: "library.species", lib: { l1: "S01", pending: null, l2: { S01: "wish" }, species: "S01", state: "sheet", lit: null, cur: "wish", family: null } }, went = [], wish = JSON.stringify(st.wish);
  const h = { st, settings, ui: UI, goto: (s) => { went.push(s); UI.screen = s; } };
  INTENTS["library.species"].intent(h, "wish", "confirm");
  assert.deepEqual([UI.screen, went, JSON.stringify(st.wish), UI.lib.state, UI.lib.cur], ["library.species", [], wish, "sheet", "wish"], "✓ on the wish: the screen and st.wish unchanged");
});

test("F3: lit, the look targets wait for the page: while it is not drawn no look is a target and ▶ from the right column stays put; once made, the looks in page order", () => {
  const st = loika(2); findLooks(st, "S01", 6); const input = sheetInput(st, "S01", settings), sp = speciesFacts(frameOf("S01")), discs = Object.keys(sheetFacts(frameOf("S01"), input, "coat").page.discs);
  assert.ok(discs.length > 0, "the coat has found looks");
  const made = new Set([sheetId(input, sp), litId(input, sp, "coat")]), ready = (id) => made.has(id) || !id.startsWith("library-"), u = ui({ state: "lit", lit: "coat", cur: "chapter.coat" });
  let b = build(st, u, { ready }); assert.equal(b.props.regions.page.picture, "", "the page not made");
  assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "look"), [], "no look target before the page is drawn"); assert.deepEqual(b.props.regions.page.discs, [], "and no disc sent");
  assert.ok(b.props.focus.targets.every((t) => t.group === "chapter"), "only the plates"); assert.equal(b.props.focus.cur, "chapter.coat");
  const T = (x) => x.props.focus.targets.map((q) => ({ id: q.id, group: q.group, rect: targetBox(spec, x.props, q.id) })), right = (x) => T(x).filter((q) => q.group === "chapter").sort((p, q) => q.rect[0] - p.rect[0])[0].id;
  assert.equal(moveFocus(spec.l2.focus.lit, T(b), right(b), "right").to, right(b), "▶ from the right column stays put");
  assert.equal(build(st, ui({ state: "lit", lit: "coat", cur: discs[0] }), { ready }).props.focus.cur, "chapter.coat", "a ring asked for a look not yet drawn rests on the lit plate");
  made.add(pageId(input, sp, "coat")); b = build(st, u, { ready }); assert.equal(b.props.regions.page.picture, pageId(input, sp, "coat"));
  assert.deepEqual(b.props.focus.targets.filter((t) => t.group === "look").map((t) => t.id), discs, "once made: the lit chapter's found looks, in page order");
  assert.equal(moveFocus(spec.l2.focus.lit, T(b), right(b), "right").to, discs[0], "and ▶ from the right column reaches the first");
});

test("a shelf row's target exists only when the row is drawn: no wish and no face, no `wish` or `face` target, and a remembered one falls back to the first open chapter", () => {
  const st = loika(3), b = build(st, ui({ l2: { S01: "wish" } })), ids = b.props.focus.targets.map((t) => t.id);
  assert.deepEqual([b.props.regions.shelf.wish, b.props.regions.shelf.face], [[], null], "no wish, no face");
  assert.ok(!ids.includes("wish") && !ids.includes("face"), "no target for a row not drawn"); assert.equal(b.props.focus.cur, ids[0], "the remembered wish: the first open chapter"); assert.ok(ids[0].startsWith("chapter."));
  assert.equal(build(st, ui({ l2: { S01: "face" } })).props.focus.cur, ids[0], "the remembered face: the first open chapter");
});

test("P1: the props never name a picture not made: the species' last sheet or the quiet stand-in for the sheet, the unlit sheet for a lit variant, nothing for a page; the rest are asked for", () => {
  const st = loika(2); findLooks(st, "S01", 4); const input = sheetInput(st, "S01", settings), sp = speciesFacts(frameOf("S01")), want = sheetId(input, sp);
  let made = new Set(); const ready = (id) => made.has(id) || !id.startsWith("library-");
  let b = build(st, ui(), { ready }); assert.equal(b.props.regions.sheet.picture, quietId(input, sp), "cold: the quiet stand-in");
  assert.ok(b.requests.some((r) => r.kind === "libraryquiet" && r.id === quietId(input, sp))); assert.deepEqual(b.later.map((r) => r.id), [want], "the sheet is asked for");
  b = build(st, ui(), { ready, lastSheet: () => "library-sheet-S01-00000000" }); assert.equal(b.props.regions.sheet.picture, quietId(input, sp), "a last sheet not made does not stand in");
  made.add("library-sheet-S01-00000000"); b = build(st, ui(), { ready, lastSheet: () => "library-sheet-S01-00000000" }); assert.equal(b.props.regions.sheet.picture, "library-sheet-S01-00000000", "the species' last sheet stands in");
  made = new Set([want]); b = build(st, ui({ state: "lit", lit: "coat" }), { ready });
  assert.deepEqual([b.props.state, b.props.regions.sheet.picture, b.props.regions.page.picture, b.line.ok.startsWith("Clear")], ["lit", want, "", true], "a ✓ before the pictures land names the verb at once; the unlit sheet stands in, the page is not shown");
  assert.deepEqual(b.later.map((r) => r.kind), ["librarylit", "librarypage"], "the lit variant, then the page");
  made.add(litId(input, sp, "coat")); b = build(st, ui({ state: "lit", lit: "coat" }), { ready }); assert.deepEqual([b.props.regions.sheet.picture, b.props.regions.page.picture], [litId(input, sp, "coat"), ""], "each picture as it lands");
  made.add(pageId(input, sp, "coat")); b = build(st, ui({ state: "lit", lit: "coat" }), { ready }); assert.equal(b.props.regions.page.picture, pageId(input, sp, "coat")); assert.deepEqual(b.later, []);
});

test("F5: Level 1 names a cell picture only once it is made; the cell draws its quiet ground until then and the picture is asked for", () => {
  const st = world(); st.knownIds = ["S02", "S03"]; st.metIds = ["S01"]; findLooks(st, "S02", 3);
  const all = libraryBuild({ st, settings, ui: { l1: null } }, spec, frameSpec), cold = libraryBuild({ st, settings, ui: { l1: null }, ready: () => false }, spec, frameSpec);
  const known = all.props.regions.cells.filter((c) => c.status !== "unmet");
  assert.ok(cold.props.regions.cells.every((c) => c.picture === ""), "no cell names a picture that is not made");
  assert.deepEqual(cold.later.map((r) => r.id), known.map((c) => c.picture), "each is asked for, in species order"); assert.ok(cold.later.every((r) => r.kind === "librarycell"));
  assert.ok(!cold.requests.some((r) => r.kind === "librarycell"));
  assert.deepEqual(libraryBuild({ st, settings, ui: { l1: null }, ready: () => true }, spec, frameSpec).props, all.props, "once made, the props are as before");
});
