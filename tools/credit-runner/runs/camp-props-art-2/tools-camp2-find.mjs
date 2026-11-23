// which land codes are sand, and cells of it near a passable spawn
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const root = process.env.BUNDLE;
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/play/exploration/?seed=7`);
await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(() => {
  const m = window.__mb; m.newWorld(7);
  const out = { L: m.L, spawn: m.G.spawns[0], names: {} };
  const cnt = {};
  for (let c = 0; c < m.MW * m.MH; c++) { const v = m.G.land[c]; cnt[v] = (cnt[v] || 0) + 1; }
  out.cnt = cnt;
  const sandCells = [];
  for (let c = 0; c < m.MW * m.MH; c++) if (m.G.land[c] === m.L.ROCK && m.G.comp[c]) sandCells.push(c);
  out.sand = sandCells.slice(0, 12); out.MW = m.MW;
  out.near = sandCells.map(c => ({ c, d: Math.abs((c % m.MW) - (m.G.spawns[0] % m.MW)) + Math.abs(Math.floor(c / m.MW) - Math.floor(m.G.spawns[0] / m.MW)) })).sort((a, b) => a.d - b.d).slice(0, 5);
  return out;
})));
await browser.close(); server.close();
