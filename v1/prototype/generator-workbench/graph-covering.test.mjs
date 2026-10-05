import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  digest,
  resolveAuthoring,
  replayAuthoring,
  projectArtPrompt,
} from "./authoring-adapter.mjs";
import { validateCatalogue } from "./model.mjs";
import { GRAPH_COVERING_CATALOGUE } from "./graph-covering-catalogue.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import {
  constructBodyCovering,
  coveringFootprintContained,
} from "./graph-covering-construction.mjs";
import {
  bodyCoveringProofCases,
  createBodyCoveringProof,
} from "./construct-covering-proof.mjs";
import {
  drawBodyCoveringScene,
  drawBodyCoveringComparison,
} from "./graph-covering-presentation.mjs";

const cases = createBodyCoveringProof();
function constructInput(input) {
  const packet = resolveAuthoring(input);
  assert.equal(packet.status, "resolved", JSON.stringify(packet.errors));
  const body = constructGraphSource(packet.result, {
    profileVersion: "graph-source/1",
    sourceRuleVersion: packet.result.baseGraphRuleVersion,
  });
  const ocular = constructOcularModule(packet.result, body, {
    profileVersion: packet.result.ocularModuleRuleVersion,
  });
  return {
    packet,
    body,
    ocular,
    covering: constructBodyCovering(packet.result, body, ocular, {
      profileVersion: "body-covering/1",
    }),
  };
}
function polygonArea(polygon) {
  return (
    Math.abs(
      polygon.reduce((sum, point, index) => {
        const next = polygon[(index + 1) % polygon.length];
        return sum + point[0] * next[1] - next[0] * point[1];
      }, 0),
    ) / 2
  );
}

test("new catalogue and both legacy graph/ocular/PET packages retain exact replay", () => {
  assert.equal(validateCatalogue(GRAPH_COVERING_CATALOGUE).valid, true);
  assert.equal(GRAPH_COVERING_CATALOGUE.loci.length, 54);
  assert.equal(
    GRAPH_COVERING_CATALOGUE.loci.filter(
      (locus) => locus.status === "validated",
    ).length,
    48,
  );
  for (const path of [
    "graph-source-proof/single-volume-contacts.packet.json",
    "graph-source-proof/axial-volume-fins.packet.json",
    "pet-materials/pet-skin.json",
    "graph-ocular-proof/single-volume-contacts-ocular.packet.json",
  ]) {
    const packet = JSON.parse(
      readFileSync(new URL(`evidence/${path}`, import.meta.url), "utf8"),
    );
    const replay = replayAuthoring(packet);
    assert.equal(replay.resultDigest, packet.resultDigest);
    assert.equal(replay.inputDigest, packet.inputDigest);
    assert.equal(replay.diagnostic, packet.diagnostic);
    if (packet.ruleVersion === "developmental-ocular/1") {
      const body = constructGraphSource(packet.result, {
        profileVersion: "graph-source/1",
        sourceRuleVersion: packet.result.baseGraphRuleVersion,
      });
      const ocular = constructOcularModule(packet.result, body, {
        profileVersion: "ocular-module/1",
      });
      const retained = JSON.parse(
        readFileSync(
          new URL(
            "evidence/graph-ocular-proof/single-volume-contacts-ocular.module.json",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      assert.deepEqual(ocular, retained);
    }
  }
});

test("seven valid comparisons replay and isolate covering extent/scale from body and eyes", () => {
  for (const item of cases) {
    assert.equal(
      item.packet.result.sourceRuleVersion,
      "developmental-covering/1",
    );
    assert.equal(
      item.ocular.profile.sourceRuleVersion,
      "developmental-covering/1",
    );
    assert.equal(
      replayAuthoring(item.packet).resultDigest,
      item.packet.resultDigest,
    );
    assert.deepEqual(constructInput(item.input).covering, item.covering);
    assert.equal(
      item.covering.counts.candidates,
      item.covering.counts.accepted + item.covering.counts.excluded,
    );
  }
  const baseline = cases[1],
    extent = cases[4],
    size = cases[5];
  assert.deepEqual(extent.packet.result.graph, baseline.packet.result.graph);
  assert.deepEqual(size.packet.result.graph, baseline.packet.result.graph);
  assert.deepEqual(extent.ocular.features, baseline.ocular.features);
  assert.deepEqual(size.ocular.features, baseline.ocular.features);
  assert.ok(extent.covering.field.maximumX > baseline.covering.field.maximumX);
  assert.ok(extent.covering.plates.length > baseline.covering.plates.length);
  assert.notEqual(
    size.covering.plateProfile.halfWidth,
    baseline.covering.plateProfile.halfWidth,
  );
  assert.notEqual(size.covering.plates.length, baseline.covering.plates.length);
  assert.ok(
    baseline.covering.traces[0].dependencyLocusIds.includes(
      "structure.ocular-size",
    ),
  );
  assert.ok(
    baseline.covering.traces[0].dependencyLocusIds.includes(
      "structure.attachment-position",
    ),
  );
});

test("skin carried parameters produce identical geometry and consume kind only", () => {
  const first = cases[0],
    latent = cases[6];
  assert.notEqual(first.packet.inputDigest, latent.packet.inputDigest);
  assert.notEqual(first.packet.resultDigest, latent.packet.resultDigest);
  assert.deepEqual(first.covering.plates, []);
  assert.deepEqual(latent.covering.plates, []);
  assert.deepEqual(latent.covering.traces[0].directLocusIds, [
    "appearance.covering-kind",
  ]);
  assert.deepEqual(latent.covering.traces[0].dependencyLocusIds, []);
  assert.ok(
    latent.covering.retainedFacts
      .slice(1)
      .every((fact) => fact.state === "inactive"),
  );
  assert.deepEqual(first.ocular.features, latent.ocular.features);
  const normalize = (item) =>
    drawBodyCoveringScene(item.construction, item.ocular, item.covering)
      .replaceAll(item.construction.constructionDigest.slice(0, 20), "BODY")
      .replaceAll(item.covering.coveringDigest, "COVERING")
      .replaceAll(item.ocular.moduleDigest, "OCULAR");
  assert.equal(normalize(first), normalize(latent));
});

test("whole footprints, excluded geometry and source pigment fragments remain faithful", () => {
  const input = structuredClone(cases[4].input);
  input.genome.loci["appearance.body-palette"] = ["charcoal", "russet"];
  input.genome.loci["appearance.covering-scale"] = ["low", "high"];
  input.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  const item = constructInput(input);
  assert.equal(item.covering.status, "constructed");
  assert.ok(
    item.covering.plates.some(
      (plate) =>
        new Set(plate.pigmentFragments.map((fragment) => fragment.palette))
          .size === 2,
    ),
  );
  for (const plate of item.covering.plates) {
    assert.equal(
      coveringFootprintContained(
        plate.outline,
        item.body.bodyExteriors[0].outline,
      ),
      true,
    );
    assert.ok(
      plate.outline.every(
        (point) =>
          point[0] >= item.covering.field.minimumX &&
          point[0] <= item.covering.field.maximumX,
      ),
    );
    assert.ok(
      Math.abs(
        plate.pigmentFragments.reduce(
          (sum, fragment) => sum + polygonArea(fragment.polygon),
          0,
        ) - polygonArea(plate.outline),
      ) < 1e-9,
    );
    for (const fragment of plate.pigmentFragments) {
      const surface = item.body.surfaces.find(
        (surface) => surface.id === fragment.surfaceId,
      );
      assert.equal(fragment.palette, surface.palette[fragment.maskIndex]);
      const boundary =
        surface.atlas.minimumX +
        (surface.atlas.maximumX - surface.atlas.minimumX) / 2;
      assert.ok(
        fragment.polygon.every((point) =>
          fragment.maskIndex === 0
            ? point[0] <= boundary
            : point[0] >= boundary,
        ),
      );
    }
  }
  assert.ok(cases[4].covering.counts.exclusionReasons["ocular-clearance"] > 0);
  assert.ok(item.covering.counts.exclusionReasons["root-clearance"] > 0);
  const concave = [
    [0, 0],
    [3, 0],
    [3, 3],
    [2, 3],
    [2, 1],
    [1, 1],
    [1, 3],
    [0, 3],
  ];
  assert.equal(
    coveringFootprintContained(
      [
        [0.5, 2],
        [2.5, 2],
        [2.5, 2.5],
        [0.5, 2.5],
      ],
      concave,
    ),
    false,
  );
});

test("module scene defers incomplete old projections and rejects malformed/forged inputs", () => {
  const item = cases[1];
  for (const sample of cases) {
    assert.equal(sample.packet.diagnostic, "");
    assert.equal(sample.packet.geometryReference.status, "rejected");
    assert.match(sample.packet.presentation.reason, /body-covering\/1/);
    assert.equal(sample.packet.prompt.status, "rejected");
    assert.equal(sample.packet.prompt.text, "");
    assert.throws(
      () => projectArtPrompt(sample.packet),
      /Unsupported body-covering/,
    );
  }
  const invoke = (
    result,
    body,
    ocular,
    options = { profileVersion: "body-covering/1" },
  ) => constructBodyCovering(result, body, ocular, options);
  assert.equal(invoke(null, item.construction, item.ocular).status, "rejected");
  assert.equal(
    invoke(item.packet.result, null, item.ocular).status,
    "rejected",
  );
  assert.equal(
    invoke(item.packet.result, item.construction, null).status,
    "rejected",
  );
  assert.equal(
    invoke(item.packet.result, item.construction, item.ocular, {
      profileVersion: "unknown",
    }).status,
    "rejected",
  );
  for (const field of [
    "sourceRuleVersion",
    "baseGraphRuleVersion",
    "ocularModuleRuleVersion",
    "coveringModuleRuleVersion",
  ]) {
    const forged = structuredClone(item.packet.result);
    forged[field] = "unknown";
    assert.equal(
      invoke(forged, item.construction, item.ocular).errors[0].code,
      "unsupported-source",
    );
  }
  const body = structuredClone(item.construction);
  body.bodyExteriors[0].outline[0][0] += 0.1;
  const { constructionDigest, ...bodyData } = body;
  body.constructionDigest = digest(bodyData);
  assert.equal(
    invoke(item.packet.result, body, item.ocular).errors[0].code,
    "body-source-mismatch",
  );
  const ocular = structuredClone(item.ocular);
  ocular.features[0].radius += 0.01;
  const { moduleDigest, ...ocularData } = ocular;
  ocular.moduleDigest = digest(ocularData);
  assert.equal(
    invoke(item.packet.result, item.construction, ocular).errors[0].code,
    "ocular-source-mismatch",
  );
  const malformed = structuredClone(item.packet.result);
  malformed.facts.find((fact) => fact.id === "coveringScale").sources = [null];
  const bodyMatch = constructGraphSource(malformed, {
    profileVersion: "graph-source/1",
    sourceRuleVersion: malformed.baseGraphRuleVersion,
  });
  const ocularMatch = constructOcularModule(malformed, bodyMatch, {
    profileVersion: "ocular-module/2",
  });
  assert.equal(
    invoke(malformed, bodyMatch, ocularMatch).errors[0].code,
    "covering-facts",
  );
  const inactiveWidth = structuredClone(item.packet.result);
  inactiveWidth.facts.find((fact) => fact.id === "bodyWidth").state =
    "inactive";
  const widthBody = constructGraphSource(inactiveWidth, {
    profileVersion: "graph-source/1",
    sourceRuleVersion: inactiveWidth.baseGraphRuleVersion,
  });
  const widthOcular = constructOcularModule(inactiveWidth, widthBody, {
    profileVersion: "ocular-module/2",
  });
  assert.equal(
    invoke(inactiveWidth, widthBody, widthOcular).errors[0].code,
    "covering-state",
  );
});

test("empty/overflow fields reject atomically; missing eyes remove only ocular exclusions", () => {
  const empty = structuredClone(cases[1].input);
  empty.genome.loci["structure.body-length"] = ["low", "low"];
  const emptyResult = constructInput(empty);
  assert.equal(emptyResult.covering.status, "rejected");
  assert.equal(emptyResult.covering.errors[0].code, "empty-field");
  assert.equal("plates" in emptyResult.covering, false);
  const overflow = structuredClone(cases[3].input);
  overflow.genome.loci["appearance.covering-scale"] = ["low", "low"];
  overflow.genome.loci["appearance.covering-extent"] = ["high", "high"];
  const overflowResult = constructInput(overflow);
  assert.equal(overflowResult.covering.errors[0].code, "plate-budget");
  assert.equal("plates" in overflowResult.covering, false);
  const excessiveLattice = structuredClone(cases[3].input);
  Object.assign(excessiveLattice.genome.loci, {
    "development.axial-repeat": ["chain", "chain"],
    "structure.body-width": ["low", "low"],
    "structure.axial-spacing": ["high", "high"],
    "structure.fin-span": ["low", "low"],
    "appearance.covering-scale": ["low", "low"],
    "appearance.covering-extent": ["high", "high"],
  });
  const candidateOverflow = constructInput(excessiveLattice);
  assert.equal(candidateOverflow.covering.errors[0].code, "candidate-budget");
  assert.ok(candidateOverflow.covering.counts.plannedCandidates > 1024);
  assert.equal("plates" in candidateOverflow.covering, false);
  const noEyes = structuredClone(cases[1].input);
  noEyes.genome.loci["structure.ocular-pair"] = ["absent", "absent"];
  const absent = constructInput(noEyes);
  assert.equal(absent.covering.status, "constructed");
  assert.deepEqual(absent.covering.exclusions.oculars, []);
  assert.ok(
    absent.covering.traces[0].dependencyLocusIds.includes(
      "structure.ocular-pair",
    ),
  );
  assert.ok(
    !absent.covering.traces[0].dependencyLocusIds.includes(
      "structure.ocular-size",
    ),
  );
  assert.ok(absent.covering.plates.length > cases[1].covering.plates.length);
});

test("comparison is deterministic, common-scale and source immutable", () => {
  const before = digest(cases);
  const svg = drawBodyCoveringComparison(cases);
  assert.match(svg, /width="1792"/);
  assert.match(svg, /data-inspection-presentation="covering-inspection\/1"/);
  assert.match(
    svg,
    /stroke="#b7c1c0" stroke-width="0.85" vector-effect="non-scaling-stroke"/,
  );
  assert.equal(svg, drawBodyCoveringComparison(cases));
  assert.equal(digest(cases), before);
  const forged = structuredClone(cases[1].covering);
  forged.plates[0].outline[0][0] += 0.1;
  assert.throws(
    () => drawBodyCoveringScene(cases[1].construction, cases[1].ocular, forged),
    /verified matching/,
  );
});
