// Chunk 11: the game roster from the registry. The glyphs (eight redrawn to name their signature), the land and family
// each roster row takes from the registry, and the 48 px read check (roster.read48) that replaces the kind check.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLYPHS, LEGACY_GLYPHS, SPECIES, specOf } from "../framework/roster.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const frameFile = (rel) => JSON.parse(readFileSync(path.resolve(here, "../frames", rel), "utf8"));

// The glyphs the owner approved: eight on 2026-11-05 at 23:26 (S04, S05, S06, S08, S11, S12, S13, S15) and S17 on 2026-11-06 at 12:16; S20 Tuliko joins them in GLYPHS.
const APPROVED = {
  S04: ["##.##", ".#.#.", ".###.", ".....", "....."],
  S05: ["#.#..", ".#.#.", "..#.#", "...#.", "....."],
  S06: ["#.#..", "....#", "####.", "....#", "....."],
  S08: ["..#.#", "..#.#", "#.#.#", "#....", "....."],
  S11: ["#....", ".#..#", ".#.#.", "..#..", ".###."],
  S12: [".##..", "#..#.", "#.#..", "....#", "...#."],
  S13: ["....#", "...##", "..###", ".####", "....."],
  S15: ["#.#.#", ".....", ".###.", "#...#", "#####"],
  S17: ["..##.", ".#..#", "..#..", ".##..", "##..."],
};

const grid = (rows) => rows.map((r) => [...r].map((c) => (c === "#" ? 1 : 0)));
const rot = (g) => g[0].map((_, x) => g.map((row) => row[x]).reverse());
const flip = (g) => g.map((r) => [...r].reverse());
const orientations = (g) => { const out = []; let a = g; for (let i = 0; i < 4; i++) { out.push(a, flip(a)); a = rot(a); } return out; };
const cellsApart = (a, b) => a.flat().reduce((n, v, i) => n + (v !== b.flat()[i] ? 1 : 0), 0);
const apart = (x, y) => Math.min(...orientations(grid(y)).map((o) => cellsApart(grid(x), o)));

test("the nine redrawn glyphs are the language set; the others stay as they were", () => {
  for (const [id, rows] of Object.entries(APPROVED)) assert.deepEqual(GLYPHS[id], rows, `${id}: the approved glyph`);
  assert.deepEqual(Object.keys(LEGACY_GLYPHS).sort(), Object.keys(APPROVED).sort(), "the legacy set is exactly the nine redrawn kinds");
  for (const id of Object.keys(GLYPHS)) if (!APPROVED[id]) assert.equal(LEGACY_GLYPHS[id], undefined, `${id} keeps its mark`);
  for (const id of Object.keys(APPROVED)) assert.notDeepEqual(GLYPHS[id], LEGACY_GLYPHS[id]);
});

test("S20 Tuliko has the approved coin crest, and no frame carries it yet", () => {
  assert.deepEqual(GLYPHS.S20, [".....", "##.##", "#####", ".....", "....."]);
  assert.equal(LEGACY_GLYPHS.S20, undefined);
});

test("the approved glyphs differ pairwise in at least five of 25 cells in all eight orientations (S17 and S20 included: all 20 are final)", () => {
  const ids = Object.keys(GLYPHS);
  assert.equal(ids.length, 20);
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

test("each roster species takes its land and family from the registry; a land has one to three kinds", async () => {
  const { LANGUAGE, kindOf, landOf } = await import("../framework/language.mjs");
  const { landAndFamily, kindsOnLand } = await import("../framework/roster.mjs");
  for (const s of SPECIES) {
    const sp = specOf(s), k = kindOf(LANGUAGE, s.id);
    assert.equal(sp.land, k.land, `${s.id}: land`);
    assert.equal(sp.family, k.family, `${s.id}: family`);
    assert.equal(sp.landName, landOf(LANGUAGE, k.land).word, `${s.id}: the land's player word`);
  }
  assert.deepEqual(landAndFamily("S99"), { land: null, landName: null, family: null }, "a species the registry lacks has no land");
  const all = LANGUAGE.lands.flatMap((l) => kindsOnLand(l.id));
  assert.equal(all.length, 20, "every kind is on exactly one land");
  assert.equal(new Set(all).size, 20);
  for (const l of LANGUAGE.lands) assert.ok(kindsOnLand(l.id).length >= 1 && kindsOnLand(l.id).length <= 3, `${l.art} has one to three kinds`);
});

test("the player's land words: Meadows, Hills, Cliffs, Lakes, Highpools; Woods, Tallwood, Thickets and Marsh keep their names", async () => {
  const { LANGUAGE } = await import("../framework/language.mjs");
  const { BIOMES, BIOME_NAME, BIOME_KINDS } = await import("../../exploration/src/regions.mjs");
  const word = Object.fromEntries(LANGUAGE.lands.map((l) => [l.id, l.word]));
  assert.deepEqual(word, { mixed: "Meadows", woods: "Woods", tallwood: "Tallwood", thickets: "Thickets", fells: "Cliffs", downs: "Hills", marsh: "Marsh", tarns: "Highpools", meres: "Lakes" });
  assert.deepEqual(Object.keys(BIOME_NAME).sort(), [...BIOMES].sort());
  for (const b of BIOMES) assert.equal(BIOME_NAME[b], word[b], `${b}: the realm names the land as the registry does`);
  // the realm's kind draw by land: each biome's kinds are the registry's
  assert.deepEqual(Object.keys(BIOME_KINDS), BIOMES);
  assert.deepEqual(BIOME_KINDS.mixed, ["S08", "S12", "S17"]);
  assert.deepEqual(BIOME_KINDS.downs, ["S02", "S15", "S18"]);
  assert.equal(Object.values(BIOME_KINDS).flat().length, 20);
});

test("roster.read48: the twenty stands at 48 px each differ from every other by IoU under 0.85, and a copy that does not is red", async () => {
  const { loadStands, read48, iou, READ48_LIMIT } = await import("../framework/census.mjs");
  const stands = loadStands();
  assert.equal(Object.keys(stands).length, 20);
  for (const [id, s] of Object.entries(stands)) { assert.equal(s.mask.length, 48 * 48); assert.ok(s.mask.reduce((a, b) => a + b, 0) > 300, `${id}: a silhouette`); }
  const r = read48(stands);
  assert.equal(r.id, "roster.read48");
  assert.equal(r.pairs.length, 190);
  assert.equal(READ48_LIMIT, 0.85);
  assert.ok(r.pass, r.messages.join("; "));
  assert.ok(r.pairs[0].iou < READ48_LIMIT);
  assert.equal(iou(stands.S01.mask, stands.S01.mask), 1);
  // a broken roster: two kinds with the same stand
  const twin = { ...stands, S02: { ...stands.S02, mask: stands.S15.mask } };
  const bad = read48(twin);
  assert.equal(bad.pass, false);
  assert.ok(bad.messages.some((m) => m.includes("S02") && m.includes("S15")));
});

test("the kind check is retired: no hand-drawn animal targets remain", () => {
  assert.equal(existsSync(path.resolve(here, "../frames/targets")), false);
  assert.equal(existsSync(path.resolve(here, "../framework/targets.mjs")), false);
  for (const s of SPECIES) assert.equal(typeof specOf(s).clan, "string");
});

test("the frames of version 8 take their fields from the registry: no resembles, the land's home and colours, a feature line from family and signature", async () => {
  const { LANGUAGE, kindOf, landOf, familyOf } = await import("../framework/language.mjs");
  const { OWED, CLANS } = await import("../framework/roster.mjs");
  for (const s of SPECIES) {
    const k = kindOf(LANGUAGE, s.id), land = landOf(LANGUAGE, k.land), f = frameFile(`language/species-${s.id}.json`), old = frameFile(`species-${s.id}.json`);
    assert.equal(f.taxonomy.resembles, undefined, `${s.id}: v8 names no real animal`);
    assert.equal(f.taxonomy.habitat, land.word, `${s.id}: the habitat is the land's player word`);
    assert.equal(f.signature.feature, OWED["roster.feature"].replace("{family}", familyOf(LANGUAGE, k.family).name).replace("{signature}", k.signature.type), `${s.id}: the feature line`);
    assert.ok(f.signature.features["anatomy.exterior-eye-presence"] === "on", `${s.id}: the face`);
    if (!k.anchor) {
      assert.equal(f.pod.colourPair[0].hex, land.body.hex, `${s.id}: the pod's first colour is the land's body`);
      assert.equal(f.pod.colourPair[1].hex, land.accent.hex, `${s.id}: the pod's second colour is the land's accent`);
    }
    // the frames before the language keep every old field
    assert.equal(old.taxonomy.resembles, CLANS[s.clan].resembles, `${s.id}: the old frame keeps resembles`);
    assert.equal(old.signature.anchor, CLANS[s.clan].anchor, `${s.id}: the old frame keeps its anchor`);
  }
});

test("the OWED strings are listed, and describe.mjs names no real animal", async () => {
  const { OWED } = await import("../framework/roster.mjs");
  assert.deepEqual(Object.keys(OWED).sort(), ["describe.type-line", "roster.feature"]);
  const src = readFileSync(path.resolve(here, "../framework/describe.mjs"), "utf8");
  assert.ok(!src.includes("resembles"), "describe.mjs does not read resembles");
  assert.ok(src.includes('OWED["describe.type-line"]'));
});
