import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { GRAPH_MODULE_CATALOGUE } from "./graph-module-catalogue.mjs";
import { graphSourceProofCases } from "./construct-source-proof.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import { commonGraphSourceCamera } from "./graph-source-presentation.mjs";
import {
  drawOcularScene,
  drawOcularComparison,
} from "./graph-module-presentation.mjs";

export function ocularModuleProofCases() {
  const baseCases = graphSourceProofCases()
    .slice(0, 2)
    .map((item) => {
      const input = structuredClone(item.input);
      input.catalogue = structuredClone(GRAPH_MODULE_CATALOGUE);
      input.genome.contentId = input.catalogue.id;
      input.genome.contentVersion = input.catalogue.version;
      input.genome.loci["structure.ocular-pair"] = ["absent", "paired"];
      input.genome.loci["structure.ocular-placement"] = ["low", "high"];
      input.genome.loci["structure.ocular-size"] = ["low", "low"];
      return {
        name: item.name + "-ocular",
        input,
        relationship: { kind: "explicit-authoring-input", changedLoci: [] },
      };
    });
  function variant(name, edits) {
    const input = structuredClone(baseCases[0].input);
    Object.assign(input.genome.loci, edits);
    return {
      name,
      input,
      relationship: {
        kind: "controlled-authoring-variant",
        comparedWith: baseCases[0].name,
        changedLoci: Object.keys(edits),
      },
    };
  }
  return [
    ...baseCases,
    variant("single-ocular-size", { "structure.ocular-size": ["low", "high"] }),
    variant("single-ocular-placement", {
      "structure.ocular-placement": ["low", "low"],
    }),
    variant("single-ocular-off-low", {
      "structure.ocular-pair": ["absent", "absent"],
      "structure.ocular-placement": ["low", "low"],
    }),
    variant("single-ocular-off-high", {
      "structure.ocular-pair": ["absent", "absent"],
      "structure.ocular-placement": ["high", "high"],
      "structure.ocular-size": ["high", "high"],
    }),
  ];
}

export function createOcularModuleProof() {
  return ocularModuleProofCases().map((item) => {
    const packet = resolveAuthoring(item.input);
    if (packet.status !== "resolved")
      throw new Error(`${item.name}: ${JSON.stringify(packet.errors)}`);
    const construction = constructGraphSource(packet.result, {
      profileVersion: "graph-source/1",
      sourceRuleVersion: packet.result.baseGraphRuleVersion,
    });
    const module = constructOcularModule(packet.result, construction, {
      profileVersion: "ocular-module/1",
    });
    if (module.status !== "constructed")
      throw new Error(`${item.name}: ${JSON.stringify(module.errors)}`);
    return { ...item, packet, construction, module };
  });
}

export function writeOcularModuleProof(directory) {
  const cases = createOcularModuleProof();
  const camera = commonGraphSourceCamera(
    cases.map((item) => item.construction),
  );
  mkdirSync(directory, { recursive: true });
  const manifest = cases.map((item) => {
    const svg = drawOcularScene(item.construction, item.module, {
      camera,
      size: 256,
    });
    for (const [suffix, value] of [
      ["packet", item.packet],
      ["construction", item.construction],
      ["module", item.module],
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
      moduleDigest: item.module.moduleDigest,
      svgDigest: digest(svg),
      camera,
      size: 256,
      view: "Common-scale XY structural module proof; no finished art or sensing claim.",
    };
  });
  writeFileSync(
    resolve(directory, "comparison.svg"),
    drawOcularComparison(cases) + "\n",
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
    throw new Error("Usage: node construct-module-proof.mjs --out <directory>");
  console.log(
    JSON.stringify(writeOcularModuleProof(resolve(process.argv[3])), null, 2),
  );
}
