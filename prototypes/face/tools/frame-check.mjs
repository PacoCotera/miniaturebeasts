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
const palette = Object.fromEntries(JSON.parse(readFileSync(path.join(root, "ui/palettes/station.json"), "utf8")).colours);
const rgbOf = (name) => { const h = palette[name]; return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const browser = await chromium.launch();
const errors = [];
async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
  await page.goto(`http://127.0.0.1:${port}/sandbox/station/?${query}`, { waitUntil: "load" });
  await page.evaluate(() => window.__st.ready); await page.evaluate(() => { window.__st.unlock(); window.__st.act("research"); }); await page.waitForTimeout(600);
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
expect(eq(px(D, 500, 100), rgbOf(C.stageGround)), "the stage ground is " + C.stageGround);
// where the ink of each region lies, against the JavaScript renderer's (the engines place glyphs by their own rounding: within 3 px)
const regions = { title: Rg.title.rect, materials: Rg.materials.rect, companion: Rg.companion.rect, subject: Rg.subject.rect, need: Rg.need.rect, action: Rg.action.rect };
const rows = [];
for (const [name, r] of Object.entries(regions)) {
  const a = ink(D, r), b = ink(R, r);
  if (!a && !b) continue;
  expect(a && b, `${name}: ink in both renderers`); if (!a || !b) continue;
  const left = a[0] - b[0], right = a[0] + a[2] - (b[0] + b[2]), top = a[1] - b[1], bottom = a[1] + a[3] - (b[1] + b[3]);
  rows.push(`${name.padEnd(10)} face ${a.join(",")}  js ${b.join(",")}  edges ${left}/${right} (x)  ${top}/${bottom} (y)`);
  expect(Math.abs(top) <= 2 && Math.abs(bottom) <= 2, `${name}: the ink sits on the same lines (${top}/${bottom})`);
  const align = name === "subject" || name === "materials" ? Math.abs((a[0] + a[2] / 2) - Rg[name].centre) : name === "need" || name === "companion" ? Math.abs(a[0] + a[2] - (Rg[name].right ?? 1008)) : Math.abs(a[0] - r[0]);
  expect(align <= 3, `${name}: aligned as the spec says (off by ${align.toFixed(1)})`);
}
console.log(rows.join("\n"));
// the type: every run is Inter 16, 20 or 28 through the face, none refused
const refused = await face.evaluate(() => window.__st.face.refused());
expect(refused === 0, "no node refused by the face: " + refused);
// the focus ring in the focus role, on the focused pod's feet
const ringRgb = rgbOf(C.ring); let ringPx = 0; for (let j = 40; j < 562; j++) for (let i = 0; i < 1024; i++) if (eq(px(D, i, j), ringRgb)) ringPx++;
expect(ringPx > 40, `the focus ring is drawn in ${C.ring} (${ringPx} px)`);
await shot(face, "l1-pods-frame.png");
// the message plate: wood plate, shown for 4 s, centred on 512, bottom edge at 550
await face.evaluate(() => window.__st.say("The pod needs a little more Energy before it can be read.")); await face.waitForTimeout(250);
const P = await shot(face, "l1-plate.png"), plateCol = rgbOf(C.plate), edge = rgbOf(C.plateEdge);
let py0 = -1, py1 = -1; for (let j = 40; j < 562; j++) if (eq(px(P, 512, j), edge) || eq(px(P, 512, j), plateCol)) { if (py0 < 0) py0 = j; py1 = j; }
expect(py0 > 0 && py1 <= 550, `the plate sits above the bottom line, its bottom edge at y ${py1} (the spec: 550)`);
await face.waitForTimeout(4300);
const Q = await pixels(face); expect(eq(px(Q, 512, py1 - 4), px(D, 512, py1 - 4)), "the plate is gone after 4 s");
// a counter that changed: its tick is amber for 240 ms
await face.evaluate(() => window.__st.addMaterials(1, 0, 0));
const A = await shot(face, "l1-tick.png", 90); let amber = 0; const am = rgbOf(C.flash); for (const j of [9, 30]) for (let i = 384; i < 640; i++) if (eq(px(A, i, j), am)) amber++;   // above and below the icons: only the tick reaches there
expect(amber > 10, `a changed counter wears the amber tick (${amber} px)`);
expect(errors.length === 0, "no page errors: " + errors.join(" | "));
await browser.close(); server.close();
if (fails.length) { console.error("frame check failed"); process.exit(1); }
console.log("frame check ok");
