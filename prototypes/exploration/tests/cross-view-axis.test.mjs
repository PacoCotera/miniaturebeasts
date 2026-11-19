// Bug #36: crossing an edge keeps the view along that edge. After a step up or down the view's x offset is unchanged (the pawn keeps its column, so the view keeps its x);
// after a step left or right its y offset is unchanged. When the new place is a different size the clamp may move it: only pairs of places of one size are held to this.
// Real Chromium; PW_DIR names the folder holding node_modules/playwright (without it the test is skipped).
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

// Walk the explorer from place to place; at each open way through, stand on it, cross, and record the view (place px) and the place size before and after.
const SCAN = `async () => {
  const m = window.__mb, raf = () => new Promise((q) => requestAnimationFrame(q)), wait = (ms) => new Promise((q) => setTimeout(q, ms));
  if (m.S.phase === "map") { m.act("confirm"); await wait(300); }
  const rows = [], seen = new Set();
  for (let tries = 0; tries < 40 && rows.length < 24; tries++) {
    const P = m.S.exp.patch, lay = m.layout(P.key), bk = lay.baked;
    for (const o of bk ? (lay.openings || []) : []) {
      if (m.openingKind(lay, o).kind !== "open") continue;
      const id = P.key + o.side; if (seen.has(id)) continue; seen.add(id);
      const dir = { N: "up", S: "down", W: "left", E: "right" }[o.side], k = Math.floor((o.from + o.to) / 2);
      P.x = o.side === "W" ? 0 : o.side === "E" ? lay.w - 1 : k + bk.ox; P.y = o.side === "N" ? 0 : o.side === "S" ? lay.h - 1 : k + bk.oy;
      await wait(450); await raf(); await raf();
      const before = m.camNow(), w0 = lay.w, h0 = lay.h, key0 = P.key;
      m.act(dir, "creep"); await wait(700); await raf(); await raf();
      const P2 = m.S.exp.patch; if (P2.key === key0) continue;
      const lay2 = m.layout(P2.key), after = m.camNow();
      rows.push({ dir, from: key0, to: P2.key, w0, h0, w1: lay2.w, h1: lay2.h, bx: before.x, by: before.y, ax: after.x, ay: after.y, px0: P.x, py0: P.y, px1: P2.x, py1: P2.y });
      break;
    }
    const P3 = m.S.exp.patch, dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(m.S.exp.pos, d)); if (!dirs.length) break;
    if (m.S.exp.patch === P3) { m.leavePatch(); m.act(dirs[tries % dirs.length]); await wait(200); m.act("confirm"); await wait(400); }
  }
  return rows;
}`;

test("a crossing keeps the view along the edge crossed", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1576, height: 846 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=7`); await page.waitForTimeout(800);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    const rows = await page.evaluate(`(${SCAN})()`);
    assert.deepEqual(errors, []);
    assert.ok(rows.length > 0, "at least one crossing was made");
    for (const r of rows) {
      const vertical = r.dir === "up" || r.dir === "down";
      if (vertical && r.w0 === r.w1) assert.equal(r.ax, r.bx, "crossing " + r.dir + " keeps the view's x: " + JSON.stringify(r));
      if (!vertical && r.h0 === r.h1) assert.equal(r.ay, r.by, "crossing " + r.dir + " keeps the view's y: " + JSON.stringify(r));
    }
  } finally { await browser.close(); server.close(); }
});
