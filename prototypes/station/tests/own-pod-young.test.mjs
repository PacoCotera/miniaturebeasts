// pod-young-fix-1: a wild Loika's own pod is her young (the engine's cross of her wildGenome with a wild mate), the same on every load,
// and the crate keeps her as its mother (owner 2026-11-19 12:4x, 2026-11-25 10:4x).
//   node --test prototypes/station/tests/own-pod-young.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { setFrames, wildGenome, ownPodGenome, checkGenome, heritableTraits } from "../src/genome.mjs";
import * as S from "../src/state.mjs";

const FR = JSON.parse(readFileSync(new URL("../../species/frames/language/species-S01.json", import.meta.url), "utf8"));
setFrames([FR]);
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
import { LOCI, isContinuous } from "../../species/framework/catalogue.mjs";
// the continuous loci (cycle-rate, action-efficiency) are blended by the engine's own cross by design (breed to change), so a young holds a blend there, not a copy; every other heritable gene is a copy of hers
const HERITABLE = [...new Set(heritableTraits(FR).flatMap((x) => x.trait.loci))].filter((id) => !isContinuous(LOCI.get(id)));
const same = (a, b) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : JSON.stringify(a) === JSON.stringify(b));

test("200 own pods: every gene of the young shares a copy with its mother, and is the same on every load", () => {
  const seed = 11;
  for (let i = 0; i < 200; i++) {
    const mid = 1000 + i, gs = (i * 2654435761 + 17) >>> 0, mother = wildGenome(FR, seed, mid), young = ownPodGenome(FR, seed, mid, null, gs);
    assert.deepEqual(checkGenome(FR, young), [], "a valid genome");
    assert.deepEqual(young, ownPodGenome(FR, seed, mid, null, gs), "the same young every load");
    for (const id of HERITABLE) { const copies = young.loci[id];
      const m = mother.loci[id];
      if (!m) continue;
      assert.ok(copies.some((c) => m.some((d) => same(c, d))), `pod ${i}: ${id} shares no copy with her`);
    }
  }
});

test("the crate keeps her as the pod's mother and the pod's genome is her young", () => {
  const seed = 7, mid = 4242, gs = 99;
  const pod = { id: "o1", sp: 0, g: "meadow", how: "own", of: "Lark", own: mid, os: seed, om: null, gs, k: null, dv: 2 };
  const c = { id: "x1", n: 1, turn: 1, at: 0, e: 0, d: 0, s: 0, pods: [pod], met: [], explored: 1, of: 2, lines: [] };
  const sv = { v: 8, seed, wid: "w7", turn: 3, bay: [c], mibis: [], with: null, tier: 1, shield: 3 };
  const st = S.freshSt("w7", 3, 1000); S.normalize(st);
  S.dockKey(st, sv, settings, 1000); S.openBay(st, sv, settings, 1000);
  const p = st.tray.find((q) => q.id === "x1:o1");
  assert.equal(p.own, mid); assert.equal(p.of, "Lark");
  assert.deepEqual(p.genome, ownPodGenome(FR, seed, mid, null, gs));
  assert.match(S.podOrigin(p), /Lark/);
});
