// The Station page: the host of the LVGL face (technical-architecture.md §8). It boots the face, sends it the palette, the spec files (frame and pods), the pictures and the screen's props,
// runs its frames from the animation frame, copies what it redrew onto the page's canvas, and turns the keys and the face's intents into the rules. Everything on the screen is the face's:
// there is no drawing here. Also: the Caddy's one key, the shared save's storage event, the developer panel and the test hooks. Rules are in state.mjs, the key's rule call in intents/*, the
// props in host.mjs.
import { PALETTE, clock, motion } from "./pixels.mjs";
import { ICON } from "./art.mjs";
import { G, FX, UI, SPECS, IDLE_MS, msg, save, load, loadSettings, storageChanged, need, docked, hasWorld, bayCrates, arriving, onChange, podById, mibiById, LAYER } from "./game.mjs";
import * as S from "./state.mjs";
import { setFrames, frameOf, frameIds, stampGenome, podGenome } from "./genome.mjs";
import { buildDevPanel, genomesText } from "./dev.mjs";
import * as caddy from "./caddy.mjs";
import { watchFrame } from "./trickle.mjs";
import { stampArt } from "./art.mjs";
import { loadPodSprites } from "./podsprites.mjs";
import { loadMasters } from "./masters.mjs";
import { bootFace } from "./face-lvgl.mjs";
import * as home from "./intents/home.mjs";
import * as frameIntents from "./intents/frame.mjs";
import { createHost, onFaceMessage, screenProps, frameIds as frameMarkIds, pinned, picture, setEnv } from "./host.mjs";
import { manifest as manifestOf, registerAsset, assetEntry, NOT_FINAL } from "../../ui/assets.mjs";

const $ = (id) => document.getElementById(id);
const vis = $("screen"); let vctx = null;   // the page's screen: the face copies what it redrew onto it (face.display)
const stampEl = $("stamp"), bootEl = $("boot");

// --- the frames, fetched beside the page (the sandbox publishes prototypes/* side by side) ---
async function loadFrames() {
  const base = new URL("../../workbench/frames/", import.meta.url);
  const index = await (await fetch(new URL("index.json", base), { cache: "no-store" })).json();
  const frames = await Promise.all(index.species.map((s) => fetch(new URL(s.file, base), { cache: "no-store" }).then((r) => r.json())));
  setFrames(frames);
  return { catalogue: index.catalogue, n: frames.length };
}

// --- the face ---
let FACE = null, H = null, lastLog = null, lastProps = null, msgSent = -1;
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
function syncProps() {
  if (msgSent !== FX.msgAt) { msgSent = FX.msgAt; if (FX.msg) H.play({ kind: "plate", target: "msg", ms: 4000 }); }
  for (const e of LAYER.presenter.events({ e: G.st.e, d: G.st.d, s: G.st.s, turn: G.st.turn })) H.play(e);
  const p = screenProps(FX.msg), key = JSON.stringify(p.msg);
  if (key === lastProps) return;
  { FACE.beginScene(); for (const id of [...(UI.idle ? [] : frameMarkIds()), ...p.ids]) FACE.handleOf(id, picture); }   // Idle needs only its own pictures
  if (FACE.props({ ...p.msg, motion: motion() }) < 0) faceErrors.push(...FACE.errors());
  lastProps = key;   // set once the props are sent: a throw above leaves it unset, so the next frame tries again (and the error is kept)
}
function render() {
  syncProps(); FACE.frame(clock.now); FACE.present(vctx); pump();
}
let errN = 0, lastT = null;
function frame(t) {
  clock.now = t; const dt = lastT == null ? 0 : t - lastT; lastT = t;
  if (G.ready && FACE) {
    const w = watchFrame({ st: G.st, sv: G.sv, settings: G.settings, screen: UI.screen, idle: UI.idle, habId: UI.hab.id, dt, now: Date.now() }); if (w && w.earned) save();   // the bench trickle (before the Idle check: Idle watches nothing)
    if (!UI.idle && !UI.resting && !UI.entering && t - UI.lastInput > IDLE_MS && !arriving() && !H.holding() && UI.cargo?.state !== "report") frameIntents.enterIdle(H);   // the screen goes idle after a minute without a press, never in a hold, Cargo's opening or its report card (frame.json idle.enter)
    try { render(); H.frame(); } catch (e) { renderErrors.push(String(e && e.message || e)); if (errN++ < 20) console.error(e); }   // never swallowed: every throw is kept for the checks to read
    updateCaddy();
  }
  requestAnimationFrame(frame);
}

// --- the Station's keys: pad, Home/Research/Library/Vivarium, ← and ✓, plus the Caddy's Dock/Lift key ---
// A key goes to the face, which moves the ring or says an intent; the intent is the rule call (intents/*). The Dock key is the Caddy's, a world event and not a Station key: the host calls the frame's dock.
export function act(k) {
  if (!G.ready || !FACE) return;
  clock.now = performance.now(); UI.lastInput = clock.now;
  if (H.holding()) { if (k !== "dock") { FACE.key(k); pump(); } return; }   // an event holds input: the Dock key does not act; the face says only a room key, which the host keeps (the last one) and dispatches when the hold ends, and drops during Home's rest (host.mjs)
  syncProps();
  if (k === "dock") { const wasIdle = UI.idle; if (wasIdle) { UI.idle = false; FX.wake = clock.now; caddy.wake(); H.play({ kind: "dither", target: "stage", ms: 180, hold: motion() ? 180 : 0 }); } frameIntents.dock(H, wasIdle); return; }
  if (k !== "back" || UI.screen !== "home") FX.msg = "";
  if (k !== "confirm") H.disarm();
  FACE.key(k); pump();
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
const hm = (t) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
function updateCaddy() {
  const d = docked(), key = d + ":" + bayCrates().length + ":" + hasWorld() + ":" + (G.st.dock && G.st.dock.at); if (key === caddyKey) return; caddyKey = key;
  caddyEl.classList.toggle("lifted", !d); dockKeyEl.textContent = d ? "LIFT" : "DOCK";
  caddyPaper.textContent = !hasWorld() ? "Caddy · no Companion world yet" : d ? "Caddy · Companion docked" + (bayCrates().length ? " · " + S.plural(bayCrates().length, "crate") + " sealed" : "") : "Caddy · Companion lifted at " + hm(G.st.dock.at);
}
window.addEventListener("storage", (e) => { if (e.key !== S.SAVE_KEY && e.key !== null) return; if (!G.ready) return; storageChanged(); });
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
const bootText = (t) => { if (bootEl) bootEl.textContent = t; };   // before the face is up the screen is blank; the words go to the page
bootText("loading the species frames…");
const TEST = new URLSearchParams(location.search).has("test");
const rgbOfName = (name) => { const hex = PALETTE.find(([n]) => n === name)?.[1]; if (!hex) throw new Error("no palette colour " + name); return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); };
// The spec files the face takes (frame, pods and home), the signed masters and the generated stand-ins; the pictures are made from them when a screen asks.
const bootAssets = async () => {
  const spec = async (f) => (await fetch(new URL("../../ui/specs/station/" + f, import.meta.url), { cache: "no-store" })).json();
  for (const k of ["frame", "pods", "home"]) SPECS[k] = await spec(k + ".json");
  await loadMasters(new URL("../../ui/assets/masters/", import.meta.url));   // the signed masters take their stand-ins' ids before any screen registers them
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
  vctx = f.display(vis); FACE = f; H = createHost({ send: sendEvent, nowMs: () => performance.now(), motion, afterSave: () => { if (G.st.outbox?.length) caddy.flush().catch(() => {}); } });   // a Grow hands its genome to the Caddy at once
};
const ready = Promise.all([loadFrames(), bootAssets()]).then(async ([info]) => {
  await faceBoot();
  loadSettings(); load();
  UI.lastInput = performance.now(); G.ready = true;
  buildDevPanel($("devPanel"), { changed: refreshDev, openCrates: () => home.openBay(H) });
  caddy.startClient();
  if (new URLSearchParams(location.search).has("dev")) showDev(true);
  if (bootEl) bootEl.textContent = info.n + " species frames · catalogue " + info.catalogue.id + "@" + info.catalogue.version;
  return info;
}).catch((e) => { bootText("the Station did not start: " + e.message); console.error(e); throw e; });

// Test hooks (not part of play).
const podsGo = (id, f = "pod", view, ci) => { const u = UI.pods; u.cur = id; if (ci != null) u.ci = ci; u.view = view ?? (f.startsWith("rail.") ? "chapter" : f.startsWith("place.") ? "collection" : "overview"); if (f.startsWith("rail.")) u.ci = +f.slice(5); u.cmp = null; u.focusView = null; u.focus.set(f); if (UI.screen !== "pods") H.goto("pods"); };
window.__st = { ready, renderErrors, faceErrors, said: () => said.splice(0), pendingRoom: () => H.pendingRoom ?? null, get props() { return lastProps ? JSON.parse(lastProps) : null; }, caddy: { state: caddy.state, status: caddy.status, flush: caddy.flush, poll: caddy.poll, land: caddy.land, anyWaiting: caddy.anyWaiting, landed: (sha) => caddy.state.landed.has(sha), pending: () => [...caddy.state.pending.keys()] }, get SV() { return G.sv; }, get ST() { return G.st; }, get UI() { return UI; }, get settings() { return G.settings; }, get FX() { return FX; },
  say: (t) => msg(t), act: (k) => act(k), press: act, need, dockKey: (fromIdle = false) => frameIntents.dock(H, fromIdle), openBay: () => home.openBay(H), wake: () => { UI.idle = false; UI.lastInput = performance.now(); }, goto: (s) => H.goto(s),
  get face() { return FACE ? { refused: () => FACE.refused(), objects: () => FACE.objects(), version: FACE.version, size: FACE.size, loadMs: FACE.loadMs, hash: FACE.hash(), stats: FACE.stats(), pixel: FACE.pixel, pass: FACE.pass, offPalette: FACE.offPalette, forceFull: FACE.forceFull, errors: faceErrors.slice(), log: () => lastLog } : null; },
  // The face's frame as the tools take it: the framebuffer hash, the pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art, test mode), the errors, and with `capture` the PNG.
  snapshot: ({ capture = false } = {}) => { const f = FACE, out = { hash: f.hash(), errors: faceErrors.slice(), refused: f.refused() }; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); if (capture) { f.forceFull(); f.present(vctx); out.png = vis.toDataURL("image/png"); } return out; },
  get msg() { return FX.msg; }, capture: () => vis.toDataURL("image/png"), holding: () => H.holding(), check: () => checkSnapshot(), manifest: () => manifestOf(), specs: () => SPECS, frameOf, frameIds, podById, genomesText,
  stampRGBA: (podId, side = 200) => { const p = podById(podId); if (!p) return null; const fr = frameOf(S.speciesOf(p)); const pb = stampArt(fr, p.genome, p.read, side); return { width: pb.w, height: pb.h, data: pb.rgba() }; },
  stampGenome: (podId) => { const p = podById(podId); const fr = frameOf(S.speciesOf(p)); return stampGenome(fr, p.genome, p.read); },
  grow: (podId, choices) => { const r = S.grow(G.st, podById(podId), choices || {}, G.settings, Date.now()); save(); return r; },
  forecastOf: (aId, bId) => S.forecastOf(G.st, mibiById(aId), mibiById(bId), G.settings), kinshipOf: (aId, bId) => S.kinshipOf(G.st, mibiById(aId), mibiById(bId)),
  isAdult: (m) => S.isAdult(G.st, m, G.settings), budKnown: (c) => S.budChapterKnown(G.st, c, G.settings, Date.now()), benchToday: () => S.benchToday(G.st, Date.now(), G.settings), podGlints: (p) => S.podGlints(G.st, p), compareDiff: (a, b) => S.compareDiff(G.st, podById(a), podById(b)) || [],
  doCross: (aId, bId) => { const r = S.doCross(G.st, G.sv, mibiById(aId), mibiById(bId), G.settings, Date.now()); if (r.ok) { UI.cross = null; save(); H.goto("incubator"); if (G.st.outbox?.length) caddy.flush().catch(() => {}); } return r; },
  podsGo, intent: (m) => { onFaceMessage(H, { t: "intent", seq: 0, ...m }); }, growCost: (choices) => S.growCost(G.st, choices || {}, G.settings),
  openBud: () => { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); save(); return r; }, skipBud: (how) => { S.skipBud(G.st, G.settings, how); save(); }, seedAdults: (species, seed, n) => { const r = S.seedAdults(G.st, species, seed, n, G.settings); save(); return r; }, seedSiblings: (species, seed) => { const r = S.seedSiblings(G.st, species, seed, G.settings); save(); return r; },
  seedPod: (species, gs) => { const r = S.seedPodFromGenome(G.st, podGenome(frameOf(species), gs), G.settings, Date.now()); save(); return r; },
  seedCrate: (species, n, seed) => { const r = S.seedCrate(G.st, species, n, seed, Date.now()); save(); return r; }, skipRead: (podId) => { S.skipRead(G.st, podById(podId), G.settings); save(); }, addMaterials: (e, d, s) => { S.addMaterials(G.st, e, d, s); save(); } };

// What the CI checks read at a screenshot point: the screen, the face's log (every string it set, each drawn region) and its counts.
function checkSnapshot() {
  const pod = podById(UI.pods.cur), fr = pod ? frameOf(S.speciesOf(pod)) : null, f = FACE;
  const pr = lastProps ? JSON.parse(lastProps) : null;
  return { screen: UI.screen, idle: UI.idle, homeFocus: pr?.state === "home" ? pr.focus.cur : null, props: pr && { screen: pr.screen, state: pr.state ?? (pr.idle ? "idle" : null) }, cells: pr?.regions?.page?.cells?.length ?? null, railTabs: pr?.regions?.rail?.tabs?.length ?? null, size: f.size, page: [vis.width, vis.height], log: lastLog, refused: f.refused(), objects: f.objects(), errors: faceErrors.slice(),
    pod: pod ? { id: pod.id, idd: !!pod.idd, chapters: fr && pod.idd ? fr.chapters.length : 0, species: S.speciesOf(pod) } : null, focus: UI.pods.focus.cur, view: UI.pods.view, cmp: !!UI.pods.cmp, mode: UI.screen === "pods" ? (UI.pods.cmp ? "compare" : UI.pods.view) : null,
    placeholders: manifestOf().filter((e) => NOT_FINAL.includes(e.status)).length };
}
