// owner notes 162/163 stills: the print in its three ages, and ✓ "Keep still" in open ground. node age-stills.mjs --seed 13 --w 522 --h 935 --out DIR
//   PW_DIR=/home/mb/mb/wt-cishard-tmp node prototypes/exploration/tools/prints-proof.mjs --seed 13 --out DIR
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
const seed = +arg("seed", 13), out = path.resolve(arg("out", "prints-proof")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const errors = [], log = {};
const page = await (await browser.newContext({ viewport: { width: +arg("w", 522), height: +arg("h", 935) }, reducedMotion: "reduce" })).newPage();
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") console.log("console:", m.text().slice(0, 200)); });
page.on("response", r => { if (r.status() >= 400) console.log("http", r.status(), r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mb && window.__mb.newWorld, null, { timeout: 60000 }).catch(() => console.log("no __mb"));
if (errors.length) console.log("page errors:", errors.join(" | "));
await page.waitForTimeout(5000);
const pick = await page.evaluate((seed) => {
  const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
  for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
const shot = async (name) => { await page.waitForTimeout(350); const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name + ".png"), Buffer.from(d.split(",")[1], "base64")); };
const setup = await page.evaluate(({ key, id }) => {
  const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
  S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 250; live.strike = null; S.exp.stray = null; S.exp.storm = null;
  const list = m.printsHere(); if (!list.length) return { none: 1, part: m.dayPart() };
  const far = list[0].mark || list[0].stand;
  c.x = far.x + 7; c.y = far.y; c.gone = null; c.ease = 0; c.st = "idle"; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
  const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.passable(far.x + dx, far.y + dy));
  m.unveil(key, far.x, far.y, 8); P.x = far.x + side[0] * 3; P.y = far.y + side[1] * 3; P.dir = "up";
  window.__pr = { mark: far, side }; return { mark: far, side }; }, pick);
if (setup.none) { console.log("no prints", JSON.stringify(setup)); process.exit(1); }
const markNow = () => page.evaluate(() => { const l = window.__mb.printsHere(); return l[0] && l[0].mark; });
// #119: the pawn walks (three tiles, then onto the mark's tile), the wild one steps onto the mark's tile: the mark stays
// the same print at each age: the day's spent set to a time that gives each (older, fresh, faint), read off printAge itself
const found = await page.evaluate(() => { const m = window.__mb, out = {}; m.S.exp.n = 2; const key = m.S.exp.patch.key;
  for (let s = 0; s < 600; s += 10) { m.S.day.spent = s; for (const p of m.printsHere()) { if (!p.mark) continue; const a = m.printAge(p); if (!(a in out)) out[a] = { s, part: p.part, yday: p.yday, mark: p.mark }; } }
  return out; });
log.found = found;
for (const a of [0, 1, 2]) { if (!found[a]) continue;
  await page.evaluate(({ s, mk }) => { const m = window.__mb, P = m.S.exp.patch; m.S.day.spent = s; m.unveil(P.key, mk.x, mk.y, 8); const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.passable(mk.x + dx * 3, mk.y + dy * 3)) || [1, 0]; P.x = mk.x + side[0] * 3; P.y = mk.y + side[1] * 3; }, { s: found[a].s, mk: found[a].mark });
  await shot("print-age-" + a + "-" + found[a].part + (found[a].yday ? "-yday" : "")); }
// ✓ in open ground facing nothing: Keep still, the clock moves one
await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, p = window.__pr; m.S.day.spent = 200; P.x = p.mark.x + p.side[0] * 3; P.y = p.mark.y + p.side[1] * 3; P.dir = "up"; });
log.keep = await page.evaluate(() => { const m = window.__mb, r = []; for (let i = 0; i < 2; i++) { const a = m.patchAction(), s0 = m.S.day.spent; a.run(); r.push({ label: a.label, spentDelta: m.S.day.spent - s0 }); } return r; });
await shot("keep-still");
log.errors = errors; console.log(JSON.stringify(log, null, 1)); await browser.close(); server.close();
