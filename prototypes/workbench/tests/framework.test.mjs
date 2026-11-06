import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, VALIDATED, PLAN_SWITCHES, PART_SWITCHES, LOCI, resolveCopies, isContinuous, valueRange, quantize, offStepEnds, copyValue, stepOf, stepValue, BLEND_STEPS, digestAt } from "../framework/catalogue.mjs";
import { planFacts, rigOf, parsePlanKey } from "../framework/plans.mjs";
import { buildIndividual, sampleIndividual, typeSpecimen, crossIndividuals, shapeTrait, checkGenome, rng, genomeDigest, findKindOf, FINDS, SELF_CHANGING, SELF_MARK, frameVersionOf } from "../framework/species.mjs";
import { RULES } from "../framework/envelope.mjs";
import { cross, blendRange, forecast, kinship, directKin, identity, relatedness, children, SPREAD, shedPod, SELF_KINSHIP, PENALTY } from "../framework/cross.mjs";
import { silhouetteMask, render, fitCamera } from "../framework/raster.mjs";
import { validateBody } from "../framework/validate.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.resolve(here, "../frames");
const frames = readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8")));
const frameOf = (id) => frames.find((f) => f.species.id === id);

test("catalogue 12 carries catalogue6 plus the taxonomy's switches and loci, the three clan gaps and the added alleles", () => {
  const v1 = CATALOGUE.loci.filter((l) => l.provenance.catalogue.startsWith("genomic-compositional-source-experiment"));
  const mine = CATALOGUE.loci.filter((l) => l.provenance.catalogue === "mb-genome-framework@7");
  assert.equal(v1.filter((l) => l.status === "validated").length, 114);
  assert.equal(v1.filter((l) => l.status !== "validated").length, 6);
  assert.equal(mine.length, 50, "45 taxonomy records plus the two ear proportions, plus the dew tongue");
  const gaps = (l) => ["anatomy.tail-tip-bulb", "anatomy.top-cap-sheet", "appearance.cap-palette", "appearance.cap-spots", "appearance.belly-field", "growth.crest-leaf-count"].includes(l.id);
  const proportions = (l) => ["growth.auricular-set-ratio", "growth.auricular-width-ratio"].includes(l.id);
  const kinds = mine.filter((l) => !gaps(l) && !proportions(l) && l.id !== "energy.light-feeding" && !l.id.startsWith("appearance.emission"));
  assert.equal(kinds.filter((l) => l.switch === "part").length, 12, "eleven new switches and the dew tongue");
  assert.equal(kinds.filter((l) => l.switch !== "part").length, 27, "twenty-five new loci");
  assert.equal(mine.filter(proportions).length, 2, "ear set and ear width, the proportion loci no record carried");
  assert.equal(mine.filter(gaps).length, 6, "the tail bulb, the cap sheet with colour and spots, the belly field and crest leaves");
  assert.equal(CATALOGUE.loci.filter((l) => l.addedAlleles && l.addedAlleles.since <= 10).reduce((n, l) => n + l.addedAlleles.ids.length, 0), 18, "hoof, webbed, root, one pair, huge, tall ears, three tiny head ratios, the six of the Loika's calibration to Pip, ash, and the Loika's small and medium ears (frame version 6)");
  assert.equal(CATALOGUE.version, 12, "pin 12: pin 11's genome-string records (tests/pin11.test.mjs) and the Peplos genome; pin 10 was ash for the fine-tuned Loika (T-20261016-200), and its 178 records are what a frame of version 6 or older sees");
  assert.equal(CATALOGUE.schema, "mb-catalogue/12");
  assert.equal(CATALOGUE.loci.filter((l) => !(l.sinceFrame > 6)).length, 179, "the frame-6 view is pin 10's 178 records of the build branches plus the dew tongue");
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
  assert.equal(frames.length, 19, "sixteen species and the three fluffy ones (frame version 6)");
  for (const f of frames) {
    const newer = VALIDATED.filter((l) => (l.sinceFrame ?? 0) > frameVersionOf(f)).length; // records a frame is older than are not its absent lines
    assert.equal(f.counts.carried + f.counts.absent, VALIDATED.length - PLAN_SWITCHES.size - newer, `${f.species.id}: carried + absent = validated − plan switches − records newer than the frame`);
    assert.ok(f.loci.every((l) => l.scope === "trunk" || l.clan === f.taxonomy.clan || (f.species.borrows ?? []).includes(l.id)), "a branch locus by clan, or a borrowed one the species lists");
    assert.equal(f.viability.constructed, f.viability.sampled);
    for (const ch of f.chapters) for (const t of ch.traits) assert.ok(t.loci.every((id) => f.loci.some((l) => l.id === id && l.kind !== "locked")));
  }
  const loika = frameOf("S01");
  assert.ok(loika.absent.some((a) => a.id === "growth.wing-span-ratio"), "a Loika has no wing locus at all");
  assert.ok(loika.loci.some((l) => l.id === "appearance.belly-field" && l.scope === "branch"), "but its clan's belly field");
  assert.ok(loika.absent.some((a) => a.id === "anatomy.tail-tip-bulb" && a.why.includes("C03")));
  assert.equal(frameVersionOf(loika), 6, "the Loika at frame version 6 (art director 2026-11-03): every Loika has ears, their length heritable; version 5 carried the crown's size, leaf count and form, version 4 was the fine-tuned Loika, on catalogue 10 as every frame");
  assert.equal(loika.counts.traits, 7, "seven traits: the starter tier counts traits");
  assert.equal(loika.counts.open, 11, "Colour, the marking switch and layout, Crown (the switch and its size, leaf count and form), Ears (the length), Eyes, Drive, Efficiency");
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
  assert.throws(() => crossIndividuals(frameOf("S01"), a, b, r), /needs two of the same species/);
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
    const v = resolveCopies(LOCI.get("growth.exterior-eye-size-ratio"), c.loci["growth.exterior-eye-size-ratio"]);
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
  // two children of one pair, and a parent with its child, are direct kin: neither crosses nor is forecast
  assert.throws(() => cross(f, s1, s2, { rng: r, lookup }), /direct kin \(same-parents\)/);
  assert.throws(() => forecast(f, s1, s2, { lookup }), /direct kin/);
  assert.throws(() => cross(f, a, s1, { rng: r, lookup }), /direct kin \(child\)/);
  assert.equal(directKin(s1, h, lookup), null, "half kin cross");
  // the penalty at kinship 1/4, as a studio picture passes it on two unrelated genomes: B surfaces a hidden copy with chance 1/2, A draws the blend at the parents' midpoint
  const sib1 = { ...a, loci: { ...a.loci, "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": [0.3, 0.3] } };
  const sib2 = { ...b, loci: { ...b.loci, "appearance.marking-switch": ["off", "on"], "growth.exterior-eye-size-ratio": [0.4, 0.4] } };
  const fc = forecast(f, sib1, sib2, { lookup, kinship: 0.25 }); const mk = fc.traits.find((t) => t.trait === "markings"), ey = fc.traits.find((t) => t.trait === "eye-rings");
  assert.equal(fc.kinship, 0.25);
  assert.deepEqual(mk.looks, { off: 0.5, on: 0.5 }, "half of the carrier outcomes turn pale: two in four");
  const eyeMid = quantize(LOCI.get("growth.exterior-eye-size-ratio"), 0.35); // the midpoint, on the blend step
  assert.deepEqual(ey.range, [eyeMid, eyeMid], "the range narrows to the midpoint");
  const N = 4000; let pale = 0, mid = 0;
  for (let i = 0; i < N; i++) { const ch = cross(f, sib1, sib2, { kinship: 0.25, rng: r, lookup }); if (resolveCopies(LOCI.get("appearance.marking-switch"), ch.loci["appearance.marking-switch"])) pale++; if (ch.loci["growth.exterior-eye-size-ratio"][0] === eyeMid) mid++; }
  assert.ok(Math.abs(pale / N - 0.5) < 0.03, `pale ${pale / N}`); assert.equal(mid, N, "under A at 1/4 every blend sits on the midpoint");
  const none = cross(f, sib1, sib2, { kinship: 0.25, rng: r, lookup, penalty: "none" }); assert.equal(none.origin.penalty, "none");
  let paleNone = 0; for (let i = 0; i < N; i++) if (resolveCopies(LOCI.get("appearance.marking-switch"), cross(f, sib1, sib2, { kinship: 0.25, rng: r, lookup, penalty: "none" }).loci["appearance.marking-switch"])) paleNone++;
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
  assert.equal(Object.keys(KINDS).length, 19);
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
  assert.equal(Object.keys(targets).length, 19);
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
  // the Loika's Crown carries a crown size that blends (frame version 5), so even with the switch on/on in both parents it is not firm
  const crown = frameOf("S01"), cb = typeSpecimen(crown), c1 = { ...cb, loci: { ...cb.loci, "anatomy.crown-presence": ["on", "on"] } }, c2 = { ...cb, loci: { ...cb.loci, "anatomy.crown-presence": ["on", "on"] } };
  assert.equal(forecast(crown, c1, c2).traits.find((x) => x.trait === "crown").firm, false);
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
  // ...and being two children of one pair, they are direct kin: refused; a half kin of s1 is not
  assert.throws(() => cross(f, s1, s2, { rng: r, lookup }), /direct kin \(same-parents\)/);
  assert.throws(() => forecast(f, s1, s2, { lookup }), /direct kin/);
  const w = { id: 15, genome: sampleIndividual(f, r) }; book.set(15, w);
  const s3 = { id: 16, genome: structuredClone(sg), parents: [{ id: 10 }, { id: 15 }] }; book.set(16, s3);
  assert.equal(forecast(f, s1, s3, { lookup }).kinship, 0.125);
  assert.equal(cross(f, s1, s3, { rng: r, lookup }).origin.kinship, 0.125);
  // a parent known only by the snapshot the child holds still counts
  const orphan = { id: 14, genome: sg, parents: [{ id: 10, genome: p.genome }, { id: 99, genome: q.genome }] };
  assert.equal(kinship(orphan, p, lookup), 0.25);
});

test("direct kin: the line to three generations, the same two parents, and what is not family", () => {
  const f = frameOf("S01"), r = rng("dk");
  const book = new Map(), lookup = (id) => book.get(id) ?? null;
  const mk = (id, ps) => { const m = { id, genome: sampleIndividual(f, r), ...(ps ? { parents: ps.map((i) => ({ id: i })) } : {}) }; book.set(id, m); return m; };
  const a = mk(1), b = mk(2), c = mk(3), d = mk(4);
  const k1 = mk(10, [1, 2]), k2 = mk(11, [2, 1]), k3 = mk(12, [1, 3]);       // k1, k2: same parents in either order; k3: half kin of k1
  const g1 = mk(20, [10, 4]), gg = mk(30, [20, 3]), ggg = mk(40, [30, 3]), g4 = mk(50, [40, 3]);
  assert.equal(directKin(a, k1, lookup).rel, "child"); assert.equal(directKin(k1, a, lookup).rel, "parent");
  assert.equal(directKin(a, g1, lookup).rel, "grandchild"); assert.equal(directKin(g1, a, lookup).rel, "grandparent");
  assert.equal(directKin(a, gg, lookup).rel, "great-grandchild"); assert.equal(directKin(gg, a, lookup).rel, "great-grandparent");
  assert.equal(directKin(a, ggg, lookup), null, "a great-great-grandparent is allowed"); assert.equal(directKin(ggg, a, lookup), null);
  assert.equal(directKin(k1, k2, lookup).rel, "same-parents", "either order");
  const twin = { id: 13, genome: structuredClone(k1.genome), parents: [{ id: 1 }, { id: 2 }] }; book.set(13, twin);
  assert.equal(directKin(k1, twin, lookup).rel, "same-parents", "equal genomes, two mibis");
  assert.equal(directKin(k1, k3, lookup), null, "half kin");
  const cousin1 = mk(60, [10, 4]), cousin2 = mk(61, [12, 4]); assert.equal(directKin(cousin1, cousin2, lookup), null, "cousins");
  assert.equal(directKin(mk(62, [10, 4]), mk(63, [12, 3]), lookup), null, "aunt or uncle line");
  assert.equal(directKin(k3, mk(64, [10, 4]), lookup), null, "uncle and nephew");
  assert.equal(directKin(a, b, lookup), null, "founders");
  // through a let-go record, and by id when the record is gone
  book.get(10).released = true; assert.equal(directKin(a, g1, lookup).rel, "grandchild");
  book.delete(10); assert.equal(directKin(g1, k1, lookup).rel, "parent", "a missing record counts by its id");
  assert.equal(directKin(g1, a, lookup), null, "its own parents are then unknown");
  // null never matches
  const n1 = { id: 70, genome: sampleIndividual(f, r), parents: [{ id: 1 }, { id: null }] }, n2 = { id: 71, genome: sampleIndividual(f, r), parents: [{ id: 1 }, { id: null }] };
  assert.equal(directKin(n1, n2, lookup), null);
  assert.equal(directKin(n1, { id: 72, genome: sampleIndividual(f, r), parents: [null, null] }, lookup), null);
  // a shed pod of a let-go mibi: refused with the parent, allowed with the parent's other child at exactly 1/4
  const pod = shedPod(f, a, { rng: r }); assert.deepEqual(pod.origin.parentIds, [1, 1]);
  const p1 = { id: 80, genome: pod, parents: [{ id: 1 }, { id: 1 }] }; book.set(80, p1);
  assert.equal(directKin(p1, a, lookup).rel, "parent"); assert.equal(directKin(p1, k1, lookup), null, "k1 is not on the pod's line");
  assert.equal(directKin(p1, k3, lookup), null, "the parent's other child");
  assert.equal(kinship(p1, k3, lookup), 0.25, "exactly 1/4, a line folded back on itself");
  assert.throws(() => cross(f, p1, a, { rng: r, lookup }), /direct kin/);
  // bare genomes by digest
  const ba = sampleIndividual(f, r), bb = sampleIndividual(f, r), bc = sampleIndividual(f, r);
  const dbook = new Map(); const keep = (g) => (dbook.set(genomeDigest(g), g), g); const dl = (x) => dbook.get(x) ?? null;
  keep(ba); keep(bb); keep(bc);
  const c1 = keep(cross(f, ba, bb, { rng: r, lookup: dl })), c2 = keep(cross(f, bb, ba, { rng: r, lookup: dl })), c3 = keep(cross(f, ba, bc, { rng: r, lookup: dl }));
  assert.equal(directKin(c1, ba, dl).rel, "parent"); assert.equal(directKin(c1, c2, dl).rel, "same-parents"); assert.equal(directKin(c1, c3, dl), null);
  assert.equal(directKin(ba, bb, dl), null); assert.equal(directKin(ba, structuredClone(ba), dl), null, "a genome is never compared");
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
        assert.equal(p, q);
        if (typeof p === "string") assert.ok(offStepEnds(locus, blendRange(f, l)).includes(copyValue(locus, p)), `${f.species.id} ${l.id}: ${p} is a pool end off the step`); // a named copy is only ever such an end
        else assert.ok(stepOf(locus, p) >= 0, `${f.species.id} ${l.id}: ${p} on the step`);
      }
      assert.deepEqual(checkGenome(f, child), [], `${f.species.id}: a stepped child is in its pools`);
      for (const t of forecast(f, a, b).traits) if (t.kind === "blend") for (const v of t.range) assert.ok(stepOf(LOCI.get(t.locus), v) >= 0 || offStepEnds(LOCI.get(t.locus), blendRange(f, f.loci.find((l) => l.id === t.locus))).includes(v), `${t.locus} range end ${v}`);
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
  assert.equal(sib.range[0], sib.range[1]); assert.equal(sib.sure, true, "a cross at kinship 1/4 of equal eyes lands on one value"); assert.equal(sib.firm, false);
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
          const shown = (valueOf(locus, p[0]) + valueOf(locus, p[1])) / 2, cv = valueOf(locus, c[0]), [lo, hi] = valueRange(locus), reach = SPREAD * (hi - lo) * (1 - 4 * SELF_KINSHIP) + Math.abs(valueOf(locus, p[0]) - valueOf(locus, p[1])) / 2 * (1 - 4 * SELF_KINSHIP) + 1e-6 + (hi - lo) / 32;
          assert.ok(Math.abs(cv - shown) <= reach, `${m.id} ${l.id}: a blend stays by its parent's (${cv} vs ${shown})`);
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

// --- the Peplos genome (catalogue 12, frame 5 of the Peplos) ---------------------------------------------------

const peplos = () => { const f = frameOf("S12"), g = typeSpecimen(f); return { f, g, built: buildIndividual(f, g) }; };
const inQuad = (q, [x, z]) => { let s = 0; for (let i = 0; i < 4; i++) { const [ax, az] = q[i], [bx, bz] = q[(i + 1) % 4], c = (bx - ax) * (z - az) - (bz - az) * (x - ax); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };

test("the Peplos type shows spots and carries plain: a cross of two type-like Peplos shows plain one time in four", () => {
  const { f, g, built } = peplos();
  assert.deepEqual([...g.loci["appearance.flap-marking"]].sort(), ["plain", "spots"]);
  assert.equal(resolveCopies(LOCI.get("appearance.flap-marking"), g.loci["appearance.flap-marking"]), "spots", "spots over plain: the type shows spots");
  assert.equal(frameOf("S12").loci.find((l) => l.id === "appearance.flap-marking").kind, "heritable-look");
  assert.equal(built.validation.status, "valid");
  const r = rng("peplos-pattern"); let plain = 0; const n = 4000;
  for (let i = 0; i < n; i++) { const c = cross(f, g, structuredClone(g), { rng: r, kinship: 0 }); if (resolveCopies(LOCI.get("appearance.flap-marking"), c.loci["appearance.flap-marking"]) === "plain") plain++; }
  assert.ok(Math.abs(plain / n - 0.25) < 0.03, `plain ${plain / n}`);
});

test("antenna form is thread, club or curl; the Peplos is fixed to curl; feather is not a legal copy", () => {
  const form = LOCI.get("anatomy.antenna-form");
  assert.deepEqual(form.alleles.map((a) => a.id), ["thread", "club", "curl"]);
  assert.equal(resolveCopies(form, ["curl", "thread"]), "curl");
  const f = frameOf("S12");
  assert.deepEqual(f.loci.find((l) => l.id === "anatomy.antenna-form").copies, ["curl", "curl"]);
  assert.equal(f.loci.find((l) => l.id === "appearance.surface-texture").copies[0], "smooth", "the body is one smooth bean");
  const old = structuredClone(typeSpecimen(f)); old.loci["anatomy.antenna-form"] = ["feather", "feather"];
  assert.ok(checkGenome(f, old).length > 0, "feather is no longer a legal copy");
});

test("the dew tongue is a locked C12 locus with no chapter and no trait, drawn coiled on the Peplos only", () => {
  const l = LOCI.get("anatomy.dew-tongue");
  assert.equal(l.scope, "branch"); assert.equal(l.clan, "C12");
  const row = frameOf("S12").loci.find((x) => x.id === "anatomy.dew-tongue");
  assert.equal(row.kind, "locked"); assert.deepEqual(row.copies, ["on", "on"]); assert.equal(row.chapter, null); assert.equal(row.trait, null);
  assert.ok(!frameOf("S12").chapters.some((c) => c.traits.some((t) => t.loci.includes("anatomy.dew-tongue"))));
  for (const g of frames) if (g.species.id !== "S12") assert.ok(!g.loci.some((x) => x.id === "anatomy.dew-tongue"), `${g.species.id} has no tongue`);
  const { built } = peplos();
  assert.ok(built.scene.nodes.filter((n) => n.part === "tongue").length >= 8, "a coil of beads");
  assert.ok(built.scene.nodes.filter((n) => n.id.includes("-curl-")).length >= 18, "a curl on each antenna");
});

test("flapRest has three values; the Peplos sails its flaps; E9b holds for the sail", () => {
  assert.equal(planFacts("three|serial|bilateral|contact|zero|one|three|on|skin", { flapRest: "sail", flapPairs: 2 }).extras.flapRest, "sail");
  assert.equal(planFacts("three|serial|bilateral|contact|zero|one|three|on|skin", { flapRest: "flat", flapPairs: 2 }).extras.flapRest, "flat");
  assert.equal(planFacts("three|serial|bilateral|contact|zero|one|three|on|skin", { flapRest: "other", flapPairs: 2 }).extras.flapRest, "raised");
  assert.equal(frameOf("S12").plan.extras.flapRest, "sail");
  assert.equal(frameOf("S09").plan.extras.flapRest, "flat", "the big bird keeps its flat rest");
  const { built } = peplos();
  const wings = built.scene.nodes.filter((n) => n.part === "flap");
  assert.equal(wings.length, 4);
  const head = built.scene.nodes.find((n) => n.id === "head"), headH = 2 * head.radii[2];
  const body = built.scene.nodes.filter((n) => n.role === "primary-region"), top = Math.max(...body.map((b) => b.center[2] + b.radii[2]));
  const wingTop = Math.max(...wings.flatMap((w) => w.corners.map((c) => c[2])));
  const fore = wings.filter((w) => w.id.startsWith("wing-fore")), hind = wings.filter((w) => w.id.startsWith("wing-hind"));
  assert.equal(fore.length + hind.length, 4);
  const top2 = (ws) => Math.max(...ws.flatMap((w) => w.corners.map((c) => c[2]))) - top;
  assert.ok(Math.abs(top2(fore) / headH - 2.1) <= 0.1, `the fore sail stands ${(top2(fore) / headH).toFixed(2)} head heights over the back (the signed plate: 2.1)`);
  assert.ok(top2(fore) <= 2.3 * headH, "and within the cap of 2.3");
  assert.ok(top2(hind) / headH >= 0.15 && top2(hind) / headH <= 0.5, `the hind pair stands low, ${(top2(hind) / headH).toFixed(2)} head heights over the back (the plate: 0.3)`);
  // the hind blade is splayed: it points back and a little up (13 degrees in the plate), and its tip lies out past the fore blade's rear edge
  const hw = hind[0], mid = (a, b) => a.map((v, i) => (v + b[i]) / 2), tip = mid(hw.corners[2], hw.corners[3]), rootC = mid(hw.corners[0], hw.corners[1]); // the blade's axis: root edge to tip edge
  const tilt = (Math.atan2(tip[2] - rootC[2], tip[0] - rootC[0]) * 180) / Math.PI; // the back is +x (the head at -x)
  assert.ok(tilt > 5 && tilt < 30, `the hind blade points back and a little up (${tilt.toFixed(0)} degrees, the plate: 13)`);
  assert.ok(tip[0] - Math.max(...fore.flatMap((w) => w.corners.map((c) => c[0]))) > 0.3 * headH, "the hind tip reaches out past the fore blade (the plate: 0.4 head heights)");
  assert.ok(Math.abs(tip[1]) > Math.abs(rootC[1]), "and splays outward from the flank");
  // one closed silhouette in the side view: the four blades rasterised together are one connected piece
  const quads = wings.map((w) => w.corners.map((c) => [c[0], c[2]])), xs = quads.flat().map((p) => p[0]), zs = quads.flat().map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs), N = 160, cell = new Set();
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { const p = [x0 + ((x1 - x0) * i) / N, z0 + ((z1 - z0) * j) / N]; if (quads.some((q) => inQuad(q, p))) cell.add(i * 1000 + j); }
  const seen = new Set(), stack = [[...cell][0]]; seen.add(stack[0]);
  while (stack.length) { const k = stack.pop(), i = Math.floor(k / 1000), j = k % 1000; for (const m of [k + 1000, k - 1000, k + 1, k - 1]) if (cell.has(m) && !seen.has(m) && Math.abs(m % 1000 - j) <= 1) { seen.add(m); stack.push(m); } }
  assert.equal(seen.size, cell.size, "one closed silhouette");
  // the near eye is never covered, from the side and from three-quarter views on either side
  const eyes = built.scene.nodes.filter((n) => n.id === "eye-L" || n.id === "eye-R");
  assert.equal(eyes.length, 2);
  for (const yaw of [0, 35, -35, 55, -55, 180, 145, 215]) for (const e of eyes) {
    const a = (yaw * Math.PI) / 180, proj = (p) => [p[0] * Math.cos(a) + p[1] * Math.sin(a), p[2]];
    assert.ok(!wings.some((w) => inQuad(w.corners.map(proj), proj(e.center))), `the sail covers an eye at yaw ${yaw}`);
  }
  assert.ok(RULES.some((r) => r.id === "E9b"));
});

test("asleep (pose sleep or curl) the sail plan lays its flaps flat like a roof; awake it keeps the sail", () => {
  const f = frameOf("S12"), g = typeSpecimen(f), awake = buildIndividual(f, g), roofTop = (b) => { const body = b.scene.nodes.filter((x) => x.role === "primary-region"), t = Math.max(...body.map((x) => x.center[2] + x.radii[2])); return Math.max(...b.scene.nodes.filter((n) => n.part === "flap").flatMap((w) => w.corners.map((c) => c[2]))) - t; };
  for (const pose of ["sleep", "curl"]) {
    const b = buildIndividual(f, g, { pose }); assert.equal(b.validation.status, "valid", pose);
    assert.equal(b.scene.nodes.filter((n) => n.part === "flap").length, 4);
    assert.ok(roofTop(b) < 0, `${pose}: the flaps lie under the back line`);
    assert.ok(roofTop(awake) > 0, "awake: the sail stands over the back");
  }
  assert.equal(buildIndividual(f, g, { pose: "stand" }).scene.nodes.find((n) => n.id === "wing-fore-L").corners.length, awake.scene.nodes.find((n) => n.id === "wing-fore-L").corners.length);
  const bird = frameOf("S09"), bg = typeSpecimen(bird);
  assert.deepEqual(buildIndividual(bird, bg, { pose: "sleep" }).scene.nodes.filter((n) => n.part === "flap").map((n) => n.corners), buildIndividual(bird, bg).scene.nodes.filter((n) => n.part === "flap").map((n) => n.corners), "a plan that already rests flat is unchanged");
});

test("the sleep rest stays flat: the flat value still builds the moth's roof over the back", () => {
  const f = frameOf("S12"), g = typeSpecimen(f), flat = structuredClone(frameOf("S12")); flat.plan.extras.flapRest = "flat";
  const b = buildIndividual(flat, g); assert.equal(b.validation.status, "valid");
  const wing = b.scene.nodes.find((n) => n.id === "wing-fore-L"), body = b.scene.nodes.filter((n) => n.role === "primary-region"), top = Math.max(...body.map((x) => x.center[2] + x.radii[2]));
  assert.ok(Math.max(...wing.corners.map((c) => c[2])) < top, "lies along the flank, under the back line");
});

test("pins: every form frame names catalogue 12 and the digest of what its own version sees", () => {
  assert.equal(CATALOGUE.version, 12);
  for (const f0 of [frameOf("S01"), frameOf("S10"), frameOf("S12"), frameOf("S17")]) {
    assert.equal(f0.catalogue.version, 12, `${f0.species.id} names pin 12`);
    assert.equal(f0.catalogue.digest, digestAt(frameVersionOf(f0)), `${f0.species.id}: the digest is the catalogue's at the frame's own version`);
    const g = typeSpecimen(f0);
    assert.deepEqual(checkGenome(f0, g), [], `a genome on ${f0.species.id} checks clean`);
  }
});

test("each clan's type-specimen sentence reads as written: the line, then the feature", async () => {
  const { describeGenome } = await import("../framework/describe.mjs");
  const want = {
    S01: "a round body, mostly head, on four short legs: a leaf crest and a flat face; charcoal, of meadow and pond",
    S02: "a puff with a face and stub feet: a cap of flaps, coral, radial bodies; soft, round, sleepy",
    S03: "a big round head on a slim four-legged body: a glowing tail and a crest, lagoon; small lights of wood and rock",
    S04: "a long tail wrapped round four paws: upright pointed ears, striped fur; quiet hunters of the grass",
    S05: "a four-legged body with a tail just as big: tall ears, a long muzzle, a bushy tail; clever wanderers",
    S06: "a four-legged body: a face mask and a ringed tail; masked tinkerers",
    S07: "a sturdy build on four short legs: broad claws, a striped face, stout bodies; the diggers",
    S08: "a light, slim-legged body with big cupped ears: horns and hooves; climbers of the high rocks",
    S09: "an upright body on two legs, wings tucked in: a beak and a pointed crest; watchers of the open sky",
    S10: "a long barrel-shaped body with a flat round snout: small ears and a broad tail; the water players",
    S11: "a high dome on four stumpy legs: a shell; slow keepers of the pond",
    S12: "a round body on six fine legs, wings up like a sail: patterned flaps; fliers of the flowers",
    S13: "a low domed body on six legs: plates and wing cases; armoured crawlers",
    S14: "a long soft body gliding on one flat foot: eye stalks and a sheen; the fog-lovers",
    S15: "an upright body, broad below, on two short legs: leaves and roots; the walking green",
    S16: "a creature that paddles the air with four flippers: a body of charge; storm-born",
  };
  for (const [id, sentence] of Object.entries(want)) {
    const f = frameOf(id), g = typeSpecimen(f);
    const { text } = describeGenome(f, g, buildIndividual(f, g).scene, { typeSpecimen: true });
    assert.ok(text.includes(` It is the type of its kind, ${sentence}.`), `${id}: ${text.match(/It is the type of its kind[^.]*\./)?.[0]}`);
  }
});

test("ruling 5: a pool's off-step ends are places a bred copy can land; a named value in the middle of a pool is not", () => {
  const f = frameOf("S01"), l = f.loci.find((x) => x.id === "growth.auricular-length-ratio"), ear = LOCI.get(l.id);
  const [lo, hi] = blendRange(f, l);
  assert.equal(hi, 0.75, "the Loika's top ear end is medium, 0.75");
  assert.deepEqual(offStepEnds(ear, [lo, hi]), [hi]);
  assert.ok(stepOf(ear, 0.75) < 0, "0.75 is off the step");
  assert.equal(quantize(ear, 0.75, [lo, hi]), 0.75, "a bred copy can land on the end");
  assert.equal(quantize(ear, 0.9, [lo, hi]), 0.75, "and a value past it is held there");
  assert.equal(quantize(ear, 0.752, [lo, hi]), 0.75, "nearer the end than the step above");
  const step = quantize(ear, 0.74, [lo, hi]);
  assert.ok(stepOf(ear, step) >= 0 && step < 0.75, "below the end, the step as before");
  assert.equal(quantize(ear, quantize(ear, 0.7497, [lo, hi]), [lo, hi]), quantize(ear, 0.7497, [lo, hi]), "idempotent");
  let prev = -Infinity; for (let v = lo; v <= hi; v += 0.0007) { const q = quantize(ear, v, [lo, hi]); assert.ok(q >= prev, "monotone"); prev = q; }
  // a named value in the middle of a pool adds no place
  const mid = ear.alleles.map((a) => a.value).filter((v) => v > lo && v < hi && stepOf(ear, v) < 0);
  assert.ok(mid.length > 0, "the ear has a named value inside its pool, off the step");
  for (const v of mid) assert.ok(stepOf(ear, quantize(ear, v, [lo, hi])) >= 0, "which quantises to a step");
  // a child with a pool end is written by its allele name, and the draw is seeded
  const base = typeSpecimen(f), top = ear.alleles.find((a) => a.value === 0.75).id;
  const p = { ...base, loci: { ...base.loci, [l.id]: [top, top] }, origin: { kind: "random" } };
  const q = { ...base, loci: { ...base.loci, [l.id]: [top, top] }, origin: { kind: "random" } };
  const draw = (seed) => { const r = rng(seed), out = []; for (let i = 0; i < 300; i++) out.push(cross(f, p, q, { rng: r }).loci[l.id]); return out; };
  const kids = draw("ruling5");
  assert.deepEqual(kids, draw("ruling5"), "same seed, same children");
  assert.ok(kids.some((c) => c[0] === top && c[1] === top), "a bred child shows the top end, by name");
  for (const c of kids) assert.ok(typeof c[0] === "string" ? c[0] === top && c[1] === top : stepOf(ear, c[0]) >= 0);
});

test("ruling 5: an end that sits on the step changes nothing, and old strings decode and draw as before", () => {
  const eye = LOCI.get("growth.exterior-eye-size-ratio"), [clo, chi] = valueRange(eye);
  assert.deepEqual(offStepEnds(eye, [clo, chi]), [], "the catalogue's own ends are on the step");
  for (const v of [0.2, 0.3337, 0.5, 0.9]) assert.equal(quantize(eye, v), quantize(eye, v, [clo, chi]));
  // a pool whose ends are on the step quantises exactly as the step alone would
  for (const f of frames) for (const l of f.loci) {
    const locus = LOCI.get(l.id); if (l.kind === "locked" || !isContinuous(locus)) continue;
    const b = blendRange(f, l); if (offStepEnds(locus, b).length) continue;
    const [lo, hi] = valueRange(locus), s = (hi - lo) / BLEND_STEPS;
    for (const v of [b[0], (b[0] + b[1]) / 2, b[1]]) assert.equal(quantize(locus, v, b), stepValue(locus, Math.min(Math.ceil((b[1] - lo) / s - 1e-9) , Math.max(Math.ceil((b[0] - lo) / s - 1e-9), Math.round((v - lo) / s)))));
  }
});

test("ruling 5: how many of the pool ends off the step a bred copy can now reach", () => {
  let n = 0, reach = 0;
  for (const f of frames) for (const l of f.loci) {
    const locus = LOCI.get(l.id); if (l.kind === "locked" || !isContinuous(locus)) continue;
    const b = blendRange(f, l);
    for (const e of offStepEnds(locus, b)) { n++; if (quantize(locus, e, b) === e) reach++; }
  }
  console.log(`off-step pool ends: ${n}, reachable: ${reach}`);
  assert.equal(reach, n);
});
