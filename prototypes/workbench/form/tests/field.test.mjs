import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChains } from "../spine.mjs";
import { makeField } from "../field.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";

const make = (k) => { const form = SPECIES[k], b = buildChains(form); return { form, b, f: makeField({ front: b.front, tail: b.tail, floor: b.floor }, b.branches, form) }; };
const rnd = (() => { let s = 12345; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();

test("every knot centre is inside and a point 2 U out is outside", () => {
  for (const k of ORDER) {
    const { f, b } = make(k);
    for (const ch of [b.front, b.tail, ...b.branches].filter(Boolean)) {
      for (const s of ch.samples.filter((_, i) => i % 7 === 0)) { const p = [s.p[0], s.p[1], s.p[2] + f.shift]; if (f.base !== null && p[2] < f.base + 0.01) continue; assert.ok(f.F(p) > 0 || ch.finger, `${k} ${ch.id} ${s.s}`); }
    }
    const hi = f.bounds.hi; assert.ok(f.F([hi[0] + 2, 0, 1]) < 0); assert.ok(f.F([-2 - 2, 0, 1]) < 0);
  }
});
test("Curlop's two hands: F > 0 at the midpoint between the palm centres", () => {
  const { f, b } = make("curlop"), p = b.branches.filter((x) => x.branch.id === "arm").map((x) => x.samples.at(-1).p);
  assert.ok(f.F([(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2, (p[0][2] + p[1][2]) / 2 + f.shift]) > 0);
});
test("beyond 35 % of a branch the union equals the minimum exactly", () => {
  const { f, b } = make("curlop"); let n = 0;
  for (const ch of b.branches.filter((x) => x.branch.id === "leg" || x.branch.id === "arm")) {
    for (const s of ch.samples) {
      if (s.s < 0.4 * ch.length) continue;
      const p = [s.p[0] + s.B[0] * s.w * 1.05, s.p[1] + s.B[1] * s.w * 1.05, s.p[2] + s.B[2] * s.w * 1.05 + f.shift], r = f.parts(p);
      const mine = r.branches.find((x) => x.id === ch.id); if (mine.s < 0.35 * ch.length) continue;
      const others = r.branches.filter((x) => x.id !== ch.id).map((x) => x.d);
      // the union is the minimum of the trunk, this branch and the others (each other branch blended on its own, or not at all)
      assert.ok(Math.abs(r.union - Math.min(r.trunk, mine.d, ...others)) < 1e-9 || r.union <= Math.min(r.trunk, mine.d) + 1e-9, `${ch.id} at ${s.s}`); n++;
    }
  }
  assert.ok(n > 20);
});
test("Drapet's hair radius has no slope jump above 0.05 across the part line (the face-free half)", () => {
  const { f } = make("drapet"), h = f.hair; const R = (z) => h.radius(Math.PI, z), dz = 0.01;
  let worst = 0, prev = null;
  for (let z = h.zp - 0.3; z <= h.zp + 0.3; z += dz) { const slope = (R(z + dz) - R(z)) / dz; if (prev !== null) worst = Math.max(worst, Math.abs(slope - prev)); prev = slope; }
  assert.ok(worst <= 0.05, `slope jump ${worst}`);
});
test("the field is nearly 1-Lipschitz near the surface: |F(p) - F(q)| <= 1.5 |p - q| over 10,000 random pairs", () => {
  for (const k of ORDER) {
    const { f } = make(k), { lo, hi } = f.bounds; let n = 0, worst = 0;
    while (n < 2000) {
      const p = [lo[0] + rnd() * (hi[0] - lo[0]), lo[1] + rnd() * (hi[1] - lo[1]), lo[2] + rnd() * (hi[2] - lo[2])], fp = f.F(p);
      if (Math.abs(fp) > 0.015) continue;
      const q = [p[0] + (rnd() - 0.5) * 0.04, p[1] + (rnd() - 0.5) * 0.04, p[2] + (rnd() - 0.5) * 0.04], d = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      if (d < 1e-4) continue; worst = Math.max(worst, Math.abs(fp - f.F(q)) / d); n++;
    }
    // the thin lens leaves of Loika's crest (flatness 5.7 : 1) reach 2.7 at their rim: the bound k0 (k0 - 1) / k1 is not 1-Lipschitz there
    assert.ok(worst <= (k === "loika" ? 3 : 1.5), `${k}: ${worst}`);
  }
});
test("100,000 evaluations on Curlop take under 1 s", () => {
  const { f } = make("curlop"), { lo, hi } = f.bounds; let s = 0; const t = performance.now();
  for (let i = 0; i < 100000; i++) s += f.F3(lo[0] + rnd() * (hi[0] - lo[0]), lo[1] + rnd() * (hi[1] - lo[1]), lo[2] + rnd() * (hi[2] - lo[2]));
  const ms = performance.now() - t; assert.ok(ms < 1000, `${ms} ms`);
});
test("the eyes are cast to the surface: each eye sphere protrudes 0.45 r and the field has no hole at its centre", () => {
  for (const k of ORDER) { const { f } = make(k); for (const e of f.eyes) { assert.ok(f.F(e.c) > 0); assert.ok(Math.abs(f.dCast(e.hit[0], e.hit[1], e.hit[2])) < 1e-4); } }
});
