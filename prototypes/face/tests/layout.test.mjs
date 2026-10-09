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
const spec = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frame = spec("frame"), pods = spec("pods");

test("the committed layout vectors are what derive.mjs gives today", () => {
  execFileSync(process.execPath, [path.resolve(here, "../tools/make-layout-vectors.mjs"), "--check"], { stdio: "pipe" });
});
test("every case of the vectors evaluates to its expectation", () => {
  const { cases } = JSON.parse(readFileSync(path.join(here, "vectors/layout.json"), "utf8"));
  assert.ok(cases.length > 250);
  for (const c of cases) assert.deepEqual(evaluate(c.rule, c.path.split(".").reduce((o, k) => o[k], c.spec === "frame" ? frame : pods), c.args), c.expect, `${c.rule} ${c.path} ${c.args}`);
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
  assert.deepEqual(placeRect(pods.regions.collection, 4), [352, 288, 320, 224]); assert.deepEqual(kinRect(pods.regions.overview.kin, 2), [728, 224, 56, 56]);
  const N = pods.regions.overview.name; assert.equal(plateWidth(N, 0), N.plate.min); assert.equal(plateWidth(N, 10000), N.plate.max); assert.equal(plateWidth(N, 100) % N.plate.round, 0);
  assert.deepEqual(platePosition(frame.regions.plate, 1, 100, null), [512 - 66, 550 - 36, 132, 36]); assert.equal(platePosition(frame.regions.plate, 1, 100, [400, 500, 200, 50])[1], 112);
  assert.equal(stampCell(5), 14); assert.equal(stampCell(60), 2);
});
