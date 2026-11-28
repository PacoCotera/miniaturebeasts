#!/usr/bin/env node
// PR 716 fix: the played case of a grow on the Station page (rule 16a). By presses only: Research opens the nursery, ✓ on a shelf row opens the pod's page, ✓ on Grow it puts the pod in a capsule.
// The toast after the grow must read the capsule's minutes ("In a capsule. It will be ready in about ..."), never the let-go question, and the pod must be in a capsule, not asked about.
// Judged by pixels: the frame is captured with the toast up, and again with the toast gone; the crop of what differs is the toast, written to OUT as grow-toast.png. The let-go question's toast
// (a second pod, ▼ then ✓) is cropped from the same box and must differ from it.
//   OUT=/dir PW_DIR=/path/with/node_modules/playwright node prototypes/station/tools/grow-toast-played.mjs
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decodePNG, encodePNG } from "../../ui/png.mjs";
import { fixtureStorage } from "./fixture-save.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const OUT = process.env.OUT || path.join(here, "../img"); mkdirSync(OUT, { recursive: true });
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port, browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
const errors = [], fail = (t) => { errors.push(t); console.error("FAIL " + t); }, expect = (c, t) => { if (!c) fail(t); };
page.on("pageerror", (e) => fail("pageerror: " + e.message));
page.on("response", (r) => { if (r.status() >= 400) console.error("HTTP " + r.status() + " " + r.url()); });
page.on("console", (m) => { if (m.type() === "error") console.error("console: " + m.text().slice(0, 300)); });
await page.addInitScript((entries) => { if (!sessionStorage.getItem("fixture-done")) { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("fixture-done", "1"); } }, fixtureStorage());
await page.addInitScript(() => { try { localStorage.setItem("mb-options", JSON.stringify({ dev: true, names: "en-short-1" })); } catch { /* none */ } });
// the held clock, as the station journey keeps it: frames run only when stepped, so a toast stays up until the clock is moved past it
await page.addInitScript(() => {
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window); let held = false, t = 0, off = 0, q = [], last = null, pend = new Set();
  performance.now = () => (held ? t : realNow() + off);
  window.requestAnimationFrame = (cb) => { if (held) { q.push(cb); return 0; } const rec = { cb }; pend.add(rec); return (rec.id = realRaf((ts) => { if (!pend.delete(rec)) return; last = ts + off; cb(last); })); };
  window.__hold = () => { if (!held) { t = last ?? realNow() + off; held = true; for (const r of pend) q.push(r.cb); pend.clear(); } return t; };
  window.__release = () => { if (!held) return; off = t - realNow(); held = false; const run = q; q = []; for (const cb of run) window.requestAnimationFrame(cb); };
  window.__step = (ms) => { const end = t + ms; while (t < end) { t = Math.min(end, t + 40); const run = q; q = []; for (const cb of run) cb(t); } return t; };
});
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?test`, { waitUntil: "load" });
await page.waitForFunction(() => window.__st, null, { timeout: 30000 }).catch(() => fail("the Station page did not start"));
await page.evaluate(() => window.__st.ready);
const press = async (k, ms = 150) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(ms); };
const get = (f) => page.evaluate(f);
const frame = async () => decodePNG(Buffer.from((await get(() => window.__st.capture())).split(",")[1], "base64"));
const stepClock = (ms) => page.evaluate((m) => window.__step(m), ms);

await press("research", 300);
expect((await get(() => window.__st.UI.pods.view)) === "nursery", "Research opens the nursery");
let rows = await get(() => window.__st.shelfRows());
const ids = rows.flatMap((r) => r.ids);
const walkTo = async (id) => { rows = await get(() => window.__st.shelfRows()); const k = rows.findIndex((r) => r.ids.includes(id)); for (let n = 0; n < 12; n++) { const r = (await get(() => window.__st.UI.pods.ring)) ?? { z: "shelf", i: 0 }; if (r.z === "shelf" && r.i === k) return; await press(r.z === "caps" || r.i < k ? "down" : "up", 100); } fail("the ring did not reach " + id); };
const podA = ids[0], podB = ids.find((id) => rows.findIndex((r) => r.ids.includes(id)) !== rows.findIndex((r) => r.ids.includes(podA))) ?? ids[1];

// the grow: ✓ on the row (the pod's page, the ring on Grow it), ✓ again
await walkTo(podA); await press("confirm", 400);
expect((await get(() => window.__st.UI.pods.view)) === "pod" && (await get(() => window.__st.UI.pods.act)) === "grow", "✓ on a row opens the pod's page, the ring on Grow it");
await get(() => window.__hold());
await press("confirm", 300); await stepClock(200);
const sGrow = await get(() => ({ msg: window.__st.msg, ask: window.__st.UI.pods.askGo, view: window.__st.UI.pods.view, caps: window.__st.capsules().map((c) => c.state) }));
const stillTray = await page.evaluate((id) => window.__st.ST.tray.some((p) => p.id === id), podA);
const strings = await get(() => window.__st.specs().pods.strings);
const grewHead = strings.podpage.grew.split("{when}")[0];
console.log("after the grow: toast = " + JSON.stringify(sGrow.msg) + ", askGo = " + sGrow.ask + ", view = " + sGrow.view + ", capsules = " + JSON.stringify(sGrow.caps));
expect(typeof sGrow.msg === "string" && sGrow.msg.startsWith(grewHead), "the toast after a grow is the capsule's line, not: " + sGrow.msg);
expect(sGrow.msg !== strings.podpage.letGoAsk && sGrow.ask === false, "the grow did not fall through to the let-go question");
expect(!stillTray && sGrow.caps.some((s) => s !== "free"), "the pod is in a capsule, off the shelf");
const F1 = await frame();
await stepClock(6000);
const F2 = await frame();
// the toast is what differs between the frame with it and the frame without it
let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const W = F1.width, H = F1.height;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (F1.data[i] !== F2.data[i] || F1.data[i + 1] !== F2.data[i + 1] || F1.data[i + 2] !== F2.data[i + 2]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
expect(x1 >= 0, "the toast shows in the frame: nothing differs between the frame with it and the frame without");
const crop = (F, a, b, c, d) => { const w = c - a + 1, h = d - b + 1, out = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((b + y) * F.width + a + x) * 4, o = (y * w + x) * 4; for (let k = 0; k < 4; k++) out[o + k] = F.data[s + k]; } return { w, h, buf: out }; };
// PR 718: the Nursery's toast lies under the last shelf row. The shelf rows' box (the page's own numbers, the page at the frame's left edge) is cropped from both frames: with the toast up it is the crop without it.
const nz = (await get(() => window.__st.specs().pods)).regions.page.nursery, sh = nz.shelf, shelfBottom = sh.top + sh.pitch * sh.visible;
const rowsUp = crop(F1, sh.x, sh.top, sh.x + sh.w - 1, shelfBottom - 1), rowsGone = crop(F2, sh.x, sh.top, sh.x + sh.w - 1, shelfBottom - 1);
console.log(`the toast box: y ${y0}..${y1}; the shelf rows end at y ${shelfBottom}`);
expect(rowsUp.buf.equals(rowsGone.buf), "the shelf rows' crop changed while the toast was up: the toast covers a row");
expect(y0 >= shelfBottom, "the toast's box starts at y " + y0 + ", above the end of the last shelf row (" + shelfBottom + ")");
const cg = crop(F1, x0, y0, x1, y1); writeFileSync(path.join(OUT, "grow-toast.png"), encodePNG(cg.w, cg.h, cg.buf));
console.log(`the toast crop: ${cg.w}x${cg.h} at ${x0},${y0}`);

// the let-go question's toast, from the same box, from a second pod (✓, ▼, ✓ asks): it must be another picture
await get(() => window.__release());
await walkTo(podB); await press("confirm", 400); await press("down", 200);
await get(() => window.__hold()); await press("confirm", 300); await stepClock(200);
const askMsg = await get(() => window.__st.msg);
expect(askMsg === strings.podpage.letGoAsk, "the first ✓ on Let it go asks: " + askMsg);
const F3 = await frame(), ca = crop(F3, x0, y0, x1, y1); writeFileSync(path.join(OUT, "letgo-toast.png"), encodePNG(ca.w, ca.h, ca.buf));
expect(!cg.buf.equals(ca.buf), "the grow toast crop differs from the let-go question's crop");
await browser.close(); server.close();
if (errors.length) { console.error(errors.length + " failure(s)"); process.exit(1); }
console.log("PASS grow-toast played; crops in " + OUT);
