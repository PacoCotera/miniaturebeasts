// The Station page: the host of the LVGL face (technical-architecture.md §8). It boots the face, sends it the palette, the spec files (frame and pods), the pictures and the screen's props,
// runs its frames from the animation frame, copies what it redrew onto the page's canvas, and turns the keys and the face's intents into the rules. Everything on the screen is the face's:
// there is no drawing here. Also: the Caddy's one key, the shared save's storage event, the developer panel and the test hooks. Rules are in state.mjs, the key's rule call in intents/*, the
// props in host.mjs.
import { PALETTE, clock, motion } from "./pixels.mjs";
import { ICON } from "./art.mjs";
import { stationSeconds } from "./game.mjs";
import { G, FX, UI, SPECS, IDLE_MS, msg, save, load, loadSettings, saveSettings, storageChanged, need, docked, hasWorld, bayCrates, onChange, podById, mibiById, LAYER } from "./game.mjs";
import * as S from "./state.mjs";
import * as Lib from "./library.mjs";
import { lightAt } from "./views/home-props.mjs";
import { warmLibrary } from "./views/specimen-props.mjs";
import { setMoving } from "./moving.mjs";
import { startScene, endScene, sceneTick, sceneTime, sceneBeat, SCENE_MS } from "./motion-scene.mjs";
import { setFrames, frameOf, frameIds, stampGenome, podGenome, genomeSha, nameCode } from "./genome.mjs";
import { buildDevPanel, genomesText } from "./dev.mjs";
import * as caddy from "./caddy.mjs";
import { watch as watchHabitat, openCross as openCrossAt } from "./intents/habitat.mjs";
import { stampArt } from "./art.mjs";
import { loadPodSprites } from "./podsprites.mjs";
import { loadMasters, loadStandLayers } from "./masters.mjs";
import { setStandSizes } from "./layered-stand.mjs";
import { setStandLooks } from "./looks.mjs";
import { injectPortraitSource } from "./portrait-source.mjs";
import { bootFace } from "./face-lvgl.mjs";
import * as cargo from "./intents/cargo.mjs";
import * as create from "./intents/create.mjs";
import * as frameIntents from "./intents/frame.mjs";
import { createHost, onFaceMessage, screenProps, topValues, frameIds as frameMarkIds, idleMarkIds, lightIds, pinned, picture, setEnv, setMetrics, libraryAhead } from "./host.mjs";
import { warmLibraryNext, wantLibrary, libraryWaiting, warmLibraryPaper } from "./pictures.mjs";
import { manifest as manifestOf, registerAsset, assetEntry, NOT_FINAL, NOT_IN_GOLDENS } from "../../ui/assets.mjs";

const $ = (id) => document.getElementById(id);
const vis = $("screen"); let vctx = null;   // the page's screen: the face copies what it redrew onto it (face.display)
const stampEl = $("stamp"), bootEl = $("boot");
if (new URLSearchParams(location.search).has("dev")) { stampEl.hidden = false; $("devBtn").hidden = false; }   // the build stamp and the Developer tools button are for ?dev only (the Shift+T key stays on the play page)

// --- the frames, fetched beside the page (the sandbox publishes prototypes/* side by side) ---
async function loadFrames() {
  const base = new URL("../../workbench/frames/", import.meta.url);
  const index = await (await fetch(new URL("index.json", base), { cache: "no-store" })).json();
  const frames = await Promise.all(index.species.map((s) => fetch(new URL(s.file, base), { cache: "no-store" }).then((r) => r.json())));
  setFrames(frames);
  return { catalogue: index.catalogue, n: frames.length };
}

// --- the face ---
let dockElsewhere = false;   // ?embed: the play page's Dock control asked while another device had the keys (frame.json navigation.dock); never set standalone
let FACE = null, H = null, lastLog = null, lastProps = null, lastOwed = [], lastSent = [], msgSent = -1, lastLight = null, litHeld = new Set(), movingHeld = new Set(), movingPrev = new Set(), sitHeld = new Set();   // lastLight: the light of the props the face has, so the old light's paintings can be dropped
const renderErrors = [];   // every error the face or a frame raised, kept for the checks to read
const said = [];   // the focus and the intents the face said, for the journey's golden (window.__st.said() takes and clears them)
const faceErrors = [];
const sendEvent = (m) => { if (FACE.send(m) < 0) faceErrors.push(...FACE.errors()); };
// What the face said since the last call: its intents and its focus become the rules (host.mjs), its errors are kept, its log is the checks'.
function pump() {
  for (let m; (m = FACE.poll());) {
    if (m.t === "error") { faceErrors.push(m.what); console.error("face: " + m.what); }
    else if (m.t === "log") lastLog = m;
    else { if (m.t === "intent" && m.verb === "wake") { FX.wake = clock.now; caddy.wake(); } if (m.t === "intent" || m.t === "focus") said.push({ t: m.t, screen: m.screen, target: m.target, ...(m.verb ? { verb: m.verb } : {}) }); onFaceMessage(H, m); }
  }
}
// The screen's props, when they changed: the pictures first (the face takes a picture once, by id), then the props.
// The Library's specimen is rendered here, never on a sync (build spec 4.2: about a second, and the logic thread answers nothing during it). Home's props show the last specimen (or the starter's empty form) until it is made. It is asked for after the sync
// that found the state wanting it, once the frame is out, and not while an event holds input (an opening's steps are sent first); the first frame at boot asks too.
// The Library's own pictures are made the same way, one a tick (pictures.mjs warmLibraryNext): what the props asked for first (the lit chapter's variant and page, a sheet, the Level 1 cells), then the sheet finish's one-time paper
// (the Library 3 gate's P5: at the boot idle), then a sheet ahead of the open (P2: the species Level 1's ring rests on, else the last species whose sheet changed). Each one's time and its wait since it was asked are printed.
let warmAt = null, paperDone = false;
const AHEAD_REST_MS = 500;   // the ring "rests" on a Level 1 cell once no key has been pressed for this long (a builder's number: the Library 3 gate's P2 names no time)
const LIB_ENV = { frameOf };
function warmLibraryOne() {
  const made = (w) => { if (w) console.log(`# library swap-in ${w.kind} ${w.id}: made in ${w.ms.toFixed(0)} ms, ${w.waited.toFixed(0)} ms after it was asked`); return !!w; };
  if (made(warmLibraryNext(LIB_ENV))) return true;
  if (!paperDone) { paperDone = true; const ms = warmLibraryPaper(); if (ms) console.log(`# library paper: made in ${ms.toFixed(0)} ms at the boot idle`); return true; }
  if (performance.now() - (UI.lastInput ?? 0) >= AHEAD_REST_MS) { wantLibrary(libraryAhead()); return made(warmLibraryNext(LIB_ENV)); }
  return false;
}
function queueWarm() {
  if (warmAt != null || !G.ready) return;
  warmAt = setTimeout(() => { warmAt = null; if (H && H.holding()) return; try { warmLibrary(G.st, G.settings); } catch (e) { renderErrors.push("specimen: " + e.message); } try { warmLibraryOne(); } catch (e) { renderErrors.push("library: " + e.message); } }, 30);
}
function syncProps() {
  if (msgSent !== FX.msgAt) { msgSent = FX.msgAt; if (FX.msg) H.play({ kind: "plate", target: "msg", ms: FX.msgMs || 4000 }); }
  for (const e of LAYER.presenter.events(topValues())) H.play(e);
  const p = screenProps(FX.msg), key = JSON.stringify(p.msg);
  lastOwed = p.owed ?? [];   // the current scene's requests that carry an owed habit key (snapshot): read on every sync, as the same props may be asked with or without it
  queueWarm();   // after the props are built, before the early return: a warm that was held waits for the hold, not for a change of props
  for (const id of p.dropped ?? []) FACE.drop(id);   // a picture a newer one superseded leaves the face (the Library 3 gate's P4)
  if (key === lastProps && !p.dropped?.length) return;
  { FACE.beginScene(); lastSent = []; for (const id of [...(UI.idle ? idleMarkIds() : frameMarkIds()), ...p.ids]) if (FACE.handleOf(id, picture) >= 0) lastSent.push(id); }   // Idle needs only its own pictures; lastSent: the pictures this scene gave the face (an empty slot gives none)
  if (FACE.props({ ...p.msg, motion: motion() }) < 0) faceErrors.push(...FACE.errors());
  else { const light = p.light ?? lastLight; if (lastLight && lastLight !== light) for (const id of lightIds(lastLight)) FACE.drop(id); if (lastLight && lastLight !== light) for (const id of litHeld) if (!p.ids.includes(id)) { FACE.drop(id); litHeld.delete(id); } for (const id of p.lit ?? []) litHeld.add(id); lastLight = light;   // fix 7: at a light change the graded residents the new props do not name go with the old light
  // one light's pictures in memory, plus one frame of the next
    const now = new Set(p.ids.filter((id) => id.startsWith("moving:"))); for (const id of movingHeld) if (!now.has(id) && !movingPrev.has(id)) { FACE.drop(id); movingHeld.delete(id); } for (const id of now) movingHeld.add(id); movingPrev = now;   // a moving atlas neither these props nor the previous screen's ask for is dropped (architecture.md §3: the main.mjs gap)
    const loads = new Set(SPECS.sitting?.regions?.glass?.backdrops ?? []);   // sitting.json regions.glass.load: the place backdrops the place step loads are dropped on leaving the screen
    if (p.msg.screen === "sitting") { for (const id of p.ids) if (loads.has(id)) sitHeld.add(id); } else { for (const id of sitHeld) if (!p.ids.includes(id)) FACE.drop(id); sitHeld.clear(); } }
  lastProps = key;   // set once the props are sent: a throw above leaves it unset, so the next frame tries again (and the error is kept)
}
function render() {
  syncProps(); FACE.frame(clock.now); FACE.present(vctx); pump();
}
let errN = 0, lastT = null;
function frame(t) {
  clock.now = t; const dt = lastT == null ? 0 : t - lastT; lastT = t;
  if (G.ready && FACE) {
    watchHabitat(H, dt);   // the bench trickle (before the Idle check: Idle watches nothing): one mibi up close, rest or meet, not carried (habitat.json rules.watch)
    sceneTick(t);   // the motion proof's scene, when one plays (motion-scene.mjs)
    frameIntents.idleTick(H, t, IDLE_MS);   // frame.json idle.enter: a minute without a press, never in a hold, an arrival or Cargo's report card
    try { render(); H.frame(); } catch (e) { renderErrors.push(String(e && e.message || e)); if (errN++ < 20) console.error(e); }   // never swallowed: every throw is kept for the checks to read
    updateCaddy();
  }
  requestAnimationFrame(frame);
}

// --- the Station's keys: pad, Home/Research/Library/Vivarium, ← and ✓, plus the Caddy's Dock/Lift key ---
// A key goes to the face, which moves the ring or says an intent; the intent is the rule call (intents/*). The Dock key is the Caddy's, a world event and not a Station key: the host calls the frame's dock.
// The Caddy's Dock key, a world event and never a Station key: it wakes Idle (the dither back, held) and docks or lifts. A Dock pressed in a hold is kept by the host and acts when the hold ends (host.mjs).
function dockKey() { const wasIdle = UI.idle; if (wasIdle) { UI.idle = false; FX.wake = clock.now; caddy.wake(); const w = SPECS.frame.idle.wake; H.play({ kind: "dither", target: "stage", ms: w.transition.ms, hold: motion() ? w.hold : 0 }); } frameIntents.dock(H, wasIdle, dockElsewhere); dockElsewhere = false; }
export function act(k) {
  if (!G.ready || !FACE) return;
  clock.now = performance.now(); UI.lastInput = clock.now;
  if (H.holding()) { if (k !== "dock") { FACE.key(k); pump(); } else H.pendingDock = !H.pendingDock; return; }   // an event holds input: the face says only a room key, which the host keeps (the last one) and dispatches when the hold ends, and drops during Home's rest (host.mjs); a Dock key is kept too (two presses cancel) and acts when the hold ends
  syncProps();
  if (k === "dock") { dockKey(); return; }
  if (k !== "back" || UI.screen !== "home") FX.msg = "";
  if (k !== "back") UI.arrival = null;   // the Incubator's ← returns to Pods only until another key (the arrival mode of the jump flag)
  FACE.key(k); pump();
}
const stationEl = $("station");
function bindKeys(root) {
  root.querySelectorAll(".k").forEach((btn) => { const k = btn.dataset.key;
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch { /* no capture */ } btn.classList.add("is-down"); act(k); });
    const up = () => btn.classList.remove("is-down"); btn.addEventListener("pointerup", up); btn.addEventListener("pointercancel", up); btn.addEventListener("lostpointercapture", up);
    btn.addEventListener("click", (e) => e.preventDefault()); });
}
bindKeys(stationEl);
$("dockCtl").addEventListener("click", (e) => { act("dock"); e.currentTarget.blur(); });
stationEl.addEventListener("contextmenu", (e) => e.preventDefault());
["touchstart", "touchmove", "gesturestart", "dblclick"].forEach((type) => stationEl.addEventListener(type, (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false }));
const KEYMAP = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "confirm", NumpadEnter: "confirm", Space: "confirm", Escape: "back", Backspace: "back", KeyH: "home", KeyR: "research", KeyL: "library", KeyB: "habitat", KeyD: "dock" };
const EMBED = document.documentElement.classList.contains("embed");   // ?embed: the screen alone in the play page
if (EMBED) delete KEYMAP.KeyD;   // on the play page no device key docks: the shell owns Shift+D
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
// ?embed: one function sets the screen's scale so a CSS pixel covers a whole number of device pixels; a media query on the current dpr re-arms itself on every change, and resize stays for the zoom paths that resize
const setEmbedS = () => { const d = window.devicePixelRatio || 1, k = Math.max(1, Math.floor(d)); document.documentElement.style.setProperty("--embed-s", String(k / d)); };
let dprQuery = null;
function armDpr() { if (dprQuery) dprQuery.removeEventListener("change", onDpr); dprQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`); dprQuery.addEventListener("change", onDpr); }
function onDpr() { setEmbedS(); armDpr(); }
if (EMBED) { setEmbedS(); armDpr(); window.addEventListener("resize", setEmbedS); window.removeEventListener("resize", fit); }
const caddyEl = $("caddy"), dockCtl = $("dockCtl"), dockMark = $("dockMark"), dockWord = $("dockWord"), dockDot = $("dockDot"), caddyPaper = $("caddyPaper");
let caddyKey = "";
const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
// The Caddy's state as the control and the play page's shell take it (frame.json navigation.dock; the shell never reads the save): canDock is the exact condition state.mjs refuses a dock on
// opened: what the last opening brought, until the next dock or lift; partner: the Companion's partner (its lead if carried and grown, else the first grown mibi with it), for the Caddy's lines (play/src/caddy.mjs)
const partnerName = () => { const p = S.partnerOf(G.st, G.sv, G.settings); return p ? p.name : null; };
const caddyState = () => ({ canDock: hasWorld() || G.st.devBay.length > 0, docked: docked(), crates: bayCrates().length, pending: !!(H && H.pendingDock), opened: UI.caddyOpened ?? null, partner: partnerName() });
let lastPosted = "";
function postCaddy(force = false) {
  const m = caddyState(), k = JSON.stringify(m); if (!force && k === lastPosted) return; lastPosted = k;
  if (parent !== window) parent.postMessage({ t: "mb-caddy", ...m }, location.origin);
}
function updateCaddy() {
  const d = docked(), c = caddyState(), key = d + ":" + bayCrates().length + ":" + hasWorld() + ":" + (G.st.dock && G.st.dock.at) + ":" + c.pending + ":" + c.canDock + ":" + JSON.stringify(c.opened) + ":" + c.partner; if (key === caddyKey) return; caddyKey = key;
  if (EMBED) { postCaddy(); return; }
  caddyEl.classList.toggle("lifted", !d);
  dockMark.src = "../ui/assets/masters/pods/frame-companion-" + (d ? "solid" : "outline") + "-16x24.png"; dockWord.textContent = d ? "Lift" : "Dock";
  const crates = !d && c.canDock && c.crates > 0, title = !c.canDock ? "The Companion has no world yet" : d ? "Lift the Companion from the Caddy" : crates ? "Cargo waits aboard: dock to bring it home" : "Dock the Companion in the Caddy";   // copy: station-copy-w1-polish A1
  dockCtl.setAttribute("aria-disabled", String(!c.canDock)); dockCtl.setAttribute("aria-label", d ? "Lift the Companion from the Caddy" : crates ? "Dock the Companion in the Caddy; cargo waits aboard" : "Dock the Companion in the Caddy");
  if (!c.canDock) dockCtl.setAttribute("aria-description", title); else dockCtl.removeAttribute("aria-description");
  dockCtl.title = title;
  dockDot.hidden = !(!d && c.canDock && c.crates > 0); dockCtl.classList.toggle("is-pressed", c.pending);
  caddyPaper.textContent = !hasWorld() ? "Caddy · no Companion world yet" : d ? "Caddy · Companion docked" + (bayCrates().length ? " · " + S.plural(bayCrates().length, "crate") + " sealed" : "") : "Caddy · Companion lifted at " + hm(G.st.dock.at);
}
if (EMBED) window.addEventListener("message", (e) => {   // the play page's shell: the dock by postMessage, the developer panel's visibility; both ends check the origin and the parent
  if (e.origin !== location.origin || e.source !== parent) return; const m = e.data || {};
  if (m.t === "mb-dock") { dockElsewhere = !!m.keysElsewhere; act("dock"); postCaddy(true); }
  else if (m.t === "mb-dev") showDev(!!m.on);
});
window.addEventListener("storage", (e) => { if (e.key !== S.SAVE_KEY && e.key !== null) return; if (!G.ready) return; storageChanged(); updateCaddy(); });   // updateCaddy here too: a hidden frame's animation frames may pause, and the shell still hears a Companion change
const inShell = (() => { try { return EMBED && parent !== window && !!parent.document; } catch { return false; } })();   // the developer panel is built into the play page's drawer (nodes made here are adopted on append; their listeners run in this realm)
const devEl = $("dev"), devBtn = $("devBtn"), devOut = (inShell && parent.document.getElementById("devStationOut")) || $("devOut");
let devOn = false;
function showDev(on) { if (inShell) { devOn = on; if (on) refreshDev(); return; } devEl.hidden = !on; devBtn.setAttribute("aria-pressed", String(on)); devBtn.textContent = on ? "Hide developer tools" : "Developer tools"; if (on) refreshDev(); }
function refreshDev() { if (devOut && (inShell ? true : !devEl.hidden) && devOut.dataset.live === "1") devOut.textContent = genomesText(); }
devBtn.addEventListener("click", (e) => { showDev(devEl.hidden); e.currentTarget.blur(); });
onChange(refreshDev);
fetch("../../build.json", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("no build"); return r.json(); }).then((j) => {
  const short = j.short || String(j.commit || "").slice(0, 7), d = new Date(j.built);
  let t = ""; if (!isNaN(d)) t = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  stampEl.textContent = short ? "build " + short + (t ? " · " + t : "") : "local build";
}).catch(() => { stampEl.textContent = "local build"; });

// --- boot ---
for (const id of ["howTo", "whatTry"]) $(id).open = false;
if (!EMBED) fit();
requestAnimationFrame(frame);
const bootText = (t) => { if (bootEl) bootEl.textContent = t; };   // before the face is up the screen is blank; the words go to the page
bootText("loading the species frames…");
const TEST = new URLSearchParams(location.search).has("test");
const rgbOfName = (name) => { const hex = PALETTE.find(([n]) => n === name)?.[1]; if (!hex) throw new Error("no palette colour " + name); return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); };
// The spec files the face takes (frame, pods, home, cargo, create, incubator, vivarium, habitat, namer, library, bench, cross (the rack pod reads its pigment chips) and sitting), the signed masters and the generated stand-ins; the pictures are made from them when a screen asks.
const bootAssets = async () => {
  const spec = async (f) => (await fetch(new URL("../../ui/specs/station/" + f, import.meta.url), { cache: "no-store" })).json();
  for (const k of ["frame", "pods", "home", "cargo", "create", "incubator", "vivarium", "habitat", "namer", "panel", "library", "bench", "cross", "sitting"]) SPECS[k] = await spec(k + ".json");
  { const ix = await spec("moving/index.json"), sets = {}; for (const id of ix.sets) sets[id] = await spec(`moving/${id}.json`); SPECS.moving = sets; setMoving(sets); }   // the moving sets (Station M1 §2.2): one file a species, one spec on the face
  await loadMasters(new URL("../../ui/assets/masters/", import.meta.url));   // the signed masters take their stand-ins' ids before any screen registers them
  setMetrics(await (await fetch(new URL("../../face/dist/metrics.json", import.meta.url), { cache: "no-store" })).json());   // the face's Inter metrics: Level 2 measures its bottom-line ladders with them (ui/specs/measure.mjs)
  setStandLooks(await spec("stand-looks.json")); setStandSizes(await spec("stand-sizes.json")); await loadStandLayers(new URL("../../ui/assets/stands/", import.meta.url));   // each mibi drawn as itself: the unread default looks and the layered stands' cut-outs (looks.mjs, layered-stand.mjs)
  await loadPodSprites(new URL("../../ui/assets/placeholders/pod/", import.meta.url));
  setEnv({ rgb: rgbOfName });
};
// The icons the text runs inline (⚡ ◆ ❀ ✕ at the 16 px body size) are registered in the manifest as type assets.
for (const name of ["energy", "data", "essence", "cross"]) registerAsset({ id: `icon:${name}:16`, w: 16, h: 16, status: "placeholder", until: "the icon set", build: () => ICON[name](16) });
// The handshake's follow-up (lvgl-switch.md §2.1): the palette, then the spec files the page loaded, then the pictures the face never drops (the name plates and the rail tab grounds).
const faceBoot = async () => {
  const f = await bootFace(undefined, { test: TEST });
  f.send({ t: "palette", name: "station", colours: PALETTE.map(([n, hexv]) => [n, hexv]) });
  for (const [screen, json] of Object.entries(SPECS)) f.send({ t: "spec", screen, json });
  f.pin(pinned(), picture);
  vctx = f.display(vis); FACE = f; H = createHost({ send: sendEvent, nowMs: () => performance.now(), light: () => G.settings.light ?? lightAt(Math.floor(stationSeconds() / 3600), SPECS.frame.light), time: stationSeconds, motion, onDock: dockKey, afterSave: () => { if (G.st.outbox?.length) caddy.flush().catch(() => {}); } });   // a Grow hands its genome to the Caddy at once
};
const ready = Promise.all([loadFrames(), bootAssets()]).then(async ([info]) => {
  await faceBoot();
  loadSettings(); load();
  { const j = new URLSearchParams(location.search).get("jump"); if (j === "arrival" || j === "fork") saveSettings({ jump: j }); }   // the jump test (decision panel spec Part 3): the play page's ?jump= is saved with the settings
  UI.lastInput = performance.now(); G.ready = true;
  buildDevPanel((inShell && parent.document.getElementById("devStation")) || $("devPanel"), { changed: refreshDev, openCrates: () => { H.goto("cargo"); cargo.openBay(H); }, motionProof: () => startScene(sceneHost(), clock.now), endMotionProof: () => endScene(sceneHost()) });
  caddy.startClient();
  if (EMBED) { caddyKey = ""; updateCaddy(); postCaddy(true); }   // the shell hears the Caddy's state at ready
  if (new URLSearchParams(location.search).has("dev")) showDev(true);
  if (bootEl) bootEl.textContent = info.n + " species frames · catalogue " + info.catalogue.id + "@" + info.catalogue.version;
  return info;
}).catch((e) => { bootText("the Station did not start: " + e.message); console.error(e); throw e; });

// The motion proof's scene drives the page as a player would (keys, intents, the host's goto) from the frame loop's clock.
const sceneHost = () => ({ act, goto: (s) => H.goto(s), settings: G.settings, intent: (m) => onFaceMessage(H, { t: "intent", seq: 0, ...m }), now: () => clock.now });
// Test hooks (not part of play). `openBay` is the rule alone, for the tests that need pods in the wells at once; Cargo plays the opening through its own ✓.
const podsGo = (id, f = "pod", view, ci) => { const u = UI.pods; u.cur = id; if (ci != null) u.ci = ci; u.view = view ?? (f.startsWith("rail.") ? "chapter" : f.startsWith("place.") ? "collection" : "overview"); if (f.startsWith("rail.")) u.ci = +f.slice(5); u.cmp = null; u.focusView = null; u.focus.set(f); if (UI.screen !== "pods") H.goto("pods"); };
window.__st = { ready, renderErrors, portraitSource: (digest, rgba) => { const r = injectPortraitSource(digest, rgba); if (r.error) renderErrors.push("portrait " + digest + ": " + r.error); return r; }, faceErrors, said: () => said.splice(0), pendingRoom: () => H.pendingRoom ?? null, get props() { return lastProps ? JSON.parse(lastProps) : null; }, caddy: { state: caddy.state, status: caddy.status, flush: caddy.flush, poll: caddy.poll, land: caddy.land, anyWaiting: caddy.anyWaiting, landed: (sha) => caddy.state.landed.has(sha), pending: () => [...caddy.state.pending.keys()] }, get SV() { return G.sv; }, get ST() { return G.st; }, get UI() { return UI; }, get settings() { return G.settings; }, get FX() { return FX; },
  say: (t) => msg(t), act: (k) => act(k), press: act, need, dockKey: (fromIdle = false) => frameIntents.dock(H, fromIdle), openBay: () => { const r = S.openBay(G.st, G.sv, G.settings, Date.now()); save(); return r; }, wake: () => { UI.idle = false; UI.lastInput = performance.now(); }, goto: (s) => H.goto(s),
  get face() { return FACE ? { refused: () => FACE.refused(), objects: () => FACE.objects(), version: FACE.version, size: FACE.size, loadMs: FACE.loadMs, hash: FACE.hash(), stats: FACE.stats(), pixel: FACE.pixel, invOverflows: () => FACE.invOverflows(), invCap: () => FACE.invCap(), pass: FACE.pass, hide: FACE.hide, offPalette: FACE.offPalette, forceFull: FACE.forceFull, errors: faceErrors.slice(), log: () => lastLog,
    frameTable: () => { const P = lastProps ? JSON.parse(lastProps) : null; if (!P) return null; FACE.props({ ...P, regions: undefined, motion: motion() }); FACE.frame(clock.now); pump(); const n = lastLog?.table ?? null; FACE.props({ ...P, motion: motion() }); FACE.frame(clock.now); pump(); return n; } } : null; },   // the layer check: the node table of the frame alone (the same props with no regions), the scene's own then put back,
  // The face's frame as the tools take it: the framebuffer hash, the pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art, test mode), the errors, the ids of the scene's requests that carry an owed habit key,
  // the pictures the scene gave the face that are placed masters the masters index flags placeholder or stand-in (standIns), and with `capture` the PNG.
  snapshot: ({ capture = false } = {}) => { const f = FACE, out = { hash: f.hash(), errors: faceErrors.slice(), refused: f.refused(), owed: lastOwed.slice(), standIns: lastSent.filter((id) => { const e = assetEntry(id); return !!e?.file && NOT_IN_GOLDENS.includes(e.status); }) }; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); if (capture) { f.forceFull(); f.present(vctx); out.png = vis.toDataURL("image/png"); } return out; },
  libraryWarm: () => { let n = 0; while (warmLibraryNext(LIB_ENV)) n++; return n; }, libraryWaiting,   // the Library's pictures waiting to be made, made now (the goldens take a scene once they are)
  get msg() { return FX.msg; }, capture: () => vis.toDataURL("image/png"), holding: () => H.holding(), check: () => checkSnapshot(), manifest: () => manifestOf(), specs: () => SPECS, frameOf, frameIds, podById, genomesText, podGenome, genomeSha, nameCode,
  stampRGBA: (podId, side = 200) => { const p = podById(podId); if (!p) return null; const fr = frameOf(S.speciesOf(p)); const pb = stampArt(fr, p.genome, p.read, side); return { width: pb.w, height: pb.h, data: pb.rgba() }; },
  stampGenome: (podId) => { const p = podById(podId); const fr = frameOf(S.speciesOf(p)); return stampGenome(fr, p.genome, p.read); },
  grow: (podId, choices) => { const r = S.grow(G.st, podById(podId), choices || {}, G.settings, Date.now()); save(); return r; },
  forecastOf: (aId, bId) => S.forecastOf(G.st, mibiById(aId), mibiById(bId), G.settings), kinshipOf: (aId, bId) => S.kinshipOf(G.st, mibiById(aId), mibiById(bId)),
  isAdult: (m) => S.isAdult(G.st, m, G.settings), budKnown: (c) => S.budChapterKnown(G.st, c, G.settings, Date.now()), benchToday: () => S.benchToday(G.st, Date.now(), G.settings), podGlints: (p) => S.podGlints(G.st, p), compareDiff: (a, b) => S.compareDiff(G.st, podById(a), podById(b)) || [],
  doCross: (aId, bId) => { const r = S.doCross(G.st, G.sv, mibiById(aId), mibiById(bId), G.settings, Date.now()); if (r.ok) { UI.cross = null; save(); H.goto("incubator"); if (G.st.outbox?.length) caddy.flush().catch(() => {}); } return r; },
  openCross: (aId) => openCrossAt(H, mibiById(aId)),   // the test hook: the Cross screen is not reachable by a press while its door is shut (doorOpen(cross))
  podsGo, intent: (m) => { onFaceMessage(H, { t: "intent", seq: 0, ...m }); },
  motionProof: () => startScene(sceneHost(), clock.now), endMotionProof: () => endScene(sceneHost()), scene: () => ({ t: sceneTime(clock.now), beat: sceneBeat(clock.now), ms: SCENE_MS }),
  redraw: () => { const M = FACE.M, n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let px = 0; for (let i = 0; i < n; i++) px += a[i * 4 + 2] * a[i * 4 + 3]; let trav = 0, air = 0; for (let i = 0; i < 12; i++) { const s = M._face_test_state(i); if (s >= 0) { if (s & 16) trav++; if (s & 32) air++; } } return { px, areas: n, tick: M._face_test_tick_area(), deferred: M._face_test_deferred(), travelling: trav, airborne: air, steps: M._face_test_steps() }; },   // the motion proof's CSV: the last frame's redraw
  growCost: (choices) => S.growCost(G.st, choices || {}, G.settings),
  openBud: () => { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); save(); return r; }, skipBud: (how) => { S.skipBud(G.st, G.settings, how); save(); }, fillGuide: (id, share) => { G.st.guide[id] = {}; delete G.st.readOnce[id]; if (share >= 1) G.st.readOnce[id] = frameOf(id).chapters.map((c) => c.id); const g = Lib.fieldGuide(G.st, id, G.settings), want = Math.ceil(share * (g.found + g.unseen)); let n = g.found; for (const ch of g.chapters) { if (ch.sealed) continue; for (const t of ch.traits) for (const l of t.possible) { if (n >= want) break; if (!S.guideLooks(G.st, id, t.id).includes(l)) { S.guideAdd(G.st, id, t.id, [l]); n++; } } } save(); return Lib.fieldGuide(G.st, id, G.settings).found; }, returnMibi: (id) => { const m = S.mibiById(G.st, id), r = m ? S.returnMibi(G.st, G.sv, m, G.settings) : { ok: false }; if (r.ok) save(); return r; }, seedAdults: (species, seed, n) => { const r = S.seedAdults(G.st, species, seed, n, G.settings); save(); return r; }, seedSiblings: (species, seed) => { const r = S.seedSiblings(G.st, species, seed, G.settings); save(); return r; },
  openCreate: (podId) => create.openCreate(H, podById(podId)), readSome: (podId, n) => { const p = podById(podId); S.skipIdentify(G.st, p); const fr = frameOf(S.speciesOf(p)); fr.chapters.slice(0, n).forEach((c) => S.read(G.st, p, c.id, G.settings)); save(); },
  seedPod: (species, gs) => { const r = S.seedPodFromGenome(G.st, podGenome(frameOf(species), gs), G.settings, Date.now()); save(); return r; },
  seedCrate: (species, n, seed) => { const r = S.seedCrate(G.st, species, n, seed, Date.now()); save(); return r; }, skipRead: (podId) => { S.skipRead(G.st, podById(podId), G.settings); save(); }, addMaterials: (e, d, s) => { S.addMaterials(G.st, e, d, s); save(); } };

// What the CI checks read at a screenshot point: the screen, the face's log (every string it set, each drawn region) and its counts.
function checkSnapshot() {
  const pod = podById(UI.pods.cur), fr = pod ? frameOf(S.speciesOf(pod)) : null, f = FACE;
  const pr = lastProps ? JSON.parse(lastProps) : null;
  return { screen: UI.screen, idle: UI.idle, homeFocus: pr?.state === "home" ? pr.focus.cur : null, viv: pr?.screen === "vivarium" ? { state: pr.state, cur: pr.focus.cur, n: pr.regions.tiles.items.length, figs: pr.regions.residents.map((r) => ({ stage: r.stage, figure: r.figure ?? null })) } : null, bench: pr?.screen === "bench" ? { props: pr, cur: pr.focus.cur } : null, lib: pr?.screen === "library" && pr.state === "all" ? { props: pr, cur: pr.focus.cur } : null, hab: pr?.screen === "habitat" && pr.regions ? { state: pr.state, cur: pr.focus.cur, n: pr.regions.tiles.items.length, open: pr.overlay?.id === "namer" } : null, props: pr && { screen: pr.screen, state: pr.state ?? (pr.idle ? "idle" : null), overlay: pr.overlay?.id ?? null }, cells: pr?.regions?.page?.cells?.length ?? null, frame: pr?.regions?.page?.frame ?? null, cmpCells: pr?.regions?.pageA?.cells?.length ?? null, railTabs: pr?.regions?.rail?.tabs?.length ?? null, size: f.size, page: [vis.width, vis.height], log: lastLog, refused: f.refused(), objects: f.objects(), errors: faceErrors.slice(),
    pod: pod ? { id: pod.id, idd: !!pod.idd, chapters: fr && pod.idd ? fr.chapters.length : 0, species: S.speciesOf(pod) } : null, focus: UI.pods.focus.cur, view: UI.pods.view, cmp: !!UI.pods.cmp, mode: UI.screen === "pods" ? (UI.pods.cmp ? "compare" : UI.pods.view) : null,
    placeholders: manifestOf().filter((e) => NOT_FINAL.includes(e.status)).length };
}
