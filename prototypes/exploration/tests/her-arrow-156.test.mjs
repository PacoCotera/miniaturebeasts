// #156 / R145-07, played: the arrow (←) is about the Loika in sight. An unnamed one in sight (QA's R145 save, Hazel, walk 7 left) = no page to offer, so the arrow reads "Leave",
// never her page from the top line's name; a named one in sight (his #156 save, Drizzle) still reads "her page". Real Chromium, the real page, generator 7, presses only, at 412x915 and 522x935.
// PW_DIR names the folder holding node_modules/playwright, else skipped.
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
const arrow = (page) => page.evaluate(() => { const m = window.__mb, l = m.lineFor(); return JSON.stringify({ back: l.back, sight: m.herInSight(), named: m.herNamed() }); }).then(JSON.parse);

for (const [w, h] of [[412, 915], [522, 935]]) {
  test(`R145-07 (${w}x${h}): Hazel in view, unnamed, 7 presses left: the arrow reads Leave, not her page`, { skip }, async (t) => {
    let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
    const { server, url } = await serve();
    try {
      const { page, errors } = await load(browser, url, fx("owner-note-145-hazel.save.json"), w, h);
      for (let i = 0; i < 7; i++) { await page.evaluate(() => window.__mb.act("left")); await page.waitForTimeout(500); }
      const r = await arrow(page);
      assert.equal(r.sight, "70", "Hazel (met) is the one in sight");
      assert.equal(r.named, "70", "and the one named: " + JSON.stringify(r));
      assert.equal(r.back, "Leave", "her name is not on the line (the pod action leads it), so the arrow keeps its word: " + JSON.stringify(r));
      assert.deepEqual(errors, []);
    } finally { await browser.close(); server.close(); }
  });
}
