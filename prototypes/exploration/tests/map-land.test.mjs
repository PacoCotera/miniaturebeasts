// The painted reach view (companion scheme): one picture of land with the fog states on soft borders; found is clear, never been in is darker, not seen is night;
// the painting is cached for one state and changes when a cell is found. Real Chromium (PW_DIR; skipped without it).
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright")); } catch { chromium = null; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const skip = !chromium && "playwright is not installed (set PW_DIR)";
async function serve() {
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { server, url: `http://127.0.0.1:${server.address().port}/prototypes/exploration/index.html` };
}
async function enter(browser, url, seed) {
  const page = await (await browser.newContext({ viewport: { width: 450, height: 600 }, reducedMotion: "reduce" })).newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?seed=${seed}`); await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__mb.TEST.calm = true; });
  for (let i = 0; i < 3; i++) { await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(350); }
  await page.evaluate(() => window.__mb.act("confirm")); await page.waitForTimeout(300);
  return { page, errors };
}

test("the painted land: found has no night, never been in is darker, not seen is night with no land; cached for one state, new once a cell is found", { skip }, async (t) => {
  let browser; try { browser = await chromium.launch(); } catch (e) { t.skip("no Chromium"); return; }
  const { server, url } = await serve();
  try {
    const { page, errors } = await enter(browser, url, 6);
    await page.evaluate(() => { const m = window.__mb; m.TEST.findHeart(); m.RT.view && m.endView(); m.RT.spot = null; m.leavePatch(); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const m = window.__mb, q = m.reachGeom(), spec = { X0: q.s0.x - q.r, Y0: q.s0.y - q.r, w: q.size, h: q.size, cs: q.cs }, ex = m.S.exp;
      const cv1 = m.landImage(spec), cv2 = m.landImage(spec), same = cv1 === cv2;
      const px = (cv) => cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
      const night = m.RGB[m.C.night], ink = m.RGB[m.C.ink], isRGB = (d, i, c) => d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2];
      const cellBox = (c) => { const X = c % m.MW, Y = (c / m.MW) | 0; return { x: (X - spec.X0) * q.cs, y: (Y - spec.Y0) * q.cs }; };
      const stat = (cv, c) => { const b = cellBox(c), d = px(cv), s = q.cs; let n = 0, ni = 0, dark = 0, lum = 0, land = 0;
        for (let y = (s >> 1) - 10; y < (s >> 1) + 10; y++) for (let x = (s >> 1) - 10; x < (s >> 1) + 10; x++) { const i = ((b.y + y) * cv.width + b.x + x) * 4; n++;
          if (isRGB(d, i, night)) ni++; if (isRGB(d, i, ink)) dark++; else land++; lum += d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; }
        return { n, night: ni, ink: dark, nonInk: land, lum: lum / n }; };
      const found = ex.reach.find((c) => m.explored(c) || (m.S.called && m.S.called[c]));
      const others = ex.reach.filter((c) => c !== found && m.S.revealed[c] && m.passable(c) && m.G.land[c] !== m.L.WATER && m.fogState(c) === 2);
      const inRange = (c) => { const X = c % m.MW, Y = (c / m.MW) | 0; return X >= spec.X0 + 1 && X < spec.X0 + q.n - 1 && Y >= spec.Y0 + 1 && Y < spec.Y0 + q.n - 1; };
      const never = others.find(inRange);
      let unseen = -1; for (let c = 0; c < m.MW * m.MH; c++) if (!m.S.revealed[c] && inRange(c) && [c - 1, c + 1, c - m.MW, c + m.MW].every((n) => !m.S.revealed[n])) { unseen = c; break; }
      const res = { same, found: found != null ? stat(cv1, found) : null, never: never != null ? stat(cv1, never) : null, unseen: unseen >= 0 ? stat(cv1, unseen) : null, fogN: m.FOGV.n };
      // a cell is found: the painting is a new one
      const target = others.find((c) => c !== never) ?? never; res.target = target != null;
      if (target != null) { m.S.called[target] = 1; res.changed = m.landImage(spec) !== cv1; }
      return res;
    });
    assert.equal(r.same, true, "the same state gives the same cached painting");
    assert.ok(r.found && r.found.night === 0, "a found cell's centre has no night pixels: " + JSON.stringify(r.found));
    assert.ok(r.never, "a never-been cell in the reach");
    if (r.fogN > 0) assert.ok(r.never.night > 0, "a never-been cell has night dots: " + JSON.stringify(r.never));
    assert.ok(r.never.lum < r.found.lum, "a never-been cell is darker than a found one: " + r.never.lum + " vs " + r.found.lum);
    if (r.unseen) { assert.equal(r.unseen.nonInk - r.unseen.night, r.unseen.nonInk, "unseen: no land colours"); assert.ok(r.unseen.ink + r.unseen.night === r.unseen.n, "an unseen cell is only ink and night: " + JSON.stringify(r.unseen)); }
    if (r.target) assert.equal(r.changed, true, "the painting changes when a cell is found");
    assert.deepEqual(errors, []);
  } finally { await browser.close(); server.close(); }
});
