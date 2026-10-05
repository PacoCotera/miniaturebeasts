import { REGIONAL_SCENE_RULE } from "./regional-scene-catalogue.mjs";
import {
  GRAPH_COVERING_RULE_VERSION,
  GRAPH_COVERING_TARGETS,
} from "./graph-covering-catalogue.mjs";
import {
  BODY_ORGANIZATION_RULE,
  BODY_ORGANIZATION_TARGETS,
  REGIONAL_GROWTH_FIELDS,
} from "./body-organization-catalogue.mjs";
import {
  GRAPH_MODULE_RULE_VERSION,
  GRAPH_MODULE_TARGETS,
} from "./graph-module-catalogue.mjs";
import {
  AUTHORING_CATALOGUE,
  CATALOGUE_SCHEMA,
  GENOME_SCHEMA,
  RULE_VERSION,
  TARGETS,
  FAMILY_IDS,
  REFERENCE_CONTEXT,
} from "./catalogue.mjs";
import {
  FAMILY_CATALOGUE,
  FAMILY_RULE_VERSION,
  FAMILY_TARGETS,
} from "./family-catalogue.mjs";
import { constructContinuousFamily } from "./family-construction.mjs";
import {
  PET_CATALOGUE,
  PET_RULE_VERSION,
  PET_TARGETS,
} from "./pet-catalogue.mjs";
import { constructPetFamily } from "./pet-construction.mjs";

export const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const error = (code, path, message, contributors = []) => ({
  code,
  path,
  message,
  contributors,
});
const exactKeys = (value, keys) =>
  isRecord(value) && Object.keys(value).every((key) => keys.includes(key));
const boundedText = (value, maximum = 120) =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const pairKey = (pair) => [...pair].sort().join("|");
const operators = [
  "pair-map",
  "copy-mean",
  "dominant-enable",
  "recessive-enable",
  "partition-map",
];
const applicability = [
  "all",
  "axial",
  "rooted",
  "articulated",
  "two-link",
  "membrane",
  "fin",
  "bilateral",
  "marked",
  "axial-actuator",
  "ocular",
  "scales",
  "covered",
];
const executable = (catalogue) =>
  catalogue.loci.filter((locus) => locus.status === "validated");
const round = (value) => Math.round(value * 1000000) / 1000000;
const stableJson = (value) =>
  Array.isArray(value)
    ? `[${value.map(stableJson).join(",")}]`
    : isRecord(value)
      ? `{${Object.keys(value)
          .sort()
          .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
          .join(",")}}`
      : JSON.stringify(value);

function targetValueValid(target, value, targetSpecs = TARGETS) {
  const spec = targetSpecs[target];
  if (!spec) return false;
  if (spec.type === "boolean") return typeof value === "boolean";
  if (spec.type === "enum") return spec.values.includes(value);
  if (spec.type === "palette")
    return (
      Array.isArray(value) &&
      value.length >= 1 &&
      value.length <= 2 &&
      value.every(
        (color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color),
      )
    );
  return (
    finite(value) &&
    value >= spec.min &&
    value <= spec.max &&
    (spec.type !== "integer" || Number.isInteger(value))
  );
}

export function validateCatalogue(catalogue) {
  const errors = [];
  const petProfile = catalogue?.ruleVersion === PET_RULE_VERSION;
  const familyProfile =
    petProfile || catalogue?.ruleVersion === FAMILY_RULE_VERSION;
  const regionalProfile = [
    BODY_ORGANIZATION_RULE,
    REGIONAL_SCENE_RULE,
  ].includes(catalogue?.ruleVersion);
  const moduleProfile = catalogue?.ruleVersion === GRAPH_MODULE_RULE_VERSION;
  const coveringProfile =
    catalogue?.ruleVersion === GRAPH_COVERING_RULE_VERSION;
  const targetSpecs = regionalProfile
    ? BODY_ORGANIZATION_TARGETS
    : coveringProfile
      ? GRAPH_COVERING_TARGETS
      : moduleProfile
        ? GRAPH_MODULE_TARGETS
        : petProfile
          ? PET_TARGETS
          : familyProfile
            ? FAMILY_TARGETS
            : TARGETS;
  if (
    !exactKeys(catalogue, [
      "schemaVersion",
      "id",
      "version",
      "ruleVersion",
      "families",
      "loci",
      "operators",
      "constructionRules",
      "reproductionContract",
    ]) ||
    catalogue.schemaVersion !== CATALOGUE_SCHEMA
  )
    return {
      valid: false,
      errors: [
        error(
          "catalogue-schema",
          "catalogue",
          "Expected a closed versioned authoring catalogue; class presets are not inputs.",
        ),
      ],
    };
  if (
    !boundedText(catalogue.id, 64) ||
    !Number.isInteger(catalogue.version) ||
    catalogue.version < 1 ||
    ![
      RULE_VERSION,
      FAMILY_RULE_VERSION,
      PET_RULE_VERSION,
      GRAPH_MODULE_RULE_VERSION,
      GRAPH_COVERING_RULE_VERSION,
      BODY_ORGANIZATION_RULE,
      REGIONAL_SCENE_RULE,
    ].includes(catalogue.ruleVersion)
  )
    errors.push(
      error(
        "catalogue-version",
        "catalogue",
        "Known rule version and positive content version required.",
      ),
    );
  if (
    !Array.isArray(catalogue.families) ||
    catalogue.families.length !== FAMILY_IDS.length ||
    FAMILY_IDS.some(
      (id) =>
        catalogue.families.filter((family) => family?.id === id).length !== 1,
    )
  )
    errors.push(
      error(
        "family-coverage",
        "families",
        "All eleven unique families must be represented.",
      ),
    );
  if (
    !Array.isArray(catalogue.loci) ||
    catalogue.loci.length > 80 ||
    catalogue.loci.length < 1
  )
    return {
      valid: false,
      errors: [
        ...errors,
        error(
          "catalogue-loci",
          "loci",
          "One to eighty meaningful locus records required.",
        ),
      ],
    };
  if (
    !Array.isArray(catalogue.operators) ||
    operators.some((operator) => !catalogue.operators.includes(operator)) ||
    catalogue.operators.some((operator) => !operators.includes(operator))
  )
    errors.push(
      error(
        "unsupported-operator",
        "operators",
        "Only the declared operator vocabulary is executable.",
      ),
    );
  const ids = new Set();
  const targets = new Set();
  for (const locus of catalogue.loci) {
    const path = locus?.id ?? "loci";
    if (
      !exactKeys(locus, [
        "id",
        "label",
        "aliases",
        "version",
        "status",
        "approval",
        "family",
        "affectedFamilies",
        "copyCount",
        "alleles",
        "operator",
        "outputs",
        "requires",
        "applicability",
        "bounds",
        "purpose",
        "examples",
        "visualBinding",
        "pairMap",
        "missing",
      ]) ||
      !boundedText(locus.id, 80) ||
      !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/.test(locus.id) ||
      ids.has(locus.id)
    ) {
      errors.push(
        error(
          "locus-id",
          path,
          "Unique namespaced locus IDs and declared fields required.",
        ),
      );
      continue;
    }
    ids.add(locus.id);
    if (
      !boundedText(locus.label) ||
      !boundedText(locus.purpose, 1000) ||
      !Array.isArray(locus.aliases) ||
      locus.aliases.length > 8 ||
      locus.aliases.some((alias) => !boundedText(alias, 80))
    )
      errors.push(
        error(
          "locus-description",
          path,
          "Bounded name, purpose and aliases required.",
        ),
      );
    if (
      !FAMILY_IDS.includes(locus.family) ||
      !Array.isArray(locus.affectedFamilies) ||
      locus.affectedFamilies.some((family) => !FAMILY_IDS.includes(family))
    )
      errors.push(error("locus-family", path, "Unknown dimension family."));
    if (
      !Array.isArray(locus.requires) ||
      locus.requires.length > 12 ||
      locus.requires.some((id) => !boundedText(id, 80))
    )
      errors.push(
        error(
          "locus-dependencies",
          path,
          "Bounded explicit dependency IDs required.",
        ),
      );
    if (
      !Array.isArray(locus.examples) ||
      locus.examples.length === 0 ||
      !isRecord(locus.visualBinding) ||
      !boundedText(locus.visualBinding.region)
    )
      errors.push(
        error(
          "locus-metadata",
          path,
          "Worked examples and visual binding required.",
        ),
      );
    if (
      !["draft", "validated"].includes(locus.status) ||
      locus.copyCount !== 2 ||
      !Number.isInteger(locus.version) ||
      locus.version < 1
    )
      errors.push(
        error(
          "locus-status",
          path,
          "Draft/validated status, positive record version and two-copy proof scheme required.",
        ),
      );
    // Palette partition maps have a finite wider vocabulary; other operators
    // retain the existing four-allele authoring boundary.
    const maximumAlleles =
      locus.status === "validated" &&
      locus.operator === "partition-map" &&
      Array.isArray(locus.outputs) &&
      locus.outputs.length === 1 &&
      targetSpecs[locus.outputs[0]]?.type === "palette"
        ? 10
        : 4;
    if (
      !Array.isArray(locus.alleles) ||
      locus.alleles.length < 1 ||
      locus.alleles.length > maximumAlleles ||
      locus.alleles.some(
        (allele) =>
          !isRecord(allele) ||
          !boundedText(allele.id, 40) ||
          !/^[a-z0-9-]+$/.test(allele.id) ||
          !boundedText(allele.label, 80),
      ) ||
      new Set(locus.alleles.map((allele) => allele.id)).size !==
        locus.alleles.length
    ) {
      errors.push(
        error(
          "allele-definitions",
          path,
          "Unique bounded allele records required.",
        ),
      );
      continue;
    }
    if (locus.status === "draft") {
      if (
        !boundedText(locus.missing, 1000) ||
        !Array.isArray(locus.outputs) ||
        locus.outputs.length
      )
        errors.push(
          error(
            "draft-definition",
            path,
            "Drafts require missing-semantic reasons and no executable outputs.",
          ),
        );
      continue;
    }
    if (
      !operators.includes(locus.operator) ||
      !applicability.includes(locus.applicability) ||
      (!familyProfile &&
        ["ocular", "scales", "covered"].includes(locus.applicability) &&
        !(
          (moduleProfile || coveringProfile || regionalProfile) &&
          locus.applicability === "ocular"
        ) &&
        !(
          (coveringProfile || regionalProfile) &&
          locus.applicability === "scales"
        )) ||
      (!petProfile && locus.applicability === "covered") ||
      locus.outputs?.length !== 1 ||
      !targetSpecs[locus.outputs[0]]
    ) {
      errors.push(
        error(
          "unsupported-locus",
          path,
          "Executable operator, applicability and known target required.",
        ),
      );
      continue;
    }
    const target = locus.outputs[0];
    if (targets.has(target))
      errors.push(
        error(
          "duplicate-target",
          path,
          `Target ${target} already has a direct contributor in this proof.`,
        ),
      );
    targets.add(target);
    if (
      !isRecord(locus.bounds) ||
      locus.bounds.type !== targetSpecs[target].type ||
      locus.bounds.min !== targetSpecs[target].min ||
      locus.bounds.max !== targetSpecs[target].max ||
      JSON.stringify(locus.bounds.values) !==
        JSON.stringify(targetSpecs[target].values)
    )
      errors.push(
        error(
          "target-bounds",
          path,
          "Target-specific bounds cannot silently change the supported operator contract.",
        ),
      );
    if (locus.operator === "copy-mean") {
      if (
        !["number"].includes(targetSpecs[target].type) ||
        locus.alleles.some(
          (allele) => !targetValueValid(target, allele.value, targetSpecs),
        )
      )
        errors.push(
          error(
            "mean-contributions",
            path,
            "Finite declared scalar contributions within target bounds required.",
          ),
        );
    } else if (
      ["dominant-enable", "recessive-enable"].includes(locus.operator)
    ) {
      if (
        targetSpecs[target].type !== "boolean" ||
        locus.alleles.length !== 2 ||
        !locus.alleles.some((allele) => allele.value === false) ||
        !locus.alleles.some((allele) => allele.value === true)
      )
        errors.push(
          error(
            "enable-contributions",
            path,
            "Exactly on/off boolean contributions required.",
          ),
        );
    } else {
      const expected = locus.alleles.flatMap((a, index) =>
        locus.alleles.slice(index).map((b) => pairKey([a.id, b.id])),
      );
      if (
        !isRecord(locus.pairMap) ||
        Object.keys(locus.pairMap).length !== expected.length ||
        expected.some(
          (key) =>
            !Object.hasOwn(locus.pairMap, key) ||
            !targetValueValid(target, locus.pairMap[key], targetSpecs),
        ) ||
        (locus.operator === "partition-map" &&
          targetSpecs[target].type !== "palette")
      )
        errors.push(
          error(
            "pair-map",
            path,
            "Every unordered allele pair needs an exact typed output; unknown maps reject.",
          ),
        );
    }
  }
  for (const target of Object.keys(targetSpecs))
    if (!targets.has(target))
      errors.push(
        error(
          "missing-target",
          target,
          "Complete executable contribution set required.",
        ),
      );
  const nodes = new Map(
    catalogue.loci
      .filter((locus) => isRecord(locus) && boundedText(locus.id, 80))
      .map((locus) => [locus.id, locus]),
  );
  const visited = new Set();
  const active = new Set();
  function visit(id) {
    if (active.has(id)) {
      errors.push(error("dependency-cycle", id, "Cyclic contributors reject."));
      return;
    }
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of Array.isArray(nodes.get(id)?.requires)
      ? nodes.get(id).requires
      : []) {
      if (
        !nodes.has(dependency) ||
        (nodes.get(id).status === "validated" &&
          nodes.get(dependency).status !== "validated")
      )
        errors.push(
          error(
            "unknown-dependency",
            id,
            "Executable dependencies must resolve to executable records.",
          ),
        );
      else visit(dependency);
    }
    active.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);
  if (
    stableJson(catalogue.constructionRules) !==
    stableJson(
      (petProfile
        ? PET_CATALOGUE
        : familyProfile
          ? FAMILY_CATALOGUE
          : AUTHORING_CATALOGUE
      ).constructionRules,
    )
  )
    errors.push(
      error(
        "construction-contract",
        "constructionRules",
        "Pinned construction equations/version/budgets required; new equations require an operator implementation.",
      ),
    );
  if (
    catalogue.reproductionContract?.id !==
      "independent-two-copy-diagnostic/1" ||
    catalogue.reproductionContract.copyCount !== 2
  )
    errors.push(
      error(
        "reproduction-contract",
        "reproductionContract",
        "Only the declared diagnostic inheritance contract is supported.",
      ),
    );
  return { valid: errors.length === 0, errors };
}

export function validateGenome(catalogue, genome, depth = 0) {
  const checked = validateCatalogue(catalogue);
  if (!checked.valid) return checked;
  const errors = [];
  if (
    !exactKeys(genome, [
      "schemaVersion",
      "contentId",
      "contentVersion",
      "loci",
      "origin",
    ]) ||
    genome.schemaVersion !== GENOME_SCHEMA ||
    genome.contentId !== catalogue.id ||
    genome.contentVersion !== catalogue.version ||
    !isRecord(genome.loci)
  )
    return {
      valid: false,
      errors: [
        error(
          "genome-envelope",
          "genome",
          "Complete pinned genome required; class/species selectors and unknown fields reject.",
        ),
      ],
    };
  const definitions = executable(catalogue);
  if (
    Object.keys(genome.loci).length !== definitions.length ||
    Object.keys(genome.loci).some(
      (id) => !definitions.some((locus) => locus.id === id),
    )
  )
    errors.push(
      error(
        "genome-loci",
        "genome.loci",
        "Exactly all executable loci required; drafts do not contribute.",
      ),
    );
  for (const locus of definitions) {
    const copies = genome.loci[locus.id];
    if (
      !Array.isArray(copies) ||
      copies.length !== locus.copyCount ||
      copies.some((copy) => !locus.alleles.some((allele) => allele.id === copy))
    )
      errors.push(
        error(
          "genome-copy",
          locus.id,
          "Correct copy count and declared allele IDs required.",
        ),
      );
  }
  if (
    !exactKeys(genome.origin, [
      "kind",
      "seed",
      "algorithmVersion",
      "parents",
      "transmission",
    ]) ||
    !["experiment", "cross"].includes(genome.origin.kind) ||
    !Number.isInteger(genome.origin.seed) ||
    genome.origin.seed < 0 ||
    genome.origin.seed > 0xffffffff ||
    genome.origin.algorithmVersion !== "mulberry32/1"
  )
    errors.push(
      error(
        "genome-origin",
        "origin",
        "Diagnostic origin and pinned 32-bit seed/algorithm required.",
      ),
    );
  if (genome.origin?.kind === "cross") {
    if (
      depth > 0 ||
      !Array.isArray(genome.origin.parents) ||
      genome.origin.parents.length !== 2 ||
      !isRecord(genome.origin.transmission)
    )
      errors.push(
        error(
          "cross-origin",
          "origin",
          "This bounded cross requires two actual experiment parents and transmitted copies.",
        ),
      );
    else {
      if (
        genome.origin.parents.some(
          (parent) => !validateGenome(catalogue, parent, depth + 1).valid,
        )
      )
        errors.push(
          error(
            "cross-parents",
            "origin.parents",
            "Both recorded parents must be valid experiments in the same content contract.",
          ),
        );
      for (const locus of definitions) {
        const trace = genome.origin.transmission[locus.id];
        if (
          !trace ||
          !Array.isArray(trace.donorIndices) ||
          trace.donorIndices.length !== 2 ||
          trace.donorIndices.some((index) => index !== 0 && index !== 1) ||
          !Array.isArray(trace.copies) ||
          trace.copies.length !== 2 ||
          trace.copies.some(
            (copy, index) =>
              copy !== genome.loci[locus.id]?.[index] ||
              copy !==
                genome.origin.parents[index]?.loci?.[locus.id]?.[
                  trace.donorIndices[index]
                ],
          )
        )
          errors.push(
            error(
              "cross-transmission",
              locus.id,
              "Child copies must match the actual recorded parent donor indices.",
            ),
          );
      }
    }
  }
  return { valid: !errors.length, errors };
}

export function randomStream(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function resolvedCopies(catalogue, genome) {
  const values = {};
  const sources = {};
  for (const locus of executable(catalogue)) {
    const copies = genome.loci[locus.id];
    const contributions = copies.map(
      (copy) => locus.alleles.find((allele) => allele.id === copy).value,
    );
    let value;
    if (locus.operator === "copy-mean")
      value = round(
        contributions.reduce((sum, contribution) => sum + contribution, 0) /
          copies.length,
      );
    else if (locus.operator === "dominant-enable")
      value = contributions.some(Boolean);
    else if (locus.operator === "recessive-enable")
      value = contributions.every(Boolean);
    else value = structuredClone(locus.pairMap[pairKey(copies)]);
    values[locus.outputs[0]] = value;
    sources[locus.outputs[0]] = [locus.id];
  }
  return { values, sources };
}

function applicableTo(kind, value) {
  return (
    kind === "all" ||
    (kind === "axial" && value.axialCount > 1) ||
    (kind === "rooted" && value.attachmentGroups > 0) ||
    (kind === "articulated" && value.attachmentGroups > 0 && value.links > 0) ||
    (kind === "two-link" && value.attachmentGroups > 0 && value.links === 2) ||
    (kind === "membrane" && value.membranes) ||
    (kind === "fin" && value.fins) ||
    (kind === "bilateral" && value.symmetry === "bilateral") ||
    (kind === "marked" && value.markings) ||
    (kind === "axial-actuator" &&
      value.axialActuator &&
      value.axialCount > 1) ||
    (kind === "ocular" && value.ocularPair) ||
    (kind === "scales" && value.coveringKind === "scales") ||
    (kind === "covered" &&
      ["scales", "fur", "feathers"].includes(value.coveringKind))
  );
}

export function evaluateGenome(
  catalogue,
  genome,
  context = REFERENCE_CONTEXT,
  { expressionSeed = null } = {},
) {
  const checked = validateGenome(catalogue, genome);
  if (!checked.valid) return { status: "rejected", errors: checked.errors };
  if (
    !exactKeys(context, ["stage", "condition", "medium", "environment"]) ||
    context.stage !== "adult" ||
    context.condition !== "rested" ||
    context.environment !== "reference" ||
    !["ground", "air", "water"].includes(context.medium)
  )
    return {
      status: "rejected",
      errors: [
        error(
          "unsupported-context",
          "context",
          "Only adult/rested/reference conditions and declared medium are modeled.",
        ),
      ],
    };
  if (
    expressionSeed !== null &&
    (!Number.isInteger(expressionSeed) ||
      expressionSeed < 0 ||
      expressionSeed > 0xffffffff)
  )
    return {
      status: "rejected",
      errors: [
        error(
          "expression-seed",
          "expressionSeed",
          "Null or unsigned 32-bit expression seed required.",
        ),
      ],
    };
  const { values: v, sources } = resolvedCopies(catalogue, genome);
  const errors = [];
  if ((v.links > 0 || v.membranes || v.fins) && v.attachmentGroups === 0)
    errors.push(
      error(
        "unrooted-channel",
        "development.attachment-repeat",
        "Declared linked/membrane/fin channels require actual attachment roots.",
        [
          "development.attachment-repeat",
          "development.articulated-chain",
          "development.membrane-rooting",
          "development.fin-rooting",
        ],
      ),
    );
  if (v.axialActuator && v.axialCount === 1)
    errors.push(
      error(
        "unrooted-deformation",
        "development.axial-deformation",
        "Axial deformation requires more than one resolved volume.",
        ["development.axial-repeat", "development.axial-deformation"],
      ),
    );
  if (errors.length) return { status: "rejected", errors };
  const definitions = executable(catalogue);
  const closure = (ids) => {
    const all = new Set();
    const visit = (id) => {
      if (all.has(id)) return;
      all.add(id);
      for (const dependency of definitions.find((locus) => locus.id === id)
        ?.requires ?? [])
        visit(dependency);
    };
    ids.forEach(visit);
    return [...all];
  };
  const from = (...targets) =>
    closure(targets.flatMap((target) => sources[target] ?? []));
  const facts = definitions.map((locus) => {
    const target = locus.outputs[0];
    const active = applicableTo(locus.applicability, v);
    return {
      id: target,
      locusId: locus.id,
      value: v[target],
      unit: locus.bounds.unit,
      context: context.medium,
      state: active
        ? "expressed"
        : locus.applicability === "marked"
          ? "suppressed"
          : "inactive",
      sources: [locus.id],
      prerequisites: closure(locus.requires),
      copies: [...genome.loci[locus.id]],
    };
  });
  if ([FAMILY_RULE_VERSION, PET_RULE_VERSION].includes(catalogue.ruleVersion))
    return (
      catalogue.ruleVersion === PET_RULE_VERSION
        ? constructPetFamily
        : constructContinuousFamily
    )({
      catalogue,
      context,
      values: v,
      facts,
      from,
      expressionSeed,
      random: randomStream(expressionSeed ?? 0),
    });
  const graph = { nodes: [], edges: [], surfaces: [] };
  const regional = [BODY_ORGANIZATION_RULE, REGIONAL_SCENE_RULE].includes(
    catalogue.ruleVersion,
  );
  const growthActive = regional && v.axialCount > 1;
  let regionalAllocation = null;
  if (regional) {
    const fields = v.regionalGrowth
      .split("-")
      .map((name) => REGIONAL_GROWTH_FIELDS[name]);
    const knots = (channel) =>
      [0, 1, 2].map(
        (index) =>
          fields.reduce((sum, field) => sum + field[channel][index], 0) /
          fields.length,
      );
    const sample = (field, index) => {
      const position = (index / (v.axialCount - 1)) * 2;
      const left = Math.min(1, Math.floor(position));
      return field[left] + (field[left + 1] - field[left]) * (position - left);
    };
    const lengthKnots = knots("length"),
      widthKnots = knots("width");
    const rawLengths = Array.from({ length: v.axialCount }, (_, index) =>
      growthActive ? sample(lengthKnots, index) : 1,
    );
    const rawWidths = Array.from({ length: v.axialCount }, (_, index) =>
      growthActive ? sample(widthKnots, index) : 1,
    );
    const total = rawLengths.reduce((sum, length) => sum + length, 0);
    const maximumWidth = Math.max(...rawWidths);
    const lengthWeights = rawLengths.map((length) => length / total);
    const widths = rawWidths.map((width) => width / maximumWidth);
    const lengths = lengthWeights.map((weight) => v.bodyLength * weight);
    const centers = [0];
    for (let index = 1; index < v.axialCount; index++)
      centers.push(
        centers[index - 1] +
          lengths[index - 1] / 2 +
          v.spacing +
          lengths[index] / 2,
      );
    regionalAllocation = {
      state: growthActive ? "expressed" : "inactive",
      field: v.regionalGrowth,
      lengthKnots,
      widthKnots,
      rawLengths,
      rawWidths,
      lengthWeights,
      widthFactors: widths,
      lengths,
      centers,
      sources: growthActive ? from("regionalGrowth", "spacing") : [],
    };
  }
  const bodySources = from(
    "axialCount",
    "bodyLength",
    "bodyWidth",
    "bodyHeight",
    "taper",
    "spacing",
    "density",
    "axialActuator",
    ...(growthActive ? ["regionalGrowth"] : []),
  );
  for (let index = 0; index < v.axialCount; index++) {
    const width =
      v.bodyWidth *
      (growthActive ? regionalAllocation.widthFactors[index] : 1) *
      (1 - v.taper * Math.abs((index + 0.5) / v.axialCount - 0.5));
    graph.nodes.push({
      id: `volume-${index}`,
      role: "volume",
      position: [
        round(
          regional
            ? regionalAllocation.centers[index]
            : index * (v.bodyLength / v.axialCount + v.spacing),
        ),
        0,
        0,
      ],
      dimensions: [
        round(
          regional
            ? regionalAllocation.lengths[index]
            : v.bodyLength / v.axialCount,
        ),
        round(width),
        v.bodyHeight,
      ],
      material: {
        density: v.density,
        domain: "fictional normalized parameter",
      },
      deformation: v.axialActuator ? "axial-bend" : "none",
      sources: bodySources,
    });
    if (index)
      graph.edges.push({
        id: `axis-${index}`,
        from: `volume-${index - 1}`,
        to: `volume-${index}`,
        role: "connected-volume",
        sources: from(
          "axialCount",
          "spacing",
          "axialActuator",
          ...(growthActive ? ["regionalGrowth"] : []),
        ),
      });
  }
  const copiesAround = v.symmetry === "bilateral" ? 2 : 3;
  for (let group = 0; group < v.attachmentGroups; group++) {
    const volume =
      graph.nodes[
        Math.round(
          (group * (v.axialCount - 1)) / Math.max(1, v.attachmentGroups - 1),
        )
      ];
    const rootU =
      0.4 * v.rootPosition + (0.6 * (group + 1)) / (v.attachmentGroups + 1);
    for (let side = 0; side < copiesAround; side++) {
      const angle =
        v.symmetry === "bilateral"
          ? side === 0
            ? Math.PI / 2
            : -Math.PI / 2
          : (side * 2 * Math.PI) / copiesAround;
      let parent = {
        ...volume,
        position: [
          volume.position[0] + (rootU - 0.5) * volume.dimensions[0],
          volume.position[1],
          volume.position[2],
        ],
      };
      for (let link = 0; link < v.links; link++) {
        const length = link === 0 ? v.proximal : v.distal;
        const node = {
          id: `attachment-${group}-${side}-${link}`,
          role: link === v.links - 1 ? "contact-link" : "link",
          position: [
            round(parent.position[0] + length * 0.3),
            round(parent.position[1] + Math.sin(angle) * length),
            round(
              parent.position[2] +
                Math.cos(angle) * length -
                v.bodyHeight * 0.25,
            ),
          ],
          dimensions: [length, v.contactWidth, v.contactWidth],
          jointRange: v.jointRange,
          sources: from(
            "attachmentGroups",
            "symmetry",
            "links",
            "proximal",
            "distal",
            "jointRange",
            "contactWidth",
            "rootPosition",
            ...(growthActive ? ["regionalGrowth", "spacing"] : []),
          ),
        };
        graph.nodes.push(node);
        graph.edges.push({
          id: `root-${node.id}`,
          from: parent.id,
          to: node.id,
          role: "hinge",
          sources: node.sources,
        });
        parent = node;
      }
      for (const [enabled, role, span] of [
        [v.membranes, "membrane", v.membraneSpan],
        [v.fins, "fin", v.finSpan],
      ]) {
        if (!enabled) continue;
        const node = {
          id: `${role}-${group}-${side}`,
          role,
          position: [
            round(volume.position[0] + (rootU - 0.5) * volume.dimensions[0]),
            round(Math.sin(angle) * span * 0.7),
            round(Math.cos(angle) * span * 0.7),
          ],
          dimensions: [span * 0.6, span, role === "membrane" ? 0.04 : 0.08],
          flexibility: role === "membrane" ? v.membraneFlexibility : null,
          sources: from(
            "attachmentGroups",
            "symmetry",
            "rootPosition",
            role === "membrane" ? "membranes" : "fins",
            role === "membrane" ? "membraneSpan" : "finSpan",
            ...(role === "membrane" ? ["membraneFlexibility"] : []),
            ...(growthActive ? ["regionalGrowth", "spacing"] : []),
          ),
        };
        graph.nodes.push(node);
        graph.edges.push({
          id: `root-${node.id}`,
          from: volume.id,
          to: node.id,
          role: "rooted-surface",
          sources: node.sources,
        });
      }
    }
  }
  if (graph.nodes.length > 64 || graph.edges.length > 128)
    return {
      status: "rejected",
      errors: [
        error(
          "graph-budget",
          "graph",
          "Generated graph exceeds the declared bounded proof budget.",
        ),
      ],
    };
  const random = randomStream(expressionSeed ?? 0);
  const realization = { seed: expressionSeed, parameters: [], markings: [] };
  for (const node of graph.nodes) {
    const palette =
      v.symmetry === "bilateral" && node.role !== "volume"
        ? v.undersidePalette
        : v.bodyPalette;
    const surface = {
      id: `surface-${node.id}`,
      nodeId: node.id,
      region: node.role,
      coordinates: "local normalized u/v on actual node; no chromosome mapping",
      axes:
        v.symmetry === "bilateral"
          ? ["longitudinal", "lateral"]
          : ["local-u", "local-v"],
      palette: [...palette],
      partition:
        palette.length === 2 ? "two declared equal local masks" : "uniform",
      texture: v.texture,
      markings: [],
      sources: from(
        v.symmetry === "bilateral" && node.role !== "volume"
          ? "undersidePalette"
          : "bodyPalette",
        "texture",
        "symmetry",
        "markings",
        ...(v.markings
          ? ["layout", "extent", "markScale", "orientation", "contrast"]
          : []),
      ),
    };
    if (v.markings) {
      const count = Math.max(1, Math.round(v.extent * 10));
      for (let index = 0; index < count; index++) {
        const mark = {
          id: `${surface.id}-mark-${index}`,
          u: round(0.1 + random() * 0.8),
          v: round(0.15 + random() * 0.7),
          scale: v.markScale,
          orientation: v.orientation,
          contrast: v.contrast,
          layout: v.layout,
        };
        surface.markings.push(mark);
        realization.markings.push({ surfaceId: surface.id, ...mark });
      }
    }
    graph.surfaces.push(surface);
  }
  realization.parameters = realization.markings.map(
    ({ surfaceId, u, v: position }) => ({ surfaceId, u, v: position }),
  );
  const load = round(v.bodyLength * v.bodyWidth * v.bodyHeight * v.density);
  const contacts = graph.nodes.filter((node) => node.role === "contact-link");
  const membraneArea = round(
    graph.nodes
      .filter((node) => node.role === "membrane")
      .reduce(
        (area, node) => area + node.dimensions[0] * node.dimensions[1],
        0,
      ),
  );
  const addMotion = (
    id,
    medium,
    structurePresent,
    support,
    mechanism,
    parameters,
    contributors,
    explanation,
  ) => ({
    id,
    medium,
    status: structurePresent && support ? "supported" : "unavailable",
    activeInContext: context.medium === medium && structurePresent && support,
    mechanism,
    parameters,
    sources: from(...contributors),
    reasons: [
      !structurePresent
        ? "Required constructed channel is not present."
        : !support
          ? "Constructed channel fails the declared fictional analytic support guard."
          : explanation,
    ],
    support: {
      domain: "fictional analytic rule; no physics validation",
      loadIndex: load,
      capacity: v.actuatorCapacity,
    },
    costIndex:
      structurePresent && support
        ? round(load * v.cycleRate * v.efficiency)
        : null,
  });
  const reach =
    (v.proximal + (v.links === 2 ? v.distal : 0)) * Math.sin(v.jointRange);
  const motion = [
    addMotion(
      "contact-step-turn",
      "ground",
      contacts.length >= 2,
      v.actuatorCapacity >= load * 0.5,
      "Articulated rooted contacts; phase-coordinated planted stepping and turning",
      {
        contactCount: contacts.length,
        stridePreference: v.stride,
        legalStride: round(Math.min(v.stride, reach)),
        strideReason:
          v.stride > reach
            ? "Preference resolves within the declared reach envelope; genome unchanged."
            : "Preference lies within reach.",
        contactPhase: v.contactPhase,
        cycleRate: v.cycleRate,
        turnControl: v.turnControl,
      },
      [
        "attachmentGroups",
        "links",
        "symmetry",
        "proximal",
        "distal",
        "jointRange",
        "contactPhase",
        "stride",
        "cycleRate",
        "turnControl",
        "actuatorCapacity",
        "efficiency",
        "bodyLength",
        "bodyWidth",
        "bodyHeight",
        "density",
      ],
      "Contact count >= 2 and actuator capacity >= normalized load * 0.5.",
    ),
    addMotion(
      "membrane-lift-turn",
      "air",
      v.membranes && v.symmetry === "bilateral",
      membraneArea * v.membraneCoordination * v.actuatorCapacity >= load * 2,
      "Rooted bilateral membrane deformation with coordinated fictional lift/turn",
      {
        surfaceArea: membraneArea,
        stroke: v.membraneStroke,
        flexibility: v.membraneFlexibility,
        coordination: v.membraneCoordination,
        cycleRate: v.cycleRate,
      },
      [
        "membranes",
        "attachmentGroups",
        "symmetry",
        "membraneSpan",
        "membraneStroke",
        "membraneFlexibility",
        "membraneCoordination",
        "actuatorCapacity",
        "efficiency",
        "cycleRate",
        "bodyLength",
        "bodyWidth",
        "bodyHeight",
        "density",
      ],
      "Constructed membrane area * coordination * actuator capacity >= load * 2.",
    ),
    addMotion(
      "axial-fin-swim-turn",
      "water",
      v.axialCount >= 3 && v.axialActuator && v.fins,
      v.axialAmplitude <= v.bodyWidth / 2 && v.actuatorCapacity >= load,
      "Connected axial bend channels with rooted fin steering; fictional propulsion",
      {
        volumes: v.axialCount,
        amplitude: v.axialAmplitude,
        phase: v.axialPhase,
        steering: v.finSteering,
        cycleRate: v.cycleRate,
      },
      [
        "axialCount",
        "axialActuator",
        "fins",
        "attachmentGroups",
        "bodyWidth",
        "axialAmplitude",
        "axialPhase",
        "finSteering",
        "actuatorCapacity",
        "efficiency",
        "cycleRate",
        "bodyLength",
        "bodyHeight",
        "density",
      ],
      "At least 3 axial volumes with bend/fins; amplitude <= width/2 and capacity >= load.",
    ),
  ];
  facts.push({
    id: "constructed-graph",
    value: {
      volumes: v.axialCount,
      nodes: graph.nodes.length,
      contacts: contacts.length,
      membranes: graph.nodes.filter((node) => node.role === "membrane").length,
      fins: graph.nodes.filter((node) => node.role === "fin").length,
    },
    unit: "actual counts",
    context: context.medium,
    state: "expressed",
    sources: from(
      "axialCount",
      "symmetry",
      "attachmentGroups",
      "links",
      "membranes",
      "fins",
    ),
    prerequisites: [],
  });
  const coverage = catalogue.families.map((family) => ({
    ...family,
    modeledOutputs: definitions
      .filter((locus) => locus.family === family.id)
      .flatMap((locus) => locus.outputs),
    activeContributors: facts
      .filter(
        (fact) =>
          fact.state === "expressed" &&
          catalogue.loci.find((locus) => locus.id === fact.locusId)?.family ===
            family.id,
      )
      .map((fact) => fact.locusId),
    inactiveContributors: facts
      .filter(
        (fact) =>
          fact.state !== "expressed" &&
          catalogue.loci.find((locus) => locus.id === fact.locusId)?.family ===
            family.id,
      )
      .map((fact) => fact.locusId),
    indirectContributors: [
      ...new Set(
        motion
          .filter(
            (item) =>
              item.status === "supported" &&
              ["mechanics-movement", "energy-nutrition"].includes(family.id),
          )
          .flatMap((item) => item.sources)
          .filter(
            (id) =>
              definitions.find((locus) => locus.id === id)?.family !==
              family.id,
          ),
      ),
    ],
    draftRecords: catalogue.loci
      .filter((locus) => locus.family === family.id && locus.status === "draft")
      .map((locus) => locus.id),
  }));
  return {
    status: "resolved",
    ...(regional
      ? {
          sourceRuleVersion: catalogue.ruleVersion,
          ...(catalogue.ruleVersion === REGIONAL_SCENE_RULE
            ? {
                baseGraphRuleVersion: BODY_ORGANIZATION_RULE,
                ocularModuleRuleVersion: "ocular-module/3",
                coveringModuleRuleVersion: "body-covering/2",
              }
            : {}),
          bodyConstructionProfileVersion: "graph-source/2",
          regionalAllocation,
        }
      : {}),
    ...(catalogue.ruleVersion === GRAPH_MODULE_RULE_VERSION
      ? {
          baseGraphRuleVersion: RULE_VERSION,
          ocularModuleRuleVersion: "ocular-module/1",
        }
      : {}),
    ...(catalogue.ruleVersion === GRAPH_COVERING_RULE_VERSION
      ? {
          sourceRuleVersion: GRAPH_COVERING_RULE_VERSION,
          baseGraphRuleVersion: RULE_VERSION,
          ocularModuleRuleVersion: "ocular-module/2",
          coveringModuleRuleVersion: "body-covering/1",
        }
      : {}),
    graph,
    facts,
    motion,
    coverage,
    realization,
    classification: {
      derived: true,
      labels: [
        `${v.symmetry} connected ${v.axialCount}-volume organization`,
        ...motion
          .filter((item) => item.status === "supported")
          .map((item) => `${item.medium}-capable analytic output`),
      ],
      reasons: [
        "Descriptions derive from generated graph and guarded outputs; they do not select anatomy or authorize reproduction.",
      ],
    },
    limitations: [
      "Provisional normalized construction; no physical locomotion validation or finished animation",
      catalogue.ruleVersion === GRAPH_COVERING_RULE_VERSION
        ? "Body covering and ocular facts require their separate module-aware scene consumer; physiology remains unmodeled"
        : catalogue.ruleVersion === GRAPH_MODULE_RULE_VERSION
          ? "Ocular module facts require the separate ocular-module/1 constructor; sensing and mouth anatomy remain unmodeled"
          : "No eyes/mouth or sensing anatomy included in modeled construction; sensing remains unmodeled",
      "No game individual, sample/ownership/incubation/breeding authorization",
      "Lifetime state, learning, nutrition/recovery, epigenetics and incubation effects not simulated",
      "Distributed volume networks, transparency and burst/recovery candidates remain draft",
    ],
  };
}

export function generateGenome(catalogue, seed, { maxAttempts = 128 } = {}) {
  const checked = validateCatalogue(catalogue);
  if (!checked.valid) return { status: "rejected", errors: checked.errors };
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 1024
  )
    return {
      status: "rejected",
      errors: [
        error(
          "generation-options",
          "seed",
          "Unsigned seed and 1–1024 attempts required.",
        ),
      ],
    };
  const random = randomStream(seed);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const genome = {
      schemaVersion: GENOME_SCHEMA,
      contentId: catalogue.id,
      contentVersion: catalogue.version,
      loci: {},
      origin: { kind: "experiment", seed, algorithmVersion: "mulberry32/1" },
    };
    for (const locus of executable(catalogue))
      genome.loci[locus.id] = Array.from(
        { length: locus.copyCount },
        () => locus.alleles[Math.floor(random() * locus.alleles.length)].id,
      );
    const result = evaluateGenome(catalogue, genome, REFERENCE_CONTEXT);
    if (result.status === "resolved")
      return {
        status: "generated",
        genome,
        seed,
        attempts: attempt,
        algorithmVersion: "mulberry32/1",
      };
  }
  return {
    status: "rejected",
    errors: [
      error(
        "generation-exhausted",
        "generation",
        `No valid genotype found in ${maxAttempts} unmodified draws.`,
      ),
    ],
    seed,
    attempts: maxAttempts,
  };
}

export function crossGenomes(catalogue, parentA, parentB, seed) {
  for (const parent of [parentA, parentB]) {
    const checked = validateGenome(catalogue, parent);
    if (!checked.valid) return { status: "rejected", errors: checked.errors };
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff)
    return {
      status: "rejected",
      errors: [error("cross-seed", "seed", "Unsigned seed required.")],
    };
  const random = randomStream(seed);
  const transmission = {};
  const loci = {};
  for (const locus of executable(catalogue)) {
    const donorIndices = [Math.floor(random() * 2), Math.floor(random() * 2)];
    loci[locus.id] = [
      parentA.loci[locus.id][donorIndices[0]],
      parentB.loci[locus.id][donorIndices[1]],
    ];
    transmission[locus.id] = { donorIndices, copies: [...loci[locus.id]] };
  }
  const genome = {
    schemaVersion: GENOME_SCHEMA,
    contentId: catalogue.id,
    contentVersion: catalogue.version,
    loci,
    origin: {
      kind: "cross",
      seed,
      algorithmVersion: "mulberry32/1",
      parents: [structuredClone(parentA), structuredClone(parentB)],
      transmission,
    },
  };
  const result = evaluateGenome(catalogue, genome, REFERENCE_CONTEXT);
  return {
    status: result.status === "resolved" ? "generated" : "rejected",
    genome,
    result,
    errors: result.errors ?? [],
    attempts: 1,
  };
}
