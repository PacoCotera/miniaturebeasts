import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { radialSourceCases } from "./construct-radial-proof.mjs";
import {
  resolveModuleSceneAuthoring,
  compactSceneReplayEnvelope,
} from "./module-scene-authoring.mjs";
import {
  drawRadialScene,
  radialDepthInspector,
} from "./radial-scene-presentation.mjs";
import { digest } from "./evaluate.mjs";
export function radialSceneCases() {
  const input = structuredClone(radialSourceCases()[1].input);
  input.genome.loci["structure.ocular-pair"] = ["paired", "paired"];
  input.genome.loci["structure.ocular-placement"] = ["low", "low"];
  input.genome.loci["structure.ocular-size"] = ["low", "low"];
  input.genome.loci["appearance.covering-scale"] = ["high", "high"];
  const scales = structuredClone(input);
  scales.genome.loci["appearance.covering-kind"] = ["scales", "scales"];
  const low = structuredClone(input);
  low.genome.loci["structure.body-height"] = ["low", "low"];
  return [
    { name: "radial-eyes-skin", input, changedLoci: [] },
    {
      name: "radial-eyes-scales",
      input: scales,
      changedLoci: ["appearance.covering-kind"],
    },
    {
      name: "radial-low-height-rejected",
      input: low,
      changedLoci: ["structure.body-height"],
    },
  ];
}
export function exportRadialSceneProof(directory) {
  mkdirSync(directory, { recursive: true });
  const resolved = radialSceneCases().map((item) => ({
    ...item,
    packet: resolveModuleSceneAuthoring(item.input),
  }));
  if (
    resolved[0].packet.status !== "resolved" ||
    resolved[1].packet.status !== "resolved" ||
    resolved[2].packet.status !== "rejected"
  )
    throw new Error(
      "Worked radial scene gate differs from declared expectation.",
    );
  const bounds = resolved
    .slice(0, 2)
    .map((item) => item.packet.scene.body.bounds);
  const camera = {
    minimumX: Math.min(...bounds.map((item) => item.minimumX)),
    maximumX: Math.max(...bounds.map((item) => item.maximumX)),
    minimumY: Math.min(...bounds.map((item) => item.minimumY)),
    maximumY: Math.max(...bounds.map((item) => item.maximumY)),
  };
  const hashes = {};
  const save = (name, text) => {
    writeFileSync(join(directory, name), text);
    hashes[name] = digest(text);
  };
  for (const item of resolved) {
    save(
      item.name + ".packet.json",
      JSON.stringify(item.packet, null, 2) + "\n",
    );
    if (item.packet.status !== "resolved") continue;
    save(
      item.name + ".replay.json",
      JSON.stringify(compactSceneReplayEnvelope(item.packet), null, 2) + "\n",
    );
    save(
      item.name + ".svg",
      drawRadialScene(item.packet.scene, { camera, size: 256 }) + "\n",
    );
    save(
      item.name + ".depth.svg",
      radialDepthInspector(item.packet.scene) + "\n",
    );
    save(item.name + ".prompt.txt", item.packet.prompt.text);
  }
  const children = resolved
    .slice(0, 2)
    .map((item, index) =>
      drawRadialScene(item.packet.scene, { camera, size: 256 }).replace(
        "<svg ",
        `<svg x="${index * 256}" `,
      ),
    )
    .join("");
  save(
    "comparison.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256" viewBox="0 0 512 256"><title>Common-scale radial ocular-slice skin/scales source comparison</title>${children}</svg>\n`,
  );
  const sourceFiles = [
    "radial-scene.mjs",
    "radial-scene-presentation.mjs",
    "radial-scene.test.mjs",
    "construct-radial-scene-proof.mjs",
    "module-scene.mjs",
    "module-scene-authoring.mjs",
    "authoring-ui.mjs",
    "src/main.jsx",
  ];
  const manifest = {
    schemaVersion: "radial-scene-proof/1",
    baseRevision: "554f0fd9586679164a56338d729fb9e239644a77",
    sceneVersion: "module-scene/3",
    camera,
    view: "Negative-X YZ with diagnostic ocular slice; not exterior-eye tissue or pet art",
    cases: resolved.map((item) => ({
      name: item.name,
      status: item.packet.status,
      stage: item.packet.stage,
      errors: item.packet.errors,
      changedLoci: item.changedLoci,
      recordId: item.packet.recordId,
      inputDigest: item.packet.inputDigest,
      resultDigest: item.packet.resultDigest,
      sceneDigest: item.packet.scene?.sceneDigest,
      eyeCount: item.packet.scene?.ocular.features.length,
      plateCount: item.packet.scene?.covering.plates.length,
      visibleCount: item.packet.scene?.covering.visibleCount,
      hiddenCount: item.packet.scene?.covering.hiddenCount,
      candidateCount: item.packet.scene?.covering.candidateCount,
      replayBytes:
        item.packet.status === "resolved"
          ? Buffer.byteLength(
              JSON.stringify(compactSceneReplayEnvelope(item.packet)),
            )
          : null,
    })),
    fileHashes: hashes,
    sourceHashes: Object.fromEntries(
      sourceFiles.map((file) => [
        file,
        digest(readFileSync(new URL(file, import.meta.url), "utf8")),
      ]),
    ),
    limitations: [
      "Conservative full surface-patch XYZ bounding boxes can exclude safe candidates; no general collision claim.",
      "The continuous atlas polygon maps to the ellipsoid; retained24-vertex boundary is a static sampling approximation, not a tissue mesh.",
      "Only front fragments are drawn; hidden rear geometry remains in the scene artifact.",
      "Existing Generate budgets/catalogue and source result remain unchanged.",
    ],
  };
  writeFileSync(
    join(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const index = process.argv.indexOf("--out");
  const directory = resolve(
    index >= 0 ? process.argv[index + 1] : "evidence/radial-scene-workbench",
  );
  console.log(JSON.stringify(exportRadialSceneProof(directory), null, 2));
}
