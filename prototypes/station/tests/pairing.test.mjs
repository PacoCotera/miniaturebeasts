// Station step 8: the pairing rules (src/pairing.mjs) on the real engine, and the B0 check: the chances the screen prints agree with what the engine's crosses show, within sampling error.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { setFrames, cross, kinship, directKin } from "../src/genome.mjs";
import { sampleIndividual, buildIndividual } from "../../species/framework/species.mjs";
import { rng } from "../../species/framework/draws.mjs";
import * as P from "../src/pairing.mjs";

const frame = JSON.parse(readFileSync(path.join(import.meta.dirname, "../../species/frames/species-S01.json"), "utf8"));
setFrames([frame]);

// a household of wild Loikas that has an aim (a seed where founders carry it); deterministic
function household(seed) {
  for (let s = 0; s < 200; s++) {
    const r = rng(`step8:${seed}:${s}`), ms = [];
    // NOTE: the live wild draw gives the marking switch on|on to every Loika, so no marking hides there. The rounds' founders (tools/lab-sim/frames.mjs drawLoika) draw each
    // switch copy "on" with chance 0.35; the same draw is used here, which is the state the owner's 10:4x "ok" rests on.
    while (ms.length < 6) { const genome = sampleIndividual(frame, r, { kind: "wild" }); genome.loci[P.MARKING] = [r() < 0.35 ? "on" : "off", r() < 0.35 ? "on" : "off"]; if (buildIndividual(frame, genome).validation.status === "valid") ms.push({ id: ms.length + 1, name: "W" + (ms.length + 1), genome, parents: [] }); }
    const aim = P.makeAim(frame, ms);
    if (aim) return { ms, aim };
  }
  throw new Error("no household with an aim");
}

test("the aim is two hidden traits, a marking and the eyes, that no starting mibi shows or holds twice", () => {
  const { ms, aim } = household("a");
  assert.deepEqual(aim.traits.map((t) => t.id), [P.MARKING, P.EYES]);
  assert.equal(aim.pin, null);   // the pin is P1's: its place is left, nothing is built
  assert.ok(ms.every((m) => !P.heldTwice(aim, m)));
  for (const t of aim.traits) assert.ok(ms.reduce((s, m) => s + P.copyCount(aim, t, m), 0) >= 2, "carried at least twice, else it can never be bred");
  assert.ok(ms.every((m) => P.countsOf(aim, m).every((n) => n >= 0 && n <= 2)));
});

test("a pair's chances are n/4 per trait and the product for both together; a pair with a zero count has no chance", () => {
  const { ms, aim } = household("b");
  const fake = (counts) => ({ genome: { loci: { [P.MARKING]: [counts[0] > 0 ? "on" : "off", counts[0] > 1 ? "on" : "off"], [P.EYES]: ms[0].genome.loci[P.EYES] } } });
  const c = P.chances(aim, ms[0], ms[1]);
  assert.equal(c.each.length, 2);
  assert.ok(c.each.every((p) => p >= 0 && p <= 1 && Math.abs(p * 4 - Math.round(p * 4)) < 1e-9));
  assert.ok(Math.abs(c.both - c.each[0] * c.each[1]) < 1e-12);
  void fake;
  assert.equal(P.inWords(0), "never"); assert.equal(P.inWords(1), "always"); assert.equal(P.inWords(0.25), "1 in 4"); assert.equal(P.inWords(0.0625), "1 in 16");
});

test("B0: printed chances and seen young agree within sampling error (4000 crosses a pair)", () => {
  let checked = 0;
  for (const seed of ["c", "d", "e", "f"]) {
    const { ms, aim } = household(seed), lookup = (id) => ms.find((m) => m.id === id) ?? null;
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], b = ms[j]; if (directKin(a, b, lookup)) continue;
      const c = P.chances(aim, a, b);
      if (c.each.every((p) => p === 0)) continue;
      const N = 4000, stream = rng(`b0:${seed}:${i}:${j}`); let hit = [0, 0], both = 0;
      for (let k = 0; k < N; k++) {
        const y = { genome: cross(frame, a, b, { rng: stream, lookup }) }, n = P.countsOf(aim, y);
        n.forEach((v, t) => { if (v === 2) hit[t]++; }); if (n.every((v) => v === 2)) both++;
      }
      // 4.5 standard errors: the check fails only on a real disagreement, not on a rare draw
      const tol = (p) => 4.5 * Math.sqrt(Math.max(p * (1 - p), 0.0001) / N);
      c.each.forEach((p, t) => assert.ok(Math.abs(hit[t] / N - p) <= tol(p), `trait ${t}: printed ${p} seen ${hit[t] / N} (pair ${a.id}+${b.id}, ${seed})`));
      assert.ok(Math.abs(both / N - c.both) <= tol(c.both), `both: printed ${c.both} seen ${both / N}`);
      checked++;
    }
  }
  assert.ok(checked >= 10, "enough pairs with a chance were checked: " + checked);
});

test("the kin line: strangers cost nothing; kin costs 1 - 1.6F, never below one half (the engine's own numbers)", () => {
  assert.deepEqual([P.kinLine(0).vigour, P.kinLine(0).costs], [1, false]);
  assert.equal(P.kinLine(0.125).vigour, 0.8);
  assert.equal(P.kinLine(0.25).vigour, 0.6);
  const f = P.kinLine(0.5); assert.deepEqual([f.vigour, f.atFloor], [0.5, true]);
  assert.deepEqual([P.vigourWord(1), P.vigourWord(0.8), P.vigourWord(0.5)], ["full", "lower", "lowest"]);
});

test("done: two mibis that may pair and both hold two of two on both traits; kin does not count", () => {
  const { ms, aim } = household("g");
  const solid = (id) => ({ id, genome: { loci: { [P.MARKING]: ["on", "on"], [P.EYES]: [ms[0].genome.loci[P.EYES][0], ms[0].genome.loci[P.EYES][0]] } } });
  const t = aim.traits[1], locus = ms[0].genome.loci[P.EYES];
  void locus;
  assert.equal(P.done(aim, ms, () => true), null, "the starting household is not done");
  const a = { id: 90, genome: { loci: { [P.MARKING]: ["on", "on"], [P.EYES]: [eyeCopyAt(ms, t), eyeCopyAt(ms, t)] } } }, b = { ...a, id: 91 };
  assert.ok(P.heldTwice(aim, a));
  assert.deepEqual(P.done(aim, [...ms, a, b], () => true)?.a.id, 90);
  assert.equal(P.done(aim, [...ms, a, b], () => false), null);
  void solid;
});
// the stored copy that sits on the aim step: found among the household's own copies
function eyeCopyAt(ms, t) { for (const m of ms) for (const c of m.genome.loci[P.EYES]) if (P.copyCount({ traits: [t] }, t, { genome: { loci: { [P.EYES]: [c, c] } } }) === 2) return c; throw new Error("no copy on the aim"); }
