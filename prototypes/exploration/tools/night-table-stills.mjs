// night-table-1: stills of one place at day, dusk and night (390x844), and a candidate scan.
//   PW_DIR=/home/mb/mb/.pw node night-table-stills.mjs <outDir> <seed> <px,py> [<herx,hery>]     day / dusk / night stills of patch px,py
//   PW_DIR=/home/mb/mb/.pw node night-table-stills.mjs <outDir> <seed> scan "6,13;5,12;..."      one day still per patch (to pick a place by eye)
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const [out, seedArg, where, her = "12,22"] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const seed = Number(seedArg), scan = where === "scan", patches = scan ? her.split(";").map((s) => s.split(",").map(Number)) : [where.split(",").map(Number)];
const [hx, hy] = scan ? [12, 22] : her.split(",").map(Number);
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
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(1500);
  for (const [px, py] of patches) {
    await page.evaluate(([s, px, py, hx, hy]) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(s, 2); const pos = py * m.MW + px; m.startExpedition("weather", pos); m.S.exp.fog = null; m.S.exp.storm = null; m.S.exp.pos = pos; m.enterPatch();
      m.S.exp.patch.x = hx; m.S.exp.patch.y = hy; m.S.seen.tile[m.S.exp.patch.key] = new Array(m.PH).fill(0x0fffffff); }, [seed, px, py, hx, hy]);
    for (const [name, spent] of scan ? [["day", 30]] : [["1-day", 30], ["2-dusk", 160], ["3-night", 190]]) {
      await page.evaluate((s) => { const m = window.__mb; m.S.day.spent = s; m.RT.key = null; }, spent);
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${scan ? `scan-${px}-${py}` : `390x844-${name}`}.png` });
    }
  }
  if (errors.length) console.log("page errors", errors);
} finally { await browser.close(); server.close(); }
