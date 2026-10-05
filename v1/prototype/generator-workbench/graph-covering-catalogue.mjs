import {
  GRAPH_MODULE_CATALOGUE,
  GRAPH_MODULE_TARGETS,
} from "./graph-module-catalogue.mjs";

export const GRAPH_COVERING_RULE_VERSION = "developmental-covering/1";
export const GRAPH_COVERING_TARGETS = {
  ...GRAPH_MODULE_TARGETS,
  coveringKind: { type: "enum", values: ["skin", "scales"] },
  coveringExtent: { type: "number", min: 0.35, max: 0.75 },
  coveringScale: { type: "number", min: 0.06, max: 0.12 },
};

const template = GRAPH_MODULE_CATALOGUE.loci.find(
  (locus) => locus.id === "appearance.surface-texture",
);
function coveringContributor(id, target, purpose, requires) {
  const kind = target === "coveringKind";
  const bounds = GRAPH_COVERING_TARGETS[target];
  const locus = {
    ...structuredClone(template),
    id,
    label: id.split(".")[1].replaceAll("-", " "),
    purpose,
    operator: kind ? "pair-map" : "copy-mean",
    alleles: kind
      ? [
          { id: "skin", label: "Skin", value: "skin" },
          { id: "scales", label: "Scales", value: "scales" },
        ]
      : [
          { id: "low", label: "Low", value: bounds.min },
          { id: "high", label: "High", value: bounds.max },
        ],
    ...(kind
      ? {
          pairMap: {
            "skin|skin": "skin",
            "scales|skin": "scales",
            "scales|scales": "scales",
          },
        }
      : {}),
    outputs: [target],
    bounds: {
      ...bounds,
      unit: kind
        ? "declared body covering"
        : target === "coveringExtent"
          ? "body-local longitudinal interval"
          : "plate half-width / resolved bodyWidth",
    },
    applicability: kind ? "all" : "scales",
    requires,
    affectedFamilies: ["appearance"],
    visualBinding: { region: "body-local-covering", output: target },
    examples: [
      {
        kind: "valid",
        message: kind
          ? "Skin retains the original body material and emits no plates; scales constructs exact bounded overlapping footprints."
          : "The expressed value controls a retained field or plate half-size, only when scales is enabled.",
      },
      {
        kind: "invalid",
        message:
          "Empty eligible field, unsupported material or plate-budget overflow rejects without replacement, truncation or repair.",
      },
    ],
  };
  if (!kind) delete locus.pairMap;
  return locus;
}

export const GRAPH_COVERING_CATALOGUE = structuredClone(GRAPH_MODULE_CATALOGUE);
GRAPH_COVERING_CATALOGUE.id = "genomic-covering-study";
GRAPH_COVERING_CATALOGUE.ruleVersion = GRAPH_COVERING_RULE_VERSION;
GRAPH_COVERING_CATALOGUE.loci.push(
  coveringContributor(
    "appearance.covering-kind",
    "coveringKind",
    "Declares skin or overlapping body-local plates, without protection or physiological powers.",
    [],
  ),
  coveringContributor(
    "appearance.covering-extent",
    "coveringExtent",
    "Defines a body-local longitudinal placement interval, not measured exact coverage percentage.",
    [
      "appearance.covering-kind",
      "development.axial-repeat",
      "structure.body-length",
      "structure.body-taper",
      "structure.axial-spacing",
    ],
  ),
  coveringContributor(
    "appearance.covering-scale",
    "coveringScale",
    "Controls plate half-width and overlap pitch relative to the actual resolved bodyWidth.",
    ["appearance.covering-kind", "structure.body-width"],
  ),
);
