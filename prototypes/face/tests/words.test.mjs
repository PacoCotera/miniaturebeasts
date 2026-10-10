// The frame's words (lvgl-switch.md §2.2) against the JavaScript components they replace. tests/vectors/frame-words.json holds, for each case, the props of a frame and the hash of the
// framebuffer the JavaScript components drew for it (through the node path, on this face, with the stand-in pictures below): the words, given the props, must draw the same pixels.
// The fixture was made once from components/frame.mjs, so no test imports the frozen drawing layer. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/frame-words.json"), "utf8"));

// a stand-in picture for every id a frame can name: a flat block of a colour the id hashes to, at the size the id names (the face composes its own rings, so there are none here)
const sizeOf = (id) => { let m; if ((m = /^icon:\w+:(\d+)$/.exec(id))) return [+m[1], +m[1]]; return null; };
const picture = (id) => { const s = sizeOf(id); if (!s) return null; const d = new Uint8ClampedArray(s[0] * s[1] * 4); let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; for (let i = 0; i < d.length; i += 4) { d[i] = 80 + (h & 127); d[i + 1] = 80 + ((h >> 7) & 127); d[i + 2] = 80 + ((h >> 14) & 127); d[i + 3] = 255; } return { w: s[0], h: s[1], data: d }; };
const PICTURES = ["icon:energy:16", "icon:data:16", "icon:essence:16", "icon:cross:16"];

async function setup() {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: podsSpec }), 0);
  for (const id of PICTURES) f.handleOf(id, withPolicy(picture));
  return f;
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };

for (const c of cases) {
  test(`the frame's words draw what the components draw: ${c.name}`, { skip }, async () => {
    const f = await setup();
    assert.equal(f.props(c.props), 0, f.errors().join("; ")); frames(f);
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0, "no node refused");
    assert.equal(f.hash(), c.hash);
  });
}

test("the bottom line refuses a line that says dim and blocked together and a `short` that is not a string of icons; null and absent are the single run", { skip }, async () => {
  const c = cases.find((x) => x.name.startsWith("a dimmed action, one figure short")), line = (over) => ({ ...c.props, frame: { ...c.props.frame, line: { ...c.props.frame.line, ...over } } });
  { const f = await setup(); f.props(line({ blocked: true })); frames(f); const errs = f.errors(); assert.ok(errs.some((e) => /^word: frame\.line says dim and blocked together$/.test(e)), "dim and blocked: " + JSON.stringify(errs)); }
  { const f = await setup(); f.props(line({ short: true })); frames(f); assert.ok(f.errors().some((e) => /frame\.line\.short is a string of icons or null/.test(e)), "a boolean short"); }
  { const f = await setup(); f.props(line({ short: null })); frames(f); assert.deepEqual(f.errors(), []); const g = await setup(); const { short: _s, ...rest } = c.props.frame.line; g.props({ ...c.props, frame: { ...c.props.frame, line: rest } }); frames(g); assert.equal(f.hash(), g.hash(), "null is absent"); }
  { const f = await setup(); f.props(line({ dim: false, short: "⚡" })); frames(f); const a = f.hash(); assert.deepEqual(f.errors(), []); const g = await setup(); g.props(line({ dim: false, short: "◆" })); frames(g); assert.deepEqual(g.errors(), []); assert.notEqual(a, g.hash(), "with dim false, the short icons differ in the pixels"); }
});
test("the comparison can fail: other props give other pixels", { skip }, async () => {
  const f = await setup(), c = cases[0];
  f.props({ ...c.props, frame: { ...c.props.frame, top: { ...c.props.frame.top, title: "Habitat" } } }); frames(f);
  assert.notEqual(f.hash(), c.hash);
});

test("a frame that names a colour the palette lacks says so", { skip }, async () => {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", colours: palette.filter(([n]) => n !== "ground") }); f.send({ t: "spec", screen: "frame", json: frameSpec }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  f.props(cases[0].props); assert.ok(f.errors().some((e) => /palette has no colour ground/.test(e)));
});

test("props without a frame section are only kept; a frame section needs the frame spec", { skip }, async () => {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", colours: palette }); f.send({ t: "spec", screen: "pods", json: podsSpec });
  assert.equal(f.props({ t: "props", screen: "pods", state: "overview" }), 0); assert.deepEqual(f.errors(), []);
  assert.equal(f.props(cases[0].props), -1); assert.match(f.errors()[0], /frame spec has not been sent/);
});

// the focus ring word: every form on its box, against the pixels the JavaScript component drew (focus-ring-words.json)
const rings = JSON.parse(readFileSync(path.join(here, "vectors/focus-ring-words.json"), "utf8")).cases;
const cstr = (M, s) => { const b = new TextEncoder().encode(s + "\0"), p = M._malloc(b.length); M.HEAPU8.set(b, p); return p; };
const ringOn = (f, form, box, colour) => { const M = f.M, a = cstr(M, JSON.stringify(form)), c = cstr(M, colour); const rc = M._face_test_ring(a, ...box, c); M._free(a); M._free(c); frames(f); return rc; };
for (const c of rings) {
  test(`the focus ring word draws what the component drew: ${c.name}`, { skip }, async () => {
    const f = await setup(); assert.equal(ringOn(f, c.form, c.box, c.colour), 0, "no node refused"); assert.deepEqual(f.errors(), []);
    assert.equal(f.hash(), c.hash);
  });
}
test("the focus ring word refuses a target too small for a round ring and a form it does not know; the source picture is kept once", { skip }, async () => {
  const f = await setup();
  ringOn(f, {}, [10, 10, 7, 40], "focus"); assert.match(f.errors().join(), /under 8 px/);
  ringOn(f, { ring: "square" }, [10, 10, 40, 40], "focus"); assert.match(f.errors().join(), /not a ring form/);
  let log = null; for (const box of [[10, 10, 40, 40], [200, 100, 90, 90], [300, 300, 50, 70]]) { ringOn(f, {}, box, "focus"); for (let m; (m = f.poll("log"));) log = m; }
  assert.equal(log.pictures, PICTURES.length + 1, "the 20x20 source is one picture beside the host's, whatever the target's size"); assert.equal(log.table, 1);
});
