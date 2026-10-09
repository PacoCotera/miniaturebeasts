// The marks on a trait frame's sill, the seed column, and Compare's lamp before the name (pods.json page.marks.sill, regions.compareA.differs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerAsset, dropAsset } from "../assets.mjs";
import { chapterPage, seedColumnBreaches } from "../components/chapterPage.mjs";
import { pageGrid } from "../layout.mjs";
import { makeCtx } from "../context.mjs";

const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8")), pods = JSON.parse(readFileSync(new URL("../specs/station/pods.json", import.meta.url), "utf8"));
const ctx = makeCtx(frame, { measure: (t) => Math.round(t.length * 8), face: () => ({ cap: 12, ascent: 16, descent: -4 }) });
const colours = { pane: "deep", edge: "slate", heading: "bone", name: "bone", line: "fog", lineEmpty: "stone", wipe: "white", standIn: "mist" }, M = pods.page.marks;
const asset = (id, w, h) => registerAsset({ id, w, h, status: "master", build: () => ({ w, h, canvas: () => null }) });
const cell = (name, marks, extra = {}) => ({ name, lines: [], marks, picture: "t:pic", frame: "t:frame", ...extra });

test("seeds, the Only base and the corner marks sit on the sill, none on the picture", () => {
  asset("t:pic", 128, 160); asset("t:frame", 128, 160); asset("t:m", 32, 40);
  const R = pods.regions.chapter.page, m = (kind) => ({ kind, asset: "t:m" });
  const at = (marks) => { const r = chapterPage(ctx, "page", R, { colours, cells: [cell("Head", marks)], marks: M, region: "page" }), P = r.cells[0], n = r.nodes.filter((q) => q.mark); return { P, n }; };
  let { P, n } = at([m("seed2"), m("seed")]); const [x, y] = P, pw = 128, ph = 160;
  assert.deepEqual(n.map((q) => q.rect.slice(0, 2)), [[x, y + ph - 24], [x + pw - 32, y + ph - 24]], "a blend: the second seed at the left, the other at the right, on the sill");
  ({ n } = at([{ kind: "only", asset: "t:m" }])); assert.deepEqual(n[0].rect.slice(0, 2), [x + pw / 2 - M.only[0] / 2, y + ph - 14], "the Only base is centred on the sill");
  ({ n } = at([m("asleep")])); assert.deepEqual(n[0].rect.slice(0, 2), [x + pw / 2 - 12, y + ph - 18]);
  ({ n } = at([m("doing")])); assert.deepEqual(n[0].rect.slice(0, 2), [x + pw / 2 - 14, y + ph - 18]);
  ({ n } = at([m("only"), m("doing")])); assert.deepEqual(n.map((q) => [q.mark, ...q.rect.slice(0, 2)]), [["only", x + pw - 78, y + ph - 14], ["doing", x + 6, y + ph - 18]], "the shared case");
  for (const q of n) assert.ok(q.rect[1] >= y + ph - M.sill.h, `${q.mark} starts at or below the sill's top`);
  for (const id of ["t:pic", "t:frame", "t:m"]) dropAsset(id);
});

test("Compare: the lamp before the name, the name 16 px in; 'Leaf covering' in the 120 cell clears the seed column, and a line that rises into it fails", () => {
  asset("t:lamp", 12, 12); asset("t:pic", 120, 96); asset("t:frame", 120, 96); asset("t:m", 32, 40);
  const R = pods.regions.compareA, props = { colours, marks: M, differs: "t:lamp", region: "page", cells: [cell("Leaf covering", [{ kind: "seed", asset: "t:m" }, { kind: "seed2", asset: "t:m" }], { diff: true }), ...Array.from({ length: 5 }, (_, i) => cell("T" + i, []))] };   // six traits: the narrowest Compare cell
  const r = chapterPage(ctx, "page", R, props), P = r.cells[0], name = r.nodes.find((q) => /\.name$/.test(q.id)), lamp = r.nodes.find((q) => /\.differs$/.test(q.id));
  assert.equal(r.picture[0], 120);
  assert.deepEqual(lamp.rect, [P[0], name.rect[1] + 4, 12, 12], "the lamp at (cell.x, line y + 4)");
  assert.equal(name.rect[0], P[0] + 16, "a differing name starts at cell.x + 16");
  assert.deepEqual(seedColumnBreaches(ctx, r.nodes, r.cells, r.picture, M), [], "the name line clears both seed columns");
  const raised = r.nodes.map((q) => (/\.differs$/.test(q.id) ? { ...q, rect: [q.rect[0], q.rect[1] - 6, q.rect[2], q.rect[3]] } : q));
  assert.ok(seedColumnBreaches(ctx, raised, r.cells, r.picture, M).length > 0, "a lamp that rises above the name line inside a seed's column is a breach");
  const high = r.nodes.map((q) => (/\.m\d+$/.test(q.id) ? { ...q, rect: [q.rect[0], q.rect[1] + 6, q.rect[2], q.rect[3]] } : q));
  assert.ok(seedColumnBreaches(ctx, high, r.cells, r.picture, M).length > 0, "a seed that hangs below the name line's top is a breach");
  for (const id of ["t:lamp", "t:pic", "t:frame", "t:m"]) dropAsset(id);
});
