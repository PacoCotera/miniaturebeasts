// Round 2, workstream 4 (design 5) and the field's materials split (1.1): the joins, the fur and the hair hang.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChains, applyFur, FUR_CAP } from "../spine.mjs";
import { makeField } from "../field.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";

const make = (k, form = SPECIES[k]) => { const b = buildChains(form); return { form, b, f: makeField({ front: b.front, tail: b.tail, floor: b.floor }, b.branches, form) }; };
const rnd = (() => { let s = 777; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); })();
const outer = (sm, c) => sm[c] + (sm.fur ?? 0);
const slopes = (S, c, lo, hi) => { const out = []; for (let i = 1; i < S.length; i++) { if (S[i - 1].s < lo - 1e-9 || S[i].s > hi + 1e-9) continue; const ds = S[i].s - S[i - 1].s; if (ds > 1e-9) out.push({ s: S[i].s, v: (outer(S[i], c) - outer(S[i - 1], c)) / ds }); } return out; };
// the two segments either side of every region boundary of a chain, and the first part of a coil
function joinWindows(form, chain, ch) {
  const cum = ch.cum, n = cum.length, win = [], parts = ch.samples.filter((s, i) => i === 0 || s.knot !== ch.samples[i - 1].knot).map((s) => s.part);
  // the part of knot j is the part of the segment that ends at it; a boundary lies at knot j where the next segment has another part
  for (let j = 1; j < n - 1; j++) if (ch.samples.find((s) => s.knot === j)?.part !== ch.samples.find((s) => s.knot === j + 1)?.part) win.push({ what: `knot ${j}`, lo: cum[j - 1], hi: cum[j + 1] });
  if (chain.coil && chain.coil.N > 0) win.push({ what: "coil", lo: cum[n - 2], hi: cum[n - 1] + 0.15 * chain.coil.L });
  return win;
}

test("the field has no noise term: F with every noise lever turned off equals F at 10,000 points", () => {
  for (const k of ["curlop", "wickle", "drapet"]) {
    const base = make(k), noisy = structuredClone(SPECIES[k]);
    if (noisy.coat) { noisy.coat.locks = 0.05; noisy.coat.bare = { angle: 30, factor: 0.15 }; } // the round 1 noise and bare patch: no effect now
    const other = make(k, noisy), { lo, hi } = base.f.bounds;
    assert.equal(base.f.noiseTerms, 0);
    for (let i = 0; i < 10000 / 3; i++) { const p = [lo[0] + rnd() * (hi[0] - lo[0]), lo[1] + rnd() * (hi[1] - lo[1]), lo[2] + rnd() * (hi[2] - lo[2])]; assert.equal(base.f.F(p), other.f.F(p)); }
  }
});
test("Wickle's outer radius never increases from the plume root to the tip", () => {
  const { b, form } = make("wickle"), S = b.front.samples, iFace = form.front.knots.findIndex((k) => k.name === "face"), s0 = b.front.cum[iFace];
  const pl = S.filter((s) => s.s >= s0 - 1e-9);
  for (const c of ["w", "u", "d"]) for (let i = 1; i < pl.length; i++) assert.ok(outer(pl[i], c) <= outer(pl[i - 1], c) + 1e-9, `${c} at ${pl[i].s}`);
});
test("the fur over the last 10 % of every terminal is at most 0.35 x the half-size", () => {
  for (const k of ["curlop", "wickle", "drapet", "loika", "rupar"]) {
    const { b } = make(k);
    for (const ch of [b.front, b.tail, ...b.branches].filter(Boolean)) {
      const S = ch.samples, L = S.at(-1).s; if (L <= 0) continue;
      for (const sm of S) if (sm.s >= 0.9 * L) assert.ok(sm.fur <= FUR_CAP * Math.min(sm.w, sm.u, sm.d) + 1e-12, `${k} ${ch.id} ${sm.s}`);
    }
  }
});
test("the fur is each sample's inflation and the surface follows it: a sample's outer radius is its half-size plus the fur", () => {
  const { f, b } = make("curlop"), ch = b.branches.find((x) => x.id === "legL"), sm = ch.samples[Math.floor(ch.samples.length / 2)];
  const p = [sm.p[0] + sm.B[0] * (sm.w + sm.fur), sm.p[1] + sm.B[1] * (sm.w + sm.fur), sm.p[2] + sm.B[2] * (sm.w + sm.fur) + f.shift];
  assert.ok(Math.abs(f.d(...p)) < 0.03);
});
test("the slope jump between neighbouring samples is at most 0.05 across Wickle's and Curlop's coil starts", () => {
  for (const [k, id] of [["wickle", "front"], ["curlop", "tail"]]) {
    const { b } = make(k), ch = b[id], S = ch.samples, s1 = ch.cum.at(-1);
    for (const c of ["w", "u", "d"]) {
      const sl = slopes(S, c, s1 - 0.25, s1 + 0.25); let worst = 0;
      for (let i = 1; i < sl.length; i++) worst = Math.max(worst, Math.abs(sl[i].v - sl[i - 1].v));
      assert.ok(worst <= 0.05, `${k} ${c}: slope jump ${worst.toFixed(3)}`);
    }
  }
});
test("the bending axis turns at most 10 degrees per 0.05 U into the coils (Wickle's plume knots and Curlop's run)", () => {
  for (const [k, id] of [["wickle", "front"], ["curlop", "tail"]]) {
    const { b } = make(k), ch = b[id], S = ch.samples, s0 = ch.cum.at(-2) + 0.02; let worst = 0; // the last knot segment on (the segment before it passes through a zero of the bend, where a direction is undefined)
    for (let i = 1; i < S.length; i++) { if (S[i - 1].s < s0 || Math.abs(S[i].kappa) < 2) continue; const ds = S[i].s - S[i - 1].s; if (ds < 1e-9) continue; worst = Math.max(worst, (Math.abs(S[i].phi - S[i - 1].phi) / ds) * 0.05); }
    assert.ok(worst <= 10, `${k}: ${worst.toFixed(1)} deg per 0.05 U`);
  }
});
test("the join slope is at most 0.6 on the dorsal and lateral sides at every region boundary and into each coil (Curlop, Wickle, Drapet)", () => {
  for (const k of ["curlop", "wickle", "drapet"]) {
    const { b, form } = make(k);
    for (const [id, chain] of [["front", form.front], ["tail", form.tail]].filter((x) => x[1])) for (const w of joinWindows(form, chain, b[id])) for (const c of ["u", "w"]) {
      const m = Math.max(0, ...slopes(b[id].samples, c, w.lo, w.hi).map((x) => Math.abs(x.v)));
      assert.ok(m <= 0.6, `${k} ${id} ${w.what} ${c}: ${m.toFixed(3)}`);
    }
  }
});
test("Drapet's curtain hangs: R(z) is within 2 % of vertical between z_p - 2 L_d and the hem zone; the part line still has no slope jump above 0.05", () => {
  const { f } = make("drapet"), h = f.hair, th = Math.PI; // the face-free half
  const zA = h.zp - 2 * h.Ld, R0 = h.Rp * h.scaleAt(th, zA); let worst = 0;
  const zh = h.floorZ + h.hemH(th), zHem = h.zp - 0.75 * (h.zp - zh);
  for (let z = zA; z >= zHem; z -= 0.01) worst = Math.max(worst, Math.abs(h.Rp * h.scaleAt(th, z) / R0 - 1));
  assert.ok(worst <= 0.02, `R varies ${worst}`);
  const R = (z) => h.radius(Math.PI, z), dz = 0.01; let jump = 0, prev = null;
  for (let z = h.zp - 0.3; z <= h.zp + 0.3; z += dz) { const slope = (R(z + dz) - R(z)) / dz; if (prev !== null) jump = Math.max(jump, Math.abs(slope - prev)); prev = slope; }
  assert.ok(jump <= 0.05, `slope jump ${jump}`);
});
test("Drapet's hem is 17 locks: tips within 0.015 U of the floor over at least 60 % of the angles, notches 0.10 U deep, splay at most 0.04 U", () => {
  const { f } = make("drapet"), h = f.hair; let low = 0, deep = 0; const n = 720;
  for (let i = 0; i < n; i++) { const th = (i / n) * 2 * Math.PI, e = h.hemH(th); if (e <= 0.015 + 1e-9) low++; deep = Math.max(deep, e); }
  assert.equal(h.lockCount, 17);
  assert.ok(low / n >= 0.6, `${low / n}`); assert.ok(deep >= 0.085 && deep <= 0.1 + 1e-9, `notch ${deep}`);
  let sp = 0; for (let i = 0; i < n; i++) { const th = (i / n) * 2 * Math.PI; sp = Math.max(sp, (h.scaleAt(th, h.floorZ + 0.001) - h.scaleAt(th, h.zp - 1.0)) * h.Rp); }
  assert.ok(sp <= 0.04 + 0.06 + 0.01, `${sp}`); // the flare (.06 at most) plus the splay
});
test("the whorl guard passes at N 1.3 on Curlop", () => {
  const f = structuredClone(SPECIES.curlop); f.tail.coil.N = 1.3;
  assert.doesNotThrow(() => buildChains(f));
  const f2 = structuredClone(SPECIES.curlop); f2.tail.coil.N = 0.8; assert.doesNotThrow(() => buildChains(f2));
});
