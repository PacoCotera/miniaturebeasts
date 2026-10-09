#!/usr/bin/env node
// The art director's layer table on the real pictures (today the page's own adapter tags painted pictures by their asset policy; the table in the words is held by layers.test.mjs until the asset message carries the policy, B4a-2): the Station page with ?face=lvgl&test, Pods in each of its states, and at each the pixels outside the palette on
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
page.on("pageerror", (e) => fail("pageerror: " + e.message));
const fixture = readFileSync(path.join(root, "station/tests/fixtures/save-v8-schema1.json"), "utf8");
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev&face=lvgl&test`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
await page.evaluate(() => window.__st.seedCrate("S04", 2, 4101)); await page.evaluate(() => window.__st.act("dock")); await page.waitForTimeout(300);
await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
const pair = await page.evaluate(() => window.__st.ST.tray.filter((p) => p.species === "S04" && !p.idd).map((p) => p.id));   // a fresh crate of two pods of one species, as journey.mjs compareShot does
if (pair.length !== 2) fail("no two pods of one species in the rack");
const pods = pair;
const ui = () => page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, cur: window.__st.UI.pods.cur, focus: window.__st.UI.pods.focus.cur, cmp: !!window.__st.UI.pods.cmp }));
const read = async (name, want) => {
  await page.waitForTimeout(700);
  const u = await ui(); for (const [k, v] of Object.entries(want)) if (u[k] !== v) fail(`${name}: ${k} is ${JSON.stringify(u[k])}, wanted ${JSON.stringify(v)}`);
  const r = await page.evaluate(() => { const f = window.__st.face; const out = {}; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); return out; });
  console.log(name.padEnd(34) + " chrome " + String(r.pass1).padStart(8) + " · chrome+art " + String(r.pass2).padStart(8));
  if (r.pass1 !== 0) fail(name + ": chrome reads " + r.pass1 + " off-palette pixels"); if (r.pass2 !== 0) fail(name + ": art reads " + r.pass2 + " off-palette pixels");
};
const go = async (id, f, view, ci) => { for (let i = 0; i < 2; i++) { await page.evaluate(([id, f, view, ci]) => window.__st.podsGo(id, f, view, ci), [id, f, view, ci]); await page.waitForTimeout(300); } };   // twice: the targets of the state are known after its first frame
await go(pods[0], "place.0", "collection"); await read("collection", { screen: "pods", view: "collection", focus: "place.0" });
await go(pods[0], "pod", "overview"); await read("overview, unidentified", { view: "overview", focus: "pod" });
await page.evaluate((ids) => { for (const id of ids) window.__st.skipRead(id); }, pods);
await go(pods[0], "pod", "overview"); await read("overview, identified, pod focused", { view: "overview", focus: "pod" });
await go(pods[0], "kin.0", "overview"); await read("overview, kin focused", { view: "overview", focus: "kin.0", cmp: false });
await go(pods[0], "hatch", "overview"); await read("overview, hatch focused", { view: "overview", focus: "hatch" });
await go(pods[0], "rail.0", "overview"); await read("overview, a rail tab focused", { view: "overview", focus: "rail.0" });
await go(pods[0], "rail.0", "chapter", 0); await read("chapter page", { view: "chapter", focus: "rail.0" });
await go(pods[0], "kin.0", "overview"); await page.evaluate(() => window.__st.act("confirm")); await read("compare", { screen: "pods", cmp: true });
await browser.close(); server.close();
console.log(fails.length ? fails.length + " failure(s)" : "layer check ok"); process.exit(fails.length ? 1 : 0);
