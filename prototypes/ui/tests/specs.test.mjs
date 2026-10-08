// The spec files against the layout document's wireframes and the palette: the one home of the numbers must agree
// with the measured wireframe (station-layouts/*.svg) and name only palette colours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { railTabs, pageGrid, repeat } from "../layout.mjs";

const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const frame = rd("../specs/station/frame.json"), pods = rd("../specs/station/pods.json"), palette = rd("../palettes/station.json");
const svg = readFileSync(new URL("../../../design/style-guide/station-layouts/02-pods-read.svg", import.meta.url), "utf8");
// every <rect> of the wireframe as "x,y,w,h" (strokes sit on the half pixel: x.5 and a size one short)
const boxes = new Set([...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
const has = (r, what) => assert.ok(boxes.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);

test("the Pods spec file agrees with the Pods wireframe, region by region", () => {
  const R = pods.regions, w = R.well;
  for (let i = 0; i < R.list.slots; i++) { has(repeat(w.rect, i, w.pitch), "well slot " + i); const ring = repeat([w.rect[0] + w.ring.at[0], w.rect[1] + w.ring.at[1], 64, 64], i, w.pitch); assert.equal(ring[0] + 32, 72); assert.equal(ring[1] + 32, 84 + 72 * i); has(repeat([w.rect[0] + w.place.at[0], w.rect[1] + w.place.at[1], 16, 16], i, w.pitch), "place stamp " + i); }
  has(R.hatch.rect, "hatch"); has(R.stage.rect, "stage"); has(R.beam.rect, "beam"); has(R.pod.rect, "pod"); has(R.cradle.rect, "cradle"); has(R.name.rect, "name"); has(R.origin.rect, "origin"); has(R.stamp.rect, "stamp"); has(R.page.rect, "page"); has(R.list.rect, "list");
  const rail = railTabs(R.rail, 7); assert.equal(rail.tabs.length, 7); for (const t of rail.tabs) has(t, "rail tab");
  const g = pageGrid(R.page, 4); for (const c of g.cells) has([c[0], c[1], g.picture[0], g.picture[1]], "trait picture");
  assert.deepEqual(g.picture, [216, 112]);
});

test("the grid tables follow the layout document: cells inside the page, none touching, a picture inside its cell", () => {
  for (const key of ["page", "compareA"]) for (const [count, t] of Object.entries(pods.regions[key].grid)) {
    const page = pods.regions[key].rect, cells = t.cells;
    for (const [i, c] of cells.entries()) {
      assert.ok(c[0] >= 16 && c[0] + c[2] <= page[2] - 16 && c[1] >= 48 && c[1] + c[3] <= page[3] - 8, `${key} ${count} cell ${i} inside the page`);
      assert.ok(t.picture[0] <= c[2] && t.picture[1] <= c[3], `${key} ${count} picture fits`);
      for (const d of cells.slice(i + 1)) assert.ok(c[0] + c[2] <= d[0] || d[0] + d[2] <= c[0] || c[1] + c[3] <= d[1] || d[1] + d[3] <= c[1], `${key} ${count}: cells do not touch`);
    }
  }
  assert.deepEqual(Object.keys(pods.regions.page.grid), ["1", "2", "3-4", "5-6"]);
});

test("every colour a spec file names is in the palette; every region is on the 8 px grid but the frame's edges (the stage, 40 and 522)", () => {
  const names = new Set(palette.colours.map(([n]) => n)), bad = [];
  const walk = (o) => { for (const v of Object.values(o)) { if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } };
  walk(pods.colours); walk(Object.fromEntries(Object.entries(frame.colours)));
  assert.deepEqual(bad, []);
  const off = []; for (const [id, r] of Object.entries(pods.regions)) if (r.rect && !["compareA", "compareB", "list", "bench"].includes(id) && r.rect.some((v) => v % 8)) off.push(id);
  assert.deepEqual(off, []);
});

test("the focus graph names only groups and selectors the screen resolves", () => {
  const groups = new Set(["list", "pod", "rail", "none"]), selectors = new Set(["list.current", "rail.last"]);
  for (const [g, e] of Object.entries(pods.focus)) { if (!groups.has(g) && g !== "fallback" && g !== "initial") assert.fail("group " + g); if (typeof e !== "object") continue; for (const [k, v] of Object.entries(e)) if (["up", "down", "left", "right"].includes(k)) assert.ok(groups.has(v) || selectors.has(v), `${g}.${k} → ${v}`); }
});

test("the page grid in pods.json is the table of station-layouts.md, cell by cell and picture by picture", () => {
  const md = readFileSync(new URL("../../../design/style-guide/station-layouts.md", import.meta.url), "utf8");
  const start = md.indexOf("**Page grid,**"), table = md.slice(start, md.indexOf("**Marks on a picture,**", start)).split("\n").filter((l) => /^\| (\d)/.test(l) && !/7 or more/.test(l));
  assert.equal(table.length, 4, "four rows in the document's table");
  const rect = (a) => a.join(",");
  for (const row of table) {
    const [, traits, cellsText, picText] = row.split("|").map((c) => c.trim()), key = traits.replace("–", "-"), picture = picText.match(/(\d+)×(\d+)/).slice(1).map(Number);
    let doc;
    const list = [...cellsText.matchAll(/(\d+), (\d+), (\d+), (\d+)/g)].map((m) => m.slice(1).map(Number));
    if (list.length) doc = list;   // the cells are listed one by one (one trait, two)
    else {   // "544 or 776, at y 160 and 360; each 216×184" and "x 544, 696, 848 at y 160 and 360; each 144×184"
      const size = cellsText.match(/each (\d+)×(\d+)/).slice(1).map(Number), xs = cellsText.split("at y")[0].match(/\d+/g).map(Number), ys = cellsText.split("at y")[1].match(/\d+/g).slice(0, 2).map(Number);
      doc = ys.flatMap((y) => xs.map((x) => [x, y, ...size]));
    }
    const page = pods.regions.page.rect, mine = pods.regions.page.grid[key];
    assert.ok(mine, "pods.json has the row " + key);
    assert.deepEqual(mine.cells.map(([x, y, w, h]) => rect([page[0] + x, page[1] + y, w, h])), doc.map(rect), "cells of " + key);
    assert.deepEqual(mine.picture, picture, "picture of " + key);
  }
});

test("Compare's grid for three to six traits is the document's: two columns of 184 with an 8 px gap, pictures 184×104; three columns of 120, pictures 120×96", () => {
  const g = pods.regions.compareA.grid;
  assert.deepEqual(g["3-4"].picture, [184, 104]); assert.ok(g["3-4"].cells.every((c) => c[2] === 184)); assert.equal(g["3-4"].cells[1][0] - (g["3-4"].cells[0][0] + 184), 8);
  assert.deepEqual(g["5-6"].picture, [120, 96]); assert.ok(g["5-6"].cells.every((c) => c[2] === 120)); assert.equal(g["5-6"].cells[1][0] - (g["5-6"].cells[0][0] + 120), 8);
  assert.deepEqual(pods.regions.compareA.rect, [176, 112, 408, 440]); assert.deepEqual(pods.regions.compareB.rect, [600, 112, 408, 440]);
});

test("the Home spec file agrees with the Home wireframe, region by region", () => {
  const home = rd("../specs/station/home.json"), R = home.regions, hsvg = readFileSync(new URL("../../../design/style-guide/station-layouts/01-home.svg", import.meta.url), "utf8");
  const hb = new Set([...hsvg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
  const is = (r, what) => assert.ok(hb.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  const at = (m, o) => [m.rect[0] + o[0], m.rect[1] + o[1], o[2], o[3]];
  is(R.bezel.rect, "bezel"); is(R.glass.rect, "glass"); is(R.bed.rect, "bed");
  assert.deepEqual([R.bezel.rect[0] + R.bezel.inset, R.bezel.rect[1] + R.bezel.inset, R.bezel.rect[2] - 2 * R.bezel.inset, R.bezel.rect[3] - 2 * R.bezel.inset], R.glass.rect);   // the 8 px bezel
  assert.deepEqual([R.knob.rect[0] + 16 - 24, R.knob.rect[1] + 4 - 12, ...R.knob.target], [616, 536, 48, 24]);   // the focus target 48×24 around the 32×8 knob
  for (const k of ["bay", "rack", "incubator", "probe"]) { is(R[k].rect, k); assert.deepEqual(R[k].rect.slice(2), [320, 120]); assert.deepEqual(at(R[k], R[k].lamp), [984, R[k].rect[1] + 12, 12, 12]); }
  assert.deepEqual(R.bay.rect.slice(0, 2), [688, 48]); assert.deepEqual(R.rack.rect.slice(0, 2), [688, 176]); assert.deepEqual(R.incubator.rect.slice(0, 2), [688, 304]); assert.deepEqual(R.probe.rect.slice(0, 2), [688, 432]);   // 8 px gaps
  is(at(R.bay, R.bay.door), "bay door and crates");
  assert.deepEqual(at(R.bay, [R.bay.word[0], R.bay.word[1], 0, 0]).slice(0, 2), [704, 60]);
  const w = R.rack.wells, slots = Array.from({ length: w.slots }, (_, i) => [R.rack.rect[0] + w.at[0] + w.pitch[0] * i, R.rack.rect[1] + w.at[1], w.size[0], w.size[1]]);
  assert.deepEqual(slots[0], [712, 216, 40, 40]); assert.deepEqual([slots[5][0] + 40 - slots[0][0], 40], [280, 40]);   // 712,216 280×40
  is(at(R.incubator, R.incubator.dome), "dome"); is(at(R.incubator, R.incubator.leaves.at), "leaves");
  const L = R.incubator.leaves; assert.equal(L.perRow * L.pitch, 192); assert.equal(L.rows * L.leaf[1] + 16, 40);
  is(at(R.probe, R.probe.cradle), "probe cradle"); is(at(R.probe, R.probe.slot), "sitting slot");
  const S = R.probe.shields; assert.deepEqual([R.probe.rect[0] + S.at[0], R.probe.rect[1] + S.at[1], (S.count - 1) * S.pitch + S.size[0], S.size[1]], [848, 496, 100, 12]);
  assert.deepEqual(R.resident.adult, [144, 152]); assert.deepEqual(R.resident.juvenile, [104, 112]);
  assert.deepEqual(R.ribbon.rect, [40, 72, 608, 40]); assert.deepEqual(R.report.rect.slice(0, 3), [64, 120, 560]);
  const names = new Set(palette.colours.map(([n]) => n)), bad = []; (function walk(o) { for (const v of Object.values(o)) { if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } })(home.colours);
  assert.deepEqual(bad, []);
});

test("the Station frame's language: the zones of the top bar and the bottom line, their rules and marks, in the frame wireframe", () => {
  const F = frame.regions, fsvg = readFileSync(new URL("../../../design/style-guide/station-layouts/00-frame.svg", import.meta.url), "utf8"), fb = new Set([...fsvg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
  for (const k of ["title", "materials", "companion", "time", "action", "subject", "need"]) assert.ok(fb.has(F[k].rect.join(",")), `${k} ${F[k].rect} is not in the frame wireframe`);
  const top = ["title", "materials", "companion", "time"].map((k) => F[k].rect);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1][0] + top[i - 1][2] + 16 <= top[i][0], "top bar zones apart, left to right");
  assert.deepEqual(F.topRules.x, [256, 888]); assert.ok(F.title.rect[0] + F.title.rect[2] < 256 && 256 < F.materials.rect[0] && F.materials.rect[0] + F.materials.rect[2] < F.companion.rect[0] && F.companion.rect[0] + F.companion.rect[2] < 888 && 888 < F.time.rect[0], "the rules between the groups");
  assert.equal(F.time.rect[0] + F.time.rect[2], 1008); assert.equal(F.materials.rect[0] + F.materials.rect[2] / 2, 512);
  assert.deepEqual([F.title.px, F.title.weight, F.title.words, F.companion.words], [20, 500, 1, 0]); assert.deepEqual(F.title.mark, [16, 8, 24, 24]);
  assert.equal(frame.colours.verb, "orange"); assert.equal(frame.colours.capConfirm, "orange"); assert.equal(frame.colours.needLamp, "amber");
  assert.deepEqual(frame.strings.withdrawn, ["dot", "backArrow"], "no dot-joined parts in the frame: the ← is a key cap, the parts are zones");
  for (const k of Object.keys(F.title.marks)) assert.ok(frame.strings.titles[k], "a title slot for " + k);
});
