// Her page's stage picture (station-match-3 slice 1a): one opaque picture of the region's size, composed from the game's own masters (the room, her adult master) with interface marks drawn by code.
//   node --test prototypes/station/tests/page-stage.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pageStagePicture } from "../src/reading-pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/pods.json"), "utf8")), R = spec.regions.page;
const req = (over = {}) => ({ species: "S01", size: R.rect.slice(2), body: { x: 79, y: 68, w: 334 }, spots: [{ chapter: "coat", at: [97, 193], line: [119, 217, 156, 246], ring: "0,0,0" }, { chapter: "face", at: [448, 195], line: [435, 202, 392, 225], ring: "" }], hand: "coat", tag: [410, 18, 104, 30], radius: 14, keys: [[22, 366, 34, 34], [474, 366, 34, 34]], ...over });
const at = (px, W, x, y) => [0, 1, 2, 3].map((k) => px[(y * W + x) * 4 + k]);

test("the stage is one opaque picture of the region's size, the same bytes for the same request", () => {
  const [W, H] = R.rect.slice(2), a = pageStagePicture(req()), b = pageStagePicture(req());
  assert.equal(a.length, W * H * 4); for (let i = 3; i < a.length; i += 4 * 997) assert.equal(a[i], 255, "opaque"); assert.deepEqual(a, b);
});
test("the ring on the chapter in hand is orange round the chip, a chip without a ring is a dark disc, and the tag's pill and the two keys are drawn", () => {
  const [W] = R.rect.slice(2), px = pageStagePicture(req()), orange = ([r, g, b]) => r > 200 && g > 90 && g < 160 && b < 90;
  assert.ok(orange(at(px, W, 97 + 43, 193)), "the focus circle's orange border at its radius"); assert.ok(!orange(at(px, W, 448 + 43, 195)), "no ring on a chip that is not in hand");
  const noRing = pageStagePicture(req({ spots: [{ chapter: "coat", at: [97, 193], line: [119, 217, 156, 246], ring: "" }] })); assert.ok(!orange(at(noRing, W, 97 + 43, 193)), "no ring when the chip is not the chapter in hand");
  assert.ok(at(px, W, 415, 40)[0] < 60, "the tag's pill is dark under its word"); assert.ok(orange(at(px, W, 474 + 6, 366 + 17)), "the ✓ key's disc is orange");
});
