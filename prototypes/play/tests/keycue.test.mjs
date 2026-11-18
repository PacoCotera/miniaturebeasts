// A frame's key cue (mb-keycue, PR 356's first walk): the play page draws the keys, so it rings the drawn Call key until told to stop, and hops it on ✓.
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

const callKey = () => { const el = document.querySelector('#rowCompanion .fk[data-id="call"]'); if (!el) return null; const s = getComputedStyle(el); return { outline: s.outlineStyle, anim: s.animationName }; };
const post = (m) => { parent.postMessage(m, location.origin); };

test("the phone play page: the Companion's mb-keycue rings and hops the drawn Call key", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch { t.skip("no Chromium"); return; }
  const { server, base } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
    await page.goto(base, { waitUntil: "load" }); await page.waitForTimeout(2500);
    const frame = page.frame({ url: /exploration\/\?embed/ }); assert.ok(frame, "Companion frame loaded");
    const settle = () => page.waitForTimeout(150);
    await frame.evaluate(post, { t: "mb-keycue", key: "call", ring: false }); await settle();   // the page's own first-walk state may have rung it: start from off
    assert.equal((await page.evaluate(callKey)).outline, "none", "no ring at rest");
    await frame.evaluate(post, { t: "mb-keycue", key: "call", ring: true }); await settle();
    assert.equal((await page.evaluate(callKey)).outline, "solid", "the Call key rings");
    await page.evaluate(post, { t: "mb-keycue", key: "call", ring: false }); await settle();   // the page itself is not a frame: ignored
    assert.equal((await page.evaluate(callKey)).outline, "solid", "only a frame sets a cue");
    await frame.evaluate(post, { t: "mb-keycue", key: "call", hop: 1 }); await settle();
    assert.equal((await page.evaluate(callKey)).anim, "keyhop", "the Call key hops");
    assert.equal((await page.evaluate(callKey)).outline, "solid", "a hop keeps the ring");
    await frame.evaluate(post, { t: "mb-keycue", key: "call", ring: false }); await settle();
    assert.equal((await page.evaluate(callKey)).outline, "none", "the ring ends when the frame says so");
  } finally { await browser.close(); server.close(); }
});
