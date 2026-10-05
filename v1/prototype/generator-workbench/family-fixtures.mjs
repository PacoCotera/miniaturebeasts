import { AUTHORING_CATALOGUE, REFERENCE_CONTEXT } from "./catalogue.mjs";
import { FAMILY_CATALOGUE } from "./family-catalogue.mjs";
import { generateGenome } from "./model.mjs";

// Explicit authoring inputs and copy edits; never species presets inside resolution.
export function familyCases() {
  const base = generateGenome(AUTHORING_CATALOGUE, 7).genome;
  base.contentId = FAMILY_CATALOGUE.id;
  base.contentVersion = FAMILY_CATALOGUE.version;
  base.loci["structure.fin-span"] = ["low", "low"];
  base.loci["structure.join-neck-ratio"] = ["high", "high"];
  base.loci["structure.fin-tip-position"] = ["low", "high"];
  base.loci["structure.ocular-pair"] = ["paired", "paired"];
  base.loci["structure.ocular-placement"] = ["low", "high"];
  base.loci["structure.oral-opening"] = ["on", "on"];
  base.loci["appearance.covering-kind"] = ["skin", "skin"];
  base.loci["appearance.covering-extent"] = ["high", "high"];
  base.loci["appearance.covering-scale"] = ["high", "high"];
  const proportion = structuredClone(base);
  proportion.loci["structure.body-length"] = ["low", "high"];
  proportion.loci["structure.body-taper"] = ["low", "low"];
  proportion.loci["structure.join-neck-ratio"] = ["low", "high"];
  const fins = structuredClone(base);
  fins.loci["structure.fin-span"] = ["low", "high"];
  fins.loci["structure.fin-tip-position"] = ["high", "high"];
  fins.loci["appearance.covering-kind"] = ["scales", "scales"];
  return [
    {
      name: "family-base",
      catalogue: FAMILY_CATALOGUE,
      genome: base,
      context: { ...REFERENCE_CONTEXT, medium: "water" },
      relationship: {
        kind: "explicit-authoring-input",
        note: "Complete pinned copies; not a species preset or owned creature.",
      },
    },
    {
      name: "family-proportion-variant",
      catalogue: FAMILY_CATALOGUE,
      genome: proportion,
      context: { ...REFERENCE_CONTEXT, medium: "water" },
      relationship: {
        kind: "controlled-copy-edit",
        base: "family-base",
        changedLoci: [
          "structure.body-length",
          "structure.body-taper",
          "structure.join-neck-ratio",
        ],
      },
    },
    {
      name: "family-fin-variant",
      catalogue: FAMILY_CATALOGUE,
      genome: fins,
      context: { ...REFERENCE_CONTEXT, medium: "water" },
      relationship: {
        kind: "controlled-copy-edit",
        base: "family-base",
        changedLoci: [
          "structure.fin-span",
          "structure.fin-tip-position",
          "appearance.covering-kind",
        ],
      },
    },
  ];
}
