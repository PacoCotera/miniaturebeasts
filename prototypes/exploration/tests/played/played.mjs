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
  it(`s5b Station Home after the Bay (QA verify-live-155): no word cut at the window's left or right edge [${tag}]`, { todo: "red, cause found (home-cut-s5b-1): ← from the Bay lands on the Vivarium screen (not Home's narrow form), drawn 1024 wide in the 530 lp window; its focus target plate.0 is at [718,244,278,34], right of the window, so panFor pans to x 478 and the left column is cut (9-12 light px at the left edge, 9-10 at the right). The face's narrow form is UI's: reported to UI" }, async () => {
    const g = await open(size, "166");
    try {
      const dock = g.page.getByRole("button", { name: /Dock the Companion/ }).first();
      console.log(`# s5b ${tag}: dock control "${await dock.getAttribute("aria-label", { timeout: 5000 }).catch(() => "?")}", caddy ${JSON.stringify(await g.page.evaluate(() => window.__play.caddy))}`);
      const bb = await dock.boundingBox({ timeout: 5000 });
      assert.ok(bb, "the case is reached: the Dock control is on screen");
      await g.page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await wait(3000);
      assert.equal(await g.page.evaluate(() => window.__play.owner), "station", "the case is reached: the Station is in view after Dock");
      const state = () => g.page.evaluate(() => ({ pan: window.__play.pan, focus: window.__play.focus, plan: window.__play.plan }));
      const bay = await state();
      console.log(`# s5b ${tag}: in the Bay: pan ${JSON.stringify(bay.pan)} focus ${JSON.stringify(bay.focus)}`);
      for (let i = 1; i <= 3; i++) {                        // ← back to Home (the screen read after each press, only to say where the case stands)
        await g.press("back", 100, 2000);
        const s = await state(); console.log(`# s5b ${tag}: after ← x${i}: screen ${s.focus.screen} pan ${JSON.stringify(s.pan)} focus ${JSON.stringify(s.focus)} view ${JSON.stringify(s.plan.view)}`);
        if (s.focus.screen !== "cargo") break;
      }
      const st = await state(), plan = st.plan, d = size.dpr, sc = plan.screen;
      const fp = await g.page.evaluate(() => { try { const p = window.__play.frames.station.contentWindow.__st.props; return p && p.focus ? { cur: p.focus.cur, narrow: p.narrow, screen: p.screen, ids: p.focus.targets.map((t) => t.id) } : null; } catch (e) { return String(e); } });
      console.log(`# s5b ${tag}: the face's focus (props): ${JSON.stringify(fp)}`);
      const im = await g.shot(`s5b-${tag}-home`);
      const reg = { x: Math.round(sc.x * d), y: Math.round(sc.y * d), w: Math.round(sc.w * d), h: Math.round(sc.h * d) };
      const light = ([R, G, B]) => R > 200 && G > 200 && B > 190;
      const edge = (x0) => colour(im, reg, light, { x: x0, y: reg.y, w: 3, h: reg.h }).n;
      const all = colour(im, reg, light), lp = (x) => Math.round(st.pan.x + (x - reg.x) / d / 0.6);   // device px on the shot -> lp on the face
      console.log(`# s5b ${tag}: Home: screen ${JSON.stringify(sc)} view ${JSON.stringify(plan.view)} narrow ${plan.narrow} (NARROW_W 530); pan ${JSON.stringify(st.pan)}; focus ${JSON.stringify(st.focus)}; light words span lp ${all.box ? lp(all.box.x) + ".." + lp(all.box.x + all.box.w - 1) : "none"}; light px at the left edge ${edge(reg.x)}, at the right ${edge(reg.x + reg.w - 3)}`);
      assert.ok(edge(reg.x) <= 3 && edge(reg.x + reg.w - 3) <= 3, `no light word-pixels touch the window's edges (left ${edge(reg.x)}, right ${edge(reg.x + reg.w - 3)})`);
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
      const at = await g.where();
      assert.deepEqual([at.phase, at.x, at.y], ["patch", 21, 0], "the case is reached: he stands at the top edge");
      const r = await g.region(), base = await g.shot();
      // the hero is the biggest orange blob of the play field (below the HUD strip); the menu's orange selection bar and the HUD icons are other blobs and are never counted
      const field = { x: r.x, y: r.y + Math.round(r.h * 0.12), w: r.w, h: r.h - Math.round(r.h * 0.12) };
      const hero = blobs(base, field, HERO)[0];
      assert.ok(hero && hero.n > 300, `the reference shows the hero (${hero ? hero.n : 0} pixels)`);
      const pad = 6, hb = { x: hero.box.x - pad, y: hero.box.y - pad, w: hero.box.w + 2 * pad, h: hero.box.h + 2 * pad };
      await g.press("back");                                // ← opens the menu
      const menuBlobs = blobs(await g.shot(`s3-${tag}-menu`), hb, HERO), menu = menuBlobs[0] || { n: 0, box: null };
      console.log(`# s3 ${tag}: hero ${hero.n} px, menu ${menu.n} (${menuBlobs.length} blob(s) at his place)`);
      assert.ok(menu.n >= hero.n * 0.6, `the hero is on screen with the menu open (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.n <= hero.n * 1.2, `the orange counted with the menu open is the hero's, not the menu's selection bar (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.box && Math.abs(menu.box.x - hero.box.x) <= 4 && Math.abs(menu.box.y - hero.box.y) <= 4 && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange blob with the menu open sits where the hero stands (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
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
      for (let i = 0; i < 14 && !s.curled; i++) { await step("confirm"); s = await st(); }   // her bedtime play runs its beats as the light passes: ✓ Keep still until she has settled curled
      assert.ok(s.phase === "patch" && s.curled && s.on && s.herAt[1] === s.at[1] && s.herAt[0] < s.at[0], `the case is reached: in the place, she is curled and on the screen, he is facing her (${JSON.stringify(s)})`);
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
  // Arranged saves: slab-mark-hold and slab-mark-room are slab-full-hold and slab-full-room with the place marked explored (S.called; the glints show only in an explored place, 60% of it seen: the walk here does not reach that). Played by presses: push with the hold full, walk away and back; the old tile glints like every takeable (find-glint-1's pixels within 1.6 s); the hold has room, ✓ takes it, and over the next 1.6 s no glint there.
  // State only asserts the reach (what is left under the slab: > 0, then 0) and gives the old tile's position; the verdict is the pixels of the tile on the shots.
  // The light tints the glint's colours, so the verdict is the blink itself: pixels of the old tile that are warm (find-glint-1 is tan, orange and yellow; the rain is blue, the slab's dashes brown) in some shots of 1.6 s and not warm in others. The glint is on for 400 ms of every 1.6 s.
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
      assert.ok(on >= 100, `the old tile glints while something lies under the slab (${on} pixels of find-glint-1)`);
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
      assert.ok(on >= 100, `the old tile glints before the take (${on} pixels)`);
      assert.ok(off < 20, `no glint on the old tile over 1.6 s after the take (${off} pixels)`);
    } finally { await g.ctx.close(); }
  });

  // QA verify-live-154 (bus e96853af12), his #166 save: "the menu box can still COVER the hero: 412x915-B-left-edge has him on the rock at x~410 of the view, B-left-menu puts the box on the right half over him, so he reads as gone. The box should take the side he is not on." (menu-side-hero-1)
  // QA's walk by presses (runB.mjs): up, right, down, left, each until he stops; then ← opens the menu. State only asserts the case is reached (the place, the pawn on the view in the 192-258 band); the verdict is the shot: the hero's orange pixels whole, as many as before the menu, on the same spot.
  if (size.w === 412) it(`s19 the menu box beside the hero (QA verify-live-154, his #166 save, the left edge of the rock field): ← opens the menu and his pixels are whole on the screen, not under the box [${tag}]`, async () => {
    const g = await open(size, "166");
    try {
      const at = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, P = m.S.exp.patch, p = m.RT.plScr; return { phase: m.S.phase, key: P && P.key, x: P && P.x, y: P && P.y, px: p && p.x, py: p && p.y }; });
      for (const dir of ["up", "right", "down", "left"]) {
        let same = 0, last = JSON.stringify(await at());
        for (let i = 0; i < 40 && same < 2; i++) { await g.press(dir, 100, 500); const now = JSON.stringify(await at()); same = now === last ? same + 1 : 0; last = now; }
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
      assert.equal((await at()).phase, "menu", "the case is reached: the menu is open");
      const menu = blobs(await g.shot(`s19-${tag}-menu`), hb, HERO)[0] || { n: 0, box: null };
      console.log(`# s19 ${tag}: hero ${hero.n} px before the menu, ${menu.n} with it open`);
      assert.ok(menu.n >= hero.n * 0.95, `the hero's pixels are whole with the menu open, the box is not over him (${menu.n} of ${hero.n} pixels)`);
      assert.ok(menu.box && Math.abs(menu.box.x - hero.box.x) <= 4 && Math.abs(menu.box.y - hero.box.y) <= 4 && Math.abs(menu.box.w - hero.box.w) <= 6 && Math.abs(menu.box.h - hero.box.h) <= 6, `the orange at his place is his whole figure (${JSON.stringify(menu.box)} vs ${JSON.stringify(hero.box)})`);
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
    const g = await open(size, "147");
    try {
      const top = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, t = m.targetLine(); return { text: t && t.text, band: m.S.phase }; });
      await g.shot(`s32-${tag}-0-band`);                    // read by eye: the whole screen, the band under the top bar
      assert.ok(top.text, `the case is reached: the target line shows on his save (${JSON.stringify(top)})`);
      assert.match(top.text, / · last seen (here|(north|south)(-(east|west))?|east|west)(, in the [a-z ]+)?$/, `the line reads as words with the full direction, not 'place · W' (${top.text})`);
      assert.ok(!top.text.includes("…"), "the line is whole, not clipped");
    } finally { await g.ctx.close(); }
    if (size.w !== 412) return;
    const g2 = await open({ w: 390, h: 844, dpr: 3 }, "147");   // the second size of the stills
    try {
      const t2 = await g2.page.evaluate(() => window.__play.frames.companion.contentWindow.__mb.targetLine());
      await g2.shot("s32-390x844-0-band");
      assert.ok(t2 && /last seen/.test(t2.text) && !t2.text.includes("…"), `the line reads as words, whole, at 390x844 (${t2 && t2.text})`);
    } finally { await g2.ctx.close(); }
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

  // OWNER 2026-11-24 15:5x on #156: "in the wild you should be able to see the name". QA verify-live-649, seed 14 (saves/14.save, made from a fresh seed-14 game by QA's presses C-01..C-13: ✓ x3 to set out, ← twice, right x3):
  // Burr stands under a tree crown and her bone name tag was clipped to "r" (412x915-C-13-right). The verdict is the tag's pixels on the shot: the bone frame whole, all four sides, with the name inside.
  it(`s12 a wild name tag over a crown (#156, seed 14): Burr's bone tag is whole on the screen, a crown never hides part of it [${tag}]`, async () => {
    const g = await open(size, "14");
    try {
      const at = await g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp.patch, her = m.herInSight(); return { phase: S.phase, x: P && P.x, y: P && P.y, her, name: her != null ? S.named[her] : null }; });
      assert.deepEqual([at.phase, at.x, at.y, at.name], ["patch", 15, 25, "Burr"], `the case is reached: he walks the patch with Burr in sight (${JSON.stringify(at)})`);
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
  const st = () => g.page.evaluate(() => { const m = window.__play.frames.companion.contentWindow.__mb, S = m.S, P = S.exp && S.exp.patch; const c = P && m.curLive().cr.find(q => q.ind && q.ind.name === "Osier"); let t = null; try { t = m.targetLine(); } catch {} return { phase: S.phase, key: P && P.key, x: P && P.x, y: P && P.y, hb: !!(c && c.hb), named: !!(c && S.named && S.named[c.id]), open: !!(c && P && S.veil && S.veil[P.key] && (Number(S.veil[P.key][c.y]) & (1 << c.x)) !== 0), top: !!(t && c && String(t.id) === String(c.id)), dx: c && P ? c.x - P.x : null, dy: c && P ? c.y - P.y : null, ts: m.RT.ts, pl: m.RT.plScr }; });
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
});
