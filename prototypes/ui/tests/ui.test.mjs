// The screen layer's logic in Node: the focus graph with its spatial fallback and arm-then-confirm, the timeline's holds, and the asset manifest.
//   node --test prototypes/ui/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { nextFocus, createFocus, nearest } from "../focus.mjs";
import { createTimeline } from "../timeline.mjs";
import { registerAsset, asset, manifest, placeholders, dropAsset, assetEntry } from "../assets.mjs";

test("focus follows the graph, steps along an axis, resolves selectors and falls back to the nearest target", () => {
  const graph = { list: { axis: "vertical", right: "pod" }, pod: { left: "list.current", up: "rail.last", right: "none" }, rail: { axis: "horizontal", down: "pod" }, fallback: "spatial" };
  const targets = [
    ...[0, 1, 2].map((i) => ({ id: "list." + i, group: "list", index: i, rect: [8, 48 + 72 * i, 144, 72] })), { id: "list.hatch", group: "list", index: 6, rect: [24, 488, 112, 56] },
    { id: "pod", group: "pod", rect: [264, 120, 160, 192] }, ...[0, 1, 2, 3].map((i) => ({ id: "rail." + i, group: "rail", index: i, rect: [176 + 120 * i, 48, 112, 56] })),
  ];
  const resolve = (sel) => ({ "list.current": "list.1", "rail.last": "rail.2" })[sel] ?? null;
  assert.equal(nextFocus(graph, targets, "list.0", "down", resolve), "list.1");
  assert.equal(nextFocus(graph, targets, "list.2", "down", resolve), "list.hatch");   // the wells, then the hatch
  assert.equal(nextFocus(graph, targets, "list.hatch", "down", resolve), "list.hatch");   // the ends stop
  assert.equal(nextFocus(graph, targets, "list.0", "up", resolve), "list.0");
  assert.equal(nextFocus(graph, targets, "list.0", "right", resolve), "pod");
  assert.equal(nextFocus(graph, targets, "pod", "left", resolve), "list.1");   // the pod's own well
  assert.equal(nextFocus(graph, targets, "pod", "up", resolve), "rail.2");    // the last chapter looked at
  assert.equal(nextFocus(graph, targets, "rail.2", "right", resolve), "rail.3");
  assert.equal(nextFocus(graph, targets, "rail.3", "right", resolve), "rail.3");
  assert.equal(nextFocus(graph, targets, "rail.1", "down", resolve), "pod");
  assert.equal(nextFocus(graph, targets, "pod", "right", resolve), "pod");   // → on the pod does nothing (the spec lists no move)
  assert.equal(nextFocus(graph, targets, "list.hatch", "right", resolve), "pod");   // the spatial fallback
  assert.equal(nextFocus(graph, targets, "nowhere", "right", resolve), "list.0");
  const pod = targets.find((t) => t.id === "pod"); assert.equal(nearest(targets, pod, "up").id, "rail.1");   // the tab straight above the pod's axis
  const F = createFocus(graph, "pod");
  F.arm("hatch"); assert.ok(F.isArmed("hatch")); F.move(targets, "left", resolve); assert.ok(!F.isArmed("hatch")); assert.equal(F.cur, "list.1");
  F.set("gone"); assert.equal(F.ensure(targets, "pod"), "pod");
});

test("the timeline plays events on its own clock and holds input while a holding event runs", () => {
  const T = createTimeline(); T.tick(1000);
  T.play({ kind: "wipe", target: "coat", ms: 2000, hold: true }); T.play({ kind: "flash", target: "e", ms: 240 });
  assert.equal(T.progress("wipe", "coat"), 0); assert.ok(T.holding());
  T.tick(2000); assert.equal(T.progress("wipe", "coat"), 0.5); assert.equal(T.progress("flash", "e"), 1); assert.ok(T.holding());
  T.tick(2100); assert.equal(T.progress("flash", "e"), null);   // dropped once seen complete
  T.tick(3000); assert.equal(T.progress("wipe", "coat"), 1); assert.ok(!T.holding());
  T.tick(3100); assert.equal(T.progress("wipe"), null);
  T.play({ kind: "seal", target: "p1", ms: 2000, hold: true }); T.release(); assert.ok(!T.holding());
  T.play({ kind: "wipe", target: "a", ms: 10 }); T.play({ kind: "wipe", target: "a", ms: 20 }); assert.equal(T.active("wipe").length, 1);   // the same event replaces itself
});

test("the asset manifest registers each picture at its size and refuses a build at another", () => {
  const pic = { w: 4, h: 4, rgba: () => null };
  registerAsset({ id: "t:a", w: 4, h: 4, status: "placeholder", until: "a master", build: () => pic });
  registerAsset({ id: "t:a", w: 4, h: 4, build: () => pic });   // idempotent
  assert.throws(() => registerAsset({ id: "t:a", w: 5, h: 4, build: () => pic }), /different sizes/);
  assert.equal(asset("t:a"), pic); assert.equal(asset("t:none"), null);
  registerAsset({ id: "t:b", w: 8, h: 8, status: "master", build: () => pic });
  assert.throws(() => asset("t:b"), /built at 4×4/);
  assert.ok(manifest().some((e) => e.id === "t:a" && !("build" in e))); assert.ok(placeholders().some((e) => e.id === "t:a"));
  dropAsset("t:a"); dropAsset("t:b");
});
