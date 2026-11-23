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
let bad = 0;
for (const [name, vp] of [["390", { width: 390, height: 844 }], ["1280", { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(name + " pageerror: " + e.message));
  await page.goto(base);
  await page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen") && !!window.__play.frames.station.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 30000 });
  await wait(3000);
  const domState = () => page.evaluate(() => ({ body: [...document.body.children].map((e) => e.tagName + (e.id ? "#" + e.id : "")).join(" "), iframes: document.querySelectorAll("iframe").length, head: document.head.children.length, btn: JSON.stringify(document.getElementById("optionsBtn").getBoundingClientRect()), disabled: document.getElementById("optionsBtn").disabled }));
  const before = await domState(); console.log(name + " before: " + JSON.stringify(before));
  const t0 = Date.now();
  await page.click("#optionsBtn");
  const opened = await page.waitForSelector("#optionsNewNote", { timeout: 20000 }).then(() => true, () => false);
  console.log(name + " options open: " + opened + " after " + (Date.now() - t0) + " ms");
  if (!opened) { bad++; await page.screenshot({ path: path.join(out, "options-" + name + "-broken.png") }); await ctx.close(); continue; }
  await page.screenshot({ path: path.join(out, "options-open-" + name + ".png") });
  await page.keyboard.press("Escape"); await wait(600);
  await wait(6000); console.log(name + " after close: " + JSON.stringify(await domState()));
  const closed =(await page.locator("#optionsNewNote").count()) === 0;
  console.log(name + " options closed with Escape: " + closed); if (!closed) bad++;
  await page.screenshot({ path: path.join(out, "options-closed-" + name + ".png") });
  await page.click("#optionsBtn"); await page.waitForSelector("#optionsNewNote", { timeout: 20000 });
  await page.click("#optionsNewNote"); await page.waitForSelector(".op-thumb-box", { timeout: 20000 });
  const png = await page.evaluate(async () => {
    const img = document.querySelector(".op-thumb-box img"); if (!img) return null;
    const b = await (await fetch(img.src)).blob(); const buf = new Uint8Array(await b.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192)); return btoa(s);
  });
  if (!png) { console.error(name + ": no picture"); bad++; } else { writeFileSync(path.join(out, "note-" + name + ".png"), Buffer.from(png, "base64")); console.log(name + " note picture bytes: " + Buffer.from(png, "base64").length); }
  await page.screenshot({ path: path.join(out, "options-note-" + name + ".png") });
  await ctx.close();
}
await browser.close(); server.close(); caddyServer.close();
console.log(bad ? "FAIL " + bad : "OK");
process.exit(bad ? 1 : 0);
