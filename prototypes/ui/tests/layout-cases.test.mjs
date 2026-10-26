// The layout check against the known findings (ui/tests/layout-cases.json): on each golden state's fixture log (ui/tests/layout-cases/, taken by goldens.mjs --logs and copied by
// layout-check.mjs --refresh-cases), every expected finding is made and no cleared one is. A fixture whose hash is no longer its golden's is stale: take it again after a retake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findings } from "../specs/layout.mjs";
import { specFor } from "../../face/tools/layout-check.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), J = (f) => JSON.parse(readFileSync(f, "utf8"));
const cases = J(path.join(here, "layout-cases.json")).cases, frame = J(path.join(here, "../specs/station/frame.json"));
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const matches = (f, e) => f.rule === e.rule && (e.part == null || f.part === e.part) && (e.node == null || f.node === e.node) && (e.other == null || String(f.other).startsWith(e.other)) && (e.container == null || f.container.id === e.container)
  && (e.measured == null || (Array.isArray(e.measured) ? f.measured >= e.measured[0] && f.measured <= e.measured[1] : f.measured === e.measured));
const say = (f) => `${f.rule}${f.part ?? ""} [${f.container.id}] ${f.node} / ${f.other} ${f.measured} → ${f.required}`;

for (const c of cases) test(`${c.state} (${c.from})`, () => {
  const [screen, ...rest] = c.state.split("/"), state = rest.join("/"), file = path.join(here, "layout-cases", screen, slug(state) + ".json");
  assert.ok(existsSync(file), `no fixture log for ${c.state}: layout-check.mjs <logs> --refresh-cases`);
  const rec = J(file), golden = J(path.join(here, "../../face/golden", screen, screen + ".json")).states[state];
  assert.equal(rec.hash, golden?.hash, `the fixture of ${c.state} is not its golden's (a retake): layout-check.mjs <logs> --refresh-cases`);
  const { spec } = specFor(rec), fs = findings(rec.log, spec, frame, rec.screen, rec.state, { facts: rec.facts ?? {} });
  for (const e of c.expect) assert.ok(fs.some((f) => matches(f, e)), `${c.state}: expected ${e.rule}${e.part ?? ""} ${e.node ?? ""} ${e.other ?? ""} ${JSON.stringify(e.measured ?? "")} (${e.why}); found:\n  ${fs.filter((f) => f.rule === e.rule).map(say).join("\n  ")}`);
  for (const e of c.clear) assert.ok(!fs.some((f) => matches(f, e)), `${c.state}: cleared by the owner, but found: ${fs.filter((f) => matches(f, e)).map(say).join("; ")}`);
});
test("the corpus: every ✓m of the spec's validation has a case", () => {
  const marks = cases.flatMap((c) => c.expect.filter((e) => e.mark === "✓m")); assert.ok(marks.length >= 25, marks.length + " ✓m expects");
  for (const c of cases) assert.ok(Array.isArray(c.clear) && Array.isArray(c.pending), c.state);
});
