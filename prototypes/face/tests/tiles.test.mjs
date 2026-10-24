// UI kit K5, K5.1: the lists the kit's tiles stand on (kit_tiles, kit_nameTag) and the name plates. Since K5.1 the specs' `forms` and `plate` objects are the only statement of these numbers, so each case checks a form's own invariants:
// it holds every count the screen can reach and refuses one past it (ui/specs/derive.mjs listPitch), its places are the ones the screen's rule names, and a plate's bounds are multiples of its step. A key that stays beside a form because
// another file still reads it (Home's Companion plates, the bench's icons, the Probe's icon size) is held equal to the form here.
//   node --test prototypes/face/tests/tiles.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { listForm, listPitch, plateWidth } from "../../ui/specs/derive.mjs";

const specs = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station");
const S = (n) => JSON.parse(readFileSync(path.join(specs, n + ".json"), "utf8"));
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const holds = (L, counts, what) => { for (const n of counts) for (let i = 0; i < n; i++) assert.equal(listPitch(L, n, i).length, 4, `${what}: item ${i} of ${n}`); };
const refuses = (L, n, what) => assert.throws(() => listPitch(L, n, 0), /listPitch/, `${what}: ${n} is refused`);
const most = (L) => Math.max(...Object.values(L.forms).map((f) => f.upTo));

test("the namer's keys: one grid of 28 places, seven to a row, inside the keys' rectangle", () => {
  const K = S("namer").regions.keys, F = listForm(K, 28);
  assert.equal(most(K), 28); assert.deepEqual(F.grid, [K.columns, K.rows]); holds(K, [28], "keys"); refuses(K, 29, "keys");
  const last = listPitch(K, 28, 27); assert.deepEqual([F.first[0], F.first[1], last[0] + last[2], last[1] + last[3]], [K.rect[0], K.rect[1], K.rect[0] + K.rect[2], K.rect[1] + K.rect[3]], "the grid fills the keys' rectangle");
});
test("Home's Pods station: the six slots on a 3 x 2 grid", () => {
  const L = S("home").regions.pods.slots; assert.equal(most(L), L.cols * L.rows); assert.deepEqual(listForm(L, 6).grid, [L.cols, L.rows]); holds(L, range(1, 6), "pods slots"); refuses(L, 7, "pods slots");
});
test("Home's Companion station: the Probe's plates, up to four, at the keys Home's region check still reads", () => {
  const C = S("home").regions.companion, L = C.plates; assert.equal(most(L), L.max); holds(L, range(1, L.max), "companion plates"); refuses(L, L.max + 1, "companion plates");
  for (let n = 1; n <= L.max; n++) for (let i = 0; i < n; i++) assert.deepEqual(listPitch(L, n, i), [C.rect[0] + L.at[0] + i * (L.size[0] + L.gap), C.rect[1] + L.at[1], L.size[0], L.size[1]], `companion plate ${i} of ${n}`);
});
test("Habitat's Cross module: one row of up to seven, two rows of up to seven to the most partners (11), the rows clear of each other", () => {
  const F = S("habitat").regions.cross.faces, one = F.forms.oneRow, two = F.forms.twoRows;
  assert.deepEqual([one.upTo, one.grid, two.upTo, two.grid[0]], [7, [7, 1], F.max, 7]); assert.ok(two.pitch[1] >= two.first[3], "the rows do not overlap");
  holds(F, range(1, F.max), "cross faces"); refuses(F, F.max + 1, "cross faces");
});
test("Cargo's find strip: one row of up to seven", () => {
  const F = S("cargo").regions.hatch.strip.find; assert.equal(most(F), F.max); holds(F, range(1, F.max), "finds"); refuses(F, F.max + 1, "finds");
});
test("Cargo's arrival band: who leaves, one to three faces, every form right-aligned to one edge", () => {
  const B = S("cargo").regions.arrival.band.leaving; holds(B, range(1, 3), "leaving faces"); refuses(B, 4, "leaving faces");
  const right = (n) => { const b = listPitch(B, n, n - 1); return b[0] + b[2]; }; assert.equal(right(2), right(1)); assert.equal(right(3), right(1));
  for (let n = 1; n <= 3; n++) assert.deepEqual(listPitch(B, n, 0).slice(2), B.faceSize, `the faces of ${n} at faceSize`);
});
test("Cargo's arrival band: the Probe's plates, up to four, at the icon size the props still read", () => {
  const B = S("cargo").regions.arrival.band.probe, F = B.forms.row;
  assert.equal(F.upTo, 4, "the Probe's shield is at most four plates (state.mjs TIER)"); assert.deepEqual(F.first.slice(2), B.size);
  holds(B, range(1, 4), "probe plates"); refuses(B, 5, "a fifth plate (a new tier must add a form)");
});
test("the Probe bench: the switch's plates and what the upgrade adds, inside their modules, at the icon size the props still read", () => {
  const b = S("bench").regions, inside = (r, m) => r[0] >= m[0] && r[1] >= m[1] && r[0] + r[2] <= m[0] + m[2] && r[1] + r[3] <= m[1] + m[3];
  const M = b.switch.meaning.plates; holds(M, range(1, 4), "switch plates"); refuses(M, 5, "switch plates"); assert.deepEqual(M.forms.row.first.slice(2), M.icon);
  for (let i = 0; i < 4; i++) assert.ok(inside(listPitch(M, 4, i), b.switch.rect), `switch plate ${i} inside the switch`);
  for (const k of ["pods", "plates"]) { const L = b.slot.adds[k]; assert.equal(most(L), L.count); holds(L, [L.count], "adds " + k); assert.deepEqual(L.forms.row.first.slice(2), L.icon);
    for (let i = 0; i < L.count; i++) assert.ok(inside(listPitch(L, L.count, i), b.slot.rect), `adds ${k} ${i} inside the slot`); }
});
test("the decision panel: one to three cards at the widths the spec's limits name, and the strip's two", () => {
  const P = S("frame").regions.panel, C = P.cards, T = P.strip.cards;
  assert.equal(most(C), C.max); for (let n = 1; n <= C.max; n++) { holds(C, [n], "cards"); assert.equal(listPitch(C, n, 0)[2], P.limits[n].card, "the width the spec's limits name"); }
  refuses(C, C.max + 1, "cards"); assert.equal(most(T), T.max); holds(T, range(1, T.max), "strip cards"); refuses(T, T.max + 1, "strip cards");
});
test("the name tags' plates and Cargo's dock ribbon: bounds that are multiples of the step, and the ribbon's most its rect's width", () => {
  for (const f of ["home", "vivarium", "habitat"]) {
    const N = S(f).regions.nameTag, P = N.plate; assert.ok(P.min % P.round === 0 && P.max % P.round === 0 && P.min <= P.max, f + ": min and max on the step");
    for (let tw = 0; tw <= 260; tw++) { const w = plateWidth(N, tw); assert.ok(w % P.round === 0 && w >= P.min && w <= P.max, `${f} ${tw}`); }
  }
  const R = S("cargo").regions.dockRibbon; assert.equal(R.plate.max, R.rect[2], "the ribbon is at most its rect's width"); assert.equal(R.plate.pad, R.pad);
});
