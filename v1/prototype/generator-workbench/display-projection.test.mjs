import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { AUTHORING_CATALOGUE, REFERENCE_CONTEXT } from "./catalogue.mjs";
import { PET_CATALOGUE } from "./pet-catalogue.mjs";
import { petCases } from "./pet-fixtures.mjs";
import { generateGenome, evaluateGenome } from "./model.mjs";
import { drawAuthoringCreature } from "./presentation.mjs";
import {
  drawContinuousFamily,
  continuousReference,
  SURFACE_DETAIL_PROJECTION_VERSION,
} from "./family-presentation.mjs";
import {
  initialAuthoringInputs,
  authoringPackageLabel,
  unconsumedOutputNotice,
} from "./authoring-ui.mjs";

const detail = { projectionVersion: SURFACE_DETAIL_PROJECTION_VERSION };
const retained = (path) =>
  JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const normalizeNamespace = (svg) =>
  svg.replace(/continuous-[0-9a-f]+/g, "continuous-record");
function petResult(changes) {
  const input = structuredClone(petCases()[0]);
  Object.assign(input.genome.loci, changes);
  const result = evaluateGenome(PET_CATALOGUE, input.genome, input.context);
  assert.equal(result.status, "resolved");
  return result;
}

test("broad authoring is the initial package and seeds1/21 construct contrasting roles", () => {
  const generations = [1, 21].map((seed) =>
    generateGenome(AUTHORING_CATALOGUE, seed),
  );
  const initial = initialAuthoringInputs({
    catalogue: AUTHORING_CATALOGUE,
    defaultGeneration: generations[0],
    referenceContext: REFERENCE_CONTEXT,
    packages: [{ catalogue: PET_CATALOGUE }],
  });
  assert.equal(initial.catalogue.id, AUTHORING_CATALOGUE.id);
  assert.equal(initial.genome.contentId, AUTHORING_CATALOGUE.id);
  assert.match(authoringPackageLabel(PET_CATALOGUE), /Narrow/);
  assert.match(
    unconsumedOutputNotice(PET_CATALOGUE, "movement.turn-control"),
    /no implemented/,
  );
  assert.match(
    unconsumedOutputNotice(
      { ruleVersion: "continuous-static/1" },
      "movement.turn-control",
    ),
    /no implemented/,
  );
  assert.equal(
    unconsumedOutputNotice(AUTHORING_CATALOGUE, "movement.turn-control"),
    "",
  );
  assert.match(
    unconsumedOutputNotice(AUTHORING_CATALOGUE, "energy.reserve-capacity"),
    /no implemented/,
  );
  const clipIds = [];
  const roles = generations.map((generation) => {
    assert.equal(generation.status, "generated");
    const result = evaluateGenome(
      AUTHORING_CATALOGUE,
      generation.genome,
      REFERENCE_CONTEXT,
    );
    assert.equal(result.status, "resolved");
    const counts = Object.fromEntries(
      ["volume", "link", "contact-link", "membrane", "fin"].map((role) => [
        role,
        result.graph.nodes.filter((node) => node.role === role).length,
      ]),
    );
    const svg = drawAuthoringCreature(result, null, detail);
    assert.match(svg, /data-projection="surface-detail\/1"/);
    clipIds.push(
      [...svg.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]),
    );
    return counts;
  });
  assert.deepEqual(roles, [
    { volume: 3, link: 3, "contact-link": 3, membrane: 3, fin: 0 },
    { volume: 3, link: 0, "contact-link": 0, membrane: 2, fin: 2 },
  ]);
  assert.ok(clipIds[0].length > 0 && clipIds[1].length > 0);
  assert.ok(clipIds[0].every((id) => !clipIds[1].includes(id)));
});

test("canonical broad and continuous diagnostic/reference bytes remain exact", () => {
  for (const path of [
    "./evidence/authoring/contact-original.json",
    "./evidence/pet-materials/pet-skin.json",
  ]) {
    const packet = retained(path);
    assert.equal(drawAuthoringCreature(packet.result), packet.diagnostic);
    if (packet.result.graph.exterior)
      assert.equal(
        continuousReference(packet.result, {}).svg,
        packet.geometryReference.svg,
      );
    const before = JSON.stringify(packet);
    drawAuthoringCreature(packet.result, null, detail);
    assert.equal(JSON.stringify(packet), before);
  }
});

test("continuous texture is a clipped versioned depiction without canonical changes", () => {
  const smooth = petResult({
    "appearance.surface-texture": ["smooth", "smooth"],
  });
  const ridged = petResult({
    "appearance.surface-texture": ["ridged", "ridged"],
  });
  assert.equal(
    normalizeNamespace(drawContinuousFamily(smooth)),
    normalizeNamespace(drawContinuousFamily(ridged)),
  );
  const smoothView = drawContinuousFamily(smooth, null, detail);
  const ridgedView = drawContinuousFamily(ridged, null, detail);
  assert.doesNotMatch(smoothView, /data-texture=/);
  assert.equal(
    (ridgedView.match(/data-texture="fine-ridged"/g) ?? []).length,
    28,
  );
  assert.match(
    ridgedView,
    /clip-path="url\(#continuous-.*-surface-detail-1-continuous-body\)/,
  );
  assert.notEqual(
    normalizeNamespace(smoothView),
    normalizeNamespace(ridgedView),
  );
});

test("retained anisotropic patch orientation is drawn only by the selected version", () => {
  const changes = {
    "appearance.marking-switch": ["on", "on"],
    "appearance.marking-layout": ["patches", "patches"],
  };
  for (const kind of ["continuous", "broad"]) {
    const result = (orientation) => {
      const copies = {
        ...changes,
        "appearance.marking-orientation": [orientation, orientation],
      };
      if (kind === "continuous") return petResult(copies);
      const genome = generateGenome(AUTHORING_CATALOGUE, 1).genome;
      Object.assign(genome.loci, copies);
      const value = evaluateGenome(
        AUTHORING_CATALOGUE,
        genome,
        REFERENCE_CONTEXT,
      );
      assert.equal(value.status, "resolved");
      return value;
    };
    const low = result("low"),
      high = result("high");
    assert.equal(
      normalizeNamespace(drawAuthoringCreature(low)),
      normalizeNamespace(drawAuthoringCreature(high)),
    );
    const lowView = drawAuthoringCreature(low, null, detail),
      highView = drawAuthoringCreature(high, null, detail);
    assert.notEqual(normalizeNamespace(lowView), normalizeNamespace(highView));
    assert.match(lowView, /<ellipse[^>]+transform="rotate\(/);
  }
});

test("unknown display versions reject for broad and continuous views", () => {
  const continuous = retained("./evidence/pet-materials/pet-skin.json").result;
  const broad = retained("./evidence/authoring/contact-original.json").result;
  for (const result of [continuous, broad])
    assert.throws(
      () =>
        drawAuthoringCreature(result, null, {
          projectionVersion: "future/999",
        }),
      /Unsupported diagnostic/,
    );
});
