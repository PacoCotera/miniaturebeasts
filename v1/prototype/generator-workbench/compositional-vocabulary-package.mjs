// As in catalogue1, the definition pin excludes its own derived top-level pin.
import { readFileSync } from "node:fs";
import { digest } from "./authoring-adapter.mjs";
import { COMPOSITIONAL_CATALOGUE, compositionalSourcePackage } from "./compositional-source-package.mjs";
const VOCABULARY_CONTENT = JSON.parse(readFileSync(new URL("../../design/anatomical-source-prototype/compositional-vocabulary-content.json", import.meta.url), "utf8"));
const VOCABULARY_RULE = VOCABULARY_CONTENT.ruleVersion;
const VOCABULARY_PROFILE = VOCABULARY_CONTENT.constructionProfile;
const VOCABULARY_CATALOGUE = structuredClone(COMPOSITIONAL_CATALOGUE);
delete VOCABULARY_CATALOGUE.foundationPin;
Object.assign(VOCABULARY_CATALOGUE, VOCABULARY_CONTENT.catalogueIdentity, { ruleVersion: VOCABULARY_RULE, baseline: VOCABULARY_CONTENT.baseline });
for (const proposal of VOCABULARY_CONTENT.loci) {
  if (VOCABULARY_CATALOGUE.loci.some((locus) => locus.id === proposal.id)) throw new Error(`Duplicate vocabulary locus ${proposal.id}`);
  const definition = {
    ...proposal,
    status: "validated",
    label: proposal.id.split(".").at(-1).replaceAll("-", " "),
    purpose: "Provisional owner-local shape or covering contributor; not canonical biology.",
    requires: [],
    outputs: [proposal.target],
    alleles: proposal.alleles.map((allele) => ({ ...allele, label: allele.id }))
  };
  VOCABULARY_CATALOGUE.loci.push(definition);
  const reference = {
    sourceCatalogue: VOCABULARY_CONTENT.catalogueIdentity,
    file: "compositional-vocabulary-package.mjs",
    export: "VOCABULARY_CATALOGUE.loci",
    locusId: definition.id,
    recordVersion: definition.version,
    recordDigest: digest(definition),
    proposalOrigin: { file: "compositional-vocabulary-content.json", export: "loci", locusId: proposal.id, recordDigest: digest(
      proposal
    ) }
  };
  VOCABULARY_CATALOGUE.sourceDefinitions.push({ ...reference, definition: structuredClone(definition) });
  VOCABULARY_CATALOGUE.recordSources[definition.id] = [reference];
}
const VOCABULARY_FOUNDATION = {
  profile: "compositional-foundation-pin/1",
  id: VOCABULARY_CATALOGUE.id,
  version: VOCABULARY_CATALOGUE.version,
  digest: digest(VOCABULARY_CATALOGUE)
};
VOCABULARY_CATALOGUE.foundationPin = VOCABULARY_FOUNDATION;
function compositionalVocabularyPackage() {
  const retained = compositionalSourcePackage();
  const genome = structuredClone(retained.defaultGeneration.genome);
  genome.contentVersion = VOCABULARY_CATALOGUE.version;
  Object.assign(genome.loci, structuredClone(VOCABULARY_CONTENT.defaultCopies));
  Object.assign(genome.recordVersions, Object.fromEntries(VOCABULARY_CONTENT.loci.map((locus) => [locus.id, locus.version])));
  genome.baselineReferences = structuredClone(VOCABULARY_CONTENT.baseline.references);
  genome.origin = { kind: "authored", baseline: VOCABULARY_CONTENT.baseline.id, baselineVersion: VOCABULARY_CONTENT.baseline.version };
  return {
    catalogue: structuredClone(VOCABULARY_CATALOGUE),
    foundation: VOCABULARY_FOUNDATION,
    referenceContext: retained.referenceContext,
    defaultGeneration: { genome, context: retained.referenceContext, expressionSeed: null },
    sceneExamples: []
  };
}
export {
  VOCABULARY_CATALOGUE,
  VOCABULARY_CONTENT,
  VOCABULARY_FOUNDATION,
  VOCABULARY_PROFILE,
  VOCABULARY_RULE,
  compositionalVocabularyPackage
};
