
import { readFileSync } from "node:fs";
import { PIGMENT_CANDIDATE_CATALOGUE } from "./pigment-candidate-catalogue.mjs";
const ANATOMICAL_CONTENT = JSON.parse(readFileSync(new URL("../../design/anatomical-source-prototype/proposal-content.json", import.meta.url), "utf8"));
const ANATOMICAL_RULE = ANATOMICAL_CONTENT.expressionRule;
const ANATOMICAL_PROFILE = ANATOMICAL_CONTENT.constructionProfile;
const imported = ANATOMICAL_CONTENT.importedLoci.map((reference) => {
  const record = PIGMENT_CANDIDATE_CATALOGUE.loci.find((locus) => locus.id === reference.id && locus.version === reference.version);
  if (!record) throw new Error(`Missing exact imported locus ${reference.id}@${reference.version}`);
  return structuredClone(record);
});
const ANATOMICAL_CATALOGUE = {
  schemaVersion: "anatomical-catalogue/1",
  ...ANATOMICAL_CONTENT.catalogueIdentity,
  ruleVersion: ANATOMICAL_RULE,
  label: "Provisional anatomical source experiment",
  baseline: ANATOMICAL_CONTENT.inheritedBaseline,
  reproductionContract: { mechanism: "Same-package ordered-copy transmission; no player breeding permission is implied." },
  loci: [
    ...ANATOMICAL_CONTENT.loci.map((locus) => ({
      ...locus,
      version: locus.version ?? 1,
      copyCount: 2,
      label: locus.id.split(".").at(-1).replaceAll("-", " "),
      family: locus.family ?? locus.dimensionFamily ?? "Structure",
      status: "validated",
      purpose: "Provisional source contributor; not canonical biology.",
      outputs: [locus.target],
      requires: [],
      sourceRequires: locus.requires ?? [],
      alleles: locus.alleles.map((allele) => ({ ...allele, label: allele.label ?? allele.id }))
    })),
    ...imported
  ]
};
ANATOMICAL_CATALOGUE.families = [...new Set(ANATOMICAL_CATALOGUE.loci.map((locus) => locus.family))].map((id) => ({ id, label: id }));
function anatomicalSourcePackage() {
  const genome = {
    schemaVersion: "anatomical-genome/1",
    contentId: ANATOMICAL_CATALOGUE.id,
    contentVersion: ANATOMICAL_CATALOGUE.version,
    loci: structuredClone(ANATOMICAL_CONTENT.workedInputs.defaultCopies),
    recordVersions: Object.fromEntries(ANATOMICAL_CATALOGUE.loci.map((locus) => [locus.id, locus.version])),
    baselineReferences: structuredClone(ANATOMICAL_CONTENT.inheritedBaseline.references),
    origin: { kind: "authored", baseline: ANATOMICAL_CONTENT.inheritedBaseline.id }
  };
  const sceneExamples = ANATOMICAL_CONTENT.workedInputs.examples.map((example) => ({
    id: example.id,
    name: example.id,
    label: example.label,
    genome: { ...structuredClone(genome), loci: { ...structuredClone(genome.loci), ...structuredClone(example.copyOverrides) } },
    context: structuredClone(ANATOMICAL_CONTENT.referenceContext),
    expressionSeed: null
  }));
  return {
    catalogue: structuredClone(ANATOMICAL_CATALOGUE),
    referenceContext: structuredClone(ANATOMICAL_CONTENT.referenceContext),
    defaultGeneration: { genome, context: structuredClone(ANATOMICAL_CONTENT.referenceContext), expressionSeed: null },
    sceneExamples
  };
}
export {
  ANATOMICAL_CATALOGUE,
  ANATOMICAL_CONTENT,
  ANATOMICAL_PROFILE,
  ANATOMICAL_RULE,
  anatomicalSourcePackage
};
