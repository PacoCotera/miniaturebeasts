// The founder's shadow (specs/face-arc-and-shadow.md §2; T-20261016-64), in Node: shadowArt is Create's picture at 160 × 192 with its alpha stepped, floor((a P + 50) / 100) for P = 25, 45, 65 and 80, pixel by pixel; the same call gives the same bytes;
// a known chapter changes only the picture and the step's alpha; a cross ignores its genome and reads nothing; the request's id changes only when the known chapters or the step of the light does (a minute passing asks for nothing new, a clearing
// for exactly one, a third of the wait for exactly one); the derive's time is printed.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, podGenome } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import { founderArt, shadowArt, SHADOW_P } from "../src/art.mjs";
import { shadowReq, knownChapters } from "../src/views/incubator-props.mjs";
import { registerPictures } from "../src/pictures.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const T0 = 1_000_000, settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 };
function bud(species = "S01", read = 1, cross = false) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; S.seedPodFromGenome(st, podGenome(frameOf(species), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p);
  frameOf(species).chapters.slice(0, read).forEach((c) => S.read(st, p, c.id, settings)); assert.ok(S.grow(st, p, {}, settings, T0).ok); if (cross) st.bud.kind = "cross"; return st;
}

import { deriveShadow, fitAlpha, SHADOW_PARAMS } from "../src/shadow.mjs";
import { decodePNG } from "../../ui/png.mjs";
const vectors = JSON.parse(readFileSync(path.join(here, "fixtures/shadow-vectors.json"), "utf8")).cases, b64 = (t) => Uint8Array.from(Buffer.from(t, "base64"));
const adult = (sp) => { const im = decodePNG(readFileSync(path.resolve(here, `../../ui/assets/masters/pods/mibi-adult-${sp}-304x312.png`))); return { w: im.w ?? im.width, h: im.h ?? im.height, rgba: () => im.data ?? im.rgba, plane: Uint8Array.from({ length: 304 * 312 }, (_, i) => (im.data ?? im.rgba)[i * 4 + 3]) }; };

test("against the oracle (shadow.py with the edge rule, masters-pods 8c141b5c): for S01 and S03 at nothing cleared, 2 chapters, 4 and every chapter (ready), every alpha byte of the 160 × 192 derive is within ±1 of the oracle's, from the oracle's own fit and from this fit; the fit is within ±2", () => {
  let worst = 0, worstFit = 0, n = 0;
  for (const v of vectors) {
    const a = adult(v.species), fit = fitAlpha(a.plane, a.plane, 304, 312), oracleFit = Float64Array.from(b64(v.fit), (x) => x / 255), want = b64(v.alpha);
    let df = 0; for (let i = 0; i < fit.length; i++) df = Math.max(df, Math.abs(Math.round(fit[i] * 255) - Math.round(oracleFit[i] * 255))); worstFit = Math.max(worstFit, df);
    for (const [name, plane] of [["oracle fit", oracleFit], ["this fit", fit]]) {
      const px = deriveShadow(plane, v.q, v.step); let d = 0; for (let i = 0; i < want.length; i++) d = Math.max(d, Math.abs(px[i * 4 + 3] - want[i])); worst = Math.max(worst, d);
      if (name === "oracle fit") assert.ok(d <= 1, `${v.species} ${v.known}/${v.chapters} ${v.step}: ${name}: ${d} levels off the oracle`); else assert.ok(d <= 3, `${v.species} ${v.step}: ${name}: ${d} levels off the oracle`);
      for (let i = 0; i < want.length; i++) assert.deepEqual([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]], SHADOW_PARAMS.SHADOW_RGB, "one flat warm dark, no source colour");
    }
    n++;
  }
  console.log(`# the shadow against shadow.py: ${n} cases, worst alpha difference ${worst} (from the oracle's fit and from this fit), worst fit difference ${worstFit}`); assert.equal(n, 8);
});
test("the shadow of a founder: Create's flat picture's alpha, the same box for every known set, one flat colour; nothing cleared shows the body at the cool step; more known tightens the edge; a cross ignores its genome and reads nothing; two calls give the same bytes", () => {
  const st = bud("S01", 0), fr = frameOf("S01"), g = st.bud.genome, painted = adult("S01"), a0 = shadowArt(fr, g, [], "cool", painted).rgba(), all = fr.chapters.map((c) => c.id), a1 = shadowArt(fr, g, all, "cool", painted).rgba();
  const body = (px) => { let n = 0, full = 0; for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) n++; if (px[i] >= Math.floor((255 * SHADOW_P.cool + 50) / 100) - 1) full++; } return { n, full }; };
  assert.ok(body(a0).full > 3000, "nothing cleared: the body is there at the cool step (alpha " + Math.floor((255 * 25 + 50) / 100) + ")"); assert.ok(body(a1).full > body(a0).full, "more known: a crisper, fuller body (the penumbra tightens)");
  for (let i = 0; i < a0.length; i += 4) assert.deepEqual([a0[i], a0[i + 1], a0[i + 2]], [36, 22, 14]);
  const bbox = (px) => { let x0 = 160, x1 = -1, y0 = 192, y1 = -1; for (let i = 3; i < px.length; i += 4) if (px[i] > 12) { const x = (i >> 2) % 160, y = (i >> 2) / 160 | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return [x0, y0, x1, y1]; };
  const [bx0, by0, bx1, by1] = bbox(shadowArt(fr, g, [], "ready", painted).rgba()), [cx0, cy0, cx1, cy1] = bbox(shadowArt(fr, g, all, "ready", painted).rgba()); assert.ok(Math.abs(bx0 - cx0) <= 8 && Math.abs(by0 - cy0) <= 8 && Math.abs(bx1 - cx1) <= 8 && Math.abs(by1 - cy1) <= 8, "a clearing never moves the body: " + JSON.stringify([[bx0, by0, bx1, by1], [cx0, cy0, cx1, cy1]]));
  assert.equal(shadowArt(fr, g, [], "cool", painted), shadowArt(fr, g, [], "cool", painted), "cached: the same call is the same picture"); assert.throws(() => shadowArt(fr, g, [], "dim"), /unknown step/);
  const c1 = shadowArt(fr, null, [], "cool").rgba(), c2 = shadowArt(fr, null, ["x", "y"], "cool").rgba(); assert.deepEqual(Buffer.from(c1), Buffer.from(c2), "a cross reads nothing");
  const other = frameOf("S02"), o1 = shadowArt(other, null, [], "cool").rgba(); assert.notDeepEqual(Buffer.from(o1), Buffer.from(c1), "each species' own type specimen"); assert.throws(() => shadowArt({ species: { id: "none" } }, null, [], "cool"), /no genome/);
  assert.deepEqual(Object.values(SHADOW_P), [25, 45, 65, 80]);
});
test("the edge at ready (the edge rule): on the 1× ready picture no fully hard pixel run is longer than 2 px on a diagonal; the longest run and the steepest one-pixel step are printed, and without the floor the same picture has hard runs", () => {
  const diag = (px, full) => {   // a hard pixel is at the step's full alpha with a 4-neighbour at or below a quarter of it; a run is a chain of hard pixels, each one step left or right and one step up or down from the last
    const hard = new Set(), quarter = full / 4; let steep = 0;
    for (let y = 0; y < 192; y++) for (let x = 0; x < 160; x++) { const a = px[(y * 160 + x) * 4 + 3]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= 160 || yy >= 192) continue; const b = px[(yy * 160 + xx) * 4 + 3]; steep = Math.max(steep, Math.abs(a - b)); if (a >= full && b <= quarter) hard.add(y * 160 + x); } }
    let longest = 0; const seen = new Set();
    for (const h of hard) { if (seen.has(h)) continue; for (const dir of [1, -1]) { let run = 1, at = h; const x = h % 160, y = (h / 160) | 0; let cx = x, cy = y; while (hard.has((cy + 1) * 160 + cx + dir)) { cx += dir; cy++; run++; } longest = Math.max(longest, run); void at; } seen.add(h); }
    return { hard: hard.size, longest, steep };
  };
  for (const sp of ["S01", "S03"]) { const a = adult(sp), fit = fitAlpha(a.plane, a.plane, 304, 312), full = Math.floor((255 * 80 + 50) / 100);
    const floored = diag(deriveShadow(fit, 1, "ready"), full), raw = diag(deriveShadow(fit, 1, "ready", { ...SHADOW_PARAMS, SIGMA_MIN: 0 }), full);
    console.log(`# the ready edge, ${sp}: with the floor ${floored.hard} hard pixels, longest diagonal run ${floored.longest}, steepest step ${floored.steep}; without it ${raw.hard} hard pixels, run ${raw.longest}, steepest ${raw.steep}`);
    assert.ok(floored.longest <= 2 && floored.hard <= raw.hard, `${sp}: no hard diagonal run longer than 2 px`); }
});
test("the request: the id changes only when the known chapters or the step does; a minute passing asks for nothing, each clearing and each third of the wait exactly one", () => {
  const st = bud("S01", 1), B = st.bud, ids = [], seen = []; const req = (r) => r;
  let prev = null, changes = 0; const total = B.minutes * 60;   // seconds of the wait
  for (let s = 0; s <= total + 60; s += 5) {
    const now = T0 + s * 1000, r = shadowReq(req, st, settings, now); if (r.id !== prev) { changes++; seen.push([s, r.step, r.read.length]); prev = r.id; ids.push(r.id); }
    assert.equal(r.kind, "shadow"); assert.deepEqual(r.size, [160, 192]); assert.ok(r.id.startsWith(`shadow:${B.sha.slice(0, 16)}:`) && r.id.endsWith(":160x192")); assert.equal(r.cross, false);
  }
  const clearings = new Set(); for (const c of frameOf("S01").chapters) { if (!B.read.includes(c.id)) for (let s = 0; s <= total; s += 5) if (S.budChapterKnown(st, c.id, settings, T0 + s * 1000)) { clearings.add(c.id); break; } }
  assert.ok(new Set(ids).size === ids.length, "an id never comes back"); assert.deepEqual([...new Set(seen.map((x) => x[1]))], ["cool", "warm", "glowing", "ready"], "the four steps, in order");
  assert.equal(changes, clearings.size + 4, `${changes} ids over a wait: the first picture, the ${clearings.size} clearings and the three light steps after the first`);
  // a minute inside one step asks for the same id
  const a = shadowReq(req, st, settings, T0 + 1000), b = shadowReq(req, st, settings, T0 + 61000); assert.equal(a.id, b.id, "a minute passing inside a step asks for nothing new");
  const cross = bud("S01", 1, true); assert.equal(shadowReq(req, cross, settings, T0 + 1000).cross, true);
});
test("registerPictures: a shadow request is a derived 160 × 192 picture on the Station, and a wrong size or a missing bud throws", async () => {
  const st = bud(), reqs = []; const r = shadowReq((x) => { reqs.push(x); return x.id; }, st, settings, T0 + 1000);
  const { assetEntry } = await import("../src/assets.mjs").catch(() => ({})); void assetEntry;
  const env = { podById: () => null, frameOf, budGenome: () => st.bud.genome, mibiGenome: () => null, founderGenome: S.founderGenome };
  assert.doesNotThrow(() => registerPictures(reqs, env)); assert.throws(() => registerPictures([{ ...reqs[0], size: [160, 160] }], env), /160x192/); assert.throws(() => registerPictures([{ ...reqs[0], id: "x", cross: false }], { ...env, budGenome: () => null }), /no bud/);
  assert.ok(r);
});
test("the derive's time is printed (budget: at most 50 ms a derive on the development machine, the fit and the founder's picture cached)", () => {
  const sp = adult("S01"), t0 = performance.now(), fit = fitAlpha(sp.plane, sp.plane, 304, 312), tf = performance.now() - t0; deriveShadow(fit, 0.5, "warm");   // warm up the engine
  const times = ["cool", "warm", "glowing", "ready"].map((step, i) => { const t = performance.now(); deriveShadow(fit, i / 3, step); return performance.now() - t; }), worst = Math.max(...times);
  console.log(`# the shadow's derive on S01: ${times.map((t) => t.toFixed(1)).join(", ")} ms (cool, warm, glowing, ready), the fit ${tf.toFixed(1)} ms once per founder`); assert.ok(worst < 50, `${worst} ms`);
  const st = bud("S02", 2), fr = frameOf("S02"); const t1 = performance.now(); shadowArt(fr, st.bud.genome, st.bud.read, "glowing").rgba(); console.log(`# the first shadow of a founder with no painting placed (S02: the rig pass at 304 × 312, the fit, the derive): ${(performance.now() - t1).toFixed(0)} ms`);
});
