import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  radialSourceCases,
  resolveRadialSource,
} from "./construct-radial-proof.mjs";
import { constructRadialGraphSource } from "./graph-radial-construction.mjs";
import {
  drawRadialGraphSource,
  commonRadialSourceCamera,
  drawRadialComparison,
} from "./graph-radial-presentation.mjs";
import {
  resolveAuthoring,
  replayAuthoring,
  digest,
} from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import {
  compactSceneReplayEnvelope,
  replayModuleSceneAuthoring,
} from "./module-scene-authoring.mjs";

const options = {
  profileVersion: "graph-radial/1",
  sourceRuleVersion: "developmental-regional-scene/1",
};
const cases = radialSourceCases();
const results = cases.map((item) => resolveRadialSource(item.input));
const distance = (a, b) =>
  Math.hypot(...a.map((value, index) => value - b[index]));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-10, `${a} != ${b}`);
const geometryMaterial = (construction) => ({
  body: construction.body,
  roots: construction.chainRoots,
  appendages: construction.appendages,
  surfaces: construction.surfaces,
  bounds: construction.bounds,
});
const read = (folder, name) =>
  JSON.parse(
    readFileSync(
      new URL(`evidence/${folder}/${name}`, import.meta.url),
      "utf8",
    ),
  );

test("actual XYZ ellipsoid roots, exact segment lengths and honest YZ foreshortening", () => {
  const original = structuredClone(cases[0].input);
  const resolved = resolveRadialSource(cases[0].input);
  assert.equal(resolved.status, "constructed");
  assert.deepEqual(cases[0].input, original);
  assert.equal(resolved.packet.resultDigest, digest(resolved.packet.result));
  const c = resolved.construction;
  assert.equal(c.chainRoots.length, 3);
  assert.equal(c.appendages.length, 3);
  for (const root of c.chainRoots) {
    close(
      root.rootXYZ.reduce(
        (sum, value, index) =>
          sum + ((value - c.body.center[index]) / c.body.halfAxes[index]) ** 2,
        0,
      ),
      1,
    );
    close(root.rootX, -0.12);
    assert.ok(
      (root.projectedRoot[0] / c.body.halfAxes[1]) ** 2 +
        (root.projectedRoot[1] / c.body.halfAxes[2]) ** 2 <
        1,
    );
  }
  for (const segment of c.appendages) {
    close(
      distance(segment.rootXYZ, segment.endpointXYZ),
      segment.sourceDimensions[0],
    );
    assert.ok(segment.projectedLength < segment.length);
    assert.ok(segment.sources.includes("structure.body-height"));
    assert.ok(!segment.sources.includes("structure.distal-length"));
    assert.deepEqual(segment.projectedStart, segment.rootXYZ.slice(1));
  }
  const firstRay = c.appendages[0].sourceDelta.slice(1);
  const secondRay = c.appendages[1].sourceDelta.slice(1);
  const cosine =
    firstRay.reduce((sum, value, index) => sum + value * secondRay[index], 0) /
    (Math.hypot(...firstRay) * Math.hypot(...secondRay));
  assert.ok(Math.abs(cosine - Math.cos((2 * Math.PI) / 3)) > 0.01);
  assert.equal(
    constructRadialGraphSource(resolved.packet.result, options)
      .constructionDigest,
    c.constructionDigest,
  );
});

test("height-only changes actual YZ organization; secondary carried control preserves geometry/material", () => {
  assert.ok(results.every((item) => item.status === "constructed"));
  const [base, height, latent] = results;
  assert.notEqual(
    base.construction.body.halfAxes[2],
    height.construction.body.halfAxes[2],
  );
  assert.notDeepEqual(
    base.construction.chainRoots,
    height.construction.chainRoots,
  );
  assert.equal(
    base.construction.appendages.length,
    height.construction.appendages.length,
  );
  assert.deepEqual(
    geometryMaterial(base.construction),
    geometryMaterial(latent.construction),
  );
  assert.notEqual(base.packet.inputDigest, latent.packet.inputDigest);
  assert.notEqual(
    base.identity.inheritedDigest,
    latent.identity.inheritedDigest,
  );
  assert.equal(
    latent.packet.result.facts.find((fact) => fact.id === "undersidePalette")
      .state,
    "inactive",
  );
  assert.ok(
    base.construction.surfaces.every(
      (surface) => surface.palette[0] === "#269fa5",
    ),
  );
});

test("two-link conditional distal contribution and ON/scales facts remain explicit not-projected", () => {
  const two = structuredClone(cases[0].input);
  two.genome.loci["development.articulated-chain"] = ["linked", "linked"];
  const resolved = resolveRadialSource(two);
  assert.equal(resolved.status, "constructed", JSON.stringify(resolved.errors));
  assert.equal(resolved.construction.appendages.length, 6);
  assert.equal(
    resolved.construction.appendages.filter(
      (node) => node.role === "contact-link",
    ).length,
    3,
  );
  assert.ok(
    resolved.construction.appendages
      .filter((node) => node.segmentIndex === 1)
      .every((node) => node.sources.includes("structure.distal-length")),
  );
  const on = structuredClone(cases[0].input);
  on.genome.loci["structure.ocular-pair"] = ["paired", "paired"];
  on.genome.loci["appearance.covering-kind"] = ["scales", "scales"];
  const c = resolveRadialSource(on).construction;
  assert.equal(c.status, "constructed");
  assert.equal(
    c.notProjected.find((item) => item.fact.id === "ocularPair").fact.value,
    true,
  );
  assert.equal(
    c.notProjected.find((item) => item.fact.id === "coveringKind").fact.value,
    "scales",
  );
  assert.ok(
    c.notProjected.every(
      (item) =>
        item.status === "not-projected" &&
        item.reason.includes("not biological absence"),
    ),
  );
  assert.equal(c.surfaces.length, 4);
});

test("per-owner ordered mixed body pigments, reversal and retained diagnostic texture", () => {
  const mixed = structuredClone(cases[0].input);
  mixed.genome.loci["appearance.body-palette"] = ["jade", "lagoon"];
  mixed.genome.loci["appearance.surface-texture"] = ["ridged", "ridged"];
  const reversed = structuredClone(mixed);
  reversed.genome.loci["appearance.body-palette"].reverse();
  const a = resolveRadialSource(mixed),
    b = resolveRadialSource(reversed);
  assert.equal(a.status, "constructed");
  assert.equal(b.status, "constructed");
  assert.notEqual(a.packet.inputDigest, b.packet.inputDigest);
  assert.deepEqual(a.construction.surfaces, b.construction.surfaces);
  for (const surface of a.construction.surfaces) {
    assert.deepEqual(
      surface.palette,
      a.packet.result.facts.find((fact) => fact.id === "bodyPalette").value,
    );
    assert.deepEqual(
      surface.masks.map((mask) => mask.paletteIndex),
      [0, 1],
    );
    assert.equal(surface.textureLines.length, 6);
    assert.equal(
      surface.atlas.kind,
      surface.region === "volume" ? "projected-YZ-body" : "root-tip-segment",
    );
  }
  assert.ok(drawRadialGraphSource(a.construction).includes("#68777c"));
});

test("malformed, unsupported and bounded source failures reject atomically", () => {
  const base = results[0].packet.result;
  const mutations = [
    (r) => r.graph.nodes.push(structuredClone(r.graph.nodes[0])),
    (r) => (r.graph.nodes[0].position[0] = Infinity),
    (r) => (r.graph.nodes[0] = null),
    (r) => r.graph.edges.pop(),
    (r) => (r.graph.edges[0].from = "missing"),
    (r) => (r.graph.edges[0].from = r.graph.edges[0].to),
    (r) => r.graph.surfaces.pop(),
    (r) => r.graph.surfaces[0].markings.push({ u: 0.2, v: 0.2 }),
    (r) => (r.graph.nodes[1].position[0] = 2),
    (r) => {
      r.graph.nodes[1].position[1] = 0;
      r.graph.nodes[1].position[2] = 0;
    },
    (r) => (r.facts.find((fact) => fact.id === "proximal").value = "0.3"),
    (r) => (r.facts.find((fact) => fact.id === "ocularPair").copies = [null]),
    (r) =>
      r.graph.nodes.push(
        ...Array.from({ length: 65 }, () => structuredClone(r.graph.nodes[0])),
      ),
  ];
  for (const mutation of mutations) {
    const r = structuredClone(base);
    mutation(r);
    const rejected = constructRadialGraphSource(r, options);
    assert.equal(rejected.status, "rejected", JSON.stringify(rejected));
    assert.deepEqual(Object.keys(rejected), ["status", "errors"]);
  }
  for (const bad of [
    null,
    {},
    { ...options, unknown: true },
    { ...options, profileVersion: "graph-radial/99" },
  ])
    assert.equal(constructRadialGraphSource(base, bad).status, "rejected");
});

test("presentation verifies construction and shares one finite scale without geometry changes", () => {
  const constructions = results.map((item) => item.construction);
  const original = structuredClone(constructions);
  const camera = commonRadialSourceCamera(constructions);
  const svgs = constructions.map((item) =>
    drawRadialGraphSource(item, { camera, size: 256 }),
  );
  assert.equal(
    new Set(svgs.map((svg) => svg.match(/data-world-scale="([^"]+)"/)[1])).size,
    1,
  );
  assert.deepEqual(constructions, original);
  assert.ok(
    drawRadialComparison(constructions).includes('width="768" height="512"'),
  );
  const forged = structuredClone(constructions[0]);
  forged.body.projectedOutline[0][0] += 0.1;
  assert.throws(() => drawRadialGraphSource(forged), /digest/);
  for (const camera of [
    null,
    { minimumX: 0, maximumX: 0, minimumY: 0, maximumY: 1 },
    { minimumX: 0, maximumX: 1e-320, minimumY: 0, maximumY: 1e-320 },
    { minimumX: -1e308, maximumX: 1e308, minimumY: 0, maximumY: 1 },
  ])
    assert.throws(
      () => drawRadialGraphSource(constructions[0], { camera }),
      /camera|Camera/,
    );
  assert.throws(
    () => drawRadialGraphSource(constructions[0], { unknown: true }),
    /options/,
  );
});

test("retained old graph1, graph2 and axial scene2 identities remain exact", () => {
  for (const [folder, name, profileVersion, sourceRuleVersion] of [
    [
      "graph-source-proof",
      "single-volume-contacts",
      "graph-source/1",
      "developmental-analytic/1",
    ],
    [
      "body-organization",
      "a-support-contacts",
      "graph-source/2",
      "developmental-regional-growth/1",
    ],
  ]) {
    const packet = read(folder, `${name}.packet.json`),
      retained = read(folder, `${name}.construction.json`);
    const replay = replayAuthoring(packet);
    assert.equal(replay.status, "resolved");
    assert.equal(replay.resultDigest, packet.resultDigest);
    assert.equal(
      JSON.stringify(
        constructGraphSource(replay.result, {
          profileVersion,
          sourceRuleVersion,
        }),
      ),
      JSON.stringify(retained),
    );
  }
  const packet = read(
    "regional-scene-workbench",
    "regional-eyes-skin.packet.json",
  );
  const replay = replayModuleSceneAuthoring(compactSceneReplayEnvelope(packet));
  assert.equal(replay.status, "resolved");
  assert.equal(replay.resultDigest, packet.resultDigest);
  assert.equal(replay.scene.sceneDigest, packet.scene.sceneDigest);
  assert.equal(replay.prompt.text, packet.prompt.text);
});
