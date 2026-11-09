// Walk content B3: an opening never promises a way that is closed. Seed 13, set out from cell 9, down into cell 41 (a Windstep): its south opening is past the Probe's
// range, its west one a cliff edge, north and east are open. The range line: the tiles past it are not walked (the reason, nothing spent), the words come within 2 tiles of it,
// and the Probe's reach (tier, a Tuliko along) moves it. A golden at 1x with the dashes and the fade.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makePage } from "./page-harness.mjs";
import { decodePng } from "../../places/src/png.mjs";
import { compareGolden } from "../../places/src/golden.mjs";

const plain = (x) => JSON.parse(JSON.stringify(x));
const down = (tier = 1) => { const p = makePage({ gen: 6, console: "collect" }); p.run(`newWorld(13); TEST.calm = true; S.tier = ${tier}; startExpedition('weather', 9); S.exp.pos = 41; enterPatch(); if (RT.view) endView();`); return p; };
const kinds = (p) => plain(p.run("(() => { const lay = layout('41'); return lay.openings.map(o => o.side + ':' + openingKind(lay, o).kind); })()"));

test("each opening is classified at entry: south past the range, west closed, north and east open; tier 2 opens the south one", () => {
  assert.deepEqual(kinds(down(1)), ["N:open", "E:open", "S:range", "W:closed"]);
  assert.deepEqual(kinds(down(2)), ["N:open", "E:open", "S:open", "W:closed"], "the Probe's reach moves the line");
  // a Tuliko along adds one ring of reach: the same effect through ex.range, whatever its source
  const p = down(1); p.run("S.exp.range = 3; applyLines(layout('41'));");
  assert.deepEqual(plain(p.run("layout('41').lines.ops.map(o => o.side + ':' + o.kind)")), ["W:closed"]);
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
  assert.equal(q.run("layout('41').lines.cells.size > 0"), true, "the west one is still closed");
});

test("a closed opening blocks its tiles with the built reason (a cell beside wide water)", () => {
  const p = down(1); p.run("S.exp.pos = 25; enterPatch(); if (RT.view) endView();");
  const lay = plain(p.run("(() => { const l = layout('25'); return { w: l.w, h: l.h, N: l.openings.find(o => o.side === 'N') }; })()"));
  const x = (lay.N.from + lay.N.to) >> 1;
  p.run(`S.exp.patch.x = ${x}; S.exp.patch.y = 3; FX.msg = '';`);
  const a0 = p.run("S.exp.actions"); p.key("up");
  assert.equal(p.run("S.exp.patch.y"), 3); assert.equal(p.run("S.exp.actions"), a0);
  assert.equal(p.run("FX.msg"), "Wide water · too deep to cross");
  assert.ok(p.run("layout('25').lines.patches.length") > 0, "its path past the line is drawn as grass");
});

// ---- the golden at 1x ----
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";

test("the range line at 1x: the dashes across the gap and the fade past them (golden range-edge.png), and a closed opening's path stops short (golden closed-edge.png)", { skip }, async (t) => {
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
    golden("closed-edge.png", await shot(page, 25, 8, 5, "up"));
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
