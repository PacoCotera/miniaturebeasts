// Mean colour of land boxes and water in the 450x600 screen at day / dusk / night, from the page buffer (not a screenshot).
//   BUNDLE=<site dir> PW_DIR=/home/mb/mb/.pw node night-measure.mjs
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
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}${process.env.URLPATH || "/play/exploration/?seed=7"}`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.newWorld(7, 2); const pos = 13 * m.MW + 9; m.startExpedition("weather", pos); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = pos; m.enterPatch(); m.S.exp.patch.x = 5; m.S.exp.patch.y = 20; m.S.veil[m.S.exp.patch.key] = new Array(m.PH).fill(0x0fffffff); });
  // boxes in screen px (450x600): grass, sand, water
  const boxes = { grass: [190, 330, 20, 20], sand: [138, 100, 14, 30], water: [60, 200, 30, 30], reeds: [310, 300, 14, 14], g2: [150, 420, 20, 20], g3: [250, 200, 20, 20], g4: [200, 480, 20, 20], g5: [215, 120, 16, 16] };
  for (const [name, spent] of [["day", 91], ["dusk", 161], ["night", 186], ["night190", 190]]) {
    await page.evaluate((s) => { window.__mb.S.day.spent = s; }, spent);
    await page.waitForTimeout(900);
    const out = await page.evaluate(async (boxes) => {
      const url = window.__mb.capture(), img = new Image(); img.src = url; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
      const res = {}; for (const [k, [bx, by, bw, bh]] of Object.entries(boxes)) { const d = x.getImageData(bx, by, bw, bh).data; let r = 0, g = 0, b = 0; const n = d.length / 4; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } res[k] = [Math.round(r / n), Math.round(g / n), Math.round(b / n)]; }
      return { w: img.width, h: img.height, res }; }, boxes);
    console.log(name, spent, JSON.stringify(out.res), await page.evaluate(() => { const m = window.__mb, lay = m.curLay(); return JSON.stringify({ baked: !!lay.baked, ts: m.RT.ts, shade: !!lay.shade, cave: !!lay.cave }); }));
  }
} finally { await browser.close(); server.close(); }
