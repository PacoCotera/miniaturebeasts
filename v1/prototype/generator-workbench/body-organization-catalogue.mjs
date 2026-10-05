import { PIGMENT_CANDIDATE_CATALOGUE } from "./pigment-candidate-catalogue.mjs";
import { GRAPH_COVERING_TARGETS } from "./graph-covering-catalogue.mjs";

export const BODY_ORGANIZATION_RULE = "developmental-regional-growth/1";
export const REGIONAL_GROWTH_FIELDS = Object.freeze({
  even: { length: [1, 1, 1], width: [1, 1, 1] },
  central: { length: [0.2, 0.65, 0.15], width: [0.5, 1, 0.4] },
  anterior: { length: [0.45, 0.35, 0.2], width: [1, 0.7, 0.25] },
});
export const BODY_ORGANIZATION_TARGETS = {
  ...GRAPH_COVERING_TARGETS,
  regionalGrowth: {
    type: "enum",
    values: [
      "even",
      "central",
      "anterior",
      "even-central",
      "even-anterior",
      "central-anterior",
    ],
  },
  joinNeckRatio: { type: "number", min: 0.65, max: 0.95 },
};
export const BODY_ORGANIZATION_CATALOGUE = structuredClone(
  PIGMENT_CANDIDATE_CATALOGUE,
);
BODY_ORGANIZATION_CATALOGUE.id = "genomic-body-organization-experiment";
BODY_ORGANIZATION_CATALOGUE.version = 1;
BODY_ORGANIZATION_CATALOGUE.ruleVersion = BODY_ORGANIZATION_RULE;
const base = BODY_ORGANIZATION_CATALOGUE.loci.find(
  (item) => item.id === "development.axial-repeat",
);
const growth = {
  ...structuredClone(base),
  id: "development.regional-growth",
  label: "Regional growth",
  purpose:
    "Inherited positive regional length and width fields allocate actual body stations before roots and materials; not a body preset.",
  operator: "pair-map",
  alleles: Object.keys(REGIONAL_GROWTH_FIELDS).map((id) => ({
    id,
    label: id,
    value: id,
  })),
  pairMap: {
    "even|even": "even",
    "central|central": "central",
    "anterior|anterior": "anterior",
    "central|even": "even-central",
    "anterior|even": "even-anterior",
    "anterior|central": "central-anterior",
  },
  outputs: ["regionalGrowth"],
  applicability: "axial",
  requires: [
    "development.axial-repeat",
    "structure.body-length",
    "structure.body-width",
    "structure.body-taper",
  ],
  affectedFamilies: [
    "development-longevity",
    "structure",
    "appearance",
    "mechanics-movement",
  ],
  bounds: {
    ...BODY_ORGANIZATION_TARGETS.regionalGrowth,
    unit: "positive sampled regional contributor field",
  },
  visualBinding: { region: "body-stations", output: "regionalGrowth" },
  examples: [
    {
      kind: "valid",
      message:
        "Mixed copies average unnormalized knot fields before length normalization; a single station retains inactive copies.",
    },
    {
      kind: "invalid",
      message:
        "Unknown, nonpositive or missing contributor fields reject; no post-render body repair.",
    },
  ],
};
const join = {
  ...structuredClone(
    BODY_ORGANIZATION_CATALOGUE.loci.find(
      (item) => item.id === "structure.body-width",
    ),
  ),
  id: "structure.join-neck-ratio",
  label: "Join neck ratio",
  purpose:
    "Inherited throat width relative to the smaller adjacent station; single bodies have no join.",
  operator: "copy-mean",
  alleles: [
    { id: "low", label: "Narrower join", value: 0.65 },
    { id: "high", label: "Broader join", value: 0.95 },
  ],
  outputs: ["joinNeckRatio"],
  applicability: "axial",
  requires: [
    "development.axial-repeat",
    "development.regional-growth",
    "structure.body-width",
    "structure.body-taper",
    "structure.axial-spacing",
  ],
  affectedFamilies: ["structure", "appearance"],
  bounds: {
    ...BODY_ORGANIZATION_TARGETS.joinNeckRatio,
    unit: "fraction of adjacent smaller full width",
  },
  visualBinding: { region: "body-joins", output: "joinNeckRatio" },
  examples: [
    {
      kind: "valid",
      message:
        ".65/.95 inherited copies express .8; actual throat is retained in graph-source/2.",
    },
    {
      kind: "invalid",
      message:
        "Out-of-range or inactive multi-station join facts reject; spacing is not shortened.",
    },
  ],
};
BODY_ORGANIZATION_CATALOGUE.loci.push(growth, join);
