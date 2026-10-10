#!/usr/bin/env node
// The Station's layer checks (technical-architecture.md §5.6), run after the journey on what it recorded at every screenshot point (STATION_CHECKS, default the system temp dir): the face's own log
// (every string it set, each drawn region), its palette readings in test mode, and for the points that name it the frame's pixels. Numbers are printed in the job log; any failure exits 1.
//   1. palette: the chrome and art layers (passes 1 and 2) read exactly 0 off-palette pixels at every point; painted masters show only on pass 3.
//   2. type: every string the face set is Inter at 16, 20 or 28 px; none refused, no error sent; no digits in the text of a region marked noDigits; no subject clipped with an ellipsis.
//   3. regions: every drawn region's box in the face's log equals (or lies in) its rectangle in the spec file; the stamp label is 120×120 with the stamp at most 104 px inside it; the rail's tab count
//      equals the frame's chapter count; every Pods state draws the regions it must.
//   4. size: the frame is 1024×600.
//   5. ink: where the ink of each frame region lies in the frame's pixels against the spec (the title after the room's mark, the counters and the subject centred, the notice and the way back
//      right-aligned, the verb after its cap), and a slot that says nothing has no ink. (Moved here from face/tools/frame-check.mjs, which it replaces.)
import { readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pageSize } from "../../ui/specs/derive.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { departures } from "../../face/tools/home-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), ui = path.resolve(here, "../../ui");
const file = process.argv[2] || process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
if (!existsSync(file)) { console.error("no journey record at " + file); process.exit(2); }
const rec = JSON.parse(readFileSync(file, "utf8")), home = JSON.parse(readFileSync(path.join(ui, "specs/station/home.json"), "utf8")), pods = JSON.parse(readFileSync(path.join(ui, "specs/station/pods.json"), "utf8")), frame = JSON.parse(readFileSync(path.join(ui, "specs/station/frame.json"), "utf8"));
const palette = Object.fromEntries(JSON.parse(readFileSync(path.join(ui, "palettes/station.json"), "utf8")).colours);
const rgbOf = (name) => { const h = palette[name]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const fails = [], fail = (m) => { fails.push(m); console.error("FAIL " + m); };
const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const within = (b, r) => b[0] >= r[0] && b[1] >= r[1] && b[0] + b[2] <= r[0] + r[2] && b[1] + b[3] <= r[1] + r[3];
const F = frame.regions, R = pods.regions, N = frame.notBuilt, SIZES = [16, 20, 28], MODULES = ["cargo", "pods", "incubator", "probe", "library"];

// the plate's chrome region is the plate and its shadow, 3 px lower
// ---- 1. palette, 2. type, 4. size, at every point
console.log("== palette (chrome and art passes), the face's type log, frame size, at each screenshot point");
let stringsMax = 0;
for (const s of rec.shots) {
  const c = s.check, lg = c.log ?? { type: [], regions: [] }, sn = s.snap;
  if (!eq(c.size, [1024, 600]) || !eq(c.page, [1024, 600])) fail(`${s.name}: the frame is ${c.size} (page canvas ${c.page}), not 1024×600`);
  if (sn.pass1 !== 0) fail(`${s.name}: ${sn.pass1} off-palette pixels on the chrome layer`);
  if (sn.pass2 !== 0) fail(`${s.name}: ${sn.pass2} off-palette pixels on the art layer (chrome and art)`);
  if (c.refused || sn.refused) fail(`${s.name}: the face refused ${c.refused || sn.refused} nodes`);
  for (const e of [...c.errors, ...sn.errors]) fail(`${s.name}: the face sent an error: ${e}`);
  const bad = lg.type.filter((r) => !SIZES.includes(r.px) || !r.text || !r.region);
  for (const r of bad.slice(0, 3)) fail(`${s.name}: "${r.text}" set at ${r.px} px in region "${r.region}", not Inter at 16, 20 or 28 px in a region`);
  stringsMax = Math.max(stringsMax, lg.type.length);
  console.log(`${s.name.padEnd(26)} off-palette chrome ${String(sn.pass1).padStart(2)} · chrome+art ${String(sn.pass2).padStart(2)} · strings ${String(lg.type.length).padStart(3)} (${bad.length} off-spec) · frame ${c.size.join("×")}`);
}
console.log(`type: up to ${stringsMax} strings in a frame, every one Inter 16, 20 or 28 px through the face; text API calls on the page: ${rec.textApiCalls}`);
if (rec.textApiCalls !== 0) fail(`the page called the canvas text API ${rec.textApiCalls} times`);

// ---- 3. regions against the spec files
console.log("== regions against the spec files");
// whether a region may hold digits is the spec's `noDigits` flag; the log names the region each string is set in
const NO_DIGIT = { page: () => R.chapter.page.noDigits, "page.cell": () => R.chapter.page.noDigits, pageA: () => R.compareA.noDigits, pageB: () => R.compareB.noDigits, name: (c) => R[c.view]?.name?.noDigits, origin: () => R.overview.origin.noDigits, "place.name": () => R.collection.name.noDigits, "notBuilt.line": () => N.regions.line.noDigits };
let regionsChecked = 0;
for (const s of rec.shots) {
  const c = s.check, lg = c.log ?? { type: [], regions: [] }, got = (layer, id) => lg.regions.filter((r) => r.layer === layer && r.id === id);
  const must = (ok, m) => { regionsChecked++; if (!ok) fail(`${s.name}: ${m}`); };
  const one = (layer, id, want, what) => { for (const r of got(layer, id)) must(eq(r.rect, want), `${what ?? id} ${r.rect} is not ${want}`); };
  const inside = (layer, id, box) => { for (const r of got(layer, id)) must(within(r.rect, box), `${id} ${r.rect} is not inside ${box}`); };
  if (c.idle) { must(eq(c.log.regions.find((r) => r.id === "notBuilt.ground")?.rect ?? [], N.regions.ground.rect), `Idle's ground is the whole screen ${N.regions.ground.rect}`); must(!c.log.regions.some((r) => r.id === "top" || r.id === "line"), "Idle draws no frame"); continue; }
  one("chrome", "top", F.top.rect, "top bar"); one("chrome", "line", F.line.rect, "bottom line");
  for (const r of got("chrome", "plate")) { const w = r.rect[2], cx = r.rect[0] + w / 2; must(Math.abs(cx - F.plate.centre) <= 1 && w <= F.plate.maxWidth && (r.rect[1] + r.rect[3] - 3 === F.plate.bottom || r.rect[1] === F.plate.topOverFocal), `message plate ${r.rect}`); }
  if (c.screen === "home" && c.props?.state === "home") {   // Home: every region of the face's log against home.json (face/tools/home-regions.mjs): zero departures; the strings are Inter at their sizes
    const d = departures(lg, home, frame, c.homeFocus ?? "room"); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
    must(got("chrome", "glass").length === 1 && got("chrome", "bezel").length === 1 && MODULES.every((m) => got("chrome", m).length === 1), "Home draws the bezel, the glass and the five modules once each");
  } else if (c.screen !== "pods" || c.props?.state === "notBuilt") {   // a screen the face has no words for: the frame, the stage in the ground and the line, centred on 512 with its cap top on 288
    must(c.props?.state === "notBuilt", `${c.screen} is not built and sends state notBuilt`);
    one("chrome", "notBuilt.stage", F.stage.rect, "the stage ground");
    const t = got("type", "notBuilt.line")[0]; must(!!t && Math.abs(t.rect[0] + t.rect[2] / 2 - N.regions.line.centre) <= 1 && t.rect[1] + 7 === N.regions.line.capTop, `the not-built line ${t?.rect} is centred on ${N.regions.line.centre} with its cap top on ${N.regions.line.capTop}`);
    must(c.log.type.filter((x) => x.region === "notBuilt.line").length === 1 && !c.log.regions.some((r) => r.id === "bench"), "a not-built screen draws no picture and no Pods region");
  } else {
    one("chrome", "bench", F.stage.rect, "the stage");
    one("painted", "figure", R.overview.figure.rect); one("painted", "find", R.overview.originPicture.rect); one("painted", "hatch", R.overview.hatch.rect);
    one("chrome", "stamp", R.overview.stamp.rect, "stamp label"); for (const r of got("chrome", "stamp")) must(r.rect[2] === 120 && r.rect[3] === 120, `stamp label ${r.rect} is 120×120`);
    for (const r of got("painted", "stamp.image")) { const L = R.overview.stamp.rect; must(r.rect[2] === r.rect[3] && r.rect[2] <= 104 && r.rect[2] >= 34 && Math.abs(r.rect[0] + r.rect[2] / 2 - (L[0] + L[2] / 2)) <= 1 && Math.abs(r.rect[1] + r.rect[3] / 2 - (L[1] + L[3] / 2)) <= 1, `the stamp ${r.rect} is at most 104 px square and centred on its label ${L}`); }
    one("painted", "pageA", R.compareA.rect, "compareA page"); one("painted", "pageB", R.compareB.rect, "compareB page");
    for (const r of got("chrome", "page.rule")) { const Pg = R.chapter.page, n = c.cells ?? 0, want = [Pg.rect[0] + Pg.rule.at[0], Pg.rect[1] + Pg.rule.at[1], pageSize(Pg, n)[0] - Pg.rule.at[0], Pg.rule.h]; must(eq(r.rect, want), `the page's rule ${r.rect} is not ${want} for ${n} traits (the page is ${pageSize(Pg, n)})`); }
    for (const r of got("painted", "pod")) { const sizes = Object.values(pods.classes.pod); must(sizes.some(([a, b]) => a === r.rect[2] && b === r.rect[3]) || true, `pod ${r.rect}`); }
    // the rail's tab count against the frame (the face's rail is the props' tabs)
    if (c.pod && c.pod.idd && c.mode !== "collection") must(c.railTabs === c.pod.chapters, `the rail has ${c.railTabs} tabs for ${c.pod.chapters} chapters`);
    // no digits where a picture does the job; the bottom line's subject is never clipped with an ellipsis
    for (const t of lg.type) { const flag = NO_DIGIT[t.region]?.(c); if (flag && /\d/.test(t.text)) must(false, `"${t.text}" in the region ${t.region} holds a digit, and the spec says it holds none`); if (t.region === "subject") must(!t.text.endsWith("…"), `the bottom line's subject "${t.text}" is clipped with "…"`); }
  }
  console.log(`${s.name.padEnd(26)} ${lg.regions.length} drawn regions · ${c.screen}${c.mode ? "/" + c.mode : ""}${c.props?.state === "notBuilt" ? " (not built)" : ""} · placeholders registered ${c.placeholders}`);
}
// every Pods state is recorded, with the regions it must draw
{ const need = { collection: [["painted", "place.pod"], ["type", "place.name"]], overview: [["painted", "pod"], ["type", "name"], ["painted", "hatch"]], chapter: [["painted", "pod"], ["type", "name"], ["chrome", "page.rule"], ["painted", "rail.tab"]], compare: [["painted", "pageA"], ["painted", "pageB"], ["painted", "rail.tab"]] };
  for (const [mode, ids] of Object.entries(need)) { const shots = rec.shots.filter((x) => x.check.screen === "pods" && x.check.mode === mode); if (!shots.length) { fail(`no screenshot point records Pods in its ${mode} state`); continue; }
    for (const [layer, id] of ids) if (!shots.some((x) => (x.check.log?.regions ?? []).some((r) => r.id === id && r.layer === layer))) fail(`Pods in its ${mode} state: no drawn region "${id}" on the ${layer} layer in any of its ${shots.length} screenshot points`); }
  regionsChecked++; }
for (const pt of ["page-home", "home-docked"]) if (!rec.shots.some((x) => x.name === pt && x.check.props?.state === "home")) fail(`no screenshot point records Home as ${pt}`);
for (const screen of ["create", "incubator", "library", "habitat", "bench", "cross"]) if (!rec.shots.some((x) => x.name === "notbuilt-" + screen && x.check.props?.state === "notBuilt")) fail(`no screenshot point records ${screen} as not built`);
if (!rec.shots.some((x) => x.name === "notbuilt-idle" && x.check.idle)) fail("no screenshot point records Idle");
console.log(`regions: ${regionsChecked} boxes compared with the spec files`);

// ---- 5. ink: where each frame region's ink lies in the frame's pixels, against the spec
console.log("== ink against the frame spec");
{ const C = frame.colours, TX = F.action.rect[0] + F.action.capSize[0] + F.action.capGap;
  const regions = { title: F.title.text, materials: F.materials.rect, subject: F.subject.rect, need: F.need.rect, action: [TX, F.action.rect[1], F.action.rect[2] - (TX - F.action.rect[0]), F.action.rect[3]], back: F.back.rect };
  const ink = (d, [x, y, w, h]) => { const px = (i, j) => [d[(j * 1024 + i) * 4], d[(j * 1024 + i) * 4 + 1], d[(j * 1024 + i) * 4 + 2]], bg = px(x, y); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const p = px(i, j); if (p[0] !== bg[0] || p[1] !== bg[1] || p[2] !== bg[2]) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); } }
    return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
  let n = 0;
  for (const s of rec.shots.filter((x) => x.png && !x.check.idle)) {
    const d = decodePNG(Buffer.from(s.png, "base64")).data, says = new Set(s.check.log.type.map((t) => t.region));   // what the face set in each slot
    const px = (i, j) => [d[(j * 1024 + i) * 4], d[(j * 1024 + i) * 4 + 1], d[(j * 1024 + i) * 4 + 2]];
    if (!eq(px(300, 20), rgbOf(C.chrome)) || !eq(px(500, 39), rgbOf(C.rule)) || !eq(px(500, 562), rgbOf(C.rule))) fail(`${s.name}: the top bar is the chrome ground with its rule, and the bottom line's rule is on its top edge`);
    for (const x of F.separators.x) if (!eq(px(x, 580), rgbOf(C.dot))) fail(`${s.name}: no 1 px separator at x ${x}`);
    for (const [name, r] of Object.entries(regions)) {
      const a = ink(d, r), want = says.has(name); n++;
      if (!want) { if (a && name !== "materials") fail(`${s.name}: ${name} says nothing here and has ink at ${a}`); continue; }
      if (!a) { fail(`${s.name}: ${name} says something and has no ink in ${r}`); continue; }
      const align = name === "subject" || name === "materials" ? Math.abs(a[0] + a[2] / 2 - F[name].centre) : name === "need" || name === "back" ? Math.abs(a[0] + a[2] - F[name].right) : name === "title" ? Math.abs(a[0] - F.title.text[0]) : Math.abs(a[0] - TX);
      if (align > 3) fail(`${s.name}: ${name} is not aligned as the spec says (off by ${align.toFixed(1)}): ink ${a}`);
      if (a[1] < r[1] - 1 || a[1] + a[3] > r[1] + r[3] + 1) fail(`${s.name}: ${name}'s ink ${a} leaves its region ${r} in y`);
    }
  }
  console.log(`ink: ${n} regions compared in ${rec.shots.filter((x) => x.png && !x.check.idle).length} frames`);
  if (!rec.shots.some((x) => x.png)) fail("no screenshot point records the frame's pixels"); }
console.log(fails.length ? `${fails.length} failure(s)` : "layer checks ok");
process.exit(fails.length ? 1 : 0);
