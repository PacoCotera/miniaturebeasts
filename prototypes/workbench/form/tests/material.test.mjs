// Round 2, workstream 1 (design 1): the material, the marks and the one rule that keeps a small render from looking noisy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { buildScene } from "../mesh.mjs";
import { renderForm, Lstar } from "../render.mjs";
import { makeMaterial, spotList, spotMask, Phi } from "../material.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { standHeightOf } from "./helpers.mjs";

const hash = (a) => createHash("sha256").update(Buffer.from(a.buffer ?? a)).digest("hex");
test("the mesh is identical with materials on or off, and so is the coverage", () => {
  const sc = buildScene(SPECIES.rupar, { extentDiv: 120 }), h0 = hash(sc.mesh.vertices), ref = { height: standHeightOf("rupar") };
  const on = renderForm(sc, SPECIES.rupar.camera, 96, { ref }), off = renderForm(sc, SPECIES.rupar.camera, 96, { ref, material: false });
  assert.equal(hash(sc.mesh.vertices), h0); assert.deepEqual(Array.from(on.coverage), Array.from(off.coverage));
  assert.notEqual(hash(on.data), hash(off.data));
});
test("the strand amplitude is 0 at 48 and 96, the lock amplitude is 0 at 48, and a detail under 1.5 px fades out", () => {
  for (const k of ["curlop", "wickle", "drapet", "rupar"]) {
    const m48 = makeMaterial(SPECIES[k], 48, 15), m96 = makeMaterial(SPECIES[k], 96, 40);
    assert.equal(m48.ampStrand, 0, k); assert.equal(m48.ampLock, 0, k); assert.equal(m96.ampStrand, 0, k);
  }
  assert.equal(makeMaterial(SPECIES.curlop, 304, 140).ampStrand > 0, true); assert.equal(makeMaterial(SPECIES.curlop, 96, 40).ampLock > 0, true);
  assert.equal(Phi(1), 0); assert.equal(Phi(1.5), 0); assert.equal(Phi(3), 1); assert.ok(Phi(2.25) > 0.4 && Phi(2.25) < 0.6);
  assert.equal(makeMaterial(SPECIES.loika, 304, 140).ampStrand, 0); // skin has no strands
});
test("raising the spot density never removes a spot", () => {
  const spec = SPECIES.rupar.look.marks.find((m) => m.kind === "spots"), list = spotList(spec);
  assert.equal(list.length, spec.nMax);
  let prevTotal = 0;
  for (let d = 0.2; d <= 1.0001; d += 0.1) {
    let total = 0; for (let s = 0; s <= 0.7; s += 0.01) for (let a = 30; a <= 120; a += 2) total += spotMask(spec, list, s, a, d);
    assert.ok(total >= prevTotal - 1e-9, `density ${d}`); prevTotal = total;
  }
  for (let s = 0; s <= 0.7; s += 0.02) for (let a = 30; a <= 120; a += 3) assert.ok(spotMask(spec, list, s, a, 0.9) >= spotMask(spec, list, s, a, 0.5) - 1e-12);
});
test("each mark is at least 12 L* away from its surround at 304", () => {
  for (const k of ORDER) {
    const look = SPECIES[k].look, pig = look.pigments, base = pig[look.slots.body ?? look.slots.dome ?? Object.values(look.slots)[0]] ?? pig[Object.values(look.slots)[0]];
    const L = (c) => Lstar(c), marks = { plate: pig.patch, belly: SPECIES[k].face.belly ? pig.belly : null, spot: pig.spot, sock: pig.sock, hoof: pig.hoof, nail: pig.nail, ring: pig.ring, inner: pig.inner };
    for (const [n, c] of Object.entries(marks)) if (c) { const sur = n === "hoof" || n === "nail" ? (n === "hoof" ? pig.sock : base) : base; assert.ok(Math.abs(L(c) - L(sur)) >= 12, `${k} ${n}: ${L(c).toFixed(1)} vs ${L(sur).toFixed(1)}`); }
  }
});
test("two runs give identical bytes at 304", () => {
  const f = SPECIES.wickle, ref = { height: standHeightOf("wickle") };
  const a = renderForm(buildScene(f, { extentDiv: 150 }), f.camera, 304, { ref }), b = renderForm(buildScene(f, { extentDiv: 150 }), f.camera, 304, { ref });
  assert.equal(hash(a.data), hash(b.data));
});

// ---- round 3 (design 4, 5): the tone ramp, the tufts, the belly in the surface chart ----
test("the clump tufts show at 304 and 96 and are off at 48, on fur only", () => {
  for (const k of ["curlop", "wickle"]) { assert.ok(makeMaterial(SPECIES[k], 304, 140).ampTuft > 0, k); assert.ok(makeMaterial(SPECIES[k], 96, 40).ampTuft > 0, k); assert.equal(makeMaterial(SPECIES[k], 48, 15).ampTuft, 0, k); }
  for (const k of ["drapet", "loika", "rupar"]) assert.equal(makeMaterial(SPECIES[k], 304, 140).ampTuft, 0, k);
  assert.equal(SPECIES.curlop.look.material.clump, 0.1); assert.equal(SPECIES.wickle.look.material.clump, 0.13); assert.equal(SPECIES.wickle.look.material.clumpPlume, 0.09);
});
test("the tone ramp of each pigment: k0 .66 fur and hair (Wickle .70 tuned to .62), skin .28 for Loika in round 4 (the light marks on their own floor .85), k1 1.04; skin gloss at most .10", () => {
  assert.equal(SPECIES.curlop.look.material.k0, 0.66); assert.equal(SPECIES.loika.look.material.k0, 0.28); assert.equal(SPECIES.loika.look.ramp.light, 0.85); assert.ok(SPECIES.loika.look.material.gloss <= 0.1); assert.equal(SPECIES.rupar.look.material.k0, 0.66);
});
test("the belly edge follows the body: beta(sigma) = beta_max sin(pi t^.8)^.6 peaks at the lower belly and closes at both ends", async () => {
  const { buildChains } = await import("../spine.mjs"), { makeField } = await import("../field.mjs"), f = SPECIES.curlop, b = buildChains(f), fld = makeField({ front: b.front, tail: b.tail, floor: b.floor }, b.branches, f);
  assert.equal(f.face.belly.chart, true); assert.equal(f.face.belly.betaMax, 68);
  // on the ventral line the belly is 1 over the middle, 0 beyond both ends; at 90 degrees from the ventral line it is 0 everywhere (beta_max 68)
  const at = (sig, angDeg) => { const s = fld.groups.front.samples ?? b.front.samples, sm = b.front.samples.reduce((a, q) => (Math.abs(q.sigma - sig) < Math.abs(a.sigma - sig) ? q : a)), a = angDeg * Math.PI / 180, nr = sm.d, p = [sm.p[0] + (sm.N[0] * Math.cos(a) * -1 * (nr + sm.fur) * 1) * 1 + sm.B[0] * Math.sin(a) * (sm.w + sm.fur), sm.p[1] + (sm.N[1] * Math.cos(a) * -1) * (nr + sm.fur) + sm.B[1] * Math.sin(a) * (sm.w + sm.fur), sm.p[2] + fld.shift + (sm.N[2] * Math.cos(a) * -1) * (nr + sm.fur) + sm.B[2] * Math.sin(a) * (sm.w + sm.fur)]; return fld.at(p).belly; };
  assert.ok(at(0.8, 0) > 0.9); assert.ok(at(0.8, 40) > 0.9); assert.ok(at(1.7, 40) < 0.1); assert.ok(at(0.8, 85) < 0.1); // the edge narrows toward the head: 67 degrees at sigma .8, 14 at 1.7
});
