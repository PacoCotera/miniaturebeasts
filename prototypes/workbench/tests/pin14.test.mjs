// Catalogue 14, body length: one new trunk record, form.torso-length, which starts at frame 9. A frame of version 8 or older
// neither lists it nor can open it and builds byte for byte as at pin 13, so every frame on disk stays as it was.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOGUE, LOCI, VALIDATED, LANGUAGE_FRAME, BODY_LENGTH_FRAME, alleleIds, digestAt, catalogueHeader, pinOfFrame, resolveCopies } from "../framework/catalogue.mjs";
import { buildFrame } from "../framework/species.mjs";
import { languageSpec } from "../framework/language-frames.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const langDir = path.resolve(here, "../frames/language");
const PIN13_DIGEST = "8d405a729aeb9973c026c9823b316405d91c6c01402b51870f471b9a1c551fd5";

test("catalogue 14 adds one trunk record, form.torso-length, from frame 9, and nothing else", () => {
  assert.equal(CATALOGUE.version, 14);
  assert.equal(CATALOGUE.schema, "mb-catalogue/14");
  assert.equal(BODY_LENGTH_FRAME, 9);
  assert.deepEqual(CATALOGUE.loci.filter((l) => l.sinceFrame === 9).map((l) => l.id), ["form.torso-length"]);
  const l = LOCI.get("form.torso-length");
  assert.equal(l.scope, "trunk"); assert.equal(l.status, "validated"); assert.equal(l.family, "structure"); assert.equal(l.owner, null);
  assert.equal(l.operator, "copy-mean"); assert.equal(l.measure, "position");
  assert.deepEqual(l.alleles.map((a) => [a.id, a.value]), [["short", 0], ["between", 0.5], ["long", 1]], "a position like its girth sibling: three bins at 0, 0.5 and 1");
  assert.equal(l.label, "Body length");
  assert.ok(VALIDATED.includes(l));
  assert.equal(CATALOGUE.loci.filter((x) => x.sinceFrame === 8).length, 6, "catalogue 13's six records are as they were");
  assert.equal(resolveCopies(l, ["short", "long"]), 0.5, "two copies show their mean, as every position does");
  assert.equal(new Set(CATALOGUE.loci.map((x) => x.id)).size, CATALOGUE.loci.length);
});

test("pins and digests: frame 9 names pin 14, frame 8 still names pin 13 and its digest, older frames pin 12", () => {
  assert.equal(pinOfFrame(9), 14); assert.equal(pinOfFrame(8), 13); assert.equal(pinOfFrame(7), 12); assert.equal(pinOfFrame(6), 12);
  assert.equal(digestAt(8), PIN13_DIGEST, "pin 13's content is unchanged by pin 14");
  assert.equal(digestAt(7), "98419b59dd1a826d66bbd1b0c17988dec64c51fcc2076e2b18bd72eb987d876c");
  assert.equal(digestAt(6), "2ca450b04bfbcb4ca434b8e14195f111e9f381a27ea7c6c207cb06884f5ec42b");
  assert.equal(CATALOGUE.digest, digestAt(9)); assert.notEqual(CATALOGUE.digest, digestAt(8));
  assert.deepEqual(catalogueHeader(8), { id: CATALOGUE.id, version: 13, digest: PIN13_DIGEST, parent: CATALOGUE.parent });
  assert.deepEqual(catalogueHeader(9), { id: CATALOGUE.id, version: 14, digest: CATALOGUE.digest, parent: CATALOGUE.parent });
});

test("a frame of version 8 cannot open body length; a frame of version 9 can, as a band of 15 percent", () => {
  const spec = (fv) => {
    const s = languageSpec("S14"); s.frameVersion = fv;
    s.bands["form.torso-length"] = { form: "mult", lo: 0.85, hi: 1.15, unit: "×", type: 1 };
    s.open.push({ chapter: "shape", id: "torso-length", name: "Body length", loci: ["form.torso-length"] });
    return s;
  };
  assert.throws(() => buildFrame(spec(LANGUAGE_FRAME), { samples: 8 }), /form\.torso-length, which this species does not carry/);
  const f = buildFrame(spec(BODY_LENGTH_FRAME), { samples: 8 });
  const row = f.loci.find((x) => x.id === "form.torso-length");
  assert.equal(row.kind, "heritable-look"); assert.deepEqual(row.band, { form: "mult", lo: 0.85, hi: 1.15, unit: "×" });
  assert.equal(f.catalogue.version, 14); assert.equal(f.catalogue.digest, CATALOGUE.digest);
  assert.deepEqual(alleleIds("form.torso-length", 9), ["short", "between", "long"]);
  assert.deepEqual(alleleIds("form.torso-length", 8), ["short", "between", "long"], "the record's own alleles have no later start; the record itself is what starts at 9");
});

test("a frame of version 8 sees no body length: no row and no absent line, and it names pin 13 and the digest of its own content", () => {
  const f = buildFrame(languageSpec("S14"), { samples: 8 });
  assert.equal(f.frameVersion, 8); assert.equal(f.catalogue.version, 13); assert.equal(f.catalogue.digest, PIN13_DIGEST);
  assert.ok(!f.loci.some((x) => x.id === "form.torso-length")); assert.ok(!(f.absent ?? []).some((x) => x.id === "form.torso-length"));
  for (const file of readdirSync(langDir).filter((n) => n.startsWith("species-"))) {
    const d = JSON.parse(readFileSync(path.join(langDir, file), "utf8"));
    assert.equal(d.catalogue.version, 13, file); assert.equal(d.catalogue.digest, PIN13_DIGEST, file);
    assert.ok(!d.loci.some((x) => x.id === "form.torso-length"), file);
  }
});
