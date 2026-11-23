// W5 stills on the live page at phone size (390 x 844) and at walking zoom (the page's own 1x frame):
//   1 an empty haunt (her prints at a haunt she has left): the read in the message box with the drop (her tuft) and the prints (W4 round 2's trail and routine note)
//   2 a wild one's own pod at her bed (all three habits known): the message and the pod lying beside the bed's stand tile
//   PW_DIR=/home/mb/mb/wt-cishard-tmp node prototypes/exploration/tools/w5-stills.mjs --seed 13 --out DIR
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
const seed = +arg("seed", 13), out = path.resolve(arg("out", "w5-stills")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch();
const errors = [], log = {};
const open = async () => {
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" })).newPage();
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
  return page;
};
const pickLoika = (page) => page.evaluate((seed) => {
  const m = window.__mb; m.newWorld(seed); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
  for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) { if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue; const key = String(c), live = m.ensureLive(key);
    for (const q of live.cr) if (q.sp === 0 && q.ind && q.ind.hs && q.ind.hs.bed) return { key, id: q.id }; delete m.S.exp.live[key]; } return null; }, seed);
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(out, name + ".png") }); };
const frame1x = async (page, name) => { const d = await page.evaluate(() => window.__mb.capture()); writeFileSync(path.join(out, name + ".png"), Buffer.from(d.split(",")[1], "base64")); };

// ---- an empty haunt: her prints, and the drop ----
async function empty(spent, tag) {
  const page = await open(), pick = await pickLoika(page);
  const r = await page.evaluate(({ key, id, spent }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = spent; live.strike = null; S.exp.stray = null; S.exp.storm = null;
    const list = m.printsHere(); if (!list.length) return { none: 1, part: m.dayPart() };
    const q = list[0], far = q.mark || q.stand, tryX = [far.x + 7, far.x - 7].find(x => x > 1 && x < lay.w - 2 && m.passable(x, far.y)) ?? far.x + 7;
    c.x = tryX; c.y = far.y; c.gone = null; c.ease = 0; c.st = "idle"; c.ind.go = { part: m.dayPart(), t: { x: c.x, y: c.y } };
    const side = [[1, 0, "left"], [-1, 0, "right"], [0, 1, "up"], [0, -1, "down"]].find(([dx, dy]) => m.passable(far.x + dx, far.y + dy));
    m.unveil(key, far.x, far.y, 7); P.x = side ? far.x + side[0] * 2 : far.x; P.y = side ? far.y + side[1] * 2 : far.y; P.dir = side ? side[2] : "up";
    window.__pr = { stand: far, side: side && side.slice(0, 2) }; return { stand: far, part: q.part, id }; }, { ...pick, spent });
  if (!r || r.none) { log["empty-" + tag] = "no prints " + JSON.stringify(r); await page.context().close(); return; }
  await page.waitForTimeout(600);
  await page.evaluate(() => { const m = window.__mb, P = m.S.exp.patch, s = window.__pr.stand, sd = window.__pr.side; if (sd) { P.x = s.x + sd[0]; P.y = s.y + sd[1]; } m.advance("patch", { noise: "creep", moved: true }); });
  await shot(page, "1-a-empty-haunt-the-prints-" + tag);
  const read = await page.evaluate(() => { const m = window.__mb, a = m.patchAction(), lab = a.label; if (lab === m.WORDS.prints.read) a.run(); const sm = m.S.exp.cargo.samples; return { lab, samples: sm.map(s => s.item + (s.drop ? " (drop)" : "")) }; });
  await shot(page, "1-b-the-drop-and-the-read-" + tag);
  if (tag === "day") await frame1x(page, "1-c-whole-place-walking-zoom-day");
  log["empty-" + tag] = JSON.stringify({ ...r, ...read }); await page.context().close();
}

// ---- her own pod at her bed ----
async function own() {
  const page = await open(), pick = await pickLoika(page);
  const r = await page.evaluate(({ key, id }) => {
    const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
    S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 40; live.strike = null; S.exp.stray = null; S.exp.storm = null;
    const rec = r => ({ ranges: { [r]: 1 }, got: {}, best: r, plays: 1, sample: null, sights: 0 }); S.habits = { [id]: { shake: rec("far"), calm: rec("mid"), sleep: rec("near") } };
    m.advance("patch", { noise: "act" });
    const pod = S.pods.find(q => q.how === "own"); if (!pod) return { none: 1 };
    m.unveil(key, pod.x, pod.y, 7); const side = [[1, 0, "left"], [-1, 0, "right"], [0, 1, "up"], [0, -1, "down"]].find(([dx, dy]) => m.passable(pod.x + dx, pod.y + dy));
    P.x = pod.x + (side ? side[0] : 1); P.y = pod.y + (side ? side[1] : 0); P.dir = side ? side[2] : "left"; m.advance("patch", { noise: "creep", moved: true });
    return { pod: { x: pod.x, y: pod.y, how: pod.how, of: pod.of, gs: pod.gs }, tag: m.podTagOf(pod) }; }, pick);
  if (!r || r.none) { log.own = "no own pod " + JSON.stringify(r); await page.context().close(); return; }
  await page.waitForTimeout(600);
  await shot(page, "2-a-her-own-pod-at-her-bed"); await frame1x(page, "2-b-whole-place-walking-zoom-day");
  log.own = JSON.stringify(r); await page.context().close();
}
await empty(95, "day"); await empty(190, "night"); await own();
await browser.close(); server.close();
writeFileSync(path.join(out, "stills.json"), JSON.stringify({ seed, log, errors }, null, 1));
console.log(JSON.stringify({ seed, log, errors }));
