// The host's side of the face (lvgl-switch.md §2.1, §2.7): what the page sends the face and what it does with what the face says, with no DOM, no canvas and no clock of its own.
//   props    the screen's props for the face: frame props for every screen (the top bar, the bottom line, the message plate), Home props for Home, Pods props for Pods, and for every other screen
//            state "notBuilt" (the face draws frame.json notBuilt); Idle is `idle: true` and nothing else
//   events   the presenter's ticks and flashes, the plate, the screen change's dither
//   faces    the intents and the focus the face sends, turned into the rules (intents/*) and the screens' state (UI)
// The rules are state.mjs's, the screens' state is game.mjs's UI, and the key's rule call is intents/*: nothing here decides a rule or a layout.
import { G, FX, UI, SPECS, LAYER, msg, goScreen, save, need, docked, hasWorld, podById, mibiById } from "./game.mjs";
import * as S from "./state.mjs";
import { frameOf, genomeDigest } from "./genome.mjs";
import { podsProps } from "./views/pods-props.mjs";
import { homeBuild, mibiPictureOf } from "./views/home-props.mjs";
import { dropLight } from "./light-grade.mjs";
import { vivariumBuild } from "./views/vivarium-props.mjs";
import { habitatBuild } from "./views/habitat-props.mjs";
import { namerBuild } from "./views/namer-props.mjs";
import { benchBuild } from "./views/bench-props.mjs";
import { libraryBuild } from "./views/library-props.mjs";
import { idleBuild } from "./views/idle-props.mjs";
import { cargoBuild } from "./views/cargo-props.mjs";
import { createBuild, createPod } from "./views/create-props.mjs";
import { incubatorBuild } from "./views/incubator-props.mjs";
import { incubatorTick } from "./intents/incubator.mjs";
import { enter as enterHabitat, endMeet } from "./intents/habitat.mjs";
import { cuttingHatch, landHatch } from "./intents/incubator.mjs";
import { registerPictures, iconRequests } from "./pictures.mjs";
import { dispatch, INTENTS } from "./intents/index.mjs";
import { SCREEN_PLACE, backWord, parentOf, isBuilt } from "./nav.mjs";
import { assetEntry, asset as assetOf } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";


// ---- the pictures ----
// A picture's pixels for the face: RGBA, straight alpha, with its slice and tile when it is a nine-slice, and its status. `env` reaches the builders (palette lookup).
let ENV = null;
export const setEnv = (env) => { ENV = env; };
export function picture(id) {
  const a = assetOf(id, ENV); if (!a) return null;
  const e = assetEntry(id), status = e?.status === "master" ? "master" : "placeholder", p = { w: a.w, h: a.h, status, policy: policyOf(id, status), data: a.rgba() };   // the layer it shows on, from the one family table (an id outside every family throws: a new family is the art director's to place)
  return e?.slice ? { ...p, slice: e.slice, tile: e.tile ?? 0 } : p;
}
// The ids the frame names in its own spec (the room marks, the lamps, the caps, the sun): the same on every screen.
const walk = (o, into) => { if (typeof o === "string") { if (assetEntry(o)) into.add(o); } else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v, into); };
// The Companion's face mark, docked or away, as the frame resolves it (the species' name in lower case).
// The Companion's face mark names the mibi it is out with: its lead if carried, else the first it carries.
const withMibiKey = () => { const c = hasWorld() ? S.carriedIds(G.st, G.sv) : [], id = c.includes(G.sv.lead) ? G.sv.lead : c[0] ?? null, m = id == null ? null : mibiById(id); return m ? S.spName(m).toLowerCase() : null; };
function companionIds() {
  const fm = SPECS.frame.regions?.marks?.face || {}, key = withMibiKey(), out = [];
  for (const t of [fm.docked, fm.away, fm.empty]) if (typeof t === "string") out.push(key ? t.replace("{mibi}", key) : t);
  return out;
}

// ---- the frame ----
// The top bar's facts: the room's key and one word, the counters as the rules hold them (the face counts them up on `tick` events), the Companion and whether a mibi is with it.
export function topFor(screen) {
  const v = topValues();
  return { screen, title: SPECS.frame.strings.titles[screen], turn: v.turn + 1, turnFlash: false, materials: { e: v.e, d: v.d, s: v.s }, flash: {}, companion: { docked: docked(), withMibi: withMibiKey() } };
}
// The counters and the turn as the top bar shows them: the rules' while a crate is not opening, and while the crates open (cargo.json events.opening) what each crate has shown by its step, so the bar ticks crate by crate.
export const topValues = () => UI.cargo.shown ?? { e: G.st.e, d: G.st.d, s: G.st.s, turn: G.st.turn };
// A screen the face has no words for: no action, no subject, the way back from navigation and the default notice.
export function notBuiltLine(screen) {
  const nav = SPECS.frame.navigation, place = SCREEN_PLACE[screen] || screen, pod = podById(UI.create?.podId ?? UI.pods.cur), mibi = mibiById(UI.hab.id), back = backWord(nav, place, nav.screens[place]?.back === "{name}" ? mibi?.name ?? "" : pod ? S.cap(S.spName(pod)) : "");   // a way back that names the pod ("{pod}") names the pod Create was opened on, one that names the mibi ("{name}") the mibi shown up close; the face reads "Back" when the name does not fit
  return { ok: null, back, subject: "", need: need().text };
}
// The place a screen's way back lands on: the parent in the navigation tree, as a screen id (and the state of Pods it opens on).
export function parentScreen(screen) {
  const nav = SPECS.frame.navigation, place = SCREEN_PLACE[screen] || screen, up = parentOf(nav, place); if (!up) return null;
  const [s, state] = up.split("."), to = Object.keys(SCREEN_PLACE).find((k) => SCREEN_PLACE[k] === s) || s;
  return { screen: to, state };
}

// ---- Pods ----
// Keep Pods' state valid: a view, a pod under the beam, and the ring on a target of the state (the face moves it; the host keeps it). Returns the Pods props body.
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const placeOf = (id) => "place." + Math.max(0, G.st.tray.findIndex((q) => q.id === id));
const initialFocus = (view) => (view === "collection" ? placeOf(UI.pods.cur) : view === "chapter" ? "rail." + (UI.pods.ci || 0) : "pod");
export function podsBody() {
  const p = UI.pods, F = p.focus;
  p.view ??= SPECS.pods.initial;
  if (!podById(p.cur)) { const q = S.neediestPod(G.st); p.cur = q ? q.id : null; }
  if (!p.cur || !G.st.tray.length) p.view = "collection";
  const key = p.cmp ? "overview" : p.view;
  { let newly = false; const see = (q) => { if (q && !q.seen) { q.seen = 1; newly = true; } }; if (key === "collection") G.st.tray.forEach(see); else see(podById(p.cur)); if (newly) save(); }   // a pod Pods draws has been seen (the Home notice stops demanding it); never cleared
  if (p.focusView !== key) { p.focusView = key; if (!F.cur || !F.cur.startsWith(key === "collection" ? "place." : key === "chapter" ? "rail." : "")) F.cur = null; }
  const model = () => ({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), crates: S.bayCrates(G.st, G.sv).length, ui: p, focus: F.cur, present: {} });
  let body = podsProps(model(), SPECS.pods, SPECS.frame);
  if (p.cmp) F.cur = null; else if (!body.props.focus.targets.some((t) => t.id === F.cur)) { F.cur = null; F.ensure(body.props.focus.targets, initialFocus(key)); body = podsProps(model(), SPECS.pods, SPECS.frame); }
  if (F.cur && F.cur.startsWith("rail.")) p.ci = +F.cur.slice(5);
  if (F.cur && F.cur.startsWith("place.")) { const q = G.st.tray[+F.cur.slice(6)]; if (q) p.cur = q.id; }
  return body;
}

// The living window's inputs the views take from the host (Station M1 §2.6): the Station time (seconds of the day; the developer's "Station time" or the clock), the rest rules (vivarium.json rules.rest) and whether
// the moving sets play on stand-ins (the developer switch "Motion sets (stand-ins)", off by default; a set whose cells are all placed masters plays without it). A view never reads a clock.
const living = () => ({ time: timeNow(), restRules: SPECS.vivarium?.rules?.rest, motionSets: !!G.settings.motionSets });

// ---- Home ----
// Keep Home's focus valid (the ring on a target present, else on the room) and return its props body. The pad is the face's; the host keeps what the face says in UI.home.f.
export function homeBody(light = lightNow()) {
  const model = () => ({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI, focus: UI.home.f === "room" ? null : UI.home.f, light, ...living() });
  const body = homeBuild(model(), SPECS.home, SPECS.frame);
  if (body.props.focus.cur === "room") UI.home.f = "room";
  return body;
}

// ---- The Vivarium's whole ----
// Every mibi at home in one window and the bays along the foot. The ring is the face's (focus.graph); the host keeps what the face says in UI.viv.f, and a way in (null) takes the ring to the mibi last seen up close (vivarium.json focus.entry).
export function vivariumBody(light = lightNow()) {
  const body = vivariumBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, focus: UI.viv.f, seen: UI.hab.id, ...living() }, SPECS.vivarium, SPECS.frame, SPECS.home);
  UI.viv.f = body.props.focus.cur;
  return body;
}

// ---- One mibi up close ----
// The mibi chosen on the whole (or the hatch's, or the first at home), its card, the modules and the strip; the ring is the face's (habitat.json focus.graph) and the host keeps what the face says in UI.hab.f. While the namer is open its props ride on
// habitat's (an overlay) and its bottom line is the frame's. Returns null with no mibi housed: the whole shows its empty state.
export function habitatBody(light = lightNow()) {
  const body = habitatBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, focus: UI.hab.f, habId: UI.hab.id, meetId: UI.meet, armed: UI.hab.wildArm === 1, ...living() }, SPECS.habitat, SPECS.frame, SPECS.home);
  if (!body) return null;
  UI.hab.f = body.props.focus.cur; UI.hab.id = body.shown.id; const rs = body.props.regions.resident; UI.hab.asleep = !!(rs && rs.moving && rs.rest === "asleep");   // a sleeper with a moving set: its Greet is the asleep moment (habitat.json events.moment.asleep)
  const n = UI.hab.namer, who = n && mibiById(n.id);
  if (n && who) { const nb = namerBuild({ st: G.st, mibi: who, ui: n }, SPECS.namer); body.props.overlay = nb.overlay; body.line = nb.line; } else if (n) UI.hab.namer = null;
  return body;
}

// ---- the Probe bench ----
// The Probe in its cradle with its plates, the mend switch and the upgrade slot; the Probe and the dock are the rules', the ring, the slot's arm and the install's hold the UI's (UI.bench).
export function benchBody() {
  return benchBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI.bench }, SPECS.bench, SPECS.frame);
}

// ---- The Library's spread ----
// Sixteen frames, one a species in its own place; the ring is the face's (library.json spread.focus.graph) and the host keeps the frame it says in UI.lib.i (intents/library.mjs focus).
export function libraryBody() {
  return libraryBuild({ st: G.st, settings: G.settings, ui: UI.lib }, SPECS.library, SPECS.frame);
}

// ---- Cargo ----
// The bay, the crate opening and the report: Cargo's state is the UI's (UI.cargo), the pods and the crates are the rules'. The ring is on nothing; the pad does nothing.
export function cargoBody() {
  return cargoBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI }, SPECS.cargo, SPECS.home, SPECS.frame);
}

// ---- Create ----
// The founder's shaping: Create's state is the UI's (UI.create), the pod and the rules are the rules'. The ring is on the roll when a trait is read, else on nothing.
export function createBody() {
  return createBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, frame: SPECS.frame }, SPECS.create, SPECS.pods);
}

// ---- Incubator ----
// The bud's wait and the hatch: the bud is the rules', the hatch (the juvenile stepping out) the UI's (UI.inc.hatch). No lamp: Grow paints nothing (decisions 10-11 14:17).
export function incubatorBody() {
  return incubatorBuild({ st: G.st, sv: G.sv, settings: G.settings, frame: SPECS.frame, ui: UI, ...living(), lamp: "" }, SPECS.incubator, SPECS.pods);
}

// ---- the props of the screen on the page ----
// { msg: the props message (without seq), ids: every picture the face needs before them, requests: the Pods pictures to register }
export function screenProps(plate) {
  if (UI.screen === "create" && !(UI.create && createPod(G.st, UI.create))) goScreen("pods");   // Create with no pod to shape: Pods
  if (UI.screen === "habitat" && !S.housed(G.st).length) goScreen("vivarium");   // one mibi up close always shows one mibi: with none housed the whole shows its empty state
  const screen = UI.screen, light = lightNow();   // the light is read once per sync: the props and the pictures dropped after them agree on it
  if (shownLight !== light) { if (shownLight) dropLight(shownLight); shownLight = light; }   // one light's graded residents in the manifest (fix 7): re-derived from the cached master if a light returns
  if (UI.idle) {   // Idle: the whole screen, no frame but its line (frame.json idle): the living window's people, the painting's slot and the one line
    const body = idleBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, ...living() }, SPECS.frame);
    registerPictures(body.requests, { podById, frameOf, mibiGenome: (id) => mibiById(id)?.genome });
    const ids = new Set(body.requests.map((r) => r.id)); walk(body.props, ids);
    return { msg: { screen, ...body.props }, ids: [...ids], light, lit: litOf(body.requests) };
  }
  const top = topFor(screen), pl = { text: plate || "", timed: true };
  if (!isBuilt(screen) || (screen === "library" && UI.lib.f !== "spread")) return { msg: { screen, state: "notBuilt", frame: { top, line: notBuiltLine(screen === "library" ? "book" : screen), plate: pl } }, ids: [], light };   // the Book (and its guide) is a state of the library screen: not built yet, ← reads Library
  const body = screen === "home" ? homeBody(light) : screen === "cargo" ? cargoBody() : screen === "create" ? createBody() : screen === "incubator" ? incubatorBody() : screen === "vivarium" ? vivariumBody(light) : screen === "habitat" ? habitatBody(light) : screen === "library" ? libraryBody() : screen === "bench" ? benchBody() : podsBody(), reqs = [...body.requests, ...iconRequests()];
  registerPictures(reqs, { podById: (id) => (screen === "create" && id === UI.create.podId ? createPod(G.st, UI.create) : podById(id)), frameOf, mibiGenome: (id) => mibiById(id)?.genome, budGenome: () => G.st.bud?.genome, founderGenome: S.founderGenome });
  const ids = new Set(reqs.map((r) => r.id)); walk(body.props, ids);
  if (screen === "habitat" && UI.hab.prev) ids.add(UI.hab.prev);   // the mibi the swap's dither starts from stays on the face until the event ends
  if (screen === "create" && UI.create.prev) ids.add(UI.create.prev);   // the founder the roll's dither starts from stays on the face until the event ends
  const line = { ...body.line }; if (line.need == null) line.need = need().text;   // the frame's notice on every screen unless the screen has its own
  return { msg: { screen, ...body.props, frame: { top, line, plate: pl } }, ids: [...ids], light, lit: litOf(reqs) };
}
let shownLight = null;   // the light of the props the face was last given (fix 7): the swap's from names the id of the light shown, not a fresh read
const litOf = (reqs) => reqs.filter((r) => r.kind === "mibi" && r.light).map((r) => r.id);   // the graded residents the props name
// The pictures a light puts on the face, by their ids (their sizes from the specs that place them): the host drops them once props with the next light are taken.
export const lightIds = (light) => { const v = SPECS.frame.idle.regions.vivarium.rect, g = SPECS.home.regions.glass.rect, b = SPECS.frame.idle.regions.bed.rect; return [`idle-vivarium-${light}:${v[2]}x${v[3]}`, `home-glass-${light}:${g[2]}x${g[3]}`, `home-bed-${light}-${b[2]}x${b[3]}`, ...(SPECS.habitat?.light ? [`${SPECS.habitat.light.pictures[light]}-${SPECS.habitat.light.size.join("x")}`] : [])]; };   // and one mibi up close's near Vivarium
// The pictures of the frame and the Companion's face, the same on every screen.
export function frameIds() {
  const ids = new Set(); walk(SPECS.frame.regions, ids); for (const id of companionIds()) if (assetEntry(id)) ids.add(id);
  for (const id of ["energy", "data", "essence", "cross"]) if (assetEntry(`icon:${id}:16`)) ids.add(`icon:${id}:16`);
  return [...ids];
}
// Idle takes none of the frame's marks but the one its waiting lamps are (frame.json regions.marks.lamp12.waiting).
export const idleMarkIds = () => [SPECS.frame.regions.marks.lamp12.waiting].filter(assetEntry);
export const pinned = () => pinnedPictures(SPECS.pods, SPECS.frame);

// ---- the host the intents call ----
// h = { st, sv, settings, ui, specs, now, motion, say, goto, play, at, holding, save }. A Dock key pressed during a hold is kept (pendingDock; two presses cancel) and `onDock` runs when the hold ends, before a kept room key; the room key waits out the wake's own dither. Effects reach the face as events: the Dock's crates sliding into the Cargo module (arrival/cargo) and the rest (held, then Idle) are Home's;
// the Dock's crates sliding into the bay (arrival/crates) and the crates opening (arrival/crate) are Cargo's. An event's `hold` is whole ms of held input from its start, independent of its `ms` (lvgl-switch.md §2.1): the host and the face each hold until the
// latest start + hold on their own clocks. What follows an event's end is scheduled with `at(ms, fn)` and run by `frame()`; it never waits for the face's `done`.
const PLAYS = new Set(["seal", "wipe", "ribbon", "plate", "dither", "hatch", "rest", "grow", "growNow", "moment", "read", "mend", "switch", "install"]), ARRIVALS = new Set(["cargo", "crates", "crate"]);
// The light of the moment, read once for both screens that show it (the Vivarium by the clock: Home's glass and bed, Idle's painting): the host's, so a view never reads a clock.
let lightNow = () => { throw new Error("the host has no light: createHost({ light }) names it"); };
let timeNow = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };   // the Station time in seconds of the day: createHost({ time }) names it (main.mjs: the developer's Station time, else the clock)
export function createHost({ send, nowMs, light, time = null, afterSave = () => {}, motion = () => true, onDock = (h) => INTENTS.frame.dock(h) }) {
  lightNow = light; if (time) timeNow = time;
  let holdUntil = 0, arrivalUntil = 0; const timers = [];
  const holding = () => nowMs() < holdUntil;
  const arriving = () => nowMs() < arrivalUntil;   // an arrival plays (Home's crates sliding in holds nothing, and the idle timer waits for its end)
  const play = (e) => {
    if (!(PLAYS.has(e.kind) || (e.kind === "arrival" && ARRIVALS.has(e.target)) || (e.kind === "tick" && ["e", "d", "s"].includes(e.target)) || (e.kind === "flash" && (e.target === "turn" || e.target === "nameTag")))) return;
    const hold = e.hold ?? 0; if (!Number.isInteger(hold) || hold < 0 || hold > 30000) throw new Error(`play ${e.kind}: hold is a whole number of ms (0 = none), not ${hold}`);
    if (hold) holdUntil = Math.max(holdUntil, nowMs() + hold);
    if (e.kind === "arrival") arrivalUntil = Math.max(arrivalUntil, nowMs() + (e.ms || 0));
    send({ t: "event", ...e, hold });
  };
  const at = (ms, fn) => { timers.push({ t: nowMs() + ms, fn }); };
  const h = {
    get st() { return G.st; }, get sv() { return G.sv; }, get settings() { return G.settings; }, ui: UI, specs: SPECS,
    now: () => Date.now(), motion, say: msg, play, at, save: () => { save(); afterSave(); }, holding, arriving,
    // The frame loop's call: what was scheduled and is due runs, in order; then the room key kept through a hold is dispatched once the hold is over.
    frame: () => {
      const t = nowMs(); timers.sort((a, b) => a.t - b.t);
      while (timers.length && timers[0].t <= t) timers.shift().fn();
      incubatorTick(h);
      if (!holding() && h.pendingDock) { h.pendingDock = false; onDock(h); }   // a Dock key pressed in a hold is kept (two presses cancel) and acts when the hold ends, before a kept room key: the Dock is a world event (cargo.json keys.dock, frame.json idle.keys.dock)
      if (!holding() && h.pendingRoom && cuttingHatch(h)) { h.pendingRoom = null; landHatch(h); }   // a room key kept through the hatch's hold is a cutting key: it lands the meet and is used up (UI/UX "Hatch cutting key")
      if (!holding() && h.pendingRoom) { const k = h.pendingRoom; h.pendingRoom = null; dispatch(h, { screen: UI.screen, target: "room", verb: "room:" + k }); }
    },
    // Any key but ✓ disarms: the hatch and the gate wait for a second ✓ and nothing else.
    disarm: () => { UI.pods.wildArm = 0; UI.hab.wildArm = 0; UI.bench.arm = 0; },
    goto: (name, hold = 0, o = {}) => { const fresh = UI.screen !== name; goScreen(name); if (fresh) { if (!o.cut) play({ kind: "dither", target: "stage", ms: 180, hold }); if (name === "habitat") enterHabitat(h, o); } },   // hold: whole ms of held input (the Vivarium's look holds 180); o.cut: drawn as a cut, no dither (the hatch's cutting key), o.meetHold: the meet's moment holds input that long
  };
  return h;
}

// The ring moved on one mibi up close: the host keeps it, the first move ends the meet, and a tile shows its mibi in the window (events.swap: the resident cross-dithers to it, a cut when either is out with the Companion).
function habitatFocus(h, target) {
  const a = UI.hab; a.f = target; endMeet(h);
  if (!target.startsWith("tile.")) return;
  const id = +target.slice(5), was = S.mibiById(G.st, a.id), now = S.mibiById(G.st, id); if (!now || id === a.id) return;
  const px = (mb) => (mb && !S.isAway(G.st, G.sv, mb) ? mibiPictureOf(G.st, mb, SPECS.habitat.regions.resident.rect.slice(2), G.settings, shownLight ?? "day").id : "");
  const from = px(was); a.id = id;
  if (from && px(now)) { const e = SPECS.habitat.events.swap; a.prev = from; h.play({ kind: e.kind, target: e.target, from, ms: e.ms, hold: h.motion() ? e.hold : 0 }); h.at(e.ms, () => { if (a.prev === from) a.prev = null; }); }
}

// What the face said, as the rules: the ring moved (Pods keeps the focus of its state), or a key on a focused target (an intent). A not-built screen has no targets; its ← goes to the parent in the navigation tree.
// While a hold runs every intent is dropped but a room key, which is kept (the last one) and dispatched when the hold ends, after a kept Dock key; Home's rest drops it too (home.json events.rest.keys).
export function onFaceMessage(h, m) {
  if (m.t === "done") { if (m.kind === "hatch" && cuttingHatch(h) && !h.holding()) landHatch(h); return; }   // informative only, but for the hatch with a moving set: a key the face acted on after the hold ended it (its cut), and that key lands the meet
  if (m.screen === "incubator" && UI.screen !== "incubator") return;   // a key the cut already spent (the meet has landed): the Incubator's intent after the screen left is dropped
  if (m.screen === "incubator" && cuttingHatch(h) && !h.holding() && m.t === "intent") { landHatch(h); return; }   // the cutting key lands the meet and does nothing else
  if (m.t === "focus") {
    if (m.screen === "namer") { if (UI.screen === "habitat" && UI.hab.namer) UI.hab.namer.f = m.target; return; }   // a namer message after it closed is dropped
    if (m.screen === "habitat") { if (UI.screen === "habitat" && !UI.hab.namer) habitatFocus(h, m.target); return; }   // and habitat's while the namer is open
    if (m.screen === "bench") { if (UI.screen === "bench") INTENTS.bench.focus(h, m.target); return; }
    if (m.screen === "library") { if (UI.screen === "library" && UI.lib.f === "spread") INTENTS.library.focus(h, m.target); return; }
    if (m.screen === "pods" && UI.screen === "pods") UI.pods.focus.set(m.target); else if (m.screen === "home" && UI.screen === "home") UI.home.f = m.target; else if (m.screen === "vivarium" && UI.screen === "vivarium") UI.viv.f = m.target; return;
  }
  if (m.t !== "intent") return;
  if (m.screen === "namer" && !(UI.screen === "habitat" && UI.hab.namer)) return;   // a namer intent after it closed is dropped
  if (m.screen === "habitat" && UI.hab.namer && !m.verb?.startsWith("room:")) return;   // the screen beneath takes no key while the namer is open
  if (m.screen === "habitat" && m.verb?.startsWith("room:") && !h.holding()) endMeet(h);   // the first press ends the meet, a room key too
  if (m.verb === "back" && m.screen !== "namer" && !isBuilt(m.screen) && !UI.idle && !h.holding()) { const up = parentScreen(m.screen); if (up) { if (up.screen === "pods" && up.state) { UI.pods.view = up.state; UI.pods.focusView = null; } h.goto(up.screen); } return; }
  if (h.holding()) { if (m.verb?.startsWith("room:") && !UI.resting) h.pendingRoom = m.verb.slice(5); return; }
  if (m.verb === "wake") { dispatch(h, m); const w = SPECS.frame.idle.wake, cut = !(h.motion ? h.motion() : true); h.play({ kind: "dither", target: "stage", ms: w.transition.ms, hold: cut ? 0 : w.hold }); return; }
  dispatch(h, m);
}
export { INTENTS };
