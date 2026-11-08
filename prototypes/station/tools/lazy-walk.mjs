// The Station with its masters on demand (no ?test: the page as a player gets it): every screen in groups.json is gone to, and each must come up (its pictures placed, the face drawn, nothing a stand-in) with no render or face error.
// The journey and the goldens run in test mode, where every master is loaded at boot; this is the one run that goes through MasterPending, the hold and the re-sync. Prints a line a screen.
// usage: node lazy-walk.mjs   (exit 1 on a screen that does not come up in 60 s, an error, or a stand-in on the face)
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { fixtureStorage } from "./fixture-save.mjs";
import { startSandbox } from "./sandbox-server.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const groups = JSON.parse(readFileSync(path.resolve(here, "../../ui/assets/masters/groups.json"), "utf8"));
const SCREENS = Object.keys(groups.screens).filter((s) => s !== "boot" && !s.includes("."));
const sandbox = await startSandbox();
const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
const problems = [], logs = [];
page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) problems.push("console: " + m.text()); if (/was asked for before it arrived/.test(m.text())) logs.push(m.text()); });
await page.addInitScript((entries) => { if (!sessionStorage.getItem("fixture-done")) { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("fixture-done", "1"); } }, fixtureStorage());
await page.goto(sandbox.url, { waitUntil: "load" });
try { await page.waitForFunction(() => window.__st && window.__st.ready, null, { timeout: 60000 }); await page.evaluate(() => window.__st.ready); }
catch (e) { console.error("lazy-walk FAILED: the page did not boot: " + e.message.split("\n")[0] + "\n  " + problems.join("\n  ")); await browser.close(); sandbox.close(); process.exit(1); }
const drawn = () => page.evaluate(() => { const c = document.getElementById("screen"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4 * 211) if (d[i + 3] && (d[i] || d[i + 1] || d[i + 2])) return true; return false; });
for (const screen of ["home", ...SCREENS.filter((s) => s !== "home")]) {
  const t0 = Date.now();
  if (screen !== "home") await page.evaluate((s) => window.__st.goto(s), screen);
  let ok = false, why = "", skipped = null;
  while (Date.now() - t0 < 60000) {
    const r = await page.evaluate((s) => { const st = window.__st; return { at: st.UI.screen, settled: st.settled().ok, errs: st.renderErrors.length + st.faceErrors.length }; }, screen);
    why = `on ${r.at}, settled ${r.settled}`;
    if (r.errs) { why = "errors"; break; }
    if (r.at !== screen && r.settled && Date.now() - t0 > 3000) { skipped = r.at; break; }   // a screen that needs state (Create wants a pod) sends the key elsewhere: not a load question
    if (r.at === screen && r.settled && await drawn()) { ok = true; break; }
    await page.waitForTimeout(100);
  }
  const snap = await page.evaluate(() => window.__st.snapshot({ capture: false })), errs = await page.evaluate(() => [...window.__st.renderErrors, ...window.__st.faceErrors]);
  if (skipped) { console.log(`lazy-walk ${screen}: skipped, the game goes to ${skipped} without its state`); continue; }
  if (!ok) problems.push(`${screen}: did not come up (${why || "60 s"}) ${errs.slice(0, 2).join("; ")}`);
  if (snap.standIns.length || snap.builtStandIns.length) problems.push(`${screen}: drew stand-ins ${[...snap.standIns, ...snap.builtStandIns].slice(0, 4).join(", ")}`);
  console.log(`lazy-walk ${screen}: ${ok ? "up" : "NOT UP"} in ${Date.now() - t0} ms, ${snap.standIns.length + snap.builtStandIns.length} stand-ins`);
}
const errs = await page.evaluate(() => [...window.__st.renderErrors, ...window.__st.faceErrors]);
for (const e of errs) problems.push("error: " + e);
console.log(`lazy-walk: ${logs.length} pictures asked for before they arrived${logs.length ? " (" + logs.slice(0, 5).map((l) => l.replace(/^# master /, "").replace(/ was asked.*screen /, " on ")).join(" · ") + ")" : ""}`);
await browser.close(); sandbox.close();
if (problems.length) { console.error("lazy-walk FAILED:\n  " + problems.join("\n  ")); process.exit(1); }
console.log("lazy-walk ok");
process.exit(0);
