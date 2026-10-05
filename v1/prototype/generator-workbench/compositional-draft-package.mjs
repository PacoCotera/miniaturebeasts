import { digest } from "./authoring-adapter.mjs";
import { VOCABULARY_CATALOGUE, VOCABULARY_FOUNDATION, compositionalVocabularyPackage } from "./compositional-vocabulary-package.mjs";
import { COMPOSITIONAL_DRAFT_SCHEMA, COMPOSITIONAL_DRAFT_ID } from "./compositional-draft-format.mjs";
import { ROLES_CATALOGUE, ROLES_FOUNDATION, anatomicalRolesPackage } from "./anatomical-roles-package.mjs";
import { COAT_CATALOGUE, COAT_FOUNDATION, coherentCoatPackage } from "./coherent-coat-package.mjs";
import { MARKING_CATALOGUE, MARKING_FOUNDATION, markingFieldPackage } from "./marking-field-package.mjs";
import { INNATE_CATALOGUE, INNATE_FOUNDATION, innateProfilePackage } from "./innate-profile-package.mjs";

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}
function closedObject(value, keys, name) {
  requireCondition(value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).every((key) => keys.includes(key)), `Unexpected ${name} fields.`);
}
function same(first, second) {
  if (first === undefined || second === undefined) return first === second;
  return digest(first) === digest(second);
}
function metadataText(value, maximum = 120) {
  return typeof value === "string" && value.length <= maximum;
}
function numericBounds(original) {
  const values = original.alleles.map((allele) => allele.value);
  if (Array.isArray(original.bounds) && original.bounds.length === 2 && original.bounds.every(Number.isFinite)) {
    return original.bounds;
  }
  if (Number.isFinite(original.bounds?.min) && Number.isFinite(original.bounds?.max)) {
    return [original.bounds.min, original.bounds.max];
  }
  return [Math.min(...values), Math.max(...values)];
}
function validateRecord(record, original) {
  closedObject(record, [...Object.keys(original), "aliases", "purpose"], record.id);
  requireCondition(Number.isInteger(record.version) && record.version > original.version,
    `${original.id}: edited definitions require a higher record version.`);
  const editable = ["version", "label", "aliases", "purpose", "alleles", "pairMap"];
  for (const key of Object.keys(original).filter((key) => !editable.includes(key))) {
    requireCondition(same(record[key], original[key]), `${original.id}: ${key} is an immutable consumer contract.`);
  }
  requireCondition(metadataText(record.label) && metadataText(record.purpose ?? "", 2000), `${original.id}: invalid metadata.`);
  if (record.aliases !== undefined) {
    requireCondition(Array.isArray(record.aliases) && record.aliases.length <= 16 &&
      record.aliases.every((alias) => metadataText(alias)), `${original.id}: invalid aliases.`);
  }
  if (original.status === "draft") {
    requireCondition(same(record.alleles, original.alleles) && same(record.pairMap, original.pairMap),
      `${original.id}: a draft has no executable copy contract to edit.`);
    return;
  }
  requireCondition(Array.isArray(record.alleles) && record.alleles.length === original.alleles.length,
    `${original.id}: the original allele IDs and order are required.`);
  const pigment = ["appearance.body-palette", "appearance.underside-palette"].includes(original.id);
  const numeric = original.operator === "copy-mean";
  const bounds = numeric ? numericBounds(original) : null;
  record.alleles.forEach((allele, index) => {
    const baseAllele = original.alleles[index];
    closedObject(allele, Object.keys(baseAllele), `${original.id} allele`);
    for (const key of Object.keys(baseAllele).filter((key) => !["label", "value"].includes(key))) {
      requireCondition(same(allele[key], baseAllele[key]), `${original.id}: allele ${key} is immutable.`);
    }
    requireCondition(metadataText(allele.label), `${original.id}: allele label is invalid.`);
    if (numeric) {
      requireCondition(Number.isFinite(allele.value) && allele.value >= bounds[0] && allele.value <= bounds[1],
        `${original.id}: numeric contribution must stay within original bounds ${bounds.join("–")}.`);
    } else {
      requireCondition(original.alleles.some((candidate) => same(candidate.value, allele.value)),
        `${original.id}: no new categorical or boolean values are supported.`);
    }
    if (pigment) requireCondition(same(allele.value, baseAllele.value), `${original.id}: pigment values remain exact.`);
  });
  const outputs = [];
  for (let first = 0; first < record.alleles.length; first++) {
    for (let second = first; second < record.alleles.length; second++) {
      const pair = [record.alleles[first], record.alleles[second]];
      if (numeric) outputs.push((pair[0].value + pair[1].value) / 2);
      else if (original.operator.endsWith("enable")) {
        requireCondition(pair.every((allele) => typeof allele.value === "boolean"), `${original.id}: boolean copies required.`);
        outputs.push(original.operator === "dominant-enable" ? pair.some((allele) => allele.value) : pair.every((allele) => allele.value));
      } else {
        const key = pair.map((allele) => allele.id).sort().join("|");
        requireCondition(Object.hasOwn(record.pairMap ?? {}, key), `${original.id}: missing pair map ${key}.`);
        requireCondition(Object.values(original.pairMap).some((value) => same(value, record.pairMap[key])),
          `${original.id}: unsupported resolved pair-map value.`);
        outputs.push(record.pairMap[key]);
      }
    }
  }
  if (original.pairMap) {
    requireCondition(same(Object.keys(record.pairMap).sort(), Object.keys(original.pairMap).sort()),
      `${original.id}: exact complete pair-map keys required.`);
  } else requireCondition(record.pairMap === undefined, `${original.id}: unexpected pair map.`);
  if (pigment) requireCondition(same(record.pairMap, original.pairMap), `${original.id}: pigment partitions remain exact.`);
  if (numeric) {
    requireCondition(outputs.every((value) => Number.isFinite(value) && value >= bounds[0] && value <= bounds[1]),
      `${original.id}: copy outcomes leave the original domain.`);
    if (original.id === "anatomy.region-cross-exponent") {
      requireCondition(outputs.every((value) => [2, 3, 4].includes(value)), "Cross-exponent copies must be pair-closed in 2/3/4.");
    }
  }
}

export function compileCompositionalDraft(input) {
  closedObject(input, ["schemaVersion", "parent", "forkId", "revision", "records", "startingCopies", "baselineMetadata", "definitionPin"], "authoring delta");
  const roles = same(input.parent, ROLES_FOUNDATION);
  const coat = same(input.parent, COAT_FOUNDATION);
  const marking = same(input.parent, MARKING_FOUNDATION);
  const innate = same(input.parent, INNATE_FOUNDATION);
  requireCondition(input.schemaVersion === COMPOSITIONAL_DRAFT_SCHEMA && (innate || marking || coat || roles || same(input.parent, VOCABULARY_FOUNDATION)),
    "An exact published catalogue2, catalogue3, catalogue4, catalogue5 or catalogue6 parent pin is required.");
  const baseCatalogue = innate ? INNATE_CATALOGUE : marking ? MARKING_CATALOGUE : coat ? COAT_CATALOGUE : roles ? ROLES_CATALOGUE : VOCABULARY_CATALOGUE;
  requireCondition(Number.isInteger(input.revision) && input.revision > 0, "A positive authored revision is required.");
  requireCondition(typeof input.forkId === "string" && /^[0-9a-f]{16}$/.test(input.forkId), "An explicit16-digit fork identity is required.");
  requireCondition(Array.isArray(input.records) && input.records.length <= baseCatalogue.loci.length,
    "Changed records must be a bounded list.");
  closedObject(input.baselineMetadata, ["label", "description"], "baseline metadata");
  requireCondition(Object.values(input.baselineMetadata).every((value) => metadataText(value, 2000)), "Invalid baseline metadata.");
  const recipe = structuredClone(input);
  delete recipe.definitionPin;
  requireCondition(Buffer.byteLength(JSON.stringify(recipe), "utf8") <= 65536, "Authoring delta exceeds the existing64KiB limit.");
  const catalogue = structuredClone(baseCatalogue);
  delete catalogue.foundationPin;
  catalogue.id = `${COMPOSITIONAL_DRAFT_ID}-${recipe.forkId}`;
  catalogue.version = recipe.revision;
  const changedIds = new Set();
  for (const record of recipe.records) {
    const index = catalogue.loci.findIndex((locus) => locus.id === record.id);
    requireCondition(index >= 0 && !changedIds.has(record.id), "Unknown or duplicate edited locus.");
    changedIds.add(record.id);
    const original = baseCatalogue.loci[index];
    validateRecord(record, original);
    catalogue.loci[index] = structuredClone(record);
    const reference = {
      sourceCatalogue: { id: catalogue.id, version: catalogue.version },
      sourceRecipe: { schemaVersion: COMPOSITIONAL_DRAFT_SCHEMA, digest: digest(recipe) },
      export: "compiledCatalogue.loci",
      locusId: record.id,
      recordVersion: record.version,
      recordDigest: digest(record),
      parentReferences: structuredClone(baseCatalogue.recordSources[record.id])
    };
    catalogue.recordSources[record.id] = [reference];
    catalogue.sourceDefinitions.push({ ...reference, definition: structuredClone(record) });
  }
  const modeled = catalogue.loci.filter((locus) => locus.status === "validated");
  closedObject(recipe.startingCopies, modeled.map((locus) => locus.id), "starting copies");
  requireCondition(Object.keys(recipe.startingCopies).length === modeled.length, `All${modeled.length} starting-copy pairs are required.`);
  for (const locus of modeled) {
    const copies = recipe.startingCopies[locus.id];
    requireCondition(Array.isArray(copies) && copies.length === 2 && copies.every((copy) => locus.alleles.some((allele) => allele.id === copy)),
      `${locus.id}: explicit compatible starting copies are required.`);
  }
  catalogue.authoredFoundation = { parent: recipe.parent, revision: recipe.revision, deltaDigest: digest(recipe),
    baselineMetadata: recipe.baselineMetadata };
  const foundation = { profile: "compositional-authored-foundation/1", id: catalogue.id, version: catalogue.version,
    digest: digest(catalogue) };
  if (input.definitionPin) requireCondition(same(input.definitionPin, foundation), "Authored definition pin differs.");
  catalogue.foundationPin = foundation;
  catalogue.authoredRecipe = { ...recipe, definitionPin: foundation };
  requireCondition(Buffer.byteLength(JSON.stringify(catalogue.authoredRecipe), "utf8") <= 65536,
    "Pinned authoring delta exceeds64KiB. Reduce the edited-definition payload.");
  const descriptor = innate ? innateProfilePackage() : marking ? markingFieldPackage() : coat ? coherentCoatPackage() : roles ? anatomicalRolesPackage() : compositionalVocabularyPackage();
  const genome = descriptor.defaultGeneration.genome;
  genome.contentId = catalogue.id;
  genome.contentVersion = catalogue.version;
  genome.loci = structuredClone(recipe.startingCopies);
  genome.recordVersions = Object.fromEntries(modeled.map((locus) => [locus.id, locus.version]));
  genome.origin = { kind: "authored", baseline: catalogue.baseline.id, authoredFoundation: foundation };
  return { ...descriptor, catalogue, foundation, defaultGeneration: { ...descriptor.defaultGeneration, genome } };
}
