// The rambler Tuliko (S20, frame 20.8, the language frame the game reads) in the stamp registry: its type individual's genome string and stamp round-trip, and the fixture tests/s20r-type.json
// is what the book prints. The type is the frame file's typeSpecimen read through the registry's loci. (The retired v1 biped is frame 20.1, tests/s20.test.mjs.)
//   node --test tests/s20r.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { byName, frameFor } from "../src/frames.mjs";
import { encodeCells, parseMessage, sameGenome, sizeFor, stampCode, decodeStampCode } from "../src/codec.mjs";
import { genomeString, decodeGenomeString } from "../src/string.mjs";

const FIX = JSON.parse(readFileSync(new URL("./s20r-type.json", import.meta.url), "utf8"));
const FRAME_FILE = JSON.parse(readFileSync(new URL("../../workbench/frames/language/species-S20.json", import.meta.url), "utf8"));

test("the registry's current S20 is the rambler's language frame 20.8: 22 open loci in six chapters, the frame file's ring order", () => {
  const f = byName("S20"); assert.equal(f, frameFor(20, 8)); assert.equal(f.name, "Tuliko");
  assert.equal(FRAME_FILE.family, "rambler"); assert.equal(FRAME_FILE.frameVersion, 8);
  assert.equal(f.heritable.length, 22); assert.equal(f.locked.length, 69);
  assert.deepEqual(f.chapters.map((c) => c.name), ["Coat", "Face", "Shape", "Legs & tail", "Movement", "Character"]);
  assert.deepEqual(f.chapters.map((c) => c.loci.map((l) => l.id)), FRAME_FILE.chapters.map((c) => c.traits.flatMap((t) => t.loci)));
});

test("the type individual: copies from the frame file's type specimen; the string and the stamp code are the fixture's and read back", () => {
  const f = byName("S20"), spec = FRAME_FILE.typeSpecimen.genome.loci;
  const copies = Object.fromEntries(f.heritable.map((l) => [l.id, spec[l.id]]));
  assert.deepEqual(copies, FIX.type.copies);
  const type = { species: 20, version: 8, copies };
  const s = genomeString(f, type); assert.equal(s, FIX.type.string); assert.ok(s.startsWith("G1-S20v8-"));
  const d = decodeGenomeString(s); assert.ok(d.ok, d.detail); assert.deepEqual(d.genome.copies, copies); assert.equal(genomeString(d.frame ?? f, d.genome), s);
  const code = stampCode(f, type); assert.equal(code, FIX.type.code); assert.ok(code.startsWith("S20v8-"));
  const back = decodeStampCode(code); assert.ok(back.ok, back.detail); assert.deepEqual(back.genome.copies, copies);
  const read = { ...type, read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) };
  const { L, cells } = encodeCells(f, read), bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
  const parsed = parseMessage(bits, L.N, {}); assert.ok(parsed.ok, parsed.detail); assert.ok(sameGenome(f, read, parsed.genome), "the stamp reads back to the same genome");
  assert.ok(sizeFor(f, {}).N >= 21);
});

test("S01's string and stamp code in the fixture are the registry's current ones (the beside-picture reads them)", () => {
  const f = byName("S01"), spec = JSON.parse(readFileSync(new URL("../../workbench/frames/language/species-S01.json", import.meta.url), "utf8")).typeSpecimen.genome.loci;
  const type = { species: 1, version: 8, copies: Object.fromEntries(f.heritable.map((l) => [l.id, spec[l.id]])) };
  assert.equal(genomeString(f, type), FIX.s01.string); assert.equal(stampCode(f, type), FIX.s01.code);
});
