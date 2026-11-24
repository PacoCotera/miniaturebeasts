// Bug #121 (greedy dead ends): seed 4, place 274, Loika 165 stood at 20,14 with her routine target at 9,15 and the greedy step never got her there.
// Routine walks now follow a short path search inside the place; she reaches the tile (or is still walking toward it), never held at 3,20.
//   node --test prototypes/exploration/tests/loika-routine-path.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const me = p => JSON.parse(p.run(`JSON.stringify(curLive().cr.filter(c => c.id === 165).map(c => [c.x, c.y, c.ind.go && c.ind.go.t ? c.ind.go.t.x + ',' + c.ind.go.t.y : null]))`))[0];

test("seed 4 place 274: Loika 165 walks round to her routine spot", () => {
  const p = makePage({ gen: 7, console: "collect", els: true, canvas: true, raf: "count" });
  p.run(`newWorld(4); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
  p.run(`S.exp.live = {}; S.day.spent = 0; S.exp.pos = "274"; enterPatch();`);
  let stuck = 0, last = null, reached = 0, trace = [];
  for (let i = 0; i < 40; i++) {
    p.run(`S.day.spent = ${Math.min(i * 4, 190)}; advance('patch', { noise: 'act' })`); p.pass(1200);
    const [x, y, t] = me(p); trace.push([x, y, t]);
    if (t && t === x + ',' + y) reached++;
    if (last && last[0] === x && last[1] === y && t && t === last[2] && t !== x + ',' + y) stuck++; else stuck = 0;
    assert.ok(stuck < 12, "never 12 turns on one tile short of her target: " + JSON.stringify(trace.slice(-14)));
    last = [x, y, t];
  }
  assert.ok(reached > 0, "she stood on a routine spot at least once: " + JSON.stringify(trace));
});
