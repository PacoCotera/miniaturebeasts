import test from "node:test";
import assert from "node:assert/strict";
import { digest, resolveAuthoring } from "./authoring-adapter.mjs";
import {
  constructGraphSource,
  GRAPH_SOURCE_PROFILE,
} from "./graph-source-construction.mjs";
import {
  graphSourceProofCases,
  createGraphSourceProof,
} from "./construct-source-proof.mjs";
import {
  commonGraphSourceCamera,
  drawGraphSource,
  drawGraphSourceComparison,
} from "./graph-source-presentation.mjs";

const options = {
  profileVersion: "graph-source/1",
  sourceRuleVersion: "developmental-analytic/1",
};
const cases = createGraphSourceProof();
const source = (index = 0) => structuredClone(cases[index].packet.result);

function distanceToSegment(point, start, end) {
  const delta = end.map((value, index) => value - start[index]);
  const lengthSquared = delta.reduce((sum, value) => sum + value * value, 0);
  const along = Math.max(
    0,
    Math.min(
      1,
      delta.reduce(
        (sum, value, index) => sum + value * (point[index] - start[index]),
        0,
      ) / lengthSquared,
    ),
  );
  return Math.hypot(
    ...point.map((value, index) => value - start[index] - along * delta[index]),
  );
}

function rootOnOutline(root, outline) {
  return (
    Math.min(
      ...outline.map((p, index) =>
        distanceToSegment(root, p, outline[(index + 1) % outline.length]),
      ),
    ) < 2e-8
  );
}

test("three explicit source genomes produce exact contrasting rooted counts without mutation", () => {
  assert.equal(cases[0].construction.bodyExteriors[0].stations.length, 1);
  assert.equal(
    cases[0].construction.appendages.filter((item) => item.role === "link")
      .length,
    6,
  );
  assert.equal(
    cases[0].construction.appendages.filter(
      (item) => item.role === "contact-link",
    ).length,
    6,
  );
  assert.equal(cases[1].construction.bodyExteriors[0].stations.length, 3);
  assert.equal(cases[1].construction.appendages.length, 6);
  assert.ok(
    cases[1].construction.appendages.every((item) => item.role === "fin"),
  );
  for (const item of cases) {
    const before = JSON.stringify(item.packet.result);
    assert.deepEqual(
      constructGraphSource(item.packet.result, options),
      item.construction,
    );
    assert.equal(JSON.stringify(item.packet.result), before);
    assert.equal(digest(item.packet.result), item.packet.resultDigest);
    assert.equal(
      item.construction.sourceResultDigest,
      item.packet.resultDigest,
    );
    assert.equal(
      item.construction.surfaces.length,
      item.packet.result.graph.surfaces.length,
    );
    for (const surface of item.construction.surfaces) {
      const original = item.packet.result.graph.surfaces.find(
        (candidate) => candidate.id === surface.id,
      );
      for (const [key, value] of Object.entries(original))
        assert.deepEqual(surface[key], value);
    }
  }
});

test("shared solved exterior retains source longitudinal roots and exact segment measures", () => {
  for (const item of cases) {
    const body = item.construction.bodyExteriors[0];
    for (const appendage of item.construction.appendages) {
      const node = item.packet.result.graph.nodes.find(
        (candidate) => candidate.id === appendage.nodeId,
      );
      const parent = item.packet.result.graph.nodes.find(
        (candidate) => candidate.id === appendage.parentNodeId,
      );
      assert.deepEqual(appendage.sourcePosition, node.position);
      assert.deepEqual(appendage.sourceDimensions, node.dimensions);
      if (parent.role === "volume") {
        assert.ok(rootOnOutline(appendage.root, body.outline));
        const sourceX =
          node.role === "fin"
            ? node.position[0]
            : node.position[0] - 0.3 * node.dimensions[0];
        assert.ok(Math.abs(appendage.root[0] - sourceX) < 2e-8);
      } else {
        const parentGeometry = item.construction.appendages.find(
          (candidate) => candidate.nodeId === parent.id,
        );
        assert.deepEqual(appendage.root, parentGeometry.end);
      }
      const reach = Math.hypot(
        ...appendage.end.map(
          (value, coordinate) => value - appendage.root[coordinate],
        ),
      );
      assert.ok(
        Math.abs(
          reach -
            (node.role === "fin" ? node.dimensions[1] : node.dimensions[0]),
        ) < 2e-8,
      );
      if (appendage.rootChord)
        assert.ok(
          appendage.rootChord.every((root) =>
            rootOnOutline(root, body.outline),
          ),
        );
      assert.ok(
        appendage.sources.every((id) =>
          item.packet.input.catalogue.loci.some((locus) => locus.id === id),
        ),
      );
      assert.ok(
        item.construction.traces.some(
          (trace) =>
            trace.targetId === appendage.id &&
            trace.sourceNodeIds.includes(node.id),
        ),
      );
    }
  }
});

test("proportion-only copy changes geometry while preserving source organization and counts", () => {
  const first = cases[0],
    variant = cases[2];
  const changed = Object.keys(first.packet.input.genome.loci).filter(
    (id) =>
      JSON.stringify(first.packet.input.genome.loci[id]) !==
      JSON.stringify(variant.packet.input.genome.loci[id]),
  );
  assert.deepEqual(changed, ["structure.body-width"]);
  assert.notEqual(
    first.construction.constructionDigest,
    variant.construction.constructionDigest,
  );
  assert.notDeepEqual(
    first.construction.bodyExteriors[0].outline,
    variant.construction.bodyExteriors[0].outline,
  );
  assert.deepEqual(
    first.construction.appendages.map((item) => item.nodeId),
    variant.construction.appendages.map((item) => item.nodeId),
  );
  assert.deepEqual(
    first.construction.appendages.map((item) => item.sourceDimensions),
    variant.construction.appendages.map((item) => item.sourceDimensions),
  );
});

test("malformed, nonfinite, duplicate and dangling source graphs reject atomically", () => {
  const mutations = [
    (result) => {
      result.graph.nodes[0] = null;
    },
    (result) => {
      result.graph.edges[0] = null;
    },
    (result) => {
      result.graph.surfaces[0] = null;
    },
    (result) => {
      result.graph.nodes[0].position[0] = Infinity;
    },
    (result) => {
      result.graph.nodes[0].dimensions[0] = 0;
    },
    (result) => {
      result.graph.nodes[1].id = result.graph.nodes[0].id;
    },
    (result) => {
      result.graph.edges[0].to = "missing";
    },
    (result) => {
      result.graph.edges[1].id = result.graph.edges[0].id;
    },
    (result) => {
      delete result.graph.nodes[0].sources;
    },
    (result) => {
      result.graph.surfaces[0].palette = [{ toString: null }];
    },
  ];
  for (const mutate of mutations) {
    const input = source();
    mutate(input);
    const outcome = constructGraphSource(input, options);
    assert.equal(outcome.status, "rejected");
    assert.ok(outcome.errors[0].code && outcome.errors[0].message);
    assert.equal(outcome.bodyExteriors, undefined);
  }
  assert.equal(
    constructGraphSource(source(), { ...options, profileVersion: "unknown" })
      .status,
    "rejected",
  );
  assert.equal(
    constructGraphSource(source(), { ...options, sourceRuleVersion: "unknown" })
      .status,
    "rejected",
  );
  assert.equal(constructGraphSource(source()).status, "rejected");
});

test("unsupported symmetry, roles, branches, disconnected bodies and marks never receive repaired geometry", () => {
  const mutations = [
    (result) => {
      result.facts.find((fact) => fact.id === "symmetry").value = "radial";
    },
    (result) => {
      result.graph.nodes.at(-1).role = "membrane";
    },
    (result) => {
      result.graph.edges.push({
        id: "extra-body",
        role: "connected-volume",
        from: "volume-0",
        to: "volume-2",
        sources: [],
      });
    },
    (result) => {
      result.graph.edges = result.graph.edges.filter(
        (edge) => edge.id !== "axis-1",
      );
    },
    (result) => {
      result.graph.nodes[0].deformation = "axial-bend";
    },
  ];
  for (const mutate of mutations) {
    const input = source(1);
    mutate(input);
    const before = JSON.stringify(input);
    assert.equal(constructGraphSource(input, options).status, "rejected");
    assert.equal(JSON.stringify(input), before);
  }
  const input = graphSourceProofCases()[0].input;
  input.genome.loci["appearance.marking-switch"] = ["on", "on"];
  const marked = resolveAuthoring(input);
  assert.equal(marked.status, "resolved");
  assert.equal(
    constructGraphSource(marked.result, options).errors[0].code,
    "unsupported-marked-surface",
  );
});

test("invalid exterior roots and coincident unrelated appendages reject with relevant source IDs", () => {
  const misplaced = source();
  misplaced.graph.nodes.find(
    (node) => node.id === "attachment-0-0-0",
  ).position[0] = 20;
  const rejected = constructGraphSource(misplaced, options);
  assert.equal(rejected.errors[0].code, "invalid-longitudinal-root");
  assert.ok(
    rejected.errors[0].locusIds.includes("structure.attachment-position"),
  );
  const coincident = source();
  for (const index of [0, 1]) {
    const first = coincident.graph.nodes.find(
      (node) => node.id === `attachment-0-0-${index}`,
    );
    const second = coincident.graph.nodes.find(
      (node) => node.id === `attachment-1-0-${index}`,
    );
    second.position = [...first.position];
  }
  assert.equal(
    constructGraphSource(coincident, options).errors[0].code,
    "intersecting-appendages",
  );
  const oversizedChord = source(1);
  oversizedChord.graph.nodes.find((node) => node.role === "fin").dimensions[0] =
    2;
  assert.equal(
    constructGraphSource(oversizedChord, options).errors[0].code,
    "fin-chord-outside-station",
  );
});

test("per-case 256px references use one world camera and graph-specific SVG namespaces", () => {
  const constructions = cases.map((item) => item.construction);
  const camera = commonGraphSourceCamera(constructions);
  const svgs = constructions.map((construction) =>
    drawGraphSource(construction, { camera, size: 256 }),
  );
  const scales = svgs.map((svg) => / scale\(([^)]+)\)/.exec(svg)[1]);
  assert.equal(new Set(scales).size, 1);
  assert.ok(
    svgs.every(
      (svg) =>
        svg.includes('width="256" height="256"') && !/NaN|Infinity/.test(svg),
    ),
  );
  const namespaces = svgs.map((svg) => /clipPath id="([^"]+)/.exec(svg)[1]);
  assert.equal(new Set(namespaces).size, 3);
  assert.match(
    drawGraphSourceComparison(constructions),
    /width="768" height="256"/,
  );
  assert.throws(
    () =>
      drawGraphSource(constructions[0], {
        camera: { minimumX: 0, maximumX: 0, minimumY: 0, maximumY: 1 },
      }),
    /positive/,
  );
  const forged = structuredClone(constructions[0]);
  forged.appendages.pop();
  assert.throws(() => drawGraphSource(forged), /digest mismatch/);
  assert.equal(GRAPH_SOURCE_PROFILE.view.includes("XY"), true);
});
