// The play page's build stamp (src/stamp.mjs): build.json's UTC time shown in Mexico City time, whatever the viewer's zone.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mexicoCity, stampText } from "../src/stamp.mjs";

test("the built time in Mexico City, 24-hour: a winter and a summer date", () => {
  assert.equal(mexicoCity("2026-01-15T18:30:00Z"), "2026-01-15 12:30 Mexico City");
  assert.equal(mexicoCity("2026-07-15T03:05:00Z"), "2026-07-14 21:05 Mexico City");   // the day before in Mexico City; no summer time there since 2022
});

test("the stamp's line", () => {
  assert.equal(stampText({ commit: "a9d087f9aa", short: "a9d087f", built: "2026-10-24T23:59:00Z" }), "build a9d087f · 2026-10-24 17:59 Mexico City");
  assert.equal(stampText({ commit: "a9d087f9aa", built: "2026-12-01T06:00:00Z" }), "build a9d087f · 2026-12-01 00:00 Mexico City");
  assert.equal(stampText({ short: "a9d087f" }), "build a9d087f");
  assert.equal(stampText(null), "build local");
});
