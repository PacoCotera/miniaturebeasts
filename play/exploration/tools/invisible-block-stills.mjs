// Stills of the owner's invisible-block spots (bugs #35 #40 #45 #67 #78): the pawn on the tile the note names, then a step each way, and what the game says when a step is refused. Phone size, the game's own page.
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node prototypes/exploration/tools/invisible-block-stills.mjs --out DIR [--seed 2668471853]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".mbtiles": "application/octet-stream", ".mbplace": "application/octet-stream" };
const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i < 0 ? d : process.argv[i + 1]; };
const seed = +arg("seed", 2668471853), out = path.resolve(arg("out", "invisible-block-stills"));
mkdirSync(out, { recursive: true });
const SPOTS = [["35", 10, 12, 9, 7], ["40", 11, 10, 16, 14], ["45", 9, 10, 8, 19], ["67", 9, 3, 8, 27], ["78", 2, 13, 7, 17]];   // issue, cell x, y, tile x, y

const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?test`;
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url); await page.waitForFunction(() => window.__mb && window.__mb.PL && window.__mb.PL.ready, null, { timeout: 120000 });
const shot = async (name) => { await page.screenshot({ path: path.join(out, name) }); console.log(name); };
const settle = (ms = 900) => page.waitForTimeout(ms);
await page.evaluate((s) => { const m = window.__mb; m.newWorld(s); m.TEST.calm = true; m.S.tier = 2; m.startExpedition("weather", m.G.spawns[0]); }, seed);
const log = [];
for (const [id, cx, cy, tx, ty] of SPOTS) {
  const cell = cy * 16 + cx;
  const info = await page.evaluate(([cell, tx, ty]) => { const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = cell; m.S.exp.start = cell; m.enterPatch(); if (m.RT.view) m.endView();
    const P = m.S.exp.patch, lay = m.layout(P.key); P.x = tx; P.y = ty; m.S.seen.tile[P.key] = new Array(lay.h).fill(0x0fffffff); m.walkSeen(); m.FX.notes.length = 0; m.FX.msg = null;
    const blocked = (x, y) => x < 0 || y < 0 || x >= lay.w || y >= lay.h ? "edge" : m.T_BLOCK[lay.tiles[y * lay.w + x]] ? "BLOCK t" + lay.tiles[y * lay.w + x] : m.occupant(P.key, x, y, "player") ? "occupied" : "free";
    return { pieces: lay.pieces, around: { up: blocked(tx, ty - 1), down: blocked(tx, ty + 1), left: blocked(tx - 1, ty), right: blocked(tx + 1, ty), here: blocked(tx, ty) } }; }, [cell, tx, ty]);
  await settle(900); await shot(`${id}-0-the-spot.png`);
  const steps = [];
  for (const dir of ["down", "up", "left", "right"]) {
    const r = await page.evaluate(([dir, cell, tx, ty]) => { const m = window.__mb; if (m.S.phase !== "patch" || m.S.exp.pos !== cell) { if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = cell; m.enterPatch(); if (m.RT.view) m.endView(); }
      const P = m.S.exp.patch; P.x = tx; P.y = ty; m.FX.msg = null; m.patchStep(dir, "creep"); const Q = m.S.exp.patch;
      return { moved: !!Q && (Q.x !== tx || Q.y !== ty) || m.S.exp.pos !== cell, msg: m.FX.msg && (m.FX.msg.text || m.FX.msg), pos: m.S.exp.pos, x: Q && Q.x, y: Q && Q.y }; }, [dir, cell, tx, ty]);
    await settle(1200);
    if (r.moved) { await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; if (P) { const lay = m.layout(P.key); m.S.seen.tile[P.key] = new Array(lay.h).fill(0x0fffffff); m.walkSeen(); m.FX.msg = null; if (m.RT.view) m.endView(); } }); await settle(500); }
    await shot(`${id}-1-step-${dir}-${r.moved ? "walks" : "refused"}.png`);
    steps.push({ dir, ...r });
  }
  log.push({ id, cell: `${cx},${cy}`, tile: `${tx},${ty}`, ...info, steps });
}
writeFileSync(path.join(out, "log.json"), JSON.stringify(log, null, 1));
console.log(JSON.stringify(log));
console.log("errors", JSON.stringify(errors));
await browser.close(); server.close();
