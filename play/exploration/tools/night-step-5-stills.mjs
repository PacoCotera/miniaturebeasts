// night-step-5-1: whole /play screens at 390x844 and 522x935, one seed per run: the sleeper at her bed by day (she is elsewhere), at dusk and by night inside the lamp, the stir (ears up) line, and a night note's words from 3 and from 2 tiles.
//   BUNDLE=<site dir> PW_DIR=/home/mb/mb/.pw node night-step-5-stills.mjs <outDir> <seed>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2], seed = Number(process.argv[3] || 7); mkdirSync(out, { recursive: true });
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
// the day's table: dusk and night start at these light values
const parts = [["dawn", 50], ["morning", 150], ["midday", 150], ["afternoon", 150], ["dusk", 50], ["night", 50]];
const nightAt = parts.slice(0, 5).reduce((a, q) => a + q[1], 0) + 5, duskAt = parts.slice(0, 4).reduce((a, q) => a + q[1], 0) + 5;
try {
  for (const w of [390, 522]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 935 } })).newPage();
    page.on("pageerror", (e) => console.log("ERR", e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}${process.env.RAW ? "/prototypes/exploration/index.html" : "/play/"}?seed=${seed}`);
    let f = null; for (let i = 0; i < 120 && !f; i++) { await page.waitForTimeout(500); f = page.frames().find((fr) => fr.url().includes("/exploration/")); if (f && !(await f.evaluate(() => !!(window.__mb && window.__mb.TEST)).catch(() => false))) f = null; }
    if (!f) { console.log("no frame"); continue; }
    await page.waitForTimeout(1500);
    // the world, an expedition in a place with a named Loika (the first with a named one on a plain Meadow place)
    await f.evaluate((s) => { const m = window.__mb; m.TEST.calm = true; m.newWorld(s); m.startExpedition("weather", location.pathname.includes("/play/") ? 13 * m.MW + 9 : m.G.spawns[0]); m.S.exp.fog = null; m.S.exp.storm = null; }, seed);
    const search = () => f.evaluate(() => { const m = window.__mb; window.__n = 0; window.__w = 0; window.__i = 0;
      for (const c of [...new Set(m.S.cr.filter((q) => q.sp === 0).map((q) => q.c))]) { window.__n = (window.__n || 0) + 1; if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; try { const key = String(c), lay = m.layout(key), live = m.ensureLive(key); window.__w = (window.__w || 0) + 1; window.__i = (window.__i || 0) + live.cr.filter((x) => x.sp === 0 && x.ind).length; const q = live.cr.find((x) => x.sp === 0 && x.ind && x.ind.hs && x.ind.hs.bed); if (q && !lay.cave) { m.S.exp.pos = key; m.enterPatch(key); return { key, id: q.id }; } delete m.S.exp.live[key]; } catch (e) { (window.__errs = window.__errs || []).push(String(e).slice(0, 120)); } }
      return { errs: window.__errs || [], cells: window.__n, tried: window.__w, withInd: window.__i, n: m.S.cr.filter((q) => q.sp === 0).length }; });
    let pick = null; for (let i = 0; i < 40 && !(pick && pick.key); i++) { pick = await search(); if (!pick.key) await page.waitForTimeout(2500); }
    if (!pick || !pick.key) { console.log("no Loika", JSON.stringify(pick).slice(0, 600)); continue; }
    // set her at her bed (bedding-down over), the explorer d tiles off facing her, at light `spent`; day: the explorer stands where it stood and she keeps her midday haunt
    const place = (spent, d) => f.evaluate(({ id, spent, d }) => { const m = window.__mb, S = m.S, live = m.curLive(), lay = m.curLay(), P = S.exp.patch, c = live.cr.find((q) => q.id === id);
      S.known = [0, ...S.known.filter((k) => k !== 0)]; S.exp.storm = null; S.exp.fog = null; S.day.spent = spent; live.strike = null; S.exp.stray = null; c.ind.doings.late = 0;
      c.ease = 0; c.quiet = 0; c.crowd = 0; c.st = "idle"; c.gone = null; c.hide = 0; c.hb = null; delete c.wary;
      const part = m.dayPart(), h = m.hauntAt(c.ind.hs, c.ind.doings, part), st = m.hauntStand(h, m.hauntFree(lay, S.exp.patch.key, null)); c.x = st.x; c.y = st.y; c.ind.go = { part, t: { x: c.x, y: c.y } };
      m.FX.notes.length = 0; m.FX.msg = '';   // the line on screen is the one the next act says
      for (const k of Object.keys(m.habDay())) if (k.startsWith("sn:")) delete m.habDay()[k];   // the stills take each range again
      if (part === "dusk" || part === "night") m.habDay()[m.habKey(c, "sleep")] = "played";
      for (const dir of ["up", "down", "left", "right"]) { const [fx, fy] = m.DIRS[dir], x = c.x - fx * d, y = c.y - fy * d; let ok = x >= 1 && y >= 1 && x < lay.w - 1 && y < lay.h - 1;
        for (let k = 0; ok && k <= d; k++) { const tx = c.x - fx * k, ty = c.y - fy * k; if (!lay.reach[ty * lay.w + tx] || m.T_BLOCK[lay.tiles[ty * lay.w + tx]]) ok = false; }
        if (ok) { P.x = x; P.y = y; P.dir = dir; m.lightningLift(P.key, P.x, P.y, 12); return { ok: true, sleeper: m.sleeperOf(c), curled: m.curledNow(c), dir }; } }
      return { ok: false }; }, { id: pick.id, spent, d });
    const shot = async (name, ms = 900) => { await page.waitForTimeout(ms); await page.screenshot({ path: `${out}/${w}-land${seed}-${name}.png` }); };
    const note = async (name) => { await page.waitForTimeout(7000); const o = await f.evaluate(() => { const m = window.__mb, t = m.noteTarget(); if (!t) return null; m.noteHabit(t); const n = m.S.exp.stats.noted; return n[n.length - 1]; }); console.log(w, seed, name, JSON.stringify(o)); await shot(name, 500); };
    let r = await place(100, 3); console.log(w, seed, "day", JSON.stringify(r)); await shot("day");
    r = await place(duskAt, 3); console.log(w, seed, "dusk", JSON.stringify(r)); await shot("sleeper-dusk"); await note("note-dusk-3");
    r = await place(nightAt, 3); console.log(w, seed, "night", JSON.stringify(r)); await shot("sleeper-night");
    // a night note from 3 tiles (the habit only), then from 2 (the keepsake)
    await note("note-3");
    r = await place(nightAt + 2, 2); await note("note-2");
    // the stir: one heard step beside her stirs her (ears up), only that
    r = await place(nightAt + 8, 3); await page.waitForTimeout(7000);
    await f.evaluate((id) => { const m = window.__mb, P = m.S.exp.patch, c = m.curLive().cr.find((q) => q.id === id); const prevP = { x: P.x, y: P.y }; P.x = c.x + 1; P.y = c.y; m.advance("patch", { noise: "walk", moved: true, prevP }); }, pick.id);
    console.log(w, seed, "stirred", await f.evaluate((id) => { const c = window.__mb.curLive().cr.find((q) => q.id === id); return c.ease; }, pick.id)); await shot("stir", 400);
  }
} finally { await browser.close(); server.close(); }
