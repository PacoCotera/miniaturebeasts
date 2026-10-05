import { FAMILY_CATALOGUE, FAMILY_TARGETS } from "./family-catalogue.mjs";

export const PET_RULE_VERSION = "continuous-pet/1";
export const PET_TARGETS = {
  ...FAMILY_TARGETS,
  coveringKind: { type: "enum", values: ["skin", "scales", "fur", "feathers"] },
  leadingWidthRatio: { type: "number", min: 1.15, max: 1.5 },
  ocularSize: { type: "number", min: 0.18, max: 0.24 },
  ocularSeparation: { type: "number", min: 0.5, max: 0.65 },
  pupilRatio: { type: "number", min: 0.4, max: 0.7 },
};
export const PET_CATALOGUE = structuredClone(FAMILY_CATALOGUE);
PET_CATALOGUE.id = "genomic-pet-study";
PET_CATALOGUE.ruleVersion = PET_RULE_VERSION;
for (const [id, target, values, purpose, applicability, requires] of [
  [
    "structure.leading-width-ratio",
    "leadingWidthRatio",
    [1.15, 1.5],
    "Leading station half-width relative to its actual neighbor.",
    "all",
    ["structure.body-width", "development.axial-repeat"],
  ],
  [
    "structure.ocular-size",
    "ocularSize",
    [0.18, 0.24],
    "Ocular radius relative to min(leading full width, station length).",
    "ocular",
    ["structure.ocular-pair", "structure.leading-width-ratio"],
  ],
  [
    "structure.ocular-separation",
    "ocularSeparation",
    [0.5, 0.65],
    "Paired ocular lateral center offset relative to leading half-width.",
    "ocular",
    ["structure.ocular-pair", "structure.leading-width-ratio"],
  ],
  [
    "structure.pupil-ratio",
    "pupilRatio",
    [0.4, 0.7],
    "Retained pupil radius relative to its ocular outer radius; no vision model.",
    "ocular",
    ["structure.ocular-pair", "structure.ocular-size"],
  ],
]) {
  const locus = structuredClone(
    FAMILY_CATALOGUE.loci.find(
      (item) => item.id === "structure.join-neck-ratio",
    ),
  );
  Object.assign(locus, {
    id,
    label: id.split(".")[1].replaceAll("-", " "),
    aliases: [],
    purpose,
    alleles: values.map((value, index) => ({
      id: index ? "high" : "low",
      label: index ? "high" : "low",
      value,
    })),
    operator: "copy-mean",
    outputs: [target],
    requires,
    applicability,
    bounds: { ...PET_TARGETS[target], unit: "local construction ratio" },
    visualBinding: {
      region:
        target === "leadingWidthRatio" ? "leading-envelope" : "ocular-module",
      output: target,
    },
    examples: [
      {
        kind: "valid",
        message: "Declared ratios solve actual retained geometry.",
      },
      {
        kind: "invalid",
        message:
          "Impossible containment or overlap rejects; no resizing or relocation after failure.",
      },
    ],
  });
  PET_CATALOGUE.loci.push(locus);
}
const covering = PET_CATALOGUE.loci.find(
  (item) => item.id === "appearance.covering-kind",
);
covering.alleles = PET_TARGETS.coveringKind.values.map((id) => ({
  id,
  label: id,
  value: id,
}));
covering.pairMap = {};
covering.bounds = {
  ...PET_TARGETS.coveringKind,
  unit: "declared body material",
};
for (const [i, a] of PET_TARGETS.coveringKind.values.entries())
  for (const [j, b] of PET_TARGETS.coveringKind.values.entries())
    covering.pairMap[[a, b].sort().join("|")] =
      PET_TARGETS.coveringKind.values[Math.max(i, j)];
covering.purpose =
  "Finite provisional material mapping: feathers > fur > scales > skin; not biological dominance or physiology.";
for (const locus of PET_CATALOGUE.loci.filter((item) =>
  ["coveringExtent", "coveringScale"].includes(item.outputs[0]),
)) {
  locus.applicability = "covered";
  locus.examples = [
    {
      kind: "valid",
      message:
        "Non-skin material roots and size use this actual body-atlas parameter.",
    },
    {
      kind: "invalid",
      message:
        "Empty placement or element budget overflow rejects without truncation.",
    },
  ];
}
for (const locus of PET_CATALOGUE.loci.filter((item) =>
  ["appearance.fur-covering", "appearance.feather-covering"].includes(item.id),
)) {
  const kind = locus.id.includes("fur") ? "fur" : "feather";
  locus.id = `appearance.${kind}-growth-deformation`;
  locus.label = `${kind} live growth/deformation`;
  locus.missing =
    "Static rooted material geometry is executable through covering-kind/extent/scale. Live growth and deformation operators are not modeled.";
  locus.purpose = locus.missing;
}
PET_CATALOGUE.constructionRules = {
  ...PET_CATALOGUE.constructionRules,
  version: PET_RULE_VERSION,
  profile: {
    ...PET_CATALOGUE.constructionRules.profile,
    id: PET_RULE_VERSION,
    finOutline:
      "Two sampled quadratic sides join the retained body chord to the actual tip; leaf profile without added anatomy.",
    finCurveSamples: 6,
    oralPosteriorFraction: 0.32,
    oralWithoutOcularBaseline: 0.5,
    referenceCamera: [-0.5, 2.8, -1.1, 1.1],
    ocularReflection: {
      radiusFraction: 0.18,
      offsetFraction: -0.25,
      pigment: "#ffffff",
      authority: "fixed optical depiction, not a gene or organ",
    },
    fibers: {
      maximumTufts: 64,
      maximumFeathers: 48,
      pitchX: 2.8,
      pitchY: 2.2,
      lengthFraction: 2.4,
      furLengthFraction: 1.4,
      filamentLengths: [1, 0.85, 0.7],
      filamentRootOffsets: [-0.22, 0, 0.22],
      filamentTipOffsets: [-0.28, 0.08, 0.32],
      filamentHalfWidthFraction: 0.12,
      filamentCurveSamples: 4,
      vaneWidthFractions: [0, 0.6, 0.52, 0.26, 0],
      vaneHalfWidthFraction: 0.65,
      barbFractions: [0.25, 0.5, 0.75],
      mapping:
        "Whole element inherits continuous body pigment at retained root local-u; body/scales keep continuous masks.",
      contour:
        "Fur roots at the solved boundary may extend outward; surface elements retain exact outlines. Feathers remain wholly inside body domain.",
    },
  },
};
PET_CATALOGUE.families = PET_CATALOGUE.families.map((family) => ({
  ...family,
  modeledOutputs: PET_CATALOGUE.loci
    .filter(
      (locus) => locus.family === family.id && locus.status === "validated",
    )
    .flatMap((locus) => locus.outputs),
}));
