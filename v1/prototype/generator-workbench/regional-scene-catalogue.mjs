import { BODY_ORGANIZATION_CATALOGUE } from "./body-organization-catalogue.mjs";
export const REGIONAL_SCENE_RULE = "developmental-regional-scene/1";
export const REGIONAL_SCENE_CATALOGUE = structuredClone(
  BODY_ORGANIZATION_CATALOGUE,
);
REGIONAL_SCENE_CATALOGUE.id = "genomic-regional-scene-experiment";
REGIONAL_SCENE_CATALOGUE.ruleVersion = REGIONAL_SCENE_RULE;
for (const locus of REGIONAL_SCENE_CATALOGUE.loci) {
  if (
    [
      "ocularPlacement",
      "ocularSize",
      "coveringExtent",
      "coveringScale",
    ].includes(locus.outputs[0])
  ) {
    locus.requires = [
      ...new Set([
        ...locus.requires,
        "development.regional-growth",
        "structure.join-neck-ratio",
      ]),
    ];
  }
}
