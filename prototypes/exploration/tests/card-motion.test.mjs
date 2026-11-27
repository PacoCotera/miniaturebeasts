// #175: the cards move a little, from their own pixels only (no new colours, no drawing), one rhythm, the still is untouched
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodePNG } from "../../ui/png.mjs";
import { cardFrames, cardStep, gridOf, CARD_BEAT } from "../src/card-motion.mjs";

const load = (k) => decodePNG(readFileSync(new URL(`../art/cards/${k}-card-450x600.png`, import.meta.url))).data;
const key = (a, i) => a[i] << 16 | a[i + 1] << 8 | a[i + 2];

for (const k of ["night", "dusk", "dawn"]) {
  test(`the ${k} card loop: 4 frames, only the card's own colours, a small part moves`, () => {
    const rgba = load(k), still = gridOf(rgba), fr = cardFrames(k, rgba);
    assert.equal(fr.length, 4);
    const own = new Set(); for (let i = 0; i < still.length; i += 3) own.add(key(still, i));
    const moved = new Set();
    for (const f of fr) for (let i = 0; i < f.length; i += 3) { assert.ok(own.has(key(f, i)), "a colour the card does not have"); if (key(f, i) !== key(still, i)) moved.add(i); }
    assert.ok(moved.size > 0, "something moves");
    assert.ok(moved.size < still.length / 3 * 0.15, `a small part of the card (${moved.size} px)`);
  });
}

test("the rhythm: ping-pong for the breath and the drift, in order for the fireflies; the card's clock starts at its first step", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => cardStep("dusk", i * CARD_BEAT.dusk.ms)), [0, 1, 2, 1, 0, 1]);
  assert.deepEqual([0, 1, 2, 3, 4].map(i => cardStep("night", i * CARD_BEAT.night.ms)), [0, 1, 2, 3, 0]);
  assert.equal(cardStep("dawn", -50), 0);
});
