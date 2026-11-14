// The Companion's speed check, inside the release play-through (.github/release-check.sh): at a 4x CPU throttle (a phone), eight steps into new cells
// (each one gone down into and left again) and one End Expedition; no long task (main thread, PerformanceObserver) may last over 250 ms. Prints the numbers either way.
//   node prototypes/exploration/tools/speed-check.mjs [--seed=7] [--cpu=4] [--n=8] [--limit=250]     (PW_DIR for playwright)
// It runs the BUNDLED page (the one players get, with its workers): Vite builds it into a temp folder (about 3 s) and the server lays it over the source tree.
import { createRequire } from "node:module"; import { createServer } from "node:http"; import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs"; import { execFileSync } from "node:child_process"; import os from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.."); const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith("--" + n + "=")); return a ? +a.split("=")[1] : d; };
const SEED = arg("seed", 7), CPU = arg("cpu", 4), N = arg("n", 8), LIMIT = arg("limit", 250);
const bundle = mkdtempSync(path.join(os.tmpdir(), "speed-check-")); execFileSync(path.join(root, "prototypes/node_modules/.bin/vite"), ["build", "--config", path.join(root, "prototypes/vite.config.mjs"), "--logLevel", "warn"], { env: { ...process.env, MB_BUNDLE_OUT: bundle }, stdio: "inherit" });
const server = createServer((req, res) => { const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"); let p = path.join(root, rel); const b = path.join(bundle, rel.replace(/^\/prototypes\//, ""));
  if (rel.startsWith("/prototypes/") && existsSync(b) && statSync(b).isFile()) p = b; else if (rel === "/prototypes/exploration/" || rel === "/prototypes/exploration/index.html") p = path.join(bundle, "exploration/index.html");
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; } res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p)); });
await new Promise((r) => server.listen(0, "127.0.0.1", r)); const port = server.address().port;
const errors = [], browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 }), page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
const quiet = (u) => /\/(build\.json|caddy-api\/)/.test(u);   // the sandbox's own server answers these; the static server here does not
page.on("response", (r) => { if (r.status() >= 400 && !quiet(r.url())) errors.push("http " + r.status() + " " + r.url()); }); page.on("pageerror", (e) => errors.push("pageerror " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/status of 404/.test(m.text())) errors.push("console error " + m.text().slice(0, 300)); });
await page.addInitScript(() => { window.__long = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ type: "longtask", buffered: true }); } catch (e) { window.__noLongtask = true; } });
await page.goto(`http://127.0.0.1:${port}/prototypes/exploration/index.html?seed=${SEED}`);
try { await page.waitForFunction(() => window.__mb && window.__mb.ART48.ready, null, { timeout: 30000 }); } catch (e) { console.log("speed check: FAIL, the page did not come up\n" + errors.join("\n")); process.exit(1); }
await page.waitForTimeout(500);
await page.evaluate(() => { window.__mb.TEST.calm = true; window.__mb.act("confirm"); }); await page.waitForTimeout(150); await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(600);
await page.evaluate(() => { const m = window.__mb; if (m.S.phase !== "patch") m.act("confirm"); }); await page.waitForTimeout(800);   // the set-out
await page.evaluate(() => { const m = window.__mb; if (m.S.exp && m.S.exp.patch) m.leavePatch(); }); await page.waitForTimeout(500);
if (await page.evaluate(() => !!window.__noLongtask)) { console.log("speed check: FAIL, this browser has no long-task observer"); process.exit(1); }
await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }); await page.evaluate(() => { window.__long.length = 0; });
let steps = 0;
for (let i = 0; i < N; i++) {
  const moved = await page.evaluate(() => { const m = window.__mb, ex = m.S.exp, D = { up: -m.MW, down: m.MW, left: -1, right: 1 };
    const dirs = ["up", "right", "down", "left"].filter((d) => m.canStep(ex.pos, d) && !m.crossReason(ex.pos, d)), dir = dirs.find((d) => !m.S.visited[ex.pos + D[d]] && !ex.trail.includes(ex.pos + D[d])) || dirs[0]; if (!dir) return false; m.act(dir); return true; });
  if (!moved) break; steps++; await page.waitForTimeout(700);
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(700);
  await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); if (m.S.exp && m.S.exp.patch) m.leavePatch(); }); await page.waitForTimeout(300);
}
const mapLong = await page.evaluate(() => window.__long.slice()); await page.evaluate(() => { window.__long.length = 0; });
await page.evaluate(() => window.__mb.endExpedition("sent")); await page.waitForTimeout(3000);
const endLong = await page.evaluate(() => window.__long.slice()), phase = await page.evaluate(() => window.__mb.S.phase);
await browser.close(); server.close(); rmSync(bundle, { recursive: true, force: true });
const max = (a) => Math.max(0, ...a), fmt = (a) => (a.length ? a.join(", ") : "none") + ` (longest ${max(a)} ms)`, worst = max([...mapLong, ...endLong]);
console.log(`speed check at ${CPU}x CPU, seed ${SEED}: ${steps} map steps, long tasks: ${fmt(mapLong)}; End Expedition (phase ${phase}): ${fmt(endLong)}`);
let bad = errors.slice(); if (steps < N) bad.push(`only ${steps} of ${N} map steps could be taken`); if (worst > LIMIT) bad.push(`a task of ${worst} ms is over ${LIMIT} ms`);
if (bad.length) { console.log("speed check: FAIL\n" + bad.join("\n")); process.exit(1); }
console.log(`speed check: ok, longest task ${worst} ms (limit ${LIMIT})`);
