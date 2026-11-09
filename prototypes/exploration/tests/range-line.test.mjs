// Walk content B3: an opening never promises a way that is closed. Seed 13, set out from cell 9, down into cell 41 (a Windstep): its south opening is past the Probe's
// range, its west one a cliff edge (drawn as a cliff lip, not an opening: the world's edges are laid on the place, places/src/edges.mjs), north and east are open. The range line: the tiles past it are not walked (the reason, nothing spent), the words come within 2 tiles of it,
// and the Probe's reach (tier, a Tuliko along) moves it. The line is the desk's range haze now (places/haze): a golden at 1x.
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
const down = (tier = 1) => { const p = makePage({ gen: 6, console: "collect" }); p.run(`newWorld(13); TEST.calm = true; S.tier = ${tier}; startExpedition('weather', 9); S.exp.pos = 41; enterPatch(); if (RT.view) endView();`); return p; };
const kinds = (p) => plain(p.run("(() => { const lay = layout('41'); return lay.openings.map(o => o.side + ':' + openingKind(lay, o).kind); })()"));

test("each opening is classified at entry: south past the range, north and east open (the west cliff is no opening: its lip is drawn); tier 2 opens the south one", () => {
  assert.deepEqual(kinds(down(1)), ["N:open", "E:open", "S:range"]);
  assert.deepEqual(kinds(down(2)), ["N:open", "E:open", "S:open"], "the Probe's reach moves the line");
  // a Tuliko along adds one ring of reach: the same effect through ex.range, whatever its source
  const p = down(1); p.run("S.exp.range = 3; applyLines(layout('41'));");
  assert.deepEqual(plain(p.run("layout('41').lines.ops.map(o => o.side + ':' + o.kind)")), []);
  assert.equal(sideKind(p.run("G"), 41, "left"), "cliff");
  assert.equal(plain(p.run("(() => { const l = layout('41'); let lip = 0; for (let y = 3; y < l.h - 3; y++) if (l.terr[y * l.w] === TERR.LIP || l.terr[y * l.w] === TERR.SIDE) lip++; return lip; })()")) > 10, true, "the west edge is a cliff lip in the cell");
});

test("the haze: the whole side 3 cells deep (levels 3, 2, 1), drawn back 3, 2, 1, gone at 200 ms a step before its cells open; reduced motion is a cut; a side that closes lays it the same way", () => {
  const lv = (p) => plain(p.run("(() => { const h = hazeLevels(layout('41')); return h ? { id: h.id, rows: [0, 1, 2, 3].map(d => h.lv[(layout('41').baked.h - 1 - d) * layout('41').baked.w + 5]), left: h.lv[5 * layout('41').baked.w] } : { id: '', rows: [0, 0, 0, 0], left: 0 }; })()"));
  const p = down(1);
  assert.deepEqual(lv(p).rows, [3, 2, 1, 0], "the south side: the edge row 3, then 2, then 1");
  assert.equal(lv(p).left, 0, "no haze on the open sides (west is closed, not range)");
  const blocked = (q) => plain(q.run("(() => { const l = layout('41'); return [...l.lines.cells.keys()].filter(i => (i / l.w | 0) >= l.baked.oy + l.baked.h - 3 && l.lines.cells.get(i).kind === 'range').length; })()"));
  assert.ok(blocked(p) > 6, "the whole side is blocked, not only the gap's 6 cells: " + blocked(p));
  p.run("RM.matches = false; NOW = 1000; S.exp.range = 5; hazeSync(layout('41'));");   // the reach grows: draw back
  assert.equal(p.run("layout('41').hazeAnim.S.dir"), -1);
  const at = (ms) => { p.run(`NOW = ${1000 + ms}; hazeSync(layout('41'));`); return lv(p).rows.join(); };
  assert.equal(at(0), "3,2,1,0"); assert.equal(at(210), "3,2,0,0"); assert.equal(at(410), "3,0,0,0"); assert.equal(lv(p).left, 0);
  assert.equal(p.run("layout('41').lines.ops.some(o => o.side === 'S')"), true, "still counted past the line until it is gone");
  assert.equal(at(610), "0,0,0,0");
  assert.equal(p.run("layout('41').lines.ops.some(o => o.side === 'S')"), false, "then the cells open");
  assert.equal(p.run("layout('41').hazeAnim.S"), undefined);
  // reduced motion: a cut
  const q = down(1); q.run("RM.matches = true; S.exp.range = 5; hazeSync(layout('41'));");
  assert.equal(q.run("layout('41').lines.ops.some(o => o.side === 'S')"), false); assert.equal(q.run("hazeLevels(layout('41'))"), null);
  // it lays again, growing 1, 2, 3
  p.run("S.exp.range = 2; NOW = 5000; hazeSync(layout('41'));");
  assert.equal(p.run("layout('41').hazeAnim.S.dir"), 1);
  const grow = (ms) => { p.run(`NOW = ${5000 + ms}; hazeSync(layout('41'));`); return lv(p).rows.join(); };
  assert.equal(grow(0), "0,0,0,0"); assert.equal(grow(210), "3,0,0,0"); assert.equal(grow(410), "3,2,0,0"); assert.equal(grow(610), "3,2,1,0");
});

test("past the line the tiles are blocked: a step refuses with the range words, spends nothing, and the words come within 2 tiles of the line", () => {
  const p = down(1);
  const lay = plain(p.run("(() => { const l = layout('41'); return { w: l.w, h: l.h, S: l.openings.find(o => o.side === 'S') }; })()"));
  const x = (lay.S.from + lay.S.to) >> 1;
  p.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${lay.h - 8}; FX.msg = '';`);   // 7 tiles from the south edge: far from the line
  p.key("down"); p.key("down");   // y = h - 6: the line is 3 tiles in from the edge, the words are due within 2 tiles of it
  assert.doesNotMatch(p.run("FX.msg"), /range/, "no words far from the line");
  p.key("down");   // y = h - 5
  assert.match(p.run("FX.msg"), /^Edge of the Probe’s range/, "within 2 tiles of the line the words show");
  assert.doesNotMatch(p.run("FX.msg"), /tier/i);
  p.key("down");   // y = h - 4: the line's last walkable tile
  assert.equal(p.run("S.exp.patch.y"), lay.h - 4, "stands at the tile before the line");
  const before = plain(p.run("({ x: S.exp.patch.x, y: S.exp.patch.y, a: S.exp.actions })"));
  p.key("down");   // past the line
  const after = plain(p.run("({ x: S.exp.patch.x, y: S.exp.patch.y, a: S.exp.actions, msg: FX.msg })"));
  assert.deepEqual([after.x, after.y, after.a], [before.x, before.y, before.a], "the step is refused and spends no action");
  assert.match(after.msg, /^Edge of the Probe’s range/);
  // the same step at tier 2: the opening is open and the step is taken
  const q = down(2);
  q.run(`S.exp.patch.x = ${x}; S.exp.patch.y = ${lay.h - 4}; FX.msg = '';`); q.key("down");
  assert.equal(q.run("S.exp.patch.y"), lay.h - 3, "open at tier 2");
  assert.equal(q.run("layout('41').lines.cells.size"), 0, "nothing is blocked once the line is past");
});

test("a cell beside wide water has the water, not an opening: the band is drawn on that side and a step into it is refused, spending nothing", () => {
  const p = down(1); p.run("S.exp.pos = 25; enterPatch(); if (RT.view) endView();");
  const lay = plain(p.run("(() => { const l = layout('25'); return { w: l.w, h: l.h, sides: l.openings.map(o => o.side), wet: [...l.tiles.slice(0, l.w * 2)].filter(t => t === T.WATER).length }; })()"));
  assert.equal(sideKind(p.run("G"), 25, "up"), "water");
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

test("the range haze at 1x: the wash past the Probe's reach, no dashes and no plum dots (golden range-edge.png), and a cell beside wide water shows its water band (golden closed-edge.png)", { skip }, async (t) => {
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
    await page.evaluate(() => { const m = window.__mb; m.TEST.calm = true; m.S.tier = 1; m.startExpedition("weather", 9); });
    const golden = (name, img) => { const r = compareGolden(path.join(path.dirname(fileURLToPath(import.meta.url)), "golden", name), img); assert.ok(r.ok, r.message); };
    await page.evaluate(() => { window.__mb.FX.hintNote = null; });
    const img = await shot(page, 41, 9, 16, "down");
    await page.evaluate(() => window.__mb.act("down")); await page.waitForTimeout(500);   // 1 tile on, within 2 of the line: the words are up
    golden("range-edge.png", decodePng(Buffer.from((await page.evaluate(() => window.__mb.capture())).split(",")[1], "base64")));
    assert.ok(img.w === 450);
    // no dashes and no plum dots: the ice (#a9e6ff) and plumD (#3c1e6c) of the old line are in no pixel of the view; every pixel of the screen is a colour of the palette, the haze ramp included
    const has = (im, r, g, b) => { for (let y = 32; y < 564; y++) for (let x = 0; x < 450; x++) { const o = (y * im.w + x) * 4; if (im.data[o] === r && im.data[o + 1] === g && im.data[o + 2] === b) return true; } return false; };
    assert.equal(has(img, 0xa9, 0xe6, 0xff), false, "no ice dashes"); assert.equal(has(img, 0x3c, 0x1e, 0x6c), false, "no plum dots");
    assert.deepEqual(await page.evaluate(() => window.__mb.offPalette().bad), [], "every pixel is a palette colour (the ramp is one)");
    const ramp = [[0xf6, 0xe1, 0xc7], [0xe8, 0xe5, 0xb7], [0xd3, 0xd3, 0x87], [0xe4, 0xb9, 0x9a], [0xc0, 0xc4, 0x5c], [0xdd, 0x9e, 0x79]];
    assert.ok(ramp.some(([r, g, b]) => has(img, r, g, b)), "the haze ramp is on the screen");
    golden("closed-edge.png", await shot(page, 25, 8, 5, "up"));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
