// The Station page: boot (the frames fetched from the workbench registry beside the page), the frame
// loop, the device keys, the Caddy's one key, the shared save's storage event, the developer panel and
// the test hooks. Rules are in state.mjs, drawing in the screens.
import { SW, SH, STAGE_Y, STAGE_H, scr, g, RGB, clock, motion, ditherFill, setIcons, offPalette, artSize } from "./gfx.mjs";
import { ICON } from "./art.mjs";
import { G, FX, UI, IDLE_MS, msg, save, load, loadSettings, storageChanged, goScreen, screenOf, lineFor, need, docked, hasWorld, bayCrates, arriving, onChange, podById } from "./game.mjs";
import * as S from "./state.mjs";
import { setFrames, frameOf, frameIds, stampGenome } from "./genome.mjs";
import "./screens/home.mjs"; import "./screens/pods.mjs"; import "./screens/create.mjs"; import "./screens/incubator.mjs"; import "./screens/library.mjs"; import "./screens/habitat.mjs"; import "./screens/bench.mjs";
import { HATCH_MS } from "./screens/incubator.mjs";
import { drawLine, drawMsg, stepResidents, clearResidents, hm } from "./screens/frame.mjs";
import { dockKey, openBay } from "./screens/home.mjs";
import { drawIdle } from "./screens/bench.mjs";
import { openBook } from "./screens/library.mjs";
import { buildDevPanel, genomesText } from "./dev.mjs";
import { stampArt } from "./art.mjs";

setIcons((name, px) => ICON[name]?.(px));
const $ = (id) => document.getElementById(id);
const vis = $("screen"), vctx = vis.getContext("2d"); vctx.imageSmoothingEnabled = false;
const stampEl = $("stamp"), bootEl = $("boot");

// --- the frames, fetched beside the page (the sandbox publishes prototypes/* side by side) ---
async function loadFrames() {
  const base = new URL("../../workbench/frames/", import.meta.url);
  const index = await (await fetch(new URL("index.json", base), { cache: "no-store" })).json();
  const frames = await Promise.all(index.species.map((s) => fetch(new URL(s.file, base), { cache: "no-store" }).then((r) => r.json())));
  setFrames(frames);
  return { catalogue: index.catalogue, n: frames.length };
}

// --- render ---
function render() {
  stepResidents();
  if (UI.idle) drawIdle();
  else { screenOf(UI.screen).draw(); drawLine(lineFor()); drawMsg(); }
  const ta = clock.now - (FX.transAt || -1e9); if (ta >= 0 && ta < 180 && motion()) ditherFill(0, STAGE_Y, SW, STAGE_H, "moss0", 16 - Math.floor((ta / 180) * 16));
  vctx.drawImage(scr, 0, 0);
}
let errN = 0;
function frame(t) {
  clock.now = t;
  if (G.ready) {
    if (FX.hatch && FX.hatch.go && t - FX.hatch.at >= HATCH_MS) { FX.hatch.go = false; UI.hab.id = FX.hatch.id; UI.hab.f = "door"; UI.hab.from = null; goScreen("habitat"); }   // meet the mibi
    if (!UI.idle && t - UI.lastInput > IDLE_MS && !arriving() && t > FX.lockUntil) UI.idle = true;   // the vivarium plays alone
    try { render(); } catch (e) { if (errN++ < 3) console.error(e); }
    updateCaddy();
  }
  requestAnimationFrame(frame);
}

// --- the Station's keys: pad, Home/Research/Library/Habitat, ← and ✓, plus the Caddy's Dock/Lift key ---
export function act(k) {
  if (!G.ready) return;
  clock.now = performance.now(); UI.lastInput = clock.now;
  if (UI.idle) { UI.idle = false; FX.wake = clock.now; }   // a press wakes the screen and still does what it says
  if (k === "dock") { dockKey(); return; }
  if (clock.now < FX.lockUntil) return;                                  // presses during a reveal or an arrival are consumed
  if (k !== "back" || UI.screen !== "home") FX.msg = "";
  if (UI.report && !arriving() && UI.screen === "home") UI.report = null;
  const views = { home: "home", research: "pods", library: "library", habitat: "habitat" };
  if (views[k]) { if (k === "habitat") UI.hab.from = null; goScreen(views[k]); return; }
  screenOf(UI.screen).act(k);
}
const stationEl = $("station");
function bindKeys(root) {
  root.querySelectorAll(".k").forEach((btn) => { const k = btn.dataset.key;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch { /* no capture */ } btn.classList.add("is-down"); act(k); });
    const up = () => btn.classList.remove("is-down"); btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("lostpointercapture", up);
    btn.addEventListener("click", (e) => e.preventDefault()); });
}
bindKeys(stationEl); bindKeys($("caddy"));
stationEl.addEventListener("contextmenu", (e) => e.preventDefault());
["touchstart", "touchmove", "gesturestart", "dblclick"].forEach((type) => stationEl.addEventListener(type, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false }));
const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "confirm", NumpadEnter: "confirm", Space: "confirm", Escape: "back", Backspace: "back", KeyH: "home", KeyR: "research", KeyL: "library", KeyB: "habitat", KeyD: "dock" };
window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = KEYMAP[e.code] || { " ": "confirm", Enter: "confirm", Escape: "back" }[e.key]; if (!k) return;
  const t = e.target, inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.tagName === "BUTTON" || t.isContentEditable);
  const inPanel = t && t.closest && (t.closest(".panel") || t.closest(".dev") || t.closest(".debug"));
  if (inField || (inPanel && (k === "confirm" || k === "back"))) return;
  e.preventDefault(); if (e.repeat) return;
  const b = document.querySelector(`.k[data-key="${k}"]`); if (b) b.classList.add("is-down");
  act(k);
});
window.addEventListener("keyup", (e) => { const k = KEYMAP[e.code]; if (!k) return; const b = document.querySelector(`.k[data-key="${k}"]`); if (b) b.classList.remove("is-down"); });
window.addEventListener("blur", () => document.querySelectorAll(".k.is-down").forEach((b) => b.classList.remove("is-down")));

// --- the page: fit, the Caddy, the shared save, the developer panel, the build stamp ---
function fit() {
  const W = 1024, vw = document.documentElement.clientWidth, dpr = window.devicePixelRatio || 1, room = vw < 761 ? 32 + 36 : 32 + 52;
  let s = Math.min(1, (vw - room) / W); s = Math.max(0.25, s);
  const k = Math.floor(s * dpr + 1e-6); if (k >= 1 && k / dpr >= s * 0.85) s = k / dpr;
  vis.style.width = Math.round(W * s) + "px";
}
window.addEventListener("resize", fit);
const caddyEl = $("caddy"), dockKeyEl = $("dockKey"), caddyPaper = $("caddyPaper");
let caddyKey = "";
function updateCaddy() {
  const d = docked(), key = d + ":" + bayCrates().length + ":" + hasWorld() + ":" + (G.st.dock && G.st.dock.at); if (key === caddyKey) return; caddyKey = key;
  caddyEl.classList.toggle("lifted", !d); dockKeyEl.textContent = d ? "LIFT" : "DOCK";
  caddyPaper.textContent = !hasWorld() ? "Caddy · no Companion world yet" : d ? "Caddy · Companion docked" + (bayCrates().length ? " · " + S.plural(bayCrates().length, "crate") + " sealed" : "") : "Caddy · Companion lifted at " + hm(G.st.dock.at);
}
window.addEventListener("storage", (e) => { if (e.key !== S.SAVE_KEY && e.key !== null) return; if (!G.ready) return; clearResidents(); storageChanged(); });
const devEl = $("dev"), devBtn = $("devBtn"), devOut = $("devOut");
function showDev(on) { devEl.hidden = !on; devBtn.setAttribute("aria-pressed", String(on)); devBtn.textContent = on ? "Hide developer tools" : "Developer tools"; if (on) refreshDev(); }
function refreshDev() { if (devOut && !devEl.hidden && devOut.dataset.live === "1") devOut.textContent = genomesText(); }
devBtn.addEventListener("click", (e) => { showDev(devEl.hidden); e.currentTarget.blur(); });
onChange(refreshDev);
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => {
  const short = j.short || String(j.commit || "").slice(0, 7), d = new Date(j.built);
  let t = ""; if (!isNaN(d)) t = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  stampEl.textContent = short ? "build " + short + (t ? " · " + t : "") : "local build";
}).catch(() => { stampEl.textContent = "local build"; });

// --- boot ---
for (const id of ["howTo", "whatTry"]) $(id).open = false;
fit();
requestAnimationFrame(frame);
const bootText = (t) => { vctx.fillStyle = "#121a16"; vctx.fillRect(0, 0, SW, SH); vctx.fillStyle = "#c6c4d8"; vctx.font = "20px system-ui, sans-serif"; vctx.fillText(t, 24, 300); if (bootEl) bootEl.textContent = t; };
bootText("loading the species frames…");
const fontsReady = (document.fonts ? Promise.all(["400 16px Inter", "500 20px Inter", "600 28px Inter"].map((f) => document.fonts.load(f))) : Promise.resolve()).catch(() => null);
const ready = Promise.all([loadFrames(), fontsReady]).then(([info]) => {
  loadSettings(); load();
  // a new species identified opens its Library page: the Pods screen asks for it through this hook
  G.openBook = openBook;
  UI.lastInput = performance.now(); G.ready = true;
  buildDevPanel($("devPanel"), { changed: refreshDev });
  if (new URLSearchParams(location.search).has("dev")) showDev(true);
  if (bootEl) bootEl.textContent = info.n + " species frames · catalogue " + info.catalogue.id + "@" + info.catalogue.version;
  return info;
}).catch((e) => { bootText("the species frames did not load: " + e.message); console.error(e); throw e; });

// Test hooks (not part of play).
window.__st = { ready, get SV() { return G.sv; }, get ST() { return G.st; }, get UI() { return UI; }, get settings() { return G.settings; }, get FX() { return FX; },
  act: (k) => { FX.lockUntil = 0; act(k); }, press: act, lineFor, need, dockKey, openBay, save, unlock: () => { FX.lockUntil = 0; }, wake: () => { UI.idle = false; UI.lastInput = performance.now(); },
  get msg() { return FX.msg; }, capture: () => scr.toDataURL("image/png"), offPalette, artSize, frameOf, frameIds, podById, genomesText,
  stampRGBA: (podId, side = 200) => { const p = podById(podId); if (!p) return null; const fr = frameOf(S.speciesOf(p)); return stampArt(fr, p.genome, p.read, side).rgba(); },
  stampGenome: (podId) => { const p = podById(podId); const fr = frameOf(S.speciesOf(p)); return stampGenome(fr, p.genome, p.read); },
  grow: (podId, choices) => { const r = S.grow(G.st, podById(podId), choices || {}, G.settings, Date.now()); save(); return r; }, openBud: () => { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); save(); return r; }, skipBud: (how) => { S.skipBud(G.st, G.settings, how); save(); }, seedAdults: (species, seed, n) => { const r = S.seedAdults(G.st, species, seed, n, G.settings); save(); return r; },
  seedCrate: (species, n, seed) => { const r = S.seedCrate(G.st, species, n, seed, Date.now()); save(); return r; }, skipRead: (podId) => { S.skipRead(G.st, podById(podId), G.settings); save(); }, addMaterials: (e, d, s) => { S.addMaterials(G.st, e, d, s); save(); } };
