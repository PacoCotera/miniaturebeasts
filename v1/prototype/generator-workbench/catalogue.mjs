export const CATALOGUE_SCHEMA = "critter-catalogue/1";
export const GENOME_SCHEMA = "critter-genome/1";
export const RULE_VERSION = "developmental-analytic/1";
export const REFERENCE_CONTEXT = Object.freeze({
  stage: "adult",
  condition: "rested",
  medium: "ground",
  environment: "reference",
});

export const FAMILY_IDS = [
  "structure",
  "appearance",
  "mechanics-movement",
  "sensing-signaling",
  "cognition-tendencies",
  "energy-nutrition",
  "maintenance-protection",
  "affinities-exposure",
  "development-longevity",
  "reproduction",
  "fantastic-physiology",
];

// These typed targets are the finite executable vocabulary, not species presets.
export const TARGETS = {
  axialCount: { type: "integer", min: 1, max: 5 },
  symmetry: { type: "enum", values: ["bilateral", "radial"] },
  attachmentGroups: { type: "integer", min: 0, max: 3 },
  links: { type: "integer", min: 0, max: 2 },
  membranes: { type: "boolean" },
  fins: { type: "boolean" },
  axialActuator: { type: "boolean" },
  bodyLength: { type: "number", min: 1, max: 1.8 },
  bodyWidth: { type: "number", min: 0.4, max: 0.9 },
  bodyHeight: { type: "number", min: 0.3, max: 0.7 },
  taper: { type: "number", min: 0.1, max: 0.6 },
  spacing: { type: "number", min: 0.15, max: 0.3 },
  rootPosition: { type: "number", min: 0.2, max: 0.7 },
  proximal: { type: "number", min: 0.3, max: 0.65 },
  distal: { type: "number", min: 0.2, max: 0.5 },
  jointRange: { type: "number", min: 0.4, max: 1.2 },
  contactWidth: { type: "number", min: 0.1, max: 0.25 },
  membraneSpan: { type: "number", min: 1, max: 2 },
  membraneFlexibility: { type: "number", min: 0.2, max: 0.7 },
  finSpan: { type: "number", min: 0.2, max: 0.6 },
  density: { type: "number", min: 0.5, max: 1.2 },
  bodyPalette: { type: "palette" },
  undersidePalette: { type: "palette" },
  markings: { type: "boolean" },
  layout: { type: "enum", values: ["bands", "patches", "bands-and-patches"] },
  extent: { type: "number", min: 0.15, max: 0.5 },
  markScale: { type: "number", min: 0.06, max: 0.14 },
  orientation: { type: "number", min: 0, max: 1.57 },
  contrast: { type: "number", min: 0.3, max: 0.8 },
  texture: { type: "enum", values: ["smooth", "fine-ridged"] },
  contactPhase: { type: "number", min: 0.25, max: 0.75 },
  cycleRate: { type: "number", min: 0.6, max: 1.4 },
  stride: { type: "number", min: 0.2, max: 0.5 },
  turnControl: { type: "number", min: 0.3, max: 0.8 },
  axialAmplitude: { type: "number", min: 0.08, max: 0.22 },
  axialPhase: { type: "number", min: 0.4, max: 1.2 },
  membraneStroke: { type: "number", min: 0.3, max: 0.8 },
  membraneCoordination: { type: "number", min: 0.5, max: 1 },
  finSteering: { type: "number", min: 0.2, max: 0.7 },
  actuatorCapacity: { type: "number", min: 0.6, max: 1.5 },
  reserveCapacity: { type: "number", min: 1, max: 2 },
  efficiency: { type: "number", min: 0.6, max: 1 },
};

const label = (id) => id.split(".").at(-1).replaceAll("-", " ");
function definition(id, target, operator, alleles, extra = {}) {
  const namespace = id.split(".")[0];
  const family =
    namespace === "development"
      ? "development-longevity"
      : namespace === "movement"
        ? "mechanics-movement"
        : namespace === "energy"
          ? "energy-nutrition"
          : namespace;
  return {
    id,
    label: label(id),
    aliases: [],
    version: 1,
    status: "validated",
    approval: "provisional-host-proof",
    family,
    affectedFamilies:
      namespace === "development"
        ? [family, "structure", "mechanics-movement", "appearance"]
        : namespace === "structure"
          ? [family, "appearance", "mechanics-movement", "energy-nutrition"]
          : namespace === "movement" && target === "cycleRate"
            ? [family, "energy-nutrition"]
            : namespace === "energy" && target !== "reserveCapacity"
              ? [family, "mechanics-movement"]
              : [family],
    copyCount: 2,
    alleles: alleles.map(([id, value]) => ({
      id,
      label: id.replaceAll("-", " "),
      value,
    })),
    operator,
    outputs: [target],
    requires: [],
    applicability: "all",
    bounds: {
      ...TARGETS[target],
      unit: ["jointRange", "orientation", "axialPhase"].includes(target)
        ? "radians"
        : TARGETS[target].type === "number"
          ? "normalized reference parameter"
          : "categorical",
    },
    purpose: `Contributes ${label(id)} to ${target}; resolved through declared ${operator}.`,
    examples: [
      {
        kind: "valid",
        message: "Both declared copies resolve under the named operator.",
      },
      {
        kind: "invalid",
        message:
          "Unknown copies or values outside the declared target bounds reject.",
      },
    ],
    visualBinding: { region: namespace, output: target },
    ...extra,
  };
}
const mean = (id, target, low, high, applicability = "all", requires = []) =>
  definition(
    id,
    target,
    "copy-mean",
    [
      ["low", low],
      ["high", high],
    ],
    { applicability, requires },
  );
const pair = (id, target, alleles, pairMap, extra = {}) =>
  definition(id, target, "pair-map", alleles, { pairMap, ...extra });
const enable = (id, target, operator = "dominant-enable") =>
  definition(id, target, operator, [
    ["off", false],
    ["on", true],
  ]);
const draft = (id, family, purpose, applicability) => ({
  id,
  label: label(id),
  aliases: [],
  version: 1,
  status: "draft",
  approval: "not-reviewed",
  family,
  affectedFamilies: [family],
  copyCount: 2,
  alleles: [{ id: "candidate", label: "Candidate only", value: null }],
  operator: "not-implemented",
  outputs: [],
  requires: [],
  applicability,
  bounds: null,
  purpose,
  examples: [
    {
      kind: "missing",
      message: "Operator, bounds and causal worked cases require design.",
    },
  ],
  visualBinding: { region: id.split(".")[0], output: null },
  missing: "No executable operator/bounds; excluded from complete genotypes.",
});

const loci = [
  pair(
    "development.axial-repeat",
    "axialCount",
    [
      ["single", 1],
      ["chain", 5],
    ],
    { "single|single": 1, "chain|single": 3, "chain|chain": 5 },
  ),
  pair(
    "development.symmetry",
    "symmetry",
    [
      ["bilateral", "bilateral"],
      ["radial", "radial"],
    ],
    {
      "bilateral|bilateral": "bilateral",
      "bilateral|radial": "bilateral",
      "radial|radial": "radial",
    },
  ),
  pair(
    "development.attachment-repeat",
    "attachmentGroups",
    [
      ["none", 0],
      ["multiple", 3],
    ],
    { "none|none": 0, "multiple|none": 1, "multiple|multiple": 3 },
  ),
  pair(
    "development.articulated-chain",
    "links",
    [
      ["unlinked", 0],
      ["linked", 2],
    ],
    { "unlinked|unlinked": 0, "linked|unlinked": 1, "linked|linked": 2 },
  ),
  enable("development.membrane-rooting", "membranes"),
  enable("development.fin-rooting", "fins"),
  enable("development.axial-deformation", "axialActuator"),
  draft(
    "development.volume-network",
    "development-longevity",
    "Distributed connected volumes without a privileged axis; topology operator unimplemented.",
    "distributed-graph",
  ),
  mean("structure.body-length", "bodyLength", 1, 1.8),
  mean("structure.body-width", "bodyWidth", 0.4, 0.9),
  mean("structure.body-height", "bodyHeight", 0.3, 0.7),
  mean("structure.body-taper", "taper", 0.1, 0.6),
  mean("structure.axial-spacing", "spacing", 0.15, 0.3, "axial", [
    "development.axial-repeat",
  ]),
  mean("structure.attachment-position", "rootPosition", 0.2, 0.7, "rooted", [
    "development.attachment-repeat",
  ]),
  mean("structure.proximal-length", "proximal", 0.3, 0.65, "articulated", [
    "development.articulated-chain",
  ]),
  mean("structure.distal-length", "distal", 0.2, 0.5, "two-link", [
    "development.articulated-chain",
  ]),
  mean("structure.joint-range", "jointRange", 0.4, 1.2, "articulated", [
    "development.articulated-chain",
  ]),
  mean("structure.contact-width", "contactWidth", 0.1, 0.25, "articulated", [
    "development.articulated-chain",
  ]),
  mean("structure.membrane-span", "membraneSpan", 1, 2, "membrane", [
    "development.membrane-rooting",
  ]),
  mean(
    "structure.membrane-flexibility",
    "membraneFlexibility",
    0.2,
    0.7,
    "membrane",
    ["development.membrane-rooting"],
  ),
  mean("structure.fin-span", "finSpan", 0.2, 0.6, "fin", [
    "development.fin-rooting",
  ]),
  mean("structure.material-density", "density", 0.5, 1.2),
  definition(
    "appearance.body-palette",
    "bodyPalette",
    "partition-map",
    [
      ["charcoal", "#465459"],
      ["russet", "#ae674d"],
    ],
    {
      pairMap: {
        "charcoal|charcoal": ["#465459"],
        "charcoal|russet": ["#465459", "#ae674d"],
        "russet|russet": ["#ae674d"],
      },
    },
  ),
  definition(
    "appearance.underside-palette",
    "undersidePalette",
    "partition-map",
    [
      ["cream", "#dfd2ae"],
      ["slate", "#718489"],
    ],
    {
      pairMap: {
        "cream|cream": ["#dfd2ae"],
        "cream|slate": ["#dfd2ae", "#718489"],
        "slate|slate": ["#718489"],
      },
      applicability: "bilateral",
      requires: ["development.symmetry"],
    },
  ),
  enable("appearance.marking-switch", "markings", "recessive-enable"),
  pair(
    "appearance.marking-layout",
    "layout",
    [
      ["bands", "bands"],
      ["patches", "patches"],
    ],
    {
      "bands|bands": "bands",
      "bands|patches": "bands-and-patches",
      "patches|patches": "patches",
    },
    { applicability: "marked", requires: ["appearance.marking-switch"] },
  ),
  mean("appearance.marking-extent", "extent", 0.15, 0.5, "marked", [
    "appearance.marking-switch",
  ]),
  mean("appearance.marking-scale", "markScale", 0.06, 0.14, "marked", [
    "appearance.marking-switch",
  ]),
  mean("appearance.marking-orientation", "orientation", 0, 1.57, "marked", [
    "appearance.marking-switch",
  ]),
  mean("appearance.marking-contrast", "contrast", 0.3, 0.8, "marked", [
    "appearance.marking-switch",
  ]),
  pair(
    "appearance.surface-texture",
    "texture",
    [
      ["smooth", "smooth"],
      ["ridged", "fine-ridged"],
    ],
    {
      "smooth|smooth": "smooth",
      "ridged|smooth": "fine-ridged",
      "ridged|ridged": "fine-ridged",
    },
  ),
  draft(
    "appearance.transparency",
    "appearance",
    "Transmission and layer coverage; no optical/composition operator implemented.",
    "surface",
  ),
  mean("movement.contact-phase", "contactPhase", 0.25, 0.75, "articulated", [
    "development.articulated-chain",
  ]),
  mean("movement.cycle-rate", "cycleRate", 0.6, 1.4),
  mean("movement.stride-preference", "stride", 0.2, 0.5, "articulated", [
    "structure.proximal-length",
    "structure.joint-range",
  ]),
  mean("movement.turn-control", "turnControl", 0.3, 0.8),
  mean(
    "movement.axial-amplitude",
    "axialAmplitude",
    0.08,
    0.22,
    "axial-actuator",
    ["development.axial-deformation"],
  ),
  mean("movement.axial-phase", "axialPhase", 0.4, 1.2, "axial-actuator", [
    "development.axial-deformation",
  ]),
  mean("movement.membrane-stroke", "membraneStroke", 0.3, 0.8, "membrane", [
    "development.membrane-rooting",
  ]),
  mean(
    "movement.membrane-coordination",
    "membraneCoordination",
    0.5,
    1,
    "membrane",
    ["development.membrane-rooting"],
  ),
  mean("movement.fin-steering", "finSteering", 0.2, 0.7, "fin", [
    "development.fin-rooting",
  ]),
  draft(
    "movement.burst-recruitment",
    "mechanics-movement",
    "Burst eligibility requires a legal trajectory primitive beyond this static analytic proof.",
    "supported-actuator",
  ),
  mean("energy.actuator-capacity", "actuatorCapacity", 0.6, 1.5),
  mean("energy.reserve-capacity", "reserveCapacity", 1, 2),
  {
    ...mean("energy.action-efficiency", "efficiency", 0.6, 1),
    label: "Matched-action cost factor",
    purpose:
      "Dimensionless matched-action cost multiplier: 0.6 is cheaper, 1.0 is ordinary cost. It grants no missing capability.",
    bounds: {
      ...TARGETS.efficiency,
      unit: "cost multiplier; lower is cheaper",
    },
  },
  draft(
    "energy.recovery-profile",
    "energy-nutrition",
    "Recovery kinetics and supported conditions are unmodeled; no elapsed-time award.",
    "metabolism",
  ),
  draft(
    "energy.uptake-profile",
    "energy-nutrition",
    "Nutrition sources and assimilation need authored physiology.",
    "metabolism",
  ),
  draft(
    "energy.rest-response",
    "energy-nutrition",
    "Rest/current condition state is separate from inherited capability.",
    "lifetime-state",
  ),
];

export const AUTHORING_CATALOGUE = {
  schemaVersion: CATALOGUE_SCHEMA,
  id: "genomic-development-study",
  version: 1,
  ruleVersion: RULE_VERSION,
  operators: [
    "pair-map",
    "copy-mean",
    "dominant-enable",
    "recessive-enable",
    "partition-map",
  ],
  families: FAMILY_IDS.map((id) => ({
    id,
    status: loci.some(
      (item) => item.family === id && item.status === "validated",
    )
      ? "partial-model"
      : "not-modeled",
    modeledOutputs: loci
      .filter((item) => item.family === id && item.status === "validated")
      .flatMap((item) => item.outputs),
    gaps:
      id === "reproduction"
        ? "Independent two-copy authoring cross only; living reproductive systems unmodeled."
        : id === "fantastic-physiology"
          ? "Not supplied by this content; no hidden power inferred."
          : "Only listed outputs modeled; physiology, development, lifetime/learned states and quantitative performance are not complete.",
  })),
  loci,
  constructionRules: {
    version: RULE_VERSION,
    units: "normalized fictional body units; not physical performance",
    graphLimit: { nodes: 64, edges: 128, surfaces: 128 },
    supportEquations: {
      load: "bodyLength * bodyWidth * bodyHeight * density",
      ground: "contactCount >= 2 && actuatorCapacity >= load * 0.5",
      air: "bilateral membrane roots && spanArea * coordination * actuatorCapacity >= load * 2",
      water:
        "axialCount >= 3 && axialActuator && fins && amplitude <= bodyWidth / 2 && actuatorCapacity >= load",
      cost: "load * cycleRate * efficiency; normalized matched-action index, not metabolism",
    },
    geometry:
      "Connected repeated ellipsoid volumes; bilateral 2 or radial 3 placements. Root u = 0.4 * placement + 0.6 * (group+1)/(groupCount+1). Rooted chains/membranes/fins stay distinct even on a single volume. Joint requests beyond their declared range reject. No mesh collision or fluid solver.",
    expressionVariation:
      "Marking placement in local surface coordinates only; inherited enable/layout/extent stay fixed.",
  },
  reproductionContract: {
    id: "independent-two-copy-diagnostic/1",
    copyCount: 2,
    mechanism:
      "One actual recorded copy from each parent per executable locus; no desired-child retries.",
    status: "authoring-only; no game breeding permission",
  },
};
