#!/usr/bin/env node
// Places the art director's signed contact shadows (T-20261018-vivarium: shadows/S01-{adult,juvenile}[-curl]-304x48-shadow.png) beside the layered stands: each file is copied unchanged into
// prototypes/ui/assets/stands/ after its size is read, and listed in that folder's index.json `files` with its size and SHA-256 (the loader checks both). The shadows are stand layers, not masters of the manifest.
// The index entries that use them (the "under" layer and `curl.shadow`) are written here and nowhere else. Nothing is painted or edited: the picture bytes are the studio's. Re-running is idempotent.
//   node prototypes/station/tools/place-stand-shadows.mjs --from <folder with the four PNGs> [--views home,vivarium,idle]
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../../ui/assets/stands"), indexFile = path.join(dest, "index.json");
const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : null; };
const from = arg("from"); if (!from) { console.error("usage: place-stand-shadows.mjs --from <folder> [--views home,vivarium,idle]"); process.exit(2); }
const views = (arg("views") ?? "home,vivarium,idle").split(",");
const dims = (buf) => { if (buf.subarray(1, 4).toString("ascii") !== "PNG") throw new Error("not a PNG"); return [buf.readUInt32BE(16), buf.readUInt32BE(20)]; };
const index = JSON.parse(readFileSync(indexFile, "utf8")), FEET_ROW = 24, STAND_FEET = 305;   // the shadow's row 24 sits on the stand's feet line, stand row 305
for (const stage of ["adult", "juvenile"]) {
  const set = index.stands.S01[stage], size = set.sizes["304x312"], put = (name) => {
    const buf = readFileSync(path.join(from, name)), [w, h] = dims(buf); if (w !== 304 || h !== 48) throw new Error(`${name} is ${w}×${h}, a shadow is 304×48`);
    copyFileSync(path.join(from, name), path.join(dest, name)); index.files[name] = { file: name, w, h, sha256: createHash("sha256").update(buf).digest("hex") }; return name;
  };
  size.layers = size.layers.filter((l) => l.op !== "under");
  size.layers.unshift({ op: "under", order: 0, file: put(`S01-${stage}-304x48-shadow.png`), views, size: [304, 48], feetRow: FEET_ROW, standFeet: STAND_FEET });
  set.curl = { shadow: put(`S01-${stage}-curl-304x48-shadow.png`), size: [304, 48], feetRow: FEET_ROW };
}
index.files = Object.fromEntries(Object.entries(index.files).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(indexFile, JSON.stringify(index, null, 1) + "\n");
console.log("placed 4 shadows in " + dest);
