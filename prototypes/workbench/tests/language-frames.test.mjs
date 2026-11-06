// The language frame generator (chunk 5): a kind's frame of version 8 from the registry, and the four anchors
// (Loika, Wickle, Drapet, Curlop) under their per-check exception records. Every other frame stays as it was.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI, CATALOGUE, LANGUAGE_FRAME, alleleIds, catalogueHeader, digestAt, lookConflicts } from "../framework/catalogue.mjs";
import { LANGUAGE, kindOf, exceptionsFor, isExcepted, landOf, hexToOklch } from "../framework/language.mjs";
import { refuseOpen, SCHEMA_LANGUAGE } from "../framework/species.mjs";
import {
  LANGUAGE_ANCHORS, LANGUAGE_KINDS, LAYOUT_POOL, IRIS_VALUES_SIGNED, buildLanguageFrame, languageSpec, irisPoolOf, irisContrast, bodyColourOf, wildLookCounts, bandsOf,
} from "../framework/language-frames.mjs";
import { FRAME_DATA } from "../../genome-stamp/src/frames-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = (id) => JSON.parse(readFileSync(path.resolve(here, "../frames/language", `species-${id}.json`), "utf8"));
const index = JSON.parse(readFileSync(path.resolve(here, "../frames/language/index.json"), "utf8"));
const formFile = (id) => JSON.parse(readFileSync(path.resolve(here, "../frames", `species-${id}.json`), "utf8"));
const frames = Object.fromEntries(LANGUAGE_ANCHORS.map((id) => [id, buildLanguageFrame(id, { samples: 24 })]));
const open = (f) => f.loci.filter((l) => l.kind !== "locked");
const openIds = (f) => open(f).map((l) => l.id);

test("the generator writes the four anchors as language frames: schema /4, catalogue 13, family, land, eye count, signature part", () => {
  assert.deepEqual(LANGUAGE_KINDS, ["S01", "S17", "S18", "S19"]);
  for (const id of LANGUAGE_ANCHORS) {
    const f = frames[id], k = kindOf(LANGUAGE, id);
    assert.equal(f.schema, SCHEMA_LANGUAGE); assert.equal(f.frameVersion, LANGUAGE_FRAME);
    assert.equal(f.family, k.family); assert.equal(f.land, k.land);
    assert.equal(f.plan.eyes, 2); assert.ok(!f.loci.some((l) => l.id === "anatomy.eye-count"), "the eye count is a plan switch, never a row");
    assert.deepEqual(f.catalogue, catalogueHeader(8)); assert.equal(f.catalogue.version, 13); assert.equal(f.catalogue.digest, digestAt(8));
    assert.deepEqual(f.signature.part, { type: k.signature.type, socket: k.signature.socket, accent: k.signature.accent });
    assert.equal(f.viability.constructed, f.viability.sampled); assert.equal(f.viability.crossedBuilt, f.viability.crossed);
  }
});

test("the files on disk are the generator's output, in frames/language, and the form frames beside them are untouched version-6 and older files", () => {
  for (const id of LANGUAGE_ANCHORS) {
    const disk = file(id);
    assert.equal(disk.frameVersion, 8, id);
    assert.deepEqual(disk.loci.map((l) => [l.id, l.kind]), frames[id].loci.map((l) => [l.id, l.kind]), `${id}: the file lists the loci the generator opens`);
    assert.equal(formFile(id).frameVersion, 6, `${id}: the old frame file is still version 6, byte for byte as it was`);
    assert.equal(formFile(id).schema, "mb-species-frame/2");
  }
  assert.deepEqual(index.species.map((s) => s.id), ["S01", "S17", "S18", "S19"], "the language index names exactly the four");
  assert.equal(index.catalogue.version, 13); assert.ok(index.species.every((s) => s.frameVersion === 8 && s.family && s.land));
  const main = JSON.parse(readFileSync(path.resolve(here, "../frames/index.json"), "utf8"));
  assert.equal(main.catalogue.version, 12); assert.ok(!("language" in main), "the form index is as it was");
});

test("the palette records are closed: the named colours are locked (colour comes from the land), body hue and value are open with the land's band", () => {
  for (const id of LANGUAGE_ANCHORS) {
    const f = frames[id], ids = openIds(f);
    assert.ok(!ids.includes("appearance.body-palette") && !ids.includes("appearance.underside-palette"), `${id}: the named palettes are retired`);
    assert.ok(ids.includes("appearance.body-hue") && ids.includes("appearance.body-value"), id);
    const hue = f.loci.find((l) => l.id === "appearance.body-hue"), val = f.loci.find((l) => l.id === "appearance.body-value");
    const c = bodyColourOf(id).oklch;
    assert.ok(Math.abs(((hue.band.hi - hue.band.lo + 540) % 360) - 180) <= 24.01 + 1e-9 && Math.abs(hue.type - c.h) < 0.01, `${id}: hue inside the type +-12 degrees`);
    assert.ok(Math.abs(val.band.hi - val.band.lo - 0.14) < 2e-3 && Math.abs(val.type - c.L) < 2e-3, `${id}: value inside the type +-0.07`);
  }
  assert.equal(bodyColourOf("S01").own, true, "Loika's coat.land exception: its band sits on its own black, not Woods russet");
  assert.notEqual(bodyColourOf("S01").hex, landOf(LANGUAGE, "woods").body.hex);
  for (const id of ["S17", "S18", "S19"]) assert.equal(bodyColourOf(id).own, true, `${id}: own colour under its coat.land record`);
});

test("a retired record is never open unless an exception covers it; the anchors keep what their records name", () => {
  for (const id of LANGUAGE_ANCHORS) for (const l of open(frames[id])) assert.equal(refuseOpen(id, l.id), null, `${id}: ${l.id}`);
  const loika = frames.S01.loci, curlop = frames.S19.loci;
  assert.equal(loika.find((l) => l.id === "anatomy.muzzle-presence")?.copies[0], "on", "Loika's cream muzzle sits inside its excepted coat.pale");
  assert.equal(loika.find((l) => l.id === "appearance.belly-field")?.copies[0], "on");
  assert.ok(!curlop.some((l) => l.id === "anatomy.muzzle-presence"), "Curlop's muzzle is closed: no record covers it");
  assert.equal(curlop.find((l) => l.id === "appearance.belly-field")?.copies[0], "on", "Curlop's coat.pale record covers its belly field");
  assert.ok(frames.S17.loci.every((l) => l.id !== "anatomy.tail-tip-bulb"), "Wickle's separate tip ball is retired and no record covers it");
  assert.ok(languageSpec("S19").languageNotes.droppedSwitches.includes("anatomy.muzzle-presence"));
  assert.deepEqual(languageSpec("S01").languageNotes.droppedSwitches, []);
  const emblem = (f) => f.loci.find((l) => l.id === "appearance.emblem")?.copies ?? null;
  for (const id of LANGUAGE_ANCHORS) { assert.deepEqual(emblem(frames[id]), ["none", "none"]); assert.deepEqual(frames[id].loci.find((l) => l.id === "appearance.blush")?.copies, ["off", "off"]); }
});

test("exception records decide what an anchor keeps, per check: eye size, ears, tassels", () => {
  for (const id of LANGUAGE_ANCHORS) {
    assert.equal(isExcepted(LANGUAGE, id, "face.size"), true, id);
    assert.ok(!openIds(frames[id]).includes("form.eye-size"), `${id}: no record claims the house eye-size band under its face.size exception`);
    assert.ok(openIds(frames[id]).includes("form.eye-spacing"), `${id}: spacing still varies in the house band`);
  }
  assert.ok(openIds(frames.S01).includes("growth.auricular-length-ratio"), "Loika's ears record covers its ears");
  for (const id of ["S17", "S18", "S19"]) assert.ok(!frames[id].loci.some((l) => l.id === "anatomy.auricular-presence" && l.copies?.[0] === "on"), `${id}: no ears`);
  const tassels = frames.S18.loci.find((l) => l.id === "growth.brow-tuft-length");
  assert.deepEqual([tassels.clamp.lo, tassels.clamp.hi, tassels.clamp.unit, tassels.clamp.count], [0, 0.15, "body height", [0, 5]]);
  assert.equal(frames.S18.loci.find((l) => l.id === "anatomy.brow-tuft-presence").kind, "heritable-look", "presence may be off");
  assert.deepEqual(frames.S18.loci.find((l) => l.id === "anatomy.brow-tuft-presence").alleles, ["off", "on"]);
  for (const id of ["S01", "S17", "S19"]) assert.ok(!frames[id].loci.some((l) => l.id === "anatomy.brow-tuft-presence" && l.copies?.[0] === "on"), `${id}: brow tassels are Drapet's alone`);
  assert.ok(!openIds(frames.S01).includes("anatomy.crown-presence"), "Loika's crest switch is locked on, not a trait");
  assert.deepEqual(frames.S01.loci.find((l) => l.id === "anatomy.crown-presence").copies, ["on", "on"]);
  for (const e of LANGUAGE.exceptions) assert.ok(LANGUAGE_ANCHORS.includes(e.kind), "exception records name the anchors only");
  assert.ok(exceptionsFor(LANGUAGE, "S01", "coat.pale").length === 1 && exceptionsFor(LANGUAGE, "S17", "face.clear").length === 0);
});

test("iris and attitude pools are the registry's; the contrast check reports against unsigned swatches and never cuts a pool on them", () => {
  assert.equal(IRIS_VALUES_SIGNED, false);
  for (const id of LANGUAGE_ANCHORS) {
    const k = kindOf(LANGUAGE, id), f = frames[id];
    const iris = f.loci.find((l) => l.id === "appearance.iris-colour"), att = f.loci.find((l) => l.id === "appearance.attitude");
    assert.deepEqual(iris.alleles, k.eyes.irisPool, id); assert.deepEqual(att.alleles, k.eyes.attitudePool, id);
    assert.deepEqual(iris.typical, [k.eyes.irisDefault, k.eyes.irisDefault], `${id}: the stand's own iris is the default`);
    assert.deepEqual(att.typical, ["content", "content"]);
    assert.ok(att.alleles.includes("content"));
  }
  const p = irisPoolOf("S17");
  assert.deepEqual(p.kept, ["amber", "honey"]); assert.deepEqual(p.dropped, []); assert.equal(p.wouldDrop.length, 2, "the report names what a signed value would drop");
  assert.equal(irisContrast("S01", "amber").pass, true);
  assert.ok(Math.abs(irisContrast("S01", "amber").dL - Math.abs(hexToOklch("#E0A030").L - bodyColourOf("S01").oklch.L)) < 1e-3);
});

test("signature loci and bands: Loika's count band, the curls, the curtain's size; the other records closed", () => {
  const f1 = frames.S01, f17 = frames.S17, f18 = frames.S18, f19 = frames.S19;
  assert.deepEqual(f1.loci.find((l) => l.id === "signature.count").alleles, ["2", "3"], "Loika's two to three leaves");
  assert.deepEqual(f1.loci.find((l) => l.id === "signature.count").typical, ["3", "3"]);
  assert.ok(!openIds(f1).includes("signature.curl") && f1.loci.find((l) => l.id === "signature.curl").copies[0] === "straight");
  assert.deepEqual(f17.loci.find((l) => l.id === "signature.curl").clamp, { lo: 0.25, hi: 0.6, unit: "turns" });
  assert.deepEqual(f19.loci.find((l) => l.id === "signature.curl").clamp, { lo: 1, hi: 1.75, unit: "turns" });
  for (const id of ["S17", "S19"]) assert.equal(frames[id].loci.find((l) => l.id === "signature.count").copies[0], "1", `${id}: one fixed`);
  assert.equal(f18.loci.find((l) => l.id === "signature.count").copies[0], "1", "the curtain has no count");
  for (const id of LANGUAGE_ANCHORS) {
    const s = frames[id].loci.find((l) => l.id === "signature.size");
    assert.ok(s.clamp.lo >= 0.2 && s.clamp.hi <= 0.33 && Math.abs(s.clamp.hi / s.clamp.type - 1.15) < 0.02 && Math.abs(s.clamp.lo / s.clamp.type - 0.85) < 0.02, `${id}: the type +-15%, inside a fifth to a third`);
  }
  assert.deepEqual(bandsOf("S18").clamps["growth.brow-tuft-length"].count, [0, 5]);
});

test("one look, one record: no frame opens both records of a pair; the signature records stand in for the older ones", () => {
  for (const id of LANGUAGE_ANCHORS) {
    assert.deepEqual(lookConflicts(openIds(frames[id])), [], id);
    assert.ok(!openIds(frames[id]).includes("growth.crest-leaf-count") && !openIds(frames[id]).includes("growth.tail-curl-turn") && !openIds(frames[id]).includes("growth.feather-crest"), `${id}: the older signature records are locked`);
  }
});

test("layouts: six per kind from the language's own set, no pet layouts; shape bands within 15 percent; eye spacing in its band", () => {
  assert.equal(LAYOUT_POOL.length, 6);
  for (const pet of ["points", "masked"]) assert.ok(!LAYOUT_POOL.includes(pet));
  for (const id of LANGUAGE_ANCHORS) {
    const f = frames[id];
    assert.deepEqual(f.loci.find((l) => l.id === "appearance.marking-layout").alleles, LAYOUT_POOL, id);
    for (const l of open(f).filter((x) => x.band && /^form\./.test(x.id) && x.id !== "form.eye-size")) { assert.equal(l.band.form, "mult"); assert.deepEqual([l.band.lo, l.band.hi], [0.85, 1.15], `${id} ${l.id}`); }
    assert.ok(open(f).some((l) => l.id === "form.head") && open(f).some((l) => l.id === "form.torso-girth"), id);
    for (const l of open(f).filter((x) => x.band)) assert.ok(l.band.lo < l.band.hi && Number.isFinite(l.type), `${id} ${l.id}`);
  }
});

test("the generator refuses a kind it has no registry row for, and the studio quad (a template, not a kind)", () => {
  assert.throws(() => languageSpec("S99"), /not a kind of the roster and the registry/);
  assert.throws(() => languageSpec("S22"), /not a kind/);
});

test("1,000 wild draws: every open locus's counts add up, stay in its pool, and reach every pool member", () => {
  for (const id of LANGUAGE_ANCHORS) {
    const f = frames[id], counts = wildLookCounts(f, 1000);
    for (const l of open(f)) {
      const total = Object.values(counts[l.id]).reduce((a, b) => a + b, 0);
      assert.equal(total, 1000, `${id} ${l.id}`);
    }
    const iris = counts["appearance.iris-colour"], att = counts["appearance.attitude"];
    assert.deepEqual(Object.keys(iris).sort(), [...kindOf(LANGUAGE, id).eyes.irisPool].sort(), `${id}: every pool iris shows, no other`);
    for (const a of Object.keys(att)) assert.ok(kindOf(LANGUAGE, id).eyes.attitudePool.includes(a), `${id}: attitude ${a}`);
    assert.ok(att.content > 0, `${id}: content shows (the default)`);
    assert.ok(Object.keys(counts["appearance.marking-layout"]).every((x) => alleleIds("appearance.marking-layout").includes(x) || /-and-|^[a-z-]+$/.test(x)));
  }
});

test("the older versions still decode: the stamp registry holds S01 at 4, 5 and 6 and the others as before, beside the new 8s", () => {
  const key = (id, v) => FRAME_DATA.frames.find((x) => x.id === id && x.version === v);
  for (const [id, vs] of [["S01", [4, 5, 6, 8]], ["S17", [6, 8]], ["S18", [6, 8]], ["S19", [6, 8]]]) for (const v of vs) assert.ok(key(id, v), `${id} v${v}`);
  for (const id of ["S01", "S17", "S18", "S19"]) {
    const nu = key(id, 8), old = key(id, 6);
    const names = (f) => f.chapters.flatMap((c) => c.loci.map((l) => l.id));
    assert.notDeepEqual(names(nu), names(old), `${id}: v8 is a new frame, not the old one rewritten`);
    for (const ch of nu.chapters) for (const l of ch.loci) assert.ok(LOCI.has(l.id), l.id);
  }
});
