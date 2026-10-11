// The moving sets in the face tests (Station M1 §3): the `moving` spec as the host merges it (ui/specs/station/moving/<SXX>.json, one spec), and synthesized atlases at the slot sizes: one row, a 1 px clear column, then the cells,
// each a flat block of its own colour so a test can tell the cell shown by its pixels; the shadow's two cells likewise. No art: the face's tests never read a master.
//   import { MOVING, sendMoving, atlasPicture, ids } from "./moving-scene.mjs";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station/moving");
export const MOVING = Object.fromEntries(readdirSync(dir).filter((f) => /^S\d{2}\.json$/.test(f)).sort().map((f) => [f.slice(0, 3), JSON.parse(readFileSync(path.join(dir, f), "utf8"))]));
export const sendMoving = (f, json = MOVING) => f.send({ t: "spec", screen: "moving", json });
const stageOf = (set, stage) => (stage === "elder" ? set.adult : set[stage]);
// the atlas ids of a resident, as the host names them (layer-bake §7: the look suffix, `species` until layers exist; the shadow species-level); an elder takes the adult's cells
export const ids = (sid, stage) => { const st = stage === "elder" ? "adult" : stage, s = stageOf(MOVING[sid], st), [w, h] = s.walk.size, [cw, ch] = s.close.size, [nw, nh] = s.nap.size;
  return { walk: `moving:${st}:${sid}:walk:${w}x${h}:species`, shadow: `moving:${st}:${sid}:shadow:${s.shadow.walk[0]}x${s.shadow.walk[1]}`, close: `moving:${st}:${sid}:close:${cw}x${ch}:species`, closeShadow: `moving:${st}:${sid}:shadow:${s.shadow.close[0]}x${s.shadow.close[1]}`, nap: `moving:${st}:${sid}:nap:${nw}x${nh}:species` }; };
const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
// cells: n blocks of w × h after a clear column; `size` overrides the cell (the 160 × 154 synthesized S09 case); `cellsOverride` the count
export function atlasPicture(id, { size = null, cellsOverride = null, sets = MOVING } = {}) {
  const m = /^moving:(juvenile|adult):(S\d{2}):(walk|close|nap|shadow):(\d+)x(\d+)/.exec(id); if (!m) return null;
  const [, stage, sid, part, W, H] = m, set = sets[sid], s = set && stageOf(set, stage);
  const n = cellsOverride ?? (part === "shadow" ? 2 : part === "walk" ? s.walk.cells.length + (s.walk.mirror?.length ?? 0) : s[part].cells.length);
  const [w, h] = size ?? [+W, +H], aw = 1 + n * w, d = new Uint8ClampedArray(aw * h * 4);
  for (let c = 0; c < n; c++) { const k = hash(id + ":" + c); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * aw + 1 + c * w + x) * 4; d[i] = 40 + (k & 127); d[i + 1] = 40 + ((k >> 7) & 127); d[i + 2] = 40 + ((k >> 14) & 127); d[i + 3] = part === "shadow" ? (c ? 140 : 190) : 255; } }
  return { w: aw, h, data: d };
}

// ---- a household with moving sets, through the real views (vivarium, home, idle): S01 adults, S01 juveniles, S05 juveniles at home, and sleepers on the bed (carried) taken from a second world ----
import { setFrames } from "../../station/src/genome.mjs";
import * as S from "../../station/src/state.mjs";
import { setMoving } from "../../station/src/moving.mjs";
import { withPolicy } from "./node-scene.mjs";
const framesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../workbench/frames");
setFrames(readdirSync(framesDir).filter((f) => f.startsWith("species-")).map((f) => JSON.parse(readFileSync(path.join(framesDir, f), "utf8"))));
setMoving(MOVING);
export const T0 = 1_000_000;
export const VIV_RULES = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../ui/specs/station/vivarium.json"), "utf8")).rules;
// o: { adults, juveniles, s05, sleepers, time (seconds of the day), docked, motionSets }; returns { st, sv, settings, m } for a view
export function household(o = {}) {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: o.docked ?? true, at: T0 };
  if (o.adults) S.seedAdults(st, "S01", 5, o.adults, settings);
  const nj = o.juveniles ?? 0, n5 = o.s05 ?? 0;
  if (nj) S.seedAdults(st, "S01", 77, nj, settings);
  if (n5) S.seedAdults(st, "S05", 9, n5, settings);
  for (const m of st.mibis) m.paint = { state: "landed" };
  for (const m of st.mibis.slice(o.adults ?? 0)) m.born = st.turn;   // the juveniles
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3 };
  return { st, sv, settings, m: { st, sv, settings, docked: o.docked ?? true, light: o.light ?? "day", time: o.time ?? 12 * 3600, restRules: VIV_RULES.rest, motionSets: o.motionSets ?? true } };
}
// the bed's sleepers of a second world (3 juveniles carried), with their requests, spliced into a view's props
export function sleepersOf(build, n = 3) {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", bays: 12 }, st = S.freshSt("w2", 3, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: true, at: T0 };
  st.nextMibi = 100; S.seedAdults(st, "S01", 31, n, settings); for (const m of st.mibis) { m.paint = { state: "landed" }; m.born = st.turn; }
  const sv = { v: 8, seed: 7, wid: "w2", turn: 3, bay: [], mibis: [], carried: st.mibis.map((m) => m.id), tier: 1, shield: 3 };
  const b = build({ st, sv, settings, docked: true, light: "day", time: 12 * 3600, restRules: VIV_RULES.rest, motionSets: true });
  return { sleepers: b.props.regions.bed.sleepers, requests: b.requests };
}
// a picture for a request: a moving atlas synthesized (moving-scene's), any other a flat block
const hash2 = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function flatPicture(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash2(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
export function sendRequests(f, requests, opts = {}) { for (const r of requests) f.handleOf(r.id, withPolicy((i) => (r.kind === "moving" ? atlasPicture(i, opts) : flatPicture(i, r.size ?? [16, 16])))); }
// the state word of face_test_state
export const STATE = (v) => ({ clip: v & 15, travelling: !!(v & 16), airborne: !!(v & 32), asleep: !!(v & 64), wanderer: !!(v & 128), focused: !!(v & 256), phase: (v >> 12) & 15 });
export const CLIP = { rest: 0, hop: 1, walk: 2, curl: 3, asleep: 4, wake: 5, stir: 6, ack: 7 };

// ---- the three living-window screens with a moving household, booted on the WebAssembly face ----
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { vivariumBuild } from "../../station/src/views/vivarium-props.mjs";
import { homeBuild } from "../../station/src/views/home-props.mjs";
import { idleBuild } from "../../station/src/views/idle-props.mjs";
const here2 = path.dirname(fileURLToPath(import.meta.url)), specDir = path.resolve(here2, "../../ui/specs/station");
export const SPEC = (n) => JSON.parse(readFileSync(path.join(specDir, n + ".json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here2, "../../ui/palettes/station.json"), "utf8")).colours;
export const DIST = path.resolve(here2, "../dist"), BUILT = existsSync(path.join(DIST, "face.mjs"));
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const frameTop = (screen) => ({ top: { screen, title: screen === "home" ? "Home" : "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: screen === "home" ? null : "Home", need: "" }, plate: { text: "" } });
// screen: "vivarium" | "home" | "idle"; o: household's options plus { sleepers (count), focus ("tile:<i>" | "resident:<i>" | "room" | null) }
export function movingScene(screen, o = {}) {
  const hh = household(o), { st } = hh, frame = SPEC("frame"), viv = o.vivSpec ?? SPEC("vivarium"), home = SPEC("home");
  const focusOf = (f) => (!f ? null : f === "room" ? "room" : f.replace(/^(\w+):(\d+)$/, (_, k, i) => k + "." + st.mibis[+i].id));
  const build = (m) => (screen === "vivarium" ? vivariumBuild({ ...m, focus: focusOf(o.focus ?? "tile:0"), seen: null }, viv, frame, home) : screen === "home" ? homeBuild({ ...m, ui: {}, focus: focusOf(o.focus) }, home, frame) : idleBuild(m, frame));
  const b = build(hh.m), requests = [...b.requests];
  if (o.sleepers) { const s = sleepersOf(build, o.sleepers); b.props.regions.bed.sleepers = s.sleepers; b.props.regions.bed.state = "docked"; requests.push(...s.requests); }
  const props = screen === "idle" ? { screen: "home", ...b.props } : { screen, ...b.props, frame: { ...frameTop(screen), line: { ...frameTop(screen).line, ...(b.line ?? {}) } } };
  return { props, requests, st, hh, specs: { frame, vivarium: viv, home }, screen };
}
export async function bootScene(sc, { motion = true, moving = MOVING, atlas = {}, t = 5000 } = {}) {
  atlas = { sets: moving, ...atlas };
  const f = await bootFace(pathToFileURL(DIST + "/"), { test: true });
  f.send({ t: "palette", name: "station", colours: palette });
  for (const [n, j] of Object.entries(sc.specs)) if (f.send({ t: "spec", screen: n, json: j }) < 0) throw new Error("spec " + n + ": " + f.errors().join("; "));
  if (sendMoving(f, moving) < 0) throw new Error("moving: " + f.errors().join("; "));
  for (const id of ["energy", "data", "essence", "cross"]) f.handleOf(`icon:${id}:16`, withPolicy((i) => flatPicture(i, [16, 16])));
  for (const id of ["frame-companion-outline-16x24", "home-lamp-sky-12x12", "home-lamp-hairline-12x12", "home-lamp-sprout-12x12", "home-lamp-amber-12x12"]) f.handleOf(id, withPolicy((i) => flatPicture(i, id.includes("outline") ? [16, 24] : [12, 12])));
  sendRequests(f, sc.requests, atlas);
  f.t = t; f.sc = sc; f.motion = motion;
  if (f.props({ ...sc.props, motion }) < 0) throw new Error("props: " + f.errors().join("; "));
  f.frame(f.t); f.frame((f.t += 16));
  const M = f.M; M._face_dirty_count(); f._invSeen = f.invOverflows();
  return f;
}
// send the scene's props again (after a change to sc.props)
export const resend = (f) => { if (f.props({ ...f.sc.props, motion: f.motion }) < 0) throw new Error("props: " + f.errors().join("; ")); };

// ---- a run on the virtual clock: every frame's area (dirty.mjs, which throws on an overflow or an undeclared full redraw), the residents changed, the worst household tick, the changes off a group tick ----
import { dirty } from "./dirty.mjs";
// cadence: [step, offset, late]: frames every `step` ms from `offset`, every 63rd `late` ms late; top: a live top bar (the counters flash on the late frames, as the catch-up tests do)
export function runFrames(f, ms, { cadence = [16, 0, 0], top = false, each = null } = {}) {
  const M = f.M, [step, off, late] = cadence, t0 = f.t; let worst = 0, worstTick = 0, steps = 0, k = 0; M._face_test_worst_tick();
  const MAT = [{ e: 14, d: 16, s: 10 }, { e: 2, d: 6, s: 9 }];
  for (let t = step + off; t < ms; t += step, k++) {
    const isLate = late && k % 63 === 62; if (isLate) { t += late; if (top && f.sc.props.frame) { const p = { ...f.sc.props, frame: { ...f.sc.props.frame, top: { ...f.sc.props.frame.top, materials: MAT[(k / 63 | 0) % 2], flash: { e: true, d: true, s: true } } } }; f.props({ ...p, motion: f.motion }); } }
    f.frame((f.t = t0 + t)); const s = dirty(f); worst = Math.max(worst, s); steps = Math.max(steps, M._face_test_steps()); worstTick = Math.max(worstTick, M._face_test_worst_tick());
    if (each) each(t, s);
  }
  return { worst, worstTick, steps, offgroup: M._face_test_offgroup(), deferred: M._face_test_deferred(), overflows: f.invOverflows() };
}
