import { test } from "node:test";
import assert from "node:assert/strict";
import { K, integrateChain, headingFrame, buildChains, GuardError, checkCoil, coilParams } from "../spine.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";

const frame0 = { p: [0, 0, 0], ...headingFrame(0) };
const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

test("a straight chain is exactly the sum of its steps long and lies on a line", () => {
  const c = integrateChain({ knots: [K("a", "0|.5"), K("b", "1|.4"), K("c", "2|.3")], frame0 });
  assert.ok(Math.abs(c.length - 3) < 1e-12);
  const end = c.samples.at(-1).p; assert.ok(Math.abs(len([0, 0, 0], end) - 3) < 1e-9);
  for (const s of c.samples) { assert.ok(Math.abs(s.p[1]) < 1e-12 && Math.abs(s.p[2]) < 1e-12); }
});
test("kappa = 90 degrees per U for 4 U closes a circle to 0.5 % of its length", () => {
  const c = integrateChain({ knots: [K("a", "0 90|.2"), K("b", "4 90|.2")], frame0 });
  assert.ok(len(c.samples.at(-1).p, [0, 0, 0]) < 0.005 * 4);
});
test("a positive kappa turns toward N (dorsal)", () => {
  const c = integrateChain({ knots: [K("a", "0 30|.2"), K("b", "1 30|.2")], frame0 });
  const T = c.samples.at(-1).T, N0 = frame0.N; assert.ok(T[0] * N0[0] + T[1] * N0[1] + T[2] * N0[2] > 0.3);
});
test("the step is 0.22 of the smallest half-size, clamped to 0.004-0.06 U", () => {
  const a = integrateChain({ knots: [K("a", "0|.5"), K("b", "1|.5")], frame0 }), b = integrateChain({ knots: [K("a", "0|.05"), K("b", "1|.05")], frame0 }), c = integrateChain({ knots: [K("a", "0|.005"), K("b", ".2|.005")], frame0 });
  const step = (ch) => ch.samples[1].s - ch.samples[0].s;
  assert.ok(Math.abs(step(a) - 0.06) < 0.002); assert.ok(Math.abs(step(b) - 0.011) < 0.002); assert.ok(step(c) >= 0.0035 && step(c) <= 0.0045);
});
for (const [name, coil] of [["Curlop", SPECIES.curlop.tail.coil], ["Wickle", SPECIES.wickle.front.coil]]) {
  test(`${name}'s coil turns 360 N +- 1 deg, ends at a0 W^-N x 0.25 +- 2 %, and a/rho is constant over its middle 80 %`, () => {
    const last = { w: 0.3, u: 0.28, d: 0.27, name: "last" };
    const c = integrateChain({ knots: [K("a", "0|.3 .28 .27")], coil, frame0 });
    const p = coilParams(coil, last);
    let turn = 0; const S = c.samples;
    for (let i = 1; i < S.length; i++) { const a = S[i - 1].T, b = S[i].T; turn += Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])); }
    assert.ok(Math.abs((turn * 180) / Math.PI - 360 * coil.N) < 1, `turn ${(turn * 180) / Math.PI}`);
    const tip = S.at(-1), a0 = Math.hypot(0.3 * Math.sin((coil.plane * Math.PI) / 180), 0.28 * Math.cos((coil.plane * Math.PI) / 180));
    assert.ok(Math.abs(tip.u / 0.28 - Math.pow(coil.W, -coil.N) * 0.25) / (Math.pow(coil.W, -coil.N) * 0.25) < 0.02);
    // a / rho = half-size x curvature, over the middle 80 %
    const rs = []; const L = coil.L;
    for (let i = 1; i < S.length - 1; i++) { const x = S[i].s / L; if (x < 0.1 || x > 0.9) continue; const k = Math.abs(S[i].kappa) * Math.PI / 180; const a = Math.hypot(S[i].w * Math.sin((coil.plane * Math.PI) / 180), S[i].u * Math.cos((coil.plane * Math.PI) / 180)); rs.push(a * k); }
    const mean = rs.reduce((a, b) => a + b, 0) / rs.length; for (const r of rs) assert.ok(Math.abs(r / mean - 1) < 0.03, `a/rho varies ${r / mean}`);
    assert.ok(p.ratio < 0.9);
  });
}
test("the guards throw with the knot named on a built case, and pass the five species", () => {
  assert.throws(() => integrateChain({ knots: [K("a", "0|.3"), K("lastknot", ".5|.3")], coil: { N: 0.9, W: 1.6, L: 0.3, plane: 0 }, frame0 }), (e) => e instanceof GuardError && /lastknot/.test(e.message) && e.guard === "coil");
  assert.throws(() => integrateChain({ knots: [K("a", "0|.05"), K("whorl", ".5|.05")], coil: { N: 2, W: 1.6, L: 1.5, plane: 0 }, frame0 }), (e) => e instanceof GuardError && e.guard === "whorls" && /whorl/.test(e.message));
  for (const k of ORDER) assert.doesNotThrow(() => buildChains(SPECIES[k]), k);
});
test("no sample's half-size leaves the range of its two neighbouring knots", () => {
  for (const k of ORDER) {
    const f = SPECIES[k], ch = buildChains(f).front, ks = f.front.knots;
    let cum = 0; const cums = ks.map((x) => (cum += x.ds));
    for (const s of ch.samples) {
      if (s.s > cums.at(-1) + 1e-9) continue;
      let i = 0; while (i < ks.length - 2 && s.s > cums[i + 1] + 1e-12) i++;
      for (const c of ["w", "u", "d"]) { const lo = Math.min(ks[i][c], ks[i + 1][c]), hi = Math.max(ks[i][c], ks[i + 1][c]); assert.ok(s[c] >= lo - 1e-9 && s[c] <= hi + 1e-9, `${k} ${c} at ${s.s}`); }
    }
  }
});
test("the tail chain starts at the pelvis with -T and N stays dorsal (the spine is C1 through it)", () => {
  const b = buildChains(SPECIES.curlop), f = b.front.samples[0], t = b.tail.samples[0];
  for (let a = 0; a < 3; a++) { assert.ok(Math.abs(f.T[a] + t.T[a]) < 1e-12); assert.ok(Math.abs(f.N[a] - t.N[a]) < 1e-12); }
});
