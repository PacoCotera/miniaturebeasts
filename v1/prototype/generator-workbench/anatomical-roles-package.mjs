import { readFileSync } from "node:fs";
import { digest } from "./authoring-adapter.mjs";
import { VOCABULARY_CATALOGUE, compositionalVocabularyPackage } from "./compositional-vocabulary-package.mjs";

export const ROLES_CONTENT = JSON.parse(readFileSync(new URL("../../design/anatomical-source-prototype/anatomical-roles-content.json", import.meta.url), "utf8"));
export const ROLES_CATALOGUE = structuredClone(VOCABULARY_CATALOGUE);
delete ROLES_CATALOGUE.foundationPin;
Object.assign(ROLES_CATALOGUE, ROLES_CONTENT.catalogueIdentity, {
  ruleVersion: ROLES_CONTENT.ruleVersion,
  baseline: ROLES_CONTENT.baseline
});
for (const proposal of ROLES_CONTENT.loci) {
  if (ROLES_CATALOGUE.loci.some((locus) => locus.id === proposal.id)) throw new Error(`Duplicate anatomical role ${proposal.id}`);
  const definition = {
    ...proposal,
    status: "validated",
    label: proposal.id.split(".").at(-1).replaceAll("-", " "),
    purpose: "Provisional copied anatomical role; static geometry does not establish physiology.",
    requires: [],
    outputs: [proposal.target],
    alleles: proposal.alleles.map((allele) => ({ ...allele, label: allele.id }))
  };
  const reference = {
    sourceCatalogue: ROLES_CONTENT.catalogueIdentity,
    file: "anatomical-roles-package.mjs",
    export: "ROLES_CATALOGUE.loci",
    locusId: definition.id,
    recordVersion: definition.version,
    recordDigest: digest(definition),
    proposalOrigin: { file: "anatomical-roles-content.json", export: "loci", locusId: proposal.id, recordDigest: digest(proposal) }
  };
  ROLES_CATALOGUE.loci.push(definition);
  ROLES_CATALOGUE.sourceDefinitions.push({ ...reference, definition: structuredClone(definition) });
  ROLES_CATALOGUE.recordSources[definition.id] = [reference];
}
// The exact definition excludes only this derived top-level self-pin.
export const ROLES_FOUNDATION = {
  profile: "compositional-foundation-pin/1",
  id: ROLES_CATALOGUE.id,
  version: ROLES_CATALOGUE.version,
  digest: digest(ROLES_CATALOGUE)
};
ROLES_CATALOGUE.foundationPin = ROLES_FOUNDATION;

export function anatomicalRolesPackage() {
  const descriptor = compositionalVocabularyPackage();
  const genome = structuredClone(descriptor.defaultGeneration.genome);
  genome.contentVersion = ROLES_CATALOGUE.version;
  Object.assign(genome.loci, structuredClone(ROLES_CONTENT.defaultCopies));
  Object.assign(genome.recordVersions, Object.fromEntries(ROLES_CONTENT.loci.map((locus) => [locus.id, locus.version])));
  genome.baselineReferences = structuredClone(ROLES_CONTENT.baseline.references);
  genome.origin = { kind: "authored", baseline: ROLES_CONTENT.baseline.id, baselineVersion: ROLES_CONTENT.baseline.version };
  return {
    catalogue: structuredClone(ROLES_CATALOGUE),
    foundation: ROLES_FOUNDATION,
    referenceContext: descriptor.referenceContext,
    defaultGeneration: { genome, context: descriptor.referenceContext, expressionSeed: null },
    sceneExamples: []
  };
}
