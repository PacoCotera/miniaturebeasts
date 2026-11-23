// Bug #121 (owner note mwtcj6lafb0e01, "those two loikas got stuck"): seed 14, place 220, Loika 152 at 8,24 (cliff N and E) with Loika 153 resting at 7,24;
// the only free tile is the one she came from, which stepToward refused. After 3 turns with no step she turns round, and the pair unsticks.
//   node --test prototypes/exploration/tests/loika-held-turns-round.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";
import { DAY } from "../src/words.mjs";

const at = p => JSON.parse(p.run(`JSON.stringify(curLive().cr.filter(c => c.id === 152 || c.id === 153).map(c => [c.id, c.x, c.y, c.held || 0]))`));

test("seed 14 place 220: Loika 152, held 3 turns by 153, turns round and the pair unsticks", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(14); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = "220"; enterPatch();`);
  assert.deepEqual(at(p).map(r => r.slice(0, 3)), [[152, 8, 24], [153, 7, 24]], "the start of the case");
  let maxHeld = 0, moved = null;
  for (let i = 0; i < 40 && !moved; i++) {
    p.run(`S.day.spent = ${Math.min(i * 4 * DAY.light / 200, DAY.light - 10)}; advance('patch', { noise: 'act' })`); p.pass(1200);
    const [a] = at(p); maxHeld = Math.max(maxHeld, a[3]);
    if (a[1] !== 8 || a[2] !== 24) moved = a;
  }
  assert.ok(maxHeld >= 3, "she was held for 3 turns first");
  assert.ok(moved, "then she moved off the tile she was held on");
  for (let i = 0; i < 6; i++) { p.run(`advance('patch', { noise: 'act' })`); p.pass(1200); }
  const [a, b] = at(p);
  assert.ok(!(a[1] === 8 && a[2] === 24) || !(b[1] === 7 && b[2] === 24), "the two are not both still where they were held");
});
