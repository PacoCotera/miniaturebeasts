// breakline.mjs: the detail of a load failure wraps at words into at most two lines, its error text is cut from the middle, "build <sha>" stays whole at the end.
import test from "node:test";
import assert from "node:assert/strict";
import { breakLines, middleCut, buildTag } from "../src/breakline.mjs";

const measure = (s) => s.length, B = { short: "f252de4" };

test("middleCut keeps the start and the end", () => {
  assert.equal(middleCut("abcdefghij", 10), "abcdefghij");
  assert.equal(middleCut("abcdefghij", 6), "abc…ij");
  assert.equal(middleCut("abcdefghij", 1), "…");
});

test("buildTag: the short hash, the commit's first 7, or local", () => {
  assert.equal(buildTag(B), "build f252de4");
  assert.equal(buildTag({ commit: "0123456789abcdef" }), "build 0123456");
  assert.equal(buildTag(null), "build local");
});

test("a short detail stays on one line, with the build at the end", () => {
  assert.deepEqual(breakLines({ lead: "places", why: "not ready", build: B, measure, maxW: 60 }).lines, ["places · not ready · build f252de4"]);
});

test("a long error is cut from the middle, in two lines of whole words, the build whole", () => {
  const why = "Failed to fetch dynamically imported module: https://example.test/prototypes/exploration/src/places.mjs";
  const { lines } = breakLines({ lead: "places", why, build: B, measure, maxW: 48, maxLines: 2 });
  assert.ok(lines.length <= 2 && lines.every((l) => l.length <= 48), JSON.stringify(lines));
  assert.ok(lines.at(-1).endsWith("build f252de4"));
  assert.ok(lines.join(" ").includes("Failed to fetch"), "the start is kept");
  assert.ok(lines.join(" ").includes("places.mjs"), "the end is kept");
  assert.ok(lines.join(" ").includes("…"));
});

test("the build tag is never split across lines", () => {
  for (let w = 20; w < 70; w++) {
    const { lines } = breakLines({ lead: "places", why: "Failed to fetch dynamically imported module places.mjs", build: B, measure, maxW: w });
    assert.ok(lines.at(-1).endsWith("build f252de4"), `${w}: ${JSON.stringify(lines)}`);
  }
});
