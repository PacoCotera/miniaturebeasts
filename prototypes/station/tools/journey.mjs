#!/usr/bin/env node
// The Station's journey (station-build.md §5), headless: serves prototypes/ as the sandbox does, loads a
// v8 fixture save, seeds a Loika crate through the developer hooks, docks, opens the bay, identifies,
// reads Coat then Face at the decided prices, compares two pods, returns one, and checks the drawn stamp
// decodes to the pod's genome. Fails on any page error. Screenshots go to img/.
//   node tools/journey.mjs          (PW_DIR=/path/with/node_modules/playwright when playwright is not local)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { decode } from "../../genome-stamp/src/decode.mjs";
import { sameGenome } from "../../genome-stamp/src/codec.mjs";
import { frameFor } from "../../genome-stamp/src/frames.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown" };
const server = createServer((req, res) => {
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
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
mkdirSync(path.join(here, "../img"), { recursive: true });
const shot = (name) => page.screenshot({ path: path.join(here, `../img/${name}.png`), fullPage: false });
const fixture = readFileSync(path.join(here, "../tests/fixtures/save-v8-schema1.json"), "utf8");
const companionBefore = JSON.stringify({ ...JSON.parse(fixture), st: undefined });
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.removeItem("mb-station-dev"); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?dev`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.ST)));
const sv = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__st.SV)));
const press = async (k, ms = 120) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(ms); };
const line = () => page.evaluate(() => window.__st.lineFor());
const expect = (cond, what) => { if (!cond) fail(what); };

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
await page.evaluate((id) => { const u = window.__st.UI; u.pods.cur = id; u.pods.f = "pod"; }, loika.id);
const e0 = s.e;
let l = await line(); expect(/Identify/.test(l.ok) && l.price === "1 ⚡", "identify costs 1 Energy (the first was spent in the fixture): " + JSON.stringify(l));
await press("confirm", 2200);
s = await st(); const pl = s.tray.find((p) => p.id === loika.id);
expect(pl.idd === 1 && s.e === e0 - 1, "identified for 1 Energy");
await page.evaluate(() => window.__st.unlock());
await shot("page-identified");
// 4. read Coat (the fixture spent the free read): 1 Data; then Face: 2 Data; a second Loika's Face costs 1
await press("up", 150);
l = await line(); expect(/Read Coat/.test(l.ok) && l.price === "1 ◆", "Coat costs 1 Data: " + JSON.stringify(l));
const d0 = s.d;
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.tray.find((p) => p.id === loika.id).read.includes("coat") && s.d === d0 - 1, "Coat read for 1 Data");
await press("right", 150);
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "2 ◆", "Face costs 2 Data: " + JSON.stringify(l));
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
s = await st(); expect(s.d === d0 - 3, "Face read for 2 Data");
await shot("page-read");
// the type is Inter, anti-aliased (the style guide); art and chrome stay on the palette, so off-palette pixels are few
expect((await page.evaluate(() => window.__st.offPalette())) < 1024 * 600 * 0.08, "art and chrome on the palette; only the type is anti-aliased");
// the drawn stamp decodes to the pod's genome
const img = await page.evaluate((id) => { const r = window.__st.stampRGBA(id, 200); return { width: r.width, height: r.height, data: Array.from(r.data) }; }, loika.id);
const sg = await page.evaluate((id) => window.__st.stampGenome(id), loika.id);
const dec = decode({ width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) });
expect(dec.stamps.length === 1 && sameGenome(frameFor(sg.species, sg.version), sg, dec.stamps[0].genome), "the drawn stamp decodes to the genome");
expect(dec.stamps.length === 1 && dec.stamps[0].genome.read.join() === "Coat,Face", "the stamp's mask: Coat and Face read");
// the second Loika: identify (1 Energy), its Face costs 1 (half of two, rounded up)
await page.evaluate((id) => { const u = window.__st.UI; u.pods.cur = id; u.pods.f = "pod"; }, loika2.id);
await press("confirm", 1000); await page.evaluate(() => window.__st.unlock());
await press("up", 100); await press("left", 100); await press("left", 100); await press("right", 100);   // the rail remembers the last chapter: back to Coat, then Face
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "1 ◆", "a second Loika's Face costs 1: " + JSON.stringify(l));
await press("confirm", 2300); await page.evaluate(() => window.__st.unlock());
// a glint on the first Loika? (only when the second carried something new: not asserted); the need line never shows digits of progress
// 5. Compare: from the second Loika's pod, ← to its well, walk to the first Loika's well, ✓
s = await st();
const i1 = s.tray.findIndex((p) => p.id === loika.id), i2 = s.tray.findIndex((p) => p.id === loika2.id);
await press("down", 100); await press("left", 100);
for (let k = 0; k < Math.abs(i1 - i2); k++) await press(i1 > i2 ? "down" : "up", 100);
l = await line(); expect(l.ok === "Compare", "compare offered on another Loika pod: " + JSON.stringify(l));
await press("confirm", 300); await shot("page-compare");
l = await line(); expect(/two Loika pods/.test(l.subject), "compare open: " + JSON.stringify(l));
await press("back", 200);
// 6. return the Tuikis to the wild: +1 Essence, the Companion's record
const tuikis = s.tray.find((p) => p.species === "S03");
await page.evaluate((id) => { const u = window.__st.UI; u.pods.cur = id; u.pods.f = "gate"; }, tuikis.id);
const s0 = s.s;
await press("confirm", 150); await press("confirm", 300);
s = await st(); expect(s.s === s0 + 1 && !s.tray.some((p) => p.id === tuikis.id) && s.returned.at(-1).id === tuikis.id, "returned for +1 Essence");
// M2. Create: shape eye rings on the read Loika (+1 Data), Grow: a bud of twenty-one minutes (this world grew Dot already), the genome in the outbox
await press("research", 200);
await page.evaluate((id) => { const u = window.__st.UI; u.pods.cur = id; u.pods.f = "pod"; }, loika.id);
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
expect(s.outbox.length === 1 && s.outbox[0].sha === s.bud.sha, "the genome waits in the outbox for the Caddy service");
expect((await page.evaluate(() => window.__st.UI.screen)) === "incubator", "on the Incubator");
await page.waitForTimeout(1600); await shot("page-incubator");
l = await line(); expect(l.ok === "Grow now", "instant grow offered while growing: " + JSON.stringify(l));
// the developer's skip: ready to open; Open: the juvenile steps out fully read, into a bay, its stamp whole
await page.evaluate(() => window.__st.skipBud("ready"));
l = await line(); expect(l.ok === "Open", "ready: " + JSON.stringify(l));
await press("confirm", 300); await shot("page-hatch");
await page.waitForTimeout(2800); await page.evaluate(() => window.__st.unlock());
s = await st(); const fig = s.mibis.at(-1);
expect(!s.bud && s.mibis.length === 2 && fig.name === "Moss" && fig.bay === 1 && fig.read.length === 4 && fig.paint === null, "Moss opened into bay 2, fully read, waiting for its painting");
expect((await page.evaluate(() => window.__st.UI.screen)) === "habitat", "the meet view on Habitat");
await page.waitForTimeout(300); await shot("page-meet");
l = await line(); expect(/Take Moss with you/.test(l.ok), "the door is focused: " + JSON.stringify(l));
// fill the bays: Grow is refused before payment; return a mibi frees a bay for +2 Essence
await page.evaluate(() => window.__st.seedAdults("S01", 77, 4));
s = await st(); expect(s.mibis.filter((m) => !m.released).length === 6, "six bays taken");
await press("research", 200);
await page.evaluate((id) => { const u = window.__st.UI; u.pods.cur = id; u.pods.f = "pod"; }, loika2.id);
l = await line(); expect(/no bay free/.test(l.price), "a full vivarium refuses before payment: " + JSON.stringify(l));
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
// 7. the other screens draw without errors; the save round-trips
for (const k of ["library", "confirm", "back", "habitat", "home", "left", "confirm", "back"]) await press(k, 150);
await press("library", 200); await shot("page-library"); await press("habitat", 300); await shot("page-habitat"); await press("home", 200);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mb-save-v8")));
expect(stored.st.schema === 2 && stored.st.tray.length === 2 && stored.st.mibis.length === 6 && JSON.stringify({ ...stored, st: undefined }) === companionBefore, "the save round-trips and the Companion's part is untouched");
// 8. the CI smoke's presses, from a fresh world with no save
await page.evaluate(() => { localStorage.removeItem("mb-save-v8"); });

await page.goto(`http://127.0.0.1:${port}/sandbox/station/`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
expect((await st()).tray.length === 0 && !(await sv()).seed, "a fresh world: no save, no pods");
await page.keyboard.press("KeyD"); await page.waitForTimeout(150);
expect(/No Companion world yet/.test(await page.evaluate(() => window.__st.msg)), "docking without a world says so");
for (const k of ["KeyR", "ArrowRight", "Enter", "KeyL", "KeyB", "KeyD", "KeyH"]) { await page.keyboard.press(k); await page.waitForTimeout(150); }
await page.waitForTimeout(300); await shot("page-fresh");
await browser.close(); server.close();
if (errors.length) { console.error("journey failed:\n" + errors.join("\n")); process.exit(1); }
console.log("journey ok · screenshots in img/");
