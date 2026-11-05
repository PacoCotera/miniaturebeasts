// An unread pod shows nothing of its kind: the drawn egg is the same for every species on the same ground.
//   node --test prototypes/exploration/tests/pod-plain.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("the field pod is the same picture for every species on the same ground, at 1x and 2x", () => {
  const grounds = makePage({ console: "silent", canvas: true }).run("Object.keys(POD_SHELL)");
  assert.ok(grounds.length >= 5);
  for (const g of grounds) for (const s of [1, 2]) {
    // each picture comes from a fresh page, so a species left out of the art cache key cannot hide a mark
    const px = sp => JSON.stringify(Array.from(makePage({ console: "silent", canvas: true }).run(`podArt(POD_SHELL[${JSON.stringify(g)}], ${s}, ${sp})`).p));
    const base = px("undefined");
    for (const sp of [0, 1, 2]) assert.equal(px(sp), base, `${g} ${s}x species ${sp}`);
  }
});

test("each ground's egg keeps its own tint", () => {
  const p = makePage({ console: "silent", canvas: true });
  const seen = new Set(p.run("Object.keys(POD_SHELL)").map(g => JSON.stringify(Array.from(p.run(`podArt(POD_SHELL[${JSON.stringify(g)}], 1).p`)))));
  assert.equal(seen.size, 5);
});
