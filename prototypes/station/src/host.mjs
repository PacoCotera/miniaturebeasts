// The host's side of the face (lvgl-switch.md §2.1, §2.7): what the page sends the face and what it does with what the face says, with no DOM, no canvas and no clock of its own.
//   props    the screen's props for the face: frame props for every screen (the top bar, the bottom line, the message plate), Home props for Home, Pods props for Pods, and for every other screen
//            state "notBuilt" (the face draws frame.json notBuilt); Idle is `idle: true` and nothing else
//   events   the presenter's ticks and flashes, the plate, the screen change's dither
//   faces    the intents and the focus the face sends, turned into the rules (intents/*) and the screens' state (UI)
// The rules are state.mjs's, the screens' state is game.mjs's UI, and the key's rule call is intents/*: nothing here decides a rule or a layout.
import { G, FX, UI, SPECS, LAYER, msg, goScreen, save, need, docked, hasWorld, podById, mibiById, onScreenChange, stationDate } from "./game.mjs";
import * as S from "./state.mjs";
import { speciesStatus } from "./library.mjs";
import { frameOf, genomeDigest } from "./genome.mjs";
import { podsProps } from "./views/pods-props.mjs";
import { capLine } from "./views/words.mjs";
import { homeBuild, mibiPictureOf, setLibrary, setLibrarySpecies } from "./views/home-props.mjs";
import { libraryOf, specimenSpecies, STARTER } from "./views/specimen-props.mjs";
setLibrary(libraryOf);   // Home's Library module: the specimen of the species with something found (build spec 4.2)
setLibrarySpecies((st, settings) => specimenSpecies(st, settings) ?? STARTER);   // the species it is for: where ✓ on its bezel puts the Library's ring
import { dropLight } from "./light-grade.mjs";
import { vivariumBuild } from "./views/vivarium-props.mjs";
import { shownRoom, roomPictureIds } from "./views/room-props.mjs";
import { habitatBuild } from "./views/habitat-props.mjs";
import { namerBuild } from "./views/namer-props.mjs";
import { panelBuild } from "./views/panel-props.mjs";
import { benchBuild } from "./views/bench-props.mjs";
import { libraryBuild, speciesBuild, sheetAhead, familyBuild } from "./views/library-props.mjs";
import { idleBuild } from "./views/idle-props.mjs";
import { cargoBuild } from "./views/cargo-props.mjs";
import { createBuild, createPod } from "./views/create-props.mjs";
import { incubatorBuild } from "./views/incubator-props.mjs";
import { sittingBuild } from "./views/sitting-props.mjs";
import { newSit } from "./intents/sitting.mjs";
import { incubatorTick } from "./intents/incubator.mjs";
import { enter as enterHabitat, endMeet } from "./intents/habitat.mjs";
import { cuttingHatch, landHatch } from "./intents/incubator.mjs";
import { arrivePending } from "./intents/arrival.mjs";
import { registerPictures, iconRequests, movingSource, libraryMade, lastSheet, wantLibrary, droppedPictures } from "./pictures.mjs";
import { setMovingSource } from "./moving.mjs";
import { dispatch, INTENTS } from "./intents/index.mjs";
import { SCREEN_PLACE, backWord, parentOf, isBuilt } from "./nav.mjs";
import { assetEntry, asset as assetOf } from "../../ui/assets.mjs";
import { policyOf } from "../../ui/asset-policy.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";
import { footOf } from "./moving.mjs";


// ---- the pictures ----
// A picture's pixels for the face: RGBA, straight alpha, with its slice and tile when it is a nine-slice, and its status. `env` reaches the builders (palette lookup).
let ENV = null;
export const setEnv = (env) => { ENV = env; };
setMovingSource(movingSource({ frameOf }));   // a moving set's figure is measured from its atlas when its resident's props are built (moving.mjs movingFigure)
export function picture(id) {
  const a = assetOf(id, ENV); if (!a) return null;
  const e = assetEntry(id), status = e?.status === "master" ? "master" : "placeholder", p = { w: a.w, h: a.h, status, policy: policyOf(id, status), data: a.rgba() };   // the layer it shows on, from the one family table (an id outside every family throws: a new family is the art director's to place)
  const foot = footOf(id, a, (i) => assetOf(i, ENV), SPECS.frame?.focus?.ring?.shapes?.footprint);   // a creature's footprint (fix 14): measured here, the one path from the manifest to the face, stored on the entry and sent on `asset`
  if (e) { if (foot) e.foot = foot; else delete e.foot; }
  return { ...p, ...(e?.slice ? { slice: e.slice, tile: Number.isInteger(e.tile) ? e.tile : 0 } : {}), ...(foot ? { foot } : {}) };
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
  const nav = SPECS.frame.navigation, place = SCREEN_PLACE[screen] || screen, pod = podById(UI.create?.podId ?? UI.pods.cur), mibi = mibiById(UI.hab.id), bw = nav.screens[place]?.back, back = backWord(nav, place, bw === "{name}" ? mibi?.name ?? "" : bw === "{Species}" ? frameOf(UI.lib.species)?.species.name ?? "" : pod ? S.cap(S.spName(pod)) : "");   // a way back that names the pod ("{pod}") names the pod Create was opened on, one that names the mibi ("{name}") the mibi shown up close, one that names the species ("{Species}") the Library's species; the face reads "Back" when the name does not fit
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
  const pn = UI.panel;
  if (pn && pn.screen === "pods" && podById(p.cur) && p.view === "overview") {   // the Return panel is open: its props ride on Pods' (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, jump: G.settings.jump }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
  } else if (pn && pn.screen === "pods") UI.panel = null;
  return body;
}

// The living window's inputs the views take from the host (Station M1 §2.6): the Station time (seconds of the day; the developer's "Station time" or the clock), the rest rules (vivarium.json rules.rest) and whether
// the moving sets play on stand-ins (the developer switch "Motion sets (stand-ins)", off by default; a set whose cells are all placed masters plays without it). A view never reads a clock.
const living = () => ({ time: timeNow(), restRules: SPECS.vivarium?.rules?.rest, motionSets: !!G.settings.motionSets, sendoff: !!UI.sendoff });   // sendoff: the lift's send-off plays on the bed (intents/frame.mjs; home.json events.sendoff)

// ---- Home ----
// Keep Home's focus valid (the ring on a target present, else on the room) and return its props body. The pad is the face's; the host keeps what the face says in UI.home.f.
export function homeBody(light = lightNow()) {
  const model = () => ({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI, focus: UI.home.f === "room" ? null : UI.home.f, time: timeNow(), date: stationDate(), now: Date.now(), place: "", light, restRules: SPECS.vivarium?.rules?.rest, motionSets: !!G.settings.motionSets });   // place: the save has no place name yet
  const body = homeBuild(model(), SPECS.home, SPECS.frame);
  if (body.props.focus.cur === "room") UI.home.f = "room";
  return body;
}

// ---- The Vivarium's whole ----
// Every mibi at home in one window and the places along the foot. The ring is the face's (focus.graph); the host keeps what the face says in UI.viv.f, and a way in (null) takes the ring to the mibi last seen up close (vivarium.json focus.entry).
export function vivariumBody(light = lightNow()) {
  const body = vivariumBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, focus: UI.viv.f, seen: UI.hab.id, ...living() }, SPECS.vivarium, SPECS.frame, SPECS.home);
  UI.viv.f = body.props.focus.cur;
  return body;
}

// ---- One mibi up close ----
// The mibi chosen on the whole (or the hatch's, or the first at home), its card, the modules and the strip; the ring is the face's (habitat.json focus.graph) and the host keeps what the face says in UI.hab.f. While the namer is open its props ride on
// habitat's (an overlay) and its bottom line is the frame's. Returns null with no mibi housed: the whole shows its empty state.
export function habitatBody(light = lightNow()) {
  const body = habitatBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, focus: UI.hab.f, habId: UI.hab.id, meetId: UI.meet, ...living() }, SPECS.habitat, SPECS.frame, SPECS.home, SPECS.sitting);
  if (!body) return null;
  UI.hab.f = body.props.focus.cur; UI.hab.id = body.shown.id; const rs = body.props.regions.resident; UI.hab.asleep = !!(rs && rs.moving && rs.rest === "asleep");   // a sleeper with a moving set: its Greet is the asleep moment (habitat.json events.moment.asleep)
  const n = UI.hab.namer, who = n && mibiById(n.id), pn = UI.panel;
  if (pn && pn.screen === "habitat") {   // the Return panel is open: its props ride on habitat's (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, jump: G.settings.jump }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
  } else if (pn && pn.screen !== "create" && pn.screen !== "pods") UI.panel = null;
  else if (n && who) { const nb = namerBuild({ st: G.st, mibi: who, ui: n }, SPECS.namer); body.props.overlay = nb.overlay; body.line = nb.line; body.requests = [...body.requests, ...nb.requests]; } else if (n) UI.hab.namer = null;
  return body;
}

// ---- the Probe bench ----
// The Probe in its cradle with its plates, the mend switch and the upgrade slot; the Probe and the dock are the rules', the ring and the install's hold the UI's (UI.bench).
export function benchBody() {
  const body = benchBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI.bench }, SPECS.bench, SPECS.frame), pn = UI.panel;
  if (pn && pn.screen === "bench" && docked() && S.tierNow(G.st, G.sv) < 2) {   // the Fit the upgrade? panel is open: its props ride on the bench's (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, jump: G.settings.jump }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
  } else if (pn && pn.screen === "bench") UI.panel = null;
  return body;
}

// ---- The Library's Level 1 ----
// Every species of the catalogue in its cell; the ring is the face's (library.json l1.focus.graph) and the host keeps the species it says in UI.lib.l1 (intents/library.mjs focus). The props name only cell pictures that are made;
// the rest are made off the open path (pictures.mjs wantLibrary), and the cell draws its quiet ground until then.
export function libraryBody() {
  const body = libraryBuild({ st: G.st, settings: G.settings, ui: UI.lib, ready: libraryMade }, SPECS.library, SPECS.frame);
  wantLibrary(body.later); return body;
}
// ---- The Library's Level 2 ----
// One species: its sheet, the shelf and one chapter lit with its page (library.json l2); the ring is the face's (l2.focus.<state>) and the host keeps it in UI.lib.cur (intents/library.mjs species.focus). The props name only
// pictures that are made; the rest are made off the open path. The face's metrics measure the bottom line's ladders (setMetrics, the face's dist/metrics.json).
let METRICS = null;
export const setMetrics = (m) => { METRICS = m; };
// The sheets to make ahead of the open (the Library 3 gate's P2), when nothing else waits: on Level 1 the sheet of the found species its ring rests on; outside the Library the last species whose sheet changed
// (a discovery, a read, sealedOpen) since the last look (the first look only notes them); on Level 2 and below none, so the sheet shown stays kept. The kept sheet is one, so one is asked for at a time.
let aheadSeen = null;
export function libraryAhead() {
  const ids = Object.fromEntries(Object.keys(G.st.guide || {}).map((sid) => [sid, sheetAhead(G.st, G.settings, SPECS.library, sid)]).filter(([, r]) => r)), first = aheadSeen == null;
  const changed = first ? [] : Object.keys(ids).filter((sid) => aheadSeen[sid] !== ids[sid].id); aheadSeen = Object.fromEntries(Object.entries(ids).map(([k, r]) => [k, r.id]));
  if (UI.screen === "library") return UI.lib.l1 && ids[UI.lib.l1] ? [ids[UI.lib.l1]] : [];
  return UI.screen.startsWith("library.") || !changed.length ? [] : [ids[changed[changed.length - 1]]];
}
export function speciesBody() {
  const body = speciesBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI.lib, metrics: METRICS, ready: libraryMade, lastSheet }, SPECS.library, SPECS.frame);
  UI.lib.cur = body.props.focus.cur || null; wantLibrary(body.later); return body;
}

// ---- The Library's Level 3 ----
// One species' lineage (library.json l3): far, close and compare are drawn with words (the lineage's pictures, made by id when the face asks for them, their times printed). The ring is the face's (l3.focus.graph with
// the host's selectors); the host keeps it, CLOSE's camera and the held mibi in UI.lib.l3[species] (intents/library.mjs family.focus and intent).
// Null when no found species is shown (a developer's jump): the frame's notBuilt composition, as before.
export function familyBody() {
  const sid = UI.lib.species; if (!sid || !frameOf(sid) || speciesStatus(G.st, sid) !== "found") return null;
  const sd = stationDate();   // the clock the Yours row counts to: the device's, or noon of the developer's Station date (the goldens' fixed day)
  return familyBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI.lib, metrics: METRICS, now: G.settings.stationDate ? new Date(sd.y, sd.m, sd.d, 12).getTime() : Date.now() }, SPECS.library, SPECS.frame, SPECS.home);
}

// ---- Cargo ----
// The bay, the crate opening and the end: Cargo's state is the UI's (UI.cargo), the pods and the crates are the rules'. The ring is on nothing; the pad does nothing.
export function cargoBody() {
  const body = cargoBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), ui: UI, light: lightNow(), now: Date.now() }, SPECS.cargo, SPECS.home, SPECS.frame, SPECS.sitting), pn = UI.panel, a = UI.cargo.arrival;
  if (pn && pn.screen === "cargo" && UI.cargo.state === "arrival" && a && a.phase === "choice") {   // the dock arrival's choice: the strip's props ride on Cargo's (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, jump: G.settings.jump }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
  } else if (pn && pn.screen === "cargo") UI.panel = null;
  return body;
}

// ---- Create ----
// The founder's shaping: Create's state is the UI's (UI.create), the pod and the rules are the rules'. The ring is on the roll when a trait is read, else on nothing.
export function createBody() {
  const body = createBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, frame: SPECS.frame }, SPECS.create, SPECS.pods), pn = UI.panel;
  if (pn && pn.screen === "create" && !UI.create?.grown) {   // the decision panel is open: its props ride on Create's (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, settings: G.settings, ui: UI, jump: G.settings.jump, create: SPECS.create }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
    if (pn.id === "incubate") body.props.focus = { cur: "", targets: [] };   // Create under the Incubate panel is a snapshot with no ring (build spec 6a.2): the panel's own focus is the overlay's
  } else if (pn) UI.panel = null;
  return body;
}

// ---- Incubator ----
// The bud's wait and the hatch: the bud is the rules', the hatch (the juvenile stepping out) the UI's (UI.inc.hatch). No lamp: Grow paints nothing (decisions 10-11 14:17).
export function incubatorBody() {
  const body = incubatorBuild({ st: G.st, sv: G.sv, settings: G.settings, frame: SPECS.frame, ui: UI, ...living(), lamp: "" }, SPECS.incubator, SPECS.pods), pn = UI.panel;
  if (pn && pn.screen === "incubator" && body.props.state === "growing" && !UI.inc.grow) {   // the Hatch now? panel is open: its props ride on the Incubator's (an overlay) and its bottom line is built from the focused card
    const pb = panelBuild({ st: G.st, sv: G.sv, settings: G.settings, ui: UI, jump: G.settings.jump, now: Date.now() }, SPECS.panel, SPECS.frame, SPECS.pods);
    pn.focus = pb.overlay.focus.cur; body.props.overlay = pb.overlay; body.line = pb.line; body.requests = [...body.requests, ...pb.requests];
  } else if (pn && pn.screen === "incubator") UI.panel = null;
  return body;
}

// ---- the sitting ----
// The ceremony on Habitat's shown mibi (UI.hab.id), its step and choices the UI's (UI.sit, intents/sitting.mjs); the ring is the face's on the cards (sitting.json focus.pose.graph) and the host keeps what the face says in UI.sit.focus.
// While the resident's light change waits for the backdrop's end (events.backdrop.resident "cut") the window keeps the picture it had. Returns null with no visit, or in state portrait while its picture is not held.
export function sittingBody(light = lightNow()) {
  const s = UI.sit; if (!s) return null;
  const body = sittingBuild({ st: G.st, sv: G.sv, settings: G.settings, light, mibiId: UI.hab.id, ui: s }, SPECS.sitting, SPECS.habitat); if (!body) return null;
  s.focus = body.props.focus.cur;
  const r = body.props.regions.resident; if (s.prev.cut && s.prev.resident && r.picture) r.picture = s.prev.resident;
  return body;
}
// A way into the sitting (Habitat's Portrait ✓ and Cargo's end ✓ See the portrait): a fresh visit on mibi `m` in `state` ("pose", or "portrait" for the finished picture), never when the props builder has nothing to show (the portrait's
// picture not held): then nothing changes and it returns false.
export function enterSitting(h, m, { state = "pose", from = "habitat" } = {}) {
  if (!m) return false;
  const sit = newSit(from, state);
  if (!sittingBuild({ st: G.st, sv: G.sv, settings: G.settings, light: lightNow(), mibiId: m.id, ui: sit }, SPECS.sitting, SPECS.habitat)) return false;
  UI.hab.id = m.id; UI.sit = sit; h.goto("sitting"); return true;
}

// ---- the props of the screen on the page ----
// { msg: the props message (without seq), ids: every picture the face needs before them, light, lit: the graded residents, owed: the ids of the requests that carry an owed habit key }
export function screenProps(plate) {
  if (UI.screen === "create" && !(UI.create && createPod(G.st, UI.create))) goScreen("pods");   // Create with no pod to shape: Pods
  if (UI.screen === "habitat" && !S.housed(G.st).length) goScreen("vivarium");   // one mibi up close always shows one mibi: with none housed the whole shows its empty state
  const screen = UI.screen, light = lightNow();   // the light is read once per sync: the props and the pictures dropped after them agree on it
  if (shownLight !== light) { if (shownLight) dropLight(shownLight); shownLight = light; }   // one light's graded residents in the manifest (fix 7): re-derived from the cached master if a light returns
  if (UI.idle) {   // Idle: the whole screen, no frame but its line (frame.json idle): the living window's people, the painting's slot and the one line
    const body = idleBuild({ st: G.st, sv: G.sv, settings: G.settings, docked: docked(), light, ...living() }, SPECS.frame);
    registerPictures(body.requests, { podById, frameOf, mibiGenome: (id) => mibiById(id)?.genome });
    const ids = new Set(body.requests.map((r) => r.id)); walk(body.props, ids);
    return { msg: { screen, ...body.props }, ids: [...ids], light, lit: litOf(body.requests), owed: owedOf(body.requests) };
  }
  const top = topFor(screen), pl = { text: plate || "", timed: true };
  if (!isBuilt(screen)) return { msg: { screen, state: "notBuilt", frame: { top, line: notBuiltLine(screen), plate: pl } }, ids: [], light };   // Level 2 (library.species) among them: not built yet, ← reads Library
  const fam = screen === "library.family" ? familyBody() : null;
  if (screen === "library.family" && !fam) return { msg: { screen, state: "notBuilt", frame: { top, line: notBuiltLine(screen), plate: pl } }, ids: [], light };   // no found species shown: as any screen not built
  if (screen === "sitting" && !UI.sit) { goScreen("habitat"); return screenProps(plate); }   // no visit to show: one mibi up close
  const sat = screen === "sitting" ? sittingBody(light) : null; if (screen === "sitting" && !sat) { UI.sit = null; goScreen("habitat"); return screenProps(plate); }
  const body = screen === "sitting" ? sat : screen === "home" ? homeBody(light) : screen === "cargo" ? cargoBody() : screen === "create" ? createBody() : screen === "incubator" ? incubatorBody() : screen === "vivarium" ? vivariumBody(light) : screen === "habitat" ? habitatBody(light) : screen === "library" ? libraryBody() : screen === "library.species" ? speciesBody() : screen === "library.family" ? fam : screen === "bench" ? benchBody() : podsBody(), reqs = [...body.requests, ...iconRequests()];
  registerPictures(reqs, { podById: (id) => (screen === "create" && id === UI.create.podId ? createPod(G.st, UI.create) : podById(id)), frameOf, mibiGenome: (id) => mibiById(id)?.genome, budGenome: () => G.st.bud?.genome, founderGenome: S.founderGenome });
  const ids = new Set(reqs.map((r) => r.id)); walk(body.props, ids); const dropped = droppedPictures();   // the pictures a newer one superseded (P4): the host drops them on the face before it sends the props' pictures
  if (screen === "habitat" && UI.hab.prev) ids.add(UI.hab.prev);   // the mibi the swap's dither starts from stays on the face until the event ends
  if (screen === "create" && UI.create.prev) ids.add(UI.create.prev);   // the founder the roll's dither starts from stays on the face until the event ends
  if (screen === "sitting") for (const id of [UI.sit.prev.glass, UI.sit.prev.resident]) if (id) ids.add(id);   // the pictures the window's dithers start from stay on the face until their events end
  if (screen === "home") return { msg: { screen, ...body.props, frame: { plate: pl } }, ids: [...ids], light, lit: litOf(reqs), owed: owedOf(reqs), dropped };   // Home's top bar and line are its own (home.json): the frame sends only the plate
  const line = { ...body.line }; if (line.need == null) line.need = need().text;   // the frame's notice on every screen unless the screen has its own
  for (const k of ["ok", "subject", "need"]) if (typeof line[k] === "string") line[k] = capLine(line[k]);   // each of the line's three is a line and takes its capital, once, here (views/words.mjs capLine)
  if (body.top?.readout) top.readout = body.top.readout;   // the top bar's readout after the title (the Library's levels)
  return { msg: { screen, ...body.props, frame: { top, line, plate: pl } }, ids: [...ids], light, lit: litOf(reqs), owed: owedOf(reqs), dropped };
}
let shownLight = null;   // the light of the props the face was last given (fix 7): the swap's from names the id of the light shown, not a fresh read
const litOf = (reqs) => reqs.filter((r) => r.kind === "mibi" && r.light).map((r) => r.id);   // the graded residents the props name
const owedOf = (reqs) => reqs.filter((r) => r.owed).map((r) => r.id);   // the scene's pictures that show an owed habit key (the request's `owed`): a golden refuses them
// The pictures a light puts on the face, by their ids (their sizes from the specs that place them): the host drops them once props with the next light are taken.
export const shownRoomNow = () => shownRoom(G.st, UI.screen === "habitat" || UI.screen === "sitting" ? UI.hab.id : UI.meet ?? null);   // the room on the face: st.face.room, or the room of the mibi met (Home) or up close (Habitat, the sitting)
export const lightIds = (light, room = shownRoomNow()) => roomPictureIds(room, light);   // the shown room's painting, near view, pieces and (Roots) bed in a light: the host drops them once props with the next light (or room) are taken
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
const PLAYS = new Set(["seal", "wipe", "ribbon", "plate", "dither", "hatch", "rest", "grow", "growNow", "incubate", "moment", "read", "mend", "switch", "install", "sendoff", "pan"]), ARRIVALS = new Set(["cargo", "crates", "crate", "show"]);
// The light of the moment, read once for both screens that show it (the Vivarium by the clock: Home's glass and bed, Idle's painting): the host's, so a view never reads a clock.
let lightNow = () => { throw new Error("the host has no light: createHost({ light }) names it"); };
let timeNow = () => { const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); };   // the Station time in seconds of the day: createHost({ time }) names it (main.mjs: the developer's Station time, else the clock)
export function createHost({ send, nowMs, light, time = null, afterSave = () => {}, motion = () => true, onDock = (h) => INTENTS.frame.dock(h) }) {
  lightNow = light; if (time) timeNow = time;
  let holdUntil = 0, skipUntil = 0, arrivalUntil = 0; const timers = [];   // skipUntil: a skippable event's hold, kept apart from the rest so ✓ can end it alone (lvgl-switch.md §2.1)
  const holding = () => nowMs() < holdUntil || nowMs() < skipUntil;
  const arriving = () => nowMs() < arrivalUntil;   // an arrival plays (Home's crates sliding in holds nothing, and the idle timer waits for its end)
  const play = (e) => {
    if (!(PLAYS.has(e.kind) || (e.kind === "arrival" && ARRIVALS.has(e.target)) || (e.kind === "tick" && ["e", "d", "s"].includes(e.target)) || (e.kind === "flash" && ["turn", "nameTag", "e", "d", "s"].includes(e.target)))) return;
    const hold = e.hold ?? 0; if (!Number.isInteger(hold) || hold < 0 || hold > 30000) throw new Error(`play ${e.kind}: hold is a whole number of ms (0 = none), not ${hold}`);
    if (e.skip !== undefined && typeof e.skip !== "boolean") throw new Error(`play ${e.kind}: skip is true or false, not ${e.skip}`);
    if (hold && e.skip) { skipUntil = Math.max(skipUntil, nowMs() + hold); UI.skip = { kind: e.kind, target: e.target }; } else if (hold) holdUntil = Math.max(holdUntil, nowMs() + hold);
    if (e.kind === "arrival") arrivalUntil = Math.max(arrivalUntil, nowMs() + (e.ms || 0));
    send({ t: "event", ...e, hold });
  };
  const at = (ms, fn, skip = false) => { timers.push({ t: nowMs() + ms, fn, skip }); };   // skip: the step belongs to the skippable event just played, and ✓ Skip runs it at once
  // ✓ Skip (the face's `skip` intent, a skippable hold running): the hold ends now and the event's own steps run in their order on this frame, as with hold 0; any other hold, and a kept room or Dock key, stand.
  const skip = () => {
    if (!(nowMs() < skipUntil)) return false;
    skipUntil = 0; UI.skip = null;
    const mine = timers.filter((x) => x.skip).sort((a, b) => a.t - b.t); for (const x of mine) timers.splice(timers.indexOf(x), 1);
    for (const x of mine) x.fn();
    return true;
  };
  const h = {
    get st() { return G.st; }, get sv() { return G.sv; }, get settings() { return G.settings; }, ui: UI, specs: SPECS,
    now: () => Date.now(), motion, say: msg, play, at, skip, save: () => { save(); afterSave(); }, holding, arriving, light: () => shownLight ?? lightNow(), enterSitting: (m, o) => enterSitting(h, m, o),
    // The frame loop's call: what was scheduled and is due runs, in order; then the room key kept through a hold is dispatched once the hold is over.
    frame: () => {
      const t = nowMs(); timers.sort((a, b) => a.t - b.t);
      while (timers.length && timers[0].t <= t) timers.shift().fn();
      if (UI.skip && !(t < skipUntil)) UI.skip = null;   // the skippable hold ran out: the line's ✓ Skip goes
      incubatorTick(h);
      if (!holding() && h.pendingDock) { h.pendingDock = false; onDock(h); }   // a Dock key pressed in a hold is kept (two presses cancel) and acts when the hold ends, before a kept room key: the Dock is a world event (cargo.json keys.dock, frame.json idle.keys.dock)
      if (!holding() && h.pendingRoom && cuttingHatch(h)) { h.pendingRoom = null; landHatch(h); }   // a room key kept through the hatch's hold is a cutting key: it lands the meet and is used up (UI/UX "Hatch cutting key")
      if (!holding() && h.pendingRoom) { const k = h.pendingRoom; h.pendingRoom = null; dispatch(h, { screen: UI.screen, target: "room", verb: "room:" + k }); }
    },
    goto: (name, hold = 0, o = {}) => { const fresh = UI.screen !== name; goScreen(name); if (fresh) { if (!o.cut) play({ kind: "dither", target: "stage", ms: 180, hold }); if (name === "habitat") enterHabitat(h, o); } },   // hold: whole ms of held input (the Vivarium's look holds 180); o.cut: drawn as a cut, no dither (the hatch's cutting key), o.meetHold: the meet's moment holds input that long
  };
  onScreenChange(() => { if (UI.pendingArrival) h.at(0, () => arrivePending(h)); });   // a dock mid-decision plays after the player's next screen change (intents/arrival.mjs)
  return h;
}

// The ring moved on one mibi up close: the host keeps it, the first move ends the meet, and a tile shows its mibi in the window (events.swap: the resident cross-dithers to it, a cut when either is out with the Companion).
function habitatFocus(h, target) {
  const a = UI.hab; a.f = target; endMeet(h);
  if (!target.startsWith("tile.")) return;
  const id = +target.slice(5), was = S.mibiById(G.st, a.id), now = S.mibiById(G.st, id); if (!now || id === a.id) return;
  const px = (mb) => (mb && !S.isAway(G.st, G.sv, mb) ? mibiPictureOf(G.st, mb, SPECS.habitat.regions.resident.rect.slice(2), G.settings, shownLight ?? "day", "habitat").id : "");
  const from = px(was); a.id = id;
  if (from && px(now)) { const e = SPECS.habitat.events.swap; a.prev = from; h.play({ kind: e.kind, target: e.target, from, ms: e.ms, hold: h.motion() ? e.hold : 0 }); h.at(e.ms, () => { if (a.prev === from) a.prev = null; }); }
}

// What the face said, as the rules: the ring moved (Pods keeps the focus of its state), or a key on a focused target (an intent). A not-built screen has no targets; its ← goes to the parent in the navigation tree.
// While a hold runs every intent is dropped but a room key, which is kept (the last one) and dispatched when the hold ends, after a kept Dock key; Home's rest drops it too (home.json events.rest.keys).
export function onFaceMessage(h, m) {
  if (m.t === "done") { if (m.kind === "hatch" && cuttingHatch(h) && !h.holding()) landHatch(h); return; }   // informative only, but for the hatch with a moving set: a key the face acted on after the hold ended it (its cut), and that key lands the meet
  if (m.t === "intent" && m.verb === "skip") { h.skip(); return; }   // ✓ in a skippable hold (lvgl-switch.md §2.1): before every other rule, so it is never a cutting key; a late one, after the hold, does nothing
  if (m.screen === "incubator" && UI.screen !== "incubator") return;   // a key the cut already spent (the meet has landed): the Incubator's intent after the screen left is dropped
  if (m.screen === "incubator" && cuttingHatch(h) && !h.holding() && m.t === "intent") { landHatch(h); return; }   // the cutting key lands the meet and does nothing else
  if (m.t === "focus") {
    if (m.screen === "panel") { if (UI.panel) UI.panel.focus = m.target; return; }   // a panel message after it closed is dropped
    if (m.screen === "namer") { if (UI.screen === "habitat" && UI.hab.namer) UI.hab.namer.f = m.target; return; }   // a namer message after it closed is dropped
    if (m.screen === "habitat") { if (UI.screen === "habitat" && !UI.hab.namer) habitatFocus(h, m.target); return; }   // and habitat's while the namer is open
    if (m.screen === "bench") { if (UI.screen === "bench") INTENTS.bench.focus(h, m.target); return; }
    if (m.screen === "library") { if (UI.screen === "library") INTENTS.library.focus(h, m.target); return; }
    if (m.screen === "sitting") { if (UI.screen === "sitting") INTENTS.sitting.focus(h, m.target); return; }
    if (m.screen === "library.species") { if (UI.screen === "library.species") INTENTS.library.species.focus(h, m.target); return; }
    if (m.screen === "library.family") { if (UI.screen === "library.family") INTENTS.library.family.focus(h, m.target); return; }
    if (m.screen === "pods" && UI.screen === "pods") UI.pods.focus.set(m.target); else if (m.screen === "home" && UI.screen === "home") UI.home.f = m.target; else if (m.screen === "vivarium" && UI.screen === "vivarium") UI.viv.f = m.target; return;
  }
  if (m.t !== "intent") return;
  if (m.screen === "panel" && !UI.panel) return;   // a panel intent after it closed is dropped
  if (UI.panel && m.screen !== "panel" && !m.verb?.startsWith("room:")) return;   // the screen beneath takes no key while a panel is open
  if (m.screen === "namer" && !(UI.screen === "habitat" && UI.hab.namer)) return;   // a namer intent after it closed is dropped
  if (m.screen === "habitat" && UI.hab.namer && !m.verb?.startsWith("room:")) return;   // the screen beneath takes no key while the namer is open
  if (m.screen === "habitat" && m.verb?.startsWith("room:") && !h.holding()) endMeet(h);   // the first press ends the meet, a room key too
  if (m.verb === "back" && m.screen !== "namer" && m.screen !== "panel" && !isBuilt(m.screen) && !UI.idle && !h.holding()) { const up = parentScreen(m.screen); if (up) { if (up.screen === "pods" && up.state) { UI.pods.view = up.state; UI.pods.focusView = null; } h.goto(up.screen); } return; }
  if (m.screen === "cargo" && UI.screen === "cargo" && UI.cargo.state === "opening" && (m.verb === "confirm" || m.verb === "back" || m.verb?.startsWith("room:"))) { INTENTS.cargo.held(h, m.verb, INTENTS.frame.roomKey); return; }   // while the opening holds the face also says ✓, ← and a room key (build spec 8.4): Skip, Home, or a room, each ending the current crate as a cut
  if (m.verb?.startsWith("room:") && UI.cargo.state === "arrival") h.skip();   // a room key on the arrival is Later, and then it acts: the show's hold ends now (the key itself closes the arrival: intents/frame.mjs roomKey)
  if (h.holding()) { if (m.verb?.startsWith("room:") && !UI.resting) h.pendingRoom = m.verb.slice(5); return; }
  if (m.verb === "wake") { dispatch(h, m); const w = SPECS.frame.idle.wake, cut = !(h.motion ? h.motion() : true); h.play({ kind: "dither", target: "stage", ms: w.transition.ms, hold: cut ? 0 : w.hold }); return; }
  dispatch(h, m);
}
export { INTENTS };
