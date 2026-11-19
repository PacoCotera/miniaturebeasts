// Stills for the crossing rule (land shape B1): three borders that a cliff summary used to close and the tiles now leave open (the pawn on each side of the step), one cliff stretch of such a side
// still refusing, and the map view of one with the gap in its cliff mark. Walking zoom, 1x (450 x 600), the game's own page.
//   PW_DIR=/home/mb/pw156 PLAYWRIGHT_BROWSERS_PATH=/home/mb/pw156/browsers node prototypes/exploration/tools/crossing-stills.mjs --out DIR [--seed 7]
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
const seed = +arg("seed", 7), out = path.resolve(arg("out", "crossing-stills"));
mkdirSync(out, { recursive: true });

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
const ctx = await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" });
const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url); await page.waitForFunction(() => window.__mb && window.__mb.PL && window.__mb.PL.ready, null, { timeout: 120000 });
const save = async (name) => { const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name), Buffer.from(d.split(",")[1], "base64")); console.log(name); };
const settle = (ms = 900) => page.waitForTimeout(ms);
const clear = () => page.evaluate(() => { const m = window.__mb; if (m.RT.view) m.endView(); });
const quiet = () => page.evaluate(() => { const m = window.__mb; { m.FX.notes.length = 0; m.FX.msg = null; } });   // the last line said is not part of the picture (the refusal still is: it is said after this)

await page.evaluate((s) => { const m = window.__mb; m.newWorld(s); m.TEST.calm = true; m.S.tier = 2; m.startExpedition("weather", m.G.spawns[0]); }, seed);
// borders: summary cliff, tiles open on part of the side; in range, both cells land
const picks = await page.evaluate(() => { const m = window.__mb, out = [], used = new Set();
  for (let c = 0; c < m.MW * m.MH && out.length < 3; c++) for (const dir of ["right", "down"]) {
    const n = m.stepCell(c, dir); if (n < 0 || used.has(c) || used.has(n) || !m.inRange(c) || !m.inRange(n) || m.edgeKind(c, dir) !== m.EDGE.CLIFF || !m.tileSideApplies(c, dir)) continue;
    const ts = m.tileSide(c, dir); if (!ts || !ts.open || !ts.mask.includes(0)) continue;
    m.S.exp.pos = c; m.enterPatch(); if (m.RT.view) m.endView();
    const lay = m.layout(String(c)), P = m.S.exp.patch, ways = [], walls = [];
    for (let k = 0; k < ts.len; k++) { P.x = dir === "right" ? lay.w - 1 : k; P.y = dir === "right" ? k : lay.h - 1; (m.crossLanding(dir) ? ways : walls).push(k); }
    m.leavePatch();
    if (!ways.length || !walls.length) continue;
    const k = ways[ways.length >> 1], wall = walls.reduce((b, q) => (Math.abs(q - k) < Math.abs(b - k) ? q : b), walls[0]);
    used.add(c); used.add(n); out.push({ c, n, dir, k, wall, mask: Array.from(ts.mask).join("") }); break; }
  return out; });
console.log(JSON.stringify(picks));
const lift = () => page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch; if (P) { const lay = m.layout(P.key); m.S.veil[P.key] = new Array(lay.h).fill(0x0fffffff); m.walkLift(); } if (m.RT.view) m.endView(); });
let i = 0;
for (const b of picks) {
  i++;
  await page.evaluate((b) => { const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = b.c; m.S.exp.start = b.c; m.enterPatch(); const P = m.S.exp.patch, lay = m.layout(P.key);
    P.x = b.dir === "right" ? lay.w - 1 : b.k; P.y = b.dir === "right" ? b.k : lay.h - 1; P.dir = b.dir; }, b);
  await lift(); await settle(700); await clear(); await quiet(); await settle(300); await save(`b${i}-1-before-the-step.png`);
  await page.evaluate((b) => window.__mb.patchStep(b.dir, "creep"), b);
  await settle(1800); await lift(); await quiet(); await settle(500); await save(`b${i}-2-after-the-step.png`);
  console.log(i, JSON.stringify(await page.evaluate(() => ({ pos: window.__mb.S.exp.pos, patch: window.__mb.S.exp.patch && { x: window.__mb.S.exp.patch.x, y: window.__mb.S.exp.patch.y } }))));
  if (i === 1) {   // the cliff stretch of the same side: stand on it and step; the refusal line is up
    await page.evaluate((b) => { const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = b.c; m.enterPatch(); const P = m.S.exp.patch, lay = m.layout(P.key);
      P.x = b.dir === "right" ? lay.w - 1 : b.wall; P.y = b.dir === "right" ? b.wall : lay.h - 1; P.dir = b.dir; }, b);
    await lift(); await settle(600); await quiet(); await page.evaluate((b) => window.__mb.patchStep(b.dir, "creep"), b); await settle(500); await clear(); await save("b1-3-cliff-stretch-refuses.png");
    console.log("refused, pos", await page.evaluate(() => window.__mb.S.exp.pos));
    // the map: the pawn's cell and its neighbour seen, the cliff mark with its gap
    await page.evaluate((b) => { const m = window.__mb; if (m.S.exp.patch) m.leavePatch(); m.S.exp.pos = b.c; m.S.revealed[b.c] = 1; m.S.revealed[b.n] = 1; }, b);
    await settle(900); await save("b1-4-map-gap-in-the-cliff-mark.png");
  }
}
console.log("errors", JSON.stringify(errors));
await browser.close(); server.close();
