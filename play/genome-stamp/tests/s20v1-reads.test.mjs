// The retired S20 v1 biped (frame 20.1) stays readable: its code, string and stamp image still parse, beside the rambler's 20.8.
//   node --test tests/s20v1-reads.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { frameFor } from "../src/frames.mjs";
import { encodeCells, parseMessage, sameGenome, decodeStampCode } from "../src/codec.mjs";
import { decodeGenomeString } from "../src/string.mjs";

test("a v1 S20 stamp still parses: code, string and stamp image read back through frame 20.1", () => {
  const t = JSON.parse(readFileSync(new URL("./s20-twelve.json", import.meta.url), "utf8")).type;
  const f1 = frameFor(20, 1), f8 = frameFor(20, 8);
  assert.ok(f1 && f8 && f1 !== f8); assert.equal(f1.heritable.length, 54);
  const c = decodeStampCode(t.code); assert.ok(c.ok, c.detail); assert.equal(c.genome.version, 1); assert.deepEqual(c.genome.copies, t.copies);
  const s = decodeGenomeString(t.string); assert.ok(s.ok, s.detail); assert.equal(s.genome.version, 1); assert.deepEqual(s.genome.copies, t.copies);
  const g = { species: 20, version: 1, copies: t.copies, read: f1.chapters.map((x) => x.name) };
  const { L, cells } = encodeCells(f1, g), bits = L.msgCells.map(([r, k]) => cells.get(r * L.N + k)?.v ?? 0);
  const p = parseMessage(bits, L.N, {}); assert.ok(p.ok, p.detail); assert.equal(p.genome.version, 1); assert.ok(sameGenome(f1, g, p.genome));
});
