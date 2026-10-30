// The Station page: the host of the LVGL face (technical-architecture.md §8). It boots the face, sends it the palette, the spec files (frame and pods), the pictures and the screen's props,
// runs its frames from the animation frame, copies what it redrew onto the page's canvas, and turns the keys and the face's intents into the rules. Everything on the screen is the face's:
// there is no drawing here. Also: the Caddy's one key, the shared save's storage event, the developer panel and the test hooks. Rules are in state.mjs, the key's rule call in intents/*, the
// props in host.mjs.
import { clock, motion } from "./pixels.mjs";
import { G, FX, UI, SPECS, msg, save, load, loadSettings, saveSettings, storageChanged, need, docked, hasWorld, bayCrates, onChange, podById, mibiById, saveKey, switchCompanion, activeCompanion } from "./game.mjs";
import * as S from "./state.mjs";
import * as Lib from "./library.mjs";
import { startScene, endScene, sceneTime, sceneBeat, SCENE_MS } from "./motion-scene.mjs";
import { frameOf, frameIds, stampGenome, podGenome, genomeSha, nameCode } from "./genome.mjs";
import { buildDevPanel, genomesText } from "./dev.mjs";
import * as caddy from "./caddy.mjs";
import { mountFooter, caddyAnswers } from "../../play/src/footer.mjs";
import { openCross as openCrossAt } from "./intents/habitat.mjs";
import { stampArt } from "./art.mjs";
import { loadRoomsInBackground } from "./masters.mjs";
import { injectPortraitSource } from "./portrait-source.mjs";
import * as cargo from "./intents/cargo.mjs";
import * as create from "./intents/create.mjs";
import * as frameIntents from "./intents/frame.mjs";
import { onFaceMessage } from "./host.mjs";
import { warmLibraryNext, libraryWaiting } from "./pictures.mjs";
import { manifest as manifestOf, assetEntry, NOT_FINAL, NOT_IN_GOLDENS, BUILT_NOT_IN_GOLDENS } from "../../ui/assets.mjs";
import { CORE, hooks, loadFrames, bootAssets, startFace, pump, tick, act, dockKey, LIB_ENV } from "./core.mjs";   // the loop, shared with the headless harness (prototypes/playtest)

const $ = (id) => document.getElementById(id);
const vis = $("screen");   // the page's screen: the face copies what it redrew onto it (face.display)
const bootEl = $("boot");
if (new URLSearchParams(location.search).has("dev")) $("devBtn").hidden = false;   // the Developer tools button is for ?dev only (the Shift+T key stays on the play page)

// --- the loop (core.mjs): what the page owns goes in through its hooks ---
let dockElsewhere = false;   // ?embed: the play page's Dock control asked while another device had the keys (frame.json navigation.dock); never set standalone
let vctx = null;
Object.assign(hooks, { wake: () => caddy.wake(), afterSave: () => { if (G.st.outbox?.length) caddy.flush().catch(() => {}); }, present: () => CORE.face.present(vctx), dockElsewhere: () => { const d = dockElsewhere; dockElsewhere = false; return d; } });
let lastT = null;
function frame(t) {
  clock.now = t; const dt = lastT == null ? 0 : t - lastT; lastT = t;
  if (G.ready && CORE.face) { tick(t, dt); updateCaddy(); }
  requestAnimationFrame(frame);
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
const caddyState = () => ({ canDock: hasWorld() || G.st.devBay.length > 0, docked: docked(), crates: bayCrates().length, pending: !!(CORE.host && CORE.host.pendingDock), opened: UI.caddyOpened ?? null, partner: partnerName() });
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
  if (m.t === "mb-dock") {   // the Caddy's seat or lift, handed over by the play page: `want` is the cradle's state (absent: a press); `companion` is who docked, the active player from now on
    dockElsewhere = !!m.keysElsewhere;
    if (m.want === true && m.companion) switchCompanion(m.companion);
    if (typeof m.want !== "boolean" || docked() !== m.want) act("dock"); else dockElsewhere = false;
    postCaddy(true);
  }
  else if (m.t === "mb-dev") showDev(!!m.on);
});
window.addEventListener("storage", (e) => { if (e.key !== saveKey() && e.key !== null) return; if (!G.ready) return; storageChanged(); updateCaddy(); });   // updateCaddy here too: a hidden frame's animation frames may pause, and the shell still hears a Companion change
const inShell = (() => { try { return EMBED && parent !== window && !!parent.document; } catch { return false; } })();   // the developer panel is built into the play page's drawer (nodes made here are adopted on append; their listeners run in this realm)
const devEl = $("dev"), devBtn = $("devBtn"), devOut = (inShell && parent.document.getElementById("devStationOut")) || $("devOut");
let devOn = false;
function showDev(on) { if (inShell) { devOn = on; if (on) refreshDev(); return; } devEl.hidden = !on; devBtn.setAttribute("aria-pressed", String(on)); devBtn.textContent = on ? "Hide developer tools" : "Developer tools"; if (on) refreshDev(); }
function refreshDev() { if (devOut && (inShell ? true : !devEl.hidden) && devOut.dataset.live === "1") devOut.textContent = genomesText(); }
devBtn.addEventListener("click", (e) => { showDev(devEl.hidden); e.currentTarget.blur(); });
onChange(refreshDev);
mountFooter($("buildFoot"), { buildUrl: "../../build.json", schema: S.ST_SCHEMA, caddy: caddyAnswers });   // the build footer (page chrome, always shown): build, save version, whether the Caddy service answers

// --- boot ---
for (const id of ["howTo", "whatTry"]) $(id).open = false;
if (!EMBED) fit();
requestAnimationFrame(frame);
const bootText = (t) => { if (bootEl) bootEl.textContent = t; };   // before the face is up the screen is blank; the words go to the page
bootText("loading the species frames…");
const TEST = new URLSearchParams(location.search).has("test");
// The name list births draw from is the current one; ?names=<list key> pins another (the tools that show the archived English names ask for en-short-1).
{ const n = new URLSearchParams(location.search).get("names"); if (n && S.NAME_LISTS[n]) S.useNameList(n); }
const faceBoot = async () => { const f = await startFace({ test: TEST }); vctx = f.display(vis); };
const ready = Promise.all([loadFrames(), bootAssets({ test: TEST })]).then(async ([info]) => {
  await faceBoot();
  loadSettings(); load();
  { const j = new URLSearchParams(location.search).get("jump"); if (j === "arrival" || j === "fork") saveSettings({ jump: j }); }   // the jump test (decision panel spec Part 3): the play page's ?jump= is saved with the settings
  UI.lastInput = performance.now(); G.ready = true;
  loadRoomsInBackground();   // the other rooms, now that the first screen can draw (the room after the shown one first; 16 in flight)
  buildDevPanel((inShell && parent.document.getElementById("devStation")) || $("devPanel"), { changed: refreshDev, openCrates: () => { CORE.host.goto("cargo"); cargo.openBay(CORE.host); }, motionProof: () => startScene(sceneHost(), clock.now), endMotionProof: () => endScene(sceneHost()) });
  caddy.startClient();
  if (EMBED) { caddyKey = ""; updateCaddy(); postCaddy(true); }   // the shell hears the Caddy's state at ready
  if (new URLSearchParams(location.search).has("dev")) showDev(true);
  if (bootEl) bootEl.textContent = info.n + " species frames · catalogue " + info.catalogue.id + "@" + info.catalogue.version;
  return info;
}).catch((e) => { bootText("the Station did not start: " + e.message); console.error(e); throw e; });

// The motion proof's scene drives the page as a player would (keys, intents, the host's goto) from the frame loop's clock.
const sceneHost = () => ({ act, goto: (s) => CORE.host.goto(s), settings: G.settings, intent: (m) => onFaceMessage(CORE.host, { t: "intent", seq: 0, ...m }), now: () => clock.now });
// Test hooks (not part of play). `openBay` is the rule alone, for the tests that need pods in the wells at once; Cargo plays the opening through its own ✓.
const podsGo = (id, f = "pod", view, ci) => { const u = UI.pods; u.cur = id; if (ci != null) u.ci = ci; u.view = view ?? (f.startsWith("rail.") ? "chapter" : f.startsWith("place.") ? "collection" : "overview"); if (f.startsWith("rail.")) u.ci = +f.slice(5); u.cmp = null; u.focusView = null; u.focus.set(f); if (UI.screen !== "pods") CORE.host.goto("pods"); };
window.__st = { ready, useLongNames: (advance) => { const l = S.longestNames(undefined, 12, advance); S.useNameList(l); G.st.mibis.forEach((m, i) => { m.name = l[l.length - 1 - (i % l.length)]; }); G.st.namesUsed = [...new Set([...(G.st.namesUsed ?? []), ...G.st.mibis.map((m) => S.nameKey(m.name))])]; return l; }, renderErrors: CORE.renderErrors, portraitSource: (digest, rgba) => { const r = injectPortraitSource(digest, rgba); if (r.error) CORE.renderErrors.push("portrait " + digest + ": " + r.error); return r; }, faceErrors: CORE.faceErrors, said: () => CORE.said.splice(0), pendingRoom: () => CORE.host.pendingRoom ?? null, get props() { return CORE.lastProps ? JSON.parse(CORE.lastProps) : null; }, caddy: { state: caddy.state, status: caddy.status, flush: caddy.flush, poll: caddy.poll, land: caddy.land, anyWaiting: caddy.anyWaiting, landed: (sha) => caddy.state.landed.has(sha), pending: () => [...caddy.state.pending.keys()] }, get SV() { return G.sv; }, get ST() { return G.st; }, get UI() { return UI; }, get settings() { return G.settings; }, get FX() { return FX; },
  say: (t) => msg(t), act: (k) => act(k), press: act, need, dockKey: (fromIdle = false) => frameIntents.dock(CORE.host, fromIdle), openBay: () => { const r = S.openBay(G.st, G.sv, G.settings, Date.now()); save(); return r; }, wake: () => { UI.idle = false; UI.lastInput = performance.now(); }, goto: (s) => CORE.host.goto(s),
  get face() { return CORE.face ? { refused: () => CORE.face.refused(), objects: () => CORE.face.objects(), version: CORE.face.version, size: CORE.face.size, loadMs: CORE.face.loadMs, hash: CORE.face.hash(), stats: CORE.face.stats(), pixel: CORE.face.pixel, invOverflows: () => CORE.face.invOverflows(), invCap: () => CORE.face.invCap(), pass: CORE.face.pass, hide: CORE.face.hide, offPalette: CORE.face.offPalette, forceFull: CORE.face.forceFull, errors: CORE.faceErrors.slice(), log: () => CORE.lastLog,
    frameTable: () => { const P = CORE.lastProps ? JSON.parse(CORE.lastProps) : null; if (!P) return null; CORE.face.props({ ...P, regions: undefined, motion: motion() }); CORE.face.frame(clock.now); pump(); const n = CORE.lastLog?.table ?? null; CORE.face.props({ ...P, motion: motion() }); CORE.face.frame(clock.now); pump(); return n; } } : null; },   // the layer check: the node table of the frame alone (the same props with no regions), the scene's own then put back,
  // The face's frame as the tools take it: the framebuffer hash, the pixels outside the palette on pass 1 (chrome) and pass 2 (chrome and art, test mode), the errors, the ids of the scene's requests that carry an owed habit key,
  // the pictures the scene gave the face that no golden may draw (standIns: the placed masters the masters index flags placeholder or stand-in; builtStandIns: the built pictures registered stand-in), and with `capture` the PNG.
  snapshot: ({ capture = false } = {}) => { const f = CORE.face, out = { hash: f.hash(), errors: CORE.faceErrors.slice(), refused: f.refused(), owed: CORE.lastOwed.slice(), standIns: CORE.lastSent.filter((id) => { const e = assetEntry(id); return !!e?.file && NOT_IN_GOLDENS.includes(e.status); }), builtStandIns: CORE.lastSent.filter((id) => { const e = assetEntry(id); return !!e && !e.file && BUILT_NOT_IN_GOLDENS.includes(e.status); }) }; for (const n of [1, 2]) { f.pass(n); out["pass" + n] = f.offPalette(); } f.pass(3); if (capture) { f.forceFull(); f.present(vctx); out.png = vis.toDataURL("image/png"); } return out; },
  libraryWarm: () => { let n = 0; while (warmLibraryNext(LIB_ENV)) n++; return n; }, libraryWaiting,   // the Library's pictures waiting to be made, made now (the goldens take a scene once they are)
  get msg() { return FX.msg; }, capture: () => vis.toDataURL("image/png"), holding: () => CORE.host.holding(), check: () => checkSnapshot(), manifest: () => manifestOf(), specs: () => SPECS, frameOf, frameIds, podById, genomesText, podGenome, genomeSha, nameCode,
  stampRGBA: (podId, side = 200) => { const p = podById(podId); if (!p) return null; const fr = frameOf(S.speciesOf(p)); const pb = stampArt(fr, p.genome, p.read, side); return { width: pb.w, height: pb.h, data: pb.rgba() }; },
  stampGenome: (podId) => { const p = podById(podId); const fr = frameOf(S.speciesOf(p)); return stampGenome(fr, p.genome, p.read); },
  grow: (podId, choices) => { const r = S.grow(G.st, podById(podId), choices || {}, G.settings, Date.now()); save(); return r; },
  forecastOf: (aId, bId) => S.forecastOf(G.st, mibiById(aId), mibiById(bId), G.settings), kinshipOf: (aId, bId) => S.kinshipOf(G.st, mibiById(aId), mibiById(bId)),
  isAdult: (m) => S.isAdult(G.st, m, G.settings), budKnown: (c) => S.budChapterKnown(G.st, c, G.settings, Date.now()), benchToday: () => S.benchToday(G.st, Date.now(), G.settings), podGlints: (p) => S.podGlints(G.st, p), compareDiff: (a, b) => S.compareDiff(G.st, podById(a), podById(b)) || [],
  doCross: (aId, bId) => { const r = S.doCross(G.st, G.sv, mibiById(aId), mibiById(bId), G.settings, Date.now()); if (r.ok) { UI.cross = null; save(); CORE.host.goto("incubator"); if (G.st.outbox?.length) caddy.flush().catch(() => {}); } return r; },
  openCross: (aId) => openCrossAt(CORE.host, mibiById(aId)),   // the test hook: the Cross screen is not reachable by a press while its door is shut (doorOpen(cross))
  podsGo, intent: (m) => { onFaceMessage(CORE.host, { t: "intent", seq: 0, ...m }); },
  motionProof: () => startScene(sceneHost(), clock.now), endMotionProof: () => endScene(sceneHost()), scene: () => ({ t: sceneTime(clock.now), beat: sceneBeat(clock.now), ms: SCENE_MS }),
  redraw: () => { const M = CORE.face.M, n = M._face_dirty_count(), a = M.HEAP32.subarray(M._face_dirty_rects() >> 2, (M._face_dirty_rects() >> 2) + n * 4); let px = 0; for (let i = 0; i < n; i++) px += a[i * 4 + 2] * a[i * 4 + 3]; let trav = 0, air = 0; for (let i = 0; i < 12; i++) { const s = M._face_test_state(i); if (s >= 0) { if (s & 16) trav++; if (s & 32) air++; } } return { px, areas: n, tick: M._face_test_tick_area(), deferred: M._face_test_deferred(), travelling: trav, airborne: air, steps: M._face_test_steps() }; },   // the motion proof's CSV: the last frame's redraw
  growCost: (choices) => S.growCost(G.st, choices || {}, G.settings),
  openBud: () => { const r = S.openBud(G.st, G.sv, G.settings, Date.now()); save(); return r; }, skipBud: (how) => { S.skipBud(G.st, G.settings, how); save(); }, fillGuide: (id, share) => { G.st.guide[id] = {}; delete G.st.readOnce[id]; if (share >= 1) G.st.readOnce[id] = frameOf(id).chapters.map((c) => c.id); const g = Lib.fieldGuide(G.st, id, G.settings), want = Math.ceil(share * (g.found + g.unseen)); let n = g.found; for (const ch of g.chapters) { if (ch.sealed) continue; for (const t of ch.traits) for (const l of t.possible) { if (n >= want) break; if (!S.guideLooks(G.st, id, t.id).includes(l)) { S.guideAdd(G.st, id, t.id, [l]); n++; } } } save(); return Lib.fieldGuide(G.st, id, G.settings).found; }, returnMibi: (id) => { const m = S.mibiById(G.st, id), r = m ? S.returnMibi(G.st, G.sv, m, G.settings) : { ok: false }; if (r.ok) save(); return r; }, seedAdults: (species, seed, n) => { const r = S.seedAdults(G.st, species, seed, n, G.settings); save(); return r; }, seedSiblings: (species, seed) => { const r = S.seedSiblings(G.st, species, seed, G.settings); save(); return r; },
  openCreate: (podId) => create.openCreate(CORE.host, podById(podId)), readSome: (podId, n) => { const p = podById(podId); S.skipIdentify(G.st, p); const fr = frameOf(S.speciesOf(p)); fr.chapters.slice(0, n).forEach((c) => S.read(G.st, p, c.id, G.settings)); save(); },
  seedPod: (species, gs) => { const r = S.seedPodFromGenome(G.st, podGenome(frameOf(species), gs), G.settings, Date.now()); save(); return r; },
  seedCrate: (species, n, seed) => { const r = S.seedCrate(G.st, species, n, seed, Date.now()); save(); return r; }, skipRead: (podId) => { S.skipRead(G.st, podById(podId), G.settings); save(); }, addMaterials: (e, d, s) => { S.addMaterials(G.st, e, d, s); save(); },
  get saveKey() { return saveKey(); }, get companion() { return activeCompanion(); } };

// What the CI checks read at a screenshot point: the screen, the face's log (every string it set, each drawn region) and its counts.
function checkSnapshot() {
  const pod = podById(UI.pods.cur), fr = pod ? frameOf(S.speciesOf(pod)) : null, f = CORE.face;
  const pr = CORE.lastProps ? JSON.parse(CORE.lastProps) : null;
  return { screen: UI.screen, idle: UI.idle, homeFocus: pr?.state === "home" ? pr.focus.cur : null, viv: pr?.screen === "vivarium" ? { state: pr.state, cur: pr.focus.cur, n: pr.regions.tiles.items.length, figs: pr.regions.residents.map((r) => ({ stage: r.stage, figure: r.figure ?? null })) } : null, bench: pr?.screen === "bench" ? { props: pr, cur: pr.focus.cur } : null, lib: pr?.screen === "library" && pr.state === "all" ? { props: pr, cur: pr.focus.cur } : null, hab: pr?.screen === "habitat" && pr.regions ? { state: pr.state, cur: pr.focus.cur, n: pr.regions.tiles.items.length, open: pr.overlay?.id === "namer" } : null, props: pr && { screen: pr.screen, state: pr.state ?? (pr.idle ? "idle" : null), overlay: pr.overlay?.id ?? null }, cells: pr?.regions?.page?.cells?.length ?? null, frame: pr?.regions?.page?.frame ?? null, cmpCells: pr?.regions?.pageA?.cells?.length ?? null, railTabs: pr?.regions?.rail?.tabs?.length ?? null, size: f.size, page: [vis.width, vis.height], log: CORE.lastLog, refused: f.refused(), objects: f.objects(), errors: CORE.faceErrors.slice(),
    pod: pod ? { id: pod.id, idd: !!pod.idd, chapters: fr && pod.idd ? fr.chapters.length : 0, species: S.speciesOf(pod) } : null, focus: UI.pods.focus.cur, view: UI.pods.view, cmp: !!UI.pods.cmp, mode: UI.screen === "pods" ? (UI.pods.cmp ? "compare" : UI.pods.view) : null,
    placeholders: manifestOf().filter((e) => NOT_FINAL.includes(e.status)).length };
}
