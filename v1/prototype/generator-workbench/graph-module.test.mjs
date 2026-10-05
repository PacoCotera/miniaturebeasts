import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GRAPH_MODULE_CATALOGUE } from "./graph-module-catalogue.mjs";
import { validateCatalogue } from "./model.mjs";
import {
  digest,
  resolveAuthoring,
  replayAuthoring,
  projectArtPrompt,
} from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { constructOcularModule } from "./graph-module-construction.mjs";
import {
  ocularModuleProofCases,
  createOcularModuleProof,
} from "./construct-module-proof.mjs";
import {
  drawOcularScene,
  drawOcularComparison,
} from "./graph-module-presentation.mjs";

const cases = createOcularModuleProof();
const construct = (result) => {
  const body = constructGraphSource(result, {
    profileVersion: "graph-source/1",
    sourceRuleVersion: result.baseGraphRuleVersion,
  });
  return constructOcularModule(result, body, {
    profileVersion: "ocular-module/1",
  });
};

test("the new catalogue resolves broad bodies without changing old replay", () => {
  assert.equal(validateCatalogue(GRAPH_MODULE_CATALOGUE).valid, true);
  assert.equal(GRAPH_MODULE_CATALOGUE.loci.length, 51);
  assert.equal(
    GRAPH_MODULE_CATALOGUE.loci.filter((locus) => locus.status === "validated")
      .length,
    45,
  );
  for (const name of [
    "single-volume-contacts",
    "axial-volume-fins",
    "single-volume-proportion",
  ]) {
    const old = JSON.parse(
      readFileSync(
        new URL(
          `evidence/graph-source-proof/${name}.packet.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const replay = replayAuthoring(old);
    assert.equal(replay.resultDigest, old.resultDigest);
    assert.equal(replay.inputDigest, old.inputDigest);
    assert.equal(replay.diagnostic, old.diagnostic);
  }
});

test("both body organizations and isolated size/placement changes retain actual causal geometry", () => {
  const [single, axial, size, placement] = cases;
  for (const item of cases) {
    assert.equal(
      item.packet.result.baseGraphRuleVersion,
      "developmental-analytic/1",
    );
    assert.equal(item.module.sourceResultDigest, item.packet.resultDigest);
    assert.equal(
      replayAuthoring(item.packet).resultDigest,
      item.packet.resultDigest,
    );
    assert.deepEqual(construct(item.packet.result), item.module);
  }
  assert.equal(single.module.features.length, 2);
  assert.equal(axial.module.features.length, 2);
  assert.equal(
    size.module.features[0].radius / single.module.features[0].radius,
    0.21 / 0.18,
  );
  assert.deepEqual(
    size.module.features.map((feature) => feature.center),
    single.module.features.map((feature) => feature.center),
  );
  assert.equal(
    placement.module.features[0].radius,
    single.module.features[0].radius,
  );
  assert.notEqual(
    placement.module.features[0].center[0],
    single.module.features[0].center[0],
  );
  assert.deepEqual(size.packet.result.graph, single.packet.result.graph);
  assert.deepEqual(placement.packet.result.graph, single.packet.result.graph);
  assert.ok(single.module.traces[0].locusIds.includes("structure.ocular-size"));
});

test("OFF retains carried copies but consumes only presence and shares identical visible geometry", () => {
  const [low, high] = cases.slice(4);
  assert.notEqual(low.packet.inputDigest, high.packet.inputDigest);
  assert.notEqual(low.packet.resultDigest, high.packet.resultDigest);
  assert.deepEqual(low.module.features, []);
  assert.deepEqual(high.module.features, []);
  assert.deepEqual(low.module.traces[0].locusIds, ["structure.ocular-pair"]);
  for (const item of [low, high]) {
    assert.ok(
      item.module.retainedFacts
        .slice(1)
        .every((fact) => fact.state === "inactive"),
    );
  }
  const normalized = (item) =>
    drawOcularScene(item.construction, item.module)
      .replaceAll(item.construction.constructionDigest.slice(0, 20), "BODY")
      .replaceAll(item.module.moduleDigest, "MODULE");
  assert.equal(normalized(low), normalized(high));
});

test("axial spacing is a traced indirect cause of the queried ocular envelope", () => {
  const input = structuredClone(ocularModuleProofCases()[1].input);
  input.genome.loci["structure.ocular-placement"] = ["high", "high"];
  const modules = [
    ["low", "low"],
    ["high", "high"],
  ].map((copies) => {
    const variant = structuredClone(input);
    variant.genome.loci["structure.axial-spacing"] = copies;
    return construct(resolveAuthoring(variant).result);
  });
  assert.ok(modules.every((module) => module.status === "constructed"));
  assert.equal(modules[0].geometryRule.radius, modules[1].geometryRule.radius);
  assert.equal(
    modules[0].geometryRule.longitudinalX,
    modules[1].geometryRule.longitudinalX,
  );
  assert.notEqual(
    modules[0].geometryRule.localHalfWidth,
    modules[1].geometryRule.localHalfWidth,
  );
  assert.notEqual(
    modules[0].features[0].center[1],
    modules[1].features[0].center[1],
  );
  assert.ok(
    modules.every((module) =>
      module.traces[0].locusIds.includes("structure.axial-spacing"),
    ),
  );
});

test("new module diagnostic and Gemini projection defer visibly, including OFF", () => {
  for (const item of cases) {
    assert.equal(item.packet.diagnostic, "");
    assert.equal(item.packet.geometryReference.status, "rejected");
    assert.match(item.packet.geometryReference.error, /ocular-module\/1/);
    assert.equal(item.packet.presentation.status, "unsupported");
    assert.match(item.packet.presentation.reason, /ocular-module\/1/);
    assert.equal(item.packet.prompt.status, "rejected");
    assert.equal(item.packet.prompt.text, "");
    assert.match(item.packet.prompt.error, /Unsupported ocular-module/);
    assert.throws(
      () => projectArtPrompt(item.packet),
      /Unsupported ocular-module/,
    );
  }
});

test("module rejects malformed, mismatched, unsupported and impossible inputs atomically", () => {
  const source = cases[0];
  const before = digest(source.packet.result);
  assert.equal(
    constructOcularModule(null, source.construction, {
      profileVersion: "ocular-module/1",
    }).status,
    "rejected",
  );
  assert.equal(
    constructOcularModule(source.packet.result, null, {
      profileVersion: "ocular-module/1",
    }).status,
    "rejected",
  );
  assert.equal(
    constructOcularModule(source.packet.result, source.construction, {
      profileVersion: "unknown",
    }).status,
    "rejected",
  );
  const forged = structuredClone(source.construction);
  forged.bodyExteriors[0].outline[0][0] += 0.1;
  const { constructionDigest, ...values } = forged;
  forged.constructionDigest = digest(values);
  assert.equal(
    constructOcularModule(source.packet.result, forged, {
      profileVersion: "ocular-module/1",
    }).errors[0].code,
    "body-source-mismatch",
  );
  const malformed = structuredClone(source.packet.result);
  malformed.facts.push(null);
  malformed.facts.find((fact) => fact?.id === "ocularSize").value = Infinity;
  assert.equal(construct(malformed).status, "rejected");
  for (const change of [
    (fact) => {
      fact.sources = [null];
    },
    (fact) => {
      fact.copies = ["low"];
    },
  ]) {
    const invalidTrace = structuredClone(source.packet.result);
    change(invalidTrace.facts.find((fact) => fact.id === "ocularSize"));
    const rejectedTrace = construct(invalidTrace);
    assert.equal(rejectedTrace.status, "rejected");
    assert.equal(rejectedTrace.errors[0].code, "module-facts");
    assert.equal("features" in rejectedTrace, false);
  }
  const maximum = structuredClone(ocularModuleProofCases()[0].input);
  maximum.genome.loci["structure.ocular-size"] = ["high", "high"];
  const rejected = construct(resolveAuthoring(maximum).result);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.errors[0].code, "ocular-root-overlap");
  assert.equal("features" in rejected, false);
  assert.equal(digest(source.packet.result), before);
  const budget = structuredClone(source.packet.result);
  budget.graph.nodes = Array(65).fill(budget.graph.nodes[0]);
  assert.equal(construct(budget).status, "rejected");
});

test("scene exports share camera, verify identities and leave source packets unchanged", () => {
  const before = digest(cases);
  const svg = drawOcularComparison(cases);
  assert.match(svg, /width="1536"/);
  assert.equal((svg.match(/<circle/g) ?? []).length, 16);
  assert.equal(svg, drawOcularComparison(cases));
  const corrupted = structuredClone(cases[0].module);
  corrupted.features[0].radius += 0.1;
  assert.throws(
    () => drawOcularScene(cases[0].construction, corrupted),
    /verified matching/,
  );
  assert.equal(digest(cases), before);
});
