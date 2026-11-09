// How long a step into a new cell takes on the page, by stage, at a CPU throttle (4x stands in for a phone).
//   node prototypes/exploration/tools/measure-cell-step.mjs [--cpu=4] [--n=8] [--seeds=3] [--warm]     (PW_DIR for playwright)
// Per cell entered: layout (cold), the Confirm that goes down (enterPatch minus layout, save included), and the first frames after it (the ground render and the view);
// the step is the sum, measured to the end of the first frame that follows it. With --warm the page is given time to warm the neighbours first (idle), then the same walk.
import { createRequire } from "node:module"; import { createServer } from "node:http"; import { readFileSync, existsSync, statSync } from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."); const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith("--" + n + "=")); return a ? +a.split("=")[1] : d; };
const CPU = arg("cpu", 4), N = arg("n", 8), SEEDS = arg("seeds", 3), WARM = process.argv.includes("--warm");
const server = createServer((req, res) => { let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/")); if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
let hits = 0, misses = 0; const b = await chromium.launch(), rows = [], med = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[s.length >> 1] : 0; }, fmt = (a) => `median ${med(a).toFixed(1)} p90 ${a.slice().sort((x, y) => x - y)[Math.floor(a.length * 0.9)]?.toFixed(1)} max ${Math.max(...a, 0).toFixed(1)}`;
for (let sd = 0; sd < SEEDS; sd++) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  page.on("pageerror", (e) => console.log("pageerror", e.message)); page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console", m.type(), m.text().slice(0, 300)); });
  await page.goto(`http://127.0.0.1:${port}/prototypes/exploration/index.html?seed=${[7, 13, 42, 300, 5, 99][sd % 6]}`); await page.waitForTimeout(800);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
  await page.evaluate(() => { window.__mb.TEST.calm = true; }); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(600);
  // the set-out: the first walk view
  const first = await page.evaluate(() => new Promise((res) => { const m = window.__mb; if (m.S.phase === "patch") return res(null); const t0 = performance.now(); m.act("confirm"); const t1 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res({ sync: t1 - t0, frames: performance.now() - t1 }))); }));
  if (first) rows.push({ kind: "setout", ...first, lay: 0, step: first.sync + first.frames });
  await page.waitForTimeout(WARM ? 2500 : 300);
  for (let i = 0; i < N; i++) {
    const r = await page.evaluate(async (warm) => {
      const m = window.__mb, ex = m.S.exp, wait = (ms) => new Promise((q) => setTimeout(q, ms)), raf = () => new Promise((q) => requestAnimationFrame(q));
      if (ex.patch) { m.leavePatch(); await raf(); await raf(); }
      let dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(ex.pos, d)), dir = dirs.find((d) => { const c = ex.pos + ({ up: -m.MW, down: m.MW, left: -1, right: 1 })[d]; return !m.S.visited[c]; }) || dirs[0]; if (!dir) return null;
      m.act(dir); await raf(); await raf(); if (warm) await wait(1500);
      const key = String(ex.pos), t0 = performance.now(); m.layout(key); const t1 = performance.now();
      const h0 = m.WARM ? m.WARM.hit : 0, v0 = !!m.S.veil[key]; m.act("confirm"); const t2 = performance.now(); await raf(); const t3 = performance.now(); await raf(); const t4 = performance.now();
      const lay = m.layout(key), t5 = performance.now(); await raf(); const idle = performance.now() - t5;   // a steady frame in the same cell, for scale
      return { lay: t1 - t0, sync: t2 - t1, frames: t4 - t2, first: t3 - t2, step: t4 - t0, idle, seen: v0, hit: m.WARM ? m.WARM.hit - h0 : 0, tpl: lay.baked ? lay.baked.id : "gen" };
    }, WARM);
    if (r) rows.push({ kind: "cell", ...r });
  }
  const hm = await page.evaluate(() => (window.__mb.WARM ? [window.__mb.WARM.hit, window.__mb.WARM.miss] : [0, 0])); hits += hm[0]; misses += hm[1];
  await ctx.close();
}
await b.close(); server.close();
const cell = rows.filter((r) => r.kind === "cell"), so = rows.filter((r) => r.kind === "setout"), col = (rs, k) => rs.map((r) => r[k]);
console.log(process.argv.includes("--rows") ? "" : "", `arrival pictures warm/built: ${hits}/${misses}`);
console.log(`cpu ${CPU}x ${WARM ? "warm" : "cold"}: ${cell.length} cells, ${so.length} set-outs`);
if (process.argv.includes("--rows")) console.log(cell.map((r) => `${r.tpl} ${r.seen ? "revisit" : "new"} hit ${r.hit} first ${r.first.toFixed(0)} step ${r.step.toFixed(0)} idle ${r.idle.toFixed(0)}`).join("\n"));
for (const [k, label] of [["idle", "steady frame"], ["lay", "layout(key)"], ["sync", "enterPatch (rest, save)"], ["first", "first frame after"], ["frames", "two frames after"], ["step", "step to first frame"]]) console.log(label.padEnd(26), fmt(col(cell, k)));
for (const [name, rs] of [["first entry", cell.filter((r) => !r.seen)], ["revisit", cell.filter((r) => r.seen)]]) if (rs.length) console.log(`${name} (${rs.length}): first frame`, fmt(col(rs, "first")), "| step to first frame", fmt(col(rs, "step")));
if (so.length) console.log("set-out (confirm + 2 frames)", fmt(col(so, "step")), "· sync", fmt(col(so, "sync")));
