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
const MARKS = ["vivarium", "research", "library"].map((r) => frameSpec.regions.marks.room[r]);
const standIn = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4).fill(180) });
async function setup(line) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  for (const id of MARKS) f.handleOf(id, withPolicy(() => standIn(24, 24)));
  for (const id of ["frame-cap-confirm-16", "frame-cap-confirm-16-dim", "frame-cap-back-16"]) f.handleOf(id, withPolicy(() => standIn(16, 16)));
  const top = { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } };
  assert.equal(f.props({ screen: "library", state: "notBuilt", motion: true, frame: { top, line: { back: "Home", ...line }, plate: { text: "" } } }), 0, f.errors().join("; ")); f.frame(1000); f.frame(1016); return f;
}
const KEYS = [{ room: "research", word: "Read" }, { room: "vivarium", word: "Grow" }, { room: "library", word: "Untuva page" }];

test("the spec: cues stand in the notice's zone, a 24 px mark and a word in the back's role", () => { assert.equal(C.right, 904); assert.deepEqual(C.mark, [24, 24]); assert.equal(C.role, "back"); });

test("each live carry is the key's room icon and a word, in key order, ending at 904, and the notice is not drawn", { skip }, async () => {
  const f = await setup({ keys: KEYS, need: "Something waits" });
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const w = [0, 1, 2].map((i) => f.nodeBox(`line.cue.${i}.word.0`)?.box), m = [0, 1, 2].map((i) => f.nodeBox(`line.cue.${i}.mark`)?.box);
  assert.ok(w.every(Boolean) && m.every(Boolean), "every word and mark is drawn");
  for (let i = 0; i < 3; i++) { assert.deepEqual([m[i][2], m[i][3]], [24, 24]); assert.ok(m[i][0] + 24 + C.markGap <= w[i][0] + 1, "the mark then its word " + i); if (i) assert.ok(w[i - 1][0] + w[i - 1][2] + C.gap <= m[i][0] + 1, "cue " + i + " after cue " + (i - 1)); }
  assert.ok(w[2][0] + w[2][2] <= 904 + 1, "the last ends at 904"); assert.ok(m[0][0] >= C.left, "inside the zone");
  assert.equal(f.nodeBox("line.need.0")?.box ?? null, null, "the cues replace the notice");
});
test("items 5 and 9: past 616 the cues grow left to 416 and the middle words go; still short, the mist second-tap cue goes first, then the last", { skip }, async () => {
  assert.equal(C.growLeft, 416);
  const mid = [{ room: "research", word: "Untuva pods" }, { room: "vivarium", word: "Visit" }, { room: "library", word: "Untuva page" }, { room: "library", word: "Family tree" }].slice(0, 3);
  const fits = await setup({ keys: [{ room: "research", word: "Read" }, { room: "library", word: "Page" }], subject: "The middle words" });
  assert.ok(fits.nodeBox("line.subject.0")?.box, "two short cues fit the zone: the middle words stay");
  const wide = await setup({ keys: [{ room: "research", word: "Untuva pods and more" }, { room: "vivarium", word: "Visit the mibi" }, { room: "library", word: "Untuva page" }], subject: "The middle words" });
  const m0 = wide.nodeBox("line.cue.0.mark")?.box; assert.ok(m0 && m0[0] < C.left && m0[0] >= C.growLeft, "the cues grew left of 616 and no further than 416: " + m0?.[0]);
  assert.equal(wide.nodeBox("line.subject.0")?.box ?? null, null, "and the middle words are not drawn while they do");
  void mid;
  const second = { room: "vivarium", word: "Vivarium", second: true };
  const g = await setup({ keys: [{ room: "research", word: "Untuva pods and more" }, second, { room: "library", word: "Untuva page" }], subject: "The middle words" });
  assert.ok(g.nodeBox("line.cue.1.mark")?.box && g.nodeBox("line.cue.1.word.0")?.box, "the second-tap cue stands in its key's place (an outline and a mist word)"); assert.deepEqual(g.errors(), []);
  const tight = await setup({ keys: [{ room: "research", word: "A very long carried word here ok" }, second, { room: "library", word: "Another quite long word to read" }], subject: "The middle words" });
  assert.equal(tight.nodeBox("line.cue.1.word.0")?.box ?? null, null, "still short: the mist cue goes first"); assert.ok(tight.nodeBox("line.cue.0.word.0")?.box, "the first cue stays");
  const four = await setup({ keys: [{ room: "research", word: "A very long carried word here ok" }, { room: "vivarium", word: "Another quite long word to read" }, { room: "library", word: "Yet another long word here" }], subject: "x" });
  assert.equal(four.nodeBox("line.cue.2.word.0")?.box ?? null, null, "then the cues from the last"); assert.ok(four.nodeBox("line.cue.0.word.0")?.box); assert.deepEqual(four.errors(), []);
});
test("no keys: the notice shows as before; a cue that would pass the zone's left edge is dropped, the last first", { skip }, async () => {
  const f = await setup({ need: "Something waits" }); assert.ok(f.nodeBox("line.need.0")?.box, "the notice"); assert.equal(f.nodeBox("line.cue.0.word.0")?.box ?? null, null);
  const long = [{ room: "vivarium", word: "A very long carried word here" }, { room: "research", word: "Another quite long word" }, { room: "library", word: "Coat page" }];
  const g = await setup({ keys: long }); assert.ok(g.nodeBox("line.cue.0.word.0")?.box, "the first stays"); assert.equal(g.nodeBox("line.cue.2.word.0")?.box ?? null, null, "the last is dropped");
  assert.deepEqual(g.errors(), []);
});
