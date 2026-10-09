// The page's pane: a nine-slice master with its own insets, drawn at the height the number of traits gives (station-layouts.md, the page).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerAsset, dropAsset } from "../assets.mjs";
import { chapterPage } from "../components/chapterPage.mjs";
import { makeCtx } from "../context.mjs";

const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8")), pods = JSON.parse(readFileSync(new URL("../specs/station/pods.json", import.meta.url), "utf8"));
const ctx = makeCtx(frame, { measure: (t) => t.length * 9, face: () => ({ cap: 12, ascent: 16, descent: -4 }) });
const cells = (n) => Array.from({ length: n }, (_, i) => ({ name: "T" + i, lines: [], frost: true, marks: [] }));
const colours = { pane: "deep", edge: "slate", heading: "bone", name: "bone", line: "fog", lineEmpty: "stone", wipe: "white" };

test("the open page has no pane: one hairline rule as wide as the grid the count gives (152 to 584); Compare's page keeps its nine-slice pane", () => {
  const R = pods.regions.chapter.page, rule = (n) => chapterPage(ctx, "page", R, { colours, cells: cells(n), heading: { emblem: "e", word: "Face" }, count: n, region: "page" }).nodes;
  for (const [n, w] of [[1, 152], [2, 296], [3, 440], [4, 584], [5, 440], [6, 440], [7, 584], [8, 584]]) {
    const nodes = rule(n), line = nodes.find((q) => q.id === "page.rule");
    assert.ok(!nodes.some((q) => q.kind === "nineSlice" || (q.kind === "rect" && q.id === "page")), "no pane");
    assert.deepEqual(line.rect, [R.rect[0] + 24, R.rect[1] + 36, w - 24, 1], `${n} traits: the rule runs from the first column to the last, the page ${w} wide`);
  }
  const sealed = chapterPage(ctx, "page", R, { colours, cells: [], heading: { emblem: "e", word: "Character" }, count: 1, sealedFind: true, region: "page" }).nodes;
  assert.deepEqual(sealed.find((q) => q.id === "page.rule").rect, [R.rect[0] + 24, R.rect[1] + 36, 128, 1], "a shut chapter takes the one-trait size");
  registerAsset({ id: "t:pane", w: 256, h: 440, status: "master", slice: [64, 64, 16, 16], tile: 32, build: () => ({ w: 256, h: 440, canvas: () => null }) });
  const C = pods.regions.compareA, nine = chapterPage(ctx, "pageA", C, { colours, cells: cells(2), pane: "t:pane", region: "pageA" }).nodes.find((q) => q.kind === "nineSlice");
  assert.ok(nine, "Compare's page is the nine-slice master"); dropAsset("t:pane");
});
