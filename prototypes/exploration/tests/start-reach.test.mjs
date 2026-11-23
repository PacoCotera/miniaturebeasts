// start-reach-1: every start place offered on the first set-out has a named Loika in tier 1's reach (a glint without one is not offered), over 200 seeds, every start place.
//   node --test prototypes/exploration/tests/start-reach.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { makePage } from "./page-harness.mjs";

test("200 seeds: each offered start place reaches a named Loika in tier 1; dropped glints counted; no seed left with none", async () => {
  const p = makePage({ console: "silent", els: true, raf: 1, anonPods: true, gen: 7 });
  await new Promise(r => setTimeout(r, 200));
  assert.equal(p.run("PL.ready"), true);
  let dropped = 0, total = 0, none = [], droppedSeeds = 0;
  const FROM = +(process.env.SR_FROM || 1), TO = +(process.env.SR_TO || 200);   // a range, to run the 200 in parallel chunks
  for (let seed = FROM; seed <= TO; seed++) {
    p.run(`newWorld(${seed})`);
    // per glint of G.spawns: does it reach a named wild Loika in tier 1's reach?
    const reaches = p.run(`G.spawns.map(s => { const r = new Set(reachCells(s, TIER[1].range, {}).map(String)); return S.cr.some(q => q.sp === 0 && !q.cv && r.has(String(q.c)) && !!individualOf(q, layout(String(q.c)))); })`);
    const offered = p.run("startPlaces().slice()"), spawns = p.run("G.spawns.slice()");
    total += spawns.length;
    if (!reaches.some(Boolean)) { none.push(seed); assert.deepEqual(offered, spawns, "seed " + seed + ": none qualify, all stay offered"); continue; }
    assert.deepEqual(offered, spawns.filter((s, i) => reaches[i]), "seed " + seed + ": only glints with a named Loika in tier 1's reach are offered");
    const d = spawns.length - offered.length; dropped += d; if (d) droppedSeeds++;
    for (const c of offered) assert.equal(p.run(`placeValid(${c})`), true, "seed " + seed + ": offered glint is a valid start");
    for (const c of spawns.filter(s => !offered.includes(s))) assert.equal(p.run(`placeValid(${c})`), false, "seed " + seed + ": a dropped glint is not a start");
  }
  console.log(`start places: ${total} over seeds ${FROM}-${TO}; dropped ${dropped} in ${droppedSeeds} seeds; seeds with none qualifying (all kept): ${none.length} ${none.join(",")}`);
  assert.equal(none.length, 0, "no realm lacks a named Loika at every start place (measured 0 of 200; 41 glints dropped in 40 seeds)");
});
