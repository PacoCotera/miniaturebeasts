// Idle's walk-ground departure with the residents' recorded figures (the station checks pass them): the picture may reach past its figure, the figure may not leave the ground.
//   node --test prototypes/face/tests/idle-figs.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { departures as all } from "../tools/idle-regions.mjs";
const departures = (...a) => all(...a).filter((m) => /walk ground/.test(m));   // the synthetic log has no painting or strip: only the walk-ground finding is read

const frame = JSON.parse(readFileSync(new URL("../../ui/specs/station/frame.json", import.meta.url), "utf8"));
const log = (rect) => ({ regions: [{ id: "resident", layer: "painted", rect }], type: [] });
const fig = (figure) => [{ stage: "adult", figure }];   // a 144 x 152 adult picture
const feet = (x) => [x, 400, Math.min(144, 1024 - x), 152];   // clipped by the screen's right edge

test("a picture past the ground's right end passes when its figure is inside, fails without figures", () => {
  assert.match(departures(log(feet(887)), frame).join(), /not in the walk ground/, "no figures: the picture is measured alone");
  assert.deepEqual(departures(log(feet(887)), frame, fig([47, 93, 49, 54])), [], "the figure ends at 983, inside 1008");
});
test("a resident whose figure is outside the walk ground still fails", () => {
  assert.match(departures(log(feet(887)), frame, fig([0, 0, 144, 152])).join(), /not in the walk ground/, "a figure as wide as its picture ends at 1031");
  assert.match(departures(log([300, 408, 144, 152]), frame, fig([47, 93, 49, 54])).join(), /not in the walk ground/, "feet below the ground");
});
