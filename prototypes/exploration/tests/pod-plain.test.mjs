// An unread pod shows nothing of its kind: the painted pod is the same for every species on the same ground.
//   node --test prototypes/exploration/tests/pod-plain.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("the field pod is the art desk's painted pod, one file per ground, whatever the species, at 1x, 2x and 3x", () => {
  const p = makePage({ console: "silent", canvas: true });
  const grounds = p.run("Object.keys(POD_SHELL)");
  assert.ok(grounds.length >= 5);
  for (const g of grounds) for (const s of [1, 2, 3]) {
    const d = p.run(`(() => { const a = podArt(POD_SHELL[${JSON.stringify(g)}], ${s}), b = podArt(POD_SHELL[${JSON.stringify(g)}], ${s}, 2); return { w: a.w, h: a.h, same: a === b, loaded: !!STONE_PIECES.get('pod-walk-16x20-' + POD_SHELL[${JSON.stringify(g)}]) }; })()`);
    assert.deepEqual([d.w, d.h, d.same, d.loaded], [16 * s, 20 * s, true, true], `${g} ${s}x`);
  }
});

test("each ground's egg keeps its own shell", () => {
  const p = makePage({ console: "silent", canvas: true });
  const seen = new Set(p.run("Object.keys(POD_SHELL)").map(g => p.run(`POD_SHELL[${JSON.stringify(g)}]`)));
  assert.equal(seen.size, 5);
  assert.equal(p.run("podArt('bone', 1) === podArt('lime', 1)"), false);
});
