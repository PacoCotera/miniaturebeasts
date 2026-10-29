// The layout check's rules on planted logs (ui/specs/layout.mjs): one log that makes each rule speak and one that keeps it quiet, the component model's parts (the snapshot's source nodes, a strip,
// grounds, a plate, one region's boxes as one component), the exceptions (one in use drops its finding; one unused is named) and the enforcement (a finding of an enforced rule fails).
// Every threshold is frame.json's own. The tuning from the owner's review: an alignment per axis, scenes placed by depth, windows that clip, painted fills at every level, one component in its box.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findings, components, containers, slotFindings, overruns, group, unusedExceptions, enforcedFinding, malformed, excepted, RULES } from "../specs/layout.mjs";

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
  { const ex = frame.layout.exceptions, own = ex.filter((e) => e.by === "owner"); assert.ok(own.length >= 6 && own.every((e) => /^Owner, layout review 2026-10-26 \(/.test(e.reason) && e.date === "2026-10-26"), "the owner's exceptions, with the owner's words (none dropped)"); assert.ok(ex.every((e) => e.by === "owner" || (e.by === "UI/UX" && /^UI\/UX, /.test(e.reason) && /^2026-\d\d-\d\d$/.test(e.date) && e.date >= "2026-10-27")), "every other exception is UI/UX's (its layout spec), with its result named and dated"); } assert.deepEqual(frame.layout.enforced, {});
  assert.ok(malformed({ layout: { stage: "stage", opening: [0, 0, 1, 1] } }, frame).some((m) => /stage/.test(m)), "an unknown stage is malformed");
  assert.ok(malformed({ layout: { stage: "field" } }, frame).some((m) => /opening/.test(m)), "a stage with no opening is malformed");
  assert.ok(malformed({ layout: { stage: "field", opening: [0, 40, 1024, 522], painted: [{ id: "gauge" }] } }, frame).some((m) => /painted/.test(m)), "a painted prop needs its rect and fills");
  assert.ok(malformed({ layout: { stage: "field", opening: [0, 40, 1024, 522], painted: [{ id: "bay", region: "bay", fills: true }] } }, frame).length === 0, "a painted picture may name a region instead of a rect");
  const bad2 = (extra) => malformed({ layout: { stage: "field", opening: [0, 40, 1024, 522], ...extra } }, frame);
  assert.ok(bad2({ align: "middle" }).some((m) => /align/.test(m)), "an unknown alignment is malformed"); assert.ok(bad2({ containers: [{ region: "a", align: { x: "top" } }] }).some((m) => /align/.test(m)), "an alignment on the wrong axis is malformed");
  assert.deepEqual(bad2({ align: { x: "left", y: "middle" }, containers: [{ region: "a", padding: { left: 4, top: 4, right: 4, bottom: 0 }, align: "centre" }] }), [], "per-axis alignment and per-side padding are well formed");
  assert.ok(bad2({ containers: [{ region: "a", padding: { left: "wide" } }] }).some((m) => /padding/.test(m)), "a padding is a number or per side numbers");
  assert.ok(bad2({ clips: "window" }).some((m) => /clips/.test(m)) && bad2({ movers: [1] }).some((m) => /movers/.test(m)) && bad2({ props: {} }).some((m) => /props/.test(m)), "clips, movers and props are lists of regions");
  assert.ok(bad2({ anchors: [{ region: "away" }] }).some((m) => /anchors/.test(m)) && bad2({ anchors: [{ x: "right" }] }).some((m) => /anchors/.test(m)) && bad2({ anchors: [{ region: "away", x: "centre" }] }).some((m) => /anchors/.test(m)), "an anchor has a region and a side");
  assert.deepEqual(bad2({ anchors: [{ region: "away", x: "right", y: "bottom", inset: [8, 6] }] }), [], "an anchor with its insets is well formed");
  assert.ok(malformed({}, frame).length, "a screen with no layout block is malformed");
  const flat = JSON.parse(JSON.stringify(frame)); delete flat.layout.thresholds.L4.value.perch; assert.ok(malformed(FIELD, flat).some((m) => /perch/.test(m)), "L4 needs its depth and perch"); delete flat.layout.thresholds.L3.value.bezelItems; assert.ok(malformed(FIELD, flat).some((m) => /bezelItems/.test(m)), "L3 needs the item gutter of a bezel");
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
  assert.ok(has(f, "L7", "b", (x) => x.container.id === "panelSnapshot" && x.node === "panelSnapshot" && x.other === "left / right" && x.pair[0] === 40 && x.pair[1] === 360), "a source node is measured where the snapshot shows it, inside the snapshot's window: a centred block, 40 left and 360 right");
  assert.ok(!has(f, "L1", null, (x) => x.container.id === "panelSnapshot" && x.other === "right"), "the right slack of a centred block is L7b's, not a loose margin");
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

test("L6: the largest empty rectangle, as a share of the container, both sides at least 4 x G; painted fills count at every level; one component in its box is not measured", () => {
  const two = () => [box("a", [16, 48, 300, 200]), box("b", [16, 264, 300, 290])], f = run(two());
  assert.ok(has(f, "L6", null, (x) => x.measured > 0.6 && x.boxes[0].role === "empty" && /^2 components/.test(x.counted)), "the right two thirds empty, the count of what was weighed named");
  assert.ok(!has(run(FULL()), "L6"), "full");
  const S = spec({ painted: [{ id: "tools", rect: [332, 48, 676, 506], fills: true, picture: "bench" }] });
  assert.ok(!has(run(two(), S), "L6"), "a painted prop that fills is content");
  assert.ok(has(run(two(), spec({ painted: [{ id: "tools", rect: [332, 48, 676, 506], fills: false }] })), "L6"), "a painted prop that does not fill is not");
  // a pane with its own picture: painted fills count in a pane too, by rect or by the region that is the pane's own picture
  const pane = () => [box("win", [100, 100, 600, 400]), box("a", [110, 110, 60, 60]), box("b", [630, 430, 60, 60])], inPane = (x) => x.container.id === "win";
  assert.ok(has(run(pane()), "L6", null, inPane), "a pane with two small boxes in its corners is mostly empty");
  assert.ok(!has(run(pane(), spec({ painted: [{ id: "paint", region: "win", fills: true }] })), "L6", null, inPane), "the pane's own picture, painted to fill, is its content");
  assert.ok(!has(run(pane(), spec({ painted: [{ id: "paint", rect: [100, 100, 600, 400], fills: true }] })), "L6", null, inPane), "a painted rect inside the pane counts there too");
  assert.ok(has(run(pane(), spec({ painted: [{ id: "paint", region: "elsewhere", fills: true }] })), "L6", null, inPane), "a region that is no pane's own picture fills nothing");
  const one = [box("win", [100, 100, 600, 400]), box("a", [116, 116, 100, 60])];
  assert.ok(has(run(pane()), "L6", null, inPane) && !has(run(one), "L6", null, inPane) && !has(run(one), "L7", "a", inPane), "one component in its box: its place is L1's and L7b's, not its emptiness or its weight");
  assert.ok(has(run(one, spec({ painted: [{ id: "paint", rect: [100, 100, 600, 100], fills: true }] })), "L6", null, inPane), "with a painted fill in it, the pane is measured again");
});

test("L7: (a) the filled area's centroid off the container's centre, an axis aligned to a side weighing 0; (b) slack above and below, left and right, on centred axes only", () => {
  const left = () => [box("a", [16, 48, 300, 200]), box("b", [16, 264, 300, 290])];
  assert.ok(has(run(left()), "L7", "a", (x) => x.dx < -0.1 && x.centroid && x.centre && x.boxes.length === 2 && x.boxes.every((b) => b.role === "weighed") && /^2 components/.test(x.counted)), "content on the left, the boxes it weighed named");
  assert.ok(!has(run(left(), spec({ align: "left" })), "L7", "a"), "an axis aligned left has its weight on its side by design");
  assert.ok(has(run(left(), spec({ align: "right" })), "L1", null, (x) => x.other === "right" && x.align === "right" && x.what === "loose"), "aligned right, content at the left misses its own side: L1's");
  assert.ok(!has(run(FULL()), "L7", "a"), "balanced");
  const lower = [box("a", [16, 100, 992, 362])];
  assert.ok(has(run(lower), "L7", "b", (x) => x.other === "above / below" && x.pair[0] === 60 && x.pair[1] === 100 && /^A centred block: 60 above, 100 below/.test(x.what) && x.assumed === "Aligned: centre (inferred)"), "60 above, 100 below: a centred block");
  assert.ok(!has(run([box("a", [16, 140, 992, 414])]), "L7", "b"), "100 above, 8 below is no centred block: the bottom is at the margin (L1's: the top is loose)");
  assert.ok(has(run([box("a", [16, 140, 992, 414])]), "L1", null, (x) => x.other === "top" && x.measured === 100 && x.align === "fill"), "the top slack is L1's, once");
  assert.ok(!has(run(lower, spec({ align: { y: "top" } })), "L7", "b"), "an axis aligned to the top wants no equal sides");
  assert.ok(has(run([box("a", [40, 48, 500, 506])]), "L7", "b", (x) => x.other === "left / right" && x.pair[0] === 40 && x.pair[1] === 484), "a block off the margin on both sides is centred: 40 left, 484 right");
  assert.ok(!has(run([box("a", [40, 48, 500, 506])], spec({ align: "fill" })), "L7", "b"), "declared fill: the equal-sides question is not asked, L1 reports the loose side");
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

// L10c (the owner's rule of 2026-10-29 14:38 and 15:24, the collection v2 design §4): on a room-view frame (the fact view "room"), a window edge that cuts a resident's ink, the bed, a piece drawn in the view,
// a join or a key prop is a finding; a key prop may cross its `leaves` side only when its box reaches the painting's edge there; L10c takes no exception; the owner's L10a on the window holds only on a
// room-view frame and only when L10c finds nothing there.
const ROOM = { layout: { stage: "field", opening: [0, 40, 1024, 522], given: ["view", "regions.window.edge"] }, regions: { window: { rect: [0, 88, 688, 472] } } };
const EDGE = (o = {}) => ({ crop: [176, 96], painting: [1024, 568], keep: [{ id: "reeds-boulder", box: [208, 267, 242, 138] }], joins: [{ id: "reeds-ramp-1", rect: [600, 360, 120, 80] }], ...o });
const roomRun = (nodes, edge = EDGE(), view = "room", F = frame) => findings({ nodes, type: [] }, ROOM, F, "vivarium", "s", { facts: { view, "regions.window.edge": edge } });
const WINDOW = () => box("window", [0, 88, 688, 472], { flags: 24 });
test("L10c: a room window's edge cuts a kept form: a resident's ink, the bed, a piece, a join or a key prop; a prop that runs off the painting may cross on its own side; none on another view", () => {
  const c = (fs) => fs.filter((f) => f.rule === "L10" && f.part === "c");
  assert.deepEqual(c(roomRun([WINDOW(), box("resident", [300, 300, 96, 99], { solid: [310, 320, 70, 76] })])), [], "a clean frame: nothing");
  const mibi = c(roomRun([WINDOW(), box("resident", [-20, 300, 96, 99], { solid: [-10, 320, 70, 76] })]));
  assert.equal(mibi.length, 1); assert.deepEqual([mibi[0].node, mibi[0].other, mibi[0].measured, mibi[0].required], ["resident", "left", 10, 0], "a mibi half out of the left edge, 10 px beyond it");
  assert.equal(c(roomRun([WINDOW(), box("room", [650, 300, 50, 34])]))[0]?.other, "right", "a piece drawn across the right edge");
  assert.equal(c(roomRun([WINDOW(), box("bed", [600, 488, 192, 56])]))[0]?.node, "bed", "the bed");
  const bould = c(roomRun([WINDOW()], EDGE({ crop: [230, 96] })));
  assert.deepEqual(bould.map((f) => [f.node, f.other, f.measured]), [["reeds-boulder", "left", 22]], "Reeds at crop [230, 96] cuts the boulder (painting x 208 against the window's 230)");
  assert.deepEqual(c(roomRun([WINDOW()], EDGE({ crop: [0, 96], keep: [{ id: "roots-tree", box: [22, 0, 606, 374], leaves: "top" }], joins: [] }))), [], "a tree that runs off the painting's top crosses the window's top on its own side (15:24)");
  assert.equal(c(roomRun([WINDOW()], EDGE({ crop: [0, 96], keep: [{ id: "roots-tree", box: [22, 4, 606, 374], leaves: "top" }], joins: [] }))).length, 1, "one that stops short of the painting's top is cut");
  assert.equal(c(roomRun([WINDOW()], EDGE({ crop: [0, 96], keep: [{ id: "tall", box: [600, 0, 100, 300], leaves: "top" }], joins: [] }))).find((f) => f.other === "right")?.node, "tall", "its other sides keep the rule");
  assert.equal(c(roomRun([WINDOW()], EDGE({ joins: [{ id: "ramp", rect: [150, 296, 190, 130] }] })))[0]?.node, "ramp", "a join across the left edge");
  assert.deepEqual(c(roomRun([WINDOW(), box("resident", [-20, 300, 96, 99], { solid: [-10, 320, 70, 76] })], EDGE(), "house")), [], "the house view has no painting: no L10c");
  assert.deepEqual(c(findings({ nodes: [WINDOW(), box("resident", [-20, 300, 96, 99], { solid: [-10, 320, 70, 76] })], type: [] }, { ...ROOM, layout: { ...ROOM.layout, given: [] } }, frame, "vivarium", "s", { facts: { view: "room" } })), [], "a spec that gives no view: none (the frozen logs)");
  const F = JSON.parse(JSON.stringify(frame)); F.layout.exceptions = [{ screen: "vivarium", rule: "L10", part: "c", node: "resident", reason: "a test", by: "owner", date: "2026-10-29" }];
  assert.ok(malformed(ROOM, F, "room").some((m) => /L10c has no exception/.test(m)), "an exception for L10c is malformed");
  assert.equal(c(roomRun([WINDOW(), box("resident", [-20, 300, 96, 99], { solid: [-10, 320, 70, 76] })], EDGE(), "room", F)).length, 1, "and clears nothing");
});
test("L10c and the owner's L10a: the window's cut picture is cleared on a room-view frame only when L10c finds nothing on it", () => {
  const F = JSON.parse(JSON.stringify(frame)); F.layout.exceptions = [{ screen: "vivarium", rule: "L10", node: "window", other: "its picture", when: { view: "room" }, unless: { rule: "L10", part: "c" }, reason: "the owner's rule, a test", by: "owner", date: "2026-10-29" }];
  const a = (fs) => fs.some((f) => f.rule === "L10" && f.part === "a" && f.node === "window");
  const clean = roomRun([WINDOW()], EDGE(), "room", F);
  assert.ok(!a(clean), "a clean room view: the owner's exception clears L10a"); assert.equal(clean.used.length, 1, "and is used");
  assert.ok(a(roomRun([WINDOW(), box("resident", [-20, 300, 96, 99], { solid: [-10, 320, 70, 76] })], EDGE(), "room", F)), "a frame where L10c finds a cut: L10a stands");
  assert.ok(a(roomRun([WINDOW()], EDGE(), "house", F)), "another view: the exception does not hold");
  assert.ok(a(findings({ nodes: [WINDOW()], type: [] }, ROOM, F, "vivarium", "s", {})), "a log with no view fact (a frozen one): L10a stands");
  assert.ok(a(roomRun([WINDOW()], EDGE(), "room")), "without the exception: L10a");
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

// ---- the tuning from the owner's review (2026-10-26) ----
const pane = (extra = {}) => [box("win", [100, 100, 600, 400]), box("a", [100, 110, 200, 100]), box("b", [300, 110, 200, 100]), ...(extra.more ?? [])];
const bezelSpec = (extra = {}) => ({ layout: { stage: "bezel", opening: [64, 58, 890, 494], ...extra }, regions: {} }), onBezel = (nodes, extra) => findings({ nodes }, bezelSpec(extra), frame, "s", "s");

test("L1: an alignment per axis: fill wants both sides at the margin; left or right the leading side, the trailing side at least the margin; centre both sides at least the margin", () => {
  const at = (x, w) => [box("a", [x, 48, w, 506])], l1 = (f, side) => f.find((x) => x.rule === "L1" && x.other === side);
  assert.equal(l1(run(at(16, 300)), "right")?.what, "loose", "undeclared and at the left margin, the axis is fill: the right side is loose");
  assert.equal(l1(run(at(16, 300)), "right")?.assumed, "Aligned: fill (inferred)", "the finding states the alignment it assumed");
  assert.ok(/left margin and leaves 708 on the right/.test(l1(run(at(16, 300)), "right").says) && /buttons/.test(l1(run(at(16, 300)), "right").says), "and asks the question of a list against buttons");
  assert.ok(!has(run(at(16, 300), spec({ align: "left" })), "L1"), "aligned left: the trailing slack is no finding");
  assert.ok(!has(run(at(708, 300), spec({ align: "right" })), "L1"), "aligned right: the same, mirrored");
  assert.ok(has(run(at(40, 300), spec({ align: "left" })), "L1", null, (x) => x.other === "left" && x.measured === 40 && x.align === "left" && x.assumed === "Aligned: left"), "aligned left: the leading side is off the margin");
  assert.ok(has(run(at(8, 300), spec({ align: "centre" })), "L1", null, (x) => x.other === "left" && x.what === "tight" && x.align === "centre" && x.assumed === "Aligned: centre"), "centred: a tight side is reported");
  assert.ok(!has(run(at(100, 300), spec({ align: "centre" })), "L1"), "centred: both sides at least the margin (equal sides are L7b's)");
  assert.ok(has(run(at(100, 300), spec({ align: "centre" })), "L7", "b", (x) => x.other === "left / right" && x.pair[0] === 100 && x.pair[1] === 624), "which L7b asks: 100 left, 624 right");
  assert.ok(!has(run(at(16, 300), spec({ align: "fill" })), "L7", "b"), "fill: L7b is silent");
  assert.ok(has(run([box("a", [112, 140, 800, 322])], spec({ align: { x: "centre", y: "top" } })), "L1", null, (x) => x.other === "top" && x.measured === 100), "per axis: y aligned to the top, 100 from it");
  assert.ok(!has(run([box("a", [112, 48, 800, 200])], spec({ align: { x: "centre", y: "top" } })), "L1"), "y aligned to the top, at the margin: its bottom slack is no finding");
  assert.ok(!has(run([box("a", [112, 140, 800, 322])]), "L1"), "undeclared and off the margin on both sides of both axes: centred, no margin finding");
  // both opposite sides' dimension lines
  const loose = l1(run(at(16, 300)), "right"); assert.ok(Array.isArray(loose.dim) && Array.isArray(loose.dim2) && loose.opposite === 16, "a margin finding draws its own side and the opposite side");
});

test("L1: the pane's padding per side and its alignment; an anchored component is held at its insets and is out of its container's block", () => {
  const S = spec({ containers: [{ region: "win", padding: { left: 4, top: 8, right: 16, bottom: 16 }, align: { x: "left", y: "fill" } }] });
  assert.deepEqual(containers({ nodes: pane() }, S, frame).find((c) => c.id === "win").margins, { left: 4, top: 8, right: 16, bottom: 16 }, "padding per side");
  assert.equal(containers({ nodes: pane() }, spec({ containers: [{ region: "win", padding: 12 }] }), frame).find((c) => c.id === "win").margins.bottom, 12, "or one number");
  assert.ok(has(run(pane(), S), "L1", null, (x) => x.container.id === "win" && x.other === "top" && x.required === 8 && x.measured === 10), "the top margin is the declared 8, not the default 16");
  const A = spec({ anchors: [{ region: "away", x: "right", y: "bottom", inset: [8, 6] }] }), away = (x, y) => [box("a", [16, 48, 600, 506]), box("away", [x, y, 64, 64])];
  assert.ok(!has(run(away(952, 492), A), "L1", null, (x) => x.node === "away"), "pinned at its insets (8 and 6): no finding");
  assert.ok(has(run(away(940, 492), A), "L1", null, (x) => x.node === "away" && x.other === "right (anchored)" && x.measured === 20 && x.required === 8), "12 off its right inset");
  assert.ok(has(run(away(952, 480), A), "L1", null, (x) => x.node === "away" && x.other === "bottom (anchored)" && x.measured === 18 && x.required === 6), "and off its bottom inset");
  assert.ok(!has(run(away(952, 492), A), "L7", "b") && !has(run(away(952, 492), A), "L8", "b", (x) => x.node === "away"), "an anchor is out of the block and does not float");
  assert.ok(has(run(away(952, 492)), "L1", null, (x) => x.node === "away" && x.other === "right" && x.measured === 8 && x.required === 16) && has(run(away(952, 492)), "L8", "b", (x) => x.node === "away"), "undeclared, the same box is measured as any component: tight against the margin, and floating");
});

test("L2: creatures are not held to an edge; a window that clips by design is not held to its container's edges", () => {
  const inWin = (x) => x.container.id === "win", touching = [box("win", [100, 100, 600, 400]), box("a", [100, 110, 200, 100]), box("b", [300, 110, 200, 100])];
  assert.ok(has(run(touching), "L2", null, (x) => inWin(x) && x.node === "a" && x.other === "left" && x.measured === 0), "a box on its pane's left edge");
  assert.ok(!has(run(touching, spec({ clips: ["win"] })), "L2", null, inWin), "the pane's picture is a window that clips: no L2 inside it");
  assert.ok(has(run([...FULL(), box("resident", [0, 100, 60, 60])]), "L2", null, (x) => x.node === "resident" && x.other === "left"), "a creature on the edge, undeclared");
  assert.ok(!has(run([...FULL(), box("resident", [0, 100, 60, 60])], spec({ movers: ["resident"] })), "L2"), "placed by depth: it may stand on the edge");
  assert.ok(!has(run([...FULL(), box("tree", [0, 100, 60, 60])], spec({ props: ["tree"] })), "L2"), "a scene prop the same");
});

test("L3: on a bezel the column gutter is between modules, other neighbours take the item gutter; a pair with a bleed member is skipped; unequal gutters compare like with like", () => {
  const modules = (g) => [box("a", [88, 82, 200, 40]), box("b", [288 + g, 82, 200, 40])], items = (g) => [box("i", [88, 200, 30, 30]), box("j", [118 + g, 200, 30, 30])];
  assert.ok(has(onBezel(modules(20)), "L3", "a", (x) => x.node === "a" && x.other === "b" && x.required === 32), "two modules 20 apart: the column gutter 32");
  assert.ok(!has(onBezel(modules(32)), "L3", "a"), "32 apart");
  assert.ok(!has(onBezel(items(20)), "L3", "a"), "two small items 20 apart: the item gutter 16 holds");
  assert.ok(has(onBezel(items(10)), "L3", "a", (x) => x.required === frame.layout.thresholds.L3.value.bezelItems && x.measured === 10), "10 apart: under the item gutter");
  assert.ok(!has(onBezel([box("m", [88, 82, 200, 40]), text("word", [308, 90, 60, 20])]), "L3", "a"), "a module and a word 20 apart: the item gutter 16 holds, not the column's 32");
  const win = [box("window", [0, 48, 1024, 300]), box("strip", [16, 356, 992, 198])];
  assert.ok(has(run(win), "L3", "a", (x) => x.node === "window" && x.other === "strip" && x.measured === 8), "a window 8 above the strip");
  assert.ok(!has(run(win, spec({ bleed: ["window"] })), "L3", "a"), "a bleed window holds no gutter");
  const row = (third) => [box("a", [16, 48, 100, 100]), box("b", [132, 48, 100, 100]), third];
  assert.ok(has(run(row(box("c", [312, 48, 100, 100]))), "L3", "b", (x) => x.measured === 80), "16 then 80 between modules of one row");
  assert.ok(!has(run(row(text("caption", [312, 80, 60, 20]))), "L3", "b"), "a caption at the end of the row is no gutter: unlike things are not compared");
  assert.ok(has(run([box("r", [16, 48, 40, 40]), box("r", [72, 48, 40, 40]), box("r", [192, 48, 40, 40])]), "L3", "b", (x) => x.measured === 80 && x.required === 16), "a run of one kind: 16, 16, 80");
});

test("L4: creatures and scene props are placed by depth: one behind another is the scene's order; two at one depth collide, and a perch (the totem) still fires", () => {
  const S = spec({ movers: ["resident"], props: ["tree"] }), both = (a, b) => [box("resident", a), box("resident", b)], fires = (nodes, s = S) => has(run(nodes, s), "L4", null, (x) => x.node.startsWith("resident") && x.other.startsWith("resident"));
  assert.ok(fires(both([100, 100, 60, 80], [130, 150, 60, 80]), spec()), "undeclared, two overlapping residents are an overlap");
  assert.ok(!fires(both([100, 100, 60, 80], [130, 150, 60, 80])), "declared movers, feet 50 apart: depth, no finding");
  assert.ok(fires(both([100, 100, 60, 80], [130, 100, 60, 80])), "feet on one line: two at one depth collide");
  assert.ok(fires(both([100, 100, 60, 80], [130, 101, 60, 80])), "feet 1 px apart: the same depth");
  assert.ok(fires(both([110, 90, 50, 72], [100, 150, 60, 80])), "a perch: the back one's feet 12 px into the front one's top quarter");
  assert.ok(!fires(both([110, 90, 50, 62], [100, 150, 60, 80])), "feet 2 px into the front one's top: under the 4 px, depth");
  assert.ok(!fires(both([110, 90, 50, 100], [100, 150, 60, 80])), "feet 40 px into the front one: past the top quarter, in front of it");
  assert.ok(!has(run([box("resident", [100, 100, 60, 80]), box("pane", [130, 150, 200, 200])], S), "L4"), "a creature and a pane: the creature is placed by depth");
  assert.ok(!has(run([box("tree", [100, 100, 60, 80]), box("tree", [130, 100, 60, 80])], S), "L4"), "scene props have no collision exception: placed by depth");
  assert.ok(has(run([box("a", [100, 100, 100, 100]), box("b", [150, 150, 100, 100])]), "L4"), "other siblings overlap as before");
  assert.ok(!has(run([...FULL(), text("origin", [700, 120, 60, 20])], spec({ painted: [{ id: "gauge", region: "left", fills: true }] })), "L4", null, (x) => /painted/.test(x.other)), "a painted fill by region has no rect to overlap");
});

test("L5: alignment stands as it was: boxes on one edge are still compared by their centres, and far boxes too (the owner's faults)", () => {
  const stack = [box("a", [16, 48, 300, 200]), box("b", [16, 264, 311, 290]), box("c", [340, 48, 668, 506])];
  assert.ok(has(run(stack), "L5", "b", (x) => /centres \(x\)/.test(x.what) && x.measured === 5.5), "left edges together, centres 5.5 apart: still almost aligned");
  const lines = [text("speciesLine", [608, 69, 142, 14]), text("story", [608, 94, 132, 12])], centresX = (f) => has(f, "L5", "b", (x) => /centres \(x\)/.test(x.what));
  assert.ok(!centresX(run([...lines, box("c", [16, 48, 300, 506])])), "two lines under 24 px high on one left edge: a stack of lines, not compared by centre");
  assert.ok(centresX(run([box("heading", [608, 73, 109, 14]), box("cards", [608, 110, 120, 120]), box("c", [16, 48, 300, 506])])), "a heading over a card on one left edge: centres 5.5 apart");
  assert.ok(has(run([box("a", [16, 48, 100, 100]), box("b", [800, 54, 100, 96])]), "L5", "b", (x) => /centres \(y\)/.test(x.what) && x.measured === 4 && x.guides.length === 2 && x.guides.every((g) => g.y != null)), "two far boxes 4 apart in y: compared, both lines named");
  assert.ok(has(run([box("pic", [300, 280, 420, 40]), ...FULL().map((n) => box(n[3], [n[4], n[5], n[6], 100]))]), "L5", "b", (x) => /container's/.test(x.what) && /middle of the opening/.test(x.says)), "a box off its container's centre line says so in words");
});

test("L8b: a component in a corner at the margins, or centred on both axes, is placed, not floating; creatures never float", () => {
  const near = box("a", [16, 48, 100, 100]);
  assert.ok(has(run([near, box("far", [700, 300, 100, 100])]), "L8", "b", (x) => x.node === "far"), "far from every neighbour");
  assert.ok(!has(run([near, box("far", [908, 454, 100, 100])]), "L8", "b", (x) => x.node === "far"), "in the bottom right corner at the margins (16 and 8): placed");
  assert.ok(has(run([near, box("far", [908, 400, 100, 100])]), "L8", "b", (x) => x.node === "far"), "on the right margin but not in a corner: floats");
  assert.ok(!has(run([near, box("capsule", [462, 251, 100, 100])]), "L8", "b", (x) => x.node === "capsule"), "centred on both axes (512, 301): placed");
  assert.ok(has(run([near, box("capsule", [462, 220, 100, 100])]), "L8", "b", (x) => x.node === "capsule"), "centred on x only: floats");
  assert.ok(!has(run([near, box("resident", [700, 300, 100, 100])], spec({ movers: ["resident"] })), "L8", "b"), "a creature anywhere on the ground");
});

test("L10a: a window that clips by design (its own region, or its container's picture) cuts nothing", () => {
  const door = box("door", [600, 100, 40, 300], { flags: 24 });
  assert.ok(has(run([...FULL(), door]), "L10", "a"), "undeclared");
  assert.ok(!has(run([...FULL(), door], spec({ clips: ["door"] })), "L10"), "the window's region is in clips");
  const inner = [box("win", [100, 100, 600, 400]), box("a", [116, 116, 100, 60]), box("window", [300, 116, 100, 300], { flags: 24 })];
  assert.ok(has(run(inner), "L10", "a", (x) => x.container.id === "win"), "a cut inside a pane");
  assert.ok(!has(run(inner, spec({ clips: ["win"] })), "L10"), "the pane's picture is in clips: nothing inside it is cut");
});

test("the wording of a card: plates named by their title, the overlap and the lone mark asked in words, the count of what a balance weighed", () => {
  const plates = [box("door.plate", [88, 82, 200, 100]), text("heading", [100, 90, 80, 14]), box("portrait.plate", [296, 82, 200, 100]), text("heading2", [308, 90, 60, 14])];
  const withText = (log) => ({ ...log, type: [{ region: "heading", x: 100, w: 80, text: "Companion", cap: 90, base: 102 }, { region: "heading2", x: 308, w: 60, text: "Portrait", cap: 90, base: 102 }] });
  const f = findings(withText({ nodes: plates }), bezelSpec(), frame, "s", "s").find((x) => x.rule === "L3" && x.part === "a");
  assert.equal(f?.says, "The Companion and Portrait plates are 8 apart; the gutter is 32.", "plates are named by their title text");
  assert.ok(/overlaps the b \(100 x 100\) by 50 x 50. Is one on the other by design\?/.test(run([box("a", [100, 100, 100, 100]), box("b", [150, 150, 100, 100])]).find((x) => x.rule === "L4").says), "an overlap asks whether it is by design");
  assert.equal(run([...FULL(), box("glint", [300, 300, 14, 16])]).find((x) => x.rule === "L11").says, "A small picture (14 x 16) with no word beside it: what is it?", "a lone mark asks what it is");
  assert.ok(/^The 14 px badge touches the pane's top edge \(0 px; 16 asked\)\.$/.test(run([box("pane", [100, 100, 600, 400]), box("badge", [110, 100, 14, 14]), box("body", [110, 140, 200, 100])]).find((x) => x.rule === "L2" && x.node === "badge")?.says ?? ""), "a small box touching an edge says its size");
});

test("the text fit: a text whose ink lies outside the plate it is drawn on is named by side and px; one inside, one on no plate, and one on a ring or a window are not", () => {
  const plate = node("chip", 4, [100, 100, 80, 24]), say = (rect, ...under) => overruns({ nodes: [...under, text("label", rect)], type: [{ text: "Words", region: "label", x: rect[0], w: rect[2], cap: rect[1] + 4, base: rect[1] + 16 }] });
  assert.deepEqual(say([110, 100, 60, 20], plate), [], "inside its plate: not an overrun");
  assert.deepEqual(say([110, 100, 60, 20]), [], "on no plate: not measured");
  const o = say([120, 100, 80, 20], plate);
  assert.equal(o.length, 1, "past the right edge only"); assert.deepEqual([o[0].side, o[0].measured, o[0].container.id], ["right", 20, "chip"]);
  assert.deepEqual(say([90, 100, 60, 20], plate).map((f) => [f.side, f.measured]), [["left", 10]], "past the left edge");
  assert.deepEqual(say([110, 100, 60, 20], node("chip", 4, [100, 100, 80, 24]), node("ring", 4, [100, 100, 40, 24], { flags: 1 })), [], "a focus ring is not a plate");
  assert.deepEqual(say([120, 100, 80, 20], node("win", 6, [100, 100, 80, 24])), [], "composed content is not a plate");
  assert.deepEqual(say([120, 100, 80, 20], node("ground", 4, [0, 40, 1024, 522]), node("chip", 4, [100, 100, 80, 24]))[0]?.container.id, "chip", "the last plate drawn under the text is its box, not the ground");
  assert.deepEqual(say([500, 100, 80, 20], node("glass", 4, [24, 56, 544, 408]), node("veil", 3, [0, 40, 1024, 522]), node("panel", 4, [92, 80, 840, 440])), [], "a decision panel over the glass is the text's plate: a title past the glass's edge but inside the panel fits");
  assert.equal(say([880, 100, 60, 20], node("glass", 4, [24, 56, 544, 408]), node("veil", 3, [0, 40, 1024, 522]), node("panel", 4, [92, 80, 840, 440]))[0]?.container.id, "panel", "and one past the panel is measured against the panel");
});
