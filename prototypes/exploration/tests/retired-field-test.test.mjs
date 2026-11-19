// The standalone Companion Field Test page is retired (owner 11-18). The game file stays: /play/ frames it (?embed). Real Chromium (PW_DIR names the folder holding node_modules/playwright; without it the tests are skipped).
//   no query -> the browser goes up one folder (to /play/ on the site); any query keeps the page; ?observer = the device and the Observer panel only.
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
    if (!existsSync(p)) { res.writeHead(404); res.end("none"); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, base: `http://127.0.0.1:${server.address().port}/prototypes/exploration/` };
}
async function open(t, query, fn) {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, base } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + query, { waitUntil: "load" }); await page.waitForTimeout(1200);
    await fn(page, errors);
  } finally { await browser.close(); server.close(); }
}

test("no query: the browser goes up to the play page", { skip }, async (t) => {
  await open(t, "", async (page) => { assert.match(new URL(page.url()).pathname, /^\/prototypes\/$/); });
});

test("?embed keeps the page: the frame the play page loads", { skip }, async (t) => {
  await open(t, "?embed&seed=7", async (page, errors) => {
    assert.match(new URL(page.url()).pathname, /\/prototypes\/exploration\/$/);
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains("embed")), true);
    assert.deepEqual(errors, []);
  });
});

test("?observer: the device and the Observer panel, no Field Test chrome", { skip }, async (t) => {
  await open(t, "?observer&seed=7", async (page, errors) => {
    assert.match(new URL(page.url()).pathname, /\/prototypes\/exploration\/$/);
    assert.equal(await page.evaluate(() => !document.getElementById("obs").hidden), true);
    assert.equal(await page.evaluate(() => document.getElementById("obsToggle").getAttribute("aria-pressed")), "true");
    const text = await page.evaluate(() => document.body.innerText);
    assert.doesNotMatch(text, /Companion Field Test|How to play|What to try|Station page/);
    assert.equal(await page.evaluate(() => document.querySelectorAll("h1").length), 0);
    assert.deepEqual(errors, []);
  });
});
