// Pods' words (lvgl-switch.md §2.2) against the JavaScript they replace. tests/vectors/pods-words.json holds, for each scene, the props views/pods-props.mjs gives and the hash of the framebuffer the
// JavaScript drew for the same scene (the old view and the components of the freeze, through the node path, with flat stand-in pictures keyed by id): the words, given the props and the same
// pictures, must draw the same pixels. The fixture was made once from the frozen drawing, so no test imports it. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/pods-words.test.mjs
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

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// a stand-in picture of an id at a size: a flat block of a colour the id hashes to, with a notch so a shift shows (the fixture's generator makes the same)
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, notch = x < 3 && y < 3 ? 60 : 0; d[i * 4] = 70 + (k & 127) + notch; d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, ...(slice ? { slice, tile } : {}) }; };

async function setup(c) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: podsSpec }), 0);
  for (const p of c.pictures) f.handleOf(p.id, (id) => standIn(id, p.w, p.h, p.slice, p.tile));
  return f;
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };

for (const c of cases) {
  test(`Pods ${c.state}: ${c.name}`, { skip }, async () => {
    const f = await setup(c);
    assert.equal(f.props(c.props), 0, f.errors().join("; ")); frames(f);
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0, "no node refused");
    assert.equal(f.hash(), c.hash);
  });
}
