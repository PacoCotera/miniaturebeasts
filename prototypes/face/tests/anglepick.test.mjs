// The composed op `anglePick` and the arc fill word on the face (specs/face-arc-and-shadow.md §1; T-20261016-64), in Node on the WebAssembly build: the angle table is the same in C and in JavaScript; the op matches its JavaScript reference byte
// for byte on the 24 vectors (tests/vectors/anglepick.json) and refuses a span of 180° or more and a window outside its asset; the 12 segments of the ring cover exactly the reference at nine degrees; the ring's node count is the same at every
// degree and in ready; a degree redraws one segment's box, a boundary two, growNow the union and ready the closed art's difference box; the palette holds. Skipped when the face has not been built (build.sh).
//   node --test prototypes/face/tests/anglepick.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { withPolicy, installScene } from "./node-scene.mjs";
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { setFrames, frameOf, podGenome } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { incubatorBuild } from "../../station/src/views/incubator-props.mjs";
import { ANGLE_S, ANGLE_C, anglePick } from "../../station/src/angle-table.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { TOP, FROMP } from "../tools/make-anglepick-vectors.mjs";
import { dirty } from "./dirty.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), dist = path.resolve(here, "../dist"), distNode = path.resolve(here, "../dist/node"), built = existsSync(path.join(dist, "face.mjs")), skip = !built && "face not built (prototypes/face/build.sh)";
const specs = path.resolve(here, "../../ui/specs/station"), J = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8")), frameSpec = J("frame"), podsSpec = J("pods"), incSpec = J("incubator");
const palette = JSON.parse(readFileSync(path.resolve(here, "../../ui/palettes/station.json"), "utf8")).colours;
const rgbOf = (name) => { const h = palette.find((c) => c[0] === name)[1]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const VECTORS = JSON.parse(readFileSync(path.join(here, "vectors/anglepick.json"), "utf8")).cases;
const framesDir = path.resolve(here, "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
const env = { rgb: rgbOf, cap: (px) => Math.round(px * 0.7), picture: () => null, slice: () => null, tile: () => 0 };
const frames = (f, n = 2, dt = 16) => { for (let i = 0; i < n; i++) f.frame((f.t = (f.t ?? 0) + dt)); };

test("the angle table is the same in C and in JavaScript, and is the rounded sine and cosine", () => {
  const h = readFileSync(path.resolve(here, "../src/prim/angle_table.h"), "utf8"), nums = (name) => h.match(new RegExp(`${name}\\[360\\] = \\{([^}]*)\\}`))[1].split(",").map((s) => s.trim()).filter(Boolean).map(Number);
  assert.deepEqual(nums("ANGLE_S"), ANGLE_S); assert.deepEqual(nums("ANGLE_C"), ANGLE_C); assert.equal(ANGLE_S.length, 360);
  for (let a = 0; a < 360; a++) { assert.equal(ANGLE_S[a], Math.round(32767 * Math.sin(a * Math.PI / 180)) || 0); assert.equal(ANGLE_C[a], Math.round(-32767 * Math.cos(a * Math.PI / 180)) || 0); }
});

const picBuilder = (p) => () => ({ w: p.w, h: p.h, data: new Uint8ClampedArray(p.px), policy: "art", status: "placeholder" });
test("anglePick: the 24 vectors, byte for byte against the JavaScript reference", { skip }, async () => {
  assert.equal(VECTORS.length, 24);
  const f = installScene(await bootFace(pathToFileURL(distNode + "/"), { test: true })); f.send({ t: "palette", name: "station", colours: palette }); frames(f, 2);
  const to = f.handleOf("t:to", picBuilder(TOP())), from = f.handleOf("t:from", picBuilder(FROMP()));
  for (const c of VECTORS) {
    const ref = anglePick({ w: c.w, h: c.h, cx: c.cx, cy: c.cy, a0: c.a0, a1: c.a1, from: c.from ? FROMP() : null, to: TOP(), fsx: c.fs[0], fsy: c.fs[1], tsx: c.ts[0], tsy: c.ts[1] });
    assert.equal(Buffer.from(ref).toString("hex"), c.expect, `${c.name}: the reference is the vector`);
    const node = [{ id: "bg", kind: "rect", rect: [0, 0, 1024, 600], colour: "ground" }, { id: "k", kind: "composed", rect: [200, 200, c.w, c.h], ops: [["anglePick", c.from ? from : -1, to, c.cx, c.cy, c.a0, c.a1, c.fs[0], c.fs[1], c.ts[0], c.ts[1]]] }];
    f.scene(node, env); frames(f); assert.equal(f.refused(), 0, c.name);
    const want = Buffer.from(c.expect, "hex"); let bad = 0;
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const o = (y * c.w + x) * 4, exp = want[o + 3] ? [want[o], want[o + 1], want[o + 2]] : rgbOf("ground"); if (f.pixel(200 + x, 200 + y).join() !== exp.join()) bad++; }
    assert.equal(bad, 0, `${c.name}: ${bad} pixels differ from the vector`);
  }
});
test("anglePick refuses a span of 180° or more, a window outside its asset and a missing `to`", { skip }, async () => {
  const f = installScene(await bootFace(pathToFileURL(distNode + "/"), { test: true })); f.send({ t: "palette", name: "station", colours: palette }); frames(f, 2);
  const to = f.handleOf("t:to", picBuilder(TOP()));
  const node = (ops) => [{ id: "bg", kind: "rect", rect: [0, 0, 1024, 600], colour: "ground" }, { id: "k", kind: "composed", rect: [200, 200, 16, 16], ops }];
  for (const ops of [[["anglePick", -1, to, 8, 8, 0, 180, 0, 0, 0, 0]], [["anglePick", -1, to, 8, 8, 0, 200, 0, 0, 0, 0]], [["anglePick", -1, to, 8, 8, 0, 90, 0, 0, 40, 0]], [["anglePick", -1, -1, 8, 8, 0, 90, 0, 0, 0, 0]]]) { f.scene(node(ops), env); frames(f); assert.equal(f.refused(), 1, JSON.stringify(ops)); }
  f.scene(node([["anglePick", -1, to, 8, 8, 0, 179, 0, 0, 0, 0]]), env); frames(f); assert.equal(f.refused(), 0, "179° is accepted");
});

// ---- the arc fill word on the Incubator's ring ----
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, T0 = 1_000_000, ARC = incSpec.regions.ring.arc, [CX, CY] = ARC.center, [BX, BY, BW, BH] = ARC.box;
const boxes = [[324, 348, 57, 74], [312, 281, 34, 75], [312, 207, 39, 75], [329, 145, 61, 71], [373, 103, 73, 58], [437, 88, 75, 37], [512, 88, 75, 37], [578, 103, 73, 58], [634, 145, 61, 71], [673, 207, 39, 75], [678, 281, 34, 75], [643, 348, 57, 74]];
// the ring's art stand-ins (on palette): the fill is the whole track (the annulus over the sweep) in `yellow`, clear outside it; the closed art adds the gap where the ends meet in `orange`
const annulus = (x, y) => { const px = 2 * (x - CX + BX) + 1, py = 2 * (y - CY + BY) + 1, d = px * px + py * py; return d >= 4 * ARC.radii[0] ** 2 && d <= 4 * ARC.radii[1] ** 2; };
const inSpan = (x, y, a0, a1) => { const m = (a) => ((a % 360) + 360) % 360, A0 = m(a0), A1 = m(a1), px = 2 * (x - CX + BX) + 1, py = 2 * (y - CY + BY) + 1; return m(a1 - a0) > 0 && ANGLE_S[A0] * py - ANGLE_C[A0] * px >= 0 && ANGLE_S[A1] * py - ANGLE_C[A1] * px < 0; };
function ringArt(closed) {
  const px = new Uint8Array(BW * BH * 4), y = rgbOf("yellow"), o = rgbOf("orange");
  for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) if (annulus(i, j)) {
    const a = (k) => inSpan(i, j, ARC.start + k * 22, ARC.start + (k + 1) * 22); let inArc = false; for (let k = 0; k < 12; k++) if (a(k)) inArc = true;
    if (inArc) px.set([...y, 255], (j * BW + i) * 4); else if (closed) px.set([...o, 255], (j * BW + i) * 4);
  }
  return { w: BW, h: BH, px };
}
const FILL = ringArt(false), CLOSED = ringArt(true);
function scene(minutes = 2) {
  const st = S.freshSt("w1", 3, T0); S.normalize(st); st.e = st.d = st.s = 99; st.firstMibi = false; S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), settings, T0); const p = st.tray[0]; S.skipIdentify(st, p); frameOf("S01").chapters.slice(0, 1).forEach((c) => S.read(st, p, c.id, settings));
  assert.ok(S.grow(st, p, {}, settings, T0).ok); return incubatorBuild({ st, settings, now: T0 + minutes * 60000, ui: { inc: {} }, lamp: "" }, incSpec, podsSpec);
}
const standIn = (id, size, hollow) => { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4);   // every other picture is clear, so only the bench and the ring are under test
  void hollow; return { w, h, data: d, policy: "art", status: "placeholder" }; };
async function start() {
  const b = scene(), f = await bootFace(pathToFileURL(dist + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette }); for (const [n, j] of [["frame", frameSpec], ["pods", podsSpec], ["incubator", incSpec]]) assert.equal(f.send({ t: "spec", screen: n, json: j }), 0);
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy(() => standIn(id, [16, 16])));
  for (const p of pinnedPictures(podsSpec, frameSpec)) f.handleOf(p.id, withPolicy(() => standIn(p.id, [p.w, p.h])));
  for (const r of b.requests) f.handleOf(r.id, withPolicy(() => standIn(r.id, typeof r.size === "number" ? [r.size, r.size] : r.size ?? [16, 16], r.hollow || /^(dome|nest)-front-/.test(r.id))));
  f.handleOf("incubator-ring-fill", picBuilder(FILL)); f.handleOf("incubator-ring-closed", picBuilder(CLOSED));
  f.t = 0; f.b = b; f.motion = false; return f;
}
const frameProps = { top: { screen: "incubator", title: "Incubator", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: null, need: "" }, plate: { text: "", timed: true } };
const show = (f, deg, closed = false, settle = true) => { if (deg < 0) { f.props({ screen: "incubator", ...f.b.props, motion: false, frame: { ...frameProps, line: { ...frameProps.line, ...f.b.line } } }); frames(f); return; }
   const b = f.b; const props = { ...b.props, regions: { ...b.props.regions, ring: { fill: "incubator-ring-fill", closedArt: "incubator-ring-closed", deg, closed } } };
  assert.equal(f.props({ screen: "incubator", ...props, motion: false, frame: { ...frameProps, line: { ...frameProps.line, ...b.line } } }), 0, f.errors().join("; ")); frames(f, settle ? 2 : 1); };
const snap = (f) => { const o = new Uint8Array(BW * BH * 3); for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) o.set(f.pixel(BX + i, BY + j), (j * BW + i) * 3); return o; };

test("the ring's 12 segments cover exactly the reference at deg 0, 1, 21, 22, 23, 131, 132, 263 and 264: the fill where the art is opaque and the pixel is within deg of the start, the stage beneath everywhere else", { skip }, async () => {
  const f = await start(); show(f, -1); const r0 = f.refused(); show(f, 0); const base = snap(f), yellow = rgbOf("yellow");
  for (const deg of [0, 1, 21, 22, 23, 131, 132, 263, 264]) {
    show(f, deg); assert.equal(f.refused(), r0, "the ring refused a node: " + f.errors().join(" | ")); assert.deepEqual(f.errors(), []); const got = snap(f); let bad = 0, filled = 0;
    for (let j = 0; j < BH; j++) for (let i = 0; i < BW; i++) {
      let want = base.subarray((j * BW + i) * 3, (j * BW + i) * 3 + 3), on = false;
      if (FILL.px[(j * BW + i) * 4 + 3]) for (let k = 0; k < 12; k++) { const fill = Math.max(0, Math.min(22, deg - 22 * k)); if (fill > 0 && inSpan(i, j, ARC.start + 22 * k, ARC.start + 22 * k + fill)) on = true; }
      if (on) { want = yellow; filled++; }
      if (got[(j * BW + i) * 3] !== want[0] || got[(j * BW + i) * 3 + 1] !== want[1] || got[(j * BW + i) * 3 + 2] !== want[2]) bad++;
    }
    assert.equal(bad, 0, `deg ${deg}: ${bad} pixels differ from the reference (${filled} filled)`); if (deg === 0) assert.equal(filled, 0);
  }
});
test("the ring's node count is the same at every degree and in ready, and the palette holds", { skip }, async () => {
  const f = await start(); show(f, 0); const n0 = f.objects(), offBase = f.offPalette();
  for (const deg of [1, 22, 132, 264]) { show(f, deg); assert.equal(f.objects(), n0, `deg ${deg}`); assert.ok(f.offPalette() <= offBase, `deg ${deg}: the ring adds no colour the palette lacks (only the type layer blends)`); }
  show(f, 264, true); assert.equal(f.objects(), n0, "ready: the closed window is a node that had no size"); assert.ok(f.offPalette() <= offBase, "ready: no colour the palette lacks");
});
test("the dirty area: a degree redraws its segment's box, a boundary two boxes, growNow the union, ready the closed art's difference box", { skip }, async () => {
  const f = await start(); show(f, 0); dirty(f);
  const step = (from, to, closed = false) => { show(f, from); dirty(f, { fullCut: true }); show(f, to, closed, false); return dirty(f, { fullCut: true }); };   // settle on `from`, then one frame for the change
  for (const [from, to] of [[10, 11], [60, 61], [140, 141]]) { const d = step(from, to); assert.ok(d <= 4331, `${from}→${to}: ${d} px`); console.log(`# arc: degree ${from}→${to}: ${d} px`); }
  { const d = step(21, 23); assert.ok(d <= 8662, `a boundary: ${d} px`); console.log(`# arc: degree 21→23 (a boundary): ${d} px`); }
  { const d = step(0, 264); assert.ok(d <= 133600, `growNow: ${d} px`); console.log(`# arc: 0→264 (growNow's cut): ${d} px`); }
  { const d = step(264, 264, true); assert.ok(d > 0 && d < 153600, `ready: ${d} px`); console.log(`# arc: ready (the closed art's difference box): ${d} px (the placeholder art: UNVERIFIED until incubator-ring-closed exists)`); }
});
