// The bridge (lvgl-switch.md §2.1) in Node, through the page's own transport (station/src/face-lvgl.mjs) on the WebAssembly face: the handshake and its version check, every message in with its
// refusals, the spec loader, the picture table, the props budget, the primitives (a real clip, composed pictures, layer and region tags), and test mode's logs and palette passes.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace, CONTRACT } from "../../station/src/face-lvgl.mjs";
import { installScene } from "./node-scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist/node")   /* the test build: the node path (-DFACE_NODE_API) */, built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const base = pathToFileURL(dist + "/");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const boot = async (opts) => { const f = installScene(await bootFace(base, opts)); f.send({ t: "palette", name: "station", colours: palette }); return f; };
const cstr = (M, s) => { const b = new TextEncoder().encode(s + "\0"), p = M._malloc(b.length); M.HEAPU8.set(b, p); return p; };
const rgbOf = (name) => { const h = palette.find(([n]) => n === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const env = { rgb: rgbOf, cap: (px) => Math.round(px * 0.7), picture: () => null, slice: () => null, tile: () => 0 };
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };   // the face's clock only moves forward

test("the handshake: hello answers ready with the size, the fonts and the limits; another contract is refused with an error and no ready", { skip }, async () => {
  const f = await boot(); assert.equal(f.ready.t, "ready"); assert.equal(f.ready.contract, CONTRACT); assert.deepEqual(f.ready.size, [1024, 600]); assert.deepEqual(f.ready.fonts, ["inter-16", "inter-20", "inter-28"]);
  assert.deepEqual(f.ready.limits, { objects: 1024, pictures: 256, text: 1023, props: 32768 });
  assert.equal(f.send({ t: "hello", contract: 2 }), -1); assert.deepEqual(f.errors(), ["contract 1 expected, got 2"]); assert.equal(f.poll("ready"), null);
  assert.equal(f.send({ t: "hello" }), -1); assert.match(f.errors()[0], /contract is required/);
});

test("a message before hello, an unknown message and invalid JSON are refused with an error each", { skip }, async () => {
  const create = (await import(path.join(dist, "face.mjs"))).default, M = await create(); M._face_init();
  const put = (s) => { const b = new TextEncoder().encode(s); M.HEAPU8.set(b, M._face_in_buf()); return M._face_send(b.length); }, next = () => { const p = M._face_poll(); return p ? JSON.parse(M.UTF8ToString(p)) : null; };
  assert.equal(put('{"t":"key","k":"up"}'), -1); assert.equal(next().what, "message before hello");
  assert.equal(put('{"t":"hello","contract":1}'), 0); assert.equal(next().t, "ready");
  assert.equal(put('{"t":"mystery"}'), -1); assert.equal(next().what, "unknown message mystery");
  assert.equal(put("{not json"), -1); assert.match(next().what, /not valid JSON/);
  assert.equal(put('["t","hello"]'), -1); assert.match(next().what, /an object with a string t/);
});

test("palette: a malformed colour empties it and says so; a good one loads", { skip }, async () => {
  const f = await boot(); assert.equal(f.send({ t: "palette", colours: [["ground", "#162a37"], ["bad", "162a37"]] }), -1); assert.match(f.errors()[0], /palette: a colour is malformed/);
  assert.equal(f.send({ t: "palette", colours: [["ground", "#162a37"]] }), 0); assert.deepEqual(f.errors(), []);
  assert.equal(f.send({ t: "palette", colours: "no" }), -1); assert.match(f.errors()[0], /colours must be an array/);
});

test("the spec loader keeps a spec whole and reads it by dotted path: numbers, strings with their escapes, sizes; a bad spec is refused", { skip }, async () => {
  const f = await boot(), M = f.M;
  assert.equal(f.send({ t: "spec", screen: "demo", json: { regions: { stage: { rect: [0, 40, 1024, 522], text: "a \"quoted\" ✓ word" }, rail: { x: [{ y: 7 }] } }, n: -3, flag: true } }), 0);
  const int = (p, d = -99) => { const sp = cstr(M, "demo"), pp = cstr(M, p), v = M._face_spec_int(sp, pp, d); M._free(sp); M._free(pp); return v; };
  assert.equal(int("regions.stage.rect.2"), 1024); assert.equal(int("regions.stage.rect.1"), 40); assert.equal(int("regions.rail.x.0.y"), 7); assert.equal(int("n"), -3);
  assert.equal(int("regions.stage.rect.9"), -99, "past the end of an array: the default"); assert.equal(int("regions.nope.rect"), -99); assert.equal(int("flag"), -99, "not a number: the default"); assert.equal(int("regions.stage.text"), -99);
  assert.equal(f.send({ t: "spec", screen: "demo", json: { n: 5 } }), 0); assert.equal(int("n"), 5, "a spec of the same name replaces the old one"); assert.equal(int("regions.stage.rect.2"), -99);
  assert.equal(f.send({ t: "spec", screen: "demo", json: [1, 2] }), -1); assert.match(f.errors()[0], /json must be the spec file's object/);
  assert.equal(f.send({ t: "spec", json: {} }), -1); assert.match(f.errors()[0], /screen is required/);
  assert.equal(f.send('{"t":"spec","screen":"x","json":{"a":1'), -1); assert.match(f.errors()[0], /not valid JSON/);
});

test("every Station spec file loads, and the loader reads a number from each the way JSON does", { skip }, async () => {
  const f = await boot(), M = f.M, dir = path.resolve(here, "../../ui/specs/station");
  for (const name of ["frame", "pods", "cross", "home"]) { const json = JSON.parse(readFileSync(path.join(dir, name + ".json"), "utf8")); assert.equal(f.send({ t: "spec", screen: name, json }), 0, name + ": " + f.errors().join()); }
  const sp = cstr(M, "frame"), pp = cstr(M, "regions.stage.rect.3"); assert.equal(M._face_spec_int(sp, pp, -1), JSON.parse(readFileSync(path.join(dir, "frame.json"), "utf8")).regions.stage.rect[3]);
});

test("a focus graph that cannot be walked is refused at load: each of focus.json's refusals as pods.json's focus.overview, and as home's focus.graph; the committed specs are accepted", { skip }, async () => {
  const dir = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(dir, n + ".json"), "utf8")), { refusals } = JSON.parse(readFileSync(path.join(here, "vectors/focus.json"), "utf8"));
  assert.equal(refusals.length, 15);
  for (const r of refusals) {
    let f = await boot(); const pods = J("pods"); pods.focus.overview = r.graph;
    assert.equal(f.send({ t: "spec", screen: "pods", json: pods }), -1, "pods, " + r.name); assert.match(f.errors().join(), /focus\.overview/, r.name);
    f = await boot(); const home = J("home"); home.focus.graph = r.graph;
    assert.equal(f.send({ t: "spec", screen: "home", json: home }), -1, "home, " + r.name);
  }
  const f = await boot(); for (const n of ["pods", "home", "habitat", "bench"]) assert.equal(f.send({ t: "spec", screen: n, json: J(n) }), 0, n + ": " + f.errors().join());
});

test("a ring shape the loader does not know is refused: only oval, footprint, tab, rect (with chip), or a circle of box or of centre and r, and no extra key; the old `ring` key goes", { skip }, async () => {
  const J = () => JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8"));
  const bad = [["dashed", "dashed"], ["a round", "round"], ["a negative rect", { rect: -1 }], ["a circle of no r", { circle: { r: 0, centre: [1, 2] } }], ["a circle with no centre", { circle: { r: 5 } }], ["an extra key on the shape", { rect: 6, glow: 1 }],
    ["an extra key on the circle", { circle: { centre: [1, 2], r: 3, outside: 4 } }], ["a number", 7], ["a bare object", { radius: 5 }], ["a negative chip", { rect: 0, chip: -1 }], ["a circle of nothing", { circle: "ring" }]];
  for (const [what, shape] of bad) { const f = await boot(), j = J(); j.targets.kin.shape = shape; assert.equal(f.send({ t: "spec", screen: "pods", json: j }), -1, what); assert.match(f.errors().join(), /targets\.kin\.shape/, what); }
  { const f = await boot(), j = J(); j.targets.kin.ring = "round"; assert.equal(f.send({ t: "spec", screen: "pods", json: j }), -1, "the old ring key"); assert.match(f.errors().join(), /targets\.kin: `ring` is replaced by `shape`/); }
  { const f = await boot(), j = J(); j.targets.kin.ground = "gilt"; assert.equal(f.send({ t: "spec", screen: "pods", json: j }), -1, "a ground of gilt"); assert.match(f.errors().join(), /ground/); }
  for (const shape of ["oval", "footprint", "tab", { rect: 0 }, { rect: 6, chip: 4 }, { circle: "box" }, { circle: { centre: [96, 112], r: 88 } }]) { const f = await boot(), j = J(); j.targets.kin.shape = shape; assert.equal(f.send({ t: "spec", screen: "pods", json: j }), 0, JSON.stringify(shape) + ": " + f.errors().join()); }
});

test("an asset carries its layer policy and status, and is refused without a valid pair; a sprite takes its layer from its asset, a rect from its word", { skip }, async () => {
  const f = await boot(), M = f.M;
  for (const [what, bad] of [["no policy", { status: "master" }], ["a policy of nowhere", { policy: "gilt", status: "master" }], ["no status", { policy: "art" }], ["a status of nothing", { policy: "art", status: "held" }]]) {
    assert.equal(f.send({ t: "asset", id: "q", w: 2, h: 2, src: "heap", ...bad }), -1, what); assert.match(f.errors()[0], /policy is|status is/, what);
  }
  assert.equal(f.send({ t: "asset", id: "q", w: 2, h: 2, src: "heap", policy: "painted", status: "master" }), 0);
  assert.equal(f.send({ t: "asset", id: "r", w: 2, h: 2, src: "heap", policy: "art", status: "placeholder" }), 0);
});

test("pictures: an asset message makes a buffer for its id, the same id keeps its slot, a drop frees it, bad sizes and src file are refused, and the table holds 256", { skip }, async () => {
  const f = await boot(), M = f.M;
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "a", w: 4, h: 4, src: "heap" }), 0); const h = M._face_last_asset(); assert.ok(h >= 0 && M._face_asset_pixels(h) > 0);
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "a", w: 8, h: 2 }), 0); assert.equal(M._face_last_asset(), h, "the same id: the same slot");
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "b", w: 0, h: 4 }), -1); assert.match(f.errors()[0], /is refused/); assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "b", w: 4, h: 4, src: "file", path: "/x" }), -1); assert.match(f.errors()[0], /src "heap" only/);
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", w: 4, h: 4 }), -1); assert.match(f.errors()[0], /id is required/);
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "a", drop: true }), 0); assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "c", w: 2, h: 2 }), 0); assert.equal(M._face_last_asset(), h, "a dropped slot is reused");
  for (let i = 0; i < 255; i++) assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "p" + i, w: 1, h: 1 }), 0);
  assert.equal(f.send({ t: "asset", policy: "art", status: "placeholder", id: "one-too-many", w: 1, h: 1 }), -1); assert.match(f.errors()[0], /picture table holds 256/);
});

test("props: the screen's spec must be loaded, seq may not go back, the budget is 32 KiB, regions is an object; events and keys are validated", { skip }, async () => {
  const f = await boot(), M = f.M;
  assert.equal(f.send({ t: "props", seq: 1, screen: "pods", regions: {} }), -1); assert.match(f.errors()[0], /whose spec is not loaded/);
  f.send({ t: "spec", screen: "pods", json: { regions: {} } });
  assert.equal(f.send({ t: "props", seq: 5, screen: "pods", state: "overview", regions: { list: { n: 1 } }, focus: { targets: [] } }), 0); assert.equal(M._face_props_count(), 1); assert.equal(M._face_props_seq(), 5);
  assert.equal(f.send({ t: "props", seq: 4, screen: "pods", regions: {} }), -1); assert.match(f.errors()[0], /seq went back/);
  assert.equal(f.send({ t: "props", seq: 6, screen: "pods", regions: [] }), -1); assert.match(f.errors()[0], /regions must be an object/);
  assert.equal(f.send({ t: "props", seq: 7, screen: "pods", regions: { pad: "x".repeat(33000) } }), -1); assert.match(f.errors()[0], /exceeds the 32768 byte budget/);
  assert.equal(f.send({ t: "props", screen: "pods" }), -1); assert.match(f.errors()[0], /seq is required/);
  assert.equal(f.send({ t: "event", kind: "seal", target: "pod", ms: 2000, hold: 2000 }), 0); assert.equal(f.send({ t: "event", kind: "dither", ms: 180 }), 0); assert.equal(M._face_event_count(), 2);
  assert.equal(f.send({ t: "event", kind: "teleport" }), -1); assert.match(f.errors()[0], /unknown kind teleport/);
  assert.equal(f.send({ t: "key", k: "confirm" }), 0); assert.equal(M._face_key_count() >= 1, true); assert.equal(f.send({ t: "key", k: "x" }), -1); assert.match(f.errors()[0], /unknown key x/);
});

test("props for a level of a screen are drawn from its screen's spec: library.species with only frame.json loaded is refused, and accepted once library.json is sent", { skip }, async () => {
  const f = await boot(), J = (n) => JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station", n + ".json"), "utf8"));
  assert.equal(f.send({ t: "spec", screen: "frame", json: J("frame") }), 0);
  assert.equal(f.send({ t: "props", seq: 1, screen: "library.species", regions: {} }), -1); assert.match(f.errors()[0], /whose spec is not loaded/);
  assert.equal(f.send({ t: "spec", screen: "library", json: J("library") }), 0);
  assert.equal(f.send({ t: "props", seq: 2, screen: "library.species", regions: {} }), 0, "the level's screen spec (library) is loaded"); assert.deepEqual(f.errors(), []);
});

test("clip is a real primitive: a child is cut at the clip's rectangle, and goes with it", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  // a 20×20 sprite of one colour, clipped to its right half
  const px = new Uint8ClampedArray(20 * 20 * 4); for (let i = 0; i < 400; i++) { px.set([255, 0, 0, 255], i * 4); }
  const e = { ...env, picture: (id) => (id === "red" ? { w: 20, h: 20, data: px } : null) };
  const sceneWith = (clip) => [{ id: "bg", kind: "rect", rect: [0, 0, 1024, 600], colour: "ground" }, { id: "c", kind: "clip", rect: [110, 100, 10, 20], colour: "ground", children: [{ id: "s", kind: "sprite", rect: [100, 100, 20, 20], asset: "red" }] }].slice(0, clip ? 2 : 1);
  assert.deepEqual(f.scene(sceneWith(true), e), []); frames(f);
  assert.deepEqual(f.pixel(105, 110), rgbOf("ground"), "left of the clip: not drawn"); assert.deepEqual(f.pixel(115, 110), [255, 0, 0], "inside the clip: drawn"); assert.deepEqual(f.pixel(125, 110), rgbOf("ground"), "right of the clip: not drawn");
  assert.equal(f.refused(), 0); f.scene(sceneWith(false), e); frames(f); assert.deepEqual(f.pixel(115, 110), rgbOf("ground"), "no clip sent: its child is gone with it"); assert.equal(f.objects(), 1);
});

test("composed pictures: lines, dashes, dots and a lattice in palette colours, one object each; unknown colours and malformed ops are refused", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  const ops = [["h", 0, 0, 10, "clay"], ["v", 0, 0, 10, "bark"], ["dash", 2, 5, 12, "h", 2, 2, "clay"], ["dot", 9, 9, "ice"], ["lattice", 12, 0, 8, 8, 4, [[0, 0], [2, 2]], "mist"]];
  const node = (o) => [{ id: "bg", kind: "rect", rect: [0, 0, 1024, 600], colour: "ground" }, { id: "k", kind: "composed", rect: [200, 200, 24, 12], ops: o }];
  assert.deepEqual(f.scene(node(ops), env), []); frames(f); assert.equal(f.refused(), 0); assert.equal(f.objects(), 2, "a rect and one picture");
  const at = (x, y) => f.pixel(200 + x, 200 + y);
  assert.deepEqual(at(4, 0), rgbOf("clay")); assert.deepEqual(at(0, 4), rgbOf("bark")); assert.deepEqual(at(2, 5), rgbOf("clay")); assert.deepEqual(at(3, 5), rgbOf("clay")); assert.deepEqual(at(4, 5), rgbOf("ground"), "2 on, 2 off");
  assert.deepEqual(at(9, 9), rgbOf("ice")); assert.deepEqual(at(12, 0), rgbOf("mist")); assert.deepEqual(at(14, 2), rgbOf("mist")); assert.deepEqual(at(13, 0), rgbOf("ground"), "one pixel in eight of the lattice");
  assert.equal(f.scene(node([["h", 0, 0, 4, "no-such-colour"]]), env).length, 0); frames(f); assert.equal(f.refused(), 1, "an unknown colour name is refused and counted");
  f.scene(node([["spiral", 1, 2]]), env); frames(f); assert.equal(f.refused(), 1, "an op outside the closed list is refused");
});

test("test mode: a log after the frame with the regions (union rects, layers), every text run with its size, and the refused, object and picture counts", { skip }, async () => {
  const f = await boot({ test: true }); assert.equal(f.ready.test, true); frames(f, 2); f.poll("log");
  const e = { ...env, cap: (px) => Math.round(px * 0.7) };
  f.scene([{ id: "bar.rule", kind: "rect", rect: [0, 39, 1024, 1], colour: "ground", region: "top.rule" }, { id: "bar.title", kind: "text", rect: [16, 10, 0, 0], colour: "ice", text: "Pods · ñ", px: 20, region: "top.title" },
    { id: "bar.sub", kind: "text", rect: [16, 60, 0, 0], colour: "ice", text: "Identify", px: 16, region: "top.title" }], e); frames(f);
  const log = f.poll("log"); assert.ok(log, "a log message"); assert.equal(log.refused, 0); assert.equal(log.objects, 3); assert.equal(log.pictures, 0); assert.ok(log.frameMs >= 0);
  const rule = log.regions.find((r) => r.id === "top.rule"), title = log.regions.find((r) => r.id === "top.title");
  assert.deepEqual(rule, { id: "top.rule", layer: "chrome", rect: [0, 39, 1024, 1] }); assert.equal(title.layer, "type"); assert.ok(title.rect[1] < 60 && title.rect[1] + title.rect[3] > 60, "the union covers both runs");
  assert.deepEqual(log.type.map((t) => [t.text, t.px, t.region]), [["Pods · ñ", 20, "top.title"], ["Identify", 16, "top.title"]]);
  frames(f); assert.equal(f.poll("log"), null, "nothing changed: no log");
});

test("the palette passes: chrome alone and chrome with art have no pixel off the palette, a picture of a stray colour shows only in the pass that includes it", { skip }, async () => {
  const f = await boot({ test: true }); frames(f, 2);
  const stray = new Uint8ClampedArray(8 * 8 * 4); for (let i = 0; i < 64; i++) stray.set([1, 2, 3, 255], i * 4);   // #010203 is in no palette
  const e = { ...env, picture: () => ({ w: 8, h: 8, data: stray }) };
  f.setBackground(parseInt(palette.find(([n]) => n === "ground")[1].slice(1), 16));
  f.scene([{ id: "r", kind: "rect", rect: [0, 40, 1024, 522], colour: "ground" }, { id: "s", kind: "sprite", rect: [300, 300, 8, 8], asset: "x", layer: "painted" }, { id: "t", kind: "text", rect: [40, 100, 0, 0], colour: "ice", text: "Type", px: 16 }], e); frames(f);
  f.pass(1); assert.equal(f.offPalette(), 0, "chrome only"); f.pass(2); assert.equal(f.offPalette(), 0, "chrome and art"); f.pass(3); assert.equal(f.offPalette() >= 64, true, "the painted layer's stray colour appears in the full pass");
  f.scene([{ id: "r", kind: "rect", rect: [0, 40, 1024, 522], colour: "ground" }, { id: "s", kind: "sprite", rect: [300, 300, 8, 8], asset: "y", layer: "art" }], e); frames(f); f.pass(1); assert.equal(f.offPalette(), 0); f.pass(2); assert.ok(f.offPalette() >= 64, "an art-layer picture off the palette is caught by the second pass");
});

test("the object table holds 1,024; a 1,025th node is refused and counted", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  const nodes = Array.from({ length: 1030 }, (_, i) => ({ id: "n" + i, kind: "rect", rect: [i % 1000, 40 + (i >> 5), 1, 1], colour: "ground" }));
  assert.equal(f.scene(nodes, env).length, 0); frames(f); assert.equal(f.objects(), 1024); assert.equal(f.refused(), 6);
});

// --- the architect's review of B2 ---
const raw = async () => { const create = (await import(path.join(dist, "face.mjs"))).default, M = await create(); M._face_init(); const put = (s) => { const b = typeof s === "string" ? new TextEncoder().encode(s) : s; M.HEAPU8.set(b, M._face_in_buf()); return M._face_send(b.length); }, next = () => { const p = M._face_poll(); return p ? JSON.parse(M.UTF8ToString(p)) : null; }; put('{"t":"hello","contract":1}'); next(); return { M, put, next }; };

test("F1: a clip's child that is refused still counts against its clip, so the next root node is not drawn inside it", { skip }, async () => {
  const f = await boot(); frames(f, 2); const M = f.M;
  const rect = (id, kind, x, y, w, h, rgbv, a, b) => M._face_node(id, kind, x, y, w, h, rgbv, a, b);
  const hex = (n) => { const [r, g, bl] = rgbOf(n); return (r << 16) | (g << 8) | bl; };
  const scene = (build) => { M._face_scene_begin(); build(); M._face_scene_end(); frames(f); };
  scene(() => { rect(1, 1, 0, 0, 1024, 600, hex("ground"), 0, 0);
    rect(2, 5, 100, 100, 20, 20, 0, 2, 0);   // a clip announcing two children
    rect(3, 3, 100, 100, 20, 20, 0, 77, 0);   // child 1: a sprite of a picture that does not exist: refused
    rect(4, 1, 100, 100, 20, 20, hex("clay"), 0, 0);   // child 2: inside
    rect(5, 1, 300, 300, 40, 40, hex("ice"), 0, 0); });   // a root node: it is not the clip's third child
  assert.equal(f.refused(), 1); assert.deepEqual(f.pixel(110, 110), rgbOf("clay")); assert.deepEqual(f.pixel(320, 320), rgbOf("ice"), "the root node outside the clip's rectangle is drawn");
  scene(() => { rect(1, 1, 0, 0, 1024, 600, hex("ground"), 0, 0); rect(2, 5, 100, 100, 20, 20, 0, 0, 0); rect(5, 1, 300, 300, 40, 40, hex("ice"), 0, 0); });
  assert.equal(f.refused(), 0, "a clip with no children"); assert.deepEqual(f.pixel(320, 320), rgbOf("ice"));
  // a refused clip (a nine-slice hint of an unknown kind inside it, here a clip nested in a clip) refuses what it announced
  scene(() => { rect(1, 1, 0, 0, 1024, 600, hex("ground"), 0, 0); rect(2, 5, 100, 100, 20, 20, 0, 2, 0); rect(6, 5, 100, 100, 20, 20, 0, 1, 0); rect(4, 1, 100, 100, 20, 20, hex("clay"), 0, 0); rect(5, 1, 300, 300, 40, 40, hex("ice"), 0, 0); });
  assert.equal(f.refused(), 1, "a clip inside a clip is refused"); assert.deepEqual(f.pixel(320, 320), rgbOf("ice"));
});

test("F2: strict JSON: bytes after the object, repeated keys, and numbers that are not integers are refused; the header's strict mode refuses loose primitives and unquoted keys", { skip }, async () => {
  const { put, next } = await raw();
  const refused = (s, re) => { assert.equal(put(s), -1, s); assert.match(next().what, re, s); };
  refused('{"t":"key","k":"up"} x', /not valid JSON/); refused('{"t":"key","k":"up"}{"t":"key","k":"up"}', /bytes after the object/); refused('{"t":"key","k":"up"} {}', /bytes after the object|not valid JSON/);
  assert.equal(put('{"t":"key","k":"up"}  \n'), 0, "trailing whitespace is fine");
  refused('{"t":"hello","contract":1,"contract":2}', /key contract appears twice/); refused('{"t":"hello","t":"key"}', /key t appears twice/);
  for (const bad of ["1.5", "1e3", "01", "+1", "1.0", "-", '"1"', "true", "null", "0x1"]) refused(`{"t":"hello","contract":${bad}}`, /contract must be an integer|not valid JSON/);
  refused('{"t":"hello","contract":tru}', /not valid JSON/); refused('{"t":"hello","contract":1,}', /not valid JSON/); refused('{"t":"hello",,"contract":1}', /not valid JSON/); refused('{"t":"hello","contract":1.2.3}', /not valid JSON/); refused('{"t":"hello","contract":[1,]}', /not valid JSON/); refused("{t:\"hello\",\"contract\":1}", /not valid JSON/);
  // jsmn's strict mode refuses an unquoted key; the face's own pass (json_clean) refuses what jsmn lets through as tokens: a malformed literal, a trailing or doubled comma
  refused('{"t":"hello","contract":1,"test":"yes"}'.replace('"contract":1', '"contract":2'), /contract 1 expected, got 2/);
  assert.equal(put('{"t":"hello","contract":1}'), 0); assert.equal(next().t, "ready");
  refused('{"t":"event","kind":"seal","ms":1.5}', /ms must be a number/); refused('{"t":"event","kind":"seal","ms":1e3}', /ms must be a number/);
  refused('{"t":"spec","screen":"d","json":{"a":1,"a":2}}', /top-level key appears twice/); refused('{"t":"spec","screen":"d","json":{"a":1,}}', /not valid JSON/);
  assert.equal(put('{"t":"spec","screen":"d","json":{"a":1,"b":{"a":2}}}'), 0, "the same key in a nested object is not a repeat");
});

test("F2: the spec loader reads integers exactly: 1.5, 1e3 and 01 are not numbers to spec_int", { skip }, async () => {
  const f = await boot(), M = f.M; f.send({ t: "spec", screen: "n", json: { a: 1, b: 1.5, c: 1000, d: -7, e: 0, f: 123456789012 } });
  assert.equal(f.send('{"t":"spec","screen":"m","json":{"x":1.5,"y":1e3}}'), 0, "1.5 and 1e3 are JSON: the loader holds the file, and reading a number is where integers are checked");
  assert.equal(f.send('{"t":"spec","screen":"m2","json":{"z":01}}'), -1, "01 is not JSON at all"); assert.match(f.errors()[0], /not valid JSON/);
  const int = (s, p) => { const a = cstr(M, s), b = cstr(M, p), v = M._face_spec_int(a, b, -99); M._free(a); M._free(b); return v; };
  assert.equal(int("n", "a"), 1); assert.equal(int("n", "b"), -99); assert.equal(int("n", "c"), 1000); assert.equal(int("n", "d"), -7); assert.equal(int("n", "e"), 0); assert.equal(int("n", "f"), -99, "past the face's int"); assert.equal(int("m", "x"), -99); assert.equal(int("m", "y"), -99); 
});

test("F2 and F9: a composed picture's arguments are integers exactly, and a malformed op is refused whole", { skip }, async () => {
  const f = await boot(), M = f.M; frames(f, 2);
  const send = (ops) => { const b = new TextEncoder().encode(ops), p = M._face_ops(); M.HEAPU8.set(b, p); M.HEAPU8[p + b.length] = 0; M._face_scene_begin(); M._face_node(1, 1, 0, 0, 1024, 600, 0x162a37, 0, 0); M._face_node(2, 6, 200, 200, 24, 12, 0, 0, 0); M._face_scene_end(); frames(f); return f.refused(); };
  for (const bad of ['[["h",0,0,4.5,"clay"]]', '[["h",0,0,"4","clay"]]', '[["dot",1e1,0,"clay"]]', '[["lattice",0,0,8,8,4.0,[[0,0]],"mist"]]', '[["lattice",0,0,8,8,4,[[0,1.5]],"mist"]]', '[["h",0,0,4,"clay"]] x', '[["h",0,0,4,"clay"],]', '[["h",0,0,4,clay]]']) assert.equal(send(bad), 1, bad);
  assert.equal(send('[["h",0,0,3,"clay"]]'), 0); assert.equal(send('[["h",0,0,3,"clay"]] \n'), 0, "trailing whitespace is fine");
});

test("F3: a clip child's rectangle in the region log is cut to the clip, and a child wholly outside is left out", { skip }, async () => {
  const f = await boot({ test: true }); frames(f, 2); f.poll("log");
  const px = new Uint8ClampedArray(40 * 40 * 4).fill(255), e = { ...env, picture: () => ({ w: 40, h: 40, data: px }) };
  f.scene([{ id: "c", kind: "clip", rect: [100, 100, 30, 20], colour: "ground", region: "pane", children: [{ id: "a", kind: "sprite", rect: [90, 90, 40, 40], asset: "p" }, { id: "b", kind: "sprite", rect: [200, 200, 40, 40], asset: "p" }] }], e); frames(f);
  const log = f.poll("log"), pane = log.regions.find((r) => r.id === "pane"); assert.deepEqual(pane.rect, [100, 100, 30, 20], "the union is what the clip shows");
  f.scene([{ id: "c", kind: "clip", rect: [100, 100, 30, 20], colour: "ground", region: "pane", children: [{ id: "b", kind: "sprite", rect: [200, 200, 40, 40], asset: "p" }] }], e); frames(f);
  assert.equal(f.poll("log").regions.find((r) => r.id === "pane"), undefined, "nothing of the clip is shown: no region");
});

test("F4: the log counts LVGL objects (a nine-slice is nine more) and the face's table separately; ready.limits.objects stays 1,024", { skip }, async () => {
  const f = await boot({ test: true }); frames(f, 2); f.poll("log"); assert.equal(f.ready.limits.objects, 1024);
  const px = new Uint8ClampedArray(20 * 20 * 4).fill(255), e = { ...env, picture: () => ({ w: 20, h: 20, data: px }), slice: () => [8, 8, 8, 8] };
  f.scene([{ id: "r", kind: "rect", rect: [0, 0, 100, 100], colour: "ground" }, { id: "n", kind: "nineSlice", rect: [10, 10, 60, 40], asset: "p" }], e); frames(f);
  const log = f.poll("log"); assert.equal(log.table, 2); assert.equal(log.objects, 2 + 9, "the table's two plus the nine parts of the nine-slice");
});

test("F5: a full queue drops messages and counts them; when room returns an error says how many, and every log carries the total", { skip }, async () => {
  const { M, put, next } = await raw();
  for (let i = 0; i < 70; i++) put('{"t":"nope"}');   // 70 errors into a queue of 64, never polled
  let n = 0; while (M._face_pending()) { next(); n++; } assert.equal(n, 64);
  put('{"t":"nope"}'); const a = next(), b = next(); assert.match(a.what, /^queue: 6 messages dropped$/); assert.match(b.what, /unknown message nope/); assert.equal(next(), null);
  const f = await boot({ test: true }); frames(f, 2); f.poll("log");
  for (let i = 0; i < 70; i++) f.M._face_send((f.M.HEAPU8.set(new TextEncoder().encode('{"t":"nope"}'), f.M._face_in_buf()), 12));
  f.M._face_poll; f.drain(); f.M._face_key(17, 1); f.M._face_key(17, 0); f.send({ t: "event", kind: "seal" }); frames(f);
  assert.ok(f.poll("log").dropped >= 1, "the log's running total");
});

test("props() is the transport's: hashed without seq, so an unchanged screen is not sent again, and seq is assigned by the transport, never the caller", { skip }, async () => {
  const f = await boot(); f.send({ t: "spec", screen: "pods", json: { regions: {} } });
  assert.equal(f.props({ screen: "pods", state: "overview", regions: { a: 1 }, seq: 99 }), 0); assert.equal(f.M._face_props_count(), 1); assert.equal(f.M._face_props_seq(), 1, "the caller's seq is ignored");
  assert.equal(f.props({ screen: "pods", state: "overview", regions: { a: 1 }, seq: 5 }), 0); assert.equal(f.M._face_props_count(), 1, "the same props: not sent");
  assert.equal(f.props({ screen: "pods", state: "overview", regions: { a: 2 } }), 0); assert.equal(f.M._face_props_count(), 2); assert.equal(f.M._face_props_seq(), 2);
  assert.equal(f.props({ screen: "nope", regions: {} }), -1); assert.match(f.errors()[0], /spec is not loaded/); assert.equal(f.props({ screen: "pods", state: "overview", regions: { a: 2 } }), 0, "a refused send does not mark the props as sent"); 
});

test("hello with a contract that is not an integer says so", { skip }, async () => {
  const f = await boot(); assert.equal(f.send({ t: "hello", contract: 1.5 }), -1); assert.deepEqual(f.errors(), ["hello: contract must be an integer"]);
  assert.equal(f.send({ t: "hello", contract: "1" }), -1); assert.deepEqual(f.errors(), ["hello: contract must be an integer"]); assert.equal(f.send({ t: "hello" }), -1); assert.deepEqual(f.errors(), ["hello: contract is required"]);
});

test("composed pictures take thousands of ops: the ops have a buffer of their own (128 KiB), not the text run's 1 KiB", { skip }, async () => {
  const f = await boot(), ops = []; for (let i = 0; i < 3000; i++) ops.push(["dot", i % 200, (i / 200) | 0, "ice"]);
  assert.ok(JSON.stringify(ops).length > 30000);
  f.scene([{ id: "wires", kind: "composed", rect: [0, 0, 200, 16], ops }], env); frames(f); assert.equal(f.refused(), 0); assert.deepEqual(f.errors(), []);
  assert.deepEqual(f.pixel(5, 3), rgbOf("ice")); assert.deepEqual(f.pixel(199, 14), rgbOf("ice"));
  const big = []; for (let i = 0; i < 6000; i++) big.push(["dot", i % 100, 0, "ice"]);
  f.scene([{ id: "wires", kind: "composed", rect: [0, 0, 200, 16], ops: big }], env); frames(f); assert.equal(f.refused(), 0, "6000 ops, 75 KB");
});

test("a node moved into a removed node's place keeps its picture: a composed ring drawn after an earlier node was dropped is still drawn once new nodes arrive", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  const ring = { id: "ring", kind: "composed", rect: [100, 100, 60, 40], ops: [["ring", "round", 0, 0, 60, 40, 2, 6, "focus"]] };
  const bg = { id: "bg", kind: "rect", rect: [0, 40, 1024, 522], colour: "ground" }, a = { id: "a", kind: "rect", rect: [300, 300, 10, 10], colour: "ice" };
  f.scene([bg, a, ring], env); frames(f); assert.deepEqual(f.pixel(100, 120), rgbOf("focus"), "the ring is drawn");
  f.scene([bg, ring], env); frames(f);   // `a` goes; the last node (the ring) takes its place in the table
  f.scene([bg, { id: "b", kind: "rect", rect: [90, 90, 80, 60], colour: "clay" }, ring, { id: "c", kind: "rect", rect: [420, 400, 10, 10], colour: "ice" }], env); frames(f);   // new nodes reuse the table's end, and one is drawn under the ring so the ring is drawn again
  assert.deepEqual(f.pixel(100, 120), rgbOf("focus"), "the ring is still drawn");
});

test("an overlay is refused whole, the previous props stay: not an object, no id, on a screen drawn without words, no spec, a spec that is not an overlay, an overlay spec that lists no screen (refused at load) or not this one, a screen that does not list it, no binding table", { skip }, async () => {
  const f = await boot(), M = f.M, spec = (screen, json) => assert.equal(f.send({ t: "spec", screen, json }), 0, f.errors().join("; "));
  spec("habitat", { regions: {}, overlays: { namer: {}, ghost: {}, plain: {}, nolist: {} } }); spec("namer", { kind: "overlay", over: ["habitat"], regions: {} });
  spec("ghost", { kind: "overlay", over: ["habitat"], regions: {} }); spec("plain", { regions: {} }); assert.equal(f.send({ t: "spec", screen: "nolist", json: { kind: "overlay", regions: {} } }), -1); assert.match(f.errors()[0], /lists the screens it opens over/); spec("nolist", { kind: "overlay", over: ["home"], regions: {} });
  const props = (overlay, extra = {}) => f.send({ t: "props", seq: 1 + (f.s = (f.s ?? 0) + 1), screen: "habitat", state: "rest", regions: {}, overlay, ...extra });
  assert.equal(props({ id: "namer", state: "open" }), 0, f.errors().join("; ")); const n = M._face_props_count();
  const refused = (overlay, re, extra) => { assert.equal(props(overlay, extra), -1); assert.match(f.errors()[0], re); assert.equal(M._face_props_count(), n, "the previous props stay"); };
  refused("open", /overlay must be an object/); refused(null, /overlay must be an object/); refused({ state: "open" }, /overlay\.id is required/); refused({ id: "namer" }, /needs a screen drawn with words/, { idle: true }); refused({ id: "namer" }, /needs a screen drawn with words/, { state: "notBuilt" });
  refused({ id: "absent" }, /the overlay absent has no spec loaded/); refused({ id: "plain" }, /the spec plain is not an overlay/); refused({ id: "nolist" }, /the overlay nolist does not list the screen habitat/);
  spec("home", { regions: {} }); refused({ id: "namer" }, /the overlay namer does not list the screen home/, { screen: "home" });
  spec("both", { kind: "overlay", over: ["habitat"], regions: {} }); refused({ id: "both" }, /the screen habitat does not list the overlay both/);
  refused({ id: "ghost" }, /the face has no binding table for the overlay ghost/);
});

// ---- Station M1 §2.1, §2.2: the moving sets' loader and its refusals, an atlas's width, the windowed bayerPick ----
import { MOVING } from "./moving-scene.mjs";
const mutated = (fn) => { const m = JSON.parse(JSON.stringify(MOVING)); fn(m); return m; };
test("the moving spec (M1 §2.2): a good set loads; each refusal raises its error and the spec is refused whole", { skip }, async () => {
  const f = await boot(); assert.equal(f.send({ t: "spec", screen: "moving", json: MOVING }), 0, f.errors().join("; "));
  const cases = [
    ["a hold on the walk part not a multiple of 80", (m) => { m.S01.juvenile.breathe[0][1] = 870; }, /multiple of 80/],
    ["a key not in the part's cells", (m) => { m.S01.juvenile.breathe[1][0] = "stand-b9"; }, /not in the part's cells/],
    ["an unknown clip", (m) => { m.S01.juvenile.dance = { ms: 80 }; }, /unknown clip dance/],
    ["more walk cells than the cap", (m) => { m.S01.juvenile.walk.cells.push(...Array.from({ length: 6 }, (_, i) => "x" + i)); }, /the cap is 16/],
    ["more close cells than 8", (m) => { m.S01.adult.close.cells.push("x"); }, /the cap is 8/],
    ["more nap cells than 2", (m) => { m.S01.juvenile.nap.cells.push("stand"); }, /the cap is 2/],
    ["a walk over 5 px a tick", (m) => { m.S05.juvenile.walkCycle.stride = 16; }, /passes 5/],
    ["a stage with both hop and walkCycle", (m) => { m.S05.juvenile.walk.cells.push("air"); m.S05.juvenile.walk.mirror.pop(); m.S05.juvenile.hop = JSON.parse(JSON.stringify(m.S01.juvenile.hop)); }, /both hop and walkCycle/],
    ["the clip the gait names missing", (m) => { delete m.S05.juvenile.walkCycle; }, /the gait walk needs the clip walkCycle, which the stage lacks/],
    ["a gait other than hop or walk", (m) => { m.S05.gait = "walkCycle"; }, /gait is "hop" or "walk"/],
    ["a walkCycle key not in the walk part's cells", (m) => { m.S05.juvenile.walkCycle.cycle[1][0] = "stepz"; }, /walkCycle.cycle: the key stepz/],
    ["a lift that changes by more than 12 px a tick", (m) => { m.S01.juvenile.hop.lift = [6, 19, 16, 14, 6]; }, /changes by 13 px/],
    ["a lift whose apex passes the juvenile's 24", (m) => { m.S01.juvenile.hop.lift = [8, 20, 26, 20, 8]; }, /apex 26 px passes the cap of 24/],
    ["an elder tempo that is not a fraction", (m) => { m.S01.elder.tempo = [5]; }, /fraction/],
  ];
  for (const [what, fn, re] of cases) { assert.equal(f.send({ t: "spec", screen: "moving", json: mutated(fn) }), -1, what); const e = f.errors(); assert.match(e.join("; "), re, what); }
  assert.equal(f.send({ t: "spec", screen: "moving", json: MOVING }), 0, "the good set loads again");
});
// ---- R3 (the rooms design): the rooms spec, checked whole when it arrives ----
test("the rooms spec (R3): the generated file loads; each of the data guards the face repeats (1, 2, 3, 6) refuses it whole with its reason", { skip }, async () => {
  const specs = path.resolve(here, "../../ui/specs/station"), ROOMS = JSON.parse(readFileSync(path.join(specs, "rooms.json"), "utf8")), VIV = JSON.parse(readFileSync(path.join(specs, "vivarium.json"), "utf8"));
  const f = await boot(); assert.equal(f.send({ t: "spec", screen: "vivarium", json: VIV }), 0, f.errors().join("; ")); assert.equal(f.send({ t: "spec", screen: "rooms", json: ROOMS }), 0, f.errors().join("; "));
  const mut = (fn) => { const m = JSON.parse(JSON.stringify(ROOMS)); fn(m.rooms.reeds); return m; };
  const cases = [
    ["guard 1: x does not strictly increase", (r) => { r.levels[0].x[2] = r.levels[0].x[1]; }, /guard 1: .*x does not strictly increase/],
    ["guard 1: x has not one more value than top", (r) => { r.levels[0].x.pop(); }, /guard 1: .*x has 5 values for 5 tops/],
    ["guard 1: a top is not above the bottom", (r) => { r.levels[1].top[0] = r.levels[1].bottom; }, /guard 1: .*top.0 \(372\) is not above the bottom \(372\)/],
    ["guard 2: a raised level's bottom is not above the main floor under it", (r) => { r.levels[1].bottom = 480; }, /guard 2: .*level bank: the bottom 480 is not above the main floor's top 478/],
    ["guard 3: a join end off its level", (r) => { r.joins[0].ends[0] = [720, 300]; }, /guard 3: .*end 0 \(720, 300\) is not on the level bank/],
    ["guard 3: a join end outside its level's span", (r) => { r.joins[0].ends[1] = [30, 440]; r.joins[0].lower = "bank"; }, /guard 3: .*end 1 \(30, 440\) is not on the level bank/],
    ["guard 6: more than six occluders", (r) => { for (let i = 0; i < 5; i++) r.pieces.push({ ...r.pieces[1], id: "x" + i }); }, /guard 6: .* 8 occluders \(at most 6\)/],
    ["guard 6: the occluders over 15 % of the window", (r) => { r.pieces[0].rect = [0, 380, 1000, 100]; }, /guard 6: .*over 15 % of the window \(324736 px\)/],
    ["the first level is not main", (r) => { r.levels[0].id = "floor"; r.pieces.forEach((p) => { if (p.level) p.level = "floor"; }); }, /levels.0 is floor, not main/],
    ["a piece kind that is not known", (r) => { r.pieces[3].kind = "fitting"; }, /kind is occluder or back, not fitting/],
  ];
  for (const [what, fn, re] of cases) { assert.equal(f.send({ t: "spec", screen: "rooms", json: mut(fn) }), -1, what); assert.match(f.errors().join("; "), re, what); }
  assert.equal(f.send({ t: "spec", screen: "rooms", json: ROOMS }), 0, "the good file loads again");
});
test("a moving atlas (M1 §1.2): its width is 1 + n·w for its set's cells, or it is refused", { skip }, async () => {
  const f = await boot(); assert.equal(f.send({ t: "spec", screen: "moving", json: MOVING }), 0);
  assert.equal(f.send({ t: "asset", id: "moving:juvenile:S01:walk:104x112:species", w: 1 + 11 * 104, h: 112, policy: "art", status: "placeholder" }), -1); assert.match(f.errors().join(), /is 1145 px, the set says 12 cells/);
  assert.equal(f.send({ t: "asset", id: "moving:juvenile:S01:walk:104x112:species", w: 1 + 12 * 104, h: 112, policy: "art", status: "placeholder" }), 0, f.errors().join());
  assert.equal(f.send({ t: "asset", id: "moving:adult:S01:shadow:144x16", w: 1 + 2 * 144, h: 16, policy: "art", status: "placeholder" }), 0);
});
test("bayerPick with windows (M1 §2.1): the pick between two w × h windows of larger pictures, a window inside its asset; from -1 is clear, to -1 is clear (never both); the six-token form is unchanged", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  const block = (rgb, w, h) => () => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const x = i % w; const c = x < w / 2 ? rgb[0] : rgb[1]; d.set([...rgbOf(c), 255], i * 4); } return { w, h, data: d, policy: "art", status: "placeholder" }; };
  const a = f.handleOf("t:atlasA", block(["clay", "ice"], 9, 4)), b = f.handleOf("t:atlasB", block(["mist", "bark"], 9, 4));   // two cells of 4 × 4 after a 1 px column: the left cell clay (A) / mist (B), the right ice / bark
  const node = (ops) => [{ id: "bg", kind: "rect", rect: [0, 0, 1024, 600], colour: "ground" }, { id: "d", kind: "composed", rect: [300, 300, 4, 4], ops }];
  assert.deepEqual(f.scene(node([["bayerPick", a, b, 16, 0, 0, 5, 0, 1, 0]]), env), []); frames(f); assert.equal(f.refused(), 0); assert.deepEqual(f.pixel(301, 301), rgbOf("mist"), "level 16: all `to`, its window at x 1 (the left cell)");
  f.scene(node([["bayerPick", a, b, 0, 0, 0, 5, 0, 1, 0]]), env); frames(f); assert.deepEqual(f.pixel(301, 301), rgbOf("ice"), "level 0: all `from`, its window at x 5 (the right cell)");
  f.scene(node([["bayerPick", -1, b, 0, 0, 0, 0, 0, 1, 0]]), env); frames(f); assert.deepEqual(f.pixel(301, 301), rgbOf("ground"), "from -1: clear, the ground shows");
  f.scene(node([["bayerPick", a, b, 8, 0, 0, 6, 0, 1, 0]]), env); frames(f); assert.equal(f.refused(), 1, "a window past its asset is refused");
  // to -1 is clear (a dither-out, motion-spec §2.7a): `from` keeps exactly the pixels a dither-in at the same level leaves
  const at8 = (from, to) => { f.scene(node([["bayerPick", from, to, 8, 0, 0, 5, 0, 1, 0]]), env); frames(f); const o = []; for (let y = 300; y < 304; y++) for (let x = 300; x < 304; x++) o.push(f.pixel(x, y).join()); return o; };
  const inn = at8(-1, b), out = at8(a, -1), ground = rgbOf("ground").join();
  assert.equal(inn.filter((p) => p === ground).length, 8, "a dither-in at 8: half clear"); assert.equal(out.filter((p) => p === ground).length, 8, "a dither-out at 8: half clear");
  inn.forEach((p, i) => assert.ok((p === ground) !== (out[i] === ground), `pixel ${i}: in the dither-in or the dither-out, never both or neither`));
  f.scene(node([["bayerPick", -1, -1, 8, 0, 0, 0, 0, 0, 0]]), env); frames(f); assert.equal(f.refused(), 1, "from and to both clear is refused");
});
