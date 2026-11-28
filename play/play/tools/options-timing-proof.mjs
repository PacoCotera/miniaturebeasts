#!/usr/bin/env node
// Proof that the Options button opens and closes, and a note sends with the whole-page picture (bug #123 round 3).
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers NOTES_PROOF=<dir> node prototypes/play/tools/options-open-proof.mjs
// For each width: clicks #optionsBtn, times how long until the panel (#optionsNewNote) shows, closes it with Escape, then opens, starts a note and reads its picture.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createApp, loadFrames as loadCaddyFrames } from "../../caddy/app.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".ttf": "font/ttf", ".wasm": "application/wasm" };
loadCaddyFrames();
const caddyData = mkdtempSync(path.join(tmpdir(), "mb-caddy-proof-"));
writeFileSync(path.join(caddyData, "identity.json"), JSON.stringify({ v: 1, caddy: "k0000000000000000", recovery: { kid: "TEST", pub: "A".repeat(43) }, printedAt: 0 }));
const caddy = createApp({ dataDir: caddyData, painter: "mock", mockDelay: 1, tickMs: 200 }), caddyServer = createServer((req, res) => caddy.handle(req, res));
await new Promise((r) => caddyServer.listen(0, "127.0.0.1", r));
const caddyPort = caddyServer.address().port;
const server = createServer((req, res) => {
  if (req.url.startsWith("/caddy-api/")) {
    const up = http.request({ host: "127.0.0.1", port: caddyPort, path: req.url, method: req.method, headers: req.headers }, (r2) => { res.writeHead(r2.statusCode, r2.headers); r2.pipe(res); });
    up.on("error", () => { if (!res.headersSent) res.writeHead(502); res.end(); }); req.pipe(up); return;
  }
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const out = process.env.NOTES_PROOF; if (!out) throw new Error("set NOTES_PROOF=<dir>"); mkdirSync(out, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const RUNS = Number(process.env.RUNS || 5);
const rows = []; let bad = 0;
for (const [name, vp] of [["390", { width: 390, height: 844 }], ["1280", { width: 1280, height: 800 }]]) {
  for (let i = 1; i <= RUNS; i++) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), page = await ctx.newPage();   // a new context: nothing kept from the run before
    page.on("pageerror", (e) => console.error(name + " pageerror: " + e.message));
    await page.goto(base);
    await page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen") && !!window.__play.frames.station.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 60000 });
    await wait(1500);
    // click to panel visible, measured in the page: the click's timestamp to the first frame with #optionsNewNote shown
    const click = () => page.evaluate(() => new Promise((res) => {
      const b = document.getElementById("optionsBtn"); let t0 = 0;
      b.addEventListener("click", () => { t0 = performance.now(); }, { once: true, capture: true });
      const poll = () => { const e = document.getElementById("optionsNewNote"); if (t0 && e && e.getBoundingClientRect().height > 0) res(Math.round(performance.now() - t0)); else if (t0 && performance.now() - t0 > 20000) res(-1); else requestAnimationFrame(poll); };
      b.click(); requestAnimationFrame(poll);
    }));
    const close = async () => { await page.keyboard.press("Escape"); await page.waitForFunction(() => !document.getElementById("optionsNewNote"), null, { timeout: 10000 }); await wait(300); };
    const first = await click(); await close();
    const second = await click(); await close();
    const third = await click();
    if (i === 1) { await page.screenshot({ path: path.join(out, "options-open-" + name + ".png") }); await close(); await page.screenshot({ path: path.join(out, "options-closed-" + name + ".png") }); }
    rows.push({ width: name, run: i, first, second, third });
    console.log(name + " run " + i + ": first " + first + " ms, later " + second + ", " + third);
    if (first < 0 || first >= 150 || second >= 150 || third >= 150) bad++;
    await ctx.close();
  }
}
await browser.close(); server.close(); caddyServer.close();
writeFileSync(path.join(out, "timings.json"), JSON.stringify(rows, null, 1));
console.log(bad ? "OVER 150 ms in " + bad + " runs" : "ALL UNDER 150 ms");
process.exit(bad ? 1 : 0);
