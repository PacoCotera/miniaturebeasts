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
const corpus = J(path.join(here, "layout-cases.json")), cases = corpus.cases, frozen = corpus.frozen ?? {}, frame = J(path.join(here, "../specs/station/frame.json"));
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const matches = (f, e) => f.rule === e.rule && (e.part == null || f.part === e.part) && (e.node == null || f.node === e.node) && (e.other == null || String(f.other).startsWith(e.other)) && (e.container == null || f.container.id === e.container)
  && (e.measured == null || (Array.isArray(e.measured) ? f.measured >= e.measured[0] && f.measured <= e.measured[1] : f.measured === e.measured));
// a frozen state keeps the fixture it was marked on (layout-cases/<screen>/frozen/), and its hash is the freeze's, not the golden's
const fixtureOf = (state) => { const [screen, ...rest] = state.split("/"), s = rest.join("/"); return path.join(here, "layout-cases", screen, ...(frozen[state] ? ["frozen"] : []), slug(s) + ".json"); };
const say = (f) => `${f.rule}${f.part ?? ""} [${f.container.id}] ${f.node} / ${f.other} ${f.measured} → ${f.required}`;

for (const c of cases) test(`${c.state} (${c.from})`, () => {
  const [screen, ...rest] = c.state.split("/"), state = rest.join("/"), file = fixtureOf(c.state);
  assert.ok(existsSync(file), `no fixture log for ${c.state}: layout-check.mjs <logs> --refresh-cases`);
  const rec = J(file), golden = J(path.join(here, "../../face/golden", screen, screen + ".json")).states[state];
  if (frozen[c.state]) assert.equal(rec.hash, frozen[c.state].hash, `the frozen fixture of ${c.state} is not the one frozen`);
  else assert.equal(rec.hash, golden?.hash, `the fixture of ${c.state} is not its golden's (a retake): layout-check.mjs <logs> --refresh-cases`);
  const { spec } = specFor(rec), fs = findings(rec.log, spec, frame, rec.screen, rec.state, { facts: rec.facts ?? {} });
  for (const e of c.expect) assert.ok(fs.some((f) => matches(f, e)), `${c.state}: expected ${e.rule}${e.part ?? ""} ${e.node ?? ""} ${e.other ?? ""} ${JSON.stringify(e.measured ?? "")} (${e.why}); found:\n  ${fs.filter((f) => f.rule === e.rule).map(say).join("\n  ")}`);
  for (const e of c.clear) assert.ok(!fs.some((f) => matches(f, e)), `${c.state}: cleared by the owner, but found: ${fs.filter((f) => matches(f, e)).map(say).join("; ")}`);
});
test("the corpus: every ✓m of the spec's validation has a case", () => {
  const marks = cases.flatMap((c) => c.expect.filter((e) => e.mark === "✓m")); assert.ok(marks.length >= 25, marks.length + " ✓m expects");
  for (const c of cases) assert.ok(Array.isArray(c.clear) && Array.isArray(c.pending), c.state);
});

// The owner's review of 2026-10-26: one case a card (card, verdict); the owner's marks are the ground truth.
const owner = cases.filter((c) => c.card), by = (v) => owner.filter((c) => c.verdict === v);
test("the owner's review: 98 cards, one case each: a fault expects (its own kind, or the finding that carries it), a fine clears, a not-sure card is as the tune left it", () => {
  assert.equal(owner.length, 98); assert.equal(new Set(owner.map((c) => c.card)).size, 98, "one case a card");
  assert.deepEqual([by("fault").length, by("fine").length, by("unsure").length, by("unmarked").length], [53, 22, 21, 2]);
  for (const c of by("fault")) assert.ok(c.expect.length || c.fixed || c.pending.length, `${c.card}: a fault expects a finding, or names the commit that fixed it, or is pending`);
  assert.deepEqual(by("fault").filter((c) => c.fixed).map((c) => c.card), ["vivarium-L11-1"], "exactly one fault is fixed (by Q1)");
  for (const c of by("fine")) assert.ok(c.clear.length && !c.expect.length, `${c.card}: a fine clears its kind`);
  for (const c of [...by("unsure"), ...by("unmarked")]) assert.ok(c.expect.length || c.clear.length, `${c.card}: as the tune left it`);
  for (const id of ["sitting-L5-8", "vivarium-L10-1", "vivarium-L3-15"]) assert.ok(owner.find((c) => c.card === id).expect.length, `${id}: the owner's faults that the tune first cleared fire under their own kind`);
  assert.equal(by("unsure").filter((c) => c.expect.length && !c.clear.length).length, 8, "the not-sure cards that fire: 8");
  assert.equal(by("unsure").filter((c) => c.clear.length).length, 13, "and those that clear: 13");
});
test("the owner's exceptions: each fine card whose kind the rule still finds is cleared by its frame.json exception, and by nothing else", () => {
  const bare = JSON.parse(JSON.stringify(frame)); bare.layout.exceptions = [];
  for (const e of frame.layout.exceptions.filter((x) => x.by === "owner")) {   // UI/UX's exceptions (R5 Q6) have no owner card: layout-check proves each is used
    const c = by("fine").find((q) => q.clear.some((x) => x.node === e.node && x.rule === e.rule && (e.other == null || [e.other].flat().includes(x.other))) && q.state.startsWith(e.screen + "/"));
    assert.ok(c, `${e.screen} ${e.rule} ${e.node}: a fine card of the owner's`);
    const [screen, ...rest] = c.state.split("/"), rec = J(fixtureOf(c.state)), { spec } = specFor(rec), run = (f) => findings(rec.log, spec, f, rec.screen, rec.state, { facts: rec.facts ?? {} });
    const ex = (f) => f.rule === e.rule && f.node === e.node && (e.other == null || [e.other].flat().includes(f.other));
    assert.ok(run(bare).some(ex), `${c.card}: without its exception the finding is made`); assert.ok(!run(frame).some(ex), `${c.card}: with it, it is not`);
  }
});
