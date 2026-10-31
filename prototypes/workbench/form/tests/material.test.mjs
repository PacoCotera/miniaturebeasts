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
