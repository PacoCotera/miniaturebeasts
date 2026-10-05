import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTHORING_CATALOGUE as catalogue,
  REFERENCE_CONTEXT,
} from "./catalogue.mjs";
import {
  validateCatalogue,
  validateGenome,
  generateGenome,
  evaluateGenome,
  crossGenomes,
} from "./model.mjs";
import {
  resolveAuthoring,
  replayAuthoring,
  projectArtPrompt,
  digest,
  canonicalJson,
} from "./authoring-adapter.mjs";
import { makeServer } from "./server.mjs";
import { simulationCases } from "./simulate.mjs";
import { createGeometryReference } from "./geometry-reference.mjs";

test("geometry reference preserves axial counts, root identity, positions and local pigment masks", () => {
  const item = simulationCases().find(
    (candidate) => candidate.name === "axial-original",
  );
  const packet = resolveAuthoring({
    catalogue,
    genome: item.genome,
    context: item.context,
  });
  const reference = packet.geometryReference;
  assert.equal(reference.status, "available");
  assert.deepEqual(reference.manifest.counts, {
    volumes: 5,
    fins: 6,
    edges: 10,
  });
  assert.equal(reference.manifest.identity.resultDigest, packet.resultDigest);
  const roots = reference.manifest.nodes
    .filter((node) => node.role === "fin")
    .map((node) => node.root.volumeId);
  assert.deepEqual(roots, [
    "volume-0",
    "volume-0",
    "volume-2",
    "volume-2",
    "volume-4",
    "volume-4",
  ]);
  for (const node of reference.manifest.nodes) {
    const original = packet.result.graph.nodes.find(
      (source) => source.id === node.id,
    );
    assert.deepEqual(node.sourcePosition, original.position);
    assert.deepEqual(node.sourceDimensions, original.dimensions);
    const sourceSurface = packet.result.graph.surfaces.find(
      (surface) => surface.nodeId === node.id,
    );
    assert.deepEqual(
      node.masks.map((mask) => mask.color),
      sourceSurface.palette,
    );
    if (node.role === "fin")
      assert.deepEqual(
        node.masks.map((mask) => mask.localU),
        [
          [0, 0.5],
          [0.5, 1],
        ],
      );
  }
  assert.equal((reference.svg.match(/data-node="/g) ?? []).length, 11);
  assert.equal((reference.svg.match(/data-edge="/g) ?? []).length, 10);
  assert.equal((reference.svg.match(/id="geometry-reference-clip-/g) ?? []).length, 11);
  assert.equal((reference.svg.match(/url\(#geometry-reference-clip-/g) ?? []).length, 11);
  assert.ok(!reference.svg.includes('id="clip-'));
  for (const node of reference.manifest.nodes)
    assert.ok(reference.svg.includes(`url(#geometry-reference-clip-${node.id})`));
  assert.ok(!reference.svg.includes("<text"));
  const incompatible = structuredClone(packet.result);
  incompatible.graph.nodes[0].role = "membrane";
  assert.equal(createGeometryReference(incompatible).status, "rejected");
  incompatible.graph.nodes[0].role = "volume";
  incompatible.graph.surfaces[0].partition = "invented mask";
  assert.equal(createGeometryReference(incompatible).status, "rejected");
  for (const collection of ["nodes", "edges", "surfaces"]) {
    const malformed = structuredClone(packet.result);
    malformed.graph[collection][0] = null;
    assert.equal(createGeometryReference(malformed).status, "rejected");
  }
  const missingSources = structuredClone(packet.result);
  delete missingSources.graph.nodes[0].sources;
  assert.equal(createGeometryReference(missingSources).status, "rejected");
});

test("creature descriptions project actual construction and supported channels", () => {
  for (const item of simulationCases()) {
    const packet = resolveAuthoring({
      catalogue,
      genome: item.genome,
      context: item.context,
    });
    if (packet.status !== "resolved") continue;
    const { nodes } = packet.result.graph;
    for (const [role, caption] of [
      ["volume", "connected body volume(s)"],
      ["contact-link", "terminal contact(s)"],
      ["membrane", "membrane(s)"],
      ["fin", "fin(s)"],
    ])
      assert.ok(
        packet.description.includes(
          `${nodes.filter((node) => node.role === role).length} ${caption}`,
        ),
      );
    const media = packet.result.motion
      .filter((motion) => motion.status === "supported")
      .map((motion) => motion.medium);
    assert.ok(
      packet.description.includes(
        `movement channels: ${media.join(", ") || "none"};`,
      ),
    );
    assert.ok(packet.description.includes("physical motion is unvalidated"));
    assert.ok(packet.description.includes("Facial structures are not modeled"));
  }
});

const genome = (seed = 1) => generateGenome(catalogue, seed).genome;
const input = (seed = 1) => ({
  catalogue,
  genome: genome(seed),
  context: REFERENCE_CONTEXT,
  expressionSeed: null,
});

test("complete executable genome and honest eleven-family catalogue reject malformed or unsupported authoring", () => {
  assert.equal(catalogue.loci.length, 48);
  assert.equal(
    catalogue.loci.filter((locus) => locus.status === "validated").length,
    42,
  );
  assert.equal(validateCatalogue(catalogue).valid, true);
  assert.equal(Object.keys(genome().loci).length, 42);
  const malformed = [];
  let value = structuredClone(catalogue);
  value.loci[0] = null;
  malformed.push(value);
  value = structuredClone(catalogue);
  value.loci[0].alleles[0] = null;
  malformed.push(value);
  value = structuredClone(catalogue);
  value.loci.find((locus) => locus.id === "appearance.body-palette").pairMap[
    "charcoal|charcoal"
  ] = [{ toString: null }];
  malformed.push(value);
  value = structuredClone(catalogue);
  value.loci[0].operator = "eval";
  malformed.push(value);
  value = structuredClone(catalogue);
  delete value.loci[0].pairMap["single|single"];
  malformed.push(value);
  value = structuredClone(catalogue);
  value.loci[0].outputs = ["unmodeledSpeed"];
  malformed.push(value);
  value = structuredClone(catalogue);
  value.loci[0].requires = [value.loci[0].id];
  malformed.push(value);
  for (const candidate of malformed)
    assert.equal(validateCatalogue(candidate).valid, false);
  const missing = genome();
  delete missing.loci["development.symmetry"];
  assert.equal(validateGenome(catalogue, missing).valid, false);
  const preset = genome();
  preset.classId = "flying";
  assert.equal(evaluateGenome(catalogue, preset).status, "rejected");
  const badCopies = genome();
  badCopies.loci["development.symmetry"] = ["bilateral"];
  assert.equal(validateGenome(catalogue, badCopies).valid, false);
});

test("seeded generation has bounded attempts, retained exact inputs and genuinely different graph/mode outputs", () => {
  const summaries = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const first = generateGenome(catalogue, seed);
    assert.deepEqual(first, generateGenome(catalogue, seed));
    assert.ok(first.attempts >= 1 && first.attempts <= 128);
    assert.equal(first.status, "generated");
    const before = canonicalJson(first.genome);
    const result = evaluateGenome(catalogue, first.genome);
    assert.equal(canonicalJson(first.genome), before);
    assert.equal(result.graph.edges.length, result.graph.nodes.length - 1);
    assert.equal(result.coverage.length, 11);
    summaries.add(
      `${result.graph.nodes.length}:${result.motion.map((motion) => motion.status).join()}`,
    );
  }
  assert.ok(summaries.size >= 6);
  for (const [seed, medium] of [
    [1, "ground"],
    [21, "air"],
    [7, "water"],
  ])
    assert.equal(
      evaluateGenome(catalogue, genome(seed)).motion.find(
        (motion) => motion.medium === medium,
      ).status,
      "supported",
    );
  assert.equal(
    generateGenome(catalogue, 1, { maxAttempts: 0 }).status,
    "rejected",
  );
});

test("retained related comparisons actually change topology while preserving their declared supported medium", () => {
  const cases = simulationCases();
  for (const [name, medium] of [
    ["contact", "ground"],
    ["membrane", "air"],
    ["axial", "water"],
  ]) {
    const original = cases.find((item) => item.name === `${name}-original`);
    const related = cases.find(
      (item) => item.name === `${name}-related-topology`,
    );
    const first = evaluateGenome(catalogue, original.genome, original.context);
    const second = evaluateGenome(catalogue, related.genome, related.context);
    assert.equal(first.status, "resolved");
    assert.equal(second.status, "resolved");
    assert.notDeepEqual(first.graph, second.graph);
    assert.notEqual(first.graph.nodes.length, second.graph.nodes.length);
    assert.equal(
      second.motion.find((item) => item.medium === medium).status,
      "supported",
    );
  }
});

test("attachment topology and rooting cause actual geometry, never duplicate fictitious contacts", () => {
  const candidate = genome();
  candidate.loci["development.axial-repeat"] = ["single", "single"];
  candidate.loci["development.symmetry"] = ["bilateral", "bilateral"];
  candidate.loci["development.attachment-repeat"] = ["multiple", "multiple"];
  candidate.loci["development.articulated-chain"] = ["linked", "linked"];
  candidate.loci["development.axial-deformation"] = ["off", "off"];
  candidate.loci["development.membrane-rooting"] = ["off", "off"];
  candidate.loci["development.fin-rooting"] = ["off", "off"];
  const result = evaluateGenome(catalogue, candidate);
  const contacts = result.graph.nodes.filter(
    (node) => node.role === "contact-link",
  );
  assert.equal(contacts.length, 6);
  assert.equal(
    new Set(contacts.map((node) => JSON.stringify(node.position))).size,
    6,
  );
  const changed = structuredClone(candidate);
  changed.loci["structure.attachment-position"] = ["high", "high"];
  candidate.loci["structure.attachment-position"] = ["low", "low"];
  assert.notDeepEqual(
    evaluateGenome(catalogue, candidate).graph,
    evaluateGenome(catalogue, changed).graph,
  );
  const invalid = structuredClone(candidate);
  invalid.loci["development.attachment-repeat"] = ["none", "none"];
  const before = canonicalJson(invalid);
  assert.equal(evaluateGenome(catalogue, invalid).status, "rejected");
  assert.equal(canonicalJson(invalid), before);
});

test("expression placement preserves genotype/facts/motion and never paints suppressed inherited marks", () => {
  const candidate = genome(7);
  candidate.loci["appearance.marking-switch"] = ["on", "on"];
  const first = evaluateGenome(catalogue, candidate, REFERENCE_CONTEXT, {
    expressionSeed: 4,
  });
  const second = evaluateGenome(catalogue, candidate, REFERENCE_CONTEXT, {
    expressionSeed: 5,
  });
  assert.deepEqual(first.facts, second.facts);
  assert.deepEqual(first.motion, second.motion);
  assert.notDeepEqual(first.realization, second.realization);
  candidate.loci["appearance.marking-switch"] = ["off", "on"];
  const suppressed = evaluateGenome(catalogue, candidate, REFERENCE_CONTEXT, {
    expressionSeed: 4,
  });
  assert.equal(suppressed.realization.markings.length, 0);
  assert.ok(
    suppressed.facts.some(
      (fact) => fact.id === "layout" && fact.state === "suppressed",
    ),
  );
  assert.ok(
    suppressed.graph.surfaces.every(
      (surface) =>
        !surface.markings.length &&
        !surface.sources.includes("appearance.marking-layout"),
    ),
  );
  assert.equal(
    evaluateGenome(catalogue, candidate, {
      ...REFERENCE_CONTEXT,
      stage: "juvenile",
    }).status,
    "rejected",
  );
});

test("record replay ignores imported artifacts and fact prompts reject forged engine outputs", () => {
  const original = resolveAuthoring(input(7));
  assert.equal(original.status, "resolved");
  const altered = structuredClone(original);
  altered.diagnostic = "forged";
  altered.result = { fake: true };
  const replay = replayAuthoring(altered);
  assert.equal(replay.resultDigest, original.resultDigest);
  assert.equal(replay.diagnostic, original.diagnostic);
  const forged = structuredClone(original);
  forged.result.graph.nodes.push({
    id: "invented-eyes",
    role: "eyes",
    dimensions: [1, 1, 1],
    position: [0, 0, 0],
  });
  forged.resultDigest = digest(forged.result);
  assert.throws(() => projectArtPrompt(forged), /shared engine replay/);
  assert.equal(
    replayAuthoring({ ...original, inputDigest: "tampered" }).status,
    "rejected",
  );
  const reordered = JSON.parse(canonicalJson(original.input));
  assert.equal(resolveAuthoring(reordered).resultDigest, original.resultDigest);
  assert.ok(original.prompt.text.length <= 32768);
  assert.ok(!original.prompt.text.includes("{{"));
});

test("cross transmits actual recorded donor copies once and rejects fabricated donor traces", () => {
  const parentA = genome(1);
  const parentB = structuredClone(parentA);
  parentB.loci["appearance.body-palette"] = ["russet", "russet"];
  const child = crossGenomes(catalogue, parentA, parentB, 5);
  assert.equal(child.attempts, 1);
  assert.equal(Object.keys(child.genome.origin.transmission).length, 42);
  for (const [id, trace] of Object.entries(child.genome.origin.transmission))
    assert.deepEqual(child.genome.loci[id], [
      parentA.loci[id][trace.donorIndices[0]],
      parentB.loci[id][trace.donorIndices[1]],
    ]);
  const altered = structuredClone(child.genome);
  altered.origin.transmission["appearance.body-palette"].copies = [
    "invented",
    "russet",
  ];
  assert.equal(validateGenome(catalogue, altered).valid, false);
});

test("HTTP authoring rejects malformed input and replays compact input envelopes within its byte budget", async (t) => {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body) =>
    fetch(`${url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const packet = await (await post("/api/authoring/evaluate", input())).json();
  const compact = {
    schemaVersion: packet.schemaVersion,
    input: packet.input,
    inputDigest: packet.inputDigest,
    resultDigest: packet.resultDigest,
  };
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 65536);
  const replay = await post("/api/authoring/replay", compact);
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).replay.verified, true);
  assert.equal(
    (await post("/api/authoring/evaluate", { genome: genome(), context: null }))
      .status,
    422,
  );
  assert.equal(
    (await post("/api/authoring/generate", { seed: 1, classId: "air" })).status,
    422,
  );
  const malformed = structuredClone(catalogue);
  malformed.loci[0] = null;
  assert.equal((await post("/api/authoring/validate", malformed)).status, 422);
});
