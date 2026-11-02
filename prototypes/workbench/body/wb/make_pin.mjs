// Writes the catalogue pin the species files are checked against: node wb/make_pin.mjs > species_v1/catalogue-pin.json
// One record per locus of framework/catalogue.mjs (the pin the game reads): id, operator, scope, clan, family, label, nature and the alleles with their values.
import * as m from "../../framework/catalogue.mjs";
const c = m.CATALOGUE;
const loci = c.loci.map((l) => ({
  id: l.id, operator: l.operator, scope: l.scope, clan: l.clan ?? null, family: l.family, label: l.label, nature: l.nature ?? "look",
  alleles: l.alleles.map((a) => (typeof a.value === "number" ? { id: a.id, value: a.value } : { id: a.id })),
}));
process.stdout.write(JSON.stringify({ id: c.id, version: c.version, schema: c.schema, loci }, null, 1) + "\n");
