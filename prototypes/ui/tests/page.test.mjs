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

test("the pane master is a nine-slice by trait count (176 to 584 wide, 248 or 440 high); without it the flat pane draws", () => {
  const R = pods.regions.chapter.page;
  const flat = chapterPage(ctx, "page", R, { colours, cells: cells(4), region: "page" }).nodes;
  assert.ok(!flat.some((n) => n.kind === "nineSlice"), "no master, no nine-slice");
  registerAsset({ id: "t:pane", w: 256, h: 440, status: "master", slice: [64, 64, 16, 16], tile: 32, build: () => ({ w: 256, h: 440, canvas: () => null }) });
  for (const [n, [w, h]] of [[1, [176, 248]], [2, [312, 248]], [4, [584, 248]], [5, [448, 440]], [8, [584, 440]]]) {
    const nine = chapterPage(ctx, "page", R, { colours, cells: cells(n), pane: "t:pane", region: "page" }).nodes.find((q) => q.kind === "nineSlice");
    assert.deepEqual(nine.rect, [R.rect[0], R.rect[1], w, h], `${n} traits: the pane is ${w}×${h}, its left and top fixed`);
  }
  dropAsset("t:pane");
});
