// walk-look-carry-5: stills 390x844 of a REAL wild Loika in shake (saddled keeps her saddle; a spotted one stays plain).
//   PW_DIR=/home/mb/mb/.pw node wlc5-stills.mjs <outDir>
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
const out = process.argv[2]; mkdirSync(out, { recursive: true });
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
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`);
  await page.waitForFunction(() => window.__mb && window.__mb.TEST, null, { timeout: 60000 }); await page.waitForTimeout(2500);
  // every real wild Loika of the world, sorted by what her marking is
  const cls = await page.evaluate(async () => {
    const m = window.__mb; m.newWorld(7); m.TEST.calm = true; m.startExpedition("weather", m.G.spawns[0]);
    const g = await import("/prototypes/station/src/genome.mjs"), L = await import("/prototypes/station/src/looks.mjs");
    const fr = await (await fetch("/prototypes/species/frames/language/species-S01.json")).json(); g.setFrames([fr]);
    const o = { saddle: [], other: [] };
    for (const c of [...new Set(m.S.cr.filter(q => q.sp === 0).map(q => q.c))]) {
      if (!m.G.comp[c] || m.G.land[c] === m.L.WATER) continue;
      const key = String(c), live = m.ensureLive(key);
      for (const q of live.cr) if (q.sp === 0 && q.ind) { const gm = g.wildGenome(fr, m.S.seed, q.id), sh = L.marksShown(fr, { genome: gm, read: ["coat"] }), k = L.drawnLooks(fr, { genome: gm, read: ["coat"] }).markings; if (sh) (k === "saddle" ? o.saddle : o.other).push({ key, id: q.id, kind: k }); }
    }
    return o;
  });
  console.log(JSON.stringify({ saddle: cls.saddle.slice(0, 3), other: cls.other.slice(0, 3) }));
  const shots = [["1-saddle-loika-shake-read", cls.saddle[0], true], ["2-spotted-loika-shake-read", cls.other[0], true], ["3-saddle-loika-shake-unread", cls.saddle[1], false]];
  for (const [name, { key, id, kind }, read] of shots) {
    await page.evaluate(({ key, id, read }) => {
      const m = window.__mb, S = m.S; S.exp.pos = key; m.enterPatch(key); const lay = m.curLay(), live = m.curLive(), c = live.cr.find(q => q.id === id), P = S.exp.patch;
      S.known = [0, ...S.known.filter(k => k !== 0)]; S.day.spent = 50; c.hide = 0; c.gone = null; c.st = "idle";
      let spot = null; for (let r = 2; r <= 3 && !spot; r++) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const x = c.x + dx * r, y = c.y + dy * r; if (x > 0 && y > 0 && x < m.PW - 1 && y < m.PH - 1 && lay.reach[y * m.PW + x]) { spot = { x, y, dx, dy }; break; } }
      P.x = spot.x; P.y = spot.y; P.dir = spot.dy > 0 ? "up" : spot.dy < 0 ? "down" : spot.dx > 0 ? "left" : "right";
      m.lightningLift(key, c.x, c.y, 6);
      S.habits = S.habits || {}; S.looks = S.looks || {}; delete S.looks[id]; if (read) S.habits[id] = { calm: { got: { coat: true } } }; else delete S.habits[id];
      window.__wlc = id;
    }, { key, id, read });
    await page.waitForTimeout(600);
    const st = await page.evaluate(() => { const m = window.__mb, c = m.curLive().cr.find(q => q.id === window.__wlc); c.st = "shake"; return { st: c.st, sad: m.wildSaddled(c), read: m.coatRead(c.id), at: [c.x, c.y], crs: m.RT.cr.size }; });
    await page.waitForTimeout(500);
    await page.evaluate(() => { window.__mb.curLive().cr.find(q => q.id === window.__wlc).st = "shake"; });
    const cap = `Loika ${id}: marking ${kind}, ${read ? "coat read" : "coat unread"}, shaking, ${st.sad ? "saddled token" : "plain token"}`;
    await page.evaluate((t) => { let d = document.getElementById("wlc5cap"); if (!d) { d = document.createElement("div"); d.id = "wlc5cap"; d.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:99999;background:#000c;color:#fff;font:14px monospace;padding:6px"; document.body.appendChild(d); } d.textContent = t; }, cap);
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(name, cap, JSON.stringify(st));
  }
  if (errors.length) console.log("page errors", errors.slice(0, 3));
} finally { await browser.close(); server.close(); }
