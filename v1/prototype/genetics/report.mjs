import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  BASELINE_MODULES,
  DIMENSION_FAMILIES,
  PIP_SAMPLE,
  PIP_CONTENT,
  REFERENCE_CONTEXT,
} from "./content.mjs";
import {
  createPipGenome,
  enumerateGenotypes,
  forecastLocus,
  inheritGenomes,
  makeSupportedFounder,
  projectResearchKnowledge,
  projectFounderResearch,
  resolvePhenotype,
  validateContent,
  validateFounderSupport,
} from "./engine.mjs";

const outputDirectory = dirname(fileURLToPath(import.meta.url));
const referenceCandidateId = PIP_SAMPLE.supportedCandidates[0].id;
const genomeResult = makeSupportedFounder(PIP_SAMPLE, referenceCandidateId, PIP_CONTENT);

function requireValid(result, label) {
  if (!result.valid && result.status !== "resolved" && result.status !== "projected") {
    throw new Error(`${label} failed: ${JSON.stringify(result.errors ?? result)}`);
  }
}

const contentValidation = validateContent(PIP_CONTENT);
const supportValidation = validateFounderSupport(PIP_SAMPLE, PIP_CONTENT);
const genotypeCoverage = enumerateGenotypes(PIP_CONTENT);
requireValid(contentValidation, "content validation");
requireValid(supportValidation, "founder support validation");
requireValid(genotypeCoverage, "genotype enumeration");
requireValid(genomeResult, "Pip genome construction");

const phenotype = resolvePhenotype(genomeResult.genome, REFERENCE_CONTEXT, PIP_CONTENT);
const genomeBeforeProjection = JSON.stringify(genomeResult.genome);
const unknown = projectFounderResearch(PIP_SAMPLE, referenceCandidateId, {}, PIP_CONTENT);
const oneKnownP = projectFounderResearch(PIP_SAMPLE, referenceCandidateId, {
  "appearance.markings": ["p"],
}, PIP_CONTENT);
const decodedPp = projectFounderResearch(PIP_SAMPLE, referenceCandidateId, {
  "appearance.markings": ["P", "p"],
}, PIP_CONTENT);
if (JSON.stringify(genomeResult.genome) !== genomeBeforeProjection) throw new Error("Projection changed the input genome.");

const parentA = createPipGenome({
  "form.crown": ["C", "c"], "appearance.rings": ["R", "r"], "appearance.markings": ["P", "p"],
  "movement.drive": ["M", "m"], "movement.efficiency": ["E", "e"],
}).genome;
const parentB = createPipGenome({
  "form.crown": ["c", "c"], "appearance.rings": ["R", "r"], "appearance.markings": ["P", "p"],
  "movement.drive": ["m", "m"], "movement.efficiency": ["e", "e"],
}).genome;
const donorChoices = Object.fromEntries([
  ...PIP_CONTENT.fixedLoci.map(({ id }) => [id, { fromA: 0, fromB: 0 }]),
  ["form.crown", { fromA: 1, fromB: 0 }],
  ["appearance.rings", { fromA: 1, fromB: 0 }],
  ["appearance.markings", { fromA: 1, fromB: 1 }],
  ["movement.drive", { fromA: 0, fromB: 0 }],
  ["movement.efficiency", { fromA: 0, fromB: 0 }],
]);
const cross = inheritGenomes(parentA, parentB, donorChoices, PIP_CONTENT);
requireValid(cross, "Pip inheritance");
const forecasts = PIP_CONTENT.variableLoci.map(({ id }) => forecastLocus(parentA, parentB, id, PIP_CONTENT));

const genotypeText = (genome) => PIP_CONTENT.variableLoci
  .map(({ id }) => `${id}: ${genome.genotypes[id].join("")}`)
  .join("; ");
const traceText = (field) => `${field.value} — ${field.sources.join(", ")}`;
const familyRows = DIMENSION_FAMILIES.map((family) => {
  const sources = [
    ...BASELINE_MODULES.filter((module) => module.family === family).map(({ id, inheritance }) => `${id} (${inheritance})`),
    ...PIP_CONTENT.fixedLoci.filter((locus) => locus.family === family).map(({ id }) => `${id} (fixed locus)`),
    ...PIP_CONTENT.variableLoci.filter((locus) => locus.family === family).map(({ id }) => `${id} (variable locus)`),
  ];
  return `| ${family} | ${sources.join("; ") || "No content source"} |`;
}).join("\n");
const forecastRows = forecasts.map(({ locus, probabilities }) =>
  `| ${locus} | ${Object.entries(probabilities).map(([genotype, probability]) => `${genotype}: ${(probability * 100).toFixed(0)}%`).join("; ")} |`).join("\n");

const report = `# Pip genetic proof report

Generated from content version \`${PIP_CONTENT.version}\` by \`node prototype/genetics/report.mjs\`. This is a deterministic host fixture report, not a production genome library, final balance, artwork approval, or living critter. It assigns no identity, ownership, or resource changes.

## Coverage and candidate support

- Content validation: ${contentValidation.valid ? "passed" : "failed"}.
- Combinatorial coverage: ${genotypeCoverage.genomes.length} valid unordered genotypes from five two-copy loci (3^5). This is a coverage set, not a sample support list or population weighting.
- Authored Pip reference sample support: ${PIP_SAMPLE.supportedCandidates.length} explicit complete candidates. Neither candidate list nor 243-genotype space implies every combination is supported by a sample.
- The sample's required-fact manifest has ${PIP_SAMPLE.requiredFacts.length} entries across baseline modules, fixed loci, and variable loci. Fantastic physiology is explicitly not applicable; unmodeled data are not inferred complete.
- Expression context: healthy, rested adult on firm ground in mild conditions. Other contexts return unsupported.

## Baseline coverage across the eleven families

| Family | Explicit source |
| --- | --- |
${familyRows}

Class invariants provide the Pip body plan. Fixed inherited module references and charcoal/cream/amber two-copy loci pass through a same-class cross. Variable loci control only their declared effects. The five variable loci are not the whole genome.

## Accepted qualitative reference

Input: \`${genotypeText(genomeResult.genome)}\`.

| Phenotype field | Result and source trace |
| --- | --- |
${Object.entries(phenotype.fields).map(([name, field]) => `| ${name} | ${traceText(field)} |`).join("\n")}

This genotype expresses crown and rings, carries \`p\` without pale body markings, and supports short bursts with lower energy cost for the same supported locomotor action than \`ee\`. It makes no numerical speed, force, energy, or performance claim.

## Research disclosure: one unchanged candidate

The same complete private candidate is used in each projection: \`${genotypeText(genomeResult.genome)}\`. Projection does not modify the candidate genome.

| Knowledge established | Player-facing projection |
| --- | --- |
| No markings copies known | ${JSON.stringify(unknown.loci.find(({ locus }) => locus === "appearance.markings"))} |
| One \`p\` copy known | ${JSON.stringify(oneKnownP.loci.find(({ locus }) => locus === "appearance.markings"))} |
| Both \`Pp\` copies known | ${JSON.stringify(decodedPp.loci.find(({ locus }) => locus === "appearance.markings"))} |

The partial projection never returns the hidden other copy, any other locus, or the complete genome. A sample may support only the candidates explicitly listed in its content; research cannot invent a \`pp\` option or mutate the source genome.

## One exact compatible child

Parents are same-version Pip candidates. The selected copies and output are:

| Locus | Parent A copy | Parent B copy | Child |
| --- | --- | --- | --- |
${Object.entries(cross.donorTrace).map(([locus, donors]) => `| ${locus} | ${donors[0].allele} (copy ${donors[0].copyIndex}) | ${donors[1].allele} (copy ${donors[1].copyIndex}) | ${cross.genome.genotypes[locus].join("")} |`).join("\n")}

The child has these variable effects:

| Effect | Result |
| --- | --- |
${Object.entries(resolvePhenotype(cross.genome, REFERENCE_CONTEXT, PIP_CONTENT).fields).filter(([name]) => ["crown", "eye-rings", "body-markings", "movement", "movement-energy", "frill-display"].includes(name)).map(([name, field]) => `| ${name} | ${field.value} |`).join("\n")}

Its shared class baseline and fixed inherited modules remain as listed in the baseline table above.

The cross is a pure genome operation. It allocates no individual identity, spends no sample or inventory, does not grant permission, and does not silently repair an invalid child. A later accepted game operation owns those actions.

## Conditional single-locus forecasts

These exact Mendelian forecasts assume valid Pip parents and independent loci in this content version. They are not balance targets or cross-class predictions.

| Locus | Offspring genotype distribution |
| --- | --- |
${forecastRows}

## Evidence limits

The proof resolves qualitative inherited features under one adult reference context. Numeric physiology, juvenile rendering/behavior, other classes, mutations, linkage, sample-specific research outcomes beyond the explicit support list, production completeness, and hardware behavior are not established. The existing live experiment remains separate and continues to use its older draft module.
`;

await writeFile(join(outputDirectory, "report.md"), report, "utf8");
process.stdout.write(`Wrote prototype/genetics/report.md (${genotypeCoverage.genomes.length} valid coverage genotypes; ${PIP_SAMPLE.supportedCandidates.length} supported Pip reference candidates).\n`);
