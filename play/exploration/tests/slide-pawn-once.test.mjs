// The crossing slide draws the pawn once (bug #37 follow-up): at about 0, 150 and 300 ms of the slide, the pawn is drawn exactly once in the frame,
// counting the draws of the frame itself and the pawns already inside the two slide pictures (the place left, the place entered).
// Real Chromium; PW_DIR names the folder holding node_modules/playwright (without it the test is skipped). SHOTS_DIR, if set, receives the three frames as stills.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html` };
}

// Stand on a way through of a place, hold the page clock, press across, then step the clock to each moment of the slide.
const CROSS = `async (moments) => {
  const m = window.__mb, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (m.S.phase === "map") { m.act("confirm"); await wait(300); }
  for (let tries = 0; tries < 12; tries++) {
    const P = m.S.exp.patch, lay = m.layout(P.key), bk = lay.baked;
    const o = bk && (lay.openings || []).find((q) => m.openingKind(lay, q).kind === "open");
    if (o) {
      const dir = { N: "up", S: "down", W: "left", E: "right" }[o.side], k = Math.floor((o.from + o.to) / 2);
      P.x = o.side === "W" ? 0 : o.side === "E" ? lay.w - 1 : k + bk.ox; P.y = o.side === "N" ? 0 : o.side === "S" ? lay.h - 1 : k + bk.oy;
      await wait(400);
      m.TEST.clock = performance.now(); await raf(); await raf();
      window.__shot && await window.__shot("pre");
      m.act(dir, "creep"); await raf(); await raf();
      const sl = m.FX.slide; if (!sl) return { noSlide: true };
      const rows = [];
      for (const ms of moments) {
        m.TEST.clock = sl.at + ms; await raf(); await raf();
        const s = m.FX.slide;
        rows.push({ ms, running: !!s, drawn: m.RT.heroN, inOld: s ? s.snap.hero : 0, inNew: m.RT.slideNewHero || 0 });
        window.__shot && await window.__shot(ms);
      }
      return { rows };
    }
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(m.S.exp.pos, d)); m.leavePatch(); m.act(dirs[tries % dirs.length]); await wait(200); m.act("confirm"); await wait(300);
  }
  return null;
}`;

test("a crossing slide draws the pawn once at about 0, 150 and 300 ms", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(800);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    const dir = process.env.SHOTS_DIR; if (dir) mkdirSync(dir, { recursive: true });
    if (dir) await page.exposeFunction("__shot", (ms) => page.screenshot({ path: path.join(dir, `slide-${String(ms).padStart(3, "0")}.png`) }));
    const r = await page.evaluate(`(${CROSS})([0, 150, 290])`);
    assert.deepEqual(errors, []);
    assert.ok(r && r.rows, "a place with a way through was found: " + JSON.stringify(r));
    for (const row of r.rows) {
      assert.ok(row.running, "the slide is running at " + row.ms + " ms: " + JSON.stringify(r.rows));
      assert.equal(row.drawn + row.inOld + row.inNew, 1, "the pawn is drawn once at " + row.ms + " ms: " + JSON.stringify(r.rows));
    }
  } finally { await browser.close(); server.close(); }
});
