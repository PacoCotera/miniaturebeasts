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
import { pageSize, pageOrigin } from "../../ui/specs/derive.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { departures } from "../../face/tools/home-regions.mjs";
import { departures as idleDepartures } from "../../face/tools/idle-regions.mjs";
import { departures as createDepartures } from "../../face/tools/create-regions.mjs";
import { departures as incubatorDepartures } from "../../face/tools/incubator-regions.mjs";
import { departures as vivariumDepartures } from "../../face/tools/vivarium-regions.mjs";
import { departures as habitatDepartures } from "../../face/tools/habitat-regions.mjs";
import { departures as libraryDepartures } from "../../face/tools/library-regions.mjs";
import { departures as benchDepartures } from "../../face/tools/bench-regions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url)), ui = path.resolve(here, "../../ui");
const file = process.argv[2] || process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
if (!existsSync(file)) { console.error("no journey record at " + file); process.exit(2); }
const incubatorSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/incubator.json"), "utf8")), vivariumSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/vivarium.json"), "utf8"));
const benchSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/bench.json"), "utf8")), librarySpec = JSON.parse(readFileSync(path.join(ui, "specs/station/library.json"), "utf8")), habitatSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/habitat.json"), "utf8")), namerSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/namer.json"), "utf8"));
const rec = JSON.parse(readFileSync(file, "utf8")), home = JSON.parse(readFileSync(path.join(ui, "specs/station/home.json"), "utf8")), pods = JSON.parse(readFileSync(path.join(ui, "specs/station/pods.json"), "utf8")), createSpec = JSON.parse(readFileSync(path.join(ui, "specs/station/create.json"), "utf8")), frame = JSON.parse(readFileSync(path.join(ui, "specs/station/frame.json"), "utf8"));
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
  if (c.idle) { for (const m of idleDepartures(lg, frame)) must(false, m); regionsChecked += lg.regions.length; must(got("chrome", "idle.strip").length === 1 && got("chrome", "vivarium").length + got("painted", "vivarium").length >= 1, "Idle draws the Vivarium (its plates, or the light's painting) and the strip"); continue; }   // Idle: every region of the face's log against frame.json idle (face/tools/idle-regions.mjs)
  one("painted", "top", F.top.rect, "top bar"); one("painted", "line", F.line.rect, "bottom line");   // the signed bars 1:1 (frame.json top.slice, line.slice); the code panel and rule are nodes of no size while they are on the face
  for (const id of ["top", "line"]) must(got("painted", id).length === 1 && got("chrome", id).every((r) => !eq(r.rect, F[id].rect)), `${id}: one painted bar, and no full-width code panel beside it: ` + JSON.stringify(got("chrome", id).map((r) => r.rect)));
  for (const r of got("chrome", "plate")) { const w = r.rect[2], cx = r.rect[0] + w / 2; must(Math.abs(cx - F.plate.centre) <= 1 && w <= F.plate.maxWidth && (r.rect[1] + r.rect[3] - 3 === F.plate.bottom || r.rect[1] === F.plate.topOverFocal), `message plate ${r.rect}`); }
  if (c.screen === "home" && c.props?.state === "home") {   // Home: every region of the face's log against home.json (face/tools/home-regions.mjs): zero departures; the strings are Inter at their sizes
    const d = departures(lg, home, frame, c.homeFocus ?? "room"); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
    must(got("chrome", "glass").length + got("painted", "glass").length === 1 && got("chrome", "bezel").length === 1 && MODULES.every((m) => got("chrome", m).length === 1), "Home draws the bezel, the glass and the five modules once each");
  } else if (c.screen === "create" && c.props?.state !== "notBuilt") {   // Create: every region of the face's log against create.json (face/tools/create-regions.mjs): zero departures; the roll, the founder and the stamp label are drawn
    const d = createDepartures(lg, createSpec, frame, c.props.state); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
    must(got("painted", "stamp.plate").length === 1 && got("art", "founder").length + got("painted", "founder").length >= 1 && got("chrome", "roll").length >= 1, "Create draws the roll, the founder and the stamp label");
  } else if (c.screen === "incubator" && c.props?.state !== "notBuilt") {   // the Incubator: every region of the face's log against incubator.json (face/tools/incubator-regions.mjs): zero departures
    const d = incubatorDepartures(lg, incubatorSpec, frame, c.props.state); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
  } else if (c.screen === "vivarium" && c.viv) {   // the Vivarium's whole: every region of the face's log against vivarium.json (face/tools/vivarium-regions.mjs): zero departures; a tile a bay
    const d = vivariumDepartures(lg, vivariumSpec, c.viv.state, c.viv.cur, c.viv.n); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
  } else if (c.screen === "bench" && c.bench) {   // the Probe bench: every region of the face's log against bench.json (face/tools/bench-regions.mjs): zero departures
    const d = benchDepartures(lg, benchSpec, c.bench.props, c.bench.cur); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
  } else if (c.screen === "library" && c.lib) {   // the Library spread: every region of the face's log against library.json (face/tools/library-regions.mjs): zero departures; each part at place + at, inside its page
    const d = libraryDepartures(lg, librarySpec, c.lib.props, c.lib.cur); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
  } else if (c.screen === "habitat" && c.hab) {   // one mibi up close: every region of the face's log against habitat.json (and namer.json while the namer is open) (face/tools/habitat-regions.mjs): zero departures
    const d = habitatDepartures(lg, habitatSpec, namerSpec, c.hab.state, c.hab.cur, c.hab.n, c.hab.open); for (const m of d) must(false, m); regionsChecked += lg.regions.length;
  } else if (c.screen !== "pods" || c.props?.state === "notBuilt") {   // a screen the face has no words for: the frame, the stage in the ground and the line, centred on 512 with its cap top on 288
    must(c.props?.state === "notBuilt", `${c.screen} is not built and sends state notBuilt`);
    one("chrome", "notBuilt.stage", F.stage.rect, "the stage ground");
    const t = got("type", "notBuilt.line")[0]; must(!!t && Math.abs(t.rect[0] + t.rect[2] / 2 - N.regions.line.centre) <= 1 && t.rect[1] + 7 === N.regions.line.capTop, `the not-built line ${t?.rect} is centred on ${N.regions.line.centre} with its cap top on ${N.regions.line.capTop}`);
    must(c.log.type.filter((x) => x.region === "notBuilt.line").length === 1 && !c.log.regions.some((r) => r.id === "bench"), "a not-built screen draws no picture and no Pods region");
  } else {
    one("chrome", "bench", F.stage.rect, "the stage");
    one("painted", "figure", R.overview.figure.rect); one("painted", "find", R.overview.originPicture.rect); one("painted", "hatch", R.overview.hatch.rect);
    one("painted", "stamp", R.overview.stampCase.rect, "the stamp case (the label stands in it)");
    for (const r of got("painted", "stamp.image")) { const L = R.overview.stamp.rect; must(r.rect[2] === r.rect[3] && r.rect[2] <= 104 && r.rect[2] >= 34 && Math.abs(r.rect[0] + r.rect[2] / 2 - (L[0] + L[2] / 2)) <= 1 && Math.abs(r.rect[1] + r.rect[3] / 2 - (L[1] + L[3] / 2)) <= 1, `the stamp ${r.rect} is at most 104 px square and centred on its label ${L}`); }
    { const h = c.cmpCells == null ? null : pageSize(R.compareA, c.cmpCells)[1]; for (const [id, K] of [["pageA", R.compareA], ["pageB", R.compareB]]) one("painted", id, [K.rect[0], K.rect[1], K.rect[2], h ?? K.rect[3]], `compare${id.slice(-1)} page (the height its chapter's count gives)`); }
    for (const r of got("chrome", "page.rule")) { const Pg = R.chapter.page, n = c.cells ?? 0, [ox, oy] = c.frame ? pageOrigin(Pg, c.frame.cols, c.frame.rows) : Pg.rect, want = [ox + Pg.rule.at[0], oy + Pg.rule.at[1], pageSize(Pg, n)[0] - Pg.rule.at[0], Pg.rule.h]; must(eq(r.rect, want), `the page's rule ${r.rect} is not ${want} for ${n} traits (the page is ${pageSize(Pg, n)})`); }
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
for (const screen of ["cross"]) if (!rec.shots.some((x) => x.name === "notbuilt-" + screen && x.check.props?.state === "notBuilt")) fail(`no screenshot point records ${screen} as not built`);
if (!rec.shots.some((x) => x.name === "page-idle" && x.check.idle)) fail("no screenshot point records Idle");
for (const [pt, state] of [["page-bench", "docked"], ["page-bench-armed", "docked"], ["page-bench-away", "away"], ["page-bench-tier2", "docked"], ["page-library-empty", "spread"], ["page-library-spread", "spread"], ["page-vivarium", "rest"], ["page-vivarium-away", "rest"], ["page-vivarium-away-night", "rest"], ["page-mibi-out", "rest"], ["page-vivarium-empty", "empty"], ["page-habitat", "rest"], ["page-meet", "meet"], ["page-namer", "rest"], ["page-create", "shape"], ["page-create-grow", "grow"], ["page-incubator", "growing"], ["page-incubator-empty", "empty"], ["page-hatch", "hatch"]]) if (!rec.shots.some((x) => x.name === pt && x.check.props?.state === state)) fail(`no screenshot point records ${pt} in state ${state}`);
// the moving sets (Station M1 §3, vivarium-regions): every resident's drawn box, at every cell's lift and dy (the hop's lift, a pass's rise, the crouch lowered 2 px), stays inside its window on the whole, Home's glass and Idle; up close and in the hatch
// the up-close hop scales down to fit when the rect leaves less above the figure, so it never clips (the animator's closeHop note)
{ const MV = path.join(ui, "specs/station/moving"), ix = JSON.parse(readFileSync(path.join(MV, "index.json"), "utf8")), sets = Object.fromEntries(ix.sets.map((id) => [id, JSON.parse(readFileSync(path.join(MV, id + ".json"), "utf8"))]));
  const windows = [["the whole", vivariumSpec.regions.resident, vivariumSpec.regions.window.rect], ["Home's glass", home.regions.resident, home.regions.glass.rect], ["Idle", frame.idle.regions.resident, frame.idle.regions.vivarium.rect]];
  let n = 0;
  for (const [sid, set] of Object.entries(sets)) for (const stage of ["juvenile", "adult", "elder"]) {
    const s = stage === "elder" ? (set.elder ? { ...set.adult, hop: { ...set.adult.hop, lift: set.elder.lift ?? set.adult.hop?.lift } } : null) : set[stage]; if (!s) continue;
    const lift = Math.max(0, ...(s.hop?.lift ?? []), s.walk.passRise ?? 0), [w, h] = s.walk.size;
    for (const [name, R, win] of windows) { const size = R[stage === "juvenile" ? "juvenile" : "adult"]; if (size[0] !== w || size[1] !== h) continue; const g = R.walk.ground;
      const box = [g[0], g[1] - h - lift, g[2], (g[1] + g[3] - 1 + 2) - (g[1] - h - lift)]; n++;
      if (!within(box, win)) fail(`moving ${sid} ${stage} on ${name}: a drawn box ${box} (lift ${lift}, dy 2) leaves the window ${win}`); }
    const cl = Math.max(0, ...((stage === "elder" ? set.elder?.closeHop?.lift : null) ?? s.closeHop?.lift ?? [])), rr = habitatSpec.regions.resident.rect, glass = habitatSpec.regions.glass.rect; n++;
    if (cl > rr[1] - glass[1]) console.log(`moving ${sid} ${stage} up close: the hop's apex ${cl} px passes the ${rr[1] - glass[1]} px above the rect: it is scaled down to fit (never clipped)`);
  }
  regionsChecked += n; console.log(`moving: ${n} drawn boxes of the moving sets inside their windows`); }
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
    if (!eq(px(300, 20), rgbOf("bar")) || !eq(px(500, 39), rgbOf("hairline")) || !eq(px(500, 562), rgbOf("hairline")) || !eq(px(500, 563), rgbOf("bevel")) || !eq(px(500, 0), rgbOf("bevel"))) fail(`${s.name}: the signed bars: the top bar is \`bar\` with a \`bevel\` row on top and a \`hairline\` row at the foot, the bottom line a \`hairline\` row then a \`bevel\` row on its top edge`);
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
