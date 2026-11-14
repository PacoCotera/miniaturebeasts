// The keys on the face (lvgl-switch.md §2.6): a direction moves the ring by the spec's graph on the boxes the words drew and sends `focus`; ✓ ← and the room keys send `intent` on the focused target;
// the ring moves on the frame of the key, before the new props arrive. Pods' reading room (tests/pods-scenes.mjs) and Compare (the props of tests/vectors/pods-words.json, its two papers); the inventory's graph is pods-inventory.test.mjs's. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/pods-keys.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { podsCases } from "./pods-scenes.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8"));   // Compare's scenes; the other states are drawn from tests/pods-scenes.mjs
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, ...(slice ? { slice, tile } : {}) }; };
const frames = (f, n = 2) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };
async function start(c, focus) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", colours: palette }); f.send({ t: "spec", screen: "frame", json: frameSpec }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  for (const p of c.pictures) f.handleOf(p.id, withPolicy((id) => standIn(id, p.w, p.h, p.slice, p.tile)));
  const props = JSON.parse(JSON.stringify(c.props)); if (focus) props.focus.cur = focus;
  assert.equal(f.props(props), 0); frames(f); f.poll("log"); return f;
}
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

test("✓, ← and the room keys are intents on the focused target; the dock key is not the face's", { skip }, async () => {
  const f = await start(podsCases().find((c) => c.name === "a sealed pod"));
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.target, m.verb]), [["intent", "key", "confirm"]], "a sealed pod: Identify on the price key");
  assert.deepEqual(key(f, "back").map((m) => m.verb), ["back"]);
  for (const k of ["home", "research", "library", "habitat"]) assert.deepEqual(key(f, k).map((m) => m.verb), ["room:" + k]);
  assert.deepEqual(key(f, "dock"), []);
});
test("the reading screen's keys (ux-reading-v2.md §2.6): on the rail every pad key steps (the host moves the bracket, shows the stamp); on a read chapter ▲ ▼ move the ring between the plates and ◀ steps back to the rail", { skip }, async () => {
  const f = await start(podsCases().find((c) => c.name === "the rail"));
  for (const [k, v] of [["left", "step:left"], ["right", "step:right"], ["up", "step:up"], ["down", "step:down"]]) assert.deepEqual(key(f, k).map((m) => [m.t, m.target, m.verb]), [["intent", "rail", v]]);
  const g = await start(podsCases().find((c) => c.name === "a read chapter open"));
  assert.deepEqual(key(g, "down").map((m) => [m.t, m.target]), [["focus", "plate.1"]], "▼ to the next plate"); assert.deepEqual(key(g, "left").map((m) => [m.t, m.target, m.verb]), [["intent", "plate.1", "step:left"]], "◀ back to the rail: the host's");
});
test("a screen without words says nothing to the keys", { skip }, async () => {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true }); assert.deepEqual(key(f, "right"), []);
});

test("Compare's focus: the targets are the two papers' Take buttons; ◀ ▶ move the ring between them, ▲ ▼ send step on either, ▶ on the kin's Take sends step; ✓ and ← are intents on the ring's Take", { skip }, async () => {
  const c = cases.find((x) => x.state === "compare" && x.props.focus.cur === "takeA"); assert.deepEqual(c.props.focus.targets.map((t) => t.id), ["takeA", "takeB"]);
  const f = await start(c); const h1 = f.hash();
  assert.deepEqual(key(f, "down").map((m) => [m.t, m.target, m.verb]), [["intent", "takeA", "step:down"]], "▼ steps the chapter; the ring stays"); assert.deepEqual(key(f, "up").map((m) => m.verb), ["step:up"]);
  assert.deepEqual(key(f, "left"), [], "◀ from this pod's Take: none"); assert.equal(f.hash(), h1, "nothing moved on the face");
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.target]), [["focus", "takeB"]], "▶ to the kin's Take"); assert.notEqual(f.hash(), h1, "the ring moves on the frame of the key");
  assert.deepEqual(key(f, "right").map((m) => [m.t, m.target, m.verb]), [["intent", "takeB", "step:right"]], "▶ on the kin's Take: the host swaps the kin");
  assert.deepEqual(key(f, "left").map((m) => [m.t, m.target]), [["focus", "takeA"]]);
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.target, m.verb]), [["intent", "takeA", "confirm"]]); assert.deepEqual(key(f, "back").map((m) => m.verb), ["back"]);
  assert.deepEqual(f.errors(), []);
});

