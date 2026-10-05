import {
  BASELINE_MODULES,
  CLASS_ID,
  CONTENT_VERSION,
  DIMENSION_FAMILIES,
  FIXED_LOCI,
  PIP_CONTENT,
  REFERENCE_CONTEXT,
  VARIABLE_LOCI,
} from "./content.mjs";

const SUPPORTED_RULES = new Set([
  "fixed-value",
  "dominant-presence",
  "recessive-presence",
  "dominant-efficiency",
]);

const locusDefinitions = (content) => [...content.fixedLoci, ...content.variableLoci];
const sourcePath = (...parts) => parts.join(".");
const failure = (errors) => ({ valid: false, errors });

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function exactRecords(records, reference, fields) {
  if (records.length !== reference.length) return false;
  const byId = new Map(records.filter((record) => record && typeof record === "object").map((record) => [record.id, record]));
  return reference.every((expected) => {
    const actual = byId.get(expected.id);
    return actual && fields.every((field) => JSON.stringify(actual[field]) === JSON.stringify(expected[field]));
  });
}

export function validateContent(content = PIP_CONTENT) {
  const errors = [];
  if (!content || typeof content !== "object") {
    return failure([{ code: "invalid-content", path: "content", message: "Content must be an object." }]);
  }
  if (!content.id || !content.version) {
    addError(errors, "missing-content-identity", "content", "Content id and version are required.");
  }
  if (!Array.isArray(content.compatibility) || !content.compatibility.includes(content.id)) {
    addError(errors, "missing-self-compatibility", "content.compatibility", "The class must declare compatibility with itself.");
  }
  for (const field of ["families", "baselineModules", "fixedLoci", "variableLoci", "requiredFacts"]) {
    if (!Array.isArray(content[field])) {
      addError(errors, "missing-array", `content.${field}`, `${field} must be an array.`);
    }
  }
  if (errors.length) return failure(errors);

  const allLoci = locusDefinitions(content);
  const allRecords = [...content.baselineModules, ...allLoci];
  const ids = new Set();
  for (const [index, record] of allRecords.entries()) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      addError(errors, "invalid-record", `content.records[${index}]`, "Every module and locus must be an object record.");
      continue;
    }
    const path = record.id ?? `content.records[${index}]`;
    if (!record.id) {
      addError(errors, "missing-id", path, "Every module and locus needs an id.");
    } else if (ids.has(record.id)) {
      addError(errors, "duplicate-id", path, `Duplicate content id: ${record.id}.`);
    } else {
      ids.add(record.id);
    }
    if (!content.families.includes(record.family)) {
      addError(errors, "unknown-family", `${path}.family`, `Unknown dimension family: ${record.family}.`);
    }
    if (!Array.isArray(record.requires) || record.requires.some((dependency) => typeof dependency !== "string")) {
      addError(errors, "missing-requirements", `${path}.requires`, "Dependencies must be listed explicitly.");
    }
  }

  const nodes = new Map(allRecords.filter((record) => record?.id).map((record) => [record.id, record]));
  for (const record of allRecords) {
    for (const [index, dependency] of (Array.isArray(record?.requires) ? record.requires : []).entries()) {
      if (!nodes.has(dependency)) {
        addError(errors, "unknown-reference", `${record.id}.requires[${index}]`, `Unknown dependency: ${dependency}.`);
      }
    }
  }

  const visited = new Set();
  const active = new Set();
  function visit(id, ancestry = []) {
    if (active.has(id)) {
      addError(errors, "dependency-cycle", id, `Dependency cycle: ${[...ancestry, id].join(" -> ")}.`);
      return;
    }
    if (visited.has(id) || !nodes.has(id)) return;
    active.add(id);
    for (const dependency of Array.isArray(nodes.get(id).requires) ? nodes.get(id).requires : []) visit(dependency, [...ancestry, id]);
    active.delete(id);
    visited.add(id);
  }
  for (const id of nodes.keys()) visit(id);

  for (const [index, module] of content.baselineModules.entries()) {
    const path = `baselineModules[${index}]`;
    if (!module || typeof module !== "object" || Array.isArray(module)) continue;
    if (!["class-invariant", "fixed-inherited-module", "not-applicable"].includes(module.inheritance)) {
      addError(errors, "unknown-module-inheritance", `${path}.inheritance`, `Unsupported module inheritance: ${module.inheritance}.`);
    }
    if (typeof module.value !== "string" || module.value.length === 0) {
      addError(errors, "missing-module-value", `${path}.value`, "Baseline module value must be explicit.");
    }
  }

  for (const [index, locus] of allLoci.entries()) {
    if (!locus || typeof locus !== "object" || Array.isArray(locus)) continue;
    const path = `loci[${index}]`;
    if (locus.copies !== 2) addError(errors, "unsupported-copy-count", `${path}.copies`, "The Pip proof supports exactly two copies per locus.");
    const validAlleles = Array.isArray(locus.alleles) && locus.alleles.length > 0 && locus.alleles.every((allele) => typeof allele === "string" && allele.length > 0) && new Set(locus.alleles).size === locus.alleles.length;
    if (!validAlleles) {
      addError(errors, "invalid-alleles", `${path}.alleles`, "Alleles must be a nonempty unique list.");
    }
    if (!SUPPORTED_RULES.has(locus.rule)) addError(errors, "unsupported-rule", `${path}.rule`, `Unsupported expression rule: ${locus.rule}.`);
    if (locus.rule === "fixed-value") {
      if (!Array.isArray(locus.fixedGenotype) || locus.fixedGenotype.length !== 2) {
        addError(errors, "invalid-fixed-genotype", `${path}.fixedGenotype`, "Fixed loci need an explicit two-copy genotype.");
      }
      if (typeof locus.value !== "string" || !locus.value) addError(errors, "missing-rule-output", `${path}.value`, "Fixed-value loci need an explicit output value.");
    }
    if (locus.rule !== "fixed-value" && validAlleles && locus.alleles.length !== 2) {
      addError(errors, "invalid-variable-alleles", `${path}.alleles`, "Variable Pip loci need exactly two declared alleles.");
    }
    for (const allele of locus.fixedGenotype ?? []) {
      if (!locus.alleles?.includes(allele)) addError(errors, "invalid-fixed-allele", `${path}.fixedGenotype`, `Fixed genotype contains undeclared allele ${allele}.`);
    }
    if (locus.rule === "dominant-presence" || locus.rule === "dominant-efficiency") {
      if (!validAlleles || !locus.alleles.includes(locus.dominant)) addError(errors, "invalid-rule-allele", `${path}.dominant`, "Dominant rules need an explicitly declared dominant allele.");
      if (typeof locus.output !== "string" || !locus.output || typeof locus.unexpressed !== "string" || !locus.unexpressed) {
        addError(errors, "missing-rule-output", `${path}`, "Dominant rules need explicit expressed and unexpressed outputs.");
      }
    }
    if (locus.rule === "recessive-presence") {
      if (!validAlleles || !locus.alleles.includes(locus.recessive)) addError(errors, "invalid-rule-allele", `${path}.recessive`, "Recessive rules need an explicitly declared recessive allele.");
      if (typeof locus.output !== "string" || !locus.output || typeof locus.unexpressed !== "string" || !locus.unexpressed) {
        addError(errors, "missing-rule-output", `${path}`, "Recessive rules need explicit expressed and unexpressed outputs.");
      }
    }
  }

  // These operators are deliberately Pip-specific. Keep the version pinned to
  // the exact definitions understood by the handwritten expression engine.
  if (content.id === CLASS_ID && content.version === CONTENT_VERSION) {
    const moduleFields = ["family", "inheritance", "value", "requires"];
    const fixedFields = ["family", "copies", "alleles", "fixedGenotype", "rule", "value", "requires"];
    const variableFields = ["family", "copies", "alleles", "rule", "dominant", "recessive", "output", "unexpressed", "requires"];
    if (!exactRecords(content.baselineModules, BASELINE_MODULES, moduleFields)
      || !exactRecords(content.fixedLoci, FIXED_LOCI, fixedFields)
      || !exactRecords(content.variableLoci, VARIABLE_LOCI, variableFields)
      || JSON.stringify(content.context) !== JSON.stringify(REFERENCE_CONTEXT)) {
      addError(errors, "pinned-content-mismatch", "content", "This version is pinned to its authored Pip definitions and reference context.");
    }
  }

  const representedFamilies = new Set(allRecords.filter((record) => record && typeof record === "object").map((record) => record.family));
  for (const family of DIMENSION_FAMILIES) {
    if (!content.families.includes(family) || !representedFamilies.has(family)) {
      addError(errors, "missing-family-coverage", `families.${family}`, `No explicit Pip source covers ${family}.`);
    }
  }

  const knownFacts = new Set([
    ...content.baselineModules.filter((record) => record && typeof record === "object").map(({ id }) => `module:${id}`),
    ...allLoci.filter((record) => record && typeof record === "object").map(({ id }) => `locus:${id}`),
  ]);
  for (const [index, fact] of content.requiredFacts.entries()) {
    if (!knownFacts.has(fact)) addError(errors, "unknown-required-fact", `requiredFacts[${index}]`, `No content source exists for ${fact}.`);
  }
  if (new Set(content.requiredFacts).size !== content.requiredFacts.length) {
    addError(errors, "duplicate-required-fact", "requiredFacts", "Required facts must be unique.");
  }
  const missingFacts = [...knownFacts].filter((fact) => !content.requiredFacts.includes(fact));
  for (const fact of missingFacts) addError(errors, "missing-required-fact", "requiredFacts", `Required fact manifest omits ${fact}.`);

  return errors.length ? failure(errors) : { valid: true, errors: [] };
}

function normalizePair(pair) {
  return [...pair].sort((left, right) => {
    if (left === right) return 0;
    if (String(left).toLocaleLowerCase() === String(right).toLocaleLowerCase()) {
      return String(left) === String(left).toLocaleUpperCase() ? -1 : 1;
    }
    return String(left).localeCompare(String(right));
  });
}

export function validateGenome(genome, content = PIP_CONTENT) {
  const errors = [];
  if (!genome || typeof genome !== "object") return failure([{ code: "invalid-genome", path: "genome", message: "Genome must be an object." }]);
  if (genome.classId !== content.id) addError(errors, "class-mismatch", "genome.classId", `Expected ${content.id}.`);
  if (genome.contentVersion !== content.version) addError(errors, "version-mismatch", "genome.contentVersion", `Expected ${content.version}.`);
  if (!Array.isArray(genome.baselineModules)) addError(errors, "missing-baseline", "genome.baselineModules", "Baseline module references are required.");
  if (!genome.genotypes || typeof genome.genotypes !== "object" || Array.isArray(genome.genotypes)) {
    addError(errors, "missing-genotypes", "genome.genotypes", "Locus copies are required.");
    return failure(errors);
  }

  const expectedModules = content.baselineModules.map(({ id }) => id).sort();
  const suppliedModules = [...(genome.baselineModules ?? [])].sort();
  if (expectedModules.join("|") !== suppliedModules.join("|")) {
    addError(errors, "baseline-mismatch", "genome.baselineModules", "Genome must name the complete exact baseline module set.");
  }

  const loci = locusDefinitions(content);
  const expectedLoci = new Set(loci.map(({ id }) => id));
  for (const id of Object.keys(genome.genotypes)) {
    if (!expectedLoci.has(id)) addError(errors, "unknown-locus", `genome.genotypes.${id}`, `Unknown locus ${id}.`);
  }
  for (const locus of loci) {
    const path = `genome.genotypes.${locus.id}`;
    const pair = genome.genotypes[locus.id];
    if (!Array.isArray(pair)) {
      addError(errors, "missing-locus", path, "Every required locus needs an explicit copy pair.");
      continue;
    }
    if (pair.length !== locus.copies) {
      addError(errors, "wrong-copy-count", path, `Expected ${locus.copies} copies; received ${pair.length}.`);
      continue;
    }
    for (const [copyIndex, allele] of pair.entries()) {
      if (!locus.alleles.includes(allele)) addError(errors, "unknown-allele", `${path}[${copyIndex}]`, `Undeclared allele ${allele}.`);
    }
    if (locus.rule === "fixed-value" && normalizePair(pair).join("|") !== normalizePair(locus.fixedGenotype).join("|")) {
      addError(errors, "fixed-locus-mismatch", path, "Fixed baseline allele copies do not match this content version.");
    }
  }
  return errors.length ? failure(errors) : { valid: true, errors: [] };
}

export function makeGenome(variableGenotypes, content = PIP_CONTENT) {
  if (!variableGenotypes || typeof variableGenotypes !== "object" || Array.isArray(variableGenotypes)) {
    return failure([{ code: "invalid-genotypes", path: "genotypes", message: "Variable genotype pairs must be an object." }]);
  }
  const expected = new Set(content.variableLoci.map(({ id }) => id));
  const errors = [];
  for (const id of expected) {
    if (!Object.hasOwn(variableGenotypes, id)) addError(errors, "missing-locus", `genotypes.${id}`, "Variable locus is required.");
  }
  for (const id of Object.keys(variableGenotypes)) {
    if (!expected.has(id)) addError(errors, "unexpected-locus", `genotypes.${id}`, "Only the five declared variable loci belong here.");
  }
  if (errors.length) return failure(errors);

  const genotypes = Object.fromEntries(content.fixedLoci.map((locus) => [locus.id, [...locus.fixedGenotype]]));
  for (const locus of content.variableLoci) genotypes[locus.id] = [...(variableGenotypes[locus.id] ?? [])];
  const genome = {
    classId: content.id,
    contentVersion: content.version,
    baselineModules: content.baselineModules.map(({ id }) => id),
    genotypes,
  };
  const checked = validateGenome(genome, content);
  return checked.valid ? { valid: true, genome } : checked;
}

function genotypeCombinations(alleles) {
  const pairs = [];
  for (let first = 0; first < alleles.length; first += 1) {
    for (let second = first; second < alleles.length; second += 1) pairs.push([alleles[first], alleles[second]]);
  }
  return pairs;
}

export function enumerateGenotypes(content = PIP_CONTENT) {
  const contentValidation = validateContent(content);
  if (!contentValidation.valid) return contentValidation;
  let combinations = [{}];
  for (const locus of content.variableLoci) {
    const pairs = genotypeCombinations(locus.alleles);
    combinations = combinations.flatMap((partial) => pairs.map((pair) => ({ ...partial, [locus.id]: pair })));
  }
  const genomes = combinations.map((pairs) => makeGenome(pairs, content));
  const invalid = genomes.find((candidate) => !candidate.valid);
  return invalid ?? { valid: true, genomes: genomes.map(({ genome }) => genome) };
}

export function validateFounderSupport(sample, content = PIP_CONTENT) {
  const contentCheck = validateContent(content);
  if (!contentCheck.valid) return failure(contentCheck.errors);
  const errors = [];
  if (!sample || sample.classId !== content.id || sample.contentVersion !== content.version) {
    return failure([{ code: "sample-content-mismatch", path: "sample", message: "Sample class and content version must match." }]);
  }
  if (!Array.isArray(sample.supportedCandidates) || sample.supportedCandidates.length === 0) {
    addError(errors, "empty-founder-support", "sample.supportedCandidates", "Sample must explicitly support at least one candidate.");
  }
  if (!Array.isArray(sample.requiredFacts) || sample.requiredFacts.length === 0) {
    addError(errors, "missing-requirements", "sample.requiredFacts", "Sample completeness requirements must be explicit.");
  }
  const knownFacts = new Set(content.requiredFacts);
  const sampleFacts = new Set(Array.isArray(sample.requiredFacts) ? sample.requiredFacts : []);
  for (const fact of knownFacts) {
    if (!sampleFacts.has(fact)) addError(errors, "incomplete-sample-manifest", "sample.requiredFacts", `Sample completeness requirements omit ${fact}.`);
  }
  for (const [index, fact] of (sample.requiredFacts ?? []).entries()) {
    if (!knownFacts.has(fact)) addError(errors, "unsupported-sample-fact", `sample.requiredFacts[${index}]`, `Fact ${fact} is not declared by the content.`);
  }
  const ids = new Set();
  const allowedVariableLoci = new Set(content.variableLoci.map(({ id }) => id));
  for (const [index, candidate] of (sample.supportedCandidates ?? []).entries()) {
    const path = `sample.supportedCandidates[${index}]`;
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      addError(errors, "invalid-supported-candidate", path, "Each supported candidate must be an object.");
      continue;
    }
    if (!candidate.id || ids.has(candidate.id)) addError(errors, "duplicate-candidate-id", `${path}.id`, "Supported candidate ids must be unique and explicit.");
    ids.add(candidate.id);
    const supplied = candidate.genotypes ?? {};
    for (const id of Object.keys(supplied)) {
      if (!allowedVariableLoci.has(id)) addError(errors, "unsupported-candidate-locus", `${path}.genotypes.${id}`, "Candidate may specify only variable Pip loci.");
    }
    for (const locus of content.variableLoci) {
      const pair = supplied[locus.id];
      if (!Array.isArray(pair) || pair.length !== 2 || pair.some((allele) => !locus.alleles.includes(allele))) {
        addError(errors, "invalid-supported-candidate", `${path}.genotypes.${locus.id}`, "Candidate must specify an allowed complete allele pair.");
      }
    }
    if (Object.keys(supplied).length === allowedVariableLoci.size) {
      const checked = makeGenome(supplied, content);
      if (!checked.valid) for (const issue of checked.errors) addError(errors, issue.code, `${path}.${issue.path}`, issue.message);
    }
  }
  return errors.length ? failure(errors) : { valid: true, errors: [] };
}

export function makeSupportedFounder(sample, candidateId, content = PIP_CONTENT) {
  const supportCheck = validateFounderSupport(sample, content);
  if (!supportCheck.valid) return supportCheck;
  const candidate = sample.supportedCandidates.find(({ id }) => id === candidateId);
  if (!candidate) return failure([{ code: "unsupported-founder", path: "candidateId", message: "This sample does not support that founder candidate." }]);
  return makeGenome(candidate.genotypes, content);
}

export function projectFounderResearch(sample, candidateId, establishedCopies, content = PIP_CONTENT) {
  const founder = makeSupportedFounder(sample, candidateId, content);
  if (!founder.valid) return founder;
  return projectResearchKnowledge(founder.genome, establishedCopies, content);
}

export function resolvePhenotype(genome, context, content = PIP_CONTENT) {
  const contentCheck = validateContent(content);
  if (!contentCheck.valid) return { status: "invalid-content", errors: contentCheck.errors };
  const genomeCheck = validateGenome(genome, content);
  if (!genomeCheck.valid) return { status: "invalid-genome", errors: genomeCheck.errors };
  if (!context || JSON.stringify(context) !== JSON.stringify(content.context)) {
    return {
      status: "unsupported-context",
      errors: [{ code: "unsupported-context", path: "context", message: "Pip proof resolves only the exact declared adult reference context." }],
    };
  }

  const fields = {};
  const setField = (id, value, sources) => { fields[id] = { value, sources }; };
  for (const module of content.baselineModules) {
    setField(module.id, module.value, [`module:${module.id}`]);
  }
  for (const locus of content.fixedLoci) {
    setField(locus.id, locus.value, [`locus:${locus.id}`]);
  }

  const alleles = (id) => genome.genotypes[id];
  const has = (id, allele) => alleles(id).includes(allele);
  const crownPresent = has("form.crown", "C");
  const ringsPresent = has("appearance.rings", "R");
  const markingsPresent = alleles("appearance.markings").every((allele) => allele === "p");
  const burstPresent = has("movement.drive", "M");
  const efficient = has("movement.efficiency", "E");
  setField("crown", crownPresent ? "soft crown frill present" : "no crown frill", ["module:pip.body-plan", "locus:form.crown"]);
  setField("eye-rings", ringsPresent ? "pale eye rings present" : "plain amber eyes", ["locus:base.eyes", "locus:appearance.rings"]);
  setField("body-markings", markingsPresent ? "pale body markings present" : "no pale body markings", ["locus:base.coat", "locus:appearance.markings"]);
  setField("movement", burstPresent ? "walking, low clambering, and short bursts supported" : "walking and low clambering; steady movement only", ["module:pip.body-plan", "locus:movement.drive"]);
  setField("movement-energy", efficient ? "lower energy cost for the same supported locomotor action than ee" : "baseline energy cost for supported locomotor action", ["module:pip.energy-nutrition", "locus:movement.efficiency"]);
  setField("frill-display", crownPresent ? "frill display available" : "frill display unavailable without crown", ["module:pip.sensing-signaling", "locus:form.crown"]);

  return {
    status: "resolved",
    contentVersion: content.version,
    contextId: context.id,
    families: [...content.families],
    fields,
    genotypeSummary: Object.fromEntries(content.variableLoci.map((locus) => [locus.id, normalizePair(alleles(locus.id)).join("")])),
  };
}

export function projectResearchKnowledge(genome, establishedCopies, content = PIP_CONTENT) {
  const genomeCheck = validateGenome(genome, content);
  if (!genomeCheck.valid) return { status: "invalid-genome", errors: genomeCheck.errors };
  if (!establishedCopies || typeof establishedCopies !== "object" || Array.isArray(establishedCopies)) {
    return failure([{ code: "invalid-knowledge", path: "knowledge", message: "Established copy facts must be an object." }]);
  }
  const knownLoci = new Map(content.variableLoci.map((locus) => [locus.id, locus]));
  const errors = [];
  for (const [id, copies] of Object.entries(establishedCopies)) {
    if (!knownLoci.has(id)) addError(errors, "unknown-knowledge-locus", `knowledge.${id}`, "Knowledge can name only declared variable loci.");
    if (!Array.isArray(copies)) addError(errors, "invalid-known-copies", `knowledge.${id}`, "Established copies must be an array.");
    else {
      const available = [...(genome.genotypes[id] ?? [])];
      for (const allele of copies) {
        const index = available.indexOf(allele);
        if (index < 0) addError(errors, "unsupported-knowledge-fact", `knowledge.${id}`, `The candidate does not support established allele ${allele}.`);
        else available.splice(index, 1);
      }
      if (copies.length > 2) addError(errors, "too-many-known-copies", `knowledge.${id}`, "At most two copies can be established.");
    }
  }
  if (errors.length) return failure(errors);

  const loci = content.variableLoci.map((locus) => {
    const copies = establishedCopies[locus.id] ?? [];
    if (copies.length < 2) {
      return {
        locus: locus.id,
        status: copies.length === 0 ? "unknown" : "partly-known",
        knownCopies: [...copies],
        unresolvedCopies: 2 - copies.length,
        phenotype: null,
      };
    }
    const pair = normalizePair(copies);
    let phenotype;
    if (locus.rule === "dominant-presence") phenotype = pair.includes(locus.dominant) ? `${locus.output} present` : locus.unexpressed;
    else if (locus.rule === "recessive-presence") phenotype = pair.every((allele) => allele === locus.recessive) ? `${locus.output} present` : locus.unexpressed;
    else if (locus.rule === "dominant-efficiency") phenotype = pair.includes(locus.dominant) ? locus.output : locus.unexpressed;
    return {
      locus: locus.id,
      status: "known",
      knownCopies: pair,
      unresolvedCopies: 0,
      phenotype,
      carried: locus.id === "appearance.markings" && pair.includes("p") && !pair.every((allele) => allele === "p") ? "p variant carried, not expressed" : undefined,
    };
  });
  return { status: "projected", exposesCompleteGenome: false, loci };
}

export function researchCompleteness(sample, factStatuses, content = PIP_CONTENT) {
  const sampleCheck = validateFounderSupport(sample, content);
  if (!sampleCheck.valid) return { complete: false, status: "invalid-support", missingOrInvalid: sampleCheck.errors.map(({ path }) => path) };
  const missingOrInvalid = [];
  for (const fact of sample.requiredFacts) {
    const status = factStatuses?.[fact];
    if (status === "known") continue;
    if (status === "not-applicable" && fact.startsWith("module:")) {
      const moduleId = fact.slice("module:".length);
      const module = content.baselineModules.find(({ id }) => id === moduleId);
      if (module?.inheritance === "not-applicable") continue;
    }
    missingOrInvalid.push(fact);
  }
  return { complete: missingOrInvalid.length === 0, status: missingOrInvalid.length === 0 ? "complete" : "incomplete", missingOrInvalid };
}

export function inheritGenomes(parentA, parentB, donorChoices, content = PIP_CONTENT) {
  const errors = [];
  for (const [label, parent] of [["parentA", parentA], ["parentB", parentB]]) {
    const checked = validateGenome(parent, content);
    if (!checked.valid) for (const issue of checked.errors) addError(errors, issue.code, `${label}.${issue.path}`, issue.message);
  }
  if (parentA?.classId !== parentB?.classId || parentA?.contentVersion !== parentB?.contentVersion) {
    addError(errors, "incompatible-parents", "parents", "The proof permits only same-version Pip parents.");
  }
  if (!donorChoices || typeof donorChoices !== "object" || Array.isArray(donorChoices)) {
    addError(errors, "invalid-donor-choices", "donorChoices", "Explicit donor-copy indices are required.");
  }
  const loci = locusDefinitions(content);
  const expected = new Set(loci.map(({ id }) => id));
  for (const id of Object.keys(donorChoices ?? {})) if (!expected.has(id)) addError(errors, "unknown-donor-locus", `donorChoices.${id}`, "Unknown donor locus.");
  for (const locus of loci) {
    const choice = donorChoices?.[locus.id];
    if (!choice || !Number.isInteger(choice.fromA) || choice.fromA < 0 || choice.fromA >= 2 || !Number.isInteger(choice.fromB) || choice.fromB < 0 || choice.fromB >= 2) {
      addError(errors, "invalid-donor-choice", `donorChoices.${locus.id}`, "Choose one valid copy index from each parent.");
    }
  }
  if (errors.length) return failure(errors);

  const genotypes = {};
  const donorTrace = {};
  for (const locus of loci) {
    const choice = donorChoices[locus.id];
    const alleleA = parentA.genotypes[locus.id][choice.fromA];
    const alleleB = parentB.genotypes[locus.id][choice.fromB];
    genotypes[locus.id] = normalizePair([alleleA, alleleB]);
    donorTrace[locus.id] = [
      { parent: "A", copyIndex: choice.fromA, allele: alleleA },
      { parent: "B", copyIndex: choice.fromB, allele: alleleB },
    ];
  }
  const child = {
    classId: CLASS_ID,
    contentVersion: CONTENT_VERSION,
    baselineModules: [...parentA.baselineModules],
    genotypes,
  };
  const childCheck = validateGenome(child, content);
  if (!childCheck.valid) return childCheck;
  return {
    valid: true,
    genome: child,
    donorTrace,
    parentGenomes: { A: structuredClone(parentA), B: structuredClone(parentB) },
  };
}

export function forecastLocus(parentA, parentB, locusId, content = PIP_CONTENT) {
  const contentCheck = validateContent(content);
  if (!contentCheck.valid) return failure(contentCheck.errors);
  const firstParentCheck = validateGenome(parentA, content);
  const secondParentCheck = validateGenome(parentB, content);
  const parentErrors = [];
  for (const [label, checked] of [["parentA", firstParentCheck], ["parentB", secondParentCheck]]) {
    if (!checked.valid) for (const issue of checked.errors) addError(parentErrors, issue.code, `${label}.${issue.path}`, issue.message);
  }
  if (parentA?.classId !== parentB?.classId || parentA?.contentVersion !== parentB?.contentVersion) {
    addError(parentErrors, "incompatible-parents", "parents", "Forecasts require same-version compatible parents.");
  }
  if (parentErrors.length) return failure(parentErrors);
  const locus = content.variableLoci.find(({ id }) => id === locusId);
  if (!locus) return failure([{ code: "unknown-locus", path: "locusId", message: `Unknown variable locus ${locusId}.` }]);
  const first = parentA?.genotypes?.[locusId];
  const second = parentB?.genotypes?.[locusId];
  if (!Array.isArray(first) || first.length !== 2 || !Array.isArray(second) || second.length !== 2
    || first.some((allele) => !locus.alleles.includes(allele)) || second.some((allele) => !locus.alleles.includes(allele))) {
    return failure([{ code: "invalid-parent-pair", path: `parents.${locusId}`, message: "Both parents need valid two-copy genotypes at this locus." }]);
  }
  const outcomes = new Map();
  for (const alleleA of first) {
    for (const alleleB of second) {
      const genotype = normalizePair([alleleA, alleleB]).join("");
      outcomes.set(genotype, (outcomes.get(genotype) ?? 0) + 0.25);
    }
  }
  return { valid: true, locus: locusId, probabilities: Object.fromEntries([...outcomes.entries()].sort(([left], [right]) => left.localeCompare(right))) };
}

export function createPipGenome(genotypes) {
  return makeGenome(genotypes, PIP_CONTENT);
}

export { CLASS_ID, CONTENT_VERSION, PIP_CONTENT, REFERENCE_CONTEXT, FIXED_LOCI, VARIABLE_LOCI, BASELINE_MODULES };
