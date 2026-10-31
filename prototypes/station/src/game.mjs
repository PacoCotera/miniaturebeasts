// The live game: the save as loaded (SV, the Companion's part, read only) and the Station's part (ST),
// the developer settings, the focus state per screen (UI, never saved) and the presentation events
// the renderer reads (FX). Screens import this; the rules live in state.mjs.
import * as S from "./state.mjs";
import * as T from "./sitting.mjs";
import * as Lib from "./library.mjs";
import { clock } from "./pixels.mjs";
import { createTimeline } from "../../ui/timeline.mjs";
import { createFramePresenter } from "./present.mjs";
import { createFocus } from "../../ui/focus.mjs";
import * as C from "./companions.mjs";

export const G = { sv: null, st: null, settings: { ...S.DEFAULT_SETTINGS }, ready: false, resetting: false };
export const FX = { msg: "", msgAt: -1e9, arr: null, id: null, read: null, mend: null, moment: null, crateIn: -1e9, wake: 0, transAt: -1e9, restAt: 0, stamp: null, hatch: null, meetId: null };
export const UI = { screen: "home", prev: [], home: { f: "room" }, pods: { view: null, cur: null, ci: 0, cmp: null, sort: "use", chips: [], word: null, first: 0, recent: [], focus: createFocus({}, null), get f() { return this.focus.cur; }, set f(id) { this.focus.set(id); } },
  create: null, panel: null, arrival: null, cross: null, inc: {}, lib: { l1: null, pending: null, l2: {}, species: null, state: "sheet", lit: null, cur: null, l3: {}, l3last: null }, sit: null, hab: { id: null, f: "resident", namer: null, prev: null, prevRoom: null }, viv: { f: null, prev: null }, bench: { f: null, install: false },
  cargo: { state: "bay", crate: 0, at: 0, run: null, shown: null, arrival: null }, pendingArrival: null, arrived: [], meet: null, lastInput: 0, idle: false };
// The timeline: presentation events on its own clock and the input holds of the screens on the layer.
export const TL = createTimeline();
// What the screen layer needs from the page's boot: the spec files, the components' context and the frame's presenter.
export const SPECS = {}, LAYER = { ctx: null, presenter: createFramePresenter() };
export const IDLE_MS = 60000, READ_MS = 2000, ID_MS = 2000;

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const changed = () => { for (const fn of listeners) fn(); };
export function msg(t, ms = 4000) { FX.msg = t; FX.msgAt = clock.now; FX.msgMs = ms; TL.play({ kind: "plate", target: "msg", ms }); }   // the screens on the layer read the plate's time from the timeline
export const now = () => clock.now;
export const st = () => G.st;
export const sv = () => G.sv;

// --- the shared save, keyed by the Companion (companions.mjs): the Station shows the save of the last Companion docked ---
let KEY = null, KEY_STORE = null;
const store = () => globalThis.localStorage;
// The active Companion's save key; the first call makes the Station's map (and moves the shared save of earlier builds under Companion A's id).
export function saveKey() { if (KEY == null || KEY_STORE !== store()) { KEY_STORE = store(); try { KEY = C.activeSaveKey(store(), { rand: cryptoRand }); } catch { KEY = C.LEGACY_KEY; } } return KEY; }
const cryptoRand = () => { try { const b = new Uint32Array(1); globalThis.crypto.getRandomValues(b); return b[0] / 4294967296; } catch { return 0.5; } };   // never Math.random: a seeded session keeps its own dice
export const activeCompanion = () => { try { const m = C.stationMap(store(), { rand: cryptoRand }); return m.known.find((k) => k.id === m.active) ?? null; } catch { return null; } };
// A Companion docked: if it is not the one the Station shows, its save becomes the Station's (made fresh for a new Companion's world); returns whether it switched.
export function switchCompanion(who) {
  if (!who || !who.id) return false;
  let r; try { r = C.companionDocked(store(), who); } catch { return false; }
  if (!r.switched) return false;
  KEY = null; load(); UI.lib.pending = null; goScreen("home"); save(); return true;
}
export function readStored() {
  try {
    const raw = localStorage.getItem(saveKey());
    if (raw) { const o = JSON.parse(raw); if (o && o.v === S.SAVE_V) return o; }
  } catch { /* unreadable: a fresh Station */ }
  return null;
}
function adopt(sv) {
  if (!sv.st || sv.st.wid !== sv.wid) sv.st = S.freshSt(sv.wid, sv.turn || 0);   // a new world on the Companion: a fresh Station
  const migrated = sv.st.schema !== S.ST_SCHEMA;
  sv.st = S.normalize(S.migrate(sv.st, Date.now(), sv));
  G.sv = sv; G.st = sv.st;
  const mh = S.docked(G.st) ? T.mergeHome(G.st, G.sv) : null, home = mh ? mh.home : [];   // docked: the care the Companion earned since, and the welcome
  if (mh) noteArrived(mh.back);
  if (migrated || home.length) save();
}
// R4b: the travellers that came home (state.noteCarried) walk in from their room's rest edge: the views mark them (props `enter`) for the face, which honours it only while a walk is running.
export function noteArrived(back = []) { UI.arrived = [...new Set([...(UI.arrived ?? []), ...back.map(String)])]; }
export function load() {
  const o = readStored();
  if (!o) { G.sv = { v: S.SAVE_V, wid: null, st: S.freshSt(null, 0) }; G.st = G.sv.st; return; }
  adopt(o);
}
// Re-read before writing and keep the Companion's part as stored; only `st` is ours.
export function save() {
  if (G.resetting) return;
  try {
    const cur = readStored();
    if (cur && cur.wid === G.st.wid) G.sv = cur;
    else if (cur && cur.wid !== G.st.wid) { G.sv = cur; G.st = S.freshSt(cur.wid, cur.turn || 0); }
    G.sv.st = G.st; S.normalize(G.st); S.trimCarryReqs(G.st, G.sv); G.st.at = Date.now();
    localStorage.setItem(saveKey(), JSON.stringify(G.sv));
  } catch { /* storage unavailable: keep playing in memory */ }
  changed();
}
// The other page wrote the save: take its part, keep ours. A new world or a reset starts a fresh Station.
export function storageChanged() {
  const cur = readStored();
  if (!cur) { G.sv = { v: S.SAVE_V, wid: null, st: S.freshSt(null, 0) }; G.st = G.sv.st; UI.lib.pending = null; goScreen("home"); changed(); return; }   // a new world drops the Library's visit note unrecorded
  if (cur.wid !== G.st.wid) { adopt(cur); UI.lib.pending = null; goScreen("home"); save(); return; }
  const mine = G.st; G.sv = cur; G.sv.st = mine;
  const mh = S.docked(mine) ? T.mergeHome(mine, cur) : null; if (mh) noteArrived(mh.back);
  if (mh && mh.home.length) { save(); return; }   // docked: the care and the welcome; save() calls changed()
  changed();
}
export function resetSave() {
  G.resetting = true;
  try { for (const k of [saveKey(), S.SAVE_KEY].concat(S.OLD_SAVE_KEYS)) localStorage.removeItem(k); } catch { /* nothing to erase */ }
}
// --- developer settings, under their own key ---
export function loadSettings() {
  try { const o = JSON.parse(localStorage.getItem(S.DEV_KEY) || "null"); if (o && typeof o === "object") Object.assign(G.settings, o); } catch { /* defaults */ }
  return G.settings;
}
export function saveSettings(patch) { Object.assign(G.settings, patch || {}); try { localStorage.setItem(S.DEV_KEY, JSON.stringify(G.settings)); } catch { /* in memory */ } changed(); }

// --- screens ---
const SCREENS = {};
const screenListeners = new Set();
export const onScreenChange = (fn) => screenListeners.add(fn);
// A screen is a binding table on the face, never a drawing: registering one with a draw, nodes or faceNodes throws (the import guard checks the same, lvgl-switch.md §5.1).
export const registerScreen = (name, screen) => { for (const k of ["draw", "nodes", "faceNodes"]) if (screen && k in screen) throw new Error(`registerScreen(${name}): ${k} is the removed JavaScript drawing layer; the face draws the screen`); SCREENS[name] = screen; };
export const screenOf = (name) => SCREENS[name];
// The Library is the screen `library` and its levels `library.*`: entering it from outside takes the visit note, leaving it records the note as seen (library.json seen).
export const inLibrary = (name) => name === "library" || (typeof name === "string" && name.startsWith("library."));
export function goScreen(name) {
  const fresh = UI.screen !== name, was = UI.screen; if (fresh) FX.transAt = clock.now;
  UI.screen = name;
  if (fresh && inLibrary(name) && !inLibrary(was)) UI.lib.pending = {};   // entering the Library notes nothing: only a species whose sheet is shown is seen
  if (fresh && name === "library.species" && UI.lib.species) UI.lib.pending = { ...(UI.lib.pending ?? {}), ...Lib.seenNote(G.st, G.settings, UI.lib.species) };   // entering Level 2 of a species (from Level 1, from Level 3 by ←, by "Open the guide"): its looks as of this entry, noted, unsaved; a later entry replaces them
  if (fresh && !inLibrary(name) && inLibrary(was) && UI.lib.pending) { S.libRecord(G.st, UI.lib.pending); UI.lib.pending = null; save(); }   // leaving: the note is seen
  if (fresh) for (const fn of screenListeners) { try { fn(name); } catch { /* a listener never breaks a press */ } } UI.pods.cmp = null; if (name !== "habitat") FX.meetId = null; if (name !== "cross") UI.cross = null;
  if (SCREENS[name]?.enter) SCREENS[name].enter();
  if (name === "habitat" && UI.hab.id != null) S.seeRoom(G.st, S.mibiById(G.st, UI.hab.id));   // one mibi up close: the room the whole last showed is its room
  if (fresh && name === "vivarium") UI.viv.f = null;   // the way in reads only st.face.room; the ring on the mibi last seen up close if it is in that room, else the room's first resident, else its chip (vivarium.json focus.entry)
  if (fresh) UI.viv.prev = null;   // a swap's old room leaves with the screen
  if (fresh) { UI.panel = null; UI.arrival = null; }   // a panel closes with its screen, nothing spent; the arrival's ← lasts only on the screen it landed on
  if (fresh && name !== "habitat") { UI.hab.namer = null; UI.hab.prev = null; UI.hab.prevRoom = null; }   // the namer closes with the level (writing nothing)
  if (fresh && name !== "sitting") UI.sit = null;   // leaving the sitting drops every choice, nothing spent (sitting.json notes.visit)
}
export const need = () => S.need(G.st, G.sv, G.settings, UI, T.readyCrates(G.st, G.settings, Date.now()).length);
export const lineFor = () => (UI.idle ? {} : SCREENS[UI.screen].line());
// Convenience views over the state for the screens.
export const docked = () => S.docked(G.st);
export const hasWorld = () => S.hasWorld(G.sv) || !!G.st.devWorld;
export const bayCrates = () => S.bayCrates(G.st, G.sv);
export const carriedIds = () => S.carriedIds(G.st, G.sv);
export const projectCarried = () => S.projectCarried(G.st, G.sv);
export const homeMibis = () => S.homeMibis(G.st, G.sv);
export const mibiById = (id) => S.mibiById(G.st, id);
export const podById = (id) => S.podById(G.st, id);

// --- the Station time (Station M1 §2.6): the developer's "Station time" (hh:mm, or a scene's running clock) or the clock, in seconds of the day; it drives both the light and the rest ---
export const stationClock = { scene: null };   // a scene's clock: { from: seconds of the day, at: page ms, rate: Station seconds per page second }
export function stationSeconds() {
  const sc = stationClock.scene; if (sc) return Math.floor(sc.from + (performance.now() - sc.at) / 1000 * sc.rate) % 86400;
  const t = G.settings.stationTime; if (t && /^\d{2}:\d{2}$/.test(t)) { const [hh, mm] = t.split(":").map(Number); return hh * 3600 + mm * 60; }
  const d = new Date(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}
// The Station's date, for Home's top bar: the developer's "Station date" (yyyy-mm-dd) or the device's calendar day.
export function stationDate() {
  const t = G.settings.stationDate; if (t && /^\d{4}-\d{2}-\d{2}$/.test(t)) { const [y, m, d] = t.split("-").map(Number); return { y, m: m - 1, d }; }
  const n = new Date(); return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
}
