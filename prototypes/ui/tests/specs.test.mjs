// The spec files against the layout document's wireframes and the palette: the one home of the numbers must agree
// with the measured wireframe (station-layouts/*.svg) and name only palette colours.
import { pageSize } from "../layout.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";


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
  assert.ok(!("selected" in A.ring.masters)); assert.equal(A.ring.masters.closed, "ring-collection-closed-176x176"); assert.equal(A.ring.focus.radius, A.ring.outer + 4); assert.equal(A.glint.slice, "glint-star-12x12"); assert.deepEqual(A.ring.slice, [8, 24, 176, 176]); assert.equal(A.ring.slice[0] + 88, A.ring.centre[0]); assert.equal(A.ring.slice[1] + 88, A.ring.centre[1]); assert.ok(!("collectionRing" in pods.colours), "the build draws no arcs"); assert.ok(!("ringRead" in pods.colours), "one home for the ring's colours");
  assert.equal(pods.strings.openChapter, "Open {chapter}"); assert.equal(pods.strings.wayBack.chapter, "{name}");
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
  assert.deepEqual(B.ribbon.rect, B.origin.rect); assert.equal(B.bench.slice, "room-bench-stage-overview"); assert.equal(B.bench.pool[0], axis); assert.equal(pods.regions.chapter.bench.pool[0], pods.regions.chapter.pod.axis); assert.equal(B.kin.ring, "ring-kin-56x56");
});

test("the chapter page: the pod's room shrunk to the pod and the dish, the page taking the rest, no picture larger than the pod", () => {
  const C = pods.regions.chapter, pg = C.page, pod = C.pod.rect;
  assert.equal(C.pod.axis, 216); assert.ok(pg.rect[0] >= C.shelf.rect[0] + C.shelf.rect[2] + 16, "the page clear of the slab"); assert.equal(pg.rect[0] + pageSize(pg, 8)[0], 1008, "the widest page ends at the right margin"); assert.equal(pg.pane, null, "the open page: no pane"); assert.equal(pg.cell.fill, "ground"); assert.deepEqual(pg.cell.content.inside, [96, 120]); assert.deepEqual([pg.gap.x, pg.gap.y], [16, 24]);
  for (const g of Object.values(pg.grid)) assert.ok(g.picture[0] * g.picture[1] <= pod[2] * pod[3], "no page picture larger than the pod's box");
  for (const [k, g] of Object.entries(pg.grid)) { const n = Number(k.split("-").at(-1)), low = Math.max(...g.cells.map((c) => c[1] + c[3])); assert.ok(low <= pageSize(pg, n)[1], "the page holds its cells"); }
  // the page's one rule (the open page, no pane): columns are the count up to four, then half the count rounded up; width 8 + 144 per column; 232 for one row, 440 for two
  for (let n = 1; n <= 8; n++) { const cols = n <= 4 ? n : Math.ceil(n / 2); assert.deepEqual(pageSize(pg, n), [8 + 144 * cols, n <= 4 ? 232 : 440], `${n} traits`); }
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => pageSize(pg, n)[0]), [152, 296, 440, 584, 440, 440, 584, 584]); assert.deepEqual(pageSize(pg, 0), [152, 232], "a shut chapter is the one-trait size"); assert.deepEqual(pg.sealedFind, [32, 84, 112, 112]);
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
  const off = []; const rects = (o, path) => { for (const [k, v] of Object.entries(o)) { if (k === "rect" && Array.isArray(v)) { if (!path.endsWith(".bench") && v.some((n) => n % 8)) off.push(path); } else if (v && typeof v === "object" && !Array.isArray(v)) rects(v, path + "." + k); } };
  for (const st of ["collection", "overview", "chapter"]) rects(pods.regions[st], st);
  assert.deepEqual(off, []);
});

test("the focus graphs, one per state, name only groups and selectors the screen resolves", () => {
  const groups = { collection: ["place"], overview: ["pod", "rail", "kin", "hatch", "none"], chapter: ["rail", "none"], compare: ["rail", "none"] }, selectors = new Set(["rail.last", "kin.first", "rail.open"]);
  for (const [st, graph] of Object.entries(pods.focus)) {
    const g = new Set(groups[st]); assert.ok(g.size, "a state " + st);
    for (const [k, e] of Object.entries(graph)) { if (["fallback", "initial", "back"].includes(k)) continue; assert.ok(g.has(k), `${st}: group ${k}`); for (const [d, v] of Object.entries(e)) if (["up", "down", "left", "right"].includes(d) && v) assert.ok(g.has(v) || selectors.has(v), `${st}.${k}.${d} → ${v}`); }
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
  assert.equal(pods.targets.tab.group, "rail"); assert.equal(pods.targets.tab.ring, "tab"); assert.ok(pods.targets.tab.states.includes("compare"), "the tab ring on Compare");
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
  assert.deepEqual(slots[0], [712, 224, 40, 40]); assert.deepEqual([slots[5][0] + 40 - slots[0][0], 40], [280, 40]);   // 712,224 280×40 (art director, 2026-10-09 12:25: 8 px clear of the word)
  is(at(R.incubator, R.incubator.dome), "dome"); is(at(R.incubator, R.incubator.leaves.at), "leaves");
  const L = R.incubator.leaves; assert.equal(L.perRow * L.pitch, 192); assert.equal((L.rows - 1) * L.rowPitch + L.leaf[1], 40, "three rows on the row pitch fill the 40 px box"); assert.equal(L.component, "leaves"); assert.equal(L.form, "grid"); assert.ok(L.max <= L.perRow * L.rows && L.max >= 20 + 18, "the grid holds the longest bud today");
  is(at(R.probe, R.probe.cradle), "probe cradle"); is(at(R.probe, R.probe.slot), "sitting slot");
  const S = R.probe.shields; for (let i = 0; i < S.count; i++) is([R.probe.rect[0] + S.at[0] + S.pitch * i, R.probe.rect[1] + S.at[1], ...S.size], "Shield plate " + i);
  assert.deepEqual(S.perTier, { 1: 3, 2: 4 }); assert.equal(S.count, 4); assert.ok(R.probe.rect[0] + S.at[0] + S.pitch * 3 + S.size[0] + 16 <= R.probe.rect[0] + R.probe.slot[0], "four plates clear the sitting slot by 16");
  const Z = R.bed.sleeper; for (const k of ["adult", "juvenile"]) { is(Z[k], "sleeping " + k); assert.deepEqual(Z[k].slice(2), R.resident[k]); assert.equal(Z[k][0] + Z[k][2] / 2, Z.foot[0]); assert.equal(Z[k][1] + Z[k][3], Z.foot[1]); }
  assert.deepEqual(R.resident.adult, [144, 152]); assert.deepEqual(R.resident.juvenile, [104, 112]);
  assert.deepEqual(R.ribbon.rect, [40, 72, 608, 40]); assert.deepEqual(R.report.rect.slice(0, 3), [64, 120, 560]);
  const names = new Set(palette.colours.map(([n]) => n)), bad = []; (function walk(o) { for (const v of Object.values(o)) { if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } })(home.colours);
  assert.deepEqual(bad, []);
});

test("the Station frame's language: the zones of the top bar and the bottom line, their rules and marks, in the frame wireframe", () => {
  const F = frame.regions, fsvg = readFileSync(new URL("../../../design/style-guide/station-layouts/00-frame.svg", import.meta.url), "utf8"), fb = new Set([...fsvg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
  for (const k of ["title", "materials", "companion", "time", "action", "subject", "need", "back"]) assert.ok(fb.has(F[k].rect.join(",")), `${k} ${F[k].rect} is not in the frame wireframe`);
  const bot = ["action", "subject", "need", "back"].map((k) => F[k].rect); assert.deepEqual(F.separators.x, [404, 620]);
  assert.ok(bot[0][0] + bot[0][2] < 404 && 404 < bot[1][0] && bot[1][0] + bot[1][2] < 620 && 620 < bot[2][0], "rules between action, context and notice");
  assert.equal(F.need.right + F.back.gapBefore, F.back.rect[0], "the notice 24 px before the way back"); assert.equal(F.back.right, 1008); assert.equal(F.subject.rect[0] + F.subject.rect[2] / 2, 512);
  for (const id of ["frame-room-home-24", "frame-room-research-24", "frame-room-library-24", "frame-room-habitat-24", "frame-companion-solid-16x24", "frame-companion-outline-16x24", "frame-lamp-8-mint", "frame-lamp-8-stone", "frame-lamp-12-amber", "face-{mibi}-24-away", "face-24-empty", "frame-sun-16"]) assert.ok(JSON.stringify(F.marks).includes(id), "slice " + id);
  assert.equal(F.marks.scale, "never");
  const top = ["title", "materials", "companion", "time"].map((k) => F[k].rect);
  for (let i = 1; i < top.length; i++) assert.ok(top[i - 1][0] + top[i - 1][2] + 16 <= top[i][0], "top bar zones apart, left to right");
  assert.deepEqual(F.topRules.x, [256, 888]); assert.ok(F.title.rect[0] + F.title.rect[2] < 256 && 256 < F.materials.rect[0] && F.materials.rect[0] + F.materials.rect[2] < F.companion.rect[0] && F.companion.rect[0] + F.companion.rect[2] < 888 && 888 < F.time.rect[0], "the rules between the groups");
  assert.equal(F.time.rect[0] + F.time.rect[2], 1008); assert.equal(F.materials.rect[0] + F.materials.rect[2] / 2, 512);
  assert.deepEqual([F.title.px, F.title.weight, F.title.words, F.companion.words], [20, 500, 1, 0]); assert.deepEqual(F.title.mark, [16, 8, 24, 24]);
  assert.equal(frame.colours.verb, "orange"); assert.equal(frame.colours.capConfirm, "orange"); assert.equal(frame.colours.needLamp, "amber");
  assert.deepEqual(frame.strings.withdrawn, ["dot", "backArrow"], "no dot-joined parts in the frame: the ← is a key cap, the parts are zones");
  for (const k of Object.keys(F.title.marks)) assert.ok(frame.strings.titles[k], "a title slot for " + k);
});

// The wireframe's measured boxes, as the Home test reads them: each <rect> back to [x, y, w, h].
const boxesOf = (file) => new Set([...readFileSync(new URL("../../../design/style-guide/station-layouts/" + file, import.meta.url), "utf8").matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map((m) => [Math.round(m[1] - 0.5), Math.round(m[2] - 0.5), Math.round(+m[3] + 1), Math.round(+m[4] + 1)].join(",")));
const paletteBad = (colours) => { const names = new Set(palette.colours.map(([n]) => n)), bad = []; (function walk(o) { for (const [k, v] of Object.entries(o)) { if (k === "note") continue; if (typeof v === "string") { if (!names.has(v)) bad.push(v); } else if (v && typeof v === "object") walk(v); } })(colours); return bad; };
// the closed vocabulary and the closed list of derived rules (station-layouts.md, The vocabulary (closed); leaves and leafArc: architect, 2026-10-09 13:24)
const WORDS = new Set(["frame", "topBar", "bottomLine", "messagePlate", "focusRing", "panel", "stampLabel", "chapterRail", "chapterPage", "list", "specimen", "livingWindow", "ribbon", "text", "leaves"]);
const LAYOUT_RULES = new Set(["railCompaction", "slantTabs", "pageGrid", "platePosition", "listPitch", "splicePlan", "guideColumns", "pipGroups", "leafArc"]);
const lintRegions = (spec) => { for (const [id, r] of Object.entries(spec.regions)) { assert.ok(r.component || r.build, `${spec.screen}.${id} names its word or composition`); if (r.component) assert.ok(WORDS.has(r.component), `${spec.screen}.${id}: ${r.component} is a word of the closed vocabulary`); for (const k of r.layout ?? []) assert.ok(LAYOUT_RULES.has(k), `${spec.screen}.${id}: ${k} is a closed rule`); if (id !== "bench" && !r.offGrid) assert.ok(r.rect.every((n) => n % 8 === 0), `${spec.screen}.${id} on the 8 px grid`); } };   // the bench is the frame's stage (40, 522)
const STEP_KEYS = ["up", "down", "left", "right"];

test("the Create spec file agrees with the Create wireframes, region by region, and names a word for every region", () => {
  const cr = rd("../specs/station/create.json"), R = cr.regions, B = boxesOf("03-create.svg"), G = boxesOf("03c-create-grow.svg"), N = boxesOf("03e-create-nothing-read.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["rail", "roll", "traitLine", "chamber", "founder", "pod", "cradle", "origin", "dome", "bud", "leaves", "stamp", "code"]) is(R[k].rect, k);
  for (const k of ["rail", "traitLine", "chamber", "founder", "pod", "dome", "leaves", "stamp", "code"]) is(R[k].rect, k + " (nothing read)", N);
  assert.ok(!N.has(R.roll.rect.join(",")), "no roll when nothing is read"); assert.deepEqual(R.roll.inStates, ["shape", "grow"]);
  is(R.travel.rect, "travel", G); is(R.travel.to, "travel's end", G);
  lintRegions(cr); assert.deepEqual(cr.states, ["nothingRead", "shape", "grow"]); assert.deepEqual(cr.rules.needed, []);
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
  for (const k of ["dome", "leaves", "stamp", "code"]) assert.equal(R[k].rect[0] + R[k].rect[2] / 2, 864, k + " on the right column's axis");
  assert.deepEqual([R.pod.axis, R.pod.feet, R.cradle.rect[1], R.cradle.rect[1] + R.cradle.rect[3]], [160, 408, 408 - 64, 408 + 32], "the dish as on Pods' overview");
  assert.deepEqual(pods.classes.pod.large, R.pod.rect.slice(2), "the pod's region is the largest class");
  assert.deepEqual(R.dome.rect, [776, 104, 176, 224]); assert.equal(R.dome.floor, R.bud.foot[1]); assert.ok(R.dome.rect[1] + R.dome.rect[3] + 8 <= R.leaves.rect[1], "the leaves 8 px under the dome");
  assert.ok(R.stamp.rect[0] - (R.founder.rect[0] + R.founder.rect[2]) >= 96, "the stamp 96 px or more from the focal box"); assert.deepEqual(R.stamp.rect.slice(2), [120, 120]);
  assert.equal(R.leaves.component, "leaves"); assert.equal(R.leaves.form, "grid"); assert.ok(!("at" in R.leaves), "Create's grid takes its region's origin");
  assert.ok(R.leaves.perRow * R.leaves.rows >= 20 + 18 && R.leaves.max === R.leaves.perRow * R.leaves.rows, "the leaves hold the longest bud today (20 minutes + 18 shaped traits)"); assert.equal(R.leaves.perRow * R.leaves.pitch, R.leaves.rect[2]); assert.ok((R.leaves.rows - 1) * R.leaves.rowPitch + R.leaves.leaf[1] <= R.leaves.rect[3]);
  assert.deepEqual([R.code.lineTop, R.code.baseline, R.code.rule.y], [525, 541, 549]); assert.equal(R.code.rule.y - R.code.baseline, 8, "8 px from the code's baseline to its rule"); assert.ok(R.code.rect[2] >= 171, "the widest code fits"); assert.ok(R.stamp.rect[1] + R.stamp.rect[3] <= R.code.rect[1]);
  assert.equal(cr.colours.traitLine.tagWord, "bone", "changed is not a need: never amber"); assert.equal(cr.colours.rail.changed, "bone");
  assert.deepEqual(Object.keys(cr.focus.shape.graph), ["roll"]); const st = cr.focus.shape.graph.roll.stepper;
  assert.ok(st.length && new Set(st).size === st.length && st.every((k) => STEP_KEYS.includes(k)) && !st.some((k) => k in cr.focus.shape.graph.roll), "the stepper's keys: non-empty, distinct, known, no edge on the same key");
  assert.deepEqual(cr.focus.nothingRead.targets, {}, "nothing read: no target"); assert.ok(STEP_KEYS.every((k) => cr.focus.nothingRead.graph.room[k] === "none"), "nothing read: the arrows do nothing");
  assert.deepEqual([cr.events.roll.kind, cr.events.roll.target, cr.events.roll.hold, cr.events.roll.ms, cr.events.roll.levels], ["dither", "founder", false, 200, 16]);
  assert.equal(cr.events.grow.holdMs, cr.events.grow.steps.at(-1).at + cr.events.grow.steps.at(-1).ms);
  assert.equal(R.bench.slice, "room-bench-stage-create"); assert.equal(R.bench.until, "room-bench-stage-collection");
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

test("the Incubator spec file agrees with the Incubator wireframes, region by region; the leaf arcs clear the rail and the glass", () => {
  const inc = incSpec(), R = inc.regions, B = boxesOf("04-incubator-growing.svg"), Y = boxesOf("05-incubator-ready.svg"), H = boxesOf("05b-incubator-hatch.svg"), E = boxesOf("05c-incubator-empty.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["rail", "leaves", "dome", "nest", "bud", "base", "plaque", "stamp", "code"]) is(R[k].rect, k);
  for (const k of ["dome", "nest", "base", "plaque"]) is(R[k].rect, k + " (empty)", E);
  is(R.bud.shape.rect, "the shape in the ready bud", Y); is(R.base.lamp.rect, "the waiting lamp", Y); is(R.ribbon.rect, "ribbon", H); is(R.juvenile.rect, "juvenile", H);
  lintRegions(inc); assert.deepEqual(inc.states, ["empty", "growing", "ready", "hatch"]); assert.deepEqual(inc.rules.needed, []); assert.ok(inc.rules.used.includes("leafArc"));
  assert.equal(R.leaves.component, "leaves"); assert.equal(R.leaves.form, "arc"); assert.deepEqual(R.leaves.layout, ["leafArc"]); assert.deepEqual(R.leaves.leaf, [16, 20]); assert.equal(R.leaves.max, 2 * R.leaves.leafArc.perArc);
  assert.deepEqual(R.rail.rect, [512 - run(6) / 2, frame.regions.rail.y, 832, frame.regions.rail.h]);
  assert.deepEqual([R.bud.rect[0] + R.bud.rect[2] / 2, R.bud.rect[1] + R.bud.rect[3] / 2], R.leaves.leafArc.centre, "the arcs centred on the bud");
  assert.ok(inside(R.bud.shape.rect, R.bud.rect)); assert.ok(R.bud.shape.ink.every((n, i) => n <= R.bud.shape.rect[2 + i])); assert.ok(inside(R.bud.rect, R.dome.rect)); assert.ok(inside(R.nest.rect, R.dome.rect)); assert.ok(inside(R.plaque.rect, R.base.rect)); assert.ok(inside(R.base.lamp.rect, R.base.rect)); assert.ok(inside(R.base.footLight.rect, R.base.rect));
  assert.ok(R.base.rect[1] + R.base.rect[3] <= 552, "the base inside the stage's content");
  assert.ok(R.stamp.rect[0] - (R.dome.rect[0] + R.dome.rect[2]) >= 96, "the stamp 96 px or more from the dome"); assert.deepEqual(R.stamp.rect.slice(2), [120, 120]);
  assert.equal(R.code.rect[0] + R.code.rect[2] / 2, R.stamp.rect[0] + R.stamp.rect[2] / 2); assert.ok(R.code.rect[2] >= 171, "the widest code fits");
  assert.deepEqual(R.juvenile.rect.slice(2), [304, 312], "the juvenile at 304×312, the box the meet keeps"); assert.equal(R.juvenile.rect[1] + R.juvenile.rect[3], R.juvenile.feet);
  assert.ok(R.ribbon.rect[1] + R.ribbon.rect[3] + 8 <= R.juvenile.rect[1], "the ribbon clear of the juvenile");
  // every slot of both tables: inside its region, 8 px or more under the rail, 30 px or more off the bell jar (a half circle of radius 152 on 512, 354 over a body to y 472)
  const L = R.leaves.leafArc, [lw, lh] = R.leaves.leaf, glass = (x, y) => (y <= 354 ? Math.hypot(x - 512, y - 354) - 152 : Math.hypot(Math.max(360 - x, 0, x - 664), Math.max(0, y - 472)));
  assert.equal(R.dome.rect[1] + R.dome.inkTop, 354 - 152, "the glass's top");
  for (const k of ["inner", "outer"]) for (const [i, [x, y]] of L[k].entries()) {
    assert.equal(x + lw / 2 - 512, 512 - (L[k][38 - i][0] + lw / 2), `${k} slot ${i} mirrors slot ${38 - i}`); assert.equal(y, L[k][38 - i][1]);
    assert.ok(inside([x, y, lw, lh], R.leaves.rect), `${k} slot ${i} inside the leaves' region`); assert.ok(y >= frame.regions.rail.y + frame.regions.rail.h + 8, `${k} slot ${i}: 8 px under the rail`);
    for (const [px, py] of [[x, y], [x + lw, y], [x, y + lh], [x + lw, y + lh]]) assert.ok(glass(px, py) >= 30, `${k} slot ${i} 30 px or more off the glass`);
  }
  assert.deepEqual(inc.focus.targets, {}, "no ring on the Incubator"); assert.equal(inc.focus.roomKey, "room");
  assert.equal(inc.events.hatch.holdMs, inc.events.hatch.steps.at(-1).at + inc.events.hatch.steps.at(-1).ms); assert.equal(inc.events.hatch.ms, 2600);
  assert.equal(inc.handoff.to, "habitat"); assert.equal(frame.navigation.jumps.find((j) => j.from === "incubator" && j.action === "Open").to, "habitat");
  const choose = frame.navigation.jumps.find((j) => j.from === "incubator" && j.state === "empty"); assert.deepEqual([choose.action, choose.to, choose.view], [inc.strings.choose, "pods", "collection"]);
  assert.equal(inc.colours.plaque.empty, "fog", "the empty plaque invites, never mist"); assert.notEqual(inc.colours.bud.shape, "amber"); assert.equal(inc.colours.leaves.empty, "metal");
  assert.deepEqual(R.nestFront.rect, R.nest.rect); const DO = inc.drawOrder; assert.ok(DO.indexOf("bud front") < DO.indexOf("nestFront") && DO.indexOf("nestFront") < DO.indexOf("domeFront"), "the nest's front rim over the bud, under the glass's front (art director, 2026-10-09 13:47)");
  assert.equal(R.bench.slice, "room-bench-stage-incubator"); assert.equal(R.bench.until, "room-bench-stage-collection");
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

test("the Habitat spec file agrees with the Habitat wireframes, region by region; its focus graph plays its vectors", () => {
  const hab = rd("../specs/station/habitat.json"), R = hab.regions, B = boxesOf("06-habitat.svg"), M = boxesOf("06b-habitat-meet.svg"), A = boxesOf("06f-habitat-away.svg"), E = boxesOf("06e-habitat-empty.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["bezel", "glass", "resident", "nameTag", "card", "speciesLine", "story", "code", "stamp", "door", "bond", "portrait", "cross", "wild", "strip"]) is(R[k].rect, k);
  for (const k of ["bezel", "glass", "strip"]) is(R[k].rect, k + " (empty)", E);
  is(R.meetRibbon.rect, "meet ribbon", M); is(R.resident.lamp.rect, "waiting lamp", M);
  lintRegions(hab); assert.deepEqual(hab.states, ["rest", "meet", "empty"]); assert.deepEqual(hab.rules.needed, []); assert.deepEqual(hab.rules.used, ["listPitch"]);
  assert.deepEqual([R.bezel.rect[0] + R.bezel.inset, R.bezel.rect[1] + R.bezel.inset, R.bezel.rect[2] - 2 * R.bezel.inset, R.bezel.rect[3] - 2 * R.bezel.inset], R.glass.rect, "the 8 px bezel");
  // the mibi: the juvenile's box from the Incubator's hatch, inside the glass, its feet on the ground band; the tag 8 px under the ring's ellipse and 8 px inside the glass
  const res = R.resident.rect, glass = R.glass.rect;
  assert.deepEqual(res.slice(2), incSpec().regions.juvenile.rect.slice(2), "the meet keeps the hatch's 304×312");
  assert.ok(inside(res, glass)); assert.equal(res[0] + res[2] / 2, R.resident.axis); assert.equal(res[1] + res[3], R.resident.feet);
  assert.ok(R.resident.feet > R.glass.ground[1] && R.resident.feet < R.glass.ground[1] + R.glass.ground[3], "the feet on the ground band");
  assert.ok(R.nameTag.rect[1] >= R.resident.feet + 12 + 8, "the tag 8 px or more under the feet ring"); assert.ok(R.nameTag.rect[1] + R.nameTag.rect[3] + 8 <= glass[1] + glass[3], "the tag 8 px inside the glass");
  assert.ok(inside(R.nameTag.rect, R.meetRibbon.rect), "the ribbon in the tag's place"); assert.deepEqual([R.nameTag.px, R.nameTag.weight, R.nameTag.h], [frame.type.title, frame.type.weight[20], 32], "the tag at 20 px medium, 32 tall");
  assert.equal(R.nameTag.max, 200 + 2 * R.nameTag.pad, "the tag holds ten of the widest letter at 20 px (200) and its pads"); assert.equal(R.nameTag.rect[2], R.nameTag.max); assert.equal(R.nameTag.rect[0] + R.nameTag.rect[2] / 2, R.resident.axis); assert.ok(R.nameTag.min % R.nameTag.round === 0 && R.nameTag.max % R.nameTag.round === 0);
  assert.ok(hab.overlays.namer.panel[0] >= R.bezel.rect[0] + R.bezel.rect[2] + 8 && hab.overlays.namer.panel[0] === R.card.rect[0], "the living window left of the namer's panel"); assert.ok(inside(R.card.rect, hab.overlays.namer.panel) && ["door", "bond", "portrait", "cross", "wild"].every((k) => inside(R[k].rect, hab.overlays.namer.panel)), "the namer covers the card and the modules");
  assert.ok(inside(R.resident.lamp.rect, res) && R.resident.lamp.rect[0] + 12 === res[0] + res[2] && R.resident.lamp.rect[1] === res[1], "the lamp at the box's top right");
  const ew = res[2] + frame.focus.feet.widen; assert.equal(hab.focus.targets.resident.ring, "feet"); assert.deepEqual(hab.focus.targets.resident.ellipse, [res[0] + ((res[2] + 1) >> 1) - ((ew + 1) >> 1), R.resident.feet - 12, ew, frame.focus.feet.height], "the feet ring, as frame.json focus.ring.forms.feet places it");
  for (const spec of [hab]) for (const [k, t] of Object.entries(spec.focus.targets)) assert.ok(["round", "feet", "tab"].includes(t.ring) && !("shape" in t), k + ": a ring form of frame.json, no other key");
  // the stamp a detail: 120, far from the mibi; the card's lines and plates clear of it; modules 8 px apart, their objects 8 px under the word's baseline
  assert.deepEqual(R.stamp.rect.slice(2), [120, 120]); assert.ok(R.stamp.rect[0] - (res[0] + res[2]) >= 96); assert.ok(inside(R.stamp.rect, R.card.rect));
  for (const k of ["speciesLine", "story", "code", "plates"]) { assert.ok(inside(R[k].rect, R.card.rect), k + " inside the card"); assert.ok(apart(R[k].rect, R.stamp.rect), k + " clear of the stamp"); }
  const P = R.plates.places, plates = Array.from({ length: P.max }, (_, i) => [P.first[0] + P.pitch[0] * i, P.first[1], P.first[2], P.first[3]]);
  assert.ok(inside(plates.at(-1), R.plates.rect), "eight plates fit"); for (const p of plates.slice(0, 4)) is(p, "plate");
  const mods = ["door", "bond", "portrait", "cross", "wild"].map((k) => R[k]);
  for (const [i, m] of mods.entries()) {
    assert.ok(m.rect[0] >= 592 && m.rect[0] + m.rect[2] <= 1008 && m.rect[1] >= R.card.rect[1] + R.card.rect[3] + 16 && m.rect[1] + m.rect[3] <= 552, "the module in the column");
    for (const n of mods.slice(i + 1)) assert.ok(gapOk(m.rect, n.rect), "modules 8 px apart");
    for (const o of [m.glyph, m.mibi, m.heart, m.frame, m.gate, ...(m.faces ? [m.faces.oneRow, ...m.faces.twoRows].map((a) => ({ at: a, size: m.faces.size })) : [])].filter(Boolean)) { assert.ok(o.at[1] >= m.word[1] + 16 + 8, "8 px from the word's baseline to the object"); assert.ok(o.at[1] + o.size[1] <= m.rect[3], "the object inside its module"); }
  }
  const FC = R.cross.faces; assert.ok(FC.oneRow[0] + FC.pitch * (FC.perRow - 1) + FC.size[0] <= R.cross.rect[2] - 16, "seven faces fit a row"); assert.ok(2 * FC.perRow >= FC.max && FC.max === 11, "two rows hold every partner a twelve-bay vivarium can give"); assert.ok(FC.twoRows[1][1] - FC.twoRows[0][1] >= FC.size[1], "the rows do not overlap");
  // the strip: one tile a bay, full to six and compact to twelve, inside the strip; the tiles in the wireframes
  const T = R.tiles.forms, ups = Object.values(T).map((f) => f.upTo); assert.equal(new Set(ups).size, ups.length, "one form an upTo"); assert.equal(Math.max(...ups), 12, "at most twelve bays"); assert.ok(Object.values(T).every((f) => f.grid[0] * f.grid[1] >= f.upTo && Object.keys(f).every((k) => ["upTo", "first", "pitch", "grid"].includes(k))), "a form is { upTo, first, pitch, grid }, its grid as long as its upTo");
  for (const [k, th] of Object.entries(R.tiles.tile.thumb)) assert.ok(inside(th, [0, 0, T[k].first[2], T[k].first[3]]), k + ": the thumbnail inside its tile"); assert.equal(R.tiles.tile.name, null, "thumbnails only");
  const tiles = (f, n) => Array.from({ length: n }, (_, i) => [f.first[0] + f.pitch[0] * i, f.first[1], f.first[2], f.first[3]]);
  for (const f of [T.full, T.compact]) { const ts = tiles(f, f.upTo); assert.ok(ts.every((x) => inside(x, R.tiles.rect) && inside(x, R.strip.rect)), "tiles inside the strip"); assert.ok(ts.every((x, i) => i === 0 || x[0] - (ts[i - 1][0] + ts[i - 1][2]) === 8), "8 px between tiles"); }
  for (const x of tiles(T.full, 6)) is(x, "full tile"); for (const x of tiles(T.compact, 10)) is(x, "compact tile", A);
  assert.ok(R.bezel.rect[1] + R.bezel.rect[3] + 16 <= R.strip.rect[1], "the strip 16 px under the window");
  // the focus graph: well formed, and its vectors played on the rest layout with four chapters and six mibis
  const groups = new Set(Object.keys(hab.focus.graph));
  for (const [g, e] of Object.entries(hab.focus.graph)) { assert.ok(!(e.order && e.axis), g + ": order or axis, not both"); for (const k of STEP_KEYS) if (k in e) assert.ok(edgeOk(e[k], groups), `${g}.${k} is an edge form of §2.6.1`); }
  const TG = { resident: { group: "resident", box: res }, name: { group: "name", box: R.nameTag.rect }, species: { group: "species", box: R.speciesLine.rect } };
  plates.slice(0, 4).forEach((p, i) => (TG["plate." + i] = { group: "plate", box: p }));
  for (const k of ["door", "bond", "portrait", "cross", "wild"]) TG[k] = { group: hab.focus.targets[k].group, box: R[k].rect };
  tiles(T.full, 6).forEach((x, i) => (TG["tile." + (i + 1)] = { group: "tile", box: x }));
  const resolve = { "tile.shown": "tile.3" }, concrete = (v) => !!v && (!!TG[v] || v === "tile.shown");
  let played = 0;
  for (const v of hab.focus.vectors) { if (v.state || v.intent || !concrete(v.from) || !concrete(v.to)) continue; const from = resolve[v.from] ?? v.from, to = resolve[v.to] ?? v.to; assert.equal(focusMove(hab.focus.graph, TG, from, v.key, resolve), to, `${v.from} ${v.key} → ${v.to}`); played++; }
  assert.ok(played >= 24, "the vectors are played: " + played);
  const MEET = Object.fromEntries(Object.entries(TG).filter(([k]) => k !== "name")); assert.equal(focusMove(hab.focus.graph, MEET, "resident", "right", resolve), "species", "in the meet (no tag target) ▶ goes on to the species"); assert.equal(focusMove(hab.focus.graph, MEET, "cross", "left", resolve), "resident");
  assert.equal(focusMove(hab.focus.graph, TG, "tile.1", "left", resolve), "tile.1", "the strip's first tile stops"); assert.equal(focusMove(hab.focus.graph, TG, "tile.5", "up", resolve), "resident");
  // nothing on Habitat is amber; no banned word in its strings; the guide's door is frame.json's jump
  assert.ok(!JSON.stringify(hab.colours).includes("amber"), "no amber on Habitat"); assert.ok(!/outing/.test(JSON.stringify(hab.strings)), "expedition, never outing");
  assert.ok(frame.navigation.jumps.some((j) => j.from === "habitat" && j.to === "book" && j.action === hab.strings.guide), "the guide's door");
  assert.deepEqual(paletteBad(hab.colours), []);
});

test("the Probe bench spec file agrees with the bench wireframes, region by region; its focus graph plays its vectors", () => {
  const be = rd("../specs/station/bench.json"), R = be.regions, B = boxesOf("11-bench.svg"), W = boxesOf("11d-bench-tier2.svg"), Y = boxesOf("11c-bench-away.svg");
  const is = (r, what, set = B) => assert.ok(set.has(r.join(",")), `${what} ${r.join(",")} is not in the wireframe`);
  for (const k of ["cradle", "plates", "switch", "slot"]) is(R[k].rect, k);
  for (const k of ["cradle", "switch", "slot"]) is(R[k].rect, k + " (away)", Y);
  assert.ok(!Y.has(R.plates.rect.join(",")), "no plates while away");
  lintRegions(be); assert.deepEqual(be.states, ["docked", "away"]); assert.deepEqual(be.rules.needed, []); assert.ok(!("component" in R.plates) && R.plates.build === "shieldPlates", "the plates a build alone");
  assert.equal((R.cradle.rect[0] + R.slot.rect[0] + R.slot.rect[2]) / 2, 512, "the group centred on 512"); assert.equal(R.switch.rect[0], R.slot.rect[0]);
  assert.equal(frame.regions.title.marks.bench, "Research"); assert.equal(frame.strings.titles.bench, be.strings.title);
  // the plates: the tier's count (as Home's Probe module), centred on the cradle's axis, inside their region, in the wireframes
  const axis = R.cradle.axis, [pw, ph] = R.plates.plate, perTier = rd("../specs/station/home.json").regions.probe.shields.perTier;
  assert.equal(R.cradle.rect[0] + R.cradle.rect[2] / 2, axis); assert.equal(R.plates.rect[0] + R.plates.rect[2] / 2, axis);
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
  assert.ok(gapOk(R.switch.rect, R.slot.rect, 16), "the modules 16 px apart"); assert.ok(R.cradle.rect[0] + R.cradle.rect[2] + 16 <= R.switch.rect[0]); assert.ok(R.cradle.rect[1] + R.cradle.rect[3] + 16 <= R.plates.rect[1]);
  const K = R.switch.toggle.knob, TGL = R.switch.toggle, MN = R.switch.meaning; assert.ok(K.x.off === TGL.at[0] && K.x.on + K.size[0] === TGL.at[0] + TGL.size[0] && K.y === TGL.at[1], "the knob inside its track, x 16 to 56");
  assert.ok(MN.dock.at[0] >= TGL.at[0] + TGL.size[0] + 16 && MN.plates.at[0] >= MN.dock.at[0] + MN.dock.size[0] + 16 && MN.plates.at[0] + MN.plates.pitch * 3 + MN.plates.icon[0] <= R.switch.rect[2] - 16 && MN.plates.at[1] + MN.plates.icon[1] <= R.switch.rect[3] - 16, "the switch's meaning picture inside the module");
  const AD = R.slot.adds; assert.ok(AD.deep.at[0] >= AD.reach.at[0] + AD.reach.size[0] + 16 && AD.deep.at[0] + AD.deep.size[0] <= R.slot.rect[2] - 16, "the deep beside the reach");
  const S = R.slot; assert.ok(inside([S.part.at[0], S.part.at[1], ...S.part.size], [S.socket.at[0], S.socket.at[1], ...S.socket.size])); assert.equal(S.part.at[1] - S.part.armedAt[1], 8, "the armed part lifted 8 px");
  // the focus graph and its vectors
  const groups = new Set(Object.keys(be.focus.graph));
  for (const [g, e] of Object.entries(be.focus.graph)) { assert.ok(!(e.order && e.axis)); for (const k of STEP_KEYS) if (k in e) assert.ok(edgeOk(e[k], groups), `${g}.${k}`); }
  for (const [k, t] of Object.entries(be.focus.targets)) assert.ok(t.ring === "round" && !("shape" in t), k + ": the round ring");
  const TG = { plates: { group: "plates", box: R.plates.rect }, switch: { group: "module", box: R.switch.rect }, slot: { group: "module", box: R.slot.rect } }, AWAY = { switch: TG.switch, slot: TG.slot };
  for (const v of be.focus.vectors) { if (v.intent) continue; assert.equal(focusMove(be.focus.graph, v.state === "away" ? AWAY : TG, v.from, v.key), v.to, `${v.from} ${v.key} → ${v.to}`); }
  assert.ok(!JSON.stringify(be.colours).includes("amber"), "no amber on the bench"); assert.equal(be.events.install.holdMs, Math.max(...be.events.install.steps.map((s) => s.at + (s.ms ?? 0))));
  assert.equal(R.bench.until, "room-bench-stage-collection"); assert.deepEqual(paletteBad(be.colours), []);
});
