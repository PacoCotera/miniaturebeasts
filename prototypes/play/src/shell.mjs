// The play page's shell (technical-architecture.md W1; the architect's spec): the Station and the Companion as same-origin frames side by side, the page's own keys, the Dock control, the cradle and the
// seat. The shell draws only page chrome. It never reads or writes the save (the devices cross it by the storage event, as between two tabs) and it imports nothing from station/, exploration/ or
// workbench/: the Dock control asks the Caddy service to seat or lift the cradle, the Station is handed the dock by postMessage (`mb-dock`), and the Caddy's face is drawn from the
// service's state and the two frames' words (`mb-caddy` from the Station, `mb-companion` from the Companion) by caddy/face.mjs.
//
// Lengths are in lp: one lp is `f` CSS px, so every edge lands on a whole physical pixel. Colours are the Station's 14.

import { faceOf, rasterFace, createScheduler, lampAt, LAMPS, STATION_LAMPS, REGIONS } from "../../caddy/face.mjs";   // the Caddy's face, shared with the service's tests and renders
import { baseK, baseTier, fitChoice, chosen, clampZ, Z_MAX, ARM, CROSS_ROW, ROWH } from "./fit.mjs";   // the size: z device px per lp and its tier
import { areaHeight, isPhone, isPortrait, phoneFit, biggerTurned, planPortrait, planLandscape, trayMin, trayMax, sides, dockReserve, DOCK_KEY_H, DOCK_KEY_GAP, PHONE_BAR, PHONE_PAD } from "./phone.mjs";   // the phone: one device whole, its keys in the viewport
import { stampText } from "./stamp.mjs";   // the build stamp's line, in Mexico City time
import { readOptions, writeOptions, OPTIONS_KEY } from "./options.mjs";
import { NAME_LISTS } from "./names.mjs";   // the Options panel's settings
import { mountOptions } from "../vendor/options.js";   // the Options panel: React + Radix, built from play/options (npm run build there)

const params = new URLSearchParams(location.search), TEST = params.has("test"), SEED = params.get("seed");   // test-harness flags only: every option a person sets is in the Options panel (play/src/options.mjs)
// The play page is the playtest build: Playtest waits is ON until a person sets the options themselves (the stored options are written once, before any frame reads them). Test pages keep the options as they are.
try { if (!TEST && localStorage.getItem(OPTIONS_KEY) == null) writeOptions({ playtest: true }); } catch { /* no storage: the options stay the defaults */ }
const OPT = readOptions(), DEV = OPT.dev;   // the options are one stored setting both devices read themselves (no URL carries them); its block is "the Options panel" below the keys
let cslot = OPT.companion === "B" ? "B" : "A";   // the Companion in the frame: A, or the second Companion B
const $ = (id) => document.getElementById(id);
const SEAT_MS = 160, EASE = [0, 0, 0.2, 1];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- the pixel rule ----
// The faces keep the pixel rule: one lp is f = k / devicePixelRatio CSS px, k = z, a whole number of device px per lp (src/fit.mjs). The page chrome (keys, bar, trays, gaps) is in CSS px, snapped to whole
// physical pixels; the thresholds are CSS px of the window, the bar included. k0 is the faces' own scale (each device draws its screen at max(1, floor(dpr)) device px per CSS px); the shell scales a frame by
// z / k0 as a whole, so a face pixel stays a z × z block. ?test keeps z = k0 and today's tiers.
const Z_KEY = "mb-play-z";
const loadZ = () => { try { const v = localStorage.getItem(Z_KEY); return v == null ? null : clampZ(v); } catch { return null; } };
const saveZ = (v) => { try { if (v == null) localStorage.removeItem(Z_KEY); else localStorage.setItem(Z_KEY, String(v)); } catch { /* no storage: the choice lasts the visit */ } };
let dpr = 1, k = 1, k0 = 1, f = 1, CW = 1920, CH = 1080, tier = "row", zSet = TEST ? null : loadZ();   // tier: "stack", "row" or "narrow"; zSet: the chosen z, null for fit
let phone = false;   // a touch device with a short side under 600 CSS px: one device at a time, whole, keys in the viewport (phone.mjs)
function metrics() {
  dpr = window.devicePixelRatio || 1; k0 = baseK(dpr); CW = innerWidth; CH = innerHeight;
  phone = isPhone(window.matchMedia("(pointer: coarse)").matches, CW, CH);
  const c = phone ? { tier: "narrow", z: phoneFit(owner, CW, CH, dpr).z } : TEST ? { tier: baseTier(CW, CH), z: k0 } : zSet != null ? chosen(zSet, CW, CH, dpr) : fitChoice(CW, CH, dpr);
  k = c.z; tier = c.tier; f = k / dpr;
  document.documentElement.style.setProperty("--f", String(f));
  document.documentElement.style.setProperty("--mark", (24 * Math.max(1, Math.round(dpr))) / dpr + "px");   // the 24 px room marks at 24 × n device px, nearest-neighbour: never smoothed, never a fractional step
}
const px = (lp) => Math.round(lp * k) / dpr + "px";
const pxUp = (lp) => Math.ceil(Math.round(lp * k) / dpr * 64) / 64 + "px";   // a size, up to Chromium's next 1/64 CSS px layout unit
const S = (v) => Math.round(v * dpr) / dpr;   // a CSS length snapped to a whole physical pixel
const Z = (v) => Math.ceil(v * dpr - 1e-6) / dpr;   // a CSS size rounded up to a whole physical pixel (never below the minimum)
const Zc = (v) => Math.ceil(Z(v) * 64) / 64;   // and up to Chromium's next 1/64 layout unit
// iframes, shells and trays go by transform with their sizes rounded up to the next layout unit: nested left/top values floor to 1/64 px and would put a device's screen off the whole device pixel
// a frame keeps the size its face draws at (k0) and is scaled by z / k0 from its top left: whole blocks of device pixels
const placeFrame = (el, x, y, w, h) => { const s = el.style, sc = k / k0;
  s.left = "0px"; s.top = "0px"; s.transform = "translate(" + px(x) + "," + px(y) + ")" + (sc !== 1 ? " scale(" + sc + ")" : ""); s.transformOrigin = sc !== 1 ? "0 0" : "";
  s.width = Math.ceil(Math.round(w * k0) / dpr * 64) / 64 + "px"; s.height = Math.ceil(Math.round(h * k0) / dpr * 64) / 64 + "px"; };
const place = (el, x, y, w, h) => { const s = el.style;
  if (el.tagName === "IFRAME") { placeFrame(el, x, y, w, h); return; }
  if (el.classList.contains("shell")) { s.left = "0px"; s.top = "0px"; s.transform = "translate(" + px(x) + "," + px(y) + ")"; if (w != null) s.width = pxUp(w); if (h != null) s.height = pxUp(h); return; }
  s.left = px(x); s.top = px(y); if (w != null) s.width = px(w); if (h != null) s.height = px(h); };
// the same in CSS px (page chrome)
const placeC = (el, x, y, w, h, tf) => { const s = el.style;
  if (tf) { s.left = "0px"; s.top = "0px"; s.transform = "translate(" + S(x) + "px," + S(y) + "px)"; } else { s.left = S(x) + "px"; s.top = S(y) + "px"; }
  if (w != null) s.width = Zc(w) + "px"; if (h != null) s.height = Zc(h) + "px"; };

// ---- state ----
// "First pod home" (first-ten-front D3): the Station holds a pod, a crate, a bud or a mibi. The Station's word (`podHome` in `mb-caddy`) is the truth and comes from its save; this marker is that word as last
// heard, kept so the first paint after a reload already knows it (cleared with Start fresh). Until a pod is home the page opens on the Companion on every device and the Station sleeps.
const HOME_KEY = "mb-play-podhome";
const loadHome = () => { try { return localStorage.getItem(HOME_KEY) === "1"; } catch { return false; } };
const saveHome = (v) => { try { if (v) localStorage.setItem(HOME_KEY, "1"); else localStorage.removeItem(HOME_KEY); } catch { /* no storage: the Station's word is heard again at every load */ } };
const NEWBIE = !TEST || params.has("new");   // test pages keep today's page (the Station awake) unless a test asks for the new player's (`?test&new`: test-harness flag only)
let podHome = NEWBIE ? loadHome() : true;
const START_OWNER = !podHome || (isPhone(window.matchMedia("(pointer: coarse)").matches, innerWidth, innerHeight) && isPortrait(innerWidth, innerHeight)) ? "companion" : "station";   // a new player starts on the Companion; later a portrait phone still opens on it, the handheld
let owner = START_OWNER, seatOff = 0, devOpen = false, keysOpen = false;
let caddy = { canDock: false, docked: false, crates: 0, pending: false };   // the Dock control's view of the cradle and the frames' words (derive())
let pressed = false, seatBusy = false;
const frames = { station: $("fStation"), companion: $("fCompanion") };
const stationUrl = "../station/?embed" + (TEST ? "&test" : ""), companionUrl = "../exploration/?embed" + (cslot === "A" && SEED != null ? "&seed=" + encodeURIComponent(SEED) : "");

// ---- the keys (drawn keys press exactly as the keyboard does) ----
const SVG = {
  left: '<svg viewBox="0 0 16 16"><path d="M3 8l7-5v10z"/></svg>', up: '<svg viewBox="0 0 16 16"><path d="M8 3l5 7H3z"/></svg>', down: '<svg viewBox="0 0 16 16"><path d="M8 13L3 6h10z"/></svg>', right: '<svg viewBox="0 0 16 16"><path d="M13 8L6 3v10z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>', confirm: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  call: '<svg viewBox="0 0 26 26"><path d="M7 8a7 7 0 0 1 0 10M11.5 5a11 11 0 0 1 0 16M16 2.5a14.5 14.5 0 0 1 0 21"/><circle cx="4" cy="13" r="1.6" fill="#eafff9" stroke="none"/></svg>',
};
const MARK = (n) => `<img src="../ui/assets/masters/shell/shell-key-${n}-24.png" alt="">`;
// key sizes in CSS px (the ruling's minimums); g is the group: P the D-pad, R the rooms, A the actions
const KEYS = {
  station: [
    { id: "left", code: "ArrowLeft", name: "Left", cls: "pad arm left", glyph: SVG.left, g: "P", s: ARM }, { id: "up", code: "ArrowUp", name: "Up", cls: "pad arm up", glyph: SVG.up, g: "P", s: ARM },
    { id: "down", code: "ArrowDown", name: "Down", cls: "pad arm down", glyph: SVG.down, g: "P", s: ARM }, { id: "right", code: "ArrowRight", name: "Right", cls: "pad arm right", glyph: SVG.right, g: "P", s: ARM },
    { id: "home", code: "KeyH", name: "Home", cls: "room home", glyph: MARK("home"), g: "R", s: 56 }, { id: "research", code: "KeyR", name: "Pods", cls: "room research", glyph: MARK("pods"), g: "R", s: 56 },
    { id: "vivarium", code: "KeyB", name: "Vivarium", cls: "room vivarium", glyph: MARK("vivarium"), g: "R", s: 56 }, { id: "library", code: "KeyL", name: "Library", cls: "room library", glyph: MARK("library"), g: "R", s: 56 },
    { id: "call", code: "KeyC", name: "Call", cls: "round call", glyph: SVG.call, g: "A", s: 56 },
    { id: "back", code: "Escape", name: "Back", cls: "round back", glyph: SVG.back, g: "A", s: 56 }, { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, g: "A", s: 64 },
  ],
  companion: [
    { id: "left", code: "ArrowLeft", name: "Left", cls: "cpad arm left", glyph: SVG.left, g: "P", s: ARM }, { id: "up", code: "ArrowUp", name: "Up", cls: "cpad arm up", glyph: SVG.up, g: "P", s: ARM },
    { id: "down", code: "ArrowDown", name: "Down", cls: "cpad arm down", glyph: SVG.down, g: "P", s: ARM }, { id: "right", code: "ArrowRight", name: "Right", cls: "cpad arm right", glyph: SVG.right, g: "P", s: ARM },
    { id: "call", code: "KeyC", name: "Call", cls: "round call", glyph: SVG.call, g: "A", s: 56 }, { id: "back", code: "Escape", name: "Back", cls: "round cback", glyph: SVG.back, g: "A", s: 56 },
    { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, g: "A", s: 64 },
  ],
};
const keyEls = { station: [], companion: [] }, hubEl = {};   // { def, el }; the hubs
function buildKeys() {
  for (const dev of ["station", "companion"]) {
    const host = $(dev === "station" ? "rowStation" : "rowCompanion");
    const hub = document.createElement("div"); hub.className = "hub " + (dev === "station" ? "shub" : "chub"); host.appendChild(hub); hubEl[dev] = hub;   // the d-pad's centre: the cross is four arms round a hub
    for (const def of KEYS[dev]) {
      const b = document.createElement("button"); b.type = "button"; b.className = "k " + def.cls; b.innerHTML = def.glyph; b.setAttribute("aria-label", def.name); b.tabIndex = -1; wireKey(b, dev, def);
      host.appendChild(b); keyEls[dev].push({ def, el: b });
    }
  }
}
function fire(dev, type, def) {
  const w = frames[dev].contentWindow; if (!w) return;
  try { w.dispatchEvent(new KeyboardEvent(type, { code: def.code, key: def.code === "Enter" ? "Enter" : def.code === "Escape" ? "Escape" : def.code, bubbles: true, cancelable: true })); } catch { /* the frame is reloading */ }
}
function wireKey(b, dev, def) {
  let down = false;
  const up = () => { if (!down) return; down = false; b.classList.remove("dn"); fire(dev, "keyup", def); };
  b.addEventListener("pointerdown", (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* no capture */ } setOwner(dev); down = true; b.classList.add("dn"); fire(dev, "keydown", def); });
  b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up); b.addEventListener("lostpointercapture", up);
  b.addEventListener("click", (e) => e.preventDefault());
}

// ---- the key trays (ruling 6.1): a tray is as wide as its shell, 72 CSS px a row; the groups wrap to two rows, a key never shrinks and the shell never widens ----
const GAP = [16, 8], MARGIN = [8, 4], GROUPS = { station: ["P", "R", "A"], companion: ["P", "A"] }, INNER = { P: 4, R: 8, A: 8 };
const CROSS = { up: [ARM, 0], left: [0, ARM], right: [2 * ARM, ARM], down: [ARM, 2 * ARM] };   // the D-pad is a cross: up above, down below, left and right at the sides, a hub between (owner 2026-11-09)
function groupOf(dev, n) {
  if (n === "P") return { n, w: 3 * ARM, off: CROSS };   // each key's [x, y] in the cross
  const defs = KEYS[dev].filter((d) => d.g === n); let x = 0; const off = {};
  defs.forEach((d, i) => { off[d.id] = x; x += d.s + (i < defs.length - 1 ? INNER[n] : 0); });
  return { n, w: x, off };
}
// returns { rows, pos: { id: [x, y] } } in CSS px inside the tray
function trayPlan(dev, T) {
  const gs = GROUPS[dev].map((n) => groupOf(dev, n)), by = Object.fromEntries(gs.map((g) => [g.n, g]));
  const need = (list, g, m) => list.reduce((a, x) => a + x.w, 0) + (list.length - 1) * g + 2 * m;
  const sizeOf = Object.fromEntries(KEYS[dev].map((d) => [d.id, d.s])), pos = {}, rowTop = (row) => (row ? CROSS_ROW : 0), rowH = (row) => (row ? ROWH : CROSS_ROW); let hub = null;
  const put = (grp, x, row) => { for (const [id, o] of Object.entries(grp.off)) {
    if (grp.n === "P") pos[id] = [S(x + o[0]), S(rowTop(row) + (rowH(row) - 3 * ARM) / 2 + o[1])];
    else pos[id] = [S(x + o), S(rowTop(row) + (rowH(row) - sizeOf[id]) / 2)];
    if (grp.n === "P") hub = [S(x + ARM), S(rowTop(row) + (rowH(row) - 3 * ARM) / 2 + ARM)]; } };
  const gm = (list) => { for (let i = 0; i < 2; i++) if (need(list, GAP[i], MARGIN[i]) <= T) return i; return -1; };
  const one = gm(gs);
  if (one >= 0) {   // one row: the D-pad at the left, the rooms centred (kept clear of both neighbours), the actions at the right
    const g = GAP[one], m = MARGIN[one], P = by.P, A = by.A, R = by.R;
    put(P, m, 0); put(A, T - m - A.w, 0);
    if (R) put(R, Math.min(Math.max((T - R.w) / 2, m + P.w + g), T - m - A.w - g - R.w), 0);
    return { rows: 1, h: CROSS_ROW, pos, hub };
  }
  if (dev === "station") {   // row 1 the D-pad at the left and the rooms at the right; row 2 the actions, right-aligned
    const l1 = [by.P, by.R], i1 = gm(l1), m1 = MARGIN[i1 < 0 ? 1 : i1], g1 = GAP[i1 < 0 ? 1 : i1];
    if (i1 >= 0) { put(by.P, m1, 0); put(by.R, T - m1 - by.R.w, 0); } else { const sh = (T - need(l1, g1, m1)) / 2; put(by.P, sh + m1, 0); put(by.R, sh + m1 + by.P.w + g1, 0); }
    const i2 = gm([by.A]), m2 = MARGIN[i2 < 0 ? 1 : i2];
    if (i2 >= 0) put(by.A, T - m2 - by.A.w, 1); else put(by.A, (T - by.A.w) / 2, 1);
  } else { put(by.P, (T - by.P.w) / 2, 0); put(by.A, (T - by.A.w) / 2, 1); }   // the Companion: the D-pad centred, then the actions centred
  return { rows: 2, h: CROSS_ROW + ROWH, pos, hub };
}

// ---- layout ----
const bar = $("bar"), stage = $("stage"), shS = $("shStation"), shC = $("shCompanion"), ring = $("ring"), cradle = $("cradle"), slot = $("slot"), lamp = $("lamp"), dev = $("dev"), keysPanel = $("keysPanel");
const trayEl = { station: $("rowStation"), companion: $("rowCompanion") };
const tabs = { station: $("tabStation"), companion: $("tabCompanion") }, dockKey = $("dockKey"), asleepStrip = $("asleepStrip"), keysBtn = $("keysBtn"), devBtn = $("devBtn"), note = $("note");
const zDown = $("zDown"), zFit = $("zFit"), zUp = $("zUp"), stamp = $("stamp"), turnHint = $("turnHint");
const GAPV = 24, TOP = 16, BOT = 16;   // CSS px: between blocks, from the bar, below the last block
const geom = { station: null, companion: null, caddy: null, height: 0, rows: { station: 1, companion: 1 } };   // block boxes in stage CSS px, for the scroll and the checks

function layout() {
  metrics();
  if (phone) { layoutPhone(); return; }
  document.body.classList.remove("phone"); bar.style.height = ""; stage.style.top = ""; stage.style.overflow = ""; ring.classList.remove("hidden"); turnHint.classList.add("hidden");
  for (const dv of ["station", "companion"]) { trayEl[dv].classList.remove("side"); }
  const narrow = tier === "narrow", row = tier === "row";
  // the bar: 40 CSS px, controls 40 tall
  // until the first pod is home the Companion's tab comes first and the Station's says it sleeps
  const tabsEnd = layoutTabs(narrow ? 104 : 124, narrow ? 140 : 152);
  // from the right: the developer tools' place, the size control (not under ?test), Keys ?
  const zw = TEST ? 0 : 152 + 8, keysX = (narrow ? CW - 184 : CW - 260) - zw;
  placeC(keysBtn, keysX, 0, narrow ? 64 : 92, 40);
  placeC(devBtn, narrow ? CW - 112 : CW - 160, 0, narrow ? 100 : 148, 40);
  if (!TEST) layoutSize((narrow ? CW - 112 : CW - 160) - zw);
  devBtn.textContent = narrow ? "Tools" : "Developer tools"; devBtn.setAttribute("aria-label", "Developer tools"); devBtn.classList.toggle("on", devOpen); devBtn.setAttribute("aria-pressed", String(devOpen));
  const ctlX = layoutCompanionCtl(narrow, tabsEnd + 16); layoutOptions(narrow, keysX, ctlX + (narrow ? 72 : 148) + 8);
  layoutDock();
  // the bar's note: the narrow tier's line, or for 4000 ms after a seat, a lift or the opening's end, the Caddy's two lines as one (T-20261016-109)
  note.textContent = noteCaddy || NOTE_TEXT;
  note.classList.toggle("hidden", !narrow);
  if (narrow) placeC(note, 12, 44, Math.max(0, CW - 24), 16);
  // the column(s): the shell (the face and 8 lp all round), its key tray joined below, the Companion's cradle under its tray, the Caddy's block
  const cwid = stage.clientWidth || CW;
  const sw = Zc(1040 * f), cw = Zc(466 * f), shH = 616 * f, cradleH = 28 * f, caddyW = 808 * f, caddyH = 288 * f;
  const planS = trayPlan("station", sw), planC = trayPlan("companion", cw), trS = planS.h, trC = planC.h;
  geom.rows = { station: planS.rows, companion: planC.rows };
  const y0 = narrow ? 28 : TOP;
  let xS, xC, yS = y0, yC, caddyX, caddyY, h;
  const centre = (w) => (w <= cwid ? Math.floor((cwid - w) / 2) : 12);   // centred, or 12 in from the left when a chosen z is wider than the window (the page scrolls sideways)
  // The Station asleep (no pod home yet) while the Companion has the keys: the Companion on top, the Station one strip beside it (first-ten-front D2); the Station's block and keys wait out of sight
  const sleeping = !narrow && !podHome && owner === "companion", STRIP_W = 300, STRIP_H = 56;
  if (narrow) { xS = 12; xC = Math.max(12, Math.floor((cwid - cw) / 2)); yC = y0; }
  else if (sleeping) { const x0 = centre(cw + GAPV + STRIP_W); xC = x0; xS = x0; yC = y0; }
  else if (row) { const tot = sw + GAPV + cw, x0 = centre(tot); xS = x0; xC = x0 + sw + GAPV; yC = y0; }
  else { xS = centre(sw); xC = centre(cw); yC = yS + shH + trS + GAPV; }
  const cradleY = yC + shH + trC;
  // the Dock key (first-ten-front A2): beside the Companion's tray (under the asleep strip while the Station sleeps), else under its cradle
  const DKW = sleeping ? STRIP_W : 196, dockBeside = sleeping || xC + cw + 12 + DKW <= cwid - 8, dockExtra = dockBeside ? 0 : DOCK_KEY_H + 12;
  if (row && !sleeping) { caddyX = xS + sw - caddyW; caddyY = yS + shH + trS + GAPV; } else { caddyX = centre(caddyW); caddyY = cradleY + cradleH + dockExtra + GAPV; }
  const printH = print.id && print.h && !narrow ? print.h * f + 24 : 0, printGap = printH ? 12 : 0;   // the recovery print's strip under the Caddy's block, while a print waits
  const wide = row && !sleeping;
  h = narrow ? Math.max(yS + shH + trS, yC + shH + trC + cradleH + dockExtra) + BOT : Math.max(wide ? caddyY + caddyH + printGap + printH : 0, cradleY + cradleH + dockExtra, wide ? 0 : caddyY + caddyH + printGap + printH) + BOT;
  geom.station = sleeping ? { x: xC + cw + GAPV, y: y0, w: STRIP_W, h: STRIP_H } : { x: xS, y: yS, w: sw, h: shH + trS }; geom.companion = { x: xC, y: yC, w: cw, h: shH + trC }; geom.height = h;
  const seatPx = seatOff * f;
  placeC(shS, xS, yS, sw, shH, true); place(frames.station, 8, 8, 1024, 600);
  placeC(shC, xC, yC + seatPx, cw, shH, true); place(frames.companion, 8, 8, 450, 600);
  placeC(trayEl.station, xS, yS + shH, sw, trS, true); placeC(trayEl.companion, xC, yC + shH, cw, trC, true);
  for (const dv of ["station", "companion"]) { const pl = dv === "station" ? planS : planC; trayEl[dv].style.setProperty("--pk", ARM + "px"); placeC(hubEl[dv], pl.hub[0], pl.hub[1], ARM, ARM); for (const { def, el } of keyEls[dv]) { const [kx, ky] = pl.pos[def.id]; placeC(el, kx, ky, def.s, def.s); } }
  { const x = dockBeside ? xC + cw + (sleeping ? GAPV : 12) : xC, y = dockBeside ? yC + shH + Math.floor((trC - DOCK_KEY_H) / 2) : cradleY + cradleH + 12;
    placeC(dockKey, x, y,dockBeside ? DKW : cw, DOCK_KEY_H);
    dockKey.classList.toggle("hidden", narrow && owner !== "companion"); }
  asleepStrip.classList.toggle("hidden", !sleeping); if (sleeping) placeC(asleepStrip, xC + cw + GAPV, y0, STRIP_W, STRIP_H);
  const vis = (el, on) => { el.style.visibility = on ? "visible" : "hidden"; el.style.pointerEvents = on ? "" : "none"; };
  vis(shS, (!narrow && !sleeping) || owner === "station"); vis(trayEl.station, (!narrow && !sleeping) || owner === "station"); vis(shC, !narrow || owner === "companion"); vis(trayEl.companion, !narrow || owner === "companion");
  // the cradle and the seat
  const showCradle = !narrow || owner === "companion";
  cradle.classList.toggle("hidden", !showCradle);
  if (showCradle) { placeC(cradle, xC, cradleY, cw, cradleH, true); place(slot, 16, -1, 434, 6); place(lamp, 12, 15, 8, 8); lamp.width = 8; lamp.height = 8; lamp.style.width = px(8); lamp.style.height = px(8); }
  cradle.classList.toggle("off", !caddy.canDock);
  cradle.title = dockTitle();
  // the Caddy's screen: always shown (e-paper keeps its last lines), not in the narrow tier
  caddyBlock.classList.toggle("hidden", narrow);
  if (!narrow) { placeC(caddyBlock, caddyX, caddyY, caddyW, caddyH, true); place(view, 8, 8, 792, 272); }
  printBox.classList.toggle("hidden", !printH);
  if (printH) { placeC(printBox, caddyX, caddyY + caddyH + printGap, caddyW, printH, true); printImg.style.width = px(384); printImg.style.height = px(print.h); }
  // the two cradle lamps beside the block, bottom-aligned at its left: a 12 lp dot and its label each; with no room for the labels, the dots alone
  lampsEl.classList.toggle("hidden", narrow);
  if (!narrow) { for (const d of [dotC, dotS]) { d.style.width = px(12); d.style.height = px(12); } lampsEl.classList.remove("bare"); let lw = lampsEl.offsetWidth, x = caddyX - 8 - lw;
    if (x < 4) { lampsEl.classList.add("bare"); lw = lampsEl.offsetWidth; x = caddyX - 8 - lw; } placeC(lampsEl, Math.max(4, x), caddyY + caddyH - lampsEl.offsetHeight, null, null, true); }
  // the ring round the device that has the keys: its shell and its tray
  const g = owner === "station" ? geom.station : geom.companion, top = owner === "station" ? g.y : g.y + seatPx;
  ring.classList.remove("hidden"); placeC(ring, g.x - 3 * f, top - 3 * f, g.w + 6 * f, g.y + g.h - top + 6 * f, true);
  spacer.style.top = Math.max(0, Math.ceil(h) - 1) + "px";
  const right = narrow ? (owner === "station" ? xS + sw : xC + cw) : Math.max(sleeping ? xC + cw + GAPV + STRIP_W : xS + sw, xC + cw, caddyX + caddyW);
  spacer.style.left = !TEST && right + 12 > cwid ? Math.ceil(right + 12) - 1 + "px" : "";   // a chosen z wider than the window: the page scrolls sideways to the right margin
  // the build stamp: page chrome in the page's bottom margin, under every block, right-aligned to the content (not under ?test)
  if (!TEST) placeC(stamp, 0, h - BOT + 2, right, 12, true);
  // the developer tools
  dev.classList.toggle("hidden", !devOpen); dev.classList.toggle("column", row);
  if (row) placeC(dev, CW - 332, 52, 320, CH - 64); else { const w = tier === "stack" ? 360 : Math.min(360, CW); placeC(dev, CW - w, 40, w, CH - 40); }
  // the Keys ? panel
  keysPanel.classList.toggle("hidden", !keysOpen); if (keysOpen) placeC(keysPanel, Math.max(0, Math.floor((CW - 640) / 2)), 48, Math.min(640, CW), Math.min(CH - 56, 760));
  window.__playRects = rects;
}
// ---- the phone (phone.mjs; owner 2026-11-09) ----
// One device at a time, always whole: z fits the viewport's width and the free height (a whole number when one fits, a smooth step below 1). The bar holds only the Station / Companion switch and Options (everything
// else is in the Options panel). Portrait: the device's shell spans the width, its key tray fills it below; landscape: the keys stand in a column each side of the screen. No scrolling, no Caddy, no cradle.
const TURN_KEY = "mb-play-turn-hint";
let turnState = (() => { try { return localStorage.getItem(TURN_KEY) ? "done" : "idle"; } catch { return "idle"; } })();   // the turn hint: idle, shown, done (once, never blocking)
function placeFrameC(el, xc, yc, w, h) {   // a frame inside its shell at CSS px, scaled by z / k0 from its top left
  const s = el.style, sc = k / k0;
  s.left = "0px"; s.top = "0px"; s.transform = "translate(" + S(xc) + "px," + S(yc) + "px)" + (sc !== 1 ? " scale(" + sc + ")" : ""); s.transformOrigin = sc !== 1 ? "0 0" : "";
  s.width = Math.ceil(Math.round(w * k0) / dpr * 64) / 64 + "px"; s.height = Math.ceil(Math.round(h * k0) / dpr * 64) / 64 + "px";
}
function layoutPhone() {
  const portrait = isPortrait(CW, CH), P = PHONE_PAD, bh = PHONE_BAR, d = owner, areaW = CW - 2 * P, areaH = areaHeight(portrait, CH), reserve = dockReserve(d, portrait);
  document.body.classList.add("phone"); bar.style.height = bh + "px"; stage.style.top = bh + "px"; stage.style.overflow = "clip";   // nothing scrolls, not even by a focus or a script
  // the bar: the two-button device switch at the left (44 tall), Options at the right
  const ow = 92, avail = CW - 2 * P - ow - 12, first = podHome ? ["station", "companion"] : ["companion", "station"];   // until the first pod is home: Companion | Station · asleep
  const w1 = podHome ? Math.min(132, Math.floor(avail / 2)) : Math.floor(avail * 0.4), w2 = podHome ? w1 : Math.min(160, avail - w1 - 2);
  placeC(tabs[first[0]], P, 4, w1, 44); placeC(tabs[first[1]], P + w1 + 2, 4, w2, 44);
  setTabWords();
  placeC(optionsBtn, CW - P - ow, 4, ow, 44); optionsBtn.classList.remove("corner"); optionsBtn.style.bottom = "";
  // the devices
  const hSh = 616 * f, geomOf = {};
  for (const dv of ["station", "companion"]) {
    const st = dv === "station", shell = st ? shS : shC, tray = trayEl[dv], fw = st ? 1024 : 450, shLp = st ? 1040 : 466;
    let sx, sy = P, sw, T, plan, box;
    if (portrait) {
      T = Math.max(0, Math.min(trayMax(dv), Math.floor(areaHeight(portrait, CH, dockReserve(dv, portrait)) - hSh))); sx = P; sw = areaW; plan = planPortrait(dv, areaW, T);
      box = { x: P, y: P + Math.ceil(hSh), w: areaW, h: T }; tray.classList.remove("side");
    } else {
      const sd = sides(dv, areaH), shW = shLp * f; sw = shW; sx = P + sd.LW + 8 + Math.max(0, Math.floor((areaW - sd.LW - sd.RW - 16 - shW) / 2)); plan = planLandscape(dv, areaW, areaH);
      box = { x: P, y: P, w: areaW, h: areaH - 1 }; tray.classList.add("side");   // a pixel short: a size rounds up to a whole device pixel
    }
    placeC(shell, sx, sy, sw, hSh, true); placeFrameC(frames[dv], (sw - fw * f) / 2, 8 * f, fw, 600);
    placeC(tray, box.x, box.y, box.w, box.h, true); tray.style.setProperty("--pk", plan.arm + "px"); placeC(hubEl[dv], plan.hub[0], plan.hub[1], plan.arm, plan.arm);
    for (const { def, el } of keyEls[dv]) { const [kx, ky, kw, kh] = plan.pos[def.id]; placeC(el, kx, ky, kw, kh); }
    geomOf[dv] = portrait ? { x: P, y: P, w: areaW, h: Math.ceil(hSh) + T } : { x: sx, y: P, w: sw, h: hSh };
    const on = d === dv; for (const el of [shell, tray]) { el.style.visibility = on ? "visible" : "hidden"; el.style.pointerEvents = on ? "" : "none"; }
    if (!portrait) tray.style.pointerEvents = "none";   // the landscape tray is the whole area: only its keys take a touch
  }
  geom.station = geomOf.station; geom.companion = geomOf.companion; geom.rows = { station: 1, companion: 1 };
  const g = geomOf[d]; geom.height = portrait ? P + g.h + P : CH - bh;
  for (const el of [ring, cradle, caddyBlock, lampsEl, printBox, dev, asleepStrip]) el.classList.add("hidden");
  // the Dock key: under the tray (portrait), or the right column's foot (landscape); on both devices, so a docked Companion can be lifted from the Station
  dockKey.classList.remove("hidden"); layoutDock();
  if (portrait) placeC(dockKey, P, P + g.h + DOCK_KEY_GAP, areaW, DOCK_KEY_H);
  else placeC(dockKey, P + areaW - 76, P + areaH - DOCK_KEY_H - 2, 72, DOCK_KEY_H);
  spacer.style.top = "0px"; spacer.style.left = "";
  // the build stamp: in the free strip under a portrait tray when there is one
  const free = CH - bh - (P + g.h + P) - reserve; stamp.classList.toggle("hidden", !portrait || free < 20); if (portrait && free >= 20) placeC(stamp, 0, CH - bh - 18, CW - P, 12, true);
  // the turn hint: once, a quiet line under the portrait Station when turning the phone gives a bigger one
  const want = portrait && d === "station" && biggerTurned(CW, CH, dpr);
  if (want && turnState === "idle") { turnState = "shown"; try { localStorage.setItem(TURN_KEY, "1"); } catch { /* no storage: shown again next visit */ } }
  else if (!want && turnState === "shown") turnState = "done";
  turnHint.classList.toggle("hidden", !(want && turnState === "shown")); if (want && turnState === "shown") placeC(turnHint, P, P + g.h + DOCK_KEY_GAP + DOCK_KEY_H + 8, areaW, 16);
  keysPanel.classList.toggle("hidden", !keysOpen); if (keysOpen) placeC(keysPanel, 0, 48, CW, Math.min(CH - 56, 760));
  window.__playRects = rects;
}
function dockTitle() {
  const c = caddy; return !c.canDock ? "The Companion has no world yet" : c.docked ? "Lift the Companion" : c.crates > 0 ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion";
}
// the size control: − / fit / +, the middle showing ×z (and "fit" while the fit is on)
function layoutSize(x) {
  placeC(zDown, x, 0, 40, 40); placeC(zFit, x + 44, 0, 64, 40); placeC(zUp, x + 112, 0, 40, 40);
  const fit = zSet == null; zFit.textContent = (fit ? "fit ×" : "×") + k; zFit.classList.toggle("on", fit); zFit.setAttribute("aria-pressed", String(fit));
  zFit.setAttribute("aria-label", "Fit to the window, now ×" + k); zFit.title = fit ? "Fitted to the window: ×" + k : "Fit to the window (now ×" + k + ")";
  zDown.setAttribute("aria-disabled", String(k <= 1)); zUp.setAttribute("aria-disabled", String(k >= Z_MAX));
}
function setZ(v) {   // v: a z, or null for fit; the choice is kept per browser, fit clears it
  zSet = v == null ? null : clampZ(v); saveZ(zSet); layout(); reveal(owner, true);
}
const zStep = (d) => { if (TEST) return; const n = clampZ(k + d); if (n !== k) setZ(n); };
// The Dock / Lift key (first-ten-front A2): quiet until the walk ends with a sealed crate, then lit; docked, it says how to go out. One press asks for the same dock or lift as Shift+D.
function layoutDock() {
  const c = caddy, d = c.docked, crates = !d && c.canDock && c.crates > 0, short = phone && !isPortrait(CW, CH);
  const mark = $("dockMark"), wordEl = $("dockWord"), hint = $("dockHint");
  mark.src = "../ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png";
  // [copy] placeholders: the scheme's section 7 item 4
  wordEl.textContent = d ? (short ? "Lift" : "Docked · Lift to go out") : crates ? (short ? "Dock" : "Dock the Companion") : (short ? "Dock" : "Dock · after the walk");
  hint.classList.toggle("hidden", short);
  dockKey.classList.toggle("docked", d); dockKey.classList.toggle("lit", crates); dockKey.classList.toggle("quiet", !d && !crates);
  dockKey.setAttribute("aria-disabled", String(!c.canDock));
  const label = d ? "Lift the Companion" : crates ? "Dock the Companion; cargo waits aboard" : "Dock the Companion", title = dockTitle();
  dockKey.setAttribute("aria-label", label); dockKey.title = title;
  if (!c.canDock) dockKey.setAttribute("aria-description", title); else dockKey.removeAttribute("aria-description");
  dockKey.classList.toggle("pressed", pressed || c.pending);
}
// The two device tabs: until a pod is home the Companion's comes first and the Station's says it sleeps ([copy] "Station · asleep").
function setTabWords() {
  tabs.station.textContent = podHome ? "Station" : "Station · asleep";
  for (const dv of ["station", "companion"]) { tabs[dv].classList.toggle("on", owner === dv); tabs[dv].setAttribute("aria-pressed", String(owner === dv)); }
}
function layoutTabs(w, wAsleep) {   // the bar's tabs on a laptop; returns where the last ends
  const first = podHome ? ["station", "companion"] : ["companion", "station"], wid = (dv) => (dv === "station" && !podHome ? wAsleep : w);
  let x = 12; for (const dv of first) { placeC(tabs[dv], x, 0, wid(dv), 40); x += wid(dv) + 8; }
  setTabWords(); return x - 8;
}
const rects = () => { const o = {}; for (const [n, el] of Object.entries({ station: frames.station, companion: frames.companion, shStation: shS, shCompanion: shC, trayStation: trayEl.station, trayCompanion: trayEl.companion, dock: dockKey, cradle, lamp, caddy: caddyBlock, print: printBox, lamps: lampsEl, dev, ring })) { const r = el.getBoundingClientRect(); o[n] = [r.left, r.top, r.width, r.height]; } return o; };

// ---- animation (the seat and the scroll: one curve, whole physical pixels) ----
const bez = (t) => { const [x1, y1, x2, y2] = EASE; let u = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t, d = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); if (Math.abs(d) < 1e-6) break; u -= x / d; } return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3; };
function tween(from, to, ms, set, done) {
  if (reduced() || ms <= 0 || from === to) { set(to); done && done(); return { cancel() {} }; }
  const t0 = performance.now(); let dead = false;
  const step = (now) => { if (dead) return; const t = Math.min(1, (now - t0) / ms); set(from + (to - from) * bez(t)); if (t < 1) requestAnimationFrame(step); else done && done(); };
  requestAnimationFrame(step); return { cancel() { dead = true; } };
}
// when a device takes the keys the page scrolls it fully into view, its tray included (160 ms eased, a cut under reduced motion); a device already wholly in view does not move the page
let scrollTween = null;
function reveal(d, cut) {
  const g = geom[d]; if (!g) return;
  const st = stage.scrollTop, ch = stage.clientHeight, top = g.y, bot = g.y + g.h; let t = st;
  if (bot - top + 2 * TOP > ch) t = bot - ch;   // the block and its margins do not fit: the tray's bottom meets the window's bottom, the block alone (the keys never leave the view)
  else if (top < st) t = top - TOP; else if (bot > st + ch) t = bot + TOP - ch;
  t = Math.max(0, Math.min(t, stage.scrollHeight - ch)); if (Math.abs(t - st) < 0.5) return;
  if (scrollTween) scrollTween.cancel();
  if (cut) { stage.scrollTop = Math.round(t); return; }   // the opening: a cut, no motion
  scrollTween = tween(st, t, SEAT_MS, (v) => { stage.scrollTop = Math.round(v); }, () => { scrollTween = null; });
}

// ---- who has the keys ----
function giveKeys(d) { const fr = frames[d]; try { fr.focus(); fr.contentWindow && fr.contentWindow.focus(); } catch { /* not loaded yet */ } }
function setOwner(d, opts = {}) {
  const focus = opts.focus !== false, changed = d !== owner;
  if (!changed && !opts.force) { if (opts.reveal) reveal(d); if (focus) giveKeys(d); return; }
  owner = d; layout(); if (changed || opts.reveal) reveal(d); if (focus) giveKeys(d);
}
const order = ["station", "companion"];
const cycle = (dir) => setOwner(order[(order.indexOf(owner) + dir + order.length) % order.length], { reveal: true });

// the page's keys, caught in the capture phase of each frame's window and of the shell's own, before any device hears them
function pageKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const t = e.target, tag = t && t.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable) || (t && t.closest && t.closest("[data-options]"))) return;   // typing, or inside the Options panel (it takes its own keys)
  let hit = true;
  if (e.code === "Backquote") cycle(e.shiftKey ? -1 : 1);
  else if (e.shiftKey && e.code === "KeyD") dockPress();
  else if (e.shiftKey && e.code === "KeyT") toggleDev();
  else if (e.shiftKey && e.code === "Slash") toggleKeys();
  else if (e.code === "Escape" && keysOpen) toggleKeys(false);
  else if (!TEST && !e.shiftKey && (e.code === "Minus" || e.code === "NumpadSubtract")) zStep(-1);
  else if (!TEST && (e.code === "Equal" || e.code === "NumpadAdd")) zStep(1);   // = or + (Shift+=)
  else hit = false;
  if (hit) { e.preventDefault(); e.stopImmediatePropagation(); }
}
function attach(d) { try { const w = frames[d].contentWindow; w.addEventListener("keydown", pageKey, true); w.addEventListener("pointerdown", () => { if (owner !== d) setOwner(d, { focus: false }); }, true); } catch { /* cross-origin never happens here */ } }   // a click inside a frame gives that device the keys (the browser has already moved focus)
window.addEventListener("keydown", pageKey, true);
window.addEventListener("blur", () => setTimeout(() => { const a = document.activeElement; for (const d of ["station", "companion"]) if (a === frames[d] && owner !== d) setOwner(d, { focus: false }); }, 0));
shS.addEventListener("pointerdown", () => setOwner("station", { reveal: true }));
shC.addEventListener("pointerdown", () => setOwner("companion", { reveal: true }));
tabs.station.addEventListener("click", () => setOwner("station", { reveal: true })); tabs.companion.addEventListener("click", () => setOwner("companion", { reveal: true }));
function toggleDev(on = !devOpen) { devOpen = on; layout(); try { frames.station.contentWindow.postMessage({ t: "mb-dev", on: devOpen }, location.origin); } catch { /* not loaded */ } if (document.activeElement && document.activeElement.closest && document.activeElement.closest("#bar")) giveKeys(owner); }
devBtn.addEventListener("click", () => { toggleDev(); giveKeys(owner); });
function toggleKeys(on = !keysOpen) { keysOpen = on; layout(); }
keysBtn.addEventListener("click", () => toggleKeys());
const barGiveBack = (b) => { if (document.activeElement === b) b.blur(); giveKeys(owner); };
zDown.addEventListener("click", () => { zStep(-1); barGiveBack(zDown); }); zUp.addEventListener("click", () => { zStep(1); barGiveBack(zUp); }); zFit.addEventListener("click", () => { setZ(null); barGiveBack(zFit); });

// ---- the Dock control, the cradle and the seat ----
// The Dock control and Shift+D stand in for the Companion cradle's hall sensor: a press asks the Caddy service to seat or lift the cradle (POST /dock/seat) and the keys
// hand over on its answer. The Companion frame answers a seat with its word for that seat's number (who it is, its world, the crates aboard): the stand-in for its hold.
// Once that word is in, the page hands the dock to the Station (`mb-dock` with `want` and the Companion), which runs it on the shared save as before. The Caddy's face is
// drawn from the service's state (its stream) and the two frames' words. With no service to answer, the page senses the cradle itself and the dock works as before.
const API = "/caddy-api/v1", TZ = -new Date().getTimezoneOffset();
const live = $("live"); const say = (t) => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
const sw = { silent: false, quiet: false, fault: false };   // the developer drawer's three problems
const now = () => Date.now();
const sensed = { companion: { state: "lifted", seats: 0, seq: 0, at: now() }, station: { state: "lifted", seats: 0, seq: 0, at: now() } };   // the cradles as this page senses them
const svc = { up: null, snap: null, es: null, esWorld: null, retry: 0, timer: 0, heardAt: 0, stationWorld: null };   // up: null until the service answers or fails once
let handedPub = null;   // the Companion's public key as last handed to the Station in `mb-dock`
let homeHeard = false;   // the Station has spoken once on this page
let comp = null, hold = null, heard = null, heardAt = 0, fault = false, inflight = 0, pressOwner = null, lastSeen = null, beat = false;
const cradles = () => (svc.up && svc.snap && !fault ? svc.snap.cradles : sensed);
const seatedNow = () => cradles().companion.state === "seated";
const activeHere = () => !!heard && !!comp && !!heard.companion && heard.companion.id === comp.id;   // the Companion in the frame is the one the Station shows
function derive() {
  const crates = comp && !activeHere() ? comp.crates | 0 : heard ? heard.crates | 0 : 0;
  return { canDock: !!(comp && comp.wid) || !!(heard && heard.canDock), docked: seatedNow(), crates, pending: !!(heard && heard.pending), opened: heard?.opened ?? null, partner: heard?.partner ?? null };
}
function setSeat(target, animate, done) { if (!animate) { seatOff = target; layout(); done && done(); return; } seatBusy = true; tween(seatOff, target, SEAT_MS, (v) => { seatOff = Math.round(v * 1) / 1; layout(); }, () => { seatOff = target; seatBusy = false; layout(); done && done(); }); }
function dockPress() {
  if (!caddy.canDock || seatBusy || pressed) return;
  pressOwner = owner; pressed = true; layout();
  if (caddy.docked) { seatCradle(false); return; }   // Lift: ask at once
  setSeat(8, true, () => seatCradle(true));   // Dock: seat first, then ask at the seat's end
}
function sense(want, at) { const c = sensed.companion; if ((c.state === "seated") !== want) { c.state = want ? "seated" : "lifted"; c.at = at; c.seq++; if (want) c.seats++; } }
async function seatCradle(want) {
  const at = now(), world = (comp && comp.wid) || (heard && heard.world);
  if (sw.fault) { fault = true; sense(want, at); pressed = false; cradleChanged(want); return; }   // the Caddy fault: the write is refused, nothing is taken, the marks as sensed
  let ok = false;
  try {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 1000);   // a page never sits pressed for more than a second with no answer
    const r = await fetch(API + "/dock/seat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ world, cradle: "companion", seated: want, companion: comp ? { id: comp.id, name: comp.name } : undefined }), signal: ac.signal });
    clearTimeout(t); const body = await r.json().catch(() => null);
    if (r.status === 503 && body && body.fault) { svc.up = true; fault = true; sense(want, at); ok = true; }
    else if (r.ok && body && body.snapshot) { svc.up = true; fault = false; takeSnap(body.snapshot); connect(world); ok = true; }
  } catch { /* no service */ }
  if (!ok) { svc.up = false; fault = false; sense(want, at); }   // nobody answered: the page senses the cradle itself
  pressed = false; cradleChanged(want);
}
function takeSnap(s) { svc.snap = s; for (const k of ["companion", "station"]) sensed[k] = { ...s.cradles[k] }; }
// The cradle changed (an answer, a stream event, the first state): the seat, the keys, the Companion asked for its word, the Station brought in line, the face.
// `mine` is the state this page's press asked for (true seated, false lifted), given with the service's answer; the contact beat comes with it.
function cradleChanged(mine) {
  const c = cradles().companion, first = lastSeen === null, edge = first || c.state !== lastSeen.state || c.seats !== lastSeen.seats, seated = c.state === "seated";
  if (edge) {
    hold = hold && hold.seat === c.seats ? hold : null;
    if (seated) askCompanion(c.seats); else liftCompanion();
    if (!first) beat = true;
    if (mine === undefined && !pressed && !seatBusy) seatOff = seated ? 8 : 0;   // an external change: cut, nothing animates and the keys do not move
  }
  if (mine !== undefined) {
    if (seated === mine && mine) { const brings = podHome || derive().crates > 0; setOwner(brings ? "station" : "companion"); say("Companion docked"); seatOff = 8; }   // the first dock that brings a pod turns the page to the Station; an empty one stays on the Companion   // contact: the lamp, the control and the keys cut together
    else if (seated === mine) { setOwner("companion"); say("Companion lifted"); setSeat(0, true); }
    else if (!seatBusy) setSeat(seated ? 8 : 0, true);   // the seat did not take: back as it is
  }
  lastSeen = { state: c.state, seats: c.seats };
  caddy = derive(); reconcile(); layout(); faceTick();
}
// The cradle is empty: the Companion is told, so it answers no more sleep requests (an unsigned lock lets go; a committed sleep it finishes on its own).
function liftCompanion() { try { frames.companion.contentWindow.postMessage({ t: "mb-lift" }, location.origin); } catch { /* reloading: it boots lifted */ } }
// The Station's sleep requests reach the Companion only while it is seated, and the Companion's answers go back to the Station (a signature is asked for only at the dock).
// The page passes the words on and reads none of them; a lifted or faulted cradle answers the Station itself, so a request never waits on a Companion that is not there.
function relaySleep(m) {
  const toStation = (a) => { try { frames.station.contentWindow.postMessage({ t: "mb-sleep-ack", nonce: m.nonce, op: m.op, ...a }, location.origin); } catch { /* reloading */ } };
  if (!["lock", "sign", "clear", "unlock"].includes(m.op)) { toStation({ ok: false, why: "bad request" }); return; }
  if (!seatedNow() || fault || sw.silent) { toStation({ ok: false, why: sw.silent ? "silent" : "lifted" }); return; }
  const { t, nonce, op, ...rest } = m;
  try { frames.companion.contentWindow.postMessage({ t: "mb-sleep", nonce, op, ...rest }, location.origin); } catch { toStation({ ok: false, why: "lifted" }); }
}
function askCompanion(seat) { try { frames.companion.contentWindow.postMessage({ t: "mb-seat", seat }, location.origin); } catch { /* reloading: it answers when it tells the page who it is */ } }
// The Station follows the cradle: docked while the Companion is seated, no fault, and its word for this seat is in; never while the Station is quiet.
function reconcile() {
  if (sw.quiet || !heard || svc.up === null || inflight > now() || heard.pending) return;
  const c = cradles().companion, want = c.state === "seated" && !fault && !!hold && hold.seat === c.seats;
  const pubStale = want && !!comp && !!comp.pub && comp.pub !== handedPub;   // the Companion's key came after the dock: the Station is told again
  if (want === !!heard.docked && (!want || activeHere()) && !pubStale) return;
  inflight = now() + 1500; handedPub = comp && comp.pub ? comp.pub : null;
  try { frames.station.contentWindow.postMessage({ t: "mb-dock", want, keysElsewhere: (pressOwner ?? owner) !== "station", companion: comp ? { id: comp.id, name: comp.name, pub: comp.pub || null } : null }, location.origin); } catch { inflight = 0; }
}
dockKey.addEventListener("click", () => { dockPress(); giveKeysBack(); });
cradle.addEventListener("click", () => dockPress());
const giveKeysBack = () => { if (document.activeElement === dockKey) dockKey.blur(); };
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin) return; const m = e.data || {};
  if (e.source === frames.companion.contentWindow && m.t === "mb-companion") {   // the Companion's word: who it is, its world, its crates, the seat it answers
    comp = m; const c = cradles().companion;
    if (c.state === "seated" && m.seat === c.seats) { if (!hold || hold.seat !== m.seat) hold = { seat: m.seat, crates: activeHere() ? heard.crates | 0 : m.crates | 0, left: m.crates | 0 }; else hold.left = m.crates | 0; }
    if (lastSeen && lastSeen.state === "seated" && m.seat !== c.seats) askCompanion(c.seats);   // a frame that reloaded while seated is asked again
    caddy = derive(); reconcile(); layout(); faceTick(); return;
  }
  if (e.source === frames.companion.contentWindow && m.t === "mb-sleep-ack") {   // the Companion's answer to a sleep request, on to the Station
    try { frames.station.contentWindow.postMessage({ t: "mb-sleep-ack", nonce: m.nonce, op: m.op, ok: m.ok === true, why: m.why, sig: m.sig, parts: m.parts, wid: m.wid }, location.origin); } catch { /* reloading */ }
    return;
  }
  if (e.source === frames.station.contentWindow && m.t === "mb-sleep") { relaySleep(m); return; }
  if (e.source !== frames.station.contentWindow || m.t !== "mb-caddy") return;
  if (sw.quiet) return;   // the Station quiet: its link is down, the page hears nothing from it
  heard = m; heardAt = now(); inflight = 0;
  try { frames.companion.contentWindow.postMessage({ t: "mb-caddy", podHome: m.podHome, goal: m.goal }, location.origin); } catch { /* reloading */ }   // the Companion hears the Station's pod-home and goal too
  if (NEWBIE && typeof m.podHome === "boolean" && m.podHome !== podHome) {   // the Station's word on "first pod home" (its save): the page wakes the Station, or lets it sleep again
    const known = podHome; podHome = m.podHome; saveHome(podHome);
    if (podHome && owner === "companion" && (!known && (!homeHeard || seatedNow()))) setOwner("station", { focus: false }); else layout();
  }
  homeHeard = true;
  if (m.world && m.world !== svc.stationWorld) { svc.stationWorld = m.world; seatStation(m.world); if (!seatedNow()) connect(m.world); }
  if (svc.up === false && lastSeen === null) { sensed.companion.state = m.docked ? "seated" : "lifted"; if (m.docked) sensed.companion.seats = 1; cradleChanged(); return; }   // no service: the cradle as the Station last saw it
  caddy = derive(); reconcile(); layout(); faceTick();
});
// The Station sits in its own cradle: seated once per world (a state, so a repeat changes nothing).
function seatStation(world) {
  sensed.station = { ...sensed.station, state: "seated" };
  fetch(API + "/dock/seat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ world, cradle: "station", seated: true }) }).then((r) => r.json()).then((b) => { if (b && b.snapshot && svc.snap && b.snapshot.world === svc.snap.world) takeSnap(b.snapshot); }).catch(() => {});
}
// The stream of the dock's events for one world: the snapshot first, then dock and face events and a heartbeat; on a drop it reconnects at 1, 2, 4, 8, 16 s, then every 30 s.
function connect(world) {
  if (!world || (svc.es && svc.esWorld === world) || typeof EventSource === "undefined") return;
  if (svc.es) svc.es.close(); clearTimeout(svc.timer);
  svc.esWorld = world; if (svc.snap && svc.snap.world !== world) svc.snap = null;
  const es = new EventSource(API + "/dock/events?world=" + encodeURIComponent(world)); svc.es = es;
  es.addEventListener("snapshot", (e) => { svc.up = true; svc.retry = 0; svc.heardAt = now(); takeSnap(JSON.parse(e.data)); cradleChanged(); });
  es.addEventListener("dock", (e) => { const d = JSON.parse(e.data); if (!svc.snap) return; svc.snap.cradles[d.cradle] = { state: d.state, seats: d.seats, seq: d.cradleSeq, at: d.at }; svc.snap.seq = d.seq; takeSnap(svc.snap); cradleChanged(); });
  es.addEventListener("face", (e) => { if (svc.snap) svc.snap.face = JSON.parse(e.data); faceTick(); });
  es.addEventListener("heartbeat", () => { svc.heardAt = now(); });
  es.onerror = () => {
    es.close(); if (svc.es !== es) return; svc.es = null;
    if (svc.up === null) { svc.up = false; if (heard && lastSeen === null) { sensed.companion.state = heard.docked ? "seated" : "lifted"; if (heard.docked) sensed.companion.seats = 1; } cradleChanged(); }
    const d = [1, 2, 4, 8, 16][svc.retry] ?? 30; svc.retry++;
    svc.timer = setTimeout(() => { const w = svc.esWorld; svc.esWorld = null; connect(w); }, d * 1000);
  };
}
// The second Companion (the owner's: the Companion is the player's identity): the frame holds Companion A or B; the Station and the Caddy keep the last docked player's
// world until another Companion docks. Lift first: a Companion in its cradle is not swapped.
const companionCtl = $("companionCtl");
const companionSrc = () => "../exploration/?embed" + (cslot === "A" && SEED != null ? "&seed=" + encodeURIComponent(SEED) : "");
function switchCompanion() {
  if (seatedNow() || pressed) return;
  cslot = cslot === "A" ? "B" : "A"; writeOptions({ companion: cslot }); comp = null; hold = null; frames.companion.src = companionSrc(); caddy = derive(); layout();
}
companionCtl.addEventListener("click", () => { switchCompanion(); if (document.activeElement === companionCtl) companionCtl.blur(); giveKeys(owner); });
function layoutCompanionCtl(narrow, x) {
  placeC(companionCtl, x, 0, narrow ? 72 : 148, 40);
  const other = cslot === "A" ? "B" : "A", off = seatedNow();
  companionCtl.innerHTML = (narrow ? "" : "Companion ") + '<b>' + cslot + '</b> / ' + other;
  companionCtl.setAttribute("aria-label", "Companion " + cslot + "; switch to Companion " + other); companionCtl.setAttribute("aria-disabled", String(off));
  companionCtl.title = off ? "Lift the Companion first" : "Switch to Companion " + other;
  return x;
}
// The drawer's three problems: "Companion silent" (the Companion frame holds back its word), "Station quiet" (the page stops hearing the Station and the Station hears
// nothing of the dock), "Caddy fault" (the service refuses writes).
function setSwitch(name, on) {
  sw[name] = !!on; const box = $("sw-" + name); if (box) box.checked = !!on;
  if (name === "silent") { try { frames.companion.contentWindow.postMessage({ t: "mb-silent", on: !!on }, location.origin); } catch { /* reloading */ } }
  if (name === "quiet" && !on) { inflight = 0; reconcile(); }
  faceTick();
}
for (const n of ["silent", "quiet", "fault"]) { const box = $("sw-" + n); if (box) box.addEventListener("change", () => setSwitch(n, box.checked)); }

// ---- the Caddy's screen: always shown, in its own 808 × 288 lp block (the 792 × 272 view and an 8 lp bezel) ----
// Under the cradle in Stack, under the Station in Row. It draws the face (caddy/face.mjs) of the service's state with the panel's timing: a partial appears 0.8 s after its
// change over the regions that changed; a full refresh blacks the panel, whitens it, then draws, over 4 s. The narrow tier has no room for it: the bar's note shows lines 1
// and 2 as one for 4000 ms at each seat, lift and the opening's end instead. The two cradle lamps sit beside it as 12 lp dots; the cradle under the key tray carries the
// Companion's lamp too.
const NOTE_MS = 4000, NOTE_TEXT = note.textContent, PARTIAL_MS = 800, FULL_MS = 4000;
// The first picture waits for the Station's word and its seat; with no word it is drawn at 15 s anyway. ?test&firstms=N moves that fallback (test pages only), so a journey on a loaded machine
// can wait for the real condition instead of a page that took longer than 15 s to boot drawing a stand-in first.
const FIRST_MS = (() => { const q = new URLSearchParams(location.search), n = Number(q.get("firstms")); return q.has("test") && n > 0 ? n : 15000; })();
const caddyBlock = $("caddySheet"), view = $("caddyView"), spacer = $("spacer"), lampsEl = $("caddyLamps"), dotC = $("lampCompanion"), dotS = $("lampStation");
const vctx = view.getContext("2d", { willReadFrequently: true }); view.width = 792; view.height = 272;
const bootAt = now(), sched = createScheduler({ tz: TZ }), drawnLog = [];
let noteCaddy = "", noteTimer = 0, faceNow = null, drawn = null, lastFaceId = null, faceStarted = false, lampOf = { c: "off", since: 0 };
const imageOf = (face) => { const px = rasterFace(face), img = vctx.createImageData(792, 272); for (let i = 0; i < px.length; i++) { const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = px[i]; img.data[o + 3] = 255; } return img; };
const blank = (v) => { vctx.fillStyle = `rgb(${v},${v},${v})`; vctx.fillRect(0, 0, 792, 272); };
function panelOp(o) {
  if (o.kind === "partial") setTimeout(() => { const img = imageOf(o.face); for (const r of o.regions) { const [x, y, w, h] = REGIONS[r]; vctx.putImageData(img, 0, 0, x, y, w, h); } drawn = o.face; drawnLog.push({ kind: "partial", id: o.face.id, regions: o.regions, at: now() }); }, PARTIAL_MS);
  else { blank(0); setTimeout(() => blank(255), FULL_MS / 3); setTimeout(() => { vctx.putImageData(imageOf(o.face), 0, 0); drawn = o.face; drawnLog.push({ kind: "full", id: o.face.id, why: o.why, at: now() }); }, (2 * FULL_MS) / 3); }
}
function faceInput(t) {
  const who = (svc.up && svc.snap && svc.snap.face && svc.snap.face.who) || (seatedNow() && comp ? { name: comp.name } : null) || (heard && heard.companion ? { name: heard.companion.name } : null);
  return { now: t, tz: TZ, bootAt, cradles: cradles(), who, hold, fault,
    station: heard ? { at: heardAt, partner: heard.partner ?? null, along: heard.along ?? null, opened: heard.opened ?? null, crates: heard.crates | 0, ledger: heard.ledger ?? null } : null };
}
function faceTick() {
  const t = now(), f = faceOf(faceInput(t)); faceNow = f;
  lamps(f, t);
  if (!faceStarted) { const ready = !!heard && (svc.up === false || (!!svc.snap && svc.snap.cradles.station.state === "seated")); if (!ready && t - bootAt < FIRST_MS) return; faceStarted = true; }   // the first picture once the Station has spoken and sits in its cradle (or, with no word, at 15 s)
  for (const o of [sched.push(f, t, { beat }), sched.tick(t)]) if (o) panelOp(o);
  beat = false;
  if (!f.keep && f.id !== lastFaceId) { if (lastFaceId !== null && ["C0", "C2", "C3"].includes(f.id)) caddyEvent(f); lastFaceId = f.id; }
}
setInterval(faceTick, 200);
const LAMP_RGB = { mint: "#adf6e0", amber: "#ffa83f", warm: "#f1ebdf" }, LAMP_SRC = { stone: "../ui/assets/masters/pods/frame-lamp-8-stone.png", mint: "../ui/assets/masters/pods/frame-lamp-8-mint.png", amber: null };
{ const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 8; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, 8, 8);   // the 8 px amber lamp: the mint master's light in amber
    for (let i = 0; i < 256; i += 4) { const k = Math.max(d.data[i], d.data[i + 1], d.data[i + 2]) / 255; d.data[i] = Math.round(0xff * k); d.data[i + 1] = Math.round(0xa8 * k); d.data[i + 2] = Math.round(0x3f * k); } x.putImageData(d, 0, 0); LAMP_SRC.amber = c.toDataURL(); }; im.src = LAMP_SRC.mint; }
function lamps(f, t) {
  if (f.lamp.companion !== lampOf.c) lampOf = { c: f.lamp.companion, since: t };
  const L = lampAt(lampOf.c, t - lampOf.since), src = L.colour === "amber" ? LAMP_SRC.amber || LAMP_SRC.mint : L.colour ? LAMP_SRC.mint : LAMP_SRC.stone;
  if (lamp.getAttribute("src") !== src) lamp.src = src;
  const rel = L.colour ? L.level / LAMPS.seated.level : 1;   // seated is the master as drawn; the breath dims it, the swell brightens it
  lamp.style.opacity = rel < 1 ? String(rel.toFixed(3)) : ""; lamp.style.filter = rel > 1 ? `brightness(${rel.toFixed(3)})` : "";
  const dot = (el, l) => { el.style.background = l.colour ? LAMP_RGB[l.colour] : "transparent"; el.style.opacity = l.colour ? String((0.4 + 0.6 * Math.min(1, l.level)).toFixed(3)) : "1"; el.dataset.lamp = l.colour || "off"; };
  dot(dotC, L); dot(dotS, lampAt(f.lamp.station, 0, STATION_LAMPS));
  dotC.parentElement.title = "Companion cradle: " + lampOf.c; dotS.parentElement.title = "Station cradle: " + f.lamp.station;
}
function caddyEvent(f) {
  if (tier !== "narrow") return;
  noteCaddy = "Dock: " + f.lines.l1 + (f.lines.l2 ? " · " + f.lines.l2 : ""); clearTimeout(noteTimer); noteTimer = setTimeout(() => { noteCaddy = ""; layout(); }, NOTE_MS); layout();
}

// ---- the Caddy's recovery print (sandbox) ----
// At its first start the Caddy queues one print of its recovery key (GET /print/pending, the print as a 384-dot picture, its id in x-print). The strip under the Caddy's block shows it as the printer
// set it, once, with an "I have it" button; it tells the Caddy (POST /print/taken with the id) and the strip goes for good. The page looks at start and every 10 s, so a Caddy restarted before it is pressed shows
// its new print (the id is the Caddy's, and a press for an old print is refused). The strip is page chrome: nothing of the key is kept in the page but the picture.
const printBox = $("caddyPrint"), printImg = $("printImg"), printTaken = $("printTaken"), printStatus = $("printStatus");
const print = { id: null, url: null, h: 0, busy: false, note: "" };
function printClear() { if (print.url) URL.revokeObjectURL(print.url); print.id = null; print.url = null; print.h = 0; printImg.removeAttribute("src"); printStatus.textContent = ""; layout(); }
async function printLook() {
  if (print.busy) return;
  try {
    const r = await fetch(API + "/print/pending", { cache: "no-store" });
    if (r.status === 404) { if (print.id) printClear(); return; }
    if (r.status !== 200) return;
    const id = r.headers.get("x-print"); if (!id || id === print.id) return;
    const url = URL.createObjectURL(await r.blob());
    printImg.onload = () => { if (print.url) URL.revokeObjectURL(print.url); print.id = id; print.url = url; print.h = printImg.naturalHeight; printStatus.textContent = print.note; print.note = ""; layout(); };
    printImg.src = url;
  } catch { /* no service, or no print: the strip stays as it is */ }
}
async function printDone() {
  if (!print.id || print.busy) return;
  print.busy = true; printTaken.setAttribute("aria-disabled", "true"); printStatus.textContent = "";
  try {
    const r = await fetch(API + "/print/taken", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ print: print.id }) });
    if (r.ok) { print.busy = false; printClear(); say("Recovery key taken"); }
    else { print.busy = false; if (r.status === 409) { print.note = "The dock printed a new key. Keep this one instead."; print.id = null; layout(); await printLook(); } else printStatus.textContent = "The dock could not save that. Try again."; }
  } catch { printStatus.textContent = "The dock did not answer. Try again."; }
  print.busy = false; printTaken.removeAttribute("aria-disabled");
}
printTaken.addEventListener("click", () => { printDone(); if (document.activeElement === printTaken) printTaken.blur(); giveKeys(owner); });
printLook(); setInterval(printLook, 10000);

// ---- the Options panel (owner 2026-11-08): every option a person can set, in one visible place; the settings are one stored value (options.mjs) that both devices read themselves ----
// The panel is play/options (React + Radix, built to ../vendor/options.js). Developer tools applies at once; the rest apply when the panel closes (the page reloads), and Start fresh erases this browser's save at the NEXT load,
// before any frame is set (a frame still open would write its save back as it unloaded). The Companions' identities stay; the worlds go.
const optionsBtn = $("optionsBtn"), FRESH_KEY = "mb-play-fresh", PLACES = [["HollowTree", "Hollow Tree"], ["Reedpool", "Reedpool"], ["SplitStone", "Split Stone"], ["Test_AllCases", "Test, all cases"], ["Windstep", "Windstep"]];   // [id, the place's name]
try { if (sessionStorage.getItem(FRESH_KEY)) { sessionStorage.removeItem(FRESH_KEY); for (const key of Object.keys(localStorage)) if (key.startsWith("mb-save-v8") || key.startsWith("mb-exploration-v") || key === "mb-station-dev") localStorage.removeItem(key); } } catch { /* no storage: nothing to erase */ }
function applyDev(on) { devBtn.classList.toggle("hidden", !on); for (const id of ["helpDevK", "helpDevD"]) $(id).classList.toggle("hidden", !on); if (!on && devOpen) toggleDev(false); }
mountOptions($("optionsRoot"), {
  trigger: optionsBtn, read: readOptions, names: Object.keys(NAME_LISTS), places: PLACES,
  onChange: (patch) => { writeOptions(patch); if ("dev" in patch) applyDev(patch.dev); },
  onClose: (changed) => { if (changed) location.reload(); giveKeys(owner); },
  onStartFresh: () => { saveHome(false); try { sessionStorage.setItem(FRESH_KEY, "1"); } catch { return; } location.reload(); },
});
function layoutOptions(narrow, rightEdge, x) {   // in the bar after the Companion control when it fits before Keys ?; else the window's bottom-left corner
  const w = 88, fits = x + w + 8 <= rightEdge, s = optionsBtn.style;
  optionsBtn.classList.toggle("corner", !fits);
  if (fits) { placeC(optionsBtn, x, 0, w, 40); s.bottom = ""; } else { s.left = "8px"; s.top = "auto"; s.bottom = "8px"; s.width = w + "px"; s.height = "28px"; }
}
// ---- boot ----
buildKeys();
for (const d of ["station", "companion"]) frames[d].addEventListener("load", () => { attach(d); if (d === "station") { if (devOpen) toggleDev(true); if (!gotLoadOwner) { gotLoadOwner = true; setOwner(START_OWNER); } } });
let gotLoadOwner = false;
frames.station.src = stationUrl; frames.companion.src = companionUrl;
if (DEV) { applyDev(true); devOpen = true; }   // the Developer tools option shows the button and its help row, and opens the tools at load
if (!TEST) for (const id of ["zDown", "zFit", "zUp", "stamp", "helpZK", "helpZD"]) $(id).classList.remove("hidden");   // the size control, its keys and the build stamp: everywhere but ?test, which keeps today's page
let dprQuery = null;
function armDpr() { if (dprQuery) dprQuery.removeEventListener("change", onDpr); dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); dprQuery.addEventListener("change", onDpr); }
function onDpr() { layout(); armDpr(); }
armDpr(); window.addEventListener("resize", layout);
// the build stamp from the site's build.json: "build <short> · YYYY-MM-DD HH:MM Mexico City"; "build local" with no build.json
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => { stamp.textContent = stampText(j); }).catch(() => { stamp.textContent = "build local"; });
layout(); reveal(owner, true);   // the page opens revealed for the device with the keys (the Station on a fresh load); no scroll position is restored
// for the play-page journey: read-only views of the shell's state
window.__play = { get phone() { return phone; }, get geom() { return JSON.parse(JSON.stringify(geom)); }, get scroll() { return [stage.scrollTop, stage.clientHeight, stage.scrollHeight]; }, get owner() { return owner; }, get tier() { return tier; }, get z() { return k; }, get fit() { return zSet == null; }, get caddy() { return { ...caddy }; }, get seatOff() { return seatOff; }, get pressed() { return pressed; },
  get caddySheet() { return { up: tier !== "narrow", id: drawn ? drawn.id : null, lines: drawn ? { ...drawn.lines } : null, crates: drawn ? drawn.crates : 0, ledger: drawn ? drawn.ledger : null, marks: drawn ? { ...drawn.marks } : null, next: faceNow ? faceNow.id : null, counts: sched.counts, log: drawnLog.slice(), ops: sched.state.log.map((o) => ({ kind: o.kind, id: o.id, at: o.at, regions: o.regions })), busy: now() < sched.state.busyUntil, note: noteCaddy,
    lamp: { companion: lampOf.c, station: faceNow ? faceNow.lamp.station : "off", dot: dotC.dataset.lamp, stationDot: dotS.dataset.lamp }, pixels: () => Array.from(vctx.getImageData(0, 0, 792, 272).data.filter((_, i) => i % 4 === 0)) }; },
  get dock() { return { up: svc.up, world: svc.esWorld, snap: svc.snap, sensed: JSON.parse(JSON.stringify(sensed)), hold, comp, fault, heardAt, slot: cslot }; }, setSwitch, switchCompanion, rects, frames };
