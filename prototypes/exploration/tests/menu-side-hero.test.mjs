// menu-side-hero-1 (QA's find in verify-live-154): with the pawn at x 192-258 on the view (between the two places the menu box can stand) the box covered him, though the view had room above or below it.
// drawMenu now takes the first place whose rect clears the pawn's drawn rect (the side away from him, the other side, then both at the bottom). Real Chromium; PW_DIR names the folder holding node_modules/playwright, else skipped.
// The pawn stands on the top and the bottom row of the place, where the box can clear him; mid-height the box (372 px of a 520 px view) cannot clear a pawn in the 192-258 band on any side, and keeps today's choice.
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
async function enter(browser, url) {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "no-preference" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=7`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 60 && !(await page.evaluate(() => !!(window.__mb.S.exp && window.__mb.S.exp.patch && window.__mb.S.phase === "patch"))); i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500); }
  return { page, errors };
}

test("the menu box never covers the pawn standing between its two sides", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url);
    const seen = [];
    for (const row of ["top", "bottom"]) for (const x of [3, 12, 15]) {
      const r = await page.evaluate(async ([x, row]) => {
        const m = window.__mb, P = m.S.exp.patch; P.x = x; P.y = row === "top" ? 0 : m.layout(P.key).h - 1;
        m.openMenu(); await new Promise((res) => setTimeout(res, 400));
        const p = m.RT.plScr, b = m.RT.menuBox; m.act("back");
        return p && b ? { px: p.x, py: p.y, b } : null;
      }, [x, row]);
      assert.ok(r, "the menu is drawn over the place");
      assert.ok(r.px >= 192 && r.px <= 258, `the case is reached: the pawn stands at x ${r.px}, in the 192-258 band`);
      seen.push(r.px);
      const clear = r.b.x >= r.px + 16 || r.b.x + r.b.w <= r.px - 16 || r.b.y >= r.py + 16 || r.b.y + r.b.h <= r.py - 16;
      assert.ok(clear, `pawn at ${r.px},${r.py} (${row} row) is covered by the box ${JSON.stringify(r.b)}`);
    }
    assert.equal(seen.length, 6);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
