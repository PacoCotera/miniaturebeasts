// The Station's load budget (station-load plan, T-20261107-station-load): loads station/ the way a phone does (10 Mbps down, 3 up, 150 ms RTT, 4x CPU, 412x915 mobile), cold then warm in one
// context, against a static server whose headers mirror ops/sandbox/Caddyfile (its `header` lines are read from it, so the two cannot drift; gzip for text types; ETag and 304).
// First draw = the screen canvas has pixels; playable = the boot line names the species frames. Prints one line for the report:
//   load-budget: cold 7.9 s / 9.8 MB / 182 req · warm 2.1 s / 0.2 MB · heap 140 MB
// usage: node load-budget.mjs [--runs N] [--enforce] [--out dir] [--no-throttle]
// Report-only until ENFORCE (below, or --enforce) is on: the limits are then hard for bytes, requests and heap and checked on the median of N runs (with TIME_MARGIN) for the times.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fixtureStorage } from "./fixture-save.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const RUNS = +opt("--runs", 1), THROTTLE = !args.includes("--no-throttle"), OUT = opt("--out", null);

// The limits (the plan's section 4: "after P3, gate fails above"). ENFORCE stays false until the on-demand masters land; the unthrottled line is not checked here.
const ENFORCE = args.includes("--enforce") || false;
const LIMITS = { coldS: 10, coldMB: 12, coldReq: 250, warmS: 3, warmMB: 1, heapMB: 250 };
const TIME_MARGIN = 1.5;   // the gate machine's CPU noise: the time limits get +50 %

// --- the static server: prototypes/ as /sandbox/, the Caddyfile's header lines, gzip, ETag ---
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm" };
const GZ = new Set([".html", ".mjs", ".js", ".json", ".wasm", ".css"]);
const caddyfile = readFileSync(path.resolve(root, "../ops/sandbox/Caddyfile"), "utf8");
// `header <matcher> Field "value"` lines inside the file server's handle: <matcher> is a path (a trailing * is a prefix), or the name of a `@name { path ...; query k=v }` block; the last matching line wins, as in Caddy.
const matchers = {};
for (const m of caddyfile.matchAll(/^\s*@(\w+)\s*\{([^}]*)\}/gm)) matchers[m[1]] = { paths: [...m[2].matchAll(/^\s*path\s+(\S+)/gm)].map((x) => x[1]), queries: [...m[2].matchAll(/^\s*query\s+(\S+)/gm)].map((x) => x[1]) };
const inPath = (pat, p) => (pat.endsWith("*") ? p.startsWith(pat.slice(0, -1)) : p === pat);
const rules = [...caddyfile.matchAll(/^\s*header\s+(\S+)\s+\??([A-Za-z-]+)\s+"([^"]*)"/gm)].map((m) => ({ matcher: m[1], field: m[2].toLowerCase(), value: m[3] }));
const matches = (r, p, q) => {
  if (r.matcher.startsWith("/")) return inPath(r.matcher, p);
  const mm = matchers[r.matcher.replace(/^@/, "")]; if (!mm) return false;
  return mm.paths.some((x) => inPath(x, p)) && mm.queries.every((k) => { const [name, val] = k.split("="); return val === "*" ? new URLSearchParams(q).has(name) : new URLSearchParams(q).get(name) === val; });
};
const encodes = /^\s*encode\s+(.*)$/m.exec(caddyfile)?.[1].split(/\s+/) ?? [];
const gzCache = new Map();
const server = createServer((req, res) => {
  const [rawPath, q = ""] = req.url.split("?"), urlPath = decodeURIComponent(rawPath);
  if (req.url.startsWith("/caddy-api/")) { res.writeHead(502); res.end(); return; }   // no Caddy service in this probe: the page copes (the journey runs the mock)
  let p = path.join(root, urlPath.replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
  const ext = path.extname(p), st = statSync(p), etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
  const headers = { "content-type": types[ext] ?? "application/octet-stream", etag, vary: "Accept-Encoding" };
  for (const r of rules) if (matches(r, urlPath, q)) headers[r.field] = r.value;
  if (req.headers["if-none-match"] === etag) { res.writeHead(304, headers); res.end(); return; }
  let body = readFileSync(p);
  if (encodes.length && GZ.has(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "")) { if (!gzCache.has(p + etag)) gzCache.set(p + etag, gzipSync(body)); body = gzCache.get(p + etag); headers["content-encoding"] = "gzip"; }
  res.writeHead(200, headers); res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL_ = `http://127.0.0.1:${server.address().port}/sandbox/station/`;

// --- the probe ---
const PHONE = { offline: false, latency: 150, downloadThroughput: (10 * 1e6) / 8, uploadThroughput: (3 * 1e6) / 8 };
const CPU = 4;
async function pass(page, cdp) {
  const reqs = new Map();
  const onReq = (e) => reqs.set(e.requestId, { url: e.request.url, t0: e.timestamp });
  const onResp = (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.fromCache = !!(e.response.fromDiskCache || e.response.fromServiceWorker); } };
  const onFin = (e) => { const r = reqs.get(e.requestId); if (r) { r.bytes = e.encodedDataLength; r.t1 = e.timestamp; } };
  cdp.on("Network.requestWillBeSent", onReq); cdp.on("Network.responseReceived", onResp); cdp.on("Network.loadingFinished", onFin);
  const t0 = Date.now(); let firstDraw = null, ready = null, bootErr = null;
  await page.goto(URL_ + "?load-budget", { waitUntil: "commit", timeout: 600000 });
  const deadline = Date.now() + 600000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const c = document.getElementById("screen"); let drawn = false;
      try { const x = c && c.getContext("2d"); if (x) { const d = x.getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4 * 997) if (d[i + 3] && (d[i] || d[i + 1] || d[i + 2])) { drawn = true; break; } } } catch (e) {}
      return { drawn, boot: document.getElementById("boot")?.textContent || "" };
    }).catch(() => ({ drawn: false, boot: "" }));
    const now = Date.now() - t0;
    if (s.drawn && firstDraw == null) firstDraw = now;
    if (/did not start/.test(s.boot)) { bootErr = s.boot; break; }
    if (/\d+ species frames ·/.test(s.boot) && ready == null) ready = now;
    if (ready != null && firstDraw != null) break;
    await page.waitForTimeout(100);
  }
  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null));
  cdp.off("Network.requestWillBeSent", onReq); cdp.off("Network.responseReceived", onResp); cdp.off("Network.loadingFinished", onFin);
  const list = [...reqs.values()], base = Math.min(...list.map((r) => r.t0));
  const endAbs = base + ((firstDraw ?? ready ?? Date.now() - t0) / 1000) - 0;   // the requests that began before the first draw (t0 of the page is at the navigation: close enough to the first request)
  const before = list.filter((r) => r.t0 - base <= (firstDraw ?? ready) / 1000);
  const sum = (a) => a.reduce((s, r) => s + (r.bytes || 0), 0);
  const top = before.map((r) => ({ url: r.url.replace(/^.*\/sandbox\//, ""), kb: Math.round((r.bytes || 0) / 1024), ms: Math.round(((r.t1 || r.t0) - r.t0) * 1000) })).sort((a, b) => b.ms - a.ms).slice(0, 10);
  void endAbs;
  return { firstDrawMs: firstDraw, playableMs: ready, bootErr, requests: before.length, totalRequests: list.length, mb: +(sum(before) / 1e6).toFixed(2), mbTotal: +(sum(list) / 1e6).toFixed(2), n304: before.filter((r) => r.status === 304).length, nCache: before.filter((r) => r.fromCache).length, heapMB: heap, top };
}
async function once() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: THROTTLE, hasTouch: THROTTLE });
  await ctx.addInitScript((entries) => { if (!sessionStorage.getItem("fixture-done")) { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("fixture-done", "1"); } }, fixtureStorage());   // a player with the fixture's mibis, on Home
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: false });
  if (THROTTLE) { await cdp.send("Network.emulateNetworkConditions", PHONE); await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU }); }
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  const cold = await pass(page, cdp), warm = await pass(page, cdp);
  await browser.close();
  return { cold, warm };
}
const runs = []; for (let i = 0; i < RUNS; i++) runs.push(await once());
server.close();
const med = (f) => { const v = runs.map(f).filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : null; };
const s = (ms) => (ms == null ? "n/a" : (ms / 1000).toFixed(1));
const M = { coldS: med((r) => r.cold.firstDrawMs) / 1000, coldMB: med((r) => r.cold.mb), coldReq: med((r) => r.cold.requests), warmS: med((r) => r.warm.firstDrawMs) / 1000, warmMB: med((r) => r.warm.mb), heapMB: med((r) => r.cold.heapMB) };
console.log(`load-budget: cold ${s(M.coldS * 1000)} s / ${M.coldMB} MB / ${M.coldReq} req · warm ${s(M.warmS * 1000)} s / ${M.warmMB} MB · heap ${M.heapMB} MB${THROTTLE ? "" : " (unthrottled)"}`);
const errs = runs.flatMap((r) => [r.cold.bootErr, r.warm.bootErr]).filter(Boolean);
if (OUT) { mkdirSync(OUT, { recursive: true }); writeFileSync(path.join(OUT, "load-budget.json"), JSON.stringify({ runs, M }, null, 1)); }
for (const e of errs) console.error("FAIL boot: " + e);
let fail = errs.length > 0;
const checks = [["coldS", "cold first draw (s)", TIME_MARGIN], ["coldMB", "cold MB before first draw", 1], ["coldReq", "cold requests before first draw", 1], ["warmS", "warm first draw (s)", TIME_MARGIN], ["warmMB", "warm MB transferred before first draw", 1], ["heapMB", "JS heap at playable (MB)", 1]];
for (const [k, label, margin] of checks) {
  const over = !(M[k] <= LIMITS[k] * margin);
  if (over) { console.log(`${ENFORCE ? "FAIL" : "over (report only)"}: ${label} ${M[k]} > ${LIMITS[k]}${margin > 1 ? " +50 %" : ""}`); if (ENFORCE) fail = true; }
}
if (fail || !ENFORCE) { const t = runs.find((r) => r.cold.top)?.cold.top ?? []; console.log("cold waterfall, slowest 10: " + t.map((x) => `${x.url} ${x.kb}KB ${x.ms}ms`).join(" | ")); }
process.exit(fail ? 1 : 0);
