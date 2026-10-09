import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, VALIDATED, PLAN_SWITCHES, PART_SWITCHES, LOCI, resolveCopies, isContinuous, valueRange } from "../framework/catalogue.mjs";
import { planFacts, rigOf, parsePlanKey } from "../framework/plans.mjs";
import { buildIndividual, sampleIndividual, typeSpecimen, crossIndividuals, shapeTrait, checkGenome, rng, genomeDigest, findKindOf, FINDS } from "../framework/species.mjs";
import { cross, forecast, kinship, identity, relatedness, children, SPREAD } from "../framework/cross.mjs";
import { silhouetteMask, render, fitCamera } from "../framework/raster.mjs";
import { validateBody } from "../framework/validate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);

test("catalogue 9 carries catalogue6 plus the taxonomy's switches and loci, the three clan gaps and the added alleles", () => {
  const v1 = CATALOGUE.loci.filter((l) => l.provenance.catalogue.startsWith("genomic-compositional-source-experiment"));
  const mine = CATALOGUE.loci.filter((l) => l.provenance.catalogue === "mb-genome-framework@7");
  assert.equal(v1.filter((l) => l.status === "validated").length, 114);
  assert.equal(v1.filter((l) => l.status !== "validated").length, 6);
  assert.equal(mine.length, 49, "45 taxonomy records plus the two ear proportions");
  const gaps = (l) => ["anatomy.tail-tip-bulb", "anatomy.top-cap-sheet", "appearance.cap-palette", "appearance.cap-spots", "appearance.belly-field", "growth.crest-leaf-count"].includes(l.id);
  const proportions = (l) => ["growth.auricular-set-ratio", "growth.auricular-width-ratio"].includes(l.id);
  const kinds = mine.filter((l) => !gaps(l) && !proportions(l) && l.id !== "energy.light-feeding" && !l.id.startsWith("appearance.emission"));
  assert.equal(kinds.filter((l) => l.switch === "part").length, 11, "eleven new switches");
  assert.equal(kinds.filter((l) => l.switch !== "part").length, 27, "twenty-five new loci");
  assert.equal(mine.filter(proportions).length, 2, "ear set and ear width, the proportion loci no record carried");
  assert.equal(mine.filter(gaps).length, 6, "the tail bulb, the cap sheet with colour and spots, the belly field and crest leaves");
  assert.equal(CATALOGUE.loci.filter((l) => l.addedAlleles).reduce((n, l) => n + l.addedAlleles.ids.length, 0), 15, "hoof, webbed, root, one pair, huge, tall ears, three tiny head ratios, and the six of the Loika's calibration to Pip");
  assert.equal(CATALOGUE.version, 9, "pin 9: the Loika calibrated to Pip");
  assert.ok(CATALOGUE.loci.filter((l) => l.addedAlleles?.since === 8).length === 3);
  assert.ok(CATALOGUE.loci.filter((l) => l.addedAlleles?.since === 9).length === 6);
  assert.ok(CATALOGUE.loci.some((l) => l.id === "growth.belly-field-extent") && CATALOGUE.loci.some((l) => l.id === "growth.exterior-eye-height-ratio"), "the two C01 loci of the calibration");
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
  const moth = planFacts("three|serial|bilateral|contact|zero|one|three|on|skin");
  assert.deepEqual(moth.stations.map((s) => s.region), [0, 1, 2], "one leg pair per region on a three-region six-legged plan");
  assert.equal(moth.flapRegion, 1, "wings on the thorax");
  assert.equal(moth.posture, "splayed");
  const lizard = planFacts("two|serial|bilateral|contact|zero|one|two|off|scales", { join: "narrow" });
  assert.deepEqual(lizard.stations.map((s) => s.region), [0, 1], "fore legs on the front region, hind legs on the back one");
  assert.equal(lizard.head, "neck");
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
  const loika = frameOf("S01");
  assert.ok(loika.absent.some((a) => a.id === "growth.wing-span-ratio"), "a Loika has no wing locus at all");
  assert.ok(loika.loci.some((l) => l.id === "appearance.belly-field" && l.scope === "branch"), "but its clan's belly field");
  assert.ok(loika.absent.some((a) => a.id === "anatomy.tail-tip-bulb" && a.why.includes("C03")));
  assert.equal(loika.counts.open, 5, "exactly the five traits of the Pip proof");
  const s03 = frameOf("S03");
  assert.ok(s03.chapters.some((c) => c.id === "glow" && c.traits.every((t) => !t.shapeable)), "the glow is a doing");
  assert.ok(frameOf("S16").chapters.some((c) => c.id === "charge" && c.sealed), "the lightning kind's Charge chapter is sealed");
  assert.ok(frameOf("S04").loci.some((l) => l.id === "appearance.fur-reach"), "mammal look loci are trunk");
});

test("every sealed chapter names its find's kind beside its words: crystal, pearl or shard, or none", () => {
  const kinds = Object.fromEntries(frames.flatMap((f) => f.chapters.filter((c) => c.sealed).map((c) => [`${f.species.id}.${c.id}`, c.findKind])));
  assert.deepEqual(kinds, { "S02.character": "crystal", "S09.movement": "pearl", "S11.stamina": "shard", "S15.stamina": "shard", "S16.charge": "shard" });
  for (const f of frames) for (const c of f.chapters) {
    if (c.sealed) assert.equal(c.findKind, findKindOf(c.opensWith), `${f.species.id} ${c.id}: the picture is the find the words name`);
    else assert.ok(!("findKind" in c) && !("opensWith" in c), `${f.species.id} ${c.id}: an open chapter names no find`);
  }
  for (const words of Object.values(FINDS)) assert.ok(findKindOf(words), `every chapter's default find is one the studio paints (${words})`);
  assert.equal(findKindOf("a find"), null, "a chapter sealed with no named find has no kind: the page keeps the stand-in card");
});

test("an individual resolves against its frame: sleeping parts, absent parts, foreign loci", () => {
  const loika = frameOf("S01");
  const g = typeSpecimen(loika);
  g.loci["appearance.marking-switch"] = ["off", "off"];
  const built = buildIndividual(loika, g);
  assert.equal(built.validation.status, "valid");
  const layout = built.resolved.facts.find((f) => f.id === "appearance.marking-layout");
  assert.equal(layout.state, "asleep", "marking parts sleep when the switch is off");
  assert.equal(built.scene.markings, null);
  assert.ok(!("wing.outwardSpanOverCoreRx" in built.resolved.values), "absent parts never enter the rig");
  const foreign = structuredClone(g); foreign.loci["growth.wing-span-ratio"] = ["short", "short"];
  assert.throws(() => buildIndividual(loika, foreign), /does not have/);
  assert.ok(checkGenome(loika, foreign).length > 0);
});

test("crosses pass one copy from each parent at a switch locus, blend a continuous one between the parents, keep locked copies; shaping picks among the pod's own copies", () => {
  const oc = frameOf("S03");
  const r = rng("test");
  const a = sampleIndividual(oc, r), b = sampleIndividual(oc, r);
  const child = crossIndividuals(oc, a, b, r);
  for (const l of oc.loci) {
    const locus = LOCI.get(l.id);
    if (l.kind === "locked") assert.deepEqual(child.loci[l.id], l.copies);
    else if (isContinuous(locus)) {
      const [p, q] = child.loci[l.id], va = resolveCopies(locus, a.loci[l.id]), vb = resolveCopies(locus, b.loci[l.id]);
      assert.equal(typeof p, "number"); assert.equal(p, q, "a blend hides nothing: both copies equal");
      const [clo, chi] = valueRange(locus), [lo, hi] = valueRange(locus, l.alleles), w = SPREAD * (chi - clo);
      assert.ok(p >= Math.max(lo, Math.min(va, vb) - w) - 1e-9 && p <= Math.min(hi, Math.max(va, vb) + w) + 1e-9, `${l.id}: ${p} between ${va} and ${vb} ± ${w}, within the pool`);
    } else { assert.ok(a.loci[l.id].includes(child.loci[l.id][0])); assert.ok(b.loci[l.id].includes(child.loci[l.id][1])); }
  }
  assert.equal(checkGenome(oc, child).length, 0, "a child is valid against its frame, numbers in the pool's range");
  assert.equal(child.origin.kind, "cross"); assert.equal(child.origin.kinship, 0);
  const shaped = shapeTrait(oc, a, "eyes", 1);
  for (const id of ["growth.exterior-eye-size-ratio", "growth.exterior-eye-spacing-ratio"]) assert.deepEqual(shaped.loci[id], [a.loci[id][0], a.loci[id][0]]);
  assert.throws(() => crossIndividuals(frameOf("S01"), a, b, r), /same-species/);
  assert.throws(() => cross(oc, a, a, { rng: r }), /not a pair/);
  const bad = structuredClone(child); bad.loci["growth.exterior-eye-size-ratio"] = [0.9, 0.9];
  assert.ok(checkGenome(oc, bad).some((p) => /outside the species pool/.test(p)), "a number outside the pool is refused");
});

test("the forecast's quarters and ranges are honest against ten thousand crosses of two Loikas", () => {
  const f = frameOf("S01");
  const r = rng("forecast");
  // Pip × Moss of the-cross.md §6: markings off/on × off/on, crown on/off × off/off, rings large/large × large/huge
  const base = typeSpecimen(f);
  const pip = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "on"], "anatomy.crown-presence": ["on", "off"], "growth.exterior-eye-size-ratio": ["large", "large"], "movement.cycle-rate": ["low", "high"], "energy.action-efficiency": ["high", "high"] }, origin: { kind: "random" } };
  const moss = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "on"], "anatomy.crown-presence": ["off", "off"], "growth.exterior-eye-size-ratio": ["large", "huge"], "movement.cycle-rate": ["high", "high"], "energy.action-efficiency": ["low", "high"] }, origin: { kind: "random" } };
  const fc = forecast(f, pip, moss);
  const by = Object.fromEntries(fc.traits.map((t) => [t.trait, t]));
  assert.equal(fc.kinship, 0);
  assert.deepEqual(by.markings.looks, { off: 0.75, on: 0.25 }, "1 in 4 pale patches, the recessive switch");
  assert.deepEqual(by.crown.looks, { on: 0.5, off: 0.5 }, "2 in 4 crested, the dominant switch");
  assert.equal(by.markings.seeds.length, 4); assert.ok(by.markings.seeds.filter((s) => s.hides).length === 2, "two seeds hide pale");
  assert.equal(by["eye-rings"].kind, "blend");
  const N = 10000, counts = { markings: 0, crown: 0 }; let inRange = 0;
  for (let i = 0; i < N; i++) {
    const c = cross(f, pip, moss, { rng: r });
    if (resolveCopies(LOCI.get("appearance.marking-switch"), c.loci["appearance.marking-switch"])) counts.markings++;
    if (resolveCopies(LOCI.get("anatomy.crown-presence"), c.loci["anatomy.crown-presence"])) counts.crown++;
    const v = c.loci["growth.exterior-eye-size-ratio"][0];
    if (v >= by["eye-rings"].range[0] - 1e-9 && v <= by["eye-rings"].range[1] + 1e-9) inRange++;
  }
  assert.ok(Math.abs(counts.markings / N - 0.25) < 0.02, `pale patches ${counts.markings / N}`);
  assert.ok(Math.abs(counts.crown / N - 0.5) < 0.02, `crested ${counts.crown / N}`);
  assert.equal(inRange, N, "every blended child lands inside the forecast's range");
  assert.deepEqual(by["eye-rings"].parents, [0.32, 0.38]);
});

test("pedigree kinship from recorded parents, genome identity as the fallback, and the penalty B with A", () => {
  const f = frameOf("S01");
  const r = rng("kin");
  const book = new Map(); const keep = (g) => { book.set(genomeDigest(g), g); return g; }; const lookup = (d) => book.get(d) ?? null;
  const a = keep(sampleIndividual(f, r)), b = keep(sampleIndividual(f, r)), c = keep(sampleIndividual(f, r));
  const s1 = keep(cross(f, a, b, { rng: r, lookup })), s2 = keep(cross(f, a, b, { rng: r, lookup })), h = keep(cross(f, a, c, { rng: r, lookup }));
  assert.equal(kinship(a, b, lookup), 0, "wild founders are unrelated");
  assert.equal(kinship(a, s1, lookup), 0.25, "parent and child");
  assert.equal(kinship(s1, s2, lookup), 0.25, "full siblings");
  assert.equal(kinship(s1, h, lookup), 0.125, "half siblings");
  assert.equal(kinship(s1, s1, lookup), 0.5, "a mibi with itself");
  const g1 = keep(cross(f, s1, c, { rng: r, lookup })), g2 = keep(cross(f, s2, keep(sampleIndividual(f, r)), { rng: r, lookup }));
  assert.equal(kinship(g1, g2, lookup), 0.0625, "first cousins");
  const stranger = { ...s1, origin: { kind: "cross", parents: ["S01-00000000", "S01-11111111"] } };
  const rel = relatedness(f, stranger, s2, lookup);
  assert.equal(rel.kinship, 0, "an unknown parent counts as a wild founder"); assert.equal(rel.pedigreeKnown, false); assert.ok(rel.identity >= 0 && rel.identity <= 1);
  assert.equal(identity(f, s1, s1), 1);
  // the penalty on a sibling cross (kinship 1/4): B surfaces a hidden copy with chance 1/2, A draws the blend at the parents' midpoint
  const sib1 = { ...s1, loci: { ...s1.loci, "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": [0.3, 0.3] } };
  const sib2 = { ...s2, loci: { ...s2.loci, "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": [0.4, 0.4] } };
  assert.equal(kinship(sib1, sib2, lookup), 0.25);
  const fc = forecast(f, sib1, sib2, { lookup }); const mk = fc.traits.find((t) => t.trait === "markings"), ey = fc.traits.find((t) => t.trait === "eye-rings");
  assert.equal(fc.kinship, 0.25);
  assert.deepEqual(mk.looks, { off: 0.5, on: 0.5 }, "half of the carrier outcomes turn pale: two in four");
  assert.deepEqual(ey.range, [0.35, 0.35], "the range narrows to the midpoint");
  const N = 4000; let pale = 0, mid = 0;
  for (let i = 0; i < N; i++) { const ch = cross(f, sib1, sib2, { rng: r, lookup }); if (resolveCopies(LOCI.get("appearance.marking-switch"), ch.loci["appearance.marking-switch"])) pale++; if (Math.abs(ch.loci["growth.exterior-eye-size-ratio"][0] - 0.35) < 1e-6) mid++; }
  assert.ok(Math.abs(pale / N - 0.5) < 0.03, `pale ${pale / N}`); assert.equal(mid, N, "under A at 1/4 every blend sits on the midpoint");
  const none = cross(f, sib1, sib2, { rng: r, lookup, penalty: "none" }); assert.equal(none.origin.penalty, "none");
  let paleNone = 0; for (let i = 0; i < N; i++) if (resolveCopies(LOCI.get("appearance.marking-switch"), cross(f, sib1, sib2, { rng: r, lookup, penalty: "none" }).loci["appearance.marking-switch"])) paleNone++;
  assert.ok(Math.abs(paleNone / N - 0.25) < 0.03, `without the penalty one in four: ${paleNone / N}`);
  // whole-genome validation: children of two Loikas build; the count of rejections is reported
  const kids = children(f, a, b, 30, { rng: r, lookup });
  assert.equal(kids.children.length + kids.rejected.length, 30); assert.ok(kids.rejectionRate < 0.2);
  for (const k of kids.children) assert.equal(checkGenome(f, k.genome).length, 0);
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

test("proportions by kind: the species' measures sit in its genome, and the kind check scores it against hand-drawn targets", async () => {
  const { KINDS, proportionPairs, nearestPair } = await import("../framework/proportions.mjs");
  const { loadTargets, targetScores, rasterizeTarget } = await import("../framework/targets.mjs");
  assert.equal(Object.keys(KINDS).length, 16);
  assert.deepEqual(nearestPair("growth.support-drop-ratio", 0.8), ["long", "short"], "a value between alleles is a mixed pair");
  assert.deepEqual(nearestPair("growth.support-drop-ratio", 1.05), ["medium", "medium"]);
  const cat = frameOf("S04"), catPairs = proportionPairs("S04");
  assert.deepEqual(catPairs["growth.auricular-set-ratio"], ["crown", "crown"], "a cat's ears sit on the crown");
  assert.deepEqual(catPairs["growth.axial-tail-bend"], ["up", "up"], "and its tail is carried up");
  const specimen = typeSpecimen(cat);
  for (const [id, pair] of Object.entries(catPairs)) if (specimen.loci[id]) assert.deepEqual(specimen.loci[id], pair, `${id}: the type specimen carries the kind's copies`);
  assert.ok(cat.loci.some((l) => l.kind !== "locked" && l.typical), "an open proportion locus names its typical copies");
  assert.ok(cat.loci.some((l) => l.kind === "locked" && l.copies[0] !== l.copies[1]), "a locked proportion between two alleles is a mixed pair");
  assert.equal(checkGenome(cat, specimen).length, 0);
  const targets = loadTargets(path.resolve(here, "../frames/targets"));
  assert.equal(Object.keys(targets).length, 16);
  for (const t of Object.values(targets)) { assert.equal(t.mask.length, 48 * 48); assert.ok([...t.mask].some((x) => x), `${t.species}: a drawn target`); }
  assert.deepEqual([...rasterizeTarget(targets.S07).all], [...targets.S07.mask], "targets rasterize the same twice");
  assert.ok(targets.S04.parts.ear && targets.S04.parts.muzzle && targets.S04.parts.tail, "a target's primitives are tagged by part");
  const { partMasks } = await import("../framework/raster.mjs");
  const { CLANS } = await import("../framework/roster.mjs");
  const rows = ["S07", "S04", "S05", "S06"].map((id) => { const f = frameOf(id); const b = buildIndividual(f, typeSpecimen(f)); return { id, parts: CLANS[f.taxonomy.clan].parts, specMasks: { side: partMasks(b.scene, "side", 48) }, individuals: [] }; });
  const scores = targetScores(rows, targets);
  assert.equal(scores[0].id, "S07");
  assert.ok(scores[0].own > 0.6, "the bear reads as its own target by body");
  // Under the cute envelope (envelope.mjs) the head floor pulls the raccoon toward the cat's target; the
  // cat and the fox still win their parts score, the raccoon's target is to be redrawn under the envelope.
  for (const s of scores.slice(1, 3)) assert.ok(s.parts.margin > 0, `${s.id}: the cat and the fox each win their own parts score (${s.parts.own} vs ${s.parts.bestWrong.id} ${s.parts.bestWrong.score})`);
  assert.ok(scores.every((s) => s.bestWrong && s.bestWrong.id !== s.id));
});

test("a painting service's controls: the key pass is the pigments flat, and flat translucency leaves no dither holes", () => {
  const moth = frameOf("S12");
  const scene = buildIndividual(moth, typeSpecimen(moth)).scene;
  const camera = fitCamera(scene, "portrait", [120, 124], 0.08);
  const key = render(scene, camera, "key", { translucency: "flat" });
  const pigments = new Set(Object.values(scene.slots).filter(Boolean).flat().map((h) => h.toLowerCase()));
  for (const n of scene.nodes) if (n.ink) pigments.add(n.ink.toLowerCase());
  const hexOf = (i) => "#" + [0, 1, 2].map((c) => key.data[i * 4 + c].toString(16).padStart(2, "0")).join("");
  let body = 0;
  for (let i = 0; i < 120 * 124; i++) if (key.index[i]) { body++; assert.ok(pigments.has(hexOf(i)), `${hexOf(i)} is a pigment of the body`); }
  assert.ok(body > 500);
  const flap = scene.nodes.find((n) => n.opacity !== undefined && n.opacity < 1);
  assert.ok(flap, "the moth carries a translucent flap");
  const dithered = render(scene, camera, "shaded"), flat = render(scene, camera, "shaded", { translucency: "flat" });
  const flapId = scene.nodes.indexOf(flap) + 1;
  const count = (img) => { let n = 0; for (let i = 0; i < img.index.length; i++) if (img.index[i] === flapId) n++; return n; };
  assert.ok(count(flat) > count(dithered) * 1.3, "the flat flap is solid where the dithered one is holed");
});
