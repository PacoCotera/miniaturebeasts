// The host's side of the face (lvgl-switch.md §2.1, §2.7): what the page sends the face and what it does with what the face says, with no DOM, no canvas and no clock of its own.
//   props    the screen's props for the face: frame props for every screen (the top bar, the bottom line, the message plate), Pods props for Pods, and for every other screen
//            state "notBuilt" (the face draws frame.json notBuilt); Idle is `idle: true` and nothing else
//   events   the presenter's ticks and flashes, the plate, the screen change's dither
//   faces    the intents and the focus the face sends, turned into the rules (intents/*) and the screens' state (UI)
// The rules are state.mjs's, the screens' state is game.mjs's UI, and the key's rule call is intents/*: nothing here decides a rule or a layout.
import { G, FX, UI, SPECS, LAYER, msg, goScreen, save, need, docked, hasWorld, podById, mibiById } from "./game.mjs";
import * as S from "./state.mjs";
import { frameOf } from "./genome.mjs";
import { podsProps } from "./views/pods-props.mjs";
import { registerPictures, iconRequests } from "./pictures.mjs";
import { dispatch, INTENTS } from "./intents/index.mjs";
import { SCREEN_PLACE, backWord, parentOf } from "./nav.mjs";
import { assetEntry, asset as assetOf } from "../../ui/assets.mjs";
import { pinnedPictures } from "../../ui/specs/derive.mjs";

// The screens the face draws with words. Every other screen is drawn by the face's notBuilt composition.
export const BUILT = ["pods"];
export const isBuilt = (screen) => BUILT.includes(screen);

// ---- the pictures ----
// A picture's pixels for the face: RGBA, straight alpha, with its slice and tile when it is a nine-slice, and its status. `env` reaches the builders (palette lookup).
let ENV = null;
export const setEnv = (env) => { ENV = env; };
export function picture(id) {
  const a = assetOf(id, ENV); if (!a) return null;
  const e = assetEntry(id), p = { w: a.w, h: a.h, status: e?.status === "master" ? "master" : "placeholder", data: a.rgba() };
  return e?.slice ? { ...p, slice: e.slice, tile: e.tile ?? 0 } : p;
}
// The ids the frame names in its own spec (the room marks, the lamps, the caps, the sun): the same on every screen.
const walk = (o, into) => { if (typeof o === "string") { if (assetEntry(o)) into.add(o); } else if (o && typeof o === "object") for (const v of Object.values(o)) walk(v, into); };
// The Companion's face mark, docked or away, as the frame resolves it (the species' name in lower case).
const withMibiKey = () => { const id = hasWorld() ? S.withId(G.sv) : null, m = id == null ? null : mibiById(id); return m ? S.spName(m).toLowerCase() : null; };
function companionIds() {
  const fm = SPECS.frame.regions?.marks?.face || {}, key = withMibiKey(), out = [];
  for (const t of [fm.docked, fm.away, fm.empty]) if (typeof t === "string") out.push(key ? t.replace("{mibi}", key) : t);
  return out;
}

// ---- the frame ----
// The top bar's facts: the room's key and one word, the counters as the rules hold them (the face counts them up on `tick` events), the Companion and whether a mibi is with it.
export function topFor(screen) {
  return { screen, title: SPECS.frame.strings.titles[screen], turn: G.st.turn + 1, turnFlash: false, materials: { e: G.st.e, d: G.st.d, s: G.st.s }, flash: {}, companion: { docked: docked(), withMibi: withMibiKey() } };
}
// A screen the face has no words for: no action, no subject, the way back from navigation and the default notice.
export function notBuiltLine(screen) {
  const nav = SPECS.frame.navigation, place = SCREEN_PLACE[screen] || screen, pod = podById(UI.create?.podId ?? UI.pods.cur), back = backWord(nav, place, pod ? S.cap(S.spName(pod)) : "");   // a way back that names the pod ("{pod}") names the pod Create was opened on; the face reads "Back" when the name does not fit
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
  if (p.focusView !== key) { p.focusView = key; if (!F.cur || !F.cur.startsWith(key === "collection" ? "place." : key === "chapter" ? "rail." : "")) F.cur = null; }
  const model = () => ({ st: G.st, settings: G.settings, docked: docked(), crates: S.bayCrates(G.st, G.sv).length, ui: p, focus: F.cur, present: {} });
  let body = podsProps(model(), SPECS.pods, SPECS.frame);
  if (p.cmp) F.cur = null; else if (!body.props.focus.targets.some((t) => t.id === F.cur)) { F.cur = null; F.ensure(body.props.focus.targets, initialFocus(key)); body = podsProps(model(), SPECS.pods, SPECS.frame); }
  if (F.cur && F.cur.startsWith("rail.")) p.ci = +F.cur.slice(5);
  if (F.cur && F.cur.startsWith("place.")) { const q = G.st.tray[+F.cur.slice(6)]; if (q) p.cur = q.id; }
  return body;
}

// ---- the props of the screen on the page ----
// { msg: the props message (without seq), ids: every picture the face needs before them, requests: the Pods pictures to register }
export function screenProps(plate) {
  const screen = UI.screen;
  if (UI.idle) return { msg: { screen, idle: true }, ids: [] };
  const top = topFor(screen), pl = { text: plate || "", timed: true };
  if (!isBuilt(screen)) return { msg: { screen, state: "notBuilt", frame: { top, line: notBuiltLine(screen), plate: pl } }, ids: [] };
  const body = podsBody(), reqs = [...body.requests, ...iconRequests()];
  registerPictures(reqs, { podById, frameOf });
  const ids = new Set(reqs.map((r) => r.id)); walk(body.props, ids);
  const line = { ...body.line }; if (line.need == null) line.need = need().text;   // the frame's notice on every screen unless the screen has its own
  return { msg: { screen, ...body.props, frame: { top, line, plate: pl } }, ids: [...ids] };
}
// The pictures of the frame and the Companion's face, the same on every screen.
export function frameIds() {
  const ids = new Set(); walk(SPECS.frame.regions, ids); for (const id of companionIds()) if (assetEntry(id)) ids.add(id);
  for (const id of ["energy", "data", "essence", "cross"]) if (assetEntry(`icon:${id}:16`)) ids.add(`icon:${id}:16`);
  return [...ids];
}
export const pinned = () => pinnedPictures(SPECS.pods, SPECS.frame);

// ---- the host the intents call ----
// h = { st, sv, settings, ui, specs, now, say, goto, play, lock, save }. Effects reach the face as events; a held arrival, a rest and the Dock's tick are Home's, and Home is not built:
// no arrival plays and nothing is held.
const PLAYS = new Set(["seal", "wipe", "ribbon", "plate", "dither", "hatch"]);
export function createHost({ send, nowMs, afterSave = () => {} }) {
  const holds = new Map();   // the events sent with hold: true that have not said done (an event the face drops, or whose done was lost, expires with its time)
  const holding = () => { const t = nowMs(); for (const [k, until] of holds) if (until < t) holds.delete(k); return holds.size > 0; };
  const play = (e) => {
    if (!(PLAYS.has(e.kind) || (e.kind === "tick" && ["e", "d", "s"].includes(e.target)) || (e.kind === "flash" && e.target === "turn"))) return;
    if (e.hold) holds.set(e.kind + ":" + e.target, nowMs() + (e.ms || 0) + 500);
    send({ t: "event", ...e });
  };
  const h = {
    get st() { return G.st; }, get sv() { return G.sv; }, get settings() { return G.settings; }, ui: UI, specs: SPECS,
    now: () => Date.now(), say: msg, play, lock: () => {}, save: () => { save(); afterSave(); }, holding,
    // Any key but ✓ disarms: the hatch, the bond and the gate wait for a second ✓ and nothing else.
    disarm: () => { UI.pods.wildArm = 0; UI.hab.bondArm = 0; UI.hab.wildArm = 0; UI.bench.arm = 0; }, release: (kind, target) => holds.delete(kind + ":" + target),
    goto: (name) => { const fresh = UI.screen !== name; goScreen(name); if (fresh) play({ kind: "dither", target: "stage", ms: 180 }); },
  };
  return h;
}

// What the face said, as the rules: the ring moved (Pods keeps the focus of its state), or a key on a focused target (an intent). A not-built screen has no targets; its ← goes to the parent in the navigation tree.
export function onFaceMessage(h, m) {
  if (m.t === "done") {
    h.release(m.kind, m.target);
    if (m.kind === "hatch") { UI.hab.id = +m.target; UI.hab.f = "door"; h.goto("habitat"); }   // the hatch is over: meet the mibi, the ring on the door
    return;
  }
  if (m.t === "focus") { if (m.screen === "pods" && UI.screen === "pods") UI.pods.focus.set(m.target); return; }
  if (m.t !== "intent") return;
  if (m.verb === "back" && !isBuilt(m.screen) && !UI.idle) { const up = parentScreen(m.screen); if (up) { if (up.screen === "pods" && up.state) { UI.pods.view = up.state; UI.pods.focusView = null; } h.goto(up.screen); } return; }
  if (m.verb === "wake") { dispatch(h, m); h.play({ kind: "dither", target: "stage", ms: 180, hold: true }); return; }
  dispatch(h, m);
}
export { INTENTS };
