// Round 2, workstream 3 (design 4): limbs reach the floor, the shin solve, mirrored tail branches, hands by target, toes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChains, spineGuards } from "../spine.mjs";
import { makeField } from "../field.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { SOLVE } from "../limbs.mjs";

const make = (k, form = SPECIES[k]) => { const b = buildChains(form); return { form, b, f: makeField({ front: b.front, tail: b.tail, floor: b.floor }, b.branches, form) }; };

test("every foot and seat lands on the floor within 0.005 U on the type (the base cut hovers by its declared amount)", () => {
  for (const k of ORDER) {
    const { b } = make(k);
    for (const c of b.contacts) { if (c.id === "base") { assert.ok(Math.abs(c.z - b.floor - (SPECIES[k].hover ?? 0)) < 1e-9, `${k} base`); continue; } assert.ok(Math.abs(c.z - b.floor) <= 0.005 + 1e-9, `${k} ${c.id}: ${(c.z - b.floor).toFixed(4)}`); }
    assert.ok(b.contacts.length >= 1); assert.deepEqual(spineGuards(SPECIES[k], b).filter((p) => /contact|solve/.test(p)), [], k);
  }
});
test("the solved shin stays within 0.5-1.6 x its base value and the floor miss is at most 0.005 U", () => {
  for (const k of ["curlop", "wickle", "loika", "rupar"]) {
    const { b } = make(k); assert.ok(b.solves.length >= 2, k);
    for (const s of b.solves) { assert.ok(s.ratio >= SOLVE.lo && s.ratio <= SOLVE.hi, `${k} ${s.id}: ${s.ratio}`); assert.ok(Math.abs(s.dz) <= SOLVE.tol + 1e-9, `${k} ${s.id}: dz ${s.dz}`); }
  }
});
test("a branch on the tail chain at +90 degrees lands at y > 0 (the angle is mirrored there)", () => {
  const f = structuredClone(SPECIES.curlop); f.branches[0].root.angle = 90; f.branches[0].solve = false;
  const b = buildChains(f), L = b.branches.find((x) => x.id === "legL"), R = b.branches.find((x) => x.id === "legR");
  assert.ok(L.rootPoint[1] > 0.1 && R.rootPoint[1] < -0.1, `${L.rootPoint} ${R.rootPoint}`);
  const g = structuredClone(SPECIES.curlop); g.branches[0].parent = "front"; g.branches[0].root = { sigma: 0.3, angle: 90, out: 0.75 };
  const bf = buildChains(g); assert.ok(bf.branches.find((x) => x.id === "legL").rootPoint[1] > 0.1);
});
test("Curlop's hands: F > 0 between the palms, the palms within 0.08 U of y = 0 and in front of the belly", () => {
  const { b, f } = make("curlop"), palms = b.branches.filter((x) => x.branch.id === "arm").map((x) => x.samples.at(-1).p);
  assert.equal(palms.length, 2);
  assert.ok(f.F([(palms[0][0] + palms[1][0]) / 2, (palms[0][1] + palms[1][1]) / 2, (palms[0][2] + palms[1][2]) / 2 + f.shift]) > 0);
  for (const p of palms) assert.ok(Math.abs(p[1]) <= 0.08, `y ${p[1]}`);
  const chest = b.front.samples.reduce((a, s) => (Math.abs(s.sigma - 1.15) < Math.abs(a.sigma - 1.15) ? s : a));
  for (const p of palms) assert.ok(-((p[0] - chest.p[0]) * chest.N[0] + (p[1] - chest.p[1]) * chest.N[1] + (p[2] - chest.p[2]) * chest.N[2]) >= chest.d - 1e-6, "the palm lies beyond the belly's surface");
  for (const r of b.reaches) assert.ok(r.miss < 0.01, `${r.id} misses by ${r.miss}`);
});
test("Wickle's base cut is 0.03 U above the floor and its feet are the contacts", () => {
  const { f, b } = make("wickle"); assert.ok(Math.abs(f.base - 0.03) < 1e-9, `${f.base}`);
  assert.ok(b.contacts.filter((c) => /^foot/.test(c.id)).length === 2);
});
test("toe chains are present on every foot of Curlop and Loika, pointed forward and down", () => {
  for (const [k, ids] of [["curlop", ["leg"]], ["loika", ["hind", "fore"]]]) {
    const { b } = make(k);
    for (const id of ids) for (const side of ["L", "R"]) {
      const toes = b.branches.filter((x) => x.toe && x.id.startsWith(`${id}${side}t`)); assert.equal(toes.length, 3, `${k} ${id}${side}`);
      for (const t of toes) { const T = t.samples.at(-1).T; assert.ok(T[0] > 0.5 && T[2] < 0, `${t.id}: ${T}`); }
    }
  }
});
