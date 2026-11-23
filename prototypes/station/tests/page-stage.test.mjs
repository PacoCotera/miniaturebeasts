// Her page's stage picture (station-match-3 slice 1a, the rail in station-match-4 slice 1b): one opaque picture of the window's size, composed from the game's own masters (the room, her adult master) with interface marks drawn by code.
//   node --test prototypes/station/tests/page-stage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pageStagePicture, pageScalePicture } from "../src/reading-pictures.mjs";
import { cellX } from "../src/views/page-props.mjs";
import { placeMaster } from "../../ui/assets.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")), R = spec.regions.page, C = R.rail.cell;
const cells = (hand) => [0, 1, 2, 3, 4, 5].map((i) => ({ chapter: ["coat", "face", "shape", "legs-tail", "movement", "stamina"][i], x: cellX(i, 6, R.rect[2], C), petals: i === 0 ? "0,0,0" : "1,1", hand: i === hand }));
const req = (over = {}) => ({ species: "S01", size: R.rect.slice(2), body: { x: 52, y: 78, w: 384 }, spots: [{ chapter: "coat", at: [72, 222], line: [98, 250, 140, 282], ring: "0,0,0" }, { chapter: "face", at: [476, 224], line: [462, 232, 412, 258], ring: "" }], hand: "coat", tag: R.tag.rect, radius: 14, keys: [R.hints.chapters.key, R.hints.look.key],
  rail: { y: R.rail.rect[1], h: R.rail.rect[3], ring: C.ring, cy: R.rail.rect[1] + C.ringCy, grad: C.gradient, frame: C.frame, w: C.w, cells: cells(0) }, ...over });
const at = (px, W, x, y) => [0, 1, 2, 3].map((k) => px[(y * W + x) * 4 + k]);
const orange = ([r, g, b]) => r > 200 && g > 90 && g < 160 && b < 90;

test("the stage is one opaque picture of the window's size, the same bytes for the same request", () => {
  const [W, H] = R.rect.slice(2), a = pageStagePicture(req()), b = pageStagePicture(req());
  assert.equal(a.length, W * H * 4); for (let i = 3; i < a.length; i += 4 * 997) assert.equal(a[i], 255, "opaque"); assert.deepEqual(a, b);
});
test("the ring on the chapter in hand is orange round the chip, a chip without a ring is a dark disc, and the tag's pill and the two keys are drawn", () => {
  const [W] = R.rect.slice(2), px = pageStagePicture(req());
  assert.ok(orange(at(px, W, 72 + 43, 222)), "the focus circle's orange border at its radius"); assert.ok(!orange(at(px, W, 476 + 43, 224)), "no ring on a chip that is not in hand");
  const noRing = pageStagePicture(req({ spots: [{ chapter: "coat", at: [72, 222], line: [98, 250, 140, 282], ring: "" }] })); assert.ok(!orange(at(noRing, W, 72 + 43, 222)), "no ring when the chip is not the chapter in hand");
  const [kx, ky, kw, kh] = R.hints.look.key; assert.ok(at(px, W, 415, 22)[0] < 60, "the tag's pill is dark under its word"); assert.ok(orange(at(px, W, kx + 6, ky + kh / 2)), "the ✓ key's disc is orange");
});
test("the rail: six cells space-between, the frame on the chapter in hand only, a ring in each cell, the band darkening to the foot", () => {
  const [W, H] = R.rect.slice(2), xs = cells(0).map((c) => c.x); assert.deepEqual(xs, [10, 95, 181, 266, 352, 438], "82 px cells, 10 in, space-between over 530");
  assert.equal(cellX(0, 1, W, C), C.inset, "one cell stands at the inset");
  const frameY = R.rail.rect[1] + C.frame.top + 20;   // a point on the frame's left edge, mid-height
  for (const hand of [0, 3]) { const px = pageStagePicture(req({ rail: { ...req().rail, cells: cells(hand) } }));
    cells(hand).forEach((c, i) => { const edge = at(px, W, c.x + C.frame.dx + 1, frameY); assert.equal(orange(edge), i === hand, `cell ${i}: frame ${i === hand ? "on" : "off"} when the hand is ${hand}`); }); }
  const px = pageStagePicture(req()), top = at(px, W, 5, R.rail.rect[1] - 2), low = at(px, W, 5, H - 2); assert.ok(low[0] < 30 && low[2] < 40, "the foot of the band is ink");
  const ring = at(px, W, xs[1] + C.w / 2 + 22, R.rail.rect[1] + C.ringCy), plain = at(pageStagePicture(req({ rail: null })), W, xs[1] + C.w / 2 + 22, R.rail.rect[1] + C.ringCy); assert.notDeepEqual(ring, plain, "a ring is drawn in the cell"); void top;
});
// Her chapter (station-match-5): the scale picture is one opaque picture of the window's size from the game's masters; the gold rim is at the chapter's place, her mark is on the bar, a set has no bar.
const scaleReq = (over = {}) => ({ species: "S01", size: R.rect.slice(2), dusk: false, copies: false, body: { left: 6, top: -176, w: 608 }, lens: { cx: 330, cy: 206, d: 108, zoomW: 760, fx: 0.533, fy: 0.612 }, halves: null, tray: { top: 248, h: 352, fade: 26 }, ring: { cx: 46, cy: 304, s: 52, chapter: "coat", petals: "1,c,1" }, chips: [],
  sc: { ends: [{ cx: 46, cy: 410, d: 76, master: "mibi-adult-S01-304x312" }], bar: { x0: 46, x1: 484, y: 474, h: 16, over: 10, grad: [[0.1, 0.1, 0.1], [0.3, 0.3, 0.3], [0.5, 0.5, 0.5]], ticks: [46], tick: [469, 474] }, rough: null, she: { x: 77, y: 482, d: 26 }, cop: null, link: null, pins: [], legend: { dot: null, bar: null } }, ...over });
test("the scale picture: opaque, deterministic, the gold lens rim at the chapter's place, her gold mark on the bar; a set draws no bar", () => {
  const [W, H] = R.rect.slice(2), a = pageScalePicture(scaleReq()), b = pageScalePicture(scaleReq()); assert.equal(a.length, W * H * 4); for (let i = 3; i < a.length; i += 4 * 997) assert.equal(a[i], 255, "opaque"); assert.deepEqual(a, b);
  const gold = ([r, g, bl]) => r > 200 && g > 150 && g < 230 && bl < 120; assert.ok(gold(at(a, W, 330, 206 - 52)), "the lens rim in gold at its top"); assert.ok(gold(at(a, W, 77, 482)), "her mark is gold on the bar");
  const none = pageScalePicture(scaleReq({ sc: { ends: [], bar: null, rough: null, she: null, cop: null, link: null, pins: [], legend: { dot: null, bar: null } } })); assert.notDeepEqual(at(none, W, 200, 482), at(a, W, 200, 482), "no bar on a set");
});

// Her own coat (loika-page-coat-1): the stage draws the master of her coat and marking, as the room does, not the species base; a coat with no master keeps the base. Flat stand-in masters, one colour a coat.
const flat = (r, g, b) => ({ w: 304, h: 312, rgba: () => { const a = new Uint8Array(304 * 312 * 4); for (let i = 0; i < a.length; i += 4) a.set([r, g, b, 255], i); return a; } });
for (const [n, c] of [["", [200, 200, 200]], ["redder-between-", [200, 40, 40]], ["between-between-lay-saddle-", [40, 40, 200]]]) { const id = `mibi-adult-S01-${n}304x312`; placeMaster({ id, w: 304, h: 312, file: `${id}.png`, hash: "t" }, flat(...c)); }
test("the stage draws her coat and marking master, the base without one", () => {
  const [W] = R.rect.slice(2), mid = (px) => at(px, W, 52 + 192, 78 + 200).slice(0, 3);
  assert.deepEqual(mid(pageStagePicture(req())), [200, 200, 200], "no coat: the base"); assert.deepEqual(mid(pageStagePicture(req({ coat: "redder-between" }))), [200, 40, 40], "her coat");
  assert.deepEqual(mid(pageStagePicture(req({ coat: "between-between+lay-saddle" }))), [40, 40, 200], "her marking"); assert.deepEqual(mid(pageStagePicture(req({ coat: "no-such-coat" }))), [200, 200, 200], "an unplaced coat keeps the base");
});
