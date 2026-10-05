// This definition pin hashes the full registry definition before its derived
// top-level foundationPin is attached. A tree/codec digest of the subsequently
// retained catalogue includes that pin and is deliberately a different boundary.
import { readFileSync } from "node:fs";
import { digest } from "./authoring-adapter.mjs";
import { ANATOMICAL_CATALOGUE, anatomicalSourcePackage } from "./anatomical-source-package.mjs";
import { AUTHORING_CATALOGUE } from "./catalogue.mjs";
import { REGIONAL_SCENE_CATALOGUE } from "./regional-scene-catalogue.mjs";
const COMPOSITIONAL_CONTENT = JSON.parse(readFileSync(new URL("../../design/anatomical-source-prototype/compositional-content.json", import.meta.url), "utf8"));
const COMPOSITIONAL_RULE = COMPOSITIONAL_CONTENT.ruleVersion;
const COMPOSITIONAL_PROFILE = COMPOSITIONAL_CONTENT.constructionProfile;
const COMPOSITIONAL_CATALOGUE = {
  schemaVersion: "compositional-catalogue/1",
  ...COMPOSITIONAL_CONTENT.catalogueIdentity,
  ruleVersion: COMPOSITIONAL_RULE,
  baseline: COMPOSITIONAL_CONTENT.baseline,
  reproductionContract: { mechanism: "Exact same-package copy transmission; no player breeding permission implied." },
  families: structuredClone(AUTHORING_CATALOGUE.families),
  loci: [
    ...structuredClone(REGIONAL_SCENE_CATALOGUE.loci),
    ...structuredClone(ANATOMICAL_CATALOGUE.loci.filter((locus) => !REGIONAL_SCENE_CATALOGUE.loci.some((existing) => existing.id === locus.id))),
    ...COMPOSITIONAL_CONTENT.loci.map((locus) => ({
      ...locus,
      version: locus.version ?? 1,
      copyCount: 2,
      status: "validated",
      family: locus.family ?? "Structure",
      label: locus.id.split(".").at(-1).replaceAll("-", " "),
      purpose: "Provisional compositional contributor, not canonical biology.",
      requires: [],
      outputs: [locus.target],
      alleles: locus.alleles.map((allele) => ({ ...allele, label: allele.label ?? allele.id }))
    }))
  ]
};
for (const locus of ANATOMICAL_CATALOGUE.loci) {
  const shared = REGIONAL_SCENE_CATALOGUE.loci.find((existing) => existing.id === locus.id);
  if (shared && digest(shared) !== digest(locus)) throw new Error(`Ambiguous shared definition ${locus.id}`);
}
const registries = [
  { catalogue: AUTHORING_CATALOGUE, file: "catalogue.mjs", export: "AUTHORING_CATALOGUE" },
  { catalogue: REGIONAL_SCENE_CATALOGUE, file: "regional-scene-catalogue.mjs", export: "REGIONAL_SCENE_CATALOGUE" },
  { catalogue: ANATOMICAL_CATALOGUE, file: "anatomical-source-package.mjs", export: "ANATOMICAL_CATALOGUE" }
];
COMPOSITIONAL_CATALOGUE.sourceDefinitions = registries.flatMap(({ catalogue, file, export: symbol }) => catalogue.loci.map((locus) => ({
  sourceCatalogue: { id: catalogue.id, version: catalogue.version },
  file,
  export: symbol,
  locusId: locus.id,
  recordVersion: locus.version,
  recordDigest: digest(locus),
  definition: structuredClone(locus)
})));
for (const proposal of COMPOSITIONAL_CONTENT.loci) {
  const definition = COMPOSITIONAL_CATALOGUE.loci.find((locus) => locus.id === proposal.id);
  COMPOSITIONAL_CATALOGUE.sourceDefinitions.push({
    sourceCatalogue: COMPOSITIONAL_CONTENT.catalogueIdentity,
    file: "compositional-source-package.mjs",
    export: "COMPOSITIONAL_CATALOGUE.loci",
    locusId: definition.id,
    recordVersion: definition.version,
    recordDigest: digest(definition),
    definition: structuredClone(definition),
    proposalOrigin: {
      file: "compositional-content.json",
      export: "loci",
      locusId: proposal.id,
      recordDigest: digest(proposal)
    }
  });
}
COMPOSITIONAL_CATALOGUE.recordSources = Object.fromEntries(COMPOSITIONAL_CATALOGUE.loci.map((locus) => {
  const sources = COMPOSITIONAL_CATALOGUE.sourceDefinitions.filter((reference) => reference.locusId === locus.id && reference.recordDigest === digest(locus));
  if (!sources.length) throw new Error(`No exact definition reference for ${locus.id}`);
  return [locus.id, sources.map(({ definition, ...reference }) => reference)];
}));
const COMPOSITIONAL_FOUNDATION = {
  profile: "compositional-foundation-pin/1",
  id: COMPOSITIONAL_CATALOGUE.id,
  version: COMPOSITIONAL_CATALOGUE.version,
  digest: digest(COMPOSITIONAL_CATALOGUE)
};
COMPOSITIONAL_CATALOGUE.foundationPin = COMPOSITIONAL_FOUNDATION;
function compositionalSourcePackage() {
  const oldInput = anatomicalSourcePackage().defaultGeneration.genome;
  const genome = {
    schemaVersion: "compositional-genome/1",
    contentId: COMPOSITIONAL_CATALOGUE.id,
    contentVersion: COMPOSITIONAL_CATALOGUE.version,
    loci: { ...Object.fromEntries(REGIONAL_SCENE_CATALOGUE.loci.filter((locus) => locus.status === "validated").map((locus) => [locus.id, [locus.alleles[0].id, locus.alleles[0].id]])), ...oldInput.loci, ...COMPOSITIONAL_CONTENT.workedInputs.newDefaultCopies, ...COMPOSITIONAL_CONTENT.workedInputs.commonImportedOverrides },
    recordVersions: Object.fromEntries(COMPOSITIONAL_CATALOGUE.loci.filter((locus) => locus.status === "validated").map((locus) => [locus.id, locus.version])),
    baselineReferences: structuredClone(COMPOSITIONAL_CONTENT.baseline.references),
    origin: { kind: "authored", baseline: COMPOSITIONAL_CONTENT.baseline.id }
  };
  const context = structuredClone(COMPOSITIONAL_CONTENT.context);
  return {
    catalogue: structuredClone(COMPOSITIONAL_CATALOGUE),
    foundation: COMPOSITIONAL_FOUNDATION,
    referenceContext: context,
    defaultGeneration: { genome, context, expressionSeed: null },
    sceneExamples: COMPOSITIONAL_CONTENT.workedInputs.examples.map((example) => ({
      name: example.id,
      id: example.id,
      label: example.id.replaceAll("-", " "),
      genome: { ...structuredClone(genome), loci: { ...structuredClone(genome.loci), ...example.overrides } },
      context,
      expressionSeed: null
    }))
  };
}
export {
  COMPOSITIONAL_CATALOGUE,
  COMPOSITIONAL_CONTENT,
  COMPOSITIONAL_FOUNDATION,
  COMPOSITIONAL_PROFILE,
  COMPOSITIONAL_RULE,
  compositionalSourcePackage
};
