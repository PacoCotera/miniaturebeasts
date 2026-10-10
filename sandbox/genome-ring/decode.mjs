#!/usr/bin/env node
// Decoder CLI: image -> genome (species, version, both copies per shown locus,
// unread chapters), with the check verified. PNG is read natively; other
// formats (JPEG from a phone) go through ImageMagick's `convert` if present.
//
//   node decode.mjs ring.png [--all] [--expect genome.json]
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { decodePNG } from "./src/png.mjs";
import { decode } from "./src/decode.mjs";
import { frameFor } from "./src/frames.mjs";
import { ringCode, sameGenome } from "./src/codec.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
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
for (const r of res.rings) {
  const frame = frameFor(r.genome.species, r.genome.version);
  console.log(JSON.stringify({
    ok: true, code: ringCode(frame, r.genome), crc: r.crc, ...r.genome,
    ring: { center: r.center.map((v) => +v.toFixed(1)), diameter: +(2 * r.radius).toFixed(1), mirrored: r.dir < 0, minMargin: +r.minMargin.toFixed(3) },
    ...(expected ? { matchesExpected: sameGenome(frame, expected, r.genome) } : {}),
  }, null, 1));
}
console.error(`${res.rings.length} ring(s), ${res.ms} ms`);
