// UI kit K5: the lists the kit's tiles stand on (kit_tiles, kit_nameTag; the `forms` and `plate` objects added to the specs) hold the numbers the screens used to compute in place. Each case writes the old arithmetic out from the spec's older keys and
// compares it with the rule (ui/specs/derive.mjs listPitch, plateWidth) for every count the screen can reach, so a form that drifted from the numbers beside it fails here, whether or not a golden state shows the list.
//   node --test prototypes/face/tests/tiles.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { listPitch, plateWidth } from "../../ui/specs/derive.mjs";

const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station");
const S = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const same = (L, n, old, what) => { for (let i = 0; i < n; i++) assert.deepEqual(listPitch(L, n, i), old(i, n), `${what}: item ${i} of ${n}`); };

test("the namer's keys: 28 places, seven to a row, 48 apart from (636, 160), 40 x 40", () => {
  const K = S("namer").regions.keys; assert.equal(K.columns * K.rows, 28);
  same(K, 28, (i) => [K.at[0] + K.pitch * (i % K.columns), K.at[1] + K.pitch * Math.floor(i / K.columns), K.key[0], K.key[1]], "keys");
});
test("Home's Pods station: the slots on a 3 x 2 grid, right-aligned in the picture", () => {
  const P = S("home").regions.pods, L = P.slots, st = S("home").regions.station;
  const x0 = P.rect[0] + P.rect[2] - st.pictureInset - P.picture[0], y0 = P.rect[1] + Math.trunc((P.rect[3] - P.picture[1]) / 2);
  assert.equal(L.cols * L.rows, 6); same(L, L.cols * L.rows, (i) => [x0 + (i % L.cols) * (L.size[0] + L.gap), y0 + Math.floor(i / L.cols) * (L.size[1] + L.gap), L.size[0], L.size[1]], "pods slots");
});
test("Home's Companion station: the Probe's plates, 4 apart from the rect's (12, 64), up to four", () => {
  const C = S("home").regions.companion, L = C.plates;
  for (let n = 1; n <= L.max; n++) same(L, n, (i) => [C.rect[0] + L.at[0] + i * (L.size[0] + L.gap), C.rect[1] + L.at[1], L.size[0], L.size[1]], "companion plates");
});
test("Habitat's Cross module: one row of up to seven at y 56, or two rows at y 38 and 64, 32 apart", () => {
  const X = S("habitat").regions.cross, F = X.faces;
  for (let n = 1; n <= F.max; n++) same(F, n, (i) => { const two = n > F.perRow, row = two ? Math.floor(i / F.perRow) : 0, col = two ? i % F.perRow : i, o = two ? F.twoRows[row] : F.oneRow; return [X.rect[0] + o[0] + col * F.pitch, X.rect[1] + o[1], F.size[0], F.size[1]]; }, "cross faces");
});
test("Cargo's find strip: seven places, 20 apart from (36, 384), 16 x 16", () => {
  const F = S("cargo").regions.hatch.strip.find; same(F, F.max, (i) => [F.at[0] + F.pitch * i, F.at[1], F.size[0], F.size[1]], "finds");
});
test("Cargo's arrival band: who leaves, right-aligned to x 984, the faces 32 apart, one to three", () => {
  const B = S("cargo").regions.arrival.band.leaving;
  for (let nf = 1; nf <= 3; nf++) same(B, nf, (i) => [B.rightX - (B.markSize[0] + B.gap + B.pitch * nf - (B.pitch - B.faceSize[0])) + B.markSize[0] + B.gap + B.pitch * i, B.y, B.faceSize[0], B.faceSize[0]], "leaving faces");
});
test("the Probe bench: the switch's plates and what the upgrade adds, 24 apart from the module's corner and the spec's `at`", () => {
  const b = S("bench").regions, M = b.switch, A = b.slot;
  for (let n = 1; n <= 4; n++) same(M.meaning.plates, n, (i) => [M.rect[0] + M.meaning.plates.at[0] + i * M.meaning.plates.pitch, M.rect[1] + M.meaning.plates.at[1], ...M.meaning.plates.icon], "switch plates");
  for (const k of ["pods", "plates"]) { const L = A.adds[k]; same(L, L.count, (i) => [A.rect[0] + L.at[0] + i * L.pitch, A.rect[1] + L.at[1], ...L.icon], "adds " + k); }
});
test("the decision panel: one to three cards across the cards' width, and the strip's two", () => {
  const P = S("frame").regions.panel, C = P.cards, T = P.strip.cards;
  for (let n = 1; n <= C.max; n++) { const w = Math.trunc((C.width - C.gap * (n - 1)) / n); same(C, n, (i) => [C.x + i * (w + C.gap), C.y, w, C.h], "cards"); assert.equal(w, P.limits[n].card, "the width the spec's limits name"); }
  for (let n = 1; n <= T.max; n++) same(T, n, (i) => [T.x + i * (T.w + T.gap), T.y, T.w, T.h], "strip cards");
});
test("the name tags' plates: the width the older keys gave (the name and twice the pad, rounded up to the step, between min and max), and Cargo's dock ribbon (rounded to 8, 160 to the rect's width)", () => {
  for (const f of ["home", "vivarium", "habitat"]) {
    const N = S(f).regions.nameTag; assert.deepEqual(N.plate, { min: N.min, max: N.max, pad: N.pad, round: N.round }, f + ": the plate holds the tag's own numbers");
    for (let tw = 0; tw <= 260; tw++) assert.equal(plateWidth(N, tw), Math.min(N.max, Math.max(N.min, Math.ceil((tw + 2 * N.pad) / N.round) * N.round)), `${f} ${tw}`);
  }
  const R = S("cargo").regions.dockRibbon;
  for (let tw = 0; tw <= 700; tw++) assert.equal(plateWidth(R, tw), Math.min(R.rect[2], Math.max(160, Math.trunc((tw + 2 * R.pad + 7) / 8) * 8)), `dock ribbon ${tw}`);
});
