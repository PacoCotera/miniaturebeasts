// A failed save is said on /play (Ready means 4a, owner 2026-11-10 20:18): with localStorage writes blocked, both frames show the saveFailed line VISIBLY
// (computed style and an on-screen box inside the frame), after the first save and again on dock.
//   node prototypes/play/tests/save-failed-line.mjs <worktree root> [shots dir] [tag]      (PW_DIR=/path/with/node_modules/playwright; NM_FROM=prototypes dirs, colon-separated, that hold node_modules and face/dist when the worktree has none)
// Exits 1 when a line is missing. Run on origin/main it fails (the words are empty and the line hidden); with the fix it passes.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const [wt, shots, tag = "after"] = process.argv.slice(2), root = path.join(wt, "prototypes");
if (shots) mkdirSync(shots, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  if (req.url === "/build.json") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ commit: "abcdef0123", short: "abcdef0", built: "2026-11-18T06:00:00Z" })); return; }
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(wt, rel);
  for (const d of (process.env.NM_FROM || "").split(":").filter(Boolean)) if (!existsSync(p) && existsSync(path.join(d, rel))) p = path.join(d, rel);   // a worktree with no install or no built face: serve the file from a checkout that has it
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const browser = await chromium.launch();
const fails = [];
const seen = (f, id = "notice") => f.evaluate((id) => {
  const e = document.getElementById(id); if (!e) return { why: "no #" + id };
  const cs = getComputedStyle(e), r = e.getBoundingClientRect(), text = e.textContent.trim();
  const inside = r.width > 0 && r.height > 0 && r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
  return { slot: e.dataset.slot, text, visible: !e.hidden && cs.display !== "none" && cs.visibility === "visible" && +cs.opacity > 0, inside, box: [r.left, r.top, r.width, r.height].map(Math.round), vp: [innerWidth, innerHeight] };
}, id);
for (const [w, h, name] of [[390, 844, "phone"], [844, 390, "side"]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => {
    Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); };   // every write blocked
    addEventListener("error", (e) => console.log("FRAMEERR " + e.message)); addEventListener("unhandledrejection", (e) => console.log("FRAMEREJ " + String(e.reason && (e.reason.stack || e.reason)).slice(0, 300)));
  });
  const page = await ctx.newPage();
  page.on("console", (m) => /FRAME/.test(m.text()) && console.log(name, m.text()));
  await page.goto(url + "?test", { waitUntil: "load" });
  const frame = (re) => page.frames().find((f) => re.test(f.url()));
  for (let i = 0; i < 80 && !(await Promise.all([frame(/\/exploration\//), frame(/\/station\//)].map((f) => f && f.evaluate(() => !!(window.__mb || window.__st)).catch(() => false)))).every(Boolean); i++) await page.waitForTimeout(500);
  const comp = frame(/\/exploration\//), stat = frame(/\/station\//);
  await stat.evaluate(() => window.__st.ready);   // the Station has loaded its pictures and its save
  await comp.evaluate(() => window.__mb.newWorld(1)); await page.waitForTimeout(2500);   // a first save, which fails
  const check = async (when) => {
    for (const [fname, f] of [["companion", comp], ["station", stat]]) {
      const s = await seen(f), ok = s.slot === "saveFailed" && s.text && s.text.length <= 60;   // the frame holds the line
      console.log(name, when, fname, JSON.stringify(s)); if (!ok) fails.push(`${name} ${when} ${fname}: ${JSON.stringify(s)}`);
    }
    const pg = await seen(page.mainFrame(), "frameNotice"), pok = pg.text && pg.text.length <= 60 && pg.visible && pg.inside;   // and the page shows it, on screen
    console.log(name, when, "page", JSON.stringify(pg)); if (!pok) fails.push(`${name} ${when} page: ${JSON.stringify(pg)}`);
  };
  if (shots) await page.screenshot({ path: path.join(shots, `${tag}-${name}-1-first-save.png`) });
  await check("first save");
  await stat.evaluate(() => { try { window.__st.dockKey(true); } catch (e) {} });   // the dock: a save at the Station again
  await page.waitForTimeout(2500);
  if (shots) await page.screenshot({ path: path.join(shots, `${tag}-${name}-2-after-dock.png`) });
  await check("after dock");
  await ctx.close();
}
await browser.close(); server.close();
if (fails.length) { console.error("FAIL\n" + fails.join("\n")); process.exit(1); }
console.log("ok: both frames hold the saveFailed line and the page shows it, on screen");
