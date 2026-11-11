// The play page on a phone (owner 2026-11-09): Playwright device emulation with touch at 412 × 915, 390 × 844 (portrait) and 915 × 412 (landscape).
// Each device is checked whole (its canvas, shell, tray and keys inside the viewport), the bar in one row with no overlap, every touch target at least 44 CSS px, the d-pad a cross,
// a tap on every on-screen key sending that key, the Dock key under the keys (quiet before a walk), a new player on the Companion with the Station's tab asleep, the Options panel with no Dock row and no one-device note, the turn hint once.
//   node prototypes/play/tools/phone.mjs            (PW_DIR=/path/with/node_modules/playwright; PHONE_SHOTS=dir writes the stills)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_DIR ? path.join(process.env.PW_DIR, "node_modules/playwright") : "playwright");
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, "../..");
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".css": "text/css", ".md": "text/markdown", ".wasm": "application/wasm", ".ttf": "font/ttf", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = path.join(root, decodeURIComponent(req.url.split("?")[0]).replace(/^\/sandbox\//, "/"));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" }); res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/sandbox/play/`;
const browser = await chromium.launch();
const fails = [];
const expect = (c, m) => { if (!c) { fails.push(m); console.error("FAIL " + m); } };
const eq = (a, b, m) => expect(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)}, wanted ${JSON.stringify(b)}`);
const shots = process.env.PHONE_SHOTS; if (shots) mkdirSync(shots, { recursive: true });

async function open(width, height, dsf, { query = "?test", fresh = null } = {}) {
  const ctx = fresh ?? await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  if (!fresh) await ctx.addInitScript(() => { if (!sessionStorage.getItem("phone-journey")) { localStorage.setItem("mb-station-dev", '{"light":"day","stationTime":"12:00","stationDate":"2026-10-17"}'); sessionStorage.setItem("phone-journey", "1"); } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { fails.push("pageerror: " + e.message); console.error("FAIL pageerror: " + e.message); });
  await page.goto(base + query, { waitUntil: "load" });
  await page.waitForFunction(() => window.__play && window.__play.frames.station.contentWindow && window.__play.frames.station.contentWindow.__st, null, { timeout: 30000 });
  const st = () => page.frame({ url: /\/station\// }), mb = () => page.frame({ url: /\/exploration\// });
  await st().evaluate(() => window.__st.ready); await mb().waitForFunction(() => window.__mb && window.__mb.S, null, { timeout: 30000 }); await page.waitForTimeout(800);
  return { ctx, page, st, mb };
}
const inside = (b, W, H) => b.l >= -0.01 && b.t >= -0.01 && b.r <= W + 0.01 && b.b <= H + 0.01;
const overlaps = (a, b) => a.l < b.r - 0.01 && b.l < a.r - 0.01 && a.t < b.b - 0.01 && b.t < a.b - 0.01;
const KEYCODES = { Left: "ArrowLeft", Up: "ArrowUp", Down: "ArrowDown", Right: "ArrowRight", Home: "KeyH", Pods: "KeyR", Vivarium: "KeyB", Library: "KeyL", Call: "KeyC", Back: "Escape", Confirm: "Enter" };

for (const [W, H, dsf] of [[412, 915, 2.625], [390, 844, 3], [915, 412, 2.625]]) {
  const portrait = H > W, tag0 = `${W}×${H}@${dsf}`;
  const { ctx, page, st, mb } = await open(W, H, dsf, { query: "?test&new" });   // `new`: a new player, the Station asleep (test pages otherwise keep the Station awake)
  eq(await page.evaluate(() => [__play.phone, matchMedia("(pointer: coarse)").matches]), [true, true], tag0 + ": the page knows it is on a phone");
  eq(await page.evaluate(() => __play.owner), "companion", tag0 + ": a new player (no pod home yet) opens on the Companion, upright or turned");
  eq(await page.evaluate(() => [tabCompanion.getBoundingClientRect().left < tabStation.getBoundingClientRect().left, tabStation.textContent]), [true, "Station · asleep"], tag0 + ": the tabs read Companion | Station · asleep");
  // the bar: one row, no overlap, only the device switch and Options, every control at least 44
  const barBoxes = await page.evaluate(() => [...document.querySelectorAll("#bar > *")].filter((e) => getComputedStyle(e).display !== "none" && e.id !== "live").map((e) => { const r = e.getBoundingClientRect(); return { id: e.id, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, text: e.textContent }; }));
  eq(barBoxes.map((b) => b.id), ["tabStation", "tabCompanion", "optionsBtn"], tag0 + ": the bar shows the device switch and Options only");
  expect(barBoxes.every((b) => b.h >= 44 && b.w >= 44 && inside(b, W, 60)), tag0 + ": the bar's controls are 44 and over and on screen " + JSON.stringify(barBoxes.map((b) => [b.id, b.w, b.h])));
  expect(barBoxes.every((b) => b.t === barBoxes[0].t && b.h === barBoxes[0].h), tag0 + ": the bar is one row");
  for (let i = 0; i < barBoxes.length; i++) for (let j = i + 1; j < barBoxes.length; j++) expect(!overlaps(barBoxes[i], barBoxes[j]), `${tag0}: ${barBoxes[i].id} and ${barBoxes[j].id} overlap`);
  expect(await page.evaluate(() => { const b = document.getElementById("bar"); return [...b.children].every((e) => e.scrollWidth <= e.clientWidth + 1 || getComputedStyle(e).display === "none"); }), tag0 + ": no word in the bar is clipped");
  eq(await page.evaluate(() => getComputedStyle(document.getElementById("note")).display), "none", tag0 + ": the one-device note is not in the bar");
  const sc = await page.evaluate(() => { const s = document.getElementById("stage"); s.scrollLeft = 99; s.scrollTop = 99; document.documentElement.scrollLeft = 99; window.scrollTo(99, 99); return [s.scrollLeft, s.scrollTop, document.documentElement.scrollWidth, innerWidth, document.documentElement.scrollHeight, innerHeight, scrollX, scrollY]; }); expect(sc[0] === 0 && sc[1] === 0 && sc[2] <= sc[3] && sc[4] <= sc[5] && sc[6] === 0 && sc[7] === 0, tag0 + ": nothing scrolls " + JSON.stringify(sc));

  for (const dev of ["companion", "station"]) {
    const tag = `${tag0} ${dev}`;
    await page.touchscreen.tap(...(await page.evaluate((d) => { const r = document.getElementById(d === "station" ? "tabStation" : "tabCompanion").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, dev)));
    await page.waitForTimeout(500);
    eq(await page.evaluate(() => __play.owner), dev, tag + ": the switch swaps the device");
    const m = await page.evaluate((d) => {
      const fr = document.getElementById(d === "station" ? "fStation" : "fCompanion"), sh = document.getElementById(d === "station" ? "shStation" : "shCompanion"), tr = document.getElementById(d === "station" ? "rowStation" : "rowCompanion");
      const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const fb = box(fr), sc = fb.w / fr.offsetWidth, cv = fr.contentDocument.querySelector("canvas").getBoundingClientRect();
      const canvas = { l: fb.l + cv.left * sc, t: fb.t + cv.top * sc, r: fb.l + cv.right * sc, b: fb.t + cv.bottom * sc, w: cv.width * sc, h: cv.height * sc };
      const other = document.getElementById(d === "station" ? "shCompanion" : "shStation");
      return { z: __play.z, dpr: devicePixelRatio, canvas, frame: fb, shell: box(sh), tray: box(tr), shellVis: getComputedStyle(sh).visibility, otherVis: getComputedStyle(other).visibility,
        keys: [...tr.querySelectorAll(".k")].map((k) => ({ name: k.getAttribute("aria-label"), cls: k.className, ...box(k) })), hub: box(tr.querySelector(".hub")), up: __play.geom, scrollTop: document.getElementById("stage").scrollTop };
    }, dev);
    eq([m.shellVis, m.otherVis], ["visible", "hidden"], tag + ": one device at a time, the other is not shown (it is never to the right, off screen)");
    expect(inside(m.canvas, W, H) && inside(m.frame, W, H) && inside(m.shell, W, H), tag + `: the canvas, frame and shell are whole in the viewport (canvas ${JSON.stringify(m.canvas)})`);
    expect(m.keys.every((k) => inside(k, W, H)) && inside(m.tray, W, H), tag + ": the tray and every key are whole in the viewport");
    expect(m.z >= 1 ? Number.isInteger(m.z) : m.z > 0, tag + ": z is a whole number when one fits (" + m.z + ")");
    expect(Math.abs(m.canvas.w * m.dpr - (dev === "station" ? 1024 : 450) * m.z) < 1.5, tag + `: the canvas is ${m.z} device px an lp (${m.canvas.w * m.dpr} wide)`);
    expect(m.keys.length === (dev === "station" ? 11 : 7) && m.keys.every((k) => k.w >= 44 - 1e-6 && k.h >= 44 - 1e-6), tag + ": every key is a 44 touch target " + JSON.stringify(m.keys.map((k) => [k.name, Math.round(k.w * 10) / 10, Math.round(k.h * 10) / 10]).filter((k) => k[1] < 44 || k[2] < 44)));
    for (let i = 0; i < m.keys.length; i++) for (let j = i + 1; j < m.keys.length; j++) expect(!overlaps(m.keys[i], m.keys[j]), `${tag}: ${m.keys[i].name} and ${m.keys[j].name} overlap`);
    // the D-pad is a cross round a hub
    const K = Object.fromEntries(m.keys.map((k) => [k.name, k])), A = K.Up.w;
    expect(Math.abs(K.Left.t - K.Up.b) < 1.5 && Math.abs(K.Down.t - K.Left.b) < 1.5 && Math.abs(K.Left.r - K.Up.l) < 1.5 && Math.abs(K.Right.l - K.Up.r) < 1.5 && Math.abs(m.hub.l - K.Up.l) < 1.5 && Math.abs(m.hub.t - K.Left.t) < 1.5 && Math.abs(m.hub.w - A) < 1.5, tag + ": the arrows are a cross round a hub");
    expect(K.Left.l < K.Call.l && K.Call.l < K.Back.l && K.Back.l < K.Confirm.l || !portrait, tag + ": the D-pad is left, Call, Back, Confirm right");
    if (portrait) {
      expect(m.canvas.t < m.tray.t && m.tray.t - m.shell.b < 1.5, tag + ": the tray is joined under the screen");
      expect(Math.abs(m.tray.w - (W - 12)) < 1.5, tag + ": the tray fills the width (" + m.tray.w + " of " + (W - 12) + ")");
      if (dev === "companion") expect(Math.abs((K.Call.t + K.Call.b) / 2 - (K.Left.t + K.Left.b) / 2) < 1.5, tag + ": Call, ←, ✓ on the D-pad's middle line");
      else expect(K.Home.t > K.Down.b - 1 && K.Home.l < K.Down.l, tag + ": the room keys in a row under the D-pad");
    }
    // the Dock key: on screen, a 44 target, clear of the tray; quiet before the first walk's crate
    const dk = await page.evaluate(() => { const e = document.getElementById("dockKey"), r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height, shown: getComputedStyle(e).display !== "none", text: e.textContent, quiet: e.classList.contains("quiet") }; });
    expect(dk.shown && dk.h >= 44 - 1e-6 && dk.w >= 44 && inside(dk, W, H), tag + ": the Dock key is on screen and a 44 target " + JSON.stringify(dk));
    expect(!overlaps(dk, m.tray) || !portrait, tag + ": the Dock key sits clear of the tray");
    expect(dk.quiet && /^Dock|^⇧?D?ock/.test(dk.text.trim()), tag + ": the Dock key is quiet before a walk " + JSON.stringify(dk.text));
    if (shots) await page.screenshot({ path: path.join(shots, `phone-${W}x${H}-${dev}.png`) });

    // a tap on each on-screen key sends that key (down, then up) to its device
    await page.evaluate((d) => { const w = window.__play.frames[d].contentWindow; window.__seen = []; for (const t of ["keydown", "keyup"]) w.addEventListener(t, (e) => window.__seen.push(t + ":" + e.code), true); }, dev);
    const want = [];
    for (const k of m.keys) { await page.touchscreen.tap(k.l + k.w / 2, k.t + k.h / 2); await page.waitForTimeout(120); want.push("keydown:" + KEYCODES[k.name], "keyup:" + KEYCODES[k.name]); }
    const seen = await page.evaluate(() => window.__seen);
    eq(seen, want, tag + ": a tap on each key sends its key down and up, in order");
  }
  // and what the Station's room keys do
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.getElementById("tabStation").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }))); await page.waitForTimeout(400);
  const tapKey = async (name) => { const b = await page.evaluate((n) => { const r = document.querySelector(`#rowStation .k[aria-label="${n}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, name); await page.touchscreen.tap(...b); await page.waitForTimeout(600); };
  await tapKey("Home"); const s0 = await st().evaluate(() => window.__st.UI.screen);
  await tapKey("Library"); const s1 = await st().evaluate(() => window.__st.UI.screen); eq(s1, "library", tag0 + ": the Library key opens the Library (it was " + s0 + ")");
  await tapKey("Home"); eq(await st().evaluate(() => window.__st.UI.screen), "home", tag0 + ": the Home key goes Home");

  // Options: no Dock row and no one-device note any more (the Dock key is under the keys)
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.getElementById("optionsBtn").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }))); await page.waitForTimeout(500);
  const op = await page.evaluate(() => { const p = document.querySelector(".op-panel"), r = p && p.getBoundingClientRect(), d = document.getElementById("optionsDock"); return { open: !!p, inView: !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, text: p ? p.textContent : "", dock: d ? d.getBoundingClientRect().height : 0, btns: p ? [...p.querySelectorAll("button,[role=switch],[role=combobox]")].map((b) => b.getBoundingClientRect().height) : [] }; });
  expect(op.open && op.inView && !/One device at a time/.test(op.text) && !/Dock the Companion|Lift the Companion/.test(op.text) && op.dock === 0 && /Playtest waits/.test(op.text), tag0 + ": Options has no Dock row and no one-device note, and still holds Playtest waits, on screen " + JSON.stringify({ ...op, text: op.text.slice(0, 60) }));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  await ctx.close();
}

// the turn hint: once, a quiet line under the portrait Station, only where turning the phone gives a bigger one (a 412 × 915 phone at ratio 3.5: 1× upright, 2× turned)
{
  const { ctx, page } = await open(412, 915, 3.5);
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.getElementById("tabStation").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }))); await page.waitForTimeout(500);
  const z = await page.evaluate(() => __play.z), hint = () => page.evaluate(() => { const h = document.getElementById("turnHint"), r = h.getBoundingClientRect(); return { shown: !h.classList.contains("hidden"), text: h.textContent, inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, pe: getComputedStyle(h).pointerEvents }; });
  eq(z, 1, "hint: the Station is 1× upright on a ratio-3.5 phone");
  const h1 = await hint(); expect(h1.shown && h1.inView && h1.pe === "none" && h1.text.length > 5, "hint: shown once under the Station, on screen, never blocking " + JSON.stringify(h1));
  await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => window.__play); await page.waitForTimeout(1500);
  await page.touchscreen.tap(...(await page.evaluate(() => { const r = document.getElementById("tabStation").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }))); await page.waitForTimeout(500);
  eq((await hint()).shown, false, "hint: not shown again on the next visit");
  await ctx.close();
}
await browser.close(); server.close();
if (fails.length) { console.error(`${fails.length} FAILED`); process.exit(1); }
console.log("phone: ok");
