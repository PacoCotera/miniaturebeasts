#!/usr/bin/env node
// The Station's journey (station-build.md §5), headless: serves prototypes/ as the sandbox does, loads a v8 fixture save, and plays the Station on the LVGL face (the page in test mode, ?test):
// the fixture migrated, a Loika crate seeded, Dock, the crates opened through the developer hook, Pods by keys and intents (identify, read, compare, return), Create, Grow, the bud, the mibi and the
// Caddy's painting through the intents of the screens the face does not draw yet (M2 to M4: the rules, not the screens), every not-built screen's room keys and ←, Idle's wake, the save round trip.
// Fails on any page error, any error the face sent, any canvas text call or any request outside the page's origin. Screenshots go to img/; each point records what tools/checks.mjs reads.
// The milestones whose screens are not on the face are listed from journey-pending/ on every run.
//   node tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { decode } from "../../genome-stamp/src/decode.mjs";
import { sameGenome } from "../../genome-stamp/src/codec.mjs";
import { frameFor } from "../../genome-stamp/src/frames.mjs";
import { createApp, loadFrames as loadCaddyFrames } from "../../caddy/app.mjs";
import { decodePNG } from "../../ui/png.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm" };
// The Caddy service in mock mode beside the static server (station-build.md §5), its calls proxied under /caddy-api/ as the sandbox server's web server does.
loadCaddyFrames();
const caddyData = mkdtempSync(path.join(tmpdir(), "mb-caddy-journey-"));
let caddy = createApp({ dataDir: caddyData, painter: "mock", mockDelay: 1, tickMs: 200 });
let caddyServer = createServer((req, res) => caddy.handle(req, res));
await new Promise((r) => caddyServer.listen(0, "127.0.0.1", r)); caddy.start();
let caddyPort = caddyServer.address().port, caddyUp = true;
const server = createServer((req, res) => {
  if (req.url.startsWith("/caddy-api/")) {
    if (!caddyUp) { res.writeHead(502); res.end("the Caddy service is down"); return; }
    const up = http.request({ host: "127.0.0.1", port: caddyPort, path: req.url, method: req.method, headers: req.headers }, (r2) => { res.writeHead(r2.statusCode, r2.headers); r2.pipe(res); });
    up.on("error", () => { res.writeHead(502); res.end(); }); req.pipe(up); return;
  }
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1360, height: 980 }, deviceScaleFactor: 1 });
const errors = [], fail = (t) => { errors.push(t); console.error("FAIL " + t); };
page.on("pageerror", (e) => { errors.push("pageerror: " + e.message); console.error("pageerror: " + e.message); });
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
// Nothing is fetched from the network but the page's own files and the Caddy service (the fonts are in the face).
const external = []; page.on("request", (r) => { if (!r.url().startsWith(`http://127.0.0.1:`)) external.push(r.url()); });
mkdirSync(path.join(here, "../img"), { recursive: true });
// Every screenshot point records what the layer checks read (tools/checks.mjs): the face's log, its palette readings on passes 1 and 2, and for the points that name it the frame's pixels (for the ink).
const checks = { shots: [], textApiCalls: 0 };
const record = async (name, ink) => {
  const check = await page.evaluate(() => window.__st.check()), snap = await page.evaluate(() => window.__st.snapshot({ capture: false }));
  const s = { name, check, snap: { pass1: snap.pass1, pass2: snap.pass2, errors: snap.errors, refused: snap.refused } };
  if (ink) s.png = (await page.evaluate(() => window.__st.capture())).split(",")[1];
  checks.shots.push(s);
};
// A canvas capture at 1×: the 1024×600 frame itself, as the face drew it (prototypes/station/img/pods-*.png).
const frameShot = async (name, ink = false) => { await record(name, ink); const url = await page.evaluate(() => window.__st.capture()); writeFileSync(path.join(here, `../img/${name}.png`), Buffer.from(url.split(",")[1], "base64")); };
const shot = async (name, ink = false) => { await record(name, ink); return page.screenshot({ path: path.join(here, `../img/${name}.png`), fullPage: false }); };
const fixture = readFileSync(path.join(here, "../tests/fixtures/save-v8-schema1.json"), "utf8");
const companionBefore = JSON.stringify({ ...JSON.parse(fixture), st: undefined });
await page.addInitScript(() => { window.__fillTextCalls = 0; for (const f of ["fillText", "strokeText", "measureText"]) { const o = CanvasRenderingContext2D.prototype[f]; CanvasRenderingContext2D.prototype[f] = function (...a) { window.__fillTextCalls++; return o.apply(this, a); }; } });
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev&test`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
// The page draws with the face and nothing else: the type is Inter in the face, no font is loaded by the page, no request leaves the page's origin, and the canvas text API is never called.
if (external.length) { errors.push("requests left the page's origin: " + external.join(", ")); console.error("FAIL external requests " + external.join(", ")); }
const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.ST)));
const sv = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.SV)));
const press = async (k, ms = 120) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(ms); };
const props = () => page.evaluate(() => window.__st.props);
const line = async () => (await props()).frame?.line ?? {};   // the bottom line the host sent the face: what the screen says
const intent = (m, ms = 120) => page.evaluate((m) => window.__st.intent(m), m).then(() => page.waitForTimeout(ms));
const expect = (cond, what) => { if (!cond) fail(what); };
const S_stage = (s, m) => { const age = s.turn - (m.born || 0); return age < 2 ? "juvenile" : "adult"; };
const ui = () => page.evaluate(() => { const u = window.__st.UI; return { screen: u.screen, view: u.pods.view, cmp: !!u.pods.cmp, lib: u.lib.f, hab: u.hab.f, habId: u.hab.id, home: u.home.f, idle: u.idle, msg: window.__st.msg }; });
// The type through the face: every string it set is Inter at 16, 20 or 28 px, nothing refused, no error sent.
const assertFace = async (when) => {
  const c = await page.evaluate(() => window.__st.check()), bad = (c.log?.type ?? []).filter((r) => ![16, 20, 28].includes(r.px) || !r.text);
  for (const r of bad.slice(0, 3)) fail(`type (${when}): "${r.text}" at ${r.px} px, not Inter at 16, 20 or 28`);
  if (c.refused) fail(`face (${when}): ${c.refused} nodes refused`); if (c.errors.length) fail(`face (${when}): ${c.errors.slice(0, 3).join("; ")}`);
  console.log(`face (${when}): ${(c.log?.type ?? []).length} strings, ${bad.length} off-spec, ${c.refused} refused, ${c.errors.length} errors`);
};

// 1. the fixture migrated: pods carry genomes from their seeds, the mibi keeps its id and name, the Companion's part is byte-identical
let s = await st();
expect(s.schema === 2, "schema 2 after the migration");
expect(s.tray.length === 2 && s.tray[0].genome && s.tray[0].gs === 1111, "the pods keep their seeds and carry genomes");
expect(s.mibis.length === 1 && s.mibis[0].id === 1 && s.mibis[0].name === "Dot" && s.mibis[0].code, "Dot keeps id and name and has a code");
const svNow = await sv();
expect(JSON.stringify({ ...svNow, st: undefined }) === companionBefore, "the Companion's part is byte-identical after the migration");
await page.waitForTimeout(400);
{ const p = await props(), c = await page.evaluate(() => window.__st.check());   // a fresh world opens on Home, which is not built: the frame and the line
  expect(p.screen === "home" && p.state === "notBuilt" && p.frame.top.title === "Home", "Home draws the not-built composition: " + JSON.stringify([p.screen, p.state, p.frame?.top?.title]));
  expect((c.log?.type ?? []).some((t) => t.text === "this screen is not built yet"), "the line says so: " + JSON.stringify((c.log?.type ?? []).map((t) => t.text))); }
await frameShot("page-home", true);
// 2. seed one Loika pod (fixed seed) beside the fixture's crate; dock; open the crates through the developer hook
await page.evaluate(() => window.__st.seedCrate("S01", 1, 4242));
await press("dock", 300);
s = await st(); expect(s.dock.docked, "docked");
await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(200);
s = await st();
expect(s.accepted.includes("xw2n9c-5") && s.accepted.filter((id) => id.startsWith("dev-")).length === 1, "both crates accepted once");
expect(s.tray.length === 4, "four pods in the wells: " + s.tray.length);
await page.evaluate(() => window.__st.openBay()); s = await st(); expect(s.tray.length === 4, "an accepted crate never reopens");
expect(!(await page.evaluate(() => window.__st.holding())), "no arrival plays and nothing is held while Home is not built");
// 3. Pods: identify the new Loika pod
await press("research", 200);
{ const u = await ui(); expect(u.screen === "pods" && u.view === "collection", "Research opens the collection: " + JSON.stringify(u)); }
const loika = s.tray.find((p) => p.id.startsWith("xw2n9c-5")), loika2 = s.tray.find((p) => p.id.startsWith("dev-"));
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id); await page.waitForTimeout(250);
const e0 = s.e;
let l = await line(); expect(/Identify/.test(l.ok) && l.price === "⚡ 1", "identify costs 1 Energy (the first was spent in the fixture): " + JSON.stringify(l));
await press("confirm", 2200);
s = await st(); const pl = s.tray.find((p) => p.id === loika.id);
expect(pl.idd === 1 && s.e === e0 - 1, "identified for 1 Energy");
await frameShot("page-identified");
// Identify leaves the Library where it was; ✓ on an identified pod opens Create, whatever has been read: the line reads "Shape a founder", dimmed by what stops it; Create is not built, and ← names the pod
{ l = await line(); expect(l.ok === "Shape a founder", "✓ on an identified pod names Create: " + JSON.stringify(l)); await press("confirm", 400);
  const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, create: window.__st.UI.create?.podId }));
  expect(at.screen === "create" && at.create === loika.id, "✓ on an identified pod opens Create on it: " + JSON.stringify(at));
  { const p = await props(); expect(p.state === "notBuilt" && p.frame.line.back === "Loika", "Create's way back names the pod: " + JSON.stringify(p.frame.line)); }
  await press("back", 400); const to = await page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, create: window.__st.UI.create }));
  expect(to.screen === "pods" && to.view === "overview", "← from Create is the pod's overview: " + JSON.stringify(to));
  await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(300); }
// 4. read Coat (the fixture spent the free read): 1 Data; then Face: 2 Data; a second Loika's Face costs 1
await press("up", 300);
l = await line(); expect(/Open Coat/.test(l.ok) && !l.price, "on the overview a tab opens its page, free: " + JSON.stringify(l));
await press("confirm", 300); expect((await page.evaluate(() => window.__st.UI.pods.view)) === "chapter", "✓ on a tab opens the chapter page");
l = await line(); expect(/Read Coat/.test(l.ok) && l.price === "◆ 1", "Coat costs 1 Data: " + JSON.stringify(l));
const d0 = s.d;
await press("confirm", 2400);
s = await st(); expect(s.tray.find((p) => p.id === loika.id).read.includes("coat") && s.d === d0 - 1, "Coat read for 1 Data");
expect(s.tray.find((p) => p.id === loika.id).first !== undefined, "the first-shown looks are saved on the pod at read time");
await press("right", 300);
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "◆ 2", "Face costs 2 Data: " + JSON.stringify(l));
await press("confirm", 2400);
s = await st(); expect(s.d === d0 - 3, "Face read for 2 Data");
await frameShot("page-read");
// the art layer is on the palette exactly (pass 2 of the face's test mode); the type is the face's own
{ const r = await page.evaluate(() => window.__st.snapshot()); expect(r.pass1 === 0 && r.pass2 === 0, "chrome and art read 0 off-palette pixels: " + JSON.stringify([r.pass1, r.pass2])); }
// the drawn stamp decodes to the pod's genome
const img = await page.evaluate((id) => { const r = window.__st.stampRGBA(id, 200); return { width: r.width, height: r.height, data: Array.from(r.data) }; }, loika.id);
const sg = await page.evaluate((id) => window.__st.stampGenome(id), loika.id);
const dec = decode({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
expect(dec.stamps.length === 1 && sameGenome(frameFor(sg.species, sg.version), sg, dec.stamps[0].genome), "the drawn stamp decodes to the genome");
expect(dec.stamps.length === 1 && dec.stamps[0].genome.read.join() === "Coat,Face", "the stamp's mask: Coat and Face read");
await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(400);   // the stamp is on the overview
// and the stamp as the face shows it on its 120 label, read back from the frame's pixels, decodes too
{ const cap = decodePNG(Buffer.from((await page.evaluate(() => window.__st.capture())).split(",")[1], "base64")), L = await page.evaluate(() => window.__st.specs().pods.regions.overview.stamp.rect), data = new Uint8ClampedArray(L[2] * L[3] * 4);
  for (let y = 0; y < L[3]; y++) for (let x = 0; x < L[2]; x++) for (let k = 0; k < 4; k++) data[(y * L[2] + x) * 4 + k] = cap.data[((L[1] + y) * 1024 + L[0] + x) * 4 + k];
  const onScreen = decode({ width: L[2], height: L[3], data });
  expect(onScreen.stamps.length === 1 && sameGenome(frameFor(sg.species, sg.version), sg, onScreen.stamps[0].genome), "the stamp on its 120 label, as the face drew it, decodes to the genome"); }
// the second Loika: identify (1 Energy), its Face costs 1 (half of two, rounded up)
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id); await page.waitForTimeout(300);
await press("confirm", 2200);
await page.evaluate((id) => window.__st.podsGo(id, "rail.1"), loika2.id); await page.waitForTimeout(300);   // to its Face on the page
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "◆ 1", "a second Loika's Face costs 1: the lower number, no word, on the bottom line: " + JSON.stringify(l));
await press("confirm", 2400);
// 5. Compare: from the second Loika's pod, → to its kin, ✓
s = await st();
await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika2.id); await page.waitForTimeout(300); await press("right", 300);   // the pod's overview: → to its kin
l = await line(); expect(l.ok === "Compare", "compare offered on another Loika pod: " + JSON.stringify(l));
await press("confirm", 400); await frameShot("page-compare");
l = await line(); expect(l.back === "Loika", "Compare's way back names the pod: " + JSON.stringify(l));
expect(/two Loika pods/.test(l.subject), "compare open: " + JSON.stringify(l));
await press("back", 300);
{ const f0 = await page.evaluate(() => window.__st.UI.pods.focus.cur); expect(/^kin\.\d+$/.test(f0), "← from Compare lands on the kin that opened it: " + f0); }
// P. Pods on the face: the pod by its size class, the rail as the species has chapters, the page by trait count, the focus graph through the keys, the holds of Identify and a read, Compare, the hatch armed, the empty rack
const focusNow = () => page.evaluate(() => window.__st.UI.pods.focus.cur);
// Home's rack is not built: the collection is opened by the Research key, and ← goes up to Home
await press("research", 300);
{ const u = await ui(); expect(u.screen === "pods" && u.view === "collection", "Research opens the collection: " + JSON.stringify(u));
  await press("back", 300); expect((await page.evaluate(() => window.__st.UI.screen)) === "home", "← from the collection is Home"); await press("research", 300); }
await page.evaluate(() => { window.__st.seedCrate("S02", 1, 515); window.__st.seedCrate("S09", 1, 909); window.__st.openBay(); }); await page.waitForTimeout(300);
s = await st(); expect(s.tray.length === 6, "six pods in the wells: " + s.tray.length);
const untuva = s.tray.find((p) => p.species === "S02"), coatSix = s.tray.find((p) => p.species === "S09"), tuikisPod = s.tray.find((p) => p.species === "S03");
await page.evaluate((id) => { window.__st.podsGo(id, "pod", undefined, 0); }, untuva.id);
await page.waitForTimeout(500);
l = await line(); expect(l.ok === "Identify" && l.price === "⚡ 1", "an unidentified pod offers Identify: " + JSON.stringify(l));
await frameShot("pods-unidentified");
// Identify holds input for its seal: a key pressed meanwhile is consumed; the ring stays on the pod
await press("confirm", 500); expect(await page.evaluate(() => window.__st.holding()), "Identify holds input"); await frameShot("pods-identifying");
await page.evaluate(() => window.__st.press("left")); await page.waitForTimeout(100); expect((await focusNow()) === "pod", "a key during the seal is consumed");
await page.waitForTimeout(2000);
s = await st(); expect(s.tray.find((p) => p.id === untuva.id).idd === 1, "the Untuva is identified");
// the focus graph through the keys on the overview: ▲ to the rail's last chapter looked at, ▶ steps the chapters, ▼ to the pod, → to the hatch (this pod has no kin), ◀ back to the pod; ← up to the collection with the ring on this pod, ✓ down again
const walk = async (keys, want, what) => { for (const k of keys) await press(k, 100); const got = await focusNow(); expect(got === want, what + ": " + got + " not " + want); };
const viewNow = () => page.evaluate(() => window.__st.UI.pods.view);
await walk(["up"], "rail.0", "▲ from the pod to the rail's last chapter looked at");
await walk(["right", "right"], "rail.2", "▶ steps the chapters"); await walk(["down"], "pod", "▼ from the rail to the pod"); await walk(["up"], "rail.2", "▲ again: the last chapter looked at"); await walk(["down"], "pod", "▼ back to the pod");
await walk(["right"], "hatch", "→ from the pod to the hatch when it has no kin"); await walk(["left"], "pod", "◀ from the hatch to the pod");
const idx = s.tray.findIndex((p) => p.id === untuva.id);
await walk(["back"], "place." + idx, "← up to the collection, the ring on this pod"); expect((await viewNow()) === "collection", "← from the overview is the collection");
await frameShot("pods-collection");
await walk(["confirm"], "pod", "✓ on a place opens its overview"); expect((await viewNow()) === "overview", "the overview");
// a sealed chapter (the Untuva's Character): no ✓ cap, the subject "Character is sealed", the slats on its page
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.3"); }, untuva.id); await page.waitForTimeout(500);
l = await line(); expect(!l.ok && l.subject === "Character is sealed", "a sealed chapter has no ✓ cap: " + JSON.stringify(l)); await frameShot("pods-sealed");
// the Tuikis: eight chapters; the Coat has four traits
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.0"); }, tuikisPod.id); await page.waitForTimeout(500); await frameShot("pods-eight-chapters");
// the Large pod with six Coat traits, read whole by the developer
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.0"); }, coatSix.id); await page.waitForTimeout(500); await frameShot("pods-six-traits");
for (const [i, name] of [[1, "pods-belatz-face"], [3, "pods-belatz-legs-tail"]]) { await page.evaluate(([id, n]) => window.__st.podsGo(id, "rail." + n), [coatSix.id, i]); await page.waitForTimeout(500); await frameShot(name); }   // the Belatz pages with the studio's crops
// the rack is full: a new crate's pod waits for a well
await page.evaluate(() => window.__st.seedCrate("S01", 1, 31337)); await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(300);
s = await st(); expect(s.waiting.length === 1, "the rack is full: the new pod waits for a well");
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, coatSix.id); await page.waitForTimeout(400);
// the hatch: the first ✓ arms with a plate, any other key disarms, the second ✓ returns
l = await line(); expect(l.ok === "Return to the wild" && l.price === "❀ +1", "the hatch offers the return: " + JSON.stringify(l));
await press("confirm", 300); l = await line(); expect(l.ok === "Again: return it", "armed: " + JSON.stringify(l)); await frameShot("pods-hatch-armed");
await press("up", 300); l = await line(); expect(l.ok !== "Again: return it", "any other key disarms the hatch"); expect((await page.evaluate(() => window.__st.UI.pods.wildArm)) === 0, "the disarm cleared the armed state"); await page.evaluate((id) => window.__st.podsGo(id, "hatch"), coatSix.id); await page.waitForTimeout(300);
const sBefore = (await st()).s; await press("confirm", 200); await press("confirm", 400); s = await st();
expect(s.s === sBefore + 1 && !s.tray.some((p) => p.id === coatSix.id), "the second ✓ returned the pod for +1 Essence: " + JSON.stringify({ s: s.s, sBefore, still: s.tray.some((p) => p.id === coatSix.id), line: await line(), view: await viewNow(), f: await focusNow() }));
// the same for the Untuva, which leaves the rack as it was; the waiting pod takes the well
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, untuva.id); await page.waitForTimeout(400); await press("confirm", 200); await press("confirm", 400);
s = await st(); expect(!s.tray.some((p) => p.id === untuva.id), "the Untuva returned");
const extra = s.tray.find((p) => p.species === "S01" && !p.idd && p.id !== loika.id && p.id !== loika2.id);
expect(!!extra, "the pod that waited for a well entered the rack when one freed"); {   // not skipped when absent: the read-holds-input assertion must run
  await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, extra.id); await page.waitForTimeout(300); await press("confirm", 2200); await page.evaluate((id) => { window.__st.podsGo(id, "rail.0"); }, extra.id); await page.waitForTimeout(400); await press("confirm", 300);
  expect(await page.evaluate(() => window.__st.holding()), "a read holds input"); await page.waitForTimeout(2200);
  await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, extra.id); await page.waitForTimeout(400); await press("confirm", 200); await press("confirm", 400); }
s = await st(); expect(s.tray.length === 4, "the rack is back to its four pods: " + s.tray.length);
// P2. Compare with one, two, four and six traits; then the empty rack. Each pair is a fresh crate of two pods, read whole by the developer, compared, and given back through the hatch.
const compareShot = async (species, seed, ci, name, grid) => {
  await page.evaluate(([sp, sd]) => { window.__st.seedCrate(sp, 2, sd); window.__st.openBay(); }, [species, seed]); await page.waitForTimeout(300);
  const pair = (await st()).tray.filter((p) => p.species === species && !p.idd);
  expect(pair.length === 2, `two ${species} pods in the wells: ` + pair.length);
  for (const p of pair) await page.evaluate((id) => window.__st.skipRead(id), p.id);
  await page.evaluate(([a, b, c]) => { const u = window.__st.UI.pods; u.cur = a; u.view = "overview"; u.cmp = { a, b, ci: c }; }, [pair[0].id, pair[1].id, ci]); await page.waitForTimeout(500);
  const cl = await line(), cells = await page.evaluate(() => window.__st.props.regions.pageA?.cells?.length ?? -1);
  expect(cells === grid, `${name}: ${grid} traits on Compare's page: ${cells}`);
  expect(["they differ here", "they differ in another chapter", "no read trait differs"].includes(cl.need), `${name}: Compare's need line is one of the spec's strings: ` + JSON.stringify(cl));
  expect(!/\d/.test(cl.subject || "") && !/well \d/.test(cl.subject || ""), `${name}: no digits in the line`);
  const differs = await page.evaluate(([a, b]) => window.__st.compareDiff(a, b).length, [pair[0].id, pair[1].id]);
  await frameShot(name);
  await page.evaluate(() => { window.__st.UI.pods.cmp = null; });
  for (const p of pair) { await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, p.id); await page.waitForTimeout(400); await press("confirm", 200); await press("confirm", 400); }
  expect(!(await st()).tray.some((p) => pair.some((q) => q.id === p.id)), `${name}: the pair went back through the hatch`);
  return differs;
};
const needs = [await compareShot("S04", 4101, 0, "pods-compare-one", 1), await compareShot("S09", 4102, 3, "pods-compare-two", 2), await compareShot("S03", 4103, 0, "pods-compare-four", 4), await compareShot("S09", 4104, 0, "pods-compare-six", 6)];
expect(needs.some((n) => n > 0), "at least one Compare pair has a trait that differs (the data; the build marks none): " + needs.join(" | "));
{   // the empty rack (docked, the bay empty): the cradle under the beam and nothing else; the wells are put back after
  await page.evaluate(() => { const g = window.__st.ST; window.__keep = { tray: g.tray, waiting: g.waiting }; g.tray = []; g.waiting = []; window.__st.UI.pods.cur = null; window.__st.UI.pods.cmp = null; }); await page.waitForTimeout(500);
  const el = await line(); expect(el.subject === "the rack is empty" && el.need === "take the Companion exploring", "the empty rack's lines: " + JSON.stringify(el));
  await frameShot("pods-empty-rack");
  await page.evaluate(() => window.__st.seedCrate("S04", 1, 9090)); await page.waitForTimeout(400);   // docked, a crate waiting in the bay
  const crateLine = await line(); expect(crateLine.need === "open the crates first", "the empty rack with a crate in the bay: " + JSON.stringify(crateLine));
  await page.evaluate(() => { window.__st.ST.devBay.length = 0; });   // the crate is taken away again, unopened
  await page.evaluate(() => { const g = window.__st.ST; g.tray = window.__keep.tray; g.waiting = window.__keep.waiting; window.__st.UI.pods.cur = null; }); await page.waitForTimeout(300);
}
s = await st();
// 6. return the Tuikis to the wild: +1 Essence, the Companion's record
const tuikis = s.tray.find((p) => p.species === "S03");
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, tuikis.id); await page.waitForTimeout(400);
const s0 = s.s;
await press("confirm", 200); await press("confirm", 400);
s = await st(); expect(s.s === s0 + 1 && !s.tray.some((p) => p.id === tuikis.id) && s.returned.at(-1).id === tuikis.id, "returned for +1 Essence");
// M2. Create: ✓ on the read Loika opens Create (a screen the face does not draw yet: it shows that it is not built), whose intents shape eye rings (+1 Data); Grow: a bud of twenty-one minutes (this world grew Dot already)
await press("research", 300);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id); await page.waitForTimeout(400);
l = await line(); expect(l.ok === "Shape a founder", "a read pod offers Create: " + JSON.stringify(l));
await press("confirm", 400);
expect((await page.evaluate(() => window.__st.UI.screen)) === "create", "on Create");
{ const p = await props(), c = await page.evaluate(() => window.__st.check()); expect(p.state === "notBuilt" && p.frame.line.back === "Loika", "Create is not built: its way back names the pod: " + JSON.stringify([p.state, p.frame.line])); expect(c.log.type.some((t) => t.text === "this screen is not built yet"), "Create says so"); await frameShot("page-create-notbuilt", true); }
const eyeIndex = await page.evaluate((id) => { const p = window.__st.podById(id), fr = window.__st.frameOf(p.species); return fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits).findIndex((t) => t.id === "eye-rings"); }, loika.id);
for (let i = 0; i < eyeIndex; i++) await intent({ screen: "create", target: "", verb: "step:right" }, 40);
await intent({ screen: "create", target: "", verb: "step:down" }, 100);
{ const cost = await page.evaluate(() => window.__st.growCost(window.__st.UI.create.choices)); expect(cost.e === 2 && cost.s === 4 && cost.d === 1, "Grow costs 2 Energy 4 Essence and 1 Data for the change: " + JSON.stringify(cost)); }
{ const crPod = await page.evaluate(() => window.__st.UI.create.podId);   // a room key on Create forgets the unpaid choices; coming back starts fresh
  expect((await page.evaluate(() => Object.keys(window.__st.UI.create.choices).length)) === 1, "a choice is made and unpaid");
  await press("research", 300); const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, create: window.__st.UI.create }));
  expect(at.screen === "pods" && at.view === "collection" && at.create === null, "a room key on Create drops the unpaid choices and opens the room's top: " + JSON.stringify(at));
  await page.evaluate((id) => window.__st.podsGo(id, "pod"), crPod); await page.waitForTimeout(400); await press("confirm", 400);
  expect((await page.evaluate(() => window.__st.UI.screen === "create" && Object.keys(window.__st.UI.create.choices).length === 0)), "back on Create it starts fresh");
  for (let i = 0; i < eyeIndex; i++) await intent({ screen: "create", target: "", verb: "step:right" }, 40);
  await intent({ screen: "create", target: "", verb: "step:down" }, 100); }
s = await st(); const e1 = s.e, d1 = s.d, s1 = s.s;
await intent({ screen: "create", target: "", verb: "confirm" }, 400);
s = await st();
expect(s.bud && s.bud.minutes === 21 && s.bud.shaped.join() === "eye-rings", "the bud: 21 minutes, eye rings shaped");
expect(s.e === e1 - 2 && s.s === s1 - 4 && s.d === d1 - 1, "paid 2 ⚡ 4 ❀ 1 ◆");
expect((await page.evaluate(() => window.__st.UI.screen)) === "incubator", "on the Incubator (not built)");
{ const p = await props(); expect(p.state === "notBuilt" && p.frame.line.back === "Home", "after Grow (a jump) the Incubator reads ← Home: " + JSON.stringify(p.frame.line)); }
// the hand-off: the genome went to the Caddy service and is queued under its hash; the outbox is empty
// the page flushes at Grow and polls every thirty seconds; a slow runner can miss a short wait, so the journey also asks the client to flush through its test hook, for up to twenty seconds
for (let i = 0; i < 20 && (await st()).outbox.length; i++) { await page.evaluate(() => window.__st.caddy.flush()).catch(() => {}); await page.waitForTimeout(1000); }
if ((await st()).outbox.length) fail("the outbox did not flush to the Caddy service within twenty seconds, flushing once a second");
s = await st(); expect(s.bud.paint && ["sent", "queued", "painting", "done"].includes(s.bud.paint.state), "the bud's job is with the service: " + JSON.stringify(s.bud.paint));
expect(caddy.state.jobs.length === 1 && caddy.state.jobs[0].sha === s.bud.sha, "one job queued under the genome's hash");
await page.waitForTimeout(1600);
// the developer's skip: ready to open; Open: the juvenile steps out fully read, into a bay, its stamp whole
await page.evaluate(() => window.__st.skipBud("ready"));
await intent({ screen: "incubator", target: "", verb: "confirm" }, 300);
await page.waitForTimeout(3200);
s = await st(); const fig = s.mibis.at(-1);
expect(!s.bud && s.mibis.length === 2 && fig.name === "Moss" && fig.bay === 1 && fig.read.length === 4, "Moss opened into bay 2, fully read");
expect((await page.evaluate(() => window.__st.UI.screen)) === "habitat" && (await page.evaluate(() => window.__st.UI.hab.id)) === fig.id, "after the hatch the mibi is met on the Vivarium (not built), the ring on the door");
await shot("page-meet", true);
// the mock paints within a second; the page polls and fetches the set; it lands at a fresh draw (a screen change), never mid-draw
for (let i = 0; i < 40 && caddy.state.jobs[0].state !== "done"; i++) await page.waitForTimeout(200);
expect(caddy.state.jobs[0].state === "done", "the mock painted the set: " + caddy.state.jobs[0].state);
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(500);
const fetched = await page.evaluate((sha) => ({ pending: window.__st.caddy.pending().includes(sha), landed: window.__st.caddy.landed(sha) }), fig.sha);
expect(fetched.pending || fetched.landed, "the set is fetched: " + JSON.stringify(fetched));
await press("home", 400);
expect((await page.evaluate((sha) => window.__st.caddy.landed(sha), fig.sha)), "landed at the next fresh draw (Home)");
s = await st(); expect(s.mibis.find((m) => m.id === fig.id).paint?.state === "landed", "Moss's paint state is landed");
// fill the bays: Grow is refused before payment; return a mibi frees a bay for +2 Essence
await page.evaluate(() => window.__st.seedAdults("S01", 77, 4));
s = await st(); expect(s.mibis.filter((m) => !m.released).length === 6, "six bays taken");
{ const e2 = s.e, r = await page.evaluate((id) => { const p = window.__st.podById(id); return { msg: window.__st.grow(id, {}).msg ?? "", paid: window.__st.ST.bud }; }, loika2.id);
  expect(/no bay free/.test(r.msg) && !r.paid && (await st()).e === e2, "a full vivarium refuses before payment, nothing paid, nothing grown: " + JSON.stringify(r)); }
const adult = s.mibis.find((m) => m.name !== "Moss" && m.name !== "Dot");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, adult.id);
const s2 = (await st()).s; await intent({ screen: "habitat", target: "wild", verb: "confirm" }, 150); await intent({ screen: "habitat", target: "wild", verb: "confirm" }, 300);
s = await st(); expect(s.s === s2 + 2 && s.mibis.find((m) => m.id === adult.id).released && s.releases.at(-1).id === adult.id, "returned for +2 Essence and released");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, fig.id);
await intent({ screen: "habitat", target: "wild", verb: "confirm" }, 200); expect(/not until it is adult/.test(await page.evaluate(() => window.__st.msg)), "a juvenile stays: " + (await page.evaluate(() => window.__st.msg)));
await press("home", 200);
// 13. the service stops: Grow still works, the genome waits in the outbox and the lamp says waiting for the cloud; the service returns and the painting lands
caddyUp = false;
await page.evaluate(() => window.__st.addMaterials(10, 10, 10));
await press("research", 300);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id); await page.waitForTimeout(300);
await press("confirm", 400); await intent({ screen: "create", target: "", verb: "confirm" }, 400);
s = await st(); expect(s.bud && s.outbox.length === 1, "offline: the genome waits in the outbox");
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(300);
expect((await page.evaluate(() => window.__st.caddy.state.online)) === false, "the client knows the service is down");
await page.evaluate(() => window.__st.skipBud("ready")); await intent({ screen: "incubator", target: "", verb: "confirm" }, 300); await page.waitForTimeout(3200);
s = await st(); const later = s.mibis.at(-1);
caddyUp = true;
for (let i = 0; i < 20; i++) { await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(300); if (!(await st()).outbox.length) break; }   // wake the client through its hook until it has sent, up to six seconds
s = await st(); expect(s.outbox.length === 0, "the outbox went when the service answered (polled every 300 ms for up to six seconds)");
for (let i = 0; i < 40 && !caddy.state.jobs.some((j) => j.sha === later.sha && j.state === "done"); i++) await page.waitForTimeout(200);
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(400);
await press("home", 300);
expect((await page.evaluate((sha) => window.__st.caddy.landed(sha), later.sha)), "the second painting landed after the service returned");
// M4. Cross: free a bay, pair Dot with an unrelated adult Loika, see four seeds for the switches and a range for the blends at kinship 0; then siblings at a quarter
s = await st(); const adult2 = s.mibis.find((m) => !m.released && m.name !== "Dot" && m.name !== "Moss" && m.name !== "Pebble" && S_stage(s, m) === "adult");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, adult2.id);
await intent({ screen: "habitat", target: "wild", verb: "confirm" }, 150); await intent({ screen: "habitat", target: "wild", verb: "confirm" }, 300);
s = await st(); expect(s.mibis.find((m) => m.id === adult2.id).released, "a second adult returned to free a bay");
const dot = s.mibis.find((m) => m.name === "Dot"), adult3 = s.mibis.find((m) => !m.released && m.id !== dot.id && S_stage(s, m) === "adult");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "cross"; }, dot.id);
await intent({ screen: "habitat", target: "cross", verb: "confirm" }, 300);
expect((await page.evaluate(() => window.__st.UI.screen)) === "cross", "✓ on the cross mark opens the Cross screen (not built)");
await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, adult3.id); await page.waitForTimeout(300);
const fc = await page.evaluate(([a, b]) => window.__st.forecastOf(a, b), [dot.id, adult3.id]);
expect(fc.traits.filter((t) => t.kind === "switch").length === 2 && fc.traits.filter((t) => t.kind === "blend").length === 3, "four seeds for markings and crown, a range for eye rings, drive and efficiency");
expect(fc.traits.filter((t) => t.kind === "switch").every((t) => t.seeds.length === 4), "four seeds each");
{ await press("research", 300); const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, cross: window.__st.UI.cross }));
  expect(at.screen === "pods" && at.cross === null, "a room key on Cross drops the unpaid choices: " + JSON.stringify(at));
  await page.evaluate((id) => { window.__st.UI.hab.id = id; }, dot.id); await press("habitat", 300);
  expect((await page.evaluate(() => window.__st.UI.hab.f)) === "stage", "the Vivarium key puts the ring on the resident");
  await intent({ screen: "habitat", target: "cross", verb: "confirm" }, 300); await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, adult3.id); await page.waitForTimeout(300); }
{ const e3 = (await st()).e, s3 = (await st()).s, r = await page.evaluate(([a, b]) => window.__st.doCross(a, b), [dot.id, adult3.id]);
  await page.waitForTimeout(400); s = await st();
  expect(s.bud && s.bud.kind === "cross" && s.bud.parents.length === 2 && s.bud.parents[0].id === dot.id, "the child grows in the bud with its real parents");
  expect(s.e === e3 - 2 && s.s === s3 - 4, "paid 2 ⚡ 4 ❀"); }
await page.evaluate(() => window.__st.skipBud("ready"));
{ const k = await page.evaluate(() => { const b = window.__st.ST.bud, fr = window.__st.frameOf(b.species || b.sp); return { known: fr.chapters.map((c) => c.id).filter((c) => window.__st.budKnown(c)), read: b.read || [] }; });
  expect(JSON.stringify([...k.known].sort()) === JSON.stringify([...k.read].sort()), "the cross bud's known chapters are exactly its B.read (the unread ones stay '?') before Open: " + JSON.stringify(k)); }
await intent({ screen: "incubator", target: "", verb: "confirm" }, 300); await page.waitForTimeout(3200);
s = await st(); const child = s.mibis.at(-1);
expect(child.parents && child.parents.length === 2 && child.parents[1].genome, "the parents field: two snapshots with their genomes");
expect(child.read.length < 4, "the child is known only where the switch parents matched: " + child.read.join(","));
expect((await page.evaluate(([a, b]) => window.__st.kinshipOf(a, b), [child.id, dot.id])) === 0.25, "child and parent: kinship a quarter");
// reading the child on the Vivarium's card
await press("habitat", 300);
const chIndex = await page.evaluate((id) => { const m = window.__st.ST.mibis.find((x) => x.id === id), fr = window.__st.frameOf(m.species); return fr.chapters.findIndex((c) => !m.read.includes(c.id)); }, child.id);
await page.evaluate(([id, i]) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "ch" + i; }, [child.id, chIndex]);
const d3 = (await st()).d; await intent({ screen: "habitat", target: "ch" + chIndex, verb: "confirm" }, 300);
s = await st(); expect(s.mibis.find((m) => m.id === child.id).read.length === child.read.length + 1 && s.d <= d3, "the child's chapter read");
// the bench trickle's watch: a resident on the Vivarium for the dev timer's 5 s earns +1 Data once (after the dev panel's New bench day)
{ await page.evaluate(() => { window.__st.settings.watchMs = 5000; window.__st.settings.trickleCap = 2; window.__st.ST.bench = null; }); await press("habitat", 300);   // a new bench day (the dev button's reset)
  const watched = await page.evaluate(() => { const st = window.__st.ST, w = window.__st.SV.with, m = st.mibis.find((x) => !x.released && x.id !== w && !(st.bench?.watched || []).includes(x.id)); window.__st.UI.hab.id = m.id; return m.id; });
  const dW = (await st()).d; await page.waitForTimeout(5800); const after = await st();
  expect(after.d === dW + 1 && after.bench.watched.includes(watched), "a resident watched for 5 s on the Vivarium earns +1 Data once: " + JSON.stringify([dW, after.d, after.bench]));
  await page.waitForTimeout(1500); expect((await st()).d === after.d, "and no more from the same resident that day"); }
// siblings: kinship a quarter, the forecast narrowed
await page.evaluate(() => { window.__st.settings.bays = 12; });   // room for the siblings and their parents, and a bay for their child
const sib = await page.evaluate(() => window.__st.seedSiblings("S01", 4242));
expect(sib.ok, "two siblings seeded: " + sib.msg);
expect((await page.evaluate(([a, b]) => window.__st.kinshipOf(a, b), [sib.mibis[0].id, sib.mibis[1].id])) === 0.25, "siblings: kinship a quarter");
await press("home", 200);

// 7. every screen but Pods is not built: its room keys, ← and the first press on Idle work, with today's keys
const NAV = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/frame.json"), "utf8")).navigation.screens;
const placeOf = (screen) => ({ bench: "probe" }[screen] || screen), screenOfPlace = (pl) => ({ probe: "bench" }[pl.split(".")[0]] || pl.split(".")[0]);
{
  const SCREENS = ["home", "create", "incubator", "library", "habitat", "bench", "cross"];
  for (const name of SCREENS) {
    await page.evaluate((n) => window.__st.goto(n), name); await page.waitForTimeout(500);
    const p = await props(), c = await page.evaluate(() => window.__st.check()), nav = NAV[placeOf(name)];
    expect(p.screen === name && p.state === "notBuilt", `${name}: sends state notBuilt: ` + JSON.stringify([p.screen, p.state]));
    expect(c.log.type.some((t) => t.text === "this screen is not built yet") && c.log.type.some((t) => t.region === "title"), `${name}: the face draws the line and the title: ` + JSON.stringify(c.log.type.map((t) => t.text)));
    expect(c.log.regions.some((r) => r.id === "title" && r.layer === "painted"), `${name}: the title mark is drawn (a painted "title" region): ` + JSON.stringify(c.log.regions.filter((r) => r.id === "title")));
    const wantBack = nav?.back === "{pod}" ? await page.evaluate(() => { const q = window.__st.podById(window.__st.UI.pods.cur); return q ? window.__st.frameOf(q.species).species.name : "Back"; }) : nav?.back ?? null;   // a way back that names the pod names the pod the rack has under the beam
    expect((p.frame.line.back ?? null) === wantBack && !p.frame.line.ok, `${name}: ← names the parent (${wantBack ?? "none"}) and ✓ does nothing: ` + JSON.stringify(p.frame.line));
    const e = (await st()).e; await press("confirm", 150); await press("up", 100); await press("right", 100);
    expect((await ui()).screen === name && (await st()).e === e && (await props()).state === "notBuilt", `${name}: ✓ and the pad do nothing`);
    await frameShot("notbuilt-" + name, name === "home" || name === "habitat");
    // ← goes to the parent in the navigation tree; on Home nothing
    await press("back", 300); const to = (await ui()).screen;
    expect(nav?.parent ? to === screenOfPlace(nav.parent) : to === name, `${name}: ← goes to ${nav?.parent ?? "nowhere"}: ` + to);
    // each room key opens its room's top
    for (const [k, want] of [["research", "pods"], ["library", "library"], ["habitat", "habitat"], ["home", "home"]]) { await page.evaluate((n) => window.__st.goto(n), name); await page.waitForTimeout(250); await press(k, 300); expect((await ui()).screen === want, `${name}: the ${k} key opens ${want}: ` + (await ui()).screen); }
  }
  // the Dock key on Idle still acts: it wakes the screen and docks (or lifts)
  const dockBefore = JSON.stringify((await st()).dock); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(300); await press("dock", 400); let u = await ui();
  expect(!u.idle && JSON.stringify((await st()).dock) !== dockBefore, "the Dock key on Idle wakes and acts: " + JSON.stringify(u)); await press("dock", 400);
  // Idle: the first press only wakes (nothing moves, nothing opens, nothing is spent), on a screen that is not built and on Pods
  await press("home", 300); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(400);
  { const p = await props(), c = await page.evaluate(() => window.__st.check()); expect(p.idle === true && !p.frame, "Idle sends no frame: " + JSON.stringify(Object.keys(p))); expect(JSON.stringify(c.log.type.map((t) => t.text)) === JSON.stringify(["Idle is not built yet"]), "Idle shows its line and nothing else: " + JSON.stringify(c.log.type.map((t) => t.text))); await frameShot("notbuilt-idle", true); }
  const e = (await st()).e; await press("confirm", 400); u = await ui();
  expect(!u.idle && u.screen === "home" && (await st()).e === e && (await props()).state === "notBuilt", "the first press on Idle only wakes: " + JSON.stringify(u));
  await press("research", 300); const f0 = await focusNow(); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(400); await press("right", 400);
  expect(!(await ui()).idle && (await focusNow()) === f0 && (await ui()).screen === "pods", "on Pods the first press on Idle wakes and the ring stays: " + JSON.stringify([await ui(), f0, await focusNow()]));
}
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mb-save-v8")));
expect(stored.st.schema === 2 && stored.st.tray.length === (await st()).tray.length && stored.st.mibis.length === (await st()).mibis.length && JSON.stringify({ ...stored, st: undefined }) === companionBefore, "the save round-trips and the Companion's part is untouched");
// 8. the CI smoke's presses, from a fresh world with no save
await page.evaluate(() => { localStorage.removeItem("mb-save-v8"); });

await assertFace("the journey");
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?test`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
expect((await st()).tray.length === 0 && !(await sv()).seed, "a fresh world: no save, no pods");
await page.keyboard.press("KeyD"); await page.waitForTimeout(250);
expect(/No Companion world yet/.test(await page.evaluate(() => window.__st.msg)), "docking without a world says so");
for (const k of ["KeyR", "ArrowRight", "Enter", "KeyL", "KeyB", "KeyD", "KeyH"]) { await page.keyboard.press(k); await page.waitForTimeout(200); }
await page.waitForTimeout(300); await shot("page-fresh");
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
if (checks.textApiCalls !== 0) { errors.push("the page called the canvas text API " + checks.textApiCalls + " times"); console.error("FAIL text API calls " + checks.textApiCalls); }
if (external.length) { errors.push("requests left the page's origin: " + external.join(", ")); console.error("FAIL external requests " + external.join(", ")); }
{ const r = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); expect(r.render.length === 0 && r.face.length === 0, "no render threw and the face sent no error: " + JSON.stringify(r)); }
await assertFace("the fresh world");
const checksFile = process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
writeFileSync(checksFile, JSON.stringify(checks));
console.log("recorded " + checks.shots.length + " screenshot points for the layer checks in " + checksFile);
await browser.close(); server.close(); caddy.stop(); caddyServer.close();
if (errors.length) { console.error("journey failed:\n" + errors.join("\n")); process.exit(1); }
// The milestones whose screens are not on the face yet: their steps are listed from journey-pending/ on every run and run when the screen is built (lvgl-switch.md §4).
{ const dir = path.join(here, "journey-pending"), files = readdirSync(dir).filter((f) => /^L2\.\d\.mjs$/.test(f)).sort();
  for (const f of files) { const { milestone, steps } = await import(pathToFileURL(path.join(dir, f)).href); console.log(`pending until ${milestone} is on the LVGL face (${steps.length} steps in tools/journey-pending/${f}):\n` + steps.map((p) => "  · " + p.id + ": " + p.what).join("\n")); } }
console.log("journey ok · screenshots in img/");
