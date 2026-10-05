import { createHash } from "node:crypto";
import { PIP_CONTENT, PIP_SAMPLE, REFERENCE_CONTEXT } from "../genetics/content.mjs";
import { makeSupportedFounder, resolvePhenotype, validateGenome } from "../genetics/engine.mjs";
import { drawDiagnosticCreature } from "./schematic.mjs";

export const WORKBENCH_VERSION = "generator-workbench-v1";
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (record(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

export const digest = (value) => createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
const failure = (code, path, message) => ({ status: "rejected", errors: [{ code, path, message }] });

export function catalogue() {
  return {
    schemaVersion: WORKBENCH_VERSION,
    defaultInput: {
      schemaVersion: WORKBENCH_VERSION,
      genome: makeSupportedFounder(PIP_SAMPLE, PIP_SAMPLE.supportedCandidates[0].id).genome,
      context: REFERENCE_CONTEXT,
    },
    variableLoci: PIP_CONTENT.variableLoci,
    baselineModules: PIP_CONTENT.baselineModules,
    fixedLoci: PIP_CONTENT.fixedLoci,
    families: PIP_CONTENT.families,
  };
}

// This adapter checks the experiment envelope. Genetic truth remains in the existing engine.
export function evaluate(input) {
  if (!record(input) || input.schemaVersion !== WORKBENCH_VERSION) {
    return failure("unsupported-envelope", "input", `Expected ${WORKBENCH_VERSION}.`);
  }
  if (Object.keys(input).some((key) => !["schemaVersion", "genome", "context"].includes(key))) {
    return failure("unknown-input", "input", "Only schemaVersion, genome and context are supported.");
  }
  const genome = input.genome;
  if (!record(genome) || !record(genome.genotypes) || !Array.isArray(genome.baselineModules)
      || genome.baselineModules.some((module) => typeof module !== "string")
      || Object.keys(genome).some((key) => !["classId", "contentVersion", "baselineModules", "genotypes"].includes(key))
      || Object.values(genome.genotypes).some((pair) => !Array.isArray(pair) || pair.some((copy) => typeof copy !== "string"))) {
    return failure("invalid-genome-shape", "genome", "A complete versioned genome with baseline modules and allele-copy arrays is required.");
  }
  const genomeCheck = validateGenome(genome);
  if (!genomeCheck.valid) return { status: "rejected", errors: genomeCheck.errors };
  if (canonicalJson(input.context) !== canonicalJson(REFERENCE_CONTEXT)) {
    return failure("unsupported-context", "context", "Only the declared healthy, rested adult reference context is modeled. Incubation effects are not selected.");
  }
  // Normalize context key ordering, not its values, before calling the pinned proof.
  const normalizedInput = JSON.parse(JSON.stringify({ ...input, context: REFERENCE_CONTEXT }));
  const phenotype = resolvePhenotype(genome, REFERENCE_CONTEXT);
  if (phenotype.status !== "resolved") return { status: "rejected", errors: phenotype.errors };
  const definitions = [...PIP_CONTENT.baselineModules, ...PIP_CONTENT.fixedLoci, ...PIP_CONTENT.variableLoci];
  const dependencyTrace = (source, visited = new Set()) => {
    if (visited.has(source)) return [];
    visited.add(source);
    const id = source.slice(source.indexOf(":") + 1);
    const definition = definitions.find((item) => item.id === id);
    return [source, ...(definition?.requires ?? []).flatMap((dependency) => dependencyTrace(
      `${PIP_CONTENT.baselineModules.some((item) => item.id === dependency) ? "module" : "locus"}:${dependency}`, visited))];
  };
  const facts = Object.entries(phenotype.fields).map(([id, field]) => ({
    id, value: field.value, sources: field.sources,
    dependencyClosure: [...new Set(field.sources.flatMap((source) => dependencyTrace(source)))],
  }));
  const fact = (id) => facts.find((item) => item.id === id);
  const relationships = [
    { id: "structure-to-signaling", title: "Structure enables signaling", outputs: [fact("crown"), fact("frill-display")] },
    { id: "locomotion-and-energy", title: "Supported movement × energy demand", outputs: [fact("movement"), fact("movement-energy")] },
  ];
  const fieldFamilies = {
    crown: "structure", "eye-rings": "appearance", "body-markings": "appearance",
    movement: "mechanics-movement", "movement-energy": "energy-nutrition", "frill-display": "sensing-signaling",
  };
  const coverage = PIP_CONTENT.families.map((family) => ({
    family,
    baseline: PIP_CONTENT.baselineModules.filter((item) => item.family === family).map((item) => ({ id: item.id, value: item.value })),
    fixedLoci: PIP_CONTENT.fixedLoci.filter((item) => item.family === family).map((item) => ({ id: item.id, value: item.value })),
    variableLoci: PIP_CONTENT.variableLoci.filter((item) => item.family === family).map((item) => item.id),
    indirectLoci: [...new Set(facts.filter((item) => fieldFamilies[item.id] === family)
      .flatMap((item) => item.dependencyClosure)
      .filter((source) => source.startsWith("locus:") && definitions.find((item) => item.id === source.slice(6))?.family !== family)
      .map((source) => source.slice(6)))],
    boundary: family === "fantastic-physiology" ? "Not applicable to Pip" : "Qualitative fixture only; numeric, regulatory and dynamic effects unmodeled",
  }));
  const sampleSupported = PIP_SAMPLE.supportedCandidates.some((candidate) => PIP_CONTENT.variableLoci.every(({ id }) =>
    [...candidate.genotypes[id]].sort().join("|") === [...genome.genotypes[id]].sort().join("|")));
  let schematic;
  try { schematic = drawDiagnosticCreature(phenotype); }
  catch (error) { return failure("unsupported-construction", "phenotype", error.message); }
  const output = {
    phenotype, facts, relationships, coverage, sampleSupported,
    layers: [
      { name: "Class / body plan", status: "Pinned Pip baseline and structural constraints" },
      { name: "Inherited genome", status: "Fixed baseline + five editable two-copy loci" },
      { name: "Expression / context", status: "Four named operators; one adult reference context" },
      { name: "Resolved phenotype", status: "Qualitative fields and causal dependency traces" },
      { name: "Lifetime state / history", status: "Not simulated; no training, fatigue or acquired identity" },
    ],
    schematic,
    encyclopedia: { status: "Fact-derived diagnostic record, not final encyclopedia writing", classId: genome.classId, contextId: phenotype.contextId, facts },
    limitations: ["Not an incubation or individual creation authorization", "No production body/rig generator, sprites or animations", "No generalized emergent-trait solver or incubation effects", "No LLM connection, learned behavior or hardware validation"],
  };
  return {
    status: "resolved", schemaVersion: WORKBENCH_VERSION, generatorVersion: "pip-diagnostic-v1",
    input: normalizedInput, inputDigest: digest(normalizedInput), output, outputDigest: digest(output),
  };
}
