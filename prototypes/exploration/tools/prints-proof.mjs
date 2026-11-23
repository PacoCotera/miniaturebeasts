// bug #119 / #122 proof: the print mark stays on its tile as the pawn and the wild one move; accept on a read print shows its line, never a Wait.
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
const page = await (await browser.newContext({ viewport: { width: 522, height: 935 }, reducedMotion: "reduce" })).newPage();
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") console.log("console:", m.text().slice(0, 200)); });
page.on("response", r => { if (r.status() >= 400) console.log("http", r.status(), r.url()); });
await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
await page.waitForFunction(() => window.__mb && window.__mb.newWorld, null, { timeout: 60000 }).catch(() => console.log("no __mb"));
if (errors.length) console.log("page errors:", errors.join(" | "));
const pick = await page.evaluate((seed) => {
  const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
  for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind && q.ind.hs && q.ind.hs.bed) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
const shot = async (name) => { await page.waitForTimeout(350); const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name + ".png"), Buffer.from(d.split(",")[1], "base64")); };
const setup = await page.evaluate(({ key, id }) => {
  const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
  S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 2; live.strike = null; S.exp.stray = null; S.exp.storm = null;
  const list = m.printsHere(); if (!list.length) return { none: 1, part: m.dayPart() };
  const far = list[0].mark || list[0].stand;
  c.x = far.x + 7; c.y = far.y; c.gone = null; c.ease = 0; c.st = "idle"; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
  const side = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => m.passable(far.x + dx, far.y + dy));
  m.unveil(key, far.x, far.y, 8); P.x = far.x + side[0] * 3; P.y = far.y + side[1] * 3; P.dir = "up";
  window.__pr = { mark: far, side }; return { mark: far, side }; }, pick);
if (setup.none) { console.log("no prints", JSON.stringify(setup)); process.exit(1); }
const markNow = () => page.evaluate(() => { const l = window.__mb.printsHere(); return l[0] && l[0].mark; });
// #119: the pawn walks (three tiles, then onto the mark's tile), the wild one steps onto the mark's tile: the mark stays
const marks = [await markNow()]; await shot("119-a-pawn-3-tiles-away");
await page.evaluate(() => { const P = window.__mb.S.exp.patch, p = window.__pr; P.x = p.mark.x + p.side[0]; P.y = p.mark.y + p.side[1]; });
marks.push(await markNow()); await shot("119-b-pawn-beside");
await page.evaluate(() => { const P = window.__mb.S.exp.patch, p = window.__pr; P.x = p.mark.x; P.y = p.mark.y; });
marks.push(await markNow());
await page.evaluate(() => { const P = window.__mb.S.exp.patch, p = window.__pr, c = window.__mb.curLive().cr.find(q => q.sp === 0 && q.ind); P.x = p.mark.x + p.side[0] * 2; P.y = p.mark.y + p.side[1] * 2; c.x = p.mark.x; c.y = p.mark.y; });
marks.push(await markNow()); await shot("119-c-pawn-2-away-wild-one-on-the-mark");
log.marks = marks; log.same119 = marks.every(k => k && k.x === marks[0].x && k.y === marks[0].y);
// #122: read, then accept again beside the same print
await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, p = window.__pr, c = m.curLive().cr.find(q => q.sp === 0 && q.ind); c.x = p.mark.x + 7; c.y = p.mark.y; P.x = p.mark.x + p.side[0]; P.y = p.mark.y + p.side[1]; P.dir = p.side[0] ? (p.side[0] > 0 ? "left" : "right") : (p.side[1] > 0 ? "up" : "down"); });
await shot("122-a-before-first-accept");
log.first = await page.evaluate(() => { const m = window.__mb, a = m.patchAction(), s0 = m.S.day.spent; a.run(); return { label: a.label, spentDelta: m.S.day.spent - s0 }; });
await shot("122-b-after-first-accept");
log.second = await page.evaluate(() => { const m = window.__mb, a = m.patchAction(), s0 = m.S.day.spent; a.run(); return { label: a.label, spentDelta: m.S.day.spent - s0 }; });
await shot("122-c-after-second-accept");
log.errors = errors; console.log(JSON.stringify(log, null, 1)); await browser.close(); server.close();
