// The frame's words (lvgl-switch.md §2.2) against the JavaScript components they replace: the same props drawn by components/frame.mjs through the node path and by the C words from a
// `props` message, on the WebAssembly face, must give the same framebuffer. The JavaScript lays the type out with the face's own widths (the same Inter), so any difference is a rule
// one side has wrong. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/words.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { makeCtx } from "../../ui/context.mjs";
import { frame } from "../../ui/components/frame.mjs";
import { frameView } from "../../station/src/views/frame.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), frameSpec = JSON.parse(readFileSync(path.join(specs, "frame.json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgbOf = (name) => { const h = palette.find(([n]) => n === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const CAP = { 16: 12, 20: 14, 28: 21 };

// a stand-in picture for every id a frame can name: a flat block of a colour the id hashes to, at the size the id names
const sizeOf = (id) => { let m; if ((m = /^icon:\w+:(\d+)$/.exec(id))) return [+m[1], +m[1]]; if ((m = /^ring:ellipse:(\d+)x(\d+):/.exec(id))) return [+m[1], +m[2]]; return null; };
const picture = (id) => { const s = sizeOf(id); if (!s) return null; const d = new Uint8ClampedArray(s[0] * s[1] * 4); let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; for (let i = 0; i < d.length; i += 4) { d[i] = 80 + (h & 127); d[i + 1] = 80 + ((h >> 7) & 127); d[i + 2] = 80 + ((h >> 14) & 127); d[i + 3] = 255; } return { w: s[0], h: s[1], data: d }; };

async function setup() {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: JSON.parse(readFileSync(path.join(specs, "pods.json"), "utf8")) }), 0);
  const ctx = makeCtx(frameSpec, { measure: (t, px) => f.measure(t, px), face: (px) => ({ cap: CAP[px], ascent: 0, descent: 0 }) });
  const env = { rgb: rgbOf, cap: (px) => CAP[px], picture, slice: () => null, tile: () => 0 };
  const frames = (n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };
  const fb = () => Uint32Array.from(new Uint32Array(f.M.HEAPU8.buffer, f.M._face_fb(), 1024 * 600));
  return { f, ctx, env, frames, fb };
}
// the two draws of the same view: the JavaScript components' nodes through the node path, then the same facts as props to the words
async function both(S, view, extraAssets = []) {
  const m = frameView(view), nodes = frame(S.ctx, m);
  S.f.scene(nodes, S.env); S.frames(); const js = S.fb();
  for (const id of ["icon:energy:16", "icon:data:16", "icon:essence:16", "icon:cross:16", ...extraAssets]) S.f.handleOf(id, picture);
  const props = { t: "props", screen: "pods", frame: { top: { screen: m.screen, title: m.title, turn: m.turn, turnFlash: m.turnFlash, materials: m.materials, flash: m.flash, companion: m.companion }, line: m.line, plate: { text: m.message, focal: m.focal } } };
  assert.equal(S.f.props(props), 0, S.f.errors().join("; ")); S.frames();
  assert.deepEqual(S.f.errors(), []); const words = S.fb();
  let diff = 0; const first = []; for (let i = 0; i < js.length; i++) if (js[i] !== words[i]) { diff++; if (first.length < 4) first.push([i % 1024, (i / 1024) | 0, js[i].toString(16), words[i].toString(16)]); }
  const lit = words.reduce((n, v) => n + ((v & 0xffffff) !== 0), 0);
  return { diff, first, lit, log: S.f.poll("log") };
}
const step = (turn, e, d, s) => ({ turn, turnFlash: false, materials: { e, d, s }, flash: {} });
const view = (o = {}) => ({ screen: "pods", title: "Pods", step: step(12, 5, 40, 7), companion: { docked: true, withMibi: null }, line: { ok: "Open", back: "Home", subject: "Pod 1" }, need: "", message: "", focal: null, ...o });

test("the top bar and the bottom line: the words draw what the components draw", { skip }, async () => {
  const S = await setup();
  for (const v of [view(), view({ step: { ...step(120, 0, 3, 99999), turnFlash: true, flash: { e: true, s: true } }, companion: { docked: false, withMibi: "kestrel" } }),
    view({ screen: "library", title: "Library", line: { ok: "Hatch ⚡ 3", price: "⚡ 3 ◆ 12", short: true, subject: "A subject that is far too long to fit in the little room the context has between its two rules", need: "Not enough ❀", back: "A name far wider than the room" } }),
    view({ line: { ok: "Read", dim: true, price: "◆ 4" } })]) {
    const r = await both(S, v, ["ring:ellipse:24x24:teal:2", "ring:ellipse:24x24:stone:2"]);
    assert.equal(r.diff, 0, `${r.diff} pixels differ, first ${JSON.stringify(r.first)}`); assert.ok(r.lit > 20000, `the frame is drawn (${r.lit} pixels lit)`);
  }
});

test("the comparison can fail: a frame the words draw differently from the components is found", { skip }, async () => {
  const S = await setup(), m = frameView(view());
  S.f.scene(frame(S.ctx, m), S.env); S.frames(); const js = S.fb();
  const other = frameView(view({ title: "Habitat" }));
  for (const id of ["icon:energy:16", "icon:data:16", "icon:essence:16"]) S.f.handleOf(id, picture);
  S.f.props({ t: "props", screen: "pods", frame: { top: { screen: m.screen, title: other.title, turn: m.turn, turnFlash: false, materials: m.materials, flash: {}, companion: m.companion }, line: m.line, plate: { text: "", focal: null } } }); S.frames();
  const words = S.fb(); let diff = 0; for (let i = 0; i < js.length; i++) if (js[i] !== words[i]) diff++;
  assert.ok(diff > 50, `${diff} pixels differ`);
});

test("the message plate: wrapped, centred, at its bottom edge or over the focal box", { skip }, async () => {
  const S = await setup();
  for (const [msg, focal] of [["Saved.", null], ["The incubator is warm and the egg is turning slowly in its cradle, which is a good sign for the hatch.", null], ["Something a little longer than a line, with a ⚡ in it and more words after, for the wrap.", [200, 400, 400, 150]]]) {
    const r = await both(S, view({ message: msg, focal }), ["ring:ellipse:24x24:teal:2"]);
    assert.equal(r.diff, 0, `${r.diff} pixels differ for "${msg.slice(0, 20)}", first ${JSON.stringify(r.first)}`);
  }
});
