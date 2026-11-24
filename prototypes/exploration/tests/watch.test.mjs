// W6b: the watch view's pure rules: the beat, the pose per beat, the chip's words (the range rule gives by range only).
//   node --test prototypes/exploration/tests/watch.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { beatOf, poseOf, stripPoses, chipOf, giveWords, givesNow } from "../src/watch.mjs";
import { BEATS } from "../src/habits.mjs";

test("the beat follows the tell: -1 while it goes on, then 0 to 3", () => {
  assert.equal(beatOf({ n: 0, tell: 3 }), -1);
  assert.equal(beatOf({ n: 2, tell: 3 }), -1);
  assert.equal(beatOf({ n: 3, tell: 3 }), 0);
  assert.equal(beatOf({ n: 6, tell: 3 }), 3);
  assert.equal(beatOf({ n: 9, tell: 3 }), BEATS - 1);
});

test("the pose of each beat: shake-dry shakes for three beats and stands, calm settles, sleep curls", () => {
  assert.deepEqual(stripPoses("shake"), ["shake", "shake", "shake", "stand"]);
  assert.deepEqual(stripPoses("calm"), ["stand", "stand", "calm", "calm"]);
  assert.deepEqual(stripPoses("sleep"), ["stand", "curl", "curl", "curl"]);
  for (const k of ["shake", "calm", "sleep"]) assert.equal(poseOf(k, -1), "stand", "the tell: she stands");
});

test("the chip says the range, the tiles and what this range gives now", () => {
  assert.equal(chipOf({ range: "mid", tiles: 4, gives: givesNow("mid", true, true), left: null }).text, "mid · 4 tiles · her coat");
  assert.equal(chipOf({ range: "far", tiles: 7, gives: givesNow("far", true, true), left: null }).text, "far · 7 tiles · where she goes");
  assert.equal(chipOf({ range: "far", tiles: 7, gives: givesNow("far", false, true), left: null }).gives, "only her shape from here", "rain or fog");
  assert.equal(chipOf({ range: "far", tiles: 7, gives: givesNow("far", true, false), left: null }).gives, "only her shape from here", "from dusk");
  const near = chipOf({ range: "near", tiles: 1, gives: givesNow("near", true, true), left: 6 });
  assert.equal(near.tiles, "1 tile"); assert.equal(near.stay, "stay 6"); assert.equal(near.text, "near · 1 tile · her face, and a sample · stay 6");
  assert.equal(giveWords([]), "only her shape from here");
});
