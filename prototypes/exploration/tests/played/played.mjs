// THE PLAYED-GAME TESTS (owner 2026-11-25, code-audit step 1): these play the shipped page, not a sandbox. See README.md.
// The bundle ops/sandbox/bundle-pages.sh builds is served as /play/ (generator 7, the worker, the real place view); the page is opened at his two phone sizes with touch on;
// every action is a press on an on-screen button; his save is loaded as the live page loads it; every verdict is read off the screenshot.
//   node --test prototypes/exploration/tests/played/        (PW_DIR=/dir/with/node_modules/playwright when playwright is not local)
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { decodePNG, encodePNG } from "../../../ui/png.mjs";
import { cardFrames, CARD_W, CARD_H } from "../../src/card-motion.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const repo = path.resolve(import.meta.dirname, "../../../..");
const savesDir = path.join(import.meta.dirname, "saves");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SIZES = [{ w: 412, h: 915, dpr: 2.625 }, { w: 522, h: 935, dpr: 3 }];   // as QA's lib.mjs opens them

// ---- the shipped site: the workflow's "Assemble the site", then ops/sandbox/bundle-pages.sh over it
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".wasm": "application/wasm", ".ttf": "font/ttf", ".woff2": "font/woff2", ".svg": "image/svg+xml", ".webp": "image/webp" };
function assemble() {
  const site = mkdtempSync(path.join(process.env.TMPDIR || tmpdir(), "mb-played-site-"));
  // the copy is ~1.3 GB: remove it however the run ends (failure in assemble/before, Ctrl-C, kill), not only in after()
  const drop = () => rmSync(site, { recursive: true, force: true });
  process.on("exit", drop);
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));
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
before(async () => { site = await serve(assemble()); browser = await chromium.launch(); });
after(async () => { if (browser) await browser.close(); if (site) site.close(); });

// ---- one played game: his save loaded as the live page loads it (the companion's id, then mb-save-v8@<id>), buttons only
const ready = () => { try { return !!window.__play.frames.companion.contentWindow.__mb.S; } catch { return false; } };
async function open(size, saveName) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true });
  const fresh = typeof saveName === "object" && saveName !== null;   // { seed }: a fresh game on that seed through the page's own ?seed= (a test-harness flag); no save is loaded
  const raw = fresh ? "" : readFileSync(path.join(savesDir, saveName + ".save"), "utf8");
  const p1 = fresh ? null : await ctx.newPage();
  if (!fresh) { await p1.goto(site.url); await p1.waitForFunction(ready, null, { timeout: 60000 }); await wait(2000); }
  const id = fresh ? null : await p1.evaluate(() => JSON.parse(localStorage.getItem("mb-companion-A")).id);
  if (p1) await p1.close();
  if (!fresh) await ctx.addInitScript(([i, s, tab]) => { localStorage.setItem("mb-save-v8@" + i, s); if (tab) localStorage.setItem("mb-play-tab", tab); }, [id, raw, process.env.PLAYED_START || ""]);   // PLAYED_START=station: a cold start where the page opens on the Station (test-harness only)
  const page = await ctx.newPage();
  await page.goto(fresh ? site.url + "?seed=" + saveName.seed : site.url); await page.waitForFunction(ready, null, { timeout: 60000 }); await wait(8000);
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

// the Station in view (a pod home, the page kept on the Station tab, as a player who came back to it): its frame's box, in device pixels, for the screenshot
async function openStation(size) {
  const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: size.dpr, hasTouch: true, isMobile: true });
  await ctx.addInitScript(() => { localStorage.setItem("mb-play-podhome", "1"); localStorage.setItem("mb-play-tab", "station"); });
  const page = await ctx.newPage();
  await page.goto(site.url); await page.waitForFunction(ready, null, { timeout: 60000 }); await wait(8000);
  assert.equal(await page.evaluate(() => window.__play.owner), "station", "the case is reached: the Station is the device in view");
  const shot = async (name) => { const buf = await page.screenshot(); if (name && process.env.PLAYED_SHOTS) writeFileSync(path.join(process.env.PLAYED_SHOTS, name + ".png"), buf); return decodePNG(buf); };
  return { ctx, page, shot };
}

// ---- judging by the screen: pixels in a region of a screenshot
const px = (im, x, y) => { const i = (y * im.width + x) * 4; return [im.data[i], im.data[i + 1], im.data[i + 2]]; };
// how many pixels of the box (x, y, w, h as fractions of the region when frac) differ between two shots
function changed(a, b, r, f = [0, 0, 1, 1]) {
  const x0 = r.x + Math.round(r.w * f[0]), y0 = r.y + Math.round(r.h * f[1]), x1 = r.x + Math.round(r.w * (f[0] + f[2])), y1 = r.y + Math.round(r.h * (f[1] + f[3]));
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = px(a, x, y), q = px(b, x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) n++; }
  return { n, of: (x1 - x0) * (y1 - y0), frac: n / ((x1 - x0) * (y1 - y0)) };
}
// pixels of a colour in the region (or in a box), and the bounding box they make
function colour(im, r, test, box) {
  const b = box || { x: r.x, y: r.y, w: r.w, h: r.h };
  let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { if (test(px(im, x, y))) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
  return { n, box: n ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : null };
}
// the connected blobs of a colour in the region, biggest first: { n, box }. Lets a count say which shape it counted (the menu's selection bar is a second orange shape)
function blobs(im, r, test) {
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
// waiting for what a press does, never a fixed time: until(page, fn, arg) is the page's own state reaching what the press makes (the case is reached); stable(page) is the screen drawn: two screenshots in a row alike (the face has painted what the state says)
const until = (page, fn, arg, what) => page.waitForFunction(fn, arg, { timeout: 20000 }).catch((e) => { throw new Error("the press had no effect in 20 s: " + what + " (" + String(e.message).split("\n")[0] + ")"); });
async function stable(page, ms = 15000) { const t0 = Date.now(); let prev = null; for (;;) { const b = await page.screenshot(); if (prev && b.equals(prev)) return; prev = b; if (Date.now() - t0 > ms) return; await wait(120); } }
// a word is the face's cream text: light, its blue within 20 of its red (241,235,223; its edges 226,221,211 and 212,208,199). The Home painting's pale mist at the window's left edge is warmer (216,207,191; 233,211,191: blue 25 or more under its red) and is not a word
const WORD = ([R, G, B]) => R > 200 && G > 200 && B > 190 && R - B <= 20;
const wordEdges = (im, reg) => { const e = (x0) => colour(im, reg, WORD, { x: x0, y: reg.y, w: 3, h: reg.h }).n; return { left: e(reg.x), right: e(reg.x + reg.w - 3) }; };
// a crop of a shot against its reference crop (tests/played/refs/<name>.png, written from the shipped build by PLAYED_MAKE_REFS=1): the share of pixels that differ (any channel by more than 24). A reference of another size or a missing one is a full difference
function cropOf(im, b) { const out = Buffer.alloc(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, o = (y * b.w + x) * 4; out[o] = im.data[i]; out[o + 1] = im.data[i + 1]; out[o + 2] = im.data[i + 2]; out[o + 3] = 255; } return out; }
function againstRef(im, b, name) {
  const file = path.join(import.meta.dirname, "refs", name + ".png"), mine = cropOf(im, b);
  if (process.env.PLAYED_MAKE_REFS) { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, encodePNG(b.w, b.h, mine)); }
  if (!existsSync(file)) return { frac: 1, n: b.w * b.h, of: b.w * b.h };
  const ref = decodePNG(readFileSync(file)); if (ref.width !== b.w || ref.height !== b.h) return { frac: 1, n: b.w * b.h, of: b.w * b.h };
  let n = 0; for (let i = 0; i < b.w * b.h; i++) { const o = i * 4; if (Math.abs(mine[o] - ref.data[o]) > 24 || Math.abs(mine[o + 1] - ref.data[o + 1]) > 24 || Math.abs(mine[o + 2] - ref.data[o + 2]) > 24) n++; }
  return { frac: n / (b.w * b.h), n, of: b.w * b.h };
}
const HERO =([r, g, b]) => r > 130 && r > g * 1.8 && g > b * 2 && b < 100;   // the hero's jacket, orange (242,103,27 by day; the light tints it as the day turns)
const RING =([r, g, b]) => b > 200 && g > 190 && r < 190 && b - r > 50;   // the Call's ring, light blue

// ONE SCALE (code-audit step 6; owner #27 "resize the companion to fill the mobile screen, its tiny and there's space", #134 "ridiculously small, can't see shit", #135 "screen is tiny"): layout.mjs decides the size of both devices; the frames do not scale again.
const SCALE_SIZES = [{ w: 412, h: 915, dpr: 2.625 }, { w: 522, h: 935, dpr: 3 }, { w: 390, h: 844, dpr: 3 }];
// the extent in x (device px) of the pixels in a horizontal band that differ from the colour just outside the box on its left: what the screen draws, read off the screenshot
function drawnX(im, r, y0, y1) {
  const bg = px(im, Math.max(0, r.x - 2), Math.round((y0 + y1) / 2)), far = (p) => Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 24;
  let lo = 1e9, hi = -1;
  for (let y = y0; y < y1; y += 3) for (let x = Math.max(0, r.x - 6); x < Math.min(im.width, r.x + r.w + 6); x++) if (far(px(im, x, y))) { lo = Math.min(lo, x); hi = Math.max(hi, x); }
  return { lo, hi, w: hi - lo + 1 };
}

const EXPECT_147 = "Juniper · last seen south-west";   // s32: his 147.save's band in editorial's words: the full 'Juniper · last seen south-west, in the meadow' does not fit the band, so the short form shows
const frac = (x, y, w, h) => [x / 900, y / 1200, w / 900, h / 1200];   // s15: a box in pixels of the 412x915 game screen (900x1200), as fractions of it
const F_CARD = frac(9, 9, 350, 50), F_CRATE = frac(49, 367, 60, 40), F_TOP = frac(9, 9, 240, 50);   // the card's "Expedition 1 ended", the crate's E1, the set-out's "Expedition 2"
describe("the played game", { concurrency: 6 }, () => {
for (const size of SCALE_SIZES) {
  const tag = `${size.w}x${size.h}`;
  it(`s4 one scale (#27, #134, #135): the Companion's screen is drawn as wide as layout.mjs says, not shrunk twice [${tag}]`, async () => {
    const g = await open(size, "152");
    try {
      const plan = await g.page.evaluate(() => window.__play.plan);   // read only to say what the layout decided; the verdict is the screenshot
      const base = await g.shot(`s4-${tag}`), r = await g.region();
      const d = drawnX(base, r, r.y + Math.round(r.h * 0.3), r.y + Math.round(r.h * 0.7));
      console.log(`# s4 ${tag}: layout screen.w ${plan.screen.w.toFixed(2)} css px; drawn ${(d.w / size.dpr).toFixed(2)} css px (${d.lo}..${d.hi} device px); frame ${(r.w / size.dpr).toFixed(2)}`);
      assert.ok(Math.abs(d.w / size.dpr - plan.screen.w) <= 1, `the screen is drawn ${(d.w / size.dpr).toFixed(2)} CSS px wide on screen; layout.mjs says ${plan.screen.w.toFixed(2)}`);
    } finally { await g.ctx.close(); }
  });
  it(`s5 Station Home (QA verify-live-155): the window shows Home whole, no word cut at its left or right edge [${tag}]`, { todo: "red on the CI runner, left edge 9-12 light px, right 3, fresh Home, 412/522/390; cause not known: home-cut-s5b-1 logs pan x, the focused target and Home's leftmost word box on the runner; CI run 45644342749" }, async () => {
    const g = await openStation(size);
    try {
      const plan = await g.page.evaluate(() => window.__play.plan);
      const im = await g.shot(`s5-${tag}-home`), d = size.dpr, sc = plan.screen;
      const reg = { x: Math.round(sc.x * d), y: Math.round(sc.y * d), w: Math.round(sc.w * d), h: Math.round(sc.h * d) };
      console.log(`# s5 ${tag}: station screen ${JSON.stringify(sc)} view ${JSON.stringify(plan.view)} narrow ${plan.narrow}`);
      // a word is light text on the dark card or the ground: light pixels touching the window's own first or last device column are a cut word
      const light = ([R, G, B]) => R > 200 && G > 200 && B > 190;
      const edge = (x0) => colour(im, reg, light, { x: x0, y: reg.y, w: 3, h: reg.h }).n;
      assert.ok(edge(reg.x) <= 3 && edge(reg.x + reg.w - 3) <= 3, `no light word-pixels touch the window's edges (left ${edge(reg.x)}, right ${edge(reg.x + reg.w - 3)})`);
    } finally { await g.ctx.close(); }
  });
  // QA verify-live-155 (412x915-S3-home-after, 390x844-S1): back on Station Home after the Bay the words at the left are cut ("et", "pen the Bay"). Played as QA did, by presses, on his #166 save: Dock, the Bay, ← back to Home.
  it(`s5b Station Home after the Bay (QA verify-live-155): no word cut at the window's left or right edge [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const dock = g.page.getByRole("button", { name: /Dock the Companion/ }).first();
      console.log(`# s5b ${tag}: dock control "${await dock.getAttribute("aria-label", { timeout: 5000 }).catch(() => "?")}", caddy ${JSON.stringify(await g.page.evaluate(() => window.__play.caddy))}`);
      const bb = await dock.boundingBox({ timeout: 5000 });
      assert.ok(bb, "the case is reached: the Dock control is on screen");
      await g.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await until(g.page, () => window.__play.owner === "station" && window.__play.focus && window.__play.focus.screen === "cargo", null, "Dock: the Station shows the Bay"); await stable(g.page);
      assert.equal(await g.page.evaluate(() => window.__play.owner), "station", "the case is reached: the Station is in view after Dock");
      const state = () => g.page.evaluate(() => ({ pan: window.__play.pan, focus: window.__play.focus, plan: window.__play.plan }));
      const bay = await state();
      console.log(`# s5b ${tag}: in the Bay: pan ${JSON.stringify(bay.pan)} focus ${JSON.stringify(bay.focus)}`);
      for (let i = 1; i <= 3; i++) {                        // ← back to Home (the screen read after each press, only to say where the case stands)
        await g.press("back", 100, 0); await until(g.page, () => window.__play.focus && window.__play.focus.screen !== "cargo", null, "← leaves the Bay"); await stable(g.page);
        const s = await state(); console.log(`# s5b ${tag}: after ← x${i}: screen ${s.focus.screen} pan ${JSON.stringify(s.pan)} focus ${JSON.stringify(s.focus)} view ${JSON.stringify(s.plan.view)}`);
        if (s.focus.screen !== "cargo") break;
      }
      const st = await state(), plan = st.plan, d = size.dpr, sc = plan.screen;
      const fp = await g.page.evaluate(() => { try { const p = window.__play.frames.station.contentWindow.__st.props; return p && p.focus ? { cur: p.focus.cur, narrow: p.narrow, screen: p.screen, ids: p.focus.targets.map((t) => t.id) } : null; } catch (e) { return String(e); } });
      console.log(`# s5b ${tag}: the face's focus (props): ${JSON.stringify(fp)}`);
      const im = await g.shot(`s5b-${tag}-home`);
      const reg = { x: Math.round(sc.x * d), y: Math.round(sc.y * d), w: Math.round(sc.w * d), h: Math.round(sc.h * d) };
      const light = WORD;   // words, not the painting's mist
      const edge = (x0) => colour(im, reg, light, { x: x0, y: reg.y, w: 3, h: reg.h }).n;
      const all = colour(im, reg, light), lp = (x) => Math.round(st.pan.x + (x - reg.x) / d / 0.6);   // device px on the shot -> lp on the face
      console.log(`# s5b ${tag}: Home: screen ${JSON.stringify(sc)} view ${JSON.stringify(plan.view)} narrow ${plan.narrow} (NARROW_W 530); pan ${JSON.stringify(st.pan)}; focus ${JSON.stringify(st.focus)}; light words span lp ${all.box ? lp(all.box.x) + ".." + lp(all.box.x + all.box.w - 1) : "none"}; light px at the left edge ${edge(reg.x)}, at the right ${edge(reg.x + reg.w - 3)}`);
      assert.ok(edge(reg.x) <= 3 && edge(reg.x + reg.w - 3) <= 3, `no light word-pixels touch the window's edges (left ${edge(reg.x)}, right ${edge(reg.x + reg.w - 3)})`);
    } finally { await g.ctx.close(); }
  });
  // the Bay (owner 2026-11-25 09:2x, "a played test of a three-crate dock at 412"): his #166 save with THREE sealed crates aboard the Companion (saves/bay-three.save: 5 pods, 54 Energy, 60 Data, 39 Essence in all). Played by presses as a player does: Dock;
  // the Bay shows the crates the dock crossed (the first on the table, two on the ledge) and the Companion's hold reads empty; ✓ opens the crate in hand, ✓ puts it away: its pods stand on the Nursery's shelf and the counters rise. The verdicts are read off the screen:
  // the shelf's and the counters' panels change with each put away, the ledge empties, the Bay's words are whole in the window. State is read only to say the case is reached and the figures the screen must agree with.
  it(`s32 the Bay: a three-crate dock, ✓ and ✓ for each crate, ▼ All at once, a fourth crate stays aboard, ← is Home [${tag}]`, async () => {
    const lp = (plan, pan, r) => { const d = size.dpr, s = plan.scale * d, sc = plan.screen; return { x: Math.round(sc.x * d + (r[0] - pan.x) * s), y: Math.round(sc.y * d + (r[1] - pan.y) * s), w: Math.round(r[2] * s), h: Math.round(r[3] * s) }; };
    const diff = (a, b, box) => { let n = 0; for (let y = box.y; y < box.y + box.h; y++) for (let x = box.x; x < box.x + box.w; x++) { const p = px(a, x, y), q = px(b, x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) n++; } return n; };
    const run = async (all) => {
      const g = await open(size, "bay-three");
      try {
        const dock = g.page.getByRole("button", { name: /Dock the Companion/ }).first(), bb = await dock.boundingBox({ timeout: 5000 });
        assert.ok(bb, "the case is reached: the Dock control is on screen");
        const stt = () => g.page.evaluate(() => { const S = window.__play.frames.station.contentWindow.__st; return { screen: S.UI.screen, held: (S.ST.bayHeld || []).length, accepted: S.ST.accepted.length, tray: S.ST.tray.length, e: S.ST.e, d: S.ST.d, s: S.ST.s, open: S.UI.cargo.open, aboard: S.ST.devBay.length, bay: window.__play.frames.station.contentWindow.__st.bayAboard ?? null, caddy: window.__play.caddy }; });
        const s0 = await stt(); await g.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
        await until(g.page, () => { const S = window.__play.frames.station.contentWindow.__st; return window.__play.owner === "station" && S.UI.screen === "cargo" && (S.ST.bayHeld || []).length > 0; }, null, "Dock: the Bay shows the crates"); await stable(g.page);
        assert.equal(await g.page.evaluate(() => window.__play.owner), "station", "the case is reached: the Station is in view after Dock");
        const s1 = await stt(), plan = await g.page.evaluate(() => window.__play.plan), pan = await g.page.evaluate(() => window.__play.pan);
        console.log(`# s32 ${tag}: Dock: ${JSON.stringify(s1)} plan view ${JSON.stringify(plan.view)} narrow ${plan.narrow} pan ${JSON.stringify(pan)}`);
        assert.equal(s1.screen, "cargo", "the Bay shows over whatever the Station was on"); assert.equal(s1.held, 3, "the three crates crossed at the dock"); assert.equal(s1.accepted, s0.accepted, "none opened by the dock");
        assert.ok(plan.narrow && plan.view && plan.view.w <= 530 + 1e-6 && !plan.whole, "the Bay is Home's narrow window, no whole-screen flag"); assert.ok(pan.x < 1, "the window is not panned off the Bay's left edge");
        const im0 = await g.shot(`s32-${tag}-dock`), shelf = lp(plan, pan, [16, 438, 286, 116]), counters = lp(plan, pan, [310, 438, 204, 116]), ledge = lp(plan, pan, [16, 48, 498, 76]), table = lp(plan, pan, [16, 132, 498, 300]);
        // the Bay's words are whole and readable: the light words stand inside the window and none touches its edges
        const sc = plan.screen, d = size.dpr, reg = { x: Math.round(sc.x * d), y: Math.round(sc.y * d), w: Math.round(sc.w * d), h: Math.round(sc.h * d) }, we = wordEdges(im0, reg);
        assert.ok(we.left <= 3 && we.right <= 3, `no word of the Bay touches the window's edges (left ${we.left}, right ${we.right})`);
        console.log(`# s32 ${tag}: a 20 lp word is ${(20 * plan.scale).toFixed(1)} CSS px, a 16 lp word ${(16 * plan.scale).toFixed(1)} CSS px`);
        // the Companion's hold reads empty (the crates crossed): its device shows no crate aboard
        assert.equal(s1.caddy.crates ?? 0, 0, "the Companion's hold reads empty after the dock");
        const amounts = { e: 3 * 18, d: 3 * 20, s: 3 * 13 }; let prev = im0, pods = 0;
        const crates = [2, 2, 1];
        if (all) {
          { const pb = await g.page.locator("button.pad.down:visible").first().boundingBox({ timeout: 5000 }); await g.page.mouse.click(pb.x + pb.width / 2, pb.y + pb.height / 2); await until(g.page, () => window.__play.frames.station.contentWindow.__st.ST.accepted.length >= 3 && (window.__play.frames.station.contentWindow.__st.ST.bayHeld || []).length === 0, null, "▼ puts the three crates away"); await stable(g.page); }   // the Station's own pad, down
          const imA = await g.shot(`s32-${tag}-all`), sA = await stt();
          assert.ok(diff(prev, imA, shelf) > 200 && diff(prev, imA, counters) > 100 && diff(prev, imA, ledge) > 200, "▼ All at once: the shelf and the counters changed and the ledge emptied");
          assert.deepEqual([sA.accepted - s0.accepted, sA.tray, sA.held, sA.e - s0.e, sA.d - s0.d, sA.s - s0.s], [3, 5, 0, amounts.e, amounts.d, amounts.s], "▼: three crates, five pods on the shelf, each counter up by its crates' amounts");
          return;
        }
        for (let k = 0; k < 3; k++) {
          await g.press("confirm", 100, 0); await until(g.page, () => window.__play.frames.station.contentWindow.__st.UI.cargo.open === true, null, `✓ opens crate ${k}`); await stable(g.page); const imO = await g.shot(`s32-${tag}-open${k}`), sO = await stt();
          assert.equal(sO.open, true, "✓ opens crate " + k); assert.ok(diff(prev, imO, table) > 500, "the table shows the open crate: its panel changed");
          pods += crates[k]; await g.press("confirm", 100, 0); await until(g.page, (n) => window.__play.frames.station.contentWindow.__st.ST.tray.length >= n && window.__play.frames.station.contentWindow.__st.UI.cargo.open === false, pods, `✓ puts crate ${k} away`); await stable(g.page); const imP = await g.shot(`s32-${tag}-away${k}`), sP = await stt();
          assert.equal(sP.tray, pods, `✓ Put away: each pod of crate ${k} is on the shelf`); assert.ok(diff(imO, imP, shelf) > 100, "the shelf shows the new pods: its panel changed"); assert.ok(diff(imO, imP, counters) > 50, "the counters changed");
          assert.deepEqual([sP.e - s0.e, sP.d - s0.d, sP.s - s0.s], [18 * (k + 1), 20 * (k + 1), 13 * (k + 1)], "each counter rose by its crate's amount");
          prev = imP;
        }
        const sE = await stt(); assert.deepEqual([sE.accepted - s0.accepted, sE.held, sE.tray], [3, 0, 5], "the same end as ▼");
      } finally { await g.ctx.close(); }
    };
    await run(false); await run(true);
  });
  it(`s32b the Bay full: a fourth crate while three wait stays aboard and the Companion says the Bay is full; ← from the Bay is Home, uncut [${tag}]`, async () => {
    const g = await open(size, "bay-four");
    try {
      // saves/bay-four.save: the same Companion with a fourth sealed crate aboard
      const dock = g.page.getByRole("button", { name: /Dock the Companion/ }).first(), bb = await dock.boundingBox({ timeout: 5000 });
      await g.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await until(g.page, () => { const s = window.__play.frames.station.contentWindow.__st; return window.__play.owner === "station" && s.UI.screen === "cargo" && (s.ST.bayHeld || []).length > 0; }, null, "Dock: the Bay shows the crates"); await stable(g.page);
      const S = () => g.page.evaluate(() => { const s = window.__play.frames.station.contentWindow.__st; return { screen: s.UI.screen, held: (s.ST.bayHeld || []).length }; });
      assert.deepEqual(await S(), { screen: "cargo", held: 3 }, "three crossed, the Bay is full");
      const caddy = await g.page.evaluate(() => window.__play.caddy); console.log(`# s32b ${tag}: caddy ${JSON.stringify(caddy)}`);
      assert.equal(caddy.crates, 1, "the fourth crate stays aboard the Companion");   // the state: that the case is reached; the verdict is the line on the screen
      const plan = await g.page.evaluate(() => window.__play.plan), pan = await g.page.evaluate(() => window.__play.pan), d = size.dpr, s = plan.scale * d, sc = plan.screen, reg = { x: Math.round(sc.x * d), y: Math.round(sc.y * d), w: Math.round(sc.w * d), h: Math.round(sc.h * d) };
      const imFull = await g.shot(`s32b-${tag}-full`);
      // the Companion's two lines on the ledge, "1 crate aboard / the Bay is full" (bay-words-1), against their crop from the shipped build (refs/bay-full-<size>.png; the ledge's state lines at lp 96..296 x 60..116)
      const line = { x: Math.round(sc.x * d + (96 - pan.x) * s), y: Math.round(sc.y * d + (60 - pan.y) * s), w: Math.round(200 * s), h: Math.round(56 * s) }, rf = againstRef(imFull, line, `bay-full-${tag}`);
      console.log(`# s32b ${tag}: the Companion's Bay-full line: ${rf.n} of ${rf.of} pixels differ from its reference`);
      assert.ok(rf.frac <= 0.02, `the Companion says the Bay is full: its line matches the reference crop (${rf.n} of ${rf.of} pixels differ)`);
      for (let i = 1; i <= 3; i++) { await g.press("back", 100, 0); await until(g.page, () => window.__play.frames.station.contentWindow.__st.UI.screen !== "cargo", null, "← leaves the Bay"); await stable(g.page); if ((await S()).screen !== "cargo") break; }
      const s2 = await g.page.evaluate(() => ({ focus: window.__play.focus, pan: window.__play.pan, plan: window.__play.plan }));
      assert.notEqual(s2.focus.screen, "cargo", "← left the Bay"); assert.equal(await g.page.evaluate(() => window.__play.frames.station.contentWindow.__st.props.narrow), true, "← from the Bay lands on Home's narrow window");
      // Home after the Bay, uncut at the window's edges: s5b's verdict (the face's words in the window's edge columns, not the painting's mist)
      const imHome = await g.shot(`s32b-${tag}-home`), we = wordEdges(imHome, reg);
      assert.ok(we.left <= 3 && we.right <= 3, `Home after the Bay: no word touches the window's edges (left ${we.left}, right ${we.right})`);
    } finally { await g.ctx.close(); }
  });
  // her slot (UI on PR 682, bus e5d250): a save where a mibi came home (saves/bay-home.save: bay-three plus Tita, carried, her "home" asked): at the dock the Bay shows her picture slot and "{name} came home" right of the crate, before his first press. The still is the verdict (UI looks); state only says the case is reached.
  it(`s32c the Bay, a mibi came home: her slot and her name show beside the crate before his first press [${tag}]`, async () => {
    const g = await open(size, "bay-home");
    try {
      const dock = g.page.getByRole("button", { name: /Dock the Companion/ }).first(), bb = await dock.boundingBox({ timeout: 5000 });
      await g.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
      await until(g.page, () => { const s = window.__play.frames.station.contentWindow.__st; return window.__play.owner === "station" && s.UI.screen === "cargo" && (s.ST.bayHeld || []).length > 0; }, null, "Dock: the Bay shows the crates"); await stable(g.page);
      const came = await g.page.evaluate(() => { const s = window.__play.frames.station.contentWindow.__st; return { back: s.UI.cargo.arrival && s.UI.cargo.arrival.back, pressed: s.UI.cargo.pressed, tag: s.props.bay && s.props.bay.came && s.props.bay.came.tag }; });
      console.log(`# s32c ${tag}: ${JSON.stringify(came)}`);
      assert.ok(came.tag && !came.pressed, "the case is reached: the Bay carries her name before his first press");   // state: only that the case is reached; the verdict is the pixels below (rule 16a)
      const imCame = await g.shot(`s32c-${tag}-came`), plan = await g.page.evaluate(() => window.__play.plan), pan = await g.page.evaluate(() => window.__play.pan);
      const lp = (r) => { const d = size.dpr, s = plan.scale * d, sc = plan.screen; return { x: Math.round(sc.x * d + (r[0] - pan.x) * s), y: Math.round(sc.y * d + (r[1] - pan.y) * s), w: Math.round(r[2] * s), h: Math.round(r[3] * s) }; };
      const slot = lp([338, 194, 150, 164]), tagBox = lp([338, 364, 150, 30]);   // cargo.json forms.narrow.her: the slot, and the tag under it (tagAt 413,374)
      // the no-arrival Bay: bay-three's dock shot at the same size, the same crate and no mibi home
      const h = await open(size, "bay-three"); let imNone;
      try {
        const db = await h.page.getByRole("button", { name: /Dock the Companion/ }).first().boundingBox({ timeout: 5000 });
        await h.page.mouse.click(db.x + db.width / 2, db.y + db.height / 2);
        await until(h.page, () => { const s = window.__play.frames.station.contentWindow.__st; return window.__play.owner === "station" && s.UI.screen === "cargo" && (s.ST.bayHeld || []).length > 0; }, null, "Dock: the Bay shows the crates"); await stable(h.page);
        imNone = await h.shot(`s32c-${tag}-none`);
      } finally { await h.ctx.close(); }
      const inSlot = changed(imCame, imNone, slot), inTag = changed(imCame, imNone, tagBox);
      console.log(`# s32c ${tag}: her slot: ${inSlot.n} of ${inSlot.of} pixels differ from the Bay with no arrival; her tag's box: ${inTag.n} of ${inTag.of}`);
      assert.ok(inSlot.frac > 0.1, `her slot's region changed against the no-arrival Bay (${inSlot.n} of ${inSlot.of} pixels differ)`);
      assert.ok(inTag.n > 100, `her tag's region changed against the no-arrival Bay (${inTag.n} of ${inTag.of} pixels differ)`);
      // "{name} came home" against its crop (refs/bay-came-<size>.png)
      const rf = againstRef(imCame, tagBox, `bay-came-${tag}`);
      console.log(`# s32c ${tag}: "${came.tag}": ${rf.n} of ${rf.of} pixels differ from its reference crop`);
      assert.ok(rf.frac <= 0.02, `the Bay reads "${came.tag}": her tag matches its reference crop (${rf.n} of ${rf.of} pixels differ)`);
    } finally { await g.ctx.close(); }
  });
}
// s19b (menu-side-hero-5; QA verify-live-663, bus bcddcf6641): "at col 20 rows 8, 16, 24 the box's right edge cuts off his left side." His #166 save, walked by presses as s19 walks it, then to col 20 and down to rows 8, 16 and 24: ← opens the menu and his orange pixels are as many as before it.
// UI's ruling (bus 5eabf248f7): while the field menu is open the view shifts sideways so he stands clear beside the box. State is read only to say the case is reached and to find where he stands (the window to count his pixels in); the verdict is the pixels.
for (const size of SCALE_SIZES) {
  const tag = `${size.w}x${size.h}`;
  it(`s19b the field menu never covers the hero mid-view (QA verify-live-663, his #166 save, col 20 rows 8, 16, 24): his pixels are whole with the menu open [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const at = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, p = m.RT.plScr; return { phase: m.S.phase, key: P && P.key, x: P && P.x, y: P && P.y, px: p && p.x, py: p && p.y }; });
      const steady = async (dir) => { let same = 0, last = JSON.stringify(await at()); for (let i = 0; i < 40 && same < 2; i++) { await g.press(dir, 100, 500); const now = JSON.stringify(await at()); same = now === last ? same + 1 : 0; last = now; } };
      for (const dir of ["up", "right", "down", "left"]) await steady(dir);   // s19's walk
      const card = () => g.page.evaluate(() => !!window.__play.frames.companion.contentWindow.__mb.FX.card);
      const HERO_T = ([r, gg, b]) => r > 110 && r > gg * 1.5 && gg > b * 1.6 && b < 110;   // the jacket's orange, also as the dusk light tints it
      const goTo = async (col, row) => {
        let stuck = 0;
        for (let i = 0; i < 80 && stuck < 3; i++) {
          const s = await at(); if (s.x === col && (row == null || s.y === row)) return s;
          const dir = s.x < col ? "right" : s.x > col ? "left" : s.y < row ? "down" : "up";
          await g.press(dir, 100, 450); for (let k = 0; k < 4 && await card(); k++) await g.press("confirm", 100, 700);   // the day's light runs out on the way: the dusk or night card is passed with ✓ as a player does
          const n = await at(); stuck = n.x === s.x && n.y === s.y ? stuck + 1 : 0;
        }
        return at();
      };
      for (const row of [8, 16, 24]) {
        const spot = await goTo(20, row);
        console.log(`# s19b ${tag}: row ${row}: he stands at ${JSON.stringify(spot)}`);
        assert.equal(spot.phase, "patch", "the case is reached: he is walking the place");
        assert.ok(spot.x === 20 && spot.y === row, `the case is reached: col 20 row ${row} (he is at ${spot.x}, ${spot.y})`);
        const r = await g.region(), k = r.w / 450, win = (p) => ({ x: Math.round(r.x + (p.px - 28) * k), y: Math.round(r.y + (p.py - 28) * k), w: Math.round(56 * k), h: Math.round(56 * k) });
        const base = await g.shot(`s19b-${tag}-r${row}-before`), hero = blobs(base, win(spot), HERO_T)[0];
        assert.ok(hero && hero.n > 60, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
        await g.press("back", 100, 900);                       // ← opens the menu; the view shifts (the ease is 250 ms)
        const open1 = await at();
        assert.equal(open1.phase, "menu", "the case is reached: the menu is open");
        const menu = blobs(await g.shot(`s19b-${tag}-r${row}-menu`), win(open1), HERO_T)[0] || { n: 0, box: null };
        console.log(`# s19b ${tag}: row ${row}: hero ${hero.n} px before, ${menu.n} with the menu open, he stands at x ${Math.round(spot.px)} then ${Math.round(open1.px)}`);
        assert.ok(menu.n >= hero.n * 0.95, `the hero's pixels are whole with the menu open, the box is not over him (${menu.n} of ${hero.n} pixels)`);
        assert.ok(menu.box && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange at his place is his whole figure (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
        await g.press("back", 100, 900);                       // ← closes it; the view shifts back
        const back = await at();
        assert.equal(back.phase, "patch", "the menu closed");
        assert.ok(Math.abs(back.px - spot.px) <= 1, `the view shifted back on close (he stands at x ${Math.round(back.px)}, was ${Math.round(spot.px)})`);
      }
    } finally { await g.ctx.close(); }
  });
}
   // each test has its own browser context; the machine has the cores, and the land next door takes a while to draw
for (const size of SIZES) {
  const tag = `${size.w}x${size.h}`;

  // OWNER #143 (11-24): "short call is ALWAYS a call, long call is ALWAYS a zoom out. hero position has nothing to do with the behavior of a call."
  it(`s1 the Call (#143/#152, his save, patch 13,9 tile 0,8): a short Call is the ring with no zoom, a held Call is the zoomed-out view [${tag}]`, async () => {
    const g = await open(size, "152");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 0, 8], "the case is reached: he stands at the spot of his note");
      const r = await g.region(), base = await g.shot();
      const frames = await g.record(() => g.press("call", 100, 0), 1500);   // a short Call, with every frame the browser paints from before it to 1.5 s after
      const fr = (f) => ({ x: Math.round(r.x * f.width / base.width), y: Math.round(r.y * f.height / base.height), w: Math.round(r.w * f.width / base.width), h: Math.round(r.h * f.height / base.height) });
      const ring = Math.max(0, ...frames.map((f) => colour(f, fr(f), RING).n));   // the ring is the Call's own light blue; the walking view has none
      assert.ok(frames.length >= 2 && ring >= 20, `a short Call shows the Call's ring on the screen (${ring} ring pixels in the best of ${frames.length} frames)`);
      const dark = (f, reg) => colour(f, reg, ([R, G, B]) => R + G + B < 130).n / (reg.w * reg.h);   // the zoomed-out view is mostly the dark ground; the walking view has none
      const d0 = dark(base, r);
      for (const [i, f] of frames.entries()) assert.ok(dark(f, fr(f)) < d0 + 0.15, `a short Call stays in the walking view (frame ${i}: ${dark(f, fr(f)).toFixed(2)} dark, the walking view ${d0.toFixed(2)})`);
      await wait(1000);
      const walk = await g.shot();
      assert.ok(changed(base, walk, r).frac < 0.2, "and it is still the walking view a second later");
      assert.ok(changed(base, walk, r, [0, 0.88, 1, 0.12]).n >= 500, `and the Call's line stands at the bottom of the screen (${changed(base, walk, r, [0, 0.88, 1, 0.12]).n} pixels of it)`);
      await g.hold("call"); await wait(1500);              // a held Call
      const held = await g.shot();
      assert.ok(changed(walk, held, r).frac > 0.5, `a held Call is the zoomed-out view (${changed(walk, held, r).frac.toFixed(2)} of the screen moved)`);
      await g.release(); await wait(900);
      assert.ok(changed(walk, await g.shot(), r).frac < 0.05, "and releasing it returns the walking view");
    } finally { await g.ctx.close(); }
  });

  // OWNER #136 (11-24): "cross-place call broke again, i'm calling at this edge and is not revealing in the place above."
  it(`s2 the Call next door (#136, his save, patch 9,5 tile 9,0): a Call at the edge turns the strip of the place above from veiled to seen [${tag}]`, async () => {
    const g = await open(size, "136");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 9, 0], "the case is reached: he stands at the edge of his note");
      const r = await g.region();
      // the strip above the hero's place: the band of the screen between the HUD (to 6% of the game screen) and the top of the hero's own place (from 27%), 10% to 26% of the screen; the sliver of his own place and the HUD's green icon are not the place above. Veiled it is dark dither; seen it is the land (grass, sand, water), which is bright and not the dark ground.
      const strip = { x: r.x, y: r.y + Math.round(r.h * 0.10), w: r.w, h: Math.round(r.h * 0.16) };
      const seen = (im) => colour(im, strip, ([R, G, B]) => G > 140 && G > B + 30).n;
      const top = [0, 0.10, 1, 0.16];
      // the reference strip is taken BEFORE the Call: the held view with the place above still veiled, then released
      await g.hold("call"); await wait(1500);
      const before = await g.shot(`s2-${tag}-before`);
      await g.release(); await wait(900);
      const veiled = seen(before), share = veiled / (strip.w * strip.h);
      console.log(`# s2 ${tag}: reference strip ${veiled} land pixels (${(share * 100).toFixed(2)}% of the strip)`);
      assert.ok(share < 0.005, `the case is not reached: the reference strip is already mostly seen before the Call (${veiled} land pixels, ${(share * 100).toFixed(2)}% of the strip; it must be under 0.50%)`);
      await g.press("call", 100, 1200);                     // the Call at the edge
      await g.hold("call"); await wait(1500);               // the held view again; the land next door is asked for ("The Probe is reading the land") and drawn when it comes
      let after = await g.shot(), waited = 1.5, t0 = Date.now();
      for (let i = 0; i < 40 && seen(after) < seen(before) + 3000; i++) { await wait(1000); after = await g.shot(); waited = (Date.now() - t0) / 1000 + 1.5; }
      console.log(`# s2 ${tag}: the strip was seen after ${waited.toFixed(1)} s held`);
      after = await g.shot(`s2-${tag}-after`);
      await g.release();
      assert.ok(seen(after) >= seen(before) + 3000, `the Call turned the strip of the place above from veiled to seen (after ${waited.toFixed(1)} s held; land pixels in the strip: ${seen(before)} before, ${seen(after)} after; ${changed(before, after, r, top).n} pixels changed)`);
    } finally { await g.ctx.close(); }
  });

  // QA verify-live-152 (fixed by PR 621): the hero stays drawn under the menu and while waiting when he stands near a place edge. His #166 save, patch 10,11 tile 21,0.
  it(`s3 the hero under the menu (#166, his save, tile 21,0): his pixels are on screen after ← opens the menu and after one Wait [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      // PLACE_REV 5 made the place again: his #166 save loads at 20,4 (the 11-27 land rule), not on the old edge tile. By presses (✓ for the day's cards) to col 20 row 8, where he stands mid-view
      const pos = () => g.page.evaluate(() => { const P = window.__play.frames.companion.contentWindow.__mb.S.exp.patch; return { x: P && P.x, y: P && P.y }; });
      const card = () => g.page.evaluate(() => !!window.__play.frames.companion.contentWindow.__mb.FX.card);
      for (let i = 0; i < 40; i++) {
        const s = await pos(); if (s.x === 20 && s.y === 8) break;
        for (let k = 0; k < 4 && await card(); k++) await g.press("confirm", 100, 700);
        await g.press(s.x < 20 ? "right" : s.x > 20 ? "left" : s.y < 8 ? "down" : "up", 100, 450);
      }
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 20, 8], "the case is reached: he stands mid-view");
      const r = await g.region(), base = await g.shot();
      // the hero is the biggest orange blob of the play field (below the HUD strip); the menu's orange selection bar and the HUD icons are other blobs and are never counted
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) };
      const hero = blobs(base, field, HERO)[0];
      assert.ok(hero && hero.n > 300, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
      const pad = 6, hb = { x: hero.box.x - pad, y: hero.box.y - pad, w: hero.box.w + 2 * pad, h: hero.box.h + 2 * pad };
      await g.press("back");                                // ← opens the menu
      // the view shifts sideways while the menu is open (UI's ruling, bus 5eabf248f7), so the window to count in follows him: his pawn's place on the view, as s19b finds it
      const k = r.w / 450, ps = await g.page.evaluate(() => { const p = window.__play.frames.companion.contentWindow.__mb.RT.plScr; return { px: p && p.x, py: p && p.y }; });
      const mw = { x: Math.round(r.x + (ps.px - 28) * k), y: Math.round(r.y + (ps.py - 28) * k), w: Math.round(56 * k), h: Math.round(56 * k) };
      const menuBlobs = blobs(await g.shot(`s3-${tag}-menu`), mw, HERO), menu = menuBlobs[0] || { n: 0, box: null };
      console.log(`# s3 ${tag}: hero ${hero.n} px, menu ${menu.n} (${menuBlobs.length} blob(s) at his place)`);
      assert.ok(menu.n >= hero.n * 0.6, `the hero is on screen with the menu open (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.n <= hero.n * 1.2, `the orange counted with the menu open is the hero's, not the menu's selection bar (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.box && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange blob with the menu open is his whole figure (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
      const rows = await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.menuItems().length);
      for (let i = 0; i < rows && await g.menuRow() !== "wait"; i++) await g.press("down");   // the rows differ by save ('Her page' only when a Loika is named): press Down until the row is Wait
      assert.equal(await g.menuRow(), "wait", "the case is reached: the selected row is Wait before confirm");
      const spent0 = await g.spent();
      await g.press("confirm", 100, 2500);                  // Wait, once
      assert.ok(await g.spent() > spent0, "the case is reached: Wait spent light (S.day.spent grew)");
      const wshot = await g.shot(`s3-${tag}-wait`), waited = blobs(wshot, hb, HERO)[0] || { n: 0 };
      console.log(`# s3 ${tag}: after Wait ${waited.n}`);
      assert.ok(waited.n >= hero.n * 0.75, `the hero is on screen after one Wait (${waited.n} of ${hero.n} pixels)`);
    } finally { await g.ctx.close(); }
  });

  // QA repro-unknown-creature-1 (bus 351527b9ce), design 11-25: beside an unmet Untuva (sp 2, no individual) the bottom line read '✓ Unknown creature' and ✓ did nothing. It reads Keep still and ✓ waits.
  // The case is set up by putting the creature on the tile he faces (a wild one's spawn is not ours to steer); the verdict is the light spent by pressing ✓ and the bottom line's pixels changing.
  it(`s6 a dead ✓ (156-4, his save, patch 0,8): beside an unmet creature that is no individual, ✓ reads Keep still and spends light [${tag}]`, async () => {
    const g = await open(size, "152");
    try {
      const put = await g.page.evaluate(() => {
        const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp.patch, live = m.curLive();
        S.known = S.known.filter((s) => s !== 2);
        const f = m.frontOf(P);
        live.cr.push({ id: 9e6, sp: 2, x: f.x, y: f.y, st: "idle", t: 0, wet: 0, calm: 0, curl: 0, hide: 0, b: 0.5, face: 1, ready: false, edgeIn: 1 });
        return { label: m.patchAction().label, ind: live.cr.find((c) => c.id === 9e6).ind || null, known: S.known.includes(2) };
      });
      console.log(`# s6 ${tag}: before the press the line reads ${JSON.stringify(put.label)}`);
      assert.equal(put.known, false, "the case is reached: he has not met the kind (an Untuva, sp 2)");
      assert.equal(put.ind, null, "the case is reached: the creature is no individual");
      assert.equal(put.label, "Keep still", "the bottom line beside it reads Keep still, not Unknown creature");
      const spent0 = await g.spent();
      await g.press("confirm", 100, 2500);
      assert.ok(await g.spent() > spent0, `✓ spent light beside it (${spent0} -> ${await g.spent()})`);
    } finally { await g.ctx.close(); }
  });

  // OWNER 11-25 ("ok" to the sleep rule): a late Loika beds down at her bed in the last light of dusk. Arranged saves (sleep-dusk-<seed>): the hero stands 2 tiles right of her bed, the clock at light 525.
  // Played by the d-pad only (right, left, ...) until the light passes 549. State only asserts the case is reached (her at her bed, the light under 552); the verdict is her bed tile on the shot: a curled Loika is dark against the meadow.
  for (const [seed, away] of [[7, 2], [42, 3], [21, 2]]) {
    it(`s7 dusk bed (seed ${seed}): a late Loika is curled at her bed before light 552 [${tag}]`, async () => {
      const g = await open(size, `sleep-dusk-${seed}`);
      try {
        assert.ok((await g.where()).phase === "patch" && await g.spent() === 525, "the case is reached: he stands in the place at light 525");
        for (let i = 0; i < 40 && await g.spent() < 549; i++) await g.press(i % 2 ? "left" : "right", 100, 450);
        const at = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { spent: m.S.day.spent, atBed: m.curLive().cr.some((c) => c.sp === 0 && m.atBedNow(c)) }; });
        assert.ok(at.spent >= 549 && at.spent < 552 && at.atBed, `the case is reached: her at her bed with the light under 552 (${JSON.stringify(at)})`);
        const r = await g.region(), tile = 48 * r.w / 450, im = await g.shot(`s7-${tag}-${seed}`);
        const hero = blobs(im, { x: r.x, y: r.y + Math.round(r.h * 0.06), w: r.w, h: Math.round(r.h * 0.88) }, HERO)[0];
        assert.ok(hero && hero.n > 100, "the hero is on the shot");
        const cx = hero.box.x + hero.box.w / 2 - away * tile, cy = hero.box.y + hero.box.h / 2;   // her bed: `away` tiles left of the hero, on his row
        const bed = { x: Math.round(cx - tile / 2), y: Math.round(cy - tile / 2), w: Math.round(tile), h: Math.round(tile) };
        const dark = colour(im, r, ([R, G, B]) => R + G + B < 150, bed).n;
        const beside = { ...bed, x: Math.round(hero.box.x + hero.box.w / 2 + tile / 2), y: bed.y }, bare = colour(im, r, ([R, G, B]) => R + G + B < 150, beside).n;   // the meadow on his other side, for the shot's own measure of 'no Loika'
        console.log(`# s7 ${tag} seed ${seed}: ${dark} dark pixels in her bed tile, ${bare} in the meadow beside him (of ${bed.w * bed.h})`);
        assert.ok(dark >= bed.w * bed.h * 0.04 && dark >= bare * 4 + 100, `her bed tile holds a curled Loika (${dark} dark pixels; the meadow beside him ${bare}; of ${bed.w * bed.h})`);
      } finally { await g.ctx.close(); }
    });
  }

  // OWNER 2026-11-24 18:5x ("you just can pick the pod at night"); 2026-11-26 05:2x: "you're making it too complicated, it's a cozy game": no flag limit, he takes her up wherever she sleeps.
  // pod-sleep-dusk-13 was made by presses (her-fruit-13: ✓ feeds Maple, then held ✓ keeping still, ~170 presses, to light 528; she walks to her bed on her own). Played by held ✓ (keeping still), the d-pad and ✓ only.
  // pod-sleep-night-a / -b (pod-sleep-fix-6) are saves made by presses on that same chain so each case starts near its moment: -a after held ✓ from 528 to light 545 (a few lights before nightfall, s22 and s22b);
  // -b after held ✓ to nightfall, then right x2 and up x10 to two tiles below her pod and left/right steps to light 596 (a few lights before first light, s23).
  // State only asserts each case is reached (the light, her pod on the ground, the Case); the verdicts are the shots: her pod's tile and the Case's slot in the top bar, each against a shot from the same test.
  const PODTILE = [0.43, 0.328, 0.067, 0.0525], CTLTILE = [0.2, 0.328, 0.067, 0.0525], CASESLOT = [0.13, 0.015, 0.06, 0.04], ASKBOX = [0.02, 0.1, 0.96, 0.2];   // as fractions of the Companion's frame, hero standing on the tile below her pod (412x915)
  const podState = (g) => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S; return { spent: S.day.spent, phase: S.phase, pods: S.pods.filter((p) => p.how === "night").length, cased: S.exp ? S.exp.cargo.pods.filter((p) => p.how === "night").length : 0, slept: S.cr.filter((w) => w.slept).length, up: m.curLive().cr.some((c) => c.id === 35) }; });
  // Every press waits for its effect (the light or the hero's tile moves, or 3 s) and then for the screen to hold still for 400 ms, never a fixed pause (a press during a change is swallowed; 674's s21 failed on CI that way).
  const podSig = (g) => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent, S.pods.length, S.exp ? S.exp.cargo.pods.length : 0, S.ui && S.ui.menuSel].join("|"); });
  const podStep = async (g, l, hold = 100) => { const before = await podSig(g); await g.press(l, hold, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await podSig(g); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await podSig(g); same = n2 === now ? same + 1 : 0; now = n2; } };
  const holdUntil = async (g, test) => { for (let i = 0; i < 80 && !test(await podState(g)); i++) await podStep(g, "confirm", 1500); return podState(g); };
  const walkToPod = async (g) => { for (const d of ["right", "right"]) await podStep(g, d); for (let i = 0; i < 11; i++) await podStep(g, "up"); };
  if (size.w === 412) it(`s22 night pod (OWNER 11-24): fed at dusk, she is closed into her pod at nightfall; ✓ takes her up (the confirm, then ✓): her pod is off the ground and in the Case [${tag}]`, async () => {
    const g = await open(size, "pod-sleep-night-a");
    try {
      let s = await podState(g);
      assert.ok(s.phase === "patch" && s.spent >= 540 && s.spent < 550 && s.pods === 0 && s.slept === 0, "the case is reached: dusk, fed, nothing asleep yet " + JSON.stringify(s));
      s = await holdUntil(g, (q) => q.spent >= 551);
      assert.ok(s.pods === 1 && s.slept === 1, "the case is reached: nightfall, her pod on the ground " + JSON.stringify(s));
      await walkToPod(g);
      const r = await g.region(), at = await g.shot("s22-at-pod");
      await g.press("confirm", 100, 0);
      let ask = await g.shot("s22-ask"), dlg = changed(at, ask, r, ASKBOX);
      for (let t = 0; t < 30 && dlg.frac <= 0.3; t++) { await wait(100); ask = await g.shot("s22-ask"); dlg = changed(at, ask, r, ASKBOX); }   // the confirm's own effect: the box on the screen
      assert.equal((await podState(g)).cased, 0, "the confirm spends nothing: she is not in the Case yet");
      console.log(`# s22 ${tag}: confirm box pixels ${dlg.n} of ${dlg.of}`);
      assert.ok(dlg.frac > 0.3, "✓ at her pod opens the confirm over the screen");
      await g.press("confirm", 100, 0);
      for (let t = 0; t < 30 && (await podState(g)).cased < 1; t++) await wait(100);   // the take-up's effect: her pod is in the Case
      await wait(1000); const held = await g.shot("s22-held");   // the slot's own settle, then the shot
      const tile = changed(at, held, r, PODTILE), ctl = changed(at, held, r, CTLTILE), slot = changed(at, held, r, CASESLOT);
      console.log(`# s22 ${tag}: her pod's tile changed ${tile.n} of ${tile.of} (a tile beside it ${ctl.n}), the Case slot ${slot.n} of ${slot.of}`);
      assert.ok(tile.n >= 40 && ctl.n < 10, `her pod is off the ground on the shot (${tile.n} pixels changed on its tile, ${ctl.n} beside it)`);
      assert.ok(slot.n >= 200, `the Case's slot in the top bar shows her (${slot.n} pixels changed)`);
      s = await podState(g);
      assert.ok(s.cased === 1 && s.pods === 0, "the case is reached: her pod is in the Case " + JSON.stringify(s));
    } finally { await g.ctx.close(); }
  });
  // night-pod-place-1 (OWNER 11-24 18:5x "turns into a pod for the night"; LEAD 11-27 06:05, the signed picture is the gate): her pod on the land is the signed 32x32 tile, and the Case cradle shows the signed 32x18 cut.
  // The verdict is a shot against the signed file: the file's opaque pixels, sampled at the screen's scale (the game canvas is 450 wide), against the shot in a window around where the piece is drawn; the best luminance correlation (night tints the colours, not the shape).
  const lum = ([R, G, B]) => 0.299 * R + 0.587 * G + 0.114 * B;
  const propPng = (n) => decodePNG(readFileSync(path.join(repo, "prototypes/exploration/art/props", n + ".png")));
  const matchPiece = (im, r, pic, ox, oy, span, step) => {   // best Pearson r of the file's opaque pixels against the shot, the piece's top-left at (ox..ox+span, oy..oy+span) device px
    const k = r.w / 450, pts = [];
    for (let j = 0; j < pic.height; j++) for (let i = 0; i < pic.width; i++) { const o = (j * pic.width + i) * 4; if (pic.data[o + 3] > 200) pts.push([i, j, lum([pic.data[o], pic.data[o + 1], pic.data[o + 2]])]); }
    let best = { r: -2, x: 0, y: 0 };
    for (let dy = -span; dy <= span; dy += step) for (let dx = -span; dx <= span; dx += step) {
      const a = [], b = [];
      for (const [i, j, L] of pts) { const x = Math.round(ox + dx + (i + 0.5) * k), y = Math.round(oy + dy + (j + 0.5) * k); a.push(L); b.push(lum(px(im, x, y))); }
      const ma = a.reduce((s, v) => s + v, 0) / a.length, mb = b.reduce((s, v) => s + v, 0) / b.length;
      let sab = 0, saa = 0, sbb = 0; for (let n = 0; n < a.length; n++) { sab += (a[n] - ma) * (b[n] - mb); saa += (a[n] - ma) ** 2; sbb += (b[n] - mb) ** 2; }
      const c = saa && sbb ? sab / Math.sqrt(saa * sbb) : 0; if (c > best.r) best = { r: c, x: dx, y: dy };
    }
    return { ...best, n: pts.length };
  };
  it(`s22b her night pod is the signed picture: the land tile at nightfall, the Case's cut once she is taken up [${tag}]`, async () => {
    const g = await open(size, "pod-sleep-night-a");
    try {
      let s = await holdUntil(g, (q) => q.spent >= 551);
      assert.ok(s.pods === 1 && s.slept === 1, "the case is reached: nightfall, her pod on the ground " + JSON.stringify(s));
      await walkToPod(g);
      const r = await g.region(), k = r.w / 450, at = await g.shot(`s22b-${tag}-night-land`);
      const tile = propPng("NIGHT_POD_LOIKA-tile-32x32"), cut = propPng("night-pod-loika-case-32x18");
      const m = matchPiece(at, r, tile, r.x + r.w * (0.43 + 0.0335) - 16 * k, r.y + r.h * (0.328 + 0.02625) - 16 * k, Math.round(k * 20), 2);   // PODTILE's centre, the 32x32 piece's top-left from it
      console.log(`# s22b ${tag}: her tile against the signed 32x32 file: r ${m.r.toFixed(3)} over ${m.n} pixels, at offset ${m.x},${m.y}`);
      if (size.w === 412) assert.ok(m.r >= 0.8, `her pod's tile on the land shows the signed night pod (correlation ${m.r.toFixed(3)})`);
      if (size.w === 412) {   // LEAD 11-27 06:53: on this screen Ash stands tagged in sight, so the line says what he sees ("heard that again · she is going"), never "has gone from here for the day". The verdict is the box's pixels against a crop of it (saves/s22b-ash-line.png; PLAYED_WRITE_CROPS=1 cuts it).
        const BX = 200, BY = 1388, BW = 680, BH = 46;
        const cropFile = path.join(savesDir, "s22b-ash-line.png");
        if (process.env.PLAYED_WRITE_CROPS) { const d = new Uint8Array(BW * BH * 4); for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const p = px(at, BX + x, BY + y), j = (y * BW + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; } writeFileSync(cropFile, encodePNG(BW, BH, d)); }
        const ref = decodePNG(readFileSync(cropFile)); let low = Infinity;
        for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) { let bad = 0; for (let j = 0; j < ref.height && bad < low; j++) for (let i = 0; i < ref.width; i++) { const p = px(at, BX + dx + i, BY + dy + j), k = (j * ref.width + i) * 4; if (p[0] !== ref.data[k] || p[1] !== ref.data[k + 1] || p[2] !== ref.data[k + 2]) bad++; } if (bad < low) low = bad; }
        console.log(`# s22b ${tag}: the box line against its crop differs by ${low} of ${ref.width * ref.height} pixels`);
        assert.ok(low < ref.width * ref.height * 0.02, "Ash is in sight, tagged: the line is 'heard that again · she is going', not 'has gone from here for the day'");
      }
      await g.press("confirm", 100, 0);
      await wait(1500); await g.shot(`s22b-${tag}-confirm`);
      await g.press("confirm", 100, 0);
      for (let t = 0; t < 30 && (await podState(g)).cased < 1; t++) await wait(100);
      await wait(1000);
      await g.press("back", 100, 800);                       // ← opens the menu
      for (let i = 0; i < 10 && await g.menuRow() !== "cargo"; i++) await g.press("down", 100, 300);
      assert.equal(await g.menuRow(), "cargo", "the case is reached: the selected row is the Case");
      await g.press("confirm", 100, 1800);
      const cell = await g.page.evaluate(() => { const c = window.__play.frames.companion.contentWindow.__mb.caseCells().find((q) => q.k === "pod" && q.i === 0); return { x: c.x, y: c.y, r: c.r }; });
      const cs = await g.shot(`s22b-${tag}-case`), cx = cell.x + cell.r, cy = cell.y + cell.r;
      const m2 = matchPiece(cs, r, cut, r.x + (cx - 16) * k, r.y + (cy - 9) * k, Math.round(k * 4), 1);
      console.log(`# s22b ${tag}: the Case cut against the signed 32x18 file: r ${m2.r.toFixed(3)} over ${m2.n} pixels, at offset ${m2.x},${m2.y}`);
      assert.ok(m2.r >= 0.8, `the Case's cradle shows the signed 32x18 cut (correlation ${m2.r.toFixed(3)})`);
    } finally { await g.ctx.close(); }
  });
  if (size.w === 412) it(`s23 first light with her pod on the ground (OWNER 11-24): she wakes up on her bed, her pod gone from its tile [${tag}]`, async () => {
    const g = await open(size, "pod-sleep-night-b");   // made by presses on the same chain: night, her pod on the ground, the hero two tiles below it (✓ here would be the keep-still, not the take-up), light 596
    try {
      let s = await podState(g);
      assert.ok(s.pods === 1 && s.slept === 1 && s.spent >= 590, "the case is reached: night, her pod on the ground " + JSON.stringify(s));
      const r = await g.region(), night = await g.shot("s23-night");
      for (let i = 0; i < 80 && (await podState(g)).spent >= 500; i++) await podStep(g, i % 2 ? "left" : "right");   // each step waits for the light to move
      s = await podState(g);
      assert.ok(s.spent < 100 && s.pods === 0 && s.slept === 0 && s.up, "the case is reached: first light, she is up on the land, no pod left " + JSON.stringify(s));
      const dawn = await g.shot("s23-dawn"), card = changed(night, dawn, r);
      console.log(`# s23 ${tag}: the screen changed ${card.n} of ${card.of} between night and first light`);
      assert.ok(card.frac > 0.6, "first light is on the screen (the dawn card)");
      await podStep(g, "confirm"); const day = await g.shot("s23-day");   // ✓ takes the dawn card away: waits for its effect
      const fur = ([R, G, B]) => R >= 50 && R <= 120 && G >= 30 && G <= 80 && B >= 25 && B <= 75 && R > G + 8, win = { x: r.x + Math.round(r.w * 0.30), y: r.y + Math.round(r.h * 0.18), w: Math.round(r.w * 0.40), h: Math.round(r.h * 0.27) };   // her coat, in the window around her bed
      const before = colour(night, r, fur, win).n, after = colour(day, r, fur, win).n;
      console.log(`# s23 ${tag}: her coat's pixels around her bed: night ${before}, first light ${after}`);
      assert.ok(after >= 300 && after >= before * 4 + 200, `she is up at her bed on the shot (${after} coat pixels, ${before} at night)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-25 22:07 UTC (#175): "i'd like the spashes to be animated. minimalistic animation." (PR 690, rule 16a). His #166 save (light 471), played by the d-pad until the dusk card comes up at light 500.
  // State only asserts the case is reached (the dusk card is up). The verdict is two shots of the screen a beat (500 ms) apart: they differ in the sun's glow and match everywhere else on the card.
  it(`s32 the dusk card moves (#175, his #166 save): two shots 500 ms apart differ in the sun's glow and match outside it [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const card = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return m.FX.card && m.FX.card.k; });
      assert.ok((await g.where()).phase === "patch" && await g.spent() < 500, "the case is reached: he stands in the place before dusk");
      for (let i = 0; i < 80 && !(await card()); i++) await g.press(i % 2 ? "left" : "right", 100, 300);
      assert.equal(await card(), "dusk", "the case is reached: the dusk card is up");
      // the glow's box, found from the card's own file: where the loop's frames differ from one another (grid 225 x 300), a pixel of margin
      const rgba = decodePNG(readFileSync(path.join(repo, "prototypes/exploration/art/cards/dusk-card-450x600.png"))).data, fr = cardFrames("dusk", rgba);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const f of fr) for (let y = 0; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) { const i = (y * CARD_W + x) * 3; if (f[i] !== fr[0][i] || f[i + 1] !== fr[0][i + 1] || f[i + 2] !== fr[0][i + 2]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
      assert.ok(x1 > x0 && y1 > y0, "the loop's frames differ somewhere");
      const glow = [(x0 - 1) / CARD_W, (y0 - 1) / CARD_H, (x1 - x0 + 3) / CARD_W, (y1 - y0 + 3) / CARD_H];
      const r = await g.region(), t0 = Date.now(), a = await g.shot("s32-" + tag + "-a");
      await wait(Math.max(0, 500 - (Date.now() - t0)));
      const b = await g.shot("s32-" + tag + "-b");
      let all = changed(a, b, r), inGlow = changed(a, b, r, glow);
      if (inGlow.n === 0) {   // a loaded machine can stretch the gap to two steps of the 0,1,2,1 loop (frame 1 twice): the next beat is the pair then
        await wait(450); const c = await g.shot("s32-" + tag + "-c");
        all = changed(b, c, r); inGlow = changed(b, c, r, glow);
      }
      console.log(`# s32 ${tag}: ${inGlow.n} of ${inGlow.of} pixels differ in the glow box, ${all.n - inGlow.n} outside it`);
      assert.ok(inGlow.n > 50, `the sun's glow moves between the two shots (${inGlow.n} pixels)`);
      assert.equal(all.n - inGlow.n, 0, "the card matches outside the glow");
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-25 22:07 UTC (#175) and the lead's ruling 11-27 21:12 ("he asked for minimal, not invisible: dawn and dusk get one small motion each that a player sees within 2 s at 412"), splash-anim-4, rule 16a.
  // Dusk (his #166 save) and dawn (the pod-sleep-night-b save, played on to first light): two shots 500 ms apart differ in the moving region by clearly more than the 690 numbers (dusk glow: 50 pixels was the bar; dawn mist: near none) and match outside it.
  // State only asserts each card is up. The region comes from the card file's own loop frames.
  if (size.w === 412) for (const kind of ["dusk", "dawn"]) it(`s40 the ${kind} card's motion is plain to see: two shots 500 ms apart differ clearly in its region and match outside it [${tag}]`, async () => {
    const g = await open(size, kind === "dusk" ? "166" : "pod-sleep-night-b");
    try {
      g.page.on("console", (m) => { if (/card/.test(m.text())) console.log("# s40 page:", m.text().slice(0, 300)); });
      const card = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return m.FX.card && m.FX.card.k; });
      for (let i = 0; i < 90 && (await card()) !== kind; i++) await g.press(i % 2 ? "left" : "right", 100, 300);
      assert.equal(await card(), kind, "the case is reached: the " + kind + " card is up");
      const rgba = decodePNG(readFileSync(path.join(repo, `prototypes/exploration/art/cards/${kind}-card-450x600.png`))).data, fr = cardFrames(kind, rgba);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const f of fr) for (let y = 0; y < CARD_H; y++) for (let x = 0; x < CARD_W; x++) { const i = (y * CARD_W + x) * 3; if (f[i] !== fr[0][i] || f[i + 1] !== fr[0][i + 1] || f[i + 2] !== fr[0][i + 2]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
      assert.ok(x1 > x0 && y1 > y0, "the loop's frames differ somewhere");
      const box = [(x0 - 1) / CARD_W, (y0 - 1) / CARD_H, (x1 - x0 + 3) / CARD_W, (y1 - y0 + 3) / CARD_H];
      const r = await g.region(), t0 = Date.now();
      let prev = await g.shot(`s40-${kind}-a`), all, inBox;
      await wait(Math.max(0, 500 - (Date.now() - t0)));
      for (let k = 0; k < 4; k++) {   // two shots 500 ms apart; a loaded machine can land both on one frame of the 0,1,2,1 loop (and the sleeper's save is slow to draw), so the next beat's pair counts then
        const next = await g.shot(`s40-${kind}-${"bcde"[k]}`);
        all = changed(prev, next, r); inBox = changed(prev, next, r, box); prev = next;
        if (inBox.n > 0) break;
        await wait(450);
      }
      console.log(`# s40 ${kind}: ${inBox.n} of ${inBox.of} pixels differ in the moving region, ${all.n - inBox.n} outside it`);
      assert.ok(inBox.n > (kind === "dusk" ? 1500 : 8000), `the ${kind} card moves plainly between the two shots (${inBox.n} pixels)`);
      assert.equal(all.n - inBox.n, 0, "the card matches outside the moving region");
    } finally { await g.ctx.close(); }
  });

  // OWNER 11-25 16:3x ("collecting materials is cool too, but you fill up too fast your inventory."; satchel-stack-build-1): one satchel slot holds one kind, up to 9; the Case shows the count on the slot, and a 10th keepsake stays with its sleeper.
  // Arranged save sleep-claws-8: two curled Loikas at their beds (Plover, Marsh) in the place five light into the night, the hero 4 tiles right of Plover, the satchel holding 8 claws.
  // Played by buttons only: the Case before (8), ✓ Plover's near note, the Case (9); ✓ Marsh's near note, the message box and the Case again (still 9). State only asserts each case is reached (the claws held, the phase, the light, the reach of the notes).
  const SLOT = [0.06, 0.43, 0.22, 0.12], NOTEBOX = [0.02, 0.80, 0.96, 0.10];   // the first satchel place and the message box, as fractions of the Companion's frame
  it(`s20the Case after notes: the 9th claw reads 9 on its slot; a 10th sleeper's keepsake stays, the box says the satchel is full, the slot stays 9 [${tag}]`, async () => {
    const g = await open(size, "sleep-claws-8");
    try {
      const claws = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { n: m.S.exp.cargo.samples.filter((q) => q.item === "claw").length, phase: m.S.phase, spent: m.S.day.spent }; });
      const caseShot = async (name) => {
        await g.press("back", 100, 800);                       // ← opens the menu
        for (let i = 0; i < 10 && await g.menuRow() !== "cargo"; i++) await g.press("down", 100, 300);
        assert.equal(await g.menuRow(), "cargo", "the case is reached: the selected row is the Case");
        await g.press("confirm", 100, 1800);
        assert.equal((await claws()).phase, "cargo", "the case is reached: the Case is open");
        const im = await g.shot(name);
        await g.press("back", 100, 1200);                      // ← back to the place
        assert.equal((await claws()).phase, "patch", "the case is reached: back in the place");
        return im;
      };
      assert.deepEqual(await claws(), { n: 8, phase: "patch", spent: 555 }, "the case is reached: in the place at light 555 holding 8 claws");
      const r = await g.region(), eight = await caseShot(`s20-${tag}-case-8`);
      await g.press("left", 100, 600); await g.press("left", 100, 600);   // two steps toward her bed, to two tiles from it, facing it
      await g.press("confirm", 100, 1500);                     // ✓ Plover, two tiles ahead of him: her near note, her keepsake
      assert.equal((await claws()).n, 9, "the case is reached: the 9th claw is taken by the note");
      const nine = await caseShot(`s20-${tag}-case-9`);
      const a = changed(eight, nine, r, SLOT);
      console.log(`# s20 ${tag}: slot pixels changed 8 -> 9: ${a.n} (of ${a.of})`);
      assert.ok(a.n > 40, `✓ the 9th: the Case slot reads differently at 9 than at 8 (${a.n} pixels changed)`);
      await g.press("right", 100, 500); for (let i = 0; i < 3; i++) await g.press("down", 100, 500); await g.press("left", 100, 500);   // round to Marsh's row, two tiles from her bed, facing it
      const before = await g.shot(`s20-${tag}-before-10`);
      await g.press("confirm", 100, 1500);                     // ✓ Marsh: a 10th sleeper's near note
      const full = await g.shot(`s20-${tag}-box-10`);
      const b = changed(before, full, r, NOTEBOX);
      console.log(`# s20 ${tag}: message box pixels changed by the 10th note: ${b.n} (of ${b.of})`);
      assert.ok(b.n > 300, `✓ a 10th sleeper: the box reads the full line (${b.n} pixels changed)`);
      assert.equal((await claws()).n, 9, "the reach: the 10th claw is not taken");
      const ten = await caseShot(`s20-${tag}-case-10`);
      const c = changed(nine, ten, r, SLOT);
      console.log(`# s20 ${tag}: slot pixels changed 9 -> after the 10th: ${c.n} (of ${c.of})`);
      assert.ok(c.n < 20, `the slot still reads 9 (${c.n} pixels changed)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-24 18:5x ("you just can pick the pod at night"; 20:2x ok to core-loop-walkthrough-1), PR 673 (sleep-word-fix-2; build desk bus 096fb407f9 + c5d044daad): a curled-up Loika's bar word reads "asleep", not her ease word.
  // Arranged save sleep-claws-8: Plover curled at her bed, 4 tiles left of him, at night. Played: the d-pad left once (he faces her; she stays curled). State only asserts the case is reached (she is curled, his facing, the phase).
  // The verdict is the pixels: the bottom bar's word against a crop of that word (saves/s31-asleep-word.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it). Each press waits for its effect, never a fixed pause.
  if (size.w === 412) it(`s31 a curled-up Loika's bar word reads asleep (PR 673, sleep-claws-8): facing Plover curled at her bed, the bottom bar's word is "asleep" [${tag}]`, async () => {
    const WORD = frac(380, 1142, 400, 52);   // the bar's whole word "Plover · asleep · stay 8", in the 900x1200 frame
    const g = await open(size, "sleep-claws-8");
    try {
      const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.x, P && P.y, P && P.dir, S.day && S.day.spent, S.ui && S.ui.menuSel].join("|"); });
      const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };   // the effect: the state changes (or 3 s), then holds still for 400 ms
      const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, cs = m.curLive().cr.filter((q) => q.ind), c = cs.find((q) => m.curledNow(q) && q.y === P.y) || cs.find((q) => m.curledNow(q)); return { phase: m.S.phase, at: [P.x, P.y], dir: P.dir, herAt: c && [c.x, c.y], curled: !!c && m.curledNow(c), on: !!c && m.onScreen(c.x, c.y), all: cs.map((q) => [q.ind.name, q.x, q.y, m.curledNow(q), m.sleeperOf(q), m.atBedNow(q), q.ease, !!q.hide, !!q.hb]), part: m.dayPart(), spent: m.S.day.spent }; });
      await step("left");   // the d-pad left once: he faces her
      let s = await st();
      // sleep-word-fix-4: from her tell ("curling up to sleep", c.hb sleep, not yet curled) the bar already reads asleep. Compared on the name and the word (the left 60% of the crop; the stay figure may differ).
      const tellNow = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return m.curLive().cr.some((q) => q.ind && q.hb && q.hb.k === "sleep" && !m.curledNow(q) && !(q.ease >= 1) && m.onScreen(q.x, q.y)); });
      let tellBad = null;
      for (let i = 0; i < 14 && !s.curled; i++) {
        await step("confirm"); s = await st();
        if (tellBad === null && !s.curled && await tellNow()) {
          const r0 = await g.region(), im0 = await g.shot("s31-tell"), ref0 = decodePNG(readFileSync(path.join(savesDir, "s31-asleep-word.png"))), cw = Math.round(ref0.width * 0.6);
          const x0 = r0.x + Math.round(r0.w * WORD[0]), y0 = r0.y + Math.round(r0.h * WORD[1]); tellBad = 0;
          for (let y = 0; y < ref0.height; y++) for (let x = 0; x < cw; x++) { const a = ((y0 + y) * im0.width + x0 + x) * 4, b = (y * ref0.width + x) * 4; if (im0.data[a] !== ref0.data[b] || im0.data[a + 1] !== ref0.data[b + 1] || im0.data[a + 2] !== ref0.data[b + 2]) tellBad++; }
          console.log(`# s31 ${tag}: at her tell the bar's word differs from the crop of "asleep" by ${tellBad} of ${cw * ref0.height} pixels`);
          assert.ok(tellBad < cw * ref0.height * 0.02, `at her tell the bar reads asleep (${tellBad} pixels differ)`);
        }
      }
      assert.ok(tellBad !== null, "her tell (curling up to sleep) was seen before she curled");
      // </sleep-word-fix-4> her bedtime play runs its beats as the light passes: ✓ Keep still until she has settled curled
      assert.ok(s.phase === "patch" && s.curled && s.on && s.herAt[1] === s.at[1] && s.herAt[0] < s.at[0], `the case is reached: in the place, she is curled and on the screen, he is facing her (${JSON.stringify(s)})`);
      const lc = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, c = m.lineCtx(m.lineFor()); return { r: c.r, word: !!c.word, wind: !!(c.wx && c.wx.wind) }; });
      if (lc.wind) assert.ok(lc.r.includes("asleep") && !lc.word, `with the wind on, the line keeps "asleep" and the wind mark shows without its word (#173): ${JSON.stringify(lc)}`);   // the wind word yields first
      const r = await g.region(), im = await g.shot("s31-asleep");
      const w = { x: r.x + Math.round(r.w * WORD[0]), y: r.y + Math.round(r.h * WORD[1]), w: Math.round(r.w * WORD[2]), h: Math.round(r.h * WORD[3]) };
      const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, j = (y * b.w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
      const f = path.join(savesDir, "s31-asleep-word.png");
      if (process.env.PLAYED_WRITE_CROPS) { const c = crop(w); writeFileSync(f, encodePNG(c.width, c.height, c.data)); }
      const ref = decodePNG(readFileSync(f)), c = crop({ x: w.x, y: w.y, w: ref.width, h: ref.height });
      let bad = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) bad++;
      console.log(`# s31 ${tag}: the bar's word differs from the crop of "asleep" by ${bad} of ${ref.width * ref.height} pixels`);
      assert.ok(bad < ref.width * ref.height * 0.02, `the bottom bar's word reads asleep (${bad} pixels differ from its crop)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-25 22:00 UTC, #173 (note mwwo3jv9377657): "what does it mean?" about the arrow at the right of the bottom line. His own save (saves/173.save = bug-assets replay.save), loaded and left as it is.
  // The verdict is the pixels: the conditions end of the bottom line (the wind mark AND its word "wind S") against a crop cut once from this shot (saves/s32-wind-line.png; PLAYED_WRITE_CROPS=1 rewrites it).
  if (size.w === 412) it(`s32 the wind arrow says what it is (#173): the bottom line's conditions slot shows the mark and its word, whole [${tag}]`, async () => {
    const WIND = frac(560, 1142, 340, 52);   // the right end of the bar, in the 900x1200 frame
    const g = await open(size, "173");
    try {
      await wait(1500);
      assert.equal(await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.S.phase), "patch", "the case is reached: in the place");
      const r = await g.region(), im = await g.shot("s32-wind");
      const w = { x: r.x + Math.round(r.w * WIND[0]), y: r.y + Math.round(r.h * WIND[1]), w: Math.round(r.w * WIND[2]), h: Math.round(r.h * WIND[3]) };
      const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, j = (y * b.w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
      const f = path.join(savesDir, "s32-wind-line.png");
      if (process.env.PLAYED_WRITE_CROPS) { const c = crop(w); writeFileSync(f, encodePNG(c.width, c.height, c.data)); }
      const ref = decodePNG(readFileSync(f)), c = crop({ x: w.x, y: w.y, w: ref.width, h: ref.height });
      let bad = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) bad++;
      console.log(`# s32 ${tag}: the line's conditions end differs from the crop (mark + "wind S") by ${bad} of ${ref.width * ref.height} pixels`);
      assert.ok(bad < ref.width * ref.height * 0.02, `the bottom line shows the wind mark and its word (${bad} pixels differ from its crop)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 11-25 ("ok" to core-loop-walkthrough-1, the slabs; QA verify-live-651; design bus 56ccb3): "with a full hold what was under the slab stays where it lay, takeable once there is room, and the push says the hold is full (the Essence pickup's own line); nothing lost."
  // Arranged saves (seed 1, cell 200, the mat slab; the hero one tile below it, facing it): slab-full-hold has 20 Essence; slab-full-room is that save after the push with the hold emptied (the walk has no press that spends Essence: only End expedition empties it); slab-full-warn has a storm over the place.
  // Played by ✓ only. State only asserts each case is reached (the hold, the phase); the verdict is the message box on the shot.
  const MSGBOX = [0.02, 0.80, 0.96, 0.10];   // the message box, as fractions of the Companion's frame (the game screen's lower part)
  if (size.w === 412) it(`s16 a slab pushed with a full hold (QA verify-live-651 a): the push says the hold is full, the hold stays 20, the Essence under it is not lost [${tag}]`, async () => {
    const g = await open(size, "slab-full-hold");
    try {
      const hold = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { s: m.S.exp.cargo.s, phase: m.S.phase }; });
      assert.deepEqual(await hold(), { s: 20, phase: "patch" }, "the case is reached: in the place with 20 Essence");
      const r = await g.region(), before = await g.shot("s16-before");
      await g.press("confirm", 100, 400);
      const pushed = await g.shot("s16-push");
      assert.equal((await hold()).s, 20, "the case is reached: the hold is still 20 after the push");
      await g.press("confirm", 100, 400);   // ✓ again on the tile the slab left: with the hold full this says the same full line, and takes nothing
      const again = await g.shot("s16-again");
      const shown = changed(before, pushed, r, MSGBOX), same = changed(pushed, again, r, MSGBOX);
      console.log(`# s16 ${tag}: box pixels changed by the push ${shown.n}, between the push line and the full line of the old tile ${same.n} (of ${shown.of})`);
      assert.ok(shown.n > 400, `the push puts a line in the box (${shown.n} pixels changed)`);
      assert.ok(same.n < 30, `the push line is the full line (${same.n} pixels differ from that line said by the old tile)`);
      assert.equal((await hold()).s, 20, "the hold is still 20");
    } finally { await g.ctx.close(); }
  });
  if (size.w === 412) it(`s17 the Essence under a pushed slab is takeable once there is room (QA verify-live-651 a): ✓ on the old tile takes it and the box says so [${tag}]`, async () => {
    const g = await open(size, "slab-full-room");
    try {
      const hold = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { s: m.S.exp.cargo.s, phase: m.S.phase }; });
      assert.deepEqual(await hold(), { s: 0, phase: "patch" }, "the case is reached: in the place with room in the hold");
      const r = await g.region(), before = await g.shot("s17-before");
      await g.press("confirm", 100, 400);
      const took = await g.shot("s17-take");
      assert.equal((await hold()).s, 2, "the case is reached: the hold rose by what was under the slab");
      const shown = changed(before, took, r, MSGBOX);
      console.log(`# s17 ${tag}: box pixels changed by the take ${shown.n} (of ${shown.of})`);
      assert.ok(shown.n > 400, `the take puts its line in the box (${shown.n} pixels changed)`);
      await g.press("confirm", 100, 400);
      assert.equal((await hold()).s, 2, "nothing more lies there: a second ✓ takes nothing");
    } finally { await g.ctx.close(); }
  });
  // OWNER 11-25 (QA verify-live-651 b); design's final word 11-26 (bus fa9c1ce856): a hazard sign is never held: the warning shows at once after the push, the push line waits one action and shows after the next press. Other signs keep the 2 s hold.
  if (size.w === 412) it(`s18 the warning is seen at once (QA verify-live-651 b): the push shows "Lightning strikes here next" with no wait, the push line comes after the next press [${tag}]`, async () => {
    const g = await open(size, "slab-full-warn");
    try {
      const warned = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { phase: m.S.phase, strike: !!m.curLive().strike }; });
      // The verdict compares the box to two stored crops of the box (saves/s18-warn-box.png: "Lightning strikes here next"; saves/s18-push-box.png: the push line), so the other order (push line first, warning after the next press) fails.
      // The rain moves under the text: the same line differs by hundreds of pixels, a different line by tens of thousands.
      const r = await g.region(), before = await g.shot("s18-before");
      const boxOf = (im) => { const x0 = r.x + Math.round(r.w * MSGBOX[0]), y0 = r.y + Math.round(r.h * MSGBOX[1]), w = Math.round(r.w * MSGBOX[2]), h = Math.round(r.h * MSGBOX[3]); const d = new Uint8Array(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * im.width + x0 + x) * 4, j = (y * w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: w, height: h, data: d }; };
      const stored = (name, im) => { const f = path.join(savesDir, name); if (process.env.PLAYED_WRITE_CROPS) { const b = boxOf(im); writeFileSync(f, encodePNG(b.width, b.height, b.data)); } return decodePNG(readFileSync(f)); };
      const differ = (im, ref) => { const b = boxOf(im); let n = 0; for (let i = 0; i < b.data.length; i += 4) if (b.data[i] !== ref.data[i] || b.data[i + 1] !== ref.data[i + 1] || b.data[i + 2] !== ref.data[i + 2]) n++; return n; };
      await g.press("confirm", 100, 250);
      const push = await g.shot("s18-push");
      assert.deepEqual(await warned(), { phase: "patch", strike: true }, "the case is reached: a strike is warned for this place after the push");
      await wait(2400);
      const later = await g.shot("s18-later");
      await g.press("confirm", 100, 400);
      const next = await g.shot("s18-next");
      const warnBox = stored("s18-warn-box.png", later), pushBox = stored("s18-push-box.png", next);
      const a = differ(push, warnBox), a2 = differ(push, pushBox), b = differ(later, warnBox), c = differ(next, pushBox), c2 = differ(next, warnBox);
      console.log(`# s18 ${tag}: box right after the push: from the warning crop ${a}, from the push-line crop ${a2}; 2.4 s later from the warning ${b}; after the next press from the push-line crop ${c}, from the warning crop ${c2}`);
      assert.ok(a < 5000 && a2 > 20000, `right after the push the box shows "Lightning strikes here next" (${a} pixels from that line, ${a2} from the push line)`);
      assert.ok(b < 5000, `the box holds the same warning 2 s later (${b} pixels differ)`);
      assert.ok(c < 5000 && c2 > 20000, `after the next press the box shows the push line (${c} pixels from the push line, ${c2} from the warning)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 11-25 ("didn't we have stone slabs that you could move?"; "ok" to core-loop-walkthrough-1); QA verify-live 0fc2b4e; design bus 0e4483 ("a lasting mark: the glint stays on the tile while anything is left under the slab and goes when it is taken").
  // Arranged saves: slab-mark-hold and slab-mark-room are slab-full-hold and slab-full-room with the place marked explored (S.seen.walked; the glints show only in an explored place, 60% of it seen: the walk here does not reach that). Played by presses: push with the hold full, walk away and back; the old tile glints like every takeable (find-glint-1's pixels within 1.6 s); the hold has room, ✓ takes it, and over the next 1.6 s no glint there.
  // State only asserts the reach (what is left under the slab: > 0, then 0) and gives the old tile's position; the verdict is the pixels of the tile on the shots.
  // The light tints the glint's colours, so the verdict is the blink itself: pixels of the old tile that are warm (find-glint-1 is tan, orange and yellow; the rain is blue, the slab's dashes brown) in some shots of 1.6 s and not warm in others. The glint is on for 400 ms of every 1.6 s. Since PR 688 (#160) the glint stands dim between pulses (alpha 0.4), so fewer pixels read warm only on the pulse: the bar is 40 pixels, not 100.
  const blink = (crops) => { let n = 0; const m = crops[0].length / 4, warm = (c, i) => c[i * 4] > 110 && c[i * 4] - c[i * 4 + 2] > 45; for (let i = 0; i < m; i++) { let on = 0; for (const c of crops) if (warm(c, i)) on++; if (on > 0 && on < crops.length) n++; } return n; };
  const cropOf = (im, b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const p = px(im, b.x + x, b.y + y), j = (y * b.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; } return d; };
  if (size.w === 412) it(`s19 what stays under a pushed slab glints until it is taken (QA verify-live 0fc2b4e) [${tag}]`, async () => {
    const g = await open(size, "slab-mark-hold");
    try {
      const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, p = S.exp.patch, f = m.layout(p.key).feats.find((q) => q.kind === "s" && q.under === "mat"); return { s: S.exp.cargo.s, hx: p.x, hy: p.y, sx: f.x, sy: f.y, left: ((S.cells[p.key] || {})[f.id] || {}).left | 0 }; });
      const r = await g.region(), tile = 48 * r.w / 450;
      await g.press("confirm", 100, 400);   // push with the hold full
      let s = await st();
      assert.ok(s.s === 20 && s.left > 0, `the case is reached: the hold is full and ${s.left} lies under the slab`);
      // walk away from the old tile and back by presses, ending two tiles below it
      for (let i = 0; i < 3; i++) await g.press("down", 100, 250);
      for (let i = 0; i < 12 && (s = await st(), s.hy - s.sy > 2); i++) await g.press("up", 100, 250);
      s = await st();
      const hero = async (im) => blobs(im, { x: r.x, y: r.y + Math.round(r.h * 0.06), w: r.w, h: Math.round(r.h * 0.88) }, HERO)[0];
      const probe = async (name) => {   // the glint pixels in the old tile's box over 1.6 s (shots every ~150 ms)
        const crops = [];
        for (let i = 0; i < 11; i++) { const im = await g.shot(name + "-" + i), h = await hero(im); assert.ok(h && h.n > 100, "the hero is on the shot");
          const cx = h.box.x + h.box.w / 2 + (s.sx - s.hx) * tile, cy = h.box.y + h.box.h / 2 + (s.sy - s.hy) * tile, bx = { x: Math.round(cx - tile / 2), y: Math.round(cy - tile / 2), w: Math.round(tile), h: Math.round(tile) };
          crops.push(cropOf(im, bx)); await wait(150); }
        return blink(crops);
      };
      assert.ok(s.hy - s.sy === 2 && s.hx === s.sx, `the case is reached: the hero stands two tiles below the old tile (${JSON.stringify(s)})`);
      const on = await probe("s19-glint");
      console.log(`# s19 ${tag}: glint pixels on the old tile over 1.6 s, with ${s.left} left under it: ${on}`);
      assert.ok(on >= 40, `the old tile glints while something lies under the slab (${on} pixels of find-glint-1)`);
    } finally { await g.ctx.close(); }
  });
  if (size.w === 412) it(`s20 taking what lay under the slab takes the glint away (QA verify-live 0fc2b4e) [${tag}]`, async () => {
    const g = await open(size, "slab-mark-room");   // the slab already pushed, the hold empty, the hero beside the old tile
    try {
      const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, p = S.exp.patch, f = m.layout(p.key).feats.find((q) => q.kind === "s" && q.under === "mat"); return { s: S.exp.cargo.s, hx: p.x, hy: p.y, sx: f.x, sy: f.y, left: ((S.cells[p.key] || {})[f.id] || {}).left | 0 }; });
      const r = await g.region(), tile = 48 * r.w / 450;
      for (let i = 0; i < 3; i++) await g.press("down", 100, 250);
      for (let i = 0; i < 3; i++) await g.press("up", 100, 250);   // walk down and back: the Call and the walk explore the place, the hero is beside the old tile again
      let s = await st();
      assert.ok(s.s === 0 && s.left > 0, `the case is reached: room in the hold and ${s.left} under the slab`);
      const probe = async (name) => {
        const crops = [];
        for (let i = 0; i < 11; i++) { const im = await g.shot(name + "-" + i), h = blobs(im, { x: r.x, y: r.y + Math.round(r.h * 0.06), w: r.w, h: Math.round(r.h * 0.88) }, HERO)[0]; assert.ok(h && h.n > 100, "the hero is on the shot");
          const cx = h.box.x + h.box.w / 2 + (s.sx - s.hx) * tile, cy = h.box.y + h.box.h / 2 + (s.sy - s.hy) * tile, bx = { x: Math.round(cx - tile / 2), y: Math.round(cy - tile / 2), w: Math.round(tile), h: Math.round(tile) };
          crops.push(cropOf(im, bx)); await wait(150); }
        return blink(crops);
      };
      const on = await probe("s20-before");
      await g.press("confirm", 100, 400);   // ✓ takes it
      const after = await st();
      assert.ok(after.s > 0 && after.left === 0, `the case is reached: the hold rose and nothing lies under the slab (${JSON.stringify(after)})`);
      s = after;
      const off = await probe("s20-after");
      console.log(`# s20 ${tag}: glint pixels on the old tile over 1.6 s: before the take ${on}, after ${off}`);
      assert.ok(on >= 40, `the old tile glints before the take (${on} pixels)`);
      assert.ok(off < 20, `no glint on the old tile over 1.6 s after the take (${off} pixels)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-24 12:1x (via the lead): "stop breaking things or telling me that you fixed or shipped something just to find at the first interaction that the game is still utterly broken." QA verify-live-664 case D: after taking the pushed slab's Essence, the lightning-warning card threw "Cannot read properties of null (reading 'x')" (PIC.warn drew the place picture with no place under him).
  // Played on QA's room.save (= slab-mark-room) as QA's D: down x3, up x3, ✓ takes the Essence, then ← and ✓ as QA pressed them; every press waits for its effect. The page's own console errors are the reach: none across the steps.
  // The verdict on the screen: any shot in which the warning card is up shows its picture slot as the outline form (the Probe's flat grass in a yellow outline); that slot against a crop of it (saves/s32-warn-card-outline.png). PLAYED_WRITE_CROPS=1 rewrites the crop.
  if (size.w === 412) it(`s32 the warned tile's card has no place picture while he is not in a place (QA verify-live-664 D): no page error after the take, the card shows the outline form [${tag}]`, async () => {
    const g = await open(size, "slab-mark-room");
    const errs = [];
    g.page.on("pageerror", (e) => errs.push(e.message)); g.page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push("console: " + m.text()); });   // a missing file on the test server is no script error
    try {
      const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, p = S.exp && S.exp.patch; return [S.phase, p && p.key, p && p.x, p && p.y, S.exp && S.exp.cargo && S.exp.cargo.s, S.ui && S.ui.menuSel, S.ui && S.ui.menu, S.ui && S.ui.mapFull, m.FX.msg].join("|"); });
      const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } return now; };   // the effect: the state changes, then holds still for 400 ms
      const r = await g.region(), k = r.w / 450;
      const card = (im) => {   // the picture slot of the warning card: the 32x32 yellow outline, found by its colour in the lower part of the screen and the top
        const Y = ([a, b, c]) => a > 200 && b > 195 && c < 130 && a - c > 100;
        const hits = blobs(im, r, Y).filter((q) => Math.abs(q.box.w - 32 * k) < 4 && Math.abs(q.box.h - 32 * k) < 4);
        return hits[0] ? hits[0].box : null;
      };
      const crop = (im, b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, j = (y * b.w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
      const log = [];
      const seen = [];   // the warning card's slot on each shot where it is up
      const look = async (what) => { const im = await g.shot("s32-" + what), b = card(im), w = await g.where(); log.push(`${what}: ${await sig()} card=${b ? JSON.stringify(b) : "none"}`); if (b) seen.push({ what, im, b, inPlace: !!w.key }); };
      for (let i = 0; i < 3; i++) await step("down");
      for (let i = 0; i < 3; i++) await step("up");
      assert.equal((await g.where()).phase, "patch", "the case is reached: in the place");
      await look("before-take");
      await step("confirm");   // ✓ takes the Essence; the strike is warned
      await look("after-take"); await wait(3000); await look("after-3s");
      await step("back"); await look("after-menu");
      await step("confirm"); await look("after-map");
      await step("back"); await look("after-back");
      console.log("# s32 " + tag + "\n#   " + log.join("\n#   "));
      assert.deepEqual(errs, [], "no page error in the console across the steps");
      assert.ok(seen.length > 0, "the case is reached: the warning card is on the screen in some step");
      const outsidePlace = seen.filter((s) => !s.inPlace);   // the shots taken while he is in no place: the card there must be the outline form
      const f = path.join(savesDir, "s32-warn-card-outline.png");
      if (process.env.PLAYED_WRITE_CROPS && outsidePlace[0]) { const c = crop(outsidePlace[0].im, outsidePlace[0].b); writeFileSync(f, encodePNG(c.width, c.height, c.data)); }
      assert.ok(outsidePlace.length > 0, "the case is reached: the card is up in a step where he is in no place (the throwing case)");
      const ref = decodePNG(readFileSync(f));
      for (const s of outsidePlace) { const c = crop(s.im, { x: s.b.x, y: s.b.y, w: ref.width, h: ref.height }); let n = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) n++;
        console.log(`# s32 ${tag}: ${s.what}: the card's slot differs from the outline crop by ${n} of ${ref.width * ref.height}`);
        assert.ok(n < ref.width * ref.height * 0.1, `${s.what}: the card shows the outline form (${n} pixels differ from its crop)`); }
    } finally { await g.ctx.close(); }
  });

  // QA verify-live-154 (bus e96853af12), his #166 save: "the menu box can still COVER the hero: 412x915-B-left-edge has him on the rock at x~410 of the view, B-left-menu puts the box on the right half over him, so he reads as gone. The box should take the side he is not on." (menu-side-hero-1)
  // QA's walk by presses (runB.mjs): up, right, down, left, each until he stops; then ← opens the menu. State only asserts the case is reached (the place, the pawn on the view in the 192-258 band); the verdict is the shot: the hero's orange pixels whole, as many as before the menu, on the same spot.
  if (size.w === 412) it(`s19 the menu box beside the hero (QA verify-live-154, his #166 save, the left edge of the rock field): ← opens the menu and his pixels are whole on the screen, not under the box [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const at = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, p = m.RT.plScr; return { phase: m.S.phase, key: P && P.key, x: P && P.x, y: P && P.y, px: p && p.x, py: p && p.y }; });
      // PLACE_REV 5 made the place again and his #166 save loads at the top of it (the rock field's old left edge is not there): by presses (down, left or right; ✓ for the day's cards) to col 20 row 8, where he stands mid-view and the box would cover him
      const card = () => g.page.evaluate(() => !!window.__play.frames.companion.contentWindow.__mb.FX.card);
      for (let i = 0; i < 80; i++) {
        const s = await at(); if (s.x === 20 && s.y === 8) break;
        for (let k = 0; k < 4 && await card(); k++) await g.press("confirm", 100, 700);
        await g.press(s.x < 20 ? "right" : s.x > 20 ? "left" : s.y < 8 ? "down" : "up", 100, 450);
      }
      const spot = await at();
      console.log(`# s19 ${tag}: he stands at ${JSON.stringify(spot)}`);
      assert.equal(spot.phase, "patch", "the case is reached: he is walking the place");
      assert.ok(spot.px >= 192 && spot.px <= 258, `the case is reached: the pawn stands at x ${spot.px} of the view, in the 192-258 band`);
      const r = await g.region(), base = await g.shot(`s19-${tag}-edge`);
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) };
      const hero = blobs(base, field, HERO)[0];
      assert.ok(hero && hero.n > 300, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
      const pad = 6, hb = { x: hero.box.x - pad, y: hero.box.y - pad, w: hero.box.w + 2 * pad, h: hero.box.h + 2 * pad };
      await g.press("back");                                // ← opens the menu
      const open1 = await at();
      assert.equal(open1.phase, "menu", "the case is reached: the menu is open");
      // the view shifts sideways while the menu is open (bus 5eabf248f7): the window follows his pawn, as in s19b
      const k = r.w / 450, mw = { x: Math.round(r.x + (open1.px - 28) * k), y: Math.round(r.y + (open1.py - 28) * k), w: Math.round(56 * k), h: Math.round(56 * k) };
      const menu = blobs(await g.shot(`s19-${tag}-menu`), mw, HERO)[0] || { n: 0, box: null };
      console.log(`# s19 ${tag}: hero ${hero.n} px before the menu, ${menu.n} with it open`);
      assert.ok(menu.n >= hero.n * 0.95, `the hero's pixels are whole with the menu open, the box is not over him (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.box && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange at his place is his whole figure (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #156 (11-24 15:5x): "you should be able to select it and see it log if there's anything." QA's case: a habit's beat line and ✓ Keep still only for a Loika on the walk screen (PR 652).
  // Seed 42's dusk save, played twice with the d-pad only. Near: he stands 3 tiles from her curled at her bed (light 549): the bottom bar reads ✓ Keep still. Far: he walked off up the place so she is off the screen: the bar reads something else.
  // State only asserts each case is reached; the verdict is the bar's label pixels: the far label is not the near one, and the near label is the same one a step later.
  if (size.w === 412) it(`s10 Keep still only on screen (#156, seed 42 at dusk): 3 tiles from her curled at her bed the bottom bar offers Keep still; off the screen it does not [${tag}]`, async () => {
    const LABEL = [0.06, 0.955, 0.18, 0.035];
    let herId = 0;
    const st = (g) => g.page.evaluate((id) => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, cs = m.curLive().cr.filter((q) => q.sp === 0 && q.ind), c = id ? cs.find((q) => q.id === id) : cs.sort((a, b) => Math.max(Math.abs(a.x - P.x), Math.abs(a.y - P.y)) - Math.max(Math.abs(b.x - P.x), Math.abs(b.y - P.y)))[0]; return { at: [P.x, P.y], herAt: c && [c.x, c.y], spent: m.S.day.spent, atBed: !!c && m.atBedNow(c), curled: !!c && m.sleeperOf(c), on: !!c && m.onScreen(c.x, c.y), id: c && c.id }; }, herId);
    let near1, near2, far, r;
    const a = await open(size, "sleep-dusk-42");
    try {
      let s = await st(a); herId = s.id;                  // the Loika beside him at the start: her bed is 3 tiles left of him
      for (let i = 0; i < 40 && s.spent < 549; i++) { await a.press(i % 2 ? "left" : "right", 100, 450); s = await st(a); }
      assert.ok(s.curled && s.atBed && s.on && s.spent < 552, `the case is reached: she is curled at her bed, on the screen, light under 552 (${JSON.stringify(s)})`);
      r = await a.region(); near1 = await a.shot("s10-near-1");
      await wait(600); s = await st(a);                   // a moment later: the same case
      assert.ok(s.curled && s.on, `the case is reached: still curled and on the screen a moment later (${JSON.stringify(s)})`);
      near2 = await a.shot("s10-near-2");
    } finally { await a.ctx.close(); }
    const b = await open(size, "sleep-dusk-42");
    try {
      let s = await st(b);
      for (let i = 0; i < 14 && s.on; i++) { const was = s.at.join(); await b.press("up", 100, 450); s = await st(b); if (s.at.join() === was) { await b.press(i % 2 ? "left" : "right", 100, 450); s = await st(b); } }   // walk up, away from her bed (sidestep when a bush blocks)
      for (let i = 0; i < 40 && (s.spent < 549 || (s.on && s.spent < 551)); i++) { const was = s.at.join(); await b.press(s.on ? "up" : i % 2 ? "left" : "right", 100, 450); s = await st(b); if (s.on && s.at.join() === was) { await b.press(i % 2 ? "left" : "right", 100, 450); s = await st(b); } }   // keep away from her until her bedtime
      assert.ok(s.curled && s.atBed && !s.on && s.spent >= 549 && s.spent < 552, `the case is reached: she is curled at her bed, off the screen, light under 552 (${JSON.stringify(s)})`);
      far = await b.shot("s10-far");
    } finally { await b.ctx.close(); }
    const same = changed(near1, near2, r, LABEL), diff = changed(near1, far, r, LABEL);
    console.log(`# s10 ${tag}: label pixels changed near to a moment later ${same.n}, near to far ${diff.n} (of ${same.of})`);
    assert.ok(same.n < 40, `the bar reads the same Keep still a moment later (${same.n} label pixels changed)`);
    assert.ok(diff.n > 150, `off the screen the bar's label is not Keep still (${diff.n} label pixels differ from the near bar's)`);
  });

  it(`s6 a named Loika's page (his newest save #172, end-of-walk Case): ← reaches the Log and ✓ opens her page; the Case's bottom line shows it [${tag}]`, async () => {
    const g = await open(size, "172");
    try {
      const phase = async () => (await g.where()).phase;
      assert.equal(await phase(), "cargo", "the case is reached: the end-of-walk Case");
      await g.shot(`s6-${tag}-1-case`);              // read by eye: the bottom line names ◀ Log, her pages
      for (let i = 0; i < 6 && await phase() !== "log"; i++) await g.press("left");
      assert.equal(await phase(), "log", "← from the Case reaches the Log");
      await g.shot(`s6-${tag}-2-log`);
      await g.press("confirm");
      assert.equal(await phase(), "her", "✓ on the marked entry opens her page");
      await g.shot(`s6-${tag}-3-her`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #156 (11-24): "you should be able to select it and see it log if there's anything." QA verify-live-639, his #145 save: Hazel (met, her kind not known yet) stands in sight; ← then offers her page as the first row.
  it(`s7 Hazel's page (#156, his save #145): d-pad left x7 then ←, the menu's first row is Hazel's page and ✓ opens it [${tag}]`, async () => {
    const g = await open(size, "145");
    try {
      assert.equal((await g.where()).phase, "patch", "the case is reached: he is walking the patch");
      for (let i = 0; i < 7; i++) await g.press("left", 100, 500);
      const top = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, t = m.targetLine(); return { text: t && t.text, dir: t && t.dir, sight: m.herInSight() }; });
      assert.ok(top.text && top.text.startsWith("Juniper") && top.dir === "e" && top.sight !== null, `the case is reached: the top line is the goal's, Juniper · last seen east, while Hazel stands in sight (${JSON.stringify(top)})`);
      await g.shot(`s7-${tag}-0-top`);                      // read by eye: top line 'Juniper · last seen east'
      await g.press("back");                                // ← opens the menu
      const row = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, it = m.menuItems()[0]; return { phase: m.S.phase, label: it && it.label, sel: m.S.ui.menuSel }; });
      const first = await row();
      assert.deepEqual([first.phase, first.label, first.sel], ["menu", "Hazel · her page", 0], "the case is reached: the menu's first row reads Hazel · her page, selected");
      const r = await g.region(), menu = await g.shot(`s7-${tag}-1-menu`);
      await g.press("confirm", 100, 1500);                  // ✓ on the first row
      const page = await g.shot(`s7-${tag}-2-her`);
      assert.equal((await g.where()).phase, "her", "the case is reached: ✓ left the menu for a page");
      assert.ok(changed(menu, page, r).frac > 0.3, `✓ opened her page: the screen is a different one (${changed(menu, page, r).frac.toFixed(2)} of it moved)`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #147 (11-24, note mwv210fs19ae9d): 'What does it mean "Sorrell - Meadow - W"?' His replay.save: the goal band reads words with the full direction ('last seen west, in the meadow'), whole.
  it(`s32 the target line reads as words (#147, his save): 'last seen <full direction>', whole in the goal band [${tag}]`, async () => {
    // the verdict is the pixels: the band's text box on the screenshot against the words drawn on a bare canvas (the game's own glyphs), and nothing drawn past the box's right end
    // The reference is a crop of the band's line (saves/s32-target-words.png), cut once from the 412 shot of his 147.save (PLAYED_WRITE_CROPS=1 rewrites it), one pixel per game pixel (sampled at its centre), so it matches the band at every size.
    const BOX = { x: 28, y: 36 + 4, w: 450 - 28 - 8 - 9 - 4, h: 16 };   // the band's text box in game pixels: words at x 28, 4 below the view top (HUD 32), the width the game clips to
    const cropFile = path.join(savesDir, "s32-target-words.png");
    const judge = async (g, name, cut) => {
      const im = await g.shot(name), r = await g.region(), kx = r.w / 450, ky = r.h / 600;
      const at = (lx, ly) => px(im, Math.round(r.x + (lx + 0.5) * kx), Math.round(r.y + (ly + 0.5) * ky));
      const isBone = (p) => p[0] > 150 && p[1] > 150 && p[2] > 130 && p[0] - p[2] < 90;   // the band's bone-coloured text on its dark ground
      if (cut && process.env.PLAYED_WRITE_CROPS) { const d = new Uint8Array(BOX.w * BOX.h * 4); for (let y = 0; y < BOX.h; y++) for (let x = 0; x < BOX.w; x++) { const p = at(BOX.x + x, BOX.y + y), j = (y * BOX.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; } writeFileSync(cropFile, encodePNG(BOX.w, BOX.h, d)); }
      const ref = decodePNG(readFileSync(cropFile)), refAt = (x, y) => { const i = (y * ref.width + x) * 4; return [ref.data[i], ref.data[i + 1], ref.data[i + 2]]; };
      let wrong = 0, lit = 0;
      for (let y = 0; y < BOX.h; y++) for (let x = 0; x < BOX.w; x++) { const want = isBone(refAt(x, y)); if (want) lit++; if (isBone(at(BOX.x + x, BOX.y + y)) !== want) wrong++; }
      let past = 0;   // bone pixels in the band's text rows from the box's right end to the arrow's column: the clip zone
      for (let y = 0; y < BOX.h; y++) for (let x = BOX.x + BOX.w; x < 450 - 17; x++) if (isBone(at(x, BOX.y + y))) past++;
      assert.ok(lit > 100, `the crop holds the words (${lit} pixels)`);
      assert.ok(wrong <= lit * 0.02, `the band's line is "${EXPECT_147}" on the screen, as in the crop (${wrong} of ${lit} differ)`);
      assert.equal(past, 0, `the line's right end is clear of the band's edge: nothing drawn past the text box (${past} pixels)`);
    };
    const g = await open(size, "147");
    try {
      const top = await g.page.evaluate(() => { const t = window.__play.frames.companion.contentWindow.__mb.targetLine(); return t && t.text; });
      assert.ok(top, "the case is reached: the target line shows on his save");   // state says only that the case is reached
      await judge(g, `s32-${tag}-0-band`, size.w === 412);
    } finally { await g.ctx.close(); }
    if (size.w !== 412) return;
    const g2 = await open({ w: 390, h: 844, dpr: 3 }, "147");   // the second size of the stills
    try { await judge(g2, "s32-390x844-0-band"); } finally { await g2.ctx.close(); }
  });

  // OWNER #156 (11-24), his own save (note mwv7x4xtaf3d27): Drizzle stands beside him; ← then offers her page as the first row, and ✓ opens it.
  it(`s8 Drizzle's page (#156, his own save): ← at once, the menu's first row is Drizzle's page and ✓ opens it [${tag}]`, async () => {
    const g = await open(size, "156");
    try {
      assert.equal((await g.where()).phase, "patch", "the case is reached: he is walking the patch");
      await g.press("back");                                // ← opens the menu
      const row = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, it = m.menuItems()[0]; return { phase: m.S.phase, label: it && it.label, sel: m.S.ui.menuSel }; });
      const first = await row();
      assert.deepEqual([first.phase, first.label, first.sel], ["menu", "Drizzle · her page", 0], "the case is reached: the menu's first row reads Drizzle · her page, selected");
      const r = await g.region(), menu = await g.shot(`s8-${tag}-1-menu`);
      await g.press("confirm", 100, 1500);                  // ✓ on the first row
      const page = await g.shot(`s8-${tag}-2-her`);
      assert.equal((await g.where()).phase, "her", "the case is reached: ✓ left the menu for a page");
      assert.ok(changed(menu, page, r).frac > 0.3, `✓ opened her page: the screen is a different one (${changed(menu, page, r).frac.toFixed(2)} of it moved)`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #177 (11-26 15:05): "the screen reads "<- her page", however that action was already removed." His #156 save: Drizzle stands in sight, named. The bottom line's ← word is Leave, the same word as
  // where no Loika is named (Hazel, saves/145, unnamed, in sight); ← then opens the menu and its first row is her page. State only asserts the reach; the verdict is the ← word's pixels on the screen.
  it(`s14 the ← word with a named Loika in sight (#177, his #156 save): the bottom line's ← word is the Leave word, not her page; ← opens the menu, its first row reads Drizzle · her page [${tag}]`, async () => {
    const FOG = ([R, G, B]) => Math.abs(R - 198) < 24 && Math.abs(G - 196) < 24 && Math.abs(B - 216) < 24 && B > R + 8;   // the line's ← and its word
    const back = (im, r) => {   // the ← with its word: the first run of fog columns in the line (the ✓ label is another colour); its pixels as rows of 0/1
      const u = r.w / 450, y0 = r.y + Math.round(r.h * 0.94), y1 = r.y + r.h, x1 = r.x + Math.round(r.w * 0.8);
      const cols = []; for (let x = r.x; x < x1; x++) { let on = false; for (let y = y0; y < y1 && !on; y++) on = FOG(px(im, x, y)); if (on) cols.push(x); }
      assert.ok(cols.length, "the ← and its word are on the bottom line");
      let end = 0; while (end + 1 < cols.length && cols[end + 1] - cols[end] <= 4 * u) end++;
      // sampled once per game pixel, at its centre: the page is scaled by a fraction, so the same word drawn at another x lands on other device pixels
      const rows = [], gw = Math.round((cols[end] - cols[0] + 1) / u), gh = Math.round((y1 - y0) / u);
      for (let gy = 0; gy < gh; gy++) { let s = ""; for (let gx = 0; gx < gw; gx++) s += FOG(px(im, Math.round(cols[0] + (gx + 0.5) * u), Math.round(y0 + (gy + 0.5) * u))) ? "1" : "0"; rows.push(s); }
      return { w: cols[end] - cols[0] + 1, rows: rows.join("\n") };
    };
    // the reference: where no Loika is named (Hazel, met, unnamed, in sight; 7 presses left) the ← word is Leave
    const ref = await open(size, "145");
    let leave;
    try {
      for (let i = 0; i < 7; i++) await ref.press("left", 100, 500);
      const hz = await ref.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { phase: m.S.phase, sight: m.herInSight(), named: m.herNamed() }; });
      assert.ok(hz.phase === "patch" && hz.sight !== null, `the case is reached: Hazel stands in sight (${JSON.stringify(hz)})`);
      leave = back(await ref.shot(`s14-${tag}-0-leave`), await ref.region());
    } finally { await ref.ctx.close(); }
    const g = await open(size, "156");
    try {
      assert.equal((await g.where()).phase, "patch", "the case is reached: he is walking the patch");
      const named = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, id = m.herInSight(); return id != null && !!m.S.named[id]; });
      assert.ok(named, "the case is reached: Drizzle is in sight and named");
      const word = back(await g.shot(`s14-${tag}-1-line`), await g.region());
      console.log(`# s14 ${tag}: ← word ${word.w} px wide with Drizzle named, ${leave.w} px wide as Leave`);
      assert.ok(leave.w > 20, `the reference is a word (${leave.w} px wide)`);
      assert.equal(word.rows, leave.rows, "the bottom line's ← word is the Leave word, pixel for pixel, not her page");
      await g.press("back");                                // ← opens the menu
      const first = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, it = m.menuItems()[0]; return { phase: m.S.phase, label: it && it.label }; });
      assert.deepEqual([first.phase, first.label], ["menu", "Drizzle · her page"], "the case is reached: the menu's first row reads Drizzle · her page");
    } finally { await g.ctx.close(); }
  });

  // OWNER 2026-11-25 16:3x: "watching mibis in the wild is fun too, but they don't do much." + the lead's ruling (11-26 23:54): the line names the Loika the tag sits on.
  // wild-life-build-7 (design bus a07f75, build bus a7f085): played on a save PAST the first walk (his #172); the verdict is pixels. State is read only to reach the case (who is named, in sight, acting).
  const TOKEN = (r, t) => { const u = r.w / 450, H = r.h / u; return [(t.x - 22) / 450, (t.y - 4) / H, 44 / 450, 40 / H]; };   // her token: a window of game px about the tag's place (tagW.x, tagW.y), as fractions of the frame
  const readW = (g) => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, her = m.herInSight(); return { phase: m.S.phase, home: !m.FX.teachMsg, her, name: her != null ? m.S.named[her] : null, beats: Object.keys(m.FX.beats || {}), tagW: m.RT.tagW ? { x: m.RT.tagW.x, y: m.RT.tagW.y } : null, unmet: m.curLive().cr.filter((x) => x.sp === 0 && !m.S.named[x.id] && m.onScreen(x.x, x.y)).map((x) => x.id) }; });
  if (size.w === 412) it(`wl5 a wild Loika's act (wild-life-build-5, save 156): the act's line takes the box and her token acts, then the box is as it was [${tag}]`, { todo: "not reached (wild-life-build-7): past the first walk no saved game has a calm named Loika acting (saves 145 and 156: 0 acts in 60 presses; 172 opens on the end-of-walk Case, no patch); needs a save made by presses past the first walk. The pixel verdicts below are written" }, async () => {
    const g = await open(size, "145");
    try {
      const at = await readW(g);
      assert.deepEqual([at.phase, at.home, at.her != null, at.name != null], ["patch", true, true, true], `the case is reached: past the first walk, a named Loika in sight (${JSON.stringify(at)})`);
      const r = await g.region(); let prev = await g.shot(), idle = null, act = null, before = null, state = null; const way = ["down", "down", "down", "left", "left", "up", "up", "up", "right", "right"];
      for (let i = 0; i < 60 && !act; i++) {
        await g.press(way[i % 10], 100, 900);
        const s = await readW(g), im = await g.shot();
        if (s.her != null && s.tagW && s.beats.includes(s.her)) { act = im; before = prev; state = s; } else prev = im;
        if (s.tagW && !idle) idle = { im, t: s.tagW };
      }
      console.log(`# wl5 ${tag}: act ${!!act} state ${JSON.stringify(state)}`);
      assert.ok(act, "the case is reached: a named Loika in sight did an act (FX.beats)");
      await g.shot(`wl5-${tag}-act`);
      const boxAct = changed(before, act, r, MSGBOX), tok = changed(idle.im, act, r, TOKEN(r, state.tagW));
      console.log(`# wl5 ${tag}: box pixels changed at the act ${boxAct.n} (of ${boxAct.of}); token pixels changed from idle ${tok.n} (of ${tok.of})`);
      assert.ok(boxAct.n > 400, `the box at the act differs from the box before it (${boxAct.n} pixels)`);
      await g.page.waitForTimeout(3200);
      const later = await g.shot(`wl5-${tag}-after`), back = changed(before, later, r, MSGBOX);
      console.log(`# wl5 ${tag}: box after the hold, from before the act ${back.n}`);
      assert.ok(back.n < 5000 && back.n < boxAct.n, `after the hold the box matches the one before the act (${back.n} pixels differ, ${boxAct.n} at the act)`);
      assert.ok(tok.n > 50, `her token's frames differ from idle at the act (${tok.n} pixels)`);
    } finally { await g.ctx.close(); }
  });
  // wild-life-build-7: an unmet Loika on screen (state asserts only that she is there): 20 presses; the box never changes from an act and nothing acts on her
  if (size.w === 412) it(`wl6 an unmet Loika on screen (save 145): no act picture on her, no act line in the box [${tag}]`, { todo: "not reached (wild-life-build-7): no saved game shows an unmet Loika on screen (145 and 156 name theirs; 14 has four unmet, all off screen); needs a save made by presses. The pixel verdicts below are written" }, async () => {
    const g = await open(size, "156");
    try {
      const way = ["down", "down", "left", "up", "up", "right"]; let s = await readW(g);
      for (let i = 0; i < 40 && !s.unmet.length; i++) { await g.press(way[i % 6], 100, 700); s = await readW(g); }
      assert.ok(s.unmet.length, `the case is reached: an unmet Loika is on screen (${JSON.stringify(s)})`);
      const r = await g.region(); let base = await g.shot(), worst = 0, beats = 0;
      for (let i = 0; i < 20; i++) {
        await g.press(way[i % 6], 100, 700);
        const t = await readW(g), im = await g.shot();
        beats = Math.max(beats, t.beats.filter((id) => s.unmet.includes(id)).length);
        if (!t.tagW) worst = Math.max(worst, changed(base, im, r, MSGBOX).n);
        base = im;
      }
      console.log(`# wl6 ${tag}: unmet ${JSON.stringify(s.unmet)} acts on them ${beats}, largest box change between presses ${worst}`);
      await g.shot(`wl6-${tag}-unmet`);
      assert.equal(beats, 0, "no act picture on an unmet Loika");
      assert.ok(worst < 400, `the box never changes from an act (${worst} pixels at most between presses)`);
    } finally { await g.ctx.close(); }
  });
  // OWNER 2026-11-24 15:5x on #156: "in the wild you should be able to see the name". QA verify-live-649, seed 14 (saves/14.save, made from a fresh seed-14 game by QA's presses C-01..C-13: ✓ x3 to set out, ← twice, right x3):
  // Burr stands under a tree crown and her bone name tag was clipped to "r" (412x915-C-13-right). The verdict is the tag's pixels on the shot: the bone frame whole, all four sides, with the name inside.
  // water-build-9: with PLACE_REV 5 no seed-14 place has a crown round Burr's haunt, so the seed and place are chosen from the place data (setup, like an arranged save): a scratch read of the gen-7 places (not committed, seeds 14-60)
  // found, on seed 56, the start place 122: wild Loika 69 (Linnet) keeps a haunt at tile 22,17 at dawn with a tree standing on 23,17 beside it. The colour check below is the dawn light's (the old seed-14 save was at light 3), so
  // the case is played at dawn. It plays seed 56 by presses (?seed= via open(size, {seed})): ✓ to set out, right x10, up x6, which stands him on 22,19 of place 122 at light 16 with her tag by the crown. The verdict is the same: the tag whole, a crown round it.
  it(`s12 a wild name tag over a crown (#156, seed 56, place 122): Linnet's bone tag is whole on the screen, a crown never hides part of it [${tag}]`, async () => {
    const g = await open(size, { seed: 56 });
    try {
      const state = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch, her = P ? m.herInSight() : null; return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, her, name: her != null ? S.named[her] : null }; });
      let at = await state();
      for (let i = 0; i < 12 && !at.key; i++) { await g.press("confirm", 100, 1500); at = await state(); }   // ✓ to set out, ✓ into the first place
      for (let t = 0; t < 300 && !at.key; t++) { await wait(100); at = await state(); }
      const where = () => g.page.evaluate(() => { const P = window.__play.frames.companion.contentWindow.__mb.S.exp.patch; return P.key + "," + P.x + "," + P.y; });
      for (const [dir, n] of [["right", 10], ["up", 7]]) for (let i = 0; i < n; i++) {
        const before = await where(); await g.press(dir, 100, 0);
        for (let t = 0; t < 30 && (await where()) === before; t++) await wait(100);   // each press waits for its step to land
        await wait(300);
      }
      await wait(1500); at = await state();
      assert.deepEqual([at.phase, at.key, at.x, at.y, at.her, at.name], ["patch", "122", 22, 18, "69", "Linnet"], `the case is reached: he walks place 101 with Linnet in sight (${JSON.stringify(at)})`);
      const r = await g.region(), im = await g.shot(`s12-${tag}`), u = r.w / 450;   // device px per game px
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: Math.round(r.h * 0.76) };
      // the tag's frame is the one bone-coloured outline in the field about 20 game px high; flowers and stones are other bone blobs and are told apart by their size
      const BONE = ([R, G, B]) => Math.abs(R - 241) < 14 && Math.abs(G - 235) < 14 && Math.abs(B - 223) < 14;
      const blob = blobs(im, field, BONE).find((b) => b.box.h >= 17 * u && b.box.h <= 30 * u && b.box.w >= 24 * u);   // the frame with its 5 game px pointer
      console.log(`# s12 ${tag}: bone blobs ${JSON.stringify(blobs(im, field, BONE).slice(0, 4))}`);
      assert.ok(blob, "the bone frame of a name tag is on the screen");
      // the frame's own rows and columns: those where bone runs nearly the whole way (the pointer is a thin stub, the name's letters are short runs)
      const run = (x, y, w, h) => colour(im, r, BONE, { x, y, w, h }).n;
      const B = blob.box, rows = [], cols = [];
      for (let y = B.y; y < B.y + B.h; y++) if (run(B.x, y, B.w, 1) >= 0.8 * B.w) rows.push(y);
      assert.ok(rows.length >= 2, "the frame has a top and a bottom side on the screen");
      const b = { y: rows[0], h: rows[rows.length - 1] - rows[0] + 1 };
      for (let x = B.x; x < B.x + B.w; x++) if (run(x, b.y, 1, b.h) >= 0.8 * b.h) cols.push(x);
      b.x = cols[0]; b.w = cols[cols.length - 1] - cols[0] + 1;
      const t = Math.max(1, Math.floor(u * 0.8)), side = (x, y, w, h) => { [x, y, w, h] = [x, y, w, h].map(Math.round); return run(x, y, w, h) / (w * h); };
      const sides = { top: side(b.x + 2 * u, b.y, b.w - 4 * u, t), bottom: side(b.x + 2 * u, b.y + b.h - t, b.w - 4 * u, t), left: side(b.x, b.y + 2 * u, t, b.h - 4 * u), right: side(b.x + b.w - t, b.y + 2 * u, t, b.h - 4 * u) };
      console.log(`# s12 ${tag}: tag frame ${JSON.stringify(b)} (${(b.w / u).toFixed(1)} x ${(b.h / u).toFixed(1)} game px), sides ${JSON.stringify(sides)}`);
      assert.ok(b.h >= 17 * u && b.h <= 23 * u && b.w >= 24 * u, `the frame is a whole tag, about 20 game px high (${(b.h / u).toFixed(1)} x ${(b.w / u).toFixed(1)})`);
      for (const [k, v] of Object.entries(sides)) assert.ok(v >= 0.85, `the tag's ${k} side is whole on the screen (${(v * 100).toFixed(0)}% bone)`);
      const inside = { x: b.x + Math.round(2 * u), y: b.y + Math.round(2 * u), w: b.w - Math.round(4 * u), h: b.h - Math.round(4 * u) };
      const ink = colour(im, r, ([R, G, B]) => R < 50 && G < 45 && B < 60, inside).n / (inside.w * inside.h), name = colour(im, r, BONE, inside).n;
      assert.ok(ink >= 0.4 && name >= 30 * u, `the name stands inside the frame on its dark panel (${(ink * 100).toFixed(0)}% dark, ${name} name pixels)`);
      // reached: the tag stands over a tree crown (the crown's light green round it); a tag on open ground would pass without the case
      const CROWN = ([R, G, B]) => Math.abs(R - 139) < 10 && Math.abs(G - 146) < 10 && Math.abs(B - 96) < 10;
      const around = { x: Math.round(b.x - 3 * u), y: Math.round(b.y - 12 * u), w: Math.round(b.w + 6 * u), h: Math.round(b.h + 14 * u) };
      const crown = colour(im, r, CROWN, around).n;
      console.log(`# s12 ${tag}: ${crown} crown pixels round the tag`);
      assert.ok(crown >= 150 * u * u, `the case is reached: the tag stands over a tree crown (${crown} crown pixels round it)`);
    } finally { await g.ctx.close(); }
  });

  // QA verify-live-639, seed 63 (saves/63.save, made from a fresh seed-63 game: ✓ three times, right 8, down 8, the Call twice, ←): Cinder is off screen and the top line names her; no one is in sight, so the menu's first row is her page.
  it(`s9 Cinder's page (seed 63, a fresh game's save): none in sight, the top line names Cinder, the menu's first row is her page and ✓ opens it [${tag}]`, async () => {
    const g = await open(size, "63");
    try {
      assert.equal((await g.where()).phase, "menu", "the case is reached: the save is where QA left it, the menu open (← pressed)");
      const top = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, t = m.targetLine(); return { text: t && t.text, sight: m.herInSight() }; });
      assert.ok(top.text && top.text.startsWith("Cinder") && top.sight === null, `the case is reached: the top line names Cinder, no one is in sight (${JSON.stringify(top)})`);
      const row = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, it = m.menuItems()[0]; return { phase: m.S.phase, label: it && it.label, sel: m.S.ui.menuSel }; });
      const first = await row();
      assert.deepEqual([first.phase, first.label, first.sel], ["menu", "Cinder · her page", 0], "the case is reached: the menu's first row reads Cinder · her page, selected");
      const r = await g.region(), menu = await g.shot(`s9-${tag}-1-menu`);
      await g.press("confirm", 100, 1500);                  // ✓ on the first row
      const page = await g.shot(`s9-${tag}-2-her`);
      assert.equal((await g.where()).phase, "her", "the case is reached: ✓ left the menu for a page");
      assert.ok(changed(menu, page, r).frac > 0.3, `✓ opened her page: the screen is a different one (${changed(menu, page, r).frac.toFixed(2)} of it moved)`);
    } finally { await g.ctx.close(); }
  });

  // OWNER #176 (11-26): "when you leave an active place and go to the overview sector, and enter again the same sector, the hero must be teleported to the last location where it was standing, rather than moved to the spawn point of the place."
  // His replay.save (saves/176.save): patch 178, tile 23,14, facing left. By presses: ← opens the menu, down to Leave this place, ✓ (the map), ✓ (back into 178). The verdict is the screenshot: the hero drawn on the same tile as before the map, facing left.
  it(`s11 back into the place he left (#176, his save, patch 178 tile 23,14): the hero stands on the same tile, facing left; one more place entered lands as today [${tag}]`, async () => {
    const g = await open(size, "176");
    try {
      const at = await g.where();
      assert.deepEqual([at.phase, at.key, at.x, at.y], ["patch", "178", 23, 14], "the case is reached: he stands at the tile of his note, in patch 178");
      const r = await g.region(), base = await g.shot(`s11-${tag}-before`);
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) };
      const hero = blobs(base, field, HERO)[0];
      assert.ok(hero && hero.n > 300, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
      const pad = 6, hb = { x: hero.box.x - pad, y: hero.box.y - pad, w: hero.box.w + 2 * pad, h: hero.box.h + 2 * pad };
      // ← leaves a finished place in one press, and opens the menu in any other (then down to Leave this place, ✓)
      const leave = async () => {
        await g.press("back", 100, 2500);
        if ((await g.where()).phase === "menu") {
          for (let i = 0; i < 10 && await g.menuRow() !== "leave"; i++) await g.press("down");
          assert.equal(await g.menuRow(), "leave", "the case is reached: the selected row is Leave this place");
          await g.press("confirm", 100, 2500);
        }
      };
      await leave();
      assert.equal((await g.where()).phase, "map", "the case is reached: he left 178 for the map");
      await g.press("confirm", 100, 4000);                  // ✓: back down into the same place
      const back = await g.where();
      assert.deepEqual([back.phase, back.key], ["patch", "178"], "the case is reached: he is back in patch 178");
      await wait(2500);                                     // the place's name and the arrival settle
      const im = await g.shot(`s11-${tag}-after`);
      const again = blobs(im, field, HERO)[0];
      assert.ok(again && again.n > 300, `the hero is on the screen after going back (${again ? again.n : 0} pixels)`);
      console.log(`# s11 ${tag}: hero before ${JSON.stringify(hero.box)} ${hero.n} px, after ${JSON.stringify(again.box)} ${again.n} px`);
      assert.ok(Math.abs(again.box.x - hero.box.x) <= 4 && Math.abs(again.box.y - hero.box.y) <= 4, `the hero is drawn on the same tile as before the map (${JSON.stringify(again.box)} vs ${JSON.stringify(hero.box)})`);
      assert.ok(changed(base, im, r, [(hb.x - r.x) / r.w, (hb.y - r.y) / r.h, hb.w / r.w, hb.h / r.h]).frac < 0.15, "and he is drawn as he was, facing left");
      const moved = changed(base, im, r, [0, 0.12, 1, 0.76]).frac;   // the camera follows him: on another tile the whole ground around him is drawn shifted
      console.log(`# s11 ${tag}: ${moved.toFixed(3)} of the field differs from before the map`);
      assert.ok(moved < 0.3, `and the ground around him is the same ground (${moved.toFixed(2)} of the field differs)`);
      // one more place entered lands as today: out again, one cell over on the map, ✓ down into it
      await leave();
      assert.equal((await g.where()).phase, "map", "the case is reached: he left for the map again");
      const pos0 = await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.S.exp.pos);
      let other = null;
      for (const dir of ["right", "left", "down", "up"]) {
        await g.press(dir, 100, 1500);
        other = await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.S.exp.pos);
        if (other !== pos0) break;
      }
      assert.notEqual(other, pos0, "the case is reached: the map cursor is on another place");
      await g.press("confirm", 100, 5000);
      const next = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, e = m.S.exp; return { phase: m.S.phase, key: e.patch && e.patch.key, x: e.patch && e.patch.x, y: e.patch && e.patch.y, spot: e.spot || null }; });
      assert.ok(next.phase === "patch" && next.key !== "178" && next.spot === null, `the case is reached: he is down in another place (${JSON.stringify(next)})`);
      assert.ok(!(next.x === 23 && next.y === 14), `another place is entered at its own way in, not at the tile he left 178 on (${JSON.stringify(next)})`);
    } finally { await g.ctx.close(); }
  });

  // OWNER 2025-10-25 22:19 (his rule): "an expedition is one Probe outing that seals one crate". Save exp-number-7 (seed 7, first expedition, one Energy taken from the stone in the first place, standing at the flag on the map), made by presses.
  // Played: ← opens the menu, End expedition, ✓ (the Cargo preview), ✓ (sealed): the card reads "Expedition 1 ended" with crate E1; ✓ on to the next set-out: its top line reads "Expedition 2" (a camp, not night: the day waits).
  // State only asserts the case is reached (phase, S.report.n, S.day.camps); the verdict is the pixels of those words against a shot of each (saves/exp-number-*.png: the card's line, the crate's label, the top line).
  if (size.w === 412) it(`s15 expedition number (PR 658, seed 7): End expedition reads "Expedition 1 ended" with crate E1, and the next set-out's top line reads "Expedition 2" [${tag}]`, async () => {
    const g = await open(size, "exp-number-7");
    const m = (f) => g.page.evaluate(f);
    const same = (im, name, f) => {
      const r = g.r, ref = decodePNG(readFileSync(path.join(savesDir, name + ".png"))), x0 = r.x + Math.round(r.w * f[0]), y0 = r.y + Math.round(r.h * f[1]), w = Math.round(r.w * f[2]), h = Math.round(r.h * f[3]);
      assert.deepEqual([ref.width, ref.height], [w, h], name + ": the shot of the words is the size of the region");
      let n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = px(im, x0 + x, y0 + y), q = px(ref, x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) n++; }
      return n;
    };
    try {
      assert.equal((await g.where()).phase, "map", "the case is reached: he stands on the map");
      assert.deepEqual(await m(() => { const S = window.__play.frames.companion.contentWindow.__mb.S; return [S.exp.n, S.exp.pos === S.exp.start, S.exp.cargo.e]; }), [1, true, 1], "the case is reached: expedition 1, at the flag, one Energy held");
      await g.press("back", 100, 1500);
      assert.equal(await g.menuRow(), "send", "the case is reached: the menu's selected row is End expedition");
      await g.press("confirm", 100, 1500);                  // the Cargo preview of what End expedition will do
      await g.press("confirm", 100, 3000);                  // seal
      const card = await m(() => { const S = window.__play.frames.companion.contentWindow.__mb.S; return { phase: S.phase, n: S.report && S.report.n, camps: S.day.camps }; });
      assert.deepEqual(card, { phase: "sealed", n: 1, camps: 1 }, "the case is reached: the sealed card of expedition 1, at a camp");
      g.r = await g.region();      const im1 = await g.shot(`s15-${tag}-card`);
      const word1 = same(im1, "exp-number-card-1", F_CARD), crate1 = same(im1, "exp-number-crate-e1", F_CRATE);
      console.log(`# s15 ${tag}: the card's words differ from the shot by ${word1} pixels, the crate's label by ${crate1}`);
      assert.equal(word1, 0, "the card reads Expedition 1 ended");
      assert.equal(crate1, 0, "the crate on the screen is E1");
      await g.press("confirm", 100, 4000);                  // ✓ on to the next set-out
      assert.equal((await g.where()).phase, "setup", "the case is reached: the next set-out (✓ Set out)");
      const im2 = await g.shot(`s15-${tag}-setout`);
      const top2 = same(im2, "exp-number-top-2", F_TOP);
      console.log(`# s15 ${tag}: the top line differs from the shot of "Expedition 2" by ${top2} pixels`);
      assert.equal(top2, 0, "the set-out's top line reads Expedition 2");
    } finally { await g.ctx.close(); }
  });

  // OWNER 2026-11-25 16:3x ("revealing the map is cool to, gets tedious, but it's a good entertainment"), 11-27 13:5x "ok" to the end-tally walkthrough: End expedition counts what he brings home (pods, finds, pages) up from 0 in about 2 s.
  // Save end-tally-172 (his #172 arranged once: at the start, two pods and eight finds in the hold, on the map). Played: ← , End expedition; after the 2 s the Case's bottom panel reads "Brought home" with the hold's counts (a crop of it, refs/end-tally-brought-home-*.png);
  // then in a second game ← , End expedition and one ✓ during the count: the Case stays open (state only asserts the case is reached: the phase).
  if (size.w === 412) it(`end-tally: End expedition shows Brought home with the hold's counts after 2 s, and one ✓ during the count leaves the Case open [${tag}]`, async () => {
    const toCase = async (g) => { await g.press("back", 100, 1500); assert.equal(await g.menuRow(), "send", "the case is reached: the menu's selected row is End expedition"); await g.press("confirm", 100, 300); assert.equal((await g.where()).phase, "cargo", "the case is reached: the Case, End expedition's preview"); };
    const g = await open(size, "end-tally-172");
    try {
      assert.equal((await g.where()).phase, "map", "the case is reached: he stands on the map");
      await toCase(g); await wait(2800);
      const r = await g.region(), im = await g.shot(`end-tally-${tag}-done`);
      const box = { x: r.x + Math.round(r.w * 72 / 900), y: r.y + Math.round(r.h * 824 / 1200), w: Math.round(r.w * 756 / 900), h: Math.round(r.h * 176 / 1200) };
      const rf = againstRef(im, box, `end-tally-brought-home-${tag}`);
      console.log(`# end-tally ${tag}: the panel differs from the crop of Brought home 2 pods 8 finds in ${rf.n} of ${rf.of} pixels`);
      assert.ok(rf.frac < 0.02, `the panel reads Brought home with the hold's counts (${rf.n} of ${rf.of} pixels differ from the crop)`);
    } finally { await g.ctx.close(); }
    const g2 = await open(size, "end-tally-172");
    try {
      await toCase(g2);
      await g2.press("confirm", 100, 300);                  // one ✓ while it counts: skips to the end, does not end the expedition
      assert.equal((await g2.where()).phase, "cargo", "one ✓ during the count leaves the Case open");
    } finally { await g2.ctx.close(); }
  });
}

// OWNER 2026-11-25 06:4x ("ok", design-loop-review-1 fix 9): walking over a place's border cost 10 light and the day bar jumped with nothing to say why. Seed 33, a fresh game, at 390x844.
// Played: ✓ x3 to set out and go in, then the right key along the row to the east edge. One tile short of the edge the bottom line is the place's own; on the edge tile, facing out, it says "10 light to the next place" (editorial's edge.step);
// the step then moves the clock by that much. Every press waits for its effect (state changed, then still for 400 ms), never a fixed pause.
// State only asserts the case is reached and the clock. The verdict on the words is the pixels: a crop of the line (saves/s30-edge-line.png, cut once from the edge shot) is found in the bottom strip on the edge tile and not found one tile short.
// PLAYED_WRITE_CROPS=1 rewrites the crop (the box where the edge shot and the one-tile-short shot differ in the bottom strip).
for (const size of SCALE_SIZES.filter((s) => s.w === 390)) {
  const tag = `${size.w}x${size.h}`;
  it(`s30 an edge on foot says its light first (seed 33): the bottom line names the cost before the step, and the clock moves by it after [${tag}]`, async () => {
    const g = await open(size, { seed: 33 });
    const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; let l = ""; try { const q = m.lineFor(); l = (Array.isArray(q.ctx) ? q.ctx[0] : q.ctx) || ""; } catch {} return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, spent: S.day && S.day.spent, line: String(l).replace(/\x01/g, "") }; });
    const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent, S.ui && S.ui.menuSel].join("|"); });
    const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };   // the effect: the state changes (or 3 s), then holds still for 400 ms
    try {
      let s = await st();
      for (let i = 0; i < 12 && !s.key; i++) { await step("confirm"); s = await st(); }   // ✓ to set out, ✓ into the place: each waits for its effect
      for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }       // the place is built by a worker: wait until he is in it
      assert.equal(s.phase, "patch", "the case is reached: he is in the first place");
      let prev = null, n = 0;
      const key0 = s.key;
      while (n++ < 60 && !s.line.startsWith("10 light")) { prev = s; await step("right"); s = await st(); assert.equal(s.key, key0, "the case is reached: he walks the first place's row to its east edge, no step crosses unsaid"); }
      console.log(`# s30 ${tag}: one tile short ${JSON.stringify(prev)}, on the edge ${JSON.stringify(s)}`);
      assert.equal(s.line, "10 light to the next place", "the case is reached: the line on the edge tile is editorial's edge.step");
      assert.ok(prev && !prev.line.startsWith("10 light"), "and not one tile short of it");
      const r = await g.region(), onEdge = await g.shot(`s30-${tag}-edge`);
      await step("left"); const short = await g.shot(`s30-${tag}-short`); await step("right");
      const at = await st(); assert.equal(at.x, s.x, "the case is reached: back on the edge tile");
      // the strip under the picture where the line is read; its crop is cut once from the edge shot
      const sy0 = r.y + Math.round(r.h * 0.9), sy1 = r.y + r.h, sx0 = r.x, sx1 = r.x + r.w;
      let bb = null;
      for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) { const p = px(onEdge, x, y), q = px(short, x, y); if (p[0] !== q[0] || p[1] !== q[1] || p[2] !== q[2]) bb = bb ? { x0: Math.min(bb.x0, x), y0: Math.min(bb.y0, y), x1: Math.max(bb.x1, x), y1: Math.max(bb.y1, y) } : { x0: x, y0: y, x1: x, y1: y }; }
      assert.ok(bb, "the bottom strip differs between the edge tile and the one before it");
      const cropFile = path.join(savesDir, "s30-edge-line.png");
      if (process.env.PLAYED_WRITE_CROPS) {
        const w = bb.x1 - bb.x0 + 1, h = bb.y1 - bb.y0 + 1, d = new Uint8Array(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = px(onEdge, bb.x0 + x, bb.y0 + y), j = (y * w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
        writeFileSync(cropFile, encodePNG(w, h, d));
      }
      const ref = decodePNG(readFileSync(cropFile));
      // the best match of the crop anywhere in the strip: the fewest differing pixels over all positions (early out past the best)
      const best = (im) => {
        let low = Infinity;
        for (let y = sy0; y + ref.height <= sy1; y++) for (let x = sx0; x + ref.width <= sx1; x++) {
          let bad = 0;
          for (let j = 0; j < ref.height && bad < low; j++) for (let i = 0; i < ref.width; i++) { const p = px(im, x + i, y + j), k = (j * ref.width + i) * 4; if (p[0] !== ref.data[k] || p[1] !== ref.data[k + 1] || p[2] !== ref.data[k + 2]) bad++; }
          if (bad < low) low = bad;
        }
        return low;
      };
      const area = ref.width * ref.height, onBad = best(onEdge), shortBad = best(short);
      console.log(`# s30 ${tag}: the line's crop (${ref.width}x${ref.height}) differs by ${onBad} pixels on the edge tile, by ${shortBad} one tile short, of ${area}`);
      assert.ok(onBad < area * 0.02, "the line's crop is found in the bottom strip on the edge tile");
      assert.ok(shortBad > area * 0.1, "and is not found one tile short of it");
      await step("right");
      const after = await st();
      assert.notEqual(after.key, key0, "the step crossed into the next place");
      assert.equal(after.spent - at.spent, 10, "the day moved by the 10 the line said");
    } finally { await g.ctx.close(); }
  });
}
// OWNER 2026-11-25 00:52 UTC (#165, his shot bug-assets/bugs/mwvepr6i2b15e5/shot-1.png): "go out with the companion??? I'm out!"; build desk bus 004cb7 (rule 16a): a played case on his case.
// His case: the Companion is out in the first place and the Station's goal is a findPod step with no species known. Arranged save 165 (made from his #136 save: no pod and no crate, one mibi, Dot, of a kind the Station has no language frame for: the goal is "pair", its step findPod with no kind to name; his own #165 save, read by the Station, gives "Find a first pod", so it cannot reach the branch).
// Played: only the open (the Companion tab pressed, as a player would). State only asserts the case is reached (the phase, the Companion out in a place, not docked: open() asserts the rest).
// The verdict is the pixels: the Companion's header band against a crop of the words "Find a pod" (saves/s32-find-a-pod.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it); "Go out with the Companion" is a different crop and is not what is found.
it(`s32 the Companion header out on a findPod step with no species (#165, arranged save 165): the header reads "Find a pod" [412x915]`, async () => {
  const size = SCALE_SIZES[0];
  const g = await open(size, "165");
  try {
    const s = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { phase: m.S.phase, out: !!(m.S.exp && m.S.exp.patch), docked: window.__play.caddy.docked, heard: JSON.stringify(m.RT.caddy) }; });
    console.log("# s32 dock state " + JSON.stringify(s));
    assert.ok(s.phase === "patch" && s.out && !s.docked, `the case is reached: the Companion is out in a place (${JSON.stringify(s)})`);
    assert.ok(/"step":"findPod"/.test(s.heard), `the case is reached: the Station's goal is a findPod step (${s.heard})`);
    const r = await g.region(), im = await g.shot("s32-header");
    const band = { x: r.x, y: r.y + Math.round(r.h * 64 / 1200), w: r.w, h: Math.round(r.h * 48 / 1200) };   // the goal band, under the top bar: 24 of the screen's 600 rows
    const f = path.join(savesDir, "s32-find-a-pod.png");
    if (process.env.PLAYED_WRITE_CROPS) {   // the words: the box of pixels that differ from the band's own ground, right of the mark's slot
      const bg = px(im, band.x + 2, band.y + 4); let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = band.y + 2; y < band.y + band.h - 4; y++) for (let x = band.x + Math.round(band.w * 0.05); x < band.x + band.w; x++) { const p = px(im, x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } }
      const w = x1 - x0 + 1, h = y1 - y0 + 1, d = new Uint8Array(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = px(im, x0 + x, y0 + y), j = (y * w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
      writeFileSync(f, encodePNG(w, h, d));
    }
    const ref = decodePNG(readFileSync(f));
    let low = Infinity;   // the best match of the crop anywhere in the band: the fewest differing pixels over all positions (early out past the best)
    for (let y = band.y; y + ref.height <= band.y + band.h; y++) for (let x = band.x; x + ref.width <= band.x + band.w; x++) {
      let bad = 0;
      for (let j = 0; j < ref.height && bad < low; j++) for (let i = 0; i < ref.width; i++) { const p = px(im, x + i, y + j), k = (j * ref.width + i) * 4; if (p[0] !== ref.data[k] || p[1] !== ref.data[k + 1] || p[2] !== ref.data[k + 2]) bad++; }
      if (bad < low) low = bad;
    }
    console.log(`# s32 ${size.w}x${size.h}: the header band differs from the crop of "Find a pod" (${ref.width}x${ref.height}) by ${low} pixels`);
    assert.ok(low < ref.width * ref.height * 0.02, `the Companion's header reads "Find a pod" (${low} of ${ref.width * ref.height} pixels differ from its crop)`);
  } finally { await g.ctx.close(); }
});
// OWNER 2026-11-25 06:4x (design-loop-review-1, fix 5): "ok". tell-seen-fix-4. Seed 33 at 390x844, light 52 to 57: Osier's tell and shake-dry ran seven tiles away under the veil while the box kept the stone's line.
// The rule (design 11-27): the veil lifts when, within ten tiles, a Loika he has met (S.named) starts her tell; her line is then the box's line.
// Played as the review's game A, on a fresh seed 33 (the page's ?seed=): ✓ to set out, east across the first place and over the border, toward her until she is seen once (named), then ✓ "Keep still" until her tell starts.
// Every press waits for its effect (state changed, or 3 s) before the next, never a fixed pause.
// State only asserts the case is reached (she is named, her tile was veiled before, the top line names her, her tell has started, she is within ten tiles). The verdict is the pixels: her tile against a crop of her tile (saves/s21-tell-tile.png)
// and the box against a crop of her tell line (saves/s21-tell-box.png); the stone's line is a different crop. PLAYED_WRITE_CROPS=1 rewrites the crops.
it(`s21 tell-seen-fix-4 (seed 33): Osier's tell starts within ten tiles of him: her tile is not veiled and the box shows her line, not the stone's [390x844]`, async () => {
  const size = { w: 390, h: 844, dpr: 3 };
  const g = await open(size, { seed: 33 });
  const MSGBOX = [0.02, 0.80, 0.96, 0.10];
  const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; const c = P && m.curLive().cr.find(q => q.ind && q.ind.name === "Osier"); let t = null; try { t = m.targetLine(); } catch {} return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, hb: !!(c && c.hb), named: !!(c && S.named && S.named[c.id]), open: !!(c && P && S.seen.tile && S.seen.tile[P.key] && (Number(S.seen.tile[P.key][c.y]) & (1 << c.x)) !== 0), top: !!(t && c && String(t.id) === String(c.id)), dx: c && P ? c.x - P.x : null, dy: c && P ? c.y - P.y : null, ts: m.RT.ts, pl: m.RT.plScr }; });
  try {
    const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent, S.ui && S.ui.menuSel].join("|"); });
    const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };   // the effect: the state changes, then holds still for 400 ms (a press during a screen's change is swallowed)
    let s = await st(), im = null;
    for (let i = 0; i < 12 && !s.key; i++) { await step("confirm"); s = await st(); }   // ✓ to set out, ✓ at "Start here", ✓ into the place: each waits for its effect
    for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }       // the place is built by a worker: wait until he is in it
    assert.ok(s.key, `set out: he is in the first place (${JSON.stringify(s)})`);
    // the route that names her at first sight (east x24, up x12, right x12, down x12), stopping the moment she is named; she is never walked up to
    for (const [d, n] of [["right", 24], ["up", 12], ["right", 12], ["down", 12]]) for (let i = 0; i < n && !s.named; i++) { await step(d); s = await st(); }
    assert.ok(s.named && !s.hb, `she is seen first: Osier is named, her tell not yet started (${JSON.stringify(s)})`);
    let before = s;   // the last state before her tell: her tile is still veiled
    for (let i = 0; i < 120 && !s.hb; i++) { before = s; await step("confirm"); s = await st(); }   // ✓ "Keep still", as the review did
    im = await g.shot("s21-tell");
    assert.ok(!before.open && s.open, `her tile was veiled before her tell and is open when it starts (${JSON.stringify([before, s])})`);
    assert.ok(s.named && s.top, `the case is reached: Osier is named and the top line points to her (${JSON.stringify(s)})`);
    assert.ok(s.hb, `the case is reached: her tell has started (${JSON.stringify(s)})`);
    assert.ok(Math.max(Math.abs(s.dx), Math.abs(s.dy)) <= 10, `the case is reached: she is within ten tiles (${JSON.stringify(s)})`);
    const r = await g.region(), k = r.w / 450, ts = s.ts;
    const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, j = (y * b.w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
    const box = { x: r.x + Math.round(r.w * MSGBOX[0]), y: r.y + Math.round(r.h * MSGBOX[1]), w: Math.round(r.w * MSGBOX[2]), h: Math.round(r.h * MSGBOX[3]) };
    // she herself stands 6 tiles east, past the screen's right edge (the view is 9 tiles wide): the verdict tile is the farthest one on the line to her that is on the screen (4 tiles out), which only her tell lifts
    const n = Math.max(Math.abs(s.dx), Math.abs(s.dy)), f = n > 4 ? 4 / n : 1, cx = s.pl.x + Math.round(s.dx * f) * ts, cy = s.pl.y + Math.round(s.dy * f) * ts, tile = { x: r.x + Math.round((cx - ts / 2) * k), y: r.y + Math.round((cy - ts / 2) * k), w: Math.round(ts * k), h: Math.round(ts * k) };
    assert.ok(tile.x >= r.x && tile.y >= r.y && tile.x + tile.w <= r.x + r.w && tile.y + tile.h <= r.y + r.h, `the verdict tile is on the screen (${JSON.stringify({ tile, r, s })})`);
    const stored = (name, b) => { const f = path.join(savesDir, name); if (process.env.PLAYED_WRITE_CROPS) { const c = crop(b); writeFileSync(f, encodePNG(c.width, c.height, c.data)); } return decodePNG(readFileSync(f)); };
    const differ = (c, ref) => { let n = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) n++; return n; };
    const boxRef = stored("s21-tell-box.png", box), tileRef = stored("s21-tell-tile.png", tile);
    const nb = differ(crop(box), boxRef), nt = differ(crop(tile), tileRef), area = tile.w * tile.h;
    console.log(`# s21: the box differs from her tell line's crop by ${nb} pixels, her tile from its crop by ${nt} of ${area}`);
    assert.ok(nb < 5000, `the box shows her tell line, not the stone's (${nb} pixels differ)`);
    assert.ok(nt < area * 0.05, `her tile is not under the veil (${nt} of ${area} pixels differ from her tile's crop)`);
  } finally { await g.ctx.close(); }
});

// OWNER #141 (11-24 18:06 UTC): "adjacent place is 100% water in a rectangle, showing no shores or integrating into the active place. this is a terrain generation problem."
// OWNER #166 (11-25 00:53 UTC): "water above is deep and doesn't transition smoothly with the adjacent terrain. again, a border between places is blocked by a straight line of deep water."  (PR 609; rule 16a)
// His two saves, at his phone size (412x915), by presses on the page. Both saves were made standing on water that is wide water now (PLACE_REV 5), so the page loads him on the nearest land tile of the same place (GD 11-27)
// and the short Call (the ring, the walking view) shows the shore and the water across the seam. State only asserts the case is reached (the place of his note).
// The verdict is the pixels of the walking view: no straight box edge (a long straight vertical or horizontal line where the colour jumps) anywhere on the game screen.
// A straight edge is a run of at least 120 device pixels along one column (or row) where the neighbouring pixels differ by more than 60 (sum of channels). The dashed seam marker is short dashes, so it is not a run.
function longestEdge(im, r, jump = 60) {
  const d = (x, y, x2, y2) => { const p = px(im, x, y), q = px(im, x2, y2); return Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]) > jump; };
  let best = { n: 0, at: null };
  const y0 = r.y + Math.round(r.h * 0.125), y1 = r.y + Math.round(r.h * 0.84);      // the picture alone: under the HUD and its line, above the toast and the bottom bar
  for (let x = r.x + 1; x < r.x + r.w; x++) { let run = 0; for (let y = y0; y < y1; y++) { run = d(x, y, x - 1, y) ? run + 1 : 0; if (run > best.n) best = { n: run, at: `column ${x - r.x}, rows to ${y - r.y}`, dir: "vertical" }; } }
  for (let y = y0 + 1; y < y1; y++) { let run = 0; for (let x = r.x; x < r.x + r.w; x++) { run = d(x, y, x, y - 1) ? run + 1 : 0; if (run > best.n) best = { n: run, at: `row ${y - r.y}, columns to ${x - r.x}`, dir: "horizontal" }; } }
  return best;
}
const WATER = ([R, G, B]) => B > G - 5 && B > R + 25 && G > R;
const SHORE_CASES = [
  { save: "141", place: "172", note: "#141" },
  { save: "166", place: "186", note: "#166" },
];
for (const c of SHORE_CASES) it(`s32 water meets the shore across the seam (${c.note}, his save, place ${c.place}): no straight box edge on the walking view after a Call [${SIZES[0].w}x${SIZES[0].h}]`, async () => {
  const g = await open(SIZES[0], c.save);
  try {
    const at = await g.where();
    assert.deepEqual([at.phase, at.key], ["patch", c.place], "the case is reached: he stands in the place of his note");
    await g.press("call", 100, 2000);                       // a short Call: the ring, the walking view
    const r = await g.region(), im = await g.shot(`s32-${c.save}`);
    const waterSeen = colour(im, r, WATER).n / (r.w * r.h);
    assert.ok(waterSeen > 0.05, `the case is reached: the water is on the screen (${(waterSeen * 100).toFixed(1)}%)`);
    const e = longestEdge(im, r);
    console.log(`# s32 ${c.note}: longest straight edge ${e.n} device px (${e.dir} ${e.at}); water ${(waterSeen * 100).toFixed(1)}%`);
    assert.ok(e.n < 120, `no straight box edge on the walking view (${e.n} device pixels along ${e.dir} ${e.at})`);
  } finally { await g.ctx.close(); }
});

// GD 11-27 (QA verify-609, his #166 save): after PLACE_REV 5 the saved tile is deep water ("Water · no way across", presses do nothing). The rule: a tile that cannot be stood on loads him on the nearest land tile of the same place.
// His #166 save, by presses: he loads in his place, off the water tile of his note, and a press on the d-pad moves him. State asserts the place and that the tile is not the water tile; the verdict is the pixels:
// his orange figure stands on the screen, the pixels at his feet are not water, and after a press he has moved on the screen and the bottom line is not "Water · no way across".
it(`s34 his #166 save loads him on land and he walks (GD 11-27): the d-pad moves him off the water tile [${SIZES[0].w}x${SIZES[0].h}]`, async () => {
  const g = await open(SIZES[0], "166");
  try {
    const at = await g.where();
    assert.equal(at.phase, "patch"); assert.equal(at.key, "186", "the case is reached: he is in the place of his note");
    assert.notDeepEqual([at.x, at.y], [21, 0], "the case is reached: he is not on the water tile his save held");
    const r = await g.region(), field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: Math.round(r.h * 0.72) };
    const base = await g.shot("s34-start"), hero = blobs(base, field, HERO)[0];
    assert.ok(hero && hero.n > 150, `his figure is on the screen (${hero ? hero.n : 0} pixels)`);
    const feet = { x: hero.box.x - 4, y: hero.box.y + hero.box.h, w: hero.box.w + 8, h: 10 };
    const wet = colour(base, r, WATER, feet).n / (feet.w * feet.h);
    console.log(`# s34: figure${JSON.stringify(hero.box)}, water at his feet ${(wet * 100).toFixed(0)}%`);
    assert.ok(wet < 0.5, `he does not stand in water (${(wet * 100).toFixed(0)}% water pixels at his feet)`);
    let moved = null;
    for (const dir of ["up", "left", "right", "down"]) {
      await g.press(dir, 100, 900);
      const now = blobs(await g.shot(`s34-${dir}`), field, HERO)[0], after = await g.where();
      if (after.x !== at.x || after.y !== at.y) { moved = { dir, from: [at.x, at.y], to: [after.x, after.y], figure: now && now.box }; break; }
    }
    console.log(`# s34: ${JSON.stringify(moved)}`);
    assert.ok(moved, "a press of the d-pad moves him (up, left, right or down)");
  } finally { await g.ctx.close(); }
});

// OWNER 2026-11-25 00:37 UTC (#160): "I swear a glint to the left, I cross to the left, the glint dissappear, can't find anything. do the glints even work?" Build desk, PR 688 (rule 16a).
// His save (saves/160.save: patch 56 tile 2,22; the glint on the left is a full cup in patch 55). By presses, each waiting for its effect: the Call, ← across the edge, up toward the cup until it is two tiles above him.
// State only asserts the reach (he is next door, the cup is full, he stands two tiles below it); ✓ then takes it, so the tile is bare ground for the reference.
// The verdict is the screen: the cup's tile on 11 shots over 1.6 s. The glint's own pixels are the ones that change between its pulse and the rest of the 1.6 s; against the bare tile (after the take) the glint shows on every shot (dim between pulses, bright on the pulse), and the pulse is clearly the brighter.
it(`s33 a glint stays on its find while he walks to it (#160, his save): dim between pulses, bright on the pulse [412x915]`, async () => {
  const size = { w: 412, h: 915, dpr: 2.625 };
  const g = await open(size, "160");
  try {
    const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, p = S.exp.patch, f = m.layout(String(p.key)).feats.find((q) => q.kind === "u"); return { key: String(p.key), x: p.x, y: p.y, cx: f.x, cy: f.y, full: ((S.cells[p.key] || {})[f.id] || {}).full !== false, cup: S.exp.cargo.s }; });
    const step = async (l) => { const b = await st(); await g.press(l, 100, 0); let n = b; for (let t = 0; t < 40 && n.x === b.x && n.y === b.y && n.key === b.key; t++) { await wait(100); n = await st(); } await wait(500); return n; };
    const r = await g.region(), tile = 48 * r.w / 450;
    const cropOf = (im, b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const p = px(im, b.x + x, b.y + y), j = (y * b.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; } return d; };
    await g.press("call", 100, 2500);
    let s = await st();
    for (let i = 0; i < 6 && s.key !== "55"; i++) s = await step("left");
    assert.equal(s.key, "55", "the case is reached: he crossed to the left, next door");
    for (let i = 0; i < 20 && s.x !== s.cx; i++) s = await step(s.x > s.cx ? "left" : "right");
    for (let i = 0; i < 20 && s.y - s.cy > 2; i++) s = await step("up");
    s = await st();
    assert.ok(s.full && s.x === s.cx && s.y - s.cy === 2, `the case is reached: the cup is full and he stands two tiles below it (${JSON.stringify(s)})`);
    const hero = async (im) => blobs(im, { x: r.x, y: r.y + Math.round(r.h * 0.06), w: r.w, h: Math.round(r.h * 0.88) }, HERO)[0];
    const series = async (name) => {   // the cup's tile on 11 shots, ~150 ms apart
      const crops = [];
      for (let i = 0; i < 11; i++) { const im = await g.shot(name + "-" + i), h = await hero(im); assert.ok(h && h.n > 100, "the hero is on the shot");
        const cx = h.box.x + h.box.w / 2 + (s.cx - s.x) * tile, cy = h.box.y + h.box.h / 2 + (s.cy - s.y) * tile;
        crops.push(cropOf(im, { x: Math.round(cx - tile / 2), y: Math.round(cy - tile / 2), w: Math.round(tile), h: Math.round(tile) })); await wait(150); }
      return crops;
    };
    const before = await series("s33-glint");
    await step("up"); await g.press("confirm", 100, 0);
    for (let t = 0; t < 40 && (await st()).full; t++) await wait(100);
    s = await st();
    assert.ok(!s.full && s.cup > 0, `the case is reached: ✓ took the cup (${JSON.stringify(s)})`);
    await step("down"); await wait(1500);
    s = await st();
    const bare = (await series("s33-bare"))[5];
    const n = bare.length / 4, d = (c, i) => Math.abs(c[i * 4] - bare[i * 4]) + Math.abs(c[i * 4 + 1] - bare[i * 4 + 1]) + Math.abs(c[i * 4 + 2] - bare[i * 4 + 2]);
    // the glint's pixels: those that differ from the bare tile in the brightest shot, and are not the cup (the cup is in every shot, so it differs from bare in every shot by the same amount: the pulse is what changes)
    const score = (c, mask) => { let t = 0; for (const i of mask) t += d(c, i); return t; };
    const range = []; for (let i = 0; i < n; i++) { let lo = 1e9, hi = -1; for (const c of before) { const v = d(c, i); lo = Math.min(lo, v); hi = Math.max(hi, v); } if (hi - lo > 60) range.push(i); }
    assert.ok(range.length >= 8, `the glint pulses on the tile: ${range.length} pixels change between its pulse and the rest`);
    const sc = before.map((c) => score(c, range) / range.length), hi = Math.max(...sc), lo = Math.min(...sc);
    console.log(`# s33: glint pixels ${range.length}; mean distance from the bare tile per shot ${sc.map((v) => v.toFixed(0)).join(" ")}`);
    assert.ok(lo > 25, `the glint is on the tile in every shot, dim ones included (the dimmest shot is ${lo.toFixed(0)} from the bare tile)`);
    assert.ok(hi > lo * 1.6, `the pulse is clearly brighter than the rest (${hi.toFixed(0)} against ${lo.toFixed(0)})`);
  } finally { await g.ctx.close(); }
});

// OWNER 2026-11-25 16:3x: "watching mibis in the wild is fun too, but they don't do much." (OWNER 11-27 08:5x "ok both"); lead ruling 11-27 12:02: one played case of the bolt-then-beat route. wild-beats-fix-2 (PR 693, rule 16a).
// Seed 33, a fresh game, 390x844, presses only: ✓ to set out, the route that names Osier, then he walks toward her until she bolts (gone), walks off until he is more than 4 tiles from her, and keeps still (✓) until her beat is on the screen.
// State only asserts the reach (she is named, she bolted, he is more than 4 tiles off, her beat is running). The verdict is the pixels: her act line in the message box, above the target line, against a crop of that box (saves/wild-beat-line.png;
// PLAYED_WRITE_CROPS=1 rewrites it), and the box differs from the one just before the beat. Every press waits for its effect (state changed, then still for 400 ms).
it(`s34 a wild Loika that bolted plays her beat once he keeps off (wild-beats-fix-2, seed 33): her act line shows above the target line [390x844]`, async () => {
  const size = { w: 390, h: 844, dpr: 3 };
  const g = await open(size, { seed: 33 });
  const MSGBOX = [0.08, 0.865, 0.84, 0.07];   // the message box in this frame (wild-beats-fix-5: the shared 0.80-0.90 box caught only its top edge)
  const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; const c = P && m.curLive().cr.find((q) => q.ind && q.ind.name === "Osier"); return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, spent: S.day && S.day.spent, named: !!(c && S.named && S.named[c.id]), cx: c && c.x, cy: c && c.y, gone: !!(c && c.gone), ease: c && c.ease, beat: !!(c && m.FX.beats && m.FX.beats[c.id]), hx: c && c.ind.go && c.ind.go.t.x, hy: c && c.ind.go && c.ind.go.t.y, st: c && c.st, sight: !!(c && m.onScreen(c.x, c.y)), act: !!(m.FX.beatOver && m.FX.msg === m.FX.beatOver.text) }; });
  const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent, S.ui && S.ui.menuSel].join("|"); });
  const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };
  const dist = (s) => Math.max(Math.abs(s.cx - s.x), Math.abs(s.cy - s.y));
  try {
    let s = await st();
    for (let i = 0; i < 12 && !s.key; i++) { await step("confirm"); s = await st(); }
    for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }
    assert.ok(s.key, `set out: he is in the first place (${JSON.stringify(s)})`);
    for (const [d, n] of [["right", 24], ["up", 12], ["right", 12], ["down", 12]]) for (let i = 0; i < n && !s.named; i++) { await step(d); s = await st(); }
    const toward = async () => { const dx = s.cx - s.x, dy = s.cy - s.y, h = dx > 0 ? "right" : "left", v = dy > 0 ? "down" : "up", pri = Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h], at = s.x + "," + s.y; for (const d of pri.concat(["up", "down", "left", "right"])) { await step(d); s = await st(); if (s.x + "," + s.y !== at || s.named) return; } };
    for (let i = 0; i < 90 && !s.named && s.key === "31"; i++) { await toward(); }
    assert.ok(s.named, `the case is reached: Osier is named (${JSON.stringify(s)})`);
    // he walks toward her until she bolts
    // a press that does not move him (a bush, a stone) is followed by a sidestep across the line to her
    const walk = async (away) => { const dx = s.cx - s.x, dy = s.cy - s.y, sg = away ? -1 : 1, h = dx * sg > 0 ? "right" : "left", v = dy * sg > 0 ? "down" : "up", pri = away ? [v, h] : Math.abs(dx) >= Math.abs(dy) ? [h, v] : [v, h]; const at = s.x + "," + s.y;
      for (const d of pri.concat(["up", "down", "left", "right"])) { await step(d); s = await st(); if (s.x + "," + s.y !== at || (!away && s.gone)) return; } };
    for (let i = 0; i < 40 && !s.gone; i++) { await walk(false); }
    assert.ok(s.gone && s.ease === 3, `the case is reached: walking toward her bolted her (${JSON.stringify(s)})`);
    // he walks off, away from her, to more than 4 tiles, and keeps still
    for (let i = 0; i < 30 && dist(s) <= 4; i++) await walk(true);
    // then to the tile 6 below her haunt (in sight of it, more than 4 off, not beside her way there), a press at a time, with a sidestep where a bush blocks
    const goto = async (tx, ty) => { const at = s.x + "," + s.y, dx = tx - s.x, dy = ty - s.y, pri = Math.abs(dx) >= Math.abs(dy) ? [dx > 0 ? "right" : "left", dy > 0 ? "down" : "up"] : [dy > 0 ? "down" : "up", dx > 0 ? "right" : "left"];
      for (const d of pri.concat(["up", "down", "left", "right"])) { await step(d); s = await st(); if (s.x + "," + s.y !== at) return; } };
    assert.ok(dist(s) > 4, `the case is reached: he is more than 4 tiles off (${JSON.stringify(s)})`);
    let before = await g.shot("s34-before"), im = null;
    // she walks to her haunt on her own; he comes within sight of her (more than 4 off she is out of the fog's sight), then keeps still; the beat's line takes the box only when it is free, so each press is shot and the one where the box changes with the beat running is the verdict
    for (let i = 0; i < 120 && !(s.beat && im); i++) { before = await g.shot(); im = null; if (!s.gone && s.hx != null && Math.max(Math.abs(s.cx - s.hx), Math.abs(s.cy - s.hy)) <= 1 && !s.sight) await goto(s.cx, s.cy + 4); else await step("confirm"); s = await st(); const sh = await g.shot("s34-beat"); const mv = changed(before, sh, await g.region(), MSGBOX).n; if (s.beat && s.act && mv > 400) im = sh; }
    assert.ok(s.beat && !s.gone && im, `the case is reached: she is at ease again, her beat is running and its line is in the box (${JSON.stringify(s)})`);

    const r = await g.region(), k = r.w / 450;
    const box = { x: r.x + Math.round(r.w * MSGBOX[0]), y: r.y + Math.round(r.h * MSGBOX[1]), w: Math.round(r.w * MSGBOX[2]), h: Math.round(r.h * MSGBOX[3]) };
    const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const p = px(im, b.x + x, b.y + y), j = (y * b.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
    const f = path.join(savesDir, "wild-beat-line.png");
    if (process.env.PLAYED_WRITE_CROPS) { const c = crop(box); writeFileSync(f, encodePNG(c.width, c.height, c.data)); }
    const ref = decodePNG(readFileSync(f)), c = crop(box);
    let n = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) n++;
    const moved = changed(before, im, r, MSGBOX);
    console.log(`# s34: the box differs from her act line's crop by ${n} pixels, from the box before the beat by ${moved.n} (of ${moved.of}); state ${JSON.stringify(s)}`);
    assert.ok(moved.n > 400, `the box shows a line it did not before the beat (${moved.n} pixels differ)`);
    assert.ok(n < 5000, `the box shows her act line, as in the crop (${n} pixels differ)`);
    // wild-beats-line-1: a LATER beat shows its line too. He keeps still (✓) and she plays on; her fourth beat (a kind she already played: it lost its line to the once-a-day spend) must show its line over the wander note,
    // by pixels against a crop (saves/wild-beat-line-4.png; PLAYED_WRITE_CROPS=1 rewrites it).
    const beatAt = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, c = m.curLive().cr.find((q) => q.ind && q.ind.name === "Osier"), b = c && m.FX.beats && m.FX.beats[c.id]; return b ? Math.round(b.at) : null; });
    const seen = new Set([await beatAt()]); let im4 = null;
    for (let i = 0; i < 160 && !im4; i++) { await step("confirm"); const at = await beatAt(); if (at != null && !seen.has(at)) { seen.add(at); if (seen.size >= 4) { const sh = await g.shot("s34-beat4"); if ((await st()).act) im4 = sh; } } }
    assert.ok(im4, `the case is reached: her fourth beat is running and its line is in the box (${seen.size} beats seen)`);
    const crop4 = { width: box.w, height: box.h, data: new Uint8Array(box.w * box.h * 4) };
    for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im4, box.x + x, box.y + y), j = (y * box.w + x) * 4; crop4.data[j] = p[0]; crop4.data[j + 1] = p[1]; crop4.data[j + 2] = p[2]; crop4.data[j + 3] = 255; }
    const f4 = path.join(savesDir, "wild-beat-line-4.png");
    if (process.env.PLAYED_WRITE_CROPS) writeFileSync(f4, encodePNG(crop4.width, crop4.height, crop4.data));
    const ref4 = decodePNG(readFileSync(f4)); let n4 = 0;
    for (let i = 0; i < crop4.data.length; i += 4) if (crop4.data[i] !== ref4.data[i] || crop4.data[i + 1] !== ref4.data[i + 1] || crop4.data[i + 2] !== ref4.data[i + 2]) n4++;
    console.log(`# s34: the fourth beat's box differs from its line's crop by ${n4} pixels`);
    assert.ok(n4 < 5000, `the box shows her fourth beat's line, as in the crop (${n4} pixels differ)`);
  } finally { await g.ctx.close(); }
});

// OWNER #137 (11-24): "is the field guide selectable? how? or what does it mean?" The pad never reaches the Field guide, so its entries must not wear the framed box the pad-selected sign tiles wear.
// His replay.save (saves/137.save): the Probe page, one species identified (Untuva). The verdict is the screenshot: along the entry's top edge no frame pixels differ from the background just above it;
// the same test on the first sign tile above shows its frame.
for (const size of SCALE_SIZES.filter((s) => s.w === 412 || s.w === 390)) {
  const tag = `${size.w}x${size.h}`;
  it(`s32 the Field guide entry has no frame round it, the sign tiles keep theirs (#137, his save, the Probe page) [${tag}]`, async () => {
    const g = await open(size, "137");
    try {
      assert.equal((await g.where()).phase, "probe", "the case is reached: the Probe page is open");
      const r = await g.region(), im = await g.shot(`s32-${tag}`), k = r.w / 450;
      // the frame's colour is read off the first sign tile's top edge; the verdict is how much of each run is that colour
      const fc = px(im, r.x + Math.round(41 * k), r.y + Math.round(230.5 * k));
      const edge = (gx, gy, gw) => {   // the fraction of a game-space run (3 game px tall) drawn in the frame's colour
        let n = 0, tot = 0;
        for (let y = Math.round(gy * k); y < Math.round((gy + 3) * k); y++) for (let x = Math.round(gx * k); x < Math.round((gx + gw) * k); x++) {
          const a = px(im, r.x + x, r.y + y); tot++;
          if (a[0] === fc[0] && a[1] === fc[1] && a[2] === fc[2]) n++;
        }
        return n / tot;
      };
      const tile = edge(21 + 6, 229, 28), guide = edge(24 + 50, 439, 70);
      console.log(`# s32 ${tag}: frame colour ${fc}, tile top edge ${tile.toFixed(2)}, guide entry top edge ${guide.toFixed(2)} in it`);
      assert.ok(tile > 0.2, `the sign tile keeps its frame (${tile.toFixed(2)})`);
      assert.ok(guide < 0.02, `the Field guide entry has no frame round it (${guide.toFixed(2)})`);
    } finally { await g.ctx.close(); }
  });
}

// OWNER #178 (11-27 17:54 UTC): "I dont like that the water is so blocky, very long straight shores, and deep water is just full map cells. needs to be more naturally shaped". His replay.save (saves/178.save, seed 20, cell 186 with the sea cell
// east of it), at his size 412x915, by presses: walk east to the place's coast, then hold Call for the look-around. The verdict is the pixels: the coast is a line that wanders, never a ruler line a cell long (28 tiles).
// In the place the sand's edge, in the look-around the deep water's edge, row by row: how many different columns it stands on, and how long it keeps one (within a pixel or two). Each strip is also set against a crop of it
// (refs/s36-*.png, cut from the shipped build by PLAYED_MAKE_REFS=1); two shots of the look-around a moment apart must match first, so the crop is not asked to hold a moving picture.
{
  const size = { w: 412, h: 915, dpr: 2.625 };
  const SAND = ([r, gg, b]) => r > 215 && gg > 185 && b < 150 && r - b > 80;   // the beach tile (231,205,134)
  const DEEP = ([r, gg, b]) => Math.abs(r - 36) < 14 && Math.abs(gg - 56) < 14 && Math.abs(b - 99) < 14;   // the sea beyond the shallows (36,56,99)
  // for each row of the box the first column (from the left) where `is` holds three pixels in a row; then how many different columns, and the longest run of rows whose column is within `tol` of the row above
  const edgeRuns = (im, b, is, tol) => {
    const e = [];
    for (let y = b.y; y < b.y + b.h; y++) { let c = -1; for (let x = b.x; x < b.x + b.w - 6; x++) if (is(px(im, x, y)) && is(px(im, x + 3, y)) && is(px(im, x + 6, y))) { c = x; break; } e.push(c); }
    let best = 1, run = 1;
    for (let i = 1; i < e.length; i++) { if (e[i] >= 0 && e[i - 1] >= 0 && Math.abs(e[i] - e[i - 1]) <= tol) { run++; if (run > best) best = run; } else run = 1; }
    return { rows: e.length, found: e.filter((c) => c >= 0).length, distinct: new Set(e.filter((c) => c >= 0)).size, longest: best };
  };
  it("s36 the coast wanders, in the place and in the look-around (#178, his save: no ruler line a cell long) [412x915]", async () => {
    const g = await open(size, "178");
    try {
      assert.deepEqual(await g.where(), { phase: "patch", x: 18, y: 18, key: "186" }, "the case is reached: his save stands in the coastal place");
      for (let i = 0; i < 5; i++) await g.press("right", 100, 900);
      assert.equal((await g.where()).x, 23, "the case is reached: he stands on the place's east column, the coast");
      const r = await g.region(), tileP = r.w / 26, tileL = r.w / 52;   // device px of a tile in the place, and in the look-around (half the size)
      const placeBox = { x: r.x + 509, y: r.y + 114, w: 390, h: 415 };   // the place's top-right: the sand along the coast (rows of the game screen's view, right of the middle)
      const place = await g.shot("s36-place");
      const pr = edgeRuns(place, placeBox, SAND, 2);
      console.log(`# s36 place: ${pr.found}/${pr.rows} rows have sand, ${pr.distinct} different edge columns, longest straight run ${(pr.longest / tileP).toFixed(1)} tiles`);
      assert.ok(pr.found > pr.rows / 2, `the case is reached: the coast's sand is in view (${pr.found}/${pr.rows} rows)`);
      assert.ok(pr.distinct >= 4, `the sand's edge wanders in the place (${pr.distinct} different columns)`);
      assert.ok(pr.longest < 8 * tileP, `no ruler line in the place: the sand's edge keeps one column for ${(pr.longest / tileP).toFixed(1)} tiles (8 allowed)`);
      await g.hold("call"); await wait(3000);
      const peekA = await g.shot("s36-peek"); await wait(700); const peekB = await g.shot("s36-peek-b");
      await g.release(); await wait(1000);
      const peekBox = { x: r.x + 644, y: r.y + 64, w: 255, h: 1060 };   // the sea east of the place in the look-around, down the whole view
      const lr = edgeRuns(peekA, peekBox, DEEP, 1);
      console.log(`# s36 look-around: ${lr.found}/${lr.rows} rows have deep water, ${lr.distinct} different edge columns, longest straight run ${(lr.longest / tileL).toFixed(1)} tiles`);
      assert.ok(lr.found > lr.rows * 0.9, `the case is reached: the deep water is in view down the look-around (${lr.found}/${lr.rows} rows)`);
      assert.ok(lr.distinct >= 8, `the deep water's edge wanders in the look-around (${lr.distinct} different columns)`);
      assert.ok(lr.longest < 8 * tileL, `no ruler line in the look-around: the deep water's edge keeps one column for ${(lr.longest / tileL).toFixed(1)} tiles (8 allowed; a cell is 28)`);
      const selfSame = changed(peekA, peekB, peekBox);
      assert.ok(selfSame.frac < 0.02, `two shots of the look-around alike, so a crop can judge it (${selfSame.frac.toFixed(3)} differ)`);
      const cp = againstRef(place, placeBox, "s36-place-east"), cl = againstRef(peekA, peekBox, "s36-peek-east");
      assert.ok(cp.frac < 0.03, `the place's coast strip is as its crop (${cp.frac.toFixed(3)} differ)`);
      assert.ok(cl.frac < 0.03, `the look-around's coast strip is as its crop (${cl.frac.toFixed(3)} differ)`);
    } finally { await g.ctx.close(); }
  });
}

// OWNER #178 / #141 (fog-edge-1): the unexplored dark has a soft, irregular edge, not the cell's straight line ("I dont like that the water is so blocky, very long straight shores, and deep water is just full map cells. needs to be more naturally shaped";
// 11-27 15:4x "ok, queue water fix then"). The dark is flat night (#29253a, in the reach view ink under night dots); where it meets seen land the edge is the art desk's signed pieces, laid by the build (src/fogedge.mjs).
// His 178.save (seed 20, cell 186) and his 141.save (seed 64, place 172), at his size 412x915, by presses: hold Call for the look-around; for 178 also ← then Leave this place for the map (the reach view). The verdict is the pixels:
// along each strip where seen land meets the dark, per row (or column) the first pixel that is not dark: how many different positions, and how long it keeps one (within 2 device px): a straight cell-long cut keeps one for the whole strip (a cell is
// 384 device px in the look-around). Each strip is also set against a crop of it (refs/s39-*.png, cut from the shipped build by PLAYED_MAKE_REFS=1 PLAYED_WRITE_CROPS=1); two shots a moment apart must match first.
{
  const size = { w: 412, h: 915, dpr: 2.625 };
  const NIGHT = ([r, gg, b]) => Math.abs(r - 41) < 4 && Math.abs(gg - 37) < 4 && Math.abs(b - 58) < 4;   // the look-around's dark: #29253a
  const INKISH = ([r, gg, b]) => (Math.abs(r - 41) < 8 && Math.abs(gg - 37) < 8 && Math.abs(b - 58) < 8) || (Math.abs(r - 26) < 8 && Math.abs(gg - 23) < 8 && Math.abs(b - 37) < 8);   // the map's dark: ink under night dots
  // dir x+ / x-: for each row of the box the first column, scanning right / left, where three pixels in a row are not dark; y+ / y-: for each column the first row, scanning down / up
  const softEdge = (im, b, dark, dir) => {
    const e = [], horiz = dir[0] === "x", fwd = dir[1] === "+", n = horiz ? b.h : b.w, len = horiz ? b.w : b.h, at = (i, k) => (horiz ? px(im, b.x + k, b.y + i) : px(im, b.x + i, b.y + k));
    for (let i = 0; i < n; i++) { let c = -1; for (let s = 0; s < len - 3; s++) { const k = fwd ? s : len - 1 - s, d = fwd ? 1 : -1; if (!dark(at(i, k)) && !dark(at(i, k + d)) && !dark(at(i, k + 2 * d))) { c = k; break; } } e.push(c); }
    let best = 1, run = 1;
    for (let i = 1; i < e.length; i++) { if (e[i] >= 0 && e[i - 1] >= 0 && Math.abs(e[i] - e[i - 1]) <= 2) { run++; if (run > best) best = run; } else run = 1; }
    return { rows: e.length, found: e.filter((c) => c >= 0).length, distinct: new Set(e.filter((c) => c >= 0)).size, longest: best };
  };
  const leaveToMap = async (g) => {
    await g.press("back", 100, 2500);
    if ((await g.where()).phase === "menu") { for (let i = 0; i < 10 && await g.menuRow() !== "leave"; i++) await g.press("down"); assert.equal(await g.menuRow(), "leave", "the case is reached: the selected row is Leave this place"); await g.press("confirm", 100, 3500); }
    assert.equal((await g.where()).phase, "map", "the case is reached: he left the place for the map"); await wait(2500);
  };
  // each strip: its name, the box (device px from the game screen's top-left), the dark's test, the scan direction, and the allowed longest straight run (device px)
  const STRIPS = {
    "178": [
      { name: "ne", box: { x: 600, y: 70, w: 120, h: 270 }, dark: NIGHT, dir: "x+", why: "the sea's west edge against the dark, above the place" },
      { name: "se", box: { x: 600, y: 850, w: 120, h: 260 }, dark: NIGHT, dir: "x+", why: "the sea's west edge against the dark, below the place" },
    ],
    "141": [
      { name: "top", box: { x: 10, y: 330, w: 140, h: 130 }, dark: NIGHT, dir: "y+", why: "the water's top edge against the dark" },
      { name: "bottom", box: { x: 10, y: 740, w: 140, h: 130 }, dark: NIGHT, dir: "y-", why: "the water's bottom edge against the dark" },
    ],
  };
  for (const save of ["178", "141"]) it(`s39 the unexplored dark's edge wanders in the look-around (#${save}, his save: no straight cell-long cut) [412x915]`, async () => {
    const g = await open(size, save);
    try {
      assert.ok(await g.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.fogEdgeReady()), "the case is reached: the signed edge pieces are in");
      const r = await g.region();
      await g.hold("call"); await wait(3000);
      const a = await g.shot(`s39-${save}-look`); await wait(700); const b2 = await g.shot(`s39-${save}-look-b`);
      await g.release(); await wait(1000);
      for (const s of STRIPS[save]) {
        const box = { x: r.x + s.box.x, y: r.y + s.box.y, w: s.box.w, h: s.box.h }, e = softEdge(a, box, s.dark, s.dir);
        console.log(`# s39 ${save} ${s.name}: ${e.found}/${e.rows} lines have land, ${e.distinct} different edge positions, longest straight run ${e.longest} device px (${s.why})`);
        assert.ok(e.found > e.rows * 0.9, `the case is reached: ${s.why} is in view (${e.found}/${e.rows})`);
        assert.ok(e.distinct >= 6, `${s.why} wanders (${e.distinct} different positions)`);
        assert.ok(e.longest < 120, `no cell-long cut: ${s.why} keeps one position for ${e.longest} device px (120 allowed; a cell is 384)`);
        assert.ok(changed(a, b2, box).frac < 0.02, `two shots of the strip alike, so a crop can judge it`);
        const c = againstRef(a, box, `s39-${save}-${s.name}`);
        assert.ok(c.frac < 0.03, `${s.why} is as its crop (${c.frac.toFixed(3)} differ)`);
      }
      if (save === "178") {   // the map: the sea's east edge against the dark beyond the reach view
        await leaveToMap(g);
        const m = await g.shot("s39-178-map"), box = { x: r.x + 780, y: r.y + 115, w: 50, h: 670 }, e = softEdge(m, box, INKISH, "x-");
        console.log(`# s39 178 map: ${e.found}/${e.rows} rows have land, ${e.distinct} different edge positions, longest straight run ${e.longest} device px`);
        assert.ok(e.found > e.rows * 0.5, `the case is reached: the sea's east edge is in view on the map (${e.found}/${e.rows})`);
        assert.ok(e.distinct >= 6, `the map's dark edge wanders (${e.distinct} different positions)`);
        assert.ok(e.longest < 144, `no cell-long cut on the map: one position for ${e.longest} device px (144 allowed; a cell is 144)`);
        const c = againstRef(m, box, "s39-178-map-east");
        assert.ok(c.frac < 0.03, `the map's dark edge is as its crop (${c.frac.toFixed(3)} differ)`);
      }
    } finally { await g.ctx.close(); }
  });
}

// OWNER 2025-11-25 16:3x: "revealing the map is cool to, gets tedious, but it's a good entertainment." (reveal-build-1, PR 695; build desk's NO d2cdce, rule 12). A fresh seed 13 at 412x915, played by presses only: ✓ to set out, then the d-pad on the map.
// A map step lifts the 5x5 ring. State only asserts the case is reached (the map, cells revealed by the first step that moves him, the find on the ring's edge if there is one); the verdict is the pixels:
// the reach view after that step against a crop of it (saves/s35-reveal-ring.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it). If the step lands a find on the new edge and it is in view, its orange brackets are found too.
if (SIZES[0].w === 412) it(`s35 a map step lifts the 5x5 ring (reveal-build-1, seed 13): the reach view after the first step is the crop, and a find on the new edge is bracketed [412x915]`, async () => {
  const size = SIZES[0];
  const g = await open(size, { seed: 13 });
  const m = (f) => g.page.evaluate(f);
  const count = () => m(() => { const S = window.__play.frames.companion.contentWindow.__mb.S; return S.seen.rev.reduce((n, v) => n + (v ? 1 : 0), 0); });
  try {
    for (let i = 0; i < 8 && (await g.where()).phase !== "map"; i++) await g.press("confirm", 100, 2500);   // ✓ to set out
    assert.equal((await g.where()).phase, "map", "the case is reached: he is on the map");
    let n0 = await count(), n1 = n0, im = null, edge = null;
    for (const d of ["right", "down", "left", "up", "right", "down", "right", "down"]) {   // the d-pad: the first step that moves him
      await g.press(d, 100, 150);
      edge = await m(() => { const m = window.__play.frames.companion.contentWindow.__mb; return m.FX.edge ? m.FX.edge.cs.length : 0; });   // read at once: the brackets last about 1 s
      im = await g.shot("s35-ring"); await wait(1500);
      n1 = await count();
      if (n1 > n0) break;
    }
    console.log(`# s35: ${n1 - n0} cells lifted by the first step; ${edge} finds on the ring's edge`);
    assert.ok(n1 - n0 > 3, `the case is reached: the step lifted more than main's 3x3 ring (${n1 - n0} cells)`);
    const r = await g.region(), box = { x: r.x + Math.round(r.w * 0.04), y: r.y + Math.round(r.h * 0.12), w: Math.round(r.w * 0.92), h: Math.round(r.h * 0.5) };
    const f = path.join(savesDir, "s35-reveal-ring.png");
    if (process.env.PLAYED_WRITE_CROPS) {
      const d = new Uint8Array(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y), j = (y * box.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
      writeFileSync(f, encodePNG(box.w, box.h, d));
    }
    const ref = decodePNG(readFileSync(f));
    assert.deepEqual([ref.width, ref.height], [box.w, box.h], "the crop is the size of the reach view's box");
    let bad = 0; for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y), k = (y * box.w + x) * 4; if (Math.abs(p[0] - ref.data[k]) + Math.abs(p[1] - ref.data[k + 1]) + Math.abs(p[2] - ref.data[k + 2]) > 30) bad++; }
    console.log(`# s35: the reach view differs from its crop by ${bad} of ${box.w * box.h} pixels`);
    assert.ok(bad < box.w * box.h * 0.03, `the ring is lifted: the reach view is the crop (${bad} pixels differ)`);
  } finally { await g.ctx.close(); }
});
// OWNER 2025-11-25 16:3x (as above), 11-27 13:5x "ok"; lead's ruling 11-27 14:32 (reveal-fix-2): the bracket shows on the find at the new ring's edge; the line shows only when that find is on screen; both clear after about 1 s; no line when the find is off view.
// A fresh seed 13 at 412x915, presses only. Each step is read at once: a line without a find in view is the failure; the first step that has a find on screen is shot (the bracket is judged by pixels against saves/s36-reveal-edge.png, cut once with PLAYED_WRITE_CROPS=1) and shot again after 1.5 s: line and bracket gone.
if (SIZES[0].w === 412) it(`s36 the ring's find on screen is bracketed and said about 1 s, then both clear; no line for a find off view (reveal-fix-2, seed 13) [412x915]`, async () => {
  const size = SIZES[0];
  const g = await open(size, { seed: 13 });
  const m = (f) => g.page.evaluate(f);
  const read = () => m(() => { const m = window.__play.frames.companion.contentWindow.__mb; return { edge: m.FX.edge && performance.now() - m.FX.edge.at < 1000 ? m.FX.edge.cs.length : 0, said: m.FX.msg === m.WORDS.reveal.find, pos: m.S.exp.pos }; });
  const orange = (im, box) => { let n = 0; for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y); if (p[0] > 200 && p[1] > 90 && p[1] < 170 && p[2] < 80) n++; } return n; };
  try {
    for (let i = 0; i < 8 && (await g.where()).phase !== "map"; i++) await g.press("confirm", 100, 2500);   // ✓ to set out
    assert.equal((await g.where()).phase, "map", "the case is reached: he is on the map");
    const r = await g.region(), box = { x: r.x + Math.round(r.w * 0.04), y: r.y + Math.round(r.h * 0.12), w: Math.round(r.w * 0.92), h: Math.round(r.h * 0.5) };
    let hit = null, silent = 0;
    for (const d of ["right", "right", "down", "down", "left", "left", "left", "up", "up", "up", "right", "right", "right", "right", "down", "down", "down", "down", "left", "left", "left", "left", "up", "up", "up", "up"]) {
      await g.press(d, 100, 150);
      const s = await read();
      if (s.said) assert.ok(s.edge > 0, `the line shows only for a find on screen (step ${d} at ${s.pos})`);
      if (!s.said && s.edge === 0) silent++;
      if (s.edge > 0 && !hit) { hit = { s, im: await g.shot("s36-edge") }; break; }
      await wait(1100);
    }
    console.log(`# s36: ${silent} steps with no find on screen said nothing; first find on screen: ${hit ? JSON.stringify(hit.s) : "none"}`);
    assert.ok(hit, "the case is reached: a step ends its ring on a find that is on screen");
    assert.ok(hit.s.said, "the line is said with the find");
    const f = path.join(savesDir, "s36-reveal-edge.png");
    if (process.env.PLAYED_WRITE_CROPS) {
      const d = new Uint8Array(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(hit.im, box.x + x, box.y + y), j = (y * box.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
      writeFileSync(f, encodePNG(box.w, box.h, d));
    }
    const ref = decodePNG(readFileSync(f));
    assert.deepEqual([ref.width, ref.height], [box.w, box.h], "the crop is the size of the reach view's box");
    let bad = 0; for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(hit.im, box.x + x, box.y + y), k = (y * box.w + x) * 4; if (Math.abs(p[0] - ref.data[k]) + Math.abs(p[1] - ref.data[k + 1]) + Math.abs(p[2] - ref.data[k + 2]) > 30) bad++; }
    console.log(`# s36: the reach view with the bracket differs from its crop by ${bad} pixels`);
    assert.ok(bad < box.w * box.h * 0.01, `the bracket shows on the find: the reach view is the crop (${bad} pixels differ)`);
    await wait(1500);
    const after = await read(), im2 = await g.shot("s36-after");
    console.log(`# s36: after 1.5 s: ${JSON.stringify(after)}; orange pixels ${orange(hit.im, box)} then ${orange(im2, box)}`);
    assert.ok(!after.said && after.edge === 0, "the line and the bracket are gone after about 1 s");
    assert.ok(orange(hit.im, box) - orange(im2, box) >= 30, "the bracket's pixels are gone from the screen");
  } finally { await g.ctx.close(); }
});
// OWNER 2026-11-26 05:2x ("you're making it too complicated, it's a cozy game"; reach-build-1, the build desk's NO on PR 697, its item 1): a place of the Probe's square draws no dashed line, band or block at a side past the reach; the refusal is only the step across.
// Seed 13, a fresh game (the page's ?seed=), 412x915. Played: ✓ to set out and go in, then the d-pad south across two places (cells 44, 60) into cell 76, whose south side is past the Probe's reach, to three tiles short of that edge.
// Every press waits for its effect (state changed, then still for 400 ms). Which way to press is read off the place's tiles; a press that moves nothing marks that tile blocked and the route is planned again.
// State only asserts the case is reached (the place, the tile, the side's kind) and, after the step across, that he is still in the place; the words are the range line. The verdict on the edge is the pixels: the three tiles south of him, where the band stood,
// against a crop of them (saves/s37-rim-edge.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it): plain land, no dashed ink line, no band.
it(`s37 a rim place has no line at its range side (seed 13, reach-build-1): the edge is plain land, and the step across is refused with the range line, he stays [${SIZES[0].w}x${SIZES[0].h}]`, async () => {
  const size = SIZES[0];
  const g = await open(size, { seed: 13 });
  const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, spent: S.day && S.day.spent, msg: String((m.FX && m.FX.msg) || "").replace(/\x01/g, ""), ts: m.RT.ts, pl: m.RT.plScr }; });
  const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent, S.ui && S.ui.menuSel].join("|"); });
  const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };
  // the next press toward tile (tx, ty) of this place over its walkable tiles, never into a tile this walk found blocked; null when there is none
  const next = (tx, ty, blocked) => g.page.evaluate(([tx, ty, blocked]) => {
    const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, lay = m.layout(P.key), W = lay.w, H = lay.h, bad = new Set(blocked);
    const seen = new Map([[P.y * W + P.x, null]]), q = [P.y * W + P.x], D = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
    while (q.length) {
      const c = q.shift(), x = c % W, y = (c - x) / W;
      if (y === ty && x >= tx[0] && x <= tx[1]) { let k = c, first = null; while (seen.get(k) !== null) { first = seen.get(k); k = first.from; } return { dir: first.dir, to: first.to, from: first.from }; }
      for (const [d, dx, dy] of D) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const n = ny * W + nx; if (seen.has(n) || bad.has(c + ">" + n) || m.T_BLOCK[lay.tiles[n]] || (lay.reach && !lay.reach[n])) continue; seen.set(n, { from: c, dir: d, to: n }); q.push(n); }
    }
    return null;
  }, [tx, ty, [...blocked]]);
  const southCols = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, lay = m.layout(m.S.exp.patch.key), o = lay.openings.find((q) => q.side === "S"); return o ? { h: lay.h, col: [o.from + lay.baked.ox, o.to + lay.baked.ox] } : null; });
  // walk to a tile of this place; ends on arrival or after a crossing into another place
  const walk = async (tx, ty) => {
    const key0 = (await st()).key, blocked = new Set(), fails = new Map();
    for (let i = 0; i < 400; i++) {
      const s = await st(); if (s.key !== key0 || (s.y === ty && s.x >= tx[0] && s.x <= tx[1])) return s;
      const n = await next(tx, ty, blocked); assert.ok(n, `a way to tile ${tx},${ty} in place ${key0} from ${s.x},${s.y}`);
      await step(n.dir); const a = await st(); if (process.env.PLAYED_TRACE) console.log(`# s37 ${key0} ${s.x},${s.y} ${n.dir} -> ${a.key} ${a.x},${a.y}`); if (a.key === key0 && a.x === s.x && a.y === s.y) { const ek = n.from + ">" + n.to; fails.set(ek, (fails.get(ek) || 0) + 1); if (fails.get(ek) >= 3) blocked.add(ek); } else fails.clear();
    }
    throw new Error(`walk to ${tx},${ty} in ${key0}: too many presses`);
  };
  try {
    let s = await st();
    for (let i = 0; i < 12 && !s.key; i++) { await step("confirm"); s = await st(); }   // ✓ to set out, ✓ at "Start here", ✓ into the place: each waits for its effect
    for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }       // the place is built by a worker: wait until he is in it
    assert.equal(s.phase, "patch", "the case is reached: he is in the first place");
    assert.equal(s.key, "44", `the case is reached: seed 13 starts in place 44 (${s.key})`);
    for (const key of ["44", "60"]) {   // south across each: to the south edge of the place, then the step across
      assert.equal(s.key, key, `the case is reached: in place ${key}`);
      const e = await southCols(); assert.ok(e, `place ${key} has a south way`);
      s = await walk(e.col, e.h - 1);
      assert.equal(s.key, key, `the case is reached: on the south edge of place ${key}`);
      await step("down"); s = await st();
      assert.notEqual(s.key, key, `the case is reached: the step south crossed out of place ${key}`);
    }
    assert.equal(s.key, "76", `the case is reached: in place 76, whose south side is past the Probe's reach (${s.key})`);
    const kind = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, lay = m.layout(m.S.exp.patch.key), o = lay.openings.find((q) => q.side === "S"); return o && m.openingKind(lay, o).kind; });
    assert.equal(kind, "range", "the case is reached: place 76 south side is a range side");
    const e = await southCols(); s = await walk(e.col, e.h - 4);   // three tiles short of the edge: the tiles south of him are where the band stood
    assert.equal(s.key, "76"); assert.equal(s.y, e.h - 4, "the case is reached: three tiles short of the south edge");
    const im = await g.shot("s37-rim-edge"), r = await g.region(), k = r.w / 450;
    // the three tiles south of him and the columns left and right of his: game-space box to device pixels
    const box = { x: r.x + Math.round((s.pl.x - s.ts * 1.5) * k), y: r.y + Math.round((s.pl.y + s.ts / 2) * k), w: Math.round(3 * s.ts * k), h: Math.round(3 * s.ts * k) };
    assert.ok(box.x + box.w <= r.x + r.w && box.y >= r.y && box.y + box.h <= r.y + r.h, `the verdict box is on the screen (${JSON.stringify({ box, r })})`);
    const f = path.join(savesDir, "s37-rim-edge.png");
    if (process.env.PLAYED_WRITE_CROPS) {
      const d = new Uint8Array(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y), j = (y * box.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; }
      writeFileSync(f, encodePNG(box.w, box.h, d));
    }
    const ref = decodePNG(readFileSync(f));
    let bad = 0;
    for (let y = 0; y < ref.height; y++) for (let x = 0; x < ref.width; x++) { const p = px(im, box.x + x, box.y + y), j = (y * ref.width + x) * 4; if (p[0] !== ref.data[j] || p[1] !== ref.data[j + 1] || p[2] !== ref.data[j + 2]) bad++; }
    console.log(`# s37 ${size.w}x${size.h}: the three tiles south of him differ from the accepted crop (${ref.width}x${ref.height}) by ${bad} pixels`);
    assert.ok(ref.width === box.w && ref.height === box.h, `the crop is the box's size (${ref.width}x${ref.height} against ${box.w}x${box.h})`);
    assert.ok(bad < ref.width * ref.height * 0.02, `the edge is plain land, as the crop (${bad} of ${ref.width * ref.height} pixels differ)`);
    // the step across: three tiles to the edge, then one more
    for (let i = 0; i < 3; i++) await step("down");
    s = await st(); assert.equal(s.y, e.h - 1, "the case is reached: on the edge tile");
    const before = s; await step("down"); const after = await st();
    assert.deepEqual([after.key, after.x, after.y], [before.key, before.x, before.y], "the step across is refused: he is still in the place, on the same tile");
    assert.equal(after.spent, before.spent, "and the refused step spends no light");
    assert.match(after.msg, /^The Probe’s reach ends here/, "the line is the range line");
  } finally { await g.ctx.close(); }
});
// OWNER 2026-11-27 22:21 UTC (#179): "the loika is not eating from my hand". Design's ruling (bus 2ae443): while he holds her own food, his walking steps toward a named Loika at ease 0 are not heard, so he can walk up to her grazing and ✓ Offer fruit.
// His replay.save (saves/179.save: patch 2, tile 14,4, fruit in hand, Nut beside him with her ears up). By presses, each waiting for its effect: ✓ (the dim line), right until he is 5+ tiles off and she has calmed, then tap steps toward her, ✓ "Offer fruit", ✓ again: she eats.
// State only asserts the case is reached (her ease, the label, the distance); the verdict is the pixels, two small crops each under 2% of its own size: her tile with the one beside it (saves/s38-eating-tiles.png) and the box line "Nut takes the fruit from your hand" (saves/s38-eating-line.png), cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites them.
it(`s38 he walks up to Nut with fruit in hand and she eats from it (#179, his save) [412x915]`, async () => {
  const size = { w: 412, h: 915, dpr: 2.625 };
  const g = await open(size, "179");
  const mbq = (fn, arg) => g.page.evaluate(([src, a]) => (0, eval)("(" + src + ")")(window.__play.frames.companion.contentWindow.__mb, a), [fn.toString(), arg]);
  const st = () => mbq((m) => { const P = m.S.exp.patch, n = m.curLive().cr.find((c) => c.ind && c.ind.name === "Nut"); let a = null; try { a = m.patchAction(); } catch (e) {} return { key: P.key, x: P.x, y: P.y, spent: m.S.day.spent, carry: m.S.exp.carry, nut: n && { x: n.x, y: n.y, ease: n.ease | 0, st: n.st, hide: n.hide }, label: a && a.label, dim: !!(a && a.dim), msg: String((m.FX && m.FX.msg) || "").replace(/\x01/g, "") }; });
  const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, S.day && S.day.spent].join("|"); });
  const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };
  const trace = (tag, s) => { if (process.env.PLAYED_TRACE) console.log(`# s38 ${tag} him ${s.x},${s.y} Nut ${JSON.stringify(s.nut)} "${s.label}"${s.dim ? " dim" : ""} spent ${s.spent}`); };
  // the next tap toward the tile beside Nut over walkable tiles, never into Nut's own tile; null when there is none
  const toward = () => mbq((m) => {
    const P = m.S.exp.patch, n = m.curLive().cr.find((c) => c.ind && c.ind.name === "Nut"), lay = m.layout(P.key), W = lay.w, H = lay.h, D = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
    const seen = new Map([[P.y * W + P.x, null]]), q = [P.y * W + P.x];
    while (q.length) {
      const c = q.shift(), x = c % W, y = (c - x) / W;
      if (Math.abs(x - n.x) + Math.abs(y - n.y) === 1) { let k = c, dir = null; while (seen.get(k) !== null) { dir = seen.get(k).dir; k = seen.get(k).from; } return dir || "here"; }
      for (const [d, dx, dy] of D) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const i = ny * W + nx; if (seen.has(i) || (nx === n.x && ny === n.y) || m.T_BLOCK[lay.tiles[i]]) continue; seen.set(i, { from: c, dir: d }); q.push(i); }
    }
    return null;
  });
  try {
    let s = await st(); trace("start", s);
    assert.equal(s.carry, "fruit", "the case is reached: he holds fruit");
    assert.ok(s.nut && s.nut.ease === 3, `the case is reached: Nut is up (ease ${s.nut && s.nut.ease})`);
    assert.equal(s.dim, true, "the case is reached: ✓ shows the dim line");
    assert.equal(s.label, "Back off and keep still", "the dim line says what to do");
    await g.shot("s38-dim-line");
    // step off, right, until Nut has calmed (ease 0): the bolt ends only after six actions more than four tiles off
    // (right to five tiles off, then back and forth between five and six tiles off, so he never leaves her place)
    // (bug179-hand-fruit-5: once he is five tiles off he also presses ✓ twice, fruit down and up again, as he did on live: a bolted Loika does not come for it, so the count goes on)
    let fruitTried = false;
    for (let i = 0; i < 24 && s.nut && s.nut.ease !== 0; i++) {
      await step(s.nut.x + 6 <= s.x ? "left" : "right"); s = await st(); trace("off", s);
      if (!fruitTried && s.x - s.nut.x >= 5 && s.nut.ease === 3) { fruitTried = true; await step("confirm"); s = await st(); trace("down", s); await step("confirm"); s = await st(); trace("up", s); assert.equal(s.carry, "fruit", "the fruit is in his hand again"); }
    }
    assert.ok(s.nut && s.nut.ease === 0, `the case is reached: Nut has calmed (ease ${s.nut && s.nut.ease})`);
    // walk back to her with taps; she must stay at ease 0 on the way
    let n = 0;
    for (; n < 80; n++) {
      const dir = await toward(); if (dir === "here") break;
      assert.ok(dir, "a way to the tile beside her");
      await step(dir); s = await st(); trace("back", s);
      assert.equal(s.nut.ease, 0, `she is not heard on the way (ease ${s.nut.ease} at ${s.x},${s.y})`);
    }
    assert.equal(s.label, "Offer fruit", `the case is reached: beside her, ✓ reads "Offer fruit" (${s.label})`);
    await step("confirm"); s = await st(); trace("offered", s);
    const im = await g.shot("s38-eating"), r = await g.region();
    const pos = await mbq((m) => { const n = m.curLive().cr.find((c) => c.ind && c.ind.name === "Nut"), P = m.S.exp.patch; return { dx: n.x - P.x, dy: n.y - P.y, ts: m.RT.ts, pl: m.RT.plScr }; });
    assert.equal(Math.abs(pos.dx) + Math.abs(pos.dy), 1, `the case is reached: Nut is the tile beside him (${pos.dx},${pos.dy})`);
    const k = r.w / 450, ts = pos.ts;
    // her tile with the one beside it (his): the eating frames
    const gx = (v) => r.x + Math.round(v * k), gy = (v) => r.y + Math.round(v * k);
    const x0 = Math.min(0, pos.dx), y0 = Math.min(0, pos.dy), x1 = Math.max(0, pos.dx) + 1, y1 = Math.max(0, pos.dy) + 1;
    const tiles = { x: gx(pos.pl.x + x0 * ts - ts / 2), y: gy(pos.pl.y + y0 * ts - ts / 2) };
    tiles.w = gx(pos.pl.x + x1 * ts - ts / 2) - tiles.x; tiles.h = gy(pos.pl.y + y1 * ts - ts / 2) - tiles.y;
    // the box's line "Nut takes the fruit from your hand"
    const line = { x: r.x + Math.round(r.w * 0.02), y: r.y + Math.round(r.h * 0.80), w: Math.round(r.w * 0.96), h: Math.round(r.h * 0.10) };
    const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const p = px(im, b.x + x, b.y + y), j = (y * b.w + x) * 4; d[j] = p[0]; d[j + 1] = p[1]; d[j + 2] = p[2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
    const stored = (name, b) => { const f = path.join(savesDir, name); if (process.env.PLAYED_WRITE_CROPS) { const c = crop(b); writeFileSync(f, encodePNG(c.width, c.height, c.data)); } return decodePNG(readFileSync(f)); };
    const differ = (c, ref) => { let n = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) n++; return n; };
    const tilesRef = stored("s38-eating-tiles.png", tiles), lineRef = stored("s38-eating-line.png", line);
    assert.ok(tilesRef.width === tiles.w && tilesRef.height === tiles.h, `the tiles crop is the box's size (${tilesRef.width}x${tilesRef.height} against ${tiles.w}x${tiles.h})`);
    assert.ok(lineRef.width === line.w && lineRef.height === line.h, `the line crop is the box's size (${lineRef.width}x${lineRef.height} against ${line.w}x${line.h})`);
    const nt = differ(crop(tiles), tilesRef), nl = differ(crop(line), lineRef);
    console.log(`# s38: her tile and the one beside it differ from the crop of her eating by ${nt} of ${tiles.w * tiles.h} pixels; the box's line from its crop by ${nl} of ${line.w * line.h}`);
    assert.ok(nt < tiles.w * tiles.h * 0.02, `she is eating, as the crop of her tile and the one beside it (${nt} of ${tiles.w * tiles.h} pixels differ)`);
    assert.ok(nl < line.w * line.h * 0.02, `the box says "Nut takes the fruit from your hand", as the crop of its line (${nl} of ${line.w * line.h} pixels differ)`);
  } finally { await g.ctx.close(); }
});
// OWNER 2026-11-25 22:02 UTC (#174): "I'm facing a loika and there's no habit." Build desk bus c0efeb259c (PR 705): the played case on his own save.
// His replay.save (saves/174.save: patch, tile 1,18, Dunnock beside him at ease 3). By presses: the d-pad left once (he faces her). State only asserts the case is reached (her ease, his facing, the bar's reach).
// The verdict is the pixels: the bar's middle against a crop of her word "ears up" (saves/s41-ears-up-word.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it).
it(`s41 facing Dunnock at ease 3 the bar's middle reads her word, ears up (#174, his save) [412x915]`, async () => {
  const size = { w: 412, h: 915, dpr: 2.625 };
  const WORD = frac(570, 1142, 140, 52);   // the bar's word after ←Leave, in the 900x1200 frame
  const g = await open(size, "174");
  try {
    const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp && m.S.exp.patch; return [m.S.phase, P && P.x, P && P.y, P && P.dir, m.S.day && m.S.day.spent].join("|"); });
    const step = async (l) => { const before = await sig(); await g.press(l, 100, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };
    await step("left");
    const s = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, d = m.curLive().cr.find((c) => c.ind && c.ind.name === "Dunnock"); return { phase: m.S.phase, dir: P.dir, adj: d && Math.abs(d.x - P.x) + Math.abs(d.y - P.y) === 1, ease: d && (d.ease | 0), front: (m.occupant(P.key, m.frontOf(P).x, m.frontOf(P).y, "player") || {}).type }; });
    assert.ok(s.phase === "patch" && s.dir === "left" && s.adj && s.ease === 3 && s.front === "cr", `the case is reached: in the place, facing Dunnock at ease 3 (${JSON.stringify(s)})`);
    const r = await g.region(), im = await g.shot("s41-ears-up");
    const w = { x: r.x + Math.round(r.w * WORD[0]), y: r.y + Math.round(r.h * WORD[1]), w: Math.round(r.w * WORD[2]), h: Math.round(r.h * WORD[3]) };
    const crop = (b) => { const d = new Uint8Array(b.w * b.h * 4); for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const i = ((b.y + y) * im.width + b.x + x) * 4, j = (y * b.w + x) * 4; d[j] = im.data[i]; d[j + 1] = im.data[i + 1]; d[j + 2] = im.data[i + 2]; d[j + 3] = 255; } return { width: b.w, height: b.h, data: d }; };
    const f = path.join(savesDir, "s41-ears-up-word.png");
    if (process.env.PLAYED_WRITE_CROPS) { const c = crop(w); writeFileSync(f, encodePNG(c.width, c.height, c.data)); }
    const ref = decodePNG(readFileSync(f)), c = crop({ x: w.x, y: w.y, w: ref.width, h: ref.height });
    let bad = 0; for (let i = 0; i < c.data.length; i += 4) if (c.data[i] !== ref.data[i] || c.data[i + 1] !== ref.data[i + 1] || c.data[i + 2] !== ref.data[i + 2]) bad++;
    console.log(`# s41: the bar's word differs from the crop of "ears up" by ${bad} of ${ref.width * ref.height} pixels`);
    assert.ok(bad < ref.width * ref.height * 0.02, `the bar's middle reads her word, ears up (${bad} pixels differ from its crop)`);
  } finally { await g.ctx.close(); }
});

// ---- first pod path (PR 722, build's NO 11-28 01:47): played by presses only; a script reads state only to choose the next press (which way, which button) and to say the case is reached.
// The kit: state read, one press that waits for its effect, and the walk (breadth first over the place's walkable tiles, a tile that stopped a step is marked and the route planned again).
function fpKit(g) {
  const mbq = (fn, arg) => g.page.evaluate(([src, a]) => (0, eval)("(" + src + ")")(window.__play.frames.companion.contentWindow.__mb, a), [fn.toString(), arg]);
  const st = () => mbq((m) => {
    const S = m.S, P = S.exp && S.exp.patch; if (!P) return { phase: S.phase };
    let a = null; try { a = m.patchAction(); } catch (e) { /* no action */ }
    const live = m.curLive(), lay = m.layout(P.key);
    return { phase: S.phase, key: P.key, x: P.x, y: P.y, dir: P.dir, carry: S.exp.carry, label: a && a.label, spent: S.day.spent, taught: S.found.includes("teach:eats"), waiting: !!(S.ui && S.ui.waiting), w: lay.w, h: lay.h,
      fruit: live.fr.map((q) => ({ x: q.x, y: q.y })), lk: live.cr.filter((c) => c.ind).map((c) => ({ x: c.x, y: c.y, name: c.ind.name, named: !!(S.named && S.named[c.id]), sight: !!m.inSight(c.x, c.y), ease: c.ease | 0, known: S.known.includes(c.sp), ind: !!m.indInSight(true) && m.indInSight(true).id === c.id })),
      bushes: lay.feats.filter((f) => f.kind === "b").map((f) => ({ x: f.x, y: f.y })), nightPods: S.pods.filter((p) => p.how === "night").map((p) => ({ k: p.k, x: p.x, y: p.y })), cased: S.exp.cargo.pods.length, ts: m.RT.ts, pl: m.RT.plScr,
      msg: String((m.FX && m.FX.msg) || "").replace(/\x01/g, "") };
  });
  const sig = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; return [S.phase, P && P.key, P && P.x, P && P.y, P && P.dir, S.exp && S.exp.carry, S.exp && S.exp.cargo.pods.length, S.pods.length, S.day && S.day.spent, S.ui && S.ui.menuSel, String((m.FX && m.FX.msg) || "")].join("|"); });
  // one press (hold ms), then wait for something to change (3 s at most), then for the screen's state to stay as it is for 400 ms
  const step = async (l, hold = 100) => { const before = await sig(); await g.press(l, hold, 0); let now = before; for (let t = 0; t < 30 && now === before; t++) { await wait(100); now = await sig(); } for (let same = 0, t = 0; same < 4 && t < 100; t++) { await wait(100); const n2 = await sig(); same = n2 === now ? same + 1 : 0; now = n2; } };
  // the next press toward a goal: goal "beside" (a tile next to {x,y}, then the press that faces it), "edge" (the tile on the east edge, then the press out), over walkable tiles; null when there is none
  const route = (goal, blocked) => mbq((m, a) => {
    const P = m.S.exp.patch, lay = m.layout(P.key), W = lay.w, H = lay.h, bad = new Set(a.blocked), D = [["up", 0, -1], ["down", 0, 1], ["left", -1, 0], ["right", 1, 0]];
    const walk = (x, y) => x >= 0 && y >= 0 && x < W && y < H && lay.reach[y * W + x] && !m.T_BLOCK[lay.tiles[y * W + x]] && !(() => { const o = m.occupant(P.key, x, y, "player"); return o && (o.type === "feat" || o.type === "cr"); })();
    const g = a.goal, at = (x, y) => g.beside ? Math.abs(x - g.beside.x) + Math.abs(y - g.beside.y) === 1 : x === W - 1;
    if (at(P.x, P.y)) { if (g.beside) { const [dx, dy] = [g.beside.x - P.x, g.beside.y - P.y], d = D.find((q) => q[1] === dx && q[2] === dy)[0]; return { dir: d, there: true, facing: P.dir === d }; } return { dir: "right", there: true, facing: false }; }
    const seen = new Map([[P.y * W + P.x, null]]), q = [P.y * W + P.x];
    while (q.length) {
      const c = q.shift(), x = c % W, y = (c - x) / W;
      if (c !== P.y * W + P.x && at(x, y)) { let k = c, first = null; while (seen.get(k) !== null) { first = seen.get(k); k = first.from; } return { dir: first.dir, to: first.to, from: first.from }; }
      for (const [d, dx, dy] of D) { const nx = x + dx, ny = y + dy, n = ny * W + nx; if (seen.has(n) || bad.has(c + ">" + n) || !walk(nx, ny)) continue; seen.set(n, { from: c, dir: d, to: n }); q.push(n); }
    }
    return null;
  }, { goal, blocked: [...blocked] });
  // walk until `done(state)`; every press is one step; a step that moves nothing marks that edge (a creature, a thing) and the route is planned again
  const go = async (goal, done, label, max = 250) => {
    const blocked = new Set(); let s = await st();
    for (let i = 0; i < max; i++) {
      if (done(s)) return s;
      const key0 = s.key, r = await route(goal, blocked); assert.ok(r, `${label}: a way from ${s.x},${s.y}`);
      if (r.there && r.facing && !done(s)) return s;   // beside it and facing it: the caller's next press is its own
      await step(r.dir); const a = await st();
      if (process.env.PLAYED_TRACE) console.log(`# ${label} ${s.x},${s.y} ${r.dir} -> ${a.key} ${a.x},${a.y} "${a.label}" ${a.msg}`);
      if (a.key === key0 && a.x === s.x && a.y === s.y && !r.there && r.from != null) blocked.add(r.from + ">" + r.to);
      s = a; if (a.key !== key0) blocked.clear();
    }
    throw new Error(`${label}: too many presses (${s.x},${s.y})`);
  };
  return { mbq, st, sig, step, route, go };
}
// the game screen's two bottom lines and the box over the Case's slots, as fractions of the Companion's frame (set from the shots of this case)
const FPBOX = { line: [0.02, 0.86, 0.96, 0.12], call: [0.02, 0.1, 0.96, 0.35], fruit: [0.05, 0.83, 0.3, 0.09], hold: [0.05, 0.12, 0.9, 0.5] };
// OWNER 11-27 22:3x (bus f807ef4567): "i have yet to find pods in the current look"; build's NO 11-28 01:47 (bus 3c3b38), rules 16a/12. Seed 7, a fresh game, 412x915, presses only (the script reads state to choose which button, never to decide a verdict).
// By presses: ✓ to set out; the bush shaken, its fruit picked up; out east to Dunnock's place; at the first moment she is named and in sight the fruit is put down, so no fruit is in hand (the teach line); the Call; the fruit picked up again; the Case (the Fruit slot);
// she is fed; ✓ keeping still to nightfall; her pod is taken up; the Case holds it. State only says the case is reached; every verdict is pixels of what changed, against a shot from the same case:
// the box with the teach line against the box with fruit in hand, the Call's report against the screen before it, the Case with the Fruit slot, and the pod's cradle in the hold at the end.
async function fpPlay(TEACH) {   // TEACH: the teach line, the Call and the Case's Fruit slot (ends once she is fed); not TEACH: feed her at once and keep still to nightfall, her pod in the hold
  const size = { w: 412, h: 915, dpr: 2.625 }, g = await open(size, { seed: 7 }), K = fpKit(g), { st, step, go, mbq } = K;
  const trace = (t, s) => console.log(`# s45 ${t}: ${s.key} ${s.x},${s.y} carry ${s.carry} "${s.label}" spent ${s.spent} lk ${JSON.stringify(s.lk)}`);
  const stable = async () => { await wait(1200); };
  try {
    let s = await st();
    for (let i = 0; i < 14 && !s.key; i++) { await step("confirm"); s = await st(); }   // ✓ to set out, ✓ at "Start here", ✓ into the place
    for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }
    assert.equal(s.phase, "patch", "the case is reached: he is in the first place");
    // fruit: shake the bush beside, pick up what drops
    for (let n = 0; n < 40 && s.carry !== "fruit"; n++) {
      if (s.fruit.length) { const f = s.fruit[0]; if (s.x === f.x && s.y === f.y) await step("confirm"); else { s = await go({ beside: f }, (q) => q.label === "Pick up the fruit", "s45 fruit"); await step("confirm"); } }
      else { assert.ok(s.bushes.length, "the case is reached: a bush stands in the first place"); s = await go({ beside: s.bushes[0] }, (q) => q.label === "Shake the bush", "s45 bush"); await step("confirm"); }
      s = await st();
    }
    assert.equal(s.carry, "fruit", "the case is reached: fruit in his hand"); trace("fruit", s);
    // out east, then toward Dunnock's place until she is named and in sight
    const key0 = s.key;
    s = await go({ edge: "E" }, (q) => q.key !== key0, "s45 east");
    if (s.key === key0) { await step("right"); s = await st(); }
    assert.notEqual(s.key, key0, "the case is reached: in the next place"); trace("next place", s);
    const her = (q) => q.lk.find((c) => c.name === "Dunnock" && c.named && c.ind);
    for (let n = 0; n < 200 && !her(s); n++) {
      const l = s.lk.find((c) => c.sight) || s.lk[0]; assert.ok(l, "the case is reached: a Loika is in this place");
      const r = await K.route({ beside: { x: l.x, y: l.y } }, new Set()); assert.ok(r, "a way toward her");
      await step(r.dir); s = await st();
    }
    assert.ok(her(s), "the case is reached: Dunnock is named and in sight"); trace("her in sight", s);
    const r = await g.region(); let caseHand = null;
    if (TEACH) {
    const inHand = await g.shot("s45-1-fruit-in-hand");
    assert.equal(s.label, "Put down the fruit", `the case is reached: ✓ puts the fruit down (${s.label})`);
    await step("confirm"); s = await st(); await stable(); trace("put down", s);
    assert.equal(s.carry, null, "the case is reached: no fruit in his hand");
    const teach = await g.shot("s45-2-teach-line");
    const tl = changed(inHand, teach, r, FPBOX.line); console.log(`# s45: the box with her in sight and no fruit differs from the box with fruit in hand by ${tl.n} of ${tl.of} pixels`);
    assert.ok(tl.frac > 0.03, `the teach line is in the box (${tl.n} pixels differ from the box with fruit in hand)`);
    // the Call: its report names the fruit
    // the first Call in a place that reaches next door says so ("The Call lifted the land next door"); a Call after it gives the place's report (callReport): press again until the report names fruit
    // a Call near the place's edge reaches next door and says that instead: he steps back west, away from the east edge, first
    for (let i = 0; i < 6 && (await st()).x > 16; i++) await step("left");
    let callMsg = ""; for (let c = 0; c < 3 && !/fruit/i.test(callMsg); c++) { await g.press("call", 100, 0); for (let t = 0; t < 16 && !/fruit/i.test(callMsg); t++) { await wait(250); callMsg = (await st()).msg; } }
    const call = await g.shot("s45-3-call"), cl = changed(teach, call, r, FPBOX.line); console.log(`# s45: the Call's report "${callMsg}" changed ${cl.n} of ${cl.of} pixels of the box`);
    assert.match(callMsg, /fruit/i, "the case is reached: the Call's report names fruit");
    assert.ok(cl.frac > 0.02, `the Call's report is on the screen (${cl.n} pixels)`);
    await wait(4500);
    // the fruit is picked up again, and the Case shows it in the Fruit slot
    s = await st(); if (s.label !== "Pick up the fruit") { s = await go({ beside: s.fruit[0] }, (q) => q.label === "Pick up the fruit", "s45 refetch"); }
    await step("confirm"); s = await st(); assert.equal(s.carry, "fruit", "the case is reached: the fruit is in his hand again");
    await step("back"); for (let i = 0; i < 6 && (await mbq((m) => { const it = m.menuItems()[m.S.ui.menuSel]; return it && it.id; })) !== "cargo"; i++) await step("down");
    await step("confirm"); await stable();
    assert.equal((await st()).phase, "cargo", "the case is reached: the Case is open");
    caseHand = await g.shot("s45-4-case-fruit-in-hand");
    await step("back"); await stable(); s = await st();
    if (s.phase !== "patch") { await step("back"); await stable(); s = await st(); }
    assert.equal(s.phase, "patch", "the case is reached: back on the walk");
    }
    // feed her
    for (let n = 0; n < 120; n++) {   // she moves: the way to the tile beside her is planned again every press
      s = await st(); if (s.label === "Offer fruit") break;
      const l = s.lk.find((c) => c.name === "Dunnock"), r2 = await K.route({ beside: { x: l.x, y: l.y } }, new Set()); assert.ok(r2, "a way to her");
      await step(r2.dir);
    }
    assert.equal(s.label, "Offer fruit", `the case is reached: beside her, ✓ reads Offer fruit (${s.label})`);
    await step("confirm"); s = await st(); trace("offered", s);
    assert.ok(s.taught, "the case is reached: she took the fruit (the teaching is spent)");
    await step("back"); for (let i = 0; i < 6 && (await mbq((m) => { const it = m.menuItems()[m.S.ui.menuSel]; return it && it.id; })) !== "cargo"; i++) await step("down");
    await step("confirm"); await stable();
    const caseNone = await g.shot("s45-5-case-no-fruit");
    if (TEACH) {
      const fl = changed(caseHand, caseNone, r, FPBOX.fruit);
      console.log(`# s45: the Case's box differs between fruit in hand and none by ${fl.n} of ${fl.of} pixels`);
      assert.ok(fl.n > 150, `the Case's Fruit slot changed with the fruit (${fl.n} pixels)`);
    }
    await step("back"); await stable();
    if (TEACH) return;
    // keep still to nightfall (a tap each), her pod comes
    let stuck = 0;
    for (let n = 0; n < 620; n++) { s = await st(); if (s.nightPods.length) break; if (process.env.PLAYED_TRACE && n % 25 === 0) console.log(`# s45 n ${n} phase ${s.phase} waiting ${s.waiting} label "${s.label}" spent ${s.spent} t ${new Date().toISOString().slice(11, 19)}`); if (s.waiting) { await step("confirm"); continue; }   // the menu's Wait is folded to a strip: ✓ waits again
      if (s.phase !== "patch") { await step("back"); continue; }
      if (s.label !== "Keep still") {   // ✓ is something else here (her prints): after three taps that pass no light, the menu's own Wait passes it (nothing is moved near her)
        if (process.env.PLAYED_TRACE) trace("not keep still", s);
        if (++stuck >= 6) { stuck = 0; await step("back"); for (let i = 0; i < 9 && (await mbq((m) => { const it = m.menuItems()[m.S.ui.menuSel]; return it && it.id; })) !== "wait"; i++) await step("down"); await step("confirm"); continue; }
      } else stuck = 0;
      await step("confirm", 1500); if (n % 50 === 0) trace("waiting", s); }
    s = await st(); assert.ok(s.nightPods.length >= 1, `the case is reached: her pod is on the ground (light ${s.spent})`); trace("pod", s);
    const podAt = s.nightPods[0]; assert.equal(podAt.k, s.key, "the case is reached: her pod is in this place");
  } finally { try { await g.shot("s45-last"); } catch (e) { /* the page is gone */ } await g.ctx.close(); }
}
it(`s45 the first pod, played on seed 7, part 1: the teach line with no fruit in hand, the Call names fruit, the Case's Fruit slot (PR 722) [412x915]`, { timeout: 3600 * 1000 }, () => fpPlay(true));
// pod-ease-fix-1: a Loika fed today is not heard for his standing still (easeLoika), so her ease stays 0 at dusk and her night pod is on the ground by light 590. The take-up is s22's case: after the menu's Wait the page holds every press but ✓ (RT.artHold) on this seed-7 run, so the walk to the pod is not played here (not found why; see the report).
it(`s45b the first pod, played on seed 7, part 2: fed, ✓ keeping still to nightfall, her night pod is on the ground by light 590 (pod-ease-fix-1) [412x915]`, { timeout: 3600 * 1000 }, () => fpPlay(false));
// OWNER 11-27 22:3x (as above); build's NO 11-28 01:47 item 2: a place the first walk starts in with no fruit bush within 7 tiles of where he stands gets one, 3 to 6 tiles away, picked by the seed.
// Seed 3, a fresh game, 412x915 (its first place, 234, has none near the way in: its one bush stood 23 tiles off). By presses: ✓ to set out; the shot at the way in; then the walk beside the new bush and ✓ shakes it.
// State only says the case is reached (where he stands, where the bush is, the label); the verdict is the pixels: the three tiles round the bush on the first screen, against a crop of them (saves/s46-first-bush.png, cut once from this shot; PLAYED_WRITE_CROPS=1 rewrites it).
it(`s46 a first place with no bush near the way in has one now (PR 722, seed 3): it is on the first screen, and ✓ beside it shakes it [412x915]`, async () => {
  const size = { w: 412, h: 915, dpr: 2.625 }, g = await open(size, { seed: 3 }), K = fpKit(g), { st, step, go } = K;
  try {
    let s = await st();
    for (let i = 0; i < 14 && !s.key; i++) { await step("confirm"); s = await st(); }
    for (let t = 0; t < 300 && !s.key; t++) { await wait(100); s = await st(); }
    assert.equal(s.phase, "patch", "the case is reached: he is in the first place");
    assert.equal(s.key, "234", `the case is reached: seed 3 starts in place 234 (${s.key})`);
    assert.equal(s.bushes.length, 1, "the case is reached: the place holds one bush");
    const b = s.bushes[0], d = Math.abs(b.x - s.x) + Math.abs(b.y - s.y);
    assert.ok(d >= 3 && d <= 6, `the case is reached: the bush is 3 to 6 tiles from where he stands (${d}, he ${s.x},${s.y}, it ${b.x},${b.y})`);
    await wait(1500);
    const im = await g.shot("s46-first-bush"), r = await g.region(), k = r.w / 450, ts = s.ts;
    const bx0 = Math.max(0, Math.round((s.pl.x + (b.x - s.x - 1.5) * ts) * k)), by0 = Math.max(0, Math.round((s.pl.y + (b.y - s.y - 1.5) * ts) * k)), bx1 = Math.min(r.w, Math.round((s.pl.x + (b.x - s.x + 1.5) * ts) * k)), by1 = Math.min(r.h, Math.round((s.pl.y + (b.y - s.y + 1.5) * ts) * k));
    const box = { x: r.x + bx0, y: r.y + by0, w: bx1 - bx0, h: by1 - by0 };   // the three tiles round the bush, cut where the screen ends
    assert.ok(box.x >= r.x && box.y >= r.y && box.x + box.w <= r.x + r.w && box.y + box.h <= r.y + r.h, `the case is reached: the bush is on the first screen (${JSON.stringify({ box, r })})`);
    const f = path.join(savesDir, "s46-first-bush.png");
    if (process.env.PLAYED_WRITE_CROPS) {
      const dd = new Uint8Array(box.w * box.h * 4);
      for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y), j = (y * box.w + x) * 4; dd[j] = p[0]; dd[j + 1] = p[1]; dd[j + 2] = p[2]; dd[j + 3] = 255; }
      writeFileSync(f, encodePNG(box.w, box.h, dd));
    }
    const ref = decodePNG(readFileSync(f));
    assert.deepEqual([ref.width, ref.height], [box.w, box.h], "the crop is the box's size");
    let bad = 0; for (let y = 0; y < box.h; y++) for (let x = 0; x < box.w; x++) { const p = px(im, box.x + x, box.y + y), j = (y * box.w + x) * 4; if (Math.abs(p[0] - ref.data[j]) + Math.abs(p[1] - ref.data[j + 1]) + Math.abs(p[2] - ref.data[j + 2]) > 30) bad++; }
    console.log(`# s46: the three tiles round the bush differ from the accepted crop by ${bad} of ${box.w * box.h} pixels`);
    assert.ok(bad < box.w * box.h * 0.03, `the new bush is drawn there, as the crop (${bad} pixels differ)`);
    s = await go({ beside: b }, (q) => q.label === "Shake the bush", "s46 bush");
    assert.equal(s.label, "Shake the bush", `✓ beside it reads Shake the bush (${s.label})`);
    await step("confirm"); s = await st();
    assert.ok(s.fruit.length === 1 || s.carry === "fruit", "the bush gave a fruit");
  } finally { await g.ctx.close(); }
});

// OWNER 2026-11-27 23:3x: "yes, again, review the build, top down, and see why it's like this. must be patches over patches over patches" (render-seen-1: one seen record for every world tile, read the same on both sides of a border; the build desk's NO, rule 12).
// His 180.save (seed 24, place 146, a Call from there lifted strips in 129, 130 and 145 next door) arranged once to night (saves/180-night.save: S.day.spent 551, as the sleep-dusk saves were), at his size 412x915, by presses: hold Call for the look-around.
// s44a: the place and the strip of 145 that its Call lifted meet with no navy column or frame between them (defect 2 of the review): no column of the seam box is flat night, and the seam is as its crop (refs/s44a-seam.png, cut from this build by PLAYED_MAKE_REFS=1 once looked at);
// s44b: the same save before and after a reload (after one step out and back, so the page writes it in the record's format): the seen ground is the same, pixel for pixel, on the map and in the look-around;
// s44c: his 178.save (seed 20, cell 186, the coast), the look-around: no tile he had not seen is lit (the north rows and the south-west rows of the place, which his veil never reached, are dark) and the tiles he had seen (the west block he walked) are drawn.
{
  const size = { w: 412, h: 915, dpr: 2.625 };
  const NAVY = ([r, gg, b]) => Math.abs(r - 41) < 5 && Math.abs(gg - 37) < 5 && Math.abs(b - 58) < 5;   // the flat night of the look-around (#29253a)
  const DARKISH = ([r, gg, b]) => r < 75 && gg < 75 && b < 90;   // the veiled dark, flat or dithered: nothing of the land shows
  // the longest run of columns of the box that are flat night in at least `share` of its rows: a navy column between two lands
  const navyColumns = (im, b, share) => {
    let best = 0, run = 0;
    for (let x = b.x; x < b.x + b.w; x++) { let n = 0; for (let y = b.y; y < b.y + b.h; y++) if (NAVY(px(im, x, y))) n++; if (n >= share * b.h) { run++; if (run > best) best = run; } else run = 0; }
    return best;
  };
  const darkShare = (im, b) => { let n = 0; for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) if (DARKISH(px(im, x, y))) n++; return n / (b.w * b.h); };
  const edgesReady = (g) => g.page.waitForFunction(() => { try { return window.__play.frames.companion.contentWindow.__mb.fogEdgeReady(); } catch { return false; } }, null, { timeout: 40000 });   // the signed edge pieces are in: the look-around is then the same picture every time
  const differ = (a, b, bx, tol = 24) => { let n = 0; for (let y = bx.y; y < bx.y + bx.h; y++) for (let x = bx.x; x < bx.x + bx.w; x++) { const p = px(a, x, y), q = px(b, x, y); if (Math.abs(p[0] - q[0]) > tol || Math.abs(p[1] - q[1]) > tol || Math.abs(p[2] - q[2]) > tol) n++; } return { n, of: bx.w * bx.h, frac: n / (bx.w * bx.h) }; };
  const lookAround = async (g, name, keys = []) => { await edgesReady(g); await g.hold("call"); await wait(3000); await g.page.waitForFunction((ks) => { try { const m = window.__play.frames.companion.contentWindow.__mb; return ks.every((k) => m.placeHave(k)); } catch { return false; } }, keys, { timeout: 90000 });   // the places next door that a Call lifted are made (the case is reached)
    await wait(1000); await g.page.waitForFunction(() => { try { const m = window.__play.frames.companion.contentWindow.__mb; return m.FX.msg !== m.LAND_COMING && !m.FX.notes.some((n) => n.text === m.LAND_COMING); } catch { return false; } }, null, { timeout: 60000 }); await wait(1500); await stable(g.page, 25000); const a = await g.shot(name); await wait(700); const b = await g.shot(name + "-b"); await g.release(); await wait(1000); return [a, b]; };
  const leave = async (g) => {
    await g.press("back", 100, 2500);
    if ((await g.where()).phase === "menu") { for (let i = 0; i < 10 && await g.menuRow() !== "leave"; i++) await g.press("down"); assert.equal(await g.menuRow(), "leave", "the case is reached: the selected row is Leave this place"); await g.press("confirm", 100, 3500); }
    assert.equal((await g.where()).phase, "map", "the case is reached: he left the place for the map"); await wait(2500);
  };
  it("s44a the place and its neighbour's lifted strip meet with no navy column or frame between them (#180, night, his save, the look-around) [412x915]", async () => {
    const g = await open(size, "180-night");
    try {
      assert.deepEqual(await g.where(), { phase: "patch", x: 4, y: 4, key: "146" }, "the case is reached: his save stands in place 146");
      const r = await g.region();
      const [a, b2] = await lookAround(g, "s44a-look", ["129", "130", "145"]);
      const seam = { x: r.x + 235, y: r.y + 390, w: 45, h: 110 };   // across the west edge of the place, where the strip a Call lifted in 145 meets the place's own lit ground
      assert.ok(darkShare(a, { x: r.x + 212, y: r.y + 385, w: 26, h: 130 }) < 0.5, "the case is reached: the neighbour's lifted strip is drawn west of the seam");
      const cols = navyColumns(a, seam, 0.8);
      console.log(`# s44a: the widest run of columns of the seam box that are flat night: ${cols} device px`);
      assert.ok(cols < 4, `no navy column between the place and its neighbour: ${cols} device px of the seam are flat night (4 allowed)`);
      const wide = { x: r.x + 200, y: r.y + 360, w: 260, h: 180 };
      assert.ok(changed(a, b2, wide).frac < 0.02, "two shots of the look-around alike, so a crop can judge it");
      const c = againstRef(a, wide, "s44a-seam");
      assert.ok(c.frac < 0.03, `the seam and the ground round it are as its crop (${c.frac.toFixed(3)} differ)`);
    } finally { await g.ctx.close(); }
  });
  it("s44b the seen ground is the same before and after a reload, in the look-around and on the map (#180, his save) [412x915]", async () => {
    const g = await open(size, "180-night");
    try {
      assert.equal((await g.where()).key, "146", "the case is reached: his save stands in place 146");
      await g.press("right", 100, 900); await g.press("left", 100, 900);   // a step out and back: the page writes its save, in the record's format
      assert.deepEqual(await g.where(), { phase: "patch", x: 4, y: 4, key: "146" }, "the case is reached: he is back on his tile");
      const r = await g.region(), view = { x: r.x + 190, y: r.y + 310, w: 440, h: 270 };   // the seen ground: the lit blob of the place and its Call's strips (the dotted fog backdrop of the unrevealed cells is the map's own and is painted when its canvases are ready)
      const [lookBefore] = await lookAround(g, "s44b-look-before", ["129", "130", "145"]);
      await leave(g); const mapBefore = await g.shot("s44b-map-before");
      await g.page.reload(); await g.page.waitForFunction(() => { try { return !!window.__play.frames.companion.contentWindow.__mb.S; } catch { return false; } }, null, { timeout: 60000 }); await wait(8000);
      await g.page.getByRole("tab", { name: "Companion" }).click(); await wait(2500);
      if ((await g.where()).phase === "patch") await leave(g);   // the page may resume in the place: out to the map, as before the reload
      assert.equal((await g.where()).phase, "map", "the case is reached: after the reload he is on the map");
      const mapAfter = await g.shot("s44b-map-after");
      const m = changed(mapBefore, mapAfter, r);
      console.log(`# s44b map: ${m.n} of ${m.of} pixels differ after the reload`);
      assert.ok(m.frac < 0.01, `the map's seen ground is the same after a reload (${m.frac.toFixed(4)} differ)`);
      await g.press("confirm", 100, 3500);
      assert.equal((await g.where()).phase, "patch", "the case is reached: he is back in the place");
      const [lookAfter] = await lookAround(g, "s44b-look-after", ["129", "130", "145"]);
      const l = differ(lookBefore, lookAfter, view);
      console.log(`# s44b look-around: ${l.n} of ${l.of} pixels differ after the reload`);
      assert.ok(l.frac < 0.01, `the look-around's seen ground is the same after a reload (${l.frac.toFixed(4)} differ)`);
    } finally { await g.ctx.close(); }
  });
  it("s44c no tile he had not seen is lit in the look-around, the tiles he had seen are (#178, his save: the coast cell 186) [412x915]", async () => {
    const g = await open(size, "178");
    try {
      assert.deepEqual(await g.where(), { phase: "patch", x: 18, y: 18, key: "186" }, "the case is reached: his save stands in the coastal place");
      const r = await g.region(), T = 16;   // a tile of the look-around is 16 device px; the place's cell starts 242 px right of and 375 px below the game screen's corner
      const [a, b2] = await lookAround(g, "s44c-look");
      const cell = { x: r.x + 242, y: r.y + 375 };
      const north = { x: cell.x, y: cell.y, w: 24 * T, h: 5 * T }, southWest = { x: cell.x, y: cell.y + 22 * T, w: 17 * T, h: 6 * T }, westBlock = { x: cell.x + 5 * T, y: cell.y + 11 * T, w: 6 * T, h: 6 * T };
      const dn = darkShare(a, north), ds = darkShare(a, southWest), dw = darkShare(a, westBlock);
      console.log(`# s44c: dark share north rows ${dn.toFixed(3)}, south-west rows ${ds.toFixed(3)}, the west block he walked ${dw.toFixed(3)}`);
      assert.ok(dw < 0.4, `the case is reached: the ground he walked, west of the middle, is drawn (${dw.toFixed(3)} of it dark)`);
      assert.ok(dn > 0.99, `no tile he had not seen is lit in the north rows (${dn.toFixed(3)} dark)`);
      assert.ok(ds > 0.99, `no tile he had not seen is lit in the south-west rows (${ds.toFixed(3)} dark)`);
      const land = { x: r.x + 330, y: r.y + 340, w: 250, h: 420 };   // right of the place's first five tile columns: the cell's own edge draws one way when the cell west of it is built and another when it is not yet (the edge shapers, render-edge-1)
      assert.ok(changed(a, b2, land).frac < 0.02, "two shots of the look-around alike, so a crop can judge it");
      const c = againstRef(a, land, "s44c-west");
      assert.ok(c.frac < 0.03, `the ground west of the place is as its crop (${c.frac.toFixed(3)} differ)`);
    } finally { await g.ctx.close(); }
  });
  // render-seen-2: a built place next door with nothing of it seen takes the soft dark edge (the one seen record: no seen tile of it). His 178.save, hold Call, the look-around: where the seen ground meets the unseen cell west of it
  // (the strip at device x 250-390, wide enough to hold the cut at about 333) the first pixel that is not dark, per row, takes several positions, not one column.
  const softEdge = (im, b, dark) => {   // per row of the box the first column, scanning right, where three pixels in a row are not dark
    const e = []; for (let i = 0; i < b.h; i++) { let c = -1; for (let s = 0; s < b.w - 3; s++) if (!dark(px(im, b.x + s, b.y + i)) && !dark(px(im, b.x + s + 1, b.y + i)) && !dark(px(im, b.x + s + 2, b.y + i))) { c = s; break; } e.push(c); }
    let best = 1, run = 1; for (let i = 1; i < e.length; i++) { if (e[i] >= 0 && e[i - 1] >= 0 && Math.abs(e[i] - e[i - 1]) <= 2) { run++; if (run > best) best = run; } else run = 1; }
    return { rows: e.length, found: e.filter((c) => c >= 0).length, distinct: new Set(e.filter((c) => c >= 0)).size, longest: best };
  };
  it("s43 the seen ground meets the unseen neighbour west on the soft edge, no straight cut (#178, his save: cell 186) [412x915]", async () => {
    const g = await open(size, "178");
    try {
      assert.deepEqual(await g.where(), { phase: "patch", x: 18, y: 18, key: "186" }, "the case is reached: his save stands in the coastal place");
      const r = await g.region();
      const [a, b2] = await lookAround(g, "s43-look");
      const box = { x: r.x + 250, y: r.y + 340, w: 140, h: 420 }, e = softEdge(a, box, DARKISH);
      console.log(`# s43 178 west: ${e.found}/${e.rows} rows have ground, ${e.distinct} different edge positions, longest straight run ${e.longest} rows`);
      assert.ok(e.found > e.rows * 0.3, `the case is reached: seen ground is in the strip (${e.found}/${e.rows})`);
      assert.ok(e.distinct >= 6, `the seen ground's west edge wanders (${e.distinct} different positions)`);
      assert.ok(e.longest < 60, `no straight cut: the west edge keeps one position for ${e.longest} rows (60 allowed; the cut was 140)`);
      assert.ok(changed(a, b2, box).frac < 0.02, "two shots of the strip alike, so a crop can judge it");
    } finally { await g.ctx.close(); }
  });
}
// BUILD 2026-11-28 (ruling 8 on the code review: "drawing never reads a test flag"): the top bar draws the Probe's pulse from what the warming says, not from a test flag or the document.
// Seed 13, a fresh game (the page's ?seed=), 412x915. Played: ✓ to set out, ✓ at "Start here", ✓ into the first place; nothing is pressed after that.
// State only asserts the case is reached (in the place, the landing done). The verdict is the pixels: in the last shot the top bar is whole (the reach grid and plates, the three counters) and the frame
// went on to the bottom line; and in every frame painted over 8 s the strip beside the counters is the bar's own dark, but for the pulse's small ring (a square in the map's sand) on the frames that draw it.
// The pulse cannot be asked for by a press: the frames that carry it are counted in the log, not required.
it(`s42 in a place the top bar is drawn whole and the frame goes on to the bottom line; the Probe's pulse is the only thing that comes and goes beside the counters (seed 13) [${SIZES[0].w}x${SIZES[0].h}]`, async () => {
  const size = SIZES[0];
  const near = (c) => ([r, gg, b]) => Math.abs(r - c[0]) < 8 && Math.abs(gg - c[1]) < 8 && Math.abs(b - c[2]) < 8;
  const SAND = near([230, 201, 140]), INK = ([r, gg, b]) => r < 60 && gg < 60 && b < 80;   // the pulse's ring (#e6c98c); the bar's own dark
  const g = await open(size, { seed: 13 });
  const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S; return { phase: S.phase, key: S.exp && S.exp.patch && S.exp.patch.key, queued: m.WARM.queue.length, cold: !!m.WARM.cold }; });
  try {
    let s = await st();
    // ✓ to set out, ✓ at "Start here", ✓ into the place. The place is built by a worker, slowly on a busy machine: on the map one ✓ asks for it, and another only after 10 s without him in it
    for (let t0 = Date.now(), last = 0; !s.key && Date.now() - t0 < 150000; s = await st()) {
      if (s.phase !== "map" || Date.now() - last > 10000) { await g.press("confirm", 100, 900); last = Date.now(); } else await wait(200);
    }
    for (let t = 0; t < 600 && s.cold; t++) { await wait(100); s = await st(); }                    // and until the landing is done
    assert.ok(s.phase === "patch" && !s.cold, `the case is reached: he is in the first place and the landing is done (${JSON.stringify(s)})`);
    // every frame the browser paints for 8 s while the places next door are read (a screenshot cannot say which frame it caught); kept as they came and read one at a time below
    const cdp = await g.ctx.newCDPSession(g.page), raw = [];
    cdp.on("Page.screencastFrame", (f) => { if (raw.length < 300) raw.push(f.data); cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {}); });
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: Math.round(size.w * size.dpr), maxHeight: Math.round(size.h * size.dpr), everyNthFrame: 1 });
    let polls = 0;
    for (let t = 0; t < 80; t++) { s = await st(); if (s.queued > 0 && !s.cold) polls++; await wait(100); }
    await cdp.send("Page.stopScreencast"); await cdp.detach();
    const last = await g.shot("s42-top-bar");
    assert.equal((await st()).phase, "patch", "the case is reached: he is still in the place");
    const r = await g.region(), k = r.w / 450, box = (x, y, w, h) => ({ x: r.x + Math.round(x * k), y: r.y + Math.round(y * k), w: Math.round(w * k), h: Math.round(h * k) });
    const strip = box(120, 3, 98, 25), counters = box(222, 6, 88, 20), plates = box(6, 6, 60, 20), line = box(0, 568, 450, 30);   // beside the counters; the three counters; the reach grid and the plates; the bottom line
    let pulses = 0, other = 0, kept = false;
    for (const d of raw) {
      const buf = Buffer.from(d, "base64"), im = decodePNG(buf); if (im.width !== last.width || im.height !== last.height) continue;
      const ring = colour(im, r, SAND, strip), lit = colour(im, r, (p) => !INK(p), strip);
      if (ring.n >= 30 && ring.box.w < 15 * k && ring.box.h < 15 * k) { pulses++; if (!kept && process.env.PLAYED_SHOTS) { writeFileSync(path.join(process.env.PLAYED_SHOTS, "s42-pulse.png"), buf); kept = true; } }
      else if (lit.n > 0) other++;
    }
    const lit = { counters: colour(last, r, (p) => !INK(p), counters).n, plates: colour(last, r, (p) => !INK(p), plates).n, line: colour(last, r, (p) => !INK(p), line).n };
    console.log(`# s42: ${raw.length} frames painted in 8 s (${polls} of 80 polls found places queued): the pulse's ring is beside the counters in ${pulses}, anything else there in ${other}; in the last shot the counters hold ${lit.counters} lit pixels, the plates ${lit.plates}, the bottom line ${lit.line}`);
    assert.ok(lit.plates > 200 && lit.counters > 200, `the top bar is drawn whole: the reach grid and plates, and the three counters (${JSON.stringify(lit)})`);
    assert.ok(lit.line > 200, `the frame went on past the top bar: the bottom line is drawn (${lit.line} lit pixels)`);
    assert.equal(other, 0, "beside the counters the bar is its own dark in every frame, but for the pulse's ring");
  } finally { await g.ctx.close(); }
});
});
