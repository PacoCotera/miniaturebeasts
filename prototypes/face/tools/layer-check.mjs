#!/usr/bin/env node
// The art director's layer table on the real pictures: the Station page with ?face=lvgl&test, Pods in each of its states, and at each the pixels outside the palette on
// pass 1 (chrome) and pass 2 (chrome and art), which must read 0 (painted pictures show only on pass 3). Prints one line per state; exits 1 on any other reading.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/face/tools/layer-check.mjs   (after build.sh)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
if (!existsSync(path.join(here, "../dist/face.wasm"))) { console.error("the face is not built (prototypes/face/build.sh)"); process.exit(2); }
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".wasm": "application/wasm", ".css": "text/css" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, fails = [], fail = (m) => { fails.push(m); console.error("FAIL " + m); };
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
if (process.env.DUMP) page.on("request", (r) => { if (/wasm|face\.mjs/.test(r.url())) console.log("loads", r.url()); });
page.on("pageerror", (e) => fail("pageerror: " + e.message));
const fixture = readFileSync(path.join(root, "station/tests/fixtures/save-v8-schema1.json"), "utf8");
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev&face=lvgl&test`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
await page.evaluate(() => { window.__st.seedCrate("S01", 3, 4242); window.__st.openBay(); }); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
const pods = await page.evaluate(() => window.__st.ST.tray.map((p) => p.id));
if (pods.length < 2) fail("fewer than two pods in the rack: " + pods.length);
const read = async (name) => {
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => { const f = window.__st.face; const out = {}; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); return out; });
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8));
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
};
const go = (id, f, view, ci) => page.evaluate(([id, f, view, ci]) => window.__st.podsGo(id, f, view, ci), [id, f, view, ci]);
await go(pods[0], "place.0", "collection"); await read("collection");
await go(pods[0], "pod", "overview"); await read("overview, unidentified");
if (process.env.DUMP) { await page.waitForTimeout(500); const lg = await page.evaluate(() => { let l = null; for (let m; (m = window.__st.face.poll("log"));) l = m; return l; }); console.log(JSON.stringify(lg.regions.filter((r) => r.id === "pod" || r.id === "bench.room"))); const by = {}; for (const r of lg.regions) { const k = r.layer; (by[k] = by[k] || []).push(r.id + "@" + r.rect.join(",")); } for (const k of Object.keys(by)) console.log(k, by[k].join(" | ").slice(0, 1500)); }
await page.evaluate((id) => window.__st.skipRead(id), pods[0]); await page.evaluate((id) => window.__st.skipRead(id), pods[1]);
await go(pods[0], "pod", "overview"); await read("overview, identified, pod focused");
await go(pods[0], "kin.0", "overview"); await read("overview, kin focused");
await go(pods[0], "hatch", "overview"); await read("overview, hatch focused");
await go(pods[0], "rail.0", "overview"); await read("overview, a rail tab focused");
await go(pods[0], "rail.0", "chapter", 0); await read("chapter page");
await go(pods[0], "kin.0", "overview"); await page.evaluate(() => window.__st.act("confirm")); await read("compare");
await browser.close(); server.close();
console.log(fails.length ? fails.length + " failure(s)" : "layer check ok"); process.exit(fails.length ? 1 : 0);
