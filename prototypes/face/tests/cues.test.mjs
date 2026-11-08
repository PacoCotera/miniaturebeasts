// The bottom line's key cues (frame.json regions.cues; carrying keys): props frame.line.keys [{ room, word }] draw each live carry as the key's room icon and a word, in key order, right-aligned to 904 in the notice's
// zone, replacing the notice while they show; a cue that would pass the zone's left edge is dropped, the last first. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/cues.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), C = frameSpec.regions.cues;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const MARKS = ["vivarium", "research", "library"].map((r) => frameSpec.regions.marks.roomCue[r]);
const standIn = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4).fill(180) });
async function setup(line) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  for (const id of MARKS) f.handleOf(id, withPolicy(() => standIn(16, 16)));
  for (const id of ["frame-cap-confirm-16", "frame-cap-confirm-16-dim", "frame-cap-back-16"]) f.handleOf(id, withPolicy(() => standIn(16, 16)));
  const top = { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } };
  assert.equal(f.props({ screen: "library", state: "notBuilt", motion: true, frame: { top, line: { back: "Home", ...line }, plate: { text: "" } } }), 0, f.errors().join("; ")); f.frame(1000); f.frame(1016); return f;
}
const KEYS = [{ room: "research", word: "Read" }, { room: "vivarium", word: "Grow" }, { room: "library", word: "Untuva page" }];

test("the spec: cues stand in the notice's zone, a 16 px mark (the 16 px drawing) and a word in the back's role", () => { assert.equal(C.right, 904); assert.deepEqual(C.mark, [16, 16]); assert.equal(C.role, "back"); });

test("each live carry is the key's room icon and a word, in key order, ending at 904, and the notice is not drawn", { skip }, async () => {
  const f = await setup({ keys: KEYS, need: "Something waits" });
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const w = [0, 1, 2].map((i) => f.nodeBox(`line.cue.${i}.word.0`)?.box), m = [0, 1, 2].map((i) => f.nodeBox(`line.cue.${i}.mark`)?.box);
  assert.ok(w.every(Boolean) && m.every(Boolean), "every word and mark is drawn");
  for (let i = 0; i < 3; i++) { assert.deepEqual([m[i][2], m[i][3]], [16, 16]); assert.ok(m[i][0] + 16 + C.markGap <= w[i][0] + 1, "the mark then its word " + i); if (i) assert.ok(w[i - 1][0] + w[i - 1][2] + C.gap <= m[i][0] + 1, "cue " + i + " after cue " + (i - 1)); }
  assert.ok(w[2][0] + w[2][2] <= 904 + 1, "the last ends at 904"); assert.ok(m[0][0] >= C.left, "inside the zone");
  assert.equal(f.nodeBox("line.need.0")?.box ?? null, null, "the cues replace the notice");
});
test("no keys: the notice shows as before; a cue that would pass the zone's left edge is dropped, the last first", { skip }, async () => {
  const f = await setup({ need: "Something waits" }); assert.ok(f.nodeBox("line.need.0")?.box, "the notice"); assert.equal(f.nodeBox("line.cue.0.word.0")?.box ?? null, null);
  const long = [{ room: "vivarium", word: "A very long carried word here" }, { room: "research", word: "Another quite long word" }, { room: "library", word: "Coat page" }];
  const g = await setup({ keys: long }); assert.ok(g.nodeBox("line.cue.0.word.0")?.box, "the first stays"); assert.equal(g.nodeBox("line.cue.2.word.0")?.box ?? null, null, "the last is dropped");
  assert.deepEqual(g.errors(), []);
});
