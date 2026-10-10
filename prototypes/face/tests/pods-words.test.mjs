// Pods' words (lvgl-switch.md §2.2) against the JavaScript they replace. tests/vectors/pods-words.json holds, for each scene, the props views/pods-props.mjs gives and the hash of the framebuffer the
// JavaScript drew for the same scene (the old view and the components of the freeze, through the node path, with flat stand-in pictures keyed by id): the words, given the props and the same
// pictures, must draw the same pixels. The fixture was made once from the frozen drawing, so no test imports it. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/pods-words.test.mjs
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
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8"));

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// a stand-in picture of an id at a size: a flat block of a colour the id hashes to, with a notch so a shift shows (the fixture's generator makes the same)
const standIn = (id, w, h, slice, tile) => { const d = new Uint8ClampedArray(w * h * 4), k = hash(id); for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0, notch = x < 3 && y < 3 ? 60 : 0; d[i * 4] = 70 + (k & 127) + notch; d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d, ...(slice ? { slice, tile } : {}) }; };

async function setup(c) {
  const f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  assert.equal(f.send({ t: "palette", name: "station", colours: palette }), 0); assert.equal(f.send({ t: "spec", screen: "frame", json: frameSpec }), 0); assert.equal(f.send({ t: "spec", screen: "pods", json: podsSpec }), 0);
  for (const p of c.pictures) f.handleOf(p.id, withPolicy((id) => standIn(id, p.w, p.h, p.slice, p.tile)));
  return f;
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };

for (const c of cases) {
  test(`Pods ${c.state}: ${c.name}`, { skip }, async () => {
    const f = await setup(c);
    assert.equal(f.props(c.props), 0, f.errors().join("; ")); frames(f);
    if (c.events) { const t0 = f.t; for (const e of c.events) assert.equal(f.send({ t: "event", ...e }), 0, f.errors().join("; ")); f.frame(t0 + c.at); }   // the events begin now; the scene is drawn `at` ms into them
    assert.deepEqual(f.errors(), []); assert.equal(f.refused(), 0, "no node refused");
    assert.equal(f.hash(), c.hash);
  });
}

// the two captions have no JavaScript twin (lvgl-switch.md L2.0): the scenes above are made without them. Check 1 of the gate: each is in the region log at its spec rect where it shows, and absent where it does not.
test("the captions: 'this pod' always in the overview, 'the species' only once identified, each inside its region", { skip }, async () => {
  const withCaptions = (c, figure) => ({ ...c.props, regions: { ...c.props.regions, specimen: { ...c.props.regions.specimen, captions: { pod: "this pod", figure } } } });
  const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };
  const OV = podsSpec.regions.overview, inside = (r, box) => r[0] >= box[0] && r[1] >= box[1] && r[0] + r[2] <= box[0] + box[2] && r[1] + r[3] <= box[1] + box[3];
  const unid = cases.find((c) => c.state === "overview" && /unidentified pod, the pod focused/.test(c.name)), idd = cases.find((c) => c.state === "overview" && /identified pod with kin/.test(c.name));
  let f = await setup(unid); assert.equal(f.props(withCaptions(unid, null)), 0); frames(f); let lg = logOf(f);
  assert.ok(lg.type.some((t) => t.text === "this pod" && t.region === "thisPod" && t.px === 16)); assert.ok(!lg.type.some((t) => t.text === "the species"), "no species caption before Identify");
  const tp = lg.regions.find((r) => r.id === "thisPod" && r.layer === "type"); assert.ok(inside(tp.rect, OV.thisPod.rect), `thisPod ${tp.rect} in ${OV.thisPod.rect}`);
  assert.equal(Math.round(tp.rect[0] + tp.rect[2] / 2), OV.thisPod.centre, "centred on its centre");
  f = await setup(idd); assert.equal(f.props(withCaptions(idd, "the species")), 0); frames(f); lg = logOf(f);
  const fc = lg.regions.find((r) => r.id === "figure.caption" && r.layer === "type"); assert.ok(fc && inside(fc.rect, OV.figure.caption.rect), `figure.caption ${fc?.rect}`);
  assert.ok(lg.type.some((t) => t.text === "the species" && t.px === 16 && t.region === "figure.caption")); assert.equal(f.errors().length, 0);
});
