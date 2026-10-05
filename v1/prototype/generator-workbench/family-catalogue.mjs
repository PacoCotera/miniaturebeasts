import { AUTHORING_CATALOGUE, TARGETS } from "./catalogue.mjs";

export const FAMILY_RULE_VERSION = "continuous-static/1";
export const FAMILY_TARGETS = {
  ...TARGETS,
  joinNeckRatio: { type: "number", min: 0.35, max: 0.65 },
  finTipPosition: { type: "number", min: 0.35, max: 0.65 },
  ocularPair: { type: "boolean" },
  ocularPlacement: { type: "number", min: 0.35, max: 0.65 },
  oralOpening: { type: "boolean" },
  coveringKind: { type: "enum", values: ["skin", "scales"] },
  coveringExtent: { type: "number", min: 0.35, max: 0.75 },
  coveringScale: { type: "number", min: 0.06, max: 0.12 },
};

function contributor(id, target, purpose, enabled = false) {
  const template = structuredClone(
    AUTHORING_CATALOGUE.loci.find(
      (locus) => locus.id === "structure.body-width",
    ),
  );
  const alleles = enabled
    ? target === "ocularPair"
      ? [
          { id: "absent", label: "absent", value: false },
          { id: "paired", label: "paired", value: true },
        ]
      : [
          { id: "off", label: "off", value: false },
          { id: "on", label: "on", value: true },
        ]
    : [
        { id: "low", label: "low", value: 0.35 },
        { id: "high", label: "high", value: 0.65 },
      ];
  return {
    ...template,
    id,
    label: id.split(".")[1].replaceAll("-", " "),
    purpose,
    operator: enabled ? "dominant-enable" : "copy-mean",
    alleles,
    outputs: [target],
    applicability: "all",
    bounds: {
      ...FAMILY_TARGETS[target],
      unit: enabled ? "declared module presence" : "local construction ratio",
    },
    requires: ["development.axial-repeat", "structure.body-width"],
    affectedFamilies: ["structure", "appearance"],
    visualBinding: {
      region: target.startsWith("ocular")
        ? "leading-ocular-module"
        : target === "oralOpening"
          ? "leading-oral-aperture"
          : target === "finTipPosition"
            ? "exterior-rooted-fins"
            : "joining-tissue",
      output: target,
    },
    examples: [
      {
        kind: "valid",
        message: `${id} contributes ${target} only under this declared continuous construction profile.`,
      },
      {
        kind: "invalid",
        message:
          target.startsWith("ocular") || target === "oralOpening"
            ? "Feature outside the leading envelope or overlapping another feature rejects; no relocation or shrink repair."
            : target === "finTipPosition"
              ? "Root chord outside the body domain rejects; a fin is not clipped or re-rooted."
              : "Unsupported topology or nonpositive neck dimensions reject; no hidden connector repair.",
      },
    ],
  };
}

export const FAMILY_CATALOGUE = structuredClone(AUTHORING_CATALOGUE);
FAMILY_CATALOGUE.id = "genomic-continuous-study";
FAMILY_CATALOGUE.ruleVersion = FAMILY_RULE_VERSION;
FAMILY_CATALOGUE.loci.push(
  contributor(
    "structure.join-neck-ratio",
    "joinNeckRatio",
    "Resolves joining-tissue cross-sections between actual adjacent body stations.",
  ),
  contributor(
    "structure.fin-tip-position",
    "finTipPosition",
    "Resolves the longitudinal tip position of each exterior-rooted fin.",
  ),
  contributor(
    "structure.ocular-pair",
    "ocularPair",
    "Declares zero or two circular ocular feature nodes; sensing remains unmodeled.",
    true,
  ),
  contributor(
    "structure.ocular-placement",
    "ocularPlacement",
    "Places declared ocular features within the leading station's local longitudinal domain.",
  ),
  contributor(
    "structure.oral-opening",
    "oralOpening",
    "Declares a small oral aperture, without nutrition or behavior capability.",
    true,
  ),
);
const ocularPlacement = FAMILY_CATALOGUE.loci.find(
  (locus) => locus.outputs[0] === "ocularPlacement",
);
ocularPlacement.applicability = "ocular";
ocularPlacement.requires.push("structure.ocular-pair");
const finTip = FAMILY_CATALOGUE.loci.find(
  (locus) => locus.outputs[0] === "finTipPosition",
);
finTip.applicability = "fin";
finTip.requires.push(
  "development.fin-rooting",
  "structure.fin-span",
  "structure.attachment-position",
);
const coveringBase = structuredClone(
  AUTHORING_CATALOGUE.loci.find(
    (locus) => locus.id === "appearance.surface-texture",
  ),
);
FAMILY_CATALOGUE.loci.push({
  ...coveringBase,
  id: "appearance.covering-kind",
  label: "Body covering",
  operator: "pair-map",
  alleles: [
    { id: "skin", label: "skin", value: "skin" },
    { id: "scales", label: "scales", value: "scales" },
  ],
  pairMap: {
    "skin|skin": "skin",
    "scales|skin": "scales",
    "scales|scales": "scales",
  },
  outputs: ["coveringKind"],
  bounds: { ...FAMILY_TARGETS.coveringKind, unit: "declared body material" },
  requires: ["structure.join-neck-ratio"],
  applicability: "all",
  purpose:
    "Resolves bare skin or actual overlapping plate geometry on the continuous body atlas; no protection or physiology inferred.",
  visualBinding: { region: "body-covering", output: "coveringKind" },
  examples: [
    {
      kind: "valid",
      message:
        "Skin emits no plates; scales emits bounded retained plate geometry.",
    },
    {
      kind: "invalid",
      message:
        "Unknown coverings and plate-budget overflow reject; no generic texture substitution.",
    },
  ],
});
for (const [id, target, low, high] of [
  ["appearance.covering-extent", "coveringExtent", 0.35, 0.75],
  ["appearance.covering-scale", "coveringScale", 0.06, 0.12],
]) {
  const locus = contributor(
    id,
    target,
    "Contributes retained body-atlas scale geometry only when scales are expressed.",
  );
  Object.assign(locus, {
    family: "appearance",
    affectedFamilies: ["appearance"],
    applicability: "scales",
    operator: "copy-mean",
    alleles: [
      { id: "low", label: "low", value: low },
      { id: "high", label: "high", value: high },
    ],
    requires: ["appearance.covering-kind", "structure.join-neck-ratio"],
    visualBinding: { region: "body-covering", output: target },
    examples: [
      {
        kind: "valid",
        message:
          target === "coveringExtent"
            ? "Scales occupies the declared body-local longitudinal interval; skin leaves this inherited parameter inactive."
            : "Plate size and overlap pitch derive from this value; skin leaves it inactive.",
      },
      {
        kind: "invalid",
        message:
          "Plate budget overflow or no legal body-atlas placement rejects without truncation or generic texture substitution.",
      },
    ],
  });
  FAMILY_CATALOGUE.loci.push(locus);
}
for (const [id, missing] of [
  [
    "appearance.fur-covering",
    "Requires explicit rooted filament count/length/direction, clump geometry, body-local growth field and legal deformation. No fur is executable in this static plate profile.",
  ],
  [
    "appearance.feather-covering",
    "Requires rachis, vane/barb topology, attachment/orientation and body-local atlas/deformation. A feather is not a renamed scale or generic texture.",
  ],
]) {
  const draft = structuredClone(
    AUTHORING_CATALOGUE.loci.find(
      (locus) => locus.id === "appearance.transparency",
    ),
  );
  Object.assign(draft, {
    id,
    label: id.split(".")[1].replaceAll("-", " "),
    missing,
    purpose: missing,
    visualBinding: { region: "unsupported-body-covering" },
  });
  FAMILY_CATALOGUE.loci.push(draft);
}
FAMILY_CATALOGUE.constructionRules = {
  ...FAMILY_CATALOGUE.constructionRules,
  version: FAMILY_RULE_VERSION,
  geometry:
    "Bilateral >=3 axial stations with fins, no articulated limbs or membranes. Bounded smoothstep shoulder/neck sampling preserves extrema without overshoot; neck ratio times smaller neighboring half-width. Elliptical cap samples and shoulder samples form the sole piecewise-linear solved envelope. Fins, face containment and coverings query that same envelope; invalid geometry rejects.",
  profile: {
    id: FAMILY_RULE_VERSION,
    caps: "Retained 16-segment half-ellipse at each terminal station; envelope queries linearly interpolate the same samples.",
    capSegments: 16,
    shoulderSegments: 8,
    shoulderInterpolation:
      "h(t)=3*t*t-2*t*t*t; eight intervals between each neighboring station/neck extremum; no overshoot",
    finChordFraction: 0.5,
    ocularRadiusFraction: 0.12,
    ocularLateralFraction: 0.45,
    oralRadiusFractions: [0.09, 0.12],
    oralLongitudinalFraction: 0.16,
    featureRimClearance: 0.005,
    featurePigment: "#273036",
    ocularOuterPigment: "#f1eddc",
    ocularPupilRatio: 0.55,
    markingPigment: "#e8dfc8",
    featurePigmentAuthority:
      "fixed declared structural-module material; not a pigmentation allele or capability",
    staticView:
      "orthographic XY, X right/Y down; leading station is volume-0 on left",
    referenceCamera: [-0.36, 3, -1.12, 1.12],
    covering: {
      maximumPlates: 128,
      atlasStartU: 0.2,
      pitchX: 1.8,
      pitchY: 1.4,
      halfHeight: 0.7,
      orientation: "overlap along positiveX",
      exclusionClearance: 0.015,
    },
  },
};
FAMILY_CATALOGUE.families = FAMILY_CATALOGUE.families.map((family) => ({
  ...family,
  modeledOutputs: FAMILY_CATALOGUE.loci
    .filter(
      (locus) => locus.family === family.id && locus.status === "validated",
    )
    .flatMap((locus) => locus.outputs),
}));
