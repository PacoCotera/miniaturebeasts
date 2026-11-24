#!/usr/bin/env node
// Times New note on /play (#139): the click on #optionsNewNote to the note shown (its first picture in the strip), and to the page picture in it; stills of both moments.
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers NOTES_PROOF=<dir> TAG=before|after RUNS=5 node prototypes/play/tools/note-open-timing-proof.mjs
// Writes <TAG>-timings.json and, for the first run of each size, <TAG>-<size>-open.png (right after New note) and <TAG>-<size>-page.png (the page picture is in).
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
const tag = process.env.TAG || "run", RUNS = Number(process.env.RUNS || 5);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const rows = [];
for (const [name, vp] of [["1576", { width: 1576, height: 846 }], ["412", { width: 412, height: 915 }]]) {
  for (let i = 1; i <= RUNS; i++) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), page = await ctx.newPage();
    page.on("pageerror", (e) => console.error(name + " pageerror: " + e.message));
    await page.goto(base);
    await page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen") && !!window.__play.frames.station.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 60000 });
    await wait(2500);
    await page.click("#optionsBtn"); await page.waitForSelector("#optionsNewNote");
    await wait(500);   // the canvas picture is held by now
    // in the page: the click to the first picture in the strip (shown), then to the picture that is the page's (wider than the canvas)
    const r = await page.evaluate(() => new Promise((res) => {
      const b = document.getElementById("optionsNewNote"); let t0 = 0, shown = 0, w0 = 0;
      b.addEventListener("click", () => { t0 = performance.now(); }, { once: true, capture: true });
      const poll = () => {
        const img = document.querySelector(".op-thumb-box img"), now = performance.now();
        if (t0 && img && img.naturalWidth && !shown) { shown = Math.round(now - t0); w0 = img.naturalWidth; }
        if (shown && img && img.naturalWidth && img.naturalWidth !== w0) return res({ shown, page: Math.round(now - t0), w0, w1: img.naturalWidth });
        if (t0 && now - t0 > 20000) return res({ shown: shown || -1, page: -1, w0, w1: img ? img.naturalWidth : 0 });
        requestAnimationFrame(poll);
      };
      b.click(); requestAnimationFrame(poll);
    }));
    rows.push({ size: name, run: i, ...r }); console.log(tag + " " + name + " run " + i + ": shown " + r.shown + " ms, page picture " + r.page + " ms (" + r.w0 + " -> " + r.w1 + ")");
    if (i === 1) { await page.screenshot({ path: path.join(out, tag + "-" + name + "-after.png") }); }
    await ctx.close();
    if (i === 1) {   // the still right after New note: a second run, shot 60 ms after the click
      const c2 = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), p2 = await c2.newPage();
      await p2.goto(base);
      await p2.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 60000 });
      await wait(2500); await p2.click("#optionsBtn"); await p2.waitForSelector("#optionsNewNote"); await wait(500);
      await p2.click("#optionsNewNote", { noWaitAfter: true });
      await p2.waitForSelector(".op-thumb-box", { timeout: 20000 });
      await p2.screenshot({ path: path.join(out, tag + "-" + name + "-open.png") });
      await c2.close();
    }
  }
}
await browser.close(); server.close(); caddyServer.close();
writeFileSync(path.join(out, tag + "-timings.json"), JSON.stringify(rows, null, 1));
