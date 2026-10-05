import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { radialSceneCases } from "./construct-radial-scene-proof.mjs";
import {
  constructRadialOcularSlice,
  constructRadialCovering,
  constructRadialScene,
} from "./radial-scene.mjs";
import {
  resolveModuleSceneAuthoring,
  compactSceneReplayEnvelope,
  replayModuleSceneAuthoring,
  generateModuleSceneAuthoring,
  projectModuleScenePrompt,
} from "./module-scene-authoring.mjs";
import {
  resolveAuthoring,
  replayAuthoring,
  digest,
} from "./authoring-adapter.mjs";
import {
  imageLedPetHandoff,
  isResolvedAuthoringPacket,
  canPublishAuthoringResponse,
  copyableAuthoringExport,
  sharedSceneCamera,
  comparisonUsesSharedCamera,
  scenePreviewMarkup,
  sceneCausalSummary,
} from "./authoring-ui.mjs";
import { drawRadialScene } from "./radial-scene-presentation.mjs";
import { generateGenome } from "./model.mjs";
import { makeServer } from "./server.mjs";
const inputs = radialSceneCases();
const packets = inputs
  .slice(0, 2)
  .map((item) => resolveModuleSceneAuthoring(item.input));
const clone = (value) => structuredClone(value);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
const read = (path) =>
  JSON.parse(
    readFileSync(new URL("evidence/" + path, import.meta.url), "utf8"),
  );

test("same resolved radial source gets complete scene3, canonical roots and independently verified components", () => {
  for (const [index, packet] of packets.entries()) {
    assert.equal(packet.status, "resolved", JSON.stringify(packet.errors));
    assert.equal(packet.sceneProjectionVersion, "module-scene/3");
    assert.equal(packet.scene.ocular.features.length, 2);
    assert.equal(
      packet.resultDigest,
      resolveAuthoring(inputs[index].input).resultDigest,
    );
    assert.equal(packet.scene.body.sourceResultDigest, packet.resultDigest);
    assert.equal(packet.scene.body.chainRoots.length, 3);
    assert.equal(packet.scene.body.body.sourceDimensions[2], 0.7);
    assert.ok(packet.reference.svg.includes("negative-X"));
    assert.ok(!packet.reference.svg.includes("root rings"));
    assert.equal(
      imageLedPetHandoff(packet).text,
      "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art.",
    );
    assert.equal(packet.prompt.promptDigest, digest(packet.prompt.text));
  }
  assert.deepEqual(packets[0].scene.body.body, packets[1].scene.body.body);
  assert.deepEqual(
    packets[0].scene.body.appendages,
    packets[1].scene.body.appendages,
  );
  const { result, scene } = packets[1];
  const forged = clone(scene.body);
  forged.body.center[0] += 0.01;
  const { constructionDigest, ...rest } = forged;
  forged.constructionDigest = digest(rest);
  assert.equal(constructRadialOcularSlice(result, forged).status, "rejected");
  const eye = clone(scene.ocular);
  eye.features[0].radius *= 0.9;
  const { moduleDigest, ...eyeRest } = eye;
  eye.moduleDigest = digest(eyeRest);
  assert.equal(
    constructRadialCovering(result, scene.body, eye).status,
    "rejected",
  );
  const fake = clone(packets[1]);
  fake.scene.covering.plates[0].rootXYZ[0] += 0.1;
  assert.throws(() => projectModuleScenePrompt(fake), /reconstructed/);
  assert.equal(
    constructRadialScene(result, { profileVersion: "module-scene/99" }).status,
    "rejected",
  );
});

test("eye radius/X and whole slice clearance are inherited; low height rejects, OFF parameters are latent", () => {
  const p = packets[0];
  const eye = p.scene.ocular.features[0];
  close(eye.radius, 0.18 * 0.9);
  close(eye.centerXYZ[0], -0.15);
  close(eye.pupilRadius, eye.radius * 0.55);
  const low = resolveModuleSceneAuthoring(inputs[2].input);
  assert.equal(low.status, "rejected");
  assert.equal(low.stage, "ocular");
  assert.equal(low.errors[0].code, "ocular-clearance");
  assert.equal(low.sourcePacket.status, "resolved");
  const relocated = clone(inputs[0].input);
  relocated.genome.loci["structure.ocular-placement"] = ["high", "high"];
  const other = resolveModuleSceneAuthoring(relocated);
  assert.equal(other.status, "resolved");
  close(other.scene.ocular.plane.x, 0.15);
  assert.deepEqual(
    other.scene.ocular.features.map((f) => f.projectedCenter),
    p.scene.ocular.features.map((f) => f.projectedCenter),
  );
  assert.notEqual(other.scene.sceneDigest, p.scene.sceneDigest);
  const off = clone(inputs[0].input);
  off.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  const changed = clone(off);
  changed.genome.loci["structure.ocular-size"] = ["high", "high"];
  changed.genome.loci["structure.ocular-placement"] = ["high", "high"];
  const a = resolveModuleSceneAuthoring(off),
    b = resolveModuleSceneAuthoring(changed);
  assert.equal(a.status, "resolved");
  assert.equal(b.status, "resolved");
  assert.deepEqual(a.scene.ocular.features, []);
  assert.deepEqual(a.scene.ocular.features, b.scene.ocular.features);
  assert.equal(
    a.reference.svg.replaceAll(a.scene.sceneDigest.slice(0, 20), "ID"),
    b.reference.svg.replaceAll(b.scene.sceneDigest.slice(0, 20), "ID"),
  );
  assert.notEqual(a.identity.inheritedDigest, b.identity.inheritedDigest);
  assert.deepEqual(a.scene.ocular.traces[0].directLocusIds, [
    "structure.ocular-pair",
  ]);
});

test("scales retain whole XYZ field, local frames, conservative exclusions, front visibility and ordered pigment fragments", () => {
  const p = packets[1],
    c = p.scene.covering,
    b = p.scene.body.body;
  assert.equal(c.plates.length, 7);
  assert.equal(c.candidateCount, c.plates.length + c.excluded.length);
  assert.equal(c.kind, "scales");
  assert.deepEqual(c.field.interval, [0.2, 0.55]);
  assert.equal(c.field.halfWidth, 0.108);
  assert.ok(c.excluded.every((item) => item.atlasOutline.length === 24));
  for (const plate of c.plates) {
    assert.equal(plate.outlineXYZ.length, 24);
    assert.equal(plate.localFrame.normal.length, 3);
    for (const point of plate.outlineXYZ) {
      close(
        point.reduce(
          (sum, value, index) =>
            sum + ((value - b.center[index]) / b.halfAxes[index]) ** 2,
          0,
        ),
        1,
      );
      assert.ok(
        point[0] >= c.field.xRange[0] - 1e-10 &&
          point[0] <= c.field.xRange[1] + 1e-10,
      );
    }
    for (const fragment of plate.visibleFragments)
      assert.ok(
        fragment.outlineXYZ.every((point) => point[0] <= b.center[0] + 1e-10),
      );
  }
  const wider = clone(inputs[1].input);
  wider.genome.loci["appearance.covering-extent"] = ["low", "high"];
  const expanded = resolveModuleSceneAuthoring(wider);
  assert.equal(expanded.status, "resolved", JSON.stringify(expanded.errors));
  assert.ok(
    expanded.scene.covering.plates.some((plate) =>
      plate.outlineXYZ.some((point) => point[0] > 0),
    ),
  );
  assert.ok(expanded.scene.covering.plates.length > c.plates.length);
  assert.ok(expanded.reference.depthInspector.includes("total plates"));
  const mixed = clone(inputs[1].input);
  mixed.genome.loci["appearance.body-palette"] = ["jade", "lagoon"];
  const reverse = clone(mixed);
  reverse.genome.loci["appearance.body-palette"].reverse();
  const a = resolveModuleSceneAuthoring(mixed),
    r = resolveModuleSceneAuthoring(reverse);
  assert.equal(a.status, "resolved");
  assert.deepEqual(a.scene.covering.plates, r.scene.covering.plates);
  assert.notEqual(a.identity.inheritedDigest, r.identity.inheritedDigest);
  assert.ok(
    a.scene.covering.plates.some(
      (plate) => plate.pigmentFragments.length === 2,
    ),
  );
  for (const plate of a.scene.covering.plates)
    for (const fragment of plate.pigmentFragments)
      assert.ok(
        fragment.outlineXYZ.every((point) =>
          fragment.paletteIndex === 0 ? point[1] <= 1e-9 : point[1] >= -1e-9,
        ),
      );
  const latent = clone(inputs[0].input);
  latent.genome.loci["appearance.covering-extent"] = ["high", "high"];
  latent.genome.loci["appearance.covering-scale"] = ["low", "low"];
  const skin = resolveModuleSceneAuthoring(latent);
  assert.deepEqual(skin.scene.covering.plates, []);
  assert.deepEqual(skin.scene.covering.traces[0].directLocusIds, [
    "appearance.covering-kind",
  ]);
  assert.deepEqual(skin.scene.covering.traces[0].dependencyLocusIds, []);
});

test("malformed/unknown metadata and nonfinite/candidate/plate/empty source bounds reject atomically", () => {
  const source = packets[1].result;
  assert.equal(constructRadialScene(null).status, "rejected");
  for (const options of [
    null,
    { profileVersion: "module-scene/3", unknown: true },
  ])
    assert.equal(constructRadialScene(source, options).status, "rejected");
  const wrong = clone(source);
  wrong.ocularModuleRuleVersion = "ocular-module/99";
  assert.equal(constructRadialScene(wrong).status, "rejected");
  for (const value of [NaN, Infinity, 1e-12]) {
    const changed = clone(source);
    changed.facts.find((f) => f.id === "coveringScale").value = value;
    const out = constructRadialScene(changed);
    assert.equal(out.status, "rejected");
    assert.ok(!out.sceneDigest && !out.covering);
  }
  const empty = clone(source);
  empty.facts.find((f) => f.id === "coveringExtent").value = 0.001;
  const output = constructRadialScene(empty);
  assert.equal(output.status, "rejected");
  assert.equal(output.errors[0].code, "covering-empty-field");
});

test("scene3 compact transport, exact replay/tamper and existing UI revision/export/camera/copy guards", () => {
  for (const p of packets) {
    const envelope = compactSceneReplayEnvelope(p);
    assert.ok(Buffer.byteLength(JSON.stringify(envelope)) < 65536);
    assert.deepEqual(copyableAuthoringExport(p), envelope);
    const replay = replayModuleSceneAuthoring(envelope);
    assert.equal(replay.status, "resolved");
    assert.equal(replay.scene.sceneDigest, p.scene.sceneDigest);
    assert.equal(replay.reference.svg, p.reference.svg);
    assert.equal(replay.prompt.text, p.prompt.text);
    assert.ok(canPublishAuthoringResponse(p, p.input.catalogue, 7, 7));
    assert.ok(!canPublishAuthoringResponse(p, p.input.catalogue, 7, 8));
    assert.ok(isResolvedAuthoringPacket(p));
    assert.equal(imageLedPetHandoff(null).status, "unavailable");
    for (const key of ["sceneDigest", "promptDigest"]) {
      const bad = clone(envelope);
      bad[key] = "0".repeat(64);
      assert.equal(replayModuleSceneAuthoring(bad).status, "rejected");
    }
  }
  const camera = sharedSceneCamera(packets);
  assert.ok(camera);
  assert.equal(
    comparisonUsesSharedCamera(packets[0], packets[1], camera),
    true,
  );
  const a = scenePreviewMarkup(packets[0], camera),
    b = scenePreviewMarkup(packets[1], camera);
  assert.equal(
    a.match(/data-world-scale="([^"]+)"/)[1],
    b.match(/data-world-scale="([^"]+)"/)[1],
  );
  const axial = read("regional-scene-workbench/regional-eyes-skin.packet.json");
  const incompatibleCamera = sharedSceneCamera([packets[0], axial]);
  assert.equal(incompatibleCamera, null);
  assert.equal(packets[0].ruleVersion, axial.ruleVersion);
  assert.equal(
    comparisonUsesSharedCamera(packets[0], axial, incompatibleCamera),
    false,
  );
  const legacy = {
    ruleVersion: "continuous-static/1",
    result: { graph: { exterior: {} } },
  };
  assert.equal(comparisonUsesSharedCamera(legacy, legacy, null), true);
  assert.equal(
    comparisonUsesSharedCamera(
      legacy,
      { ...legacy, ruleVersion: "other" },
      null,
    ),
    false,
  );
  assert.ok(sceneCausalSummary(packets[0].scene, "structure.body-height").body);
});

test("strict old scene1/2 recipes and graph-radial1 construction remain exact", () => {
  for (const path of [
    "inherited-pigment-experiment/mixed-fields.packet.json",
    "regional-scene-workbench/regional-eyes-skin.packet.json",
  ]) {
    const packet = read(path);
    const replay = replayModuleSceneAuthoring(
      compactSceneReplayEnvelope(packet),
    );
    assert.equal(replay.status, "resolved", JSON.stringify(replay.errors));
    assert.equal(replay.scene.sceneDigest, packet.scene.sceneDigest);
    assert.equal(replay.reference.svg, packet.reference.svg);
    assert.equal(replay.prompt.text, packet.prompt.text);
  }
  const old = read("radial-source-proof/radial-contact-base.packet.json");
  assert.equal(replayAuthoring(old).resultDigest, old.resultDigest);
  const construction = read(
    "radial-source-proof/radial-contact-base.construction.json",
  );
  const source = resolveAuthoring(old.input);
  const off = constructRadialScene(source.result);
  assert.equal(off.status, "constructed");
  assert.deepEqual(off.body, construction);
});

test("existing sampler still accounts for one total raw draw and never repairs copies", () => {
  const input = inputs[0].input;
  const generated = generateModuleSceneAuthoring(input.catalogue, 1, {
    maxAttempts: 1,
  });
  assert.equal(generated.generation.attempts, 1);
  assert.deepEqual(generated.generation.seedSequence, [1]);
  if (generated.status === "resolved") {
    const original = generateGenome(input.catalogue, 1, { maxAttempts: 1 });
    assert.deepEqual(generated.input.genome, original.genome);
  } else assert.equal(generated.errors[0].code, "generation-exhausted");
  assert.equal(
    generateModuleSceneAuthoring(input.catalogue, 1, { maxAttempts: 1025 })
      .status,
    "rejected",
  );
});

test("actual unchanged HTTP evaluate/replay bound handles scene3 and rejects oversized envelopes", async () => {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = "http://127.0.0.1:" + server.address().port;
  try {
    const request = async (route, input) =>
      fetch(url + route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    const evaluated = await request(
      "/api/module-scene/evaluate",
      inputs[1].input,
    );
    assert.equal(evaluated.status, 200);
    const packet = await evaluated.json();
    assert.equal(packet.sceneProjectionVersion, "module-scene/3");
    const replay = await request(
      "/api/module-scene/replay",
      compactSceneReplayEnvelope(packet),
    );
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).reference.svg, packet.reference.svg);
    const oversized = await request("/api/module-scene/replay", {
      padding: "x".repeat(65537),
    });
    assert.equal(oversized.status, 413);
    await oversized.json();
    const again = await request(
      "/api/module-scene/replay",
      compactSceneReplayEnvelope(packet),
    );
    assert.equal(again.status, 200);
    await again.json();
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
