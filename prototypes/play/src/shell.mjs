// The play page's shell (technical-architecture.md W1; the architect's spec): the Station and the Companion as same-origin frames side by side, the page's own keys, the Dock control, the cradle and the
// seat. The shell draws only page chrome. It never reads or writes the save (the devices cross it by the storage event, as between two tabs) and it imports nothing from station/, exploration/ or
// workbench/: it asks the Station to dock by postMessage and shows the Caddy state the Station posts back (`mb-caddy`).
//
// Lengths are in lp: one lp is `f` CSS px, so every edge lands on a whole physical pixel. Colours are the Station's 14.

const params = new URLSearchParams(location.search), TEST = params.has("test"), DEV = params.has("dev"), SEED = params.get("seed");
const $ = (id) => document.getElementById(id);
const R = 1546;   // the row's width: the Station shell, the gap and the Companion shell
const SEAT_MS = 160, EASE = [0, 0, 0.2, 1];
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- the pixel rule ----
let dpr = 1, k = 1, f = 1, W = 1920, H = 1080, tier = "wide";
function metrics() {
  dpr = window.devicePixelRatio || 1; k = Math.max(1, Math.floor(dpr)); f = k / dpr; W = Math.floor(innerWidth / f); H = Math.floor(innerHeight / f);
  document.documentElement.style.setProperty("--f", String(f));
  tier = H >= 800 && W >= 1878 ? "wide" : H >= 800 && W >= 1064 ? "standard" : W >= 1064 && H >= 672 ? "short" : "narrow";
}
const px = (lp) => Math.round(lp * k) / dpr + "px";
const place = (el, x, y, w, h) => { const s = el.style; s.left = px(x); s.top = px(y); if (w != null) s.width = px(w); if (h != null) s.height = px(h); };

// ---- state ----
let owner = "station", lastDevice = "station", ox = 0, seatOff = 0, benchRaised = false, benchLoaded = false, devOpen = false, keysOpen = false;
let caddy = { canDock: false, docked: false, crates: 0, pending: false }, gotCaddy = false;
let awaiting = null, pressed = false, askTimer = 0, seatBusy = false;
const frames = { station: $("fStation"), companion: $("fCompanion"), bench: $("fBench") };
const stationUrl = "../station/?embed" + (DEV ? "&dev" : "") + (TEST ? "&test" : ""), companionUrl = "../exploration/?embed" + (SEED != null ? "&seed=" + encodeURIComponent(SEED) : "") + (DEV ? "&dev=1" : "");

// ---- the keys (drawn keys press exactly as the keyboard does) ----
const SVG = {
  left: '<svg viewBox="0 0 16 16"><path d="M3 8l7-5v10z"/></svg>', up: '<svg viewBox="0 0 16 16"><path d="M8 3l5 7H3z"/></svg>', down: '<svg viewBox="0 0 16 16"><path d="M8 13L3 6h10z"/></svg>', right: '<svg viewBox="0 0 16 16"><path d="M13 8L6 3v10z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>', confirm: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  call: '<svg viewBox="0 0 26 26"><path d="M7 8a7 7 0 0 1 0 10M11.5 5a11 11 0 0 1 0 16M16 2.5a14.5 14.5 0 0 1 0 21"/><circle cx="4" cy="13" r="1.6" fill="#eafff9" stroke="none"/></svg>',
};
const MARK = (n) => `<img src="../ui/assets/masters/shell/shell-key-${n}-24.png" alt="">`;
// row rects are inside the 48-lp row; bar rects are in the bar (short tier: the focused device's keys, flat)
const KEYS = {
  station: [
    { id: "left", code: "ArrowLeft", name: "Left", cls: "pad", glyph: SVG.left, row: [8, 2, 44, 40], bar: [348, 4, 32, 32] },
    { id: "up", code: "ArrowUp", name: "Up", cls: "pad", glyph: SVG.up, row: [56, 2, 44, 40], bar: [384, 4, 32, 32] },
    { id: "down", code: "ArrowDown", name: "Down", cls: "pad", glyph: SVG.down, row: [104, 2, 44, 40], bar: [420, 4, 32, 32] },
    { id: "right", code: "ArrowRight", name: "Right", cls: "pad", glyph: SVG.right, row: [152, 2, 44, 40], bar: [456, 4, 32, 32] },
    { id: "home", code: "KeyH", name: "Home", cls: "room home", glyph: MARK("home"), row: [396, 2, 40, 40], bar: [500, 4, 32, 32] },
    { id: "vivarium", code: "KeyB", name: "Vivarium", cls: "room vivarium", glyph: MARK("vivarium"), row: [460, 2, 40, 40], bar: [540, 4, 32, 32] },
    { id: "research", code: "KeyR", name: "Research", cls: "room research", glyph: MARK("research"), row: [524, 2, 40, 40], bar: [580, 4, 32, 32] },
    { id: "library", code: "KeyL", name: "Library", cls: "room library", glyph: MARK("library"), row: [588, 2, 40, 40], bar: [620, 4, 32, 32] },
    { id: "back", code: "Escape", name: "Back", cls: "round back", glyph: SVG.back, row: [920, 14, 28, 28], bar: [664, 4, 32, 32] },
    { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, row: [968, 2, 40, 40], bar: [704, 4, 32, 32] },
  ],
  companion: [
    { id: "left", code: "ArrowLeft", name: "Left", cls: "cpad", glyph: SVG.left, row: [8, 2, 44, 40], bar: [348, 4, 32, 32] },
    { id: "up", code: "ArrowUp", name: "Up", cls: "cpad", glyph: SVG.up, row: [56, 2, 44, 40], bar: [384, 4, 32, 32] },
    { id: "down", code: "ArrowDown", name: "Down", cls: "cpad", glyph: SVG.down, row: [104, 2, 44, 40], bar: [420, 4, 32, 32] },
    { id: "right", code: "ArrowRight", name: "Right", cls: "cpad", glyph: SVG.right, row: [152, 2, 44, 40], bar: [456, 4, 32, 32] },
    { id: "call", code: "KeyC", name: "Call", cls: "round call", glyph: SVG.call, row: [314, 14, 28, 28], bar: [500, 4, 32, 32] },
    { id: "back", code: "Escape", name: "Back", cls: "round cback", glyph: SVG.back, row: [358, 14, 28, 28], bar: [540, 4, 32, 32] },
    { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", glyph: SVG.confirm, row: [402, 2, 40, 40], bar: [580, 4, 32, 32] },
  ],
};
const keyEls = { station: [], companion: [] };   // { def, row, bar }
function buildKeys() {
  for (const dev of ["station", "companion"]) {
    const rowHost = $(dev === "station" ? "rowStation" : "rowCompanion"), barHost = $("bar");
    for (const def of KEYS[dev]) {
      const mk = (cls) => { const b = document.createElement("button"); b.type = "button"; b.className = cls; b.innerHTML = def.glyph; b.setAttribute("aria-label", def.name); b.tabIndex = -1; wireKey(b, dev, def); return b; };
      const row = mk("k " + def.cls), bar = mk("bk " + def.cls.replace(/\bpad\b/, "pad").replace(/\bcpad\b/, "cpad"));
      rowHost.appendChild(row); barHost.appendChild(bar); keyEls[dev].push({ def, row, bar });
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

// ---- layout ----
const bar = $("bar"), stage = $("stage"), shS = $("shStation"), shC = $("shCompanion"), ring = $("ring"), cradle = $("cradle"), slot = $("slot"), lamp = $("lamp"), band = $("band"), bench = $("bench"), handle = $("benchHandle"), dev = $("dev"), keysPanel = $("keysPanel");
const tabs = { station: $("tabStation"), companion: $("tabCompanion"), bench: $("tabBench") }, dockCtl = $("dockCtl"), keysBtn = $("keysBtn"), devBtn = $("devBtn"), note = $("note");
const shown = () => (owner === "bench" ? lastDevice : owner);
const hasShelf = () => tier === "wide" && H >= 1072;
const panTarget = () => (tier === "standard" || tier === "short" ? (owner === "companion" ? W - R : owner === "station" ? 0 : ox) : 0);
let panTween = null;

function layout() {
  metrics();
  const wide = tier === "wide", short = tier === "short", narrow = tier === "narrow", tall = !short;
  stage.classList.toggle("scroll", narrow);
  const cyBase = narrow ? 68 : short ? 48 : 52;
  if (!panTween) ox = panTarget();
  const oxr = Math.round(ox);
  // the bar
  place(bar, 0, 0, W, 40);
  const tw = short || narrow ? [12, 124, 236] : [12, 144, 276], tabW = short || narrow ? 104 : 124;
  ["station", "companion", "bench"].forEach((d, i) => { place(tabs[d], tw[i], 4, tabW, 32); tabs[d].classList.toggle("on", owner === d); });
  const iconOnly = narrow || (short && W < 1104);
  const dockX = narrow ? W - 232 : short ? (iconOnly ? W - 232 : W - 360) : W - 436, dockW = iconOnly ? 40 : 168;
  place(dockCtl, dockX, 4, dockW, 32);
  place(keysBtn, short || narrow ? W - 184 : W - 260, 4, short || narrow ? 64 : 92, 32);
  place(devBtn, short || narrow ? W - 112 : W - 160, 4, short || narrow ? 100 : 148, 32);
  devBtn.textContent = short || narrow ? "Tools" : "Developer tools"; devBtn.setAttribute("aria-label", "Developer tools"); devBtn.classList.toggle("on", devOpen); devBtn.setAttribute("aria-pressed", String(devOpen));
  layoutDock(iconOnly);
  note.classList.toggle("hidden", !narrow); if (narrow) place(note, 12, 44, W - 24, 16);
  // shells
  const sx = narrow ? 12 : 12 + oxr, sh = short ? 616 : 672;
  place(shS, sx, cyBase, 1040, sh); place(frames.station, 8, 8, 1024, 600); place($("rowStation"), 8, 616, 1024, 48);
  const cx = narrow ? Math.max(12, Math.floor((W - 466) / 2)) : 1068 + oxr;
  place(shC, cx, cyBase + (tall ? seatOff : 0), 466, sh); place(frames.companion, 8, 8, 450, 600); place($("rowCompanion"), 8, 616, 450, 48);
  $("rowStation").classList.toggle("hidden", short); $("rowCompanion").classList.toggle("hidden", short);
  for (const dv of ["station", "companion"]) for (const { def, row, bar: b } of keyEls[dv]) { place(row, ...def.row); place(b, ...def.bar); }
  for (const dv of ["station", "companion"]) for (const { bar: b } of keyEls[dv]) b.classList.toggle("hidden", !(short && owner === dv));
  const vis = (el, on) => { el.style.visibility = on ? "visible" : "hidden"; el.style.pointerEvents = on ? "" : "none"; };
  vis(shS, !narrow || shown() === "station"); vis(shC, !narrow || shown() === "companion");
  // the cradle and the seat; the short tier has a band instead
  const showCradle = tall && (!narrow || shown() === "companion");
  cradle.classList.toggle("hidden", !showCradle); band.classList.toggle("hidden", !(short));
  if (showCradle) { place(cradle, cx, cyBase + 676, 466, 28); place(slot, 16, -1, 434, 6); place(lamp, 12, 15, 8, 8); lamp.width = 8; lamp.height = 8; lamp.style.width = px(8); lamp.style.height = px(8); }
  if (short) place(band, cx, cyBase + 618, 466, 4);
  cradle.classList.toggle("off", !caddy.canDock); band.classList.toggle("docked", caddy.docked);
  lamp.src = "../ui/assets/masters/pods/frame-lamp-8-" + (caddy.docked ? "mint" : "stone") + ".png";
  cradle.title = dockTitle();
  // the ring on the keys owner's shell (or the bench)
  const ringTarget = owner === "station" ? [sx, cyBase, 1040, sh] : owner === "companion" ? [cx, cyBase + (tall ? seatOff : 0), 466, sh] : null;
  // the bench
  layoutBench(); const benchRect = benchBox();
  if (ringTarget) { ring.classList.remove("hidden"); place(ring, ringTarget[0] - 3, ringTarget[1] - 3, ringTarget[2] + 6, ringTarget[3] + 6); }
  else if (benchRect) { ring.classList.remove("hidden"); place(ring, benchRect[0] - 3, benchRect[1] - 3, benchRect[2] + 6, benchRect[3] + 6); } else ring.classList.add("hidden");
  // the developer tools
  dev.classList.toggle("hidden", !devOpen); dev.classList.toggle("column", wide);
  if (wide) place(dev, W - 332, 52, 320, H - 64); else { const w = tier === "standard" ? 360 : Math.min(360, W); place(dev, W - w, 40, w, H - 40); }
  // the Keys ? panel
  keysPanel.classList.toggle("hidden", !keysOpen); if (keysOpen) place(keysPanel, Math.max(0, Math.floor((W - 640) / 2)), 48, Math.min(640, W), Math.min(H - 56, 760));
  // the scroll area: narrow content may be wider than the window
  stage.style.top = "0"; window.__playRects = rects;
}
const benchBox = () => (bench.classList.contains("hidden") ? (handle.classList.contains("hidden") ? null : [0, H - 40, W, 40]) : hasShelf() ? [12, 760, R - 24, H - 772] : [0, 40, W, H - 40]);
function layoutBench() {
  const shelf = hasShelf(), sheet = benchRaised && !shelf, showHandle = !shelf && !benchRaised && (tier === "wide" || tier === "standard");
  const container = shelf || sheet;
  bench.classList.toggle("hidden", !container); handle.classList.toggle("hidden", !showHandle);
  if (container && !benchLoaded) { benchLoaded = true; frames.bench.src = "../workbench/"; }
  if (container) {
    const r = shelf ? [12, 760, R - 24, H - 772] : [0, 40, W, H - 40]; place(bench, ...r);
    const header = $("bench").querySelector("header"); place(header, 0, 0, r[2] - 2, 32); place($("benchTitle"), 12, 6); place($("benchLower"), r[2] - 2 - 98, 0, 90, 32); $("benchLower").classList.toggle("hidden", shelf);
    place(frames.bench, 0, 32, r[2] - 2, r[3] - 34);
  }
  if (showHandle) { place(handle, 0, H - 40, W, 40); place(handle.firstElementChild, 12, 10); }
}
function dockTitle() {
  const c = caddy; return !c.canDock ? "The Companion has no world yet" : c.docked ? "Lift the Companion from the Caddy" : c.crates > 0 ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion in the Caddy";
}
function layoutDock(iconOnly) {
  const c = caddy, d = c.docked, crates = !d && c.canDock && c.crates > 0, word = d ? "Lift" : "Dock";
  const mark = $("dockMark"), wordEl = $("dockWord"), hint = $("dockHint"), dot = $("dockDot");
  mark.src = "../ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png";
  place(mark, 11, 3); mark.style.width = px(16); mark.style.height = px(24);
  place(wordEl, 35, 7); wordEl.textContent = word; hint.style.right = px(11); hint.style.top = px(10); hint.textContent = "⇧D";
  dot.style.left = px(25); dot.style.top = px(1); dot.style.width = px(6); dot.style.height = px(6); dot.hidden = !crates;
  wordEl.classList.toggle("hidden", iconOnly); hint.classList.toggle("hidden", iconOnly);
  dockCtl.setAttribute("aria-disabled", String(!c.canDock));
  const label = d ? "Lift the Companion from the Caddy" : crates ? "Dock the Companion in the Caddy; cargo waits aboard" : "Dock the Companion in the Caddy", title = dockTitle();
  dockCtl.setAttribute("aria-label", label); dockCtl.title = title;
  if (!c.canDock) dockCtl.setAttribute("aria-description", title); else dockCtl.removeAttribute("aria-description");
  dockCtl.classList.toggle("pressed", pressed || c.pending);
}
const rects = () => { const o = {}; for (const [n, el] of Object.entries({ station: frames.station, companion: frames.companion, dock: dockCtl, cradle, lamp, bench, handle, dev, ring })) { const r = el.getBoundingClientRect(); o[n] = [r.left, r.top, r.width, r.height]; } return o; };

// ---- animation (the pan, the seat and the rise: one curve, whole physical pixels) ----
const bez = (t) => { const [x1, y1, x2, y2] = EASE; let u = t; for (let i = 0; i < 8; i++) { const x = 3 * (1 - u) ** 2 * u * x1 + 3 * (1 - u) * u * u * x2 + u ** 3 - t, d = 3 * (1 - u) ** 2 * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2); if (Math.abs(d) < 1e-6) break; u -= x / d; } return 3 * (1 - u) ** 2 * u * y1 + 3 * (1 - u) * u * u * y2 + u ** 3; };
function tween(from, to, ms, set, done) {
  if (reduced() || ms <= 0 || from === to) { set(to); done && done(); return { cancel() {} }; }
  const t0 = performance.now(); let dead = false;
  const step = (now) => { if (dead) return; const t = Math.min(1, (now - t0) / ms); set(from + (to - from) * bez(t)); if (t < 1) requestAnimationFrame(step); else done && done(); };
  requestAnimationFrame(step); return { cancel() { dead = true; } };
}
function panTo(target) {
  if (panTween) panTween.cancel(); const from = ox;
  if (target === from) { panTween = null; return; }
  panTween = tween(from, target, SEAT_MS, (v) => { ox = v; layout(); }, () => { ox = target; panTween = null; layout(); });
}

// ---- who has the keys ----
function giveKeys(d) { const fr = frames[d]; try { fr.focus(); fr.contentWindow && fr.contentWindow.focus(); } catch { /* not loaded yet */ } }
function setOwner(d, opts = {}) {
  const focus = opts.focus !== false;
  if (d === owner && !opts.force) { if (focus) giveKeys(d); return; }
  const prev = owner; owner = d; if (d !== "bench") lastDevice = d;
  if (d === "bench") { if (!hasShelf()) benchRaised = true; } else if (!hasShelf() && prev === "bench") benchRaised = false;
  const tgt = panTarget(); if (tgt !== ox && !panTween) panTo(tgt); else if (panTween) { panTween.cancel(); panTween = null; panTo(tgt); }
  layout(); if (focus) giveKeys(d);
}
const order = ["station", "companion", "bench"];
const cycle = (dir) => setOwner(order[(order.indexOf(owner) + dir + order.length) % order.length]);

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
window.addEventListener("blur", () => setTimeout(() => { const a = document.activeElement; for (const d of ["station", "companion", "bench"]) if (a === frames[d] && owner !== d) setOwner(d, { focus: false }); }, 0));
shS.addEventListener("pointerdown", () => { if (owner !== "station") setOwner("station"); });
shC.addEventListener("pointerdown", () => { if (owner !== "companion") setOwner("companion"); });
bench.addEventListener("pointerdown", () => { if (owner !== "bench") setOwner("bench"); });
handle.addEventListener("click", () => setOwner("bench"));
$("benchLower").addEventListener("click", () => { benchRaised = false; setOwner(lastDevice); layout(); });
tabs.station.addEventListener("click", () => { setOwner("station"); }); tabs.companion.addEventListener("click", () => { setOwner("companion"); }); tabs.bench.addEventListener("click", () => { if (owner === "bench" && !hasShelf()) { benchRaised = false; setOwner(lastDevice); } else setOwner("bench"); });
function toggleDev(on = !devOpen) { devOpen = on; layout(); try { frames.station.contentWindow.postMessage({ t: "mb-dev", on: devOpen }, location.origin); } catch { /* not loaded */ } if (document.activeElement && document.activeElement.closest && document.activeElement.closest("#bar")) giveKeys(owner); }
devBtn.addEventListener("click", () => { toggleDev(); giveKeys(owner); });
function toggleKeys(on = !keysOpen) { keysOpen = on; layout(); }
keysBtn.addEventListener("click", () => toggleKeys());

// ---- the Dock control, the cradle and the seat (X3) ----
const live = $("live"); const say = (t) => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
function setSeat(target, animate, done) { if (tier === "short" || !animate) { seatOff = tier === "short" ? 0 : target; layout(); done && done(); return; } seatBusy = true; tween(seatOff, target, SEAT_MS, (v) => { seatOff = Math.round(v * 1) / 1; layout(); }, () => { seatOff = target; seatBusy = false; layout(); done && done(); }); }
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
  const was = caddy; caddy = { canDock: !!m.canDock, docked: !!m.docked, crates: m.crates | 0, pending: !!m.pending };
  if (!gotCaddy) { gotCaddy = true; seatOff = caddy.docked && tier !== "short" ? 8 : 0; layout(); return; }
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
  if (was.docked !== caddy.docked) { seatOff = caddy.docked && tier !== "short" ? 8 : 0; }   // an external change: cut, nothing animates and the keys do not move
  layout();
});

// ---- boot ----
buildKeys();
frames.bench.addEventListener("load", () => attach("bench"));
for (const d of ["station", "companion"]) frames[d].addEventListener("load", () => { attach(d); if (d === "station") { if (devOpen) toggleDev(true); if (!gotLoadOwner) { gotLoadOwner = true; setOwner("station"); } } });
let gotLoadOwner = false;
frames.station.src = stationUrl; frames.companion.src = companionUrl;
if (DEV) devOpen = true;
let dprQuery = null;
function armDpr() { if (dprQuery) dprQuery.removeEventListener("change", onDpr); dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); dprQuery.addEventListener("change", onDpr); }
function onDpr() { layout(); armDpr(); }
armDpr(); window.addEventListener("resize", layout);
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => {
  const short = j.short || String(j.commit || "").slice(0, 7), d = new Date(j.built); let t = ""; if (!isNaN(d)) t = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  $("stamp").textContent = short ? "build " + short + (t ? " · " + t : "") : "local build";
}).catch(() => { $("stamp").textContent = "local build"; });
layout();
// for the play-page journey: read-only views of the shell's state
window.__play = { get owner() { return owner; }, get tier() { return tier; }, get caddy() { return { ...caddy }; }, get seatOff() { return seatOff; }, get awaiting() { return awaiting; }, get pressed() { return pressed; }, rects, frames };
