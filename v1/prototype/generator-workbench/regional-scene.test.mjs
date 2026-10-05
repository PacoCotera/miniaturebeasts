import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { once } from "node:events";
import { REGIONAL_SCENE_CATALOGUE } from "./regional-scene-catalogue.mjs";
import { regionalSceneWorkbenchPackage } from "./regional-scene-workbench-package.mjs";
import { constructModuleScene } from "./module-scene.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import { constructBodyCovering } from "./graph-covering-construction.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import {
  resolveModuleSceneAuthoring,
  compactSceneReplayEnvelope,
  replayModuleSceneAuthoring,
  projectModuleScenePrompt,
} from "./module-scene-authoring.mjs";
import { validateCatalogue, generateGenome } from "./model.mjs";
import { makeServer } from "./server.mjs";
import {
  bodyOrganizationCases,
  resolveBodyOrganization,
} from "./construct-body-organization-proof.mjs";
import {
  authoringRoute,
  isResolvedAuthoringPacket,
  copyableAuthoringExport,
  imageLedPetHandoff,
  mergeOptionalPackages,
  candidateStartupDecision,
  canPublishAuthoringResponse,
  sharedSceneCamera,
  scenePreviewMarkup,
  sceneCausalSummary,
} from "./authoring-ui.mjs";
const descriptor = regionalSceneWorkbenchPackage();
const exampleInputs = descriptor.sceneExamples.map(
  ({ genome, context, expressionSeed }) => ({
    catalogue: descriptor.catalogue,
    genome,
    context,
    expressionSeed,
  }),
);
const skin = resolveModuleSceneAuthoring(exampleInputs[0]);
const scales = resolveModuleSceneAuthoring(exampleInputs[1]);
const retained = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
test("regional whole package consumes same growth fields with eye ON, skin/scales and conditional OFF causes", () => {
  assert.equal(validateCatalogue(REGIONAL_SCENE_CATALOGUE).valid, true);
  assert.equal(REGIONAL_SCENE_CATALOGUE.loci.length, 56);
  assert.equal(
    REGIONAL_SCENE_CATALOGUE.loci.filter((l) => l.status === "validated")
      .length,
    50,
  );
  for (const packet of [skin, scales]) {
    assert.equal(packet.status, "resolved");
    assert.equal(packet.scene.profileVersion, "module-scene/2");
    assert.equal(packet.scene.body.profile.id, "graph-source/2");
    assert.equal(packet.scene.ocular.profile.id, "ocular-module/3");
    assert.equal(packet.scene.ocular.features.length, 2);
    assert.equal(packet.scene.covering.profile.id, "body-covering/2");
    assert.equal(
      packet.result.sourceRuleVersion,
      "developmental-regional-scene/1",
    );
    assert.equal(packet.reference.status, "constructed");
    assert.equal(
      sceneCausalSummary(packet.scene, "structure.join-neck-ratio").bodyTargets,
      1,
    );
    assert.equal(packet.prompt.projectionVersion, "module-scene-art/3");
    assert.equal(
      packet.scene.body.sourceRuleVersion,
      "developmental-regional-scene/1",
    );
    assert.ok(
      packet.scene.ocular.traces[0].locusIds.includes(
        "development.regional-growth",
      ),
    );
    assert.ok(
      packet.scene.ocular.traces[0].locusIds.includes(
        "structure.join-neck-ratio",
      ),
    );
  }
  assert.equal(scales.scene.covering.plates.length, 125);
  assert.equal(skin.scene.covering.plates.length, 0);
  assert.deepEqual(scales.result.graph, skin.result.graph);
  const bodySource = bodyOrganizationCases()[1].input;
  const source = resolveBodyOrganization(bodySource);
  assert.deepEqual(source.packet.result.graph, skin.result.graph);
  assert.deepEqual(
    source.construction.bodyExteriors,
    skin.scene.body.bodyExteriors,
  );
  const offInput = structuredClone(exampleInputs[0]);
  offInput.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  const off = resolveModuleSceneAuthoring(offInput);
  assert.equal(off.status, "resolved");
  assert.deepEqual(off.scene.ocular.traces[0].locusIds, [
    "structure.ocular-pair",
  ]);
  offInput.genome.loci["structure.ocular-placement"] = ["high", "high"];
  offInput.genome.loci["structure.ocular-size"] = ["high", "high"];
  const latent = resolveModuleSceneAuthoring(offInput);
  assert.deepEqual(off.scene.ocular.features, latent.scene.ocular.features);
  assert.deepEqual(
    off.scene.body.bodyExteriors,
    latent.scene.body.bodyExteriors,
  );
  assert.deepEqual(off.scene.body.appendages, latent.scene.body.appendages);
  assert.deepEqual(off.scene.body.surfaces, latent.scene.body.surfaces);
  assert.deepEqual(off.scene.covering.plates, latent.scene.covering.plates);
  assert.notEqual(off.inputDigest, latent.inputDigest);
  const singleInput = bodyOrganizationCases()[3].input;
  singleInput.catalogue = REGIONAL_SCENE_CATALOGUE;
  singleInput.genome.contentId = REGIONAL_SCENE_CATALOGUE.id;
  singleInput.genome.loci["structure.ocular-pair"] = ["paired", "paired"];
  singleInput.genome.loci["appearance.covering-kind"] = ["scales", "scales"];
  const single = resolveModuleSceneAuthoring(singleInput);
  assert.equal(single.status, "resolved");
  for (const trace of [
    ...single.scene.ocular.traces,
    ...single.scene.covering.traces,
  ]) {
    const sources = [
      ...(trace.locusIds ?? []),
      ...(trace.dependencyLocusIds ?? []),
    ];
    assert.ok(!sources.includes("development.regional-growth"));
    assert.ok(!sources.includes("structure.join-neck-ratio"));
  }
});
test("scene tuple and tampered source/body/ocular artifacts reject after independent reconstruction", () => {
  const result = structuredClone(skin.result);
  result.coveringModuleRuleVersion = "body-covering/1";
  assert.equal(
    constructModuleScene(result, { profileVersion: "module-scene/2" }).status,
    "rejected",
  );
  assert.equal(
    constructModuleScene(skin.result, { profileVersion: "module-scene/1" })
      .status,
    "rejected",
  );
  const body = structuredClone(skin.scene.body);
  body.bodyExteriors[0].outline[0][0] += 1;
  assert.equal(
    constructOcularModule(skin.result, body, {
      profileVersion: "ocular-module/3",
    }).status,
    "rejected",
  );
  const ocular = structuredClone(skin.scene.ocular);
  ocular.features[0].radius *= 0.5;
  assert.equal(
    constructBodyCovering(skin.result, skin.scene.body, ocular, {
      profileVersion: "body-covering/2",
    }).status,
    "rejected",
  );
  const forged = structuredClone(skin);
  forged.scene.ocular.features[0].radius *= 0.5;
  assert.throws(
    () => projectModuleScenePrompt(forged),
    /independently reconstructed/,
  );
  const mismatch = compactSceneReplayEnvelope(skin);
  mismatch.sceneProjectionVersion = "module-scene/1";
  assert.equal(replayModuleSceneAuthoring(mismatch).status, "rejected");
});
test("literal delivered body-only and scene1 historical/current packages retain exact replay", () => {
  const oldBody = retained(
    "evidence/body-organization/b-taper-fins.packet.json",
  );
  const freshBody = resolveAuthoring(oldBody.input);
  assert.equal(freshBody.resultDigest, oldBody.resultDigest);
  assert.equal(JSON.stringify(freshBody), JSON.stringify(oldBody));
  const old = retained(
    "evidence/inherited-pigment-experiment/mixed-fields.packet.json",
  );
  const replay = replayModuleSceneAuthoring(compactSceneReplayEnvelope(old));
  assert.equal(replay.status, "resolved");
  for (const key of ["result", "scene", "reference", "prompt", "identity"])
    assert.equal(JSON.stringify(replay[key]), JSON.stringify(old[key]), key);
  const current = resolveModuleSceneAuthoring(old.input);
  const restored = replayModuleSceneAuthoring(
    compactSceneReplayEnvelope(current),
  );
  assert.equal(restored.prompt.text, current.prompt.text);
  assert.equal(restored.scene.sceneDigest, old.scene.sceneDigest);
  assert.equal(restored.reference.svg, old.reference.svg);
});
test("browser route/publication/export/image and late optional merge support the explicit new profile", () => {
  assert.equal(
    authoringRoute(REGIONAL_SCENE_CATALOGUE, "generate"),
    "/api/module-scene/generate",
  );
  assert.equal(isResolvedAuthoringPacket(skin), true);
  assert.deepEqual(
    copyableAuthoringExport(skin),
    compactSceneReplayEnvelope(skin),
  );
  assert.ok(
    JSON.stringify(copyableAuthoringExport(skin), null, 2).length < 1000000,
  );
  const handoff = imageLedPetHandoff(skin);
  assert.equal(handoff.status, "ready");
  assert.equal(
    handoff.text,
    "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art.",
  );
  assert.equal(handoff.referenceSvg, skin.reference.svg);
  const incomplete = { ...skin, scene: undefined };
  assert.equal(isResolvedAuthoringPacket(incomplete), false);
  assert.equal(imageLedPetHandoff(incomplete).status, "unavailable");
  assert.equal(
    canPublishAuthoringResponse(skin, REGIONAL_SCENE_CATALOGUE, 1, 2),
    false,
  );
  const imported = {
    ...descriptor,
    catalogue: structuredClone(REGIONAL_SCENE_CATALOGUE),
  };
  const merged = mergeOptionalPackages([imported], [descriptor]);
  assert.equal(merged.length, 1);
  assert.strictEqual(merged[0], imported);
  assert.equal(candidateStartupDecision("ready", true).selectCandidate, false);
  const oldScene = replayModuleSceneAuthoring(
    compactSceneReplayEnvelope(
      retained(
        "evidence/inherited-pigment-experiment/mixed-fields.packet.json",
      ),
    ),
  );
  const crossCamera = sharedSceneCamera([oldScene, skin]);
  const scalesToScreen = [oldScene, skin].map((packet) => {
    const markup = scenePreviewMarkup(packet, crossCamera);
    const width = Number(
      markup
        .match(/viewBox="[^"]*"/)[0]
        .slice(9, -1)
        .split(" ")[2],
    );
    return (512 / width) * packet.reference.mapping.scale;
  });
  assert.ok(Math.abs(scalesToScreen[0] - scalesToScreen[1]) < 1e-10);
  const camera = sharedSceneCamera([skin, scales]);
  assert.ok(camera);
  assert.equal(
    scenePreviewMarkup(skin, camera).replace(
      /viewBox="[^"]*"/,
      'viewBox="same"',
    ),
    skin.reference.svg.replace(/viewBox="[^"]*"/, 'viewBox="same"'),
  );
});
test("actual loopback generate/evaluate/replay stay under64KiB and reject oversized transport", async () => {
  const server = makeServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  const post = async (route, input) => {
    const body = typeof input === "string" ? input : JSON.stringify(input);
    return fetch(base + "/api/module-scene/" + route, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
  };
  try {
    const descriptorResponse = await fetch(
      base + "/api/module-scene/catalogue",
    );
    const packages = await descriptorResponse.json();
    assert.equal(
      packages.regionalPackage.catalogue.id,
      REGIONAL_SCENE_CATALOGUE.id,
    );
    const input = exampleInputs[1];
    assert.ok(Buffer.byteLength(JSON.stringify(input)) <= 65536);
    const evaluatedResponse = await post("evaluate", input);
    assert.equal(evaluatedResponse.status, 200);
    const evaluated = await evaluatedResponse.json();
    assert.equal(evaluated.scene.sceneDigest, scales.scene.sceneDigest);
    const envelope = compactSceneReplayEnvelope(evaluated);
    assert.ok(Buffer.byteLength(JSON.stringify(envelope)) <= 65536);
    const replayResponse = await post("replay", envelope);
    assert.equal(replayResponse.status, 200);
    assert.equal(
      (await replayResponse.json()).reference.svg,
      evaluated.reference.svg,
    );
    const request = {
      catalogue: REGIONAL_SCENE_CATALOGUE,
      seed: 1,
      maxAttempts: 1024,
    };
    assert.ok(Buffer.byteLength(JSON.stringify(request)) <= 65536);
    const generatedResponse = await post("generate", request);
    assert.equal(generatedResponse.status, 200);
    const generated = await generatedResponse.json();
    assert.equal(generated.sceneProjectionVersion, "module-scene/2");
    assert.equal(generated.generation.attempts, 79);
    assert.equal(generated.generation.winningSeed, 79);
    assert.equal(generated.generation.seedSequence.length, 79);
    assert.equal(
      Object.values(generated.generation.rejected).reduce((a, b) => a + b, 0),
      78,
    );
    const sampled = generateGenome(REGIONAL_SCENE_CATALOGUE, 79, {
      maxAttempts: 1,
    });
    assert.deepEqual(generated.input.genome, sampled.genome);
    for (const route of ["evaluate", "generate", "replay"]) {
      const oversized = await post(route, " ".repeat(65537));
      assert.equal(oversized.status, 413);
      assert.deepEqual(await oversized.json(), {
        error: "Experiment exceeds 64 KiB",
      });
    }
    const after = await post("evaluate", input);
    assert.equal(after.status, 200);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
