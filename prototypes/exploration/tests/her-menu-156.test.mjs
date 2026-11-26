// #156 / R145-07, played: the menu's first row is about the Loika in view. An unnamed one in view (QA's #145 save, Hazel, walk 7 left) = no page offered, so the row is not
// "<top line's name> · her page" (Juniper, off-screen); a named one in view (his #156 save, Drizzle) still reads "Drizzle · her page" and opens hers.
// Real Chromium, the real page, generator 7, presses only, at 412x915 and 522x935. PW_DIR names the folder holding node_modules/playwright, else skipped.
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
const fx = (n) => readFileSync(new URL("./fixtures/" + n, import.meta.url), "utf8");

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
async function load(browser, url, save, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "no-preference" });
  await ctx.addInitScript((s) => { localStorage.setItem("mb-save-v8", s); }, save);
  const page = await ctx.newPage(); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(2500);
  for (let i = 0; i < 40 && !(await page.evaluate(() => !!(window.__mb.S.exp && window.__mb.S.exp.patch && window.__mb.S.phase === "patch"))); i++) await page.waitForTimeout(500);
  return { page, errors };
}
// press ← (opens the menu), read the first row
const menuRow = (page) => page.evaluate(() => { const m = window.__mb; m.act("back"); const it = m.menuItems()[0]; return JSON.stringify({ phase: m.S.phase, id: it.id, label: it.label, inSight: m.indInSight(true) ? 1 : 0 }); }).then(JSON.parse);

for (const [w, h] of [[412, 915], [522, 935]]) {
  test(`#145 (${w}x${h}): Hazel in view, unnamed, 7 presses left: the menu's first row does not read Juniper`, { skip }, async (t) => {
    let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
    const { server, url } = await serve();
    try {
      const { page, errors } = await load(browser, url, fx("owner-note-145-hazel.save.json"), w, h);
      const her0 = await page.evaluate(() => window.__mb.herInSight());   // as loaded: Hazel (met, kind not known yet, settled) stands 2 tiles off; the line itself keeps the pod action ("3 to take"), which leads it
      assert.equal(her0, "70", "the one the screen names is Hazel");
      const r0 = await page.evaluate(() => { const m = window.__mb; m.act("back"); const it = m.menuItems()[0]; const o = JSON.stringify({ id: it.id, label: it.label, inSight: m.indInSight(true) ? 1 : 0 }); return o; }).then(JSON.parse);
      assert.equal(r0.inSight, 1, "as loaded, she is in view: " + JSON.stringify(r0));
      assert.equal(r0.label, "Hazel · her page", "as loaded: " + JSON.stringify(r0));
      await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500);
      const o0 = await page.evaluate(() => JSON.stringify({ phase: window.__mb.S.phase, name: window.__mb.S.named[window.__mb.S.ui.her && window.__mb.S.ui.her.id] })).then(JSON.parse);
      assert.deepEqual(o0, { phase: "her", name: "Hazel" }, "✓ opens Hazel's page");
      await page.evaluate(() => window.__mb.act("back")); await page.waitForTimeout(500);
      await page.waitForTimeout(500);
      for (let i = 0; i < 7; i++) { await page.evaluate(() => window.__mb.act("left")); await page.waitForTimeout(500); }
      const r = await menuRow(page);
      assert.equal(r.phase, "menu", JSON.stringify(r));
      assert.equal(r.inSight, 1, "she is still in view: " + JSON.stringify(r));
      assert.equal(r.label, "Hazel · her page", "her page is the first row: " + JSON.stringify(r));
      assert.ok(!/Juniper/.test(r.label), JSON.stringify(r));
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
  test(`#156 (${w}x${h}): Drizzle named and in view: the menu's first row reads Drizzle · her page and opens hers`, { skip }, async (t) => {
    let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
    const { server, url } = await serve();
    try {
      const { page, errors } = await load(browser, url, fx("owner-note-156-drizzle.save.json"), w, h);
      const r = await menuRow(page);
      assert.equal(r.label, "Drizzle · her page", JSON.stringify(r));
      await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500);
      const o = await page.evaluate(() => JSON.stringify({ phase: window.__mb.S.phase, id: window.__mb.S.ui.her && window.__mb.S.ui.her.id, name: window.__mb.S.named[window.__mb.S.ui.her && window.__mb.S.ui.her.id] })).then(JSON.parse);
      assert.equal(o.phase, "her", JSON.stringify(o)); assert.equal(o.name, "Drizzle", JSON.stringify(o));
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}
