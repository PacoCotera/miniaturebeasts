// The frame's words (lvgl-switch.md §2.2) against the JavaScript components they replace. tests/vectors/frame-words.json holds, for each case, the props of a frame and the hash of the
// framebuffer the JavaScript components drew for it (through the node path, on this face, with the stand-in pictures below): the words, given the props, must draw the same pixels.
// The fixture was made once from components/frame.mjs, so no test imports the frozen drawing layer. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy, amberLamp } from "./node-scene.mjs";
import { focusRingOps, ringRaster } from "../../ui/rings.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8")), podsSpec = JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/frame-words.json"), "utf8"));

// a stand-in picture for every id a frame can name: a flat block of a colour the id hashes to, at the size the id names (the face composes its own rings, so there are none here)
const sizeOf = (id) => { let m; if ((m = /^icon:\w+:(\d+)$/.exec(id))) return [+m[1], +m[1]]; return null; };
const picture = (id) => { if (id === "home-lamp-amber-12x12") return amberLamp();   // the signed amber lamp, here a flat block of `amber` (what the code-drawn one was)
  const s = sizeOf(id); if (!s) return null; const d = new Uint8ClampedArray(s[0] * s[1] * 4); let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; for (let i = 0; i < d.length; i += 4) { d[i] = 80 + (h & 127); d[i + 1] = 80 + ((h >> 7) & 127); d[i + 2] = 80 + ((h >> 14) & 127); d[i + 3] = 255; } return { w: s[0], h: s[1], data: d }; };
const PICTURES = ["icon:energy:16", "icon:data:16", "icon:essence:16", "icon:cross:16", "home-lamp-amber-12x12"];

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

// the focus ring word (fix 14): every shape on its rect, every pixel of the ring's box against the roles the oracle gives (ui/rings.mjs focusRingOps, ringRaster); the vectors are focus-ring-words.json
const rings = JSON.parse(readFileSync(path.join(here, "vectors/focus-ring-words.json"), "utf8")).cases, T = frameSpec.focus.ring;
const cstr = (M, s) => { const b = new TextEncoder().encode(s + "\0"), p = M._malloc(b.length); M.HEAPU8.set(b, p); return p; };
const rgbOf = (name) => { const h = palette.find(([n]) => n === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const ringOn = (f, target, box, picture = "", cell = "") => { const M = f.M, a = cstr(M, JSON.stringify(target)), pc = cstr(M, picture), cl = cstr(M, cell); const rc = M._face_test_ring(a, ...box, pc, cl); M._free(a); M._free(pc); M._free(cl); frames(f); return rc; };
const creature = (f, id, c) => f.handleOf(id, withPolicy(() => ({ w: c.pic.w, h: c.pic.h, data: new Uint8ClampedArray(c.pic.w * c.pic.h * 4), foot: c.pic.foot })));
for (const c of rings) {
  test(`the focus ring word draws the oracle's ring: ${c.name}`, { skip }, async () => {
    const f = await setup(), id = `mibi:ring-test:${c.name}`; if (c.pic) creature(f, id, c);
    const o = { ground: c.target.ground ?? "default", tabTop: frameSpec.regions.rail.y };
    let shape = c.target.shape; if (c.pic) { const mirrored = c.cell.endsWith("-m"), cell = c.cell.replace(/-m$/, ""); o.foot = Array.isArray(c.pic.foot) ? c.pic.foot : c.pic.foot[cell]; o.mirrored = mirrored; }
    const ring = focusRingOps(shape, c.box, T, o), roles = ringRaster(ring);
    frames(f); const before = []; for (let y = 0; y < ring.h; y++) for (let x = 0; x < ring.w; x++) before.push(f.pixel(ring.x + x, ring.y + y));
    assert.equal(ringOn(f, c.target, c.box, c.pic ? id : "", c.cell ?? ""), 0, "no node refused"); assert.deepEqual(f.errors(), []);
    const key = rgbOf("void"), core = rgbOf(o.ground === "paper" ? "rust" : "focus"); let bad = 0, key_n = 0, core_n = 0;
    for (let y = 0; y < ring.h; y++) for (let x = 0; x < ring.w; x++) {
      const want = roles[y * ring.w + x] === 2 ? core : roles[y * ring.w + x] === 1 ? key : before[y * ring.w + x], got = f.pixel(ring.x + x, ring.y + y);
      if (roles[y * ring.w + x] === 2) core_n++; if (roles[y * ring.w + x] === 1) key_n++;
      if (!want.every((v, k) => v === got[k])) bad++;
    }
    assert.equal(bad, 0, `${bad} pixels of ${ring.w}x${ring.h} at (${ring.x}, ${ring.y}) differ from the oracle`); assert.ok(core_n > 0 && (o.ground === "paper" ? key_n === 0 : key_n > 0), "a core, and keys but on paper");
  });
}
test("the focus ring word refuses a ring box under 2R, a footprint with no foot, and a shape it does not know; the nine-slice sources are kept once each", { skip }, async () => {
  const f = await setup();
  ringOn(f, { shape: { rect: 6 } }, [10, 10, 10, 40]); assert.match(f.errors().join(), /under 2R/);
  ringOn(f, { shape: "footprint" }, [10, 10, 40, 40], "mibi:nobody", "stand"); assert.match(f.errors().join(), /no footprint for mibi:nobody/);
  ringOn(f, { shape: "square" }, [10, 10, 40, 40]); assert.match(f.errors().join(), /not a ring shape/);
  let log = null; const seen = (n, target, boxes) => { for (const box of boxes) { ringOn(f, target, box); for (let m; (m = f.poll("log"));) log = m; } assert.equal(log.pictures, PICTURES.length + n, `${n} ring sources beside the host's pictures`); assert.equal(log.table, 1); };
  seen(1, { shape: { rect: 0 } }, [[10, 10, 40, 40], [200, 100, 90, 90], [300, 300, 50, 70]]);   // 14 x 14 whatever the target's size
  seen(2, { shape: { rect: 6 } }, [[10, 10, 40, 40], [200, 100, 300, 90]]);                         // and 26 x 26 for the plates
  seen(3, { shape: { rect: 0 }, ground: "paper" }, [[10, 10, 40, 40]]);                           // and the paper's own, without its keys
});
test("the footprint ring's weight follows the light of its picture (the 2 px floor): a map of equal values needs no light; a map that differs reads the id's suffix; an unknown suffix is refused", { skip }, async () => {
  const withMap = async (weight) => { const f = await bootFace(pathToFileURL(dist + "/"), { test: true }), fs = JSON.parse(JSON.stringify(frameSpec)); fs.focus.ring.shapes.footprint.weight = weight;
    f.send({ t: "palette", name: "station", colours: palette }); f.send({ t: "spec", screen: "frame", json: fs }); f.send({ t: "spec", screen: "pods", json: podsSpec }); return f; };
  const pic = { w: 104, h: 112, foot: [10, 100, 56] }, box = [200, 300, 104, 112], T2 = frameSpec.focus.ring, target = { shape: "footprint" };
  const roles = (light) => ringRaster(focusRingOps("footprint", box, T2, { foot: pic.foot, light }));
  const drawn = async (f, id) => { f.handleOf(id, withPolicy(() => ({ w: pic.w, h: pic.h, data: new Uint8ClampedArray(pic.w * pic.h * 4), foot: pic.foot }))); frames(f); const r = focusRingOps("footprint", box, T2, { foot: pic.foot }), want = {}; ringOn(f, target, box, id, "");
    const key = rgbOf("void"), core = rgbOf("focus"), got = new Uint8Array(r.w * r.h); for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const p = f.pixel(r.x + x, r.y + y); got[y * r.w + x] = p.every((v, k) => v === core[k]) ? 2 : p.every((v, k) => v === key[k]) ? 1 : 0; } void want; return got; };
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  { const f = await withMap({ dawn: "default", day: "light", dusk: "default", night: "default" });
    assert.ok(same(await drawn(f, "mibi:abc:adult:104x112:night"), roles(false)), "a :night picture draws the default ops"); assert.deepEqual(f.errors(), []);
    const g = await withMap({ dawn: "default", day: "light", dusk: "default", night: "default" }); assert.ok(same(await drawn(g, "mibi:abc:adult:104x112"), roles(true)), "an unsuffixed picture draws the light ops");
    const h = await withMap({ dawn: "default", day: "light", dusk: "default", night: "default" }); await drawn(h, "mibi:abc:adult:104x112:zzz"); assert.match(h.errors().join(), /unknown light on mibi:abc:adult:104x112:zzz/); }
  { const f = await setup(); assert.ok(same(await drawn(f, "mibi:abc:adult:104x112:night"), roles(false)) && same(await drawn(await setup(), "mibi:abc:adult:104x112"), roles(false)), "with the station's own map both draw the default ops"); }
});
