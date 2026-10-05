import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHORING_CATALOGUE as catalogue,
  REFERENCE_CONTEXT,
} from "./catalogue.mjs";
import { generateGenome, evaluateGenome, crossGenomes } from "./model.mjs";
import { resolveAuthoring, digest } from "./authoring-adapter.mjs";
import { familyCases } from "./family-fixtures.mjs";
export { familyCases } from "./family-fixtures.mjs";
import { petCases } from "./pet-fixtures.mjs";
export { petCases } from "./pet-fixtures.mjs";

// These are selected input comparisons, not selectable organism templates in the engine.
export function simulationCases() {
  const cases = [];
  for (const [name, seed, medium] of [
    ["contact", 1, "ground"],
    ["membrane", 21, "air"],
    ["axial", 7, "water"],
  ]) {
    const first = generateGenome(catalogue, seed).genome;
    const second = structuredClone(first);
    if (name === "axial")
      second.loci["development.axial-repeat"] = ["chain", "single"];
    else
      second.loci["development.attachment-repeat"] = ["multiple", "multiple"];
    second.loci["structure.body-length"] = ["high", "high"];
    cases.push(
      {
        name: `${name}-original`,
        genome: first,
        context: { ...REFERENCE_CONTEXT, medium },
      },
      {
        name: `${name}-related-topology`,
        genome: second,
        context: { ...REFERENCE_CONTEXT, medium },
      },
    );
    if (name !== "axial") {
      const child = crossGenomes(catalogue, first, second, 23);
      cases.push({
        name: `${name}-actual-parent-cross`,
        genome: child.genome,
        context: { ...REFERENCE_CONTEXT, medium },
      });
    }
  }
  const suppressed = generateGenome(catalogue, 7).genome;
  suppressed.loci["appearance.marking-switch"] = ["off", "on"];
  cases.push({
    name: "carried-suppressed",
    genome: suppressed,
    context: REFERENCE_CONTEXT,
  });
  const marked = structuredClone(suppressed);
  marked.loci["appearance.marking-switch"] = ["on", "on"];
  cases.push(
    {
      name: "expression-placement-a",
      genome: marked,
      context: REFERENCE_CONTEXT,
      expressionSeed: 11,
    },
    {
      name: "expression-placement-b",
      genome: marked,
      context: REFERENCE_CONTEXT,
      expressionSeed: 12,
    },
  );
  const staticGenome = generateGenome(catalogue, 1).genome;
  for (const id of [
    "development.membrane-rooting",
    "development.fin-rooting",
    "development.axial-deformation",
  ])
    staticGenome.loci[id] = ["off", "off"];
  staticGenome.loci["development.axial-repeat"] = ["single", "single"];
  staticGenome.loci["development.attachment-repeat"] = ["none", "none"];
  staticGenome.loci["development.articulated-chain"] = ["unlinked", "unlinked"];
  staticGenome.loci["development.symmetry"] = ["radial", "radial"];
  cases.push({
    name: "static-radial-volume-not-distributed-network",
    genome: staticGenome,
    context: REFERENCE_CONTEXT,
  });
  const invalid = structuredClone(staticGenome);
  invalid.loci["development.membrane-rooting"] = ["on", "on"];
  cases.push({
    name: "invalid-unrooted-membrane",
    genome: invalid,
    context: REFERENCE_CONTEXT,
  });
  return cases;
}

async function main() {
  const outputIndex = process.argv.indexOf("--out");
  const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
  if (outputIndex >= 0 && !outputPath)
    throw new Error("--out requires an explicit destination.");
  if (outputPath) await mkdir(resolve(outputPath), { recursive: true });
  const summaries = [];
  const cases = process.argv.includes("--pet")
    ? petCases()
    : process.argv.includes("--family")
      ? familyCases()
      : simulationCases();
  const activeCatalogue = cases[0].catalogue ?? catalogue;
  for (const item of cases) {
    const packet = resolveAuthoring({
      catalogue: item.catalogue ?? catalogue,
      genome: item.genome,
      context: item.context,
      expressionSeed: item.expressionSeed ?? null,
    });
    if (item.relationship) {
      const base = cases.find(
        (candidate) => candidate.name === item.relationship.base,
      );
      packet.relationship = {
        ...item.relationship,
        ...(base
          ? {
              baseGenomeDigest: digest(base.genome),
              changes: item.relationship.changedLoci.map((id) => ({
                locusId: id,
                before: base.genome.loci[id],
                after: item.genome.loci[id],
              })),
            }
          : {}),
      };
    }
    summaries.push({
      name: item.name,
      status: packet.status,
      recordId: packet.recordId,
      nodes: packet.result?.graph.nodes.length,
      modes: packet.result?.motion
        .filter((motion) => motion.status === "supported")
        .map((motion) => motion.medium),
      inputDigest: packet.inputDigest,
      resultDigest: packet.resultDigest,
      promptStatus: packet.prompt?.status,
      relationship: packet.relationship,
      errors: packet.errors,
    });
    if (outputPath) {
      const write = (suffix, value) =>
        writeFile(resolve(outputPath, `${item.name}.${suffix}`), value);
      await write("json", JSON.stringify(packet, null, 2));
      if (packet.status === "resolved") {
        await write("description.txt", packet.description);
        await write(
          "geometry.json",
          JSON.stringify(
            packet.geometryReference.manifest ?? packet.geometryReference,
            null,
            2,
          ),
        );
        if (packet.geometryReference.status === "available")
          await write("geometry.svg", packet.geometryReference.svg);
        await write("svg", packet.diagnostic);
        await write("genome.svg", packet.fingerprints.inherited);
        await write(
          "prompt.txt",
          packet.prompt.text ||
            `Projection unavailable: ${packet.prompt.error}`,
        );
      }
    }
  }
  if (outputPath)
    await writeFile(
      resolve(outputPath, "manifest.json"),
      JSON.stringify(
        {
          contentId: activeCatalogue.id,
          contentVersion: activeCatalogue.version,
          ruleVersion: activeCatalogue.ruleVersion,
          limitation:
            "Static fictional analytic constructions; no physical motion, production art or game permission",
          cases: summaries,
        },
        null,
        2,
      ),
    );
  console.log(
    JSON.stringify(
      {
        records: activeCatalogue.loci.length,
        executable: activeCatalogue.loci.filter(
          (locus) => locus.status === "validated",
        ).length,
        cases: summaries,
      },
      null,
      2,
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await main();
