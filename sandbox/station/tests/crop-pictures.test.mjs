// The `crop` picture request (pictures.mjs, T-20261016-161): a window of a placed master taken 1:1, never scaled, transparent where the window passes the master's edge; the dock arrival's cards use it
// for their crates (frame.json regions.panel.strip.picture.crops). A master that is not placed leaves a labelled stand-in of the window's size.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerPictures } from "../src/pictures.mjs";
import { placeMaster, asset, dropAsset, assetEntry } from "../../ui/assets.mjs";
import { dockCards } from "../src/views/panel-props.mjs";

const J = (f) => JSON.parse(readFileSync(new URL("../../ui/specs/station/" + f, import.meta.url), "utf8")), frame = J("frame.json"), panel = J("panel.json");
// a master whose every pixel names its place: R = x mod 256, G = y mod 256, B = 7, A = 255 (a hole at (0, 0) for the edge check is not needed: the edge is the window's)
const master = (id, w, h) => placeMaster({ id, w, h, file: id + ".png", hash: "t", signed: "test", status: "master" }, { w, h, rgba: () => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) d.set([x & 255, y & 255, 7, 255], (y * w + x) * 4); return d; } });

test("a crop is the master's pixels at the window, 1:1; where the window passes the master it is transparent", () => {
  master("t-crop-src", 40, 30);
  registerPictures([{ kind: "crop", id: "t-crop-a", master: "t-crop-src", of: [40, 30], at: [5, 4], size: [10, 6], until: "x" }, { kind: "crop", id: "t-crop-b", master: "t-crop-src", of: [40, 30], at: [-3, -2], size: [8, 6], until: "x" }], {});
  const a = asset("t-crop-a"), da = a.rgba(); assert.deepEqual([a.w, a.h, da.length], [10, 6, 240]);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) assert.deepEqual([...da.slice((y * 10 + x) * 4, (y * 10 + x) * 4 + 4)], [5 + x, 4 + y, 7, 255], `(${x}, ${y})`);
  const b = asset("t-crop-b").rgba();
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) { const px = [...b.slice((y * 8 + x) * 4, (y * 8 + x) * 4 + 4)]; if (x < 3 || y < 2) assert.deepEqual(px, [0, 0, 0, 0], `outside (${x}, ${y})`); else assert.deepEqual(px, [x - 3, y - 2, 7, 255], `inside (${x}, ${y})`); }
  assert.equal(assetEntry("t-crop-a").status, "derived", "derived of a master, not a placeholder");
  for (const id of ["t-crop-a", "t-crop-b", "t-crop-src"]) dropAsset(id);
});

test("a master that is not placed (or at another size) leaves a stand-in of the window's size, in the placeholder register", () => {
  registerPictures([{ kind: "crop", id: "t-crop-none", master: "t-not-placed", of: [40, 30], at: [0, 0], size: [12, 9], until: "its master" }], {});
  const e = assetEntry("t-crop-none"); assert.equal(e.status, "placeholder"); assert.deepEqual([e.w, e.h], [12, 9]); assert.equal(asset("t-crop-none").w, 12); dropAsset("t-crop-none");
});

test("the dock strip's two cards ask for 96 × 96 windows named by frame.json: the open crate's well and rim, the whole sealed crate sitting", () => {
  const requests = [], cards = dockCards({ ui: { cargo: { arrival: { crates: 2 } } } }, panel, frame, requests), C = frame.regions.panel.strip.picture;
  assert.deepEqual(C.size, [96, 96]); assert.equal(requests.length, 2); assert.ok(requests.every((r) => r.kind === "crop" && r.size[0] === 96 && r.size[1] === 96));
  assert.deepEqual(requests.map((r) => [r.master, r.of, r.at]), [["crate-open-432x272", [432, 272], [150, 110]], ["crate-sitting-80x56", [80, 56], [-8, -20]]]);
  assert.deepEqual(cards.map((c) => c.picture), requests.map((r) => r.id));
  const [o, s] = requests; assert.ok(o.at[0] >= 0 && o.at[1] >= 0 && o.at[0] + 96 <= 432 && o.at[1] + 96 <= 272, "the open window lies inside its master: no transparent edge");
  assert.ok(-s.at[0] >= 0 && -s.at[1] >= 0 && -s.at[0] + 80 <= 96 && -s.at[1] + 56 <= 96, "the sealed crate (80 × 56) lies whole inside its window, at (−at)");
});
