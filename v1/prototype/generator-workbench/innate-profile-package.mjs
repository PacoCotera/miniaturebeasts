import { digest } from "./authoring-adapter.mjs";
import { MARKING_CONTENT, MARKING_CATALOGUE, markingFieldPackage } from "./marking-field-package.mjs";

export const INNATE_TARGETS = {
  "cognition.innate-profile-presence": "innate.enabled",
  "cognition.exploration-tendency": "innate.explorationClass",
  "cognition.arousal-threshold": "innate.arousalThreshold",
};
const definitions = [
  {
    id: "cognition.innate-profile-presence", target: "innate.enabled",
    label: "Optional innate profile", operator: "dominant-enable",
    alleles: [{ id: "off", label: "Off", value: false }, { id: "on", label: "On", value: true }],
    requires: [], units: "boolean profile gate",
  },
  {
    id: "cognition.exploration-tendency", target: "innate.explorationClass",
    label: "Exploration tendency", operator: "pair-map",
    alleles: [{ id: "reserved", label: "Reserved", value: "reserved" }, { id: "seeking", label: "Seeking", value: "seeking" }],
    pairMap: { "reserved|reserved": "reserved", "reserved|seeking": "intermediate", "seeking|seeking": "seeking" },
    requires: ["cognition.innate-profile-presence"], units: "provisional inherited tendency class",
  },
  {
    id: "cognition.arousal-threshold", target: "innate.arousalThreshold",
    label: "Reference cue threshold", operator: "copy-mean",
    alleles: [{ id: "low", label: "Low", value: 0.25 }, { id: "high", label: "High", value: 0.75 }],
    bounds: [0.25, 0.75], requires: ["cognition.innate-profile-presence"],
    units: "dimensionless decoded-reference-cue/1 magnitude",
  },
].map((definition) => ({
  ...definition, version: 1, copyCount: 2, status: "validated", family: "cognition-tendencies",
  approval: "provisional-host", outputs: [definition.target],
  purpose: "Optional static inherited data; not intelligence, sensing, brain presence or live behavior.",
}));

export const INNATE_CONTENT = {
  ...MARKING_CONTENT,
  catalogueIdentity: { id: MARKING_CATALOGUE.id, version: 6 },
  ruleVersion: "developmental-compositional-source/6",
  baseline: {
    ...MARKING_CONTENT.baseline, version: 6,
    references: [...MARKING_CONTENT.baseline.references, "innate-response-profile/1"],
  },
};
export const INNATE_CATALOGUE = structuredClone(MARKING_CATALOGUE);
delete INNATE_CATALOGUE.foundationPin;
Object.assign(INNATE_CATALOGUE, INNATE_CONTENT.catalogueIdentity, {
  ruleVersion: INNATE_CONTENT.ruleVersion, baseline: INNATE_CONTENT.baseline,
});
for (const definition of definitions) {
  if (INNATE_CATALOGUE.loci.some((locus) => locus.id === definition.id)) throw new Error(`Duplicate innate locus ${definition.id}`);
  const reference = {
    sourceCatalogue: INNATE_CONTENT.catalogueIdentity,
    file: "innate-profile-package.mjs", export: "INNATE_CATALOGUE.loci",
    locusId: definition.id, recordVersion: definition.version, recordDigest: digest(definition),
  };
  INNATE_CATALOGUE.loci.push(definition);
  INNATE_CATALOGUE.recordSources[definition.id] = [reference];
  INNATE_CATALOGUE.sourceDefinitions.push({ ...reference, definition: structuredClone(definition) });
}
const cognition = INNATE_CATALOGUE.families.find((family) => family.id === "cognition-tendencies");
if (!cognition) throw new Error("Cognition family is missing from the retained eleven-branch index");
cognition.gaps = "Partial static inherited profile only; learning, habits, memories, sensing and live behavior remain unmodeled.";
export const INNATE_FOUNDATION = {
  profile: "compositional-foundation-pin/1", id: INNATE_CATALOGUE.id,
  version: INNATE_CATALOGUE.version, digest: digest(INNATE_CATALOGUE),
};
INNATE_CATALOGUE.foundationPin = INNATE_FOUNDATION;

export function innateProfilePackage() {
  const descriptor = markingFieldPackage();
  const genome = descriptor.defaultGeneration.genome;
  genome.contentVersion = INNATE_CATALOGUE.version;
  Object.assign(genome.loci, {
    "cognition.innate-profile-presence": ["off", "off"],
    "cognition.exploration-tendency": ["reserved", "reserved"],
    "cognition.arousal-threshold": ["low", "high"],
  });
  Object.assign(genome.recordVersions, Object.fromEntries(definitions.map((locus) => [locus.id, locus.version])));
  genome.baselineReferences = structuredClone(INNATE_CONTENT.baseline.references);
  genome.origin = { kind: "authored", baseline: INNATE_CONTENT.baseline.id, baselineVersion: INNATE_CONTENT.baseline.version };
  return { ...descriptor, catalogue: structuredClone(INNATE_CATALOGUE), foundation: INNATE_FOUNDATION };
}
