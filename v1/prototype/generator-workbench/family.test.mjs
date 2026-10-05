import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FAMILY_CATALOGUE } from "./family-catalogue.mjs";
import { evaluateGenome, generateGenome, validateCatalogue } from "./model.mjs";
import {
  resolveAuthoring,
  replayAuthoring,
  projectArtPrompt,
  digest,
} from "./authoring-adapter.mjs";
import { familyCases } from "./family-fixtures.mjs";
import { drawAuthoringCreature } from "./presentation.mjs";

const cases = familyCases();
const evaluate = (genome = cases[0].genome, expressionSeed = null) =>
  evaluateGenome(FAMILY_CATALOGUE, genome, cases[0].context, {
    expressionSeed,
  });
const packetFor = (item) =>
  resolveAuthoring({
    catalogue: item.catalogue,
    genome: item.genome,
    context: item.context,
  });
const change = (id, copies) => {
  const genome = structuredClone(cases[0].genome);
  genome.loci[id] = copies;
  return evaluate(genome);
};
function onBoundary(point, polygon) {
  return polygon.some((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const cross =
      (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
    return (
      Math.abs(cross) < 1e-6 &&
      point[0] >= Math.min(a[0], b[0]) - 1e-6 &&
      point[0] <= Math.max(a[0], b[0]) + 1e-6 &&
      point[1] >= Math.min(a[1], b[1]) - 1e-6 &&
      point[1] <= Math.max(a[1], b[1]) + 1e-6
    );
  });
}
function inside(point, polygon) {
  if (onBoundary(point, polygon)) return true;
  let included = false;
  for (
    let index = 0, previous = polygon.length - 1;
    index < polygon.length;
    previous = index++
  ) {
    const a = polygon[index];
    const b = polygon[previous];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      included = !included;
  }
  return included;
}

test("complete family inputs are distinct controlled variants with solved connected construction", () => {
  assert.equal(validateCatalogue(FAMILY_CATALOGUE).valid, true);
  assert.equal(FAMILY_CATALOGUE.loci.length, 58);
  assert.equal(
    FAMILY_CATALOGUE.loci.filter((locus) => locus.status === "validated")
      .length,
    50,
  );
  const packets = cases.map(packetFor);
  assert.ok(packets.every((packet) => packet.status === "resolved"));
  assert.equal(new Set(packets.map((packet) => packet.inputDigest)).size, 3);
  for (const packet of packets) {
    const graph = packet.result.graph;
    assert.equal(
      graph.nodes.filter((node) => node.role === "volume").length,
      5,
    );
    assert.equal(
      graph.nodes.filter((node) => node.role === "tissue-join").length,
      4,
    );
    assert.equal(graph.rootAnchors.length, 6);
    assert.equal(
      graph.nodes.filter((node) => node.role === "ocular").length,
      2,
    );
    assert.equal(
      graph.nodes.filter((node) => node.role === "oral-aperture").length,
      1,
    );
    assert.equal(graph.edges.length, graph.nodes.length - 1);
    const visited = new Set([graph.nodes[0].id]);
    for (let pass = 0; pass < graph.nodes.length; pass++)
      for (const edge of graph.edges) {
        if (visited.has(edge.from)) visited.add(edge.to);
        if (visited.has(edge.to)) visited.add(edge.from);
      }
    assert.equal(visited.size, graph.nodes.length);
    for (const anchor of graph.rootAnchors) {
      assert.ok(onBoundary(anchor.position, graph.exterior.points));
      assert.ok(
        anchor.chord.every((point) => onBoundary(point, graph.exterior.points)),
      );
      const fin = graph.nodes.find((node) => node.id === anchor.nodeId);
      assert.ok(!inside(fin.shape.points.at(-1), graph.exterior.points));
    }
    assert.ok(
      graph.nodes.every((node) =>
        node.dimensions.every((value) => Number.isFinite(value) && value > 0),
      ),
    );
    for (const plate of graph.covering.plates)
      assert.ok(
        plate.points.every((point) => inside(point, graph.exterior.points)),
      );
  }
  assert.notDeepEqual(
    packets[0].result.graph.exterior,
    packets[1].result.graph.exterior,
  );
  assert.equal(packets[0].result.graph.covering.plates.length, 0);
  assert.ok(packets[2].result.graph.covering.plates.length > 0);
});

test("new loci produce justified geometry changes and feature suppression retains inherited copies", () => {
  const base = evaluate();
  const neck = change("structure.join-neck-ratio", ["low", "low"]);
  assert.equal(neck.status, "resolved");
  assert.notDeepEqual(neck.graph.exterior.points, base.graph.exterior.points);
  const tip = change("structure.fin-tip-position", ["high", "high"]);
  assert.notDeepEqual(
    tip.graph.nodes.find((node) => node.role === "fin").shape.points,
    base.graph.nodes.find((node) => node.role === "fin").shape.points,
  );
  assert.deepEqual(tip.graph.exterior, base.graph.exterior);
  const noEyes = change("structure.ocular-pair", ["absent", "absent"]);
  assert.equal(
    noEyes.graph.nodes.filter((node) => node.role === "ocular").length,
    0,
  );
  assert.equal(
    noEyes.facts.find((fact) => fact.id === "ocularPlacement").state,
    "inactive",
  );
  assert.deepEqual(
    noEyes.facts.find((fact) => fact.id === "ocularPair").copies,
    ["absent", "absent"],
  );
  const placement = change("structure.ocular-placement", ["low", "low"]);
  assert.notDeepEqual(
    placement.graph.nodes.find((node) => node.role === "ocular").position,
    base.graph.nodes.find((node) => node.role === "ocular").position,
  );
  assert.deepEqual(placement.graph.exterior, base.graph.exterior);
  assert.equal(
    change("structure.oral-opening", ["off", "off"]).graph.nodes.filter(
      (node) => node.role === "oral-aperture",
    ).length,
    0,
  );
  const skin = base.facts.find((fact) => fact.id === "coveringScale");
  assert.equal(skin.state, "inactive");
  assert.deepEqual(
    change("appearance.covering-scale", ["low", "low"]).graph,
    base.graph,
  );
  const scales = change("appearance.covering-kind", ["scales", "scales"]);
  assert.ok(scales.graph.covering.plates.length > 0);
  assert.deepEqual(scales.graph.exterior, base.graph.exterior);
  const restricted = structuredClone(cases[0].genome);
  restricted.loci["appearance.covering-kind"] = ["scales", "scales"];
  restricted.loci["appearance.covering-extent"] = ["low", "low"];
  const reduced = evaluate(restricted);
  assert.ok(
    reduced.graph.covering.plates.length < scales.graph.covering.plates.length,
  );
  restricted.loci["appearance.covering-scale"] = ["low", "low"];
  const smaller = evaluate(restricted);
  assert.equal(smaller.status, "resolved");
  assert.notDeepEqual(
    smaller.graph.covering.plates,
    reduced.graph.covering.plates,
  );
});

test("smooth solved shoulders preserve extrema and plate pigments share the continuous body atlas", () => {
  const genome = structuredClone(cases[2].genome);
  genome.loci["appearance.body-palette"] = ["charcoal", "russet"];
  const result = evaluate(genome);
  assert.equal(result.status, "resolved");
  const { upper, extrema } = result.graph.exterior;
  for (const extremum of extrema)
    assert.ok(
      upper.some(
        (point) => point[0] === extremum[0] && point[1] === extremum[1],
      ),
    );
  for (let index = 1; index < extrema.length; index++) {
    const [a, b] = [extrema[index - 1], extrema[index]];
    const segment = upper.filter(
      (point) => point[0] >= a[0] && point[0] <= b[0],
    );
    assert.ok(
      segment.every(
        (point) =>
          point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]),
      ),
    );
  }
  const svg = drawAuthoringCreature(result);
  assert.equal(
    (svg.match(/data-mask="body-high-u"/g) ?? []).length,
    result.graph.covering.plates.length,
  );
  assert.ok(
    result.coverage
      .find((family) => family.id === "appearance")
      .indirectContributors.includes("structure.join-neck-ratio"),
  );
  assert.ok(
    result.coverage
      .find((family) => family.id === "mechanics-movement")
      .indirectContributors.includes("energy.actuator-capacity"),
  );
});

test("family determinism, expression independence, replay authority and bounded art hold", () => {
  for (const item of cases) {
    const packet = packetFor(item);
    assert.equal(
      digest(evaluateGenome(item.catalogue, item.genome, item.context)),
      packet.resultDigest,
    );
    assert.equal(replayAuthoring(packet).replay.verified, true);
    assert.equal(
      packet.prompt.status,
      "fact-derived calibration prompt; no provider called",
    );
    assert.ok(packet.prompt.text.length <= 32768);
    const sampled = evaluateGenome(item.catalogue, item.genome, item.context, {
      expressionSeed: 23,
    });
    assert.deepEqual(sampled.graph.exterior, packet.result.graph.exterior);
    assert.deepEqual(
      sampled.graph.rootAnchors,
      packet.result.graph.rootAnchors,
    );
    assert.deepEqual(sampled.graph.covering, packet.result.graph.covering);
    assert.deepEqual(sampled.motion, packet.result.motion);
    const forged = structuredClone(packet);
    forged.result.graph.exterior.points[0][0] -= 0.1;
    forged.resultDigest = digest(forged.result);
    assert.throws(() => projectArtPrompt(forged), /shared engine replay/);
  }
});

test("invalid new construction and unsupported rules reject without altering genomes", () => {
  for (const [id, copies] of [
    ["development.symmetry", ["radial", "radial"]],
    ["development.axial-repeat", ["single", "single"]],
    ["development.fin-rooting", ["off", "off"]],
    ["development.articulated-chain", ["linked", "linked"]],
    ["development.membrane-rooting", ["on", "on"]],
    ["structure.fin-span", ["high", "high"]],
  ]) {
    const genome = structuredClone(cases[0].genome);
    genome.loci[id] = copies;
    const retained = structuredClone(genome);
    assert.equal(evaluate(genome).status, "rejected", id);
    assert.deepEqual(genome, retained);
  }
  const unknown = structuredClone(FAMILY_CATALOGUE);
  unknown.ruleVersion = "unknown-profile/1";
  assert.equal(validateCatalogue(unknown).valid, false);
  assert.equal(
    evaluate({ ...cases[0].genome, class: "fish" }).status,
    "rejected",
  );
  const malformed = structuredClone(FAMILY_CATALOGUE);
  malformed.loci[0] = null;
  assert.equal(validateCatalogue(malformed).valid, false);
});

test("bounded family generation retains exact random draws and finite valid geometry", () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const result = generateGenome(FAMILY_CATALOGUE, seed, {
      maxAttempts: 1024,
    });
    assert.equal(result.status, "generated");
    assert.deepEqual(
      result,
      generateGenome(FAMILY_CATALOGUE, seed, { maxAttempts: 1024 }),
    );
    assert.equal(evaluate(result.genome).status, "resolved");
  }
});

test("original retained result digests and old axial authority remain exact", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("evidence/authoring/manifest.json", import.meta.url),
      "utf8",
    ),
  );
  for (const item of manifest.cases) {
    const original = JSON.parse(
      await readFile(
        new URL(`evidence/authoring/${item.name}.json`, import.meta.url),
        "utf8",
      ),
    );
    if (original.status !== "resolved") continue;
    const regenerated = resolveAuthoring(original.input);
    assert.equal(regenerated.inputDigest, original.inputDigest, item.name);
    assert.equal(regenerated.resultDigest, original.resultDigest, item.name);
  }
  const axial = JSON.parse(
    await readFile(
      new URL("evidence/authoring/axial-original.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(
    axial.inputDigest,
    "91772e59baf3d1e490b58b064b7c5bc0e20a9018d82a9e76e7e93be6def9c4e7",
  );
  assert.equal(
    resolveAuthoring(axial.input).resultDigest,
    "745c402b682206ff871a66c48315416b9b02df493a9f4d8de6dd12ef9c2ebd53",
  );
});

test("shared camera and disjoint clip namespaces preserve comparable family views", () => {
  const definitions = [];
  for (const item of cases) {
    const packet = packetFor(item);
    assert.deepEqual(
      packet.geometryReference.manifest.projection.referenceCamera,
      FAMILY_CATALOGUE.constructionRules.profile.referenceCamera,
    );
    const source = drawAuthoringCreature(
      packet.result,
      "structure.join-neck-ratio",
    );
    assert.ok(source.includes('stroke="#d78932"'));
    definitions.push(
      [...source.matchAll(/<clipPath id="([^"]+)"/g)].map((match) => match[1]),
    );
  }
  assert.equal(new Set(definitions.flat()).size, definitions.flat().length);
});
