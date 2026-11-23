// wild-marking-named-2: each realm's named Loikas include one that shows the marking (chosen from the realm's seed); the others keep the 0.35 draw.
//   node --test prototypes/exploration/tests/wild-marking-named.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makePage } from "./page-harness.mjs";
import { setFrames, wildGenome, markedLoika } from "../../station/src/genome.mjs";
import { marksShown } from "../../station/src/looks.mjs";

const FR = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));
setFrames([FR]);

test("200 seeds: every realm has one marked Loika, the same one each time; the rest keep the 0.35 draw", () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true });
  let others = 0, shown = 0, noLoika = 0;
  for (let seed = 1; seed <= 200; seed++) {
    p.run(`newWorld(${seed})`);
    const ids = p.run("S.cr.filter(q => q.sp === 0 && !q.cv).map(q => q.id)"), s = p.run("S.seed");
    if (!ids.length) { noLoika++; continue; }
    const m = markedLoika(s, ids);
    assert.ok(ids.includes(m), "seed " + seed);
    assert.equal(markedLoika(s, ids.slice().reverse()), m, "same seed, same Loika");
    assert.ok(marksShown(FR, { genome: wildGenome(FR, s, m, m), read: ["coat"] }), "seed " + seed + ": the picked one shows it");
    for (const id of ids.filter(q => q !== m).slice(0, 10)) { others++; if (marksShown(FR, { genome: wildGenome(FR, s, id, m), read: ["coat"] })) shown++; assert.deepEqual(wildGenome(FR, s, id, m), wildGenome(FR, s, id), "the others are as before"); }
  }
  assert.equal(noLoika, 0, "every realm has Loikas");
  console.log(`others: ${others}, shown ${(100 * shown / others).toFixed(1)}%`);
  assert.ok(shown / others > 0.07 && shown / others < 0.18, "the others keep about the 0.35 draw (about 12%)");
});
