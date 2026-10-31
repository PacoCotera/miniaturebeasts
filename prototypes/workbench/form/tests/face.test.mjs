// Round 2, workstream 2 (design 2): the face frame, eyes, plate, nose, mouth, Drapet's opening, and the head and neck numbers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildScene } from "../mesh.mjs";
import { buildChains, neckPinch } from "../spine.mjs";
import { makeField } from "../field.mjs";
import { renderForm, INK } from "../render.mjs";
import { SPECIES, ORDER } from "../species-trial.mjs";
import { faceSurface, guardsOf } from "../checks.mjs";
import { standHeightOf } from "./helpers.mjs";

const make = (k, form = SPECIES[k]) => { const b = buildChains(form); return { form, b, f: makeField({ front: b.front, tail: b.tail, floor: b.floor }, b.branches, form) }; };
const RAD = Math.PI / 180;

test("the 3D eye separation is within 10 % of 2 e_x on all five (Wickle's was 0.195 U and Drapet's 0.105 U)", () => {
  for (const k of ORDER) {
    const { f } = make(k), fm = f.faceM, [a, b] = f.eyes, sep = Math.hypot(a.hit[0] - b.hit[0], a.hit[1] - b.hit[1], a.hit[2] - b.hit[2]), want = 2 * fm.spec.eyes.ex * fm.size;
    assert.ok(Math.abs(sep / want - 1) <= 0.1, `${k}: ${sep.toFixed(3)} vs ${want.toFixed(3)}`);
  }
});
test("no recess: the plate's surface along n_f is at least -0.005 U against the ring outside it, at 32 points (hair: set back 0 ... 0.03 U)", () => {
  for (const k of ORDER) { const { f } = make(k), s = faceSurface(f, f.faceM); assert.ok(s.ok, `${k}: ${s.minRel} .. ${s.maxRel}`); assert.equal(s.rel.length, 32); }
});
test("the eyes lie inside the plate (or the head's front) with a gap of at least 0.5 r_e between them", () => {
  for (const k of ORDER) { const g = guardsOf(SPECIES[k]); assert.deepEqual(g.problems.filter((p) => /eye|plate/.test(p)), [], k); }
});
test("Drapet's plate is set back 0 ... 0.03 U and the fringe stands fringe-gap x r_e above the eyes", () => {
  const { f } = make("drapet"), o = f.faceM.opening, s = faceSurface(f, f.faceM);
  assert.ok(o.setback >= 0 && o.setback <= 0.03); assert.ok(s.setBack[0] >= -0.005 && s.setBack[1] <= 0.03 + 0.005, `${s.setBack}`);
  const e = f.faceM.eyes[0], top = e.y + e.r; assert.ok(Math.abs(o.base - top - o.gap * e.r) < 0.005);
  for (const x of [-0.2, 0, 0.2]) assert.ok(Math.abs(o.jag(x)) <= 0.025 + 1e-9);
});
test("Loika's neck pinch is at least 0.45 and the design's .75; Rupar's neck leans 45-65 degrees at mid-neck and the heading falls by 50 degrees or more to the nose", () => {
  const p = neckPinch(SPECIES.loika); assert.ok(p >= 0.45 && Math.abs(p - 0.75) < 0.06, `${p}`);
  const f = SPECIES.rupar, b = buildChains(f), ks = f.front.knots, ib = ks.findIndex((k) => k.name === "withers"), it = ks.findIndex((k) => k.name === "throat");
  const S = b.front.samples, hd = (s) => Math.atan2(s.T[2], s.T[0]) / RAD, mid = (b.front.cum[ib] + b.front.cum[it]) / 2, sm = S.reduce((a, s) => (Math.abs(s.s - mid) < Math.abs(a.s - mid) ? s : a));
  assert.ok(hd(sm) >= 45 && hd(sm) <= 65, `mid-neck ${hd(sm)}`);
  const thr = S.reduce((a, s) => (Math.abs(s.s - b.front.cum[it]) < Math.abs(a.s - b.front.cum[it]) ? s : a)), tip = S.at(-1);
  assert.ok(hd(thr) - hd(tip) >= 50, `fall ${hd(thr) - hd(tip)}`);
  let prev = Infinity; for (const s of S.filter((x) => x.s >= b.front.cum[it])) { const h = hd(s); assert.ok(h <= prev + 1e-6, `heading rises at ${s.s}`); prev = h; }
});
test("the mouth ink at 304 is at least 10 px long where the kind is not none", () => {
  for (const k of ["curlop", "wickle", "loika", "rupar"]) {
    const sc = buildScene(SPECIES[k], { extentDiv: 220 }), r = renderForm(sc, SPECIES[k].camera, 304, { ref: { height: standHeightOf(k) } });
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, n = 0;
    for (let y = 0; y < r.height; y++) for (let x = 0; x < r.width; x++) if (r.ink[y * r.width + x] === INK.mouth) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    assert.ok(Math.hypot(x1 - x0, y1 - y0) >= 10 && n > 0, `${k}: ${n} px, extent ${x1 - x0} x ${y1 - y0}`);
  }
});
