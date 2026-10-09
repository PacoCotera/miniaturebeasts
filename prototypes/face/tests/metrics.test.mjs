// The metrics table (lvgl-switch.md §2.5): ui/specs/measure.mjs sums face/dist/metrics.json (the compiled fonts' advances and kerning, made by face_metrics); the WebAssembly face measures with
// lv_text_get_width. The two give the same integer for every string the Station can set: the strings of the spec files, the species' words, the figures. Skipped when the face has not been built.
//   node --test prototypes/face/tests/metrics.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createMeasure } from "../../ui/specs/measure.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")) && existsSync(path.join(dist, "metrics.json")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frames = path.resolve(here, "../../workbench/frames");

// every string a spec file holds, and the names of every species, chapter and trait
const strings = new Set();
const walk = (v) => { if (typeof v === "string") { strings.add(v); for (const part of v.split(/[{}]/)) strings.add(part); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { strings.add(k); walk(x); } };
for (const f of readdirSync(specs).filter((f) => f.endsWith(".json"))) walk(JSON.parse(readFileSync(path.join(specs, f), "utf8")));
for (const f of readdirSync(frames).filter((f) => f.startsWith("species-"))) walk(JSON.parse(readFileSync(path.join(frames, f), "utf8")));
for (const n of [0, 1, 7, 9, 10, 12, 99, 100, 120, 999, 1000, 99999]) strings.add(String(n));
for (const s of ["A", "AV", "To", "Tj", "WA", "Ty", "ff", "fi", "r.", "Yo", "LT", "P,", "1.5", "Ünï", "naïve", "Legs & Tail", "Home ← Pods", "T12", " ", "a b  c"]) strings.add(s);
const corpus = [...strings].filter((s) => s.length && s.length < 400 && !/[\n\r\t]/.test(s));

test("the table's sums equal lv_text_get_width on the WebAssembly face for every Station string, at 16, 20 and 28 px", { skip }, async () => {
  const metrics = JSON.parse(readFileSync(path.join(dist, "metrics.json"), "utf8")), measure = createMeasure(metrics);
  const f = await bootFace(pathToFileURL(dist + "/")); let n = 0, bad = [];
  for (const px of [16, 20, 28]) for (const s of corpus) {
    // the face sets a string whole; icons are other runs, so a string with ⚡ ◆ ❀ ✕ is measured piece by piece, as the words do
    for (const piece of s.split(/[⚡◆❀✕]/)) { if (!piece) continue; n++; const a = measure(piece, px), b = f.measure(piece, px); if (a !== b) bad.push(`${px}px ${JSON.stringify(piece)}: table ${a}, face ${b}`); }
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} of ${n} differ`); assert.ok(n > 1500, `${n} strings compared`);
});
test("the table holds kerning pairs and the sums use them", { skip }, () => {
  const metrics = JSON.parse(readFileSync(path.join(dist, "metrics.json"), "utf8")), measure = createMeasure(metrics);
  assert.deepEqual(Object.keys(metrics.fonts), ["16", "20", "28"]); const k = Object.keys(metrics.fonts["16"].kern);
  assert.ok(k.length > 0, "kerning pairs"); const [a, b] = k[0].split(",").map(Number), s = String.fromCodePoint(a, b);
  assert.equal(measure(s, 16), metrics.fonts["16"].advance[a] + metrics.fonts["16"].advance[b] + metrics.fonts["16"].kern[k[0]]);
  assert.equal(measure("", 16), 0); assert.throws(() => measure("a", 17));
});
test("the committed metrics vectors are what the table gives today", { skip }, () => { execFileSync(process.execPath, [path.resolve(here, "../tools/make-metrics-vectors.mjs"), "--check"], { stdio: "pipe" }); });
