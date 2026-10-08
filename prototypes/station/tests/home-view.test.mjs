// The Home view in Node: state, focus and presentation to props, with no canvas. The regions are the spec file's, every
// picture it asks for is at the size the layout lists, the residents stand with their feet on the ground band, and the
// bottom line says what ✓ does.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { homeView } from "../src/views/home.mjs";
import { makeCtx } from "../../ui/context.mjs";
import { loadTypeNode } from "../../ui/type-node.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/home.json"), "utf8")), frameSpec = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/frame.json"), "utf8"));
const ctx = makeCtx(frameSpec, loadTypeNode()), settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const R = spec.regions;
const res = (id, stage, u, v, face = 1) => ({ id, name: "Bean" + id, species: "Loika", stage, u, v, face, dy: 0, painted: false, sha: null, lamp: id === 2 });
function model(over = {}) {
  const st = S.freshSt("w1", 1, 1000); S.normalize(st); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, 1000);
  return { st, sv: null, ui: {}, settings, docked: true, crates: [], residents: [res(1, "adult", 0.1, 0.5), res(2, "juvenile", 0.8, 0.2), res(3, "adult", 0.5, 0.9)], withName: "Dot", focus: null, present: {}, ...over };
}
const view = (m) => homeView(m, spec, ctx);

test("the modules sit at the spec's rectangles, the pictures are at the sizes the layout lists", () => {
  const v = view(model()), sizes = { lamp: [12, 12], door: [288, 72], crate: [80, 56], wellslot: [40, 40], pod: [32, 40], glint: [12, 12], dome: [80, 80], leaf: [8, 12], probe: [128, 80], plate: [28, 12], slot: [40, 80], bed: [128, 56], compMark: [16, 24], knob: [32, 8] };
  for (const key of ["bay", "rack", "incubator", "probe"]) assert.equal(v.modules[key].word, spec.strings.modules[key]);
  const items = (k) => v.modules[k].items;
  assert.equal(items("rack").filter((i) => i.id.startsWith("well")).length, 6);
  assert.deepEqual(items("rack").find((i) => i.id === "well0").rect, [712, 216, 40, 40]); assert.deepEqual(items("rack").find((i) => i.id === "well5").rect, [952, 216, 40, 40]);
  assert.deepEqual(items("rack").find((i) => i.id === "pod0").rect, [716, 216, 32, 40]);   // the well pod sprite, centred in its 40×40 well
  assert.deepEqual(items("bay").find((i) => i.id === "door").rect, [704, 84, 288, 72]);
  assert.deepEqual(items("incubator").find((i) => i.id === "dome").rect, [704, 328, 80, 80]);
  assert.deepEqual(items("probe").find((i) => i.id === "probe").rect, [704, 456, 128, 80]); assert.deepEqual(items("probe").find((i) => i.id === "slot").rect, [952, 456, 40, 80]);
  assert.deepEqual(items("probe").filter((i) => i.id.startsWith("plate")).map((i) => i.rect), [[848, 496, 28, 12], [884, 496, 28, 12], [920, 496, 28, 12]]);
  for (const r of v.requests) if (sizes[r.kind]) { const want = r.kind === "pod" ? r.size : sizes[r.kind]; if (r.w) assert.deepEqual([r.w, r.h], want); if (r.size) assert.deepEqual(r.size, want); }
  assert.deepEqual(JSON.parse(JSON.stringify(v)), v);
});

test("residents: 144×152 adults and 104×112 juveniles, feet on the ground band, nearer ones drawn in front, a focused one lifts 4 px", () => {
  const v = view(model()), [gx, gy, gw, gh] = R.glass.ground, rs = v.window.residents;
  assert.deepEqual(rs.map((r) => r.id), ["r2", "r1", "r3"]);   // by feet: the ones further up the band first
  for (const r of rs) { assert.ok(r.rect[0] >= R.glass.rect[0] && r.rect[0] + r.rect[2] <= R.glass.rect[0] + R.glass.rect[2], "inside the glass"); const feet = r.rect[1] + r.rect[3]; assert.ok(feet >= gy && feet <= gy + gh, "feet on the band: " + feet); }
  assert.deepEqual(rs.find((r) => r.id === "r1").rect.slice(2), [144, 152]); assert.deepEqual(rs.find((r) => r.id === "r2").rect.slice(2), [104, 112]);
  assert.ok(rs.find((r) => r.id === "r2").lamp && !rs.find((r) => r.id === "r1").lamp);
  const f = view(model({ focus: "r:1" })), a = v.window.residents.find((r) => r.id === "r1").rect, b = f.window.residents.find((r) => r.id === "r1").rect;
  assert.equal(a[1] - b[1], 4);
  const t = f.targets.find((x) => x.id === "r:1"); assert.equal(t.shape, "ellipse"); assert.equal(t.rect[1] + t.rect[3] - 12, b[1] + 4 + b[3] - 8 + 0 * 1);   // the ring's top is 8 px above the feet
});

test("the focus targets and the bottom line", () => {
  const v = view(model());
  assert.deepEqual(v.targets.filter((t) => t.group === "module").map((t) => t.id), ["bay", "rack", "incubator", "probe"]);
  assert.deepEqual(v.targets.find((t) => t.id === "knob").rect, [616, 536, 48, 24]);
  assert.equal(v.line.subject, "the room");
  assert.equal(view(model({ focus: "bay", docked: false })).line.subject, "closed while the Companion is away");
  assert.equal(view(model({ focus: "knob" })).line.ok, "Rest");
  assert.equal(view(model({ focus: "r:1" })).line.ok, "Look at Bean1");
});

test("an arrival: the ribbon, the Bay lifted by the spec's lift, the crates opened one at a time, pods in flight", () => {
  const m = model(), c = (n) => ({ n, pods: [{ g: "meadow" }], of: 4, explored: 2 });
  const arr = { i: 1, k: 0.6, plays: [{ c: c(7), ids: [] }, { c: c(8), ids: [m.st.tray[0].id] }] };
  const v = view({ ...m, present: { arrival: arr } });
  assert.equal(v.ribbon.text, "Second crate home · half the land explored"); assert.ok(!/\d/.test(v.ribbon.text), "no digits on the ribbon"); assert.equal(v.modules.bay.lift, R.bay.lift); assert.equal(v.arriving, true);
  assert.ok(v.modules.bay.items.some((i) => i.id === "crate0" && /crate:open/.test(i.asset)), "the opened crate");
  assert.ok(v.modules.rack.items.some((i) => i.id.startsWith("fly")), "a pod in flight"); assert.ok(!v.modules.rack.items.some((i) => i.id === "pod0"), "its well waits");
  assert.equal(v.line.subject, "the bay opens");
});

test("the report card after an arrival: crates, what was gathered, the Probe's mend and the world's lines, in the spec's colours", () => {
  const report = { crates: [{ dev: false, pods: 2, of: 4, explored: 1 }], gathered: { e: 3, d: 2, s: 1, top: false }, probe: { plates: [true, false, false], paid: 0 }, world: ["a wind came"] };
  const v = view(model({ present: { report } }));
  assert.deepEqual(v.report.layout.rect, [64, 120, 560, 312]); assert.equal(v.report.crates.length, 1); assert.equal(v.report.assets.pod, "icon:pod:16");
  assert.deepEqual(v.requests.filter((r) => r.kind === "icon").map((r) => r.id).sort(), ["icon:pod:16", "icon:shield:16", "icon:shieldGone:16"]);
  assert.equal(view(model()).report, null);
});
