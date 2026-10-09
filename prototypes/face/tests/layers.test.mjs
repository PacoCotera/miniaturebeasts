// The art director's layer table on Pods' words: every case of tests/vectors/pods-words.json is drawn with palette-exact pictures for the ids the table calls art and pictures outside the palette
// (a painted master's stand-in) for every other id; chrome (pass 1) and chrome + art (pass 2) must then read 0 pixels outside the palette, and the painted layer must show them (pass 3 reads more).
// A picture tagged art that the table calls painted, or the reverse, fails here. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/layers.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8"));
const inPalette = new Set(palette.map(([, hex]) => hex.toLowerCase())), rgbs = palette.map(([, hex]) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
const hex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// The table (the art director's, 2026-10-09). Art: rail emblems, the material icons, the species marks, the small marks (can-grow, waiting, line-seed, asleep), finds at 16, the glint star, the cell outline,
// the kin ring and the hatch (stand-ins until their masters come), the beam, the rings the face composes. Everything else is a painted master: pods, trait crops, figures and the halo, plates,
// rail tab grounds, clan marks, place pictures at 64 and 112, room stages, collection rings, panels and wells, the stamp and its case.
const ART = [/^emblem:/, /^icon:/, /^grow:/, /^waiting:/, /^kinring:/, /^hatch:/, /^beam:/, /^glint|^star/, /^mark-(species|asleep|line-seed|can-grow|waiting)/, /^place:[a-z]+:16$/, /^cell-outline/];
const isArt = (id) => ART.some((re) => re.test(id));
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, w, h, slice, tile) => {
  const d = new Uint8ClampedArray(w * h * 4), k = hash(id);
  let rgb; if (isArt(id)) rgb = rgbs[k % rgbs.length]; else { rgb = [70 + (k & 127), 70 + ((k >> 7) & 127), 70 + ((k >> 14) & 127)]; while (inPalette.has(hex(...rgb))) rgb[0]++; }
  for (let i = 0; i < w * h; i++) { d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2]; d[i * 4 + 3] = 255; }
  return { w, h, data: d, ...(slice ? { slice, tile } : {}) };
};
async function setup(c) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: podsSpec }), 0);
  for (const p of c.pictures) f.handleOf(p.id, (id) => standIn(id, p.w, p.h, p.slice, p.tile));
  return f;
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };

let painted = 0;
for (const c of cases) {
  test(`layers, Pods ${c.state}: ${c.name}`, { skip }, async () => {
    const f = await setup(c);
    assert.equal(f.props(c.props), 0, f.errors().join("; ")); frames(f);
    if (c.events) { const t0 = f.t; for (const e of c.events) assert.equal(f.send({ t: "event", ...e }), 0); f.frame(t0 + c.at); }
    f.pass(1); assert.equal(f.offPalette(), 0, "chrome reads pixels outside the palette");
    f.pass(2); assert.equal(f.offPalette(), 0, "chrome and art read pixels outside the palette");
    f.pass(3); painted += f.offPalette();
  });
}
test("the check bites: the painted layer shows pictures outside the palette in some case", { skip }, () => { assert.ok(painted > 0, "no case drew a painted picture"); });
