// The not-built composition (frame.json notBuilt): a screen with no binding table shows the frame, the stage in colours.stageGround and one line centred on 512 with its cap top on 288; Idle with no binding
// shows the whole screen in the ground and its own line, no frame. Keys: a room key and ← (when the bottom line has a back word) are intents, everything else nothing; the first key on Idle is `wake`.
// Skipped when the face has not been built.
//   node --test prototypes/face/tests/notbuilt.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), N = frameSpec.notBuilt;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgbOf = (name) => { const h = palette.find(([n]) => n === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
async function setup() {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); return f;
}
const top = { screen: "library", title: "Library", turn: 12, turnFlash: false, materials: { e: 5, d: 40, s: 7 }, flash: {}, companion: { docked: true, withMibi: null } };
const props = (back) => ({ screen: "library", state: "notBuilt", frame: { top, line: { ok: null, back, subject: "", need: "Nothing here yet" }, plate: { text: "" } } });

test("a framed screen: the stage in the ground, the line centred on 512 with its cap top on 288, the frame drawn", { skip }, async () => {
  const f = await setup(); assert.equal(f.props(props("Home")), 0, f.errors().join("; ")); frames(f);
  assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0);
  const lg = logOf(f), t = lg.type.find((x) => x.text === N.strings.line); assert.ok(t, "the line is on the type layer"); assert.equal(t.px, N.regions.line.px);
  const r = lg.regions.find((x) => x.id === "notBuilt.line" && x.layer === "type"); assert.ok(r, "its region is the line"); assert.equal(r.rect[1] + 7, N.regions.line.capTop, "the text box starts 7 px above the cap top at 20 px");
  assert.ok(Math.abs(r.rect[0] + r.rect[2] / 2 - N.regions.line.centre) <= 1, `centred: ${r.rect}`);
  assert.deepEqual(f.pixel(20, 100), rgbOf(frameSpec.colours.stageGround), "the stage ground");
  assert.ok(lg.type.some((x) => x.text === "Library"), "the title"); assert.ok(lg.type.some((x) => x.text === "Home"), "the back word");
});

test("Idle with no binding: the whole screen in the ground, the Idle line, no frame", { skip }, async () => {
  const f = await setup(); assert.equal(f.props({ screen: "idle", idle: true }), 0, f.errors().join("; ")); frames(f);
  assert.deepEqual(f.errors(), []); const lg = logOf(f);
  assert.deepEqual(lg.type.map((x) => x.text), [N.strings.idle]); assert.deepEqual(f.pixel(2, 2), rgbOf(N.colours.ground)); assert.deepEqual(f.pixel(1020, 596), rgbOf(N.colours.ground));
});

test("keys: a room key is an intent, ← only with a back word, confirm and the pad nothing; any key on Idle is wake", { skip }, async () => {
  const f = await setup(); f.props(props("Home")); frames(f); f.drain(); f.inbox?.splice?.(0);
  const intents = () => { const out = []; for (let m; (m = f.poll("intent"));) out.push(m.verb); return out; };
  for (const k of ["confirm", "up", "down", "left", "right"]) f.key(k); assert.deepEqual(intents(), []);
  f.key("library"); f.key("home"); f.key("research"); f.key("habitat"); f.key("back"); assert.deepEqual(intents(), ["room:library", "room:home", "room:research", "room:habitat", "back"]);
  f.props(props("")); frames(f); f.key("back"); assert.deepEqual(intents(), [], "Home: no back word, nothing happens");
  f.props({ screen: "idle", idle: true }); frames(f); f.key("up"); f.key("confirm"); assert.deepEqual(intents(), ["wake", "wake"]);
});
