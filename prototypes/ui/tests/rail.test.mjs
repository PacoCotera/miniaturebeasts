// The slanted chapter rail against the spec (station-layouts.md, "The chapter rail"): the numbers in frame.json's rail, the shapes of the ends and the ring.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { slantTabs, slantAt } from "../layout.mjs";
import { tabEndMask, tabRingMask } from "../rings.mjs";
import { slantRail } from "../components/slantRail.mjs";
import { makeCtx } from "../context.mjs";

const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8")), R = frame.regions.rail;

test("the rail's runs: six full tabs fill 832, seven to twelve are compact with the open tab full, centred runs snap to the grid", () => {
  const six = slantTabs(R, 6); assert.equal(six.run, 832); assert.deepEqual(six.tabs.map((t) => t.rect[0]), [152, 288, 424, 560, 696, 832]); assert.ok(six.tabs.every((t) => t.rect[1] === 40 && t.rect[3] === 40 && t.rect[2] === 136));
  assert.equal(slantTabs(R, 1).run, 152);
  const seven = slantTabs(R, 7, 2); assert.equal(seven.run, 488); assert.deepEqual(seven.tabs.map((t) => t.rect[2]), [56, 56, 136, 56, 56, 56, 56]); assert.deepEqual(seven.tabs.map((t) => t.rect[0]).slice(2, 4), [264, 400]);   // the tabs after the open one sit 80 px further on
  assert.equal(slantTabs(R, 8, 0).run, 544); assert.equal(slantTabs(R, 12, 0).run, 768);
  assert.equal(slantTabs(R, 6, 0, "centred").x0, 96); assert.equal(slantTabs(R, 7, 0, "centred").x0, 264); assert.equal(slantTabs(R, 8, 0, "centred").x0, 240);
  assert.equal(slantTabs(R, 13).overflow, true);
});

test("a tab leans 16 px over its 40 rows, and neighbours share one slant", () => {
  assert.equal(slantAt(R, 0), 0); assert.equal(slantAt(R, 39), 15); for (let r = 1; r < 40; r++) assert.ok(slantAt(R, r) >= slantAt(R, r - 1) && slantAt(R, r) - slantAt(R, r - 1) <= 1);
  const shift = (r) => slantAt(R, r), lr = tabEndMask("left", "rim", 16, 40, shift), rr = tabEndMask("right", "rim", 16, 40, shift);
  for (let r = 0; r < 40; r++) {
    // the right end of tab i starts at x + w; its rim is at c = shift; the next tab's left end starts at the same x with its rim at c = shift: the same column
    assert.equal(rr[r * 16 + shift(r)], 255); assert.equal(lr[r * 16 + shift(r)], 255);
    const lf = tabEndMask("left", "fill", 16, 40, shift), rf = tabEndMask("right", "fill", 16, 40, shift);
    for (let c = 0; c < 16; c++) assert.ok(!(lf[r * 16 + c] && lr[r * 16 + c]) && !(rf[r * 16 + c] && rr[r * 16 + c]), "fill and rim never overlap");
  }
});

test("the focus ring on a tab is the box (x - 4, 42, w + 24, 42), 2 px, square at the top, with no pixel above y 42", () => {
  const r = frame.focus.ring, a = tabRingMask(136, { tab: r.tab, width: r.width, tabTop: frame.regions.rail.y });
  assert.deepEqual([a.w, a.h], [136 + 24, 42]);
  const at = (c, y) => a.mask[(y - 42) * a.w + c];
  assert.ok([...Array(a.w).keys()].filter((c) => c >= 2 && c < a.w - 18).every((c) => at(c, 42) && at(c, 43)), "the top run is 2 px and runs the width between the slants");
  assert.ok(!at(a.w >> 1, 44) && !at(a.w >> 1, 60), "hollow inside");
  assert.ok(at(a.w >> 1, 82) && at(a.w >> 1, 83), "the bottom run");
  assert.ok(!at(0, 83) && !at(a.w - 1, 83), "the bottom corners are rounded");
});

test("a rail of six builds from the spec: nodes at the tab positions, one word per full tab, pips on the 8 px pitch", () => {
  const ctx = makeCtx(frame, { measure: (t) => t.length * 9, face: () => ({ cap: 12 }) });
  const tabs = ["Coat", "Face", "Build", "Movement", "Legs & tail", "Voice"].map((word, i) => ({ id: "c" + i, word, state: i === 0 ? "read" : "unread", pips: 3, filled: i === 0 ? 3 : 0, emblem: "emblem:" + i, glint: i === 1 }));
  const out = slantRail(ctx, "rail", { tabs, focused: 1, open: 0, colours: { changed: "amber" }, star: "star:12", ground: "ground" });
  assert.equal(out.tabs.length, 6); assert.equal(out.nodes.filter((n) => n.kind === "text").length, 6);
  const pips = out.nodes.filter((n) => /^rail\.0\.pip\.\d$/.test(n.id)); assert.deepEqual(pips.map((n) => n.rect[0] - pips[0].rect[0]), [0, 8, 16]);
  const g = out.nodes.find((n) => n.id === "rail.1.glint"); assert.deepEqual(g.rect, [288 + 16 + 68 - 6, 82, 12, 12]);
  const ring = out.nodes.find((n) => n.id === "rail.1.focus"); assert.deepEqual(ring.rect, [288 - 4, 42, 160, 42]);
});
