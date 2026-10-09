#!/usr/bin/env node
// The Station's layer checks (technical-architecture.md §5.6), run after the journey on what it recorded at every
// screenshot point (STATION_CHECKS, default the system temp dir). Numbers are printed in the job log; any failure exits 1.
//   1. palette: the art layer has exactly 0 off-palette pixels at every point (the type layer is anti-aliased by decision;
//      its glyphs are tinted in palette colours, so its colour is checked too).
//   2. type: the type layer's run log: every string is Inter at 16, 20 or 28 px (the weight of that size) from a bundled
//      atlas whose files match the index's hashes; every text node of a screen on the layer appears in the log; no
//      unbaked character; no digits in the text of a region marked noDigits.
//   3. regions: every drawn region's box in the scene equals its rectangle in the screen's spec file; the stamp label is
//      120×120 with the stamp at most 104 px inside it; the rail's tab count equals the frame's chapter count.
//   4. size: the frame is 1024×600.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadTypeNode } from "../../ui/type-node.mjs";
import { SIZES } from "../../ui/type.mjs";
import { slantTabs, pageGrid, pageHeight, sealedFindRect } from "../../ui/layout.mjs";
import { placeRect, kinRect } from "../../ui/components/list.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), ui = path.resolve(here, "../../ui");
const file = process.argv[2] || process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
if (!existsSync(file)) { console.error("no journey record at " + file); process.exit(2); }
const rec = JSON.parse(readFileSync(file, "utf8")), pods = JSON.parse(readFileSync(path.join(ui, "specs/station/pods.json"), "utf8")), frame = JSON.parse(readFileSync(path.join(ui, "specs/station/frame.json"), "utf8"));
const type = loadTypeNode(), index = JSON.parse(readFileSync(path.join(ui, "fonts/atlas/index.json"), "utf8"));
const fails = [], fail = (m) => { fails.push(m); console.error("FAIL " + m); };
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const sha = (f) => createHash("sha256").update(readFileSync(path.join(ui, "fonts/atlas", f))).digest("hex");

// ---- the bundled atlases are the ones the index names
for (const f of index.faces) { if (sha(f.atlas) !== f.sha256.atlas || sha(f.metrics) !== f.sha256.metrics) fail("atlas " + f.id + " does not match its hash in the index"); }
const faceIds = new Set(index.faces.map((f) => f.id)), atlasFiles = new Set(index.faces.map((f) => f.atlas));

// ---- 1. palette, 2. type, 4. size, at every point
console.log("== palette (art layer), type log, frame size, at each screenshot point");
let runsTotal = 0;
for (const s of rec.shots) {
  const c = s.check;
  if (!eq(c.size, [1024, 600]) || !eq(c.page, [1024, 600])) fail(`${s.name}: the frame is ${c.size} (page canvas ${c.page}), not 1024×600`);
  if (c.art.bad !== 0) fail(`${s.name}: ${c.art.bad} off-palette pixels on the art layer`);
  if (c.typeMissing.length) fail(`${s.name}: characters the atlases do not hold: ${c.typeMissing.join(" ")}`);
  if (c.renderer.sizes || c.renderer.missing) fail(`${s.name}: ${c.renderer.sizes} sprites at the wrong size, ${c.renderer.missing} unregistered`);
  const bad = c.typeLog.filter((r) => r.family !== "Inter" || !SIZES[r.px] || r.weight !== SIZES[r.px] || r.face !== `inter-${r.weight}-${r.px}` || !faceIds.has(r.face) || !atlasFiles.has(r.atlas));
  for (const r of bad.slice(0, 3)) fail(`${s.name}: "${r.text}" set in ${r.family} ${r.weight}/${r.px} from ${r.atlas}, not a bundled Inter at 16, 20 or 28 px`);
  for (const t of c.texts) if (!(t.rect[2] > 0 && t.rect[3] > 0)) fail(`${s.name}: the text "${t.text}" has no box (${t.rect}), so it would never be painted`);
  const set = new Set(c.typeLog.map((r) => r.text + "|" + r.px));
  for (const t of c.texts) if (!set.has(t.text + "|" + t.px)) fail(`${s.name}: the scene's text "${t.text}" at ${t.px} px is not in the type log`);
  runsTotal = Math.max(runsTotal, c.typeLog.length);
  console.log(`${s.name.padEnd(24)} art off-palette ${String(c.art.bad).padStart(2)} of ${c.art.covered} px · type runs ${String(c.typeLog.length).padStart(4)} (${bad.length} off-spec) · frame ${c.size.join("×")} · ${c.layered ? "screen layer" : "adapter"}`);
}
console.log(`type log: ${runsTotal} runs, every one Inter 16, 20 or 28 px from the bundled atlases (${index.faces.map((f) => f.id).join(", ")}); text API calls on the page: ${rec.textApiCalls}`);
if (rec.textApiCalls !== 0) fail(`the page called the canvas text API ${rec.textApiCalls} times`);

// ---- 3. regions against the spec files, on the screens on the layer
console.log("== regions against the spec files");
const R = pods.regions, F = frame.regions;
const textBox = (n) => { const w = type.measure(n.text, n.px), x = n.align === "center" ? n.rect[0] - Math.round(w / 2) : n.align === "right" ? n.rect[0] - w : n.rect[0]; return [x, n.rect[1], w, type.face(n.px).cap]; };
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
// the scene ids of the text drawn in each region (the page and Compare's two pages); whether a region may hold digits is the spec's `noDigits` flag
const NO_DIGIT = { page: () => R.chapter.page.noDigits, pageA: () => R.compareA.noDigits, pageB: () => R.compareB.noDigits, "specimen.name": (c) => R[c.view]?.name.noDigits, "specimen.origin": () => R.overview.origin.noDigits };
let regionsChecked = 0;
for (const s of rec.shots.filter((x) => x.check.layered)) {
  const c = s.check, got = [];
  const must = (ok, m) => { regionsChecked++; if (!ok) fail(`${s.name}: ${m}`); };
  for (const r of c.regions) {
    const id = r.region, rect = r.rect;
    if (id === "top") must(eq(rect, F.top.rect), `top bar ${rect} is not ${F.top.rect}`);
    else if (id === "line") must(eq(rect, F.line.rect), `bottom line ${rect} is not ${F.line.rect}`);
    else if (id === "plate") { const w = rect[2], cx = rect[0] + w / 2; must(Math.abs(cx - F.plate.centre) <= 1 && w <= F.plate.maxWidth && (rect[1] + rect[3] === F.plate.bottom || rect[1] === F.plate.topOverFocal), `message plate ${rect}`); }
    else if (id === "place") { const i = +r.id.match(/^list\.p(\d+)$/)[1]; must(eq(rect, placeRect(R.collection, i)), `place ${i} ${rect} is not ${placeRect(R.collection, i)}`); }
    else if (id === "place.pod") { const i = +r.id.match(/^list\.p(\d+)\./)[1], p = placeRect(R.collection, i), K = R.collection; must(eq(rect, [p[0] + K.pod.centre[0] - K.pod.size[0] / 2, p[1] + K.pod.centre[1] - K.pod.size[1] / 2, ...K.pod.size]), `place pod ${rect} is not the collection class centred on the ring`); }
    else if (id === "place.name") { const i = +r.id.match(/^list\.p(\d+)\./)[1], p = placeRect(R.collection, i), N = R.collection.name, box = [p[0] + N.at[0], p[1] + N.at[1], N.plate.max, N.h]; must(within(textBox(r), box), `place name ${textBox(r)} is not inside ${box}`); }
    else if (id === "place.find") { const i = +r.id.match(/^list\.p(\d+)\./)[1], p = placeRect(R.collection, i), A = R.collection.place.at; must(eq(rect, [p[0] + A[0], p[1] + A[1], A[2], A[3]]), `place picture ${rect}`); }
    else if (id === "waiting") must(eq(rect, R.collection.waiting.rect), `waiting mark ${rect} is not ${R.collection.waiting.rect}`);
    else if (id === "kin") { const i = +r.id.match(/^kin\.k(\d+)\./)[1]; must(eq(rect, kinRect(R.overview.kin, i)), `kin ${i} ${rect} is not ${kinRect(R.overview.kin, i)}`); }
    else if (id === "find") must(eq(rect, R.overview.originPicture.rect), `the find's picture ${rect} is not ${R.overview.originPicture.rect}`);
    else if (id === "figure") must(eq(rect, R.overview.figure.rect), `figure ${rect} is not ${R.overview.figure.rect}`);
    else if (id === "hatch") must(eq(rect, R.overview.hatch.rect), `hatch ${rect} is not ${R.overview.hatch.rect}`);
    else if (id === "pod") { const Rv = R[c.view], sizes = Object.values(pods.classes.pod), w = rect[2], h = rect[3], lift = Rv.pod.feet - (rect[1] + h); must(sizes.some(([a, b]) => a === w && b === h) && rect[0] + w / 2 === Rv.pod.axis && (lift === 0 || lift === 4), `pod ${rect} is not a size class bottom-centred on (${Rv.pod.axis}, ${Rv.pod.feet})`); }
    else if (id === "name") { const Rv = R[c.view]; must(within(textBox(r), Rv.name.rect) && Math.abs(textBox(r)[0] + textBox(r)[2] / 2 - Rv.name.centre) <= 1, `name ${textBox(r)} is not inside ${Rv.name.rect} centred on ${Rv.name.centre}`); }
    else if (id === "origin") must(within(textBox(r), R.overview.origin.rect), `origin ${textBox(r)} is not inside ${R.overview.origin.rect}`);
    else if (id === "ribbon") must(eq(rect, R.overview.ribbon.rect), `ribbon ${rect} is not ${R.overview.ribbon.rect}`);
    else if (id === "stamp") must(eq(rect, R.overview.stamp.rect) && rect[2] === 120 && rect[3] === 120, `stamp label ${rect} is not 120×120 at ${R.overview.stamp.rect}`);
    else if (id === "stamp.image") { const L = R.overview.stamp.rect; must(rect[2] === rect[3] && rect[2] <= 104 && rect[2] >= 34 && Math.abs(rect[0] + rect[2] / 2 - (L[0] + L[2] / 2)) <= 1 && Math.abs(rect[1] + rect[3] / 2 - (L[1] + L[3] / 2)) <= 1, `the stamp ${rect} is not at most 104 px square and centred on its label ${L}`); }
    else if (id === "page") { const Pg = R.chapter.page, n = c.traits ?? 0; must(eq(rect, [Pg.rect[0], Pg.rect[1], Pg.rect[2], pageHeight(Pg, n)]), `page ${rect} is not ${Pg.rect.slice(0, 3)} by the ${pageHeight(Pg, n)} the spec gives for ${n} traits`); }
    else if (id === "page.seal") { const Pg = R.chapter.page, want = sealedFindRect(Pg, 1); must(eq(rect, want), `the find that opens a shut chapter ${rect} is not ${want}`); }
    else if (id === "compareA" || id === "compareB") must(eq(rect, R[id].rect), `${id} ${rect} is not ${R[id].rect}`);
    else if (id === "rail.tab") { const i = +r.id.match(/^rail\.(\d+)$/)[1], n = c.pod.chapters, S = frame.regions.rail.slant, want = (o) => { const t = slantTabs(frame.regions.rail, n, o).tabs[i]?.rect; return t && [t[0] + S, t[1] + 1, t[2] - S, t[3] - 2]; }, hit = Array.from({ length: n + 1 }, (_, o) => want(o - 1)).find((w) => w && rect[0] === w[0] && rect[2] === w[2] && rect[3] === w[3] && (rect[1] === w[1] || rect[1] === w[1] - frame.focus.lift.chrome)); must(!!hit, `rail tab ${i} ${rect} is not the slanted tab's body in ${n} tabs`); got.push(i); }
    else if (id === "page.cell" || id === "page.diff" || id === "page.bracket") {
      const m = r.id.match(/^(page|pageA|pageB)\.c(\d+)\./), key = m[1] === "page" ? "page" : m[1] === "pageA" ? "compareA" : "compareB", base = key === "page" ? R.chapter.page : R[key].grid ? R[key] : R.compareA, region = { ...base, rect: key === "page" ? base.rect : R[key].rect }, traits = c.regions.filter((q) => q.region === "page.cell" && q.id.startsWith(m[1] + ".c")).length, g = pageGrid(region, traits), cell = g.cells[+m[2]], [pw, ph] = g.picture, D = pods.page.diff;
      const want = id === "page.cell" ? [cell[0], cell[1], pw, ph] : id === "page.diff" ? [cell[0], cell[1], pw, D.edge] : [cell[0] + Math.round(pw / 2) - D.bracket[0] / 2, cell[1] + D.inset, D.bracket[0], D.bracket[1]];
      must(cell && eq(rect, want), `${r.id} ${rect} is not the grid's ${want}`);
    }
    else must(false, `region "${id}" (${r.id}) is not in the spec`);
  }
  // the rail's tab count against the frame; the stamp's size on its label; no digits where a picture does the job
  if (c.screen === "pods" && c.pod && c.pod.idd && !c.cmp && c.view !== "collection") must(got.length === c.pod.chapters, `the rail has ${got.length} tabs for ${c.pod.chapters} chapters`);
  for (const t of c.texts) if (t.id === "line.subject") must(!t.text.endsWith("…"), `the bottom line's subject "${t.text}" is clipped with "…"`);
  for (const t of c.texts) { const key = t.id.startsWith("specimen.name") ? "specimen.name" : t.id.startsWith("specimen.origin") ? "specimen.origin" : /^list\.p\d+\.name$/.test(t.id) ? "place.name" : t.id.split(".")[0]; const flag = key === "place.name" ? R.collection.name.noDigits : NO_DIGIT[key]?.(c); if (flag && /\d/.test(t.text)) must(false, `a digit in "${t.text}" in region ${key}, which the spec marks noDigits`); }
  console.log(`${s.name.padEnd(24)} ${c.regions.length} drawn regions, rail ${got.length}/${c.pod ? c.pod.chapters : "-"} tabs, placeholders registered ${c.placeholders}`);
}
// every Pods state is recorded, with the regions it must draw
{ const need = { collection: ["place", "place.pod", "place.name"], overview: ["pod", "name", "hatch"], chapter: ["pod", "name", "page", "rail.tab"], compare: ["compareA", "compareB", "rail.tab"] };
  for (const [mode, ids] of Object.entries(need)) { const shots = rec.shots.filter((x) => x.check.layered && x.check.mode === mode); if (!shots.length) { fail(`no screenshot point records Pods in its ${mode} state`); continue; }
    for (const id of ids) if (!shots.some((x) => x.check.regions.some((r) => r.region === id))) fail(`Pods in its ${mode} state: no drawn region "${id}" in any of its ${shots.length} screenshot points`); }
  regionsChecked++; }
console.log(`regions: ${regionsChecked} boxes compared with the spec files`);
const onLayer = rec.shots.filter((x) => x.check.layered).map((x) => x.name), adapter = rec.shots.filter((x) => !x.check.layered).map((x) => x.name);
console.log(`on the screen layer (${onLayer.length}): ${onLayer.join(", ")}`);
console.log(`through the adapter, palette and type checked, regions not (${adapter.length}): ${adapter.join(", ")}`);
if (!rec.shots.some((x) => x.check.layered)) fail("no screen on the layer was recorded");
console.log(fails.length ? `${fails.length} failure(s)` : "layer checks ok");
process.exit(fails.length ? 1 : 0);
