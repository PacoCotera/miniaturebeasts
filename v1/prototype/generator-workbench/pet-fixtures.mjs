import { familyCases } from "./family-fixtures.mjs";
import { PET_CATALOGUE } from "./pet-catalogue.mjs";
export function petCases() {
  const base = structuredClone(familyCases()[0].genome);
  base.contentId = PET_CATALOGUE.id;
  Object.assign(base.loci, {
    "development.axial-repeat": ["chain", "single"],
    "structure.body-length": ["low", "low"],
    "structure.body-width": ["high", "high"],
    "structure.body-taper": ["low", "low"],
    "structure.ocular-placement": ["low", "high"],
    "structure.leading-width-ratio": ["low", "low"],
    "structure.ocular-size": ["low", "low"],
    "structure.ocular-separation": ["high", "high"],
    "structure.pupil-ratio": ["low", "low"],
    "appearance.covering-scale": ["high", "high"],
    "appearance.covering-extent": ["high", "high"],
  });
  const context = { ...familyCases()[0].context };
  const cases = ["skin", "scales", "fur", "feathers"].map((kind) => {
    const genome = structuredClone(base);
    genome.loci["appearance.covering-kind"] = [kind, kind];
    return {
      name: `pet-${kind}`,
      catalogue: PET_CATALOGUE,
      genome,
      context,
      relationship:
        kind === "skin"
          ? {
              kind: "explicit-authoring-input",
              note: "Compact inherited contributor configuration, not a species preset.",
            }
          : {
              kind: "controlled-copy-edit",
              base: "pet-skin",
              changedLoci: ["appearance.covering-kind"],
            },
    };
  });
  const face = structuredClone(base);
  face.loci["structure.ocular-size"] = ["low", "high"];
  face.loci["structure.pupil-ratio"] = ["high", "high"];
  cases.push({
    name: "pet-face-variant",
    catalogue: PET_CATALOGUE,
    genome: face,
    context,
    relationship: {
      kind: "controlled-copy-edit",
      base: "pet-skin",
      changedLoci: ["structure.ocular-size", "structure.pupil-ratio"],
    },
  });
  return cases;
}
