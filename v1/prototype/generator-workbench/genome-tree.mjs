import { digest } from "./evaluate.mjs";

export const TREE_VERSION = "critter-genome-tree/1";
export const TREE_LIMITS = Object.freeze({
  maxDepth: 32,
  maxValues: 200000,
  maxTextBytes: 4194304,
  maxLoci: 4096,
  maxCopies: 64,
  maxParentDepth: 16,
});
const record = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const byteOrder = (a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b));

// Restrict the standard CBOR input domain, rather than introducing a second serializer.
export function validatePlainData(value, { allowBytes = false } = {}) {
  let values = 0;
  let textBytes = 0;
  const ancestors = new Set();
  function visit(current, depth) {
    if (++values > TREE_LIMITS.maxValues || depth > TREE_LIMITS.maxDepth)
      throw new Error("Tree value/depth bound exceeded.");
    if (current === null || typeof current === "boolean") return;
    if (typeof current === "number") {
      if (!Number.isFinite(current))
        throw new Error("Only exact finite numeric values are supported.");
      return;
    }
    if (typeof current === "string") {
      if (!current.isWellFormed())
        throw new Error(
          "Malformed Unicode rejects; no normalization or replacement.",
        );
      textBytes += Buffer.byteLength(current);
      if (textBytes > TREE_LIMITS.maxTextBytes)
        throw new Error("Decoded text bound exceeded.");
      return;
    }
    if (allowBytes && Object.getPrototypeOf(current) === Uint8Array.prototype)
      return;
    if (
      typeof current !== "object" ||
      (!Array.isArray(current) &&
        Object.getPrototypeOf(current) !== Object.prototype)
    )
      throw new Error(
        "Only plain records, arrays and supported scalar values are admitted.",
      );
    if (ancestors.has(current))
      throw new Error("Cyclic supplied data rejects.");
    ancestors.add(current);
    const descriptors = Object.getOwnPropertyDescriptors(current);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (Array.isArray(current) && key === "length") continue;
      const descriptor = descriptors[key];
      if (
        typeof key !== "string" ||
        !descriptor.enumerable ||
        !Object.hasOwn(descriptor, "value")
      )
        throw new Error(
          "Accessors, symbols and hidden fields reject rather than disappear.",
        );
      if (["__proto__", "prototype", "constructor"].includes(key))
        throw new Error("Unsafe record key rejects.");
      if (
        Array.isArray(current) &&
        (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= current.length)
      )
        throw new Error(
          "Extended array properties reject rather than disappear.",
        );
      visit(key, depth + 1);
      visit(descriptor.value, depth + 1);
    }
    if (
      Array.isArray(current) &&
      Object.keys(current).length !== current.length
    )
      throw new Error("Sparse or extended arrays reject.");
    ancestors.delete(current);
  }
  visit(value, 0);
  return { values, textBytes };
}

export function locusDictionary(catalogue) {
  if (
    !record(catalogue) ||
    !Array.isArray(catalogue.loci) ||
    catalogue.loci.length > TREE_LIMITS.maxLoci ||
    !Array.isArray(catalogue.families)
  )
    throw new Error("A bounded exact catalogue is required.");
  const allIds = new Set();
  const definitions = [];
  for (const locus of catalogue.loci) {
    if (!record(locus) || typeof locus.id !== "string" || allIds.has(locus.id))
      throw new Error("Malformed or duplicate locus ID.");
    allIds.add(locus.id);
    if (locus.status === "draft") continue;
    if (
      locus.status !== "validated" ||
      !Number.isInteger(locus.copyCount) ||
      locus.copyCount < 1 ||
      locus.copyCount > TREE_LIMITS.maxCopies ||
      !Array.isArray(locus.alleles) ||
      !locus.alleles.length ||
      locus.alleles.length > 256
    )
      throw new Error("Unsupported locus copy/allele contract.");
    const alleles = locus.alleles.map((allele) => allele?.id);
    if (
      alleles.some((id) => typeof id !== "string") ||
      new Set(alleles).size !== alleles.length
    )
      throw new Error("Malformed or duplicate allele ID.");
    definitions.push({
      id: locus.id,
      copyCount: locus.copyCount,
      alleles: alleles.sort(byteOrder),
      family: locus.family,
      affectedFamilies: locus.affectedFamilies ?? [locus.family],
      requires: locus.requires ?? [],
    });
  }
  const byId = new Map(definitions.map((locus) => [locus.id, locus]));
  const visiting = new Set();
  const completed = new Set();
  function checkDependencies(id, depth) {
    if (depth > TREE_LIMITS.maxDepth || visiting.has(id))
      throw new Error("Cyclic or too-deep prerequisite graph.");
    if (completed.has(id)) return;
    const locus = byId.get(id);
    if (
      !locus ||
      !Array.isArray(locus.requires) ||
      locus.requires.some((target) => typeof target !== "string")
    )
      throw new Error("Unknown or malformed prerequisite reference.");
    visiting.add(id);
    for (const target of locus.requires) checkDependencies(target, depth + 1);
    visiting.delete(id);
    completed.add(id);
  }
  for (const locus of definitions) checkDependencies(locus.id, 0);
  return definitions.sort((a, b) => byteOrder(a.id, b.id));
}

function verifyCopies(genome, definitions) {
  if (
    !record(genome) ||
    !record(genome.loci) ||
    Object.keys(genome.loci).length !== definitions.length
  )
    throw new Error("Complete declared locus vectors are required.");
  for (const locus of definitions) {
    const copies = genome.loci[locus.id];
    if (
      !Array.isArray(copies) ||
      copies.length !== locus.copyCount ||
      copies.some((copy) => !locus.alleles.includes(copy))
    )
      throw new Error(`Illegal allele/copy contract at ${locus.id}.`);
  }
  if (genome.origin?.kind === "cross") {
    const { parents, transmission } = genome.origin;
    if (!Array.isArray(parents) || !record(transmission))
      throw new Error(
        "Cross requires supplied parents and transmission evidence.",
      );
    for (const locus of definitions) {
      const trace = transmission[locus.id];
      if (
        !record(trace) ||
        !Array.isArray(trace.donorIndices) ||
        !Array.isArray(trace.copies) ||
        trace.donorIndices.length !== locus.copyCount ||
        trace.copies.length !== locus.copyCount ||
        parents.length !== locus.copyCount
      )
        throw new Error("Unsupported donor contract.");
      trace.donorIndices.forEach((index, slot) => {
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          trace.copies[slot] !== genome.loci[locus.id][slot] ||
          parents[slot]?.loci?.[locus.id]?.[index] !== trace.copies[slot]
        )
          throw new Error("Altered donor-copy evidence.");
      });
    }
  }
}

export function packetToGenomeTree(packet, { purpose = "T" } = {}) {
  validatePlainData(packet);
  if (
    !["G", "T"].includes(purpose) ||
    !record(packet?.input) ||
    !record(packet.input.catalogue)
  )
    throw new Error("G/T requires retained input and exact catalogue.");
  if (packet.criticalExtensions?.length)
    throw new Error("Unknown critical packet extensions reject.");
  const catalogue = packet.input.catalogue;
  const definitions = locusDictionary(catalogue);
  const foundationDigest = digest(catalogue);
  const foundationId = `foundation:${foundationDigest}`;
  const entities = [
    { id: foundationId, kind: "foundation", value: structuredClone(catalogue) },
  ];
  const relationships = [];
  let genomeOrdinal = 0;
  function addGenome(genome, depth) {
    if (depth > TREE_LIMITS.maxParentDepth)
      throw new Error("Parent depth bound exceeded.");
    verifyCopies(genome, definitions);
    if (
      genome.contentId !== catalogue.id ||
      genome.contentVersion !== catalogue.version
    )
      throw new Error(
        "Genome must name the exact retained foundation content/version.",
      );
    const id = `genome:${genomeOrdinal++}`;
    const { loci, origin, ...attributes } = structuredClone(genome);
    if (origin !== undefined && origin !== null && !record(origin))
      throw new Error("Origin must be a plain record or null.");
    const originAttributes = origin ? { ...origin } : null;
    const hasParents = origin && Object.hasOwn(origin, "parents");
    const parents = hasParents ? originAttributes.parents : [];
    if (hasParents && !Array.isArray(parents))
      throw new Error("Parent vector must be an array.");
    if (hasParents) delete originAttributes.parents;
    const parentRefs = parents.map((parent) => addGenome(parent, depth + 1));
    const locusRefs = definitions.map((locus) => {
      const locusId = `locus:${id}:${locus.id}`;
      entities.push({
        id: locusId,
        kind: "locus",
        locusId: locus.id,
        copies: loci[locus.id],
      });
      return locusId;
    });
    entities.push({
      id,
      kind: "genome",
      attributes,
      hasOrigin: Object.hasOwn(genome, "origin"),
      origin: originAttributes,
      hasParents: Boolean(hasParents),
      parentRefs,
      locusRefs,
    });
    definitions.forEach((locus, index) => {
      for (const dependency of locus.requires) {
        const target = definitions.findIndex((item) => item.id === dependency);
        if (target < 0)
          throw new Error(
            "Unavailable declared prerequisite cannot be silently omitted.",
          );
        relationships.push({
          type: "requires",
          from: locusRefs[index],
          to: locusRefs[target],
        });
      }
      if (origin?.kind === "cross")
        parentRefs.forEach((parentId, slot) =>
          relationships.push({
            type: "transmitted-from",
            from: locusRefs[index],
            to: `locus:${parentId}:${locus.id}`,
            parentSlot: slot,
            donorIndex: origin.transmission[locus.id].donorIndices[slot],
          }),
        );
    });
    return id;
  }
  const rootGenomeId = addGenome(packet.input.genome, 0);
  const layers = {
    foundation: { state: "present", entityRef: foundationId },
    genome: { state: "present", entityRef: rootGenomeId },
    expression: { state: "not-included" },
    phenotype: { state: "not-included" },
    lifetime: { state: purpose === "G" ? "not-included" : "not-modeled" },
  };
  if (purpose === "T") {
    const { input, result, scene, ...evidence } = structuredClone(packet);
    const {
      catalogue: omittedCatalogue,
      genome: omittedGenome,
      ...expressionInput
    } = input;
    entities.push({
      id: "expression:0",
      kind: "expression",
      value: expressionInput,
    });
    entities.push({
      id: "phenotype:0",
      kind: "phenotype",
      hasResult: Object.hasOwn(packet, "result"),
      result: result ?? null,
      hasScene: Object.hasOwn(packet, "scene"),
      scene: scene ?? null,
    });
    entities.push({ id: "evidence:0", kind: "evidence", value: evidence });
    layers.expression = {
      state: "present",
      entityRef: "expression:0",
      realizationReference:
        result && Object.hasOwn(result, "realization")
          ? "phenotype:0/result/realization"
          : null,
    };
    layers.phenotype = { state: "present", entityRef: "phenotype:0" };
    if (Object.hasOwn(packet, "lifetime"))
      layers.lifetime = {
        state: "present",
        attachmentReference: "evidence:0/lifetime",
      };
  }
  const tree = {
    treeSchemaVersion: TREE_VERSION,
    recordPurpose: purpose,
    foundationDigest,
    rootGenomeId,
    layers,
    entities: entities.sort((a, b) => byteOrder(a.id, b.id)),
    relationships,
    dimensionIndexes: catalogue.families.map((family) => ({
      id: family.id ?? family,
      locusRefs: definitions
        .filter((locus) => locus.affectedFamilies.includes(family.id ?? family))
        .map((locus) => `locus:${rootGenomeId}:${locus.id}`),
    })),
  };
  genomeTreeToPacket(tree);
  return tree;
}

export function genomeTreeToPacket(tree) {
  validatePlainData(tree);
  if (
    tree.treeSchemaVersion !== TREE_VERSION ||
    !["G", "T"].includes(tree.recordPurpose) ||
    !Array.isArray(tree.entities) ||
    !record(tree.layers)
  )
    throw new Error("Unknown or malformed tree schema.");
  const entities = new Map();
  for (const entity of tree.entities) {
    if (
      !record(entity) ||
      typeof entity.id !== "string" ||
      entities.has(entity.id) ||
      ![
        "foundation",
        "genome",
        "locus",
        "expression",
        "phenotype",
        "evidence",
      ].includes(entity.kind)
    )
      throw new Error("Duplicate/malformed/unknown entity.");
    entities.set(entity.id, entity);
  }
  function get(id, kind) {
    const entity = entities.get(id);
    if (!entity || entity.kind !== kind)
      throw new Error("Dangling or mistyped entity reference.");
    return entity;
  }
  const foundation = get(tree.layers.foundation?.entityRef, "foundation");
  if (digest(foundation.value) !== tree.foundationDigest)
    throw new Error("Foundation identity mismatch.");
  const definitions = locusDictionary(foundation.value);
  for (const layer of Object.values(tree.layers))
    if (layer.entityRef && !entities.has(layer.entityRef))
      throw new Error("Dangling layer reference.");
  for (const edge of tree.relationships ?? [])
    if (
      !["requires", "transmitted-from"].includes(edge.type) ||
      !entities.has(edge.from) ||
      !entities.has(edge.to)
    )
      throw new Error("Unknown or dangling relationship.");
  for (const dimension of tree.dimensionIndexes ?? [])
    for (const id of dimension.locusRefs) get(id, "locus");
  const visiting = new Set();
  const visited = new Set();
  function restoreGenome(id, depth) {
    if (depth > TREE_LIMITS.maxParentDepth || visiting.has(id))
      throw new Error("Cyclic/deep parent reference.");
    visiting.add(id);
    const entity = get(id, "genome");
    if (
      !Array.isArray(entity.locusRefs) ||
      entity.locusRefs.length !== definitions.length ||
      !Array.isArray(entity.parentRefs)
    )
      throw new Error("Malformed genome reference vectors.");
    const loci = {};
    for (const ref of entity.locusRefs) {
      const locus = get(ref, "locus");
      if (Object.hasOwn(loci, locus.locusId))
        throw new Error("Duplicate locus reference.");
      loci[locus.locusId] = structuredClone(locus.copies);
      visited.add(ref);
    }
    const genome = { ...structuredClone(entity.attributes), loci };
    if (entity.hasOrigin) {
      genome.origin = structuredClone(entity.origin);
      if (entity.hasParents)
        genome.origin.parents = entity.parentRefs.map((parent) =>
          restoreGenome(parent, depth + 1),
        );
    } else if (entity.parentRefs.length)
      throw new Error("Parent references without origin.");
    verifyCopies(genome, definitions);
    visited.add(id);
    visiting.delete(id);
    return genome;
  }
  const genome = restoreGenome(tree.rootGenomeId, 0);
  visited.add(foundation.id);
  if (tree.layers.genome?.entityRef !== tree.rootGenomeId)
    throw new Error("Root/header disagreement.");
  let packet;
  if (tree.recordPurpose === "G") {
    packet = {
      input: { catalogue: structuredClone(foundation.value), genome },
    };
  } else {
    const expression = get(tree.layers.expression?.entityRef, "expression");
    const phenotype = get(tree.layers.phenotype?.entityRef, "phenotype");
    const evidence = get("evidence:0", "evidence");
    packet = {
      ...structuredClone(evidence.value),
      input: {
        ...structuredClone(expression.value),
        catalogue: structuredClone(foundation.value),
        genome,
      },
    };
    if (phenotype.hasResult) packet.result = structuredClone(phenotype.result);
    if (phenotype.hasScene) packet.scene = structuredClone(phenotype.scene);
    for (const id of [expression.id, phenotype.id, evidence.id])
      visited.add(id);
  }
  if (visited.size !== entities.size)
    throw new Error(
      "Unreachable entities cannot disappear during restoration.",
    );
  return packet;
}
