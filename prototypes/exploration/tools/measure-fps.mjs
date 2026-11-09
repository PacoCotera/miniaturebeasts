// Frames a second of the walking view standing still in a cell, at a throttle: the steady cost of the page (warming must not add to it).
//   node prototypes/exploration/tools/measure-fps.mjs [--cpu=4] [--ms=4000]     (PW_DIR for playwright)
import { createRequire } from "node:module"; import { createServer } from "node:http"; import { readFileSync, existsSync, statSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."); const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith("--" + n + "=")); return a ? +a.split("=")[1] : d; };
const server = createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split("?")[0])); if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
const b = await chromium.launch(), out = [];
for (const seed of [7, 13, 42]) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await page.goto(`http://127.0.0.1:${port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(800);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: arg("cpu", 4) });
  await page.evaluate(() => { window.__mb.TEST.calm = true; }); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(300);
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(1800);
  await page.evaluate(() => { if (window.__mb.RT.view) window.__mb.endView(); }); await page.waitForTimeout(1500);
  out.push(await page.evaluate((ms) => new Promise((res) => { let n = 0, worst = 0, last = performance.now(); const t0 = last; const f = () => { const t = performance.now(); worst = Math.max(worst, t - last); last = t; n++; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: n / ((t - t0) / 1000), worst }); }; requestAnimationFrame(f); }), arg("ms", 4000)));
  await ctx.close();
}
await b.close(); server.close();
console.log("standing in a cell, fps", out.map((o) => o.fps.toFixed(1)).join(" "), "| worst frame ms", out.map((o) => o.worst.toFixed(0)).join(" "));
