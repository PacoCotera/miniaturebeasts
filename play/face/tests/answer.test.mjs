// Call's answer on the face (frame.json regions.answer; props frame.answer): the stage dimmed and a tag over each key where the key stands: the four colour keys centred on keysX (top 508, 150 x 40, a notch under them),
// ← on backX, ✓ and Call right-aligned to 1008 at their rows. A screen that draws its own answer (props regions.inv.answer) gets no frame dim. Skipped when the test build has not been built.
//   node --test prototypes/face/tests/answer.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), A = frameSpec.regions.answer;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const ANSWER = { keys: [{ room: "home", word: "Home" }, { room: "research", word: "Read it" }, { room: "vivarium", word: "Grow it" }, { room: "library", word: "Untuva page" }], ok: "Take to the reading room", back: "Home", call: "Hide this" };
async function start(frameExtra = {}, regions = null) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0);
  for (const id of [...Object.values(frameSpec.regions.marks.room).filter((x) => typeof x === "string"), "frame-cap-confirm-16", "frame-cap-back-16"]) { const s = id.includes("cap") ? 16 : 24; f.handleOf(id, withPolicy(() => ({ w: s, h: s, data: new Uint8ClampedArray(s * s * 4).fill(160) }))); }
  const top = { screen: "library", title: "Library", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } };
  const props = { screen: "library", state: "notBuilt", motion: true, frame: { top, line: { back: "Home", ok: "Take to the reading room" }, plate: { text: "" }, ...frameExtra } }; if (regions) props.regions = regions;
  assert.equal(f.props(props), 0, f.errors().join("; ")); f.frame(1000); f.frame(1016); return f;
}
test("the spec: four tags at the hardware's key positions, 150 x 40 with a notch, ← at 928, ✓ and Call at the right edge", () => {
  assert.deepEqual(A.keysX, [223, 382, 542, 702]); assert.equal(A.backX, 928); assert.deepEqual([A.w, A.h, A.top, A.notch], [150, 40, 508, 9]); assert.equal(A.confirm.y, 456); assert.equal(A.call.y, 404); assert.equal(A.confirm.right, 1008);
});
test("Call's answer draws the dim and a tag over each key, in place", { skip }, async () => {
  const f = await start({ answer: ANSWER }); assert.deepEqual(f.errors(), []); if (process.env.DBG) console.log(JSON.stringify(f.lastLog?.refusedNodes ?? f.lastLog)); assert.equal(f.refused(), 0);
  assert.ok(f.nodeBox("answer.dim")?.box, "the stage's dim");
  for (let i = 0; i < 4; i++) { const b = f.nodeBox(`ans.k.${i}`)?.box; assert.ok(b, "tag " + i); assert.deepEqual([b[0] + b[2] / 2, b[1], b[2], b[3]], [A.keysX[i], A.top, A.w, A.h + A.notch], "tag " + i + " over its key"); assert.ok(f.nodeBox(`ans.k.${i}.word.0`)?.box, "its word"); }
  const back = f.nodeBox("ans.back")?.box; assert.equal(back[0] + back[2] / 2, A.backX); const ok = f.nodeBox("ans.ok")?.box, call = f.nodeBox("ans.call")?.box;
  assert.deepEqual([ok[0] + ok[2], ok[1], call[0] + call[2], call[1]], [A.confirm.right, A.confirm.y, A.call.right, A.call.y], "✓ and Call right-aligned at their rows"); assert.ok(f.nodeBox("ans.call.disc")?.box, "Call's cap");
});
test("without the answer nothing of it is drawn; a screen that draws its own (regions.inv.answer) gets no frame dim, only the tags", { skip }, async () => {
  const f = await start(); assert.equal(f.nodeBox("answer.dim")?.box ?? null, null); assert.equal(f.nodeBox("ans.k.0")?.box ?? null, null);
  const g = await start({ answer: ANSWER }, { inv: { answer: true } }); assert.equal(g.nodeBox("answer.dim")?.box ?? null, null, "no dim"); assert.ok(g.nodeBox("ans.k.1")?.box, "tags only");
});
