// The bridge (lvgl-switch.md §2.1) in Node, through the page's own transport (station/src/face-lvgl.mjs) on the WebAssembly face: the handshake and its version check, every message in with its
// refusals, the spec loader, the picture table, the props budget, the primitives (a real clip, composed pictures, layer and region tags), and test mode's logs and palette passes.
// Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace, CONTRACT } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const base = pathToFileURL(dist + "/");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const boot = async (opts) => { const f = await bootFace(base, opts); f.send({ t: "palette", name: "station", colours: palette }); return f; };
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

test("pictures: an asset message makes a buffer for its id, the same id keeps its slot, a drop frees it, bad sizes and src file are refused, and the table holds 256", { skip }, async () => {
  const f = await boot(), M = f.M;
  assert.equal(f.send({ t: "asset", id: "a", w: 4, h: 4, src: "heap" }), 0); const h = M._face_last_asset(); assert.ok(h >= 0 && M._face_asset_pixels(h) > 0);
  assert.equal(f.send({ t: "asset", id: "a", w: 8, h: 2 }), 0); assert.equal(M._face_last_asset(), h, "the same id: the same slot");
  assert.equal(f.send({ t: "asset", id: "b", w: 0, h: 4 }), -1); assert.match(f.errors()[0], /is refused/); assert.equal(f.send({ t: "asset", id: "b", w: 4, h: 4, src: "file", path: "/x" }), -1); assert.match(f.errors()[0], /src "heap" only/);
  assert.equal(f.send({ t: "asset", w: 4, h: 4 }), -1); assert.match(f.errors()[0], /id is required/);
  assert.equal(f.send({ t: "asset", id: "a", drop: true }), 0); assert.equal(f.send({ t: "asset", id: "c", w: 2, h: 2 }), 0); assert.equal(M._face_last_asset(), h, "a dropped slot is reused");
  for (let i = 0; i < 255; i++) assert.equal(f.send({ t: "asset", id: "p" + i, w: 1, h: 1 }), 0);
  assert.equal(f.send({ t: "asset", id: "one-too-many", w: 1, h: 1 }), -1); assert.match(f.errors()[0], /picture table holds 256/);
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
  assert.equal(f.send({ t: "event", kind: "seal", target: "pod", ms: 2000, hold: true }), 0); assert.equal(f.send({ t: "event", kind: "dither", ms: 180 }), 0); assert.equal(M._face_event_count(), 2);
  assert.equal(f.send({ t: "event", kind: "teleport" }), -1); assert.match(f.errors()[0], /unknown kind teleport/);
  assert.equal(f.send({ t: "key", k: "confirm" }), 0); assert.equal(M._face_key_count() >= 1, true); assert.equal(f.send({ t: "key", k: "x" }), -1); assert.match(f.errors()[0], /unknown key x/);
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
  f.setBackground(0x162a37);
  f.scene([{ id: "r", kind: "rect", rect: [0, 40, 1024, 522], colour: "ground" }, { id: "s", kind: "sprite", rect: [300, 300, 8, 8], asset: "x", layer: "painted" }, { id: "t", kind: "text", rect: [40, 100, 0, 0], colour: "ice", text: "Type", px: 16 }], e); frames(f);
  f.pass(1); assert.equal(f.offPalette(), 0, "chrome only"); f.pass(2); assert.equal(f.offPalette(), 0, "chrome and art"); f.pass(3); assert.equal(f.offPalette() >= 64, true, "the painted layer's stray colour appears in the full pass");
  f.scene([{ id: "r", kind: "rect", rect: [0, 40, 1024, 522], colour: "ground" }, { id: "s", kind: "sprite", rect: [300, 300, 8, 8], asset: "x", layer: "art" }], e); frames(f); f.pass(1); assert.equal(f.offPalette(), 0); f.pass(2); assert.ok(f.offPalette() >= 64, "an art-layer picture off the palette is caught by the second pass");
});

test("the object table holds 1,024; a 1,025th node is refused and counted", { skip }, async () => {
  const f = await boot(); frames(f, 2);
  const nodes = Array.from({ length: 1030 }, (_, i) => ({ id: "n" + i, kind: "rect", rect: [i % 1000, 40 + (i >> 5), 1, 1], colour: "ground" }));
  assert.equal(f.scene(nodes, env).length, 0); frames(f); assert.equal(f.objects(), 1024); assert.equal(f.refused(), 6);
});
