// PR 575 fault (AD bus 2dc7cbc67a): the near card's sample line 'You took a tuft · it goes home in the Case' ran over the box edge.
// Every line the field card draws in its sample box (panel 26, 452, 398 × 90) must sit inside x 26..424, y 452..542, at 450 wide.
//   node --test prototypes/exploration/tests/card-sample-box.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const p = makePage({ store: {}, gen: 6, anonPods: true });
p.run("globalThis.DRAWN = []; text = (s, x, y, col, sc) => { DRAWN.push({ s: String(s), x, y, col, sc: sc || 2 }); }; panel = () => {}; drawPoseAt = () => {}");
const draw = card => p.run(`DRAWN.length = 0; S.ui = { card: ${JSON.stringify(card)} }; drawCard(); DRAWN.filter(d => d.y >= 452).map(d => ({ ...d, w: textW(d.s, d.sc || 2) }))`);
const base = { k: "loika", range: "near", entry: { who: "Loika", text: "x" }, data: false, pose: 0, saddled: false, clear: true };
const find = { text: "It let you take a tuft from its coat, and watched you do it." };

for (const item of ["tuft", "whisker", "shed claw"]) {
  test(`the sample box keeps every line inside its box: ${item}`, () => {
    for (const card of [{ ...base, sample: item === "shed claw" ? "claw" : item, findEntry: find }, { ...base, sample: item === "shed claw" ? "claw" : item, findEntry: { text: find.text + " " + find.text } },
      { ...base, noRoom: true, findEntry: null }, { ...base, range: "far", findEntry: null }, { ...base, findEntry: null }]) {
      const lines = draw(card);
      assert.ok(lines.length >= 1 && lines.length <= 3, "one to three lines in the box: " + lines.length);
      for (const l of lines) {
        assert.ok(l.x >= 26 && l.x + l.w <= 424, `"${l.s}" runs x ${l.x}..${l.x + l.w}, outside 26..424`);
        assert.ok(l.y >= 452 && l.y + 18 <= 542, `"${l.s}" at y ${l.y} leaves y 452..542`);
      }
    }
  });
}
