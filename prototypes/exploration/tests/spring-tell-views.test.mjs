// The spring's tell is the same in every view (owner report, Companion walk 2026-11-09): puddles on the clue tiles, fixed to those tiles in world space, in the walking view wherever the
// explorer stands (not within some radius of it), through a change of cell, in the whole-place looks, the reach view and the full map, until the spring is found.
// Real Chromium (PW_DIR names the folder holding node_modules/playwright; skipped without it).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodePng } from "../../places/src/png.mjs";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";
async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html` };
}
async function enter(browser, url, seed) {   // reduced motion: still frames, the camera cuts
  const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(300);   // the arrival look away
  return { page, ctx, errors };
}
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
const RIVER = 0x3084d8;
const px = (img, x, y) => { const i = (y * img.w + x) * 4; return (img.data[i] << 16) | (img.data[i + 1] << 8) | img.data[i + 2]; };
const rivers = (img, x0, y0, w, h) => { let n = 0; for (let y = Math.max(0, y0); y < Math.min(img.h, y0 + h); y++) for (let x = Math.max(0, x0); x < Math.min(img.w, x0 + w); x++) if (px(img, x, y) === RIVER) n++; return n; };
// the clue tiles that lie fully in the walking view, with the puddle pixels on each (river pixels in the tile's puddle box)
async function walkPuddles(page) {
  const img = await still(page);
  const o = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, h = m.heartOf(P.key), cam = m.camNow(); return { cam, clues: m.springClues(h).map((q) => ({ x: q.x, y: q.y })), at: { x: P.x, y: P.y }, heart: { x: h.x, y: h.y } }; });
  return o.clues.map((q) => { const tx = q.x * 48 - o.cam.x, ty = 32 + q.y * 48 - o.cam.y, inView = tx >= 0 && ty >= 32 && tx + 48 <= 450 && ty + 48 <= 564; return { q, inView, n: inView ? rivers(img, tx + 8, ty + 10, 34, 30) : null, tx, ty }; });
}
// a walkable tile in whose view a clue lies though the spring is more than 9 tiles away
const farSpot = (page) => page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, h = m.heartOf(P.key), lay = m.layout(P.key), save = { x: P.x, y: P.y }, tiles = [];
  for (let y = 0; y < lay.h; y++) for (let x = 0; x < lay.w; x++) if (lay.reach[y * lay.w + x] && !m.T_BLOCK[lay.tiles[y * lay.w + x]]) tiles.push({ x, y });
  for (const t of tiles) { if (Math.hypot(t.x - h.x, t.y - h.y) <= 9.5) continue; P.x = t.x; P.y = t.y; m.RT.ca = null; const cam = m.camStep();
    if (m.springClues(h).some((q) => q.x * 48 >= cam.x && (q.x + 1) * 48 <= cam.x + 450 && q.y * 48 >= cam.y && (q.y + 1) * 48 <= cam.y + 532)) { P.x = save.x; P.y = save.y; m.RT.ca = null; return { x: t.x, y: t.y, d: Math.hypot(t.x - h.x, t.y - h.y) }; } }
  P.x = save.x; P.y = save.y; m.RT.ca = null; return null; });

test("the spring's puddles stay on their clue tiles: the same ones near the spring, far from it, and after leaving and coming back into the cell", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, ctx, errors } = await enter(browser, url, 6);
    const info = await page.evaluate(() => window.__mb.TEST.tellStill("spring", 5));
    assert.ok(info && info.clues.length >= 2, "a spring with clue tiles");
    await page.waitForTimeout(500);
    const near = await walkPuddles(page), inNear = near.filter((c) => c.inView);
    assert.ok(inNear.length >= 2, "clue tiles in view near the spring: " + inNear.length);
    for (const c of inNear) assert.ok(c.n >= 20, `near: clue ${c.q.x},${c.q.y} carries a puddle (${c.n})`);
    // the explorer far from the spring (more than the old 8-tile radius): the clues in view carry the same puddles
    const far = await farSpot(page); assert.ok(far, "a spot along the way with a clue in view and the spring more than 9 tiles off");
    await page.evaluate((f) => { const P = window.__mb.S.exp.patch; P.x = f.x; P.y = f.y; }, far); await page.waitForTimeout(500);
    const away = (await walkPuddles(page)).filter((c) => c.inView);
    assert.ok(away.length >= 1, "a clue in view from far away");
    for (const c of away) assert.ok(c.n >= 20, `far (${far.d.toFixed(1)} tiles): clue ${c.q.x},${c.q.y} carries a puddle (${c.n})`);
    // while the explorer moves a step, a puddle's world place does not change: the picture of the tile moves only with the camera
    const before = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { x: P.x, y: P.y, clues: JSON.stringify(m.springClues(m.heartOf(P.key))) }; });
    await page.evaluate(() => window.__mb.act("down")); await page.waitForTimeout(300);
    const moved = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { x: P.x, y: P.y, clues: JSON.stringify(m.springClues(m.heartOf(P.key))) }; });
    assert.equal(moved.clues, before.clues, "the clue list does not depend on where the explorer stands");
    for (const c of (await walkPuddles(page)).filter((c) => c.inView)) assert.ok(c.n >= 20, `after a step: clue ${c.q.x},${c.q.y} carries a puddle (${c.n})`);
    // leave the place and come back in: the same clues, the same puddles
    const list0 = before.clues;
    await page.evaluate(() => { const m = window.__mb; m.leavePatch(); }); await page.waitForTimeout(300);
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(500);
    await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); }); await page.waitForTimeout(400);
    const again = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; return { phase: m.S.phase, clues: JSON.stringify(m.springClues(m.heartOf(P.key))) }; });
    assert.equal(again.phase, "patch"); assert.equal(again.clues, list0, "the same clue tiles after the change of cell");
    const far2 = await farSpot(page);
    if (far2) { await page.evaluate((f) => { const P = window.__mb.S.exp.patch; P.x = f.x; P.y = f.y; }, far2); await page.waitForTimeout(500); }
    const back = (await walkPuddles(page)).filter((c) => c.inView);
    assert.ok(back.length >= 1, "a clue in view after coming back");
    for (const c of back) assert.ok(c.n >= 20, `after the change of cell: clue ${c.q.x},${c.q.y} carries a puddle (${c.n})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});

test("the whole-place look, the reach view and the full map carry the same puddles on the same clue tiles, and all stop once the spring is found", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, ctx, errors } = await enter(browser, url, 6);
    const info = await page.evaluate(() => window.__mb.TEST.tellStill("spring", 5)); assert.ok(info && info.clues.length >= 2);
    await page.waitForTimeout(400);
    const cell = await page.evaluate(() => { const m = window.__mb; return m.layout(m.S.exp.patch.key).cell; });
    const found = (on) => page.evaluate(([on, cell]) => { const m = window.__mb; if (on) m.S.called[cell] = 1; else delete m.S.called[cell]; }, [on, cell]);
    // the whole-place look (Look around): puddles at 24 px
    await page.evaluate(() => { const m = window.__mb; m.startView("look", m.layout(m.S.exp.patch.key)); }); await page.waitForTimeout(400);
    const lookOn = await still(page); await found(true); await page.waitForTimeout(300); const lookOff = await still(page);
    await found(false); await page.evaluate(() => window.__mb.endView()); await page.waitForTimeout(300);
    const heartMark = (() => { const f = decodePng(readFileSync(new URL("../art/look/look-heart-spring.png", import.meta.url))); let n = 0; for (let i = 0; i < f.w * f.h; i++) if (f.data[i * 4 + 3] && px({ w: f.w, data: f.data }, i % f.w, (i / f.w) | 0) === RIVER) n++; return n; })();   // the found spring wears the desk's heart mark, which has blue of its own
    assert.ok(rivers(lookOn, 0, 32, 450, 532) - rivers(lookOff, 0, 32, 450, 532) + heartMark >= 6 * info.clues.length, "the look shows a puddle per clue: " + (rivers(lookOn, 0, 32, 450, 532) - rivers(lookOff, 0, 32, 450, 532) + heartMark));
    // the reach view: the puddles on the clue tiles inside the cell
    await page.evaluate(() => { const m = window.__mb; m.S.phase = "map"; m.S.ui.mapFull = false; }); await page.waitForTimeout(400);
    const geom = await page.evaluate(() => { const m = window.__mb, q = m.reachGeom(), ex = m.S.exp, i = q.r, j = q.r; return { x: q.dx + i * q.cs, y: q.dy + j * q.cs, cs: q.cs }; });
    const spots = await page.evaluate(([c, g]) => window.__mb.mapPuddleSpots(c, g.x, g.y, g.cs), [cell, geom]);
    assert.ok(spots && spots.spots.length === info.clues.length, "one puddle per clue tile on the map cell");
    const reachOn = await still(page); await found(true); await page.waitForTimeout(300); const reachOff = await still(page); await found(false);
    for (const s of spots.spots) {
      const w = Math.round(18 * spots.sc) + 1, h = Math.round(7 * spots.sc) + 2, on = rivers(reachOn, Math.round(s.x), Math.round(s.y), w, h), off = rivers(reachOff, Math.round(s.x), Math.round(s.y), w, h);
      assert.ok(on >= 1 && on > off, `reach view: a puddle on the clue tile at ${Math.round(s.x)},${Math.round(s.y)} (${on} vs found ${off})`);
    }
    // the full map
    await page.evaluate(() => { const m = window.__mb; m.S.ui.mapFull = true; m.S.phase = "map"; }); await page.waitForTimeout(400);
    // (on a place the pawn does not stand in: the pawn's marker covers its own cell at this size)
    const other = await page.evaluate((cell) => { const e = window.__mb.mapSigns().find((q) => q.c !== cell && q.list.some((s) => s.kind === "sh")); return e ? e.c : null; }, cell);
    assert.ok(other != null, "another place's spring tell is on the full map");
    const foundAt = (on) => page.evaluate(([on, c]) => { const m = window.__mb; if (on) m.S.called[c] = 1; else delete m.S.called[c]; }, [on, other]);
    const fullOn = await still(page); await foundAt(true); await page.waitForTimeout(300); const fullOff = await still(page); await foundAt(false);
    const fg = await page.evaluate((c) => { const m = window.__mb; return { x: m.MAP_X + (c % m.MW) * m.CELL, y: m.MAP_Y + Math.floor(c / m.MW) * m.CELL, cs: m.CELL }; }, other);
    const fspots = await page.evaluate(([c, g]) => window.__mb.mapPuddleSpots(c, g.x, g.y, g.cs), [other, fg]);
    assert.ok(fspots && fspots.spots.length >= 1);
    let shown = 0;   // (another sign on the same cell, the slow beat here, may cover one of two puddles at this size)
    for (const s of fspots.spots) { const on = rivers(fullOn, Math.round(s.x), Math.round(s.y), 6, 3), off = rivers(fullOff, Math.round(s.x), Math.round(s.y), 6, 3); if (on >= 1 && on > off) shown++; }
    assert.ok(shown >= 1, "full map: a puddle on a clue tile of the cell, gone once found: " + shown);
    assert.deepEqual(errors, []);
    await ctx.close();
  } finally { await browser.close(); server.close(); }
});
