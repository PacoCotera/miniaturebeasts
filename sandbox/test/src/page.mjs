// The test page: the Station and the Companion as two same-origin frames (the standalone pages' screens, `?embed&raw`), one shown at a time, with the page's own keys, switch, Dock control, menu
// and footer. The page draws no screen. It never reads or writes the save: the devices cross it by the storage event, as between two tabs, and the Station answers the Dock by postMessage
// (`mb-dock`, `mb-caddy`). Where everything goes is src/layout.mjs; this file applies it.
import { layout, hardware, menuLayout, classify, SIZES, snap, render } from "./layout.mjs";
import { footerParts, loadBuild, caddyAnswers } from "../../play/src/footer.mjs";

const params = new URLSearchParams(location.search), DEV = params.has("dev"), TEST = params.has("test"), SEED = params.get("seed");
const $ = (id) => document.getElementById(id);
const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* the choice lasts the visit */ } } };
const R2 = (v) => Math.round(v + 1e-9);

// ---- the dev override of the safe area: ?safe=top,right,bottom,left (px) stands in for env(safe-area-inset-*) ----
function safeArea() {
  const q = DEV ? params.get("safe") : null;
  if (q) { const v = q.split(",").map((x) => Math.max(0, parseFloat(x) || 0)); return { t: v[0] || 0, r: v[1] || 0, b: v[2] || 0, l: v[3] || 0 }; }
  const cs = getComputedStyle($("probe")), n = (p) => parseFloat(cs.getPropertyValue(p)) || 0;
  return { t: n("padding-top"), r: n("padding-right"), b: n("padding-bottom"), l: n("padding-left") };
}

// ---- state ----
const S = {
  shown: store.get("mb-test-device") === "companion" ? "companion" : "station",
  view: store.get("mb-test-view") === "full" ? "full" : "hardware",   // the desktop's choice; phones are always the full-screen view
  menu: false, drawer: false, dirty: { station: false, companion: false },
  caddy: { canDock: false, docked: false, crates: 0, pending: false }, gotCaddy: false, awaiting: null,
  build: null, caddyUp: null, events: [], hint: store.get("mb-test-hint") !== "1",
};
const frames = { station: $("fStation"), companion: $("fCompanion") };
const fsApi = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen) && document.fullscreenEnabled !== false;
let cur = null;   // the last applied layout, for the hooks

// ---- the frames ----
const frameUrl = {
  station: "../station/?embed&raw" + (DEV ? "&dev" : "") + (TEST ? "&test" : ""),
  companion: "../exploration/?embed&raw" + (SEED != null ? "&seed=" + encodeURIComponent(SEED) : "") + (DEV ? "&dev=1" : "") + (TEST ? "&test" : ""),
};
frames.station.src = frameUrl.station; frames.companion.src = frameUrl.companion;
const win = (d) => { try { return frames[d].contentWindow; } catch { return null; } };
const canvasOf = (d) => { try { return frames[d].contentDocument.getElementById("screen"); } catch { return null; } };

// ---- the keys ----
const SV = {
  up: '<svg viewBox="0 0 16 16"><path d="M8 3l5 7H3z"/></svg>', left: '<svg viewBox="0 0 16 16"><path d="M3 8l7-5v10z"/></svg>', right: '<svg viewBox="0 0 16 16"><path d="M13 8L6 3v10z"/></svg>', down: '<svg viewBox="0 0 16 16"><path d="M8 13L3 6h10z"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H6M11 6l-6 6 6 6"/></svg>', confirm: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  call: '<svg viewBox="0 0 26 26"><path d="M7 8a7 7 0 0 1 0 10M11.5 5a11 11 0 0 1 0 16M16 2.5a14.5 14.5 0 0 1 0 21"/><circle cx="4" cy="13" r="1.6" fill="#eafff9" stroke="none"/></svg>',
};
const MARK = (n) => `<img src="../ui/assets/masters/shell/shell-key-${n}-24.png" alt="">`;
const DEFS = {
  station: [
    { id: "up", code: "ArrowUp", name: "Up", cls: "pad", html: SV.up, g: 0.4 }, { id: "down", code: "ArrowDown", name: "Down", cls: "pad", html: SV.down, g: 0.4 },
    { id: "left", code: "ArrowLeft", name: "Left", cls: "pad", html: SV.left, g: 0.4 }, { id: "right", code: "ArrowRight", name: "Right", cls: "pad", html: SV.right, g: 0.4 },
    { id: "home", code: "KeyH", name: "Home", cls: "room home", html: MARK("home") }, { id: "habitat", code: "KeyB", name: "Vivarium", cls: "room vivarium", html: MARK("vivarium") },
    { id: "research", code: "KeyR", name: "Research", cls: "room research", html: MARK("research") }, { id: "library", code: "KeyL", name: "Library", cls: "room library", html: MARK("library") },
    { id: "back", code: "Escape", name: "Back", cls: "round back", html: SV.back, g: 0.39 }, { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", html: SV.confirm, g: 0.43 },
  ],
  companion: [
    { id: "up", code: "ArrowUp", name: "Up", cls: "cpad", html: SV.up, g: 0.3 }, { id: "down", code: "ArrowDown", name: "Down", cls: "cpad", html: SV.down, g: 0.3 },
    { id: "left", code: "ArrowLeft", name: "Left", cls: "cpad", html: SV.left, g: 0.3 }, { id: "right", code: "ArrowRight", name: "Right", cls: "cpad", html: SV.right, g: 0.3 },
    { id: "call", code: "KeyC", name: "Call", cls: "round call", html: SV.call, g: 0.48 },
    { id: "back", code: "Escape", name: "Back", cls: "round cback", html: '<span class="cap b"></span>', g: 0.67 }, { id: "confirm", code: "Enter", name: "Confirm", cls: "round confirm", html: '<span class="cap c"></span>', g: 0.43 },
  ],
};
const KEYNAMES = { Enter: "Enter", Escape: "Escape", Space: " ", Backspace: "Backspace", NumpadEnter: "Enter" };
function fire(dev, type, code) {
  const w = win(dev); if (!w) return;
  try { w.dispatchEvent(new w.KeyboardEvent(type, { code, key: KEYNAMES[code] || code, bubbles: true, cancelable: true })); } catch { /* the frame is reloading */ }
}
const keyEls = [];   // { dev, id, set, el }
function wireKey(el, dev, def) {
  let down = false;
  const up = () => { if (!down) return; down = false; el.classList.remove("dn"); fire(dev, "keyup", def.code); };
  el.addEventListener("pointerdown", (e) => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* no capture */ } down = true; el.classList.add("dn"); fire(dev, "keydown", def.code); });
  el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("lostpointercapture", up);
  el.addEventListener("click", (e) => e.preventDefault());
}
function buildKeys(set, host, prefix) {
  for (const dev of ["station", "companion"]) for (const def of DEFS[dev]) {
    const b = document.createElement("button"); b.type = "button"; b.className = "fk " + def.cls; b.innerHTML = def.html; b.setAttribute("aria-label", def.name); b.tabIndex = -1; b.dataset.r = prefix + "-" + dev + "-" + def.id; b.dataset.dev = dev;
    wireKey(b, dev, def); host(dev).appendChild(b); keyEls.push({ dev, id: def.id, set, el: b, def });
  }
}
const place = (el, r, g) => { const s = el.style; s.left = R2(r[0] * dpr) / dpr + "px"; s.top = R2(r[1] * dpr) / dpr + "px"; s.width = r[2] + "px"; s.height = r[3] + "px"; if (g) s.setProperty("--g", Math.round(Math.min(r[2], r[3]) * g) + "px"); };
const hubs = {};
for (const dev of ["station", "companion"]) { const h = document.createElement("div"); h.className = "hub" + (dev === "companion" ? " c" : ""); h.dataset.r = "hub-" + dev; $("fsKeys").appendChild(h); hubs[dev] = h; }
buildKeys("fs", () => $("fsKeys"), "k");
// hardware keys live in their shell's key area
const pglow = { station: document.createElement("div"), companion: document.createElement("div") };
for (const d of ["station", "companion"]) { pglow[d].className = "pad-glow"; $(d === "station" ? "ctlSt" : "ctlCo").appendChild(pglow[d]); }
buildKeys("hw", (dev) => $(dev === "station" ? "ctlSt" : "ctlCo"), "hk");
const hubHw = { station: document.createElement("div"), companion: document.createElement("div") };
for (const d of ["station", "companion"]) { hubHw[d].className = "hub" + (d === "companion" ? " c" : ""); $(d === "station" ? "ctlSt" : "ctlCo").appendChild(hubHw[d]); }

// ---- measuring ----
let W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1, safe = safeArea(), coarse = false;
function measure() { W = innerWidth; H = innerHeight; dpr = devicePixelRatio || 1; safe = safeArea(); try { coarse = matchMedia("(pointer: coarse)").matches; } catch { coarse = false; } }
const setR = (el, r) => { if (!r) { el.hidden = true; return false; } el.hidden = false; const s = el.style; s.left = R2(r[0] * dpr) / dpr + "px"; s.top = R2(r[1] * dpr) / dpr + "px"; s.width = r[2] + "px"; s.height = r[3] + "px"; return true; };

// ---- apply: the layout of the moment ----
function effectiveView(kind) { return kind !== "desktop" ? "full" : (W < 880 || H < 560 || (S.shown === "companion" && H < (coarse ? 52 : 40) + 704 + 28)) ? "full" : S.view; }
function frameStyle(dev, face, s) {
  const fr = frames[dev], st = fr.style;
  const x = R2(face[0] * dpr) / dpr, y = R2(face[1] * dpr) / dpr;
  st.transform = "translate(" + x + "px," + y + "px) scale(" + s + ")";
  fr.classList.toggle("off", S.shown !== dev);
  const cv = canvasOf(dev); if (cv) cv.style.imageRendering = render(dev, s, dpr);
}
function apply() {
  measure();
  const kind = classify(W, H), view = effectiveView(kind), dev = S.shown;
  const Ls = layout({ W, H, dpr, safe, device: "station", touch: coarse, dev: DEV }), Lc = layout({ W, H, dpr, safe, device: "companion", touch: coarse, dev: DEV });
  const L = dev === "station" ? Ls : Lc; cur = { L, kind, view, W, H, dpr, safe };
  const rg = L.regions, world = $("world");
  document.documentElement.dataset.kind = kind; document.documentElement.dataset.view = view;
  const hw = view === "hardware";
  world.classList.toggle("hw", hw);
  // chrome
  const touchBar = kind !== "desktop" || coarse;
  setR($("bar"), kind === "landscape" ? null : rg.bar);
  const sw = $("sw"); setR(sw, rg.switch); sw.classList.toggle("glyphs", kind === "landscape");
  for (const [id, key] of [["swSt", "switchStation"], ["swCo", "switchCompanion"]]) { const b = $(id), r = rg[key]; b.style.left = r[0] - rg.switch[0] + "px"; b.style.width = r[2] + "px"; b.style.fontSize = kind === "desktop" ? "13px" : "14px"; b.setAttribute("aria-pressed", String(dev === (id === "swSt" ? "station" : "companion"))); }
  const dotHalf = rg[S.shown === "station" ? "switchCompanion" : "switchStation"], dot = $("swDot");
  dot.hidden = !S.dirty[S.shown === "station" ? "companion" : "station"]; dot.style.left = dotHalf[0] - rg.switch[0] + dotHalf[2] - 11 + "px"; dot.style.top = "4px";
  setR($("dockCtl"), rg.dock); $("dockHint").hidden = kind !== "desktop";
  const wide = kind === "landscape";
  setR($("flagBtn"), DEV ? rg.flag : null); $("flagWord").hidden = !(kind === "desktop" || wide); $("flagHint").hidden = kind !== "desktop";
  setR($("drawerBtn"), DEV && kind === "desktop" ? rg.drawer : null);
  const menuShown = kind !== "desktop" && menuHasRows(dev); setR($("menuBtn"), menuShown ? rg.menu : null); $("menuWord").hidden = !wide;
  const fsBtn = $("fsBtn"); setR(fsBtn, kind === "desktop" && view === S.view ? rg.fullscreen : null); const exitWord = view === "full"; $("fsWord").textContent = exitWord ? "Exit" : "Full screen"; fsBtn.querySelector(".hint").hidden = !exitWord; fsBtn.title = exitWord ? "Exit full screen (F)" : "Full screen (F)";
  fsBtn.setAttribute("aria-label", view === "full" ? "Exit full screen" : "Full screen");
  for (const id of ["dockCtl", "flagBtn", "drawerBtn", "menuBtn", "fsBtn"]) $(id).style.fontSize = kind === "desktop" ? "13px" : "14px";
  const last = $("last"); setR(last, DEV ? rg.last : null); last.classList.toggle("wrap", kind === "landscape"); last.style.fontSize = kind === "desktop" ? "13px" : "12px";
  if (kind === "desktop") last.style.lineHeight = "18px"; else last.style.lineHeight = "16px";
  const foot = $("foot"); setR(foot, rg.foot); foot.classList.toggle("compact", kind !== "desktop"); foot.classList.toggle("stack", kind === "landscape");
  const showHint = kind === "portrait" && dev === "station" && S.hint; if (showHint) store.set("mb-test-hint", "1"); if (kind === "landscape") S.hint = false; setR($("hint"), showHint ? rg.hint : null);
  // faces and keys
  for (const [d, LL] of [["station", Ls], ["companion", Lc]]) {
    if (hw) continue;
    frameStyle(d, LL.face, LL.s);
  }
  $("hwSt").hidden = !(hw && dev === "station"); $("hwCo").hidden = !(hw && dev === "companion"); $("caddyRow").hidden = !(hw && dev === "station");
  if (hw) applyHardware(); else { $("world").scrollTop = 0; }
  for (const k of keyEls) {
    const fs = k.set === "fs", show = !hw ? fs && k.dev === dev : !fs && k.dev === dev;
    k.el.hidden = !show; if (!show) continue;
    if (fs) { const r = L.keys[k.id]; if (!r) { k.el.hidden = true; continue; } place(k.el, r, k.def.g); const kk = k.el; kk.classList.toggle("compact", false); }
  }
  for (const d of ["station", "companion"]) { const hb = hubs[d], K = (d === dev ? L : null)?.keys; if (hw || !K || !K.left || !K.up || (d === "station" && kind === "landscape")) { hb.hidden = true; continue; } hb.hidden = false; place(hb, [K.up[0], K.left[1], K.up[2], K.up[3]]); }
  // the menu and the drawer
  if (S.menu && !menuShown) closeMenu(); renderMenu(); renderDrawer();
  $("fsBtn").classList.toggle("lit", false);
  updateDock(); drawFooter(); drawLast();
  document.documentElement.style.setProperty("--dpr", String(dpr));
}

// ---- the hardware view ----
function applyHardware() {
  const dev = S.shown, world = $("world"), hwv = hardware({ W, H, dpr, device: dev, touch: coarse });
  if (dev === "station") {
    const z = SIZES.hardware.station, s = hwv.s, shell = $("hwSt"), x = (W - hwv.shellW) / 2, y = hwv.top;
    shell.style.left = R2(x) + "px"; shell.style.top = y + "px"; shell.style.width = hwv.shellW + "px"; shell.style.height = hwv.shellH + "px";
    $("holeSt").style.width = 1024 * s + "px"; $("holeSt").style.margin = "0 auto"; $("holeSt").style.height = 600 * s + "px";
    const ct = $("ctlSt"); ct.style.height = "236px";
    // keys inside the controls area (its left edge is the shell's inner edge)
    const cW = hwv.inner, p = z.pad, padX = 12, padY = 24;
    const confirmX = cW - 18 - z.confirm, confirmY = padY + (3 * p - z.confirm) / 2, backX = confirmX - 26 - z.back, backY = confirmY + z.confirm - z.back;
    const viewsW = 4 * z.room + 3 * 14, viewsX = (padX + 3 * p + backX) / 2 - viewsW / 2, viewsY = padY + (3 * p - z.room) / 2;
    const pos = { up: [padX + p, padY, p, p], left: [padX, padY + p, p, p], right: [padX + 2 * p, padY + p, p, p], down: [padX + p, padY + 2 * p, p, p], confirm: [confirmX, confirmY, z.confirm, z.confirm], back: [backX, backY, z.back, z.back] };
    ["home", "habitat", "research", "library"].forEach((id, i) => { pos[id] = [viewsX + i * (z.room + 14), viewsY, z.room, z.room]; });
    for (const k of keyEls) if (k.set === "hw" && k.dev === "station") place(k.el, pos[k.id], k.def.g);
    const hb = hubHw.station; hb.hidden = false; place(hb, [padX + p, padY + p, p, p]); const pg = pglow.station; pg.style.cssText = `left:${padX - 10}px;top:${padY - 10}px;width:${3 * p + 20}px;height:${3 * p + 20}px`;
    frameStyle("station", [x + 26 + (cW - 24 - 1024 * s) / 2, y + 42, 1024 * s, 600 * s], s);
    const cy = Math.max(y + hwv.shellH + 14, H), cr = $("caddyRow"); cr.style.left = "0px"; cr.style.width = W + "px"; cr.style.top = R2(cy) + "px"; cr.style.height = "112px";
    $("world").style.setProperty("--end", R2(cy + 112 + 60) + "px"); ensureSpacer(cy + 112 + 60);
    frameStyle("companion", [0, 0, 450, 600], 1);
  } else {
    const z = SIZES.hardware.companion, s = hwv.s, dv = $("hwCo"), x = (W - 522 * s) / 2, y = hwv.top;
    dv.style.left = R2(x) + "px"; dv.style.top = y + "px"; dv.style.transform = "scale(" + s + ")";
    const p = z.pad, pos = { up: [p, 0, p, p], left: [0, p, p, p], right: [2 * p, p, p, p], down: [p, 2 * p, p, p] };
    const off = 40; for (const id of ["up", "left", "right", "down"]) pos[id] = [pos[id][0] + off, pos[id][1], p, p];
    pos.call = [322, 9, z.call, z.call]; pos.back = [322, 87, z.back, z.back]; pos.confirm = [398, 32, z.confirm, z.confirm];
    for (const k of keyEls) if (k.set === "hw" && k.dev === "companion") place(k.el, pos[k.id], k.def.g);
    const hb = hubHw.companion; hb.hidden = false; place(hb, [off + p, p, p, p]); const pg = pglow.companion; pg.style.cssText = `left:${off - 8}px;top:-8px;width:${3 * p + 16}px;height:${3 * p + 16}px`;
    frameStyle("companion", [x + 36 * s, y + 48 * s, 450 * s, 600 * s], s);
    ensureSpacer(y + 832 * s + 40);
    frameStyle("station", [0, 0, 1024, 600], 1);
  }
}
let spacer = null;
function ensureSpacer(bottom) { if (!spacer) { spacer = document.createElement("div"); spacer.style.cssText = "position:absolute;left:0;width:1px;height:1px;visibility:hidden"; $("world").appendChild(spacer); } spacer.style.top = Math.max(0, R2(bottom) - 1) + "px"; }

// ---- the switch and the Dock ----
function show(d, { force = false } = {}) {
  if (d !== "station" && d !== "companion") return;
  if (d === S.shown && !force) return;
  const was = S.shown; S.shown = d; store.set("mb-test-device", d);
  S.dirty[d] = false; base[was] = fingerprint(was);
  apply(); say(d === "station" ? "Station" : "Companion");
}
const live = $("live"); const say = (t) => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
function askStation() {
  const w = win("station"); if (!w) return;
  S.awaiting = S.caddy.docked ? "lift" : "dock";
  try { w.postMessage({ t: "mb-dock", keysElsewhere: S.shown !== "station" }, location.origin); } catch { S.awaiting = null; return; }
  clearTimeout(askTimer); askTimer = setTimeout(() => { S.awaiting = null; updateDock(); }, 1000); updateDock();
}
let askTimer = 0;
function dockPress() { if (!S.caddy.canDock || S.awaiting) return; askStation(); }
window.addEventListener("message", (e) => {
  if (e.origin !== location.origin || e.source !== win("station")) return; const m = e.data || {}; if (m.t !== "mb-caddy") return;
  const was = S.caddy; S.caddy = { canDock: !!m.canDock, docked: !!m.docked, crates: m.crates | 0, pending: !!m.pending, opened: m.opened ?? null, partner: m.partner ?? null };
  paper();
  if (S.awaiting === "dock") {
    clearTimeout(askTimer);
    if (S.caddy.docked) { S.awaiting = null; note("Docked" + (was.crates ? "" : "") + (S.caddy.crates ? " · " + plural(S.caddy.crates, "crate") + " wait in the Bay" : "")); show("station"); }
    else if (!S.caddy.pending) S.awaiting = null;
  } else if (S.awaiting === "lift") {
    clearTimeout(askTimer);
    if (!S.caddy.docked) { S.awaiting = null; note("Lifted"); show("companion"); }
    else if (!S.caddy.pending) S.awaiting = null;
  }
  S.gotCaddy = true; updateDock();
});
const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
function updateDock() {
  const c = S.caddy, d = c.docked;
  $("dockWord").textContent = d ? "Lift" : "Dock"; $("dockMark").src = "../ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png";
  const crates = !d && c.canDock && c.crates > 0;
  const title = !c.canDock ? "The Companion has no world yet" : d ? "Lift the Companion from the Caddy" : crates ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion in the Caddy";
  const ctl = $("dockCtl"); ctl.setAttribute("aria-disabled", String(!c.canDock)); ctl.setAttribute("aria-label", d ? "Lift the Companion from the Caddy" : "Dock the Companion in the Caddy"); ctl.title = title; ctl.classList.toggle("pressed", !!S.awaiting || c.pending);
  const dot = $("dockDot"); dot.hidden = !crates; dot.style.left = "25px"; dot.style.top = "1px";
}
function paper() {
  const c = S.caddy, el = $("caddyPaper"); if (!el) return;
  el.textContent = !c.canDock ? "Caddy · no Companion world yet" : c.docked ? "Caddy · Companion docked" + (c.crates ? " · " + plural(c.crates, "crate") + " sealed" : "") : "Caddy · Companion lifted";
  $("caddy").classList.toggle("lifted", !c.docked);
}

// ---- the event line (dev) ----
const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
function note(text) { S.events.unshift({ t: Date.now(), text }); if (S.events.length > 200) S.events.pop(); drawLast(); }
function drawLast() { const e = S.events[0]; $("last").textContent = e ? hm(e.t) + " · " + e.text : ""; }

// ---- the footer ----
function drawFooter() {
  if (!cur) return;
  const kind = cur.kind, schema = schemaOf(S.shown), foot = $("foot");
  const parts = footerParts({ build: S.build, schema, caddy: S.caddyUp, compact: kind !== "desktop" });
  foot.textContent = "";
  if (kind === "landscape") parts.forEach((p) => { const s = document.createElement("span"); s.textContent = p; foot.appendChild(s); });
  else foot.textContent = parts.join(" · ");
}
// the shown device's save version: the Station's rules module as its own frame holds it (a fresh Station has no save yet), the Companion's save
let stSchema = null;
function schemaOf(d) {
  try {
    if (d === "station") { if (stSchema == null) { const w = win("station"); if (w && w.eval) w.eval("import('" + new URL("../station/src/state.mjs", location.href).href + "')").then((m) => { stSchema = m.ST_SCHEMA; drawFooter(); }).catch(() => {}); } return stSchema; }
    return win("companion").__mb.S.v;
  } catch { return null; }
}
loadBuild("../../build.json").then((b) => { S.build = b; drawFooter(); });
setInterval(() => drawFooter(), 2000);   // the shown device's save version is known once its frame has booted
const askCaddy = async () => { S.caddyUp = await caddyAnswers(); drawFooter(); }; askCaddy(); setInterval(askCaddy, 30000);

// ---- the menu (phones) ----
function menuHasRows(dev) { return dev === "station" || fsApi || DEV; }
function fsOn() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function toggleFullscreen() {
  const de = document.documentElement;
  if (fsOn()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
  try { const p = (de.requestFullscreen || de.webkitRequestFullscreen).call(de); if (p && p.catch) p.catch(() => {}); } catch { /* not allowed */ }
}
function closeMenu() { S.menu = false; renderMenu(); }
function openMenu() { if (!cur || cur.kind === "desktop" || !menuHasRows(S.shown)) return; S.menu = true; renderMenu(); }
function renderMenu() {
  const el = $("menu"), btn = $("menuBtn"); btn.classList.toggle("open", S.menu); btn.setAttribute("aria-expanded", String(S.menu));
  if (!S.menu || !cur || cur.kind === "desktop") { el.hidden = true; el.textContent = ""; return; }
  const M = menuLayout({ kind: cur.kind, regions: cur.L.regions, device: S.shown, dev: DEV, fullscreen: fsApi, W });
  el.hidden = false; el.textContent = ""; setR(el, M.panel);
  const rel = (r) => [r[0] - M.panel[0] - 1, r[1] - M.panel[1] - 1, r[2], r[3]];
  const put = (n, r) => { const q = rel(r); n.style.left = q[0] + "px"; n.style.top = q[1] + "px"; n.style.width = q[2] + "px"; n.style.height = q[3] + "px"; el.appendChild(n); return n; };
  for (const [id, code, cls, img, name] of [["home", "KeyH", "home", "home", "Home"], ["habitat", "KeyB", "vivarium", "vivarium", "Vivarium"], ["research", "KeyR", "research", "research", "Research"], ["library", "KeyL", "library", "library", "Library"]]) {
    const r = M.items[id]; if (!r) continue;
    const b = document.createElement("button"); b.type = "button"; b.className = "mk room " + cls; b.dataset.r = "menu-" + id; b.setAttribute("aria-label", name); b.innerHTML = MARK(img);
    let down = false; b.addEventListener("pointerdown", (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch { /* no capture */ } down = true; b.classList.add("dn"); });
    b.addEventListener("pointerup", (e) => { if (!down) return; down = false; b.classList.remove("dn"); const r = b.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return; fire("station", "keydown", code); fire("station", "keyup", code); closeMenu(); });
    b.addEventListener("pointercancel", () => { down = false; b.classList.remove("dn"); }); b.addEventListener("click", (e) => e.preventDefault());
    put(b, r);
  }
  if (M.items.rule) { const d = document.createElement("div"); d.className = "rule"; d.dataset.r = "menu-rule"; put(d, M.items.rule); }
  const row = (id, text, fn) => { const r = M.items[id]; if (!r) return; const b = document.createElement("button"); b.type = "button"; b.className = "row"; b.dataset.r = "menu-" + id; b.textContent = text; b.addEventListener("click", (e) => { e.preventDefault(); fn(); if (e.detail) b.blur(); }); put(b, r); };
  row("fullscreen", fsOn() ? "Exit full screen" : "Full screen", () => { toggleFullscreen(); closeMenu(); });
  row("tools", "Test tools", () => { closeMenu(); setDrawer(true); });
}
$("menuBtn").addEventListener("click", (e) => { S.menu ? closeMenu() : openMenu(); if (e.detail) e.currentTarget.blur(); });
// a tap outside the panel only closes it, and nothing else hears it
function swallow(e) { e.preventDefault(); e.stopPropagation(); }
window.addEventListener("pointerdown", (e) => {
  if (!S.menu) return;
  if ($("menu").contains(e.target)) return;
  swallow(e); closeMenu();
  const eat = (ev) => { swallow(ev); }; window.addEventListener("click", eat, { capture: true, once: true }); window.addEventListener("pointerup", eat, { capture: true, once: true });
  setTimeout(() => { window.removeEventListener("click", eat, true); window.removeEventListener("pointerup", eat, true); }, 700);
}, true);

// ---- the drawer (dev): the shell of the test tools; its groups follow ----
function setDrawer(on) { if (!DEV) return; S.drawer = on; renderDrawer(); try { win("station").postMessage({ t: "mb-dev", on }, location.origin); } catch { /* not loaded */ } }
function renderDrawer() {
  const el = $("drawer"), open = DEV && S.drawer && cur; $("drawerBtn").setAttribute("aria-expanded", String(!!open));
  if (!open) { el.hidden = true; return; }
  const k = cur.kind; el.hidden = false; $("grab").hidden = k !== "portrait"; el.classList.toggle("sheet", k === "portrait");
  const r = k === "portrait" ? [0, Math.round(H * 0.3), W, H - Math.round(H * 0.3)] : k === "landscape" ? [W - cur.safe.r - 320, 0, 320, H - cur.safe.b] : [W - 360, cur.L.regions.bar[3], 360, H - cur.L.regions.bar[3]];
  setR(el, r);
}
$("drawerBtn").addEventListener("click", (e) => { setDrawer(!S.drawer); if (e.detail) e.currentTarget.blur(); });
$("drawerClose").addEventListener("click", () => setDrawer(false));

// ---- the controls of the bar ----
$("swSt").addEventListener("click", (e) => { show("station"); if (e.detail) e.currentTarget.blur(); });
$("swCo").addEventListener("click", (e) => { show("companion"); if (e.detail) e.currentTarget.blur(); });
$("dockCtl").addEventListener("click", (e) => { dockPress(); if (e.detail) e.currentTarget.blur(); });
$("fsBtn").addEventListener("click", (e) => { fullPress(); if (e.detail) e.currentTarget.blur(); });
$("flagBtn").addEventListener("click", (e) => { e.preventDefault(); if (e.detail) e.currentTarget.blur(); });
function fullPress() {
  if (!cur) return;
  if (cur.kind === "desktop" && cur.view !== S.view) return;
  if (cur.kind !== "desktop") { toggleFullscreen(); return; }
  const to = cur.view === "full" ? "hardware" : "full"; S.view = to; store.set("mb-test-view", to);
  if (to === "full" && !fsOn()) toggleFullscreen(); else if (to === "hardware" && fsOn()) toggleFullscreen();
  apply();
}
document.addEventListener("fullscreenchange", () => { measure(); apply(); });

// ---- the page's keys, caught before any device hears them; the rest go to the device shown ----
const FORWARD = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "NumpadEnter", "Space", "Escape", "Backspace", "KeyH", "KeyR", "KeyL", "KeyB", "KeyW", "KeyA", "KeyS", "KeyD", "KeyC"]);
const typing = (t) => t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
const idOf = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "confirm", NumpadEnter: "confirm", Space: "confirm", Escape: "back", Backspace: "back", KeyH: "home", KeyB: "habitat", KeyR: "research", KeyL: "library", KeyC: "call", KeyW: "up", KeyA: "left", KeyS: "down", KeyD: "right" };
const lightKey = (code, on) => { const id = idOf[code]; if (!id) return; for (const k of keyEls) if (k.dev === S.shown && k.id === id && !k.el.hidden) k.el.classList.toggle("dn", on); };
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target; if (typing(t)) return;
  if (S.menu && e.code === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); return; }
  if (DEV && S.drawer && e.code === "Escape") { e.preventDefault(); setDrawer(false); return; }
  if (t && t.tagName === "BUTTON" && (e.code === "Enter" || e.code === "Space") && t.matches(":focus-visible")) return;   // a focused control of the page keeps its own key
  let hit = true;
  if (e.shiftKey && e.code === "KeyD") { if (!e.repeat) dockPress(); }
  else if (e.shiftKey) hit = false;
  else if (e.code === "Digit1" || e.code === "Numpad1") { if (!e.repeat) show("station"); }
  else if (e.code === "Digit2" || e.code === "Numpad2") { if (!e.repeat) show("companion"); }
  else if (e.code === "KeyF") { if (!e.repeat) fullPress(); }
  else if (e.code === "KeyM" && cur && cur.kind !== "desktop") { if (!e.repeat) (S.menu ? closeMenu() : openMenu()); }
  else if (e.code === "KeyN") { /* the flag: a later ticket */ }
  else if (e.code === "Backquote" && DEV) { if (!e.repeat) setDrawer(!S.drawer); }
  else if (e.code === "KeyD" && S.shown === "station") { if (!e.repeat) dockPress(); }
  else hit = false;
  if (hit) { e.preventDefault(); e.stopImmediatePropagation(); return; }
  if (FORWARD.has(e.code)) { e.preventDefault(); lightKey(e.code, true); fire(S.shown, "keydown", e.code, e); }
}, true);
window.addEventListener("keyup", (e) => { if (typing(e.target)) return; if (FORWARD.has(e.code)) { lightKey(e.code, false); fire(S.shown, "keyup", e.code); } }, true);
window.addEventListener("blur", () => { document.querySelectorAll(".fk.dn").forEach((b) => b.classList.remove("dn")); });

// ---- "its screen changed since it was last shown": the hidden device's picture, on a coarse grid, against the one it left ----
const base = { station: null, companion: null };
// the device's own state, not its pixels: the Station's screen, its state and its overlay; the Companion's phase
function fingerprint(d) {
  try {
    if (d === "station") { const p = win("station").__st.props; if (!p) return null; const lit = Object.entries(p.regions ?? {}).filter(([, r]) => r && r.lamp === "needsYou").map(([k]) => k).sort().join(","); return [p.screen, p.state ?? null, p.overlay?.id ?? null, lit].join("|"); }
    return win("companion").__mb.S.phase ?? null;
  } catch { return null; }
}
const differs = (a, b) => a != null && b != null && a !== b;
const settleUntil = Date.now() + 8000;
setInterval(() => { const h = S.shown === "station" ? "companion" : "station"; if (S.dirty[h]) return; if (!base[h] || Date.now() < settleUntil) { base[h] = fingerprint(h); return; } if (differs(base[h], fingerprint(h))) { S.dirty[h] = true; apply(); } }, 500);

// ---- go ----
addEventListener("resize", () => apply()); addEventListener("orientationchange", () => setTimeout(apply, 100)); if (window.visualViewport) visualViewport.addEventListener("resize", () => apply());
try { matchMedia("(resolution: " + (devicePixelRatio || 1) + "dppx)").addEventListener("change", () => apply()); } catch { /* resize covers it */ }
for (const d of ["station", "companion"]) frames[d].addEventListener("load", () => { apply(); setTimeout(() => { base[d] = fingerprint(d); }, 1500); });
apply();
window.__tp = { S, get cur() { return cur; }, apply, show, dockPress, frames, fingerprint, base, menu: { open: openMenu, close: closeMenu }, drawer: setDrawer, fire, win, canvasOf, fsApi,
  rect: (id) => { const el = document.querySelector('[data-r="' + id + '"]'); if (!el || el.hidden) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; },
  rects: () => Object.fromEntries([...document.querySelectorAll("[data-r]")].filter((el) => !el.hidden && el.offsetParent !== null || el.id === "bar").map((el) => { const b = el.getBoundingClientRect(); return [el.dataset.r, [b.x, b.y, b.width, b.height]]; })) };
