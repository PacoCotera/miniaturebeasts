#!/usr/bin/env node
// The Caddy view's captures (T-20261016-92): each dock state of specs/station-dock-arrival-spec.md §5 drawn by play/src/caddy.mjs's canvas painter at 792 × 272, 1×, in the kit's Inter, into
// play/img/caddy-<state>.png. Fails when a capture holds a pixel that is not one of the four grays, or a frame that is not 792 × 272.
//   PW_DIR=/path/with/node_modules/playwright node prototypes/play/tools/caddy-captures.mjs
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../.."), img = path.resolve(here, "../img");
const require = createRequire(import.meta.url), { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const STATES = {
  "docked-crates": { docked: true, crates: 2 },
  "docked-charging": { docked: true, crates: 0 },
  "opened": { docked: true, crates: 0, opened: { crates: 2, newPods: 1 } },
  "opened-no-pods": { docked: true, crates: 0, opened: { crates: 1, newPods: 0 } },
  "lifted-partner": { docked: false, crates: 0, partner: "Moss" },
  "lifted-exploring": { docked: false, crates: 0, partner: null },
};
const HARNESS = `<!doctype html><meta charset="utf-8"><style>@font-face{font-family:"Inter";font-weight:500;src:url("/ui/fonts/inter/src/Inter-Medium-tnum.ttf") format("truetype");font-display:block}
html,body{margin:0;background:#fff}canvas{display:block}</style><canvas id="c"></canvas>
<script type="module">import { canvasPainter, createPaper } from "/play/src/caddy.mjs"; await document.fonts.load('500 28px Inter'); await document.fonts.load('500 20px Inter');
const p = canvasPainter(document.getElementById("c")), paper = createPaper(p.draw, p.measure); window.__show = (s) => paper.show(s); window.__ready = true;</script>`;
const TYPES = { ".mjs": "text/javascript", ".js": "text/javascript", ".ttf": "font/ttf", ".png": "image/png", ".json": "application/json" };
const server = createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (u === "/__caddy.html") { res.writeHead(200, { "content-type": "text/html" }); res.end(HARNESS); return; }
  const f = path.join(root, path.normalize(u)); if (!f.startsWith(root) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 792, height: 272 }, deviceScaleFactor: 1 });
let failed = 0;
try {
  await page.goto(`http://127.0.0.1:${server.address().port}/__caddy.html`); await page.waitForFunction(() => window.__ready === true);
  for (const [name, s] of Object.entries(STATES)) {
    await page.evaluate((st) => window.__show(st), s);
    const shot = await page.locator("#c").screenshot(), file = path.join(img, `caddy-${name}.png`); writeFileSync(file, shot);
    const check = await page.evaluate(() => { const c = document.getElementById("c"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, seen = new Set(); let bad = 0;
      for (let i = 0; i < d.length; i += 4) { if (!(d[i] === d[i + 1] && d[i] === d[i + 2] && [0, 85, 170, 255].includes(d[i]))) bad++; seen.add(d[i]); } return { w: c.width, h: c.height, bad, levels: [...seen].sort((a, b) => a - b) }; });
    const ok = check.w === 792 && check.h === 272 && check.bad === 0; if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} caddy-${name}.png  ${check.w}×${check.h}  grays ${check.levels.join(",")}  off-gray ${check.bad}`);
  }
} finally { await browser.close(); server.close(); }
if (failed) { console.error(failed + " capture(s) failed"); process.exit(1); }
