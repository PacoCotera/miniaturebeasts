// Bug 68: on a browser that alters canvas read-back (Brave / Firefox resistFingerprinting / Samsung Internet farbling, or colour-managed PNGs) the 48 px land must still load.
// The live-like page /play (prototypes/play/) at 390x844, with getImageData adding +-1 to every channel, then with a colour-managed curve: 0 pieces refused, the land loaded.
// Real Chromium; PW_DIR names the folder holding node_modules/playwright, else skipped. TREE=<repo root> serves another checkout (the "before" shots); STILLS=<dir> writes the pictures.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = process.env.TREE || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".woff2": "font/woff2" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/play/index.html` };
}
// Injected into every frame before the page runs: what a farbling or colour-managing browser does to a canvas read-back.
const NOISE = {
  "+-1 noise": () => { const g = CanvasRenderingContext2D.prototype.getImageData; CanvasRenderingContext2D.prototype.getImageData = function (...a) { const im = g.apply(this, a), d = im.data; for (let i = 0; i < d.length; i++) if (i % 4 !== 3) d[i] = Math.max(0, Math.min(255, d[i] + (((i >> 2) + i) & 1 ? 1 : -1))); return im; }; },
  "colour managed": () => { const g = CanvasRenderingContext2D.prototype.getImageData; CanvasRenderingContext2D.prototype.getImageData = function (...a) { const im = g.apply(this, a), d = im.data; for (let i = 0; i < d.length; i++) if (i % 4 !== 3) d[i] = Math.round(255 * Math.pow(d[i] / 255, 1 / 1.08)); return im; }; },
};

for (const [name, noise] of Object.entries(NOISE)) {
  test("the land loads on /play at 390x844 with a canvas that gives " + name, { skip, timeout: 120000 }, async () => {
    const { server, url } = await serve(), browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await ctx.addInitScript(noise);
      const page = await ctx.newPage(), errors = []; page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => { if (/did not load|refused/.test(m.text())) errors.push("console: " + m.text()); });   // any art that fails to load says so on the console
      await page.goto(url); await page.waitForTimeout(6000);
      const frame = page.frames().find((f) => /exploration/.test(f.url()));
      assert.ok(frame, "the Companion frame is on /play");
      await frame.waitForFunction(() => window.__mb && window.__mb.ART48 && (window.__mb.ART48.ready || window.__mb.ART48.refusedWhy || window.__mb.ART48.pieces.size), null, { timeout: 40000 }).catch(() => {});   // the atlas load ends in one of these
      const got = await frame.evaluate(() => { const a = window.__mb.ART48; return { ready: a.ready, refused: a.refused.length, why: a.refusedWhy || "", pieces: a.pieces.size }; });
      if (process.env.STILLS) { mkdirSync(process.env.STILLS, { recursive: true }); await page.screenshot({ path: path.join(process.env.STILLS, (process.env.TAG || "after") + "-" + name.replace(/[^a-z0-9]+/gi, "-") + ".png") }); }
      assert.equal(got.refused, 0, "pieces refused: " + got.why);
      assert.ok(got.pieces > 300, "the atlas pieces loaded: " + got.pieces);
      assert.ok(got.ready, "the core set is ready");
      assert.deepEqual(errors.filter((m) => !/Unexpected end of JSON/.test(m)), []);   // that one is /build.json or the Caddy API, which this static server does not have
    } finally { await browser.close(); server.close(); }
  });
}
