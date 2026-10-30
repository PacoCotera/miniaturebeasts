import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, VALIDATED, PLAN_SWITCHES, PART_SWITCHES, LOCI, resolveCopies, isContinuous, valueRange, quantize, stepOf, stepValue, BLEND_STEPS } from "../framework/catalogue.mjs";
import { planFacts, rigOf, parsePlanKey } from "../framework/plans.mjs";
import { buildIndividual, sampleIndividual, typeSpecimen, crossIndividuals, shapeTrait, checkGenome, rng, genomeDigest, findKindOf, FINDS, SELF_CHANGING, SELF_MARK, frameVersionOf } from "../framework/species.mjs";
import { cross, forecast, kinship, identity, relatedness, children, SPREAD, shedPod, SELF_KINSHIP, PENALTY } from "../framework/cross.mjs";
import { silhouetteMask, render, fitCamera } from "../framework/raster.mjs";
import { validateBody } from "../framework/validate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);

test("catalogue 10 carries catalogue6 plus the taxonomy's switches and loci, the three clan gaps and the added alleles", () => {
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
  assert.equal(CATALOGUE.loci.filter((l) => l.addedAlleles).reduce((n, l) => n + l.addedAlleles.ids.length, 0), 16, "hoof, webbed, root, one pair, huge, tall ears, three tiny head ratios, the six of the Loika's calibration to Pip, and ash");
  assert.equal(CATALOGUE.version, 10, "pin 10: ash for the fine-tuned Loika (T-20261016-200)");
  assert.deepEqual(LOCI.get("appearance.body-palette").alleles.at(-1), { id: "ash", label: "ash", value: "#8e98a4" }, "ash appended last, so every older copy keeps its index");
  assert.ok(CATALOGUE.loci.filter((l) => l.addedAlleles?.since === 10).length === 1);
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
  assert.equal(frameVersionOf(loika), 4, "the Loika fine-tuned (owner 2026-10-17): frame version 4, with every frame on catalogue 10");
  assert.equal(loika.counts.traits, 6, "six traits: the starter tier counts traits");
  assert.equal(loika.counts.open, 7, "Colour, the marking switch and layout, Crown, Eyes, Drive, Efficiency");
  assert.deepEqual(loika.loci.find((l) => l.id === "appearance.marking-switch").legacy, ["off"], "plain stays legal for a version-3 line");
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

test("every locus names who changes it: the species, the player, breeding, or the mibi itself (Glow, Basking, Phase)", () => {
  const PLACES = ["meadow", "pond", "rock", "wood", "cave"];   // the Station's place ids (station/src/state.mjs PLACE_WORD)
  const selfTraits = Object.fromEntries(frames.flatMap((f) => f.chapters.flatMap((c) => c.traits.filter((t) => t.selfChanging).map((t) => [`${f.species.id}.${t.id}`, t.selfChanging]))));
  assert.deepEqual(selfTraits, {
    "S03.glow": { toward: "bright", places: ["cave", "wood"], storm: false, ...SELF_MARK },
    "S15.light-feeding": { toward: "high", places: ["meadow", "pond", "rock"], storm: false, ...SELF_MARK },
    "S16.phase": { toward: "solid", places: [], storm: true, ...SELF_MARK },
  });
  assert.deepEqual(SELF_MARK, { stepOf: 16, maxSteps: 4, fadeAfter: 3 });
  for (const f of frames) {
    const traits = new Map(f.chapters.flatMap((c) => c.traits.map((t) => [t.id, t])));
    for (const l of f.loci) {
      const t = traits.get(l.trait), want = l.kind === "locked" ? "species" : t.selfChanging ? "self" : t.shapeable ? "player" : "breeding";
      assert.equal(l.changedBy, want, `${f.species.id} ${l.id}`);
      if (l.changedBy === "player") assert.equal(t.nature, "look", `${f.species.id} ${l.id}: only a look is the player's`);
    }
    for (const t of traits.values()) if (t.selfChanging) {
      assert.equal(t.shapeable, false, `${f.species.id} ${t.id}: the player never sets a self-changing trait`);
      assert.equal(t.nature, "doing");
      assert.deepEqual(t.loci.length, 1);
      assert.ok(f.pools[t.loci[0]].includes(t.selfChanging.toward), `${f.species.id} ${t.id}: its end is in the pool`);
      assert.ok(t.selfChanging.places.every((p) => PLACES.includes(p)) && (t.selfChanging.places.length > 0) !== t.selfChanging.storm, `${f.species.id} ${t.id}: one trigger, places or a storm`);
      assert.deepEqual(t.selfChanging, { ...SELF_CHANGING[t.id], ...SELF_MARK });
    }
    assert.equal(f.counts.selfChanging, f.loci.filter((l) => l.changedBy === "self").length);
  }
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
  const eyeMid = quantize(LOCI.get("growth.exterior-eye-size-ratio"), 0.35); // the midpoint, on the blend step
  assert.deepEqual(ey.range, [eyeMid, eyeMid], "the range narrows to the midpoint");
  const N = 4000; let pale = 0, mid = 0;
  for (let i = 0; i < N; i++) { const ch = cross(f, sib1, sib2, { rng: r, lookup }); if (resolveCopies(LOCI.get("appearance.marking-switch"), ch.loci["appearance.marking-switch"])) pale++; if (ch.loci["growth.exterior-eye-size-ratio"][0] === eyeMid) mid++; }
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

// --- genome C2–C5 (2026-10-09) ---------------------------------------------------------------------------
test("C2: a trait is firm only when every locus of it is certain; a firm lead with an uncertain second locus stays unknown", () => {
  const f = frameOf("S03"), base = typeSpecimen(f);
  const trait = f.chapters.flatMap((c) => c.traits).find((t) => t.id === "markings");
  assert.deepEqual(trait.loci.slice(0, 2), ["appearance.marking-switch", "appearance.marking-layout"]);
  const a = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["bands", "bands"] } };
  const b = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["patches", "patches"] } };
  const t = forecast(f, a, b).traits.find((x) => x.trait === "markings");
  assert.equal(t.locus, "appearance.marking-switch", "the lead is the switch, held off/off by both parents");
  assert.equal(t.firm, false, "the sleeping layout differs between the parents: the child's is not known without a read");
  // a trait of switch loci only, the same equal pair in both parents at every locus, is firm
  const crown = frameOf("S01"), cb = typeSpecimen(crown), c1 = { ...cb, loci: { ...cb.loci, "anatomy.crown-presence": ["on", "on"] } }, c2 = { ...cb, loci: { ...cb.loci, "anatomy.crown-presence": ["on", "on"] } };
  assert.equal(forecast(crown, c1, c2).traits.find((x) => x.trait === "crown").firm, true);
  // a sleeping locus that blends is never certain, so a trait carrying one is never firm
  const same = { ...a, loci: { ...a.loci } };
  assert.equal(forecast(f, a, same).traits.find((x) => x.trait === "markings").firm, false);
});

test("C3: two mibis with identical genomes and different ids may cross, with kinship from their pedigree ids", () => {
  const f = frameOf("S01"), r = rng("c3");
  const g = sampleIndividual(f, r);
  const one = { id: 1, genome: g }, two = { id: 2, genome: structuredClone(g) };
  assert.equal(genomeDigest(one.genome), genomeDigest(two.genome), "the same genome");
  assert.equal(kinship(one, two), 0, "two founders, unrelated whatever their genomes");
  const child = cross(f, one, two, { rng: r });
  assert.deepEqual(child.origin.parentIds, [1, 2]); assert.equal(child.origin.kinship, 0);
  assert.throws(() => cross(f, one, { id: 1, genome: g }, { rng: r }), /not a pair/, "the same id is one mibi");
  assert.throws(() => cross(f, g, g, { rng: r }), /not a pair/, "the same genome object is one mibi");
  assert.doesNotThrow(() => cross(f, g, structuredClone(g), { rng: r }), "two bare genomes that are equal are two mibis");
  // a pedigree by ids: two siblings whose genomes happen to be equal are full siblings (a quarter), not one mibi (a half)
  const p = { id: 10, genome: sampleIndividual(f, r) }, q = { id: 11, genome: sampleIndividual(f, r) };
  const book = new Map([[10, p], [11, q]]), lookup = (id) => book.get(id) ?? null;
  const sg = cross(f, p, q, { rng: r });
  const s1 = { id: 12, genome: sg, parents: [{ id: 10 }, { id: 11 }] }, s2 = { id: 13, genome: structuredClone(sg), parents: [{ id: 10 }, { id: 11 }] };
  book.set(12, s1); book.set(13, s2);
  assert.equal(kinship(s1, s2, lookup), 0.25, "full siblings by their recorded parents");
  assert.equal(kinship(s1, s1, lookup), 0.5, "a mibi with itself");
  assert.equal(kinship(s1, p, lookup), 0.25, "parent and child");
  assert.equal(forecast(f, s1, s2, { lookup }).kinship, 0.25);
  assert.equal(cross(f, s1, s2, { rng: r, lookup }).origin.kinship, 0.25);
  // a parent known only by the snapshot the child holds still counts
  const orphan = { id: 14, genome: sg, parents: [{ id: 10, genome: p.genome }, { id: 99, genome: q.genome }] };
  assert.equal(kinship(orphan, p, lookup), 0.25);
});

test("C4: a locked pair in either order passes checkGenome and the cross alike", () => {
  const f = frameOf("S04"), r = rng("c4");
  const row = f.loci.find((l) => l.kind === "locked" && l.copies[0] !== l.copies[1]);
  assert.ok(row, "S04 locks a pair of two different copies");
  const a = sampleIndividual(f, r), b = sampleIndividual(f, r);
  const flipped = { ...a, loci: { ...a.loci, [row.id]: [row.copies[1], row.copies[0]] } };
  assert.deepEqual(checkGenome(f, a), []); assert.deepEqual(checkGenome(f, flipped), [], "the reversed pair is the same pair");
  assert.doesNotThrow(() => cross(f, flipped, b, { rng: r })); assert.doesNotThrow(() => cross(f, a, b, { rng: r }));
  const other = LOCI.get(row.id).alleles.map((x) => x.id).find((x) => !row.copies.includes(x)) ?? row.copies[0];
  const wrong = { ...a, loci: { ...a.loci, [row.id]: [other, other] } };
  assert.ok(checkGenome(f, wrong).some((p) => p.includes(row.id)), "a different pair is refused by the check");
  assert.throws(() => cross(f, wrong, b, { rng: r }), /locked copy differs/, "and by the cross");
});

test("C5: the cross draws every blended copy on the blend step, inside the pool, for every species; the forecast's range is on the step too", () => {
  for (const f of frames) {
    const r = rng(`c5:${f.species.id}`);
    for (let i = 0; i < 20; i++) {
      const a = sampleIndividual(f, r), b = sampleIndividual(f, r), child = cross(f, a, b, { rng: r });
      for (const l of f.loci) {
        const locus = LOCI.get(l.id);
        if (l.kind === "locked" || !isContinuous(locus)) continue;
        const [p, q] = child.loci[l.id];
        assert.ok(stepOf(locus, p) >= 0, `${f.species.id} ${l.id}: ${p} on the step`); assert.equal(p, q);
      }
      assert.deepEqual(checkGenome(f, child), [], `${f.species.id}: a stepped child is in its pools`);
      for (const t of forecast(f, a, b).traits) if (t.kind === "blend") for (const v of t.range) assert.ok(stepOf(LOCI.get(t.locus), v) >= 0, `${t.locus} range end ${v}`);
    }
  }
  const eye = LOCI.get("growth.exterior-eye-size-ratio"), [lo, hi] = valueRange(eye);
  assert.equal(stepValue(eye, 0), lo); assert.equal(stepValue(eye, BLEND_STEPS), hi);
  assert.equal(quantize(eye, quantize(eye, 0.3337)), quantize(eye, 0.3337), "idempotent");
});

test("C2: `sure` is the shown look certain (one look at weight 1, one bin for a blend); `firm` stays every locus certain", () => {
  const f = frameOf("S03"), base = typeSpecimen(f);
  const a = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["bands", "bands"] } };
  const b = { ...base, loci: { ...base.loci, "appearance.marking-switch": ["off", "off"], "appearance.marking-layout": ["patches", "patches"] } };
  const mk = forecast(f, a, b).traits.find((x) => x.trait === "markings");
  assert.deepEqual(mk.looks, { off: 1 }); assert.equal(mk.sure, true, "every child shows plain"); assert.equal(mk.firm, false, "what sleeps differs: not known at birth");
  const l = frameOf("S01"), lb = typeSpecimen(l);
  const p = { ...lb, loci: { ...lb.loci, "anatomy.crown-presence": ["on", "off"], "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": ["large", "large"] } };
  const q = { ...lb, loci: { ...lb.loci, "anatomy.crown-presence": ["on", "on"], "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": ["large", "large"] } };
  const fc = forecast(l, p, q), by = Object.fromEntries(fc.traits.map((t) => [t.trait, t]));
  assert.equal(by.crown.sure, true, "crested whichever copies: a dominant on in one parent twice"); assert.equal(by.crown.firm, false, "a hidden off may ride along");
  assert.equal(by.markings.sure, false, "one in four pale"); assert.equal(by.markings.firm, false);
  assert.equal(by["eye-rings"].sure, by["eye-rings"].bins.length === 1); assert.equal(by["eye-rings"].firm, false, "a blend is never firm");
  const sib = forecast(l, p, q, { kinship: 0.25 }).traits.find((t) => t.trait === "eye-rings");
  assert.equal(sib.range[0], sib.range[1]); assert.equal(sib.sure, true, "a sibling cross of equal eyes lands on one value"); assert.equal(sib.firm, false);
  for (const t of forecast(frameOf("S02"), sampleIndividual(frameOf("S02"), rng("s")), sampleIndividual(frameOf("S02"), rng("t"))).traits) if (t.kind === "sealed") assert.equal(t.sure, false);
});

test("a shown look is always one of its trait's words: the frame's looks, or a form's player word (S03's Claws: hooves, webbed feet, roots)", async () => {
  const { lookOf } = await import("../framework/describe.mjs");
  const legacy = ["hooves", "webbed feet", "roots"];
  for (const f of frames) for (const ch of f.chapters) for (const t of ch.traits) {
    const r = rng(`words:${f.species.id}:${t.id}`);
    for (let i = 0; i < 60; i++) {
      const g = sampleIndividual(f, r), w = lookOf(f, t, g);
      assert.ok(w == null || t.looks.includes(w) || (f.species.id === "S03" && t.id === "feet" && legacy.includes(w)), `${f.species.id} ${t.id}: "${w}" is not one of ${JSON.stringify(t.looks)}`);
    }
  }
});

test("currentLooks: a trait's looks a new pod can show; a legacy look (the Loika's plain, the Tuikis's old feet) is never among them, and every other trait keeps all its looks", async () => {
  const { currentLooks, traitLooks } = await import("../framework/describe.mjs");
  const traitOf = (sp, id) => frameOf(sp).chapters.flatMap((c) => c.traits).find((t) => t.id === id);
  const markings = traitOf("S01", "markings");
  assert.deepEqual(currentLooks(frameOf("S01"), markings), traitLooks(frameOf("S01"), markings).filter((l) => l !== "plain"), "the Loika's plain only comes from a legacy off");
  assert.deepEqual(currentLooks(frameOf("S03"), traitOf("S03", "feet")), ["round feet", "padded feet", "digging wedges"]);
  for (const f of frames) for (const ch of f.chapters) for (const t of ch.traits) {
    if (t.loci.some((id) => f.loci.find((l) => l.id === id)?.legacy?.length)) continue;
    assert.deepEqual(currentLooks(f, t), traitLooks(f, t), `${f.species.id} ${t.id}`);
  }
});

test("the Tuikis's claws: new pods draw only the three digging forms; a legacy hoof, webbed or root copy stays legal, breeds, and reads plainly", async () => {
  const { lookOf } = await import("../framework/describe.mjs");
  const f = frameOf("S03"), id = "anatomy.contact-terminal-form", row = f.loci.find((l) => l.id === id), claws = f.chapters.flatMap((c) => c.traits).find((t) => t.id === "feet");
  assert.equal(frameVersionOf(f), 5, "the Tuikis at frame version 5 (T-20261016-194)");
  assert.deepEqual(row.alleles, ["rounded", "pad", "wedge"]); assert.deepEqual(row.legacy, ["hoof", "webbed", "root"]);
  assert.deepEqual(claws.looks, ["round feet", "padded feet", "digging wedges"], "the guide counts the three");
  const r = rng("claws");
  for (let i = 0; i < 200; i++) assert.ok(sampleIndividual(f, r).loci[id].every((c) => row.alleles.includes(c)), "a new pod never draws a legacy form");
  const words = new Set();
  for (const [x, y] of [["hoof", "hoof"], ["root", "webbed"], ["hoof", "pad"], ["webbed", "rounded"]]) {
    const old = { ...typeSpecimen(f), loci: { ...typeSpecimen(f).loci, [id]: [x, y] } };
    assert.deepEqual(checkGenome(f, old), [], `a living ${x}/${y} line stays valid`);
    const kid = cross(f, { id: "old", genome: old }, { id: "new", genome: sampleIndividual(f, r) }, { rng: rng(`claws-${x}${y}`), kinship: 0 });
    assert.deepEqual(checkGenome(f, kid), [], "and breeds a valid child");
    const w = lookOf(f, claws, old); words.add(w);
    assert.ok([...claws.looks, "hooves", "webbed feet", "roots"].includes(w), `"${w}" is a plain word, never an id`);
  }
  assert.ok(words.has("hooves") || words.has("roots"), "an old form shows as itself");
});

test("every cross of two valid members builds: the frames' viability counts crossed children, and the waist band that once disconnected the body joins by a connector", () => {
  for (const f of frames) {
    assert.ok(f.viability.crossed >= 150, `${f.species.id}: crossed children are checked`);
    assert.equal(f.viability.crossedBuilt, f.viability.crossed, `${f.species.id}: every crossed child builds`);
  }
  // the band measured in T-20261016-185: a narrow join at a waist of about 0.59 to 0.66 (between thin 0.3 and broad 0.75)
  for (const id of ["S08", "S09", "S13", "S16"]) {
    const f = frameOf(id), base = typeSpecimen(f);
    for (let v = 0.3; v <= 0.75 + 1e-9; v += 0.0075) {
      const x = Math.round(v * 1e4) / 1e4, g = { ...base, loci: { ...base.loci, "growth.join-throat-ratio": [x, x] } };
      assert.equal(buildIndividual(f, g).validation.status, "valid", `${id}: waist ${x} builds`);
    }
  }
});

test("the shed pod takes its kinship from opts: the default stays 1/8, a higher one is used for the draw and written to origin.kinship", () => {
  const f = frameOf("S01"), m = typeSpecimen(f);
  assert.equal(shedPod(f, m, { rng: rng("shed-kinship") }).origin.kinship, 1 / 8);
  assert.equal(shedPod(f, m, { kinship: 0.25, rng: rng("shed-kinship") }).origin.kinship, 0.25);
  assert.equal(shedPod(f, m, { kinship: 1 / 8, rng: rng("shed-kinship") }).origin.kinship, 0.125);
});
test("the shed pod: a returned mibi's self cross never equals its parent, always builds, is seeded, takes only the parent's copies and keeps the line", () => {
  assert.equal(SELF_KINSHIP, 1 / 8);
  const valueOf = (locus, c) => (typeof c === "number" ? c : locus.alleles.find((a) => a.id === c).value);
  const key = (frame, g) => JSON.stringify(frame.loci.map((l) => { const locus = LOCI.get(l.id); return g.loci[l.id].map((c) => String(isContinuous(locus) ? Math.round(valueOf(locus, c) * 1e6) / 1e6 : c)).sort(); }));
  let surfaced = 0, carriers = 0;
  for (const frame of frames) {
    const pod = (s) => { const r = rng(`shed-parent:${frame.species.id}:${s}`); for (let i = 0; i < 24; i++) { const g = sampleIndividual(frame, r); try { if (!checkGenome(frame, g).length && buildIndividual(frame, g).validation.status === "valid") return g; } catch { /* the next draw */ } } throw new Error("no pod"); };
    const parents = [];
    for (let s = 0; s < 4; s++) parents.push({ id: `${frame.species.id}-p${s}`, genome: pod(s), parents: [] });
    for (let s = 0; s < 4; s++) {   // bred parents: only a child that builds exists (children's rule)
      const r = rng(`shed-bred:${frame.species.id}:${s}`);
      for (let i = 0; i < 24; i++) { const g = cross(frame, parents[s], parents[(s + 1) % 4], { rng: r, kinship: 0 }); let ok = false; try { ok = buildIndividual(frame, g).validation.status === "valid"; } catch { /* not a child */ } if (ok) { parents.push({ id: `${frame.species.id}-b${s}`, genome: g, parents: [parents[s], parents[(s + 1) % 4]] }); break; } }
    }
    const byId = new Map(parents.map((p) => [p.id, p]));
    for (const m of parents) for (let j = 0; j < 3; j++) {
      const seed = `shed:${m.id}:${j}`, g = shedPod(frame, m, { rng: rng(seed) });
      assert.ok(g, `${m.id}: a pod comes out`);
      assert.deepEqual(shedPod(frame, m, { rng: rng(seed) }), g, `${m.id}: the same seed sheds the same pod`);
      assert.notEqual(key(frame, g), key(frame, m.genome), `${m.id}: never a clone`);
      assert.deepEqual(checkGenome(frame, g), [], `${m.id}: a whole genome of its frame`);
      assert.equal(buildIndividual(frame, g).validation.status, "valid", `${m.id}: it builds`);
      assert.deepEqual(g.origin.parents, [genomeDigest(m.genome), genomeDigest(m.genome)]);
      assert.deepEqual(g.origin.parentIds, [m.id, m.id]);
      for (const l of frame.loci) {
        const locus = LOCI.get(l.id), p = m.genome.loci[l.id], c = g.loci[l.id];
        if (l.kind === "locked") { assert.deepEqual([...c].sort(), [...l.copies].sort()); continue; }
        if (isContinuous(locus)) {
          const shown = (valueOf(locus, p[0]) + valueOf(locus, p[1])) / 2, [lo, hi] = valueRange(locus), reach = SPREAD * (hi - lo) * (1 - 4 * SELF_KINSHIP) + Math.abs(valueOf(locus, p[0]) - valueOf(locus, p[1])) / 2 * (1 - 4 * SELF_KINSHIP) + 1e-6 + (hi - lo) / 32;
          assert.ok(Math.abs(c[0] - shown) <= reach, `${m.id} ${l.id}: a blend stays by its parent's (${c[0]} vs ${shown})`);
        } else for (const x of c) assert.ok(p.includes(x), `${m.id} ${l.id}: copy ${x} is one of the parent's (${p})`);
      }
      for (const ch of frame.chapters) for (const t of ch.traits) {
        const lead = t.loci.find((id) => !isContinuous(LOCI.get(id)));
        if (!lead) continue;
        const pp = m.genome.loci[lead];
        if (pp[0] !== pp[1]) { carriers++; if (g.loci[lead][0] === g.loci[lead][1]) surfaced++; }
      }
      const rec = { id: `${m.id}-shed${j}`, genome: g, parents: [m, m] };
      assert.ok(kinship(rec, m, (id) => byId.get(id)) >= 0.5, `${m.id}: the line is real in the pedigree`);
    }
  }
  assert.ok(surfaced / carriers > 0.4 && surfaced / carriers < 0.75, `carried copies come out doubled about half the time (${surfaced}/${carriers})`);
  assert.throws(() => cross(frames[0], { id: "x", genome: typeSpecimen(frames[0]) }, { id: "x", genome: typeSpecimen(frames[0]) }), /one mibi is not a pair/, "cross(m, m) stays refused");
  assert.equal(PENALTY, "AB");
});

test("a shed pod is born on its frame's current version, and a parent born on an older one sheds as it crosses", () => {
  for (const id of ["S01", "S03", "S05"]) {
    const f = frameOf(id), m = { id: `${id}-old`, genome: { ...sampleIndividual(f, rng(`shed-old:${id}`)), frameVersion: 3 }, parents: [] };
    const g = shedPod(f, m, { rng: rng(`shed-old-pod:${id}`) });
    assert.ok(g, `${id}: a version-3 parent sheds`);
    assert.equal(g.frameVersion, frameVersionOf(f), `${id}: the pod is born on version ${frameVersionOf(f)}`);
    assert.deepEqual(checkGenome(f, g), [], `${id}: a whole genome of its frame`);
  }
});

test("a shed pod's pedigree is known only when its parent resolves, as a cross child's", () => {
  const f = frameOf("S01"), m = typeSpecimen(f), pod = shedPod(f, m, { rng: rng("shed-known") });
  const byDigest = (d) => (d === genomeDigest(m) ? m : null);
  const known = relatedness(f, pod, m, byDigest);
  assert.equal(known.pedigreeKnown, true);
  assert.ok(known.kinship >= 0.5, `kinship to its parent ${known.kinship}`);
  assert.equal(relatedness(f, pod, m, () => null).pedigreeKnown, false, "an unresolvable parent: identity is the fallback");
});
