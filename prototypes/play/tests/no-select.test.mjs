// A long press on the play page's keys or screens is a held key, never selected text or the browser's text menu (owner bug, Firefox on a phone).
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the tests are skipped).
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
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm", ".svg": "image/svg+xml" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end("none"); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, base: `http://127.0.0.1:${server.address().port}/prototypes/play/` };
}

const selectOf = (sel) => { const el = document.querySelector(sel); if (!el) return "missing"; const s = getComputedStyle(el); return s.userSelect || s.webkitUserSelect; };
const menuBlocked = (sel) => { const el = document.querySelector(sel); if (!el) return "missing"; const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true }); el.dispatchEvent(e); return e.defaultPrevented; };

test("the phone play page: keys, rows and both screens are not selectable, and a long press opens no menu", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
  const { server, base } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
    await page.goto(base, { waitUntil: "load" }); await page.waitForTimeout(2500);
    for (const sel of ["#stage", "#rowCompanion", "#bar", "#asleepStrip"]) assert.equal(await page.evaluate(selectOf, sel), "none", sel + " is not selectable");
    for (const sel of ["#rowCompanion", "#shCompanion", "#dockRoot"]) assert.equal(await page.evaluate(menuBlocked, sel), true, sel + ": a long press opens no menu");
    for (const [id, name] of [["fCompanion", "Companion"], ["fStation", "Station"]]) {
      const frame = page.frame({ url: new RegExp(name === "Companion" ? "exploration/\\?embed" : "station/\\?embed") });
      assert.ok(frame, name + " frame loaded");
      assert.equal(await frame.evaluate(selectOf, "#screen"), "none", name + ": the screen is not selectable");
      assert.equal(await frame.evaluate(menuBlocked, "#screen"), true, name + ": a long press on the screen opens no menu");
    }
  } finally { await browser.close(); server.close(); }
});
