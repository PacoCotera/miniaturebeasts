// Shoots the lab bench grey pictures (lab-pictures-1) to PNG and makes one contact sheet.
//   node tools/lab-pictures/shoot.mjs <out dir>        (PW_DIR=/path/with/node_modules/playwright)
// Pages: tools/lab-pictures/<n>-<what>-station.html (800x480, the Station's 7-inch screen, at 2x)
//        tools/lab-pictures/<n>-<what>-phone.html   (390x844 with touch at 3x, inside /play's frame drawn as grey boxes)
// Writes <out>/<n>-<what>-800x480.png, <out>/<n>-<what>-390x844.png and <out>/contact-sheet.png.
// Warns about clipped words (a value wider than its box), words outside the screen, and missing keys in words.json.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const out = path.resolve(process.argv[2] || path.join(here, "out")); mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".css": "text/css", ".ttf": "font/ttf", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/tools/lab-pictures/`;
const browser = await chromium.launch();
const pages = readdirSync(here).filter((f) => /^\d[a-z]?-.*-(station|phone)\.html$/.test(f)).sort();
const shot = [];
let warnings = 0;
for (const f of pages) {
  const phone = f.endsWith("-phone.html");
  const ctx = await browser.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 800, height: 480 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") { warnings++; console.error(`WARN ${f}: ${m.text()}`); } });
  page.on("pageerror", (e) => { warnings++; console.error(`WARN ${f}: ${e.message}`); });
  await page.goto(base + f, { waitUntil: "load" });
  await page.waitForSelector("body[data-ready]", { timeout: 15000 });
  const issues = await page.evaluate(() => {
    const scr = document.getElementById("screen").getBoundingClientRect(), bad = [];
    for (const e of document.querySelectorAll("#screen *")) {
      if (e.closest("svg")) continue;
      const r = e.getBoundingClientRect(); if (!r.width) continue;
      if (r.left < scr.left - 0.5 || r.right > scr.right + 0.5 || r.top < scr.top - 0.5 || r.bottom > scr.bottom + 0.5) bad.push("outside screen: " + (e.textContent || e.className).slice(0, 40));
      if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow === "hidden") bad.push("clipped: " + e.textContent.slice(0, 40));
    }
    return bad;
  });
  for (const i of issues) { warnings++; console.error(`WARN ${f}: ${i}`); }
  const name = f.replace(/-station\.html$/, "-800x480.png").replace(/-phone\.html$/, "-390x844.png");
  await page.screenshot({ path: path.join(out, name) });
  shot.push({ name, phone });
  await ctx.close();
}

// the contact sheet: one row per picture number, Station shots then phone shots, each with its file name
const rows = {};
for (const s of shot) (rows[s.name.match(/^(\d)/)[1]] ??= []).push(s);
const img = (s) => `<figure><img src="data:image/png;base64,${readFileSync(path.join(out, s.name)).toString("base64")}" style="${s.phone ? "width:195px;height:422px" : "width:400px;height:240px"}"><figcaption>${s.name}</figcaption></figure>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Inter;src:url("data:font/ttf;base64,${readFileSync(path.join(root, "prototypes/ui/fonts/inter/src/Inter-Medium-tnum.ttf")).toString("base64")}")}
body{margin:0;padding:16px;background:#d9d9d6;font-family:Inter,sans-serif;width:max-content}
h1{font-size:18px;margin:0 0 12px} .row{display:flex;gap:12px;align-items:flex-start;margin-bottom:16px;background:#fff;padding:10px;border-radius:8px}
.row h2{font-size:15px;width:24px;margin:0} figure{margin:0} figcaption{font-size:11px;color:#555;margin-top:3px} img{display:block;border:1px solid #aaa}
</style></head><body><h1>Loika lab bench: grey pictures, draft words (lab-pictures-1, with lab-pictures-2's two changes)</h1>
${Object.entries(rows).map(([n, list]) => `<div class="row"><h2>${n}</h2>${[...list.filter((s) => !s.phone), ...list.filter((s) => s.phone)].map(img).join("")}</div>`).join("\n")}
</body></html>`;
const ctx = await browser.newContext({ viewport: { width: 1800, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(out, "contact-sheet.png"), fullPage: true });
await browser.close(); server.close();
console.log(`${shot.length} pictures and contact-sheet.png in ${out}; ${warnings} warnings`);
