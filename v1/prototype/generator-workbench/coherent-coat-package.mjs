import { digest } from "./authoring-adapter.mjs";
import { ROLES_CONTENT, ROLES_CATALOGUE, anatomicalRolesPackage } from "./anatomical-roles-package.mjs";

// Representation-only foundation: every111 locus definition and starting copy
// is retained exactly; only declared operator/profile bindings advance.
export const COAT_CONTENT = {
  ...ROLES_CONTENT,
  catalogueIdentity: { id: ROLES_CATALOGUE.id, version: 4 },
  ruleVersion: "developmental-compositional-source/4",
  constructionProfile: "compositional-source/6",
  materialProfile: "compositional-surface-fields/4",
  referenceProfile: "compositional-reference/6",
  conventions: {
    ...ROLES_CONTENT.conventions,
    ear: { ...ROLES_CONTENT.conventions.ear, widthOverLength: 0.90, bowlDepthOverLength: 0.20, outwardFrontYawRadians: Math.PI / 12 },
    coat: {
      profile: "continuous-owner-facet-mantle/1",
      azimuthCycles: 3, crestRiseFraction: 0.65,
      normalRiseOverPotentialLength: 0.10, tangentLeanOverPotentialLength: 0.35,
      rootsPerOwner: 48, maximumTrianglesPerOwner: 672, maximumTriangles: 4704,
      maximumPolygonsPerOwner: 1344, maximumPolygons: 9408, maximumPolygonVertices: 4,
      coverage: [0, 1], refinement: "one shared-edge four-way subdivision of actual face-fan triangles"
    }
  },
  baseline: {
    ...ROLES_CONTENT.baseline, version: 4,
    references: [...ROLES_CONTENT.baseline.references.filter((reference) =>
      !["concave-auricular-sheet/1", "facet-rooted-coat-cluster/1"].includes(reference)),
    "concave-auricular-sheet/2", "continuous-owner-facet-mantle/1"]
  }
};
export const COAT_CATALOGUE = structuredClone(ROLES_CATALOGUE);
delete COAT_CATALOGUE.foundationPin;
Object.assign(COAT_CATALOGUE, COAT_CONTENT.catalogueIdentity, {
  ruleVersion: COAT_CONTENT.ruleVersion, baseline: COAT_CONTENT.baseline
});
export const COAT_FOUNDATION = {
  profile: "compositional-foundation-pin/1", id: COAT_CATALOGUE.id,
  version: COAT_CATALOGUE.version, digest: digest(COAT_CATALOGUE)
};
COAT_CATALOGUE.foundationPin = COAT_FOUNDATION;

export function coherentCoatPackage() {
  const descriptor = anatomicalRolesPackage();
  const genome = descriptor.defaultGeneration.genome;
  genome.contentVersion = COAT_CATALOGUE.version;
  genome.baselineReferences = structuredClone(COAT_CONTENT.baseline.references);
  genome.origin = { kind: "authored", baseline: COAT_CONTENT.baseline.id, baselineVersion: COAT_CONTENT.baseline.version };
  return { ...descriptor, catalogue: structuredClone(COAT_CATALOGUE), foundation: COAT_FOUNDATION };
}
