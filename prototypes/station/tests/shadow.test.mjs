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

test("the alpha steps: a' = floor((a P + 50) / 100) of founderArt's, pixel by pixel, for cool, warm, glowing and ready; the colours are founderArt's", () => {
  const st = bud(), fr = frameOf("S01"), g = st.bud.genome, read = st.bud.read, base = founderArt(fr, g, read, 160, 192).rgba();
  assert.equal(base.length, 160 * 192 * 4);
  for (const [step, P] of Object.entries(SHADOW_P)) {
    const s = shadowArt(fr, g, read, step), px = s.rgba(); assert.deepEqual([s.w, s.h, px.length], [160, 192, base.length]); let opaque = 0;
    for (let i = 0; i < base.length; i += 4) { assert.equal(px[i + 3], Math.floor((base[i + 3] * P + 50) / 100), `${step} at ${i / 4}`); if (base[i + 3]) { assert.deepEqual([px[i], px[i + 1], px[i + 2]], [base[i], base[i + 1], base[i + 2]]); opaque++; } }
    assert.ok(opaque > 1000, "a body");
  }
  assert.deepEqual(Object.values(SHADOW_P), [25, 45, 65, 80]); assert.throws(() => shadowArt(fr, g, read, "dim"), /unknown step/);
  assert.equal(shadowArt(fr, g, read, "warm"), shadowArt(fr, g, read, "warm"), "cached: the same call is the same picture");
});
test("a chapter more known changes the picture, not its silhouette; a cross ignores its genome and what it has read", () => {
  const st = bud("S01", 1), fr = frameOf("S01"), g = st.bud.genome, a = shadowArt(fr, g, st.bud.read, "warm").rgba(); let lifted = 0;
  for (const c of fr.chapters.filter((x) => !st.bud.read.includes(x.id))) {
    const b = shadowArt(fr, g, [...st.bud.read, c.id], "warm").rgba(); let diff = 0, sil = 0;
    for (let i = 0; i < a.length; i += 4) { if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) diff++; if ((a[i + 3] > 0) !== (b[i + 3] > 0)) sil++; }
    assert.equal(sil, 0, `${c.id}: the silhouette is the same`); assert.ok(diff < a.length / 8, `${c.id}: only the chapter's looks change`); if (diff > 0) lifted++;
  }
  assert.ok(lifted > 0, "a chapter's veil lifts from its looks");
  const c1 = shadowArt(fr, null, [], "cool").rgba(), c2 = shadowArt(fr, null, ["x", "y"], "cool").rgba(); assert.deepEqual(Buffer.from(c1), Buffer.from(c2), "a cross reads nothing");
  const other = frameOf("S02"), o1 = shadowArt(other, null, [], "cool").rgba(); assert.notDeepEqual(Buffer.from(o1), Buffer.from(c1), "each species' own type specimen"); assert.throws(() => shadowArt({ species: { id: "none" } }, null, [], "cool"), /no genome/);
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
test("the derive's time is printed (budget: at most 50 ms a derive on the development machine)", () => {
  const st = bud("S02", 2), fr = frameOf("S02"); founderArt(fr, st.bud.genome, st.bud.read, 160, 192);   // Create's own picture is the shared cost, held by its cache
  const t0 = performance.now(); const s = shadowArt(fr, st.bud.genome, st.bud.read, "glowing"); s.rgba(); const ms = performance.now() - t0;
  console.log(`# the shadow's derive (S02, glowing, founderArt cached): ${ms.toFixed(1)} ms`); assert.ok(ms < 200, `${ms} ms`);
  const t1 = performance.now(); shadowArt(frameOf("S03"), podGenome(frameOf("S03"), 3), ["x"].slice(0, 0), "cool").rgba(); console.log(`# the shadow's derive from nothing (S03, cool, founderArt too): ${(performance.now() - t1).toFixed(1)} ms`);
});
