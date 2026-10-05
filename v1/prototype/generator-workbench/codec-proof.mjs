import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { digest } from "./evaluate.mjs";
import { crossGenomes } from "./model.mjs";
import {
  encodeGenomeTree,
  decodeGenomeTree,
  CBOR_PROFILE,
  CODEC_LIMITS,
  TREE_MAPPING_VERSION,
} from "./genome-codec.mjs";

const outputDirectory = resolve(
  process.argv[2] ?? "evidence/genome-tree-codec",
);
mkdirSync(outputDirectory, { recursive: true });
const cases = ["single-scales", "axial-scales"].map((name) => ({
  name,
  packet: JSON.parse(
    readFileSync(
      new URL(
        `evidence/module-scene-workbench/${name}.packet.json`,
        import.meta.url,
      ),
      "utf8",
    ),
  ),
}));
const foundation = cases[0].packet.input.catalogue;
const foundationDigest = digest(foundation);
const foundations = new Map([[foundationDigest, foundation]]);
writeFileSync(
  resolve(outputDirectory, "foundation.json"),
  JSON.stringify(foundation, null, 2) + "\n",
);
const measurements = [];
for (const { name, packet } of cases) {
  for (const purpose of ["G", "T"]) {
    for (const foundationMode of ["S", "E"]) {
      const encoded = encodeGenomeTree(packet, { purpose, foundationMode });
      assert.equal(encoded.status, "encoded", encoded.errors?.[0]?.message);
      const decoded = decodeGenomeTree(encoded.text, { foundations });
      assert.equal(decoded.status, "decoded", decoded.errors?.[0]?.message);
      if (purpose === "T") assert.deepEqual(decoded.packet, packet);
      else assert.deepEqual(decoded.packet.input.genome, packet.input.genome);
      assert.equal(
        encodeGenomeTree(decoded.packet, { purpose, foundationMode }).text,
        encoded.text,
      );
      writeFileSync(
        resolve(outputDirectory, `${name}.${foundationMode}.${purpose}.clt`),
        encoded.text,
      );
      measurements.push({
        name,
        ...encoded.metrics,
        originalGenomeJsonBytes: Buffer.byteLength(
          JSON.stringify(packet.input.genome),
        ),
        originalPacketJsonBytes: Buffer.byteLength(JSON.stringify(packet)),
        treeDigest: encoded.treeDigest,
        integrityDigest: encoded.integrityDigest,
        sourceInputDigest: packet.inputDigest,
        sourceResultDigest: packet.resultDigest,
      });
      if (purpose === "T" && foundationMode === "E")
        writeFileSync(
          resolve(outputDirectory, `${name}.tree.json`),
          JSON.stringify(decoded.tree, null, 2) + "\n",
        );
    }
  }
}
const parentA = cases[0].packet.input.genome;
const parentB = structuredClone(parentA);
parentB.loci["appearance.body-palette"] = foundation.loci
  .find((locus) => locus.id === "appearance.body-palette")
  .alleles.map((allele) => allele.id);
const cross = crossGenomes(foundation, parentA, parentB, 5);
assert.equal(cross.status, "generated");
const childPacket = { input: { catalogue: foundation, genome: cross.genome } };
const child = encodeGenomeTree(childPacket, {
  purpose: "G",
  foundationMode: "E",
});
assert.equal(child.status, "encoded");
assert.deepEqual(
  decodeGenomeTree(child.text).packet.input.genome,
  cross.genome,
);
writeFileSync(resolve(outputDirectory, "actual-cross.E.G.clt"), child.text);
writeFileSync(
  resolve(outputDirectory, "actual-cross.genome.json"),
  JSON.stringify(cross.genome, null, 2) + "\n",
);
measurements.push({
  name: "actual-cross",
  ...child.metrics,
  originalGenomeJsonBytes: Buffer.byteLength(JSON.stringify(cross.genome)),
  treeDigest: child.treeDigest,
  integrityDigest: child.integrityDigest,
});
const report = {
  status: "standalone lossless host proof",
  codecProfile: CBOR_PROFILE,
  treeMappingVersion: TREE_MAPPING_VERSION,
  limits: CODEC_LIMITS,
  foundationDigest,
  measurements,
  limitations: [
    "Measured G/S packs inherited data below genome JSON size only with an exact separately supplied foundation; E includes the full catalogue, and T preserves large literal evidence.",
    "S requires the exact foundation file. E decodes literal data but does not install executable rules.",
    "No UI/HTTP integration, QR transport, ownership/permission or new genetic evaluation.",
  ],
};
writeFileSync(
  resolve(outputDirectory, "measurements.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
