// The live game: the save as loaded (SV, the Companion's part, read only) and the Station's part (ST),
// the developer settings, the focus state per screen (UI, never saved) and the presentation events
// the renderer reads (FX). Screens import this; the rules live in state.mjs.
import * as S from "./state.mjs";
import { clock } from "./gfx.mjs";

export const G = { sv: null, st: null, settings: { ...S.DEFAULT_SETTINGS }, ready: false, resetting: false };
export const FX = { msg: "", msgAt: -1e9, lockUntil: 0, arr: null, id: null, read: null, mend: null, moment: null, crateIn: -1e9, wake: 0, transAt: -1e9, restAt: 0, stamp: null, hatch: null, meetId: null };
export const UI = { screen: "home", prev: [], home: { f: "room" }, pods: { f: "pod", cur: null, anchor: null, ci: 0, cmp: null, wildArm: 0 },
  create: null, inc: {}, lib: { sp: null, f: "spread", li: 0 }, hab: { id: null, f: "stage", bondArm: 0, wildArm: 0, from: null }, bench: { f: 0, arm: 0 },
  report: null, meet: null, lastInput: 0, idle: false };
export const IDLE_MS = 60000, READ_MS = 2000, ID_MS = 1800, ARRIVE_MS = 3000;

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
const changed = () => { for (const fn of listeners) fn(); };
export function msg(t) { FX.msg = t; FX.msgAt = clock.now; }
export function lockInput(ms) { FX.lockUntil = Math.max(FX.lockUntil, clock.now + ms); }
export const now = () => clock.now;
export const st = () => G.st;
export const sv = () => G.sv;

// --- the shared save ---
export function readStored() {
  try {
    const raw = localStorage.getItem(S.SAVE_KEY);
    if (raw) { const o = JSON.parse(raw); if (o && o.v === S.SAVE_V) return o; }
  } catch { /* unreadable: a fresh Station */ }
  return null;
}
function adopt(sv) {
  if (!sv.st || sv.st.wid !== sv.wid) sv.st = S.freshSt(sv.wid, sv.turn || 0);   // a new world on the Companion: a fresh Station
  const migrated = sv.st.schema !== S.ST_SCHEMA;
  sv.st = S.normalize(S.migrate(sv.st));
  G.sv = sv; G.st = sv.st;
  if (migrated) save();
}
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
    G.sv.st = G.st; S.normalize(G.st); G.st.at = Date.now();
    localStorage.setItem(S.SAVE_KEY, JSON.stringify(G.sv));
  } catch { /* storage unavailable: keep playing in memory */ }
  changed();
}
// The other page wrote the save: take its part, keep ours. A new world or a reset starts a fresh Station.
export function storageChanged() {
  const cur = readStored();
  if (!cur) { G.sv = { v: S.SAVE_V, wid: null, st: S.freshSt(null, 0) }; G.st = G.sv.st; goScreen("home"); changed(); return; }
  if (cur.wid !== G.st.wid) { adopt(cur); goScreen("home"); save(); return; }
  const mine = G.st; G.sv = cur; G.sv.st = mine; changed();
}
export function resetSave() {
  G.resetting = true;
  try { for (const k of [S.SAVE_KEY].concat(S.OLD_SAVE_KEYS)) localStorage.removeItem(k); } catch { /* nothing to erase */ }
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
export const registerScreen = (name, screen) => { SCREENS[name] = screen; };
export const screenOf = (name) => SCREENS[name];
export function goScreen(name) {
  const fresh = UI.screen !== name; if (fresh) FX.transAt = clock.now;
  UI.screen = name;
  if (fresh) for (const fn of screenListeners) { try { fn(name); } catch { /* a listener never breaks a press */ } } UI.pods.wildArm = 0; UI.hab.bondArm = 0; UI.hab.wildArm = 0; UI.bench.arm = 0; UI.pods.cmp = null; if (name !== "habitat") FX.meetId = null;
  if (SCREENS[name]?.enter) SCREENS[name].enter();
  if (name === "habitat" && UI.meet != null && UI.hab.id === UI.meet) UI.meet = null;
}
export const need = () => S.need(G.st, G.sv, G.settings, UI);
export const lineFor = () => (UI.idle ? {} : SCREENS[UI.screen].line());
// Convenience views over the state for the screens.
export const docked = () => S.docked(G.st);
export const hasWorld = () => S.hasWorld(G.sv) || !!G.st.devWorld;
export const bayCrates = () => S.bayCrates(G.st, G.sv);
export const effWithId = () => S.effWithId(G.st, G.sv);
export const atHome = () => S.atHome(G.st, G.sv);
export const mibiById = (id) => S.mibiById(G.st, id);
export const podById = (id) => S.podById(G.st, id);
export const arriving = () => !!(FX.arr && clock.now - FX.arr.at < FX.arr.plays.length * ARRIVE_MS);
