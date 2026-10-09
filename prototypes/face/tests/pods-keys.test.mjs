// The keys on the face (lvgl-switch.md §2.6): a direction moves the ring by the spec's graph on the boxes the words drew and sends `focus`; ✓ ← and the room keys send `intent` on the focused target;
// the ring moves on the frame of the key, before the new props arrive. Pods' states, from the props of tests/vectors/pods-words.json. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/pods-keys.test.mjs
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
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, ...(slice ? { slice, tile } : {}) }; };
const frames = (f, n = 2) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };
async function start(c, focus) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", colours: palette }); f.send({ t: "spec", screen: "frame", json: frameSpec }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  for (const p of c.pictures) f.handleOf(p.id, (id) => standIn(id, p.w, p.h, p.slice, p.tile));
  const props = JSON.parse(JSON.stringify(c.props)); if (focus) props.focus.cur = focus;
  assert.equal(f.props(props), 0); frames(f); f.poll("log"); return f;
}
const key = (f, k) => { f.send({ t: "key", k }); frames(f); const out = []; for (let m; (m = f.poll());) if (m.t === "focus" || m.t === "intent") out.push(m); return out; };
const find = (state, re) => cases.find((c) => c.state === state && re.test(c.name));

test("the overview: ▶ from the pod goes down the ordered list (no kin: the hatch), and the ring moves on the frame of the key", { skip }, async () => {
  const f = await start(find("overview", /unidentified pod, the pod focused/)), before = f.hash();
  const [m] = key(f, "right"); assert.equal(m.t, "focus"); assert.equal(m.target, "hatch"); assert.equal(m.screen, "pods");
  assert.notEqual(f.hash(), before, "the ring is drawn on the hatch in the same frame");
  assert.deepEqual(key(f, "up"), [], "hatch ▲ is ['kin.first', 'none']: with no kin the ring stays and nothing is said");
  assert.deepEqual(key(f, "down"), [], "▼ from the hatch is none");
  assert.equal(key(f, "left")[0].target, "pod");
});
test("the overview with kin: ▶ lands on the first kin, then along the kin's axis, ▼ to the hatch", { skip }, async () => {
  const f = await start(find("overview", /identified pod with kin/), "pod");
  assert.equal(key(f, "right")[0].target, "kin.0"); assert.equal(key(f, "right")[0].target, "kin.1"); assert.deepEqual(key(f, "right"), [], "the end of the kin's axis stops");
  assert.equal(key(f, "down")[0].target, "hatch"); assert.equal(key(f, "up")[0].target, "kin.0", "hatch ▲ goes to kin.first");
});
test("the rail: ▲ from the pod goes to rail.last, the axis walks the tabs and stops at the ends, ▼ returns to the pod", { skip }, async () => {
  const f = await start(find("overview", /S02: wholly read/), "pod"), n = find("overview", /S02: wholly read/).props.regions.rail.tabs.length;
  assert.equal(key(f, "up")[0].target, "rail.0"); assert.equal(key(f, "right")[0].target, "rail.1"); assert.equal(key(f, "down")[0].target, "pod");
  assert.ok(n >= 2);
});
test("the collection: the pad walks the places by the spatial fallback", { skip }, async () => {
  const f = await start(find("collection", /partly and wholly read/), "place.0");
  assert.equal(key(f, "right")[0].target, "place.1"); assert.equal(key(f, "down")[0].target, "place.4"); assert.equal(key(f, "left")[0].target, "place.3"); assert.equal(key(f, "up")[0].target, "place.0");
});
test("✓, ← and the room keys are intents on the focused target; the dock key is not the face's", { skip }, async () => {
  const f = await start(find("overview", /unidentified pod, the pod focused/));
  assert.deepEqual(key(f, "confirm").map((m) => [m.t, m.target, m.verb]), [["intent", "pod", "confirm"]]);
  assert.deepEqual(key(f, "back").map((m) => m.verb), ["back"]);
  for (const k of ["home", "research", "library", "habitat"]) assert.deepEqual(key(f, k).map((m) => m.verb), ["room:" + k]);
  assert.deepEqual(key(f, "dock"), []);
});
test("a screen without words says nothing to the keys", { skip }, async () => {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true }); assert.deepEqual(key(f, "right"), []);
});

test("Compare's focus: the targets are the rail's tabs; ◀ ▶ send step on the open tab, ▲ ▼ are none, ✓ nothing; the ring sits on the tab the host names", { skip }, async () => {
  const c = cases.find((x) => x.state === "compare"), n = c.props.regions.rail.tabs.length; assert.ok(n >= 3);
  const withFocus = (cur) => { const p = JSON.parse(JSON.stringify(c.props)); p.focus = { cur, armed: false, targets: p.regions.rail.tabs.map((_, i) => ({ id: "rail." + i, group: "rail", index: i })), resolve: { "rail.open": cur, "rail.last": cur, "kin.first": null } }; return p; };
  const f = await start(c); assert.equal(f.props(withFocus("rail.1")), 0); frames(f); f.poll("log");
  const h1 = f.hash();
  const [r] = key(f, "right"); assert.deepEqual([r.t, r.target, r.verb], ["intent", "rail.1", "step:right"], "a step on the open tab; the host moves the chapter and the focus");
  assert.deepEqual([key(f, "left")[0].verb], ["step:left"]); assert.deepEqual(key(f, "up"), [], "▲ none"); assert.deepEqual(key(f, "down"), [], "▼ none"); assert.equal(f.hash(), h1, "nothing moved on the face");
  assert.equal(f.props(withFocus("rail.2")), 0); frames(f); assert.notEqual(f.hash(), h1, "the host names the next tab: the ring is drawn on it");
  assert.deepEqual(f.errors(), []);
  const confirm = key(f, "confirm"); assert.ok(confirm.every((m) => m.verb === "confirm"), "✓ is the host's to refuse (Compare has no ✓ cap)");
});
