#!/usr/bin/env node
// The Station's journey (station-build.md §5), headless: serves prototypes/ as the sandbox does, loads a
// v8 fixture save, seeds a Loika crate through the developer hooks, docks, opens the bay, identifies,
// reads Coat then Face at the decided prices, compares two pods, returns one, and checks the drawn stamp
// decodes to the pod's genome. Fails on any page error. Screenshots go to img/.
//   node tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decode } from "../../genome-stamp/src/decode.mjs";
import { sameGenome } from "../../genome-stamp/src/codec.mjs";
import { frameFor } from "../../genome-stamp/src/frames.mjs";
import { createApp, loadFrames as loadCaddyFrames } from "../../caddy/app.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import http from "node:http";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown" };
// The Caddy service in mock mode beside the static server (station-build.md §5), its calls proxied under /caddy-api/ as the VM's web server does.
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
// Nothing is fetched from the network but the page's own files and the Caddy service (the fonts are bundled).
const external = []; page.on("request", (r) => { if (!r.url().startsWith(`http://127.0.0.1:`)) external.push(r.url()); });
mkdirSync(path.join(here, "../img"), { recursive: true });
// Every screenshot point records what the layer checks read (tools/checks.mjs): the layers' palette counts, the type log, the scene's regions.
const checks = { shots: [], textApiCalls: 0 };   // the text API's calls are summed over the page loads
// A canvas capture at 1×: the 1024×600 frame itself, as the layers composed it (prototypes/station/img/pods-*.png).
const frameShot = async (name) => { checks.shots.push({ name, check: await page.evaluate(() => window.__st.check()) }); const url = await page.evaluate(() => window.__st.capture()); writeFileSync(path.join(here, `../img/${name}.png`), Buffer.from(url.split(",")[1], "base64")); };
const shot = async (name) => { checks.shots.push({ name, check: await page.evaluate(() => window.__st.check()) }); return page.screenshot({ path: path.join(here, `../img/${name}.png`), fullPage: false }); };
const fixture = readFileSync(path.join(here, "../tests/fixtures/save-v8-schema1.json"), "utf8");
const companionBefore = JSON.stringify({ ...JSON.parse(fixture), st: undefined });
await page.addInitScript(() => { window.__fillTextCalls = 0; for (const f of ["fillText", "strokeText", "measureText"]) { const o = CanvasRenderingContext2D.prototype[f]; CanvasRenderingContext2D.prototype[f] = function (...a) { window.__fillTextCalls++; return o.apply(this, a); }; } });
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
// The atlases the page draws from are the committed ones: their files hash to what the index records, and the index's sources are the committed frozen TTFs.
{
  const dir = path.join(here, "../../ui/fonts"), sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex"), index = JSON.parse(readFileSync(path.join(dir, "atlas/index.json"), "utf8"));
  const sums = Object.fromEntries(readFileSync(path.join(dir, "inter/src/SHA256SUMS"), "utf8").trim().split("\n").map((l) => l.split(/\s+/).reverse()));
  for (const f of index.faces) {
    if (sha(path.join(dir, "atlas", f.atlas)) !== f.sha256.atlas) fail(`atlas ${f.atlas} does not match the hash in the index`);
    if (sha(path.join(dir, "atlas", f.metrics)) !== f.sha256.metrics) fail(`metrics ${f.metrics} do not match the hash in the index`);
    const m = JSON.parse(readFileSync(path.join(dir, "atlas", f.metrics), "utf8"));
    if (sums[m.source.replace(".ttf", "-tnum.ttf")] !== m.sourceSha256) fail(`${f.id} was baked from a TTF other than the committed ${m.source}`);
  }
  console.log("atlases: " + index.faces.length + " faces, files hash to the index, baked from the committed frozen TTFs");
}
// The type is baked atlases of Inter (prototypes/ui/fonts/atlas), blitted as glyph runs: no font is loaded by the page, and no request leaves the page's origin.
if (external.length) { errors.push("requests left the page's origin: " + external.join(", ")); console.error("FAIL external requests " + external.join(", ")); }
const fillText = await page.evaluate(() => window.__fillTextCalls);
if (fillText !== 0) { errors.push("the page called the canvas text API " + fillText + " times"); console.error("FAIL fillText " + fillText); }
console.log("type: glyph runs from the Inter atlases · text API calls " + fillText + " · external requests " + external.length);
const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.ST)));
const sv = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.SV)));
const press = async (k, ms = 120) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(ms); };
const line = () => page.evaluate(() => window.__st.lineFor());
// The type layer's run log, read back: every run is Inter at 16, 20 or 28 px (the weight of that size) from a bundled atlas, and no character is missing from the atlases.
const FACES = { 16: [400, "inter-400-16", "inter-400-16.png"], 20: [500, "inter-500-20", "inter-500-20.png"], 28: [600, "inter-600-28", "inter-600-28.png"] };
const assertType = async (when) => {
  const log = await page.evaluate(() => window.__st.typeLog()), missing = await page.evaluate(() => window.__st.typeMissing());
  const bad = log.filter((r) => { const f = FACES[r.px]; return r.family !== "Inter" || !f || r.weight !== f[0] || r.face !== f[1] || r.atlas !== f[2]; });
  for (const r of bad.slice(0, 3)) fail(`type (${when}): "${r.text}" is ${r.family} ${r.weight}/${r.px} from ${r.atlas}, not a bundled Inter at 16, 20 or 28 px`);
  if (missing.length) fail(`type (${when}): characters missing from the atlases: ${missing.join(" ")}`);
  console.log(`type log (${when}): ${log.length} distinct runs, ${bad.length} off-spec, ${missing.length} missing characters`);
};
const expect = (cond, what) => { if (!cond) fail(what); };
const S_stage = (s, m) => { const age = s.turn - (m.born || 0); return age < 2 ? "juvenile" : "adult"; };

// 1. the fixture migrated: pods carry genomes from their seeds, the mibi keeps its id and name, the Companion's part is byte-identical
let s = await st();
expect(s.schema === 2, "schema 2 after the migration");
expect(s.tray.length === 2 && s.tray[0].genome && s.tray[0].gs === 1111, "the pods keep their seeds and carry genomes");
expect(s.mibis.length === 1 && s.mibis[0].id === 1 && s.mibis[0].name === "Dot" && s.mibis[0].code, "Dot keeps id and name and has a code");
const svNow = await sv();
expect(JSON.stringify({ ...svNow, st: undefined }) === companionBefore, "the Companion's part is byte-identical after the migration");
await page.waitForTimeout(400); await shot("page-home");
// 2. seed one Loika pod (fixed seed) beside the fixture's crate; dock; open the bay
await page.evaluate(() => window.__st.seedCrate("S01", 1, 4242));
await press("dock", 300);
s = await st(); expect(s.dock.docked, "docked");
await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(200);
s = await st();
expect(s.accepted.includes("xw2n9c-5") && s.accepted.filter((id) => id.startsWith("dev-")).length === 1, "both crates accepted once");
expect(s.tray.length === 4, "four pods in the wells: " + s.tray.length);
await page.evaluate(() => window.__st.openBay()); s = await st(); expect(s.tray.length === 4, "an accepted crate never reopens");
await page.waitForTimeout(3300); await shot("page-arrival");
await page.evaluate(() => { window.__st.unlock(); });
// 3. Pods: identify the Tuikis (already identified in the fixture) is skipped; identify the new Loika pod
await press("research", 200);
const loika = s.tray.find((p) => p.id.startsWith("xw2n9c-5")), loika2 = s.tray.find((p) => p.id.startsWith("dev-"));
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id);
const e0 = s.e;
let l = await line(); expect(/Identify/.test(l.ok) && l.price === "1 ⚡", "identify costs 1 Energy (the first was spent in the fixture): " + JSON.stringify(l));
await press("confirm", 2200);
s = await st(); const pl = s.tray.find((p) => p.id === loika.id);
expect(pl.idd === 1 && s.e === e0 - 1, "identified for 1 Energy");
await page.evaluate(() => window.__st.unlock());
await shot("page-identified");
// 4. read Coat (the fixture spent the free read): 1 Data; then Face: 2 Data; a second Loika's Face costs 1
await press("up", 150);
l = await line(); expect(/Open Coat/.test(l.ok) && !l.price, "on the overview a tab opens its page, free: " + JSON.stringify(l));
await press("confirm", 150); expect((await page.evaluate(() => window.__st.UI.pods.view)) === "chapter", "✓ on a tab opens the chapter page");
l = await line(); expect(/Read Coat/.test(l.ok) && l.price === "1 ◆", "Coat costs 1 Data: " + JSON.stringify(l));
const d0 = s.d;
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.tray.find((p) => p.id === loika.id).read.includes("coat") && s.d === d0 - 1, "Coat read for 1 Data");
expect(s.tray.find((p) => p.id === loika.id).first !== undefined, "the first-shown looks are saved on the pod at read time");
await press("right", 150);
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "2 ◆", "Face costs 2 Data: " + JSON.stringify(l));
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.d === d0 - 3, "Face read for 2 Data");
await shot("page-read");
// the art layer is on the palette exactly; the type is its own layer, anti-aliased by decision
expect((await page.evaluate(() => window.__st.offPalette())) === 0, "the art layer has 0 off-palette pixels");
// the drawn stamp decodes to the pod's genome
const img = await page.evaluate((id) => { const r = window.__st.stampRGBA(id, 200); return { width: r.width, height: r.height, data: Array.from(r.data) }; }, loika.id);
const sg = await page.evaluate((id) => window.__st.stampGenome(id), loika.id);
const dec = decode({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
expect(dec.stamps.length === 1 && sameGenome(frameFor(sg.species, sg.version), sg, dec.stamps[0].genome), "the drawn stamp decodes to the genome");
expect(dec.stamps.length === 1 && dec.stamps[0].genome.read.join() === "Coat,Face", "the stamp's mask: Coat and Face read");
await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(300);   // the stamp is on the overview
// and the stamp as it is on the screen, at the label's size on whole-pixel cells, read back from the art layer's pixels, decodes too
const lab = await page.evaluate(() => window.__st.region("art", window.__st.specs().pods.regions.overview.stamp.rect));
const onScreen = decode({ width: lab.width, height: lab.height, data: new Uint8ClampedArray(lab.data) });
expect(onScreen.stamps.length === 1 && sameGenome(frameFor(sg.species, sg.version), sg, onScreen.stamps[0].genome), "the stamp on its 120 label, as drawn on the screen, decodes to the genome");
// the second Loika: identify (1 Energy), its Face costs 1 (half of two, rounded up)
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id);
await press("confirm", 1000); await page.evaluate(() => window.__st.unlock());
await page.evaluate((id) => window.__st.podsGo(id, "rail.1"), loika2.id);   // to its Face on the page
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "1 ◆", "a second Loika's Face costs 1: the lower number, no word, on the bottom line: " + JSON.stringify(l));
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
// a glint on the first Loika? (only when the second carried something new: not asserted); the need line never shows digits of progress
// 5. Compare: from the second Loika's pod, ← to its well, walk to the first Loika's well, ✓
s = await st();
const i1 = s.tray.findIndex((p) => p.id === loika.id), i2 = s.tray.findIndex((p) => p.id === loika2.id);
await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika2.id); await press("right", 100);   // the pod's overview: → to its kin
l = await line(); expect(l.ok === "Compare", "compare offered on another Loika pod: " + JSON.stringify(l));
await press("confirm", 300); await shot("page-compare");
l = await line(); expect(/two Loika pods/.test(l.subject), "compare open: " + JSON.stringify(l));
await press("back", 200);
// P. Pods on the screen layer: the pod by its size class, the rail as the species has chapters, the page by trait count, the focus
// graph through the keys, the holds of Identify and a read, Compare, the hatch armed, the empty rack; every point recorded for the checks.
const focusNow = () => page.evaluate(() => window.__st.UI.pods.focus.cur), curPod = () => page.evaluate(() => window.__st.UI.pods.cur);
// Home's rack: ✓ on the tray opens the collection with the ring on the pod that most needs the player (an open question for the UI designer: the spec says a pod in the rack goes straight to its overview, and Home's tray is one target); ← goes up to Home
await press("home", 300); await page.evaluate(() => { window.__st.UI.home.f = "tray"; }); await press("confirm", 300);
{ const here = await page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, f: window.__st.UI.pods.focus.cur }));
  const want = await page.evaluate(() => { const t = window.__st.ST.tray, p = t.find((q) => !q.idd) || t.find((q) => window.__st.podGlints(q)) || t[0]; return "place." + t.indexOf(p); });
  expect(here.screen === "pods" && here.view === "collection" && here.f === want, "Home's rack opens the collection with the ring on the pod that most needs the player (" + want + "): " + JSON.stringify(here));
  await press("back", 300); expect((await page.evaluate(() => window.__st.UI.screen)) === "home", "← from the collection is Home"); await press("research", 300); }
await press("research", 200);
await page.evaluate(() => { window.__st.seedCrate("S02", 1, 515); window.__st.seedCrate("S09", 1, 909); window.__st.openBay(); }); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.tray.length === 6, "six pods in the wells: " + s.tray.length);
const untuva = s.tray.find((p) => p.species === "S02"), coatSix = s.tray.find((p) => p.species === "S09"), tuikisPod = s.tray.find((p) => p.species === "S03");
await page.evaluate((id) => { window.__st.podsGo(id, "pod", undefined, 0); }, untuva.id);
await page.waitForTimeout(400);
l = await line(); expect(l.ok === "Identify" && l.price === "1 ⚡", "an unidentified pod offers Identify: " + JSON.stringify(l));
await frameShot("pods-unidentified");
// Identify holds input for its seal: a key pressed meanwhile is consumed; the ring stays on the pod
await press("confirm", 500); expect(await page.evaluate(() => window.__st.holding()), "Identify holds input"); await frameShot("pods-identifying");
await page.evaluate(() => window.__st.press("left")); await page.waitForTimeout(100); expect((await focusNow()) === "pod", "a key during the seal is consumed");
await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.tray.find((p) => p.id === untuva.id).idd === 1, "the Untuva is identified");
// the focus graph through the keys on the overview: ▲ to the rail's last chapter looked at, ▶ steps the chapters, ▼ to the pod, → to the hatch (this pod has no kin), ◀ back to the pod; ← up to the collection with the ring on this pod, ✓ down again
const walk = async (keys, want, what) => { for (const k of keys) await press(k, 60); const got = await focusNow(); expect(got === want, what + ": " + got + " not " + want); };
const viewNow = () => page.evaluate(() => window.__st.UI.pods.view);
await walk(["up"], "rail.0", "▲ from the pod to the rail's last chapter looked at");
await walk(["right", "right"], "rail.2", "▶ steps the chapters"); await walk(["down"], "pod", "▼ from the rail to the pod"); await walk(["up"], "rail.2", "▲ again: the last chapter looked at"); await walk(["down"], "pod", "▼ back to the pod");
await walk(["right"], "hatch", "→ from the pod to the hatch when it has no kin"); await walk(["left"], "pod", "◀ from the hatch to the pod");
const idx = s.tray.findIndex((p) => p.id === untuva.id);
await walk(["back"], "place." + idx, "← up to the collection, the ring on this pod"); expect((await viewNow()) === "collection", "← from the overview is the collection");
await frameShot("pods-collection");
await walk(["confirm"], "pod", "✓ on a place opens its overview"); expect((await viewNow()) === "overview", "the overview");
// a sealed chapter (the Untuva's Character): no ✓ cap, the subject "Character is sealed", the slats on its page; the page's traits unread: frost
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.3"); }, untuva.id); await page.waitForTimeout(300);
l = await line(); expect(!l.ok && l.subject === "Character is sealed", "a sealed chapter has no ✓ cap: " + JSON.stringify(l)); await frameShot("pods-sealed");
// the Tuikis: eight chapters, tabs 96 on a 104 pitch; the Coat has four traits (216×112 pictures)
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.0"); }, tuikisPod.id); await page.waitForTimeout(300); await frameShot("pods-eight-chapters");
// the Large pod with six Coat traits (144×112 pictures), read whole by the developer
await page.evaluate((id) => { window.__st.skipRead(id); window.__st.podsGo(id, "rail.0"); }, coatSix.id); await page.waitForTimeout(300); await frameShot("pods-six-traits");
for (const [i, name] of [[1, "pods-belatz-face"], [3, "pods-belatz-legs-tail"]]) { await page.evaluate(([id, n]) => window.__st.podsGo(id, "rail." + n), [coatSix.id, i]); await page.waitForTimeout(300); await frameShot(name); }   // the Belatz pages with the studio's crops
// reading mid-wipe: a fresh pod's first chapter; input held for the wipe
await page.evaluate(() => window.__st.seedCrate("S01", 1, 31337)); await page.evaluate(() => window.__st.openBay()); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.waiting.length === 1, "the rack is full: the new pod waits for a well");
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, coatSix.id);
// the hatch: the first ✓ arms with a plate, any other key disarms, the second ✓ returns
l = await line(); expect(l.ok === "Return to the wild" && l.price === "+1 ❀", "the hatch offers the return: " + JSON.stringify(l));
await press("confirm", 150); l = await line(); expect(l.ok === "Again: return it", "armed: " + JSON.stringify(l)); await frameShot("pods-hatch-armed");
await press("up", 100); l = await line(); expect(l.ok !== "Again: return it", "any other key disarms the hatch"); expect((await page.evaluate(() => window.__st.UI.pods.wildArm)) === 0, "the disarm cleared the armed state"); await page.evaluate(() => window.__st.podsGo(window.__st.UI.pods.cur, "hatch"));
const sBefore = (await st()).s; await press("confirm", 100); await press("confirm", 300); s = await st();
expect(s.s === sBefore + 1 && !s.tray.some((p) => p.id === coatSix.id), "the second ✓ returned the pod for +1 Essence: " + JSON.stringify({ s: s.s, sBefore, still: s.tray.some((p) => p.id === coatSix.id), line: await line(), view: await viewNow(), f: await focusNow(), arm: await page.evaluate(() => window.__st.UI.pods.wildArm), screen: await page.evaluate(() => window.__st.UI.screen) }));
// the same for the Untuva, which leaves the rack as it was; the waiting pod (if any) takes the well
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, untuva.id); await press("confirm", 100); await press("confirm", 300);
s = await st(); expect(!s.tray.some((p) => p.id === untuva.id), "the Untuva returned");
const extra = s.tray.find((p) => p.species === "S01" && !p.idd && p.id !== loika.id && p.id !== loika2.id);
expect(!!extra, "the pod that waited for a well entered the rack when one freed"); {   // not skipped when absent: the read-holds-input assertion and the pods-reading capture must run
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, extra.id); await press("confirm", 700); await page.evaluate(() => window.__st.unlock()); await page.evaluate(() => { window.__st.podsGo(window.__st.UI.pods.cur, "rail.0"); }); await page.waitForTimeout(150); await press("confirm", 900); expect(await page.evaluate(() => window.__st.holding()), "a read holds input for its wipe"); await frameShot("pods-reading-wipe"); await page.evaluate(() => window.__st.unlock()); await page.waitForTimeout(400); await frameShot("pods-reading"); await page.evaluate(() => { window.__st.podsGo(window.__st.UI.pods.cur, "rail.1"); }); await page.waitForTimeout(300); await frameShot("pods-unread-chapter"); await page.evaluate(() => { window.__st.podsGo(window.__st.UI.pods.cur, "rail.0"); });   // the wipe mid-way, then the page after it
  await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, extra.id); await press("confirm", 100); await press("confirm", 300); }
s = await st(); expect(s.tray.length === 4, "the rack is back to its four pods: " + s.tray.length);
// P2. Compare with one, two, four and six traits and a difference mark on the layer; then the empty rack. Each pair is a fresh crate of two pods, read whole by the developer, compared, and given back through the hatch.
const compareShot = async (species, seed, ci, name, grid) => {
  await page.evaluate(([sp, sd]) => { window.__st.seedCrate(sp, 2, sd); window.__st.openBay(); }, [species, seed]); await page.waitForTimeout(3300); await page.evaluate(() => window.__st.unlock());
  const pair = (await st()).tray.filter((p) => p.species === species && !p.idd);
  expect(pair.length === 2, `two ${species} pods in the wells: ` + pair.length);
  for (const p of pair) await page.evaluate((id) => window.__st.skipRead(id), p.id);
  await page.evaluate(([a, b, c]) => { const u = window.__st.UI.pods; u.cur = a; u.cmp = { a, b, ci: c }; }, [pair[0].id, pair[1].id, ci]); await page.waitForTimeout(300);
  const cl = await line(), cells = await page.evaluate(() => window.__st.check().regions.filter((r) => r.region === "page.cell" && r.id.startsWith("pageA.")).length);
  expect(cells === grid, `${name}: ${grid} traits on Compare's page: ${cells}`);
  expect(["they differ here", "they differ in another chapter", "no read trait differs"].includes(cl.need), `${name}: Compare's need line is one of the spec's strings: ` + JSON.stringify(cl));
  expect(!/\d/.test(cl.subject || "") && !/well \d/.test(cl.subject || ""), `${name}: no digits in the line`);
  const differs = await page.evaluate(([a, b]) => window.__st.compareDiff(a, b).length, [pair[0].id, pair[1].id]);
  await frameShot(name);
  await page.evaluate(() => { window.__st.UI.pods.cmp = null; });
  for (const p of pair) { await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, p.id); await press("confirm", 100); await press("confirm", 300); }
  expect(!(await st()).tray.some((p) => pair.some((q) => q.id === p.id)), `${name}: the pair went back through the hatch`);
  return differs;
};
const needs = [await compareShot("S04", 4101, 0, "pods-compare-one", 1), await compareShot("S09", 4102, 3, "pods-compare-two", 2), await compareShot("S03", 4103, 0, "pods-compare-four", 4), await compareShot("S09", 4104, 0, "pods-compare-six", 6)];
expect(needs.some((n) => n > 0), "at least one Compare pair has a trait that differs (the data; the build marks none): " + needs.join(" | "));
{   // the empty rack (docked, the bay empty): the cradle under the beam and nothing else; the wells are put back after
  await page.evaluate(() => { const g = window.__st.ST; window.__keep = { tray: g.tray, waiting: g.waiting }; g.tray = []; g.waiting = []; window.__st.UI.pods.cur = null; window.__st.UI.pods.cmp = null; }); await page.waitForTimeout(300);
  const el = await line(); expect(el.subject === "the rack is empty" && el.need === "take the Companion exploring", "the empty rack's lines: " + JSON.stringify(el));
  await frameShot("pods-empty-rack");
  await page.evaluate(() => window.__st.seedCrate("S04", 1, 9090)); await page.waitForTimeout(200);   // docked, a crate waiting in the bay
  const crateLine = await line(); expect(crateLine.need === "open the bay at Home", "the empty rack with a crate in the bay: " + JSON.stringify(crateLine));
  await page.evaluate(() => { window.__st.ST.devBay.length = 0; });   // the crate is taken away again, unopened
  await page.evaluate(() => { const g = window.__st.ST; g.tray = window.__keep.tray; g.waiting = window.__keep.waiting; window.__st.UI.pods.cur = null; }); await page.waitForTimeout(200);
}
s = await st();
// 6. return the Tuikis to the wild: +1 Essence, the Companion's record
const tuikis = s.tray.find((p) => p.species === "S03");
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, tuikis.id);
const s0 = s.s;
await press("confirm", 150); await press("confirm", 300);
s = await st(); expect(s.s === s0 + 1 && !s.tray.some((p) => p.id === tuikis.id) && s.returned.at(-1).id === tuikis.id, "returned for +1 Essence");
// M2. Create: shape eye rings on the read Loika (+1 Data), Grow: a bud of twenty-one minutes (this world grew Dot already), the genome in the outbox
await press("research", 200);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id);
l = await line(); expect(l.ok === "Shape a founder", "a read pod offers Create: " + JSON.stringify(l));
await press("confirm", 300);
expect((await page.evaluate(() => window.__st.UI.screen)) === "create", "on Create");
// walk to eye rings and roll it once
const eyeIndex = await page.evaluate((id) => { const p = window.__st.podById(id), fr = window.__st.frameOf(p.species); return fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits).findIndex((t) => t.id === "eye-rings"); }, loika.id);
for (let i = 0; i < eyeIndex; i++) await press("right", 80);
await press("down", 200);
l = await line(); expect(/1 ◆/.test(l.price) && /2 ⚡ 4 ❀/.test(l.price), "Grow costs 2 Energy 4 Essence and 1 Data for the change: " + JSON.stringify(l));
expect(/21 leaves/.test(l.need), "a bud of twenty-one minutes: " + JSON.stringify(l));
await shot("page-create");
s = await st(); const e1 = s.e, d1 = s.d, s1 = s.s;
await press("confirm", 1000); await page.evaluate(() => window.__st.unlock());
s = await st();
expect(s.bud && s.bud.minutes === 21 && s.bud.shaped.join() === "eye-rings", "the bud: 21 minutes, eye rings shaped");
expect(s.e === e1 - 2 && s.s === s1 - 4 && s.d === d1 - 1, "paid 2 ⚡ 4 ❀ 1 ◆");
expect((await page.evaluate(() => window.__st.UI.screen)) === "incubator", "on the Incubator");
// the hand-off: the genome went to the Caddy service and is queued under its hash; the outbox is empty
// the page flushes at Grow and polls every thirty seconds; a slow runner can miss a short wait, so the journey also asks the client to flush through its test hook, for up to twenty seconds
for (let i = 0; i < 20 && (await st()).outbox.length; i++) { await page.evaluate(() => window.__st.caddy.flush()).catch(() => {}); await page.waitForTimeout(1000); }
if ((await st()).outbox.length) fail("the outbox did not flush to the Caddy service within twenty seconds, flushing once a second");
s = await st(); expect(s.bud.paint && ["sent", "queued", "painting", "done"].includes(s.bud.paint.state), "the bud's job is with the service: " + JSON.stringify(s.bud.paint));
expect(caddy.state.jobs.length === 1 && caddy.state.jobs[0].sha === s.bud.sha, "one job queued under the genome's hash");
await page.waitForTimeout(1600); await shot("page-incubator");
l = await line(); expect(l.ok === "Grow now", "instant grow offered while growing: " + JSON.stringify(l));
// the developer's skip: ready to open; Open: the juvenile steps out fully read, into a bay, its stamp whole
await page.evaluate(() => window.__st.skipBud("ready"));
l = await line(); expect(l.ok === "Open", "ready: " + JSON.stringify(l));
await press("confirm", 300); await shot("page-hatch");
await page.waitForTimeout(2800); await page.evaluate(() => window.__st.unlock());
s = await st(); const fig = s.mibis.at(-1);
expect(!s.bud && s.mibis.length === 2 && fig.name === "Moss" && fig.bay === 1 && fig.read.length === 4, "Moss opened into bay 2, fully read");
expect((await page.evaluate(() => window.__st.UI.screen)) === "habitat", "the meet view on Habitat");
await page.waitForTimeout(300); await shot("page-meet");
l = await line(); expect(/Take Moss with you/.test(l.ok), "the door is focused: " + JSON.stringify(l));
// the mock paints within a second; the page polls and fetches the set; it lands at a fresh draw (a screen change), never mid-draw
for (let i = 0; i < 40 && caddy.state.jobs[0].state !== "done"; i++) await page.waitForTimeout(200);
expect(caddy.state.jobs[0].state === "done", "the mock painted the set: " + caddy.state.jobs[0].state);
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(500);
const fetched = await page.evaluate((sha) => ({ pending: window.__st.caddy.pending().includes(sha), landed: window.__st.caddy.landed(sha) }), fig.sha);
expect(fetched.pending || fetched.landed, "the set is fetched: " + JSON.stringify(fetched));
await shot("page-meet-placeholder");
await press("home", 300);
expect((await page.evaluate((sha) => window.__st.caddy.landed(sha), fig.sha)), "landed at the next fresh draw (Home)");
s = await st(); expect(s.mibis.find((m) => m.id === fig.id).paint?.state === "landed", "Moss's paint state is landed");
await press("habitat", 400); await shot("page-painted");
// fill the bays: Grow is refused before payment; return a mibi frees a bay for +2 Essence
await page.evaluate(() => window.__st.seedAdults("S01", 77, 4));
s = await st(); expect(s.mibis.filter((m) => !m.released).length === 6, "six bays taken");
await press("research", 200);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id);
l = await line(); expect(/no bay free/.test(l.need), "a full vivarium refuses before payment: " + JSON.stringify(l));
const e2 = (await st()).e; await press("confirm", 200); expect((await st()).e === e2 && !(await st()).bud, "nothing paid, nothing grown");
await press("habitat", 200);
const adult = s.mibis.find((m) => m.name !== "Moss" && m.name !== "Dot");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, adult.id);
l = await line(); expect(/Return .* to the wild/.test(l.ok) && l.price === "+2 ❀", "return offered on an adult: " + JSON.stringify(l));
const s2 = (await st()).s; await press("confirm", 150); await press("confirm", 300);
s = await st(); expect(s.s === s2 + 2 && s.mibis.find((m) => m.id === adult.id).released && s.releases.at(-1).id === adult.id, "returned for +2 Essence and released");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, fig.id);
l = await line(); expect(/not until it is adult/.test(l.subject), "a juvenile stays: " + JSON.stringify(l));
await press("home", 200);
// 13. the service stops: Grow still works, the genome waits in the outbox and the lamp says waiting for the cloud; the service returns and the painting lands
caddyUp = false;
await page.evaluate(() => window.__st.addMaterials(10, 10, 10));
await press("research", 200);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id);
await press("confirm", 300); await press("confirm", 1000); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.bud && s.outbox.length === 1, "offline: the genome waits in the outbox");
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(300);
expect((await page.evaluate(() => window.__st.caddy.state.online)) === false, "the client knows the service is down");
await page.evaluate(() => window.__st.skipBud("ready")); await press("confirm", 300); await page.waitForTimeout(2800); await page.evaluate(() => window.__st.unlock());
s = await st(); const later = s.mibis.at(-1);
expect(/waiting for the cloud/.test(await page.evaluate(() => { const m = window.__st.ST.mibis.at(-1); return window.__st.caddy.state.online === false ? "waiting for the cloud" : ""; })), "the lamp says waiting for the cloud");
await shot("page-offline");
caddyUp = true;
for (let i = 0; i < 20; i++) { await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(300); if (!(await st()).outbox.length) break; }   // wake the client through its hook until it has sent, up to six seconds
s = await st(); expect(s.outbox.length === 0, "the outbox went when the service answered (polled every 300 ms for up to six seconds)");
for (let i = 0; i < 40 && !caddy.state.jobs.some((j) => j.sha === later.sha && j.state === "done"); i++) await page.waitForTimeout(200);
await page.evaluate(() => window.__st.caddy.poll()); await page.waitForTimeout(400);
await press("home", 300);
expect((await page.evaluate((sha) => window.__st.caddy.landed(sha), later.sha)), "the second painting landed after the service returned");
// M4. Cross: free a bay, pair Dot with an unrelated adult Loika, see four seeds for the switches and a range for the blends at kinship 0, cross, open, read the child; then siblings at a quarter
await press("habitat", 200);
s = await st(); const adult2 = s.mibis.find((m) => !m.released && m.name !== "Dot" && m.name !== "Moss" && m.name !== "Pebble" && S_stage(s, m) === "adult");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "wild"; }, adult2.id);
await press("confirm", 150); await press("confirm", 300);
s = await st(); expect(s.mibis.find((m) => m.id === adult2.id).released, "a second adult returned to free a bay");
const dot = s.mibis.find((m) => m.name === "Dot"), adult3 = s.mibis.find((m) => !m.released && m.id !== dot.id && S_stage(s, m) === "adult");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "cross"; }, dot.id);
l = await line(); expect(/Cross Dot/.test(l.ok), "the cross mark on an adult: " + JSON.stringify(l));
await press("confirm", 300);
expect((await page.evaluate(() => window.__st.UI.screen)) === "cross", "on the Cross screen");
await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, adult3.id); await page.waitForTimeout(600);
l = await line(); expect(l.ok === "Cross them" && /2 ⚡ 4 ❀/.test(l.price) && /wild founders/.test(l.need), "the cross offered at 2 Energy 4 Essence, kinship 0: " + JSON.stringify(l));
const fc = await page.evaluate(([a, b]) => window.__st.forecastOf(a, b), [dot.id, adult3.id]);
expect(fc.traits.filter((t) => t.kind === "switch").length === 2 && fc.traits.filter((t) => t.kind === "blend").length === 3, "four seeds for markings and crown, a range for eye rings, drive and efficiency");
expect(fc.traits.filter((t) => t.kind === "switch").every((t) => t.seeds.length === 4), "four seeds each");
await shot("page-cross");
const e3 = (await st()).e, s3 = (await st()).s;
await press("confirm", 1000); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.bud && s.bud.kind === "cross" && s.bud.parents.length === 2 && s.bud.parents[0].id === dot.id, "the child grows in the bud with its real parents");
expect(s.e === e3 - 2 && s.s === s3 - 4, "paid 2 ⚡ 4 ❀");
await page.evaluate(() => window.__st.skipBud("ready")); await press("confirm", 300); await page.waitForTimeout(2800); await page.evaluate(() => window.__st.unlock());
s = await st(); const child = s.mibis.at(-1);
expect(child.parents && child.parents.length === 2 && child.parents[1].genome, "the parents field: two snapshots with their genomes");
expect(child.read.length < 4, "the child is known only where the switch parents matched: " + child.read.join(","));
expect((await page.evaluate(([a, b]) => window.__st.kinshipOf(a, b), [child.id, dot.id])) === 0.25, "child and parent: kinship a quarter");
// reading the child on Habitat's card
await press("habitat", 300);
const chIndex = await page.evaluate((id) => { const m = window.__st.ST.mibis.find((x) => x.id === id), fr = window.__st.frameOf(m.species); return fr.chapters.findIndex((c) => !m.read.includes(c.id)); }, child.id);
await page.evaluate(([id, i]) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "ch" + i; }, [child.id, chIndex]);
l = await line(); expect(/Read /.test(l.ok) && /◆|free/.test(l.price), "a child's unread chapter is offered at a price: " + JSON.stringify(l));
await shot("page-child");
const d3 = (await st()).d; await press("confirm", 300);
s = await st(); expect(s.mibis.find((m) => m.id === child.id).read.length === child.read.length + 1 && s.d <= d3, "the child's chapter read");
// siblings: kinship a quarter, the forecast narrowed and more seeds showing the hidden look
await page.evaluate(() => { window.__st.settings.bays = 12; });   // room for the siblings and their parents, and a bay for their child
const sib = await page.evaluate(() => window.__st.seedSiblings("S01", 4242));
expect(sib.ok, "two siblings seeded: " + sib.msg);
expect((await page.evaluate(([a, b]) => window.__st.kinshipOf(a, b), [sib.mibis[0].id, sib.mibis[1].id])) === 0.25, "siblings: kinship a quarter");
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "cross"; }, sib.mibis[0].id);
await press("confirm", 300); await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, sib.mibis[1].id); await page.waitForTimeout(600);
l = await line(); expect(/close kin/.test(l.need), "the siblings' cross says close kin: " + JSON.stringify(l));
await shot("page-cross-siblings");
await press("back", 200); await press("home", 200);
// 7. the other screens draw without errors; the save round-trips
for (const k of ["library", "confirm", "back", "habitat", "home", "left", "confirm", "back"]) await press(k, 150);
await press("library", 200); await shot("page-library"); await press("habitat", 300); await shot("page-habitat"); await press("home", 200);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mb-save-v8")));
expect(stored.st.schema === 2 && stored.st.tray.length === 1 && stored.st.mibis.length === (await st()).mibis.length && JSON.stringify({ ...stored, st: undefined }) === companionBefore, "the save round-trips and the Companion's part is untouched");
// 8. the CI smoke's presses, from a fresh world with no save
await page.evaluate(() => { localStorage.removeItem("mb-save-v8"); });

await assertType("the journey");
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
expect((await st()).tray.length === 0 && !(await sv()).seed, "a fresh world: no save, no pods");
await page.keyboard.press("KeyD"); await page.waitForTimeout(150);
expect(/No Companion world yet/.test(await page.evaluate(() => window.__st.msg)), "docking without a world says so");
for (const k of ["KeyR", "ArrowRight", "Enter", "KeyL", "KeyB", "KeyD", "KeyH"]) { await page.keyboard.press(k); await page.waitForTimeout(150); }
await page.waitForTimeout(300); await shot("page-fresh");
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
if (checks.textApiCalls !== 0) { errors.push("the page called the canvas text API " + checks.textApiCalls + " times"); console.error("FAIL text API calls " + checks.textApiCalls); }
expect((await page.evaluate(() => window.__st.renderErrors)).length === 0, "no render threw: " + JSON.stringify(await page.evaluate(() => window.__st.renderErrors)));
const checksFile = process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
writeFileSync(checksFile, JSON.stringify(checks));
console.log("recorded " + checks.shots.length + " screenshot points for the layer checks in " + checksFile);
await assertType("the fresh world"); await browser.close(); server.close(); caddy.stop(); caddyServer.close();
if (errors.length) { console.error("journey failed:\n" + errors.join("\n")); process.exit(1); }
console.log("journey ok · screenshots in img/");
