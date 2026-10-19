// The spec files against the layout document's wireframes and the palette: the one home of the numbers must agree
// with the measured wireframe (station-layouts/*.svg) and name only palette colours.
import { pageSize } from "../specs/derive.mjs";
import { moveFocus, graphProblem } from "../focus.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { floorThresholds, FLOOR_SCENES, zoneRange } from "../rings.mjs";


const rd = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf8"));
// a focus ring shape (frame.json focus.ring.shapes): "oval", "footprint", "tab", { rect: r [, chip: n] }, { circle: "box" } or { circle: { centre: [x, y], r } }
const isShape = (v) => v === "oval" || v === "footprint" || v === "tab" || (!!v && typeof v === "object" && ((Number.isInteger(v.rect) && v.rect >= 0 && Object.keys(v).every((k) => k === "rect" || (k === "chip" && Number.isInteger(v.chip) && v.chip >= 0)))
  || (Object.keys(v).length === 1 && v.circle !== undefined && (v.circle === "box" || (Number.isInteger(v.circle.r) && v.circle.r > 0 && Array.isArray(v.circle.centre) && v.circle.centre.length === 2)))));
const frame = rd("../specs/station/frame.json"), pods = rd("../specs/station/pods.json"), palette = rd("../palettes/station.json");
// the shared rail's run by the rule in frame.json: full tabs up to fullUpTo chapters, else compact with the open tab full
const run = (n, r = frame.regions.rail) => (n <= r.fullUpTo ? n * r.full : (n - 1) * r.compact + r.full) + r.slant;
const inside = (a, b) => a[0] >= b[0] && a[1] >= b[1] && a[0] + a[2] <= b[0] + b[2] && a[1] + a[3] <= b[1] + b[3];
const apart = (a, b) => a[0] + a[2] <= b[0] || b[0] + b[2] <= a[0] || a[1] + a[3] <= b[1] || b[1] + b[3] <= a[1];

test("Pods in three states: the collection's six places, rings, labels and the waiting mark", () => {
  const A = pods.regions.collection, P = A.places;
  assert.deepEqual(pods.states, ["collection", "overview", "chapter"]); assert.equal(pods.initial, "collection");
  const places = Array.from({ length: P.slots }, (_, i) => [P.first[0] + P.pitch[0] * (i % P.grid[0]), P.first[1] + P.pitch[1] * Math.floor(i / P.grid[0]), P.first[2], P.first[3]]);
  assert.equal(places.at(-1)[0] + places.at(-1)[2], 952, "the places end where the re-laid collection on the plain stage ends (64 + 2 × 300 + 288)"); assert.ok(places.every((r) => r[1] >= 48 && r[1] + r[3] <= 552));
  for (const [i, r] of places.entries()) for (const q of places.slice(i + 1)) assert.ok(apart(r, q), "places apart");
  const pl = places[0], ring = [pl[0] + A.ring.centre[0] - A.ring.outer, pl[1] + A.ring.centre[1] - A.ring.outer, 2 * A.ring.outer, 2 * A.ring.outer];
  assert.ok(inside(ring, pl), "the ring inside its place"); assert.ok(A.pod.size[1] <= 2 * (A.ring.outer - A.ring.band), "the pod inside the ring's opening");
  for (const k of ["grow", "glint"]) assert.ok(inside([pl[0] + A[k].at[0], pl[1] + A[k].at[1], A[k].at[2], A[k].at[3]], pl), k + " inside its place");
  assert.ok(apart(A.waiting.rect, places[3]) && A.waiting.rect[1] + A.waiting.rect[3] <= 552, "the waiting mark under the places");
  assert.deepEqual(pods.classes.pod.collection, [88, 112]);
  assert.ok(!("selected" in A.ring.masters)); assert.equal(A.ring.masters.closed, "ring-collection-closed-176x176"); assert.deepEqual(A.ring.focus, { form: "targets.place.shape" }, "the place ring is the target's shape: no copy of the tokens"); assert.deepEqual(pods.targets.place.shape, { circle: { centre: A.ring.centre, r: A.ring.slice[2] / 2 } }, "the ring round the gauge slice's radius 88"); assert.equal(A.glint.slice, "glint-star-12x12"); assert.deepEqual(A.ring.slice, [8, 0, 176, 176]); assert.equal(A.ring.slice[0] + 88, A.ring.centre[0]); assert.equal(A.ring.slice[1] + 88, A.ring.centre[1]); assert.ok(!("collectionRing" in pods.colours), "the build draws no arcs"); assert.ok(!("ringRead" in pods.colours), "one home for the ring's colours");
  assert.equal(pods.strings.openChapter, "Turn to {chapter}"); assert.equal(pods.strings.wayBack.chapter, "{name}");
});

// P1 (fix 5): the painted floor of the case runs x 64 to 952 and y 88 to 535 (pixels, inclusive) on every Pods stage; the rail and the bottom line are the frame's
const FLOOR = [64, 88, 953, 536], onFloor = (r) => r[0] >= FLOOR[0] && r[1] >= FLOOR[1] && r[0] + r[2] <= FLOOR[2] && r[1] + r[3] <= FLOOR[3];

test("the pod overview: the pod first and largest, the figure beside it suggesting the type, the stamp a detail, nothing touching", () => {
  const B = pods.regions.overview, pod = B.pod.rect, axis = B.pod.axis;
  assert.deepEqual(pod, [axis - 72, B.pod.feet - 176, 144, 176]); assert.equal(B.cradle.rect[1] + B.cradle.rect[3], B.pod.feet + 32);
  for (const k of ["cradle", "shelf", "beam", "name"]) assert.equal(B[k].rect[0] + B[k].rect[2] / 2, axis, k + " centred on the axis");
  assert.deepEqual(B.rail.rect, [512 - run(6) / 2, frame.regions.rail.y, 832, frame.regions.rail.h], "the rail centred");
  const f = B.figure.rect; assert.ok(f[0] >= B.shelf.rect[0] + B.shelf.rect[2] - 8, "the figure beside the slab (GB1 C1: its box may overlap the slab by 8 px)"); assert.deepEqual(f, [392, 240, 144, 152], "GB1 C1: the species' painted adult, 144×152, bottom-centred on (464, 392)"); assert.equal(f[0] - (pod[0] + pod[2]), 64, "the figure pairs with the pod, 64 px from its box (GB1 C1)"); assert.equal(f[1] + f[3], B.figure.feet); assert.equal(B.figure.feet, B.pod.feet, "on the pod's feet line"); assert.deepEqual(B.figure.caption.rect, [400, 400, 128, 24]); assert.deepEqual(B.figure.beforeIdentify, { slice: "mibi-halo-empty-128x160", rect: [400, 232, 128, 160] }, "the empty halo keeps its own picture and rect"); assert.ok(!B.who && !B.figure.slices, "GB1 C2: no who-marks; no mist and clear slices"); assert.deepEqual(B.thisPod.rect, [144, 488, 224, 24]);
  assert.ok(f[2] * f[3] < pod[2] * pod[3], "the figure smaller than the pod"); assert.equal(B.figure.individual, false); assert.match(B.figure.kind, /painted adult/);
  const st = B.stamp.rect, ca = B.stampCase.rect; assert.deepEqual([st[0] - ca[0], st[1] - ca[1], ca[2] - st[2], ca[3] - st[3]], [16, 16, 32, 32]); assert.deepEqual(st, frame.regions.stampSlot.label, "the label at the shared stamp slot, as on Create");
  assert.ok(st[0] - (pod[0] + pod[2]) >= 96, "the stamp away from the focal box"); assert.deepEqual(B.stampCaseFront.rect, ca);
  const kin = Array.from({ length: B.kin.max }, (_, i) => [B.kin.first[0] + B.kin.pitch[0] * i, B.kin.first[1], B.kin.first[2], B.kin.first[3]]);
  assert.equal(B.kin.max, 5, "the rack holds six, so a pod has at most five kin (fix 5)"); assert.ok(kin.at(-1)[0] + kin.at(-1)[2] <= FLOOR[2], "five kin fit the floor");
  assert.deepEqual(B.origin.rect, [680, 128, 264, 40], "the origin sentence ends on the floor, not on the wall");
  for (const [k, r] of Object.entries({ pod, figure: f, caption: B.figure.caption.rect, originPicture: B.originPicture.rect, origin: B.origin.rect, hatch: B.hatch.rect, ...Object.fromEntries(kin.map((r, i) => ["kin" + i, r])), name: B.name.rect })) assert.ok(onFloor(r), `P1: ${k} ${r} lies on the case's floor`);
  const regions = [B.shelf.rect, f, B.originPicture.rect, B.origin.rect, ...kin, B.hatch.rect, ca, B.name.rect];
  for (const [i, r] of regions.entries()) for (const q of regions.slice(i + 1)) assert.ok(apart(r, q) || [r, q].some((x) => x === B.figure.rect) && [r, q].some((x) => x === B.shelf.rect), `regions apart: ${r} and ${q}`);   // GB1 C1: the figure (392, 240, 144, 152) may overlap the slab's right 8 px: it stands on the pod's feet line
  assert.deepEqual(B.ribbon.rect, B.origin.rect); assert.equal(B.bench.slice, "room-bench-stage-overview"); assert.equal(B.bench.pool[0], axis); assert.equal(pods.regions.chapter.bench.pool[0], pods.regions.chapter.pod.axis); assert.equal(B.kin.ring, "ring-kin-56x56");
});

test("the chapter page: the pod's room shrunk to the pod and the dish, the page taking the rest, no picture larger than the pod", () => {
  const C = pods.regions.chapter, pg = C.page, pod = C.pod.rect;
  assert.equal(C.pod.axis, 216); assert.ok(pg.rect[0] >= C.shelf.rect[0] + C.shelf.rect[2], "the page room clear of the slab"); assert.deepEqual(pg.rect, [360, 88, 592, 448], "the page room"); assert.ok(onFloor(pg.rect), "P1: the page room is on the floor"); assert.equal(pg.anchor, "count"); assert.equal(pg.pane, null, "the open page: no pane"); assert.equal(pg.cell.fill, "ground"); assert.deepEqual(pg.cell.content.inside, [96, 120]); assert.deepEqual([pg.gap.x, pg.gap.y], [16, 24]);
  for (const g of Object.values(pg.grid)) assert.ok(g.picture[0] * g.picture[1] <= pod[2] * pod[3], "no page picture larger than the pod's box");
  for (const [k, g] of Object.entries(pg.grid)) { const n = Number(k.split("-").at(-1)), low = Math.max(...g.cells.map((c) => c[1] + c[3])); assert.ok(low <= pageSize(pg, n)[1], "the page holds its cells"); }
  // the page's one rule (the open page, no pane): columns are the count up to four, then half the count rounded up; width 8 + 144 per column; 232 for one row, 440 for two
  for (let n = 1; n <= 8; n++) { const cols = n <= 4 ? n : Math.ceil(n / 2); assert.deepEqual(pageSize(pg, n), [8 + 144 * cols, n <= 4 ? 232 : 440], `${n} traits`); }
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => pageSize(pg, n)[0]), [152, 296, 440, 584, 440, 440, 584, 584]); assert.deepEqual(pageSize(pg, 0), [152, 232], "a shut chapter is the one-trait size"); assert.deepEqual(pg.sealedFind, [392, 256, 112, 112]); assert.deepEqual(pg.sealedFindWell, { id: "plate-well-120x120", at: [388, 252] }, "GB1 D1: the find in its well, absolute");
  // P4: the origin by the pod's frame; the widest page ends at 944 on the floor, a one-row frame stands its pictures on the pod's feet line, a two-row frame starts at y 88
  assert.deepEqual(pg.originX, { 1: 360, 2: 360, 3: 360, 4: 360 }, "GB1 D1: cells start at x 384 for every count"); assert.deepEqual(pg.originY, { 1: 184, 2: 96 }, "P.y 232 (one row), 144 and 344 (two)"); assert.equal(pg.x, 384); assert.deepEqual(pg.rowsY, { 1: [232], 2: [144, 344] });
  for (const cols of [1, 2, 3, 4]) { const w = 8 + 144 * cols, x = pg.originX[cols]; assert.ok(onFloor([x, pg.originY[1], w, 232]), `the ${cols}-column page is on the floor`); }
  for (const rows of [1, 2]) assert.ok(onFloor([pg.originX[4], pg.originY[rows], 584, rows === 1 ? 232 : 440]), `the ${rows}-row page is on the floor`);
  assert.equal(pg.originY[1] + pg.grid["1-4"].cells[0][1] + pg.grid["1-4"].picture[1], C.pod.feet, "one row: the pictures stand on the pod's feet line"); assert.equal(pg.originY[2] + pg.headingTwo[1], 94, "two rows: the heading at (384, 94)"); assert.equal(pg.originY[2] + pg.ruleTwo[1], 124, "two rows: the rule at y 124"); assert.equal(pg.originY[1] + pg.heading[1], 190, "one row: the heading at y 190"); assert.equal(pg.originY[1] + pg.rule.at[1], 220, "one row: the rule at y 220");
  assert.match(pg.frameRule, /largest grid/); assert.match(pg.cell.fillWhen, /never: the well.s floor is the tone/); assert.deepEqual([pg.cell.doingLine.px, pg.cell.doingLine.wrap, pg.cell.doingLine.lines, pg.cell.doingLine.line, pg.cell.doingLine.align, pg.cell.doingLine.colour], [16, 140, 2, 20, "centre", "line"]); assert.equal(pods.colours.page.line, "fog"); assert.match(pg.doingPicture, /no look suffix/);
  assert.deepEqual(Object.keys(pg.grid), ["1-4", "5-6", "7-8"]); assert.equal(pg.unread.picture, null); assert.deepEqual(pg.newMark.size, [6, 6]);
});

test("the grid tables follow the layout document: cells inside the page, none touching, a picture inside its cell", () => {
  for (const reg of [pods.regions.chapter.page, pods.regions.compareA]) for (const [count, t] of Object.entries(reg.grid)) {
    const n = Number(count.split("-").at(-1)), page = reg.sizeByCount ? [...reg.rect.slice(0, 2), ...pageSize(reg, n)] : reg.rect, cells = t.cells;   // the size for the table's largest count
    for (const [i, c] of cells.entries()) {
      const inset = reg.pane === null ? [0, 0] : [16, 8];   // the open chapter page has no pane, so no edge to keep off; Compare's panes keep their insets
      assert.ok(c[0] >= 16 && c[0] + c[2] <= page[2] - inset[0] && c[1] >= 48 && c[1] + c[3] <= page[3] - inset[1], `${count} cell ${i} inside the page`);
      assert.ok(t.picture[0] <= c[2] && t.picture[1] <= c[3], `${count} picture fits`);
      for (const d of cells.slice(i + 1)) assert.ok(apart(c, d), `${count}: cells do not touch`);
    }
  }
});

test("every colour a spec file names is in the palette; every region is on the 8 px grid but the frame's edges (the stage, 40 and 522)", () => {
  const names = new Set(palette.colours.map(([n]) => n)), bad = [];
  const walk = (o) => { for (const [k, v] of Object.entries(o)) { if (k === "note") continue; if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } };
  walk(pods.colours); walk(Object.fromEntries(Object.entries(frame.colours)));
  assert.deepEqual(bad, []);
  const off = []; const rects = (o, path) => { for (const [k, v] of Object.entries(o)) { if (k === "rect" && Array.isArray(v)) { if (!path.endsWith(".bench") && !o.offGrid && v.some((n) => n % 8)) off.push(path); } else if (v && typeof v === "object" && !Array.isArray(v)) rects(v, path + "." + k); } };
  for (const st of ["collection", "overview", "chapter"]) rects(pods.regions[st], st);
  assert.deepEqual(off, []);
});

test("the focus graphs, one per state, name only groups and selectors the screen resolves", () => {
  const groups = { collection: ["place"], overview: ["pod", "rail", "kin", "hatch", "none"], chapter: ["rail", "none"], compare: ["rail", "none"] }, selectors = new Set(["rail.last", "kin.first", "rail.open"]);
  for (const [st, graph] of Object.entries(pods.focus)) {
    const g = new Set(groups[st]); assert.ok(g.size, "a state " + st);
    for (const [k, e] of Object.entries(graph)) { if (["fallback", "initial", "back"].includes(k)) continue; assert.ok(g.has(k), `${st}: group ${k}`); for (const [d, v] of Object.entries(e)) if (["up", "down", "left", "right"].includes(d) && v) for (const x of Array.isArray(v) ? v : [v]) assert.ok(g.has(x) || selectors.has(x), `${st}.${k}.${d} → ${x}`); }   // an edge may be a list (lvgl-switch.md §2.6.1)
  }
});

test("Compare's graph: the rail's tabs are its targets, ◀ ▶ step the chapters (lvgl-switch.md §2.6.1), ▲ ▼ do nothing, the ring on the open tab", () => {
  const g = pods.focus.compare, rail = g.rail, keys = ["up", "down", "left", "right"];
  assert.deepEqual(Object.keys(g).filter((k) => typeof g[k] === "object"), ["rail"], "one group, the rail");
  assert.deepEqual([...rail.stepper].sort(), ["left", "right"]);
  assert.ok(new Set(rail.stepper).size === rail.stepper.length && rail.stepper.every((k) => keys.includes(k)), "the stepper's keys: distinct and known");
  assert.ok(!rail.stepper.some((k) => k in rail), "no edge on a stepper key");
  assert.ok(!("order" in rail) && !("axis" in rail), "no axis or order beside the stepper");
  assert.equal(rail.up, "none"); assert.equal(rail.down, "none"); assert.equal(g.fallback, "none");
  assert.equal(g.initial, "rail.open"); assert.equal(g.initial, pods.focus.chapter.initial, "opens on the open tab, as the chapter page does");
  assert.equal(pods.targets.tab.group, "rail"); assert.equal(pods.targets.tab.shape, "tab"); assert.ok(pods.targets.tab.states.includes("compare"), "the tab ring on Compare");
  const K = pods.keys.compare; for (const k of [...keys, "confirm", "back", "targets", "opens"]) assert.equal(typeof K[k], "string", "keys.compare." + k);
  for (const k of rail.stepper) assert.ok(K[k].startsWith("step:" + k), k + " is a step");
  assert.equal(frame.navigation.screens["pods.compare"].parent, "pods.overview", "← closes Compare to the overview");
});

test("the page grid in pods.json is the table of station-layouts.md, cell by cell and picture by picture", () => {
  const md = readFileSync(new URL("../../../design/style-guide/station-layouts.md", import.meta.url), "utf8");
  const start = md.indexOf("**Page grid,**"), table = md.slice(start, md.indexOf("**Marks after the name,**", start)).split("\n").filter((l) => /^\| (\d)/.test(l) && !/9 or more/.test(l) && /^\d+×\d+$/.test(l.split("|")[3].trim()));   // the grid's rows (their third column is the picture, "128×160"), not the size table's
  assert.equal(table.length, 3, "three rows in the document's table (1–4, 5–6, 7–8)");
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
    const page = [424, 112] /* the document's table was written for the page at (424, 112); fix 5 moves the origin by the frame (originX, originY), the cells' offsets stay */, mine = pods.regions.chapter.page.grid[key];
    assert.ok(mine, "pods.json has the row " + key);
    assert.deepEqual(mine.cells.map(([x, y, w, h]) => rect([page[0] + x, page[1] + y, w, h])), doc.map(rect), "cells of " + key);
    assert.deepEqual(mine.picture, picture, "picture of " + key);
  }
});

test("Compare's grid for three to six traits is the document's: two columns of 184 with an 8 px gap, pictures 184×104; three columns of 120, pictures 120×96", () => {
  // fix 5 §5 Compare: the signed picture sizes (128×160, 104×160, 104×96), the panes hugging their grid inside the floor
  const A = pods.regions.compareA, g = A.grid;
  assert.deepEqual(Object.keys(g), ["1", "2", "3", "4-6"]); assert.deepEqual(Object.values(g).map((r) => r.picture), [[128, 160], [128, 160], [104, 160], [104, 96]]);
  assert.deepEqual(g["1"].cells, [[140, 56, 128, 228]]); assert.deepEqual(g["2"].cells, [[68, 56, 128, 228], [212, 56, 128, 228]]); assert.deepEqual(g["3"].cells, [[28, 56, 104, 228], [152, 56, 104, 228], [276, 56, 104, 228]]);
  assert.deepEqual(g["4-6"].cells.map((c) => [c[0], c[1]]), [[28, 56], [152, 56], [276, 56], [28, 236], [152, 236], [276, 236]]); assert.ok(g["4-6"].cells.every((c) => c[2] === 104 && c[3] === 164));
  for (const r of Object.values(g)) for (const c of r.cells) assert.ok(c[2] >= r.picture[0] && c[3] >= r.picture[1] + 8 + 20, "a cell holds its picture, the name line and the look lines' room");
  assert.deepEqual(A.rect, [96, 112, 408, 416]); assert.deepEqual(pods.regions.compareB.rect, [520, 112, 408, 416]); assert.deepEqual(A.heightByCount, { 1: 300, 2: 300, 3: 300, 4: 416, 5: 416, 6: 416 });
  for (const n of [1, 2, 3, 4, 5, 6]) for (const rect of [[96, 112, 408, A.heightByCount[n]], [520, 112, 408, A.heightByCount[n]]]) assert.ok(onFloor(rect), `P1: Compare's pane for ${n} traits is on the floor`);
  assert.deepEqual(pageSize(A, 2), [408, 300]); assert.deepEqual(pageSize(A, 5), [408, 416]);
  assert.deepEqual(Object.keys(pods.composed), ["collection", "collectionEmpty", "overview", "chapter", "chapterSealed", "compare"], "every state names its main object (rule 1)");
});

test("the Station frame's language: the zones of the top bar and the bottom line, their rules and marks, in the frame wireframe", () => {
  const F = frame.regions, fsvg = readFileSync(new URL("../../../design/style-guide/station-layouts/00-frame.svg", import.meta.url), "utf8"), fb = new Set([...fsvg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
  for (const k of ["title", "materials", "companion", "time", "action", "subject", "need", "back"]) assert.ok(fb.has(F[k].rect.join(",")), `${k} ${F[k].rect} is not in the frame wireframe`);
  assert.equal(F.action.wait.icon, "icon-wait-16", "the bud's wait is the price's fourth group, one picture id everywhere (fix 6 N1a)"); assert.deepEqual([F.action.wait.token, F.action.wait.size, F.action.wait.colour, F.action.wait.never], ["⧗", [16, 16], "price", "need"]);
  const bot = ["action", "subject", "need", "back"].map((k) => F[k].rect); assert.deepEqual(F.separators.x, [404, 620]);
  assert.ok(bot[0][0] + bot[0][2] < 404 && 404 < bot[1][0] && bot[1][0] + bot[1][2] < 620 && 620 < bot[2][0], "rules between action, context and notice");
  assert.equal(F.need.right + F.back.gapBefore, F.back.rect[0], "the notice 24 px before the way back"); assert.equal(F.back.right, 1008); assert.equal(F.subject.rect[0] + F.subject.rect[2] / 2, 512);
  for (const id of ["frame-room-home-24", "frame-room-research-24", "frame-room-library-24", "frame-room-vivarium-24", "frame-companion-solid-16x24", "frame-companion-outline-16x24", "frame-lamp-8-mint", "frame-lamp-8-stone", "home-lamp-amber-12x12", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12", "home-lamp-sky-12x12", "face-{mibi}-24-away", "face-24-empty", "frame-sun-16"]) assert.ok(JSON.stringify(F.marks).includes(id), "slice " + id);
  assert.deepEqual(Object.keys(F.marks.lamp12).sort(), ["needsYou", "off", "waiting", "well"]);
  assert.equal(F.top.slice, "frame-top-bar-1024x40"); assert.equal(F.line.slice, "frame-bottom-line-1024x38");
  assert.equal(F.marks.scale, "never");
  const top = ["title", "materials", "companion", "time"].map((k) => F[k].rect);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1][0] + top[i - 1][2] + 16 <= top[i][0], "top bar zones apart, left to right");
  assert.deepEqual(F.topRules.x, [256, 888]); assert.ok(F.title.rect[0] + F.title.rect[2] < 256 && 256 < F.materials.rect[0] && F.materials.rect[0] + F.materials.rect[2] < F.companion.rect[0] && F.companion.rect[0] + F.companion.rect[2] < 888 && 888 < F.time.rect[0], "the rules between the groups");
  assert.equal(F.time.rect[0] + F.time.rect[2], 1008); assert.equal(F.materials.rect[0] + F.materials.rect[2] / 2, 512);
  assert.deepEqual([F.title.px, F.title.weight, F.title.words, F.companion.words], [20, 500, 1, 0]); assert.deepEqual(F.title.mark, [16, 8, 24, 24]);
  assert.equal(frame.colours.verb, "orange"); assert.equal(frame.colours.capConfirm, "orange");
  assert.deepEqual(frame.strings.withdrawn, ["dot", "backArrow"], "no dot-joined parts in the frame: the ← is a key cap, the parts are zones");
  // the way back is 88 wide with 68 px of room for its word, the notice ends 24 px before it; every title's mark is the icon of a key (station-layouts.md, The column and the keys)
  assert.deepEqual(F.back.rect, [920, 570, 88, 24]); assert.equal(F.back.room, F.back.rect[2] - F.back.cap[0] - F.back.capGap); assert.deepEqual(F.need.rect, [624, 570, 272, 24]); assert.equal(F.need.right, F.need.rect[0] + F.need.rect[2]);
  assert.deepEqual(Object.keys(F.marks.room).filter((k) => k !== "size").sort(), ["home", "library", "research", "vivarium"], "four room marks, one per coloured key");
  for (const [screen, room] of Object.entries(F.title.marks)) assert.ok(F.marks.room[room.toLowerCase()], `${screen}: its mark ${room} is a key's icon`);
  assert.equal(F.title.marks.cargo, "Home", "Cargo carries Home's mark"); for (const k of ["vivarium", "habitat", "cross", "sitting"]) assert.equal(F.title.marks[k], "Vivarium", k);
  for (const k of Object.keys(F.title.marks)) assert.ok(frame.strings.titles[k], "a title slot for " + k);
});

// The wireframe's measured boxes, as the Home test reads them: each <rect> back to [x, y, w, h].
const boxesOf = (file) => new Set([...readFileSync(new URL("../../../design/style-guide/station-layouts/" + file, import.meta.url), "utf8").matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
const frameRef = (ref) => ref.slice("frame.json ".length).split(".").reduce((o, k) => (o == null ? o : o[k]), JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8")));
const paletteBad = (colours) => { const names = new Set(palette.colours.map(([n]) => n)), bad = []; (function walk(o, up = "") { for (const [k, v] of Object.entries(o)) { if (k === "note" || (k === "floor" && up === "plaque") || (k === "plate" && typeof v === "string" && v.startsWith("painted"))) continue; if (typeof v === "string") { if (!names.has(v) && !(/^frame\.json regions\.marks\./.test(v) && frameRef(v) !== undefined)) bad.push(v); }   /* a lamp is a signed picture of frame.json, named by its path there (it must resolve), not a colour */ else if (v && typeof v === "object") walk(v, k); } })(colours); return bad; };
// the closed vocabulary and the closed list of derived rules (station-layouts.md, The vocabulary (closed); leaves and leafArc: architect, 2026-10-09 13:24)
const WORDS = new Set(["frame", "topBar", "bottomLine", "messagePlate", "focusRing", "panel", "stampLabel", "chapterRail", "chapterPage", "list", "specimen", "livingWindow", "ribbon", "text", "leaves"]);
const LAYOUT_RULES = new Set(["railCompaction", "slantTabs", "pageGrid", "platePosition", "listPitch", "splicePlan", "guideColumns", "pipGroups", "leafArc"]);
const lintRegions = (spec) => { for (const [id, r] of Object.entries(spec.regions)) { assert.ok(r.component || r.build, `${spec.screen}.${id} names its word or composition`); if (r.component) assert.ok(WORDS.has(r.component), `${spec.screen}.${id}: ${r.component} is a word of the closed vocabulary`); for (const k of r.layout ?? []) assert.ok(LAYOUT_RULES.has(k), `${spec.screen}.${id}: ${k} is a closed rule`); if (id !== "bench" && id !== "stage" && !r.offGrid) assert.ok(r.rect.every((n) => n % 8 === 0), `${spec.screen}.${id} on the 8 px grid`); } };   // the bench and Home's stage are the frame's stage (40, 522)
const STEP_KEYS = ["up", "down", "left", "right"];

test("the Create spec file agrees with the Create wireframes, region by region, and names a word for every region", () => {
  const cr = rd("../specs/station/create.json"), R = cr.regions, B = boxesOf("03-create.svg"), G = boxesOf("03c-create-grow.svg"), N = boxesOf("03e-create-nothing-read.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["rail", "roll", "traitLine", "chamber", "founder", "pod", "cradle", "origin", "stamp", "code"]) is(R[k].rect, k);   // the capsule's chamber (dome) is T-20261016-222's: 793, 104, 145, 224, not in the old wireframe
  for (const k of ["rail", "chamber", "founder", "pod", "stamp", "code"]) is(R[k].rect, k + " (nothing read)", N);   // the trait line has no size in nothingRead (fix 5 C2)
  for (const k of ["stampCase", "stampCaseFront"]) { is(R[k].rect, k); is(R[k].rect, k + " (nothing read)", N); is(R[k].rect, k + " (grow)", G); }
  assert.ok(!N.has(R.roll.rect.join(",")), "no roll when nothing is read"); assert.deepEqual(R.roll.inStates, ["shape"]);
  is(R.travel.rect, "travel", G);   // the travel's end is the capsule's moss line (T-20261016-222), not in the old wireframe
  lintRegions(cr); assert.deepEqual(cr.states, ["nothingRead", "shape", "grow", "confirm"]); assert.deepEqual(cr.rules.needed, []);
  assert.deepEqual(R.rail.rect, [512 - run(6) / 2, frame.regions.rail.y, 832, frame.regions.rail.h], "the rail centred, as on Pods");
  const P = R.roll.forms.roll.pictures; assert.deepEqual(P.map((p) => p[0] + 64), [368, 512, 656], "three pictures centred on the founder's axis"); assert.deepEqual(R.roll.forms.single.pictures, [P[1]]);
  assert.deepEqual(R.roll.forms.roll.order, ["as the pod is", "only the first copy", "only the second copy"]);
  for (const p of P) { is(p, "roll picture"); assert.ok(inside(p, R.roll.rect)); }
  assert.ok(P[1][0] - (P[0][0] + P[0][2]) >= 8 + 8, "a ring 4 px outside a picture stays 8 px off its neighbour");
  const ring = [P[1][0] - 4, P[1][1] - 4, P[1][2] + 8, P[1][3] + 8]; assert.ok(R.roll.notch.up + R.roll.notch.size[1] + 4 <= ring[1] && ring[1] + ring[3] + 4 <= R.roll.notch.down, "the notches outside the ring");
  const [px, py, pw, ph] = R.roll.picture.partInside; assert.deepEqual([px * 2 + pw, py * 2 + ph, pw / 128, ph / 72], [128, 72, 0.75, 0.75], "a part whole inside the centred 75%");
  assert.ok(R.roll.notch.up >= frame.regions.rail.y + frame.regions.rail.h + 8, "nothing hangs under the rail on Create: 8 px clear");
  assert.ok(R.roll.rect[1] + R.roll.rect[3] + 8 <= R.traitLine.rect[1] && R.traitLine.rect[1] + R.traitLine.rect[3] + 8 <= R.chamber.rect[1], "the trait line 8 px clear of the roll and the chamber");
  assert.ok(R.traitLine.lineTop + 16 + 8 <= R.founder.rect[1], "8 px from the line's baseline to the founder's box");
  assert.ok(inside(R.founder.rect, R.chamber.rect)); assert.equal(R.founder.rect[0] + R.founder.rect[2] / 2, 512); assert.equal(R.chamber.rect[0] + R.chamber.rect[2] / 2, 512); assert.ok(R.founder.rect[2] >= 300 && R.founder.rect[3] >= 310, "the founder at least 300×310");
  assert.ok(R.cradle.rect[0] + R.cradle.rect[2] + 16 <= R.chamber.rect[0] && R.chamber.rect[0] + R.chamber.rect[2] + 16 <= R.dome.rect[0], "the chamber clear of the dish and the dome");
  for (const k of ["pod", "cradle", "origin"]) assert.equal(R[k].rect[0] + R[k].rect[2] / 2, 160, k + " on the left column's axis");
  assert.equal(R.dome.rect[0] + 71, 864, "the capsule's shell axis (71 px in) on the right column's axis"); for (const k of ["stamp", "code"]) assert.equal(R[k].rect[0] + R[k].rect[2] / 2, 864, k + " on the right column's axis");
  assert.deepEqual([R.pod.axis, R.pod.feet, R.cradle.rect[1], R.cradle.rect[1] + R.cradle.rect[3]], [160, 408, 408 - 64, 408 + 32], "the dish as on Pods' overview");
  assert.deepEqual(pods.classes.pod.large, R.pod.rect.slice(2), "the pod's region is the largest class");
  assert.equal(R.podShadow.slice, "pod-{class}-shadow"); assert.deepEqual([pods.shadow.widen, pods.shadow.h], [16, 14], "the shadow is Pods' rule: the class's width + 16, 14 tall");
  assert.deepEqual(R.travel.foot.to, [864, R.dome.floor], "the travel ends on the capsule's moss line, on the right column's axis"); assert.equal(R.dome.podHeight, 72);
  assert.ok(inside(R.travel.to, R.dome.rect), "the rest box lies inside the small chamber"); assert.ok(R.travel.to[1] > 183, "its top is under the lamp's last row (183)");
  assert.deepEqual(R.podShadow.rect, [80, 401, 160, 14]); assert.deepEqual(R.podShadow.rect, [R.pod.axis - (R.pod.rect[2] + 16) / 2, R.pod.feet - 7, R.pod.rect[2] + 16, 14], "the largest class's shadow, on the axis and 7 rows above the feet");
  assert.deepEqual(R.dome.rect, [793, 104, 145, 224]); assert.equal(R.dome.floor, 268, "the moss line");
  assert.ok(R.stamp.rect[0] - (R.founder.rect[0] + R.founder.rect[2]) >= 96, "the stamp 96 px or more from the focal box"); assert.deepEqual(R.stamp.rect.slice(2), [120, 120]);
  assert.ok(!("leaves" in R), "Create draws no leaf grid (fix 6 N1): the bud's wait is the Grow line's last price group"); assert.deepEqual(R.founderShadow.rect, [400, 529, 224, 14]); assert.equal(R.founderShadow.slice, "founder-shadow-224x14"); assert.equal(R.founderShadow.rect[0] + R.founderShadow.rect[2] / 2, R.founder.axis, "the shadow centred on the founder's axis"); assert.equal(R.founderShadow.rect[1] + 7, R.founder.feet, "its centre on the feet");
  assert.deepEqual([R.code.lineTop, R.code.baseline, R.code.rule.y], [481, 497, 505]); assert.equal(R.code.rule.y - R.code.baseline, 8, "8 px from the code's baseline to its rule"); assert.ok(R.code.rect[2] >= 171, "the widest code fits"); assert.ok(R.stamp.rect[1] + R.stamp.rect[3] <= R.code.rect[1]);
  assert.equal(cr.colours.traitLine.tagWord, "bone", "changed is not a need: never amber"); assert.equal(cr.colours.rail.changed, "bone");
  assert.deepEqual(Object.keys(cr.focus.shape.graph), ["roll"]); const st = cr.focus.shape.graph.roll.stepper;
  assert.ok(st.length && new Set(st).size === st.length && st.every((k) => STEP_KEYS.includes(k)) && !st.some((k) => k in cr.focus.shape.graph.roll), "the stepper's keys: non-empty, distinct, known, no edge on the same key");
  assert.deepEqual(cr.focus.nothingRead.targets, {}, "nothing read: no target"); assert.ok(STEP_KEYS.every((k) => cr.focus.nothingRead.graph.room[k] === "none"), "nothing read: the arrows do nothing");
  assert.deepEqual([cr.events.roll.kind, cr.events.roll.target, cr.events.roll.hold, cr.events.roll.ms, cr.events.roll.levels], ["dither", "founder", 0, 200, 16]);
  assert.equal(cr.events.grow.hold, cr.events.grow.steps.at(-1).at + cr.events.grow.steps.at(-1).ms); assert.equal(cr.events.grow.ms, cr.events.grow.steps.at(-1).at, "grow plays until the jump's dither; the hold covers the dither");
  assert.equal(R.bench.slice, "room-bench-stage-create"); assert.equal(R.bench.until, undefined, "signed: no stand-in slice");
  assert.deepEqual(paletteBad(cr.colours), []);
});

// The Incubator's leaf arcs: the slot tables rebuilt from the spec's own parameters (architect, 2026-10-09 13:24).
const incSpec = () => rd("../specs/station/incubator.json");
const arcTable = (L, r) => Array.from({ length: 2 * L.perArc - 1 }, (_, h) => { const a = ((L.span[0] + L.half * h) * Math.PI) / 180; return [Math.round(L.centre[0] + r * Math.sin(a)) + L.offset[0], Math.round(L.centre[1] - r * Math.cos(a)) + L.offset[1]]; });

test("the Incubator's leafArc tables are rebuilt from the centre, the arcs, the span and the half pitch", () => {
  const L = incSpec().regions.leaves.leafArc;
  assert.equal(L.span[1] - L.span[0], L.half * 2 * (L.perArc - 1), "the span holds perArc leaves on the pitch"); assert.equal(L.pitch, 2 * L.half);
  for (const k of ["inner", "outer"]) { assert.equal(L[k].length, 2 * L.perArc - 1); assert.deepEqual(L[k], arcTable(L, L.arcs[k]), k + " table"); }
});

const DERIVE = new URL("../specs/derive.mjs", import.meta.url);
test("the leafArc oracle (ui/specs/derive.mjs) places every run of 1 to 40 leaves on the tables, centred, none overlapping", { skip: existsSync(DERIVE) ? false : "ui/specs/derive.mjs is the builder's to write at L2.4 (architect, 2026-10-09 13:24)" }, async () => {
  const { leafArc } = await import(DERIVE.href), R = incSpec().regions.leaves, L = R.leafArc, [lw, lh] = R.leaf;
  const slot = (k, i) => [...L[k][i], lw, lh];
  for (let n = 1; n <= 2 * L.perArc; n++) {
    const boxes = leafArc(R, n), a = Math.min(n, L.perArc), b = n - a;
    assert.deepEqual(boxes, [...Array.from({ length: a }, (_, j) => slot("inner", 20 - a + 2 * j)), ...Array.from({ length: b }, (_, j) => slot("outer", 20 - b + 2 * j))], `${n} leaves: inner left to right, then outer, slot 20 − k + 2j`);
    for (const [i, p] of boxes.entries()) { assert.ok(inside(p, R.rect)); for (const q of boxes.slice(i + 1)) assert.ok(apart(p, q), `${n} leaves: none overlaps`); }
  }
  assert.throws(() => leafArc(R, 2 * L.perArc + 1), "more than 2 × perArc is refused");
});

test("the Incubator spec file (T-20261016-222, the painted capsule) agrees with the build spec: the room crop, the capsule's layers at (344, 26), the moss line, the bar, the left column, the ribbon, the events", () => {
  const inc = incSpec(), R = inc.regions;
  assert.deepEqual(inc.states, ["empty", "growing", "ready", "hatch"]); assert.deepEqual(R.room.rect, [0, 40, 1024, 522]); assert.deepEqual(R.capsule.rect, [344, 26, 530, 532]); assert.equal(R.capsule.mossY, 415); assert.equal(R.capsule.podHeight, 160);
  assert.deepEqual([R.capsule.bar.max, R.capsule.bar.litFrom], [158, [89, 450]]); assert.deepEqual(R.inside.foot, [512, 415]); assert.deepEqual(R.juvenile.foot, [532, 415]); assert.equal(R.juvenile.height, 146);
  assert.deepEqual([R.stampCase.rect, R.stamp.rect, R.code.rect, R.readyIn.rect, R.ribbon.rect], [[76, 184, 152, 152], [92, 200, 120, 120], [64, 344, 176, 25], [16, 384, 272, 24], [312, 56, 400, 40]]);
  assert.ok(inside(R.readyIn.rect, [16, 40, 284, 522]), "the time stays on the plain wall (x 16 to 300)"); assert.ok(inside(R.stampCase.rect, [16, 40, 284, 522]));
  assert.deepEqual([inc.events.incubate.ms, inc.events.incubate.hold, inc.events.growNow.ms, inc.events.hatch.ms, inc.events.hatch.hold], [1380, 1380, 580, 2600, 2780]); assert.equal(inc.events.hatch.moving, undefined, "no moving set on the capsule yet (uiux-rulings 5)");
  assert.deepEqual(inc.events.hatch.steps.map((x) => x.at), [0, 600, 1000, 1200, 1400, 1800, 2600], "one crack layer, 600 to the dither at 1000 (uiux-rulings 4)");
  assert.deepEqual(inc.focus.targets, {}, "no ring on the Incubator"); assert.equal(inc.focus.roomKey, "room"); assert.equal(inc.events.hatch.hold, inc.events.hatch.steps.at(-1).at + inc.events.hatch.steps.at(-1).ms);
  assert.equal(inc.handoff.to, "habitat"); assert.equal(frame.navigation.jumps.find((j) => j.from === "incubator" && j.action === "Open").to, "habitat");
  const choose = frame.navigation.jumps.find((j) => j.from === "incubator" && j.state === "empty"); assert.deepEqual([choose.action, choose.to, choose.view], [inc.strings.choose, "pods", "collection"]);
  assert.equal(inc.strings.plaque, undefined, "the plaque goes"); assert.equal(inc.strings.readyIn, "ready in about {n} min"); assert.equal(inc.glass, undefined, "no code-drawn glass: the cut master (uiux-rulings 2)");
  assert.deepEqual(paletteBad(inc.colours), []);
});

// The namer: an overlay over Habitat's right column; its keys, its focus graph by lvgl-switch.md §2.6.1, and the name label's limit.
const namerSpec = () => rd("../specs/station/namer.json");
const namerTargets = (nm, page) => { const R = nm.regions, T = [];
  nm.keys.pages[page].forEach((c, i) => { if (c) T.push({ id: "key." + i, rect: [R.keys.at[0] + R.keys.pitch * (i % 7), R.keys.at[1] + R.keys.pitch * Math.floor(i / 7), ...R.keys.key] }); });
  for (const [id, k] of [["mod.shift", "shift"], ["mod.space", "space"], ["mod.page", "page"], ["act.done", "done"], ["act.suggest", "suggest"]]) T.push({ id, rect: R[k].rect });
  return T; };
// §2.6.1's edge forms on doubled centres: a name, { nearestIn } (400 × across + |along|), { nearestIn, ahead } (along > 12, 5 × along + 11 × across), an ordered list with "none" last
const namerMove = (graph, T, cur, key) => { const grp = (id) => id.split(".")[0], dc = (r) => [2 * r[0] + r[2], 2 * r[1] + r[3]], [ox, oy] = dc(T.find((t) => t.id === cur).rect), [dx, dy] = DIR[key];
  const one = (e) => { if (e === "none") return cur; if (typeof e === "string") return T.find((t) => t.id === e)?.id ?? T.find((t) => grp(t.id) === e)?.id ?? null;
    let best = null, bs = Infinity; for (const t of T) { if (t.id === cur || grp(t.id) !== e.nearestIn) continue; const [x, y] = dc(t.rect), vx = x - ox, vy = y - oy, along = vx * dx + vy * dy, across = Math.abs(vx * dy + vy * dx);
      if (e.ahead && along <= 12) continue; const s = e.ahead ? 5 * along + 11 * across : 400 * across + Math.abs(along); if (s < bs) { bs = s; best = t.id; } } return best; };
  const edge = graph[grp(cur)]?.[key]; if (edge === undefined) return cur; for (const e of [edge].flat()) { const r = one(e); if (r) return r; } return cur; };

test("the namer spec file agrees with its wireframes, names a word or composition for every region, and leaves Habitat's window uncovered", () => {
  const nm = namerSpec(), R = nm.regions, A = boxesOf("12-namer-open.svg"), B = boxesOf("12b-namer-typing.svg"), C = boxesOf("12c-namer-accents.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["panel", "field", "say", "keys", "shift", "space", "page", "suggest", "done"]) is(R[k].rect, k);
  for (const k of ["panel", "field", "say", "keys", "shift", "space", "page", "suggest"]) is(R[k].rect, k + " (open)", A);
  for (const t of namerTargets(nm, "accents")) if (t.id.startsWith("key.") && t.id !== "key.1") is(t.rect, "accent " + t.id, C);
  lintRegions(nm); assert.equal(nm.kind, "overlay"); assert.deepEqual(nm.over, ["habitat"]); assert.deepEqual(nm.rules.needed, []);
  const W = nm.overlay.uncoveredRect; assert.ok(R.panel.rect[0] >= W[0] + W[2] + 8, "8 px or more right of Habitat's window bezel: the mibi stays in view");
  assert.equal(R.panel.rect[0] + R.panel.rect[2] / 2, nm.column.x + nm.column.w / 2, "the inner column centred in the panel"); assert.equal(nm.column.x - R.panel.rect[0], nm.column.pad);
  for (const k of ["field", "say", "keys", "shift", "suggest"]) assert.equal(R[k].rect[0], nm.column.x, k + " on the inner column");
  for (const k of ["field", "say", "keys", "shift", "space", "page", "suggest", "done"]) assert.ok(inside(R[k].rect, R.panel.rect), k + " inside the panel");
  const rows = ["field", "say", "keys", "shift", "suggest"].map((k) => R[k].rect); for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1][1] + rows[i - 1][3] + 8 <= rows[i][1], "rows 8 px or more apart");
  const T = namerTargets(nm, "letters"); for (const [i, a] of T.entries()) for (const b of T.slice(i + 1)) assert.ok(apart(a.rect, b.rect), `${a.id} and ${b.id} apart`);
  for (const t of T) assert.ok(inside(t.rect, R.panel.rect) && t.rect.slice(1).every((n) => n % 8 === 0) && (t.rect[0] - nm.column.x) % 8 === 0, t.id + " on the grid (x on the inner column's), inside the panel");
  assert.equal(R.keys.columns * R.keys.pitch - (R.keys.pitch - R.keys.key[0]), R.keys.rect[2], "seven keys fill the grid's width");
  const col = (x) => (x - R.keys.at[0]) / R.keys.pitch; for (const k of ["shift", "space", "page"]) { const [x, , w] = R[k].rect; assert.ok(Number.isInteger(col(x)) && Number.isInteger((w + 8) / R.keys.pitch), k + " stands under whole columns"); }
  // every allowed character on one key: a to z, the 24 accented letters, the hyphen and ’ (capitals by the case rule, space on its own key)
  const set = "abcdefghijklmnopqrstuvwxyzáàâäéèêëíìîïóòôöúùûüñÿçœ", on = [...nm.keys.pages.letters, ...nm.keys.pages.accents].filter(Boolean);
  assert.equal(on.length, set.length + 2); for (const c of [...set, "-", "’"]) assert.equal(on.filter((p) => p === c).length, 1, c + " on one key");
  assert.equal(nm.keys.pages.letters.length, R.keys.columns * R.keys.rows); assert.equal(nm.keys.pages.accents.length, R.keys.columns * R.keys.rows);
  // the name label's limit, measured on the face's fonts: ten of the widest letter and the caret fit the field
  assert.equal(nm.nameLabel.nameMax, 10); assert.equal(R.field.px, 28); assert.ok(R.field.nameAt[0] + nm.nameLabel.limit.inter28 + 4 <= R.field.rect[0] + R.field.rect[2], "the widest name and the caret inside the field");
  // the face's Inter 16, 20 and 28 hold every allowed character, both cases, the space, the hyphen and ’
  for (const px of [16, 20, 28]) { const src = readFileSync(new URL(`../../face/src/fonts/face_inter_${px}.c`, import.meta.url), "utf8"), cps = new Set();
    for (const m of src.matchAll(/\.range_start = (\d+), \.range_length = (\d+), \.glyph_id_start = \d+,\s*\.unicode_list = (\w+)/g)) { const s0 = +m[1];
      if (m[3] === "NULL") for (let c = s0; c < s0 + +m[2]; c++) cps.add(c);
      else for (const o of src.match(new RegExp(m[3] + "\\[\\] = \\{([^}]*)\\}"))[1].split(",").map((x) => x.trim()).filter(Boolean)) cps.add(s0 + Number(o)); }
    for (const c of [...set, ...set.toLocaleUpperCase("fr"), " ", "-", "’"]) assert.ok(cps.has(c.codePointAt(0)), `Inter ${px} holds ${c}`); }
  assert.deepEqual(paletteBad(nm.colours), []);
});

test("the namer's focus walks every key with the pad alone, by its vectors; the ends stop", () => {
  const nm = namerSpec(), G = nm.focus.graph;
  for (const v of nm.focus.vectors) if (DIR[v.key]) assert.equal(namerMove(G, namerTargets(nm, v.page), v.from, v.key), v.to, `${v.page}: ${v.from} ${v.key}`);
  assert.equal(nm.focus.initial, "act.done"); assert.equal(nm.focus.fallback, "none");
  for (const page of ["letters", "accents"]) { const T = namerTargets(nm, page), seen = new Set(["act.done"]), q = ["act.done"];
    while (q.length) { const u = q.shift(); for (const k of Object.keys(DIR)) { const w = namerMove(G, T, u, k); if (!seen.has(w)) { seen.add(w); q.push(w); } } }
    assert.deepEqual([...seen].sort(), T.map((t) => t.id).sort(), page + ": every key reached from Done"); }
  for (const [g, edges] of Object.entries(G)) for (const e of Object.values(edges)) { const l = [e].flat(); assert.ok(l.length && l.every((x, i) => x !== "none" || i === l.length - 1), `${g}: "none" only last`); }
});

// The focus graph of lvgl-switch.md §2.6.1 on doubled centres, enough to play a spec's vectors: names, selectors, nearestIn (with ahead), ordered lists, order and axis.
const DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
function focusMove(graph, targets, cur, key, resolve = {}) {
  const ids = Object.keys(targets), groupOf = (id) => targets[id].group, c2 = (id) => { const [x, y, w, h] = targets[id].box; return [2 * x + w, 2 * y + h]; };
  const firstOf = (g) => ids.find((id) => groupOf(id) === g) ?? null;
  const [dx, dy] = DIR[key], [ox, oy] = c2(cur);
  const nearest = (g, ahead) => { let best = null, bs = Infinity; for (const id of ids) { if (id === cur || groupOf(id) !== g) continue; const [cx, cy] = c2(id), vx = cx - ox, vy = cy - oy, along = vx * dx + vy * dy, across = Math.abs(vx * dy + vy * dx); if (ahead && along <= 12) continue; const s = ahead ? 5 * along + 11 * across : 400 * across + Math.abs(along); if (s < bs) { bs = s; best = id; } } return best; };
  const one = (e) => { if (typeof e === "object") return nearest(e.nearestIn, !!e.ahead); if (e.includes(".")) { const r = resolve[e] ?? e; return targets[r] ? r : firstOf(e.split(".")[0]); } return targets[e] ? e : firstOf(e); };
  const g = graph[groupOf(cur)], edge = g[key];
  if (edge === "none") return cur;
  if (edge !== undefined) { for (const e of Array.isArray(edge) ? edge : [edge]) { if (e === "none") return cur; const to = one(e); if (to) return to; } }
  if (g.order && (key === "up" || key === "down")) { const list = g.order.filter((id) => targets[id]), i = list.indexOf(cur); return list[Math.max(0, Math.min(list.length - 1, i + (key === "down" ? 1 : -1)))]; }
  if (g.axis === "horizontal" && (key === "left" || key === "right")) { const list = ids.filter((id) => groupOf(id) === groupOf(cur)), i = list.indexOf(cur); return list[Math.max(0, Math.min(list.length - 1, i + (key === "right" ? 1 : -1)))]; }
  return cur;
}
// an edge's form is one of §2.6.1's four; "none" only alone or last in a list; nearestIn takes only nearestIn and ahead
const edgeOk = (e, groups) => e === "none" || (typeof e === "string" && (groups.has(e.split(".")[0]) || groups.has(e))) || (!!e && typeof e === "object" && !Array.isArray(e) && groups.has(e.nearestIn) && Object.keys(e).every((k) => ["nearestIn", "ahead"].includes(k)))
  || (Array.isArray(e) && e.length > 0 && e.every((x, i) => !Array.isArray(x) && (x !== "none" || i === e.length - 1) && edgeOk(x, groups)));
const gapOk = (a, b, gap = 8) => a[0] + a[2] + gap <= b[0] || b[0] + b[2] + gap <= a[0] || a[1] + a[3] + gap <= b[1] || b[1] + b[3] + gap <= a[1];
const atRect = (r, o) => [r[0] + o[0], r[1] + o[1], o[2], o[3]];

test("one mibi up close (habitat.json) agrees with its wireframes, region by region; its focus graph plays its vectors", () => {
  const hab = rd("../specs/station/habitat.json"), R = hab.regions, B = boxesOf("19-vivarium-mibi.svg"), M = boxesOf("19a-vivarium-mibi-meet.svg"), A = boxesOf("19c-vivarium-mibi-out.svg"), E = A;
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["bezel", "glass", "resident", "nameTag", "card", "speciesLine", "story", "code", "stamp", "door", "portrait", "cross", "wild", "strip"]) is(R[k].rect, k);
  for (const [set, w] of [[B, "19"], [A, "19c"]]) is(atRect(R.card.rect, [...R.card.heart.at, ...R.card.heart.size]), "heart (" + w + ", bonded)", set); assert.ok(!M.has(atRect(R.card.rect, [...R.card.heart.at, ...R.card.heart.size]).join(",")), "no heart on an unbonded mibi (19a)");
  assert.equal(R.bond, undefined, "the bond is not a region"); assert.equal(R.heart, undefined, "the heart is a state on the card, not a region"); assert.equal("target" in R.card.heart, false, "the heart is no focus target");
  assert.deepEqual(atRect(R.card.rect, [...R.card.heart.at, ...R.card.heart.size]), [832, 64, 24, 24]); { const hr = atRect(R.card.rect, [...R.card.heart.at, ...R.card.heart.size]); assert.ok(inside(hr, R.card.rect) && apart(hr, R.speciesLine.rect) && apart(hr, R.stamp.rect), "the heart inside the card, clear of the species line and the stamp"); }
  for (const k of ["bezel", "glass", "strip", "card", "door"]) is(R[k].rect, k + " (out)", E); is(R.resident.out.rect, "the out mark", E); assert.ok(!E.has(R.resident.rect.join(",")), "no mibi drawn while it is out");
  assert.deepEqual([R.resident.out.rect[0] + R.resident.out.rect[2] / 2, R.resident.out.rect[1] + R.resident.out.rect[3]], [R.resident.axis, R.resident.feet], "the out mark on the axis, its foot on the feet line"); assert.ok(inside(R.resident.out.rect, R.resident.rect));
  // the skill notches: filled only, one to three, right-aligned to 856 on the code's row, inside the card, clear of the code and the stamp; two in the wireframe
  const NT = R.card.notches; assert.deepEqual(atRect(R.card.rect, NT.at), NT.rect); assert.ok(inside(NT.rect, R.card.rect) && gapOk(NT.rect, R.code.rect) && apart(NT.rect, R.stamp.rect), "the notches clear of the code and the stamp");
  for (const [n, xs] of Object.entries(NT.places)) { assert.equal(xs.length, +n); assert.equal(xs.at(-1)[0] + NT.notch[0], NT.right); xs.forEach(([x, y], i) => { assert.ok(inside([x, y, ...NT.notch], NT.rect)); if (i) assert.equal(x - xs[i - 1][0], NT.pitch); }); }
  assert.ok(!("0" in NT.places), "nothing at zero"); for (const [x, y] of NT.places[2]) is([x, y, ...NT.notch], "a notch"); assert.equal(R.code.rect[2], 152, "the code's box holds WWW WWW WWW (152 at 16 px)");
  is(R.meetRibbon.rect, "meet ribbon", M); is(R.resident.lamp.rect, "waiting lamp", M);
  lintRegions(hab); assert.deepEqual(hab.states, ["rest", "meet", "out"]); assert.deepEqual([hab.section, hab.level, hab.strings.title, hab.strings.back], ["vivarium", "mibi", "Vivarium", "Vivarium"]); assert.deepEqual(hab.rules.needed, []); assert.deepEqual(hab.rules.used, ["listPitch"]);
  assert.deepEqual([R.bezel.rect[0] + R.bezel.inset, R.bezel.rect[1] + R.bezel.inset, R.bezel.rect[2] - 2 * R.bezel.inset, R.bezel.rect[3] - 2 * R.bezel.inset], R.glass.rect, "the 8 px bezel");
  // the mibi: the juvenile's box from the Incubator's hatch, inside the glass, its feet on the ground band; the tag 8 px under the ring's ellipse and 8 px inside the glass
  const res = R.resident.rect, glass = R.glass.rect;
  assert.deepEqual(res.slice(2), [304, 312], "the meet keeps the mibi's 304×312");
  assert.ok(inside(res, glass)); assert.equal(res[0] + res[2] / 2, R.resident.axis); assert.equal(res[1] + res[3], R.resident.feet);
  assert.ok(R.resident.feet > R.glass.ground[1] && R.resident.feet < R.glass.ground[1] + R.glass.ground[3], "the feet on the ground band");
  assert.ok(R.nameTag.rect[1] >= R.resident.feet + 12 + 8, "the tag 8 px or more under the feet ring"); assert.ok(R.nameTag.rect[1] + R.nameTag.rect[3] + 8 <= glass[1] + glass[3], "the tag 8 px inside the glass");
  assert.ok(inside(R.nameTag.rect, R.meetRibbon.rect), "the ribbon in the tag's place"); assert.deepEqual([R.nameTag.px, R.nameTag.weight, R.nameTag.h], [frame.type.title, frame.type.weight[20], 32], "the tag at 20 px medium, 32 tall");
  assert.equal(R.nameTag.max, 200 + 2 * R.nameTag.pad, "the tag holds ten of the widest letter at 20 px (200) and its pads"); assert.equal(R.nameTag.rect[2], R.nameTag.max); assert.equal(R.nameTag.rect[0] + R.nameTag.rect[2] / 2, R.resident.axis); assert.ok(R.nameTag.min % R.nameTag.round === 0 && R.nameTag.max % R.nameTag.round === 0);
  assert.ok(hab.overlays.namer.panel[0] >= R.bezel.rect[0] + R.bezel.rect[2] + 8 && hab.overlays.namer.panel[0] === R.card.rect[0], "the living window left of the namer's panel"); assert.ok(inside(R.card.rect, hab.overlays.namer.panel) && ["door", "portrait", "cross", "wild"].every((k) => inside(R[k].rect, hab.overlays.namer.panel)), "the namer covers the card and the modules");
  assert.ok(inside(R.resident.lamp.rect, res) && R.resident.lamp.rect[0] + 12 === res[0] + res[2] && R.resident.lamp.rect[1] === res[1], "the lamp at the box's top right");
  assert.equal(hab.focus.targets.resident.shape, "footprint", "the resident wears its footprint (fix 14)");
  for (const spec of [hab]) for (const [k, t] of Object.entries(spec.focus.targets)) assert.ok(isShape(t.shape) && !("ring" in t), k + ": a ring shape of frame.json, no `ring`");
  // the stamp a detail: 120, far from the mibi; the card's lines and plates clear of it; modules 8 px apart, their objects 8 px under the word's baseline
  assert.deepEqual(R.stamp.rect.slice(2), [120, 120]); assert.ok(R.stamp.rect[0] - (res[0] + res[2]) >= 96); assert.ok(inside(R.stamp.rect, R.card.rect));
  for (const k of ["speciesLine", "story", "code", "plates"]) { assert.ok(inside(R[k].rect, R.card.rect), k + " inside the card"); assert.ok(apart(R[k].rect, R.stamp.rect), k + " clear of the stamp"); }
  const P = R.plates.places, plates = Array.from({ length: P.max }, (_, i) => [P.first[0] + P.pitch[0] * i, P.first[1], P.first[2], P.first[3]]);
  assert.ok(inside(plates.at(-1), R.plates.rect), "eight plates fit"); for (const p of plates.slice(0, 4)) is(p, "plate");
  const mods = ["door", "portrait", "cross", "wild"].map((k) => R[k]);
  for (const [i, m] of mods.entries()) {
    assert.ok(m.rect[0] >= 592 && m.rect[0] + m.rect[2] <= 1008 && m.rect[1] >= R.card.rect[1] + R.card.rect[3] + 16 && m.rect[1] + m.rect[3] <= 552, "the module in the column");
    for (const n of mods.slice(i + 1)) assert.ok(gapOk(m.rect, n.rect), "modules 8 px apart");
    for (const o of [m.glyph, ...(m.places ? m.places.at.map((a) => ({ at: a, size: m.places.size })) : []), m.frame, m.gate, ...(m.faces ? [m.faces.oneRow, ...m.faces.twoRows].map((a) => ({ at: a, size: m.faces.size })) : [])].filter(Boolean)) { assert.ok(o.at[1] >= m.word[1] + 16 + 8, "8 px from the word's baseline to the object"); assert.ok(o.at[1] + o.size[1] <= m.rect[3], "the object inside its module"); }
  }
  const FC = R.cross.faces; assert.ok(FC.oneRow[0] + FC.pitch * (FC.perRow - 1) + FC.size[0] <= R.cross.rect[2] - 16, "seven faces fit a row"); assert.ok(2 * FC.perRow >= FC.max && FC.max === 11, "two rows hold every partner a twelve-bay vivarium can give"); assert.ok(FC.twoRows[1][1] - FC.twoRows[0][1] >= FC.size[1], "the rows do not overlap");
  // the strip: one tile a bay, full to six and compact to twelve, inside the strip; the tiles in the wireframes
  const T = R.tiles.forms, ups = Object.values(T).map((f) => f.upTo); assert.equal(new Set(ups).size, ups.length, "one form an upTo"); assert.equal(Math.max(...ups), 12, "at most twelve bays"); assert.ok(Object.values(T).every((f) => f.grid[0] * f.grid[1] >= f.upTo && Object.keys(f).every((k) => ["upTo", "first", "pitch", "grid"].includes(k))), "a form is { upTo, first, pitch, grid }, its grid as long as its upTo");
  for (const [k, th] of Object.entries(R.tiles.tile.thumb)) assert.ok(inside(th, [0, 0, T[k].first[2], T[k].first[3]]), k + ": the thumbnail inside its tile"); assert.equal(R.tiles.tile.name, null, "thumbnails only");
  const tiles = (f, n) => Array.from({ length: n }, (_, i) => [f.first[0] + f.pitch[0] * i, f.first[1], f.first[2], f.first[3]]);
  for (const f of [T.full, T.compact]) { const ts = tiles(f, f.upTo); assert.ok(ts.every((x) => inside(x, R.tiles.rect) && inside(x, R.strip.rect)), "tiles inside the strip"); assert.ok(ts.every((x, i) => i === 0 || x[0] - (ts[i - 1][0] + ts[i - 1][2]) === 8), "8 px between tiles"); }
  for (const x of tiles(T.full, 6)) is(x, "full tile"); for (const x of tiles(T.compact, 8)) is(x, "compact tile", A);
  assert.ok(R.bezel.rect[1] + R.bezel.rect[3] + 16 <= R.strip.rect[1], "the strip 16 px under the window");
  // the focus graph: well formed, and its vectors played on the rest layout with four chapters and six mibis
  const HG = hab.focus.graph; assert.equal(HG.fallback, "none", "the fallback inside the graph"); assert.equal(graphProblem(HG), null);
  const groups = new Set(Object.keys(HG).filter((k) => HG[k] && typeof HG[k] === "object"));
  for (const [g, e] of Object.entries(HG)) { if (!e || typeof e !== "object") continue; assert.ok(!(e.order && e.axis), g + ": order or axis, not both"); for (const k of STEP_KEYS) if (k in e) assert.ok(edgeOk(e[k], groups), `${g}.${k} is an edge form of §2.6.1`); }
  const TG = { resident: { group: "resident", box: res }, name: { group: "name", box: R.nameTag.rect }, species: { group: "species", box: R.speciesLine.rect } };
  plates.slice(0, 4).forEach((p, i) => (TG["plate." + i] = { group: "plate", box: p }));
  for (const k of ["door", "portrait", "cross", "wild"]) TG[k] = { group: hab.focus.targets[k].group, box: R[k].rect };
  tiles(T.full, 6).forEach((x, i) => (TG["tile." + (i + 1)] = { group: "tile", box: x }));
  const resolve = { "tile.shown": "tile.3" }, concrete = (v) => !!v && (!!TG[v] || v === "tile.shown");
  const focusMove = (graph, T, from, key) => moveFocus(graph, Object.entries(T).map(([id, t]) => ({ id, rect: t.box, group: t.group })), from, key, (sel) => resolve[sel] ?? null).to;   // ui/focus.mjs, the module the face's C port matches
  let played = 0;
  for (const v of hab.focus.vectors) { if (v.state || v.intent || !concrete(v.from) || !concrete(v.to)) continue; const from = resolve[v.from] ?? v.from, to = resolve[v.to] ?? v.to; assert.equal(focusMove(hab.focus.graph, TG, from, v.key, resolve), to, `${v.from} ${v.key} → ${v.to}`); played++; }
  assert.ok(played >= 24, "the vectors are played: " + played);
  const MEET = Object.fromEntries(Object.entries(TG).filter(([k]) => k !== "name")); assert.equal(focusMove(hab.focus.graph, MEET, "resident", "right", resolve), "species", "in the meet (no tag target) ▶ goes on to the species"); assert.equal(focusMove(hab.focus.graph, MEET, "cross", "left", resolve), "resident");
  assert.equal(focusMove(hab.focus.graph, TG, "tile.1", "left", resolve), "tile.1", "the strip's first tile stops"); assert.equal(focusMove(hab.focus.graph, TG, "tile.5", "up", resolve), "resident");
  const OUT = Object.fromEntries(Object.entries(TG).filter(([k]) => k !== "resident"));   // out: the mibi is not here, so no resident target
  for (const [from, key] of [["plate.0", "left"], ["door", "left"], ["tile.5", "up"], ["cross", "left"]]) assert.equal(focusMove(hab.focus.graph, OUT, from, key, resolve), "name", `out: ${from} ${key} → name`);
  assert.equal(focusMove(hab.focus.graph, OUT, "name", "left", resolve), "name", "out: ◀ from the name stays");
  // nothing on Habitat is amber; no banned word in its strings; the guide's door is frame.json's jump
  assert.ok(!JSON.stringify(hab.colours).includes("amber"), "no amber up close"); assert.ok(!/outing/.test(JSON.stringify(hab.strings)), "expedition, never outing");
  assert.ok(frame.navigation.jumps.some((j) => j.from === "habitat" && j.to === "book" && j.action === hab.strings.guide), "the guide's door");
  assert.deepEqual(paletteBad(hab.colours), []);
});

test("the Vivarium's whole (vivarium.json) agrees with its wireframes; the strip is one mibi up close's; its focus graph plays its vectors with ui/focus.mjs", () => {
  const vv = rd("../specs/station/vivarium.json"), hab = rd("../specs/station/habitat.json"), R = vv.regions, B = boxesOf("18-vivarium-whole.svg"), A = boxesOf("18a-vivarium-whole-away.svg"), E = boxesOf("18b-vivarium-whole-empty.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  assert.deepEqual(vv.regions.tiles.forms, hab.regions.tiles.forms, "the whole's strip is one mibi up close's: the same forms"); lintRegions(rectsOnly(vv)); assert.deepEqual(vv.states, ["rest", "empty"]); assert.deepEqual(vv.rules.needed, []); assert.deepEqual([vv.section, vv.level, vv.strings.title, vv.strings.back], ["vivarium", "whole", "Vivarium", "Home"]);
  for (const set of [B, A, E]) { is(R.window.rect, "window", set); is(R.strip.rect, "strip", set); }
  is(R.bed.rect, "bed"); is(R.bed.rect, "bed", A); is(R.bed.markRect, "the Companion mark", A); is(R.bed.rect, "the bed on the empty whole (the nest alone, docked)", E); assert.ok(!E.has(R.bed.markRect.join(",")), "no Companion mark on the empty whole while docked");
  // the same place as Idle, 80 px higher; the strip where one mibi up close has it
  const I = frame.idle.regions, off = I.vivarium.theWhole.rows[0] - I.vivarium.theWhole.at[1];
  assert.deepEqual(R.window.rect, I.vivarium.theWhole.at); assert.deepEqual(R.window.ground, [I.vivarium.ground[0], I.vivarium.ground[1] - off, ...I.vivarium.ground.slice(2)]);
  assert.deepEqual(R.bed.rect, [I.bed.rect[0], I.bed.rect[1] - off, ...I.bed.rect.slice(2)]); assert.equal(R.bed.sleepers.footY, I.bed.sleepers.footY - off); assert.deepEqual(R.bed.sleepers.places, I.bed.sleepers.places);
  assert.deepEqual(R.resident.walk.ground, [I.resident.walk.ground[0], I.resident.walk.ground[1] - off, ...I.resident.walk.ground.slice(2)]); assert.ok(inside(R.resident.walk.ground, R.window.rect));
  assert.deepEqual(R.strip.rect, hab.regions.strip.rect); assert.deepEqual(R.tiles.rect, hab.regions.tiles.rect); assert.deepEqual(R.tiles.forms, hab.regions.tiles.forms, "the same tile forms as up close"); assert.deepEqual(R.tiles.tile.thumb, hab.regions.tiles.tile.thumb, "the same thumbnails");
  for (const [id, r] of Object.entries(R)) assert.ok(r.component || r.build, id + " names its word or composition, with a rect or without"); assert.ok(R.window.rect[1] + R.window.rect[3] + 8 <= R.strip.rect[1], "the strip 8 px under the window");
  for (const [n, xs] of Object.entries(R.bed.sleepers.places)) for (const x of xs) is([x - 48, R.bed.sleepers.footY - 88, 96, 88], "nap ink (" + n + ")", n === "2" ? B : new Set([[x - 48, R.bed.sleepers.footY - 88, 96, 88].join(",")]));
  // the residents and tiles the vectors are played on: in the wireframe, the residents on the ground band, the tiles by the compact form
  const L = Object.entries(vv.focus.layout).filter(([k]) => k !== "note"), C = hab.regions.tiles.forms.compact;
  for (const [id, box] of L) { is(box, id); if (id.startsWith("resident.")) { assert.ok(inside(box, R.window.rect)); const feet = box[1] + box[3]; assert.ok(feet > R.resident.walk.ground[1] && feet <= R.resident.walk.ground[1] + R.resident.walk.ground[3], id + " feet on the band"); } }
  L.filter(([k]) => k.startsWith("tile.")).forEach(([, box], i) => assert.deepEqual(box, [C.first[0] + C.pitch[0] * i, C.first[1], C.first[2], C.first[3]]));
  const G = vv.focus.graph; assert.equal(graphProblem(G), null); assert.deepEqual([G.roomKey, G.fallback], ["room", "none"]);
  const groups = new Set(Object.keys(G).filter((k) => typeof G[k] === "object")); for (const [g, e] of Object.entries(G)) if (typeof e === "object") for (const k of STEP_KEYS) if (k in e) assert.ok(edgeOk(e[k], groups) || /^(tile|resident)\.of$/.test(e[k]) || (Array.isArray(e[k]) && e[k][0] === "resident.of"), `${g}.${k}`);
  for (const [k, t] of Object.entries(vv.focus.targets)) assert.ok(isShape(t.shape) && !("ring" in t), k);
  const all = L.map(([id, rect]) => ({ id, rect, group: id.split(".")[0] }));
  let played = 0;
  for (const v of vv.focus.vectors) {
    if (v.state === "empty") { assert.equal(moveFocus(G, [], "room", v.key, () => null, { roomAt: vv.focus.roomAt }).to, v.to); continue; }
    const out = new Set(v.away ?? []), list = all.filter((t) => !(t.group === "resident" && out.has(t.id.split(".")[1])));
    const res = (sel) => { const m = v.from.split(".")[1]; if (sel === "tile.of") return "tile." + m; if (sel === "resident.of") return list.some((t) => t.id === "resident." + m) ? "resident." + m : null; return null; };
    assert.equal(moveFocus(G, list, v.from, v.key, res).to, v.to, `${v.from} ${v.key} → ${v.to}`); played++;
  }
  assert.ok(played >= 20, "the vectors are played: " + played);
  // the words: a verb of four words or fewer, contexts of six or fewer, no digits, nothing amber
  assert.ok(wordsIn(vv.strings.look) <= 4); for (const k of ["resident", "sleeper", "painting", "out", "empty"]) { assert.ok(wordsIn(vv.strings[k]) <= 6, k); assert.ok(!/\d/.test(vv.strings[k]), k); }
  assert.equal(vv.strings.look, "Look at {name}", "the Vivarium's own verb for a resident (Home keeps no focus on a mibi)");
  assert.ok(!JSON.stringify(vv.colours).includes("amber")); assert.deepEqual(paletteBad(vv.colours), []); assert.ok(!/outing/.test(JSON.stringify(vv.strings)));
});

test("the Probe bench spec file agrees with the bench wireframes, region by region; its focus graph plays its vectors", () => {
  const be = rd("../specs/station/bench.json"), R = be.regions, B = boxesOf("11-bench.svg"), W = boxesOf("11d-bench-tier2.svg"), Y = boxesOf("11c-bench-away.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["cradle", "plates", "switch", "slot"]) is(R[k].rect, k);
  for (const k of ["cradle", "switch", "slot"]) is(R[k].rect, k + " (away)", Y);
  assert.ok(!Y.has(R.plates.rect.join(",")), "no plates while away");
  lintRegions(be); assert.deepEqual(be.states, ["docked", "away"]); assert.deepEqual(be.rules.needed, []); assert.ok(!("component" in R.plates) && R.plates.build === "shieldPlates", "the plates a build alone");
  assert.equal(R.switch.rect[0], R.slot.rect[0]);
  assert.equal(frame.regions.title.marks.bench, "Research"); assert.equal(frame.strings.titles.bench, be.strings.title);
  // the plates: the tier's count (as Home's Probe module), centred on the cradle's axis, inside their region, in the wireframes
  const axis = R.plates.axis, [pw, ph] = R.plates.plate, perTier = { 1: 3, 2: 4 };   // the Probe's plates: three at tier 1, four at tier 2 (the Companion station shows up to four)
  assert.equal(R.cradle.rect[0] + R.cradle.rect[2] / 2, R.cradle.axis); assert.equal(R.plates.rect[0] + R.plates.rect[2] / 2, axis);
  for (const [tier, places] of Object.entries(R.plates.places)) {
    assert.equal(places.length, perTier[tier], "tier " + tier + ": the tier's count");
    assert.equal((places[0][0] + places.at(-1)[0] + pw) / 2, axis, "tier " + tier + " centred");
    assert.ok(places.every(([x, y], i) => inside([x, y, pw, ph], R.plates.rect) && (i === 0 || x - places[i - 1][0] === R.plates.pitch)));
    for (const [x, y] of places) is([x, y, pw, ph], "plate", tier === "1" ? B : W);
  }
  // the column: apart, inside the stage's content, objects 8 px under the word's baseline
  for (const k of ["switch", "slot"]) {
    const m = R[k]; assert.ok(apart(m.rect, R.cradle.rect) && m.rect[1] + m.rect[3] <= 552); is(atRect(m.rect, m.lamp), k + " lamp");
    for (const o of [m.toggle, m.socket, m.meaning && m.meaning.dock, m.meaning && m.meaning.plates].filter(Boolean)) assert.ok(o.at[1] >= m.word[1] + 16 + 8, "8 px from the word's baseline");
  }
  assert.ok(gapOk(R.switch.rect, R.slot.rect, 16), "the modules 16 px apart"); assert.ok(R.cradle.rect[0] + R.cradle.rect[2] + 16 <= R.switch.rect[0]); assert.ok(R.cradle.rect[0] + R.cradle.rect[2] + 16 <= R.plates.rect[0] && R.plates.rect[0] + R.plates.rect[2] + 16 <= R.switch.rect[0], "three columns: the cradle, the plates' box, the column");
  const K = R.switch.toggle.knob, TGL = R.switch.toggle, MN = R.switch.meaning; assert.ok(K.x.off === TGL.at[0] && K.x.on + K.size[0] === TGL.at[0] + TGL.size[0] && K.y === TGL.at[1], "the knob inside its track, x 16 to 56");
  assert.ok(MN.dock.at[0] >= TGL.at[0] + TGL.size[0] + 16 && MN.plates.at[0] >= MN.dock.at[0] + MN.dock.size[0] + 16 && MN.plates.at[0] + MN.plates.pitch * 3 + MN.plates.icon[0] <= R.switch.rect[2] - 16 && MN.plates.at[1] + MN.plates.icon[1] <= R.switch.rect[3] - 16, "the switch's meaning picture inside the module");
  const AD = R.slot.adds; assert.ok(AD.deep.at[0] >= AD.reach.at[0] + AD.reach.size[0] + 16 && AD.deep.at[0] + AD.deep.size[0] <= R.slot.rect[2] - 16, "the deep beside the reach");
  const S = R.slot; assert.ok(inside([S.part.at[0], S.part.at[1], ...S.part.size], [S.socket.at[0], S.socket.at[1], ...S.socket.size])); assert.equal(S.part.at[1] - S.part.armedAt[1], 8, "the armed part lifted 8 px");
  // the focus graph and its vectors
  assert.equal(be.focus.graph.fallback, "none", "a move to nothing stays: the graph's fallback is none");
  const groups = new Set(Object.keys(be.focus.graph).filter((k) => k !== "fallback"));
  for (const [g, e] of Object.entries(be.focus.graph).filter(([k]) => k !== "fallback")) { assert.ok(!(e.order && e.axis)); for (const k of STEP_KEYS) if (k in e) assert.ok(edgeOk(e[k], groups), `${g}.${k}`); }
  for (const [k, t] of Object.entries(be.focus.targets)) assert.ok(isShape(t.shape) && !("ring" in t), k + ": a ring shape");
  const TG = { plates: { group: "plates", box: R.plates.rect }, switch: { group: "module", box: R.switch.rect }, slot: { group: "module", box: R.slot.rect } }, AWAY = { switch: TG.switch, slot: TG.slot };
  for (const v of be.focus.vectors) { if (v.intent) continue; assert.equal(focusMove(be.focus.graph, v.state === "away" ? AWAY : TG, v.from, v.key), v.to, `${v.from} ${v.key} → ${v.to}`); }
  assert.ok(!JSON.stringify(be.colours).includes("amber"), "no amber on the bench"); assert.equal(be.events.install.hold, Math.max(...be.events.install.steps.map((s) => s.at + (s.ms ?? 0))));
  assert.equal(R.bench.until, undefined, "signed: no stand-in slice"); assert.deepEqual(paletteBad(be.colours), []);
});

test("the sitting spec file agrees with its wireframes, region by region; Habitat's half stays where it stood; its focus graphs play their vectors", () => {
  const si = rd("../specs/station/sitting.json"), hab = rd("../specs/station/habitat.json"), R = si.regions, P = boxesOf("14-sitting-pose.svg"), C = boxesOf("14c-sitting-confirm.svg");
  const is = (r, what, set = P) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["bezel", "glass", "resident", "nameTag", "heading", "strip"]) is(R[k].rect, k);
  for (const k of ["bezel", "glass", "resident", "heading", "strip"]) is(R[k].rect, k + " (confirm)", C);
  lintRegions(si); assert.deepEqual(si.states, ["pose", "place", "confirm", "begin"]); assert.deepEqual(si.rules.needed, []);
  for (const k of ["bezel", "glass", "resident", "nameTag"]) assert.deepEqual(R[k].rect, hab.regions[k].rect, k + " where it stood on Habitat");
  assert.deepEqual(R.gilt.rect, R.bezel.rect, "the gilt frame round the window"); assert.deepEqual(R.gilt.inStates, ["confirm", "begin"]);
  const K = R.cards.places, cards = Array.from({ length: K.max }, (_, i) => [K.first[0] + K.pitch[0] * (i % K.grid[0]), K.first[1] + K.pitch[1] * Math.floor(i / K.grid[0]), K.first[2], K.first[3]]);
  assert.equal(K.grid[0] * K.grid[1], K.max); for (const c of cards) assert.ok(inside(c, R.cards.rect), "a card inside its region"); for (const c of cards.slice(0, 3)) is(c, "pose card");
  for (const [i, c] of cards.entries()) for (const d of cards.slice(i + 1)) assert.ok(gapOk(c, d, 16), "cards 16 px apart");
  assert.ok(R.cards.card.picture.at[0] * 2 + R.cards.card.picture.size[0] === K.first[2] && R.cards.card.picture.at[1] * 2 + R.cards.card.picture.size[1] === K.first[3], "the picture centred in its card");
  for (const set of [P, C]) is(R.deck.rect, "the deck", set); assert.deepEqual(R.deck.rect, [592, 48, 416, 424], "the deck is Habitat's right column"); assert.ok(inside(R.heading.rect, R.deck.rect) && inside(R.cards.rect, R.deck.rect) && inside(R.chosen.rect, R.deck.rect), "the heading and the cards in the deck");
  assert.equal(cards[2][0] + cards[2][2], R.deck.rect[0] + R.deck.rect[2] - 16, "the cards end 16 inside the deck"); assert.ok(readFileSync(new URL("../../../design/style-guide/station-layouts/14-sitting-pose.svg", import.meta.url), "utf8").includes(`<rect x="${cards[1][0] - 4}" y="${cards[1][1] - 6}" width="${cards[1][2] + 8}" height="${cards[1][3] + 8}"`), "the ring on card 1, 4 outside and lifted 2");
  assert.equal(R.gilt.part, "gilt"); assert.deepEqual(Object.keys(R.gilt.slices), ["rest", "armed"]); is(R.gilt.opening, "the gilt's opening", C);
  assert.deepEqual(R.gilt.opening, [R.gilt.rect[0] + R.gilt.moulding, R.gilt.rect[1] + R.gilt.moulding, R.gilt.rect[2] - 2 * R.gilt.moulding, R.gilt.rect[3] - 2 * R.gilt.moulding]); assert.equal(Object.values(R.gilt.bands).at(-1)[1], R.gilt.moulding);
  assert.ok(inside(R.resident.rect, R.gilt.opening) && inside(R.nameTag.rect, R.gilt.opening), "the mibi and its tag inside the gilt's opening");
  assert.deepEqual([R.cards.places.grid, R.chosen.places.grid, R.chosen.places.exactly, R.steps.places.exactly], [[3, 2], [2, 1], 2, 3]);
  const B = si.events.begin.steps; assert.deepEqual([B[0].kind, B[0].target, B[0].from, B[0].to, B[0].ms, B[0].levels], ["dither", "gilt", R.gilt.slices.armed, null, 300, 16]); assert.deepEqual([B[1].at, B[1].ms, B[1].to, B[1].focus], [300, 180, "habitat", "portrait"]);
  assert.deepEqual([si.strings.thisPose, si.strings.thisPlace], ["Pick this pose", "Pick this place"]); assert.deepEqual(["pose", "place", "confirm"].map((k) => si.bottomLine[k].capX), [934, 950, 946], "the ← cap at 1008 − word − 20");
  assert.match(hab.focus.targets.portrait.enabled, /^always/); assert.match(hab.focus.entry.backFromSitting, /^portrait/); assert.match(hab.focus.entry.sittingBegun, /^portrait/);
  const H = R.chosen.places; for (let i = 0; i < 2; i++) is([H.first[0] + H.pitch[0] * i, H.first[1], H.first[2], H.first[3]], "chosen card", C);
  assert.ok(R.heading.rect[1] + R.heading.rect[3] + 16 <= R.cards.rect[1], "the heading 16 px above the cards"); assert.equal(R.heading.px, frame.type.title);
  const S = R.steps.places, steps = Array.from({ length: 3 }, (_, i) => [S.first[0] + S.pitch[0] * i, S.first[1], S.first[2], S.first[3]]);
  for (const s of steps) { is(s, "step tile"); assert.ok(inside(s, R.strip.rect)); } assert.deepEqual([steps[0][0], steps[2][0] + steps[2][2]], [32, 984], "the steps span Habitat's strip");
  assert.ok(R.steps.tile.thumb.at[0] + R.steps.tile.thumb.size[0] <= S.first[2] - 8, "the chosen picture inside its tile");
  // frame.json: the sitting under Habitat, ← Habitat, the Vivarium mark
  assert.deepEqual([frame.navigation.screens.sitting.parent, frame.navigation.screens.sitting.back, frame.regions.title.marks.sitting, frame.strings.titles.sitting], ["habitat", "{name}", "Vivarium", si.strings.title]);   // ← from the Sitting names the mibi it was opened on (station-layouts.md, the screen map)
  assert.match(hab.bottomLine.portrait.held.opens, /sitting/, "Habitat's Portrait module opens the sitting");
  // focus: well formed; the vectors played on five cards (pose and place) and on the room (confirm)
  const g = si.focus.pose.graph, groups = new Set(Object.keys(g)); for (const k of STEP_KEYS) assert.ok(edgeOk(g.card[k], groups), "card." + k);
  const TG = Object.fromEntries(cards.slice(0, 5).map((c, i) => ["card." + i, { group: "card", box: c }]));
  let played = 0; for (const v of si.focus.vectors) { if (v.intent || v.state === "confirm") continue; assert.equal(focusMove(g, TG, v.from, v.key), v.to, `${v.state}: ${v.from} ${v.key} → ${v.to}`); played++; }
  assert.ok(played >= 8); assert.deepEqual(si.focus.confirm.targets, {}, "no ring on look and confirm"); assert.ok(STEP_KEYS.every((k) => si.focus.confirm.graph.room[k] === "none"));
  assert.equal(si.events.begin.hold, Math.max(...si.events.begin.steps.map((s) => s.at + (s.ms ?? 0))));
  assert.ok(!JSON.stringify(si.colours).includes("amber")); assert.deepEqual(paletteBad(si.colours), []);
});

test("the not-built composition agrees with its wireframes: one line on the stage's ground, the frame kept on screens and gone on Idle", () => {
  const N = frame.notBuilt, R = N.regions, B = boxesOf("13-not-built.svg"), I = boxesOf("13b-not-built-idle.svg");
  lintRegions({ screen: "frame.notBuilt", regions: R });
  assert.ok(B.has(R.line.rect.join(",")) && I.has(R.line.rect.join(",")), `line ${R.line.rect} is in both wireframes`);
  assert.ok(B.has(frame.regions.stage.rect.join(",")), "the stage in the screen's wireframe"); assert.ok(I.has(R.ground.rect.join(",")), "the ground in Idle's");
  for (const k of ["action", "subject", "need", "back"]) assert.ok(B.has(frame.regions[k].rect.join(",")), `${k} zone in the screen's wireframe`);
  assert.ok(inside(R.line.rect, frame.regions.stage.rect), "the line on the stage");
  assert.equal(R.line.rect[0] + R.line.rect[2] / 2, R.line.centre); assert.equal(R.line.centre, 512);
  assert.deepEqual([R.line.px, R.line.weight], [20, frame.type.weight[20]]); assert.ok(R.line.capTop % 8 === 0, "the cap top on the grid");
  assert.deepEqual(N.frame, { screen: true, idle: false }); assert.equal(N.boot, "home"); assert.equal(R.ground.on, "idle");
  assert.equal(frame.colours.stageGround, "ground", "the stage with no slice is the instrument's ground"); assert.equal(N.colours.ground, frame.colours.stageGround);
  assert.deepEqual(paletteBad(N.colours), []); assert.deepEqual(paletteBad(frame.idle.colours), []);
  for (const k of ["line"]) { const s = N.strings[k]; assert.ok(s.split(/\s+/).length <= R.line.words, `${k}: six words or fewer`); assert.ok(!/\d/.test(s), `${k}: no digits`); assert.ok(!s.endsWith("."), `${k}: no full stop`); }
  assert.equal(N.strings.line, N.strings.line.toLowerCase(), "the line in lower case, as the frame's notices; the title names the screen");
  assert.equal(N.strings.subject, "");
});

// Home, Cargo and Idle (station-layouts.md: Home, Cargo, Idle): the spec files against their wireframes, the focus played on its vectors
const rectsOnly = (spec) => ({ screen: spec.screen, regions: Object.fromEntries(Object.entries(spec.regions).filter(([, r]) => Array.isArray(r.rect))) });
const wordsIn = (s) => s.trim().split(/\s+/).length;
const stringsOf = (o) => typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(stringsOf) : o && typeof o === "object" ? Object.entries(o).filter(([k]) => !["rule", "order"].includes(k)).flatMap(([, v]) => stringsOf(v)) : [];

test("the Home spec file is the build spec's frame: the top bar and its line, the two bezels and their windows, the console and its four stations, every number as written; its focus graph is the table of keys and plays its vectors", () => {
  const home = rd("../specs/station/home.json"), R = home.regions, F = rd("../specs/station/frame.json"), is = (a, b, what) => assert.deepEqual(a, b, what);
  lintRegions(rectsOnly(home)); is(home.states, ["home"]);
  // §1: the rectangles, as written
  is(R.bar.rect, [0, 0, 1024, 40]); is(R.bar.slice, F.regions.top.slice, "the shared bar's picture"); is(R.line.rect, [320, 8, 520, 24]); is(R.line.centre, 580, "centred in its zone");
  is(R.vivarium.rect, [16, 48, 620, 400]); is(R.vivarium.window, [24, 78, 604, 362]); is(R.library.rect, [648, 48, 360, 400]); is(R.library.window, [656, 78, 344, 362]); is(R.console.rect, [16, 460, 992, 132]);
  is(["pods", "incubator", "companion", "bay"].map((k) => R[k].rect), [[32, 477, 226, 98], [270, 477, 226, 98], [528, 477, 226, 98], [766, 477, 226, 98]]); is(R.station.size, [226, 98]);
  is([R.bezel.radius, R.bezel.header, R.console.radius, R.station.radius], [10, 30, 10, 8]); assert.ok(!("windowRadius" in R.vivarium) && !("windowRadius" in R.library), "no radius on the windows");
  // the gaps: 12 between the bezels, 12 above the console, 8 at the foot; the windows sit 8 in and under the 30 px header, and the stations sit inside the console
  const right = (r) => r[0] + r[2], bottom = (r) => r[1] + r[3];
  assert.equal(R.library.rect[0] - right(R.vivarium.rect), 12); assert.equal(R.console.rect[1] - bottom(R.vivarium.rect), 12); assert.equal(R.console.rect[1] - bottom(R.library.rect), 12); assert.equal(600 - bottom(R.console.rect), 8, "no bottom line: 8 at the foot"); assert.equal(R.console.rect[0], 16); assert.equal(1024 - right(R.console.rect), 16);
  for (const k of ["vivarium", "library"]) { const B = R[k].rect, Wd = R[k].window; is(Wd, [B[0] + 8, B[1] + R.bezel.header, B[2] - 16, B[3] - R.bezel.header - 8], k + "'s window"); assert.ok(inside(Wd, B)); }
  for (const k of ["pods", "incubator", "companion", "bay"]) assert.ok(inside(R[k].rect, R.console.rect), k + " inside the console");
  is(R.stage.rect, [0, 40, 1024, 560], "the stage runs to the foot: Home has no bottom line"); assert.equal(F.regions.top.rect[3], R.stage.rect[1], "under the shared bar");
  assert.ok(inside(R.line.rect, R.bar.rect) && R.line.rect[0] + R.line.rect[2] / 2 === R.line.centre, "the line in the bar's middle");
  // the bar and the stations' words: the sizes are the faces', the places the spec's
  is([R.bar.title.px, R.bar.place.px, R.bar.date.px, R.bar.clock.px, R.bar.clock.right, R.bar.title.x, R.bar.place.gap], [20, 16, 16, 20, 1008, 16, 12]); is([R.bar.title.colour, R.bar.place.colour, R.bar.date.colour, R.bar.clock.colour], ["bone", "mist", "mist", "bone"]);
  is([R.bezel.titlePx, R.bezel.title, R.bezel.titleColour, R.bezel.readoutPx, R.bezel.readoutGap, R.bezel.readoutColour, R.bezel.expand], [16, [12, 7], "bone", 16, 8, "fog", { size: 14, tick: 4, at: [30, 8] }]); assert.equal(R.bezel.expandColour, "mist");
  is([R.station.namePx, R.station.nameColour, R.station.name, R.station.line1Px, R.station.line1Colour, R.station.line1, R.station.line2Px, R.station.line2Colour, R.station.line2], [16, "fog", [30, 8], 20, "bone", [12, 34], 16, "mist", [12, 64]]); is([R.station.lamp, R.station.line1Px2, R.station.pictureInset, R.station.columnGap, R.station.bayLine2Right, R.station.slot], [[12, 10, 12, 12], 16, 8, 8, 214, { size: [24, 32], radius: 6, edge: "hairline" }], "section 11: the lamp, the name after it, line 1 at 20 or 16, the picture 8 in, a column 8 clear");
  is([R.pods.picture, R.incubator.picture, R.companion.picture], [[76, 66], [56, 86], [28, 46]], "the pods' six slots 3 by 2; the capsule 56 by 86; the Companion about 28 by 46"); is(R.pods.slots, { size: [24, 32], gap: 2, cols: 3, rows: 2 }); is({ ...R.bay.picture, note: undefined }, { berth: [26, 24], portrait: [18, 24], gap: 2, berths: 3, withPortrait: 4, top: 32, note: undefined });
  for (const k of ["pods", "incubator", "companion"]) assert.ok(R[k].picture[1] <= R.station.size[1] && R[k].picture[0] + 8 <= R.station.size[0]);
  is([R.incubator.capsule.size, R.incubator.capsule.foot, R.incubator.capsule.podHeight, R.incubator.capsule.bar.rect, R.incubator.capsule.bar.max, R.pods.glint.size, R.pods.glint.at, R.companion.plates.size, R.companion.plates.gap, R.companion.plates.at, R.companion.plates.max], [[56, 86], [27, 63], 27, [10, 71, 34, 10], 34, [12, 12], [12, 0], [12, 24], 4, [12, 64], 4], "H3: the capsule, its bar window, the glint and the plates (each an open question for UI/UX, one value apiece)");
  for (const c of [R.bezel.fill, R.bezel.edge, R.bezel.bevel, R.station.fill, R.station.edge, R.station.bevel, R.console.fill, R.console.edge]) assert.ok(palette.colours.some(([n]) => n === c), c + " is a palette colour");
  is([R.bezel.fill, R.bezel.edge, R.bezel.bevel, R.console.fill, R.console.edge, R.station.fill, R.station.edge, R.station.bevel], ["panel", "hairline", "bevel", "bar", "hairline", "panel", "hairline", "bevel"]);
  // §5: the table of keys is the graph: ◀ ▶ ▲ ▼ from the room and each target, "—" where the ring stays
  const T = ["vivarium", "library", "pods", "incubator", "companion", "bay"], G = home.focus.graph, K = { room: ["—", "—", "vivarium", "pods"], vivarium: ["—", "library", "—", "pods"], library: ["vivarium", "—", "—", "bay"], pods: ["—", "incubator", "vivarium", "—"], incubator: ["pods", "companion", "vivarium", "—"], companion: ["incubator", "bay", "vivarium", "—"], bay: ["companion", "—", "library", "—"] };
  assert.deepEqual([G.roomKey, G.fallback], ["room", "none"]); assert.equal(graphProblem(G), null);
  for (const [from, [l, r, u, d]] of Object.entries(K)) { const want = { left: l, right: r, up: u, down: d }; for (const k of STEP_KEYS) assert.equal(G[from][k], want[k] === "—" ? "none" : want[k], `${from} ${k}`); }
  is(Object.keys(G).filter((k) => !["roomKey", "fallback"].includes(k)).sort(), ["room", ...T].sort(), "one entry for the room and each target");
  is(Object.keys(home.focus.targets), T, "the targets in the order the view lists them: the bezels, then the stations");
  for (const [k, t] of Object.entries(home.focus.targets)) { assert.ok(isShape(t.shape) && !("ring" in t), k); assert.equal(t.group, k, "a target a group"); assert.equal(t.shape.rect, T.indexOf(k) < 2 ? R.bezel.radius : R.station.radius, `${k}: the ring follows the object's own radius (14 on a bezel, 12 on a station once the reach is on)`); assert.equal(t.lift, 0, "no lift"); assert.equal(t.box, `regions.${k}.rect`); }
  // the ring is 5 outside the object: the key bands and the 2 px core end 4 out, the radius 14 on a bezel and 12 on a station
  assert.equal(F.focus.ring.reach, 5); assert.deepEqual(F.focus.ring.bands.map((b) => b.w), [1, 2, 1]); assert.equal(F.focus.ring.gap + F.focus.ring.bands[0].w + F.focus.ring.bands[1].w + F.focus.ring.bands[2].w, 5); assert.equal(R.bezel.radius + 4, 14); assert.equal(R.station.radius + 4, 12);
  // the vectors: every place and key once, played by ui/focus.mjs, and the face's carry the same
  const TG = Object.fromEntries(T.map((k) => [k, { group: k, box: R[k].rect }])), list = T.map((id) => ({ id, rect: TG[id].box, group: id }));
  is(home.focus.vectors.length, 28); for (const v of home.focus.vectors) assert.equal(moveFocus(G, list, v.from, v.key, () => null, { roomAt: home.focus.roomAt }).to, v.to, `${v.from} ${v.key} → ${v.to}`);
  for (const from of ["room", ...T]) for (const key of STEP_KEYS) assert.ok(home.focus.vectors.find((x) => x.from === from && x.key === key), `${from} ${key}`);
  const FV = JSON.parse(readFileSync(new URL("../../face/tests/vectors/focus.json", import.meta.url), "utf8")).cases.filter((c) => c.name.startsWith("home: "));
  assert.equal(FV.length, home.focus.vectors.length); FV.forEach((c, i) => { const v = home.focus.vectors[i]; assert.deepEqual([c.from, c.key, c.to], [v.from, v.key, v.to], c.name); assert.deepEqual(c.graph, G, c.name); assert.deepEqual(c.roomAt, home.focus.roomAt); assert.deepEqual(c.targets, list, c.name); });
  // the words: a station's names, a verb of four words or fewer, a station's lines of four words or fewer, no digits in the needs, never outing
  for (const w of Object.values(home.strings.titles)) assert.equal(wordsIn(w), 1, w);
  for (const s of stringsOf(home.strings.actions)) assert.ok(wordsIn(s) <= 5, s);   // section 11 words them: "Go to the Probe bench" is five (the four-word rule is the stations' lines)
  for (const s of stringsOf(home.strings.stations)) assert.ok(wordsIn(s.replace(/\{(\w+)\}/g, "x")) <= 4, s);
  for (const s of stringsOf(home.strings.needs)) { assert.ok(wordsIn(s) <= 6, s); assert.ok(!/\d/.test(s), s); }
  assert.ok(!/outing|pocket/.test(JSON.stringify(home.strings)));
  is(home.strings.line.order, ["crates", "budReady", "portrait", "meet", "newPods", "glints", "waitingPods", "couldGrow"], "the needs in order"); for (const k of home.strings.line.order) assert.ok(home.strings.line.needs[k], k);
  assert.equal(home.strings.line.needs.crates.action, "Open the Bay"); assert.ok(!("lineAction" in home.strings.needs.crates)); assert.equal(home.strings.needs.crates.action, "Open the bay", "Cargo's own words are unchanged"); is(home.strings.actions, { vivarium: "Go to the Vivarium", library: "Go to the Library", pods: "Go to Pods", incubator: "Go to the Incubator", companion: "Go to the Probe bench", bay: "Open the Bay" }); assert.equal(home.strings.line.needs.budReady.action, "Open the bud"); assert.equal(home.strings.line.needs.portrait.notice, "{name}'s portrait has come"); assert.deepEqual(home.strings.stages, { juvenile: "young", adult: "adult", elder: "elder" });
  assert.equal(home.strings.titles.bar, "Station"); is(home.strings.readout, { home: "{n} at home", trip: "{m} on a trip", allTrip: "all on a trip", sep: " \u00b7 " });
  is(home.events.rest, { ...home.events.rest, kind: "rest", target: "home", ms: 200, hold: 380 }); assert.ok(!("crateIn" in home.events), "the crates' slide went with the Cargo module");
  // §3 (H2): the Vivarium window as written: the crop of Idle's painting at columns 64 .. 667 (cx = 64), rows 194 .. 555, the 2 px inner shade, the six walkers on the moved profile, the keep-out and the away frame
  is([R.window.rect, R.window.painting.cx, R.window.painting.at, R.window.painting.rows, R.window.shade.px, R.window.shade.edges], [R.vivarium.window, 64, [64, 194], [194, 555], 2, ["top", "left"]]); assert.equal(R.window.painting.rows[1] - R.window.painting.rows[0] + 1, R.window.rect[3], "362 rows"); assert.equal(R.window.painting.at[0] + R.window.rect[2] - 1, 667);
  assert.ok(palette.colours.some(([n]) => n === R.window.shade.colour), "the shade is a palette colour");
  is([R.resident.max, R.resident.adult, R.resident.juvenile, R.resident.walk.ground, R.resident.walk.keepOut, R.resident.walk.profile.dx, R.resident.walk.profile.dy, R.window.foot[1]], [6, [144, 152], [104, 112], [32, 280, 588, 156], [548, 344, 80, 96], R.window.painting.cx - R.window.rect[0], -36, 435]);
  { const vr = rd("../specs/station/vivarium.json").regions.resident, tops = vr.walk.profile.top; assert.equal(R.resident.walk.ground[1], Math.min(...tops.slice(1, 4)) - 36, "the rows start at the lowest groundTop of the columns the window shows (316 - 36)"); assert.equal(R.resident.walk.ground[1] + R.resident.walk.ground[3] - 1, R.window.foot[1], "to the foot, feetY 435"); assert.equal(R.resident.walk.ground[0] + R.resident.walk.ground[2], 620, "F.x held to 32 .. 620"); }
  is([R.away.rect, R.away.fill, R.away.edge, R.away.size, R.away.caption], [[556, 352, 64, 64], "panel", "hairline", { adult: 54, juvenile: 40 }, { px: 16, colour: "frost", y: 418, centre: 588 }]); assert.equal(home.strings.away, "away"); assert.ok(inside(R.away.rect, R.window.rect) && inside(R.resident.walk.keepOut, R.window.rect), "the away frame and the keep-out are inside the window"); assert.ok(inside(R.away.rect, R.resident.walk.keepOut), "the keep-out holds the frame and its caption");
  assert.ok(!("knob" in R) && !("glass" in R) && !("bed" in R) && !("cargo" in R) && !("probe" in R), "the knob, the glass, the bed and the old column are gone"); assert.deepEqual(paletteBad(home.colours), []);
});

test("the Cargo spec file is the build spec's sections 1 to 6 (T-20261016-197): the bay window, the hatch with its wells and strip, the mat, the display row, the berths (three of 256, four of 188), the opening's steps, the keys and the strings; Cargo is under Home with Home's mark", () => {
  const cg = rd("../specs/station/cargo.json"), R = cg.regions, stage = frame.regions.stage.rect; lintRegions(cg);
  assert.deepEqual(cg.states, ["bay", "opening", "end", "arrival"]); assert.equal(cg.title.word, "Bay");
  // 1. the regions, in screen pixels at 1x
  assert.deepEqual(R.bay.rect, [16, 46, 992, 506]); assert.equal(R.bay.slice, "cargo-bay-992x506"); assert.equal(R.bay.radius, 6); assert.ok(inside(R.bay.rect, stage), "inside the stage");
  assert.deepEqual(R.hatch.rect, [24, 150, 160, 260]); assert.deepEqual(R.hatch.slices, { shut: "hatch-shut-160x260", open: "pods-hatch-open-160x260" }); assert.deepEqual(R.hatch.ring, { slice: "ring-hatch-80x56", at: [64, 166], size: [80, 56], rule: R.hatch.ring.rule });
  assert.deepEqual(R.hatch.wells.centres, [[49, 60], [103, 58], [49, 120], [103, 119], [50, 180], [104, 182]]); assert.deepEqual(R.hatch.wells.pod, { class: "list", size: [40, 48], at: [-20, -26] }); assert.deepEqual([R.hatch.wells.lit.slice, R.hatch.wells.lit.size, R.hatch.wells.lit.at], ["well-lit-64x64", [64, 64], [-32, -32]]);
  for (const [cx, cy] of R.hatch.wells.centres) { assert.ok(inside([R.hatch.rect[0] + cx - 32, R.hatch.rect[1] + cy - 32, 64, 64], R.hatch.rect), "a lit well inside the hatch"); assert.ok(inside([R.hatch.rect[0] + cx - 20, R.hatch.rect[1] + cy - 26, 40, 48], R.hatch.rect)); }
  assert.deepEqual(R.hatch.strip.rect, [32, 382, 144, 20]); assert.ok(inside(R.hatch.strip.rect, R.hatch.rect)); assert.deepEqual([R.hatch.strip.find.size, R.hatch.strip.find.at, R.hatch.strip.find.pitch], [[16, 16], [36, 384], 20]);
  assert.deepEqual(R.waiting.rect, [24, 424, 160, 80]); assert.deepEqual([R.waiting.pods.size, R.waiting.pods.top, R.waiting.pods.shadow.at, R.waiting.pods.shadow.slice], [[40, 48], 434, [-4, 40], "cargo-store-shadow-48x14"]);
  { const B = R.waiting.pods.byCount; assert.deepEqual(B, { 1: [84], 2: [60, 108], 3: [36, 84, 132] }); for (const xs of Object.values(B)) assert.equal(xs[0] + (xs.at(-1) + 40 - xs[0]) / 2, 104, "each row centred on x 104"); assert.deepEqual(R.hatch.frame, { slice: "hatch-frame-166x266", at: [21, 147], size: [166, 266], rule: R.hatch.frame.rule }, "the hatch frame is the hatch grown by 3"); assert.deepEqual(R.waiting.pods.moreX, [32, 80, 128]); assert.deepEqual([R.waiting.pods.more.right, R.waiting.pods.more.centreY], [180, 458]); assert.equal(R.waiting.pods.shadow.at[1] + R.waiting.pods.top, 474, "the shadow at y 474"); assert.ok(inside([R.waiting.pods.moreX[2], 434, 40, 48], R.waiting.rect)); }
  assert.deepEqual(R.display.rect, [200, 60, 800, 180]); assert.equal(R.display.centre, 600); assert.equal(R.display.feet, 220);
  assert.deepEqual([R.display.pod.size, R.display.pod.top, R.display.pod.top + R.display.pod.size[1]], [[88, 112], 108, 220]); assert.deepEqual([R.display.find.size, R.display.find.top + R.display.find.size[1]], [[112, 112], 220]);
  assert.deepEqual([R.display.material.big.size, R.display.material.big.top + 96, R.display.material.big.shadow.at], [[72, 96], 220, [0, 86]]); assert.deepEqual([R.display.material.small.size, R.display.material.small.top + 64, R.display.material.small.shadow.at], [[48, 64], 220, [0, 58]]);
  assert.equal(R.display.material.big.top + R.display.material.big.shadow.at[1], 210, "72 px shadow at y 210"); assert.equal(R.display.material.small.top + R.display.material.small.shadow.at[1], 214, "48 px shadow at y 214"); assert.deepEqual(R.display.pod.glint.at, [78, -4], "the glint at (x + 78, 104)"); assert.equal(R.display.pod.top + R.display.pod.glint.at[1], 104);
  assert.deepEqual([R.display.gap.within, R.display.gap.between], [16, 24]); assert.deepEqual([R.display.portrait.frameSize, R.display.portrait.picture, R.display.portrait.pictureAt, R.display.portrait.leaves], [[48, 40], [40, 30], [4, 4], [-200, 40]]);
  assert.ok(inside([R.display.portrait.at[0], R.display.portrait.at[1], 48, 40], R.display.rect)); assert.equal(R.display.portrait.at[0] + 24, 600, "the pair centred in the display");
  // 3. the berths
  assert.deepEqual(R.berths.rect, [200, 252, 800, 292]); const T3 = R.berths.three, T4 = R.berths.four;
  assert.deepEqual([T3.w, T3.x], [256, [200, 472, 744]]); assert.deepEqual(T3.x.map((x, i, a) => (a[i + 1] ?? x + 256 + 16) - x - 256), [16, 16, 16], "16 apart"); assert.deepEqual([T4.w, T4.x], [188, [200, 404, 608, 812]]); assert.deepEqual(T4.x.map((x, i, a) => (a[i + 1] ?? x + 188 + 16) - x - 188), [16, 16, 16, 16]);
  assert.equal(T3.x.at(-1) + 256, 1000); assert.equal(T4.x.at(-1) + 188, 1000);
  assert.deepEqual([T3.sealed, T3.lifting, T3.done, T3.shadow], [{ slice: "crate-sealed-256x176", at: [0, 102] }, { slice: "crate-lifting-256x200", at: [0, 91] }, { slice: "crate-sealed-256x176-done", at: [0, 102] }, { slice: "crate-shadow-256x24", size: [256, 24], at: [0, 260] }]);
  assert.equal(102 + 176, 292 - 14, "the feet 14 above the berth's foot"); assert.equal(91 + 200 - 13, 292 - 14, "the lifting crate's foot is 13 above its picture's foot, so the feet line holds");
  assert.deepEqual([T4.sealed, T4.lifting, T4.done, T4.shadow], [{ slice: "crate-sealed-176x121", at: [6, 157] }, { slice: "crate-lifting-176x138", at: [6, 132] }, { slice: "crate-sealed-176x121-done", at: [6, 157] }, { slice: "crate-shadow-176x16", size: [176, 16], at: [6, 266] }]); assert.equal(157 + 121, 292 - 14);
  assert.deepEqual(T4.portrait, { sealed: "crate-sitting-176x121", done: "crate-sitting-176x121-done", gilt: { slice: "berth-gilt-198x302", at: [-5, -5] } }); assert.deepEqual([T3.edge, T4.edge], [{ slice: "berth-edge-258x294", at: [-1, -1] }, { slice: "berth-edge-190x294", at: [-1, -1] }]);
  assert.deepEqual([T3.recess, T3.shut, T4.recess, T4.shut], ["berth-recess-256x292", "berth-shut-256x292", "berth-recess-188x292", "berth-shut-188x292"]);
  // 4. the opening
  const O = cg.events.opening, S4 = O.steps; assert.deepEqual([O.kind, O.target, O.skip], ["arrival", "crate", true]); assert.deepEqual(S4, { lift: 0, display: 200, dither: 180, flash: 500, flashMs: 240, materials: 700, materialEach: 150, hatch: 1500, pods: 1700, podEach: 300, travel: 600, swap: 180, tail: 300, portrait: 700 }); assert.equal(S4.flashMs, frame.regions.materials.flashMs, "the frame's flash");
  assert.equal(cg.regions.travel.ms, S4.travel); assert.equal(O.byCrates, undefined, "the byCrates table goes"); assert.equal(O.perCrate, undefined, "perCrate goes"); assert.equal(cg.events.crateIn, undefined, "no slide");
  assert.ok(R.report === undefined && R.rack === undefined && R.ribbon === undefined && R.stores === undefined && R.crate === undefined && R.crates === undefined && R.waitingPods === undefined, "the report, the rack, the ribbon, the old closer and the old waiting pods go");
  // 6. states, keys, the line, the strings
  assert.deepEqual(cg.focus.graph, { room: { up: "none", down: "none", left: "none", right: "none" } });
  assert.deepEqual(frame.navigation.screens.cargo, { parent: "home", back: "Home", states: cg.states, spec: "cargo.json" }); assert.equal(frame.strings.titles.cargo, cg.strings.title); assert.equal(frame.regions.title.marks.cargo, cg.title.mark);
  assert.ok(frame.navigation.jumps.some((j) => j.from === "cargo" && j.to === "pods" && Object.values(cg.strings.newPods).includes(j.action) && j.state === "end"), "the hand-off to Pods");
  assert.deepEqual([cg.strings.open, cg.strings.openOne, cg.strings.skip, cg.strings.newPods], ["Open them all", "Open it", "Skip", { one: "Look at the pods", few: "Look at the pods" }]); assert.deepEqual(cg.strings.subjects, { waiting: "{count} pods wait for a well", waitingOne: "a pod waits for a well" });
  for (const s of [cg.strings.open, cg.strings.openOne, cg.strings.skip, ...Object.values(cg.strings.newPods)]) assert.ok(wordsIn(s) <= 4, s);
  for (const s of stringsOf(cg.strings.subjects)) { assert.ok(wordsIn(s) <= 6, s); assert.ok(!/\d/.test(s), s); }
  assert.ok(!/outing|haul|pocket/.test(JSON.stringify(cg.strings)), "cargo, never haul"); assert.equal(cg.strings.done, undefined); assert.equal(cg.strings.ribbon, undefined);
  assert.deepEqual(paletteBad(cg.colours), []); assert.ok(!JSON.stringify(cg.colours).includes("amber"), "nothing amber on Cargo's stage");
  // the dock arrival keeps its own regions under the dock names
  for (const k of ["dockBay", "dockCrates", "dockRack", "dockRibbon", "arrival"]) assert.ok(R[k], k); assert.deepEqual(R.dockBay.rect, [16, 48, 992, 320]); assert.equal(R.arrival.crates.places, "regions.dockCrates.byCount");
});

test("the Bay's cuts: every picture the spec names is a placed master of exactly the size its name gives (the cut script and the art director's clean cuts)", () => {
  const idx = rd("../assets/masters/index.json").masters, cg = rd("../specs/station/cargo.json"), R = cg.regions, ids = new Set();
  const take = (o) => { if (typeof o === "string") { if (/^(cargo-|berth-|hatch-|pods-hatch|well-lit|crate-|ring-hatch|find-|glint)/.test(o)) ids.add(o); } else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (k !== "rule" && k !== "note") take(v); };
  for (const k of ["bay", "hatch", "waiting", "display", "berths"]) take(R[k]);
  for (const kind of ["crystal", "pearl", "shard"]) for (const sz of ["112x112", "16x16"]) ids.add(`find-${kind}-${sz}`);
  for (const m of ["energy", "data", "essence"]) for (const sz of ["72x96", "48x64"]) ids.add(`cargo-${m}-${sz}`);
  assert.ok(ids.size >= 30, "ids: " + [...ids].join(" "));
  for (const id of ids) { const e = idx[id]; assert.ok(e, `${id} is placed`); const m = id.match(/(\d+)x(\d+)(?:-done)?$/); assert.deepEqual([e.w, e.h], [+m[1], +m[2]], `${id} is the size its name gives`); }
  for (const id of ["crate-lifting-256x200", "crate-lifting-176x138", "pods-hatch-open-160x260"]) assert.match(idx[id].signed, /final/, `${id} carries no not-final flag`);
});

test("Idle is the Vivarium's whole without the frame: one painting, the bed and its sleepers on the ground band, the line on its strip", () => {
  const I = frame.idle, R = I.regions, V = R.vivarium, B = boxesOf("10-idle.svg");
  for (const k of ["vivarium", "bed", "strip"]) assert.ok(B.has(R[k].rect.join(",")), `${k} ${R[k].rect} is in the wireframe`);
  assert.deepEqual(V.ground.slice(2), [1024, 176]); assert.equal(V.ground[1] + V.ground[3], V.foot[1]); assert.equal(V.foot[1] + V.foot[3], R.strip.rect[1]);
  const w = V.theWhole; assert.equal(w.rows[1] - w.rows[0], w.at[3], "the whole's window is a 1:1 part of the painting"); assert.equal(V.ground[1] - w.rows[0] + w.at[1], 296, "its ground band where the whole's is");
  const S = R.bed.sleepers; assert.equal(R.bed.rect[1] + R.bed.rect[3], V.foot[1], "the bed on the ground band's foot"); assert.equal(S.centre, R.bed.rect[0] + R.bed.rect[2] / 2); assert.equal(S.footY, R.bed.rect[1] + 40);
  for (const [n, xs] of Object.entries(S.places)) xs.forEach((x, i) => { assert.equal(x, S.centre + S.pitch * (i - (n - 1) / 2)); assert.ok(x - 72 >= 16 && x + 72 <= 1008, "an adult sleeper 16 px inside the screen"); });
  assert.equal(R.bed.markRect[0] + 8, S.centre); assert.ok(inside(R.resident.walk.ground, V.ground));
  assert.deepEqual(S.ink.rects[3], S.places[3].map((x) => [x - 48, S.footY - 88, 96, 88])); assert.deepEqual([S.ink.rects[3][0][0], S.ink.rects[3][2][0] + 96], [R.bed.rect[0], R.bed.rect[0] + R.bed.rect[2]]);
  for (const x of S.places[2]) assert.ok(B.has([x - 48, S.footY - 88, 96, 88].join(",")), "two sleepers' nap ink in the wireframe"); assert.ok(!("asleepMark" in S) && S.mark === null, "no asleep mark");
  assert.deepEqual(I.strings.out, { 1: "{name} is out with the Companion", 2: "two mibis are with the Companion", 3: "three mibis are with the Companion" });
  for (const s of [...Object.values(I.strings.crates), I.strings.budReady, I.strings.budGrowing, ...Object.values(I.strings.out)]) { assert.ok(wordsIn(s) <= R.line.words, s); assert.ok(!/\d/.test(s), s); }
  assert.deepEqual(I.strings.order, ["crates", "budReady", "budGrowing", "out"]);
});

test("every title mark, lower-cased, has a room mark picture: the face looks the mark up by the title's word (frame.c), so a word without one draws an empty mark", () => {
  const frame = JSON.parse(readFileSync(new URL("../specs/station/frame.json", import.meta.url), "utf8")), rooms = frame.regions.marks.room;
  for (const [screen, word] of Object.entries(frame.regions.title.marks)) assert.ok(typeof rooms[word.toLowerCase()] === "string", `the title mark of ${screen} is "${word}": marks.room has no "${word.toLowerCase()}"`);
  assert.equal(rooms.vivarium, "frame-room-vivarium-24", "the Vivarium's mark is the key's icon, the device button's drawing (station-layouts.md, The frame)");
  const masters = JSON.parse(readFileSync(new URL("../assets/masters/index.json", import.meta.url), "utf8"));
  for (const id of Object.values(rooms).filter((v) => typeof v === "string")) assert.ok(JSON.stringify(masters).includes(`"${id}"`), `${id} is a registered master`);
});

// The Library spread (station-layouts.md, Library spread; library.json `spread`): the Library's whole, against its wireframes 20 and 20a, its focus played on its vectors
test("the Library spread agrees with its wireframes: sixteen frames, two pages of four by two, each frame's parts in place; its focus walks the grid by its vectors; ← Home", () => {
  const lib = rd("../specs/station/library.json"), S = lib.spread, R = S.regions, I = S.item, B = boxesOf("20-library-spread.svg"), E = boxesOf("20a-library-spread-empty.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  lintRegions({ screen: "library.spread", regions: Object.fromEntries(Object.entries(R).map(([k, r]) => [k, k === "stage" ? { ...r, offGrid: true } : r])) });   // the stage is the frame's (40, 522)
  assert.deepEqual(S.states, ["spread"]); assert.deepEqual(R.stage.rect, frame.regions.stage.rect); assert.equal(R.stage.component, "frame"); assert.equal(R.stage.part, "stage"); assert.ok(R.stage.slice.endsWith("-1024x522"), "a stage slice is 1024×522");
  // the volume in the slice: the boards, two pages and the gutter between them, the bands and the marker inside them
  const P = R.stage.parts, [L, Rp] = P.pages; for (const k of [P.boards, L, Rp, ...P.marginLife, P.marker]) { is(k, "stage part"); is(k, "stage part", E); }
  assert.ok(inside(L, P.boards) && inside(Rp, P.boards)); assert.deepEqual(P.gutter, [L[0] + L[2], L[1], Rp[0] - L[0] - L[2], L[3]]); assert.equal(P.marker[0] + P.marker[2] / 2, 512, "the marker centred on the gutter");
  assert.ok(inside(P.marginLife[0], L) && inside(P.marginLife[1], Rp));
  // the frames: listPitch places, four by two a page, 16 px apart, 24 px from the page's edge, rows 184 apart; the rects are the places
  const place = (pl, i) => [pl.first[0] + pl.pitch[0] * (i % pl.grid[0]), pl.first[1] + pl.pitch[1] * Math.floor(i / pl.grid[0]), pl.first[2], pl.first[3]];
  const all = [];
  for (const [k, page] of [["leftPage", L], ["rightPage", Rp]]) {
    const G = R[k]; assert.equal(G.component, "list"); assert.deepEqual(G.layout, ["listPitch"]); assert.equal(G.build, "spreadPage"); assert.deepEqual(G.places.grid, [4, 2]);
    const rs = Array.from({ length: 8 }, (_, i) => place(G.places, i)); assert.deepEqual(rs, G.rects);
    assert.equal(rs[0][0] - page[0], 24); assert.equal(page[0] + page[2] - (rs[3][0] + rs[3][2]), 24, "24 px to the page's edges"); assert.equal(rs[1][0] - (rs[0][0] + rs[0][2]), 16, "16 px between frames");
    for (const r of rs) { assert.ok(inside(r, G.rect) && inside(r, page)); is(r, k + " frame"); is(r, k + " frame", E); }
    all.push(...rs);
  }
  assert.ok(gapOk(R.leftPage.rect, R.rightPage.rect, 16), "the two lists apart across the gutter"); assert.equal(all.length, 16);
  // the page-turn corner: its own sprite region inside the right page, clear of the frames and the margin life, never in the stage slice
  assert.ok(inside(R.turn.rect, Rp) && apart(R.turn.rect, R.rightPage.rect) && P.marginLife.every((b) => apart(b, R.turn.rect))); assert.ok(!JSON.stringify(P).includes("968, 512") && !("turn" in P)); is(R.turn.rect, "turn", boxesOf("20b-library-spread-nav.svg"));
  // each frame's parts: the plate in the 8 px mat; the rule 8 px over the frame; the name on the caption line; the gilt corner and the seal centred on the frame's right corners, touching nothing they must not
  const at = (f, a) => [f[0] + a[0], f[1] + a[1], a[2], a[3]];
  for (const [i, f] of all.entries()) {
    const progress = at(f, I.progress.at), roundel = at(f, I.roundel.at), plate = at(f, I.plate.at), rule = at(f, I.clanRule.at), name = at(f, I.name.at), gilt = at(f, I.gilt.at), seal = at(f, I.seal.at);
    assert.deepEqual(plate, [f[0] + 8, f[1] + 8, 80, 96]); assert.deepEqual(I.study.at, I.plate.at); assert.equal(f[1] - (rule[1] + rule[3]), 13);
    assert.equal(name[1], f[1] + f[3] + 8); assert.equal(name[2], f[2]); assert.deepEqual([gilt[0] + 8, gilt[1] + 8], [f[0] + f[2], f[1]]); assert.equal(rule[0] - (roundel[0] + roundel[2]), 4, "the roundel beside the rule"); assert.equal(roundel[1] + roundel[3] / 2, rule[1] + rule[3] / 2, "on the rule's centre line"); assert.ok(apart(roundel, gilt) && roundel[1] + roundel[3] <= f[1] - 7, "2 px clear of the ring's outer key (f − 5)");
    const ringBox = [f[0] - 5, f[1] - 5, 106, 122]; assert.ok(inside(ringBox, i < 8 ? L : Rp), "the ring inside its page"); assert.ok(all.every((g) => g === f || gapOk(ringBox, g, 11)), "the ring 11 px from every other frame"); assert.ok(apart(ringBox, P.marker), "the ring clear of the marker"); assert.ok(inside(progress, i < 8 ? R.leftPage.rect : R.rightPage.rect), "the progress inside its page region"); assert.deepEqual([seal[0] + 8, seal[1] + 8], [f[0] + f[2], f[1] + f[3]]);
    for (const m of [gilt, seal]) { assert.ok(apart(m, plate) && apart(m, name), "a mark clear of the plate and the name"); assert.ok(all.every((g) => g === f || gapOk(m, g, 8)), "8 px from the next frame"); }
    assert.ok(all.every((g) => g === f || apart(name, at(g, I.name.at))), "the names apart"); for (const b of P.marginLife) assert.ok(apart(b, f) && apart(b, name) && apart(b, seal), "the margin life clear");
    const page = i < 8 ? L : Rp; const capRule = f[1] + f[3] + 32; assert.equal(progress[1], capRule + 6, "5 px of paper under the caption rule"); assert.equal(progress[0] + progress[2] / 2, f[0] + f[2] / 2, "centred on the frame");
    for (const r of [roundel, plate, rule, name, gilt, seal]) assert.ok(apart(progress, r), "the progress clear of " + r); for (const g of all) if (g !== f) for (const a of [I.roundel.at, I.clanRule.at, I.gilt.at]) assert.ok(gapOk(progress, at(g, a), 5), "5 px from the next row's marks"); for (const b of P.marginLife) assert.ok(gapOk(progress, b, 5), "5 px over the margin life");
    I.progress.places.forEach(([dx, dy], k) => { assert.ok(inside([f[0] + dx, f[1] + dy, ...I.progress.seed], progress)); assert.equal(dx, I.progress.at[0] + I.progress.pitch * k); });
    for (const r of [progress, roundel, plate, rule, name, gilt, seal]) assert.ok(inside(r, page), "inside its page"); assert.ok(apart(P.marker, gilt) && apart(P.marker, f));
  }
  // in 20: four found (S01 portrayed, S09 complete), S04 met; the plate or study, rule and name where the spec puts them; nothing on the eleven empty frames; in 20a nothing at all
  const shown = { 0: "found", 1: "found", 2: "found", 3: "met", 8: "found" };
  for (const [i, f] of all.entries()) for (const a of [I.plate.at, I.clanRule.at, I.roundel.at, I.name.at, ...(shown[i] === "met" ? [] : [I.progress.at])]) { const r = at(f, a); assert.equal(B.has(r.join(",")), i in shown, `frame ${i} ${r}`); assert.ok(!E.has(r.join(",")), "20a draws no part"); }
  is(at(all[0], I.gilt.at), "gilt corner"); is(at(all[8], I.seal.at), "seal"); assert.ok(!B.has(at(all[3], I.progress.at).join(",")), "no progress on a met frame"); assert.ok(!B.has(at(all[1], I.gilt.at).join(",")) && !B.has(at(all[1], I.seal.at).join(",")));
  assert.equal(I.lift, 2); assert.deepEqual(P.marker, [488, 48, 48, 288]); assert.deepEqual([R.leftPage.rect[3], R.rightPage.rect[3]], [376, 376]); assert.ok(I.name.fit.includes("Untuva"));
  // the names fit their 96 px at 16 (the widest of the sixteen frames, by the face's metrics when the table is built)
  // (the built table when there is one, else the committed metrics vectors, which hold every frame's name at 16)
  const mfile = new URL("../../face/dist/metrics.json", import.meta.url), vfile = new URL("../../face/tests/vectors/metrics.json", import.meta.url);
  let w; if (existsSync(mfile)) { const m = JSON.parse(readFileSync(mfile, "utf8")).fonts["16"]; w = (s) => Array.from(s).reduce((n, ch, j, a) => n + (m.advance[ch.codePointAt(0)] ?? 0) + (j + 1 < a.length ? m.kern[ch.codePointAt(0) + "," + a[j + 1].codePointAt(0)] ?? 0 : 0), 0); }
  else { const cases = JSON.parse(readFileSync(vfile, "utf8")).cases.filter((c) => c.px === 16); w = (s) => { const c = cases.find((x) => x.text === s); assert.ok(c, `${s} in the metrics vectors`); return c.width; }; }
  for (let k = 1; k <= 16; k++) { const id = "S" + String(k).padStart(2, "0"), n = JSON.parse(readFileSync(new URL(`../../workbench/frames/species-${id}.json`, import.meta.url), "utf8")).species.name; assert.ok(w(n) <= I.name.at[2] - 16, `${n} fits its caption`); }
  // the focus: one group, nearestIn ahead on every edge, the round ring on every frame; the vectors played by ui/focus.mjs on the sixteen places
  const G = S.focus.graph; assert.equal(graphProblem(G), null); assert.equal(G.fallback, "none"); for (const k of STEP_KEYS) assert.ok(edgeOk(G.frame[k], new Set(["frame"])), k);
  assert.deepEqual(S.focus.targets.frame.shape, { rect: 0 }); assert.equal(S.focus.targets.frame.ground, undefined); assert.equal(S.focus.targets.frame.lift, 0); assert.ok(!("paperScreens" in frame.focus.ring) && !("paper" in frame.focus.ring.colours), "one form: no paper ground");
  const T = all.map((r, i) => ({ id: "frame.S" + String(i + 1).padStart(2, "0"), rect: r, group: "frame" }));
  for (const v of S.focus.vectors) assert.equal(moveFocus(G, T, v.from, v.key).to, v.to, `${v.from} ${v.key} → ${v.to}`);
  assert.ok(S.focus.vectors.some((v) => v.from === "frame.S04" && v.to === "frame.S09"), "across the gutter"); assert.ok(S.focus.vectors.length >= 12);
  // the frame: the title and its mark, the way back, the room key, the jumps; Home's Library module opens it
  assert.equal(frame.strings.titles.library, S.strings.title); assert.equal(frame.regions.title.marks.library, S.title.mark); const BC = S.buildChanges.find((c) => c.key === "navigation.screens.library"); assert.deepEqual(BC.now, { parent: "home", back: "Home" }); assert.deepEqual(frame.navigation.screens.library, BC.becomes, "the build made the change: the tree names the spread and its spec"); assert.deepEqual(BC.becomes, { ...BC.now, states: S.states, spec: "library.json" });
  assert.equal(frame.navigation.roomKeys.library.state, "spread"); assert.equal(frame.navigation.screens.book.back, "Library"); assert.equal(S.strings.back, frame.navigation.screens.library.back);
  const home = rd("../specs/station/home.json"); assert.equal(home.strings.actions.library, "Go to the Library"); assert.ok(/spread/.test(home.keys.library));
  // the words: an action of four words or fewer, contexts of six or fewer, no digits; no ✓ cap on an empty frame
  assert.ok(wordsIn(S.strings.open) <= 4); for (const s of stringsOf(S.strings.subjects)) { assert.ok(wordsIn(s) <= 6, s); assert.ok(!/\d/.test(s), s); }
  assert.equal(S.line.unmet.action, null); assert.equal(S.line.found.action, "strings.open"); assert.equal(S.line.met.action, null, "a met species does not open the Book");
  for (const k of ["met", "unmet", "bookShut"]) assert.ok(!(k in S.strings), k + ": no plate on the spread (fix 8)"); assert.notEqual(S.strings.subjects.found, S.strings.subjects.met, "the context tells found from met");
  assert.deepEqual(S.events, {}); assert.ok(/frame\.<SNN>/.test(S.keys.confirm) && !/sp:/.test(S.keys.confirm)); assert.ok(S.focus.targets.frame.enabled.includes("all sixteen"));
  // the clan rule keys on the frame's clan id, never the pigment, and waits for the table; the gilt corner is any delivered portrait of the species, released or not
  assert.ok(/taxonomy\.clan/.test(S.derived.clan) && /never the pod pigment/.test(S.derived.clan));
  const CC = Object.fromEntries(Object.entries(S.clanColours).filter(([k]) => /^C\d\d$/.test(k))); assert.equal(Object.keys(CC).length, 16); assert.equal(new Set(Object.values(CC)).size, 16, "sixteen distinct roles"); assert.deepEqual(paletteBad(CC), []);
  for (let k = 1; k <= 16; k++) { const id = "S" + String(k).padStart(2, "0"); assert.ok(CC[JSON.parse(readFileSync(new URL(`../../workbench/frames/species-${id}.json`, import.meta.url), "utf8")).taxonomy.clan], id + "'s clan has a colour"); }
  for (const c of ["orange", "amber", "red"]) assert.ok(!Object.values(CC).includes(c), "never " + c);
  assert.ok(!Object.values(CC).includes("focus") && !Object.values(CC).includes("void"), "no clan colour is a ring colour"); assert.equal(CC.C01, "tealD"); assert.ok(!("ringClash" in S.clanColours)); assert.ok(/faceChoices/.test(S.derived.portrayed) && !/^faceOf/.test(S.derived.portrayed));
  assert.deepEqual(paletteBad(S.colours), []); for (const v of Object.values(I.name.colour)) assert.deepEqual(paletteBad({ v }), []);
  // the progress: four steps from the share of looks found, integers only; complete is 4 and the seal
  const step = (found, unseen) => Math.min(4, Math.floor((4 * found) / (found + unseen)) + 1); assert.deepEqual([[0, 10], [2, 8], [3, 7], [5, 5], [7, 3], [8, 2], [10, 0]].map(([a, b]) => step(a, b)), [1, 1, 2, 3, 3, 4, 4]);
  assert.equal(I.progress.count, 4); assert.ok(/min\(4, floor\(4 × g\.found \/ \(g\.found \+ g\.unseen\)\) \+ 1\)/.test(S.derived.progress)); assert.ok(/progress/.test(I.props) && /no progress/.test(I.met));
  // the masters: each at its size, a placeholder for each
  for (const id of Object.keys(S.masters).filter((k) => k !== "_note")) { const [w, h] = id.match(/(\d+)x(\d+)$/).slice(1).map(Number); assert.ok(w > 0 && h > 0, id); assert.ok(id in S.placeholders, "a placeholder for " + id); }
  assert.ok(S.masters["spread-plate-{SNN}-80x96"] && S.masters["spread-study-{SNN}-80x96"] && S.masters["library-stage-spread-1024x522"]);
});

test("the Probe bench's plate places, a table a tier: as many as the tier's Shield plates (state.mjs TIER), a 48 pitch, centred on the plates' axis 472, every place at y 480 inside the plates' box", async () => {
  const { TIER } = await import("../../station/src/state.mjs"), be = JSON.parse(readFileSync(new URL("../specs/station/bench.json", import.meta.url), "utf8")), P = be.regions.plates, axis = be.regions.plates.axis;
  assert.deepEqual(Object.keys(P.places).sort(), Object.keys(TIER).sort(), "a table for every tier");
  assert.equal(be.regions.switch.meaning.plates.offWhole, (await import("../../station/src/state.mjs")).DOCK_MEND_FLOOR, "the switch off leaves the plates the dock mends free: state.mjs DOCK_MEND_FLOOR");
  for (const [t, places] of Object.entries(P.places)) {
    assert.equal(places.length, TIER[t].shield, `tier ${t}: a place for each of its ${TIER[t].shield} plates`);
    places.forEach((pl, i) => { assert.equal(pl[1], 480, `tier ${t} place ${i} at y 480`); if (i) assert.equal(pl[0] - places[i - 1][0], P.pitch, "the 48 pitch"); assert.ok(inside([pl[0], pl[1], ...P.plate], P.rect), `tier ${t} place ${i} inside the plates' box`); });
    assert.equal(places[0][0] + (places.at(-1)[0] + P.plate[0] - places[0][0]) / 2, axis, `tier ${t} centred on ${axis}`);
  }
});

test("frame.navigation.dock: the screens a Dock from the play page leaves where they are, each a screen the Station goes to, and the namer stays", () => {
  const d = frame.navigation.dock;
  assert.deepEqual(d.stays, ["home", "cargo", "create", "cross", "sitting"]);
  for (const id of d.stays) assert.ok(id in frame.strings.titles, id + " is a screen the Station goes to (it has a title)");
  assert.equal(d.namerStays, true); assert.match(d.rule, /Lift never navigates/);
});

// ---- fix 14: one focus form ----
const STATION = readdirSync(new URL("../specs/station/", import.meta.url)).filter((f) => /\.json$/.test(f)).map((f) => [f, rd("../specs/station/" + f)]);
const walk = (o, fn, trail = []) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { fn(k, v, o, [...trail, k]); walk(v, fn, [...trail, k]); } };
// every target the screens ring, with the shape its object makes of it (§8): the radius of a plate (6) or of a square panel (0), the pod's oval, the circles, the footprint and the tab
const SHAPES = {
  "home.json": { vivarium: { rect: 10 }, library: { rect: 10 }, pods: { rect: 8 }, incubator: { rect: 8 }, companion: { rect: 8 }, bay: { rect: 8 } },   // the bezels' radius 10 and the stations' 8: the ring (4 out) is 14 and 12
  "vivarium.json": { resident: "footprint", tile: { rect: 6 } },
  "habitat.json": { resident: "footprint", name: { rect: 0 }, species: { rect: 0, chip: 4 }, plate: { rect: 0 }, door: { rect: 6 }, portrait: { rect: 6 }, cross: { rect: 6 }, wild: { rect: 6 }, tile: { rect: 6 } },
  "namer.json": { key: { rect: 0 }, "mod.shift": { rect: 0 }, "mod.space": { rect: 0 }, "mod.page": { rect: 0 }, "act.done": { rect: 0 }, "act.suggest": { rect: 0 } },
  "pods.json": { place: { circle: { centre: [96, 88], r: 88 } }, pod: "oval", tab: "tab", kin: { circle: "box" }, hatch: { rect: 6 } },
  "create.json": { roll: { rect: 0 } }, "library.json": { frame: { rect: 0 } }, "bench.json": { plates: { rect: 0 }, switch: { rect: 6 }, slot: { rect: 6 } }, "sitting.json": { card: { rect: 0 } }, "panel.json": { card: { rect: 10 } } };
test("fix 14, the shape rule: every focus target has a shape of the five kinds and no `ring`; its rect radius is its object's; no spec but frame.json holds ring tokens or a ring colour; six (radius, ground) pairs at most", () => {
  const pairs = new Set(); let seen = 0;
  for (const [file, spec] of STATION) {
    walk(spec, (k, v, parent, trail) => {
      if (k === "targets" && v && typeof v === "object" && !Array.isArray(v)) for (const [name, t] of Object.entries(v)) if (t && typeof t === "object" && "group" in t) {
        seen++; assert.ok(isShape(t.shape), `${file} ${trail.join(".")}.${name}: a ring shape`); assert.ok(!("ring" in t), `${file} ${name}: no \`ring\` key`);
        const want = SHAPES[file]?.[name]; assert.ok(want !== undefined, `${file}: ${name} is not in the shape table`); assert.deepEqual(t.shape, want, `${file} ${name}: the shape of its object`);
        if (t.shape.rect !== undefined) pairs.add(`${t.shape.rect}/${t.ground ?? "default"}`);
      }
      if (k === "focus" && file !== "frame.json" && v && typeof v === "object") for (const bad of ["width", "outside", "radius", "onPaper"]) assert.ok(!(bad in v), `${file} ${trail.join(".")} holds a ring token (${bad}): the tokens are frame.json's`);
    });
    assert.ok(!("ring" in (spec.colours ?? {})) && !("ring" in (spec.colours?.rail ?? {})), `${file}: no colours.ring and no colours.rail.ring`);
  }
  assert.ok(seen >= 30, "the targets were found: " + seen); assert.ok(pairs.size <= 6, "the face holds eight ring sources: at most six (radius, ground) pairs, found " + [...pairs]);
  assert.ok(!("ring" in frame.colours) && !("feet" in frame.focus), "frame.json: no colours.ring, no focus.feet");
  // the holders (FR8): the placing spec names its face-ring roles; the width is frame.json's
  const names = new Set(palette.colours.map(([n]) => n)), hab = STATION.find(([f]) => f === "habitat.json")[1];
  for (const [who, sp] of [["frame.json", frame], ["habitat.json", hab]]) for (const k of ["faceRing", "faceRingAway"]) assert.ok(names.has(sp.colours[k]), `${who} colours.${k} is a palette name`);
  assert.ok(Number.isInteger(frame.regions.marks.face.ringWidth) && frame.regions.marks.face.ringWidth >= 1, "frame.json regions.marks.face.ringWidth is an integer of 1 or more");
});

// the 2 px floor (§14.4): a creature ring's bands that reach 3:1 against the ground must add up to 2 px in every light. The thresholds come from the palette, never typed.
const { keyFrom, coreTo } = floorThresholds(palette);
const SCENES = FLOOR_SCENES, masters = rd("../assets/masters/index.json").masters;
function floorProblems(weight) {
  const out = [];
  for (const [light, w] of Object.entries(weight)) {
    if (w !== "light") continue;
    for (const sc of SCENES) {
      const m = masters[sc.file(light)]; if (!m) { out.push(`${light}: no painting ${sc.file(light)}`); continue; }
      const { darkest, at } = zoneRange(readFileSync(new URL("../assets/masters/" + m.file, import.meta.url)), sc);
      if (darkest < keyFrom) out.push(`${light}: light creature weight under the 2 px floor, darkest ${darkest.toFixed(4)} at ${sc.name} (${at})`);
    }
  }
  return out;
}
test("fix 14, rule F1: the 2 px floor holds in every light: the thresholds overlap, the weight map names the lights, night is default, and a light weight needs every ring zone at or above the key's threshold", () => {
  assert.ok(keyFrom < coreTo, "the core and the key overlap, so every ground gets 2 px of line: " + keyFrom.toFixed(4) + " < " + coreTo.toFixed(4)); assert.ok(Math.abs(keyFrom - 0.1102) < 0.0005 && Math.abs(coreTo - 0.2362) < 0.0005, "the palette's thresholds are the spec's 0.1102 and 0.2362");
  const FP = frame.focus.ring.shapes.footprint, lights = frame.light.from.map(([, n]) => n);
  assert.deepEqual(Object.keys(FP.weight).sort(), [...lights].sort(), "the weight map has one value for each light"); for (const v of Object.values(FP.weight)) assert.ok(v === "default" || v === "light");
  assert.equal(FP.weight.night, "default", "night is pinned to default (CD ruling)"); assert.deepEqual(FP.floor, { px: 2, ratio: 3 });
  const bands = frame.focus.ring.bands.map((b) => b.w); assert.equal(bands[1], 2, "the default weight's core is 2 px"); assert.equal(bands[0] + bands[2], 2, "and its keys sum to 2 px: 2 px of line on any ground");
  assert.deepEqual(floorProblems(FP.weight), [], "the station's own map");
  const problems = floorProblems({ ...FP.weight, day: "light" }); assert.ok(problems.length > 0 && /day: light creature weight under the 2 px floor/.test(problems[0]), "the floor test can fail: day as light on today's paintings: " + problems);
});

test("fix 2: every region that names a device plate names the plate's own size as its rectangle (placed 1:1, never scaled), the plate is a painted-family picture, and the retired fill roles are gone", async () => {
  const { policyOf } = await import("../asset-policy.mjs");
  const names = ["home", "habitat", "vivarium", "namer"], specs = Object.fromEntries(names.map((n) => [n, rd(`../specs/station/${n}.json`)]));
  let seen = 0;
  for (const [n, s] of Object.entries(specs)) for (const [k, r] of Object.entries(s.regions)) {
    if (!r || typeof r !== "object" || typeof r.plate !== "string") continue;
    const m = /^plate-(?:device|well)-(\d+)x(\d+)$/.exec(r.plate); assert.ok(m, `${n}.${k}.plate is a kit id: ${r.plate}`);
    assert.deepEqual([+m[1], +m[2]], r.rect.slice(2), `${n}.${k}: the plate is its rectangle's size`); assert.equal(policyOf(r.plate, "master"), "painted", `${r.plate} is painted`); seen++;
  }
  assert.equal(seen, 10, "the regions of one mibi up close, the Vivarium and the namer that name a plate; Home names none (its column of five modules went): " + seen);
  for (const [n, k] of [["habitat", "strip"], ["habitat", "tile"], ["habitat", "door"], ["vivarium", "strip"], ["vivarium", "tile"], ["habitat", "card"]]) assert.ok(!specs[n].colours[k]?.fill && !specs[n].colours[k]?.recess && !specs[n].colours[k]?.free, `${n}.colours.${k} keeps no fill role`);
  for (const [n, s] of Object.entries(specs)) assert.ok(!s.colours.module?.fill && !s.colours.panel?.shadow && !s.colours.panel?.fill, `${n}: no module fill, panel fill or shadow`);
});

test("fix 2 F11: the rail sits in its well (frame.json regions.rail.well, painted, before the tabs, 48 tall at y 40) and the open tab's word and pip are ink on its cream plate; the 6 × 6 pips are not drawn but by Create", () => {
  const rail = rd("../specs/station/frame.json").regions.rail;
  assert.equal(rail.well.id, "plate-rail-well-{w}x48"); assert.equal(rail.well.y, 40); assert.equal(rail.well.h, 48); assert.equal(rail.well.layer, "painted"); assert.equal(rail.well.order, "before the tabs");
  assert.equal(rail.states.open.word, "ink"); assert.equal(rail.states.open.pip, "ink"); assert.match(rail.pip.draw, /none on Pods, the Incubator and Compare/);
});

// ---- fix 5, the Incubator (I1 to I3) ----
// ---- fix 5, the Probe (P1 to P3) ----
test("the Probe stands upright in three columns on the floor; each outer margin is 16 to 24 and one bottom line is 520; each module is the size of what it holds; each tier's strip is centred on the axis 472, holds its places with 8 px a side and clears the stage's tools (rework)", () => {
  const be = rd("../specs/station/bench.json"), R = be.regions, FLOORX = [66, 955], FLOORY = [77, 538], cr = R.cradle;
  assert.deepEqual(cr.rect, [40, 96, 288, 432]); assert.deepEqual(cr.ink, [44, 4, 232, 420]); assert.equal(cr.axis, 184);
  const inkL = cr.rect[0] + cr.ink[0], inkB = cr.rect[1] + cr.ink[1] + cr.ink[3];
  for (const [what, m] of [["left", inkL - FLOORX[0]], ["right", FLOORX[1] - (R.slot.rect[0] + R.slot.rect[2])], ["top", cr.rect[1] - FLOORY[0]], ["bottom", FLOORY[1] - inkB]]) assert.ok(m >= 16 && m <= 24, `the ${what} margin ${m} is 16 to 24`);
  assert.equal(inkB, 520, "the cradle's ink on the bottom line 520"); assert.equal(R.slot.rect[1] + R.slot.rect[3], 520, "the slot on 520"); assert.ok(Object.values(R.strip.byTier).every((s) => s[1] + s[3] === 520), "both strips on 520");
  assert.equal(R.switch.rect[1], 96, "the switch at y 96"); assert.equal(R.slot.rect[1] - (R.switch.rect[1] + R.switch.rect[3]), 48, "the modules 48 apart");
  assert.deepEqual([R.switch.rect, R.slot.rect], [[624, 96, 312, 128], [624, 272, 312, 248]]); assert.deepEqual([R.switch.lamp, R.slot.lamp], [[284, 12, 12, 12], [284, 12, 12, 12]]);
  // every module object ends at or before w - 16
  const S = R.switch, L = R.slot, ends = [[S, S.toggle.at[0] + S.toggle.size[0]], [S, S.meaning.dock.at[0] + S.meaning.dock.size[0]], [S, S.meaning.plates.at[0] + 3 * S.meaning.plates.pitch + S.meaning.plates.icon[0]], [S, S.lamp[0] + S.lamp[2]],
    [L, L.socket.at[0] + L.socket.size[0]], [L, L.part.at[0] + L.part.size[0]], [L, L.adds.pods.at[0] + (L.adds.pods.count - 1) * L.adds.pods.pitch + L.adds.pods.icon[0]], [L, L.adds.plates.at[0] + (L.adds.plates.count - 1) * L.adds.plates.pitch + L.adds.plates.icon[0]], [L, L.adds.reach.at[0] + L.adds.reach.size[0]], [L, L.adds.deep.at[0] + L.adds.deep.size[0]], [L, L.lamp[0] + L.lamp[2]]];
  for (const [m, end] of ends) assert.ok(end <= m.rect[2] - 16, `an object ends at ${end}, past ${m.rect[2] - 16}`);
  // the strips
  const TOOLS = { "tools zone": R.bench.tools }, P = R.plates;
  assert.equal(R.strip.axis, 472); assert.equal(P.axis, 472); assert.deepEqual(R.bench.keepClear, { cradle: [40, 96, 288, 432], plates: [364, 458, 216, 72], column: [620, 90, 320, 432] });
  assert.ok(apart(P.rect, R.bench.tools), "the plates' box clear of the tools zone"); assert.ok(apart(R.bench.tools, cr.rect), "the tools zone clear of the cradle"); assert.ok(apart(R.bench.tools, R.bench.keepClear.column), "the tools zone clear of the column's rings");
  for (const t of ["1", "2"]) {
    const st = R.strip.byTier[t], places = P.places[t], first = places[0], last = places.at(-1);
    assert.equal(st[0] + st[2] / 2, R.strip.axis, `strip t${t} centred on the axis 472`); assert.ok(inside(st, P.rect), `strip t${t} inside the plates' box`);
    assert.ok(places.every((p) => p[1] === 480), "the plates at y 480"); assert.equal((first[0] + last[0] + P.plate[0]) / 2, 472, `t${t} places centred on 472`);
    assert.deepEqual([first[0] - st[0], st[0] + st[2] - (last[0] + P.plate[0]), first[1] - st[1], st[1] + st[3] - (first[1] + P.plate[1])], [8, 8, 8, 8], `strip t${t}: 8 px of strip on every side of its plates`);
    for (let i = 1; i < places.length; i++) assert.equal(places[i][0] - places[i - 1][0], P.pitch, "pitch 48");
    for (const [n, r] of Object.entries(TOOLS)) assert.ok(apart(st, r), `strip t${t} is clear of the ${n}`);
    assert.equal(R.strip.slices[t], `bench-plate-strip-t${t}-${st[2]}x${st[3]}`); assert.ok(be.masters.list.includes(R.strip.slices[t]));
  }
  assert.deepEqual(R.plates.rect, [368, 464, 208, 64]); assert.equal(R.plates.rect[0] + R.plates.rect[2] / 2, 472); assert.equal(R.plates.rect[1] + R.plates.rect[3] / 2, 496, "the plates' centre y 496, so ▶ finds the slot (396) before the switch (160)");
  assert.deepEqual(Object.keys(be.composed), ["docked", "away"]); assert.deepEqual(be.focus.lift.match(/plates \[364, 458, 216, 72\], switch \[620, 90, 320, 136\], slot \[620, 266, 320, 256\]/)?.length, 1, "the rings from the spec");
});

test("fix 14: a moving set's contact shadow is as wide as its creature cell, at every stage (the shadow's footprint rides on the walk and close atlases in the cell's coordinates)", () => {
  let n = 0;
  for (const f of readdirSync(new URL("../specs/station/moving/", import.meta.url)).filter((f) => /^S\d{2}\.json$/.test(f))) {
    const set = rd("../specs/station/moving/" + f);
    for (const stage of ["juvenile", "adult"]) { const s = set[stage]; if (!s?.walk) continue; assert.equal(s.shadow.walk[0], s.walk.size[0], `${f} ${stage}: shadow.walk is the walk cell's width`); assert.equal(s.shadow.close[0], s.close.size[0], `${f} ${stage}: shadow.close is the close cell's width`); n++; }
  }
  assert.ok(n >= 3, "the sets were found: " + n);
});
