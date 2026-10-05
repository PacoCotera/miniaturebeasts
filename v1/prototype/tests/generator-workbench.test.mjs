import test from "node:test";
import assert from "node:assert/strict";
import { catalogue, evaluate, digest } from "../generator-workbench/evaluate.mjs";
import { makeServer } from "../generator-workbench/server.mjs";
import { drawDiagnosticCreature } from "../generator-workbench/schematic.mjs";

const input = () => structuredClone(catalogue().defaultInput);
const field = (result, id) => result.output.phenotype.fields[id].value;

test("expression, schematic and fact record share carried-versus-expressed causes", () => {
  const carried = evaluate(input());
  const changed = input();
  changed.genome.genotypes["appearance.markings"] = ["p", "p"];
  const expressed = evaluate(changed);
  assert.equal(field(carried, "body-markings"), "no pale body markings");
  assert.equal(field(expressed, "body-markings"), "pale body markings present");
  assert.notEqual(carried.output.schematic, expressed.output.schematic);
  const entry = expressed.output.encyclopedia.facts.find(({ id }) => id === "body-markings");
  assert.equal(entry.value, field(expressed, "body-markings"));
  assert.ok(entry.dependencyClosure.includes("locus:base.coat"));
});

test("combinations retain structural prerequisites and matched-action energy semantics", () => {
  const candidate = input();
  candidate.genome.genotypes["form.crown"] = ["c", "c"];
  candidate.genome.genotypes["movement.drive"] = ["m", "m"];
  const result = evaluate(candidate);
  assert.equal(field(result, "frill-display"), "frill display unavailable without crown");
  assert.match(field(result, "movement"), /steady movement only/);
  assert.match(field(result, "movement-energy"), /same supported locomotor action/);
  assert.equal(result.output.sampleSupported, false);
  assert.ok(result.output.facts.find(({ id }) => id === "movement-energy").dependencyClosure.includes("locus:movement.drive"));
  assert.ok(result.output.facts.find(({ id }) => id === "movement-energy").dependencyClosure.includes("module:pip.body-plan"));
  assert.equal(result.output.coverage.length, 11);
  assert.match(result.output.layers[4].status, /Not simulated/);
  assert.deepEqual(result.output.coverage.find(({ family }) => family === "sensing-signaling").indirectLoci, ["form.crown"]);
});

test("pinned experiment replays exactly without changing input; imported outputs have no authority", () => {
  const candidate = input();
  const before = JSON.stringify(candidate);
  const first = evaluate(candidate);
  const serialized = JSON.parse(JSON.stringify(first));
  serialized.output.schematic = "untrusted replacement";
  const replay = evaluate(serialized.input);
  assert.deepEqual(replay, first);
  assert.equal(JSON.stringify(candidate), before);
  assert.equal(first.outputDigest, digest(first.output));
  const reordered = { ...candidate, context: Object.fromEntries(Object.entries(candidate.context).reverse()) };
  assert.deepEqual(evaluate(reordered), first);
});

test("unsupported context, incomplete and malformed genomes produce no artifacts", () => {
  const invalids = [null, [], { schemaVersion: "other" }];
  const context = input(); context.context.maturity = "juvenile"; invalids.push(context);
  const missing = input(); delete missing.genome.genotypes["form.crown"]; invalids.push(missing);
  const malformed = input(); malformed.genome.genotypes["form.crown"] = 5; invalids.push(malformed);
  const fixed = input(); fixed.genome.genotypes["base.eyes"] = ["blue", "blue"]; invalids.push(fixed);
  const unexpected = input(); unexpected.incubation = { mutation: true }; invalids.push(unexpected);
  const malformedModule = input(); malformedModule.genome.baselineModules[0] = { toString: null, valueOf: null }; invalids.push(malformedModule);
  for (const candidate of invalids) {
    const result = evaluate(candidate);
    assert.equal(result.status, "rejected");
    assert.equal(result.output, undefined);
    assert.ok(result.errors.length);
  }
});

test("diagnostic construction rejects missing or unknown expression instead of drawing absence", () => {
  const phenotype = structuredClone(evaluate(input()).output.phenotype);
  phenotype.fields.crown.value = "unmodeled crown";
  assert.throws(() => drawDiagnosticCreature(phenotype), /Unsupported or missing diagnostic trait: crown/);
  delete phenotype.fields.crown;
  assert.throws(() => drawDiagnosticCreature(phenotype), /Unsupported or missing diagnostic trait: crown/);
  assert.throws(() => drawDiagnosticCreature({ status: "unsupported-context" }), /requires the pinned resolved/);
});

test("local HTTP boundary rejects untrusted origins, invalid JSON and unknown paths; survives errors", async (t) => {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${url}/api/evaluate`, { method: "POST", headers, body });
  assert.equal((await post("{invalid")).status, 400);
  assert.equal((await post(JSON.stringify(input()), { Origin: "https://external.example" })).status, 403);
  assert.equal((await post("x".repeat(65537))).status, 413);
  assert.equal((await fetch(`${url}/../evaluate.mjs`)).status, 404);
  const successful = await post(JSON.stringify(input()));
  assert.equal(successful.status, 200);
  assert.equal((await successful.json()).status, "resolved");
  const rejected = await post(JSON.stringify({ schemaVersion: "unknown" }));
  assert.equal(rejected.status, 422);
});
