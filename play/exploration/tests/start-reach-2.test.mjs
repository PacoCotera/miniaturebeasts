// start-reach-2: every offered start place has a Loika with all three haunts and its bed reached, within 3 places (E8), and the marked pick looks at the first offered start.
// Seed 45's G.spawns[0] has no Loika in reach and is not offered; the check and the marked pick now read startPlaces()[0].
//   node --test prototypes/exploration/tests/start-reach-2.test.mjs      (SR_FROM / SR_TO for a range; default the playtest list 45, 47, 49, 55, 58, 60, 61, 63-65, 67-75)
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

const LIST = [45, 47, 49, 55, 58, 60, 61, 63, 64, 65, 67, 68, 69, 70, 71, 72, 73, 74, 75];
const seeds = process.env.SR_FROM ? Array.from({ length: +process.env.SR_TO - +process.env.SR_FROM + 1 }, (_, i) => +process.env.SR_FROM + i) : LIST;

// Loikas within 3 places of the start (Chebyshev) whose water, grass, third haunt and bed are each reached (the E8 measure of playtest-world-check.mjs)
const E8 = sp => `(() => {
  S.exp.live = {}; const sc = cxy(${sp}); let ok = 0;
  for (let c = 0; c < MW * MH; c++) {
    if (!G.comp[c] || G.land[c] === L.WATER || G.island[c] || !passable(c)) continue;
    const cc = cxy(c); if (Math.max(Math.abs(cc.x - sc.x), Math.abs(cc.y - sc.y)) > 3) continue;
    if (!S.cr.some(w => w.c === c && w.sp === 0)) continue;
    const key = String(c), lay = layout(key); ensureLive(key); const { solid, at } = placeReach(lay, key), stand = (x, y) => x >= 0 && y >= 0 && x < lay.w && y < lay.h && at(x, y) && !solid(x, y);
    for (const w of S.cr) { if (w.c !== c || w.sp !== 0) continue; const ind = individualOf(w, lay); if (!ind) continue;
      if (['water', 'grass', 'third', 'bed'].every(k => { const h = ind.hs[k]; return h && (stand(h.x, h.y) || stand(h.x + 1, h.y) || stand(h.x - 1, h.y) || stand(h.x, h.y + 1) || stand(h.x, h.y - 1)); })) ok++; }
  }
  return ok;
})()`;

test("each offered start has a Loika with three haunts and bed within 3 places; the marked pick reads the first offered start", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  assert.equal(p.run("PL.ready"), true);
  let starts = 0, changed = 0;
  for (const seed of seeds) {
    p.run(`newWorld(${seed}); TEST.calm = true; startExpedition('weather', G.spawns[0]);`);
    const offered = p.run("startPlaces().slice()"), spawns = p.run("G.spawns.slice()");
    starts += offered.length; if (offered[0] !== spawns[0]) changed++;
    for (const s of offered) assert.ok(p.run(E8(s)) >= 1, `seed ${seed}: offered start ${s} has no Loika with its three haunts and bed within 3 places`);
    // the marked pick is taken from the first offered start's reach
    const ids = p.run("markedCandidates().slice()"), reach = p.run(`reachCells(${offered[0]}, TIER[2].range, {}).map(String)`);
    for (const id of ids) assert.ok(reach.includes(String(p.run(`S.cr.find(q => q.id === ${JSON.stringify(id)}).c`))), `seed ${seed}: marked Loika ${id} is outside the first offered start's reach`);
  }
  console.log(`seeds ${seeds.length}; offered starts ${starts}; first start differs from G.spawns[0] in ${changed} seeds`);
});
