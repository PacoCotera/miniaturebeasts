// Sleeping records (pin 11, the game designer's rulings of 3 Nov 2026): a record that draws only for certain looks sleeps by a `wakesWhen` rule that names the SHOWN look. A sleeping record
// is still carried, crossed copy by copy, forecast as sleeping (not as missing), and, in the genome-stamp tests, stamped and written in the string. The one-look-one-record validator.
//   node --test tests/sleep.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI, LOOK_PAIRS, lookConflicts, stepValue } from "../framework/catalogue.mjs";
import { SPECIES, specOf } from "../framework/roster.mjs";
import { buildFrame, buildIndividual, typeSpecimen, checkGenome, rng } from "../framework/species.mjs";
import { resolveIndividual, factMap } from "../framework/resolve.mjs";
import { cross, forecast } from "../framework/cross.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");

// A cat at frame version 7 that opens the whisker switch and the sleeping records beside the records that wake them. Its marking switch is on and its layout locked to bands, so the
// band count is awake and the rosette (spotted layouts only) is asleep whatever its copies say.
const spec = () => ({
  ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 7, openSwitches: ["anatomy.whisker-presence"],
  open: [
    { trait: "colour" },
    { chapter: "coat", id: "emblem", name: "Emblem", loci: ["appearance.emblem", "appearance.emblem-place", "appearance.emblem-size"], looks: ["none", "heart", "star"] },
    { chapter: "coat", id: "bands", name: "Bands", loci: ["appearance.band-count"], looks: ["few", "between", "many"] },
    { chapter: "coat", id: "rosette", name: "Rosette", loci: ["appearance.marking-rosette"], looks: ["low", "between", "high"] },
    { chapter: "face", id: "whiskers", name: "Whiskers", loci: ["anatomy.whisker-presence", "form.whisker-count", "form.whisker-length"], looks: ["none", "some"] },
  ],
});
const FRAME = buildFrame(spec(), { samples: 30 });
const parent = (over) => { const g = typeSpecimen(FRAME); for (const [id, pair] of Object.entries(over)) g.loci[id] = pair; return g; };
const step = (id, k) => stepValue(LOCI.get(id), k);

test("a frame that opens a sleeping record carries it as a sleeping row with its rule; without the whisker switch the whisker records are absent, not sleeping", () => {
  const row = (id) => FRAME.loci.find((l) => l.id === id);
  for (const id of ["appearance.emblem-place", "appearance.emblem-size", "appearance.band-count", "appearance.marking-rosette", "form.whisker-count", "form.whisker-length"]) assert.equal(row(id).kind, "sleeping", id);
  assert.deepEqual(row("appearance.band-count").wakesWhen, LOCI.get("appearance.band-count").wakesWhen);
  assert.match(row("appearance.marking-rosette").guard, /asleep unless the shown look is one of: appearance\.marking-layout spotted/);
  assert.equal(row("anatomy.whisker-presence").kind, "heritable-look"); assert.equal(row("appearance.emblem").kind, "heritable-look");
  assert.equal(FRAME.counts.sleeping, 6);
  const plain = buildFrame({ ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 7 }, { samples: 5 });
  assert.ok(!plain.loci.some((l) => l.id === "form.whisker-count"), "no whisker switch, no whisker records");
  assert.ok(plain.absent.some((a) => a.id === "form.whisker-count"));
});

test("the resolver: a record sleeps unless the SHOWN look wakes it, a sleeping record keeps its copies, and a sleeping layout shows no layout", () => {
  const states = (g) => Object.fromEntries(resolveIndividual(FRAME, g).facts.map((f) => [f.id, f.state]));
  // emblem: none/star shows none (none is dominant), so the place and the size sleep; heart/star shows heart, so they wake
  let g = parent({ "appearance.emblem": ["none", "star"], "appearance.emblem-place": ["forehead", "belly"] }), s = states(g);
  assert.equal(s["appearance.emblem-place"], "asleep"); assert.equal(s["appearance.emblem-size"], "asleep");
  const f = factMap(resolveIndividual(FRAME, g).facts)["appearance.emblem-place"];
  assert.deepEqual(f.copies, ["forehead", "belly"], "a sleeping record keeps both copies"); assert.match(f.reason, /^asleep: appearance\.emblem shows none of heart, star/);
  g = parent({ "appearance.emblem": ["heart", "star"] }); s = states(g);
  assert.equal(s["appearance.emblem-place"], "expressed"); assert.equal(s["appearance.emblem-size"], "expressed");
  // the whisker switch: off/off sleeps all its parts, one on copy wakes them (dominant)
  assert.equal(states(parent({ "anatomy.whisker-presence": ["off", "off"] }))["form.whisker-count"], "asleep");
  assert.equal(states(parent({ "anatomy.whisker-presence": ["off", "on"] }))["form.whisker-count"], "expressed");
  // the band count wakes on the bands layout (this cat's layout is locked bands) and the rosette sleeps: the shown layout is bands, not spotted
  s = states(parent({}));
  assert.equal(s["appearance.band-count"], "expressed"); assert.equal(s["appearance.marking-rosette"], "asleep");
  // the values the rig sees: a sleeping record is not drawn
  assert.ok(!("appearance.marking-rosette" in resolveIndividual(FRAME, parent({})).values));
  assert.ok("appearance.band-count" in resolveIndividual(FRAME, parent({})).values);
});

test("the cross carries and crosses a sleeping record copy by copy, as it does an awake one: a named copy comes from a parent's copy, a blend lands between, nothing is reset or dropped", () => {
  const r = rng("sleep-cross");
  const lo = step("appearance.marking-rosette", 0), hi = step("appearance.marking-rosette", 59);
  const mother = parent({ "appearance.emblem": ["none", "none"], "appearance.emblem-place": ["forehead", "belly"], "appearance.emblem-size": [step("appearance.emblem-size", 10), step("appearance.emblem-size", 10)],
    "appearance.marking-rosette": [lo, lo], "anatomy.whisker-presence": ["off", "off"], "form.whisker-count": [step("form.whisker-count", 0), step("form.whisker-count", 0)], "form.whisker-length": [step("form.whisker-length", 5), step("form.whisker-length", 5)] });
  const father = parent({ "appearance.emblem": ["none", "none"], "appearance.emblem-place": ["belly", "belly"], "appearance.emblem-size": [step("appearance.emblem-size", 50), step("appearance.emblem-size", 50)],
    "appearance.marking-rosette": [hi, hi], "anatomy.whisker-presence": ["off", "off"], "form.whisker-count": [step("form.whisker-count", 59), step("form.whisker-count", 59)], "form.whisker-length": [step("form.whisker-length", 55), step("form.whisker-length", 55)] });
  const seen = { place: new Set(), count: new Set() }, asleep = [];
  for (let i = 0; i < 160; i++) {
    const child = cross(FRAME, { id: 1, genome: mother }, { id: 2, genome: father }, { rng: r, kinship: 0 });
    assert.deepEqual(checkGenome(FRAME, child), [], "a whole child");
    for (const id of ["appearance.emblem-place", "appearance.emblem-size", "appearance.marking-rosette", "form.whisker-count", "form.whisker-length"]) assert.ok(Array.isArray(child.loci[id]) && child.loci[id].length === 2, `${id} is carried by the child`);
    for (const c of child.loci["appearance.emblem-place"]) seen.place.add(c);
    const [n1, n2] = child.loci["form.whisker-count"]; assert.equal(n1, n2); assert.ok(n1 >= 0 && n1 <= 1); seen.count.add(n1);
    // each blend is both copies equal, between the parents' values (the spread may nudge it up to a tenth of the range either way)
    const [rs, rs2] = child.loci["appearance.marking-rosette"]; assert.equal(rs, rs2); assert.ok(rs >= lo && rs <= hi);
    const [w, w2] = child.loci["form.whisker-length"]; assert.equal(w, w2);
    const built = buildIndividual(FRAME, child); assert.equal(built.validation.status, "valid");
    asleep.push(resolveIndividual(FRAME, child).facts.filter((f) => f.state === "asleep").map((f) => f.id));
  }
  assert.deepEqual([...seen.place].sort(), ["belly", "forehead"], "both of the mother's hidden copies reach her children: a sleeping record is crossed");
  assert.ok(seen.count.size > 20, "the sleeping whisker count is blended between its parents' values, child by child, not left at a default");
  for (const ids of asleep) for (const id of ["appearance.emblem-place", "appearance.marking-rosette", "form.whisker-count"]) assert.ok(ids.includes(id), `${id} sleeps in every child`);
});

test("the forecast shows a sleeping record in its trait, as sleeping for each parent, never as missing", () => {
  const mother = parent({ "appearance.emblem": ["heart", "star"], "appearance.emblem-place": ["forehead", "belly"], "anatomy.whisker-presence": ["off", "off"] });
  const father = parent({ "appearance.emblem": ["none", "none"], "anatomy.whisker-presence": ["on", "off"] });
  const f = forecast(FRAME, mother, father, { kinship: 0 });
  const tr = (id) => f.traits.find((t) => t.trait === id);
  assert.deepEqual(tr("emblem").sleeping, ["appearance.emblem-place", "appearance.emblem-size"], "the sleeping parts ride with their switch");
  assert.deepEqual(tr("emblem").asleep, { "appearance.emblem-place": [false, true], "appearance.emblem-size": [false, true] }, "the mother shows a heart (awake), the father shows none (asleep)");
  assert.deepEqual(tr("whiskers").asleep, { "form.whisker-count": [true, false], "form.whisker-length": [true, false] });
  assert.deepEqual(tr("rosette").asleep, { "appearance.marking-rosette": [true, true] }, "a sleeping blend is in the forecast too");
  assert.equal(tr("rosette").kind, "blend");
  assert.equal(tr("bands").asleep["appearance.band-count"].join(), "false,false");
  assert.equal(tr("colour").asleep, undefined, "a trait with no sleeping record says nothing about sleep");
});

test("one look, one record: the seven pairs, a frame that opens both of a pair is refused, and S01 to S19 each open at most one of each", () => {
  assert.equal(LOOK_PAIRS.length, 12, "the seven of pin 11 and catalogue 13's five signature pairs");
  assert.deepEqual(LOOK_PAIRS.map((p) => p[0]), ["Ear shape", "Ear droop", "Ear width", "Eye size", "Eye height", "Eye spacing", "Cream reach", "Signature count", "Signature size", "Signature size", "Signature curl", "Signature curl"]);
  for (const [look, a, b] of LOOK_PAIRS) {
    assert.deepEqual(lookConflicts([a, b]).map((c) => c.look), [look], look); assert.deepEqual(lookConflicts([a]), []); assert.deepEqual(lookConflicts([b, "appearance.blush"]), []);
  }
  assert.deepEqual(lookConflicts(["anatomy.auricular-form", "form.ear-droop"]), [], "the older ear kind and the newer ear droop are two looks");
  // a frame that opens the Loika's eye size and the new eye size is refused by name
  const loika = specOf(SPECIES.find((s) => s.id === "S01"));
  assert.throws(() => buildFrame({ ...loika, frameVersion: 7, open: [{ trait: "eyes" }, { chapter: "face", id: "eye-size", name: "Eye size", loci: ["form.eye-size"], looks: ["small", "between", "large"] }] }, { samples: 3 }),
    /opens two records for one look: Eye size \(growth\.exterior-eye-size-ratio and form\.eye-size\)/);
  // every frame in the registry
  const files = readdirSync(framesDir).filter((f) => /^species-S\d+\.json$/.test(f));
  assert.equal(files.length, 19);
  for (const f of files) {
    const d = JSON.parse(readFileSync(path.join(framesDir, f), "utf8"));
    assert.deepEqual(lookConflicts(d.loci.filter((l) => l.kind !== "locked").map((l) => l.id)), [], `${d.species.id} opens at most one record per look`);
  }
});
