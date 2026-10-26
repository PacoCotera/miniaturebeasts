// The layout check's rules on planted logs (ui/specs/layout.mjs): one log that makes each rule speak and one that keeps it quiet, the component model's parts (the snapshot's source nodes, a strip,
// grounds, a plate, one region's boxes as one component), the exceptions (one in use drops its finding; one unused is named) and the enforcement (a finding of an enforced rule fails).
// Every threshold is frame.json's own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findings, components, containers, slotFindings, group, unusedExceptions, enforcedFinding, malformed, excepted, RULES } from "../specs/layout.mjs";

const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8"));
const fnv = (s) => { let h = 2166136261; for (const ch of new TextEncoder().encode(String(s))) { h ^= ch; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
let seq = 0;
// a node: [id, kind, layer, region, x, y, w, h, flags, ink, run, solid] (kind 1 rect, 2 text, 3 sprite, 4 nine-slice, 6 composed); the solid box defaults to the rect
const node = (region, kind, rect, { flags = 0, solid = rect, ink = rect, id = fnv(region + "#" + seq++) } = {}) => [id, kind, kind === 2 ? 3 : 2, region, ...rect, flags, ...ink, 0, ...solid];
const box = (region, rect, o) => node(region, 3, rect, o), text = (region, rect) => node(region, 2, rect, { solid: [rect[0], rect[1] + 4, rect[2], 12] });
const FIELD = { layout: { stage: "field", opening: [0, 40, 1024, 522] }, regions: {} };
const spec = (extra = {}, regions = {}) => ({ ...FIELD, layout: { ...FIELD.layout, ...extra }, regions });
const run = (nodes, s = FIELD, more = {}, fs = frame) => findings({ nodes, type: [], ...more }, s, fs, "planted", "state", more.extra ?? {});
const has = (list, rule, part, pred = () => true) => list.some((f) => f.rule === rule && (part == null || f.part === part) && pred(f));
// a full field: the content at the field's margins (16 left and right, 8 to the bars), two panes 16 apart
const FULL = () => [box("left", [16, 48, 496, 506]), box("right", [528, 48, 480, 506])];

test("thresholds: every rule's numbers are frame.json's, each { value, from }; the data are well formed", () => {
  assert.deepEqual(malformed(FIELD, frame), []);
  for (const k of ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7a", "L7b", "L8", "L9", "L10", "L11"]) assert.ok(frame.layout.thresholds[k]?.from, k);
  assert.deepEqual(frame.layout.exceptions, []); assert.deepEqual(frame.layout.enforced, {});
  assert.ok(malformed({ layout: { stage: "stage", opening: [0, 0, 1, 1] } }, frame).some((m) => /stage/.test(m)), "an unknown stage is malformed");
  assert.ok(malformed({ layout: { stage: "field" } }, frame).some((m) => /opening/.test(m)), "a stage with no opening is malformed");
  assert.ok(malformed({ layout: { stage: "field", opening: [0, 40, 1024, 522], painted: [{ id: "gauge" }] } }, frame).some((m) => /painted/.test(m)), "a painted prop needs its rect and fills");
  assert.ok(malformed({}, frame).length, "a screen with no layout block is malformed");
  const thin = JSON.parse(JSON.stringify(frame)); delete thin.layout.thresholds.L6; assert.ok(malformed(FIELD, thin).some((m) => /L6/.test(m)), "a missing threshold is malformed");
  const bad = JSON.parse(JSON.stringify(frame)); bad.layout.exceptions = [{ screen: "pods", rule: "L1", node: "stamp", reason: "", by: "builder", date: "" }]; assert.ok(malformed(FIELD, bad).some((m) => /exceptions/.test(m)), "an exception needs a reason, a reviewer and a date");
  assert.deepEqual(findings({ nodes: [box("x", [0, 0, 10, 10])] }, { layout: { stage: "exempt" } }, frame, "idle", "s"), [], "an exempt screen is not measured");
  assert.equal(RULES.length, 12);
});

test("L0: composed content of 20 % of its container with no inner boxes is not measurable; with its source nodes it is measured", () => {
  const pic = box("panelSnapshot", [100, 100, 600, 400], { flags: 32 });
  assert.ok(has(run([...FULL(), pic]), "L0"), "a snapshot with no source nodes");
  const snapshot = { region: "panelSnapshot", from: [0, 0, 600, 400], at: [100, 100], nodes: [box("chamber", [40, 40, 200, 200])] };
  const f = run([...FULL(), pic], FIELD, { snapshot });
  assert.ok(!has(f, "L0"), "the snapshot's source nodes are its inner boxes");
  assert.ok(has(f, "L1", null, (x) => x.container.id === "panelSnapshot" && x.node === "snapshot chamber" && x.other === "right" && x.measured === 360), "a source node is measured where the snapshot shows it, inside the snapshot's window");
  const sheet = box("sheet", [16, 40, 664, 522]), facts = { "regions.sheet.plates": [{ id: "chapter.coat", rect: [0, 10, 156, 70] }] };
  const S = spec({ facts: [{ region: "sheet", path: "regions.sheet.plates" }] });
  assert.ok(has(run([sheet], S), "L0"), "a generated sheet with no facts is not measurable");
  assert.ok(!has(run([sheet], S, { extra: { facts } }), "L0"), "its layout facts are its inner boxes");
});

test("L1: the outermost component sits at the margin on each side, or a block is centred; under a strip, 16 below it", () => {
  assert.ok(!has(run(FULL()), "L1"), "at the field's margins");
  const f = run([box("a", [40, 48, 300, 200]), box("b", [600, 48, 408, 506])]);
  assert.ok(has(f, "L1", null, (x) => x.other === "left" && x.measured === 40 && x.required === 16 && x.what === "loose"), "40 from the left");
  assert.ok(!has(run([box("grid", [112, 140, 800, 322])]), "L1"), "a block centred, off the margin on both axes with equal slack");
  assert.ok(has(run([box("a", [16, 48, 992, 504])]), "L1", null, (x) => x.other === "bottom" && x.measured === 10), "8 above, 10 below: the bottom is loose, not a centred block");
  const bezel = { layout: { stage: "bezel", opening: [64, 58, 890, 494] }, regions: {} }, well = box("rail.well", [224, 40, 576, 48]);
  assert.ok(!has(findings({ nodes: [well, box("a", [88, 104, 842, 424])] }, bezel, frame, "s", "s"), "L1"), "16 under the strip's lower edge, 24 elsewhere");
  assert.ok(has(findings({ nodes: [well, box("a", [88, 124, 842, 404])] }, bezel, frame, "s", "s"), "L1", null, (x) => x.other.startsWith("top") && x.measured === 36 && x.required === 16), "36 under the strip");
});

test("L2: a box 2 px or less from its container's edge, or across it, where a margin is required; not a declared bleed", () => {
  const nodes = [box("window", [0, 48, 1024, 300]), box("b", [16, 360, 992, 194])];
  assert.ok(has(run(nodes), "L2", null, (x) => x.node === "window" && x.other === "left" && x.measured === 0), "on the left edge");
  assert.ok(!has(run(nodes, spec({ bleed: ["window"] })), "L2"), "a bleed");
  assert.ok(!has(run(FULL()), "L2"), "at the margins");
  assert.ok(has(run([box("a", [16, 38, 992, 516])]), "L2", null, (x) => x.other === "top" && x.measured === -2 && x.what === "across the edge"), "across the top edge");
});

test("L3: gutters between neighbours: under G is crowding; unequal along a row unless a declared split", () => {
  const row = (g1, g2) => [box("a", [16, 48, 200, 506]), box("b", [216 + g1, 48, 200, 506]), box("c", [416 + g1 + g2, 48, 1008 - 416 - g1 - g2, 506])];
  assert.ok(has(run(row(10, 10)), "L3", "a", (x) => x.node === "a" && x.other === "b" && x.measured === 10 && x.required === 16), "10 between a and b");
  assert.ok(!has(run(row(16, 16)), "L3"), "16 and 16");
  assert.ok(has(run(row(16, 32)), "L3", "b", (x) => x.measured === 32 && x.required === 16), "16 then 32 in one row");
  assert.ok(!has(run(row(16, 32), spec({ split: [{ between: ["b", "c"], gutter: 32, reason: "two pairs" }] })), "L3"), "a declared split of 2 x G");
});

test("L4: sibling boxes that overlap (neither enclosing the other), the focus ring with them; a painted prop and text near it", () => {
  assert.ok(has(run([...FULL(), box("x", [480, 200, 100, 100])]), "L4", null, (x) => x.other === "x" || x.node === "x"), "a box across two panes");
  assert.ok(!has(run(FULL()), "L4"), "apart");
  assert.ok(!has(run([box("pane", [16, 48, 992, 506]), box("in", [100, 100, 100, 100]), box("in2", [300, 100, 100, 100])]), "L4"), "enclosed by its pane");
  const ring = node("focus", 6, [90, 90, 120, 60], { flags: 1 }), f = run([box("p", [16, 48, 400, 506]), box("a", [432, 48, 200, 506]), ring]);
  assert.ok(has(f, "L4", null, (x) => x.other === "focus ring" || x.node === "focus ring") === false, "the ring inside its pane overlaps nothing");
  assert.ok(has(run([box("p", [16, 48, 400, 506]), box("a", [432, 48, 576, 506]), node("focus", 6, [400, 100, 50, 50], { flags: 1 })]), "L4", null, (x) => x.other === "focus ring"), "a ring across two siblings counts");
  const S = spec({ painted: [{ id: "gauge", rect: [718, 100, 82, 62], fills: false, picture: "bench" }] });
  assert.ok(has(run([...FULL(), text("origin", [700, 120, 60, 20])], S), "L4", null, (x) => x.other === "painted gauge"), "text over the gauge");
  assert.ok(has(run([...FULL(), text("origin", [600, 120, 108, 20])], S), "L4", null, (x) => x.other === "painted gauge" && x.what === "text near a painted prop"), "text 10 from the gauge");
});

test("L5: near-misses between neighbours and on the container's centre lines; declared columns on their axis", () => {
  const stack = (dx) => [box("a", [16, 48, 300, 200]), box("b", [16 + dx, 264, 300, 290]), box("c", [340, 48, 668, 506])];
  assert.ok(has(run(stack(3)), "L5", "b", (x) => /left edges/.test(x.what) && x.measured === 3), "left edges 3 apart");
  assert.ok(!has(run(stack(0)), "L5", "b", (x) => /left edges/.test(x.what)), "on one edge");
  assert.ok(!has(run(stack(20)), "L5", "b", (x) => /left edges/.test(x.what)), "20 apart is not a near-miss");
  assert.ok(has(run([box("pic", [300, 280, 420, 40]), ...FULL().map((n) => box(n[3], [n[4], n[5], n[6], 100]))]), "L5", "b", (x) => /container's/.test(x.what)), "a box 1 to 6 px off its container's centre line");
  const S = spec({ columns: [{ id: "centre", regions: ["c"], axis: 512, align: "centre" }] });
  assert.ok(has(run([box("c", [312, 48, 416, 506])], S), "L5", "a", (x) => x.measured === 8), "8 off the column's axis");
  assert.ok(!has(run([box("c", [304, 48, 416, 506])], S), "L5", "a"), "on the column's axis");
});

test("L6: the largest empty rectangle, as a share of the container, both sides at least 4 x G", () => {
  const f = run([box("a", [16, 48, 300, 506])]);
  assert.ok(has(f, "L6", null, (x) => x.measured > 0.6 && x.boxes[0].role === "empty"), "the right two thirds empty");
  assert.ok(!has(run(FULL()), "L6"), "full");
  const S = spec({ painted: [{ id: "tools", rect: [332, 48, 676, 506], fills: true, picture: "bench" }] });
  assert.ok(!has(run([box("a", [16, 48, 300, 506])], S), "L6"), "a painted prop that fills is content");
});

test("L7: (a) the filled area's centroid off the container's centre; (b) slack above and below, left and right", () => {
  assert.ok(has(run([box("a", [16, 48, 300, 506])]), "L7", "a", (x) => x.dx < -0.1 && x.centroid && x.centre), "content on the left");
  assert.ok(!has(run(FULL()), "L7", "a"), "balanced");
  assert.ok(has(run([box("a", [16, 140, 992, 414])]), "L7", "b", (x) => x.other === "above / below" && x.pair[0] === 100 && x.pair[1] === 8), "100 above, 8 below");
  assert.ok(!has(run(FULL()), "L7", "b"), "8 and 8, 16 and 16");
  const S = spec({ columns: [{ id: "left", regions: ["a"], axis: 168, align: "fill" }], topLine: 104, floorLine: 528 });
  assert.ok(has(run([box("a", [92, 120, 152, 408]), box("b", [276, 48, 732, 506])], S), "L7", "b", (x) => x.other === "the top line" && x.measured === 16), "a fill column 16 under the top line");
});

test("L8: (a) a caption more than 8 from what it labels; (b) a component every neighbour is far from floats", () => {
  const S = spec({}, { caption: { labels: "thing" } });
  assert.ok(has(run([box("thing", [16, 200, 300, 300]), text("caption", [16, 120, 100, 20]), box("rest", [332, 48, 676, 506])], S), "L8", "a", (x) => x.node === "caption" && x.other === "thing"), "the caption 60 above its thing");
  assert.ok(!has(run([box("thing", [16, 200, 300, 300]), text("caption", [16, 176, 100, 20]), box("rest", [332, 48, 676, 506])], S), "L8", "a"), "the caption 8 above its thing (cap to baseline)");
  assert.ok(has(run([box("a", [16, 48, 100, 100]), box("b", [16, 164, 100, 100]), box("far", [700, 400, 100, 100])]), "L8", "b", (x) => x.node === "far"), "far floats");
  assert.ok(!has(run(FULL()), "L8", "b"), "neighbours 16 apart");
});

test("L9: a slot keeps one box in every golden state of its screen", () => {
  const S = spec({ slots: ["slot"] }), rec = (state, r) => ({ state, log: { nodes: [box("slot", r), box("rest", [400, 48, 608, 506])] }, spec: S, frameSpec: frame, extra: {} });
  assert.ok(slotFindings([rec("a", [16, 48, 300, 200]), rec("b", [16, 60, 300, 200])], "s").some((f) => f.rule === "L9" && f.states.includes("b")), "it moves in state b");
  assert.deepEqual(slotFindings([rec("a", [16, 48, 300, 200]), rec("b", [16, 48, 300, 200])], "s"), [], "it stays");
});

test("L10: (a) a window that cuts its picture's solid ink; (b) a subject's solid ink on its picture's edge", () => {
  assert.ok(has(run([...FULL(), box("door", [600, 100, 40, 300], { flags: 24 })]), "L10", "a", (x) => x.node === "door"), "flag 16");
  assert.ok(!has(run([...FULL(), box("door", [600, 100, 40, 300], { flags: 8 })]), "L10"), "a window that cuts no solid ink");
  const F = JSON.parse(JSON.stringify(frame)); F.layout.thresholds.L10.value.subjects = ["specimen"];
  const S = spec({}, { crest: { component: "specimen" } });
  assert.ok(has(run([...FULL(), box("crest", [600, 100, 100, 100], { solid: [610, 100, 80, 90] })], S, {}, F), "L10", "b", (x) => x.other === "top" && x.measured === 0), "the crest's ink on its top edge");
  assert.ok(!has(run([...FULL(), box("crest", [600, 100, 100, 100], { solid: [610, 104, 80, 90] })], S, {}, F), "L10"), "headroom");
});

test("L11: a lone mark has no text within 8 px on its rows and no label", () => {
  assert.ok(has(run([...FULL(), box("glint", [300, 300, 12, 12])]), "L11", null, (x) => x.node === "glint"), "a glint alone");
  assert.ok(!has(run([...FULL(), box("icon", [300, 300, 12, 12]), text("word", [318, 296, 60, 20])]), "L11"), "a word 6 px after it");
});

test("the component model: the bars, rules and covered nodes are not measured; layers of one rect and one region's near boxes are one component; a plate; grounds", () => {
  const ks = components({ nodes: [box("top", [0, 0, 1024, 40]), node("pane", 1, [16, 48, 992, 1]), box("a", [16, 48, 200, 200]), box("a", [16, 256, 200, 100]), box("a", [16, 400, 200, 100]), box("b", [300, 48, 100, 100]), box("b", [300, 48, 100, 100], { solid: [300, 60, 100, 88] }), box("hidden", [600, 100, 50, 50]), node("cover", 1, [580, 80, 100, 100])] }, FIELD, frame);
  assert.deepEqual(ks.map((k) => k.name).sort(), ["a", "a#2", "b", "cover"], "a's first two boxes 8 apart are one, its third 44 below another; b's layers one; the bar, the rule and the covered node left out");
  assert.deepEqual(ks.find((k) => k.name === "a").box, [16, 48, 200, 308]);
  const plate = components({ nodes: [box("name", [216, 456, 80, 24], { solid: [216, 456, 2, 2] }), text("name", [231, 454, 50, 26])] }, FIELD, frame);
  assert.deepEqual(plate[0].box, [216, 456, 80, 24], "a faint plate under its text is measured by its rect");
  const cs = containers({ nodes: [box("stage", [0, 40, 1024, 522]), box("pane", [16, 48, 600, 400]), box("pane", [32, 64, 100, 100]), text("pane", [150, 64, 100, 20]), box("kin", [700, 100, 56, 56]), box("kin", [708, 104, 40, 48])] }, FIELD, frame);
  assert.deepEqual(cs.map((c) => c.id), ["opening", "pane"], "the stage picture is the ground; a pane that holds content is a container, a picture on its own plate is not");
  assert.equal(cs[1].margins.left, frame.layout.thresholds.L1.value.pane);
});

test("exceptions: one in use drops its finding and is named as used; one unused is named; the enforcement fails a rule it lists", () => {
  const nodes = [box("a", [40, 48, 300, 200]), box("b", [600, 48, 408, 506])];
  const F = JSON.parse(JSON.stringify(frame)); F.layout.exceptions = [{ screen: "planted", rule: "L1", node: "a", other: "left", reason: "a test", by: "UI/UX", date: "2026-10-26" }, { screen: "planted", rule: "L3", node: "zz", reason: "never met", by: "owner", date: "2026-10-26" }];
  const f = findings({ nodes }, FIELD, F, "planted", "s");
  assert.ok(!has(f, "L1", null, (x) => x.node === "a" && x.other === "left"), "the excepted finding is dropped");
  assert.deepEqual(f.used, [F.layout.exceptions[0]]);
  assert.deepEqual(unusedExceptions(F, [f]), [F.layout.exceptions[1]], "the unused exception is named (the run fails on it)");
  assert.ok(has(findings({ nodes }, FIELD, F, "other", "s"), "L1", null, (x) => x.node === "a"), "an exception covers its screen only");
  const E = JSON.parse(JSON.stringify(frame)); E.layout.enforced = { planted: ["L1"], all: "all" };
  const l1 = f.find((x) => x.rule === "L1") ?? findings({ nodes }, FIELD, frame, "planted", "s").find((x) => x.rule === "L1"), l6 = findings({ nodes }, FIELD, frame, "planted", "s").find((x) => x.rule === "L6");
  assert.equal(enforcedFinding(E, "planted", l1), true); assert.equal(enforcedFinding(E, "planted", l6), false); assert.equal(enforcedFinding(E, "all", l6), true); assert.equal(enforcedFinding(frame, "planted", l1), false, "report mode");
  const g = group([{ state: "s1", findings: [l1] }, { state: "s2", findings: [l1] }]);
  assert.equal(g.length, 1); assert.deepEqual(g[0].states, ["s1", "s2"], "identical findings across states are one");
});

test("containers: only composed content, a declared container or a pane drawn as one (a rect, a nine-slice, a picture painted over its whole rect) holds content", () => {
  const inner = [box("a", [100, 100, 60, 60]), box("b", [200, 100, 60, 60])], ids = (nodes, s = FIELD) => containers({ nodes }, s, frame).map((c) => c.id);
  assert.deepEqual(ids([node("pane", 4, [40, 60, 400, 300]), ...inner]), ["opening", "pane"], "a nine-slice pane");
  assert.deepEqual(ids([node("links", 6, [40, 60, 400, 300]), ...inner]), ["opening"], "a composed line drawing is not a pane");
  assert.deepEqual(ids([box("tile", [40, 60, 400, 300], { ink: [60, 80, 360, 260] }), ...inner]), ["opening"], "a picture with clear margins is not a pane");
  assert.deepEqual(ids([node("links", 6, [40, 60, 400, 300]), ...inner], spec({ containers: [{ id: "links", region: "links", padding: 16, gutter: 8 }] })), ["opening", "links"], "a declared container is one");
});

test("L10a skips a declared bleed; L3a on a bezel stage takes the column gutter across and the row gutter down", () => {
  assert.ok(!has(run([...FULL(), box("window", [600, 100, 40, 300], { flags: 24 })], spec({ bleed: ["window"] })), "L10"), "a bleed window cuts its picture by design");
  const bezel = { layout: { stage: "bezel", opening: [64, 58, 890, 494] }, regions: {} }, f = (nodes) => findings({ nodes }, bezel, frame, "s", "s");
  const col = (gy) => [box("a", [88, 82, 400, 200]), box("b", [88, 282 + gy, 400, 246 - gy]), box("c", [510, 82, 420, 446])];
  assert.ok(!has(f(col(20)), "L3", "a", (x) => x.node === "a" && x.other === "b"), "20 between rows: at least the field's 16");
  assert.ok(has(f(col(10)), "L3", "a", (x) => x.node === "a" && x.other === "b" && x.required === frame.layout.thresholds.L3.value.bezelRows), "10 between rows");
  assert.ok(has(f(col(20)), "L3", "a", (x) => x.node === "a" && x.other === "c" && x.required === 32), "22 between the bezel's columns, 32 required");
});

test("L9 and the exceptions: a slot finding an exception covers is dropped and counted as used", () => {
  const S = spec({ slots: ["slot"] }), rec = (state, r) => ({ state, log: { nodes: [box("slot", r), box("rest", [400, 48, 608, 506])] }, spec: S, frameSpec: frame, extra: {} });
  const F = JSON.parse(JSON.stringify(frame)); F.layout.exceptions = [{ screen: "s", rule: "L9", node: "slot", reason: "a test", by: "UI/UX", date: "2026-10-26" }];
  const kept = excepted(F, "s", slotFindings([rec("a", [16, 48, 300, 200]), rec("b", [16, 60, 300, 200])], "s"));
  assert.deepEqual([...kept], []); assert.deepEqual(kept.used, F.layout.exceptions); assert.deepEqual(unusedExceptions(F, [kept]), []);
});
