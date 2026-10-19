// The motion proof's scene (Station M1 §3, "The scene for the owner"): the Station beats of motion-spec §5 played on the face at 1× in a throwaway world, from the developer tools ("Motion proof") in the sandbox and, on a virtual clock,
// by prototypes/station/tools/motion-proof.mjs, which writes the frames and the redraw numbers. One script for both: the page's frame loop calls sceneTick with its clock, and each beat's steps fire at their scene time.
//   1. the hatch (the Incubator, 0–6.6 s); 2. a day in the Vivarium: Pip, young Pip, the S05 juvenile and nine more S01, 60 s, with focus and the acknowledge, then Greet up close; 3. dusk to night: the Station time stepped
//   19:58 → 21:00 at a minute per 2 s, everyone curling at their minute, then a dawn wake 05:58 → 07:00; 4. the night on Idle with Pip alone, 6 min 10 s. (Beat 5 is the Companion lead's.)
// The world is thrown away at the end: this browser's own save is kept aside (sessionStorage) and put back by endScene.
import { G, UI, SPECS, save, load, saveSettings, stationClock } from "./game.mjs";
import * as S from "./state.mjs";
import { frameOf, podGenome } from "./genome.mjs";

const BACKUP = "mb-motion-proof-backup";
let scene = null;   // { t0, steps: [{ at, beat, go }], i, h }
const hm = (h, m) => h * 3600 + m * 60;
// a world of the scene: `make(st)` seeds it; the Companion's part is a fresh one, docked
function world(make) {
  const st = S.freshSt("motion-proof", 3, Date.now()); S.normalize(st); st.e = 99; st.d = 99; st.s = 99; st.firstMibi = false; st.dock = { docked: true, at: Date.now() };
  const sv = { v: S.SAVE_V, seed: 7, wid: "motion-proof", turn: 3, bay: [], mibis: [], carried: [], tier: 1, shield: 3, st };
  make(st); for (const m of st.mibis) m.paint = { state: "landed" };
  try { localStorage.setItem(S.SAVE_KEY, JSON.stringify(sv)); } catch { /* in memory */ }
  G.sv = sv; G.st = st;
}
const named = (m, name) => { m.name = name; return m; };
// the household of beat 2, joining Pip (an adult S01) and young Pip (the hatch's juvenile): the S05 juvenile and nine more S01 (five adults, four juveniles)
function household(st, settings) {
  S.seedAdults(st, "S01", 11, 5, settings); const js = S.seedAdults(st, "S01", 77, 4, settings).mibis, f = S.seedAdults(st, "S05", 9, 1, settings).mibis;
  for (const m of [...js, ...f]) m.born = st.turn;
}
const key = (h, k) => h.act(k);
// the beats: each step { at: ms of the scene, beat, go(h) }; h: { act(key), goto, settings, intent }
export function beats() {
  const B = [];
  const at = (t, beat, go) => B.push({ at: t, beat, go });
  // 1. the hatch: a ready S01 bud; ✓ opens it; the hand-off lands the meet at 6400 after the press
  at(0, 1, (h) => { saveSettings({ motionSets: true, stationTime: "12:00", bays: 12, light: null }); world((st) => { named(S.seedAdults(st, "S01", 5, 1, h.settings).mibis[0], "Pip"); S.seedPodFromGenome(st, podGenome(frameOf("S01"), 3), h.settings, Date.now()); const p = st.tray[0]; S.skipIdentify(st, p); S.grow(st, p, {}, h.settings, Date.now()); S.skipBud(st, h.settings, "ready"); });
    stationClock.scene = null; UI.idle = false; UI.inc = {}; h.goto("incubator"); });
  at(1200, 1, (h) => key(h, "confirm"));
  // 2. a day in the Vivarium, 60 s: the young one hatched is young Pip; focus on Pip and the acknowledge, then Greet up close
  at(8800, 2, (h) => { const st = G.st, young = st.mibis.at(-1); if (young && st.mibis.length > 1) named(young, "young Pip"); household(st, h.settings); for (const m of st.mibis) m.paint = { state: "landed" }; save();
    UI.meet = null; UI.hab.namer = null; UI.viv.f = "tile." + st.mibis[0].id; h.goto("vivarium"); });
  at(20000, 2, () => { UI.viv.f = "resident." + G.st.mibis[0].id; });   // the ring on Pip: it stops on its beat and, 240 ms on, acknowledges
  at(24000, 2, () => { UI.viv.f = "tile." + G.st.mibis[0].id; });
  at(66000, 2, (h) => { UI.viv.f = "resident." + G.st.mibis[0].id; UI.hab.id = G.st.mibis[0].id; UI.hab.f = "resident"; h.goto("habitat"); });
  at(67500, 2, (h) => h.intent({ screen: "habitat", target: "resident", verb: "confirm" }));   // Greet
  // 3. dusk to night, then a dawn wake: the Station time at a minute per 2 s of face time
  at(71000, 3, (h) => { UI.viv.f = "tile." + G.st.mibis[0].id; h.goto("vivarium"); stationClock.scene = { from: hm(19, 58), at: h.now(), rate: 30 }; });
  at(71000 + 124000, 3, (h) => { stationClock.scene = { from: hm(5, 58), at: h.now(), rate: 30 }; });
  at(71000 + 248000, 3, () => { stationClock.scene = null; });
  // 4. the night on Idle, Pip alone, 6 min 10 s
  at(320000, 4, (h) => { world((st) => named(S.seedAdults(st, "S01", 5, 1, h.settings).mibis[0], "Pip")); saveSettings({ stationTime: "23:00", light: "night" }); UI.home.f = "room"; h.goto("home"); UI.idle = true; });
  at(320000 + 370000, 4, (h) => endScene(h));
  return B;
}
export const SCENE_MS = 320000 + 370000;
export function startScene(h, now) {
  try { if (!sessionStorage.getItem(BACKUP)) sessionStorage.setItem(BACKUP, localStorage.getItem(S.SAVE_KEY) ?? ""); } catch { /* no storage: the world is in memory */ }
  scene = { t0: now, steps: beats(), i: 0, h, settings: { ...G.settings } };
  return "the motion proof plays (about 11 min 30 s): the hatch, a day in the Vivarium, dusk to night and dawn, the night on Idle; End the scene brings this browser's world back";
}
export const sceneOn = () => !!scene;
export const sceneTime = (now) => (scene ? now - scene.t0 : null);
export const sceneBeat = (now) => { if (!scene) return 0; let b = 0; for (const s of scene.steps) if (s.at <= now - scene.t0) b = s.beat; return b; };
export function sceneTick(now) {
  if (!scene) return;
  const t = now - scene.t0;
  while (scene && scene.i < scene.steps.length && scene.steps[scene.i].at <= t) { const s = scene.steps[scene.i++]; s.go(scene.h); }
}
export function endScene(h) {
  if (!scene && !sessionStorage.getItem(BACKUP)) return "no scene plays";
  const kept = scene?.settings; scene = null; stationClock.scene = null;
  try { const b = sessionStorage.getItem(BACKUP); if (b != null) { if (b) localStorage.setItem(S.SAVE_KEY, b); else localStorage.removeItem(S.SAVE_KEY); sessionStorage.removeItem(BACKUP); } } catch { /* in memory */ }
  if (kept) saveSettings({ motionSets: kept.motionSets ?? false, stationTime: kept.stationTime ?? null, light: kept.light ?? null });
  load(); UI.idle = false; UI.home.f = "room"; h.goto("home");
  return "the scene is over: this browser's world is back";
}
void SPECS;
