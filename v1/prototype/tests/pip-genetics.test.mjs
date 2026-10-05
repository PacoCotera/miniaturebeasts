import test from "node:test";
import assert from "node:assert/strict";
import {
  BASELINE_MODULES,
  DIMENSION_FAMILIES,
  PIP_SAMPLE,
  PIP_CONTENT,
  REFERENCE_CONTEXT,
  REQUIRED_FACTS,
} from "../genetics/content.mjs";
import {
  createPipGenome,
  enumerateGenotypes,
  forecastLocus,
  inheritGenomes,
  makeSupportedFounder,
  makeGenome,
  projectResearchKnowledge,
  projectFounderResearch,
  researchCompleteness,
  resolvePhenotype,
  validateContent,
  validateFounderSupport,
  validateGenome,
} from "../genetics/engine.mjs";

function variableGenotypes(overrides = {}) {
  return {
    "form.crown": ["C", "c"],
    "appearance.rings": ["R", "r"],
    "appearance.markings": ["P", "p"],
    "movement.drive": ["M", "m"],
    "movement.efficiency": ["E", "e"],
    ...overrides,
  };
}

function genome(overrides = {}) {
  const result = createPipGenome(variableGenotypes(overrides));
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  return result.genome;
}

function sameClassDonors() {
  return Object.fromEntries([
    ...PIP_CONTENT.fixedLoci.map(({ id }) => [id, { fromA: 0, fromB: 0 }]),
    ["form.crown", { fromA: 1, fromB: 0 }],
    ["appearance.rings", { fromA: 1, fromB: 0 }],
    ["appearance.markings", { fromA: 1, fromB: 1 }],
    ["movement.drive", { fromA: 0, fromB: 0 }],
    ["movement.efficiency", { fromA: 0, fromB: 0 }],
  ]);
}

test("validates the composed Pip content and explicit eleven-family coverage", () => {
  assert.deepEqual(validateContent(PIP_CONTENT), { valid: true, errors: [] });
  assert.equal(PIP_CONTENT.families.length, 11);
  assert.deepEqual(new Set(PIP_CONTENT.families), new Set(DIMENSION_FAMILIES));
  const represented = new Set([
    ...BASELINE_MODULES.map(({ family }) => family),
    ...PIP_CONTENT.fixedLoci.map(({ family }) => family),
    ...PIP_CONTENT.variableLoci.map(({ family }) => family),
  ]);
  assert.deepEqual(represented, new Set(DIMENSION_FAMILIES));
});

test("rejects bad content references, dependency cycles, and unsupported copy schemes", () => {
  const unknownReference = structuredClone(PIP_CONTENT);
  unknownReference.baselineModules[0].requires = ["missing.module"];
  assert.ok(validateContent(unknownReference).errors.some(({ code }) => code === "unknown-reference"));

  const cyclic = structuredClone(PIP_CONTENT);
  cyclic.baselineModules[0].requires = ["pip.sensing-signaling"];
  cyclic.baselineModules[1].requires = ["pip.body-plan"];
  assert.ok(validateContent(cyclic).errors.some(({ code }) => code === "dependency-cycle"));

  const wrongCopies = structuredClone(PIP_CONTENT);
  wrongCopies.variableLoci[0].copies = 1;
  assert.ok(validateContent(wrongCopies).errors.some(({ code }) => code === "unsupported-copy-count"));

  const malformedRecords = structuredClone(PIP_CONTENT);
  malformedRecords.baselineModules[0] = null;
  malformedRecords.variableLoci[0] = null;
  assert.doesNotThrow(() => validateContent(malformedRecords));
  assert.ok(validateContent(malformedRecords).errors.some(({ code }) => code === "invalid-record"));

  const malformedFields = structuredClone(PIP_CONTENT);
  malformedFields.baselineModules[0].requires = "not-an-array";
  malformedFields.variableLoci[0].alleles = null;
  malformedFields.variableLoci[1].requires = null;
  assert.doesNotThrow(() => validateContent(malformedFields));
  assert.ok(validateContent(malformedFields).errors.some(({ code }) => code === "missing-requirements"));
  assert.ok(validateContent(malformedFields).errors.some(({ code }) => code === "invalid-alleles"));

  const missingRuleSemantics = structuredClone(PIP_CONTENT);
  delete missingRuleSemantics.variableLoci[0].dominant;
  delete missingRuleSemantics.variableLoci[0].output;
  assert.ok(validateContent(missingRuleSemantics).errors.some(({ code }) => code === "invalid-rule-allele"));
  assert.ok(validateContent(missingRuleSemantics).errors.some(({ code }) => code === "missing-rule-output"));
  assert.ok(validateContent(missingRuleSemantics).errors.some(({ code }) => code === "pinned-content-mismatch"));
  assert.ok(Object.isFrozen(PIP_CONTENT.variableLoci[0].alleles));
  assert.ok(Object.isFrozen(PIP_SAMPLE.supportedCandidates[0].genotypes["appearance.markings"]));
});

test("enumerates 243 valid unordered genotypes without making them all sample-supported", () => {
  const enumeration = enumerateGenotypes(PIP_CONTENT);
  assert.equal(enumeration.valid, true);
  assert.equal(enumeration.genomes.length, 243);
  const signatures = new Set(enumeration.genomes.map((candidate) => PIP_CONTENT.variableLoci
    .map(({ id }) => candidate.genotypes[id].join(""))
    .join("/")));
  assert.equal(signatures.size, 243);
  assert.equal(validateFounderSupport(PIP_SAMPLE).valid, true);
  assert.equal(PIP_SAMPLE.supportedCandidates.length, 2);
  assert.ok(PIP_SAMPLE.supportedCandidates.length < enumeration.genomes.length);

  const unsupportedCandidate = structuredClone(PIP_SAMPLE);
  unsupportedCandidate.supportedCandidates[0].genotypes["form.crown"] = ["X", "c"];
  assert.ok(validateFounderSupport(unsupportedCandidate).errors.some(({ code }) => code === "invalid-supported-candidate"));

  const supportedFounder = makeSupportedFounder(PIP_SAMPLE, "reference-carried-p");
  assert.equal(supportedFounder.valid, true);
  assert.deepEqual(supportedFounder.genome.genotypes, genome().genotypes);
  assert.equal(makeSupportedFounder(PIP_SAMPLE, "unlisted-combination").valid, false);
  assert.equal(projectFounderResearch(PIP_SAMPLE, "unlisted-combination", {}).valid, false);
  assert.equal(projectFounderResearch(PIP_SAMPLE, "reference-carried-p", { "appearance.markings": ["p"] }).status, "projected");
});

test("requires every locus, baseline and fixed module explicitly, with no defaults", () => {
  const missing = makeGenome({
    "form.crown": ["C", "c"],
    "appearance.rings": ["R", "r"],
    "appearance.markings": ["P", "p"],
    "movement.drive": ["M", "m"],
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.some(({ code, path }) => code === "missing-locus" && path.includes("movement.efficiency")));

  const valid = genome();
  const noModule = { ...valid, baselineModules: valid.baselineModules.slice(1) };
  assert.ok(validateGenome(noModule).errors.some(({ code }) => code === "baseline-mismatch"));

  const badCopies = structuredClone(valid);
  badCopies.genotypes["appearance.rings"].push("R");
  assert.ok(validateGenome(badCopies).errors.some(({ code }) => code === "wrong-copy-count"));
  const badAllele = structuredClone(valid);
  badAllele.genotypes["form.crown"][0] = "X";
  assert.ok(validateGenome(badAllele).errors.some(({ code }) => code === "unknown-allele"));
});

test("resolves Pip qualitatively with a source trace for every output", () => {
  const result = resolvePhenotype(genome(), REFERENCE_CONTEXT);
  assert.equal(result.status, "resolved");
  assert.equal(result.fields.crown.value, "soft crown frill present");
  assert.equal(result.fields["eye-rings"].value, "pale eye rings present");
  assert.equal(result.fields["body-markings"].value, "no pale body markings");
  assert.equal(result.fields.movement.value, "walking, low clambering, and short bursts supported");
  assert.equal(result.fields["movement-energy"].value, "lower energy cost for the same supported locomotor action than ee");
  assert.ok(Object.values(result.fields).every(({ sources }) => sources.length > 0));
  assert.equal(result.fields["frill-display"].value, "frill display available");

  const recessive = resolvePhenotype(genome({
    "form.crown": ["c", "c"], "appearance.rings": ["r", "r"], "appearance.markings": ["p", "p"],
    "movement.drive": ["m", "m"], "movement.efficiency": ["e", "e"],
  }), REFERENCE_CONTEXT);
  assert.equal(recessive.fields.crown.value, "no crown frill");
  assert.equal(recessive.fields["frill-display"].value, "frill display unavailable without crown");
  assert.equal(recessive.fields["eye-rings"].value, "plain amber eyes");
  assert.equal(recessive.fields["body-markings"].value, "pale body markings present");
  assert.equal(recessive.fields.movement.value, "walking and low clambering; steady movement only");
  assert.equal(recessive.fields["movement-energy"].value, "baseline energy cost for supported locomotor action");
});

test("returns unsupported contexts instead of applying adult defaults", () => {
  const juvenile = { ...REFERENCE_CONTEXT, maturity: "juvenile" };
  assert.equal(resolvePhenotype(genome(), juvenile).status, "unsupported-context");
  assert.equal(resolvePhenotype(genome(), undefined).status, "unsupported-context");
});

test("projects unknown, one known p, and Pp without changing or leaking the candidate", () => {
  const candidate = genome();
  const original = structuredClone(candidate);
  const unknown = projectResearchKnowledge(candidate, {});
  const oneP = projectResearchKnowledge(candidate, { "appearance.markings": ["p"] });
  const decoded = projectResearchKnowledge(candidate, { "appearance.markings": ["P", "p"] });

  const unknownMarkings = unknown.loci.find(({ locus }) => locus === "appearance.markings");
  const partialMarkings = oneP.loci.find(({ locus }) => locus === "appearance.markings");
  const decodedMarkings = decoded.loci.find(({ locus }) => locus === "appearance.markings");
  assert.equal(unknownMarkings.status, "unknown");
  assert.equal(unknownMarkings.phenotype, null);
  assert.equal(partialMarkings.status, "partly-known");
  assert.deepEqual(partialMarkings.knownCopies, ["p"]);
  assert.equal(partialMarkings.unresolvedCopies, 1);
  assert.equal(partialMarkings.phenotype, null);
  assert.equal(decodedMarkings.status, "known");
  assert.equal(decodedMarkings.phenotype, "no pale body markings");
  assert.equal(decodedMarkings.carried, "p variant carried, not expressed");
  assert.equal(decoded.exposesCompleteGenome, false);
  assert.equal(Object.hasOwn(partialMarkings, "genotype"), false);
  assert.equal(Object.hasOwn(oneP, "genome"), false);
  assert.deepEqual(candidate, original);

  const unsupportedFact = projectResearchKnowledge(candidate, { "appearance.markings": ["x"] });
  assert.equal(unsupportedFact.valid, false);
  assert.ok(unsupportedFact.errors.some(({ code }) => code === "unsupported-knowledge-fact"));
});

test("distinguishes full research completeness from knowing only five variable loci", () => {
  const allKnown = Object.fromEntries(REQUIRED_FACTS.map((fact) => [
    fact,
    fact === "module:pip.fantastic-exclusion" ? "not-applicable" : "known",
  ]));
  assert.equal(researchCompleteness(PIP_SAMPLE, allKnown).complete, true);

  const onlyVariableLoci = Object.fromEntries(PIP_CONTENT.variableLoci.map(({ id }) => [`locus:${id}`, "known"]));
  const incomplete = researchCompleteness(PIP_SAMPLE, onlyVariableLoci);
  assert.equal(incomplete.complete, false);
  assert.ok(incomplete.missingOrInvalid.includes("locus:base.coat"));
  assert.ok(incomplete.missingOrInvalid.includes("module:pip.energy-nutrition"));

  const invalidNotApplicable = { ...allKnown, "module:pip.energy-nutrition": "not-applicable" };
  assert.equal(researchCompleteness(PIP_SAMPLE, invalidNotApplicable).complete, false);

  const incompleteManifest = structuredClone(PIP_SAMPLE);
  incompleteManifest.requiredFacts = incompleteManifest.requiredFacts.filter((fact) => fact !== "locus:appearance.markings");
  const rejectedManifest = researchCompleteness(incompleteManifest, allKnown);
  assert.equal(rejectedManifest.complete, false);
  assert.equal(rejectedManifest.status, "invalid-support");
});

test("inherits one exact same-class child with donor traces and forecasts marginal odds", () => {
  const parentA = genome();
  const parentB = genome({
    "form.crown": ["c", "c"],
    "movement.drive": ["m", "m"],
    "movement.efficiency": ["e", "e"],
  });
  const result = inheritGenomes(parentA, parentB, sameClassDonors());
  assert.equal(result.valid, true);
  assert.equal(result.genome.genotypes["form.crown"].join(""), "cc");
  assert.equal(result.genome.genotypes["appearance.rings"].join(""), "Rr");
  assert.equal(result.genome.genotypes["appearance.markings"].join(""), "pp");
  assert.equal(result.genome.genotypes["movement.drive"].join(""), "Mm");
  assert.equal(result.genome.genotypes["movement.efficiency"].join(""), "Ee");
  assert.equal(result.donorTrace["movement.drive"][0].allele, "M");
  assert.equal(result.donorTrace["movement.drive"][1].allele, "m");
  assert.deepEqual(result.parentGenomes.A, parentA);
  assert.deepEqual(result.parentGenomes.B, parentB);
  result.parentGenomes.A.genotypes["form.crown"][0] = "changed-copy";
  assert.equal(parentA.genotypes["form.crown"][0], "C");
  assert.deepEqual(result.genome.genotypes["base.coat"], ["charcoal", "charcoal"]);
  assert.equal(Object.hasOwn(result.genome, "id"), false);
  assert.equal(Object.hasOwn(result, "resources"), false);

  assert.deepEqual(forecastLocus(parentA, parentB, "form.crown").probabilities, { Cc: 0.5, cc: 0.5 });
  assert.deepEqual(forecastLocus(parentA, parentA, "appearance.rings").probabilities, { RR: 0.25, Rr: 0.5, rr: 0.25 });
  assert.deepEqual(forecastLocus(parentA, parentA, "appearance.markings").probabilities, { PP: 0.25, Pp: 0.5, pp: 0.25 });

  const wrongVersion = structuredClone(parentB);
  wrongVersion.contentVersion = "pip-other-version";
  assert.equal(forecastLocus(parentA, wrongVersion, "form.crown").valid, false);
  const wrongClass = structuredClone(parentB);
  wrongClass.classId = "critter:other";
  assert.equal(forecastLocus(parentA, wrongClass, "form.crown").valid, false);
});

test("rejects incompatible parents and malformed donor choices without repairing them", () => {
  const parentA = genome();
  const incompatible = structuredClone(parentA);
  incompatible.classId = "critter:other";
  const result = inheritGenomes(parentA, incompatible, sameClassDonors());
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(({ code }) => code === "class-mismatch" || code === "incompatible-parents"));

  const incompleteChoices = sameClassDonors();
  delete incompleteChoices["movement.drive"];
  const invalid = inheritGenomes(parentA, parentA, incompleteChoices);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some(({ code }) => code === "invalid-donor-choice"));
});
