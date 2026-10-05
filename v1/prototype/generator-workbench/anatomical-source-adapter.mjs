
import { digest } from "./authoring-adapter.mjs";
import { randomStream } from "./model.mjs";
import { ANATOMICAL_CONTENT, ANATOMICAL_CATALOGUE, ANATOMICAL_RULE, ANATOMICAL_PROFILE, anatomicalSourcePackage } from "./anatomical-source-package.mjs";
import { constructAnatomicalSource } from "./anatomical-source-construction.mjs";
import { realizePigmentFields, realizeMaterialFields, anatomicalSourceReference } from "./anatomical-source-presentation.mjs";
const ANATOMICAL_PACKET_SCHEMA = "anatomical-authoring-record/1";
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function envelope(value, keys) {
  if (!plain(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected anatomical envelope fields");
}
function rejected(error, code = "anatomical-input") {
  return { status: "rejected", errors: [{ code, path: "input", message: error.message }] };
}
function resolveAnatomicalSource(input) {
  try {
    envelope(input, ["catalogue", "genome", "context", "expressionSeed"]);
    const { catalogue, genome } = input;
    if (digest(catalogue) !== digest(ANATOMICAL_CATALOGUE)) throw new Error("Exact provisional anatomical catalogue/version required; catalogue editing is not supported");
    envelope(genome, ["schemaVersion", "contentId", "contentVersion", "loci", "recordVersions", "baselineReferences", "origin"]);
    if (genome.schemaVersion !== "anatomical-genome/1" || genome.contentId !== catalogue.id || genome.contentVersion !== catalogue.version) throw new Error("Wrong anatomical genome/version");
    if (digest(genome.baselineReferences) !== digest(ANATOMICAL_CONTENT.inheritedBaseline.references) || digest(genome.recordVersions) !== digest(Object.fromEntries(catalogue.loci.map((locus) => [locus.id, locus.version])))) throw new Error("Required baseline and locus record versions differ");
    if (!plain(genome.loci) || Object.keys(genome.loci).length !== catalogue.loci.length) throw new Error("Every carried locus pair is required");
    const context = input.context ?? ANATOMICAL_CONTENT.referenceContext;
    if (digest(context) !== digest(ANATOMICAL_CONTENT.referenceContext)) throw new Error("Only the declared static anatomical reference context is supported");
    if (input.expressionSeed !== void 0 && input.expressionSeed !== null) throw new Error("This deterministic expression profile has no stochastic expression seed");
    const values = {}, facts = [];
    for (const locus of catalogue.loci) {
      const copies = genome.loci[locus.id];
      if (!Array.isArray(copies) || copies.length !== 2 || copies.some((id) => !locus.alleles.some((allele) => allele.id === id))) throw new Error(`Invalid ordered copies at ${locus.id}`);
      const contributions = copies.map((id) => locus.alleles.find((allele) => allele.id === id).value);
      let value;
      if (locus.operator === "copy-mean") value = (contributions[0] + contributions[1]) / 2;
      else if (locus.operator === "dominant-enable") value = contributions.some(Boolean);
      else {
        const key = [...copies].sort().join("|");
        if (!Object.hasOwn(locus.pairMap, key)) throw new Error(`Missing exact pair map at ${locus.id}`);
        value = structuredClone(locus.pairMap[key]);
      }
      if (typeof value === "number" && (!Number.isFinite(value) || locus.bounds && (value < locus.bounds[0] || value > locus.bounds[1]))) throw new Error(`Resolved value outside declared bounds at ${locus.id}`);
      const imported = ANATOMICAL_CONTENT.importedLoci.find((reference2) => reference2.id === locus.id);
      const target = imported?.target ?? locus.target;
      values[target] = value;
      facts.push({ id: target, locusId: locus.id, sources: [locus.id], recordVersion: locus.version, copies: [...copies], operator: imported?.operator ?? locus.operator, target, value, unit: locus.units ?? "", state: "expressed", prerequisites: [], reasons: [`Exact ${imported?.operator ?? locus.operator} resolution from both retained copies.`] });
    }
    for (const fact of facts) {
      const locus = catalogue.loci.find((l) => l.id === fact.locusId), guard = locus.activeWhen;
      if (!guard) continue;
      const active = guard === "covering.kind == scales" ? values["covering.kind"] === "scales" : values[guard] === true;
      const dependency = facts.find((f) => f.target === (guard === "covering.kind == scales" ? "covering.kind" : guard));
      if (!dependency) throw new Error(`Unsupported expression guard ${guard}`);
      fact.prerequisites = [dependency.locusId];
      if (!active) {
        fact.state = "inactive";
        fact.reasons.push(`Carried and resolved; construction inactive because ${guard} is not enabled.`);
      }
    }
    const scene = realizeMaterialFields(realizePigmentFields(constructAnatomicalSource(values, facts)), values, facts, ANATOMICAL_CONTENT.coveringConstruction);
    const reference = anatomicalSourceReference(scene);
    const result = { status: "resolved", profileVersion: ANATOMICAL_PROFILE, values, facts, graph: { profileVersion: ANATOMICAL_PROFILE, nodes: scene.nodes.map(({ mesh, surfaceFragments, ...node }) => node), edges: scene.edges, covering: scene.covering }, classification: { labels: ["provisional bilateral anatomical source"] }, motion: [], coverage: [...new Set(catalogue.loci.map((l) => l.family))].map((family) => ({ id: family, activeContributors: facts.filter((f) => f.state === "expressed" && catalogue.loci.find((l) => l.id === f.locusId).family === family).map((f) => f.locusId), inactiveContributors: facts.filter((f) => f.state === "inactive" && catalogue.loci.find((l) => l.id === f.locusId).family === family).map((f) => f.locusId), draftRecords: [], gaps: "Static source only; physiology, motion, fur and broader non-bilateral plans are unmodeled." })) };
    const retainedInput = structuredClone({ catalogue, genome, context, expressionSeed: null }), inputDigest = digest(retainedInput), resultDigest = digest(result), sceneDigest = digest(scene);
    const recordId = `anatomical-${digest({ inputDigest, resultDigest, sceneDigest }).slice(0, 20)}`;
    return { status: "resolved", schemaVersion: ANATOMICAL_PACKET_SCHEMA, ruleVersion: ANATOMICAL_RULE, contentId: catalogue.id, contentVersion: catalogue.version, sceneProjectionVersion: ANATOMICAL_PROFILE, materialProfileVersion: ANATOMICAL_CONTENT.coveringConstruction.profile, recordId, sceneRecordId: recordId, input: retainedInput, inputDigest, resultDigest, sceneDigest, result, scene, reference, representations: { baseline: JSON.stringify(ANATOMICAL_CONTENT.inheritedBaseline, null, 2), inherited: JSON.stringify(catalogue.loci.map((l) => ({ locusId: l.id, recordVersion: l.version, copies: genome.loci[l.id] })), null, 2), expression: JSON.stringify(facts, null, 2) }, description: `${scene.conventions.supportPairs * 2} rooted two-link supports; independently inherited head/core and optional modules. Static provisional source; motion and performance are unmodeled.`, prompt: { text: "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art." } };
  } catch (error) {
    return rejected(error);
  }
}
function generateAnatomicalSource(input) {
  try {
    envelope(input, ["catalogue", "seed", "maxAttempts"]);
    if (digest(input.catalogue) !== digest(ANATOMICAL_CATALOGUE)) throw new Error("Exact anatomical catalogue required");
    if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 4294967295) throw new Error("Generation seed must be uint32");
    const attempts = input.maxAttempts ?? 1024;
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > ANATOMICAL_CONTENT.bounds.candidateAttempts) throw new Error("Candidate attempts must be 1 through 1024");
    const random = randomStream(input.seed), failures = {};
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const descriptor = anatomicalSourcePackage(), genome = descriptor.defaultGeneration.genome;
      for (const locus of ANATOMICAL_CATALOGUE.loci) genome.loci[locus.id] = Array.from({ length: 2 }, () => locus.alleles[Math.floor(random() * locus.alleles.length)].id);
      genome.origin = { kind: "experiment", seed: input.seed, attempt, algorithmVersion: "mulberry32/1", baseline: ANATOMICAL_CONTENT.inheritedBaseline.id };
      const packet = resolveAnatomicalSource({ catalogue: input.catalogue, genome, context: descriptor.referenceContext, expressionSeed: null });
      if (packet.status === "resolved") return { ...packet, generation: { seed: input.seed, winningSeed: input.seed, attempts: attempt, algorithmVersion: "mulberry32/1", candidateSequenceVersion: "anatomical-independent-copies/1", priorFailures: failures } };
      const reason = packet.errors[0].message;
      failures[reason] = (failures[reason] ?? 0) + 1;
    }
    return { status: "rejected", errors: [{ code: "anatomical-search-exhausted", path: "generation", message: `No eligible complete construction in ${attempts} independent draws.` }], generation: { seed: input.seed, attempts, failures } };
  } catch (error) {
    return rejected(error);
  }
}
function anatomicalReplayEnvelope(packet) {
  return { schemaVersion: packet.schemaVersion, sceneProjectionVersion: packet.sceneProjectionVersion, materialProfileVersion: packet.materialProfileVersion, sceneRecordId: packet.sceneRecordId, input: packet.input, inputDigest: packet.inputDigest, resultDigest: packet.resultDigest, sceneDigest: packet.sceneDigest };
}
function replayAnatomicalSource(record) {
  try {
    envelope(record, ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"]);
    if (record.schemaVersion !== ANATOMICAL_PACKET_SCHEMA || record.sceneProjectionVersion !== ANATOMICAL_PROFILE || record.materialProfileVersion !== ANATOMICAL_CONTENT.coveringConstruction.profile) throw new Error("Unsupported anatomical record/profile version");
    const packet = resolveAnatomicalSource(record.input);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => packet[key] !== record[key])) throw new Error("Retained anatomical inputs or reconstruction digest differ");
    return { ...packet, replay: { status: "verified", profileVersion: ANATOMICAL_PROFILE } };
  } catch (error) {
    return rejected(error, "anatomical-replay");
  }
}
export {
  ANATOMICAL_PACKET_SCHEMA,
  anatomicalReplayEnvelope,
  generateAnatomicalSource,
  replayAnatomicalSource,
  resolveAnatomicalSource
};
