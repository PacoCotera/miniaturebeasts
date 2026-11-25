// THE PLAYED-GAME TESTS (owner 2026-11-25, code-audit step 1): these play the shipped page, not a sandbox. See README.md.
// The bundle ops/sandbox/bundle-pages.sh builds is served as /play/ (generator 7, the worker, the real place view); the page is opened at his two phone sizes with touch on;
// every action is a press on an on-screen button; his save is loaded as the live page loads it; every verdict is read off the screenshot.
//   node --test prototypes/exploration/tests/played/        (PW_DIR=/dir/with/node_modules/playwright when playwright is not local)
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { decodePNG } from "../../../../ui/png.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
export const repo = path.resolve(import.meta.dirname, "../../../../..");
const savesDir = path.join(import.meta.dirname, "../saves");
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const SIZES = [{ w: 412, h: 915, dpr: 2.625 }, { w: 522, h: 935, dpr: 3 }];   // as QA's lib.mjs opens them

// ---- the shipped site: the workflow's "Assemble the site", then ops/sandbox/bundle-pages.sh over it
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp" };
function assemble() {
  const site = mkdtempSync(path.join(process.env.TMPDIR || tmpdir(), "mb-played-site-"));
  cpSync(path.join(repo, "website"), site, { recursive: true, dereference: true });
  mkdirSync(path.join(site, "play"), { recursive: true });
  for (const n of readdirSync(path.join(repo, "prototypes"))) {
    const p = path.join(repo, "prototypes", n);
    if (!statSync(p).isDirectory() || n === "node_modules") continue;
    cpSync(p, path.join(site, "play", n), { recursive: true, dereference: true, filter: (s) => !/[\\/]node_modules([\\/]|$)|catalogue-out/.test(s) && !/tests[\\/]played/.test(s) });
  }
  const art = (rel, files) => { mkdirSync(path.join(site, rel), { recursive: true }); for (const f of files) cpSync(path.join(repo, rel, f), path.join(site, rel, f), { recursive: true }); };
  art("art/companion-48/terrain", ["meadow"]);
  art("art/companion-48/care", ["c-heart-24.png", "c-heart-16.png"]);
  art("art/day-dial/frames", readdirSync(path.join(repo, "art/day-dial/frames")).filter((f) => /^day-.*\.png$/.test(f)));
  const r = spawnSync("sh", [path.join(repo, "ops/sandbox/bundle-pages.sh"), site], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("bundle-pages failed: " + r.stderr + r.stdout);
  return site;
}
async function serve(site) {
  const server = createServer((req, res) => {
    let p = path.join(site, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/play/`, close: () => { server.closeAllConnections(); server.close(); rmSync(site, { recursive: true, force: true }); } };
}

let site, browser;
export async function setup() { site = await serve(assemble()); browser = await chromium.launch(); }
export async function teardown() { if (browser) await browser.close(); if (site) site.close(); }

// ---- one played game: his save loaded as the live page loads it (the companion's id, then mb-save-v8@<id>), buttons only
const ready = () => { try { return !!window.__play.frames.companion.contentWindow.__mb.S; } catch { return false; } };
export async function open(size, saveName) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true });
  const raw = readFileSync(path.join(savesDir, saveName + ".save"), "utf8");
  const p1 = await ctx.newPage();
  await p1.goto(site.url); await p1.waitForFunction(ready, null, { timeout: 60000 }); await wait(2000);
  const id = await p1.evaluate(() => JSON.parse(localStorage.getItem("mb-companion-A")).id);
  await p1.close();
  await ctx.addInitScript(([i, s, tab]) => { localStorage.setItem("mb-save-v8@" + i, s); if (tab) localStorage.setItem("mb-play-tab", tab); }, [id, raw, process.env.PLAYED_START || ""]);   // PLAYED_START=station: a cold start where the page opens on the Station (test-harness only)
  const page = await ctx.newPage();
  await page.goto(site.url); await page.waitForFunction(ready, null, { timeout: 60000 }); await wait(8000);
  // the page may open on the Station: press the 'Companion' tab as a player would, then assert the Companion is the device in view and not docked, before any shot is read
  console.log(`# opened on the ${await page.evaluate(() => window.__play.owner)} (${size.w}x${size.h})`);
  await page.getByRole("tab", { name: "Companion" }).click();
  await page.waitForFunction(() => window.__play.owner === "companion", null, { timeout: 10000 });
  await wait(2500);
  const view = await page.evaluate(() => { const f = window.__play.frames.companion.getBoundingClientRect(); return { owner: window.__play.owner, docked: window.__play.caddy.docked, l: f.left, t: f.top, r: f.right, b: f.bottom, w: innerWidth, h: innerHeight }; });
  assert.equal(view.owner, "companion", "the case is reached: the Companion is the device in view");
  assert.equal(view.docked, false, "the case is reached: the Companion is not docked");
  assert.ok(view.l >= -1 && view.t >= -1 && view.r <= view.w + 1 && view.b <= view.h + 1 && view.r - view.l > 100, `the case is reached: the Companion's frame is on screen (${JSON.stringify(view)})`);
  const sel = (l) => (["up", "down", "left", "right"].includes(l) ? "button.cpad." + l + ":visible" : '.fkz[data-zone="' + l + '"]:visible');
  const box = async (l) => { const b = await page.locator(sel(l)).first().boundingBox({ timeout: 5000 }); assert.ok(b, "no button " + l); return b; };
  // a press on the on-screen button: down, held for `hold` ms, up; settle ms after (0 = the screenshot follows at once)
  const press = async (l, hold = 100, settle = 700) => {
    const b = await box(l);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    if (hold <= 150) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);   // a short press: down and up in one go, so a busy machine cannot stretch it into a hold
    else { await page.mouse.down(); await wait(hold); await page.mouse.up(); }
    await wait(settle);
  };
  const hold = async (l) => { const b = await box(l); await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); };   // button stays down until release()
  const release = async () => { await page.mouse.up(); };
  // the game screen's rectangle on the screenshot (the Companion's frame, in device pixels)
  const region = async () => { const fe = await page.frame({ url: /\/exploration\// }).frameElement(); const b = await fe.boundingBox(); return { x: Math.round(b.x * size.dpr), y: Math.round(b.y * size.dpr), w: Math.round(b.width * size.dpr), h: Math.round(b.height * size.dpr) }; };
  const shot = async (name) => { const buf = await page.screenshot(); if (name && process.env.PLAYED_SHOTS) writeFileSync(path.join(process.env.PLAYED_SHOTS, name + ".png"), buf); return decodePNG(buf); };
  // the game screen alone at CSS size: fast enough to catch the ring, which lasts a fraction of a second
  const clip = async () => { const fe = await page.frame({ url: /\/exploration\// }).frameElement(); return fe.boundingBox(); };
  const quick = async (c) => decodePNG(await page.screenshot({ clip: c, scale: "css" }));
  // the browser's own screencast: every frame it paints while `act` runs and for `ms` after, the game screen cropped out of each (a screenshot per frame cannot keep up on a busy machine)
  const record = async (act, ms) => {
    const cdp = await ctx.newCDPSession(page), raw = [];
    cdp.on("Page.screencastFrame", (f) => { raw.push(f.data); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: Math.round(size.w * size.dpr), maxHeight: Math.round(size.h * size.dpr), everyNthFrame: 1 });
    await act(); await wait(ms);
    await cdp.send("Page.stopScreencast"); await cdp.detach();
    return raw.map((d) => decodePNG(Buffer.from(d, "base64")));
  };
  // reading state is ONLY to assert the case is reached; it never decides a verdict
  const where = () => page.evaluate(() => { const S = window.__play.frames.companion.contentWindow.__mb.S, e = S.exp; return { phase: S.phase, x: e && e.patch && e.patch.x, y: e && e.patch && e.patch.y, key: e && e.patch && e.patch.key }; });
  // the menu's selected row and the day's light spent: read only to assert the case is reached
  const menuRow = () => page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, it = m.menuItems()[m.S.ui.menuSel]; return it && it.id; });
  const spent = () => page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.S.day.spent);
  return { ctx, page, press, hold, release, region, shot, clip, quick, record, where, menuRow, spent };
}

// ---- judging by the screen: pixels in a region of a screenshot
export const px = (im, x, y) => { const i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
// how many pixels of the box (x, y, w, h as fractions of the region when frac) differ between two shots
export function changed(a, b, r, f = [0, 0, 1, 1]) {
  const x0 = r.x + Math.round(r.w * f[0]), y0 = r.y + Math.round(r.h * f[1]), x1 = r.x + Math.round(r.w * (f[0] + f[2])), y1 = r.y + Math.round(r.h * (f[1] + f[3]));
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = px(a, x, y), q = px(b, x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) n++; }
  return { n, of: (x1 - x0) * (y1 - y0), frac: n / ((x1 - x0) * (y1 - y0)) };
}
// pixels of a colour in the region (or in a box), and the bounding box they make
export function colour(im, r, test, box) {
  const b = box || { x: r.x, y: r.y, w: r.w, h: r.h };
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { if (test(px(im, x, y))) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  return { n, box: n ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null };
}
// the connected blobs of a colour in the region, biggest first: { n, box }. Lets a count say which shape it counted (the menu's selection bar is a second orange shape)
export function blobs(im, r, test) {
  const seen = new Uint8Array(im.width * im.height), out = [];
  for (let y0 = r.y; y0 < r.y + r.h; y0++) for (let x0 = r.x; x0 < r.x + r.w; x0++) {
    if (seen[y0 * im.width + x0] || !test(px(im, x0, y0))) continue;
    let n = 0, bx0 = x0, by0 = y0, bx1 = x0, by1 = y0; const st = [[x0, y0]]; seen[y0 * im.width + x0] = 1;
    while (st.length) {
      const [x, y] = st.pop(); n++; bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < r.x || ny < r.y || nx >= r.x + r.w || ny >= r.y + r.h || seen[ny * im.width + nx] || !test(px(im, nx, ny))) continue;
        seen[ny * im.width + nx] = 1; st.push([nx, ny]);
      }
    }
    out.push({ n, box: { x: bx0, y: by0, w: bx1 - bx0 + 1, h: by1 - by0 + 1 } });
  }
  return out.sort((a, b) => b.n - a.n);
}
export const HERO =([r, g, b]) => r > 130 && r > g * 1.8 && g > b * 2 && b < 100;   // the hero's jacket, orange (242,103,27 by day; the light tints it as the day turns)
export const RING =([r, g, b]) => b > 200 && g > 190 && r < 190 && b - r > 50;   // the Call's ring, light blue

