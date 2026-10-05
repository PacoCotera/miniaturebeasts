
import { digest } from "./authoring-adapter.mjs";
import { randomStream } from "./model.mjs";
import { ANATOMICAL_CATALOGUE, ANATOMICAL_CONTENT } from "./anatomical-source-package.mjs";
import { COMPOSITIONAL_CONTENT, COMPOSITIONAL_CATALOGUE, COMPOSITIONAL_FOUNDATION, COMPOSITIONAL_RULE, compositionalSourcePackage } from "./compositional-source-package.mjs";
import { constructCompositionalSource, constructCompositionalSourceWithMeshContacts, LEGACY_COMPOSITIONAL_PROFILE, MESH_CONTACT_PROFILE } from "./compositional-source-construction.mjs";
import { realizePigmentFields, realizeMaterialFields, compositionalSourceReference } from "./compositional-source-presentation.mjs";
const COMPOSITIONAL_PACKET_SCHEMA = "compositional-authoring-record/1";
const structuralIds = new Set([...ANATOMICAL_CATALOGUE.loci, ...COMPOSITIONAL_CONTENT.loci].map((locus) => locus.id));
const modeled = COMPOSITIONAL_CATALOGUE.loci.filter((locus) => locus.status === "validated");
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
function envelope(value, keys) {
  if (!plain(value) || Object.keys(value).some((key) => !keys.includes(key))) throw new Error("Unexpected compositional envelope fields");
}
const rejected = (error, code = "compositional-input") => ({ status: "rejected", errors: [{ code, path: "input", message: error.message }] });
function canonicalFamily(id) {
  return { Structure: "structure", Appearance: "appearance", "Sensing and signaling": "sensing-signaling" }[id] ?? id;
}
function exactCatalogue(reference) {
  if (digest(reference) !== digest(COMPOSITIONAL_FOUNDATION) && digest(reference) !== digest(COMPOSITIONAL_CATALOGUE)) throw new Error("Exact pinned compositional foundation required");
  return COMPOSITIONAL_CATALOGUE;
}
function consumerGuard(locusId, values) {
  const radial = values["organization.symmetry"] === "radial", head = values["modules.typedHead"], role = values["appendage.role"], groups = values["appendage.groups"], contact = role === "contact-chain", free = role === "free-chain", depth = values["organization.depth"], fan = values["organization.layout"] === "fan";
  const activeChains = contact && !radial || (contact || free) && groups > 0;
  const guards = {
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
    "appearance.anatomical-covering-extent": [values["covering.kind"] === "scales", "owned scale field"],
    "appearance.anatomical-scale-size": [values["covering.kind"] === "scales", "owned scale field"]
  };
  if (locusId.startsWith("growth.head-")) return [head, "typed head owner"];
  if (["anatomy.muzzle-presence", "anatomy.crown-presence", "anatomy.exterior-eye-presence"].includes(locusId)) return [head, "typed head owner"];
  if (locusId.startsWith("growth.muzzle-")) return [head && values["modules.muzzleAndJaw"], "enabled head muzzle owner"];
  if (locusId.startsWith("growth.exterior-eye-")) return [head && values["modules.exteriorEyePair"], "enabled head ocular owner"];
  if (locusId === "anatomy.crown-form" || locusId === "growth.crown-height-ratio") return [head && values["modules.crownPair"], "enabled head crown owner"];
  if (locusId.startsWith("growth.wing-")) return [values["modules.wingPair"], "independent thin-surface owner"];
  return guards[locusId] ?? [true, "compatible construction consumer"];
}
function resolveCompositionalSource(input, profileVersion = MESH_CONTACT_PROFILE) {
  try {
    if (![LEGACY_COMPOSITIONAL_PROFILE, MESH_CONTACT_PROFILE].includes(profileVersion)) throw new Error("Unsupported compositional construction profile");
    envelope(input, ["catalogue", "genome", "context", "expressionSeed"]);
    const catalogue = exactCatalogue(input.catalogue), genome = input.genome;
    envelope(genome, ["schemaVersion", "contentId", "contentVersion", "loci", "recordVersions", "baselineReferences", "origin"]);
    if (genome.schemaVersion !== "compositional-genome/1" || genome.contentId !== catalogue.id || genome.contentVersion !== catalogue.version) throw new Error("Wrong compositional genome/version");
    if (digest(genome.recordVersions) !== digest(Object.fromEntries(modeled.map((locus) => [locus.id, locus.version]))) || digest(genome.baselineReferences) !== digest(COMPOSITIONAL_CONTENT.baseline.references)) throw new Error("Required full locus versions/baseline differ");
    if (!plain(genome.loci) || Object.keys(genome.loci).length !== modeled.length) throw new Error("The full inherited union is required");
    const context = input.context ?? COMPOSITIONAL_CONTENT.context;
    if (digest(context) !== digest(COMPOSITIONAL_CONTENT.context)) throw new Error("Only the declared static compositional context is supported");
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
        if (!structuralIds.has(locus.id)) resolved = Math.round(resolved * 1e6) / 1e6;
      } else if (locus.operator === "dominant-enable") resolved = contributions.some(Boolean);
      else if (locus.operator === "recessive-enable") resolved = contributions.every(Boolean);
      else {
        const key = [...copies].sort().join("|");
        if (!Object.hasOwn(locus.pairMap, key)) throw new Error(`Missing declared pair map ${locus.id}`);
        resolved = structuredClone(locus.pairMap[key]);
      }
      if (typeof resolved === "number" && !Number.isFinite(resolved)) throw new Error("Non-finite resolved contribution");
      const imported = ANATOMICAL_CONTENT.importedLoci.find((reference2) => reference2.id === locus.id);
      const structural = structuralIds.has(locus.id), target = structural ? imported?.target ?? locus.target : `broader.${locus.outputs[0]}`;
      values[target] = resolved;
      facts.push({ id: target, locusId: locus.id, recordVersion: locus.version, copies: [...copies], sources: [locus.id], operator: locus.operator, target, value: resolved, unit: locus.units ?? locus.bounds?.unit ?? "", copyResolution: "resolved", state: structural ? "expressed" : "unimplemented", prerequisites: locus.requires ?? [], sourceReferences, reasons: [`Exact retained ${locus.operator} copy contribution.`, ...!structural ? ["This old consumer's geometry, motion or physiology is not implemented by the compositional source; the value is retained, not asserted as a phenotype."] : []] });
    }
    for (const fact of facts.filter((fact2) => structuralIds.has(fact2.locusId))) {
      const [active, reason] = consumerGuard(fact.locusId, values);
      if (!active) {
        fact.state = "inactive";
        fact.reasons.push(`Carried and resolved; inactive because there is no ${reason}.`);
      }
    }
    const construct = profileVersion === MESH_CONTACT_PROFILE ? constructCompositionalSourceWithMeshContacts : constructCompositionalSource;
    const scene = realizeMaterialFields(realizePigmentFields(construct(values, facts)), values, facts, { profile: COMPOSITIONAL_CONTENT.materialProfile, startU: 0.2, maximumCells: COMPOSITIONAL_CONTENT.bounds.materialCells });
    const reference = compositionalSourceReference(scene);
    for (const fact of facts.filter((f) => structuralIds.has(f.locusId))) fact.consumers = [...scene.nodes.filter((node) => node.sources.includes(fact.locusId)).map((node) => node.id), ...scene.covering.sources.includes(fact.locusId) ? ["primary-material-field"] : []];
    const coverage = catalogue.families.map((family) => {
      const loci = catalogue.loci.filter((locus) => canonicalFamily(locus.family) === family.id || (locus.affectedFamilies ?? []).map(canonicalFamily).includes(family.id));
      const selected = facts.filter((fact) => loci.some((locus) => locus.id === fact.locusId));
      return { id: family.id, locusIds: loci.map((locus) => locus.id), activeContributors: selected.filter((f) => f.state === "expressed").map((f) => f.locusId), inactiveContributors: selected.filter((f) => f.state === "inactive").map((f) => f.locusId), unimplementedContributors: selected.filter((f) => f.state === "unimplemented").map((f) => f.locusId), draftRecords: loci.filter((l) => l.status === "draft").map((l) => l.id), state: loci.length ? "indexed" : "unimplemented", gaps: family.gaps ?? "No complete physiology or lifetime model; only explicitly indexed compatible source consumers are active." };
    });
    const result = { status: "resolved", profileVersion, values, facts, coverage, graph: { profileVersion, nodes: scene.nodes.map(({ mesh, surfaceFragments, ...node }) => node), edges: scene.edges, covering: scene.covering }, classification: { labels: ["provisional compositional source", scene.conventions.wholeAssemblySymmetry] }, motion: [] };
    const retainedInput = structuredClone({ catalogue, genome, context, expressionSeed: null }), inputDigest = digest(retainedInput), resultDigest = digest(result), sceneDigest = digest(scene), recordId = `compositional-${digest({ inputDigest, resultDigest, sceneDigest }).slice(0, 20)}`;
    return { status: "resolved", schemaVersion: COMPOSITIONAL_PACKET_SCHEMA, ruleVersion: COMPOSITIONAL_RULE, contentId: catalogue.id, contentVersion: catalogue.version, sceneProjectionVersion: profileVersion, materialProfileVersion: COMPOSITIONAL_CONTENT.materialProfile, recordId, sceneRecordId: recordId, input: retainedInput, inputDigest, resultDigest, sceneDigest, result, scene, reference, informationStages: { foundation: { state: "present", reference: COMPOSITIONAL_FOUNDATION }, inherited: { state: "present", carriedPairs: modeled.length, draftDefinitions: catalogue.loci.length - modeled.length }, expression: { state: "present", context }, phenotype: { state: "present", profileVersion, sourceDigest: sceneDigest }, lifetime: { state: "unmodeled", reason: "No lifetime, learning, history or regulation consumer is supplied." } }, representations: { baseline: JSON.stringify({ baseline: catalogue.baseline, sourceDefinitions: catalogue.sourceDefinitions }, null, 2), inherited: JSON.stringify(modeled.map((locus) => ({ locusId: locus.id, recordVersion: locus.version, copies: genome.loci[locus.id] })), null, 2), expression: JSON.stringify(facts, null, 2) }, description: `${scene.conventions.primaryCount} connected primary regions; ${scene.conventions.wholeAssemblySymmetry}. Optional parts follow their actual copied owner guards. Static source; physiology and motion remain unmodeled.`, prompt: { text: "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art." } };
  } catch (error) {
    return rejected(error);
  }
}
function generateCompositionalSource(input) {
  try {
    envelope(input, ["catalogue", "seed", "maxAttempts"]);
    exactCatalogue(input.catalogue);
    if (!Number.isInteger(input.seed) || input.seed < 0 || input.seed > 4294967295) throw new Error("Generation seed must be uint32");
    const attempts = input.maxAttempts ?? 1024;
    if (!Number.isInteger(attempts) || attempts < 1 || attempts > 1024) throw new Error("Candidate attempts must be 1 through 1024");
    const random = randomStream(input.seed), failures = {};
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const descriptor = compositionalSourcePackage(), genome = descriptor.defaultGeneration.genome;
      for (const locus of modeled) {
        const choose = () => locus.alleles[Math.floor(random() * locus.alleles.length)].id;
        if (locus.operator === "pair-map" || locus.operator.endsWith("enable")) {
          const allele = choose();
          genome.loci[locus.id] = [allele, allele];
        } else genome.loci[locus.id] = [choose(), choose()];
      }
      genome.origin = { kind: "experiment", seed: input.seed, attempt, algorithmVersion: "mulberry32/1", founderProfile: COMPOSITIONAL_CONTENT.founderSampling.id, baseline: COMPOSITIONAL_CONTENT.baseline.id };
      const packet = resolveCompositionalSource({ catalogue: COMPOSITIONAL_FOUNDATION, genome, context: descriptor.referenceContext, expressionSeed: null });
      if (packet.status === "resolved") return { ...packet, generation: { seed: input.seed, winningSeed: input.seed, attempts: attempt, algorithmVersion: "mulberry32/1", candidateSequenceVersion: COMPOSITIONAL_CONTENT.founderSampling.id, priorFailures: failures } };
      const reason = packet.errors[0].message;
      failures[reason] = (failures[reason] ?? 0) + 1;
    }
    return { status: "rejected", errors: [{ code: "compositional-search-exhausted", path: "generation", message: `No eligible full candidate in ${attempts} draws.` }], generation: { seed: input.seed, attempts, failures } };
  } catch (error) {
    return rejected(error);
  }
}
function replayCompositionalSource(record) {
  try {
    envelope(record, ["schemaVersion", "sceneProjectionVersion", "materialProfileVersion", "sceneRecordId", "input", "inputDigest", "resultDigest", "sceneDigest"]);
    if (record.schemaVersion !== COMPOSITIONAL_PACKET_SCHEMA || ![LEGACY_COMPOSITIONAL_PROFILE, MESH_CONTACT_PROFILE].includes(record.sceneProjectionVersion) || record.materialProfileVersion !== COMPOSITIONAL_CONTENT.materialProfile) throw new Error("Unsupported compositional record/profile");
    const packet = resolveCompositionalSource(record.input, record.sceneProjectionVersion);
    if (packet.status !== "resolved") return packet;
    if (["inputDigest", "resultDigest", "sceneDigest", "sceneRecordId"].some((key) => record[key] !== packet[key])) throw new Error("Retained compositional recipe or source digest differs");
    return { ...packet, replay: { status: "verified", profileVersion: record.sceneProjectionVersion } };
  } catch (error) {
    return rejected(error, "compositional-replay");
  }
}
export {
  COMPOSITIONAL_PACKET_SCHEMA,
  canonicalFamily,
  generateCompositionalSource,
  replayCompositionalSource,
  resolveCompositionalSource
};
