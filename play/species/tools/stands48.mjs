#!/usr/bin/env node
// Writes framework/stands48.json: the 48 px silhouette of each kind's adult stand, which roster.read48 (framework/census.mjs) reads.
//   node tools/stands48.mjs <list> <out>
// <list> is a text file with one line per kind: the kind's id, a space, then the path of the stand's 48x48 picture (a PNG with
// an alpha channel; a pixel is in the silhouette when its alpha is 128 or more). The stands are the approved game set's adult
// pictures, one per kind, cut at 304, 96 and 48. The result keeps only the bits and the file's name, never a path.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decodePNG } from "../framework/png.mjs";

const [list, out] = process.argv.slice(2);
if (!list || !out) { console.error("usage: node tools/stands48.mjs <list> <out>"); process.exit(2); }
const kinds = {};
for (const line of readFileSync(list, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)) {
  const [id, file] = line.split(/\s+/);
  const img = decodePNG(readFileSync(file));
  if (img.width !== 48 || img.height !== 48) throw new Error(`${id}: ${file} is ${img.width}x${img.height}, not 48x48`);
  const rows = [];
  for (let y = 0; y < 48; y++) {
    let r = "";
    for (let x = 0; x < 48; x++) r += img.data[(y * 48 + x) * 4 + 3] >= 128 ? "#" : ".";
    rows.push(r);
  }
  if (!rows.some((r) => r.includes("#"))) throw new Error(`${id}: an empty silhouette`);
  kinds[id] = { file: path.basename(file), rows };
}
const text = JSON.stringify({ schema: "mb-stands-48/1", size: 48, alpha: 128, kinds }, null, 1) + "\n";
writeFileSync(out, text);
console.log(`${Object.keys(kinds).length} silhouettes written`);
