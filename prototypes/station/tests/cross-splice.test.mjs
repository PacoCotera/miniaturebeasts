// The Cross splice (prototypes/ui/specs/station/cross.json): the geometry fits every frame, the routing comes from the forecast, and no copy of an unread chapter is ever drawn.
//   node --test prototypes/station/tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setFrames, frameOf, frameIds } from "../src/genome.mjs";
import * as S from "../src/state.mjs";
import * as L from "../src/library.mjs";
import { overviewPlan, chapterPlan } from "../../ui/specs/derive.mjs";
import { traitLocusCount, chapterLocusCount } from "../src/splice.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), fdir = path.resolve(here, "../../workbench/frames/language");
setFrames(readdirSync(fdir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(fdir, f), "utf8"))));
const spec = JSON.parse(readFileSync(path.resolve(here, "../../ui/specs/station/cross.json"), "utf8"));
const ctx = { spec, measure: (t, px) => t.length * px * 0.5, cap: (px) => px * 0.7, line: (px) => Math.round(px * 1.25) };
const settings = { ...S.DEFAULT_SETTINGS, economy: "decided" };
const world = (id = "S01", seed = 11) => { const st = S.freshSt("w1", 3, 1); S.normalize(st); const r = S.seedAdults(st, id, seed, 2, settings); return { st, a: r.mibis[0], b: r.mibis[1], fr: frameOf(id) }; };

test("the overview's rows fit the 440 on all twenty frames of version 8 with every locus at play: S16 is the tallest at 432 (16 px, 8 px gaps), S03 fits 426 at 14, S09 423 at 15", () => {
  const all = (fr) => fr.chapters.map((c) => ({ id: c.id, state: "open", loci: Array.from({ length: chapterLocusCount(fr, c.id) }, (_, i) => ({ id: c.id + i, play: true })) }));
  const plans = Object.fromEntries(frameIds().map((id) => [id, overviewPlan(all(frameOf(id)), spec)]));
  for (const [id, p] of Object.entries(plans)) { assert.ok(p.fits && p.height <= 440, id + " fits: " + p.height); assert.ok(p.pitch >= 10 && p.pitch <= 16, id); }
  assert.equal(frameIds().length, 20); assert.deepEqual([plans.S03.pitch, plans.S03.gap, plans.S03.height], [14, 8, 426], "S03 Tuikis, the most loci at play"); assert.deepEqual([plans.S09.pitch, plans.S09.gap, plans.S09.height], [15, 8, 423]); assert.deepEqual([plans.S16.pitch, plans.S16.gap, plans.S16.height], [16, 8, 432], "S16 Blikur, the tallest");
  assert.equal(frameOf("S03").chapters.reduce((n, c) => n + chapterLocusCount(frameOf("S03"), c.id), 0), 27, "twenty-seven loci in seven chapters"); assert.equal(plans.S01.pitch, 16, "a small frame keeps the full 16");
});

test("the overview's folds: settled, unread and sealed loci are 4 px hairlines, a chapter is at least 24, and the rows start at y 112", () => {
  const p = overviewPlan([{ id: "x", state: "open", loci: [{ id: "a", play: true }, { id: "b", play: false }] }, { id: "y", state: "unread", loci: [{ id: "c", play: true }, { id: "d", play: true }] }, { id: "z", state: "sealed", loci: [{ id: "e", play: false }] }], spec);
  assert.deepEqual(p.chapters.map((c) => c.rows.map((r) => r.h)), [[16, 4], [4, 4], [4]], "an unread chapter's loci are never at play"); assert.deepEqual(p.chapters.map((c) => c.h), [20 < 24 ? 24 : 20, 24, 24]);
  assert.equal(p.chapters[0].y, 112); assert.equal(p.chapters[1].y, 112 + 24 + 8);
});

test("a chapter view's trait rows are 64 plus 8 a further locus and every chapter of every frame fits the 392 (the tallest of the twenty is S01's Face at 320)", () => {
  let tallest = 0, who = "";
  for (const id of frameIds()) { const fr = frameOf(id); for (const c of fr.chapters) { const p = chapterPlan(c.traits.map((t) => ({ id: t.id, loci: traitLocusCount(fr, t.id) })), spec); assert.ok(p.fits, `${id} ${c.id} ${p.height}`); if (p.height > tallest) { tallest = p.height; who = id + " " + c.id; } assert.equal(p.rows[0].y, 160); } }
  assert.equal(tallest, 320, "the tallest is S01's Face (" + who + ")");
  assert.deepEqual(chapterPlan([{ id: "t", loci: 1 }, { id: "u", loci: 3 }], spec).rows.map((r) => [r.y, r.h]), [[160, 64], [224, 80]]);
});
