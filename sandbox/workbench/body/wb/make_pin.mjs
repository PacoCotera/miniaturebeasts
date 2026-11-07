// Writes the catalogue pin the species files are checked against: node wb/make_pin.mjs > species_v1/catalogue-pin.json
// One record per locus of framework/catalogue.mjs (the pin the game reads): id, operator, scope, clan, family, label, nature and the alleles with their values.
//   node wb/make_pin.mjs                       # write the pin to stdout
//   node wb/make_pin.mjs --check [--pin FILE]  # fail (exit 1) if FILE (default species_v1/catalogue-pin.json) is not the pin the catalogue now writes; writes nothing
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as m from "../../framework/catalogue.mjs";
const c = m.CATALOGUE;
const loci = c.loci.map((l) => ({
  id: l.id, operator: l.operator, scope: l.scope, clan: l.clan ?? null, family: l.family, label: l.label, nature: l.nature ?? "look",
  owner: l.owner ?? null, requires: l.requires ?? null, switch: l.switch ?? null, measure: l.measure ?? null,
  sleepsWhen: l.sleepsWhen ?? null, wakesWhen: l.wakesWhen ?? null,
  alleles: l.alleles.map((a) => (typeof a.value === "number" ? { id: a.id, value: a.value } : { id: a.id })),
}));
const text = JSON.stringify({ id: c.id, version: c.version, schema: c.schema, digest: c.digest, lookPairs: m.LOOK_PAIRS, loci }, null, 1) + "\n";
const args = process.argv.slice(2);
if (args.includes("--check")) {
  const at = args.indexOf("--pin");
  const file = at >= 0 ? path.resolve(args[at + 1] ?? "") : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../species_v1/catalogue-pin.json");
  let have = null;
  try { have = readFileSync(file, "utf8"); } catch { have = null; }
  if (have !== text) { console.error(`${file} is stale: run node wb/make_pin.mjs > species_v1/catalogue-pin.json (catalogue ${c.version}, digest ${c.digest})`); process.exit(1); }
  console.log(`ok: the pin is current (catalogue ${c.version}, digest ${c.digest.slice(0, 12)})`);
} else process.stdout.write(text);
