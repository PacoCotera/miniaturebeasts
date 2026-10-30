#!/usr/bin/env node
// Decoder CLI: image -> genome (species, frame version, read and unread
// chapters, every copy of every shown locus). Only verified reads are printed:
// Reed–Solomon corrected and the CRC-16 passed. PNG is read natively; other
// formats (a phone's JPEG) go through ImageMagick's `convert` if present.
//
//   node decode.mjs photo.jpg [--all] [--expect genome.json]
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { decodePNG } from "./src/png.mjs";
import { decode } from "./src/decode.mjs";
import { frameFor } from "./src/frames.mjs";
import { stampCode, sameGenome } from "./src/codec.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--expect"));
if (!file) { console.error("usage: node decode.mjs <image> [--all] [--expect genome.json]"); process.exit(2); }
let buf = readFileSync(file);
if (buf.readUInt32BE(0) !== 0x89504e47) {
  const c = spawnSync("convert", [file, "-auto-orient", "png:-"], { maxBuffer: 1 << 30 });
  if (c.status !== 0) { console.error("not a PNG, and ImageMagick could not convert it"); process.exit(2); }
  buf = c.stdout;
}
const res = decode(decodePNG(buf), { all: args.includes("--all") });
if (!res.ok) { console.log(JSON.stringify({ ok: false, error: res.error, ms: res.ms })); process.exit(1); }
const ei = args.indexOf("--expect");
const expected = ei >= 0 ? JSON.parse(readFileSync(args[ei + 1], "utf8")) : null;
for (const s of res.stamps) {
  const frame = frameFor(s.genome.species, s.genome.version);
  console.log(JSON.stringify({
    ok: true, code: stampCode(frame, s.genome), species: frame.name, ...s.genome, crc: s.crc, postmark: s.postmark,
    stamp: { cells: s.N, correctedBytes: s.corrected, of: s.codewordBytes, mirrored: !!s.mirror, quad: s.quad.map((p) => p.map((v) => +v.toFixed(1))) },
    ...(expected ? { matchesExpected: sameGenome(frame, expected, s.genome) } : {}),
  }, null, 1));
}
console.error(`${res.stamps.length} stamp(s), ${res.ms} ms`);
