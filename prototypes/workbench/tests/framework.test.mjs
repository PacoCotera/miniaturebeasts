import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, VALIDATED, PLAN_SWITCHES, PART_SWITCHES, LOCI, resolveCopies } from "../framework/catalogue.mjs";
import { planFacts, rigOf, parsePlanKey } from "../framework/plans.mjs";
import { buildIndividual, sampleIndividual, typeSpecimen, crossIndividuals, shapeTrait, checkGenome, rng } from "../framework/species.mjs";
import { silhouetteMask, render, fitCamera } from "../framework/raster.mjs";
import { validateBody } from "../framework/validate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);

test("catalogue 7 carries catalogue6 plus the taxonomy's 6 switches · 15 loci and the three clan gaps", () => {
  const v1 = CATALOGUE.loci.filter((l) => l.provenance.catalogue.startsWith("genomic-compositional-source-experiment"));
  const mine = CATALOGUE.loci.filter((l) => l.provenance.catalogue === "mb-genome-framework@7");
  assert.equal(v1.filter((l) => l.status === "validated").length, 114);
  assert.equal(v1.filter((l) => l.status !== "validated").length, 6);
  assert.equal(mine.length, 45);
  const gaps = (l) => ["anatomy.tail-tip-bulb", "anatomy.top-cap-sheet", "appearance.cap-palette", "appearance.cap-spots", "appearance.belly-field", "growth.crest-leaf-count"].includes(l.id);
  const kinds = mine.filter((l) => !gaps(l) && l.id !== "energy.light-feeding" && !l.id.startsWith("appearance.emission"));
  assert.equal(kinds.filter((l) => l.switch === "part").length, 11, "eleven new switches");
  assert.equal(kinds.filter((l) => l.switch !== "part").length, 25, "twenty-five new loci");
  assert.equal(mine.filter(gaps).length, 6, "the tail bulb, the cap sheet with colour and spots, the belly field and crest leaves");
  assert.equal(CATALOGUE.loci.filter((l) => l.addedAlleles).reduce((n, l) => n + l.addedAlleles.ids.length, 0), 5, "hoof, webbed, root, one pair, huge");
  assert.equal(PLAN_SWITCHES.size, 23);
  assert.ok([...PART_SWITCHES].every((id) => LOCI.has(id)));
  assert.equal(CATALOGUE.parent.foundationDigest.length, 64);
});

test("operators resolve as v1 does", () => {
  assert.equal(resolveCopies(LOCI.get("growth.core-half-length"), ["small", "large"]), 0.605);
  assert.equal(resolveCopies(LOCI.get("appearance.marking-switch"), ["on", "off"]), false, "markings are recessive");
  assert.equal(resolveCopies(LOCI.get("anatomy.crown-presence"), ["on", "off"]), true, "the crown is dominant");
  assert.deepEqual(resolveCopies(LOCI.get("appearance.body-palette"), ["marigold", "charcoal"]), ["#465459", "#e8b83f"]);
  assert.equal(resolveCopies(LOCI.get("organization.region-depth"), ["one", "three"]), 2);
});

test("the 16 roster plans map to the seven body rigs and their limb sets", () => {
  const rigs = new Set(frames.map((f) => f.plan.rig));
  assert.deepEqual([...rigs].sort(), ["B1", "B2", "B3", "Bfan", "R1", "Rfan2"], "six body rigs in the roster (the seventh, Rfan3, is in plans.mjs)");
  const petalu = planFacts("three|serial|bilateral|contact|zero|one|three|on|skin");
  assert.deepEqual(petalu.stations.map((s) => s.region), [0, 1, 2], "one leg pair per region on a three-region six-legged plan");
  assert.equal(petalu.flapRegion, 1, "wings on the thorax");
  assert.equal(petalu.posture, "splayed");
  const ocotin = planFacts("two|serial|bilateral|contact|zero|one|two|off|scales", { join: "narrow" });
  assert.deepEqual(ocotin.stations.map((s) => s.region), [0, 1], "fore legs on the front region, hind legs on the back one");
  assert.equal(ocotin.head, "neck");
  assert.equal(rigOf(parsePlanKey("two|fan|radial|contact|zero|one|two|off|skin")), "Rfan2");
});

test("every frame carries only trunk loci its plan owns plus its clan's branch; the rest are absent", () => {
  assert.equal(frames.length, 16);
  for (const f of frames) {
    assert.equal(f.counts.carried + f.counts.absent, VALIDATED.length - PLAN_SWITCHES.size, `${f.species.id}: carried + absent = validated − plan switches`);
    assert.ok(f.loci.every((l) => l.scope === "trunk" || l.clan === f.taxonomy.clan));
    assert.equal(f.viability.constructed, f.viability.sampled);
    for (const ch of f.chapters) for (const t of ch.traits) assert.ok(t.loci.every((id) => f.loci.some((l) => l.id === id && l.kind !== "locked")));
  }
  const zac = frameOf("S01");
  assert.ok(zac.absent.some((a) => a.id === "growth.wing-span-ratio"), "a zacatín has no wing locus at all");
  assert.ok(zac.loci.some((l) => l.id === "appearance.belly-field" && l.scope === "branch"), "but its clan's belly field");
  assert.ok(zac.absent.some((a) => a.id === "anatomy.tail-tip-bulb" && a.why.includes("C03")));
  assert.equal(zac.counts.open, 5, "exactly the five traits of the Pip proof");
  const s03 = frameOf("S03");
  assert.ok(s03.chapters.some((c) => c.id === "glow" && c.traits.every((t) => !t.shapeable)), "the glow is a doing");
  assert.ok(frameOf("S16").chapters.some((c) => c.id === "charge" && c.sealed), "the lightning kind's Charge chapter is sealed");
  assert.ok(frameOf("S04").loci.some((l) => l.id === "appearance.fur-reach"), "mammal look loci are trunk");
});

test("an individual resolves against its frame: sleeping parts, absent parts, foreign loci", () => {
  const zac = frameOf("S01");
  const g = typeSpecimen(zac);
  g.loci["appearance.marking-switch"] = ["off", "off"];
  const built = buildIndividual(zac, g);
  assert.equal(built.validation.status, "valid");
  const layout = built.resolved.facts.find((f) => f.id === "appearance.marking-layout");
  assert.equal(layout.state, "asleep", "marking parts sleep when the switch is off");
  assert.equal(built.scene.markings, null);
  assert.ok(!("wing.outwardSpanOverCoreRx" in built.resolved.values), "absent parts never enter the rig");
  const foreign = structuredClone(g); foreign.loci["growth.wing-span-ratio"] = ["short", "short"];
  assert.throws(() => buildIndividual(zac, foreign), /does not have/);
  assert.ok(checkGenome(zac, foreign).length > 0);
});

test("crosses pass one copy from each parent and keep locked copies; shaping picks among the pod's own copies", () => {
  const oc = frameOf("S03");
  const r = rng("test");
  const a = sampleIndividual(oc, r), b = sampleIndividual(oc, r);
  const child = crossIndividuals(oc, a, b, r);
  for (const l of oc.loci) {
    if (l.kind === "locked") assert.deepEqual(child.loci[l.id], l.copies);
    else { assert.ok(a.loci[l.id].includes(child.loci[l.id][0])); assert.ok(b.loci[l.id].includes(child.loci[l.id][1])); }
  }
  assert.equal(checkGenome(oc, child).length, 0);
  const shaped = shapeTrait(oc, a, "eyes", 1);
  for (const id of ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"]) assert.deepEqual(shaped.loci[id], [a.loci[id][0], a.loci[id][0]]);
  assert.throws(() => crossIndividuals(frameOf("S01"), a, b, r), /same-species/);
});

test("the same genome gives the same bytes: silhouette and shaded render", () => {
  const f = frameOf("S12");
  const g = sampleIndividual(f, rng("bytes"));
  const one = buildIndividual(f, g), two = buildIndividual(f, g);
  assert.deepEqual([...silhouetteMask(one.scene, "three-quarter", 48)], [...silhouetteMask(two.scene, "three-quarter", 48)]);
  const r1 = render(one.scene, fitCamera(one.scene, "three-quarter", [120, 120]), "shaded"), r2 = render(two.scene, fitCamera(two.scene, "three-quarter", [120, 120]), "shaded");
  assert.deepEqual([...r1.data], [...r2.data]);
});

test("a body whose part does not touch its owner is reported against the contract, not repaired", () => {
  const f = frameOf("S03");
  const built = buildIndividual(f, typeSpecimen(f));
  const tail = built.scene.nodes.find((n) => n.id === "tail");
  tail.attachment.position = [tail.attachment.position[0] + 3, tail.attachment.position[1], tail.attachment.position[2]];
  const v = validateBody(built.scene);
  assert.equal(v.status, "rejected");
  assert.ok(v.problems.some((p) => p.startsWith("tail:")));
});
