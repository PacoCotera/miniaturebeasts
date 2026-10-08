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
import { railTabs, pageGrid, repeat } from "../../ui/layout.mjs";

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
const R = pods.regions, F = frame.regions, W = R.well;
const textBox = (n) => { const w = type.measure(n.text, n.px), x = n.align === "center" ? n.rect[0] - Math.round(w / 2) : n.align === "right" ? n.rect[0] - w : n.rect[0]; return [x, n.rect[1], w, type.face(n.px).cap]; };
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
// the scene ids of the text drawn in each region (the page and Compare's two pages); whether a region may hold digits is the spec's `noDigits` flag
const NO_DIGIT_IDS = { page: "page", pageA: "compareA", pageB: "compareB" };
let regionsChecked = 0;
for (const s of rec.shots.filter((x) => x.check.layered)) {
  const c = s.check, got = [];
  const must = (ok, m) => { regionsChecked++; if (!ok) fail(`${s.name}: ${m}`); };
  for (const r of c.regions) {
    const id = r.region, rect = r.rect;
    if (id === "top") must(eq(rect, F.top.rect), `top bar ${rect} is not ${F.top.rect}`);
    else if (id === "line") must(eq(rect, F.line.rect), `bottom line ${rect} is not ${F.line.rect}`);
    else if (id === "plate") { const w = rect[2], cx = rect[0] + w / 2; must(Math.abs(cx - F.plate.centre) <= 1 && w <= F.plate.maxWidth && (rect[1] + rect[3] === F.plate.bottom || rect[1] === F.plate.topOverFocal), `message plate ${rect}`); }
    else if (id === "list") must(eq(rect, R.list.rect), `list ${rect} is not ${R.list.rect}`);
    else if (id === "list.well") { const i = +r.id.match(/\.w(\d+)\./)[1]; must(eq(rect, repeat(W.rect, i, W.pitch)), `well slot ${i} ${rect}`); }
    else if (id === "hatch") must(eq(rect, R.hatch.rect), `hatch ${rect} is not ${R.hatch.rect}`);
    else if (id === "pod") { const sizes = Object.values(pods.classes.pod), w = rect[2], h = rect[3], lift = R.pod.feet - (rect[1] + h); must(sizes.some(([a, b]) => a === w && b === h) && rect[0] + w / 2 === R.pod.axis && (lift === 0 || lift === 4), `pod ${rect} is not a size class bottom-centred on (${R.pod.axis}, ${R.pod.feet})`); }
    else if (id === "name") must(within(textBox(r), R.name.rect) && Math.abs(textBox(r)[0] + textBox(r)[2] / 2 - R.name.centre) <= 1, `name ${textBox(r)} is not inside ${R.name.rect} centred on ${R.name.centre}`);
    else if (id === "origin") must(within(textBox(r), R.origin.rect), `origin ${textBox(r)} is not inside ${R.origin.rect}`);
    else if (id === "ribbon") must(eq(rect, R.ribbon.rect), `ribbon ${rect} is not ${R.ribbon.rect}`);
    else if (id === "stamp") must(eq(rect, R.stamp.rect) && rect[2] === 120 && rect[3] === 120, `stamp label ${rect} is not 120×120 at ${R.stamp.rect}`);
    else if (id === "stamp.image") { const L = R.stamp.rect; must(rect[2] === rect[3] && rect[2] <= 104 && rect[2] >= 34 && Math.abs(rect[0] + rect[2] / 2 - (L[0] + L[2] / 2)) <= 1 && Math.abs(rect[1] + rect[3] / 2 - (L[1] + L[3] / 2)) <= 1, `the stamp ${rect} is not at most 104 px square and centred on its label ${L}`); }
    else if (id === "page") must(eq(rect, R.page.rect), `page ${rect} is not ${R.page.rect}`);
    else if (id === "compareA" || id === "compareB") must(eq(rect, R[id].rect), `${id} ${rect} is not ${R[id].rect}`);
    else if (id === "rail.tab") { const i = +r.id.match(/^rail\.(\d+)$/)[1], n = c.pod.chapters, t = railTabs(R.rail, n, c.cmp ? -1 : -1).tabs[i]; must(t && rect[0] === t[0] && rect[2] === t[2] && rect[3] === t[3] && (rect[1] === t[1] || rect[1] === t[1] - 4), `rail tab ${i} ${rect} is not ${t}`); got.push(i); }
    else if (id === "page.cell") {
      const m = r.id.match(/^(page|pageA|pageB)\.c(\d+)\.pic$/), key = m[1] === "page" ? "page" : m[1] === "pageA" ? "compareA" : "compareB", spec = R[key].grid ? R[key] : R.compareA, region = { ...spec, rect: R[key].rect }, traits = c.regions.filter((q) => q.region === "page.cell" && q.id.startsWith(m[1] + ".c")).length, g = pageGrid(region, traits), cell = g.cells[+m[2]];
      must(cell && rect[0] === cell[0] && rect[1] === cell[1] && rect[2] === g.picture[0] && rect[3] === g.picture[1], `${r.id} ${rect} is not the grid's ${cell} at ${g.picture}`);
    }
    else must(false, `region "${id}" (${r.id}) is not in the spec`);
  }
  // the rail's tab count against the frame; the stamp's size on its label; no digits where a picture does the job
  if (c.screen === "pods" && c.pod && c.pod.idd && !c.cmp) must(got.length === c.pod.chapters, `the rail has ${got.length} tabs for ${c.pod.chapters} chapters`);
  for (const t of c.texts) { const key = NO_DIGIT_IDS[t.id.split(".")[0]]; if (key && R[key].noDigits && /\d/.test(t.text)) must(false, `a digit in "${t.text}" in region ${key}, which the spec marks noDigits`); }
  console.log(`${s.name.padEnd(24)} ${c.regions.length} drawn regions, rail ${got.length}/${c.pod ? c.pod.chapters : "-"} tabs, placeholders registered ${c.placeholders}`);
}
console.log(`regions: ${regionsChecked} boxes compared with the spec files`);
const onLayer = rec.shots.filter((x) => x.check.layered).map((x) => x.name), adapter = rec.shots.filter((x) => !x.check.layered).map((x) => x.name);
console.log(`on the screen layer (${onLayer.length}): ${onLayer.join(", ")}`);
console.log(`through the adapter, palette and type checked, regions not (${adapter.length}): ${adapter.join(", ")}`);
if (!rec.shots.some((x) => x.check.layered)) fail("no screen on the layer was recorded");
console.log(fails.length ? `${fails.length} failure(s)` : "layer checks ok");
process.exit(fails.length ? 1 : 0);
