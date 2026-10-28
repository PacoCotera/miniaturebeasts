// The Library module's selectors on Home (build spec 4.2, views/specimen-props.mjs): the species the window shows, the looks that are new, the counts, the specimen's request and the region of Home's props.
//   node --test prototypes/station/tests/specimen-props.test.mjs
import { test } from "node:test";
import "./fixtures/rooms.mjs";   // the rooms spec, as the page registers it
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { fieldGuide } from "../src/library.mjs";
import { specimenSpecies, newLooksOf, libraryOf, specimenInput, warmLibrary, STARTER } from "../src/views/specimen-props.mjs";
import { homeBuild, setLibrary } from "../src/views/home-props.mjs";
import { specimenId, clearSpecimens, renderCount } from "../src/specimen-cache.mjs";

setLibrary(libraryOf);   // the host registers it
const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames"), specs = path.resolve(here, "../../ui/specs/station");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), spec = J("home.json"), frameSpec = J("frame.json");
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 2 }, T0 = 1_000_000;
const world = () => { const st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; return st; };
const total = (st, id) => { const g = fieldGuide(st, id, settings); return g.foundCurrent + g.unseen; };
const found = (st, id) => fieldGuide(st, id, settings).found;
const pick = (st) => specimenSpecies(st, settings);

test("the species: none found is null (the starter's empty form shows); the only one found; a wished species first, the one with a bud before the others, else the newest mibi by id, else learnt order; no wish: the fewest looks unfound, ties by the same proxy", () => {
  const st = world(); assert.equal(pick(st), null, "nothing found: the starter's empty form"); assert.equal(STARTER, "S01");
  S.seedAdults(st, "S01", 5, 1, settings); assert.equal(pick(st), "S01");
  S.seedAdults(st, "S02", 9, 3, settings);
  const un = (id) => fieldGuide(st, id, settings).unseen; assert.ok(found(st, "S01") > 0 && found(st, "S02") > 0);
  if (un("S01") !== un("S02")) assert.equal(pick(st), un("S01") < un("S02") ? "S01" : "S02", "the fewest looks still unfound");
  else assert.equal(pick(st), "S02", "a tie: the species of the newest mibi by id (S02's were made last)");
  const wish = (id) => { const t = frameOf(id).chapters.flatMap((c) => c.traits)[0]; st.wish[id] = { [t.id]: S.guideLooks(st, id, t.id)[0] }; };
  wish("S01"); assert.equal(pick(st), "S01", "the only wished species, whatever is unfound");
  wish("S02"); assert.equal(pick(st), "S02", "two wishes: the newest mibi's species by id");
  st.bud = { species: "S01", kind: "founder" }; assert.equal(pick(st), "S01", "a wished species with a bud in the Incubator first");
  st.bud = null; for (const m of st.mibis) m.born = S.speciesOf(m) === "S01" ? 99 : 0; assert.equal(pick(st), "S02", "by mibi id, not born");
  // species with no mibi come after the species with one, in the order learnt
  const a = world(); S.guideAdd(a, "S03", frameOf("S03").chapters[0].traits[0].id, [frameOf("S03").chapters[0].traits[0].looks[0]]); S.guideAdd(a, "S04", frameOf("S04").chapters[0].traits[0].id, [frameOf("S04").chapters[0].traits[0].looks[0]]);
  for (const id of ["S03", "S04"]) { const t = frameOf(id).chapters[0].traits[0]; a.wish[id] = { [t.id]: t.looks[0] }; }
  a.knownIds = ["S04", "S03"]; assert.equal(pick(a), "S04", "no mibi of either: learnt order"); a.knownIds = ["S03", "S04"]; assert.equal(pick(a), "S03");
});
test("the counts: every trait's current looks count, 20 for the version-4 Loika; a plain look is a found bead once seen and never counts as new", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 1, settings); assert.equal(total(st, "S01"), 20);
  S.guideAdd(st, "S01", "markings", ["plain"]); assert.equal(total(st, "S01"), 20, "a legacy look moves nothing");
  st.libSeen = S.libSnapshot(st); S.guideAdd(st, "S01", "markings", ["plain"]);
  assert.equal(newLooksOf(st, "S01", settings).size, 0);
  warmLibrary(st, settings); const r = libraryOf(st, settings, spec).region; assert.ok(!("new" in r), "nothing new");
  const input = specimenInput(st, "S01", settings); assert.ok(input.found.markings.includes("plain"), "the plain look is in what the specimen draws");
  clearSpecimens(); warmLibrary(st, settings); const pic = libraryOf(st, settings, spec); assert.equal(pic.request.found.markings.includes("plain"), true);
});
test("a look is new when it was found since the Library was last opened full screen: opening it again clears them; a save from before the field takes what it knows as seen", () => {
  const st = world(); S.seedAdults(st, "S01", 5, 1, settings); const n0 = newLooksOf(st, "S01", settings).size; assert.ok(n0 > 0 && n0 <= 20, "a fresh Library: every look found is new");
  st.libSeen = S.libSnapshot(st); assert.equal(newLooksOf(st, "S01", settings).size, 0);
  const t = frameOf("S01").chapters.flatMap((c) => c.traits).find((x) => x.id === "eye-rings"); const unseen = t.looks.find((l) => !S.guideLooks(st, "S01", t.id).includes(l)) ?? null;
  if (unseen) { S.guideAdd(st, "S01", t.id, [unseen]); assert.deepEqual([...newLooksOf(st, "S01", settings)], [`eye-rings|${unseen}`]); }
  st.libSeen = S.libSnapshot(st); assert.equal(newLooksOf(st, "S01", settings).size, 0);
  const old = JSON.parse(JSON.stringify(st)); delete old.libSeen; S.normalize(old); assert.deepEqual(old.libSeen, st.guide, "an older save: what it knows is not new");
});
test("a shut sealed chapter shows no bead and counts no new look; once opened its looks are drawn", () => {
  const st = world(); S.seedAdults(st, "S09", 5, 1, settings); const fr = frameOf("S09"), sealed = fr.chapters.filter((c) => c.sealed);
  assert.ok(sealed.length > 0, "S09 has a sealed chapter");
  const shut = specimenInput(st, "S09", settings); assert.deepEqual(shut.shut, sealed.map((c) => c.id)); for (const c of sealed) for (const t of c.traits) assert.ok(!(t.id in shut.found), `${t.id} of a shut chapter is not drawn`);
  const open = specimenInput(st, "S09", { ...settings, sealedOpen: true }); assert.deepEqual(open.shut, []);
});
test("the Library region of Home's props: the specimen's id and its four levels, the glints on the new beads (at most 8), the caption words; the request names what the picture is made from", () => {
  clearSpecimens(); const st = world(); S.seedAdults(st, "S01", 5, 3, settings); warmLibrary(st, settings);
  const { region: r, request: q } = libraryOf(st, settings, spec); assert.equal(r.species, "S01"); assert.equal(r.picture, specimenId("S01", q.found)); assert.equal(r.levels.length, 4); assert.equal(r.levels[0], r.picture); assert.deepEqual(r.levels.slice(1), [":b2", ":b3", ":b4"].map((s) => r.picture + s));
  assert.equal(r.genome, "Loika genome"); assert.equal(q.kind, "specimen"); assert.deepEqual([q.size, q.species], [[344, 362], "S01"]);
  const n = newLooksOf(st, "S01", settings).size; assert.equal(r.new, `${n} new`); assert.equal(r.glints.length, Math.min(8, n));
  for (const [x, y] of r.glints) assert.ok(x >= 12 && x <= 344 - 12 && y >= 12 && y <= 362 - 12, "a bead keeps off the edge");
  st.libSeen = S.libSnapshot(st); const z = libraryOf(st, settings, spec); assert.equal(z.region.glints.length, 0); assert.ok(!("new" in z.region)); assert.equal(z.region.picture, r.picture, "opening the Library re-renders nothing: the looks are the same");
  const b = homeBuild({ st, sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings, docked: true, ui: {}, focus: null, time: 12 * 3600, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, spec, frameSpec);
  assert.deepEqual(b.props.regions.library, z.region); assert.ok(b.requests.some((x) => x.kind === "specimen") && b.requests.some((x) => x.kind === "star"));
});
test("a new look is a new id: the props keep showing the last specimen until the warm has made the new one, and nothing else re-renders the picture", () => {
  clearSpecimens(); const st = world(); S.seedAdults(st, "S01", 5, 1, settings); warmLibrary(st, settings);
  const a = libraryOf(st, settings, spec).region.picture, n0 = renderCount(); assert.equal(libraryOf(st, settings, spec).region.picture, a); assert.equal(warmLibrary(st, settings), null, "already made"); assert.equal(renderCount(), n0);
  const t = frameOf("S01").chapters.flatMap((c) => c.traits).find((x) => x.id === "efficiency"), un = t.looks.find((l) => !S.guideLooks(st, "S01", t.id).includes(l));
  if (un) { S.guideAdd(st, "S01", t.id, [un]); assert.equal(libraryOf(st, settings, spec).region.picture, a, "a miss shows the last specimen"); assert.equal(renderCount(), n0, "and renders nothing"); const id = warmLibrary(st, settings); assert.ok(id && id !== a); assert.equal(libraryOf(st, settings, spec).region.picture, id); }
});
test("a cold cache: building Home's props renders nothing and takes under 50 ms; the starter's empty form shows once it is made; with nothing made at all the region is empty", () => {
  clearSpecimens(); const st = world(); S.seedAdults(st, "S01", 5, 3, settings); const n0 = renderCount();
  const t0 = performance.now(); const b = homeBuild({ st, sv: { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 }, settings, docked: true, ui: {}, focus: null, time: 12 * 3600, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, spec, frameSpec), ms = performance.now() - t0;
  assert.equal(renderCount(), n0, "a Home build renders nothing"); assert.ok(ms < 50, `${ms.toFixed(1)} ms`); console.log(`# a cold-cache Home build: ${ms.toFixed(1)} ms, ${renderCount() - n0} renders`);
  assert.ok(b.props.regions.library.picture || Object.keys(b.props.regions.library).length === 0);
  const e = world(); clearSpecimens(); warmLibrary(e, settings); const r = libraryOf(e, settings, spec).region; assert.equal(r.species, "S01"); assert.equal(r.genome, "Loika genome"); assert.ok(!("new" in r)); assert.deepEqual(r.glints, []);
});
