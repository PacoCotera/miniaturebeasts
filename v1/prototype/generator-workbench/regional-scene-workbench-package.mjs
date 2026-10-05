import { REGIONAL_SCENE_CATALOGUE } from "./regional-scene-catalogue.mjs";
import { bodyOrganizationCases } from "./construct-body-organization-proof.mjs";
// The descriptor loads explicit editable inputs; Generate still samples every copy.
export function regionalSceneWorkbenchPackage() {
  const base = bodyOrganizationCases().find(
    (item) => item.name === "b-taper-fins",
  ).input;
  base.catalogue = structuredClone(REGIONAL_SCENE_CATALOGUE);
  base.genome.contentId = base.catalogue.id;
  base.genome.loci["structure.ocular-pair"] = ["paired", "paired"];
  const examples = ["skin", "scales"].map((kind) => {
    const input = structuredClone(base);
    input.genome.loci["appearance.covering-kind"] = [kind, kind];
    return {
      name: "regional-eyes-" + kind,
      ...input,
      relationship: {
        kind: "controlled-authoring-variant",
        changedLoci: kind === "scales" ? ["appearance.covering-kind"] : [],
      },
    };
  });
  return {
    catalogue: structuredClone(REGIONAL_SCENE_CATALOGUE),
    defaultGeneration: {
      genome: structuredClone(base.genome),
      context: structuredClone(base.context),
      expressionSeed: base.expressionSeed,
    },
    referenceContext: structuredClone(base.context),
    sceneExamples: examples,
  };
}
