#!/usr/bin/env node
// Writes prototypes/face/tests/vectors/metrics.json: the width of every Station string at 16, 20 and 28 px from the metrics table (ui/specs/measure.mjs over dist/metrics.json, made by face_metrics).
// face_test measures the same strings with lv_text_get_width on each build (native x86-64, aarch64 under qemu), so the fonts give the same widths everywhere.
//   node prototypes/face/tools/make-metrics-vectors.mjs          (writes; needs dist/metrics.json, from build.sh)     --check   (fails when the file is not current)
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createMeasure } from "../../ui/specs/measure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), out = path.resolve(here, "../tests/vectors/metrics.json"), mfile = path.resolve(here, "../dist/metrics.json");
if (!existsSync(mfile)) { console.error("dist/metrics.json is missing: run build.sh native"); process.exit(process.argv.includes("--check") ? 0 : 2); }
const measure = createMeasure(JSON.parse(readFileSync(mfile, "utf8"))), specs = path.resolve(here, "../../ui/specs/station"), frames = path.resolve(here, "../../workbench/frames");
const strings = new Set();
const walk = (v) => { if (typeof v === "string") { strings.add(v); for (const part of v.split(/[{}]/)) strings.add(part); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { strings.add(k); walk(x); } };
for (const f of readdirSync(specs).filter((f) => f.endsWith(".json"))) walk(JSON.parse(readFileSync(path.join(specs, f), "utf8")));
for (const f of readdirSync(frames).filter((f) => f.startsWith("species-"))) walk(JSON.parse(readFileSync(path.join(frames, f), "utf8")));
for (const n of [0, 1, 7, 9, 10, 12, 99, 100, 120, 999, 1000, 99999]) strings.add(String(n));
for (const s of ["A", "AV", "To", "Tj", "WA", "Ty", "ff", "fi", "r.", "Yo", "LT", "P,", "1.5", "Ünï", "naïve", "Legs & Tail", "Home ← Pods", "T12", " ", "a b  c"]) strings.add(s);
const pieces = new Set(); for (const s of strings) for (const p of s.split(/[⚡◆❀✕]/)) if (p && p.length <= 48 && !/[\n\r\t]/.test(p)) pieces.add(p);
const cases = []; for (const px of [16, 20, 28]) for (const t of [...pieces].sort()) cases.push({ px, text: t, width: measure(t, px) });
const text = JSON.stringify({ note: "Made by tools/make-metrics-vectors.mjs: each case is a string, a size and its width from the metrics table; the face must measure the same.", cases }).replace(/\},\{"px"/g, "},\n{\"px\"") + "\n";
if (process.argv.includes("--check")) { if (readFileSync(out, "utf8") !== text) { console.error("tests/vectors/metrics.json is not current: run tools/make-metrics-vectors.mjs"); process.exit(1); } console.log(`metrics vectors current: ${cases.length} cases`); }
else { writeFileSync(out, text); console.log(`wrote ${cases.length} cases, ${text.length} bytes`); }
