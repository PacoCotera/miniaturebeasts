// Chunk 11: the game roster from the registry. The glyphs (eight redrawn to name their signature), the land and family
// each roster row takes from the registry, and the 48 px read check (roster.read48) that replaces the kind check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLYPHS, LEGACY_GLYPHS, SPECIES, specOf } from "../framework/roster.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frameFile = (rel) => JSON.parse(readFileSync(path.resolve(here, "../frames", rel), "utf8"));

// The eight glyphs the owner approved on 2026-11-05 at 23:26 (S04, S05, S06, S08, S11, S12, S13, S15).
const APPROVED = {
  S04: ["##.##", ".#.#.", ".###.", ".....", "....."],
  S05: ["#.#..", ".#.#.", "..#.#", "...#.", "....."],
  S06: ["#.#..", "....#", "####.", "....#", "....."],
  S08: ["..#.#", "..#.#", "#.#.#", "#....", "....."],
  S11: ["#....", ".#..#", ".#.#.", "..#..", ".###."],
  S12: [".##..", "#..#.", "#.#..", "....#", "...#."],
  S13: ["....#", "...##", "..###", ".####", "....."],
  S15: ["#.#.#", ".....", ".###.", "#...#", "#####"],
};

const grid = (rows) => rows.map((r) => [...r].map((c) => (c === "#" ? 1 : 0)));
const rot = (g) => g[0].map((_, x) => g.map((row) => row[x]).reverse());
const flip = (g) => g.map((r) => [...r].reverse());
const orientations = (g) => { const out = []; let a = g; for (let i = 0; i < 4; i++) { out.push(a, flip(a)); a = rot(a); } return out; };
const cellsApart = (a, b) => a.flat().reduce((n, v, i) => n + (v !== b.flat()[i] ? 1 : 0), 0);
const apart = (x, y) => Math.min(...orientations(grid(y)).map((o) => cellsApart(grid(x), o)));

test("the eight approved glyphs are the language set; the other eight stay as they were", () => {
  for (const [id, rows] of Object.entries(APPROVED)) assert.deepEqual(GLYPHS[id], rows, `${id}: the approved glyph`);
  assert.deepEqual(Object.keys(LEGACY_GLYPHS).sort(), Object.keys(APPROVED).sort(), "the legacy set is exactly the eight redrawn kinds");
  for (const id of Object.keys(GLYPHS)) if (!APPROVED[id]) assert.equal(LEGACY_GLYPHS[id], undefined, `${id} keeps its mark`);
  for (const id of Object.keys(APPROVED)) assert.notDeepEqual(GLYPHS[id], LEGACY_GLYPHS[id]);
});

test("the approved glyphs differ pairwise in at least five of 25 cells in all eight orientations (S17's working draft is left out)", () => {
  const ids = Object.keys(GLYPHS).filter((id) => id !== "S17");   // S17 Wickle's glyph is a draft with the owner; S20 Tuliko has none
  assert.equal(ids.length, 18);
  let worst = 25;
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const d = apart(GLYPHS[ids[i]], GLYPHS[ids[j]]);
    assert.ok(d >= 5, `${ids[i]} and ${ids[j]} are ${d} cells apart`);
    worst = Math.min(worst, d);
  }
  assert.equal(worst, 5, "the art desk's checker reports a worst distance of 5");
  for (const id of ids) for (const [o, g] of orientations(grid(GLYPHS[id])).entries()) assert.equal(g.length, 5, `${id} orientation ${o}`);
});

test("frames before the language keep the old marks (the stamp registry is append-only); the language frames carry the new set", () => {
  for (const s of SPECIES) {
    const id = s.id;
    assert.deepEqual(specOf(s).glyph, LEGACY_GLYPHS[id] ?? GLYPHS[id], `${id}: a pre-language spec carries the old mark`);
    assert.deepEqual(frameFile(`species-${id}.json`).glyph, LEGACY_GLYPHS[id] ?? GLYPHS[id], `${id}: the registry frame`);
    assert.deepEqual(frameFile(`language/species-${id}.json`).glyph, GLYPHS[id], `${id}: the language frame (version 8)`);
  }
});
