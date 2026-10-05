import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PET_CATALOGUE } from "./pet-catalogue.mjs";
import { drawAuthoringCreature } from "./presentation.mjs";
import { drawContinuousFamily } from "./family-presentation.mjs";
import {
  resolveModuleSceneAuthoring,
  compactSceneReplayEnvelope,
} from "./module-scene-authoring.mjs";
import {
  scopedLoci,
  scopedSelection,
  copyLabels,
  causalSummary,
  geometryBounds,
  sharedPreviewCamera,
  freshGenerationSeed,
  isResolvedAuthoringPacket,
  imageLedPetHandoff,
} from "./authoring-ui.mjs";

const retained = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`./evidence/pet-materials/${name}.json`, import.meta.url),
      "utf8",
    ),
  );

test("image-led pet handoff uses the exact short sentence and canonical scene/old reference without mutation", () => {
  const oldScene = JSON.parse(
    readFileSync(
      new URL(
        "evidence/inherited-pigment-experiment/mixed-fields.packet.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const currentScene = resolveModuleSceneAuthoring(oldScene.input);
  const broad = JSON.parse(
    readFileSync(
      new URL(
        "evidence/diversity-diagnosis/broad-seed-1.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const packet of [oldScene, currentScene, broad, retained("pet-skin")]) {
    const before = JSON.stringify(packet);
    const envelope = compactSceneReplayEnvelope(packet);
    const handoff = imageLedPetHandoff(packet);
    assert.equal(handoff.version, "image-led-pet/1");
    assert.equal(handoff.status, "ready");
    assert.equal(
      handoff.text,
      "Turn the attached critter into a cute digital pet, shown alone in rich high-bit pixel art.",
    );
    assert.equal(
      handoff.referenceSvg,
      packet.scene ? packet.reference.svg : packet.diagnostic,
    );
    assert.equal(handoff.sourceRecordId, packet.recordId);
    assert.equal(JSON.stringify(packet), before);
    assert.deepEqual(compactSceneReplayEnvelope(packet), envelope);
  }
  assert.equal(oldScene.prompt.projectionVersion, "module-scene-art/2");
  assert.equal(currentScene.prompt.projectionVersion, "module-scene-art/3");
});

test("image-led pet handoff blocks missing/unresolved images but audit overflow does not block a resolved source", () => {
  const scene = JSON.parse(
    readFileSync(
      new URL(
        "evidence/inherited-pigment-experiment/mixed-fields.packet.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const packet of [
    null,
    { status: "rejected" },
    { ...scene, result: { status: "rejected" } },
    { ...scene, scene: { status: "rejected" } },
    { ...scene, reference: { status: "constructed", svg: "" } },
    { ...scene, reference: { status: "constructed", svg: "not an SVG" } },
  ]) {
    const unavailable = imageLedPetHandoff(packet);
    assert.equal(unavailable.status, "unavailable");
    assert.equal(unavailable.text, "");
    assert.equal(unavailable.referenceSvg, "");
  }
  const overflow = {
    ...scene,
    prompt: {
      status: "rejected",
      error: "Semantic binding exceeds its bound",
      text: "",
    },
  };
  assert.equal(imageLedPetHandoff(overflow).status, "ready");
  assert.equal(imageLedPetHandoff(overflow).referenceSvg, scene.reference.svg);
  const noOldImage = { ...retained("pet-skin"), diagnostic: " " };
  assert.equal(imageLedPetHandoff(noOldImage).status, "unavailable");
});

test("image-led pet handoff clears on invalidation and uses only the replacement current record", () => {
  const original = retained("pet-skin");
  const replacement = retained("pet-fur");
  assert.equal(imageLedPetHandoff(original).referenceSvg, original.diagnostic);
  assert.equal(imageLedPetHandoff(null).text, "");
  assert.equal(imageLedPetHandoff(null).referenceSvg, "");
  const changed = imageLedPetHandoff(replacement);
  assert.equal(changed.sourceRecordId, replacement.recordId);
  assert.equal(changed.referenceSvg, replacement.diagnostic);
  assert.notEqual(changed.referenceSvg, original.diagnostic);
});
test("fresh generation seeds distinguish repeat presses and publication requires resolved output", () => {
  assert.equal(freshGenerationSeed(7, 7), 8);
  assert.equal(freshGenerationSeed(7, 91), 91);
  assert.equal(freshGenerationSeed(4294967295, 4294967295), 0);
  assert.throws(() => freshGenerationSeed(7, -1), /uint32/);
  assert.equal(isResolvedAuthoringPacket(retained("pet-skin")), true);
  assert.equal(
    isResolvedAuthoringPacket({
      status: "resolved",
      result: { status: "rejected" },
    }),
    false,
  );
  assert.equal(isResolvedAuthoringPacket({ status: "rejected" }), false);
  assert.equal(isResolvedAuthoringPacket(null), false);
});

test("dimension/search scope retains all records and honest empty families", () => {
  assert.equal(scopedLoci(PET_CATALOGUE).length, PET_CATALOGUE.loci.length);
  assert.equal(PET_CATALOGUE.families.length, 11);
  const structure = scopedLoci(PET_CATALOGUE, "structure");
  assert.ok(structure.length > 0);
  assert.ok(structure.every((locus) => locus.family === "structure"));
  const found = scopedLoci(PET_CATALOGUE, "all", "ocular");
  assert.ok(found.some((locus) => locus.id === "structure.ocular-size"));
  assert.equal(scopedSelection(found, "appearance.body-palette"), found[0].id);
  assert.equal(scopedSelection([], "structure.ocular-size"), null);
  const counts = PET_CATALOGUE.families.map(
    (family) => scopedLoci(PET_CATALOGUE, family.id).length,
  );
  assert.equal(
    counts.reduce((sum, count) => sum + count, 0),
    PET_CATALOGUE.loci.length,
  );
  assert.ok(counts.some((count) => count === 0));
});

test("selected copy labels and direct/dependency summary use actual retained data", () => {
  const packet = retained("pet-fur");
  const locus = PET_CATALOGUE.loci.find(
    (item) => item.id === "structure.ocular-size",
  );
  const labels = copyLabels(locus, packet.input.genome);
  assert.equal(labels.length, 2);
  assert.deepEqual(
    labels,
    packet.input.genome.loci[locus.id].map(
      (id) => locus.alleles.find((allele) => allele.id === id).label,
    ),
  );
  const cause = causalSummary(PET_CATALOGUE, packet.result, locus.id);
  assert.equal(cause.fact.locusId, locus.id);
  assert.ok(
    cause.prerequisites.some((item) => item.id === "structure.ocular-pair"),
  );
  assert.ok(cause.targets.some((item) => item.role === "ocular"));
  assert.equal(cause.coveringContext, true);
  const covering = causalSummary(
    PET_CATALOGUE,
    packet.result,
    "appearance.covering-kind",
  );
  assert.equal(covering.targets.length, 0);
  assert.equal(covering.coveringInvolvement, true);
  assert.equal(covering.coveringContext, false);
});

test("display fit includes all retained material coordinates, controls and circle components without mutation", () => {
  for (const name of ["pet-skin", "pet-scales", "pet-fur", "pet-feathers"]) {
    const result = retained(name).result;
    const before = JSON.stringify(result);
    const bounds = geometryBounds(result);
    const camera = sharedPreviewCamera([result]);
    assert.ok(camera[0] < bounds[0] && camera[1] > bounds[1]);
    assert.ok(camera[2] < bounds[2] && camera[3] > bounds[3]);
    function check(value) {
      if (!Array.isArray(value)) return;
      if (value.length === 2 && value.every(Number.isFinite)) {
        assert.ok(value[0] >= bounds[0] && value[0] <= bounds[1]);
        assert.ok(value[1] >= bounds[2] && value[1] <= bounds[3]);
      } else value.forEach(check);
    }
    for (const element of result.graph.covering.elements ?? [])
      Object.values(element.geometry).forEach(check);
    assert.equal(JSON.stringify(result), before);
  }
  const result = structuredClone(retained("pet-skin").result);
  result.graph.exterior.controls = [
    [-20, 12],
    [30, -14],
  ];
  result.graph.nodes
    .find((node) => node.role === "ocular")
    .shape.components.push({ radius: 2, offset: [40, 0] });
  const bounds = geometryBounds(result);
  assert.ok(
    bounds[0] <= -20 && bounds[1] >= 42 && bounds[2] <= -14 && bounds[3] >= 12,
  );
});

test("comparison uses one padded union and defaults preserve retained SVG bytes", () => {
  const left = retained("pet-skin");
  const right = retained("pet-face-variant");
  const camera = sharedPreviewCamera([left.result, right.result]);
  for (const packet of [left, right]) {
    const bounds = geometryBounds(packet.result);
    assert.ok(camera[0] < bounds[0] && camera[1] > bounds[1]);
    assert.ok(camera[2] < bounds[2] && camera[3] > bounds[3]);
    assert.equal(drawAuthoringCreature(packet.result), packet.diagnostic);
    assert.equal(
      drawContinuousFamily(packet.result, null, { portrait: false }),
      packet.geometryReference.svg,
    );
    assert.notEqual(
      drawAuthoringCreature(packet.result, null, { camera }),
      packet.diagnostic,
    );
  }
});

test("invalid cameras reject and invalid retained coordinates do not silently disappear", () => {
  const result = retained("pet-skin").result;
  for (const camera of [
    [0, 0, 0, 1],
    [0, 1, 2, 1],
    [0, Infinity, 0, 1],
    [0, 1],
    [0, 1e-320, 0, 1e-320],
    [-1e308, 1e308, -1e308, 1e308],
  ]) {
    assert.throws(
      () => drawContinuousFamily(result, null, { camera }),
      /positive bounds/,
    );
  }
  const malformed = structuredClone(result);
  malformed.graph.exterior.points[0][0] = Infinity;
  assert.equal(geometryBounds(malformed), null);
  assert.equal(sharedPreviewCamera([result, malformed]), null);
  assert.equal(sharedPreviewCamera([]), null);
});
