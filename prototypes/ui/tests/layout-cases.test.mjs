// The layout check against the known findings (ui/tests/layout-cases.json): on each golden state's fixture log (ui/tests/layout-cases/, taken by goldens.mjs --logs and copied by
// layout-check.mjs --refresh-cases), every expected finding is made and no cleared one is. A fixture whose hash is no longer its golden's is stale: take it again after a retake.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findings, overruns } from "../specs/layout.mjs";
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
// the collection v2 design §4: the proof that L10c bites. Three broken room-view frames (layout-cases/vivarium/broken/) each give exactly one L10c finding; the frozen logs carry no `view` fact and give none.
const BROKEN = path.join(here, "layout-cases", "vivarium", "broken");
test("L10c bites: each broken room-view fixture gives exactly one L10c finding; the frozen logs give none", () => {
  const want = { "reeds-crop-230.json": ["reeds-boulder", "left"], "boulders-rear-stone.json": ["boulders-rear-stone", "right"], "loika-foot-16.json": ["resident", "left"] };
  assert.deepEqual(readdirSync(BROKEN).filter((f) => f.endsWith(".json")).sort(), Object.keys(want).sort(), "the three broken fixtures");
  for (const [f, [node, other]] of Object.entries(want)) {
    const rec = J(path.join(BROKEN, f)), { spec } = specFor(rec), cuts = findings(rec.log, spec, frame, rec.screen, rec.state, { facts: rec.facts }).filter((x) => x.rule === "L10" && x.part === "c");
    assert.deepEqual(cuts.map((x) => [x.node, x.other]), [[node, other]], `${f}: ${rec.why}`);
  }
  for (const f of readdirSync(path.join(here, "layout-cases", "vivarium", "frozen"))) {
    const rec = J(path.join(here, "layout-cases", "vivarium", "frozen", f)), { spec } = specFor(rec);
    assert.deepEqual(findings(rec.log, spec, frame, rec.screen, rec.state, { facts: rec.facts ?? {} }).filter((x) => x.rule === "L10" && x.part === "c"), [], `frozen ${f}: no view fact, no L10c`);
  }
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
  for (const c of by("fault")) assert.ok(c.expect.length || c.fixed || c.ruled || c.pending.length, `${c.card}: a fault expects a finding, or names the commit that fixed it, or the owner's ruling that replaced it, or is pending`);
  assert.deepEqual(by("fault").filter((c) => c.fixed).map((c) => c.card).sort(), ["vivarium-L1-10", "vivarium-L11-1", "vivarium-L7-11"], "three faults are fixed (L11-1 by Q1; L1-10 and L7-11 by the collection v2 build: the bed centred)");
  assert.deepEqual(by("fault").filter((c) => c.ruled).map((c) => [c.card, c.ruled]), [["vivarium-L10-1", "2026-10-29 14:38"]], "one fault is ruled (the window edge rule)");
  for (const c of by("fine")) assert.ok(c.clear.length && !c.expect.length, `${c.card}: a fine clears its kind`);
  for (const c of [...by("unsure"), ...by("unmarked")]) assert.ok(c.expect.length || c.clear.length, `${c.card}: as the tune left it`);
  for (const id of ["sitting-L5-8", "vivarium-L3-15"]) assert.ok(owner.find((c) => c.card === id).expect.length, `${id}: the owner's faults that the tune first cleared fire under their own kind`);
  { const c = owner.find((q) => q.card === "vivarium-L10-1"); assert.ok(c.clear.some((e) => e.rule === "L10" && e.part === "c" && e.node == null), "vivarium-L10-1: L10c is checked on it and finds nothing (the broken fixtures each find one)"); }
  assert.equal(by("unsure").filter((c) => c.expect.length && !c.clear.length).length, 8, "the not-sure cards that fire: 8");
  assert.equal(by("unsure").filter((c) => c.clear.length).length, 13, "and those that clear: 13");
});
test("the owner's exceptions: each fine card whose kind the rule still finds is cleared by its frame.json exception, and by nothing else", () => {
  const bare = JSON.parse(JSON.stringify(frame)); bare.layout.exceptions = [];
  for (const e of frame.layout.exceptions.filter((x) => x.by === "owner" && !x.unless)) {   // a conditional one (when / unless: the 14:38 window edge rule) has a ruled fault card, below   // UI/UX's exceptions (R5 Q6) have no owner card: layout-check proves each is used
    const c = by("fine").find((q) => q.clear.some((x) => x.node === e.node && x.rule === e.rule && (e.other == null || [e.other].flat().includes(x.other))) && q.state.startsWith(e.screen + "/"));
    assert.ok(c, `${e.screen} ${e.rule} ${e.node}: a fine card of the owner's`);
    const [screen, ...rest] = c.state.split("/"), rec = J(fixtureOf(c.state)), { spec } = specFor(rec), run = (f) => findings(rec.log, spec, f, rec.screen, rec.state, { facts: rec.facts ?? {} });
    const strip = (n) => String(n).replace(/#\d+$/, ""), ex = (f) => f.rule === e.rule && ((f.node === e.node && (e.other == null || [e.other].flat().includes(f.other))) || (f.rule === "L3" && f.part === "a" && e.other != null && [e.other].flat().includes(strip(f.node)) && strip(f.other) === e.node));   // L3a is a pair: either way round
    assert.ok(run(bare).some(ex), `${c.card}: without its exception the finding is made`); assert.ok(!run(frame).some(ex), `${c.card}: with it, it is not`);
  }
});

test("the owner's conditional exception (the window edge rule, 2026-10-29 14:38): on the ruled card's room-view frame it clears L10a, while L10c finds nothing there; a frame with an L10c finding keeps its L10a", () => {
  const e = frame.layout.exceptions.find((x) => x.by === "owner" && x.unless); assert.ok(e, "the exception"); assert.deepEqual([e.screen, e.rule, e.node, e.other, e.when, e.unless], ["vivarium", "L10", "window", "its picture", { view: "room" }, { rule: "L10", part: "c" }]);
  const c = owner.find((q) => q.card === "vivarium-L10-1"), rec = J(fixtureOf(c.state)), { spec } = specFor(rec), bare = JSON.parse(JSON.stringify(frame)); bare.layout.exceptions = bare.layout.exceptions.filter((x) => x !== e && !(x.unless));
  const run = (f, facts = rec.facts ?? {}) => findings(rec.log, spec, f, rec.screen, rec.state, { facts }), a = (f) => f.rule === "L10" && f.part === "a" && f.node === "window";
  assert.equal(rec.facts?.view, "room", "the frame carries the room view's fact");
  if (run(bare).some(a)) assert.ok(!run(frame).some(a), "cleared with it");
  assert.ok(!run(frame).some((f) => f.rule === "L10" && f.part === "c"), "L10c finds nothing on the ruled frame");
  for (const f of readdirSync(BROKEN).filter((x) => x.endsWith(".json"))) { const r2 = J(path.join(BROKEN, f)), s2 = specFor(r2).spec, run2 = (fr) => findings(r2.log, s2, fr, r2.screen, r2.state, { facts: r2.facts ?? {} });
    if (run2(bare).some(a)) assert.ok(run2(frame).some(a), `${f}: L10c finds a cut, so the exception does not clear its L10a`); }
});

// R4b (UI/UX, the R4b layout read Overlaps): the focus set is drawn above the walkers (vivarium.json regions.resident.order, home.json regions.resident.order): a walker may pass in front of the focused one by depth and is drawn under it, and walkers do not avoid it.
// In every vivarium and home log (the fixtures, frozen or not), every name tag comes after every resident node, and after the first ring node only the focused resident's own nodes (its picture or dither, its lamp) are resident nodes: a walker drawn over the ring or the tag is the fault.
test("the focus set is drawn after every other resident: ring, then the focused picture, then the name tag (resident.order)", () => {
  let n = 0;
  for (const screen of ["vivarium", "home"]) for (const dir of [path.join(here, "layout-cases", screen), path.join(here, "layout-cases", screen, "frozen")]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const nodes = J(path.join(dir, f)).log.nodes, reg = (x) => x[3], idx = (name) => nodes.map((x, i) => (reg(x) === name ? i : -1)).filter((i) => i >= 0);
      const residents = nodes.map((x, i) => (/^resident(\.lamp)?$/.test(reg(x)) ? i : -1)).filter((i) => i >= 0), tags = idx("nameTag"), rings = idx("focus"), first = rings.length ? rings[0] : -1;
      for (const t of tags) assert.ok(residents.every((r) => r < t), `${screen}/${f}: a name tag is drawn before a resident node`);
      if (first >= 0) assert.ok(residents.filter((r) => r > first).length <= 3, `${screen}/${f}: more than the focused resident's own nodes (${residents.filter((r) => r > first).length}) are drawn after the ring`);
      n++;
    }
  }
  assert.ok(n >= 3, n + " logs read");
});

test("the text fit: no fixture log (the frozen ones too) has a text whose ink lies outside the plate it is drawn on", () => {
  let n = 0;
  for (const screen of readdirSync(path.join(here, "layout-cases"))) for (const dir of [path.join(here, "layout-cases", screen), path.join(here, "layout-cases", screen, "frozen")]) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) { const o = overruns(J(path.join(dir, f)).log); n++; assert.deepEqual(o.map((x) => `${x.node} ${x.measured} px past the ${x.side} of ${x.container.id}`), [], `${screen}/${f}`); }
  }
  assert.ok(n >= 50, n + " logs read");
});
