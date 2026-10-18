#!/usr/bin/env node
// The Station's journey (station-build.md §5), headless: serves prototypes/ as the sandbox does, loads a v8 fixture save, and plays the Station on the LVGL face (the page in test mode, ?test):
// the fixture migrated, a Loika crate seeded, Dock, the crates opened through the developer hook, Pods by keys and intents (identify, read, compare, return), Create, Grow, the bud, the mibi and the
// Cross through the intents of the screens the face does not draw yet (M2 to M4: the rules, not the screens; Grow and Cross paint nothing, so no call reaches the Caddy service), every not-built screen's room keys and ←, Idle's wake, the save round trip.
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
let caddyPort = caddyServer.address().port, caddyUp = true, caddyGrowCalls = 0;   // the /grow calls the page made: none, since Grow and Cross paint nothing
const server = createServer((req, res) => {
  if (req.url.startsWith("/caddy-api/")) {
    if (req.url.includes("/grow")) caddyGrowCalls++;
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
await page.addInitScript((raw) => { if (!sessionStorage.getItem("fixture-done")) { localStorage.setItem("mb-save-v8", raw); localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00"}'); sessionStorage.setItem("fixture-done", "1"); } }, fixture);
// The page's clock, real until held: __hold() freezes performance.now() and queues requestAnimationFrame; __step(ms) runs the queued frames at 40 ms steps (as face/tools/station-page.mjs VIRTUAL_CLOCK); __release() resumes real time from where it stopped (no jump forward or back). The hold is at the last frame's own timestamp, so the face's first step is exactly 40 ms whatever the frame phase was
await page.addInitScript(() => {
  const realNow = performance.now.bind(performance), realRaf = window.requestAnimationFrame.bind(window); let held = false, t = 0, off = 0, q = [], last = null, pend = new Set();
  performance.now = () => (held ? t : realNow() + off);
  window.requestAnimationFrame = (cb) => {
    if (held) { q.push(cb); return 0; }
    const rec = { cb }; pend.add(rec);
    return (rec.id = realRaf((ts) => { if (!pend.delete(rec)) return; last = ts + off; cb(last); }));
  };
  const realCancel = window.cancelAnimationFrame.bind(window);
  window.cancelAnimationFrame = (id) => { for (const r of pend) if (r.id === id) pend.delete(r); realCancel(id); };   // a cancelled frame leaves the pending set too
  window.__hold = () => { if (!held) { t = last ?? realNow() + off; held = true; for (const r of pend) q.push(r.cb); pend.clear(); } return t; };   // a frame requested but not yet run is queued now: whenever the real frame would have come
  window.__step = (ms) => { const end = t + ms; while (t < end) { t = Math.min(end, t + 40); const run = q; q = []; for (const cb of run) cb(t); } return t; };
  window.__release = () => { if (!held) return; off = t - realNow(); held = false; const run = q; q = []; for (const cb of run) window.requestAnimationFrame(cb); };
});
const hold = () => page.evaluate(() => window.__hold()), stepClock = (ms) => page.evaluate((m) => window.__step(m), ms), release = () => page.evaluate(() => window.__release());
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
const adultIds = () => page.evaluate(() => window.__st.ST.mibis.filter((m) => window.__st.isAdult(m)).map((m) => m.id));   // the page's own rule (settings.adultTurns included)
const ui = () => page.evaluate(() => { const u = window.__st.UI; return { screen: u.screen, view: u.pods.view, cmp: !!u.pods.cmp, lib: u.lib.f, hab: u.hab.f, habId: u.hab.id, home: u.home.f, viv: u.viv.f, idle: u.idle, msg: window.__st.msg }; });
// The type through the face: every string it set is Inter at 16, 20 or 28 px, nothing refused, no error sent.
const assertFace = async (when) => {
  const c = await page.evaluate(() => window.__st.check()), bad = (c.log?.type ?? []).filter((r) => ![16, 20, 28].includes(r.px) || !r.text);
  for (const r of bad.slice(0, 3)) fail(`type (${when}): "${r.text}" at ${r.px} px, not Inter at 16, 20 or 28`);
  if (c.refused) fail(`face (${when}): ${c.refused} nodes refused`); if (c.errors.length) fail(`face (${when}): ${c.errors.slice(0, 3).join("; ")}`);
  const ov = await page.evaluate(() => window.__st.face.invOverflows()); if (ov) fail(`face (${when}): LVGL's invalid-area buffer overflowed ${ov} time${ov > 1 ? "s" : ""}: a frame redrew the whole screen`);
  console.log(`face (${when}): ${(c.log?.type ?? []).length} strings, ${bad.length} off-spec, ${c.refused} refused, ${c.errors.length} errors, ${ov} invalid-area overflows`);
};

// 1. the fixture migrated: pods carry genomes from their seeds, the mibi keeps its id and name, the Companion's part is byte-identical
let s = await st();
expect(s.schema === 3, "schema 3 after the migration");
expect(s.tray.length === 2 && s.tray[0].genome && s.tray[0].gs === 1111, "the pods keep their seeds and carry genomes");
expect(s.mibis.length === 1 && s.mibis[0].id === 1 && s.mibis[0].name === "Dot" && s.mibis[0].code, "Dot keeps id and name and has a code");
const svNow = await sv();
expect(JSON.stringify({ ...svNow, st: undefined }) === companionBefore, "the Companion's part is byte-identical after the migration");
await page.waitForTimeout(400);
{ const p = await props(), c = await page.evaluate(() => window.__st.check());   // the fixture opens on Home with the Companion lifted: Home draws, the bed shows the Companion mark, the bay is shut
  expect(p.screen === "home" && p.state === "home" && p.frame.top.title === "Home", "Home is built: " + JSON.stringify([p.screen, p.state, p.frame?.top?.title]));
  expect(p.regions.bed.state === "away" && p.regions.cargo.state === "away" && p.regions.probe.state === "away" && p.regions.cargo.lamp === "off", "away: the bed, the bay and the Probe say so: " + JSON.stringify([p.regions.bed.state, p.regions.cargo.state, p.regions.probe.state]));
  expect(!(c.log?.type ?? []).some((t) => /not built/.test(t.text)) && (c.log?.regions ?? []).some((r) => r.id === "glass" && (r.layer === "chrome" || r.layer === "painted")), "Home draws its living window and says nothing is not built: " + JSON.stringify((c.log?.type ?? []).map((t) => t.text))); }
await frameShot("page-home", true);
const trace = {}; let cur = null;
const stepOf = (id) => { cur = trace[id] = []; };
const said = () => page.evaluate(() => window.__st.said());
const hpress = async (k, ms = 200) => { await said(); await press(k, ms); const m = await said(), u = await ui(), l = await line(); cur.push({ key: k, said: m, screen: u.screen, focus: u.home, ok: l.ok ?? null, subject: l.subject ?? null, idle: u.idle }); return u; };
const hintent = async (m, ms = 200) => { await said(); await intent(m, ms); const got = await said(), u = await ui(); cur.push({ intent: m, said: got, screen: u.screen, focus: u.home }); return u; };
// 2. seed one Loika pod (fixed seed) beside the fixture's crate; dock while Home shows: the crates slide into the Cargo module (home-dock-arrival)
await page.evaluate(() => window.__st.seedCrate("S01", 1, 4242));
const events0 = await page.evaluate(() => window.__st.face.stats.events);
stepOf("home-dock-arrival"); await hpress("dock", 300);
s = await st(); expect(s.dock.docked, "docked");
{ const p = await props(), u = await ui(), holding = await page.evaluate(() => window.__st.holding()), events = (await page.evaluate(() => window.__st.face.stats.events)) - events0;
  expect(events >= 1 && holding && u.screen === "cargo" && p.state === "arrival" && p.regions.arrival.phase === "show" && p.frame.line.ok === "Skip", `home-dock-arrival: the dock plays the arrival over Home: Cargo's bay in its show (${events} events), input held, ✓ Skip: ` + JSON.stringify([u.screen, p.state, p.frame.line.ok, holding]));
  expect(p.regions.arrival.glints.length === 2 && p.regions.arrival.plates.max > 0 && p.regions.dockCrates.places.length === 2, "home-dock-arrival: two crates, the Probe's plates: " + JSON.stringify(p.regions.arrival)); }
await page.waitForTimeout(1800); await frameShot("cargo-arrival-show", true);
await hpress("confirm", 400);   // any key skips the show to its choice
{ const p = await props(), u = await ui();
  expect(u.screen === "cargo" && p.state === "arrival" && p.regions.arrival.phase === "choice" && p.overlay?.form === "strip" && p.overlay.focus.cur === "card.open" && p.frame.line.ok === "Open the bay" && p.frame.line.subject === "two crates to the rack" && !(await page.evaluate(() => window.__st.holding())), "home-dock-arrival: the show cuts to the choice: the strip, the ring on Open the bay: " + JSON.stringify([p.overlay?.focus, p.frame.line])); }
await frameShot("cargo-arrival-choice", true);
await hpress("right", 200); { const p = await props(); expect(p.overlay.focus.cur === "card.later" && p.frame.line.ok === "Later" && p.frame.line.subject === "they wait while docked", "home-dock-arrival: ▶ is Later: " + JSON.stringify(p.frame.line)); }
await hpress("back", 600);   // ← is Later: the dither back to Home, as it was
{ const p = await props(), l = p.frame.line, u = await ui();
  expect(u.screen === "home" && u.home === "room", "home-dock-arrival: Later is Home with the ring on the room: " + JSON.stringify(u));
  expect(p.regions.cargo.state === "crates" && p.regions.cargo.crates === 2 && p.regions.cargo.lamp === "needsYou" && p.regions.bed.state === "docked" && p.regions.bed.sleepers.length === 1 && p.regions.probe.state === "docked", "home-dock-arrival: docked, two crates in the Cargo module, the Companion's mibi asleep on the bed: " + JSON.stringify([p.regions.cargo, p.regions.bed.state, p.regions.probe.state]));
  expect(l.need === "two crates wait in the bay" && l.ok === "Open the bay" && !(await page.evaluate(() => window.__st.msg)), "home-dock-arrival: the notice names the crates, the room's ✓ opens the bay and no plate is shown: " + JSON.stringify(l)); }
{ const p = await props(); cur.push({ arrival: true, crates: p.regions.cargo.crates, cargoLamp: p.regions.cargo.lamp, bed: p.regions.bed.state, notice: p.frame.line.need, plate: await page.evaluate(() => window.__st.msg) }); }
await page.waitForTimeout(900); await frameShot("home-docked", true);
// Cargo (the Bay, T-20261016-216; home-bay): the room's ✓ opens Cargo with two sealed crates in two berths; ← is Home with the ring on the Bay module; ✓ Open them all opens both, one at a time, with input held until the last crate ends + 20 ms (the pad does nothing;
// ✓ is Skip, ← and a room key end the current crate as a cut), the end shows what arrived, and its ✓ lands on Pods' collection with the ring on the newest pod; ← there reads Home. The holds are on the host's clock: the step waits them out.
{ stepOf("home-bay");
  let u = await hpress("right", 200); expect(u.home === "cargo", "home-bay: ▶ from the room is the Cargo module (the room's own ✓ now opens the bay in one press, T-50 cut 1; tests/intents.test.mjs): " + JSON.stringify(u));
  u = await hpress("confirm", 500); expect(u.screen === "cargo", "home-bay: ✓ on the Cargo module (Go to Cargo) opens Cargo: " + JSON.stringify(u));
  let p = await props(), l = p.frame.line; expect(p.screen === "cargo" && p.state === "bay" && p.berths === 3 && p.regions.berths.list.filter((b) => b.crate).length === 2 && JSON.stringify(p.focus) === JSON.stringify({ cur: "room", targets: [] }), "home-bay: the bay, three berths, two sealed crates, the ring on nothing: " + JSON.stringify([p.state, p.berths, p.regions.berths.list.map((b) => !!b.crate), p.focus]));
  expect(l.ok === "Open them all" && l.subject === "" && l.back === "Home", "home-bay: ✓ Open them all, ← Home: " + JSON.stringify(l));
  u = await hpress("down", 200); expect(u.screen === "cargo", "home-bay: the pad does nothing in the bay: " + JSON.stringify(u));
  u = await hpress("back", 500); expect(u.screen === "home" && u.home === "cargo", "home-bay: ← is Home with the ring on the Cargo module: " + JSON.stringify(u));
  u = await hpress("confirm", 500); expect(u.screen === "cargo", "home-bay: ✓ on the Cargo module opens Cargo again: " + JSON.stringify(u));
  await hpress("confirm", 300);
  expect(await page.evaluate(() => window.__st.holding()), "home-bay: the opening holds input");
  p = await props(); expect(p.state === "opening" && p.frame.line.ok === "Skip" && p.frame.line.back === "Home", "home-bay: the line offers ✓ Skip and ← Home (a skippable hold, lvgl-switch.md §2.1): " + JSON.stringify([p.state, p.frame.line]));
  const total = p.regions.opening.starts.at(-1) + p.regions.opening.lens.at(-1);
  u = await hpress("down", 200); expect(u.screen === "cargo" && (await props()).state === "opening", "home-bay: the pad does nothing while the crates open: " + JSON.stringify(u));
  await page.waitForTimeout(total + 400);
  p = await props(); l = p.frame.line; s = await st();
  expect(p.state === "end" && p.regions.hatch.wells.filter((w) => w.from).length > 0 && !(await page.evaluate(() => window.__st.holding())), "home-bay: after both crates the end shows, input free: " + JSON.stringify([p.state, p.regions.hatch?.wells?.map((w) => w.from)]));
  expect(l.ok === "Look at the pods" && l.back === "Home", "home-bay: ✓ Look at the pods, ← Home: " + JSON.stringify(l));
  expect(s.accepted.includes("xw2n9c-5") && s.accepted.filter((id) => id.startsWith("dev-")).length === 1 && s.tray.length === 4, "home-bay: both crates accepted once, four pods in the wells: " + s.tray.length);
  { cur.push({ end: true, wells: p.regions.hatch.wells.map((w) => w.from), ok: l.ok }); }
  u = await hpress("confirm", 600); const newest = s.tray.at(-1);
  expect(u.screen === "pods" && u.view === "collection" && (await page.evaluate(() => window.__st.UI.pods.cur)) === newest.id, "home-bay: ✓ on the end lands on Pods' collection with the ring on the newest pod: " + JSON.stringify(u));
  u = await hpress("back", 500); expect(u.screen === "home", "home-bay: ← from the collection is Home: " + JSON.stringify(u));
  await page.evaluate(() => window.__st.openBay()); s = await st(); expect(s.tray.length === 4, "home-bay: an accepted crate never reopens");
  expect(!(await page.evaluate(() => window.__st.holding())), "home-bay: nothing is held after the end"); }
// Home's steps on the face (L2.2 H1: home-pad, home-rack, home-lamp; home-dock-arrival is above): the walks are deterministic (reduced motion: the residents stand at their start); the focus the face says and the intents are
// recorded per step and held to prototypes/face/golden/journey-home.json (lvgl-switch.md §4, gate check 5).
await page.emulateMedia({ reducedMotion: "reduce" }); await page.evaluate(() => { window.__st.goto("incubator"); }); await page.waitForTimeout(250); await page.evaluate(() => { window.__st.UI.home.f = "room"; window.__st.goto("home"); }); await page.waitForTimeout(500);
{ stepOf("home-pad"); let u = await ui(); expect(u.screen === "home" && u.home === "room", "home-pad: Home with the ring on the room: " + JSON.stringify(u));
  const first = (await line()); expect(first.ok === "Look at the pods" && !first.back, "home-pad: the room's ✓ is the notice's action and there is no ← cap on Home: " + JSON.stringify(first));
  u = await hpress("right"); expect(u.home === "cargo", "home-pad: ▶ from the room is Cargo: " + u.home);
  const col = []; for (let i = 0; i < 5; i++) col.push((await hpress("down")).home); expect(JSON.stringify(col) === JSON.stringify(["pods", "incubator", "probe", "library", "knob"]), "home-pad: ▼ walks the column Pods, Incubator, Probe, Library, the knob: " + col);
  u = await hpress("down"); expect(u.home === "knob", "home-pad: the end of the column stops: " + u.home);
  u = await hpress("left"); expect(u.home === "resident.1", "home-pad: ◀ from the column is the nearest resident (Dot, asleep on the bed): " + u.home);
  expect(/asleep$/.test((await line()).subject), "home-pad: the subject says it is asleep: " + JSON.stringify(await line()));
  u = await hpress("up"); expect(u.home === "vivarium", "home-pad: ▲ from the only resident is the Vivarium: " + u.home);
  u = await hpress("right"); expect(u.home === "cargo", "home-pad: ▶ from the Vivarium is Cargo: " + u.home);
  u = await hpress("home"); expect(u.home === "room" && u.screen === "home", "home-pad: the Home key on Home puts the ring back on the room: " + JSON.stringify(u));
  const e = (await st()).e; u = await hpress("back"); expect(u.screen === "home" && u.home === "room" && !(await page.evaluate(() => window.__st.msg)) && (await st()).e === e, "home-pad: ← on Home does nothing: no plate, no cap: " + JSON.stringify(u)); }
{ stepOf("home-rack");
  for (const [m, id, to] of [["cargo", "cargo", "cargo"], ["incubator", "incubator", "incubator"], ["probe", "probe", "bench"], ["library", "library", "library"]]) {
    await page.evaluate((f) => { window.__st.UI.home.f = f; window.__st.goto("home"); }, m); await page.waitForTimeout(300);
    let u = await hpress("confirm", 400); expect(u.screen === to, `home-rack: ✓ on the ${m} module opens ${to}: ` + u.screen);
    u = await hpress("back", 400); expect(u.screen === "home" && u.home === m, `home-rack: ← from ${to} is Home with the ring on ${m}: ` + JSON.stringify(u)); }
  await page.evaluate(() => { window.__st.UI.home.f = "resident.1"; window.__st.goto("home"); }); await page.waitForTimeout(300);
  let u = await hpress("confirm", 400); expect(u.screen === "habitat" && u.habId === 1, "home-rack: ✓ on a resident opens the Vivarium on that mibi: " + JSON.stringify(u));
  await hpress("back", 400);
  await page.evaluate(() => { window.__st.UI.home.f = "pods"; window.__st.goto("home"); }); await page.waitForTimeout(300);
  u = await hpress("confirm", 400); expect(u.screen === "pods" && u.view === "collection", "home-rack: ✓ on the Pods module opens the collection: " + JSON.stringify(u));
  const need = (await st()).tray.find((p) => !p.idd) ?? (await st()).tray[0]; expect((await page.evaluate(() => window.__st.UI.pods.cur)) === need.id, "home-rack: the ring is on the pod that most needs the player");
  u = await hpress("back", 400); expect(u.screen === "home" && u.home === "pods", "home-rack: ← from the collection is Home: " + JSON.stringify(u)); }
{ stepOf("home-lamp");
  await page.evaluate(() => { window.__st.UI.home.f = "knob"; window.__st.goto("home"); }); await page.waitForTimeout(300);
  expect((await line()).ok === "Rest", "home-lamp: the knob's ✓ is Rest: " + JSON.stringify(await line()));
  const e = (await st()).e; let u = await hpress("confirm", 700); expect(u.idle === true && u.screen === "home", "home-lamp: ✓ on the knob rests the screen: Idle plays: " + JSON.stringify(u));
  u = await hpress("confirm", 400); expect(!u.idle && u.screen === "home" && u.home === "knob" && (await st()).e === e, "home-lamp: the first press on Idle only wakes: Home, the ring where it was, nothing spent: " + JSON.stringify(u)); }
{ stepOf("home-rest-hold");   // with motion: ✓ on the knob, a room key at +100 ms is dropped, the rest ends on Idle, the next press only wakes, the one after opens the section
  await page.emulateMedia({ reducedMotion: "no-preference" }); await page.evaluate(() => { window.__st.goto("incubator"); }); await page.waitForTimeout(250);
  await page.evaluate(() => { window.__st.UI.home.f = "knob"; window.__st.goto("home"); }); await page.waitForTimeout(600);
  await hpress("confirm", 100); expect(await page.evaluate(() => window.__st.holding()), "home-rest-hold: the rest holds input");
  let u = await hpress("research", 50); expect(u.screen === "home", "home-rest-hold: a room key during the hold opens nothing: " + JSON.stringify(u));
  await page.waitForTimeout(800); u = await ui(); expect(u.idle && u.screen === "home" && u.home === "knob" && !(await page.evaluate(() => window.__st.pendingRoom())) && !(await page.evaluate(() => window.__st.holding())), "home-rest-hold: the rest ends on Idle with Home's focus unchanged and no key kept: " + JSON.stringify(u));
  u = await hpress("research", 450); expect(!u.idle && u.screen === "home" && u.home === "knob", "home-rest-hold: the next key only wakes: " + JSON.stringify(u));
  u = await hpress("research", 400); expect(u.screen === "pods", "home-rest-hold: the key after it opens Pods: " + JSON.stringify(u)); }
{ stepOf("idle-vivarium");   // Idle is the whole screen with its living window and one line; the first press only wakes; the Dock key wakes and docks (or lifts)
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => { window.__st.UI.idle = false; window.__st.UI.home.f = "room"; window.__st.goto("pods"); window.__st.goto("home"); }); await page.waitForTimeout(500);
  await page.evaluate(() => { window.__st.UI.lastInput = performance.now() - 61000; }); await page.waitForTimeout(700);   // the idle timer (60 s without a press), not a flag
  { const p = await props(), st0 = await st(); expect(p.idle === true && p.regions.bed.state === "docked" && p.regions.bed.sleepers.length === 1 && p.regions.residents.length === st0.mibis.filter((m) => !m.released).length - 1 && !p.frame.top, "idle-vivarium: Idle shows the residents and the carried mibi asleep on the bed, no frame: " + JSON.stringify([p.regions.bed.state, p.regions.residents.length, Object.keys(p.frame)])); }
  const e = (await st()).e; let u = await hpress("confirm", 400); expect(!u.idle && u.screen === "home" && (await st()).e === e, "idle-vivarium: the first press wakes and nothing else: " + JSON.stringify(u));
  await page.evaluate(() => { window.__st.UI.home.f = "pods"; window.__st.goto("pods"); window.__st.UI.lastInput = performance.now() - 61000; }); await page.waitForTimeout(700);
  u = await hpress("dock", 500); expect(!u.idle && u.screen === "pods" && !(await st()).dock.docked, "idle-vivarium: the Dock key on Idle (docked) wakes and lifts, the screen under Idle shows: " + JSON.stringify([u, (await st()).dock]));
  await page.evaluate(() => { window.__st.UI.lastInput = performance.now() - 61000; }); await page.waitForTimeout(700);
  { const u0 = await ui(); expect(u0.idle === true, "idle-vivarium: the timer brings Idle again: " + JSON.stringify(u0)); }
  u = await hpress("dock", 500); expect(!u.idle && u.screen === "cargo" && (await props()).state === "arrival" && (await st()).dock.docked, "idle-vivarium: the Dock key on Idle (lifted) wakes, docks and the arrival plays over Home: " + JSON.stringify([u, (await st()).dock]));
  u = await hpress("confirm", 400); u = await hpress("back", 600); expect(u.screen === "home" && u.home === "room", "idle-vivarium: ✓ skips the show, ← is Later: Home with the ring on the room: " + JSON.stringify(u)); }
{ const file = path.resolve(here, "../../face/golden/journey-home.json"), json = JSON.stringify({ _note: "Home's journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key (or intent) and the focus and intents the face said, the screen and the ring after it. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps: trace }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(trace)])) if (JSON.stringify(want[id]) !== JSON.stringify(trace[id])) fail(`journey-home.json: step ${id} differs from the golden: ${JSON.stringify(trace[id]).slice(0, 300)}`); }
  console.log(`home steps: ${Object.entries(trace).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
await page.emulateMedia({ reducedMotion: "no-preference" }); await page.evaluate(() => { window.__st.goto("pods"); window.__st.goto("home"); }); await page.waitForTimeout(300);
// 3. Pods: identify the new Loika pod
await press("research", 200);
{ const u = await ui(); expect(u.screen === "pods" && u.view === "collection", "Research opens the collection: " + JSON.stringify(u)); }
const loika = s.tray.find((p) => p.id.startsWith("xw2n9c-5")), loika2 = s.tray.find((p) => p.id.startsWith("dev-"));
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id); await page.waitForTimeout(250);
const e0 = s.e, dId0 = s.d;
let l = await line(); expect(/Identify/.test(l.ok) && l.price === "◆ 1", "identify costs ◆ 1: " + JSON.stringify(l));
await press("confirm", 2200);
s = await st(); const pl = s.tray.find((p) => p.id === loika.id);
expect(pl.idd === 1 && s.d === dId0 - 1 && s.e === e0, "identified for ◆ 1, no Energy");
await frameShot("page-identified");
// Identify leaves the Library where it was; ✓ on an identified pod opens Create, whatever has been read: the line reads "Create from this pod", dimmed by what stops it; Create is built (nothing read: the founder frosted), and ← names the pod
{ l = await line(); expect(l.ok === "Create from this pod", "✓ on an identified pod names Create: " + JSON.stringify(l)); await press("confirm", 400);
  const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, create: window.__st.UI.create?.podId }));
  expect(at.screen === "create" && at.create === loika.id, "✓ on an identified pod opens Create on it: " + JSON.stringify(at));
  { const p = await props(); expect(p.state === "nothingRead" && p.frame.line.back === "Loika" && p.frame.line.ok === "Incubate", "Create opens on nothing read and its way back names the pod: " + JSON.stringify([p.state, p.frame.line])); }
  await press("back", 400); const to = await page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, create: window.__st.UI.create }));
  expect(to.screen === "pods" && to.view === "overview", "← from Create is the pod's overview: " + JSON.stringify(to));
  await page.evaluate((id) => window.__st.podsGo(id, "pod"), loika.id); await page.waitForTimeout(300); }
// 4. read Coat (the fixture spent the free read): 1 Data; then Face: 2 Data; a second Loika's Face costs 1
await press("up", 300);
l = await line(); expect(/Turn to Coat/.test(l.ok) && !l.price, "on the overview a tab opens its page, free: " + JSON.stringify(l));
await press("confirm", 300); expect((await page.evaluate(() => window.__st.UI.pods.view)) === "chapter", "✓ on a tab opens the chapter page");
l = await line(); expect(/Read Coat/.test(l.ok) && l.price === "◆ 2", "Coat costs 2 Data (its two traits, Colour and Markings): " + JSON.stringify(l));
const d0 = s.d;
await press("confirm", 2400);
s = await st(); expect(s.tray.find((p) => p.id === loika.id).read.includes("coat") && s.d === d0 - 2, "Coat read for 2 Data");
expect(s.tray.find((p) => p.id === loika.id).first !== undefined, "the first-shown looks are saved on the pod at read time");
await press("right", 300);
l = await line(); expect(/Read Face/.test(l.ok) && l.price === "◆ 2", "Face costs 2 Data: " + JSON.stringify(l));
await press("confirm", 2400);
s = await st(); expect(s.d === d0 - 4, "Face read for 2 Data");
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
// the second Loika: identify (◆ 1), its Face costs 1 (half of two, rounded up)
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
l = await line(); expect(l.ok === "Identify" && l.price === "◆ 1", "an unidentified pod offers Identify: " + JSON.stringify(l));
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
// the hatch: ✓ opens the Release panel (the ring on Release), ← and Keep spend nothing, ✓ on Release returns
l = await line(); expect(l.ok === "Return to the wild" && l.price === "❀ +1", "the hatch offers the return: " + JSON.stringify(l));
await press("confirm", 300); l = await line(); expect(l.ok === "Release it" && !!(await props()).overlay, "the Release panel opens with the ring on Release: " + JSON.stringify(l)); await frameShot("pods-panel-release");
await press("back", 300); l = await line(); expect(l.ok === "Return to the wild" && !(await props()).overlay, "← closes the panel, nothing spent: " + JSON.stringify(l)); await page.evaluate((id) => window.__st.podsGo(id, "hatch"), coatSix.id); await page.waitForTimeout(300);
const sBefore = (await st()).s; await press("confirm", 200); await press("right", 200); await press("confirm", 300); expect((await st()).s === sBefore && (await st()).tray.some((p) => p.id === coatSix.id), "Keep spends nothing"); await page.evaluate((id) => window.__st.podsGo(id, "hatch"), coatSix.id); await page.waitForTimeout(300); await press("confirm", 200); await press("left", 200); await press("confirm", 400); s = await st();
expect(s.s === sBefore + 1 && !s.tray.some((p) => p.id === coatSix.id), "the second ✓ returned the pod for +1 Essence: " + JSON.stringify({ s: s.s, sBefore, still: s.tray.some((p) => p.id === coatSix.id), line: await line(), view: await viewNow(), f: await focusNow() }));
// the same for the Untuva, which leaves the rack as it was; the waiting pod takes the well
await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, untuva.id); await page.waitForTimeout(400); await press("confirm", 200); await press("left", 200); await press("confirm", 400);
s = await st(); expect(!s.tray.some((p) => p.id === untuva.id), "the Untuva returned");
const extra = s.tray.find((p) => p.species === "S01" && !p.idd && p.id !== loika.id && p.id !== loika2.id);
expect(!!extra, "the pod that waited for a well entered the rack when one freed"); {   // not skipped when absent: the read-holds-input assertion must run
  await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, extra.id); await page.waitForTimeout(300); await press("confirm", 2200); await page.evaluate((id) => { window.__st.podsGo(id, "rail.0"); }, extra.id); await page.waitForTimeout(400); await press("confirm", 300);
  expect(await page.evaluate(() => window.__st.holding()), "a read holds input"); await page.waitForTimeout(2200);
  await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, extra.id); await page.waitForTimeout(400); await press("confirm", 200); await press("left", 200); await press("confirm", 400); }
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
  for (const p of pair) { await page.evaluate((id) => { window.__st.podsGo(id, "hatch"); }, p.id); await page.waitForTimeout(400); await press("confirm", 200); await press("left", 200); await press("confirm", 400); }
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
await press("confirm", 200); await press("left", 200); await press("confirm", 400);
s = await st(); expect(s.s === s0 + 1 && !s.tray.some((p) => p.id === tuikis.id) && s.returned.at(-1).id === tuikis.id, "returned for +1 Essence");
// R1. Create (slot R, journey-create.json): ✓ on the read Loika opens Create on the face; ◀ ▶ walk the read traits, ▲ ▼ roll a look (+1 Data), the line reads the price and the leaves; a room key drops the unpaid choices; ✓ Grows: the stamp prints, the
// code appears, the pod travels, input held 1080 ms, then the Incubator (a jump: ← there reads Home)
await press("research", 300);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika.id); await page.waitForTimeout(400);
l = await line(); expect(l.ok === "Create from this pod", "a read pod offers Create: " + JSON.stringify(l));
const cui = () => page.evaluate(() => { const c = window.__st.UI.create; return c ? { f: c.f, choices: Object.keys(c.choices), grown: !!c.grown } : null; });
const hpressC = async (k, ms = 200) => { await said(); await press(k, ms); const m = await said(), u = await ui(), l = await line(); cur.push({ key: k, said: m, screen: u.screen, create: await cui(), ok: l.ok ?? null, price: l.price ?? null, subject: l.subject ?? null }); return u; };
stepOf("create-walk");
await hpressC("confirm", 500);
expect((await page.evaluate(() => window.__st.UI.screen)) === "create", "on Create");
{ const p = await props(), c = await page.evaluate(() => window.__st.check()); expect(p.state === "shape" && p.frame.line.back === "Loika" && p.focus.cur === "roll" && JSON.stringify(p.focus.targets) === JSON.stringify([{ id: "roll", group: "roll" }]), "Create is built: the ring on the roll, its way back names the pod: " + JSON.stringify([p.state, p.focus, p.frame.line]));
  expect(!c.log.type.some((t) => /not built/.test(t.text)) && c.log.regions.some((r) => r.id === "roll") && c.log.regions.some((r) => r.id === "founder"), "Create draws its roll and its founder"); await frameShot("page-create", true); }
// the one trait that rolls in this pod: the Loika v4 has Colour in three pigments, and this pod is mixed there only
const rollIndex = await page.evaluate((id) => { const p = window.__st.podById(id), fr = window.__st.frameOf(p.species); return fr.chapters.filter((c) => p.read.includes(c.id)).flatMap((c) => c.traits).findIndex((t) => t.id === "colour"); }, loika.id);
for (let i = 0; i < rollIndex; i++) await hpressC("right", 60);
expect((await cui()).f === rollIndex, "◀ ▶ walk the read traits: the ring is on Colour");
{ const p = await props(), L = p.frame.line; expect(L.ok === "Incubate" && L.price === "⚡ 2 ❀ 4 ⧗ 20" && !("leaves" in p.regions) && p.regions.roll.chosen === 0, "as the pod is: Grow it at ⚡ 2 ❀ 4 ⧗ 20, no leaf grid: " + JSON.stringify(L)); }
await hpressC("down", 300);
{ const p = await props(), cost = await page.evaluate(() => window.__st.growCost(window.__st.UI.create.choices)); expect(cost.e === 2 && cost.s === 4 && cost.d === 1, "Grow costs 2 Energy 4 Essence and 1 Data for the change: " + JSON.stringify(cost));
  expect(p.regions.roll.chosen === 1 && p.regions.traitLine.changed && p.frame.line.price === "⚡ 2 ❀ 4 ◆ 1 ⧗ 21", "▼ rolls the look: the tag, the price with ◆ 1 and the wait ⧗ 21: " + JSON.stringify([p.regions.roll.chosen, p.regions.traitLine, p.frame.line.price])); }
{ const crPod = await page.evaluate(() => window.__st.UI.create.podId);   // a room key on Create forgets the unpaid choices; coming back starts fresh
  expect((await page.evaluate(() => Object.keys(window.__st.UI.create.choices).length)) === 1, "a choice is made and unpaid");
  await hpressC("research", 400); const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, view: window.__st.UI.pods.view, create: window.__st.UI.create }));
  expect(at.screen === "pods" && at.view === "collection" && at.create === null, "a room key on Create drops the unpaid choices and opens the room's top: " + JSON.stringify(at));
  await page.evaluate((id) => window.__st.podsGo(id, "pod"), crPod); await page.waitForTimeout(400); await hpressC("confirm", 500);
  expect((await page.evaluate(() => window.__st.UI.screen === "create" && Object.keys(window.__st.UI.create.choices).length === 0)), "back on Create it starts fresh");
  for (let i = 0; i < rollIndex; i++) await hpressC("right", 60);
  await hpressC("down", 300); }
s = await st(); const e1 = s.e, d1 = s.d, s1 = s.s;
stepOf("create-grow");
await said(); await hold(); await page.evaluate(() => window.__st.press("confirm")); await stepClock(300);   // ✓ Incubate on Create opens the Incubate | Keep shaping panel by the 180 ms dither (nothing is spent until its ✓ Incubate)
{ const p = await props(), m = await said(), u = await ui(), l = await line(), s2 = await st(); cur.push({ key: "confirm", said: m, screen: u.screen, panel: p.overlay?.form ?? null, ring: p.overlay?.focus?.cur ?? null, ok: l.ok ?? null, e: s2.e, d: s2.d, s: s2.s });
  expect(p.overlay?.id === "panel" && p.overlay.form === "incubate" && p.overlay.focus.cur === "card.incubate" && l.ok === "Incubate" && s2.e === e1 && s2.s === s1 && s2.d === d1 && !s2.bud, "✓ opens the Incubate | Keep shaping panel, the ring on Incubate, nothing spent: " + JSON.stringify([p.overlay?.form, p.overlay?.focus, l.ok])); await frameShot("page-create-panel", true); }
await page.evaluate(() => window.__st.press("confirm")); await stepClock(450);   // ✓ Incubate in the panel, then exactly 450 ms of frames: the stamp printed, the code shown at 300, the pod passing behind the tray (fix 5 Create)
{ const m = await said(), u = await ui(), l = await line(); cur.push({ key: "confirm", said: m, screen: u.screen, create: await cui(), ok: l.ok ?? null, price: l.price ?? null, subject: l.subject ?? null }); }
{ const p = await props(); expect(p.state === "grow" && (await page.evaluate(() => window.__st.holding())) && /^[A-Z0-9]{3} [A-Z0-9]{3} [A-Z0-9]{3}$/.test(p.regions.code) && p.frame.line.ok == null && p.frame.line.price == null && p.frame.line.back == null && p.frame.line.subject === "it goes to the Incubator", "✓ Grow it: the screen grows and holds input, the code is the screen's, the line is Growing (no ✓, price or way back): " + JSON.stringify([p.state, p.regions.code, p.frame.line])); }
await frameShot("page-create-grow", true);
await said(); for (const k of ["up", "left", "confirm", "back"]) await press(k, 0);   // the held keys, one after the other without waiting: the hold is real time (1080 ms) and the jump is at 900
{ const u = await ui(), m = await said(); cur.push({ held: ["up", "left", "confirm", "back"], said: m, screen: u.screen }); expect(u.screen === "create" && m.length === 0, "the pad, ✓ and ← do nothing while it grows, and the face says nothing: " + JSON.stringify([u.screen, m])); }
await stepClock(750); await release();   // 450 + 750 = 1200 ms in: past the hold and past the jump at 900
s = await st();
expect(s.bud && s.bud.minutes === 21 && s.bud.shaped.join() === "colour", "the bud: 21 minutes, colour shaped");
expect(s.e === e1 - 2 && s.s === s1 - 4 && s.d === d1 - 1, "paid 2 ⚡ 4 ❀ 1 ◆");
await page.waitForTimeout(900);
expect((await page.evaluate(() => window.__st.UI.screen)) === "incubator", "on the Incubator");
{ const p = await props(); expect(p.state === "growing" && p.frame.line.back === "Home" && p.frame.line.ok === "Hatch now" && p.regions.capsule.barPx >= 1 && /^ready in about \d+ min$/.test(p.regions.readyIn), "after Incubate (a jump) the Incubator is built, growing, the bar lit from its first pixel, ← reads Home: " + JSON.stringify([p.state, p.frame.line, p.regions.capsule.barPx, p.regions.readyIn])); await frameShot("page-incubator", true); }
// Create's journey on the face, held to prototypes/face/golden/journey-create.json (gate check 5): the keys and what the face said, the screen and the choices after each
{ const file = path.resolve(here, "../../face/golden/journey-create.json"), steps = Object.fromEntries(Object.entries(trace).filter(([id]) => id.startsWith("create-"))), json = JSON.stringify({ _note: "Create's journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key and what the face said (the focus and the intents), the screen, the ring and the choices after it, the line's ✓ and price. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(steps)])) if (JSON.stringify(want[id]) !== JSON.stringify(steps[id])) fail(`journey-create.json: step ${id} differs from the golden: ${JSON.stringify(steps[id]).slice(0, 300)}`); }
  console.log(`create steps: ${Object.entries(steps).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
// Grow paints nothing (decisions 10-11 14:17): the mibi is drawn from its layers, nothing joins the outbox and no job reaches the Caddy service
s = await st(); expect(s.outbox.length === 0, "Grow leaves the outbox empty: " + JSON.stringify(s.outbox));
expect(caddy.state.jobs.length === 0 && caddyGrowCalls === 0, "no job and no /grow call reached the Caddy service");
await page.waitForTimeout(1600);
// R2. The Incubator (slot R, journey-incubator.json): the bud grows (21 leaves, ✓ Hatch now); Hatch now pays, plays growNow (input held 400 ms) and then hatches the bud in the same press (input held 2780 ms: the pad, ✓ and ← do nothing)
// and hands off to the new mibi up close, in the meet, the ring on the resident (← there reads Vivarium)
const hpressI = async (k, ms = 200) => { await said(); await press(k, ms); const m = await said(), u = await ui(), l = await line(), p = await props(); cur.push({ key: k, said: m, screen: u.screen, state: p.state ?? null, ok: l.ok ?? null, price: l.price ?? null, subject: l.subject ?? null }); return u; };
stepOf("incubator-states");
await page.evaluate(() => window.__st.addMaterials(0, 0, 40));
{ const s0 = await st(); await hpressI("confirm", 300); expect((await props()).overlay?.id === "panel" && (await props()).overlay.form === "hatchnow" && (await props()).frame.line.ok === "Hatch now", "✓ Hatch now above ❀ 4 opens the Hatch now | Wait panel (the 180 ms dither): " + JSON.stringify((await props()).frame.line)); await hpressI("back", 300); expect(!(await props()).overlay, "← dithers back, nothing spent"); await hpressI("confirm", 300); await hpressI("confirm", 120);   // ✓ Hatch now (the panel, then its Hatch now card): the leaves still to fill turn whole over 400 ms, input held 400 ms, then the hatch
  expect((await props()).state === "growing" && (await page.evaluate(() => window.__st.holding())), "✓ Hatch now holds input while the bar fills");
  await said(); for (const k of ["up", "left", "confirm", "back"]) await press(k, 0);
  { const u = await ui(), m = await said(); cur.push({ held: ["up", "left", "confirm", "back"], said: m, screen: u.screen }); expect(u.screen === "incubator" && m.length === 0, "the pad, ✓ and ← do nothing while it grows, and the face says nothing: " + JSON.stringify([u.screen, m])); }
  await page.waitForTimeout(600); const p = await props(), s1 = await st(); cur.push({ hatch: p.state, ok: p.frame.line.ok });
  expect(p.state === "hatch" && s1.s < s0.s && !s1.bud, "Hatch now paid Essence and the bud is hatching in the same press: " + JSON.stringify([p.state, s1.bud])); }
{ const p = await props(); expect(p.state === "hatch" && (await page.evaluate(() => window.__st.holding())), "✓ Hatch now: the hatch holds input: " + p.state); await frameShot("page-hatch", true); }
await said(); for (const k of ["up", "left", "back"]) await press(k, 0);   // ✓ is left out: in the hatch's hold it skips (a skippable hold, lvgl-switch.md §2.1; tests/host-hold.test.mjs)
{ const u = await ui(), m = await said(); cur.push({ held: ["up", "left", "back"], said: m, screen: u.screen }); expect(u.screen === "incubator" && m.length === 0, "the pad and ← do nothing during the hatch: " + JSON.stringify([u.screen, m])); }
await page.waitForTimeout(2600);
s = await st(); const fig = s.mibis.at(-1);
expect(!s.bud && s.mibis.length === 2 && fig.name === "Moss" && fig.bay === 1 && fig.read.length === 4, "Moss opened into bay 2, fully read");
{ const u = await ui(), p = await props(); cur.push({ screen: u.screen, hab: u.hab, habId: u.habId }); expect(u.screen === "habitat" && u.habId === fig.id && u.hab === "resident", "after the hatch the mibi is met up close, the ring on the resident: " + JSON.stringify([u.screen, u.habId, u.hab, p.state])); }
{ stepOf("vivarium-meet");
  const u = await ui(), p = await props(), l = p.frame.line;
  cur.push({ screen: u.screen, state: p.state, ring: p.focus.cur, ribbon: p.regions.meetRibbon.text, tag: p.focus.targets.some((t) => t.id === "name"), ok: l.ok, subject: l.subject, back: l.back, waiting: p.regions.resident.waiting });
  expect(p.screen === "habitat" && p.state === "meet" && p.focus.cur === "resident" && p.regions.meetRibbon.text === "Meet Moss" && !p.focus.targets.some((t) => t.id === "name"), "vivarium-meet: the hatch lands in the meet up close: the ribbon in the tag's place (not a target), the ring on the resident: " + JSON.stringify([p.state, p.focus.cur, p.regions.meetRibbon.text]));
  expect(l.ok === "Name Moss" && l.back === "Vivarium", "vivarium-meet: ✓ Name Moss, ← Vivarium: " + JSON.stringify(l)); }
// the meet again (a fresh draw), then the namer over it
{ await page.evaluate((id) => { const U = window.__st.UI; U.meet = id; U.hab.id = id; U.hab.f = "resident"; window.__st.goto("vivarium"); window.__st.goto("habitat"); }, fig.id); await page.waitForTimeout(600);
  const p = await props(); expect(p.state === "meet" && p.regions.resident.waiting === false, "page-meet: the meet, no waiting lamp: " + JSON.stringify([p.state, p.regions.resident.waiting])); await frameShot("page-meet", true); }
const npress = async (k, ms = 250) => { await said(); await press(k, ms); const m = await said(), u = await ui(), p = await props(), o = p.overlay, l = p.frame?.line ?? {}; cur.push({ key: k, said: m, screen: u.screen, state: p.state, ring: o ? o.focus.cur : p.focus.cur, field: o ? o.regions.field.name + "|" + o.regions.field.state : null, page: o ? o.regions.keys.page : null, ok: l.ok ?? null, back: l.back ?? null }); return { u, p, o }; };
const nint = async (target, verb = "confirm", ms = 150) => { await said(); await intent({ screen: "namer", target, verb }, ms); const m = await said(), p = await props(), o = p.overlay; cur.push({ intent: target + ":" + verb, said: m, state: p.state, field: o ? o.regions.field.name + "|" + o.regions.field.state : null, say: o ? o.regions.say.text + "|" + o.regions.say.tone : null }); return { p, o }; };
{ stepOf("vivarium-namer");
  let r = await npress("confirm", 400);   // the meet's first ✓: the namer opens over the right column, the ribbon goes and the tag shows, the ring on Done
  expect(r.o?.id === "namer" && r.o.focus.cur === "act.done" && r.o.regions.field.name === "Moss" && r.o.regions.field.state === "selected" && r.p.state === "rest" && r.p.regions.meetRibbon.text === "" && r.p.frame.line.ok === "Keep Moss" && r.p.frame.line.back === "Clear", "vivarium-namer: the meet's first ✓ opens the namer: Moss selected, the ring on Done, ✓ Keep Moss: " + JSON.stringify([r.o?.focus?.cur, r.o?.regions?.field, r.p.state, r.p.frame.line]));
  await frameShot("page-namer", true);
  r = await npress("up", 200); expect(r.o.focus.cur === "mod.page", "vivarium-namer: ▲ from Done is the page key: " + r.o.focus.cur);
  r = await npress("confirm", 200); expect(r.o.regions.keys.page === "accents" && r.o.regions.keys.labels[0] === "Á" && r.o.regions.keys.labels[6] === null && r.o.focus.cur === "mod.page", "vivarium-namer: ✓ on the page key turns to the accents, the ring stays: " + JSON.stringify([r.o.regions.keys.page, r.o.regions.keys.labels.slice(0, 7)]));
  r = await npress("confirm", 200); expect(r.o.regions.keys.page === "letters", "vivarium-namer: and back to the letters");
  r = await npress("down", 200); r = await npress("left", 200); expect(r.o.focus.cur === "act.suggest", "vivarium-namer: ▼ then ◀ from the page key is Suggest: " + r.o.focus.cur);
  r = await npress("confirm", 200); const sug = r.o.regions.field.name; expect(r.o.regions.field.state === "selected" && sug && sug !== "Moss" && r.p.frame.line.ok === "Another name", "vivarium-namer: ✓ Suggest puts the pool's next name in the field, selected: " + sug);
  r = await npress("right", 200); expect(r.o.focus.cur === "act.done", "vivarium-namer: ▶ is Done");
  r = await npress("confirm", 700); r = { p: await props(), o: (await props()).overlay };
  expect(!r.o && r.p.state === "rest" && r.p.focus.cur === "resident" && r.p.regions.nameTag.text === sug && (await st()).mibis.find((m) => m.id === fig.id).name === sug && (await ui()).screen === "habitat", "vivarium-namer: Done names the mibi, the namer closes and the ring is back on the resident: " + JSON.stringify([!!r.o, r.p.focus.cur, r.p.regions.nameTag.text]));
  // the name tag is a target: ✓ Rename; the name is typed back (a name nobody holds), and ← on an empty field closes the namer writing nothing
  r = await npress("right", 200); expect(r.p.focus.cur === "name" && r.p.frame.line.ok === "Rename " + sug, "vivarium-namer: ▶ from the resident is its name, ✓ Rename: " + JSON.stringify([r.p.focus.cur, r.p.frame.line.ok]));
  r = await npress("confirm", 400); expect(r.o?.focus.cur === "act.done", "vivarium-namer: ✓ Rename opens the namer on the name");
  r = await npress("back", 200); expect(r.o.regions.field.state === "empty", "vivarium-namer: ← clears a selection"); r = await npress("back", 300); { const p = await props(); expect(!p.overlay && p.focus.cur === "name" && (await st()).mibis.find((m) => m.id === fig.id).name === sug, "vivarium-namer: ← on an empty field closes it writing nothing, the ring on the name: " + JSON.stringify([!!p.overlay, p.focus.cur])); }
  r = await npress("confirm", 400); r = await npress("back", 200);
  for (const t of ["key.12", "key.14", "key.18", "key.18"]) await nint(t);   // M o s s: a capital first, then small letters
  { const p = await props(); expect(p.overlay.regions.field.name === "Moss" && p.overlay.regions.field.state === "typed" && p.overlay.regions.done.dim === false, "vivarium-namer: typed M o s s, a name nobody holds: Done is not dimmed: " + JSON.stringify([p.overlay.regions.field, p.overlay.regions.done])); }
  await nint("act.done", "confirm", 700);
  { const p = await props(); expect(!p.overlay && p.regions.nameTag.text === "Moss" && p.focus.cur === "name", "vivarium-namer: the name stands (Moss, as the rest of the journey knows it), the ring on the name: " + JSON.stringify([!!p.overlay, p.regions.nameTag.text, p.focus.cur])); }
  await press("home", 300); }
await press("home", 400);
// the empty Incubator offers ✓ Choose a pod (a pod in the rack and a bay free): a jump to Pods' collection with the ring on the first identified pod in rack order, else the first pod
stepOf("incubator-empty");
await page.evaluate(() => { window.__st.seedPod("S01", 4); window.__st.goto("incubator"); }); await page.waitForTimeout(600);
{ const p = await props(), st2 = await st(); cur.push({ state: p.state, ok: p.frame.line.ok ?? null, subject: p.frame.line.subject ?? null });
  expect(p.state === "empty" && p.frame.line.ok === "Choose a pod" && p.frame.line.subject === "ready for a new bud" && p.frame.line.back === "Home" && st2.tray.length >= 1, "the empty Incubator offers ✓ Choose a pod: " + JSON.stringify([p.state, p.frame.line])); await frameShot("page-incubator-empty", true); }
await hpressI("confirm", 600);
{ const at = await page.evaluate(() => { const u = window.__st.UI, g = window.__st.ST, i = g.tray.findIndex((q) => q.idd), q = g.tray[i >= 0 ? i : 0]; return { screen: u.screen, view: u.pods.view, cur: u.pods.cur, want: q.id }; }); cur.push(at);
  expect(at.screen === "pods" && at.view === "collection" && at.cur === at.want, "✓ Choose a pod jumps to Pods' collection on the first identified pod, else the first: " + JSON.stringify(at)); }
await hpressI("back", 400);
{ const u = await ui(); cur.push({ back: u.screen }); expect(u.screen === "home", "← on Pods' collection (a jump from the Incubator) goes Home: " + u.screen); }
// The Incubator's journey on the face, held to prototypes/face/golden/journey-incubator.json (gate check 5): the keys and what the face said, the screen and the choices after each
{ const file = path.resolve(here, "../../face/golden/journey-incubator.json"), steps = Object.fromEntries(Object.entries(trace).filter(([id]) => id.startsWith("incubator-"))), json = JSON.stringify({ _note: "The Incubator's journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key and what the face said (the focus and the intents), the screen, the ring and the choices after it, the line's ✓ and price. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(steps)])) if (JSON.stringify(want[id]) !== JSON.stringify(steps[id])) fail(`journey-incubator.json: step ${id} differs from the golden: ${JSON.stringify(steps[id]).slice(0, 300)}`); }
  console.log(`incubator steps: ${Object.entries(steps).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
// fill the bays: Grow is refused before payment; return a mibi frees a bay for +2 Essence
await page.evaluate(() => window.__st.seedAdults("S01", 77, 4));
s = await st(); expect(s.mibis.filter((m) => !m.released).length === 6, "six bays taken");
{ const e2 = s.e, r = await page.evaluate((id) => { const p = window.__st.podById(id); return { msg: window.__st.grow(id, {}).msg ?? "", paid: window.__st.ST.bud }; }, loika2.id);
  expect(/no bay free/.test(r.msg) && !r.paid && (await st()).e === e2, "a full vivarium refuses before payment, nothing paid, nothing grown: " + JSON.stringify(r)); }
const adult = s.mibis.find((m) => m.name !== "Moss" && m.name !== "Dot");
const s2 = (await st()).s; await page.evaluate((id) => window.__st.returnMibi(id), adult.id);   // the rule, to free a bay for what follows; the gate by keys is vivarium-card
s = await st(); expect(s.s === s2 + 2 && s.mibis.find((m) => m.id === adult.id).released && s.releases.at(-1).id === adult.id, "returned for +2 Essence and released");
await press("home", 200);
// 13. Grow with the service down: it works as it always does and paints nothing, so nothing waits and nothing is queued
caddyUp = false;
await page.evaluate(() => window.__st.addMaterials(10, 10, 10));
await press("research", 300);
await page.evaluate((id) => { window.__st.podsGo(id, "pod"); }, loika2.id); await page.waitForTimeout(300);
await press("confirm", 400); await press("confirm", 400); await press("confirm", 2900);   // Create, the Incubate | Keep shaping panel, its ✓ Incubate: the grow event (1080 ms, the jump at 900), then the Incubator's incubate moment holds input to 1380 ms
s = await st(); expect(s.bud && s.outbox.length === 0, "Grow paints nothing: the outbox stays empty");
await page.evaluate(() => window.__st.skipBud("ready")); await intent({ screen: "incubator", target: "", verb: "confirm" }, 300); await page.waitForTimeout(3200);
await press("home", 300);
// M4. Cross: free a bay, pair Dot with an unrelated adult Loika, see four seeds for the switches and a range for the blends at kinship 0; then siblings at a quarter
s = await st(); const adults = await adultIds(), adult2 = s.mibis.find((m) => !m.released && m.name !== "Dot" && m.name !== "Moss" && m.name !== "Pebble" && adults.includes(m.id));
await page.evaluate((id) => window.__st.returnMibi(id), adult2.id);   // the rule, to free a bay
s = await st(); expect(s.mibis.find((m) => m.id === adult2.id).released, "a second adult returned to free a bay");
const dot = s.mibis.find((m) => m.name === "Dot"), adult3 = s.mibis.find((m) => !m.released && m.id !== dot.id && adults.includes(m.id));
await page.evaluate((id) => { const u = window.__st.UI; u.hab.id = id; u.hab.f = "cross"; window.__st.goto("habitat"); }, dot.id); await page.waitForTimeout(300);
await intent({ screen: "habitat", target: "cross", verb: "confirm" }, 300);
expect((await page.evaluate(() => window.__st.UI.screen)) === "habitat", "✓ on the shut Cross module stays up close (doorOpen(cross) false until slot 7)");
expect(((await page.evaluate(() => window.__st.props?.frame?.line)) ?? {}).ok == null, "the shut Cross module has no ✓ cap");
await page.evaluate((id) => window.__st.openCross(id), dot.id); await page.waitForTimeout(300);
expect((await page.evaluate(() => window.__st.UI.screen)) === "cross", "the Cross screen, reached through the test hook (openCross), not a press (not built)");
await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, adult3.id); await page.waitForTimeout(300);
const fc = await page.evaluate(([a, b]) => window.__st.forecastOf(a, b), [dot.id, adult3.id]);
expect(fc.traits.filter((t) => t.kind === "switch").length === 3 && fc.traits.filter((t) => t.kind === "blend").length === 3, "four seeds for colour, markings and crown, a range for eye rings, drive and efficiency");
expect(fc.traits.filter((t) => t.kind === "switch").every((t) => t.seeds.length === 4), "four seeds each");
{ await press("research", 300); const at = await page.evaluate(() => ({ screen: window.__st.UI.screen, cross: window.__st.UI.cross }));
  expect(at.screen === "pods" && at.cross === null, "a room key on Cross drops the unpaid choices: " + JSON.stringify(at));
  await page.evaluate((id) => { window.__st.UI.hab.id = id; }, dot.id); await press("habitat", 300);
  expect((await ui()).screen === "vivarium" && (await page.evaluate(() => window.__st.props?.focus?.cur)) === "resident." + dot.id, "the Vivarium key opens the whole with the ring on the mibi last seen up close, its resident");
  await page.evaluate(() => window.__st.goto("habitat")); await page.waitForTimeout(300);
  await page.evaluate((id) => window.__st.openCross(id), dot.id); await page.waitForTimeout(300); await page.evaluate((id) => { window.__st.UI.cross.bId = id; }, adult3.id); await page.waitForTimeout(300); }
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
const chIndex = await page.evaluate((id) => { const m = window.__st.ST.mibis.find((x) => x.id === id), fr = window.__st.frameOf(m.species); return fr.chapters.findIndex((c) => !m.read.includes(c.id)); }, child.id);
{ stepOf("vivarium-card");
  await page.evaluate((id) => { const U = window.__st.UI; U.hab.id = id; U.meet = null; U.viv.f = null; window.__st.goto("home"); }, child.id); await page.waitForTimeout(300);   // the child's meet ended with a first press, off this step
  const hp = async (k, ms = 250) => { await said(); await page.waitForFunction(() => !window.__st.holding(), null, { timeout: 5000 }).catch(() => {}); await press(k, ms);   // a key pressed in a hold is dropped: wait the hold out first (a slower runner holds longer)
    const m = await said(), u = await ui(), p = await props(), l = p.frame?.line ?? {}; cur.push({ key: k, said: m, screen: u.screen, state: p.state, ring: p.focus?.cur ?? null, ok: l.ok ?? null, price: l.price ?? null, subject: l.subject ?? null, back: l.back ?? null }); return { u, p }; };
  let r = await hp("habitat", 500); expect(r.u.screen === "vivarium" && r.p.focus.cur === "resident." + child.id, "vivarium-card: the Vivarium key opens the whole with the ring on the mibi last seen up close: " + JSON.stringify([r.u.screen, r.p.focus.cur]));
  r = await hp("confirm", 700); expect(r.u.screen === "habitat" && r.p.state === "rest" && r.p.focus.cur === "resident" && r.u.habId === child.id, "vivarium-card: ✓ on its resident looks at it up close: " + JSON.stringify([r.u.screen, r.p.state, r.p.focus.cur]));
  r = await hp("right", 200); r = await hp("right", 200); expect(r.p.focus.cur === "species" && r.p.frame.line.ok == null && r.p.frame.line.subject === "the guide is not open yet", "vivarium-card: ▶ ▶ is the species word, shut until slot 8: no ✓ cap, the guide is not open yet: " + JSON.stringify([r.p.focus.cur, r.p.frame.line]));
  r = await hp("down", 200); for (let i = 0; i < chIndex; i++) r = await hp("right", 200);
  { const pl = r.p.regions.plates.items; expect(r.p.focus.cur === "plate." + chIndex && pl[chIndex].state === "unread" && /^Read /.test(r.p.frame.line.ok) && (r.p.frame.line.price.startsWith("◆") || r.p.frame.line.price === ""), "vivarium-card: ▼ then ▶ walks the plates to the unread one, ✓ Read it with its price: " + JSON.stringify([r.p.focus.cur, pl.map((x) => x.state), r.p.frame.line])); }
  const d3 = (await st()).d; r = await hp("confirm", 900); s = await st();
  expect(s.mibis.find((m) => m.id === child.id).read.length === child.read.length + 1 && s.d <= d3 && r.p.regions.plates.items[chIndex].state === "read", "vivarium-card: ✓ read the child's chapter, its plate turns read: " + JSON.stringify([s.d, d3, r.p.regions.plates.items[chIndex].state]));
  r = await hp("left", 200); expect(r.p.focus.cur !== "plate." + chIndex || chIndex === 0, "vivarium-card: ◀ walks back along the plates");
  // the door and the gate by keys, the ring walking on from where it is (the pad's graph: plates ▼ door ▼ cross ▶ wild ▼ tiles). The door asks for the resident to go with the Companion (the request is cleared after, the step leaves the world as it found it);
  // the gate: on the juvenile ✓ ✓ releases nothing and says nothing; on an adult ✓ arms and ✓ returns it for +2 Essence.
  const toward = async (target, route) => { for (let i = 0; i < 14; i++) { const c = (await props()).focus?.cur; if (c === target) return c; const k = route(c); if (!k) break; await hp(k, 220); } return (await props()).focus?.cur; };
  const toWild = (c) => c === "wild" ? null : c === "resident" || c === "name" ? "right" : c === "species" ? "down" : /^plate\./.test(c) ? "down" : c === "door" ? "down" : c === "cross" || c === "portrait" ? "right" : /^tile\./.test(c) ? "up" : null;
  { const c = await toward("door", (c) => (/^plate\./.test(c) ? "down" : c === "species" ? "down" : c === "resident" || c === "name" ? "right" : null)); r = { p: await props() }; expect(c === "door" && /^(Take|Bring)/.test(r.p.frame.line.ok ?? ""), "vivarium-card: the pad reaches the Companion module, ✓ Take it with you: " + JSON.stringify([c, r.p.frame.line])); cur.push({ walk: "door", ring: c, ok: r.p.frame.line.ok });
    r = await hp("confirm", 600); const q = await st(); expect(q.carryReqs.some((x) => x.id === child.id), "vivarium-card: ✓ on the door asks for the resident to go with the Companion: " + JSON.stringify(q.carryReqs));
    await page.evaluate((id) => { const t = window.__st.ST; t.carryReqs = t.carryReqs.filter((x) => x.id !== id); }, child.id); }
  { const c = await toward("wild", toWild); expect(c === "wild", "vivarium-card: the pad walks on to the Wild gate: " + c);
    const was = await st(), msg0 = await page.evaluate(() => window.__st.msg); expect(!(await adultIds()).includes(child.id), "vivarium-card: the child is a juvenile");
    await hp("confirm", 250); await hp("confirm", 500); const now = await st();
    expect(!now.mibis.find((m) => m.id === child.id).released && now.s === was.s && (await page.evaluate(() => window.__st.msg)) === msg0, "vivarium-card: ✓ ✓ on a juvenile releases nothing and says nothing: " + JSON.stringify([now.s, was.s]));
    cur.push({ gate: "juvenile", released: false, essence: now.s - was.s }); }
  { const adultNow = await adultIds(), was = await st(), away = await sv().then((v) => [...(v.carried ?? []), ...(v.with != null ? [v.with] : [])]), adultM = was.mibis.find((m) => !m.released && !m.bonded && m.id !== child.id && adultNow.includes(m.id) && !away.includes(m.id) && !(was.carryReqs ?? []).some((x) => x.id === m.id));   // one the rules let go: not bonded, not carried, no request waiting
    expect(!!adultM, "vivarium-card: an adult is at home to return");
    await hp("down", 300); const tileKey = "tile." + adultM.id; let c = (await props()).focus?.cur; for (const dir of ["right", "left"]) for (let i = 0; i < 14 && c !== tileKey; i++) { await hp(dir, 300); const n = (await props()).focus?.cur; if (n === c) break; c = n; }   // along the strip one way to its end, then the other
    expect(c === tileKey, "vivarium-card: ▼ then ◀ ▶ along the strip lands on the adult's tile: " + c);
    await hp("up", 300); const w = await toward("wild", toWild); expect(w === "wild", "vivarium-card: the pad walks back to the Wild gate with the adult shown: " + w);
    r = await hp("confirm", 500); expect(r.p.overlay?.id === "panel" && r.p.overlay.focus.cur === "card.return", "vivarium-card: ✓ on the Wild gate opens the Release panel, the ring on Release: " + JSON.stringify([r.p.overlay?.focus, r.p.frame.line])); r = await hp("left", 300); r = await hp("confirm", 800); const now = await st();
    expect(now.s === was.s + 2 && now.mibis.find((m) => m.id === adultM.id).released, "vivarium-card: the Return card returns the adult for +2 Essence: " + JSON.stringify([now.s, was.s]));
    cur.push({ gate: "adult", released: true, essence: now.s - was.s }); }
  await press("home", 300); }
// the bench trickle's watch: a resident on the Vivarium for the dev timer's 5 s earns +1 Data once (after the dev panel's New bench day)
{ stepOf("vivarium-trickle"); await page.evaluate(() => { window.__st.settings.watchMs = 5000; window.__st.settings.trickleCap = 2; window.__st.ST.bench = null; });   // a new bench day (the dev button's reset)
  const watched = await page.evaluate(() => { const st = window.__st.ST, sv = window.__st.SV, c = sv.carried ?? (sv.with != null ? [sv.with] : []), m = st.mibis.find((x) => !x.released && !c.includes(x.id) && !(st.bench?.watched || []).includes(x.id)); window.__st.UI.hab.id = m.id; window.__st.UI.viv.f = null; window.__st.goto("home"); return m.id; });
  await said(); await press("habitat", 500); await press("confirm", 700); { const u = await ui(), p = await props(); cur.push({ screen: u.screen, state: p.state, ring: p.focus?.cur ?? null, habId: u.habId }); expect(u.screen === "habitat" && u.habId === watched && p.state === "rest", "vivarium-trickle: the Vivarium key, then ✓ on its resident: up close on the mibi to watch: " + JSON.stringify([u.screen, u.habId, p.state])); }
  const dW = (await st()).d; await page.waitForTimeout(5800); const after = await st();
  expect(after.d === dW + 1 && after.bench.watched.includes(watched), "a resident watched for 5 s on the Vivarium earns +1 Data once: " + JSON.stringify([dW, after.d, after.bench]));
  await page.waitForTimeout(1500); expect((await st()).d === after.d, "and no more from the same resident that day"); }
// siblings: kinship a quarter, the forecast narrowed
await page.evaluate(() => { window.__st.settings.bays = 12; });   // room for the siblings and their parents, and a bay for their child
const sib = await page.evaluate(() => window.__st.seedSiblings("S01", 4242));
expect(sib.ok, "two siblings seeded: " + sib.msg);
expect((await page.evaluate(([a, b]) => window.__st.kinshipOf(a, b), [sib.mibis[0].id, sib.mibis[1].id])) === 0.25, "siblings: kinship a quarter");
await press("home", 200);

await page.emulateMedia({ reducedMotion: "reduce" });   // the pad and the focus are deterministic: the residents stand at their start
// The Vivarium's whole on the face (slot V, first PR: vivarium-pad, vivarium-whole): Home's panel opens the whole with the ring on the mibi last seen up close (its resident, else its tile); the pad moves by vivarium.json focus.graph (a resident
// to its neighbours ahead, ▼ to its tile, ◀ ▶ along the tiles, ▲ back to its resident); the Vivarium key is the way in again; ✓ looks at that mibi up close (not built yet, titled Vivarium); ← from up close is the whole with the ring on that mibi, ← from the
// the whole is Home with the ring on the panel. The focus the face says and the intents are held to prototypes/face/golden/journey-vivarium.json (lvgl-switch.md §4, gate check 5).
const vpress = async (k, ms = 200) => { await said(); await press(k, ms); const m = await said(), u = await ui(), p = await props(), l = p.frame?.line ?? {}; cur.push({ key: k, said: m, screen: u.screen, focus: u.screen === "vivarium" ? p.focus.cur : u.home, ok: l.ok ?? null, subject: l.subject ?? null, back: l.back ?? null }); return { u, p, ring: p.focus?.cur }; };
{ stepOf("vivarium-pad");
  await page.evaluate(() => { const U = window.__st.UI; U.hab.id = null; U.home.f = "vivarium"; window.__st.goto("home"); }); await page.waitForTimeout(400);
  let r = await vpress("confirm", 500); const ids = r.p.regions.residents.map((x) => x.id), sl = r.p.regions.bed.sleepers.map((x) => x.id), tiles = r.p.regions.tiles.items;
  expect(r.u.screen === "vivarium" && r.p.state === "rest" && r.p.frame.top.title === "Vivarium", "vivarium-pad: Home's panel opens the whole: " + JSON.stringify([r.u.screen, r.p.state, r.p.frame?.top?.title]));
  expect(r.ring === r.p.focus.targets.find((t) => t.group === "resident").id && r.p.frame.line.back === "Home" && /^Look at /.test(r.p.frame.line.ok), "vivarium-pad: none seen up close yet: the ring is on the first resident in bay order, ✓ Look at it, ← Home: " + JSON.stringify([r.ring, r.p.frame.line]));
  expect(tiles.length === (await page.evaluate(() => window.__st.settings.bays)) && tiles.filter((t) => t.state !== "free").length === (await st()).mibis.filter((m) => !m.released).length, "vivarium-pad: a tile a bay, a housed mibi's tile each: " + JSON.stringify(tiles.map((t) => t.state)));
  const on = r.ring, mid = on.slice(on.indexOf(".") + 1);
  r = await vpress("down", 200); expect(r.ring === "tile." + mid, "vivarium-pad: ▼ from a resident is its own tile: " + r.ring);
  r = await vpress("up", 200); expect(r.ring === "resident." + mid, "vivarium-pad: ▲ from a tile is its resident: " + r.ring);
  r = await vpress("down", 200); r = await vpress("right", 200); const t1 = r.ring; r = await vpress("left", 200);
  expect(t1.startsWith("tile.") && t1 !== "tile." + mid && r.ring === "tile." + mid, "vivarium-pad: ◀ ▶ walk the tiles in bay order: " + JSON.stringify([t1, r.ring]));
  r = await vpress("left", 200); r = await vpress("left", 200); const end = r.ring; r = await vpress("left", 200); expect(r.ring === end && end.startsWith("tile."), "vivarium-pad: the strip stops at its ends: " + JSON.stringify([end, r.ring]));
  r = await vpress("down", 200); expect(r.ring === end && r.u.screen === "vivarium", "vivarium-pad: ▼ from a tile does nothing: " + r.ring);
  r = await vpress("habitat", 400); expect(r.u.screen === "vivarium" && r.ring === on, "vivarium-pad: the Vivarium key on the whole puts the ring back on the mibi last seen, its resident (none seen: the first): " + JSON.stringify([r.u.screen, r.ring, on]));
  { const first = r.p.focus.targets.find((t) => t.group === "tile").id; await page.evaluate((id) => { window.__st.UI.viv.f = id; }, first); await page.waitForTimeout(300); const pp = await props(); r = { p: pp }; expect(pp.focus.cur === first && pp.frame.line.ok.startsWith("Look at "), "vivarium-pad: the ring on a tile says Look at its mibi: " + JSON.stringify(pp.frame.line)); await page.evaluate((id) => { window.__st.UI.viv.f = id; }, on); await page.waitForTimeout(300); }
  await frameShot("page-vivarium", true); }
{ stepOf("vivarium-whole");
  let r = await vpress("confirm", 700); const mid = (await ui()).habId;
  expect(r.u.screen === "habitat" && mid != null, "vivarium-whole: ✓ on a resident looks at that mibi up close: " + JSON.stringify([r.u.screen, mid]));
  { const p = await props(); cur.push({ screen: p.screen, state: p.state, ring: p.focus.cur, title: p.frame.top.title, back: p.frame.line.back }); expect(p.screen === "habitat" && p.state === "rest" && p.focus.cur === "resident" && p.frame.top.title === "Vivarium" && p.frame.line.back === "Vivarium", "vivarium-whole: up close is the mibi, titled Vivarium, ← reads Vivarium: " + JSON.stringify([p.state, p.focus.cur, p.frame.top.title, p.frame.line.back])); await frameShot("page-habitat", true); }
  r = await vpress("back", 700); expect(r.u.screen === "vivarium" && (r.ring === "resident." + mid || r.ring === "tile." + mid), "vivarium-whole: ← from up close is the whole with the ring on that mibi: " + JSON.stringify([r.u.screen, r.ring, mid]));
  r = await vpress("back", 500); expect(r.u.screen === "home" && r.u.home === "vivarium", "vivarium-whole: ← from the whole is Home with the ring on the panel: " + JSON.stringify([r.u.screen, r.u.home]));
  await page.evaluate(() => { window.__st.goto("vivarium"); }); await page.waitForTimeout(500);
  { const dk = JSON.stringify((await st()).dock); r = await vpress("dock", 500); expect(JSON.stringify((await st()).dock) !== dk && r.u.screen === "vivarium", "vivarium-whole: the Dock key lifts the Companion on the whole, on the frame of the key: " + JSON.stringify([r.u.screen, (await st()).dock])); }
  { const p = await props(); expect(p.regions.bed.state === "away" && p.regions.tiles.items.some((t) => t.state === "out") && p.regions.bed.mark, "vivarium-whole: away, the bed shows the Companion's mark and the carried mibis' tiles the glyph: " + JSON.stringify([p.regions.bed.state, p.regions.tiles.items.map((t) => t.state)]));
    const out = p.focus.targets.find((t) => t.id.startsWith("tile.") && p.regions.tiles.items.find((x) => "tile." + x.id === t.id)?.state === "out"); { const res = p.focus.targets.find((t) => t.id.startsWith("resident.")); if (res) { await page.evaluate((id) => { window.__st.UI.viv.f = id; }, res.id); await page.waitForTimeout(400); } }   // the ring on the first resident, so this capture shows what page-mibi-out (the ring on the out tile) does not
    await frameShot("page-vivarium-away", true);
    if (out) { await page.evaluate((id) => { window.__st.UI.viv.f = id; }, out.id); await page.waitForTimeout(400); expect((await props()).frame.line.subject === "out with the Companion", "vivarium-whole: an out mibi's tile is a target (out with the Companion)"); await frameShot("page-mibi-out", true); }
    { const was = await page.evaluate(() => window.__st.settings.light ?? null); await page.evaluate(() => { window.__st.settings.light = "night"; window.__st.UI.viv.f = window.__st.UI.viv.f; }); await page.waitForTimeout(700);   // the darkest light, still away: the Companion's mark on the bed and the out glyph on the carried tiles
      const pn = await props(); expect(String(pn.regions.window.picture).includes("night") && pn.regions.bed.state === "away" && pn.regions.tiles.items.some((t) => t.state === "out"), "vivarium-whole: away at night, the mark and the out glyph in the darkest light: " + JSON.stringify([pn.regions.window.picture, pn.regions.bed.state]));
      await frameShot("page-vivarium-away-night", true); await page.evaluate((l) => { window.__st.settings.light = l; }, was); await page.waitForTimeout(400); } }
  r = await vpress("dock", 500); expect((await st()).dock.docked && r.u.screen === "cargo" && (await props()).state === "arrival", "vivarium-whole: the Dock key docks again and the arrival plays over the Vivarium: " + r.u.screen);
  r = await vpress("confirm", 600); expect(r.u.screen === "vivarium" && (await st()).dock.docked, "vivarium-whole: an empty trip has no choice: ✓ skips the show and it closes, the Vivarium as it was: " + r.u.screen); }
{ const file = path.resolve(here, "../../face/golden/journey-vivarium.json"), steps = Object.fromEntries(Object.entries(trace).filter(([id]) => id.startsWith("vivarium-"))), json = JSON.stringify({ _note: "The Vivarium's whole, journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key (or intent) and the focus and intents the face said, the screen and the ring after it. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(steps)])) if (JSON.stringify(want[id]) !== JSON.stringify(steps[id])) { const a = want[id] ?? [], b = steps[id] ?? [], i = [...Array(Math.max(a.length, b.length)).keys()].find((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); fail(`journey-vivarium.json: step ${id} differs from the golden at action ${i} (golden ${a.length} actions, now ${b.length}): golden ${JSON.stringify(a[i])?.slice(0, 400)} · now ${JSON.stringify(b[i])?.slice(0, 400)}`); }; }
  console.log(`vivarium steps: ${Object.entries(steps).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
await page.emulateMedia({ reducedMotion: "no-preference" }); await page.evaluate(() => { window.__st.UI.home.f = "room"; window.__st.UI.hab.id = null; window.__st.goto("home"); }); await page.waitForTimeout(300);
// The Probe bench on the face (slot P: probe-bench): Home's Probe module opens it with the ring on the plates (two of three whole, ⚡ 14 ◆ 6, the switch off); ✓ mends a plate (⚡ −1, "every plate whole", the ring stays, held 300 ms: a key
// in the hold is dropped); ▶ the slot, ▲ the switch, ✓ toggles the dock's mend (no hold); ▼ the slot, ✓ arms ("Again: fit the upgrade"), ◀ clears the arm and lands on the plates; ▶ the slot, ✓ ✓ fits (⚡ −12 ◆ −4, tier 2, held 900 ms,
// four plates); ← is Home with the ring on the Probe module showing four plates; lifted, the bench is away with the ring on the switch, ✓ still toggles, and the Research key opens Pods. The focus the face says and the intents are held
// to prototypes/face/golden/journey-bench.json (lvgl-switch.md §4, gate check 5). The world is put back as it was after the step.
const bpress = async (k, ms = 200) => { await said(); await press(k, ms); const m = await said(), u = await ui(), p = await props(), l = p.frame?.line ?? {}, s = await st(); cur.push({ key: k, said: m, screen: u.screen, state: p.state ?? null, focus: u.screen === "bench" ? p.focus.cur : u.home, armed: u.screen === "bench" ? p.focus.armed : null, ok: l.ok ?? null, price: l.price ?? null, subject: l.subject ?? null, back: l.back ?? null, e: s.e, d: s.d, tier: u.screen === "bench" ? (p.regions.plates?.tier ?? null) : null, whole: u.screen === "bench" ? (p.regions.plates?.whole ?? null) : null, mend: u.screen === "bench" ? p.regions.switch.state : null }); return { u, p, ring: p.focus?.cur, l, s }; };
const benchIdle = () => page.waitForFunction(() => !window.__st.holding(), null, { timeout: 15000 });
{ stepOf("probe-bench");
  const snap = await page.evaluate(() => { const S = window.__st; return JSON.stringify({ e: S.ST.e, d: S.ST.d, s: S.ST.s, probe: S.ST.probe, mendFull: S.ST.mendFull, dock: S.ST.dock, pend: S.SV.probeSeen }); });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => { const S = window.__st, st = S.ST; st.e = 14; st.d = 6; st.mendFull = false; st.dock = { docked: true, at: 1 }; st.probe = { shield: 2, smax: 3, tier: 1, seq: (S.SV.probeSeen || 0) + 1 }; S.UI.idle = false; S.UI.home.f = "probe"; S.UI.bench.f = null; S.goto("home"); }); await page.waitForTimeout(500);
  let r = await bpress("confirm", 600);
  expect(r.u.screen === "bench" && r.p.state === "docked" && r.ring === "plates" && r.p.regions.plates.whole === 2 && r.p.regions.switch.state === "off" && r.l.ok === "Mend a plate" && r.l.price === "⚡ 1" && r.l.subject === "Shield takes three strikes" && r.l.back === "Home", "probe-bench: Home's Probe ✓ opens the bench, the ring on the plates (two of three whole), ✓ Mend a plate ⚡ 1, the switch off: " + JSON.stringify([r.u.screen, r.p.state, r.ring, r.l]));
  await frameShot("page-bench", true);
  r = await bpress("confirm", 100); expect(await page.evaluate(() => window.__st.holding()) && r.s.e === 13 && r.p.regions.plates.whole === 3, "probe-bench: ✓ mends a plate (⚡ −1) and holds input: " + JSON.stringify([r.s.e, r.p.regions.plates]));
  r = await bpress("right", 50); expect(r.ring === "plates", "probe-bench: a key during the mend's hold is dropped: the ring stays on the plates: " + r.ring);
  await benchIdle(); await page.waitForTimeout(250); r = await bpress("confirm", 150); expect(r.ring === "plates" && r.s.e === 13 && r.l.ok === null && r.l.subject === "every plate whole", "probe-bench: every plate whole: the ring stays, no ✓ cap, \"every plate whole\", nothing more to spend: " + JSON.stringify([r.ring, r.s.e, r.l]));
  r = await bpress("right", 200); expect(r.ring === "slot" && r.l.ok === "Fit the upgrade" && r.l.price === "⚡ 12 ◆ 4", "probe-bench: ▶ is the slot: ✓ Fit the upgrade ⚡ 12 ◆ 4: " + JSON.stringify([r.ring, r.l]));
  r = await bpress("up", 200); expect(r.ring === "switch" && r.l.ok === "Switch on", "probe-bench: ▲ is the switch: ✓ Switch on: " + JSON.stringify([r.ring, r.l.ok]));
  r = await bpress("confirm", 300); expect(!(await page.evaluate(() => window.__st.holding())) && r.ring === "switch" && r.p.regions.switch.state === "on" && (await st()).mendFull === true && r.l.ok === "Switch off", "probe-bench: ✓ toggles the dock's mend, no hold, the ring stays: " + JSON.stringify([r.p.regions.switch, r.l.ok]));
  r = await bpress("down", 200); expect(r.ring === "slot", "probe-bench: ▼ is the slot: " + r.ring);
  r = await bpress("confirm", 200); expect(r.p.overlay?.id === "panel" && r.p.overlay.focus.cur === "card.fit" && r.l.ok === "Fit it" && r.l.price === "⚡ 12 ◆ 4" && r.s.e === 13 && r.s.d === 6, "probe-bench: ✓ on the slot opens the Fit the upgrade? panel, the ring on Fit it, nothing spent: " + JSON.stringify([r.p.overlay?.focus, r.l.ok, r.l.price]));
  await frameShot("page-bench-panel-upgrade", true);
  r = await bpress("back", 200); expect(!r.p.overlay && r.ring === "slot" && r.s.e === 13 && r.s.d === 6 && r.p.regions.slot.state === "ready", "probe-bench: ← closes the panel, nothing spent: " + JSON.stringify([r.ring, r.s.e, r.s.d, r.p.regions.slot.state]));
  r = await bpress("confirm", 200); r = await bpress("right", 100); r = await bpress("confirm", 200); expect(!r.p.overlay && r.s.e === 13 && r.p.regions.plates?.tier === 1, "probe-bench: Not now closes it, nothing spent: " + JSON.stringify([r.s.e, r.p.regions.plates, r.u, !!r.p.overlay]));
  r = await bpress("confirm", 200);
  r = await bpress("confirm", 150); expect(await page.evaluate(() => window.__st.holding()) && r.s.e === 1 && r.s.d === 2 && r.p.regions.plates.tier === 2 && r.p.regions.plates.whole === 4 && r.p.regions.slot.state === "fitted", "probe-bench: the Fit it card fits the upgrade (⚡ −12 ◆ −4): tier 2, four plates, held: " + JSON.stringify([r.s.e, r.s.d, r.p.regions.plates, r.p.regions.slot.state]));
  r = await bpress("up", 50); expect(r.ring === "slot", "probe-bench: a key during the install's hold is dropped: " + r.ring);
  await benchIdle(); await page.waitForTimeout(400); r = await bpress("confirm", 150); expect(r.ring === "slot" && r.l.ok === null && r.l.subject === "the upgrade is fitted" && r.s.e === 1, "probe-bench: fitted: the ring stays on the slot, no ✓ cap, \"the upgrade is fitted\": " + JSON.stringify([r.ring, r.l]));
  await frameShot("page-bench-tier2", true);
  r = await bpress("back", 600); { const p = await props(); expect(r.u.screen === "home" && r.u.home === "probe" && p.regions.probe.shields.count === 4 && p.regions.probe.shields.whole === 4, "probe-bench: ← is Home with the ring on the Probe module, four plates whole: " + JSON.stringify([r.u.screen, r.u.home, p.regions.probe.shields])); }
  r = await bpress("confirm", 600); expect(r.u.screen === "bench" && r.ring === "switch", "probe-bench: opened again, every plate whole: the ring on the switch: " + JSON.stringify([r.u.screen, r.ring]));
  await page.evaluate(() => { window.__st.act("dock"); }); await page.waitForTimeout(500);
  { const p = await props(), s = await st(); cur.push({ lifted: true, state: p.state, focus: p.focus.cur, plates: p.regions.plates ?? null, slot: p.regions.slot.state, docked: s.dock.docked }); expect(p.state === "away" && !p.regions.plates && p.focus.cur === "switch" && p.regions.slot.state === "fitted" && !s.dock.docked, "probe-bench: lifted: the bench is away, no plates, the ring on the switch: " + JSON.stringify([p.state, p.focus.cur, s.dock.docked])); }
  r = await bpress("confirm", 300); expect(r.ring === "switch" && r.p.regions.switch.state === "off", "probe-bench: away, ✓ still toggles the switch: " + JSON.stringify([r.ring, r.p.regions.switch.state]));
  await frameShot("page-bench-away", true);
  r = await bpress("research", 500); expect(r.u.screen === "pods", "probe-bench: the Research key opens Pods: " + r.u.screen);
  await page.evaluate((snapJson) => { const S = window.__st, o = JSON.parse(snapJson); Object.assign(S.ST, { e: o.e, d: o.d, s: o.s, probe: o.probe, mendFull: o.mendFull, dock: o.dock }); S.UI.home.f = "room"; S.UI.bench = { f: null, arm: 0, install: false }; S.goto("home"); }, snap); await page.emulateMedia({ reducedMotion: "reduce" }); await page.waitForTimeout(400); }
{ const file = path.resolve(here, "../../face/golden/journey-bench.json"), steps = Object.fromEntries(Object.entries(trace).filter(([id]) => id.startsWith("probe-"))), json = JSON.stringify({ _note: "The Probe bench, journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key and the focus and intents the face said, the screen, the state, the ring, the line and the counters after it. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(steps)])) if (JSON.stringify(want[id]) !== JSON.stringify(steps[id])) { const a = want[id] ?? [], b = steps[id] ?? [], i = [...Array(Math.max(a.length, b.length)).keys()].find((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); fail(`journey-bench.json: step ${id} differs from the golden at action ${i} (golden ${a.length} actions, now ${b.length}): golden ${JSON.stringify(a[i])?.slice(0, 400)} · now ${JSON.stringify(b[i])?.slice(0, 400)}`); }; }
  console.log(`bench steps: ${Object.entries(steps).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
// 7. every screen but Home, Cargo and Pods is not built: its room keys, ← and the first press on Idle work, with today's keys
const NAV = JSON.parse(readFileSync(path.join(here, "../../ui/specs/station/frame.json"), "utf8")).navigation.screens;
const placeOf = (screen) => ({ bench: "probe" }[screen] || screen), screenOfPlace = (pl) => ({ probe: "bench" }[pl.split(".")[0]] || pl.split(".")[0]);
{
  const SCREENS = ["cross"];
  for (const name of SCREENS) {
    await page.evaluate((n) => window.__st.goto(n), name); await page.waitForTimeout(500);
    const p = await props(), c = await page.evaluate(() => window.__st.check()), nav = NAV[placeOf(name)];
    expect(p.screen === name && p.state === "notBuilt", `${name}: sends state notBuilt: ` + JSON.stringify([p.screen, p.state]));
    expect(c.log.type.some((t) => t.text === "this screen is not built yet") && c.log.type.some((t) => t.region === "title"), `${name}: the face draws the line and the title: ` + JSON.stringify(c.log.type.map((t) => t.text)));
    expect(c.log.regions.some((r) => r.id === "title" && r.layer === "painted"), `${name}: the title mark is drawn (a painted "title" region): ` + JSON.stringify(c.log.regions.filter((r) => r.id === "title")));
    const wantBack = nav?.back === "{name}" ? await page.evaluate(() => { const m = window.__st.ST.mibis.find((x) => x.id === window.__st.UI.hab.id); return m ? m.name : "Back"; }) : nav?.back === "{pod}" ? await page.evaluate(() => { const q = window.__st.podById(window.__st.UI.pods.cur); return q ? window.__st.frameOf(q.species).species.name : "Back"; }) : nav?.back ?? null;   // a way back that names the pod names the pod the rack has under the beam, one that names the mibi the mibi shown up close
    expect((p.frame.line.back ?? null) === wantBack && !p.frame.line.ok, `${name}: ← names the parent (${wantBack ?? "none"}) and ✓ does nothing: ` + JSON.stringify(p.frame.line));
    const e = (await st()).e; await press("confirm", 150); await press("up", 100); await press("right", 100);
    expect((await ui()).screen === name && (await st()).e === e && (await props()).state === "notBuilt", `${name}: ✓ and the pad do nothing`);
    await frameShot("notbuilt-" + name, name === "habitat");
    // ← goes to the parent in the navigation tree; on Home nothing
    await press("back", 300); const to = (await ui()).screen;
    expect(nav?.parent ? to === screenOfPlace(nav.parent) : to === name, `${name}: ← goes to ${nav?.parent ?? "nowhere"}: ` + to);
    // each room key opens its room's top
    for (const [k, want] of [["research", "pods"], ["library", "library"], ["habitat", "vivarium"], ["home", "home"]]) { await page.evaluate((n) => window.__st.goto(n), name); await page.waitForTimeout(250); await press(k, 300); expect((await ui()).screen === want, `${name}: the ${k} key opens ${want}: ` + (await ui()).screen); }
  }
  // the Dock key on Idle still acts: it wakes the screen and docks (or lifts)
  const dockBefore = JSON.stringify((await st()).dock); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(300); await press("dock", 400); let u = await ui();
  expect(!u.idle && JSON.stringify((await st()).dock) !== dockBefore, "the Dock key on Idle wakes and acts: " + JSON.stringify(u)); await press("dock", 400);
  // Idle: the first press only wakes (nothing moves, nothing opens, nothing is spent), on a screen that is not built and on Pods
  await press("home", 300); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(400);
  { const p = await props(), c = await page.evaluate(() => window.__st.check()); expect(p.idle === true && !p.frame.top && !p.frame.line && typeof p.frame.idle.line === "string" && !/\d/.test(p.frame.idle.line) && p.frame.idle.line.split(" ").filter(Boolean).length <= 6, "Idle sends its regions and one line, no frame: " + JSON.stringify(Object.keys(p.frame))); expect(JSON.stringify(c.log.type.map((t) => t.text)) === JSON.stringify(p.frame.idle.line ? [p.frame.idle.line] : []), "Idle shows its line and nothing else: " + JSON.stringify(c.log.type.map((t) => t.text))); await frameShot("page-idle", true); }
  const e = (await st()).e; await press("confirm", 400); u = await ui();
  expect(!u.idle && u.screen === "home" && (await st()).e === e && (await props()).state === "home", "the first press on Idle only wakes: " + JSON.stringify(u));
  await press("research", 300); const f0 = await focusNow(); await page.evaluate(() => { window.__st.UI.idle = true; }); await page.waitForTimeout(400); await press("right", 400);
  expect(!(await ui()).idle && (await focusNow()) === f0 && (await ui()).screen === "pods", "on Pods the first press on Idle wakes and the ring stays: " + JSON.stringify([await ui(), f0, await focusNow()]));
}
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("mb-save-v8")));
expect(stored.st.schema === 3 && stored.st.tray.length === (await st()).tray.length && stored.st.mibis.length === (await st()).mibis.length && JSON.stringify({ ...stored, st: undefined }) === companionBefore, "the save round-trips and the Companion's part is untouched");
// 8. the CI smoke's presses, from a fresh world with no save
await page.evaluate(() => { localStorage.removeItem("mb-save-v8"); });

await assertFace("the journey");
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
await page.goto(`http://127.0.0.1:${port}/sandbox/station/?test`, { waitUntil: "load" });
await page.evaluate(() => window.__st.ready);
expect((await st()).tray.length === 0 && !(await sv()).seed, "a fresh world: no save, no pods");
await page.keyboard.press("KeyD"); await page.waitForTimeout(250);
expect(/no world yet/.test(await page.evaluate(() => window.__st.msg)), "docking without a world says so");
for (const k of ["KeyR", "ArrowRight", "Enter", "KeyL", "KeyB", "KeyD", "KeyH"]) { await page.keyboard.press(k); await page.waitForTimeout(200); }
await page.waitForTimeout(300); await hold(); await stepClock(1200); await frameShot("page-fresh", true); await release();   // the last screen change's dither and any arrival are over: the 1024×600 frame itself
await page.evaluate(() => { window.__st.goto("vivarium"); }); await page.waitForTimeout(500); await frameShot("page-vivarium-empty", true);   // a fresh world's whole: nobody lives here yet, the bays free
{ const p = await props(); expect(p.screen === "vivarium" && p.state === "empty" && p.frame.line.subject === "nobody lives here yet" && !p.frame.line.ok && p.focus.cur === "room", "page-vivarium-empty: a fresh world's whole is empty, the ring on nothing, no ✓ cap: " + JSON.stringify([p.state, p.frame.line, p.focus.cur])); }
// The Library spread on the face (slot L: library-spread): a fresh world first (Home's Library module opens the spread with the ring on S01, sixteen empty frames), then a world with found, met and unmet frames: the pad walks spread.focus.graph, ✓ on a met or an unmet
// frame does nothing (no ✓ cap, no plate: fix 8), ✓ on a found frame does nothing until slot 8 and then is the Book (not built yet, titled Library, ← Library), its ← is the spread with the ring on that species, and ← on the spread is Home with the ring on the Library module.
// The focus the face says and the intents are held to prototypes/face/golden/journey-library.json (lvgl-switch.md §4, gate check 5).
const lpress = async (k, ms = 300) => { await said(); await press(k, ms); await page.waitForFunction(() => !window.__st.holding(), null, { timeout: 15000 }); const m = await said(), u = await ui(), p = await props(), l = p.frame?.line ?? {}; cur.push({ key: k, said: m, screen: u.screen, state: p.state ?? null, focus: u.screen === "library" && p.state === "spread" ? p.focus.cur : u.home, ok: l.ok ?? null, subject: l.subject ?? null, back: l.back ?? null }); return { u, p, ring: p.focus?.cur }; };
{ stepOf("library-spread");
  await page.evaluate(() => { const U = window.__st.UI; U.home.f = "library"; U.lib.f = "spread"; window.__st.goto("home"); }); await page.waitForTimeout(400);
  let r = await lpress("confirm", 500);
  expect(r.u.screen === "library" && r.p.state === "spread" && r.ring === "frame.S01" && r.p.regions.leftPage.items.every((x) => x.status === "unmet") && r.p.regions.rightPage.items.every((x) => x.status === "unmet"), "library-spread: a fresh world: Home's Library module opens the spread, sixteen empty frames, the ring on S01: " + JSON.stringify([r.u.screen, r.p.state, r.ring]));
  await frameShot("page-library-empty", true);
  r = await lpress("back", 400); expect(r.u.screen === "home" && r.u.home === "library", "library-spread: ← on the spread is Home with the ring on the Library module: " + JSON.stringify([r.u.screen, r.u.home])); }
// Q1, the fresh-world loop on the face (lvgl-switch.md §4 V): from no save, the sandbox has no Companion walking, so the one crate is the developer panel's seed (seedCrate); everything after is keys. Home, Dock, Cargo opens the crate,
// Pods identifies the pod, Create grows the founder (nothing read: all of it stays a surprise), the Incubator's bud is grown now and opened, the hatch lands in the meet, the first ✓ opens the namer, Done keeps the name, ← is the whole, ← is Home.
{ const loop = async (k, what, until) => { await page.evaluate((k) => window.__st.act(k), k); await page.waitForTimeout(120); await page.waitForFunction(() => !window.__st.holding(), null, { timeout: 15000 }); if (until) await page.waitForFunction(until, null, { timeout: 12000 }).catch(() => fail("fresh-loop: " + what + " (never happened): ")); await page.waitForTimeout(150); };
  await press("home", 300);
  await page.evaluate(() => window.__st.seedCrate("S01", 1, 4242));
  await loop("dock", "the Dock key docks and the arrival plays over Home", () => window.__st.ST.dock.docked && window.__st.props?.state === "arrival");
  await loop("confirm", "any key skips the show to the choice", () => window.__st.props?.overlay?.form === "strip");
  await loop("confirm", "✓ Open the bay on the strip opens the crate and the end shows (T-50 cut 1; the opening holds input)", () => window.__st.UI.screen === "cargo" && window.__st.props?.state === "end");
  await loop("confirm", "✓ on the end lands on Pods", () => window.__st.UI.screen === "pods");
  await loop("confirm", "✓ on the new pod opens its overview", () => window.__st.props?.state === "overview");
  await loop("confirm", "✓ Identify", () => window.__st.props?.frame?.line?.ok === "Create from this pod");
  await loop("confirm", "✓ Create from this pod opens Create", () => window.__st.UI.screen === "create");
  await loop("confirm", "✓ Incubate opens the Incubate | Keep shaping panel", () => window.__st.props?.overlay?.form === "incubate");
  await loop("confirm", "✓ Incubate in the panel (the grow event, then the Incubator's incubate moment)", () => window.__st.UI.screen === "incubator");
  await loop("confirm", "✓ Hatch now (the bar, the door, the hatch, then the meet)", () => window.__st.UI.screen === "habitat");
  { const p = await props(); expect(p.screen === "habitat" && p.state === "meet" && p.focus.cur === "resident" && /^Name /.test(p.frame.line.ok) && !p.overlay, "fresh-loop: the hatch lands in the meet with the ring on the resident, ✓ Name it: " + JSON.stringify([p.state, p.focus.cur, p.frame.line.ok])); }
  await loop("confirm", "the meet's first ✓ opens the namer", () => window.__st.props?.overlay?.id === "namer");
  { const p = await props(); expect(p.overlay.focus.cur === "act.done" && p.state === "rest", "fresh-loop: the namer is open, the ring on Done: " + JSON.stringify([p.overlay.focus.cur, p.state])); }
  await loop("confirm", "Done keeps the name", () => !window.__st.props?.overlay);
  { const p = await props(); expect(p.screen === "habitat" && p.focus.cur === "resident", "fresh-loop: the namer closed with the ring on the resident: " + JSON.stringify([p.screen, p.focus.cur])); }
  await loop("back", "← is the Vivarium's whole", () => window.__st.UI.screen === "vivarium");
  await loop("back", "← from the whole is Home", () => window.__st.UI.screen === "home");
  { const u = await ui(); expect(u.screen === "home" && u.home === "vivarium", "fresh-loop: the loop ends on Home with the ring on the Vivarium: " + JSON.stringify([u.screen, u.home])); } }
{ stepOf("library-spread-found");
  await page.evaluate(() => { const S = window.__st, st = S.ST; st.knownIds = ["S01", "S03", "S09"]; st.metIds = ["S04"]; S.fillGuide("S03", 0.55); S.fillGuide("S09", 1); S.UI.home.f = "room"; S.UI.lib.f = "spread"; S.goto("home"); }); await page.waitForTimeout(400);
  let r = await lpress("library", 500);
  expect(r.u.screen === "library" && r.p.state === "spread" && r.ring === "frame.S01", "library-spread: the Library key opens the spread, the ring on S01: " + JSON.stringify([r.u.screen, r.ring]));
  r = await lpress("right", 250); r = await lpress("right", 250); expect(r.ring === "frame.S03", "library-spread: ▶ walks the frames in order: " + r.ring);
  r = await lpress("down", 250); expect(r.ring === "frame.S07", "library-spread: ▼ is the frame below: " + r.ring);
  r = await lpress("up", 250); expect(r.ring === "frame.S03", "library-spread: ▲ is the frame above: " + r.ring);
  r = await lpress("left", 250); r = await lpress("left", 250); r = await lpress("left", 250); expect(r.ring === "frame.S01", "library-spread: ◀ stops at the page's edge: " + r.ring);
  r = await lpress("right", 250); r = await lpress("right", 250); r = await lpress("right", 250); expect(r.ring === "frame.S04", "library-spread: ▶ three times from S01 is S04: " + r.ring);
  r = await lpress("right", 250); expect(r.ring === "frame.S09", "library-spread: ▶ from the last frame of the left page is the first of the right: " + r.ring);
  r = await lpress("left", 250); r = await lpress("back", 300); r = await lpress("library", 400);   // the ring was left on S04, a met frame: the Library key lands there by itself
  { const p = await props(); expect(p.focus.cur === "frame.S04" && !p.frame.line.ok && /Hiljan/.test(JSON.stringify(p.frame.line) + JSON.stringify(p.regions.leftPage.items[3])), "library-spread: a met frame (S04): the ring on it, no ✓ cap: " + JSON.stringify([p.focus.cur, p.frame.line])); }
  const plate = () => page.evaluate(() => window.__st.msg);
  r = await lpress("confirm", 300); { const m = await plate(); expect(r.u.screen === "library" && r.p.state === "spread" && m === "", "library-spread: ✓ on a met frame does nothing, no plate, and nothing opens: " + JSON.stringify([r.u.screen, r.p.state, m])); }
  r = await lpress("left", 250); r = await lpress("left", 250); r = await lpress("left", 250); r = await lpress("down", 250); expect(r.ring === "frame.S05" && r.p.regions.leftPage.items[4].status === "unmet", "library-spread: ◀ ◀ ◀ ▼ reach S05, an unmet frame: " + r.ring);
  r = await lpress("confirm", 300); { const m = await plate(); expect(r.u.screen === "library" && r.p.state === "spread" && !r.p.frame.line.ok && m === "", "library-spread: ✓ on an unmet frame does nothing, no plate, no ✓ cap: " + JSON.stringify([r.u.screen, r.p.frame.line, m])); }
  r = await lpress("up", 250); r = await lpress("right", 250); r = await lpress("right", 250); expect(r.ring === "frame.S03", "library-spread: ▲ ▶ ▶ reach S03, a found frame: " + r.ring);
  { const p = await props(); expect(p.focus.cur === "frame.S03" && p.frame.line.ok == null, "library-spread: a found frame has no ✓ cap until slot 8 (the Book is shut): " + JSON.stringify(p.frame.line)); }
  r = await lpress("confirm", 500); { const m = await plate(); expect(r.u.screen === "library" && r.p.state === "spread" && r.ring === "frame.S03" && !r.p.frame.line.ok && m === "", "library-spread: ✓ on a found frame does nothing, no plate, and stays on the spread (the Book is shut until slot 8): " + JSON.stringify([r.u.screen, r.p.state, r.ring, r.p.frame.line, m])); }
  await frameShot("page-library-spread", true);
  r = await lpress("back", 500); expect(r.u.screen === "home" && r.u.home === "library", "library-spread: ← on the spread is Home with the ring on the Library module: " + JSON.stringify([r.u.screen, r.u.home])); }
{ const file = path.resolve(here, "../../face/golden/journey-library.json"), steps = Object.fromEntries(Object.entries(trace).filter(([id]) => id.startsWith("library-"))), json = JSON.stringify({ _note: "The Library spread, journey on the face (lvgl-switch.md §2.8, gate check 5): per step, each key (or intent) and the focus and intents the face said, the screen, the state and the ring after it. Written by tools/journey.mjs with JOURNEY_GOLDEN=write; never edited by hand.", steps }, null, 1) + "\n";
  if (process.env.JOURNEY_GOLDEN === "write") { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, json); console.log("wrote " + file); }
  else if (!existsSync(file)) fail("no golden journey at " + file); else if (readFileSync(file, "utf8") !== json) { const want = JSON.parse(readFileSync(file, "utf8")).steps; for (const id of new Set([...Object.keys(want), ...Object.keys(steps)])) if (JSON.stringify(want[id]) !== JSON.stringify(steps[id])) { const a = want[id] ?? [], b = steps[id] ?? [], i = [...Array(Math.max(a.length, b.length)).keys()].find((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k])); fail(`journey-library.json: step ${id} differs from the golden at action ${i} (golden ${a.length} actions, now ${b.length}): golden ${JSON.stringify(a[i])?.slice(0, 400)} · now ${JSON.stringify(b[i])?.slice(0, 400)}`); }; }
  console.log(`library steps: ${Object.entries(steps).map(([id, t]) => id + " " + t.length).join(" · ")} actions recorded`); }
checks.textApiCalls += await page.evaluate(() => window.__fillTextCalls);
if (checks.textApiCalls !== 0) { errors.push("the page called the canvas text API " + checks.textApiCalls + " times"); console.error("FAIL text API calls " + checks.textApiCalls); }
if (external.length) { errors.push("requests left the page's origin: " + external.join(", ")); console.error("FAIL external requests " + external.join(", ")); }
{ const r = await page.evaluate(() => ({ render: window.__st.renderErrors, face: window.__st.faceErrors })); expect(r.render.length === 0 && r.face.length === 0, "no render threw and the face sent no error: " + JSON.stringify(r)); }
await assertFace("the fresh world");
const checksFile = process.env.STATION_CHECKS || path.join(tmpdir(), "mb-station-checks.json");
writeFileSync(checksFile, JSON.stringify(checks));
console.log("recorded " + checks.shots.length + " screenshot points for the layer checks in " + checksFile);
expect(caddy.state.jobs.length === 0 && caddyGrowCalls === 0, "the whole journey: Grow and Cross painted nothing, no /grow call and no job reached the Caddy service: " + JSON.stringify([caddy.state.jobs.length, caddyGrowCalls]));
await browser.close(); server.close(); caddy.stop(); caddyServer.close();
if (errors.length) { console.error("journey failed:\n" + errors.join("\n")); process.exit(1); }
// The milestones whose screens are not on the face yet: their steps are listed from journey-pending/ on every run and run when the screen is built (lvgl-switch.md §4).
{ const dir = path.join(here, "journey-pending"), files = readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort();
  for (const f of files) { const { milestone, steps } = await import(pathToFileURL(path.join(dir, f)).href); console.log(`pending until ${milestone} is on the LVGL face (${steps.length} steps in tools/journey-pending/${f}):\n` + steps.map((p) => "  · " + p.id + ": " + p.what).join("\n")); } }
console.log("journey ok · screenshots in img/");
