// Walk content B3: an opening never promises a way that is closed. Set out from the start of seed 13, a cell a few steps off (found by the test) has its south opening past the Probe's range and another open; a side the map
// calls a cliff or water has no opening at all (views agree). The range line: the tiles past it are not walked (the reason, nothing spent), the words come within 2 tiles of it,
// and the Probe's reach (tier, a Tuliko along) moves it. The line is the desk's edge veil (places/veil): a golden at 1x.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePage } from "./page-harness.mjs";
import { sideKind } from "../src/world.mjs";
import { decodePng } from "../../places/src/png.mjs";
import { compareGolden } from "../../places/src/golden.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));
const SEED = 13;
const fresh = (tier) => { const p = makePage({ gen: 7, console: "collect" }); p.run(`newWorld(${SEED}); TEST.calm = true; S.tier = ${tier}; startExpedition('weather', G.spawns[0]);`); return p; };
// The cells the tests stand in are found in the world, not named: RC, a cell two to four steps from the start whose south opening is past the Probe's range at tier 1 and open at tier 2, with another
// opening open and the column below the south opening's middle clear to walk; WCELL, a cell whose north side is wide water. WIDE is a range that opens everything.
const WIDE = 9;
const kindsAt = (p, c) => plain(p.run(`(() => { S.exp.pos = ${c}; enterPatch(); if (RT.view) endView(); const lay = layout('${c}'); const k = lay.openings.map(o => o.side + ':' + openingKind(lay, o).kind); leavePatch(); return k; })()`));
const { RC, WCELL, R1 } = (() => {
  const p1 = fresh(1), p2 = fresh(2), start = p1.run("G.spawns[0]");
  const near = plain(p1.run(`(() => { const s = cxy(${start}), o = []; for (let c = 0; c < MW * MH; c++) { if (!G.comp[c] || G.land[c] === L.WATER || G.island[c]) continue; const q = cxy(c), d = Math.abs(q.x - s.x) + Math.abs(q.y - s.y); if (d >= 2 && d <= 4) o.push([d, c]); } return o.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(a => a[1]); })()`));
  const clear = (p, c) => p.run(`(() => { S.exp.pos = ${c}; enterPatch(); if (RT.view) endView(); const lay = layout('${c}'), o = lay.openings.find(q => q.side === 'S'); let ok = !!o; if (o) { const x = (o.from + o.to) >> 1; for (let y = lay.h - 9; y <= lay.h - 3 && ok; y++) if (T_BLOCK[lay.tiles[y * lay.w + x]] || lay.feats.some(f => f.x === x && f.y === y) || occupant(lay.key, x, y, "player")) ok = false; } leavePatch(); return ok; })()`);
  let rc = null;
  for (const c of near) {
    const k1 = kindsAt(p1, c); if (!k1.includes("S:range") || !k1.some((k) => k.endsWith(":open"))) continue;
    if (kindsAt(p2, c).includes("S:range") || !clear(p1, c)) continue;
    rc = c; break;
  }
  const G = p1.run("G"), land = plain(p1.run("(() => { const o = []; for (let c = 0; c < MW * MH; c++) if (G.comp[c] && G.land[c] !== L.WATER && !G.island[c]) o.push(c); return o; })()"));
  let wc = null;
  for (const c of land) {
    if (sideKind(G, c, "up") !== "water") continue;
    const ok = p1.run(`(() => { S.exp.pos = ${c}; enterPatch(); if (RT.view) endView(); const l = layout('${c}'); const wet = [...l.tiles.slice(0, l.w * 2)].filter(t => t === T.WATER).length, n = l.openings.some(o => o.side === 'N'); leavePatch(); return !n && wet > l.w; })()`);
    if (ok) { wc = c; break; }
  }
  return { RC: rc, WCELL: wc, R1: p1.run("S.exp.range") };
})();
const down = (tier = 1) => { const p = fresh(tier); p.run(`var RC = '${RC}', WCELL = '${WCELL}'; S.found.push('callintro'); S.exp.pos = RC; enterPatch(); if (RT.view) endView(); FX.hintNote = null; FX.msg = ''; FX.notes = []; FX.lockUntil = 0;`); return p; };
const kinds = (p) => plain(p.run("(() => { const lay = layout(RC); return lay.openings.map(o => o.side + ':' + openingKind(lay, o).kind); })()"));

test("each opening is classified at entry: the south one past the range, another open; tier 2 opens the south one; a side the map calls cliff or water has no opening", () => {
  assert.ok(RC != null, "a cell near the start with a south opening past the range was found");
  const k1 = kinds(down(1)), k2 = kinds(down(2));
  assert.ok(k1.includes("S:range"), "south past the range at tier 1: " + k1); assert.ok(k1.some((k) => k.endsWith(":open")), "and another side open: " + k1);
  assert.ok(!k2.includes("S:range") && k2.includes("S:open"), "the Probe's reach moves the line: " + k2);
  // a Tuliko along adds rings of reach: the same effect through ex.range, whatever its source
  const p = down(1); p.run(`S.exp.range = ${WIDE}; applyLines(layout(RC));`);
  assert.deepEqual(plain(p.run("layout(RC).lines.ops.map(o => o.side + ':' + o.kind)")), []);
  // the map's truth for a side: a cliff or water side has no way in (views agree)
  const G = p.run("G"), sides = plain(p.run("layout(RC).openings.map(o => o.side)")), dir = { N: "up", S: "down", W: "left", E: "right" };
  for (const s of sides) assert.ok(!["cliff", "water"].includes(sideKind(G, Number(RC), dir[s])), "an opening on " + s + " names a side the map calls " + sideKind(G, Number(RC), dir[s]));
});

test("the veil's depth: the whole side 3 cells deep (3, 2, 1), drawn back 3, 2, 1, gone at 200 ms a step before its cells open; reduced motion is a cut; a side that closes lays it the same way", () => {
  const lv = (p) => plain(p.run("(() => { const l = layout(RC); const on = l.lines && l.lines.ops.some(o => o.kind === 'range' && o.side === 'S'); const n = on ? hazeDepth(l, 'S') : 0; return { rows: [0, 1, 2, 3].map(d => (d < n ? 3 - d : 0)) }; })()"));
  const p = down(1);
  assert.deepEqual(lv(p).rows, [3, 2, 1, 0], "the south side: the edge row 3, then 2, then 1");
  const blocked = (q) => plain(q.run("(() => { const l = layout(RC); return [...l.lines.cells.keys()].filter(i => (i / l.w | 0) >= l.baked.oy + l.baked.h - 3 && l.lines.cells.get(i).kind === 'range').length; })()"));
  assert.ok(blocked(p) > 6, "the whole side is blocked, not only the gap's 6 cells: " + blocked(p));
  p.run(`RM.matches = false; NOW = 1000; S.exp.range = ${WIDE}; hazeSync(layout(RC));`);   // the reach grows: draw back
  assert.equal(p.run("layout(RC).hazeAnim.S.dir"), -1);
  const at = (ms) => { p.run(`NOW = ${1000 + ms}; hazeSync(layout(RC));`); return lv(p).rows.join(); };
  assert.equal(at(0), "3,2,1,0"); assert.equal(at(210), "3,2,0,0"); assert.equal(at(410), "3,0,0,0");
  assert.equal(p.run("layout(RC).lines.ops.some(o => o.side === 'S')"), true, "still counted past the line until it is gone");
  assert.equal(at(610), "0,0,0,0");
  assert.equal(p.run("layout(RC).lines.ops.some(o => o.side === 'S')"), false, "then the cells open");
  assert.equal(p.run("layout(RC).hazeAnim.S"), undefined);
  // reduced motion: a cut
  const q = down(1); q.run(`RM.matches = true; S.exp.range = ${WIDE}; hazeSync(layout(RC));`);
  assert.equal(q.run("layout(RC).lines.ops.some(o => o.side === 'S')"), false);
  // it lays again, growing 1, 2, 3
  p.run(`S.exp.range = ${R1}; NOW = 5000; hazeSync(layout(RC));`);
  assert.equal(p.run("layout(RC).hazeAnim.S.dir"), 1);
  const grow = (ms) => { p.run(`NOW = ${5000 + ms}; hazeSync(layout(RC));`); return lv(p).rows.join(); };
  assert.equal(grow(0), "0,0,0,0"); assert.equal(grow(210), "3,0,0,0"); assert.equal(grow(410), "3,2,0,0"); assert.equal(grow(610), "3,2,1,0");
});

test("past the line the tiles are blocked: a step refuses with the range words, spends nothing, and the words come within 2 tiles of the line", () => {
  const p = down(1);
  const lay = plain(p.run("(() => { const l = layout(RC); return { w: l.w, h: l.h, S: l.openings.find(o => o.side === 'S') }; })()"));
  const x = (lay.S.from + lay.S.to) >> 1;
  p.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${lay.h - 7}; FX.msg = '';`);   // 7 tiles from the south edge: far from the line
  p.key("down"); p.key("down");   // y = h - 5: the line is the cell's last two rows (the apron holds the third), the words are due within 2 tiles of it
  assert.doesNotMatch(p.run("FX.msg"), /range/, "no words far from the line");
  p.key("down");   // y = h - 4
  assert.match(p.run("FX.msg"), /^The Probe’s reach ends here/, "within 2 tiles of the line the words show");
  assert.doesNotMatch(p.run("FX.msg"), /tier/i);
  p.key("down");   // y = h - 3: the line's last walkable tile
  assert.equal(p.run("S.exp.patch.y"), lay.h - 3, "stands at the tile before the line");
  const before = plain(p.run("({ x: S.exp.patch.x, y: S.exp.patch.y, a: S.exp.actions })"));
  p.key("down");   // past the line
  const after = plain(p.run("({ x: S.exp.patch.x, y: S.exp.patch.y, a: S.exp.actions, msg: FX.msg })"));
  assert.deepEqual([after.x, after.y, after.a], [before.x, before.y, before.a], "the step is refused and spends no action");
  assert.match(after.msg, /^The Probe’s reach ends here/);
  // the same step at tier 2: the opening is open and the step is taken
  const q = down(2);
  q.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${lay.h - 3}; FX.msg = '';`); q.key("down");
  assert.equal(q.run("S.exp.patch.y"), lay.h - 2, "open at tier 2");
  assert.equal(q.run("layout(RC).lines.cells.size"), 0, "nothing is blocked once the line is past");
});

test("a cell beside wide water has the water, not an opening: the band is drawn on that side and a step into it is refused, spending nothing", () => {
  const p = down(1); p.run("S.exp.pos = WCELL; enterPatch(); if (RT.view) endView();");
  const lay = plain(p.run("(() => { const l = layout(WCELL); return { w: l.w, h: l.h, sides: l.openings.map(o => o.side), wet: [...l.tiles.slice(0, l.w * 2)].filter(t => t === T.WATER).length }; })()"));
  assert.equal(sideKind(p.run("G"), Number(WCELL), "up"), "water");
  assert.ok(!lay.sides.includes("N"), "no opening on the water's side: " + lay.sides);
  assert.ok(lay.wet > lay.w, "the two rows along the north edge are water: " + lay.wet);
  const x = lay.w >> 1;
  p.run(`S.exp.patch.x = ${x}; S.exp.patch.y = 2; FX.msg = '';`);   // the shore row, the water beyond it
  const a0 = p.run("S.exp.actions"); p.key("up");
  assert.equal(p.run("S.exp.patch.y"), 2); assert.equal(p.run("S.exp.actions"), a0);
});

// ---- the golden at 1x ----
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

test("the edge veil at 1x: the veil past the Probe's reach, no dashes and no plum dots (golden range-edge.png), and a cell beside wide water shows its water band (golden closed-edge.png)", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium: " + String(e.message).split("\n")[0]); return; }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    let body = readFileSync(p);
    if (p.endsWith("exploration/index.html")) body = Buffer.from(body.toString().replace("window.__mb = { ", "window.__mb = { startExpedition, "));   // the set-out call, for the test only
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(body);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html`;
  try {
    const shot = async (page, cell, x, y, dir) => {
      await page.evaluate(([cell, x, y, dir]) => {
        const m = window.__mb; m.S.exp.pos = cell; m.enterPatch(); if (m.RT.view) m.endView();
        const P = m.S.exp.patch; P.x = x; P.y = y; P.dir = dir; m.S.veil[P.key] = new Array(m.PH).fill(0x0FFFFFFF); m.FX.msg = "";
      }, [cell, x, y, dir]);
      await page.waitForTimeout(900);
      return decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64"));
    };
    const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
    const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?seed=13`);
    await page.waitForTimeout(1200);
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.S.tier = 1; m.startExpedition("weather", m.G.spawns[0]); });
    const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };
    await page.evaluate(() => { window.__mb.S.found.push("callintro"); window.__mb.FX.hintNote = null; });
    const geo = plain(down(1).run("(() => { const l = layout(RC), o = l.openings.find(q => q.side === 'S'); return { x: (o.from + o.to) >> 1, y: l.h - 5 }; })()")), img = await shot(page, Number(RC), geo.x, geo.y, "down");   // stand near the south side so the veil is in the view
    await page.evaluate(() => window.__mb.act("down")); await page.waitForTimeout(500);   // 1 tile on, within 2 of the line: the words are up
    golden("range-edge.png", decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64")));
    assert.ok(img.w === 450);
    // no dashes and no plum dots: the ice (#a9e6ff) and plumD (#3c1e6c) of the old line are in no pixel of the view. The veil is alpha over the land, so its blends are not palette colours: no palette check here.
    const has = (im, r, g, b) => { for (let y = 32; y < 564; y++) for (let x = 0; x < 450; x++) { const o = (y * im.w + x) * 4; if (im.data[o] === r && im.data[o + 1] === g && im.data[o + 2] === b) return true; } return false; };
    assert.equal(has(img, 0xa9, 0xe6, 0xff), false, "no ice dashes"); assert.equal(has(img, 0x3c, 0x1e, 0x6c), false, "no plum dots");
    golden("closed-edge.png", await shot(page, Number(WCELL), 8, 5, "up"));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
