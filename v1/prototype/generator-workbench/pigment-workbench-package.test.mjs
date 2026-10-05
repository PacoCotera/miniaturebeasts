import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { pigmentWorkbenchPackage } from "./pigment-workbench-package.mjs";
import { moduleSceneCatalogue } from "./module-scene-authoring.mjs";
import { bodyCoveringProofCases } from "./construct-covering-proof.mjs";
import { pigmentProofCases } from "./pigment-proof.mjs";
import { makeServer } from "./server.mjs";
import {
  authoringPackageKey,
  mergeOptionalPackages,
  authoringPackageLabel,
  packageExamples,
  packageInputs,
  candidateStartupDecision,
  retainedAuthoringFailure,
  canPublishAuthoringResponse,
  sceneReplayEnvelope,
} from "./authoring-ui.mjs";

const candidatePacket = JSON.parse(
  readFileSync(
    new URL(
      "evidence/inherited-pigment-experiment/lagoon-cream.packet.json",
      import.meta.url,
    ),
    "utf8",
  ),
);

test("candidate descriptor has its own exact complete inputs and does not retag old examples", () => {
  const descriptor = pigmentWorkbenchPackage();
  const retained = pigmentProofCases().find(
    (item) => item.name === "lagoon-cream",
  );
  assert.equal(
    authoringPackageKey(descriptor.catalogue),
    "genomic-covering-pigment-candidate@2",
  );
  assert.equal(
    authoringPackageLabel(descriptor.catalogue),
    "Experimental pigment candidate",
  );
  assert.deepEqual(packageInputs(descriptor), retained.input);
  assert.deepEqual(
    packageInputs(descriptor, descriptor.sceneExamples),
    retained.input,
  );
  const original = moduleSceneCatalogue();
  const allExamples = [...original.sceneExamples, ...descriptor.sceneExamples];
  assert.ok(
    packageExamples(descriptor.catalogue, allExamples).every(
      (item) => item.genome.contentVersion === 2,
    ),
  );
  assert.ok(
    packageExamples(original.catalogue, allExamples).every(
      (item) => item.genome.contentId === original.catalogue.id,
    ),
  );
  const mismatched = structuredClone(descriptor);
  mismatched.defaultGeneration.genome.contentVersion = 1;
  assert.throws(() => packageInputs(mismatched), /exact selected content/);
  descriptor.defaultGeneration.genome.loci["appearance.body-palette"][0] =
    "charcoal";
  assert.deepEqual(
    pigmentWorkbenchPackage().defaultGeneration.genome,
    retained.input.genome,
  );
});

test("optional startup waits initially but late arrival cannot override explicit intent or cancelled mount", async () => {
  assert.equal(
    candidateStartupDecision("loading", false).generateDisabled,
    true,
  );
  assert.equal(
    candidateStartupDecision("loading", true).generateDisabled,
    false,
  );
  assert.equal(
    candidateStartupDecision("unavailable", false).generateDisabled,
    false,
  );
  assert.equal(candidateStartupDecision("ready", false).selectCandidate, true);
  assert.equal(
    candidateStartupDecision("ready", false, false).selectCandidate,
    false,
  );
  for (const intention of [
    "package",
    "import",
    "generate",
    "edit",
    "draft",
    "example",
  ]) {
    let selected = "old-retained-package@1";
    let userIntent = false;
    let deliver;
    const pending = new Promise((resolve) => {
      deliver = resolve;
    }).then(() => {
      if (candidateStartupDecision("ready", userIntent).selectCandidate)
        selected = "genomic-covering-pigment-candidate@2";
    });
    userIntent = true;
    deliver();
    await pending;
    assert.equal(selected, "old-retained-package@1", intention);
  }
});

test("optional descriptors arriving after import preserve the imported exact package without duplicate choices", () => {
  const candidate = pigmentWorkbenchPackage();
  const original = moduleSceneCatalogue();
  for (const importedSource of [candidate, original]) {
    const imported = {
      catalogue: structuredClone(importedSource.catalogue),
      defaultGeneration: { genome: { retainedImport: true } },
    };
    const selected = authoringPackageKey(imported.catalogue);
    const merged = mergeOptionalPackages(
      [imported],
      [original, candidate, candidate],
    );
    const keys = merged.map((item) => authoringPackageKey(item.catalogue));
    assert.equal(keys.length, new Set(keys).size);
    assert.equal(
      merged.find((item) => authoringPackageKey(item.catalogue) === selected),
      imported,
    );
    assert.equal(merged.length, 2);
    assert.deepEqual(imported.defaultGeneration, {
      genome: { retainedImport: true },
    });
    assert.deepEqual(
      mergeOptionalPackages(merged, [original, candidate]),
      merged,
    );
  }
});

test("explicit generation/import/save failures retain only the current verified result and late dirty responses cannot publish", () => {
  const retained = retainedAuthoringFailure(candidatePacket, 7, 7);
  assert.equal(retained.packet, candidatePacket);
  assert.equal(retained.packet.prompt.text, candidatePacket.prompt.text);
  assert.equal(
    retained.packet.input.genome.origin.seed,
    candidatePacket.input.genome.origin.seed,
  );
  assert.equal(
    retained.message,
    "No new creature generated. Last successful result retained.",
  );
  assert.equal(retainedAuthoringFailure(candidatePacket, 7, 8).packet, null);
  assert.equal(retainedAuthoringFailure(null, 7, 7).packet, null);
  for (const operation of ["import", "save"]) {
    const recovery = retainedAuthoringFailure(candidatePacket, 7, 7, operation);
    assert.equal(recovery.packet, candidatePacket);
    assert.match(
      recovery.message,
      operation === "import" ? /^Import failed/ : /^Save failed/,
    );
    assert.doesNotMatch(recovery.message, /generated/);
    assert.equal(
      retainedAuthoringFailure(candidatePacket, 7, 8, operation).packet,
      null,
    );
  }
  assert.throws(
    () => retainedAuthoringFailure(candidatePacket, 7, 7, "resolve"),
    /Only generation/,
  );
  assert.equal(
    canPublishAuthoringResponse(
      { status: "resolved", result: { status: "resolved" }, input: {} },
      candidatePacket.input.catalogue,
      7,
      7,
    ),
    false,
  );
  assert.equal(
    retainedAuthoringFailure({ status: "rejected" }, 7, 7).packet,
    null,
  );
  assert.equal(
    canPublishAuthoringResponse(
      candidatePacket,
      candidatePacket.input.catalogue,
      7,
      7,
    ),
    true,
  );
  assert.equal(
    canPublishAuthoringResponse(
      candidatePacket,
      candidatePacket.input.catalogue,
      7,
      8,
    ),
    false,
  );
  assert.equal(
    canPublishAuthoringResponse(
      candidatePacket,
      moduleSceneCatalogue().catalogue,
      7,
      7,
    ),
    false,
  );
  assert.equal(
    canPublishAuthoringResponse(
      { ...candidatePacket, scene: { status: "rejected" } },
      candidatePacket.input.catalogue,
      7,
      7,
    ),
    false,
  );
});

test("existing HTTP routes generate, evaluate and replay exact candidate/old sources within unchanged bounds", async () => {
  const server = makeServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  async function post(path, body) {
    return fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  try {
    const descriptorResponse = await fetch(
      `${base}/api/module-scene/catalogue`,
    );
    assert.equal(descriptorResponse.status, 200);
    const { candidatePackage, regionalPackage, ...original } =
      await descriptorResponse.json();
    assert.deepEqual(original, moduleSceneCatalogue());
    assert.deepEqual(candidatePackage, pigmentWorkbenchPackage());
    const generateInput = {
      catalogue: candidatePackage.catalogue,
      seed: 1,
      maxAttempts: 1024,
    };
    assert.ok(Buffer.byteLength(JSON.stringify(generateInput)) < 65536);
    const generatedResponse = await post(
      "/api/module-scene/generate",
      generateInput,
    );
    assert.equal(generatedResponse.status, 200);
    const generated = await generatedResponse.json();
    assert.equal(
      canPublishAuthoringResponse(generated, candidatePackage.catalogue, 0, 0),
      true,
    );
    assert.equal(generated.generation.requestedSeed, 1);
    assert.equal(generated.generation.maxAttempts, 1024);
    assert.equal(generated.generation.attempts, 79);
    const input = packageInputs(
      candidatePackage,
      candidatePackage.sceneExamples,
    );
    const evaluatedResponse = await post("/api/module-scene/evaluate", input);
    assert.equal(evaluatedResponse.status, 200);
    const evaluated = await evaluatedResponse.json();
    assert.equal(evaluated.inputDigest, candidatePacket.inputDigest);
    assert.equal(evaluated.resultDigest, candidatePacket.resultDigest);
    assert.equal(
      evaluated.scene.sceneDigest,
      candidatePacket.scene.sceneDigest,
    );
    const compact = sceneReplayEnvelope(evaluated);
    assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 65536);
    const replayResponse = await post("/api/module-scene/replay", compact);
    assert.equal(replayResponse.status, 200);
    const replay = await replayResponse.json();
    assert.equal(replay.recordId, evaluated.recordId);
    assert.equal(replay.prompt.promptDigest, evaluated.prompt.promptDigest);
    assert.equal(replay.scene.sceneDigest, evaluated.scene.sceneDigest);
    const unknown = structuredClone(input);
    unknown.genome.loci["appearance.body-palette"][0] = "unregistered";
    assert.equal(
      (await post("/api/module-scene/evaluate", unknown)).status,
      422,
    );
    const oversized = await post("/api/module-scene/replay", {
      padding: "x".repeat(65536),
    });
    assert.equal(oversized.status, 413);
    assert.deepEqual(await oversized.json(), {
      error: "Experiment exceeds 64 KiB",
    });
    const oldInput = bodyCoveringProofCases().find(
      (item) => item.name === "single-skin",
    ).input;
    const oldEvaluated = await post("/api/module-scene/evaluate", oldInput);
    assert.equal(oldEvaluated.status, 200);
    const oldPacket = await oldEvaluated.json();
    const oldReplayResponse = await post(
      "/api/module-scene/replay",
      sceneReplayEnvelope(oldPacket),
    );
    assert.equal(oldReplayResponse.status, 200);
    const oldReplay = await oldReplayResponse.json();
    assert.equal(oldReplay.input.catalogue.id, "genomic-covering-study");
    assert.equal(oldReplay.input.catalogue.version, 1);
    assert.equal(oldReplay.recordId, oldPacket.recordId);
    assert.equal(oldReplay.scene.sceneDigest, oldPacket.scene.sceneDigest);
    assert.equal(oldReplay.prompt.promptDigest, oldPacket.prompt.promptDigest);
  } finally {
    const closed = once(server, "close");
    server.close();
    server.closeIdleConnections();
    await closed;
  }
});
