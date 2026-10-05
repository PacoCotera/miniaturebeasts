export const CONTENT_VERSION = "pip-proof-v1";
export const CLASS_ID = "critter:pip";

function deepFreeze(value) {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    if (!Object.isFrozen(value)) Object.freeze(value);
  }
  return value;
}

export const REFERENCE_CONTEXT = deepFreeze({
  id: "pip:adult-rested-firm-ground-mild-v1",
  maturity: "adult",
  condition: "healthy-rested",
  medium: "firm-ground",
  environment: "mild",
});

export const DIMENSION_FAMILIES = deepFreeze([
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
]);

export const BASELINE_MODULES = deepFreeze([
  {
    id: "pip.body-plan",
    family: "structure",
    inheritance: "class-invariant",
    value: "Small rounded, flexible-bodied, six-legged terrestrial plan with short jointed legs and claws; no rigid shell, wings, flight, or specialized swimming.",
    requires: [],
  },
  {
    id: "pip.sensing-signaling",
    family: "sensing-signaling",
    inheritance: "fixed-inherited-module",
    value: "Nearby visual-motion and surface-vibration sensing; quiet chirps; frill display only when the crown is present.",
    requires: ["form.crown"],
  },
  {
    id: "pip.innate-tendencies",
    family: "cognition-tendencies",
    inheritance: "fixed-inherited-module",
    value: "Moderate curiosity, caution toward sudden movement, tolerance of familiar individuals, and simple association-learning capacity.",
    requires: [],
  },
  {
    id: "pip.energy-nutrition",
    family: "energy-nutrition",
    inheritance: "fixed-inherited-module",
    value: "Plant-derived nutrition profile, modest energy stores, and recovery between repeated bursts.",
    requires: [],
  },
  {
    id: "pip.maintenance",
    family: "maintenance-protection",
    inheritance: "fixed-inherited-module",
    value: "Minor surface repair; no limb regeneration or implicit armor.",
    requires: [],
  },
  {
    id: "pip.affinity",
    family: "affinities-exposure",
    inheritance: "fixed-inherited-module",
    value: "Preference for mild, shaded, moderately humid settings; numeric thresholds unsupported.",
    requires: [],
  },
  {
    id: "pip.development",
    family: "development-longevity",
    inheritance: "fixed-inherited-module",
    value: "A smaller juvenile develops into the adult form; a juvenile crown is less developed when present. Lifespan and later transformation are unsupported.",
    requires: ["form.crown"],
  },
  {
    id: "pip.reproduction",
    family: "reproduction",
    inheritance: "fixed-inherited-module",
    value: "This proof permits same-version, two-parent, two-copy Pip inheritance only.",
    requires: [],
  },
  {
    id: "pip.fantastic-exclusion",
    family: "fantastic-physiology",
    inheritance: "not-applicable",
    value: "Fantastic physiology is explicitly not applicable to this Pip content version.",
    requires: [],
  },
]);

export const FIXED_LOCI = deepFreeze([
  {
    id: "base.coat",
    family: "appearance",
    copies: 2,
    alleles: ["charcoal"],
    fixedGenotype: ["charcoal", "charcoal"],
    rule: "fixed-value",
    value: "charcoal body",
    requires: [],
  },
  {
    id: "base.ventrum",
    family: "appearance",
    copies: 2,
    alleles: ["cream"],
    fixedGenotype: ["cream", "cream"],
    rule: "fixed-value",
    value: "cream underside",
    requires: [],
  },
  {
    id: "base.eyes",
    family: "appearance",
    copies: 2,
    alleles: ["amber"],
    fixedGenotype: ["amber", "amber"],
    rule: "fixed-value",
    value: "amber eyes",
    requires: [],
  },
]);

export const VARIABLE_LOCI = deepFreeze([
  {
    id: "form.crown",
    family: "structure",
    copies: 2,
    alleles: ["C", "c"],
    rule: "dominant-presence",
    dominant: "C",
    output: "soft crown frill",
    unexpressed: "no crown frill",
    requires: ["pip.body-plan"],
  },
  {
    id: "appearance.rings",
    family: "appearance",
    copies: 2,
    alleles: ["R", "r"],
    rule: "dominant-presence",
    dominant: "R",
    output: "pale eye rings",
    unexpressed: "plain amber eyes",
    requires: ["base.eyes"],
  },
  {
    id: "appearance.markings",
    family: "appearance",
    copies: 2,
    alleles: ["P", "p"],
    rule: "recessive-presence",
    recessive: "p",
    output: "pale body markings",
    unexpressed: "no pale body markings",
    requires: ["base.coat"],
  },
  {
    id: "movement.drive",
    family: "mechanics-movement",
    copies: 2,
    alleles: ["M", "m"],
    rule: "dominant-presence",
    dominant: "M",
    output: "short burst movement",
    unexpressed: "steady movement only",
    requires: ["pip.body-plan", "pip.energy-nutrition"],
  },
  {
    id: "movement.efficiency",
    family: "energy-nutrition",
    copies: 2,
    alleles: ["E", "e"],
    rule: "dominant-efficiency",
    dominant: "E",
    output: "lower energy cost for the same supported locomotor action than ee",
    unexpressed: "baseline energy cost for supported locomotor action",
    requires: ["pip.energy-nutrition", "movement.drive"],
  },
]);

export const REQUIRED_FACTS = deepFreeze([
  ...BASELINE_MODULES.map(({ id }) => `module:${id}`),
  ...FIXED_LOCI.map(({ id }) => `locus:${id}`),
  ...VARIABLE_LOCI.map(({ id }) => `locus:${id}`),
]);

export const PIP_SAMPLE = deepFreeze({
  id: "sample:pip-reference-v1",
  contentVersion: CONTENT_VERSION,
  classId: CLASS_ID,
  // These are the only two full configurations this authored sample supports.
  // The list is deliberately separate from the researcher's partial knowledge.
  supportedCandidates: Object.freeze([
    Object.freeze({ id: "reference-carried-p", genotypes: Object.freeze({
      "form.crown": ["C", "c"],
      "appearance.rings": ["R", "r"],
      "appearance.markings": ["P", "p"],
      "movement.drive": ["M", "m"],
      "movement.efficiency": ["E", "e"],
    }) }),
    Object.freeze({ id: "reference-expressed-p", genotypes: Object.freeze({
      "form.crown": ["C", "c"],
      "appearance.rings": ["R", "r"],
      "appearance.markings": ["p", "p"],
      "movement.drive": ["M", "m"],
      "movement.efficiency": ["E", "e"],
    }) }),
  ]),
  requiredFacts: REQUIRED_FACTS,
});

export const PIP_CONTENT = deepFreeze({
  id: CLASS_ID,
  version: CONTENT_VERSION,
  compatibility: Object.freeze([CLASS_ID]),
  families: DIMENSION_FAMILIES,
  context: REFERENCE_CONTEXT,
  baselineModules: BASELINE_MODULES,
  fixedLoci: FIXED_LOCI,
  variableLoci: VARIABLE_LOCI,
  requiredFacts: REQUIRED_FACTS,
});
