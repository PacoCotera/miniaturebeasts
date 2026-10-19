// The play page's shell (technical-architecture.md W1; the architect's spec): the Station and the Companion as same-origin frames side by side, the page's own keys, the Dock control, the cradle and the
// seat. The shell draws only page chrome. It never reads or writes the save (the devices cross it by the storage event, as between two tabs) and it imports nothing from station/, exploration/ or
// workbench/: it asks the Station to dock by postMessage and shows the Caddy state the Station posts back (`mb-caddy`).
//
// Lengths are in lp: one lp is `f` CSS px, so every edge lands on a whole physical pixel. Colours are the Station's 14.

import { canvasPainter, createPaper, caddyLines } from "./caddy.mjs";   // the Caddy's e-paper: play-page chrome like the rest, fed by the Station's mb-caddy

const params = new URLSearchParams(location.search), TEST = params.has("test"), DEV = params.has("dev"), SEED = params.get("seed");
const $ = (id) => document.getElementById(id);
const SEAT_MS = 160, EASE = [0, 0, 0.2, 1];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- the pixel rule ----
// The faces keep the pixel rule: one lp is f = k / devicePixelRatio CSS px. The page chrome (keys, bar, trays, gaps) is in CSS px, snapped to whole physical pixels; the thresholds are CSS px of the window, the bar included.
let dpr = 1, k = 1, f = 1, CW = 1920, CH = 1080, tier = "row";   // tier: "stack", "row" or "narrow"
function metrics() {
  dpr = window.devicePixelRatio || 1; k = Math.max(1, Math.floor(dpr)); f = k / dpr; CW = innerWidth; CH = innerHeight;
  document.documentElement.style.setProperty("--f", String(f));
  document.documentElement.style.setProperty("--mark", (24 * Math.max(1, Math.round(dpr))) / dpr + "px");   // the 24 px room marks at 24 × n device px, nearest-neighbour: never smoothed, never a fractional step
  tier = CW < 1064 ? "narrow" : CW >= 1878 && CH >= 800 ? "row" : "stack";
}
const px = (lp) => Math.round(lp * k) / dpr + "px";
const pxUp = (lp) => Math.ceil(Math.round(lp * k) / dpr * 64) / 64 + "px";   // a size, up to Chromium's next 1/64 CSS px layout unit
const S = (v) => Math.round(v * dpr) / dpr;   // a CSS length snapped to a whole physical pixel
const Z = (v) => Math.ceil(v * dpr - 1e-6) / dpr;   // a CSS size rounded up to a whole physical pixel (never below the minimum)
const Zc = (v) => Math.ceil(Z(v) * 64) / 64;   // and up to Chromium's next 1/64 layout unit
// iframes, shells and trays go by transform with their sizes rounded up to the next layout unit: nested left/top values floor to 1/64 px and would put a device's screen off the whole device pixel
const place = (el, x, y, w, h) => { const s = el.style;
  if (el.tagName === "IFRAME" || el.classList.contains("shell")) { s.left = "0px"; s.top = "0px"; s.transform = "translate(" + px(x) + "," + px(y) + ")"; if (w != null) s.width = pxUp(w); if (h != null) s.height = pxUp(h); return; }
  s.left = px(x); s.top = px(y); if (w != null) s.width = px(w); if (h != null) s.height = px(h); };
// the same in CSS px (page chrome)
const placeC = (el, x, y, w, h, tf) => { const s = el.style;
  if (tf) { s.left = "0px"; s.top = "0px"; s.transform = "translate(" + S(x) + "px," + S(y) + "px)"; } else { s.left = S(x) + "px"; s.top = S(y) + "px"; }
  if (w != null) s.width = Zc(w) + "px"; if (h != null) s.height = Zc(h) + "px"; };

// ---- state ----
let owner = "station", seatOff = 0, devOpen = false, keysOpen = false;
let caddy = { canDock: false, docked: false, crates: 0, pending: false }, gotCaddy = false;
let awaiting = null, pressed = false, askTimer = 0, seatBusy = false;
const frames = { station: $("fStation"), companion: $("fCompanion") };
const JUMP = params.get("jump"), stationUrl = "../station/?embed" + (DEV ? "&dev" : "") + (TEST ? "&test" : "") + (JUMP === "arrival" || JUMP === "fork" ? "&jump=" + JUMP : ""), companionUrl = "../exploration/?embed" + (SEED != null ? "&seed=" + encodeURIComponent(SEED) : "") + (DEV ? "&dev=1" : "");

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
    { id: "left", code: "ArrowLeft", name: "Left", cls: "pad", glyph: SVG.left, g: "P", s: 56 }, { id: "up", code: "ArrowUp", name: "Up", cls: "pad", glyph: SVG.up, g: "P", s: 56 },
    { id: "down", code: "ArrowDown", name: "Down", cls: "pad", glyph: SVG.down, g: "P", s: 56 }, { id: "right", code: "ArrowRight", name: "Right", cls: "pad", glyph: SVG.right, g: "P", s: 56 },
    { id: "home", code: "KeyH", name: "Home", cls: "room home", glyph: MARK("home"), g: "R", s: 56 }, { id: "vivarium", code: "KeyB", name: "Vivarium", cls: "room vivarium", glyph: MARK("vivarium"), g: "R", s: 56 },
    { id: "research", code: "KeyR", name: "Research", cls: "room research", glyph: MARK("research"), g: "R", s: 56 }, { id: "library", code: "KeyL", name: "Library", cls: "room library", glyph: MARK("library"), g: "R", s: 56 },
    { id: "back", code: "Escape", name: "Back", cls: "round back", glyph: SVG.back, g: "A", s: 56 }, { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, g: "A", s: 64 },
  ],
  companion: [
    { id: "left", code: "ArrowLeft", name: "Left", cls: "cpad", glyph: SVG.left, g: "P", s: 56 }, { id: "up", code: "ArrowUp", name: "Up", cls: "cpad", glyph: SVG.up, g: "P", s: 56 },
    { id: "down", code: "ArrowDown", name: "Down", cls: "cpad", glyph: SVG.down, g: "P", s: 56 }, { id: "right", code: "ArrowRight", name: "Right", cls: "cpad", glyph: SVG.right, g: "P", s: 56 },
    { id: "call", code: "KeyC", name: "Call", cls: "round call", glyph: SVG.call, g: "A", s: 56 }, { id: "back", code: "Escape", name: "Back", cls: "round cback", glyph: SVG.back, g: "A", s: 56 },
    { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, g: "A", s: 64 },
  ],
};
const keyEls = { station: [], companion: [] };   // { def, el }
function buildKeys() {
  for (const dev of ["station", "companion"]) {
    const host = $(dev === "station" ? "rowStation" : "rowCompanion");
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
const GAP = [16, 8], MARGIN = [8, 4], ROWH = 72, GROUPS = { station: ["P", "R", "A"], companion: ["P", "A"] }, INNER = { P: 4, R: 8, A: 8 };
function groupOf(dev, n) {
  const defs = KEYS[dev].filter((d) => d.g === n); let x = 0; const off = {};
  defs.forEach((d, i) => { off[d.id] = x; x += d.s + (i < defs.length - 1 ? INNER[n] : 0); });
  return { n, w: x, off };
}
// returns { rows, pos: { id: [x, y] } } in CSS px inside the tray
function trayPlan(dev, T) {
  const gs = GROUPS[dev].map((n) => groupOf(dev, n)), by = Object.fromEntries(gs.map((g) => [g.n, g]));
  const need = (list, g, m) => list.reduce((a, x) => a + x.w, 0) + (list.length - 1) * g + 2 * m;
  const sizeOf = Object.fromEntries(KEYS[dev].map((d) => [d.id, d.s])), pos = {}, put = (grp, x, row) => { for (const [id, o] of Object.entries(grp.off)) pos[id] = [S(x + o), S(row * ROWH + (ROWH - sizeOf[id]) / 2)]; };
  const gm = (list) => { for (let i = 0; i < 2; i++) if (need(list, GAP[i], MARGIN[i]) <= T) return i; return -1; };
  const one = gm(gs);
  if (one >= 0) {   // one row: the D-pad at the left, the rooms centred (kept clear of both neighbours), the actions at the right
    const g = GAP[one], m = MARGIN[one], P = by.P, A = by.A, R = by.R;
    put(P, m, 0); put(A, T - m - A.w, 0);
    if (R) put(R, Math.min(Math.max((T - R.w) / 2, m + P.w + g), T - m - A.w - g - R.w), 0);
    return { rows: 1, pos };
  }
  if (dev === "station") {   // row 1 the D-pad at the left and the rooms at the right; row 2 the actions, right-aligned
    const l1 = [by.P, by.R], i1 = gm(l1), m1 = MARGIN[i1 < 0 ? 1 : i1], g1 = GAP[i1 < 0 ? 1 : i1];
    if (i1 >= 0) { put(by.P, m1, 0); put(by.R, T - m1 - by.R.w, 0); } else { const sh = (T - need(l1, g1, m1)) / 2; put(by.P, sh + m1, 0); put(by.R, sh + m1 + by.P.w + g1, 0); }
    const i2 = gm([by.A]), m2 = MARGIN[i2 < 0 ? 1 : i2];
    if (i2 >= 0) put(by.A, T - m2 - by.A.w, 1); else put(by.A, (T - by.A.w) / 2, 1);
  } else { put(by.P, (T - by.P.w) / 2, 0); put(by.A, (T - by.A.w) / 2, 1); }   // the Companion: the D-pad centred, then the actions centred
  return { rows: 2, pos };
}

// ---- layout ----
const bar = $("bar"), stage = $("stage"), shS = $("shStation"), shC = $("shCompanion"), ring = $("ring"), cradle = $("cradle"), slot = $("slot"), lamp = $("lamp"), dev = $("dev"), keysPanel = $("keysPanel");
const trayEl = { station: $("rowStation"), companion: $("rowCompanion") };
const tabs = { station: $("tabStation"), companion: $("tabCompanion") }, dockCtl = $("dockCtl"), keysBtn = $("keysBtn"), devBtn = $("devBtn"), note = $("note");
const GAPV = 24, TOP = 16, BOT = 16;   // CSS px: between blocks, from the bar, below the last block
const geom = { station: null, companion: null, caddy: null, height: 0, rows: { station: 1, companion: 1 } };   // block boxes in stage CSS px, for the scroll and the checks

function layout() {
  metrics();
  const narrow = tier === "narrow", row = tier === "row";
  // the bar: 40 CSS px, controls 40 tall
  const tabW = narrow ? 104 : 124, tw = narrow ? [12, 124] : [12, 144];
  ["station", "companion"].forEach((d, i) => { placeC(tabs[d], tw[i], 0, tabW, 40); tabs[d].classList.toggle("on", owner === d); tabs[d].setAttribute("aria-pressed", String(owner === d)); });
  const dockX = narrow ? CW - 232 : CW - 436, dockW = narrow ? 40 : 168;
  placeC(dockCtl, dockX, 0, dockW, 40);
  placeC(keysBtn, narrow ? CW - 184 : CW - 260, 0, narrow ? 64 : 92, 40);
  placeC(devBtn, narrow ? CW - 112 : CW - 160, 0, narrow ? 100 : 148, 40);
  devBtn.textContent = narrow ? "Tools" : "Developer tools"; devBtn.setAttribute("aria-label", "Developer tools"); devBtn.classList.toggle("on", devOpen); devBtn.setAttribute("aria-pressed", String(devOpen));
  layoutDock(narrow);
  // the bar's note: the narrow tier's line, or for 4000 ms after a seat, a lift or the opening's end, the Caddy's two lines as one (T-20261016-109)
  note.textContent = noteCaddy || NOTE_TEXT;
  note.classList.toggle("hidden", !narrow);
  if (narrow) placeC(note, 12, 44, Math.max(0, CW - 24), 16);
  // the column(s): the shell (the face and 8 lp all round), its key tray joined below, the Companion's cradle under its tray, the Caddy's block
  const cwid = stage.clientWidth || CW;
  const sw = Zc(1040 * f), cw = Zc(466 * f), shH = 616 * f, cradleH = 28 * f, caddyW = 808 * f, caddyH = 288 * f;
  const planS = trayPlan("station", sw), planC = trayPlan("companion", cw), trS = planS.rows * ROWH, trC = planC.rows * ROWH;
  geom.rows = { station: planS.rows, companion: planC.rows };
  const y0 = narrow ? 28 : TOP;
  let xS, xC, yS = y0, yC, caddyX, caddyY, h;
  if (narrow) { xS = 12; xC = Math.max(12, Math.floor((cwid - cw) / 2)); yC = y0; }
  else if (row) { const tot = sw + GAPV + cw, x0 = Math.floor((cwid - tot) / 2); xS = x0; xC = x0 + sw + GAPV; yC = y0; }
  else { xS = Math.floor((cwid - sw) / 2); xC = Math.floor((cwid - cw) / 2); yC = yS + shH + trS + GAPV; }
  const cradleY = yC + shH + trC;
  if (row) { caddyX = xS + sw - caddyW; caddyY = yS + shH + trS + GAPV; } else { caddyX = Math.floor((cwid - caddyW) / 2); caddyY = cradleY + cradleH + GAPV; }
  h = narrow ? Math.max(yS + shH + trS, yC + shH + trC + cradleH) + BOT : Math.max(row ? caddyY + caddyH : 0, cradleY + cradleH, row ? 0 : caddyY + caddyH) + BOT;
  geom.station = { x: xS, y: yS, w: sw, h: shH + trS }; geom.companion = { x: xC, y: yC, w: cw, h: shH + trC }; geom.height = h;
  const seatPx = seatOff * f;
  placeC(shS, xS, yS, sw, shH, true); place(frames.station, 8, 8, 1024, 600);
  placeC(shC, xC, yC + seatPx, cw, shH, true); place(frames.companion, 8, 8, 450, 600);
  placeC(trayEl.station, xS, yS + shH, sw, trS, true); placeC(trayEl.companion, xC, yC + shH, cw, trC, true);
  for (const dv of ["station", "companion"]) { const pl = dv === "station" ? planS : planC; for (const { def, el } of keyEls[dv]) { const [kx, ky] = pl.pos[def.id]; placeC(el, kx, ky, def.s, def.s); } }
  const vis = (el, on) => { el.style.visibility = on ? "visible" : "hidden"; el.style.pointerEvents = on ? "" : "none"; };
  vis(shS, !narrow || owner === "station"); vis(trayEl.station, !narrow || owner === "station"); vis(shC, !narrow || owner === "companion"); vis(trayEl.companion, !narrow || owner === "companion");
  // the cradle and the seat
  const showCradle = !narrow || owner === "companion";
  cradle.classList.toggle("hidden", !showCradle);
  if (showCradle) { placeC(cradle, xC, cradleY, cw, cradleH, true); place(slot, 16, -1, 434, 6); place(lamp, 12, 15, 8, 8); lamp.width = 8; lamp.height = 8; lamp.style.width = px(8); lamp.style.height = px(8); }
  cradle.classList.toggle("off", !caddy.canDock);
  lamp.src = "../ui/assets/masters/pods/frame-lamp-8-" + (caddy.docked ? "mint" : "stone") + ".png";
  cradle.title = dockTitle();
  // the Caddy's screen: always shown (e-paper keeps its last lines), not in the narrow tier
  caddyBlock.classList.toggle("hidden", narrow);
  if (!narrow) { placeC(caddyBlock, caddyX, caddyY, caddyW, caddyH, true); place(view, 8, 8, 792, 272); }
  // the ring round the device that has the keys: its shell and its tray
  const g = owner === "station" ? geom.station : geom.companion, top = owner === "station" ? g.y : g.y + seatPx;
  ring.classList.remove("hidden"); placeC(ring, g.x - 3 * f, top - 3 * f, g.w + 6 * f, g.y + g.h - top + 6 * f, true);
  spacer.style.top = Math.max(0, Math.ceil(h) - 1) + "px";
  // the developer tools
  dev.classList.toggle("hidden", !devOpen); dev.classList.toggle("column", row);
  if (row) placeC(dev, CW - 332, 52, 320, CH - 64); else { const w = tier === "stack" ? 360 : Math.min(360, CW); placeC(dev, CW - w, 40, w, CH - 40); }
  // the Keys ? panel
  keysPanel.classList.toggle("hidden", !keysOpen); if (keysOpen) placeC(keysPanel, Math.max(0, Math.floor((CW - 640) / 2)), 48, Math.min(640, CW), Math.min(CH - 56, 760));
  window.__playRects = rects;
}
function dockTitle() {
  const c = caddy; return !c.canDock ? "The Companion has no world yet" : c.docked ? "Lift the Companion from the Caddy" : c.crates > 0 ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion in the Caddy";
}
function layoutDock(iconOnly) {
  const c = caddy, d = c.docked, crates = !d && c.canDock && c.crates > 0, word = d ? "Lift" : "Dock";
  const mark = $("dockMark"), wordEl = $("dockWord"), hint = $("dockHint"), dot = $("dockDot");
  mark.src = "../ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png";
  placeC(mark, 11, 8, 16, 24); placeC(wordEl, 35, 12); wordEl.textContent = word; hint.style.right = "11px"; hint.style.top = "14px"; hint.textContent = "⇧D";
  placeC(dot, 25, 5, 6, 6); dot.hidden = !crates;
  wordEl.classList.toggle("hidden", iconOnly); hint.classList.toggle("hidden", iconOnly);
  dockCtl.setAttribute("aria-disabled", String(!c.canDock));
  const label = d ? "Lift the Companion from the Caddy" : crates ? "Dock the Companion in the Caddy; cargo waits aboard" : "Dock the Companion in the Caddy", title = dockTitle();
  dockCtl.setAttribute("aria-label", label); dockCtl.title = title;
  if (!c.canDock) dockCtl.setAttribute("aria-description", title); else dockCtl.removeAttribute("aria-description");
  dockCtl.classList.toggle("pressed", pressed || c.pending);
}
const rects = () => { const o = {}; for (const [n, el] of Object.entries({ station: frames.station, companion: frames.companion, shStation: shS, shCompanion: shC, trayStation: trayEl.station, trayCompanion: trayEl.companion, dock: dockCtl, cradle, lamp, caddy: caddyBlock, dev, ring })) { const r = el.getBoundingClientRect(); o[n] = [r.left, r.top, r.width, r.height]; } return o; };

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
function reveal(d) {
  const g = geom[d]; if (!g) return;
  const st = stage.scrollTop, ch = stage.clientHeight, top = g.y, bot = g.y + g.h; let t = st;
  if (bot - top + 2 * TOP > ch) t = bot - ch;   // the block and its margins do not fit: the tray's bottom meets the window's bottom, the block alone (the keys never leave the view)
  else if (top < st) t = top - TOP; else if (bot > st + ch) t = bot + TOP - ch;
  t = Math.max(0, Math.min(t, stage.scrollHeight - ch)); if (Math.abs(t - st) < 0.5) return;
  if (scrollTween) scrollTween.cancel();
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
  const t = e.target, tag = t && t.tagName; if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t && t.isContentEditable)) return;
  let hit = true;
  if (e.code === "Backquote") cycle(e.shiftKey ? -1 : 1);
  else if (e.shiftKey && e.code === "KeyD") dockPress();
  else if (e.shiftKey && e.code === "KeyT") toggleDev();
  else if (e.shiftKey && e.code === "Slash") toggleKeys();
  else if (e.code === "Escape" && keysOpen) toggleKeys(false);
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

// ---- the Dock control, the cradle and the seat (X3) ----
const live = $("live"); const say = (t) => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
function setSeat(target, animate, done) { if (!animate) { seatOff = target; layout(); done && done(); return; } seatBusy = true; tween(seatOff, target, SEAT_MS, (v) => { seatOff = Math.round(v * 1) / 1; layout(); }, () => { seatOff = target; seatBusy = false; layout(); done && done(); }); }
function askStation() {
  awaiting = caddy.docked ? "lift" : "dock";
  try { frames.station.contentWindow.postMessage({ t: "mb-dock", keysElsewhere: owner !== "station" }, location.origin); } catch { /* not loaded */ }
  clearTimeout(askTimer); askTimer = setTimeout(noReply, 1000);
}
function noReply() { if (awaiting === null) return; awaiting = null; pressed = false; setSeat(caddy.docked ? 8 : 0, false); layout(); }   // a page never sits pressed with no answer
function dockPress() {
  if (!caddy.canDock || seatBusy) return;
  if (caddy.docked) { pressed = true; layout(); askStation(); return; }   // Lift: ask at once
  pressed = true; layout();
  setSeat(8, true, () => askStation());   // Dock: seat first, then ask at the seat's end
}
dockCtl.addEventListener("click", () => { dockPress(); giveKeysBack(); });
cradle.addEventListener("click", () => dockPress());
const giveKeysBack = () => { if (document.activeElement === dockCtl) dockCtl.blur(); };
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== frames.station.contentWindow) return; const m = e.data || {}; if (m.t !== "mb-caddy") return;
  const was = caddy; caddy = { canDock: !!m.canDock, docked: !!m.docked, crates: m.crates | 0, pending: !!m.pending, opened: m.opened ?? null, partner: m.partner ?? null };   // opened, partner: the Caddy's lines (src/caddy.mjs)
  if (fontsOk) paper.show(caddy);   // the e-paper keeps its lines whether or not its sheet is up: one partial refresh per change
  if (gotCaddy && (was.docked !== caddy.docked || (caddy.opened && JSON.stringify(caddy.opened) !== JSON.stringify(was.opened)))) caddyEvent();   // a seat, a lift, the opening's end
  if (!gotCaddy) { gotCaddy = true; seatOff = caddy.docked ? 8 : 0; layout(); return; }
  if (awaiting === "dock") {
    clearTimeout(askTimer);
    if (caddy.docked) { awaiting = null; pressed = false; layout(); setOwner("station"); say("Companion docked"); }   // contact: the lamp, the control and the keys cut together
    else if (caddy.pending) { layout(); }   // kept in a hold: stay seated and pressed until the hold ends
    else { awaiting = null; pressed = false; setSeat(0, true); layout(); }   // cancelled: the rise
    return;
  }
  if (awaiting === "lift") {
    clearTimeout(askTimer);
    if (!caddy.docked) { awaiting = null; pressed = false; layout(); setOwner("companion"); say("Companion lifted"); setSeat(0, true); }
    else if (caddy.pending) { layout(); } else { awaiting = null; pressed = false; layout(); }
    return;
  }
  if (was.docked !== caddy.docked) { seatOff = caddy.docked ? 8 : 0; }   // an external change: cut, nothing animates and the keys do not move
  layout();
});

// ---- the Caddy's screen (T-20261016-109): always shown, in its own 808 × 288 lp block (the 792 × 272 view and an 8 lp bezel) ----
// Under the cradle in Stack, under the Station in Row. It is e-paper and keeps its last lines: it redraws once per change of its lines and never animates. The narrow tier has no room for it: the bar's note shows
// the two lines as one for 4000 ms at each seat, lift and the opening's end instead.
const NOTE_MS = 4000, NOTE_TEXT = note.textContent;
const caddyBlock = $("caddySheet"), view = $("caddyView"), spacer = $("spacer"), painter = canvasPainter(view), paper = createPaper(painter.draw, painter.measure);
let noteCaddy = "", noteTimer = 0, fontsOk = false;
document.fonts.load('500 28px "Inter"').then(() => document.fonts.load('500 20px "Inter"')).then(() => { fontsOk = true; if (gotCaddy) paper.show(caddy); });   // the paper draws in Inter, never a fallback
function caddyEvent() {
  if (tier !== "narrow") return;
  const l = caddyLines(caddy); noteCaddy = "Caddy: " + l.line1 + (l.line2 ? " · " + l.line2 : ""); clearTimeout(noteTimer); noteTimer = setTimeout(() => { noteCaddy = ""; layout(); }, NOTE_MS); layout();
}

// ---- boot ----
buildKeys();
for (const d of ["station", "companion"]) frames[d].addEventListener("load", () => { attach(d); if (d === "station") { if (devOpen) toggleDev(true); if (!gotLoadOwner) { gotLoadOwner = true; setOwner("station"); } } });
let gotLoadOwner = false;
frames.station.src = stationUrl; frames.companion.src = companionUrl;
if (DEV) { devOpen = true; for (const id of ["devBtn", "stamp", "helpDevK", "helpDevD"]) $(id).classList.remove("hidden"); }   // the Developer tools button, its help row and the build stamp show with ?dev only; the Shift+T key stays
let dprQuery = null;
function armDpr() { if (dprQuery) dprQuery.removeEventListener("change", onDpr); dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); dprQuery.addEventListener("change", onDpr); }
function onDpr() { layout(); armDpr(); }
armDpr(); window.addEventListener("resize", layout);
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => {
  const short = j.short || String(j.commit || "").slice(0, 7), d = new Date(j.built); let t = ""; if (!isNaN(d)) t = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  $("stamp").textContent = short ? "build " + short + (t ? " · " + t : "") : "local build";
}).catch(() => { $("stamp").textContent = "local build"; });
layout();
// for the play-page journey: read-only views of the shell's state
window.__play = { get geom() { return JSON.parse(JSON.stringify(geom)); }, get scroll() { return [stage.scrollTop, stage.clientHeight, stage.scrollHeight]; }, get owner() { return owner; }, get tier() { return tier; }, get caddy() { return { ...caddy }; }, get seatOff() { return seatOff; }, get awaiting() { return awaiting; }, get pressed() { return pressed; }, get caddySheet() { return { up: tier !== "narrow", lines: paper.lines, refreshes: paper.refreshes, note: noteCaddy }; }, rects, frames };
