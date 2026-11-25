// The Dock key's words on a touch phone (owner 2026-11-25, editorial 9ee273 / 70f85b33bb): with crates aboard the lit key never loses the count, at 390 × 844 and 412 × 915.
// At 412 it is the full lit form "Dock · n of 3 crates aboard"; where that does not fit it falls to "Dock · n of 3 crates", then "Dock · n/3", never to bare "Dock".
//   node prototypes/play/tools/dock-words.mjs      (PW_DIR=/path/with/node_modules/playwright; DOCK_SHOTS=dir writes the whole-screen stills)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/");
  let p = path.join(root, rel); if (!existsSync(p)) p = path.join(path.resolve(root, ".."), rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const browser = await chromium.launch();
const fails = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } };
const shots = process.env.DOCK_SHOTS; if (shots) mkdirSync(shots, { recursive: true });
const report = [];

for (const [W, H, dsf] of [[412, 915, 2.625], [390, 844, 3], [360, 780, 3]]) {
  const tag = `${W}x${H}`;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { fails.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  await page.goto(base + "?test", { waitUntil: "load" });
  await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 });
  const mb = () => page.frame({ url: /\/exploration\// });
  await page.frame({ url: /\/station\// }).evaluate(() => window.__st.ready); await mb().waitForFunction(() => window.__mb && window.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(800);
  const key = () => page.evaluate(() => { const e = document.getElementById("dockKey"), r = e.getBoundingClientRect(); return { w: Math.round(r.width * 10) / 10, text: e.textContent.trim(), cls: e.className, overflow: e.scrollWidth > e.clientWidth + 1 }; });
  const still = async (name, k) => { report.push(`${tag} ${name}: key ${k.w} px, "${k.text}"`); if (shots) await page.screenshot({ path: path.join(shots, `dock-${tag}-${name}.png`) }); };
  let aboard = 0;   // crates sealed in the hold so far: the Station's own seed (dev) adds the crates the Dock key counts
  const setBay = async (n) => { while (aboard < n) { aboard++; await page.frame({ url: /\/station\// }).evaluate(([i]) => window.__st.seedCrate("S01", i, 4100 + i), [aboard]); } await page.waitForTimeout(1200); };

  const quiet = await key(); expect(quiet.cls.includes("quiet") && /Dock the Companion/.test(quiet.text), tag + ": quiet reads Dock the Companion " + JSON.stringify(quiet)); await still("quiet", quiet);
  for (const n of [1, 3]) {
    await setBay(n);
    const k = await key();
    expect(k.cls.includes("lit") && k.text.includes(`${n}`), tag + `: the lit key holds the count ${n} ` + JSON.stringify(k));
    expect(!k.overflow, tag + ": the lit words are not cut " + JSON.stringify(k));
    if (W === 412) expect(k.text.startsWith(`Dock · ${n} of 3 crates aboard`), tag + ": the full lit form at 412 " + JSON.stringify(k));
    await still(`lit-${n}`, k);
  }
  // docked: press the key
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.getElementById("dockKey").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }))); await page.waitForTimeout(1800);
  const docked = await key(); expect(docked.cls.includes("docked") && /Docked/.test(docked.text), tag + ": docked reads Docked · Lift to go out " + JSON.stringify(docked)); await still("docked", docked);
  await ctx.close();
}
await browser.close(); server.close();
for (const l of report) console.log(l);
if (fails.length) { console.error(`${fails.length} FAILED`); process.exit(1); }
console.log("dock-words: ok");
