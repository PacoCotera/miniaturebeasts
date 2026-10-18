#!/usr/bin/env node
// Places the art director's capsule masters (results/T-20261017-incubator-object/the capsule masters list, masters-pods a58d2827) into assets/masters/capsule/ and the index: the Incubator's room view (530 x 532 layers and the
// 1024 x 522 room crops), Create's chamber (145 x 224), Home's station (56 x 86), the Incubate panel's window (296 x 459 layers, the 474 x 468 room) and the opened pod's layers (bowl and cap, pod-opened-*).
// The ids are the file names without .png. Only the layers the build spec uses are placed. Re-running is idempotent.
//   node prototypes/ui/tools/place-capsule.mjs --from <dir holding masters/ of the work-queue result>
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url)), dest = path.resolve(here, "../assets/masters"), indexFile = path.join(dest, "index.json");
const from = process.argv[process.argv.indexOf("--from") + 1]; if (!from || process.argv.indexOf("--from") < 0) { console.error("--from <masters dir>"); process.exit(2); }
const SIGNED = "art director, the Incubator capsule masters (masters-pods a58d2827; the capsule masters list)";
const LIST = [
  ...["capsule-room-day-1024x522", "capsule-room-dusk-1024x522", "capsule-shell-530x532", "capsule-shell-dusk-530x532", "capsule-interior-day-530x532", "capsule-interior-dusk-530x532", "capsule-bar-lit-530x532", "capsule-door-open-530x532", "capsule-seal-ring-530x532", "capsule-glass-closed-530x532"].map((n) => ["room", n]),
  ...["capsule-shell-145x224", "capsule-interior-day-145x224", "capsule-bar-lit-145x224", "capsule-glass-closed-145x224"].map((n) => ["create", n]),
  ...["capsule-shell-56x86", "capsule-interior-day-56x86", "capsule-bar-lit-56x86", "capsule-door-open-56x86", "capsule-glass-closed-56x86"].map((n) => ["home", n]),
  ...["capsule-room-dusk-474x468", "capsule-interior-dusk-296x459", "capsule-shell-dusk-296x459", "capsule-seal-ring-296x459", "capsule-glass-closed-296x459"].map((n) => ["panel", n]),
  ...["bowl-shade", "bowl-mask-body", "bowl-mask-accent", ...["bands", "dots", "plates", "plates-relief", "ribs", "segments", "segments-relief", "stripes"].map((p) => "bowl-pattern-" + p), "cap-shade", "cap-mask-body", "cap-mask-accent"].map((n) => ["opened", "pod-opened-" + n]),
];
const index = JSON.parse(readFileSync(indexFile, "utf8"));
for (const [dir, name] of LIST) {
  const src = path.join(from, dir, name + ".png"), buf = readFileSync(src); mkdirSync(path.join(dest, "capsule"), { recursive: true });
  if (buf.subarray(1, 4).toString("ascii") !== "PNG") throw new Error(src + ": not a PNG");
  copyFileSync(src, path.join(dest, "capsule", name + ".png"));
  index.masters[name] = { file: `capsule/${name}.png`, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), sha256: createHash("sha256").update(buf).digest("hex"), signed: SIGNED };
}
writeFileSync(indexFile, JSON.stringify(index, null, 1) + "\n"); console.log(`placed ${LIST.length} capsule masters`);
