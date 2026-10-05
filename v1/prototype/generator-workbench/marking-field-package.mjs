import { digest } from "./authoring-adapter.mjs";
import { COAT_CONTENT, COAT_CATALOGUE, coherentCoatPackage } from "./coherent-coat-package.mjs";

export const MARKING_TARGETS = {
  "appearance.marking-switch": "markings.enabled",
  "appearance.marking-layout": "markings.layout",
  "appearance.marking-extent": "markings.extent",
  "appearance.marking-scale": "markings.scale",
  "appearance.marking-orientation": "markings.orientation",
  "appearance.marking-contrast": "markings.contrast",
};

// New consumer binding only: all111 definitions and starting copies stay exact.
export const MARKING_CONTENT = {
  ...COAT_CONTENT,
  catalogueIdentity: { id: COAT_CATALOGUE.id, version: 5 },
  ruleVersion: "developmental-compositional-source/5",
  constructionProfile: "compositional-source/7",
  materialProfile: "compositional-surface-fields/5",
  referenceProfile: "compositional-reference/7",
  baseline: {
    ...COAT_CONTENT.baseline,
    version: 5,
    references: [...COAT_CONTENT.baseline.references, "primary-local-marking-field/1"],
  },
  markings: {
    profile: "primary-local-marking-field/1",
    ink: "#e8dfc8",
    inkSource: "prototype/generator-workbench/presentation.mjs: diagnostic marking ink",
    patchVertices: 16,
    patchAspect: 0.6,
    maximumLogicalPerOwner: 5,
    maximumLogical: 35,
    maximumPeriodicComponents: 105,
    maximumPolygonsPerOwner: 20160,
    maximumPolygons: 141120,
    maximumPolygonVertices: 20,
    periodicShifts: [-1, 0, 1],
  },
};
export const MARKING_CATALOGUE = structuredClone(COAT_CATALOGUE);
delete MARKING_CATALOGUE.foundationPin;
Object.assign(MARKING_CATALOGUE, MARKING_CONTENT.catalogueIdentity, {
  ruleVersion: MARKING_CONTENT.ruleVersion,
  baseline: MARKING_CONTENT.baseline,
});
export const MARKING_FOUNDATION = {
  profile: "compositional-foundation-pin/1",
  id: MARKING_CATALOGUE.id,
  version: MARKING_CATALOGUE.version,
  digest: digest(MARKING_CATALOGUE),
};
MARKING_CATALOGUE.foundationPin = MARKING_FOUNDATION;

export function markingFieldPackage() {
  const descriptor = coherentCoatPackage();
  const genome = descriptor.defaultGeneration.genome;
  genome.contentVersion = MARKING_CATALOGUE.version;
  genome.baselineReferences = structuredClone(MARKING_CONTENT.baseline.references);
  genome.origin = {
    kind: "authored", baseline: MARKING_CONTENT.baseline.id,
    baselineVersion: MARKING_CONTENT.baseline.version,
  };
  return { ...descriptor, catalogue: structuredClone(MARKING_CATALOGUE), foundation: MARKING_FOUNDATION };
}
