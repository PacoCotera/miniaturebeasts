// bug #122 (tuft-2) proof: read a print (she left a tuft here), accept again picks the tuft up; full hold: it stays, says why, no turn.
//   PW_DIR=/home/mb/mb/wt-cishard-tmp node prototypes/exploration/tools/tuft-proof.mjs --seed 13 --out DIR
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR || "/home/mb/mb/wt-cishard-tmp", "node_modules/playwright"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 13), out = path.resolve(arg("out", "tuft-proof")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const errors = [], log = {};
const page = await (await browser.newContext({ viewport: { width: 522, height: 935 }, reducedMotion: "reduce" })).newPage();
page.on("pageerror", e => { errors.push(e.message); console.log("pageerror:", e.message.slice(0, 200)); });
page.on("response", r => { if (r.status() >= 400) console.log("http", r.status(), r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mb && window.__mb.newWorld, null, { timeout: 60000 }).catch(() => console.log("no __mb"));
const pick = await page.evaluate((seed) => {
  const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
  for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind && q.ind.hs && q.ind.hs.bed) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
const shot = async (name) => { await page.waitForTimeout(350); const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name + ".png"), Buffer.from(d.split(",")[1], "base64")); };
const setup = await page.evaluate(({ key, id }) => {
  const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
  S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 2; live.strike = null; S.exp.stray = null; S.exp.storm = null;
  const list = m.printsHere(); if (!list.length) return { none: 1 };
  const far = list[0].mark || list[0].stand;
  c.x = far.x + 7; c.y = far.y; c.gone = null; c.ease = 0; c.st = "idle"; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
  const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.passable(far.x + dx, far.y + dy));
  m.unveil(key, far.x, far.y, 8); P.x = far.x + side[0]; P.y = far.y + side[1]; P.dir = side[0] ? (side[0] > 0 ? "left" : "right") : (side[1] > 0 ? "up" : "down");
  window.__pr = { mark: far, side }; return { mark: far, side }; }, pick);
if (setup.none) { console.log("no prints"); process.exit(1); }
const act = () => page.evaluate(() => { const m = window.__mb, a = m.patchAction(), s0 = m.S.day.spent, e0 = m.S.exp.cargo.s, t0 = m.curLive().tf.length; a.run(); return { label: a.label, spentDelta: m.S.day.spent - s0, essenceDelta: m.S.exp.cargo.s - e0, tufts: [t0, m.curLive().tf.length] }; });
await shot("a-unread-print");
log.read = await act(); await shot("b-read-tuft-left");
log.pickup = await act(); await shot("c-picked-up");
// full storage: a second tuft on the same tile, hold full
await page.evaluate(() => { const m = window.__mb, p = window.__pr, live = m.curLive(); live.tf.push({ id: live.fid++, x: p.mark.x, y: p.mark.y }); m.S.exp.cargo.s = 20; });
await page.waitForTimeout(1500);
log.full = await page.evaluate(async () => { const m = window.__mb, s0 = m.S.day.spent, t0 = m.curLive().tf.length; m.press("confirm"); await new Promise(r => setTimeout(r, 400)); return { spentDelta: m.S.day.spent - s0, essence: m.S.exp.cargo.s, tufts: [t0, m.curLive().tf.length] }; });   // the real accept press (it clears the old note)
await shot("d-full-storage");
log.errors = errors; console.log(JSON.stringify(log, null, 1)); await browser.close(); server.close();
