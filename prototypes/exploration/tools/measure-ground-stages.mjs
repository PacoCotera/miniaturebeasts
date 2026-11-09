// Scratch probe: after the Confirm into a new cell, every frame for 2.4 s with the baked view's stage timers (view made, lightFor, ground cache, drawGround, overviewBuf, bufCanvas, canopy), at a throttle.
//   node prototypes/exploration/tools/measure-ground-stages.mjs [--cpu=4] [--cells=6] [--press]     --press: a key press ends the arrival look at once (as a player does)
import { createRequire } from "node:module"; import { createServer } from "node:http"; import { readFileSync, existsSync, statSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."); const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith("--" + n + "=")); return a ? +a.split("=")[1] : d; };
const CPU = arg("cpu", 4), CELLS = arg("cells", 6), PRESS = process.argv.includes("--press");
const server = createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/")); if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 412, height: 915 } }), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
await page.goto(`http://127.0.0.1:${port}/prototypes/exploration/index.html`); await page.waitForTimeout(800);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
await page.evaluate(async () => {
  const pm = await import("/prototypes/places/src/page.mjs"), P = pm.BakedView.prototype; window.__t = {};
  const wrap = (obj, name, tag) => { const f = obj[name]; obj[name] = function (...a) { const t0 = performance.now(); try { return f.apply(this, a); } finally { window.__t[tag] = (window.__t[tag] || 0) + performance.now() - t0; } }; };
  for (const name of ["drawGround", "lightFor", "overviewBuf", "bufCanvas", "drawCanopy", "propItems"]) wrap(P, name, name);
  const gm = await import("/prototypes/places/src/ground.mjs"), C = gm.PlaceGroundCache.prototype, get = C.get; C.get = function (...a) { const t0 = performance.now(), r0 = this.redone; try { return get.apply(this, a); } finally { const d = performance.now() - t0; window.__t.cacheGet = (window.__t.cacheGet || 0) + d; if (this.redone !== r0) window.__t.fullRender = (window.__t.fullRender || 0) + d; } }; });
await page.evaluate(() => { window.__mb.TEST.calm = true; }); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(600);
const out = await page.evaluate(async ({ CELLS, PRESS }) => {
  const m = window.__mb, ex = m.S.exp, raf = () => new Promise((q) => requestAnimationFrame(q)), rows = [];
  const one = async (label) => { window.__t = {}; const t0 = performance.now(); m.act("confirm"); let last = t0, i = 0; const frames = [];
    while (performance.now() - t0 < 2400) { await raf(); const now = performance.now(); if (PRESS && i === 6) m.act("up"); const s = Object.entries(window.__t).filter(([, v]) => v > 4).map(([k, v]) => k + " " + v.toFixed(0)).join(" "); frames.push({ i, at: Math.round(now - t0), gap: Math.round(now - last), s }); window.__t = {}; last = now; i++; }
    rows.push({ label, frames: frames.filter((f) => f.gap > 40 || f.s) }); };
  await one("set-out");
  for (let i = 0; i < CELLS; i++) {
    m.leavePatch(); await raf(); await raf();
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(ex.pos, d)), dir = dirs.find((d) => !m.S.visited[ex.pos + ({ up: -m.MW, down: m.MW, left: -1, right: 1 })[d]]) || dirs[0]; m.act(dir); await raf(); await raf();
    await one((m.layout(String(ex.pos)).baked || {}).id);
  }
  return rows; }, { CELLS, PRESS });
for (const r of out) { console.log(r.label); for (const f of r.frames) console.log("   frame", f.i, "at", f.at, "gap", f.gap, f.s); }
await b.close(); server.close();
