import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sketchIndividual, manifest, speciesCameras, SIZES } from "../sketch/sketch.mjs";
import { typeSpecimen, sampleIndividual, rng } from "../framework/species.mjs";
import { markingFields } from "../framework/raster.mjs";
import { buildIndividual } from "../framework/species.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frame = (id) => JSON.parse(readFileSync(path.resolve(here, `../frames/species-${id}.json`), "utf8"));

test("a sketch set covers the four views at Companion and Station scale with every pass", () => {
  const f = frame("S06");
  const s = sketchIndividual(f, typeSpecimen(f));
  assert.equal(s.status, "sketched");
  const keys = new Set(s.images.map((i) => i.key));
  for (const view of ["front", "side", "three-quarter", "top"]) for (const size of ["companion", "station", "large"]) for (const pass of ["shaded", "slots", "index"]) assert.ok(keys.has(`${pass}.${view}.${size}`), `${pass}.${view}.${size}`);
  for (const view of ["front", "side", "three-quarter", "top"]) for (const size of ["tile", "companion", "station"]) assert.ok(keys.has(`silhouette.${view}.${size}`));
  assert.deepEqual(SIZES.tile, [48, 48]); assert.deepEqual(SIZES.companion, [280, 300]); assert.deepEqual(SIZES.station, [300, 310]);
  assert.ok(s.fields.includes("mask") && s.fields.includes("rings"), "the raccoon's mask and rings are separate masks");
  assert.ok(keys.has("markings-mask.side.station") && keys.has("markings-rings.side.station"));
  assert.ok(s.legend.some((l) => l.slot === "mask"), "the slot legend names the mask slot");
  assert.ok(!s.images.some((i) => i.clipped), "the type specimen fits its own camera");
});

test("same genome, same bytes, across two sketches with fresh cameras", () => {
  const f = frame("S09");
  const g = sampleIndividual(f, rng("same-bytes"));
  const a = sketchIndividual(f, g, { cameras: speciesCameras(f) }), b = sketchIndividual(f, g, { cameras: speciesCameras(f) });
  assert.equal(a.images.length, b.images.length);
  for (let i = 0; i < a.images.length; i++) assert.deepEqual(Buffer.from(a.images[i].image.data).toString("base64"), Buffer.from(b.images[i].image.data).toString("base64"), a.images[i].key);
  assert.equal(a.genomeDigest, b.genomeDigest);
});

test("the manifest carries genome, frame and sketcher provenance and one entry per output", () => {
  const f = frame("S11");
  const g = typeSpecimen(f);
  g.loci["appearance.shell-plates"] = ["plated", "plated"];
  const s = sketchIndividual(f, g);
  const m = manifest(f, g, s, { sketch: "abc" });
  assert.equal(m.level, "species"); assert.equal(m.id, "S11"); assert.equal(m.sketch.sketcherVersion, "mb-sketch/1");
  assert.equal(m.outputs.length, s.images.length);
  assert.ok(m.outputs.every((o) => o.file.endsWith(".png") && Array.isArray(o.size)));
  assert.equal(m.generated, false);
  assert.ok(m.sketch.markingFields.includes("shell"));
  assert.equal(markingFields(buildIndividual(f, g).scene).includes("shell"), true);
});

test("an individual comes back by its genome digest, deterministically, from the reference or seed stream", async () => {
  const { genomeByDigest, genomeSha256, canonicalGenome } = await import("../sketch/cli.mjs");
  const { genomeDigest } = await import("../framework/species.mjs");
  const f = frame("S05");
  const bySeed = sampleIndividual(f, rng("S05:7"), { kind: "random", seed: 7 });
  const found = genomeByDigest(f, genomeDigest(bySeed));
  assert.ok(found, "the seed stream holds seed 7");
  assert.deepEqual(found.loci, bySeed.loci);
  assert.equal(genomeSha256(found), genomeSha256(bySeed));
  const r = rng("S05:reference-set");
  const members = Array.from({ length: 4 }, (_, i) => sampleIndividual(f, r, { kind: "random", seed: i + 1 }));
  const byHash = genomeByDigest(f, genomeSha256(members[3]).slice(0, 16));
  assert.deepEqual(byHash.loci, members[3].loci, "a sha256 prefix finds the fourth reference member");
  assert.equal(genomeByDigest(f, "S05-00000000"), null, "an unknown digest is null, never a guess");
  assert.equal(canonicalGenome(bySeed), canonicalGenome({ ...bySeed, loci: Object.fromEntries(Object.entries(bySeed.loci).reverse()) }), "canonical text is order-free");
  assert.equal(genomeByDigest(f, "S05").origin.kind, "type-specimen");
});
