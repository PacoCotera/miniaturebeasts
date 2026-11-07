#!/usr/bin/env node
// Bakes the placed masters (prototypes/ui/assets/masters/index.json) into LVGL 9 binary images (lvgl-switch.md §2.4): a 12-byte header (magic 0x19, colour format ARGB8888 = 0x10, flags 0, width, height,
// stride, little endian) and the pixels as B, G, R, A in memory with straight alpha. No compression (LV_USE_LZ4 is the option for a size that needs it); no colour management: the sandbox and the Pi load the
// same bytes, so neither runs a PNG decoder or a browser's colour conversion. Writes <out>/<id>.bin and <out>/images.json (id → file, size, bytes, SHA-256 of the file and of its PNG source); re-running is
// idempotent. `--check` verifies the baked files against the masters' index (the source hash) and against their own hashes, and exits 1 on a difference.
//   node prototypes/face/tools/bake-images.mjs [--out prototypes/face/dist/images] [--masters prototypes/ui/assets/masters]     node .../bake-images.mjs --check
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { decodePNG } from "../../ui/png.mjs";

export const MAGIC = 0x19, CF_ARGB8888 = 0x10, HEADER = 12;
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
// One image: RGBA (straight alpha, w*h*4) to the LVGL binary.
export function bakeImage(w, h, rgba) {
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 65535 || h > 65535) throw new Error(`bake: ${w}x${h} is not an image size`);
  if (rgba.length !== w * h * 4) throw new Error(`bake: ${rgba.length} bytes for ${w}x${h}`);
  const out = Buffer.alloc(HEADER + w * h * 4);
  out[0] = MAGIC; out[1] = CF_ARGB8888; out.writeUInt16LE(0, 2); out.writeUInt16LE(w, 4); out.writeUInt16LE(h, 6); out.writeUInt16LE(w * 4, 8); out.writeUInt16LE(0, 10);
  for (let i = 0, o = HEADER; i < w * h * 4; i += 4, o += 4) { out[o] = rgba[i + 2]; out[o + 1] = rgba[i + 1]; out[o + 2] = rgba[i]; out[o + 3] = rgba[i + 3]; }
  return out;
}
// The header of a baked image, read back.
export function readHeader(buf) { return { magic: buf[0], cf: buf[1], flags: buf.readUInt16LE(2), w: buf.readUInt16LE(4), h: buf.readUInt16LE(6), stride: buf.readUInt16LE(8) }; }
export function bakeAll({ masters, out }) {
  const index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")), images = {};
  mkdirSync(out, { recursive: true });
  for (const [id, e] of Object.entries(index.masters)) {
    const png = readFileSync(path.join(masters, e.file)), pic = decodePNG(png);
    if (pic.width !== e.w || pic.height !== e.h) throw new Error(`${id}: the PNG is ${pic.width}x${pic.height}, the index says ${e.w}x${e.h}`);
    const bin = bakeImage(pic.width, pic.height, pic.data); writeFileSync(path.join(out, id + ".bin"), bin);
    images[id] = { file: id + ".bin", w: pic.width, h: pic.height, bytes: bin.length, sha256: sha(bin), source: e.sha256 };
  }
  writeFileSync(path.join(out, "images.json"), JSON.stringify({ schema: "mb-images/1", images }, null, 1) + "\n");
  return images;
}
// The baked files against the masters' index and their own index: the problems, as sentences.
export function checkBaked({ masters, out }) {
  const index = JSON.parse(readFileSync(path.join(masters, "index.json"), "utf8")), baked = JSON.parse(readFileSync(path.join(out, "images.json"), "utf8")).images, problems = [];
  for (const [id, e] of Object.entries(index.masters)) {
    const b = baked[id]; if (!b) { problems.push(`${id}: not baked`); continue; }
    if (b.source !== e.sha256) problems.push(`${id}: baked from a PNG that is not the placed master (hash ${b.source.slice(0, 8)}, the index says ${e.sha256.slice(0, 8)})`);
    const f = path.join(out, b.file); if (!existsSync(f)) { problems.push(`${id}: ${b.file} is missing`); continue; }
    const buf = readFileSync(f), h = readHeader(buf);
    if (sha(buf) !== b.sha256) problems.push(`${id}: ${b.file} does not match its hash`);
    if (h.magic !== MAGIC || h.cf !== CF_ARGB8888 || h.w !== e.w || h.h !== e.h || h.stride !== e.w * 4 || buf.length !== HEADER + e.w * e.h * 4) problems.push(`${id}: ${b.file} has the wrong header or size`);
  }
  for (const id of Object.keys(baked)) if (!index.masters[id]) problems.push(`${id}: baked but no longer a placed master`);
  return problems;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url)), arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? path.resolve(process.argv[i + 1]) : d; };
  const masters = arg("masters", path.resolve(here, "../../ui/assets/masters")), out = arg("out", path.resolve(here, "../dist/images"));
  if (process.argv.includes("--check")) { const p = checkBaked({ masters, out }); for (const s of p) console.error("FAIL " + s); console.log(p.length ? `${p.length} problems` : "baked images match the masters' index"); process.exit(p.length ? 1 : 0); }
  const images = bakeAll({ masters, out }); console.log(`baked ${Object.keys(images).length} images into ${out}`);
}
