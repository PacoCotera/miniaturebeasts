// list cells with water (tile 5 WATER) and a land tile next to it. PW_DIR=... node fog-water-cells.mjs [seed]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
const seed = +(process.argv[2] || 7);
try {
  const page = await (await browser.newContext({ viewport: { width: 522, height: 935 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 });
  const r = await page.evaluate((sd) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(sd); const out = [];
    for (let c = 0; c < 600; c++) { try { const lay = m.layout(c); if (!lay || !lay.baked) continue; let n = 0, best = null;
      for (let y = 2; y < lay.h - 2; y++) for (let x = 2; x < lay.w - 2; x++) { if (lay.tiles[y * lay.w + x] === m.T.DEEP || lay.tiles[y * lay.w + x] === m.T.WATER) n++; }
      if (n < 25) continue;
      for (let y = 3; y < lay.h - 3 && !best; y++) for (let x = 3; x < lay.w - 3; x++) if (lay.tiles[y * lay.w + x] === 0 && lay.tiles[y * lay.w + x - 3] === m.T.WATER && lay.tiles[y * lay.w + x - 2] === m.T.WATER) { best = [x, y]; break; }
      if (best) out.push([c, n, best, lay.w, lay.h]); } catch (e) { } }
    return out.slice(0, 12); }, seed);
  for (const x of r) console.log(JSON.stringify(x));
} finally { await browser.close(); server.close(); }
