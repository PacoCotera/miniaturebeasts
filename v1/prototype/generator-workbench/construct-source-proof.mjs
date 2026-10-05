import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  AUTHORING_CATALOGUE,
  GENOME_SCHEMA,
  REFERENCE_CONTEXT,
} from "./catalogue.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import {
  commonGraphSourceCamera,
  drawGraphSource,
  drawGraphSourceComparison,
} from "./graph-source-presentation.mjs";

export function graphSourceProofCases() {
  const genome = {
    schemaVersion: GENOME_SCHEMA,
    contentId: AUTHORING_CATALOGUE.id,
    contentVersion: AUTHORING_CATALOGUE.version,
    loci: Object.fromEntries(
      AUTHORING_CATALOGUE.loci
        .filter((locus) => locus.status === "validated")
        .map((locus) => [
          locus.id,
          Array(locus.copyCount).fill(locus.alleles[0].id),
        ]),
    ),
    origin: { kind: "experiment", seed: 0, algorithmVersion: "mulberry32/1" },
  };
  const copies = (target, ...alleles) => {
    genome.loci[target] = alleles;
  };
  copies("development.symmetry", "bilateral", "bilateral");
  copies("development.axial-repeat", "single", "single");
  copies("development.attachment-repeat", "multiple", "multiple");
  copies("development.articulated-chain", "linked", "linked");
  copies("structure.body-length", "high", "high");
  copies("structure.body-width", "high", "high");
  copies("structure.attachment-position", "high", "high");
  const single = structuredClone(genome);
  const axial = structuredClone(single);
  axial.loci["development.axial-repeat"] = ["single", "chain"];
  axial.loci["development.articulated-chain"] = ["unlinked", "unlinked"];
  axial.loci["development.fin-rooting"] = ["on", "on"];
  axial.loci["structure.fin-span"] = ["low", "high"];
  const proportion = structuredClone(single);
  proportion.loci["structure.body-width"] = ["low", "low"];
  return [
    {
      name: "single-volume-contacts",
      genome: single,
      relationship: { kind: "explicit-authoring-input", changedLoci: [] },
    },
    {
      name: "axial-volume-fins",
      genome: axial,
      relationship: {
        kind: "explicit-authoring-contrast",
        comparedWith: "single-volume-contacts",
        changedLoci: [
          "development.axial-repeat",
          "development.articulated-chain",
          "development.fin-rooting",
          "structure.fin-span",
        ],
      },
    },
    {
      name: "single-volume-proportion",
      genome: proportion,
      relationship: {
        kind: "controlled-authoring-variant",
        comparedWith: "single-volume-contacts",
        changedLoci: ["structure.body-width"],
      },
    },
  ].map((item) => ({
    ...item,
    input: {
      catalogue: structuredClone(AUTHORING_CATALOGUE),
      genome: item.genome,
      context: structuredClone(REFERENCE_CONTEXT),
      expressionSeed: 0,
    },
  }));
}

export function createGraphSourceProof() {
  return graphSourceProofCases().map((item) => {
    const packet = resolveAuthoring(item.input);
    if (packet.status !== "resolved")
      throw new Error(
        `${item.name}: source genome did not resolve: ${JSON.stringify(packet.errors)}`,
      );
    const construction = constructGraphSource(packet.result, {
      profileVersion: "graph-source/1",
      sourceRuleVersion: packet.ruleVersion,
    });
    if (construction.status !== "constructed")
      throw new Error(`${item.name}: ${JSON.stringify(construction.errors)}`);
    return {
      name: item.name,
      relationship: item.relationship,
      packet,
      construction,
    };
  });
}

export function writeGraphSourceProof(directory) {
  const cases = createGraphSourceProof();
  const camera = commonGraphSourceCamera(
    cases.map((item) => item.construction),
  );
  mkdirSync(directory, { recursive: true });
  const manifest = [];
  for (const item of cases) {
    const svg = drawGraphSource(item.construction, { camera, size: 256 });
    const entry = {
      name: item.name,
      relationship: item.relationship,
      inputDigest: item.packet.inputDigest,
      resultDigest: item.packet.resultDigest,
      constructionDigest: item.construction.constructionDigest,
      svgDigest: digest(svg),
      profileVersion: "graph-source/1",
      sourceRuleVersion: item.packet.ruleVersion,
      camera,
      size: 256,
      renderedView:
        "XY static footprint/pigment-field proof; source height/texture retained in manifest, no 3D or finished-art claim",
    };
    writeFileSync(
      resolve(directory, `${item.name}.packet.json`),
      JSON.stringify(item.packet, null, 2) + "\n",
    );
    writeFileSync(
      resolve(directory, `${item.name}.construction.json`),
      JSON.stringify(item.construction, null, 2) + "\n",
    );
    writeFileSync(resolve(directory, `${item.name}.svg`), svg + "\n");
    manifest.push(entry);
  }
  writeFileSync(
    resolve(directory, "comparison.svg"),
    drawGraphSourceComparison(cases.map((item) => item.construction)) + "\n",
  );
  writeFileSync(
    resolve(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const argumentsList = process.argv.slice(2);
  if (argumentsList.length !== 2 || argumentsList[0] !== "--out")
    throw new Error("Usage: node construct-source-proof.mjs --out <directory>");
  const manifest = writeGraphSourceProof(resolve(argumentsList[1]));
  console.log(
    JSON.stringify(
      manifest.map(
        ({ name, inputDigest, resultDigest, constructionDigest }) => ({
          name,
          inputDigest,
          resultDigest,
          constructionDigest,
        }),
      ),
      null,
      2,
    ),
  );
}
