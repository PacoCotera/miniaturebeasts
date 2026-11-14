// The Station's load budget (station-load plan, T-20261107-station-load): loads station/ the way a phone does (10 Mbps down, 3 up, 150 ms RTT, 4x CPU, 412x915 mobile), cold then warm in one
// context, against a static server whose headers mirror ops/sandbox/Caddyfile (its `header` lines are read from it, so the two cannot drift; gzip for text types; ETag and 304).
// First draw = the screen canvas has pixels; playable = the boot line names the species frames. Prints one line for the report:
//   load-budget: cold 7.9 s / 9.8 MB / 182 req · warm 2.1 s / 0.2 MB · heap 140 MB
// usage: node load-budget.mjs [--runs N] [--report] [--out dir] [--no-throttle] [--profile]
// Fails above LIMITS (below): hard for bytes, requests and heap, the median of N runs with TIME_MARGIN for the times. --report only prints; --no-throttle (the unthrottled line) and --profile (a CPU profile of the cold pass) never fail.
import { writeFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fixtureStorage } from "./fixture-save.mjs";
import { startSandbox } from "./sandbox-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const PROFILE = args.includes("--profile"); let profiled = false;
const RUNS = +opt("--runs", 1), THROTTLE = !args.includes("--no-throttle"), OUT = opt("--out", null);

// The limits the gate fails above (bytes, requests and heap are hard; the times get TIME_MARGIN). Set after T5 (masters on demand) from what the tree measured on the phone profile: cold 13.8 s / 7.1 MB / 328 req,
// warm 6.7 s / 0.04 MB, heap 109 MB (limits sit above that, the times at about 1.4x). The plan's targets are TARGET: the requests (123 unbundled modules, 21 species frames, 25 specs) and the times that follow from them wait for the Vite build (T8).
// The unthrottled line is not checked here. `--report` turns the failing off again.
const ENFORCE = THROTTLE && !PROFILE && !args.includes("--report");
const LIMITS = { coldS: 20, coldMB: 12, coldReq: 350, warmS: 10, warmMB: 1, heapMB: 250, barS: 1.5, modReq: 10 };
export const TARGET = { coldS: 10, coldMB: 12, coldReq: 250, warmS: 3, warmMB: 1, heapMB: 250 };
const TIME_MARGIN = 1.5;   // the gate machine's CPU noise: the time limits get +50 %

const SITE = opt("--site", null);   // --site <dir>: the bundled copy (an assembled site with the pages built over it, ops/sandbox/bundle-pages.sh), served as /sandbox/; else the source tree
const sandbox = await startSandbox({ site: SITE ? path.resolve(SITE) : null }), server = sandbox.server, URL_ = sandbox.url;

// --- the probe ---
const PHONE = { offline: false, latency: 150, downloadThroughput: (10 * 1e6) / 8, uploadThroughput: (3 * 1e6) / 8 };
const CPU = 4;
async function pass(page, cdp) {
  const reqs = new Map();
  const onReq = (e) => reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp });
  const onResp = (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromCache = !!(e.response.fromDiskCache || e.response.fromServiceWorker); } };
  const onFin = (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp; } };
  cdp.on("Network.requestWillBeSent", onReq); cdp.on("Network.responseReceived", onResp); cdp.on("Network.loadingFinished", onFin);
  if (PROFILE && !profiled) { await cdp.send("Profiler.enable"); await cdp.send("Profiler.start"); }
  const t0 = Date.now(); let firstDraw = null, ready = null, bootErr = null, barAt = null;
  await page.goto(URL_ + "?load-budget", { waitUntil: "commit", timeout: 600000 });
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const c = document.getElementById("screen"); let drawn = false;
      try { const x = c && c.getContext("2d"); if (x) { const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4 * 997) if (d[i + 3] && (d[i] || d[i + 1] || d[i + 2])) { drawn = true; break; } } } catch (e) {}
      const bar = document.getElementById("bootBar");
      return { drawn, bar: !!(bar && !bar.hidden && bar.offsetParent), boot: document.getElementById("boot")?.textContent || "" };
    }).catch(() => ({ drawn: false, boot: "" }));
    const now = Date.now() - t0;
    if (s.drawn && firstDraw == null) firstDraw = now;
    if (s.bar && barAt == null) barAt = now;   // the load bar (T6): first seen on the page
    if (/did not start/.test(s.boot)) { bootErr = s.boot; break; }
    if (/\d+ species frames ·/.test(s.boot) && ready == null) ready = now;
    if (ready != null && firstDraw != null) break;
    await page.waitForTimeout(100);
  }
  if (PROFILE && !profiled) {   // --profile: the main thread's self time by function until the first draw, the top 25 (a CPU profile of the cold pass)
    profiled = true; const { profile } = await cdp.send("Profiler.stop"), self = new Map(), dt = new Map(profile.nodes.map((n) => [n.id, 0]));
    profile.samples.forEach((id, i) => dt.set(id, dt.get(id) + (profile.timeDeltas[i] ?? 0)));
    for (const n of profile.nodes) { const k = `${n.callFrame.functionName || "(anon)"} ${n.callFrame.url.replace(/^.*\/sandbox\//, "")}:${n.callFrame.lineNumber}`; self.set(k, (self.get(k) ?? 0) + dt.get(n.id) / 1000); }
    console.log("cpu profile, self ms: " + [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${Math.round(v)} ${k}`).join("\n  "));
  }
  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
  cdp.off("Network.requestWillBeSent", onReq); cdp.off("Network.responseReceived", onResp); cdp.off("Network.loadingFinished", onFin);
  const list = [...reqs.values()], base = Math.min(...list.map((r) => r.t0));
  const endAbs = base + ((firstDraw ?? ready ?? Date.now() - t0) / 1000) - 0;   // the requests that began before the first draw (t0 of the page is at the navigation: close enough to the first request)
  const before = list.filter((r) => r.t0 - base <= (firstDraw ?? ready) / 1000);
  const sum = (a) => a.reduce((s, r) => s + (r.bytes || 0), 0);
  const top = before.map((r) => ({ url: r.url.replace(/^.*\/sandbox\//, ""), kb: Math.round((r.bytes || 0) / 1024), ms: Math.round(((r.t1 || r.t0) - r.t0) * 1000) })).sort((a, b) => b.ms - a.ms).slice(0, 10);
  void endAbs;
  const reqsOut = OUT ? before.map((r) => [r.url.replace(/^.*\/sandbox\//, ""), Math.round((r.bytes || 0) / 1024), Math.round((r.t0 - base) * 1000), Math.round(((r.t1 || r.t0) - base) * 1000)]) : undefined;
  return { barMs: barAt, firstDrawMs: firstDraw, playableMs: ready, bootErr, requests: before.length, totalRequests: list.length, mb: +(sum(before) / 1e6).toFixed(2), mbTotal: +(sum(list) / 1e6).toFixed(2), n304: before.filter((r) => r.status === 304).length, nCache: before.filter((r) => r.fromCache).length, heapMB: heap, modules: before.filter((r) => /\.m?js(\?|$)/.test(r.url)).length, top, reqs: reqsOut };
}
async function once() {
  // a persistent context: a real profile's disk cache (an incognito context keeps a small in-memory cache that cannot hold the 150 MB, which made every warm load a cold one)
  const ctx = await chromium.launchPersistentContext(mkdtempSync(path.join(tmpdir(), "mb-load-budget-")), { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: THROTTLE, hasTouch: THROTTLE });
  const browser = ctx;
  await ctx.addInitScript((entries) => { if (location.protocol !== "about:" && !sessionStorage.getItem("fixture-done")) { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("fixture-done", "1"); } }, fixtureStorage());   // a player with the fixture's mibis, on Home
  const page = ctx.pages()[0] ?? await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
  if (THROTTLE) { await cdp.send("Network.emulateNetworkConditions", PHONE); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }); }
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const cold = await pass(page, cdp);
  await page.goto("about:blank"); await page.waitForTimeout(2000);   // the cold page's background cache warming is cancelled with the page (its queued bytes would otherwise slow the emulated link for the warm load)
  const warm = await pass(page, cdp);
  await browser.close();
  return { cold, warm };
}
const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await once());
server.close();
const med = (f) => { const v = runs.map(f).filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const s = (ms) => (ms == null ? "n/a" : (ms / 1000).toFixed(1));
const M = { coldS: med((r) => r.cold.firstDrawMs) / 1000, coldMB: med((r) => r.cold.mb), coldReq: med((r) => r.cold.requests), warmS: med((r) => r.warm.firstDrawMs) / 1000, warmMB: med((r) => r.warm.mb), heapMB: med((r) => r.cold.heapMB), modReq: med((r) => r.cold.modules), barS: med((r) => r.cold.barMs) / 1000 };
console.log(`load-budget: cold ${s(M.coldS * 1000)} s / ${M.coldMB} MB / ${M.coldReq} req · warm ${s(M.warmS * 1000)} s / ${M.warmMB} MB · heap ${M.heapMB} MB · ${M.modReq} script req · load bar at ${s(M.barS * 1000)} s${THROTTLE ? "" : " (unthrottled)"}`);
const errs = runs.flatMap((r) => [r.cold.bootErr, r.warm.bootErr]).filter(Boolean);
if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(path.join(OUT, "load-budget.json"), JSON.stringify({ runs, M }, null, 1)); }
for (const e of errs) console.error("FAIL boot: " + e);
let fail = errs.length > 0;
const checks = [["coldS", "cold first draw (s)", TIME_MARGIN], ["coldMB", "cold MB before first draw", 1], ["coldReq", "cold requests before first draw", 1], ["warmS", "warm first draw (s)", TIME_MARGIN], ["warmMB", "warm MB transferred before first draw", 1], ["heapMB", "JS heap at playable (MB)", 1], ["barS", "the load bar is on the page (s)", TIME_MARGIN], ...(SITE ? [["modReq", "script requests before first draw (the built copy)", 1]] : [])];
for (const [k, label, margin] of checks) {
  const over = !(M[k] <= LIMITS[k] * margin);
  if (over) { console.log(`${ENFORCE ? "FAIL" : "over (report only)"}: ${label} ${M[k]} > ${LIMITS[k]}${margin > 1 ? " +50 %" : ""}`); if (ENFORCE) fail = true; }
}
if (fail || !ENFORCE) { const t = runs.find((r) => r.cold.top)?.cold.top ?? []; console.log("cold waterfall, slowest 10: " + t.map((x) => `${x.url} ${x.kb}KB ${x.ms}ms`).join(" | ")); }
process.exit(fail ? 1 : 0);
