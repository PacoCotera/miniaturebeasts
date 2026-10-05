import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { bodyOrganizationCases } from "./construct-body-organization-proof.mjs";
import { REGIONAL_SCENE_CATALOGUE } from "./regional-scene-catalogue.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { authoringIdentity } from "./authoring-identity.mjs";
import { constructRadialGraphSource } from "./graph-radial-construction.mjs";
import {
  drawRadialGraphSource,
  commonRadialSourceCamera,
  drawRadialComparison,
} from "./graph-radial-presentation.mjs";

export function radialSourceCases() {
  const input = structuredClone(bodyOrganizationCases()[3].input);
  input.catalogue = structuredClone(REGIONAL_SCENE_CATALOGUE);
  input.genome.contentId = input.catalogue.id;
  input.genome.contentVersion = input.catalogue.version;
  const changes = {
    "development.symmetry": ["radial", "radial"],
    "development.axial-repeat": ["single", "single"],
    "development.attachment-repeat": ["multiple", "none"],
    "development.articulated-chain": ["linked", "unlinked"],
    "development.membrane-rooting": ["off", "off"],
    "development.fin-rooting": ["off", "off"],
    "development.axial-deformation": ["off", "off"],
    "structure.body-length": ["low", "low"],
    "structure.body-width": ["high", "high"],
    "structure.body-height": ["low", "low"],
    "structure.proximal-length": ["low", "low"],
    "structure.contact-width": ["low", "low"],
    "structure.ocular-pair": ["absent", "absent"],
    "appearance.covering-kind": ["skin", "skin"],
    "appearance.body-palette": ["lagoon", "lagoon"],
    "appearance.underside-palette": ["cream", "cream"],
    "appearance.marking-switch": ["off", "off"],
    "appearance.surface-texture": ["smooth", "smooth"],
  };
  Object.assign(input.genome.loci, changes);
  const height = structuredClone(input);
  height.genome.loci["structure.body-height"] = ["high", "high"];
  const secondary = structuredClone(input);
  secondary.genome.loci["appearance.underside-palette"] = ["slate", "slate"];
  return [
    { name: "radial-contact-base", input, changedLoci: [] },
    {
      name: "radial-height-contrast",
      input: height,
      changedLoci: ["structure.body-height"],
    },
    {
      name: "radial-secondary-latent",
      input: secondary,
      changedLoci: ["appearance.underside-palette"],
    },
  ];
}
export function resolveRadialSource(input) {
  const packet = resolveAuthoring(input);
  if (packet.status !== "resolved" || packet.result?.status !== "resolved")
    return { status: "rejected", stage: "genetic", errors: packet.errors };
  if (packet.resultDigest !== digest(packet.result))
    return {
      status: "rejected",
      stage: "binding",
      errors: [
        { code: "result-digest", message: "Source result identity mismatch." },
      ],
    };
  const construction = constructRadialGraphSource(packet.result, {
    profileVersion: "graph-radial/1",
    sourceRuleVersion: input.catalogue.ruleVersion,
  });
  if (construction.status !== "constructed")
    return {
      status: "rejected",
      stage: "construction",
      packet,
      errors: construction.errors,
    };
  return {
    status: "constructed",
    packet,
    construction,
    identity: authoringIdentity({
      ...packet,
      scene: { sceneDigest: construction.constructionDigest },
    }),
  };
}
export function exportRadialProof(outputDirectory) {
  const cases = radialSourceCases().map((item) => ({
    ...item,
    resolved: resolveRadialSource(item.input),
  }));
  const failures = cases.filter(
    (item) => item.resolved.status !== "constructed",
  );
  if (failures.length)
    throw new Error(
      JSON.stringify(
        failures.map((item) => ({
          name: item.name,
          stage: item.resolved.stage,
          errors: item.resolved.errors,
        })),
      ),
    );
  mkdirSync(outputDirectory, { recursive: true });
  const camera = commonRadialSourceCamera(
    cases.map((item) => item.resolved.construction),
  );
  const fileHashes = {};
  const save = (name, text) => {
    writeFileSync(join(outputDirectory, name), text);
    fileHashes[name] = digest(text);
  };
  const entries = cases.map((item) => {
    const { packet, construction, identity } = item.resolved;
    save(`${item.name}.packet.json`, JSON.stringify(packet, null, 2) + "\n");
    save(
      `${item.name}.construction.json`,
      JSON.stringify(construction, null, 2) + "\n",
    );
    save(
      `${item.name}.svg`,
      drawRadialGraphSource(construction, { camera, size: 256 }) + "\n",
    );
    return {
      name: item.name,
      relationship:
        "controlled authoring input, not offspring or random repair",
      changedLoci: item.changedLoci,
      recordId: packet.recordId,
      inputDigest: packet.inputDigest,
      resultDigest: packet.resultDigest,
      constructionDigest: construction.constructionDigest,
      identity,
      bodyCount: 1,
      chainCount: construction.chainRoots.length,
      segmentCount: construction.appendages.length,
      contactCount: construction.appendages.filter(
        (node) => node.role === "contact-link",
      ).length,
    };
  });
  save(
    "comparison.svg",
    drawRadialComparison(cases.map((item) => item.resolved.construction)) +
      "\n",
  );
  const sourceFiles = [
    "graph-radial-construction.mjs",
    "graph-radial-presentation.mjs",
    "construct-radial-proof.mjs",
    "graph-radial.test.mjs",
  ];
  const manifest = {
    schemaVersion: "critter-radial-proof/1",
    baseRevision: "91faeb39c50fe9574680ac023d78f4dc6b8cbfff",
    profileVersion: "graph-radial/1",
    sourceRuleVersion: "developmental-regional-scene/1",
    camera,
    displaySize: 256,
    projection:
      "Y right, Z down, looking along X; shared scale, X retained as depth",
    paintOrder:
      "Body then contacts and neutral inspection root rings; not physical occlusion",
    comparisonRows: [
      "actual source pigments",
      "diagnostic silhouette pigment override",
    ],
    cases: entries,
    fileHashes,
    scriptHashes: Object.fromEntries(
      sourceFiles.map((file) => [
        file,
        digest(readFileSync(new URL(file, import.meta.url), "utf8")),
      ]),
    ),
    limitations: [
      "Contacts-only static source proof, not pet/game art or current Generate default.",
      "Eyes and covering facts retained but not projected, even when ON/scales.",
      "No comprehensive capsule collision, tissue, movement or physical claims.",
    ],
  };
  writeFileSync(
    join(outputDirectory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  return manifest;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const index = process.argv.indexOf("--out");
  const output = resolve(
    index >= 0 ? process.argv[index + 1] : "evidence/radial-source-proof",
  );
  const manifest = exportRadialProof(output);
  console.log(
    JSON.stringify(
      {
        output,
        cases: manifest.cases.map((item) => ({
          name: item.name,
          recordId: item.recordId,
          constructionDigest: item.constructionDigest,
          contacts: item.contactCount,
        })),
        camera: manifest.camera,
      },
      null,
      2,
    ),
  );
}
