import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { encode } from "cbor2";
import { digest } from "./evaluate.mjs";
import { crossGenomes } from "./model.mjs";
import { packetToGenomeTree, genomeTreeToPacket } from "./genome-tree.mjs";
import {
  encodeGenomeTree,
  decodeGenomeTree,
  deterministicCbor,
  parseDeterministicCbor,
  CODEC_LIMITS,
} from "./genome-codec.mjs";

const load = (name) =>
  JSON.parse(
    readFileSync(
      new URL(
        `evidence/module-scene-workbench/${name}.packet.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  );
const contacts = load("single-scales");
const axial = load("axial-scales");
const foundations = new Map([
  [digest(contacts.input.catalogue), contacts.input.catalogue],
]);
function rewritePayload(text, edit) {
  const [prefix, encoded] = text.split(":");
  const bytes = Buffer.from(encoded, "base64url");
  const payload = parseDeterministicCbor(bytes.subarray(7, -32));
  edit(payload);
  const body = Buffer.concat([
    bytes.subarray(0, 7),
    deterministicCbor(payload),
  ]);
  return (
    prefix +
    ":" +
    Buffer.concat([body, createHash("sha256").update(body).digest()]).toString(
      "base64url",
    )
  );
}

test("pinned deterministic CBOR numeric/map goldens preserve exact values and Unicode", () => {
  for (const [value, hex] of [
    [true, "f5"],
    [-0, "f98000"],
    [Number.MIN_VALUE, "fb0000000000000001"],
    [1.1, "fb3ff199999999999a"],
    [1.5, "f93e00"],
    [1e308, "fb7fe1ccf385ebc8a0"],
    [{ b: 2, a: 1 }, "a2616101616202"],
  ]) {
    assert.equal(deterministicCbor(value).toString("hex"), hex);
    assert.deepEqual(parseDeterministicCbor(Buffer.from(hex, "hex")), value);
  }
  assert.ok(
    Object.is(parseDeterministicCbor(Buffer.from("f98000", "hex")), -0),
  );
  assert.notDeepEqual(deterministicCbor("é"), deterministicCbor("e\u0301"));
  for (const value of [NaN, Infinity, -Infinity, 1n, undefined, "\ud800"])
    assert.throws(() => deterministicCbor(value));
  for (const hex of [
    "a2616101616102",
    "a2616202616101",
    "9f01ff",
    "c001",
    "fb3ff8000000000000",
    "1801",
    "8101ff",
    "f7",
  ])
    assert.throws(() => parseDeterministicCbor(Buffer.from(hex, "hex")));
});

test("both retained body organizations roundtrip literal complete T under S and E", () => {
  for (const original of [contacts, axial]) {
    const originalBytes = JSON.stringify(original);
    for (const foundationMode of ["S", "E"]) {
      const encoded = encodeGenomeTree(original, {
        purpose: "T",
        foundationMode,
      });
      assert.equal(encoded.status, "encoded");
      const decoded = decodeGenomeTree(encoded.text, { foundations });
      assert.equal(decoded.status, "decoded", decoded.errors?.[0]?.message);
      assert.deepEqual(decoded.packet, original);
      assert.equal(decoded.packet.diagnostic, original.diagnostic);
      assert.equal(decoded.packet.prompt.text, original.prompt.text);
      assert.equal(
        decoded.packet.scene.sceneDigest,
        original.scene.sceneDigest,
      );
      assert.equal(decoded.tree.layers.lifetime.state, "not-modeled");
      assert.equal(
        encodeGenomeTree(decoded.packet, { purpose: "T", foundationMode }).text,
        encoded.text,
      );
    }
    assert.equal(JSON.stringify(original), originalBytes);
  }
});

test("G retains ordered carried copies and actual cross provenance independently of current expression/views", () => {
  const encoded = encodeGenomeTree(contacts, {
    purpose: "G",
    foundationMode: "S",
  });
  const decoded = decodeGenomeTree(encoded.text, { foundations });
  const retainedGolden = readFileSync(
    new URL(
      "evidence/genome-tree-codec/single-scales.S.G.clt",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(encoded.text, retainedGolden);
  assert.equal(
    encoded.integrityDigest,
    "0ebe7b401be85dd8ab2dfa9e170758dc51a6aabc849cc12a700102250f5d89d6",
  );
  assert.deepEqual(decoded.packet.input.genome, contacts.input.genome);
  assert.equal(encoded.metrics.alleleBits, 96);
  assert.equal(encoded.metrics.alleleBytes, 12);
  assert.deepEqual(decoded.packet.input.genome.loci["structure.ocular-pair"], [
    "absent",
    "paired",
  ]);
  const changed = structuredClone(contacts);
  changed.input.context.medium = "water";
  changed.input.expressionSeed = 77;
  changed.diagnostic = "another viewport";
  changed.lifetime = { events: [{ order: 1 }] };
  assert.equal(decoded.tree.layers.lifetime.state, "not-included");
  assert.equal(
    encodeGenomeTree(changed, { purpose: "G", foundationMode: "S" }).text,
    encoded.text,
  );
  assert.notEqual(
    encodeGenomeTree(changed, { purpose: "T", foundationMode: "S" }).text,
    encodeGenomeTree(contacts, { purpose: "T", foundationMode: "S" }).text,
  );
  const parent = structuredClone(contacts.input.genome);
  // Select declared allele IDs, not a desired phenotype or synthetic donor trace.
  parent.loci["appearance.body-palette"] = contacts.input.catalogue.loci
    .find((locus) => locus.id === "appearance.body-palette")
    .alleles.map((allele) => allele.id);
  const child = crossGenomes(
    contacts.input.catalogue,
    contacts.input.genome,
    parent,
    5,
  );
  assert.equal(child.status, "generated");
  const cross = {
    input: { catalogue: contacts.input.catalogue, genome: child.genome },
  };
  const crossing = encodeGenomeTree(cross, { purpose: "G" });
  assert.equal(crossing.status, "encoded");
  assert.deepEqual(
    decodeGenomeTree(crossing.text).packet.input.genome,
    child.genome,
  );
  const forged = structuredClone(cross);
  const trace = Object.values(forged.input.genome.origin.transmission)[0];
  trace.donorIndices[0] = 999;
  assert.equal(encodeGenomeTree(forged, { purpose: "G" }).status, "rejected");
});

test("unknown supplied fields, lifetime and finite extremes survive T without resolver execution", () => {
  const extended = structuredClone(contacts);
  extended.futureEvidence = {
    zero: -0,
    subnormal: Number.MIN_VALUE,
    unsafeFinite: 1e100,
    text: "unchanged\nbytes",
    empty: [],
    falseValue: false,
    nothing: null,
  };
  extended.input.extraAuthoringState = { pending: true };
  extended.result.unrecognizedFutureField = {
    rule: "unsupported-proposed-rule/9",
  };
  extended.lifetime = {
    status: "supplied-unvalidated",
    events: [{ order: 2 }, { order: 1 }],
  };
  const result = decodeGenomeTree(encodeGenomeTree(extended).text);
  assert.equal(result.status, "decoded");
  assert.deepEqual(result.packet, extended);
  assert.ok(Object.is(result.packet.futureEvidence.zero, -0));
  assert.equal(result.tree.layers.lifetime.state, "present");
  for (const origin of [null, {}]) {
    const original = smallPacket();
    original.input.genome.origin = origin;
    assert.deepEqual(
      decodeGenomeTree(encodeGenomeTree(original).text).packet,
      original,
    );
  }
  const missingOrigin = smallPacket();
  delete missingOrigin.input.genome.origin;
  assert.deepEqual(
    decodeGenomeTree(encodeGenomeTree(missingOrigin).text).packet,
    missingOrigin,
  );
  const critical = {
    ...extended,
    criticalExtensions: ["unknown-required-rule"],
  };
  assert.equal(encodeGenomeTree(critical).status, "rejected");
});

function smallPacket() {
  return {
    input: {
      catalogue: {
        id: "codec-copy-proof",
        version: 1,
        families: ["structure"],
        loci: [
          {
            id: "single",
            status: "validated",
            copyCount: 1,
            alleles: [{ id: "only" }],
            family: "structure",
            requires: [],
          },
          {
            id: "triple",
            status: "validated",
            copyCount: 3,
            alleles: [{ id: "a" }, { id: "b" }, { id: "c" }],
            family: "structure",
            requires: [],
          },
        ],
      },
      genome: {
        schemaVersion: "copy-proof/1",
        contentId: "codec-copy-proof",
        contentVersion: 1,
        loci: { single: ["only"], triple: ["c", "a", "b"] },
        origin: { kind: "experiment", seed: 1 },
      },
    },
  };
}

test("dictionary contracts preserve one/three copies, unused indexes and padding reject", () => {
  const packet = smallPacket();
  const encoded = encodeGenomeTree(packet, { purpose: "G" });
  assert.equal(encoded.metrics.alleleBits, 6);
  assert.deepEqual(
    decodeGenomeTree(encoded.text).packet.input.genome,
    packet.input.genome,
  );
  const badIndex = rewritePayload(encoded.text, (payload) => {
    payload.alleleBytes[0] |= 0xc0;
  });
  assert.equal(decodeGenomeTree(badIndex).status, "rejected");
  const badPad = rewritePayload(encoded.text, (payload) => {
    payload.alleleBytes[0] |= 1;
  });
  assert.equal(decodeGenomeTree(badPad).status, "rejected");
  const wrongCount = structuredClone(packet);
  wrongCount.input.genome.loci.triple.pop();
  assert.equal(encodeGenomeTree(wrongCount).status, "rejected");
});

test("missing/mismatched S foundation and negative-zero foundation changes reject before indexes", () => {
  const packet = smallPacket();
  packet.input.catalogue.numericFixture = -0;
  const encoded = encodeGenomeTree(packet, {
    purpose: "G",
    foundationMode: "S",
  });
  assert.equal(decodeGenomeTree(encoded.text).status, "dependency-unresolved");
  const wrong = structuredClone(packet.input.catalogue);
  wrong.numericFixture = 0;
  assert.equal(digest(wrong), digest(packet.input.catalogue));
  assert.equal(
    decodeGenomeTree(encoded.text, {
      foundations: new Map([[digest(wrong), wrong]]),
    }).status,
    "rejected",
  );
  assert.equal(
    decodeGenomeTree(encoded.text, {
      foundations: new Map([
        [digest(packet.input.catalogue), packet.input.catalogue],
      ]),
    }).status,
    "decoded",
  );
});

test("wire corruption, versions and malformed/duplicate/cyclic references reject atomically", () => {
  const encoded = encodeGenomeTree(smallPacket(), { purpose: "G" });
  for (const value of [
    encoded.text.slice(0, -2),
    encoded.text + "=",
    encoded.text.replace("CLT1", "CLT2"),
    encoded.text.replace(".E.G", ".S.T"),
    "CLT1.E.G:A",
    "x".repeat(CODEC_LIMITS.maxStringCharacters + 1),
  ])
    assert.equal(decodeGenomeTree(value).status, "rejected");
  const bytes = Buffer.from(encoded.bytes);
  bytes[12] ^= 1;
  assert.equal(
    decodeGenomeTree("CLT1.E.G:" + bytes.toString("base64url")).status,
    "rejected",
  );
  for (const edit of [
    (payload) => {
      payload.genomeRecords.push(structuredClone(payload.genomeRecords[0]));
    },
    (payload) => {
      payload.genomeRecords[0].hasParents = true;
      payload.genomeRecords[0].parentIndexes = [99];
    },
    (payload) => {
      const genome = payload.genomeRecords[0];
      genome.hasParents = true;
      genome.parentIndexes = [0];
    },
    (payload) => {
      payload.treeMappingVersion = "unsupported/2";
    },
    (payload) => {
      payload.profileVersion = "unsupported/2";
    },
  ])
    assert.equal(
      decodeGenomeTree(rewritePayload(encoded.text, edit)).status,
      "rejected",
    );
  const deep = smallPacket();
  let current = deep;
  for (let depth = 0; depth < 40; depth++) current = current.child = {};
  assert.equal(encodeGenomeTree(deep).status, "rejected");
  assert.throws(() => deterministicCbor(new Array(200001).fill(null)));
  let deepArray = 0;
  for (let depth = 0; depth < 80; depth++) deepArray = [deepArray];
  assert.throws(() => parseDeterministicCbor(encode(deepArray, { cde: true })));
  assert.throws(
    () => parseDeterministicCbor(Buffer.from("9affffffff", "hex")),
    /Declared CBOR container length/,
  );
  const badTree = packetToGenomeTree(smallPacket(), { purpose: "G" });
  badTree.entities.push(structuredClone(badTree.entities[0]));
  assert.throws(() => genomeTreeToPacket(badTree), /Duplicate/);
  const cycle = smallPacket();
  cycle.self = cycle;
  assert.equal(encodeGenomeTree(cycle).status, "rejected");
});
