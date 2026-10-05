import { AUTHORING_CATALOGUE, TARGETS } from "./catalogue.mjs";

export const GRAPH_MODULE_RULE_VERSION = "developmental-ocular/1";
export const GRAPH_MODULE_TARGETS = {
  ...TARGETS,
  ocularPair: { type: "boolean" },
  ocularPlacement: { type: "number", min: 0.35, max: 0.65 },
  ocularSize: { type: "number", min: 0.18, max: 0.24 },
};

function ocularContributor(id, target, purpose) {
  const presence = target === "ocularPair";
  const bounds = GRAPH_MODULE_TARGETS[target];
  return {
    ...structuredClone(
      AUTHORING_CATALOGUE.loci.find(
        (locus) => locus.id === "structure.body-width",
      ),
    ),
    id,
    label: id.split(".")[1].replaceAll("-", " "),
    purpose,
    operator: presence ? "dominant-enable" : "copy-mean",
    alleles: presence
      ? [
          { id: "absent", label: "Absent", value: false },
          { id: "paired", label: "Paired", value: true },
        ]
      : [
          { id: "low", label: "Low", value: bounds.min },
          { id: "high", label: "High", value: bounds.max },
        ],
    outputs: [target],
    applicability: presence ? "all" : "ocular",
    bounds: {
      ...bounds,
      unit: presence ? "declared module presence" : "leading-domain ratio",
    },
    requires: [
      "development.axial-repeat",
      "structure.body-length",
      "structure.body-width",
      "structure.body-taper",
      "structure.axial-spacing",
      ...(presence ? [] : ["structure.ocular-pair"]),
    ],
    affectedFamilies: ["structure", "appearance"],
    visualBinding: { region: "leading-ocular-module", output: target },
    examples: [
      {
        kind: "valid",
        message: presence
          ? "One paired copy enables two circular features; two absent copies retain no ocular geometry."
          : "The expressed ratio constructs placement or radius within the actual leading volume domain.",
      },
      {
        kind: "invalid",
        message:
          "An enabled pair outside the constructed exterior, overlapping a root or lacking rim clearance rejects without repair.",
      },
    ],
  };
}

export const GRAPH_MODULE_CATALOGUE = structuredClone(AUTHORING_CATALOGUE);
GRAPH_MODULE_CATALOGUE.id = "genomic-ocular-study";
GRAPH_MODULE_CATALOGUE.ruleVersion = GRAPH_MODULE_RULE_VERSION;
GRAPH_MODULE_CATALOGUE.loci.push(
  ocularContributor(
    "structure.ocular-pair",
    "ocularPair",
    "Declares two circular ocular features without sensing or behavioral capability.",
  ),
  ocularContributor(
    "structure.ocular-placement",
    "ocularPlacement",
    "Places the ocular pair in the actual leading volume longitudinal domain.",
  ),
  ocularContributor(
    "structure.ocular-size",
    "ocularSize",
    "Resolves ocular radius from actual leading full width and length.",
  ),
);
