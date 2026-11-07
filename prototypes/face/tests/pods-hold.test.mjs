// Let go's held ✓ on the face (the pods picker's design B; frame.json hold, anim/hold.c, common/holdRing.c): with the frame carrying `hold` and the ring on a pod, ✓ down fills the ring on the pod (not at the screen's
// centre) and says nothing; a ✓ let go early says nothing; held to the end it says `confirm:held` once; props frame.hold.ms asks for a longer hold (a pod that carries the goal). Skipped when the test build has not been built.
//   node --test prototypes/face/tests/pods-hold.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { podsProps } from "../../station/src/views/pods-props.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), spec = J("pods"), H = frameSpec.hold, G = spec.regions.inventory.picker.grid;
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
setFrames(readdirSync(path.resolve(here, "../../workbench/frames/language")).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.resolve(here, "../../workbench/frames/language", f), "utf8"))));
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const st = (() => { const s = S.freshSt("w1", 1, 1000); S.normalize(s); for (const [sp, gs] of [["S01", 11], ["S02", 13], ["S02", 16]]) { const p = S.seedPodFromGenome(s, podGenome(frameOf(sp), gs), settings, 1000).pod; S.skipIdentify(s, p); } return s; })();
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const standIn = (id, [w, h]) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; };
async function start(ms) {
  const b = podsProps({ st, settings, docked: true, crates: 0, now: 5000, ui: { view: "inventory", sort: "use", chips: [], word: null, first: 0, verb: "letgo" }, focus: "card.1" }, spec, frameSpec);
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", spec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0, f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy(() => standIn(id, [16, 16])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy(() => standIn(r.id, Array.isArray(r.size) ? r.size : [16, 16])));
  const frame = { top: { screen: "pods", title: "Pods", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: "Home", need: "", ...b.line }, plate: { text: "" }, hold: { on: 1, ...(ms ? { ms } : {}) } };
  f.t = 1000; assert.equal(f.props({ screen: "pods", ...b.props, motion: true, frame }), 0, f.errors().join("; ")); f.frame((f.t += 16)); f.frame((f.t += 16)); f.poll("log"); return f;
}
const said = (f) => { const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };

test("with the ring on a pod under Let go the hold ring stands on the pod (its pod picture's centre), not at the screen's centre", { skip }, async () => {
  const f = await start(0), box = f.nodeBox("hold.ring")?.box; assert.ok(box, "the ring is drawn"); const cx = box[0] + box[2] / 2, cy = box[1] + box[3] / 2;
  assert.deepEqual([cx, cy], [G.origin[0] + G.pitch[0] + G.pod[0] + G.pod[2] / 2, G.origin[1] + G.pod[1] + G.pod[3] / 2], "centred on the second card's pod"); assert.notDeepEqual([cx, cy], H.centre);
  assert.deepEqual(f.errors(), []);
});
test("✓ down fills the ring and says nothing; let go early it says nothing; held to the end it says confirm:held once", { skip }, async () => {
  const f = await start(0); f.key("confirm", "down"); f.frame((f.t += 16)); assert.deepEqual(said(f), [], "✓ down says nothing");
  f.frame((f.t += 1000)); f.key("confirm", "up"); f.frame((f.t += 16)); assert.deepEqual(said(f), [], "a ✓ let go early says nothing (a quick ✓, a double ✓)");
  f.key("confirm", "down"); f.frame((f.t += 16)); f.frame((f.t += H.ms - 100)); assert.deepEqual(said(f), [], "not yet at the end"); f.frame((f.t += 200)); assert.deepEqual(said(f).map((m) => [m.t, m.target, m.verb]).map((x) => x[2]), ["confirm:held"], "held to the end: once");
  f.frame((f.t += 500)); assert.deepEqual(said(f), [], "and not again"); assert.deepEqual(f.errors(), []);
});
test("props frame.hold.ms asks for a longer hold (a pod that carries the goal or is the only of its species)", { skip }, async () => {
  const f = await start(6000); f.key("confirm", "down"); f.frame((f.t += 16)); f.frame((f.t += H.ms + 100)); assert.deepEqual(said(f), [], "past the frame's 3 s, not yet");
  f.frame((f.t += 3000)); assert.deepEqual(said(f).map((m) => m.verb), ["confirm:held"], "at 6 s");
});
