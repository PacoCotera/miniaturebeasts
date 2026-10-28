// The moving sets in the face tests (Station M1 §3): the `moving` spec as the host merges it (ui/specs/station/moving/<SXX>.json, one spec), and synthesized atlases at the slot sizes: one row, a 1 px clear column, then the cells,
// each a flat block of its own colour so a test can tell the cell shown by its pixels; the shadow's two cells likewise. No art: the face's tests never read a master.
//   import { MOVING, sendMoving, atlasPicture, ids } from "./moving-scene.mjs";
import { readFileSync, readdirSync } from "node:fs";
import "../../station/tests/fixtures/rooms.mjs";   // the rooms spec for the props builders, as the page registers it
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
// o: { adults, juveniles, s05, sleepers, time (seconds of the day), docked, motionSets, carry, ui }; returns { st, sv, settings, m } for a view
export function household(o = {}) {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 1 }, st = S.freshSt("w1", 3, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: o.docked ?? true, at: T0 };
  if (o.adults) S.seedAdults(st, "S01", 5, o.adults, settings);
  const nj = o.juveniles ?? 0, n5 = o.s05 ?? 0;
  if (nj) S.seedAdults(st, "S01", 77, nj, settings);
  if (n5) S.seedAdults(st, "S05", 9, n5, settings);
  for (const m of st.mibis) m.paint = { state: "landed" };
  for (const m of st.mibis.slice(o.adults ?? 0)) m.born = st.turn;   // the juveniles
  if (o.libNew != null) { st.libSeen = S.libSnapshot(st); let k = o.libNew; for (const t of Object.keys(st.libSeen.S01 ?? {})) while (k > 0 && st.libSeen.S01[t].length > 1) { st.libSeen.S01[t].pop(); k--; } }   // the Library opened full screen, then libNew looks found since (the last found of the traits that have more than one)
  warmLibrary(st, settings);   // the host warms the specimen when a look is found; Home's props only read it
  const sv = { v: 8, seed: 7, wid: "w1", turn: 3, bay: [], mibis: [], carried: (o.carry ?? []).map((i) => st.mibis[i].id), tier: 1, shield: 3 };   // carry: the indexes of the mibis with the Companion
  return { st, sv, settings, m: { st, sv, settings, ui: o.ui ?? {}, docked: o.docked ?? true, light: o.light ?? "day", time: o.time ?? 12 * 3600, restRules: VIV_RULES.rest, motionSets: o.motionSets ?? true } };
}
// the bed's sleepers of a second world (3 juveniles carried), with their requests, spliced into a view's props
export function sleepersOf(build, n = 3) {
  const settings = { ...S.DEFAULT_SETTINGS, economy: "decided", rooms: 1 }, st = S.freshSt("w2", 3, T0); S.normalize(st); st.firstMibi = false; st.dock = { docked: true, at: T0 };
  st.nextMibi = 100; S.seedAdults(st, "S01", 31, n, settings); for (const m of st.mibis) { m.paint = { state: "landed" }; m.born = st.turn; }
  const sv = { v: 8, seed: 7, wid: "w2", turn: 3, bay: [], mibis: [], carried: st.mibis.map((m) => m.id), tier: 1, shield: 3 };
  const b = build({ st, sv, settings, docked: true, light: "day", time: 12 * 3600, restRules: VIV_RULES.rest, motionSets: true });
  return { sleepers: b.props.regions.bed.sleepers, requests: b.requests };
}
// a picture for a request: a moving atlas synthesized (moving-scene's), any other a flat block
const hash2 = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export function flatPicture(id, size) { const [w, h] = size, d = new Uint8ClampedArray(w * h * 4), k = hash2(id); for (let i = 0; i < w * h; i++) { d[i * 4] = 70 + (k & 127); d[i * 4 + 1] = 70 + ((k >> 7) & 127); d[i * 4 + 2] = 70 + ((k >> 14) & 127); d[i * 4 + 3] = 255; } return { w, h, data: d }; }
export function sendRequests(f, requests, opts = {}) {
  for (const r of requests) {
    if (r.kind === "specimen") { for (const id of r.levels) f.handleOf(id, withPolicy((i) => flatPicture(i, r.size))); continue; }   // the Library's specimen: its four levels, each a flat block of its own colour
    f.handleOf(r.id, withPolicy((i) => (r.kind === "moving" ? atlasPicture(i, opts) : flatPicture(i, r.size ?? (r.kind === "star" ? [12, 12] : [16, 16])))));
  }
}
// the state word of face_test_state
export const STATE = (v) => ({ clip: v & 15, travelling: !!(v & 16), airborne: !!(v & 32), asleep: !!(v & 64), wanderer: !!(v & 128), focused: !!(v & 256), phase: (v >> 12) & 15 });
export const CLIP = { rest: 0, hop: 1, walk: 2, curl: 3, asleep: 4, wake: 5, stir: 6, ack: 7 };

// ---- the two living-window screens (the Vivarium's whole and Idle) with a moving household, booted on the WebAssembly face ----
import { bootFace } from "../../station/src/face-lvgl.mjs";
import { vivariumBuild } from "../../station/src/views/vivarium-props.mjs";
import { idleBuild } from "../../station/src/views/idle-props.mjs";
import { homeBuild, setLibrary } from "../../station/src/views/home-props.mjs";
import { libraryOf, warmLibrary } from "../../station/src/views/specimen-props.mjs";
setLibrary(libraryOf);   // the host registers it; Home's Library module is the specimen (build spec 4.2)
const here2 = path.dirname(fileURLToPath(import.meta.url)), specDir = path.resolve(here2, "../../ui/specs/station");
export const SPEC = (n) => JSON.parse(readFileSync(path.join(specDir, n + ".json"), "utf8"));
const palette = JSON.parse(readFileSync(path.resolve(here2, "../../ui/palettes/station.json"), "utf8")).colours;
export const DIST = path.resolve(here2, "../dist"), BUILT = existsSync(path.join(DIST, "face.mjs"));
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
const frameTop = (screen) => ({ top: { screen, title: screen === "home" ? "Home" : "Vivarium", turn: 4, turnFlash: false, materials: { e: 9, d: 9, s: 9 }, flash: {}, companion: { docked: true, withMibi: null } }, line: { back: screen === "home" ? null : "Home", need: "" }, plate: { text: "" } });
// screen: "home" | "vivarium" | "idle"; o: household's options plus { sleepers (count), focus ("tile:<i>" | "resident:<i>" | "room" | null) }
export function movingScene(screen, o = {}) {
  const hh = household(o), { st } = hh, frame = SPEC("frame"), viv = o.vivSpec ?? SPEC("vivarium"), home = SPEC("home");
  const focusOf = (f) => (!f ? null : f === "room" ? "room" : f.replace(/^(\w+):(\d+)$/, (_, k, i) => k + "." + st.mibis[+i].id));
  const build = (m) => (screen === "home" ? homeBuild({ ...m, date: { y: 2026, m: 9, d: 17 }, now: Date.now() }, home, frame) : screen === "vivarium" ? vivariumBuild({ ...m, focus: focusOf(o.focus ?? "tile:0"), seen: null }, viv, frame, home) : idleBuild(m, frame));
  const b = build(hh.m), requests = [...b.requests];
  if (o.sleepers) { const s = sleepersOf(build, o.sleepers); b.props.regions.bed.sleepers = s.sleepers; b.props.regions.bed.state = "docked"; requests.push(...s.requests); }
  const props = screen === "home" ? { screen: "home", ...b.props, frame: { plate: { text: "" } } } : screen === "idle" ? { screen: "home", ...b.props } : { screen, ...b.props, frame: { ...frameTop(screen), line: { ...frameTop(screen).line, ...(b.line ?? {}) } } };
  return { props, requests, st, hh, specs: { frame, vivarium: viv, home, rooms: SPEC("rooms") }, screen };
}
export async function bootScene(sc, { motion = true, moving = MOVING, atlas = {}, t = 5000, dir = DIST } = {}) {   // dir: the test build (dist/node) can name a node by its id (nodeBox)
  atlas = { sets: moving, ...atlas };
  const f = await bootFace(pathToFileURL(dir + "/"), { test: true });
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

// ---- rule 2 (M1 §3) on any of the three screens: the travel rules opened so every walker travels at once (vivarium.json rules, read by all three), an S05 adult at 144 × 152 walking 5 px a tick (stride 15): the per-tick budget must defer ----
export const rule2Sets = () => { const m = JSON.parse(JSON.stringify(MOVING)), j = m.S05.juvenile; m.S05.adult = { ...JSON.parse(JSON.stringify(j)), walk: { ...j.walk, size: [144, 152] }, walkCycle: { ...j.walkCycle, stride: 15 }, shadow: { walk: [144, 16], close: [304, 24] } }; m.S05.juvenile.walkCycle.stride = 15; return m; };
export const openRules = (spec, tickBudget = null) => { const v = JSON.parse(JSON.stringify(spec)); v.rules.travel = { floorDiv: 1, capMin: 12, capDiv: 1, airborne: 2, minRest: 1 }; if (tickBudget != null) v.rules.tickBudget = tickBudget; return v; };
// a room of eight adults and three bed sleepers; the four of group 0 walk S05 at 5 px a tick, the odd ones are stills; 20 s of frames every 16 ms
export async function rule2Run(screen, tickBudget = null) {
  const sc = movingScene(screen, { adults: 8, sleepers: 3, vivSpec: openRules(SPEC("vivarium"), tickBudget) });
  sc.props.regions.residents.forEach((r, i) => { if (i % 2) delete r.moving; else r.moving = { set: "S05", walk: "moving:adult:S05:walk:144x152:species", shadow: "moving:adult:S05:shadow:144x16" }; });
  sc.requests.push({ kind: "moving", id: "moving:adult:S05:walk:144x152:species" }, { kind: "moving", id: "moving:adult:S05:shadow:144x16" });
  const f = await bootScene(sc, { moving: rule2Sets() }); if (f.errors().length) throw new Error(f.errors().join("; "));
  const r = runFrames(f, 20000); return { r, hash: f.hash() };
}
