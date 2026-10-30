// The metrics table (lvgl-switch.md §2.5): ui/specs/measure.mjs sums face/dist/metrics.json (the compiled fonts' advances and kerning, made by face_metrics); the WebAssembly face measures with
// lv_text_get_width. The two give the same integer for every string the Station can set: the strings of the spec files, the species' words, the figures. Skipped when the face has not been built.
//   node --test prototypes/face/tests/metrics.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createMeasure, measureRole, FONT_KEYS } from "../../ui/specs/measure.mjs";
import { installScene } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")) && existsSync(path.join(dist, "metrics.json")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frames = path.resolve(here, "../../workbench/frames");

// every string a spec file holds, and the names of every species, chapter and trait
const strings = new Set();
const walk = (v) => { if (typeof v === "string") { strings.add(v); for (const part of v.split(/[{}]/)) strings.add(part); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { strings.add(k); walk(x); } };
for (const f of readdirSync(specs).filter((f) => f.endsWith(".json") && !f.endsWith(".props.json"))) walk(JSON.parse(readFileSync(path.join(specs, f), "utf8")));
for (const f of readdirSync(frames).filter((f) => f.startsWith("species-"))) walk(JSON.parse(readFileSync(path.join(frames, f), "utf8")));
for (const n of [0, 1, 7, 9, 10, 12, 99, 100, 120, 999, 1000, 99999]) strings.add(String(n));
for (const s of ["A", "AV", "To", "Tj", "WA", "Ty", "ff", "fi", "r.", "Yo", "LT", "P,", "1.5", "Ünï", "naïve", "Legs & Tail", "Home ← Pods", "T12", " ", "a b  c"]) strings.add(s);
const corpus = [...strings].filter((s) => s.length && s.length < 400 && !/[\n\r\t]/.test(s));

test("the table's sums equal lv_text_get_width on the WebAssembly face for every Station string, at 16, 20 and 28 px and in Medium 16 (the font key 16m, the face's code 1016)", { skip }, async () => {
  const metrics = JSON.parse(readFileSync(path.join(dist, "metrics.json"), "utf8")), measure = createMeasure(metrics);
  const f = installScene(await bootFace(pathToFileURL(dist + "/node/"))); let n = 0, bad = [];
  const CODE = { 16: 16, 20: 20, 28: 28, "16m": 1016 };
  for (const px of [16, 20, 28, "16m"]) for (const s of corpus) {
    // the face sets a string whole; icons are other runs, so a string with ⚡ ◆ ❀ ✕ is measured piece by piece, as the words do
    for (const piece of s.split(/[⚡◆❀✕]/)) { if (!piece) continue; n++; const a = measure(piece, px), b = f.measure(piece, CODE[px]); if (a !== b) bad.push(`${px}px ${JSON.stringify(piece)}: table ${a}, face ${b}`); }
  }
  assert.deepEqual(bad.slice(0, 10), [], `${bad.length} of ${n} differ`); assert.ok(n > 2000, `${n} strings compared`);
});
test("the table holds kerning pairs and the sums use them", { skip }, () => {
  const metrics = JSON.parse(readFileSync(path.join(dist, "metrics.json"), "utf8")), measure = createMeasure(metrics);
  assert.deepEqual(Object.keys(metrics.fonts), ["14", "15", "16", "20", "28", "16m"]); const k = Object.keys(metrics.fonts["16"].kern);
  assert.ok(k.length > 0, "kerning pairs"); const [a, b] = k[0].split(",").map(Number), s = String.fromCodePoint(a, b);
  assert.equal(measure(s, 16), metrics.fonts["16"].advance[a] + metrics.fonts["16"].advance[b] + metrics.fonts["16"].kern[k[0]]);
  assert.equal(measure("", 16), 0); assert.throws(() => measure("a", 17));
});
test("the committed metrics vectors are what the table gives today", { skip }, () => { execFileSync(process.execPath, [path.resolve(here, "../tools/make-metrics-vectors.mjs"), "--check"], { stdio: "pipe" }); });
test("measureRole: each role of frame.json type.roles measures in its font (a variant as its role); an unknown role or font throws", { skip }, () => {
  const metrics = JSON.parse(readFileSync(path.join(dist, "metrics.json"), "utf8")), measure = createMeasure(metrics), frame = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8"));
  const roles = Object.entries(frame.type.roles); assert.equal(roles.length, 18);
  for (const [role, R] of roles) { const m = measureRole(metrics, frame, role); assert.equal(m("Legs & Tail"), measure("Legs & Tail", FONT_KEYS[R.font]), role); assert.ok(frame.type.fonts[R.font], role); }
  assert.equal(measureRole(metrics, frame, "figure.price")("Open the Bay"), measure("Open the Bay", "16m"));
  assert.equal(measureRole(metrics, frame, "nameTag.crowd")("Open the Bay"), measure("Open the Bay", "16m"), "a variant's font comes before the role's");
  assert.equal(measureRole(metrics, frame, "nameTag")("Open the Bay"), measure("Open the Bay", "20")); assert.equal(measureRole(metrics, frame, "figure.large")("Open the Bay"), measure("Open the Bay", "20"));
  assert.equal(measureRole(metrics, frame, "body.facts")("Open the Bay"), measure("Open the Bay", 16), "a variant with a pitch only keeps the role's font");
  assert.throws(() => measureRole(metrics, { type: { fonts: { R16: [16, 400] }, roles: { x: { font: "R16", variants: { v: { font: "X9" } } } } } }, "x.v"), /does not hold/);
  assert.throws(() => measureRole(metrics, { type: { fonts: { R16: [16, 400] }, roles: { x: { font: "R16", variants: { v: 5 } } } } }, "x.v"), /no variant/);
  assert.equal(measureRole(metrics, frame, "label")("Open the Bay"), measure("Open the Bay", 16), "a bare px is its default font: 16 is Regular");
  assert.throws(() => measureRole(metrics, frame, "nope"), /no text role/); assert.throws(() => measureRole(metrics, { type: { fonts: {}, roles: { x: { font: "M18" } } } }, "x"), /does not hold/);
  assert.deepEqual(Object.fromEntries(Object.entries(frame.type.fonts).map(([k, [px]]) => [k, String(px)])), { R14: "14", R15: "15", R16: "16", M16: "16", M20: "20", SB28: "28" }, "each font's px is its key's px");
});
