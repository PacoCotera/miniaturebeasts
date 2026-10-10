// The Station page in a browser for the tools that take a screen's states (pods-states.mjs, home-states.mjs): the repository served beside the sandbox's paths, the fixture save loaded once, the face in test mode (?test),
// page errors and console errors failing the run. `motion: false` is the reduced-motion preference (the goldens: the walk and the events jump to their end).
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".wasm": "application/wasm", ".css": "text/css" };

// `clock: true` replaces the page's clock with a virtual one the tool steps: requestAnimationFrame callbacks and performance.now() read it (frame time and key time agree), Date.now() stays real (the rules' time).
// `step(ms)` runs the frames of the next `ms` milliseconds at 40 ms and returns the virtual time; a timed event is then captured at an exact instant.
const VIRTUAL_CLOCK = () => { let t = 1000, q = []; window.__vt = () => t; performance.now = () => t; window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
  window.__step = (ms) => { const end = t + ms; while (t < end) { t = Math.min(end, t + 40); const run = q; q = []; for (const cb of run) cb(t); } return t; }; };

export async function openStation({ motion = true, clock = false } = {}) {
  if (!existsSync(path.join(here, "../dist/face.wasm"))) { console.error("the face is not built (prototypes/face/build.sh)"); process.exit(2); }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port, fails = [], fail = (m) => { fails.push(m); console.error("FAIL " + m); };
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1, reducedMotion: motion ? "no-preference" : "reduce" });
  page.on("pageerror", (e) => fail("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fail("console: " + m.text().split("\n")[0]); });
  if (clock) await page.addInitScript(VIRTUAL_CLOCK);
  const fixture = readFileSync(path.join(root, "station/tests/fixtures/save-v8-schema1.json"), "utf8");
  await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
  await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev&test`, { waitUntil: "load" });
  await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
  const step = (ms) => page.evaluate((m) => window.__step(m), ms);
  if (clock) await step(200);
  return { page, fails, fail, step, close: async () => { await browser.close(); server.close(); } };
}
