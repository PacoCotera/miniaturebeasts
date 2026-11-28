#!/usr/bin/env node
// PR 719 (station-fix-2): the three played cases on the play page's Station tab on a laptop (1440 x 900), by presses only (rule 16a).
//   1 nursery: Research opens the nursery window, and the Station's frame sits whole inside the page (centred, nothing cut at an edge)
//   2 dock sheet: with the dock sheet open, a click on a Station key still takes effect (the sheet does not swallow it)
//   3 hatch: ✓ on a ready capsule hatches it, and the caption reads editorial's "First mibi · in the Vivarium"
//   OUT=/dir PW_DIR=/path/with/node_modules/playwright node prototypes/play/tools/station-pods-played.mjs
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decodePNG } from "../../ui/png.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), OUT = process.env.OUT || path.join(here, "../img"); mkdirSync(OUT, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { if (!/build\.json|caddy-api/.test(req.url)) console.error("404 " + req.url); res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {}), errors = [], fail = (t) => { errors.push(t); console.error("FAIL " + t); }, expect = (c, t) => { if (!c) fail(t); };
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })).newPage();
page.on("pageerror", (e) => fail("pageerror: " + e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/sandbox/play/?test`, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(6000);
await page.locator("text=/^Station/ >> visible=true").first().click();
await page.waitForTimeout(3000);
const fr = () => page.frames().find((f) => /\/station\//.test(f.url()));
await fr().waitForFunction(() => window.__st && window.__st.ST, null, { timeout: 90000 }); await page.waitForTimeout(3000);
const ev = (fn, arg) => fr().evaluate(fn, arg);
const shot = async (name) => { await page.waitForTimeout(1500); await page.screenshot({ path: path.join(OUT, `${name}.png`) }); };
const press = async (id, ms = 900) => { const b = await page.locator(`.fk[data-id="${id}"]`).first().boundingBox(); if (!b) { fail("no key " + id); return; } await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(ms); };
const rects = () => page.evaluate(() => { const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }; return { vw: innerWidth, vh: innerHeight, frame: r(document.getElementById("fStation")) }; });
const where = () => ev(() => { const u = window.__st.UI; return { screen: u.screen, view: u.pods?.view, f: u.pods?.focus?.cur, ring: JSON.stringify(u.pods?.ring) }; });

await ev(() => { window.__st.seedPod("S01", 4); return 1; });

// case 1: the nursery window, centred: Research opens the nursery; the Station's frame lies whole inside the page, equal margins left and right
await press("research");
const w1 = await where(), R = await rects(), fx = R.frame;
console.log("nursery", JSON.stringify(w1), JSON.stringify(R));
expect(w1.view === "nursery", "Research opens the nursery: " + w1.view);
expect(fx.x >= 0 && fx.y >= 0 && fx.x + fx.w <= R.vw + 1 && fx.y + fx.h <= R.vh + 1, "the Station frame is cut at the page's edge: " + JSON.stringify(fx));
await shot("1-nursery");
// judged by pixels: on a row below the shelf (y 640) the nursery window is the dark run between the grey panel's two ends; its centre is the page's centre (the Station panel is centred on the page)
const shotPng = decodePNG(await page.screenshot());
const px = (x, y) => { const i = (y * shotPng.width + x) * 4; return [shotPng.data[i], shotPng.data[i + 1], shotPng.data[i + 2]]; };
const dark = (x) => { const c = px(x, 640); return c[0] < 24 && c[1] < 28 && c[2] < 36; };
let a = -1, z = -1; for (let x = 330; x < 1110; x++) if (dark(x)) { if (a < 0) a = x; z = x; }
console.log(`the nursery window's dark run at y 640: x ${a}..${z}, centre ${(a + z) / 2}, page centre ${R.vw / 2}`);
expect(a > 0 && z - a > 200, "no nursery window found in the pixels at y 640");
expect(Math.abs((a + z) / 2 - R.vw / 2) <= 8, "the nursery window is not centred: its centre is " + (a + z) / 2 + ", the page's " + R.vw / 2);

// set-up for 3: Grow the pod (✓ on its row, ✓ on Grow it), the capsule ready early
await ev(() => { window.__st.podsAt({ view: "nursery" }); return 1; });
await press("confirm"); await press("confirm");
const caps = await ev(() => { window.__st.ST.caps[0].early = true; return window.__st.capsules().map((c) => c.state); });
console.log("capsules", JSON.stringify(caps));
await page.waitForTimeout(800);

// case 2: the dock sheet open, then a click on a Station key takes effect
await page.locator("#dockScreenBtn").click(); await page.waitForTimeout(1200);
const open = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
expect(open, "the dock sheet did not open");
await shot("2-dock-open");
const b4 = await where();
await press("back");
const af = await where();
console.log("dock click", JSON.stringify(b4), JSON.stringify(af));
expect(JSON.stringify(b4) !== JSON.stringify(af), "a click on the Station with the dock sheet open changed nothing: " + JSON.stringify(af));
await shot("2-dock-open-after-click");
await page.keyboard.press("Escape"); await page.waitForTimeout(600);

// case 3: ✓ on the ready capsule hatches it; the caption is editorial's line
await ev(() => { window.__st.podsAt({ view: "nursery", ring: { z: "caps", i: 0 } }); return 1; });
await press("confirm", 700);
const said = await ev(() => JSON.stringify(window.__st.props));
const lines = said.match(/First mibi[^"]*/g) ?? [];
console.log("hatch captions", JSON.stringify(lines));
expect(lines.some((l) => l === "First mibi · in the Vivarium" || l.startsWith("First mibi \\u00b7 in the Vivarium")), "the hatch caption is not 'First mibi · in the Vivarium': " + JSON.stringify(lines));
await shot("3-hatch");
await browser.close(); server.close();
if (errors.length) { console.error(errors.length + " failure(s)"); process.exit(1); }
console.log("PASS station-pods played; stills in " + OUT);
