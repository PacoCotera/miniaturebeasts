// The carry's flight and the cue's hop (frame.json cues.flight, cues.hop; props frame.flight { pic, room }; `flight` and `hop` events): the ringed thing's picture goes, 1:1 and in whole pixels, from the ring (the stage's
// middle on a screen with none) to the key's cue, on every face frame; a cue hops 4 px twice in 300 ms. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/flight.test.mjs
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
const KEYS = [{ room: "research", word: "Read" }, { room: "vivarium", word: "Grow" }, { room: "library", word: "Untuva page" }];
async function setup(flight, keys = KEYS) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  for (const id of MARKS) f.handleOf(id, withPolicy(() => standIn(24, 24)));
  for (const id of ["frame-cap-confirm-16", "frame-cap-confirm-16-dim", "frame-cap-back-16"]) f.handleOf(id, withPolicy(() => standIn(16, 16)));
  f.handleOf("flight-test", withPolicy(() => standIn(40, 48)));
  for (const n of ["energy", "data", "essence"]) f.handleOf(`icon:${n}:16`, withPolicy(() => standIn(16, 16)));
  const top = { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } };
  const props = () => ({ screen: "library", state: "notBuilt", motion: true, frame: { top, line: { back: "Home", keys }, plate: { text: "" }, ...(flight ? { flight } : {}) } });
  assert.equal(f.props(props()), 0, f.errors().join("; ")); f.frame(1000); f.frame(1016); return f;
}
const at = (f, t) => { f.frame(t); return f; };

test("the spec: the flight is 200 ms (400 for the first three carries) and the hop 4 px twice in 300 ms", () => { assert.deepEqual([C.flight.ms, C.flight.firstMs, C.flight.firstCarries], [200, 400, 3]); assert.deepEqual([C.hop.px, C.hop.times, C.hop.ms], [4, 2, 300]); });

test("the picture moves from the stage's middle to the cue's mark, every frame, 1:1, in whole pixels", { skip }, async () => {
  const f = await setup({ pic: "flight-test", room: "vivarium" });
  assert.equal(f.nodeBox("flight.pic")?.box ?? null, null, "no flight event, no picture");
  assert.equal(f.send({ t: "event", kind: "flight", target: "vivarium", ms: 200 }), 0, f.errors().join());
  const path_ = []; for (let t = 1032; t <= 1216; t += 16) { at(f, t); const b = f.nodeBox("flight.pic")?.box; if (b) path_.push(b); }
  assert.ok(path_.length >= 10, "drawn on every face frame of the flight: " + path_.length);
  for (const b of path_) { assert.deepEqual([b[2], b[3]], [40, 48], "1:1"); assert.ok(b.every(Number.isInteger)); }
  const mark = f.nodeBox("line.cue.1.mark")?.box, first = path_[0], last = path_[path_.length - 1];
  assert.ok(first[1] < 400 && last[1] > first[1], "it comes down from the stage");
  assert.ok(Math.abs(last[0] + 20 - (mark[0] + 12)) < 40 && Math.abs(last[1] + 24 - (mark[1] + 12)) < 40, "and ends on its cue " + JSON.stringify([last, mark]));
  for (let i = 1; i < path_.length; i++) assert.ok(path_[i][1] >= path_[i - 1][1], "monotone down");
  at(f, 1240); assert.equal(f.nodeBox("flight.pic")?.box ?? null, null, "gone when the flight is over"); assert.deepEqual(f.errors(), []);
});
test("a key whose cue is not shown (it does what ✓ says) flies to where the key stands", { skip }, async () => {
  const f = await setup({ pic: "flight-test", room: "research" }, [{ room: "vivarium", word: "Grow" }]);
  f.send({ t: "event", kind: "flight", target: "research", ms: 200 }); at(f, 1200);
  const b = f.nodeBox("flight.pic")?.box; assert.ok(b, "drawn"); assert.ok(Math.abs(b[0] + 20 - frameSpec.regions.answer.keysX[1]) < 30, "near the blue key's x: " + b[0]);
});
test("the cue hops 4 px twice in 300 ms and is back at rest after", { skip }, async () => {
  const f = await setup(null); const rest = f.nodeBox("line.cue.0.mark")?.box[1];
  f.send({ t: "event", kind: "hop", target: "research", ms: 300 });
  const ys = []; for (let t = 1032; t < 1316; t += 16) { at(f, t); ys.push(f.nodeBox("line.cue.0.mark").box[1] - rest); }
  assert.deepEqual([...new Set(ys)].sort((a, b) => a - b), [-4, 0], "up 4 px and back, nothing between"); assert.ok(ys.filter((y, i) => y === -4 && ys[i - 1] === 0).length >= 1);
  const ups = ys.reduce((n, y, i) => n + (y === -4 && (i === 0 || ys[i - 1] === 0) ? 1 : 0), 0); assert.equal(ups, 2, "twice");
  at(f, 1400); assert.equal(f.nodeBox("line.cue.0.mark").box[1] - rest, 0); assert.equal(f.nodeBox("line.cue.1.mark").box[1] - f.nodeBox("line.cue.2.mark").box[1], 0, "the others stay");
  assert.deepEqual(f.errors(), []);
});
