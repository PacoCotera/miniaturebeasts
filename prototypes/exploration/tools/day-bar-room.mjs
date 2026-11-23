// day-bar-1: how much room the partner name has beside the day bar (same code as /play, served unbundled so the draw functions can be watched).
//   PW_DIR=/home/mb/mb/.pw node day-bar-room.mjs
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require(path.join(process.env.PW_DIR, "node_modules/playwright"));
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
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html?seed=7`); await page.waitForTimeout(3000);
  page.on("console", (c) => console.log("page:", c.text())); const res = await page.evaluate(async () => {
    const m = window.__mb; m.TEST.calm = true; m.newWorld(7); m.startExpedition("weather", m.G.spawns[0]);
    const e = m.S.exp; e.fog = null; e.storm = null; e.pt = { id: "p1", name: "Wickleberry", sp: 1, elder: false, n: 0, mk: 0 }; m.S.day.spent = 140;
    const t0 = window.text, dc = window.drawCounters, room = {};
    window.text = function (s, x, ...r) { if (s === e.pt.name) room.nameX = x; return t0.call(this, s, x, ...r); };
    window.drawCounters = function (rx, ...r) { room.counterX = rx; return dc.call(this, rx, ...r); };
    let fits = 0, avail = null; const nm = "Wickleberry";
    for (let n = 1; n <= nm.length; n++) { e.pt.name = nm.slice(0, n); room.nameX = null; await new Promise((r) => setTimeout(r, 150)); if (room.nameX != null) { fits = n; avail = room.counterX - 10 - room.nameX; } }
    console.log("dbg", typeof t0, typeof dc, !!m.S.exp, m.S.phase);
    return { fitsChars: fits, of: nm.length, roomLp: avail, nameTextW: fits ? window.textW(nm.slice(0, fits), 2) : 0, counterX: room.counterX, nameX: room.nameX };
  });
  console.log(JSON.stringify(res));
} finally { await browser.close(); server.close(); }
