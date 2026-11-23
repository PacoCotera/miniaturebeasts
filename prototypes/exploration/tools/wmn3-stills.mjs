// wild-marking-named-3: stills 390x844 of the realm's MARKED Loika (named, reachable, saddled): on the walk token (coat read), and her page on the walk's end card.
//   PW_DIR=/home/mb/mb/.pw node wmn3-stills.mjs <outDir> [seed]
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2], seed = +(process.argv[3] || 7); mkdirSync(out, { recursive: true });
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/home/mb/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell" });
try {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST && window.__mb.WILD.ok, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  const pick = await page.evaluate(async (seed) => {
    const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
    const g = await import("/prototypes/station/src/genome.mjs");
    const id = g.markedLoika(m.S.seed, m.markedCandidates()), q = m.S.cr.find((w) => w.id === id);
    const lay = m.layout(String(q.c)), ind = m.individualOf(q, lay);
    return { id, key: String(q.c), name: ind && ind.name, named: !!ind };
  }, seed);
  console.log(JSON.stringify(pick));
  const { id, key } = pick;
  await page.evaluate(({ key, id }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find((q) => q.id === id), P = S.exp.patch;
    S.known = [0, ...S.known.filter((k) => k !== 0)]; S.day.spent = 50; c.hide = 0; c.gone = null; c.st = "idle";
    let spot = null; for (let r = 2; r <= 3 && !spot; r++) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const x = c.x + dx * r, y = c.y + dy * r; if (x > 0 && y > 0 && x < m.PW - 1 && y < m.PH - 1 && lay.reach[y * m.PW + x]) { spot = { x, y, dx, dy }; break; } }
    P.x = spot.x; P.y = spot.y; P.dir = spot.dy > 0 ? "up" : spot.dy < 0 ? "down" : spot.dx > 0 ? "left" : "right";
    m.unveil(key, c.x, c.y, 6);
    S.habits = S.habits || {}; S.looks = S.looks || {}; delete S.looks[id]; S.habits[id] = { calm: { got: { coat: true } } };
    S.named = S.named || {}; S.named[id] = c.ind.name; S.metIds = [String(id)];
    window.__wmn = id;
  }, { key, id });
  await page.waitForTimeout(600);
  const st = await page.evaluate(() => { const m = window.__mb, c = m.curLive().cr.find((q) => q.id === window.__wmn); c.st = "shake"; return { sad: m.wildSaddled(c), read: m.coatRead(c.id), name: c.ind.name }; });
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__mb.curLive().cr.find((q) => q.id === window.__wmn).st = "shake"; });
  await page.evaluate(() => { for (const q of window.__mb.curLive().cr) if (q.id !== window.__wmn) q.hide = 1; });   // only she is on the screen
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/1-marked-loika-walk-token.png` });
  console.log("walk token", JSON.stringify(st));
  await page.evaluate(() => { const m = window.__mb; m.S.habits[window.__wmn] = { shake: { ranges: { near: 1 }, got: { coat: true }, best: "near" } }; m.leavePatch(); m.endExpedition("end"); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/2-marked-loika-end-card.png` });
  console.log("end card phase", await page.evaluate(() => window.__mb.S.phase));
  if (errors.length) console.log("page errors", errors.slice(0, 3));
} finally { await browser.close(); server.close(); }
