// Owner #176: leave a place for the map and go back into the same place: he stands where he stood, facing as he did.
// A taken tile lands on the nearest free one; another place lands as before. Real Chromium; PW_DIR names the folder holding node_modules/playwright (without it the test is skipped).
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

test("back into the place he left for the map, he stands where he stood", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 412, height: 915 } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(800);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const m = window.__mb, wait = (ms) => new Promise((q) => setTimeout(q, ms)), out = {};
      for (let i = 0; i < 100 && !(m.S.exp && m.S.exp.patch); i++) { if (m.S.exp && m.S.phase === "map") m.act("confirm"); await wait(200); }
      const P = () => m.S.exp.patch, lay = () => m.layout(P().key);
      // a reachable tile that is not where he landed
      const first = { x: P().x, y: P().y, key: P().key }, L = lay();
      let spot = null;
      for (let y = 0; y < L.h && !spot; y++) for (let x = 0; x < L.w && !spot; x++) {
        if (L.reach[y * L.w + x] && !m.T_BLOCK[L.tiles[y * L.w + x]] && !m.occupant(first.key, x, y, "player") && Math.hypot(x - first.x, y - first.y) > 4) spot = { x, y };
      }
      P().x = spot.x; P().y = spot.y; P().dir = "left";
      m.leavePatch(); await wait(300); m.act("confirm"); await wait(400);
      out.back = { x: P().x, y: P().y, dir: P().dir, same: P().key === first.key }; out.spot = spot;
      // a taken tile: an animal stands on it
      m.leavePatch(); await wait(300);
      const live = m.S.exp.live[first.key], c = live.cr[0];
      if (c) { c.x = spot.x; c.y = spot.y; c.hide = false; }
      m.act("confirm"); await wait(400);
      out.taken = { x: P().x, y: P().y, had: !!c };
      // the spot rides in the save: it is kept until he goes in
      m.leavePatch(); await wait(200);
      out.saved = JSON.parse(localStorage.getItem(m.SAVE_KEY)).exp.spot;
      return out;
    });
    assert.deepEqual(errors, []);
    assert.deepEqual({ x: r.back.x, y: r.back.y, dir: r.back.dir, same: r.back.same }, { ...r.spot, dir: "left", same: true }, JSON.stringify(r));
    if (r.taken.had) assert.ok(Math.hypot(r.taken.x - r.spot.x, r.taken.y - r.spot.y) <= 2 && (r.taken.x !== r.spot.x || r.taken.y !== r.spot.y), "nearest free tile: " + JSON.stringify(r));
    assert.ok(r.saved && r.saved.key, "the kept spot is in the save: " + JSON.stringify(r));
  } finally { await browser.close(); server.close(); }
});
