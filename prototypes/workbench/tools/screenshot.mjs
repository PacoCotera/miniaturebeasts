#!/usr/bin/env node
// Loads the page headless, fails on console errors, exercises the journey and writes screenshots to img/.
//   node tools/screenshot.mjs            (serves prototypes/ on a free port, like the site workflow's /sandbox/)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
mkdirSync(path.join(here, "../img"), { recursive: true });
const shot = (name) => page.screenshot({ path: path.join(here, `../img/${name}.png`), fullPage: false });
await page.goto(`http://127.0.0.1:${port}/sandbox/workbench/`, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector("#strip .cell"), null, { timeout: 30000 });
await page.selectOption("#species", "S06");
await page.waitForTimeout(300);
await shot("page-frame");
await page.click("#roll");
await page.waitForTimeout(500);
await shot("page-roll");
// pick two parents and cross
await page.click("#strip .cell:nth-child(2)", { modifiers: ["Shift"] });
await page.click("#strip .cell:nth-child(3)", { modifiers: ["Shift"] });
await page.click("#cross");
await page.waitForTimeout(500);
await shot("page-cross");
// the cross journey on two Loikas (the-cross.md): roll, pick two founders, cross; the forecast panel
// shows quarters for the switches and a range for the blends, the children join the strip; then two
// children crossed as siblings show the penalty (kinship 1/4)
await page.selectOption("#species", "S01");
await page.waitForTimeout(300);
await page.fill("#roll-n", "8");
await page.click("#roll");
await page.waitForTimeout(400);
await page.click("#strip .cell:nth-child(2)", { modifiers: ["Shift"] });
await page.click("#strip .cell:nth-child(3)", { modifiers: ["Shift"] });
await page.click("#cross");
await page.waitForFunction(() => !document.getElementById("forecast-panel").hidden && document.querySelectorAll("#forecast .trait").length >= 5, null, { timeout: 10000 });
const forecastText = await page.textContent("#forecast-panel");
for (const word of ["Markings", "Crown", "Eyes", "Drive", "Efficiency", "in 4", "between"]) if (!forecastText.includes(word)) errors.push(`forecast lacks "${word}"`);
if (!/kinship 0,/.test(forecastText)) errors.push("founders should have kinship 0");
const cells = await page.$$eval("#strip .cell", (cs) => cs.map((c) => c.textContent));
if (!cells.some((t) => /#1 × #2 #1/.test(t))) errors.push("no children in the strip after the cross");
await page.$eval("#forecast-panel", (n) => n.scrollIntoView());
await shot("page-cross-loika");
// siblings: the last two children
await page.click("#strip .cell:nth-last-child(1)", { modifiers: ["Shift"] });
await page.click("#strip .cell:nth-last-child(2)", { modifiers: ["Shift"] });
await page.click("#cross");
await page.waitForTimeout(500);
const sibText = await page.textContent("#forecast-hint");
if (!/kinship 0\.25/.test(sibText)) errors.push(`siblings should have kinship 0.25: ${sibText}`);
await shot("page-cross-siblings");
await page.selectOption("#species", "S06");
await page.waitForTimeout(300);
// open a trait's loci, then compare it
await page.click("#chapters .trait");
await page.keyboard.press("o");
await page.waitForTimeout(200);
await shot("page-loci");
await page.fill("#roll-n", "4");
await page.click("#compare");
await page.waitForTimeout(800);
await (await page.$("#compare-panel")).screenshot({ path: path.join(here, "../img/page-compare.png") });
// record a verdict (the prompt is answered with a note) and check the frame
page.once("dialog", (d) => d.accept("checked in the workbench"));
await page.click("#compare-grid .verdict button");
await page.waitForTimeout(300);
await page.click("#check");
await page.waitForFunction(() => /build|failed/.test(document.getElementById("status").textContent), null, { timeout: 60000 });
const statusText = await page.textContent("#status");
await page.evaluate(() => window.scrollTo(0, 0));
await shot("page-verdict");
// a species generated by rule
await page.click("#new-species");
await page.selectOption("#new-clan", "C05");
await page.click("#new-dialog button[value=ok]");
await page.waitForTimeout(600);
await shot("page-new-species");
const logText = await page.textContent("#log");
await browser.close();
server.close();
console.log(statusText);
console.log(logText.split("\n").slice(0, 8).join("\n"));
if (errors.length) { console.error("page errors:\n" + errors.join("\n")); process.exit(1); }
console.log("no page errors; screenshots in img/");
