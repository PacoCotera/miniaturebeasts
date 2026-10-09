#!/usr/bin/env node
// Places signed masters in the Station: copies each slice from a masters folder into prototypes/ui/assets/masters/<group>/, after checking its
// size and SHA-256 against the folder's own manifest, and writes prototypes/ui/assets/masters/index.json (id → file, size, hash, who signed).
// A slice is placed when it sits under a README heading that ends "(signed)", or when it is named with --ids; with --only just the named ones (the art director's list). Nothing else is placed; the
// rest are listed as not signed. Re-running is idempotent. `--check` verifies the installed files against the index (size, hash) and exits 1 on a difference.
//   node prototypes/ui/tools/place-masters.mjs --from art/station-masters/pods [--ids pod-large-identified,room-shelf] [--group pods] [--dry]
//   node prototypes/ui/tools/place-masters.mjs --check
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../assets/masters"), indexFile = path.join(dest, "index.json");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; }, flag = (k) => process.argv.includes("--" + k);
const sha = (buf) => createHash("sha256").update(buf).digest("hex");
const readIndex = () => (existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, "utf8")) : { schema: "mb-masters/1", masters: {} });
// a PNG's size from its header (indexed masters are legal: no decode needed)
const dims = (buf) => { if (buf.subarray(1, 4).toString("ascii") !== "PNG") throw new Error("not a PNG"); return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; };

// The ids a README lists under headings that end "(signed)": the first backticked cell of each table row below such a heading.
export function signedIds(readme) {
  const out = new Map(); let section = null;
  for (const line of readme.split("\n")) {
    const h = line.match(/^#{2,4}\s+(.*)$/); if (h) { section = /\(signed\)\s*$/i.test(h[1].trim()) ? h[1].trim() : null; continue; }
    const row = section && line.match(/^\|\s*`([^`]+)`\s*\|/); if (row) out.set(row[1], section);
  }
  return out;
}
export function check(root = dest) {
  const index = JSON.parse(readFileSync(path.join(root, "index.json"), "utf8")), problems = [];
  for (const [id, e] of Object.entries(index.masters)) {
    const f = path.join(root, e.file); if (!existsSync(f)) { problems.push(`${id}: ${e.file} is missing`); continue; }
    const buf = readFileSync(f), [w, h] = dims(buf);
    if (sha(buf) !== e.sha256) problems.push(`${id}: ${e.file} does not match its hash`);
    if (w !== e.w || h !== e.h) problems.push(`${id}: ${e.file} is ${w}×${h}, the index says ${e.w}×${e.h}`);
  }
  return problems;
}
export function place({ from, ids = [], group, dryRun = false, root = dest, headings = true, by = null }) {
  const manifest = JSON.parse(readFileSync(path.join(from, "slices/manifest.json"), "utf8")), readme = readFileSync(path.join(from, "README.md"), "utf8");
  const signed = headings ? signedIds(readme) : new Map(), want = new Map([...signed].filter(([id]) => manifest[id]));
  for (const id of ids) { if (!manifest[id]) throw new Error(`${id} is not in ${from}/slices/manifest.json`); want.set(id, "named with --ids"); }
  const idxFile = path.join(root, "index.json"), index = existsSync(idxFile) ? JSON.parse(readFileSync(idxFile, "utf8")) : { schema: "mb-masters/1", masters: {} };
  const placed = [], skipped = [];
  for (const [id, who] of want) {
    const m = manifest[id], src = path.join(from, "slices", id + ".png"), buf = readFileSync(src), [w, h] = dims(buf);
    if (w !== m.size[0] || h !== m.size[1]) throw new Error(`${id}: the file is ${w}×${h}, its manifest says ${m.size.join("×")}`);
    if (sha(buf) !== m.sha256) throw new Error(`${id}: the file does not match its manifest hash`);
    const file = `${group}/${id}.png`; placed.push(id);
    index.masters[id] = { file, w, h, sha256: m.sha256, signed: by ?? who, ...(m.nine ? { slice: [m.nine.insets.left, m.nine.insets.top, m.nine.insets.right, m.nine.insets.bottom], tile: m.nine.edgeTile } : {}) };   // a nine-slice master: its insets [l, t, r, b] and the edge tile
    if (!dryRun) { mkdirSync(path.join(root, group), { recursive: true }); copyFileSync(src, path.join(root, file)); }
  }
  for (const id of Object.keys(manifest)) if (!want.has(id)) skipped.push(id);
  index.masters = Object.fromEntries(Object.entries(index.masters).sort(([a], [b]) => a.localeCompare(b)));
  if (!dryRun) { mkdirSync(root, { recursive: true }); writeFileSync(idxFile, JSON.stringify(index, null, 1) + "\n"); }
  return { placed, skipped };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (flag("check")) { const p = existsSync(indexFile) ? check() : []; for (const x of p) console.error("FAIL " + x); console.log(`masters: ${Object.keys(readIndex().masters).length} placed, ${p.length} problems`); process.exit(p.length ? 1 : 0); }
  const from = arg("from"); if (!from) { console.error("usage: place-masters.mjs --from <masters folder> [--ids a,b [--only]] [--by <who signed>] [--group pods] [--dry] | --check"); process.exit(2); }
  const r = place({ from: path.resolve(from), ids: (arg("ids") ?? "").split(",").filter(Boolean), group: arg("group") ?? path.basename(path.resolve(from)), dryRun: flag("dry"), headings: !flag("only"), by: arg("by") });
  console.log(`placed ${r.placed.length}: ${r.placed.join(", ")}\nnot signed (left as stand-ins): ${r.skipped.length}`);
}
