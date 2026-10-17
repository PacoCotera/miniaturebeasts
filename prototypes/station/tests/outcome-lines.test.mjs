// The subject zone's outcome lines (decision panel spec Part 2 and its T-67 amendments), measured with the real metrics at 16 px: at most 208 px and six words each, at their widest figure.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMeasure } from "../../ui/specs/measure.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), J = (f) => JSON.parse(readFileSync(path.join(here, "../../ui/specs/station", f), "utf8"));
const measure = createMeasure(JSON.parse(readFileSync(path.resolve(here, "../../face/dist/metrics.json"), "utf8")));
test("every outcome line fits the subject zone: 208 px, six words", () => {
  const pods = J("pods.json").strings.outcomes, inc = J("incubator.json").strings;
  const lines = { ...Object.fromEntries(["identify", "identifyNew", "read", "create"].map((k) => ["pods." + k, pods[k]])),
    "incubator.readyIn": inc.readyIn.replace("{n}", "99") };
  for (const [k, t] of Object.entries(lines)) assert.ok(t.trim().split(/\s+/).length <= 6 && measure(t, 16) <= 208, `${k}: ${t} (${measure(t, 16)} px)`);
});
