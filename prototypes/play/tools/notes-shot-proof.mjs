#!/usr/bin/env node
// Proof pictures of the play note's whole-page shot (bug #123): the page with the played game's canvas in place.
// Writes note-390.png, note-522.png, note-1280.png and note-menu-1280.png (Options open) into NOTES_PROOF=<dir>; prints what the canvas held.
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers NOTES_PROOF=<dir> node prototypes/play/tools/notes-shot-proof.mjs
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
const browser = await chromium.launch(process.env.NOTES_GL ? { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] } : {});

// what the page's own shot holds, taken through the Options bundle's controller path: the page picture as a PNG data URL
const diag = (page) => page.evaluate(() => {
  const c = window.__play.frames.companion.contentDocument.getElementById("screen"); if (!c) return "no canvas";
  const t = document.createElement("canvas"); t.width = c.width; t.height = c.height; const g = t.getContext("2d"); g.drawImage(c, 0, 0);
  const d = g.getImageData(0, 0, t.width, t.height).data; let lit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30 && d[i + 3]) lit++;
  const fw = window.__play.frames.companion.contentWindow, gl = !!c.getContext("2d"); const kinds = Object.keys(fw.__game || fw.__mb || {}).slice(0, 8).join(",");
  return "webgl:" + gl + " keys:" + kinds + " " + c.width + "x" + c.height + " lit pixels " + lit + " of " + t.width * t.height + " iframe " + window.__play.frames.companion.getBoundingClientRect().width;
});

for (const [name, vp, menu] of [["note-390", { width: 390, height: 844 }, false], ["note-522", { width: 522, height: 800 }, false], ["note-1280", { width: 1280, height: 800 }, false], ["note-menu-1280", { width: 1280, height: 800 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 }), page = await ctx.newPage();
  page.on("pageerror", (e) => console.error(name + " pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.error(name + " console: " + m.text().slice(0, 200)); });
  page.on("requestfailed", (r) => console.error(name + " failed: " + r.url().slice(0, 150)));
  page.on("response", (r) => { if (r.status() >= 400) console.error(name + " " + r.status() + " " + r.url().slice(0, 150)); });
  await page.goto(base);
  await page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentDocument.getElementById("screen") && !!window.__play.frames.station.contentDocument.getElementById("screen"); } catch { return false; } }, null, { timeout: 30000 });
  await wait(3000);
  if (menu) { await page.keyboard.press("Escape"); await wait(1200); }   // the game's own menu (← Back) open, as a tester's shot shows it
  console.log(name + " canvas: " + await diag(page));
  await page.click("#optionsBtn"); await page.waitForSelector("#optionsNewNote");
  await page.click("#optionsNewNote"); await page.waitForSelector(".op-thumb-box");
  // the note's first picture is the page shot held when Options opened: read it from the thumbnail's blob URL
  const png = await page.evaluate(async () => {
    const img = document.querySelector(".op-thumb-box img"); if (!img) return null;
    const b = await (await fetch(img.src)).blob(); const buf = new Uint8Array(await b.arrayBuffer()); let s = ""; for (let i = 0; i < buf.length; i += 8192) s += String.fromCharCode(...buf.subarray(i, i + 8192)); return btoa(s);
  });
  if (!png) { console.error(name + ": no thumbnail"); await ctx.close(); continue; }
  writeFileSync(path.join(out, name + ".png"), Buffer.from(png, "base64"));
  console.log(name + ": " + Buffer.from(png, "base64").length + " bytes");
  if (menu) { await page.screenshot({ path: path.join(out, "page-menu-1280.png") }); }
  await ctx.close();
}
await browser.close(); server.close(); caddyServer.close();
