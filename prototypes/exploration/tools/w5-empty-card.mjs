// W5 first-goal still: the empty end card on a first walk (none met, then one met with 1 of 3), at 390x844 and 522x935.
//   node prototypes/exploration/tools/w5-empty-card.mjs --seed 7 --out DIR
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR || "/home/mb/mb/wt-cishard-tmp", "node_modules/playwright"));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const argv = process.argv.slice(2), arg = (n, d) => { const i = argv.indexOf("--" + n); return i < 0 ? d : argv[i + 1]; };
const seed = +arg("seed", 7), out = path.resolve(arg("out", "empty-card")); mkdirSync(out, { recursive: true });
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, ""); let p = path.join(root, rel);
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch(), log = {};
for (const [w, h] of [[390, 844], [522, 935]]) for (const met of [false, true]) {
  const page = await (await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: "reduce" })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=${seed}`); await page.waitForTimeout(1500);
  await page.evaluate(({ seed, met }) => { const m = window.__mb; m.newWorld(seed); const S = m.S; m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]); m.enterPatch(String(m.S.exp.start)); m.leavePatch();
    if (met) { S.named = { 1: "Juniper" }; S.metIds = ["1"]; S.habits = { 1: { shake: { ranges: { far: 1 }, got: {}, best: "far" } } }; }
    m.endExpedition("end"); }, { seed, met });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(out, `empty-card-${met ? "met" : "none"}-${w}x${h}.png`) });
  log[`${w}-${met}`] = await page.evaluate(() => ({ phase: window.__mb.S.phase, empty: !!(window.__mb.S.report && window.__mb.S.report.empty) }));
  await page.context().close();
}
console.log(JSON.stringify(log)); await browser.close(); server.close();
