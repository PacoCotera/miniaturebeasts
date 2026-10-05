import test from "node:test";
import assert from "node:assert/strict";
import { PET_CATALOGUE } from "./pet-catalogue.mjs";
import { petCases } from "./pet-fixtures.mjs";
import { familyCases } from "./family-fixtures.mjs";
import { evaluateGenome, validateCatalogue } from "./model.mjs";
import {
  resolveAuthoring,
  replayAuthoring,
  digest,
  projectArtPrompt,
} from "./authoring-adapter.mjs";
import {
  internPetSources,
  expandPetSources,
  internElementCoordinates,
  expandElementCoordinates,
} from "./pet-projection.mjs";
import {
  drawContinuousFamily,
  continuousReference,
} from "./family-presentation.mjs";

test("portrait display is a whole-subject mapping while canonical reference remains XY", () => {
  const result = evaluate(petCases()[2]);
  assert.match(drawContinuousFamily(result), /data-view="pageX=-Y,pageY=X"/);
  const reference = continuousReference(result, {});
  assert.doesNotMatch(reference.svg, /rotate\(90\)/);
  assert.equal(
    reference.svg,
    drawContinuousFamily(result, null, { portrait: false }),
  );
  assert.deepEqual(reference.manifest.exterior, result.graph.exterior);
});

test("element budget rejects without repair and absent ocular material ignores inactive ratios", () => {
  const item = structuredClone(petCases()[2]);
  item.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  item.genome.loci["structure.oral-opening"] = ["off", "off"];
  const initial = evaluate(item);
  assert.equal(initial.status, "resolved");
  for (const id of [
    "structure.ocular-placement",
    "structure.ocular-size",
    "structure.ocular-separation",
    "structure.pupil-ratio",
  ])
    item.genome.loci[id] = ["high", "high"];
  assert.deepEqual(evaluate(item).graph, initial.graph);
  item.genome.loci["structure.body-length"] = ["high", "high"];
  item.genome.loci["appearance.covering-scale"] = ["low", "low"];
  const before = JSON.stringify(item);
  assert.equal(evaluate(item).errors[0].code, "pet-covering-budget");
  assert.equal(JSON.stringify(item), before);
});

test("source dictionary round-trips every value and rejects malformed references", () => {
  const result = evaluate(petCases()[2]);
  const encoded = internPetSources(result);
  assert.deepEqual(expandPetSources(encoded), result);
  assert.ok(
    Buffer.byteLength(JSON.stringify(encoded)) <
      Buffer.byteLength(JSON.stringify(result)),
  );
  for (const corrupt of [
    (value) => value.groups.push(value.groups[0]),
    (value) => value.locusIds.push(value.locusIds[0]),
    (value) => value.groups[0].push(9999),
    (value) => (value.body.graph.nodes[0].sources.$locusGroup = 9999),
  ]) {
    const copy = structuredClone(encoded);
    corrupt(copy);
    assert.throws(() => expandPetSources(copy));
  }
});
test("cross-bound coordinate tuples reconstruct exact material geometry and reject dangling indices", () => {
  for (const item of petCases().slice(2, 4)) {
    const packet = resolveAuthoring({
      catalogue: item.catalogue,
      genome: item.genome,
      context: item.context,
    });
    const surface = JSON.parse(packet.prompt.bindings.surfaceFacts).covering;
    const proportion = JSON.parse(packet.prompt.bindings.proportionFacts);
    assert.equal(
      surface.coordinateValuesBinding,
      "proportionFacts.coveringCoordinateValues",
    );
    const envelope = {
      encoding: surface.coordinateEncoding,
      coordinateValues: proportion.coveringCoordinateValues,
      geometries: surface.elements.map((row) => row.at(-1)),
    };
    assert.deepEqual(
      expandElementCoordinates(envelope),
      packet.result.graph.covering.elements.map((element) => element.geometry),
    );
    const bad = internElementCoordinates(packet.result.graph.covering.elements);
    bad.geometries[0] = { points: [99999] };
    assert.throws(() => expandElementCoordinates(bad), /Dangling/);
  }
});

const evaluate = (item) =>
  evaluateGenome(item.catalogue, item.genome, item.context);
test("pet materials retain actual distinct finite rooted geometry and unchanged facial copies", () => {
  const cases = petCases();
  assert.equal(PET_CATALOGUE.loci.length, 62);
  assert.equal(validateCatalogue(PET_CATALOGUE).valid, true);
  const results = cases.map(evaluate);
  results.forEach((result) => assert.equal(result.status, "resolved"));
  const face = (result) =>
    result.graph.nodes.filter((node) =>
      ["ocular", "oral-aperture"].includes(node.role),
    );
  results
    .slice(1, 4)
    .forEach((result) => assert.deepEqual(face(result), face(results[0])));
  assert.equal(results[0].graph.covering.plates.length, 0);
  assert.ok(results[1].graph.covering.plates.length > 0);
  const fur = results[2].graph.covering;
  const feathers = results[3].graph.covering;
  assert.ok(fur.elements.some((element) => element.contour));
  assert.ok(fur.elements.length <= 64);
  assert.ok(feathers.elements.length <= 48);
  fur.elements.forEach((element) =>
    assert.equal(element.geometry.filaments.length, 3),
  );
  feathers.elements.forEach((element) => {
    assert.equal(element.geometry.shaft.length, 2);
    assert.equal(element.geometry.vanes.length, 2);
    assert.equal(element.geometry.barbs.length, 6);
  });
  for (const result of results.slice(2, 4))
    for (const element of result.graph.covering.elements) {
      assert.ok(element.root.every(Number.isFinite));
      const palette = result.graph.surfaces[0].palette;
      assert.equal(
        element.pigment,
        palette[element.atlasU < 0.5 ? 0 : Math.min(1, palette.length - 1)],
      );
    }
});
test("face-only comparison changes actual ocular size/pupil, preserves body/material and suppresses inactive targets", () => {
  const [base, , , , variant] = petCases();
  const a = evaluate(base),
    b = evaluate(variant);
  assert.deepEqual(a.graph.exterior, b.graph.exterior);
  assert.deepEqual(a.graph.covering, b.graph.covering);
  assert.notDeepEqual(
    a.graph.nodes.find((node) => node.role === "ocular").shape,
    b.graph.nodes.find((node) => node.role === "ocular").shape,
  );
  const off = structuredClone(base);
  off.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  const noEyes = evaluate(off);
  assert.equal(noEyes.status, "resolved");
  assert.equal(
    noEyes.graph.nodes.filter((node) => node.role === "ocular").length,
    0,
  );
  for (const id of [
    "ocularSize",
    "ocularSeparation",
    "pupilRatio",
    "ocularPlacement",
  ])
    assert.equal(noEyes.facts.find((fact) => fact.id === id).state, "inactive");
  off.genome.loci["structure.ocular-placement"] = ["high", "high"];
  assert.deepEqual(evaluate(off).graph, noEyes.graph);
});
test("new profile retains valid five stations and rejects impossible geometry without changing input", () => {
  const example = petCases()[0];
  const five = structuredClone(example);
  five.genome.loci["development.axial-repeat"] = ["chain", "chain"];
  five.genome.loci["structure.body-length"] = ["high", "high"];
  assert.equal(evaluate(five).status, "resolved");
  assert.equal(evaluate(five).graph.exterior.stations.length, 5);
  const invalid = structuredClone(example);
  invalid.genome.loci["structure.ocular-placement"] = ["low", "low"];
  const before = JSON.stringify(invalid);
  assert.equal(evaluate(invalid).status, "rejected");
  assert.equal(JSON.stringify(invalid), before);
  const malformed = structuredClone(PET_CATALOGUE);
  malformed.loci[0] = null;
  assert.equal(validateCatalogue(malformed).valid, false);
});
test("pet replay and source projection require actual engine authority; expression does not reroll topology", () => {
  for (const item of petCases()) {
    const input = {
      catalogue: item.catalogue,
      genome: item.genome,
      context: item.context,
    };
    const packet = resolveAuthoring(input);
    assert.equal(packet.status, "resolved");
    assert.ok(packet.prompt.text.length > 0);
    assert.equal(replayAuthoring(packet).resultDigest, packet.resultDigest);
    assert.equal(digest(resolveAuthoring(input).result), packet.resultDigest);
    const rerun = resolveAuthoring({ ...input, expressionSeed: 13 });
    assert.deepEqual(rerun.result.graph.exterior, packet.result.graph.exterior);
    assert.deepEqual(rerun.result.graph.covering, packet.result.graph.covering);
    const forged = structuredClone(packet);
    forged.result.graph.nodes[0].dimensions[0] = 99;
    forged.resultDigest = digest(forged.result);
    assert.throws(() => projectArtPrompt(forged), /engine replay/);
  }
});
test("frozen continuous-static retained result digests remain exact", () => {
  const expected = [
    "32ff3824be42f5434113b6cacf195848c804bb41765d9dd0e20362834c316ccf",
    "dac8206cb059cb033b330937286c334e4352fcfb943f16a064f61737ebf4a4f2",
    "040807fa19b3cfecfa7bf04075b42c910f1fff9e28dea48bae73ad617c52587e",
  ];
  familyCases().forEach((item, index) =>
    assert.equal(digest(evaluate(item)), expected[index]),
  );
});
