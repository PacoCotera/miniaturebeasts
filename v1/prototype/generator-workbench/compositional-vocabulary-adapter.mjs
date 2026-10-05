
import { digest } from "./authoring-adapter.mjs";
import { randomStream } from "./model.mjs";
import { ANATOMICAL_CATALOGUE, ANATOMICAL_CONTENT } from "./anatomical-source-package.mjs";
import { COMPOSITIONAL_CONTENT as RETAINED_CONTENT } from "./compositional-source-package.mjs";
import {
  VOCABULARY_CONTENT,
  VOCABULARY_CATALOGUE as COMPOSITIONAL_CATALOGUE,
  VOCABULARY_FOUNDATION as COMPOSITIONAL_FOUNDATION,
  VOCABULARY_RULE as COMPOSITIONAL_RULE,
  VOCABULARY_PROFILE,
  compositionalVocabularyPackage
} from "./compositional-vocabulary-package.mjs";
const COMPOSITIONAL_CONTENT = { ...RETAINED_CONTENT, baseline: VOCABULARY_CONTENT.baseline, loci: [...RETAINED_CONTENT.loci, ...VOCABULARY_CONTENT.loci], materialProfile: VOCABULARY_CONTENT.materialProfile };
import { constructCompositionalVocabulary, FUR_DEPICTION_PROFILE } from "./compositional-vocabulary-construction.mjs";
import { realizePigmentFields } from "./compositional-source-presentation.mjs";
import { realizeVocabularyMaterials, vocabularySourceReference, vocabularyFurReference } from "./compositional-vocabulary-presentation.mjs";
import { artPromptSummary, unavailableArtPromptSummary } from "./art-prompt-summary.mjs";
import { ROLES_CONTENT, ROLES_CATALOGUE, ROLES_FOUNDATION, anatomicalRolesPackage } from "./anatomical-roles-package.mjs";
import { constructAnatomicalRoles } from "./anatomical-roles-construction.mjs";
import { realizeAnatomicalRoleMaterials, anatomicalRolesReference } from "./anatomical-roles-presentation.mjs";
import { COAT_CONTENT, COAT_CATALOGUE, COAT_FOUNDATION, coherentCoatPackage } from "./coherent-coat-package.mjs";
import { realizeCoherentCoatMaterials } from "./coherent-coat-material.mjs";
import { MARKING_CONTENT, MARKING_CATALOGUE, MARKING_FOUNDATION, MARKING_TARGETS, markingFieldPackage } from "./marking-field-package.mjs";
import { realizeMarkingFieldMaterials } from "./marking-field-material.mjs";
import { INNATE_CONTENT, INNATE_CATALOGUE, INNATE_FOUNDATION, INNATE_TARGETS, innateProfilePackage } from "./innate-profile-package.mjs";
import { innateResponseProfile } from "./innate-profile.mjs";
const COMPOSITIONAL_PACKET_SCHEMA = "compositional-authoring-record/2";
const structuralIds = new Set([...ANATOMICAL_CATALOGUE.loci, ...COMPOSITIONAL_CONTENT.loci].map((locus) => locus.id));
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function envelope(value, keys) {
  if (!plain(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected compositional envelope fields");
}
const rejected = (error, code = "compositional-input") => ({ status: "rejected", errors: [{
  code,
  path: "input",
  message: error.message
}] });
function canonicalFamily(id) {
  return { Structure: "structure", Appearance: "appearance", "Sensing and signaling": "sensing-signaling" }[id] ?? id;
}
function exactCatalogue(reference) {
  if (digest(reference) !== digest(COMPOSITIONAL_FOUNDATION) && digest(reference) !== digest(COMPOSITIONAL_CATALOGUE))
    throw new Error("Exact pinned compositional foundation required");
  return COMPOSITIONAL_CATALOGUE;
}
function consumerGuard(locusId, values) {
  const radial = values["organization.symmetry"] === "radial", head = values["modules.typedHead"], role = values["appendage.role"], groups = values["appendage.groups"], contact = role === "contact-chain", free = role === "free-chain", depth = values["organization.depth"], fan = values["organization.layout"] === "fan";
  const activeChains = contact && !radial || (contact || free) && groups > 0;
  const guards = {
    "anatomy.region-cross-exponent": [!radial, "bilateral primary cross-section; radial sections remain circular"],
    "anatomy.contact-terminal-form": [contact && activeChains, "actual contact terminal owner"],
    "appearance.fur-length": [values["covering.furEnabled"], "enabled whole-primary fur field"],
    "appearance.fur-flow": [values["covering.furEnabled"], "enabled whole-primary fur field"],
    "growth.core-width-ratio": [!radial, "bilateral primary axes"],
    "growth.core-depth-ratio": [!radial, "bilateral primary axes"],
    "growth.radial-cross-radius": [radial, "radial primary section"],
    "organization.region-layout": [depth > 1, "more than one region depth"],
    "organization.region-join": [depth > 1 || head, "connected region or head owner"],
    "growth.region-taper": [depth > 1, "child region owner"],
    "growth.region-bend": [depth > 1 && !fan && !radial, "bilateral serial child regions"],
    "growth.branch-angle": [depth > 1 && fan && !radial, "bilateral fan child regions"],
    "growth.join-throat-ratio": [(depth > 1 || head) && values["organization.join"] === "narrow", "narrow connection owner"],
    "organization.appendage-groups": [free || contact && radial, "free or radial contact groups"],
    "organization.free-link-count": [free && groups > 0, "enabled free-chain groups"],
    "growth.free-proximal-ratio": [(free || contact && radial) && groups > 0, "free/radial chain owner"],
    "growth.free-distal-ratio": [(contact && radial || free && values["appendage.freeLinks"] === 2) && groups > 0, "two-link free/radial chain owner"],
    "growth.free-radius-ratio": [free && groups > 0, "free-chain owner"],
    "anatomy.support-pair-count": [contact && !radial, "bilateral contact chains"],
    "growth.support-drop-ratio": [contact && !radial, "bilateral contact drop"],
    "growth.support-splay-ratio": [contact && !radial, "bilateral contact splay"],
    "growth.support-radius-ratio": [contact && activeChains, "contact chains"],
    "growth.terminal-length-ratio": [contact && activeChains, "contact terminal owner"],
    "growth.terminal-depth-ratio": [contact && activeChains, "contact terminal owner"],
    "anatomy.posterior-presence": [false, "old posterior consumer is replaced by explicitly composed primary regions"],
    "growth.posterior-length-ratio": [false, "no old posterior owner"],
    "growth.posterior-width-ratio": [false, "no old posterior owner"],
    "appearance.underside-palette": [!radial && (activeChains || values["modules.wingPair"]), "bilateral modular surface owner"],
    "appearance.anatomical-covering": [!values["covering.furEnabled"], "skin/scales selection without the primary fur override"],
    "appearance.anatomical-covering-extent": [!values["covering.furEnabled"] && values["covering.kind"] === "scales", "owned scale field without fur override"],
    "appearance.anatomical-scale-size": [
      !values["covering.furEnabled"] && values["covering.kind"] === "scales",
      "owned scale field without fur override"
    ]
  };
  if (locusId.startsWith("growth.head-")) return [head, "typed head owner"];
  if (["anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence"].includes(locusId))
    return [head, "typed head owner"];
  if (locusId.startsWith("growth.muzzle-")) return [head && values["modules.muzzleAndJaw"], "enabled head muzzle owner"];
  if (locusId.startsWith("growth.exterior-eye-")) return [head && values["modules.exteriorEyePair"], "enabled head ocular owner"];
  if (locusId === "anatomy.crown-form" || locusId === "growth.crown-height-ratio") return [head && values["modules.crownPair"], "enabled head crown owner"];
  if (locusId.startsWith("growth.wing-")) return [values["modules.wingPair"], "independent thin-surface owner"];
  return guards[locusId] ?? [true, "compatible construction consumer"];
}
// Only declared internal consumers select a configuration. HTTP input cannot
// supply operators/functions or change the old stock resolver's defaults.
function consumerConfiguration(consumer) {
  if (consumer === "innate-profile") return {
    catalogue: INNATE_CATALOGUE, foundation: INNATE_FOUNDATION,
    content: { ...COMPOSITIONAL_CONTENT, baseline: INNATE_CONTENT.baseline, materialProfile: INNATE_CONTENT.materialProfile, ruleVersion: INNATE_CONTENT.ruleVersion },
    structural: new Set([...structuralIds, ...ROLES_CONTENT.loci.map((locus) => locus.id), ...Object.keys(MARKING_TARGETS)]),
    package: innateProfilePackage, profile: INNATE_CONTENT.constructionProfile,
    packetSchema: "compositional-authoring-record/6", authoredSchema: "compositional-authored-record/5"
  };
  if (consumer === "marking-field") return {
    catalogue: MARKING_CATALOGUE, foundation: MARKING_FOUNDATION,
    content: { ...COMPOSITIONAL_CONTENT, baseline: MARKING_CONTENT.baseline, materialProfile: MARKING_CONTENT.materialProfile, ruleVersion: MARKING_CONTENT.ruleVersion },
    structural: new Set([...structuralIds, ...ROLES_CONTENT.loci.map((locus) => locus.id), ...Object.keys(MARKING_TARGETS)]),
    package: markingFieldPackage, profile: MARKING_CONTENT.constructionProfile,
    packetSchema: "compositional-authoring-record/5", authoredSchema: "compositional-authored-record/4"
  };
  if (consumer === "vocabulary") return {
    catalogue: COMPOSITIONAL_CATALOGUE, foundation: COMPOSITIONAL_FOUNDATION,
    content: COMPOSITIONAL_CONTENT, structural: structuralIds,
    package: compositionalVocabularyPackage, profile: FUR_DEPICTION_PROFILE,
    packetSchema: COMPOSITIONAL_PACKET_SCHEMA, authoredSchema: "compositional-authored-record/1"
  };
  if (consumer === "coherent-coat") return {
    catalogue: COAT_CATALOGUE, foundation: COAT_FOUNDATION,
    content: { ...COMPOSITIONAL_CONTENT, baseline: COAT_CONTENT.baseline, materialProfile: COAT_CONTENT.materialProfile, ruleVersion: COAT_CONTENT.ruleVersion },
    structural: new Set([...structuralIds, ...ROLES_CONTENT.loci.map((locus) => locus.id)]),
    package: coherentCoatPackage, profile: COAT_CONTENT.constructionProfile,
    packetSchema: "compositional-authoring-record/4", authoredSchema: "compositional-authored-record/3"
  };
  if (consumer !== "anatomical-roles") throw new Error("Unsupported internal source consumer");
  return {
    catalogue: ROLES_CATALOGUE, foundation: ROLES_FOUNDATION,
    content: { ...COMPOSITIONAL_CONTENT, baseline: ROLES_CONTENT.baseline, materialProfile: ROLES_CONTENT.materialProfile, ruleVersion: ROLES_CONTENT.ruleVersion },
    structural: new Set([...structuralIds, ...ROLES_CONTENT.loci.map((locus) => locus.id)]),
    package: anatomicalRolesPackage, profile: ROLES_CONTENT.constructionProfile,
    packetSchema: "compositional-authoring-record/3", authoredSchema: "compositional-authored-record/2"
  };
}
function roleGuard(locusId, values) {
  if (locusId === "anatomy.auricular-presence") return [values["modules.typedHead"], "typed head owner"];
  if (["anatomy.auricular-form", "growth.auricular-length-ratio"].includes(locusId)) return [values["modules.typedHead"] && values["ears.enabled"], "enabled head-owned ears"];
  if (locusId.startsWith("growth.axial-tail-")) return [values["tail.enabled"], "enabled axial tail"];
  return consumerGuard(locusId, values);
}
function resolveCompositionalVocabulary(input, profileVersion = FUR_DEPICTION_PROFILE, authoredPackage = null, consumer = "vocabulary") {
  try {
    const configuration = consumerConfiguration(consumer), content = configuration.content;
    const innate = consumer === "innate-profile";
    const marking = consumer === "marking-field" || innate;
    const roles = consumer !== "vocabulary", coat = consumer === "coherent-coat", activeStructuralIds = configuration.structural;
    if (!(roles ? [configuration.profile] : [VOCABULARY_PROFILE, FUR_DEPICTION_PROFILE]).includes(profileVersion)) throw new Error("Unsupported compositional construction profile");
    envelope(input, ["catalogue", "genome", "context", "expressionSeed"]);
    if (roles && !authoredPackage && ![configuration.foundation, configuration.catalogue].some((reference) => digest(reference) === digest(input.catalogue))) throw new Error(`Exact pinned catalogue${configuration.catalogue.version} foundation required`);
    const catalogue = authoredPackage?.catalogue ?? (roles ? configuration.catalogue : exactCatalogue(input.catalogue)), genome = input.genome;
    if (authoredPackage && digest(input.catalogue) !== digest(authoredPackage.foundation)) throw new Error("Exact compiled authored foundation required");
    const modeled = catalogue.loci.filter((locus) => locus.status === "validated");
    const foundation = authoredPackage?.foundation ?? configuration.foundation;
    envelope(genome, ["schemaVersion", "contentId", "contentVersion", "loci", "recordVersions", "baselineReferences", "origin"]);
    if (genome.schemaVersion !== "compositional-genome/1" || genome.contentId !== catalogue.id || genome.contentVersion !== catalogue.version) throw new Error("Wrong compositional genome/version");
    if (digest(genome.recordVersions) !== digest(Object.fromEntries(modeled.map((locus) => [locus.id, locus.version]))) || digest(genome.baselineReferences) !== digest(content.baseline.references)) throw new Error("Required full locus versions/baseline differ");
    if (!plain(genome.loci) || Object.keys(genome.loci).length !== modeled.length) throw new Error("The full inherited union is required");
    const context = input.context ?? content.context;
    if (digest(context) !== digest(content.context)) throw new Error("Only the declared static compositional context is supported");
    if (input.expressionSeed !== void 0 && input.expressionSeed !== null) throw new Error("This compositional profile uses deterministic expression");
    const values = {}, facts = [];
    for (const locus of catalogue.loci) {
      const sourceReferences = catalogue.recordSources[locus.id];
      if (locus.status !== "validated") {
        facts.push({ id: `draft:${locus.id}`, locusId: locus.id, state: "unimplemented", copyResolution: "unimplemented", sourceReferences, reasons: ["Draft definition has no implemented copy or phenotype contract."] });
        continue;
      }
      const copies = genome.loci[locus.id];
      if (!Array.isArray(copies) || copies.length !== 2 || copies.some((id) => !locus.alleles.some((allele) => allele.id === id))) throw new Error(`Invalid inherited copies at ${locus.id}`);
      const contributions = copies.map((id) => locus.alleles.find((allele) => allele.id === id).value);
      let resolved;
      if (locus.operator === "copy-mean") {
        resolved = (contributions[0] + contributions[1]) / 2;
        if ((!activeStructuralIds.has(locus.id) || marking && Object.hasOwn(MARKING_TARGETS, locus.id)) &&
            !(innate && Object.hasOwn(INNATE_TARGETS, locus.id))) resolved = Math.round(resolved * 1e6) / 1e6;
      } else if (locus.operator === "dominant-enable") resolved = contributions.some(Boolean);
      else if (locus.operator === "recessive-enable") resolved = contributions.every(Boolean);
      else {
        const key = [...copies].sort().join("|");
        if (!Object.hasOwn(locus.pairMap, key)) throw new Error(`Missing declared pair map ${locus.id}`);
        resolved = structuredClone(locus.pairMap[key]);
      }
      if (typeof resolved === "number" && !Number.isFinite(resolved)) throw new Error("Non-finite resolved contribution");
      const imported = ANATOMICAL_CONTENT.importedLoci.find((reference2) => reference2.id === locus.id);
      const dataConsumer = innate && Object.hasOwn(INNATE_TARGETS, locus.id);
      const structural = activeStructuralIds.has(locus.id), target = dataConsumer ? INNATE_TARGETS[locus.id] : marking && Object.hasOwn(MARKING_TARGETS, locus.id)
        ? MARKING_TARGETS[locus.id] : structural ? imported?.target ?? locus.target : `broader.${locus.outputs[0]}`;
      values[target] = resolved;
      facts.push({ id: target, locusId: locus.id, recordVersion: locus.version, copies: [...copies], sources: [
        locus.id
      ], operator: locus.operator, target, value: resolved, unit: locus.units ?? locus.bounds?.unit ?? "", copyResolution: "resolved", state: structural || dataConsumer ? "expressed" : "unimplemented", prerequisites: locus.requires ?? [], sourceReferences, reasons: [`Exact retained ${locus.operator} copy contribution.`, ...!structural && !dataConsumer ? ["This old consumer's geometry, motion or physiology is not implemented by the compositional source; the value is retained, not asserted as a phenotype."] : []] });
    }
    for (const fact of facts.filter((fact2) => activeStructuralIds.has(fact2.locusId))) {
      const [active, reason] = marking && Object.hasOwn(MARKING_TARGETS, fact.locusId)
        ? [fact.locusId === "appearance.marking-switch" || values["markings.enabled"], "enabled primary marking field"]
        : roles ? roleGuard(fact.locusId, values) : consumerGuard(fact.locusId, values);
      if (!active) {
        fact.state = "inactive";
        fact.reasons.push(`Carried and resolved; inactive because there is no ${reason}.`);
      }
      if (fact.target === "head.centerLiftOverCoreRx" && active) {
        fact.reasons.push("In this profile, inherited lift seeds the head direction; actual parent/head facet extents determine final center separation.");
      }
    }
    // Keep the visual consumer's inputs literal: Cognition never enters its
    // construction, material traces, camera or reference depiction.
    const sourceFacts = innate ? facts.filter((fact) => !Object.hasOwn(INNATE_TARGETS, fact.locusId)) : facts;
    const sourceValues = innate ? Object.fromEntries(Object.entries(values).filter(([target]) => !Object.values(INNATE_TARGETS).includes(target))) : values;
    const scene = (marking ? realizeMarkingFieldMaterials : coat ? realizeCoherentCoatMaterials : roles ? realizeAnatomicalRoleMaterials : realizeVocabularyMaterials)(
      realizePigmentFields(roles ? constructAnatomicalRoles(sourceValues, sourceFacts, profileVersion) : constructCompositionalVocabulary(sourceValues, sourceFacts, profileVersion)),
      sourceValues,
      sourceFacts
    );
    const reference = roles ? anatomicalRolesReference(scene, profileVersion) : profileVersion === FUR_DEPICTION_PROFILE ? vocabularyFurReference(scene) : vocabularySourceReference(scene);
    for (const fact of facts.filter((entry) => activeStructuralIds.has(entry.locusId))) {
      fact.consumers = [
        ...scene.nodes.filter((node) => node.sources.includes(fact.locusId)).map((node) => node.id),
        ...scene.nodes.flatMap((node) => node.surfaceFragments.flatMap((fragment, index) => fragment.sources?.includes(fact.locusId) ? [`${node.id}:surface-fragment:${index}`] : [])),
        ...scene.covering.sources.includes(fact.locusId) ? ["primary-material-field"] : [],
        ...(marking && scene.covering.markings.enabled && Object.hasOwn(MARKING_TARGETS, fact.locusId)
          ? scene.covering.markings.owners.map((owner) => `${owner.owner}:primary-marking-field`) : [])
      ];
    }
    let innateProfile;
    if (innate) {
      for (const fact of facts.filter((entry) => Object.hasOwn(INNATE_TARGETS, entry.locusId))) {
        const gate = fact.locusId === "cognition.innate-profile-presence";
        if (!gate && !values["innate.enabled"]) {
          fact.state = "inactive";
          fact.reasons.push("Carried and resolved; inactive because the optional innate profile is OFF.");
        }
        fact.consumers = gate || values["innate.enabled"] ? ["innate-response-profile/1"] : [];
      }
      innateProfile = innateResponseProfile(values, facts);
    }
    const coverage = catalogue.families.map((family) => {
      const loci = catalogue.loci.filter((locus) => canonicalFamily(locus.family) === family.id || (locus.affectedFamilies ?? []).map(canonicalFamily).includes(family.id));
      const selected = facts.filter((fact) => loci.some((locus) => locus.id === fact.locusId));
      return { id: family.id, locusIds: loci.map((locus) => locus.id), activeContributors: selected.filter((f) => f.state === "expressed").map((f) => f.locusId), inactiveContributors: selected.filter((f) => f.state === "inactive").map((f) => f.locusId), unimplementedContributors: selected.filter((f) => f.state === "unimplemented").map((f) => f.locusId), draftRecords: loci.filter((l) => l.status === "draft").map((l) => l.id), state: loci.length ? "indexed" : "unimplemented", gaps: family.gaps ?? "No complete physiology or lifetime model; only explicitly indexed compatible source consumers are active." };
    });
    const result = { status: "resolved", profileVersion, values, facts, coverage, ...(innate ? { innateProfile } : {}), graph: { profileVersion, nodes: scene.nodes.map(({ mesh, surfaceFragments, ...node }) => node), edges: scene.edges, covering: scene.covering, ...(innate ? { innateProfile } : {}) }, classification: {
      labels: ["provisional compositional source", scene.conventions.wholeAssemblySymmetry]
    }, motion: [] };
    const retainedInput = structuredClone({ catalogue, genome, context, expressionSeed: null }), inputDigest = digest(
      retainedInput
    ), resultDigest = digest(result), sceneDigest = digest(scene), recordId = `compositional-${digest(
      { inputDigest, resultDigest, sceneDigest }
    ).slice(0, 20)}`;
    const packet = {
      status: "resolved",
      schemaVersion: authoredPackage ? configuration.authoredSchema : configuration.packetSchema,
      ruleVersion: roles ? content.ruleVersion : COMPOSITIONAL_RULE,
      contentId: catalogue.id,
      contentVersion: catalogue.version,
      sceneProjectionVersion: profileVersion,
      materialProfileVersion: content.materialProfile,
      recordId,
      sceneRecordId: recordId,
      input: retainedInput,
      inputDigest,
      resultDigest,
      sceneDigest,
      result,
      scene,
      reference,
      informationStages: {
        foundation: { state: "present", reference: foundation },
        inherited: { state: "present", carriedPairs: modeled.length, draftDefinitions: catalogue.loci.length - modeled.length },
        expression: { state: "present", context },
        phenotype: { state: "present", profileVersion, sourceDigest: sceneDigest, ...(innate ? { dataProfile: "innate-response-profile/1", wholeExpressionDigest: resultDigest } : {}) },
        lifetime: { state: "unmodeled", reason: "No lifetime, learning, history or regulation consumer is supplied." }
      },
      representations: { baseline: JSON.stringify({ baseline: catalogue.baseline, sourceDefinitions: catalogue.sourceDefinitions }, null, 2), inherited: JSON.stringify(modeled.map((locus) => ({ locusId: locus.id, recordVersion: locus.version, copies: genome.loci[locus.id] })), null, 2), expression: JSON.stringify(facts, null, 2) },
      description: `${scene.conventions.primaryCount} connected primary regions; ${scene.conventions.wholeAssemblySymmetry}. Optional parts follow their actual copied owner guards. Static source; physiology and motion remain unmodeled.`,
    };
    // Wording must never change source validity or Generate's first-eligible
    // choice. Keep the resolved source and its digests if its brief is unavailable.
    let prompt;
    try {
      prompt = artPromptSummary(packet);
    } catch (error) {
      prompt = unavailableArtPromptSummary(packet, error);
    }
    return { ...packet, prompt };
  } catch (error) {
    return rejected(error);
  }
}
function generateCompositionalVocabulary(input, authoredPackage = null, consumer = "vocabulary") {
  try {
    const configuration = consumerConfiguration(consumer), content = configuration.content;
    envelope(input, ["catalogue", "seed", "maxAttempts"]);
    if (authoredPackage) {
      if (digest(input.catalogue) !== digest(authoredPackage.foundation)) throw new Error("Exact compiled authored foundation required");
    } else if (consumer === "vocabulary") exactCatalogue(input.catalogue);
    else if (![configuration.foundation, configuration.catalogue].some((reference) => digest(reference) === digest(input.catalogue))) throw new Error(`Exact pinned catalogue${configuration.catalogue.version} foundation required`);
    const modeled = (authoredPackage?.catalogue ?? configuration.catalogue).loci.filter((locus) => locus.status === "validated");
    if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 4294967295) throw new Error("Generation seed must be uint32");
    const attempts = input.maxAttempts ?? 1024;
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 1024) throw new Error("Candidate attempts must be 1 through 1024");
    const random = randomStream(input.seed), failures = {};
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const descriptor = authoredPackage ? structuredClone(authoredPackage) : configuration.package(), genome = descriptor.defaultGeneration.genome;
      for (const locus of modeled) {
        const choose = () => locus.alleles[Math.floor(random() * locus.alleles.length)].id;
        if (locus.operator === "pair-map" || locus.operator.endsWith("enable")) {
          const allele = choose();
          genome.loci[locus.id] = [allele, allele];
        } else genome.loci[locus.id] = [choose(), choose()];
      }
      genome.origin = { kind: "experiment", seed: input.seed, attempt, algorithmVersion: "mulberry32/1", founderProfile: content.founderSampling.id, baseline: content.baseline.id };
      const packet = resolveCompositionalVocabulary({ catalogue: authoredPackage?.foundation ?? configuration.foundation, genome, context: descriptor.referenceContext, expressionSeed: null }, configuration.profile, authoredPackage, consumer);
      if (packet.status === "resolved") return { ...packet, generation: { seed: input.seed, winningSeed: input.seed, attempts: attempt, algorithmVersion: "mulberry32/1", candidateSequenceVersion: COMPOSITIONAL_CONTENT.founderSampling.id, priorFailures: failures } };
      const reason = packet.errors[0].message;
      failures[reason] = (failures[reason] ?? 0) + 1;
    }
    return { status: "rejected", errors: [{ code: "compositional-search-exhausted", path: "generation", message: `No eligible full candidate in ${attempts} draws.` }], generation: { seed: input.seed, attempts, failures } };
  } catch (error) {
    return rejected(error);
  }
}
function replayCompositionalVocabulary(record) {
  try {
    envelope(record, ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"]);
    if (record.schemaVersion !== COMPOSITIONAL_PACKET_SCHEMA || ![VOCABULARY_PROFILE, FUR_DEPICTION_PROFILE].includes(record.sceneProjectionVersion) || record.materialProfileVersion !== COMPOSITIONAL_CONTENT.materialProfile) throw new Error("Unsupported compositional record/profile");
    const packet = resolveCompositionalVocabulary(record.input, record.sceneProjectionVersion);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => record[key] !== packet[key]))
      throw new Error("Retained compositional recipe or source digest differs");
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return rejected(error, "compositional-replay");
  }
}
export {
  COMPOSITIONAL_PACKET_SCHEMA,
  canonicalFamily,
  generateCompositionalVocabulary,
  replayCompositionalVocabulary,
  resolveCompositionalVocabulary
};
