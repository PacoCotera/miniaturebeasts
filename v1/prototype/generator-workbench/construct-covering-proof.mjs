import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GRAPH_COVERING_CATALOGUE } from "./graph-covering-catalogue.mjs";
import { ocularModuleProofCases } from "./construct-module-proof.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import { constructBodyCovering } from "./graph-covering-construction.mjs";
import { commonGraphSourceCamera } from "./graph-source-presentation.mjs";
import {
  drawBodyCoveringScene,
  drawBodyCoveringComparison,
} from "./graph-covering-presentation.mjs";

export function bodyCoveringProofCases() {
  const bodies = ocularModuleProofCases()
    .slice(0, 2)
    .map((item) => {
      const input = structuredClone(item.input);
      input.catalogue = structuredClone(GRAPH_COVERING_CATALOGUE);
      input.genome.contentId = input.catalogue.id;
      input.genome.contentVersion = input.catalogue.version;
      input.genome.loci["appearance.covering-kind"] = ["skin", "skin"];
      input.genome.loci["appearance.covering-extent"] = ["low", "low"];
      input.genome.loci["appearance.covering-scale"] = ["high", "high"];
      return {
        name: item.name.startsWith("single") ? "single-skin" : "axial-skin",
        input,
        relationship: { kind: "explicit-authoring-input", changedLoci: [] },
      };
    });
  function variant(base, name, edits) {
    const input = structuredClone(base.input);
    Object.assign(input.genome.loci, edits);
    return {
      name,
      input,
      relationship: {
        kind: "controlled-authoring-variant",
        comparedWith: base.name,
        changedLoci: Object.keys(edits),
      },
    };
  }
  const singleScales = variant(bodies[0], "single-scales", {
    "appearance.covering-kind": ["scales", "scales"],
  });
  const axialScales = variant(bodies[1], "axial-scales", {
    "appearance.covering-kind": ["scales", "scales"],
  });
  return [
    bodies[0],
    singleScales,
    bodies[1],
    axialScales,
    variant(singleScales, "single-scales-extent", {
      "appearance.covering-extent": ["high", "high"],
    }),
    variant(singleScales, "single-scales-size", {
      "appearance.covering-scale": ["low", "high"],
    }),
    variant(bodies[0], "single-skin-latent", {
      "appearance.covering-extent": ["high", "high"],
      "appearance.covering-scale": ["low", "low"],
    }),
  ];
}

export function createBodyCoveringProof() {
  return bodyCoveringProofCases().map((item) => {
    const packet = resolveAuthoring(item.input);
    if (packet.status !== "resolved")
      throw new Error(`${item.name}: ${JSON.stringify(packet.errors)}`);
    const construction = constructGraphSource(packet.result, {
      profileVersion: "graph-source/1",
      sourceRuleVersion: packet.result.baseGraphRuleVersion,
    });
    const ocular = constructOcularModule(packet.result, construction, {
      profileVersion: packet.result.ocularModuleRuleVersion,
    });
    const covering = constructBodyCovering(
      packet.result,
      construction,
      ocular,
      { profileVersion: packet.result.coveringModuleRuleVersion },
    );
    if (covering.status !== "constructed")
      throw new Error(`${item.name}: ${JSON.stringify(covering.errors)}`);
    return { ...item, packet, construction, ocular, covering };
  });
}

export function writeBodyCoveringProof(directory) {
  const cases = createBodyCoveringProof();
  const camera = commonGraphSourceCamera(
    cases.map((item) => item.construction),
  );
  mkdirSync(directory, { recursive: true });
  const manifest = cases.map((item) => {
    const svg = drawBodyCoveringScene(
      item.construction,
      item.ocular,
      item.covering,
      { camera, size: 256 },
    );
    for (const [suffix, value] of [
      ["packet", item.packet],
      ["construction", item.construction],
      ["ocular", item.ocular],
      ["covering", item.covering],
    ])
      writeFileSync(
        resolve(directory, `${item.name}.${suffix}.json`),
        JSON.stringify(value, null, 2) + "\n",
      );
    writeFileSync(resolve(directory, `${item.name}.svg`), svg + "\n");
    return {
      name: item.name,
      relationship: item.relationship,
      inputDigest: item.packet.inputDigest,
      resultDigest: item.packet.resultDigest,
      constructionDigest: item.construction.constructionDigest,
      ocularModuleDigest: item.ocular.moduleDigest,
      coveringDigest: item.covering.coveringDigest,
      svgDigest: digest(svg),
      counts: item.covering.counts,
      camera,
      size: 256,
      view: "Static common-scale XY body-only covering proof; no physiology or game-art claim.",
    };
  });
  writeFileSync(
    resolve(directory, "comparison.svg"),
    drawBodyCoveringComparison(cases) + "\n",
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
  if (process.argv.length !== 4 || process.argv[2] !== "--out")
    throw new Error(
      "Usage: node construct-covering-proof.mjs --out <directory>",
    );
  console.log(
    JSON.stringify(writeBodyCoveringProof(resolve(process.argv[3])), null, 2),
  );
}
