// The place marks (the map's key for place kinds): four kinds, three sizes, found in full colour and been as a slate silhouette; every pixel on the palette,
// an ink outline and at least three colours at 26 px. Real Chromium (PW_DIR; skipped without it).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
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

test("the four place marks at 26, 18 and 12 px: on the palette, an ink outline, three colours or more; been is a slate silhouette", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=6`); await page.waitForTimeout(1200);
    const r = await page.evaluate(() => { const m = window.__mb, out = []; const n = m.PALETTE.length;
      for (const land of [m.L.MEADOW, m.L.WOOD, m.L.ROCK, m.L.POND]) for (const size of m.MARK_SIZES) for (const state of ["found", "been"]) {
        const pb = m.placeMark(land, state, size), cols = new Set(); let ink = 0, bad = 0, on = 0;
        for (const v of pb.p) if (v >= 0) { on++; cols.add(v); if (v === m.C.ink) ink++; if (v >= n) bad++; }
        out.push({ land, size, state, w: pb.w, h: pb.h, colours: cols.size, ink, bad, on, slate: cols.has(m.C.slate) }); }
      return out; });
    assert.equal(r.length, 24);
    for (const q of r) {
      const at = JSON.stringify([q.land, q.size, q.state]);
      assert.equal(q.w, q.size, at); assert.equal(q.bad, 0, "on the palette " + at); assert.ok(q.on > q.size, "something is drawn " + at); assert.ok(q.ink >= q.size / 2, "an ink outline " + at);
      if (q.state === "found" && q.size === 26) assert.ok(q.colours >= 4, "ink plus at least three colours " + at + " " + q.colours);
      if (q.state === "been") assert.ok(q.slate && q.colours === 2, "a slate silhouette with its ink outline " + at + " " + q.colours);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
