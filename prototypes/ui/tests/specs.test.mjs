// The spec files against the layout document's wireframes and the palette: the one home of the numbers must agree
// with the measured wireframe (station-layouts/*.svg) and name only palette colours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pageGrid, repeat } from "../layout.mjs";

const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const frame = rd("../specs/station/frame.json"), pods = rd("../specs/station/pods.json"), palette = rd("../palettes/station.json");
const wire = (name) => readFileSync(new URL("../../../design/style-guide/station-layouts/" + name, import.meta.url), "utf8");
const svg = wire("02-pods-read.svg"), svgGrid = wire("02-pods-read-grid.svg");
// every <rect> of a wireframe as "x,y,w,h" (strokes sit on the half pixel: x.5 and a size one short)
const rects = (s) => new Set([...s.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
const boxes = rects(svg), gridBoxes = rects(svgGrid);
const has = (r, what, set = boxes) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
// every <polygon> of a wireframe as its points (the rail's slanted tabs)
const polys = (s) => new Set([...s.matchAll(/<polygon points="([^"]+)"/g)].map((m) => m[1]));
// the shared rail's tabs by the rule in frame.json: full tabs up to fullUpTo chapters, else compact with the open tab full;
// each a parallelogram hanging from y, leaning `slant` px right over its height, touching its neighbours
const slantTabs = (x0, n, open, r = frame.regions.rail) => { const out = []; let x = x0; for (let i = 0; i < n; i++) { const w = n <= r.fullUpTo || i === open ? r.full : r.compact; out.push(`${x},${r.y} ${x + w},${r.y} ${x + w + r.slant},${r.y + r.h} ${x + r.slant},${r.y + r.h}`); x += w; } return { tabs: out, run: x - x0 + r.slant }; };

test("the Pods spec file agrees with the Pods wireframe, region by region", () => {
  const R = pods.regions, w = R.well;
  for (let i = 0; i < R.list.slots; i++) { has(repeat(w.rect, i, w.pitch), "well slot " + i); const ring = repeat([w.rect[0] + w.ring.slice[0], w.rect[1] + w.ring.slice[1], ...w.ring.slice.slice(2)], i, w.pitch); assert.equal(ring[0] + 40, 64); assert.equal(ring[1] + 40, 84 + 72 * i); has([48, 60 + 72 * i, ...w.pod.size], "the list pod in well " + i); }
  assert.equal(w.place, null, "no place stamps in the list"); assert.deepEqual(R.list.rect, [0, 40, 112, 522]); assert.deepEqual(w.pod.size, [32, 48]); assert.equal(w.ring.outer, 33); assert.equal(w.focus.radius, w.ring.outer + 4);
  has(R.hatch.rect, "hatch"); has(R.stage.rect, "stage"); has(R.beam.rect, "beam"); has(R.pod.rect, "pod"); has(R.cradle.rect, "cradle"); has(R.name.rect, "name"); has(R.origin.rect, "origin"); has(R.stamp.rect, "stamp"); has(R.page.rect, "page"); has(R.list.rect, "list");
  // the rail: six full tabs in the Picture wireframe, seven compact (the second open) in the Grid wireframe
  const six = slantTabs(R.rail.rect[0], 6, 1), seven = slantTabs(R.rail.rect[0], 7, 1), P6 = polys(svg), P7 = polys(svgGrid);
  for (const t of six.tabs) assert.ok(P6.has(t), "rail tab " + t); for (const t of seven.tabs) assert.ok(P7.has(t), "compact rail tab " + t);
  assert.equal(six.run, 832); assert.equal(seven.run, 488); assert.equal(slantTabs(0, 8, 0).run, 544); assert.equal(slantTabs(0, 12, 0).run, 768);
  assert.deepEqual(R.rail.rect, [176, frame.regions.rail.y, 832, frame.regions.rail.h]); assert.equal(frame.regions.rail.y, 40);
  // the page's Picture state (one large picture) and its Grid state (four traits)
  // the page, one state: six traits in the Pods wireframe, eight in the second
  for (const [n, set] of [[6, boxes], [8, gridBoxes]]) { const g = pageGrid(R.page, n); assert.equal(g.cells.length, n); for (const c of g.cells) has([c[0], c[1], g.picture[0], g.picture[1]], n + "-trait picture", set); }
  assert.deepEqual(R.page.states, ["grid"]); assert.equal(R.page.picture, undefined); assert.deepEqual(pageGrid(R.page, 8).picture, [104, 64]); assert.deepEqual(pageGrid(R.page, 4).picture, [104, 160]);
  assert.deepEqual(R.cradle.rect, [520, 328, 224, 96]); assert.deepEqual(R.cradleFront.rect, R.cradle.rect); assert.equal(pods.colours.origin, "bone");
  assert.deepEqual([R.name.rect, R.name.px, R.name.weight, R.name.plate.h, R.name.plate.min], [[520, 456, 224, 24], 20, 500, 24, 80]); assert.equal(R.name.rect[0] + R.name.rect[2] / 2, R.pod.axis);
  has([592, 456, 80, 24], "the name plate hugging Loika"); has([552, 456, 160, 24], "the name plate hugging Unknown pod");
  has(R.shelf.rect, "shelf slab");
  { const K = R.stampCase.rect, St = R.stamp.rect; has(K, "stamp case"); assert.deepEqual(St, [872, 248, 120, 120]); assert.deepEqual([St[0] - K[0], St[1] - K[1], K[2] - St[2], K[3] - St[3], K[0] + K[2]], [16, 16, 32, 32, 1008], "the label plus 16 px a side, inside the margin"); assert.ok(K[0] >= R.shelf.rect[0] + R.shelf.rect[2] + 16 && K[0] >= R.page.rect[0] + R.page.rect[2] + 16, "the case clears the slab and the page"); assert.equal(K[1] + K[3] / 2, St[1] + St[3] / 2); assert.equal(R.stampCase.lit, false); } assert.equal(R.shelf.rect[0] + R.shelf.rect[2] / 2, R.pod.axis); assert.equal(R.shelf.rect[0] - (page => page[0] + page[2])(R.page.rect), R.stampCase.rect[0] - (R.shelf.rect[0] + R.shelf.rect[2]), "the slab centred in the pod's room"); assert.equal(R.pod.axis, (R.page.rect[0] + R.page.rect[2] + R.stampCase.rect[0]) / 2); assert.ok(R.shelf.rect[0] >= R.page.rect[0] + R.page.rect[2] + 8, "the slab clears the page"); assert.equal(R.name.rect[1] - (R.shelf.rect[1] + R.shelf.rect[3]), 16, "the name 16 px under the slab's front edge");
  assert.deepEqual(R.origin.rect, [520, 488, 224, 40]); assert.equal(R.origin.rect[1] - (R.name.rect[1] + R.name.rect[3]), 8, "the caption 8 px under the name"); assert.deepEqual([R.origin.px, R.origin.weight, R.origin.role], [16, 400, "caption"]); assert.equal(frame.regions.rail.states.open.fill, "hairline"); assert.equal(pods.strings.legsTail.rail, "Legs & Tail"); assert.equal(R.origin.plate, null); assert.deepEqual(R.ribbon.rect, R.origin.rect); assert.equal(frame.colours.ring, "focus"); assert.equal(pods.colours.rail.ring, "focus");
  const ring = frame.focus.ring.tab; assert.deepEqual([ring.top, ring.slantTo, ring.bottom, ring.box], [42, 80, 84, "x - 4, 42, w + 24, 42"]); assert.equal(16 * (ring.slantTo - 40) / 40 + 4, 20, "the right slant ends at x + w + 20, the box's edge");
  // the concept's way round: the page left of the pod, the pod's box 96 px clear of the stamp label at the right
  const pod = R.pod.rect, page = R.page.rect, stamp = R.stamp.rect;
  assert.ok(page[0] + page[2] + 16 <= R.cradle.rect[0] && pod[0] + pod[2] + 96 <= stamp[0] && stamp[0] + stamp[2] + 16 === R.stampCase.rect[0] + R.stampCase.rect[2], "page, pod, stamp from left to right");
  assert.deepEqual(page, [152, 112, 256, 440]); assert.ok(R.stampCase.rect[0] - (page[0] + page[2]) > page[2], "the pod's room is wider than the page"); assert.ok(R.stampCase.rect[2] < page[2], "the stamp case narrower than the page");
  assert.equal(R.cradle.rect[1] + R.cradle.rect[3], R.pod.feet + 32, "the dish's front lip 32 px below the pod's foot line");
  assert.ok(R.pod.feet >= R.pod.dipFloor && R.pod.feet - R.pod.dipFloor <= 4, "the foot stands in the bowl's dip");
  assert.deepEqual(pods.classes.pod, { large: [144, 176], medium: [120, 152], small: [104, 128], list: [32, 48] }); assert.deepEqual(R.pod.rect, [R.pod.axis - 72, R.pod.feet - 176, 144, 176]);
  assert.ok(R.cradle.rect[1] + R.cradle.rect[3] < R.name.rect[1] && R.name.rect[1] + R.name.rect[3] < R.origin.rect[1], "dish, name, origin do not collide");
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
  assert.deepEqual(Object.keys(pods.regions.page.grid), ["1", "2", "3-4", "5-6", "7-8"]);
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
  const groups = new Set(["list", "page", "pod", "rail", "none"]), selectors = new Set(["list.current", "rail.last"]);
  for (const [g, e] of Object.entries(pods.focus)) { if (!groups.has(g) && g !== "fallback" && g !== "initial") assert.fail("group " + g); if (typeof e !== "object") continue; for (const [k, v] of Object.entries(e)) if (["up", "down", "left", "right"].includes(k)) assert.ok(groups.has(v) || selectors.has(v), `${g}.${k} → ${v}`); }
});

test("the page grid in pods.json is the table of station-layouts.md, cell by cell and picture by picture", () => {
  const md = readFileSync(new URL("../../../design/style-guide/station-layouts.md", import.meta.url), "utf8");
  const start = md.indexOf("**Page grid,**"), table = md.slice(start, md.indexOf("**Marks on a picture,**", start)).split("\n").filter((l) => /^\| (\d)/.test(l) && !/9 or more/.test(l));
  assert.equal(table.length, 5, "five rows in the document's table");
  const rect = (a) => a.join(",");
  for (const row of table) {
    const [, traits, cellsText, picText] = row.split("|").map((c) => c.trim()), key = traits.replace("–", "-"), picture = picText.match(/(\d+)×(\d+)/).slice(1).map(Number);
    let doc;
    const list = [...cellsText.matchAll(/(\d+), (\d+), (\d+), (\d+)/g)].map((m) => m.slice(1).map(Number));
    if (list.length) doc = list;   // the cells are listed one by one (one trait, two)
    else {   // "544 or 776, at y 160 and 360; each 216×184" and "x 544, 696, 848 at y 160 and 360; each 144×184"
      const size = cellsText.match(/each (\d+)×(\d+)/).slice(1).map(Number), xs = cellsText.split("at y")[0].match(/\d+/g).map(Number), ys = cellsText.split("at y")[1].split(";")[0].match(/\d+/g).map(Number);
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
