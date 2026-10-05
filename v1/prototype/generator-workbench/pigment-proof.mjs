import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  PIGMENT_CANDIDATE_CATALOGUE,
  PIGMENT_LOCUS_IDS,
  PIGMENT_REVIEW_PAIRINGS,
} from "./pigment-candidate-catalogue.mjs";
import { bodyCoveringProofCases } from "./construct-covering-proof.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import {
  resolveModuleSceneAuthoring,
  generateModuleSceneAuthoring,
} from "./module-scene-authoring.mjs";
import { commonGraphSourceCamera } from "./graph-source-presentation.mjs";
import {
  drawBodyCoveringScene,
  drawBodyCoveringComparison,
} from "./graph-covering-presentation.mjs";
import { encodeGenomeTree, decodeGenomeTree } from "./genome-codec.mjs";

export const PIGMENT_PROOF_SEEDS = Object.freeze([1, 1000, 2000]);
export const PIGMENT_SWATCH_DIGEST =
  "ea126b3fa4c67c9fd47e902de828401a64f90a163bcdd60d2b9dd4ce39d03d9f";

export function pigmentProofCases() {
  const base = bodyCoveringProofCases().find(
    (item) => item.name === "axial-scales",
  );
  function variant(name, bodyCopies, secondaryCopies) {
    const input = structuredClone(base.input);
    input.catalogue = structuredClone(PIGMENT_CANDIDATE_CATALOGUE);
    input.genome.contentId = input.catalogue.id;
    input.genome.contentVersion = input.catalogue.version;
    input.genome.loci[PIGMENT_LOCUS_IDS.body] = [...bodyCopies];
    input.genome.loci[PIGMENT_LOCUS_IDS.secondary] = [...secondaryCopies];
    return {
      name,
      input,
      relationship: {
        kind: "controlled-authoring-variant",
        sourceExample: base.name,
        changedLoci: Object.values(PIGMENT_LOCUS_IDS),
        note: "New candidate foundation; not an offspring, resident edit or canonical palette.",
      },
    };
  }
  return [
    ...PIGMENT_REVIEW_PAIRINGS.map(([name, body, secondary]) =>
      variant(name, [body, body], [secondary, secondary]),
    ),
    variant("mixed-fields", ["jade", "lagoon"], ["cream", "slate"]),
    variant("reversed-copies", ["lagoon", "jade"], ["slate", "cream"]),
  ];
}

export function radialPigmentInput() {
  const input = structuredClone(
    pigmentProofCases().find((item) => item.name === "mixed-fields").input,
  );
  input.genome.loci["development.symmetry"] = ["radial", "radial"];
  return input;
}

export function createControlledPigmentProof() {
  return pigmentProofCases().map((item) => {
    const packet = resolveModuleSceneAuthoring(item.input);
    if (packet.status !== "resolved") {
      throw new Error(`${item.name}: ${JSON.stringify(packet.errors)}`);
    }
    return { ...item, packet };
  });
}

// Compare actual geometry while excluding only pigment mapping and causal identity.
// Full source packets remain untouched and are exported separately.
export function pigmentGeometrySnapshot(packet) {
  const { body, ocular, covering } = packet.scene;
  return {
    graphNodes: packet.result.graph.nodes,
    graphEdges: packet.result.graph.edges,
    motion: packet.result.motion,
    bodyExteriors: body.bodyExteriors,
    localFrames: body.localFrames,
    appendages: body.appendages,
    bounds: body.bounds,
    ocularFeatures: ocular.features,
    ocularGeometryRule: ocular.geometryRule,
    coveringKind: covering.kind,
    coveringField: covering.field,
    coveringProfile: covering.plateProfile,
    plateShapes: covering.plates.map(
      ({ id, row, column, center, orientation, outline }) => ({
        id,
        row,
        column,
        center,
        orientation,
        outline,
      }),
    ),
    coveringCounts: covering.counts,
    coveringExclusions: covering.exclusions,
  };
}

function packetManifest(name, packet) {
  return {
    name,
    status: packet.status,
    recordId: packet.recordId,
    sceneRecordId: packet.sceneProjection?.recordId,
    inputDigest: packet.inputDigest,
    resultDigest: packet.resultDigest,
    sceneDigest: packet.scene?.sceneDigest,
    identity: packet.identity,
    prompt: {
      status: packet.prompt?.status,
      error: packet.prompt?.error ?? null,
      promptDigest: packet.prompt?.promptDigest,
      characters: packet.prompt?.text?.length ?? 0,
    },
    organization: packet.result?.graph.nodes.filter(
      (node) => node.role === "volume",
    ).length,
    nodeRoles: packet.result?.graph.nodes.reduce((counts, node) => {
      counts[node.role] = (counts[node.role] ?? 0) + 1;
      return counts;
    }, {}),
    inheritedPigments: packet.input
      ? {
          body: packet.input.genome.loci[PIGMENT_LOCUS_IDS.body],
          secondary: packet.input.genome.loci[PIGMENT_LOCUS_IDS.secondary],
        }
      : null,
    generation: packet.generation ?? null,
  };
}

function codecProof(packet, purpose, foundationMode) {
  const encoded = encodeGenomeTree(packet, { purpose, foundationMode });
  if (encoded.status !== "encoded") {
    throw new Error(
      `Codec ${purpose}/${foundationMode}: ${JSON.stringify(encoded.errors)}`,
    );
  }
  const decoded = decodeGenomeTree(encoded.text, {
    foundations: new Map([
      [digest(packet.input.catalogue), packet.input.catalogue],
    ]),
  });
  if (decoded.status !== "decoded")
    throw new Error(JSON.stringify(decoded.errors));
  const expected = purpose === "T" ? packet : packet.input.genome;
  const actual = purpose === "T" ? decoded.packet : decoded.packet.input.genome;
  if (digest(actual) !== digest(expected))
    throw new Error("Codec roundtrip changed retained data.");
  return encoded;
}

export function writePigmentProof(directory) {
  const controlled = createControlledPigmentProof();
  const camera = commonGraphSourceCamera(
    controlled.map((item) => item.packet.scene.body),
  );
  const geometryDigest = digest(pigmentGeometrySnapshot(controlled[0].packet));
  for (const item of controlled) {
    if (digest(pigmentGeometrySnapshot(item.packet)) !== geometryDigest) {
      throw new Error(
        `${item.name}: pigment-only input changed non-pigment construction.`,
      );
    }
  }
  mkdirSync(directory, { recursive: true });
  function writeJson(name, value) {
    writeFileSync(
      resolve(directory, name),
      JSON.stringify(value, null, 2) + "\n",
    );
  }
  function writePacket(name, packet, commonCamera) {
    writeJson(`${name}.packet.json`, packet);
    writeFileSync(
      resolve(directory, `${name}.prompt.txt`),
      packet.prompt?.text ?? "",
    );
    if (packet.scene?.status === "constructed") {
      const svg = drawBodyCoveringScene(
        packet.scene.body,
        packet.scene.ocular,
        packet.scene.covering,
        {
          ...(commonCamera ? { camera: commonCamera } : {}),
          size: 256,
        },
      );
      writeFileSync(resolve(directory, `${name}.svg`), svg);
    } else if (packet.diagnostic) {
      writeFileSync(resolve(directory, `${name}.svg`), packet.diagnostic);
    }
  }
  writeJson("candidate-foundation.json", PIGMENT_CANDIDATE_CATALOGUE);
  for (const item of controlled) writePacket(item.name, item.packet, camera);
  writeFileSync(
    resolve(directory, "controlled-comparison.svg"),
    drawBodyCoveringComparison(
      controlled.map((item) => ({
        construction: item.packet.scene.body,
        ocular: item.packet.scene.ocular,
        covering: item.packet.scene.covering,
      })),
    ),
  );
  const radial = resolveAuthoring(radialPigmentInput());
  if (radial.status !== "resolved")
    throw new Error(JSON.stringify(radial.errors));
  writePacket("radial-carried-secondary", radial);
  const radialScene = resolveModuleSceneAuthoring(radial.input);
  writeJson("radial-scene-rejection.json", {
    status: radialScene.status,
    stage: radialScene.stage,
    errors: radialScene.errors,
    inputDigest: radialScene.inputDigest,
    resultDigest: radialScene.resultDigest,
  });
  const random = PIGMENT_PROOF_SEEDS.map((seed) => {
    const packet = generateModuleSceneAuthoring(
      PIGMENT_CANDIDATE_CATALOGUE,
      seed,
      { maxAttempts: 1024 },
    );
    writePacket(`random-${seed}`, packet);
    return { seed, packet };
  });
  // One exact rerun, no additional search seed or hue forcing.
  const repeated = generateModuleSceneAuthoring(
    PIGMENT_CANDIDATE_CATALOGUE,
    PIGMENT_PROOF_SEEDS[0],
    { maxAttempts: 1024 },
  );
  if (digest(repeated) !== digest(random[0].packet))
    throw new Error("Identical seed regeneration diverged.");
  const mixed = controlled.find((item) => item.name === "mixed-fields").packet;
  const codecs = [];
  for (const purpose of ["G", "T"]) {
    for (const foundationMode of ["S", "E"]) {
      const encoded = codecProof(mixed, purpose, foundationMode);
      const name = `mixed-fields.${foundationMode}.${purpose}.clt`;
      writeFileSync(resolve(directory, name), encoded.text);
      codecs.push({
        name,
        ...encoded.metrics,
        integrityDigest: encoded.integrityDigest,
      });
    }
  }
  const scriptHashes = Object.fromEntries(
    [
      "pigment-candidate-catalogue.mjs",
      "pigment-proof.mjs",
      "pigment-proof.test.mjs",
      "model.mjs",
    ].map((name) => [
      name,
      digest(readFileSync(new URL(name, import.meta.url), "utf8")),
    ]),
  );
  const manifest = {
    baseRevision: "7b0ccabcb1853b95061da8d7edebff1d64605faa",
    scriptHashes,
    swatchSource: {
      path: "evidence/pigment-vocabulary/comparison.png",
      sha256: PIGMENT_SWATCH_DIGEST,
    },
    candidate: {
      id: PIGMENT_CANDIDATE_CATALOGUE.id,
      version: PIGMENT_CANDIDATE_CATALOGUE.version,
      foundationDigest: digest(PIGMENT_CANDIDATE_CATALOGUE),
      ruleVersion: PIGMENT_CANDIDATE_CATALOGUE.ruleVersion,
    },
    view: "Common-camera 256px orthographic structural diagnostics; not production art or canonical pigments.",
    camera,
    geometryDigest,
    controlled: controlled.map((item) => ({
      ...packetManifest(item.name, item.packet),
      relationship: item.relationship,
    })),
    radial: packetManifest("radial-carried-secondary", radial),
    random: random.map(({ seed, packet }) =>
      packetManifest(`random-${seed}`, packet),
    ),
    regeneration: {
      seed: PIGMENT_PROOF_SEEDS[0],
      exactPacketDigest: digest(repeated),
      equal: true,
    },
    codecs,
    limitations: [
      "Only candidate content is expanded; default packages, genetics and construction rules are unchanged.",
      "Three bounded random searches are measurements, not vocabulary coverage or general scene eligibility.",
      "Radial output is genetically resolved only; the bilateral scene consumer rejects it without repair.",
      "Brief projection failures and bounded generation exhaustion are retained as explicit outcomes.",
    ],
  };
  writeJson("manifest.json", manifest);
  return manifest;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.length && (args[0] !== "--out" || args.length !== 2)) {
    throw new Error(
      "Usage: node pigment-proof.mjs --out evidence/inherited-pigment-experiment",
    );
  }
  const manifest = writePigmentProof(
    resolve(args[1] ?? "evidence/inherited-pigment-experiment"),
  );
  console.log(
    JSON.stringify(
      {
        candidate: manifest.candidate,
        controlled: manifest.controlled.length,
        random: manifest.random.map((item) => ({
          name: item.name,
          status: item.status,
          generation: item.generation,
        })),
        codecs: manifest.codecs,
        regeneration: manifest.regeneration,
      },
      null,
      2,
    ),
  );
}
