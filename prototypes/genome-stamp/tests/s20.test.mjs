// Ticket G3 of the genome-string proposal: S20, the Tuliko, version 1, joins the stamp registry. Nothing the registry held moves (every other frame stamps, codes and strings to the
// same bytes as before), and S20's type stamp, stamp code and genome string round-trip, as do the twelve Tuliko of the workbench (tests/s20-twelve.json: the copies of seeds 1 to 12, their
// strings and stamp codes, as the workbench writes them).
//   node --test tests/s20.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { FRAME_DATA } from "../src/frames-data.mjs";
import { FRAMES_LIST, byName, frameFor } from "../src/frames.mjs";
import { encodeCells, parseMessage, sameGenome, sizeFor, stampCode, decodeStampCode } from "../src/codec.mjs";
import { genomeString, decodeGenomeString } from "../src/string.mjs";
import { individual } from "./cases.mjs";

const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);
const FIX = JSON.parse(readFileSync(new URL("./s20-twelve.json", import.meta.url), "utf8"));
const FRAME_FILE = JSON.parse(readFileSync(new URL("../../workbench/body/frames/species-S20.json", import.meta.url), "utf8"));

// tests/s20-before.json: sha256 (first 16 hex) of stampCode + "|" + genomeString for individual(frame, 7) with every open chapter read, per frame (key species.version), taken before S20 joined

test("S20 is the last frame of the registry but the Igara and the Peplos at version 5 (appended at the merge of the game line) and the four language frames at version 8; every frame before it is the same bytes as before", () => {
  const frames = FRAME_DATA.frames, s20 = frames.at(-7);
  assert.deepEqual(frames.slice(-6).map((f) => `${f.species}.${f.version}`), ["10.5", "12.5", "1.8", "17.8", "18.8", "19.8"], "then the four language frames at version 8 (chapter 5), appended after the Igara and the Peplos");
  assert.equal(`${s20.species}.${s20.version}`, "20.1"); assert.equal(s20.id, "S20"); assert.equal(s20.name, "Tuliko");
  assert.equal(frames.filter((f) => f.species === 20).length, 1);
  assert.equal(frames.length, FRAMES_LIST.filter((f) => !f.synthetic).length);
});

test("every other frame stamps, codes and strings to the same bytes as before S20 joined", () => {
  const got = {};
  for (const f of FRAMES_LIST) {
    if (f.species === 20 || !((`${f.species}.${f.version}`) in BEFORE_DIGESTS)) continue;   // the Igara and the Peplos at 5 came with the merge
    const g = individual(f, 7, { read: f.chapters.filter((c) => !c.sealed).map((c) => c.name) });
    got[`${f.species}.${f.version}`] = sha(stampCode(f, g) + "|" + genomeString(f, g));
  }
  assert.deepEqual(got, BEFORE_DIGESTS);
});

const BEFORE_DIGESTS = JSON.parse(readFileSync(new URL("./s20-before.json", import.meta.url), "utf8"));

test("the registry's S20 is the workbench's frame: 54 open loci in five chapters, 40 continuous, no locked rows, its pools and values from the frame file", () => {
  const f = byName("S20"); assert.equal(f, frameFor(20, 1));
  assert.equal(f.heritable.length, 54); assert.equal(f.heritable.filter((l) => l.values).length, 40); assert.deepEqual(f.chapters.map((c) => c.name), ["Coat", "Face", "Shape", "Legs & tail", "Movement"]);
  assert.deepEqual(f.locked, []);
  assert.deepEqual(f.chapters.map((c) => c.loci.map((l) => l.id)), FRAME_FILE.chapters.map((c) => c.traits.flatMap((t) => t.loci)), "the ring order of the frame file");
  assert.equal(f.glyph.join("|"), FRAME_FILE.glyph.join("|"));
});

test("the type: its genome string is the frame's own, 82 characters, and the string, the stamp code and the stamp all read back", () => {
  const f = byName("S20"), type = { species: 20, version: 1, copies: FIX.type.copies };
  const s = genomeString(f, type);
  assert.equal(s, FIX.type.string); assert.equal(s, FRAME_FILE.counts.typeString); assert.equal(s.length, 82);
  const d = decodeGenomeString(s); assert.ok(d.ok, d.detail); assert.deepEqual(d.genome.copies, type.copies); assert.equal(genomeString(d.frame ?? f, d.genome), s);
  const code = stampCode(f, type); assert.equal(code, FIX.type.code); assert.equal(code, FRAME_FILE.counts.typeStampCode); assert.ok(code.startsWith("S20v1-1F-"));
  const back = decodeStampCode(code); assert.ok(back.ok, back.detail); assert.equal(back.genome.read.length, 5, "every chapter read"); assert.deepEqual(back.genome.copies, type.copies);
  const { L, cells } = encodeCells(f, { ...type, read: f.chapters.map((c) => c.name) }), bits = L.msgCells.map(([r, c]) => cells.get(r * L.N + c)?.v ?? 0);
  const parsed = parseMessage(bits, L.N, {}); assert.ok(parsed.ok, parsed.detail); assert.ok(sameGenome(f, { ...type, read: f.chapters.map((c) => c.name) }, parsed.genome));
  assert.equal(sizeFor(f, {}).N, 37, "plain, a Tuliko is 37x37"); assert.equal(sizeFor(f, { postmark: true }).N, 41, "with a postmark, 41x41");
});

test("the twelve Tuliko of the workbench decode and re-encode exactly, by string and by stamp code", () => {
  const f = byName("S20"); assert.equal(FIX.twelve.length, 12);
  assert.equal(new Set(FIX.twelve.map((t) => t.string)).size, 12);
  for (const t of FIX.twelve) {
    const label = `seed ${t.seed}`;
    assert.equal(genomeString(f, { copies: t.copies }), t.string, `${label}: encodes to the workbench's string`);
    const d = decodeGenomeString(t.string); assert.ok(d.ok, `${label}: ${d.detail}`); assert.deepEqual(d.genome.copies, t.copies, `${label}: decodes to the same copies`);
    assert.equal(genomeString(f, d.genome), t.string, `${label}: re-encodes exactly`);
    assert.equal(stampCode(f, { copies: t.copies }), t.code, `${label}: the stamp code`);
    const c = decodeStampCode(t.code); assert.ok(c.ok, `${label}: ${c.detail}`); assert.deepEqual(c.genome.copies, t.copies, `${label}: the stamp code reads back`);
  }
});
