// Catalogue 13, the language pin (the language codification chunk 2): the new records, the appended layouts, eye count as a plan
// switch, the retired mark and the refusals, the frame of version 8 and later, and every older frame byte for byte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, LOCI, VALIDATED, PLAN_SWITCHES, RETIRED_MARK, LANGUAGE_FRAME, alleleIds, digestAt, catalogueHeader, pinOfFrame, resolveCopies, valueRange, SIGNATURE_COUNT_MAX } from "../framework/catalogue.mjs";
import { buildFrame, refuseOpen, SCHEMA, SCHEMA_LANGUAGE } from "../framework/species.mjs";
import { SPECIES, specOf } from "../framework/roster.mjs";
import { LANGUAGE, IRIS_COLOURS, ATTITUDES, EYE_COUNTS } from "../framework/language.mjs";
import { FRAME_DATA } from "../../genome-stamp/src/frames-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const spec = (id, extra = {}) => ({ ...specOf(SPECIES.find((s) => s.id === id)), frameVersion: LANGUAGE_FRAME, ...extra });
const build = (s) => buildFrame(s, { samples: 12 });
const refusal = (s) => { try { build(s); return null; } catch (e) { return e.message; } };

test("catalogue 13 is the language pin: six new trunk records, each from frame 8", () => {
  assert.equal(CATALOGUE.version, 13);
  assert.equal(CATALOGUE.schema, "mb-catalogue/13");
  assert.equal(LANGUAGE_FRAME, 8);
  const fresh = CATALOGUE.loci.filter((l) => l.sinceFrame);
  assert.deepEqual(fresh.filter((l) => l.sinceFrame === 8).map((l) => l.id), ["anatomy.eye-count", "appearance.iris-colour", "appearance.attitude", "signature.size", "signature.count", "signature.curl"]);
  for (const l of fresh.filter((x) => x.sinceFrame === 8)) { assert.equal(l.sinceFrame, 8); assert.equal(l.scope, "trunk", `${l.id}: trunk`); assert.equal(l.status, "validated"); }
  assert.equal(pinOfFrame(7), 12, "a frame older than 8 keeps pin 12");
  assert.equal(pinOfFrame(8), 13);
  assert.deepEqual(catalogueHeader(7), { id: CATALOGUE.id, version: 12, digest: digestAt(7), parent: CATALOGUE.parent }, "frames of 7 or older: pin 12 and its digest");
  assert.deepEqual(catalogueHeader(8), { id: CATALOGUE.id, version: 13, digest: CATALOGUE.digest, parent: CATALOGUE.parent }, "frames of 8 and later: pin 13 and the full digest");
  assert.equal(digestAt(7), "98419b59dd1a826d66bbd1b0c17988dec64c51fcc2076e2b18bd72eb987d876c", "pin 12's content is unchanged by pin 13");
  assert.equal(digestAt(6), "2ca450b04bfbcb4ca434b8e14195f111e9f381a27ea7c6c207cb06884f5ec42b");
  assert.notEqual(CATALOGUE.digest, digestAt(7));
});

test("anatomy.eye-count is a plan switch: two or three, never carried, and nothing may vary it", () => {
  const l = LOCI.get("anatomy.eye-count");
  assert.equal(l.switch, "plan");
  assert.ok(PLAN_SWITCHES.has("anatomy.eye-count"));
  assert.deepEqual(l.alleles.map((a) => a.value), [2, 3]);
  assert.deepEqual(EYE_COUNTS, [2, 3]);
  for (const id of ["S12", "S14", "S16"]) assert.ok(!build(spec(id)).loci.some((x) => x.id === "anatomy.eye-count"), `${id}: a plan switch is a frame fact, never a locus row`);
  assert.equal(build(spec("S14")).plan.eyes, 2);
});

test("iris colour and attitude are first-ranked pair maps over the language's words", () => {
  const iris = LOCI.get("appearance.iris-colour"), att = LOCI.get("appearance.attitude");
  assert.deepEqual(alleleIds(iris.id), IRIS_COLOURS, "the registry's nine iris colours, in its order");
  assert.deepEqual(alleleIds(att.id), ATTITUDES, "content > curious > deadpan > knowing");
  assert.equal(resolveCopies(iris, ["teal", "amber"]), "amber", "the first-ranked shows");
  assert.equal(resolveCopies(iris, ["copper", "violet"]), "violet");
  assert.equal(resolveCopies(att, ["knowing", "content"]), "content");
  assert.equal(resolveCopies(att, ["knowing", "deadpan"]), "deadpan");
  for (const l of [iris, att]) for (const a of l.alleles) for (const b of l.alleles) assert.ok(Object.hasOwn(l.pairMap, [a.id, b.id].sort().join("|")), `${l.id}: complete pair map`);
});

test("signature size, count and curl carry the language's bands", () => {
  assert.deepEqual(valueRange(LOCI.get("signature.size")), [0.2, 0.33], "a fifth to a third of standing height");
  assert.deepEqual(valueRange(LOCI.get("signature.curl")), [0, 1.75], "no turn to the most any kind has (Curlop's 1.75)");
  const count = LOCI.get("signature.count");
  assert.equal(count.alleles.length, SIGNATURE_COUNT_MAX);
  assert.equal(SIGNATURE_COUNT_MAX, 13, "Belatz's quill crown reaches 13");
  assert.deepEqual(count.alleles.map((a) => a.value), Array.from({ length: 13 }, (_, i) => i + 1));
  assert.equal(resolveCopies(count, ["1", "13"]), 7, "whole numbers: a child is the mean, rounded up");
  assert.equal(resolveCopies(count, ["2", "3"]), 3);
  for (const a of count.alleles) for (const b of count.alleles) assert.ok(Number.isInteger(resolveCopies(count, [a.id, b.id])));
  const bands = LANGUAGE.kinds.filter((k) => Array.isArray(k.signature.count));
  for (const k of bands) assert.ok(k.signature.count[0] >= 1 && k.signature.count[1] <= SIGNATURE_COUNT_MAX, `${k.id}: the registry's count band fits the record`);
  for (const k of LANGUAGE.kinds) if (Array.isArray(k.signature.curl)) assert.ok(k.signature.curl[1] <= 1.75, `${k.id}: the registry's curl band fits the record`);
});

test("appearance.marking-layout gains saddle, brindle, gradient and back-spots, appended; older copies keep their index", () => {
  assert.deepEqual(alleleIds("appearance.marking-layout"), ["bands", "patches", "masked", "points", "spotted", "capped", "saddle", "brindle", "gradient", "back-spots"], "the language layouts sit at indices 6 to 9, after Tuliko's four at 2 to 5");
  assert.deepEqual(alleleIds("appearance.marking-layout", 7), ["bands", "patches", "masked", "points", "spotted", "capped"], "a frame of 7 sees the six it was built with");
  assert.deepEqual(alleleIds("appearance.marking-layout", 6), ["bands", "patches"]);
  assert.deepEqual(alleleIds("appearance.marking-layout", 8), alleleIds("appearance.marking-layout"));
  const l = LOCI.get("appearance.marking-layout");
  assert.equal(resolveCopies(l, ["bands", "patches"]), "bands-and-patches", "the old pair keeps its look");
  assert.equal(resolveCopies(l, ["patches", "patches"]), "patches");
  for (const a of l.alleles) for (const b of l.alleles) assert.ok(Object.hasOwn(l.pairMap, [a.id, b.id].sort().join("|")), "complete pair map");
  for (const id of ["saddle", "brindle", "gradient", "back-spots"]) { assert.equal(resolveCopies(l, [id, id]), id); assert.ok(l.alleles.find((a) => a.id === id).sinceFrame > 7); }
  for (const [a, b, want] of [["masked", "saddle", "saddle"], ["capped", "back-spots", "back-spots"], ["bands", "gradient", "gradient"], ["saddle", "brindle", "brindle"], ["gradient", "back-spots", "back-spots"]]) assert.equal(resolveCopies(l, [a, b]), want, `${a} with ${b}`);
  assert.equal(resolveCopies(l, ["masked", "capped"]), "masked", "Tuliko's own order is untouched");
  assert.equal(resolveCopies(l, ["points", "spotted"]), "points");
  assert.deepEqual(l.addedAlleles.ids, ["masked", "points", "spotted", "capped", "saddle", "brindle", "gradient", "back-spots"]);
});

test("the retired mark: each record keeps its body, says why, and names the check that could cover it", () => {
  const retired = CATALOGUE.loci.filter((l) => l.retired);
  assert.ok(retired.length >= 20);
  for (const l of retired) { assert.equal(l.retired, RETIRED_MARK); assert.ok(l.retiredWhy.length > 10, l.id); assert.ok(l.alleles.length >= 2, `${l.id}: retired, never deleted`); }
  assert.equal(RETIRED_MARK, "language 2026-11-05");
  const covers = Object.fromEntries(retired.filter((l) => l.retiredCoveredBy).map((l) => [l.id, l.retiredCoveredBy]));
  assert.deepEqual(covers["appearance.belly-field"], { check: "coat.pale" });
  assert.deepEqual(covers["anatomy.auricular-presence"], { check: "face.clear", scope: "ears" });
  assert.deepEqual(covers["appearance.body-palette"], { check: "coat.land" });
  assert.equal(LOCI.get("anatomy.muzzle-presence").retiredCoveredBy, null, "the catalogue names no check for a muzzle; only Loika's own record covers it");
  assert.ok(!LOCI.get("anatomy.shell-presence").retired, "the shell-carrier keeps its dome shell");
});

test("every covered record is covered by a record the registry really holds, and the scoped ones by their scope", () => {
  const covered = CATALOGUE.loci.filter((l) => l.retiredCoveredBy);
  for (const l of covered) assert.ok(LANGUAGE.exceptions.some((e) => e.check === l.retiredCoveredBy.check && (!l.retiredCoveredBy.scope || e.scope === l.retiredCoveredBy.scope)), `${l.id}: some anchor's exception covers it`);
  assert.equal(refuseOpen("S01", "anatomy.auricular-presence"), null, "Loika's ears record covers its ears");
  assert.match(refuseOpen("S02", "anatomy.auricular-presence"), /no exception record of S02 covers it/);
  assert.match(refuseOpen("S18", "anatomy.auricular-presence"), /no exception record of S18 covers it/, "Drapet's record is for brow tufts, not ears");
  assert.equal(refuseOpen("S01", "appearance.belly-field"), null, "Loika keeps its belly field under coat.pale");
  assert.equal(refuseOpen("S17", "appearance.underside-palette"), null, "Wickle's pale areas");
  assert.match(refuseOpen("S02", "appearance.belly-field"), /would take coat\.pale/);
  assert.equal(refuseOpen("S01", "anatomy.muzzle-presence"), null, "Loika's cream muzzle sits inside its excepted coat.pale (art desk, chunk 5)");
  assert.match(refuseOpen("S19", "anatomy.muzzle-presence"), /no exception record of S19 covers it/, "no other anchor exception covers a muzzle");
  assert.equal(refuseOpen("S02", "appearance.marking-layout"), null, "a live record is never refused");
});

test("buildFrame refuses to open a retired record unless an exception covers it", () => {
  const base = spec("S14");
  assert.match(refusal({ ...base, openSwitches: ["anatomy.muzzle-presence"] }) ?? "", /refuses to open anatomy\.muzzle-presence: retired \(language 2026-11-05/);
  assert.match(refusal({ ...base, features: { ...base.features, "anatomy.beak-presence": "on" } }) ?? "", /refuses to switch on anatomy\.beak-presence: retired/);
  assert.match(refusal({ ...base, open: [{ trait: "colour" }] }) ?? "", /refuses to open appearance\.body-palette: retired .* would take coat\.land/, "a kind with no exception cannot open the named colours");
  assert.doesNotMatch(refusal({ ...base, frameVersion: 7, openSwitches: ["anatomy.muzzle-presence"] }) ?? "", /retired/, "a frame older than 8 is not asked");
});

test("buildFrame refuses to open exterior-eye-presence or the eye count, and locks the count to the registry", () => {
  const base = spec("S14");
  assert.match(refusal({ ...base, openSwitches: ["anatomy.exterior-eye-presence"] }) ?? "", /refuses to open anatomy\.exterior-eye-presence: eyes are always on/);
  assert.match(refusal({ ...base, features: { ...base.features, "anatomy.exterior-eye-presence": "off" } }) ?? "", /refuses to switch off anatomy\.exterior-eye-presence/);
  assert.match(refusal({ ...base, open: [{ id: "eyes", chapter: "face", name: "Eyes", loci: ["anatomy.eye-count"], looks: ["two", "three"] }] }) ?? "", /refuses to open anatomy\.eye-count: eye count is a plan switch/);
  assert.match(refusal({ ...base, eyes: 4 }) ?? "", /eye count 4/);
  assert.match(refusal({ ...base, eyes: 1 }) ?? "", /eye count 1/);
  assert.match(refusal({ ...base, eyes: 3 }) ?? "", /registry says 2; nothing varies it/, "three eyes on a two-eyed kind");
  assert.equal(build({ ...base, id: "T99", eyes: 3 }).plan.eyes, 3, "a kind outside the registry may state three");
  assert.equal(build(base).signature.features["anatomy.exterior-eye-presence"], "on");
});

test("a frame of version 8 is schema /4 with family, land and the signature part in its header; its new records are carried, none open", () => {
  assert.equal(SCHEMA, "mb-species-frame/2");
  assert.equal(SCHEMA_LANGUAGE, "mb-species-frame/4");
  const f = build(spec("S14"));
  assert.equal(f.schema, SCHEMA_LANGUAGE);
  assert.equal(f.frameVersion, 8);
  assert.equal(f.family, "slider");
  assert.equal(f.land, "marsh");
  assert.deepEqual(f.signature.part, { type: "one coil on the crown", socket: "head-top", accent: "land" });
  assert.equal(f.catalogue.version, 13);
  assert.equal(f.catalogue.digest, CATALOGUE.digest);
  const ids = ["appearance.iris-colour", "appearance.attitude", "signature.size", "signature.count", "signature.curl"];
  for (const id of ids) assert.equal(f.loci.find((l) => l.id === id)?.kind, "locked", `${id}: carried, locked; the generator (chunk 5) opens them`);
  assert.equal(f.viability.constructed, f.viability.sampled);
});

test("a generated frame of version 8 never opens a retired record", () => {
  for (const id of ["S12", "S14", "S16"]) {
    const f = build(spec(id));
    for (const l of f.loci.filter((x) => x.kind !== "locked")) assert.equal(refuseOpen(id, l.id), null, `${id}: ${l.id}`);
  }
});

test("every form frame of version 7 or older is as at pin 12: schema /2, pin 12 and the digest of its own version, none of the new records, none of the new alleles", () => {
  assert.equal(frames.length, 19);
  for (const f of frames) {
    const id = f.species.id, fv = f.frameVersion ?? 4;
    assert.ok(fv < LANGUAGE_FRAME);
    assert.equal(f.schema, "mb-species-frame/2", id);
    assert.equal(f.catalogue.version, 12, `${id}: stamped as built, pin 12`);
    assert.equal(f.catalogue.digest, digestAt(fv), `${id}: the digest of the content its version sees`);
    for (const row of f.loci) {
      assert.ok(!(LOCI.get(row.id).sinceFrame > fv), `${id}: ${row.id} starts at a later frame`);
      for (const a of row.alleles ?? []) assert.ok(alleleIds(row.id, fv).includes(a), `${id}: ${row.id} ${a}`);
      for (const a of row.copies ?? []) assert.ok(alleleIds(row.id, fv).includes(a), `${id}: ${row.id} ${a}`);
    }
    assert.ok(!("family" in f) && !("land" in f) && !("part" in f.signature), `${id}: no language header`);
    assert.ok(!f.plan.eyes);
  }
});

test("the stamp registry's allele lists for frames older than 8 hold none of catalogue 13's alleles", () => {
  const old = FRAME_DATA.frames.filter((x) => x.version < LANGUAGE_FRAME && x.id !== "S20");   // S20 is stamp key 1 of a frame at version 7
  assert.ok(old.length >= 19);
  for (const sf of old) for (const ch of sf.chapters) for (const l of ch.loci) {
    assert.ok(!(LOCI.get(l.id).sinceFrame > sf.version), `${sf.id} v${sf.version}: ${l.id} starts at a later frame`);
    for (const a of l.alleles) assert.ok(alleleIds(l.id, 7).includes(a), `${sf.id} v${sf.version}: ${l.id} lists ${a}`);
  }
});

test("old frames build byte for byte: build-frames --check finds all nineteen files unchanged", () => {
  const out = execFileSync("node", [path.resolve(here, "../framework/build-frames.mjs"), "--check"], { encoding: "utf8" });
  assert.match(out, /\nok\n$/);
  assert.equal(out.split("\n").filter((l) => /viable 200\/200/.test(l)).length, 19);
});

test("the catalogue keeps one record per id and every plan switch is a record", () => {
  assert.equal(new Set(CATALOGUE.loci.map((l) => l.id)).size, CATALOGUE.loci.length);
  for (const id of PLAN_SWITCHES) assert.ok(LOCI.has(id), id);
  assert.ok(VALIDATED.every((l) => l.alleles.length >= 2));
});

test("the registry's fixture file exists: S20, the frozen old Tuliko, is a file on this line", () => {
  assert.ok(LANGUAGE.fixtures.length >= 1);
  for (const fx of LANGUAGE.fixtures) {
    const file = path.resolve(here, "../body", fx.file);
    assert.ok(existsSync(file), `${fx.id}: ${fx.file} is not there (${file})`);
  }
});
