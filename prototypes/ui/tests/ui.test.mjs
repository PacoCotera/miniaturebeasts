// The screen layer in Node: the scene's diff and dirty rectangles, the layout's three rules, the focus graph with
// its spatial fallback and arm-then-confirm, the timeline's holds, the asset manifest, and the frame components
// as nodes (measured with a stand-in for the canvas's text measure).
//   node --test prototypes/ui/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Scene, flatten } from "../scene.mjs";
import { railTabs, pageGrid, messagePlate as placePlate, repeat } from "../layout.mjs";
import { nextFocus, createFocus, nearest } from "../focus.mjs";
import { createTimeline } from "../timeline.mjs";
import { registerAsset, asset, manifest, placeholders, dropAsset, assetEntry } from "../assets.mjs";
import { makeCtx } from "../context.mjs";
import { loadTypeNode } from "../type-node.mjs";
import { frame, topBar, bottomLine, messagePlate, focusRing, stampLabel, stampCell, chapterRail, chapterPage, textRun, wrap, clip } from "../components/frame.mjs";

const spec = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8"));
const type = loadTypeNode(), ctx = makeCtx(spec, type);   // the real atlas metrics, in Node

test("the scene diffs nodes by id and marks only what changed dirty", () => {
  const s = new Scene(100, 100);
  s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }, { id: "b", kind: "rect", rect: [50, 50, 10, 10], colour: "ink" }]);
  assert.deepEqual(s.dirtyRects(), [[0, 0, 100, 100]]);   // the first frame paints everything
  s.clearDirty();
  s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }, { id: "b", kind: "rect", rect: [50, 50, 10, 10], colour: "ink" }]);
  assert.deepEqual(s.dirtyRects(), []);
  s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }, { id: "b", kind: "rect", rect: [60, 50, 10, 10], colour: "ink" }]);
  assert.deepEqual(s.dirtyRects(), [[50, 50, 20, 10]]);   // the old and the new place of b, joined
  s.clearDirty();
  s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }]);
  assert.deepEqual(s.dirtyRects(), [[60, 50, 10, 10]]);   // b removed
  s.clearDirty();
  s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }, { id: "L", kind: "legacy", rect: [0, 20, 100, 80], always: true, draw: () => {} }]);
  s.clearDirty(); s.set([{ id: "a", kind: "rect", rect: [0, 0, 10, 10], colour: "ink" }, { id: "L", kind: "legacy", rect: [0, 20, 100, 80], always: true, draw: () => {} }]);
  assert.deepEqual(s.dirtyRects(), [[0, 20, 100, 80]]);   // an adapter node repaints every frame
  assert.throws(() => s.set([{ id: "x", kind: "rect", rect: [0, 0, 1, 1], colour: "ink" }, { id: "x", kind: "rect", rect: [0, 0, 1, 1], colour: "ink" }]), /share the id/);
  // a clip's children are nodes of their own, drawn within the clip
  const flat = flatten([{ id: "c", kind: "clip", rect: [10, 10, 20, 20], children: [{ id: "k", kind: "rect", rect: [0, 0, 100, 100], colour: "ink" }] }]);
  assert.equal(flat.length, 2); assert.deepEqual(flat[1].clip, [10, 10, 20, 20]);
  assert.deepEqual(s.nodesIn([0, 0, 5, 5]).map((f) => f.node.id), ["a"]);
});

test("the rail compacts by chapter count as the spec states, and nothing else", () => {
  const rail = { rect: [176, 48, 832, 56] };
  const seven = railTabs(rail, 7).tabs; assert.equal(seven.length, 7); assert.deepEqual(seven[0], [176, 48, 112, 56]); assert.deepEqual(seven[6], [896, 48, 112, 56]);
  const four = railTabs(rail, 4).tabs; assert.deepEqual(four[3], [536, 48, 112, 56]);   // tab i at x0 + 120i, from the rail's left edge
  const eight = railTabs(rail, 8).tabs; assert.equal(eight[0][2], 96); assert.equal(eight[1][0] - eight[0][0], 104); assert.equal(eight[0][0], 180); assert.equal(eight[7][0] + 96, 1004);   // 824 in all, centred
  const twelve = railTabs(rail, 12, 3); assert.equal(twelve.mode, "compact"); assert.equal(twelve.tabs[3][2], 112); assert.equal(twelve.tabs[0][2], 56);
  const span = twelve.tabs[11][0] + 56 - twelve.tabs[0][0]; assert.equal(span, 816);   // 11 × 56 + 112 + 11 × 8
  assert.equal(railTabs(rail, 13).overflow, true);   // more than twelve comes back to the UI designer
  assert.deepEqual(railTabs(rail, 0).tabs, []);
});

test("the page grid follows the spec's table by trait count; past it, overflow", () => {
  const page = { rect: [528, 112, 480, 440], grid: { "1": { cells: [[16, 48, 448, 384]], picture: [448, 312] }, "3-4": { cells: [[16, 48, 216, 184], [248, 48, 216, 184], [16, 248, 216, 184], [248, 248, 216, 184]], picture: [216, 112] } } };
  assert.deepEqual(pageGrid(page, 1).cells, [[544, 160, 448, 384]]);
  const three = pageGrid(page, 3); assert.equal(three.cells.length, 3); assert.deepEqual(three.cells[2], [544, 360, 216, 184]); assert.deepEqual(three.picture, [216, 112]);
  assert.equal(pageGrid(page, 2).overflow, true);   // no row in this table
  assert.equal(pageGrid(page, 0).cells.length, 0);
  assert.deepEqual(repeat([40, 52, 64, 64], 3, [0, 72]), [40, 268, 64, 64]);
});

test("the message plate sits with its bottom at 550, or its top at 112 over a focal box", () => {
  const P = spec.regions.plate;
  assert.deepEqual(placePlate(P, 1, 200), [396, 514, 232, 36]);   // 16 + 20
  assert.deepEqual(placePlate(P, 2, 900), [192, 494, 640, 56]);   // capped at 640
  assert.deepEqual(placePlate(P, 1, 200, [264, 120, 160, 192]), [396, 514, 232, 36]);   // the pod's box is clear of the plate
  assert.deepEqual(placePlate(P, 1, 200, [360, 240, 304, 312]), [396, 112, 232, 36]);   // the founder's box reaches y 552: the plate goes to the top
});

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
  const pic = { w: 4, h: 4, canvas: () => null };
  registerAsset({ id: "t:a", w: 4, h: 4, status: "placeholder", until: "a master", build: () => pic });
  registerAsset({ id: "t:a", w: 4, h: 4, build: () => pic });   // idempotent
  assert.throws(() => registerAsset({ id: "t:a", w: 5, h: 4, build: () => pic }), /different sizes/);
  assert.equal(asset("t:a"), pic); assert.equal(asset("t:none"), null);
  registerAsset({ id: "t:b", w: 8, h: 8, status: "master", build: () => pic });
  assert.throws(() => asset("t:b"), /built at 4×4/);
  assert.ok(manifest().some((e) => e.id === "t:a" && !("build" in e))); assert.ok(placeholders().some((e) => e.id === "t:a"));
  dropAsset("t:a"); dropAsset("t:b");
});

test("the frame components place the spec's regions and set every string in Inter at 16, 20 or 28 px", () => {
  const nodes = frame(ctx, { title: "Pods", turn: 5, materials: { e: 10, d: 8, s: 15 }, flash: { d: true }, companion: { text: "Companion docked · with Dot", lamp: "on" }, line: { ok: "Read Coat", price: "3 ◆", back: "Home", subject: "Loika pod · meadow", need: "something new here" }, message: "New for the Loika: between, thin rings", focal: [264, 120, 160, 192] });
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  assert.deepEqual(byId.top.rect, [0, 0, 1024, 40]); assert.deepEqual(byId.line.rect, [0, 562, 1024, 38]);
  assert.deepEqual(byId["line.sep.0"].rect, [396, 571, 1, 20]); assert.deepEqual(byId["line.sep.1"].rect, [628, 571, 1, 20]);
  const texts = nodes.filter((n) => n.kind === "text");
  assert.ok(texts.every((n) => [16, 20, 28].includes(n.px)), "sizes " + [...new Set(texts.map((n) => n.px))]);
  assert.equal(byId["top.title.0"].px, 20); assert.equal(byId["top.title.0"].weight, 500);
  assert.ok(texts.some((n) => n.text === "T5"));
  // the materials sit centred on 512 with 16 px icons; a changed figure has its flash plate
  const icons = nodes.filter((n) => n.kind === "sprite" && n.asset.startsWith("icon:")); assert.equal(icons.length, 3 + 1);   // three counters and the ◆ in the price
  assert.ok(icons.every((n) => n.rect[2] === 16));
  assert.ok(byId["top.m.d.flash"]); assert.ok(!byId["top.m.e.flash"]);
  const e = byId["top.m.e.icon"].rect[0], s = byId["top.m.s"].rect[0] + byId["top.m.s"].rect[2]; assert.ok(Math.abs((e + s) / 2 - 512) <= 1, "centred on 512: " + e + ".." + s);
  // the Companion state ends at 1008 with its lamp to the left
  assert.equal(byId["top.comp"].rect[0] + byId["top.comp"].rect[2], 1008); assert.ok(byId["top.lamp"].rect[0] < byId["top.comp"].rect[0]); assert.equal(byId["top.lamp"].rect[2], 8);
  // the bottom line: ✓ verb · price · ← where, the subject centred, what needs you right-aligned to 1008
  assert.equal(texts.find((n) => n.id === "line.a.0.0").text, "✓");
  const need = nodes.filter((n) => n.id.startsWith("line.need")); assert.equal(need.at(-1).rect[0] + need.at(-1).rect[2], 1008);
  const subj = nodes.find((n) => n.id === "line.subject.0"); assert.ok(Math.abs(subj.rect[0] + subj.rect[2] / 2 - 512) <= 1);
  // the message plate: bottom at 550, over nothing focal
  assert.equal(byId.plate.rect[1] + byId.plate.rect[3], 550); assert.equal(byId.plate.region, "plate");
  // no ✓ cap without an action
  const quiet = bottomLine(ctx, { back: "Home", subject: "Coat · read" }); assert.ok(!quiet.some((n) => n.text === "✓"));
  assert.equal(messagePlate(ctx, { text: "" }).length, 0);
});

test("the focus ring is one cream ring 2 px wide, 4 px outside its target, 6 px radius; an ellipse under a creature's feet", () => {
  const [r] = focusRing("f", [100, 100, 50, 30], spec); assert.deepEqual(r.rect, [96, 96, 58, 38]); assert.equal(r.kind, "nineSlice"); assert.match(r.asset, /^ring:round:cream:2:6$/); assert.deepEqual(assetEntry(r.asset).slice, [8, 8, 8, 8]);
  const [e] = focusRing("f", [264, 120, 160, 192], spec, { shape: "ellipse" }); assert.deepEqual(e.rect, [256, 300, 176, 24]); assert.equal(e.kind, "sprite"); assert.deepEqual([assetEntry(e.asset).w, assetEntry(e.asset).h], [176, 24]);
});

test("the stamp label is 120×120 with the stamp on whole-pixel cells, centred", () => {
  assert.equal(stampCell(21), 4); assert.equal(stampCell(49), 2); assert.equal(stampCell(17), 5); assert.equal(stampCell(25), 3); assert.equal(stampCell(60), 2);
  const nodes = stampLabel(ctx, "stamp", [176, 432, 120, 120], { stamp: "stamp:x", size: 95, region: "stamp" });
  assert.deepEqual(nodes[0].rect, [176, 432, 120, 120]); assert.equal(nodes[0].region, "stamp");
  const sp = nodes.find((n) => n.kind === "sprite"); assert.deepEqual(sp.rect, [176 + 13, 432 + 13, 95, 95]);
});

test("the chapter rail draws emblem, word and pips per tab, no words of status, the focused tab lifted and ringed", () => {
  const colours = { unreadFill: "frostS", unreadEdge: "slate", unreadWord: "ink", sealedWord: "mist", readFill: "tealD", readRim: "aqua", readWord: "mint", pip: "aqua", pipHollow: "stone", ring: "cream", changed: "amber" };
  const tabs = [{ id: "coat", word: "Coat", emblem: "emblem:coat:24", pips: 1, filled: 1, state: "read", glint: false }, { id: "face", word: "Face", emblem: "emblem:face:24", pips: 2, filled: 0, state: "unread", glint: true }, { id: "legs-tail", word: "Legs", emblem: "emblem:legs-tail:24", pips: 4, filled: 0, state: "sealed", glint: false }];
  const r = chapterRail(ctx, "rail", { rect: [176, 48, 832, 56] }, { tabs, focused: 1, colours, ground: "deep", slats: "slats:", star: "star:12", region: "rail", tabRegion: "rail.tab" });
  assert.equal(r.tabs.length, 3); assert.equal(r.overflow, false);
  const by = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
  assert.deepEqual(by["rail.0"].rect, [176, 48, 112, 56]); assert.deepEqual(by["rail.1"].rect, [296, 46, 112, 56]);   // the focused tab lifts 2 px (the chrome lift)
  assert.deepEqual(by["rail.0.emblem"].rect, [220, 52, 24, 24]);   // tab.x + 44, 52
  assert.equal(by["rail.0.word"].text, "Coat"); assert.equal(by["rail.0.word"].px, 16); assert.equal(by["rail.0.word"].rect[1], 76);
  assert.deepEqual(by["rail.0.pip.0"].rect, [229, 96, 6, 6]); assert.equal(by["rail.0.pip.0"].kind, "rect");
  assert.ok(by["rail.1.pip.0.t"] && !by["rail.1.pip.0"]); assert.equal(by["rail.1.pip.1.t"].rect[0] - by["rail.1.pip.0.t"].rect[0], 10);   // hollow: an outline of four rectangles
  assert.deepEqual(by["rail.1.glint"].rect, [296 + 92, 46 + 4, 12, 12]);
  assert.equal(by["rail.2.word"].colour, "mist"); assert.ok(by["rail.2.slats"] && by["rail.2.notch"] && !by["rail.2.pip.0"]); assert.deepEqual(by["rail.2.notch"].rect, [416 + 52, 48 + 52, 8, 4]);
  assert.ok(by["rail.1.focus"] && by["rail.1.focus"].kind === "nineSlice"); assert.deepEqual(by["rail.1.focus"].rect, [292, 42, 120, 64]);
  const words = r.nodes.filter((n) => n.kind === "text").map((n) => n.text); assert.deepEqual(words, ["Coat", "Face", "Legs"]);   // never "read", "sealed" or a price
  assert.ok(!r.nodes.some((n) => n.kind === "text" && /\d/.test(n.text)));
});

test("the chapter page lays the cells on the grid with the marks inside each picture", () => {
  const region = { rect: [528, 112, 480, 440], heading: [16, 8], grid: { "3-4": { cells: [[16, 48, 216, 184], [248, 48, 216, 184], [16, 248, 216, 184], [248, 248, 216, 184]], picture: [216, 112] } } };
  const colours = { pane: "deep", edge: "slate", heading: "bone", name: "bone", line: "fog", lineEmpty: "stone", wipe: "white", diff: { edge: "aqua", bracket: "aqua", keyline: "ink" } };
  const marks = { seed: [40, 52], seedSmall: [32, 40], smallUnder: 120, only: [72, 8], asleep: [24, 16], doing: [28, 16], key: [44, 64] };
  const cells = [{ picture: "pic:a", name: "Crown", lines: ["only bare head"], marks: [{ kind: "only", asset: "base" }], wipe: 0.5 }, { picture: "pic:b", name: "Eye rings", lines: ["shows thin · hides none"], marks: [{ kind: "seed", asset: "seed:x" }, { kind: "doing", asset: "fam" }] }, { picture: "pic:c", name: "Ears", lines: [], frost: true }, { picture: "pic:d", name: "Tail", lines: ["shows long"], marks: [], diff: true }];
  const r = chapterPage(ctx, "page", region, { heading: { emblem: "emblem:face:24", word: "Face" }, cells, colours, marks, diffEdge: 2, bracket: "bracket:12x12", frost: "frost:", slats: "slats:", region: "page", cellRegion: "page.cell" });
  const by = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
  assert.deepEqual(by.page.rect, [528, 112, 480, 440]); assert.deepEqual(by["page.emblem"].rect, [544, 120, 24, 24]); assert.equal(by["page.word"].px, 20);
  assert.deepEqual(by["page.c0.pic"].rect, [544, 160, 216, 112]); assert.deepEqual(by["page.c2.pic"].rect, [544, 360, 216, 112]);
  assert.deepEqual(by["page.c0.m0"].rect, [544 + 108 - 36, 160 + 112 - 8, 72, 8]);   // the base centred on the bottom edge
  assert.deepEqual(by["page.c1.m0"].rect, [776 + 216 - 40, 160 + 112 - 48, 32, 40]);   // the small seed (32×40 under a 120 px picture) at the bottom right
  assert.deepEqual(by["page.c1.m1"].rect, [776 + 8, 160 + 8, 28, 16]);   // breed to change at the top left
  assert.equal(by["page.c2.frost"].asset, "frost:216x112"); assert.ok(!by["page.c2.l0"] || by["page.c2.l0"].text === "");
  assert.deepEqual(by["page.c0.wipe"].rect, [544, 216, 216, 56]); assert.equal(by["page.c0.name"].rect[1], 160 + 112 + 8);
  // Compare: the difference is a 2 px aqua edge on the picture's own rectangle and the bracket 8 px in at the top centre; never the cream ring
  assert.deepEqual(by["page.c3.diff.t"].rect, [776, 360, 216, 2]); assert.deepEqual(by["page.c3.diff.r"].rect, [776 + 214, 360, 2, 112]); assert.equal(by["page.c3.diff.t"].colour, "aqua");
  assert.deepEqual(by["page.c3.bracket"].rect, [776 + 108 - 6, 360 + 8, 12, 12]); assert.ok(!r.nodes.some((n) => n.kind === "nineSlice"));
  assert.ok(r.nodes.filter((n) => n.kind === "text").every((n) => [16, 20].includes(n.px)));
  assert.equal(chapterPage(ctx, "p2", region, { heading: null, cells: new Array(7).fill(cells[2]), colours, marks, diffEdge: 2, frost: "f:", slats: "s:" }).overflow, true);
});

test("text runs draw the material symbols as icons, wrap and clip", () => {
  const r = textRun(ctx, "t", "Read Coat · 3 ◆", 16, 570, { px: 16, colour: "bone" });
  assert.equal(r.nodes.filter((n) => n.kind === "sprite").length, 1); assert.equal(r.nodes.filter((n) => n.kind === "sprite")[0].asset, "icon:data:16");
  assert.ok(r.nodes.filter((n) => n.kind === "text").every((n) => !/[⚡◆❀]/.test(n.text)));
  assert.deepEqual(wrap(ctx, "a b c d e f", 48, 16), ["a b c", "d e f"]);
  assert.ok(clip(ctx, "a very long subject indeed", 60, 16).endsWith("…"));
  const c = textRun(ctx, "c", "Loika", 344, 344, { px: 28, weight: 600, colour: "bone", align: "center" }); assert.ok(Math.abs(c.nodes[0].rect[0] + c.nodes[0].rect[2] / 2 - 344) <= 1);
});
