// The spec files against the layout document's wireframes and the palette: the one home of the numbers must agree
// with the measured wireframe (station-layouts/*.svg) and name only palette colours.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";


const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
const frame = rd("../specs/station/frame.json"), pods = rd("../specs/station/pods.json"), palette = rd("../palettes/station.json");
// the shared rail's run by the rule in frame.json: full tabs up to fullUpTo chapters, else compact with the open tab full
const run = (n, r = frame.regions.rail) => (n <= r.fullUpTo ? n * r.full : (n - 1) * r.compact + r.full) + r.slant;
const inside = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[0] + a[2] <= b[0] + b[2] && a[1] + a[3] <= b[1] + b[3];
const apart = (a, b) => a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];

test("Pods in three states: the collection's six places, rings, labels and the waiting mark", () => {
  const A = pods.regions.collection, P = A.places;
  assert.deepEqual(pods.states, ["collection", "overview", "chapter"]); assert.equal(pods.initial, "collection");
  const places = Array.from({ length: P.slots }, (_, i) => [P.first[0] + P.pitch[0] * (i % P.grid[0]), P.first[1] + P.pitch[1] * Math.floor(i / P.grid[0]), P.first[2], P.first[3]]);
  assert.equal(places.at(-1)[0] + places.at(-1)[2], 1008, "the places end at the right margin"); assert.ok(places.every((r) => r[1] >= 48 && r[1] + r[3] <= 552));
  for (const [i, r] of places.entries()) for (const q of places.slice(i + 1)) assert.ok(apart(r, q), "places apart");
  const pl = places[0], ring = [pl[0] + A.ring.centre[0] - A.ring.outer, pl[1] + A.ring.centre[1] - A.ring.outer, 2 * A.ring.outer, 2 * A.ring.outer];
  assert.ok(inside(ring, pl), "the ring inside its place"); assert.ok(A.pod.size[1] <= 2 * (A.ring.outer - A.ring.band), "the pod inside the ring's opening");
  for (const k of ["place", "grow", "glint"]) assert.ok(inside([pl[0] + A[k].at[0], pl[1] + A[k].at[1], A[k].at[2], A[k].at[3]], pl), k + " inside its place");
  assert.ok(apart(A.waiting.rect, places[3]) && A.waiting.rect[1] + A.waiting.rect[3] <= 552, "the waiting mark under the places");
  assert.deepEqual(pods.classes.pod.collection, [88, 112]);
});

test("the pod overview: the pod first and largest, the figure beside it suggesting the type, the stamp a detail, nothing touching", () => {
  const B = pods.regions.overview, pod = B.pod.rect, axis = B.pod.axis;
  assert.deepEqual(pod, [axis - 72, B.pod.feet - 176, 144, 176]); assert.equal(B.cradle.rect[1] + B.cradle.rect[3], B.pod.feet + 32);
  for (const k of ["cradle", "shelf", "beam", "name"]) assert.equal(B[k].rect[0] + B[k].rect[2] / 2, axis, k + " centred on the axis");
  assert.deepEqual(B.rail.rect, [512 - run(6) / 2, frame.regions.rail.y, 832, frame.regions.rail.h], "the rail centred");
  const f = B.figure.rect; assert.ok(f[0] >= B.shelf.rect[0] + B.shelf.rect[2] + 16, "the figure beside the slab"); assert.equal(f[1] + f[3], B.figure.feet);
  assert.ok(f[2] * f[3] < pod[2] * pod[3], "the figure smaller than the pod"); assert.equal(B.figure.individual, false); assert.match(B.figure.kind, /silhouette/);
  const st = B.stamp.rect, ca = B.stampCase.rect; assert.deepEqual([st[0] - ca[0], st[1] - ca[1], ca[2] - st[2], ca[3] - st[3], ca[0] + ca[2]], [16, 16, 32, 32, 1008]);
  assert.ok(st[0] - (pod[0] + pod[2]) >= 96, "the stamp away from the focal box"); assert.deepEqual(B.stampCaseFront.rect, ca);
  const kin = Array.from({ length: B.kin.max }, (_, i) => [B.kin.first[0] + B.kin.pitch[0] * i, B.kin.first[1], B.kin.first[2], B.kin.first[3]]);
  assert.ok(kin.at(-1)[0] + kin.at(-1)[2] <= 1008, "six kin fit");
  const regions = [B.shelf.rect, f, B.originPicture.rect, B.origin.rect, ...kin, B.hatch.rect, ca, B.name.rect];
  for (const [i, r] of regions.entries()) for (const q of regions.slice(i + 1)) assert.ok(apart(r, q), `regions apart: ${r} and ${q}`);
  assert.deepEqual(B.ribbon.rect, B.origin.rect);
});

test("the chapter page: the pod's room shrunk to the pod and the dish, the page taking the rest, no picture larger than the pod", () => {
  const C = pods.regions.chapter, pg = C.page, pod = C.pod.rect;
  assert.equal(C.pod.axis, 216); assert.ok(pg.rect[0] >= C.shelf.rect[0] + C.shelf.rect[2] + 16, "the page clear of the slab"); assert.equal(pg.rect[0] + pg.rect[2], 1008);
  for (const g of Object.values(pg.grid)) assert.ok(g.picture[0] * g.picture[1] <= pod[2] * pod[3], "no page picture larger than the pod's box");
  for (const [n, g] of Object.entries(pg.grid)) { const low = Math.max(...g.cells.map((c) => c[1] + c[3])); assert.ok(low + 8 <= pg.heightByCount[n], "the pane holds its cells"); }
  assert.deepEqual(Object.keys(pg.grid), ["1-4", "5-8"]); assert.equal(pg.unread.picture, null); assert.deepEqual(pg.newMark.size, [6, 6]);
});

test("the grid tables follow the layout document: cells inside the page, none touching, a picture inside its cell", () => {
  for (const reg of [pods.regions.chapter.page, pods.regions.compareA]) for (const [count, t] of Object.entries(reg.grid)) {
    const hb = reg.heightByCount, page = hb ? [...reg.rect.slice(0, 3), hb[count]] : reg.rect, cells = t.cells;
    for (const [i, c] of cells.entries()) {
      assert.ok(c[0] >= 16 && c[0] + c[2] <= page[2] - 16 && c[1] >= 48 && c[1] + c[3] <= page[3] - 8, `${count} cell ${i} inside the page`);
      assert.ok(t.picture[0] <= c[2] && t.picture[1] <= c[3], `${count} picture fits`);
      for (const d of cells.slice(i + 1)) assert.ok(apart(c, d), `${count}: cells do not touch`);
    }
  }
});

test("every colour a spec file names is in the palette; every region is on the 8 px grid but the frame's edges (the stage, 40 and 522)", () => {
  const names = new Set(palette.colours.map(([n]) => n)), bad = [];
  const walk = (o) => { for (const v of Object.values(o)) { if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } };
  walk(pods.colours); walk(Object.fromEntries(Object.entries(frame.colours)));
  assert.deepEqual(bad, []);
  const off = []; const rects = (o, path) => { for (const [k, v] of Object.entries(o)) { if (k === "rect" && Array.isArray(v)) { if (v.some((n) => n % 8)) off.push(path); } else if (v && typeof v === "object" && !Array.isArray(v)) rects(v, path + "." + k); } };
  for (const st of ["collection", "overview", "chapter"]) rects(pods.regions[st], st);
  assert.deepEqual(off, []);
});

test("the focus graphs, one per state, name only groups and selectors the screen resolves", () => {
  const groups = { collection: ["place"], overview: ["pod", "rail", "kin", "hatch", "none"], chapter: ["rail", "none"] }, selectors = new Set(["rail.last", "kin.first", "rail.open"]);
  for (const [st, graph] of Object.entries(pods.focus)) {
    const g = new Set(groups[st]); assert.ok(g.size, "a state " + st);
    for (const [k, e] of Object.entries(graph)) { if (["fallback", "initial", "back"].includes(k)) continue; assert.ok(g.has(k), `${st}: group ${k}`); for (const [d, v] of Object.entries(e)) if (["up", "down", "left", "right"].includes(d) && v) assert.ok(g.has(v) || selectors.has(v), `${st}.${k}.${d} → ${v}`); }
  }
});

test("the page grid in pods.json is the table of station-layouts.md, cell by cell and picture by picture", () => {
  const md = readFileSync(new URL("../../../design/style-guide/station-layouts.md", import.meta.url), "utf8");
  const start = md.indexOf("**Page grid,**"), table = md.slice(start, md.indexOf("**Marks on a picture,**", start)).split("\n").filter((l) => /^\| (\d)/.test(l) && !/9 or more/.test(l));
  assert.equal(table.length, 2, "two rows in the document's table");
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
    const page = pods.regions.chapter.page.rect, mine = pods.regions.chapter.page.grid[key];
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
