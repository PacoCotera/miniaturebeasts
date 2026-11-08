// The first-time teaching lines name their key by its cap (plan 3.17 B2): "Press {key:library} for its page" is words, the key's 16 px cap, words, centred in the middle slot (frame.json regions.subject), and a
// line that does not fit the slot is a words error, never an ellipsis. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/teach-cap.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const standIn = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4).fill(180) });
const CAPS = frameSpec.regions.marks.roomCue, SLOT = frameSpec.regions.subject.rect;
async function setup(subject) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  for (const k of ["home", "research", "library", "vivarium", "call", "confirm"]) f.handleOf(CAPS[k], withPolicy(() => standIn(16, 16)));
  for (const id of ["frame-cap-confirm-16-dim", "frame-cap-back-16"]) f.handleOf(id, withPolicy(() => standIn(16, 16)));
  const top = { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } };
  const r = f.props({ screen: "library", state: "notBuilt", motion: true, frame: { top, line: { back: "Home", subject }, plate: { text: "" } } }); f.frame(1000); f.frame(1016);
  return { f, r };
}

test("every teaching line carries a key token and none says a nickname or the word Call", () => {
  for (const [k, s] of Object.entries(frameSpec.strings.teach)) { if (k === "rule") continue; assert.match(s, /\{key:[a-z]+\}/, k); assert.ok(CAPS[/\{key:([a-z]+)\}/.exec(s)[1]], k + ": a cap for the token"); assert.doesNotMatch(s, /\b(book|pod|dome) key\b|Call/, k); }
});

for (const [k, s] of Object.entries(frameSpec.strings.teach)) {
  if (k === "rule" || k === "call") continue;   // the call line is Home's own (home_frame.c), over Home's wider goal zone
  test(`the ${k} line: words, a 16 px cap, words, inside the middle slot with no error and no ellipsis`, { skip }, async () => {
    const { f, r } = await setup(s);
    assert.equal(r, 0, f.errors().join("; ")); assert.deepEqual(f.errors(), []);
    const pre = f.nodeBox("line.subject.pre.0")?.box, cap = f.nodeBox("line.subject.cap")?.box, post = f.nodeBox("line.subject.post.0")?.box;
    assert.ok(pre && cap && post, "the words, the cap and the words are drawn");
    assert.deepEqual([cap[2], cap[3]], [16, 16]); assert.ok(pre[0] + pre[2] <= cap[0] && cap[0] + cap[2] <= post[0], "in order");
    assert.ok(pre[0] >= SLOT[0] && post[0] + post[2] <= SLOT[0] + SLOT[2], "inside the slot: " + [pre[0], post[0] + post[2]]);
  });
}

test("a line too wide for the slot is a words error", { skip }, async () => {
  const { f } = await setup("Press {key:library} for the page that shows everything this one has");
  assert.ok(f.errors().some((e) => /teaching line/.test(e)), f.errors().join("; "));
});
