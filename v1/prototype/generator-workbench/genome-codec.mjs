import { createHash, timingSafeEqual } from "node:crypto";
import { encode, decode, SequenceEvents } from "cbor2";
import { digest } from "./evaluate.mjs";
import {
  packetToGenomeTree,
  TREE_VERSION,
  validatePlainData,
  locusDictionary,
  TREE_LIMITS,
} from "./genome-tree.mjs";

export const CODEC_VERSION = "clt-wire/1";
export const TREE_MAPPING_VERSION = "packet-tree-compact/1";
export const CODEC_LIMITS = Object.freeze({
  maxEnvelopeBytes: 2097152,
  maxStringCharacters: 2796213,
  ...TREE_LIMITS,
});
export const CBOR_PROFILE = Object.freeze({
  id: "cbor2-cde-exact/1",
  library: "cbor2@2.3.0",
  numeric:
    "Shortest exact finite number; preserves negative zero and subnormals",
  Unicode: "Exact well-formed UTF-16; no normalization",
});
const encodeOptions = Object.freeze({
  cde: true,
  float64: false,
  flushToZero: false,
  simplifyNegativeZero: false,
  stringNormalization: null,
  reduceUnsafeNumbers: false,
  rejectUndefined: true,
  rejectBigInts: true,
  rejectDuplicateKeys: true,
  ignoreOriginalEncoding: true,
});
const decodeOptions = Object.freeze({
  cde: true,
  maxDepth: 64,
  rejectDuplicateKeys: true,
  rejectStreaming: true,
  rejectUndefined: true,
  rejectBigInts: true,
  rejectSimple: true,
  boxed: false,
  saveOriginal: false,
  ignoreGlobalTags: true,
});
const hashBytes = (bytes) => createHash("sha256").update(bytes).digest();
const errorResult = (error) => ({
  status:
    error.code === "foundation-unresolved"
      ? "dependency-unresolved"
      : "rejected",
  errors: [{ code: error.code ?? "codec-invalid", message: error.message }],
});

export function deterministicCbor(value) {
  validatePlainData(value, { allowBytes: true });
  return Buffer.from(encode(value, encodeOptions));
}

export function parseDeterministicCbor(bytes) {
  if (
    !(bytes instanceof Uint8Array) ||
    bytes.length > CODEC_LIMITS.maxEnvelopeBytes
  )
    throw new Error("CBOR byte bound exceeded.");
  // The library's token iterator permits bounds checks before object allocation.
  const source = new Uint8Array(bytes);
  let items = 0;
  for (const [
    major,
    additional,
    value,
    offset,
    extraBytes,
  ] of new SequenceEvents(source, decodeOptions)) {
    if (++items > CODEC_LIMITS.maxValues)
      throw new Error("CBOR item bound exceeded before materialization.");
    if (major === 6 || additional === 31)
      throw new Error("Tags and indefinite CBOR reject.");
    if (major === 4 || major === 5) {
      const childItems = Number(value) * (major === 5 ? 2 : 1);
      const remainingBytes = source.length - offset - 1 - extraBytes;
      if (
        !Number.isSafeInteger(childItems) ||
        childItems < 0 ||
        childItems > CODEC_LIMITS.maxValues - items ||
        childItems > remainingBytes
      )
        throw new Error(
          "Declared CBOR container length exceeds byte/item bound.",
        );
    }
  }
  // CBOR byte strings must remain Uint8Array, not Node Buffer's JSON wrapper.
  const value = decode(source, decodeOptions);
  validatePlainData(value, { allowBytes: true });
  if (!Buffer.from(bytes).equals(deterministicCbor(value)))
    throw new Error("Noncanonical or tagged CBOR rejects.");
  return value;
}

function optionRecord(options, keys) {
  if (
    !options ||
    Object.getPrototypeOf(options) !== Object.prototype ||
    Object.keys(options).some((key) => !keys.includes(key))
  )
    throw new Error("Unknown or malformed codec options.");
}

function packGenomeRecords(tree, catalogue) {
  const dictionary = locusDictionary(catalogue);
  const entities = new Map(tree.entities.map((entity) => [entity.id, entity]));
  const genomes = tree.entities
    .filter((entity) => entity.kind === "genome")
    .sort((a, b) => Number(a.id.slice(7)) - Number(b.id.slice(7)));
  const bitsPerGenome = dictionary.reduce(
    (sum, locus) =>
      sum + locus.copyCount * Math.ceil(Math.log2(locus.alleles.length)),
    0,
  );
  const bitLength = genomes.length * bitsPerGenome;
  const bytes = new Uint8Array(Math.ceil(bitLength / 8));
  let cursor = 0;
  for (const genome of genomes) {
    for (const locus of dictionary) {
      const entity = entities.get(`locus:${genome.id}:${locus.id}`);
      const width = Math.ceil(Math.log2(locus.alleles.length));
      for (const copy of entity.copies) {
        const index = locus.alleles.indexOf(copy);
        for (let bit = width - 1; bit >= 0; bit--) {
          bytes[cursor >>> 3] |= ((index >>> bit) & 1) << (7 - (cursor & 7));
          cursor++;
        }
      }
    }
  }
  return {
    genomeRecords: genomes.map((genome) => ({
      attributes: genome.attributes,
      hasOrigin: genome.hasOrigin,
      origin: genome.origin,
      hasParents: genome.hasParents,
      parentIndexes: genome.parentRefs.map((id) => Number(id.slice(7))),
    })),
    alleleBitLength: bitLength,
    alleleBytes: bytes,
  };
}

function restoreGenomeRecords(records, catalogue, bitLength, bytes) {
  if (
    !Array.isArray(records) ||
    !records.length ||
    !Number.isSafeInteger(bitLength) ||
    bitLength < 0 ||
    !(bytes instanceof Uint8Array) ||
    bytes.length !== Math.ceil(bitLength / 8)
  )
    throw new Error("Malformed allele bitstream.");
  const dictionary = locusDictionary(catalogue);
  const bitsPerGenome = dictionary.reduce(
    (sum, locus) =>
      sum + locus.copyCount * Math.ceil(Math.log2(locus.alleles.length)),
    0,
  );
  if (bitLength !== bitsPerGenome * records.length)
    throw new Error("Copy-count or bit-length mismatch.");
  // Reject a compact payload which would expand beyond the semantic limits.
  const copiesPerGenome = dictionary.reduce(
    (sum, locus) => sum + locus.copyCount,
    0,
  );
  const alleleTextBound = dictionary.reduce(
    (sum, locus) =>
      sum +
      locus.copyCount *
        Math.max(...locus.alleles.map((id) => Buffer.byteLength(id))),
    0,
  );
  if (
    copiesPerGenome * records.length > CODEC_LIMITS.maxValues ||
    alleleTextBound * records.length > CODEC_LIMITS.maxTextBytes
  )
    throw new Error("Expanded copy-vector bound exceeded.");
  let cursor = 0;
  const restored = records.map((entry) => {
    if (
      !entry ||
      typeof entry !== "object" ||
      Array.isArray(entry) ||
      Object.keys(entry).sort().join(",") !==
        ["attributes", "hasOrigin", "origin", "hasParents", "parentIndexes"]
          .sort()
          .join(",") ||
      !entry.attributes ||
      typeof entry.attributes !== "object" ||
      Array.isArray(entry.attributes) ||
      Object.hasOwn(entry.attributes, "loci") ||
      Object.hasOwn(entry.attributes, "origin") ||
      typeof entry.hasOrigin !== "boolean" ||
      typeof entry.hasParents !== "boolean" ||
      !Array.isArray(entry.parentIndexes) ||
      (entry.origin !== null &&
        (typeof entry.origin !== "object" || Array.isArray(entry.origin))) ||
      (entry.origin !== null && Object.hasOwn(entry.origin, "parents")) ||
      (!entry.hasOrigin && (entry.origin !== null || entry.hasParents)) ||
      (!entry.hasParents && entry.parentIndexes.length) ||
      (entry.hasParents && entry.origin === null)
    )
      throw new Error("Malformed compact genome record.");
    const loci = {};
    for (const locus of dictionary) {
      const width = Math.ceil(Math.log2(locus.alleles.length));
      const copies = [];
      for (let copy = 0; copy < locus.copyCount; copy++) {
        let index = 0;
        for (let bit = 0; bit < width; bit++) {
          index =
            index * 2 + ((bytes[cursor >>> 3] >>> (7 - (cursor & 7))) & 1);
          cursor++;
        }
        if (index >= locus.alleles.length)
          throw new Error("Unused allele index rejects.");
        copies.push(locus.alleles[index]);
      }
      loci[locus.id] = copies;
    }
    return { ...structuredClone(entry.attributes), loci };
  });
  for (let bit = bitLength; bit < bytes.length * 8; bit++)
    if ((bytes[bit >>> 3] >>> (7 - (bit & 7))) & 1)
      throw new Error("Nonzero allele padding rejects.");
  let nextIndex = 0;
  function restore(index, depth) {
    if (
      depth > CODEC_LIMITS.maxParentDepth ||
      index !== nextIndex ||
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= records.length
    )
      throw new Error("Cyclic, dangling or noncanonical parent reference.");
    nextIndex++;
    const entry = records[index];
    const genome = restored[index];
    if (entry.hasOrigin) genome.origin = structuredClone(entry.origin);
    if (entry.hasParents)
      genome.origin.parents = entry.parentIndexes.map((parent) =>
        restore(parent, depth + 1),
      );
    return genome;
  }
  const genome = restore(0, 0);
  if (nextIndex !== records.length)
    throw new Error("Unreachable compact genome records reject.");
  return genome;
}

export function encodeGenomeTree(packet, options = {}) {
  try {
    optionRecord(options, ["purpose", "foundationMode"]);
    const { purpose = "T", foundationMode = "E" } = options;
    if (!["G", "T"].includes(purpose) || !["S", "E"].includes(foundationMode))
      throw new Error("Unsupported purpose/foundation mode.");
    const tree = packetToGenomeTree(packet, { purpose });
    const treeBytes = deterministicCbor(tree);
    const treeDigest = hashBytes(treeBytes).toString("hex");
    const vector = packGenomeRecords(tree, packet.input.catalogue);
    let snapshot = null;
    if (purpose === "T") {
      const { input, ...packetAttributes } = packet;
      const { catalogue, genome, ...inputAttributes } = input;
      snapshot = { packetAttributes, inputAttributes };
    }
    const foundationExactDigest = hashBytes(
      deterministicCbor(packet.input.catalogue),
    ).toString("hex");
    const payload = deterministicCbor({
      schemaVersion: CODEC_VERSION,
      profileVersion: CBOR_PROFILE.id,
      treeSchemaVersion: TREE_VERSION,
      treeMappingVersion: TREE_MAPPING_VERSION,
      purpose,
      foundationMode,
      foundationDigest: tree.foundationDigest,
      foundationExactDigest,
      treeDigest,
      catalogue: foundationMode === "E" ? packet.input.catalogue : null,
      snapshot,
      ...vector,
    });
    const header = Buffer.from([
      0x43,
      0x4c,
      0x54,
      1,
      foundationMode.charCodeAt(0),
      purpose.charCodeAt(0),
      0,
    ]);
    const body = Buffer.concat([header, payload]);
    const integrity = hashBytes(body);
    const bytes = Buffer.concat([body, integrity]);
    if (bytes.length > CODEC_LIMITS.maxEnvelopeBytes)
      throw new Error("Encoded envelope exceeds 2 MiB; no data truncated.");
    const text =
      `CLT1.${foundationMode}.${purpose}:` + bytes.toString("base64url");
    return {
      status: "encoded",
      text,
      bytes,
      tree,
      integrityDigest: integrity.toString("hex"),
      treeDigest,
      metrics: {
        envelopeBytes: bytes.length,
        cborBytes: payload.length,
        stringCharacters: text.length,
        alleleBits: vector.alleleBitLength,
        alleleBytes: vector.alleleBytes.length,
        foundationMode,
        purpose,
      },
    };
  } catch (error) {
    return errorResult(error);
  }
}

export function decodeGenomeTree(text, options = {}) {
  try {
    optionRecord(options, ["foundations"]);
    if (
      typeof text !== "string" ||
      text.length > CODEC_LIMITS.maxStringCharacters
    )
      throw new Error("Encoded string bound exceeded.");
    const match = /^CLT1\.([SE])\.([GT]):([A-Za-z0-9_-]+)$/.exec(text);
    if (!match)
      throw new Error("Unknown version or noncanonical base64url/prefix.");
    const [, mode, purpose, encoded] = match;
    const bytes = Buffer.from(encoded, "base64url");
    if (
      bytes.length < 40 ||
      bytes.length > CODEC_LIMITS.maxEnvelopeBytes ||
      bytes.toString("base64url") !== encoded
    )
      throw new Error("Truncated/oversized/noncanonical binary envelope.");
    const expectedHeader = Buffer.from([
      0x43,
      0x4c,
      0x54,
      1,
      mode.charCodeAt(0),
      purpose.charCodeAt(0),
      0,
    ]);
    if (!bytes.subarray(0, 7).equals(expectedHeader))
      throw new Error("Prefix/header agreement failed.");
    const body = bytes.subarray(0, -32);
    const integrity = bytes.subarray(-32);
    if (!timingSafeEqual(hashBytes(body), integrity))
      throw new Error("Checksum mismatch.");
    const payload = parseDeterministicCbor(body.subarray(7));
    if (
      !payload ||
      payload.schemaVersion !== CODEC_VERSION ||
      payload.profileVersion !== CBOR_PROFILE.id ||
      payload.treeSchemaVersion !== TREE_VERSION ||
      payload.treeMappingVersion !== TREE_MAPPING_VERSION ||
      payload.purpose !== purpose ||
      payload.foundationMode !== mode ||
      Object.keys(payload).sort().join(",") !==
        [
          "schemaVersion",
          "profileVersion",
          "treeSchemaVersion",
          "treeMappingVersion",
          "purpose",
          "foundationMode",
          "foundationDigest",
          "foundationExactDigest",
          "treeDigest",
          "catalogue",
          "snapshot",
          "genomeRecords",
          "alleleBitLength",
          "alleleBytes",
        ]
          .sort()
          .join(",")
    )
      throw new Error("Unknown/mismatched wire schema.");
    let catalogue;
    if (mode === "E") {
      catalogue = payload.catalogue;
    } else {
      if (payload.catalogue !== null)
        throw new Error(
          "Shared foundation must not contain an embedded catalogue.",
        );
      const store = options.foundations;
      catalogue =
        store instanceof Map
          ? store.get(payload.foundationDigest)
          : store?.[payload.foundationDigest];
      if (!catalogue) {
        const error = new Error(
          `Exact shared foundation ${payload.foundationDigest} is unavailable.`,
        );
        error.code = "foundation-unresolved";
        throw error;
      }
      validatePlainData(catalogue);
    }
    if (digest(catalogue) !== payload.foundationDigest)
      throw new Error("Exact foundation digest mismatch.");
    if (
      hashBytes(deterministicCbor(catalogue)).toString("hex") !==
      payload.foundationExactDigest
    )
      throw new Error("Exact numeric foundation digest mismatch.");
    const genome = restoreGenomeRecords(
      payload.genomeRecords,
      catalogue,
      payload.alleleBitLength,
      payload.alleleBytes,
    );
    let packet;
    if (purpose === "G") {
      if (payload.snapshot !== null)
        throw new Error(
          "G cannot contain expression/evidence snapshot fields.",
        );
      packet = { input: { catalogue: structuredClone(catalogue), genome } };
    } else {
      const snapshot = payload.snapshot;
      if (
        !snapshot ||
        typeof snapshot !== "object" ||
        Array.isArray(snapshot) ||
        Object.keys(snapshot).sort().join(",") !==
          "inputAttributes,packetAttributes" ||
        !snapshot.inputAttributes ||
        typeof snapshot.inputAttributes !== "object" ||
        Array.isArray(snapshot.inputAttributes) ||
        !snapshot.packetAttributes ||
        typeof snapshot.packetAttributes !== "object" ||
        Array.isArray(snapshot.packetAttributes) ||
        Object.hasOwn(snapshot.packetAttributes, "input") ||
        Object.hasOwn(snapshot.inputAttributes, "catalogue") ||
        Object.hasOwn(snapshot.inputAttributes, "genome")
      )
        throw new Error("Malformed literal T snapshot remainder.");
      packet = {
        ...snapshot.packetAttributes,
        input: {
          ...snapshot.inputAttributes,
          catalogue: structuredClone(catalogue),
          genome,
        },
      };
    }
    // IDs, dependency edges and dimension indexes are exact mapper outputs, not payload repetitions.
    const tree = packetToGenomeTree(packet, { purpose });
    const treeDigest = hashBytes(deterministicCbor(tree)).toString("hex");
    if (treeDigest !== payload.treeDigest)
      throw new Error("Decoded tree identity mismatch.");
    return {
      status: "decoded",
      purpose,
      foundationMode: mode,
      tree,
      packet,
      treeDigest,
      integrityDigest: integrity.toString("hex"),
      dependencies:
        mode === "S"
          ? [
              {
                kind: "catalogue",
                digest: payload.foundationDigest,
                state: "resolved",
              },
            ]
          : [],
      authority:
        "Lossless inspection only; integrity is not execution approval, signature, ownership or permission.",
    };
  } catch (error) {
    return errorResult(error);
  }
}
