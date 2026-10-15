// The derived rules (lvgl-switch.md §2.3): ui/specs/derive.mjs is the JavaScript reference; tests/vectors/layout.json is made from it (tools/make-layout-vectors.mjs) and face_test runs the C rules
// (src/layout/layout.c) on the same cases. This file holds the JavaScript half: the vectors are current, and the rules say what the spec documents.
//   node --test prototypes/face/tests/layout.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { slantTabs, slantAt, pageSize, pageGrid, placeRect, kinRect, plateWidth, platePosition, stampCell, evaluate } from "../../ui/specs/derive.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), specs = path.resolve(here, "../../ui/specs/station");
const spec = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frame = spec("frame"), pods = spec("pods"), incubator = spec("incubator"), vivarium = spec("vivarium"), habitat = spec("habitat");

test("the committed layout vectors are what derive.mjs gives today", () => {
  execFileSync(process.execPath, [path.resolve(here, "../tools/make-layout-vectors.mjs"), "--check"], { stdio: "pipe" });
});
test("every case of the vectors evaluates to its expectation", () => {
  const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/layout.json"), "utf8"));
  assert.ok(cases.length > 250);
  for (const c of cases) assert.deepEqual(evaluate(c.rule, c.path.split(".").reduce((o, k) => o[k], ({ frame, pods, incubator, vivarium, habitat })[c.spec]), c.args), c.expect, `${c.rule} ${c.path} ${c.args}`);
});
test("the slanted rail: full tabs to six, compact with the open one full to twelve, more is the UI designer's; centred runs snap down to the grid", () => {
  const R = frame.regions.rail;
  assert.deepEqual(slantTabs(R, 6, 0, "centred").tabs.map((t) => t.rect[2]), Array(6).fill(136));
  const seven = slantTabs(R, 7, 3, "centred"); assert.deepEqual(seven.tabs.map((t) => t.rect[2]), [56, 56, 56, 136, 56, 56, 56]); assert.equal(seven.run, 56 * 6 + 136 + 16);
  assert.equal(seven.x0 % 8, 0); assert.ok(seven.x0 <= 512 - seven.run / 2 && 512 - seven.run / 2 - seven.x0 < 8);
  assert.equal(slantTabs(R, 13).overflow, true); assert.equal(slantTabs(R, 0).tabs.length, 0);
  assert.equal(slantAt(R, 0), 0); assert.equal(slantAt(R, 39), 15);
});
test("the page: its size and grid by trait count; a count the table lacks is the UI designer's", () => {
  const P = pods.regions.chapter.page;
  assert.deepEqual(pageSize(P, 1), [152, 232]); assert.deepEqual(pageSize(P, 8), [584, 440]); assert.deepEqual(pageSize(P, 99), [584, 440]); assert.deepEqual(pageSize(P, 0), [152, 232]);
  assert.equal(pageGrid(P, 4).cells.length, 4); assert.deepEqual(pageGrid(P, 6).cells[3], [P.rect[0] + 24, P.rect[1] + 256, 128, 184]); assert.equal(pageGrid(P, 9).overflow, true); assert.equal(pageGrid(P, 0).overflow, false);
});
test("the rack, the kin, the name plate, the message plate and the stamp", () => {
  assert.deepEqual(placeRect(pods.regions.collection, 4), [364, 312, 288, 224]); assert.deepEqual(kinRect(pods.regions.overview.kin, 2), [728, 224, 56, 56]);
  const N = pods.regions.overview.name; assert.equal(plateWidth(N, 0), N.plate.min); assert.equal(plateWidth(N, 10000), N.plate.max); assert.equal(plateWidth(N, 100) % N.plate.round, 0);
  assert.deepEqual(platePosition(frame.regions.plate, 1, 100, null), [512 - 66, 550 - 36, 132, 36]); assert.equal(platePosition(frame.regions.plate, 1, 100, [400, 500, 200, 50])[1], 112);
  assert.equal(stampCell(5), 14); assert.equal(stampCell(60), 2);
});

test("fix 2 F11: the rail's well, for every run of 1 to 12 tabs with one open and with none, is one of the 18 signed widths, ends at y 88 inside x 61 to 954, and holds every tab and the focused tab's ring box", async () => {
  const { railWells } = await import("../../ui/specs/derive.mjs"), R = frame.regions.rail, ids = new Set(railWells(R)); assert.equal(ids.size, 18);
  for (let n = 1; n <= 12; n++) for (const open of [0, Math.floor(n / 2), -1]) {
    if (open < 0 && n <= R.fullUpTo) continue;
    const t = slantTabs(R, n, open, "centred"), well = [t.x0 - 8, 40, t.run + 16, 48];
    assert.ok(ids.has(`plate-rail-well-${well[2]}x48`), `${n} tabs, open ${open}: ${well[2]} is one of the 18`);
    assert.ok(well[0] >= 61 && well[0] + well[2] <= 954 && well[1] + well[3] === 88, `${n} tabs: the well ${well} lies inside x 61 to 954 and ends at y 88`);
    for (const tab of t.tabs) { const ring = [tab.rect[0] - 4, 42, tab.rect[2] + 24, 42];
      assert.ok(tab.rect[0] >= well[0] && tab.rect[0] + tab.rect[2] + R.slant <= well[0] + well[2] && tab.rect[1] >= 40 && tab.rect[1] + tab.rect[3] <= 88, `${n} tabs: a tab leaves its well`);
      assert.ok(ring[0] >= well[0] && ring[0] + ring[2] <= well[0] + well[2] && ring[1] + ring[3] <= 88, `${n} tabs: the focused ring ${ring} leaves the well ${well}`); }
  }
});
