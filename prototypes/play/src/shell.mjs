// The play page's shell (technical-architecture.md W1; the architect's spec): the Station and the Companion as same-origin frames side by side, the page's own keys, the Dock control, the cradle and the
// seat. The shell draws only page chrome. It never reads or writes the save (the devices cross it by the storage event, as between two tabs) and it imports nothing from station/, exploration/ or
// species/: the Dock control asks the Caddy service to seat or lift the cradle, the Station is handed the dock by postMessage (`mb-dock`), and the Caddy's face is drawn from the
// service's state and the two frames' words (`mb-caddy` from the Station, `mb-companion` from the Companion) by caddy/face.mjs.
//
// Lengths are in lp: one lp is `f` CSS px, so every edge lands on a whole physical pixel. Colours are the Station's 14.

import { faceOf, rasterFace, createScheduler, lampAt, LAMPS, STATION_LAMPS, REGIONS } from "../../caddy/face.mjs";   // the Caddy's face, shared with the service's tests and renders
import { baseK, clampZ, Z_MAX } from "./fit.mjs";   // the size control's bounds: z device px per lp
import { plan as layoutPlan, barPlan, panFor, dockSheet, zCap, form as formOf, BAR } from "./layout.mjs";   // the page's layout: one device in view, its panel centred (pure; tests/layout.test.mjs)
import { padDir, dockWords, KEYBOARD } from "./keyplan.mjs";   // the key trays' geometry: one measure, one family at every size
import { stampText, aboutText } from "./stamp.mjs";   // the build stamp's line, in Mexico City time
import { readOptions, writeOptions, OPTIONS_KEY } from "./options.mjs";
import { NAME_LISTS } from "./names.mjs";   // the Options panel's settings
import { mountOptions, mountKeyTray, mountDockKey, mountSwitch, mountDockScreen, T } from "../vendor/options.js";   // the Options panel, the play note, the key trays, the Dock key, the device switch and the dock's screen: React + Radix, built from play/options (npm run build there)
import { createStall } from "./stall.mjs";   // the Station's silence is counted only while this page was awake (a world being made stalls every frame's timers)
import { sourceOf } from "./notes.mjs";   // the note's source: the stored setting noteFrom, "owner" by default

const params = new URLSearchParams(location.search), TEST = params.has("test"), SEED = params.get("seed");   // test-harness flags only: every option a person sets is in the Options panel (play/src/options.mjs)
// The play page is the playtest build: Playtest waits is ON until a person sets the options themselves (the stored options are written once, before any frame reads them). Test pages keep the options as they are.
try { if (!TEST && localStorage.getItem(OPTIONS_KEY) == null) writeOptions({ playtest: true }); } catch { /* no storage: the options stay the defaults */ }
const OPT = readOptions(), DEV = OPT.dev;   // the options are one stored setting both devices read themselves (no URL carries them); its block is "the Options panel" below the keys
let cslot = OPT.companion === "B" ? "B" : "A";   // the Companion in the frame: A, or the second Companion B
const $ = (id) => document.getElementById(id);

// ---- the pixel rule ----
// The faces keep the pixel rule: one lp is f = k / devicePixelRatio CSS px; k is device px per lp (a whole number wherever one fits, a smooth step on a phone: src/layout.mjs), nearest-neighbour. The page chrome (keys, bar, panels, gaps)
// is in CSS px, snapped to whole physical pixels. k0 is the faces' own scale (each device draws its screen at max(1, floor(dpr)) device px per CSS px); the shell scales a frame by k / k0 as a whole, so a face pixel stays a k × k block.
const Z_KEY = "mb-play-z";
const loadZ = () => { try { const v = localStorage.getItem(Z_KEY); return v == null ? null : clampZ(v); } catch { return null; } };
const saveZ = (v) => { try { if (v == null) localStorage.removeItem(Z_KEY); else localStorage.setItem(Z_KEY, String(v)); } catch { /* no storage: the choice lasts the visit */ } };
let dpr = 1, k = 1, k0 = 1, f = 1, CW = 1920, CH = 1080, form = "laptop", zSet = TEST ? null : loadZ();   // form: "up" (a phone held upright), "side" (a phone on its side) or "laptop"; zSet: the chosen z for the Companion, null for fit
let phone = false;   // a touch device with a short side under 600 CSS px
let PLAN = { station: null, companion: null };   // the layout of each device (layout.mjs plan), in window CSS px
const coarseNow = () => window.matchMedia("(pointer: coarse)").matches;
function metrics() {
  dpr = window.devicePixelRatio || 1; k0 = baseK(dpr); CW = innerWidth; CH = innerHeight;
  form = formOf(CW, CH, coarseNow()); phone = form !== "laptop";
  document.documentElement.style.setProperty("--mark", (24 * Math.max(1, Math.round(dpr))) / dpr + "px");   // the 24 px room marks at 24 × n device px, nearest-neighbour: never smoothed, never a fractional step
}
const S = (v) => Math.round(v * dpr) / dpr;   // a CSS length snapped to a whole physical pixel
const Z = (v) => Math.ceil(v * dpr - 1e-6) / dpr;   // a CSS size rounded up to a whole physical pixel (never below the minimum)
const Zc = (v) => Math.ceil(Z(v) * 64) / 64;   // and up to Chromium's next 1/64 layout unit
// panels and trays go by transform with their sizes rounded up to the next layout unit: nested left/top values floor to 1/64 px and would put a device's screen off the whole device pixel
const placeC = (el, x, y, w, h, tf) => { const s = el.style;
  if (tf) { s.left = "0px"; s.top = "0px"; s.transform = "translate(" + S(x) + "px," + S(y) + "px)"; } else { s.left = S(x) + "px"; s.top = S(y) + "px"; }
  if (w != null) s.width = Zc(w) + "px"; if (h != null) s.height = Zc(h) + "px"; };
const placeBox = (el, b, tf) => placeC(el, b[0], b[1], b[2], b[3], tf);
// a frame inside its panel at CSS px, scaled by k / k0 from its top left (k0 device px per CSS px is what the face draws at)
function placeFrameC(el, xc, yc, w, h, kk = k) {
  const s = el.style, sc = kk / k0;
  s.left = "0px"; s.top = "0px"; s.transform = "translate(" + S(xc) + "px," + S(yc) + "px)" + (sc !== 1 ? " scale(" + sc + ")" : ""); s.transformOrigin = sc !== 1 ? "0 0" : "";
  s.width = Math.ceil(Math.round(w * k0) / dpr * 64) / 64 + "px"; s.height = Math.ceil(Math.round(h * k0) / dpr * 64) / 64 + "px";
}

// ---- state ----
// "First pod home" (first-ten-front D3): the Station holds a pod, a crate, a bud or a mibi. The Station's word (`podHome` in `mb-caddy`) is the truth and comes from its save; this marker is that word as last
// heard, kept so the first paint after a reload already knows it (cleared with Start fresh). Until a pod is home the page opens on the Companion on every device and the Station sleeps.
const HOME_KEY = "mb-play-podhome";
const loadHome = () => { try { return localStorage.getItem(HOME_KEY) === "1"; } catch { return false; } };
const saveHome = (v) => { try { if (v) localStorage.setItem(HOME_KEY, "1"); else localStorage.removeItem(HOME_KEY); } catch { /* no storage: the Station's word is heard again at every load */ } };
const NEWBIE = !TEST || params.has("new");   // test pages keep today's page (the Station awake) unless a test asks for the new player's (`?test&new`: test-harness flag only)
let podHome = NEWBIE ? loadHome() : true;
const START_OWNER = !podHome || formOf(innerWidth, innerHeight, window.matchMedia("(pointer: coarse)").matches) === "up" ? "companion" : "station";   // a new player starts on the Companion; later a phone held upright still opens on it, the handheld
let owner = START_OWNER, devOpen = false, keysOpen = false;   // owner: the device in view, which has the keys
let wokeNews = false;   // the Station woke while it was out of view: the switch's dot, until it comes into view
let caddy = { canDock: false, docked: false, crates: 0, pending: false };   // the Dock control's view of the cradle and the frames' words (derive())
let pressed = false;
const frames = { station: $("fStation"), companion: $("fCompanion") };
const SITE = import.meta.env?.PROD ? "/play/" : "../";   // the built game lives under /play/ (its folders: ui/, station/, exploration/); the source tree has them beside play/
const stationUrl = SITE + "station/?embed" + (TEST ? "&test" : ""), companionUrl = SITE + "exploration/?embed" + (cslot === "A" && SEED != null ? "&seed=" + encodeURIComponent(SEED) : "");

// ---- the keys (drawn keys press exactly as the keyboard does) ----
// The trays are React + Radix (options/src/keytray.jsx); the geometry is keyplan.mjs (one measure a: laptops 44, phones the largest step that fits). A key press is a keydown on the device's frame, its release a keyup.
const MARK = (n) => SITE + "ui/assets/masters/shell/shell-key-" + n + "-24.png";
const defOf = (id, code, name, kind, cls) => ({ id, code, name, kind, cls, tip: KEYBOARD[id], mark: kind === "room" ? MARK(id === "research" ? "pods" : id) : undefined });
const DEFS = (st) => [
  defOf("left", "ArrowLeft", "Left", "arm", (st ? "pad" : "cpad") + " arm left"), defOf("up", "ArrowUp", "Up", "arm", (st ? "pad" : "cpad") + " arm up"),
  defOf("down", "ArrowDown", "Down", "arm", (st ? "pad" : "cpad") + " arm down"), defOf("right", "ArrowRight", "Right", "arm", (st ? "pad" : "cpad") + " arm right"),
  ...(st ? [defOf("home", "KeyH", "Home", "room", "room home"), defOf("research", "KeyR", "Pods", "room", "room research"), defOf("vivarium", "KeyB", "Vivarium", "room", "room vivarium"), defOf("library", "KeyL", "Library", "room", "room library")] : []),
  defOf("call", "KeyC", "Call", "call", "round call"), defOf("back", "Escape", "Back", "back", "round " + (st ? "back" : "cback")), defOf("confirm", "Enter", "Confirm", "confirm", "round confirm"),
];
const trays = {};   // the mounted trays: { update({ plan, snap, tips }) }
function buildKeys() {
  for (const dev of ["station", "companion"]) {
    const st = dev === "station";
    trays[dev] = mountKeyTray($(st ? "rowStation" : "rowCompanion"), { dev, label: st ? "Station keys" : "Companion keys", defs: DEFS(st), padDir, onKey: (def, down) => { if (down) setOwner(dev); fire(dev, down ? "keydown" : "keyup", def); } });
  }
}
function fire(dev, type, def) {
  const w = frames[dev].contentWindow; if (!w) return;
  try { w.dispatchEvent(new KeyboardEvent(type, { code: def.code, key: def.code === "Enter" ? "Enter" : def.code === "Escape" ? "Escape" : def.code, bubbles: true, cancelable: true })); } catch { /* the frame is reloading */ }
}
// a tray's plan at a size, its boxes snapped to whole physical pixels (the keys are CSS px); `tips`: the laptop's hover hint (a touch screen has none)
const snapBox = ([x, y, w, h]) => [S(x), S(y), Zc(w), Zc(h)];
const drawTray = (dev, pl) => trays[dev].update({ plan: pl, snap: snapBox, tips: !phone && !window.matchMedia("(pointer: coarse)").matches });

// ---- layout (layout.mjs; ui-play-layout-2) ----
// One device in view, everywhere: its panel (the screen and its keys) centred in the window; the other device keeps running, hidden. The bar holds the switch (Radix Tabs), Options and, on a laptop, Keys ? and the size control.
// Nothing scrolls (the page is clipped) unless the size control's choice is larger than the window.
const bar = $("bar"), stage = $("stage"), shS = $("shStation"), shC = $("shCompanion"), dev = $("dev"), keysPanel = $("keysPanel");
// A long press on a key or a screen is a held key, never the browser's text or image menu (fields keep theirs).
stage.addEventListener("contextmenu", e => { if (!e.target.closest("input,textarea")) e.preventDefault(); });
const shells = { station: shS, companion: shC };
const trayEl = { station: $("rowStation"), companion: $("rowCompanion") };
const asleepStrip = $("asleepStrip"), asleepBar = $("asleepBar"), keysBtn = $("keysBtn"), devBtn = $("devBtn"), optionsBtn = $("optionsBtn");
// the Dock key: a Radix Toggle (options/src/keytray.jsx), its look and words set by layoutDock from this state
const dockState = { box: null, docked: false, lit: false, quiet: true, pressed: false, disabled: true, label: "Dock the Companion", title: "", mark: SITE + "ui/assets/masters/pods/frame-companion-outline-16x24.png", mode: "full", full: "Dock · after the expedition", short: "Dock", hint: true };
const dockUi = mountDockKey($("dockRoot"), { onPress: () => { dockPress(); giveKeysBack(); } }); dockUi.update(dockState);
const dockKey = $("dockKey");
// the device switch (Radix Tabs): Companion, then Station, in that order always
const switchUi = mountSwitch($("switchRoot"), { onPick: (d) => setOwner(d) });
// the dock's screen: a live miniature of the e-paper in a button; the Radix Dialog shows it whole
const dockScreen = mountDockScreen($("dockScreenRoot"), { onOpenChange: (open) => { if (!open) giveKeys(owner); } });
const zDown = $("zDown"), zFit = $("zFit"), zUp = $("zUp"), stamp = $("stamp");
const geom = { station: null, companion: null, bar: null };   // the devices' panels in window CSS px, for the checks
const arr = (b) => (b ? [b.x, b.y, b.w, b.h] : null);
const kOf = { station: 1, companion: 1 };   // device px per lp of each device's screen
const newsOf = () => ({ companion: false, station: wokeNews || !!(heard && (heard.pending || (heard.crates | 0) > 0)) });   // the other device's news: the Station woke, crates wait in its bay, its arrival choice waits (the Companion's own news is the lit Dock key)

function layout() {
  metrics();
  document.body.classList.toggle("phone", phone);
  for (const dv of ["station", "companion"]) {
    const st = dv === "station", p = layoutPlan({ W: CW, H: CH, dpr, coarse: coarseNow(), dev: dv, asleep: st && !podHome, zSet });
    PLAN[dv] = p; kOf[dv] = Math.floor(p.scale * dpr * 64 + 1e-6) / 64;
  }
  k = kOf[owner]; f = k / dpr;
  document.documentElement.style.setProperty("--f", String(f));
  const news = newsOf(), tools = !devBtn.classList.contains("hidden"), bp = barPlan({ W: CW, form, tools, size: !TEST && form === "laptop" });
  bar.style.height = BAR + "px";
  // the bar: the switch, Options, and on a laptop Keys ?, the size control and the developer tools' button
  switchUi.update({ box: bp.switch, value: owner, asleep: !podHome, news });
  placeBox(optionsBtn, bp.options);
  if (bp.keys) placeBox(keysBtn, bp.keys);
  if (bp.tools) { placeBox(devBtn, bp.tools); devBtn.textContent = "Tools"; devBtn.setAttribute("aria-label", "Developer tools"); devBtn.classList.toggle("on", devOpen); devBtn.setAttribute("aria-pressed", String(devOpen)); }
  if (bp.size) layoutSize(bp.size);
  layoutNoteCtl();
  // the panels: both devices placed (the other keeps running); the one in view shown
  for (const dv of ["station", "companion"]) {
    const p = PLAN[dv], st = dv === "station", fw = st ? 1024 : 450, shell = shells[dv], tray = trayEl[dv], on = owner === dv;
    placeC(shell, p.panel.x, p.panel.y, p.panel.w, p.panel.h, true);
    if (st) { placeStation(p); tellNarrow(); } else placeFrameC(frames[dv], p.screen.x - p.panel.x, p.screen.y - p.panel.y, fw, 600, kOf[dv]);
    placeBox(tray, p.tray.box, true); drawTray(dv, p.tray.plan);
    for (const el of [shell, tray]) { el.style.visibility = on ? "visible" : "hidden"; el.style.pointerEvents = on ? "" : "none"; }
    tray.style.pointerEvents = "none";   // the tray is a transparent box over the panel: only its keys take a touch
    geom[dv] = { x: p.panel.x, y: p.panel.y, w: p.panel.w, h: p.panel.h };
  }
  geom.bar = { x: 0, y: 0, w: CW, h: BAR };
  const P = PLAN[owner];
  // the dock: the Dock key and the dock's-screen button, one row (upright) or the right column's foot; on both devices, so a docked Companion can be lifted from either
  layoutDock(arr(P.dock));
  dockScreen.update({ box: arr(P.epaper).map((v, i) => (i < 2 ? S(v) : Zc(v))), hand: lampOf.c === "amber", laptop: form === "laptop", sheetW: Math.min(CW, 480) - 32, lampC: lampView.c, lampS: lampView.s });
  // the asleep note (the Station's): above its panel; on its side, in the build line's place in the bar
  const sleepingShown = owner === "station" && !podHome;
  const inBar = sleepingShown && !P.note && !!bp.stamp;
  asleepStrip.classList.toggle("hidden", !(sleepingShown && P.note)); asleepBar.classList.toggle("hidden", !inBar);
  if (sleepingShown && P.note) placeBox(asleepStrip, arr(P.note)); if (inBar) placeBox(asleepBar, bp.stamp);
  printBox.classList.toggle("hidden", !(print.id && print.h));   // the recovery print's card (sandbox): fixed at the window's foot while a print waits
  // the build line: the foot (upright), or the bar (on its side before Options; on a laptop its left end)
  const sbox = P.stamp.where === "foot" ? arr(P.stamp.box) : bp.stamp;
  stamp.classList.toggle("hidden", TEST || !sbox || (sleepingShown && !P.note && P.stamp.where === "bar")); if (!TEST && sbox) { placeBox(stamp, sbox, true); stamp.style.textAlign = P.stamp.where === "foot" ? "right" : P.stamp.where === "bar" ? "right" : "left"; stamp.style.lineHeight = P.stamp.where === "foot" ? "12px" : CTL_LINE + "px"; }
  // a chosen size larger than the window: the page scrolls (never otherwise)
  const c = P.content, over = c[1] + c[3] + 16 > CH || c[0] + c[2] + 16 > CW;
  stage.style.overflow = over ? "auto" : "clip"; spacer.style.top = over ? Math.max(0, Math.ceil(c[1] + c[3] + 16) - 1) + "px" : "0px"; spacer.style.left = over ? Math.max(0, Math.ceil(c[0] + c[2] + 16) - 1) + "px" : "";
  // the developer tools, the Keys ? panel
  dev.classList.toggle("hidden", !devOpen || phone); if (devOpen && !phone) placeC(dev, CW - Math.min(360, CW), BAR, Math.min(360, CW), CH - BAR);
  keysPanel.classList.toggle("hidden", !keysOpen); if (keysOpen) placeC(keysPanel, Math.max(0, Math.floor((CW - 640) / 2)), BAR + 8, Math.min(640, CW), Math.min(CH - BAR - 16, 760));
  window.__playRects = rects;
}
const CTL_LINE = 44;
// ---- the Station's phone window (layout.mjs ZOOM, view, panFor) ----
// Where the whole screen would be under x0.6 the Station is drawn at x0.6 in a window (plan.view, in lp) that keeps the focus ring's target whole (the Station posts the ring's box, "mb-focus").
// The frame is moved under a clip-path that moves with it, both eased over the same time, so the window stays put while the screen slides under it; reduced motion jumps.
let pan = { x: 0, y: 0 }, focusNow = { screen: null, box: null };
function placeStation(p) {
  const el = frames.station, xc = p.screen.x - p.panel.x, yc = p.screen.y - p.panel.y;
  el.classList.toggle("pan", !!p.view);
  if (!p.view) { pan = { x: 0, y: 0 }; el.style.clipPath = ""; placeFrameC(el, xc, yc, 1024, 600, kOf.station); return; }
  pan = panFor(p.view, focusNow.box, pan);
  const fl = kOf.station / dpr, u = k0 / dpr;   // CSS px per lp on the page, and in the frame before its scale
  placeFrameC(el, xc - pan.x * fl, yc - pan.y * fl, 1024, 600, kOf.station);
  el.style.clipPath = "inset(" + [pan.y, 1024 - pan.x - p.view.w, 600 - pan.y - p.view.h, pan.x].map((v) => Math.max(0, v) * u + "px").join(" ") + ")";
}
// Home's narrow form (home.json narrow): told to the Station whenever the plan says (and when it loads): the phone held upright, the window 530 lp wide
let sentNarrow = null;
function tellNarrow(force = false) {
  const on = !!(PLAN.station && PLAN.station.narrow);
  if (!force && on === sentNarrow) return; sentNarrow = on;
  try { frames.station.contentWindow.postMessage({ t: "mb-view", narrow: on }, location.origin); } catch { sentNarrow = null; /* not loaded: its load event tells it */ }
}
function stationFocus(m) {
  const box = Array.isArray(m.box) && m.box.length === 4 ? m.box.map(Number) : null, moved = m.screen !== focusNow.screen;
  if (moved && !box) pan = { x: 0, y: 0 };   // a new screen with no ring on it: its top left
  focusNow = { screen: m.screen, box };
  const p = PLAN.station; if (p && p.view) placeStation(p);
}
function dockTitle() {
  const c = caddy; return !c.canDock ? "The Companion has no world yet" : c.docked ? "Lift the Companion" : c.crates > 0 ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion";
}
// the size control: − / fit / +, the middle showing ×z (the Companion's device px per lp, and "fit" while the fit is on); − and + step the Companion by one device pixel per lp, the Station keeps its ratio to its fit
function layoutSize([d, ft, u]) {
  placeBox(zDown, d); placeBox(zFit, ft); placeBox(zUp, u);
  const z = Math.round(kOf.companion), fit = zSet == null; zFit.textContent = (fit ? "fit ×" : "×") + z; zFit.classList.toggle("on", fit); zFit.setAttribute("aria-pressed", String(fit));
  zFit.setAttribute("aria-label", "Fit to the window, now ×" + z); zFit.title = fit ? "Fitted to the window: ×" + z : "Fit to the window (now ×" + z + ")";
  zDown.setAttribute("aria-disabled", String(z <= 1)); zUp.setAttribute("aria-disabled", String(z >= Math.min(Z_MAX, zCap(CW, CH, dpr))));
}
function setZ(v) {   // v: a z, or null for fit; the choice is kept per browser, fit clears it
  zSet = v == null ? null : clampZ(v); saveZ(zSet); layout();
}
const zStep = (d) => { if (TEST || form !== "laptop") return; const z = Math.round(kOf.companion), n = Math.min(clampZ(z + d), zCap(CW, CH, dpr)); if (n !== z) setZ(n); };
// The Dock / Lift key (first-ten-front A2): quiet until the walk ends with a sealed crate, then lit; docked, it says how to go out. One press asks for the same dock or lift as Shift+D.
function layoutDock(box) {   // box: the key's [x, y, w, h] in window CSS px, or null when it is not shown
  const c = caddy, d = c.docked, crates = !d && c.canDock && c.crates > 0, touch = window.matchMedia("(pointer: coarse)").matches;
  // [copy] placeholders: the scheme's section 7 item 4; the short words are the long ones cut down ("Dock", "Lift")
  const full = d ? "Docked · Lift to go out" : crates ? "Dock the Companion" : "Dock · after the expedition", short = d ? "Lift" : "Dock";
  const label = d ? "Lift the Companion" : crates ? "Dock the Companion; cargo waits aboard" : "Dock the Companion", title = dockTitle();
  let mode = box ? dockWords(box[2]) : "full", hint = !touch;   // ⇧D is hidden on a touch screen
  if (box && mode === "full") { const need = dockNeed(full, hint); if (need > box[2]) { hint = false; if (dockNeed(full, false) > box[2]) mode = "short"; } }   // the full words are kept only where they fit: never an ellipsis
  Object.assign(dockState, { box: box ? snapBox(box) : null, docked: d, lit: crates, quiet: !d && !crates, pressed: pressed || c.pending, disabled: !c.canDock, label, title, mark: SITE + "ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png", mode, full, short, hint });
  dockUi.update(dockState);
}
// the width the Dock key's long words need (14 px Inter, its mark, the padding and the ⇧D hint)
let dockCtx = null;
function dockNeed(text, hint) { dockCtx = dockCtx || document.createElement("canvas").getContext("2d"); dockCtx.font = '500 14px "Inter", system-ui, sans-serif'; return Math.ceil(dockCtx.measureText(text).width) + 12 * 2 + 16 + 8 + (hint ? 8 + 22 : 0); }
const rects = () => { const o = {}; for (const [n, el] of Object.entries({ station: frames.station, companion: frames.companion, shStation: shS, shCompanion: shC, trayStation: trayEl.station, trayCompanion: trayEl.companion, dock: dockKey, dockScreen: $("dockScreenBtn"), dev, switch: $("tabCompanion") && $("tabCompanion").parentElement, stamp, asleep: asleepStrip })) { if (!el) continue; const r = el.getBoundingClientRect(); o[n] = [r.left, r.top, r.width, r.height]; } return o; };

// ---- who has the keys ----
// The device in view always has the keys: there is no ring and no click-to-give-keys (the other device is hidden). Taking a device into view clears its news dot.
function giveKeys(d) { const fr = frames[d]; try { fr.focus(); fr.contentWindow && fr.contentWindow.focus(); } catch { /* not loaded yet */ } }
function setOwner(d, opts = {}) {
  const focus = opts.focus !== false, changed = d !== owner;
  if (d === "station") wokeNews = false;
  if (!changed && !opts.force) { if (d === "station") layout(); if (focus) giveKeys(d); return; }
  owner = d; layout(); if (focus) giveKeys(d);
}
const order = ["companion", "station"];
const cycle = (dir) => setOwner(order[(order.indexOf(owner) + dir + order.length) % order.length]);

// the page's keys, caught in the capture phase of each frame's window and of the shell's own, before any device hears them
function pageKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  const t = e.target, tag = t && t.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable) || (t && t.closest && t.closest("[data-options]"))) return;   // typing, or inside the Options panel or the dock's sheet (they take their own keys)
  let hit = true;
  if (e.code === "Backquote") cycle(e.shiftKey ? -1 : 1);
  else if (e.shiftKey && e.code === "KeyD") dockPress();
  else if (e.shiftKey && e.code === "KeyT") toggleDev();
  else if (e.shiftKey && e.code === "KeyN") { if (notes) notes.addWhole({ quiet: true }); }   // the whole screen into the note, at once
  else if (e.shiftKey && e.code === "Slash") toggleKeys();
  else if (e.code === "Escape" && keysOpen) toggleKeys(false);
  else if (!TEST && !e.shiftKey && (e.code === "Minus" || e.code === "NumpadSubtract")) zStep(-1);
  else if (!TEST && (e.code === "Equal" || e.code === "NumpadAdd")) zStep(1);   // = or + (Shift+=)
  else hit = false;
  if (hit) { e.preventDefault(); e.stopImmediatePropagation(); }
}
function attach(d) { try { const w = frames[d].contentWindow; w.addEventListener("keydown", pageKey, true); } catch { /* cross-origin never happens here */ } }
window.addEventListener("keydown", pageKey, true);
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
function dockPress() {
  if (!caddy.canDock || pressed) return;
  pressOwner = owner; pressed = true; layout();
  seatCradle(!caddy.docked);   // Lift or Dock: ask at once (the Dock key's own docked look shows the seat; there is no seat drop)
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
  }
  if (mine !== undefined) {
    if (seated === mine && mine) { const brings = podHome || derive().crates > 0; setOwner(brings ? "station" : "companion"); say("Companion docked"); }   // the first dock that brings a pod turns the page to the Station; an empty one stays on the Companion
    else if (seated === mine) { setOwner("companion"); say("Companion lifted"); }
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
const giveKeysBack = () => { if (document.activeElement === dockKey) dockKey.blur(); };
// A frame's key cue (mb-keycue {key, ring|hop}, the Companion page's keyCues/hopCall): the drawn key rings until the frame says stop, or hops once. Set on the tray's host (React leaves it alone), read by play/index.html's CSS.
const CUE_KEYS = new Set(["call"]);
function keyCue(dv, m) {
  const host = trayEl[dv], key = String(m.key || ""); if (!host || !CUE_KEYS.has(key)) return;
  const flag = (attr, on) => { const s = new Set((host.getAttribute(attr) || "").split(" ").filter(Boolean)); if (on) s.add(key); else s.delete(key); if (s.size) host.setAttribute(attr, [...s].join(" ")); else host.removeAttribute(attr); };
  if ("ring" in m) flag("data-cue", !!m.ring);
  if (m.hop) { flag("data-hop", false); void host.offsetWidth; flag("data-hop", true); }   // off, reflow, on: the hop plays again
}
// The frames' notice line (play/src/footer.mjs mountNotice posts it up): a frame's own line is clipped or hidden on the play page, so the page says it, one line at the window's foot, whichever frame holds one.
const frameNotes = new Map(), frameNoticeEl = $("frameNotice");
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin) return; const m = e.data || {};
  if (m.t === "mb-notice" && (e.source === frames.station.contentWindow || e.source === frames.companion.contentWindow)) {
    frameNotes.set(e.source, String(m.text || "").slice(0, 120)); const t = [...frameNotes.values()].find(Boolean) || "";
    frameNoticeEl.textContent = t; frameNoticeEl.hidden = !t; return;
  }
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
  if (e.source === frames.station.contentWindow && m.t === "mb-focus") { stationFocus(m); return; }   // the Station's focus ring moved: the phone window follows it
  if (m.t === "mb-keycue" && (e.source === frames.companion.contentWindow || e.source === frames.station.contentWindow)) { keyCue(e.source === frames.station.contentWindow ? "station" : "companion", m); return; }
  if (e.source !== frames.station.contentWindow || m.t !== "mb-caddy") return;
  if (sw.quiet) return;   // the Station quiet: its link is down, the page hears nothing from it
  heard = m; heardAt = now(); inflight = 0;
  try { frames.companion.contentWindow.postMessage({ t: "mb-caddy", podHome: m.podHome, goal: m.goal }, location.origin); } catch { /* reloading */ }   // the Companion hears the Station's pod-home and goal too
  if (NEWBIE && typeof m.podHome === "boolean" && m.podHome !== podHome) {   // the Station's word on "first pod home" (its save): the page wakes the Station, or lets it sleep again
    const known = podHome; podHome = m.podHome; saveHome(podHome);
    if (podHome && !known && owner !== "station") wokeNews = true;   // the Station woke out of view: its half of the switch shows the dot until it comes into view
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
// The second Companion (the owner's: the Companion is the player's identity) is chosen in Options (the Companion row; it applies when the panel closes): the frame holds Companion A or B.
// The drawer's three problems: "Companion silent" (the Companion frame holds back its word), "Station quiet" (the page stops hearing the Station and the Station hears
// nothing of the dock), "Caddy fault" (the service refuses writes).
function setSwitch(name, on) {
  sw[name] = !!on; const box = $("sw-" + name); if (box) box.checked = !!on;
  if (name === "silent") { try { frames.companion.contentWindow.postMessage({ t: "mb-silent", on: !!on }, location.origin); } catch { /* reloading */ } }
  if (name === "quiet" && !on) { inflight = 0; reconcile(); }
  faceTick();
}
for (const n of ["silent", "quiet", "fault"]) { const box = $("sw-" + n); if (box) box.addEventListener("change", () => setSwitch(n, box.checked)); }

// ---- the dock's screen: a live miniature in the button, whole in the sheet (Radix Dialog) ----
// The shell draws the Caddy's face (caddy/face.mjs) of the service's state into its own 792 × 272 canvas with the panel's timing: a partial appears 0.8 s after its change over the regions that changed; a full refresh
// blacks the panel, whitens it, then draws, over 4 s. Every picture is handed on to the dock's-screen button's miniature and the sheet (dockScreen.paint). Until the first face is drawn the screen shows blank paper, not black.
// The two cradle lamps are in the sheet: the placed 8 px lamp picture each, beside their words.
const PARTIAL_MS = 800, FULL_MS = 4000;
// The first picture waits for the Station's word and its seat; with no word it is drawn at 15 s anyway. ?test&firstms=N moves that fallback (test pages only), so a journey on a loaded machine
// can wait for the real condition instead of a page that took longer than 15 s to boot drawing a stand-in first.
const FIRST_MS = (() => { const q = new URLSearchParams(location.search), n = Number(q.get("firstms")); return q.has("test") && n > 0 ? n : 15000; })();
const view = $("caddyView"), spacer = $("spacer");
const vctx = view.getContext("2d", { willReadFrequently: true }); view.width = 792; view.height = 272;
const bootAt = now(), sched = createScheduler({ tz: TZ }), drawnLog = [];
let faceNow = null, drawn = null, lastFaceId = null, faceStarted = false, lampOf = { c: "off", since: 0 }, lampView = { c: {}, s: {} }, lampKey = "";
const imageOf = (face) => { const px = rasterFace(face), img = vctx.createImageData(792, 272); for (let i = 0; i < px.length; i++) { const o = i * 4; img.data[o] = img.data[o + 1] = img.data[o + 2] = px[i]; img.data[o + 3] = 255; } return img; };
const blank = (v) => { vctx.fillStyle = `rgb(${v},${v},${v})`; vctx.fillRect(0, 0, 792, 272); dockScreen.paint(view); };
blank(255);   // paper, not black, until the first face is drawn
function panelOp(o) {
  if (o.kind === "partial") setTimeout(() => { const img = imageOf(o.face); for (const r of o.regions) { const [x, y, w, h] = REGIONS[r]; vctx.putImageData(img, 0, 0, x, y, w, h); } drawn = o.face; drawnLog.push({ kind: "partial", id: o.face.id, regions: o.regions, at: now() }); dockScreen.paint(view); }, PARTIAL_MS);
  else { const first = drawn === null; if (!first) { blank(0); setTimeout(() => blank(255), FULL_MS / 3); }    /* the first picture never blacks the panel: blank paper until the face lands */ setTimeout(() => { vctx.putImageData(imageOf(o.face), 0, 0); drawn = o.face; drawnLog.push({ kind: "full", id: o.face.id, why: o.why, at: now() }); dockScreen.paint(view); }, (2 * FULL_MS) / 3); }
}
function faceInput(t) {
  const who = (svc.up && svc.snap && svc.snap.face && svc.snap.face.who) || (seatedNow() && comp ? { name: comp.name } : null) || (heard && heard.companion ? { name: heard.companion.name } : null);
  return { now: t, tz: TZ, bootAt, cradles: cradles(), who, hold, fault,
    station: heard ? { at: heardAt, partner: heard.partner ?? null, along: heard.along ?? null, opened: heard.opened ?? null, crates: heard.crates | 0, ledger: heard.ledger ?? null } : null };
}
const stall = createStall();
function faceTick() {
  const t = now(); if (heard) heardAt = stall.credit(heardAt, t); else stall.credit(null, t);
  const f = faceOf(faceInput(t)); faceNow = f;
  lamps(f, t);
  if (!faceStarted) { const ready = !!heard && (svc.up === false || (!!svc.snap && svc.snap.cradles.station.state === "seated")); if (!ready && t - bootAt < FIRST_MS) return; faceStarted = true; }   // the first picture once the Station has spoken and sits in its cradle (or, with no word, at 15 s)
  for (const o of [sched.push(f, t, { beat }), sched.tick(t)]) if (o) panelOp(o);
  beat = false;
  if (!f.keep && f.id !== lastFaceId) lastFaceId = f.id;
}
setInterval(faceTick, 200);
const LAMP_SRC = { stone: SITE + "ui/assets/masters/pods/frame-lamp-8-stone.png", mint: SITE + "ui/assets/masters/pods/frame-lamp-8-mint.png", amber: null };
{ const im = new Image(); im.onload = () => { const c = document.createElement("canvas"); c.width = c.height = 8; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, 8, 8);   // the 8 px amber lamp: the mint master's light in amber
    for (let i = 0; i < 256; i += 4) { const k = Math.max(d.data[i], d.data[i + 1], d.data[i + 2]) / 255; d.data[i] = Math.round(0xff * k); d.data[i + 1] = Math.round(0xa8 * k); d.data[i + 2] = Math.round(0x3f * k); } x.putImageData(d, 0, 0); LAMP_SRC.amber = c.toDataURL(); }; im.src = LAMP_SRC.mint; }
function lamps(f, t) {
  if (f.lamp.companion !== lampOf.c) lampOf = { c: f.lamp.companion, since: t };
  const srcOf = (L) => (L.colour === "amber" ? LAMP_SRC.amber || LAMP_SRC.mint : L.colour ? LAMP_SRC.mint : LAMP_SRC.stone);
  const L = lampAt(lampOf.c, t - lampOf.since), S2 = lampAt(f.lamp.station, 0, STATION_LAMPS), rel = L.colour ? L.level / LAMPS.seated.level : 1;   // seated is the master as drawn; the breath dims it, the swell brightens it
  lampView = { c: { src: srcOf(L), colour: L.colour || "off", opacity: rel < 1 ? Number(rel.toFixed(3)) : 0, filter: rel > 1 ? `brightness(${rel.toFixed(3)})` : "" }, s: { src: srcOf(S2), colour: S2.colour || "off", opacity: 0, filter: "" } };
  const key = JSON.stringify(lampView) + (lampOf.c === "amber"); if (key === lampKey) return; lampKey = key;
  dockScreen.update({ lampC: lampView.c, lampS: lampView.s, hand: lampOf.c === "amber" });
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
    if (r.status === 204 || r.status === 404) { if (print.id) printClear(); return; }   // none waiting (204; 404 from an older service)
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
const FRESH_KEY = "mb-play-fresh", PLACES = [["HollowTree", "Hollow Tree"], ["Reedpool", "Reedpool"], ["SplitStone", "Split Stone"], ["Test_AllCases", "Test, all cases"], ["Windstep", "Windstep"]];   // [id, the place's name]
try { if (sessionStorage.getItem(FRESH_KEY)) { sessionStorage.removeItem(FRESH_KEY); for (const key of Object.keys(localStorage)) if (key.startsWith("mb-save-v8") || key.startsWith("mb-exploration-v") || key === "mb-station-dev") localStorage.removeItem(key); } } catch { /* no storage: nothing to erase */ }
function applyDev(on) { devBtn.classList.toggle("hidden", !on); for (const id of ["helpDevK", "helpDevD"]) $(id).classList.toggle("hidden", !on); if (!on && devOpen) toggleDev(false); layout(); }
// ---- play notes (owner 2026-11-12 18:2x; play/src/notes.mjs, play/options/src/controller.js): the note's screens come from the played device's own canvas, its details from both devices ----
const noteBtn = $("noteBtn"), shotBtn = $("shotBtn"), recBox = $("recBox"), recStop = $("recStop"), toast = $("noteToast");
let notes = null, buildInfo = null, toastTimer = 0, askId = 0;
const asks = new Map();
window.addEventListener("message", (e) => { if (e.origin !== location.origin) return; const m = e.data || {}; if (m.t === "mb-note-state" && asks.has(m.id)) { asks.get(m.id)(m.state ?? null); asks.delete(m.id); } });
function askDevice(d) {   // the device's own details (mb-note-ask / mb-note-state); null if it does not answer in time
  return new Promise((res) => {
    const id = ++askId; asks.set(id, res);
    try { frames[d].contentWindow.postMessage({ t: "mb-note-ask", id }, location.origin); } catch { asks.delete(id); res(null); return; }
    setTimeout(() => { if (asks.delete(id)) res(null); }, 600);
  });
}
async function noteContext() {
  const [companion, station] = await Promise.all([askDevice("companion"), askDevice("station")]);
  return { build: buildInfo && (buildInfo.short || String(buildInfo.commit || "").slice(0, 7)) || "local", builtAt: buildInfo && buildInfo.built || null, slot: cslot, device: owner,
    layout: { phone, form, w: CW, h: CH, z: k, dpr }, companion, station };
}
function noteSay(key, vars) {
  const t = T(key, vars); toast.textContent = t; toast.classList.remove("hidden"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.add("hidden"), 3000); say(t);
}
function noteFlash() { const el = owner === "station" ? shS : shC; el.classList.add("flashnote"); setTimeout(() => el.classList.remove("flashnote"), 450); }
const noteHost = { getCanvas: () => { try { return frames[owner].contentDocument.getElementById("screen"); } catch { return null; } }, context: noteContext, source: () => sourceOf(readOptions()), say: noteSay, flash: noteFlash };
function syncNote() {   // the bar's two controls (or the recording strip); layout() places them
  if (!notes) return;
  const s = notes.getState(), n = s.items.length, show = (n > 0 || s.text.trim() !== "") && !s.recording;
  noteBtn.classList.toggle("hidden", !show); shotBtn.classList.toggle("hidden", !show); recBox.classList.toggle("hidden", !s.recording); recStop.classList.toggle("hidden", !s.recording);
  noteBtn.textContent = T("bar.note", { n }); noteBtn.title = T("bar.note.title", { n });
  $("shotWord").textContent = T("bar.whole"); $("shotHint").textContent = T("bar.whole.hint");
  $("recWord").textContent = T("bar.recording", { m: s.recMs }); $("recCap").textContent = T("bar.recording.cap"); recStop.textContent = T("bar.stop");
  layout();
}
noteBtn.addEventListener("click", () => { notes.open(); });
shotBtn.addEventListener("click", () => { notes.addWhole({ quiet: true }); giveKeys(owner); });
recStop.addEventListener("click", () => { notes.stopRecord(); giveKeys(owner); });
function layoutNoteCtl() {   // the note's controls (shown while a note is being made): in the window's bottom-left corner, in a row, on every form
  const els = [[noteBtn, 104], [shotBtn, 176], [recBox, 232], [recStop, 72]].filter(([el]) => !el.classList.contains("hidden"));
  let cx = 24;
  for (const [el, w] of els) { const s = el.style; s.left = cx + "px"; s.top = "auto"; s.bottom = "8px"; s.width = w + "px"; s.height = "36px"; s.transform = ""; el.classList.add("corner"); cx += w + 8; }
}
notes = mountOptions($("optionsRoot"), {
  host: noteHost,
  trigger: optionsBtn, read: readOptions, about: () => aboutText(buildInfo), names: Object.keys(NAME_LISTS), places: PLACES,
  onChange: (patch) => { writeOptions(patch); if ("dev" in patch) applyDev(patch.dev); },
  onClose: (changed) => { if (changed) location.reload(); giveKeys(owner); },
  onStartFresh: () => { saveHome(false); try { sessionStorage.setItem(FRESH_KEY, "1"); } catch { return; } location.reload(); },
  // a phone has no Tools button (barPlan: a laptop only), so with Developer tools on the panel carries the Companion's Observer: its own page, in this tab (one page plays at a time)
  phone: () => phone, observerHref: SITE + "exploration/",
});
notes.subscribe(syncNote);
notes.tapStart();   // the last 10 seconds: the played device's canvas, encoded as it plays
addEventListener("online", () => notes.flush(true));
setTimeout(() => notes.flush(true), 3000); setInterval(() => notes.flush(true), 60000);   // notes kept from an earlier visit go when the route answers
// ---- boot ----
buildKeys();
for (const d of ["station", "companion"]) frames[d].addEventListener("load", () => { attach(d); if (d === "station") { tellNarrow(true); if (devOpen) toggleDev(true); if (!gotLoadOwner) { gotLoadOwner = true; setOwner(START_OWNER); } } });
let gotLoadOwner = false;
frames.station.src = stationUrl; frames.companion.src = companionUrl;
if (DEV) { applyDev(true); devOpen = true; }   // the Developer tools option shows the button and its help row, and opens the tools at load
if (!TEST) for (const id of ["zDown", "zFit", "zUp", "stamp", "helpZK", "helpZD"]) $(id).classList.remove("hidden");   // the size control, its keys and the build stamp: everywhere but ?test, which keeps today's page
let dprQuery = null;
function armDpr() { if (dprQuery) dprQuery.removeEventListener("change", onDpr); dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); dprQuery.addEventListener("change", onDpr); }
function onDpr() { layout(); armDpr(); }
armDpr(); window.addEventListener("resize", layout);
// the build stamp from the site's build.json: "build <short> · YYYY-MM-DD HH:MM Mexico City"; "build local" with no build.json
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => { buildInfo = j; stamp.textContent = stampText(j); }).catch(() => { stamp.textContent = "build local"; });
layout();
// for the play-page journey: read-only views of the shell's state
window.__play = { get phone() { return phone; }, get form() { return form; }, get plan() { return JSON.parse(JSON.stringify(PLAN[owner])); }, get geom() { return JSON.parse(JSON.stringify(geom)); }, get scroll() { return [stage.scrollTop, stage.clientHeight, stage.scrollHeight]; }, get owner() { return owner; }, get z() { return k; }, get fit() { return zSet == null; }, get caddy() { return { ...caddy }; }, get pressed() { return pressed; },
  get news() { return newsOf(); }, get dockScreenOpen() { return dockScreen.isOpen; }, openDockScreen: () => dockScreen.open(), closeDockScreen: () => dockScreen.close(),
  get caddySheet() { return { up: true, id: drawn ? drawn.id : null, lines: drawn ? { ...drawn.lines } : null, crates: drawn ? drawn.crates : 0, ledger: drawn ? drawn.ledger : null, marks: drawn ? { ...drawn.marks } : null, next: faceNow ? faceNow.id : null, counts: sched.counts, log: drawnLog.slice(), ops: sched.state.log.map((o) => ({ kind: o.kind, id: o.id, at: o.at, regions: o.regions })), busy: now() < sched.state.busyUntil,
    lamp: { companion: lampOf.c, station: faceNow ? faceNow.lamp.station : "off", dot: lampView.c.colour || "off", stationDot: lampView.s.colour || "off" }, pixels: () => Array.from(vctx.getImageData(0, 0, 792, 272).data.filter((_, i) => i % 4 === 0)) }; },
  get notes() { return notes; },
  get dock() { return { up: svc.up, world: svc.esWorld, snap: svc.snap, sensed: JSON.parse(JSON.stringify(sensed)), hold, comp, fault, heardAt, slot: cslot }; }, setSwitch, rects, frames };
