import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BODY_ORGANIZATION_CATALOGUE,
  BODY_ORGANIZATION_RULE,
} from "./body-organization-catalogue.mjs";
import { GENOME_SCHEMA, REFERENCE_CONTEXT } from "./catalogue.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { authoringIdentity } from "./authoring-identity.mjs";
import { generateGenome } from "./model.mjs";
import { constructGraphSource } from "./graph-source-construction.mjs";

export function bodyOrganizationCases() {
  const catalogue = structuredClone(BODY_ORGANIZATION_CATALOGUE);
  const genome = {
    schemaVersion: GENOME_SCHEMA,
    contentId: catalogue.id,
    contentVersion: catalogue.version,
    loci: Object.fromEntries(
      catalogue.loci
        .filter((locus) => locus.status === "validated")
        .map((locus) => [
          locus.id,
          Array(locus.copyCount).fill(locus.alleles[0].id),
        ]),
    ),
    origin: { kind: "experiment", seed: 0, algorithmVersion: "mulberry32/1" },
  };
  const set = (id, ...copies) => (genome.loci[id] = copies);
  set("development.symmetry", "bilateral", "bilateral");
  set("development.axial-repeat", "single", "chain");
  set("development.attachment-repeat", "multiple", "multiple");
  set("development.articulated-chain", "linked", "unlinked");
  set("development.regional-growth", "central", "central");
  set("structure.join-neck-ratio", "high", "high");
  set("structure.body-length", "low", "low");
  set("structure.body-width", "high", "high");
  set("structure.ocular-pair", "absent", "absent");
  set("appearance.covering-kind", "skin", "skin");
  set("appearance.body-palette", "lagoon", "lagoon");
  set("appearance.underside-palette", "cream", "cream");
  const a = structuredClone(genome);
  const b = structuredClone(a);
  b.loci["development.regional-growth"] = ["anterior", "anterior"];
  b.loci["structure.body-length"] = ["high", "high"];
  b.loci["structure.body-width"] = ["low", "high"];
  b.loci["development.articulated-chain"] = ["unlinked", "unlinked"];
  b.loci["development.fin-rooting"] = ["on", "on"];
  const mixture = structuredClone(a);
  mixture.loci["development.regional-growth"] = ["central", "anterior"];
  const single = structuredClone(a);
  single.loci["development.axial-repeat"] = ["single", "single"];
  single.loci["development.attachment-repeat"] = ["multiple", "none"];
  return [
    ["a-support-contacts", a],
    ["b-taper-fins", b],
    ["a-growth-mixture", mixture],
    ["single-carried-control", single],
  ].map(([name, g]) => ({
    name,
    input: {
      catalogue: structuredClone(catalogue),
      genome: g,
      context: structuredClone(REFERENCE_CONTEXT),
      expressionSeed: 0,
    },
    relationship: {
      kind: "explicit-authoring-input",
      comparedWith: name === "a-growth-mixture" ? "a-support-contacts" : null,
      changedLoci:
        name === "a-growth-mixture" ? ["development.regional-growth"] : [],
      note: "Provisional selected input, not an offspring or solver repair.",
    },
  }));
}
export function resolveBodyOrganization(input) {
  const packet = resolveAuthoring(input);
  if (packet.status !== "resolved")
    return { status: "rejected", stage: "genetic", errors: packet.errors };
  const construction = constructGraphSource(packet.result, {
    profileVersion: "graph-source/2",
    sourceRuleVersion: BODY_ORGANIZATION_RULE,
  });
  if (construction.status !== "constructed")
    return {
      status: "rejected",
      stage: "construction",
      packet,
      errors: construction.errors,
    };
  const identity = authoringIdentity({
    ...packet,
    scene: { sceneDigest: construction.constructionDigest },
  });
  return {
    status: "constructed",
    packet,
    construction,
    identity,
    scope:
      "Body-only source: carried eye/covering facts are retained but not depicted.",
  };
}
export function searchBodyOrganization(seed, maxAttempts = 1024) {
  if (
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 1024
  )
    throw new RangeError(
      "A uint32 seed and total draw bound 1..1024 are required.",
    );
  const attempts = [];
  const rejections = { genetic: 0, construction: 0 };
  for (let draw = 0; draw < maxAttempts; draw++) {
    const candidateSeed = (seed + draw) >>> 0;
    const sampled = generateGenome(BODY_ORGANIZATION_CATALOGUE, candidateSeed, {
      maxAttempts: 1,
    });
    const outcome =
      sampled.status === "generated"
        ? resolveBodyOrganization({
            catalogue: BODY_ORGANIZATION_CATALOGUE,
            genome: sampled.genome,
          })
        : { status: "rejected", stage: "genetic", errors: sampled.errors };
    attempts.push({
      seed: candidateSeed,
      status: outcome.status,
      stage: outcome.stage ?? "constructed",
      errors: outcome.errors ?? [],
    });
    if (outcome.status === "constructed")
      return {
        requestedSeed: seed,
        maxAttempts,
        status: "constructed",
        draws: attempts.length,
        rejections,
        attempts,
        winningSeed: candidateSeed,
        winner: outcome,
      };
    rejections[outcome.stage]++;
  }
  return {
    requestedSeed: seed,
    maxAttempts,
    status: "exhausted",
    draws: attempts.length,
    rejections,
    attempts,
  };
}
export function writeBodyOrganizationProof(directory) {
  mkdirSync(directory, { recursive: true });
  const cases = bodyOrganizationCases().map((item) => ({
    ...item,
    ...resolveBodyOrganization(item.input),
  }));
  for (const item of cases) {
    if (item.packet)
      writeFileSync(
        resolve(directory, item.name + ".packet.json"),
        JSON.stringify(item.packet, null, 2) + "\n",
      );
    writeFileSync(
      resolve(directory, item.name + ".construction.json"),
      JSON.stringify(
        item.construction ?? {
          status: item.status,
          stage: item.stage,
          errors: item.errors,
        },
        null,
        2,
      ) + "\n",
    );
  }
  const manifest = {
    sourceRuleVersion: BODY_ORGANIZATION_RULE,
    profileVersion: "graph-source/2",
    caseAdjustments: [],
    cases: cases.map((item) => ({
      name: item.name,
      status: item.status,
      errors: item.errors ?? [],
      relationship: item.relationship,
      inputDigest: item.packet?.inputDigest,
      resultDigest: item.packet?.resultDigest,
      constructionDigest: item.construction?.constructionDigest,
      identity: item.identity,
      counts: item.packet?.result.graph.nodes.reduce(
        (counts, node) => ({
          ...counts,
          [node.role]: (counts[node.role] ?? 0) + 1,
        }),
        {},
      ),
    })),
    limits:
      "Static axial XY/body-only construction; not broad biology, game art, optics or physics.",
  };
  writeFileSync(
    resolve(directory, "manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const random = {
    sourceRuleVersion: BODY_ORGANIZATION_RULE,
    seeds: Array.from({ length: 8 }, (_, index) => 1 + index * 1024),
    runs: Array.from({ length: 8 }, (_, index) =>
      searchBodyOrganization(1 + index * 1024),
    ),
  };
  writeFileSync(
    resolve(directory, "random-run.json"),
    JSON.stringify(random, null, 2) + "\n",
  );
  return {
    manifest,
    random: random.runs.map(({ attempts, winner, ...summary }) => summary),
    randomDigest: digest(random),
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const index = process.argv.indexOf("--out");
  console.log(
    JSON.stringify(
      writeBodyOrganizationProof(
        index >= 0 ? process.argv[index + 1] : "evidence/body-organization",
      ),
      null,
      2,
    ),
  );
}
