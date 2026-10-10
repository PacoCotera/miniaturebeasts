// Pods in each of its states on the Station page (?test: the face in test mode), as the layer check and the goldens take them: a fresh crate of two S04 pods docked and opened, then the eight states in order, each reached
// by the page's own hooks and asserted (screen, view, focus, cmp) before `visit(name, page)` is called. Returns { fails }.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".wasm": "application/wasm", ".css": "text/css" };

export async function podsStates(visit) {
  if (!existsSync(path.join(here, "../dist/face.wasm"))) { console.error("the face is not built (prototypes/face/build.sh)"); process.exit(2); }
  const server = createServer((req, res) => {
    let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(readFileSync(p));
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port, fails = [], fail = (m) => { fails.push(m); console.error("FAIL " + m); };
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => fail("pageerror: " + e.message)); page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) fail("console: " + m.text().split("\n")[0]); });
  const fixture = readFileSync(path.join(root, "station/tests/fixtures/save-v8-schema1.json"), "utf8");
  await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
  await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev&test`, { waitUntil: "load" });
  await page.evaluate(() => window.__st.ready); await page.waitForTimeout(500);
  await page.evaluate(() => window.__st.seedCrate("S04", 2, 4101)); await page.evaluate(() => window.__st.act("dock")); await page.waitForTimeout(300);
  await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
  const pods = await page.evaluate(() => window.__st.ST.tray.filter((p) => p.species === "S04" && !p.idd).map((p) => p.id));   // a fresh crate of two pods of one species, as journey.mjs compareShot does
  if (pods.length !== 2) fail("no two pods of one species in the rack");
  const ui = () => page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, cur: window.__st.UI.pods.cur, focus: window.__st.UI.pods.focus.cur, cmp: !!window.__st.UI.pods.cmp }));
  const at = async (name, want) => {
    await page.waitForTimeout(700);
    const u = await ui(); for (const [k, v] of Object.entries(want)) if (u[k] !== v) fail(`${name}: ${k} is ${JSON.stringify(u[k])}, wanted ${JSON.stringify(v)}`);
    await visit(name, page, fail);
  };
  const go = async (id, f, view, ci) => { for (let i = 0; i < 2; i++) { await page.evaluate(([id, f, view, ci]) => window.__st.podsGo(id, f, view, ci), [id, f, view, ci]); await page.waitForTimeout(300); } };   // twice: the targets of the state are known after its first frame
  try {
    await go(pods[0], "place.0", "collection"); await at("collection", { screen: "pods", view: "collection", focus: "place.0" });
    await go(pods[0], "pod", "overview"); await at("overview, unidentified", { view: "overview", focus: "pod" });
    await page.evaluate((ids) => { for (const id of ids) window.__st.skipRead(id); }, pods);
    await go(pods[0], "pod", "overview"); await at("overview, identified, pod focused", { view: "overview", focus: "pod" });
    await go(pods[0], "kin.0", "overview"); await at("overview, kin focused", { view: "overview", focus: "kin.0", cmp: false });
    await go(pods[0], "hatch", "overview"); await at("overview, hatch focused", { view: "overview", focus: "hatch" });
    await go(pods[0], "rail.0", "overview"); await at("overview, a rail tab focused", { view: "overview", focus: "rail.0" });
    await go(pods[0], "rail.0", "chapter", 0); await at("chapter page", { view: "chapter", focus: "rail.0" });
    await go(pods[0], "kin.0", "overview"); await page.evaluate(() => window.__st.act("confirm")); await at("compare", { screen: "pods", cmp: true });
    const errs = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); if (errs.render.length || errs.face.length) fail("errors on the page: " + [...errs.render, ...errs.face].slice(0, 3).join(" | "));
  } finally { await browser.close(); server.close(); }
  return { fails };
}
