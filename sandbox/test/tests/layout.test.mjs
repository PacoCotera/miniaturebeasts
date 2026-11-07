// The test page's layout numbers (src/layout.mjs) against the signed phone and desktop tables (x y w h, ±1 px).
import { test } from "node:test";
import assert from "node:assert/strict";
import { layout, menuLayout, classify, snap, render } from "../src/layout.mjs";

const near = (a, b, m) => assert.ok(a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= 1), `${m}: ${a.map((v) => Math.round(v * 10) / 10)} wanted ${b}`);
const L = (W, H, device, safe = {}, dev = true) => layout({ W, H, device, safe, dev });

test("the three layouts by window size", () => {
  assert.equal(classify(390, 664), "portrait"); assert.equal(classify(390, 844), "portrait");
  assert.equal(classify(844, 390), "landscape"); assert.equal(classify(915, 412), "landscape");
  assert.equal(classify(1440, 900), "desktop"); assert.equal(classify(1280, 720), "desktop");
});

test("phone portrait, the Station: 390 x 664 and 390 x 844", () => {
  const a = L(390, 664, "station"); near(a.face, [8, 52, 374, 219], "face"); near(a.regions.last, [8, 277, 374, 16], "last"); near(a.regions.foot, [8, 295, 374, 14], "footer");
  near(a.padBlock, [16, 395, 168, 168], "pad"); near(a.keys.back, [210, 487, 60, 60], "back"); near(a.keys.confirm, [286, 435, 88, 88], "confirm");
  near(a.regions.switch, [8, 0, 168, 44], "switch"); near(a.regions.dock, [184, 0, 88, 44], "dock"); near(a.regions.flag, [294, 0, 44, 44], "flag"); near(a.regions.menu, [338, 0, 44, 44], "menu");
  const b = L(390, 844, "station"); near(b.padBlock, [16, 485, 168, 168], "pad 844"); near(b.keys.back, [210, 577, 60, 60], "back 844"); near(b.keys.confirm, [286, 525, 88, 88], "confirm 844");
});

test("phone portrait, the Companion", () => {
  const a = L(390, 664, "companion"); near(a.face, [55, 52, 281, 374], "face"); near(a.padBlock, [16, 472, 168, 168], "pad"); near(a.keys.call, [214, 490, 60, 60], "call"); near(a.keys.back, [214, 562, 60, 60], "back"); near(a.keys.confirm, [286, 512, 88, 88], "confirm");
  const b = L(390, 844, "companion"); near(b.face, [8, 52, 374, 499], "face 844"); near(b.padBlock, [16, 625, 168, 168], "pad 844"); near(b.keys.confirm, [286, 665, 88, 88], "confirm 844");
});

test("phone landscape: iPhone insets, no insets, bare 844", () => {
  const i = L(844, 390, "station", { t: 0, r: 47, b: 21, l: 47 });
  near(i.face, [143, 21, 558, 327], "face"); near(i.regions.switch, [47, 8, 88, 44], "switch"); near(i.regions.last, [47, 64, 88, 48], "last"); near(i.regions.foot, [47, 175, 88, 42], "footer"); near(i.padBlock, [47, 229, 88, 132], "pad");
  near(i.regions.dock, [709, 8, 88, 44], "dock"); near(i.regions.menu, [709, 60, 88, 44], "menu"); near(i.regions.flag, [709, 112, 88, 44], "flag"); near(i.keys.back, [709, 229, 52, 52], "back"); near(i.keys.confirm, [725, 289, 72, 72], "confirm");
  assert.ok(Math.abs(i.s - 0.5449) < 0.0002);
  const c = L(844, 390, "companion", { t: 0, r: 47, b: 21, l: 47 }); near(c.face, [288, 6, 268, 357], "co face"); near(c.keys.call, [645, 229, 56, 56], "call"); near(c.keys.back, [645, 297, 56, 56], "co back"); near(c.keys.confirm, [713, 277, 84, 84], "co confirm");
  const p = L(915, 412, "station"); near(p.face, [116, 6, 683, 400], "915 face"); near(p.padBlock, [8, 272, 88, 132], "915 pad"); near(p.keys.confirm, [835, 332, 72, 72], "915 confirm"); near(p.regions.foot, [8, 218, 88, 42], "915 footer");
  const pc = L(915, 412, "companion"); near(pc.face, [308, 6, 300, 400], "915 co face"); near(pc.keys.left, [82, 308, 48, 48], "915 co pad left");
  const b = L(844, 390, "station"); near(b.face, [104, 9, 636, 373], "bare face"); near(b.regions.switch, [8, 8, 88, 44], "bare switch"); near(b.regions.dock, [748, 8, 88, 44], "bare dock"); near(b.keys.confirm, [764, 310, 72, 72], "bare confirm");
});

test("desktop, the full-screen view", () => {
  const a = L(1440, 900, "station"); near(a.face, [208, 110, 1024, 600], "face"); near(a.keys.back, [1248, 394, 64, 64], "back"); near(a.keys.confirm, [1328, 362, 96, 96], "confirm"); near(a.keys.home, [584, 734, 56, 56], "views");
  near(a.regions.dock, [1016, 4, 168, 32], "dock"); near(a.regions.flag, [1196, 4, 96, 32], "flag"); near(a.regions.drawer, [1300, 4, 40, 32], "drawer"); near(a.regions.fullscreen, [1348, 4, 76, 32], "full screen"); near(a.regions.last, [276, 11, 620, 18], "last"); near(a.regions.foot, [0, 872, 1440, 20], "footer");
  const b = L(1280, 720, "station"); assert.ok(Math.abs(b.s - 0.84375) < 1e-9);
});

test("the menu: portrait and landscape boxes, with and without dev", () => {
  const p = L(390, 664, "station"), m = menuLayout({ kind: "portrait", regions: p.regions, device: "station", dev: true, fullscreen: true, W: 390 });
  near(m.panel, [98, 48, 284, 188], "panel"); near(m.items.home, [110, 60, 56, 56], "home"); near(m.items.library, [314, 60, 56, 56], "library"); near(m.items.rule, [110, 128, 260, 1], "rule"); near(m.items.fullscreen, [110, 136, 260, 44], "fs"); near(m.items.tools, [110, 180, 260, 44], "tools");
  assert.equal(menuLayout({ kind: "portrait", regions: p.regions, device: "station", dev: false, fullscreen: true, W: 390 }).panel[3], 144);
  const c = menuLayout({ kind: "portrait", regions: p.regions, device: "companion", dev: true, fullscreen: true, W: 390 }); assert.equal(c.panel[3], 112);
  assert.equal(menuLayout({ kind: "portrait", regions: p.regions, device: "companion", dev: false, fullscreen: true, W: 390 }).panel[3], 68);
  assert.equal(menuLayout({ kind: "portrait", regions: p.regions, device: "companion", dev: false, fullscreen: false, W: 390 }).empty, true);
  const i = L(844, 390, "station", { r: 47, b: 21, l: 47 }), q = menuLayout({ kind: "landscape", regions: i.regions, device: "station", dev: true, fullscreen: true, W: 844 }); near(q.panel, [417, 8, 284, 188], "landscape panel"); near(q.items.home, [429, 20, 56, 56], "landscape home");
});

test("the pixel rule", () => {
  assert.equal(render("station", 0.3652, 1), "auto"); assert.equal(render("station", 1, 1), "pixelated"); assert.equal(render("station", 0.3652, 3), "auto"); assert.equal(render("station", 2 / 3, 3), "pixelated");
  assert.equal(render("companion", 0.62, 1), "auto"); assert.equal(render("companion", 0.8311, 3), "pixelated");
  assert.equal(snap(1.1, 1), 1); assert.equal(snap(0.84375, 1), 0.84375);
});
