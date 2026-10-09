// The Station page: boot (the frames fetched from the workbench registry beside the page), the frame
// loop, the device keys, the Caddy's one key, the shared save's storage event, the developer panel and
// the test hooks. Rules are in state.mjs, drawing in the screens.
import { SW, SH, STAGE_Y, STAGE_H, PALETTE, clock, motion, artSize } from "./pixels.mjs";
import { ditherFill, setIcons, offPalette, bindCanvas } from "./gfx.mjs";
import { bootStationCanvas } from "../../ui/render/browser.mjs";
import { Scene } from "../../ui/scene.mjs";
import { makeCtx } from "../../ui/context.mjs";
import { ICON } from "./art.mjs";
import { G, FX, UI, TL, SPECS, LAYER, IDLE_MS, msg, save, load, loadSettings, storageChanged, goScreen, screenOf, lineFor, need, docked, hasWorld, bayCrates, arriving, onChange, podById, mibiById } from "./game.mjs";
import * as S from "./state.mjs";
import { setFrames, frameOf, frameIds, stampGenome } from "./genome.mjs";
import "./screens/home.mjs"; import "./screens/pods.mjs"; import "./screens/create.mjs"; import "./screens/incubator.mjs"; import "./screens/cross.mjs"; import "./screens/library.mjs"; import "./screens/habitat.mjs"; import "./screens/bench.mjs";
import { HATCH_MS } from "./screens/incubator.mjs";
import { stepResidents, clearResidents, hm, frameFor } from "./screens/frame.mjs";
import { dockKey, openBay } from "./screens/home.mjs";
import { drawIdle } from "./screens/bench.mjs";
import { openBook, openTop as libraryTop } from "./screens/library.mjs";
import { openTop as podsTop } from "./screens/pods.mjs";
import { openTop as habitatTop } from "./screens/habitat.mjs";
import { roomTop } from "./nav.mjs";
import { buildDevPanel, genomesText } from "./dev.mjs";
import * as caddy from "./caddy.mjs";
import { stampArt } from "./art.mjs";
import { loadPodSprites } from "./podsprites.mjs";
import { loadMasters } from "./masters.mjs";
import { bootFace } from "./face-lvgl.mjs";
import { manifest as manifestOf, registerAsset, asset as assetOf, assetEntry, NOT_FINAL } from "../../ui/assets.mjs";

setIcons((name, px) => ICON[name]?.(px));
const $ = (id) => document.getElementById(id);
const vis = $("screen"), vctx = vis.getContext("2d"); vctx.imageSmoothingEnabled = false; vctx.fillStyle = "#121a16"; vctx.fillRect(0, 0, SW, SH);
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
// Every frame the visible screen is one scene: a screen on the screen layer gives its nodes; a screen not yet moved
// is one legacy node whose callback draws as before through the renderer's primitives (the adapter of T1).
const scene = new Scene(SW, SH);
let SC = null, CTX = null;
const renderErrors = [];   // every throw of a render, kept for the checks to read
const legacy = (id, draw) => ({ id, kind: "legacy", rect: [0, 0, SW, SH], always: true, draw });
// ?face=lvgl: the LVGL face (prototypes/face) draws the screen; the JavaScript layer keeps the rules, the views and the timeline (technical-architecture.md §8).
const FACE_FLAG = new URLSearchParams(location.search).get("face") === "lvgl";
let FACE = null;
// The LVGL face draws the frame, the stage's ground and the focus ring for now; each screen's stage comes over with its screen. A screen on the layer says what the face draws (faceNodes); the others get the frame alone.
const faceEnv = { rgb: (n) => SC.env.rgb(n), cap: (px) => CTX.cap(px), layer: (n) => (n.asset && assetEntry(n.asset)?.policy === "painted" ? "painted" : undefined), slice: (id) => assetEntry(id)?.slice ?? null, tile: (id) => assetEntry(id)?.tile ?? 0, picture: (id) => { const a = assetOf(id, SC.env); if (!a) return null; const g = a.canvas().getContext("2d"); return { w: a.w, h: a.h, data: g.getImageData(0, 0, a.w, a.h).data }; } };
function faceNodes() {
  const screen = screenOf(UI.screen), F = SPECS.frame, stage = { id: "stage", kind: "rect", rect: F.regions.stage.rect.slice(), colour: F.colours.stageGround };
  return [stage, ...(screen.faceNodes ? screen.faceNodes(CTX) : frameFor(CTX, UI.screen, lineFor()))];
}
function render() {
  stepResidents(); TL.tick(clock.now);
  if (FACE) { FACE.scene(faceNodes(), faceEnv); FACE.frame(clock.now); FACE.present(vctx); return; }
  const screen = screenOf(UI.screen), nodes = [];
  if (!UI.idle && screen.nodes) nodes.push(...screen.nodes(CTX));
  else { nodes.push(legacy("legacy", () => { if (UI.idle) drawIdle(); else screen.draw(); })); if (!UI.idle) nodes.push(...frameFor(CTX, UI.screen, lineFor())); }   // the one frame on every screen: the top bar, the bottom line, the plate
  const ta = clock.now - (FX.transAt || -1e9);
  if (ta >= 0 && ta < 180 && motion()) nodes.push(legacy("trans", () => ditherFill(0, STAGE_Y, SW, STAGE_H, "void", 16 - Math.floor((ta / 180) * 16))));
  scene.set(nodes); SC.paint(scene); SC.composite(vctx);
}
let errN = 0;
function frame(t) {
  clock.now = t;
  if (G.ready) {
    if (FX.hatch && FX.hatch.go && t - FX.hatch.at >= HATCH_MS) { FX.hatch.go = false; UI.hab.id = FX.hatch.id; UI.hab.f = "door"; goScreen("habitat"); }   // meet the mibi
    if (!UI.idle && t - UI.lastInput > IDLE_MS && !arriving() && t > FX.lockUntil) UI.idle = true;   // the vivarium plays alone
    try { render(); } catch (e) { renderErrors.push(String(e && e.message || e)); if (errN++ < 20) console.error(e); }   // never swallowed: every throw is kept for the checks to read
    updateCaddy();
  }
  requestAnimationFrame(frame);
}

// A room key opens the top of its room from anywhere, even from inside it, and never spends. Leaving Create or Cross by one forgets the unpaid choices (owner, 2026-10-09).
export function openRoom(k) {
  UI.create = null; UI.cross = null;
  if (k === "home") UI.home.f = "room";
  else if (k === "research") podsTop();
  else if (k === "library") libraryTop();
  else if (k === "habitat") habitatTop();
  goScreen({ home: "home", research: "pods", library: "library", habitat: "habitat" }[k]);
}

// --- the Station's keys: pad, Home/Research/Library/Habitat, ← and ✓, plus the Caddy's Dock/Lift key ---
export function act(k) {
  if (!G.ready) return;
  if (FACE) FACE.key(k);
  clock.now = performance.now(); UI.lastInput = clock.now;
  const wasIdle = UI.idle;
  if (UI.idle) { UI.idle = false; FX.wake = clock.now; caddy.wake(); if (k !== "dock") return; }   // the first press on Idle only wakes the screen (a landed painting shows from here); the Caddy's Dock key is a world event, not a Station press: it wakes and docks
  if (k === "dock") { dockKey(wasIdle); return; }
  if (clock.now < FX.lockUntil || TL.holding()) return;                  // presses during a reveal or an arrival are consumed (the timeline's holds, and the screens not yet moved)
  if (k !== "back" || UI.screen !== "home") FX.msg = "";
  if (UI.report && !arriving() && UI.screen === "home") UI.report = null;
  if (roomTop(k)) { openRoom(k); return; }
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
const bootText = (t) => { if (bootEl) bootEl.textContent = t; };   // before the atlases load the screen is blank; the words go to the page
bootText("loading the species frames…");
// The layered renderer: the palette, the type atlases (Inter at 16, 20 and 28 px, baked from the bundled font) and the spec files, all beside the page.
const bootLayer = async () => {
  const { canvas, type } = await bootStationCanvas({ base: new URL("../../ui/", import.meta.url) });
  const spec = async (f) => (await fetch(new URL("../../ui/specs/station/" + f, import.meta.url), { cache: "no-store" })).json();
  for (const k of ["frame", "pods", "cross"]) SPECS[k] = await spec(k + ".json");
  await loadMasters(new URL("../../ui/assets/masters/", import.meta.url));   // the signed masters take their stand-ins' ids before any screen registers them
  await loadPodSprites(new URL("../../ui/assets/placeholders/pod/", import.meta.url));
  SC = canvas; bindCanvas(SC); CTX = LAYER.ctx = makeCtx(SPECS.frame, type);
};
// The icons the text runs inline (⚡ ◆ ❀ ✕ at the 16 px body size) are registered in the manifest as type assets.
for (const name of ["energy", "data", "essence", "cross"]) registerAsset({ id: `icon:${name}:16`, w: 16, h: 16, policy: "type", status: "placeholder", until: "the icon set", build: () => ICON[name](16) });
// The handshake's follow-up (lvgl-switch.md §2.1): the palette, then every spec file the page loaded, as the face's loader reads them; a refusal is an error message, counted by the checks.
const sendBoot = (f) => { f.send({ t: "palette", name: "station", colours: PALETTE.map(([n, hexv]) => [n, hexv]) }); for (const [screen, json] of Object.entries(SPECS)) if (json && typeof json === "object") f.send({ t: "spec", screen, json }); };
const faceBoot = FACE_FLAG ? bootFace(undefined, { test: new URLSearchParams(location.search).has("test") }).then((f) => { sendBoot(f); FACE = f; }).catch((e) => { const m = "the LVGL face did not load (?face=lvgl): import of " + new URL("../../face/dist/face.mjs", import.meta.url).pathname + " failed: " + e.message; console.error(m); const p = document.createElement("p"); p.id = "faceError"; p.textContent = m; document.body.prepend(p); }) : Promise.resolve();
const ready = Promise.all([loadFrames(), bootLayer(), faceBoot]).then(([info]) => {
  if (FACE) { CTX = LAYER.ctx = { ...CTX, measure: (t, px) => FACE.measure(t, px) }; const [r, g, b] = faceEnv.rgb(SPECS.frame.colours.chrome); FACE.setBackground((r << 16) | (g << 8) | b); }   // the views lay text out with the widths LVGL's font engine gives
  loadSettings(); load();
  // a new species identified opens its Library page: the Pods screen asks for it through this hook
  G.openBook = openBook;
  UI.lastInput = performance.now(); G.ready = true;
  buildDevPanel($("devPanel"), { changed: refreshDev });
  caddy.startClient();
  if (new URLSearchParams(location.search).has("dev")) showDev(true);
  if (bootEl) bootEl.textContent = info.n + " species frames · catalogue " + info.catalogue.id + "@" + info.catalogue.version;
  return info;
}).catch((e) => { bootText("the species frames did not load: " + e.message); console.error(e); throw e; });

// What the CI checks read at a screenshot point: the layers' palette counts, the type log, the scene's regions and texts.
function checkSnapshot() {
  const pod = podById(UI.pods.cur), fr = pod ? frameOf(S.speciesOf(pod)) : null;
  return { screen: UI.screen, idle: UI.idle, size: [SC.w, SC.h], page: [vis.width, vis.height], art: SC.offPalette("art"), type: SC.offPalette("type"), typeLog: SC.typeLog.map((r) => ({ text: r.text, face: r.face, family: r.family, px: r.px, weight: r.weight, atlas: r.atlas })),
    typeMissing: [...SC.type.missing], renderer: { sizes: SC.sizeErrors.length, missing: SC.missing.length }, regions: scene.regions(), texts: scene.texts(), cellNodes: scene.cellNodes(), layered: !!screenOf(UI.screen).nodes && !UI.idle,
    pod: pod ? { id: pod.id, idd: !!pod.idd, chapters: fr && pod.idd ? fr.chapters.length : 0, species: S.speciesOf(pod) } : null, focus: UI.pods.focus.cur, view: UI.pods.view, cmp: !!UI.pods.cmp, mode: UI.screen === "pods" ? (UI.pods.cmp ? "compare" : UI.pods.view) : null, traits: UI.screen === "pods" && UI.pods.view === "chapter" && fr && pod.idd ? (() => { const c = fr.chapters[Math.min(UI.pods.ci | 0, fr.chapters.length - 1)]; return c && c.sealed && !G.settings.sealedOpen ? 1 : (c?.traits.length ?? 0); })() : null, placeholders: manifestOf().filter((e) => NOT_FINAL.includes(e.status)).length };
}

// Test hooks (not part of play).
window.__st = { ready, renderErrors, caddy: { state: caddy.state, status: caddy.status, flush: caddy.flush, poll: caddy.poll, land: caddy.land, anyWaiting: caddy.anyWaiting, landed: (sha) => caddy.state.landed.has(sha), pending: () => [...caddy.state.pending.keys()] }, get SV() { return G.sv; }, get ST() { return G.st; }, get UI() { return UI; }, get settings() { return G.settings; }, get FX() { return FX; },
  say: (t) => msg(t), faceNodes: () => (FACE ? JSON.parse(JSON.stringify(faceNodes())) : null), targets: () => screenOf(UI.screen).targets?.() ?? null, act: (k) => { FX.lockUntil = 0; TL.release(); act(k); }, press: act, lineFor, need, dockKey, openBay, save, unlock: () => { FX.lockUntil = 0; TL.release(); }, wake: () => { UI.idle = false; UI.lastInput = performance.now(); },
  get face() { return FACE ? { refused: () => FACE.refused(), objects: () => FACE.objects(), version: FACE.version, size: FACE.size, loadMs: FACE.loadMs, hash: FACE.hash(), stats: FACE.stats(), pixel: FACE.pixel, pass: FACE.pass, offPalette: FACE.offPalette, poll: FACE.poll } : null; }, get msg() { return FX.msg; }, capture: () => (FACE ? vis : SC.capture()).toDataURL("image/png"), offPalette, layer: (name) => { const d = SC.layerData(name); return { width: d.width, height: d.height, data: Array.from(d.data) }; }, offPaletteOf: (name) => SC.offPalette(name), typeLog: () => SC.typeLog.slice(), typeFrame: () => SC.frameLog.slice(), typeMissing: () => [...SC.type.missing], rendererErrors: () => ({ sizes: SC.sizeErrors.slice(), missing: SC.missing.slice() }), holding: () => TL.holding(), region: (layer, r) => { const d = SC.ctx[layer].getImageData(r[0], r[1], r[2], r[3]); return { width: d.width, height: d.height, data: Array.from(d.data) }; }, sceneRegions: () => scene.regions(), sceneTexts: () => scene.texts(), check: () => checkSnapshot(), manifest: () => manifestOf(), specs: () => SPECS, artSize, frameOf, frameIds, podById, genomesText,
  stampRGBA: (podId, side = 200) => { const p = podById(podId); if (!p) return null; const fr = frameOf(S.speciesOf(p)); return stampArt(fr, p.genome, p.read, side).rgba(); },
  stampGenome: (podId) => { const p = podById(podId); const fr = frameOf(S.speciesOf(p)); return stampGenome(fr, p.genome, p.read); },
  grow: (podId, choices) => { const r = S.grow(G.st, podById(podId), choices || {}, G.settings, Date.now()); save(); return r; }, openBud: () => { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); save(); return r; }, skipBud: (how) => { S.skipBud(G.st, G.settings, how); save(); }, seedAdults: (species, seed, n) => { const r = S.seedAdults(G.st, species, seed, n, G.settings); save(); return r; }, seedSiblings: (species, seed) => { const r = S.seedSiblings(G.st, species, seed, G.settings); save(); return r; }, forecastOf: (aId, bId) => S.forecastOf(G.st, podById ? mibiById(aId) : null, mibiById(bId), G.settings), kinshipOf: (aId, bId) => S.kinshipOf(G.st, mibiById(aId), mibiById(bId)),
  isAdult: (m) => S.isAdult(G.st, m, G.settings), podGlints: (p) => S.podGlints(G.st, p), compareDiff: (a, b) => S.compareDiff(G.st, podById(a), podById(b)) || [],
  podsGo: (id, f = "pod", view, ci) => { const u = UI.pods; u.cur = id; if (ci != null) u.ci = ci; u.view = view ?? (f.startsWith("rail.") ? "chapter" : f.startsWith("place.") ? "collection" : "overview"); if (f.startsWith("rail.")) u.ci = +f.slice(5); u.cmp = null; u.focusView = null; u.focus.set(f); if (UI.screen !== "pods") goScreen("pods"); },
  seedCrate: (species, n, seed) => { const r = S.seedCrate(G.st, species, n, seed, Date.now()); save(); return r; }, skipRead: (podId) => { S.skipRead(G.st, podById(podId), G.settings); save(); }, addMaterials: (e, d, s) => { S.addMaterials(G.st, e, d, s); save(); } };
