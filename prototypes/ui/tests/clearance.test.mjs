// The clearance of text (ui/specs/clearance.mjs) on planted node logs: each rule (T1 to T7, T10, T11) finds what it must and nothing else, exceptions are spec data and each must be in use,
// a screen is reported until frame.json type.clearance.enforced lists it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { departures, unusedExceptions, enforced } from "../specs/clearance.mjs";

const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8"));
// a text at (x, cap) of width w, 16 px (cap 12) unless px says otherwise; run: the v_run or v_price call it was sent in (0 for none)
const text = (region, s, x, cap, w, px = 16, run = 0) => ({ text: s, px, region, role: "", ground: "", run, x, w, cap, base: cap + (px % 1000 === 20 ? 14 : px % 1000 === 28 ? 21 : 12) });
const nd = (id, kind, region, x, y, w, h, flags = 0, ink = [x, y, w, h], layer = 1, run = 0) => [id, kind, layer, region, x, y, w, h, flags, ...ink, run];
const rules = (d) => d.map((x) => x.rule).sort();

test("clearance: a text well placed departs from nothing", () => {
  const log = { type: [text("card.name", "Release it", 120, 220, 80)], nodes: [nd(1, 1, "card", 100, 200, 300, 120, 0, undefined, 0), nd(2, 2, "card.name", 120, 216, 80, 20)] };
  assert.deepEqual(departures(log, {}, frame), []);
});
test("clearance T1: the safe margin, x 16 to 1008, no text on rows 0 to 8 or 592 to 599", () => {
  const d = departures({ type: [text("a", "Left", 12, 100, 40), text("b", "Right", 980, 100, 40), text("c", "High", 400, 4, 40), text("d", "Low", 400, 584, 40)], nodes: [] }, {}, frame);
  assert.deepEqual(d.filter((x) => x.rule === "T1").map((x) => [x.node, x.measured, x.required]), [['a "Left"', 12, 16], ['b "Right"', 4, 16], ['c "High"', 4, 9], ['d "Low"', 4, 8]]);
  assert.deepEqual(rules(d), ["T1", "T1", "T1", "T1"], "no bar is drawn, so no bar's middle is asked");
});
test("clearance T2: the bars' text and icons on the bars' middles", () => {
  const d = departures({ type: [text("title", "Library", 40, 10, 75, 20), text("top.m", "12", 600, 14, 16, 16, 3), text("subject", "Coat", 450, 572, 40), text("back", "Home", 950, 576, 40)], nodes: [nd(1, 3, "top", 0, 0, 1024, 40, 0, undefined, 2), nd(2, 3, "line", 0, 562, 1024, 38, 0, undefined, 2), nd(5, 3, "top.m", 580, 12, 16, 16, 0, undefined, 1, 3), nd(6, 3, "icon", 90, 570, 16, 16)] }, {}, frame);
  assert.deepEqual(d.map((x) => [x.rule, x.node, x.measured, x.required]), [["T2", "icon [90, 570, 16, 16]", 578, 582], ["T2", 'title "Library"', 10, 13], ["T2", 'subject "Coat"', 572, 576]]);
});
test("clearance T3 and T4: a pane's 12 inside; a band's cap centred and 12 from its ends (8 on a chip or a key)", () => {
  const pane = { type: [text("p.t", "Heading", 106, 205, 60)], nodes: [nd(1, 4, "p", 100, 200, 300, 100)] };
  assert.deepEqual(departures(pane, {}, frame).map((x) => [x.rule, x.other.split(" ").pop(), x.measured]), [["T3", "top", 5], ["T3", "left", 6]]);
  const band = { type: [text("tag", "Moss", 108, 106, 40)], nodes: [nd(1, 3, "tag", 100, 100, 58, 24)] };
  assert.deepEqual(departures(band, {}, frame).map((x) => [x.rule, x.other.split(" ").pop(), x.measured, x.required]), [["T4", "start", 8, 12], ["T4", "end", 10, 12]]);
  assert.deepEqual(departures(band, { regions: { tag: { band: "chip" } } }, frame), [], "a chip's ends are 8");
  const off = { type: [text("tag", "Moss", 112, 102, 40)], nodes: [nd(1, 3, "tag", 100, 100, 64, 24)] };
  assert.deepEqual(departures(off, {}, frame).map((x) => [x.rule, x.measured, x.required]), [["T4", 102, 106]], "the cap 4 rows above the band's middle");
});
test("clearance T5: 8 from the picture a text labels, 16 from any other on its rows; a picture under it is its ground, its own run's icons are inline", () => {
  const log = { type: [text("cap", "Dot", 100, 300, 30, 16, 5)], nodes: [nd(7, 3, "pic", 140, 290, 40, 40, 0, [150, 292, 20, 30]), nd(8, 3, "ground", 0, 0, 1024, 600, 0, undefined, 2), nd(9, 3, "cap", 132, 298, 16, 16, 0, undefined, 1, 5)] };
  assert.deepEqual(departures(log, {}, frame), [], "20 from a picture on its rows, its ground and its own icon (the run it was sent in)");
  const other = { ...log, type: [text("cap", "Dot", 100, 300, 30, 16, 6)] };
  assert.deepEqual(departures(other, {}, frame).map((x) => [x.rule, x.measured, x.required]), [["T5", 2, 16]], "an icon of another run in the same region is a neighbour");
  const chrome = { type: [text("cap", "Dot", 300, 300, 30)], nodes: [nd(7, 3, "pic", 334, 290, 40, 40, 0, undefined, 0), nd(8, 4, "frame", 262, 290, 24, 40, 0, undefined, 0)] };
  assert.deepEqual(departures(chrome, {}, frame).map((x) => [x.rule, x.other.split(" ")[2], x.measured]), [["T5", "pic", 4]], "a sprite counts on any layer, a nine-slice only off the chrome layer");
  const off = { ...chrome, nodes: [chrome.nodes[0], nd(8, 4, "frame", 262, 290, 24, 40, 0, undefined, 2)] };
  assert.deepEqual(departures(off, {}, frame).map((x) => [x.rule, x.other.split(" ")[2], x.measured]), [["T5", "pic", 4], ["T5", "frame", 14]], "a nine-slice off the chrome layer does");
  const near = { ...log, nodes: [nd(7, 3, "pic", 140, 290, 40, 40, 0, [138, 292, 20, 30])] };
  assert.deepEqual(departures(near, {}, frame).map((x) => [x.rule, x.measured, x.required]), [["T5", 8, 16]]);
  const fnv = (s) => { let h = 2166136261; for (const c of Buffer.from(s)) { h ^= c; h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  const labelled = { type: [text("cap", "Dot", 100, 300, 30)], nodes: [nd(fnv("tile.pic"), 3, "pic", 100, 250, 40, 40, 0, [100, 250, 40, 44])] };
  assert.deepEqual(departures(labelled, { regions: { cap: { labels: "tile.pic" } } }, frame).map((x) => [x.rule, x.measured, x.required]), [["T5", 6, 8]], "the picture it labels, above it");
});
test("clearance T6 and T7: 4 from the focus ring's outer edge, 8 from a 1 px rule", () => {
  const log = { type: [text("c", "Moss", 100, 302, 40)], nodes: [nd(1, 6, "focus", 90, 200, 60, 100, 1), nd(2, 1, "sep", 150, 296, 1, 20)] };
  assert.deepEqual(departures(log, {}, frame).map((x) => [x.rule, x.measured, x.required]), [["T6", 2, 4]], "2 under the ring, 10 from the rule");
  const ruled = { type: [text("c", "Moss", 100, 302, 40)], nodes: [nd(2, 1, "sep", 145, 296, 1, 20)] };
  assert.deepEqual(departures(ruled, {}, frame).map((x) => [x.rule, x.measured, x.required]), [["T7", 5, 8]]);
  const inside = { type: [text("c", "Moss", 100, 230, 40)], nodes: [nd(1, 6, "focus", 90, 200, 60, 100, 1)] };
  assert.deepEqual(departures(inside, {}, frame), [], "a text inside the ring's box is the ringed thing's");
});
test("clearance T10 and T11: 16 between texts on a row (the pieces of one run are one text); no clip cuts a text; the ellipsis only in a slot the spec marks", () => {
  const d = departures({ type: [text("a", "One", 100, 300, 30, 16, 1), text("b", "Two", 140, 300, 30), text("a", "Run", 60, 300, 30, 16, 1)], nodes: [] }, {}, frame);
  assert.deepEqual(d.map((x) => [x.rule, x.node, x.measured]), [["T10", 'a "One"', 10]]);
  assert.deepEqual(departures({ type: [text("a", "One", 100, 300, 30, 16, 7), text("a", "Two", 134, 300, 30, 16, 7)], nodes: [] }, {}, frame), [], "two pieces of one run");
  assert.deepEqual(departures({ type: [text("a", "One", 100, 300, 30, 16, 7), text("a", "Two", 134, 300, 30, 16, 8)], nodes: [] }, {}, frame).map((x) => [x.rule, x.node, x.measured]), [["T10", 'a "One"', 4]], "one region, two runs");
  const clip = departures({ type: [text("s", "Carried by Bean", 400, 576, 120)], nodes: [nd(3, 5, "s", 408, 570, 100, 24)] }, {}, frame);
  assert.deepEqual(rules(clip), ["T11"]);
  const dots = { type: [{ ...text("subject", "Carried by Be…", 420, 300, 100), role: "subject" }], nodes: [] };
  assert.deepEqual(rules(departures(dots, {}, frame)), ["T11"]); assert.deepEqual(departures(dots, { regions: { subject: { ellipsis: true } } }, frame), []);
});
test("clearance: a text a later rectangle, or a later picture whose pixels fill its box, covers whole is not measured (an overlay over the screen)", () => {
  const log = { type: [text("under", "Mend", 4, 300, 30)], nodes: [nd(1, 2, "under", 4, 296, 30, 20), nd(2, 1, "panelGround", 0, 40, 1024, 522, 0, undefined, 0)] };
  assert.deepEqual(departures(log, {}, frame), []);
  const veil = { type: [text("under", "Mend", 4, 300, 30)], nodes: [nd(1, 2, "under", 4, 296, 30, 20), nd(2, 3, "veil", 0, 40, 1024, 522, 0, undefined, 2)] };
  assert.deepEqual(departures(veil, {}, frame), []);
  const frameOnly = { type: [text("under", "Mend", 4, 300, 30)], nodes: [nd(1, 2, "under", 4, 296, 30, 20), nd(2, 3, "rim", 0, 40, 1024, 522, 0, [0, 40, 1024, 10], 2)] };
  assert.deepEqual(rules(departures(frameOnly, {}, frame)), ["T1"], "a picture whose pixels do not fill its box hides nothing");
});
test("clearance: exceptions are frame.json data, each one in use; a screen is reported until it is enforced", () => {
  const f = { ...frame, type: { ...frame.type, clearance: { enforced: ["home"], exceptions: [{ node: "a", rule: "T1", reason: "test", by: "UI/UX" }, { node: "z", rule: "T7", reason: "test", by: "UI/UX" }] } } };
  const d = departures({ type: [text("a", "Left", 12, 100, 40)], nodes: [] }, {}, f);
  assert.deepEqual(d, []); assert.deepEqual(d.used.map((e) => e.node), ["a"]);
  assert.deepEqual(unusedExceptions(f, [d]).map((e) => e.node), ["z"]);
  assert.equal(enforced(f, "home"), true); assert.equal(enforced(f, "pods"), false);
  assert.deepEqual(frame.type.clearance, { enforced: [], exceptions: [] }, "report mode everywhere today, no exceptions");
});
