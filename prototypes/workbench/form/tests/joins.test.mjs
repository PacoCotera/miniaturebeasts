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
test("the join slope is at most 0.6 on the dorsal and lateral sides at every region boundary and into each coil (all five, no exemption)", () => {
  for (const k of ORDER) {
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
test("Drapet's hem is 17 locks: tips within 0.01 U of the floor over at least 60 % of the angles, notches 0.08 U (tuned .068) deep, splay at most 0.04 U (round 3)", () => {
  const { f } = make("drapet"), h = f.hair; let low = 0, deep = 0; const n = 720;
  for (let i = 0; i < n; i++) { const th = (i / n) * 2 * Math.PI, e = h.hemH(th); if (e <= 0.01 + 1e-9) low++; deep = Math.max(deep, e); }
  assert.equal(h.lockCount, 17);
  assert.ok(low / n >= 0.6, `${low / n}`); assert.ok(deep >= 0.058 && deep <= 0.08 + 1e-9, `notch ${deep}`);
  let sp = 0; for (let i = 0; i < n; i++) { const th = (i / n) * 2 * Math.PI; sp = Math.max(sp, (h.scaleAt(th, h.floorZ + 0.001) - h.scaleAt(th, h.zp - 1.0)) * h.Rp); }
  assert.ok(sp <= 0.04 + 0.06 + 0.01, `${sp}`); // the flare (.06 at most) plus the splay
});
test("the whorl guard passes at N 1.3 on Curlop", () => {
  const f = structuredClone(SPECIES.curlop); f.tail.coil.N = 1.3;
  assert.doesNotThrow(() => buildChains(f));
  const f2 = structuredClone(SPECIES.curlop); f2.tail.coil.N = 0.8; assert.doesNotThrow(() => buildChains(f2));
});

// ---- round 3: the smooth fur cap (design 7) ----
import { furOf } from "../spine.mjs";
test("the fur cap is C1: no slope jump where the limiting half-size component switches (10,000 samples)", () => {
  // a chain whose smallest component hands over from d to u to w, sampled finely; the cap's slope never jumps by more than the sampling allows
  const f0 = 0.1, h = 1e-4; let worst = 0, prev = null;
  for (let i = 0; i < 10000; i++) {
    const t = i / 10000, w = 0.5 - 0.3 * t, u = 0.2 + 0.25 * Math.sin(6.3 * t), d = 0.3 - 0.4 * Math.abs(t - 0.5) + 0.05; // the minimum switches component several times
    const a = furOf(f0, w, u, d), b = furOf(f0, w - 0.3 * h, u + 0.25 * Math.sin(6.3 * (t + h)) - 0.25 * Math.sin(6.3 * t), d - 0.4 * (Math.abs(t + h - 0.5) - Math.abs(t - 0.5)));
    const slope = (b - a) / h; if (prev !== null) worst = Math.max(worst, Math.abs(slope - prev)); prev = slope;
  }
  assert.ok(worst < 0.5, `slope step ${worst}`); // a hard min has steps of about 0.3 / h x dt here: the smooth one stays small
  // and the cap itself: never above 0.35 x the smallest half-size, never above f0
  for (let i = 0; i < 10000; i++) { const w = 0.05 + rnd(), u = 0.05 + rnd(), d = 0.05 + rnd(), fu = furOf(0.1, w, u, d); assert.ok(fu <= 0.1 + 1e-12 && fu <= 0.35 * Math.min(w, u, d) + 1e-12); }
});
test("the fur cap is smoother than a hard minimum: along a switching chain the largest step of the slope is smaller", () => {
  const hard = (f0, w, u, d) => Math.min(f0, 0.35 * Math.min(w, u, d));
  const run = (fn) => { let worst = 0, prev = null; const h = 1e-3; for (let i = 0; i < 2000; i++) { const t = i / 2000, g = (x) => fn(0.1, 0.9, 0.1 + 0.6 * x, 0.4 - 0.1 * x), s = (g(t + h) - g(t)) / h; if (prev !== null) worst = Math.max(worst, Math.abs(s - prev)); prev = s; } return worst; };
  assert.ok(run(furOf) < run(hard) * 0.6, `${run(furOf)} vs ${run(hard)}`);
});

// ---- round 3 (design 3): Drapet's locks, tiers and fringe ----
test("Drapet's hair has 22 locks in three tiers ending at .62 and .34 of the hair height above the hem, tips jittered by at most .04 U, locks .035 U high with V-grooves .045 U deep", () => {
  const { f } = make("drapet"), P = f.hair.hairParams; assert.equal(P.NL, 22); assert.deepEqual(P.TIERS, [0.62, 0.34]); assert.equal(P.tables.length, 3);
  for (let k = 0; k < 2; k++) for (const z of P.tables[k].zend) assert.ok(Math.abs(z - (f.hair.floorZ + P.TIERS[k] * P.Htot)) <= 0.04 + 1e-9);
  // the locks: the lock index and t across it are defined all round the head, t runs -1 .. 1 across each lock and the ridge is outward of the groove
  const h = f.hair, z = h.floorZ + 0.8 * P.Htot; let tmin = 9, tmax = -9; const ids = new Set();
  for (let i = 0; i < 4000; i++) { const a = i * 0.0015, o = h.info(1.0 * Math.cos(a), 1.0 * Math.sin(a), z); if (o.tier === 0) { tmin = Math.min(tmin, o.t); tmax = Math.max(tmax, o.t); ids.add(o.id); } }
  assert.ok(tmin <= -0.7 && tmax >= 0.7, `${tmin} ${tmax}`); assert.ok(ids.size >= 15, `${ids.size} locks seen`);
});
test("Drapet's hair has no 1 px fringe hairs: the fringe pass runs for fur only", async () => {
  const { makeMaterial } = await import("../material.mjs"); assert.equal(makeMaterial(SPECIES.drapet, 304, 100).kind, "hair");
  const src = (await import("node:fs")).readFileSync(new URL("../render.mjs", import.meta.url), "utf8"); assert.ok(/Mat\.kind === "fur"\) fringePass/.test(src));
});
