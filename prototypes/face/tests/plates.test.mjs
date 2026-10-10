// The name plates and the rail tab grounds (lvgl-switch.md §2.4): signed pictures the host sends at boot and never drops; the face picks the plate's width itself (layout_plate_width) and the tab's picture by
// state, and shows them 1:1. A missing picture is an error and a refused node; a spec whose plate has no series, or min or max off the round, is refused whole. Skipped (the face parts) when not built.
//   node --test prototypes/face/tests/plates.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { plateSeries, railGrounds, pinnedPictures, plateWidth } from "../../ui/specs/derive.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { installScene, withPolicy } from "./node-scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (f) => JSON.parse(readFileSync(path.join(specs, f), "utf8")), frame = J("frame.json"), pods = J("pods.json");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/pods-words.json"), "utf8"));
const flat = (id, w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4).fill(200) });

test("the plate series: ten widths 80 to 224 by 16, named <series>-<w>x<h>, the clamp at both ends, refused when malformed", () => {
  const N = pods.regions.overview.name, ids = plateSeries(N);
  assert.equal(ids.length, 10); assert.equal(ids[0], "plate-name-80x24"); assert.equal(ids.at(-1), "plate-name-224x24");
  for (const [text, want] of [[0, 80], [56, 80], [57, 96], [200, 224], [500, 224]]) assert.equal(plateWidth(N, text), want, `text ${text}`);
  for (const t of [0, 1, 55, 56, 57, 100, 199, 200, 201, 500]) assert.ok(ids.includes(`plate-name-${plateWidth(N, t)}x24`), `every width names a picture of the series (${t})`);
  assert.throws(() => plateSeries({ plate: { ...N.plate, series: undefined } }), /series/); assert.throws(() => plateSeries({ plate: { ...N.plate, min: 81 } }), /multiples/); assert.throws(() => plateSeries({ plate: { ...N.plate, max: 230 } }), /multiples/);
});
test("the pinned set: the ten plates and the seven tab grounds, 145,920 B and 131,840 B in all", () => {
  const set = pinnedPictures(pods, frame), plates = set.filter((p) => /^plate-name-/.test(p.id)), tabs = set.filter((p) => /^rail-tab-fill-/.test(p.id));
  assert.equal(plates.length, 10); assert.equal(plates.reduce((a, p) => a + p.w * p.h * 4, 0), 145920);
  assert.equal(tabs.length, 7); assert.equal(tabs.reduce((a, p) => a + p.w * p.h * 4, 0), 131840);
  assert.deepEqual(railGrounds(frame.regions.rail).sort(), ["rail-tab-fill-open-full-152x40", "rail-tab-fill-read-compact-72x40", "rail-tab-fill-read-full-152x40", "rail-tab-fill-sealed-compact-72x40", "rail-tab-fill-sealed-full-152x40", "rail-tab-fill-unread-compact-72x40", "rail-tab-fill-unread-full-152x40"]);
});
async function boot(podsSpec = pods) {
  const f = installScene(await bootFace(pathToFileURL(dist + "/"), { test: true }));
  f.send({ t: "palette", colours: palette }); f.send({ t: "spec", screen: "frame", json: frame }); const rc = f.send({ t: "spec", screen: "pods", json: podsSpec }); return { f, rc };
}
const frames = (f, n = 3) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + 16)); };
const logOf = (f) => { let lg = null; for (let m; (m = f.poll("log"));) lg = m; return lg; };

test("a spec whose name plate has no series, or min or max off the round, is refused whole", { skip }, async () => {
  const bad = (edit) => { const p = JSON.parse(JSON.stringify(pods)); edit(p.regions.overview.name.plate); return p; };
  for (const [what, edit, re] of [["no series", (P) => delete P.series, /no series/], ["min off the round", (P) => { P.min = 81; }, /multiples of round/], ["max off the round", (P) => { P.max = 230; }, /multiples of round/]]) {
    const { f, rc } = await boot(bad(edit)); assert.equal(rc, -1, what); assert.match(f.errors().join(), re, what);
    assert.equal(f.props(cases[0].props), -1, what + ": the spec is not kept"); f.errors();
  }
  assert.equal((await boot()).rc, 0);
});
test("a plate that is not on the face is an error and a refused node; with the series sent, every name finds its plate, a long one clamped", { skip }, async () => {
  const c = cases.find((x) => x.state === "overview" && /unidentified pod, the pod focused/.test(x.name)), pics = c.pictures.filter((p) => !/^plate-name-/.test(p.id));
  let { f } = await boot(); for (const p of pics) f.handleOf(p.id, withPolicy((id) => flat(id, p.w, p.h)));
  assert.equal(f.props(c.props), 0); frames(f); assert.ok(f.errors().some((e) => /name plate plate-name-\d+x24 is not on the face/.test(e))); assert.ok(logOf(f).refused >= 1);
  ({ f } = await boot()); for (const p of pics) f.handleOf(p.id, withPolicy((id) => flat(id, p.w, p.h))); f.pin(pinnedPictures(pods, frame), withPolicy((id) => { const p = pinnedPictures(pods, frame).find((q) => q.id === id); return flat(id, p.w, p.h); }));
  const props = JSON.parse(JSON.stringify(c.props)); props.regions.specimen.name = "Aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa Bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  assert.equal(f.props(props), 0); frames(f); assert.deepEqual(f.errors(), []); const lg = logOf(f);
  assert.ok(lg.regions.some((r) => r.id === "name" && r.layer === "painted" && r.rect[2] === 224), "the long name takes the widest plate, 224");
  assert.ok(lg.pictures <= 200, `${lg.pictures} pictures after the preload`);
});
test("the pinned pictures are never dropped to make room", { skip }, async () => {
  const { f } = await boot(), set = pinnedPictures(pods, frame); f.pin(set, withPolicy((id) => { const p = set.find((q) => q.id === id); return flat(id, p.w, p.h); }));
  const env = { rgb: () => [0, 0, 0], cap: () => 12, picture: () => flat("x", 4, 4), slice: () => null, tile: () => 0 };
  for (let i = 0; i < 300; i++) f.scene([{ id: "s" + i, kind: "sprite", rect: [0, 40, 4, 4], asset: "p" + i }], env);   // 300 pictures through a table of 256: the others are recycled
  for (const p of set) assert.doesNotThrow(() => f.handleOf(p.id, () => { throw new Error("re-uploaded " + p.id); }), p.id + " is still held");
});
