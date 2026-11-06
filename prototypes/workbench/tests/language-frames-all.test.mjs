// The nineteen language frames (chunks 5 and 7): every kind of the roster but the fixture and the template, as a frame of version 8
// written by the generator from the registry. Reads the files on disk; builds a few kinds again to prove the files are the generator's output.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LOCI, LANGUAGE_FRAME, digestAt, catalogueHeader, lookConflicts, alleleIds } from "../framework/catalogue.mjs";
import { LANGUAGE, kindOf, isExcepted } from "../framework/language.mjs";
import { refuseOpen, SCHEMA_LANGUAGE } from "../framework/species.mjs";
import { LANGUAGE_KINDS, LAYOUT_POOL, LAYOUT_SHARES, buildLanguageFrame, languageSpec, irisPoolOf, wildLookCounts } from "../framework/language-frames.mjs";
import { FRAME_DATA } from "../../genome-stamp/src/frames-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => JSON.parse(readFileSync(path.resolve(here, "..", ...p), "utf8"));
const frames = Object.fromEntries(LANGUAGE_KINDS.map((id) => [id, read("frames/language", `species-${id}.json`)]));
const open = (f) => f.loci.filter((l) => l.kind !== "locked");
const tot = (m) => Object.values(m).reduce((a, b) => a + b, 0);

test("nineteen frames, schema /4 on catalogue 13: family, land, eye count and signature part come from the registry", () => {
  assert.equal(LANGUAGE_KINDS.length, 19);
  for (const id of LANGUAGE_KINDS) {
    const f = frames[id], k = kindOf(LANGUAGE, id);
    assert.equal(f.schema, SCHEMA_LANGUAGE, id); assert.equal(f.frameVersion, LANGUAGE_FRAME, id);
    assert.equal(f.family, k.family, id); assert.equal(f.land, k.land, id);
    assert.deepEqual(f.catalogue, catalogueHeader(LANGUAGE_FRAME), id);
    assert.equal(f.catalogue.version, 13, `${id}: frames of version 8 name pin 13, though the catalogue is 14`);
    assert.equal(f.plan.eyes, id === "S15" ? 3 : 2, `${id}: Lehten three eyes, Belatz and every other kind two`);
    assert.ok(!f.loci.some((l) => l.id === "anatomy.eye-count" && l.kind !== "locked"), `${id}: the eye count is a plan switch, never a row`);
    assert.ok(!f.loci.some((l) => l.id === "form.torso-length"), `${id}: v8 cannot open body length`);
    assert.deepEqual(f.signature.part, { type: k.signature.type, socket: k.signature.socket, accent: k.signature.accent }, id);
    assert.equal(f.viability.constructed, f.viability.sampled, id); assert.equal(f.viability.crossedBuilt, f.viability.crossed, id);
  }
  assert.deepEqual(LANGUAGE_KINDS.filter((id) => frames[id].species.parked), ["S05", "S06", "S07"], "the parked frames stay parked");
});

test("a retired record is open nowhere, and a retired part is on only where a signed record covers it", () => {
  for (const id of LANGUAGE_KINDS) {
    const f = frames[id];
    for (const l of open(f)) assert.equal(refuseOpen(id, l.id), null, `${id}: ${l.id}`);
    for (const l of f.loci.filter((x) => x.kind === "locked" && LOCI.get(x.id)?.retired && x.copies[0] === "on")) assert.equal(refuseOpen(id, l.id), null, `${id}: ${l.id} is on but retired`);
    assert.deepEqual(lookConflicts(open(f).map((l) => l.id)), [], id);
    assert.ok(!open(f).some((l) => ["growth.crest-leaf-count", "growth.tail-curl-turn", "growth.feather-crest"].includes(l.id) && open(f).some((x) => x.id.startsWith("signature."))), `${id}: one record for one look`);
  }
  const on = (id, rec) => frames[id].loci.find((l) => l.id === rec)?.copies?.[0] === "on";
  assert.ok(on("S01", "anatomy.muzzle-presence") && on("S19", "anatomy.muzzle-presence") && on("S17", "anatomy.tail-tip-bulb"));
  for (const id of LANGUAGE_KINDS.filter((x) => !["S01", "S19"].includes(x))) assert.ok(!on(id, "anatomy.muzzle-presence"), `${id}: no muzzle`);
  for (const id of LANGUAGE_KINDS.filter((x) => !["S17", "S18"].includes(x))) assert.ok(!on(id, "anatomy.tail-tip-bulb"), `${id}: no tip ball`);
  for (const id of ["S03", "S09"]) assert.ok(!on(id, "anatomy.beak-presence") && !on(id, "anatomy.tail-tip-bulb"), `${id}: beak and bulb retired`);
  assert.ok(!on("S15", "anatomy.leaf-presence") && !on("S15", "energy.light-feeding"), "Lehten is no walking plant");
});

test("every frame opens colour, the layouts, iris, attitude and the shape bands the registry gives, and the signature bands", () => {
  for (const id of LANGUAGE_KINDS) {
    const f = frames[id], k = kindOf(LANGUAGE, id), by = (rec) => f.loci.find((l) => l.id === rec);
    assert.ok(by("appearance.body-hue").kind !== "locked" && by("appearance.body-value").kind !== "locked", id);
    assert.deepEqual(by("appearance.marking-layout").alleles, LAYOUT_POOL, id); assert.deepEqual(by("appearance.marking-switch").alleles, ["on", "off"], id);
    assert.deepEqual(by("appearance.iris-colour").alleles, irisPoolOf(id).kept, id); assert.deepEqual(by("appearance.iris-colour").alleles, k.eyes.irisPool, `${id}: no iris dropped`);
    assert.deepEqual(by("appearance.iris-colour").typical, [k.eyes.irisDefault, k.eyes.irisDefault], id);
    assert.deepEqual(by("appearance.attitude").alleles, k.eyes.attitudePool, id);
    assert.ok(by("form.eye-spacing")?.band, `${id}: eye spacing band`);
    for (const l of open(f).filter((x) => x.band && /^form\.(head|torso-girth|leg-|tail-)/.test(x.id))) assert.deepEqual([l.band.form, l.band.lo, l.band.hi], ["mult", 0.85, 1.15], `${id} ${l.id}`);
    const sc = by("signature.count");
    if (Array.isArray(k.signature.count)) { assert.equal(sc.kind !== "locked", true, id); assert.deepEqual(sc.alleles.map(Number), Array.from({ length: k.signature.count[1] - k.signature.count[0] + 1 }, (_, i) => k.signature.count[0] + i), id); assert.equal(sc.draw, "alike", id); }
    else assert.equal(sc.kind, "locked", `${id}: a fixed or absent count is locked`);
    if (Array.isArray(k.signature.curl)) assert.deepEqual([by("signature.curl").clamp.lo, by("signature.curl").clamp.hi], k.signature.curl, id);
    if (k.signature.type && k.signature.socket) { const c = by("signature.size").clamp; assert.ok(c.lo >= 0.2 && c.hi <= 0.33, id); }
  }
  assert.deepEqual(frames.S01.loci.find((l) => l.id === "signature.count").alleles, ["1", "2", "3", "4", "5"]);
});

test("the language is silent on movement, stamina and character, so each kind keeps the traits of those chapters its older frame had", () => {
  let kept = 0;
  for (const id of LANGUAGE_KINDS.filter((x) => !["S01", "S17", "S18", "S19"].includes(x))) {
    const old = read("frames", `species-${id}.json`), nu = frames[id];
    assert.ok(old.frameVersion === undefined || old.frameVersion < 8, `${id}: the older frame file is untouched`);
    const names = (f, chapters) => f.chapters.filter((c) => chapters.includes(c.id)).flatMap((c) => c.traits.map((t) => t.id));
    const want = names(old, ["movement", "stamina", "character", "charge"]).filter((t) => !(id === "S15" && t === "light-feeding"));
    assert.deepEqual(names(nu, ["movement", "stamina", "character", "charge"]).sort(), want.sort(), id);
    kept += want.length;
  }
  assert.ok(kept > 40, `${kept} kept traits`);
  assert.ok(!frames.S15.chapters.flatMap((c) => c.traits).some((t) => t.id === "light-feeding"), "light feeding is a retired record");
});

test("every frame carries its wild shares: iris and attitude on 60 percent for the stand's own, layouts as asked, none under 5 percent", () => {
  for (const id of LANGUAGE_KINDS) {
    const f = frames[id], k = kindOf(LANGUAGE, id), c = wildLookCounts(f, 3000, "all");
    const iris = c["appearance.iris-colour"], att = c["appearance.attitude"], lay = c["appearance.marking-layout"];
    assert.ok(Math.abs(iris[k.eyes.irisDefault] / tot(iris) - 0.6) < 0.05, `${id}: default iris near 60 percent`);
    for (const [a, n] of Object.entries(iris)) if (a !== k.eyes.irisDefault) assert.ok(n / tot(iris) > 0.05, `${id}: iris ${a}`);
    assert.ok(Math.abs(att.content / tot(att) - 0.6) < 0.05, `${id}: content near 60 percent`);
    for (const [a, n] of Object.entries(att)) if (a !== "content") assert.ok(n / tot(att) > 0.05, `${id}: attitude ${a}`);
    for (const [name, want] of Object.entries(LAYOUT_SHARES)) assert.ok(Math.abs((lay[name] ?? 0) / tot(lay) - want) < 0.035, `${id}: ${name} near ${want}`);
    assert.ok(!lay["bands-and-patches"] && !lay.brindle, `${id}: no mixed or brindle coat in the wild`);
  }
});

test("the files are the generator's output (three kinds built again), and the stamp registry keeps every older version beside the new 8", () => {
  for (const id of ["S02", "S09", "S15"]) {
    const again = buildLanguageFrame(id, { samples: 24 });
    assert.deepEqual(frames[id].loci.map((l) => [l.id, l.kind, l.alleles ?? l.copies, l.weights ?? null]), again.loci.map((l) => [l.id, l.kind, l.alleles ?? l.copies, l.weights ?? null]), id);
    assert.equal(frames[id].plan.eyes, again.plan.eyes);
  }
  const versionsOf = (id) => FRAME_DATA.frames.filter((x) => x.id === id).map((x) => x.version).sort((a, b) => a - b);
  for (const id of LANGUAGE_KINDS) {
    const vs = versionsOf(id);
    assert.ok(vs.includes(8), `${id}: the stamp holds version 8`);
    assert.ok(vs.length >= 2, `${id}: and an older version beside it (${vs.join(", ")})`);
    const nu = FRAME_DATA.frames.find((x) => x.id === id && x.version === 8);
    for (const ch of nu.chapters) for (const l of ch.loci) assert.ok(LOCI.has(l.id) && !(LOCI.get(l.id).sinceFrame > 8), `${id}: ${l.id}`);
  }
  // the version 8 features come from family, face and signature, so a retired switch is never listed to be dropped
  assert.equal("anatomy.leaf-presence" in languageSpec("S15").features, false);
  assert.deepEqual(languageSpec("S15").languageNotes.droppedSwitches, []);
});
