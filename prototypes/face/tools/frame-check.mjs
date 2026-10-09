#!/usr/bin/env node
// L1: the frame in LVGL. Loads the Station on the Pods screen twice, with ?face=lvgl and without, from the same save, and checks what
// the face drew against the frame spec (specs/station/frame.json) and against the JavaScript renderer's frame: the rules, the ground,
// the separators, where each text run's ink lies in its region (centred, left or right as the spec says), the focus ring in the focus
// role, the message plate, the counters' tick; every string in Inter 16, 20 or 28 px through LVGL's font engine and nothing refused.
// It writes the captures it checks (prototypes/face/img/l1-*.png): the face's frame beside the JavaScript renderer's.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/frame-check.mjs   (after build.sh)
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { decodePNG } from "../../ui/png.mjs";
import { pageSize } from "../../ui/layout.mjs";
import { ringMask, tabRingMask } from "../../ui/rings.mjs";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), img = path.join(here, "../img");
mkdirSync(img, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".wasm": "application/wasm", ".css": "text/css" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, fails = [], expect = (ok, what) => { if (!ok) { fails.push(what); console.error("FAIL " + what); } };
const fixture = readFileSync(path.join(root, "station/tests/fixtures/save-v8-schema1.json"), "utf8"), frame = JSON.parse(readFileSync(path.join(root, "ui/specs/station/frame.json"), "utf8"));
const pods = JSON.parse(readFileSync(path.join(root, "ui/specs/station/pods.json"), "utf8"));
const palette = Object.fromEntries(JSON.parse(readFileSync(path.join(root, "ui/palettes/station.json"), "utf8")).colours);
const rgbOf = (name) => { const h = palette[name]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const browser = await chromium.launch();
const errors = [];
async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
  await page.goto(`http://127.0.0.1:${port}/sandbox/station/?${query}`, { waitUntil: "load" });
  await page.evaluate(() => window.__st.ready); await page.evaluate(() => { window.__st.unlock(); window.__st.act("research"); window.__st.podsGo(window.__st.ST.tray[0].id, "pod"); }); await page.waitForTimeout(600);   // Pods opens on the collection; this screen is the first pod's overview
  return page;
}
// the screen's pixels, as an RGB array, through the page's own capture
const pixels = async (page) => { await page.waitForTimeout(120); const b64 = await page.evaluate(() => window.__st.capture().split(",")[1]); return decodePNG(Buffer.from(b64, "base64")).data; };
const px = (d, x, y) => [d[(y * 1024 + x) * 4], d[(y * 1024 + x) * 4 + 1], d[(y * 1024 + x) * 4 + 2]];
const eq = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
// the ink of a region: the bounding box of the pixels that are not its background (the pixel at its top left)
const ink = (d, [x, y, w, h]) => { const bg = px(d, x, y); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!eq(px(d, i, j), bg)) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, j); y1 = Math.max(y1, j); } return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1]; };
const shot = async (page, name, wait = 120) => { await page.waitForTimeout(wait); const b = Buffer.from(await page.evaluate(() => window.__st.capture().split(",")[1]), "base64"); writeFileSync(path.join(img, name), b); return decodePNG(b).data; };

// one page at a time: a page behind another does not run its animation frames
const ref = await open("dev"), R = await pixels(ref); await shot(ref, "l1-pods-frame-js.png"); await ref.close();
const face = await open("face=lvgl&dev");
const f = await face.evaluate(() => window.__st.face);
expect(f && f.version === "LVGL 9.6.0", "the face is loaded");
const D = await pixels(face);
const C = frame.colours, Rg = frame.regions;
// the rules and the ground, from the spec
expect(eq(px(D, 300, 20), rgbOf(C.chrome)), "the top bar is the chrome ground: " + px(D, 300, 20));
expect(eq(px(D, 500, 39), rgbOf(C.rule)) && eq(px(D, 500, 38), rgbOf(C.chrome)), "the top bar's rule is 1 px on its bottom edge");
expect(eq(px(D, 500, 562), rgbOf(C.rule)) && eq(px(D, 500, 563), rgbOf(C.chrome)), "the bottom line's rule is 1 px on its top edge");
expect(eq(px(D, 300, 570), rgbOf(C.chrome)), "the bottom line is the chrome ground");
for (const x of Rg.separators.x) expect(eq(px(D, x, 580), rgbOf(C.dot)) && eq(px(D, x - 1, 580), rgbOf(C.chrome)) && eq(px(D, x + 1, 580), rgbOf(C.chrome)), `a 1 px separator at x ${x}`);
// the whole screen against the canvas renderer's, pixel for pixel outside the type (the two engines set glyphs by their own rounding, and blend a translucent layer within 3 levels of each other): the room, the dish, the pod, the wells, the rail, the rings, the panes
{ const nodes = await face.evaluate(() => window.__st.faceNodes()), boxes = nodes.filter((n) => n.kind === "text").map((n) => [n.rect[0] - 4, n.rect[1] - 8, n.rect[2] + 8, n.rect[3] + 12]);
  const inText = (i, j) => boxes.some((b) => i >= b[0] && i < b[0] + b[2] && j >= b[1] && j < b[1] + b[3]); let diff = 0, total = 0; const firsts = [];
  for (let j = 0; j < 600; j++) for (let i = 0; i < 1024; i++) { if (inText(i, j)) continue; total++; const a = px(D, i, j), b = px(R, i, j); if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 3) { diff++; if (firsts.length < 5) firsts.push([i, j, a, b]); } }
  console.log(`face against the canvas renderer outside the type: ${diff} of ${total} pixels differ ${JSON.stringify(firsts)}`);
  expect(diff <= total * 0.001, `the face draws the screen as the canvas renderer does outside the type (${diff} of ${total} differ)`); }
// where the ink of each region lies, against the JavaScript renderer's (the engines place glyphs by their own rounding: within 3 px)
const TX = Rg.action.rect[0] + Rg.action.capSize[0] + Rg.action.capGap, regions = { title: Rg.title.text, materials: Rg.materials.rect, companion: Rg.companion.rect, subject: Rg.subject.rect, need: Rg.need.rect, action: [TX, Rg.action.rect[1], Rg.action.rect[2] - (TX - Rg.action.rect[0]), Rg.action.rect[3]], back: Rg.back.rect };   // the verb's own region: after the cap
for (const x of Rg.topRules.x) expect(eq(px(D, x, 20), rgbOf(C.topRule)) && eq(px(D, x - 1, 20), rgbOf(C.chrome)), `a 1 px hairline rule at x ${x} in the top bar`);
const rows = [];
const L0 = await face.evaluate(() => window.__st.lineFor()), needNow = L0.need ?? "";   // Pods says its own notice (the shared need line is empty here)
const present = { back: !!L0.back, need: !!needNow, subject: !!L0.subject, action: !!L0.ok };   // what the screen's line says: a slot that says something has ink in both renderers; a missing way back is a failure, not a skip
expect(present.back, "the screen's line has a way back");
for (const [name, r] of Object.entries(regions)) {
  const a = ink(D, r), b = ink(R, r);
  if (name in present && !present[name]) { expect(!a && !b, `${name}: the line says nothing here, so no ink in either renderer`); continue; }
  expect(a && b, `${name}: ink in both renderers`); if (!a || !b) continue;
  const left = a[0] - b[0], right = a[0] + a[2] - (b[0] + b[2]), top = a[1] - b[1], bottom = a[1] + a[3] - (b[1] + b[3]);
  rows.push(`${name.padEnd(10)} face ${a.join(",")}  js ${b.join(",")}  edges ${left}/${right} (x)  ${top}/${bottom} (y)`);
  expect(Math.abs(top) <= 2 && Math.abs(bottom) <= 2, `${name}: the ink sits on the same lines (${top}/${bottom})`);
  const align = name === "subject" || name === "materials" ? Math.abs((a[0] + a[2] / 2) - Rg[name].centre) : name === "need" || name === "companion" || name === "back" ? Math.abs(a[0] + a[2] - Rg[name].right) : name === "title" ? Math.abs(a[0] - Rg.title.text[0]) : Math.abs(a[0] - TX);   // the title after the room's mark, the verb after the cap's room
  expect(align <= 3, `${name}: aligned as the spec says (off by ${align.toFixed(1)})`);
}
console.log(rows.join("\n"));
// the type: every run is Inter 16, 20 or 28 through the face, none refused
const refused = await face.evaluate(() => window.__st.face.refused());
expect(refused === 0, "no node refused by the face: " + refused);
// the focus ring, in the focus role: its rectangle is the target's ±4 px (the creature's ellipse: the box's width + 16 by 24 under its feet),
// 2 px wide with a 6 px corner radius, and the face drew its mask pixel for pixel; nothing of it lies outside its rectangle
const ringRgb = rgbOf(C.ring), RG = frame.focus.ring, FT = frame.focus.feet;
const ringCheck = async (what) => {
  const img = await shot(face, `l1-ring-${what}.png`, 200), nodes = await face.evaluate(() => window.__st.faceNodes()), tg = await face.evaluate(() => ({ cur: window.__st.UI.pods.focus.cur, targets: window.__st.targets() }));
  const target = tg.targets.find((x) => x.id === tg.cur), [tx, ty, tw, th] = target.rect, n = nodes.find((q) => q.id === "focus");
  const kr = tw / 2 + RG.outside, PR = pods.regions.collection.ring, want = what === "place" ? [tx + PR.centre[0] - PR.focus.radius, ty + PR.centre[1] - PR.focus.radius, 2 * PR.focus.radius, 2 * PR.focus.radius] : what === "circle" ? [tx + tw / 2 - kr, ty + th / 2 - kr, 2 * kr, 2 * kr] : [tx - RG.outside, ty - RG.outside, tw + 2 * RG.outside, th + 2 * RG.outside];
  expect(n && JSON.stringify(n.rect) === JSON.stringify(want), `${what}: the ring's rectangle is the target's ${what === "circle" || what === "place" ? "circle round its centre" : "±4 px"}: ${n && n.rect} (want ${want})`);
  const [x, y, w, h] = want, mask = what === "place" || what === "circle" ? ringMask(w, h, RG.width, 0, "ellipse") : ringMask(w, h, RG.width, RG.radius); let on = 0, miss = 0, stray = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const c = eq(px(img, x + i, y + j), ringRgb); if (mask[j * w + i]) { on++; if (!c) miss++; } else if (c && (i < RG.width || j < RG.width || i >= w - RG.width || j >= h - RG.width)) stray++; }
  expect(on > 0 && miss === 0 && stray === 0, `${what}: the face drew the ring's ${on} pixels (${RG.width} px wide${what === "round" ? ", radius " + RG.radius : ""}) exactly: ${miss} missing, ${stray} stray`);
};
await ringCheck("round");   // the pod is focused: the rounded rectangle round its box, never an ellipse on the dish
await face.evaluate(() => { const g = window.__st.ST, p = g.tray.find((q) => q.idd), q = JSON.parse(JSON.stringify(p)); q.id = "kin-check"; g.tray.push(q); window.__st.podsGo(p.id, "pod"); });   // a second pod of the species: the pod's kin
const tg = await face.evaluate(() => window.__st.targets()), well = tg.find((t) => /^kin\.\d+$/.test(t.id)), round = tg.find((t) => t.id === "hatch");
await face.evaluate((id) => { window.__st.UI.pods.focus.cur = id; }, well.id); await ringCheck("circle");
await face.evaluate((id) => { window.__st.UI.pods.focus.cur = id; }, round.id); await ringCheck("round");
await face.evaluate(() => { const s = window.__st; s.podsGo(s.ST.tray[0].id, "place.0", "collection"); }); await ringCheck("place");
await face.evaluate(() => { const s = window.__st; s.podsGo(s.ST.tray.find((q) => q.idd).id, "pod", "overview"); });
await face.evaluate(() => { window.__st.UI.pods.focus.cur = "pod"; });
await shot(face, "l1-pods-frame.png");
// the verb on the bottom line is in the action's colour (the ✓ cap is a slot until its master lands)
{ let n = 0; const tk = rgbOf(C.verb); for (let j = Rg.action.rect[1]; j < Rg.action.rect[1] + Rg.action.rect[3]; j++) for (let i = Rg.action.rect[0]; i < Rg.action.rect[0] + 80; i++) { const q = px(D, i, j); if (Math.abs(q[0] - tk[0]) + Math.abs(q[1] - tk[1]) + Math.abs(q[2] - tk[2]) < 60) n++; } expect(n > 6, `the verb is drawn in the action's colour ${C.verb}, anti-aliased (${n} px near it)`); }
// the message plate: centred on 512, at most 640 wide, its bottom edge at 550, there at 3.5 s and gone at 4.3 s
const PL = frame.regions.plate, t0 = Date.now(); await face.evaluate(() => window.__st.say("The pod needs a little more Energy before it can be read."));
const P = await shot(face, "l1-plate.png", 300), plateCol = rgbOf(C.plate), edge = rgbOf(C.plateEdge);
let py0 = -1, py1 = -1; for (let j = 40; j < 562; j++) if (eq(px(P, 512, j), edge) || eq(px(P, 512, j), plateCol)) { if (py0 < 0) py0 = j; py1 = j; }
expect(py0 > 0 && py1 + 1 === PL.bottom, `the plate's bottom edge is y ${PL.bottom}: it ends at ${py1 + 1}`);
let px0 = 1e9, px1 = -1; for (let i = 0; i < 1024; i++) if (eq(px(P, i, py0), edge)) { px0 = Math.min(px0, i); px1 = Math.max(px1, i); }
expect(Math.abs((px0 + px1 + 1) / 2 - PL.centre) <= 1 && px1 - px0 + 1 <= PL.maxWidth, `the plate is centred on ${PL.centre} (x ${px0} to ${px1}) and at most ${PL.maxWidth} wide (${px1 - px0 + 1})`);
await face.waitForTimeout(Math.max(0, 3500 - (Date.now() - t0))); const P35 = await pixels(face);
expect(eq(px(P35, 512, py0), edge), "the plate is still up at 3.5 s");
await face.waitForTimeout(Math.max(0, 4300 - (Date.now() - t0))); const Q = await pixels(face);
expect(!eq(px(Q, 512, py0), edge) && eq(px(Q, 512, py1 - 2), px(D, 512, py1 - 2)), "the plate is gone at 4.3 s");
// a counter that changed: its tick (amber behind the figure) is there at once and cleared after flashMs
await face.evaluate(() => window.__st.addMaterials(1, 0, 0));
const flash = (img) => { let n = 0; const am = rgbOf(C.flash); for (const j of [9, 30]) for (let i = Rg.materials.rect[0]; i < Rg.materials.rect[0] + Rg.materials.rect[2]; i++) if (eq(px(img, i, j), am)) n++; return n; };   // above and below the icons: only the tick reaches there
const A = await shot(face, "l1-tick.png", 60); expect(flash(A) > 10, `a changed counter wears the amber tick (${flash(A)} px)`);
await face.waitForTimeout(Rg.materials.flashMs + 200); const A2 = await pixels(face); expect(flash(A2) === 0, `the tick is cleared after ${Rg.materials.flashMs} ms (${flash(A2)} px left)`);
// The slanted rail (L1b): the Tuiki pod is identified, the ring goes up to the rail's first tab. The nodes follow frame.json's rail numbers;
// the pixels the face drew are the nodes' (the slants, the hairlines, the ring's four sides), and nothing of the ring is above y 42.
await face.evaluate(() => { const p = window.__st.ST.tray.find((q) => q.idd); window.__st.podsGo(p.id, "pod"); window.__st.act("up"); });
const RL = frame.regions.rail, lean = (r) => Math.floor((RL.slant * (r + 0.5)) / RL.h);
const T = await shot(face, "l1b-rail.png", 400), nodes = await face.evaluate(() => window.__st.faceNodes());
const tabs = nodes.filter((n) => /^rail\.\d+$/.test(n.id)).sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
expect(tabs.length >= 1, "the rail has tabs"); 
tabs.forEach((t, i) => { expect(t.rect[1] === 1 + RL.y && t.rect[3] === RL.h - 2, `tab ${i}: the body hangs from y ${RL.y}, ${RL.h} tall with its rim rows`); });
const widths = tabs.map(() => (tabs.length <= RL.fullUpTo ? RL.full : RL.compact)), run = widths.reduce((a, b) => a + b, 0) + RL.slant, x0c = Math.floor((RL.centred.on - run / 2) / RL.centred.snap) * RL.centred.snap;   // the rail is centred on x 512 and snapped to the grid
let at = x0c; const tabX = []; for (let i = 0; i < tabs.length; i++) { tabX.push([at, widths[i]]); at += widths[i]; }
tabs.forEach((t, i) => expect(t.rect[0] === tabX[i][0] + RL.slant && t.rect[2] === tabX[i][1] - RL.slant, `tab ${i} starts where the one before ends (x ${tabX[i][0]}, width ${tabX[i][1]})`));
expect(at + RL.slant - x0c === (tabs.length <= RL.fullUpTo ? RL.full * tabs.length + RL.slant : RL.compact * tabs.length + RL.slant), "the run is the sum of the widths plus the slant (no tab is open on the overview, so seven or more are all compact)");
// the pixels: each tab's two slants carry the hairline at the column the line gives, row by row; the body's middle is the fill; the top rule above is the bar's
tabX.forEach(([x0, w], i) => {
  const rimN = nodes.find((q) => q.id === `rail.${i}.et`), rim = rgbOf(rimN.colour);
  for (const r of [0, 10, 20, 30, 38, 39]) {
    const y = 40 + r, xl = x0 + lean(r), xr = x0 + w + lean(r);
    expect(eq(px(T, xl, y), rim), `tab ${i} row ${r}: the left slant hairline at x ${xl}`);
    expect(eq(px(T, xr, y), rim) || eq(px(T, xr, y), rgbOf(C.ring)) || eq(px(T, xr - 1, y), rgbOf(C.ring)), `tab ${i} row ${r}: the right slant hairline at x ${xr}`);
  }
  expect(eq(px(T, x0 + 16, 40), rim) && eq(px(T, x0 + 16, 79), rim), `tab ${i}: the top and bottom edges are the hairline (y 40 and 79)`);
  // the colours from the spec: the rim is the rail's edge colour; the body fill is the state's (unread, read, open or sealed)
  const body = nodes.find((q) => q.id === `rail.${i}`), fills = Object.values(RL.states).filter((q) => q && q.fill).map((q) => q.fill);
  expect(rimN.colour === RL.states.edge && fills.includes(body.colour), `tab ${i}: the rim is ${RL.states.edge} and the body one of the states' fills (${body.colour})`);
  expect(eq(px(T, x0 + 22, 78), rgbOf(body.colour)), `tab ${i}: the body's fill is ${body.colour} at (${x0 + 22}, 78)`);
  // the label and the pips at the heights the spec gives
  const emb = nodes.find((q) => q.id === `rail.${i}.emblem`), pip = nodes.find((q) => new RegExp(`^rail\\.${i}\\.pip\\.0(\\.t)?$`).test(q.id)), L = w === RL.full ? RL.full_layout : RL.compact_layout;
  expect(emb && emb.rect[1] === (L.labelY ?? L.emblemY), `tab ${i}: the emblem at y ${L.labelY ?? L.emblemY}: ${emb && emb.rect}`);
  if (pip) expect(pip.rect[1] === L.pipsY, `tab ${i}: the pips at y ${L.pipsY}: ${pip.rect}`);
});
const ringRgbT = rgbOf(C.ring), fi = nodes.findIndex((n) => /^rail\.\d+\.focus$/.test(n.id)); expect(fi >= 0, "the focused tab wears the ring"); const ringNode = nodes[fi];
const [bx, by, bw, bh] = ringNode.rect, focusTab = tabX[+ringNode.id.split(".")[1]];
expect(bx === focusTab[0] - 4 && by === 42 && bw === focusTab[1] + 24 && bh === 42, `the ring's box is (x - 4, 42, w + 24, 42): ${ringNode.rect}`);
{ const m = tabRingMask(focusTab[1], { tab: frame.focus.ring.tab, width: frame.focus.ring.width, tabTop: frame.regions.rail.y }); let miss = 0, on = 0;   // the face drew the ring's mask, pixel for pixel
  for (let j = 0; j < m.h; j++) for (let i = 0; i < m.w; i++) if (m.mask[j * m.w + i]) { on++; if (!eq(px(T, bx + i, by + j), ringRgbT)) miss++; }
  expect(on > 200 && miss === 0, `the face drew the tab ring's ${on} pixels exactly (${miss} missing)`); }
for (let i = bx; i < bx + bw; i++) for (const j of [40, 41]) if (eq(px(T, i, j), ringRgbT)) expect(false, "no ring pixel above y 42");
{ const m = tabRingMask(focusTab[1], { tab: frame.focus.ring.tab, width: frame.focus.ring.width, tabTop: frame.regions.rail.y }), cols = Array.from({ length: m.w }, (_, i) => i).filter((i) => m.mask[2 * m.w + i] === 0 && m.mask[m.w + i] && m.mask[i]);   // the top run's columns: rows 42 and 43 in the ring, 44 not (an emblem may stand under it in the same cream)
  expect(cols.length > 8 && cols.every((i) => eq(px(T, bx + i, 42), ringRgbT) && eq(px(T, bx + i, 43), ringRgbT)) && cols.some((i) => !eq(px(T, bx + i, 44), ringRgbT)), "the top run is 2 px at y 42"); }
await shot(face, "l1b-rail-ring-on-tab.png", 50);
// Every state of Pods against the canvas renderer's, outside the type: the collection, the overview, the chapter page and Compare. Each runs the same setup on a page of each engine.
const SETUPS = {
  collection: () => { const s = window.__st; s.podsGo(s.ST.tray[0].id, "place.0", "collection"); },
  overview: () => { const s = window.__st, p = s.ST.tray.find((q) => q.idd); s.podsGo(p.id, "pod", "overview"); },
  chapter: () => { const s = window.__st, p = s.ST.tray.find((q) => q.idd); s.skipRead(p.id); s.podsGo(p.id, "rail.0", "chapter"); },
  compare: () => { const s = window.__st, p = s.ST.tray.find((q) => q.idd), q = JSON.parse(JSON.stringify(p)); q.id = "kin-compare"; s.ST.tray.push(q); s.skipRead(p.id); s.skipRead(q.id); s.podsGo(p.id, "pod", "overview"); s.UI.pods.cmp = { a: p.id, b: q.id, ci: 0 }; },
};
for (const [name, setup] of Object.entries(SETUPS)) {
  const js = await open("dev"); await js.evaluate(setup); await js.waitForTimeout(500); const Rs = await pixels(js); await js.close();
  const fc = await open("face=lvgl&dev"); await fc.evaluate(setup); await fc.waitForTimeout(500); const Ds = await pixels(fc), nodesS = await fc.evaluate(() => window.__st.faceNodes());
  expect(await fc.evaluate(() => window.__st.face.refused()) === 0, `${name}: no node refused by the face`);
  expect(await fc.evaluate(() => window.__st.renderErrors.length) === 0, `${name}: no render threw`);
  const mode = await fc.evaluate(() => (window.__st.UI.pods.cmp ? "compare" : window.__st.UI.pods.view)); expect(mode === name, `${name}: the screen is in its state (${mode})`);
  const boxes = nodesS.filter((n) => n.kind === "text").map((n) => [n.rect[0] - 4, n.rect[1] - 8, n.rect[2] + 8, n.rect[3] + 12]);
  let diff = 0, total = 0; for (let j = 0; j < 600; j++) for (let i = 0; i < 1024; i++) { if (boxes.some((b) => i >= b[0] && i < b[0] + b[2] && j >= b[1] && j < b[1] + b[3])) continue; total++; const a = px(Ds, i, j), b = px(Rs, i, j); if (Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 3) diff++; }
  console.log(`${name.padEnd(10)} face against the canvas renderer outside the type: ${diff} of ${total} pixels differ`);
  expect(diff <= total * 0.002, `${name}: the face draws the state as the canvas renderer does outside the type (${diff} of ${total} differ)`);
  if (name === "chapter") {   // the pane takes its size from the trait count (pods.json page.sizeByCount): drawn by the face at that width, left edge 424, top 112
    const R = pods.regions.chapter.page, pane = nodesS.find((n) => n.kind === "nineSlice" && n.rect[0] === R.rect[0] && n.rect[1] === R.rect[1]), count = nodesS.filter((n) => /\.c\d+\.name$/.test(n.id)).length;
    expect(!!pane, "chapter: the page's pane is drawn at the spec's left edge and top");
    if (pane) expect(pane.rect[2] === pageSize(R, count)[0] && pane.rect[3] === pageSize(R, count)[1], `chapter: the pane is ${pageSize(R, count)} for ${count} traits: ${pane.rect}`);
  }
  await fc.close();
}
expect(errors.length === 0, "no page errors: " + errors.join(" | "));
await browser.close(); server.close();
if (fails.length) { console.error("frame check failed"); process.exit(1); }
console.log("frame check ok");
