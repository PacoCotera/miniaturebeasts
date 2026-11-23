// wild-marking-named-3: each realm's marked Loika is a NAMED one the player can meet (her place has haunt sites, inside the first Probe's reach) and shows the SADDLE; the others keep the 0.35 draw.
//   node --test prototypes/exploration/tests/wild-marking-named.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { setFrames, wildGenome, markedLoika } from "../../station/src/genome.mjs";
import { marksShown, saddleShown } from "../../station/src/looks.mjs";

const FR = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));
setFrames([FR]);

test("200 seeds: every realm has a marked Loika that is named, reachable on day 1-2 and saddled, the same one each time; the rest keep the 0.35 draw", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  assert.equal(p.run("PL.ready"), true);
  let others = 0, shown = 0, none = 0, day12 = 0;
  for (let seed = 1; seed <= 200; seed++) {
    p.run(`newWorld(${seed})`);
    const s = p.run("S.seed"), ids = p.run("markedCandidates()");
    const named = p.run(`markedCandidates().every(id => { const q = S.cr.find(w => w.id === id); return !!individualOf(q, layout(String(q.c))) && reachCells(G.spawns[0], TIER[2].range, {}).includes(q.c); })`);
    if (!ids.length || !named) { none++; continue; }
    if (p.run(`markedCandidates().every(id => reachCells(G.spawns[0], TIER[1].range, {}).includes(S.cr.find(w => w.id === id).c))`)) day12++;
    const m = markedLoika(s, ids);
    assert.ok(ids.includes(m), "seed " + seed);
    assert.equal(markedLoika(s, ids.slice().reverse()), m, "same seed, same Loika");
    assert.ok(saddleShown(FR, { genome: wildGenome(FR, s, m, m), read: ["coat"] }), "seed " + seed + ": she shows the saddle");
    for (const id of p.run("S.cr.filter(q => q.sp === 0 && !q.cv).map(q => q.id)").filter(q => q !== m).slice(0, 10)) { others++; if (marksShown(FR, { genome: wildGenome(FR, s, id, m), read: ["coat"] })) shown++; assert.deepEqual(wildGenome(FR, s, id, m), wildGenome(FR, s, id), "the others are as before"); }
  }
  console.log(`realms with the marked Loika named, saddled and in tier 1's reach (day 1-2): ${day12} of 200; none named in tier 2's reach either: ${none}; others: ${others}, shown ${(100 * shown / others).toFixed(1)}%`);
  assert.ok(day12 >= 185 && none <= 2, "almost every realm has her named and in the first reach (measured 189 of 200; 10 only in tier 2's reach, 1 with none: any Loika then)");
  assert.ok(shown / others > 0.07 && shown / others < 0.18, "the others keep about the 0.35 draw (about 12%)");
});
