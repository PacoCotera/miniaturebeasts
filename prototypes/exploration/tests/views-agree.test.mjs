// The map, the reach view and the cell show the same land (owner, 2026-11-08: "i entered this cell, once inside, there's no stair to go to the terrace north. the map generation has serious
// problems. it's not consistent across its different zoom levels"). The world has one truth for each edge of a cell (open, stair, cliff, scree or bank, water, the map's end; src/world.mjs
// sideKind) and every view draws it. tools/views-audit.mjs compares it with what each cell's layout draws and lets you cross; this runs it over the seeds and pins the owner's case.
//   node --test prototypes/exploration/tests/views-agree.test.mjs        (the full sweep of every biome: node prototypes/exploration/tools/views-audit-run.mjs 1 200 --every)
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePage } from "./page-harness.mjs";
import { genWorld, softGround, bankEdges, genPlace, ALL_BIOMES, T, TERR } from "../src/world.mjs";
import { newTally, auditPage, auditGenerated, setGenPlace, report } from "../tools/views-audit.mjs";
import { decodePng, newImage, paste } from "../../places/src/png.mjs";
import { compareGolden } from "../../places/src/golden.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const skip = !chromium && "playwright is not installed (set PW_DIR)";
const root = path.resolve(here, "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };

test("the audit: every cell of generator 6 (baked places), seeds 1-200, every edge the world has is drawn in the cell and crossable as the map says: 0 mismatches", () => {
  const t = newTally(), page = makePage({ gen: 6, console: "silent" });
  for (let seed = 1; seed <= 200; seed++) auditPage(page, seed, ALL_BIOMES[seed % ALL_BIOMES.length], t);
  assert.ok(t.cells > 50000 && t.sides > 200000, "the sweep covers the worlds: " + t.cells + " cells");
  assert.equal(t.bad, 0, "\n" + report(t, "generator 6, seeds 1-200"));
});

test("the audit: the generated places (generator 2 and 5, and the fords of 6) agree with the map too, seeds 1-40", () => {
  setGenPlace((G, seed, c) => genPlace(G, seed, String(c)));
  for (const gen of [2, 5]) {
    const t = newTally();
    for (let seed = 1; seed <= 40; seed++) { const biome = ALL_BIOMES[seed % ALL_BIOMES.length], G = genWorld(seed, gen, biome); G.soft = softGround(G, seed); G.banks = bankEdges(G, seed); auditGenerated(G, seed, biome, t); }
    assert.equal(t.bad, 0, "\n" + report(t, "generator " + gen));
  }
});

test("a layout is one thing however it was got: built cold, from the cache, or again after the cache is cleared (the warmed one is the walked one)", () => {
  const p = makePage({ gen: 6, console: "silent" });
  for (const seed of [9, 1, 13]) {
    p.run(`(() => { G = worldOf(${seed}, 6, 'mixed'); S.seed = ${seed}; S.gen = 6; layoutCache.clear(); })()`);
    const keys = p.run("(() => { const out = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER) out.push(String(c)); return out; })()");
    const sig = (k) => p.run(`(() => { const l = layout('${k}'); return [l.tiles.join(), l.terr.join(), l.tmask.join(), JSON.stringify(l.stairs), JSON.stringify(l.cross || null), JSON.stringify(l.openings), l.rim.join(), l.cut.props.length, l.cut.canopy.length].join('|'); })()`);
    const first = new Map(keys.map((k) => [k, sig(k)]));
    for (const k of keys.slice(0, 60)) assert.equal(p.run(`layout('${k}') === layout('${k}')`), true, "the cache hands out the one layout");
    p.run("layoutCache.clear()");
    for (const k of keys) assert.equal(sig(k), first.get(k), `seed ${seed} cell ${k}: the layout built again is the first`);
  }
});

// The owner's case: a wood cell whose north edge is a stair up to a terrace (seed 9, cell 268). The reach view and the cell, side by side, both show it; so does the whole place.
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
const still = async (page) => decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
// A picture is taken once the page has drawn several frames of the state it was put in (a loaded machine draws late): a pause, then eight frames.
const settle = async (page) => { await page.waitForTimeout(500); await page.evaluate(async () => { const m = window.__mb, f0 = m.RT.frameN, t0 = performance.now(); while (m.RT.frameN < f0 + 8 && performance.now() - t0 < 10000) await new Promise((r) => requestAnimationFrame(r)); }); };

test("the owner's case: the reach view shows the stair on the wood cell's north edge, and so do the cell and the whole place (one picture, three views)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const { server, url } = await serve();
  try {
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=9`); await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__mb.TEST.calm = true; });
    for (let i = 0; i < 4; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
    await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
    const CELL = 268;
    const world = await page.evaluate((c) => { const m = window.__mb; return { land: m.G.land[c], north: m.edgeKind(c, "up") }; }, CELL);
    assert.deepEqual(world, { land: 3, north: 2 }, "a wood cell with a ramp edge to the north");
    await page.evaluate((c) => { const m = window.__mb, ex = m.S.exp; if (ex.patch) m.leavePatch(); ex.pos = c; ex.start = c; ex.lastDir = null; ex.face = "up";
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const X = (c % m.MW) + dx, Y = ((c / m.MW) | 0) + dy; if (X >= 0 && Y >= 0 && X < m.MW && Y < m.MH) { m.S.revealed[Y * m.MW + X] = 1; if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) m.S.visited[Y * m.MW + X] = 1; } } }, CELL);
    await settle(page);
    const reach = await still(page);
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
    const lay = await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, l = m.layout(P.key), st = l.stairs.find((q) => q.dir === "up");
      P.x = st.entry.x; P.y = st.entry.y; P.dir = "up"; m.RT.ca = null;   /* the camera starts from its first rest for this tile, however the pawn got here */ m.S.veil[P.key] = new Array(l.h).fill(0x0fffffff);
      let stairTiles = 0; for (let x = 0; x < l.w; x++) for (let y = 0; y < 3; y++) if (l.terr[y * l.w + x] === 5) stairTiles++;
      return { stair: st, stairTiles, walkable: !m.T_BLOCK[l.tiles[st.entry.y * l.w + st.entry.x]] && l.reach[st.entry.y * l.w + st.entry.x] === 1, rim: l.rim.length }; });
    assert.equal(lay.stair.dir, "up"); assert.ok(lay.stairTiles >= 2, "the stair is drawn in the cell, on the north border"); assert.ok(lay.walkable, "and it is walkable from the way in");
    await settle(page);
    const cell = await still(page);
    // the stair crosses: one step up from its entry leaves the cell for the next one north
    await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; P.y = 0; });
    await page.evaluate(() => window.__mb.act("up")); await page.waitForTimeout(400);
    assert.equal(await page.evaluate(() => window.__mb.S.phase), "map", "walking up the stair leaves the cell northward");
    assert.equal(await page.evaluate(() => window.__mb.S.exp.pos), CELL - 16);
    await page.evaluate((c) => { const m = window.__mb, ex = m.S.exp; ex.pos = c; ex.lastDir = null; }, CELL);
    await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(800);
    await page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); m.startView("look", m.layout(m.S.exp.patch.key)); });
    await settle(page);
    const whole = await still(page);
    const img = newImage(450 * 3, 600); paste(img, reach, 0, 0); paste(img, cell, 450, 0); paste(img, whole, 900, 0);
    const r = compareGolden(path.join(here, "golden", "views-agree-stair.png"), img);
    assert.ok(r.ok, r.message);
    assert.deepEqual(await page.evaluate(() => window.__mb.offPalette().bad), []);
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
