import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BODY_ORGANIZATION_CATALOGUE,
  BODY_ORGANIZATION_RULE,
} from "./body-organization-catalogue.mjs";
import {
  bodyOrganizationCases,
  resolveBodyOrganization,
  searchBodyOrganization,
} from "./construct-body-organization-proof.mjs";
import { validateCatalogue } from "./model.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";
import { drawGraphSource } from "./graph-source-presentation.mjs";
const options = {
  profileVersion: "graph-source/2",
  sourceRuleVersion: BODY_ORGANIZATION_RULE,
};
const inputs = bodyOrganizationCases();
const cases = inputs.map((item) => resolveBodyOrganization(item.input));
function changed(index, id, copies) {
  const input = structuredClone(inputs[index].input);
  input.genome.loci[id] = copies;
  return resolveBodyOrganization(input);
}
test("new exact catalogue and four authored bodies retain actual field organization and roles", () => {
  assert.equal(validateCatalogue(BODY_ORGANIZATION_CATALOGUE).valid, true);
  assert.equal(BODY_ORGANIZATION_CATALOGUE.loci.length, 56);
  assert.equal(
    BODY_ORGANIZATION_CATALOGUE.loci.filter(
      (locus) => locus.status === "validated",
    ).length,
    50,
  );
  for (const item of cases) {
    assert.equal(item.status, "constructed");
    assert.equal(item.packet.diagnostic, "");
    assert.equal(item.packet.prompt.status, "rejected");
    assert.equal(
      item.construction.sourceResultDigest,
      item.packet.resultDigest,
    );
  }
  assert.equal(cases[0].construction.appendages.length, 6);
  assert.ok(
    cases[0].construction.appendages.every(
      (item) => item.role === "contact-link",
    ),
  );
  assert.ok(
    cases[1].construction.appendages.every((item) => item.role === "fin"),
  );
  assert.equal(cases[3].construction.appendages.length, 2);
  assert.notDeepEqual(
    cases[0].construction.bodyExteriors,
    cases[1].construction.bodyExteriors,
  );
  assert.notDeepEqual(
    cases[0].construction.bodyExteriors,
    cases[2].construction.bodyExteriors,
  );
  for (const item of cases) {
    const result = item.packet.result;
    const allocation = result.regionalAllocation;
    const volumes = result.graph.nodes.filter((node) => node.role === "volume");
    const length = result.facts.find((fact) => fact.id === "bodyLength").value;
    const width = result.facts.find((fact) => fact.id === "bodyWidth").value;
    assert.ok(
      Math.abs(
        allocation.lengths.reduce((sum, value) => sum + value, 0) - length,
      ) < 1e-12,
    );
    assert.ok(volumes.every((node) => node.dimensions[1] <= width));
    for (let index = 1; index < volumes.length; index++)
      assert.ok(
        Math.abs(
          allocation.centers[index] -
            allocation.centers[index - 1] -
            allocation.lengths[index - 1] / 2 -
            allocation.lengths[index] / 2 -
            result.facts.find((fact) => fact.id === "spacing").value,
        ) < 1e-12,
      );
  }
});
test("mixed fields and five-station interpolation are real causes; inherited joins affect only new construction", () => {
  const five = changed(0, "development.axial-repeat", ["chain", "chain"]);
  assert.equal(five.status, "constructed");
  assert.equal(five.packet.result.regionalAllocation.rawLengths.length, 5);
  assert.ok(
    Math.abs(five.packet.result.regionalAllocation.rawLengths[1] - 0.425) <
      1e-12,
  );
  const narrow = changed(0, "structure.join-neck-ratio", ["low", "low"]);
  assert.equal(narrow.status, "constructed");
  assert.deepEqual(narrow.packet.result.graph, cases[0].packet.result.graph);
  assert.notDeepEqual(
    narrow.construction.bodyExteriors,
    cases[0].construction.bodyExteriors,
  );
  assert.equal(cases[0].construction.profile.neckRatio, 0.95);
  assert.equal(narrow.construction.profile.neckRatio, 0.65);
  assert.ok(
    cases[0].construction.bodyExteriors[0].sources.includes(
      "development.regional-growth",
    ),
  );
  assert.ok(
    cases[0].construction.bodyExteriors[0].sources.includes(
      "structure.join-neck-ratio",
    ),
  );
  assert.deepEqual(
    cases[2].packet.result.regionalAllocation.lengthKnots,
    [0.325, 0.5, 0.175],
  );
});
test("single-station latent growth and join edits preserve visible geometry and exclude dormant causes", () => {
  const input = structuredClone(inputs[3].input);
  input.genome.loci["development.regional-growth"] = ["even", "even"];
  input.genome.loci["structure.join-neck-ratio"] = ["low", "low"];
  const latent = resolveBodyOrganization(input);
  assert.equal(latent.status, "constructed");
  assert.deepEqual(latent.packet.result.graph, cases[3].packet.result.graph);
  assert.deepEqual(
    latent.construction.bodyExteriors[0].outline,
    cases[3].construction.bodyExteriors[0].outline,
  );
  assert.deepEqual(
    latent.construction.appendages,
    cases[3].construction.appendages,
  );
  assert.notEqual(latent.packet.inputDigest, cases[3].packet.inputDigest);
  assert.ok(
    !latent.construction.bodyExteriors[0].sources.includes(
      "development.regional-growth",
    ),
  );
});
test("regional helper rejects malformed fields, inactive drivers and mismatched source conventions atomically", () => {
  for (const mutate of [
    (result) => {
      result.regionalAllocation.rawLengths[0] = 0;
    },
    (result) => {
      result.regionalAllocation.lengthKnots[0] = NaN;
    },
    (result) => {
      result.regionalAllocation.centers[1] += 1;
    },
    (result) => {
      result.facts.find((fact) => fact.id === "joinNeckRatio").state =
        "inactive";
    },
    (result) => {
      result.regionalAllocation.sources = [null];
    },
  ]) {
    const result = structuredClone(cases[0].packet.result);
    mutate(result);
    const rejected = constructGraphSource(result, options);
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.bodyExteriors, undefined);
  }
  assert.equal(
    constructGraphSource(cases[0].packet.result, {
      profileVersion: "graph-source/1",
      sourceRuleVersion: "developmental-analytic/1",
    }).status,
    "rejected",
  );
  assert.equal(
    constructGraphSource(cases[0].packet.result, {
      ...options,
      sourceRuleVersion: "unknown",
    }).status,
    "rejected",
  );
  assert.throws(() => searchBodyOrganization(1, 1025), RangeError);
});
test("new resolution and construction are deterministic, input-immutable and root/material preserving", () => {
  for (let index = 0; index < inputs.length; index++) {
    const before = structuredClone(inputs[index].input);
    const again = resolveBodyOrganization(inputs[index].input);
    assert.deepEqual(inputs[index].input, before);
    assert.deepEqual(again, cases[index]);
    assert.equal(digest(again.packet.result), again.packet.resultDigest);
    for (const surface of again.construction.surfaces) {
      const original = again.packet.result.graph.surfaces.find(
        (item) => item.id === surface.id,
      );
      for (const [key, value] of Object.entries(original))
        assert.deepEqual(surface[key], value);
    }
    assert.ok(
      again.construction.appendages.every((item) => item.sources.length > 0),
    );
  }
});
test("literal old source records and graph-source/1 constructor and SVG remain exact", () => {
  const manifest = JSON.parse(
    readFileSync("evidence/graph-source-proof/manifest.json", "utf8"),
  );
  for (const entry of manifest) {
    const packet = JSON.parse(
      readFileSync(
        "evidence/graph-source-proof/" + entry.name + ".packet.json",
        "utf8",
      ),
    );
    const replay = resolveAuthoring(packet.input);
    assert.equal(replay.resultDigest, entry.resultDigest);
    const old = constructGraphSource(replay.result, {
      profileVersion: "graph-source/1",
      sourceRuleVersion: "developmental-analytic/1",
    });
    assert.equal(old.constructionDigest, entry.constructionDigest);
    assert.equal(
      digest(drawGraphSource(old, { camera: entry.camera, size: 256 })),
      entry.svgDigest,
    );
  }
});

test("oversized fin chord rejects the authored input without shrinking or changing copies", () => {
  const input = structuredClone(inputs[1].input);
  input.genome.loci["structure.fin-span"] = ["high", "high"];
  const before = structuredClone(input);
  const rejected = resolveBodyOrganization(input);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.stage, "construction");
  assert.equal(rejected.errors[0].code, "fin-chord-outside-station");
  assert.deepEqual(input, before);
  assert.equal(rejected.packet.status, "resolved");
  assert.equal(rejected.construction, undefined);
});
