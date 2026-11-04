// Sleeping records in the stamp and the string (pin 11, the game designer's rulings of 3 Nov 2026): a record that sleeps (by its owner switch or by a look it does not show) is still a
// heritable locus of its frame. The string writes both copies of it, the stamp stamps it with its chapter, and a cross hands its copies down; none of them drops, resets or rounds a sleeping copy.
//   node --test tests/sleeping.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { genomeString, decodeGenomeString } from "../src/string.mjs";
import { stampCode, decodeStampCode } from "../src/codec.mjs";
import { tulikoFrame, tulikoType } from "./tuliko-frame.mjs";
import { LOCI, stepValue } from "../../workbench/framework/catalogue.mjs";
import { SPECIES, specOf } from "../../workbench/framework/roster.mjs";
import { buildFrame, typeSpecimen, rng } from "../../workbench/framework/species.mjs";
import { cross } from "../../workbench/framework/cross.mjs";

// Every record of the Tuliko frame that sleeps, by the rules of catalogue pin 11
const SLEEPERS = ["appearance.pattern-scale", "appearance.pattern-contrast", "appearance.marking-rosette", "appearance.band-count", "appearance.emblem-place", "appearance.emblem-size", "appearance.lantern-bleed",
  "form.whisker-count", "form.whisker-length", "form.whisker-droop", "form.whisker-curl", "appearance.whisker-glow", "form.eye-size", "form.eye-height", "form.eye-spacing"];

// A Tuliko with every sleeping record holding two different copies while the record that would wake it is off: no pattern, no emblem, a plain tip, no whiskers, the marking switch off
function sleepingTuliko(f) {
  const step = (id, k) => stepValue(LOCI.get(id), k);
  const c = tulikoType(f).copies;
  Object.assign(c, {
    "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["bands", "masked"], "appearance.pattern-kind": ["none", "none"], "appearance.emblem": ["none", "none"], "appearance.glow-pattern": ["none", "none"],
    "anatomy.tail-tip-form": ["plain", "plain"], "anatomy.whisker-presence": ["off", "off"], "anatomy.fang-presence": ["off", "on"],
    "appearance.pattern-scale": [step("appearance.pattern-scale", 3), step("appearance.pattern-scale", 55)], "appearance.pattern-contrast": ["low", "high"],
    "appearance.marking-rosette": [step("appearance.marking-rosette", 8), step("appearance.marking-rosette", 8)], "appearance.band-count": ["few", step("appearance.band-count", 21)],
    "appearance.emblem-place": ["forehead", "belly"], "appearance.emblem-size": [step("appearance.emblem-size", 30), step("appearance.emblem-size", 40)], "appearance.lantern-bleed": ["low", "high"],
    "form.whisker-count": ["few", "many"], "form.whisker-length": ["short", "long"], "form.whisker-droop": [step("form.whisker-droop", 17), step("form.whisker-droop", 17)], "form.whisker-curl": ["straight", "curled"],
    "appearance.whisker-glow": ["off", "on"],
  });
  return { copies: c };
}

test("the Tuliko test frame holds every sleeping record as a heritable locus, and a mibi whose sleeping records hold two different copies keeps them through the string", () => {
  const f = tulikoFrame(), g = sleepingTuliko(f);
  const ids = new Set(f.heritable.map((l) => l.id));
  for (const id of SLEEPERS) assert.ok(ids.has(id), `${id} is a locus of the frame`);
  const s = genomeString(f, g), d = decodeGenomeString(s, () => f);
  assert.ok(d.ok, d.detail);
  for (const id of SLEEPERS) assert.deepEqual(d.genome.copies[id], g.copies[id], `${id}: both sleeping copies come back`);
  assert.deepEqual(Object.keys(d.genome.copies), f.heritable.map((l) => l.id)); assert.equal(genomeString(f, d.genome), s, "one genome, one string");
  assert.equal(s, "G1-S20v1-20A00XY1GC3A861080DT00AB0302GTW3SEP1008GC30R611M00801AG01410R61GC30R61GC30R6M2008VT"); assert.equal(s.length, 92);
  // the same genome with the sleeping copies swapped inside each pair is the same mibi: a pair has no order for a named record, so the string differs only where the copies are written
  const other = structuredClone(g); other.copies["appearance.emblem-place"] = ["belly", "forehead"];
  assert.notEqual(genomeString(f, other), s, "the string writes the copies in the order given: the two copies of a named record are two indexes");
});

test("the stamp code with every chapter read holds the sleeping records too, and a stamp code and a string of one mibi agree on them", () => {
  const f = tulikoFrame(), g = sleepingTuliko(f), readMask = 2 ** f.chapters.length - 1;
  const code = stampCode(f, { copies: g.copies, readMask }), back = decodeStampCode(code, () => f);
  assert.ok(back.ok, back.detail);
  for (const id of SLEEPERS) assert.deepEqual(back.genome.copies[id], g.copies[id], `${id}: stamped with its chapter`);
  assert.equal(genomeString(f, back.genome), genomeString(f, g), "stamp code to string, exactly");
});

// --- a cross, then the string and the stamp ----------------------------------------------------------------------------------------------------------
// A cat at frame version 7 that opens the whisker switch and the sleeping records, as workbench/tests/sleep.test.mjs builds it; its workbench frame is made a stamp frame the way tools/extract-frames.mjs does.
const wbSpec = () => ({
  ...specOf(SPECIES.find((s) => s.id === "S04")), frameVersion: 7, openSwitches: ["anatomy.whisker-presence"],
  open: [
    { trait: "colour" },
    { chapter: "coat", id: "emblem", name: "Emblem", loci: ["appearance.emblem", "appearance.emblem-place", "appearance.emblem-size"], looks: ["none", "heart", "star"] },
    { chapter: "coat", id: "bands", name: "Bands", loci: ["appearance.band-count"], looks: ["few", "between", "many"] },
    { chapter: "coat", id: "rosette", name: "Rosette", loci: ["appearance.marking-rosette"], looks: ["low", "between", "high"] },
    { chapter: "face", id: "whiskers", name: "Whiskers", loci: ["anatomy.whisker-presence", "form.whisker-count", "form.whisker-length"], looks: ["none", "some"] },
  ],
});
function stampFrameOf(wb, species) {
  const version = wb.frameVersion ?? 7;
  const chapters = wb.chapters.map((ch, ci) => ({
    name: ch.name, sealed: !!ch.sealed,
    loci: ch.traits.flatMap((t) => t.loci.map((id) => {
      const cat = LOCI.get(id), known = cat.alleles.filter((a) => !(a.sinceFrame > version)), numeric = cat.operator === "copy-mean" && known.every((a) => typeof a.value === "number");
      const alleles = known.map((a) => a.id);
      return { id, trait: t.id, alleles, ...(numeric ? { values: known.map((a) => a.value) } : {}), pool: wb.loci.find((r) => r.id === id).alleles, copies: 2, chapter: ci, bits: Math.max(1, Math.ceil(Math.log2(alleles.length))) };
    })),
  }));
  const heritable = chapters.flatMap((c) => c.loci);
  return { species, version, id: wb.species.id, name: wb.species.name, glyph: [".....", ".....", ".....", ".....", "....."], chapters, heritable, locked: [], borderSeed: 0, payloadBits: heritable.reduce((s, l) => s + l.bits * l.copies, 0) };
}

test("a cross hands a sleeping record's two copies down, and the child's copies survive the string and the stamp code: nothing is reset, dropped or rounded on the way", () => {
  const wb = buildFrame(wbSpec(), { samples: 20 }), sf = stampFrameOf(wb, 4090);
  const step = (id, k) => stepValue(LOCI.get(id), k);
  const mk = (over) => { const g = typeSpecimen(wb); for (const [id, pair] of Object.entries(over)) g.loci[id] = pair; return g; };
  const mother = mk({ "appearance.emblem": ["none", "none"], "appearance.emblem-place": ["forehead", "belly"], "appearance.emblem-size": [step("appearance.emblem-size", 12), step("appearance.emblem-size", 12)],
    "appearance.marking-rosette": [step("appearance.marking-rosette", 0), step("appearance.marking-rosette", 0)], "anatomy.whisker-presence": ["off", "off"], "form.whisker-length": [step("form.whisker-length", 4), step("form.whisker-length", 4)] });
  const father = mk({ "appearance.emblem": ["none", "none"], "appearance.emblem-place": ["belly", "belly"], "appearance.emblem-size": [step("appearance.emblem-size", 48), step("appearance.emblem-size", 48)],
    "appearance.marking-rosette": [step("appearance.marking-rosette", 59), step("appearance.marking-rosette", 59)], "anatomy.whisker-presence": ["off", "off"], "form.whisker-length": [step("form.whisker-length", 56), step("form.whisker-length", 56)] });
  const sleeping = ["appearance.emblem-place", "appearance.emblem-size", "appearance.band-count", "appearance.marking-rosette", "form.whisker-count", "form.whisker-length"];
  for (const id of sleeping) assert.ok(sf.heritable.some((l) => l.id === id), `${id} is in the stamp frame`);
  const r = rng("sleep-string"), readMask = 2 ** sf.chapters.length - 1, lookup = () => sf, seen = new Set();
  for (let i = 0; i < 60; i++) {
    const child = cross(wb, { id: 1, genome: mother }, { id: 2, genome: father }, { rng: r, kinship: 0 });
    const copies = Object.fromEntries(sf.heritable.map((l) => [l.id, child.loci[l.id]]));
    for (const c of copies["appearance.emblem-place"]) seen.add(c);
    // the string
    const s = genomeString(sf, { copies }), d = decodeGenomeString(s, lookup);
    assert.ok(d.ok, d.detail);
    for (const id of sleeping) assert.deepEqual(d.genome.copies[id], copies[id], `${id}: through the string`);
    assert.equal(genomeString(sf, d.genome), s);
    // the stamp code, every chapter read
    const back = decodeStampCode(stampCode(sf, { copies, readMask }), lookup);
    assert.ok(back.ok, back.detail);
    for (const id of sleeping) assert.deepEqual(back.genome.copies[id], copies[id], `${id}: through the stamp`);
  }
  assert.deepEqual([...seen].sort(), ["belly", "forehead"], "both of the mother's sleeping copies reached her children");
});
