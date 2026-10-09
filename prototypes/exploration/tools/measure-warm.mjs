// The warm-stone supply of a calm expedition (research-economy.md §9), measured on the page: 30 fresh worlds, the first calm expedition of each, the warm stones it stores against its
// reach, and the draw modelled as 6 or 7 reach cells entered at random (200 choices an expedition). `--old` patches the page back to 3 to 5 stones to check the model against the old
// bot's measured median of 1 drawn. Not the scripted bot: that one is not in the repository.   node prototypes/exploration/tools/measure-warm.mjs [--old]   (PW_DIR for playwright)
import { createRequire } from "node:module"; import { createServer } from "node:http"; import { readFileSync, existsSync, statSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."); const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const OLD = process.argv.includes("--old"), N = 30, CELLS = +(process.argv.find((a) => a.startsWith("--cells="))?.slice(8) || 7);
const server = createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/")); if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html"); if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  let body = readFileSync(p); if (OLD && p.endsWith("exploration/index.html")) body = Buffer.from(body.toString().replace("const WARM_MIN = 6, WARM_MAX = 8", "const WARM_MIN = 3, WARM_MAX = 5"));
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(body); });
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
const b = await chromium.launch(), rows = [];
for (let i = 0; i < N; i++) {
  const ctx = await b.newContext(), page = await ctx.newPage(); await page.goto(`http://127.0.0.1:${port}/exploration/index.html`); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__mb.TEST.calm = true; }); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(300);
  rows.push(await page.evaluate((CELLS) => { const m = window.__mb, ex = m.S.exp; if (!ex) return null; const MW = m.MW, xy = (c) => [c % MW, Math.floor(c / MW)], [sx, sy] = xy(ex.start);
    const near = ex.reach.slice().sort((a, b) => Math.hypot(xy(a)[0] - sx, xy(a)[1] - sy) - Math.hypot(xy(b)[0] - sx, xy(b)[1] - sy)).slice(0, CELLS), keys = new Set(near.map(String));
    let x = 12345 + 7919 * ex.warm.length; const rnd = () => { x = (Math.imul(x, 1103515245) + 12345) >>> 0; return x / 4294967296; }, rs = [];
    for (let t = 0; t < 200; t++) { const pool = ex.reach.slice(), pick = new Set(); for (let k = 0; k < (t % 2 ? 6 : 7) && pool.length; k++) pick.add(String(pool.splice(Math.floor(rnd() * pool.length), 1)[0])); rs.push(ex.warm.filter((w) => pick.has(w.split(":")[0])).length); }
    return { warm: ex.warm.length, reach: ex.reach.length, drawn: ex.warm.filter((w) => keys.has(w.split(":")[0])).length, rnd: rs }; }, CELLS));
  await ctx.close();
}
await b.close(); server.close();
const ok = rows.filter(Boolean), med = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; }, mean = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log((OLD ? "old 3-5" : "new 7-9") + ` · ${ok.length} expeditions · ${CELLS} nearest cells entered`);
console.log("warm in reach  median", med(ok.map((r) => r.warm)), "mean", mean(ok.map((r) => r.warm)), "range", Math.min(...ok.map((r) => r.warm)), "-", Math.max(...ok.map((r) => r.warm)), "· reach cells", med(ok.map((r) => r.reach)));
console.log("warm drawn     median", med(ok.map((r) => r.drawn)), "mean", mean(ok.map((r) => r.drawn)), "range", Math.min(...ok.map((r) => r.drawn)), "-", Math.max(...ok.map((r) => r.drawn)), "· with 0:", ok.filter((r) => r.drawn === 0).length);

const all = ok.flatMap((r) => r.rnd);
console.log("warm drawn, 6 or 7 cells entered at random (" + all.length + " draws)  median", med(all), "mean", mean(all), "· P(0)", (all.filter((v) => v === 0).length / all.length).toFixed(2), "· P(>=2)", (all.filter((v) => v >= 2).length / all.length).toFixed(2), "· P(>=3)", (all.filter((v) => v >= 3).length / all.length).toFixed(2));
